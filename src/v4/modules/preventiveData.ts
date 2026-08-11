/**
 * PREVENTIVE MEDICATION — the derivation layer.
 *
 * Three programmes, and the module answers two different kinds of question about them:
 *
 *   ACTIVITY   how many were given, over the window the reader picked. A flow, summed —
 *              `vaccinations`, `deworming`, `supplement` in `core/metrics.ts`.
 *   DUE STATUS how many are outstanding right now. A reading, not a window sum.
 *
 * KEEPING THOSE TWO APART IS THE WHOLE POINT OF THIS FILE. "How many vaccinations happened
 * in July" and "how many animals are overdue" are answered from different metrics on
 * different clocks, and a page that lets the date filter move the overdue count is telling
 * the reader that changing the dates cured some animals. So every activity figure here
 * takes a `Scope` and every due-status figure takes a site only.
 *
 * NOTHING ABOUT OVERDUE IS AUTHORED. The vaccination and deworming metrics are rates —
 * covered out of an eligible herd — so the animals outstanding are exactly `of − now`, per
 * site, and the total, the buckets, the site distribution, the species distribution and the
 * individual records are all that one number decomposed. The alternative was a typed "62
 * overdue" beside a typed 92% coverage, which is what the page had, and the two could not
 * be checked against each other because they were not the same claim.
 *
 * HOW AN OUTSTANDING ANIMAL IS IDENTIFIED. The eligible herd of a site is apportioned
 * across the species it holds, by the same weights the population uses, so the roster sums
 * to the herd exactly. The outstanding animals are the tail of that roster — a deterministic
 * selection, so the same animal is overdue on every read, from every path — and the count
 * taken is exactly the coverage gap. Days overdue is then apportioned across the four
 * buckets, so the buckets sum to the gap without any of them being typed.
 *
 * Supplements have no due status at all, and the page states none: a mineral mix given with
 * feed has no covered / not-covered state to be late against. Inventing one would be the
 * exact failure this file exists to avoid.
 */

import { TODAY, longDate, shortDate, type Win } from '../../core/calendar'
import { eventAt } from '../../core/events'
import { daily } from '../../core/series'
import { METRICS } from '../../core/metrics'
import { bySpecies, figure, records as recordsIn } from '../../core/query'
import { siteKeyOf, type Scope } from '../../core/scope'
import { animalById, type Animal } from '../../core/animals'
import { SITES, siteOf, speciesIn, type Site } from '../../core/world'

/* ── the three programmes ────────────────────────────────────────────────── */

export type StreamKey = 'vaccination' | 'deworming' | 'supplement'

export interface Stream {
  key: StreamKey
  label: string
  /** The flow metric — how many were administered. */
  activity: string
  /** The rate metric — how much of the herd is protected. Absent where there is no protocol. */
  cover?: string
  /**
   * The flow metric of doses SCHEDULED AND NOT GIVEN.
   *
   * This is what the source means by overdue: a `vaccination` or `deworming` row whose status
   * is Pending and whose `administered_on` is null. It replaces the coverage-gap derivation —
   * see the note on `rosterFor`.
   */
  due?: string
  /** What one administration is called on a record row. */
  noun: string
  /** The classifying dimension's own name: a vaccine, a drug, a supplement. */
  agent: string
  accent: string
}

export const STREAMS: Record<StreamKey, Stream> = {
  vaccination: {
    key: 'vaccination',
    label: 'Vaccination',
    activity: 'vaccinations',
    cover: 'vaccination',
    due: 'vaccinationDue',
    noun: 'vaccinations',
    agent: 'Vaccine',
    accent: '#00afd6',
  },
  deworming: {
    key: 'deworming',
    label: 'Deworming',
    activity: 'deworming',
    cover: 'dewormingCover',
    due: 'dewormingDue',
    noun: 'treatments',
    agent: 'Treatment',
    accent: '#006d35',
  },
  supplement: {
    key: 'supplement',
    label: 'Supplements',
    activity: 'supplement',
    noun: 'administrations',
    agent: 'Supplement',
    accent: '#e4b819',
  },
}

export const STREAM_LIST: Stream[] = [STREAMS.vaccination, STREAMS.deworming, STREAMS.supplement]

/** The module's own accent — used for the hero and anything that spans all three. */
/** MD3_Antz OnPrimaryContainer — the parent programme ramp. */
export const PREVENTIVE_ACCENT = '#1f515b'

/* ── activity, over the window ───────────────────────────────────────────── */

/** How many were administered in the window, under the scope. Never a due-status figure. */
export const activityOf = (scope: Scope, stream: Stream): number =>
  Math.round(figure(scope, stream.activity).value)

