/**
 * THE SPECIES HEADER — identity and holding as ONE composition, on one emerald surface.
 *
 * WHAT THIS SETTLED FROM. Five structural studies (editorial, split, compact command,
 * floating metrics, twelve-column) picked the unified floating-metrics shape; five COLOUR
 * studies on that shape (sage → meadow → emerald → forest → pine, in `_planning/
 * species-header.html`) picked Emerald — the first light-on-dark step of the ramp. So this
 * is the one deliberately dark surface a content page carries: a deep emerald ramp with
 * mint-white type, and every other page in the product stays dark-ink-on-white.
 *
 * NO BLACK AND NO OUTLINES, BY DIRECTION. Every ink on this surface is in the green family —
 * mint-white primary, soft sage secondaries — and nothing here draws a border: the card has
 * no stroke (the shadow alone lifts it), the back button is a soft translucent square, the
 * pills are translucent white. The one saturated mark is the IUCN dot, which carries the Red
 * List category's own published fill — the sanctioned exception, because a curator reads
 * that colour on signage and in every conservation report.
 *
 * THE FILTERS ARE GONE FROM THE HEADER, BY DIRECTION. The date and site pills (`ScopeStrip`)
 * used to sit in the header's top-right; the brief removed them outright and replaced them
 * with nothing. The figures below are still cut to the live scope — the header states the
 * holding, it just no longer carries the controls.
 *
 * EVERY FIGURE IS FILTERED, NOT LISTED — unchanged from every version of this header. The
 * ratio is dropped where either sex is zero, enclosures where none are counted, 'Sites' goes
 * singular under a site filter, and the standing renders only where a listing exists,
 * because absence is not an assessment.
 */

import { ArrowLeft, Boxes, Layers, MapPin, PawPrint, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { RED_LIST, fmt } from '../exec/system'
import type { SpeciesWide } from './speciesWide'

/* ── the surface's own inks ──────────────────────────────────────────────── */

/** Mint-white primary — the title and every figure. */
const INK = '#eef8f1'
/** Soft sage — the class line and badge text. */
const SOFT = '#c8e2d1'
/** Muted sage — labels and sub-figures. */
const MUTE = '#b4d4c0'
/** The mint the active tab's icon already wears — the stat icons here. */
const MINT = '#8fd6ae'
/** Hairlines on the dark surface — the only separation the composition uses. */
const HAIR_ON_DARK = 'rgba(255,255,255,0.2)'
/** Translucent white for pills and the back button — surfaces without strokes. */
const GLASS = 'rgba(255,255,255,0.16)'
/**
 * The Emerald ramp — variation 3 of the colour studies. Deep enough that light type
 * carries the hierarchy, never so saturated it reads as a brand banner.
 */
const RAMP = 'linear-gradient(145deg, #3e7d5d 0%, #2f6449 52%, #245239 100%)'

/* ── the contract ────────────────────────────────────────────────────────── */

export interface SpeciesHeaderProps {
  /** Printed once, in the h1, and nowhere else. */
  name: string
  onBack?: () => void
  wide: SpeciesWide
  enclosures: number
  standing?: { iucn?: string | null; cites?: string | null }
  /** True when the site pill narrows the page — flips 'Sites' to 'Site'. */
  filtered: boolean
}

interface Stat {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
}

function statsOf(wide: SpeciesWide, enclosures: number, filtered: boolean): Stat[] {
  return [
    { icon: PawPrint, label: 'Animals', value: fmt(wide.total) },
    ...(wide.ratio !== undefined
      ? [{ icon: Layers, label: 'Sex ratio', value: `1 : ${wide.ratio.toFixed(1)}` }]
      : []),
    { icon: MapPin, label: filtered ? 'Site' : 'Sites', value: String(wide.sites.length) },
    ...(enclosures > 0 ? [{ icon: Boxes, label: 'Enclosures', value: fmt(enclosures) }] : []),
    {
      icon: ShieldCheck,
      label: 'Sexed',
      value: `${Math.round(wide.sexedPct)}%`,
      sub: `${fmt(wide.male + wide.female)} of ${fmt(wide.total)}`,
    },
  ]
}

/* ── parts ───────────────────────────────────────────────────────────────── */

/**
 * A soft rounded square with an outlined arrow — no stroke, no fill heavier than glass.
 * The translucent white is what lets it read as a control on the emerald without adding
 * any weight to the composition.
 */
function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="grid size-9 shrink-0 place-items-center rounded-[10px] transition-colors hover:bg-white/30 active:bg-white/20"
      style={{ backgroundColor: GLASS }}
    >
      <ArrowLeft size={16} strokeWidth={1.75} style={{ color: SOFT }} aria-hidden />
    </button>
  )
}

/**
 * The published listings as glass pills. The IUCN pill carries the Red List category's own
 * published fill as a dot; the fill is a mark, never type — the words wear the soft sage
 * everything secondary here wears.
 */
