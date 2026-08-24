/**
 * V4 HOME — executive-first, four sections, nothing else.
 *
 * The screen answers three questions in the order they are asked, and every section
 * exists because one of them does:
 *
 *   How healthy is the zoo?    hero + Executive KPIs
 *   Are we improving?          Trends
 *   What is due soon?          Upcoming
 *   What could go wrong?       Risk Indicators
 *
 * WHAT WAS REMOVED, AND WHAT WENT WITH IT. Critical Alerts, Needs My Approval, Zoo Health and
 * Executive Health were taken off this page on request. Three of the four had no source in
 * `species_mgmt_anon` in any case — there is no alerts table, no approvals table and no
 * composite index — so they were the last authored sections on a screen otherwise reading from
 * the database.
 *
 * THE SPARKLINES WENT TOO. Every headline KPI carried a curve of its window and every trend
 * tile a mark chosen from what its figure was. Removed on the same call. What replaces the
 * comparison they were making is the Trends section's own period switch: the reader picks the
 * span and each figure re-reads at it, with a delta against the preceding span of equal
 * length. `SparkMeter` survives on the rate tiles, because a percentage drawn as nothing makes
 * 92% and 86% look identical until both are read.
 *
 * WHAT IS GONE FROM V3 IS THE POINT. The old home was the board report's contents
 * page as cards — population, life events, veterinary, preventive care, movement,
 * trends — twenty tiles, each a door to a module. It read beautifully and answered
 * none of the five questions in ten seconds, because "45 births" tells a chairman
 * nothing about whether to worry. The modules are all still here, reached from the
 * sidebar and from the bottom of every sheet; they are simply no longer what the
 * home screen IS.
 *
 * The design language is untouched: same sage ground, same white cards, same DM Sans
 * and rounded numerals, same accent, same 12px rhythm, same reveal-on-scroll. Every
 * mark on this page comes from `exec/system.tsx`.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BadgeCheck,
  Bell,
  Boxes,
  ChevronRight,
  Eye,
  FileBarChart,
  ListChecks,
  PawPrint,
  PlusCircle,
  Search,
  Stethoscope,
  Wheat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { greetingFor, useNow } from '../hooks/useNow'
import { ModuleSearch } from './search'
import { HeadlineStrip, HomeDashboard } from './homeDash'
import zooScene from '../assets/zoo-scene.webp'
import { useCountUp } from '../hooks/useCountUp'
import { Reveal } from '../motion'
import {
  ACCENT,
  ACCENT_INK,
  AccentProvider,
  FAINT,
  Figure,
  HERO_INK,
  MD3,
  MUTED,
  SparkMeter,
  TONE,
  mix,
} from '../exec/system'
import { AreaTrend } from '../exec/marks'
import { compareOf, pointsOf } from './plot'
import { LastUpdated } from './ScopeHeader'
import {
  SECTION_ICONS,
  headlineKpis,
  site,
  supportingKpis,
  trends,
  type HeadlineKpi,
  type Kpi,
} from './data'
import { useSheet } from './sheet'
import { FilterBar, ScopeNote } from './filters'
import { useScope } from './scope'
import { useKpi, useTrendCard } from './kpi'
import { resolveWindow, type Win, type WindowKey } from '../core/calendar'
import { figure as figureOf, population } from '../core/query'
import { CollectionWatch } from './collectionWatch'
import { TrendPanel } from './panels'

const CARD = 'rounded-[var(--radius-card)] bg-white'
const TAP = 'card-press block w-full text-left'

/*
 * The home hero was a clipped three-stop gradient from #20291f through #0a4d3c to #034739. It read
 * well on its own and made the largest figure in the product the one that matched nothing else:
 * every other hero on every other page was `Figure`'s default warm near-black. One hero ink now
 * covers all of them — see `HERO_INK` in `exec/system.tsx`. `#08100C` is close to the gradient's
 * own dark end, so the hero keeps its weight and loses the special case.
 */

/* ── the banner ──────────────────────────────────────────────────────────── */

function GreetingHeader({ onSearch }: { onSearch: () => void }) {
  const now = useNow(30_000)
  return (
    /* THE ORG-AND-ROLE LINE IS GONE, and the mist wash with it. The design's greeting is two
       lines — the salutation and the name — over open sky, and the third line was restating
       what the sidebar's own header says two inches to the left. The wash existed to lift that
       type off a busy illustration; over the artwork's sky there is nothing to lift it from. */
    <header className="relative px-[var(--gutter)] pt-[3.6cqw] pb-0">
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lead text-[#3d3a34] @[900px]:text-h3">{greetingFor(now)},</p>
          <h1 className="mt-0.5 text-[length:var(--fs-name)] leading-[var(--lh-name)] font-bold tracking-[-0.4px] text-[#1c1a16]">
            {site.userName} <span aria-hidden>👋</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={onSearch}
          aria-label="Search modules"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[#fbfaf7] transition-colors active:bg-[#f2f1ed]"
        >
          <Search size={18} strokeWidth={1.75} className="text-[#1c1a16]" aria-hidden />
        </button>
      </div>
    </header>
  )
}

/**
 * The reporting window, pinned. Unchanged from V3 in behaviour and reasoning — the
 * control that decides what every figure below means must not scroll away from them.
 */
function StickyPeriod() {
  const sentinel = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinel} className="h-px" aria-hidden />
      {/* HIDDEN UNTIL IT IS STUCK, which is the one place this screen departs from the design in
          order to keep something the design left out. The frame carries no window or site
          control over the hero — nothing sits under the greeting — but every figure on the page
          is read at a window, and a page with no way to change it is a page stuck on This
          month. So the control keeps its sticky behaviour and loses its resting state: at the
          top the hero is the design's, and the moment the reader scrolls the bar arrives with
          the pills in it. `pointer-events-none` while hidden so an invisible control cannot be
          clicked, and `h-0` so it takes no space out of the hero's composition. */}
      <div
        className={`sticky top-0 z-30 pt-[max(12px,env(safe-area-inset-top))] transition-opacity duration-200 ${
          stuck ? 'opacity-100' : 'pointer-events-none h-0 overflow-hidden opacity-0'
        }`}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 backdrop-blur-md transition-opacity duration-300 ${
            stuck ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(180deg, rgba(213,232,221,0.94) 0%, rgba(190,216,203,0.90) 100%)',
            boxShadow: '0 1px 0 rgba(22,21,15,0.08)',
          }}
        />
        {/* Two pills now, not nine chips — so the row no longer needs a width cap
            to keep the last option reachable. It stays centred at the same 560 so the
            control sits over the hero rather than hard against the gutter. */}
        <div className="relative mx-auto w-full max-w-[560px]">
          <FilterBar tone="home" />
        </div>
      </div>
    </>
  )
}

