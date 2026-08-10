/**
 * MEDICAL & HOSPITALS — the case model.
 *
 * ONE SOURCE, AND IT ALREADY EXISTED. `admissions` is a real flow in `core/metrics.ts`,
 * hospital- and ward-attributed on every event, with the presenting complaint as its
 * classifying dimension. That IS a medical case: an animal, a hospital, a ward, a
 * complaint, a date. So nothing here authors a second set of numbers — a case is an
 * admission event given the attributes a case has, and every figure on the page is that
 * one stream counted a different way.
 *
 * WHAT THE MODEL ADDS, AND WHY EACH ONE IS A CASE ATTRIBUTE RATHER THAN A METRIC:
 *
 *   stay        A case that opened is open until it closes. Seeded per case, so the
 *               length of stay, the discharge date, whether the animal is in hospital
 *               tonight, and the average stay are all the same fact read four ways.
 *   severity    Critical / Serious / Stable / Recovering.
 *   outcome     Set only when the case has closed. Recovery rate and hospital mortality
 *               are two slices of this one field, so they sum to discharges exactly and
 *               cannot drift apart. Weighted by severity, because a critical case and a
 *               recovering one do not end the same way.
 *   surgery     A procedure some cases involve. Weighted by complaint — a wound is
 *               operated on, an ocular sign usually is not.
 *   medication  Active courses, and only while the case is open. Drawn from the
 *               therapeutic classes of the real medicine registry, never from the vaccine
 *               or anthelmintic classes: those are the preventive module's business and
 *               counting them here would be the Pharmacy page wearing a stethoscope.
 *
 * WHY NOT AUTHOR "57 HOSPITALISED" AND "8.4 DAYS" AS FIGURES. Because they are not
 * independent. In-patients ≈ admissions × stay ÷ window, and a page that types all three
 * will state a combination no hospital could produce. Deriving in-patients and average
 * stay from one seeded stay per case makes the three arithmetically inseparable.
 *
 * TWO CLOCKS, KEPT APART — the brief's §19. A case opened twenty days ago is still open
 * today, so:
 *   · EVENT figures  (cases opened, discharges, surgeries, deaths, recovery) are cut to
 *     the window the reader picked.
 *   · STATUS figures (in hospital now, active medications now) are read today and ignore
 *     the window entirely.
 * Every caller takes a `Scope` for the first kind and a site/hospital only for the second.
 */

import { TODAY, type Win } from '../../core/calendar'
import { eventAt, type Ev } from '../../core/events'
import { daily } from '../../core/series'
import { siteKeyOf, type Scope } from '../../core/scope'
import { draw } from '../../core/seed'
import {
  HOSPITALS,
  MEDICINES,
  SITES,
  hospitalOf,
  siteOf,
  wardOf,
  type Hospital,
  type Medicine,
} from '../../core/world'

/** The metric every figure on this page is a reading of. */
export const CASES = 'admissions'

/** The module's accent — the medical red the KPI card and the module already share. */
/** MD3_Antz OnSecondaryContainer — the caseload ramp. */
export const MEDICAL_ACCENT = '#1f415b'

/**
 * The longest a case can stay open.
 *
 * Load-bearing rather than cosmetic: "who is in hospital tonight" is answered by scanning
 * admissions back this far and no further, so the constant is the cost of that question.
 * Sixty days covers an orthopaedic repair and a long quarantine, and bounds the scan at
 * about a hundred events.
 */
const MAX_STAY = 60

/* ── the case ────────────────────────────────────────────────────────────── */

export const SEVERITIES = ['Critical', 'Serious', 'Stable', 'Recovering'] as const
export type Severity = (typeof SEVERITIES)[number]

export const OUTCOMES = ['Recovered', 'Improved · monitored', 'Referred to enclosure', 'Died in care'] as const
export type Outcome = (typeof OUTCOMES)[number]

export interface Medication {
  id: string
  name: string
  kind: string
  /** Ledger index the course started. */
  startOn: number
}

