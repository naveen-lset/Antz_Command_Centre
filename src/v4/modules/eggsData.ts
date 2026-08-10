/**
 * THE EGG LIFECYCLE LAYER — what the incubation programme knows that the metrics do not.
 *
 * Eggs is the one module where `core` already carries most of the model. There are three real
 * flow metrics — `eggs` (set down), `hatched`, `discarded` — each with its own authored
 * per-site series, each asserted in `core/checks.ts` at 142 / 96 / 13 for the month. There are
 * three real nurseries, thirteen real incubators, and every egg event already carries the
 * nursery and incubator it sits in. Core even authors the vocabularies: how a clutch arrived,
 * how it hatched, and why it was thrown away.
 *
 * So this file does NOT re-derive any of that. It adds the two things nothing in core models:
 *
 *   · SURVIVAL. A hatchling either lived or it did not, and no metric says which. Derived per
 *     hatch from `rng(ev.id)`, so a nursery's survival figure and the records behind it are
 *     the same draw made twice.
 *   · FIRST HATCH ON RECORD. Which species hatched here for the first time. A scan of the
 *     whole `hatched` history, done once, never over a window — see `FIRST_HATCHES`.
 *
 * WHY LAID AND HATCHED ARE NOT ONE COHORT HERE, and this is the load-bearing decision.
 *
 * The obvious model is "the eggs laid in this window, followed to outcome". A sibling build of
 * this page on another branch did exactly that, and it is the right model when you own the
 * corpus. Here core owns it, and core states its position in a comment on the metric itself:
 * `hatched` is "its own metric rather than a fraction of `eggs`, because a clutch laid in July
 * may hatch in August". Overriding that would put a second, disagreeing hatch count next to
 * the one `checks.ts` asserts.
 *
 * The reason that is SAFE here — and it was not safe on the other branch — is that the
 * authored series keep hatched + discarded ≤ laid at every window and every site. Verified
 * across all ten windows: hatch rate runs 60–80% and never approaches 100. What does invert
 * is a single day, in 914 site-days out of 13,152, because that clutch really did hatch weeks
 * after it was set. So HATCH PERCENTAGE IS ONLY EVER COMPUTED AT WINDOW GRAIN, never per day,
 * and the trend draws laid and hatched as two series side by side rather than one inside the
 * other. A stacked day column would overflow its own total and a per-day rate would print
 * above 100%.
 */

import { TODAY, type Win } from '../../core/calendar'
import { count, eventAt, type Ev } from '../../core/events'
import { daily } from '../../core/series'
import { rng } from '../../core/seed'
import {
  INCUBATORS,
  NURSERIES,
  SITES,
  incubatorOf,
  nurseryOf,
  siteOf,
  type Incubator,
  type Nursery,
} from '../../core/world'

/** The three metrics that make up the programme. Order matters — it is the lifecycle. */
export const EGG_SLUGS = ['eggs', 'hatched', 'discarded'] as const
export type EggSlug = (typeof EGG_SLUGS)[number]

/* ── the record ──────────────────────────────────────────────────────────── */

export interface EggRecord {
  ev: Ev
  id: string
  slug: EggSlug
  day: number
  siteKey: string
  siteName: string
  nursery: Nursery
  incubator?: Incubator
  speciesName: string
  animalId: string
  /** Core's own vocabulary — "Clutch set", "Hatched · assisted", "Dead in shell". */
  detail: string
  tone: Ev['tone']
  /** Hatchings only: alive as of today. */
  survived?: boolean
  /** Hatchings only, and only where it died. */
  died?: number
}

/**
 * Neonatal survival, per hatchling.
 *
 * Loss is early — nearly all of it inside the first three weeks — so a hatch from yesterday
 * that is going to die mostly has not died yet. Assisted and early hatches carry the worse
 * odds, which is the whole reason core distinguishes them.
 */
const SURVIVAL: Record<string, number> = {
  'Hatched · unassisted': 0.94,
  'Hatched · assisted': 0.82,
  'Hatched · early': 0.71,
}

export function eggRecord(ev: Ev, slug: EggSlug): EggRecord {
  const nursery = nurseryOf(ev.nurseryId ?? '') ?? NURSERIES[0]
  const base: EggRecord = {
    ev,
    /* The stage prefix is KEPT. Core ids are `EGG-2185-AV-1` / `HAT-2185-AV-1` /
       `DIS-2185-AV-1`, and stripping it collapsed an egg and its own hatching onto one id —
       React flagged the duplicate keys, and a reader could not have cited either record. */
    id: ((): string => {
      const [prefix, ...rest] = ev.id.split('-')
      return `${prefix}-${rest.join('')}`
    })(),
    slug,
    day: ev.day,
    siteKey: ev.siteKey,
    siteName: siteOf(ev.siteKey)?.name ?? ev.siteKey,
    nursery,
    incubator: incubatorOf(ev.incubatorId ?? ''),
    speciesName: ev.speciesName,
    animalId: ev.animalId,
    detail: ev.detail,
    tone: ev.tone,
  }
  if (slug !== 'hatched') return base

  const r = rng(`${ev.id}:life`)
  const lives = r() < (SURVIVAL[ev.detail] ?? 0.9)
  /* A death dated past today has not happened, so the hatchling is alive. */
  const when = ev.day + 1 + Math.floor(r() * 21)
  const died = lives || when > TODAY ? undefined : when
  return { ...base, survived: !died, died }
}

