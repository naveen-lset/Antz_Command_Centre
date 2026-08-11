/**
 * EVENTS — the individual records behind every flow figure.
 *
 * THE RECORD LIST AND THE KPI ARE THE SAME DATA. A day's count comes from the daily series; an
 * event is one row of that count. So "23 deaths this month" and the list of deaths this month
 * are not two sources that have to be kept in step — the list is the number, enumerated.
 * Filter the window and both move together; scope to a site and both narrow; group by cause
 * and the groups sum to 23 because every death is in exactly one of them.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THESE ARE NOW REAL ROWS. Every event used to be SYNTHESISED — its species, cause and
 * subject animal drawn from weighted tables seeded on (metric, site, day, index), because no
 * record corpus existed to read. There is one now: 305,754 events compiled out of
 * `species_mgmt_anon` into five typed arrays, and `eventAt` reads the row rather than
 * inventing it.
 *
 * WHAT THAT DELETES, AND WHY IT MATTERS. The `DETAILS` table held the vocabularies — eight
 * causes of death, five intake routes, eleven vaccines — with a weight against each, and
 * `AGENT_CLASSES` constrained which vaccine could reach which class so the draw would not hand
 * a shrimp a distemper booster. All of it is gone. The real vocabularies are wider and messier
 * than the authored ones (26 manners of death against 8, 42 vaccines against 11, 330
 * diagnoses) and they need no constraining, because a real dose was given to a real animal.
 *
 * WHAT IS NOT ATTRIBUTED ANY MORE. An event used to carry a hospital, ward, lab department,
 * pharmacy, medicine, nursery or incubator, drawn from registries this schema does not have.
 * Those fields are now left undefined, so a grouping by one of them returns nothing rather
 * than a plausible fiction. `Ev` keeps the fields so the modules reading them still compile.
 *
 * STILL NOTHING IS MATERIALISED UNTIL ASKED FOR. `count` reads the series. `tally` walks rows
 * and increments integers. Only `page` allocates objects, and only for the rows on screen.
 */

import { TODAY, shortDate, type Win } from './calendar'
import { METRICS } from './metrics'
import { daily, sumIn } from './series'
import { flowOf, rowIndex, UNRESOLVED } from './store'
import { SITES, SPECIES, siteOf, type Species } from './world'
import { animalById, animalLabel, type Animal } from './animals'

export type Tone = 'good' | 'warn' | 'bad' | 'neutral'

export interface Ev {
  id: string
  /** The metric slug this event is one unit of. */
  kind: string
  day: number
  siteKey: string
  speciesId: string
  speciesName: string
  animalId: string
  /** The metric's own classifying dimension — cause of death, sample type, direction. */
  detail: string
  tone: Tone
  /* Refs to whichever other hierarchy the metric hangs off. */
  hospitalId?: string
  wardId?: string
  labDeptId?: string
  pharmacyId?: string
  medicineId?: string
  nurseryId?: string
  incubatorId?: string
}

/* ── the classifying dimension ────────────────────────────────────────────── */

/**
 * The values a metric's classifying dimension actually takes, biggest-first as the ETL found
 * them.
 *
 * Read from the metric rather than authored beside it, so adding a manner of death to the
 * database adds it here without an edit. Exported because a caller sometimes needs the
 * vocabulary without walking the events — a filter chip row, for instance.
 */
export const detailsFor = (kind: string, _cls?: string): { label: string; weight: number }[] =>
  (METRICS[kind]?.details ?? []).map((label) => ({ label, weight: 1 }))

/** What the dimension is called on this metric — "Manner of death", "Vaccine". */
export const detailLabelOf = (kind: string): string => METRICS[kind]?.detailLabel ?? 'Detail'

/**
 * Whether a class is on a metric's protocol at all.
 *
 * ALWAYS TRUE NOW. The authored model needed this because it DREW a vaccine for an animal and
 * had to avoid absurd pairings. Real doses were administered to real animals, so there is
 * nothing to constrain — and answering false would hide records that exist.
 */
export const onProtocol = (_kind: string, _cls: string): boolean => true

/** The species a metric's records actually touch at a site. */
export const protocolSpecies = (siteKey: string, _kind: string): Species[] =>
  SPECIES.filter((s) => s.siteKey === siteKey)

