/**
 * WHAT THE COLLECTION IS ANSWERABLE FOR — IUCN, CITES and the Wildlife Protection Act,
 * declared once per species and counted from the real population.
 *
 * WHY THIS IS KEYED BY SPECIES AND NOT BY CATEGORY. The Animal Population page used to
 * state "CITES Appendix I · 4,180" and "Critically Endangered · 388" as typed constants,
 * and `modules/conservation.ts` held a second, separate list of which species those were —
 * a list whose species ("Père David's Deer", "Socorro Dove", "Pangasius Catfish") are not
 * in `core/world.ts` at all. Two models of one collection, and the drill-down therefore
 * named animals the rest of the product does not hold.
 *
 * It also made the figures unscopeable. The brief is explicit that picking a site must recut
 * EVERY section, and a zoo-wide constant cannot be recut — the CITES card would have gone on
 * reading 4,180 under a heading saying Carnivore Ridge.
 *
 * So the standing is attached to the species, which is where it actually lives — a Gharial is
 * Critically Endangered and CITES Appendix I wherever it is held — and every count on the page
 * is a sum over `speciesStock`, the same function the headcount, the class composition and the
 * species list already read. Scope it to a site and the counts follow, because they are the
 * same animals counted a different way rather than a different number typed beside them.
 *
 * The three instruments are kept apart, deliberately. CITES is a trade convention, the
 * Schedules are Indian domestic law and the Red List is an assessment of extinction risk. An
 * animal routinely carries two of them or all three, so they do NOT sum and must never be
 * drawn as one distribution.
 */

import type { Win } from '../../core/calendar'
import { speciesStock } from '../../core/animals'
import { SITES, type ClassName, type Species } from '../../core/world'
import type { RedListCode } from '../../exec/system'

export type CitesAppendix = 'I' | 'II' | 'III'
export type ScheduleClass = 'I' | 'II' | 'III'

export interface Standing {
  /** IUCN Red List category. `NE` where the species has never been assessed. */
  iucn: RedListCode
  /** CITES appendix, where the species is listed. Absent means it is not. */
  cites?: CitesAppendix
  /** Wildlife Protection Act schedule. Absent means the species is not scheduled. */
  schedule?: ScheduleClass
}

/**
 * Every species in `core/world.ts`, with its published standing.
 *
 * All 97 are present rather than the interesting ones: a species missing from this table
 * would silently fall to Not Evaluated and non-regulatory, which is a claim about the animal
 * rather than an admission about the table. `standingOf` still defaults, so a species added
 * to the world tomorrow renders as unassessed instead of crashing — but it will also show up
 * in the Not Evaluated count, where somebody will notice it.
 */
