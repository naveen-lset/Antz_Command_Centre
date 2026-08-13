/**
 * THE SPECIES PAGE'S THREE BUSIEST TABS — Overview, Circle of Life and Animals.
 *
 * WHY THESE THREE MOVED OUT OF `entity.tsx` TOGETHER. They were the last species tabs still
 * written inline inside the fourteen-kind entity page, and they were the three that had stopped
 * being able to grow: each was a short stack of `Section` cards, so every new figure arrived as
 * another white box and the tab's shape said nothing about what was in it. Overview held a ring
 * and five standing rows; Circle of Life held a flow mark, a reconciliation and eight death
 * rows; Animals held a bare list. Everything the ETL added this cycle — sex at birth, sex at
 * death, the dating flag, the age-at-death column and the per-species longevity rollup — had
 * nowhere to land that was not a fifth and sixth card.
 *
 * THE IDENTITY IS THE NAME, THE FILTER IS THE PILL. Every figure here reads across every
 * population of the same common name — the argument `speciesWide.ts` sets out at length — and
 * narrows only when the reader has explicitly set the site pill the header is already showing.
 * Measured: Ochre Warbler is 1,045 animals at 7 sites, 365 births at 8 and 278 deaths at 8, so
 * a tab keyed on the single site in the route would report a share of its own subject.
 *
 * THREE SHAPES, NOT ONE. Overview is a dashboard — trend, composition, ranking, table, in that
 * order of altitude. Circle of Life is an analytical story that runs top to bottom with no
 * container anywhere in it. Animals is a data workspace: one table and nothing else. Each is a
 * SINGLE bordered surface — see `Sheet` — rather than a stack of one card per figure.
 *
 * WHAT IS NAMED AS ABSENT RATHER THAN DRAWN. There is no survival function on this page and
 * there cannot be one: the extract carries no exposure denominator and no censoring date, and
 * only 29 of 38,608 dead animal ids appear in `housing` at all. The ETL says so in
 * `dims.meta.notes.ageAtDeath` and this file quotes that note rather than paraphrasing it into a
 * second telling that can drift. Likewise there is no "can breed" bucket — that is a maturity
 * claim, and `born` is absent on 81% of the register while `maturity_age_years` exists for 775
 * of 2,447 profiles. `core/animals.ts` already refuses the word one level down; this tab carries
 * its refusal up rather than re-inventing the claim at page level.
 */

import { useMemo } from 'react'
import {
  Activity,
  ArrowLeftRight,
  Baby,
  Boxes,
  CalendarRange,
  Heart,
  HeartPulse,
  Layers,
  MapPin,
  ShieldCheck,
  Skull,
  Sparkles,
} from 'lucide-react'

import { TODAY, buckets, dateAt, shortDate, type Win } from '../core/calendar'
import { UNRESOLVED, data, flowOf } from '../core/store'
import { SPECIES, siteOf, speciesOf } from '../core/world'
import {
  animalsOfSpecies,
  compositionOf,
  holdingsByEnclosure,
  type Animal,
  type Composition,
} from '../core/animals'
import type { SpeciesProfile } from '../core/profiles'
import { EventTrend, FlowSplit, type Pt } from '../exec/marks'
import { Columns, FAINT, Facts, HAIR, INK, RED_LIST, Ring, TONE, TRACK, VALUE, fmt, mix, step, useAccent } from '../exec/system'
import { speciesLifecycle } from './modules/population'
import { standingOf } from './modules/regulatory'
import {
  Band,
  CoverageMeter,
  DataTable,
  DefinitionList,
  MetricStrip,
  NotePanel,
  RankedBars,
  SplitLayout,
  TabBody,
  type Column,
} from './speciesLayout'
import { speciesWideAt } from './speciesWide'
import { useDrill } from './drillNav'
import { MoreRows, usePaged } from './perf'
import { useScope } from './scope'

/* ── one flow, one species name, every site, in a single pass ────────────── */

/** Everything a species tab can ask of one flow, counted once so the parts cannot disagree. */
interface SpeciesFlow {
  total: number
  /** The flow's classifying vocabulary — manner of death, birth type — biggest first. */
  detail: { label: string; value: number }[]
  /** One tally per requested facet, biggest first, keyed by facet name. */
  facet: Record<string, { label: string; value: number }[]>
  sites: { siteKey: string; siteName: string; value: number }[]
  /** The trend, on the same bucket boundaries every other time mark in the product uses. */
  points: Pt[]
  /** Month of year, pooled across the window's years. Twelve entries, January first. */
  months: number[]
  /** How many rows reached `months` — smaller than `total` where a dating filter was applied. */
  dated: number
  /** Values of a measured column, sentinel already dropped. Never padded to `total`. */
  numbers: number[]
}

interface WalkOpts {
  facets?: readonly string[]
  /** Buckets for the trend. Zero asks for none, and then no bucket index is built at all. */
  max?: number
  months?: boolean
  /**
   * Restrict what reaches `months` to rows carrying one facet value.
   *
   * THIS EXISTS FOR EXACTLY ONE MEASURED REASON. 39,170 of 64,083 compiled births are dated by
   * `added_on_antz` rather than by a birth date, and the two populations have opposite month
   * profiles — the fallback rows peak in May and August and all but vanish in November and
   * December, which is a data-entry calendar. Pooling them draws that calendar and labels it a
   * breeding season. So the seasonal card counts only the rows the source really dated, and
   * `dated` travels back with the counts so the card can print its own denominator.
   */
  datedBy?: { facet: string; value: string }
  /** A measured column to collect — `'age'` on the mortality flow. */
  number?: string
}

const EMPTY_FLOW: SpeciesFlow = {
  total: 0,
  detail: [],
  facet: {},
  sites: [],
  points: [],
  months: new Array<number>(12).fill(0),
  dated: 0,
  numbers: [],
}


/** Ages counted into the extract's own shared bands, in band order, empty bands dropped. */
function ageBandsOf(values: number[]): [string, number][] {
  const edges = data().meta.ageBands
  const counts = edges.map(() => 0)
  for (const v of values) {
    const ix = edges.findIndex(([, lo, hi]) => v >= lo && (hi === null || v < hi))
    if (ix >= 0) counts[ix]++
  }
  return edges.map(([label], i) => [label, counts[i]] as [string, number]).filter(([, n]) => n > 0)
}

/* ── the Red List badge ──────────────────────────────────────────────────── */