export interface MedCase {
  /** The admission event's own id — the case id, not a second one invented here. */
  id: string
  /** Ledger index of admission. */
  day: number
  siteKey: string
  siteName: string
  hospitalId: string
  hospitalName: string
  wardId?: string
  wardName?: string
  speciesId: string
  speciesName: string
  animalId: string
  /** The presenting complaint — the admission stream's own classifying dimension. */
  complaint: string
  severity: Severity
  stay: number
  /** Ledger index the case closed on. In the future while the case is open. */
  closesOn: number
  open: boolean
  /** Only where the case has closed. An open case has no outcome yet, and states none. */
  outcome?: Outcome
  surgery?: { procedure: string; day: number }
  /** Active courses. Empty once the case has closed. */
  medications: Medication[]
}

const SEVERITY_WEIGHTS: [Severity, number][] = [
  ['Critical', 6],
  ['Serious', 16],
  ['Stable', 47],
  ['Recovering', 31],
]

/** Outcome odds by how the animal presented. A critical case does not end like a stable one. */
const OUTCOME_WEIGHTS: Record<Severity, [Outcome, number][]> = {
  Critical: [
    ['Recovered', 48],
    ['Improved · monitored', 18],
    ['Referred to enclosure', 6],
    ['Died in care', 28],
  ],
  Serious: [
    ['Recovered', 74],
    ['Improved · monitored', 14],
    ['Referred to enclosure', 6],
    ['Died in care', 6],
  ],
  Stable: [
    ['Recovered', 88],
    ['Improved · monitored', 7],
    ['Referred to enclosure', 4],
    ['Died in care', 1],
  ],
  Recovering: [
    ['Recovered', 93],
    ['Improved · monitored', 4],
    ['Referred to enclosure', 3],
    ['Died in care', 0],
  ],
}

/** How likely a complaint is to end in theatre, and what the procedure is called. */
const SURGICAL: Record<string, [number, string[]]> = {
  'Wound / abscess': [0.46, ['Wound debridement', 'Abscess drainage', 'Laceration repair']],
  Lameness: [0.34, ['Fracture pinning', 'Joint exploration', 'Digit amputation']],
  'Critical presentation': [0.38, ['Exploratory laparotomy', 'Emergency stabilisation']],
  Gastrointestinal: [0.16, ['Exploratory laparotomy', 'Foreign body removal']],
  Ocular: [0.22, ['Enucleation', 'Corneal repair']],
  Dermatological: [0.08, ['Mass excision']],
  'Respiratory signs': [0.06, ['Tracheal stent']],
  'Reduced appetite': [0.05, ['Dental extraction']],
}

/** Therapeutic classes only — vaccines and anthelmintics belong to Preventive Medication. */
const THERAPEUTIC = MEDICINES.filter((m) =>
  (['Antibiotic', 'Analgesic', 'Antifungal', 'Fluid'] as Medicine['category'][]).includes(m.category),
)

const pickWeighted = <T,>(rows: [T, number][], t: number): T => {
  const total = rows.reduce((n, r) => n + r[1], 0) || 1
  let at = t * total
  for (const [value, weight] of rows) {
    at -= weight
    if (at <= 0) return value
  }
  return rows[rows.length - 1][0]
}

const caseCache = new Map<string, MedCase>()

