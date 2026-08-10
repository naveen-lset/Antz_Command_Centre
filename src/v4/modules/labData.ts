/**
 * THE LIMS LAYER — what a laboratory knows that the event stream does not.
 *
 * `core/events.ts` already gives every lab request an identity: the day it was received,
 * the site it came from, the species and animal it is about, and the bench it went to.
 * Those are facts about a SAMPLE. A laboratory also knows what
 * happened to it — whether it has been reported, how long that took, what the result said,
 * and whether anyone flagged it — and none of that lives on the event.
 *
 * SO IT IS DERIVED HERE, FROM THE SAME SEED. Every field below comes out of `rng(ev.id)`,
 * which means the same request has the same result on every read, from any page, in any
 * order. That is the property the whole product rests on: a department tally and the
 * records behind it cannot disagree, because they are the same draw made twice.
 *
 * WHAT IS NOT INVENTED. The departments, their turnaround standards, the tests, the sites,
 * the species and the animals are all real registry entries from `core/world.ts` — nine
 * departments across two laboratories, each with a turnaround in working days that already
 * existed and that this file uses as the SLA rather than authoring one. Turnaround is
 * measured received → reported, which is the definition the registry's own field implies.
 *
 * WHAT THE CALIBRATION IS FOR. The reporting lag is drawn around each department's own
 * standard, so the pending queue is emergent rather than authored — and the parameters are
 * set so that the queue it produces today equals the `labOpen` figure the home screen
 * publishes and `core/checks.ts` asserts. Same discipline as `core/series.ts`, which derives
 * a daily series satisfying the authored figures exactly instead of scaling them.
 */

import { TODAY, type Win } from '../../core/calendar'
import { count, eventAt, page, type Ev } from '../../core/events'
import { daily } from '../../core/series'
import { rng } from '../../core/seed'
import {
  LABS,
  LAB_DEPARTMENTS,
  SITES,
  labDepartmentOf,
  labOf,
  siteOf,
  type LabDepartment,
} from '../../core/world'

/* ── the record ──────────────────────────────────────────────────────────── */

export type LabStatus = 'pending' | 'reported' | 'rejected'
export type LabResult = 'positive' | 'negative'

/** Departments whose specimen is not an animal. Both are real benches at Field Pathology. */
const NON_ANIMAL = new Set(['Toxicology', 'Water Quality'])

export interface LabRecord {
  ev: Ev
  id: string
  dept: LabDepartment
  /** "Central Diagnostic Laboratory" — the lab the bench belongs to. */
  labName: string
  siteKey: string
  siteName: string
  /** The test asked for — the event's own classifying dimension. */
  test: string
  /** Day the sample was received. The event's own day. */
  received: number
  /** Day the result was reported. Absent while pending. */
  reported?: number
  status: LabStatus
  /** Received → reported, in days. Absent while pending. */
  tat?: number
  /** Days waiting so far. Only while pending. */
  waiting?: number
  /** Past the bench's own turnaround standard. */
  overdue: boolean
  /** Only a reported request has a result. Pending and rejected have none. */
  result?: LabResult
  flagged: boolean
  /** The reported finding, in the laboratory's own words. */
  finding?: string
  /** An animal, or a feed batch / water body for the two non-animal benches. */
  specimen: { kind: 'animal'; animalId: string; speciesName: string } | { kind: 'sample'; label: string }
}

/* ── which assay, and how often it finds something ───────────────────────── */

/**
 * THE TEST IS DERIVED FROM THE BENCH, NOT READ OFF THE EVENT — and that is a correction.
 *
 * `core/events.ts` draws a lab event's `detail` (the sample type) and its `labDeptId` (the
 * bench) as two INDEPENDENT weighted draws. Neither is wrong on its own, and every existing
 * breakdown reads one or the other, so the gap never showed. Put both on the same record row,
 * as this page does, and it shows immediately: the first drill produced "LAB-2177AQ0 ·
 * Serology" sitting inside the Toxicology department.
 *
 * The department is the side that has to stay authoritative — it is a registry entity with a
 * turnaround standard, it is what §4, §5 and §8 are about, and `tally(…, 'labdept')` must keep
 * agreeing with this page. So the bench is kept and the assay is drawn from what that bench
 * actually runs. Core's own eight sample types are distributed across the benches that would
 * run them rather than replaced, so the vocabulary a reader already knows is intact.
 */
