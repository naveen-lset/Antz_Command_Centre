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
import { detailsFor, protocolSpecies } from '../../core/events'
import { METRICS } from '../../core/metrics'
import { bySpecies, figure, records as recordsIn } from '../../core/query'
import { siteKeyOf, type Scope } from '../../core/scope'
import { apportion, draw } from '../../core/seed'
import { animalAt, animalId, type Animal } from '../../core/animals'
import { SITES, siteOf, speciesIn, type Site, type Species } from '../../core/world'

/* ── the three programmes ────────────────────────────────────────────────── */

export type StreamKey = 'vaccination' | 'deworming' | 'supplement'

export interface Stream {
  key: StreamKey
  label: string
  /** The flow metric — how many were administered. */
  activity: string
  /** The rate metric — how much of the herd is protected. Absent where there is no protocol. */
  cover?: string
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
    noun: 'vaccinations',
    agent: 'Vaccine',
    accent: '#00afd6',
  },
  deworming: {
    key: 'deworming',
    label: 'Deworming',
    activity: 'deworming',
    cover: 'dewormingCover',
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
 * The four buckets, and the weights the gap is split across them.
 *
 * Weights, not counts — the counts come from apportioning the site's own coverage gap, so
 * they sum to it exactly at every site and therefore across the collection. Vaccination
 * carries the longer tail because a missed booster round slips a month; a worming round is
 * repeated on a shorter cycle, so its lateness clusters nearer the due date.
 */
export const BUCKETS = ['Due today', '1–7 days', '8–15 days', 'Over 15 days'] as const
export type Bucket = (typeof BUCKETS)[number]

const BUCKET_WEIGHTS: Record<StreamKey, number[]> = {
  vaccination: [8, 34, 28, 30],
  deworming: [6, 33, 30, 31],
  supplement: [0, 0, 0, 0],
}

/** The day ranges each bucket covers, used to give a record a real due date. */
const BUCKET_DAYS: [number, number][] = [
  [0, 0],
  [1, 7],
  [8, 15],
  [16, 96],
]

export interface OverdueRow {
  animalId: string
  speciesId: string
  speciesName: string
  siteKey: string
  siteName: string
  /** The vaccine or the anthelmintic that is outstanding. */
  agent: string
  /** Ledger index the dose was due on. */
  dueOn: number
  daysOverdue: number
  bucket: Bucket
  /** Ledger index of the last administration, where the animal has had one before. */
  lastOn?: number
}

/**
 * One site's outstanding animals, in full.
 *
 * Built rather than stored, and built the same way every time: the eligible herd is
 * apportioned across the site's species, the tail of each species' roster is the part that
 * is outstanding, and the agent and the exact lateness are seeded on the animal's own id.
 *
 * Bounded by construction — the largest site's gap is 63 animals — so this returns the
 * whole list and the callers page it for display rather than the other way round.
 */
const rosterCache = new Map<string, OverdueRow[]>()

export function rosterFor(siteKey: string, stream: Stream): OverdueRow[] {
  const cacheKey = `${stream.key}:${siteKey}`
  const hit = rosterCache.get(cacheKey)
  if (hit) return hit

  if (!stream.cover) return []
  const row = levelsOf(stream.cover).find((r) => r.site === siteKey)
  const site = siteOf(siteKey)
  if (!row || !site) return []

  const herd = row.of ?? 0
  const gap = Math.max(0, herd - row.now)
  if (gap === 0) return []

  /* THE PROTOCOL HERD, NOT THE WHOLE SITE. Apportioning across every species Aquatic Halls
     holds puts a tenth of the roster on prawns and snails, which no vaccine reaches — so the
     species pool is the one the record stream draws from, which is the classes the
     vocabulary can actually treat. The herd and the gap both land inside it, so the counts
     still sum to the coverage metric exactly. */
  const species = protocolSpecies(siteKey, stream.activity)
  const perSpeciesHerd = apportion(herd, species.map((s) => s.weight))
  const perSpeciesGap = apportion(gap, species.map((s) => s.weight))

  const out: OverdueRow[] = []
  species.forEach((sp: Species, i) => {
    const eligible = perSpeciesHerd[i]
    const short = Math.min(perSpeciesGap[i], eligible)
    if (short <= 0) return

    /* The agent vocabulary this species can actually receive — the same rule the record
       stream draws under, so the vaccine an animal is overdue for is one it could be given.
       Resolved once per species rather than once per animal. */
    const agents = detailsFor(stream.activity, sp.cls)
    const total = agents.reduce((n, a) => n + a.weight, 0) || 1

    /* The tail of the species' own roster. A rule rather than a random draw, so the same
       animal is outstanding on every read and a record opened twice is the same record. */
    for (let k = 0; k < short; k++) {
      const n = eligible - k
      if (n < 1) break
      const id = animalId(sp.id, n)
      let t = draw(`${stream.key}:${id}:agent`) * total
      let agent = agents[agents.length - 1].label
      for (const a of agents) {
        t -= a.weight
        if (t <= 0) {
          agent = a.label
          break
        }
      }
      out.push({
        animalId: id,
        speciesId: sp.id,
        speciesName: sp.name,
        siteKey,
        siteName: site.name,
        agent,
        dueOn: TODAY,
        daysOverdue: 0,
        bucket: 'Due today',
      })
    }
  })

  /* Lateness is apportioned over the whole site rather than drawn per animal, so the four
     buckets sum to the coverage gap instead of landing near it. */
  const counts = apportion(out.length, BUCKET_WEIGHTS[stream.key])
  let at = 0
  counts.forEach((n, b) => {
    const [lo, hi] = BUCKET_DAYS[b]
    for (let i = 0; i < n && at < out.length; i++, at++) {
      const r = out[at]
      const days = lo + Math.floor(draw(`${stream.key}:${r.animalId}:late`) * (hi - lo + 1))
      r.daysOverdue = days
      r.dueOn = Math.max(0, TODAY - days)
      r.bucket = BUCKETS[b]
      /* A previous administration exists for most of the herd — the programme has run for
         years — but never before the animal existed. A six-month-old calf with a booster
         dated last year is the kind of detail that makes a reader stop believing the page,
         so the animal's own birth is the floor and a younger one simply has no prior. */
      const prior = draw(`${stream.key}:${r.animalId}:prior`)
      const last = r.dueOn - 120 - Math.floor(prior * 240)
      const born = animalAt(r.speciesId, Number(r.animalId.slice(-5)))?.bornOn ?? 0
      if (prior > 0.18 && last > born) r.lastOn = last
    }
  })

  /* Latest first: the animal 40 days late is the one an executive wants at the top. */
  const sorted = out.sort((a, b) => b.daysOverdue - a.daysOverdue)
  /* Cached for the session. The roster depends on the coverage metric and nothing else —
     not on the window, not on anything the reader can change — so rebuilding it on every
     render of six sections would be pure waste. */
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

/** The four buckets under a scope. Sums to the coverage gap, by construction. */
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

/** The animal behind an overdue row, built on demand. */
export function animalOf(row: OverdueRow): AnimalCard {
  const n = Number(row.animalId.slice(-5))
  return {
    animal: animalAt(row.speciesId, n),
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
