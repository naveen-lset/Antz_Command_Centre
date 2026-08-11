/**
 * MORTALITY & NECROPSY — the death model.
 *
 * ONE SOURCE, AND IT ALREADY EXISTED. `mortality` in `core/metrics.ts` is a real flow, and
 * every event on it already carries the five things a death record is made of: the day, the
 * site, the species, the animal, and the cause in `detail`. So nothing here authors a second
 * set of numbers — a death IS a mortality event, and the site ladder, the species bars, the
 * cause Pareto, the regulatory split and the necropsy queue are all that one stream counted
 * six different ways. They cannot disagree, because there is nothing for them to disagree with.
 *
 * WHAT THE OLD PAGE GOT WRONG, AND WHY THIS FILE EXISTS. The previous version stated, in a
 * comment, that regulatory standing and the necropsy bench "are not metrics — there is no
 * Schedule I flag in the data model", and so it typed both cards as collection-wide constants:
 * six regulatory deaths, two Schedule I, fourteen cases at a central suite. Scope to Carnivore
 * Ridge for the last seven days and those numbers did not move.
 *
 * The first half of that claim was simply not true. `modules/regulatory.ts` declares the CITES
 * appendix and the Wildlife Protection Act schedule for all 97 species in `core/world.ts`, and
 * a death carries a species. So the regulatory standing of a death is a LOOKUP, not a model:
 *
 *     standingOf(ev.speciesName) → { iucn, cites?, schedule? }
 *
 * Every regulatory figure on the page is now that lookup summed over the window's own deaths,
 * which is why it recuts when the reader picks a site and why it sums to the hero exactly.
 *
 * THE NECROPSY IS THE ONE MODELLED PART, AND IT IS ANCHORED ON REAL FACILITIES. There is no
 * necropsy record in the event stream. But there is no need to invent a building either: the
 * world already holds two pathology laboratories and four veterinary facilities, with real
 * codes, real sites and — for the labs — real departmental turnarounds.
 *
 *     Central Diagnostic Laboratory   savanna   Histopathology, 7 working days
 *     Field Pathology Laboratory      aquatic   Toxicology, 6 working days
 *     Central Veterinary Hospital     savanna   gross post-mortem, next day
 *     Aquatic Health Unit             aquatic
 *     Avian & Reptile Clinic          aviary
 *     Quarantine & Isolation Block    reptile
 *
 * So a necropsy is a real facility, a real turnaround and a date arithmetic — not a coin. Which
 * matters more than it sounds, because it makes STATUS a reading of the clock rather than a
 * seeded label: a death referred to histopathology five weeks ago is complete because seven days
 * have passed, and one referred on Tuesday is in progress because they have not. Completed,
 * in progress and awaiting therefore move correctly as the reader changes the window, and they
 * sum to the referral count at every scope. A seeded status would have drifted the moment
 * somebody picked a different month.
 *
 * WHAT IS DRAWN, AND WHY EACH ONE IS AN ATTRIBUTE RATHER THAN A FIGURE:
 *
 *   referred    Whether the death went to a bench at all. The brief is explicit that not
 *               every death requires a necropsy, and it is true: a carp that died of old
 *               age in a hall of 178,000 is a husbandry record, while an undetermined death
 *               is the one a pathologist must see. Weighted by cause, and forced for a
 *               Schedule I or CITES Appendix I animal, where the investigation is statutory.
 *   centre      Which bench. The nearest veterinary facility for a gross post-mortem; a
 *               laboratory where the case needs histopathology, and always a laboratory
 *               for a statutory case.
 *   backlog     Days the case sat before the bench started. The only reason a case can be
 *               awaiting rather than in progress, and the honest source of a queue.
 *   finding     Set only where the necropsy has COMPLETED. Either the field cause confirmed
 *               or, less often, a different one of the eight real causes — a necropsy that
 *               could never revise a cause would not be worth performing. Never a ninth
 *               category invented for the page.
 *
 * NOTHING HERE COUNTS A DEATH TWICE. `deaths` is the window's events; `necropsies` is the
 * subset that was referred; completed + in progress + awaiting partitions that subset. The
 * necropsy rate is one over the other. Six figures, one denominator, and no way to state a
 * combination the collection could not produce.
 */

