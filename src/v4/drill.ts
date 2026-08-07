/**
 * THE DRILL — Overall → Site → Species → Animal, now an adapter over `core/`.
 *
 * WHAT THIS FILE USED TO BE, AND WHY IT HAD TO STOP. It carried its own species model: forty
 * species, six sites, weights, its own largest-remainder apportionment, its own seeded PRNG for
 * per-animal attributes, and its own forty-row cap. All of it was careful, and all of it was a
 * SECOND model of the same collection.
 *
 * That is the defect, independent of whether either model was right. The entity pages read
 * `core/world.ts`, which holds ninety-seven species; this file held forty. So the species list
 * inside a drill sheet and the species list on the site's own page were different lists of
 * different lengths that summed to the same total — and a reader who opened both would have
 * found the drill missing fifty-seven species that the page beside it lists. Two models of one
 * thing will always drift; the only fix is to have one.
 *
 * So the derivation is deleted rather than reconciled, and every function here now forwards to
 * `core/query.ts`. The shapes are preserved because `panels.tsx` renders them.
 *
 * THE FORTY-ROW CAP IS ALSO GONE. `animalsFor` used to take a proportional sample of forty and
 * print a note explaining the cap; callers now page through the real population — see
 * `core/animals.ts` and `v4/perf.tsx`. The `total` it returns has always been the real figure,
 * so a caller that only reads the first page still states the truth.
 */

import { TODAY, shortDate, type Win } from '../core/calendar'
import {
  animalById,
  animalsInScope,
  animalsOfSpecies,
  type Animal,
} from '../core/animals'
import { eventsForAnimal } from '../core/events'
import { bySpecies } from '../core/query'
import { split, type Split } from '../core/series'
import { SITES, siteOf, speciesIn, type Site } from '../core/world'

/* ── metrics that can be drilled ─────────────────────────────────────────── */

export interface DrillMetric {
  slug: string
  title: string
  /** Word after the number — "animals", "deaths". Singular-agnostic. */
  unit: string
  /** What one row at the animal level means: a member, or an event. */
  grain: 'member' | 'event'
  href: string
}

/* Titles are the module registry's, so a sheet opened from a KPI is headed the same thing the
   sidebar calls the module it came from. */
export const DRILL: Record<string, DrillMetric> = {
  animals: { slug: 'animals', title: 'Animal Population', unit: 'animals', grain: 'member', href: '#/animals' },
  health: { slug: 'health', title: 'Health & Medical', unit: 'under care', grain: 'member', href: '#/health' },
  births: { slug: 'births', title: 'Natality', unit: 'births', grain: 'event', href: '#/births' },
  mortality: { slug: 'mortality', title: 'Mortality', unit: 'deaths', grain: 'event', href: '#/mortality' },
  vaccination: { slug: 'vaccination', title: 'Vaccination', unit: 'covered', grain: 'member', href: '#/vaccination' },
  transfers: { slug: 'transfers', title: 'Animal Movement', unit: 'transfers', grain: 'event', href: '#/transfers' },
}

/* ── level 1 · sites ─────────────────────────────────────────────────────── */

export interface SiteLevel {
  kind: 'count' | 'stock' | 'rate'
  unit: string
  overall: number
  rows: { site: Site; value: number; of?: number; percent: number }[]
}

const KIND: Record<Split['kind'], SiteLevel['kind']> = { flow: 'count', level: 'stock', rate: 'rate' }

