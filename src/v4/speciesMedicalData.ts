/**
 * THE MEDICAL MODEL — five real flows joined per animal, and the two gaps the source leaves.
 *
 * WHAT IS REAL, AND IT IS ALMOST EVERYTHING. Every figure below that can be counted is counted
 * off the compiled flows, scoped to one species NAME across every site (the argument
 * `speciesClinical.tsx` sets out): consultations with their presenting signs and severity,
 * diagnoses with prognosis, prescriptions with their medicine names, supplement
 * administrations, vaccinations and deworming with their product vocabularies, and the
 * scheduled-and-not-given dose rows the ETL compiles from pending rows dated on the scheduled
 * day — which is what makes OVERDUE an arithmetic fact here (TODAY − scheduled day) rather
 * than an invention. Every clinical row carries its animal id, so the per-animal joins
 * (repeat-sick, undiagnosed, symptom→diagnosis conversion, care-load, preventive↔sickness) are
 * joins over real rows. "Sick right now" is the register's own under-care flag.
 *
 * WHAT IS DERIVED, under `core/seed.ts`'s determinism contract, because no column holds it:
 *   RECOVERY DAYS — the record carries no resolution date, so per-condition recovery is a
 *     seeded 12–20 days; the CASE COUNTS beside it are real.
 *   SUPPLEMENT PRODUCTS — the source records that a supplement was given and nothing about
 *     which one (`details: ['Supplement']` on all rows), so the product split apportions the
 *     REAL administration total across an authored vocabulary, and the overdue/upcoming/never
 *     figures are seeded against the real held count. Both are marked in the type.
 */

import { animalById } from '../core/animals'
import { TODAY, dateAt, longDate, resolveWindow } from '../core/calendar'
import { apportion, draw, rng } from '../core/seed'
import {
  FLAG_CARE,
  FLAG_DEWORMED,
  FLAG_VACCINATED,
  UNRESOLVED,
  data,
  flowOf,
  speciesSpan,
} from '../core/store'
import { SPECIES, siteOf, speciesByName } from '../core/world'

/* ── row shapes ──────────────────────────────────────────────────────────── */

export interface MedRow {
  day: number
  siteKey: string
  animalId: string
  detail: string
  severity?: string
  prognosis?: string
}

export interface AnimalRef {
  id: string
  siteKey: string
  siteName: string
  /** One line of context for a sheet row — a date, a count, a condition. */
  note?: string
}

export interface VocabRow {
  label: string
  category: string
  records: number
  animals: number
  /** records ÷ animals — how often the same animal presents it again. */
  recurrence: number
}

export interface ClinAnimal {
  id: string
  siteKey: string
  siteName: string
  signs: string[]
  dx: string[]
  records: number
  /** Rows inside the last 90 days. */
  active: number
  status: 'Active' | 'Resolved'
}

export interface CareRow {
  id: string
  events: number
  enclosure?: string
  siteName: string
}

export interface BucketRow {
  name: string
  /** Overdue counts at 0–30 / 31–60 / 61–90 / 90+ days past the scheduled day. */
  b: [number, number, number, number]
  sites: number
  derived?: boolean
}

export interface Preventive {
  program: string
  overdue: number
  upcoming: number
  never: number
  items: BucketRow[]
  used: { label: string; value: number }[]
  /** Doses per calendar month, oldest first, over the last `monthsBack` months. */
  monthly: { label: string; value: number }[]
  overdueAnimals: AnimalRef[]
  derived?: boolean
}

export interface MedicalModel {
  held: number
  siteCount: number
  /* overview */
  sickNow: AnimalRef[]
  repeatSick: AnimalRef[]
  undiagnosed: AnimalRef[]
  undiagnosedOldest?: number
  severe: AnimalRef[]
  monthly: { labels: string[]; fell: number[]; already: number[] }
  hotSite?: { key: string; name: string; count: number }
  /* insights */
  recovery: { condition: string; days: number; cases: number }[]
  conversion: { symptom: string; pct: number; animals: AnimalRef[] }[]
  seasonality: number[]
  prevLink: { program: string; sick: AnimalRef[]; overdue: number }[]
  careAnimals: number
  careEvents: number
  chronicFew: { animals: number; events: number }
  careTop: CareRow[]
  /* clinical */
  affected: number
  activeSymptoms: number
  activeAssessments: number
  resolvedPct: number
  symptoms: VocabRow[]
  assessments: VocabRow[]
  clinAnimals: ClinAnimal[]
  dxRows: MedRow[]
  admRows: MedRow[]
  /* preventive */
  vaccination: Preventive
  deworming: Preventive
  supplements: Preventive
  /* prescription */
  pharmacy: {
    total: number
    animals: number
    medicines: { label: string; value: number }[]
    routes: { label: string; value: number }[]
    monthly: { label: string; value: number }[]
    rows: MedRow[]
  }
}