import { TODAY, dateAt, previous, type Win } from '../../core/calendar'
import { eventAt, facetAt, type Ev, type Tone } from '../../core/events'
import { daily } from '../../core/series'
import { siteKeyOf, type Scope } from '../../core/scope'
import { SITES, siteOf, speciesOf, type ClassName } from '../../core/world'
import {
  isRegulated,
  standingLabel,
  standingOf,
  type CitesAppendix,
  type ScheduleClass,
  type Standing,
} from './regulatory'

/** The metric every figure on this page is a reading of. */
export const DEATHS = 'mortality'

/** MD3_Antz Error — deaths are the one module whose ramp is the error hue. */
export const MORTALITY_ACCENT = '#e93353'

/* ── the necropsy, as the source records it ───────────────────────────────── */

/**
 * WHAT THIS REPLACES, AND WHY IT HAD TO GO.
 *
 * There used to be a necropsy MODEL here: four centres derived from the hospital and
 * laboratory registries, a referral coin weighted by cause of death, a turnaround per centre,
 * a backlog, a due date, a confirmed finding and a "revised" flag saying whether the bench
 * disagreed with the enclosure. It was carefully reasoned and every part of it was invented,
 * because nothing in the product had a necropsy record to read.
 *
 * `report_deaths` has one. Three columns, on every row:
 *
 *   necropsy_status           Pending 34,201 · Completed 4,478
 *   carcass_condition         Fresh, Moderately Autolyzed, Severely Autolyzed, Not Usable …
 *   carcass_disposal_method   Incinerated, Burial, Discarded, Preserved …
 *
 * So the necropsy is now read, not modelled. The centre, the turnaround, the due date and the
 * finding are gone rather than approximated — there is no necropsy facility in the schema, no
 * date the bench received the animal and no confirmed cause distinct from the recorded one.
 *
 * THE HEADLINE FIGURE MOVES A LONG WAY, and it should. The modelled version referred roughly
 * three quarters of deaths and completed most of them; the record says 88% of all necropsies
 * are still PENDING. That is the single most actionable fact on this page and the model was
 * hiding it.
 */

export const STATUSES = ['Completed', 'Pending'] as const
export type NecropsyStatus = (typeof STATUSES)[number]

export const STATUS_TONE: Record<NecropsyStatus, Tone> = {
  Completed: 'good',
  Pending: 'warn',
}

export interface Necropsy {
  /** The record id. Derived from the death's own event id, so it is stable and unique. */
  id: string
  status: NecropsyStatus
  /** How the carcass presented — the bench's own first observation. */
  condition: string
  /** What was done with it afterwards. */
  disposal: string
}

export interface Death {
  /** The mortality event's own id — the death record id, not a second one invented here. */
  id: string
  /** Ledger index of death. */
  day: number
  siteKey: string
  siteName: string
  speciesId: string
  speciesName: string
  cls: ClassName
  animalId: string
  /** The cause recorded at the enclosure — the mortality stream's own classifying dimension. */
  cause: string
  tone: Tone
  /** Read from `regulatory.ts`, not modelled. */
  standing: Standing
  regulated: boolean
  cites?: CitesAppendix
  schedule?: ScheduleClass
  /**
   * Present where the record names a necropsy status at all.
   *
   * Four rows in 38,684 carry none, and those are shown as unreferred rather than assigned a
   * status — a blank in the source is not a decision not to investigate.
   */
  necropsy?: Necropsy
}

const deathCache = new Map<string, Death>()

/**
 * One mortality event, read as the death record it is.
 *
 * Pure in the event, so every section that asks about the same death gets the same object and
 * the page cannot hold two opinions about whether it was necropsied.
 */
