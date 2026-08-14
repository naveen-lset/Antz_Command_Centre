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

import { useMemo, useState } from 'react'
import {
  Activity,
  Baby,
  Boxes,
  CalendarRange,
  Heart,
  Layers,
  ListTree,
  MapPin,
  PawPrint,
  Skull,
  type LucideIcon,
} from 'lucide-react'

import { TODAY, buckets, dateAt, longDate, resolveWindow, shortDate, type Win } from '../core/calendar'
import { UNRESOLVED, flowOf } from '../core/store'
import { SPECIES, siteOf, speciesOf } from '../core/world'
import {
  animalsOfSpecies,
  compositionOf,
  holdingsByEnclosure,
  type Animal,
  type Composition,
} from '../core/animals'
import type { SpeciesProfile } from '../core/profiles'
import { EventTrend, type Pt } from '../exec/marks'
import { ACCENT_INK, Columns, DEEP, FAINT, HAIR, INK, RED_LIST, TONE, TONE_FILL, TRACK, VALUE, fmt } from '../exec/system'
import { standingOf } from './modules/regulatory'
import {
  Band,
  DataTable,
  MetricStrip,
  RankedBars,
  SegmentToggle,
  TabBody,
  type Column,
} from './speciesLayout'
import { DashCard, FactRows, KpiStrip, RankRows, SliceKey, Slices, YearBars, foldTail } from './dashboard'
import { speciesWideAt } from './speciesWide'
import { useDrill } from './drillNav'
import { FindField } from './filters'
import { useSheet } from './sheet'
import { HousingTable, type HCol } from './speciesHousing'
import { ageLabel, bandsOf, survivalOf } from './speciesLife'
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
  /**
   * One tally per CALENDAR YEAR the window covers, oldest first.
   *
   * Separate from `points` rather than a coarser setting of it. `points` divides the window into
   * `max` EQUAL spans, which is right for a curve and wrong for a year axis — under a 5½-year
   * window thirty equal buckets are ten-week blocks that straddle new year, so no column is a
   * year and the axis cannot be labelled with one. This counts the year off each row's own date.
   *
   * Only years that actually carry a row appear. A species first held in 2023 has no 2019 column
   * to print a zero into, and inventing the gap years would draw a flat run the register does not
   * have.
   */
  years: [number, number][]
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
  years: [],
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
  const byYear = new Map<number, number>()
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

      const yr = dateAt(d).getFullYear()
      byYear.set(yr, (byYear.get(yr) ?? 0) + 1)

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
    years: [...byYear.entries()].sort((a, b) => a[0] - b[0]),
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
  onTab,
}: {
  speciesId: string
  name: string
  profile?: SpeciesProfile
  /** Switch the page's tab — what the cards' "View …" actions do. */
  onTab?: (key: string) => void
}) {
  const { scope } = useScope()
  const { drillTo } = useDrill()
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
   * THE YEAR CHARTS READ ALL TIME, AND DELIBERATELY IGNORE THE DATE PILL.
   *
   * A year axis under a one-month window is a single column, which is not a chart — it is the
   * headline figure drawn twice, and it is what this tab showed on its first build: "This month"
   * is the default scope, so every species opened on one green bar labelled 2026.
   *
   * The pill still governs everything it can honestly govern — the two KPI figures beside these
   * charts are the scoped counts, and the card titles say which is which. What a year axis
   * answers is "how has this species done over its record", and that question has no scoped
   * form. The site half of the scope IS still applied: narrowing to a site recuts the years.
   */
  const allTime = useMemo(() => resolveWindow('all'), [])
  const birthYears = useMemo(
    () => walkSpeciesFlow('births', name, siteKey, allTime, {}).years,
    [name, siteKey, allTime],
  )
  const deathYears = useMemo(
    () => walkSpeciesFlow('mortality', name, siteKey, allTime, {}).years,
    [name, siteKey, allTime],
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

  /* ── what the dashboard is fed ──────────────────────────────────────────
     Every figure below is one of these five reads. Grouped here rather than computed inside
     the JSX so a card cannot quietly re-derive a number a neighbouring card already states. */
  const causesFlow = useMemo(
    () => walkSpeciesFlow('mortality', name, siteKey, allTime, {}),
    [name, siteKey, allTime],
  )
  const causes = foldTail(causesFlow.detail.filter((d) => d.value > 0))
  /* THE NON-ANSWER SHARE IS NO LONGER PRINTED AS A SUB-LINE. It is still SHOWN: the grey slice
     is reserved for absence across every chart on this page (`huesFor`), and the legend beneath
     carries its count — so the reader who wonders how much of the vocabulary is "Undetermined"
     reads it off the chart rather than off a caption under it. */
  const readyRows = readiness.rows.map(([label, value]) => ({ label, value }))
  const sexRows = wide
    ? [
        { label: 'Male', value: wide.male },
        { label: 'Female', value: wide.female },
        { label: 'Unsexed', value: wide.undetermined },
      ].filter((s) => s.value > 0)
    : []

  return (
    <TabBody>
      {/* A GRID OF CARDS, NOT ONE SHEET OF BANDS.
          This tab was seven hairline bands stacked inside a single surface, each closing with two
          or three lines of provenance prose. Everything it stated is still stated; what changed is
          that the reader is no longer asked to read the page to use it. The caveats are not
          deleted — they moved onto the `title` of the figure they qualify, one hover away, which
          is where a qualification belongs on a screen that is scanned rather than read. */}
      <div className="flex flex-col gap-[var(--space-4)]">

        <KpiStrip
          items={[
            /* FIVE READINGS, NO SUB-LINES. Each cell carried a second line qualifying it — the
               site count, the sexed denominator, the window under both flow figures — and five
               qualifications under five figures is a paragraph the reader has to clear before
               the numbers can be read across. The window is already stated by the pill that set
               it, and the denominators live on the cards below that draw them. */
            { label: 'Animals held', value: fmt(wide?.total ?? 0) },
            { label: 'Enclosures', value: fmt(readiness.enclosures) },
            { label: 'Sexed', value: wide ? `${Math.round(wide.sexedPct)}%` : '—' },
            { label: 'Births', value: fmt(births.total), tone: 'good' },
            { label: 'Deaths', value: fmt(deaths.total), tone: 'bad' },
          ]}
        />

        {/* Births and deaths keep their own containers. They are opposite facts with different
            provenance — the births date falls back to the day the record was added on 61% of
            rows and the deaths date does not — so one border around both would put the reader in
            charge of working out which caveat belonged to which chart. */}
        <div className="grid gap-[var(--space-4)] @[720px]:grid-cols-2">
          <DashCard
            title="Births"
            action="View Circle of Life"
            onAction={() => onTab?.('life')}
          >
            <span
              title="Dated by the record's own birth date where it has one and by the day it was added otherwise — 39,170 of 64,083 compiled births take the fallback, so this is when young were recorded rather than when they were born."
            >
              <YearBars years={birthYears} noun="births" />
            </span>
          </DashCard>

          <DashCard
            title="Deaths"
            action="View Circle of Life"
            onAction={() => onTab?.('life')}
          >
            <span title="Deaths carry a real event date on 38,680 of 38,684 source rows.">
              <YearBars years={deathYears} tone="bad" noun="deaths" />
            </span>
          </DashCard>
        </div>

        {/* THE THREE COMPOSITIONS, ONE ROW. Each is a part-to-whole of a different denominator —
            animals, enclosures, deaths — so they are three cards rather than three sections of
            one, and each carries its own total in the legend beneath it. */}
        <div className="grid gap-[var(--space-4)] @[720px]:grid-cols-2 @[1060px]:grid-cols-3">
          {sexRows.length > 0 && wide && (
            <DashCard title="Sex Composition">
              <span title="Unsexed is an answer a keeper recorded in housing.gender, not a gap in the file, so it holds its own share rather than being folded away. On a past window the split is the register's present ratio apportioned to the reconstructed headcount — animals.bin is a snapshot and carries no sex history.">
                <Slices items={sexRows} centre={['Sexed', `${Math.round(wide.sexedPct)}%`]} />
                <SliceKey items={sexRows} />
              </span>
            </DashCard>
          )}

          {readyRows.length > 0 && (
            <DashCard title="Breeding Readiness" action="View Pairing" onAction={() => onTab?.('pairing')}>
              <span title="Counted per enclosure from the register as at the extract's last day, so it does not move with the date filter. No bucket says 'can breed' — that is a claim about maturity, and a birth date is absent on 81% of the register.">
                <Slices items={readyRows} inner={0.58} />
                <SliceKey items={readyRows} />
              </span>
              {/* The enclosure total is stated once, by the KPI cell above that exists for it —
                  repeating it under the ring it is the denominator of was the same figure twice. */}
            </DashCard>
          )}

          {causes.length > 0 && (
            <DashCard title="Causes of Death" action="View Circle of Life" onAction={() => onTab?.('life')}>
              <span title="The vocabulary is the source's verbatim. Undetermined and Indeterminate are non-answers and take the grey rather than a category colour.">
                <Slices items={causes} inner={0} />
                <SliceKey items={causes} />
              </span>
              {/* The unrecorded share is carried by the grey slice and its legend row, which
                  state the same fact inside the mark rather than as a caption under it. */}
            </DashCard>
          )}
        </div>

        <div className="grid items-start gap-[var(--space-4)] @[900px]:grid-cols-2">
          {wide && wide.sites.length > 0 && (
            <DashCard title="Population by Site" action="View Housing" onAction={() => onTab?.('housing')}>
              <span title="Where this species is now. A site that recorded births or deaths but holds none today does not appear here — that history is in the flows above.">
                <RankRows
                  rows={wide.sites.map((s) => ({ key: s.siteKey, label: s.siteName, value: s.count }))}
                  total={wide.total}
                  onOpen={(key) => drillTo({ kind: 'site', id: key })}
                />
              </span>
            </DashCard>
          )}

          <DashCard title="Standing" action="View Identification" onAction={() => onTab?.('identification')}>
            <FactRows
              rows={[
                { label: 'Class', value: sp?.cls ?? '—' },
                { label: 'Site', value: siteOf(sp?.siteKey ?? '')?.name ?? '—' },
                {
                  label: 'IUCN Red List',
                  value: iucnBadge(standing?.iucn) ?? standing?.iucn ?? '—',
                },
                { label: 'CITES', value: standing?.cites ? `Appendix ${standing.cites}` : 'Not listed' },
                /* The schema carries no Wildlife Protection Act column, so this says so rather
                   than printing a zero or an unearned "Not scheduled". */
                { label: 'WPA schedule', value: standing?.schedule ? `Schedule ${standing.schedule}` : 'Not recorded' },
              ]}
            />
          </DashCard>
        </div>
      </div>
    </TabBody>
  )
}

/* ── the Circle of Life tab ──────────────────────────────────────────────── */

/**
 * AN ANALYTICAL REPORT IN FIVE CHAPTERS AND A RECORDS WORKSPACE, in this order: births vs
 * deaths over time, both by season, both by sex, the deaths in detail, lifespan, and the
 * records themselves. Every figure on the tab reads the same two event arrays —
 * `eventsOfSpecies('births' | 'mortality')` — so a chart and the table under it cannot sum to
 * different totals.
 *
 * THE PERIOD SELECTOR IS LOCAL AND SAYS SO BY ITS PLACEMENT. 1Y / 2Y / 3Y / All scope this
 * tab's report; the header's window pill scopes the rest of the page. Both charts in a pair
 * read the same window and the same bucket boundaries, which is what "aligned months" means.
 *
 * WHAT THE EXTRACT CANNOT FILL, dropped rather than dashed (the measurements are
 * `speciesLife.ts`'s own):
 *   MOTHER — `report_births` carries no parent column, so no birth row can name one.
 *   ENCLOSURE per event — neither flow records where the animal was at the time.
 *   ANIMAL NAME / PHOTO — the extract has ids; names exist only for currently-housed animals
 *     and photos not at all, so the identity cell is the id.
 *   ACCESSION-TO-DEATH — no accession date travels on a death record; the survival chart is
 *     time from BIRTH to death, over the deaths that carry a birth date, and is labelled so.
 */

type LifePeriod = '1y' | '2y' | '3y' | 'all'
type RecordKind = 'births' | 'deaths' | 'lifespan'
type RecordMode = 'animal' | 'site'

/** The lifespan/neutral-teal treatment — the NotePanel's own hue, promoted to a mark colour. */
const TEAL = '#1f515b'

/**
 * One record of one flow, with the sex and age its own row carries.
 *
 * READ STRAIGHT OFF THE COLUMNS, not through `eventAt`. An `Ev`'s id ends in `animal || i`, so
 * the row index is unrecoverable from an event once the record names an animal — which is most
 * of the mortality flow — and `facetAt`/`numberAt` keyed on a recovered index would silently
 * read the wrong row. One walk here reads day, species, animal, detail, the sex facet and the
 * age column in a single pass, so every figure and every table row on this tab is the same read.
 */
interface LifeEv {
  key: string
  day: number
  siteKey: string
  animalId: string
  detail: string
  sex?: string
  /** Age at death in days, only where the record carries a usable birth date. */
  age?: number
}

function lifeEvents(kind: string, name: string, siteKey: string | null, win: Win): LifeEv[] {
  const f = flowOf(kind)
  if (!f) return []
  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)
  const sex = f.facets.get('sex')
  const age = f.numbers.get('age')
  const out: LifeEv[] = []
  for (const key of Object.keys(f.slices)) {
    if (siteKey && key !== siteKey) continue
    const slice: [number, number] = f.slices[key]
    const start = slice[0]
    const len = slice[1]
    for (let r = start; r < start + len; r++) {
      const d = f.day[r]
      if (d < from || d > to) continue
      const spx = f.species[r]
      if (spx === UNRESOLVED || SPECIES[spx]?.name !== name) continue
      const animal = f.animal[r]
      const a = age ? age.col[r] : undefined
      out.push({
        key: `${key}-${d}-${r}`,
        day: d,
        siteKey: key,
        animalId: animal ? String(animal) : '',
        detail: f.details[f.detail[r]] ?? 'Not recorded',
        sex: sex ? sex.values[sex.col[r]] : undefined,
        /* The sentinel is the column's own "no value" marker — zero is a REAL age here. */
        age: a === undefined || a === age?.sentinel ? undefined : a,
      })
    }
  }
  /* Newest first, so the records table is a slice rather than a sort per page. */
  return out.sort((x, y) => y.day - x.day)
}