const TESTS: Record<string, string[]> = {
  Haematology: ['Blood panel', 'Blood smear', 'Coagulation profile'],
  'Clinical Pathology': ['Serum chemistry', 'Urinalysis', 'Cytology'],
  Microbiology: ['Swab · culture', 'Blood culture', 'Sensitivity panel', 'Fungal culture'],
  Serology: ['Serology', 'Brucella titre', 'Tuberculin ELISA'],
  Histopathology: ['Histopathology', 'Necropsy histology', 'Biopsy'],
  'Molecular Diagnostics': ['PCR panel', 'Viral PCR', 'Bacterial PCR'],
  Parasitology: ['Faecal float', 'Larval culture', 'Blood parasite screen', 'Ectoparasite ID'],
  'Water Quality': ['Water quality', 'Ammonia & nitrite', 'Coliform count'],
  Toxicology: ['Aflatoxin screen', 'Heavy metals panel', 'Pesticide residue', 'Mycotoxin screen'],
}

/**
 * How often a bench finds something. Parasitology finds a burden a third of the time and
 * serology is mostly negative, and one rate across all nine would make every bench look the
 * same on the species and site cards.
 */
const POSITIVE: Record<string, number> = {
  Parasitology: 0.34,
  Histopathology: 0.31,
  Microbiology: 0.27,
  'Molecular Diagnostics': 0.22,
  'Clinical Pathology': 0.21,
  Haematology: 0.19,
  Toxicology: 0.18,
  'Water Quality': 0.16,
  Serology: 0.12,
}

/** What the report said, per assay. [positive, negative]. */
const FINDING: Record<string, [string, string]> = {
  'Blood panel': ['Leukocytosis · outside range', 'All analytes in range'],
  'Blood smear': ['Abnormal cell morphology', 'Normal morphology'],
  'Coagulation profile': ['Prolonged clotting time', 'Within reference interval'],
  'Serum chemistry': ['Hepatic enzymes elevated', 'All analytes in range'],
  Urinalysis: ['Protein present', 'No abnormality detected'],
  Cytology: ['Atypical cells present', 'No atypical cells'],
  'Swab · culture': ['Pseudomonas · heavy growth', 'No growth at 48 h'],
  'Blood culture': ['Bacteraemia · organism isolated', 'No growth at 5 days'],
  'Sensitivity panel': ['Multi-drug resistance', 'Sensitive to first line'],
  'Fungal culture': ['Aspergillus isolated', 'No fungal growth'],
  Serology: ['Antibody titre reactive', 'Non-reactive'],
  'Brucella titre': ['Reactive', 'Non-reactive'],
  'Tuberculin ELISA': ['Reactive', 'Non-reactive'],
  Histopathology: ['Granulomatous inflammation', 'No significant lesion'],
  'Necropsy histology': ['Cause of death established', 'No significant lesion'],
  Biopsy: ['Neoplastic change', 'Benign tissue'],
  'PCR panel': ['Target detected', 'Target not detected'],
  'Viral PCR': ['Viral RNA detected', 'Not detected'],
  'Bacterial PCR': ['Target detected', 'Target not detected'],
  'Faecal float': ['Strongyle ova · high burden', 'No ova seen'],
  'Larval culture': ['Haemonchus identified', 'No larvae recovered'],
  'Blood parasite screen': ['Trypanosoma seen', 'No parasites seen'],
  'Ectoparasite ID': ['Sarcoptes identified', 'No ectoparasites'],
  'Water quality': ['Ammonia above threshold', 'All parameters within range'],
  'Ammonia & nitrite': ['Nitrite above threshold', 'Within range'],
  'Coliform count': ['Coliforms above limit', 'Below limit'],
  'Aflatoxin screen': ['Aflatoxin above limit', 'Below reporting limit'],
  'Heavy metals panel': ['Lead above limit', 'Not detected'],
  'Pesticide residue': ['Residue above MRL', 'Below MRL'],
  'Mycotoxin screen': ['Fumonisin above limit', 'Below reporting limit'],
}

