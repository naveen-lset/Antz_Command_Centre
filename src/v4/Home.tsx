/**
 * V4 HOME — executive-first, seven sections, nothing else.
 *
 * The screen answers five questions in the order they are asked, and every section
 * exists because one of them does:
 *
 *   How healthy is the zoo?    hero + Executive KPIs
 *   What needs my attention?   Critical Alerts
 *   What is waiting on me?     Needs My Approval
 *   What is due soon?          Upcoming
 *   Are we improving?          Executive Health, Trends
 *   What could go wrong?       Risk Indicators
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

import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Eye, MapPin, Search } from 'lucide-react'
import { greetingFor, useNow } from '../hooks/useNow'
import { ModuleSearch } from './search'
import forestScene from '../assets/forest-scene.webp'
import { useFigure, usePeriod } from '../exec/period'
import { useCountUp } from '../hooks/useCountUp'
import { Reveal } from '../motion'
import {
  ACCENT,
  ACCENT_INK,
  AccentProvider,
  FAINT,
  Figure,
  HERO_INK,
  MUTED,
  Spark,
  SparkBars,
  SparkMeter,
  TONE,
  TRACK,
  compact,
  mix,
  signTone,
} from '../exec/system'
import {
  LEVEL_TONE,
  SECTION_ICONS,
  alertsUrgent,
  approvals,
  approvalsOverdue,
  approvalsPending,
  criticalAlerts,
  dueWithin,
  executiveHealth,
  headlineKpis,
  risks,
  site,
  supportingKpis,
  trends,
  upcoming,
  zooHealth,
  zooHealthScore,
  type HeadlineKpi,
  type Kpi,
} from './data'
import { useSheet } from './sheet'
import { FilterBar, ScopeNote } from './filters'
import { useScope } from './scope'
import { useKpi, useMovement, useTrendCard } from './kpi'
import { figure as figureOf } from '../core/query'
import {
  AlertPanel,
  ApprovalPanel,
  MeasurePanel,
  RiskPanel,
  TrendPanel,
  UpcomingPanel,
  ZooHealthPanel,
} from './panels'

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

function MistBackdrop() {
  const birds = [
    { x: 250, y: 34, s: 1 },
    { x: 292, y: 22, s: 0.8 },
    { x: 322, y: 44, s: 0.65 },
    { x: 275, y: 58, s: 0.55 },
    { x: 341, y: 18, s: 0.5 },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-16 right-0 size-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0)_70%)]" />
      <svg className="absolute inset-0 size-full" viewBox="0 0 390 200">
        {birds.map((b, i) => (
          <path
            key={i}
            d="M0,4 C2.5,0.5 4.5,0.5 6,3.2 C7.5,0.5 9.5,0.5 12,4"
            fill="none"
            stroke="#34544a"
            strokeWidth={1.3}
            strokeLinecap="round"
            opacity={0.35}
            transform={`translate(${b.x} ${b.y}) scale(${b.s})`}
          />
        ))}
      </svg>
    </div>
  )
}

function GreetingHeader({ onSearch }: { onSearch: () => void }) {
  const now = useNow(30_000)
  return (
    <header className="relative px-[var(--gutter-lg)] pt-12 pb-4 @[460px]:pt-14 @[900px]:pt-16">
      <MistBackdrop />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[18px] text-[#6d6860] @[460px]:text-[19px] @[900px]:text-[21px]">{greetingFor(now)},</p>
          <h1 className="mt-0.5 text-[length:var(--fs-name)] leading-[1.2] font-bold tracking-[-0.02em] text-[#1c1a16]">
            {site.userName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[length:var(--fs-body)] text-[#3d3a34]">
            <MapPin size={14} strokeWidth={1.75} aria-hidden />
            {site.org} · {site.role}
          </p>
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
      <div className="sticky top-0 z-30 pt-[max(12px,env(safe-area-inset-top))]">
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

function ForestBand() {
  return (
    <div className="relative -z-10 h-[clamp(150px,21cqw,250px)] w-full">
      {/* THE CAP ONLY EVER TRIMS SKY. The artwork is 4:3, so at column width W its
          natural height is 0.75W; keep the box shorter than that and `object-cover`
          crops the height — the empty sky the scene was composed with — rather than
          the sides, where the elephants and the pond are.

          40cqw, down from 54. The score strip added a row above the hero and pushed it
          down into the illustration: on a 716px desktop column the giraffe and the hut
          ended up directly behind "Total Animals", which is dark type on mid-green.
          A shorter image sits the horizon lower, and the mask now clears the top 42%
          rather than 30% so the hero has flat ground under it at every width.

          THE MASK NOW CLOSES AT THE BOTTOM TOO. The artwork's last row averages
          rgb(118,164,141) and the page ground under it is around rgb(219,233,226) — a
          hundred levels in every channel, landing as a ruler-straight line across the
          screen. That line is what the vector seam below it was really trying to hide,
          and hiding a bad edge with a second drawing is how the page ended up with a
          hundred pixels of blank green under the illustration.
          Eight per cent, and eight only: the foreground plants dissolve at their base,
          which is what mist does, while the elephants' feet sit just clear of it. Any
          longer and the animals go with the grass. */}
      <img
        src={forestScene}
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 max-h-[clamp(230px,34cqw,340px)] w-full object-cover object-bottom select-none"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, #000 50%, #000 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 50%, #000 92%, transparent 100%)',
        }}
      />
    </div>
  )
}

