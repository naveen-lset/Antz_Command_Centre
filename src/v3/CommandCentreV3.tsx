import { useEffect, useRef, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { greetingFor, useNow } from '../hooks/useNow'
import { ModuleSearch } from './search'
import forestScene from '../assets/forest-scene.webp'
import { PeriodBar, PeriodProvider, useByPeriod, useFigure, usePeriod, pick } from '../exec/period'
import { GROUND_GRADIENT } from '../exec/system'
import { useCountUp } from '../hooks/useCountUp'
import {
  clinical,
  hero,
  lifeEvents,
  mainPair,
  movement,
  operations,
  population,
  preventive,
  site,
  trends,
} from './data'
import type { DailyCardData, ModuleCardData, StatTileData } from './data'
import { ArcGauge, AreaMini, DotBars, MiniColumns, PulseLine, TrendLines } from './viz'

const VIZ = { dots: DotBars, pulse: PulseLine, area: AreaMini, cols: MiniColumns } as const

/**
 * The hero's deep-green gradient, clipped to the glyphs. Shared by the total and by
 * the sex split beneath it — one declaration, because two hand-copied gradients drift
 * the moment either is adjusted.
 */
const HERO_GRADIENT =
  'bg-[linear-gradient(180deg,#20291f_0%,#0a4d3c_62%,#034739_100%)] bg-clip-text text-transparent'

/** Paper surface — one warm tonal step above the ground. No border, no shadow. */
const CARD = 'rounded-[16px] bg-white'

/** Sign-based delta color: “+…” → brand green, “−…” → brand tertiary. */
const deltaColor = (text: string): string => {
  const t = text.trim()
  if (t.startsWith('+')) return '#37bd69'
  if (t.startsWith('-') || t.startsWith('−')) return '#fa6140'
  return '#9b958b'
}
/** Every card is a link into its drill-down page. */
const TAP = 'card-press block'

/** Faint birds over a warm mist — the header's whisper of wilderness. */
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

/** Soft personal greeting header with org switcher and the reporting window. */
function GreetingHeader({ onSearch }: { onSearch: () => void }) {
  const now = useNow(30_000)

  return (
    /* pb-4 rather than pb-6: the window chips moved out into their own pinned row
       below, which carries its own top padding. */
    <header className="relative px-5 pt-12 pb-4">
      <MistBackdrop />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[18px] text-[#6d6860]">{greetingFor(now)},</p>
          <h1 className="mt-0.5 text-[30px] leading-9 font-bold tracking-[-0.02em] text-[#1c1a16]">
            {site.userName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-[#3d3a34]">
            <MapPin size={14} strokeWidth={1.75} aria-hidden />
            {site.org}
          </p>
        </div>
        {/* Search, not a field across the header: the hero number is the first thing on
            this screen and a full-width input above it would take that place. Twenty
            modules is enough to need search, not enough to need it permanently open.
            The notification bell that sat beside it is gone — it was a dead affordance
            with no notifications behind it, and Alerts is a module on the screen. */}
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
 * The reporting window, pinned to the top of the screen.
 *
 * Sheet.tsx already says why: "the control that decides what every figure below
 * means must not scroll away from them." The home is twelve cards long, so a reader
 * four cards down had no way to see whether they were looking at a week or a year
 * without scrolling back. Now the two surfaces behave the same way.
 *
 * It sits as a direct child of the page root rather than inside the header, because
 * a sticky element can only travel as far as its own parent's box — nested in the
 * header it would unpin the moment the greeting scrolled past, which is the one
 * moment it needs to hold.
 *
 * The ground only appears once it actually pins. Painting a bar permanently would
 * lay a flat rectangle across the header gradient at rest, so a sentinel above it
 * reports the transition and the background, blur and hairline fade in together.
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
      {/* z-30 — under the drill-down sheet (z-40) and module search (z-50), over
          the card stack and the forest band. */}
      {/* 12px above and below the chips. The bottom 12 comes from `PeriodBar`'s own
          `pb-3`, so only the top is set here — adding padding at both ends of this
          element would double the gap underneath. */}
      <div className="sticky top-0 z-30 pt-[max(12px,env(safe-area-inset-top))]">
        {/*
         * The pinned wash is its own layer, for two reasons.
         *
         * It is a GRADIENT in the header's own light greens, not the flat ground
         * colour. Flat #e7f0ea pinned over a page whose top 880px is a green ramp
         * read as a pale rectangle laid across it — the bar looked stuck on rather
         * than part of the surface. These two stops are lifted from the first third
         * of that ramp, so the bar reads as the header continuing.
         *
         * And it fades via `opacity` rather than by toggling a background class,
         * because `background-image` does not interpolate — a gradient swapped on a
         * class would appear in one frame no matter what transition is declared.
         * Same reason the hairline lives here: it fades with the wash instead of
         * snapping in a frame ahead of it.
         */}
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
        <div className="relative mx-auto w-full max-w-[390px]">
          <PeriodBar tone="home" />
        </div>
      </div>
    </>
  )
}

/**
 * Full-bleed illustrated horizon.
 *
 * The reference artwork, recoloured into the app's sage palette and used as-is —
 * the drawing is not redrawn, reshaped or simplified. `tools/recolour-forest-scene.py`
 * is the transform: hue and saturation are mapped into the palette the rest of the
 * screen already uses, VALUE is preserved for every pixel, which is what keeps every
 * shape exactly as light or dark as it was drawn. The one warm accent that survives is
 * pink, on the flamingo and the hanging blossoms, because the app already carries it.
 *
 * It replaces an inline SVG horizon that was hand-drawn to approximate this.
 *
 * The scene is anchored to the BOTTOM and allowed to overflow upward behind the hero
 * rather than being cropped to the band's height. The artwork's top half is empty sky —
 * it was composed for content to sit in — so cropping it would have thrown away the
 * hanging vines and clouds for nothing. `-z-10` puts it behind the numbers, and the
 * mask fades its top edge into the header gradient so the two greens meet without a
 * seam. Layout only reserves the 168px the horizon itself occupies.
 */
function ForestBand() {
  return (
    <div className="relative -z-10 h-[168px] w-full">
      {/* `max-h` + `object-cover` is the guard for a wide viewport. At full viewport
          width with a natural aspect, a 1400px-wide window would scale the artwork to
          1050px tall and overflow most of that behind the page. Capped at 320 it crops
          horizontally instead — the same trade the inline SVG made with
          `preserveAspectRatio="xMidYMax slice"`. On a phone the cap never binds: 390px
          wide is 292px tall. */}
      <img
        src={forestScene}
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 max-h-[320px] w-full object-cover object-bottom select-none"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, #000 30%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 30%)',
        }}
      />
    </div>
  )
}

/**
 * Giant centered hero: the collection total and the gain inside the window.
 *
 * The Male / Female / Undetermined split that used to sit under it is gone. It is still
 * on the Animal Population page, in its own Sex card, which is where a three-way
 * breakdown belongs — under the headline it was answering a question nobody had asked
 * yet, and 84% of the answer was "Undetermined".
 */
function HeroBlock() {
  const gain = useByPeriod(hero.gain)
  const { period } = usePeriod()
  const value = useCountUp(hero.value, { format: (v) => Math.round(v).toLocaleString('en-US') })

  return (
    <section className="px-5 pt-5" aria-label="Zoo population">
      <a href={hero.href} className="card-press block">
        <p className={`${HERO_GRADIENT} text-center font-display text-[58px] leading-none font-bold tracking-[-0.02em]`}>
          {value}
        </p>
        <p className="mt-2 text-center text-[16px] text-[#1c1a16]">Total {hero.label}</p>
        {/* The total above is a standing figure; only this gain is cut. */}
        <p className="mt-1.5 text-center text-[12px] font-semibold text-[#37bd69]">
          ▲ {gain} {period.noun}
        </p>
      </a>
    </section>
  )
}

function DailyCard({ card, prominent = false }: { card: DailyCardData; prominent?: boolean }) {
  const value = useByPeriod(card.value)
  const delta = useFigure(card.delta)

  return (
    <a href={card.href} className={`${TAP} ${CARD} flex min-w-0 flex-col ${prominent ? 'p-5' : 'p-4'}`}>
      <div className="flex items-center gap-2">
        <card.icon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: card.accent }} aria-hidden />
        <span className="truncate text-[15px] font-medium text-[#1c1a16]">{card.title}</span>
      </div>
      {/* Reference anatomy (Figma 264:71): the delta reads with the number. */}
      <p
        className={`mt-3 flex items-baseline gap-1.5 font-display font-bold text-[#2f2424] ${prominent ? 'text-[38px] leading-11' : 'text-[30px] leading-9'}`}
      >
        {value}
        <span className="font-sans text-[13px] font-medium" style={{ color: deltaColor(delta) }}>
          {delta}
        </span>
        {card.unit && <span className="font-sans text-[13px] font-normal text-[#9b958b]">{card.unit}</span>}
      </p>
      <div className="mt-3" aria-hidden>
        {(() => {
          const Viz = VIZ[card.viz]
          return <Viz accent={card.accent} />
        })()}
      </div>
    </a>
  )
}

