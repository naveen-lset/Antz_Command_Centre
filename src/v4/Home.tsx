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
import { ChevronRight, MapPin, Search } from 'lucide-react'
import { greetingFor, useNow } from '../hooks/useNow'
import { ModuleSearch } from './search'
import forestScene from '../assets/forest-scene.webp'
import { PeriodBar, useFigure, usePeriod } from '../exec/period'
import { useCountUp } from '../hooks/useCountUp'
import { Reveal } from '../motion'
import {
  ACCENT,
  ACCENT_INK,
  AccentProvider,
  FAINT,
  Figure,
  MUTED,
  Spark,
  SparkBars,
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
import {
  AlertPanel,
  ApprovalPanel,
  MeasurePanel,
  MetricPanel,
  RiskPanel,
  TrendPanel,
  UpcomingPanel,
  ZooHealthPanel,
} from './panels'

const CARD = 'rounded-[var(--radius-card)] bg-white'
const TAP = 'card-press block w-full text-left'

const HERO_GRADIENT =
  'bg-[linear-gradient(180deg,#20291f_0%,#0a4d3c_62%,#034739_100%)] bg-clip-text text-transparent'

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
        {/* 560, not 390. Five chips need about 500px; capped at a phone's width they
            scrolled horizontally on a 716px desktop column too, so the fifth window
            sat off the edge of a column with 200px to spare. The phone still scrolls,
            which is what the cap was for. */}
        <div className="relative mx-auto w-full max-w-[560px]">
          <PeriodBar tone="home" />
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
          rather than 30% so the hero has flat ground under it at every width. */}
      <img
        src={forestScene}
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 max-h-[clamp(230px,34cqw,340px)] w-full object-cover object-bottom select-none"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, #000 50%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 50%)',
        }}
      />
    </div>
  )
}

/**
 * The four composite scores, kept at the top of the screen.
 *
 * They used to live under the hero, as the breakdown of a Zoo Health headline. The
 * headline is the collection total again, so the scores need their own place — and
 * above the hero rather than below it is the right one: they are the standing answer
 * to "is anything wrong", read once on arrival, while the hero and the KPI row are
 * what a director actually came to read. A strip of four small figures reads in about
 * a second and then gets out of the way.
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
    <div className="px-[var(--gutter-lg)] pb-1">
      <button
        type="button"
        onClick={() =>
          open({
            title: 'Zoo Health',
            eyebrow: period.window,
            body: <ZooHealthPanel score={zooHealthScore} parts={zooHealth.parts} delta={delta} />,
          })
        }
        className="card-press flex w-full items-stretch rounded-[14px] bg-white/70 px-3 py-2.5 backdrop-blur-sm"
        aria-label={`Zoo health ${Math.round(zooHealthScore)} out of 100`}
      >
        {zooHealth.parts.map((p, i) => (
          <span
            key={p.label}
            className={`min-w-0 flex-1 ${i ? 'border-l border-[#1c1a16]/8 pl-3' : ''} ${
              i < zooHealth.parts.length - 1 ? 'pr-3' : ''
            }`}
          >
            <span className="block font-display text-[18px] leading-none font-bold tabular-nums text-[#2f2424]">
              {p.score}
            </span>
            <span className="mt-1 block truncate text-[10.5px] text-[#3d3a34]">{p.label}</span>
          </span>
        ))}
      </button>
    </div>
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
  const { open } = useSheet()
  const animals = headlineKpis[0]
  const gain = useFigure(animals.delta ?? '')
  const total = useCountUp(215432, { format: (v) => Math.round(v).toLocaleString('en-US') })

  return (
    <section className="px-[var(--gutter-lg)] pt-4" aria-label="Total animals">
      <button
        type="button"
        onClick={() =>
          open({
            title: animals.label,
            eyebrow: period.window,
            body: <MetricPanel metric={animals.drill!} />,
          })
        }
        className="card-press block w-full"
      >
        <p
          className={`${HERO_GRADIENT} text-center font-display text-[length:var(--fs-hero)] leading-none font-bold tracking-[-0.02em]`}
        >
          {total}
        </p>
        <p className="mt-2 text-center text-[16px] text-[#1c1a16] @[900px]:text-[18px]">Total Animals</p>
        {/* The total above is a standing figure; only this gain is cut by the window. */}
        <p className="mt-1.5 text-center text-[length:var(--fs-cap)] font-semibold text-[#37bd69]">
          ▲ {gain} {period.noun}
        </p>
      </button>
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
      <ScoreStrip />
      <StickyPeriod />
      <HeroBlock />
      <ForestBand />
    </div>
  )
}

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
  const { open } = useSheet()
  const { period } = usePeriod()
  const value = useFigure(kpi.value)
  const delta = useFigure(kpi.delta ?? '')
  const colour = kpi.tone && kpi.tone !== 'good' ? TONE[kpi.tone] : ACCENT

  return (
    <button
      type="button"
      onClick={() => open({ title: kpi.label, eyebrow: period.window, body: <MetricPanel metric={kpi.drill!} /> })}
      className={`${TAP} ${CARD} flex min-w-0 shrink-0 basis-[78%] snap-start flex-col p-[var(--pad-card)] @[640px]:basis-auto`}
    >
      {/* The label WRAPS rather than truncates. Four cards across a 716px content
          column leaves each about 113px of inner width, and "Animal Population" needs
          ~131px with its glyph — truncated to "Animal Popu…" it names nothing. Grid
          rows size to the tallest card, so a second line stays aligned. */}
      <span className="flex items-start gap-1.5">
        <kpi.icon size={15} strokeWidth={1.75} className="mt-[2px] shrink-0" style={{ color: colour }} aria-hidden />
        <span className="min-w-0 text-[length:var(--fs-label)] leading-[17px] font-medium text-balance text-[#1c1a16]">
          {kpi.label}
        </span>
      </span>
      <span className="mt-2.5 block">
        <Figure value={value} size={34} color={kpi.tone && kpi.tone !== 'good' ? TONE[kpi.tone] : undefined} />
      </span>
      <span className="mt-1 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] text-[#9b958b]">{kpi.note}</span>
        {delta && (
          <span className="shrink-0 text-[11.5px] font-semibold tabular-nums" style={{ color: signTone(delta) ?? FAINT }}>
            {delta}
          </span>
        )}
      </span>
      {/* Tinted by putting the tone on the accent context rather than by threading a
          colour prop through two shared marks.

          Always twelve months, whatever the window chip above says. The graph is the
          long view, and a backdrop that re-cut every time the figure did would leave
          nothing stable to read the figure against. */}
      <span className="mt-3.5 block" aria-hidden>
        <AccentProvider value={colour}>
          {kpi.chart === 'bars' ? <SparkBars values={[...kpi.series]} /> : <Spark values={[...kpi.series]} h={34} />}
        </AccentProvider>
      </span>
      <span className="mt-1.5 block text-[10px] tracking-[0.06em] text-[#b3aea6] uppercase">12 months</span>
    </button>
  )
}

