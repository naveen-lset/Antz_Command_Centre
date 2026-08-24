/**
 * THE OVERVIEW TAB'S MARKS — built on the house system, not beside it.
 *
 * THIS FILE'S FIRST VERSION WAS A PASTE AND IT SHOWED. It carried its own hex ladder
 * (`#1f2421`, `#65706a`, `#8a938d`, `#e7ebe8`), its own invented chart palette, arbitrary pixel
 * type sizes, flat fills, no scroll animation and no focus ring — a mock transcribed into TSX
 * rather than a component written against `exec/system.tsx`. Everything below now comes from the
 * product: the inks, the type scale, the radius and padding variables, `mix()`, `usePlay()`,
 * `TONE`, and the brand palette.
 *
 * WHY A CATEGORICAL PALETTE EXISTS HERE AT ALL. `exec/marks.tsx` colours every mark in lightness
 * steps of one accent, which is right where a reader follows one argument down a column. This tab
 * is the other case: three independent compositions, each with its own legend, read in any order.
 * Lightness steps cannot carry that — "Male" and "Needs sexing" are slot 2 of two different
 * charts, and a reader who learns what the mid-green means in one learns something false about
 * the other.
 *
 * THE HUES ARE THE BRAND'S OWN, AND `MD3`'s NOTE ALREADY SANCTIONS THIS USE. That block says the
 * brights "fill areas, bars and donut segments where the label sits outside the mark", and the
 * dark tokens carry strokes and type. Every slice here is labelled in the key beneath it, so the
 * brights are exactly the token class this call wants.
 *
 * THE ORDER IS MEASURED, NOT AESTHETIC. Adjacent slices are what a reader has to tell apart, and
 * `primary` beside `tertiary` measures ΔE 5.2 under deuteranopia — indistinguishable. Threading
 * `addPrimary` between them takes the worst adjacent pair to 11.5 under deuteranopia and 17.2 for
 * ordinary vision. Reordering these five is not a style change; it is the check passing.
 */

import { useId, type ReactNode } from 'react'

import {
  ACCENT_INK,
  FAINT,
  HAIR,
  INK,
  INK2,
  MD3,
  MUTED,
  TONE,
  TRACK,
  VALUE,
  fmt,
  mix,
  useChartTip,
} from '../exec/system'
import { usePlay } from '../motion'

/* ── the palette, from the brand's own tokens ────────────────────────────── */

/**
 * The slice order. Brand brights only, sequenced so no adjacent pair collapses under CVD.
 *
 * `moderateSecondary` sits above the lightness band the checker prefers and every bright is
 * under 3:1 against a white card. Both are accepted here for the reason the checker itself
 * names: the relief for a low-contrast fill is a visible label, and `SliceKey` renders one
 * carrying the count for every slice on every chart. A slice is never identified by colour alone.
 */
const ORDER = [MD3.primary, MD3.addPrimary, MD3.tertiary, MD3.moderateSecondary, MD3.secondaryDark]

/**
 * The "no answer" fill. Never assigned by index — see `huesFor`.
 *
 * HELD BACK 40% AGAINST THE CARD. At full strength the neutral has the same visual weight as
 * the brand brights beside it, so on a species where most deaths carry no recorded manner the
 * absence read as the loudest CATEGORY in the chart rather than as the gap it is. Lightened, it
 * still occupies its true share — the arc is unchanged and the legend still counts it — but the
 * eye lands on the answers first.
 *
 * WRITTEN AS A HEX, NOT AS `mix(MD3.neutralSecondary, 0.6)`, and that is load-bearing: `Slices`
 * grades every fill it is handed by calling `mix()` on it again, and `mix` parses hex only —
 * handed the `rgb(…)` string `mix` returns, it produces `rgb(NaN NaN NaN)` and the slice renders
 * black, which is the loudest a segment can possibly be. This is `#7a8684` at that same 60%.
 */
const ABSENT_FILL = '#afb6b5'

/**
 * Labels that mean "the record does not say", in every vocabulary this page meets.
 *
 * They take the neutral wherever they appear rather than the next hue in the order, so a reader
 * learns one thing once: grey is an absence. Matched on the label because the vocabularies are
 * the source's verbatim and there is no flag column to read instead.
 */
const ABSENT = /^(un(determined|sexed|known)|indeterminate|not recorded|unspecified)$/i

