/**
 * THE LAB MODEL — requests, their state, and the benches that ran them, for one species.
 *
 * READ THE NEXT PARAGRAPH BEFORE TRUSTING A FIGURE ON THIS TAB.
 *
 * THERE IS NO LAB TEST TABLE IN THIS SOURCE. `species_mgmt_anon` carries a `lab_test_id_count`
 * column on medical records — how many tests were ordered against a record — and nothing else:
 * no test, no bench, no turnaround, no result. That count did not survive into the compiled
 * dump either (`core/metrics.ts` records the reason against both lab metrics, and the Lab
 * MODULE at `v4/modules/lab.tsx` is a `NoSource` page for exactly this). So a lab request here
 * is DERIVED, and this file exists to make the derivation legible rather than to hide it.
 *
 * WHAT IS REAL, AND IT IS THE SPINE. The medical records themselves: every consultation and
 * diagnosis row for this species name, each with its own animal id (100% fill), its own day and
 * its own site. The count of those records is real, the animals behind them are real, their
 * dates are real, and THE WINDOW AND SITE NARROWING IS APPLIED TO THEM — so every figure this
 * model returns is a figure about the reader's current scope rather than a constant wearing a
 * filter's clothes.
 *
 * WHAT IS DERIVED, under `core/seed.ts`'s determinism contract:
 *   WHETHER A RECORD ORDERED TESTS, and how many — the lost `lab_test_id_count`, redrawn per
 *     record and stable forever.
 *   THE REQUEST'S STATE — conditioned on the record's REAL AGE against TODAY, so a request from
 *     two years ago reads completed and one from last week may still be pending. Age is a fact;
 *     only the roll against it is seeded.
 *   THE BENCH — apportioned across `world.ts`'s OWN nine laboratory departments. The department
 *     names, their two laboratories and their working-day turnaround standards are authored
 *     registry entries this product already browses; only which record went where is drawn.
 *
 * THE DRAW IS KEYED ON THE RECORD, NEVER ON THE SCOPE. That is what makes the window filter
 * honest: narrowing to six months includes fewer records, it does not redraw the ones that
 * remain. A model keyed on the filtered total would give the same animal a different bench
 * every time the reader touched a pill.
 */

import { TODAY, dateAt, type Win } from '../core/calendar'
import { rng } from '../core/seed'
import { UNRESOLVED, flowOf, speciesSpan } from '../core/store'
import { LABS, LAB_DEPARTMENTS, SPECIES, speciesByName } from '../core/world'

/* ── row shapes ──────────────────────────────────────────────────────────── */

export type LabState = 'Completed' | 'In progress' | 'Pending' | 'Cancelled'

export interface LabRequest {
  animalId: string
  siteKey: string
  day: number
  /** The record the tests were ordered against — 'Consultation' or 'Diagnosis'. */
  source: string
  deptId: string
  tests: number
  state: LabState
}

export interface DeptRow {
  id: string
  name: string
  labName: string
  labCode: string
  /** The registry's own working-day standard — authored, not drawn. */
  turnaround: number
  requests: number
  tests: number
  animals: number
}

export interface LabRow {
  id: string
  name: string
  code: string
  departments: number
  requests: number
  tests: number
  animals: number
}

export interface LabModel {
  /** Real: medical records for this species inside the window and site. */
  records: number
  held: number
  /* volume — every figure below counts requests inside the scope */
  requests: number
  tests: number
  animals: number
  completed: number
  inProgress: number
  pending: number
  cancelled: number
  completionPct: number
  /* trend across the window */
  trend: { label: string; value: number }[]
  trendGrain: 'day' | 'month'
  /* the benches */
  depts: DeptRow[]
  labs: LabRow[]
  rows: LabRequest[]
}

/* ── the walks ───────────────────────────────────────────────────────────── */

interface Rec {
  day: number
  siteKey: string
  animalId: string
  source: string
}

/**
 * Every medical record for one species name inside the window and the site.
 *
 * THE WINDOW IS APPLIED HERE, at the row, which is the only place it can be applied honestly.
 * A model that walked every row and filtered afterwards would still be right; a model that
 * walked every row and DID NOT filter would state an all-time figure under a header naming six
 * months, which is the contradiction this product exists to avoid.
 */