/**
 * ONE ROW, as Apple Health's Highlights are one row.
 *
 * Four cards will not fit legibly across 390px — that is 97px each, narrower than
 * "215,432" — so on a phone the row scrolls sideways with snap points and the next
 * card peeking, with dots underneath saying how many there are. The peek is the whole
 * affordance: a row that ends flush at the screen edge looks finished, and nobody
 * swipes something that looks finished.
 *
 * Past 640px of column the scroll is dropped and all four sit in a static row.
 * Measured off the COLUMN, not the window — see the note in `index.css`.
 */
function KpiRail() {
  const rail = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [scrollable, setScrollable] = useState(false)

  useEffect(() => {
    const el = rail.current
    if (!el) return
    /* The dots are shown only when the row can actually move. Past the breakpoint it
       is a grid, and four dots under a static row would be an affordance for a gesture
       that does nothing. */
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 4)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() =>
        setActive(Math.round(el.scrollLeft / (el.scrollWidth / headlineKpis.length))),
      )
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div>
      {/* Negative margin then matching padding, so the row bleeds to the screen edge
          while the first card still starts on the stack's gutter. Without it the last
          card stops 16px short and the row reads as ending there. */}
      <div
        ref={rail}
        className="-mx-[var(--gutter)] flex snap-x snap-mandatory gap-[var(--gap)] overflow-x-auto px-[var(--gutter)] pb-1 scrollbar-hidden @[640px]:mx-0 @[640px]:grid @[640px]:snap-none @[640px]:grid-cols-4 @[640px]:overflow-visible @[640px]:px-0"
      >
        {headlineKpis.map((k) => (
          <HeadlineCard key={k.key} kpi={k} />
        ))}
      </div>
      {scrollable && (
        <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden>
          {headlineKpis.map((k, i) => (
            <span
              key={k.key}
              className="size-[5px] rounded-full transition-colors duration-200"
              style={{ backgroundColor: i === active ? ACCENT : 'rgba(28,26,22,0.16)' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** The supporting six — the same tile, no graph, quieter. */
function KpiTile({ kpi }: { kpi: Kpi }) {
  const { open } = useSheet()
  const { period } = usePeriod()
  const value = useFigure(kpi.value)
  const delta = useFigure(kpi.delta ?? '')
  const measure = executiveHealth.find((m) => m.key === kpi.measure)

  const onOpen = kpi.drill
    ? () => open({ title: kpi.label, eyebrow: period.window, body: <MetricPanel metric={kpi.drill!} /> })
    : measure
      ? () => open({ title: measure.label, eyebrow: measure.targetLabel, body: <MeasurePanel measure={measure} /> })
      : undefined

  const inner = (
    <>
      <span className="flex items-center gap-1.5">
        <kpi.icon size={14} strokeWidth={1.75} style={{ color: ACCENT }} aria-hidden />
        <span className="min-w-0 truncate text-[length:var(--fs-micro)] font-medium text-[#6d6860]">{kpi.label}</span>
      </span>
      {/* 26, not 30. At six columns a KPI cell is ~125px of inner width and
          "215,432" is about 3.8em wide — at 30pt with the tier multiplier on top it
          printed straight over the card's own edge. The scale variable still grows it
          per tier; this is the base it grows from. */}
      <span className="mt-2 flex items-baseline gap-1">
        <Figure
          value={value}
          unit={kpi.unit}
          size={26}
          color={kpi.tone && kpi.tone !== 'good' ? TONE[kpi.tone] : undefined}
        />
      </span>
      <span className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[10.5px] text-[#9b958b]">{kpi.note ?? ' '}</span>
        {delta && (
          <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: signTone(delta) ?? FAINT }}>
            {delta}
          </span>
        )}
      </span>
    </>
  )

  const classes = `${TAP} ${CARD} flex min-w-0 flex-col p-[var(--pad-card-sm)]`
  return onOpen ? (
    <button type="button" onClick={onOpen} className={classes}>
      {inner}
    </button>
  ) : (
    <a href={kpi.href} className={classes}>
      {inner}
    </a>
  )
}

function KpiGrid() {
  return (
    /* Six tiles, so every column count divides them exactly and no tile is ever left
       alone on the last row: two, three, six. Measured off the COLUMN, not the window
       — with a sidebar and a panel flanking it, a 1280 desktop hands this stack less
       width than a tablet landscape does. See the note in `index.css`. */
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
      <span className="shrink-0 font-display text-[24px] leading-none font-bold tabular-nums" style={{ color: TONE[tone] }}>
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
        <Figure value={String(group.requests.length)} size={26} />
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
                <span className="shrink-0 text-[14px] font-medium tabular-nums text-[#2f2424]">{compact(count)}</span>
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
        <Figure value={measure.value} unit={measure.unit} size={34} color={TONE[measure.tone]} />
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
        <span className="shrink-0 text-[16px] font-semibold tabular-nums" style={{ color: TONE[tone] }}>
          {risk.value}
        </span>
        <ChevronRight size={13} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
      </button>
    </li>
  )
}

/* ── 7 · trends ──────────────────────────────────────────────────────────── */

function TrendTile({ card }: { card: (typeof trends)[number] }) {
  const { open } = useSheet()
  const colour = card.tone === 'neutral' ? '#6d6860' : TONE[card.tone]
  return (
    <button
      type="button"
      onClick={() => open({ title: card.label, eyebrow: '12 months', body: <TrendPanel card={card} /> })}
      className={`${TAP} ${CARD} flex min-w-0 flex-col p-[var(--pad-card-sm)]`}
    >
      <span className="flex items-center gap-1.5">
        <card.icon size={14} strokeWidth={1.75} style={{ color: ACCENT }} aria-hidden />
        <span className="min-w-0 truncate text-[length:var(--fs-micro)] font-medium text-[#6d6860]">{card.label}</span>
      </span>
      <span className="mt-2 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate font-display text-[length:var(--fs-fig-xs)] leading-none font-bold tabular-nums text-[#2f2424]">
          {card.value}
        </span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: colour }}>
          {card.delta}
        </span>
      </span>
      {/* `Spark` from the design system, tinted by putting the tone on the accent
          context rather than by adding a colour prop to a shared component.

          It scales to the SERIES' OWN RANGE, unlike the `Trend` in the sheet which is
          zero-based with a real axis — and that difference is deliberate. Animal
          population runs 212,040 → 215,432; zero-based, that is a dead flat line
          under a large filled slab, which is a truthful chart and a useless glyph.
          A sparkline's job beside a stated number is shape; the readable scale
          belongs on the chart that carries an axis to read it against. */}
      <span className="mt-2.5 block" aria-hidden>
        <AccentProvider value={colour}>
          <Spark values={card.values} />
        </AccentProvider>
      </span>
    </button>
  )
}

/* ── the page ────────────────────────────────────────────────────────────── */

export function HomeSections() {
  return (
    <main className="flex flex-col gap-[var(--gap)] px-[var(--gutter)] pt-3 pb-[max(40px,env(safe-area-inset-bottom))]">
      <SectionHead icon={SECTION_ICONS.kpis} title="Executive KPIs" aside="10 measures" />
      <Reveal>
        <KpiRail />
      </Reveal>
      <Reveal>
        <KpiGrid />
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

      <SectionHead icon={SECTION_ICONS.trends} title="Trends" aside="12 months" />
      <Reveal>
        <div className="grid grid-cols-2 gap-[var(--gap)] @[520px]:grid-cols-4">
          {trends.map((t) => (
            <TrendTile key={t.key} card={t} />
          ))}
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
