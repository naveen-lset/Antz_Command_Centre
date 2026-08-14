/**
 * THE EGG SEASON OF ONE SPECIES — derived, deterministic, and exactly additive.
 *
 * WHAT THIS IS. The extract carries no egg, clutch, hatch or candling row (`core/metrics.ts`
 * declares the gap in `UNSOURCED`, and `core/checks.ts` asserts it at boot). The Eggs tab was
 * asked for anyway, as a full operational screen: four season figures, a month-by-month
 * Laid → Fertile → Hatched progression, the discard reasons, and a per-female table. So the
 * season is DERIVED the way the rest of this world is derived — `core/seed.ts` states the
 * contract: every value a pure function of a string key, the same in this session and the next,
 * and every split of a total made with `apportion` so the parts sum to the whole EXACTLY.
 *
 * WHAT IS REAL AND WHAT IS DRAWN, kept apart on purpose:
 *   REAL — the females. Every row of the table is an animal on the register, read through
 *     `animalAt`: its id, its sex, its enclosure and its site, and a click lands on that
 *     animal's own page. No identity here is invented.
 *   REAL — the season's shape. The monthly weights are the species' own recorded births by
 *     calendar month, narrowed to rows dated by an actual birth date (the `dating` facet),
 *     because 61% of the births flow is dated by data entry and the two calendars are opposite.
 *   DRAWN — the counts. Clutches, eggs, fertility and hatches are seeded per animal id off
 *     `rng('egg:' + id)`, shaped by the species' own `clutch_litter_size` where the profile
 *     carries one. They are stable per animal forever, and they are not records.
 *
 * WHY EVERY FIGURE ON THE TAB RECONCILES BY CONSTRUCTION. The female rows are the only source:
 * the cards sum them, the chart apportions their sums, and the discard pills split their
 * shortfalls — laid − fertile is exactly "infertile on candling", fertile − hatched is exactly
 * the shell-loss reasons, and both splits are largest-remainder. There is no second derivation
 * to disagree with the first.
 */

import { animalAt, type Animal } from '../core/animals'
import { dateAt } from '../core/calendar'
import type { SpeciesProfile } from '../core/profiles'
import { apportion, draw, rng } from '../core/seed'
import { UNRESOLVED, flowOf } from '../core/store'
import { SPECIES, speciesByName } from '../core/world'

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** How one female compares to her own previous season. `none` is "no eggs this season". */
export interface LastSeason {
  kind: 'none' | 'up' | 'down' | 'same'
  pct?: number
}

export interface FemaleSeason {
  /** A real register row. The id, enclosure and site are the animal's own. */
  animal: Animal
  clutches: number
  eggs: number
  fertile: number
  hatched: number
  last: LastSeason
}

export interface DiscardReason {
  reason: string
  count: number
  /** The laying females the reason's count sits with, largest first, zeros dropped. */
  females: { animal: Animal; count: number }[]
}

export interface EggSite {
  key: string
  name: string
  count: number
}

export interface EggSeason {
  /** Sorted by eggs, largest first — the table's resting order. */
  females: FemaleSeason[]
  laid: number
  fertile: number
  hatched: number
  /** fertile − hatched: fertile eggs that never hatched. */
  died: number
  laying: number
  laidNothing: number
  oneClutch: number
  twoPlus: number
  /** Twelve entries each, January first. hatched ≤ fertile ≤ laid in EVERY month. */
  months: { laid: number[]; fertile: number[]; hatched: number[] }
  /** The best consecutive three months (wrapping the year end), as a share of the laid total. */
  peak: { label: string; pct: number }
  reasons: DiscardReason[]
  /** The sites the roster stands at, largest first — the table's own site filter. */
  sites: EggSite[]
}

/* ── the roster ──────────────────────────────────────────────────────────── */

/**
 * The females of one species, read off the register.
 *
 * SEX IS THE REGISTER'S OWN COLUMN and it is respected: a recorded male is never listed here.
 * But sex is recorded on 48% of the register and the median species carries ONE recorded
 * female, so a strictly-sexed roster would empty this tab for most of the collection. Where
 * fewer than six females are recorded, the roster extends into the UNSEXED animals — the very
 * animals whose sex a keeper has not yet determined — up to a floor of twelve. The extension
 * is register-ordered, so it is the same animals every time.
 */
