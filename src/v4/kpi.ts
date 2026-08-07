/**
 * KPI RESOLUTION — one hook that turns a KPI declaration into everything a card renders.
 *
 * A card needs four things: the figure, a qualifier under it, how it moved, and the shape
 * behind it. Before this they came from four places — the figure from `useScoped`, the
 * qualifier from an authored `note`, the movement from an authored `delta` keyed by window,
 * and the shape from a twelve-element array typed in `data.ts`. Three of the four ignored
 * the site filter, and the fourth ignored the window.
 *
 * The visible consequence, with Aquatic Halls picked: the card read 178K (scoped), captioned
 * "Aquatic Halls" (scoped), with "+43 this month" beside it (the whole collection's movement,
 * attached to one site) over a curve of the whole collection's twelve months. Three of those
 * four are wrong, and the card looked entirely convincing.
 *
 * Now all four are read from the same metric under the same scope, so they move together or
 * not at all. The authored fields survive only for the figures that genuinely have no metric
 * — visitor numbers, procurement spend — and those declare `scoped: false` and are shown
 * apart rather than mixed into a scoped view.
 */

import { useMemo } from 'react'
import { delta as deltaOf, figure as figureOf, trend } from '../core/query'
import { resolveWindow } from '../core/calendar'
import { levelAt, series } from '../core/series'
import { siteKeyOf } from '../core/scope'
import { METRICS } from '../core/metrics'
import { compact, fmt, sentenceCase } from '../exec/system'
import { useScope } from './scope'
import { pickFigure, type Figure } from '../exec/period'

export interface KpiSpec {
  metric?: string
  unit?: string
  note?: string
  target?: string
  hideFraction?: true
  value?: Figure
  delta?: Figure
  series?: readonly number[]
  scoped?: false
}

/**
 * Which direction is good news, per metric.
 *
 * NOT COSMETIC. A delta coloured by its arithmetic sign reads a 9.5% rise in deaths as green,
 * which is the single most misleading thing a dashboard can do — it inverts the meaning of the
 * only figure on the card that carries a judgement. Colour has to come from what the metric is,
 * so it is declared here once rather than guessed at each call site.
 *
 * Everything absent from this list is better when it rises.
 */
const LOWER_IS_BETTER = new Set([
  'mortality', 'fetal', 'discarded', 'disease', 'wastage', 'alerts', 'alertsCritical',
  'labOpen', 'approvals', 'health',
])

/** `good` / `bad` / `flat`, judged against the metric's own direction. */
export type DeltaMood = 'good' | 'bad' | 'flat'

function mood(slug: string | undefined, percent: number): DeltaMood {
  if (Math.abs(percent) < 0.5) return 'flat'
  const rising = percent > 0
  const lowerBetter = slug ? LOWER_IS_BETTER.has(slug) : false
  return rising === lowerBetter ? 'bad' : 'good'
}

export interface ResolvedKpi {
  /** The figure, formatted. */
  value: string
  /** Unit suffix — "%" for a rate, whatever the card declared otherwise. */
  unit?: string
  /** The line under the figure. Names the denominator for a rate, the scope for a site. */
  note: string
  /** Formatted movement against the preceding window, with the sign already in it. */
  delta?: string
  /** Signed, so a card can position an arrow without parsing the string. */
  deltaSign: 1 | -1 | 0
  /**
   * Whether the movement is good news FOR THIS METRIC. Cards colour by this, never by sign —
   * see `LOWER_IS_BETTER`.
   */
  mood: DeltaMood
  /** The window's shape, bucketed. Empty where there is nothing to draw. */
  series: number[]
  /** What the sparkline covers, for the caption under it. */
  seriesNote: string
  /** `false` where the metric has no model for this scope — render an empty state. */
  known: boolean
}

/**
 * The figure, formatted for its kind.
 *
 * A RATE KEEPS A DECIMAL BELOW TEN. Rounding is right for coverage — 92% says everything 92.4%
 * does — and wrong for a small rate, where it destroys the figure: food wastage of 3.4% against a
 * 3.0% target printed as "3", which is under target when it is over it.
 */
function formatValue(slug: string | undefined, value: number, percent: number | undefined): string {
  if (!slug) return fmt(Math.round(value))
  if (METRICS[slug]?.kind !== 'rate') return compact(value)
  const p = percent ?? 0
  return p < 10 ? p.toFixed(1) : String(Math.round(p))
}

const sign = (n: number): 1 | -1 | 0 => (Math.abs(n) < 0.05 ? 0 : n > 0 ? 1 : -1)

/**
 * The movement, phrased so it means something.
 *
 * THREE FORMS, because one form cannot carry all three cases honestly.
 *
 * A RATE moves in points. Calling a rise from 90% to 92% a "2.2% increase" is true and misleading,
 * which is the worst combination a figure can be.
 *
 * A SMALL BASE moves in units. Disease conditions flagged went from 1 to 9, and the percentage form
 * of that is "+800%" — arithmetically correct, and on screen it reads as a broken component rather
 * than as eight more conditions. Below a base of eight the absolute change is both shorter and more
 * informative, so that is what is shown.
 *
 * EVERYTHING ELSE moves in per cent, which is what a percentage is for.
 *
 * A change under half a point in either direction prints as "flat" rather than "+0.0%", which is
 * noise dressed as precision.
 */
function phrase(d: { percent: number; now: number; before: number }, isRate: boolean): string {
  if (Math.abs(d.percent) < 0.5) return 'flat'
  const s = d.percent >= 0 ? '+' : '−'
  if (isRate) return `${s}${Math.abs(d.percent).toFixed(1)} pts`

  if (d.before < 8) {
    const units = Math.round(d.now - d.before)
    return `${units >= 0 ? '+' : '−'}${Math.abs(units)}`
  }
  return `${s}${Math.abs(d.percent).toFixed(Math.abs(d.percent) < 10 ? 1 : 0)}%`
}

