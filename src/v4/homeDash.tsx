/**
 * THE HOME DASHBOARD — the Figma screen (node 161:1424), wired to the real reads.
 *
 * WHAT THIS REPLACES. The home was four analytical sections — Executive Overview, Operational
 * Status, Trends, Collection Watch — eleven KPI tiles and a trend grid. The design asks for a
 * dashboard instead: one headline strip, one population curve, one composition, and five
 * operational cards. Same hero, same ground, same type; the body below the artwork is new.
 *
 * EVERY FIGURE IS A READ, NOT A NUMBER FROM THE MOCK. The design carries example data and some
 * of it cannot be true — see the block below. Where a card has a source it reads it under the
 * page's own scope and window, so nothing here can disagree with the module it links to. Where
 * it has none, that is stated in the card's own comment and the card says what it CAN say.
 *
 * WHAT THE DUMP DOES NOT HOLD, and what each card does about it:
 *
 *   EGGS — `core/metrics.ts` declares `eggs: 'no egg, clutch or incubation table'`, `hatched:
 *     'no hatch record'` and `discarded: 'no egg record'`, and `core/checks.ts` asserts the gap
 *     at boot. What IS recorded is a birth for an oviparous animal, which for a bird or a
 *     reptile IS the hatch — so the headline is that count, real, and the laid/discarded pair
 *     is derived under the `core/seed.ts` contract exactly as `speciesEggSeason.ts` derives the
 *     species tab: a pure function of a stable key, split with `apportion` so the parts sum to
 *     the whole. Naveen's standing call is to derive rather than show NoSource here.
 *
 *   HOSPITAL OUTCOMES — the admissions flow carries a presenting sign and a severity and no
 *     outcome column, so "Recovered / In Care / Died" cannot be read. Severity CAN, verbatim,
 *     so the stacked bar is the severity mix — the same shape answering the question the data
 *     can actually answer.
 *
 *   MEDICINE SPEND — the pharmacy flow is 1,636 dispense events carrying a medicine name and a
 *     route. There is no quantity, no unit price and no cost column anywhere in the extract, so
 *     the card leads on dispensings and keeps the design's "top used medicines" table, which is
 *     a real tally.
 *
 * THE STRIP OVERLAPS THE ARTWORK BY DESIGN. It is one card, not three, because the three cells
 * are three readings of one collection and three gapped boxes would say they were three
 * subjects — the same argument `KpiStrip` makes on the species page.
 */

import { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'

import { dateAt, resolveWindow, type WindowKey } from '../core/calendar'
import { count, tally, tallyFacet } from '../core/events'
import { figure, delta as deltaOf, population } from '../core/query'
import { apportion, draw } from '../core/seed'
import {
  ACCENT,
  ACCENT_INK,
  FAINT,
  Figure,
  HAIR,
  HERO_INK,
  INK,
  MD3,
  MUTED,
  TONE,
  TRACK,
  VALUE,
  fmt,
  mix,
} from '../exec/system'
import type { Pt } from '../exec/marks'
import { Reveal, usePlay } from '../motion'
import { huesFor } from './dashboard'
import { endsBeforeWindow, pointsOf, tail } from './plot'
import { useScope } from './scope'
import { SegmentToggle } from './speciesLayout'

/* ── shared card chrome ──────────────────────────────────────────────────── */

/**
 * THE CARD, AT THE DESIGN'S OWN MEASURES.
 *
 * 24px of padding and a 20px radius, both read off the frame rather than taken from
 * `--pad-card` (20) and `--radius-card` (16). The house tokens are right for the module pages,
 * where a card is one of eighteen in a column; this screen is eight cards at desktop width and
 * the design gives them the larger, calmer measure. Stated as literals here rather than by
 * editing the tokens, because changing `--pad-card` would repad every other page in the app.
 *
 * `h-full` SO A ROW OF CARDS ENDS LEVEL. The grids stretch their rows, but the item they
 * stretch is the card — without this the Eggs card ended at its own content and left a ragged
 * step beside a taller Transfers card, which the design does not have.
 *
 * `content-box` IS THE FIX FOR A WHOLE CLASS OF BUG, and it is the project's own name for
 * `container-type: inline-size`. Every `@[…]` rule resolves against the nearest ANCESTOR
 * container, and until now that was the page's content column for all of them — so
 * `@[420px]:grid-cols-2` inside the Medical card was true whenever the PAGE was wider than
 * 420px, even with the card itself at 328. Measured: the two gauges went side by side in a
 * 328px card. `speciesLayout.tsx` records the same trap ("an `@[680px]` that matched at every
 * width because it was asking an ancestor, not the card"); making each card a container is what
 * lets a card's internals respond to the card.
 */
const CARD = 'content-box h-full rounded-[20px] bg-white p-6'

/**
 * The pale well a card's breakdown sits in — the design's inner container.
 *
 * Every one of the four operational cards puts its detail inside one of these rather than
 * against the white: Eggs' hatched/discarded pair, Transfers' two destinations, Pharmacy's
 * medicine table. One class so the four cannot drift apart.
 */
const WELL = 'rounded-[13px] bg-[#f7f7f5] p-3'

/** A figure in the design's sub-cell size — 24px, tabular, tone-coloured. */
function SubFigure({ value, tone }: { value: string; tone?: string }) {
  return (
    <p className="font-display text-[24px] leading-[1.2] font-bold tabular-nums" style={{ color: tone ?? VALUE }}>
      {value}
    </p>
  )
}

/**
 * THE WINDOW A FLOW CAN ACTUALLY ANSWER FOR.
 *
 * Three of the flows on this screen stop before the extract's last month: transfers last
 * recorded before May 2026, and so did admissions and pharmacy. On the default window — This
 * month — every one of them is a true zero, which gave a dashboard with three cards reading 0
 * and a fourth reading 676. That is accurate and useless: the reader concludes the app is
 * broken, not that the ledger ends.
 *
 * `endsBeforeWindow` exists in `plot.ts` for exactly this, and the species Overview already
 * settled the policy — a card that cannot honour the page's window reads the span it CAN and
 * says so in its own header (`DashCard.span`). This is that rule, applied per flow rather than
 * per card, so a flow that gains recent rows in a later extract silently goes back to obeying
 * the pill.
 */
function useFlowWindow(slug: string) {
  const { scope } = useScope()
  const siteKey = scope.site?.key ?? null
  return useMemo(() => {
    const stale = endsBeforeWindow(slug, siteKey, scope.win)
    return {
      siteKey,
      win: stale ? resolveWindow('all') : scope.win,
      /* The words on the card. Stated only when it is NOT the pill's window, because a card
         repeating the window the header already set is a line that says nothing. */
      span: stale ? 'all time' : undefined,
    }
  }, [slug, siteKey, scope.win])
}

/** The card head — a title, an optional quiet qualifier, and an optional control. */
function Head({
  title,
  span,
  right,
}: {
  title: string
  span?: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <h3 className="text-lead font-semibold tracking-[-.2px]" style={{ color: INK }}>
        {title}
      </h3>
      {span && (
        <span className="shrink-0 text-caption whitespace-nowrap" style={{ color: FAINT }}>
          {span}
        </span>
      )}
      {right && <span className="ml-auto shrink-0">{right}</span>}
    </div>
  )
}

/**
 * A movement chip, or nothing.
 *
 * NOTHING IS THE COMMON CASE AND IT IS THE RIGHT ONE. `deltaOf` returns undefined where the
 * comparison would be meaningless — no preceding window, or a previous window of zero from
 * which every increase is infinite — and a chip reading "+∞%" or "0%" beside a real figure is
 * worse than no chip. The design shows a chip on all three strip cells; it appears here only
 * where the comparison exists.
 *
 * THE COLOUR IS THE VERDICT, NOT THE SIGN. A rising death count is bad news and a falling one
 * is good, which is the opposite of what colouring by direction gives — the same rule
 * `Home.tsx`'s `MOOD` applies to its KPI cards.
 */
function Chip({ percent, direction, good }: { percent: number; direction: 'up' | 'down' | 'flat'; good: boolean }) {
  if (direction === 'flat' || !Number.isFinite(percent)) return null
  const tone = direction === 'up' ? (good ? 'good' : 'bad') : good ? 'bad' : 'good'
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-[3px] text-tick font-semibold whitespace-nowrap tabular-nums"
      style={{ backgroundColor: mix(TONE[tone], 0.1), color: TONE[tone] }}
    >
      {direction === 'up' ? '+' : '−'}
      {Math.abs(Math.round(percent))}% vs prev
    </span>
  )
}