/* ── walking a window ────────────────────────────────────────────────────── */

const siteKeys = (siteKey: string | null): string[] =>
  siteKey ? [siteKey] : SITES.map((s) => s.key)

function walk(slug: EggSlug, siteKey: string | null, win: Win): EggRecord[] {
  const out: EggRecord[] = []
  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)
  for (const key of siteKeys(siteKey)) {
    const s = daily(slug, key)
    for (let day = to; day >= from; day--) {
      for (let i = 0; i < s[day]; i++) out.push(eggRecord(eventAt(slug, key, day, i), slug))
    }
  }
  return out
}

/* ── totals ──────────────────────────────────────────────────────────────── */

export interface Totals {
  /** Eggs set down in the window. */
  laid: number
  /** Hatchings recorded in the window — a different clock, see the header. */
  hatched: number
  /** Eggs discarded in the window. */
  discarded: number
  /** Of those hatchings, alive as of today. */
  survived: number
  /** Of those hatchings, died. */
  mortality: number
}

export const empty = (): Totals => ({ laid: 0, hatched: 0, discarded: 0, survived: 0, mortality: 0 })

export function totalsOf(rows: EggRecord[]): Totals {
  const t = empty()
  for (const r of rows) {
    if (r.slug === 'eggs') t.laid++
    else if (r.slug === 'discarded') t.discarded++
    else {
      t.hatched++
      if (r.survived) t.survived++
      else t.mortality++
    }
  }
  return t
}

export const pct = (part: number, whole: number): number => (whole === 0 ? 0 : (part / whole) * 100)

/**
 * Hatch percentage — hatchings ÷ eggs set, both counted over the same window.
 *
 * Null below a floor, because a rate off three eggs is a sample and not a rate, and null at
 * day grain by construction: nothing calls this with a single day. See the header note.
 */
export const HATCH_FLOOR = 8
export const hatchRate = (t: Totals): number | null =>
  t.laid < HATCH_FLOOR ? null : pct(t.hatched, t.laid)
export const survivalRate = (t: Totals): number | null =>
  t.hatched === 0 ? null : pct(t.survived, t.hatched)

/* ── grouping ────────────────────────────────────────────────────────────── */

export interface Group extends Totals {
  key: string
  label: string
  sub: string
  rows: EggRecord[]
  hatchPct: number | null
}

function group(
  rows: EggRecord[],
  keyOf: (r: EggRecord) => string | undefined,
  label: (key: string, rows: EggRecord[]) => { label: string; sub: string },
): Group[] {
  const by = new Map<string, EggRecord[]>()
  for (const r of rows) {
    const k = keyOf(r)
    if (!k) continue
    const at = by.get(k)
    if (at) at.push(r)
    else by.set(k, [r])
  }
  return [...by.entries()]
    .map(([key, list]) => {
      const t = totalsOf(list)
      return { key, ...label(key, list), ...t, hatchPct: hatchRate(t), rows: list }
    })
    .sort((a, b) => b.laid - a.laid || b.hatched - a.hatched || a.label.localeCompare(b.label))
}

export const byNursery = (rows: EggRecord[]) =>
  group(rows, (r) => r.nursery.id, (_k, l) => ({ label: l[0].nursery.name, sub: l[0].siteName }))

export const byIncubator = (rows: EggRecord[]) =>
  group(
    rows.filter((r) => r.incubator),
    (r) => r.incubator?.id,
    (_k, l) => ({
      label: l[0].incubator!.name,
      sub: `${l[0].nursery.name} · ${l[0].incubator!.trays} trays · ${l[0].incubator!.tempC} °C`,
    }),
  )

export const bySpecies = (rows: EggRecord[]) =>
  group(rows, (r) => r.speciesName, (k, l) => ({ label: k, sub: l[0].nursery.name }))

export const byDetail = (rows: EggRecord[]) =>
  group(rows, (r) => r.detail, (k) => ({ label: k, sub: '' }))

/* ── the one cut every section reads ─────────────────────────────────────── */

