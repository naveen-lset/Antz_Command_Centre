/**
 * The six sites the zoo is made of, and every module's split across them.
 *
 * One zoo, six sites, and until now the home screen and every module page stated
 * only the zoo-wide figure. "23 deaths" is a different conversation from "11 of the
 * 23 deaths were in Aquatic Halls", and the second one is the one that leads to an
 * action.
 *
 * `Overall` is never authored — it is the sum (or, where a denominator is given,
 * the pooled rate) of the site rows. A hand-typed total is a total that eventually
 * disagrees with the rows under it, and a director who spots that stops trusting
 * every other number on the page.
 *
 * Each series is read positionally: [today, week, month, sixMonths, all]. The month
 * column is the authoritative one — it is what each page's hero already states, and
 * the two have to match.
 */

import type { AnchorKey, Cut } from './period'

export interface Site {
  key: string
  name: string
  /** Enclosure-code prefix, as it appears on records. */
  code: string
  enclosures: number
}

/** Ordered biggest-collection first, which is also how every module's rows sort. */
export const SITES: Site[] = [
  { key: 'aquatic', name: 'Aquatic Halls', code: 'AQ', enclosures: 22 },
  { key: 'aviary', name: 'Aviary Complex', code: 'AV', enclosures: 24 },
  { key: 'savanna', name: 'Savanna', code: 'SV', enclosures: 18 },
  { key: 'reptile', name: 'Reptile House', code: 'RP', enclosures: 14 },
  { key: 'primate', name: 'Primate Forest', code: 'PR', enclosures: 11 },
  { key: 'carnivore', name: 'Carnivore Ridge', code: 'CR', enclosures: 7 },
]

/** [today, week, month, sixMonths, all] — the order is load-bearing. */
export type Series = [number, number, number, number, number]

const ORDER: AnchorKey[] = ['today', 'week', 'month', 'sixMonths', 'all']
const at = (s: Series, k: AnchorKey) => s[ORDER.indexOf(k)] ?? s[2]

export interface SiteRow {
  site: string
  v: Series
  /** Denominator, for the modules whose figure is a rate rather than a count. */
  of?: Series
}

export interface ModuleSites {
  /** Word after the number. Singular-agnostic — "deaths", not "death(s)". */
  unit: string
  /**
   * What the number means at each window. A count module accumulates over the
   * window; a stock module is a headcount as at its end, which is why `animals`
   * says so rather than letting "all time" read as a running total.
   */
  kind: 'count' | 'stock' | 'rate'
  rows: SiteRow[]
}

/*
 * Every `month` column below sums to the figure its page's hero already states:
 * animals 215,432 · accession 18 · births 45 · eggs 142 · discarded 13 · fetal 5
 * mortality 23 · health 124 · disease 9 · vaccination 2,184 of 2,374 (92%)
 * preventive 2,136 of 2,374 (90%) · deworming 63 · transfers 28.
 */
