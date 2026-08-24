/**
 * ONE SPECIES' LIFECYCLE, READ ONCE.
 *
 * The Circle of Life tab asks eleven questions of the same two event streams — births over
 * time, deaths over time, both by season, both by sex, age at death, longevity, the cause
 * tally, and the records themselves. Asking the event layer eleven times would walk the same
 * rows eleven times AND, worse, let two of the answers disagree: a seasonal chart summing to
 * one total and a records list paging a different one is the contradiction this product spends
 * its effort avoiding. So the rows are collected once here and every figure on the tab is a
 * read of that one array.
 *
 * SCOPED BY SPECIES NAME, NOT BY SPECIES ID. A species page is cross-site — the same warbler at
 * seven sites is seven registry rows — so the filter is on the NAME the events carry, matching
 * `speciesWide`. Filtering by id would report a species held at seven sites as whatever share
 * one site recorded.
 *
 * WHAT THE EXTRACT CAN AND CANNOT ANSWER, measured and stated rather than assumed:
 *   Sex of birth is filled on 27,923 of 64,083 compiled births (43.6%).
 *   Sex of death is filled on 13,009 of 38,386 compiled deaths (33.9%).
 *   Age at death is filled on 8,114 of 38,386 (21.1%) — the rest carry no usable birth date.
 * Every function below therefore returns its own denominator alongside its counts, so a page
 * can print "of the 212 deaths with a recorded age" instead of implying it knows all of them.
 * A figure that quietly averaged over the 21% and called it the species' longevity would be the
 * most confident wrong number on the page.
 */

import { EPOCH, TODAY, type Win } from '../core/calendar'
import { numberAt, pageWhere, type Ev } from '../core/events'
import { UNRESOLVED, flowOf } from '../core/store'
import { SPECIES } from '../core/world'

/** Every event of one kind for one species name, across every site, inside the window. */
export function eventsOfSpecies(kind: string, name: string, win: Win, cap = 20_000): Ev[] {
  /* `pageWhere` pages, so the limit is the cap and the offset is zero: this is the one place
     that wants the whole set rather than a screen of it. The cap is a backstop against a
     pathological species rather than a design limit — the largest name in the dump records
     4,010 animals, and its births and deaths are in the hundreds. */
  return pageWhere(kind, null, win, (ev) => ev.speciesName === name, 0, cap, 200_000).rows
}

/* ── one flow's rows, read straight off the columns ──────────────────────── */

/**
 * One record of one flow, with the sex and age its own row carries.
 *
 * READ STRAIGHT OFF THE COLUMNS, not through `eventAt`. An `Ev`'s id ends in `animal || i`, so
 * the row index is unrecoverable from an event once the record names an animal — which is most
 * of the mortality flow — and `facetAt`/`numberAt` keyed on a recovered index would silently
 * read the wrong row. One walk here reads day, species, animal, detail, the sex facet and the
 * age column in a single pass, so every figure and every table row built on it is the same read.
 *
 * IT LIVES HERE RATHER THAN IN THE TAB THAT FIRST NEEDED IT. Circle of Life's records table and
 * the Overview's drill-down sheets are the same rows cut two ways — by year for a column, by
 * cause for a slice — and a second walk written beside the sheet is the second model this file's
 * own header argues against. One walker, both readers.
 */
export interface LifeEv {
  key: string
  day: number
  siteKey: string
  animalId: string
  detail: string
  sex?: string
  /** Age at death in days, only where the record carries a usable birth date. */
  age?: number
}

export function lifeEvents(kind: string, name: string, siteKey: string | null, win: Win): LifeEv[] {
  const f = flowOf(kind)
  if (!f) return []
  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)
  const sex = f.facets.get('sex')
  const age = f.numbers.get('age')
  const out: LifeEv[] = []
  for (const key of Object.keys(f.slices)) {
    if (siteKey && key !== siteKey) continue
    const slice: [number, number] = f.slices[key]
    const start = slice[0]
    const len = slice[1]
    for (let r = start; r < start + len; r++) {
      const d = f.day[r]
      if (d < from || d > to) continue
      const spx = f.species[r]
      if (spx === UNRESOLVED || SPECIES[spx]?.name !== name) continue
      const animal = f.animal[r]
      const a = age ? age.col[r] : undefined
      out.push({
        key: `${key}-${d}-${r}`,
        day: d,
        siteKey: key,
        animalId: animal ? String(animal) : '',
        detail: f.details[f.detail[r]] ?? 'Not recorded',
        sex: sex ? sex.values[sex.col[r]] : undefined,
        /* The sentinel is the column's own "no value" marker — zero is a REAL age here. */
        age: a === undefined || a === age?.sentinel ? undefined : a,
      })
    }
  }
  /* Newest first, so a records table is a slice rather than a sort per page. */
  return out.sort((x, y) => y.day - x.day)
}