/** One admission event, read as the case it is. Pure in the event, so stable on every read. */
export function caseOf(ev: Ev): MedCase {
  const hit = caseCache.get(ev.id)
  if (hit) return hit

  const hospital = ev.hospitalId ? hospitalOf(ev.hospitalId) : undefined
  const ward = ev.wardId ? wardOf(ev.wardId) : undefined
  const severity = pickWeighted(SEVERITY_WEIGHTS, draw(`${ev.id}:sev`))

  /* Stay, skewed hard toward short: most cases are a few days and the tail is the
     orthopaedics and the quarantines. The exponent is what sets the mean — a uniform 2–60
     would put the average stay in the middle of the range, which is the one shape a
     hospital never has. At 4 the mean lands near thirteen days, which is also what makes
     the in-patient count come out at roughly cases × stay ÷ window. Change it and the
     average stay, the bed occupancy and the discharge count all move together, which is
     the point of deriving them from one number. */
  const stay = 2 + Math.round(Math.pow(draw(`${ev.id}:stay`), 4) * (MAX_STAY - 2))
  const closesOn = ev.day + stay
  const open = closesOn > TODAY

  const [chance, procedures] = SURGICAL[ev.detail] ?? [0.05, ['Minor procedure']]
  const hasSurgery = draw(`${ev.id}:surg`) < chance

  const built: MedCase = {
    id: ev.id,
    day: ev.day,
    siteKey: ev.siteKey,
    siteName: siteOf(ev.siteKey)?.name ?? ev.siteKey,
    hospitalId: hospital?.id ?? '',
    hospitalName: hospital?.name ?? '—',
    wardId: ward?.id,
    wardName: ward?.name,
    speciesId: ev.speciesId,
    speciesName: ev.speciesName,
    animalId: ev.animalId,
    complaint: ev.detail,
    severity,
    stay,
    closesOn,
    open,
    /* An open case has NO outcome. Printing a provisional one would be the page inventing
       the single field a director would act on. */
    outcome: open ? undefined : pickWeighted(OUTCOME_WEIGHTS[severity], draw(`${ev.id}:out`)),
    surgery: hasSurgery
      ? {
          procedure: procedures[Math.floor(draw(`${ev.id}:proc`) * procedures.length)],
          day: Math.min(TODAY, ev.day + Math.floor(draw(`${ev.id}:pday`) * 3)),
        }
      : undefined,
    medications: open ? medicationsFor(ev) : [],
  }

  caseCache.set(ev.id, built)
  return built
}

function medicationsFor(ev: Ev): Medication[] {
  const n = 1 + Math.floor(draw(`${ev.id}:medn`) * 3)
  const out: Medication[] = []
  for (let i = 0; i < n; i++) {
    const m = THERAPEUTIC[Math.floor(draw(`${ev.id}:med${i}`) * THERAPEUTIC.length)]
    if (!m || out.some((x) => x.id === m.id)) continue
    out.push({
      id: m.id,
      name: m.name,
      kind: m.category,
      startOn: Math.min(TODAY, ev.day + Math.floor(draw(`${ev.id}:med${i}d`) * 3)),
    })
  }
  return out
}

/* ── walking the stream ──────────────────────────────────────────────────── */

const sitesFor = (siteKey: string | null): string[] => (siteKey ? [siteKey] : SITES.map((s) => s.key))

/**
 * Every case admitted between two ledger days.
 *
 * Materialised, unlike the generic record pager, because every figure on this page is an
 * aggregate over cases and there are few of them: fifty in a month, 290 in six months,
 * 3,482 in the whole ledger. The cases themselves are cached by event id, so the second
 * section to ask for July gets the same objects rather than rebuilding them.
 */
export function casesBetween(siteKey: string | null, from: number, to: number): MedCase[] {
  const out: MedCase[] = []
  for (const key of sitesFor(siteKey)) {
    const s = daily(CASES, key)
    for (let day = Math.max(0, from); day <= Math.min(TODAY, to); day++) {
      for (let i = 0; i < s[day]; i++) out.push(caseOf(eventAt(CASES, key, day, i)))
    }
  }
  return out.sort((a, b) => b.day - a.day)
}

/** Cases opened inside the window — the activity reading. */
export const casesIn = (scope: Scope, hospitalId?: string): MedCase[] =>
  byHospital(casesBetween(siteKeyOf(scope), scope.win.from, scope.win.to), hospitalId)

/**
 * Cases open RIGHT NOW — the status reading, and deliberately not scoped by the window.
 *
 * Scans back `MAX_STAY` days because that is the furthest back an admission can still be
 * open. A case admitted in March is closed by definition, so it costs nothing to skip.
 */
const openCache = new Map<string, MedCase[]>()