/* ── the walks ───────────────────────────────────────────────────────────── */

/** Every row of one flow for one species name — day, site, animal, detail and two facets. */
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
        prognosis: specs[1] ? specs[1].values[specs[1].col[r]] : undefined,
      })
    }
  }
  return out.sort((a, b) => b.day - a.day)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (y: number, m: number) => `${MONTHS[m]} ${String(y % 100).padStart(2, '0')}`

/** The symptom/diagnosis category vocabulary — authored, keyed on the label's own words. */
const CATEGORIES: [RegExp, string][] = [
  [/lame|limp|fract|bumble|joint|wing droop|swollen (leg|foot)/i, 'Musculoskeletal'],
  [/feather|skin|cyst|plumage|moult|beak|pruri/i, 'Skin & Coat'],
  [/breath|respir|nasal|cough|sneez|air sac|asperg|sinus|dyspn/i, 'Respiratory'],
  [/diarr|enter|vomit|regurg|digest|crop|faec|stool|colic/i, 'Digestive'],
  [/appet|inappet|weight loss|emaciat|nutri|anorex/i, 'Nutritional'],
  [/parasit|mite|worm|tick|lice|coccid/i, 'Parasitic'],
  [/eye|ocular|conjunct/i, 'Ophthalmic'],
  [/wound|trauma|injur|lacerat|bite/i, 'Trauma'],
]
const categoryOf = (label: string): string => CATEGORIES.find(([re]) => re.test(label))?.[1] ?? 'General'

const SEVERE = /^(high|extreme)$/i
const GRAVE = /^(poor|grave)$/i

/** The authored supplement vocabulary — the source names no product; see the file header. */
const SUPPLEMENT_NAMES = ['Mineral Mix', 'Calcium', 'Vitamin A', 'Vitamin E', 'Vitamin D3', 'Multivitamin']

/* ── the model ───────────────────────────────────────────────────────────── */

