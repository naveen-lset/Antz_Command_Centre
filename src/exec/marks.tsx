/**
 * THE VISUALISATION LANGUAGE — one mark per KIND of question.
 *
 * WHAT WAS WRONG. `system.tsx` holds thirty marks and the module pages reached for four of
 * them: a title, a number, a horizontal bar and a chevron, repeated down every card on every
 * page. Regulatory standing was two bars. CITES was three bars. The Wildlife Protection Act
 * was three more of the same bars. Sites were six, species were twenty. None of those
 * questions is the same question — one is a part of a whole, one is a comparison of three
 * named classes, one is a ranking — and drawing them identically told the reader they were.
 * The product read as an analytics dashboard rather than as a brief.
 *
 * THE RULE THIS FILE ENCODES. The mark is chosen by the SHAPE OF THE QUESTION, and there is
 * exactly one mark per shape:
 *
 *   over time            `AreaTrend`      a level, scrubbable, with the period before it
 *                        `EventTrend`     counts per period, which are columns and not a line
 *                        `DayHeat`        where in the window the events fell
 *   part of a whole      `SplitRing`      three or more parts, with the total at the centre
 *                        `PercentSplit`   exactly two parts, stated as two percentages
 *                        `Ribbon`         the one-line composition other marks compose with
 *   comparison           `CompareTiles`   two to four NAMED classes, each with its own facts
 *                        `RankList`       an ordered list of many, with rank and share
 *                        `Concentration`  how much of the whole the leaders hold, in one line
 *   direction            `FlowSplit`      in against out, and the net between them
 *   outcome              `OutcomeSplit`   one population, split by how it ended
 *                        `Lifecycle`      stages in sequence, each a share of the first
 *   events               `IncidentRail`   dated records, with status
 *   hierarchy            `Treemap`        one level of a hierarchy, sized by weight
 *
 * FIVE HOUSE RULES, which is what keeps these marks reading as one system.
 *
 * ONE SERIES COLOUR. Every mark here fills with the accent in scope and strokes with its
 * darker companion (`strokeOf`); where a mark has parts, the parts are LIGHTNESS steps of
 * that accent (`step`), never cycled hues. Status colours are reserved for status — a
 * segment is never red because it is small.
 *
 * NO CHROME THAT ISN'T READ. No gridlines, no legends where a labelled row will do, no axis
 * gutter: the scale is stated as two faint figures inside the plot, and the dates as two
 * labels under it. What is removed is removed because nobody was reading it, not to be
 * minimal.
 *
 * THE NUMBER IS THE HEADLINE, THE MARK IS THE CONTEXT. Every one of these leads with a
 * figure set in the page's own display face and puts the drawing underneath. That ordering is
 * the whole difference between an executive read and a chart.
 *
 * TOUCH AND POINTER ARE THE SAME GESTURE. The two time-series marks are scrubbable: drag
 * across them and the headline figure becomes the value under your finger. `touch-action:
 * pan-y` keeps the page scrolling vertically while the mark takes the horizontal.
 *
 * NOTHING IS INVENTED. Every mark renders what it is handed and states an empty case rather
 * than filling a hole — a window with one reading in it says so instead of drawing a line
 * between a point and itself.
 */

import type React from 'react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePlay } from '../motion'
import {
  ACCENT_INK,
  FAINT,
  Figure,
  HAIR,
  HERO_INK,
  MD3,
  MUTED,
  TONE,
  TRACK,
  VALUE,
  compact,
  fmt,
  mix,
  step,
  strokeOf,
  useAccent,
  type Tone,
} from './system'

/* The rail lives in `system.tsx` because `Bars` needs it there; it belongs to this language,
   so this is where the rest of the product imports it from. */

/* ── shared pieces ───────────────────────────────────────────────────────── */

const clamp01 = (n: number) => Math.max(0, Math.min(100, n))

/** The keyboard ring the two scrubbable marks wear. Tailwind's default is blue on sage. */
const FOCUS_RING = { '--tw-ring-color': 'rgba(55,189,105,0.45)' } as React.CSSProperties

/** A kicker — the uppercase micro-label that names a figure without competing with it. */
export function Kicker({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      /* WRAPS, NEVER TRUNCATES. "Schedule III" in a third of a phone card came out as
         "SCHEDULE …", which names nothing — the kicker IS the identity of the tile. */
      className="block text-overline font-medium uppercase"
      style={{ color: color ?? MUTED }}
    >
      {children}
    </span>
  )
}

/** A signed number as a delta token — "+1,204", "−8", "0". */
export const delta = (n: number, unit = ''): string =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}${unit}`

const deltaInk = (n: number) => (n > 0 ? TONE.good : n < 0 ? TONE.bad : FAINT)

/** A percentage, kept honest below 1% — "0.4%" rather than a rounded "0%". */
export const pct = (n: number): string => `${n >= 1 || n === 0 ? Math.round(n) : n.toFixed(n < 0.1 ? 2 : 1)}%`

/**
 * The chevron column, reserved whether the row opens or not.
 *
 * Same rule `Facts` and `TapRow` set: a chevron that appears only on some rows steps every
 * figure beside it in and out by fourteen pixels.
 */
function Chev({ on }: { on: boolean }) {
  return (
    <span className="w-[11px] shrink-0" style={{ color: on ? ACCENT_INK : 'transparent' }} aria-hidden>
      <ChevronRight size={14} strokeWidth={2.25} />
    </span>
  )
}

/**
 * SEGMENTED COMPOSITION, as one line.
 *
 * The atom of every part-to-whole mark here: `PercentSplit` puts it under two percentages,
 * `OutcomeSplit` puts it over its outcome rows, and the CITES card uses it bare. Segments are
 * lightness steps of the accent and carry a 2px gap, without which two adjacent steps read as
 * one band.
 */
export function Ribbon({
  items,
  height = 10,
  colors,
}: {
  items: { label: string; value: number; tone?: Tone; color?: string }[]
  height?: number
  /** Explicit fills, for a scale whose colours mean something outside this app. */
  colors?: string[]
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const total = items.reduce((n, i) => n + i.value, 0) || 1
  return (
    <div ref={ref} className="flex w-full gap-[2px]" style={{ height }} aria-hidden>
      {items.map((it, i) => (
        <span
          key={it.label}
          className={`h-full origin-left first:rounded-l-full last:rounded-r-full ${animate ? 'animate-grow-x' : ''}`}
          style={{
            /* A floor so a real but tiny part is a visible sliver rather than nothing —
               0.4% of a ribbon is under a pixel on a phone. */
            width: `${Math.max(0.8, (it.value / total) * 100)}%`,
            backgroundColor:
              it.color ?? colors?.[i] ?? (it.tone && it.tone !== 'neutral' ? TONE[it.tone] : mix(accent, step(i))),
            animationDelay: animate ? `${i * 70}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}

/* ── time ────────────────────────────────────────────────────────────────── */

export interface Pt {
  /** The bucket's own date or range — "31 Jul", "25 – 31 Jul". */
  label: string
  value: number
  /**
   * The bucket's own span, in day indices — present where the mark is drillable.
   *
   * A BUCKET IS NOT ALWAYS ONE DAY, which is the whole reason this is a span and not a `day`.
   * `pointsOf` caps a long window at 24 or 30 buckets, so on a six-month range one column is a
   * week. A drill that took a single day off a column labelled "25 – 31 Jul" would open one
   * seventh of the figure the reader tapped — the same class of error as a card whose sheet
   * reads a different window from the card.
   */
  from?: number
  to?: number
}

/**
 * Scrubbing, for both time marks.
 *
 * A pointer down or a drag selects the nearest bucket; leaving with a mouse releases it, a
 * touch leaves it selected, which is what a thumb expects. Arrow keys move it, so the mark is
 * readable without a pointer at all.
 */
function useScrub(n: number) {
  const [at, setAt] = useState<number | null>(null)

  const pickFrom = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || n < 2) return
    const t = (clientX - r.left) / r.width
    setAt(Math.max(0, Math.min(n - 1, Math.round(t * (n - 1)))))
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => pickFrom(e.clientX, e.currentTarget)
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    /* A mouse hovers; a finger has to be down. Without the second test a touch scroll past
       the card would drag the readout along with it. */
    if (e.pointerType !== 'mouse' && e.buttons === 0) return
    pickFrom(e.clientX, e.currentTarget)
  }
  const onPointerLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setAt(null)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return
    e.preventDefault()
    if (e.key === 'Escape') return setAt(null)
    const from = at ?? n - 1
    setAt(Math.max(0, Math.min(n - 1, from + (e.key === 'ArrowRight' ? 1 : -1))))
  }

  return { at, handlers: { onPointerDown, onPointerMove, onPointerLeave, onKeyDown } }
}