/* ── 1 · the headline strip ──────────────────────────────────────────────── */

/**
 * Three readings of the collection, in one card, sitting over the foot of the artwork.
 *
 * THE SPECIES CELL CARRIES NO PERCENTAGE, and that is deliberate rather than an omission. The
 * design's "+20 this month" implies a species history the register does not have — `animals.bin`
 * is a snapshot of who is housed on the extract's last day and carries no arrival history at
 * SPECIES grain. What the window CAN answer is how many animals were accessioned in it, which
 * is a real figure and the nearest true statement to the one the mock makes, so that is what
 * the sub-line says.
 *
 * A SPECIES COUNT IS DISTINCT NAMES. The Ochre Warbler at seven sites is one species held seven
 * times — `core/world.ts` documents that as what a curator means by the word, and every other
 * species figure in the product now counts the same way.
 */
export function HeadlineStrip() {
  const { scope, href } = useScope()
  const siteKey = scope.site?.key ?? null

  const species = useMemo(() => new Set(population(scope).map((r) => r.species.name)).size, [scope])
  const accessioned = useMemo(() => count('accession', siteKey, scope.win), [siteKey, scope.win])

  const births = useMemo(() => count('births', siteKey, scope.win), [siteKey, scope.win])
  const deaths = useMemo(() => count('mortality', siteKey, scope.win), [siteKey, scope.win])
  const birthDelta = useMemo(() => deltaOf(scope, 'births'), [scope])
  const deathDelta = useMemo(() => deltaOf(scope, 'mortality'), [scope])
  const birthTail = useMemo(() => tail('births', siteKey, scope.win, 10), [siteKey, scope.win])
  const deathTail = useMemo(() => tail('mortality', siteKey, scope.win, 10), [siteKey, scope.win])

  const cells = [
    {
      key: 'species',
      title: 'Species Collection',
      value: species,
      href: href('browse/species'),
      note: accessioned > 0 ? `+${fmt(accessioned)} accessioned` : undefined,
      spark: undefined as number[] | undefined,
      delta: undefined as ReturnType<typeof deltaOf>,
      good: true,
    },
    {
      key: 'births',
      title: 'Natality',
      value: births,
      href: '#/births',
      spark: birthTail,
      delta: birthDelta,
      good: true,
    },
    {
      key: 'mortality',
      title: 'Mortality & Necropsy',
      value: deaths,
      href: '#/mortality',
      spark: deathTail,
      delta: deathDelta,
      good: false,
    },
  ]

  return (
    /* THREE CARDS WITH A 4px GUTTER, which is the design's own measure and is why they read as
       one strip rather than three tiles — close enough to be a unit, separated enough to be
       three readings. Stated as `gap-1` rather than `--gap` (12px) for the same reason the
       padding is a literal: this screen's rhythm is the design's, not the module pages'. */
    <div className="grid grid-cols-1 gap-1 @[560px]:grid-cols-3">
      {cells.map((c) => (
        <a key={c.key} href={c.href} className="card-press block rounded-[20px] bg-white px-6 py-5">
          <p className="text-body font-semibold" style={{ color: INK }}>
            {c.title}
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              {/* ALL THREE FIGURES ARE THE BRAND GREEN, MORTALITY INCLUDED — sampled off the
                  design, which sets every one of them in #37bd69. It is the opposite of what
                  this product does elsewhere, where a death count is red, and the design is
                  right for this strip: these are three readings of one collection, and putting
                  one of them in the error colour makes the strip a verdict rather than a count.
                  The MOVEMENT still carries the verdict — see `Chip`. */}
              <Figure value={fmt(c.value)} size={32} color={MD3.primary} />
              {c.delta ? (
                <Chip percent={c.delta.percent} direction={c.delta.direction} good={c.good} />
              ) : c.note ? (
                <span
                  className="shrink-0 rounded-full px-2 py-[3px] text-tick font-semibold whitespace-nowrap"
                  style={{ backgroundColor: mix(ACCENT, 0.12), color: '#177654' }}
                >
                  {c.note}
                </span>
              ) : null}
            </span>
            {/* SEVEN BARS, 8px WIDE, 2px APART — the design's own strip, and `SparkBars` does
                not draw it: that mark fills its box with as many bars as it is handed, which on
                a ten-value tail is a denser, thinner comb. Drawn here so the shape matches. */}
            {c.spark && c.spark.some((v) => v > 0) && <MiniBars values={c.spark.slice(-7)} />}
          </div>
        </a>
      ))}
    </div>
  )
}

/**
 * The design's seven-bar comb — 8px bars, 2px apart, 39px tall, bottom-aligned.
 *
 * A 2px FLOOR ON A ZERO BAR, so a quiet week is a mark on the baseline rather than a gap the
 * eye reads as missing data — the same floor `YearBars` applies for the same reason.
 */
function MiniBars({ values }: { values: number[] }) {
  const { ref, animate } = usePlay<HTMLSpanElement>()
  const peak = Math.max(...values, 1)
  return (
    /* THE BARS GROW OFF THE BASELINE, 40ms apart — the same reveal and the same stagger
       `YearBars` gives its columns, so a comb on the home reads the same way as a column chart
       on a species page. `animate` false simply renders them at rest; there is no `opacity-0`
       fallback to get stuck in. */
    <span ref={ref} className="flex h-[39px] shrink-0 items-end gap-[2px]" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          /* 2px, not a pill. The design's comb is 8px wide with a 2px radius — rounded-full on
             an 8px bar takes 4px off each end and turns a 15%-tall bar into a lozenge. */
          className={`w-[8px] origin-bottom rounded-[2px] ${animate ? 'animate-grow-y' : ''}`}
          style={{
            height: `${Math.max(5, (v / peak) * 100)}%`,
            background: mix(MD3.primary, 0.55),
            animationDelay: animate ? `${i * 40}ms` : undefined,
          }}
        />
      ))}
    </span>
  )
}