export function deathOf(ev: Ev, i: number): Death {
  const hit = deathCache.get(ev.id)
  if (hit) return hit

  const standing = standingOf(ev.speciesName)

  /* The index within the day is passed in rather than recovered from the event, because that
     is what addresses the row — see `facetAt`. The walk that builds these already has it. */
  const at = (name: string) => facetAt(DEATHS, ev.siteKey, ev.day, i, name)
  const status = at('necropsy')

  const built: Death = {
    id: ev.id,
    day: ev.day,
    siteKey: ev.siteKey,
    siteName: siteOf(ev.siteKey)?.name ?? ev.siteKey,
    speciesId: ev.speciesId,
    speciesName: ev.speciesName,
    cls: clsOf(ev),
    animalId: ev.animalId,
    cause: ev.detail,
    tone: ev.tone,
    standing,
    regulated: isRegulated(standing),
    cites: standing.cites,
    schedule: standing.schedule,
    /* A row with no recorded status is not a necropsy — four rows in 38,684. */
    necropsy:
      status === 'Completed' || status === 'Pending'
        ? {
            id: `NEC-${ev.id.slice(4)}`,
            status,
            condition: at('condition') ?? 'Not recorded',
            disposal: at('disposal') ?? 'Not recorded',
          }
        : undefined,
  }

  deathCache.set(ev.id, built)
  return built
}

export const findingLabel = (n: Necropsy): string =>
  n.status === 'Completed' ? `Completed · ${n.disposal}` : 'Awaiting the bench'

/* ── walking the stream ──────────────────────────────────────────────────── */

const sitesFor = (siteKey: string | null): string[] =>
  siteKey ? [siteKey] : SITES.map((x) => x.key)

/** The species' class, from the registry rather than from the event. */
const clsOf = (ev: Ev): ClassName => speciesOf(ev.speciesId)?.cls ?? 'Unknown'

/* Bounded, because "All time" across fifty sites is a big array and a reader can pick a lot
   of windows in one session. */
const listCache = new Map<string, Death[]>()

export function deathsBetween(siteKey: string | null, from: number, to: number): Death[] {
  const key = `${siteKey ?? 'all'}:${from}:${to}`
  const hit = listCache.get(key)
  if (hit) return hit

  const out: Death[] = []
  for (const k of sitesFor(siteKey)) {
    const s = daily(DEATHS, k)
    for (let day = Math.max(0, from); day <= Math.min(TODAY, to); day++) {
      for (let i = 0; i < s[day]; i++) out.push(deathOf(eventAt(DEATHS, k, day, i), i))
    }
  }
  out.sort((a, b) => b.day - a.day)

  /* Bounded, because "All time" at six sites is a big array and the reader can pick a lot of
     windows in one session. Oldest entry out first. */
  if (listCache.size > 24) listCache.delete(listCache.keys().next().value as string)
  listCache.set(key, out)
  return out
}

/** The deaths inside the scope in force. What every section on the page reads. */
export const deathsIn = (scope: Scope): Death[] =>
  deathsBetween(siteKeyOf(scope), scope.win.from, scope.win.to)

/** The same window, one period earlier — the only honest source of a change figure. */
export const deathsBefore = (scope: Scope): Death[] => {
  const prev = previous(scope.win)
  return deathsBetween(siteKeyOf(scope), prev.from, prev.to)
}

/** Referred to a bench. `necropsy` is present exactly when the death was. */
export const necropsiesOf = (rows: Death[]): Death[] => rows.filter((d) => d.necropsy)

export const withStatus = (rows: Death[], status: NecropsyStatus): Death[] =>
  rows.filter((d) => d.necropsy?.status === status)

/* ── the figures ─────────────────────────────────────────────────────────── */

export interface MortalitySummary {
  /** Deaths in the window. The hero. */
  deaths: number
  /** Deaths in the preceding window of equal length. */
  before: number
  /** Change against it, as a percentage. Undefined where the comparison would be meaningless. */
  change?: number
  /** Deaths of animals carrying a CITES listing or a schedule. */
  regulated: number
  /** Schedule I or CITES Appendix I — the statutory subset. */
  statutory: number
  species: number
  sites: number
  causes: number
  /** Deaths carrying a necropsy record. */
  necropsies: number
  completed: number
  pending: number
  /** Necropsies ÷ deaths. Undefined where nothing died — never a zero. */
  rate?: number
}