/* ── non-animal specimens ────────────────────────────────────────────────── */

const FEED = [
  'Lucerne hay · batch 21',
  'Frozen fish · grade A',
  'Pellet feed · batch 44',
  'Live insect culture',
  'Browse · ficus',
  'Meat consignment · lot 7',
  'Fruit · mixed lot',
  'Fish meal · batch 12',
]

const WATER = ['Tank 9', 'Tank 4', 'Quarantine pond', 'Main lake · north', 'Aviary misting line', 'Holding pool 2']

/* ── the derivation ──────────────────────────────────────────────────────── */

/**
 * How long a bench actually takes, as a multiple of its own turnaround standard.
 *
 * TWO BRANCHES, NOT ONE SPREAD, and the difference is what makes the page readable. A single
 * wide spread centred above 1 makes every bench late: the first cut of this file drew one,
 * and the TAT comparison came out with every bar amber, which is the same as no bar being
 * amber. Real laboratories are mostly on time with a tail that is badly late — a culture that
 * needs a repeat, a sample sent to a partner lab — so that is what this draws. Roughly three
 * in ten run long, and those are the ones sitting in the queue and breaching the standard.
 *
 * CALIBRATED, NOT CHOSEN. The pending queue is every request whose reported day has not
 * arrived, so these numbers decide its size. They are set where the derived queue equals the
 * `labOpen` figure the home screen publishes and `core/checks.ts` asserts — 31. Change them
 * and the page quietly disagrees with the KPI the director just tapped to reach it.
 */
const DELAY_RATE = 0.3
const ON_TIME_FLOOR = 0.45
const ON_TIME_SPAN = 0.6
const LATE_FLOOR = 1.8
const LATE_SPAN = 4.0
/** Share of samples the bench rejects outright — unusable specimen, no result. */
const REJECT_RATE = 0.022

/** The LIMS view of one lab event. Pure, seeded, and stable across reads. */
export function labRecord(ev: Ev): LabRecord {
  const dept = labDepartmentOf(ev.labDeptId ?? '') ?? LAB_DEPARTMENTS[0]
  const r = rng(`${ev.id}:lims`)

  const rejected = r() < REJECT_RATE
  /* Working days around the bench's own standard, never less than one. */
  const late = r() < DELAY_RATE
  const multiple = late ? LATE_FLOOR + r() * LATE_SPAN : ON_TIME_FLOOR + r() * ON_TIME_SPAN
  const lag = Math.max(1, Math.round(dept.turnaround * multiple))
  const due = ev.day + lag
  const reportedDay = rejected ? ev.day + 1 : due

  const status: LabStatus = reportedDay > TODAY ? 'pending' : rejected ? 'rejected' : 'reported'
  const waiting = status === 'pending' ? TODAY - ev.day : undefined

  const menu = TESTS[dept.name] ?? [ev.detail]
  const test = menu[Math.floor(r() * menu.length)]
  const positive = r() < (POSITIVE[dept.name] ?? 0.2)
  const result: LabResult | undefined = status === 'reported' ? (positive ? 'positive' : 'negative') : undefined
  /* A flag is a review state on a reported result, not a third outcome — most flags sit on
     a positive, a few on a negative that was abnormal without meeting the case definition. */
  const flagged = status === 'reported' && (positive ? r() < 0.24 : r() < 0.02)

  const nonAnimal = NON_ANIMAL.has(dept.name)
  const pool = dept.name === 'Toxicology' ? FEED : WATER

  return {
    ev,
    id: `LAB-${ev.id.split('-').slice(1).join('')}`,
    dept,
    labName: labOf(dept.labId)?.name ?? dept.labId,
    siteKey: ev.siteKey,
    siteName: siteOf(ev.siteKey)?.name ?? ev.siteKey,
    test,
    received: ev.day,
    reported: status === 'pending' ? undefined : reportedDay,
    status,
    tat: status === 'pending' ? undefined : reportedDay - ev.day,
    waiting,
    overdue: status === 'pending' && (waiting ?? 0) > dept.turnaround,
    result,
    flagged,
    finding: result ? FINDING[test]?.[result === 'positive' ? 0 : 1] : undefined,
    specimen: nonAnimal
      ? { kind: 'sample', label: pool[Math.floor(r() * pool.length)] }
      : { kind: 'animal', animalId: ev.animalId, speciesName: ev.speciesName },
  }
}

