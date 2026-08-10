/**
 * THE PHARMACY SUPPLY MODEL — requests, the pending queue, expiry and availability.
 *
 * WHAT ALREADY EXISTED AND WHAT DID NOT. `core/` holds the dispensing side in full: a real
 * daily `pharmacy` flow per site, twenty-eight medicines with categories and dispensing units,
 * a central store and six site pharmacies, and every dispensing event attributed to one
 * medicine and one pharmacy. So "what is being used" is answered from the existing model and
 * nothing here re-derives it.
 *
 * The other four things the brief asks for — what sites REQUESTED, what is still pending and
 * how old it is, what expired and what it cost, and what could not be supplied — had no model
 * at all. The page they were on stated them as twenty-odd typed constants: `₹18.5L`, `38
 * pending`, `[18, 9, 4, 7]`, `41 d`. Constants cannot be scoped to a site, cannot be cut to a
 * date range, and cannot be drilled into, which is three of the brief's hard requirements.
 *
 * SO THE SUPPLY SIDE IS DERIVED, THE SAME WAY THE COLLECTION IS. `core/animals.ts` builds
 * 215,432 animals as pure functions of an id rather than storing them; a request here is a
 * pure function of (site, day, index) in exactly that idiom. The same request has the same
 * medicine, quantity and lead time on every read, in this session and the next, so a list can
 * be paged, filtered and re-opened without a row moving. Nothing is stored and nothing is
 * random.
 *
 * THREE SECTIONS, ONE MODEL. Requests, the pending queue and the unavailable list are three
 * readings of the same array rather than three tables: a request that cannot be supplied IS
 * the unavailable record, and a request whose lead time has not elapsed IS the pending record.
 * That is what makes "12 unavailable medicines" and "Ivermectin · 3 sites affected" reconcile
 * without anybody keeping them in step.
 *
 * THIS FILE IS PAGE-LOCAL BY DESIGN. It reads `core/` and never writes to it, so no other
 * module's figures move.
 */

import { TODAY, type Win, type WindowKey } from '../../core/calendar'
import { tally } from '../../core/events'
import { readSite } from '../../core/series'
import { rng } from '../../core/seed'
import { MEDICINES, PHARMACIES, SITES, medicineOf, siteOf, type Medicine } from '../../core/world'

/* ── money ───────────────────────────────────────────────────────────────── */