/**
 * Hues for a whole chart at once, and never `ORDER[i % ORDER.length]`.
 *
 * Index-and-wrap is the bug this replaces: the kestrel carries eight death manners, so slot 5
 * wrapped to slot 0 and the chart drew "Natural" (287) and "Still Birth" (1) in the same green.
 * The counter advances only on a REAL category, so a grey "Undetermined" mid-list does not push
 * its neighbours along the ramp, and it CLAMPS rather than wraps. `foldTail` stops it running out.
 */
export function huesFor(labels: string[]): string[] {
  let next = 0
  return labels.map((l) =>
    ABSENT.test(l.trim()) ? ABSENT_FILL : ORDER[Math.min(next++, ORDER.length - 1)],
  )
}

export interface Slice {
  label: string
  value: number
}

/**
 * Cap a composition at the number of hues that can be told apart, folding the rest into "Other".
 *
 * Past five or six classes adjacent colours blur and the slices are too thin to find — the
 * kestrel's tail is Still Birth 1, Indeterminate 1, Traumatic Injury 1 out of 379. Folding keeps
 * every animal in the total while giving the chart a legend a reader can hold.
 */
export function foldTail(items: Slice[], max = 6): Slice[] {
  if (items.length <= max) return items
  const keep = items.slice(0, max - 1)
  const rest = items.slice(max - 1)
  return [...keep, { label: 'Other', value: rest.reduce((n, s) => n + s.value, 0) }]
}

/** The house focus ring, as `exec/marks.tsx` declares it. */
const FOCUS_RING = { '--tw-ring-color': 'rgba(55,189,105,0.45)' } as React.CSSProperties

/* ── the strip of headline figures ───────────────────────────────────────── */

export function KpiStrip({
  items,
}: {
  /* NO SUB-LINE. The strip carried an optional `note` under each figure and every caller filled
     it, which turned five readings into five short paragraphs. A qualification belongs on the
     card that draws the figure, not stacked under the figure itself. */
  items: { label: string; value: string; tone?: 'good' | 'bad' }[]
}) {
  return (
    /* One hairline grid rather than five gapped cards: these are five readings of one subject,
       and five separated boxes would say they were five subjects. The 1px gap over a HAIR
       ground is the divider — the same hairline every table on the species page rules with. */
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border @[900px]:grid-cols-5"
      style={{ borderColor: HAIR, background: HAIR }}
    >
      {items.map((k) => (
        <div key={k.label} className="bg-white px-4 py-3.5">
          <p className="text-caption" style={{ color: FAINT }}>
            {k.label}
          </p>
          <p
            className="mt-0.5 font-display text-n font-bold tabular-nums"
            style={{ color: k.tone ? TONE[k.tone] : VALUE }}
          >
            {k.value}
          </p>
        </div>
      ))}
    </div>
  )
}

/* ── a card ──────────────────────────────────────────────────────────────── */