/** Counts per month of the YEAR, pooled across the window's years — a season, not a trend. */
const seasonCounts = (rows: LifeEv[]): number[] => {
  const counts = new Array<number>(12).fill(0)
  for (const r of rows) counts[dateAt(r.day).getMonth()]++
  return counts
}

/** Male / female / keeper-entered-unknown, with the sexed count as the honest denominator. */
const sexSplit = (rows: LifeEv[]) => {
  let male = 0
  let female = 0
  let unknown = 0
  for (const r of rows) {
    const v = (r.sex ?? '').toLowerCase()
    if (v === 'male') male++
    else if (v === 'female') female++
    else unknown++
  }
  return { male, female, unknown, known: male + female, of: rows.length }
}

/**
 * The uppercase chapter heading — title, qualifier, and the chapter's own controls.
 *
 * The style is `Rule`'s overline over the same hairline, kept as a separate row above the
 * panels so a two-column chapter has one heading rather than two.
 */
function ChapterHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <span className="flex min-w-0 items-baseline gap-3">
        <h3 className="text-overline font-semibold tracking-[0.04em] whitespace-nowrap uppercase" style={{ color: '#3d3a34' }}>
          {title}
        </h3>
        {sub && (
          <span className="min-w-0 truncate text-caption" style={{ color: FAINT }}>
            {sub}
          </span>
        )}
      </span>
      {right}
    </div>
  )
}

