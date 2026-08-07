/**
 * Executive module-page design system — matched to the v3 home screen.
 *
 * Home screen language, verbatim: warm sage ground (#e7f0ea), floating white
 * `rounded-[16px]` cards, DM Sans for text, rounded numerals in #2f2424, and one
 * accent hue per module carried by the section icons and the data marks.
 *
 * Within a card, series magnitude is lightness steps of that single accent — never
 * cycled hues. Status keeps its own semantic colours so "critical" never reads as
 * decoration.
 *
 * These are composition primitives, not a template. Each module assembles them in
 * its own order — see `src/exec/pages/`.
 */

import { createContext, useContext, useState, type ComponentType, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { AnimatedValue, Reveal, usePlay } from '../motion'
import { usePeriod } from './period'
import { siteCut } from './sites'

/* ── tokens (from the v3 home screen) ────────────────────────────────────── */
export const GROUND = '#e7f0ea'

/**
 * The page ground, as a gradient rather than a flat fill.
 *
 * Flat #e7f0ea is only 4% saturated, and beside a white card it reads as white — which
 * it did for everything below the header, because the header's green ramp stops at 880px
 * and the page runs to three times that. This keeps the sage present the whole way down,
 * deepening gently so the bottom of a long scroll is still recognisably green.
 *
 * Applied to all four surfaces that used the flat colour — the home, the module sheet,
 * and both parts of the search overlay — from here, so they cannot drift apart.
 */
export const GROUND_GRADIENT = 'linear-gradient(180deg, #ddeae3 0%, #c6ddd1 100%)'
export const INK = '#1c1a16'
export const VALUE = '#2f2424'
/**
 * The ink every HERO figure is set in.
 *
 * Its own constant rather than `VALUE`, because a hero is doing a different job from a table cell.
 * `VALUE`'s warm near-black sits correctly among body copy; at 52–58pt on a white card it reads
 * brown. `#08100C` is a near-black with the ground's green in it, so the largest figure on a page
 * belongs to the same palette as the sage it sits on rather than looking like borrowed body type.
 *
 * ONE CONSTANT, NOT A COLOUR PER CALL SITE. Fourteen heroes across nine files were each taking
 * `Figure`'s default, so changing the hero ink meant finding all fourteen.
 *
 * IT NOW CARRIES THE HOME CARDS TOO, severity counts included. A tinted figure was meant to make
 * the bad ones findable, and at ten alert tiles and six risk rows it did the opposite — most of
 * the numbers on the page were red or amber, so none of them stood out. The level chip and the
 * glyph state severity on those rows already; the number states the quantity.
 */
export const HERO_INK = '#08100C'
export const INK2 = '#3d3a34'
export const MUTED = '#6d6860'
export const FAINT = '#9b958b'
export const HAIR = '#f0efec'
export const TRACK = '#f2f1ed'
export const TONE = { good: '#1e7a44', warn: '#b45309', bad: '#dc2626', neutral: '#9b958b' } as const
export type Tone = keyof typeof TONE

/**
 * IUCN Red List category colours, as published.
 *
 * The second sanctioned exception to one-accent-per-page, alongside the semantic
 * tones — and for the same reason. These are not decoration and not ours: a curator
 * reads them on the Red List, on enclosure signage and in every conservation report,
 * so recolouring them to fit a green ramp would be discarding encoding the reader
 * already has. Note the yellows are unreadable as text on white; they are bar fills
 * with the label outside the bar, never type.
 */
export const IUCN = {
  'Least Concern': '#60C659',
  'Near Threatened': '#CCE226',
  Vulnerable: '#F9E814',
  Endangered: '#FC7F3F',
  'Critically Endangered': '#D81E05',
  'Extinct in the Wild': '#542344',
  Extinct: '#000000',
  'Data Deficient': '#D1D1C6',
} as const

/**
 * The Red List categories as their published badges — two-letter code, official fill,
 * in assessment order from unassessed through to extinct.
 *
 * `ink` is chosen for legibility, NOT copied from the reference sheet. The official
 * artwork sets white type on the yellow of Vulnerable and the green of Least Concern,
 * which is about 1.9:1 and 2.2:1 — unreadable at the 40px this renders at. The FILL is
 * the part that carries the standard and is exact; the code on top of it is dark
 * wherever the fill is light. `Not Evaluated` is white and so needs an outline to be a
 * badge at all.
 */
export const RED_LIST = [
  /* `tier` groups the ten as IUCN itself does. It is what lets the card rank them:
     a conservation card exists for the at-risk tail, so those rows lead and carry the
     larger type, and Least Concern — much the biggest number and much the least
     interesting — sits below them. */
  { code: 'EX', name: 'Extinct', fill: '#000000', ink: '#ffffff', tier: 'risk' },
  { code: 'EW', name: 'Extinct in the Wild', fill: '#542344', ink: '#ffffff', tier: 'risk' },
  { code: 'CR', name: 'Critically Endangered', fill: '#D81E05', ink: '#ffffff', tier: 'risk' },
  { code: 'EN', name: 'Endangered', fill: '#FC7F3F', ink: '#3f1a02', tier: 'risk' },
  { code: 'VU', name: 'Vulnerable', fill: '#F9E814', ink: '#3d3703', tier: 'risk' },
  { code: 'NT', name: 'Near Threatened', fill: '#CCE226', ink: '#33380a', tier: 'lower' },
  { code: 'LC', name: 'Least Concern', fill: '#60C659', ink: '#12301b', tier: 'lower' },
  { code: 'DD', name: 'Data Deficient', fill: '#D1D1C6', ink: '#37352f', tier: 'open' },
  { code: 'NE', name: 'Not Evaluated', fill: '#ffffff', ink: '#37352f', outline: '#c8c3ba', tier: 'open' },
  { code: 'NC', name: 'Not Checked', fill: '#B7B7B7', ink: '#37352f', tier: 'open' },
] as const

const RED_LIST_TIERS = [
  { key: 'risk', label: 'At risk' },
  { key: 'lower', label: 'Lower risk' },
  { key: 'open', label: 'Unassessed' },
] as const

export type RedListCode = (typeof RED_LIST)[number]['code']

/**
 * Two darker greens the report layer needs and `mix()` cannot produce — `mix`
 * only lightens toward white. `DEEP` is the record table's header bar, the one
 * dark surface in the app; `ACCENT_INK` is accent-coloured text that still
 * passes contrast on a pale accent wash.
 */
export const DEEP = '#123a2c'
export const ACCENT_INK = '#1a6b40'

/**
 * ONE accent for every module — the home screen's hero green. Fourteen different
 * module hues made the sheets busy and fought the sage ground, so colour identity
 * now comes from the ground and the type, not from a per-module tint. Icons and
 * data marks wear this; text never does.
 */
export const ACCENT = '#2f9e5b'
const AccentContext = createContext(ACCENT)
export const AccentProvider = AccentContext.Provider
export const useAccent = () => useContext(AccentContext)

/** Lightness steps of the accent — magnitude, not identity. */
export const step = (i: number) => [1, 0.66, 0.46, 0.31, 0.2, 0.13][i] ?? 0.1
/** Accent flattened over white at `a` — keeps strokes crisp where opacity would fade them. */
export const mix = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  const m = (c: number) => Math.round(c * a + 255 * (1 - a))
  return `rgb(${m((n >> 16) & 255)} ${m((n >> 8) & 255)} ${m(n & 255)})`
}

export const fmt = (n: number) => n.toLocaleString('en-US')
export const compact = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (a >= 100_000) return `${Math.round(n / 1000)}K`
  if (a >= 10_000) return `${(n / 1000).toFixed(1)}K`
  return fmt(n)
}
/**
 * First letter up, the rest left alone.
 *
 * The caption under a figure is assembled from a metric's own unit noun — "animals",
 * "under care", "deaths" — which reads as an unfinished sentence under a 34pt number.
 * Sentence case, NOT title case: half these lines start with a fraction ("2,184 of
 * 2,374 covered") and title-casing that gives "2,184 Of 2,374 Covered".
 */
export const sentenceCase = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export const signTone = (s: string) => {
  const t = s.trim()
  if (t.startsWith('+')) return '#37bd69'
  if (t.startsWith('-') || t.startsWith('−')) return '#fa6140'
  return undefined
}

type Icon = ComponentType<{ size?: number | string; strokeWidth?: number; className?: string; style?: object }>

/* ── structure ───────────────────────────────────────────────────────────── */

/**
 * One card. Header wears the module icon in the accent, exactly like a home tile:
 * 16px glyph + 15px medium ink title.
 */
export function Section({
  icon: Glyph,
  label,
  aside,
  tight = false,
  children,
}: {
  icon?: Icon
  label?: string
  aside?: ReactNode
  /** Half-width cards inside a `Duo` — 20px of padding would eat the number. */
  tight?: boolean
  children: ReactNode
}) {
  const accent = useAccent()
  return (
    /* Each card fades up as it scrolls in; the marks inside read the same signal
       through their own observer, so a card and its data animate together. */
    <Reveal>
      <section className={`rounded-[var(--radius-card)] bg-white ${tight ? 'p-[var(--pad-card-sm)]' : 'p-[var(--pad-card)]'}`} aria-label={label}>
        {label && (
          <header className={`flex items-center justify-between gap-3 ${tight ? 'mb-3' : 'mb-4'}`}>
            <span className="flex min-w-0 items-center gap-2">
              {Glyph && <Glyph size={16} strokeWidth={1.75} style={{ color: accent }} aria-hidden />}
              {/* Wraps rather than truncates — a clipped section title loses meaning. */}
              <h2
                className={`font-medium text-balance text-[#1c1a16] ${
                  tight ? 'text-[13px] leading-[17px]' : 'text-[15px] leading-[20px]'
                }`}
              >
                {label}
              </h2>
            </span>
            {aside && <span className="shrink-0 text-[12px] whitespace-nowrap text-[#9b958b]">{aside}</span>}
          </header>
        )}
        {children}
      </section>
    </Reveal>
  )
}

/** The card stack — sage ground and 12px gaps, same rhythm as the home main. */
export function Stack({ children }: { children: ReactNode }) {
  /* Where every module and record page becomes responsive. None of the twenty
     pages sets a width, a column count or a type size of its own — each is a
     list of `Section`s handed to this component — so widening the stack here
     widens all of them, and no page had to be touched to gain a tablet layout.

     Two columns only past 760px of STACK, not of window. These cards pack three
     and four figures into a row and those figures grow a step per tier; halving
     a 600px column while the numbers grow puts a six-digit figure into a 90px
     cell, where it collides with its neighbour rather than merely overflowing.
     And the measurement has to be of the column: with a sidebar and an executive
     panel flanking it, a 1280 desktop hands this stack less width than a 1194
     tablet landscape does. See the note in `index.css`. */
  return (
    <div className="flex w-full flex-col gap-[var(--gap)] px-[var(--gutter-lg)] pb-2 @[760px]:grid @[760px]:grid-cols-2 @[760px]:items-start">
      {children}
    </div>
  )
}

/** Two half-width cards on one line — breaks the single-column drumbeat. */
export function Duo({ children }: { children: ReactNode }) {
  /* Inside a two-column `Stack` this would nest a pair inside a half, giving four
     cards across and none of them legible, so past the break it spans the full
     stack width and keeps its own two-up split. */
  return <div className="grid grid-cols-2 items-start gap-[var(--gap)] @[760px]:col-span-2">{children}</div>
}

/** Subhead inside a card, so one card can carry two grouped fact sets. */
export function Rule({ label }: { label: string }) {
  return (
    <div className="mt-5 mb-3 flex items-center gap-3">
      <span className="text-[10px] font-medium tracking-[0.09em] text-[#9b958b] uppercase">{label}</span>
      <span className="h-px flex-1" style={{ backgroundColor: HAIR }} />
    </div>
  )
}

