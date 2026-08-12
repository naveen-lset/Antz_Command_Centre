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

import { createContext, useContext, useId, useState, type ComponentType, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { AnimatedValue, Reveal, usePlay } from '../motion'
import { TODAY, longDate } from '../core/calendar'
import { SITES } from '../core/world'
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

/**
 * MD3_ANTZ — the brand palette, and the one place a chart colour is decided.
 *
 * These are the published library tokens. Everything below in this file that colours a
 * mark resolves to one of them, so retheming the charts is an edit here rather than a
 * sweep through twenty-eight files.
 *
 * THE SPLIT BETWEEN FILL AND INK IS NOT STYLISTIC. The brand brights are saturated and
 * light, and measured against white they are fills, not strokes:
 *
 *   Primary      #37BD69   2.43:1     Secondary   #00D6C9   1.83:1
 *   moderateSec  #E4B819   1.88:1     Tertiary    #FA6140   3.07:1
 *
 * A 1.5px sparkline in Primary is under the 3:1 floor a non-text mark needs, and on the
 * sage ground it drops further (2.09:1). The `On*` tokens are the palette's own answer —
 * OnSurface #006D35 is 6.48:1, OnSecondaryContainer #1F415B is 10.68:1 — and MD3 already
 * intends them as what you draw ON a container. So: brights fill areas, bars and donut
 * segments where the label sits outside the mark; the dark tokens carry strokes, thin
 * bars, endpoints and any accent that is also type.
 */
export const MD3 = {
  primary: '#37bd69',
  primaryContainer: '#52f990',
  onPrimaryContainer: '#1f515b',
  secondary: '#00d6c9',
  secondaryDark: '#00abab',
  secondaryContainer: '#afefeb',
  onSecondaryContainer: '#1f415b',
  tertiary: '#fa6140',
  tertiaryContainer: '#ffbda8',
  error: '#e93353',
  errorContainer: '#ffd3d3',
  addPrimary: '#00afd6',
  moderatePrimary: '#ffe86e',
  moderateSecondary: '#e4b819',
  notes: '#fcf4ae',
  background: '#eff5f2',
  onBackground: '#e1f9ed',
  surfaceVariant: '#dae7df',
  onSurface: '#006d35',
  onSurfaceVariant: '#44544a',
  outline: '#839d8d',
  outlineVariant: '#c3cec7',
  neutralSecondary: '#7a8684',
  neutral05: 'rgba(0,0,0,0.05)',
} as const

/** Unfilled meter, bar remainder, gauge rest — the palette's own recessive surface. */
export const TRACK = MD3.surfaceVariant
/** Chart gridlines and baselines. */
export const GRID = MD3.neutral05

/**
 * Semantic tones, as TYPE.
 *
 * `TONE` is read far more often as text than as a mark — severity counts, deltas, status
 * labels — so it stays on values that clear AA. `good` and `neutral` move onto MD3_Antz
 * (`onSurface` 6.48:1, `onSurfaceVariant` 8.04:1); `neutral` in particular was #9b958b at
 * 2.97:1, which failed everywhere it appeared.
 *
 * `warn` and `bad` stay put, and that is a deliberate gap rather than an oversight: the
 * palette's amber is #E4B819 at 1.88:1 and its Error is #E93353 at 4.15:1, and neither
 * survives being set at 11–13px. The brand values for those two live in `TONE_FILL`,
 * which is what the charts use.
 */
export const TONE = {
  good: MD3.onSurface,
  warn: '#b45309',
  bad: '#dc2626',
  neutral: MD3.onSurfaceVariant,
} as const
export type Tone = keyof typeof TONE

/** The same four tones as MARKS — brand values, because a fill is not type. */
export const TONE_FILL: Record<Tone, string> = {
  good: MD3.primary,
  warn: MD3.moderateSecondary,
  bad: MD3.error,
  neutral: MD3.outline,
}

/** Tone washes — a mark's own container, for chips, tray cells and heat cells. */
export const TONE_SOFT: Record<Tone, string> = {
  good: MD3.onBackground,
  warn: MD3.notes,
  bad: MD3.errorContainer,
  neutral: MD3.surfaceVariant,
}

/**
 * The categorical ramp, for the charts where the categories are genuinely unlike —
 * a donut of causes, a composition of classes, lanes in and out.
 *
 * Single-hue lightness steps remain the default and this is the exception; see the note
 * on `step` below. Ordered so neighbours differ in LIGHTNESS as well as hue, because a
 * ramp separated only by hue collapses in greyscale and for a red–green reader. No two
 * adjacent entries sit within 1.35:1 of each other.
 */
export const SERIES = [
  MD3.onSurface, // deep green
  MD3.secondaryDark, // teal
  MD3.onSecondaryContainer, // navy
  MD3.moderateSecondary, // gold
  MD3.addPrimary, // sky
  MD3.tertiary, // coral
  MD3.error, // crimson
  MD3.outline, // sage
] as const

/** Nth category, wrapping — never index past the end and land on `undefined`. */
export const series = (i: number) => SERIES[i % SERIES.length]

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
export const DEEP = MD3.onPrimaryContainer
export const ACCENT_INK = MD3.onSurface

/**
 * ONE accent for every module — the home screen's hero green. Fourteen different
 * module hues made the sheets busy and fought the sage ground, so colour identity
 * now comes from the ground and the type, not from a per-module tint. Icons and
 * data marks wear this; text never does.
 */
export const ACCENT = MD3.primary
const AccentContext = createContext<string>(ACCENT)
export const AccentProvider = AccentContext.Provider
export const useAccent = () => useContext(AccentContext)

/**
 * The stroke companion to whatever accent is in scope.
 *
 * A 1.5px line and a 200px area cannot be the same green: the area wants the brand
 * Primary, the line needs to be seen. Charts fill with `accent` and draw with this.
 */
const STROKE_OF: Record<string, string> = {
  [MD3.primary]: MD3.onSurface,
  [MD3.secondary]: MD3.onPrimaryContainer,
  [MD3.secondaryDark]: MD3.onPrimaryContainer,
  [MD3.moderateSecondary]: '#8a6d00',
  [MD3.tertiary]: '#b8360f',
  [MD3.addPrimary]: MD3.onSecondaryContainer,
}
export const strokeOf = (accent: string) => STROKE_OF[accent.toLowerCase()] ?? accent
export const useStroke = () => strokeOf(useContext(AccentContext))

/**
 * Lightness steps of the accent — magnitude, not identity.
 *
 * Still the default for series inside one card, and still the reason this app does not
 * look like a dashboard: six cycled hues say six unlike things, and a ranked bar chart is
 * one thing measured six times. `SERIES` above is for the charts where the categories
 * really are unlike.
 */
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

/**
 * Delta ink. The brand's own pair for up and down is Primary and Tertiary, but a delta is
 * 12px type — at 2.43:1 and 3.07:1 neither is readable at that size, so this takes the
 * darker end of each: `onSurface` for a gain, the semantic bad for a fall.
 */
export const signTone = (s: string) => {
  const t = s.trim()
  if (t.startsWith('+')) return TONE.good
  if (t.startsWith('-') || t.startsWith('−')) return TONE.bad
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
  bare = false,
  lead = false,
  children,
}: {
  icon?: Icon
  label?: string
  aside?: ReactNode
  /** Half-width cards inside a `Duo` — 20px of padding would eat the number. */
  tight?: boolean
  /**
   * A BLOCK INSIDE ANOTHER SECTION'S CARD, rather than a card of its own.
   *
   * Some pages carry eighteen sections, and eighteen white cards down a column reads as
   * eighteen equally-weighted things to consider rather than as four questions with their
   * evidence under each. `bare` drops the card, the padding and the reveal, and prints the
   * label as a hairline sub-heading instead — so a group can nest its blocks and the
   * hierarchy is card title, then block heading, then rows.
   *
   * The reveal goes with the card deliberately: the GROUP animates in as one thing. Fading
   * each block separately inside a card that has already arrived is motion with nothing to
   * say.
   */
  bare?: boolean
  /**
   * The page's headline card — the label is set at heading scale rather than as an overline.
   *
   * Opt-in, so the other sixty-odd `Section`s on the product are untouched. One card per page may
   * earn this; a page where several do has no headline.
   */
  lead?: boolean
  children: ReactNode
}) {
  const accent = useAccent()

  if (bare) {
    return (
      <section className="min-w-0" aria-label={label}>
        {label && (
          <div className="mt-6 mb-3 flex items-center gap-3 first:mt-0">
            {Glyph && <Glyph size={13} strokeWidth={2} style={{ color: accent }} aria-hidden />}
            <h3 className="text-overline font-semibold whitespace-nowrap text-[#3d3a34] uppercase">{label}</h3>
            <span className="h-px flex-1" style={{ backgroundColor: HAIR }} aria-hidden />
            {aside && <span className="shrink-0 text-caption whitespace-nowrap text-[#9b958b]">{aside}</span>}
          </div>
        )}
        {children}
      </section>
    )
  }

  return (
    /* Each card fades up as it scrolls in; the marks inside read the same signal
       through their own observer, so a card and its data animate together. */
    /* `h-full` TWICE, and both are load-bearing. The grid rows this sits in stretch their
       items, but the item is this `Reveal` wrapper — the white `<section>` is a block inside
       it and would still end at its own content, leaving two cards on one row ending at
       different heights with the shorter one's card floating in a taller invisible box. The
       wrapper takes the row height, the section fills the wrapper, and the two cards end on
       the same line. Outside a grid the parent's height is auto, `height: 100%` resolves to
       auto, and nothing changes — which is why this is safe on all sixty-odd Sections. */
    <Reveal className="h-full">
      <section className={`h-full rounded-[var(--radius-card)] bg-white ${tight ? 'p-[var(--pad-card-sm)]' : 'p-[var(--pad-card)]'}`} aria-label={label}>
        {label && (
          <header className={`flex items-center justify-between gap-3 ${tight ? 'mb-3' : 'mb-4'}`}>
            <span className="flex min-w-0 items-center gap-2">
              {Glyph && <Glyph size={16} strokeWidth={1.75} style={{ color: accent }} aria-hidden />}
              {/* Wraps rather than truncates — a clipped section title loses meaning.
                  This is the product's SECTION HEADING and now says so: semibold, on
                  `--fs-title`, which is the one text size that steps with the column
                  (16 → 18 → 20). It was 15px medium, half a step above the 14px rows
                  underneath it and reading as a slightly bolder row rather than as the
                  thing that names the card. */}
              <h2
                className={`font-semibold text-balance text-[#1c1a16] ${
                  lead
                    ? 'text-h2'
                    : tight
                      ? 'text-body'
                      : 'text-[length:var(--fs-title)] leading-[var(--lh-title)] tracking-[-0.2px]'
                }`}
              >
                {label}
              </h2>
            </span>
            {aside && <span className="shrink-0 text-caption whitespace-nowrap text-[#9b958b]">{aside}</span>}
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
  /* `page-stack` carries no styling. It is the hook `.page-enter` in `index.css` needs
     to find a page's own top-level cards and step their entrance 40ms apart — the one
     class name that tells the motion layer "these are the sections". Every module and
     record page renders through here, so marking it once marks all of them. */
  return (
    /* NO `items-start`. It sized every card to its own content, so two cards sharing a row
       ended at different heights and the row read as ragged rather than as a row. The grid
       default — stretch — gives both the height of the taller, which is what `Section`'s
       `h-full` then fills. Content still sits at the top of each card; only the white ends
       level. */
    <div className="page-stack flex w-full flex-col gap-[var(--gap)] px-[var(--gutter)] pb-2 @[760px]:grid @[760px]:grid-cols-2">
      {children}
    </div>
  )
}

/** Two half-width cards on one line — breaks the single-column drumbeat. */
export function Duo({ children }: { children: ReactNode }) {
  /* Inside a two-column `Stack` this would nest a pair inside a half, giving four
     cards across and none of them legible, so past the break it spans the full
     stack width and keeps its own two-up split. */
  /* Stretched, not `items-start` — a pair on one line is the case where two cards ending at
     different heights is most obvious. See the note in `Stack`. */
  return <div className="grid grid-cols-2 gap-[var(--gap)] @[760px]:col-span-2">{children}</div>
}

/** Subhead inside a card, so one card can carry two grouped fact sets. */
export function Rule({ label }: { label: string }) {
  return (
    <div className="mt-5 mb-3 flex items-center gap-3">
      <span className="text-overline font-medium text-[#9b958b] uppercase">{label}</span>
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
        /* `--lh-fig` (1.125) is the KPI ratio the type scale states — 64 → 72 — and it
           is one variable rather than a literal because every figure in the product
           passes through here. Tracking is em-based for the same reason: one value has
           to serve a 20px tile figure and an 80px hero, and -0.02em resolves to -0.4px
           and -1.6px respectively, which is each end of the scale's own range. */
        style={{
          fontSize: `calc(${size}px * var(--fig-scale))`,
          lineHeight: 'var(--lh-fig)',
          letterSpacing: '-0.02em',
          color,
        }}
      />
      {unit && <span className="text-small text-[#9b958b]">{unit}</span>}
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
  head,
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
  /**
   * A row above the figure, inside the same card.
   *
   * For the page whose toolbar — an as-of line, a search field and a filter button — was a
   * separate card immediately above the hero. Two cards to say "here is where you are and
   * here is the number" is one card too many, and the toolbar reads as part of the hero
   * because it governs it.
   */
  head?: ReactNode
}) {
  const accent = useAccent()
  const centred = align === 'center'
  return (
    /* The hero is a card like every other section — sitting bare on the sage
       ground left it reading as page chrome rather than as the module's headline. */
    <div className="w-full px-[var(--gutter)] pb-3">
      <section
        className={`animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)] ${centred ? 'text-center' : ''}`}
        aria-label={label}
      >
        {head && <div className="mb-4 border-b border-[#f0efec] pb-4">{head}</div>}
        {/* THE FIGURE AND ITS STATS SIT SIDE BY SIDE ONCE THERE IS ROOM.
            Stacked, a 64px figure left the right two-thirds of a wide card empty and pushed the
            stats onto a fourth row — the single largest patch of dead space on any module page.
            Centred heroes keep the stack, because centring is the point of them. */}
        <div className={centred ? '' : '@[640px]:flex @[640px]:items-end @[640px]:justify-between @[640px]:gap-6'}>
        <div className="min-w-0">
        <Figure value={value} unit={unit} size={64} color={HERO_INK} />
        <p
          className={`mt-1 flex items-center gap-2 text-body text-[#3d3a34] ${centred ? 'justify-center' : ''}`}
        >
          {Glyph && <Glyph size={15} strokeWidth={1.75} style={{ color: accent }} aria-hidden />}
          {label}
        </p>
        {status && (
          <p className={`mt-3 flex items-center gap-2 ${centred ? 'justify-center' : ''}`}>
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone] }} aria-hidden />
            <span className="text-small font-medium" style={{ color: TONE[tone] }}>
              {status}
            </span>
          </p>
        )}
        </div>
        {stats && stats.length > 0 && (
          <div
            className={`mt-5 flex items-stretch border-t border-[#f0efec] pt-4 ${
              centred ? '' : '@[640px]:mt-0 @[640px]:shrink-0 @[640px]:border-t-0 @[640px]:border-l @[640px]:pt-0 @[640px]:pl-6'
            }`}
          >
            {/* `flex-auto`, NOT `flex-1`. The difference is the flex BASIS, and it decided whether
                the last figure stayed inside the card. `flex-1` is `1 1 0%`: every stat starts from
                zero and takes an equal third, so three columns came out 68px wide apiece while
                "15,959" needs about 95 — the figure painted 25px past its column, and that column
                sits flush against the card's right padding, so it painted 25px outside the CARD.
                Measured at 1000/1280/1512/1920, it spilled at every one of them; this was not a
                narrow-window case. `flex-auto` is `1 1 auto`: each stat starts at its own content
                width and only SURPLUS is shared equally. Side by side, where the group hugs its
                content, there is no surplus and each figure gets exactly the width it needs.
                Stacked across a full-width card the surplus is large and they still spread — the
                two layouts differed by about a pixel per column, which is why one class serves
                both and no breakpoint is involved. */}
            {stats.map((s, i) => (
              <span
                key={`${s.label}-${i}`}
                className={`min-w-0 flex-auto ${i ? 'border-l border-[#f0efec] pl-4' : ''} ${
                  i < stats.length - 1 ? 'pr-4' : ''
                } ${centred ? 'text-center' : ''}`}
              >
                <Figure value={s.value} unit={s.unit} size={24} />
                <span className="mt-1 block truncate text-caption text-[#6d6860]">{s.label}</span>
              </span>
            ))}
          </div>
        )}
        </div>
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
        <li key={it.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span
            className="size-[7px] shrink-0 rounded-full"
            style={{ backgroundColor: TONE[it.tone ?? 'neutral'] }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-small text-[#1c1a16]">{it.label}</span>
          <span
            className="shrink-0 text-small font-medium tabular-nums"
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
          <p className="mt-1 text-small text-[#3d3a34]">{m.label}</p>
          {m.note && <p className="mt-1 text-caption text-[#9b958b]">{m.note}</p>}
        </div>
      ))}
    </div>
  )
}

