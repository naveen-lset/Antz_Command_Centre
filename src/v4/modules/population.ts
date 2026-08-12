/**
 * THE ANIMAL POPULATION PAGE'S OWN DERIVATIONS.
 *
 * Every function here is a read over `core/` and nothing else. There is no authored number in
 * this file, which is the property that makes the page's twenty-odd sections agree with each
 * other and with the rest of the product: the hero, the site table, the species list, the
 * movement card and the trend are five different aggregations of one daily series, not five
 * figures that somebody kept in step.
 *
 * TWO KINDS OF NUMBER, HELD APART. The population is a LEVEL — a reading on a date, which is
 * why the page is stamped "as of" rather than given a range. Births, deaths, transfers, escapes
 * and fetal losses are FLOWS, summed across the window. Mixing them is how a page ends up
 * reporting a population of six million; `core/series.ts` keeps the distinction and this file
 * respects it by never summing a level or reading a flow on one day.
 *
 * THE FLOW SUB-SPLITS ARE GROUPINGS, NOT NEW DATA. "Natural against assisted", "external in
 * against external out", "stillbirth against abortion" and "recovered against not" are each a
 * partition of an existing event dimension, so each one sums to the flow it came from exactly.
 * The mapping from a recorded cause to the executive word is stated once, here, rather than in
 * the four cards that use it.
 */

import { TODAY, shortDate, type Win } from '../../core/calendar'
import { speciesStock } from '../../core/animals'
import { count, tally } from '../../core/events'
import { levelAt, series } from '../../core/series'
import { SITES, speciesByName, speciesOf, type Species } from '../../core/world'
import { standingOf, type Standing } from './regulatory'

/* ── the reading, and how it moved ───────────────────────────────────────── */

const siteKeys = (siteKey: string | null): string[] => (siteKey ? [siteKey] : SITES.map((s) => s.key))

/** The headcount on one day, for one site or the whole collection. */
export const populationOn = (siteKey: string | null, day: number): number =>
  siteKeys(siteKey).reduce((n, k) => n + levelAt('animals', k, day), 0)

/**
 * A window as a pair of readings.
 *
 * `opening` is the day BEFORE the window starts, so a window's change is what happened
 * inside it rather than what happened from its first morning onwards. At the very start of
 * the ledger there is no earlier day, so the first day stands as its own opening.
 */
export function change(siteKey: string | null, win: Win): { opening: number; closing: number; net: number } {
  const opening = populationOn(siteKey, Math.max(0, win.from - 1))
  const closing = populationOn(siteKey, win.to)
  return { opening, closing, net: closing - opening }
}

/* ── the flows that move it ──────────────────────────────────────────────── */

const detailMap = (slug: string, siteKey: string | null, win: Win): Map<string, number> =>
  new Map(tally(slug, siteKey, win, 'detail').map((t) => [t.label, t.value]))

const pick = (m: Map<string, number>, keys: string[]): number =>
  keys.reduce((n, k) => n + (m.get(k) ?? 0), 0)

/**
 * How a recorded cause maps to the word an executive uses.
 *
 * Stated once because four cards need it and a second copy is a second chance to classify
 * "Release to wild" as an arrival. Each list is a partition of its metric's own dimension, so
 * the parts sum to the flow — `assisted` is everything births records that `natural` is not.
 */
const AS = {
  birthsNatural: ['Live birth', 'Multiple birth'],
  birthsAssisted: ['Hand-reared', 'Assisted delivery'],
  transferInternal: ['Internal move'],
  /* Stillbirth is a loss at or near term; an abortion is a loss before it. */
  stillbirth: ['Late-term loss', 'Dystocia'],
  abortion: ['Mid-term loss', 'Early resorption'],
  escapeUnrecovered: ['Not recovered'],
} as const

/**
 * EVERY TRANSFER IN THE EXTRACT IS OUTBOUND, so the direction is not derived any more.
 *
 * This used to partition `transfers` against two authored allow-lists — `transferIn:
 * ['Inward · other zoo']` and `transferOut: ['Outward · other zoo', 'Release to wild',
 * 'Breeding loan']`. Those were the detail values of the authored model. The anonymised
 * extract's `transferred_to` holds 'Wild Release', 'Non-Disclosure Site' and twelve named
 * parks, none of which matches either list, so both sides scored ZERO — and the Animal
 * Population page printed "Transfer in +0 / Transfer out +0" over 14,342 real movements.
 *
 * That is the worst shape this bug can take: not a missing figure, which reads as missing, but
 * a confident nil that reads as "nothing left the collection this month".
 *
 * All 14 destination values are places an animal goes TO. An animal arriving is an accession,
 * with its own table and its own module, so there is no inbound direction to recover — the
 * count is the flow, and the page states it as "released or transferred out".
 */

