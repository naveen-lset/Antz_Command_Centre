/**
 * DAILY SERIES — the layer that makes every window a real sum instead of an estimate.
 *
 * `metrics.ts` states five nested window totals per site. This file solves for a daily
 * series that satisfies all five exactly, and from then on every figure in the product is
 * an aggregation over days: `sum(from…to)` for a flow, `value[day]` for a level. There is
 * no scale factor anywhere, which is the point — the thing this replaces multiplied a
 * month by 2.92 to answer "quarter" and told the reader it was a quarter.
 *
 * HOW THE SOLVE WORKS. The five authored windows nest — today ⊆ last 7 days ⊆ this month
 * ⊆ last 6 months ⊆ all time — so their differences carve the ledger into five disjoint
 * segments with a known total each. Distributing each segment's total across its own days
 * with `apportion` gives a series that reproduces every authored figure exactly, not
 * approximately, because largest-remainder rounding cannot lose or invent a unit.
 *
 * WHAT IS AND ISN'T CLAIMED. Within a segment, the day-to-day shape is derived — a weekly
 * roster rhythm plus a seeded wobble. That is a real modelling choice and the only one
 * left: the totals are the data, the intra-segment shape is a plausible realisation of
 * them. It is honest in the way the old scale factors were not, because no window the
 * reader can select is ever answered by multiplying a different window. A custom range of
 * 12–19 May sums the actual days 12–19 May.
 *
 * LEVELS ARE INTERPOLATED, NOT SUMMED, and that distinction is load-bearing. A population
 * is a reading, so the answer to "this month" is the reading on the last day of the month
 * — which is why every window ending today shows the same headcount, and why "last month"
 * shows June's. Summing a level over 31 days would report a population of six million.
 *
 * Series are built lazily per (metric, site) and cached. Nothing is computed for a module
 * nobody opened.
 */

import { HISTORY_DAYS, TODAY, WORLD_TODAY, indexOf, type Win } from './calendar'
import { METRICS, type Metric } from './metrics'
import { apportion, dayWeights, rng } from './seed'

/* ── the segment boundaries the authored figures imply ────────────────────── */

/** First index of the calendar month `back` months before the world's today. */
const startOfMonthBack = (back: number): number =>
  indexOf(new Date(WORLD_TODAY.getFullYear(), WORLD_TODAY.getMonth() - back, 1))

const MONTH_START = startOfMonthBack(0)
const SIX_START = startOfMonthBack(5)
const WEEK_START = TODAY - 6

/**
 * The five disjoint day ranges, newest first, and which pair of authored figures each
 * one's total is the difference of.
 *
 * `[0, 1]` reads "v[1] − v[0]": the last-7-days total less today's, spread over the six
 * days between them. Index 5 is a sentinel meaning zero, used by the oldest segment's
 * upper bound so the table stays uniform.
 */
const SEGMENTS: { from: number; to: number; of: [number, number] }[] = [
  { from: TODAY, to: TODAY, of: [5, 0] },
  { from: WEEK_START, to: TODAY - 1, of: [0, 1] },
  { from: MONTH_START, to: WEEK_START - 1, of: [1, 2] },
  { from: SIX_START, to: MONTH_START - 1, of: [2, 3] },
  { from: 0, to: SIX_START - 1, of: [3, 4] },
]

/** How much weekly rhythm each metric shows. Births do not keep office hours; intakes do. */
const RHYTHM: Record<string, number> = {
  births: 0.05,
  mortality: 0.08,
  fetal: 0.08,
  eggs: 0.12,
  hatched: 0.12,
  accession: 0.5,
  transfers: 0.55,
  deworming: 0.6,
  lab: 0.45,
  pharmacy: 0.4,
  admissions: 0.25,
  discarded: 0.3,
  disease: 0.15,
}

/* ── construction ────────────────────────────────────────────────────────── */

const cache = new Map<string, Int32Array>()

