/**
 * THE QUERY FAÇADE — the only thing the UI is allowed to ask for a number.
 *
 * WHY A FAÇADE AND NOT DIRECT ACCESS. The consistency requirement is not really about
 * arithmetic; it is about how many places can independently decide what a figure means. Ten
 * pages each reading `moduleSites` and each applying the site filter *if they remembered
 * to* is ten chances to forget, and the product had exactly that bug: fourteen pages showed
 * zoo-wide figures under a banner reading "Scoped to Aquatic Halls".
 *
 * Here every function takes a `Scope` as its first argument and there is no way to ask for
 * a figure without one. Forgetting to honour the site filter stops being possible, because
 * honouring it is not a step the caller performs.
 *
 * EVERY FUNCTION HERE IS PURE AND SYNCHRONOUS. The series are cached typed arrays and the
 * tallies are integer loops, so a page can call this during render without a loading state
 * for anything except the deliberate ones (see `perf.tsx`). That is a property worth
 * protecting: the moment a figure becomes async, two figures on one screen can be from two
 * different scopes for a frame, which is the contradiction this whole layer exists to
 * prevent.
 */

import { previous } from './calendar'
import { METRICS, type Metric } from './metrics'
import { read, readSite, series, split, type Reading, type Split } from './series'
import { count, page, tally, type Dimension, type EventPage } from './events'
import { siteKeyOf, type Scope } from './scope'
import { animalsInScope, sexSplitFor, speciesStock, stockOfSpecies, type Animal, type Page } from './animals'
import { SITES, siteOf, speciesIn, type Species } from './world'
import { apportion } from './seed'

/* ── the headline figure ─────────────────────────────────────────────────── */

export interface Figure extends Reading {
  kind: Metric['kind']
  unit: string
  /** Whether the metric has any model at all. `false` means show an empty state, not a zero. */
  known: boolean
}

/**
 * A module's figure under the scope in force.
 *
 * `known: false` is the honest answer for a slug with no model, and it is deliberately not
 * a zero: "0 deaths in Carnivore Ridge" and "we do not track deaths in Carnivore Ridge" are
 * different statements and only one of them is true. Callers render an empty state.
 */
export function figure(scope: Scope, slug: string): Figure {
  const metric = METRICS[slug]
  if (!metric) return { value: 0, kind: 'flow', unit: '', known: false }
  const r = read(slug, siteKeyOf(scope), scope.win)
  return { ...(r ?? { value: 0 }), kind: metric.kind, unit: metric.unit, known: Boolean(r) }
}

export interface Delta {
  /** Percentage change against the preceding window of equal length. */
  percent: number
  direction: 'up' | 'down' | 'flat'
  /** The comparison window, so a caption can name what it is against. */
  against: string
  /** Absolute figures, for a caller that wants to state both. */
  now: number
  before: number
}

/**
 * Change against the immediately preceding window of the same length.
 *
 * A real comparison, computed from the same series — not an authored "+12%" that stays +12%
 * however the reader cuts the dates. Returns undefined where the comparison would be
 * meaningless: nothing to compare against, or a previous window of zero from which every
 * increase is infinite.
 */
export function delta(scope: Scope, slug: string): Delta | undefined {
  const metric = METRICS[slug]
  if (!metric) return undefined
  const prev = previous(scope.win)
  const site = siteKeyOf(scope)

  const a = read(slug, site, scope.win)
  const b = read(slug, site, prev)
  if (!a || !b) return undefined

  /* A rate is compared in points, not as a ratio of percentages — "92% up from 90%" is two
     points, and calling it a 2.2% rise is the kind of true-but-misleading figure that
     erodes trust in the rest of the page. */
  const now = metric.kind === 'rate' ? (a.percent ?? 0) : a.value
  const before = metric.kind === 'rate' ? (b.percent ?? 0) : b.value

  if (before === 0) return undefined
  const percent = metric.kind === 'rate' ? now - before : ((now - before) / before) * 100
  return {
    percent,
    direction: Math.abs(percent) < 0.5 ? 'flat' : percent > 0 ? 'up' : 'down',
    against: prev.window,
    now,
    before,
  }
}