export function openCases(siteKey: string | null, hospitalId?: string): MedCase[] {
  const key = siteKey ?? 'all'
  let all = openCache.get(key)
  if (!all) {
    all = casesBetween(siteKey, TODAY - MAX_STAY, TODAY).filter((c) => c.open)
    openCache.set(key, all)
  }
  return byHospital(all, hospitalId)
}

/** Cases that CLOSED inside the window — what recovery and hospital mortality are read from. */
export const dischargedIn = (scope: Scope, hospitalId?: string): MedCase[] =>
  byHospital(
    casesBetween(siteKeyOf(scope), scope.win.from - MAX_STAY, scope.win.to).filter(
      (c) => !c.open && c.closesOn >= scope.win.from && c.closesOn <= scope.win.to,
    ),
    hospitalId,
  )

const byHospital = (rows: MedCase[], hospitalId?: string): MedCase[] =>
  hospitalId ? rows.filter((c) => c.hospitalId === hospitalId) : rows

/* ── the figures ─────────────────────────────────────────────────────────── */

export interface MedicalSummary {
  /** Opened in the window. */
  cases: number
  /** Open right now. */
  inHospital: number
  /** Active courses across the open cases, right now. */
  medications: number
  /** Performed in the window. */
  surgeries: number
  /** Closed in the window. */
  discharges: number
  /** Closed in the window with a `Died in care` outcome. */
  deaths: number
  /** Recovered ÷ closed in the window. Undefined where nothing closed — never a zero. */
  recovery?: number
  /** Mean stay over the cases that CLOSED in the window. Undefined where none did. */
  averageStay?: number
}

export function summarise(scope: Scope, hospitalId?: string): MedicalSummary {
  const opened = casesIn(scope, hospitalId)
  const open = openCases(siteKeyOf(scope), hospitalId)
  const closed = dischargedIn(scope, hospitalId)
  const recovered = closed.filter((c) => c.outcome === 'Recovered').length

  return {
    cases: opened.length,
    inHospital: open.length,
    medications: open.reduce((n, c) => n + c.medications.length, 0),
    surgeries: opened.filter((c) => c.surgery).length,
    discharges: closed.length,
    deaths: closed.filter((c) => c.outcome === 'Died in care').length,
    /* Undefined rather than zero where nothing closed. "0% recovery" and "nothing was
       discharged this week" are different statements and only one of them is true. */
    recovery: closed.length ? (recovered / closed.length) * 100 : undefined,
    averageStay: closed.length ? closed.reduce((n, c) => n + c.stay, 0) / closed.length : undefined,
  }
}

export interface HospitalLine extends MedicalSummary {
  hospital: Hospital
  /** Beds occupied by the open cases, against the hospital's own bed count. */
  occupancy: number
  species: number
}

/** One line per hospital — the sortable comparison the section is built on. */
export function hospitalLines(scope: Scope): HospitalLine[] {
  return HOSPITALS.map((hospital) => {
    const s = summarise(scope, hospital.id)
    return {
      hospital,
      ...s,
      occupancy: hospital.beds ? (s.inHospital / hospital.beds) * 100 : 0,
      species: new Set(casesIn(scope, hospital.id).map((c) => c.speciesName)).size,
    }
  })
}

export interface SpeciesLine {
  id: string
  name: string
  siteName: string
  cases: number
  inHospital: number
  surgeries: number
  deaths: number
  medications: number
}

/** One line per species with any medical workload in the window. */
export function speciesLines(scope: Scope, hospitalId?: string): SpeciesLine[] {
  const map = new Map<string, SpeciesLine>()
  const bump = (c: MedCase, field: keyof Omit<SpeciesLine, 'id' | 'name' | 'siteName'>, n = 1) => {
    const at = map.get(c.speciesName) ?? {
      id: c.speciesId,
      name: c.speciesName,
      siteName: c.siteName,
      cases: 0,
      inHospital: 0,
      surgeries: 0,
      deaths: 0,
      medications: 0,
    }
    at[field] += n
    map.set(c.speciesName, at)
  }

  for (const c of casesIn(scope, hospitalId)) {
    bump(c, 'cases')
    if (c.surgery) bump(c, 'surgeries')
  }
  for (const c of dischargedIn(scope, hospitalId)) if (c.outcome === 'Died in care') bump(c, 'deaths')
  for (const c of openCases(siteKeyOf(scope), hospitalId)) {
    bump(c, 'inHospital')
    bump(c, 'medications', c.medications.length)
  }

  return [...map.values()].sort((a, b) => b.cases + b.inHospital - (a.cases + a.inHospital))
}