/**
 * THE ARTWORK, WHOLE AND AT FULL COLOUR — one band behind the whole hero.
 *
 * WHAT THIS REPLACES, AND WHY IT LOOKED WASHED OUT. The hero used to be three pieces: a
 * `HeroFoliage` strip pinned to y=0 carrying the vines, a `ForestBand` showing only the
 * artwork's bottom third, and a `MIST` gradient laid over the lower half of it. Each was a
 * reasonable fix for the previous one, and together they left about a fifth of the picture
 * visible under a wash — which is why the screen read as pale sage where the design reads as a
 * colour illustration.
 *
 * The design's own hero is a single 1440×539 rounded rectangle filled with the whole scene, so
 * that is what this is. The vines bleed off the top because the artwork draws them that way and
 * the band's top edge is the page's top edge; the elephants and the pond sit at the foot
 * because that is where the artwork puts them. Nothing is masked and nothing is over-painted.
 *
 * `49.4cqw` IS THE DESIGN'S OWN RATIO, measured against the right thing. The band is 539 tall
 * in the design's frame, but `cqw` resolves against the CONTAINER — which here is the content
 * column, 1092 wide in that same frame, not the 1440 window. 539/1440 gave a band 130px short
 * and the strip cut the hero's figure in half; 539/1092 is the ratio that reproduces it. `object-cover` with the
 * focus below centre keeps the animals in frame as the column narrows; the sky is what gets
 * cropped, which is what it is there for.
 *
 * THE FADE AT THE FOOT IS FOUR PER CENT OF THE BAND and it is not a wash. The strip card
 * overlaps the artwork by design, and without a short ramp the picture's last row meets the
 * page's ground colour as a visible horizontal seam either side of that card.
 */