/** The window's shape, bucketed for a chart. Same numbers as the KPI, aggregated finer. */
export const trend = (scope: Scope, slug: string, max = 30): number[] =>
  series(slug, siteKeyOf(scope), scope.win, max)

/* ── breakdowns ──────────────────────────────────────────────────────────── */

export interface Row {
  /** Stable id — a site key, a species id, a medicine id. Used for navigation. */
  id: string
  label: string
  sub?: string
  value: number
  of?: number
  /** A rate's own coverage, or a count's share of the total. */
  percent: number
  /** Where the row leads, when it leads somewhere. */
  href?: string
}

/**
 * The site split, honouring the scope.
 *
 * WITH A SITE PICKED THIS RETURNS THAT SITE ALONE. It used to return all six and leave the
 * reader to find theirs, which is how a "Scoped to Aquatic Halls" page ended up showing
 * five sites the reader had just excluded.
 */
export function bySite(scope: Scope, slug: string): Row[] {
  const s = split(slug, scope.win)
  if (!s) return []
  const key = siteKeyOf(scope)
  return s.rows
    .filter((r) => !key || r.siteKey === key)
    .map((r) => {
      const site = siteOf(r.siteKey)
      return {
        id: r.siteKey,
        label: site?.name ?? r.siteKey,
        sub: site ? `${site.code} · ${site.enclosures} enclosures` : undefined,
        value: r.value,
        of: r.of,
        percent: r.share,
        href: `#/e/site/${r.siteKey}`,
      }
    })
}

/**
 * The species split within the scope.
 *
 * A flow is grouped from its own events, so the rows are a real bottom-up aggregation and
 * sum to the headline exactly. A level is apportioned across the species' shares of their
 * site, which sums exactly for the same reason `apportion` exists.
 *
 * Species are merged BY NAME across sites when no site is picked, because Common Carp held
 * in two sites is one species to a curator — and because the merged rows still sum to the
 * total, each site's rows having summed to that site first.
 */
export function bySpecies(scope: Scope, slug: string): Row[] {
  const metric = METRICS[slug]
  if (!metric) return []
  const key = siteKeyOf(scope)

  if (metric.kind === 'flow') {
    const total = count(slug, key, scope.win)
    return tally(slug, key, scope.win, 'species').map((t) => ({
      id: t.key,
      label: t.label,
      value: t.value,
      percent: total ? (t.value / total) * 100 : 0,
      href: speciesHref(t.label, key),
    }))
  }

  /* Levels and rates: apportion each site's reading across its species' weights. */
  const keys = key ? [key] : SITES.map((s) => s.key)
  const merged = new Map<string, { value: number; of: number; cls: string; siteKey: string }>()

  for (const k of keys) {
    const list = speciesIn(k)
    const reading = readSite(slug, k, scope.win)
    const values = apportion(reading.value, list.map((s) => s.weight))
    const ofs = reading.of !== undefined ? apportion(reading.of, list.map((s) => s.weight)) : undefined
    list.forEach((sp, i) => {
      const at = merged.get(sp.name) ?? { value: 0, of: 0, cls: sp.cls, siteKey: sp.siteKey }
      at.value += values[i]
      at.of += ofs?.[i] ?? 0
      merged.set(sp.name, at)
    })
  }

  const rate = metric.kind === 'rate'
  const total = [...merged.values()].reduce((n, m) => n + m.value, 0)

  return [...merged.entries()]
    .map(([label, m]) => ({
      id: label,
      label,
      sub: m.cls,
      value: m.value,
      of: rate ? m.of : undefined,
      percent: rate ? (m.of ? (m.value / m.of) * 100 : 0) : total ? (m.value / total) * 100 : 0,
      href: speciesHref(label, key),
    }))
    .filter((r) => r.value > 0 || rate)
    .sort((a, b) => (rate ? b.percent - a.percent : b.value - a.value))
}