function buildFlow(slug: string, siteKey: string, v: readonly number[]): Int32Array {
  const out = new Int32Array(HISTORY_DAYS)
  const weekly = RHYTHM[slug] ?? 0.3

  SEGMENTS.forEach((seg, si) => {
    const days = seg.to - seg.from + 1
    if (days <= 0) return
    const [lo, hi] = seg.of
    /* Index 5 is the sentinel for "nothing below" — the newest segment's total is just
       today's figure. Differences are floored at zero: the authored windows are nested and
       therefore monotonic, but a future typo should show as a flat segment rather than
       silently subtracting days off the segment before it. */
    const total = Math.max(0, (v[hi] ?? 0) - (lo === 5 ? 0 : (v[lo] ?? 0)))
    if (total === 0) return
    const shares = apportion(total, dayWeights(`${slug}:${siteKey}:${si}`, days, seg.from, weekly))
    for (let i = 0; i < days; i++) out[seg.from + i] = shares[i]
  })

  return out
}

/**
 * A level's daily curve.
 *
 * Two readings are known — now, and six months ago — so between them the curve
 * interpolates and before them it drifts at the same rate, bounded. The bound matters:
 * a caseload that fell from 96 to 41 in six months, compounded backwards over six years
 * unbounded, would claim a caseload of eleven thousand in 2019. Clamping the per-period
 * drift to ±12% keeps the early years plausible without pretending we know them.
 *
 * The value on the last day is written last and exactly, because that is the figure every
 * page states and it must not be a rounding of an interpolation.
 */
function buildLevel(slug: string, siteKey: string, now: number, then: number): Int32Array {
  const out = new Int32Array(HISTORY_DAYS)
  const span = TODAY - SIX_START
  const r = rng(`${slug}:${siteKey}:level`)

  const drift = Math.min(1.12, Math.max(0.88, then > 0 ? now / then : 1))

  for (let d = 0; d <= TODAY; d++) {
    let base: number
    if (d >= SIX_START) {
      const t = span > 0 ? (d - SIX_START) / span : 1
      base = then + (now - then) * t
    } else {
      /* Going back in time divides by the drift, one six-month period at a time. */
      const periods = (SIX_START - d) / Math.max(1, span)
      base = then / Math.pow(drift, periods)
    }
    /* ±1.2% of seeded noise so a chart of a level is not a straight line — but scaled by
       the value, so a caseload of 10 wobbles by at most one animal rather than by 120. */
    const wobble = 1 + (r() - 0.5) * 0.024
    out[d] = Math.max(0, Math.round(base * wobble))
  }

  out[TODAY] = Math.max(0, Math.round(now))
  return out
}

function seriesFor(slug: string, siteKey: string): Int32Array {
  const key = `${slug}:${siteKey}`
  const hit = cache.get(key)
  if (hit) return hit

  const metric = METRICS[slug]
  let built: Int32Array
  if (!metric) {
    built = new Int32Array(HISTORY_DAYS)
  } else if (metric.kind === 'flow') {
    const row = metric.flows?.find((f) => f.site === siteKey)
    built = row ? buildFlow(slug, siteKey, row.v) : new Int32Array(HISTORY_DAYS)
  } else {
    const row = metric.levels?.find((l) => l.site === siteKey)
    built = row ? buildLevel(slug, siteKey, row.now, row.then) : new Int32Array(HISTORY_DAYS)
  }

  cache.set(key, built)
  return built
}

/* ── reading ─────────────────────────────────────────────────────────────── */

/** The whole daily array for one site. Charts read it; nothing else should need to. */
export const daily = (slug: string, siteKey: string): Int32Array => seriesFor(slug, siteKey)

/** Total events between two indices, inclusive. Flows only. */
export function sumIn(slug: string, siteKey: string, from: number, to: number): number {
  const s = seriesFor(slug, siteKey)
  let n = 0
  for (let d = Math.max(0, from); d <= Math.min(TODAY, to); d++) n += s[d]
  return n
}

/** The reading on one day. Levels and rate numerators only. */
export const levelAt = (slug: string, siteKey: string, day: number): number =>
  seriesFor(slug, siteKey)[Math.max(0, Math.min(TODAY, day))] ?? 0

/** A rate's denominator — the eligible herd, which does not move with the window. */
export const denomOf = (slug: string, siteKey: string): number =>
  METRICS[slug]?.levels?.find((l) => l.site === siteKey)?.of ?? 0

export interface Reading {
  value: number
  /** Denominator, for a rate. */
  of?: number
  /** A rate's own coverage. Undefined for flows and levels, where a share is not a rate. */
  percent?: number
}

/**
 * One site's figure for one window, by the rule its kind demands: a flow is summed across
 * the window, a level is read on its last day.
 */
