/**
 * EVENTS — the individual records behind every flow figure.
 *
 * THE RECORD LIST AND THE KPI ARE THE SAME DATA. A day's count comes from `series.ts`; an
 * event is one unit of that count given an identity. So "23 deaths this month" and the
 * list of deaths this month are not two sources that have to be kept in step — the list is
 * the number, enumerated. Filter the window and both move together; scope to a site and
 * both narrow; group by cause and the groups sum to 23 because every death is in exactly
 * one of them.
 *
 * This is what the requirement's "Recent Records = Jamnagar" asks for, and it is worth
 * noting how the product used to do it: each module page carried a hand-written array of
 * five or six plausible rows, unrelated to its own headline figure and unaffected by either
 * filter. Scoping to Carnivore Ridge left a list of aquatic samples on screen.
 *
 * NOTHING IS MATERIALISED UNTIL ASKED FOR. `count` reads the series. `tally` walks days and
 * increments integers. Only `page` allocates objects, and only for the rows on screen — so
 * an all-time pharmacy window is 89,000 records to group and twenty to build.
 *
 * ATTRIBUTION IS A WEIGHTED DRAW, SEEDED ON (metric, site, day, index). That makes it
 * stable — the same event has the same species and the same cause on every read — and it
 * makes every grouping exact by construction, because each event lands in exactly one
 * bucket of every dimension.
 */

import { TODAY, shortDate, type Win } from './calendar'
import { METRICS } from './metrics'
import { daily, sumIn } from './series'
import { draw, rng } from './seed'
import {
  HOSPITALS,
  INCUBATORS,
  LAB_DEPARTMENTS,
  MEDICINES,
  NURSERIES,
  SITES,
  WARDS,
  siteOf,
  speciesIn,
  type Species,
} from './world'
import { animalAt, animalId, animalLabel, stockOfSpecies, type Animal } from './animals'

export type Tone = 'good' | 'warn' | 'bad' | 'neutral'

export interface Ev {
  id: string
  /** The metric slug this event is one unit of. */
  kind: string
  day: number
  siteKey: string
  speciesId: string
  speciesName: string
  animalId: string
  /** The metric's own classifying dimension — cause of death, sample type, direction. */
  detail: string
  tone: Tone
  /* Refs to whichever other hierarchy the metric hangs off. */
  hospitalId?: string
  wardId?: string
  labDeptId?: string
  pharmacyId?: string
  medicineId?: string
  nurseryId?: string
  incubatorId?: string
}

/* ── the classifying dimension, per metric ───────────────────────────────── */

/** [label, relative weight, tone]. Weights make a cause distribution rather than a menu. */
type Detail = [string, number, Tone]