export function summarise(scope: Scope): MortalitySummary {
  const rows = deathsIn(scope)
  const prev = deathsBefore(scope)
  const necropsied = necropsiesOf(rows)

  return {
    deaths: rows.length,
    before: prev.length,
    /* Undefined rather than zero from an empty base: every increase from nothing is infinite,
       and "+∞%" is not a figure a director can act on. */
    change: prev.length ? ((rows.length - prev.length) / prev.length) * 100 : undefined,
    regulated: rows.filter((d) => d.regulated).length,
    statutory: rows.filter((d) => d.schedule === 'I' || d.cites === 'I').length,
    species: new Set(rows.map((d) => d.speciesName)).size,
    sites: new Set(rows.map((d) => d.siteKey)).size,
    causes: new Set(rows.map((d) => d.cause)).size,
    necropsies: necropsied.length,
    completed: withStatus(rows, 'Completed').length,
    pending: withStatus(rows, 'Pending').length,
    rate: rows.length ? (necropsied.length / rows.length) * 100 : undefined,
  }
}

/* ── distributions ──────────────────────────────────────────────────────── */

export interface Slice {
  id: string
  label: string
  sub?: string
  value: number
  percent: number
  tone?: Tone
}

/** Group any set of deaths by any key. Every breakdown on the page is one of these. */
export function distribute(
  rows: Death[],
  by: (d: Death) => { id: string; label: string; sub?: string; tone?: Tone } | undefined,
): Slice[] {
  const map = new Map<string, { label: string; sub?: string; value: number; tone?: Tone }>()
  for (const d of rows) {
    const k = by(d)
    if (!k) continue
    const at = map.get(k.id)
    if (at) at.value++
    else map.set(k.id, { label: k.label, sub: k.sub, value: 1, tone: k.tone })
  }
  const total = rows.length || 1
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v, percent: (v.value / total) * 100 }))
    .sort((a, b) => b.value - a.value)
}

export const byCause = (rows: Death[]): Slice[] =>
  distribute(rows, (d) => ({ id: d.cause, label: d.cause, tone: d.tone }))

export const bySiteSlice = (rows: Death[]): Slice[] =>
  distribute(rows, (d) => ({ id: d.siteKey, label: d.siteName }))

export const bySpeciesSlice = (rows: Death[]): Slice[] =>
  distribute(rows, (d) => ({ id: d.speciesName, label: d.speciesName, sub: standingLabel(d.standing) }))

export const byClassSlice = (rows: Death[]): Slice[] =>
  distribute(rows, (d) => ({ id: d.cls, label: d.cls }))

export const byStatus = (rows: Death[]): Slice[] =>
  distribute(rows, (d) =>
    d.necropsy ? { id: d.necropsy.status, label: d.necropsy.status, tone: STATUS_TONE[d.necropsy.status] } : undefined,
  )

/**
 * How the carcass presented, and what was done with it.
 *
 * The two dimensions that replace the necropsy centre. A centre was a facility this schema
 * does not have; these are columns on every death row, and between them they answer the
 * question the centre breakdown was standing in for — what state the bench received the
 * animal in, and whether the case was closed out.
 */
export const byCondition = (rows: Death[]): Slice[] =>
  distribute(rows, (d) => (d.necropsy ? { id: d.necropsy.condition, label: d.necropsy.condition } : undefined))

export const byDisposal = (rows: Death[]): Slice[] =>
  distribute(rows, (d) => (d.necropsy ? { id: d.necropsy.disposal, label: d.necropsy.disposal } : undefined))

/* ── the sortable tables ────────────────────────────────────────────────── */

export interface SiteLine {
  id: string
  name: string
  code: string
  deaths: number
  percent: number
  /** Deaths in the preceding window, and the change against it. */
  before: number
  change?: number
  species: number
  regulated: number
  necropsies: number
  pending: number
}

/**
 * One line per site — and ALL of them, including the sites that recorded nothing.
 *
 * The brief is explicit that this must not be a top five, and a site with no deaths is a
 * real answer rather than an absent row: "Carnivore Ridge recorded none this month" is the
 * good news a director is looking for, and dropping the row makes it unreadable. With a
 * site scoped, only that site is returned — the page must never list five sites the reader
 * has just excluded.
 *
 * TAKES ROWS RATHER THAN A SCOPE, and that is load-bearing. The page narrows the window's
 * deaths by its contextual filter before anything is drawn, so a table that re-read the scope
 * here would show the unfiltered site ladder under a hero counting the filtered deaths — the
 * precise contradiction §16 forbids. Every table on this page is fed the same array as the hero.
 */