/* ── walking the window ──────────────────────────────────────────────────── */

const siteKeys = (siteKey: string | null): string[] =>
  siteKey ? [siteKey] : SITES.map((s) => s.key).filter((k) => daily('lab', k).length > 0)

/**
 * Every lab record in the window, under the site scope.
 *
 * Walks the same daily series `tally` walks, so the set here and any count taken from the
 * series are the same events. A month is about two hundred records and the longest window
 * about fifteen thousand — small enough to derive in full and memoise per (site, window),
 * which is what lets every section on the page read one object instead of nine scans.
 */
export function labRecordsIn(siteKey: string | null, win: Win): LabRecord[] {
  const out: LabRecord[] = []
  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)
  for (const key of siteKeys(siteKey)) {
    const s = daily('lab', key)
    for (let day = to; day >= from; day--) {
      for (let i = 0; i < s[day]; i++) out.push(labRecord(eventAt('lab', key, day, i)))
    }
  }
  return out
}

/* ── the shape every section reads ───────────────────────────────────────── */

export interface Totals {
  /** Requests received in the window. */
  requests: number
  pending: number
  reported: number
  rejected: number
  overdue: number
  positive: number
  negative: number
  flagged: number
  /** Mean turnaround in days over the reported requests. Null when none reported. */
  tat: number | null
  fastest: number | null
  slowest: number | null
  /** Reported inside the bench's own turnaround standard. */
  withinSla: number
}

const empty = (): Totals => ({
  requests: 0,
  pending: 0,
  reported: 0,
  rejected: 0,
  overdue: 0,
  positive: 0,
  negative: 0,
  flagged: 0,
  tat: null,
  fastest: null,
  slowest: null,
  withinSla: 0,
})

export function totalsOf(rows: LabRecord[]): Totals {
  const t = empty()
  let tatSum = 0
  for (const r of rows) {
    t.requests++
    if (r.status === 'pending') {
      t.pending++
      if (r.overdue) t.overdue++
      continue
    }
    if (r.status === 'rejected') {
      t.rejected++
      continue
    }
    t.reported++
    if (r.result === 'positive') t.positive++
    else t.negative++
    if (r.flagged) t.flagged++
    const tat = r.tat ?? 0
    tatSum += tat
    if (t.fastest === null || tat < t.fastest) t.fastest = tat
    if (t.slowest === null || tat > t.slowest) t.slowest = tat
    if (tat <= r.dept.turnaround) t.withinSla++
  }
  t.tat = t.reported ? tatSum / t.reported : null
  return t
}

/** A named group of records — a department, a site, a species, a test. */
export interface Group extends Totals {
  key: string
  label: string
  sub: string
  rows: LabRecord[]
}

function group(
  rows: LabRecord[],
  keyOf: (r: LabRecord) => string | undefined,
  label: (key: string, rows: LabRecord[]) => { label: string; sub: string },
): Group[] {
  const by = new Map<string, LabRecord[]>()
  for (const r of rows) {
    const k = keyOf(r)
    if (!k) continue
    const at = by.get(k)
    if (at) at.push(r)
    else by.set(k, [r])
  }
  return [...by.entries()]
    .map(([key, list]) => ({ key, ...label(key, list), ...totalsOf(list), rows: list }))
    .sort((a, b) => b.requests - a.requests || a.label.localeCompare(b.label))
}

