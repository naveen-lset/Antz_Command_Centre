/**
 * WHAT THE TIME MARKS ARE FED — buckets with their real dates on them.
 *
 * `core/series.ts` already answers "how much, per bucket"; `core/calendar.ts` already answers
 * "which days is each bucket". Neither knows about the other, so every chart on the product was
 * re-deriving its own axis labels beside its own values and hoping the two agreed. This file is
 * the join, and it is the ONLY thing it does: `series()` supplies the numbers, `buckets()`
 * supplies the boundaries, and both use the same `from + floor(i * size)` arithmetic, so a
 * point's label is the span its value was summed over — by construction, not by coincidence.
 *
 * NOTHING IS COMPUTED HERE THAT WASN'T ALREADY TRUE. No smoothing, no interpolation, no
 * scaling, no synthesised comparison. A previous-period series is the same read over
 * `previous(win)`; a day grid is the daily array the flows were built from. Where a comparison
 * cannot be honest — a window clamped at the start of the ledger has no equal span before it —
 * these return `undefined` and the mark states its absence rather than drawing a shape.
 */

import { TODAY, buckets, dateAt, longDate, previous, shortDate, type Win } from '../core/calendar'
import { count } from '../core/events'
import { daily, levelAt, series } from '../core/series'
import { METRICS } from '../core/metrics'
import { SITES } from '../core/world'
import type { Compare, Pt } from '../exec/marks'

const siteKeys = (siteKey: string | null): string[] => (siteKey ? [siteKey] : SITES.map((s) => s.key))

/** A bucket's own label — one day states the day, a span states both ends. */
const spanLabel = (from: number, to: number): string =>
  from >= to ? shortDate(from) : `${shortDate(from)} – ${shortDate(Math.min(TODAY, to))}`

/**
 * A metric bucketed across a window, each point carrying the dates it covers.
 *
 * `max` is the number of marks the receiving chart has room for, not a resolution choice: a
 * twelve-month window at 30 buckets is twelve-day periods, and the label says so rather than
 * printing a single date the value does not belong to.
 */
export function pointsOf(slug: string, siteKey: string | null, win: Win, max = 30): Pt[] {
  const values = series(slug, siteKey, win, max)
  const spans = buckets(win, max)
  return values.map((value, i) => ({
    label: spans[i] ? spanLabel(spans[i].from, spans[i].to) : shortDate(win.to),
    value,
  }))
}

/**
 * The same window, one span earlier — as a figure and as a curve.
 *
 * The figure follows the metric's own kind, which is the part that is easy to get wrong: the
 * comparison for a FLOW is the earlier span's sum, and for a LEVEL it is the reading on the day
 * before the window opened. Summing a level would compare a headcount against thirty
 * headcounts added together.
 */
export function compareOf(slug: string, siteKey: string | null, win: Win, max = 30): Compare | undefined {
  const prev = previous(win)
  /* Clamped against the start of the ledger — there is no equal span before it to compare to. */
  if (prev.days < win.days || prev.to <= 0) return undefined

  const level = METRICS[slug]?.kind !== 'flow'
  const value = level
    ? siteKeys(siteKey).reduce((n, k) => n + levelAt(slug, k, prev.to), 0)
    : count(slug, siteKey, prev)

  const ghost = series(slug, siteKey, prev, max)
  const here = series(slug, siteKey, win, max)

  return {
    label: `vs ${prev.window}`,
    value,
    series: ghost.length === here.length ? ghost : undefined,
  }
}

/**
 * Every day in the window, with its count and its weekday — the calendar grid's own data.
 *
 * Capped at a year of cells. Beyond that the grid is unreadable at any cell size a phone can
 * show, and a caller that asks for six years gets the trailing year rather than a mark that
 * pretends to draw 2,192 days: `from` is returned so the caller can say which span it is
 * looking at.
 */
export function dayCells(
  slug: string,
  siteKey: string | null,
  win: Win,
  cap = 371,
): { cells: { day: number; label: string; dom: number; count: number; weekday: number }[]; from: number; capped: boolean } {
  const to = Math.min(TODAY, win.to)
  const capped = win.days > cap
  const from = capped ? Math.max(0, to - cap + 1) : Math.max(0, win.from)
  const keys = siteKeys(siteKey)
  const arrays = keys.map((k) => daily(slug, k))

  const cells = []
  for (let day = from; day <= to; day++) {
    let n = 0
    for (const a of arrays) n += a[day]
    cells.push({
      day,
      label: longDate(day),
      dom: dateAt(day).getDate(),
      count: n,
      /* Monday-first, because the week labels are — `getDay()` puts Sunday at 0. */
      weekday: (dateAt(day).getDay() + 6) % 7,
    })
  }

  return { cells, from, capped }
}

/**
 * A short daily tail for a row-scale spark — the last `n` days, in order.
 *
 * Row marks cannot carry an axis, so this is deliberately a tail rather than the window: what a
 * row-scale mark can honestly say is "and lately", which is what ten columns show.
 */
export function tail(slug: string, siteKey: string | null, win: Win, n = 10): number[] {
  const to = Math.min(TODAY, win.to)
  const from = Math.max(0, to - n + 1)
  const arrays = siteKeys(siteKey).map((k) => daily(slug, k))
  const out: number[] = []
  for (let day = from; day <= to; day++) {
    let sum = 0
    for (const a of arrays) sum += a[day]
    out.push(sum)
  }
  return out
}

/** The bucket that holds the most — what an event trend flags rather than leaves to be found. */
export function peakOf(points: Pt[]): { index: number; note: string } | undefined {
  if (points.length < 3) return undefined
  let index = 0
  points.forEach((p, i) => {
    if (p.value > points[index].value) index = i
  })
  return points[index].value > 0 ? { index, note: `Peak · ${points[index].label} · ${points[index].value}` } : undefined
}
