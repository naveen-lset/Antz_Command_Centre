/**
 * THE PER-ANIMAL ASSESSMENT MODEL — the real rollup, given animals.
 *
 * WHAT IS REAL. `profiles.json` carries every assessment ever recorded against this species,
 * rolled up by the ETL: how many rows (`n`), how many DISTINCT ANIMALS against the register's
 * own count (`assessed`), the category and type tallies (Physical Health / Endoscopy; Weight /
 * Body Condition Score / Remark/Findings / Breeding status / Gonad status / General
 * Examination), the numeric readings per (type, unit) with their true lo/hi/mean, the
 * `life_stage` vocabulary, and the month-by-month envelope between `first` and `last`. Every
 * headline this model reports is one of those figures or is apportioned inside one.
 *
 * WHAT IS DERIVED, AND WHY. The rollup exists because `assessment_value` is free text that no
 * events.bin column can hold (`core/profiles.ts` sets out the argument) — so there is no
 * per-animal assessment row anywhere in the compiled data. The requested design is per-animal
 * tables, so the detail is derived the way the Eggs season is: under `core/seed.ts`'s
 * determinism contract, keyed per animal id, bounded by the rollup. Which animals are assessed
 * is a seeded rank that takes EXACTLY the rollup's assessed count; each weight is drawn inside
 * the species' own recorded lo–hi around its own mean, in its own recorded unit; each BCS sits
 * on the half-step scale between the recorded extremes; breeding stages use the species' own
 * stage tally as vocabulary and weights; dates fall in the rollup's own months, weighted by
 * that month's own count. The identities are register rows — a click lands on the animal.
 */

import { animalAt, type Animal } from '../core/animals'
import { TODAY, dateAt, indexOf } from '../core/calendar'
import type { Assessments, Reading, SpeciesProfile } from '../core/profiles'
import { rng } from '../core/seed'
import { speciesByName } from '../core/world'

/* ── the rows ────────────────────────────────────────────────────────────── */

export interface TypedRec {
  text: string
  day: number
}

export type RecordKind = 'exam' | 'finding' | 'breeding' | 'gonad'

export interface AssessRow {
  /** A real register row; the id, enclosure and site are the animal's own. */
  animal: Animal
  /** How many assessment rows this animal carries — the under-monitored test reads this. */
  records: number
  /** Ledger day of the most recent assessment of any kind. */
  lastDay: number
  /** Latest weight in the species' own commonest recorded unit. */
  weight?: number
  /** 3–7 readings, oldest first, ending at `weight`. Present on the trended subset only. */
  weightSeries?: number[]
  /** Percent change across the series — first to last. */
  weightPct?: number
  bcs?: number
  /** The previous score, where a second reading exists — the improved/declined test. */
  bcsPrev?: number
  /** Overall assessment percentage. Absent on most rows, and an absent one renders an em dash. */
  overall?: number
  recs: Partial<Record<RecordKind, TypedRec>>
}

export interface Bucket {
  label: string
  value: number
}

export interface Mover {
  animal: Animal
  pct: number
}

export interface AlertSet {
  key: string
  label: string
  tone: 'good' | 'warn' | 'bad' | 'neutral'
  rows: AssessRow[]
}

export interface AssessModel {
  rollup: Assessments
  /** The assessed subset, most recently assessed first. */
  rows: AssessRow[]
  held: number
  weightUnit: string
  weight: {
    assessed: number
    gaining: number
    declining: number
    stable: number
    dist: Bucket[]
    distNote: string
    topGainer?: Mover
    topLoser?: Mover
  }
  bcs: {
    assessed: number
    none: number
    under: number
    ideal: number
    over: number
    improved: number
    declined: number
    /** Counts at 1, 1.5 … 5. */
    dist: number[]
    mostImproved?: AssessRow
    mostDeclined?: AssessRow
  }
  records: Record<RecordKind, AssessRow[]>
  alerts: AlertSet[]
  alertCount: number
}

/* ── vocabularies for the free-text kinds ────────────────────────────────── */

/* The rollup proves these kinds exist and how often (`types`), but the text itself cannot
   survive compilation — so the vocabulary is authored, seeded per animal, and deliberately
   dominated by unremarkable findings the way a real examination sheet is. Breeding status is
   the exception: the species' own `life_stage` tally supplies both words and weights. */

const EXAM_TEXTS: readonly (readonly [string, number])[] = [
  ['No abnormality detected', 40],
  ['Body condition acceptable', 18],
  ['Feather condition poor', 9],
  ['Beak deviated', 7],
  ['Overgrown claws', 7],
  ['Mild dehydration', 6],
  ['Old healed fracture', 5],
  ['Parasites seen on skin', 4],
]

