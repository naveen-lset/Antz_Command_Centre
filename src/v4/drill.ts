/**
 * The drill: Overall → Site → Species → Animal. Four levels, and no fifth.
 *
 * THE DEPTH LIMIT IS THE DESIGN, not a shortcut. A director asking "why are we down
 * 23 animals" needs exactly four answers — how many, where, which species, which
 * animal — and the fourth is a record, not another aggregate. Every level below the
 * animal (samples, doses, keeper notes) is a working screen for the person who owns
 * the animal, and putting it behind an executive KPI would turn a four-tap question
 * into an eight-tap browse.
 *
 * SITES COME FROM `exec/sites.ts` UNTOUCHED. That file already carries every module's
 * six-site split for five reporting windows, with Overall defined as the sum of its
 * rows rather than authored — so the drill's first level cannot disagree with the
 * module page it opened from. What did not exist below it is species and animals, and
 * that is what this file adds.
 *
 * Species and animal rows are DERIVED, not authored. A collection of 215,432 animals
 * across 428 species cannot be written out, and a hand-written sample would drift from
 * the site totals above it the first time either changed. Instead each site has a
 * species table with weights, and counts are apportioned from whatever the site row
 * says — so a species split always sums to its site, and a site split always sums to
 * Overall, at every window, by construction. The per-animal attributes come from a
 * seeded hash of the animal's own id, so a given animal reads the same on every visit
 * without a single row being stored.
 */

import { SITES, siteCut, type Site } from '../exec/sites'
import type { PeriodKey } from '../exec/period'

/* ── metrics that can be drilled ─────────────────────────────────────────── */

export interface DrillMetric {
  /** Key in `moduleSites`. */
  slug: string
  title: string
  /** Word after the number — "animals", "deaths". Singular-agnostic. */
  unit: string
  /** What one row at the animal level means: a member, or an event. */
  grain: 'member' | 'event'
  href: string
}

/* Titles are the module registry's, so a sheet opened from a KPI is headed the same
   thing the sidebar calls the module it came from. */
export const DRILL: Record<string, DrillMetric> = {
  animals: { slug: 'animals', title: 'Animal Population', unit: 'animals', grain: 'member', href: '#/animals' },
  health: { slug: 'health', title: 'Health & Medical', unit: 'under care', grain: 'member', href: '#/health' },
  births: { slug: 'births', title: 'Natality', unit: 'births', grain: 'event', href: '#/births' },
  mortality: { slug: 'mortality', title: 'Mortality', unit: 'deaths', grain: 'event', href: '#/mortality' },
  vaccination: { slug: 'vaccination', title: 'Vaccination', unit: 'covered', grain: 'member', href: '#/vaccination' },
  transfers: { slug: 'transfers', title: 'Animal Movement', unit: 'transfers', grain: 'event', href: '#/transfers' },
}

/* ── the species each site holds ─────────────────────────────────────────── */

interface SpeciesSeed {
  name: string
  /** Scientific class, shown under the name — the axis a curator groups by. */
  cls: string
  /** Relative share of the site's figure. Normalised at read time, so these are
      weights rather than percentages and adding a species does not require the
      others to be retyped. */
  w: number
}

/**
 * Six sites, the species they actually hold, in the proportions the collection has.
 *
 * Aquatic Halls is deliberately lopsided — one carp population is 12,400 animals and
 * the whole site is 178,400, which is why the zoo-wide total is dominated by fish. A
 * flat split across six species would make every site look the same shape and lose
 * the one fact this level exists to show.
 */
