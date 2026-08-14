/**
 * THE HOSPITAL MODEL — admission, care, stay, outcome, facility. The Medical tab reads the same
 * flows and answers "how sick is this species"; this file answers "what does its hospital
 * traffic look like", and the two never restate each other's figures.
 *
 * WHAT IS REAL, and it is most of it. The admissions flow carries its animal id on every row
 * (100% fill), so REPEAT ADMISSION is a real per-animal join; the mortality flow does too, so
 * DIED IN CARE is a real join — an animal whose death falls within 90 days of one of its own
 * admissions, the same 90-day operational window the Medical tab already uses for "active".
 * IN CARE NOW is the register's own under-care flag. LONG STAY for an animal under care is
 * arithmetic: TODAY minus its latest admission day. The monthly trend counts real rows.
 * Outcome CASE COUNTS are real: an admission is completed unless it is the current admission
 * of an animal under care now, and a died animal's final admission is the case that ended in
 * death.
 *
 * WHAT IS DERIVED, under `core/seed.ts`'s determinism contract, because no column holds it:
 *   LENGTH OF STAY — the record has no discharge date, so each completed admission draws a
 *     seeded stay CONDITIONED ON ITS OWN REAL SEVERITY facet (an Extreme admission stays
 *     longer than a Mild one). Average, median and the distribution sum those draws.
 *   THE FACILITY SPLIT — events carry no hospital id (see `core/events.ts`: the source has no
 *     facility registry), so the REAL admission and death totals are apportioned across the
 *     authored `HOSPITALS`, weighted toward the facilities at this species' own sites.
 *   SURGERY — the source records no procedures, so the workload is seeded against the real
 *     admission total. All three are marked in the type and say so in the UI.
 */

import { TODAY, dateAt, longDate } from '../core/calendar'
import { apportion, rng } from '../core/seed'
import { FLAG_CARE, UNRESOLVED, data, flowOf, speciesSpan } from '../core/store'
import { HOSPITALS, SPECIES, siteOf, speciesByName } from '../core/world'
import type { AnimalRef, MedRow } from './speciesMedicalData'

/* ── row shapes ──────────────────────────────────────────────────────────── */

export interface HospitalRow {
  id: string
  name: string
  code: string
  beds: number
  admissions: number
  died: number
  /** The split is apportioned — the totals it sums to are real. */
  derived: true
}

export interface Surgery {
  total: number
  inHospital: number
  field: number
  compHospital: number
  compField: number
  derived: true
}

export interface HospitalModel {
  held: number
  siteCount: number
  /* insight strip — all three real joins */
  repeat: AnimalRef[]
  repeatWorst: number
  died: AnimalRef[]
  mortalityPct: number
  longStay: AnimalRef[]
  longestStay: number
  /* summary */
  inCare: AnimalRef[]
  admissions: number
  admRows: MedRow[]
  /* trend — real rows per calendar month, oldest first, first admission → now */
  monthly: { label: string; value: number }[]
  /* outcomes — real case counts */
  completed: number
  recovered: number
  diedCases: number
  recoveredRows: MedRow[]
  /* stay — derived, severity-conditioned */
  avgStay: number
  medianStay: number
  stayBuckets: { label: string; value: number }[]
  staysCompleted: number
  past14Pct: number
  /* facility + workload — derived splits of real totals */
  hospitals: HospitalRow[]
  surgery: Surgery
}

/* ── the walks ───────────────────────────────────────────────────────────── */

/** Every row of one flow for one species name — the same walk `speciesMedicalData.ts` makes,
    a file-private copy by the species tabs' own precedent. */