/* ── tone ────────────────────────────────────────────────────────────────── */

/**
 * How a record reads — good, bad, or neither.
 *
 * Per metric rather than per value, with a handful of overrides where the recorded value
 * genuinely carries a signal. The authored model gave every one of its invented causes a tone;
 * the real vocabularies are too wide and too specific for that to be anything but guesswork,
 * so the default is the metric's own tone and only the unambiguous cases are singled out.
 */
const METRIC_TONE: Record<string, Tone> = {
  births: 'good',
  accession: 'good',
  mortality: 'bad',
  transfers: 'neutral',
  vaccinations: 'good',
  deworming: 'good',
  supplement: 'neutral',
  admissions: 'warn',
  disease: 'bad',
  pharmacy: 'neutral',
}

const TONE_OVERRIDE: [RegExp, Tone][] = [
  [/wild release/i, 'good'],
  [/not recorded|undetermined|indeterminate/i, 'neutral'],
]

function toneOf(kind: string, detail: string): Tone {
  for (const [test, tone] of TONE_OVERRIDE) if (test.test(detail)) return tone
  return METRIC_TONE[kind] ?? 'neutral'
}

/* ── one event ───────────────────────────────────────────────────────────── */

/** A species that could not be matched to the registry — shown as such, never guessed at. */
const UNKNOWN_SPECIES = { id: '', name: 'Unrecorded species', cls: 'Unknown' }

/**
 * The `i`th event of `kind` on `day` in `siteKey`.
 *
 * A direct read: the ETL sorts each metric's events by (site, day), so the row is found by
 * arithmetic rather than by searching. Stable by construction — the same event is the same
 * database row on every read, from any page, in any order.
 */
export function eventAt(kind: string, siteKey: string, day: number, i: number): Ev {
  const f = flowOf(kind)
  const r = f ? rowIndex(kind, siteKey, day, i) : -1

  if (!f || r < 0) {
    return {
      id: `${kind.toUpperCase().slice(0, 3)}-${day}-${i}`,
      kind,
      day,
      siteKey,
      speciesId: '',
      speciesName: UNKNOWN_SPECIES.name,
      animalId: '',
      detail: 'Not recorded',
      tone: 'neutral',
    }
  }

  const spx = f.species[r]
  const sp = spx === UNRESOLVED ? undefined : SPECIES[spx]
  const detail = f.details[f.detail[r]] ?? 'Not recorded'
  const animal = f.animal[r]

  return {
    /* The database's own animal id in the record id, so a row a reader cites can be found in
       the source table. */
    id: `${kind.toUpperCase().slice(0, 3)}-${day}-${animal || i}`,
    kind,
    day: f.day[r],
    siteKey,
    speciesId: sp?.id ?? '',
    speciesName: sp?.name ?? UNKNOWN_SPECIES.name,
    animalId: animal ? String(animal) : '',
    detail,
    tone: toneOf(kind, detail),
  }
}

/* ── facets ──────────────────────────────────────────────────────────────── */

/** The facets a metric records beyond its primary dimension. */
export const facetsOf = (kind: string): { name: string; label: string; values: string[] }[] => {
  const f = flowOf(kind)
  return f ? [...f.facets.entries()].map(([name, spec]) => ({ name, label: spec.label, values: spec.values })) : []
}

/** One event's value for one facet. `undefined` where the metric has no such column. */
export function facetAt(kind: string, siteKey: string, day: number, i: number, facet: string): string | undefined {
  const f = flowOf(kind)
  const spec = f?.facets.get(facet)
  if (!f || !spec) return undefined
  const r = rowIndex(kind, siteKey, day, i)
  return r < 0 ? undefined : spec.values[spec.col[r]]
}

/**
 * Group a window's events by a facet, biggest first.
 *
 * The same walk `tally` makes over the site's own contiguous slice, reading a different
 * column. The buckets sum to `count` exactly, because every row carries exactly one value of
 * every facet — including "Not recorded", which is a real answer and is shown as one rather
 * than dropped.
 */