function rosterOf(name: string, siteKey: string | null): Animal[] {
  const pops = speciesByName(name).filter((sp) => sp.weight > 0 && (!siteKey || sp.siteKey === siteKey))
  const females: Animal[] = []
  const unsexed: Animal[] = []
  for (const sp of pops) {
    for (let n = 1; n <= sp.weight; n++) {
      const a = animalAt(sp.id, n)
      if (!a) continue
      if (a.sex === 'F') females.push(a)
      else if (a.sex === 'U') unsexed.push(a)
    }
  }
  if (females.length < 6) females.push(...unsexed.slice(0, Math.max(0, 12 - females.length)))
  return females
}

/* ── the season's shape ──────────────────────────────────────────────────── */

/**
 * Twelve monthly weights for the laying season, from the species' own recorded births.
 *
 * NARROWED TO THE ROWS DATED BY A BIRTH DATE. The births flow's `dating` facet separates
 * "Birth date" from "Record created", and dims.json is explicit that the two have opposite
 * month profiles — pooled, the chart would draw the data-entry calendar. Where fewer than 24
 * dated births exist the season falls back to a seeded single-peak curve, because a shape read
 * off a handful of rows is noise wearing an axis.
 */
function seasonWeights(name: string): number[] {
  const counts = new Array<number>(12).fill(0)
  let dated = 0
  const f = flowOf('births')
  if (f) {
    const dating = f.facets.get('dating')
    for (const key of Object.keys(f.slices)) {
      const slice: [number, number] = f.slices[key]
      for (let r = slice[0]; r < slice[0] + slice[1]; r++) {
        const spx = f.species[r]
        if (spx === UNRESOLVED || SPECIES[spx]?.name !== name) continue
        if (dating && dating.values[dating.col[r]] !== 'Birth date') continue
        counts[dateAt(f.day[r]).getMonth()]++
        dated++
      }
    }
  }
  if (dated >= 24) {
    /* Smoothed rather than raw, so one quiet month is a dip and not a hole. */
    const mean = dated / 12
    return counts.map((c) => c + mean * 0.35)
  }
  const peakM = Math.floor(draw(`egg:season:${name}`) * 12)
  return Array.from({ length: 12 }, (_, m) => {
    const d = Math.min(Math.abs(m - peakM), 12 - Math.abs(m - peakM))
    return 1 + 2.4 * Math.exp(-(d * d) / 8)
  })
}

/**
 * Fit `parts` under `cap` month by month without changing its total.
 *
 * `apportion` splits proportionally, so a child series lands under its parent almost
 * everywhere — but the largest-remainder pass can hand a unit to a month whose parent is
 * smaller. The excess is clipped and re-seated where headroom exists; it terminates because
 * the child's total never exceeds the parent's.
 */
function nestWithin(parts: number[], cap: number[]): number[] {
  const out = parts.slice()
  let excess = 0
  for (let i = 0; i < out.length; i++) {
    if (out[i] > cap[i]) {
      excess += out[i] - cap[i]
      out[i] = cap[i]
    }
  }
  for (let i = 0; excess > 0; i = (i + 1) % out.length) {
    const room = cap[i] - out[i]
    if (room > 0) {
      const add = Math.min(room, excess)
      out[i] += add
      excess -= add
    }
  }
  return out
}

/* ── the discard vocabulary ──────────────────────────────────────────────── */

/** The shell-loss reasons and their base weights. Infertile is not here — it is laid − fertile, exactly. */
const SHELL_REASONS: readonly (readonly [string, number])[] = [
  ['Died in shell', 46],
  ['Cracked in handling', 17],
  ['Rotten / contaminated', 11],
  ['Abandoned in nest', 8],
  ['Malpositioned at pipping', 5],
  ['Shell too thin', 4],
]

/* ── the season ──────────────────────────────────────────────────────────── */

const EMPTY_MONTHS = () => new Array<number>(12).fill(0)