const STANDING: Record<string, Standing> = {
  /* ── Aquatic Halls ─────────────────────────────────────────────────────── */
  'Common Carp': { iucn: 'VU' },
  'Nile Tilapia': { iucn: 'LC' },
  Rohu: { iucn: 'LC' },
  'Silver Barb': { iucn: 'LC' },
  'Mrigal Carp': { iucn: 'LC' },
  Catla: { iucn: 'LC' },
  'Rose Shrimp': { iucn: 'NE' },
  'Giant River Prawn': { iucn: 'LC' },
  'Indian Mud Crab': { iucn: 'DD' },
  'Fiddler Crab': { iucn: 'NE' },
  'Apple Snail': { iucn: 'NE' },
  'Freshwater Mussel': { iucn: 'DD' },
  Mosquitofish: { iucn: 'LC' },
  'Zebra Danio': { iucn: 'LC' },
  'Climbing Perch': { iucn: 'DD' },
  'Snakehead Murrel': { iucn: 'LC' },
  'Blacktip Reef Shark': { iucn: 'VU' },
  'Whitespotted Bamboo Shark': { iucn: 'NT' },
  'Freshwater Stingray': { iucn: 'VU', schedule: 'II' },
  'Honeycomb Whipray': { iucn: 'EN', schedule: 'II' },
  'Indian Bullfrog': { iucn: 'LC', cites: 'II', schedule: 'II' },
  'Common Skittering Frog': { iucn: 'LC' },

  /* ── Aviary Complex ────────────────────────────────────────────────────── */
  'Zebra Finch': { iucn: 'LC' },
  'Rock Pigeon': { iucn: 'LC' },
  'Indian Peafowl': { iucn: 'LC', schedule: 'I' },
  'Grey Francolin': { iucn: 'LC', schedule: 'II' },
  'Red Avadavat': { iucn: 'LC', schedule: 'II' },
  'Common Myna': { iucn: 'LC' },
  'Rose-ringed Parakeet': { iucn: 'LC', cites: 'III', schedule: 'II' },
  'Painted Stork': { iucn: 'NT', schedule: 'II' },
  'Black-headed Ibis': { iucn: 'NT', schedule: 'II' },
  'Lesser Whistling Duck': { iucn: 'LC', schedule: 'II' },
  'Indian Skimmer': { iucn: 'EN', schedule: 'I' },
  'Sarus Crane': { iucn: 'VU', cites: 'II', schedule: 'I' },
  'Greater Flamingo': { iucn: 'LC', cites: 'II', schedule: 'II' },
  'Spot-billed Pelican': { iucn: 'NT', schedule: 'I' },
  'Barn Owl': { iucn: 'LC', cites: 'II', schedule: 'II' },
  'Indian Eagle-Owl': { iucn: 'LC', cites: 'II', schedule: 'II' },
  'Oriental Darter': { iucn: 'NT', schedule: 'II' },
  'White-rumped Vulture': { iucn: 'CR', cites: 'II', schedule: 'I' },
  'Crested Serpent Eagle': { iucn: 'LC', cites: 'II', schedule: 'I' },

  /* ── Savanna ───────────────────────────────────────────────────────────── */
  Chital: { iucn: 'LC', schedule: 'III' },
  Blackbuck: { iucn: 'LC', cites: 'III', schedule: 'I' },
  Sambar: { iucn: 'VU', schedule: 'III' },
  Nilgai: { iucn: 'LC', schedule: 'III' },
  'Indian Gazelle': { iucn: 'LC', cites: 'III', schedule: 'I' },
  'Sangai Deer': { iucn: 'EN', cites: 'I', schedule: 'I' },
  'Hog Deer': { iucn: 'EN', cites: 'I', schedule: 'III' },
  'Wild Boar': { iucn: 'LC', schedule: 'III' },
  'Four-horned Antelope': { iucn: 'VU', cites: 'III', schedule: 'I' },
  'Indian Bison': { iucn: 'VU', cites: 'I', schedule: 'I' },
  Barasingha: { iucn: 'VU', cites: 'I', schedule: 'I' },
  'Asiatic Wild Ass': { iucn: 'NT', cites: 'II', schedule: 'I' },
  'Blue Bull Calf Herd': { iucn: 'LC', schedule: 'III' },
  'Indian Hare': { iucn: 'LC', schedule: 'III' },
  'Indian Crested Porcupine': { iucn: 'LC', schedule: 'II' },

  /* ── Reptile House ─────────────────────────────────────────────────────── */
  'Indian Flapshell Turtle': { iucn: 'LC', cites: 'II', schedule: 'I' },
  'Indian Rock Python': { iucn: 'NT', cites: 'I', schedule: 'I' },
  'Bengal Monitor': { iucn: 'LC', cites: 'I', schedule: 'I' },
  'Indian Star Tortoise': { iucn: 'VU', cites: 'I', schedule: 'I' },
  'Marsh Crocodile': { iucn: 'VU', cites: 'I', schedule: 'I' },
  'Indian Cobra': { iucn: 'LC', cites: 'II', schedule: 'II' },
  'Russell’s Viper': { iucn: 'LC', schedule: 'II' },
  'Malabar Pit Viper': { iucn: 'LC', schedule: 'II' },
  'Common Rat Snake': { iucn: 'LC', cites: 'II', schedule: 'II' },
  'Checkered Keelback': { iucn: 'LC', schedule: 'II' },
  'Garden Lizard': { iucn: 'LC' },
  Gharial: { iucn: 'CR', cites: 'I', schedule: 'I' },
  'King Cobra': { iucn: 'VU', cites: 'II', schedule: 'II' },
  'Indian Chameleon': { iucn: 'LC', cites: 'II', schedule: 'I' },
  'Common Indian Toad': { iucn: 'LC' },
  'Bombay Bush Frog': { iucn: 'VU' },
  'Atlas Moth': { iucn: 'NE' },
  'Common Rose Butterfly': { iucn: 'NE', schedule: 'II' },
  'Giant Wood Spider Beetle': { iucn: 'NE' },

  /* ── Primate Forest ────────────────────────────────────────────────────── */
  'Rhesus Macaque': { iucn: 'LC', cites: 'II', schedule: 'II' },
  'Hanuman Langur': { iucn: 'LC', cites: 'I', schedule: 'II' },
  'Bonnet Macaque': { iucn: 'LC', cites: 'II', schedule: 'II' },
  'Lion-tailed Macaque': { iucn: 'EN', cites: 'I', schedule: 'I' },
  'Nilgiri Langur': { iucn: 'VU', cites: 'II', schedule: 'I' },
  'Slow Loris': { iucn: 'EN', cites: 'I', schedule: 'I' },
  'Capped Langur': { iucn: 'VU', cites: 'I', schedule: 'I' },
  'Assamese Macaque': { iucn: 'NT', cites: 'II', schedule: 'II' },
  'Hoolock Gibbon': { iucn: 'EN', cites: 'I', schedule: 'I' },
  'Slender Loris': { iucn: 'LC', cites: 'II', schedule: 'I' },

  /* ── Carnivore Ridge ───────────────────────────────────────────────────── */
  'Bengal Fox': { iucn: 'LC', cites: 'III', schedule: 'II' },
  'Jungle Cat': { iucn: 'LC', cites: 'II', schedule: 'II' },
  'Striped Hyena': { iucn: 'NT', cites: 'III', schedule: 'III' },
  'Asiatic Lion': { iucn: 'EN', cites: 'I', schedule: 'I' },
  'Fishing Cat': { iucn: 'VU', cites: 'II', schedule: 'I' },
  'Indian Leopard': { iucn: 'VU', cites: 'I', schedule: 'I' },
  'Golden Jackal': { iucn: 'LC', cites: 'III', schedule: 'III' },
  'Rusty-spotted Cat': { iucn: 'NT', cites: 'I', schedule: 'I' },
  'Sloth Bear': { iucn: 'VU', cites: 'I', schedule: 'I' },
  'Indian Grey Mongoose': { iucn: 'LC', cites: 'III', schedule: 'II' },
  'Honey Badger': { iucn: 'LC', cites: 'III', schedule: 'I' },
  Caracal: { iucn: 'LC', cites: 'I', schedule: 'I' },
}