/* ── 2 · the population curve ────────────────────────────────────────────── */

/**
 * The collection over time, at a span the reader picks.
 *
 * THE SWITCH IS LOCAL AND THE HEADER'S PILL IS NOT TOUCHED. The design puts Week / Monthly /
 * 6 month / Year inside this card, which is a different control from the page's own window —
 * so it stays inside the card and governs only this curve. The header pill still scopes every
 * other figure on the screen, and the two never write to each other.
 *
 * IT IS A LEVEL, NOT A FLOW, AND THE AXIS SAYS SO. `series('animals')` is the monthly close of
 * the collection; the mock's tooltip reads "Birth - 33 / Death - 10" over a 0–5k axis, which
 * are two flows on a level's scale. A curve of the population reads the population.
 */
const SPANS: { key: WindowKey; label: string }[] = [
  { key: 'last7', label: 'Week' },
  { key: 'month', label: 'Monthly' },
  { key: 'half', label: '6 month' },
  { key: 'year', label: 'Year' },
]

function PopulationTrendCard() {
  const { scope } = useScope()
  const siteKey = scope.site?.key ?? null
  const [span, setSpan] = useState<WindowKey>('year')
  const win = useMemo(() => resolveWindow(span), [span])
  const points = useMemo(() => pointsOf('animals', siteKey, win, 12), [siteKey, win])

  return (
    /* `flex flex-col` + a `flex-1` chart. The row stretches this card to the composition's
       height beside it, and a fixed 280px plot left 96px of white under the months — measured
       at 1440 and 1600. The chart grows into it instead. */
    <section className={`${CARD} flex flex-col`}>
      <Head
        title="Population Trend"
        right={<SegmentToggle value={span} options={SPANS} onChange={setSpan} />}
      />
      <TrendChart points={points} />
    </section>
  )
}

/**
 * THE DESIGN'S CHART, and it is drawn here rather than reusing `AreaTrend` for four reasons
 * that are all visible on the frame: the axis is on the RIGHT, the gridlines are DASHED, the
 * ticks are a 1-2-5 ladder from ZERO rather than fitted to the data, and the x-axis is a row of
 * month names. `AreaTrend` does none of those — it prints its own headline figure, fits the
 * baseline to the series and labels the axis with bucket date-ranges — so pointing it at this
 * card gave a chart that was correct and looked nothing like the design.
 *
 * NOTHING HERE IS A NEW COLOUR OR A NEW TYPE SIZE. The fill is `MD3.primary` graded with
 * `mix()`, the gridlines are `HAIR`, the tick and month type is `FAINT` at the house `text-tick`
 * — the geometry is the design's and the palette is the product's.
 *
 * THE CURVE IS A CATMULL-ROM THROUGH THE POINTS, converted to cubics with clamped controls, so
 * it cannot overshoot below zero on a dip — the same construction `smoothPath` uses for the
 * detail-page charts. A population line is a level and an overshoot would draw a headcount the
 * collection never had.
 */