/**
 * The published Red List badge for a status string, or nothing.
 *
 * MOVED HERE FROM `entity.tsx` WITH THE OVERVIEW TAB IT BELONGS TO, unchanged. `standingOf`
 * returns the verbatim published label — "Least Concern (Low Risk)" — while `profiles.json`
 * carries the bare code, so the code is matched first and the name second; matching only the
 * name drew no badge at all on this tab, which is the defect the two-step lookup fixed. A
 * species the list has not assessed gets NO badge, because a neutral chip beside "Not Evaluated"
 * reads as a category that was assigned.
 */
function iucnBadge(status?: string | null) {
  if (!status) return null
  const key = status.trim().toLowerCase()
  const hit =
    RED_LIST.find((c) => c.code.toLowerCase() === key) ??
    RED_LIST.find((c) => key.startsWith(c.name.toLowerCase()))
  if (!hit) return null
  return (
    <span
      className="grid size-6 place-items-center rounded-full rounded-tr-[4px] font-display text-[10px] font-bold"
      style={{
        backgroundColor: hit.fill,
        color: hit.ink,
        boxShadow: 'outline' in hit && hit.outline ? `inset 0 0 0 1.25px ${hit.outline}` : undefined,
      }}
      title={hit.name}
      aria-hidden
    >
      {hit.code}
    </span>
  )
}

/* ── shared furniture ────────────────────────────────────────────────────── */

/**
 * ONE SURFACE PER TAB, with the sections separated inside it by their own hairline.
 *
 * THIS IS THE RECONCILIATION OF TWO TRUE THINGS. `Band` now defaults to a white card, and the
 * reason it was changed is real and visible: `Shell` paints a landscape behind every route, so a
 * section with no surface sets husbandry data on top of foliage. But a tab of eight cards is the
 * defect this whole rework exists to remove — eight boxes stacked down a page say the reader is
 * looking at eight unrelated findings, when Circle of Life is one argument read top to bottom.
 *
 * So the ground is opaque exactly once and the rhythm inside it is typographic: one border on
 * the page, and each `Band` passed `flat` so it separates by a rule rather than by an edge.
 * Measured: this takes the Overview tab from seven bordered containers to one and Circle of Life
 * from ten to one, with no text landing on the landscape.
 */
function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="rounded-[var(--radius-card)] border bg-white p-[var(--pad-card)]"
      style={{ borderColor: HAIR }}
    >
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  )
}

/** A caption under a mark — the sentence a figure needs and a card border cannot say. */
function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-caption leading-relaxed" style={{ color: FAINT }}>
      {children}
    </p>
  )
}

/** The label above one half of a paired mark. Two marks, one band, one rule above them. */
function MarkHead({ label, aside }: { label: string; aside?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-small font-medium" style={{ color: INK }}>
        {label}
      </span>
      {aside && (
        <span className="shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>
          {aside}
        </span>
      )}
    </div>
  )
}

/** Two marks that answer the same question of two flows, side by side once there is room. */
function Pairs({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-x-10 gap-y-8 @[720px]:grid-cols-2">{children}</div>
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "1 site", "8 sites", or nothing at all — a flow with no rows has no site count to state. */
/**
 * Every row of one flow belonging to one species name, walked once.
 *
 * WHY A WALK AND NOT AN EXISTING HELPER, which is the same argument `speciesEggs.tsx` and
 * `speciesClinical.tsx` each set out and is repeated because it is load-bearing. Every series
 * API in the product is keyed `(slug, siteKey)` — `series`, `daily`, `pointsOf`, `trend` — and
 * none of them takes a species, so there is no per-species curve anywhere in `core/`.
 * `tally(slug, site, win, 'species')` groups BY species and cannot be narrowed TO one;
 * `tallyFacet` has no species dimension at all. `pageWhere` can filter to a species but caps its
 * scan at 40,000 rows and reports its total as a floor when it hits the cap — the births flow
 * holds 64,083, so an all-time window would silently stop early. This visits every row of the
 * flow exactly once, so the total, the vocabulary, the site rows, the trend, the month profile
 * and the age values are the same integer counted six ways and cannot contradict each other on
 * screen.
 *
 * ONE WALK RATHER THAN SIX. Overview needs a trend and a cause vocabulary; Circle of Life needs
 * both of those plus two facets, a month profile and a measured column. Asking for them
 * separately would mean six passes over 102,469 rows per render and six chances for two cards to
 * report the same flow differently. What a caller does not ask for is not built: with `max` at
 * zero no bucket index is allocated, and `numbers` stays empty unless a column is named.
 *
 * `i` IS NOT COUNTED HERE, and that is the difference from the walks that page records. This one
 * never opens an individual event, so it needs no per-day row index — the flows it reads are
 * summarised, and the record lists on this page are the animal register rather than the event
 * ledger.
 */
function walkSpeciesFlow(
  slug: string,
  name: string,
  siteKey: string | null,
  win: Win,
  opts: WalkOpts = {},
): SpeciesFlow {
  const f = flowOf(slug)
  if (!f) return EMPTY_FLOW

  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)
  const facets = opts.facets ?? []

  /* The bucket boundaries come from `buckets(win, max)` — the same spans `plot.ts` hands every
     other time mark — and the day-to-bucket lookup is built from those spans rather than by
     re-deriving the arithmetic, so a column's label is the span its value was summed over. */
  const spans = opts.max ? buckets(win, opts.max) : []
  const values = new Array<number>(spans.length).fill(0)
  const span = Math.max(0, win.to - win.from + 1)
  const bucketOfDay = spans.length ? new Int32Array(span).fill(-1) : undefined
  if (bucketOfDay) {
    spans.forEach((s, b) => {
      for (let d = s.from; d <= s.to; d++) {
        const k = d - win.from
        if (k >= 0 && k < span) bucketOfDay[k] = b
      }
    })
  }

  const byDetail = new Map<string, number>()
  /* Asserted rather than inferred: `map` widens the pair to an array of a union, which the `Map`
     constructor will not accept as entries. */
  const byFacet = new Map<string, Map<string, number>>(
    facets.map((n) => [n, new Map<string, number>()] as [string, Map<string, number>]),
  )
  const bySite = new Map<string, number>()
  const months = new Array<number>(12).fill(0)
  const numbers: number[] = []
  const numberSpec = opts.number ? f.numbers.get(opts.number) : undefined
  const datedSpec = opts.datedBy ? f.facets.get(opts.datedBy.facet) : undefined
  let dated = 0
  let total = 0

  for (const key of Object.keys(f.slices)) {
    if (siteKey && key !== siteKey) continue
    const slice: [number, number] = f.slices[key]
    const start = slice[0]
    const end = start + slice[1]

    for (let r = start; r < end; r++) {
      const d = f.day[r]
      if (d < from || d > to) continue
      const spx = f.species[r]
      if (spx === UNRESOLVED || SPECIES[spx]?.name !== name) continue

      total++
      bySite.set(key, (bySite.get(key) ?? 0) + 1)

      const label = f.details[f.detail[r]] ?? 'Not recorded'
      byDetail.set(label, (byDetail.get(label) ?? 0) + 1)

      for (const fname of facets) {
        const spec = f.facets.get(fname)
        if (!spec) continue
        const v = spec.values[spec.col[r]] ?? 'Not recorded'
        byFacet.get(fname)?.set(v, (byFacet.get(fname)?.get(v) ?? 0) + 1)
      }

      if (bucketOfDay) {
        const b = bucketOfDay[d - win.from]
        if (b >= 0) values[b]++
      }

      if (opts.months) {
        const keep = !opts.datedBy || (datedSpec && datedSpec.values[datedSpec.col[r]] === opts.datedBy.value)
        if (keep) {
          months[dateAt(d).getMonth()]++
          dated++
        }
      }

      if (numberSpec) {
        const v = numberSpec.col[r]
        /* THE SENTINEL NEVER ENTERS THE ARRAY. 65535 marks a death whose record carries no birth
           date; averaged in it would report a median age of 65,535 days, and coerced to zero it
           would report a collection that dies on the day it is born — which is indistinguishable
           from the real and frequent zero-day age this column holds. */
        if (v !== numberSpec.sentinel) numbers.push(v)
      }
    }
  }

  const rank = (m: Map<string, number>) =>
    [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

  return {
    total,
    detail: rank(byDetail),
    facet: Object.fromEntries([...byFacet.entries()].map(([n, m]) => [n, rank(m)] as const)),
    sites: [...bySite.entries()]
      .map(([k, value]) => ({ siteKey: k, siteName: siteOf(k)?.name ?? k, value }))
      .sort((a, b) => b.value - a.value),
    points: spans.map((s, b) => ({
      label: s.from >= s.to ? shortDate(s.from) : `${shortDate(s.from)} – ${shortDate(Math.min(TODAY, s.to))}`,
      value: values[b],
      from: s.from,
      to: s.to,
    })),
    months,
    dated,
    numbers,
  }
}

/* ── reading a set of ages ───────────────────────────────────────────────── */

/**
 * A quantile of an already-sorted array, by position rather than by interpolation.
 *
 * NOT A MEAN, ANYWHERE ON THIS PAGE. 6,460 of the 8,114 usable ages at death are under a year
 * and the tail runs past sixty years, so a mean describes no animal in the set. A position in
 * the sorted values is a real animal's age, which is the only figure this distribution can
 * honestly report.
 */

const quantile = (sorted: number[], q: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))]