const DETAILS: Record<string, Detail[]> = {
  mortality: [
    ['Disease', 30, 'bad'],
    ['Old age', 22, 'neutral'],
    ['Trauma / injury', 14, 'bad'],
    ['Parasitic load', 10, 'warn'],
    ['Nutritional', 7, 'warn'],
    ['Neonatal loss', 8, 'bad'],
    ['Predation', 4, 'bad'],
    ['Undetermined', 5, 'neutral'],
  ],
  births: [
    ['Live birth', 74, 'good'],
    ['Hand-reared', 14, 'warn'],
    ['Assisted delivery', 9, 'warn'],
    ['Multiple birth', 3, 'good'],
  ],
  accession: [
    ['Rescue · Forest Dept', 34, 'good'],
    ['Transfer in · zoo', 26, 'neutral'],
    ['Confiscation · Customs', 16, 'warn'],
    ['Rehabilitation intake', 14, 'good'],
    ['Breeding loan', 10, 'neutral'],
  ],
  transfers: [
    ['Internal move', 44, 'neutral'],
    ['Outward · other zoo', 26, 'neutral'],
    ['Inward · other zoo', 18, 'good'],
    ['Release to wild', 8, 'good'],
    ['Breeding loan', 4, 'neutral'],
  ],
  admissions: [
    ['Reduced appetite', 20, 'warn'],
    ['Lameness', 16, 'warn'],
    ['Wound / abscess', 15, 'warn'],
    ['Respiratory signs', 13, 'warn'],
    ['Gastrointestinal', 12, 'warn'],
    ['Ocular', 8, 'neutral'],
    ['Dermatological', 8, 'neutral'],
    ['Critical presentation', 8, 'bad'],
  ],
  disease: [
    ['Aeromonas septicaemia', 18, 'bad'],
    ['Avian pox', 14, 'bad'],
    ['Coccidiosis', 14, 'warn'],
    ['Aspergillosis', 12, 'warn'],
    ['Foot-and-mouth watch', 10, 'bad'],
    ['Mange', 10, 'warn'],
    ['Columnaris', 12, 'warn'],
    ['Tuberculosis screen', 10, 'bad'],
  ],
  fetal: [
    ['Late-term loss', 38, 'bad'],
    ['Mid-term loss', 30, 'bad'],
    ['Early resorption', 20, 'warn'],
    ['Dystocia', 12, 'bad'],
  ],
  /* An escape's classifying dimension is its OUTCOME, because that is the only thing anyone
     asks about one. Most are back the same day; the tail is what the escape card counts. */
  escaped: [
    ['Recovered · same day', 54, 'warn'],
    ['Recovered · within 7 days', 26, 'warn'],
    ['Recovered · off site', 9, 'warn'],
    ['Not recovered', 11, 'bad'],
  ],
  lab: [
    ['Blood panel', 22, 'neutral'],
    ['Faecal float', 20, 'neutral'],
    ['Swab · culture', 16, 'neutral'],
    ['Water quality', 12, 'neutral'],
    ['Histopathology', 10, 'neutral'],
    ['Serology', 10, 'neutral'],
    ['PCR panel', 6, 'neutral'],
    ['Toxicology', 4, 'warn'],
  ],
  deworming: [
    ['Ivermectin', 34, 'good'],
    ['Fenbendazole', 28, 'good'],
    ['Praziquantel', 22, 'good'],
    ['Albendazole', 16, 'good'],
  ],
  /* A dose's classifying dimension is the VACCINE, which is what makes
     Vaccination → Vaccine → Site → Species → Animal a real drill rather than a label.

     The list spans the classes the collection actually vaccinates, because a zoo whose
     headcount is four fifths fish runs an immersion programme as well as a needle one.
     Which vaccine can reach which class is declared in `AGENT_CLASSES` below — without it
     the weighted draw hands a shrimp a canine distemper booster, and one line like that on
     an executive page costs the reader's trust in every other line. */
  vaccinations: [
    ['Rabies', 16, 'good'],
    ['Foot-and-mouth', 13, 'good'],
    ['Newcastle disease', 12, 'good'],
    ['Aeromonas · immersion', 14, 'good'],
    ['Columnaris · immersion', 10, 'good'],
    ['Clostridial 7-in-1', 9, 'good'],
    ['Avian pox', 8, 'good'],
    ['Canine distemper', 7, 'good'],
    ['Reptile core panel', 6, 'good'],
    ['Brucellosis', 5, 'good'],
    ['Tetanus toxoid', 4, 'good'],
  ],
  supplement: [
    ['Calcium + D3', 26, 'neutral'],
    ['Multivitamin', 22, 'neutral'],
    ['Vitamin A', 16, 'neutral'],
    ['Mineral mix', 14, 'neutral'],
    ['Omega-3', 10, 'neutral'],
    ['Vitamin E + selenium', 7, 'neutral'],
    ['Probiotic', 5, 'neutral'],
  ],
  eggs: [
    ['Clutch set', 62, 'neutral'],
    ['Single egg set', 24, 'neutral'],
    ['Recovered from nest', 14, 'neutral'],
  ],
  hatched: [
    ['Hatched · unassisted', 78, 'good'],
    ['Hatched · assisted', 16, 'warn'],
    ['Hatched · early', 6, 'warn'],
  ],
  discarded: [
    ['Infertile', 46, 'neutral'],
    ['Dead in shell', 28, 'bad'],
    ['Cracked / damaged', 16, 'warn'],
    ['Contaminated', 10, 'bad'],
  ],
  pharmacy: [
    ['Treatment course', 52, 'neutral'],
    ['Single dose', 28, 'neutral'],
    ['Prophylactic', 14, 'good'],
    ['Emergency issue', 6, 'warn'],
  ],
}

const FALLBACK: Detail[] = [['Recorded', 1, 'neutral']]

/**
 * WHICH CLASSES AN AGENT CAN REACH.
 *
 * Only the preventive vocabularies need this, and they need it badly: every other metric's
 * dimension is a fact about the event (a cause of death, a sample type) and applies to any
 * animal, while a vaccine, an anthelmintic and a supplement each apply to some animals and
 * not others. A name absent from this map reaches everything.
 *
 * Declared beside the vocabulary it constrains, and read by both the record stream and the
 * overdue roster — so the vaccine an animal is overdue for is drawn from the same rule as
 * the vaccine it would have been given.
 */