export function readSite(slug: string, siteKey: string, win: Win): Reading {
  const metric = METRICS[slug]
  if (!metric) return { value: 0 }
  if (metric.kind === 'flow') return { value: sumIn(slug, siteKey, win.from, win.to) }

  const value = levelAt(slug, siteKey, win.to)
  if (metric.kind !== 'rate') return { value }
  const of = denomOf(slug, siteKey)
  return { value, of, percent: of ? (value / of) * 100 : 0 }
}

export interface SiteRow extends Reading {
  siteKey: string
  /** Rate: this site's own coverage. Flow or level: its share of the whole. */
  share: number
}

export interface Split {
  kind: Metric['kind']
  unit: string
  grain: Metric['grain']
  /** The zoo-wide figure — summed or pooled from the rows, never authored. */
  total: number
  /** Denominator total, for a rate. */
  totalOf?: number
  rows: SiteRow[]
  /** Sites with anything to report in this window. */
  active: number
}

/**
 * A metric's split across every site for one window, biggest first.
 *
 * `total` is derived from the rows rather than read from anywhere, so a page headed 23
 * above a list of 11 + 5 + 3 + 2 + 2 cannot happen. That is the single invariant the whole
 * data-consistency requirement rests on, and it is enforced here rather than trusted.
 */
export function split(slug: string, win: Win): Split | undefined {
  const metric = METRICS[slug]
  if (!metric) return undefined

  const keys = (metric.kind === 'flow' ? metric.flows : metric.levels)?.map((r) => r.site) ?? []
  const read = keys.map((siteKey) => ({ siteKey, ...readSite(slug, siteKey, win) }))

  const total = read.reduce((n, r) => n + r.value, 0)
  const totalOf = metric.kind === 'rate' ? read.reduce((n, r) => n + (r.of ?? 0), 0) : undefined

  const rows: SiteRow[] = read
    .map((r) => ({
      ...r,
      share: metric.kind === 'rate' ? (r.percent ?? 0) : total ? (r.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  return {
    kind: metric.kind,
    unit: metric.unit,
    grain: metric.grain,
    total: metric.kind === 'rate' && totalOf ? (total / totalOf) * 100 : total,
    totalOf,
    rows,
    active: rows.filter((r) => r.value > 0).length,
  }
}

/**
 * The figure across one scope — a single site, or the whole collection.
 *
 * The zoo-wide branch pools the rows rather than reading a stored total, for the same
 * reason `split` does.
 */
export function read(slug: string, siteKey: string | null, win: Win): Reading | undefined {
  const metric = METRICS[slug]
  if (!metric) return undefined
  if (siteKey) return readSite(slug, siteKey, win)

  const s = split(slug, win)
  if (!s) return undefined
  return metric.kind === 'rate'
    ? { value: s.rows.reduce((n, r) => n + r.value, 0), of: s.totalOf, percent: s.total }
    : { value: s.total }
}

/**
 * A window bucketed for a chart.
 *
 * Flows are summed within each bucket; levels are read on each bucket's last day. Either
 * way the series and the KPI above it are the same numbers aggregated two ways, so a
 * sparkline can never disagree with the figure it sits under.
 */
export function series(slug: string, siteKey: string | null, win: Win, max = 30): number[] {
  const metric = METRICS[slug]
  if (!metric) return []
  const keys = siteKey
    ? [siteKey]
    : ((metric.kind === 'flow' ? metric.flows : metric.levels)?.map((r) => r.site) ?? [])

  const n = Math.max(1, Math.min(max, win.days))
  const size = win.days / n

  return Array.from({ length: n }, (_, i) => {
    const from = win.from + Math.floor(i * size)
    const to = win.from + Math.floor((i + 1) * size) - 1
    if (metric.kind === 'flow') return keys.reduce((sum, k) => sum + sumIn(slug, k, from, to), 0)
    return keys.reduce((sum, k) => sum + levelAt(slug, k, Math.max(from, to)), 0)
  })
}

/** Which sites a metric has any model for at all. */
export const sitesWithData = (slug: string): string[] => {
  const m = METRICS[slug]
  return (m?.kind === 'flow' ? m.flows : m?.levels)?.map((r) => r.site) ?? []
}

export const hasMetric = (slug: string): boolean => Boolean(METRICS[slug])