export const moduleSites: Record<string, ModuleSites> = {
  animals: {
    unit: 'animals',
    kind: 'stock',
    rows: [
      { site: 'aquatic', v: [178430, 178415, 178400, 172900, 221800] },
      { site: 'aviary', v: [21318, 21309, 21300, 20640, 26400] },
      { site: 'savanna', v: [6245, 6243, 6240, 6080, 7720] },
      { site: 'reptile', v: [5122, 5121, 5120, 4980, 6300] },
      { site: 'primate', v: [2481, 2480, 2480, 2410, 3060] },
      { site: 'carnivore', v: [1893, 1893, 1892, 1830, 3130] },
    ],
  },
  /* Three sites in the month, six over six months — a quiet site is normal for a
     low-volume flow, and the page's hero says "3 Sites" for exactly this reason. */
  accession: {
    unit: 'intakes',
    kind: 'count',
    rows: [
      { site: 'aquatic', v: [1, 2, 8, 34, 412] },
      { site: 'aviary', v: [0, 2, 6, 22, 268] },
      { site: 'savanna', v: [0, 1, 4, 17, 196] },
      { site: 'reptile', v: [0, 0, 0, 12, 141] },
      { site: 'primate', v: [0, 0, 0, 9, 104] },
      { site: 'carnivore', v: [0, 0, 0, 6, 73] },
    ],
  },
  births: {
    unit: 'births',
    kind: 'count',
    rows: [
      { site: 'aquatic', v: [2, 4, 14, 82, 986] },
      { site: 'aviary', v: [1, 3, 11, 64, 742] },
      { site: 'savanna', v: [0, 2, 8, 47, 538] },
      { site: 'reptile', v: [0, 1, 5, 29, 331] },
      { site: 'primate', v: [0, 1, 4, 24, 268] },
      { site: 'carnivore', v: [0, 0, 3, 18, 196] },
    ],
  },
  eggs: {
    unit: 'eggs',
    kind: 'count',
    rows: [
      { site: 'aviary', v: [4, 22, 96, 540, 6280] },
      { site: 'reptile', v: [1, 8, 34, 196, 2264] },
      { site: 'aquatic', v: [0, 3, 12, 64, 742] },
      { site: 'savanna', v: [0, 0, 0, 0, 0] },
      { site: 'primate', v: [0, 0, 0, 0, 0] },
      { site: 'carnivore', v: [0, 0, 0, 0, 0] },
    ],
  },
  discarded: {
    unit: 'discarded',
    kind: 'count',
    rows: [
      { site: 'aviary', v: [1, 2, 9, 48, 552] },
      { site: 'reptile', v: [0, 1, 3, 17, 196] },
      { site: 'aquatic', v: [0, 0, 1, 6, 68] },
      { site: 'savanna', v: [0, 0, 0, 0, 0] },
      { site: 'primate', v: [0, 0, 0, 0, 0] },
      { site: 'carnivore', v: [0, 0, 0, 0, 0] },
    ],
  },
  fetal: {
    unit: 'losses',
    kind: 'count',
    rows: [
      { site: 'savanna', v: [0, 1, 2, 9, 104] },
      { site: 'aquatic', v: [0, 0, 2, 4, 46] },
      { site: 'aviary', v: [0, 0, 1, 6, 72] },
      { site: 'primate', v: [0, 0, 0, 4, 41] },
      { site: 'reptile', v: [0, 0, 0, 2, 24] },
      { site: 'carnivore', v: [0, 0, 0, 2, 19] },
    ],
  },
  /* The month column is pinned by three separate claims on the page: Aquatic Halls
     is 11 of 23 (48%), five sites reported, and the highest of the other four is 5.
     Change any of these and the Concentration card starts contradicting the split. */
  mortality: {
    unit: 'deaths',
    kind: 'count',
    rows: [
      { site: 'aquatic', v: [0, 3, 11, 61, 742] },
      { site: 'aviary', v: [0, 1, 5, 34, 398] },
      { site: 'savanna', v: [0, 1, 3, 26, 306] },
      { site: 'reptile', v: [0, 0, 2, 17, 204] },
      { site: 'primate', v: [0, 0, 2, 13, 151] },
      { site: 'carnivore', v: [0, 0, 0, 9, 98] },
    ],
  },
  health: {
    unit: 'under care',
    kind: 'stock',
    rows: [
      { site: 'aquatic', v: [38, 40, 41, 96, 1240] },
      { site: 'aviary', v: [26, 27, 28, 68, 880] },
      { site: 'savanna', v: [18, 19, 19, 47, 610] },
      { site: 'reptile', v: [13, 13, 14, 34, 441] },
      { site: 'primate', v: [11, 12, 12, 28, 362] },
      { site: 'carnivore', v: [9, 9, 10, 24, 308] },
    ],
  },
  disease: {
    unit: 'flagged',
    kind: 'count',
    rows: [
      { site: 'aquatic', v: [1, 2, 3, 8, 74] },
      { site: 'aviary', v: [0, 1, 2, 6, 52] },
      { site: 'savanna', v: [1, 1, 1, 5, 46] },
      { site: 'reptile', v: [0, 0, 1, 3, 28] },
      { site: 'primate', v: [0, 0, 1, 2, 19] },
      { site: 'carnivore', v: [0, 0, 1, 1, 12] },
    ],
  },
  /*
   * Rate modules. `of` is the eligible herd, which does not move with the reporting
   * window — the same animals are due whichever way you cut the dates.
   *
   * The per-site rates deliberately SPREAD (86–95% on vaccination). An earlier draft
   * gave all six the pooled 92%, which is arithmetically fine and completely useless:
   * six identical bars answer "how are we doing" and hide the only thing the card is
   * for, which is that Reptile House is nine points behind Aquatic Halls.
   */
  preventive: {
    unit: 'protected',
    kind: 'rate',
    rows: [
      { site: 'aquatic', v: [643, 641, 642, 620, 604], of: [690, 690, 690, 690, 690] },
      { site: 'aviary', v: [490, 488, 489, 470, 458], of: [532, 532, 532, 532, 532] },
      { site: 'savanna', v: [398, 396, 397, 382, 372], of: [446, 446, 446, 446, 446] },
      { site: 'reptile', v: [251, 249, 250, 238, 230], of: [298, 298, 298, 298, 298] },
      { site: 'primate', v: [208, 206, 207, 198, 192], of: [238, 238, 238, 238, 238] },
      { site: 'carnivore', v: [152, 151, 151, 145, 140], of: [170, 170, 170, 170, 170] },
    ],
  },
  vaccination: {
    unit: 'covered',
    kind: 'rate',
    rows: [
      { site: 'aquatic', v: [658, 657, 656, 630, 612], of: [690, 690, 690, 690, 690] },
      { site: 'aviary', v: [501, 500, 500, 478, 466], of: [532, 532, 532, 532, 532] },
      { site: 'savanna', v: [407, 406, 406, 388, 378], of: [446, 446, 446, 446, 446] },
      { site: 'reptile', v: [257, 256, 256, 240, 232], of: [298, 298, 298, 298, 298] },
      { site: 'primate', v: [213, 212, 212, 202, 196], of: [238, 238, 238, 238, 238] },
      { site: 'carnivore', v: [155, 155, 154, 146, 140], of: [170, 170, 170, 170, 170] },
    ],
  },
  deworming: {
    unit: 'treatments',
    kind: 'count',
    rows: [
      { site: 'aquatic', v: [2, 5, 19, 118, 1420] },
      { site: 'aviary', v: [1, 4, 14, 86, 1032] },
      { site: 'savanna', v: [1, 3, 11, 68, 818] },
      { site: 'reptile', v: [0, 2, 8, 48, 576] },
      { site: 'primate', v: [0, 1, 6, 38, 458] },
      { site: 'carnivore', v: [0, 1, 5, 30, 362] },
    ],
  },
  transfers: {
    unit: 'transfers',
    kind: 'count',
    rows: [
      { site: 'aquatic', v: [1, 2, 8, 46, 548] },
      { site: 'aviary', v: [0, 2, 6, 36, 412] },
      { site: 'savanna', v: [0, 1, 5, 29, 336] },
      { site: 'reptile', v: [0, 1, 4, 22, 258] },
      { site: 'primate', v: [0, 1, 3, 17, 196] },
      { site: 'carnivore', v: [0, 0, 2, 12, 142] },
    ],
  },
}