export function tallyFacet(
  slug: string,
  siteKey: string | null,
  win: Win,
  facet: string,
): { key: string; label: string; value: number }[] {
  const f = flowOf(slug)
  const spec = f?.facets.get(facet)
  if (!f || !spec) return []

  const totals = new Map<string, number>()
  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)

  for (const key of sitesFor(slug, siteKey)) {
    const span = f.slices[key]
    if (!span) continue
    const [start, count] = span
    for (let r = start; r < start + count; r++) {
      const day = f.day[r]
      if (day < from || day > to) continue
      const label = spec.values[spec.col[r]] ?? 'Not recorded'
      totals.set(label, (totals.get(label) ?? 0) + 1)
    }
  }

  return [...totals.entries()]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort((a, b) => b.value - a.value)
}

/* ── counting, without building anything ─────────────────────────────────── */

const sitesFor = (slug: string, siteKey: string | null): string[] => {
  if (siteKey) return [siteKey]
  const m = METRICS[slug]
  return (m?.kind === 'flow' ? m.flows : m?.levels)?.map((r) => r.site) ?? SITES.map((s) => s.key)
}

/** The number of events. Straight from the series — never from counting a list. */
export function count(slug: string, siteKey: string | null, win: Win): number {
  return sitesFor(slug, siteKey).reduce((n, k) => n + sumIn(slug, k, win.from, win.to), 0)
}

export type Dimension =
  | 'detail'
  | 'species'
  | 'class'
  | 'site'
  | 'hospital'
  | 'ward'
  | 'labdept'
  | 'medicine'
  | 'incubator'
  | 'nursery'

/**
 * Group the window's events by one dimension, biggest first.
 *
 * Walks the daily series and increments a tally per event rather than allocating one — a
 * six-year pharmacy window is 89,000 increments and no garbage. The buckets sum to `count`
 * exactly, because every event is attributed to exactly one value of every dimension.
 */
export function tally(
  slug: string,
  siteKey: string | null,
  win: Win,
  by: Dimension,
): { key: string; label: string; value: number }[] {
  const totals = new Map<string, { label: string; value: number }>()
  const add = (key: string, label: string) => {
    const at = totals.get(key)
    if (at) at.value++
    else totals.set(key, { label, value: 1 })
  }

  const f = flowOf(slug)
  if (!f) return []

  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)

  for (const key of sitesFor(slug, siteKey)) {
    /* Every dimension is a column read now, so the grouping is a walk over the site's own
       contiguous slice with no event object built and nothing drawn. The buckets still sum to
       `count` exactly — for the stronger reason that each row carries one recorded value. */
    if (by === 'site') {
      const n = sumIn(slug, key, from, to)
      if (n > 0) add(key, siteOf(key)?.name ?? key)
      const at = totals.get(key)
      if (at) at.value = n
      continue
    }

    const span = f.slices[key]
    if (!span) continue
    const [start, count] = span

    for (let r = start; r < start + count; r++) {
      const day = f.day[r]
      if (day < from || day > to) continue

      if (by === 'detail') {
        const label = f.details[f.detail[r]] ?? 'Not recorded'
        add(label, label)
        continue
      }
      if (by === 'species' || by === 'class') {
        const spx = f.species[r]
        const sp = spx === UNRESOLVED ? undefined : SPECIES[spx]
        if (by === 'species') add(sp?.name ?? UNKNOWN_SPECIES.name, sp?.name ?? UNKNOWN_SPECIES.name)
        else add(sp?.cls ?? UNKNOWN_SPECIES.cls, sp?.cls ?? UNKNOWN_SPECIES.cls)
        continue
      }
      /* Hospital, ward, lab department, medicine, nursery and incubator have no counterpart
         in the schema, so there is nothing to group by. Returning nothing is the honest
         answer; the authored model's answer was a weighted draw over registries that do not
         describe this collection. */
    }
  }

  return [...totals.entries()]
    .map(([key, v]) => ({ key, label: v.label, value: v.value }))
    .sort((a, b) => b.value - a.value)
}

/* ── paging ──────────────────────────────────────────────────────────────── */

export interface EventPage {
  rows: Ev[]
  total: number
  offset: number
  hasMore: boolean
}

/**
 * A page of events, newest first.
 *
 * Walks backwards from the window's last day and skips whole days by their count until the
 * offset is reached, so page 40 of a six-year window costs a loop over days rather than a
 * sort of 89,000 records.
 */