const AGENT_CLASSES: Record<string, string[]> = {
  /* vaccines */
  Rabies: ['Mammalia'],
  'Foot-and-mouth': ['Mammalia'],
  'Clostridial 7-in-1': ['Mammalia'],
  'Canine distemper': ['Mammalia'],
  Brucellosis: ['Mammalia'],
  'Tetanus toxoid': ['Mammalia'],
  'Newcastle disease': ['Aves'],
  'Avian pox': ['Aves'],
  'Aeromonas · immersion': ['Actinopterygii', 'Chondrichthyes'],
  'Columnaris · immersion': ['Actinopterygii'],
  'Reptile core panel': ['Reptilia', 'Amphibia'],
  /* anthelmintics — praziquantel is the fluke drug and reaches the water classes too */
  Ivermectin: ['Mammalia', 'Aves', 'Reptilia'],
  Fenbendazole: ['Mammalia', 'Aves', 'Reptilia'],
  Albendazole: ['Mammalia', 'Aves'],
  /* supplements */
  'Vitamin E + selenium': ['Mammalia', 'Aves'],
  'Omega-3': ['Actinopterygii', 'Chondrichthyes', 'Mammalia'],
}

const reaches = (label: string, cls?: string): boolean => {
  const only = AGENT_CLASSES[label]
  return !only || !cls || only.includes(cls)
}

/**
 * The classifying values a metric draws from, in weight order, narrowed to a class.
 *
 * Exported so a caller that needs the vocabulary without walking the events — the overdue
 * roster needs a vaccine name per animal, and no event exists for a dose that was never
 * given — draws from the same table under the same rule the records do.
 */
/**
 * The agents that reach a class — EMPTY where none do, unlike `tableFor` below.
 *
 * The difference is the point. An event must land in some bucket, so the event stream falls
 * back to the whole vocabulary; a protocol roster must not, because "this shrimp is overdue
 * for its avian pox vaccine" is worse than saying nothing. A caller building a roster reads
 * the empty list as "this class is not on the protocol" and leaves the species out.
 */
export const detailsFor = (kind: string, cls?: string): { label: string; weight: number }[] =>
  (DETAILS[kind] ?? FALLBACK).filter(([label]) => reaches(label, cls)).map(([label, weight]) => ({ label, weight }))

/** Whether a class is on a metric's protocol at all. */
export const onProtocol = (kind: string, cls: string): boolean => detailsFor(kind, cls).length > 0

/**
 * The vocabulary for one (metric, class), cached.
 *
 * Cached rather than filtered per call because `tally` asks for it once per event, and a
 * six-year pharmacy window is 89,000 events — an array allocation each would turn a
 * grouping pass into garbage collection.
 */
const tableCache = new Map<string, Detail[]>()

function tableFor(kind: string, cls?: string): Detail[] {
  const key = `${kind}:${cls ?? ''}`
  const hit = tableCache.get(key)
  if (hit) return hit
  const all = DETAILS[kind] ?? FALLBACK
  const narrowed = all.filter(([label]) => reaches(label, cls))
  /* A class no agent reaches falls back to the full table rather than to nothing — an event
     with no detail would break the invariant that every event lands in exactly one bucket. */
  const out = narrowed.length ? narrowed : all
  tableCache.set(key, out)
  return out
}

/* ── weighted draw ───────────────────────────────────────────────────────── */

/** Cumulative weights, cached per key — built once, then binary-searched. */
const cumCache = new Map<string, number[]>()

function cumulative(key: string, weights: number[]): number[] {
  const hit = cumCache.get(key)
  if (hit) return hit
  const out: number[] = []
  let run = 0
  for (const w of weights) {
    run += Math.max(0, w)
    out.push(run)
  }
  cumCache.set(key, out)
  return out
}