/** The zoo-wide figure and its six sites, from the one shared site model. */
export function sitesFor(metric: string, win: Win): SiteLevel | undefined {
  const s = split(DRILL[metric]?.slug ?? metric, win)
  if (!s) return undefined
  return {
    kind: KIND[s.kind],
    unit: s.unit,
    overall: s.total,
    rows: s.rows.flatMap((r) => {
      const site = siteOf(r.siteKey)
      return site ? [{ site, value: r.value, of: r.of, percent: r.share }] : []
    }),
  }
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
 * One line, because `core/query.ts` already does this for every metric under any scope — a flow by
 * grouping its own events, a level by apportioning across species weights. Both sum to the site
 * exactly, which is the invariant this file used to implement itself.
 */
export function speciesFor(metric: string, siteKey: string, win: Win): SpeciesRow[] {
  const site = siteOf(siteKey)
  if (!site) return []
  return bySpecies({ site, win }, DRILL[metric]?.slug ?? metric).map(toRow)
}

/**
 * The species list with NO site picked — every site's species, merged by name.
 *
 * Common Carp held in two sites is one species with one total, which is what a curator means by
 * the word. Because each site's rows sum to that site, the merged list sums to Overall.
 */
export function speciesForAll(metric: string, win: Win): SpeciesRow[] {
  return bySpecies({ site: null, win }, DRILL[metric]?.slug ?? metric).map(toRow)
}

const toRow = (r: { label: string; sub?: string; value: number; of?: number; percent: number }): SpeciesRow => ({
  name: r.label,
  /* The class comes back in `sub` for a level metric and is absent for a flow, where the rows are
     grouped from events by species name. Looked up rather than left blank, so the second line of
     a species row says the same thing on every path into it. */
  cls: r.sub ?? classOf(r.label),
  value: r.value,
  of: r.of,
  percent: r.percent,
})

const classOf = (name: string): string =>
  SITES.flatMap((s) => speciesIn(s.key)).find((sp) => sp.name === name)?.cls ?? ''

/* ── level 3 · animals ───────────────────────────────────────────────────── */

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

/** How many animal rows a page of a species list holds. Pages, not a cap — see the file note. */
export const ANIMAL_PAGE = 20

const TONE_OF: Record<string, AnimalRow['tone']> = {
  Healthy: 'good',
  'Under care': 'warn',
  Quarantine: 'warn',
  Critical: 'bad',
}

const toAnimalRow = (a: Animal): AnimalRow => ({
  id: a.id,
  name: a.callName ?? a.speciesName,
  cls: a.cls,
  sex: a.sex,
  age: a.age,
  site: a.siteName,
  siteKey: a.siteKey,
  enclosure: a.enclosureId,
  status: a.status,
  tone: TONE_OF[a.status] ?? 'neutral',
})

/**
 * The animals behind whatever is currently selected.
 *
 * BOTH FACETS ARE OPTIONAL, which is what lets a drill sheet show sites, species and animals at
 * once rather than one behind the other. With neither set the list is a cross-site, cross-species
 * sample; with a site set it is that site; with both it is one species in one site.
 *
 * The sample is drawn PROPORTIONALLY across the matching populations rather than taking the first
 * twenty of the largest — an unfiltered list that is twenty carp implies the collection is only
 * carp, which is roughly true by headcount and useless as an answer to "show me the animals".
 */
export function animalsFor(
  /* Kept in the signature because every call site passes it, and because a future metric-specific
     status word (a death's cause, a transfer's direction) belongs on this row rather than on the
     animal. The animal's own state is the same whichever metric surfaced it. */
  _metric: string,
  win: Win,
  siteKey?: string,
  species?: string,
  offset = 0,
  limit = ANIMAL_PAGE,
): { rows: AnimalRow[]; total: number; hasMore: boolean } {
  /* One species in one site is a single population, so it pages directly. `core/animals.ts` owns
     how a population is paged — this only picks which one. */
  if (species && siteKey) {
    const sp = speciesIn(siteKey).find((s) => s.name === species)
    if (!sp) return { rows: [], total: 0, hasMore: false }
    const page = animalsOfSpecies(sp.id, win, offset, limit)
    return { rows: page.rows.map(toAnimalRow), total: page.total, hasMore: page.hasMore }
  }

  const page = animalsInScope(siteKey ?? null, win, offset, limit)
  return { rows: page.rows.map(toAnimalRow), total: page.total, hasMore: page.hasMore }
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

/**
 * The bottom of the drill, as a sheet.
 *
 * A DRILL SHEET IS NO LONGER THE END OF THE ROAD. This used to be the deepest level with no link
 * out of it, on the reasoning that anything below an animal is a working screen. The animal now
 * has a real page — `#/e/animal/<id>` — with nine cross-navigation tabs, so the sheet's job is to
 * answer "which animal" and hand over. `href` is that hand-off.
 */
export function animalRecord(row: AnimalRow): AnimalRecord & { href: string } {
  const a = animalById(row.id)
  return {
    ...row,
    accession: a?.accession ?? '—',
    origin: a?.origin ?? '—',
    weight: a?.weight ?? '—',
    lastExam: a ? shortDate(a.lastExam) : '—',
    vaccination: a?.vaccinated ? 'Current' : 'Due',
    deworming: a?.dewormed ? 'Current' : 'Due',
    welfare: a ? `${a.welfare} / 5` : '—',
    timeline: a
      ? eventsForAnimal(a, { from: 0, to: TODAY, days: TODAY + 1 } as Win)
          .slice(0, 8)
          .map((ev) => ({ when: shortDate(ev.day), label: ev.detail, sub: ev.kind, tone: ev.tone === 'neutral' ? undefined : ev.tone }))
      : [],
    href: `#/e/animal/${row.id}`,
  }
}

/**
 * An animal reachable by id alone — the path an alert row takes.
 *
 * The id decodes to the animal's position in the collection, so nothing else has to be supplied
 * and no two callers can disagree about who the animal is. The `name` and `where` arguments are
 * kept for the existing call sites and ignored where the id resolves.
 */
export function animalFromId(id: string, name?: string, where?: string): AnimalRecord & { href: string } {
  const a = animalById(id)
  if (!a) {
    return animalRecord({
      id,
      name: name ?? id,
      cls: '',
      sex: 'U',
      age: '—',
      site: where?.split(' · ')[0] ?? '',
      siteKey: '',
      enclosure: where?.split(' · ')[1] ?? '',
      status: 'Unknown',
      tone: 'neutral',
    })
  }
  return animalRecord(toAnimalRow(a))
}
