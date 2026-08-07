/**
 * ANIMAL IDENTITY — 215,432 animals, no registry.
 *
 * THE ID CARRIES THE ANIMAL'S POSITION IN THE COLLECTION. `ANM-AQ03-00142` is the 142nd
 * animal of the fourth species held in Aquatic Halls, and that is all `animalById` needs
 * to reconstruct the whole record. So an animal reached from a species list, from an
 * alert, from a lab sample, from a search result or from a pasted URL is the same animal
 * with the same sex, the same enclosure and the same birthday — without a single row being
 * stored, and without the four paths having to agree by convention.
 *
 * The alternative was a materialised registry, which fails at this size for a boring
 * reason: four fifths of the collection is fish, and 178,400 objects to answer "show me
 * the carp" is a quarter of a second of allocation for a list that shows twenty rows.
 *
 * AGGREGATES NEVER COME FROM COUNTING A LIST. A species list is a page of a population,
 * so counting "under care" rows in the visible twenty and printing it as the caseload
 * would be wrong by three orders of magnitude. Every figure comes from `series.ts` and
 * every list is explicitly a page of a stated total. This is the one rule that keeps a
 * derived list and an authored figure from contradicting each other.
 */

import { TODAY, WORLD_TODAY, dateAt, indexOf, longDate, type Win } from './calendar'
import { apportion, between, draw, pickBy, rng } from './seed'
import { levelAt } from './series'
import {
  SITES,
  SPECIES,
  housingIn,
  siteOf,
  speciesIn,
  speciesOf,
  type ClassName,
  type Species,
} from './world'

/* ── population, apportioned down the hierarchy ───────────────────────────── */

/**
 * How many animals a site holds on the window's last day, and how that splits by species.
 *
 * `apportion` guarantees the species rows sum to the site row exactly, and because every
 * site is apportioned the same way, the species rows sum to the collection too. The
 * invariant holds at every window without being checked at any call site.
 */
export function speciesStock(siteKey: string, win: Win): { species: Species; count: number }[] {
  const list = speciesIn(siteKey)
  const total = levelAt('animals', siteKey, win.to)
  const counts = apportion(total, list.map((s) => s.weight))
  return list.map((species, i) => ({ species, count: counts[i] }))
}

export function stockOfSpecies(speciesId: string, win: Win): number {
  const sp = speciesOf(speciesId)
  if (!sp) return 0
  return speciesStock(sp.siteKey, win).find((r) => r.species.id === speciesId)?.count ?? 0
}

/* ── sex ─────────────────────────────────────────────────────────────────── */

export type Sex = 'M' | 'F' | 'U'

/**
 * How much of a class is recorded as undetermined.
 *
 * This is a fact about the collection rather than missing data: shoaling fish and
 * invertebrates are counted, not sexed, and it is the reason the population's sex split is
 * dominated by "Undetermined". The home screen used to state that split as three typed
 * numbers; it is now derived from these rates, so it moves with the population instead of
 * being a caption that used to be true.
 */