/** Indian units, as the rest of the product already prints them — "₹9.8L", "₹1.24 Cr". */
export function inr(n: number): string {
  const v = Math.round(n)
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`
  if (v >= 1_000) return `₹${Math.round(v / 1_000)}k`
  return `₹${v}`
}

/**
 * What one dispensing unit of a medicine costs.
 *
 * A band per registry category, and a seeded draw inside it — so an anaesthetic is dear and a
 * saline bag is cheap, and the same medicine costs the same rupees wherever it is counted. The
 * bands are the only judgement here; every rupee figure on the page is a quantity times one of
 * these, never a typed total.
 */
const PRICE: Record<Medicine['category'], [number, number]> = {
  Anaesthetic: [400, 1400],
  Antibiotic: [180, 620],
  Antifungal: [120, 480],
  Anthelmintic: [90, 340],
  Analgesic: [70, 260],
  Vaccine: [60, 220],
  Supplement: [40, 180],
  Fluid: [45, 140],
}

const COST = new Map<string, number>(
  MEDICINES.map((m) => {
    const [lo, hi] = PRICE[m.category]
    return [m.id, lo + Math.floor(rng(`cost:${m.id}`)() * (hi - lo + 1))]
  }),
)

export const unitCost = (medicineId: string): number => COST.get(medicineId) ?? 0

/**
 * Fold a string for matching.
 *
 * THE REGISTRY ALREADY STORES GENERIC NAMES. "Enrofloxacin", "Meloxicam", "Praziquantel" are
 * International Nonproprietary Names, not brands — there is no separate generic column to search
 * because the name column IS the generic one. What was actually missing was tolerance: the
 * strings carry en dashes, apostrophes, strengths and forms, so "amoxicillin clavulanate" missed
 * "Amoxicillin–Clavulanate", "ringers lactate" missed "Ringer's Lactate" and "vitamin b complex"
 * missed "Vitamin B-complex". Three plausible queries, three empty result sets.
 *
 * So punctuation folds to a space, apostrophes vanish rather than splitting a word, diacritics
 * are stripped, and digits, points and per-cent signs survive so "0.9%" and "10%" stay findable.
 */
export const fold = (s: string): string =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.%]+/g, ' ')
    .trim()

/**
 * Every query token must appear somewhere in the row's fields.
 *
 * Token-wise rather than whole-string, so word order does not matter and a partial name works:
 * "amox clav" finds Amoxicillin–Clavulanate, "med 1189" and "MED-1189" both find Dextrose.
 */
export function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = fold(query)
  if (!q) return true
  const hay = fold(fields.filter(Boolean).join(' '))
  return q.split(' ').every((t) => hay.includes(t))
}

/** A stable catalogue number, so a medicine can be searched for by something other than name. */
const CODE = new Map<string, string>(MEDICINES.map((m, i) => [m.id, `MED-${String(1000 + i * 7)}`]))
export const medCode = (medicineId: string): string => CODE.get(medicineId) ?? '—'

/* ── the four categories the brief reads in ──────────────────────────────── */

export type Category = 'Medication' | 'Vaccination' | 'Supplements' | 'Consumables'

export const CATEGORIES: Category[] = ['Medication', 'Vaccination', 'Supplements', 'Consumables']

/**
 * The registry's eight pharmacological categories, folded into the four an executive reads in.
 *
 * The fold is stated once here rather than in the six cards that need it. It is a partition —
 * every medicine lands in exactly one — which is what lets the four category figures sum to the
 * dispensing total without being reconciled.
 */
const FOLD: Record<Medicine['category'], Category> = {
  Antibiotic: 'Medication',
  Anthelmintic: 'Medication',
  Analgesic: 'Medication',
  Anaesthetic: 'Medication',
  Antifungal: 'Medication',
  Vaccine: 'Vaccination',
  Supplement: 'Supplements',
  Fluid: 'Consumables',
}

export const categoryOf = (medicineId: string): Category => {
  const m = medicineOf(medicineId)
  return m ? FOLD[m.category] : 'Medication'
}

export const medicinesIn = (c: Category): Medicine[] => MEDICINES.filter((m) => FOLD[m.category] === c)

/* ── usage · from the existing dispensing flow ───────────────────────────── */

export interface MedicineUse {
  id: string
  name: string
  category: Category
  /** Registry category — "Antibiotic", "Vaccine". The finer word, for a record row. */
  kind: Medicine['category']
  units: number
}

export interface CategoryUse {
  category: Category
  units: number
  percent: number
  /** How many distinct medicines were issued in this category. */
  medicines: number
}

export interface Usage {
  total: number
  categories: CategoryUse[]
  byMedicine: MedicineUse[]
}

/**
 * Dispensing, grouped by medicine and folded into the four categories.
 *
 * One pass over the window's events, which is the same pass the medicine entity page already
 * makes — so a category total here and a medicine's own figure there are the same numbers
 * aggregated twice rather than two independent counts.
 */
export function usage(siteKey: string | null, win: Win): Usage {
  const rows = tally('pharmacy', siteKey, win, 'medicine').flatMap<MedicineUse>((t) => {
    const m = medicineOf(t.key)
    return m ? [{ id: m.id, name: m.name, category: FOLD[m.category], kind: m.category, units: t.value }] : []
  })

  const total = rows.reduce((n, r) => n + r.units, 0)
  const categories = CATEGORIES.map((category) => {
    const mine = rows.filter((r) => r.category === category)
    const units = mine.reduce((n, r) => n + r.units, 0)
    return { category, units, percent: total ? (units / total) * 100 : 0, medicines: mine.length }
  })

  return { total, categories, byMedicine: rows.sort((a, b) => b.units - a.units) }
}

/**
 * The stacked series behind the trend — one column per bucket, four bands per column.
 *
 * The buckets partition the range, so the whole thing costs one pass over the range's events
 * however many columns are asked for, and the columns sum to the range total exactly.
 */
export function usageBands(
  siteKey: string | null,
  win: Win,
  columns: number,
): { bands: number[][]; totals: number[]; spans: { from: number; to: number }[] } {
  const n = Math.max(1, Math.min(columns, win.days))
  const size = win.days / n
  const spans = Array.from({ length: n }, (_, i) => ({
    from: win.from + Math.floor(i * size),
    to: Math.min(TODAY, win.from + Math.floor((i + 1) * size) - 1),
  }))

  const bands = spans.map((s) => {
    const at = new Map<Category, number>(CATEGORIES.map((c) => [c, 0]))
    for (const t of tally('pharmacy', siteKey, { ...win, ...s, days: s.to - s.from + 1 }, 'medicine')) {
      const c = categoryOf(t.key)
      at.set(c, (at.get(c) ?? 0) + t.value)
    }
    return CATEGORIES.map((c) => at.get(c) ?? 0)
  })

  return { bands, totals: bands.map((b) => b.reduce((x, y) => x + y, 0)), spans }
}

/** Which sites dispensed, for a card that needs the total and nothing finer. */
export const usageBySite = (siteKey: string | null, win: Win) => tally('pharmacy', siteKey, win, 'site')

/**
 * Dispensing per site AND per medicine.
 *
 * Every dispensing event carries both a `siteKey` and a `medicineId`, so this cross-tabulation
 * is EXACT — which matters, because the category and medicine sheets were previously showing a
 * site split apportioned from each site's total by the category's overall share. That estimate
 * was close and it was still an estimate sitting in a panel whose whole job is to say where a
 * shortage actually is.
 *
 * Costs one pass over the window: each site's events are walked once and no site's twice.
 */
export function siteMedicine(siteKey: string | null, win: Win): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>()
  for (const key of siteKeys(siteKey)) {
    const at = new Map<string, number>()
    for (const t of tally('pharmacy', key, win, 'medicine')) at.set(t.key, t.value)
    out.set(key, at)
  }
  return out
}

export interface SiteUnits {
  key: string
  name: string
  code: string
  units: number
}

/** One category's dispensing, site by site. */
export function categoryBySite(siteKey: string | null, win: Win, category: Category): SiteUnits[] {
  const matrix = siteMedicine(siteKey, win)
  return SITES.filter((s) => matrix.has(s.key))
    .map((s) => {
      let units = 0
      for (const [id, n] of matrix.get(s.key)!) if (FOLD[medicineOf(id)!.category] === category) units += n
      return { key: s.key, name: s.name, code: s.code, units }
    })
    .filter((r) => r.units > 0)
    .sort((a, b) => b.units - a.units)
}

/** Requested value per category, from the requests raised in the window. */
export function requestedByCategory(reqs: Req[]): Map<Category, number> {
  const at = new Map<Category, number>(CATEGORIES.map((c) => [c, 0]))
  for (const r of reqs) at.set(r.category, (at.get(r.category) ?? 0) + r.cost)
  return at
}

/* ── requests · the model that had none ──────────────────────────────────── */

export type RequestStatus = 'Fulfilled' | 'Pending' | 'Unavailable'

export interface Req {
  id: string
  siteKey: string
  siteName: string
  medicineId: string
  medicineName: string
  category: Category
  /** Ledger day the site raised it. */
  day: number
  qty: number
  unitCost: number
  cost: number
  /** Working days the central store takes to fill it. `Infinity` where it cannot. */
  lead: number
  /** True where the central store has no stock — this request becomes an availability record. */
  stockOut: boolean
}

/** How many units a request asks for, by category. A saline order is not an anaesthetic order. */
const QTY: Record<Category, [number, number]> = {
  Medication: [4, 40],
  Vaccination: [10, 120],
  Supplements: [8, 60],
  Consumables: [20, 160],
}

/**
 * A site's daily request rate, derived from how much it actually dispenses.
 *
 * Not typed: a site that issues three times as much medicine raises roughly three times as
 * many requisitions, so the rate is the site's own monthly dispensing over a mean lines-per-
 * request. That keeps the request table and the usage chart telling the same story about which
 * site is busy, and it moves automatically if the dispensing metric ever does.
 */
const LINES_PER_REQUEST = 3.8

const MONTH: Win = { key: 'month', label: '', from: TODAY - 30, to: TODAY, days: 31, window: '', noun: '' }

const RATE = new Map<string, number>(
  SITES.map((s) => [s.key, readSite('pharmacy', s.key, MONTH).value / LINES_PER_REQUEST / 31]),
)

/** Cumulative medicine weights, so a request picks the medicines that actually move. */
const CUM = (() => {
  const out: number[] = []
  let run = 0
  for (const m of MEDICINES) {
    run += m.weight
    out.push(run)
  }
  return out
})()

const pickMedicine = (t: number): Medicine => {
  const target = t * (CUM[CUM.length - 1] ?? 1)
  let lo = 0
  let hi = CUM.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (CUM[mid] < target) lo = mid + 1
    else hi = mid
  }
  return MEDICINES[lo]
}

/** How many requests a site raised on one day. Weekends are quiet; a store keeps office hours. */
function requestsOn(siteKey: string, day: number): number {
  const rate = RATE.get(siteKey) ?? 0
  if (rate <= 0) return 0
  /* Day 0 of the ledger is a Friday, so 1 and 2 are the weekend — the same convention
     `core/seed.ts` uses for its own roster rhythm. */
  const dow = day % 7
  const roster = dow === 1 || dow === 2 ? 0.3 : 1.2
  return Math.round(rate * roster * (0.35 + rng(`req:${siteKey}:${day}`)() * 1.35))
}

/**
 * The `i`th request a site raised on a day.
 *
 * Seeded on exactly those three things, so the record is stable from every direction — a row in
 * the site table, a row in an aging bucket, and a row in a medicine's own sheet are the same
 * request with the same id and the same cost.
 */
export function requestAt(siteKey: string, day: number, i: number): Req {
  const r = rng(`req:${siteKey}:${day}:${i}`)
  const med = pickMedicine(r())
  const category = FOLD[med.category]
  const [lo, hi] = QTY[category]
  const qty = lo + Math.floor(r() * (hi - lo + 1))
  const price = unitCost(med.id)
  /* A sixth-power draw so most requests are filled inside a fortnight and the tail is thin —
     without it the aging buckets are flat, which is the one shape they must not be. */
  const lead = 1 + Math.round(Math.pow(r(), 6) * 110)
  const stockOut = r() < 0.04

  return {
    id: `REQ-${String(day).padStart(4, '0')}-${siteOf(siteKey)?.code ?? '??'}${String(i + 1).padStart(2, '0')}`,
    siteKey,
    siteName: siteOf(siteKey)?.name ?? siteKey,
    medicineId: med.id,
    medicineName: med.name,
    category,
    day,
    qty,
    unitCost: price,
    cost: qty * price,
    lead: stockOut ? Infinity : lead,
    stockOut,
  }
}

const siteKeys = (siteKey: string | null): string[] => (siteKey ? [siteKey] : SITES.map((s) => s.key))

/** Every request raised inside a window, newest first. */
export function requestsIn(siteKey: string | null, win: Win): Req[] {
  const out: Req[] = []
  for (const key of siteKeys(siteKey)) {
    for (let day = Math.min(TODAY, win.to); day >= Math.max(0, win.from); day--) {
      const n = requestsOn(key, day)
      for (let i = 0; i < n; i++) out.push(requestAt(key, day, i))
    }
  }
  return out.sort((a, b) => b.day - a.day)
}

/** A request's state on a given day — the only place the three statuses are decided. */
export function statusOf(req: Req, asOf: number): RequestStatus {
  if (req.stockOut) return 'Unavailable'
  return req.day + req.lead > asOf ? 'Pending' : 'Fulfilled'
}

export const pendingDays = (req: Req, asOf: number): number => Math.max(0, asOf - req.day)

/**
 * How far back the open queue is searched.
 *
 * The longest lead time is 110 days, so nothing raised earlier can still be pending — the scan
 * is bounded by the model rather than by a guess, and no open request can be missed.
 */
export const LOOKBACK = 120

/**
 * The open queue as of a date, regardless of when each request was raised.
 *
 * DELIBERATELY NOT CUT TO THE WINDOW. Aging asks "how long has this been waiting", and a
 * request raised in May is exactly the one a July window would hide — which would empty the
 * 60+ bucket precisely when it matters. The window still applies, as a second reading: see
 * `raisedInWindow`.
 */
export function openRequests(siteKey: string | null, asOf: number): Req[] {
  const from = Math.max(0, asOf - LOOKBACK)
  const out: Req[] = []
  for (const key of siteKeys(siteKey)) {
    for (let day = asOf; day >= from; day--) {
      const n = requestsOn(key, day)
      for (let i = 0; i < n; i++) {
        const req = requestAt(key, day, i)
        if (statusOf(req, asOf) === 'Pending') out.push(req)
      }
    }
  }
  return out.sort((a, b) => a.day - b.day)
}

export interface AgingBucket {
  key: string
  label: string
  from: number
  /** Inclusive upper bound in days. `Infinity` on the open-ended bucket. */
  to: number
  count: number
  cost: number
  qty: number
  requests: Req[]
}

/** The four buckets the brief names, always all four — an empty one is a fact worth reading. */
export const AGING: { key: string; label: string; from: number; to: number }[] = [
  { key: '0-15', label: '0–15 days', from: 0, to: 15 },
  { key: '16-30', label: '16–30 days', from: 16, to: 30 },
  { key: '31-60', label: '31–60 days', from: 31, to: 60 },
  { key: '60+', label: '60+ days', from: 61, to: Infinity },
]

export function agingBuckets(open: Req[], asOf: number): AgingBucket[] {
  return AGING.map((b) => {
    const requests = open.filter((r) => {
      const d = pendingDays(r, asOf)
      return d >= b.from && d <= b.to
    })
    return {
      ...b,
      requests,
      count: requests.length,
      cost: requests.reduce((n, r) => n + r.cost, 0),
      qty: requests.reduce((n, r) => n + r.qty, 0),
    }
  })
}

export interface SiteRequests {
  key: string
  name: string
  code: string
  requests: number
  qty: number
  cost: number
  pending: number
  pendingCost: number
}

/** Requests raised inside the window, per site, plus that site's share of the open queue. */
export function requestsBySite(win: Win, asOf: number): SiteRequests[] {
  const raised = requestsIn(null, win)
  const open = openRequests(null, asOf)
  return SITES.map((s) => {
    const mine = raised.filter((r) => r.siteKey === s.key)
    const queue = open.filter((r) => r.siteKey === s.key)
    return {
      key: s.key,
      name: s.name,
      code: s.code,
      requests: mine.length,
      qty: mine.reduce((n, r) => n + r.qty, 0),
      cost: mine.reduce((n, r) => n + r.cost, 0),
      pending: queue.length,
      pendingCost: queue.reduce((n, r) => n + r.cost, 0),
    }
  })
}

export type RequestSort = 'requests' | 'qty' | 'cost' | 'pending'

export const sortRequests = (rows: SiteRequests[], by: RequestSort): SiteRequests[] =>
  [...rows].sort((a, b) => b[by] - a[by])

/* ── expiry ──────────────────────────────────────────────────────────────── */

export interface Lot {
  id: string
  pharmacyId: string
  pharmacyName: string
  /** `null` for the central store, which belongs to no site. */
  siteKey: string | null
  central: boolean
  medicineId: string
  medicineName: string
  category: Category
  qty: number
  unitCost: number
  cost: number
  /** Ledger day the batch expired. */
  day: number
}

/** Central holds the master stock, so it writes off bigger lots than a site dispensary. */
const LOT = { central: { rate: 0.55, qty: [10, 90] }, site: { rate: 0.3, qty: [4, 40] } } as const

/** Batches that expired inside the window, at one pharmacy or all of them. */
export function expiredLots(siteKey: string | null, win: Win, includeCentral = true): Lot[] {
  const stores = PHARMACIES.filter(
    (p) => (p.central ? includeCentral && !siteKey : !siteKey || p.siteKey === siteKey),
  )
  const out: Lot[] = []

  for (const store of stores) {
    const spec = store.central ? LOT.central : LOT.site
    for (let day = Math.max(0, win.from); day <= Math.min(TODAY, win.to); day++) {
      const r = rng(`exp:${store.id}:${day}`)
      if (r() >= spec.rate) continue
      const med = pickMedicine(r())
      const qty = spec.qty[0] + Math.floor(r() * (spec.qty[1] - spec.qty[0] + 1))
      const price = unitCost(med.id)
      out.push({
        id: `LOT-${String(day).padStart(4, '0')}-${store.id.toUpperCase().slice(0, 3)}`,
        pharmacyId: store.id,
        pharmacyName: store.name,
        siteKey: store.siteKey,
        central: store.central,
        medicineId: med.id,
        medicineName: med.name,
        category: FOLD[med.category],
        qty,
        unitCost: price,
        cost: qty * price,
        day,
      })
    }
  }

  return out.sort((a, b) => b.cost - a.cost)
}

export interface ExpirySplit {
  total: number
  central: { cost: number; lots: number }
  local: { cost: number; lots: number }
  bySite: { key: string; name: string; code: string; cost: number; lots: number }[]
}

export function expirySplit(siteKey: string | null, win: Win): ExpirySplit {
  const lots = expiredLots(siteKey, win)
  const central = lots.filter((l) => l.central)
  const local = lots.filter((l) => !l.central)
  return {
    total: lots.reduce((n, l) => n + l.cost, 0),
    central: { cost: central.reduce((n, l) => n + l.cost, 0), lots: central.length },
    local: { cost: local.reduce((n, l) => n + l.cost, 0), lots: local.length },
    bySite: SITES.filter((s) => !siteKey || s.key === siteKey).map((s) => {
      const mine = local.filter((l) => l.siteKey === s.key)
      return {
        key: s.key,
        name: s.name,
        code: s.code,
        cost: mine.reduce((n, l) => n + l.cost, 0),
        lots: mine.length,
      }
    }).sort((a, b) => b.cost - a.cost),
  }
}

/* ── availability ────────────────────────────────────────────────────────── */

export interface Unavailable {
  medicineId: string
  name: string
  category: Category
  kind: Medicine['category']
  /** Sites whose request could not be supplied. */
  sites: { key: string; name: string; code: string; qty: number; requests: Req[] }[]
  qty: number
  requests: number
  cost: number
}

/**
 * Medicines that could not be supplied, and who is waiting on them.
 *
 * Derived from the requests rather than declared beside them: a medicine is unavailable exactly
 * when a site asked for it recently and the central store had none. So "Ivermectin · 3 sites
 * affected" and the three requests behind it are the same records, and the count can never
 * drift from the list it opens.
 *
 * THREE WEEKS, NOT THE FULL PENDING LOOKBACK. Availability is a statement about now. Scanning
 * the whole 120 days the queue needs caught a stock-out for twenty-seven of the twenty-eight
 * medicines in the registry, which is true and useless — "unavailable" has to mean a shortage
 * a director would act on this week, not one the store has had at some point since April.
 */
export const SHORTAGE_WINDOW = 21

export function unavailable(siteKey: string | null, asOf: number): Unavailable[] {
  const from = Math.max(0, asOf - SHORTAGE_WINDOW)
  const byMedicine = new Map<string, Req[]>()

  for (const key of siteKeys(siteKey)) {
    for (let day = asOf; day >= from; day--) {
      const n = requestsOn(key, day)
      for (let i = 0; i < n; i++) {
        const req = requestAt(key, day, i)
        if (!req.stockOut) continue
        const at = byMedicine.get(req.medicineId) ?? []
        at.push(req)
        byMedicine.set(req.medicineId, at)
      }
    }
  }

  return [...byMedicine.entries()]
    .map(([medicineId, reqs]) => {
      const m = medicineOf(medicineId)!
      const sites = SITES.filter((s) => reqs.some((r) => r.siteKey === s.key)).map((s) => {
        const mine = reqs.filter((r) => r.siteKey === s.key)
        return {
          key: s.key,
          name: s.name,
          code: s.code,
          qty: mine.reduce((n, r) => n + r.qty, 0),
          requests: mine,
        }
      })
      return {
        medicineId,
        name: m.name,
        category: FOLD[m.category],
        kind: m.category,
        sites,
        qty: reqs.reduce((n, r) => n + r.qty, 0),
        requests: reqs.length,
        cost: reqs.reduce((n, r) => n + r.cost, 0),
      }
    })
    .sort((a, b) => b.sites.length - a.sites.length || b.qty - a.qty)
}

/* ── one medicine, everywhere ────────────────────────────────────────────── */

export interface MedicineFile {
  medicine: Medicine
  category: Category
  code: string
  unitCost: number
  units: number
  requested: { count: number; qty: number; cost: number }
  pending: number
  unavailableAt: number
  expired: { cost: number; qty: number }
  bySite: { key: string; name: string; code: string; units: number; requests: number; qty: number }[]
  requests: Req[]
}

/** Everything the page knows about one medicine, for its sheet. */
export function medicineFile(medicineId: string, siteKey: string | null, win: Win, asOf: number): MedicineFile | undefined {
  const medicine = medicineOf(medicineId)
  if (!medicine) return undefined

  const matrix = siteMedicine(siteKey, win)
  const raised = requestsIn(siteKey, win).filter((r) => r.medicineId === medicineId)
  const open = openRequests(siteKey, asOf).filter((r) => r.medicineId === medicineId)
  const un = unavailable(siteKey, asOf).find((u) => u.medicineId === medicineId)
  const lots = expiredLots(siteKey, win).filter((l) => l.medicineId === medicineId)

  let units = 0
  for (const at of matrix.values()) units += at.get(medicineId) ?? 0

  return {
    medicine,
    category: FOLD[medicine.category],
    code: medCode(medicineId),
    unitCost: unitCost(medicineId),
    units,
    requested: {
      count: raised.length,
      qty: raised.reduce((n, r) => n + r.qty, 0),
      cost: raised.reduce((n, r) => n + r.cost, 0),
    },
    pending: open.length,
    unavailableAt: un?.sites.length ?? 0,
    expired: { cost: lots.reduce((n, l) => n + l.cost, 0), qty: lots.reduce((n, l) => n + l.qty, 0) },
    bySite: SITES.filter((s) => !siteKey || s.key === siteKey).map((s) => {
      const mine = raised.filter((r) => r.siteKey === s.key)
      return {
        key: s.key,
        name: s.name,
        code: s.code,
        /* THIS medicine at this site, not the site's whole dispensing. */
        units: matrix.get(s.key)?.get(medicineId) ?? 0,
        requests: mine.length,
        qty: mine.reduce((n, r) => n + r.qty, 0),
      }
    }),
    requests: raised,
  }
}

/* ── the site overview ───────────────────────────────────────────────────── */

export interface SiteRow {
  key: string
  name: string
  code: string
  units: number
  requests: number
  cost: number
  pending: number
  expired: number
  unavailable: number
}

/** Every site, with the six pharmacy figures the brief lists and no others. */
export function siteOverview(win: Win, asOf: number): SiteRow[] {
  const dispensed = tally('pharmacy', null, win, 'site')
  const requests = requestsBySite(win, asOf)
  const expiry = expirySplit(null, win)
  const shortages = unavailable(null, asOf)

  return SITES.map((s) => {
    const req = requests.find((r) => r.key === s.key)
    return {
      key: s.key,
      name: s.name,
      code: s.code,
      units: dispensed.find((d) => d.key === s.key)?.value ?? 0,
      requests: req?.requests ?? 0,
      cost: req?.cost ?? 0,
      pending: req?.pending ?? 0,
      expired: expiry.bySite.find((b) => b.key === s.key)?.cost ?? 0,
      unavailable: shortages.filter((u) => u.sites.some((x) => x.key === s.key)).length,
    }
  })
}

export type SiteSort = 'units' | 'requests' | 'cost' | 'pending' | 'expired'

export const sortSites = (rows: SiteRow[], by: SiteSort): SiteRow[] => [...rows].sort((a, b) => b[by] - a[by])

/* ── the date ranges the trend offers ────────────────────────────────────── */

export interface Range {
  key: string
  label: string
  /** Every preset resolves through a window the global filter already defines. */
  window: WindowKey
}

/**
 * The six presets the brief names, every one resolved through the global filter's own windows.
 *
 * SIX MONTHS USED TO BE A TRAILING 182 DAYS because the filter had no preset for it, so the
 * chart's "6 months" and the header's date range meant two different spans. The filter now
 * carries `half`, which lands on the authored six-month column, and the chart reads it — so
 * every chip here is the same span the header would give, and the chart can follow the page's
 * window instead of contradicting it.
 */
export const RANGES: Range[] = [
  { key: 'today', label: 'Today', window: 'today' },
  { key: 'week', label: 'This week', window: 'last7' },
  { key: 'month', label: 'This month', window: 'month' },
  { key: '3m', label: '3 months', window: 'quarter' },
  { key: '6m', label: '6 months', window: 'half' },
]

/** Which preset a global window corresponds to, so the chart opens on the page's own range. */
export const rangeForWindow = (key: WindowKey): string =>
  RANGES.find((r) => r.window === key)?.key ?? 'custom'

export type { Medicine }
