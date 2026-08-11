/**
 * THE METRIC REGISTRY — what the collection actually reported, per site.
 *
 * TWO ROW SHAPES, BECAUSE THERE ARE TWO KINDS OF NUMBER, and conflating them is what the
 * old model did wrong. A FLOW accumulates: deaths in July, transfers this quarter. A LEVEL is
 * a reading taken at an instant: it has a value now and a value six months ago, and no "all
 * time" version at all — the all-time question about a population is "how many have we ever
 * held", which is a different metric with a different name, not the same one over a longer
 * window.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THIS FILE NO LONGER AUTHORS NUMBERS. It used to hold the only typed figures in the product
 * — thirty metrics × six sites × five nested window totals, hand-written and hand-checked.
 * Every one of them is now read from the database via `store.ts`.
 *
 * WHAT THAT CHANGES, BEYOND THE OBVIOUS. The five nested window totals existed because nobody
 * can author 2,192 days × 6 sites × 13 metrics, so `series.ts` solved for a daily series that
 * satisfied five constraints. There is nothing left to solve: every event carries its own real
 * date, so the daily series IS the data, counted. `FlowRow.v` survives as a type only, and
 * carries the site's real all-time total in its last slot for anything that wants a quick
 * magnitude.
 *
 * A METRIC WITH NO SOURCE IS ABSENT, NOT ZERO. This is the load-bearing decision in the file.
 * Eggs, hatchings, discarded eggs, fetal loss, escapes, laboratory samples and turnaround,
 * approvals, tasks, attendance, alerts, welfare audits, breeding success and food wastage have
 * no table, and in most cases no column, anywhere in `species_mgmt_anon`. Rather than fill
 * them with something plausible, they are simply not registered — which makes `METRICS[slug]`
 * undefined, which makes `figure()` return `known: false`, which is the empty state the pages
 * already render. As `query.ts` puts it: "'0 deaths in Carnivore Ridge' and 'we do not track
 * deaths in Carnivore Ridge' are different statements and only one of them is true."
 */

import { data } from './store'

/** Nested window totals for a flow: [today, week, month, sixMonths, all]. */
export type Flow = [today: number, week: number, month: number, sixMonths: number, all: number]

export interface FlowRow {
  site: string
  v: Flow
}

/** A reading at an instant: now, and the same reading six months ago. */
export interface LevelRow {
  site: string
  now: number
  then: number
  /** Denominator, for a metric whose figure is a rate. Moves slowly; treated as fixed. */
  of?: number
}

export type MetricKind = 'flow' | 'level' | 'rate'

export interface Metric {
  /** Word after the number. Singular-agnostic — "deaths", not "death(s)". */
  unit: string
  kind: MetricKind
  /** What one row means at the finest level — a member of the collection, or an event. */
  grain: 'member' | 'event'
  flows?: FlowRow[]
  levels?: LevelRow[]
  /** What the flow's classifying dimension is called — "Manner of death", "Vaccine". */
  detailLabel?: string
  /** The dimension's real values. Replaces the authored `DETAILS` tables in `events.ts`. */
  details?: string[]
  /** How this figure was derived, where the derivation is not a plain count. */
  note?: string
}

/**
 * The registry.
 *
 * Mutated by `hydrateMetrics()` rather than reassigned, so every `import { METRICS }` across
 * the product keeps pointing at the same object. Empty until `loadWorld()` resolves.
 */
export const METRICS: Record<string, Metric> = {}

/**
 * Metrics with no source in `species_mgmt_anon`, and what is missing.
 *
 * ONE REGISTRY, READ BY BOTH THE ASSERTION AND THE PAGE. This lived privately in
 * `core/checks.ts`, which printed it to the console so a developer could learn why a module
 * was empty. The reader of the product could not: they got a blank card and no account of it.
 * Now the module pages render the same strings, so the explanation a developer sees in the
 * console and the one a director sees on the screen cannot drift apart — there is only one.
 *
 * `checks.ts` still asserts the other direction: a slug listed here that HAS acquired a metric
 * is a stale entry and fails the boot, which is what stops this list quietly outliving the gap
 * it describes.
 */