const UNASSESSED: Standing = { iucn: 'NE' }

export const standingOf = (speciesName: string): Standing => STANDING[speciesName] ?? UNASSESSED

/** Under a permit or a schedule — the one line that splits the collection in two. */
export const isRegulated = (s: Standing): boolean => Boolean(s.cites || s.schedule)

/** "CITES I · Sch I", "Sch III", "Non-regulatory" — the species list's own column. */
export function standingLabel(s: Standing): string {
  const parts = [s.cites && `CITES ${s.cites}`, s.schedule && `Sch ${s.schedule}`].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Non-regulatory'
}

/* ── the population, with its standing attached ──────────────────────────── */

export interface Holding {
  species: Species
  count: number
  standing: Standing
}

/**
 * Every species population in scope, with its standing.
 *
 * This is the single read every regulatory figure on the page is derived from — CITES,
 * Schedule, IUCN, regulatory-vs-not and the species list all walk this one array, so they
 * cannot disagree about how many animals are in scope. `speciesStock` apportions each site's
 * headcount across its species and sums to it exactly, which is what makes the parts add up
 * to the hero without anybody checking.
 */
export function holdings(siteKey: string | null, win: Win): Holding[] {
  const keys = siteKey ? [siteKey] : SITES.map((s) => s.key)
  return keys
    .flatMap((k) => speciesStock(k, win))
    .filter((r) => r.count > 0)
    .map((r) => ({ ...r, standing: standingOf(r.species.name) }))
    .sort((a, b) => b.count - a.count)
}