/**
 * The underline tab row — the period selector and the records navigation.
 *
 * Lightweight by specification: text, an optional count, and a 2px underline carrying the
 * active state, against the same green ink every active control on the page uses. Not the
 * pill `Segments` — that one is a view regrouping, this one is navigation.
 */


/** Two panels of equal width and height, stacked below 860px of tab. */
function Pair({ children }: { children: React.ReactNode }) {
  /* `items-start`, NOT `items-stretch`. Stretching made both panels as tall as the taller one,
     so a card holding a twelve-column strip sat in a box sized for a card holding a ring — the
     empty half was the layout, not the content. Each panel is now its own height. */
  return <div className="grid items-start gap-3 @[860px]:grid-cols-2">{children}</div>
}

/** The pill/segment control the records workspace shares with the Housing tab. */
function ModeSegments({
  value,
  onChange,
}: {
  value: RecordMode
  onChange: (v: RecordMode) => void
}) {
  return (
    <span className="flex gap-1.5" role="group">
      {(
        [
          ['animal', 'Animal-Wise', PawPrint],
          ['site', 'Site-Wise', MapPin],
        ] as [RecordMode, string, LucideIcon][]
      ).map(([key, label, Glyph]) => {
        const on = key === value
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className="card-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium"
            style={on ? { backgroundColor: DEEP, color: '#ffffff' } : { backgroundColor: TRACK, color: '#44544a' }}
          >
            <Glyph size={13} strokeWidth={2} aria-hidden />
            {label}
          </button>
        )
      })}
    </span>
  )
}

