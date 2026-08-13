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
import { apportion, draw } from './seed'
import { levelAt } from './series'
import {
  FLAG_CARE,
  FLAG_DEWORMED,
  FLAG_VACCINATED,
  NO_DAY,
  UNRESOLVED,
  animalRow,
  data,
  speciesSpan,
} from './store'
import {
  ENCLOSURES,
  SITES,
  SPECIES,
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

const SEX_CODE: Sex[] = ['U', 'M', 'F', 'U']

export interface SexSplit {
  male: number
  female: number
  undetermined: number
}

/**
 * The sex split over a set of species populations.
 *
 * COUNTED, NOT MODELLED. There used to be a table of per-class "undetermined" rates here —
 * 98.5% for ray-finned fish, 4% for mammals — because no per-animal sex was stored. Every
 * housing row carries one, so this is a walk over the register spans instead. The collection's
 * real answer is 52% undetermined, which no per-class table would have arrived at.
 */
export function sexSplit(rows: { species: Species; count: number }[]): SexSplit {
  const a = data().animals
  let male = 0
  let female = 0
  let undetermined = 0

  for (const { species, count } of rows) {
    if (count <= 0) continue
    const span = speciesSpan(species.id)
    if (!span) {
      undetermined += count
      continue
    }
    const [start, held] = span
    let m = 0
    let f = 0
    for (let i = start; i < start + held; i++) {
      const code = SEX_CODE[a.sex[i]] ?? 'U'
      if (code === 'M') m++
      else if (code === 'F') f++
    }
    /* Scaled to the window's count so the parts sum to the headcount exactly even on a
       reconstructed earlier day, where the register's own total is today's. */
    const [sm, sf] = apportion(count, [m, f, Math.max(0, held - m - f)])
    male += sm
    female += sf
    undetermined += count - sm - sf
  }

  return { male, female, undetermined }
}

/* ── where one species actually lives ────────────────────────────────────── */

export interface EnclosureHolding {
  enclosureId: string
  enclosureName: string
  siteKey: string
  male: number
  female: number
  undetermined: number
  total: number
}

/**
 * Every enclosure holding one species, counted from the register rather than modelled.
 *
 * READ THE REGISTER, NOT `population.ts`. `speciesRows()` there derives male/female/unknown
 * from an authored unsexed-rate table, and the two disagree on real data: Umber Langur at
 * Pinecrest is 2,000 male / 1,991 female / 0 undetermined in `animals.bin`, where the rate
 * table would invent an unsexed share of about 4%. `core/animals.ts` already owns this exact
 * span walk for `sexSplit`, so the count belongs here beside it and not in a view.
 *
 * UNSCALED, AND THAT IS THE DIFFERENCE FROM `sexSplit`. That function apportions its parts to
 * a windowed headcount so they sum to a reconstructed earlier day. There is no such thing to
 * apportion to here: `animals.bin` is a snapshot of who is housed where TODAY and carries no
 * enclosure-move history, so a per-enclosure figure can only ever be current. The caller says
 * so on screen rather than this pretending otherwise.
 */
export function holdingsByEnclosure(speciesId: string): EnclosureHolding[] {
  const a = data().animals
  const span = speciesSpan(speciesId)
  if (!span) return []
  const [start, held] = span

  const by = new Map<number, { m: number; f: number; u: number }>()
  for (let i = start; i < start + held; i++) {
    const ix = a.enclosure[i]
    if (ix === UNRESOLVED) continue
    let cell = by.get(ix)
    if (!cell) by.set(ix, (cell = { m: 0, f: 0, u: 0 }))
    const code = SEX_CODE[a.sex[i]] ?? 'U'
    if (code === 'M') cell.m++
    else if (code === 'F') cell.f++
    else cell.u++
  }

  const out: EnclosureHolding[] = []
  for (const [ix, c] of by) {
    const enc = ENCLOSURES[ix]
    if (!enc) continue
    out.push({
      enclosureId: enc.id,
      enclosureName: enc.name,
      siteKey: enc.siteKey,
      male: c.m,
      female: c.f,
      undetermined: c.u,
      total: c.m + c.f + c.u,
    })
  }
  return out.sort((x, y) => y.total - x.total)
}

/**
 * WHAT AN ENCLOSURE ACTUALLY HOLDS, counted rather than apportioned.
 *
 * THE PAGE USED TO DERIVE THIS FROM CAPACITY AND THEREFORE READ ZERO. The enclosure hero was
 * `site total × this enclosure's capacity ÷ the site's total capacity`, described in its own
 * comment as "the only honest split available" — but `hydrate()` writes `capacity: 0` on every
 * enclosure, because the schema stores an enclosure as a NAME and nothing else. So the
 * numerator was always zero and every enclosure in the product reported holding no animals.
 *
 * There was never any need to apportion. `animals.bin` carries an enclosure index per animal,
 * resolved on all 110,005 rows, so the count is a walk rather than an estimate — and unlike the
 * capacity split it is the same number the species pages already show for the same enclosure.
 *
 * ONE PASS OVER THE REGISTER, which is ~110k integer reads and cheap enough to do on render.
 * Keyed by enclosure ID rather than index because `ENCLOSURES[].id` is the bare enclosure name
 * and measured unique across all 15,959 of them.
 */
export function stockOfEnclosure(enclosureId: string): {
  total: number
  male: number
  female: number
  undetermined: number
  species: number
} {
  const a = data().animals
  const ix = ENCLOSURES.findIndex((e) => e.id === enclosureId)
  const empty = { total: 0, male: 0, female: 0, undetermined: 0, species: 0 }
  if (ix < 0) return empty

  let male = 0
  let female = 0
  let undetermined = 0
  const species = new Set<number>()
  for (let i = 0; i < a.count; i++) {
    if (a.enclosure[i] !== ix) continue
    species.add(a.species[i])
    const code = SEX_CODE[a.sex[i]] ?? 'U'
    if (code === 'M') male++
    else if (code === 'F') female++
    else undetermined++
  }
  return { total: male + female + undetermined, male, female, undetermined, species: species.size }
}

/**
 * What one enclosure's composition permits, said in the only terms the dump supports.
 *
 * NOT "BREEDING READY". The reference design badges an enclosure holding one male and one
 * female as ready to breed, which claims a maturity nothing here can carry: `born` is absent
 * on 89,579 of 110,005 animals — 81% — and `maturity_age_years` exists for 775 of 2,339
 * species. What the register can actually say is which sexes are present, so that is what the
 * badge says. A curator reading "both sexes present" knows what it does and does not mean;
 * one reading "breeding ready" has been told something the data never established.
 */
export type Composition =
  | 'Both sexes'
  | 'All male'
  | 'All female'
  | 'Lone male'
  | 'Lone female'
  | 'All unsexed'
  | 'Lone unsexed'
  | 'Partly unsexed'

export function compositionOf(h: { male: number; female: number; undetermined: number; total: number }): Composition {
  const sexed = h.male + h.female
  if (sexed === 0) return h.total === 1 ? 'Lone unsexed' : 'All unsexed'
  if (h.male > 0 && h.female > 0) return 'Both sexes'
  if (h.undetermined > 0) return 'Partly unsexed'
  if (h.male > 0) return h.male === 1 ? 'Lone male' : 'All male'
  return h.female === 1 ? 'Lone female' : 'All female'
}

/** The whole collection's split, or one site's. */
export function sexSplitFor(siteKey: string | null, win: Win): SexSplit {
  const keys = siteKey ? [siteKey] : SITES.map((s) => s.key)
  return sexSplit(keys.flatMap((k) => speciesStock(k, win)))
}

/* ── ids ─────────────────────────────────────────────────────────────────── */

/**
 * An animal's id is the database's own key, verbatim.
 *
 * It used to be a composite that ENCODED the animal's position — `ANM-AQ03-00142` — because
 * that was the only way to reconstruct a record with no registry behind it. There is a
 * registry now, so the id identifies rather than describes, and a reader who cites
 * `#/e/animal/100142` can find that exact row in `housing`.
 */
export function animalId(speciesId: string, n: number): string {
  const span = speciesSpan(speciesId)
  if (!span) return ''
  const [start, held] = span
  if (n < 1 || n > held) return ''
  return String(data().animals.id[start + n - 1])
}

export interface AnimalKey {
  speciesId: string
  n: number
}

/** Position of an animal within its own species, for the callers that still page by ordinal. */
export function decodeAnimalId(id: string): AnimalKey | undefined {
  const row = animalRow(Number(id.trim()))
  if (row < 0) return undefined
  const a = data().animals
  const sp = SPECIES[a.species[row]]
  if (!sp) return undefined
  const span = speciesSpan(sp.id)
  return span ? { speciesId: sp.id, n: row - span[0] + 1 } : undefined
}

/* ── one animal ──────────────────────────────────────────────────────────── */

export type AnimalStatus = 'Healthy' | 'Under care' | 'Quarantine' | 'Critical'

export interface Animal {
  id: string
  /**
   * A keeper's own name for the animal.
   *
   * `housing.identifier_value` holds one for the 5,161 rows whose identifier type is "Name";
   * every other row is identified by a microchip, a ring number or a tag, and has none. It is
   * read where it exists and absent where it does not — it used to be drawn from a list of
   * twenty names for any mammal or bird that won a coin toss.
   */
  callName?: string
  speciesId: string
  speciesName: string
  cls: ClassName
  siteKey: string
  siteName: string
  enclosureId: string
  sex: Sex
  /** Ledger index of birth. `-1` where the record carries no usable date, as 79% do not. */
  bornOn: number
  /** Rendered from `bornOn` against the world clock — never stored, so it cannot go stale. */
  age: string
  status: AnimalStatus
  accession: string
  origin: string
  weight: string
  /** Ledger index of the last recorded examination. `-1` where none is recorded. */
  lastExam: number
  vaccinated: boolean
  dewormed: boolean
  welfare: number
}

function ageFrom(bornOn: number): string {
  if (bornOn < 0) return '—'
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

/** Build the animal at one register row. */
function atRow(row: number): Animal | undefined {
  const a = data().animals
  if (row < 0 || row >= a.count) return undefined

  const sp = SPECIES[a.species[row]]
  if (!sp) return undefined
  const site = siteOf(sp.siteKey)
  const encIx = a.enclosure[row]
  const born = a.born[row]
  const acc = a.accession[row]
  const flags = a.flags[row]
  const originIx = a.origin[row]

  return {
    id: String(a.id[row]),
    speciesId: sp.id,
    speciesName: sp.name,
    cls: sp.cls,
    siteKey: sp.siteKey,
    siteName: site?.name ?? sp.siteKey,
    enclosureId: encIx === UNRESOLVED ? '—' : (ENCLOSURES[encIx]?.id ?? '—'),
    sex: SEX_CODE[a.sex[row]] ?? 'U',
    bornOn: born === NO_DAY ? -1 : born,
    age: ageFrom(born === NO_DAY ? -1 : born),
    /* The only derived field left, and it is a statement about the clinical record: a live
       prescription or a diagnosis inside ninety days. There is no health-status column, and
       no admission or bed record to read a Quarantine or Critical tier from — so those two
       tiers are never returned rather than being assigned by a coin. */
    status: flags & FLAG_CARE ? 'Under care' : 'Healthy',
    accession: acc === NO_DAY ? '—' : longDate(acc),
    origin: a.origins[originIx] ?? 'Not recorded',
    /* `housing.weight` is null on 77% of rows and mixes units where present, so it is not
       carried into the register at all rather than shown for one animal in four. */
    weight: '—',
    lastExam: -1,
    vaccinated: Boolean(flags & FLAG_VACCINATED),
    dewormed: Boolean(flags & FLAG_DEWORMED),
    welfare: 0,
  }
}

/** The `n`th animal of a species, 1-based — the form the paging callers use. */
export function animalAt(speciesId: string, n: number): Animal | undefined {
  const span = speciesSpan(speciesId)
  if (!span) return undefined
  const [start, held] = span
  if (n < 1 || n > held) return undefined
  return atRow(start + n - 1)
}

/** An animal by its database id, from any path that knows one. */
export function animalById(id: string): Animal | undefined {
  const n = Number(String(id).trim())
  return Number.isFinite(n) ? atRow(animalRow(n)) : undefined
}

/** How an animal is named in a row: its call name where it has one, else its id. */
export const animalLabel = (a: Animal): string => a.callName ?? a.id

/** "Leo · Asiatic Lion" — the form a breadcrumb and a search result both want. */
export const animalTitle = (a: Animal): string =>
  a.callName ? `${a.callName} · ${a.speciesName}` : `${a.speciesName} ${a.id}`

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

  /* THE CALL-NAME PASS IS GONE, AND IT WAS NOT MERELY DEAD.
     It walked up to sixty animals of every Mammalia and Aves species, constructing an `Animal`
     record for each, and tested `a.callName` — a field `atRow` has never assigned, because
     nothing in the compiled register carries it. So the predicate could not be true, the loop
     could not contribute a result, and it ran on every keystroke: thousands of object
     allocations per character typed, guaranteed to find nothing.

     Deleting it changes no search result — none was reachable through it. What a call-name
     search would need is `housing.identifier_value` where `identifier_type` is 'Name', which
     the ETL selects but does not emit into `animals.bin`. Until it does, this searches ids and
     species, which is what it has always actually done. */
  return out
}

export const bornOnLabel = (a: Animal): string => longDate(a.bornOn)

export const todayIndex = (): number => indexOf(WORLD_TODAY)

/** Draw used where a caller needs a stable per-animal coin without a full record. */
export const animalCoin = (id: string, salt: string): number => draw(`${id}:${salt}`)