/** The readout above a time mark: the value under the cursor, what it is, and its delta. */
function PlotHead({
  value,
  aside,
  format,
  unit,
  live = false,
}: {
  value: number
  /**
   * The change, rendered BESIDE the figure rather than in a right-hand column.
   *
   * It used to sit right-aligned with the compared span named under it, which put the two
   * halves of one sentence at opposite ends of the card and printed a date range the reader had
   * already chosen in the filter. A delta belongs against the number it moved.
   */
  aside?: ReactNode
  format: (n: number) => string
  unit?: string
  /** True while a finger is on the mark — the figure then tracks rather than counts up. */
  live?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
      <div className="min-w-0">
        {/* A SCRUBBED FIGURE DOES NOT COUNT UP. `Figure` tweens to every new value, which is
            right when a card scrolls into view and wrong under a moving finger — the number
            would chase the cursor a third of a second behind it. Same face, same size, no
            tween. */}
        {live ? (
          <span className="inline-flex items-baseline gap-1">
            <span
              className="font-display font-bold tabular-nums"
              style={{
                fontSize: 'calc(34px * var(--fig-scale))',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: HERO_INK,
              }}
            >
              {format(value)}
            </span>
            {unit && <span className="text-small" style={{ color: FAINT }}>{unit}</span>}
          </span>
        ) : (
          <Figure value={format(value)} size={32} color={HERO_INK} unit={unit} />
        )}
        {/* THE CAPTION LINE IS GONE. It restated the window the global filter already shows
            ("births · 1 – 20 May 2026") or the axis already labels ("20 May · animals held"),
            once per chart, three charts to a page. */}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}

/** Two dates under a plot — the first bucket and the last, and the middle where there is room. */
function PlotAxis({ points }: { points: Pt[] }) {
  const mid = points[Math.floor((points.length - 1) / 2)]
  return (
    <div className="mt-2 flex items-baseline justify-between gap-2 text-tick" style={{ color: FAINT }}>
      <span className="truncate">{points[0]?.label}</span>
      {points.length > 4 && <span className="hidden truncate @[440px]:block">{mid?.label}</span>}
      <span className="truncate">{points[points.length - 1]?.label}</span>
    </div>
  )
}

/** A comparison against the same span, one span earlier. */
export interface Compare {
  /** "Previous 30 days" — names the span, never explains it. */
  label: string
  value: number
  /** The earlier span's own curve, drawn as a ghost. Same length as `points`, or omitted. */
  series?: number[]
}

/**
 * A LEVEL OVER TIME — the population curve, and the one mark on the page with a scale.
 *
 * THE AXIS IS FITTED, NOT ZERO-BASED, AND IT SAYS SO. A collection of 214,554 that moved by
 * 1,200 over a month is, on a zero-based axis, a horizontal line: technically honest and
 * completely unreadable, which is its own kind of dishonesty because the reader concludes
 * nothing moved. So the band is fitted to the data and BOTH ENDS ARE LABELLED — the floor is
 * printed at the bottom right of the plot, where a zero would be if there were one. A fitted
 * axis with its floor stated cannot be mistaken for a zero-based one; a fitted axis with no
 * labels is the oldest chart lie there is. Counts (`EventTrend` below) do start at zero,
 * because for a count zero is a real reading rather than a distant origin.
 *
 * THE PREVIOUS PERIOD IS DRAWN, NOT JUST STATED. `compare.series` puts the preceding span of
 * equal length behind the current one as a thin dashed line in neutral ink — never in the
 * accent, so it cannot be read as part of the series it is being compared to.
 */
export function AreaTrend({
  points,
  unit,
  compare,
  height = 156,
  baseline = 'fit',
  tone,
  format = fmt,
  empty = 'One reading in this window — widen it to see the curve.',
}: {
  points: Pt[]
  /** What the figure counts — "animals held". Never a sentence. */
  unit?: string
  compare?: Compare
  height?: number
  baseline?: 'fit' | 'zero'
  tone?: Tone
  format?: (n: number) => string
  empty?: string
}) {
  const accent = useAccent()
  const line = tone && tone !== 'neutral' ? TONE[tone] : strokeOf(accent)
  const fill = tone && tone !== 'neutral' ? TONE[tone] : accent
  const { ref, animate } = usePlay()
  const { at, handlers } = useScrub(points.length)

  const geom = useMemo(() => {
    const values = points.map((p) => p.value)
    const top = Math.max(...values, 0)
    const bottom = baseline === 'zero' ? 0 : Math.min(...values, top)
    /* THE BAND IS WIDER THAN THE DATA, BY A THIRD OF THE DATA'S OWN RANGE AT EACH END.
       A headcount that moved 4,000 in a month, fitted edge to edge, fills the card with a
       sawtooth: the day-to-day wobble in the ledger becomes the loudest thing on the page and
       reads as a crisis rather than as noise. Given room above and below, the same series reads
       as a band that drifts — which is what it is. The two figures printed on the plot are the
       BAND's ends, not the data's, exactly as a rounded axis is on any chart. */
    /* Rounded outward to whole units, because the band's ends are PRINTED: an unrounded
       floor came out as "166.62 animals", which is not a quantity anything can hold. */
    const range = top - bottom
    const hi = baseline === 'zero' ? top : Math.ceil(top + range * 0.34)
    const lo = baseline === 'zero' ? 0 : Math.max(0, Math.floor(bottom - range * 0.34))
    const spread = hi - lo || 1
    const W = 300
    const H = 100
    const PAD = 7
    const y = (v: number) => (hi === lo ? H / 2 : PAD + (1 - (v - lo) / spread) * (H - PAD * 2))
    const x = (i: number) => (i / Math.max(1, points.length - 1)) * W
    return { hi, lo, W, H, y, x, at: values.map((v, i) => [x(i), y(v)] as const) }
  }, [points, baseline])

  if (points.length < 2) {
    return (
      <p className="py-3 text-small" style={{ color: MUTED }}>
        {empty}
      </p>
    )
  }

  const shownIndex = at ?? points.length - 1
  const shown = points[shownIndex]
  const ghost = compare?.series && compare.series.length === points.length ? compare.series : undefined
  const against = ghost ? ghost[shownIndex] : at === null ? compare?.value : undefined
  const move = against !== undefined ? shown.value - against : undefined

  const path = curve(geom.at)
  const ghostPath = ghost ? curve(ghost.map((v, i) => [geom.x(i), geom.y(v)] as const)) : undefined
  const cursorX = (shownIndex / (points.length - 1)) * 100
  const cursorY = (geom.y(shown.value) / geom.H) * 100

  return (
    <div ref={ref}>
      <PlotHead
        value={shown.value}
        format={format}
        live={at !== null}
        aside={
          move !== undefined ? (
            <>
              <span className="text-small font-medium tabular-nums" style={{ color: deltaInk(move) }}>
                {delta(move)}
              </span>
            </>
          ) : undefined
        }
      />

      {/* THE PLOT IS A DIV, NOT JUST AN SVG. The viewBox is stretched to the card's width so
          the mark can be short and wide, which means anything drawn inside it — a cursor dot,
          a label — is stretched with it. Those live in HTML on top, positioned as percentages,
          and are therefore round and upright at any width. */}
      <div
        /* Focusable, because the mark is readable by keyboard — but wearing the app's own ring
           rather than the browser's electric blue over a sage card. */
        className="relative mt-4 cursor-crosshair rounded-[8px] outline-none select-none focus-visible:ring-2"
        style={{ height, touchAction: 'pan-y', outlineColor: 'transparent', ...FOCUS_RING }}
        role="img"
        tabIndex={0}
        aria-label={`${unit ?? 'Series'}: ${format(points[points.length - 1].value)} at ${points[points.length - 1].label}. Arrow keys read earlier values.`}
        {...handlers}
      >
        <svg
          viewBox={`0 0 ${geom.W} ${geom.H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id={`wash-${cursorY.toFixed(0)}-${geom.hi}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity={0.22} />
              <stop offset="100%" stopColor={fill} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          {/* One hairline, at the floor of the band. Gridlines were the first thing to go:
              nobody reads the third line up, and four of them turn a curve into a table. */}
          <line
            x1={0}
            x2={geom.W}
            y1={geom.H - 0.5}
            y2={geom.H - 0.5}
            stroke={HAIR}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`${path} L ${geom.W} ${geom.H} L 0 ${geom.H} Z`}
            fill={`url(#wash-${cursorY.toFixed(0)}-${geom.hi})`}
            className={animate ? 'animate-veil' : undefined}
            style={animate ? { animationDelay: '160ms' } : undefined}
          />
          {ghostPath && (
            <path
              d={ghostPath}
              fill="none"
              stroke={MD3.outline}
              strokeWidth={1.25}
              strokeDasharray="3 3"
              opacity={0.75}
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={path}
            fill="none"
            stroke={line}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={animate ? 'animate-veil' : undefined}
            style={animate ? { animationDelay: '90ms' } : undefined}
          />
        </svg>

        {/* The scale, as two figures inside the plot rather than an axis beside it. */}
        <span className="absolute top-0 right-0 text-tick tabular-nums" style={{ color: FAINT }}>
          {compact(geom.hi)}
        </span>
        <span className="absolute right-0 bottom-0 text-tick tabular-nums" style={{ color: FAINT }}>
          {compact(geom.lo)}
        </span>

        <span
          className="pointer-events-none absolute inset-y-0 w-px"
          style={{ left: `${cursorX}%`, backgroundColor: at === null ? 'transparent' : mix(accent, 0.5) }}
          aria-hidden
        />
        <span
          className={`pointer-events-none absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-[1.5px] ring-white ${
            animate && at === null ? 'animate-pop' : ''
          }`}
          style={{
            left: `${cursorX}%`,
            top: `${cursorY}%`,
            backgroundColor: line,
            animationDelay: animate ? '520ms' : undefined,
          }}
          aria-hidden
        />
      </div>
      <PlotAxis points={points} />

      {ghost && (
        <p className="mt-2 flex items-center gap-1.5 text-caption" style={{ color: FAINT }}>
          <span className="inline-block h-px w-[14px]" style={{ backgroundColor: MD3.outline }} aria-hidden />
          {compare?.label}
        </p>
      )}
    </div>
  )
}

/**
 * COUNTS OVER TIME — the same frame as `AreaTrend`, drawn as columns.
 *
 * A line through "births per day" claims a value between the days and there isn't one: eleven
 * births on the 3rd and none on the 4th is not a slope. So an event flow gets columns, a level
 * gets a curve, and the two are never swapped. `marks` puts a dot over the buckets worth
 * naming — the peak day, the day an outbreak was declared — which is the "line + event
 * markers" shape without a second axis.
 */
export function EventTrend({
  points,
  unit,
  compare,
  height = 118,
  tone,
  marks,
  onPick,
  format = fmt,
  empty = 'Nothing recorded in this window.',
  headless,
}: {
  points: Pt[]
  unit?: string
  /**
   * ACCEPTED AND NO LONGER RENDERED. It named the whole window under the figure; the global
   * filter states that window once, at the top of the page. Kept in the type because seven other
   * module pages pass it, and breaking them to delete one caption is the wrong trade.
   */
  span?: string
  /**
   * Draw the plot without its own headline figure.
   *
   * For a caller whose container ALREADY states the total — the species Overview prints the
   * count as the panel's own headline, so the mark printing it again gave each panel two
   * numbers of different sizes saying the same thing. Off by default, so the seven module pages
   * that rely on the figure are untouched. The hover readout still works: `at` swaps the value
   * on the panel's own line instead, because that line is the one the reader is watching.
   */
  headless?: boolean
  compare?: Compare
  height?: number
  tone?: Tone
  /** Buckets to flag, by index. */
  marks?: { index: number; tone?: Tone; note?: string }[]
  /**
   * Makes each non-empty column a button, handing back the bucket it represents.
   *
   * The WHOLE Pt rather than a day, because the bucket carries its own span and the caller has
   * to scope to that span — see the note on `Pt.from`. Empty buckets stay inert: there is
   * nothing behind a zero to open, and a tappable zero invites the reader to find out.
   */
  onPick?: (pt: Pt) => void
  format?: (n: number) => string
  empty?: string
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const { at, handlers } = useScrub(points.length)
  const flagged = useMemo(() => new Map((marks ?? []).map((m) => [m.index, m])), [marks])

  if (points.length === 0 || points.every((p) => p.value === 0)) {
    return (
      <p className="py-3 text-small" style={{ color: MUTED }}>
        {empty}
      </p>
    )
  }

  const total = points.reduce((n, p) => n + p.value, 0)

  /* A ONE-BUCKET WINDOW IS A FIGURE, NOT A CHART. Under "Today" or "Yesterday" the plot is a
     single column filling the card, which reads as a full meter rather than as one day. The
     readout says the same thing and says it correctly. */
  if (points.length < 2) {
    return (
      <PlotHead
        value={total}
        format={format}
        aside={
          compare ? (
            <>
              <span className="text-small font-medium tabular-nums" style={{ color: deltaInk(total - compare.value) }}>
                {delta(total - compare.value)}
              </span>
              <span className="mt-1 block text-caption" style={{ color: FAINT }}>
                {compare.label}
              </span>
            </>
          ) : undefined
        }
      />
    )
  }

  const hi = Math.max(...points.map((p) => p.value), 1)
  const shownIndex = at ?? points.length - 1
  const shown = points[shownIndex]
  const ghost = compare?.series && compare.series.length === points.length ? compare.series : undefined
  const against = ghost ? ghost[shownIndex] : at === null ? compare?.value : undefined
  const move = against !== undefined ? (at === null ? total : shown.value) - against : undefined

  return (
    <div ref={ref}>
      {!headless && (
      <PlotHead
        value={at === null ? total : shown.value}
        format={format}
        live={at !== null}
        aside={
          move !== undefined ? (
            <>
              <span className="text-small font-medium tabular-nums" style={{ color: deltaInk(move) }}>
                {delta(move)}
              </span>
            </>
          ) : undefined
        }
      />
      )}

      {/* The strip caps and centres the columns so a one- or two-period range is a bar rather
          than a slab the width of the card. The scrub reads this element's own rect, so a
          capped width narrows the target without shifting which column it picks. */}
      <div
        className="relative mt-4 flex items-end gap-[3px] rounded-[8px] outline-none select-none focus-visible:ring-2"
        style={{ height, touchAction: 'pan-y', ...FOCUS_RING, ...strip(points.length) }}
        role="img"
        tabIndex={0}
        aria-label={`${unit ?? 'Events'}: ${format(total)} across ${points.length} periods to ${points[points.length - 1].label}.`}
        {...handlers}
      >
        {points.map((p, i) => {
          const on = i === shownIndex
          const flag = flagged.get(i)
          const barTone = tone && tone !== 'neutral' ? TONE[tone] : accent
          const bar = (
            <span
              className={`w-full origin-bottom rounded-[3px] ${animate ? 'animate-grow-y' : ''}`}
              style={{
                /* A floor of 2px so a zero period is a mark on the axis rather than a gap
                   the eye reads as missing data. */
                height: `${Math.max(2, (p.value / hi) * (height - 12))}px`,
                /* A VERTICAL GRADIENT, LIGHT AT THE TOP. A flat fill makes a column read as a
                   solid block whose top edge is the only thing carrying the value; grading it
                   from a pale tint at the tip to the full tone at the axis gives the bar weight
                   where it is anchored and lets the tip breathe against the card. The tone still
                   comes from the metric — green for arrivals, red for deaths — so the hue says
                   what the bar is and only the lightness varies. */
                background: `linear-gradient(180deg, ${mix(barTone, on ? 0.5 : 0.24)} 0%, ${
                  on ? barTone : mix(barTone, 0.62)
                } 100%)`,
                animationDelay: animate ? `${i * 24}ms` : undefined,
              }}
            />
          )
          const live = Boolean(onPick) && p.value > 0
          return (
            <span key={`${p.label}-${i}`} className="relative flex h-full min-w-0 flex-1 flex-col justify-end">
              {flag && (
                <span
                  className="absolute inset-x-0 top-0 mx-auto size-[5px] rounded-full"
                  style={{ backgroundColor: flag.tone && flag.tone !== 'neutral' ? TONE[flag.tone] : accent }}
                  title={flag.note}
                  aria-hidden
                />
              )}
              {live ? (
                /* The button fills the column's full height, not just the bar: a two-animal day
                   is four pixels tall, and a four-pixel target is not one. `items-end` keeps the
                   bar drawn from the axis while the hit area covers the whole slot. */
                <button
                  type="button"
                  onClick={() => onPick!(p)}
                  aria-label={`${p.label}: ${format(p.value)} — open breakdown`}
                  className="flex h-full w-full items-end rounded-[3px] outline-none focus-visible:ring-2"
                  style={FOCUS_RING}
                >
                  {bar}
                </button>
              ) : (
                bar
              )}
            </span>
          )
        })}
      </div>
      <div style={strip(points.length)}>
        <PlotAxis points={points} />
      </div>
    </div>
  )
}

/**
 * A MONOTONE cubic through every point (Fritsch–Carlson).
 *
 * The same curve `Spark` uses, and here for the same reason: a Catmull-Rom spline bulges past
 * its own points, so a series that alternates by one animal is drawn with peaks the collection
 * never held. Monotone tangents cannot overshoot, so every crest on screen is a real reading.
 */
function curve(pts: readonly (readonly [number, number])[]): string {
  const n = pts.length
  if (n < 2) return n ? `M ${pts[0][0]} ${pts[0][1]}` : ''

  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0] || 1
    slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]
  }

  const m: number[] = new Array(n)
  m[0] = slope[0]
  m[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / slope[i]
    const b = m[i + 1] / slope[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * slope[i]
      m[i + 1] = t * b * slope[i]
    }
  }

  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const third = dx[i] / 3
    d += ` C ${(pts[i][0] + third).toFixed(1)} ${(pts[i][1] + m[i] * third).toFixed(1)} ${(
      pts[i + 1][0] - third
    ).toFixed(1)} ${(pts[i + 1][1] - m[i + 1] * third).toFixed(1)} ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`
  }
  return d
}