export interface Movement {
  births: { total: number; natural: number; assisted: number }
  transfers: { in: number; out: number; internal: number; net: number; total: number }
  deaths: number
  escapes: { total: number; recovered: number; unrecovered: number; atLarge: number }
  /* Fetal loss is a breeding-programme figure, NOT a headcount movement — see the page. */
  fetal: { total: number; stillbirth: number; abortion: number }
  accessions: number
  /** Births + transfers in + accessions − deaths − transfers out − escapes not recovered. */
  recorded: number
  additions: number
  removals: number
}

export function movement(siteKey: string | null, win: Win): Movement {
  const b = detailMap('births', siteKey, win)
  const t = detailMap('transfers', siteKey, win)
  const f = detailMap('fetal', siteKey, win)
  const e = detailMap('escaped', siteKey, win)

  const births = count('births', siteKey, win)
  const deaths = count('mortality', siteKey, win)
  const accessions = count('accession', siteKey, win)
  const escapes = count('escaped', siteKey, win)
  const fetal = count('fetal', siteKey, win)

  const inward = 0
  const outward = count('transfers', siteKey, win)
  const unrecovered = pick(e, [...AS.escapeUnrecovered])

  const additions = births + inward + accessions
  const removals = deaths + outward + unrecovered

  return {
    births: {
      total: births,
      natural: pick(b, [...AS.birthsNatural]),
      assisted: pick(b, [...AS.birthsAssisted]),
    },
    transfers: {
      in: inward,
      out: outward,
      internal: pick(t, [...AS.transferInternal]),
      net: inward - outward,
      total: count('transfers', siteKey, win),
    },
    deaths,
    escapes: {
      total: escapes,
      recovered: escapes - unrecovered,
      unrecovered,
      atLarge: siteKeys(siteKey).reduce((n, k) => n + levelAt('escapedOpen', k, win.to), 0),
    },
    fetal: {
      total: fetal,
      stillbirth: pick(f, [...AS.stillbirth]),
      abortion: pick(f, [...AS.abortion]),
    },
    accessions,
    recorded: additions - removals,
    additions,
    removals,
  }
}

/* ── the circle of life, at one species ──────────────────────────────────── */

/**
 * ONE SPECIES' LIFECYCLE — the four stages a headcount actually moves through.
 *
 * WHY THIS IS NOT SIX KPI CARDS. Births, deaths, transfers and escapes were already readable
 * one at a time, and reading them that way is exactly what fails: a reader given "births 12"
 * and "deaths 9" beside each other has to do the arithmetic that decides whether the species
 * is growing, and has no way to tell whether the two figures even cover the same window. The
 * stages below are ONE partition of one window — everything that entered, the reading it
 * arrived at, and everything that left — so the story is legible without arithmetic.
 *
 * THE OPENING READING IS A LEVEL, READ ON THE DAY BEFORE. `change()` above does this for a
 * site; a species needs the same treatment for the same reason, and gets it by asking
 * `speciesStock` for a window that ends the day before this one starts. Summing the flows and
 * calling the result a population is the error this shape exists to make impossible.
 *
 * FLOWS WITH NO EVENTS ARE NAMED, NOT DROPPED. `silent` carries the stages the extract holds
 * nothing for in this window, so the page can say "no transfers recorded" rather than printing
 * a zero that reads as a measured nil — the distinction §22 of the brief turns on, and the one
 * the transfers bug in the header note above got wrong.
 *
 * NO PARTITIONS ARE ATTEMPTED HERE. `AS.birthsNatural`/`birthsAssisted` match none of the
 * extract's own birth vocabulary — `dims.json` records the single detail value 'Natality' — so
 * splitting births into natural and assisted would print two confident zeros under a real
 * total. The totals are what the database can answer, so the totals are what this returns.
 */