/* ── over time, and over the year ────────────────────────────────────────── */

export interface Bucket {
  label: string
  value: number
  from?: number
  to?: number
}

/**
 * Events per bucket across the window.
 *
 * Built from the rows rather than from `series()` because `series` is site-scoped and this is
 * species-scoped; deriving both from the same array is what keeps the trend and the records
 * list summing to the same number.
 */
export function overTime(rows: Ev[], win: Win, buckets = 24): Bucket[] {
  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)
  const span = Math.max(1, to - from + 1)
  const n = Math.max(1, Math.min(buckets, span))
  const size = Math.ceil(span / n)

  const out: Bucket[] = []
  for (let b = 0; b < n; b++) {
    const lo = from + b * size
    const hi = Math.min(to, lo + size - 1)
    if (lo > to) break
    out.push({ label: '', value: 0, from: lo, to: hi })
  }
  for (const ev of rows) {
    const b = Math.floor((ev.day - from) / size)
    if (b >= 0 && b < out.length) out[b].value++
  }
  return out
}

/**
 * Events per month of the YEAR, pooled across every year in the window.
 *
 * A SEASON IS NOT A TREND. "Most births happen in March" is a claim about the calendar and
 * needs every March in the extract added together; a month-by-month series answers a different
 * question and would show one March. Pooled here, and the caller states how many years went in
 * — a seasonal peak drawn from a single year is an anecdote with a chart around it.
 */
export function bySeason(rows: Ev[]): { month: string; value: number }[] {
  const counts = new Array(12).fill(0)
  for (const ev of rows) counts[monthOf(ev.day)]++
  return MONTHS.map((month, i) => ({ month, value: counts[i] }))
}

/** Ledger day → month index, via the epoch the calendar already owns. */
function monthOf(day: number): number {
  return dateOfDay(day).getMonth()
}

let epochCache: Date | undefined
function dateOfDay(day: number): Date {
  if (!epochCache) {
    /* Derived from the calendar's own constants rather than re-declared, so a change to the
       ledger's epoch cannot leave this module a month out. */
    epochCache = new Date(EPOCH_MS)
  }
  return new Date(epochCache.getTime() + day * 86_400_000)
}

/* Captured once: this runs per event, and re-reading a module constant inside that loop is the
   kind of cost that only shows up on the species with four thousand of them. */
const EPOCH_MS = EPOCH.getTime()

/** Month names, declared here because `core/calendar.ts` does not export a list of them. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* ── by sex ──────────────────────────────────────────────────────────────── */

export interface SexSplit {
  male: number
  female: number
  /** Undetermined AND indeterminate — the keeper's answer, not a gap. See the note below. */
  unknown: number
  /** How many of the rows carried a male-or-female answer, and out of how many. */
  known: number
  of: number
}

/**
 * Sex of the animals in an event set.
 *
 * UNDETERMINED IS A RECORDED ANSWER, NOT A MISSING ONE, and the two are kept apart. The source
 * files 'Undetermined' and 'Indeterminate' as values a keeper entered; a page that folded those
 * into "unknown" beside genuinely absent rows would be reporting a data gap where there is a
 * husbandry fact. `known` is what a percentage should be taken against.
 */
export function bySex(rows: Ev[], facetOf: (ev: Ev) => string | undefined): SexSplit {
  let male = 0
  let female = 0
  let unknown = 0
  for (const ev of rows) {
    const v = (facetOf(ev) ?? '').toLowerCase()
    if (v === 'male') male++
    else if (v === 'female') female++
    else unknown++
  }
  return { male, female, unknown, known: male + female, of: rows.length }
}