const UNSEXED: Record<ClassName, number> = {
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

export interface SexSplit {
  male: number
  female: number
  undetermined: number
}

/** The sex split over any set of species populations, apportioned so the parts sum. */
export function sexSplit(rows: { species: Species; count: number }[]): SexSplit {
  let male = 0
  let female = 0
  let undetermined = 0
  for (const { species, count } of rows) {
    const rate = UNSEXED[species.cls] ?? 0.1
    const [u, sexed] = apportion(count, [rate, 1 - rate])
    /* Slightly male-skewed, as captive collections with surplus males tend to be. */
    const [m, f] = apportion(sexed, [52, 48])
    undetermined += u
    male += m
    female += f
  }
  return { male, female, undetermined }
}

/** The whole collection's split, or one site's. */
export function sexSplitFor(siteKey: string | null, win: Win): SexSplit {
  const keys = siteKey ? [siteKey] : SITES.map((s) => s.key)
  return sexSplit(keys.flatMap((k) => speciesStock(k, win)))
}

/* ── ids ─────────────────────────────────────────────────────────────────── */

/** Ordinal of a species within its own site — the two digits in the id. */
const ordinalOf = (sp: Species): number => speciesIn(sp.siteKey).findIndex((s) => s.id === sp.id)

/**
 * `ANM-AQ03-00142`. The site code and the species ordinal are what make the id decodable;
 * the sequence number is the animal's place in its own population.
 */
export function animalId(speciesId: string, n: number): string {
  const sp = speciesOf(speciesId)
  if (!sp) return `ANM-XX00-${String(n).padStart(5, '0')}`
  const site = siteOf(sp.siteKey)!
  return `ANM-${site.code}${String(ordinalOf(sp)).padStart(2, '0')}-${String(n).padStart(5, '0')}`
}

export interface AnimalKey {
  speciesId: string
  n: number
}

export function decodeAnimalId(id: string): AnimalKey | undefined {
  const m = /^ANM-([A-Z]{2})(\d{2})-(\d+)$/.exec(id.trim().toUpperCase())
  if (!m) return undefined
  const site = SITES.find((s) => s.code === m[1])
  if (!site) return undefined
  const sp = speciesIn(site.key)[Number(m[2])]
  if (!sp) return undefined
  return { speciesId: sp.id, n: Number(m[3]) }
}

/* ── one animal ──────────────────────────────────────────────────────────── */

export type AnimalStatus = 'Healthy' | 'Under care' | 'Quarantine' | 'Critical'

export interface Animal {
  id: string
  /** Where a keeper's own name for the animal exists. Not every fish has one. */
  callName?: string
  speciesId: string
  speciesName: string
  cls: ClassName
  siteKey: string
  siteName: string
  enclosureId: string
  sex: Sex
  /** Ledger index of birth or arrival. */
  bornOn: number
  /** Rendered from `bornOn` against the world clock — never stored, so it cannot go stale. */
  age: string
  status: AnimalStatus
  accession: string
  origin: string
  weight: string
  /** Ledger index. */
  lastExam: number
  vaccinated: boolean
  dewormed: boolean
  welfare: number
}

const ORIGINS = [
  'Captive born · Jamnagar',
  'Captive born · Jamnagar',
  'Rescue · Gujarat Forest Department',
  'Transfer · Junagadh Zoo',
  'Confiscation · Customs',
  'Transfer · Bharatpur',
  'Rescue · Coastal patrol',
]

/** Named animals are a mammal-and-bird habit. A carp is a number, honestly. */
const CALL_NAMES = [
  'Leo', 'Raja', 'Rani', 'Moti', 'Kesar', 'Shera', 'Gauri', 'Bhola', 'Chotu', 'Laxmi',
  'Veer', 'Sundari', 'Bahadur', 'Champa', 'Tara', 'Arjun', 'Meghna', 'Kaali', 'Sona', 'Baadal',
]

/** Longevity by class, in years — what makes an age plausible rather than uniform. */
const LIFESPAN: Record<ClassName, number> = {
  Mammalia: 18,
  Aves: 14,
  Reptilia: 22,
  Amphibia: 8,
  Actinopterygii: 6,
  Chondrichthyes: 16,
  Malacostraca: 3,
  Insecta: 1,
  Gastropoda: 4,
}

function ageFrom(bornOn: number): string {
  const born = dateAt(bornOn)
  let months =
    (WORLD_TODAY.getFullYear() - born.getFullYear()) * 12 + (WORLD_TODAY.getMonth() - born.getMonth())
  if (WORLD_TODAY.getDate() < born.getDate()) months--
  months = Math.max(0, months)
  if (months < 1) return `${TODAY - bornOn} d`
  if (months < 24) return `${months} m`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m ? `${y} y ${m} m` : `${y} y`
}

/**
 * The animal at one position in its species.
 *
 * Everything is a pure function of the id. `status` is drawn against the caseload rates the
 * metric layer reports for the species' own site, so a population where 41 of 178,400 are
 * under care yields lists where under-care animals are correspondingly rare — the list and
 * the caseload figure tell the same story without the list being counted to produce it.
 */
export function animalAt(speciesId: string, n: number): Animal | undefined {
  const sp = speciesOf(speciesId)
  if (!sp) return undefined
  const site = siteOf(sp.siteKey)!
  const id = animalId(speciesId, n)
  const r = rng(id)

  const rate = UNSEXED[sp.cls] ?? 0.1
  const sex: Sex = r() < rate ? 'U' : r() < 0.52 ? 'M' : 'F'

  const span = LIFESPAN[sp.cls] ?? 10
  /* Squared draw so most animals are young — the shape of a breeding collection. */
  const bornOn = Math.max(0, TODAY - Math.round(Math.pow(r(), 1.8) * span * 365))

  /* Caseload and quarantine rates for this animal's own site, from the metric layer. */
  const stock = Math.max(1, levelAt('animals', sp.siteKey, TODAY))
  const careRate = levelAt('health', sp.siteKey, TODAY) / stock
  const roll = r()
  const status: AnimalStatus =
    roll < careRate * 0.12
      ? 'Critical'
      : roll < careRate
        ? 'Under care'
        : roll < careRate * 1.6
          ? 'Quarantine'
          : 'Healthy'

  const heavy = sp.cls === 'Mammalia'
  const weight = heavy
    ? `${(6 + r() * 190).toFixed(1)} kg`
    : sp.cls === 'Aves'
      ? `${(0.2 + r() * 7).toFixed(2)} kg`
      : sp.cls === 'Reptilia'
        ? `${(0.3 + r() * 40).toFixed(2)} kg`
        : `${(0.02 + r() * 4).toFixed(2)} kg`

  const named = (sp.cls === 'Mammalia' || sp.cls === 'Aves') && r() < 0.55
  /* Housing only — a feed store and a filtration bay are real enclosures that hold no animals. */
  const enclosures = housingIn(sp.siteKey)

  return {
    id,
    callName: named ? pickBy(`${id}:call`, CALL_NAMES) : undefined,
    speciesId,
    speciesName: sp.name,
    cls: sp.cls,
    siteKey: sp.siteKey,
    siteName: site.name,
    enclosureId: enclosures[Math.floor(r() * enclosures.length)]?.id ?? `${site.code}-01`,
    sex,
    bornOn,
    age: ageFrom(bornOn),
    status,
    accession: `ACC-${dateAt(bornOn).getFullYear()}-${String(100 + Math.floor(r() * 899))}`,
    origin: pickBy(`${id}:origin`, ORIGINS),
    weight,
    lastExam: Math.max(bornOn, TODAY - between(r, 1, 180)),
    vaccinated: r() < 0.92,
    dewormed: r() < 0.89,
    welfare: Math.round((4 + r()) * 10) / 10,
  }
}

/** An animal by id, from any path that knows one. */
export function animalById(id: string): Animal | undefined {
  const key = decodeAnimalId(id)
  return key ? animalAt(key.speciesId, key.n) : undefined
}

/** How an animal is named in a row: its call name where it has one, else its id. */
export const animalLabel = (a: Animal): string => a.callName ?? a.id

/** "Leo · Asiatic Lion" — the form a breadcrumb and a search result both want. */
export const animalTitle = (a: Animal): string =>
  a.callName ? `${a.callName} · ${a.speciesName}` : `${a.speciesName} ${a.id.slice(-5)}`

/* ── paging a population ─────────────────────────────────────────────────── */

export interface Page<T> {
  rows: T[]
  /** The real figure. A page is explicitly a slice of this, never a substitute for it. */
  total: number
  offset: number
  hasMore: boolean
}

/**
 * A page of one species' animals.
 *
 * Only the requested slice is constructed, so paging 12,400 carp costs the same as paging
 * 12 lions. `total` is the population from the metric layer, so the "showing 20 of 12,400"
 * line is the truth rather than an estimate of it.
 */
export function animalsOfSpecies(speciesId: string, win: Win, offset = 0, limit = 20): Page<Animal> {
  const total = stockOfSpecies(speciesId, win)
  const rows: Animal[] = []
  for (let n = offset + 1; n <= Math.min(total, offset + limit); n++) {
    const a = animalAt(speciesId, n)
    if (a) rows.push(a)
  }
  return { rows, total, offset, hasMore: offset + rows.length < total }
}

/**
 * A page of animals across a whole scope, drawn proportionally across its species.
 *
 * Proportional rather than the first N of the largest population: an unfiltered list that
 * is twenty carp implies the collection is only carp, which is roughly true by headcount
 * and useless as an answer to "show me the animals".
 */
export function animalsInScope(
  siteKey: string | null,
  win: Win,
  offset = 0,
  limit = 20,
): Page<Animal> {
  const keys = siteKey ? [siteKey] : SITES.map((s) => s.key)
  const buckets = keys
    .flatMap((k) => speciesStock(k, win))
    .filter((b) => b.count > 0)
  const total = buckets.reduce((n, b) => n + b.count, 0)
  if (total === 0) return { rows: [], total: 0, offset, hasMore: false }

  /* Take a proportional slice per species for the page being asked for. */
  const want = Math.min(limit, Math.max(0, total - offset))
  const take = apportion(want, buckets.map((b) => b.count))
  const perSpeciesOffset = apportion(offset, buckets.map((b) => b.count))

  const rows = buckets.flatMap((b, i) => {
    const start = perSpeciesOffset[i]
    return Array.from({ length: Math.min(take[i], Math.max(0, b.count - start)) }, (_, j) =>
      animalAt(b.species.id, start + j + 1),
    ).filter((a): a is Animal => Boolean(a))
  })

  return { rows, total, offset, hasMore: offset + rows.length < total }
}

/** Free-text over ids, call names and species names — the global search's animal half. */
export function searchAnimals(query: string, siteKey: string | null, win: Win, limit = 12): Animal[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  /* An id typed in full is a direct hit and must not be ranked against anything. */
  const direct = animalById(q.toUpperCase().startsWith('ANM-') ? q : `ANM-${q}`)
  if (direct) return [direct]

  const keys = siteKey ? [siteKey] : SITES.map((s) => s.key)
  const out: Animal[] = []
  for (const k of keys) {
    for (const { species, count } of speciesStock(k, win)) {
      if (out.length >= limit) return out
      if (!species.name.toLowerCase().includes(q)) continue
      /* The first few of a matching species — enough to prove the match and offer a way in. */
      for (let n = 1; n <= Math.min(count, 3) && out.length < limit; n++) {
        const a = animalAt(species.id, n)
        if (a) out.push(a)
      }
    }
  }

  /* A call name is worth matching too, but only over a bounded sample — scanning 215,432
     derived records for "Leo" on every keystroke is not a search, it is a hang. */
  if (out.length < limit) {
    for (const sp of SPECIES) {
      if (out.length >= limit) break
      if (siteKey && sp.siteKey !== siteKey) continue
      if (sp.cls !== 'Mammalia' && sp.cls !== 'Aves') continue
      const stock = Math.min(60, stockOfSpecies(sp.id, win))
      for (let n = 1; n <= stock && out.length < limit; n++) {
        const a = animalAt(sp.id, n)
        if (a?.callName?.toLowerCase().startsWith(q)) out.push(a)
      }
    }
  }

  return out
}

export const bornOnLabel = (a: Animal): string => longDate(a.bornOn)

export const todayIndex = (): number => indexOf(WORLD_TODAY)

/** Draw used where a caller needs a stable per-animal coin without a full record. */
export const animalCoin = (id: string, salt: string): number => draw(`${id}:${salt}`)
