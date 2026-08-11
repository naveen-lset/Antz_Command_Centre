/**
 * THE PHARMACY MODEL — what was actually administered, and to whom.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE USED TO BE, AND WHY ALL OF IT WENT.
 *
 * It modelled the SUPPLY side: a requisition raised per site per day, a unit cost per medicine
 * drawn from a price band, a lead time, an aging bucket, an expiry write-off per pharmacy per
 * day, and a stock-out flag that made a medicine "unavailable". Eight hundred lines, all of it
 * a pure function of a seed, in the same idiom `core/animals.ts` used to build 215,432 animals
 * from their ids. It existed because the page it served asked for cost, a request queue and a
 * shelf, and the product had no model for any of the three.
 *
 * `species_mgmt_anon` still has no model for any of the three, and this is the one place in the
 * product where that gap is total:
 *
 *   · NO COST.       `helpdesk_requests.initial_cost`, `.final_cost` and
 *                    `helpdesk_request_items.unit_cost` sum to ZERO across all 644 rows.
 *   · NO QUEUE.      `helpdesk_requests` looks like procurement and is not — 640 of its 644
 *                    rows belong to department "VNC - Kitchen" and the item text is food
 *                    ("Boiled eggs in shield 20 nos", "Chicken neck keema 3kgs").
 *   · NO SHELF.      There is no stock, inventory, batch or expiry table of any kind.
 *
 * So the supply model is gone rather than kept alongside real figures. A page that mixes a real
 * dispensing count with an invented rupee total is worse than one that shows the dispensing
 * count alone, because a reader cannot tell which half to trust.
 *
 * WHAT IS REAL, AND IS NOW THE WHOLE MODULE: three streams of administration, each carrying a
 * named product, a date, a site, a species and an animal.
 *
 *   prescriptions  1,636 · 102 generics — the clinical stream
 *   vaccinations  36,064 ·  42 vaccines — the preventive stream
 *   deworming     15,348 ·  60 anthelmintics
 *
 * They are three separate metrics in `core/`, and this file's job is to read them as one
 * pharmacy: a medicine is a medicine whichever programme issued it.
 */

import type { Win } from '../../core/calendar'
import { tally } from '../../core/events'
import { count } from '../../core/events'
import { SITES, siteOf } from '../../core/world'

/* ── the three streams ───────────────────────────────────────────────────── */

/**
 * A medicine's provenance, which is the only categorisation the source supports.
 *
 * NOT A PHARMACOLOGICAL CLASS. The old model sorted twenty-eight medicines into Antibiotic,
 * Anthelmintic, Analgesic, Anaesthetic, Vaccine, Supplement, Antifungal and Fluid, and folded
 * those into four an executive reads in. Nothing in the database says what class a product
 * belongs to — `prescriptions.generic_name` is a free-text product name and there is no drug
 * table. What the data DOES say is which programme issued it, and that is a real distinction a
 * director acts on: a vaccine round and a course of treatment are different work.
 */
export type Stream = 'Prescription' | 'Vaccine' | 'Anthelmintic'

export const STREAMS: { key: Stream; slug: string; label: string; accent: string }[] = [
  { key: 'Prescription', slug: 'pharmacy', label: 'Prescriptions', accent: '#1f515b' },
  { key: 'Vaccine', slug: 'vaccinations', label: 'Vaccines', accent: '#00afd6' },
  { key: 'Anthelmintic', slug: 'deworming', label: 'Anthelmintics', accent: '#006d35' },
]

export interface StreamUse {
  stream: Stream
  slug: string
  label: string
  accent: string
  /** Administrations recorded in the window. */
  units: number
  percent: number
  /** Distinct products issued. */
  medicines: number
}

export interface MedicineUse {
  id: string
  name: string
  stream: Stream
  units: number
  percent: number
}

export interface Usage {
  total: number
  streams: StreamUse[]
  byMedicine: MedicineUse[]
}

/**
 * Everything administered in the window, by stream and by product.
 *
 * One `tally` per stream over its own events, so the medicine rows sum to the stream total and
 * the stream totals sum to the headline — the same by-construction guarantee every other
 * grouping in the product has.
 */
export function usage(siteKey: string | null, win: Win): Usage {
  const rows: MedicineUse[] = []
  const streams: StreamUse[] = []

  for (const s of STREAMS) {
    const mine = tally(s.slug, siteKey, win, 'detail')
    const units = mine.reduce((n, t) => n + t.value, 0)
    streams.push({ ...s, stream: s.key, units, percent: 0, medicines: mine.length })
    for (const t of mine) {
      rows.push({ id: `${s.key}:${t.key}`, name: t.label, stream: s.key, units: t.value, percent: 0 })
    }
  }

  const total = streams.reduce((n, s) => n + s.units, 0)
  for (const s of streams) s.percent = total ? (s.units / total) * 100 : 0
  for (const r of rows) r.percent = total ? (r.units / total) * 100 : 0

  return { total, streams, byMedicine: rows.sort((a, b) => b.units - a.units) }
}

/** One stream's administrations, site by site. */
export interface SiteUnits {
  key: string
  name: string
  code: string
  units: number
  percent: number
}

export function bySite(siteKey: string | null, win: Win): SiteUnits[] {
  const totals = new Map<string, number>()
  for (const s of STREAMS) {
    for (const t of tally(s.slug, siteKey, win, 'site')) {
      totals.set(t.key, (totals.get(t.key) ?? 0) + t.value)
    }
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0)
  return SITES.filter((s) => (totals.get(s.key) ?? 0) > 0)
    .map((s) => ({
      key: s.key,
      name: s.name,
      code: s.code,
      units: totals.get(s.key) ?? 0,
      percent: total ? ((totals.get(s.key) ?? 0) / total) * 100 : 0,
    }))
    .sort((a, b) => b.units - a.units)
}

/** One stream's administrations, species by species. */
export function bySpecies(siteKey: string | null, win: Win, limit = 40): SiteUnits[] {
  const totals = new Map<string, number>()
  for (const s of STREAMS) {
    for (const t of tally(s.slug, siteKey, win, 'species')) {
      totals.set(t.label, (totals.get(t.label) ?? 0) + t.value)
    }
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0)
  return [...totals.entries()]
    .map(([name, units]) => ({
      key: name,
      name,
      code: '',
      units,
      percent: total ? (units / total) * 100 : 0,
    }))
    .sort((a, b) => b.units - a.units)
    .slice(0, limit)
}

/** The headline, straight from the series. */
export const totalUnits = (siteKey: string | null, win: Win): number =>
  STREAMS.reduce((n, s) => n + count(s.slug, siteKey, win), 0)

/* ── search ──────────────────────────────────────────────────────────────── */

/**
 * Fold a string for matching.
 *
 * The product names carry en dashes, apostrophes, strengths and forms, so "raksha blu" must
 * find "RAKSHA-BLU (50 Doses)" and "panacur 1ltr" must find "Panacur VET 1LTR". Punctuation
 * folds to a space, apostrophes vanish rather than splitting a word, diacritics are stripped,
 * and digits, points and per-cent signs survive so "0.9%" and "10%" stay findable.
 */
export const fold = (s: string): string =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.%]+/g, ' ')
    .trim()

/** Every query token must appear somewhere in the row's fields, in any order. */
export function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = fold(query)
  if (!q) return true
  const hay = fold(fields.filter(Boolean).join(' '))
  return q.split(' ').every((t) => hay.includes(t))
}

export const siteName = (key: string): string => siteOf(key)?.name ?? key