/** Big number, rounded numerals — the page's typographic anchor. */
export function Figure({
  value,
  unit,
  size = 30,
  color = VALUE,
}: {
  value: string
  unit?: string
  size?: number
  color?: string
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <AnimatedValue
        value={value}
        className="font-display font-bold tabular-nums"
        style={{ fontSize: `calc(${size}px * var(--fig-scale))`, lineHeight: 1.05, letterSpacing: '-0.025em', color }}
      />
      {unit && <span className="text-[13px] text-[#9b958b]">{unit}</span>}
    </span>
  )
}

/* ── hero ────────────────────────────────────────────────────────────────── */

/**
 * The 3-second read, on the sage ground above the cards.
 *
 * Strict order: number, then the word that names it, then supporting numbers.
 * There is no prose slot by design — a sentence here would be the first thing
 * read on the page and the number would come second.
 */
export function Hero({
  icon: Glyph,
  value,
  unit,
  label,
  stats,
  status,
  tone = 'neutral',
  align = 'left',
}: {
  icon?: Icon
  value: string
  unit?: string
  /** One or two words. Names the number, never explains it. */
  label: string
  /** Up to three supporting figures, hairline-separated. */
  stats?: { value: string; unit?: string; label: string }[]
  /** Short token — "+324 Month", "3 past SLA". Never a sentence. */
  status?: string
  tone?: Tone
  align?: 'left' | 'center'
}) {
  const accent = useAccent()
  const centred = align === 'center'
  return (
    /* The hero is a card like every other section — sitting bare on the sage
       ground left it reading as page chrome rather than as the module's headline. */
    <div className="w-full px-[var(--gutter-lg)] pb-3">
      <section
        className={`animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)] ${centred ? 'text-center' : ''}`}
        aria-label={label}
      >
        <Figure value={value} unit={unit} size={58} color={HERO_INK} />
        <p
          className={`mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34] ${centred ? 'justify-center' : ''}`}
        >
          {Glyph && <Glyph size={15} strokeWidth={1.75} style={{ color: accent }} aria-hidden />}
          {label}
        </p>
        {status && (
          <p className={`mt-3 flex items-center gap-2 ${centred ? 'justify-center' : ''}`}>
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone] }} aria-hidden />
            <span className="text-[13px] font-medium" style={{ color: TONE[tone] }}>
              {status}
            </span>
          </p>
        )}
        {stats && stats.length > 0 && (
          <div className="mt-5 flex items-stretch border-t border-[#f0efec] pt-4">
            {stats.map((s, i) => (
              <span
                key={`${s.label}-${i}`}
                className={`min-w-0 flex-1 ${i ? 'border-l border-[#f0efec] pl-4' : ''} ${
                  i < stats.length - 1 ? 'pr-4' : ''
                } ${centred ? 'text-center' : ''}`}
              >
                <Figure value={s.value} unit={s.unit} size={24} />
                <span className="mt-0.5 block truncate text-[12px] text-[#6d6860]">{s.label}</span>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/* ── data marks ──────────────────────────────────────────────────────────── */

/** Current status — dots carry state so it reads before a number is parsed. */
export function StatusList({ items }: { items: { label: string; value: string; tone?: Tone }[] }) {
  return (
    <ul className="divide-y divide-[#f0efec]">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span
            className="size-[7px] shrink-0 rounded-full"
            style={{ backgroundColor: TONE[it.tone ?? 'neutral'] }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-[14px] text-[#1c1a16]">{it.label}</span>
          <span
            className="shrink-0 text-[14px] font-medium tabular-nums"
            style={{ color: it.tone && it.tone !== 'neutral' ? TONE[it.tone] : INK2 }}
          >
            {it.value}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Key metrics in a hairline grid — one card holds them all, nothing repeats. */
export function MetricGrid({
  items,
  cols = 2,
}: {
  items: { label: string; value: string; unit?: string; note?: string }[]
  cols?: 2 | 3
}) {
  return (
    <div className={`grid ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-x-4`}>
      {items.map((m, i) => (
        <div
          key={m.label}
          className={`py-3 first:pt-0 ${i >= cols ? 'border-t border-[#f0efec]' : ''} ${
            i % cols !== 0 ? 'border-l border-[#f0efec] pl-4' : ''
          } ${i < cols ? 'pt-0' : ''}`}
        >
          <Figure value={m.value} unit={m.unit} size={cols === 3 ? 24 : 28} />
          <p className="mt-1 text-[13px] text-[#3d3a34]">{m.label}</p>
          {m.note && <p className="mt-0.5 text-[11px] text-[#9b958b]">{m.note}</p>}
        </div>
      ))}
    </div>
  )
}

/**
 * Ranked composition — bar length is the message, accent step is the rank.
 *
 * `color` overrides the accent step for one row, and exists for scales whose colours
 * mean something OUTSIDE this app. The IUCN Red List categories are the case:
 * "Critically Endangered" is red the world over, and rendering it as the palest step
 * of a green ramp because it happens to be the smallest number would be throwing away
 * the one piece of encoding every reader already knows. Use it for published scales
 * only — never to give an ordinary series its own hues.
 */
export function Bars({
  items,
  unit,
  showShare = false,
}: {
  items: { label: string; value: number; sub?: string; color?: string }[]
  unit?: string
  showShare?: boolean
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay<HTMLUListElement>()
  const max = Math.max(...items.map((i) => i.value), 1)
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <ul ref={ref} className="flex flex-col gap-3.5">
      {items.map((it, i) => (
        <li key={it.label}>
          <div className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate text-[14px] text-[#1c1a16]">{it.label}</span>
            {it.sub && <span className="shrink-0 text-[11px] text-[#9b958b]">{it.sub}</span>}
            <span className="shrink-0 text-[14px] font-medium tabular-nums text-[#1c1a16]">
              {compact(it.value)}
              {unit && <span className="ml-0.5 text-[11px] font-normal text-[#9b958b]">{unit}</span>}
              {showShare && (
                /* A decimal below 1%, because `toFixed(0)` printed "0%" beside 388
                   Critically Endangered animals — a real figure rounded into
                   nothing. Whole numbers everywhere else. */
                <span className="ml-1.5 text-[11px] font-normal text-[#9b958b]">
                  {(() => {
                    const pct = (it.value / total) * 100
                    return pct >= 1 || pct === 0 ? pct.toFixed(0) : pct.toFixed(1)
                  })()}
                  %
                </span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
            <div
              className={`h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
              style={{
                /* Floor of 4%, not 2%. On a distribution as skewed as the IUCN
                   categories — 178,240 against 388, a 460× spread — a 2% stub
                   rendered as a dot too small to take a colour from, which defeats
                   the point of colouring it. 4% is the least that reads as a bar.
                   The number and share beside it carry the magnitude; the bar's job
                   at this end is to be identifiably red. */
                width: `${Math.max(4, (it.value / max) * 100)}%`,
                backgroundColor: it.color ?? mix(accent, step(i)),
                animationDelay: animate ? `${i * 60}ms` : undefined,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** One stacked bar + legend — composition at a glance. */
export function Composition({ items, unit }: { items: { label: string; value: number }[]; unit?: string }) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <div ref={ref}>
      <div className="flex h-[11px] w-full gap-[2px]">
        {items.map((it, i) => (
          <div
            key={it.label}
            className={`h-full origin-left first:rounded-l-full last:rounded-r-full ${animate ? 'animate-grow-x' : ''}`}
            style={{
              width: `${(it.value / total) * 100}%`,
              backgroundColor: mix(accent, step(i)),
              animationDelay: animate ? `${i * 70}ms` : undefined,
            }}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-baseline gap-2">
            <span
              className="mt-[5px] size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: mix(accent, step(i)) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-[#3d3a34]">{it.label}</span>
            <span className="shrink-0 text-[13px] font-medium tabular-nums text-[#1c1a16]">
              {((it.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
      {unit && <p className="mt-3 text-[11px] text-[#9b958b]">{fmt(total)} {unit} total</p>}
    </div>
  )
}

/** Thin sparkline with a soft wash and an emphasized endpoint. */
export function Spark({ values, h = 40, w = 120 }: { values: number[]; h?: number; w?: number }) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = w / Math.max(values.length - 1, 1)
  const pts = values.map((v, i) => [i * stepX, 3 + (1 - (v - min) / span) * (h - 6)] as const)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[40px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
        <path
          d={`${d} L ${w} ${h} L 0 ${h} Z`}
          fill={accent}
          opacity={0.1}
          className={animate ? 'animate-veil' : undefined}
          style={animate ? { animationDelay: '200ms' } : undefined}
        />
        <path
          d={d}
          fill="none"
          stroke={accent}
          strokeWidth={1.75}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray={animate ? 1 : undefined}
          className={animate ? 'animate-draw' : undefined}
        />
        <circle
          cx={last[0]}
          cy={last[1]}
          r={2.75}
          fill={accent}
          className={animate ? 'animate-pop' : undefined}
          style={animate ? { animationDelay: '760ms' } : undefined}
        />
      </svg>
    </div>
  )
}

/**
 * `Spark` for a FLOW — the same glance, drawn as columns instead of a line.
 *
 * This system already distinguishes the two: `Spark`/`Trend` draw a line through a
 * standing quantity, `Columns` draws period counts as bars. A line through "births
 * per month" implies a continuous value between the months, and there isn't one —
 * eleven births on the 3rd and none on the 4th is not a slope. So a flow gets bars.
 *
 * `Columns` is that mark with a value label, an axis row and 92px of height, which is
 * right in a card and far too much in a KPI tile. This is the same encoding at tile
 * scale: latest column in full accent, the rest recessive, nothing else.
 */
export function SparkBars({ values, h = 34 }: { values: number[]; h?: number }) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const max = Math.max(...values, 1)
  return (
    <div ref={ref} className="flex items-end gap-[3px]" style={{ height: h }}>
      {values.map((v, i) => (
        <span
          key={i}
          className={`min-w-0 flex-1 origin-bottom rounded-[2px] ${animate ? 'animate-grow-y' : ''}`}
          style={{
            /* Floor of 3px so a zero month is still a mark on the axis rather than a
               gap the eye reads as missing data. */
            height: `${Math.max(3, (v / max) * h)}px`,
            backgroundColor: i === values.length - 1 ? accent : mix(accent, 0.3),
            animationDelay: animate ? `${i * 35}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}

/** Matrix heat grid — density read, normalised across the observed range. */
export function Matrix({
  rows,
  cols,
  values,
}: {
  rows: string[]
  cols: string[]
  values: number[][]
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const flat = values.flat()
  const lo = Math.min(...flat)
  const hi = Math.max(...flat)
  const span = hi - lo || 1
  return (
    <div ref={ref}>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[3px]">
          <thead>
            <tr>
              <th />
              {cols.map((c) => (
                <th key={c} className="pb-1 text-[10px] font-normal text-[#9b958b]">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r}>
                <th className="pr-2 text-right text-[12px] font-normal whitespace-nowrap text-[#3d3a34]">{r}</th>
                {cols.map((c, ci) => {
                  const v = values[ri]?.[ci] ?? 0
                  return (
                    <td key={c} className="p-0">
                      <span
                        className={`block h-[26px] rounded-[5px] ${animate ? 'animate-veil' : ''}`}
                        style={{
                          backgroundColor: mix(accent, 0.1 + ((v - lo) / span) * 0.8),
                          animationDelay: animate ? `${(ri + ci) * 45}ms` : undefined,
                        }}
                        title={`${r} · ${c}: ${v}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Status tray — mirrors a physical thing (trays, paddocks, wards, sites). */
export function Tray({
  cells,
  cols = 4,
}: {
  cells: { value: string; label: string; tone?: Tone }[]
  cols?: 3 | 4
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  /* The figure has to fit the CHIP, not the grid cell. Each chip carries 10px of
     padding either side and the grid 8px between them, so at four up "215,432" has
     ~51px to live in — at a fixed 18px it needs ~72px and printed straight over its
     own rounded edge, crowding the label under it at the same time. `Snapshot` and
     `Scoreboard` already fit their figures; this one was the outlier. */
  const chip = (310 - (cols - 1) * 8) / cols - 20
  const size = Math.min(
    18,
    Math.max(13, Math.floor(chip / Math.max(...cells.map((c) => figureEm(c.value)), 0.6))),
  )
  return (
    <div ref={ref}>
      <div className={`grid ${cols === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
        {cells.map((c, i) => (
          /* One calm wash for every cell — a red or amber panel per cell turned the
             grid into a heat map of alarm. The small dot carries state instead. */
          <div
            key={c.label}
            className={`rounded-[12px] px-2.5 py-3 ${animate ? 'animate-fade-up' : ''}`}
            style={{ backgroundColor: mix(accent, 0.07), animationDelay: animate ? `${i * 45}ms` : undefined }}
          >
            <div className="flex items-center gap-1.5">
              {c.tone && c.tone !== 'neutral' && (
                <span className="size-[6px] shrink-0 rounded-full" style={{ backgroundColor: TONE[c.tone] }} aria-hidden />
              )}
              <Figure value={c.value} size={size} />
            </div>
            {/* Wraps to a second line rather than clipping — "Savanna 1" and
                "Savanna 3" both truncate to "Savanna…" at four columns. */}
            <p className="mt-1 text-[10.5px] leading-[14px] text-[#6d6860]">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Stage flow — counts sit outside the bar so they're readable at any fill. */
export function Funnel({ stages, unit }: { stages: { label: string; value: number; sub?: string }[]; unit?: string }) {
  const accent = useAccent()
  const { ref, animate } = usePlay<HTMLUListElement>()
  const max = Math.max(...stages.map((s) => s.value), 1)
  return (
    <ul ref={ref} className="flex flex-col gap-3">
      {stages.map((s, i) => (
        <li key={s.label}>
          <div className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 text-[14px] text-[#1c1a16]">{s.label}</span>
            {s.sub && <span className="shrink-0 text-[11px] text-[#9b958b]">{s.sub}</span>}
            <span className="shrink-0 text-[14px] font-medium tabular-nums text-[#1c1a16]">
              {s.value}
              {unit && <span className="ml-0.5 text-[11px] font-normal text-[#9b958b]">{unit}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-[8px] w-full overflow-hidden rounded-[4px]" style={{ backgroundColor: TRACK }}>
            <div
              className={`h-full origin-left rounded-[4px] ${animate ? 'animate-grow-x' : ''}`}
              style={{
                width: `${Math.max(2, (s.value / max) * 100)}%`,
                backgroundColor: mix(accent, 0.3 + step(i) * 0.55),
                animationDelay: animate ? `${i * 70}ms` : undefined,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Directional flow — where things came from and went to. */
export function Lanes({
  routes,
  unit,
}: {
  routes: { from: string; to: string; value: number; sub?: string }[]
  unit?: string
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay<HTMLUListElement>()
  const max = Math.max(...routes.map((r) => r.value), 1)
  return (
    <ul ref={ref} className="flex flex-col gap-3.5">
      {routes.map((r, i) => (
        <li key={`${r.from}-${r.to}`}>
          <div className="flex items-baseline gap-2 text-[14px]">
            <span className="min-w-0 truncate text-[#1c1a16]">{r.from}</span>
            <span className="shrink-0 text-[#9b958b]" aria-hidden>→</span>
            <span className="min-w-0 flex-1 truncate text-[#1c1a16]">{r.to}</span>
            <span className="shrink-0 font-medium tabular-nums text-[#1c1a16]">
              {r.value}
              {unit && <span className="ml-0.5 text-[11px] font-normal text-[#9b958b]">{unit}</span>}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
              <span
                className={`block h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
                style={{
                  width: `${(r.value / max) * 100}%`,
                  backgroundColor: mix(accent, step(i)),
                  animationDelay: animate ? `${i * 60}ms` : undefined,
                }}
              />
            </span>
            {r.sub && <span className="shrink-0 text-[11px] text-[#9b958b]">{r.sub}</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Ranked contributors — five rows, scannable in three seconds. */
export function Ledger({
  items,
  rank = true,
}: {
  items: { label: string; sub?: string; value: string; share?: number }[]
  rank?: boolean
}) {
  const accent = useAccent()
  return (
    <ol className="divide-y divide-[#f0efec]">
      {items.map((it, i) => (
        <li key={it.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          {rank && (
            <span className="w-[14px] shrink-0 text-[12px] tabular-nums text-[#9b958b]">{String(i + 1)}</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] text-[#1c1a16]">{it.label}</span>
            {it.sub && <span className="mt-0.5 block text-[11px] leading-[15px] text-[#9b958b]">{it.sub}</span>}
          </span>
          {it.share !== undefined && (
            <span className="h-[5px] w-[44px] shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(3, it.share)}%`, backgroundColor: mix(accent, 0.7) }}
              />
            </span>
          )}
          <span className="shrink-0 text-[14px] font-medium tabular-nums text-[#1c1a16]">{it.value}</span>
        </li>
      ))}
    </ol>
  )
}

/** Period columns — the emphasized bar in full accent, the rest recessive. */
export function Columns({
  values,
  labels,
  highlight,
  unit,
}: {
  values: number[]
  labels: string[]
  highlight?: number
  unit?: string
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const max = Math.max(...values, 1)
  const hi = highlight ?? values.length - 1
  return (
    <div ref={ref}>
      <div className="flex h-[92px] items-end gap-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            {i === hi && <span className="text-[11px] font-semibold tabular-nums text-[#1c1a16]">{compact(v)}</span>}
            <span
              className={`w-full origin-bottom rounded-[4px] ${animate ? 'animate-grow-y' : ''}`}
              style={{
                height: `${Math.max(4, (v / max) * 68)}px`,
                backgroundColor: i === hi ? accent : mix(accent, 0.28),
                animationDelay: animate ? `${i * 55}ms` : undefined,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {labels.map((l, i) => (
          <span
            key={`${l}-${i}`}
            className={`flex-1 text-center text-[10px] ${i === hi ? 'font-semibold text-[#1c1a16]' : 'text-[#9b958b]'}`}
          >
            {l}
          </span>
        ))}
      </div>
      {unit && <p className="mt-2.5 text-[11px] text-[#9b958b]">{unit}</p>}
    </div>
  )
}

/** Causes + cumulative share — the 80/20 read. */
export function Pareto({ items }: { items: { label: string; value: number }[] }) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  const max = Math.max(...items.map((i) => i.value), 1)
  let run = 0
  const cum = items.map((i) => ((run += i.value) / total) * 100)
  return (
    <div ref={ref}>
      <div className="relative flex h-[104px] items-end gap-2">
        {items.map((it, i) => (
          <div key={it.label} className="flex flex-1 flex-col items-center justify-end">
            <span
              className={`w-full origin-bottom rounded-t-[4px] ${animate ? 'animate-grow-y' : ''}`}
              style={{
                height: `${Math.max(5, (it.value / max) * 84)}px`,
                backgroundColor: mix(accent, step(i)),
                animationDelay: animate ? `${i * 60}ms` : undefined,
              }}
            />
          </div>
        ))}
        {/* polyline points are user units, NOT percentages — needs a viewBox. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <polyline
            points={cum.map((c, i) => `${((i + 0.5) / items.length) * 100},${100 - c * 0.84}`).join(' ')}
            fill="none"
            stroke={INK}
            strokeWidth={1.25}
            strokeDasharray="3 3"
            opacity={0.4}
            vectorEffect="non-scaling-stroke"
          />
          {cum.map((c, i) => (
            <circle
              key={i}
              cx={((i + 0.5) / items.length) * 100}
              cy={100 - c * 0.84}
              r={1.6}
              fill={INK}
              opacity={0.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <ul className="mt-3 divide-y divide-[#f0efec]">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-baseline gap-3 py-2">
            <span
              className="size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: mix(accent, step(i)) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[14px] text-[#1c1a16]">{it.label}</span>
            <span className="shrink-0 text-[12px] tabular-nums text-[#9b958b]">{cum[i].toFixed(0)}%</span>
            <span className="w-[30px] shrink-0 text-right text-[14px] font-medium tabular-nums text-[#1c1a16]">
              {it.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Five-axis scorecard for genuinely multi-dimensional frameworks. */
export function Radar({ axes, max = 100 }: { axes: { label: string; score: number }[]; max?: number }) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const size = 200
  const c = size / 2
  const r = 72
  const pt = (i: number, frac: number) => {
    const a = (i / axes.length) * Math.PI * 2 - Math.PI / 2
    return [c + Math.cos(a) * r * frac, c + Math.sin(a) * r * frac] as const
  }
  const ring = (frac: number) => axes.map((_, i) => pt(i, frac).map((n) => n.toFixed(1)).join(',')).join(' ')
  const shape = axes.map((ax, i) => pt(i, ax.score / max).map((n) => n.toFixed(1)).join(',')).join(' ')
  return (
    <div ref={ref} className="flex flex-col items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[196px]" aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke={HAIR} strokeWidth={1} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, 1)
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke={HAIR} strokeWidth={1} />
        })}
        <polygon
          points={shape}
          fill={accent}
          fillOpacity={0.14}
          stroke={accent}
          strokeWidth={1.75}
          className={animate ? 'animate-veil' : undefined}
        />
        {axes.map((ax, i) => {
          const [x, y] = pt(i, ax.score / max)
          return (
            <circle
              key={ax.label}
              cx={x}
              cy={y}
              r={3.25}
              fill={accent}
              className={animate ? 'animate-pop' : undefined}
              style={animate ? { animationDelay: `${260 + i * 70}ms` } : undefined}
            />
          )
        })}
      </svg>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2">
        {axes.map((ax) => (
          <li key={ax.label} className="flex items-baseline justify-between gap-2 border-b border-[#f0efec] pb-1.5">
            <span className="truncate text-[13px] text-[#3d3a34]">{ax.label}</span>
            <span className="shrink-0 text-[13px] font-medium tabular-nums text-[#1c1a16]">{ax.score}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}


export function Meter({ percent, label, value }: { percent: number; label: string; value: string }) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] text-[#1c1a16]">{label}</span>
        <span className="text-[14px] font-medium tabular-nums text-[#1c1a16]">{value}</span>
      </div>
      <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
        <div
          className={`h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
          style={{ width: `${Math.max(2, Math.min(percent, 100))}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  )
}

export function MeterGroup({ items }: { items: { label: string; value: string; percent: number }[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((m) => (
        <Meter key={m.label} label={m.label} value={m.value} percent={m.percent} />
      ))}
    </div>
  )
}

/** Records that matter — capped short. */
export function Records({ items }: { items: { label: string; sub: string; value: string; tone?: Tone }[] }) {
  return (
    <ul className="divide-y divide-[#f0efec]">
      {items.map((it) => (
        <li key={`${it.label}-${it.sub}`} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
          <span
            className="mt-[6px] size-[6px] shrink-0 rounded-full"
            style={{ backgroundColor: TONE[it.tone ?? 'neutral'] }}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] text-[#1c1a16]">{it.label}</span>
            {/* Wraps: the label is an identifier and can be clipped, but the sub
                carries the reason and a clipped reason is worth nothing. */}
            <span className="mt-0.5 block text-[11px] leading-[15px] text-[#9b958b]">{it.sub}</span>
          </span>
          <span className="shrink-0 pt-[1px] text-[11px] tabular-nums whitespace-nowrap text-[#9b958b]">{it.value}</span>
        </li>
      ))}
    </ul>
  )
}

/* ── executive fact blocks ───────────────────────────────────────────────── */
/*
 * Most of what a director needs is a stated fact, not a plotted one. These
 * blocks carry the majority of every page; the marks above are reserved for the
 * few places where shape genuinely beats a number.
 */

const clamp = (n: number) => Math.max(0, Math.min(100, n))

/** Label → value rows. "Average recovery 8.4 days" needs no chart. */
export function Facts({
  items,
  size = 'md',
}: {
  /**
   * `href` turns the row into a link to its record set. Only some rows earn one —
   * a bridge's opening and closing balances are positions, not events, and have no
   * list behind them, so the chevron is per-row rather than per-card.
   */
  items: { label: string; value: string; sub?: string; delta?: string; tone?: Tone; href?: string }[]
  size?: 'md' | 'lg'
}) {
  const lg = size === 'lg'
  const accent = useAccent()
  return (
    <ul className="divide-y divide-[#f0efec]">
      {items.map((it, i) => {
        const row = (
          <>
            <span className="min-w-0 flex-1">
              <span className={`block ${lg ? 'text-[14px]' : 'text-[13.5px]'} text-[#1c1a16]`}>{it.label}</span>
              {it.sub && <span className="mt-0.5 block text-[11px] leading-[15px] text-[#9b958b]">{it.sub}</span>}
            </span>
            {it.delta && (
              <span
                className="shrink-0 text-[11px] font-medium tabular-nums"
                style={{ color: signTone(it.delta) ?? FAINT }}
              >
                {it.delta}
              </span>
            )}
            <span
              className={`shrink-0 font-medium tabular-nums ${lg ? 'text-[18px]' : 'text-[14px]'}`}
              style={{ color: it.tone && it.tone !== 'neutral' ? TONE[it.tone] : VALUE }}
            >
              {it.value}
            </span>
            {/* Reserved on every row of a card that has any link, so the figures stay
                in one column instead of stepping in and out by 14px. */}
            <span className="w-[9px] shrink-0 text-[12px] leading-none" style={{ color: it.href ? accent : 'transparent' }} aria-hidden>
              ›
            </span>
          </>
        )
        /* Index-based rather than `first:`/`last:`, because those variants would key
           off the anchor — the only child of its <li> — and so fire on every row. */
        const pad = [
          lg ? 'py-3.5' : 'py-2.5',
          i === 0 ? 'pt-0' : '',
          i === items.length - 1 ? 'pb-0' : '',
        ].join(' ')
        return (
          <li key={it.label}>
            {it.href ? (
              <a href={it.href} className={`card-press -mx-2 flex items-baseline gap-3 rounded-[10px] px-2 ${pad}`}>
                {row}
              </a>
            ) : (
              <div className={`flex items-baseline gap-3 ${pad}`}>{row}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * BRIDGE — an opening balance, the flows that move it, and the closing balance.
 *
 * `Facts` could hold these six rows, and did, but it rendered them as six unrelated
 * figures in a column: nothing about that shape said the middle four ADD UP to the
 * difference between the outer two, which is the only reason the card exists. A
 * reader had to be told in a caption to do arithmetic the layout was hiding.
 *
 * So this is a waterfall, the form built for exactly this data — with one departure
 * that matters. A true-to-scale waterfall of 215,389 → 215,432 is six bars of
 * identical height and no information: the flows are 0.02% of the base. The bars
 * here are therefore scaled to the FLOWS, not the balance, and the balances are set
 * as bookends rather than as bars. Signed bars grow from a centre axis, so the shape
 * of the month reads before any number does — two gains, one loss, one nearly flat.
 *
 * The running balance down the right is what makes it verifiable: 215,389 → 215,434
 * → 215,452 → 215,429 → 215,432, each row showing where the collection stood after
 * that flow, and the last of them landing on the closing figure or visibly not.
 */
export function Bridge({
  opening,
  closing,
  flows,
}: {
  opening: { label: string; sub?: string; value: number }
  closing: { label: string; sub?: string; value: number; delta?: string }
  /** Signed. A net, never a volume — see the note on Transfers at the call site. */
  flows: { label: string; sub?: string; value: number; delta?: string; href?: string }[]
}) {
  const accent = useAccent()
  /* Scaled to the biggest flow, so the smallest one is still a visible mark rather
     than a rounding error against a six-figure balance. */
  const peak = Math.max(...flows.map((f) => Math.abs(f.value)), 1)

  let running = opening.value
  const rows = flows.map((f) => {
    running += f.value
    return { ...f, running }
  })
  /* The bridge's own invariant. If the flows stop reconciling the balances, the card
     says so rather than presenting a total that quietly disagrees with its parts. */
  const closes = running === closing.value

  const Bookend = ({
    label,
    sub,
    value,
    delta,
    lead,
  }: {
    label: string
    sub?: string
    value: number
    delta?: string
    lead?: boolean
  }) => (
    <div
      className="flex items-end justify-between gap-3 rounded-[10px] px-3 py-2.5"
      style={{ backgroundColor: lead ? mix(accent, 0.1) : '#f7f6f3' }}
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-medium tracking-[0.09em] uppercase" style={{ color: MUTED }}>
          {label}
        </span>
        {sub && <span className="mt-0.5 block text-[11px]" style={{ color: FAINT }}>{sub}</span>}
      </span>
      <span className="flex shrink-0 items-baseline gap-2">
        {delta && (
          <span className="text-[11px] font-medium tabular-nums" style={{ color: signTone(delta) ?? FAINT }}>
            {delta}
          </span>
        )}
        <span
          className="font-display text-[19px] leading-none font-bold tabular-nums"
          style={{ color: lead ? ACCENT_INK : VALUE }}
        >
          {fmt(value)}
        </span>
      </span>
    </div>
  )

  return (
    <div>
      <Bookend label={opening.label} sub={opening.sub} value={opening.value} />

      <ul className="my-1.5">
        {rows.map((r) => {
          const up = r.value >= 0
          const row = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] text-[#1c1a16]">{r.label}</span>
                {r.sub && (
                  <span className="mt-0.5 block text-[11px] leading-[15px]" style={{ color: FAINT }}>
                    {r.sub}
                  </span>
                )}
              </span>
              {/* Signed figure, then the bar it describes, then where the collection
                  stood after it — cause, shape, consequence, left to right. */}
              <span
                className="w-[42px] shrink-0 text-right text-[15px] font-medium tabular-nums"
                style={{ color: up ? TONE.good : TONE.bad }}
              >
                {up ? '+' : '−'}
                {Math.abs(r.value)}
              </span>
              <span className="relative h-[16px] w-[44px] shrink-0" aria-hidden>
                <span className="absolute inset-y-0 left-1/2 w-px" style={{ backgroundColor: '#e4e2dc' }} />
                <span
                  className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full"
                  style={{
                    /* Floor of 3% so a +3 net beside a +45 is still a mark. */
                    width: `${Math.max(3, (Math.abs(r.value) / peak) * 50)}%`,
                    left: up ? '50%' : undefined,
                    right: up ? undefined : '50%',
                    backgroundColor: up ? TONE.good : TONE.bad,
                  }}
                />
              </span>
              <span className="w-[58px] shrink-0 text-right text-[11px] tabular-nums" style={{ color: FAINT }}>
                {fmt(r.running)}
              </span>
              <span
                className="w-[8px] shrink-0 text-[12px] leading-none"
                style={{ color: r.href ? ACCENT_INK : 'transparent' }}
                aria-hidden
              >
                ›
              </span>
            </>
          )
          return (
            <li key={r.label} className="border-b border-[#f0efec] last:border-0">
              {r.href ? (
                <a href={r.href} className="card-press -mx-2 flex items-center gap-2 rounded-[10px] px-2 py-2.5">
                  {row}
                </a>
              ) : (
                <div className="flex items-center gap-2 py-2.5">{row}</div>
              )}
            </li>
          )
        })}
      </ul>

      <Bookend label={closing.label} sub={closing.sub} value={closing.value} delta={closing.delta} lead />

      {!closes && (
        <p className="mt-2.5 text-[11px]" style={{ color: TONE.bad }}>
          Flows sum to {fmt(running)}, not {fmt(closing.value)} — this bridge does not close.
        </p>
      )}
    </div>
  )
}

/**
 * Terminal readout — number, then its word, then one supporting figure. Multi-row
 * grid, no boxes; `Scoreboard` is the single-row, hairline-ruled variant.
 */
export function Snapshot({
  items,
  cols = 2,
}: {
  /** `note` is a supporting figure — "of 71", "Target 90%" — never a phrase. */
  items: { label: string; value: string; unit?: string; note?: string; tone?: Tone; icon?: Icon }[]
  cols?: 2 | 3 | 4
}) {
  const accent = useAccent()
  const grid = cols === 4 ? 'grid-cols-4' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2'
  /* Same fitting as `Scoreboard`, and for the same reason — a fixed size per column
     count holds only until a value gets long. The per-count number is the CEILING
     now, not the answer. */
  const size = fitSize(
    items.map((m) => m.value),
    cols,
    cols === 4 ? 22 : cols === 3 ? 25 : 28,
  )
  return (
    <div className={`grid ${grid} gap-x-3 gap-y-4`}>
      {items.map((m, i) => (
        <div key={m.label} className={i >= cols ? 'border-t border-[#f0efec] pt-4' : ''}>
          {/* The icon leads the cell rather than sharing the label's line. Inline it
              had to be 13px to leave room for "Chondrichthyes" in a ~100px column, and
              at 13px a drawn glyph is mush; on its own line it gets room and the label
              gets the full width back. It stays smaller than the figure, so leading the
              cell does not make it the thing you read first.

              The tinted tile is what makes it read as an icon rather than as a stray
              mark floating above a number — it gives the glyph a footprint, and nine of
              them set up a column the eye can run down. Accent at 10%, so it sits under
              the figure in weight, not beside it. */}
          {m.icon && (
            <span
              className="mb-2 grid size-7 place-items-center rounded-[9px]"
              style={{ backgroundColor: mix(accent, 0.1) }}
            >
              <m.icon size={16} strokeWidth={1.75} style={{ color: accent }} />
            </span>
          )}
          <Figure
            value={m.value}
            unit={m.unit}
            size={size}
            color={m.tone && m.tone !== 'neutral' ? TONE[m.tone] : VALUE}
          />
          {/* Wraps rather than truncates: at four columns a cell is ~78px, and
              "Sample quality" clipped to "Sample qua…" states nothing. Grid rows
              size to the tallest cell, so a second line stays aligned. */}
          <p className="mt-0.5 text-[12px] leading-[15px] text-[#3d3a34]">{m.label}</p>
          {m.note && <p className="mt-0.5 text-[11px] leading-[14px] text-[#9b958b]">{m.note}</p>}
        </div>
      ))}
    </div>
  )
}

/**
 * Approximate rendered width of a figure, in em.
 *
 * The numerals are `tabular-nums`, so every digit is one advance and the width is
 * predictable without measuring: ~0.58em a digit, ~0.3em for a comma or point,
 * ~0.36em for a sign. Good enough to pick a font size that fits, which is all this
 * is for.
 */
const figureEm = (s: string) =>
  [...s].reduce((n, c) => n + (/[.,]/.test(c) ? 0.3 : /[+\-−]/.test(c) ? 0.36 : 0.58), 0)

/**
 * Largest size at which the widest value still fits its column.
 *
 * `content` is the card's inner width at the 390px reference viewport: 390 − 40 for
 * the stack gutter − 40 for the card's own padding.
 */
function fitSize(values: string[], columns: number, max: number, content = 310) {
  const column = content / columns - 12
  const widest = Math.max(...values.map(figureEm), 0.6)
  return Math.min(max, Math.max(17, Math.floor(column / widest)))
}

/** One line of headline numbers, hairline-ruled. The 3-second scan. */
export function Scoreboard({
  items,
}: {
  items: { value: string; unit?: string; label: string; tone?: Tone }[]
}) {
  /* Sized to what has to fit, not to how many items there are. Three items used to
     get 28px unconditionally, and "180,348" at 28px wants ~120px in a ~95px column —
     the Sex card's third figure ran into the edge of the card. */
  const size = fitSize(
    items.map((it) => it.value),
    items.length,
    28,
  )
  return (
    <div className="flex items-stretch">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={`min-w-0 flex-1 ${i ? 'border-l border-[#f0efec] pl-3' : ''} ${
            i < items.length - 1 ? 'pr-3' : ''
          }`}
        >
          <Figure
            value={it.value}
            unit={it.unit}
            size={size}
            color={it.tone && it.tone !== 'neutral' ? TONE[it.tone] : VALUE}
          />
          <p className="mt-1 text-[11px] leading-[14px] text-[#6d6860]">{it.label}</p>
        </div>
      ))}
    </div>
  )
}

/**
 * The two ends of a distribution. Executives ask "what's the biggest and what's
 * the worst" far more often than they ask for the whole ranking — the accent on
 * the leading side and the faint treatment on the trailing side carry which is
 * which without a label being read.
 */
export function Poles({
  caption = ['Highest', 'Lowest'],
  high,
  low,
  lowTone,
}: {
  caption?: [string, string]
  high: { label: string; sub?: string; value: string }
  low: { label: string; sub?: string; value: string }
  lowTone?: Tone
}) {
  const accent = useAccent()
  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[9.5px] font-medium tracking-[0.09em] uppercase" style={{ color: accent }}>
          {caption[0]}
        </p>
        <div className="mt-1.5">
          <Figure value={high.value} size={24} />
        </div>
        <p className="mt-1.5 truncate text-[13px] text-[#1c1a16]">{high.label}</p>
        {high.sub && <p className="mt-0.5 text-[11px] leading-[15px] text-[#9b958b]">{high.sub}</p>}
      </div>
      <span className="w-px shrink-0" style={{ backgroundColor: HAIR }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p
          className="text-[9.5px] font-medium tracking-[0.09em] uppercase"
          style={{ color: lowTone && lowTone !== 'neutral' ? TONE[lowTone] : FAINT }}
        >
          {caption[1]}
        </p>
        <div className="mt-1.5">
          <Figure value={low.value} size={24} color={lowTone && lowTone !== 'neutral' ? TONE[lowTone] : INK2} />
        </div>
        <p className="mt-1.5 truncate text-[13px] text-[#1c1a16]">{low.label}</p>
        {low.sub && <p className="mt-0.5 text-[11px] leading-[15px] text-[#9b958b]">{low.sub}</p>}
      </div>
    </div>
  )
}

/** Signed change around a centre line — growth right, decline left. */
export function Movers({ items, unit }: { items: { label: string; sub?: string; delta: number }[]; unit?: string }) {
  const accent = useAccent()
  const max = Math.max(...items.map((i) => Math.abs(i.delta)), 1)
  return (
    <ul className="flex flex-col gap-3">
      {items.map((it) => {
        const up = it.delta >= 0
        const w = (Math.abs(it.delta) / max) * 50
        return (
          <li key={it.label} className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] text-[#1c1a16]">{it.label}</span>
              {it.sub && <span className="mt-0.5 block truncate text-[11px] text-[#9b958b]">{it.sub}</span>}
            </span>
            <span className="relative h-[8px] w-[76px] shrink-0" aria-hidden>
              <span className="absolute inset-y-0 left-1/2 w-px" style={{ backgroundColor: '#e3e1dc' }} />
              <span
                className="absolute top-[1px] h-[6px]"
                style={{
                  left: up ? '50%' : undefined,
                  right: up ? undefined : '50%',
                  width: `${Math.max(2, w)}%`,
                  borderRadius: up ? '0 3px 3px 0' : '3px 0 0 3px',
                  backgroundColor: up ? accent : mix(TONE.bad, 0.5),
                }}
              />
            </span>
            <span
              className="w-[46px] shrink-0 text-right text-[13px] font-medium tabular-nums"
              style={{ color: up ? TONE.good : TONE.bad }}
            >
              {up ? '+' : '−'}
              {Math.abs(it.delta)}
              {unit}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Actual against a target tick — the benchmark read, one line per measure. */
export function Bullet({
  label,
  value,
  percent,
  target,
  note,
  tone,
}: {
  label: string
  value: string
  percent: number
  target?: number
  /** Short token only — "Target 90%", "63 of 71". */
  note?: string
  tone?: Tone
}) {
  const accent = useAccent()
  const fill = tone && tone !== 'neutral' ? TONE[tone] : accent
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px] text-[#1c1a16]">{label}</span>
        <Figure value={value} size={19} color={fill} />
      </div>
      <div className="relative mt-2.5 h-[10px] w-full rounded-full" style={{ backgroundColor: TRACK }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, clamp(percent))}%`, backgroundColor: fill }}
        />
        {target !== undefined && (
          <span
            className="absolute inset-y-[-2px] w-[2px] rounded-full bg-[#1c1a16]/50"
            style={{ left: `calc(${clamp(target)}% - 1px)` }}
            aria-hidden
          />
        )}
      </div>
      {note && <p className="mt-1.5 text-[11px] text-[#9b958b]">{note}</p>}
    </div>
  )
}

export function BulletGroup({
  items,
}: {
  items: { label: string; value: string; percent: number; target?: number; note?: string; tone?: Tone }[]
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((b) => (
        <Bullet key={b.label} {...b} />
      ))}
    </div>
  )
}


/** Columnar facts — Bloomberg density where three numbers per row all matter. */
export function Table({
  head,
  rows,
}: {
  head: string[]
  rows: { label: string; sub?: string; cells: string[]; tone?: Tone }[]
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className={`pb-2 text-[9.5px] font-medium tracking-[0.08em] whitespace-nowrap text-[#9b958b] uppercase ${
                  i === 0 ? 'text-left' : 'pl-3 text-right'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-[#f0efec]">
              <td className="py-2.5 pr-2">
                <span className="block text-[13.5px] leading-[17px] text-[#1c1a16]">{r.label}</span>
                {r.sub && <span className="mt-0.5 block text-[11px] leading-[14px] text-[#9b958b]">{r.sub}</span>}
              </td>
              {r.cells.map((c, ci) => (
                <td
                  key={ci}
                  className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums whitespace-nowrap"
                  style={{
                    color:
                      ci === r.cells.length - 1 && r.tone && r.tone !== 'neutral'
                        ? TONE[r.tone]
                        : signTone(c) ?? INK2,
                  }}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Leaderboard — the leader gets the platform, the chasing pack gets a line. */
export function Ladder({
  leader,
  rest,
}: {
  leader: { label: string; sub?: string; value: string }
  rest: { label: string; sub?: string; value: string }[]
}) {
  const accent = useAccent()
  return (
    <div>
      <div className="flex items-center gap-3 rounded-[12px] px-3.5 py-3" style={{ backgroundColor: mix(accent, 0.08) }}>
        <span className="font-display text-[13px] font-bold tabular-nums" style={{ color: accent }}>
          1
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-[#1c1a16]">{leader.label}</span>
          {leader.sub && <span className="mt-0.5 block truncate text-[11px] text-[#6d6860]">{leader.sub}</span>}
        </span>
        <Figure value={leader.value} size={22} />
      </div>
      <ol className="mt-1 divide-y divide-[#f0efec]">
        {rest.map((it, i) => (
          <li key={it.label} className="flex items-center gap-3 px-3.5 py-2.5">
            <span className="text-[12px] tabular-nums text-[#9b958b]">{i + 2}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] text-[#1c1a16]">{it.label}</span>
              {it.sub && <span className="mt-0.5 block truncate text-[11px] text-[#9b958b]">{it.sub}</span>}
            </span>
            <span className="shrink-0 text-[14px] font-medium tabular-nums text-[#3d3a34]">{it.value}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** A single fact that deserves its own strip — the outlier, the record, the risk. */
export function Band({
  label,
  title,
  sub,
  value,
  unit,
  tone,
}: {
  label: string
  title: string
  sub?: string
  value: string
  unit?: string
  tone?: Tone
}) {
  const accent = useAccent()
  return (
    <div className="flex items-center gap-4 rounded-[12px] px-4 py-3.5" style={{ backgroundColor: mix(accent, 0.07) }}>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[9.5px] font-medium tracking-[0.09em] uppercase"
          style={{ color: tone && tone !== 'neutral' ? TONE[tone] : accent }}
        >
          {label}
        </span>
        <span className="mt-1 block text-[14px] leading-[19px] text-[#1c1a16]">{title}</span>
        {sub && <span className="mt-0.5 block text-[11px] leading-[15px] text-[#6d6860]">{sub}</span>}
      </span>
      <span className="shrink-0 whitespace-nowrap">
        <Figure value={value} unit={unit} size={24} color={tone && tone !== 'neutral' ? TONE[tone] : VALUE} />
      </span>
    </div>
  )
}

/** Two quantities and the relation between them. */
export function Pair({
  a,
  b,
  relation,
  tone,
}: {
  a: { value: string; label: string }
  b: { value: string; label: string }
  /** A delta token — "net −3" — not a phrase. */
  relation?: string
  tone?: Tone
}) {
  return (
    <div>
      <div className="flex items-end gap-3">
        <span className="min-w-0 flex-1">
          <Figure value={a.value} size={34} />
          <span className="mt-1 block truncate text-[12px] text-[#6d6860]">{a.label}</span>
        </span>
        {relation && (
          <span
            className="mb-2 shrink-0 text-[12px] font-medium"
            style={{ color: tone && tone !== 'neutral' ? TONE[tone] : FAINT }}
          >
            {relation}
          </span>
        )}
        <span className="min-w-0 flex-1 text-right">
          <Figure value={b.value} size={34} />
          <span className="mt-1 block truncate text-[12px] text-[#6d6860]">{b.label}</span>
        </span>
      </div>
    </div>
  )
}

/** Half-dial for a single composite score, with an optional benchmark tick. */
export function Dial({
  percent,
  value,
  unit,
  label,
  benchmark,
  benchmarkLabel,
}: {
  percent: number
  value: string
  unit?: string
  label: string
  benchmark?: number
  benchmarkLabel?: string
}) {
  const accent = useAccent()
  const p = clamp(percent)
  const tick = (b: number) => {
    const a = Math.PI - (clamp(b) / 100) * Math.PI
    return [100 + Math.cos(a) * 70, 100 - Math.sin(a) * 70, 100 + Math.cos(a) * 94, 100 - Math.sin(a) * 94] as const
  }
  const t = benchmark !== undefined ? tick(benchmark) : null
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[212px]">
        <svg viewBox="0 0 200 112" className="w-full" aria-hidden>
          <path
            d="M 18 100 A 82 82 0 0 1 182 100"
            fill="none"
            stroke={TRACK}
            strokeWidth={13}
            strokeLinecap="round"
          />
          <path
            d="M 18 100 A 82 82 0 0 1 182 100"
            fill="none"
            stroke={accent}
            strokeWidth={13}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${p} ${100 - p}`}
          />
          {t && <line x1={t[0]} y1={t[1]} x2={t[2]} y2={t[3]} stroke={INK} strokeWidth={1.5} opacity={0.45} />}
        </svg>
        <div className="absolute inset-x-0 bottom-[6px] text-center">
          <Figure value={value} unit={unit} size={38} />
        </div>
      </div>
      <p className="mt-1 text-center text-[13px] text-[#3d3a34]">{label}</p>
      {benchmarkLabel && <p className="mt-1 text-center text-[11px] text-[#9b958b]">{benchmarkLabel}</p>}
    </div>
  )
}

/** Month grid with marked days — a calendar is the only honest shape for a calendar. */
export function Calendar({
  days,
  offset = 0,
  marks,
  weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
}: {
  days: number
  /** Weekday index the 1st falls on, 0 = Monday. */
  offset?: number
  marks: { day: number; count: number; note?: string; tone?: Tone }[]
  weekLabels?: string[]
}) {
  const accent = useAccent()
  const byDay = new Map(marks.map((m) => [m.day, m]))
  const max = Math.max(...marks.map((m) => m.count), 1)
  return (
    <div>
      <div className="grid grid-cols-7 gap-[3px]">
        {weekLabels.map((w, i) => (
          <span key={i} className="pb-1 text-center text-[9.5px] text-[#9b958b]">
            {w}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1
          const m = byDay.get(d)
          return (
            <span
              key={d}
              className="flex aspect-square flex-col items-center justify-center rounded-[6px]"
              style={{ backgroundColor: m ? mix(accent, 0.22 + (m.count / max) * 0.68) : TRACK }}
              title={m?.note}
            >
              <span
                className="text-[10px] tabular-nums"
                style={{ color: m ? (m.count / max > 0.55 ? '#ffffff' : INK) : FAINT }}
              >
                {d}
              </span>
              {m && (
                <span
                  className="font-display text-[11px] font-bold tabular-nums"
                  style={{ color: m.count / max > 0.55 ? '#ffffff' : INK }}
                >
                  {m.count}
                </span>
              )}
            </span>
          )
        })}
      </div>
      <ul className="mt-4 divide-y divide-[#f0efec]">
        {marks
          .filter((m) => m.note)
          .map((m) => (
            <li key={m.day} className="flex items-baseline gap-3 py-2 first:pt-0 last:pb-0">
              <span className="w-[22px] shrink-0 text-[12px] font-medium tabular-nums text-[#1c1a16]">{m.day}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-[#3d3a34]">{m.note}</span>
              <span
                className="shrink-0 text-[13px] font-medium tabular-nums"
                style={{ color: m.tone && m.tone !== 'neutral' ? TONE[m.tone] : VALUE }}
              >
                {m.count}
              </span>
            </li>
          ))}
      </ul>
    </div>
  )
}

/**
 * The executive brief, as figures. Each item is a tag, a number and the word
 * that names it — the same hierarchy as every other block on the page, so the
 * closing card can be scanned rather than read.
 */
export function Highlights({
  items,
}: {
  items: { tag: string; value: string; unit?: string; label: string; tone?: Tone }[]
}) {
  const accent = useAccent()
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-5">
      {items.map((it, i) => {
        const c = it.tone && it.tone !== 'neutral' ? TONE[it.tone] : accent
        return (
          <li key={`${it.tag}-${i}`} className="border-l-2 pl-3" style={{ borderColor: mix(c, 0.55) }}>
            <p className="truncate text-[9.5px] font-medium tracking-[0.09em] uppercase" style={{ color: c }}>
              {it.tag}
            </p>
            <div className="mt-1">
              <Figure value={it.value} unit={it.unit} size={24} color={it.tone && it.tone !== 'neutral' ? c : VALUE} />
            </div>
            <p className="mt-0.5 text-[12px] leading-[16px] text-[#6d6860]">{it.label}</p>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Dated rail. The text slot is a name, not a sentence — the number sits on the
 * right where every other value on the page sits.
 */
export function Events({
  items,
}: {
  items: { when: string; label: string; sub?: string; value?: string; tone?: Tone }[]
}) {
  const accent = useAccent()
  return (
    <ul className="flex flex-col">
      {items.map((it, i) => (
        <li key={`${it.when}-${i}`} className="flex gap-3">
          <span className="w-[44px] shrink-0 pt-[1px] text-right text-[11px] tabular-nums text-[#9b958b]">
            {it.when}
          </span>
          <span className="relative flex w-[9px] shrink-0 justify-center" aria-hidden>
            <span
              className="mt-[6px] size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: it.tone && it.tone !== 'neutral' ? TONE[it.tone] : accent }}
            />
            {i < items.length - 1 && <span className="absolute top-[17px] bottom-0 w-px bg-[#f0efec]" />}
          </span>
          <span className={`flex min-w-0 flex-1 items-baseline gap-3 ${i < items.length - 1 ? 'pb-4' : ''}`}>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] leading-[18px] text-[#1c1a16]">{it.label}</span>
              {it.sub && <span className="mt-0.5 block text-[11px] leading-[15px] text-[#9b958b]">{it.sub}</span>}
            </span>
            {it.value && (
              <span
                className="shrink-0 text-[14px] font-medium tabular-nums"
                style={{ color: it.tone && it.tone !== 'neutral' ? TONE[it.tone] : INK2 }}
              >
                {it.value}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

/* ── report marks ────────────────────────────────────────────────────────── */
/*
 * The monthly report's own vocabulary, which the aggregate marks above could not
 * express: a rate against its stated denominator, a cause split as one ring, a
 * 30-day trend with a real axis, and the record layer — animal-level rows
 * grouped by site.
 *
 * The record layer is the report's third tier. Tiers one and two (summary card,
 * trend) answer "how much"; only this one answers "which animal", and every
 * summary that has one links down to it through `More`.
 */

/**
 * Down into the record layer. The only link that leaves a module page, so it is
 * deliberately the only pill-shaped thing in the set.
 */
export function More({ href, label = 'View details' }: { href: string; label?: string }) {
  const accent = useAccent()
  return (
    <a
      href={href}
      className="card-press inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-[5px] text-[11.5px] font-medium whitespace-nowrap"
      style={{ backgroundColor: mix(accent, 0.11), color: ACCENT_INK }}
    >
      {label}
      <span aria-hidden>→</span>
    </a>
  )
}

/**
 * A rate and the count it was computed from, in one mark.
 *
 * The denominator is the point: "68%" alone hides whether the base is 14 animals
 * or 14,000, so the ring carries `value / of` at its centre and the percentage
 * reads beside it.
 */
export function Ring({
  percent,
  label,
  value,
  of,
  note,
  href,
  tone,
}: {
  percent: number
  /** One or two words — "Vaccinated", "Dewormed". */
  label: string
  /** Numerator and denominator, stated inside the ring. */
  value: string
  of: string
  /** Short token only. */
  note?: string
  href?: string
  tone?: Tone
}) {
  const accent = useAccent()
  const c = tone && tone !== 'neutral' ? TONE[tone] : accent
  const { ref, animate, reduce } = usePlay()
  const p = clamp(percent)
  /* 270° of arc, opening at the bottom — a full circle reads as a pie, and a
     half dial (see `Dial`) cannot hold two stacked numbers at its centre. */
  const ARC = 'M 36.16 123.84 A 62 62 0 1 1 123.84 123.84'
  const shown = animate || reduce ? p : 0

  return (
    <div ref={ref} className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <Figure value={`${Math.round(p)}`} unit="%" size={34} color={c} />
        <p className="mt-1 text-[13.5px] text-[#1c1a16]">{label}</p>
        {note && <p className="mt-0.5 text-[11px] leading-[15px] text-[#9b958b]">{note}</p>}
        {href && (
          <div className="mt-2.5">
            <More href={href} />
          </div>
        )}
      </div>
      <div className="relative w-[124px] shrink-0">
        <svg viewBox="0 0 160 140" className="w-full" aria-hidden>
          <path d={ARC} fill="none" stroke={TRACK} strokeWidth={13} strokeLinecap="round" />
          <path
            d={ARC}
            fill="none"
            stroke={c}
            strokeWidth={13}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${shown} ${100 - shown}`}
            style={reduce ? undefined : { transition: 'stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        {/* Numerator over denominator, hairline between — the fraction the
            percentage came from, at the centre of the ring that shows it. */}
        <div className="absolute inset-x-0 top-[38px] text-center">
          <Figure value={value} size={21} />
          <span className="mx-auto mt-1 block h-px w-[42px]" style={{ backgroundColor: HAIR }} aria-hidden />
          <span className="mt-1 block text-[12px] tabular-nums text-[#6d6860]">{of}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * A split as one ring with the total at its centre.
 *
 * Segments are lightness steps of the module accent, not cycled hues — the same
 * rule every other multi-series mark here follows. A six-colour donut would make
 * "Unknown" look like a category with its own meaning rather than a residual.
 */
export function Donut({
  items,
  label = 'Total',
  unit,
}: {
  items: { label: string; value: number; tone?: Tone }[]
  /** The word under the centre number. */
  label?: string
  unit?: string
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  /* A 1.4% gap between segments, taken off each one's own length — without it
     adjacent lightness steps read as a single band. */
  const GAP = 1.4
  let acc = 0

  return (
    <div ref={ref}>
      <div className="flex items-center gap-4">
        <div className="relative w-[132px] shrink-0">
          <svg viewBox="0 0 160 160" className="w-full" aria-hidden>
            <circle cx={80} cy={80} r={58} fill="none" stroke={TRACK} strokeWidth={22} />
            <g transform="rotate(-90 80 80)">
              {items.map((it, i) => {
                const frac = (it.value / total) * 100
                const len = Math.max(frac - GAP, 0.6)
                const offset = acc
                acc += frac
                return (
                  <circle
                    key={it.label}
                    cx={80}
                    cy={80}
                    r={58}
                    fill="none"
                    stroke={it.tone && it.tone !== 'neutral' ? TONE[it.tone] : mix(accent, step(i))}
                    strokeWidth={22}
                    strokeLinecap="butt"
                    pathLength={100}
                    strokeDasharray={`${len} ${100 - len}`}
                    strokeDashoffset={-offset}
                    className={animate ? 'animate-veil' : undefined}
                    style={animate ? { animationDelay: `${i * 70}ms` } : undefined}
                  />
                )
              })}
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#9b958b]">{label}</span>
            <Figure value={compact(total)} size={26} />
          </div>
        </div>
        {/* Legend rides beside the ring, not under it — a 132px ring leaves a
            full column free, and stacking wasted the height. */}
        <ul className="min-w-0 flex-1 space-y-2">
          {items.map((it, i) => (
            <li key={it.label} className="flex items-baseline gap-2">
              <span
                className="mt-[5px] size-[7px] shrink-0 rounded-full"
                style={{
                  backgroundColor: it.tone && it.tone !== 'neutral' ? TONE[it.tone] : mix(accent, step(i)),
                }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#3d3a34]">{it.label}</span>
              <span className="shrink-0 text-[12.5px] font-medium tabular-nums text-[#1c1a16]">
                {compact(it.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {unit && (
        <p className="mt-3.5 text-[11px] text-[#9b958b]">
          {fmt(total)} {unit}
        </p>
      )}
    </div>
  )
}

/**
 * Rounds a maximum up to a readable axis step — 112 → 30s, 43 → 10s.
 *
 * `integral` forces a whole-number step. Every series on these pages is a count of
 * animals, and a series peaking at 2 was otherwise labelled 0, 0.5, 1, 1.5, 2 —
 * half an animal is not a quantity.
 */
const niceStep = (max: number, divisions: number, integral: boolean) => {
  const rough = max / divisions
  const magnitude = 10 ** Math.floor(Math.log10(rough || 1))
  const s = [1, 2, 2.5, 5, 10].find((k) => k * magnitude >= rough) ?? 10
  const step = s * magnitude
  return integral ? Math.max(1, Math.round(step)) : step
}

/**
 * Catmull-Rom through the points, emitted as cubic béziers, with each control
 * point clamped to its own segment's value range.
 *
 * Unclamped, the spline overshoots: a flat 1,1,1,2,1 series grew peaks well above
 * 2 and troughs below 0, so the chart showed excursions that are not in the data.
 * Clamping costs a little smoothness at sharp corners and buys a curve that never
 * claims a value nobody recorded.
 */
const smooth = (pts: readonly (readonly [number, number])[]) => {
  if (pts.length < 2) return ''
  const clampTo = (v: number, a: number, b: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), v))
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]
    const c1x = x1 + (x2 - p0[0]) / 6
    const c1y = clampTo(y1 + (y2 - p0[1]) / 6, y1, y2)
    const c2x = x2 - (p3[0] - x1) / 6
    const c2y = clampTo(y2 - (p3[1] - y1) / 6, y1, y2)
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }
  return d
}

/**
 * The report's standard time window: 30 days, labelled by week, on a real axis.
 *
 * `Spark` is a glance and `Columns` is a period comparison; this is the one mark
 * that has to be read against values, so it carries a zero-based scale with
 * gridlines. Zero-based deliberately — a trend that starts the axis at the
 * series minimum exaggerates every wobble into a crisis.
 */
export function Trend({
  values,
  labels,
  unit,
  tone,
  height = 132,
}: {
  values: number[]
  /** Week markers — four for a 30-day window. */
  labels: string[]
  unit?: string
  tone?: Tone
  height?: number
}) {
  const accent = useAccent()
  const c = tone && tone !== 'neutral' ? TONE[tone] : accent
  const { ref, animate } = usePlay()
  const W = 300
  const H = 100
  const integral = values.every(Number.isInteger)
  const stepY = niceStep(Math.max(...values, 1), 4, integral)
  const top = Math.max(Math.ceil(Math.max(...values, 1) / stepY) * stepY, stepY)
  const gridlines = Array.from({ length: Math.round(top / stepY) + 1 }, (_, i) => i * stepY)
  const pts = values.map((v, i) => [
    (i / Math.max(values.length - 1, 1)) * W,
    H - (v / top) * H,
  ] as const)
  const line = smooth(pts)
  const id = `trend-${values.join('-')}-${c.slice(1)}`

  return (
    <div ref={ref}>
      <div className="flex gap-2">
        {/* Axis labels sit outside the SVG: the plot is drawn with
            preserveAspectRatio="none" so it can be short and wide, and any text
            inside would stretch with it. */}
        <div className="relative w-[22px] shrink-0" style={{ height }}>
          {gridlines.map((g) => (
            <span
              key={g}
              className="absolute right-0 -translate-y-1/2 text-[9.5px] tabular-nums text-[#9b958b]"
              style={{ top: `${(1 - g / top) * 100}%` }}
            >
              {compact(g)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height }}
            aria-hidden
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.26} />
                <stop offset="100%" stopColor={c} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {gridlines.map((g) => (
              <line
                key={g}
                x1={0}
                x2={W}
                y1={H - (g / top) * H}
                y2={H - (g / top) * H}
                stroke={HAIR}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path
              d={`${line} L ${W} ${H} L 0 ${H} Z`}
              fill={`url(#${id})`}
              className={animate ? 'animate-veil' : undefined}
              style={animate ? { animationDelay: '180ms' } : undefined}
            />
            <path
              d={line}
              fill="none"
              stroke={c}
              strokeWidth={1.75}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray={animate ? 1 : undefined}
              className={animate ? 'animate-draw' : undefined}
            />
          </svg>
          <div className="mt-2 flex">
            {labels.map((l, i) => (
              <span
                key={`${l}-${i}`}
                className={`flex-1 text-[10px] text-[#9b958b] ${
                  i === 0 ? 'text-left' : i === labels.length - 1 ? 'text-right' : 'text-center'
                }`}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
      {unit && <p className="mt-2.5 text-[11px] text-[#9b958b]">{unit}</p>}
    </div>
  )
}

/* ── the record layer ────────────────────────────────────────────────────── */

export interface RosterRow {
  /** Record identifier — animal, egg or fetal id. Set in bold, first. */
  id?: string
  /** Species or subject name, under the id. */
  name: string
  /** `U` is a real answer, not missing data — most of the collection is unsexed. */
  sex?: 'M' | 'F' | 'U'
  /** One cell per `head` column after the subject and sex. `--` where unknown. */
  cells: string[]
}

export interface RosterGroup {
  /** Usually the site. Pages that group by disease or by incubator pass that. */
  group: string
  /** "40 Animals", "12 Eggs" — the unit changes by page, so it is passed whole. */
  count: string
  rows: RosterRow[]
}

const SEX_LABEL = { M: 'Male', F: 'Female', U: 'Undetermined' } as const

function SexChip({ sex }: { sex: 'M' | 'F' | 'U' }) {
  const accent = useAccent()
  return (
    <span
      className="inline-grid size-[19px] place-items-center rounded-[5px] text-[10px] font-medium"
      style={{ backgroundColor: mix(accent, 0.13), color: ACCENT_INK }}
      title={SEX_LABEL[sex]}
    >
      {sex}
    </span>
  )
}

/**
 * Animal-level rows, grouped by the site they happened at.
 *
 * The grouping is the substance, not formatting: a month's 325 deaths spread
 * evenly across four sites and the same 325 concentrated in one are different
 * facts, and no aggregate on the summary tier can tell them apart.
 *
 * Each group is its own table with its own header, exactly as the printed report
 * repeats the header per site — one long table with occasional site rows loses
 * the column names as soon as the first group scrolls off.
 */
export function Roster({
  head,
  groups,
  widths,
  align,
}: {
  head: string[]
  groups: RosterGroup[]
  /**
   * Explicit column widths, one per `head` entry. Without them every column after the
   * subject shares the remaining 66% equally, which is right when the cells hold
   * comparable prose and wrong when they don't: a count column needs ~50px and was
   * getting 102, while the class beside it needed ~90 and broke "Chondrichthyes"
   * across two lines to fit the same 102.
   */
  widths?: string[]
  /**
   * Per-column alignment. Figures belong right-aligned — left-aligned, a 6 sits under
   * the 1 of 12,400 and the column stops reading as a quantity at all. Right-aligned
   * cells also get tabular figures so the digits stack.
   */
  align?: ('left' | 'right')[]
}) {
  const accent = useAccent()
  /* `head` carries '' for the sex column, so a cell's column index is offset by the
     subject plus that column when it exists. Read off `head` rather than off each
     row, so a group whose first row happens to omit `sex` still lines up. */
  const offset = head.indexOf('') >= 0 ? 2 : 1
  const alignOf = (cellIndex: number) => align?.[cellIndex + offset] ?? 'left'
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.group}>
          <div className="mb-2.5 flex items-center gap-2">
            <span
              className="grid size-[22px] shrink-0 place-items-center rounded-full"
              style={{ backgroundColor: mix(accent, 0.13) }}
              aria-hidden
            >
              <span className="size-[7px] rounded-full" style={{ backgroundColor: accent }} />
            </span>
            <span className="min-w-0 truncate text-[13.5px] font-medium text-[#1c1a16]">{g.group}</span>
            <span className="shrink-0 text-[12px] text-[#9b958b]">· {g.count}</span>
          </div>
          <div className="overflow-hidden rounded-[10px]">
            <table className="w-full table-fixed">
              <thead>
                <tr style={{ backgroundColor: DEEP }}>
                  {head.map((h, i) => (
                    /* 34%, not 38%: at 390px the identifier column was taking room the
                       data columns needed, and a single long word like "Undetermined"
                       overflowed its cell into the value beside it. The last column
                       can't be pinned narrow — across the record pages it is variously
                       "Age", "Qty" and "Organization". */
                    <th
                      key={h}
                      style={widths?.[i] ? { width: widths[i] } : undefined}
                      className={`px-2.5 py-2 text-[10px] font-medium tracking-[0.05em] text-white/85 uppercase ${
                        align?.[i] === 'right' ? 'text-right' : 'text-left'
                      } ${!widths && i === 0 ? 'w-[34%]' : ''} ${h === '' ? 'w-[34px] px-0' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, ri) => (
                  <tr key={`${r.id ?? r.name}-${ri}`} style={{ backgroundColor: ri % 2 ? '#ffffff' : '#f4f7f4' }}>
                    <td className="px-2.5 py-2.5 align-top">
                      {r.id && (
                        <span className="block text-[12px] leading-[15px] font-semibold text-[#1c1a16]">{r.id}</span>
                      )}
                      <span
                        className={`block text-[12px] leading-[15px] text-[#3d3a34] ${r.id ? 'mt-0.5' : ''}`}
                      >
                        {r.name}
                      </span>
                    </td>
                    {r.sex && (
                      <td className="px-0 py-2.5 text-center align-top">
                        <SexChip sex={r.sex} />
                      </td>
                    )}
                    {r.cells.map((cell, ci) => (
                      /* `whitespace-pre-line` so a cell can hold two prescriptions
                         on two lines, as the printed report does. `break-words` is the
                         backstop for an unbreakable token — wrapping mid-word is ugly,
                         but printing over the next column is wrong. */
                      <td
                        key={ci}
                        className={`px-2.5 py-2.5 align-top text-[12px] leading-[16px] break-words whitespace-pre-line text-[#6d6860] ${
                          alignOf(ci) === 'right' ? 'text-right tabular-nums' : ''
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── site breakdown ──────────────────────────────────────────────────────── */

/**
 * The module's figure, split across the six sites, with Overall stated above the
 * rows it is made of.
 *
 * Overall comes first and is visually the largest thing in the card, because the
 * zoo-wide number is still the headline — the sites explain it, they don't replace
 * it. Every row carries its own bar so the shape of the split reads before any
 * number is parsed, and the row that is doing the damage is the long one.
 *
 * The figure and its rows both come from `siteCut`, so Overall is arithmetically
 * the rows and cannot drift from them.
 */
/**
 * Overall above the six sites it is the sum of, with a find-a-site field.
 *
 * The field is part of the card rather than a prop, so every site listing in the app has
 * one and any page added later gets it without remembering to ask. Six rows all fit on
 * screen, so this is not about discovery — it is about going straight to the site you
 * came to read without your eye walking the list.
 *
 * Three things it deliberately does not do:
 *   · `Overall` does not re-total while filtering. It is labelled Overall and it means
 *     the collection; the count beside it changes to "1 of 6 sites" so the figure and
 *     the list never claim to be the same thing.
 *   · Bar widths stay scaled to the full set, so a filtered row reads at its true size
 *     against the collection rather than filling the track alone.
 *   · Shade follows the site's rank in the full list, not its filtered position.
 */
export function Sites({ slug, dense = false }: { slug: string; dense?: boolean }) {
  const accent = useAccent()
  const { period, cut: window } = usePeriod()
  const [query, setQuery] = useState('')
  const cut = siteCut(slug, window)
  if (!cut) return null

  const rate = cut.kind === 'rate'
  const overall = rate ? `${Math.round(cut.overall)}` : fmt(cut.overall)
  const q = query.trim().toLowerCase()
  const rows = q
    ? cut.rows.filter((r) => r.site.name.toLowerCase().includes(q) || r.site.code.toLowerCase().includes(q))
    : cut.rows

  /* A stock is a headcount at the window's end, so "6 sites" is the right note;
     a flow can legitimately have quiet sites, and saying "4 of 6 reporting" is the
     difference between a quiet site and a missing one. */
  const note = q
    ? `${rows.length} of ${cut.rows.length} sites`
    : cut.kind === 'stock' || rate
      ? `${cut.rows.length} sites`
      : `${cut.active} of ${cut.rows.length} sites reporting`

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <span>
          <Figure value={overall} unit={rate ? '%' : cut.unit} size={34} />
          <p className="mt-0.5 text-[12px] text-[#3d3a34]">
            Overall · {period.label.toLowerCase()}
          </p>
        </span>
        <span className="shrink-0 pb-1 text-[11px] whitespace-nowrap text-[#9b958b]">{note}</span>
      </div>

      <label className="mt-3.5 flex items-center gap-2 rounded-full bg-[#f7f6f3] px-3 py-2">
        <Search size={14} strokeWidth={2} className="shrink-0 text-[#9b958b]" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a site"
          aria-label="Find a site"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1c1a16] outline-none placeholder:text-[#9b958b]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear"
            className="-mr-1 grid size-5 shrink-0 place-items-center rounded-full active:bg-[#eceae5]"
          >
            <X size={13} strokeWidth={2} className="text-[#6d6860]" aria-hidden />
          </button>
        )}
      </label>

      {rows.length === 0 && (
        <p className="mt-4 border-t border-[#f0efec] pt-4 text-[12.5px] text-[#9b958b]">
          No site matches “{query.trim()}”.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3 border-t border-[#f0efec] pt-4 empty:mt-0 empty:border-0 empty:pt-0">
        {rows.map((r) => (
          <li key={r.site.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-[13.5px] text-[#1c1a16]">{r.site.name}</span>
                {!dense && (
                  <span className="shrink-0 text-[10.5px] tabular-nums text-[#9b958b]">
                    {r.site.code} · {r.site.enclosures}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[13.5px] font-medium tabular-nums" style={{ color: VALUE }}>
                {rate ? `${Math.round(r.percent)}%` : fmt(r.value)}
                {rate && r.of && (
                  <span className="ml-1 text-[10.5px] font-normal text-[#9b958b]">
                    {fmt(r.value)}/{fmt(r.of)}
                  </span>
                )}
                {!rate && r.value > 0 && (
                  <span className="ml-1 text-[10.5px] font-normal text-[#9b958b]">
                    {Math.round(r.percent)}%
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
              <div
                className="h-full rounded-full"
                style={{
                  /* A rate is measured against 100% — a coverage bar scaled so the
                     best site fills the track would say Reptile House is doing fine.
                     A count has no natural ceiling, so there the widest row fills it;
                     scaling counts against the total leaves every bar a stub on a
                     six-way split. */
                  width: `${clamp(
                    rate ? r.percent : (r.percent / Math.max(...cut.rows.map((x) => x.percent), 1)) * 100,
                  )}%`,
                  /* Shade comes from the site's rank in the FULL list, not its
                     position in the filtered one — searching for "reptile" should not
                     repaint that row the darkest step just because it is now first. */
                  backgroundColor: mix(accent, step(cut.rows.indexOf(r))),
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── conservation status ─────────────────────────────────────────────────── */

/**
 * The Red List as its own badges, five to a row.
 *
 * This replaces a ranked bar list, and the swap is a real improvement rather than
 * decoration. On this distribution the bars could not work: Least Concern is 176,180
 * against 388 Critically Endangered, a 450× spread, so the two categories a curator
 * actually opens the card for were rendered as stubs. Badges give every category the
 * same footprint, which is the right emphasis — "how many Critically Endangered do we
 * hold" is not a question about magnitude relative to the carp.
 *
 * All ten show, including the zeroes. That a collection holds no Extinct animals and
 * has left only 80 unchecked is a statement about the completeness of its assessment,
 * and it can only be read if the empty categories are present to be read as empty.
 */
export function RedList({
  counts,
  hrefFor,
  onOpen,
}: {
  counts: Partial<Record<RedListCode, number>>
  /**
   * Per-category drill-down. Returning `undefined` leaves that row inert, which is
   * what an empty category needs — a chevron into a list of nothing is a dead end,
   * and Extinct reading as tappable would imply there is something to open.
   */
  hrefFor?: (code: RedListCode) => string | undefined
  /**
   * The same drill-down as a HANDLER rather than a route, for the surfaces that open a
   * sheet instead of navigating. A category with no animals in it stays inert either
   * way — the guard is on the count, not on which of the two is supplied.
   */
  onOpen?: (code: RedListCode) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      {RED_LIST_TIERS.map((tier) => {
        const rows = RED_LIST.filter((c) => c.tier === tier.key)
        const subtotal = rows.reduce((n, c) => n + (counts[c.code] ?? 0), 0)
        const lead = tier.key === 'risk'
        return (
          <div key={tier.key}>
            {/* Tier header carries its own subtotal. This is where the hierarchy comes
                from: three figures at a glance, before any individual row is read. */}
            <div className="mb-2.5 flex items-baseline gap-3">
              <span className="text-[10px] font-medium tracking-[0.09em] whitespace-nowrap text-[#9b958b] uppercase">
                {tier.label}
              </span>
              <span className="h-px flex-1" style={{ backgroundColor: HAIR }} />
              <span
                className={`shrink-0 font-display tabular-nums ${lead ? 'text-[15px] font-bold' : 'text-[13px] font-medium'}`}
                style={{ color: lead ? VALUE : MUTED }}
              >
                {fmt(subtotal)}
              </span>
            </div>
            <ul>
              {rows.map((c) => {
                const n = counts[c.code] ?? 0
                const href = n > 0 ? hrefFor?.(c.code) : undefined
                const tap = n > 0 && onOpen ? () => onOpen(c.code) : undefined
                const Row = href ? 'a' : tap ? 'button' : 'div'
                const live = Boolean(href || tap)
                return (
                  <li key={c.code}>
                  <Row
                    href={href}
                    type={tap ? 'button' : undefined}
                    onClick={tap}
                    className={`flex w-full items-center gap-2.5 py-[5px] text-left ${
                      live ? 'card-press -mx-2 rounded-[10px] px-2' : ''
                    }`}
                  >
                    {/* 22px, down from 40. The badge is an identifier now, not the
                        subject — the published silhouette and exact fill are kept so it
                        is still the Red List badge, at a size that lets the number lead.
                        Never dimmed at zero: fading it turned Extinct's black into Not
                        Checked's grey, and for that one category the colour IS the
                        meaning. An empty row says so through its figure instead. */}
                    <span
                      className="grid size-[22px] shrink-0 place-items-center rounded-full rounded-tr-[3px] font-display text-[9.5px] font-bold"
                      style={{
                        backgroundColor: c.fill,
                        color: c.ink,
                        boxShadow: 'outline' in c && c.outline ? `inset 0 0 0 1.25px ${c.outline}` : undefined,
                      }}
                      aria-hidden
                    >
                      {c.code}
                    </span>
                    {/* One line, never wrapping. The 5-across grid this replaced gave
                        "Critically Endangered" a 55px column and three stacked lines. */}
                    <span
                      className={`min-w-0 flex-1 truncate ${lead ? 'text-[13.5px] text-[#1c1a16]' : 'text-[13px] text-[#3d3a34]'}`}
                    >
                      {c.name}
                    </span>
                    <span
                      className={`shrink-0 font-display tabular-nums ${lead ? 'text-[17px] font-bold' : 'text-[14px] font-medium'}`}
                      style={{ color: n === 0 ? FAINT : VALUE }}
                    >
                      {fmt(n)}
                    </span>
                    {/* Reserved on every row, linked or not, so ten figures stay in one
                        column rather than stepping in and out by 9px down the card. */}
                    <span
                      className="w-[9px] shrink-0 text-[12px] leading-none"
                      style={{ color: live ? ACCENT_INK : 'transparent' }}
                      aria-hidden
                    >
                      ›
                    </span>
                  </Row>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

/* ── filtering ───────────────────────────────────────────────────────────── */

/**
 * Chip filter over a list inside one card.
 *
 * For the sections that carry twenty-odd rows: the page's rule is that everything
 * is on one scroll and nothing hides behind a tab, and a filter does not break it —
 * every row is still one tap away, and "All" is always the default so the full set
 * is what you see before you touch anything. A tab would decide for the reader
 * which subset matters; this lets them narrow and then widen again.
 */
export function Filter<T>({
  options,
  items,
  match,
  count,
  children,
}: {
  /** First entry is the default and should be the unfiltered one. */
  options: string[]
  items: T[]
  /** Called for every item against the active chip. Never called for `options[0]`. */
  match: (item: T, option: string) => boolean
  /**
   * What the chip badge counts. Defaults to the number of matching items, which is
   * only right when an item is a row — where an item is a *group* of rows, the badge
   * has to count the rows or every chip reads "1".
   */
  count?: (matching: T[]) => number
  children: (visible: T[], active: string) => ReactNode
}) {
  const [active, setActive] = useState(options[0])
  const visible = active === options[0] ? items : items.filter((it) => match(it, active))
  const tally = count ?? ((m: T[]) => m.length)

  return (
    <div>
      <div className="-mx-1 mb-3.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hidden">
        {options.map((o) => {
          const on = o === active
          const n = tally(o === options[0] ? items : items.filter((it) => match(it, o)))
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(o)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap transition-colors ${
                on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
              }`}
            >
              {o}
              {/* The count is the point of a filter chip — it tells you whether the
                  narrowing is worth the tap before you spend it. */}
              <span className={`ml-1 tabular-nums ${on ? 'text-white/60' : 'text-[#9b958b]'}`}>{n}</span>
            </button>
          )
        })}
      </div>
      {visible.length > 0 ? (
        children(visible, active)
      ) : (
        <p className="py-3 text-[12.5px] text-[#9b958b]">Nothing under {active} in this window.</p>
      )}
    </div>
  )
}

/* ── period-aware hero ───────────────────────────────────────────────────── */

/**
 * The page hero, re-cut when the window changes.
 *
 * On `month` — the default — this renders exactly the hero each page authored: the
 * hand-picked supporting figures, the real delta, the tone someone chose. Those are
 * month facts and they are the best version of this card.
 *
 * On any other window they would be lies, so the card falls back to what the site
 * data can actually support: the summed figure for that window, how many sites are
 * in it, and the leading site. Fewer figures, all of them true.
 */
export function PeriodHero({
  slug,
  children,
  ...month
}: Parameters<typeof Hero>[0] & { slug: string; children?: never }) {
  const { period, cut: window } = usePeriod()
  const cut = siteCut(slug, window)

  if (period.key === 'month' || !cut) return <Hero {...month} />

  const rate = cut.kind === 'rate'
  const top = cut.rows[0]
  return (
    <Hero
      {...month}
      value={rate ? `${Math.round(cut.overall)}` : fmt(cut.overall)}
      unit={rate ? '%' : undefined}
      status={period.window}
      tone="neutral"
      stats={[
        { value: `${cut.kind === 'count' ? cut.active : cut.rows.length}`, label: 'Sites' },
        ...(top && top.value > 0
          ? [
              {
                value: rate ? `${Math.round(top.percent)}` : fmt(top.value),
                unit: rate ? '%' : undefined,
                label: `Top · ${top.site.name}`,
              },
            ]
          : []),
      ]}
    />
  )
}

/**
 * Provenance, closing the page. A month's figures without the month they were
 * cut on are unciteable — the printed report stamps every page for this reason.
 *
 * `asOf` is overridden by the selected window: a page cut to last week that still
 * stamps the month's closing date is citing the wrong thing.
 */
export function Stamp({ asOf, source }: { asOf: string; source?: string }) {
  const { period } = usePeriod()
  return (
    <p className="px-1 pt-1 pb-2 text-center text-[11px] text-[#9b958b]">
      {period.key === 'month' ? `As of ${asOf}` : period.window}
      {source && ` · ${source}`}
    </p>
  )
}