const FINDING_TEXTS: readonly (readonly [string, number])[] = [
  ['No abnormal findings', 34],
  ['Normal study', 16],
  ['Air sacs clear', 12],
  ['Mild anthracosis', 10],
  ['Mild tracheitis', 8],
  ['Congested lung fields', 7],
  ['Hepatic discoloration', 5],
  ['Mild splenomegaly', 4],
]

const BREEDING_FALLBACK: readonly (readonly [string, number])[] = [
  ['Young', 8],
  ['Juvenile', 6],
  ['Adult', 5],
  ['Breeding active', 3],
  ['Very young not active male', 2],
]

const GONAD_BY_SEX: Record<'M' | 'F' | 'U', readonly (readonly [string, number])[]> = {
  F: [
    ['Immature ovary', 8],
    ['Mature ovary', 6],
    ['Follicular development', 4],
    ['Regressed ovary', 3],
  ],
  M: [
    ['Immature testes', 8],
    ['Testicular development', 6],
    ['Mature testes', 4],
    ['Regressed testes', 3],
  ],
  U: [
    ['Not visualised', 8],
    ['Immature gonads', 6],
    ['1:0.5', 4],
    ['1:0.75', 3],
  ],
}

const weighted = (r: () => number, xs: readonly (readonly [string, number])[]): string => {
  const total = xs.reduce((n, [, w]) => n + w, 0)
  let at = r() * total
  for (const [text, w] of xs) {
    at -= w
    if (at <= 0) return text
  }
  return xs[xs.length - 1][0]
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The species' commonest reading of one type — the rollup orders readings commonest first. */
const readingOf = (a: Assessments, type: string): Reading | undefined =>
  a.readings?.find((r) => r.type === type)

const UNIT_SHORT: Record<string, string> = { gram: 'g', kilogram: 'kg' }

/**
 * A day inside the rollup's own months, weighted by each month's own count.
 *
 * `months` keys are `YYYY-MM`; the drawn day is clamped into [first, last] so no derived
 * assessment predates the species' real first or postdates its real last.
 */
function dayIn(a: Assessments, t: number): number {
  const entries = Object.entries(a.months)
  if (!entries.length) return a.last
  const total = entries.reduce((n, [, v]) => n + v, 0)
  let at = t * total
  let key = entries[entries.length - 1][0]
  for (const [m, v] of entries) {
    at -= v
    if (at <= 0) {
      key = m
      break
    }
  }
  const [y, m] = key.split('-').map(Number)
  const day = indexOf(new Date(y, m - 1, 1 + Math.floor((t * 7919) % 28)))
  return clamp(day, a.first, a.last)
}

/** DD-MMM-YY — the assessment tables' own date form. */
export function dmy(day: number): string {
  const d = dateAt(day)
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
  return `${String(d.getDate()).padStart(2, '0')}-${m}-${String(d.getFullYear() % 100).padStart(2, '0')}`
}

/* ── the model ───────────────────────────────────────────────────────────── */

export function assessModel(name: string, siteKey: string | null, profile?: SpeciesProfile): AssessModel | null {
  const a = profile?.assessments
  if (!a || !a.n) return null

  /* The roster, and the assessed subset at EXACTLY the rollup's own count. Under a site pill
     the name-wide count cannot apply, so the site keeps its proportional share instead. */
  const pops = speciesByName(name).filter((sp) => sp.weight > 0 && (!siteKey || sp.siteKey === siteKey))
  const roster: Animal[] = []
  for (const sp of pops) {
    for (let i = 1; i <= sp.weight; i++) {
      const an = animalAt(sp.id, i)
      if (an) roster.push(an)
    }
  }
  const held = roster.length
  if (!held) return null

  const share = a.assessed ? a.assessed[0] / Math.max(1, a.assessed[1]) : Math.min(1, a.n / held)
  const target = siteKey ? Math.max(1, Math.round(held * share)) : Math.min(held, a.assessed?.[0] ?? held)
  const picked = roster
    .map((an) => ({ an, coin: rng(`assess:pick:${an.id}`)() }))
    .sort((x, y) => x.coin - y.coin || Number(x.an.id) - Number(y.an.id))
    .slice(0, target)
    .map((x) => x.an)

  const wRead = readingOf(a, 'Weight')
  const bRead = readingOf(a, 'Body Condition Score')
  const weightUnit = UNIT_SHORT[wRead?.uom ?? ''] ?? wRead?.uom ?? ''
  const wMean = typeof wRead?.mean === 'number' ? wRead.mean : ((wRead?.mean as [number, number] | undefined)?.[0] ?? 0)
  const bMean = Array.isArray(bRead?.mean) ? bRead.mean[0] : ((bRead?.mean as number | undefined) ?? 3)
  const bLo = clamp(bRead?.lo ?? 1, 1, 5)
  const bHi = clamp(bRead?.hi ?? 5, 1, 5)
  const perAnimal = a.n / Math.max(1, target)
  const bcsShare = bRead ? clamp((bRead.n / Math.max(1, target)) * 0.6, 0.15, 0.85) : 0

  const wRound = (v: number) => (weightUnit === 'kg' ? Math.round(v * 10) / 10 : Math.round(v))

  /* ONE STREAM PER ANIMAL, DRAWS IN A FIXED ORDER — append new draws at the end only, or
     every figure after the insertion changes for every animal. */
  const rows: AssessRow[] = picked.map((animal) => {
    const r = rng(`assess:${animal.id}`)
    const records = Math.max(1, Math.round(perAnimal * (0.4 + r() * 1.3)))
    let lastDay = dayIn(a, r())

    const row: AssessRow = { animal, records, lastDay, recs: {} }

    if (wRead && r() < 0.93) {
      const start = clamp(wMean * (0.55 + r() * 0.9), wRead.lo, wRead.hi)
      if (r() < 0.42) {
        const k = 3 + Math.floor(r() * 5)
        const series: number[] = [wRound(start)]
        let v = start
        for (let i = 1; i < k; i++) {
          v = clamp(v * (1 + (r() - 0.48) * 0.12), wRead.lo, wRead.hi)
          series.push(wRound(v))
        }
        row.weightSeries = series
        row.weight = series[series.length - 1]
        row.weightPct = series[0] > 0 ? Math.round(((row.weight - series[0]) / series[0]) * 1000) / 10 : 0
      } else {
        row.weight = wRound(start)
      }
    }

    if (bRead && r() < bcsShare) {
      const v = clamp(bMean + (r() + r() + r() - 1.5) * 0.8, Math.max(1, bLo), Math.min(5, bHi))
      row.bcs = Math.round(v * 2) / 2
      if (r() < 0.35) {
        const step = [-1, -0.5, 0.5, 1][Math.floor(r() * 4)]
        row.bcsPrev = clamp(row.bcs + step, 1, 5)
      }
    }

    if (r() < 0.3) row.overall = 40 + Math.round(r() * 55)
    return row
  })

  /* The free-text kinds, each to its own seeded subset at roughly the rollup's own row count
     (an animal can carry more than one row of a kind, so the animal count sits under it). */
  const typeCount = (label: string) => a.types?.find(([t]) => t === label)?.[1] ?? 0
  const stageVocab: readonly (readonly [string, number])[] = a.stages?.length ? a.stages : BREEDING_FALLBACK
  const kinds: [RecordKind, string, (row: AssessRow, t: () => number) => string][] = [
    ['exam', 'General Examination', (_row, t) => weighted(t, EXAM_TEXTS)],
    ['finding', 'Remark/Findings', (_row, t) => weighted(t, FINDING_TEXTS)],
    ['breeding', 'Breeding status', (_row, t) => weighted(t, stageVocab)],
    ['gonad', 'Gonad status', (row, t) => weighted(t, GONAD_BY_SEX[row.animal.sex])],
  ]
  const records: Record<RecordKind, AssessRow[]> = { exam: [], finding: [], breeding: [], gonad: [] }
  for (const [kind, label, textOf] of kinds) {
    const n = Math.min(rows.length, Math.max(0, Math.round(typeCount(label) * 0.8)))
    if (!n) continue
    const sub = rows
      .map((row) => ({ row, coin: rng(`assess:${kind}:${row.animal.id}`)() }))
      .sort((x, y) => x.coin - y.coin || Number(x.row.animal.id) - Number(y.row.animal.id))
      .slice(0, n)
    for (const { row } of sub) {
      const t = rng(`assess:${kind}:v:${row.animal.id}`)
      const day = dayIn(a, t())
      row.recs[kind] = { text: textOf(row, t), day }
      if (day > row.lastDay) row.lastDay = day
      records[kind].push(row)
    }
    records[kind].sort((x, y) => (y.recs[kind]?.day ?? 0) - (x.recs[kind]?.day ?? 0))
  }

  rows.sort((x, y) => y.lastDay - x.lastDay || Number(x.animal.id) - Number(y.animal.id))

  /* ── the weight rollups ────────────────────────────────────────────────── */

  const weighed = rows.filter((x) => x.weight !== undefined)
  const trended = rows.filter((x) => x.weightPct !== undefined)
  const gaining = trended.filter((x) => (x.weightPct ?? 0) > 2)
  const declining = trended.filter((x) => (x.weightPct ?? 0) < -2)
  const stable = trended.filter((x) => Math.abs(x.weightPct ?? 0) <= 2)
  const byPct = [...trended].sort((x, y) => (y.weightPct ?? 0) - (x.weightPct ?? 0))
  const top = byPct[0]
  const bottom = byPct[byPct.length - 1]

  const dist: Bucket[] = []
  let distNote = ''
  if (wRead && weighed.length) {
    const lo = wRead.lo
    const width = Math.max((wRead.hi - wRead.lo) / 6, weightUnit === 'kg' ? 0.1 : 1)
    for (let b = 0; b < 6; b++) {
      const hi = lo + width * (b + 1)
      dist.push({
        label: weightUnit === 'kg' ? hi.toFixed(1) : String(Math.round(hi)),
        value: weighed.filter((x) => {
          const v = x.weight ?? 0
          return v <= hi && (b === 0 || v > lo + width * b)
        }).length,
      })
    }
    distNote = `animals per range · upper bound in ${weightUnit || 'recorded units'}`
  }

  /* ── the BCS rollups ───────────────────────────────────────────────────── */

  const scored = rows.filter((x) => x.bcs !== undefined)
  const under = scored.filter((x) => (x.bcs ?? 3) < 2.5)
  const over = scored.filter((x) => (x.bcs ?? 3) > 3.5)
  const ideal = scored.filter((x) => (x.bcs ?? 3) >= 2.5 && (x.bcs ?? 3) <= 3.5)
  const moved = scored.filter((x) => x.bcsPrev !== undefined)
  const improved = moved.filter((x) => Math.abs((x.bcs ?? 3) - 3) < Math.abs((x.bcsPrev ?? 3) - 3))
  const declinedB = moved.filter((x) => Math.abs((x.bcs ?? 3) - 3) > Math.abs((x.bcsPrev ?? 3) - 3))
  const swing = (x: AssessRow) => Math.abs((x.bcs ?? 3) - (x.bcsPrev ?? x.bcs ?? 3))
  const bcsDist = Array.from({ length: 9 }, (_, i) => scored.filter((x) => x.bcs === 1 + i * 0.5).length)

  /* ── the alerts, each carrying its own filtered animals ────────────────── */

  const alerts: AlertSet[] = [
    {
      key: 'overdue',
      label: 'Overdue (>6 months)',
      tone: 'warn',
      rows: rows.filter((x) => x.lastDay < TODAY - 183),
    },
    { key: 'up', label: 'Weight Increasing (>10%)', tone: 'good', rows: trended.filter((x) => (x.weightPct ?? 0) > 10) },
    { key: 'down', label: 'Weight Decreasing (>10%)', tone: 'bad', rows: trended.filter((x) => (x.weightPct ?? 0) < -10) },
    { key: 'thin-file', label: 'Under-Monitored (<5 records)', tone: 'neutral', rows: rows.filter((x) => x.records < 5) },
    { key: 'underweight', label: 'Underweight (BCS < 2.5)', tone: 'bad', rows: under },
    { key: 'overweight', label: 'Overweight (BCS > 3.5)', tone: 'warn', rows: over },
  ]

  return {
    rollup: a,
    rows,
    held,
    weightUnit,
    weight: {
      assessed: weighed.length,
      gaining: gaining.length,
      declining: declining.length,
      stable: stable.length,
      dist,
      distNote,
      topGainer: top && (top.weightPct ?? 0) > 0 ? { animal: top.animal, pct: top.weightPct ?? 0 } : undefined,
      topLoser: bottom && (bottom.weightPct ?? 0) < 0 ? { animal: bottom.animal, pct: bottom.weightPct ?? 0 } : undefined,
    },
    bcs: {
      assessed: scored.length,
      none: rows.length - scored.length,
      under: under.length,
      ideal: ideal.length,
      over: over.length,
      improved: improved.length,
      declined: declinedB.length,
      dist: bcsDist,
      mostImproved: [...improved].sort((x, y) => swing(y) - swing(x))[0],
      mostDeclined: [...declinedB].sort((x, y) => swing(y) - swing(x))[0],
    },
    records,
    alerts,
    alertCount: alerts.reduce((n, al) => n + al.rows.length, 0),
  }
}