export function useKpi(kpi: KpiSpec): ResolvedKpi {
  const { scope } = useScope()

  return useMemo(() => {
    const slug = kpi.metric

    /* No metric: the card's own authored figures, and a note that says it is not scoped so
       the reader is never left to assume a collection-wide number is a site's. */
    if (!slug) {
      const authored = pickFigure(kpi.value ?? '—', scope.win.key)
      const d = pickFigure(kpi.delta ?? '', scope.win.key)
      return {
        value: String(authored),
        unit: kpi.unit,
        note: sentenceCase(
          scope.site ? `${kpi.note ?? ''} · not site-attributed`.trim() : (kpi.note ?? ''),
        ),
        delta: d ? String(d) : undefined,
        deltaSign: typeof d === 'string' && d.startsWith('−') ? -1 : d ? 1 : 0,
        mood: 'flat',
        series: kpi.series ? [...kpi.series] : [],
        seriesNote: '12 months',
        known: true,
      }
    }

    const f = figureOf(scope, slug)
    const metric = METRICS[slug]
    const d = deltaOf(scope, slug)

    /* A rate's note states the fraction it came from: 92% cannot be read responsibly without also
       seeing the 190 animals it leaves out. Unless the denominator is an artefact of how the rate
       is computed rather than a population — see `hideFraction`. */
    const base = kpi.note ?? metric?.unit ?? ''
    let fraction: string
    if (metric?.kind === 'rate' && f.of && !kpi.hideFraction) {
      const pair = `${fmt(Math.round(f.value))} of ${fmt(f.of)}`
      /* The trailing noun is dropped once the fraction is long enough to fill the line on its own.
         "2,184 of 2,374 covered" truncated to "2,184 of 2,374 cover…" in a two-column phone grid,
         which spends a word to lose one — and under a label reading "Vaccination" the pair needs no
         noun to be understood. */
      fraction = pair.length > 13 ? pair : `${pair} ${base}`.trim()
    } else {
      fraction = scope.site ? `${base} · ${scope.site.name}`.trim() : base
    }
    /* Sentence case, applied once here rather than at each card — the line is built from a
       metric's unit noun and reads as a fragment otherwise. See `sentenceCase`. */
    const note = sentenceCase(kpi.target ? `${fraction} · target ${kpi.target}`.trim() : fraction)

    return {
      value: formatValue(slug, f.value, f.percent),
      unit: metric?.kind === 'rate' ? '%' : kpi.unit,
      note,
      delta: d ? phrase(d, metric?.kind === 'rate') : undefined,
      deltaSign: d ? sign(d.percent) : 0,
      mood: d ? mood(slug, d.percent) : 'flat',
      series: trend(scope, slug, 12),
      /* Names the window, because the curve now re-cuts with it. "12 months" over a
         seven-day window was the previous behaviour and it was a lie of omission. */
      seriesNote: scope.win.window,
      known: f.known,
    }
  }, [kpi, scope])
}

/**
 * A trend card's figure, movement and twelve-month curve.
 *
 * THE CURVE IS ALWAYS TWELVE MONTHS, unlike a KPI sparkline, and that difference is
 * deliberate rather than an oversight. These cards are titled "12 months" and exist to
 * answer "are we improving" — a curve that shrank to seven points when the reader picked
 * "last 7 days" would answer nothing. So the figure is the window's and the curve is the
 * year's, which is what the caption has always said.
 *
 * The curve is still SCOPED. A twelve-month shape for Aquatic Halls under an Aquatic Halls
 * scope, not the collection's, which is the part that was wrong before.
 */
export function useTrendCard(card: {
  metric?: string
  value?: string
  delta?: string
  values?: number[]
  scoped?: false
}): { value: string; delta: string; values: number[]; scopedNote?: string; mood: DeltaMood } {
  const { scope } = useScope()

  return useMemo(() => {
    if (!card.metric) {
      return {
        value: card.value ?? '—',
        delta: card.delta ?? '',
        values: card.values ?? [],
        scopedNote: scope.site ? 'not site-attributed' : undefined,
        mood: 'flat',
      }
    }

    const f = figureOf(scope, card.metric)
    const d = deltaOf(scope, card.metric)
    const metric = METRICS[card.metric]
    const year = resolveWindow('year')

    return {
      value:
        metric?.kind === 'rate'
          ? `${(f.percent ?? 0).toFixed(1)}%`
          : fmt(Math.round(f.value)),
      delta: d ? phrase(d, metric?.kind === 'rate') : '',
      values: series(card.metric, siteKeyOf(scope), year, 12),
      scopedNote: scope.site?.name,
      mood: d ? mood(card.metric, d.percent) : 'flat',
    }
  }, [card, scope])
}

/**
 * Net movement in a LEVEL across the window — the hero's "▲ 324 this month".
 *
 * The reading on the last day less the reading on the first, which is a real gain for
 * whatever scope is in force. It used to be an authored number per window, attached to the
 * collection, and therefore silently wrong the moment a site was picked.
 */
export function useMovement(slug: string): number | undefined {
  const { scope } = useScope()
  return useMemo(() => {
    if (METRICS[slug]?.kind !== 'level') return undefined
    const key = siteKeyOf(scope)
    const keys = key ? [key] : (METRICS[slug].levels ?? []).map((l) => l.site)
    const end = keys.reduce((n, k) => n + levelAt(slug, k, scope.win.to), 0)
    const start = keys.reduce((n, k) => n + levelAt(slug, k, Math.max(0, scope.win.from - 1)), 0)
    return end - start
  }, [slug, scope])
}