function recordsOf(slug: string, source: string, name: string, siteKey: string | null, win: Win): Rec[] {
  const f = flowOf(slug)
  if (!f) return []
  const out: Rec[] = []
  for (const key of Object.keys(f.slices)) {
    if (siteKey && key !== siteKey) continue
    const slice: [number, number] = f.slices[key]
    for (let r = slice[0]; r < slice[0] + slice[1]; r++) {
      const day = f.day[r]
      if (day < win.from || day > win.to) continue
      const spx = f.species[r]
      if (spx === UNRESOLVED || SPECIES[spx]?.name !== name) continue
      const animal = f.animal[r]
      out.push({ day, siteKey: key, animalId: animal ? String(animal) : '', source })
    }
  }
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthKey = (day: number) => {
  const d = dateAt(day)
  return d.getFullYear() * 12 + d.getMonth()
}
const monthLabel = (k: number) => `${MONTHS[k % 12]} ${String(Math.floor(k / 12) % 100).padStart(2, '0')}`
const dayLabel = (day: number) => {
  const d = dateAt(day)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Bench weights — a haematology panel is ordered far more often than a toxicology screen. */
const DEPT_WEIGHT: Record<string, number> = {
  Haematology: 5,
  'Clinical Pathology': 4.5,
  Microbiology: 3,
  Parasitology: 3,
  Serology: 2,
  'Molecular Diagnostics': 1.2,
  Histopathology: 1,
  'Water Quality': 1,
  Toxicology: 0.6,
}

/** The share of medical records that order any test at all. */
const ORDER_RATE = 0.34

/* ── the model ───────────────────────────────────────────────────────────── */

export function labModel(name: string, siteKey: string | null, win: Win): LabModel | null {
  const pops = speciesByName(name).filter((sp) => sp.weight > 0 && (!siteKey || sp.siteKey === siteKey))
  let held = 0
  for (const sp of pops) {
    const span = speciesSpan(sp.id)
    if (span) held += span[1]
  }

  /* The real spine, already cut to the reader's window and site. */
  const recs = [
    ...recordsOf('admissions', 'Consultation', name, siteKey, win),
    ...recordsOf('disease', 'Diagnosis', name, siteKey, win),
  ]
  if (!held && !recs.length) return null

  /* The bench ladder, built once from the registry so a record can be seated on it. */
  const ladder: { id: string; upto: number }[] = []
  let weightSum = 0
  for (const d of LAB_DEPARTMENTS) {
    weightSum += DEPT_WEIGHT[d.name] ?? 1
    ladder.push({ id: d.id, upto: weightSum })
  }

  /* ONE STREAM PER RECORD, DRAWS IN A FIXED ORDER — append new draws at the end only, or every
     figure after the insertion changes for every record. */
  const rows: LabRequest[] = []
  for (const rec of recs) {
    const r = rng(`lab:${name}:${rec.source}:${rec.animalId}:${rec.day}`)
    if (r() > ORDER_RATE) continue
    const tests = 1 + Math.floor(r() * 4)
    const seat = r() * weightSum
    const deptId = (ladder.find((l) => seat <= l.upto) ?? ladder[ladder.length - 1]).id
    /* The state is rolled against the record's REAL age. A bench that has had two years to
       report has reported; the pending queue is what the last few weeks left behind. */
    const age = TODAY - rec.day
    const roll = r()
    const state: LabState =
      age > 45
        ? roll < 0.972
          ? 'Completed'
          : 'Cancelled'
        : age > 14
          ? roll < 0.74
            ? 'Completed'
            : roll < 0.9
              ? 'In progress'
              : roll < 0.972
                ? 'Pending'
                : 'Cancelled'
          : roll < 0.3
            ? 'Completed'
            : roll < 0.68
              ? 'In progress'
              : roll < 0.95
                ? 'Pending'
                : 'Cancelled'
    rows.push({ animalId: rec.animalId, siteKey: rec.siteKey, day: rec.day, source: rec.source, deptId, tests, state })
  }
  rows.sort((a, b) => b.day - a.day)

  /* ── the volume figures ────────────────────────────────────────────────── */

  let tests = 0
  let completed = 0
  let inProgress = 0
  let pending = 0
  let cancelled = 0
  const animals = new Set<string>()
  for (const q of rows) {
    tests += q.tests
    if (q.animalId) animals.add(q.animalId)
    if (q.state === 'Completed') completed++
    else if (q.state === 'In progress') inProgress++
    else if (q.state === 'Pending') pending++
    else cancelled++
  }
  /* Against the requests that were actually run — a cancelled request was never going to
     report, so counting it as a failure to report would understate every bench. */
  const ran = rows.length - cancelled
  /* NEVER ROUND UP TO 100 WHILE SOMETHING IS STILL OUT. 1,434 of 1,438 is 99.7%, and printing
     "100%" beside a queue that still holds four requests is a figure the row below it
     contradicts. Only a genuinely empty queue reads 100%. */
  const raw = ran > 0 ? (completed / ran) * 100 : 0
  const completionPct = completed < ran ? Math.min(99.9, Math.floor(raw * 10) / 10) : Math.round(raw)

  /* ── the trend, at the grain the window can carry ──────────────────────── */

  const span = win.to - win.from + 1
  const trendGrain: 'day' | 'month' = span <= 92 ? 'day' : 'month'
  const trend: { label: string; value: number }[] = []
  if (trendGrain === 'day') {
    const byDay = new Map<number, number>()
    for (const q of rows) byDay.set(q.day, (byDay.get(q.day) ?? 0) + 1)
    /* A daily axis past a few weeks is a comb; step it so the window always draws ~30 points. */
    const step = Math.max(1, Math.ceil(span / 30))
    for (let d = win.from; d <= win.to; d += step) {
      let n = 0
      for (let k = d; k < Math.min(d + step, win.to + 1); k++) n += byDay.get(k) ?? 0
      trend.push({ label: dayLabel(d), value: n })
    }
  } else {
    const byMonth = new Map<number, number>()
    for (const q of rows) {
      const k = monthKey(q.day)
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1)
    }
    const from = monthKey(win.from)
    const to = monthKey(win.to)
    for (let k = from; k <= to; k++) trend.push({ label: monthLabel(k), value: byMonth.get(k) ?? 0 })
  }

  /* ── the benches ───────────────────────────────────────────────────────── */

  const deptStat = new Map<string, { requests: number; tests: number; animals: Set<string> }>()
  for (const q of rows) {
    let at = deptStat.get(q.deptId)
    if (!at) {
      at = { requests: 0, tests: 0, animals: new Set() }
      deptStat.set(q.deptId, at)
    }
    at.requests++
    at.tests += q.tests
    if (q.animalId) at.animals.add(q.animalId)
  }

  const depts: DeptRow[] = LAB_DEPARTMENTS.map((d) => {
    const at = deptStat.get(d.id)
    const lab = LABS.find((l) => l.id === d.labId)
    return {
      id: d.id,
      name: d.name,
      labName: lab?.name ?? d.labId,
      labCode: lab?.code ?? '',
      turnaround: d.turnaround,
      requests: at?.requests ?? 0,
      tests: at?.tests ?? 0,
      animals: at?.animals.size ?? 0,
    }
  })
    .filter((d) => d.requests > 0)
    .sort((x, y) => y.tests - x.tests)

  /* One pass for the per-lab animal sets — the same animal can be seen on two benches of one
     laboratory, so the sets cannot be summed from the department rows. */
  const labOfDept = new Map(LAB_DEPARTMENTS.map((d) => [d.id, d.labId]))
  const labAnimals = new Map<string, Set<string>>()
  for (const q of rows) {
    if (!q.animalId) continue
    const labId = labOfDept.get(q.deptId)
    if (!labId) continue
    let set = labAnimals.get(labId)
    if (!set) {
      set = new Set()
      labAnimals.set(labId, set)
    }
    set.add(q.animalId)
  }

  const labs: LabRow[] = LABS.map((l) => {
    const mine = depts.filter((d) => d.labCode === l.code)
    const seen = labAnimals.get(l.id) ?? new Set<string>()
    return {
      id: l.id,
      name: l.name,
      code: l.code,
      departments: mine.length,
      requests: mine.reduce((n, d) => n + d.requests, 0),
      tests: mine.reduce((n, d) => n + d.tests, 0),
      animals: seen.size,
    }
  })

    .filter((l) => l.requests > 0)
    .sort((x, y) => y.tests - x.tests)

  return {
    records: recs.length,
    held,
    requests: rows.length,
    tests,
    animals: animals.size,
    completed,
    inProgress,
    pending,
    cancelled,
    completionPct,
    trend,
    trendGrain,
    depts,
    labs,
    rows,
  }
}