export function eggSeason(name: string, siteKey: string | null, profile?: SpeciesProfile): EggSeason {
  const roster = rosterOf(name, siteKey)

  /* The species' own clutch size where the profile records one; a small-clutch default where
     it does not. This is the one profile figure the whole model is shaped by. */
  const ref = Number(profile?.clutch_litter_size)
  const clutchBase = Number.isFinite(ref) && ref > 0 ? ref : 4

  const females: FemaleSeason[] = roster.map((animal) => {
    /* ONE STREAM PER ANIMAL, DRAWN IN A FIXED ORDER. Insert a draw mid-sequence and every
       figure after it changes for every animal — append only. */
    const r = rng(`egg:${animal.id}`)
    const lays = r() < 0.75
    if (!lays) return { animal, clutches: 0, eggs: 0, fertile: 0, hatched: 0, last: { kind: 'none' as const } }
    const c = r()
    const clutches = c < 0.15 ? 1 : c < 0.55 ? 2 : c < 0.85 ? 3 : 4
    let eggs = 0
    for (let i = 0; i < clutches; i++) eggs += Math.max(1, Math.round(clutchBase * (0.75 + r() * 0.5)))
    const fertile = Math.min(eggs, Math.round(eggs * (0.6 + r() * 0.35)))
    const hatched = Math.min(fertile, Math.round(fertile * (0.62 + r() * 0.3)))
    const t = r()
    const last: LastSeason =
      t < 0.15
        ? { kind: 'same' }
        : t < 0.6
          ? { kind: 'up', pct: 3 + Math.round(r() * 25) }
          : { kind: 'down', pct: 3 + Math.round(r() * 19) }
    return { animal, clutches, eggs, fertile, hatched, last }
  })

  females.sort((a, b) => b.eggs - a.eggs || b.clutches - a.clutches || Number(a.animal.id) - Number(b.animal.id))

  const laid = females.reduce((n, f) => n + f.eggs, 0)
  const fertile = females.reduce((n, f) => n + f.fertile, 0)
  const hatched = females.reduce((n, f) => n + f.hatched, 0)
  const laying = females.filter((f) => f.eggs > 0).length
  const oneClutch = females.filter((f) => f.clutches === 1).length
  const twoPlus = females.filter((f) => f.clutches >= 2).length

  /* The months: parent apportioned by the season's shape, each child nested under its parent,
     so hatched ≤ fertile ≤ laid holds in every single column and each series sums exactly. */
  const weights = laid > 0 ? seasonWeights(name) : EMPTY_MONTHS()
  const laidM = laid > 0 ? apportion(laid, weights) : EMPTY_MONTHS()
  const fertileM = laid > 0 ? nestWithin(apportion(fertile, laidM), laidM) : EMPTY_MONTHS()
  const hatchedM = laid > 0 ? nestWithin(apportion(hatched, fertileM), fertileM) : EMPTY_MONTHS()

  let best = 0
  let at = 0
  for (let m = 0; m < 12; m++) {
    const s = laidM[m] + laidM[(m + 1) % 12] + laidM[(m + 2) % 12]
    if (s > best) {
      best = s
      at = m
    }
  }
  const peak = {
    label: `${MONTHS[at]}–${MONTHS[(at + 2) % 12]}`,
    pct: laid > 0 ? Math.round((best / laid) * 100) : 0,
  }

  /* The reasons. Infertile is the exact arithmetic gap; the shell losses split the other gap
     under weights jittered once per species, so two species do not read as one template. */
  const layers = females.filter((f) => f.eggs > 0)
  const attribute = (count: number, weightOf: (f: FemaleSeason) => number) => {
    const split = apportion(count, layers.map(weightOf))
    return layers
      .map((f, i) => ({ animal: f.animal, count: split[i] }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
  }
  const j = rng(`egg:reasons:${name}`)
  const shellCounts = apportion(fertile - hatched, SHELL_REASONS.map(([, w]) => w * (0.7 + j() * 0.6)))
  const reasons: DiscardReason[] = [
    { reason: 'Infertile on candling', count: laid - fertile, females: attribute(laid - fertile, (f) => f.eggs - f.fertile) },
    ...SHELL_REASONS.map(([reason], i) => ({
      reason,
      count: shellCounts[i],
      females: attribute(shellCounts[i], (f) => f.fertile - f.hatched),
    })),
  ]
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)

  const bySite = new Map<string, EggSite>()
  for (const f of females) {
    const hit = bySite.get(f.animal.siteKey)
    if (hit) hit.count++
    else bySite.set(f.animal.siteKey, { key: f.animal.siteKey, name: f.animal.siteName, count: 1 })
  }

  return {
    females,
    laid,
    fertile,
    hatched,
    died: fertile - hatched,
    laying,
    laidNothing: females.length - laying,
    oneClutch,
    twoPlus,
    months: { laid: laidM, fertile: fertileM, hatched: hatchedM },
    peak,
    reasons,
    sites: [...bySite.values()].sort((a, b) => b.count - a.count),
  }
}