function StandingPills({ standing }: { standing?: { iucn?: string | null; cites?: string | null } }) {
  if (!standing?.iucn && !standing?.cites) return null
  const rl = RED_LIST.find((r) => r.code === standing?.iucn)
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {standing.iucn && (
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-small font-medium"
          style={{ backgroundColor: GLASS, color: SOFT }}
        >
          {rl && <span className="size-[8px] shrink-0 rounded-full" style={{ backgroundColor: rl.fill }} aria-hidden />}
          IUCN · {standing.iucn}
        </span>
      )}
      {standing.cites && (
        <span
          className="rounded-full px-3 py-1 text-small font-medium"
          style={{ backgroundColor: GLASS, color: SOFT }}
        >
          CITES · Appendix {standing.cites}
        </span>
      )}
    </div>
  )
}

/**
 * A thin branch fragment with a handful of small leaves — the only decoration this surface
 * is allowed. Light ink at low opacity, pinned past a corner and clipped by the card;
 * hidden narrow, where the content reaches the corners it lives in.
 */
function Sprig({ className, opacity = 0.12, flip }: { className?: string; opacity?: number; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 220 140"
      width={220}
      height={140}
      className={`pointer-events-none select-none ${className ?? ''}`}
      style={{ opacity, transform: flip ? 'scaleX(-1)' : undefined, color: '#dff0e6' }}
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth={1.4} fill="none" strokeLinecap="round">
        <path d="M10 134 Q 86 100 204 16" />
        <path d="M92 82 q 24 -2 40 12" />
        <path d="M146 46 q 20 -14 40 -14" />
      </g>
      <g fill="currentColor">
        <path d="M58 112 q 0 -18 12 -26 q 4 16 -12 26 Z" />
        <path d="M96 86 q -2 -18 10 -27 q 5 16 -10 27 Z" />
        <path d="M132 60 q -2 -17 10 -25 q 4 15 -10 25 Z" />
        <path d="M124 92 q 16 -8 28 -2 q -12 12 -28 2 Z" />
        <path d="M168 40 q 14 -10 27 -7 q -9 13 -27 7 Z" />
        <path d="M176 26 q -1 -14 9 -21 q 3 13 -9 21 Z" />
      </g>
    </svg>
  )
}

/* ── the header ──────────────────────────────────────────────────────────── */

export function SpeciesHeader({ name, onBack, wide, enclosures, standing, filtered }: SpeciesHeaderProps) {
  const stats = statsOf(wide, enclosures, filtered)
  return (
    /* `content-box` so every `@[…]` below measures THIS header rather than an ancestor — the
       drift the old header hit once, with an `@[680px]` that matched at every width. */
    <div className="content-box w-full px-[var(--gutter)] pb-3">
      <section
        className="animate-hero-in relative overflow-hidden rounded-[var(--radius-card)] p-[var(--pad-card)]"
        /* No border — the direction removed outlines, and a dark card on the sage ground
           separates itself. The shadow is the house lift, a step stronger than the light
           version needed because the dark edge casts on a light ground. */
        style={{ background: RAMP, boxShadow: '0 3px 18px rgba(15,42,30,0.10)' }}
      >
        <Sprig className="absolute -top-4 -right-5 hidden @[680px]:block" opacity={0.14} />
        <Sprig className="absolute -bottom-7 -left-5 hidden @[680px]:block" opacity={0.1} flip />

        {/* Identity: back, the name once, the class under it, the standing opposite. */}
        <div className="relative flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="flex min-w-0 items-start gap-3">
            {onBack && (
              <span className="mt-[calc((var(--lh-name)-36px)/2)]">
                <BackButton onBack={onBack} />
              </span>
            )}
            <div className="min-w-0">
              <h1
                className="min-w-0 truncate text-[length:var(--fs-name)] leading-[var(--lh-name)] font-semibold tracking-[-0.4px]"
                style={{ color: INK }}
              >
                {name}
              </h1>
              <p className="mt-1 text-body" style={{ color: SOFT }}>
                {wide.cls}
              </p>
            </div>
          </div>
          <StandingPills standing={standing} />
        </div>

        {/* The figures, inside the same surface — a hairline above them and hairlines between
            them, nothing heavier. Five EQUAL columns once there is room for five, because equal
            visual weight is the brief; below that, two, without the vertical rules. */}
        <div className="relative mt-5 border-t pt-4" style={{ borderColor: HAIR_ON_DARK }}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 @[820px]:grid-cols-5 @[820px]:gap-x-0">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`min-w-0 ${i > 0 ? '@[820px]:border-l @[820px]:pl-6' : ''} @[820px]:pr-4`}
                style={{ borderColor: HAIR_ON_DARK }}
              >
                <p className="flex items-center gap-1.5 text-small" style={{ color: MUTE }}>
                  <s.icon size={13} strokeWidth={1.75} style={{ color: MINT }} aria-hidden />
                  {s.label}
                </p>
                <p className="mt-0.5 font-display text-[24px] leading-[1.15] font-semibold tabular-nums" style={{ color: INK }}>
                  {s.value}
                  {s.sub && (
                    <span className="ml-1.5 text-caption font-normal" style={{ color: MUTE }}>
                      {s.sub}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