/**
 * The route for a species named in a breakdown.
 *
 * A species id carries its site, so a name alone is ambiguous when the scope is Overall.
 * With a site in force the row links to that site's population; without one it links to the
 * largest, which is the population the reader is most likely to have meant.
 *
 * EXPORTED, because a name is what the mortality module has. Its species-wise and necropsy tables
 * were dead ends — a reader who found the worst-hit species there could not reach that species'
 * record, while Birth Analytics, reading this very function through `bySpecies`, linked straight
 * through. Rather than let the mortality sheets resolve a name to an id their own way, they call
 * the one function that already decides which population a bare name means.
 */
export function speciesHref(name: string, siteKey: string | null): string | undefined {
  const candidates = SITES.flatMap((s) => speciesIn(s.key)).filter((s) => s.name === name)
  const within = siteKey ? candidates.filter((c) => c.siteKey === siteKey) : candidates
  const best = (within.length ? within : candidates).sort((a, b) => b.weight - a.weight)[0]
  return best ? `#/e/species/${best.id}` : undefined
}

/** Any other dimension a flow can be grouped by — cause, ward, medicine, incubator. */
export function byDimension(scope: Scope, slug: string, by: Dimension): Row[] {
  if (METRICS[slug]?.kind !== 'flow') return []
  const key = siteKeyOf(scope)
  const total = count(slug, key, scope.win)
  return tally(slug, key, scope.win, by).map((t) => ({
    id: t.key,
    label: t.label,
    value: t.value,
    percent: total ? (t.value / total) * 100 : 0,
    href: hrefForDimension(by, t.key),
  }))
}

function hrefForDimension(by: Dimension, id: string): string | undefined {
  switch (by) {
    case 'hospital':
      return `#/e/hospital/${id}`
    case 'ward':
      return `#/e/ward/${encodeURIComponent(id)}`
    case 'labdept':
      return `#/e/labdept/${encodeURIComponent(id)}`
    case 'medicine':
      return `#/e/medicine/${id}`
    case 'incubator':
      return `#/e/incubator/${encodeURIComponent(id)}`
    case 'nursery':
      return `#/e/nursery/${id}`
    case 'site':
      return `#/e/site/${id}`
    default:
      return undefined
  }
}

/* ── records ─────────────────────────────────────────────────────────────── */

/** A page of the events behind a flow figure, newest first. */
export const records = (scope: Scope, slug: string, offset = 0, limit = 20): EventPage =>
  page(slug, siteKeyOf(scope), scope.win, offset, limit)

/** A page of the animals in scope. */
export const animals = (scope: Scope, offset = 0, limit = 20): Page<Animal> =>
  animalsInScope(siteKeyOf(scope), scope.win, offset, limit)

/* ── population shape ────────────────────────────────────────────────────── */

export const sex = (scope: Scope) => sexSplitFor(siteKeyOf(scope), scope.win)

/** Species held in the scope, with their populations. Biggest first. */
export function population(scope: Scope): { species: Species; count: number }[] {
  const keys = siteKeyOf(scope) ? [siteKeyOf(scope)!] : SITES.map((s) => s.key)
  return keys
    .flatMap((k) => speciesStock(k, scope.win))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
}

/** The class composition — the axis a curator groups a collection by. */
export function byClass(scope: Scope): Row[] {
  const rows = population(scope)
  const totals = new Map<string, number>()
  for (const { species, count: n } of rows) totals.set(species.cls, (totals.get(species.cls) ?? 0) + n)
  const total = [...totals.values()].reduce((a, b) => a + b, 0)
  return [...totals.entries()]
    .map(([label, value]) => ({ id: label, label, value, percent: total ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}

export { stockOfSpecies, split as siteSplit }
export type { Split, Reading }