export const UNSOURCED: Record<string, string> = {
  eggs: 'no egg, clutch or incubation table',
  hatched: 'no hatch record',
  discarded: 'no egg record',
  fetal: 'no fetal-loss record',
  escaped: 'no escape record',
  escapedOpen: 'no escape record',
  lab: 'no lab test table — only a lab_test_id_count column',
  labOpen: 'no lab test table',
  approvals: 'no approvals table',
  tasks: 'no tasks table',
  attendance: 'no attendance table',
  alerts: 'no alerts table',
  alertsCritical: 'no alerts table',
  welfare: 'assessments exist but carry no pass/fail',
  breeding: 'no pairing outcome record',
  healthScore: 'no composite index in the source',
  wastage: 'no feed record — vaccination/deworming wastage is a dose figure, not feed',
  preventive: 'superseded by the per-programme coverage rates',
}

/**
 * Prose for the metrics whose figure is a derivation rather than a count, printed wherever the
 * UI has room for a caption.
 *
 * Each one names a real limitation of the schema. They are stated rather than hidden because a
 * coverage figure of 9% against a denominator nobody has defined is worse than no figure at
 * all — and better than a 92% that was invented.
 */
const NOTES: Record<string, string> = {
  animals:
    'Housed animals. Today is an exact count; earlier days are reconstructed from recorded births, intakes, deaths and transfers — the schema stores no headcount history.',
  births:
    'Recorded against the birth date where the record carries one, and against the date it was added otherwise — birth_date is null on 59% of rows.',
  vaccination:
    'Distinct animals with a completed vaccination, against all housed animals. No protocol table exists to define an eligible herd, so the denominator is the whole collection.',
  dewormingCover:
    'Distinct animals with a completed deworming, against all housed animals. Same denominator caveat as vaccination coverage.',
  health:
    'Animals with a live prescription — the only under-care signal in the schema. There is no admission, discharge or bed record.',
  admissions:
    'Standard-case medical records. The presenting sign is shown where one was recorded; 73% carry none.',
}

/**
 * Build the registry from the loaded database.
 *
 * Flows come straight from the event blocks. Levels and rates come from the readings the ETL
 * computed. The population level is assembled here because its series lives in its own file —
 * see `series.ts`, which reads it directly rather than through `FlowRow`.
 */
export function hydrateMetrics(): void {
  if (Object.keys(METRICS).length) return
  const d = data()

  for (const [slug, f] of d.flows) {
    const rows: FlowRow[] = []
    for (const [siteKey, span] of Object.entries(f.slices)) {
      rows.push({ site: siteKey, v: [0, 0, 0, 0, span[1]] })
    }
    if (!rows.length) continue
    METRICS[slug] = {
      unit: f.unit,
      kind: 'flow',
      grain: f.grain,
      flows: rows,
      detailLabel: f.detailLabel,
      details: f.details,
      note: NOTES[slug],
    }
  }

  for (const [slug, spec] of Object.entries(d.rates)) {
    if (!spec.levels.length) continue
    METRICS[slug] = {
      unit: spec.unit,
      kind: 'rate',
      grain: spec.grain,
      levels: spec.levels,
      note: NOTES[slug],
    }
  }

  for (const [slug, spec] of Object.entries(d.levels)) {
    if (!spec.levels.length) continue
    METRICS[slug] = {
      unit: spec.unit,
      kind: 'level',
      grain: spec.grain,
      levels: spec.levels,
      note: NOTES[slug],
    }
  }

  /* The population. `now` is the exact housed count; `then` is the reconstruction six months
     back, read off the same series `series.ts` will serve. Registered last so it cannot be
     shadowed by a same-named block above. */
  const days = d.meta.historyDays
  const six = Math.max(0, days - 1 - 182)
  METRICS.animals = {
    unit: 'animals',
    kind: 'level',
    grain: 'member',
    levels: d.sites.map((s, i) => ({
      site: s.key,
      now: d.population[i][days - 1],
      then: d.population[i][six],
    })),
    note: NOTES.animals,
  }
}

export const metricOf = (slug: string): Metric | undefined => METRICS[slug]

export const isFlow = (m: Metric): boolean => m.kind === 'flow'
export const isRate = (m: Metric): boolean => m.kind === 'rate'

/** Whether the product has any model at all for a figure. The empty-state test. */
export const isKnown = (slug: string): boolean => Boolean(METRICS[slug])