/**
 * An age in days, said in the unit a reader of that age would use.
 *
 * Days below three months, months below two years, years above — because "1,461 d" and "4.0 y"
 * are the same fact and only one of them is legible, while "0.02 y" for a two-week-old chick is
 * neither legible nor true to what was recorded.
 */
function ageWords(days: number): string {
  if (days < 90) return `${fmt(days)} d`
  if (days < 730) return `${Math.round(days / 30.44)} mo`
  return `${(days / 365.25).toFixed(1)} y`
}


/* ── the Red List badge ──────────────────────────────────────────────────── */

/**
 * The published Red List badge for a status string, or nothing.
 *
 * MOVED HERE FROM `entity.tsx` WITH THE OVERVIEW TAB IT BELONGS TO, unchanged. `standingOf`
 * returns the verbatim published label — "Least Concern (Low Risk)" — while `profiles.json`
 * carries the bare code, so the code is matched first and the name second; matching only the
 * name drew no badge at all on this tab, which is the defect the two-step lookup fixed. A
 * species the list has not assessed gets NO badge, because a neutral chip beside "Not Evaluated"
 * reads as a category that was assigned.
 */
const sitesWord = (n: number): string | undefined => (n === 0 ? undefined : n === 1 ? '1 site' : `${n} sites`)

/** The index of the tallest column, so a pooled month chart names its own peak. */
const peakIndex = (values: number[]): number =>
  values.reduce((best, v, i) => (v > values[best] ? i : best), 0)

/* ── breeding readiness, at the grain the register can actually count ────── */

/**
 * The four buckets, declared as data rather than as four render blocks.
 *
 * EVERY VALUE OF `Composition` APPEARS BELOW EXACTLY ONCE, so an enclosure cannot land in two
 * buckets or in none — the defect a chain of if-statements invites, and the same guarantee
 * `speciesPairing.tsx` gives its three bands. A ninth value added to the type and not to this
 * table surfaces as buckets that do not sum to the enclosure count, which is visible, rather
 * than as rows that quietly disappear.
 *
 * THE FOURTH BUCKET IS THE ONE DIFFERENCE FROM THE PAIRING TAB, and the page says so out loud
 * beneath it. Pairing folds "Partly unsexed" into "Needs sexing" because its question is which
 * enclosures need a keeper's attention; here it is separated, because an enclosure holding both
 * sexes AND unsexed animals is a different breeding position from one holding nothing but
 * unsexed animals. The two tabs partition the same enclosures and their totals agree; only the
 * cut differs, and a reader who compares them is told which.
 *
 * "CAN BREED" IS NOT ONE OF THE FOUR. Readiness is a claim about maturity, and maturity needs an
 * age and a threshold: `born` is absent on 89,579 of 110,005 register rows and
 * `maturity_age_years` exists for 775 of 2,447 profiles. `core/animals.ts` already refuses the
 * word — its first composition is "Both sexes", not "Breeding ready" — and this table carries
 * that refusal up rather than re-asserting the claim at page level.
 */
const READINESS: { key: string; label: string; of: Composition[] }[] = [
  { key: 'both', label: 'Both sexes present', of: ['Both sexes'] },
  { key: 'mixed', label: 'Mixed — both sexes and unsexed', of: ['Partly unsexed'] },
  { key: 'sexing', label: 'Needs sexing', of: ['All unsexed', 'Lone unsexed'] },
  { key: 'single', label: 'Single sex', of: ['All male', 'All female', 'Lone male', 'Lone female'] },
]