/**
 * The four composite scores, kept at the top of the screen.
 *
 * They used to live under the hero, as the breakdown of a Zoo Health headline. The
 * headline is the collection total again, so the scores need their own place.
 *
 * THAT PLACE IS DOWN THE PAGE, NOT IN THE BANNER. It sat directly under the greeting, which put
 * four composite indices above the figure the screen exists to show — and a composite is the one
 * kind of number nobody acts on directly. It now has its own section beside Executive Health,
 * where the other scores-against-target live, and the banner opens on the hero.
 *
 * One word each. Four cells share ~350px at 390px wide, which leaves ~78px a cell —
 * "Animal health" truncated to "Animal heal…" there, and a clipped label in the first
 * thing on the screen is worse than a less precise one. The sheet spells them out.
 */
function ScoreStrip() {
  const { open } = useSheet()
  const { period } = usePeriod()
  const delta = useFigure(zooHealth.delta)

  return (
    <button
      type="button"
      onClick={() =>
        open({
          title: 'Zoo Health',
          eyebrow: period.window,
          body: <ZooHealthPanel score={zooHealthScore} parts={zooHealth.parts} delta={delta} />,
        })
      }
      className={`${TAP} ${CARD} flex w-full items-stretch p-[var(--pad-card-sm)]`}
      aria-label={`Zoo health ${Math.round(zooHealthScore)} out of 100`}
    >
      {zooHealth.parts.map((p, i) => (
        <span
          key={p.label}
          className={`min-w-0 flex-1 ${i ? 'border-l border-[#1c1a16]/8 pl-3' : ''} ${
            i < zooHealth.parts.length - 1 ? 'pr-3' : ''
          }`}
        >
          <span className="block font-display text-[20px] leading-none font-bold tabular-nums" style={{ color: HERO_INK }}>
            {p.score}
          </span>
          {/* One word each. Four cells share ~350px at 390px wide, which leaves ~78px a cell —
              "Animal health" truncated to "Animal heal…" there. The sheet spells them out. */}
          <span className="mt-1 block truncate text-[11.5px] text-[#6d6860]">{p.label}</span>
        </span>
      ))}
    </button>
  )
}

/**
 * The hero is the collection total — the anchor read from across a room.
 *
 * It briefly carried a Zoo Health composite instead. That number answers "is anything
 * wrong", which is a real question, but it is not the one this screen opens on: the
 * scores now sit in their own strip above, and the hero is back to the figure the
 * product has always led with.
 *
 * The total is stated again on the first KPI card below, deliberately. The hero is the
 * anchor and carries no shape; the card is where the same number acquires twelve
 * months of curve and a detail page you can open.
 */
function HeroBlock() {
  const { period } = usePeriod()
  const { scope } = useScope()
  const animals = headlineKpis[0]
  /* The hero scopes with everything else. It briefly did not, and the result was a
     screen headed 215,432 Total Animals above a KPI row reading 178K for Aquatic
     Halls — the single worst thing this app can do, which is state two different
     answers to one question on one screen.

     The collection total is no longer hardcoded here either. It was, as the fallback for
     the unscoped case, which meant the largest number on the screen was the one figure on
     it that could not respond to anything. */
  const headcount = Math.round(figureOf(scope, 'animals').value)
  const gain = useMovement('animals')
  const total = useCountUp(headcount, { format: (v) => Math.round(v).toLocaleString('en-US') })

  return (
    <section className="px-[var(--gutter-lg)] pt-4" aria-label="Total animals">
      {/* The hero states the same KPI as the first card below it, so it goes to the same place:
          the Animal Population page. "View breakdown" is still what it does — the breakdown is
          now the page's own site split, and each site row there opens the drill sheet. */}
      <a href={animals.href} className="card-press block w-full">
        <p
          className="text-center font-display text-[length:var(--fs-hero)] leading-none font-bold tracking-[-0.02em]"
          style={{ color: HERO_INK }}
        >
          {total}
        </p>
        <p className="mt-2 text-center text-[16px] text-[#1c1a16] @[900px]:text-[18px]">
          {scope.site ? `Animals · ${scope.site.name}` : 'Total Animals'}
        </p>
        {/* The total above is a standing figure; the gain is the same population read on the
            window's first and last day, so it is genuinely the scoped movement — Aquatic Halls'
            gain when Aquatic Halls is picked.

            THE LINE ALSO HAD TO SAY IT WAS A DOOR. The whole hero has always been tappable and
            nothing on it said so, so the drill-down behind the largest number on the screen was
            invisible. The movement and the affordance share one row: the figure earns the tap and
            the eye names it. */}
        {/* ONE BACKDROP FOR BOTH, because of what is behind them. The row sits over the top of the
            forest illustration, and a green movement figure on green foliage is the one place on
            this screen where the ink and the ground are the same colour. A single translucent pill
            carries the pair clear of it and reads as one control rather than a figure with a button
            beside it. */}
        <span className="mt-2 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-[5px] backdrop-blur-sm">
            {gain !== undefined && gain !== 0 && (
              <>
                <span
                  className="text-[length:var(--fs-cap)] font-semibold tabular-nums"
                  style={{ color: gain > 0 ? '#1e7a44' : TONE.bad }}
                >
                  {gain > 0 ? '▲' : '▼'} {Math.abs(gain).toLocaleString('en-US')} {period.noun}
                </span>
                <span className="h-[11px] w-px bg-[#16150f]/15" aria-hidden />
              </>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: ACCENT_INK }}>
              <Eye size={12} strokeWidth={2.25} aria-hidden />
              View breakdown
            </span>
          </span>
        </span>
      </a>
    </section>
  )
}