const SPECIES: Record<string, SpeciesSeed[]> = {
  aquatic: [
    { name: 'Common Carp', cls: 'Actinopterygii', w: 32 },
    { name: 'Nile Tilapia', cls: 'Actinopterygii', w: 24 },
    { name: 'Rose Shrimp', cls: 'Malacostraca', w: 18 },
    { name: 'Silver Barb', cls: 'Actinopterygii', w: 12 },
    { name: 'Blacktip Reef Shark', cls: 'Chondrichthyes', w: 6 },
    { name: 'Indian Mud Crab', cls: 'Malacostraca', w: 5 },
    { name: 'Freshwater Stingray', cls: 'Chondrichthyes', w: 3 },
  ],
  aviary: [
    { name: 'Zebra Finch', cls: 'Aves', w: 30 },
    { name: 'Indian Peafowl', cls: 'Aves', w: 20 },
    { name: 'Rock Pigeon', cls: 'Aves', w: 16 },
    { name: 'Grey Francolin', cls: 'Aves', w: 13 },
    { name: 'Painted Stork', cls: 'Aves', w: 9 },
    { name: 'Indian Skimmer', cls: 'Aves', w: 7 },
    { name: 'Sarus Crane', cls: 'Aves', w: 5 },
  ],
  savanna: [
    { name: 'Chital', cls: 'Mammalia', w: 28 },
    { name: 'Blackbuck', cls: 'Mammalia', w: 22 },
    { name: 'Sambar', cls: 'Mammalia', w: 16 },
    { name: 'Nilgai', cls: 'Mammalia', w: 13 },
    { name: 'Sangai Deer', cls: 'Mammalia', w: 9 },
    { name: 'Indian Gazelle', cls: 'Mammalia', w: 7 },
    { name: 'Wild Boar', cls: 'Mammalia', w: 5 },
  ],
  reptile: [
    { name: 'Flapshell Turtle', cls: 'Reptilia', w: 26 },
    { name: 'Indian Rock Python', cls: 'Reptilia', w: 19 },
    { name: 'Monitor Lizard', cls: 'Reptilia', w: 16 },
    { name: 'Marsh Crocodile', cls: 'Reptilia', w: 14 },
    { name: 'Star Tortoise', cls: 'Reptilia', w: 12 },
    { name: 'Malabar Pit Viper', cls: 'Reptilia', w: 8 },
    { name: 'Indian Cobra', cls: 'Reptilia', w: 5 },
  ],
  primate: [
    { name: 'Rhesus Macaque', cls: 'Mammalia', w: 30 },
    { name: 'Hanuman Langur', cls: 'Mammalia', w: 24 },
    { name: 'Bonnet Macaque', cls: 'Mammalia', w: 18 },
    { name: 'Lion-tailed Macaque', cls: 'Mammalia', w: 12 },
    { name: 'Slow Loris', cls: 'Mammalia', w: 9 },
    { name: 'Nilgiri Langur', cls: 'Mammalia', w: 7 },
  ],
  carnivore: [
    { name: 'Bengal Fox', cls: 'Mammalia', w: 26 },
    { name: 'Jungle Cat', cls: 'Mammalia', w: 21 },
    { name: 'Striped Hyena', cls: 'Mammalia', w: 17 },
    { name: 'Asiatic Lion', cls: 'Mammalia', w: 14 },
    { name: 'Fishing Cat', cls: 'Mammalia', w: 12 },
    { name: 'Indian Leopard', cls: 'Mammalia', w: 10 },
  ],
}

/* ── deterministic derivation ────────────────────────────────────────────── */

/**
 * FNV-1a over the string, then a mulberry32 draw.
 *
 * Deliberately not `Math.random`: an animal's sex, age and enclosure must be the same
 * on every render, or scrolling a list would reshuffle it and re-opening a record
 * would show a different animal under the same id.
 */
function seeded(key: string): () => number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pickFrom = <T,>(rng: () => number, xs: readonly T[]) => xs[Math.floor(rng() * xs.length)]

/**
 * Apportion a whole number across weights so the parts sum to the total exactly.
 *
 * Largest-remainder, not rounding each share independently: independent rounding of
 * six shares of 23 gives 24, and a species split that does not add up to its site is
 * the one defect that makes the whole drill unusable.
 */
function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((n, w) => n + w, 0) || 1
  const exact = weights.map((w) => (total * w) / sum)
  const base = exact.map(Math.floor)
  let left = total - base.reduce((n, v) => n + v, 0)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; left > 0 && k < order.length; k++, left--) base[order[k].i]++
  /* Any remainder past one pass — only possible with more weights than units — goes
     to the largest share, keeping the invariant rather than silently dropping units. */
  if (left > 0) base[order[0]?.i ?? 0] += left
  return base
}

/* ── level 1 · sites ─────────────────────────────────────────────────────── */

export interface SiteLevel {
  kind: 'count' | 'stock' | 'rate'
  unit: string
  overall: number
  rows: { site: Site; value: number; of?: number; percent: number }[]
}

/** The zoo-wide figure and its six sites, straight from the shared site model. */
export function sitesFor(metric: string, period: PeriodKey): SiteLevel | undefined {
  const cut = siteCut(DRILL[metric]?.slug ?? metric, period)
  if (!cut) return undefined
  return { kind: cut.kind, unit: cut.unit, overall: cut.overall, rows: cut.rows }
}