function ModuleCard({ card }: { card: ModuleCardData }) {
  const value = useFigure(card.value)
  const unit = useFigure(card.unit)

  return (
    <a href={card.href} className={`${TAP} ${CARD} flex w-full items-center gap-4 p-5`}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-medium text-[#1c1a16]">
          <card.icon size={16} strokeWidth={1.75} style={{ color: card.accent }} aria-hidden />
          {card.title}
        </span>
        <span className="mt-2 block font-display text-[28px] leading-8 font-bold text-[#2f2424]">
          {value} <span className="font-sans text-[13px] font-normal text-[#9b958b]">{unit}</span>
        </span>
      </span>
      {card.gauge ? (
        <ArcGauge fraction={card.gauge.fraction} label={card.gauge.label} />
      ) : (
        card.note && (
          <span className="shrink-0 text-[13px] font-medium" style={{ color: deltaColor(card.note) }}>
            {card.note}
          </span>
        )
      )}
    </a>
  )
}

/** Number-first tile, two to a row. */
function StatTile({ tile }: { tile: StatTileData }) {
  const value = useFigure(tile.value)
  const unit = useFigure(tile.unit)

  return (
    <a href={tile.href} className={`${TAP} ${CARD} flex min-w-0 flex-col p-4 ${tile.wide ? 'col-span-2' : ''}`}>
      <span className="flex items-center gap-2 text-[14px] font-medium text-[#1c1a16]">
        <tile.icon size={15} strokeWidth={1.75} className="shrink-0" style={{ color: tile.accent }} aria-hidden />
        <span className="truncate">{tile.title}</span>
      </span>
      <span className="mt-2.5 flex items-baseline justify-between gap-2 font-display text-[26px] leading-8 font-bold text-[#2f2424]">
        <span className="min-w-0 truncate">
          {value}
          <span className="ml-1 font-sans text-[12px] font-normal text-[#9b958b]">{unit}</span>
        </span>
        {tile.note && (
          <span className="shrink-0 font-sans text-[12px] font-medium" style={{ color: deltaColor(tile.note) }}>
            {tile.note}
          </span>
        )}
      </span>
    </a>
  )
}

/** Both preventive rates, each with the fraction it was computed from. */
function PreventiveCard() {
  return (
    <a href={preventive.href} className={`${TAP} ${CARD} block p-5`}>
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[15px] font-medium text-[#1c1a16]">
          <preventive.icon size={16} strokeWidth={1.75} style={{ color: preventive.accent }} aria-hidden />
          {preventive.title}
        </span>
        <span className="shrink-0 text-[13px] font-medium" style={{ color: '#fa6140' }}>
          {preventive.note}
        </span>
      </span>
      <div className="mt-4 flex">
        {preventive.rates.map((r, i) => (
          <span
            key={r.label}
            className={`flex min-w-0 flex-1 flex-col items-center ${i ? 'border-l border-[#f0efec]' : ''}`}
          >
            <ArcGauge fraction={r.percent / 100} label={`${r.percent}%`} accent={preventive.accent} />
            <span className="mt-2 block text-[13px] text-[#1c1a16]">{r.label}</span>
            <span className="mt-0.5 block text-[11px] tabular-nums text-[#9b958b]">
              {r.value} of {r.of}
            </span>
          </span>
        ))}
      </div>
    </a>
  )
}

/** Three series, one window — the point is that they line up. */
/**
 * Three series, one plot.
 *
 * This was three stacked rows of number-plus-sparkline. Two things were wrong with
 * it. Each sparkline auto-scaled to its own maximum, so a flat 1–2 deaths and a
 * climbing 2–6 cases were drawn the same height — the one thing the card exists to
 * show, whether they move together, was the one thing the layout denied. And the
 * plotted array never changed, so "Today's Trend" drew a month of shape.
 *
 * Now: one shared zero-based scale with the three lines overlaid, the figures as a
 * legend beneath, and the bucket width stated instead of an axis. On `today` the
 * plot is dropped — a single reading has no shape, and the three numbers standing
 * alone is both the honest form and the calmer one.
 */
function TrendsCard() {
  const { period } = usePeriod()
  const single = period.key === 'today'
  const series = trends.series.map((s) => ({ ...s, values: pick(s.values, period.key) }))

  return (
    <a href={trends.href} className={`${TAP} ${CARD} block p-5`}>
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[15px] font-medium text-[#1c1a16]">
          <trends.icon size={16} strokeWidth={1.75} style={{ color: trends.accent }} aria-hidden />
          {pick(trends.title, period.key)}
        </span>
        {/* The dates the buckets cover, replacing a fixed "Week 1 – 4" that was
            only ever true of the month. */}
        <span className="shrink-0 text-[12px] tabular-nums text-[#9b958b]">{period.window}</span>
      </span>

      {!single && (
        <div className="mt-4">
          <TrendLines series={series} />
        </div>
      )}

      {/* Legend on a flow, scoreboard on a single reading — same three figures, sized
          to how much room the card has left once the plot has or hasn't taken its. */}
      <div className={`flex items-stretch ${single ? 'mt-5' : 'mt-3.5 border-t border-[#f0efec] pt-3.5'}`}>
        {series.map((s, i) => (
          <span
            key={s.label}
            className={`min-w-0 flex-1 ${i ? 'border-l border-[#f0efec] pl-3' : ''} ${
              i < series.length - 1 ? 'pr-3' : ''
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: s.accent }} aria-hidden />
              <span className="truncate text-[11px] text-[#6d6860]">{s.label}</span>
            </span>
            <span
              className={`mt-1 block font-display font-bold tabular-nums text-[#2f2424] ${
                single ? 'text-[26px] leading-8' : 'text-[20px] leading-6'
              }`}
            >
              {pick(s.value, period.key)}
            </span>
          </span>
        ))}
      </div>

      {!single && (
        <p className="mt-2.5 text-[11px] text-[#9b958b]">{pick(trends.buckets, period.key)}</p>
      )}
    </a>
  )
}

/**
 * The home gets its own `PeriodProvider` rather than sharing the sheet's.
 *
 * The sheet's provider is keyed per module precisely so opening a page starts it on
 * its own default instead of inheriting "all time" from whatever was open before —
 * and the same reasoning applies in reverse. Reading the home cut to last week then
 * drilling into Mortality should land on Mortality's default window, not carry the
 * home's choice in. One window per surface, none of them leaking.
 */
export default function CommandCentreV3() {
  return (
    <PeriodProvider>
      <HomeBody />
    </PeriodProvider>
  )
}

function HomeBody() {
  const [searching, setSearching] = useState(false)

  return (
    <div className="relative isolate min-h-dvh font-sans" style={{ background: GROUND_GRADIENT }}>
      {/* Brand-green #034739 gradient — full-bleed, edge to edge, completing
          within the first screen: light at the very top → richest behind the
          hero → settling into the light-green ground */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[880px] bg-[linear-gradient(180deg,#cde4d8_0%,#b4d3c4_34%,#a0c8b5_56%,rgba(231,240,234,0)_100%)]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[390px]">
        <GreetingHeader onSearch={() => setSearching(true)} />
      </div>

      {/* Outside the 390px column so the pinned ground runs edge to edge, the way
          the forest band does — a bar that stopped at the column edge would read as
          a floating card rather than as the top of the screen. */}
      <StickyPeriod />

      <div className="mx-auto w-full max-w-[390px]">
        <HeroBlock />
      </div>

      {/* Background illustration — edge to edge */}
      <ForestBand />

      <div className="mx-auto w-full max-w-[390px]">
        {/* 16px gutters on the card stack — tighter than the header's 20px, so the
            cards sit slightly wider than the greeting and hero above them. */}
        {/* The report's sections, in the report's order, but no longer captioned.
            The numbered headings ("01 Animal Population", "02 Life Events") named
            groups whose cards already name themselves — seven labels for twelve
            cards, and each one pushed the next number further down the screen.
            Order still carries the report's structure; it just isn't announced. */}
        <main className="flex flex-col gap-3 px-4 pt-3 pb-[max(40px,env(safe-area-inset-bottom))]">
          <a href={population.href} className={`${TAP} ${CARD} block p-5`}>
            <span className="flex items-center gap-2 text-[15px] font-medium text-[#1c1a16]">
              <population.icon size={16} strokeWidth={1.75} style={{ color: population.accent }} aria-hidden />
              {population.title}
            </span>
            <div className="mt-3.5 flex items-stretch">
              {population.facts.map((f, i) => (
                <span
                  key={f.label}
                  className={`min-w-0 flex-1 ${i ? 'border-l border-[#f0efec] pl-3' : ''} ${
                    i < population.facts.length - 1 ? 'pr-3' : ''
                  }`}
                >
                  <span className="block font-display text-[22px] leading-7 font-bold tabular-nums text-[#2f2424]">
                    {f.value}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[#6d6860]">{f.label}</span>
                </span>
              ))}
            </div>
          </a>

          {/* Natality & Mortality — the headline pair */}
          <div className="grid grid-cols-2 gap-3">
            {mainPair.map((card) => (
              <DailyCard key={card.title} card={card} prominent />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {lifeEvents.map((tile) => (
              <StatTile key={tile.title} tile={tile} />
            ))}
          </div>

          {clinical.map((card) => (
            <ModuleCard key={card.title} card={card} />
          ))}

          <PreventiveCard />

          <ModuleCard card={movement} />

          <TrendsCard />

          {/* Below the report line. Nothing in this group is a monthly figure, so it is
              separated rather than ranked in among the sections above, and the window
              control does not reach it. The "Live queues · as of today" caption that
              explained that is gone: the rule and the word Operations already mark the
              break, and a second line under a divider is the caption explaining the
              caption. */}
          <div className="mt-4 flex items-center gap-3 px-1">
            <span className="h-px flex-1 bg-[#1c1a16]/8" aria-hidden />
            <h2 className="text-[11px] font-semibold tracking-[0.09em] text-[#6d6860] uppercase">Operations</h2>
            <span className="h-px flex-1 bg-[#1c1a16]/8" aria-hidden />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {operations.map((tile) => (
              <StatTile key={tile.title} tile={tile} />
            ))}
          </div>
        </main>
      </div>

      {searching && <ModuleSearch onClose={() => setSearching(false)} />}
    </div>
  )
}