/**
 * WHERE IN THE WINDOW THE EVENTS FELL — weeks as columns, weekdays as rows.
 *
 * The one mark that answers "was it steady or was it one bad Tuesday", which no total and no
 * ranking can. A calendar is the only honest shape for a calendar, so this is a grid of real
 * days: an empty cell is a day with nothing recorded, not a gap in the data.
 *
 * Long windows scroll horizontally, which is the one place in this file where scrolling is
 * allowed — fifty-two weeks cannot be squeezed onto a phone without the cells becoming
 * unreadable specks, and a year of daily marks is worth the gesture.
 */
export function DayHeat({
  days,
  onPick,
  weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
}: {
  /** Every day in the window, in order, with its own count. */
  days: { day: number; label: string; dom: number; count: number; weekday: number }[]
  onPick?: (day: number) => void
  weekLabels?: string[]
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const hi = Math.max(...days.map((d) => d.count), 1)

  /* Weeks, so a partial first week can be padded onto its real weekday — without that the
     whole grid is shifted and every cell names the wrong date. */
  const weeks = useMemo(() => {
    const out: (typeof days)[] = []
    let week: typeof days = []
    days.forEach((d, i) => {
      if (i > 0 && d.weekday === 0) {
        out.push(week)
        week = []
      }
      week.push(d)
    })
    if (week.length) out.push(week)
    return out
  }, [days])

  if (days.length === 0) return null

  /**
   * TWO LAYOUTS, AND THE SHORT ONE IS A CALENDAR.
   *
   * Up to about seven weeks the grid is weeks-as-ROWS with weekday headers — the shape on every
   * wall and every phone, which a reader dates without thinking, and roomy enough to carry the
   * day number and its count. Past that it becomes weeks-as-COLUMNS: a year of days as rows of
   * seven is nine hundred pixels tall, where the same year as columns is a strip that scrolls.
   */
  if (weeks.length <= 7) {
    const lead = days[0].weekday
    return (
      <div ref={ref}>
        <div className="grid grid-cols-7 gap-[3px]">
          {weekLabels.map((w, i) => (
            <span key={i} className="pb-1 text-center text-tick" style={{ color: FAINT }}>
              {w}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {days.map((d, i) => {
            const heat = d.count / hi
            const strong = heat > 0.55
            const cell = (
              <span
                className={`flex aspect-square flex-col items-center justify-center rounded-[6px] ${
                  animate ? 'animate-veil' : ''
                }`}
                style={{
                  backgroundColor: d.count === 0 ? TRACK : mix(accent, 0.22 + heat * 0.7),
                  animationDelay: animate ? `${i * 8}ms` : undefined,
                }}
                title={`${d.label} · ${d.count}`}
              >
                <span
                  className="text-tick tabular-nums"
                  style={{ color: d.count === 0 ? FAINT : strong ? '#ffffff' : '#1c1a16' }}
                >
                  {d.dom}
                </span>
                {d.count > 0 && (
                  <span
                    className="font-display text-caption font-bold tabular-nums"
                    style={{ color: strong ? '#ffffff' : '#1c1a16' }}
                  >
                    {d.count}
                  </span>
                )}
              </span>
            )
            return onPick && d.count > 0 ? (
              <button key={d.day} type="button" onClick={() => onPick(d.day)} aria-label={`${d.label}: ${d.count}`}>
                {cell}
              </button>
            ) : (
              <span key={d.day}>{cell}</span>
            )
          })}
        </div>
      </div>
    )
  }

  const size = weeks.length <= 14 ? 19 : weeks.length <= 27 ? 15 : 12
  const gap = size >= 19 ? 4 : 3

  return (
    <div ref={ref} className="flex gap-1.5">
      <div className="flex shrink-0 flex-col pt-[1px]" style={{ gap }}>
        {['M', '', 'W', '', 'F', '', 'S'].map((w, i) => (
          <span
            key={i}
            className="w-[9px] text-tick"
            style={{ color: FAINT, height: size, lineHeight: `${size}px` }}
          >
            {w}
          </span>
        ))}
      </div>
      <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 scrollbar-hidden">
        <div className="flex" style={{ gap }}>
          {weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col" style={{ gap }}>
              {Array.from({ length: 7 }, (_, row) => {
                const d = col.find((x) => x.weekday === row)
                if (!d) return <span key={row} style={{ width: size, height: size }} />
                const heat = d.count / hi
                const box = (
                  <span
                    className={`block rounded-[3.5px] ${animate ? 'animate-veil' : ''}`}
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: d.count === 0 ? TRACK : mix(accent, 0.2 + heat * 0.8),
                      animationDelay: animate ? `${ci * 12}ms` : undefined,
                    }}
                    title={`${d.label} · ${d.count}`}
                  />
                )
                return onPick && d.count > 0 ? (
                  <button
                    key={row}
                    type="button"
                    onClick={() => onPick(d.day)}
                    aria-label={`${d.label}: ${d.count}`}
                    className="block"
                  >
                    {box}
                  </button>
                ) : (
                  <span key={row}>{box}</span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── part of a whole ─────────────────────────────────────────────────────── */

export interface SegItem {
  key: string
  label: string
  value: number
  /** A second fact about the part — "22 species". Never a sentence. */
  meta?: string
  tone?: Tone
  color?: string
  onPick?: () => void
}

/**
 * THREE OR MORE PARTS, AS ONE RING with the total at its centre.
 *
 * The ring is the mark for a split where the parts are unlike each other and the total is the
 * fact they share — sex, cause, outcome. Each legend row carries its own count AND its share,
 * because a ring answers "roughly how much" and the reader's next question is always "exactly
 * how much"; rows open where there is a level below.
 */
export function SplitRing({
  items,
  label = 'Total',
  unit,
  size = 128,
  center,
}: {
  items: SegItem[]
  /** The word under the centre figure. */
  label?: string
  unit?: string
  size?: number
  /** Replaces the centre figure and its word — for a ring whose headline is a share
      ("96% recovered") rather than the total. The legend still carries the counts. */
  center?: { value: string; label: string }
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const total = items.reduce((n, i) => n + i.value, 0)
  const GAP = 1.2
  let run = 0

  const fillOf = (it: SegItem, i: number) =>
    it.color ?? (it.tone && it.tone !== 'neutral' ? TONE[it.tone] : mix(accent, step(i)))

  return (
    <div ref={ref} className="flex flex-col gap-4 @[420px]:flex-row @[420px]:items-center">
      <div className="relative mx-auto shrink-0 @[420px]:mx-0" style={{ width: size }}>
        <svg viewBox="0 0 160 160" className="w-full" aria-hidden>
          <circle cx={80} cy={80} r={58} fill="none" stroke={TRACK} strokeWidth={20} />
          <g transform="rotate(-90 80 80)">
            {items.map((it, i) => {
              const frac = total ? (it.value / total) * 100 : 0
              const len = Math.max(frac - GAP, frac > 0 ? 0.5 : 0)
              const offset = run
              run += frac
              return (
                <circle
                  key={it.key}
                  cx={80}
                  cy={80}
                  r={58}
                  fill="none"
                  stroke={fillOf(it, i)}
                  strokeWidth={20}
                  strokeLinecap="butt"
                  pathLength={100}
                  strokeDasharray={`${len} ${100 - len}`}
                  strokeDashoffset={-offset}
                  className={animate ? 'animate-veil' : undefined}
                  style={animate ? { animationDelay: `${i * 80}ms` } : undefined}
                />
              )
            })}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* 20, not 24. `compact` can render five glyphs ("110K"), and at 24px that filled the
              ring's inner diameter edge to edge with no air around it. */}
          {/* Scales with the ring: a 20px figure that sat right inside a 128px ring is lost
              inside a 158px one. Callers on the default size are unaffected. */}
          <Figure value={center?.value ?? compact(total)} size={size >= 150 ? 24 : 20} color={HERO_INK} />
          <span className="mt-1 text-caption" style={{ color: FAINT }}>
            {center?.label ?? label}
          </span>
        </div>
      </div>
      <ul className="min-w-0 flex-1">
        {items.map((it, i) => {
          const share = total ? (it.value / total) * 100 : 0
          const row = (
            <>
              <span className="mt-[6px] size-[8px] shrink-0 rounded-full" style={{ backgroundColor: fillOf(it, i) }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small text-[#1c1a16]">{it.label}</span>
                {it.meta && (
                  <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
                    {it.meta}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-small font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(it.value)}
                </span>
                <span className="mt-1 block text-caption tabular-nums" style={{ color: FAINT }}>
                  {pct(share)}
                </span>
              </span>
              <Chev on={Boolean(it.onPick)} />
            </>
          )
          return (
            <li key={it.key} className="border-b border-[#f0efec] last:border-0">
              {it.onPick ? (
                <button
                  type="button"
                  onClick={it.onPick}
                  className="card-press -mx-2 flex w-full items-start gap-3 rounded-[10px] px-2 py-2 text-left"
                >
                  {row}
                </button>
              ) : (
                <div className="flex items-start gap-3 py-2">{row}</div>
              )}
            </li>
          )
        })}
      </ul>
      {unit && (
        <p className="text-caption @[420px]:hidden" style={{ color: FAINT }}>
          {fmt(total)} {unit}
        </p>
      )}
    </div>
  )
}

/**
 * EXACTLY TWO PARTS, AS TWO PERCENTAGES.
 *
 * The case a donut is worst at and two bars are worse still. Regulated against open, covered
 * against not: the reader wants one number and its complement, so the mark is the two
 * percentages facing each other over a single ribbon, with the counts underneath. The leading
 * side wears the accent; the other side is neutral, because "not regulated" is a residual
 * rather than a category with a meaning of its own.
 */
export function PercentSplit({
  left,
  right,
  unit,
}: {
  left: { label: string; value: number; meta?: string; onPick?: () => void }
  right: { label: string; value: number; meta?: string; onPick?: () => void }
  unit?: string
}) {
  const accent = useAccent()
  const total = left.value + right.value || 1
  const share = (n: number) => (n / total) * 100
  const sides = [
    { ...left, fill: accent, align: 'text-left' as const },
    { ...right, fill: MD3.outlineVariant, align: 'text-right' as const },
  ]

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        {sides.map((s) => (
          <div key={s.label} className={`min-w-0 flex-1 ${s.align}`}>
            <Figure value={pct(share(s.value))} size={32} color={HERO_INK} />
            <p className="mt-1 truncate text-small text-[#1c1a16]">{s.label}</p>
            <p className="mt-1 truncate text-caption tabular-nums" style={{ color: FAINT }}>
              {fmt(s.value)}
              {unit ? ` ${unit}` : ''}
              {s.meta ? ` · ${s.meta}` : ''}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Ribbon
          items={[
            { label: left.label, value: left.value },
            { label: right.label, value: right.value },
          ]}
          colors={[accent, MD3.outlineVariant]}
          height={11}
        />
      </div>
      {(left.onPick || right.onPick) && (
        <ul className="mt-1">
          {[left, right].map((s, i) => (
            <li key={s.label} className="border-b border-[#f0efec] last:border-0">
              <button
                type="button"
                onClick={s.onPick}
                disabled={!s.onPick}
                className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-3 text-left disabled:opacity-100"
              >
                <span
                  className="size-[8px] shrink-0 rounded-full"
                  style={{ backgroundColor: i === 0 ? accent : MD3.outlineVariant }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small text-[#1c1a16]">{s.label}</span>
                  {s.meta && (
                    <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
                      {s.meta}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(s.value)}
                </span>
                <Chev on={Boolean(s.onPick)} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── comparison ──────────────────────────────────────────────────────────── */

export interface TileItem {
  key: string
  /** The class being compared — "Appendix I", "Schedule II". */
  kicker: string
  value: number
  /** Two supporting facts at most — "41 species", "0.4% of collection". */
  facts?: string[]
  /** 0–100, drawn as the tile's own arc. */
  share?: number
  tone?: Tone
  onPick?: () => void
}

/**
 * TWO TO FOUR NAMED CLASSES, EACH AS A TILE.
 *
 * The shape the three CITES appendices and the three schedules were being drawn as bars: they
 * are not a ranking and not a part-to-whole, they are three named classes each with its own
 * count, species count and share, and the reader compares them side by side. The arc in the
 * corner is the share — a small mark rather than a bar the width of the card, so three tiles
 * read as three facts instead of as a chart.
 */
export function CompareTiles({
  items,
  cols = 3,
}: {
  items: TileItem[]
  cols?: 2 | 3 | 4
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const grid = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-2 @[420px]:grid-cols-4' : 'grid-cols-3'
  /* Six digits at 22px overflow a third of a phone card; the figure is fitted to the widest
     value in the set so all three tiles keep one size. */
  const widest = Math.max(...items.map((i) => fmt(i.value).length), 1)
  const size = widest > 6 ? 16 : widest > 4 ? 20 : 24

  return (
    <div ref={ref} className={`grid ${grid} gap-2`}>
      {items.map((it, i) => {
        const ink = it.tone && it.tone !== 'neutral' ? TONE[it.tone] : accent
        const body = (
          <>
            {/* The kicker takes the full width and the arc sits beside the FIGURE, not beside the
                name. Sharing that first line, "Schedule III" had about sixty pixels and came out
                as two ragged lines that pushed the third tile's number a line below its
                neighbours' — three tiles being compared have to align. */}
            <Kicker color={it.value > 0 ? ACCENT_INK : FAINT}>{it.kicker}</Kicker>
            <div className="mt-1.5 flex items-center justify-between gap-1.5">
              <Figure value={fmt(it.value)} size={size} color={it.value > 0 ? VALUE : FAINT} />
              {it.share !== undefined && <Arc percent={it.share} color={ink} animate={animate} delay={i * 90} />}
            </div>
            {(it.facts ?? []).map((f) => (
              <p key={f} className="mt-1 text-caption" style={{ color: MUTED }}>
                {f}
              </p>
            ))}
          </>
        )
        return (
          <div key={it.key} className="rounded-[13px] p-3" style={{ backgroundColor: mix(accent, 0.07) }}>
            {it.onPick ? (
              <button type="button" onClick={it.onPick} className="card-press block w-full text-left">
                {body}
              </button>
            ) : (
              body
            )}
          </div>
        )
      })}
    </div>
  )
}

/** The tile's share, as a 22px arc. Small enough to be an indicator rather than a chart. */
function Arc({
  percent,
  color,
  animate,
  delay = 0,
}: {
  percent: number
  color: string
  animate: boolean
  delay?: number
}) {
  const p = clamp01(percent)
  return (
    <svg viewBox="0 0 36 36" className="size-[22px] shrink-0" aria-hidden>
      <circle cx={18} cy={18} r={15} fill="none" stroke={TRACK} strokeWidth={4} />
      <circle
        cx={18}
        cy={18}
        r={15}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${Math.max(p, p > 0 ? 1.5 : 0)} ${100 - p}`}
        transform="rotate(-90 18 18)"
        className={animate ? 'animate-veil' : undefined}
        style={animate ? { animationDelay: `${delay}ms` } : undefined}
      />
    </svg>
  )
}

export interface RankItem {
  key: string
  title: string
  /** The row's own facts, joined with a middot — "22 species · 22 enclosures". */
  meta?: string
  /**
   * A second meta line. Two short lines beat one long one that truncates: the species row
   * carries a class, a site, three sex counts and a regulatory standing, and on a phone one
   * line of that ends "…265 M · 244 F" with the standing thrown away.
   */
  meta2?: string
  value: string
  /** 0–100. Sets the rail's weight and, where `showShare`, prints beside the value. */
  share?: number
  /**
   * The share as the caller wants it PRINTED — "82.9%". The rail still reads `share`.
   *
   * Whole numbers are the calm default and right for most lists, but a six-site split where two
   * sites are 83% and 10% loses the distinction between 9.6 and 10.4 that a director is
   * actually comparing. The caller knows which case it is in.
   */
  shareText?: string
  /** Signed, already formatted — "↓ 1,202". Coloured by its sign. */
  change?: string
  tone?: Tone
  lead?: LucideIcon
  onPick?: () => void
}

/**
 * MANY THINGS IN ORDER — the premium ranked list, and the mark that replaced the most bars.
 *
 * A bar per row is a chart of the ranking, and the ranking is already the ordering of the
 * rows: the bars were drawing a fact the list states by existing. What a reader actually
 * needs from a ranked row is its position, its magnitude, its share and which way it moved,
 * and all four of those are TYPE. So the only mark left is the rail down the left edge, whose
 * weight carries the share — enough to see concentration at a glance, not enough to read as a
 * chart. Rows open into whatever sits below them.
 */
export function RankList({
  items,
  rank = true,
  showShare = true,
  dense = false,
}: {
  items: RankItem[]
  rank?: boolean
  showShare?: boolean
  /** Tighter rows, for a list inside a half-width card. */
  dense?: boolean
}) {
  const accent = useAccent()

  return (
    <ol className="flex flex-col">
      {items.map((it, i) => {
        const Glyph = it.lead
        const row = (
          <>
            {rank && (
              <span
                className="w-[17px] shrink-0 pt-[2px] text-right text-caption tabular-nums"
                style={{ color: i < 3 ? MUTED : FAINT }}
              >
                {i + 1}
              </span>
            )}
            {Glyph && (
              <span
                className="grid size-7 shrink-0 place-items-center rounded-[9px]"
                style={{ backgroundColor: mix(accent, 0.1) }}
                aria-hidden
              >
                <Glyph size={15} strokeWidth={1.75} style={{ color: accent }} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small font-medium text-[#1c1a16]">{it.title}</span>
              {it.meta && (
                <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
                  {it.meta}
                </span>
              )}
              {it.meta2 && (
                <span className="block truncate text-caption" style={{ color: FAINT }}>
                  {it.meta2}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right">
              <span
                className="block text-body font-medium tabular-nums"
                style={{ color: it.tone && it.tone !== 'neutral' ? TONE[it.tone] : VALUE }}
              >
                {it.value}
              </span>
              {(showShare && it.share !== undefined) || it.change ? (
                <span className="mt-1 flex items-baseline justify-end gap-2 text-caption tabular-nums">
                  {showShare && it.share !== undefined && (
                    <span style={{ color: FAINT }}>{it.shareText ?? pct(it.share)}</span>
                  )}
                  {it.change && (
                    <span style={{ color: it.change.startsWith('+') ? TONE.good : it.change.startsWith('−') ? TONE.bad : FAINT }}>
                      {it.change}
                    </span>
                  )}
                </span>
              ) : null}
            </span>
            <Chev on={Boolean(it.onPick)} />
          </>
        )
        const pad = dense ? 'py-2' : 'py-3'
        return (
          <li key={it.key} className="border-b border-[#f0efec] last:border-0">
            {it.onPick ? (
              <button
                type="button"
                onClick={it.onPick}
                className={`card-press -mx-2 flex w-full items-stretch gap-3 rounded-[10px] px-2 text-left ${pad}`}
              >
                {row}
              </button>
            ) : (
              <div className={`flex items-stretch gap-3 ${pad}`}>{row}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * CONCENTRATION, IN ONE LINE — how much of the whole the leaders account for.
 *
 * The distribution mark that belongs above a long ranked list. Four hundred species cannot be
 * drawn, and do not need to be: what the reader wants before scrolling is whether this is a
 * collection of a few enormous shoals or of four hundred comparable holdings, and that is one
 * ribbon and one sentence of figures.
 */
export function Concentration({
  items,
  total,
  of,
  unit,
}: {
  /** The leaders, largest first. */
  items: { label: string; value: number }[]
  /** The whole quantity the leaders are a part of. */
  total: number
  /** How many things there are in all — 397 species, 6 sites. */
  of: number
  unit: string
}) {
  const lead = items.reduce((n, i) => n + i.value, 0)
  const rest = Math.max(0, total - lead)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-caption" style={{ color: MUTED }}>
          Top {items.length} of {fmt(of)} — led by {items[0]?.label}
        </p>
        <p className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
          {pct(total ? (lead / total) * 100 : 0)}
        </p>
      </div>
      <div className="mt-3">
        <Ribbon items={[...items, { label: 'Everything else', value: rest }]} height={9} />
      </div>
      <p className="mt-2 text-caption tabular-nums" style={{ color: FAINT }}>
        {fmt(lead)} of {fmt(total)} {unit}
      </p>
    </div>
  )
}

/* ── direction ───────────────────────────────────────────────────────────── */

/**
 * IN AGAINST OUT — direction as the first thing read.
 *
 * Two counts in a column say nothing about direction; the glyph, the side and the sign do it
 * before any number is parsed. The net sits between the two so a collection that gained four
 * animals reads as a gain rather than as "twelve and eight". Routes below name the counterparty
 * where the record has one — and where it does not, they say what the record does say rather
 * than inventing a destination.
 */
export function FlowSplit({
  inward,
  outward,
  net,
  routes,
  unit,
}: {
  inward: { label: string; value: number; meta?: string; change?: number; icon: LucideIcon; onPick?: () => void }
  outward: { label: string; value: number; meta?: string; change?: number; icon: LucideIcon; onPick?: () => void }
  /** Stated rather than derived, because a page may net over more than these two. */
  net?: number
  routes?: { key: string; label: string; meta?: string; value: number; direction: 'in' | 'out' | 'internal'; onPick?: () => void }[]
  unit?: string
}) {
  const accent = useAccent()
  const sides = [
    { ...inward, dir: 'in' as const },
    { ...outward, dir: 'out' as const },
  ]

  return (
    <div>
      <div className="flex items-stretch gap-2">
        {sides.map((s) => {
          const Glyph = s.icon
          const body = (
            <>
              <span className="flex items-center gap-2">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-[9px]"
                  style={{ backgroundColor: s.dir === 'in' ? mix(accent, 0.14) : '#eceae5' }}
                  aria-hidden
                >
                  <Glyph size={15} strokeWidth={2} style={{ color: s.dir === 'in' ? ACCENT_INK : MUTED }} />
                </span>
                <Kicker color={s.dir === 'in' ? ACCENT_INK : MUTED}>{s.label}</Kicker>
              </span>
              <span className="mt-2 flex items-baseline gap-2">
                <Figure value={fmt(s.value)} size={32} color={HERO_INK} />
                {/* Only where there IS a change. A bare "0" beside a count reads as a second
                    figure rather than as "no movement against the period before". */}
                {s.change !== undefined && s.change !== 0 && (
                  <span className="shrink-0 text-caption font-medium tabular-nums" style={{ color: deltaInk(s.change) }}>
                    {delta(s.change)}
                  </span>
                )}
              </span>
              {s.meta && (
                <span className="mt-1 block text-caption" style={{ color: FAINT }}>
                  {s.meta}
                </span>
              )}
            </>
          )
          return (
            <div
              key={s.label}
              className="min-w-0 flex-1 rounded-[13px] p-3"
              /* The outward side is the palette's own recessive surface rather than a second
                 tint of the accent: direction is the fact, and two greens would state it twice. */
              style={{ backgroundColor: s.dir === 'in' ? mix(accent, 0.07) : '#f7f6f3' }}
            >
              {s.onPick ? (
                <button type="button" onClick={s.onPick} className="card-press block w-full text-left">
                  {body}
                </button>
              ) : (
                body
              )}
            </div>
          )
        })}
      </div>

      {net !== undefined && (
        <div className="mt-3 flex items-center gap-3">
          <span className="h-px flex-1" style={{ backgroundColor: HAIR }} aria-hidden />
          <span className="shrink-0 text-caption font-medium tabular-nums" style={{ color: deltaInk(net) }}>
            net {delta(net)}
            {unit ? ` ${unit}` : ''}
          </span>
          <span className="h-px flex-1" style={{ backgroundColor: HAIR }} aria-hidden />
        </div>
      )}

      {routes && routes.length > 0 && (
        <ul className="mt-1">
          {routes.map((r) => {
            const row = (
              <>
                <span
                  className="w-[13px] shrink-0 text-caption"
                  style={{ color: r.direction === 'in' ? ACCENT_INK : r.direction === 'out' ? MUTED : FAINT }}
                  aria-hidden
                >
                  {r.direction === 'in' ? '↓' : r.direction === 'out' ? '↑' : '↔'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small text-[#1c1a16]">{r.label}</span>
                  {r.meta && (
                    <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
                      {r.meta}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(r.value)}
                </span>
                <Chev on={Boolean(r.onPick)} />
              </>
            )
            return (
              <li key={r.key} className="border-b border-[#f0efec] last:border-0">
                {r.onPick ? (
                  <button
                    type="button"
                    onClick={r.onPick}
                    className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-3 text-left"
                  >
                    {row}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 py-3">{row}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ── outcome ─────────────────────────────────────────────────────────────── */

/**
 * ONE POPULATION, SPLIT BY HOW IT ENDED.
 *
 * Not a ranking and not a part-to-whole of a standing quantity: an outcome split is a set of
 * terminal states, and what makes it its own mark is that the total is the SUBJECT — "45 fetal
 * losses, of which 28 late-term and 17 mid-term" — with each outcome carrying its own share and
 * its own short trend. The trend is what stops an outcome card being a static tally: two
 * stillbirths is a different fact if last month had none.
 */
export function OutcomeSplit({
  total,
  label,
  outcomes,
  unit,
  lead = true,
}: {
  total: number
  /** What the total counts — "fetal losses". */
  label: string
  outcomes: {
    key: string
    label: string
    value: number
    meta?: string
    /** The outcome's own recent history, drawn as a 10-point spark. Real readings only. */
    series?: number[]
    tone?: Tone
    onPick?: () => void
  }[]
  unit?: string
  /** False where the card states the total above this mark — the ribbon then leads. */
  lead?: boolean
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()

  return (
    <div ref={ref}>
      {lead && (
        <div className="flex items-end justify-between gap-3">
          <div>
            <Figure value={fmt(total)} size={32} color={HERO_INK} />
            <p className="mt-1 text-caption" style={{ color: MUTED }}>
              {label}
            </p>
          </div>
          {unit && (
            <p className="shrink-0 text-caption" style={{ color: FAINT }}>
              {unit}
            </p>
          )}
        </div>
      )}

      <div className={lead ? 'mt-4' : ''}>
        <Ribbon items={outcomes.map((o) => ({ label: o.label, value: o.value, tone: o.tone }))} height={11} />
      </div>
      <ul className="mt-1.5">
        {outcomes.map((o, i) => {
          const share = total ? (o.value / total) * 100 : 0
          const row = (
            <>
              <span
                className="mt-[6px] size-[8px] shrink-0 rounded-full"
                style={{ backgroundColor: o.tone && o.tone !== 'neutral' ? TONE[o.tone] : mix(accent, step(i)) }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small text-[#1c1a16]">{o.label}</span>
                {o.meta && (
                  <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
                    {o.meta}
                  </span>
                )}
              </span>
              {o.series && o.series.length > 1 && (
                <span className="hidden shrink-0 @[380px]:block">
                  <MicroBars values={o.series} animate={animate} tone={o.tone} />
                </span>
              )}
              <span className="shrink-0 text-right">
                <span className="block text-small font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(o.value)}
                </span>
                <span className="mt-1 block text-caption tabular-nums" style={{ color: FAINT }}>
                  {pct(share)}
                </span>
              </span>
              <Chev on={Boolean(o.onPick)} />
            </>
          )
          return (
            <li key={o.key} className="border-b border-[#f0efec] last:border-0">
              {o.onPick ? (
                <button
                  type="button"
                  onClick={o.onPick}
                  className="card-press -mx-2 flex w-full items-start gap-3 rounded-[10px] px-2 py-3 text-left"
                >
                  {row}
                </button>
              ) : (
                <div className="flex items-start gap-3 py-3">{row}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** A row's own history, at row scale — ten columns, latest in full accent. */
export function MicroBars({ values, animate, tone }: { values: number[]; animate?: boolean; tone?: Tone }) {
  const accent = useAccent()
  const c = tone && tone !== 'neutral' ? TONE[tone] : accent
  const hi = Math.max(...values, 1)
  return (
    <span className="flex h-[18px] w-[52px] items-end justify-end gap-[2px]" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full ${animate ? 'animate-grow-y' : ''}`}
          style={{
            height: `${Math.max(2, (v / hi) * 18)}px`,
            backgroundColor: i === values.length - 1 ? c : mix(c, 0.26),
            animationDelay: animate ? `${i * 20}ms` : undefined,
          }}
        />
      ))}
    </span>
  )
}

/* ── column geometry ─────────────────────────────────────────────────────── */

/**
 * HOW WIDE ONE COLUMN MAY GET, given how many are in the strip.
 *
 * WHAT THIS FIXES. Every column chart in the product is a flex row of `flex-1` bars, which is
 * right for the thirty columns of a month and catastrophic for the one column of a day: the
 * bar takes the full width of the card and the chart becomes a slab of colour with an axis
 * under it. At that width a bar is no longer a bar — there is nothing to compare it to and
 * nothing for the eye to measure it against, so the reader is shown a rectangle whose only
 * content is a number already printed above it. Two columns are worse, because a full-width
 * pair reads as a comparison between two halves of the card rather than two days.
 *
 * A bar's width has no meaning in any of these charts — height and stack carry all of it — so
 * capping it costs nothing and stops the mark from degenerating. Above sixteen columns the cap
 * is released: at that count `flex-1` is already narrower than the ceiling and the strip should
 * use the whole card.
 */
export const columnCap = (n: number): number | undefined =>
  n >= 16 ? undefined : Math.max(20, Math.min(56, 360 / n))

/**
 * The style for the strip that holds capped columns, so it centres instead of stranding them.
 *
 * Applied to the bars row AND to the tick row beneath it — they must share a width or the
 * dates stop sitting under their columns. A short strip is centred rather than left-anchored:
 * three columns hard against the left edge of a wide card read as a chart that failed to load
 * the rest, and centred they read as all there is.
 */
export function strip(n: number, gap = 3): { maxWidth?: number; marginInline?: string } {
  const cap = columnCap(n)
  if (!cap) return {}
  return { maxWidth: n * cap + Math.max(0, n - 1) * gap, marginInline: 'auto' }
}

/**
 * STAGES IN SEQUENCE — a funnel, and the only place in this file where a shape tapers.
 *
 * Eggs set, hatched, discarded is not a composition and not a ranking: each stage is a subset
 * of the one above it, and the number the reader wants is the CONVERSION between them. The
 * bands are centred and joined, so the narrowing is the mark; a left-anchored bar per stage is
 * a bar chart of counts and hides exactly the relationship the card exists to show.
 */
export function Lifecycle({
  stages,
  unit,
}: {
  stages: { key: string; label: string; value: number; meta?: string; tone?: Tone; onPick?: () => void }[]
  unit?: string
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const first = stages[0]?.value || 1

  /* Percent of the card's width, floored so a stage that happened at all is still a mark. */
  const widthOf = (v: number) => Math.max(4, Math.min(100, (v / first) * 100))

  return (
    <div ref={ref}>
      <ol className="flex flex-col">
        {stages.map((s, i) => {
          const w = widthOf(s.value)
          const next = stages[i + 1]
          const fill = s.tone && s.tone !== 'neutral' ? TONE[s.tone] : mix(accent, 0.9 - i * 0.16)
          const share = i === 0 ? 100 : (s.value / first) * 100
          const head = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small text-[#1c1a16]">{s.label}</span>
                {s.meta && (
                  <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
                    {s.meta}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-right">
                <span className="text-body font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(s.value)}
                </span>
                {i > 0 && (
                  <span className="ml-2 text-caption tabular-nums" style={{ color: FAINT }}>
                    {pct(share)} of {stages[0].label.toLowerCase()}
                  </span>
                )}
              </span>
              <Chev on={Boolean(s.onPick)} />
            </>
          )
          return (
            <li key={s.key}>
              {/* THE FIGURES SIT ABOVE THEIR BAND, NOT INSIDE IT. A stage that narrows to a
                  twentieth of the card has no room for a label, and text laid over a tapering
                  shape is unreadable at exactly the stages a funnel exists to show. */}
              {s.onPick ? (
                <button
                  type="button"
                  onClick={s.onPick}
                  className="card-press -mx-2 flex w-full items-baseline gap-3 rounded-[10px] px-2 pt-1 text-left"
                >
                  {head}
                </button>
              ) : (
                <div className="flex items-baseline gap-3 pt-1">{head}</div>
              )}
              <div
                className={`mt-1.5 h-[13px] rounded-full ${animate ? 'animate-grow-x' : ''}`}
                style={{
                  width: `${w}%`,
                  marginInline: 'auto',
                  backgroundColor: fill,
                  animationDelay: animate ? `${i * 110}ms` : undefined,
                }}
                aria-hidden
              />
              {/* The taper — the mark itself. Centred bands joined by their own shoulders read
                  as a funnel; the same bands anchored left read as a bar chart of counts. */}
              {next && (
                <svg
                  viewBox="0 0 100 12"
                  preserveAspectRatio="none"
                  className="block h-[12px] w-full"
                  aria-hidden
                >
                  <polygon
                    points={`${(100 - w) / 2},0 ${(100 + w) / 2},0 ${(100 + widthOf(next.value)) / 2},12 ${
                      (100 - widthOf(next.value)) / 2
                    },12`}
                    fill={fill}
                    opacity={0.2}
                  />
                </svg>
              )}
            </li>
          )
        })}
      </ol>
      {unit && (
        <p className="mt-2 text-caption" style={{ color: FAINT }}>
          {unit}
        </p>
      )}
    </div>
  )
}

/* ── events ──────────────────────────────────────────────────────────────── */

export interface Incident {
  key: string
  /** "31 Jul" — the date, never a relative phrase. */
  when: string
  title: string
  meta?: string
  /** Open incidents lead the rail and wear the tone; closed ones recede. */
  status?: { label: string; tone: Tone }
  onPick?: () => void
}

/**
 * DATED RECORDS, WITH STATUS — the incident rail.
 *
 * A bar chart of escapes per site answers a question nobody asked. What is asked about an
 * escape is when it happened, what got out, and whether it is back — so the mark is a dated
 * rail with a status dot, and the open ones are visible as open without a colour being decoded.
 * `Events` in the design system is this rail without the status or the tap; this is the version
 * an incident needs.
 */
export function IncidentRail({ items, empty }: { items: Incident[]; empty?: string }) {
  const accent = useAccent()

  if (items.length === 0) {
    return (
      <p className="py-2 text-small" style={{ color: MUTED }}>
        {empty ?? 'Nothing recorded.'}
      </p>
    )
  }

  return (
    <ul className="flex flex-col">
      {items.map((it, i) => {
        const ink = it.status && it.status.tone !== 'neutral' ? TONE[it.status.tone] : accent
        const body = (
          <>
            <span className="w-[40px] shrink-0 pt-[1px] text-right text-caption tabular-nums" style={{ color: FAINT }}>
              {it.when}
            </span>
            <span className="relative flex w-[9px] shrink-0 justify-center" aria-hidden>
              <span className="mt-[6px] size-[7px] shrink-0 rounded-full" style={{ backgroundColor: ink }} />
              {i < items.length - 1 && <span className="absolute top-[17px] bottom-0 w-px" style={{ backgroundColor: HAIR }} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small text-[#1c1a16]">{it.title}</span>
              {it.meta && (
                <span className="mt-1 block text-caption" style={{ color: FAINT }}>
                  {it.meta}
                </span>
              )}
            </span>
            {it.status && (
              <span
                className="shrink-0 rounded-full px-2 py-[3px] text-caption font-medium whitespace-nowrap"
                style={{
                  backgroundColor: it.status.tone === 'neutral' ? '#f4f3ef' : mix(TONE[it.status.tone], 0.12),
                  color: it.status.tone === 'neutral' ? MUTED : TONE[it.status.tone],
                }}
              >
                {it.status.label}
              </span>
            )}
            <Chev on={Boolean(it.onPick)} />
          </>
        )
        return (
          <li key={it.key}>
            {it.onPick ? (
              <button
                type="button"
                onClick={it.onPick}
                className={`card-press -mx-2 flex w-full items-start gap-3 rounded-[10px] px-2 text-left ${
                  i < items.length - 1 ? 'pb-4' : ''
                }`}
              >
                {body}
              </button>
            ) : (
              <div className={`flex items-start gap-3 ${i < items.length - 1 ? 'pb-4' : ''}`}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* ── hierarchy ───────────────────────────────────────────────────────────── */

export interface TreeCell {
  key: string
  label: string
  value: number
  meta?: string
  onPick?: () => void
}

/**
 * ONE LEVEL OF A HIERARCHY, SIZED BY WEIGHT.
 *
 * Nine taxonomic classes spanning 178,240 animals down to 41 are the case a bar chart cannot
 * draw: at true scale eight of the nine bars are invisible, and at a floored scale the chart
 * is lying about the shape of the collection. A treemap states the dominance honestly — the
 * area IS the share — and it doubles as the door into the level below, which a bar chart is
 * not. Used once per page at most: it is the least calm mark here and earns its place only
 * where the distribution itself is the finding.
 */
export function Treemap({ items, height, onPick }: { items: TreeCell[]; height?: number; onPick?: (key: string) => void }) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const [box, setBox] = useState(0)
  const total = items.reduce((n, i) => n + i.value, 0) || 1

  /*
   * THE LAYOUT NEEDS THE REAL BOX, and this is the bug that made this mark unreadable.
   *
   * `squarify` was being run in a 100 × 100 space and its output used as percentages. Percent
   * of width and percent of height are only the same unit when the box is square, and this box
   * never is: on a tablet the card is around 1,300px across and the map was 176px tall, so
   * every cell the algorithm carefully squared came out stretched seven and a half times
   * horizontally. The result was a stack of horizontal slivers — precisely the shape squarify
   * exists to avoid, produced by squarify. Measuring the box and laying out in its own
   * coordinates is the whole fix; the algorithm below was always correct.
   */
  const measure = useCallback((el: HTMLDivElement | null) => {
    ref.current = el
    if (el) setBox(el.clientWidth)
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setBox(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  /*
   * A TALL ENOUGH BOX TO BE A MAP. A fixed 176px was authored for a phone, where the card is
   * about 360px across and that height is a sensible 2:1. The same 176 on a desktop column is a
   * 7:1 letterbox, and no layout makes nine cells readable inside one — the cells would be
   * correct and still be slivers, because the BOX is the sliver. So the height tracks the
   * width, bounded: never squarer than 5:8 and never taller than 340px.
   */
  const tall = height ?? Math.round(Math.max(176, Math.min(340, box * 0.42)))

  /*
   * THE TAIL IS FOLDED INTO ONE CELL, and the fold is stated on it.
   *
   * A distribution running from 62% to 0.1% cannot be drawn cell-per-item at any size: the last
   * classes come out two pixels wide, which is not a small cell but a rendering artefact — a
   * rounded corner with nothing between it and the next one, reading as damage rather than as
   * data. Dropping them would be worse, because the areas would no longer sum to the whole.
   *
   * So everything below a legible size becomes a single trailing cell whose area is exactly the
   * sum of what it replaces. The map still adds up, the artefacts are gone, and nothing is
   * hidden — every folded class is a row in the ranked list under the map, with its own count,
   * share and door. The fold is what the map can honestly draw, not what the card knows.
   */
  const drawn: TreeCell[] = useMemo(() => {
    /* Squarify needs its input largest-first, and so does the fold below. The call sites all
       pass a ranked list already; sorting a copy costs nothing and removes the assumption. */
    const sorted = [...items].sort((a, b) => b.value - a.value)
    const area = Math.max(1, box) * tall
    /* Roughly 46 × 46 — the smallest tile that still reads as a tile. */
    const floor = 2100 / area

    let cut = sorted.length
    if (cut > 1 && sorted[cut - 1].value / total < floor) {
      /* Keep folding until BOTH the next cell kept and the folded cell itself are drawable.
         Folding only the offending item would not help: the fold's area is the sum of what it
         replaces, so a single 0.1% class folds into a 0.1% cell and the artefact survives with
         a different label. */
      let sum = 0
      while (cut > 1) {
        const share = sorted[cut - 1].value / total
        if (share >= floor && sum >= floor) break
        sum += share
        cut--
      }
    }
    if (cut >= sorted.length) return sorted

    const rest = sorted.slice(cut)
    return [
      ...sorted.slice(0, cut),
      {
        key: '__rest',
        label: `+${rest.length}`,
        value: rest.reduce((n, i) => n + i.value, 0),
        meta: 'smaller, listed below',
      },
    ]
  }, [items, total, box, tall])

  const cells = useMemo(
    () => squarify(drawn.map((i) => i.value / total), 0, 0, Math.max(1, box), tall),
    [drawn, total, box, tall],
  )

  return (
    <div ref={measure} className="relative w-full overflow-hidden rounded-[12px]" style={{ height: tall }}>
      {box > 0 && cells.map((c, i) => {
        const it = drawn[i]
        const wash = mix(accent, 0.86 - Math.min(0.66, i * 0.1))
        const light = i > 2
        /* A LABEL ONLY WHERE THE CELL CAN HOLD ONE. Cells run from half the card down to a
           few pixels; a name clipped to "Ga" and a figure sliced in half are worse than a cell
           that is silent and carries its facts in the ranked list underneath. The thresholds
           are in pixels now that the box is measured, rather than in percentages of two
           different axes — which is why a 40px-tall cell used to think it had room for two
           lines of type. */
        /* The fold cell's label is two characters, so it needs a fraction of the room a class
           name does — and it is the one cell whose label matters most, because a silent cell
           there would read as the artefact this fold exists to remove. */
        const rest = it.key === '__rest'
        const named = rest ? c.w >= 26 && c.h >= 20 : c.w >= 46 && c.h >= 30
        const figured = !rest && named && c.w >= 62 && c.h >= 52
        const body = (
          <>
            {named && (
              <span
                className="block text-caption font-medium"
                style={{
                  color: light ? '#1c1a16' : '#ffffff',
                  /* A NARROW CELL WRAPS RATHER THAN GOING SILENT. A tall 60px column has room
                     for two short lines and none for one long one, and the previous rule —
                     one truncated line or nothing — left the third largest class in the
                     collection as an unlabelled green rectangle. Two lines, clipped after
                     that, and a tight leading so they fit the cells that earn them. */
                  display: '-webkit-box',
                  WebkitLineClamp: c.h >= 46 ? 2 : 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.2,
                  overflowWrap: 'anywhere',
                }}
              >
                {it.label}
              </span>
            )}
            {figured && (
              <span
                className="mt-1 block truncate text-caption tabular-nums"
                style={{ color: light ? MUTED : 'rgba(255,255,255,0.82)' }}
              >
                {compact(it.value)}
              </span>
            )}
          </>
        )
        return (
          <div
            key={it.key}
            className={`absolute p-[3px] ${animate ? 'animate-veil' : ''}`}
            style={{
              left: c.x,
              top: c.y,
              width: c.w,
              height: c.h,
              animationDelay: animate ? `${i * 55}ms` : undefined,
            }}
            title={`${it.label} · ${fmt(it.value)}${it.meta ? ` · ${it.meta}` : ''}`}
          >
            <div className="h-full w-full overflow-hidden rounded-[7px] p-[7px]" style={{ backgroundColor: wash }}>
              {/* The fold is not a door — it names no single thing to open. Its members are
                  rows in the list below, each with its own. */}
              {!rest && (onPick || it.onPick) ? (
                <button
                  type="button"
                  onClick={it.onPick ?? (() => onPick?.(it.key))}
                  className="card-press block h-full w-full text-left"
                >
                  {body}
                </button>
              ) : (
                body
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Squarified treemap layout (Bruls, Huizing, van Wijk), in percentages.
 *
 * Rows are filled until adding the next cell would make the row's aspect ratios worse, which
 * is what keeps the cells close to square — a naive slice-and-dice at this range of values
 * produces slivers a label cannot sit in.
 */
function squarify(
  shares: number[],
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = []
  let rest = shares.map((s, i) => ({ s, i }))
  let X = x
  let Y = y
  let W = w
  let H = h

  const worst = (row: number[], side: number, scale: number) => {
    const sum = row.reduce((n, v) => n + v, 0) * scale
    const max = Math.max(...row) * scale
    const min = Math.min(...row) * scale
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
  }

  while (rest.length) {
    const area = rest.reduce((n, r) => n + r.s, 0)
    const scale = (W * H) / (area || 1)
    const side = Math.min(W, H)
    const row: number[] = []
    while (rest.length) {
      const next = [...row, rest[0].s]
      if (row.length && worst(row, side, scale) < worst(next, side, scale)) break
      row.push(rest[0].s)
      rest = rest.slice(1)
    }

    const rowArea = row.reduce((n, v) => n + v, 0) * scale
    const thick = rowArea / side
    let along = 0
    row.forEach((s) => {
      const len = (s * scale) / thick
      out.push(
        W >= H
          ? { x: X, y: Y + along, w: thick, h: len }
          : { x: X + along, y: Y, w: len, h: thick },
      )
      along += len
    })

    if (W >= H) {
      X += thick
      W -= thick
    } else {
      Y += thick
      H -= thick
    }
  }

  return out
}

/* ── small multiples ─────────────────────────────────────────────────────── */

export interface Tile {
  key: string
  /** The short form — a site code, a class initial. Carries identity at tile scale. */
  code: string
  /** The full name, for the tooltip and the screen reader. */
  label: string
  value: number
  /** 0–100, drives the meter under the figure. */
  share: number
  /** Signed movement, already formatted. Omitted where there is nothing to say. */
  change?: string
  changeTone?: Tone
}

/**
 * FIFTY THINGS, ALL OF THEM, IN THE SPACE OF EIGHT ROWS.
 *
 * The estate has 50 sites and `population.ts` is explicit that this is not a top-five: "every
 * site, always all of them". Drawn as list rows that is 3,211px — five screens of scrolling to
 * see one card, which is most of why the Animal Population page ran to eighteen thousand
 * pixels. Truncating to a top eight would have fixed the height by breaking the brief.
 *
 * So the row is dropped instead of the data. A list row is wide because it carries prose — a
 * name, a code, a species count, an enclosure count — and prose is not what the reader is here
 * for. The question a director brings to fifty sites is WHERE IS THE COLLECTION, which is a
 * comparison, and a comparison wants small multiples: identical cells, one variable, ordered.
 * Each tile carries the code, the figure and a meter, all fifty fit in about 800px, and nothing
 * is behind a control. The name survives as the tile's `title` and its accessible label.
 *
 * WHY A METER AND NOT A BAR CHART. The tiles are already ordered by size and their figures are
 * printed, so a full bar would encode the ranking a third time. The meter is doing a different
 * job: it reads against the WIDEST tile, so a reader can see at a glance that the leader holds
 * roughly twice the fifth-placed site without reading either number.
 */
export function TileGrid({
  items,
  onPick,
  min = 132,
}: {
  items: Tile[]
  onPick?: (key: string) => void
  /** Minimum tile width. The grid fills whatever the column gives it. */
  min?: number
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const hi = Math.max(...items.map((i) => i.share), 1)

  if (items.length === 0) return null

  return (
    <div
      ref={ref}
      className="grid gap-[6px]"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}
    >
      {items.map((it, i) => {
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-1.5">
              <span
                className="truncate text-tick font-semibold tracking-[0.04em] uppercase"
                style={{ color: MUTED }}
              >
                {it.code}
              </span>
              {it.change && (
                <span
                  className="shrink-0 text-tick tabular-nums"
                  style={{ color: it.changeTone && it.changeTone !== 'neutral' ? TONE[it.changeTone] : FAINT }}
                >
                  {it.change}
                </span>
              )}
            </span>
            <span className="mt-1 block truncate text-small font-medium tabular-nums" style={{ color: VALUE }}>
              {fmt(it.value)}
            </span>
            {/* The meter reads against the largest tile, not against 100% — at 8% of the
                collection the leader would otherwise be a sliver and all fifty would look
                equally empty. */}
            <span className="mt-1.5 block h-[3px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
              <span
                className={`block h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
                style={{
                  width: `${Math.max(2, (it.share / hi) * 100)}%`,
                  backgroundColor: mix(accent, 0.55),
                  animationDelay: animate ? `${Math.min(i * 12, 400)}ms` : undefined,
                }}
              />
            </span>
          </>
        )
        const shell = 'block w-full rounded-[10px] px-3 py-2 text-left'
        return onPick ? (
          <button
            key={it.key}
            type="button"
            title={it.label}
            aria-label={`${it.label} — ${fmt(it.value)}`}
            onClick={() => onPick(it.key)}
            className={`card-press ${shell}`}
            style={{ backgroundColor: mix(accent, 0.055) }}
          >
            {body}
          </button>
        ) : (
          <span key={it.key} title={it.label} className={shell} style={{ backgroundColor: mix(accent, 0.055) }}>
            {body}
          </span>
        )
      })}
    </div>
  )
}