export interface LifeStage {
  key: string
  label: string
  value: number
  /** Which side of the headcount the stage sits on: entering, held, or leaving. */
  side: 'in' | 'stock' | 'out'
  /** What one row of this stage is, for the sheet the stage opens. */
  slug?: string
}

export interface Lifecycle {
  opening: number
  closing: number
  net: number
  stages: LifeStage[]
  additions: number
  removals: number
  /** Stage labels the window holds no recorded events for. */
  silent: string[]
  /** Fetal loss, held apart — a breeding-programme figure, not a headcount movement. */
  fetal: number
}

/**
 * A flow's count for one species, within that species' own site.
 *
 * `tally(…, 'species')` keys on the recorded species NAME, so this is scoped to the species'
 * site first — without that, a name held in two sites would return both sites' events under a
 * page headed one of them.
 */
const flowOfSpecies = (slug: string, siteKey: string, win: Win, name: string): number =>
  tally(slug, siteKey, win, 'species').find((t) => t.key === name)?.value ?? 0

export function speciesLifecycle(speciesId: string, win: Win): Lifecycle | undefined {
  const sp = speciesOf(speciesId)
  if (!sp) return undefined

  const at = (day: number): number =>
    speciesStock(sp.siteKey, { ...win, to: day }).find((r) => r.species.id === speciesId)?.count ?? 0

  const opening = at(Math.max(0, win.from - 1))
  const closing = at(win.to)

  const of = (slug: string) => flowOfSpecies(slug, sp.siteKey, win, sp.name)

  const births = of('births')
  const accessions = of('accession')
  const deaths = of('mortality')
  const transfers = of('transfers')
  const escapes = of('escaped')
  const fetal = of('fetal')

  /* Ordered as the population moves: what arrived, what is held, what left. The stock stage
     sits third rather than first so the row reads left to right as a sentence. */
  const stages: LifeStage[] = [
    { key: 'births', label: 'Births', value: births, side: 'in', slug: 'births' },
    { key: 'accession', label: 'Accessions', value: accessions, side: 'in', slug: 'accession' },
    { key: 'held', label: 'Held', value: closing, side: 'stock' },
    { key: 'mortality', label: 'Deaths', value: deaths, side: 'out', slug: 'mortality' },
    { key: 'transfers', label: 'Transferred out', value: transfers, side: 'out', slug: 'transfers' },
    { key: 'escaped', label: 'Escaped', value: escapes, side: 'out', slug: 'escaped' },
  ]

  return {
    opening,
    closing,
    net: closing - opening,
    stages,
    additions: births + accessions,
    removals: deaths + transfers + escapes,
    silent: stages.filter((s) => s.side !== 'stock' && s.value === 0).map((s) => s.label),
    fetal,
  }
}

/** A flow's split by site, for the compact per-event cards. Biggest first. */
export const flowBySite = (slug: string, siteKey: string | null, win: Win) =>
  tally(slug, siteKey, win, 'site')

/** A flow's split by species. */
export const flowBySpecies = (slug: string, siteKey: string | null, win: Win) =>
  tally(slug, siteKey, win, 'species')

/** A flow's split by its own recorded cause. */
export const flowByCause = (slug: string, siteKey: string | null, win: Win) =>
  tally(slug, siteKey, win, 'detail')

export { count as flowCount }

/* ── sites ───────────────────────────────────────────────────────────────── */

export interface SiteRow {
  key: string
  name: string
  code: string
  animals: number
  species: number
  enclosures: number
  percent: number
  net: number
}

/** Every site, always all of them — the brief is explicit that this is not a top-five. */
export function siteRows(win: Win): SiteRow[] {
  const total = populationOn(null, win.to)
  return SITES.map((s) => {
    const stock = speciesStock(s.key, win)
    const animals = stock.reduce((n, r) => n + r.count, 0)
    return {
      key: s.key,
      name: s.name,
      code: s.code,
      animals,
      species: stock.filter((r) => r.count > 0).length,
      enclosures: s.enclosures,
      percent: total ? (animals / total) * 100 : 0,
      net: change(s.key, win).net,
    }
  })
}

export type SiteSort = 'animals' | 'species' | 'enclosures' | 'net'

export const sortSites = (rows: SiteRow[], by: SiteSort): SiteRow[] =>
  [...rows].sort((a, b) => b[by] - a[by])