/* ── level 2 · species within a site ─────────────────────────────────────── */

export interface SpeciesRow {
  name: string
  cls: string
  value: number
  of?: number
  percent: number
}

/**
 * A site's figure split across the species it holds.
 *
 * For a rate metric the numerator and the denominator are apportioned separately,
 * then jittered against each other by a seeded ±6 points — otherwise every species in
 * a site would report the site's exact coverage, and a card whose six rows all read
 * 92% has told the reader nothing they did not already know from the row above.
 */
export function speciesFor(metric: string, siteKey: string, period: PeriodKey): SpeciesRow[] {
  const level = sitesFor(metric, period)
  const row = level?.rows.find((r) => r.site.key === siteKey)
  const seeds = SPECIES[siteKey]
  if (!level || !row || !seeds) return []

  const weights = seeds.map((s) => s.w)
  const values = apportion(Math.round(row.value), weights)

  if (level.kind === 'rate' && row.of !== undefined) {
    const ofs = apportion(Math.round(row.of), weights)
    const rng = seeded(`${metric}:${siteKey}:rate`)
    return seeds
      .map((s, i) => {
        const of = ofs[i]
        /* Nudge coverage per species, then clamp so no species can exceed its own
           herd — a numerator above its denominator would print 104%. */
        const shift = Math.round((rng() - 0.5) * 0.12 * of)
        const v = Math.max(0, Math.min(of, values[i] + shift))
        return { name: s.name, cls: s.cls, value: v, of, percent: of ? (v / of) * 100 : 0 }
      })
      .sort((a, b) => b.percent - a.percent)
  }

  const total = values.reduce((n, v) => n + v, 0) || 1
  return seeds
    .map((s, i) => ({
      name: s.name,
      cls: s.cls,
      value: values[i],
      percent: (values[i] / total) * 100,
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * The species list with NO site picked — every site's species, merged.
 *
 * The detail page shows Sites and Species at the same time rather than one behind the
 * other, so there has to be an honest answer to "which species" before a site is
 * chosen. Merging is by name, not by name-and-site: Common Carp held in two sites is
 * one species with one total, which is what a curator means by the word.
 *
 * Because each site's rows already sum to that site (`apportion` guarantees it), the
 * merged list sums to Overall — the same invariant, one level up.
 */
export function speciesForAll(metric: string, period: PeriodKey): SpeciesRow[] {
  const level = sitesFor(metric, period)
  if (!level) return []

  const rate = level.kind === 'rate'
  const merged = new Map<string, { cls: string; value: number; of: number }>()

  for (const row of level.rows) {
    for (const s of speciesFor(metric, row.site.key, period)) {
      const at = merged.get(s.name) ?? { cls: s.cls, value: 0, of: 0 }
      at.value += s.value
      at.of += s.of ?? 0
      merged.set(s.name, at)
    }
  }

  const total = [...merged.values()].reduce((n, m) => n + m.value, 0) || 1
  return [...merged.entries()]
    .map(([name, m]) => ({
      name,
      cls: m.cls,
      value: m.value,
      of: rate ? m.of : undefined,
      percent: rate ? (m.of ? (m.value / m.of) * 100 : 0) : (m.value / total) * 100,
    }))
    .sort((a, b) => (rate ? b.percent - a.percent : b.value - a.value))
}

/* ── level 3 · animals within a species ──────────────────────────────────── */

export interface AnimalRow {
  id: string
  name: string
  cls: string
  sex: 'M' | 'F' | 'U'
  age: string
  site: string
  siteKey: string
  enclosure: string
  /** What this animal is doing in this list — the metric's own state word. */
  status: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
  /** Event date, for the event-grain metrics. */
  when?: string
}

/** How many animal rows a species list shows before it stops being a list. */
export const ANIMAL_CAP = 40

const AGES_MEMBER = ['4 m', '11 m', '1 y 3 m', '2 y', '2 y 8 m', '3 y 4 m', '4 y 1 m', '5 y', '6 y 7 m', '8 y', '9 y 2 m', '11 y']
const STATUS: Record<string, { word: string; tone: AnimalRow['tone'] }[]> = {
  animals: [
    { word: 'Healthy', tone: 'good' },
    { word: 'Healthy', tone: 'good' },
    { word: 'Healthy', tone: 'good' },
    { word: 'Under care', tone: 'warn' },
    { word: 'Quarantine', tone: 'warn' },
  ],
  health: [
    { word: 'Recovering', tone: 'good' },
    { word: 'Stable', tone: 'neutral' },
    { word: 'Treatment', tone: 'warn' },
    { word: 'Critical', tone: 'bad' },
  ],
  vaccination: [
    { word: 'Covered', tone: 'good' },
    { word: 'Covered', tone: 'good' },
    { word: 'Due', tone: 'warn' },
    { word: 'Overdue', tone: 'bad' },
  ],
  births: [
    { word: 'Live birth', tone: 'good' },
    { word: 'Live birth', tone: 'good' },
    { word: 'Hand-reared', tone: 'warn' },
  ],
  mortality: [
    { word: 'Necropsy done', tone: 'neutral' },
    { word: 'Necropsy due', tone: 'bad' },
    { word: 'Cause confirmed', tone: 'neutral' },
  ],
  transfers: [
    { word: 'Outward', tone: 'neutral' },
    { word: 'Inward', tone: 'good' },
    { word: 'Internal', tone: 'neutral' },
  ],
}

const DAYS = ['01', '03', '05', '08', '11', '14', '17', '20', '23', '26', '29', '31']

/** One animal, derived from the bucket it belongs to. Deterministic in `i`. */
function animalAt(metric: string, siteKey: string, species: string, cls: string, i: number): AnimalRow {
  const site = SITES.find((s) => s.key === siteKey)!
  const id = `ANM-${String(10000 + (Math.abs(hash(`${siteKey}:${species}:${i}`)) % 89999))}`
  const rng = seeded(id)
  const state = pickFrom(rng, STATUS[metric] ?? STATUS.animals)
  return {
    id,
    name: species,
    cls,
    /* Aquatic and invertebrate stock is largely unsexed, which is a fact about the
       collection rather than missing data — the Animal Population page says the same
       thing with its 180,348 Undetermined. */
    sex: (cls === 'Actinopterygii' || cls === 'Malacostraca' || cls === 'Chondrichthyes'
      ? rng() < 0.88
        ? 'U'
        : rng() < 0.5
          ? 'M'
          : 'F'
      : rng() < 0.5
        ? 'M'
        : 'F') as AnimalRow['sex'],
    age: pickFrom(rng, AGES_MEMBER),
    site: site.name,
    siteKey,
    enclosure: `${site.code}-${String(1 + Math.floor(rng() * site.enclosures)).padStart(2, '0')}`,
    status: state.word,
    tone: state.tone,
    when: DRILL[metric]?.grain === 'event' ? `${pickFrom(rng, DAYS)} Jul` : undefined,
  }
}

/**
 * The animals behind whatever is currently selected.
 *
 * BOTH FACETS ARE OPTIONAL, and that is what lets the detail page show Sites, Species
 * and Animals at once instead of one behind the other. With neither set the list is a
 * cross-site, cross-species sample of the metric; with a site set it is that site;
 * with both it is one species in one site.
 *
 * Capped at forty. Twelve thousand carp is a true number and an unreadable list, and a
 * scroll that never ends is not a drill-down, it is a database export. `total` is
 * always the real figure so the caller can state the cap against it — the reader is
 * never told forty is all there is.
 *
 * The sample is drawn PROPORTIONALLY across the matching buckets rather than taking
 * the first forty of the largest one: an unfiltered list that is forty carp would
 * imply the collection is only carp, which is roughly true by count and useless as an
 * answer to "show me the animals".
 */
export function animalsFor(
  metric: string,
  period: PeriodKey,
  siteKey?: string,
  species?: string,
): { rows: AnimalRow[]; total: number } {
  const level = sitesFor(metric, period)
  if (!level) return { rows: [], total: 0 }

  /* Every (site, species) bucket the facets allow, with its real count. */
  const buckets = level.rows
    .filter((r) => (siteKey ? r.site.key === siteKey : true) && r.value > 0)
    .flatMap((r) =>
      speciesFor(metric, r.site.key, period)
        .filter((s) => (species ? s.name === species : true) && s.value > 0)
        .map((s) => ({ siteKey: r.site.key, species: s.name, cls: s.cls, count: s.value })),
    )

  const total = buckets.reduce((n, b) => n + b.count, 0)
  if (total === 0) return { rows: [], total: 0 }

  const shown = Math.min(total, ANIMAL_CAP)
  const take = apportion(
    shown,
    buckets.map((b) => b.count),
  )

  const rows = buckets.flatMap((b, bi) =>
    Array.from({ length: Math.min(take[bi], b.count) }, (_, i) =>
      animalAt(metric, b.siteKey, b.species, b.cls, i),
    ),
  )

  return { rows, total }
}

function hash(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h | 0
}

/* ── level 4 · one animal ────────────────────────────────────────────────── */

export interface AnimalRecord extends AnimalRow {
  accession: string
  origin: string
  weight: string
  lastExam: string
  vaccination: string
  deworming: string
  welfare: string
  /** The animal's own recent line, newest first. */
  timeline: { when: string; label: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }[]
}

const ORIGINS = [
  'Captive born · Jamnagar',
  'Rescue · Gujarat Forest Dept',
  'Transfer · Junagadh Zoo',
  'Confiscation · Customs',
  'Transfer · Bharatpur',
  'Captive born · Jamnagar',
]

const EVENTS = [
  { label: 'Routine health check', sub: 'No findings', tone: 'good' as const },
  { label: 'Weight recorded', sub: 'Within band', tone: 'good' as const },
  { label: 'Vaccination administered', sub: 'Annual booster', tone: 'good' as const },
  { label: 'Deworming administered', sub: 'Ivermectin', tone: 'good' as const },
  { label: 'Enclosure move', sub: 'Group management', tone: undefined },
  { label: 'Faecal sample sent', sub: 'Parasitology', tone: undefined },
  { label: 'Clinical note added', sub: 'Reduced appetite', tone: 'warn' as const },
  { label: 'Welfare observation', sub: 'Five domains scan', tone: undefined },
]

const DATES = ['31 Jul', '24 Jul', '18 Jul', '11 Jul', '02 Jul', '26 Jun', '14 Jun', '03 Jun']

/**
 * The bottom of the drill — one animal, and no link out of it except back.
 *
 * Everything here is derived from the id, so a record is reachable from any path that
 * knows the id: an alert row, a species list, or a search. The record does not have to
 * exist anywhere for two routes into it to agree.
 */
export function animalRecord(row: AnimalRow): AnimalRecord {
  const rng = seeded(`${row.id}:record`)
  const heavy = row.cls === 'Mammalia'
  const weight = heavy
    ? `${(8 + rng() * 180).toFixed(1)} kg`
    : row.cls === 'Aves'
      ? `${(0.2 + rng() * 6).toFixed(2)} kg`
      : `${(0.05 + rng() * 12).toFixed(2)} kg`

  const n = 4 + Math.floor(rng() * 3)
  const used = new Set<number>()
  const timeline = Array.from({ length: n }, (_, i) => {
    let k = Math.floor(rng() * EVENTS.length)
    while (used.has(k) && used.size < EVENTS.length) k = (k + 1) % EVENTS.length
    used.add(k)
    return { when: DATES[i], ...EVENTS[k] }
  })

  return {
    ...row,
    accession: `ACC-${String(2019 + Math.floor(rng() * 6))}-${String(100 + Math.floor(rng() * 899))}`,
    origin: pickFrom(rng, ORIGINS),
    weight,
    lastExam: pickFrom(rng, DATES),
    vaccination: rng() < 0.82 ? 'Current' : 'Due',
    deworming: rng() < 0.76 ? 'Current' : 'Due',
    welfare: `${(4 + rng()).toFixed(1)} / 5`,
    timeline,
  }
}

/**
 * An animal reachable by id alone — the path an alert row takes.
 *
 * An alert names an animal without naming the species list it came from, so the
 * record has to be derivable from the id plus whatever the alert already knows.
 */
export function animalFromId(id: string, name: string, where: string): AnimalRecord {
  const [siteName, enclosure] = where.split(' · ')
  const site = SITES.find((s) => s.name === siteName)
  const rng = seeded(id)
  return animalRecord({
    id,
    name,
    cls: site?.key === 'aquatic' ? 'Actinopterygii' : site?.key === 'aviary' ? 'Aves' : 'Mammalia',
    sex: rng() < 0.5 ? 'M' : 'F',
    age: pickFrom(rng, AGES_MEMBER),
    site: siteName ?? 'Jamnagar Zoo',
    siteKey: site?.key ?? 'savanna',
    enclosure: enclosure ?? `${site?.code ?? 'SV'}-01`,
    status: 'Under care',
    tone: 'warn',
  })
}