export const siteName = (key: string) => SITES.find((s) => s.key === key)?.name ?? key
export const siteOf = (key: string) => SITES.find((s) => s.key === key)

export interface SiteCutRow {
  site: Site
  value: number
  of?: number
  /**
   * Rate module: this site's own coverage against its own herd. Count module: this
   * site's share of the zoo-wide total. Both are the right length for the bar —
   * a site holding 690 animals at 90% and one holding 170 at 90% are doing equally
   * well, so a rate bar must not be scaled by headcount.
   */
  percent: number
}

export interface SiteCut {
  kind: ModuleSites['kind']
  unit: string
  /** The zoo-wide figure, summed or pooled from the rows — never authored. */
  overall: number
  /** Denominator total, for rate modules. */
  overallOf?: number
  rows: SiteCutRow[]
  /** Sites with anything to report in this window. */
  active: number
}

/**
 * A module's site split for one window, sorted biggest first.
 *
 * `cut` carries the authored column to read AND the factor between that column and the
 * window the reader picked — see `period.tsx`. The factor is applied to COUNTS only: a
 * stock is a headcount at the window's end and a rate is a ratio, and multiplying
 * either by 2.92 because the reader chose "Quarter" would be nonsense.
 */
export function siteCut(slug: string, cut: Cut): SiteCut | undefined {
  const mod = moduleSites[slug]
  if (!mod) return undefined

  const grow = (n: number) => (mod.kind === 'count' ? Math.round(n * cut.scale) : n)

  /* Rows whose site key doesn't resolve are dropped here rather than rendered as a
     blank name — but they are dropped from the totals too, so Overall stays the sum
     of exactly the rows shown underneath it. */
  const resolved = mod.rows.flatMap((r) => {
    const site = siteOf(r.site)
    return site
      ? [{ site, value: grow(at(r.v, cut.of)), of: r.of ? at(r.of, cut.of) : undefined }]
      : []
  })

  const total = resolved.reduce((n, r) => n + r.value, 0)
  const totalOf = resolved.reduce((n, r) => n + (r.of ?? 0), 0) || undefined

  const rows: SiteCutRow[] = resolved
    .map((r) => ({
      ...r,
      percent:
        mod.kind === 'rate'
          ? r.of
            ? (r.value / r.of) * 100
            : 0
          : total
            ? (r.value / total) * 100
            : 0,
    }))
    .sort((a, b) => b.value - a.value)

  return {
    kind: mod.kind,
    unit: mod.unit,
    overall: mod.kind === 'rate' && totalOf ? (total / totalOf) * 100 : total,
    overallOf: totalOf,
    rows,
    active: rows.filter((r) => r.value > 0).length,
  }
}