/* ── coverage, right now ─────────────────────────────────────────────────── */

export interface Coverage {
  covered: number
  herd: number
  percent: number
  /** The coverage gap — the animals with an outstanding dose. */
  outstanding: number
}

const levelsOf = (slug: string) => METRICS[slug]?.levels ?? []

/** One site's coverage, or the collection's. Read on today, never over a window. */
export function coverageOf(siteKey: string | null, stream: Stream): Coverage | undefined {
  if (!stream.cover) return undefined
  const rows = levelsOf(stream.cover).filter((r) => !siteKey || r.site === siteKey)
  if (rows.length === 0) return undefined
  const covered = rows.reduce((n, r) => n + r.now, 0)
  const herd = rows.reduce((n, r) => n + (r.of ?? 0), 0)
  return {
    covered,
    herd,
    percent: herd ? (covered / herd) * 100 : 0,
    outstanding: Math.max(0, herd - covered),
  }
}

/* ── the outstanding roster ──────────────────────────────────────────────── */

/**
 * The four buckets an outstanding dose falls into, by how late it is.
 *
 * COUNTED FROM REAL SCHEDULED DATES, not apportioned across weights. There used to be a table
 * of bucket weights here — vaccination `[8, 34, 28, 30]` — because the roster was a derivation
 * from a coverage gap and the gap carried no dates. Every pending row in the source carries the
 * date the dose was scheduled for, so lateness is a subtraction and the buckets are a count.
 */
export const BUCKETS = ['Due today', '1–7 days', '8–15 days', 'Over 15 days'] as const
export type Bucket = (typeof BUCKETS)[number]

const bucketFor = (days: number): Bucket =>
  days <= 0 ? 'Due today' : days <= 7 ? '1–7 days' : days <= 15 ? '8–15 days' : 'Over 15 days'

export interface OverdueRow {
  animalId: string
  speciesId: string
  speciesName: string
  siteKey: string
  siteName: string
  /** The vaccine or the anthelmintic that is outstanding — the row's own medicine name. */
  agent: string
  /** Ledger index the dose was scheduled for. */
  dueOn: number
  daysOverdue: number
  bucket: Bucket
  /** Ledger index of the last administration, where the animal has had one. */
  lastOn?: number
}

/**
 * One site's outstanding doses, in full.
 *
 * WHAT THIS REPLACES, AND WHY IT HAD TO GO. The roster used to be built from the coverage gap:
 * eligible herd minus covered animals, apportioned across species, with the lateness of each
 * animal drawn from a seeded coin. That was sound when coverage was an authored rate against
 * an authored eligible herd. Against the database it is not: there is no protocol table, so the
 * "eligible herd" became every housed animal, so the gap became 110,020 − 9,942 per stream and
 * the page reported 186,477 animals overdue. That figure was an artefact of the denominator,
 * not a fact about the collection.
 *
 * The source answers the question directly. A `vaccination` or `deworming` row with status
 * Pending is a dose that was scheduled and not given — 1,781 and 5,098 of them — and each
 * carries its animal, its species, its site, its medicine and the date it was due. So the
 * roster is those rows, and "days overdue" is today minus that date.
 */
const rosterCache = new Map<string, OverdueRow[]>()

export function rosterFor(siteKey: string, stream: Stream): OverdueRow[] {
  const cacheKey = `${stream.key}:${siteKey}`
  const hit = rosterCache.get(cacheKey)
  if (hit) return hit
  if (!stream.due) return []

  const site = siteOf(siteKey)
  if (!site) return []

  /* Everything scheduled from the start of the ledger to today. A dose scheduled for a future
     date is not overdue and is not in the window. */
  const win: Win = { key: 'all', label: '', noun: '', from: 0, to: TODAY, days: TODAY + 1, window: '' }
  const out: OverdueRow[] = []

  const s = daily(stream.due, siteKey)
  for (let day = Math.min(TODAY, win.to); day >= 0; day--) {
    for (let i = 0; i < s[day]; i++) {
      const ev = eventAt(stream.due, siteKey, day, i)
      const daysOverdue = TODAY - ev.day
      out.push({
        animalId: ev.animalId,
        speciesId: ev.speciesId,
        speciesName: ev.speciesName,
        siteKey,
        siteName: site.name,
        agent: ev.detail,
        dueOn: ev.day,
        daysOverdue,
        bucket: bucketFor(daysOverdue),
      })
    }
  }

  /* Latest first: the animal forty days late is the one an executive wants at the top. */
  const sorted = out.sort((a, b) => b.daysOverdue - a.daysOverdue)
  rosterCache.set(cacheKey, sorted)
  return sorted
}