export interface LabCut {
  totals: Totals
  /** Every department in the registry, including the ones with nothing this window. */
  departments: Group[]
  sites: Group[]
  /** Only the benches whose specimen is an animal — the others have no species. */
  species: Group[]
  tests: Group[]
  /** Toxicology only. Its specimens are feed batches, not animals. */
  foodtox: Group | null
  rows: LabRecord[]
}

/**
 * One walk, every aggregate.
 *
 * Nine sections read off this. Computing them separately would be nine scans per window
 * change and — worse — nine chances for two of them to disagree about what is in scope.
 */
export function labCut(siteKey: string | null, win: Win): LabCut {
  const rows = labRecordsIn(siteKey, win)

  const present = group(
    rows,
    (r) => r.dept.id,
    (_key, list) => ({
      label: list[0].dept.name,
      sub: labOf(list[0].dept.labId)?.code ?? '',
    }),
  )
  /* Every department in the registry, always. A bench that received nothing this month is
     itself a finding, and a list that silently drops it cannot be sorted or compared. */
  const seen = new Set(present.map((g) => g.key))
  const departments = [
    ...present,
    ...LAB_DEPARTMENTS.filter((d) => !seen.has(d.id)).map((d) => ({
      key: d.id,
      label: d.name,
      sub: labOf(d.labId)?.code ?? '',
      ...empty(),
      rows: [] as LabRecord[],
    })),
  ]

  const tox = departments.find((d) => d.label === 'Toxicology') ?? null

  return {
    totals: totalsOf(rows),
    departments,
    sites: group(rows, (r) => r.siteKey, (_key, list) => ({
      label: list[0].siteName,
      sub: (() => {
        const n = new Set(list.map((r) => r.dept.id)).size
        return `${n} bench${n === 1 ? '' : 'es'}`
      })(),
    })),
    species: group(
      rows.filter((r) => r.specimen.kind === 'animal'),
      (r) => (r.specimen.kind === 'animal' ? r.specimen.speciesName : undefined),
      (key, list) => {
        const n = new Set(list.map((r) => r.dept.id)).size
        return { label: key, sub: `${n} bench${n === 1 ? '' : 'es'}` }
      },
    ),
    tests: group(rows, (r) => r.test, (key, list) => ({ label: key, sub: list[0].dept.name })),
    foodtox: tox && tox.requests > 0 ? tox : null,
    rows,
  }
}

/* ── formatting ──────────────────────────────────────────────────────────── */

/**
 * Turnaround, in the unit that reads.
 *
 * Days to one decimal past a day — the form the module already used — and whole hours
 * below it, because "0.3 d" is a number nobody converts in their head.
 */
export function tatLabel(days: number | null | undefined): string {
  if (days === null || days === undefined) return '—'
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} h`
  return `${days.toFixed(1)} d`
}

export const pct = (part: number, whole: number): number => (whole === 0 ? 0 : (part / whole) * 100)

/** The specimen line a record row shows — an animal, or a feed batch. */
export const specimenLabel = (r: LabRecord): string =>
  r.specimen.kind === 'animal' ? `${r.specimen.speciesName} · ${r.specimen.animalId}` : r.specimen.label

export const statusLabel = (r: LabRecord): string =>
  r.status === 'pending'
    ? r.overdue
      ? 'Pending · overdue'
      : 'Pending'
    : r.status === 'rejected'
      ? 'Rejected'
      : r.result === 'positive'
        ? 'Positive'
        : 'Negative'

export const statusTone = (r: LabRecord): 'good' | 'warn' | 'bad' | 'neutral' =>
  r.status === 'pending' ? (r.overdue ? 'bad' : 'warn') : r.status === 'rejected' ? 'neutral' : r.result === 'positive' ? 'bad' : 'good'

export { LABS, LAB_DEPARTMENTS, count, page }