export function SpeciesLifeTab({
  name,
}: {
  speciesId: string
  name: string
  profile?: SpeciesProfile
}) {
  const { scope } = useScope()
  const { drillTo } = useDrill()
  const { open } = useSheet()
  const siteKey = scope.site?.key ?? null

  const [period, setPeriod] = useState<LifePeriod>('all')
  const [record, setRecord] = useState<RecordKind>('births')
  const [mode, setMode] = useState<RecordMode>('animal')
  const [query, setQuery] = useState('')

  /* The local report window. 'all' is the extract's own span; the year cuts share its `key`
     because `WindowKey` has no 1Y/2Y/3Y members and the key is never read below — only the
     day range and the printable label are. */
  const win = useMemo<Win>(() => {
    const all = resolveWindow('all')
    if (period === 'all') return all
    const days = { '1y': 365, '2y': 730, '3y': 1095 }[period]
    const from = Math.max(all.from, TODAY - days + 1)
    const label = `last ${period[0]} year${period === '1y' ? '' : 's'}`
    return { ...all, from, to: TODAY, days: TODAY - from + 1, window: label, label }
  }, [period])

  /* THE TWO ARRAYS EVERYTHING READS. Site pill honoured by filtering the rows rather than the
     walk, so one code path builds both the scoped and the unscoped report. */
  const births = useMemo(() => lifeEvents('births', name, siteKey, win), [name, win, siteKey])
  const deaths = useMemo(() => lifeEvents('mortality', name, siteKey, win), [name, win, siteKey])

  /* Ages travel ON the death rows, so the lifespan table and the lifespan charts are reads of
     one array and cannot disagree. */
  const aged = useMemo(() => deaths.filter((r): r is LifeEv & { age: number } => r.age !== undefined), [deaths])
  const ageDays = useMemo(() => aged.map((r) => r.age), [aged])

  /* The window divided into up to 24 equal spans — the same arithmetic for both charts, which
     is what lets the pair claim "aligned months". */
  const toPts = (rows: LifeEv[]): Pt[] => {
    const from = Math.max(0, win.from)
    const to = Math.min(TODAY, win.to)
    const span = Math.max(1, to - from + 1)
    const n = Math.max(1, Math.min(24, span))
    const size = Math.ceil(span / n)
    const pts: Pt[] = []
    for (let b = 0; b < n; b++) {
      const lo = from + b * size
      const hi = Math.min(to, lo + size - 1)
      if (lo > to) break
      pts.push({
        label: lo === hi ? shortDate(lo) : `${shortDate(lo)} – ${shortDate(hi)}`,
        value: 0,
        from: lo,
        to: hi,
      })
    }
    for (const r of rows) {
      const b = Math.floor((r.day - from) / size)
      if (b >= 0 && b < pts.length) pts[b].value++
    }
    return pts
  }
  const birthPts = useMemo(() => toPts(births), [births]) // eslint-disable-line react-hooks/exhaustive-deps
  const deathPts = useMemo(() => toPts(deaths), [deaths]) // eslint-disable-line react-hooks/exhaustive-deps

  const seasonB = useMemo(() => seasonCounts(births), [births])
  const seasonD = useMemo(() => seasonCounts(deaths), [deaths])
  const sexB = useMemo(() => sexSplit(births), [births])
  const sexD = useMemo(() => sexSplit(deaths), [deaths])
  const causes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of deaths) counts.set(r.detail, (counts.get(r.detail) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [deaths])
  const survival = useMemo(() => survivalOf(ageDays), [ageDays])
  const distribution = useMemo(() => bandsOf(ageDays), [ageDays])

  const meanAge = ageDays.length ? ageDays.reduce((n, d) => n + d, 0) / ageDays.length : undefined
  const oldest = ageDays.length ? Math.max(...ageDays) : undefined
  const youngest = ageDays.length ? Math.min(...ageDays) : undefined

  /* ── the records workspace ─────────────────────────────────────────────── */

  const q = query.trim().toLowerCase()

  /** Site rows for whichever record kind is active — grouped off the same event arrays. */
  interface SiteRow {
    siteKey: string
    siteName: string
    count: number
    male: number
    female: number
    unsexed: number
    ages: number[]
  }
  const siteRows = useMemo<SiteRow[]>(() => {
    const rows = record === 'births' ? births : record === 'deaths' ? deaths : aged
    const by = new Map<string, SiteRow>()
    for (const r of rows) {
      let at = by.get(r.siteKey)
      if (!at) {
        at = {
          siteKey: r.siteKey,
          siteName: siteOf(r.siteKey)?.name ?? r.siteKey,
          count: 0,
          male: 0,
          female: 0,
          unsexed: 0,
          ages: [],
        }
        by.set(r.siteKey, at)
      }
      at.count++
      const s = (r.sex ?? '').toLowerCase()
      if (s === 'male') at.male++
      else if (s === 'female') at.female++
      else at.unsexed++
      if (r.age !== undefined) at.ages.push(r.age)
    }
    return [...by.values()]
      .filter((s) => !q || s.siteName.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count)
  }, [record, births, deaths, aged, q])

  const animalRows = useMemo(() => {
    const rows = record === 'births' ? births : record === 'deaths' ? deaths : aged
    return q ? rows.filter((r) => r.animalId.toLowerCase().includes(q)) : rows
  }, [record, births, deaths, aged, q])

  const page = usePaged(
    (offset, limit) => ({ rows: animalRows.slice(offset, offset + limit), total: animalRows.length }),
    12,
    [animalRows],
  )

  /** The identity cell — the id is the only identity a record carries, stated as such. */
  const idCell = (ev: LifeEv) => (
    <span>
      <span className="block">{ev.animalId ? `Animal ${ev.animalId}` : 'No animal id'}</span>
      <span className="block text-caption font-normal" style={{ color: FAINT }}>
        {ev.animalId ? `AID: ${ev.animalId}` : 'on this record'}
      </span>
    </span>
  )
  const sexCell = (ev: LifeEv) => ev.sex ?? ''

  const animalColumns: HCol<LifeEv>[] =
    record === 'births'
      ? [
          { key: 'no', head: 'No', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
          { key: 'animal', head: 'Animal Name & ID', sticky: 52, strong: true, cell: (r) => idCell(r) },
          { key: 'dob', head: 'Date of Birth', cell: (r) => longDate(r.day) },
          { key: 'sex', head: 'Gender', cell: (r) => sexCell(r) },
          { key: 'site', head: 'Site', cell: (r) => siteOf(r.siteKey)?.name ?? r.siteKey },
        ]
      : record === 'deaths'
        ? [
            { key: 'no', head: 'No', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
            { key: 'animal', head: 'Animal Name & ID', sticky: 52, strong: true, cell: (r) => idCell(r) },
            { key: 'dod', head: 'Date of Death', cell: (r) => longDate(r.day) },
            { key: 'sex', head: 'Gender', cell: (r) => sexCell(r) },
            { key: 'age', head: 'Age', align: 'right', cell: (r) => (r.age === undefined ? '' : ageLabel(r.age)) },
            { key: 'site', head: 'Site', cell: (r) => siteOf(r.siteKey)?.name ?? r.siteKey },
            { key: 'cause', head: 'Cause of Death', cell: (r) => r.detail },
          ]
        : [
            { key: 'no', head: 'No', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
            { key: 'animal', head: 'Animal Name & ID', sticky: 52, strong: true, cell: (r) => idCell(r) },
            /* Derived, and by simple arithmetic on two fields the record itself carries: the
               death day minus the recorded age. Not a stored birth date. */
            { key: 'dob', head: 'Date of Birth', cell: (r) => longDate(r.day - (r.age ?? 0)) },
            { key: 'dod', head: 'Date of Death', cell: (r) => longDate(r.day) },
            { key: 'age', head: 'Age', align: 'right', cell: (r) => (r.age === undefined ? '' : ageLabel(r.age)) },
            { key: 'sex', head: 'Gender', cell: (r) => sexCell(r) },
            { key: 'site', head: 'Site', cell: (r) => siteOf(r.siteKey)?.name ?? r.siteKey },
            { key: 'cause', head: 'Cause of Death', cell: (r) => r.detail },
          ]

  const siteColumns: HCol<SiteRow>[] =
    record === 'lifespan'
      ? [
          { key: 'no', head: 'No', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
          { key: 'site', head: 'Site', sticky: 52, strong: true, cell: (s) => s.siteName },
          { key: 'records', head: 'Records', align: 'right', cell: (s) => fmt(s.ages.length) },
          {
            key: 'avg',
            head: 'Average Age',
            align: 'right',
            cell: (s) => (s.ages.length ? ageLabel(s.ages.reduce((n, d) => n + d, 0) / s.ages.length) : ''),
          },
          { key: 'young', head: 'Youngest', align: 'right', cell: (s) => (s.ages.length ? ageLabel(Math.min(...s.ages)) : '') },
          { key: 'old', head: 'Oldest', align: 'right', cell: (s) => (s.ages.length ? ageLabel(Math.max(...s.ages)) : '') },
        ]
      : [
          { key: 'no', head: 'No', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
          { key: 'site', head: 'Site', sticky: 52, strong: true, cell: (s) => s.siteName },
          {
            key: 'count',
            head: record === 'births' ? 'Births' : 'Deaths',
            align: 'right',
            strong: true,
            cell: (s) => fmt(s.count),
          },
          { key: 'm', head: 'Male', align: 'right', cell: (s) => fmt(s.male) },
          { key: 'f', head: 'Female', align: 'right', cell: (s) => fmt(s.female) },
          { key: 'u', head: 'Unsexed', align: 'right', cell: (s) => fmt(s.unsexed) },
        ]

  const openCauses = () =>
    open({
      title: 'Cause of death',
      eyebrow: `${name} · ${fmt(deaths.length)} deaths`,
      body: (
        <RankedBars
          items={causes.map(([label, v]) => [label, v] as [string, number])}
          unit="deaths"
          max={causes.length}
          total={deaths.length}
        />
      ),
    })

  const peakB = peakIndex(seasonB)
  const peakD = peakIndex(seasonD)
  const empty = !births.length && !deaths.length

  return (
    <TabBody>
      {/* ── 1 · births vs deaths ─────────────────────────────────────────── */}
      {/* THE CHAPTER SUB-LINES ARE GONE, ALL FOUR. Each chapter opened with a line qualifying
          it — "same period · aligned months", the death count and its window, where the
          lifespan figures are read from, what the records are — and a heading that needs a
          sentence under it is doing the work twice. The period control to the right states the
          window, and every panel below states its own subject. */}
      <ChapterHead
        title="Births vs deaths"
        right={
          <SegmentToggle
            value={period}
            onChange={setPeriod}
            options={[
              { key: '1y', label: '1Y' },
              { key: '2y', label: '2Y' },
              { key: '3y', label: '3Y' },
              { key: 'all', label: 'All' },
            ]}
          />
        }
      />
      <Pair>
        <Band title="Births Over Time" icon={Baby}>
          <EventTrend points={birthPts} unit="births" empty={`No births recorded in ${win.window}.`} />
        </Band>
        <Band title="Deaths Over Time" icon={Skull}>
          <EventTrend points={deathPts} unit="deaths" tone="bad" empty={`No deaths recorded in ${win.window}.`} />
        </Band>
      </Pair>

      {/* ── 2 · the seasons ──────────────────────────────────────────────── */}
      {(births.length > 0 || deaths.length > 0) && (
        <Pair>
          {/* The peak is DRAWN — `highlight` sets that column apart and `showValues` prints
              every count — so naming it again underneath was the chart read back as a
              sentence, with the dating caveat riding along behind it. */}
          {births.length > 0 && (
            <Band title="Seasonal Breeding Pattern" icon={CalendarRange}>
              <Columns values={seasonB} labels={MONTHS} highlight={peakB} showValues noun="births" />
            </Band>
          )}
          {deaths.length > 0 && (
            <Band title="Seasonal Mortality Pattern" icon={CalendarRange}>
              <Columns values={seasonD} labels={MONTHS} highlight={peakD} showValues fill={TONE_FILL.bad} noun="deaths" />
            </Band>
          )}
        </Pair>
      )}

      {/* ── 3 · by sex, as the product's own ring ────────────────────────── */}
      {(sexB.of > 0 || sexD.of > 0) && (
        <Pair>
          {sexB.of > 0 && (
            <Band title="Births by Gender" aside={`${fmt(sexB.known)} of ${fmt(sexB.of)} sexed`} icon={Baby}>
              <Slices
                items={[
                  { label: 'Male', value: sexB.male },
                  { label: 'Female', value: sexB.female },
                  { label: 'Undetermined', value: sexB.unknown },
                ].filter((s) => s.value > 0)}
                centre={['Births', fmt(sexB.of)]}
              />
              <SliceKey
                items={[
                  { label: 'Male', value: sexB.male },
                  { label: 'Female', value: sexB.female },
                  { label: 'Undetermined', value: sexB.unknown },
                ].filter((s) => s.value > 0)}
              />
            </Band>
          )}
          {sexD.of > 0 && (
            <Band title="Deaths by Gender" aside={`${fmt(sexD.known)} of ${fmt(sexD.of)} sexed`} icon={Skull}>
              <Slices
                items={[
                  { label: 'Male', value: sexD.male },
                  { label: 'Female', value: sexD.female },
                  { label: 'Undetermined', value: sexD.unknown },
                ].filter((s) => s.value > 0)}
                centre={['Deaths', fmt(sexD.of)]}
              />
              <SliceKey
                items={[
                  { label: 'Male', value: sexD.male },
                  { label: 'Female', value: sexD.female },
                  { label: 'Undetermined', value: sexD.unknown },
                ].filter((s) => s.value > 0)}
              />
            </Band>
          )}
        </Pair>
      )}

      {/* ── 4 · deaths in detail ─────────────────────────────────────────── */}
      {deaths.length > 0 && (
        <>
          <ChapterHead title="Deaths — detail" />
          <Pair>
            {/* The aged-of-total count and the provenance note are both dropped: where none of
                the deaths can be placed the panel still says so in full, in the branch below,
                which is the only case where the reader needed telling. */}
            <Band title="Survival Analysis" icon={Activity}>
              {ageDays.length > 0 ? (
                <>
                  <Columns
                    values={survival.map((b) => b.value)}
                    labels={survival.map((b) => b.label)}
                    noun="deaths"
                    highlight={peakIndex(survival.map((b) => b.value))}
                    showValues
                    fill={TONE_FILL.bad}
                  />
                  {/* The share and the reading, in the same five columns the bars use. */}
                  <div className="mt-1 flex gap-1.5">
                    {survival.map((b) => (
                      <span key={b.label} className="flex-1 text-center text-tick tabular-nums" style={{ color: FAINT }}>
                        {ageDays.length ? Math.round((b.value / ageDays.length) * 100) : 0}%
                      </span>
                    ))}
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    {survival.map((b) => (
                      <span key={b.label} className="flex-1 text-center text-tick leading-tight" style={{ color: FAINT }}>
                        {b.note}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-small" style={{ color: '#5c574f' }}>
                  None of this species&rsquo; {fmt(deaths.length)} recorded deaths carries a usable
                  birth date, so no survival time can be placed.
                </p>
              )}
            </Band>

            {/* The record count is in the strip's own "Records" figure a few pixels below. */}
            <Band title="Age at Death" icon={Skull}>
              <MetricStrip
                dense
                items={[
                  { label: 'Average', value: meanAge === undefined ? '—' : ageLabel(meanAge) },
                  { label: 'Youngest', value: youngest === undefined ? '—' : ageLabel(youngest) },
                  { label: 'Oldest', value: oldest === undefined ? '—' : ageLabel(oldest) },
                  { label: 'Records', value: fmt(ageDays.length), sub: `of ${fmt(deaths.length)} deaths` },
                ]}
              />

              {causes.length > 0 && (
                <>
                  <div className="mt-6 mb-3 flex items-baseline justify-between gap-3">
                    <h4 className="text-overline font-semibold tracking-[0.04em] uppercase" style={{ color: '#3d3a34' }}>
                      Cause of Death
                    </h4>
                    {causes.length > 8 && (
                      <button
                        type="button"
                        onClick={openCauses}
                        className="card-press text-caption font-medium"
                        style={{ color: ACCENT_INK }}
                      >
                        View more ({causes.length - 8})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {causes.slice(0, 8).map(([label, v]) => (
                      <span
                        key={label}
                        className="flex items-baseline gap-1.5 rounded-full px-2.5 py-1 text-caption"
                        style={{ backgroundColor: '#f4f3ef', color: '#44544a' }}
                      >
                        {label}
                        <b className="font-semibold tabular-nums" style={{ color: VALUE }}>
                          {fmt(v)}
                        </b>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Band>
          </Pair>
        </>
      )}

      {/* ── 5 · lifespan ─────────────────────────────────────────────────── */}
      {ageDays.length > 0 && (
        <>
          <ChapterHead title="Lifespan" />
          <Pair>
            <Band title="Longevity" icon={Heart}>
              <div className="flex flex-col gap-5">
                {(
                  [
                    ['Avg lifespan · recorded', meanAge === undefined ? '—' : ageLabel(meanAge)],
                    ['Longest lived', oldest === undefined ? '—' : ageLabel(oldest)],
                    ['Records', `${fmt(ageDays.length)} of ${fmt(deaths.length)} deaths`],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-overline font-medium uppercase" style={{ color: FAINT }}>
                      {label}
                    </p>
                    <p className="mt-1 font-display text-[24px] leading-[1.15] font-semibold tabular-nums" style={{ color: TEAL }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Band>
            <Band title="Age at Death Distribution" icon={Layers}>
              <Columns
                values={distribution.map((b) => b.value)}
                labels={distribution.map((b) => b.label)}
                noun="deaths"
                highlight={peakIndex(distribution.map((b) => b.value))}
                showValues
                fill={TEAL}
              />
            </Band>
          </Pair>
        </>
      )}

      {/* ── 6 · the records ──────────────────────────────────────────────── */}
      <ChapterHead
        title="Records"
        right={
          <SegmentToggle
            value={record}
            onChange={(v) => {
              setRecord(v)
              setQuery('')
            }}
            options={[
              { key: 'births', label: 'Births', count: births.length, icon: Baby },
              { key: 'deaths', label: 'Deaths', count: deaths.length, icon: Skull },
              { key: 'lifespan', label: 'Lifespan', count: ageDays.length, icon: Heart },
            ]}
          />
        }
      />
      <Band
        title={record === 'births' ? 'Birth records' : record === 'deaths' ? 'Death records' : 'Lifespan records'}
        aside={
          <ModeSegments
            value={mode}
            onChange={(v) => {
              setMode(v)
              setQuery('')
            }}
          />
        }
        icon={ListTree}
      >
        <div className="mb-4">
          <FindField
            value={query}
            onChange={setQuery}
            placeholder={mode === 'animal' ? 'Search animals...' : 'Search sites...'}
          />
        </div>

        {empty || (mode === 'animal' ? animalRows.length === 0 : siteRows.length === 0) ? (
          <div className="py-10 text-center">
            <p className="text-small font-medium" style={{ color: INK }}>
              No {record} records found
            </p>
            <p className="mt-1 text-caption" style={{ color: FAINT }}>
              Try changing your search or selected view.
            </p>
          </div>
        ) : mode === 'animal' ? (
          <>
            <HousingTable
              rows={page.rows}
              columns={animalColumns}
              keyOf={(r) => r.key}
              onOpen={(r) => {
                if (r.animalId) drillTo({ kind: 'animal', id: r.animalId }, { module: 'animals', label: name })
              }}
            />
            <MoreRows page={page} noun={q ? 'matching records' : 'records'} />
          </>
        ) : (
          <HousingTable
            rows={siteRows}
            columns={siteColumns}
            keyOf={(s) => s.siteKey}
            onOpen={(s) => drillTo({ kind: 'site', id: s.siteKey }, { module: 'animals', label: name })}
          />
        )}

        {/* The note naming the two columns the birth record cannot fill is gone. The table's own
            headers are the statement: a column that is not there is not claimed. */}
      </Band>
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