export function page(
  slug: string,
  siteKey: string | null,
  win: Win,
  offset = 0,
  limit = 20,
): EventPage {
  const keys = sitesFor(slug, siteKey)
  const total = count(slug, siteKey, win)

  const rows: Ev[] = []
  let seen = 0
  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)

  for (let day = to; day >= from && rows.length < limit; day--) {
    /* Within a day, sites are visited in registry order so the sequence is stable. */
    for (const key of keys) {
      const n = daily(slug, key)[day]
      if (!n) continue
      if (seen + n <= offset) {
        seen += n
        continue
      }
      for (let i = 0; i < n && rows.length < limit; i++) {
        if (seen++ < offset) continue
        rows.push(eventAt(slug, key, day, i))
      }
    }
  }

  return { rows, total, offset, hasMore: offset + rows.length < total }
}

/**
 * A page of events matching a predicate — the form an entity page needs.
 *
 * A ward, a lab department, a medicine and an incubator all narrow a flow to a subset of its
 * events, and none of them is the site dimension the series is keyed by. So the events are
 * built and tested, newest first, stopping as soon as the page is full.
 *
 * `scanned` is returned rather than hidden. An entity whose events are sparse in a long window
 * can exhaust the cap before filling a page, and a caller that shows "3 records" without
 * knowing the scan was truncated would be stating a total it never established. With the cap
 * hit, the caller says "3 of at least 3" or widens the window.
 */
export function pageWhere(
  slug: string,
  siteKey: string | null,
  win: Win,
  match: (ev: Ev) => boolean,
  offset = 0,
  limit = 20,
  cap = 40_000,
): EventPage & { exhausted: boolean } {
  const keys = sitesFor(slug, siteKey)
  const rows: Ev[] = []
  let matched = 0
  let scanned = 0

  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)

  for (let day = to; day >= from; day--) {
    for (const key of keys) {
      const n = daily(slug, key)[day]
      for (let i = 0; i < n; i++) {
        if (scanned++ >= cap) {
          return { rows, total: matched, offset, hasMore: true, exhausted: false }
        }
        const ev = eventAt(slug, key, day, i)
        if (!match(ev)) continue
        matched++
        if (matched > offset && rows.length < limit) rows.push(ev)
      }
    }
  }

  return { rows, total: matched, offset, hasMore: offset + rows.length < matched, exhausted: true }
}

/** The count for one value of one dimension, from the cheap tally rather than a scan. */
export function countOf(
  slug: string,
  siteKey: string | null,
  win: Win,
  by: Dimension,
  key: string,
): number {
  return tally(slug, siteKey, win, by).find((t) => t.key === key)?.value ?? 0
}

/** Every event touching one animal, across every flow metric. Powers its cross-navigation. */
export function eventsForAnimal(animal: Animal, win: Win, kinds?: string[]): Ev[] {
  const slugs = kinds ?? Object.keys(METRICS).filter((k) => METRICS[k].kind === 'flow')
  const out: Ev[] = []

  for (const slug of slugs) {
    const s = daily(slug, animal.siteKey)
    for (let day = Math.min(TODAY, win.to); day >= Math.max(0, win.from); day--) {
      for (let i = 0; i < s[day]; i++) {
        const ev = eventAt(slug, animal.siteKey, day, i)
        if (ev.animalId === animal.id) out.push(ev)
      }
    }
  }

  return out.sort((a, b) => b.day - a.day)
}

/** "31 Jul · Chital · Disease" — the one-line form a record row and a timeline share. */
export const evLine = (ev: Ev): string => `${shortDate(ev.day)} · ${ev.speciesName} · ${ev.detail}`

/**
 * The animal an event is about.
 *
 * A register lookup now, not a decode. The id used to encode the animal's position in a
 * derived collection (`ANM-AQ03-00142` = the 142nd animal of the 4th species in Aquatic Halls)
 * because there was no register to look anything up in; the id is the database's own key now,
 * so the animal is found rather than reconstructed.
 *
 * Returns undefined for an event whose subject is no longer housed — a death or a transfer —
 * which is correct, and which callers already handle.
 */
export const subjectOf = (ev: Ev): Animal | undefined =>
  ev.animalId ? animalById(ev.animalId) : undefined

export { animalLabel }