function TrendChart({ points }: { points: Pt[] }) {
  /**
   * `animate ? … : undefined` AND NEVER AN `opacity-0` FALLBACK.
   *
   * This is the house pattern — `AreaTrend` in `exec/marks.tsx` does exactly this — and the
   * reason is not style. `usePlay` returns `animate: inView && !reduce`, so under
   * `prefers-reduced-motion` it is false FOREVER; a mark whose resting class is `opacity-0`
   * then never appears at all. `Slices` shipped that defect and every donut in the product was
   * invisible to a reader who asked for less motion. Leaving the class off means reduced motion
   * gets the finished mark immediately, which is what it asked for.
   */
  const { ref, animate } = usePlay<HTMLDivElement>()
  /* Plot units. `H` is the viewBox's own height, not a rendered pixel height — the box
     stretches, so this only fixes the coordinate space the path is computed in. */
  const H = 280
  const AXIS = 34
  const FOOT = 22

  if (points.length < 2) {
    return (
      <p className="py-16 text-center text-small" style={{ color: FAINT }}>
        One reading in this window — widen it to see the curve.
      </p>
    )
  }

  /* THE TOP OF THE AXIS ROUNDS UP TO A READABLE STEP rather than sitting on the maximum. A top
     of 110,020 puts gridlines on 22,004 and the axis stops being countable; the 1-2-5 ladder
     puts them on round thousands, which is the only reason to draw them. Five gaps, because the
     design draws six lines. */
  const peak = Math.max(...points.map((p) => p.value), 1)
  const raw = peak / 5
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)))
  /* 1 – 2 – 2.5 – 5, and the 2.5 is what earns its place. On the collection's 110,020 the
     coarse 1-2-5 ladder jumps from 2 to 5, giving a 50,000 step and a 150,000 top — a third of
     the chart empty above the curve. 2.5 lands on 25,000 and a top of 125,000, which puts the
     peak at 88% of the height where the design has it. */
  const r = raw / mag
  const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : 5) * mag
  const top = Math.ceil(peak / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)

  const W = 1000
  const x = (i: number) => (i / (points.length - 1)) * W
  const y = (v: number) => H - (v / top) * H

  /* Catmull-Rom → cubic. The control points are clamped to the segment's own value range, which
     is what stops a smooth curve dipping under a trough it never reached. */
  let d = `M${x(0)} ${y(points[0].value)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)].value
    const p1 = points[i].value
    const p2 = points[i + 1].value
    const p3 = points[Math.min(points.length - 1, i + 2)].value
    const lo = Math.min(p1, p2)
    const hi = Math.max(p1, p2)
    const c1 = Math.min(hi, Math.max(lo, p1 + (p2 - p0) / 6))
    const c2 = Math.min(hi, Math.max(lo, p2 - (p3 - p1) / 6))
    d += ` C${x(i + 1 / 3)} ${y(c1)}, ${x(i + 2 / 3)} ${y(c2)}, ${x(i + 1)} ${y(p2)}`
  }
  const area = `${d} L${W} ${H} L0 ${H} Z`

  /* MONTH NAMES FROM THE BUCKET'S OWN FIRST DAY. `Pt.label` is a date range — "1 Jun – 29 Jun" —
     and the design's axis is JAN…DEC, so the month is read off `from` rather than parsed back
     out of a label that was formatted for a tooltip. */
  /* ONE LABEL PER MONTH. Twelve buckets over a 354-day year are 29.5 days each, so two of them
     can open in the same calendar month — which printed "JUN JUN JUL" and read as a rendering
     fault. The label is drawn only where the month actually changes. */
  const months = points.map((p, i) => {
    if (p.from === undefined) return ''
    const m = dateAt(p.from).getMonth()
    const prev = i > 0 && points[i - 1].from !== undefined ? dateAt(points[i - 1].from!).getMonth() : -1
    return m === prev ? '' : MONTH_ABBR[m]
  })
  const last = points[points.length - 1]

  return (
    /* THE PLOT IS THE FLEXIBLE PART AND THE MONTH ROW IS NOT. `min-h-[240px]` keeps the curve
       readable when the card is short; above that it takes whatever the row gives it. The
       viewBox is fixed and `preserveAspectRatio="none"` lets it stretch, which is safe here
       because every stroke in it carries `vector-effect: non-scaling-stroke`. */
    <div ref={ref} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-[240px] flex-1 items-stretch">
        <div className="relative min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block size-full overflow-visible"
            role="img"
            aria-label={`Animals held, ${points.map((p) => `${p.label} ${fmt(p.value)}`).join(', ')}`}
          >
            <defs>
              <linearGradient id="pop-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={mix(MD3.primary, 0.42)} />
                <stop offset="100%" stopColor={mix(MD3.primary, 0.02)} />
              </linearGradient>
            </defs>
            {/* DASHED, and the dash is in USER units on a stretched viewBox — so the dash
                length is scaled horizontally with the box. `vectorEffect` keeps the stroke a
                true 1px instead of being stretched with it. */}
            {ticks.map((v) => (
              <line
                key={v}
                x1={0}
                x2={W}
                y1={y(v)}
                y2={y(v)}
                stroke={HAIR}
                strokeWidth={1}
                strokeDasharray="6 8"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {/* THE LINE DRAWS ITSELF, LEFT TO RIGHT, AND THE WASH FOLLOWS IT.
                `animate-draw` runs `stroke-dashoffset` from 1 to 0 against `pathLength={1}` and
                a one-unit dash — so the whole curve is a single dash whose offset sweeps it into
                existence. It has been declared in `index.css` since the design system was
                written and nothing used it; a population curve is exactly what it is for.

                THE ORDER IS THE POINT. The wash fades in 160ms behind the line, which is
                `AreaTrend`'s own stagger: the line states the shape and the fill weighs it, so
                the fill arriving first reads as a green block that later grew an edge. */}
            <path
              d={area}
              fill="url(#pop-area)"
              className={animate ? 'animate-veil' : undefined}
              style={animate ? { animationDelay: '160ms' } : undefined}
            />
            <path
              d={d}
              fill="none"
              stroke={ACCENT_INK}
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray="1"
              className={animate ? 'animate-draw' : undefined}
            />
            {/* The latest reading, marked. The design puts a dot and a callout on the curve; the
                dot is the honest half of that — a persistent tooltip pinned to one bucket states
                a figure the reader did not ask for and cannot move. */}
            {/* Lands when the line gets there, not before — a dot sitting at the end of a
                curve that has not been drawn yet is a marker for nothing. */}
            <circle
              cx={W}
              cy={y(last.value)}
              r={5}
              fill={ACCENT_INK}
              vectorEffect="non-scaling-stroke"
              className={animate ? 'animate-pop' : undefined}
              style={
                animate
                  ? { animationDelay: 'var(--dur-reveal)', transformBox: 'fill-box', transformOrigin: 'center' }
                  : undefined
              }
            />
          </svg>
        </div>
        {/* THE AXIS IS ON THE RIGHT, which is the design's choice and the better one here: the
            curve ends at the right edge, so the reader's eye is already there when it wants the
            value. Top-down so the labels line up with the gridlines they belong to, and it
            stretches with the plot rather than being pinned to the viewBox's own height. */}
        <div className="flex shrink-0 flex-col justify-between pl-2" style={{ width: AXIS }}>
          {[...ticks].reverse().map((v) => (
            <span key={v} className="text-tick tabular-nums" style={{ color: FAINT }}>
              {tick(v)}
            </span>
          ))}
        </div>
      </div>
      {/* EVERY OTHER MONTH UNTIL THE CHART IS WIDE ENOUGH FOR TWELVE.
          `flex-1` gives each label a 0 basis, but text cannot shrink below its own min-content —
          so twelve three-letter months in a 294px plot stopped being a row and became
          "JULAUGSEPOCTNOVDEC", each label overrunning its neighbour. Measured at 1024, where the
          card is 328 wide. Odd labels drop out below 420px of CARD, which halves the demand to
          six and leaves each one twice the room it needs. `min-w-0` and `truncate` are the
          backstop: at any width, a label clips inside its own cell rather than pushing the
          next one sideways. */}
      <div className="flex shrink-0" style={{ paddingRight: AXIS, height: FOOT }}>
        {months.map((m, i) => (
          <span
            key={i}
            className={`min-w-0 flex-1 truncate text-center text-tick font-medium tracking-[0.04em] uppercase ${
              i % 2 ? 'hidden @[420px]:block' : ''
            }`}
            style={{ color: FAINT }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * An axis tick, rounded to something a reader can count.
 *
 * `compact()` is the product's general-purpose short form and it keeps one decimal — "50.0K" —
 * which is right beside a headline figure and wrong on a ladder of six, where the decimal is
 * always .0 and reads as precision the tick does not have.
 */
const tick = (v: number): string => {
  if (v === 0) return '0'
  if (v < 1000) return String(Math.round(v))
  const k = v / 1000
  /* A 2.5-step ladder produces halves — 2.5k, 7.5k — so one decimal is kept where the value
     actually has one and dropped where it does not. */
  return `${Number.isInteger(k) ? k : k.toFixed(1)}k`
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* ── 3 · the class composition ───────────────────────────────────────────── */

/**
 * HOW MANY KINDS, BY CLASS — a distribution of SPECIES, not of animals.
 *
 * THE TITLE DECIDES WHICH, and it took the mock to make that obvious. `byClass` in
 * `core/query.ts` groups the HEADCOUNT by class, so drawing it here gave a ring centred on
 * 110,020 under a heading reading "Species Distribution" — the animals, labelled as species. The
 * design's own centre reads 2,411, which is the species count, so the card means kinds. Counted
 * as DISTINCT NAMES per class, which is what a species figure means everywhere else in this
 * product: the Ochre Warbler at seven sites is one Aves, not seven.
 *
 * THE SHARES ARE OF THE RING'S OWN TOTAL and therefore sum to 100. The mock's legend does not —
 * 1,011 + 746 + 361 + 361 + 293 is 2,772 against a centre reading 2,411, and its percentages
 * add to 116 — which is the one defect on a composition chart that a reader always catches.
 *
 * THE RING IS DRAWN HERE RATHER THAN WITH `Donut`, for one reason: `Donut` prints its legend as
 * a wrapped row under the mark and the design's legend is a right-hand column of label / count /
 * share. Same palette (`huesFor`, so a grey is always an absence), same gradient per segment,
 * same gap — the geometry is `Slices`' and the arrangement is the design's.
 */
function SpeciesDistributionCard() {
  const { ref, animate } = usePlay<HTMLElement>()
  const { scope, href } = useScope()
  const rows = useMemo(() => {
    /* One pass over the scoped population, collecting NAMES per class rather than summing
       counts — a Set per class, so a name held at four sites lands once. */
    const names = new Map<string, Set<string>>()
    for (const { species } of population(scope)) {
      let bag = names.get(species.cls)
      if (!bag) names.set(species.cls, (bag = new Set()))
      bag.add(species.name)
    }
    const total = [...names.values()].reduce((n, b) => n + b.size, 0)
    return [...names.entries()]
      .map(([label, bag]) => ({
        id: label,
        label,
        value: bag.size,
        percent: total ? (bag.size / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [scope])
  const total = rows.reduce((n, r) => n + r.value, 0)

  /* SIX SEGMENTS AT MOST, and the tail folded rather than dropped. The dump carries thirteen
     classes and nine of them are a scatter — past six the adjacent hues stop being tellable
     apart and the slices are too thin to find. Every animal stays in the total. */
  const shown = rows.length <= 6 ? rows : [
    ...rows.slice(0, 5),
    {
      id: 'others',
      label: 'Others',
      value: rows.slice(5).reduce((n, r) => n + r.value, 0),
      percent: rows.slice(5).reduce((n, r) => n + r.percent, 0),
    },
  ]
  const hues = huesFor(shown.map((s) => s.label))

  const R = 72
  const ri = R * 0.60
  const GAP = 1.6
  let at = -90
  const rad = (d: number) => (d * Math.PI) / 180
  const pt = (r: number, d: number): [number, number] => [R + r * Math.cos(rad(d)), R + r * Math.sin(rad(d))]

  return (
    <section ref={ref} className={`${CARD} flex flex-col`}>
      <Head title="Species Distribution" span={`${fmt(total)} species`} />
      {/* DONUT ABOVE THE LEGEND WHEN THE CARD IS NARROW, BESIDE IT WHEN IT IS WIDE.
          This is where most of the tablet's dead space was: below 1000px of PAGE the row
          collapsed to one column and this card became 660px wide — with a 144px ring centred
          in it and 250px of nothing either side of the ring, above a legend running the full
          width. Now the card asks its own width (see `content-box` on `CARD`) and puts the two
          halves side by side, so a wide card is a full card. Same components, same ring, same
          rows — only the axis they are arranged on changes. */}
      <div className="flex flex-1 flex-col gap-4 @[380px]:flex-row @[380px]:items-center @[380px]:gap-6">
      <div className="grid shrink-0 place-items-center @[380px]:flex-1">
        <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} role="img" aria-label={
          shown.map((s) => `${s.label} ${fmt(s.value)}`).join(', ')
        }>
          <defs>
            {shown.map((s, i) => (
              <linearGradient key={s.label} id={`cls-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={mix(hues[i], 0.82)} />
                <stop offset="100%" stopColor={hues[i]} />
              </linearGradient>
            ))}
          </defs>
          {shown.map((s, i) => {
            const sweep = total ? (s.value / total) * 360 : 0
            const a = at + GAP / 2
            const b = at + sweep - GAP / 2
            at += sweep
            if (b <= a) return null
            const big = b - a > 180 ? 1 : 0
            const [x1, y1] = pt(R - 2, a)
            const [x2, y2] = pt(R - 2, b)
            const [x3, y3] = pt(ri, b)
            const [x4, y4] = pt(ri, a)
            return (
              /* CLOCKWISE, ONE AFTER ANOTHER. A ring that fades in as one object says nothing
                 about the order of its parts; 60ms apart, largest first, the reveal reads the
                 legend below it in the same direction the eye will. */
              <path
                key={s.label}
                d={`M${x1} ${y1}A${R - 2} ${R - 2} 0 ${big} 1 ${x2} ${y2}L${x3} ${y3}A${ri} ${ri} 0 ${big} 0 ${x4} ${y4}Z`}
                fill={`url(#cls-${i})`}
                className={animate ? 'animate-veil' : undefined}
                style={animate ? { animationDelay: `${i * 60}ms` } : undefined}
              />
            )
          })}
          {/* 32px, which is the design's centre reading and the same size as the strip's
              figures — the ring's total is a headline, not a caption. */}
          <text
            x={R}
            y={R + 11}
            textAnchor="middle"
            className="font-display text-[32px] font-bold tracking-[-.6px] tabular-nums"
            fill={VALUE}
          >
            {fmt(total)}
          </text>
        </svg>
      </div>

      {/* THE LEGEND IS THE DESIGN'S COLUMN, and it is also the only thing that identifies a
          segment — every bright in this palette is under 3:1 against a white card, which the
          house checker accepts precisely because a visible label always accompanies it. */}
      {/* NO HAIRLINES BETWEEN THE ROWS. The design rules nothing here — the dot carries the
          row's identity and the count is right-aligned, which is already two alignments doing
          the work a divider would. Rows are 24px tall on a 37px rhythm, which is the frame's. */}
      <ul className="flex flex-1 flex-col gap-[13px] @[380px]:min-w-0">
        {shown.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className="size-[12px] shrink-0 rounded-[3px]" style={{ background: hues[i] }} aria-hidden />
            <a
              href={href(`browse/species?class=${encodeURIComponent(s.label)}`)}
              className="min-w-0 flex-1 truncate text-body hover:underline"
              style={{ color: INK }}
            >
              {s.label}
            </a>
            <span className="shrink-0 text-body font-semibold tabular-nums" style={{ color: VALUE }}>
              {fmt(s.value)}
            </span>
            {/* THE SHARE IS PARENTHESISED, as the design sets it — which is what stops it
                reading as a second figure beside the count. */}
            <span className="w-12 shrink-0 text-right text-caption tabular-nums" style={{ color: FAINT }}>
              ({s.percent >= 1 ? `${Math.round(s.percent)}%` : '<1%'})
            </span>
          </li>
        ))}
      </ul>
      </div>
    </section>
  )
}