export function HomeBanner({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="relative isolate">
      <div
        className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,#cde4d8_0%,#b4d3c4_38%,#a0c8b5_62%,rgba(231,240,234,0)_100%)]"
        aria-hidden
      />
      <GreetingHeader onSearch={onSearch} />
      <StickyPeriod />
      <HeroBlock />
      <ForestBand />
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
  aside?: string
  tone?: 'good' | 'warn' | 'bad'
}) {
  return (
    <div className="mt-5 flex items-center gap-2.5 px-1 first:mt-0">
      <Glyph size={14} strokeWidth={2} style={{ color: MUTED }} aria-hidden />
      <h2 className="text-[length:var(--fs-micro)] font-semibold tracking-[0.09em] text-[#3d3a34] uppercase">
        {title}
      </h2>
      <span className="h-px flex-1 bg-[#1c1a16]/8" aria-hidden />
      {aside && (
        <span
          className="shrink-0 text-[11.5px] font-medium tabular-nums"
          style={{ color: tone ? TONE[tone] : FAINT }}
        >
          {aside}
        </span>
      )}
    </div>
  )
}

/** Severity chip — the one place a level is spelled out rather than dotted. */
function LevelChip({ level }: { level: keyof typeof LEVEL_TONE }) {
  const tone = LEVEL_TONE[level]
  return (
    <span
      className="shrink-0 rounded-full px-2 py-[2px] text-[10px] font-semibold tracking-[0.04em] uppercase"
      style={{ backgroundColor: mix(TONE[tone], 0.12), color: TONE[tone] }}
    >
      {level}
    </span>
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
function HeadlineCard({ kpi }: { kpi: HeadlineKpi }) {
  const colour = kpi.accent ?? (kpi.tone && kpi.tone !== 'good' ? TONE[kpi.tone] : ACCENT)

  /* Figure, note, movement and curve all from the one metric under the one scope — so the
     card cannot state a site's figure beside the collection's movement, which is exactly
     what it did when these came from four separate places. */
  const { value, note, delta, mood, series, known } = useKpi(kpi)

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
          <span className="min-w-0 text-[length:var(--fs-label)] leading-[17px] font-medium text-balance text-[#1c1a16]">
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
          <Figure value={value} size={34} color={HERO_INK} />
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 truncate text-[12px] text-[#9b958b]">{note}</span>
            {hasMovement(delta) && (
              <span className="shrink-0 text-[11.5px] font-semibold tabular-nums" style={{ color: MOOD[mood] }}>
                {delta}
              </span>
            )}
          </span>
        </span>
      </span>

      {/* Tinted by putting the tone on the accent context rather than by threading a colour prop
          through two shared marks.

          The curve is the WINDOW, bucketed — the same daily series the figure beside it sums, so
          the two cannot disagree. It used to be a fixed twelve months whatever the chip said,
          which left a seven-day figure sitting on a year of shape.

          NO CAPTION UNDER IT. It used to print the window — "JULY 2025" — under all four curves,
          which is the period chip at the top of the page restated four times in the same eyeline.
          The window is stated once, where it is set. */}
      <span className="w-[104px] shrink-0 @[640px]:mt-3.5 @[640px]:w-auto" aria-hidden>
        <AccentProvider value={colour}>
          {kpi.chart === 'bars' ? <SparkBars values={series} /> : <Spark values={series} h={34} />}
        </AccentProvider>
      </span>
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
        <span className="min-w-0 text-[length:var(--fs-label)] leading-[17px] font-medium text-balance text-[#6d6860]">
          {label}
        </span>
      </span>
      <span className="mt-2.5 block font-display text-[34px] leading-none font-bold" style={{ color: '#c9c4bb' }}>
        —
      </span>
      <span className="mt-1 block text-[11px] text-[#9b958b]">Not reported for this scope</span>
    </div>
  )
}

/**
 * A COLUMN ON A PHONE, A ROW ABOVE IT.
 *
 * This was a horizontal snap-scroller with peek and dots, on the reasoning that four cards will not
 * fit legibly across 390px. The premise was right and the conclusion was wrong: a sideways row hides
 * three of the four most important figures on the screen behind a gesture, and the dots admit it.
 * A director scrolling down a phone should not have to also scroll sideways to find Mortality.
 *
 * So on a phone the four stack, and each card turns on its side to earn the width — label and figure
 * on the left, the curve on the right, at about half the height a stacked card would need. Past
 * 640px of column they return to a four-across row, where they fit as drawn.
 */
function KpiRail() {
  return (
    <div className="grid gap-[var(--gap)] @[640px]:grid-cols-4">
      {headlineKpis.map((k) => (
        <HeadlineCard key={k.key} kpi={k} />
      ))}
    </div>
  )
}

/** The supporting six — the same tile, no graph, quieter. */
function KpiTile({ kpi }: { kpi: Kpi }) {
  const { value, unit, note, delta, mood, percent, target, inverse } = useKpi(kpi)
  const accent = kpi.accent ?? ACCENT

  const inner = (
    <>
      {/* A tinted chip of the tile's own hue, not the one product green every tile used to draw.
          Six identical cards meant finding "Vaccination" required reading all six labels; colour
          and position now do that work before the label is read. The hue is the module's own, so
          the tile and the page behind it match. */}
      <span className="flex items-center gap-2">
        {/* Bare glyph, same box, same accent — see the headline card above. */}
        <span className="grid size-6 shrink-0 place-items-center" aria-hidden>
          <kpi.icon size={18} strokeWidth={1.75} style={{ color: accent }} />
        </span>
        <span className="min-w-0 truncate text-[length:var(--fs-label)] font-medium text-[#3d3a34]">{kpi.label}</span>
      </span>
      {/* 26, not 30. At six columns a KPI cell is ~125px of inner width and
          "215,432" is about 3.8em wide — at 30pt with the tier multiplier on top it
          printed straight over the card's own edge. The scale variable still grows it
          per tier; this is the base it grows from. */}
      {/* Same one baseline as the headline card above, and the same wrap: figure, the note that
          qualifies it, then the movement. These six run two, three and six across, so the note —
          "2,171 of 2,374", "Site average · target 90" — almost always wants the second line and
          takes it, which is the layout this always had. Where it fits, as on the wide closing
          tile, the three read as one line rather than as a figure with a caption under it.

          `note || ' '` STAYS. Six tiles in a row are equal height, but the meter under each is
          not — a tile whose text wraps to two lines sits its bar 17px below a tile whose text
          did not, and a row of bars at two heights reads as a bug. The nbsp keeps a tile with
          no note wrapping like its neighbours. */}
      <span className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
        <Figure value={value} unit={unit} size={26} color={HERO_INK} />
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 truncate text-[12px] text-[#9b958b]">{note || ' '}</span>
          {/* Shown under a site scope now, because it IS that site's movement — the delta
              is read from the same scoped series as the figure beside it. It had to be
              hidden before, when it was the collection's change beside a site's figure. */}
          {hasMovement(delta) && (
            <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: MOOD[mood] }}>
              {delta}
            </span>
          )}
        </span>
      </span>
      {/* THE ONE MARK THESE SIX TILES DID NOT HAVE. All six are rates, and a rate stated as
          a number and drawn as nothing makes 92% and 86% look identical until both are read.
          Five pixels answer "how far along" before either number is. Drawn only where there
          is a percentage to draw, so a tile can never show a bar it invented. */}
      {percent !== undefined && (
        /* PUSHED TO THE FLOOR OF THE CARD, not stacked under the text.
           Now that the figure row wraps only when it has to, two tiles beside each other can
           carry one line of text and two — "78 % 45 of 58 pairings" fits, "91 % 2,171 of 2,374
           −0.9 pts" does not — and a bar that follows its own text lands 17px lower on one tile
           than on its neighbour. A row of grid cells is equal height, so `mt-auto` takes that
           difference into the gap above the bar instead, and the row's bars all sit on one line.
           `pt-0.5` is there to stop `SparkMeter`'s own top margin collapsing through the
           wrapper, which would drag the bar back off the floor. */
        <span className="mt-auto block pt-0.5">
          {/* The tile's own hue, not the product green. `SparkMeter` reads the accent from
             context like every other mark, and this tile sets its accent per KPI rather than
             on a provider — so the provider goes here, around the one mark that needs it. */}
          <AccentProvider value={accent}>
            <SparkMeter percent={percent} target={target} inverse={inverse} />
          </AccentProvider>
        </span>
      )}
    </>
  )

  /* One destination for all six, the same as the four headline cards above: the module page.
     Three of these used to open a drill sheet and two a measure panel, so a row of six identical
     tiles behaved three different ways under the same gesture. The measure panel is still one tap
     away — it is what the Executive Health tile below opens, where the score belongs. */
  return (
    <a
      href={kpi.href}
      className={`${TAP} ${CARD} flex min-w-0 flex-col p-[var(--pad-card-sm)] ${
        kpi.wide ? 'col-span-2 @[640px]:col-span-3 @[1000px]:col-span-6' : ''
      }`}
    >
      {inner}
    </a>
  )
}

function KpiGrid() {
  return (
    /* Six tiles that divide evenly at two, three and six, and a seventh that spans the
       last row rather than sitting alone in it. Seven has no column count that divides
       it, so the choice was an orphaned tile at every breakpoint or a deliberate closing
       row; `wide` on the KPI picks the second. Measured off the COLUMN, not the window —
       with a sidebar and a panel flanking it, a 1280 desktop hands this stack less width
       than a tablet landscape does. See the note in `index.css`. */
    <div className="grid grid-cols-2 gap-[var(--gap)] @[640px]:grid-cols-3 @[1000px]:grid-cols-6">
      {supportingKpis.map((k) => (
        <KpiTile key={k.key} kpi={k} />
      ))}
    </div>
  )
}

/* ── 2 · critical alerts ─────────────────────────────────────────────────── */

function AlertTile({ alert }: { alert: (typeof criticalAlerts)[number] }) {
  const { open } = useSheet()
  const tone = LEVEL_TONE[alert.level]
  return (
    <button
      type="button"
      onClick={() => open({ title: alert.label, eyebrow: `${alert.count} open · ${alert.level}`, body: <AlertPanel alert={alert} /> })}
      className={`${TAP} ${CARD} flex items-center gap-3 p-[var(--pad-card-sm)]`}
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-[11px]"
        style={{ backgroundColor: mix(TONE[tone], 0.12) }}
        aria-hidden
      >
        <alert.icon size={17} strokeWidth={1.75} style={{ color: TONE[tone] }} />
      </span>
      {/* The severity chip rides the SUB-LINE, not the title.
          Beside the title it took ~78px out of a ~150px label column once these sit
          two-up in a content column, and seven of the ten titles clipped —
          "Critical Medical …", "Medicine Out of St…". The chip is a small
          fixed-width token and the note beside it is already short, so the two share
          the lower line comfortably and the title gets the whole upper one. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[length:var(--fs-label)] font-medium text-[#1c1a16]">
          {alert.label}
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <LevelChip level={alert.level} />
          <span className="min-w-0 truncate text-[11px] text-[#9b958b]">{alert.note}</span>
        </span>
      </span>
      {/* The count is INK, not the severity colour. The severity is already said twice on this
          row — by the chip under the title and by the glyph beside it — and a third statement of
          it in the largest mark on the card left ten alert tiles reading as a wall of red and
          amber numbers. The number is a quantity; the chip is the judgement. */}
      <span className="shrink-0 font-display text-[24px] leading-none font-bold tabular-nums" style={{ color: HERO_INK }}>
        {alert.count}
      </span>
      <ChevronRight size={14} strokeWidth={2} className="shrink-0" style={{ color: '#c9c4bb' }} aria-hidden />
    </button>
  )
}

/* ── 3 · approvals ───────────────────────────────────────────────────────── */

function ApprovalTile({ group }: { group: (typeof approvals)[number] }) {
  const { open } = useSheet()
  const overdue = group.requests.filter((r) => r.overdue).length
  return (
    <button
      type="button"
      onClick={() =>
        open({
          title: group.label,
          eyebrow: `${group.requests.length} waiting on you`,
          body: <ApprovalPanel group={group} />,
        })
      }
      className={`${TAP} ${CARD} flex min-w-0 flex-col p-[var(--pad-card-sm)]`}
    >
      <span className="flex items-center gap-2">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-[9px]"
          style={{ backgroundColor: mix(ACCENT, 0.1) }}
          aria-hidden
        >
          <group.icon size={15} strokeWidth={1.75} style={{ color: ACCENT }} />
        </span>
        <span className="min-w-0 truncate text-[length:var(--fs-label)] font-medium text-[#1c1a16]">{group.label}</span>
      </span>
      <span className="mt-2.5 flex items-baseline justify-between gap-2">
        <Figure value={String(group.requests.length)} size={26} color={HERO_INK} />
        {overdue > 0 && (
          <span className="shrink-0 text-[11px] font-semibold" style={{ color: TONE.warn }}>
            {overdue} late
          </span>
        )}
      </span>
    </button>
  )
}

/* ── 4 · upcoming ────────────────────────────────────────────────────────── */

function Upcoming() {
  const { open } = useSheet()
  const [horizon, setHorizon] = useState(7)
  const groups = upcoming
    .map((g) => ({ group: g, rows: g.rows.filter((r) => r.inDays <= horizon) }))
    .filter((g) => g.rows.length > 0)

  return (
    <div className={`${CARD} p-[var(--pad-card)]`}>
      <div className="flex items-center justify-between gap-3">
        {/* "21 due" was ambiguous beside a column of 6, 29, 300 — the reader has to
            work out whether 21 is a third figure or a count of the rows. It is the
            rows, so it says so. */}
        <span className="text-[length:var(--fs-title)] font-medium text-[#1c1a16]">
          {dueWithin(horizon)} scheduled
        </span>
        {/* Two windows, not a date picker. The question is "what is due soon", and
            soon is either this week or this month — anything else is planning, which
            happens in the module. */}
        <div className="flex gap-1.5" role="tablist" aria-label="Horizon">
          {[7, 30].map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={horizon === d}
              onClick={() => setHorizon(d)}
              className={`rounded-full px-3 py-[5px] text-[12px] font-medium transition-colors ${
                horizon === d ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a]'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 flex flex-col">
        {groups.map(({ group, rows }) => {
          const count = rows.reduce((n, r) => n + r.count, 0)
          const next = rows[0]
          const soon = next.inDays <= 1
          return (
            <li key={group.key} className="border-b border-[#f0efec] last:border-0">
              <button
                type="button"
                onClick={() =>
                  open({
                    title: group.label,
                    eyebrow: `Next ${horizon} days`,
                    body: <UpcomingPanel group={group} horizon={horizon} />,
                  })
                }
                className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left"
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-[9px]"
                  style={{ backgroundColor: mix(ACCENT, 0.1) }}
                  aria-hidden
                >
                  <group.icon size={15} strokeWidth={1.75} style={{ color: ACCENT }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-[#1c1a16]">{group.label}</span>
                  {/* A dot for the ones inside 24 hours, not an amber line.
                      Six of the nine groups have something due tomorrow, and setting
                      six of nine sub-lines in warn amber turned the urgency colour
                      into the list's body colour — at which point it has stopped
                      marking anything. The dot marks the same rows and leaves the
                      text readable. */}
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px]" style={{ color: FAINT }}>
                    {soon && (
                      <span
                        className="size-[5px] shrink-0 rounded-full"
                        style={{ backgroundColor: TONE.warn }}
                        aria-label="Within 24 hours"
                      />
                    )}
                    <span className="truncate">
                      Next {next.date} · {next.where}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-[14px] font-medium tabular-nums" style={{ color: HERO_INK }}>
                  {compact(count)}
                </span>
                <ChevronRight size={13} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
      {groups.length === 0 && (
        <p className="mt-4 text-[13px] text-[#6d6860]">Nothing scheduled in the next {horizon} days.</p>
      )}
    </div>
  )
}

/* ── 5 · executive health ────────────────────────────────────────────────── */

function MeasureTile({ measure }: { measure: (typeof executiveHealth)[number] }) {
  const { open } = useSheet()
  return (
    <button
      type="button"
      onClick={() => open({ title: measure.label, eyebrow: measure.targetLabel, body: <MeasurePanel measure={measure} /> })}
      className={`${TAP} ${CARD} flex min-w-0 flex-col p-[var(--pad-card)]`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[length:var(--fs-label)] text-[#3d3a34]">{measure.label}</span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: signTone(measure.delta) ?? FAINT }}>
          {measure.delta}
        </span>
      </span>
      <span className="mt-2 block">
        <Figure value={measure.value} unit={measure.unit} size={34} color={HERO_INK} />
      </span>
      {/* Bar, target tick, sparkline — the same three facts `Bullet` carries, laid
          out for a tile rather than a card row. A full bar always means good: the
          two "lower is better" measures are inverted in the data, not here. */}
      <span className="relative mt-3 block h-[8px] w-full rounded-full" style={{ backgroundColor: TRACK }}>
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(3, Math.min(100, measure.percent))}%`, backgroundColor: TONE[measure.tone] }}
        />
        {measure.target < 100 && (
          <span
            className="absolute inset-y-[-2px] w-[2px] rounded-full bg-[#1c1a16]/45"
            style={{ left: `calc(${measure.target}% - 1px)` }}
            aria-hidden
          />
        )}
      </span>
      {/* No sparkline here, deliberately. One went in and came out: six months of a
          94-out-of-100 score drawn into a 64px box is a horizontal line, and a mark
          that cannot vary is a mark that says nothing while taking the room that says
          it. The movement over the window is the answer to "are we improving", and it
          is a number — the shape is in the sheet, on a real axis. */}
      <span className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-[11px]" style={{ color: FAINT }}>
          {measure.targetLabel}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums" style={{ color: FAINT }}>
          6 mo {moved(measure.history)}
        </span>
      </span>
    </button>
  )
}

/** Signed movement across the six readings, at the series' own precision. */
function moved(history: number[]): string {
  const d = history[history.length - 1] - history[0]
  const decimals = Number.isInteger(history[0]) && Number.isInteger(history[history.length - 1]) ? 0 : 3
  const n = Number(d.toFixed(decimals))
  return `${n > 0 ? '+' : ''}${n}`
}

/* ── 6 · risks ───────────────────────────────────────────────────────────── */

function RiskRow({ risk }: { risk: (typeof risks)[number] }) {
  const { open } = useSheet()
  const tone = LEVEL_TONE[risk.level]
  return (
    <li className="border-b border-[#f0efec] last:border-0">
      <button
        type="button"
        onClick={() => open({ title: risk.label, eyebrow: `${risk.level} risk`, body: <RiskPanel risk={risk} /> })}
        className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-3 text-left"
      >
        <risk.icon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: TONE[tone] }} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 truncate text-[13.5px] text-[#1c1a16]">{risk.label}</span>
            <LevelChip level={risk.level} />
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[#9b958b]">{risk.note}</span>
        </span>
        {/* Ink, for the same reason as the alert count above — the icon and the chip carry the
            level, so the figure carries only the figure. */}
        <span className="shrink-0 text-[16px] font-semibold tabular-nums" style={{ color: HERO_INK }}>
          {risk.value}
        </span>
        <ChevronRight size={13} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
      </button>
    </li>
  )
}

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
function TrendTile({ card }: { card: (typeof trends)[number] }) {
  const { open } = useSheet()
  const accent = card.accent ?? (card.tone === 'neutral' ? MUTED : TONE[card.tone])
  const { value, delta, values, mood } = useTrendCard(card)
  const shape = card.shape ?? 'area'

  const low = values.length ? Math.min(...values) : 0
  const high = values.length ? Math.max(...values) : 0

  return (
    <button
      type="button"
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
        <span className="min-w-0 truncate text-[length:var(--fs-label)] font-medium text-[#3d3a34]">
          {card.label}
        </span>
      </span>

      <span className="mt-2 flex items-baseline justify-between gap-2">
        <span
          className="min-w-0 truncate font-display text-[length:var(--fs-fig-xs)] leading-none font-bold tabular-nums"
          style={{ color: HERO_INK }}
        >
          {value}
        </span>
        {hasMovement(delta) && (
          <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: MOOD[mood] }}>
            {delta}
          </span>
        )}
      </span>

      {/* The mark. Tinted by putting the hue on the accent context rather than by threading a
          colour prop through four shared components.

          `Spark` and `SparkBars` scale to the SERIES' OWN RANGE, unlike the `Trend` in the sheet
          which is zero-based with a real axis — and that difference is deliberate. Animal
          population runs 212,040 → 215,432; zero-based, that is a dead flat line under a large
          filled slab, which is a truthful chart and a useless glyph. A sparkline's job beside a
          stated number is shape; the readable scale belongs on the chart that carries an axis. */}
      <span className="mt-2.5 block w-full" aria-hidden>
        <AccentProvider value={accent}>
          {shape === 'columns' ? (
            <SparkBars values={values} />
          ) : shape === 'meter' ? (
            <TargetMeter value={values[values.length - 1] ?? 0} target={card.target ?? 0} accent={accent} />
          ) : shape === 'range' ? (
            <RangeBand low={low} high={high} at={values[values.length - 1] ?? 0} accent={accent} />
          ) : (
            <Spark values={values} h={34} />
          )}
        </AccentProvider>
      </span>

      {/* NO CAPTION UNDER THE MARK. It printed "Animals · monthly close" beneath a card already
          titled "Animal Population" — the label restated in smaller grey type, on all twelve
          tiles at once, which is a band of noise across the section for no fact you did not
          already have. The bucketing it named is a property of the section, not of each tile.

          The two shapes whose caption carried a real number — the meter's target and the
          range's band — lose those figures here. Both are still DRAWN: the meter's notch sits
          at its target and the band's dot at its position, and the exact numbers are one tap
          away in the trend panel this card opens. */}
    </button>
  )
}