function indexFrom(cum: number[], t: number): number {
  const target = t * (cum[cum.length - 1] ?? 1)
  let lo = 0
  let hi = cum.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cum[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Which species an event in this site belongs to. Weighted by the site's own composition.
 *
 * NARROWED WHERE THE METRIC HAS A PROTOCOL. A death, a transfer and a lab sample can happen
 * to anything the site holds. A vaccination cannot: the preventive vocabularies declare
 * which classes each agent reaches, so for those metrics the draw is over the species on the
 * protocol rather than over the whole site. Without it a tenth of Aquatic Halls' doses land
 * on prawns and snails.
 *
 * The narrowed list is cached per (site, metric), and the cumulative weights are keyed the
 * same way — `tally` and `eventAt` must make the identical draw or a grouping and its
 * records would name different species for the same event.
 */
const speciesCache = new Map<string, Species[]>()

function speciesPool(siteKey: string, kind?: string): Species[] {
  const key = `${siteKey}:${kind ?? ''}`
  const hit = speciesCache.get(key)
  if (hit) return hit
  const all = speciesIn(siteKey)
  const pool = kind && HAS_PROTOCOL.has(kind) ? all.filter((s) => onProtocol(kind, s.cls)) : all
  const out = pool.length ? pool : all
  speciesCache.set(key, out)
  return out
}

/** The metrics whose vocabulary is class-restricted, and therefore whose species pool is too. */
const HAS_PROTOCOL = new Set(['vaccinations', 'deworming', 'supplement'])

function speciesFor(siteKey: string, seed: string, kind?: string): Species {
  const list = speciesPool(siteKey, kind)
  const cum = cumulative(`sp:${siteKey}:${kind ?? ''}`, list.map((s) => s.weight))
  return list[indexFrom(cum, draw(seed))] ?? list[0]
}

/** The species a metric's protocol covers at a site — what a roster is apportioned across. */
export const protocolSpecies = (siteKey: string, kind: string): Species[] => speciesPool(siteKey, kind)

/** The classifying value for one event. `cls` narrows the vocabulary where an agent needs it. */
function detailFor(kind: string, seed: string, cls?: string): Detail {
  const table = tableFor(kind, cls)
  const cum = cumulative(`dt:${kind}:${cls ?? ''}`, table.map((d) => d[1]))
  return table[indexFrom(cum, draw(seed))] ?? table[0]
}

/* ── one event ───────────────────────────────────────────────────────────── */

/**
 * Build the `i`th event of `kind` on `day` in `siteKey`.
 *
 * The seed is exactly those four things, so the same event is the same record on every
 * read, in any order, from any page — which is what lets a record list be paged backwards
 * without the rows changing under the reader.
 */
export function eventAt(kind: string, siteKey: string, day: number, i: number): Ev {
  const seed = `${kind}:${siteKey}:${day}:${i}`
  const species = speciesFor(siteKey, `${seed}:sp`, kind)
  /* The species is drawn first so the detail can be narrowed to what reaches its class. */
  const [detail, , tone] = detailFor(kind, `${seed}:dt`, species.cls)
  const r = rng(seed)

  /* The subject animal. Drawn from the species' real population so the id decodes to a
     real record — an event never points at an animal that cannot be opened. */
  const stock = Math.max(1, stockOfSpecies(species.id, { from: 0, to: day, days: day + 1 } as Win))
  const animal = animalId(species.id, 1 + Math.floor(r() * stock))

  const ev: Ev = {
    id: `${kind.toUpperCase().slice(0, 3)}-${day}-${siteKey.slice(0, 2).toUpperCase()}-${i}`,
    kind,
    day,
    siteKey,
    speciesId: species.id,
    speciesName: species.name,
    animalId: animal,
    detail,
    tone,
  }

  /* Attribution into whichever other hierarchy the metric belongs to. Each is a weighted
     draw over the real registry, so every id here resolves. */
  if (kind === 'admissions' || kind === 'health') {
    const near = HOSPITALS.filter((h) => h.siteKey === siteKey)
    const hospital = (near.length ? near : HOSPITALS)[Math.floor(r() * (near.length || HOSPITALS.length))]
    ev.hospitalId = hospital.id
    const wards = WARDS.filter((w) => w.hospitalId === hospital.id)
    ev.wardId = wards[Math.floor(r() * wards.length)]?.id
  }

  if (kind === 'lab') {
    /* Field Pathology takes the water and parasite work, so aquatic samples lean to it. */
    const prefer = siteKey === 'aquatic' ? 'fpl' : 'cdl'
    const pool = LAB_DEPARTMENTS.filter((d) => (r() < 0.72 ? d.labId === prefer : true))
    ev.labDeptId = (pool.length ? pool : LAB_DEPARTMENTS)[Math.floor(r() * (pool.length || LAB_DEPARTMENTS.length))].id
  }

  if (kind === 'pharmacy') {
    ev.pharmacyId = `ph-${siteKey}`
    const cum = cumulative('med', MEDICINES.map((m) => m.weight))
    ev.medicineId = MEDICINES[indexFrom(cum, r())].id
  }

  if (kind === 'eggs' || kind === 'hatched' || kind === 'discarded') {
    const nursery = NURSERIES.find((n) => n.siteKey === siteKey) ?? NURSERIES[0]
    ev.nurseryId = nursery.id
    const incubators = INCUBATORS.filter((n) => n.nurseryId === nursery.id)
    ev.incubatorId = incubators[Math.floor(r() * incubators.length)]?.id
  }

  return ev
}

/* ── counting, without building anything ─────────────────────────────────── */

const sitesFor = (slug: string, siteKey: string | null): string[] => {
  if (siteKey) return [siteKey]
  const m = METRICS[slug]
  return (m?.kind === 'flow' ? m.flows : m?.levels)?.map((r) => r.site) ?? SITES.map((s) => s.key)
}

/** The number of events. Straight from the series — never from counting a list. */
export function count(slug: string, siteKey: string | null, win: Win): number {
  return sitesFor(slug, siteKey).reduce((n, k) => n + sumIn(slug, k, win.from, win.to), 0)
}

export type Dimension =
  | 'detail'
  | 'species'
  | 'class'
  | 'site'
  | 'hospital'
  | 'ward'
  | 'labdept'
  | 'medicine'
  | 'incubator'
  | 'nursery'

/**
 * Group the window's events by one dimension, biggest first.
 *
 * Walks the daily series and increments a tally per event rather than allocating one — a
 * six-year pharmacy window is 89,000 increments and no garbage. The buckets sum to `count`
 * exactly, because every event is attributed to exactly one value of every dimension.
 */
export function tally(
  slug: string,
  siteKey: string | null,
  win: Win,
  by: Dimension,
): { key: string; label: string; value: number }[] {
  const totals = new Map<string, { label: string; value: number }>()
  const add = (key: string, label: string) => {
    const at = totals.get(key)
    if (at) at.value++
    else totals.set(key, { label, value: 1 })
  }

  for (const key of sitesFor(slug, siteKey)) {
    const s = daily(slug, key)
    for (let day = Math.max(0, win.from); day <= Math.min(TODAY, win.to); day++) {
      for (let i = 0; i < s[day]; i++) {
        /* `detail`, `species`, `class` and `site` need no event object at all — the two
           draws that decide them are the same two the event would make. */
        if (by === 'site') {
          add(key, siteOf(key)?.name ?? key)
          continue
        }
        const seed = `${slug}:${key}:${day}:${i}`
        if (by === 'detail') {
          /* Same two draws the event itself makes, in the same order, so a grouping by
             detail and the records it groups cannot disagree. */
          const label = detailFor(slug, `${seed}:dt`, speciesFor(key, `${seed}:sp`, slug).cls)[0]
          add(label, label)
          continue
        }
        const sp = speciesFor(key, `${seed}:sp`, slug)
        if (by === 'species') add(sp.name, sp.name)
        else if (by === 'class') add(sp.cls, sp.cls)
        else {
          /* The remaining dimensions live on the built event. */
          const ev = eventAt(slug, key, day, i)
          const id =
            by === 'hospital' ? ev.hospitalId
            : by === 'ward' ? ev.wardId
            : by === 'labdept' ? ev.labDeptId
            : by === 'medicine' ? ev.medicineId
            : by === 'incubator' ? ev.incubatorId
            : ev.nurseryId
          if (id) add(id, labelFor(by, id))
        }
      }
    }
  }

  return [...totals.entries()]
    .map(([key, v]) => ({ key, label: v.label, value: v.value }))
    .sort((a, b) => b.value - a.value)
}

function labelFor(by: Dimension, id: string): string {
  switch (by) {
    case 'hospital':
      return HOSPITALS.find((h) => h.id === id)?.name ?? id
    case 'ward':
      return WARDS.find((w) => w.id === id)?.name ?? id
    case 'labdept':
      return LAB_DEPARTMENTS.find((d) => d.id === id)?.name ?? id
    case 'medicine':
      return MEDICINES.find((m) => m.id === id)?.name ?? id
    case 'incubator':
      return INCUBATORS.find((i) => i.id === id)?.name ?? id
    case 'nursery':
      return NURSERIES.find((n) => n.id === id)?.name ?? id
    default:
      return id
  }
}

/* ── paging ──────────────────────────────────────────────────────────────── */

export interface EventPage {
  rows: Ev[]
  total: number
  offset: number
  hasMore: boolean
}

/**
 * A page of events, newest first.
 *
 * Walks backwards from the window's last day and skips whole days by their count until the
 * offset is reached, so page 40 of a six-year window costs a loop over days rather than a
 * sort of 89,000 records.
 */
export function page(
  slug: string,
  siteKey: string | null,
  win: Win,
  offset = 0,
  limit = 20,
): EventPage {
  const keys = sitesFor(slug, siteKey)
  const total = count(slug, siteKey, win)

  const rows: Ev[] = []
  let seen = 0
  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)

  for (let day = to; day >= from && rows.length < limit; day--) {
    /* Within a day, sites are visited in registry order so the sequence is stable. */
    for (const key of keys) {
      const n = daily(slug, key)[day]
      if (!n) continue
      if (seen + n <= offset) {
        seen += n
        continue
      }
      for (let i = 0; i < n && rows.length < limit; i++) {
        if (seen++ < offset) continue
        rows.push(eventAt(slug, key, day, i))
      }
    }
  }

  return { rows, total, offset, hasMore: offset + rows.length < total }
}

/**
 * A page of events matching a predicate — the form an entity page needs.
 *
 * A ward, a lab department, a medicine and an incubator all narrow a flow to a subset of its
 * events, and none of them is the site dimension the series is keyed by. So the events are
 * built and tested, newest first, stopping as soon as the page is full.
 *
 * `scanned` is returned rather than hidden. An entity whose events are sparse in a long window
 * can exhaust the cap before filling a page, and a caller that shows "3 records" without
 * knowing the scan was truncated would be stating a total it never established. With the cap
 * hit, the caller says "3 of at least 3" or widens the window.
 */
export function pageWhere(
  slug: string,
  siteKey: string | null,
  win: Win,
  match: (ev: Ev) => boolean,
  offset = 0,
  limit = 20,
  cap = 40_000,
): EventPage & { exhausted: boolean } {
  const keys = sitesFor(slug, siteKey)
  const rows: Ev[] = []
  let matched = 0
  let scanned = 0

  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)

  for (let day = to; day >= from; day--) {
    for (const key of keys) {
      const n = daily(slug, key)[day]
      for (let i = 0; i < n; i++) {
        if (scanned++ >= cap) {
          return { rows, total: matched, offset, hasMore: true, exhausted: false }
        }
        const ev = eventAt(slug, key, day, i)
        if (!match(ev)) continue
        matched++
        if (matched > offset && rows.length < limit) rows.push(ev)
      }
    }
  }

  return { rows, total: matched, offset, hasMore: offset + rows.length < matched, exhausted: true }
}