/** The outstanding roster across the scope's sites. */
export function roster(siteKey: string | null, stream: Stream): OverdueRow[] {
  const keys = siteKey ? [siteKey] : SITES.map((s) => s.key)
  return keys.flatMap((k) => rosterFor(k, stream)).sort((a, b) => b.daysOverdue - a.daysOverdue)
}

export interface BucketTally {
  bucket: Bucket
  value: number
}

/** The four buckets under a scope. Sums to the outstanding count, by construction. */
export function buckets(siteKey: string | null, stream: Stream): BucketTally[] {
  const rows = roster(siteKey, stream)
  return BUCKETS.map((bucket) => ({ bucket, value: rows.filter((r) => r.bucket === bucket).length }))
}

/** Overdue strictly — everything past its due date, so excluding what is due today. */
export const overdueCount = (siteKey: string | null, stream: Stream): number =>
  roster(siteKey, stream).filter((r) => r.daysOverdue > 0).length

export const badlyOverdue = (siteKey: string | null, stream: Stream): number =>
  roster(siteKey, stream).filter((r) => r.daysOverdue > 15).length

/* ── distributions of the outstanding roster ─────────────────────────────── */

export interface Dist {
  id: string
  label: string
  sub?: string
  value: number
  percent: number
}

const distribute = (rows: OverdueRow[], by: (r: OverdueRow) => { id: string; label: string; sub?: string }): Dist[] => {
  const map = new Map<string, { label: string; sub?: string; value: number }>()
  for (const r of rows) {
    const k = by(r)
    const at = map.get(k.id)
    if (at) at.value++
    else map.set(k.id, { label: k.label, sub: k.sub, value: 1 })
  }
  const total = rows.length || 1
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v, percent: (v.value / total) * 100 }))
    .sort((a, b) => b.value - a.value)
}

/** Outstanding by site — the answer to "which sites have the highest overdue count". */
export const overdueBySite = (siteKey: string | null, stream: Stream, minDays = 0): Dist[] =>
  distribute(
    roster(siteKey, stream).filter((r) => r.daysOverdue >= minDays),
    (r) => ({ id: r.siteKey, label: r.siteName }),
  )

export const overdueBySpecies = (siteKey: string | null, stream: Stream, minDays = 0): Dist[] =>
  distribute(
    roster(siteKey, stream).filter((r) => r.daysOverdue >= minDays),
    (r) => ({ id: r.speciesId, label: r.speciesName, sub: r.siteName }),
  )

export const overdueByAgent = (siteKey: string | null, stream: Stream, minDays = 0): Dist[] =>
  distribute(
    roster(siteKey, stream).filter((r) => r.daysOverdue >= minDays),
    (r) => ({ id: r.agent, label: r.agent }),
  )

/* ── the per-site and per-species tables ─────────────────────────────────── */

export interface SiteLine {
  site: Site
  /** Administered in the window. */
  given: number
  covered: number
  herd: number
  percent: number
  overdue: number
  over15: number
  species: number
}

/** One line per site for a stream — activity from the window, due status from today. */
export function siteLines(scope: Scope, stream: Stream): SiteLine[] {
  const scoped = siteKeyOf(scope)
  return SITES.filter((s) => !scoped || s.key === scoped).map((site) => {
    const cover = coverageOf(site.key, stream)
    const rows = rosterFor(site.key, stream)
    return {
      site,
      given: Math.round(figure({ ...scope, site }, stream.activity).value),
      covered: cover?.covered ?? 0,
      herd: cover?.herd ?? 0,
      percent: cover?.percent ?? 0,
      overdue: rows.filter((r) => r.daysOverdue > 0).length,
      over15: rows.filter((r) => r.daysOverdue > 15).length,
      species: speciesIn(site.key).length,
    }
  })
}

export interface PreventiveSiteLine {
  site: Site
  vaccinations: number
  vaccinationOverdue: number
  vaccinationOver15: number
  deworming: number
  dewormingOverdue: number
  supplements: number
}

/** The consolidated site comparison — one row per site, all three programmes. */
export function preventiveSiteLines(scope: Scope): PreventiveSiteLine[] {
  const scoped = siteKeyOf(scope)
  return SITES.filter((s) => !scoped || s.key === scoped).map((site) => {
    const vac = rosterFor(site.key, STREAMS.vaccination)
    const dew = rosterFor(site.key, STREAMS.deworming)
    const at = { ...scope, site }
    return {
      site,
      vaccinations: Math.round(figure(at, 'vaccinations').value),
      vaccinationOverdue: vac.filter((r) => r.daysOverdue > 0).length,
      vaccinationOver15: vac.filter((r) => r.daysOverdue > 15).length,
      deworming: Math.round(figure(at, 'deworming').value),
      dewormingOverdue: dew.filter((r) => r.daysOverdue > 0).length,
      supplements: Math.round(figure(at, 'supplement').value),
    }
  })
}

