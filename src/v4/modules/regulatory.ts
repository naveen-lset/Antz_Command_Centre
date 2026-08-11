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
import { SITES, speciesByName, type ClassName, type Species } from '../../core/world'
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
 * A species' published standing, read from the reference table.
 *
 * WHAT THIS REPLACES. There was a hand-authored table here — all 97 species in the old
 * `core/world.ts`, each with an IUCN category, a CITES appendix and a Wildlife Protection Act
 * schedule typed against it. It was the right answer while the collection was authored: the
 * standing belongs to the species rather than to a category, so attaching it here made every
 * regulatory figure on the page a sum over `speciesStock` and therefore scopeable.
 *
 * The species are the database's now, all 2,411 of them, and `species` carries `iucn_status`
 * and `cites_appendix` on every row. So the standing is read. The 97-row table would have
 * matched none of them — the names are anonymised — and every species would have fallen to
 * Not Evaluated, which is what the Mortality page's "0 regulatory" was telling us.
 *
 * THE SCHEDULE IS GONE, AND THAT IS A REAL LOSS. There is no Wildlife Protection Act column
 * anywhere in the schema. `schedule` stays on the interface because the page's Schedule I/II/III
 * bands read it, and it is now always undefined — so those bands render empty rather than
 * wrong, and `isRegulated` falls back to the CITES listing alone.
 */

/** The eight IUCN strings the reference table uses, folded to the codes `RedList` draws. */
const IUCN: [RegExp, RedListCode][] = [
  [/critically endangered/i, 'CR'],
  [/^endangered|very high risk/i, 'EN'],
  [/vulnerable/i, 'VU'],
  [/near threatened/i, 'NT'],
  [/least concern/i, 'LC'],
  [/data deficient/i, 'DD'],
  [/extinct in the wild/i, 'EW'],
  [/extinct/i, 'EX'],
]

/**
 * CITES, folded to the appendix a card counts.
 *
 * A MULTI-LISTED SPECIES COUNTS AS ITS STRICTEST APPENDIX. 34 rows read "Appendix I/II" or
 * "Appendix I/II/III" — different populations of one species listed differently — and the
 * appendix bands must not double-count, so each row lands in exactly one. Appendix I is the
 * one a permit officer plans around, so that is the one it lands in.
 */
function citesOf(raw: string | null | undefined): CitesAppendix | undefined {
  if (!raw) return undefined
  if (/appendix\s*i(\s|\/|$)/i.test(raw)) return 'I'
  if (/appendix\s*ii(\s|\/|$)/i.test(raw)) return 'II'
  if (/appendix\s*iii/i.test(raw)) return 'III'
  return undefined
}

const UNASSESSED: Standing = { iucn: 'NE' }

const cache = new Map<string, Standing>()

export const standingOf = (speciesName: string): Standing => {
  const hit = cache.get(speciesName)
  if (hit) return hit

  /* Any population of the name — the reference row is per species, not per site, so the first
     holding answers for all of them. */
  const sp = speciesByName(speciesName)[0]
  if (!sp) return UNASSESSED

  const raw = sp.iucn ?? ''
  const iucn = IUCN.find(([test]) => test.test(raw))?.[1] ?? 'NE'
  const built: Standing = { iucn, cites: citesOf(sp.cites) }
  cache.set(speciesName, built)
  return built
}

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