/** The count for one value of one dimension, from the cheap tally rather than a scan. */
export function countOf(
  slug: string,
  siteKey: string | null,
  win: Win,
  by: Dimension,
  key: string,
): number {
  return tally(slug, siteKey, win, by).find((t) => t.key === key)?.value ?? 0
}

/** Every event touching one animal, across every flow metric. Powers its cross-navigation. */
export function eventsForAnimal(animal: Animal, win: Win, kinds?: string[]): Ev[] {
  const slugs = kinds ?? Object.keys(METRICS).filter((k) => METRICS[k].kind === 'flow')
  const out: Ev[] = []

  for (const slug of slugs) {
    const s = daily(slug, animal.siteKey)
    for (let day = Math.min(TODAY, win.to); day >= Math.max(0, win.from); day--) {
      for (let i = 0; i < s[day]; i++) {
        const ev = eventAt(slug, animal.siteKey, day, i)
        if (ev.animalId === animal.id) out.push(ev)
      }
    }
  }

  return out.sort((a, b) => b.day - a.day)
}

/** "31 Jul · Chital · Disease" — the one-line form a record row and a timeline share. */
export const evLine = (ev: Ev): string => `${shortDate(ev.day)} · ${ev.speciesName} · ${ev.detail}`

/** The animal an event is about, built on demand. */
export const subjectOf = (ev: Ev): Animal | undefined => {
  const key = ev.animalId
  const decoded = /^ANM-([A-Z]{2})(\d{2})-(\d+)$/.exec(key)
  if (!decoded) return undefined
  const site = SITES.find((s) => s.code === decoded[1])
  if (!site) return undefined
  const sp = speciesIn(site.key)[Number(decoded[2])]
  return sp ? animalAt(sp.id, Number(decoded[3])) : undefined
}

export { animalLabel }
