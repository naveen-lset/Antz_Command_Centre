/**
 * Determinism primitives for the world model.
 *
 * EVERYTHING IN `core/` IS DERIVED, NEVER RANDOM. A collection of 215,432 animals and
 * six years of daily events cannot be hand-authored, but it also cannot be drawn from
 * `Math.random`: a list that reshuffles when you scroll it, or an animal whose sex
 * changes when you re-open its record, is worse than no data at all. So every value is
 * a pure function of a string key — the same key always yields the same value, in this
 * session and the next, without a single row being stored.
 *
 * `apportion` is the other half of the contract. Wherever a total is split — a site
 * across its species, a month across its days — the parts must sum to the whole
 * EXACTLY. Rounding each share independently is what makes a species table add up to
 * 24 under a heading that says 23, and that single defect is enough for a director to
 * stop trusting every other figure on the screen.
 */

/** FNV-1a. Stable across engines — no bit-width surprises, unlike a naive `hash * 31`. */
export function hash(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A mulberry32 stream seeded from a string key. */
export function rng(key: string): () => number {
  let a = hash(key)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One draw from a key, without keeping a stream around. */
export const draw = (key: string): number => hash(key) / 4294967296

export const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]

/** One item chosen by key alone — the form used when there is no stream in hand. */
export const pickBy = <T,>(key: string, xs: readonly T[]): T => xs[Math.floor(draw(key) * xs.length)]

/** Integer in [lo, hi], inclusive. */
export const between = (r: () => number, lo: number, hi: number): number =>
  lo + Math.floor(r() * (hi - lo + 1))

/**
 * Split `total` across `weights` so the parts sum to `total` exactly.
 *
 * Largest-remainder. Independent rounding of six shares of 23 gives 24; this cannot,
 * because the remainder is handed out one unit at a time to the largest fractions.
 */
export function apportion(total: number, weights: number[]): number[] {
  const n = weights.length
  if (n === 0) return []
  const whole = Math.round(total)
  const sum = weights.reduce((a, w) => a + Math.max(0, w), 0)
  if (sum <= 0) {
    /* No weight to go on — spread evenly rather than dropping the total on the floor. */
    const base = Array.from({ length: n }, () => Math.floor(whole / n))
    for (let i = 0; i < whole - Math.floor(whole / n) * n; i++) base[i]++
    return base
  }

  const exact = weights.map((w) => (whole * Math.max(0, w)) / sum)
  const base = exact.map(Math.floor)
  let left = whole - base.reduce((a, v) => a + v, 0)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; left > 0; k = (k + 1) % n, left--) base[order[k].i]++
  return base
}

/**
 * Weights for spreading a count across `days` days, with a weekly rhythm.
 *
 * A flat spread is the one thing a daily series must not be: it makes every seven-day
 * window identical, which turns the whole date filter into decoration. Keepers work a
 * roster, so intakes and treatments cluster on weekdays while births and deaths do
 * not care what day it is — `weekly` is how much of that rhythm a metric shows.
 */
export function dayWeights(key: string, days: number, offset: number, weekly = 0.35): number[] {
  const r = rng(key)
  return Array.from({ length: days }, (_, i) => {
    const dow = (offset + i) % 7
    /* Day 0 of the epoch is a Friday; the weekend is therefore 1 and 2. */
    const roster = dow === 1 || dow === 2 ? 1 - weekly : 1 + weekly / 2.5
    return roster * (0.45 + r() * 1.1)
  })
}