/** "1 class" / "9 classes". Scoping to a single-class site made this visible. */
export const plural = (n: number, one: string, many = `${one}es`): string => `${n} ${n === 1 ? one : many}`

export const totalOf = (rows: Holding[]): number => rows.reduce((n, r) => n + r.count, 0)

export interface Band {
  key: string
  label: string
  animals: number
  species: number
  percent: number
}

const band = (key: string, label: string, rows: Holding[], of: number): Band => ({
  key,
  label,
  animals: totalOf(rows),
  species: rows.length,
  percent: of ? (totalOf(rows) / of) * 100 : 0,
})

/** The three CITES appendices, always all three — an empty one is a fact worth reading. */
export function citesBands(rows: Holding[]): Band[] {
  const total = totalOf(rows)
  return (['I', 'II', 'III'] as const).map((a) =>
    band(a, `Appendix ${a}`, rows.filter((r) => r.standing.cites === a), total),
  )
}

/** The three schedules of the Wildlife Protection Act. */
export function scheduleBands(rows: Holding[]): Band[] {
  const total = totalOf(rows)
  return (['I', 'II', 'III'] as const).map((s) =>
    band(s, `Schedule ${s}`, rows.filter((r) => r.standing.schedule === s), total),
  )
}

/**
 * Regulatory against non-regulatory.
 *
 * A species carrying both a CITES listing and a schedule is counted ONCE here, which is the
 * whole point of the split — the appendix and schedule cards below overlap by design and
 * this one must not, or the two halves would sum past the collection.
 */
export function regulatorySplit(rows: Holding[]): { regulated: Band; open: Band } {
  const total = totalOf(rows)
  return {
    regulated: band('reg', 'Regulatory', rows.filter((r) => isRegulated(r.standing)), total),
    open: band('non', 'Non-regulatory', rows.filter((r) => !isRegulated(r.standing)), total),
  }
}

/** Animals per Red List category. Keyed by code, for `RedList`'s own prop shape. */
export function iucnCounts(rows: Holding[]): Partial<Record<RedListCode, number>> {
  const out: Partial<Record<RedListCode, number>> = {}
  for (const r of rows) out[r.standing.iucn] = (out[r.standing.iucn] ?? 0) + r.count
  return out
}

export const iucnSpecies = (rows: Holding[], code: RedListCode): Holding[] =>
  rows.filter((r) => r.standing.iucn === code)

export const citesSpecies = (rows: Holding[], appendix: CitesAppendix): Holding[] =>
  rows.filter((r) => r.standing.cites === appendix)

export const scheduleSpecies = (rows: Holding[], schedule: ScheduleClass): Holding[] =>
  rows.filter((r) => r.standing.schedule === schedule)

/** The class split, from the same array — so composition and regulation agree on the total. */
export function classBands(rows: Holding[]): (Band & { cls: ClassName })[] {
  const totals = new Map<ClassName, Holding[]>()
  for (const r of rows) {
    const at = totals.get(r.species.cls) ?? []
    at.push(r)
    totals.set(r.species.cls, at)
  }
  const total = totalOf(rows)
  return [...totals.entries()]
    .map(([cls, list]) => ({ ...band(cls, cls, list, total), cls }))
    .sort((a, b) => b.animals - a.animals)
}