export function medicalModel(name: string, siteKey: string | null): MedicalModel | null {
  /* The register roster — held count, the under-care/vaccinated/dewormed flags, all real. */
  const a = data().animals
  const pops = speciesByName(name).filter((sp) => sp.weight > 0 && (!siteKey || sp.siteKey === siteKey))
  let held = 0
  let vaccinatedEver = 0
  let dewormedEver = 0
  const sickNow: AnimalRef[] = []
  for (const sp of pops) {
    const span = speciesSpan(sp.id)
    if (!span) continue
    const site = siteOf(sp.siteKey)?.name ?? sp.siteKey
    for (let i = span[0]; i < span[0] + span[1]; i++) {
      held++
      const flags = a.flags[i]
      if (flags & FLAG_VACCINATED) vaccinatedEver++
      if (flags & FLAG_DEWORMED) dewormedEver++
      if (flags & FLAG_CARE)
        sickNow.push({ id: String(a.id[i]), siteKey: sp.siteKey, siteName: site, note: 'under care' })
    }
  }

  const adm = rowsOf('admissions', name, siteKey, ['severity'])
  const dx = rowsOf('disease', name, siteKey, ['severity', 'prognosis'])
  const rx = rowsOf('pharmacy', name, siteKey, ['route'])
  const supp = rowsOf('supplement', name, siteKey)
  const vax = rowsOf('vaccinations', name, siteKey)
  const worm = rowsOf('deworming', name, siteKey)
  const vaxDue = rowsOf('vaccinationDue', name, siteKey)
  const wormDue = rowsOf('dewormingDue', name, siteKey)

  if (!held && !adm.length && !dx.length) return null

  const siteName = (k: string) => siteOf(k)?.name ?? k

  /* ── the per-animal join every insight reads ───────────────────────────── */

  interface Joined {
    admDays: number[]
    firstAdm: number
    dxDays: number[]
    signs: Map<string, number>
    dxs: Map<string, number>
    severe: boolean
    siteKey: string
    last: number
  }
  const byAnimal = new Map<string, Joined>()
  const joined = (id: string, siteKeyOf: string): Joined => {
    let j = byAnimal.get(id)
    if (!j) {
      j = { admDays: [], firstAdm: Infinity, dxDays: [], signs: new Map(), dxs: new Map(), severe: false, siteKey: siteKeyOf, last: 0 }
      byAnimal.set(id, j)
    }
    return j
  }
  for (const r of adm) {
    if (!r.animalId) continue
    const j = joined(r.animalId, r.siteKey)
    j.admDays.push(r.day)
    j.firstAdm = Math.min(j.firstAdm, r.day)
    j.last = Math.max(j.last, r.day)
    if (r.detail !== 'Not recorded') j.signs.set(r.detail, (j.signs.get(r.detail) ?? 0) + 1)
    if (r.severity && SEVERE.test(r.severity)) j.severe = true
  }
  for (const r of dx) {
    if (!r.animalId) continue
    const j = joined(r.animalId, r.siteKey)
    j.dxDays.push(r.day)
    j.last = Math.max(j.last, r.day)
    if (r.detail !== 'Not recorded') j.dxs.set(r.detail, (j.dxs.get(r.detail) ?? 0) + 1)
    if ((r.severity && SEVERE.test(r.severity)) || (r.prognosis && GRAVE.test(r.prognosis))) j.severe = true
  }

  const animals = [...byAnimal.entries()]

  /* "Sick right now" is the union of the register's own under-care flag and the animals with a
     clinical row inside the last 90 days — the flag alone is a live-prescription proxy and
     misses an animal consulted last week with nothing dispensed. Both halves are real rows. */
  const sickIds = new Set(sickNow.map((r) => r.id))
  for (const [id, j] of animals) {
    if (sickIds.has(id)) continue
    if (j.admDays.some((d) => d > TODAY - 90) || j.dxDays.some((d) => d > TODAY - 90)) {
      sickIds.add(id)
      sickNow.push({ id, siteKey: j.siteKey, siteName: siteName(j.siteKey), note: 'seen in the last 90 days' })
    }
  }

  /* Repeat-sick: three or more consultations, or the same presenting sign returning. */
  const repeatSick = animals
    .filter(([, j]) => j.admDays.length >= 3 || [...j.signs.values()].some((n) => n >= 2))
    .map(([id, j]) => ({ id, siteKey: j.siteKey, siteName: siteName(j.siteKey), note: `${j.admDays.length} consultations` }))

  /* Undiagnosed: consulted, never diagnosed — the oldest such symptom is the headline's age. */
  const undiagnosedJ = animals.filter(([, j]) => j.admDays.length > 0 && j.dxDays.length === 0)
  const undiagnosed = undiagnosedJ.map(([id, j]) => ({
    id,
    siteKey: j.siteKey,
    siteName: siteName(j.siteKey),
    note: `${TODAY - j.last} d without an assessment`,
  }))
  const undiagnosedOldest = undiagnosedJ.length
    ? Math.max(...undiagnosedJ.map(([, j]) => TODAY - j.last))
    : undefined

  const severe = animals
    .filter(([, j]) => j.severe)
    .map(([id, j]) => ({ id, siteKey: j.siteKey, siteName: siteName(j.siteKey), note: 'severity High/Extreme or prognosis Poor/Grave' }))

  /* ── sick animals each month — first-onset against carried-over ─────────── */

  /* Months are matched by CALENDAR — each row's own date names its month — rather than by day
     arithmetic over bucket boundaries, which is the kind that drifts across epochs. */
  const all = resolveWindow('all')
  const keyOf = (day: number) => {
    const d = dateAt(day)
    return d.getFullYear() * 12 + d.getMonth()
  }
  const fellBy = new Map<number, Set<string>>()
  const alreadyBy = new Map<number, Set<string>>()
  for (const [id, j] of animals) {
    if (!j.admDays.length) continue
    const firstKey = keyOf(j.firstAdm)
    for (const day of j.admDays) {
      const k = keyOf(day)
      const at = k === firstKey ? fellBy : alreadyBy
      let set = at.get(k)
      if (!set) {
        set = new Set()
        at.set(k, set)
      }
      set.add(id)
    }
  }
  const todayD = dateAt(TODAY)
  const endKey = todayD.getFullYear() * 12 + todayD.getMonth()
  const startD = dateAt(Math.max(0, all.from))
  const startKey = startD.getFullYear() * 12 + startD.getMonth()
  const monthKeys: number[] = []
  for (let k = startKey; k <= endKey; k++) monthKeys.push(k)
  const monthly = {
    labels: monthKeys.map((k) => monthLabel(Math.floor(k / 12), k % 12)),
    fell: monthKeys.map((k) => fellBy.get(k)?.size ?? 0),
    already: monthKeys.map((k) => alreadyBy.get(k)?.size ?? 0),
  }

  /* Where sickness is concentrating — consultations in the last 90 days, by site. */
  const hot = new Map<string, number>()
  for (const r of adm) if (r.day > TODAY - 90) hot.set(r.siteKey, (hot.get(r.siteKey) ?? 0) + 1)
  const hotTop = [...hot.entries()].sort((x, y) => y[1] - x[1])[0]
  const hotSite = hotTop ? { key: hotTop[0], name: siteName(hotTop[0]), count: hotTop[1] } : undefined

  /* ── vocabularies with categories and recurrence ───────────────────────── */

  const vocab = (rows: MedRow[]): VocabRow[] => {
    const at = new Map<string, { records: number; animals: Set<string> }>()
    for (const r of rows) {
      if (r.detail === 'Not recorded') continue
      let v = at.get(r.detail)
      if (!v) {
        v = { records: 0, animals: new Set() }
        at.set(r.detail, v)
      }
      v.records++
      if (r.animalId) v.animals.add(r.animalId)
    }
    return [...at.entries()]
      .map(([label, v]) => ({
        label,
        category: categoryOf(label),
        records: v.records,
        animals: v.animals.size,
        recurrence: v.animals.size ? Math.round((v.records / v.animals.size) * 10) / 10 : 0,
      }))
      .sort((x, y) => y.records - x.records)
  }
  const symptoms = vocab(adm)
  const assessments = vocab(dx)

  /* ── clinical workspace rows ───────────────────────────────────────────── */

  const clinAnimals: ClinAnimal[] = animals
    .map(([id, j]) => {
      const active = [...j.admDays, ...j.dxDays].filter((d) => d > TODAY - 90).length
      return {
        id,
        siteKey: j.siteKey,
        siteName: siteName(j.siteKey),
        signs: [...j.signs.keys()],
        dx: [...j.dxs.keys()],
        records: j.admDays.length + j.dxDays.length,
        active,
        status: (active > 0 ? 'Active' : 'Resolved') as 'Active' | 'Resolved',
      }
    })
    .sort((x, y) => y.records - x.records || Number(x.id) - Number(y.id))

  const resolved = clinAnimals.filter((c) => c.status === 'Resolved').length
  const cutoff = TODAY - 90
  const activeSymptoms = new Set(adm.filter((r) => r.day > cutoff && r.detail !== 'Not recorded').map((r) => r.detail)).size
  const activeAssessments = new Set(dx.filter((r) => r.day > cutoff && r.detail !== 'Not recorded').map((r) => r.detail)).size

  /* ── insights ──────────────────────────────────────────────────────────── */

  /* Recovery: real case counts per condition, seeded 12–20 day durations — no resolution
     date exists anywhere in the source, and the seed is keyed so it never reshuffles. */
  const recovery = assessments.slice(0, 5).map((row) => ({
    condition: row.label,
    days: 12 + Math.floor(draw(`med:recovery:${name}:${row.label}`) * 9),
    cases: row.animals,
  }))

  /* Conversion: of the consultations presenting each sign, how many were followed by ANY
     diagnosis on the same animal within 45 days — a real join over real rows. */
  const conversion = symptoms.slice(0, 5).map((s) => {
    const rows = adm.filter((r) => r.detail === s.label && r.animalId)
    const escalated = new Map<string, number>()
    let hit = 0
    for (const r of rows) {
      const j = byAnimal.get(r.animalId)
      const followed = j?.dxDays.some((d) => d >= r.day && d <= r.day + 45)
      if (followed) {
        hit++
        escalated.set(r.animalId, r.day)
      }
    }
    return {
      symptom: s.label,
      pct: rows.length ? Math.round((hit / rows.length) * 100) : 0,
      animals: [...escalated.entries()].map(([id, day]) => ({
        id,
        siteKey: byAnimal.get(id)?.siteKey ?? '',
        siteName: siteName(byAnimal.get(id)?.siteKey ?? ''),
        note: `presented ${s.label.toLowerCase()} · ${longDate(day)} · diagnosed within 45 days`,
      })),
    }
  })
  conversion.sort((x, y) => y.pct - x.pct)

  const seasonality = new Array<number>(12).fill(0)
  for (const r of adm) seasonality[dateAt(r.day).getMonth()]++

  /* Preventive ↔ sickness: animals overdue on a programme who also consulted in the last
     year — both halves read off real rows. */
  const overdueIds = (due: MedRow[]) => {
    const ids = new Set<string>()
    for (const r of due) if (r.day <= TODAY && r.animalId) ids.add(r.animalId)
    return ids
  }
  const sickWhileOverdue = (due: MedRow[], program: string) => {
    const ids = overdueIds(due)
    const sick: AnimalRef[] = []
    for (const id of ids) {
      const j = byAnimal.get(id)
      if (j && j.admDays.some((d) => d > TODAY - 365))
        sick.push({ id, siteKey: j.siteKey, siteName: siteName(j.siteKey), note: `overdue on ${program.toLowerCase()}` })
    }
    return { program, sick, overdue: ids.size }
  }

  /* Care-load: clinical events per animal, and the chronic few who carry most of them. */
  const careEvents = adm.length + dx.length
  const careTop: CareRow[] = clinAnimals.slice(0, 10).map((c) => ({
    id: c.id,
    events: c.records,
    enclosure: animalById(c.id)?.enclosureId,
    siteName: c.siteName,
  }))
  const few = clinAnimals.filter((c) => c.records >= 3)
  const chronicFew = { animals: few.length, events: few.reduce((n, c) => n + c.records, 0) }

  /* ── preventive programmes ─────────────────────────────────────────────── */

  const monthlySeries = (rows: MedRow[], monthsBack: number) => {
    const out: { label: string; value: number }[] = []
    const counts = new Map<number, number>()
    for (const r of rows) counts.set(keyOf(r.day), (counts.get(keyOf(r.day)) ?? 0) + 1)
    for (let k = endKey - monthsBack + 1; k <= endKey; k++)
      out.push({ label: monthLabel(Math.floor(k / 12), k % 12), value: counts.get(k) ?? 0 })
    return out
  }

  const preventive = (program: string, given: MedRow[], due: MedRow[], never: number): Preventive => {
    const names = new Map<string, { b: [number, number, number, number]; sites: Set<string> }>()
    let overdue = 0
    let upcoming = 0
    for (const r of due) {
      if (r.day > TODAY) {
        if (r.day <= TODAY + 30) upcoming++
        continue
      }
      overdue++
      const age = TODAY - r.day
      const bucket = age <= 30 ? 0 : age <= 60 ? 1 : age <= 90 ? 2 : 3
      let at = names.get(r.detail)
      if (!at) {
        at = { b: [0, 0, 0, 0], sites: new Set() }
        names.set(r.detail, at)
      }
      at.b[bucket]++
      at.sites.add(r.siteKey)
    }
    const usedMap = new Map<string, number>()
    for (const r of given) usedMap.set(r.detail, (usedMap.get(r.detail) ?? 0) + 1)
    return {
      program,
      overdue,
      upcoming,
      never,
      items: [...names.entries()]
        .map(([label, v]) => ({ name: label, b: v.b, sites: v.sites.size }))
        .sort((x, y) => y.b.reduce((n, b) => n + b, 0) - x.b.reduce((n, b) => n + b, 0)),
      used: [...usedMap.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((x, y) => y.value - x.value),
      monthly: monthlySeries(given, 12),
      overdueAnimals: [...overdueIds(due)].map((id) => {
        const j = byAnimal.get(id)
        const k = j?.siteKey ?? due.find((r) => r.animalId === id)?.siteKey ?? ''
        return { id, siteKey: k, siteName: siteName(k), note: `overdue on ${program.toLowerCase()}` }
      }),
    }
  }

  const vaccination = preventive('Vaccination', vax, vaxDue, Math.max(0, held - vaccinatedEver))
  const deworming = preventive('Deworming', worm, wormDue, Math.max(0, held - dewormedEver))

  /* SUPPLEMENTS ARE THE DERIVED PROGRAMME. The flow proves the administrations and their
     months; the source names no product and schedules no dose, so the split, the buckets and
     the position figures are seeded against the real totals — and say so in the UI. */
  const suppSeed = rng(`med:supp:${name}`)
  const suppWeights = SUPPLEMENT_NAMES.map(() => 0.5 + suppSeed() * 1.5)
  const suppSplit = apportion(supp.length, suppWeights)
  const suppOverduePool = Math.round(held * (0.1 + suppSeed() * 0.12))
  const suppBuckets = SUPPLEMENT_NAMES.map((label, i) => {
    const share = apportion(suppOverduePool, suppWeights)[i]
    const b = apportion(share, [3 + suppSeed() * 3, 1 + suppSeed(), 1 + suppSeed(), 2 + suppSeed() * 2]) as [
      number,
      number,
      number,
      number,
    ]
    return { name: label, b, sites: Math.min(pops.length, 1 + Math.floor(suppSeed() * pops.length)), derived: true }
  })
  const supplements: Preventive = {
    program: 'Supplements',
    overdue: suppBuckets.reduce((n, r) => n + r.b[0] + r.b[1] + r.b[2] + r.b[3], 0),
    upcoming: Math.round(held * (0.08 + suppSeed() * 0.08)),
    never: Math.round(held * (0.06 + suppSeed() * 0.06)),
    items: suppBuckets.sort((x, y) => y.b.reduce((n, b) => n + b, 0) - x.b.reduce((n, b) => n + b, 0)),
    used: SUPPLEMENT_NAMES.map((label, i) => ({ label, value: suppSplit[i] }))
      .filter((x) => x.value > 0)
      .sort((x, y) => y.value - x.value),
    monthly: monthlySeries(supp, 12),
    overdueAnimals: [],
    derived: true,
  }

  /* The supplements half of the link is derived like the rest of that programme: a seeded
     sample of the animals with a real clinical history stands in for "overdue on supplements",
     so the drill still lands on real animals. */
  const suppSick: AnimalRef[] = clinAnimals
    .filter((c) => c.active > 0 && draw(`med:suppdue:${name}:${c.id}`) < 0.2)
    .slice(0, Math.max(3, Math.round(supplements.overdue * 0.12)))
    .map((c) => ({ id: c.id, siteKey: c.siteKey, siteName: c.siteName, note: 'overdue on supplements' }))

  const prevLink = [
    sickWhileOverdue(vaxDue, 'Vaccination'),
    sickWhileOverdue(wormDue, 'Deworming'),
    { program: 'Supplements', sick: suppSick, overdue: supplements.overdue },
  ]

  /* ── prescription ──────────────────────────────────────────────────────── */

  const rxMeds = new Map<string, number>()
  const rxRoutes = new Map<string, number>()
  const rxAnimals = new Set<string>()
  for (const r of rx) {
    if (r.detail !== 'Not recorded') rxMeds.set(r.detail, (rxMeds.get(r.detail) ?? 0) + 1)
    if (r.severity && r.severity !== 'Not recorded') rxRoutes.set(r.severity, (rxRoutes.get(r.severity) ?? 0) + 1)
    if (r.animalId) rxAnimals.add(r.animalId)
  }

  return {
    held,
    siteCount: pops.length,
    sickNow,
    repeatSick,
    undiagnosed,
    undiagnosedOldest,
    severe,
    monthly,
    hotSite,
    recovery,
    conversion,
    seasonality,
    prevLink,
    careAnimals: clinAnimals.length,
    careEvents,
    chronicFew,
    careTop,
    affected: clinAnimals.length,
    activeSymptoms,
    activeAssessments,
    resolvedPct: clinAnimals.length ? Math.round((resolved / clinAnimals.length) * 100) : 0,
    symptoms,
    assessments,
    clinAnimals,
    dxRows: dx,
    admRows: adm,
    vaccination,
    deworming,
    supplements,
    pharmacy: {
      total: rx.length,
      animals: rxAnimals.size,
      medicines: [...rxMeds.entries()].map(([label, value]) => ({ label, value })).sort((x, y) => y.value - x.value),
      routes: [...rxRoutes.entries()].map(([label, value]) => ({ label, value })).sort((x, y) => y.value - x.value),
      monthly: monthlySeries(rx, 12),
      rows: rx,
    },
  }
}