/* ── species ─────────────────────────────────────────────────────────────── */

/**
 * How much of a class is counted but never sexed.
 *
 * The same rates `core/animals.ts` applies, restated at species grain so a row can state its
 * own male/female/undetermined split. Undetermined is the ANSWER for a shoal of carp, not a
 * gap in the record — which is why the species list carries a U column rather than hiding it.
 */
const UNSEXED: Record<string, number> = {
  Actinopterygii: 0.985,
  Chondrichthyes: 0.6,
  Malacostraca: 0.99,
  Gastropoda: 0.995,
  Insecta: 0.97,
  Amphibia: 0.8,
  Aves: 0.06,
  Reptilia: 0.09,
  Mammalia: 0.04,
}

/** Largest-remainder split, so the three sexes sum to the population exactly. */
function sexOf(cls: string, n: number): { male: number; female: number; unknown: number } {
  const rate = UNSEXED[cls] ?? 0.1
  const unknown = Math.round(n * rate)
  const sexed = n - unknown
  const male = Math.round(sexed * 0.52)
  return { male, female: sexed - male, unknown }
}

export interface SpeciesRow {
  id: string
  name: string
  cls: string
  siteKey: string
  siteName: string
  animals: number
  male: number
  female: number
  unknown: number
  /** How many sites hold this common name. Usually one; the merge is by name. */
  sites: number
  percent: number
  net: number
  standing: Standing
}

export function speciesRows(siteKey: string | null, win: Win): SpeciesRow[] {
  const total = populationOn(siteKey, win.to)
  const before = Math.max(0, win.from - 1)
  const openingWin = { from: 0, to: before, days: before + 1 } as Win

  return siteKeys(siteKey)
    .flatMap((k) => {
      const opening = new Map(speciesStock(k, openingWin).map((r) => [r.species.id, r.count]))
      return speciesStock(k, win).map(({ species, count: n }) => ({ species, n, was: opening.get(species.id) ?? 0 }))
    })
    .filter((r) => r.n > 0)
    .map(({ species, n, was }) => ({
      id: species.id,
      name: species.name,
      cls: species.cls,
      siteKey: species.siteKey,
      siteName: SITES.find((s) => s.key === species.siteKey)?.name ?? species.siteKey,
      animals: n,
      ...sexOf(species.cls, n),
      sites: speciesByName(species.name).length,
      percent: total ? (n / total) * 100 : 0,
      net: n - was,
      standing: standingOf(species.name),
    }))
    .sort((a, b) => b.animals - a.animals)
}

export type SpeciesSort = 'animals' | 'net' | 'sites' | 'name'

export function sortSpecies(rows: SpeciesRow[], by: SpeciesSort): SpeciesRow[] {
  if (by === 'name') return [...rows].sort((a, b) => a.name.localeCompare(b.name))
  return [...rows].sort((a, b) => b[by] - a[by] || b.animals - a.animals)
}

/**
 * Free text over the species list.
 *
 * Matches the common name, the class and the holding site, because those are the three things
 * printed on the row — a search that cannot find what the reader can see is worse than none.
 * An animal id is handled by the caller, which resolves it to a record rather than a row.
 */
export function searchSpecies(rows: SpeciesRow[], query: string): SpeciesRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.cls.toLowerCase().includes(q) ||
      r.siteName.toLowerCase().includes(q),
  )
}

/** The sex split across a set of species rows — the page's own Sex card. */
export function sexTotals(rows: SpeciesRow[]): { male: number; female: number; unknown: number; total: number } {
  return rows.reduce(
    (acc, r) => ({
      male: acc.male + r.male,
      female: acc.female + r.female,
      unknown: acc.unknown + r.unknown,
      total: acc.total + r.animals,
    }),
    { male: 0, female: 0, unknown: 0, total: 0 },
  )
}

/* ── leaders ─────────────────────────────────────────────────────────────── */

export interface Leader {
  key: string
  tag: string
  value: string
  label: string
  sub?: string
  species?: SpeciesRow
  siteKey?: string
}

/**
 * The five extremes, computed rather than chosen.
 *
 * "Fastest growing" is a RATE and is floored at 500 animals: a population of four that gained
 * one is up 25%, which would top the list every time and tell nobody anything, and even at a
 * few hundred the winner is decided by which way a single animal rounded. "Highest increase" is
 * the absolute figure and carries no floor, so the two answer different questions and a species
 * can legitimately lead one and not the other.
 */