/**
 * A RANKING — rows in order, with the share as a rail rather than as a bar apiece.
 *
 * This was twenty-five stacks of full-width bars across the product, and it was the single
 * biggest reason every page read as the same page: the bar drew the ordering that the row
 * order already states, so a ranking of causes, of species and of sites all came out as one
 * chart repeated. The rows now carry the figure and the share as type, and the rail carries
 * the spread. `precise` puts the bar back for the rare card where comparing lengths IS the
 * question.
 *
 * `color` overrides the accent for one row, and exists for scales whose colours mean something
 * OUTSIDE this app. The IUCN Red List categories are the case: "Critically Endangered" is red
 * the world over, and rendering it as the palest step of a green ramp because it happens to be
 * the smallest number would be throwing away the one piece of encoding every reader already
 * knows. Use it for published scales only — never to give an ordinary series its own hues.
 */
export function Bars({
  items,
  unit,
  showShare = false,
  precise = false,
}: {
  items: { label: string; value: number; sub?: string; color?: string }[]
  unit?: string
  showShare?: boolean
  /**
   * Draw the full-width bar instead of the rail.
   *
   * For the rare card where comparing MAGNITUDES is the point rather than reading the ranking
   * — two lengths side by side answer "twice as many?" faster than two numbers do. Everywhere
   * else the rows are already in order and the bar was drawing that ordering a second time.
   */
  precise?: boolean
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay<HTMLUListElement>()
  const max = Math.max(...items.map((i) => i.value), 1)
  const total = items.reduce((s, i) => s + i.value, 0) || 1

  /* A decimal below 1%, because `toFixed(0)` printed "0%" beside 388 Critically Endangered
     animals — a real figure rounded into nothing. Whole numbers everywhere else. */
  const shareText = (v: number) => {
    const p = (v / total) * 100
    return `${p >= 1 || p === 0 ? p.toFixed(0) : p.toFixed(1)}%`
  }

  return (
    <ul ref={ref} className={precise ? 'flex flex-col gap-4' : 'flex flex-col'}>
      {items.map((it, i) => {
        const figure = (
          <span className="shrink-0 text-right">
            <span className="block text-small font-medium tabular-nums text-[#1c1a16]">
              {compact(it.value)}
              {unit && <span className="ml-0.5 text-caption font-normal text-[#9b958b]">{unit}</span>}
            </span>
            {showShare && (
              <span className="mt-1 block text-caption tabular-nums text-[#9b958b]">{shareText(it.value)}</span>
            )}
          </span>
        )

        if (precise) {
          return (
            <li key={it.label}>
              <div className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1 truncate text-small text-[#1c1a16]">{it.label}</span>
                {it.sub && <span className="shrink-0 text-caption text-[#9b958b]">{it.sub}</span>}
                {figure}
              </div>
              <div className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                <div
                  className={`h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
                  style={{
                    /* Floor of 4%: on a spread as skewed as the IUCN categories — 178,240
                       against 388 — a 2% stub rendered as a dot too small to take a colour
                       from, which defeats the point of colouring it. */
                    width: `${Math.max(4, (it.value / max) * 100)}%`,
                    backgroundColor: it.color ?? mix(accent, step(i)),
                    animationDelay: animate ? `${i * 60}ms` : undefined,
                  }}
                />
              </div>
            </li>
          )
        }

        return (
          <li key={it.label} className="border-b border-[#f0efec] last:border-0">
            <div className="flex items-stretch gap-3 py-3 first:pt-0">
              <span className="min-w-0 flex-1 self-center">
                <span className="block truncate text-small text-[#1c1a16]">{it.label}</span>
                {it.sub && (
                  <span className="mt-1 block truncate text-caption text-[#9b958b]">{it.sub}</span>
                )}
              </span>
              <span className="self-center">{figure}</span>
            </div>
          </li>
        )
      })}
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
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-baseline gap-2">
            <span
              className="mt-[5px] size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: mix(accent, step(i)) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-small text-[#3d3a34]">{it.label}</span>
            <span className="shrink-0 text-small font-medium tabular-nums text-[#1c1a16]">
              {((it.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
      {unit && <p className="mt-3 text-caption text-[#9b958b]">{fmt(total)} {unit} total</p>}
    </div>
  )
}

/** Thin sparkline with a soft wash and an emphasized endpoint. */
/**
 * A CURVE, NOT A POLYLINE — and the three differences from what this was.
 *
 * SMOOTH. The points were joined with straight segments, which at tile scale turns twelve
 * months into a zigzag whose corners read as events. A Catmull-Rom spline through the same
 * points draws the same data and lets the shape read as a trend rather than as twelve
 * separate readings. Nothing is interpolated into the DATA — the curve passes exactly
 * through every point it was given.
 *
 * THINNER, AND THE FILL QUIETER. 1.4px against 1.75, and the area at 0.07 against 0.1. The
 * fill's job is to say which side of the line is "under"; at a tenth opacity it was
 * competing with the line for the same 34px.
 *
 * THE LATEST POINT WEARS A HALO. A bare dot in the accent sat on top of a fill of the same
 * hue and disappeared into it. A white ring under the dot separates it from whatever it
 * lands on, which is what makes "where are we now" readable at a glance without a label.
 */
export function Spark({ values, h = 40, w = 120 }: { values: number[]; h?: number; w?: number }) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  /* Per instance — four of these render side by side and a shared id would give all four
     the first card's colour. */
  const fillId = `spark-${useId().replace(/:/g, '')}`
  /* A SERIES WITH NO SHAPE STILL HAS TO DRAW A LINE.
     Two cases arrive here and both used to come out wrong. A single reading produced a
     one-point path — `M x y` and nothing else — which is a legal path that draws no stroke,
     so the card showed its end dot floating over an empty box. And a perfectly flat series
     divided by a `span` of zero, which the `|| 1` fallback turned into "every point sits at
     its own minimum", i.e. every point pinned to the FLOOR of the box: a flat reading drawn
     as a bottomed-out one. Both are answered by the same two lines — a flat series is centred,
     and one reading is drawn as the flat series it is, held across the full width. */
  const min = Math.min(...values)
  const max = Math.max(...values)
  const flat = max === min
  const span = flat ? 1 : max - min
  const at = (v: number) => (flat ? h / 2 : 4 + (1 - (v - min) / span) * (h - 8))

  const held = values.length < 2 ? [values[0] ?? 0, values[0] ?? 0] : values
  const stepX = w / (held.length - 1)
  const pts = held.map((v, i) => [i * stepX, at(v)] as const)
  const d = curveThrough(pts, h)
  const last = pts[pts.length - 1]

  /* The end point's height as a PERCENTAGE of the box, so it can be placed with HTML — see
     below for why it is not an SVG circle. */
  const lastPct = (last[1] / h) * 100

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-[40px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
        {/* THE FILL FADES DOWNWARD. Flat at a tenth opacity it was a pale rectangle with two
            hard vertical edges — the shape a dashboard makes, not the shape the data has.
            Fading it to nothing at the baseline leaves only the band directly under the
            curve, which is the part that says "this much". It is the one gradient on the
            card and it carries meaning rather than decorating: nowhere else in the tile is
            a gradient used, and no colour enters that is not the accent. */}
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.16} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d={`${d} L ${w} ${h} L 0 ${h} Z`}
          fill={`url(#${fillId})`}
          className={animate ? 'animate-veil' : undefined}
          style={animate ? { animationDelay: '200ms' } : undefined}
        />
        {/* NO DASH-BASED DRAW ANIMATION HERE, and that is a fix rather than a simplification.
            `stroke-dasharray` is resolved in DEVICE space when `vector-effect: non-scaling-stroke`
            is set, so the `pathLength={1}` normalisation that makes "dash the whole path" work
            elsewhere does not apply — the browser read it as a one-pixel dash beside a one-pixel
            gap and drew the line permanently dotted. The stroke has to stay non-scaling, because
            this SVG is stretched (`preserveAspectRatio="none"`) and a scaling stroke would be
            thicker vertically than horizontally. So the reveal is a fade, which is also the
            calmer of the two. */}
        <path
          d={d}
          fill="none"
          /* The wash above is the accent; the line is its darker companion. At 1.4px the
             brand Primary measures 2.43:1 on white, under the floor a mark needs. */
          stroke={strokeOf(accent)}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={animate ? 'animate-veil' : undefined}
          style={animate ? { animationDelay: '120ms' } : undefined}
        />
      </svg>

      {/* THE END POINT IS HTML, NOT AN SVG CIRCLE. The viewBox is stretched to the card's
          width, so a circle drawn inside it is stretched with everything else — at the
          rendered size that was a 6×9px ellipse sitting beside the line rather than a dot on
          the end of it. Positioned here instead: 100% along, and its own height as a
          percentage of the box, which is exact under any stretch and perfectly round at any
          card width. */}
      <span
        /* 8px across with a 1.5px ring, not 7 with 2. The ring's job is to lift the point off
           whatever it lands on; at 2px it also covered the last two pixels of the stroke on
           each side, so a line arriving horizontally appeared to stop short of its own end
           point. A thinner ring still separates and leaves a 5px core for the line to meet. */
        className={`pointer-events-none absolute size-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-[1.5px] ring-white ${
          animate ? 'animate-pop' : ''
        }`}
        style={{
          left: '100%',
          top: `${lastPct}%`,
          backgroundColor: accent,
          animationDelay: animate ? '520ms' : undefined,
        }}
        aria-hidden
      />
    </div>
  )
}

/**
 * A MONOTONE cubic through every point (Fritsch–Carlson), emitted as beziers.
 *
 * The obvious smoothing — a Catmull-Rom spline — was tried first and was wrong here, for a
 * reason worth stating. Between two alternating readings a Catmull-Rom curve bulges past
 * both of them, so a series that wobbles by one per cent is drawn as a rolling sine wave:
 * it invents a peak between every pair of months, and the peak is a value the collection
 * never held. On the population card that turned seeded noise into what looked like a
 * designed decoration.
 *
 * Fritsch–Carlson constrains the tangents so the curve is monotone between consecutive
 * points, which means it CANNOT overshoot: every local maximum and minimum on screen is a
 * real reading. The result is smooth where the data is smooth and honest where it is not,
 * which is the only kind of smoothing a figure this small can afford.
 */
function curveThrough(pts: readonly (readonly [number, number])[], _h: number): string {
  const n = pts.length
  if (n < 2) return n ? `M ${pts[0][0]} ${pts[0][1]}` : ''

  /* Secant slopes, then tangents averaged from their neighbours — zeroed wherever the
     series turns, which is what pins the curve to the turning point. */
  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0] || 1
    slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]
  }

  const m: number[] = new Array(n)
  m[0] = slope[0]
  m[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  }

  /* The monotonicity condition itself: where a tangent is steep enough to overshoot the
     next point, both tangents are scaled back onto the circle of radius 3. */
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
    const c1x = pts[i][0] + third
    const c1y = pts[i][1] + m[i] * third
    const c2x = pts[i + 1][0] - third
    const c2y = pts[i + 1][1] - m[i + 1] * third
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`
  }
  return d
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
    /* Fully rounded caps and a wider gutter, so twelve columns read as twelve marks rather
       than as a comb. The recessive tint drops to 0.24 and the latest column stays at full
       accent: with the others quieter, "where are we now" is answered by contrast alone —
       no label, no highlight ring, nothing added to the card. */
    /* A COLUMN HAS A MAXIMUM WIDTH, AND THE ROW IS RIGHT-ALIGNED.
       `flex-1` alone divides the box between however many values arrive, which is right at
       twelve and absurd below about four: one value took the entire 104px and, at a full
       corner radius, came out as a solid pill — the Natality and Mortality cards under a
       one-day window showed a filled lozenge where their chart should be. A 12px ceiling
       leaves the twelve-column case untouched (~10px each at the widest card these appear on)
       and keeps a short series reading as columns. Right-aligned so the latest one stays
       against the same edge whatever the count, which is where "now" is expected. */
    <div ref={ref} className="flex items-end justify-end gap-[3.5px]" style={{ height: h }}>
      {values.map((v, i) => (
        <span
          key={i}
          className={`min-w-0 max-w-[12px] flex-1 origin-bottom rounded-full ${animate ? 'animate-grow-y' : ''}`}
          style={{
            /* Floor of 2.5px so a zero month is still a mark on the axis rather than a
               gap the eye reads as missing data — and at a full radius that floor is a
               dot, which is the honest shape for "none". */
            height: `${Math.max(2.5, (v / max) * h)}px`,
            backgroundColor: i === values.length - 1 ? accent : mix(accent, 0.24),
            animationDelay: animate ? `${i * 35}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}

/**
 * A RATE, AT TILE SCALE — the mark the supporting KPI tiles were missing.
 *
 * The four rate tiles stated a percentage and drew nothing, so "92%" and "86%" looked
 * identical until both were read. A five-pixel meter answers "how far along" before either
 * number is, which is the whole job of a KPI tile.
 *
 * TWO SCALES, BECAUSE THERE ARE TWO KINDS OF RATE. A coverage rate is measured against
 * everything — 100% is the end of the track. A rate with a published target is measured
 * against the target, so the notch sits at three-quarters and an overshoot is visibly an
 * overshoot rather than a bar that is merely full. Food wastage against a 3% target would
 * be a three-pixel sliver on a 0–100 track; against its own target it is a bar with a line
 * on it, which is the fact the tile exists to state.
 */
export function SparkMeter({
  percent,
  target,
  /** True where a LOWER reading is the good one — wastage, not coverage. */
  inverse,
}: {
  percent: number
  target?: number
  inverse?: boolean
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const scale = target && target > 0 ? target / 0.75 : 100
  const width = Math.max(2, Math.min(100, (percent / scale) * 100))
  const missed = target !== undefined && (inverse ? percent > target : percent < target)

  return (
    <span ref={ref} className="mt-2 block h-[5px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
      <span
        className={`block h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
        style={{ width: `${width}%`, backgroundColor: missed ? TONE.warn : accent }}
      />
      {target !== undefined && target > 0 && (
        <span
          className="relative block h-full w-[1.5px] rounded-full"
          style={{ marginTop: -5, marginLeft: '75%', backgroundColor: 'rgba(22,21,15,0.35)' }}
          aria-hidden
        />
      )}
    </span>
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
                <th key={c} className="pb-1 text-tick font-normal text-[#9b958b]">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r}>
                <th className="pr-2 text-right text-caption font-normal whitespace-nowrap text-[#3d3a34]">{r}</th>
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
  /* Snapped to the ladder like every other fitted figure, and floored at its bottom
     rung rather than at an arbitrary 13 — a four-up chip is the tightest box a number
     is asked to sit in, and 14 is the size the scale already has for exactly that. */
  const size = Math.min(20, Math.max(14, snapFig(chip / Math.max(...cells.map((c) => figureEm(c.value)), 0.6))))
  return (
    <div ref={ref}>
      <div className={`grid ${cols === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
        {cells.map((c, i) => (
          /* One calm wash for every cell — a red or amber panel per cell turned the
             grid into a heat map of alarm. The small dot carries state instead. */
          <div
            key={c.label}
            className={`rounded-[12px] px-3 py-3 ${animate ? 'animate-fade-up' : ''}`}
            style={{ backgroundColor: mix(accent, 0.07), animationDelay: animate ? `${i * 45}ms` : undefined }}
          >
            <div className="flex items-center gap-1.5">
              {c.tone && c.tone !== 'neutral' && (
                <span className="size-[6px] shrink-0 rounded-full" style={{ backgroundColor: TONE[c.tone] }} aria-hidden />
              )}
              <Figure value={c.value} size={size} />
            </div>
            {/* Wraps to a second line rather than clipping — "Savanna 1" and
                "Savanna 3" both truncate to "Savanna…" at four columns.
                `hyphens` earns its place on the one-word labels: a four-up chip is
                ~52px and "Herpetarium" is a single word wider than that, so normal
                wrapping has nowhere to break and the word runs out past the chip's
                own rounded edge. Hyphenating breaks it inside the chip instead.
                `break-words` is the belt to that braces: hyphenation needs a
                dictionary the engine may not ship, and a chip that keeps its text
                inside itself matters more than where the break lands. */}
            <p className="mt-1 text-caption hyphens-auto break-words text-[#6d6860]" lang="en">
              {c.label}
            </p>
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
            <span className="min-w-0 flex-1 text-small text-[#1c1a16]">{s.label}</span>
            {s.sub && <span className="shrink-0 text-caption text-[#9b958b]">{s.sub}</span>}
            <span className="shrink-0 text-small font-medium tabular-nums text-[#1c1a16]">
              {s.value}
              {unit && <span className="ml-0.5 text-caption font-normal text-[#9b958b]">{unit}</span>}
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
    <ul ref={ref} className="flex flex-col gap-4">
      {routes.map((r, i) => (
        <li key={`${r.from}-${r.to}`}>
          <div className="flex items-baseline gap-2 text-small">
            <span className="min-w-0 truncate text-[#1c1a16]">{r.from}</span>
            <span className="shrink-0 text-[#9b958b]" aria-hidden>→</span>
            <span className="min-w-0 flex-1 truncate text-[#1c1a16]">{r.to}</span>
            <span className="shrink-0 font-medium tabular-nums text-[#1c1a16]">
              {r.value}
              {unit && <span className="ml-0.5 text-caption font-normal text-[#9b958b]">{unit}</span>}
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
            {r.sub && <span className="shrink-0 text-caption text-[#9b958b]">{r.sub}</span>}
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
        <li key={it.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          {rank && (
            <span className="w-[14px] shrink-0 text-caption tabular-nums text-[#9b958b]">{String(i + 1)}</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small text-[#1c1a16]">{it.label}</span>
            {it.sub && <span className="mt-1 block text-caption text-[#9b958b]">{it.sub}</span>}
          </span>
          {it.share !== undefined && (
            <span className="h-[5px] w-[44px] shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(3, it.share)}%`, backgroundColor: mix(accent, 0.7) }}
              />
            </span>
          )}
          <span className="shrink-0 text-small font-medium tabular-nums text-[#1c1a16]">{it.value}</span>
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
            {i === hi && <span className="text-caption font-semibold tabular-nums text-[#1c1a16]">{compact(v)}</span>}
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
            className={`flex-1 text-center text-tick ${i === hi ? 'font-semibold text-[#1c1a16]' : 'text-[#9b958b]'}`}
          >
            {l}
          </span>
        ))}
      </div>
      {unit && <p className="mt-3 text-caption text-[#9b958b]">{unit}</p>}
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
            <span className="min-w-0 flex-1 truncate text-small text-[#1c1a16]">{it.label}</span>
            <span className="shrink-0 text-caption tabular-nums text-[#9b958b]">{cum[i].toFixed(0)}%</span>
            <span className="w-[30px] shrink-0 text-right text-small font-medium tabular-nums text-[#1c1a16]">
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
          stroke={strokeOf(accent)}
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
              fill={strokeOf(accent)}
              className={animate ? 'animate-pop' : undefined}
              style={animate ? { animationDelay: `${260 + i * 70}ms` } : undefined}
            />
          )
        })}
      </svg>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2">
        {axes.map((ax) => (
          <li key={ax.label} className="flex items-baseline justify-between gap-2 border-b border-[#f0efec] pb-1.5">
            <span className="truncate text-small text-[#3d3a34]">{ax.label}</span>
            <span className="shrink-0 text-small font-medium tabular-nums text-[#1c1a16]">{ax.score}</span>
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
        <span className="text-small text-[#1c1a16]">{label}</span>
        <span className="text-small font-medium tabular-nums text-[#1c1a16]">{value}</span>
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
    <div className="flex flex-col gap-4">
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
        <li key={`${it.label}-${it.sub}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span
            className="mt-[6px] size-[6px] shrink-0 rounded-full"
            style={{ backgroundColor: TONE[it.tone ?? 'neutral'] }}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small text-[#1c1a16]">{it.label}</span>
            {/* Wraps: the label is an identifier and can be clipped, but the sub
                carries the reason and a clipped reason is worth nothing. */}
            <span className="mt-1 block text-caption text-[#9b958b]">{it.sub}</span>
          </span>
          <span className="shrink-0 pt-[1px] text-caption tabular-nums whitespace-nowrap text-[#9b958b]">{it.value}</span>
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
              <span className={`block ${lg ? 'text-small' : 'text-small'} text-[#1c1a16]`}>{it.label}</span>
              {it.sub && <span className="mt-1 block text-caption text-[#9b958b]">{it.sub}</span>}
            </span>
            {it.delta && (
              <span
                className="shrink-0 text-caption font-medium tabular-nums"
                style={{ color: signTone(it.delta) ?? FAINT }}
              >
                {it.delta}
              </span>
            )}
            <span
              className={`shrink-0 font-medium tabular-nums ${lg ? 'text-lead' : 'text-small'}`}
              style={{ color: it.tone && it.tone !== 'neutral' ? TONE[it.tone] : VALUE }}
            >
              {it.value}
            </span>
            {/* Reserved on every row of a card that has any link, so the figures stay
                in one column instead of stepping in and out by 14px. */}
            <span className="w-[9px] shrink-0 text-caption" style={{ color: it.href ? accent : 'transparent' }} aria-hidden>
              ›
            </span>
          </>
        )
        /* Index-based rather than `first:`/`last:`, because those variants would key
           off the anchor — the only child of its <li> — and so fire on every row. */
        const pad = [
          lg ? 'py-4' : 'py-3',
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
      className="flex items-end justify-between gap-3 rounded-[10px] px-3 py-3"
      style={{ backgroundColor: lead ? mix(accent, 0.1) : '#f7f6f3' }}
    >
      <span className="min-w-0">
        <span className="block text-overline font-medium uppercase" style={{ color: MUTED }}>
          {label}
        </span>
        {sub && <span className="mt-1 block text-caption" style={{ color: FAINT }}>{sub}</span>}
      </span>
      <span className="flex shrink-0 items-baseline gap-2">
        {delta && (
          <span className="text-caption font-medium tabular-nums" style={{ color: signTone(delta) ?? FAINT }}>
            {delta}
          </span>
        )}
        <span
          className="font-display text-n-sm font-bold tabular-nums"
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
                <span className="block text-small text-[#1c1a16]">{r.label}</span>
                {r.sub && (
                  <span className="mt-1 block text-caption" style={{ color: FAINT }}>
                    {r.sub}
                  </span>
                )}
              </span>
              {/* Signed figure, then the bar it describes, then where the collection
                  stood after it — cause, shape, consequence, left to right. */}
              <span
                className="w-[42px] shrink-0 text-right text-body font-medium tabular-nums"
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
              <span className="w-[58px] shrink-0 text-right text-caption tabular-nums" style={{ color: FAINT }}>
                {fmt(r.running)}
              </span>
              <span
                className="w-[8px] shrink-0 text-caption"
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
                <a href={r.href} className="card-press -mx-2 flex items-center gap-2 rounded-[10px] px-2 py-3">
                  {row}
                </a>
              ) : (
                <div className="flex items-center gap-2 py-3">{row}</div>
              )}
            </li>
          )
        })}
      </ul>
      <Bookend label={closing.label} sub={closing.sub} value={closing.value} delta={closing.delta} lead />

      {!closes && (
        <p className="mt-3 text-caption" style={{ color: TONE.bad }}>
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
          <p className="mt-1 text-small text-[#3d3a34]">{m.label}</p>
          {m.note && <p className="mt-1 text-caption text-[#9b958b]">{m.note}</p>}
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
 * THE FIGURE LADDER — the only sizes a number is ever set at.
 *
 * The fitting below used to return any integer that fitted, which is how the product
 * ended up rendering figures at 17, 19, 22 and 25px: sizes nobody chose, arrived at by
 * dividing a column width by a digit count. Two cards side by side could differ by a
 * pixel for no reason a reader could perceive as meaning. Fitting still decides HOW BIG
 * a number may be; this decides which sizes exist for it to choose from.
 *
 * The bottom two rungs are the text scale's own 14 and 16. A figure in a four-up chip
 * genuinely is small text — pretending otherwise would only mean it overflowed its chip.
 */
export const FIG_STEPS = [14, 16, 20, 24, 28, 32, 40, 48, 64] as const

/** Largest ladder step not above `px`. */
const snapFig = (px: number) => FIG_STEPS.filter((s) => s <= px).pop() ?? FIG_STEPS[0]

/**
 * Largest LADDER STEP at which the widest value still fits its column.
 *
 * `content` is the card's inner width at the 390px reference viewport: 390 − 40 for
 * the stack gutter − 40 for the card's own padding.
 */
function fitSize(values: string[], columns: number, max: number, content = 310) {
  const column = content / columns - 12
  const widest = Math.max(...values.map(figureEm), 0.6)
  return Math.min(snapFig(max), Math.max(16, snapFig(column / widest)))
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
          <p className="mt-1 text-caption text-[#6d6860]">{it.label}</p>
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
        <p className="text-overline font-medium uppercase" style={{ color: accent }}>
          {caption[0]}
        </p>
        <div className="mt-1.5">
          <Figure value={high.value} size={24} />
        </div>
        <p className="mt-1.5 truncate text-small text-[#1c1a16]">{high.label}</p>
        {high.sub && <p className="mt-1 text-caption text-[#9b958b]">{high.sub}</p>}
      </div>
      <span className="w-px shrink-0" style={{ backgroundColor: HAIR }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p
          className="text-overline font-medium uppercase"
          style={{ color: lowTone && lowTone !== 'neutral' ? TONE[lowTone] : FAINT }}
        >
          {caption[1]}
        </p>
        <div className="mt-1.5">
          <Figure value={low.value} size={24} color={lowTone && lowTone !== 'neutral' ? TONE[lowTone] : INK2} />
        </div>
        <p className="mt-1.5 truncate text-small text-[#1c1a16]">{low.label}</p>
        {low.sub && <p className="mt-1 text-caption text-[#9b958b]">{low.sub}</p>}
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
              <span className="block truncate text-small text-[#1c1a16]">{it.label}</span>
              {it.sub && <span className="mt-1 block truncate text-caption text-[#9b958b]">{it.sub}</span>}
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
              className="w-[46px] shrink-0 text-right text-small font-medium tabular-nums"
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
        <span className="text-small text-[#1c1a16]">{label}</span>
        <Figure value={value} size={20} color={fill} />
      </div>
      <div className="relative mt-3 h-[10px] w-full rounded-full" style={{ backgroundColor: TRACK }}>
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
      {note && <p className="mt-1.5 text-caption text-[#9b958b]">{note}</p>}
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
                className={`pb-2 text-overline font-medium whitespace-nowrap text-[#9b958b] uppercase ${
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
              <td className="py-3 pr-2">
                <span className="block text-small text-[#1c1a16]">{r.label}</span>
                {r.sub && <span className="mt-1 block text-caption text-[#9b958b]">{r.sub}</span>}
              </td>
              {r.cells.map((c, ci) => (
                <td
                  key={ci}
                  className="py-3 pl-3 text-right text-small font-medium tabular-nums whitespace-nowrap"
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
      <div className="flex items-center gap-3 rounded-[12px] px-4 py-3" style={{ backgroundColor: mix(accent, 0.08) }}>
        <span className="font-display text-small font-bold tabular-nums" style={{ color: accent }}>
          1
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-small font-medium text-[#1c1a16]">{leader.label}</span>
          {leader.sub && <span className="mt-1 block truncate text-caption text-[#6d6860]">{leader.sub}</span>}
        </span>
        <Figure value={leader.value} size={24} />
      </div>
      <ol className="mt-1 divide-y divide-[#f0efec]">
        {rest.map((it, i) => (
          <li key={it.label} className="flex items-center gap-3 px-4 py-3">
            <span className="text-caption tabular-nums text-[#9b958b]">{i + 2}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small text-[#1c1a16]">{it.label}</span>
              {it.sub && <span className="mt-1 block truncate text-caption text-[#9b958b]">{it.sub}</span>}
            </span>
            <span className="shrink-0 text-small font-medium tabular-nums text-[#3d3a34]">{it.value}</span>
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
    <div className="flex items-center gap-4 rounded-[12px] px-4 py-4" style={{ backgroundColor: mix(accent, 0.07) }}>
      <span className="min-w-0 flex-1">
        <span
          className="block text-overline font-medium uppercase"
          style={{ color: tone && tone !== 'neutral' ? TONE[tone] : accent }}
        >
          {label}
        </span>
        <span className="mt-1 block text-small text-[#1c1a16]">{title}</span>
        {sub && <span className="mt-1 block text-caption text-[#6d6860]">{sub}</span>}
      </span>
      <span className="shrink-0 whitespace-nowrap">
        <Figure value={value} unit={unit} size={24} color={tone && tone !== 'neutral' ? TONE[tone] : VALUE} />
      </span>
    </div>
  )
}

/** Two quantities and the relation between them. */
/**
 * A BALANCE, A CHANGE, AND A BALANCE — read as a statement, top to bottom.
 *
 * This was two figures side by side with the change wedged between them, and the
 * arrangement fought what the card exists to say. Opening and closing are almost always
 * within a fraction of a per cent of each other — 215,723 against 214,554 — so the two
 * largest, most similar numbers on the card took both ends of the row, and the ONE
 * figure a reader came for, the change, was the smallest thing in it and sat in the
 * middle where nothing else is read. Two near-identical big numbers also invite the
 * worst possible misreading: that they are two different measures rather than the same
 * measure at two moments.
 *
 * Stacked, each line is labelled and the reader never has to infer which end is which.
 * The change is a row of its own, in its own tone, between the two balances it explains
 * — which is the order the arithmetic actually happens in. It is slower to scan than a
 * side-by-side pair, and that is the correct trade for a figure that is currently
 * misread: three labelled rows cannot be read as anything but what they are.
 */
export function Pair({
  a,
  b,
  relation,
  relationLabel = 'Change',
  tone,
}: {
  a: { value: string; label: string }
  b: { value: string; label: string }
  /** A delta token — "net −3" — not a phrase. */
  relation?: string
  /** What the middle row is called. "Change" unless the card means something narrower. */
  relationLabel?: string
  tone?: Tone
}) {
  const ink = tone && tone !== 'neutral' ? TONE[tone] : VALUE
  /* One row, so the three cannot drift apart in padding, alignment or type. The label
     wraps and the figure never does — a date qualifier is allowed two lines in a narrow
     card, a six-digit balance broken across two is unreadable. */
  const row = (label: string, value: string, color: string, emphasis = false) => (
    <div className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`min-w-0 text-small ${emphasis ? 'font-medium text-[#1c1a16]' : 'text-[#3d3a34]'}`}>
        {label}
      </span>
      <span className="shrink-0">
        <Figure value={value} size={24} color={color} />
      </span>
    </div>
  )
  return (
    <div className="divide-y divide-[#f0efec]">
      {row(a.label, a.value, VALUE)}
      {relation && row(relationLabel, relation, ink, true)}
      {row(b.label, b.value, VALUE)}
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
          <Figure value={value} unit={unit} size={40} />
        </div>
      </div>
      <p className="mt-1 text-center text-small text-[#3d3a34]">{label}</p>
      {benchmarkLabel && <p className="mt-1 text-center text-caption text-[#9b958b]">{benchmarkLabel}</p>}
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
          <span key={i} className="pb-1 text-center text-tick text-[#9b958b]">
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
                className="text-tick tabular-nums"
                style={{ color: m ? (m.count / max > 0.55 ? '#ffffff' : INK) : FAINT }}
              >
                {d}
              </span>
              {m && (
                <span
                  className="font-display text-caption font-bold tabular-nums"
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
              <span className="w-[22px] shrink-0 text-caption font-medium tabular-nums text-[#1c1a16]">{m.day}</span>
              <span className="min-w-0 flex-1 truncate text-small text-[#3d3a34]">{m.note}</span>
              <span
                className="shrink-0 text-small font-medium tabular-nums"
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
            <p className="truncate text-overline font-medium uppercase" style={{ color: c }}>
              {it.tag}
            </p>
            <div className="mt-1">
              <Figure value={it.value} unit={it.unit} size={24} color={it.tone && it.tone !== 'neutral' ? c : VALUE} />
            </div>
            <p className="mt-1 text-caption text-[#6d6860]">{it.label}</p>
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
          <span className="w-[44px] shrink-0 pt-[1px] text-right text-caption tabular-nums text-[#9b958b]">
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
              <span className="block text-small text-[#1c1a16]">{it.label}</span>
              {it.sub && <span className="mt-1 block text-caption text-[#9b958b]">{it.sub}</span>}
            </span>
            {it.value && (
              <span
                className="shrink-0 text-small font-medium tabular-nums"
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
      className="card-press inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-[5px] text-caption font-medium whitespace-nowrap"
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
        <Figure value={`${Math.round(p)}`} unit="%" size={32} color={c} />
        <p className="mt-1 text-small text-[#1c1a16]">{label}</p>
        {note && <p className="mt-1 text-caption text-[#9b958b]">{note}</p>}
        {href && (
          <div className="mt-3">
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
          <Figure value={value} size={20} />
          <span className="mx-auto mt-1 block h-px w-[42px]" style={{ backgroundColor: HAIR }} aria-hidden />
          <span className="mt-1 block text-caption tabular-nums text-[#6d6860]">{of}</span>
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
            <span className="text-caption text-[#9b958b]">{label}</span>
            <Figure value={compact(total)} size={28} />
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
              <span className="min-w-0 flex-1 truncate text-caption text-[#3d3a34]">{it.label}</span>
              <span className="shrink-0 text-caption font-medium tabular-nums text-[#1c1a16]">
                {compact(it.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {unit && (
        <p className="mt-4 text-caption text-[#9b958b]">
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
              className="absolute right-0 -translate-y-1/2 text-tick tabular-nums text-[#9b958b]"
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
            {/* THE SAME DEFECT `Spark` HAD, and it reached further: `Trend` is the chart in
                every measure sheet and half the module pages. `stroke-dasharray` resolves in
                DEVICE space under `vector-effect: non-scaling-stroke`, so `pathLength={1}`
                never normalised it and the browser drew a one-pixel dash beside a one-pixel
                gap — a stippled line, permanently, on every one of them. The stroke must stay
                non-scaling because the viewBox is stretched, so the reveal is a fade. */}
            <path
              d={line}
              fill="none"
              stroke={c}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className={animate ? 'animate-veil' : undefined}
              style={animate ? { animationDelay: '120ms' } : undefined}
            />
          </svg>
          <div className="mt-2 flex">
            {labels.map((l, i) => (
              <span
                key={`${l}-${i}`}
                className={`flex-1 text-tick text-[#9b958b] ${
                  i === 0 ? 'text-left' : i === labels.length - 1 ? 'text-right' : 'text-center'
                }`}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
      {unit && <p className="mt-3 text-caption text-[#9b958b]">{unit}</p>}
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
      className="inline-grid size-[19px] place-items-center rounded-[5px] text-tick font-medium"
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
          <div className="mb-3 flex items-center gap-2">
            <span
              className="grid size-[22px] shrink-0 place-items-center rounded-full"
              style={{ backgroundColor: mix(accent, 0.13) }}
              aria-hidden
            >
              <span className="size-[7px] rounded-full" style={{ backgroundColor: accent }} />
            </span>
            <span className="min-w-0 truncate text-small font-medium text-[#1c1a16]">{g.group}</span>
            <span className="shrink-0 text-caption text-[#9b958b]">· {g.count}</span>
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
                      className={`px-3 py-2 text-overline font-medium text-white/85 uppercase ${
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
                    <td className="px-3 py-3 align-top">
                      {r.id && (
                        <span className="block text-caption font-semibold text-[#1c1a16]">{r.id}</span>
                      )}
                      <span
                        className={`block text-caption text-[#3d3a34] ${r.id ? 'mt-1' : ''}`}
                      >
                        {r.name}
                      </span>
                    </td>
                    {r.sex && (
                      <td className="px-0 py-3 text-center align-top">
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
                        className={`px-3 py-3 align-top text-caption break-words whitespace-pre-line text-[#6d6860] ${
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
export function Sites({
  slug,
  dense = false,
  onOpenSite,
}: {
  slug: string
  dense?: boolean
  /**
   * Tap a site row to drill into it — the module page's way into the bottom sheet.
   *
   * Optional, and absent the rows stay exactly what they were: a read-only split. Pages whose
   * metric has no site→species→animal model behind it must not offer a door that opens on
   * nothing, so the drill is wired per page rather than assumed here.
   */
  onOpenSite?: (key: string, name: string) => void
}) {
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
          <Figure value={overall} unit={rate ? '%' : cut.unit} size={32} />
          <p className="mt-1 text-small text-[#3d3a34]">
            Overall · {period.label.toLowerCase()}
          </p>
        </span>
        <span className="shrink-0 pb-1 text-caption whitespace-nowrap text-[#9b958b]">{note}</span>
      </div>
      <label className="mt-4 flex items-center gap-2 rounded-full bg-[#f7f6f3] px-3 py-2">
        <Search size={14} strokeWidth={2} className="shrink-0 text-[#9b958b]" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a site"
          aria-label="Find a site"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-small text-[#1c1a16] outline-none placeholder:text-[#9b958b]"
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
        <p className="mt-4 border-t border-[#f0efec] pt-4 text-caption text-[#9b958b]">
          No site matches “{query.trim()}”.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3 border-t border-[#f0efec] pt-4 empty:mt-0 empty:border-0 empty:pt-0">
        {rows.map((r) => {
          /* A quiet site drills to an empty list, so it is not a door. */
          const tap = onOpenSite && r.value > 0 ? () => onOpenSite(r.site.key, r.site.name) : undefined
          /* Spans, not divs — the row is wrapped in a button when it drills, and a button may
             only carry phrasing content. The marks and the measurements are unchanged. */
          const row = (
            /* A RATE KEEPS ITS BAR; A COUNT NOW CARRIES NO MARK AT ALL. Coverage is measured
               against 100% and a track that fills is the fact — how far along, at a glance. A
               count has no ceiling, so a bar could only be scaled to the widest row, which draws
               the ranking the rows are already in; the three-pixel rail that used to say it
               instead is gone from the whole product, so the row order says it alone. */
            <span className={rate ? 'block' : 'flex items-stretch gap-3'}>
              <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-small text-[#1c1a16]">{r.site.name}</span>
                  {!dense && (
                    <span className="shrink-0 text-caption tabular-nums text-[#9b958b]">
                      {r.site.code} · {r.site.enclosures}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
                  {rate ? `${Math.round(r.percent)}%` : fmt(r.value)}
                  {rate && r.of && (
                    <span className="ml-1 text-caption font-normal text-[#9b958b]">
                      {fmt(r.value)}/{fmt(r.of)}
                    </span>
                  )}
                  {!rate && r.value > 0 && (
                    <span className="ml-1 text-caption font-normal text-[#9b958b]">
                      {Math.round(r.percent)}%
                    </span>
                  )}
                </span>
              </span>
              {rate && (
                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${clamp(r.percent)}%`,
                      /* Shade comes from the site's rank in the FULL list, not its position in
                         the filtered one — searching for "reptile" should not repaint that row
                         the darkest step just because it is now first. */
                      backgroundColor: mix(accent, step(cut.rows.indexOf(r))),
                    }}
                  />
                </span>
              )}
              </span>
            </span>
          )

          return (
            <li key={r.site.key}>
              {tap ? (
                /* The negative margin pair keeps the press target's padding from moving the
                   row: the list's own 12px rhythm is unchanged, tappable or not. */
                <button
                  type="button"
                  onClick={tap}
                  className="card-press -mx-2 -my-1 block w-full rounded-[10px] px-2 py-1 text-left"
                >
                  {row}
                </button>
              ) : (
                row
              )}
            </li>
          )
        })}
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
            <div className="mb-3 flex items-baseline gap-3">
              <span className="text-overline font-medium whitespace-nowrap text-[#9b958b] uppercase">
                {tier.label}
              </span>
              <span className="h-px flex-1" style={{ backgroundColor: HAIR }} />
              <span
                className={`shrink-0 font-display tabular-nums ${lead ? 'text-body font-bold' : 'text-small font-medium'}`}
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
                    className={`flex w-full items-center gap-3 py-[5px] text-left ${
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
                      className="grid size-[22px] shrink-0 place-items-center rounded-full rounded-tr-[3px] font-display text-tick font-bold"
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
                      className={`min-w-0 flex-1 truncate ${lead ? 'text-small text-[#1c1a16]' : 'text-small text-[#3d3a34]'}`}
                    >
                      {c.name}
                    </span>
                    <span
                      className={`shrink-0 font-display tabular-nums ${lead ? 'text-body font-bold' : 'text-small font-medium'}`}
                      style={{ color: n === 0 ? FAINT : VALUE }}
                    >
                      {fmt(n)}
                    </span>
                    {/* Reserved on every row, linked or not, so ten figures stay in one
                        column rather than stepping in and out by 9px down the card. */}
                    <span
                      className="w-[9px] shrink-0 text-caption"
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
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hidden">
        {options.map((o) => {
          const on = o === active
          const n = tally(o === options[0] ? items : items.filter((it) => match(it, o)))
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(o)}
              className={`card-press shrink-0 rounded-full px-3 py-1 text-caption font-medium whitespace-nowrap transition-colors ${
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
      {/* Keyed on the chip so the rows under it acknowledge the tap. Without this the
          list simply IS different on the next frame, and on a filter that removes two
          rows out of nine there is nothing on screen to say the tap registered.
          `refresh` is a 200ms lift from part-opacity — the standard tier, no movement,
          because nothing has moved: it is the same list, narrowed. */}
      <div key={active} className="animate-refresh">
        {visible.length > 0 ? (
          children(visible, active)
        ) : (
          <p className="py-3 text-caption text-[#9b958b]">Nothing under {active} in this window.</p>
        )}
      </div>
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
 * IT TAKES NO PROPS, AND THAT IS THE POINT. Every page used to stamp itself from
 * `exec/report.ts`, a hand-typed `{ period: 'July 2025', asOf: '01 Aug 2025',
 * source: 'Jamnagar Zoo · 6 sites' }`. When the product moved onto the database the
 * clock went to 20 May 2026 and the estate to 50 anonymised sites, and fourteen
 * pages went on citing a month and a zoo that the loaded extract does not contain —
 * real figures under a false date, which is worse than either alone.
 *
 * A page cannot get the DATE wrong any more because a page no longer supplies it. The
 * as-of comes from the world clock `core/checks.ts` asserts against the extract's
 * own horizon, and the estate line is counted from the loaded sites. Re-run the ETL
 * over a newer dump and every page's footer moves with it.
 *
 * `source` replaces the estate line only — the records table uses it to say which slice
 * of the extract it drew, which is a fact about the table rather than about the clock.
 * There is deliberately no way to override the date.
 */
export function Stamp({ source }: { source?: string }) {
  const { period } = usePeriod()
  return (
    <p className="px-1 pt-1 pb-2 text-center text-caption text-[#9b958b]">
      {period.key === 'month' ? `As of ${longDate(TODAY)}` : period.window}
      {` · ${source ?? `${SITES.length} sites`}`}
    </p>
  )
}
