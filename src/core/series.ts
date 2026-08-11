/**
 * DAILY SERIES — the layer that makes every window a real sum instead of an estimate.
 *
 * WHAT THIS FILE USED TO DO, AND WHY IT NO LONGER HAS TO. `metrics.ts` stated five nested
 * window totals per site, and this file solved for a daily series satisfying all five exactly
 * — carving the ledger into disjoint segments and distributing each segment's total across its
 * days with a weekly rhythm and a seeded wobble. That solve existed because nobody can author
 * 2,192 days × 6 sites × 13 metrics.
 *
 * There is nothing left to solve. Every event in the database carries its own date, so the
 * daily series is the events, counted — `store.ts` builds the per-site day counts on first
 * read and caches them. No segments, no rhythm, no wobble, no scale factor anywhere. A custom
 * range of 12–19 May sums the actual events of 12–19 May.
 *
 * LEVELS ARE READ, NOT SUMMED, and that distinction is still load-bearing. A population is a
 * reading, so the answer to "this month" is the reading on the last day of the month — which
 * is why every window ending today shows the same headcount, and why "last month" shows
 * April's. Summing a level over 31 days would report a population of three million.
 *
 * TWO KINDS OF LEVEL NOW, and they are not equally well founded:
 *
 *   POPULATION  has a real series in `levels.bin` — an exact count today, walked backwards
 *               through the recorded movements. Read directly.
 *   EVERYTHING   has two readings (now, and six months ago) and is interpolated between them,
 *   ELSE        exactly as before. Coverage and caseload are point-in-time facts in the
 *               schema; there is no history to read, so the curve between them is a
 *               derivation and is documented as one.
 */

import { HISTORY_DAYS, TODAY, type Win } from './calendar'
import { METRICS, type Metric } from './metrics'
import { dailyOf, populationSeries } from './store'
import { rng } from './seed'

/* ── construction ────────────────────────────────────────────────────────── */

const cache = new Map<string, Int32Array>()

/** Shared zero series for a metric with no model. Never written to. */
const EMPTY = new Int32Array(HISTORY_DAYS)

/**
 * The earlier of the two readings a level carries, as a ledger index.
 *
 * The ETL computes every `then` at exactly 182 days back, so that is where the interpolation
 * is anchored. It used to be the first day of the month five back, which was the boundary the
 * authored six-month column sat on — a column that no longer exists.
 */
const SIX_START = Math.max(0, TODAY - 182)

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
  const metric = METRICS[slug]
  if (!metric) return EMPTY

  /* A flow is its own events, counted per day — no cache here, `store.ts` holds one keyed the
     same way, and a second copy would be 460 KB per (metric, site) for nothing. */
  if (metric.kind === 'flow') return dailyOf(slug, siteKey)

  /* The population is the one level with a real series behind it. */
  if (slug === 'animals') return populationSeries(siteKey)

  const key = `${slug}:${siteKey}`
  const hit = cache.get(key)
  if (hit) return hit

  const row = metric.levels?.find((l) => l.site === siteKey)
  const built = row ? buildLevel(slug, siteKey, row.now, row.then) : EMPTY
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