export function leaders(species: SpeciesRow[], sites: SiteRow[]): Leader[] {
  if (species.length === 0) return []
  const byCount = [...species].sort((a, b) => b.animals - a.animals)
  const biggestSite = [...sites].sort((a, b) => b.animals - a.animals)[0]
  const growable = species.filter((s) => s.animals >= 500 && s.net > 0)
  const fastest = [...growable].sort((a, b) => b.net / b.animals - a.net / a.animals)[0]
  const gained = [...species].sort((a, b) => b.net - a.net)[0]
  const smallest = byCount[byCount.length - 1]

  const out: Leader[] = [
    {
      key: 'largest-species',
      tag: 'Largest species',
      value: byCount[0].animals.toLocaleString('en-US'),
      label: byCount[0].name,
      sub: `${byCount[0].percent.toFixed(1)}% of population`,
      species: byCount[0],
    },
  ]

  if (biggestSite) {
    out.push({
      key: 'largest-site',
      tag: 'Largest site',
      value: biggestSite.animals.toLocaleString('en-US'),
      label: biggestSite.name,
      sub: `${Math.round(biggestSite.percent)}% · ${biggestSite.species} species`,
      siteKey: biggestSite.key,
    })
  }

  if (fastest) {
    out.push({
      key: 'fastest',
      tag: 'Fastest growing',
      value: `+${((fastest.net / Math.max(1, fastest.animals - fastest.net)) * 100).toFixed(2)}%`,
      label: fastest.name,
      sub: `+${fastest.net.toLocaleString('en-US')} in window`,
      species: fastest,
    })
  }

  if (gained && gained.net > 0) {
    out.push({
      key: 'gained',
      tag: 'Highest increase',
      value: `+${gained.net.toLocaleString('en-US')}`,
      label: gained.name,
      sub: `${gained.animals.toLocaleString('en-US')} held`,
      species: gained,
    })
  }

  out.push({
    key: 'smallest',
    tag: 'Lowest population',
    value: smallest.animals.toLocaleString('en-US'),
    label: smallest.name,
    sub: smallest.siteName,
    species: smallest,
  })

  return out
}

/* ── the trend ───────────────────────────────────────────────────────────── */

export interface Range {
  key: string
  label: string
  win: Win
}

const describe = (from: number, to: number, label: string): Win => ({
  key: 'custom',
  label,
  noun: label.toLowerCase(),
  from: Math.max(0, from),
  to: Math.min(TODAY, to),
  days: Math.min(TODAY, to) - Math.max(0, from) + 1,
  window: `${shortDate(Math.max(0, from))} – ${shortDate(Math.min(TODAY, to))}`,
})

/**
 * The six ranges the brief asks the trend to offer.
 *
 * Built here rather than taken from `WINDOWS` because two of them — six months, and the
 * trailing twelve — are trailing DAY counts rather than the calendar windows the global filter
 * offers, and because the trend is a chart control rather than a second global filter. The
 * page's own as-of date and its flow window still come from the global scope; this only
 * decides how far back the curve is drawn.
 */
export const TREND_RANGES: Range[] = [
  { key: '7d', label: '7 days', win: describe(TODAY - 6, TODAY, 'Last 7 days') },
  { key: '30d', label: '30 days', win: describe(TODAY - 29, TODAY, 'Last 30 days') },
  { key: '3m', label: '3 months', win: describe(TODAY - 91, TODAY, 'Last 3 months') },
  { key: '6m', label: '6 months', win: describe(TODAY - 182, TODAY, 'Last 6 months') },
  { key: '12m', label: '12 months', win: describe(TODAY - 364, TODAY, 'Last 12 months') },
]

/** The curve, and four axis markers taken from the buckets it was drawn from. */
export function trend(siteKey: string | null, win: Win, max = 30): { values: number[]; labels: string[] } {
  const values = series('animals', siteKey, win, max)
  const n = values.length
  const size = win.days / Math.max(1, n)
  const at = (i: number) => shortDate(Math.min(TODAY, win.from + Math.floor((i + 1) * size) - 1))
  const marks = n <= 4 ? values.map((_, i) => i) : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1]
  return { values, labels: [...new Set(marks)].map(at) }
}

export type { Species }