export interface SpeciesLine {
  id: string
  name: string
  cls: string
  siteName: string
  siteKey: string
  vaccinations: number
  vaccinationOverdue: number
  deworming: number
  dewormingOverdue: number
  supplements: number
}

/**
 * One line per species, for the whole collection.
 *
 * Ninety-seven species, so the list is searched and paged rather than rendered whole — see
 * the caller. The activity figures come from the species split of each flow, which is the
 * same split the records enumerate, so a species line and its record list agree.
 */
export function speciesLines(scope: Scope): SpeciesLine[] {
  const scoped = siteKeyOf(scope)
  const keys = scoped ? [scoped] : SITES.map((s) => s.key)

  const activity = new Map<string, { vaccinations: number; deworming: number; supplements: number }>()
  const bump = (name: string, field: 'vaccinations' | 'deworming' | 'supplements', n: number) => {
    const at = activity.get(name) ?? { vaccinations: 0, deworming: 0, supplements: 0 }
    at[field] += n
    activity.set(name, at)
  }
  /* `bySpecies` is the same split the species drill enumerates, so a species line here and a
     species row in a drill sheet are the same figure rather than two counts of one thing. */
  for (const [slug, field] of [
    ['vaccinations', 'vaccinations'],
    ['deworming', 'deworming'],
    ['supplement', 'supplements'],
  ] as const) {
    for (const row of bySpecies(scope, slug)) bump(row.label, field, row.value)
  }

  const overdue = new Map<string, { vac: number; dew: number }>()
  for (const stream of [STREAMS.vaccination, STREAMS.deworming]) {
    for (const r of roster(scoped, stream)) {
      if (r.daysOverdue <= 0) continue
      const at = overdue.get(r.speciesId) ?? { vac: 0, dew: 0 }
      if (stream.key === 'vaccination') at.vac++
      else at.dew++
      overdue.set(r.speciesId, at)
    }
  }

  return keys
    .flatMap((k) => speciesIn(k))
    .map((sp) => {
      const a = activity.get(sp.name) ?? { vaccinations: 0, deworming: 0, supplements: 0 }
      const o = overdue.get(sp.id) ?? { vac: 0, dew: 0 }
      return {
        id: sp.id,
        name: sp.name,
        cls: sp.cls,
        siteName: siteOf(sp.siteKey)?.name ?? sp.siteKey,
        siteKey: sp.siteKey,
        vaccinations: a.vaccinations,
        vaccinationOverdue: o.vac,
        deworming: a.deworming,
        dewormingOverdue: o.dew,
        supplements: a.supplements,
      }
    })
    .sort((a, b) => b.vaccinations + b.deworming + b.supplements - (a.vaccinations + a.deworming + a.supplements))
}

/* ── record pages ────────────────────────────────────────────────────────── */

/** A page of administered records — the events behind an activity figure. */
export const administered = (scope: Scope, stream: Stream, offset = 0, limit = 20) =>
  recordsIn(scope, stream.activity, offset, limit)

export interface AnimalCard {
  animal?: Animal
  id: string
  speciesName: string
  siteName: string
}

/**
 * The animal behind an overdue row.
 *
 * A register lookup on the row's own database id. It used to slice an ordinal out of the
 * composite id and rebuild the animal from it, because ids encoded position rather than
 * identity. `animal` is undefined where the dose was scheduled against an animal no longer
 * housed, which the card already handles.
 */
export function animalOf(row: OverdueRow): AnimalCard {
  return {
    animal: animalById(row.animalId),
    id: row.animalId,
    speciesName: row.speciesName,
    siteName: row.siteName,
  }
}

/* ── labels ──────────────────────────────────────────────────────────────── */

export const dueLabel = (row: OverdueRow): string =>
  row.daysOverdue === 0 ? `Due today · ${shortDate(row.dueOn)}` : `${row.daysOverdue} d overdue · due ${shortDate(row.dueOn)}`

export const lastLabel = (row: OverdueRow): string =>
  row.lastOn === undefined ? 'No previous record' : longDate(row.lastOn)

/** "Overall · July 2025" or "Aquatic Halls · July 2025" — stated on every card that is cut. */
export const scopeLine = (scope: Scope): string => `${scope.site?.name ?? 'Overall'} · ${scope.win.window}`

export const dayIn = (win: Win, i: number, n: number): number =>
  Math.min(TODAY, win.from + Math.floor((i * win.days) / n))