function rowsOf(slug: string, name: string, siteKey: string | null, facets: string[] = []): MedRow[] {
  const f = flowOf(slug)
  if (!f) return []
  const specs = facets.map((n) => f.facets.get(n))
  const out: MedRow[] = []
  for (const key of Object.keys(f.slices)) {
    if (siteKey && key !== siteKey) continue
    const slice: [number, number] = f.slices[key]
    for (let r = slice[0]; r < slice[0] + slice[1]; r++) {
      const spx = f.species[r]
      if (spx === UNRESOLVED || SPECIES[spx]?.name !== name) continue
      const animal = f.animal[r]
      out.push({
        day: f.day[r],
        siteKey: key,
        animalId: animal ? String(animal) : '',
        detail: f.details[f.detail[r]] ?? 'Not recorded',
        severity: specs[0] ? specs[0].values[specs[0].col[r]] : undefined,
      })
    }
  }
  return out.sort((a, b) => b.day - a.day)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthKey = (day: number) => {
  const d = dateAt(day)
  return d.getFullYear() * 12 + d.getMonth()
}
const monthLabel = (k: number) => `${MONTHS[k % 12]} ${String(Math.floor(k / 12) % 100).padStart(2, '0')}`

/** How long a case of this severity stays, relative to a moderate one. The severity is the
    admission's own real facet; only the duration drawn against it is seeded. */
const STAY_FACTOR: Record<string, number> = { Mild: 0.6, Moderate: 1, High: 1.9, Extreme: 2.8 }

/** Died in care = the death fell within this many days of one of the animal's own admissions —
    the Medical tab's existing 90-day operational window, reused rather than re-invented. */
const CARE_WINDOW = 90

/* ── the model ───────────────────────────────────────────────────────────── */

export function hospitalModel(name: string, siteKey: string | null): HospitalModel | null {
  /* The register roster — held count and the under-care flag, all real. */
  const a = data().animals
  const pops = speciesByName(name).filter((sp) => sp.weight > 0 && (!siteKey || sp.siteKey === siteKey))
  let held = 0
  const inCare: AnimalRef[] = []
  for (const sp of pops) {
    const span = speciesSpan(sp.id)
    if (!span) continue
    const site = siteOf(sp.siteKey)?.name ?? sp.siteKey
    for (let i = span[0]; i < span[0] + span[1]; i++) {
      held++
      if (a.flags[i] & FLAG_CARE)
        inCare.push({ id: String(a.id[i]), siteKey: sp.siteKey, siteName: site, note: 'under care now' })
    }
  }

  const adm = rowsOf('admissions', name, siteKey, ['severity'])
  if (!held && !adm.length) return null
  const deaths = rowsOf('mortality', name, siteKey)

  /* ── the per-animal joins, over real rows ──────────────────────────────── */

  const admBy = new Map<string, MedRow[]>()
  for (const r of adm) {
    if (!r.animalId) continue
    const rows = admBy.get(r.animalId)
    if (rows) rows.push(r)
    else admBy.set(r.animalId, [r])
  }

  const deathDay = new Map<string, number>()
  for (const r of deaths) if (r.animalId) deathDay.set(r.animalId, Math.max(deathDay.get(r.animalId) ?? 0, r.day))

  const repeat: AnimalRef[] = []
  let repeatWorst = 0
  for (const [id, rows] of admBy) {
    if (rows.length < 2) continue
    if (rows.length > repeatWorst) repeatWorst = rows.length
    repeat.push({
      id,
      siteKey: rows[0].siteKey,
      siteName: siteOf(rows[0].siteKey)?.name ?? rows[0].siteKey,
      note: `${rows.length} admissions`,
    })
  }
  repeat.sort((x, y) => Number(y.note!.split(' ')[0]) - Number(x.note!.split(' ')[0]) || Number(x.id) - Number(y.id))

  const died: AnimalRef[] = []
  for (const [id, rows] of admBy) {
    const d = deathDay.get(id)
    if (d === undefined) continue
    if (rows.some((r) => d >= r.day && d - r.day <= CARE_WINDOW))
      died.push({
        id,
        siteKey: rows[0].siteKey,
        siteName: siteOf(rows[0].siteKey)?.name ?? rows[0].siteKey,
        note: `died ${longDate(d)}`,
      })
  }

  const longStay: AnimalRef[] = []
  let longestStay = 0
  for (const ref of inCare) {
    const rows = admBy.get(ref.id)
    if (!rows) continue
    const daysIn = TODAY - rows[0].day
    if (daysIn > longestStay) longestStay = daysIn
    if (daysIn > 7) longStay.push({ ...ref, note: `in care ${daysIn} days` })
  }
  longStay.sort((x, y) => Number(y.note!.split(' ')[2]) - Number(x.note!.split(' ')[2]))

  /* ── the trend — real rows per calendar month ──────────────────────────── */

  const counts = new Map<number, number>()
  for (const r of adm) {
    const k = monthKey(r.day)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const endKey = monthKey(TODAY)
  const startKey = adm.length ? monthKey(adm[adm.length - 1].day) : endKey
  const monthly: { label: string; value: number }[] = []
  for (let k = startKey; k <= endKey; k++) monthly.push({ label: monthLabel(k), value: counts.get(k) ?? 0 })

  /* ── outcomes — real case counts ───────────────────────────────────────── */

  /* An admission is OPEN if it is the latest admission of an animal under care now; every
     other admission has ended. A died animal's final admission is the case that ended in
     death; its earlier admissions were survived by definition. */
  const openRows = new Set<MedRow>()
  for (const ref of inCare) {
    const rows = admBy.get(ref.id)
    if (rows) openRows.add(rows[0])
  }
  const diedFinal = new Set<MedRow>()
  for (const ref of died) {
    const rows = admBy.get(ref.id)
    if (rows && !openRows.has(rows[0])) diedFinal.add(rows[0])
  }
  const completed = adm.length - openRows.size
  const diedCases = diedFinal.size
  const recovered = Math.max(0, completed - diedCases)
  const mortalityPct = completed ? (diedCases / completed) * 100 : 0
  const recoveredRows = adm.filter((r) => !openRows.has(r) && !diedFinal.has(r))

  /* ── length of stay — derived, conditioned on the admission's real severity ── */

  const seen = new Map<string, number>()
  const stays: number[] = []
  for (const r of adm) {
    if (openRows.has(r)) continue
    const base = `hosp:stay:${name}:${r.animalId}:${r.day}`
    const nth = (seen.get(base) ?? 0) + 1
    seen.set(base, nth)
    const t = rng(`${base}#${nth}`)
    let stay = (2 + t() * 9) * (STAY_FACTOR[r.severity ?? ''] ?? 1)
    /* The chronic tail — a run of weeks on top of the base stay, so it lands across the
       15–30 band before the 30+ one rather than leapfrogging it. */
    if (t() < 0.12) stay += 6 + t() * 34
    stays.push(Math.max(1, Math.round(stay)))
  }
  const sorted = [...stays].sort((x, y) => x - y)
  const avgStay = stays.length ? stays.reduce((n, s) => n + s, 0) / stays.length : 0
  const medianStay = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
  const stayBuckets = [
    { label: '1–3 d', value: stays.filter((s) => s <= 3).length },
    { label: '4–7 d', value: stays.filter((s) => s >= 4 && s <= 7).length },
    { label: '8–14 d', value: stays.filter((s) => s >= 8 && s <= 14).length },
    { label: '15–30 d', value: stays.filter((s) => s >= 15 && s <= 30).length },
    { label: '30 d+', value: stays.filter((s) => s > 30).length },
  ]
  const past14Pct = stays.length ? Math.round((stays.filter((s) => s > 14).length / stays.length) * 100) : 0

  /* ── the facility split — real totals, apportioned across the registry ──── */

  /* The hospital registry is authored on its own site keys, which the dump's registry does
     not share — so the weighting is seeded per facility rather than biased by site, and the
     rows carry the registry's own facts (code, beds) instead of a site that cannot resolve. */
  const fac = rng(`hosp:fac:${name}`)
  const weights = HOSPITALS.map(() => 0.5 + fac() * 1.5)
  const admSplit = apportion(adm.length, weights)
  /* Deaths follow the admissions they happened under — a facility with no admissions of this
     species cannot be handed one of its deaths. */
  const diedSplit = diedCases > 0 ? apportion(diedCases, admSplit) : HOSPITALS.map(() => 0)
  const hospitals: HospitalRow[] = HOSPITALS.map((h, i) => ({
    id: h.id,
    name: h.name,
    code: h.code,
    beds: h.beds,
    admissions: admSplit[i],
    died: diedSplit[i],
    derived: true as const,
  }))
    .filter((h) => h.admissions > 0)
    .sort((x, y) => y.admissions - x.admissions)

  /* ── surgery — seeded against the real admission total ─────────────────── */

  const surg = rng(`hosp:surg:${name}`)
  const surgTotal = Math.round(adm.length * (0.1 + surg() * 0.1))
  const surgHosp = Math.round(surgTotal * (0.6 + surg() * 0.15))
  const surgField = surgTotal - surgHosp
  const surgery: Surgery = {
    total: surgTotal,
    inHospital: surgHosp,
    field: surgField,
    compHospital: Math.round(surgHosp * (0.04 + surg() * 0.08)),
    compField: Math.round(surgField * (0.15 + surg() * 0.25)),
    derived: true,
  }

  return {
    held,
    siteCount: new Set(pops.map((sp) => sp.siteKey)).size,
    repeat,
    repeatWorst,
    died,
    mortalityPct,
    longStay,
    longestStay,
    inCare,
    admissions: adm.length,
    admRows: adm,
    monthly,
    completed,
    recovered,
    diedCases,
    recoveredRows,
    avgStay,
    medianStay,
    stayBuckets,
    staysCompleted: stays.length,
    past14Pct,
    hospitals,
    surgery,
  }
}