/* ── the Overview's own compositions ─────────────────────────────────────── */

/**
 * An independent analytical container — a headline count, where it happened, a mark, a caption.
 *
 * BIRTHS AND DEATHS GET ONE EACH, AND THAT IS THE POINT. They were two halves of a single
 * "Recorded flows" card, which put one border around two opposite facts and made the reader
 * work out which caption belonged to which chart. They are separate events, separately dated,
 * with different caveats — the births date is a fallback on 61% of rows and the deaths date is
 * not — so they are separate containers with the same weight, side by side where there is room.
 */
function FlowPanel({
  label,
  value,
  where,
  tone,
  children,
  caption,
}: {
  label: string
  value: number
  /** Absent where nothing was recorded — `sitesWord` returns nothing for zero rather than
   *  "0 sites", which would read as a place that recorded none. */
  where?: string
  tone?: 'bad'
  children: React.ReactNode
  caption: React.ReactNode
}) {
  return (
    <section
      className="flex flex-col rounded-[var(--radius-card)] border bg-white p-[var(--pad-card)]"
      style={{ borderColor: HAIR }}
    >
      <p className="text-small font-semibold" style={{ color: INK }}>
        {label}
      </p>
      {/* THE ONLY LARGE NUMBER IN THE CONTAINER. Everything under it is a breakdown of this
          figure, so nothing else in the panel competes with it for the first read. */}
      <p
        className="mt-1 font-display text-[34px] leading-none font-semibold tabular-nums"
        style={{ color: tone === 'bad' ? TONE.bad : VALUE }}
      >
        {fmt(value)}
      </p>
      {where && (
        <p className="mt-1 text-caption" style={{ color: FAINT }}>
          {where}
        </p>
      )}
      <div className="mt-5 flex-1">{children}</div>
      <Caption>{caption}</Caption>
    </section>
  )
}

/**
 * Four figures side by side, aligned so they can be compared rather than read one at a time.
 *
 * NOT A 2x2 OF CARDS. These are four cuts of ONE set of enclosures and they sum to it, so a
 * border between them would say they were four separate findings. Each block carries its own
 * share bar against the same denominator, which is what makes "which of these dominates"
 * answerable at a glance.
 */