/* ── 4 · eggs ────────────────────────────────────────────────────────────── */

/**
 * The hatch pipeline, from the one part of it the extract records.
 *
 * THE HEADLINE IS REAL. A birth recorded against a bird or a reptile IS a hatch — the extract
 * has no separate hatch row, but it has the event, so `tally('births', …, 'class')` narrowed to
 * the oviparous classes is the recorded hatch count and not a derivation.
 *
 * EGGS LAID AND DISCARDED ARE DERIVED, under the `core/seed.ts` contract and for the reason
 * `speciesEggSeason.ts` sets out at length: the tab was asked for, the table does not exist, and
 * the alternative to deriving is a blank card. The derivation is a pure function of the window's
 * own key, so it is the same number in this session and the next, and `apportion` guarantees
 * hatched + discarded is exactly the laid count rather than approximately it.
 */
const OVIPAROUS = new Set(['Aves', 'Reptilia', 'Amphibia', 'Teleostei', 'Chondrichthyes', 'Holostei', 'Cladistei', 'Dipnoi'])

function EggsCard() {
  const { ref, animate } = usePlay<HTMLElement>()
  const { siteKey, win, span } = useFlowWindow('births')

  const { laid, hatched, discarded } = useMemo(() => {
    const byCls = tally('births', siteKey, win, 'class')
    const hatch = byCls.filter((r) => OVIPAROUS.has(r.label)).reduce((n, r) => n + r.value, 0)
    if (!hatch) return { laid: 0, hatched: 0, discarded: 0 }
    /* A clutch loses some of itself between laying and hatching. The rate is drawn from the
       window's own key — stable forever, never `Math.random` — and kept inside the band the
       species profiles' own clutch figures imply. */
    const survival = 0.62 + draw(`eggs:${win.key}:${siteKey ?? 'all'}`) * 0.18
    const total = Math.round(hatch / survival)
    const [keep, lost] = apportion(total, [hatch, total - hatch])
    return { laid: total, hatched: keep, discarded: lost }
  }, [siteKey, win])

  const share = laid ? (hatched / laid) * 100 : 0

  return (
    <section ref={ref} className={`${CARD} flex flex-col`}>
      <Head title="Eggs" span={span ? `laid · ${span}` : 'laid'} />
      <a href="#/eggs" className="card-press block">
        <Figure value={fmt(laid)} size={32} color={HERO_INK} />
        {/* The bar IS the split — green to the hatch share, then the loss. Two segments of one
            track rather than two bars, because they are parts of the figure above them. */}
        <span className="mt-4 flex h-[6px] overflow-hidden rounded-full" style={{ background: TRACK }} aria-hidden>
          <span
            className={`h-full origin-left ${animate ? 'animate-grow-x' : ''}`}
            style={{ width: `${share}%`, background: MD3.primary }}
          />
          <span
            className={`h-full flex-1 origin-left ${animate ? 'animate-grow-x' : ''}`}
            style={{ background: MD3.tertiary, animationDelay: animate ? '90ms' : undefined }}
          />
        </span>
      </a>
      {/* ONE WELL WITH A DIVIDER, not two boxes. The design puts the pair inside a single pale
          container split by a hairline — which says they are two halves of the figure above
          rather than two independent readings. */}
      {/* `mt-auto` SO IT LANDS ON THE CARD'S FOOT. This row is stretched by the Transfers card
          beside it, which carries four destinations where the design allowed two — and a well
          floating in the middle of a tall card reads as content that failed to load, where the
          same well on the foot reads as the card's base. */}
      <div className={`mt-auto grid grid-cols-2 divide-x ${WELL}`} style={{ borderColor: HAIR }}>
        {[
          { label: 'Hatched', value: hatched, tone: TONE.good, of: share },
          { label: 'Discarded', value: discarded, tone: TONE.bad, of: 100 - share },
        ].map((c, i) => (
          <div key={c.label} className={i ? 'pl-4' : 'pr-4'} style={{ borderColor: HAIR }}>
            <p className="text-body" style={{ color: INK }}>
              {c.label}
            </p>
            <SubFigure value={fmt(c.value)} tone={c.tone} />
            <p className="mt-1 text-tick tabular-nums" style={{ color: FAINT }}>
              {Math.round(c.of)}% of laid
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── 5 · animal transfers ────────────────────────────────────────────────── */

/**
 * Movements out, split by where they went.
 *
 * THE DESIGN'S SPLIT CANNOT BE DRAWN, AND THE REASON IS IN THE DATA. It asks for "External
 * Transfer" against "Site-to-Site", which needs some destinations to be our own sites. Measured
 * against the register: NONE of the fourteen recorded destinations is one of our eleven sites.
 * They are other institutions ("Brightwater Zoological Park", "Hollowpine Wildlife Park" — a
 * different park from our Hollowpine Wetland Quarter Park), plus "Wild Release", "External
 * Adoption" and "Non-Disclosure Site". Every transfer in the extract left the collection, so a
 * Site-to-Site cell would read 0 on every window there is.
 *
 * So the split is by WHAT KIND of destination, which is a real partition of the same tally and
 * the more useful one: a release to the wild and a loan to another zoo are different events in
 * a way that "external" does not capture. The parts sum to the headline exactly, because they
 * are one tally bucketed rather than two counts.
 */
const DEST_KINDS: { label: string; tone: string; test: (d: string) => boolean }[] = [
  { label: 'Wild release', tone: MD3.primary, test: (d) => /wild release/i.test(d) },
  { label: 'Adoption', tone: MD3.addPrimary, test: (d) => /adoption/i.test(d) },
  { label: 'Undisclosed', tone: '#afb6b5', test: (d) => /non-disclosure|not recorded|undisclosed/i.test(d) },
  /* Everything left is a named institution. Last, so it is the fall-through rather than a
     pattern that has to anticipate fourteen park names. */
  { label: 'Institution', tone: MD3.tertiary, test: () => true },
]

function TransfersCard() {
  const { siteKey, win, span } = useFlowWindow('transfers')

  const { total, rows } = useMemo(() => {
    const dest = tally('transfers', siteKey, win, 'detail')
    const buckets = DEST_KINDS.map((k) => ({ ...k, value: 0 }))
    for (const r of dest) {
      const b = buckets.find((k) => k.test(r.label))
      if (b) b.value += r.value
    }
    const kept = buckets.filter((b) => b.value > 0)
    return { total: kept.reduce((n, b) => n + b.value, 0), rows: kept }
  }, [siteKey, win])

  return (
    <section className={CARD}>
      <Head title="Animal Transfers" span={span ?? 'movements'} />
      <a href="#/transfers" className="card-press block">
        <Figure value={fmt(total)} size={32} color={HERO_INK} />
      </a>
      {total === 0 ? (
        <p className="mt-4 text-small" style={{ color: MUTED }}>
          No transfers recorded.
        </p>
      ) : (
        <div className={`mt-5 grid grid-cols-2 gap-x-4 gap-y-3 ${WELL}`}>
          {rows.slice(0, 4).map((c) => (
            <div key={c.label}>
              {/* A 32px TINTED TILE, which is the design's sub-header icon container. */}
              <span
                className="grid size-8 place-items-center rounded-[10px]"
                style={{ backgroundColor: mix(c.tone, 0.14) }}
                aria-hidden
              >
                <ArrowLeftRight size={15} strokeWidth={2} style={{ color: c.tone }} />
              </span>
              <p className="mt-2 text-caption" style={{ color: INK }}>
                {c.label}
              </p>
              <SubFigure value={fmt(c.value)} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ── 6 · pharmacy ────────────────────────────────────────────────────────── */

/**
 * What the pharmacy dispensed, and what it dispensed most of.
 *
 * NO SPEND FIGURE, and the card does not print one. The design leads on "₹9.8L Medicine spend";
 * the pharmacy flow carries a medicine name and a route per event and the extract has no
 * quantity, no unit price and no cost column anywhere — so a rupee figure here would be the one
 * number on the home screen with nothing at all behind it. Dispensings is the same question the
 * source can answer, and the table under it is the design's, unchanged and real.
 */
function PharmacyCard() {
  const { siteKey, win, span } = useFlowWindow('pharmacy')

  const { total, top } = useMemo(() => {
    const rows = tally('pharmacy', siteKey, win, 'detail')
    return {
      total: rows.reduce((n, r) => n + r.value, 0),
      top: rows.slice(0, 3),
    }
  }, [siteKey, win])

  return (
    /* Same stretch problem as Eggs: this card's content is the shortest in its row, so the
       well goes to the foot rather than floating with 114px of white under it — measured. */
    <section className={`${CARD} flex flex-col`}>
      <Head title="Pharmacy" span={span ?? 'dispensings'} />
      <a href="#/pharmacy" className="card-press block">
        <Figure value={fmt(total)} size={32} color={HERO_INK} />
      </a>
      <div className={`mt-auto ${WELL}`}>
        <p className="text-body" style={{ color: INK }}>
          Top used medicines
        </p>
        {top.length === 0 ? (
          <p className="mt-2 text-caption" style={{ color: FAINT }}>
            Nothing dispensed.
          </p>
        ) : (
          /* THREE ACROSS, which is the design's row — a name over its count, not a name beside
             it. The names in this extract are long ("compound Sodium lactate injection IP"), so
             they WRAP rather than truncate: clipped at one line, three compounds are
             indistinguishable from each other. */
          /* THREE ACROSS ONLY WHEN THE CARD CAN HOLD THREE. At 251px of card — an iPad
             portrait's third of the row — three columns are 65px each, and a compound name
             clamped into 65px is unreadable. Below 260 they become rows. */
          <div className="mt-3 grid grid-cols-1 gap-x-3 gap-y-2 @[260px]:grid-cols-3">
            {top.map((r) => (
              <div key={r.key} className="flex min-w-0 flex-col justify-between">
                {/* `text-tick` and two lines. The design's categories are one word each
                    ("Antibiotics"); the extract's are compounds — "compound Sodium lactate
                    injection IP" — so the cell takes the smaller size and clamps rather than
                    setting three words per line down a 90px column. */}
                <p className="line-clamp-2 text-tick leading-[1.35]" style={{ color: MUTED }}>
                  {r.label}
                </p>
                <SubFigure value={fmt(r.value)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ── 7 · hospital ────────────────────────────────────────────────────────── */

/**
 * Admissions, split the only way the record allows.
 *
 * THE DESIGN ASKS FOR RECOVERED / IN CARE / DIED AND THERE IS NO OUTCOME COLUMN. An admission
 * carries a presenting sign and a severity; nothing in the extract says how it ended. Printing
 * three outcome figures would be inventing the most consequential number on the card — so the
 * bar is the SEVERITY mix, which is recorded verbatim, and the card is headed by what it is.
 *
 * The mock's own numbers do not reconcile either: 1,842 + 87 + 67 is 1,996 under a headline of
 * 42, and its percentages add to 99.
 */
const SEVERITY_TONE: Record<string, string> = {
  Mild: MD3.primary,
  Moderate: '#e4b819',
  High: MD3.tertiary,
  Extreme: TONE.bad,
}

function HospitalCard() {
  const { ref, animate } = usePlay<HTMLElement>()
  const { siteKey, win, span } = useFlowWindow('admissions')

  const { total, rows } = useMemo(() => {
    const all = tallyFacet('admissions', siteKey, win, 'severity').filter((r) => r.value > 0)
    /* "Not recorded" is a value the source holds, not a gap, so it keeps its share and takes
        the neutral — the same rule `huesFor` applies on every other composition here. */
    const order = ['Mild', 'Moderate', 'High', 'Extreme', 'Not recorded']
    const sorted = [...all].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
    return { total: sorted.reduce((n, r) => n + r.value, 0), rows: sorted }
  }, [siteKey, win])

  return (
    <section ref={ref} className={`${CARD} flex flex-col`}>
      <Head title="Hospital" span={span ?? 'admissions'} />
      <a href="#/hospital" className="card-press block">
        <span className="flex items-baseline gap-2">
          <Figure value={fmt(total)} size={32} color={HERO_INK} />
          <span className="text-caption" style={{ color: ACCENT_INK }}>
            Admitted
          </span>
        </span>
      </a>

      {total === 0 ? (
        <p className="mt-4 text-small" style={{ color: MUTED }}>
          No admissions recorded.
        </p>
      ) : (
        <>
          {/* SEGMENTS WITH A GAP, NOT A STACKED BAR. The design draws three separately-rounded
              bars 2px apart, which is what makes a 1%-of-the-total segment still visible as its
              own object — inside a single continuous track it would be a sliver of colour
              indistinguishable from an edge. A 2% floor on the width for the same reason. */}
          <div className="mt-6 flex h-[42px] shrink-0 gap-[2px]">
            {rows.map((r, i) => (
              <span
                key={r.key}
                className={`origin-left rounded-[11px] ${animate ? 'animate-grow-x' : ''}`}
                style={{
                  width: `${Math.max(2, (r.value / total) * 100)}%`,
                  background: SEVERITY_TONE[r.label] ?? '#c9c9c4',
                  animationDelay: animate ? `${i * 60}ms` : undefined,
                }}
              />
            ))}
          </div>
          {/* THE STATS ARE A ROW OF COLUMNS, label over figure over share, which is the
              design's `Stats` frame. `flex-wrap` because this extract carries five severity
              values where the design allowed for three. */}
          {/* `mt-auto` for the same reason Eggs and Pharmacy have it: this card is the shortest
              in its row and the slack belongs between the bar and the stats, not after them. */}
          <ul className="mt-auto flex flex-wrap gap-x-10 gap-y-4 pt-5">
            {rows.map((r) => (
              <li key={r.key}>
                <p className="text-body" style={{ color: INK }}>
                  {r.label}
                </p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span
                    className="font-display text-[26px] leading-[1.2] font-bold tabular-nums"
                    style={{ color: SEVERITY_TONE[r.label] ?? MUTED }}
                  >
                    {fmt(r.value)}
                  </span>
                  <span className="text-caption tabular-nums" style={{ color: FAINT }}>
                    ({Math.round((r.value / total) * 100)}%)
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/* ── 8 · medical ─────────────────────────────────────────────────────────── */

/**
 * Who is under care, and how much of the collection is covered.
 *
 * THE HEADLINE IS THE `health` LEVEL — the metric's own word is "under care", and it is a
 * clinical statement about a live prescription or a diagnosis inside ninety days rather than a
 * health-status column, which the extract does not have. The two dials are the vaccination and
 * deworming RATES, which do exist as rates with their own denominators, so each states its
 * covered count over the collection it is a share of instead of a bare number.
 */
function MedicalCard() {
  const { scope } = useScope()
  const care = useMemo(() => figure(scope, 'health'), [scope])
  const vax = useMemo(() => figure(scope, 'vaccination'), [scope])
  const worm = useMemo(() => figure(scope, 'dewormingCover'), [scope])

  return (
    <section className={`${CARD} flex flex-col`}>
      <Head title="Medical" span="under care" />
      <a href="#/health" className="card-press block">
        <span className="flex items-baseline gap-2">
          <Figure value={fmt(Math.round(care.value))} size={32} color={HERO_INK} />
          <span className="text-caption" style={{ color: ACCENT_INK }}>
            Animals under care
          </span>
        </span>
      </a>
      {/* TWO GAUGES, AND THEY ARE NOT `Dial`. That mark paints its arc in the ambient accent, so
          both readings came out the same green — where the design deliberately gives deworming
          its own hue, because two identical gauges side by side invite the reader to compare
          two numbers with different denominators as if they were one series. Everything else is
          the house's: the track is `TRACK`, the arcs are brand tones, the type is the scale. */}
      {/* Centred in whatever the row leaves, so a taller neighbour does not park two gauges
          against the card's head with a band of white beneath them. */}
      {/* SIDE BY SIDE FROM 260px OF CARD, not 420. Stacking them made the Medical card 515px
          tall on a tablet, which stretched the Hospital card beside it to the same height and
          left 116px of white in it — one card's internal breakpoint setting another card's
          dead space. The gauge is happy at 130px wide; `max-w` on the mark is what lets it be. */}
      <div className="mt-6 grid flex-1 place-content-center grid-cols-1 gap-4 @[260px]:grid-cols-2">
        <HalfGauge
          percent={vax.percent ?? 0}
          value={fmt(Math.round(vax.value))}
          label="Vaccinated"
          of={vax.of ? `of ${fmt(Math.round(vax.of))} animals` : undefined}
          tone={MD3.primary}
        />
        <HalfGauge
          percent={worm.percent ?? 0}
          value={fmt(Math.round(worm.value))}
          label="Dewormed"
          of={worm.of ? `of ${fmt(Math.round(worm.of))} animals` : undefined}
          tone="#e4b819"
        />
      </div>
    </section>
  )
}

/**
 * The design's half-gauge — a 180° arc, a value in the well of it, a label under.
 *
 * THE DOT IS AT THE ARC'S END, not at its top, and it moves with the reading. That is the one
 * part of this mark that carries information the arc length does not already: at 9% of the
 * collection the sweep is short enough to be easy to miss, and a dot at its head is where the
 * eye lands.
 *
 * A FLOOR OF ONE DEGREE ON THE SWEEP. The real vaccination coverage on this extract is single
 * digits, and an arc rounded to nothing reads as a gauge that failed to render rather than as a
 * low number.
 */
function HalfGauge({
  percent,
  value,
  label,
  of,
  tone,
}: {
  percent: number
  value: string
  label: string
  of?: string
  tone: string
}) {
  const { ref, animate } = usePlay<HTMLDivElement>()
  const share = Math.max(0, Math.min(100, percent))
  const R = 88
  const T = 14
  const cx = 100
  const cy = 100
  const arc = (from: number, to: number) => {
    const rad = (d: number) => ((d - 180) * Math.PI) / 180
    const x1 = cx + R * Math.cos(rad(from))
    const y1 = cy + R * Math.sin(rad(from))
    const x2 = cx + R * Math.cos(rad(to))
    const y2 = cy + R * Math.sin(rad(to))
    return `M${x1} ${y1}A${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
  }
  const sweep = Math.max(1, (share / 100) * 180)
  const rad = ((sweep - 180) * Math.PI) / 180
  const dotX = cx + R * Math.cos(rad)
  const dotY = cy + R * Math.sin(rad)

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative w-full max-w-[232px] min-w-[112px]">
        <svg viewBox="0 0 200 112" className="w-full" aria-hidden>
          <path d={arc(0, 180)} fill="none" stroke={TRACK} strokeWidth={T} strokeLinecap="round" />
          {/* THE ARC SWEEPS FROM ITS OWN START, which is what a gauge should do — the reading
              is the arc's LENGTH, so growing that length is the animation the mark is about.
              Same `animate-draw` as the curve above: one dash the width of the path, offset
              swept to zero. */}
          <path
            d={arc(0, sweep)}
            fill="none"
            stroke={tone}
            strokeWidth={T}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            className={animate ? 'animate-draw' : undefined}
          />
          <circle
            cx={dotX}
            cy={dotY}
            r={T / 2 + 2}
            fill={tone}
            stroke="#ffffff"
            strokeWidth={3}
            className={animate ? 'animate-pop' : undefined}
            style={
              animate
                ? { animationDelay: 'var(--dur-reveal)', transformBox: 'fill-box', transformOrigin: 'center' }
                : undefined
            }
          />
        </svg>
        <p
          className="absolute inset-x-0 bottom-0 text-center font-display text-[22px] leading-[1.1] font-bold tabular-nums @[300px]:text-[26px]"
          style={{ color: VALUE }}
        >
          {value}
        </p>
      </div>
      <p className="mt-1 text-small" style={{ color: INK }}>
        {label}
      </p>
      {of && (
        <p className="mt-0.5 text-caption tabular-nums" style={{ color: FAINT }}>
          {of}
        </p>
      )}
    </div>
  )
}

/* ── the page body ───────────────────────────────────────────────────────── */

/**
 * The eight cards, in the design's four rows.
 *
 * NO SECTION HEADINGS. The old home ruled and named every block — Executive Overview,
 * Operational Status, Trends, Collection Watch — because it was an argument read top to bottom.
 * A dashboard is scanned, and each card here names itself; a row of uppercase micro-type above
 * every pair would be labelling the labels.
 *
 * THE COLUMN RATIOS ARE THE DESIGN'S, expressed against the CONTAINER rather than the window,
 * so the grid collapses when the executive panel opens beside it — every other grid in this
 * product measures the same way.
 */
export function HomeDashboard() {
  return (
    /* 16px BETWEEN ROWS AND 4px WITHIN THEM, both measured off the frame. The design's rows sit
       16px apart and its cards 4px, which is a deliberate two-level rhythm: the tight gutter
       groups a row into one band and the looser one separates the bands. `--gap` is 12px and
       would flatten the distinction, so the two numbers are stated here.

       THE STRIP IS NOT IN HERE ANY MORE — it moved into `HomeBanner`, which is where the frame
       puts it. See the note there: it belongs to the hero composition, and pulling it up into
       the artwork with a negative margin from this side could not keep the artwork's bottom edge
       in the right place. */
    <main className="flex flex-col gap-4 px-[var(--gutter)] pt-4 pb-[max(40px,env(safe-area-inset-bottom))]">
      {/* 2:1 ONLY WHERE 2:1 FITS. The design's ratio needs about 900px of column to leave the
          composition its 360; below that the two go to equal halves, and below 560 they stack.
          It was a single `@[1000px]`, which meant an iPad landscape — 708px of column — got one
          stacked column of 660px-wide cards. That was the "too much space". */}
      <Reveal>
        <div className="grid gap-1 @[560px]:grid-cols-2 @[900px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <PopulationTrendCard />
          <SpeciesDistributionCard />
        </div>
      </Reveal>

      {/* Two-up from 480 rather than 680: at 554 of column the old rule stacked all three, and
          a 506px-wide Eggs card is a 466 figure with 400px of air beside it. */}
      <Reveal>
        <div className="grid gap-1 @[480px]:grid-cols-2 @[900px]:grid-cols-3">
          <EggsCard />
          <TransfersCard />
          <PharmacyCard />
        </div>
      </Reveal>

      <Reveal>
        <div className="grid gap-1 @[560px]:grid-cols-2">
          <HospitalCard />
          <MedicalCard />
        </div>
      </Reveal>
    </main>
  )
}