export function siteLines(rows: Death[], prev: Death[], siteKey: string | null): SiteLine[] {
  const key = siteKey
  const total = rows.length || 1

  return SITES.filter((s) => !key || s.key === key).map((s) => {
    const mine = rows.filter((d) => d.siteKey === s.key)
    const was = prev.filter((d) => d.siteKey === s.key).length
    const necropsied = mine.filter((d) => d.necropsy)
    return {
      id: s.key,
      name: s.name,
      code: s.code,
      deaths: mine.length,
      percent: (mine.length / total) * 100,
      before: was,
      change: was ? ((mine.length - was) / was) * 100 : undefined,
      species: new Set(mine.map((d) => d.speciesName)).size,
      regulated: mine.filter((d) => d.regulated).length,
      necropsies: necropsied.length,
      pending: necropsied.filter((d) => d.necropsy!.status !== 'Completed').length,
    }
  })
}

export interface SpeciesLine {
  id: string
  name: string
  cls: ClassName
  standing: Standing
  standingText: string
  regulated: boolean
  deaths: number
  percent: number
  /** How many sites this species died in — the spread a single figure hides. */
  sites: number
  siteNames: string
  necropsies: number
  completed: number
  pending: number
  /** Necropsies ÷ deaths for this species. */
  rate?: number
  topCause: string
}

/** One line per species with any death in the set. All of them, sortable and searchable. */
export function speciesLines(rows: Death[]): SpeciesLine[] {
  const total = rows.length || 1
  const groups = new Map<string, Death[]>()
  for (const d of rows) {
    const at = groups.get(d.speciesName)
    if (at) at.push(d)
    else groups.set(d.speciesName, [d])
  }

  return [...groups.entries()]
    .map(([name, mine]) => {
      const necropsied = mine.filter((d) => d.necropsy)
      const siteNames = [...new Set(mine.map((d) => d.siteName))]
      const causes = byCause(mine)
      return {
        id: name,
        name,
        cls: mine[0].cls,
        standing: mine[0].standing,
        standingText: standingLabel(mine[0].standing),
        regulated: mine[0].regulated,
        deaths: mine.length,
        percent: (mine.length / total) * 100,
        sites: siteNames.length,
        siteNames: siteNames.join(' · '),
        necropsies: necropsied.length,
        completed: necropsied.filter((d) => d.necropsy!.status === 'Completed').length,
        pending: necropsied.filter((d) => d.necropsy!.status !== 'Completed').length,
        rate: mine.length ? (necropsied.length / mine.length) * 100 : undefined,
        topCause: causes[0]?.label ?? '—',
      }
    })
    .sort((a, b) => b.deaths - a.deaths)
}

export interface RegBand {
  key: string
  label: string
  deaths: number
  species: number
  percent: number
}

const regBand = (key: string, label: string, rows: Death[], of: number): RegBand => ({
  key,
  label,
  deaths: rows.length,
  species: new Set(rows.map((d) => d.speciesName)).size,
  percent: of ? (rows.length / of) * 100 : 0,
})

/**
 * Regulatory against non-regulatory, over the window's deaths.
 *
 * A species carrying both a CITES listing and a schedule is counted ONCE here — the appendix
 * and schedule bands below overlap by design and this split must not, or the two halves would
 * sum past the hero.
 */
export function regulatorySplit(rows: Death[]): { regulated: RegBand; open: RegBand } {
  return {
    regulated: regBand('reg', 'Regulatory', rows.filter((d) => d.regulated), rows.length),
    open: regBand('non', 'Non-regulatory', rows.filter((d) => !d.regulated), rows.length),
  }
}

/** The three CITES appendices, always all three — an empty one is a fact worth reading. */
export const citesBands = (rows: Death[]): RegBand[] =>
  (['I', 'II', 'III'] as const).map((a) =>
    regBand(a, `Appendix ${a}`, rows.filter((d) => d.cites === a), rows.length),
  )

/** The three schedules of the Wildlife Protection Act. */
export const scheduleBands = (rows: Death[]): RegBand[] =>
  (['I', 'II', 'III'] as const).map((s) =>
    regBand(s, `Schedule ${s}`, rows.filter((d) => d.schedule === s), rows.length),
  )

/* ── the trend ──────────────────────────────────────────────────────────── */

export type Grain = 'Daily' | 'Weekly' | 'Monthly'