function Compare({ items, total }: { items: { label: string; value: number; note?: string }[]; total: number }) {
  const accent = useAccent()
  const present = items.filter((i) => i.value > 0)
  if (!present.length || total <= 0) return null
  return (
    <div className="grid gap-x-8 gap-y-6 @[560px]:grid-cols-2 @[900px]:grid-cols-4">
      {present.map((i) => (
        <div key={i.label} className="min-w-0">
          <p className="truncate text-caption" style={{ color: FAINT }} title={i.label}>
            {i.label}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-[26px] leading-none font-semibold tabular-nums" style={{ color: VALUE }}>
              {fmt(i.value)}
            </span>
            <span className="text-caption tabular-nums" style={{ color: FAINT }}>
              {Math.round((i.value / total) * 100)}%
            </span>
          </p>
          <span className="mt-2.5 block h-[5px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
            <span
              className="block h-full rounded-full"
              style={{ width: `${(i.value / total) * 100}%`, backgroundColor: accent }}
            />
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * A proportional ranking — name, bar, count, share — rather than a table.
 *
 * A TABLE ANSWERS "WHAT IS THE FIGURE FOR X"; THIS ANSWERS "HOW IS IT DISTRIBUTED". The site
 * list is read for the shape of the distribution — one site holding 84% is the finding — and a
 * column of right-aligned numbers makes that shape something the reader has to reconstruct. The
 * bar is scaled to the LARGEST SITE rather than to the total, so the second site is read
 * against the first, which is the comparison actually being made.
 */
function Ranking<T>({
  rows,
  labelOf,
  valueOf,
  keyOf,
  total,
  onOpen,
}: {
  rows: T[]
  labelOf: (r: T) => string
  valueOf: (r: T) => number
  keyOf: (r: T) => string
  total: number
  onOpen?: (r: T) => void
}) {
  const accent = useAccent()
  if (!rows.length) return null
  const top = Math.max(...rows.map(valueOf), 1)
  return (
    <ul className="flex flex-col">
      {rows.map((r) => {
        const v = valueOf(r)
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-small" style={{ color: INK }}>
                {labelOf(r)}
              </span>
              <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
                {fmt(v)}
                <span className="ml-2 text-caption font-normal" style={{ color: FAINT }}>
                  {total > 0 ? `${Math.round((v / total) * 100)}%` : ''}
                </span>
              </span>
            </span>
            <span className="mt-1.5 block h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
              <span className="block h-full rounded-full" style={{ width: `${(v / top) * 100}%`, backgroundColor: accent }} />
            </span>
          </>
        )
        return (
          <li key={keyOf(r)} className="py-2.5">
            {onOpen ? (
              <button type="button" onClick={() => onOpen(r)} className="card-press -mx-2 block w-full rounded-[10px] px-2 text-left">
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Published standing as one metadata strip rather than five rows in a card.
 *
 * These are five short labels a reader scans rather than reads, and stacking them as full-width
 * label/value rows gave each one the height of a finding. Across, separated by space, they read
 * as what they are: the animal's paperwork.
 */
function MetaStrip({ items }: { items: { label: string; value: string; lead?: React.ReactNode }[] }) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-5">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <p className="text-caption" style={{ color: FAINT }}>
            {i.label}
          </p>
          <p className="mt-1 flex items-center gap-2 text-small font-medium" style={{ color: INK }}>
            {i.lead}
            <span className="truncate">{i.value}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

/* ── the Overview tab ────────────────────────────────────────────────────── */

/**
 * WHAT IS THIS SPECIES AND HOW IS IT DOING — the dashboard, at five decreasing altitudes.
 *
 * The order is the order the questions are asked in: what moved (two trends), what we hold
 * (composition), what that holding permits (readiness), what took them (causes), and where they
 * are (sites). Nothing here is a card, so the tab reads as one page with five sections rather
 * than as five boxes competing for the eye.
 *
 * TWO LISTS OF SITES ON ONE TAB, AND EACH SAYS WHICH QUESTION IT ANSWERS. Ochre Warbler is HELD
 * at 7 sites, but recorded births at 8 and deaths at 8 — Foxglen Biopark holds none today and
 * recorded 59 births and 55 deaths. Population-by-site is the register now; a flow's site split
 * is history. Two lists of different lengths read as a bug unless the page names the difference,
 * so it does.
 */
export function SpeciesOverviewTab({
  speciesId,
  name,
}: {
  speciesId: string
  name: string
  profile?: SpeciesProfile
}) {
  const { scope } = useScope()
  const { drillTo } = useDrill()
  const accent = useAccent()
  const siteKey = scope.site?.key ?? null

  const sp = speciesOf(speciesId)
  const wide = useMemo(() => speciesWideAt(speciesId, scope.win, siteKey), [speciesId, scope.win, siteKey])
  const standing = useMemo(() => standingOf(name), [name])

  const births = useMemo(
    () => walkSpeciesFlow('births', name, siteKey, scope.win, { max: 30 }),
    [name, siteKey, scope.win],
  )
  const deaths = useMemo(
    () => walkSpeciesFlow('mortality', name, siteKey, scope.win, { max: 30 }),
    [name, siteKey, scope.win],
  )

  /**
   * Every enclosure holding this name, bucketed by what its composition permits.
   *
   * COUNTED FROM THE REGISTER AND UNSCALED, which is why it carries no window. `animals.bin` is
   * a snapshot of who is housed where on the extract's last day and holds no enclosure-move
   * history, so there is no honest answer to "which enclosures held both sexes last March". The
   * caption says so rather than letting the date pill above imply an answer.
   */
  const readiness = useMemo(() => {
    if (!wide) return { rows: [] as [string, number][], enclosures: 0 }
    const counts = new Map<Composition, number>()
    let enclosures = 0
    for (const s of wide.sites) {
      for (const h of holdingsByEnclosure(s.species.id)) {
        if (h.siteKey !== s.siteKey || h.total === 0) continue
        enclosures++
        const c = compositionOf(h)
        counts.set(c, (counts.get(c) ?? 0) + 1)
      }
    }
    const rows = READINESS.map(
      (b) => [b.label, b.of.reduce((n, c) => n + (counts.get(c) ?? 0), 0)] as [string, number],
    ).filter(([, n]) => n > 0)
    return { rows, enclosures }
  }, [wide])

  /* The share of the death vocabulary that is a non-answer. Measured on the warbler this is 131
     of 278 — so a card that ranked causes without saying so would name "Undetermined" as the
     species' leading cause of death. Counted from the same rows the ranking draws. */
  const unknownCause = deaths.detail
    .filter((d) => d.label === 'Undetermined' || d.label === 'Indeterminate' || d.label === 'Not recorded')
    .reduce((n, d) => n + d.value, 0)


  return (
    <TabBody>
      <Sheet>
      {/* TWO CONTAINERS, NOT ONE CARD WITH TWO HALVES. Births and deaths are opposite facts
          with different provenance — the births date falls back to the day the record was added
          on 61% of rows and the deaths date does not — so one border around both put the reader
          in charge of working out which caveat belonged to which chart. Equal weight, side by
          side where there is room, stacked where there is not. */}
      <div className="grid gap-[var(--gap)] @[720px]:grid-cols-2">
        <FlowPanel
          label="Births recorded"
          value={births.total}
          where={sitesWord(births.sites.length)}
          caption={
            <>
              Dated by the record's own birth date where it has one and by the day it was added
              otherwise — 39,170 of 64,083 compiled births take the fallback, so this is when young
              were <em>recorded</em> rather than when they were born.
            </>
          }
        >
          <EventTrend headless points={births.points} unit="births" empty={`No births recorded in ${scope.win.window}.`} />
        </FlowPanel>

        <FlowPanel
          label="Deaths recorded"
          value={deaths.total}
          where={sitesWord(deaths.sites.length)}
          tone="bad"
          caption={<>Deaths carry a real event date on 38,680 of 38,684 source rows and need no such caveat.</>}
        >
          <EventTrend
            headless
            points={deaths.points}
            unit="deaths"
            tone="bad"
            empty={`No deaths recorded in ${scope.win.window}.`}
          />
        </FlowPanel>
      </div>

      {wide && wide.total > 0 && (
        <Band flat title="Sex" aside="counted from the register" icon={Layers}>
          <SplitLayout
            visual={
              <Ring
                percent={wide.sexedPct}
                label="Sexed"
                value={fmt(wide.male + wide.female)}
                of={fmt(wide.total)}
              />
            }
          >
            <CoverageMeter
              segments={[
                { label: 'Undetermined', value: wide.undetermined, fill: mix(accent, step(0)) },
                { label: 'Male', value: wide.male, fill: mix(accent, step(1)) },
                { label: 'Female', value: wide.female, fill: mix(accent, step(2)) },
              ]}
              total={wide.total}
            />
            <Caption>
              Undetermined is an answer a keeper recorded in <code>housing.gender</code>, not a gap
              in the file, so it is shown as its own share rather than folded away — for many
              species it is the large majority of the holding. On a past window the split is the
              register's present ratio apportioned to the reconstructed headcount:{' '}
              <code>animals.bin</code> is a snapshot and carries no sex history.
            </Caption>
          </SplitLayout>
        </Band>
      )}

      {readiness.enclosures > 0 && (
        <Band
          flat
          title="Breeding readiness"
          aside={`${fmt(readiness.enclosures)} enclosures`}
          icon={HeartPulse}
        >
          <Compare items={readiness.rows.map(([label, value]) => ({ label, value }))} total={readiness.enclosures} />
          <Caption>
            Counted per enclosure from the register as at the extract's last day, so it does not
            move with the date filter. No bucket says "can breed": that is a claim about maturity,
            and a birth date is absent on 81% of the register while a maturity age exists for 775
            of 2,447 species. The Pairing tab bands the same enclosures into three by folding
            "Mixed" into "Needs sexing" — the same enclosures, a different cut, and the totals
            agree.
          </Caption>
        </Band>
      )}

      {deaths.total > 0 && (
        <Band
          flat
          title="Causes of death"
          aside={`${fmt(deaths.total)} deaths · ${scope.win.window}`}
          icon={Skull}
          note={
            unknownCause > 0
              ? `${fmt(unknownCause)} of ${fmt(deaths.total)} are recorded as undetermined or indeterminate, so the ranking below describes the deaths that carry a manner.`
              : undefined
          }
        >
          <RankedBars
            items={deaths.detail.map((d) => [d.label, d.value] as [string, number])}
            unit="deaths"
            total={deaths.total}
          />
          <Caption>
            The vocabulary is the source's verbatim, including its own spelling and one row whose
            manner arrived as an escaped HTML fragment. It is rendered as read rather than
            normalised into a tidier set that no record actually says.
          </Caption>
        </Band>
      )}

      {wide && wide.sites.length > 0 && (
        <Band
          flat
          title="Population by site"
          aside={`${fmt(wide.total)} held`}
          icon={MapPin}
          note="Where this species is now. A site that recorded births or deaths but holds none today does not appear here — that history is in the flows above."
        >
          <Ranking
            rows={wide.sites}
            keyOf={(r) => r.siteKey}
            labelOf={(r) => r.siteName}
            valueOf={(r) => r.count}
            total={wide.total}
            onOpen={(r) => drillTo({ kind: 'site', id: r.siteKey })}
          />
        </Band>
      )}

      <Band flat title="Standing" aside="published" icon={ShieldCheck}>
        <MetaStrip
          items={[
            { label: 'Class', value: sp?.cls ?? '—' },
            { label: 'Site', value: siteOf(sp?.siteKey ?? '')?.name ?? '—' },
            /* THE BADGE IS THE CATEGORY. The Red List publishes LC, NT, EN and the rest as a
               coloured scale, and rendering the code as plain text throws away the one part of
               it a reader recognises without reading. */
            { label: 'IUCN Red List', value: standing?.iucn ?? '—', lead: iucnBadge(standing?.iucn) ?? undefined },
            { label: 'CITES', value: standing?.cites ? `Appendix ${standing.cites}` : 'Not listed' },
            /* The schema carries no Wildlife Protection Act column, so this says so rather than
               printing a zero or an unearned "Not scheduled". */
            { label: 'WPA schedule', value: standing?.schedule ? `Schedule ${standing.schedule}` : 'Not recorded' },
          ]}
        />
      </Band>
      </Sheet>
    </TabBody>
  )
}

/* ── the Circle of Life tab ──────────────────────────────────────────────── */

/**
 * HOW THIS SPECIES' POPULATION MOVED, AND WHAT THE MOVEMENT WAS MADE OF.
 *
 * AN ARGUMENT, NOT A DASHBOARD, and that is why there is not one container on it. It opens with
 * the ledger — opening balance, the flows, closing balance, and the part the events do not
 * explain — and then takes the two flows apart in the same order every time: over time, over the
 * year, by sex, by age, by cause. A reader can start anywhere and still know which of the two
 * flows they are looking at, because births are always on the left.
 *
 * THE BRIDGE AND ITS RECONCILIATION ARE UNCHANGED. `speciesLifecycle` reads the species' own
 * site, and the difference between the register's net movement and the recorded flows is stated
 * rather than reconciled away — the extract's events do not fully account for every change in
 * the register, and saying so is the honest form. That arithmetic is load-bearing and is carried
 * here exactly as it was written.
 *
 * EVERY DENOMINATOR ON THIS TAB IS THIS SPECIES' OWN. Age at death is drawn over the deaths that
 * carry a birth date — 67 of the warbler's 278, 146 of the langur's 430 — and never over the
 * collection's 8,114 of 38,386. A card that borrowed the collection's coverage would state a
 * completeness this species does not have.
 */
export function SpeciesLifeTab({
  speciesId,
  name,
  profile,
}: {
  speciesId: string
  name: string
  profile?: SpeciesProfile
}) {
  const { scope } = useScope()
  const accent = useAccent()
  const siteKey = scope.site?.key ?? null

  const life = useMemo(() => speciesLifecycle(speciesId, scope.win), [speciesId, scope.win])
  const wide = useMemo(() => speciesWideAt(speciesId, scope.win, siteKey), [speciesId, scope.win, siteKey])
  /* Which site's register the bridge above actually reads. Named on screen rather than left to be
     inferred: `speciesLifecycle` is scoped to the population in the route while everything under
     it is cross-site, and two "Deaths" figures differing by one is a bug to a reader who has not
     been told they are answers to two different questions. */
  const bridgeSite = siteOf(speciesOf(speciesId)?.siteKey ?? '')?.name

  const births = useMemo(
    () =>
      walkSpeciesFlow('births', name, siteKey, scope.win, {
        max: 30,
        facets: ['sex'],
        months: true,
        datedBy: { facet: 'dating', value: 'Birth date' },
      }),
    [name, siteKey, scope.win],
  )
  const deaths = useMemo(
    () =>
      walkSpeciesFlow('mortality', name, siteKey, scope.win, {
        max: 30,
        facets: ['sex'],
        months: true,
        number: 'age',
      }),
    [name, siteKey, scope.win],
  )

  const ages = useMemo(() => [...deaths.numbers].sort((a, b) => a - b), [deaths.numbers])
  const bands = useMemo(() => ageBandsOf(ages), [ages])
  const notes = data().meta.notes

  /* The recorded flows and the two level readings are separate statements about the same window,
     and they are allowed to disagree — the extract's events do not fully account for every change
     in the register. Stating both, and naming the gap where there is one, is the honest form;
     reconciling them silently would be the invented figure. */
  const recorded = life ? life.additions - life.removals : 0
  const unexplained = life ? life.net - recorded : 0

  /** One row per site that either holds this species or ever recorded a flow for it. */
  interface LedgerRow {
    siteKey: string
    siteName: string
    births: number
    deaths: number
    held: number
  }
  const ledger = useMemo<LedgerRow[]>(() => {
    const rows = new Map<string, LedgerRow>()
    const touch = (key: string, siteName: string) => {
      let row = rows.get(key)
      if (!row) rows.set(key, (row = { siteKey: key, siteName, births: 0, deaths: 0, held: 0 }))
      return row
    }
    for (const s of births.sites) touch(s.siteKey, s.siteName).births = s.value
    for (const s of deaths.sites) touch(s.siteKey, s.siteName).deaths = s.value
    for (const s of wide?.sites ?? []) touch(s.siteKey, s.siteName).held = s.count
    return [...rows.values()].sort((a, b) => b.births + b.deaths + b.held - (a.births + a.deaths + a.held))
  }, [births.sites, deaths.sites, wide])

  const ledgerColumns: Column<LedgerRow>[] = [
    { key: 'site', head: 'Site', priority: 3, cell: (r) => r.siteName },
    { key: 'births', head: 'Births', align: 'right', priority: 2, cell: (r) => (r.births ? fmt(r.births) : '') },
    { key: 'deaths', head: 'Deaths', align: 'right', priority: 2, cell: (r) => (r.deaths ? fmt(r.deaths) : '') },
    { key: 'held', head: 'Held now', align: 'right', priority: 1, cell: (r) => (r.held ? fmt(r.held) : '') },
  ]

  const sexSegments = (rows: { label: string; value: number }[]) =>
    rows.map((r, i) => ({ label: r.label, value: r.value, fill: mix(accent, step(i)) }))

  return (
    <TabBody>
      <Sheet>
      {life && (
        <Band flat title="Circle of Life" aside={scope.win.window} icon={Sparkles} first>
          <FlowSplit
            inward={{ label: 'Entered', value: life.additions, icon: Baby }}
            outward={{ label: 'Left', value: life.removals, icon: ArrowLeftRight }}
            net={recorded}
            routes={life.stages
              .filter((s) => s.side !== 'stock')
              .map((s) => ({
                key: s.key,
                label: s.label,
                value: s.value,
                direction: s.side === 'in' ? ('in' as const) : ('out' as const),
              }))}
            unit="animals"
          />
          {life.silent.length > 0 && (
            <p className="mt-3 text-caption" style={{ color: FAINT }}>
              No {life.silent.map((s) => s.toLowerCase()).join(', ')} recorded in {scope.win.window}.
            </p>
          )}
          {bridgeSite && (wide?.sites.length ?? 0) > 1 && (
            <Caption>
              This ladder reads one site — {bridgeSite}. An opening and a closing balance belong
              to a register and a register belongs to a site, so the bridge is the population this
              page's route names. Every mark below it reads every site holding the name, which is
              why a flow here and the same flow below can differ by whatever the other sites
              recorded.
            </Caption>
          )}
        </Band>
      )}

      {life && (
        <Band flat title="Population change" aside={scope.win.window} icon={Activity}>
          <Facts
            items={[
              { label: 'Opening', value: fmt(life.opening), sub: 'the day before the window' },
              { label: 'Closing', value: fmt(life.closing), sub: 'as of the window’s last day' },
              {
                label: 'Change',
                value: `${life.net > 0 ? '+' : ''}${fmt(life.net)}`,
                tone: life.net === 0 ? 'neutral' : life.net > 0 ? 'good' : 'bad',
              },
              ...(unexplained !== 0
                ? [
                    {
                      label: 'Not explained by events',
                      value: `${unexplained > 0 ? '+' : ''}${fmt(unexplained)}`,
                      sub: 'the register moved by more than the recorded flows',
                    },
                  ]
                : []),
              ...(life.fetal > 0
                ? [
                    {
                      label: 'Fetal loss',
                      value: fmt(life.fetal),
                      sub: 'a breeding figure, not a headcount movement',
                    },
                  ]
                : []),
            ]}
          />
        </Band>
      )}

      <Band flat title="Over time" aside={scope.win.window} icon={Activity}>
        <Pairs>
          <div>
            <MarkHead label="Births" aside={births.total ? fmt(births.total) : undefined} />
            <EventTrend points={births.points} unit="births" empty={`No births recorded in ${scope.win.window}.`} />
          </div>
          <div>
            <MarkHead label="Deaths" aside={deaths.total ? fmt(deaths.total) : undefined} />
            <EventTrend
              points={deaths.points}
              unit="deaths"
              tone="bad"
              empty={`No deaths recorded in ${scope.win.window}.`}
            />
          </div>
        </Pairs>
      </Band>

      {(births.dated > 0 || deaths.total > 0) && (
        <Band flat title="Across the year" aside="pooled over the window's years" icon={CalendarRange}>
          <Pairs>
            {births.dated > 0 ? (
              <div>
                <MarkHead label="Breeding" aside={`${fmt(births.dated)} of ${fmt(births.total)} dated`} />
                <Columns
                  values={births.months}
                  labels={MONTHS}
                  highlight={peakIndex(births.months)}
                  /* The excluded rows are named only where there are any: "the other 0 are
                     dated by the day they were added" is a caveat about nothing, and a caveat
                     about nothing teaches a reader to skip the ones that matter. */
                  unit={
                    births.total > births.dated
                      ? `births whose record carries a real birth date — the other ${fmt(
                          births.total - births.dated,
                        )} are dated by the day the record was added and are left out of this chart`
                      : 'births, by the month the record says they were born in'
                  }
                />
              </div>
            ) : (
              births.total > 0 && (
                <p className="text-small" style={{ color: FAINT }}>
                  None of this species' {fmt(births.total)} recorded births carries a real birth
                  date, so no breeding season can be read. The rest are dated by the day the record
                  was created, which is a data-entry calendar.
                </p>
              )
            )}
            {deaths.total > 0 && (
              <div>
                <MarkHead label="Mortality" aside={`${fmt(deaths.total)} deaths`} />
                <Columns
                  values={deaths.months}
                  labels={MONTHS}
                  highlight={peakIndex(deaths.months)}
                  unit="deaths, by the month they were recorded in"
                />
              </div>
            )}
          </Pairs>
        </Band>
      )}

      {(births.facet.sex?.length || deaths.facet.sex?.length) && (
        <Band flat title="By sex" aside={scope.win.window} icon={Layers}>
          <Pairs>
            {births.facet.sex?.length > 0 && (
              <div>
                <MarkHead label="Sex at birth" aside={`${fmt(births.total)} births`} />
                <CoverageMeter segments={sexSegments(births.facet.sex)} total={births.total} />
              </div>
            )}
            {deaths.facet.sex?.length > 0 && (
              <div>
                <MarkHead label="Sex at death" aside={`${fmt(deaths.total)} deaths`} />
                <CoverageMeter segments={sexSegments(deaths.facet.sex)} total={deaths.total} />
              </div>
            )}
          </Pairs>
          <Caption>
            Undetermined and indeterminate are values a keeper entered, not gaps in the file.
            Collection-wide a birth is sexed male or female on 27,923 of 64,083 records and a
            death on 13,009 of 38,386, so a male-to-female reading taken off either bar is a
            reading of the sexed minority.
          </Caption>
        </Band>
      )}

      {ages.length > 0 && (
        <Band
          flat
          title="Age at death"
          aside={`${fmt(ages.length)} of ${fmt(deaths.total)} deaths carry an age`}
          icon={Skull}
        >
          <MetricStrip
            items={[
              { label: 'Median', value: ageWords(quantile(ages, 0.5)), sub: 'half died younger' },
              { label: '90th percentile', value: ageWords(quantile(ages, 0.9)) },
              { label: 'Oldest', value: ageWords(ages[ages.length - 1]) },
              {
                label: 'With an age',
                value: fmt(ages.length),
                sub: `of ${fmt(deaths.total)} deaths`,
              },
            ]}
          />
          <div className="mt-6">
            <MarkHead label="Distribution" aside={`${fmt(ages.length)} deaths`} />
            <RankedBars items={bands} unit="deaths" max={7} total={ages.length} />
          </div>
          <Caption>
            The bands are the extract's own, finer at the young end because the data is: 6,460 of
            the collection's 8,114 usable ages are under a year, and even bands would draw one bar
            and call it a shape.
          </Caption>
        </Band>
      )}

      {deaths.detail.length > 0 && (
        <Band flat title="Cause of death" aside={`${fmt(deaths.total)} deaths`} icon={Skull}>
          <RankedBars
            items={deaths.detail.map((d) => [d.label, d.value] as [string, number])}
            unit="deaths"
            total={deaths.total}
          />
        </Band>
      )}

      {(profile?.lifespan_years || profile?.longevity) && (
        <Band flat title="Longevity" aside="two different figures" icon={Heart}>
          <DefinitionList
            columns={2}
            items={[
              ...(profile.lifespan_years
                ? [
                    {
                      label: 'Reference lifespan of the species',
                      value: `${profile.lifespan_years} years`,
                    },
                  ]
                : []),
              ...(profile.longevity
                ? [
                    { label: 'Median age of the animals we hold', value: ageWords(profile.longevity.medianDays) },
                    { label: '90th percentile age held', value: ageWords(profile.longevity.p90Days) },
                    { label: 'Oldest animal held', value: ageWords(profile.longevity.maxDays) },
                    {
                      label: 'Held animals carrying a birth date',
                      value: `${fmt(profile.longevity.dated[0])} of ${fmt(profile.longevity.dated[1])}`,
                    },
                  ]
                : []),
            ]}
          />
          <Caption>
            A species that can live twenty years is not a species we have held one for twenty
            years. The reference figure is the animal's biology; the rest is an observation of our
            own register as at 20 May 2026, over the minority of animals whose record carries a
            birth date.
          </Caption>
        </Band>
      )}

      {ledger.length > 0 && (
        <Band
          flat
          title="Recorded by site"
          aside={scope.win.window}
          icon={MapPin}
          note="Births and deaths are the window's events; held is the register today. A site can appear with flows and no holding, or a holding and no flows, and both are true."
        >
          <DataTable rows={ledger} columns={ledgerColumns} keyOf={(r) => r.siteKey} />
          {profile?.lifespan_years && (
            <Caption>
              Reference lifespan · {profile.lifespan_years} years — a property of the species, so it
              is stated once rather than repeated down every row.
            </Caption>
          )}
        </Band>
      )}

      <NotePanel title="What this tab cannot say">
        <p>{notes.ageAtDeath}</p>
        <p className="mt-2">{notes.birthDating}</p>
      </NotePanel>
      </Sheet>
    </TabBody>
  )
}

/* ── the Animals tab ─────────────────────────────────────────────────────── */

/**
 * WHICH ANIMALS THESE ARE — one table, and deliberately nothing else.
 *
 * A DATA WORKSPACE IS NOT A DASHBOARD. This tab exists to be scanned and clicked, so every pixel
 * that is not a row is in the way: no figures above it, no marks beside it, and the only
 * furniture is the count in the band's aside and the "show more" beneath it. On a phone the same
 * rows stack instead of shrinking six columns into 390px — one definition, two forms, and they
 * cannot drift.
 *
 * THE PAGING AND THE DESTINATION ARE UNCHANGED. `animalsOfSpecies` pages the register span of
 * the population in the route — twenty at a time, the total from the span itself rather than
 * from a scan — and a row opens that animal's own page. Age renders as an empty cell rather than
 * an em dash where the record carries no birth date, because a dash in a numeric column reads as
 * a value that was measured and found to be nothing.
 */
export function SpeciesAnimalsTab({
  speciesId,
  name,
}: {
  speciesId: string
  name: string
  profile?: SpeciesProfile
}) {
  const { scope, go } = useScope()

  const paged = usePaged<Animal>(
    (offset, limit) => {
      const p = animalsOfSpecies(speciesId, scope.win, offset, limit)
      return { rows: p.rows, total: p.total }
    },
    20,
    [speciesId, scope.win.to],
  )

  const columns: Column<Animal>[] = [
    { key: 'id', head: 'Animal', priority: 3, cell: (a) => a.callName ?? a.id },
    { key: 'sex', head: 'Sex', priority: 2, cell: (a) => ({ M: 'Male', F: 'Female', U: 'Unsexed' })[a.sex] },
    { key: 'age', head: 'Age', priority: 2, align: 'right', cell: (a) => (a.bornOn < 0 ? '' : a.age) },
    { key: 'enclosure', head: 'Enclosure', priority: 2, cell: (a) => a.enclosureId },
    { key: 'site', head: 'Site', priority: 1, cell: (a) => a.siteName },
    {
      key: 'status',
      head: 'Status',
      priority: 2,
      cell: (a) => (
        <span style={{ color: a.status === 'Under care' ? TONE.warn : TONE.good }}>{a.status}</span>
      ),
    },
  ]

  return (
    <TabBody>
      <Sheet>
      <Band flat title={name} aside={`${fmt(paged.total)} held`} icon={Boxes} first>
        <DataTable
          rows={paged.rows}
          columns={columns}
          keyOf={(a) => a.id}
          onOpen={(a) => go(`e/animal/${a.id}`)}
          empty={
            <p className="py-2 text-small" style={{ color: FAINT }}>
              No animals of this species are held in {scope.win.window}.
            </p>
          }
        />
        <MoreRows page={paged} noun="animals" />
        <Caption>
          Age is shown for the animals whose record carries a usable birth date; most do not, and
          an empty cell says so rather than printing a dash that looks like a measurement.
        </Caption>
      </Band>
      </Sheet>
    </TabBody>
  )
}