export function DashCard({
  title,
  span,
  action,
  onAction,
  children,
}: {
  title: string
  /**
   * THE SPAN THIS CARD IS READ OVER, where it is not the page's own date filter.
   *
   * Three cards on the species Overview deliberately ignore the date pill — the two year charts
   * and Causes of Death — for the reason the tab's own note gives: a year axis under a one-month
   * window is one column, and a cause vocabulary cut to a month is usually empty. That reasoning
   * holds. What was missing was saying so on the card, and the cost of not saying it was a
   * genuine contradiction: the KPI strip read "Deaths 33" for the window while the Causes of
   * Death card beneath it summed to 430 for all time, with nothing on the screen to reconcile
   * them. A reader could only conclude one of the two was wrong.
   *
   * So a card that is not on the page's window states its own. Three words in the corner is the
   * whole fix, and it is the same disclosure this product makes everywhere else it cannot answer
   * a question the way the reader assumed.
   */
  span?: string
  /** The words on the link out — "View Circle of Life". The chevron is added here. */
  action?: string
  onAction?: () => void
  children: ReactNode
}) {
  return (
    <section
      className="flex flex-col rounded-[var(--radius-card)] border bg-white p-[var(--pad-card)]"
      style={{ borderColor: HAIR }}
    >
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-lead font-semibold tracking-[-.2px]" style={{ color: INK }}>
          {title}
        </h3>
        {span && (
          <span className="shrink-0 text-caption whitespace-nowrap" style={{ color: FAINT }}>
            {span}
          </span>
        )}
        {action && onAction && (
          <button
            type="button"
            onClick={onAction}
            /* `tap-tall` gives the small link the 44px hit area its own type size cannot —
               the treatment every other small action in the product now carries. */
            className="tap-tall card-press ml-auto shrink-0 rounded-[8px] text-small font-semibold whitespace-nowrap outline-none focus-visible:ring-2"
            style={{ color: ACCENT_INK, ...FOCUS_RING }}
          >
            {action} ›
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

/* ── the year axis ───────────────────────────────────────────────────────── */

/**
 * Counts against a calendar-year axis.
 *
 * ONLY THE YEARS THAT EXIST. `SpeciesFlow.years` omits a year with no rows rather than
 * zero-filling it, so a species first held in 2023 opens on 2023 and does not imply four quiet
 * years of husbandry it has no record of.
 *
 * THE SCALE ROUNDS UP TO A READABLE STEP rather than sitting on the maximum. A top of 57 puts
 * gridlines at 57 / 42.75 / 28.5 and the axis stops being countable; the 1-2-5 ladder puts them
 * on tens, which is the only reason to draw them.
 *
 * THE COLUMNS ARE GRADED AND THEY PLAY ON SCROLL, both for the reasons `EventTrend` gives: a
 * flat fill makes a column read as a block whose top edge carries the whole value, and a mark
 * that is already drawn when it arrives has nothing to say about which way it grew.
 */
export function YearBars({
  years,
  tone = 'good',
  noun,
  onSelect,
}: {
  years: [number, number][]
  tone?: 'good' | 'bad'
  noun: string
  /**
   * TAPPING A COLUMN OPENS WHAT IS BEHIND IT.
   *
   * The tip already says "2025 · 306 deaths", which answers how many and leaves the reader with
   * no way to ask which — the question a curator actually has. Optional, because a chart with
   * nothing behind it must not grow a cursor that promises there is: the affordance is present
   * exactly where the handler is.
   */
  onSelect?: (year: number, value: number) => void
}) {
  const { ref, animate } = usePlay<HTMLDivElement>()
  const { show, hide, node } = useChartTip()
  /* THE COLUMN FILLS ARE CHART COLOURS, NOT THE TEXT TONES. `TONE.good` is the deep green the
     product sets type in and `TONE.bad` is the error red; at 196px of solid column the pair
     read as a status banner — one severe, one alarming — rather than as two counts. The brand's
     own light green and orange carry the same good/bad distinction at the weight a chart wants.
     Type keeps `TONE`; areas take these. */
  const fill = tone === 'bad' ? MD3.tertiary : MD3.primary

  if (!years.length) {
    return (
      <p className="py-10 text-center text-small" style={{ color: FAINT }}>
        No {noun} recorded.
      </p>
    )
  }

  const peak = Math.max(...years.map(([, v]) => v), 1)
  const raw = peak / 4
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)))
  const stepSize = (raw / mag <= 1 ? 1 : raw / mag <= 2 ? 2 : 5) * mag
  const top = Math.ceil(peak / stepSize) * stepSize
  const lines = Array.from({ length: Math.round(top / stepSize) + 1 }, (_, i) => i * stepSize)
  const total = years.reduce((n, [, v]) => n + v, 0)

  return (
    <div ref={ref} className="pl-8">
      <div
        className="relative h-[196px] rounded-[8px] outline-none focus-visible:ring-2"
        style={FOCUS_RING}
        /* A CHART WITH BUTTONS IN IT IS NOT AN IMAGE. `role="img"` prunes the subtree from the
           accessibility tree, so with columns to tap it becomes a labelled group whose children
           are the real stops — and the reading below stays available on the group itself. Without
           a handler nothing inside is focusable and the single image stop is still the right one. */
        role={onSelect ? 'group' : 'img'}
        tabIndex={onSelect ? undefined : 0}
        aria-label={`${noun}: ${fmt(total)} across ${years.length} years, ${years
          .map(([y, v]) => `${y} ${v}`)
          .join(', ')}.`}
      >
        {lines.map((v) => (
          <div
            key={v}
            className="absolute inset-x-0 h-px"
            style={{ bottom: `${(v / top) * 100}%`, background: v === 0 ? mix(INK, 0.12) : HAIR }}
          >
            <span
              className="absolute -top-2 -left-8 w-6 text-right text-tick tabular-nums"
              style={{ color: FAINT }}
            >
              {v}
            </span>
          </div>
        ))}

        <div className="absolute inset-0 flex items-end justify-around gap-2">
          {years.map(([y, v], i) => {
            const tip = (e: React.PointerEvent) => show(e, String(y), [{ label: noun, value: fmt(v), fill }])
            /* THE WHOLE COLUMN SLOT IS THE TARGET, NOT THE PAINTED BAR. A year with two deaths
               draws a 2px sliver, and asking a reader to hit that is asking them to fail — the
               full-height slot is already what the tip responds to, so it is what the tap
               responds to as well. */
            return (
              <div
                key={y}
                className="relative flex h-full max-w-[104px] flex-1 flex-col justify-end"
                onPointerEnter={tip}
                onPointerDown={tip}
                onPointerMove={tip}
                onPointerLeave={hide}
              >
                {onSelect && (
                  <button
                    type="button"
                    onClick={() => onSelect(y, v)}
                    aria-label={`${fmt(v)} ${noun} in ${y} — open the records`}
                    className="absolute inset-0 z-10 cursor-pointer rounded-[6px] outline-none transition-colors hover:bg-[#16150f]/[0.04] focus-visible:ring-2"
                    style={FOCUS_RING}
                  />
                )}
                <span
                  className={`block origin-bottom rounded-t-[4px] ${animate ? 'animate-grow-y' : ''}`}
                  style={{
                    /* A 2px floor so a quiet year is a mark on the axis rather than a gap the eye
                       reads as missing data. */
                    height: `${Math.max(2, (v / top) * 100)}%`,
                    /* The house column gradient — pale at the tip, full tone at the axis, so the
                       bar has weight where it is anchored and the tip breathes against the card. */
                    background: `linear-gradient(180deg, ${mix(fill, 0.58)} 0%, ${fill} 100%)`,
                    animationDelay: animate ? `${i * 40}ms` : undefined,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {node}
      <div className="mt-2 flex justify-around gap-2">
        {years.map(([y]) => (
          <span
            key={y}
            className="max-w-[104px] flex-1 text-center text-caption tabular-nums"
            style={{ color: MUTED }}
          >
            {y}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── donut and pie ───────────────────────────────────────────────────────── */

/**
 * A composition as a ring or a pie.
 *
 * `inner` AT ZERO GIVES A PIE, and that is the only difference between the two. A ring has a
 * hole to put a headline reading in and is the right form where one exists — "47% sexed" is the
 * question the sex card is actually asked. A pie has no hole and is used where there is none.
 *
 * A 1.6° GAP OFF EACH SEGMENT, NOT A STROKE. A border drawn on a segment sits half inside the
 * colour and darkens it; a gap in the surface separates neighbours without touching either fill.
 *
 * EACH SLICE IS GRADED like every other filled mark in the product — the same pale-to-full ramp
 * `mix()` gives the columns above, run across the slice rather than down it.
 */
export function Slices({
  items,
  inner = 0.62,
  centre,
  size = 188,
  onSelect,
}: {
  items: Slice[]
  /** 0 draws a pie. Otherwise the hole's radius as a fraction of the outer. */
  inner?: number
  /** The two lines in the middle of a ring — a word and a reading. */
  centre?: [string, string]
  size?: number
  /**
   * Tapping a segment opens what is behind it. See the note on `YearBars.onSelect`.
   *
   * A THIN SEGMENT IS A BAD TARGET AND THE LEGEND IS THE RELIEF. Fifteen deaths out of 430 is a
   * 12° wedge, which is a hard tap on a phone and an impossible one for anybody who is not
   * pointing precisely — so `SliceKey` takes the same handler and its rows are full-width. The
   * ring is the fast path, the key is the reliable one, and both are the same action.
   */
  onSelect?: (slice: Slice) => void
}) {
  const uid = useId()
  const { ref, animate, reduce } = usePlay<HTMLDivElement>()
  const { show, hide, node } = useChartTip()
  const total = items.reduce((n, s) => n + s.value, 0)
  const hues = huesFor(items.map((s) => s.label))
  if (!total) return null

  const R = size / 2
  const ro = R - 4
  const ri = inner ? ro * inner : 0
  const GAP = 1.6
  let at = -90

  const rad = (d: number) => (d * Math.PI) / 180
  const pt = (r: number, d: number): [number, number] => [R + r * Math.cos(rad(d)), R + r * Math.sin(rad(d))]

  return (
    <div ref={ref} className="grid place-items-center py-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-labelledby={uid}
        /* `animate-fade-up`, NOT `animate-rise`. Both are house tokens and only one is right
           here: `rise` is `scaleY(0)`, which grows a mark off a baseline — correct for a column
           and wrong for a ring, which it plays as a circle being squashed flat and then
           un-squashed. A radial mark has no baseline to grow from, so it takes the same
           reveal every card on the page uses.

           THE THIRD STATE IS THE ONE THAT WAS MISSING, AND IT HID THE CHART COMPLETELY.
           `usePlay` returns `animate: inView && !reduce` — so under
           `prefers-reduced-motion: reduce` it is false forever, and this fell to `opacity-0`
           with nothing that could ever clear it. Every donut and pie in the product was
           invisible to a reader who asks for less motion: the legend, the tooltip and the
           screen-reader title were all correct and the mark itself never appeared. `Reveal`
           in `motion.tsx` has always got this right — `play = inView || reduce` — and the
           difference is that `animate` means "run the animation" rather than "be visible",
           so a caller that uses it to gate opacity has to spend the reduced case itself.
           Reduced motion shows the finished mark at once, which is what it asked for. */
        className={`overflow-visible ${animate ? 'animate-fade-up' : reduce ? '' : 'opacity-0'}`}
      >
        <title id={uid}>
          {items.map((s) => `${s.label} ${fmt(s.value)}`).join(', ')}
        </title>
        <defs>
          {items.map((s, i) => (
            <linearGradient key={s.label} id={`${uid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={mix(hues[i], 0.82)} />
              <stop offset="100%" stopColor={hues[i]} />
            </linearGradient>
          ))}
        </defs>
        {items.map((s, i) => {
          const sweep = (s.value / total) * 360
          const a = at + GAP / 2
          const b = at + sweep - GAP / 2
          at += sweep
          if (b <= a) return null
          const big = b - a > 180 ? 1 : 0
          const [x1, y1] = pt(ro, a)
          const [x2, y2] = pt(ro, b)
          const d = ri
            ? (() => {
                const [x3, y3] = pt(ri, b)
                const [x4, y4] = pt(ri, a)
                return `M${x1} ${y1}A${ro} ${ro} 0 ${big} 1 ${x2} ${y2}L${x3} ${y3}A${ri} ${ri} 0 ${big} 0 ${x4} ${y4}Z`
              })()
            : `M${R} ${R}L${x1} ${y1}A${ro} ${ro} 0 ${big} 1 ${x2} ${y2}Z`
          const pct = Math.round((s.value / total) * 100)
          return (
            /* The native `<title>` stays for the screen reader; the visual reading is the
               product's own tip, which lands where the pointer is. */
            <path
              key={s.label}
              d={d}
              fill={`url(#${uid}-g${i})`}
              className={onSelect ? 'cursor-pointer' : undefined}
              onPointerEnter={(e) => show(e, s.label, [{ label: `${pct}% of ${fmt(total)}`, value: fmt(s.value), fill: hues[i] }])}
              onPointerDown={(e) => show(e, s.label, [{ label: `${pct}% of ${fmt(total)}`, value: fmt(s.value), fill: hues[i] }])}
              onPointerMove={(e) => show(e, s.label, [{ label: `${pct}% of ${fmt(total)}`, value: fmt(s.value), fill: hues[i] }])}
              onPointerLeave={hide}
              /* NO `tabIndex` ON THE SEGMENTS, deliberately. Six wedges plus six legend rows is
                 twelve tab stops for six actions, and the segment is the worse of the two to
                 land on — a focus ring on a path is drawn round its bounding box, which for a
                 wedge is most of the circle. The key below carries the keyboard path. */
              onClick={onSelect ? () => onSelect(s) : undefined}
            >
              <title>{`${s.label}: ${fmt(s.value)} (${pct}%)`}</title>
            </path>
          )
        })}
        {centre && (
          <>
            <text x={R} y={R - 6} textAnchor="middle" className="text-caption" fill={FAINT}>
              {centre[0]}
            </text>
            <text
              x={R}
              y={R + 21}
              textAnchor="middle"
              className="font-display text-n-sm font-bold tracking-[-.6px] tabular-nums"
              fill={VALUE}
            >
              {centre[1]}
            </text>
          </>
        )}
      </svg>
      {node}
    </div>
  )
}

/**
 * The key under a composition. Always present — identity is never carried by colour alone.
 *
 * WITH A HANDLER IT IS ALSO THE CHART'S KEYBOARD AND ITS BIG TARGET. See the note on
 * `Slices.onSelect`: a 12° wedge is not a tap target, and a legend row is. Hand both the same
 * handler and the reader can use whichever they can hit.
 */
export function SliceKey({ items, onSelect }: { items: Slice[]; onSelect?: (slice: Slice) => void }) {
  const hues = huesFor(items.map((s) => s.label))
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {items.map((s, i) => {
        const body = (
          <>
            <span
              className="size-[9px] shrink-0 rounded-[2.5px]"
              style={{ background: hues[i] }}
              aria-hidden
            />
            {s.label}{' '}
            <b className="font-semibold tabular-nums" style={{ color: VALUE }}>
              {fmt(s.value)}
            </b>
          </>
        )
        return (
          <li key={s.label} className="flex items-center text-caption" style={{ color: INK2 }}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(s)}
                /* `tap-tall` gives the caption-sized row the 44px hit area its type cannot —
                   the same treatment `DashCard`'s action link takes. */
                className="tap-tall card-press flex items-center gap-2 rounded-[8px] px-1 outline-none focus-visible:ring-2"
                style={FOCUS_RING}
              >
                {body}
              </button>
            ) : (
              <span className="flex items-center gap-2">{body}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* ── a ranked list with a track ──────────────────────────────────────────── */

export function RankRows({
  rows,
  total,
  onOpen,
}: {
  rows: { key: string; label: string; value: number }[]
  total: number
  onOpen?: (key: string) => void
}) {
  const { ref, animate } = usePlay<HTMLUListElement>()
  const peak = Math.max(...rows.map((r) => r.value), 1)

  return (
    <ul ref={ref} className="flex flex-col">
      {rows.map((r, i) => {
        const share = (r.value / Math.max(1, total)) * 100
        const body = (
          <>
            <span className="flex items-baseline gap-3">
              <span className="min-w-0 flex-1 truncate text-small" style={{ color: INK }}>
                {r.label}
              </span>
              <span className="shrink-0 text-small font-semibold tabular-nums" style={{ color: VALUE }}>
                {fmt(r.value)}
              </span>
              {/* A REAL SHARE UNDER ONE PER CENT PRINTS AS "<1%", NEVER "0%". A register that
                  rounds an animal it is holding down to nothing is making a false statement. */}
              <span className="w-11 shrink-0 text-right text-caption tabular-nums" style={{ color: FAINT }}>
                {share >= 1 ? `${Math.round(share)}%` : '<1%'}
              </span>
            </span>
            <span
              className="mt-[7px] block h-[6px] overflow-hidden rounded-full"
              style={{ background: TRACK }}
              aria-hidden
            >
              <span
                className={`block h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
                style={{
                  width: `${Math.max(2, (r.value / peak) * 100)}%`,
                  /* Graded along the bar's own length, in the same light green the columns
                     above take — a rank bar is a count, so it reads in the chart green rather
                     than in the deep green the product sets type in. */
                  background: `linear-gradient(90deg, ${MD3.primary} 0%, ${mix(MD3.primary, 0.72)} 100%)`,
                  animationDelay: animate ? `${i * 40}ms` : undefined,
                }}
              />
            </span>
          </>
        )
        return (
          <li key={r.key} className="border-b py-2.5 last:border-0" style={{ borderColor: HAIR }}>
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(r.key)}
                className="card-press tap-tall -mx-2 block w-[calc(100%+1rem)] rounded-[10px] px-2 text-left outline-none focus-visible:ring-2"
                style={FOCUS_RING}
              >
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

/* ── label / value rows ──────────────────────────────────────────────────── */

export function FactRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <div className="flex flex-col">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center gap-3 border-b py-2.5 last:border-0"
          style={{ borderColor: HAIR }}
        >
          <span className="flex-1 text-small" style={{ color: MUTED }}>
            {r.label}
          </span>
          <span className="text-right text-small font-semibold" style={{ color: VALUE }}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}