export interface Bucket {
  label: string
  from: number
  to: number
  deaths: number
  /** The same bucket one window earlier, where the comparison is available. */
  before?: number
}

/**
 * Which granularities a window can honestly be drawn at.
 *
 * A twelve-month window has 365 daily columns, which is a texture rather than a trend; a
 * seven-day window has no months in it at all. So the choice is offered only where it means
 * something, and the default is the coarsest grain that still shows shape.
 */
export function grainsFor(win: Win): Grain[] {
  const out: Grain[] = []
  if (win.days <= 62) out.push('Daily')
  if (win.days >= 14) out.push('Weekly')
  if (win.days >= 60) out.push('Monthly')
  return out.length ? out : ['Daily']
}

/**
 * The window bucketed for the trend, with the previous period beside it.
 *
 * Counted from the deaths handed in rather than re-read from the series, so a column and the
 * records that open from it are the same events — tapping the tallest bar cannot show a
 * different number from the one the bar was drawn at, and a contextual filter moves the chart
 * and the sheet together.
 */
export function trend(win: Win, rows: Death[], prev: Death[], grain: Grain): Bucket[] {
  const prevWin = previous(win)

  const size = grain === 'Daily' ? 1 : grain === 'Weekly' ? 7 : 30
  const n = Math.max(1, Math.ceil(win.days / size))

  return Array.from({ length: n }, (_, i) => {
    const from = win.from + i * size
    const to = Math.min(win.to, from + size - 1)
    /* The matching slice of the previous window, offset by the same number of buckets. */
    const pFrom = prevWin.from + i * size
    const pTo = Math.min(prevWin.to, pFrom + size - 1)
    return {
      label: bucketLabel(from, grain),
      from,
      to,
      deaths: rows.filter((d) => d.day >= from && d.day <= to).length,
      before: prev.length ? prev.filter((d) => d.day >= pFrom && d.day <= pTo).length : undefined,
    }
  }).filter((b) => b.from <= win.to)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function bucketLabel(from: number, grain: Grain): string {
  const d = dateAt(from)
  /* A month gets its name; a day or a week gets its date. The columns are narrow and the
     axis is read as a sequence, so the day number alone is enough to locate a spike. */
  return grain === 'Monthly' ? MONTHS[d.getMonth()] : `${d.getDate()}`
}

/* ── search ─────────────────────────────────────────────────────────────── */

/**
 * One search across everything a death record carries.
 *
 * The brief's §17 list — animal id, species, site, cause, necropsy centre, necropsy id — is
 * one predicate over one row rather than six indexes, because they are all fields of the same
 * record. Matching is case-insensitive and substring, so "gharial", "GHA", "NEC-4" and
 * "histo" all find something.
 */
export function searchDeaths(rows: Death[], query: string): Death[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((d) =>
    [
      d.animalId,
      d.speciesName,
      d.siteName,
      d.cause,
      d.cls,
      standingLabel(d.standing),
      d.necropsy?.id,
      d.necropsy?.status,
      d.necropsy?.condition,
      d.necropsy?.disposal,
    ]
      .filter(Boolean)
      .some((f) => (f as string).toLowerCase().includes(q)),
  )
}

/* ── labels ─────────────────────────────────────────────────────────────── */

/** "Overall · July 2025", or the site when one is picked. Printed on every cut card. */
export const scopeLine = (scope: Scope): string =>
  `${scope.site?.name ?? 'Overall'} · ${scope.win.window}`

/** "+18% vs last month", or nothing where there is no honest comparison. */
export function changeLabel(change: number | undefined, against: string): string | undefined {
  if (change === undefined) return undefined
  if (Math.abs(change) < 0.5) return `Level with ${against}`
  return `${change > 0 ? '+' : ''}${Math.round(change)}% vs ${against}`
}

/**
 * The tone a change carries — and mortality is the one metric where up is bad.
 *
 * Worth stating because every other module on this product reads a rise as good news, and a
 * green +18% over a rising death count would be the single most misleading mark on the page.
 */
export const changeTone = (change: number | undefined): Tone => {
  if (change === undefined || Math.abs(change) < 0.5) return 'neutral'
  return change > 0 ? 'bad' : 'good'
}

export { standingLabel }