/**
 * A rate against its published target.
 *
 * The bar is the target's width, and the fill is the reading. Over target the fill turns red and
 * runs past the notch — which is the one thing a sparkline of the same series cannot show, because
 * the target does not appear in the series at all.
 */
function TargetMeter({ value, target, accent }: { value: number; target: number; accent: string }) {
  const over = target > 0 && value > target
  /* Scaled so the target notch sits at three-quarters, leaving room for an overshoot to be visibly
     an overshoot rather than a bar that is simply full. */
  const scale = target > 0 ? target / 0.75 : Math.max(value, 1)
  const width = Math.max(3, Math.min(100, (value / scale) * 100))

  return (
    <span className="block h-[34px] pt-3">
      <span className="relative block h-[8px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${width}%`, backgroundColor: over ? TONE.bad : accent }}
        />
        {/* The notch. Drawn over the fill so it stays visible when the bar runs past it. */}
        <span className="absolute inset-y-[-3px] w-[2px] rounded-full bg-[#16150f]/45" style={{ left: '75%' }} />
      </span>
    </span>
  )
}

/**
 * A level in its own twelve-month band.
 *
 * For a money figure the useful question is not the wiggle, it is whether this month is near the
 * floor or the ceiling of the year — so the mark is the band with the reading on it, and the floor
 * and ceiling are stated under the card.
 */
