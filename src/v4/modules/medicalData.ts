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
import { eventAt, facetAt, type Ev } from '../../core/events'
import { daily } from '../../core/series'
import { figure } from '../../core/query'
import { siteKeyOf, type Scope } from '../../core/scope'
import { SITES, siteOf } from '../../core/world'

/** The metric every figure on this page is a reading of. */
export const CASES = 'admissions'

/** The module's accent — the medical red the KPI card and the module already share. */
/** MD3_Antz OnSecondaryContainer — the caseload ramp. */
export const MEDICAL_ACCENT = '#1f415b'

/* ── the case ────────────────────────────────────────────────────────────── */

/**
 * WHAT THE SOURCE ACTUALLY RECORDS, AND WHAT THIS FILE USED TO ADD.
 *
 * `medical_records` is a consultation: a date, a site, an animal, a case type. Joined to
 * `complaints` it gains a presenting sign and a severity; joined to `diagnosis` it gains a
 * diagnosis and a prognosis. That is the whole clinical record.
 *
 * This file used to add a hospital lifecycle on top of it — a length of stay drawn from a
 * seeded quartic, a discharge date, whether the animal was in hospital tonight, an outcome
 * weighted by severity, a surgical procedure weighted by complaint, and a set of active
 * medication courses. The reasoning was sound: in-patients ≈ admissions × stay ÷ window, so
 * deriving all three from one number made them arithmetically inseparable and stopped the page
 * stating a combination no hospital could produce.
 *
 * None of it has a source. There is no admission, no discharge, no bed, no ward, no procedure
 * and no outcome anywhere in `species_mgmt_anon` — `diagnosis.closed_at` is null on all 6,808
 * rows and `prescriptions.status` is 'active' on all 1,665, so there is not even a closed
 * state to derive one from. So the lifecycle is gone rather than modelled, and the sections
 * built on it are off the page.
 *
 * WHAT IS REAL, AND STAYS: the consultation itself, its presenting sign, its severity, its
 * species and site, and the animals carrying a live prescription right now.
 */

export const SEVERITIES = ['Extreme', 'High', 'Moderate', 'Mild'] as const
export type Severity = (typeof SEVERITIES)[number]

export interface MedCase {
  /** The consultation's own id — the record id, not a second one invented here. */
  id: string
  /** Ledger index of the consultation. */
  day: number
  siteKey: string
  siteName: string
  speciesId: string
  speciesName: string
  animalId: string
  /** The presenting complaint, where one was recorded. 73% of records carry none. */
  complaint: string
  /** The complaint's own severity, where it has one. */
  severity?: Severity
}

const SEVERITY_SET = new Set<string>(SEVERITIES)

const caseCache = new Map<string, MedCase>()

/** One consultation event, read as the case it is. */
export function caseOf(ev: Ev, i: number): MedCase {
  const hit = caseCache.get(ev.id)
  if (hit) return hit

  const raw = facetAt(CASES, ev.siteKey, ev.day, i, 'severity')
  const built: MedCase = {
    id: ev.id,
    day: ev.day,
    siteKey: ev.siteKey,
    siteName: siteOf(ev.siteKey)?.name ?? ev.siteKey,
    speciesId: ev.speciesId,
    speciesName: ev.speciesName,
    animalId: ev.animalId,
    complaint: ev.detail,
    severity: raw && SEVERITY_SET.has(raw) ? (raw as Severity) : undefined,
  }
  caseCache.set(ev.id, built)
  return built
}

/* ── walking the stream ──────────────────────────────────────────────────── */

const sitesFor = (siteKey: string | null): string[] => (siteKey ? [siteKey] : SITES.map((s) => s.key))

/** Every consultation between two ledger days. */
export function casesBetween(siteKey: string | null, from: number, to: number): MedCase[] {
  const out: MedCase[] = []
  for (const key of sitesFor(siteKey)) {
    const s = daily(CASES, key)
    for (let day = Math.max(0, from); day <= Math.min(TODAY, to); day++) {
      for (let i = 0; i < s[day]; i++) out.push(caseOf(eventAt(CASES, key, day, i), i))
    }
  }
  return out.sort((a, b) => b.day - a.day)
}

/** Consultations inside the window. */
export const casesIn = (scope: Scope): MedCase[] =>
  casesBetween(siteKeyOf(scope), scope.win.from, scope.win.to)

/* ── the figures ─────────────────────────────────────────────────────────── */

export interface MedicalSummary {
  /** Consultations in the window. */
  cases: number
  /** Animals with a live prescription right now — the only under-care signal in the schema. */
  underCare: number
  /** Distinct species and sites seen in the window. */
  species: number
  sites: number
  /** Distinct presenting signs recorded. */
  complaints: number
  /** Consultations whose complaint was recorded as High or Extreme. */
  severe: number
}

export function summarise(scope: Scope): MedicalSummary {
  const opened = casesIn(scope)
  return {
    cases: opened.length,
    underCare: Math.round(figure(scope, 'health').value),
    species: new Set(opened.map((c) => c.speciesName)).size,
    sites: new Set(opened.map((c) => c.siteKey)).size,
    complaints: new Set(opened.map((c) => c.complaint)).size,
    severe: opened.filter((c) => c.severity === 'High' || c.severity === 'Extreme').length,
  }
}

export interface SpeciesLine {
  id: string
  name: string
  siteName: string
  cases: number
  severe: number
  complaints: number
}

/** One line per species with any clinical workload in the window. */
export function speciesLines(scope: Scope): SpeciesLine[] {
  const map = new Map<string, SpeciesLine & { signs: Set<string> }>()
  for (const c of casesIn(scope)) {
    const at = map.get(c.speciesName) ?? {
      id: c.speciesId,
      name: c.speciesName,
      siteName: c.siteName,
      cases: 0,
      severe: 0,
      complaints: 0,
      signs: new Set<string>(),
    }
    at.cases++
    if (c.severity === 'High' || c.severity === 'Extreme') at.severe++
    at.signs.add(c.complaint)
    map.set(c.speciesName, at)
  }
  return [...map.values()]
    .map((r) => ({ ...r, complaints: r.signs.size }))
    .sort((a, b) => b.cases - a.cases)
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

export const bySpeciesSlice = (rows: MedCase[]): Slice[] =>
  distribute(rows, (c) => ({ id: c.speciesId, label: c.speciesName, sub: c.siteName }))

export const byComplaintSlice = (rows: MedCase[]): Slice[] =>
  distribute(rows, (c) => ({ id: c.complaint, label: c.complaint }))

export const bySeveritySlice = (rows: MedCase[]): Slice[] =>
  distribute(rows, (c) => (c.severity ? { id: c.severity, label: c.severity } : { id: 'Not recorded', label: 'Not recorded' }))

/* ── labels ──────────────────────────────────────────────────────────────── */

export const SEVERITY_TONE: Record<Severity, 'bad' | 'warn' | 'neutral' | 'good'> = {
  Extreme: 'bad',
  High: 'bad',
  Moderate: 'warn',
  Mild: 'neutral',
}


/** "Overall · July 2025", or the hospital when one is picked. Printed on every cut card. */
export const scopeLine = (scope: Scope): string => `${scope.site?.name ?? 'Overall'} · ${scope.win.window}`

export const winOf = (from: number, to: number, label: string): Win => ({
  key: 'custom',
  label,
  noun: label,
  from,
  to,
  days: to - from + 1,
  window: label,
})