export interface EggCut {
  totals: Totals
  laid: EggRecord[]
  hatched: EggRecord[]
  discarded: EggRecord[]
  /** Every record, newest first — the record layer. */
  rows: EggRecord[]
  nurseries: Group[]
  incubators: Group[]
  species: Group[]
  /** Why eggs were thrown away — core's own four reasons. */
  reasons: Group[]
  /** How clutches arrived, and how they hatched. */
  intake: Group[]
  outcome: Group[]
}

export function eggCut(siteKey: string | null, win: Win): EggCut {
  const laid = walk('eggs', siteKey, win)
  const hatched = walk('hatched', siteKey, win)
  const discarded = walk('discarded', siteKey, win)
  const rows = [...laid, ...hatched, ...discarded].sort((a, b) => b.day - a.day || a.id.localeCompare(b.id))

  return {
    totals: totalsOf(rows),
    laid,
    hatched,
    discarded,
    rows,
    nurseries: byNursery(rows),
    incubators: byIncubator(rows),
    species: bySpecies(rows),
    reasons: byDetail(discarded),
    intake: byDetail(laid),
    outcome: byDetail(hatched),
  }
}

/** Straight from the series, for anything that only needs a number. */
export const eggCount = (slug: EggSlug, siteKey: string | null, win: Win): number =>
  count(slug, siteKey, win)

/* ── first hatch on record ───────────────────────────────────────────────── */

/**
 * The first time each species hatched here.
 *
 * COMPUTED ONCE OVER THE WHOLE LEDGER, never over a window — that is the entire point. Take
 * the minimum inside a window and every species becomes a first-timer as soon as the window
 * is narrow enough. The window decides which of these are DISPLAYED; it never decides what
 * "first" means.
 *
 * WHAT IT DOES NOT CLAIM. The ledger opens six years ago, so a species whose earliest hatch is
 * in the first weeks of it was almost certainly hatching here before the record began, and
 * calling that a zoo first would be a fabrication. Only species whose first hatch falls at
 * least a year into the record are treated as debuts, and the section says "first hatch on
 * record" with the record's own start date beside it rather than "first ever".
 */
export interface FirstHatch {
  speciesName: string
  day: number
  siteKey: string
  siteName: string
  nursery: Nursery
  incubator?: Incubator
  /** Hatchlings of that species on that day. */
  clutch: number
  survived: number
}

/** A first hatch inside the first year of the ledger is a corpus edge, not a debut. */
const DEBUT_AFTER = 365

export const FIRST_HATCHES: FirstHatch[] = (() => {
  const first = new Map<string, EggRecord>()
  const sameDay = new Map<string, EggRecord[]>()

  for (const key of SITES.map((s) => s.key)) {
    const s = daily('hatched', key)
    for (let day = 0; day <= TODAY; day++) {
      for (let i = 0; i < s[day]; i++) {
        const r = eggRecord(eventAt('hatched', key, day, i), 'hatched')
        const held = first.get(r.speciesName)
        if (!held || r.day < held.day) first.set(r.speciesName, r)
        const k = `${r.speciesName}:${r.day}`
        const list = sameDay.get(k)
        if (list) list.push(r)
        else sameDay.set(k, [r])
      }
    }
  }

  const out: FirstHatch[] = []
  for (const [speciesName, r] of first) {
    if (r.day < DEBUT_AFTER) continue
    const clutch = sameDay.get(`${speciesName}:${r.day}`) ?? [r]
    out.push({
      speciesName,
      day: r.day,
      siteKey: r.siteKey,
      siteName: r.siteName,
      nursery: r.nursery,
      incubator: r.incubator,
      clutch: clutch.length,
      survived: clutch.filter((x) => x.survived).length,
    })
  }
  return out.sort((a, b) => b.day - a.day)
})()

export const firstHatchesIn = (win: Win, siteKey: string | null): FirstHatch[] =>
  FIRST_HATCHES.filter(
    (f) => f.day >= win.from && f.day <= Math.min(TODAY, win.to) && (!siteKey || f.siteKey === siteKey),
  )

/* ── labels ──────────────────────────────────────────────────────────────── */

export const slugLabel: Record<EggSlug, string> = {
  eggs: 'Set',
  hatched: 'Hatched',
  discarded: 'Discarded',
}

export const recordTone = (r: EggRecord): 'good' | 'warn' | 'bad' | 'neutral' =>
  r.slug === 'discarded'
    ? 'bad'
    : r.slug === 'hatched'
      ? r.survived
        ? 'good'
        : 'bad'
      : 'neutral'

export const recordStatus = (r: EggRecord): string =>
  r.slug === 'eggs' ? 'Set' : r.slug === 'discarded' ? 'Discarded' : r.survived ? 'Survived' : 'Mortality'

export { NURSERIES, INCUBATORS }