function RangeBand({ low, high, at, accent }: { low: number; high: number; at: number; accent: string }) {
  const span = high - low
  const pos = span > 0 ? ((at - low) / span) * 100 : 50

  return (
    <span className="block h-[34px] pt-3">
      <span className="relative block h-[8px] w-full rounded-full" style={{ backgroundColor: mix(accent, 0.16) }}>
        <span
          className="absolute top-1/2 size-[12px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{ left: `${Math.max(4, Math.min(96, pos))}%`, backgroundColor: accent }}
        />
      </span>
    </span>
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
      {/* NO COUNT ON THE RIGHT. "11 measures" is the number of tiles you are about to scroll
          past, which the tiles state better by being there. The rule earns its keep as a
          divider; the aside is kept for sections where the summary is a fact you cannot get
          by looking — "3 urgent", "82 / 100". */}
      <SectionHead icon={SECTION_ICONS.kpis} title="Executive KPIs" />
      <Reveal>
        <KpiRail />
      </Reveal>
      <Reveal>
        <KpiGrid />
      </Reveal>

      {/* TRENDS MOVED UP, to directly under the figures it is the shape of.
          It was the last section on the page, seven scroll-screens below the KPIs — which put "are
          we improving?" after every operational queue, and in practice out of reach. The figures
          and their twelve-month shape now read as one block: what it is, then where it is going. */}
      {/* The window is stated on the tile you open, not twice on the way to it — see the
          panel's own "· 12 months" line. */}
      <SectionHead icon={SECTION_ICONS.trends} title="Trends" />
      <Reveal>
        <div className="grid grid-cols-2 gap-[var(--gap)] @[520px]:grid-cols-4">
          {trends.map((t) => (
            <TrendTile key={t.key} card={t} />
          ))}
        </div>
      </Reveal>

      <SectionHead
        icon={SECTION_ICONS.alerts}
        title="Critical Alerts"
        aside={`${alertsUrgent} urgent`}
        tone="bad"
      />
      <Reveal>
        {/* One column on a phone, two once the column can carry a pair without the
            label and the count colliding. */}
        <div className="grid gap-[var(--gap)] @[560px]:grid-cols-2">
          {criticalAlerts.map((a) => (
            <AlertTile key={a.key} alert={a} />
          ))}
        </div>
      </Reveal>

      <SectionHead
        icon={SECTION_ICONS.approvals}
        title="Needs My Approval"
        aside={`${approvalsPending} pending · ${approvalsOverdue} late`}
        tone="warn"
      />
      <Reveal>
        <div className="grid grid-cols-2 gap-[var(--gap)] @[520px]:grid-cols-3 @[820px]:grid-cols-6">
          {approvals.map((g) => (
            <ApprovalTile key={g.key} group={g} />
          ))}
        </div>
      </Reveal>

      <SectionHead icon={SECTION_ICONS.upcoming} title="Upcoming" aside="7 / 30 days" />
      <Reveal>
        <Upcoming />
      </Reveal>

      {/* The composite, in its own section beside the other scores rather than above the hero.
          Four indices are the standing answer to "is anything wrong" — worth reading, and not worth
          the first screen, which belongs to the figure the app is opened for. */}
      <SectionHead icon={SECTION_ICONS.zooHealth} title="Zoo Health" aside={`${zooHealthScore} / 100`} />
      <Reveal>
        <ScoreStrip />
      </Reveal>

      <SectionHead icon={SECTION_ICONS.health} title="Executive Health" aside="against target" />
      <Reveal>
        <div className="grid gap-[var(--gap)] @[460px]:grid-cols-2 @[820px]:grid-cols-3">
          {executiveHealth.map((m) => (
            <MeasureTile key={m.key} measure={m} />
          ))}
        </div>
      </Reveal>

      <SectionHead icon={SECTION_ICONS.risks} title="Risk Indicators" aside={`${risks.length} tracked`} />
      <Reveal>
        <div className={`${CARD} p-[var(--pad-card)]`}>
          <ul className="flex flex-col">
            {risks.map((r) => (
              <RiskRow key={r.key} risk={r} />
            ))}
          </ul>
        </div>
      </Reveal>

    </main>
  )
}

export function HomeView() {
  const [searching, setSearching] = useState(false)
  return (
    <>
      <HomeBanner onSearch={() => setSearching(true)} />
      <HomeSections />
      {searching && <ModuleSearch onClose={() => setSearching(false)} />}
    </>
  )
}