/* ── distributions ───────────────────────────────────────────────────────── */

export interface Slice {
  id: string
  label: string
  sub?: string
  value: number
  percent: number
}

export function distribute<T>(rows: T[], by: (r: T) => { id: string; label: string; sub?: string } | undefined): Slice[] {
  const map = new Map<string, { label: string; sub?: string; value: number }>()
  for (const row of rows) {
    const k = by(row)
    if (!k) continue
    const at = map.get(k.id)
    if (at) at.value++
    else map.set(k.id, { label: k.label, sub: k.sub, value: 1 })
  }
  const total = [...map.values()].reduce((n, v) => n + v.value, 0) || 1
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v, percent: (v.value / total) * 100 }))
    .sort((a, b) => b.value - a.value)
}

export const byHospitalSlice = (rows: MedCase[]): Slice[] =>
  distribute(rows, (c) => (c.hospitalId ? { id: c.hospitalId, label: c.hospitalName } : undefined))

export const bySpeciesSlice = (rows: MedCase[]): Slice[] =>
  distribute(rows, (c) => ({ id: c.speciesId, label: c.speciesName, sub: c.siteName }))

export const byComplaintSlice = (rows: MedCase[]): Slice[] =>
  distribute(rows, (c) => ({ id: c.complaint, label: c.complaint }))

export const bySeveritySlice = (rows: MedCase[]): Slice[] =>
  distribute(rows, (c) => ({ id: c.severity, label: c.severity }))

export const byOutcomeSlice = (rows: MedCase[]): Slice[] =>
  distribute(rows, (c) => (c.outcome ? { id: c.outcome, label: c.outcome } : undefined))

/** Active medication courses across the open cases, grouped by medicine. */
export function medicationSlices(siteKey: string | null, hospitalId?: string): Slice[] {
  const map = new Map<string, { label: string; sub?: string; value: number }>()
  let total = 0
  for (const c of openCases(siteKey, hospitalId)) {
    for (const m of c.medications) {
      total++
      const at = map.get(m.id)
      if (at) at.value++
      else map.set(m.id, { label: m.name, sub: m.kind, value: 1 })
    }
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v, percent: (v.value / (total || 1)) * 100 }))
    .sort((a, b) => b.value - a.value)
}

/* ── labels ──────────────────────────────────────────────────────────────── */

export const SEVERITY_TONE: Record<Severity, 'bad' | 'warn' | 'neutral' | 'good'> = {
  Critical: 'bad',
  Serious: 'warn',
  Stable: 'neutral',
  Recovering: 'good',
}

export const OUTCOME_TONE: Record<Outcome, 'bad' | 'warn' | 'neutral' | 'good'> = {
  Recovered: 'good',
  'Improved · monitored': 'warn',
  'Referred to enclosure': 'neutral',
  'Died in care': 'bad',
}

/** "Overall · July 2025", or the hospital when one is picked. Printed on every cut card. */
export const scopeLine = (scope: Scope, hospitalId?: string): string => {
  const where = hospitalId ? (hospitalOf(hospitalId)?.name ?? 'Hospital') : (scope.site?.name ?? 'Overall')
  return `${where} · ${scope.win.window}`
}

/** Days an open case has been in so far; the full stay once it has closed. */
export const daysIn = (c: MedCase): number => (c.open ? TODAY - c.day : c.stay)

export const winOf = (from: number, to: number, label: string): Win => ({
  key: 'custom',
  label,
  noun: label,
  from,
  to,
  days: to - from + 1,
  window: label,
})