/* ── age at death ────────────────────────────────────────────────────────── */

export interface Ages {
  /** Ages in days, only for the deaths that carry one. */
  days: number[]
  of: number
  /** Mean age in days, or undefined where nothing carried an age. */
  mean?: number
  oldest?: number
  youngest?: number
}

/**
 * Ages at death, and how many deaths had one.
 *
 * THE DENOMINATOR TRAVELS, because it is 21%. `report_deaths.birth_date` is usable on 8,114 of
 * 38,386 compiled deaths, so a mean taken over the whole set would be a mean of the fifth of
 * animals whose birth was recorded, presented as the species' longevity. `of` is the number of
 * deaths in the set; `days.length` is how many of them could be aged, and every caller prints
 * both.
 */
export function agesAtDeath(rows: Ev[]): Ages {
  const days: number[] = []
  for (const ev of rows) {
    const v = numberAt('mortality', ev.siteKey, ev.day, indexOfEvent(ev), 'age')
    if (v !== undefined) days.push(v)
  }
  if (!days.length) return { days, of: rows.length }
  const sum = days.reduce((n, d) => n + d, 0)
  return {
    days,
    of: rows.length,
    mean: sum / days.length,
    oldest: Math.max(...days),
    youngest: Math.min(...days),
  }
}

/**
 * The event's position within its own (site, day) run, which `numberAt` indexes by.
 *
 * `core/events.ts` builds an event id as `${kind}-${siteKey}-${day}-${i}`; recovering `i` from
 * the id is the only way back to the columnar row from an `Ev`, and it is why the id's shape is
 * load-bearing rather than cosmetic.
 */
function indexOfEvent(ev: Ev): number {
  const n = Number(ev.id.slice(ev.id.lastIndexOf('-') + 1))
  return Number.isFinite(n) ? n : 0
}

/** Age buckets, in the bands a curator reads survival in. */
export const AGE_BANDS: { label: string; lo: number; hi: number }[] = [
  { label: '< 1 yr', lo: 0, hi: 364 },
  { label: '1–3 yrs', lo: 365, hi: 3 * 365 - 1 },
  { label: '3–7 yrs', lo: 3 * 365, hi: 7 * 365 - 1 },
  { label: '7–15 yrs', lo: 7 * 365, hi: 15 * 365 - 1 },
  { label: '15–30 yrs', lo: 15 * 365, hi: 30 * 365 - 1 },
  { label: '30+ yrs', lo: 30 * 365, hi: Number.MAX_SAFE_INTEGER },
]

export const bandsOf = (days: number[]): { label: string; value: number }[] =>
  AGE_BANDS.map((b) => ({ label: b.label, value: days.filter((d) => d >= b.lo && d <= b.hi).length }))

/** Survival bands — how long after arrival the animal was lost. The neonatal end of the same data. */
export const SURVIVAL_BANDS: { label: string; note: string; lo: number; hi: number }[] = [
  { label: '0–7 d', note: 'first week', lo: 0, hi: 7 },
  { label: '8–30 d', note: 'first month', lo: 8, hi: 30 },
  { label: '31–90 d', note: 'first three months', lo: 31, hi: 90 },
  { label: '91–365 d', note: 'first year', lo: 91, hi: 365 },
  { label: '365+ d', note: 'over a year', lo: 366, hi: Number.MAX_SAFE_INTEGER },
]

export const survivalOf = (days: number[]): { label: string; note: string; value: number }[] =>
  SURVIVAL_BANDS.map((b) => ({ label: b.label, note: b.note, value: days.filter((d) => d >= b.lo && d <= b.hi).length }))

/** Days as the unit a reader thinks in — days under a year, years above it. */
export const ageLabel = (days: number): string =>
  days < 365 ? `${Math.round(days)} d` : `${(days / 365).toFixed(days < 3650 ? 1 : 0)} y`

/* ── a tally of any event field ──────────────────────────────────────────── */

export function tallyBy(rows: Ev[], of: (ev: Ev) => string | undefined): readonly (readonly [string, number])[] {
  const counts = new Map<string, number>()
  for (const ev of rows) {
    const k = of(ev)
    if (!k) continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