function ZooBand() {
  return (
    /* `inset-0`, NOT A HEIGHT. This is the fix for the artwork bleeding past the strip.
       It used to be `h-[49.4cqw]` — the design's 539-over-1092 — which is only the right
       height when the hero's content happens to add up to exactly that. It did not: the strip
       is a couple of pixels taller than the frame's 112, the greeting reflows, and the type
       scale steps at three breakpoints. So the band's foot drifted below the strip and, being
       full-bleed, showed up as artwork in the page gutter BESIDE the row underneath — which is
       what the mismatch was.
       Filling the banner instead makes the geometry self-correcting: the banner's own padding
       decides how much picture shows under the strip, and the picture can never end anywhere
       else. `object-cover` was always going to crop, so nothing about the artwork's framing
       depends on the box being a particular height. */
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-b-[26px]">
      <img
        src={zooScene}
        alt=""
        aria-hidden
        className="size-full object-cover select-none"
        style={{ objectPosition: '50% 64%' }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[16px]"
        style={{ background: 'linear-gradient(180deg, rgba(231,240,234,0) 0%, #e7f0ea 100%)' }}
      />
    </div>
  )
}

/**
 * The hero is the collection total — the anchor read from across a room.
 */
function HeroBlock() {
  const { scope } = useScope()
  const animals = headlineKpis[0]
  /* The hero scopes with everything else. It briefly did not, and the result was a screen
     headed 215,432 Total Animals above a KPI row reading 178K for Aquatic Halls — the single
     worst thing this app can do, which is state two different answers to one question on one
     screen. */
  const headcount = Math.round(figureOf(scope, 'animals').value)
  const total = useCountUp(headcount, { format: (v) => Math.round(v).toLocaleString('en-US') })

  return (
    <section className="px-[var(--gutter)] pt-[3.2cqw]" aria-label="Animal population">
      <a href={animals.href} className="card-press block w-full">
        {/* THE LABEL IS ABOVE THE FIGURE, which is the design's order and the better one: the
            reader is told what the number counts before reading it, rather than being handed
            110,020 and having to look underneath to find out. */}
        <p className="text-center text-body text-[#1c1a16] @[900px]:text-lead">
          {scope.site ? `Animal Population · ${scope.site.name}` : 'Animal Population'}
        </p>
        {/* GRADIENT GREEN, NOT HERO INK. Sampled off the design: the glyphs run from about
            #37bd69 at the top to a deeper green at the foot, which is the brand's own primary
            graded down rather than a new colour. `background-clip` is how a gradient fills type;
            the solid `color` under it is what a browser without the clip still renders. */}
        <p
          className="mt-2 text-center font-display text-[length:var(--fs-hero)] leading-[var(--lh-hero)] font-bold tracking-[-1.5px]"
          style={{
            color: MD3.primary,
            backgroundImage: `linear-gradient(180deg, ${MD3.primary} 0%, #1e7a44 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {total}
        </p>
        {/* ONE PILL, AND IT SAYS ONE THING. The movement figure that used to share this row is
            gone — the design carries only the affordance, and the window's gain is stated by the
            Natality and Mortality cells in the strip immediately below, which is where a reader
            goes to ask why the number moved. */}
        <span className="mt-3 flex justify-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-[6px] text-caption font-semibold shadow-[0_1px_2px_rgba(15,42,30,0.06)]"
            style={{ color: '#006d35' }}
          >
            <Eye size={12} strokeWidth={2.25} aria-hidden />
            View breakdown
          </span>
        </span>
      </a>
    </section>
  )
}

/**
 * SPECIES COUNT — the hero says how many animals, this says how many KINDS of them.
 *
 * Kept for `HomeSections`, which is no longer the screen but is still exported. See the note on
 * `HomeView`.
 */
function SpeciesCount() {
  const { scope, href } = useScope()
  const held = useMemo(() => new Set(population(scope).map((r) => r.species.name)).size, [scope])

  return (
    <a href={href('browse/species')} className={`${TAP} ${CARD} flex items-center gap-4 p-[var(--pad-card-sm)]`}>
      <span
        className="grid size-9 shrink-0 place-items-center rounded-[11px]"
        style={{ backgroundColor: mix(ACCENT, 0.1) }}
        aria-hidden
      >
        <PawPrint size={18} strokeWidth={1.75} style={{ color: ACCENT }} />
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <Figure value={held.toLocaleString('en-US')} size={28} color={HERO_INK} />
        <span className="min-w-0 truncate text-body text-[#1c1a16]">
          {scope.site ? `Species · ${scope.site.name}` : 'Species held'}
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
    </a>
  )
}

export function HomeBanner({ onSearch }: { onSearch: () => void }) {
  return (
    /**
     * THE HERO IS ONE COMPOSITION: artwork, greeting, figure, strip.
     *
     * The frame groups them that way and the geometry only works that way. The strip used to
     * live in the dashboard body and reach back up into the artwork with a negative margin,
     * which meant two elements were each guessing where the other ended — and the artwork won,
     * finishing 60px below the strip and spilling into the gutter beside the next row.
     *
     * Owned here, the arithmetic is one number. `pb` is HOW MUCH PICTURE SHOWS UNDER THE STRIP:
     * the frame leaves 23px of it against a 1092 column, which is 2.1%. Everything else — where
     * the strip sits, how tall the band is — follows from the content, and the band fills
     * whatever this box turns out to be.
     */
    <div className="relative isolate pb-[2.1cqw]">
      <ZooBand />
      <GreetingHeader onSearch={onSearch} />
      <StickyPeriod />
      <HeroBlock />
      {/* 71px between the hero's pill and the strip in the frame — 6.5% of the column. */}
      <div className="px-[var(--gutter)] pt-[6.5cqw]">
        <HeadlineStrip />
      </div>
    </div>
  )
}

/**
 * Delta colour, by whether the movement is GOOD NEWS rather than by its sign.
 *
 * A rising death count is red and a falling one green, which is the opposite of what colouring
 * by sign gives. `useKpi` decides which from the metric; this only maps the verdict to ink.
 */
const MOOD = { good: '#1e7a44', bad: TONE.bad, flat: FAINT } as const

/**
 * Whether a delta is worth printing on a card.
 *
 * `phrase` in `kpi.ts` renders a sub-half-point change as the word "flat", which is honest and,
 * on a card, is a line of grey text that says nothing happened. Under a short window — Today,
 * Yesterday — that is nearly every card at once, so the whole grid grows a column of "flat".
 * The absence of movement is better said by the absence of a chip. The word survives where it
 * reads as a sentence rather than a chip — the trend panel's "flat · 12 months".
 */
const hasMovement = (delta?: string) => !!delta && delta !== 'flat'

/* ── section chrome ──────────────────────────────────────────────────────── */

/**
 * One header for all seven sections.
 *
 * A rule with a word in it, as V3 used for its Operations group — the seven sections
 * need to be separable at a glance while the cards inside them stay the loudest thing
 * on screen. The count on the right is the section's own summary, so a reader can
 * skip a whole section without opening anything in it.
 */
function SectionHead({
  icon: Glyph,
  title,
  aside,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: object }>
  title: string
  /* A NODE, NOT A STRING. It carries a count on most sections and a control on Trends, and a
     second head component for the one case would be two things to keep in step. */
  aside?: ReactNode
  tone?: 'good' | 'warn' | 'bad'
}) {
  return (
    /* `flex-wrap`, AND THE ONE ASIDE THAT NEEDS IT IS TRENDS.
       The Trends head carries four span pills — Today / Week / 6 months / Year — which measure
       258px together and are all `shrink-0`, because a pill that squeezes is a pill whose label
       truncates. Against a 360px screen that is 3px wider than the viewport, and a page whose
       body scrolls sideways is the one thing every layout in this product is written to prevent.
       Wrapping puts the pills on their own line at that width and changes nothing at any other:
       every wider breakpoint has room for them beside the rule, and every other section's aside
       is a short count that never reaches the wrap. `gap-y-2` so the dropped line is not touching
       the title above it. */
    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 px-1 first:mt-0">
      <Glyph size={14} strokeWidth={2} style={{ color: MUTED }} aria-hidden />
      <h2 className="text-overline font-semibold text-[#3d3a34] uppercase">
        {title}
      </h2>
      <span className="h-px flex-1 bg-[#1c1a16]/8" aria-hidden />
      {aside && (
        <span
          className="shrink-0 text-caption font-medium tabular-nums"
          style={{ color: tone ? TONE[tone] : FAINT }}
        >
          {aside}
        </span>
      )}
    </div>
  )
}

/* ── 1 · executive KPIs ──────────────────────────────────────────────────── */

/**
 * A headline card — the Apple Health anatomy: what it is, what it reads, how it moved,
 * and the shape behind it.
 *
 * The graph is what separates these four from the six below. "45 births" cannot answer
 * "are we improving?"; forty-five against eleven previous months can, and it costs
 * 34px of card height to say it.
 */
/**
 * TAKES `Kpi`, NOT `HeadlineKpi`, AND THAT IS A DELIBERATE WIDENING.
 *
 * The Executive Overview is four cards and they do not all come from one array: three are
 * `headlineKpis` (Animal Population, Birth Analytics, Mortality & Necropsy) and the fourth is
 * Vaccination, which lives in `supportingKpis`. `HeadlineKpi extends Kpi` with a REQUIRED
 * `chart`, so a `Kpi` cannot be passed where a `HeadlineKpi` is expected — but this card no
 * longer reads `chart` or `series` at all. The curve came off it (see the note at the foot of
 * the card) and the two fields went unused with it.
 *
 * So the parameter widens to the supertype rather than Vaccination being given a `chart` it has
 * no use for. Adding a field to `data.ts` to satisfy a signature that ignores it would be the
 * data lying to the type system, and `data.ts` belongs to another session besides.
 */
function HeadlineCard({ kpi }: { kpi: Kpi }) {
  const colour = kpi.accent ?? (kpi.tone && kpi.tone !== 'good' ? TONE[kpi.tone] : ACCENT)

  /* Figure, note, movement and curve all from the one metric under the one scope — so the
     card cannot state a site's figure beside the collection's movement, which is exactly
     what it did when these came from four separate places. */
  const { value, unit, note, delta, mood, known, percent, target, inverse } = useKpi(kpi)

  if (!known) return <EmptyCard label={kpi.label} icon={kpi.icon} />

  return (
    /* A LINK TO THE MODULE, NOT A SHEET.
       This card used to open the Overall → Site → Species → Animal drill directly, which made a
       tile on the home the door to the deepest view in the product and left the module's own
       page — the page that carries the trend, the targets, the calendar and the records — as
       somewhere you could only reach from the sidebar. The card is the headline; the module page
       is the analysis; the sheet is what you open FROM that page to drill one figure. See
       `useSiteDrill` in `panels.tsx` for the other half of this change. */
    <a
      href={kpi.href}
      className={`${TAP} ${CARD} flex min-w-0 items-center gap-4 p-[var(--pad-card)] @[640px]:flex-col @[640px]:items-stretch @[640px]:gap-0`}
    >
      {/* The left block: what it is, what it reads, how it moved. Sits beside the curve on a
          phone and above it past 640px, which is the whole of the two layouts. */}
      <span className="flex min-w-0 flex-1 flex-col">
        {/* The label WRAPS rather than truncates. Four cards across a 716px content column
            leaves each about 113px of inner width, and "Animal Population" needs ~131px with
            its glyph — truncated to "Animal Popu…" it names nothing. */}
        <span className="flex items-center gap-2">
          {/* THE GLYPH STANDS ALONE. It used to sit on a tinted chip of the card's own hue,
              which did make the row scannable and did it by adding a filled tile to every
              card — ten small blocks of colour before a single figure. The hue was doing
              the work, not the tile: an 18px outline glyph in the same accent is as
              findable and leaves the card's only filled marks to the data.
              The 24px box stays so the label sits where it always has. */}
          <span className="grid size-6 shrink-0 place-items-center" aria-hidden>
            <kpi.icon size={18} strokeWidth={1.75} style={{ color: colour }} />
          </span>
          <span className="min-w-0 text-small font-medium text-balance text-[#1c1a16]">
            {kpi.label}
          </span>
        </span>
        {/* ONE BASELINE: the figure, the word that names it, and how it moved.
            These were three stacked lines — number, then a caption row under it — which put
            "−0.5%" a line away from the 215K it is a change in, and made a reader's eye travel
            down to find out whether a number they had just read was good news. On one baseline
            the three read as a sentence: what it is, what it reads, which way it is going.

            WRAPS RATHER THAN TRUNCATES. Past 640px these four cards turn back into a row of
            four, where a card is about 120px of inner width and "215K Animals −0.5%" is not
            going to fit on it. `flex-wrap` sends the note and the delta down together — the
            old two-line form, reached by not fitting rather than by a breakpoint — instead of
            truncating "Animals" to "Ani…". The pair is nested so they wrap as one unit; two
            bare items would leave the note stranded beside the figure with the delta below. */}
        <span className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* THE UNIT IS PASSED, and it has to be now that this card is no longer headline-only.
              This card was written for the four headline KPIs, none of which carries a unit — they
              are counts, and their labels name what they count. When Vaccination was pulled up from
              the supporting tiles into the overview it brought a `unit` of '%' that nothing here
              rendered, so a 9.0% coverage rate printed on the home screen as a bare "9.0". That is
              not a smaller version of the right answer, it is a different claim: read cold, 9.0 is
              nine of something. `OperationalStrip` below always drew the unit, which is why the
              figure was correct until the day it moved.
              `Figure` already takes `unit` and sets it at the right scale beside the numeral, so
              this is the whole fix — and it stays correct for any future tile promoted up here. */}
          <Figure value={value} unit={unit} size={32} color={HERO_INK} />
          {/* THE NOUN IS RENDERED ONLY IF THERE IS ONE. Three of the four headline KPIs
              now carry no note, because their label already names what they count — see
              the block above `headlineKpis` in `data.ts`. An always-rendered span would
              leave its `gap-2` behind as 8px of nothing between the figure and its delta,
              which reads as a missing word rather than as a word deliberately not there. */}
          {(note || hasMovement(delta)) && (
            <span className="flex min-w-0 items-baseline gap-2">
              {note && <span className="min-w-0 truncate text-caption text-[#736e67]">{note}</span>}
              {hasMovement(delta) && (
                <span className="shrink-0 text-caption font-semibold tabular-nums" style={{ color: MOOD[mood] }}>
                  {delta}
                </span>
              )}
            </span>
          )}
        </span>
      </span>

      {/* NO CURVE. These four carried a sparkline of the window, bucketed from the same daily
          series the figure sums — the thing that separated them from the six tiles below, on the
          argument that "45 births" cannot answer "are we improving?" and forty-five against
          eleven previous months can.

          Removed on request: the shape was not earning the height it cost. What answers the same
          question is still on the card — the delta beside the figure, which is a real comparison
          against the preceding window of equal length — and the Trends section below now carries
          its own period switch for the reader who wants the movement over a longer span.

          ONE EXCEPTION, AND IT IS NOT A CURVE. A RATE against a published target gets its meter.
          Vaccination reads 9.0% and its target is the only thing that says whether 9.0 is the
          story or the floor — "a percentage drawn as nothing makes 92% and 86% look identical
          until both are read", which is the note this file's header already makes about
          `SparkMeter` surviving. It is a 4px track, not a chart, so the brief's "do not overload
          these cards with charts" is intact while the "small supporting visual where useful"
          actually earns the word useful. Only Vaccination satisfies the condition today; the
          other three are counts and have no target to be read against. */}
      {percent !== undefined && (
        <span className="mt-3 block @[900px]:mt-4">
          <AccentProvider value={colour}>
            <SparkMeter percent={percent} target={target} inverse={inverse} />
          </AccentProvider>
        </span>
      )}
    </a>
  )
}

/**
 * A card whose metric has nothing to say for the current scope.
 *
 * Deliberately not a zero. "0 deaths in Carnivore Ridge" and "deaths are not modelled for
 * Carnivore Ridge" are different statements, and printing the first when the second is true
 * is the kind of confident wrong number that costs a director's trust in the whole screen.
 */
function EmptyCard({ label, icon: Glyph }: { label: string; icon: HeadlineKpi['icon'] }) {
  return (
    <div className={`${CARD} flex min-w-0 flex-col p-[var(--pad-card)]`}>
      <span className="flex items-start gap-1.5">
        <Glyph size={15} strokeWidth={1.75} className="mt-[2px] shrink-0" style={{ color: FAINT }} aria-hidden />
        <span className="min-w-0 text-small font-medium text-balance text-[#5c574f]">
          {label}
        </span>
      </span>
      <span className="mt-3 block font-display text-n-lg font-bold" style={{ color: '#c9c4bb' }}>
        —
      </span>
      <span className="mt-1 block text-caption text-[#736e67]">Not reported for this scope</span>
    </div>
  )
}

/**
 * THE EXECUTIVE OVERVIEW IS FOUR CARDS, AND WHICH FOUR IS THE WHOLE DECISION.
 *
 * It was `headlineKpis` verbatim — Animal Population, Health & Medical, Birth Analytics,
 * Mortality & Necropsy — plus a separate seven-tile grid underneath. Health & Medical comes off
 * on request, which leaves three; Vaccination moves up from the supporting set to take the fourth
 * slot, because the four that remain are the collection, what it gained, what it lost and what we
 * are protecting it with. That is a coherent executive read in a way "three headline metrics and
 * an orphan" is not.
 *
 * NOTHING IS DELETED FROM `data.ts` TO ACHIEVE THIS. Health & Medical is filtered OUT here and
 * Vaccination is pulled IN here, so the arrays stay exactly as they are — which matters because
 * `data.ts` is another session's file and because the Health & Medical card is still perfectly
 * good, just not on this screen. A `key` filter also cannot silently stop working the way a
 * positional slice would if the array is ever reordered.
 *
 * FOUR COLUMNS AT DESKTOP, TWO AT TABLET AND PHONE. Four across a phone is four unreadable
 * slivers; two rows of two keeps every figure at full size and is the brief's own tablet and
 * mobile spec.
 */
const DROPPED_FROM_OVERVIEW = 'treatment'
const OVERVIEW_EXTRA = 'vaccination'

function ExecutiveOverview() {
  const cards = useMemo(() => {
    const lead = headlineKpis.filter((k) => k.key !== DROPPED_FROM_OVERVIEW)
    const extra = supportingKpis.filter((k) => k.key === OVERVIEW_EXTRA)
    return [...lead, ...extra] as Kpi[]
  }, [])

  return (
    <div className="grid grid-cols-2 gap-[var(--gap)] @[900px]:grid-cols-4">
      {cards.map((k) => (
        <HeadlineCard key={k.key} kpi={k} />
      ))}
    </div>
  )
}

/**
 * OPERATIONAL STATUS — ONE STRIP, NOT SIX FLOATING CARDS.
 *
 * The six were a `grid-cols-6` of separate white tiles, which had two problems and the layout was
 * only the second of them. Five of the six have no source in the extract — Breeding Success,
 * Tasks, Welfare Audits, Health Score and Food Wastage are all listed in `core/metrics.ts`
 * `UNSOURCED` — so the row rendered as five identical "Not reported for this scope" cards with
 * Vaccination lit between them, and a seventh tile (Pharmacy) orphaned onto its own full-width
 * row because seven divides by nothing.
 *
 * As ONE surface divided by hairlines, the same six read as a control strip: a row of readings on
 * one instrument rather than six competing findings. The unavailable ones recede into it instead
 * of each claiming a card, which is the honest weighting — an absent metric should be visible and
 * quiet, not absent and loud.
 *
 * IT SCROLLS SIDEWAYS ONLY ON A PHONE, and the strip is the one place on this page where that is
 * the right answer rather than a failure. Six readings do not fit across 390px at a legible size,
 * and the alternative — a 3×2 grid — turns the instrument back into tiles. `snap-x` so a swipe
 * lands on a cell boundary; the divider stays off the first cell so there is no rule against the
 * card's own edge.
 */
function OperationalStrip() {
  const cells = useMemo(() => supportingKpis.filter((k) => k.key !== OVERVIEW_EXTRA), [])

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex snap-x snap-mandatory overflow-x-auto @[760px]:overflow-visible">
        {cells.map((k, i) => (
          <div
            key={k.key}
            className={`min-w-[46%] shrink-0 snap-start border-l @[520px]:min-w-[33%] @[760px]:min-w-0 @[760px]:flex-1 ${
              i === 0 ? 'border-l-0' : ''
            }`}
            style={{ borderColor: 'rgb(28 26 22 / 0.07)' }}
          >
            <StripCell kpi={k} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * One reading on the strip.
 *
 * A CELL, NOT A CARD — no surface of its own, no radius, no shadow. The hairline beside it is the
 * only thing separating it from its neighbour, which is what makes six of them read as one
 * instrument. Where the metric has no source the figure is an em dash in the disabled ink and the
 * label stays legible: the reader learns that the measure exists and that we cannot read it, which
 * are two different facts from "it is zero".
 */
function StripCell({ kpi }: { kpi: Kpi }) {
  const { value, unit, note, delta, mood, known } = useKpi(kpi)
  const colour = kpi.accent ?? ACCENT

  const body = (
    <>
      <span className="flex items-center gap-1.5">
        <kpi.icon
          size={14}
          strokeWidth={1.75}
          className="shrink-0"
          style={{ color: known ? colour : '#a9b3ad' }}
          aria-hidden
        />
        <span className="min-w-0 truncate text-caption font-medium" style={{ color: known ? '#3d3a34' : FAINT }}>
          {kpi.label}
        </span>
      </span>
      {known ? (
        <>
          <span className="mt-1.5 flex items-baseline gap-1">
            <Figure value={value} size={24} color={HERO_INK} />
            {unit && (
              <span className="text-caption" style={{ color: FAINT }}>
                {unit}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
            {note && <span className="truncate text-caption" style={{ color: FAINT }}>{note}</span>}
            {hasMovement(delta) && (
              <span className="shrink-0 text-caption font-semibold tabular-nums" style={{ color: MOOD[mood] }}>
                {delta}
              </span>
            )}
          </span>
        </>
      ) : (
        <>
          <span className="mt-1.5 block font-display text-[24px] leading-[1.1] font-bold" style={{ color: '#c9c4bb' }}>
            —
          </span>
          {/* THE SAME SENTENCE AS EVERY OTHER EMPTY READING ON THIS SCREEN.
              This said "Not reported" while `EmptyCard` above and the Trends tiles below both said
              "Not reported for this scope" — three sections, two wordings, one screen. The audit of
              17 Aug 2026 logged that class of drift as a finding in its own right, and the shorter
              form also loses the load-bearing half: "for this scope" is what tells a reader the
              figure might exist under a different site or window, rather than not existing at all.
              Kept on one line at this size — it is a caption, and it wraps. */}
          <span className="mt-0.5 block text-caption" style={{ color: '#a9b3ad' }}>
            Not reported for this scope
          </span>
        </>
      )}
    </>
  )

  const pad = 'flex h-full flex-col p-[var(--pad-card-sm)]'
  /* An unavailable reading is not a door. Linking it would send a reader to a page that cannot
     answer the question the tile just failed to answer. */
  return known && kpi.href ? (
    <a href={kpi.href} className={`card-press ${pad}`}>
      {body}
    </a>
  ) : (
    <div className={pad}>{body}</div>
  )
}

/* ── 2 · critical alerts ─────────────────────────────────────────────────── */

/* ── 3 · approvals ───────────────────────────────────────────────────────── */

/*
 * ── 4 · upcoming, and 6 · risk indicators ───────────────────────────────────
 *
 * BOTH SECTIONS ARE REMOVED, and the reason is the one the rest of this product already
 * enforces everywhere else: a figure with no source is absent, not authored.
 *
 * They were the last two fully invented sections on the screen. `upcoming` was nine groups of
 * hand-written due dates anchored to 07 Aug 2025; `risks` was eight hand-written exposures. The
 * audit of 17 Aug 2026 found the specific failure that made keeping them untenable — they name a
 * collection that does not exist in the data every other section reads. Asiatic Lion, Chital,
 * Blackbuck, Sangai Deer, Savanna, Carnivore Ridge, Aviary Complex: none of them are in
 * `species_mgmt_anon`. The register holds Umber Langur, Ochre Warbler, Amber Agama, Bramblewood
 * Nature Reserve, Pinecrest Wildlife Estate. So the two most operational sections on the home
 * screen — the two a director would actually act on — described a different zoo from the one the
 * KPIs above them were counting.
 *
 * ONE OF THEM ALSO CONTRADICTED A MODULE OUTRIGHT. "Inbreeding Risk · 14 pairings above 0.125
 * kinship" asserts pair-level kinship. `core/metrics.ts` records that the extract carries no
 * pairing outcome at all, and `speciesPairing.tsx` refuses the word for that reason — which is
 * why the species list's column reads *Pairable* rather than *Paired*. The home screen was
 * stating as fact the thing the module documents as unknowable.
 *
 * This follows the precedent that already took Critical Alerts, Needs My Approval, Zoo Health and
 * Executive Health off this screen: four authored sections removed on the same argument. The
 * `upcoming`, `risks`, `criticalAlerts` and `approvals` structures survive in `data.ts` and their
 * panels survive in `panels.tsx`, so nothing has to be rewritten if a real source ever lands —
 * but nothing renders them.
 *
 * WHAT TOOK THE SPACE is the Collection Watch section below: the same altitude of question — what
 * needs attention — answered from the register instead of from a keyboard.
 */

/* ── 7 · trends ──────────────────────────────────────────────────────────── */

/**
 * A TREND CARD DRAWS ITSELF FROM WHAT ITS FIGURE IS.
 *
 * All eight used to be the same tile with the same sparkline, which made the section a wall of
 * identical cards and — worse — drew four different kinds of number the same way. See
 * `TrendCard.shape` in `data.ts` for the reasoning; this is where it lands:
 *
 *   `area`    a level over time. Continuous, so a line is honest and the shape is the point.
 *   `columns` discrete monthly counts. A line between two months implies a value that isn't there.
 *   `meter`   a rate against a published target. The gap to target is the story, not the wiggle.
 *   `range`   a level read against its own floor and ceiling, where twelve marks say less than
 *             "64.2 in a band of 58–72" does.
 *
 * Each also carries its own hue, so the section can be navigated by colour before it is read.
 */
/**
 * The four spans the Trends section offers.
 *
 * Every one resolves through a window `core/calendar.ts` already defines, so a chip here and
 * the page's own date filter mean exactly the same span — the alternative was a second
 * definition of "6 months" that could drift from the first. `half` and `year` are trailing
 * calendar months rather than 182 and 365 days, for the same reason the global filter's are.
 */
const TREND_SPANS: { key: WindowKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Week' },
  { key: 'half', label: '6 months' },
  { key: 'year', label: 'Year' },
]

/**
 * Trends, with their own window.
 *
 * WHY THIS SECTION GETS A SWITCH AND THE REST OF THE PAGE DOES NOT. Everything above answers
 * "what is true now", and one date filter at the top governs all of it. This section answers
 * "are we improving", which is a question about a span — and the span a reader wants for it is
 * rarely the one they want for the figures above. Twelve sparklines used to carry that
 * comparison implicitly; with the marks gone it has to be explicit, and a switch is a better
 * answer than a curve because the delta beside each figure is a real like-for-like comparison
 * against the preceding span of equal length.
 *
 * IT SWITCHES WHEN, NOT WHERE. The site half of the scope stays global, so a reader who has
 * scoped to a site cannot be shown the collection's movement inside it.
 */
function TrendsSection() {
  const [span, setSpan] = useState<WindowKey>('year')
  const win = useMemo(() => resolveWindow(span), [span])
  /* `[0]` and the rest — see the note on the grid below for why the split is positional. */
  const primary = trends[0]
  const supporting = useMemo(() => trends.slice(1), [])

  return (
    <>
      <SectionHead
        icon={SECTION_ICONS.trends}
        title="Trends"
        aside={
          /* Same pill as the Upcoming horizon switch below — one control shape on this page,
             not two that do the same job. */
          <span className="flex gap-2">
            {TREND_SPANS.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={span === s.key}
                onClick={() => setSpan(s.key)}
                className={`pill ${
                  span === s.key ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </span>
        }
      />
      <Reveal>
        {/* PRIMARY, THEN SUPPORTING — and the split is by position in `trends`, not by name.
            `trends[0]` is Animal Population, the level the whole page opens on, so it gets the
            chart and the width; everything after it is a supporting reading in a compact grid
            beside it. A grid of eight identical chart cards states that all eight matter equally,
            which is the same flattening the KPI row had.

            IT TOLERATES ANY COUNT, deliberately. The supporting set may shrink from seven to three
            if the three authored trend tiles (Medicine Spend, Procurement Spend, Visitor Trend) are
            dropped from `data.ts` — that decision is live in another session. `auto-rows` plus a
            2/3-column grid means three, four or seven all fill without an orphan, and the primary
            panel does not move either way. Nothing here reads a fixed index beyond `[0]`. */}
        <div className="grid items-start gap-[var(--gap)] @[1000px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {primary && <PrimaryTrend card={primary} win={win} />}
          {supporting.length > 0 && (
            <div className="grid auto-rows-fr grid-cols-2 gap-[var(--gap)] @[560px]:grid-cols-3 @[1000px]:grid-cols-2 @[1240px]:grid-cols-3">
              {supporting.map((t) => (
                <TrendTile key={t.key} card={t} win={win} />
              ))}
            </div>
          )}
        </div>
      </Reveal>
    </>
  )
}

/**
 * THE ONE TREND THAT GETS A CURVE.
 *
 * `AreaTrend` over `pointsOf(metric, site, win)` — the same read `exec/pages/trends.tsx` makes for
 * its own series and the same one `TrendCard` sums for its figure, so the shape and the number
 * cannot disagree. No new query, no new endpoint, no smoothing: this is the existing daily series
 * bucketed to the span the reader picked with the chips above.
 *
 * WHY IT IS AN AREA AND NOT COLUMNS. `trends[0]` is a LEVEL — a headcount on a date — and a level
 * is continuous, so a line through it is honest and the shape is the point. The supporting tiles
 * keep drawing themselves from their own `shape` field, which is where the level-versus-flow
 * decision is already recorded for each of them.
 */
function PrimaryTrend({ card, win }: { card: (typeof trends)[number]; win: Win }) {
  const { scope } = useScope()
  const site = scope.site?.key ?? null
  const slug = card.metric
  const { value, delta, mood, known } = useTrendCard(card, win)

  const points = useMemo(() => (slug ? pointsOf(slug, site, win) : []), [slug, site, win])
  const compare = useMemo(() => (slug ? compareOf(slug, site, win) : undefined), [slug, site, win])
  const accent = card.accent ?? (card.tone === 'neutral' ? MUTED : TONE[card.tone])

  return (
    <a href={card.href ?? '#/trends'} className={`${TAP} ${CARD} flex flex-col p-[var(--pad-card)]`}>
      {/* THE HEADER IS THE LABEL AND NOTHING ELSE, BECAUSE `AreaTrend` OWNS THE FIGURE.
          The first cut of this panel printed its own `Figure` and its own delta above the chart,
          and the chart drew them again underneath — 110,020 twice, once with "+11%" and once with
          "+10,590". Removing the CHART's head would have been the wrong half to cut: `AreaTrend`'s
          `PlotHead` is SCRUBBABLE, so tracing the curve re-reads it at the point under the cursor,
          and a static figure sitting above a live one is worse than either alone. Its delta is the
          same comparison the supporting tiles make — this span against the one before it — stated
          in animals rather than percent.

          The `delta` and `value` from `useTrendCard` are still read, because `known` is what
          decides whether there is a series worth drawing at all. */}
      <span className="flex min-w-0 items-center gap-2">
        <card.icon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: accent }} aria-hidden />
        <span className="min-w-0 truncate text-small font-medium text-[#1c1a16]">{card.label}</span>
      </span>
      {/* The curve carries the span the chips set. `AccentProvider` so the mark inherits this
          card's own hue rather than the page accent — the same thing every other panel does. */}
      {known && points.length > 1 ? (
        <span className="mt-1 block">
          <AccentProvider value={accent}>
            <AreaTrend points={points} compare={compare} height={200} />
          </AccentProvider>
        </span>
      ) : (
        /* No series to draw — one reading, or a metric with no source. The figure still stands,
           because "110,020 and we cannot show you its shape" is a different statement from
           "nothing to report". */
        <span className="mt-2 flex items-baseline gap-2">
          <Figure value={value} size={36} color={HERO_INK} />
          {hasMovement(delta) && (
            <span className="shrink-0 text-caption font-semibold tabular-nums" style={{ color: MOOD[mood] }}>
              {delta}
            </span>
          )}
        </span>
      )}
    </a>
  )
}

function TrendTile({ card, win }: { card: (typeof trends)[number]; win: Win }) {
  const { open } = useSheet()
  const accent = card.accent ?? (card.tone === 'neutral' ? MUTED : TONE[card.tone])
  const { value, delta, mood, known } = useTrendCard(card, win)

  /* Same guard as the KPI cards: a metric with no model shows the empty state, never a zero. */
  if (!known) return <EmptyCard label={card.label} icon={card.icon} />

  return (
    <button
      type="button"
      /* The sheet still draws the twelve-month chart whatever the section is cut to — it is the
         one place with an axis, and the eyebrow says so. */
      onClick={() => open({ title: card.label, eyebrow: '12 months', body: <TrendPanel card={card} /> })}
      className={`${TAP} ${CARD} flex min-w-0 flex-col p-[var(--pad-card-sm)] ${
        card.wide ? '@[520px]:col-span-2' : ''
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className="grid size-6 shrink-0 place-items-center rounded-[8px]"
          style={{ backgroundColor: mix(accent, 0.12) }}
          aria-hidden
        >
          <card.icon size={13} strokeWidth={2} style={{ color: accent }} />
        </span>
        <span className="min-w-0 truncate text-small font-medium text-[#3d3a34]">
          {card.label}
        </span>
      </span>
      <span className="mt-2 flex items-baseline justify-between gap-2">
        <span
          className="min-w-0 truncate font-display text-[length:var(--fs-fig-xs)] leading-[var(--lh-fig)] font-bold tracking-[-0.4px] tabular-nums"
          style={{ color: HERO_INK }}
        >
          {value}
        </span>
        {hasMovement(delta) && (
          <span className="shrink-0 text-caption font-semibold tabular-nums" style={{ color: MOOD[mood] }}>
            {delta}
          </span>
        )}
      </span>

      {/* THE MARK IS GONE, on the same call as the headline curves above.

          What stood here was four different marks chosen from what the figure IS — an area for a
          level, columns for discrete monthly counts, a meter for a rate against its target, a
          range band for a level read against its own floor and ceiling. That reasoning still
          holds and the `shape` field on `TrendCard` still records it; only the drawing is
          removed, so restoring it is one block.

          The period switch on the section head does the work the curve was doing: rather than
          showing twelve months of shape beside a window's figure, the reader picks the span and
          the figure and its delta both re-read at it. */}
    </button>
  )
}

/* ── quick actions ───────────────────────────────────────────────────────── */

/**
 * EIGHT DOORS, AND SEVEN OF THEM LEAD SOMEWHERE.
 *
 * These are NAVIGATION, not metrics — which is what makes them safe to add to a screen that
 * otherwise refuses anything without a source. A shortcut does not assert a figure; it asserts
 * that a page exists, and that is checkable. Every `href` below was verified against the route
 * registry in `exec/pages/index.ts`.
 *
 * DIET PLAN HAS NO DESTINATION AND IS NOT A LINK. The extract carries no feed or diet table —
 * `core/metrics.ts` records the absence under `wastage` — and there is no diet module to open. It
 * renders as a tile with no chevron and no press, so the grid keeps the eight the brief asks for
 * while the one that cannot do anything does not pretend it can. A dead link on an executive
 * screen costs more trust than a missing one.
 *
 * TWO COLUMNS ON A PHONE, FOUR ON A DESKTOP, and never heavier than Collection Watch beside it:
 * these are 44px rows of icon-and-label, no figures, no colour beyond the glyph.
 */
const QUICK_ACTIONS: { label: string; icon: LucideIcon; href?: string }[] = [
  { label: 'Add New Animal', icon: PlusCircle, href: '#/accession' },
  { label: 'Medical Case', icon: Stethoscope, href: '#/health' },
  { label: 'Enclosure Status', icon: Boxes, href: '#/animals' },
  /* No route, by the note above. */
  { label: 'Diet Plan', icon: Wheat },
  { label: 'Pending Tasks', icon: ListChecks, href: '#/tasks' },
  { label: 'Reports', icon: FileBarChart, href: '#/trends' },
  { label: 'Alerts', icon: Bell, href: '#/alerts' },
  { label: 'Approvals', icon: BadgeCheck, href: '#/approvals' },
]

function QuickActions() {
  return (
    <div className={`${CARD} p-[var(--pad-card-sm)]`}>
      <div className="grid grid-cols-2 gap-1.5 @[1000px]:grid-cols-2">
        {QUICK_ACTIONS.map((a) => {
          const inner = (
            <>
              <span
                className="grid size-8 shrink-0 place-items-center rounded-[10px]"
                style={{ backgroundColor: a.href ? mix(ACCENT, 0.1) : '#f2f1ee' }}
                aria-hidden
              >
                <a.icon size={15} strokeWidth={1.9} style={{ color: a.href ? ACCENT : '#a9b3ad' }} />
              </span>
              <span
                className="min-w-0 flex-1 text-caption font-medium text-balance"
                style={{ color: a.href ? '#1c1a16' : '#a9b3ad' }}
              >
                {a.label}
              </span>
              {a.href && (
                <ChevronRight size={14} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
              )}
            </>
          )
          const shape = 'flex items-center gap-2.5 rounded-[12px] p-2'
          return a.href ? (
            <a key={a.label} href={a.href} className={`card-press ${shape} hover:bg-[#f4f9f6]`}>
              {inner}
            </a>
          ) : (
            <div key={a.label} className={shape}>
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * WHEN THE FIGURES WERE READ, AND HOW CURRENT THE LEDGER IS.
 *
 * `LastUpdated` already exists and already states both halves — the render clock and the last day
 * the extract holds — with a note on why collapsing them into "updated just now" would imply the
 * data is as fresh as the render. Reusing it is the whole of this footer; a second component
 * stating the same two facts differently is how two timestamps end up disagreeing.
 *
 * The page ENDS here. No bottom navigation on any breakpoint — checked, there is none in `Shell`
 * or `Sidebar` to remove, and none is added.
 */
function UpdateFooter() {
  return (
    <div className="mt-1 flex justify-center pb-1">
      <LastUpdated alwaysFull />
    </div>
  )
}

/* ── the page ────────────────────────────────────────────────────────────── */

export function HomeSections() {
  return (
    /* `pt-4`, and that is the whole distance between the illustration and the first
       heading. The negative margin that used to be here existed to claw back part of the
       seam strip below the banner; with the seam gone there is nothing to claw back and a
       negative margin would push uppercase micro-type onto the photo's grass. 8px, not 16:
       the illustration's own bottom eighth is now a fade, so the light band above this
       heading is already there — measured from where the artwork stops READING, the
       breath is about 25px. Everything else that used to sit here was an artefact. */
    <main className="flex flex-col gap-[var(--gap)] px-[var(--gutter)] pt-2 pb-[max(40px,env(safe-area-inset-bottom))]">
      {/* `ScopeNote` renders nothing when the scope is Overall — which is the default — but it
          used to be wrapped in a full-bleed div that rendered regardless. An empty flex child
          still takes a `gap`, and it still holds the `:first-child` slot, so the first
          SectionHead fell back to its `mt-5`. 32px of nothing on the screen's opening gap, in
          the state the screen is almost always in. The bleed moved onto the note itself. */}
      <ScopeNote />
      {/* Directly under the hero and above the KPI rule, because it is the hero's other half —
          how many animals, then how many kinds — and not one of the eleven measures below. */}
      <Reveal>
        <SpeciesCount />
      </Reveal>
      {/* NO COUNT ON THE RIGHT. "11 measures" is the number of tiles you are about to scroll
          past, which the tiles state better by being there. The rule earns its keep as a
          divider; the aside is kept for sections where the summary is a fact you cannot get
          by looking — "3 urgent", "82 / 100". */}
      <SectionHead icon={SECTION_ICONS.kpis} title="Executive Overview" />
      <Reveal>
        <ExecutiveOverview />
      </Reveal>

      {/* OPERATIONAL STATUS IS ITS OWN SECTION NOW, not a second unlabelled grid under the
          headline figures. The two were reading as one eleven-tile block, which is why the
          absent five were so loud: they sat at the same altitude as Animal Population. A rule
          and a name puts them where they belong — the readings you check, under the figures you
          report. */}
      <SectionHead icon={SECTION_ICONS.kpis} title="Operational Status" />
      <Reveal>
        <OperationalStrip />
      </Reveal>

      {/* TRENDS MOVED UP, to directly under the figures it is the shape of.
          It was the last section on the page, seven scroll-screens below the KPIs — which put "are
          we improving?" after every operational queue, and in practice out of reach. The figures
          and their twelve-month shape now read as one block: what it is, then where it is going. */}
      {/* The window is stated on the tile you open, not twice on the way to it — see the
          panel's own "· 12 months" line. */}
      <TrendsSection />

      {/* WHERE UPCOMING AND RISK INDICATORS USED TO BE — see the long note above. The question
          those two sections were asking is a real one and the screen should still answer it; what
          changed is that the answer is counted from the register rather than typed.
          NO COUNT IN THE ASIDE. The section's own leading figure states how many species it is
          about, and repeating it on the rule is the restatement the KPI head already dropped. */}
      {/* COLLECTION WATCH LEADS AND QUICK ACTIONS SITS BESIDE IT, at a ratio that says which is
          which. Watch is the analytical panel — a distribution bar and five counted risks — and
          Actions is a list of doors; giving them equal columns would state that eight shortcuts
          weigh the same as the collection's risk profile. 1.6fr against 1fr past 1000px of column,
          stacked below it, Watch first at every width.

          `items-start` so Actions does not stretch to Watch's height and leave dead space under
          its last row — the two panels end where their content ends. */}
      <SectionHead icon={SECTION_ICONS.risks} title="Collection Watch" />
      <Reveal>
        <div className="grid items-start gap-[var(--gap)] @[1000px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <CollectionWatch />
          <QuickActions />
        </div>
      </Reveal>

      <UpdateFooter />
    </main>
  )
}

/**
 * THE BODY BELOW THE ARTWORK IS THE FIGMA DASHBOARD NOW — see `homeDash.tsx`.
 *
 * `HomeBanner` is untouched: the greeting, the window pill, the 110,020 hero and the forest band
 * are exactly what the design shows above the fold, and they were already this. What changed is
 * everything under them — four ruled analytical sections became eight self-titling cards.
 *
 * `HomeSections` IS KEPT AND IS STILL EXPORTED. Its four sections are the reporting view of the
 * same collection and nothing else renders them, so deleting them would throw away
 * `ExecutiveOverview`, `OperationalStrip`, `TrendsSection` and `CollectionWatch` on the way past
 * — a much larger change than the one that was asked for, and not a reversible one. The screen
 * renders the dashboard; the sections stay in the file for whatever asks for them next.
 */
export function HomeView() {
  const [searching, setSearching] = useState(false)
  return (
    <>
      <HomeBanner onSearch={() => setSearching(true)} />
      <HomeDashboard />
      {searching && <ModuleSearch onClose={() => setSearching(false)} />}
    </>
  )
}
