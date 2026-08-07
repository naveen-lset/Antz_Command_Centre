/**
 * SITE SPLITS — now a thin adapter over `core/series.ts`.
 *
 * WHAT THIS FILE USED TO HOLD. Thirteen hand-authored tables, one per module, each with six
 * site rows of five columns. It was the best available answer at the time and it had two
 * structural problems that no amount of care in the tables could fix.
 *
 * First, a site was a string rather than a thing. Nothing knew that `'aquatic'` in the
 * mortality table and `'aquatic'` in the vaccination table were the same place, so there was
 * no way to ask what was happening in Aquatic Halls — only what each module said about a
 * shared string, and no obligation for the answers to relate.
 *
 * Second, only five windows existed, so the other four were multiplied into being.
 *
 * The tables have moved to `core/metrics.ts` as CONSTRAINTS on a real daily series, and
 * sites have moved to `core/world.ts` as entities with ids. This file remains because the
 * design system and eight module pages call `siteCut`, and the shape it returns is worth
 * keeping stable — but every figure it now hands back is a genuine aggregation over days,
 * scoped to real entities.
 */

import type { Win } from '../core/calendar'
import { split, type Split } from '../core/series'
import { SITES, siteName, siteOf, type Site } from '../core/world'

export type { Site }
export { SITES, siteName, siteOf }

export interface SiteCutRow {
  site: Site
  value: number
  of?: number
  /**
   * Rate module: this site's own coverage against its own herd. Count module: this site's
   * share of the zoo-wide total. Both are the right length for the bar — a site holding 690
   * animals at 90% and one holding 170 at 90% are doing equally well, so a rate bar must not
   * be scaled by headcount.
   */
  percent: number
}

export interface SiteCut {
  /** `count` is a flow, `stock` a reading, `rate` a ratio. The call sites' own vocabulary. */
  kind: 'count' | 'stock' | 'rate'
  unit: string
  /** The zoo-wide figure, summed or pooled from the rows — never authored. */
  overall: number
  /** Denominator total, for a rate. */
  overallOf?: number
  rows: SiteCutRow[]
  /** Sites with anything to report in this window. */
  active: number
}

const KIND: Record<Split['kind'], SiteCut['kind']> = { flow: 'count', level: 'stock', rate: 'rate' }

/**
 * A module's split across the six sites for one window.
 *
 * `overall` is derived from the rows rather than stored anywhere, so a page headed 23 above a
 * list of 11 + 5 + 3 + 2 + 2 remains impossible. That invariant used to be a property of how
 * carefully the tables were typed; it is now a property of the code, and `core/checks.ts`
 * asserts it at four different windows on every dev boot.
 */
export function siteCut(slug: string, win: Win): SiteCut | undefined {
  const s = split(slug, win)
  if (!s) return undefined

  return {
    kind: KIND[s.kind],
    unit: s.unit,
    overall: s.total,
    overallOf: s.totalOf,
    active: s.active,
    rows: s.rows.flatMap((r) => {
      const site = siteOf(r.siteKey)
      return site ? [{ site, value: r.value, of: r.of, percent: r.share }] : []
    }),
  }
}

/** Which modules have a site model at all. Every metric does, so nothing is unscopeable. */
export const hasSiteModel = (slug: string): boolean => Boolean(split(slug, { from: 0, to: 0, days: 1 } as Win))
