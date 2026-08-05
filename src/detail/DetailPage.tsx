/**
 * One renderer for all 14 ANTZ drill-down pages.
 *
 * Layout is a bottom sheet over the home screen — 20px top corners, full-bleed
 * width, dragged down or closed to dismiss. The close bar and
 * the hero KPI sit on white chrome; the sections sit on the home screen's warm
 * ground below it, so colour comes only from the data.
 *
 * Inside the sheet the page speaks the home screen's language exactly: floating
 * white `rounded-[16px]` cards, titles inside the card at 15px, big numbers at
 * 30px, the same dashed `ArcGauge`, the same tinted icon chips.
 *
 * Section order is fixed across every module: hero KPI → trend → quick summary →
 * category breakdown → distribution → performance → recent activity.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'
import { useTween } from '../hooks/useTween'
import { ArcGauge } from '../v3/viz'
import { AreaTrend, BarRows, Columns, Meter, MiniArea, ShareBar, TONE_COLOR, fmt, signColor } from './charts'
import { AnimatedValue, Reveal, usePlay, usePrefersReducedMotion, useScrollDriven } from './motion'
import type { DetailPageData, NamedValue, Section, SummaryItem, Tone } from './model'

/** Home screen card + tap affordance, verbatim. */
const CARD = 'rounded-[16px] bg-white shadow-[0_1px_3px_rgba(28,26,22,0.05)]'

const toneColor = (tone?: Tone) => TONE_COLOR[tone ?? 'neutral']
const tint = (accent: string, pct = 11) => `color-mix(in oklab, ${accent} ${pct}%, white)`

/** Sections that stagger their own children instead of fading in as one block. */
const SELF_STAGGERED = new Set<Section['kind']>(['summary', 'compare', 'ranked'])

/**
 * The sheet reads as three chapters rather than one long stack of cards: what the
 * number is, what it's made of, what just happened.
 */
const CHAPTERS = ['Overview', 'Breakdown', 'Activity'] as const

/**
 * Which chapter a section belongs to. The walk below only ever moves forward
 * through these, so a stray `summary` or `stat` in the middle of a page joins the
 * chapter it lands in instead of splitting it — three contiguous blocks, always,
 * and section order on the page is never rearranged.
 */
const CHAPTER_OF: Record<Section['kind'], number> = {
  trend: 0,
  summary: 0,
  share: 1,
  breakdown: 1,
  tabs: 1,
  columns: 1,
  gauges: 1,
  ranked: 1,
  compare: 1,
  stat: 1,
  rows: 2,
  timeline: 2,
  calendar: 2,
}

type Chapter = { name: string; items: { section: Section; index: number }[] }

function chaptersOf(sections: Section[]): Chapter[] {
  const blocks: Chapter[] = []
  let at = -1

  sections.forEach((section, index) => {
    const next = Math.max(at, CHAPTER_OF[section.kind])
    if (next !== at) {
      at = next
      blocks.push({ name: CHAPTERS[at], items: [] })
    }
    blocks[blocks.length - 1].items.push({ section, index })
  })

  return blocks
}

/** Chapter label — the quiet rule that breaks the scroll into readable stretches. */
function ChapterHead({ name }: { name: string }) {
  return (
    <h2 className="px-1 pb-1 text-[11px] font-semibold tracking-[0.1em] text-[#5f6b62] uppercase">{name}</h2>
  )
}

/** Card title row — 15px medium ink, optional muted meta on the right. */
function CardHead({ title, meta, children }: { title: string; meta?: string; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 text-[15px] font-medium text-[#1c1a16]">{title}</span>
      {children ?? (meta && <span className="shrink-0 text-[12px] whitespace-nowrap text-[#9b958b]">{meta}</span>)}
    </div>
  )
}

function Card({ title, meta, children, head }: { title?: string; meta?: string; children: ReactNode; head?: ReactNode }) {
  return (
    <section className={`${CARD} p-5`}>
      {title && (
        <CardHead title={title} meta={meta}>
          {head}
        </CardHead>
      )}
      <div className={title ? 'mt-4' : undefined}>{children}</div>
    </section>
  )
}

function SummaryTiles({ items }: { items: SummaryItem[] }) {
  const three = items.length === 3

  return (
    <div className={`grid ${three ? 'grid-cols-3 gap-2.5' : 'grid-cols-2 gap-3'}`}>
      {items.map((item, i) => (
        <Reveal key={item.label} delay={i * 70} className="h-full">
          <div className={`${CARD} flex h-full min-w-0 flex-col p-4`}>
            <span className={`leading-tight ${three ? 'text-[13px]' : 'text-[15px]'} font-medium text-[#1c1a16]`}>
              {item.label}
            </span>
            <AnimatedValue
              value={item.value}
              className={`mt-2 block font-display font-bold text-[#2f2424] tabular-nums ${three ? 'text-[26px] leading-8' : 'text-[30px] leading-9'}`}
            />
            {item.note && (
              <span className="mt-1.5 flex items-center gap-1.5">
                {item.tone && (
                  <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: toneColor(item.tone) }} aria-hidden />
                )}
                <span className="truncate text-[11px]" style={{ color: signColor(item.note) ?? '#6d6860' }}>
                  {item.note}
                </span>
              </span>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  )
}

function Chips({
  labels,
  accent,
  active,
  onPick,
  small = false,
  fill = false,
}: {
  labels: string[]
  accent: string
  active: number
  onPick: (i: number) => void
  small?: boolean
  /** Stretch the track and split it evenly — for the sheet's chapter nav. */
  fill?: boolean
}) {
  const track = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  // The indicator measures the live button so it slides between segments of
  // different widths ("Site Wise" → "Enclosure Wise") without guessing.
  useEffect(() => {
    const el = track.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`)
    if (!el) return
    setPill({ left: el.offsetLeft, width: el.offsetWidth })
  }, [active, labels])

  /* A raised white segment on a grey track, the way iOS does it: the selection
     carries three signals at once — elevation, a hairline edge and a heavier
     label — so it never depends on a tint being noticed. The accent deliberately
     stays out of it; it belongs to the data and to the depth line just below. */
  return (
    <div
      ref={track}
      className={`relative flex gap-0 rounded-full p-[3px] select-none ${fill ? 'w-full' : 'shrink-0'} ${
        small || fill ? '' : 'max-w-full overflow-x-auto scrollbar-hidden'
      }`}
      /* The track keeps a whisper of the module hue so the control still belongs
         to the page; all the contrast comes from the white segment on top. */
      style={{ backgroundColor: `color-mix(in oklab, ${accent} 7%, #e8e6df)` }}
    >
      {pill && (
        <span
          className="absolute inset-y-[3px] rounded-full bg-white shadow-[0_1px_2px_rgba(28,26,22,0.14)] ring-1 ring-[#1c1a16]/[0.04] transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${pill.left - 3}px)`, width: pill.width }}
          aria-hidden
        />
      )}
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          data-chip={i}
          onClick={() => onPick(i)}
          aria-pressed={i === active}
          className={`relative z-10 rounded-full transition-colors duration-300 active:scale-95 ${
            fill ? 'flex-1 basis-0 py-[7px] text-[13px]' : 'shrink-0'
          } ${fill ? '' : small ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[12px]'} ${
            i === active ? 'font-semibold text-[#1c1a16]' : 'font-medium text-[#5f5a52]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function TabbedBreakdown({
  tabs,
  accent,
  unit,
}: {
  tabs: { label: string; items: NamedValue[] }[]
  accent: string
  unit?: string
}) {
  const [active, setActive] = useState(0)

  return (
    <div>
      <Chips labels={tabs.map((t) => t.label)} accent={accent} active={active} onPick={setActive} />
      <div className="mt-4">
        {/* Keyed on the tab so the bars re-grow into the new dimension. */}
        <BarRows key={active} items={tabs[active].items} accent={accent} unit={unit} />
      </div>
    </div>
  )
}

/** Trend card — the range chips zoom the same series to its trailing window. */
function TrendCard({ section, accent }: { section: Extract<Section, { kind: 'trend' }>; accent: string }) {
  const [active, setActive] = useState(0)
  const points = Math.min(section.ranges?.[active].points ?? section.values.length, section.values.length)
  const values = section.values.slice(-points)
  const xLabels = section.xLabels.slice(-points)

  return (
    <Card
      title={section.title}
      head={
        section.ranges ? (
          <Chips
            labels={section.ranges.map((r) => r.label)}
            accent={accent}
            active={active}
            onPick={setActive}
            small
          />
        ) : undefined
      }
    >
      <AreaTrend
        values={values}
        xLabels={xLabels}
        accent={accent}
        unit={section.unit}
        xSuffix={section.xSuffix}
        playKey={active}
      />
      {section.note && <p className="mt-4 text-[12px] leading-[18px] text-[#6d6860]">{section.note}</p>}
    </Card>
  )
}

/** Arc sweeps 0 → target and the label counts with it, once in view. */
function Gauge({ percent, label, note, accent }: { percent: number; label: string; note?: string; accent: string }) {
  const { ref, reduce, animate } = usePlay()
  const tweened = useTween(percent, { enabled: animate, duration: 1100 })
  /* Origin before the first intersection, not the destination — otherwise the arc
     paints full, then snaps to zero to sweep. Same reasoning as `AnimatedValue`. */
  const shown = reduce ? percent : animate ? tweened : 0

  return (
    <div ref={ref} className="flex min-w-0 flex-col items-center gap-2">
      <ArcGauge fraction={shown / 100} label={`${Math.round(shown)}%`} accent={accent} />
      <p className="text-center text-[13px] font-medium text-[#1c1a16]">{label}</p>
      {note && <p className="max-w-[130px] text-center text-[11px] leading-4 text-[#9b958b]">{note}</p>}
    </div>
  )
}

/** Section kinds that draw a chart and therefore get their own hue. */
const CHART_KINDS = new Set(['trend', 'share', 'breakdown', 'tabs', 'compare', 'columns', 'gauges', 'ranked', 'stat'])

/** Validated chart hues rotated across a page's graphs (dataviz palette checks). */
const CHART_HUES = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#0284c7', '#be123c', '#4d7c0f', '#4f46e5', '#e8590c']

/**
 * Every graph on a page gets its own hue: the first chart wears the module
 * accent, the rest rotate through CHART_HUES (skipping the page accent).
 * A section's explicit `accent` always wins. Non-chart sections keep the page accent.
 */
function sectionAccents(sections: Section[], pageAccent: string): string[] {
  const pool = CHART_HUES.filter((h) => h.toLowerCase() !== pageAccent.toLowerCase())
  let chart = 0
  return sections.map((section) => {
    if (section.accent) return section.accent
    if (!CHART_KINDS.has(section.kind)) return pageAccent
    const hue = chart === 0 ? pageAccent : pool[(chart - 1) % pool.length]
    chart += 1
    return hue
  })
}

function SectionView({ section, accent }: { section: Section; accent: string }) {
  switch (section.kind) {
    case 'trend':
      return <TrendCard section={section} accent={accent} />

    case 'summary':
      return <SummaryTiles items={section.items} />

    case 'share':
      return (
        <Card title={section.title} meta={section.note}>
          <ShareBar items={section.items} accent={accent} unit={section.unit} />
        </Card>
      )

    case 'breakdown':
      return (
        <Card title={section.title} meta={section.note}>
          <BarRows items={section.items} accent={accent} unit={section.unit} />
        </Card>
      )

    case 'tabs':
      return (
        <Card title={section.title}>
          <TabbedBreakdown tabs={section.tabs} accent={accent} unit={section.unit} />
        </Card>
      )

    case 'compare':
      return (
        <div className="grid grid-cols-2 gap-3">
          {section.cards.map((card, i) => (
            <Reveal key={card.label} delay={i * 80} className="h-full">
              <div className={`${CARD} flex h-full min-w-0 flex-col p-4`}>
                <span className="truncate text-[15px] font-medium text-[#1c1a16]">{card.label}</span>
                <AnimatedValue
                  value={card.value}
                  className="mt-2 block font-display text-[30px] leading-9 font-bold text-[#2f2424] tabular-nums"
                />
                <span className="mt-1 text-[11px] font-medium" style={{ color: signColor(card.delta) ?? toneColor(card.tone) }}>
                  {card.delta}
                </span>
                <div className="mt-3">
                  <MiniArea values={card.values} accent={accent} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )

    case 'columns':
      return (
        <Card title={section.title} meta={section.note}>
          <Columns values={section.values} xLabels={section.xLabels} accent={accent} highlight={section.highlight} />
        </Card>
      )

    case 'gauges':
      return (
        <Card title={section.title}>
          <div className="flex items-start justify-around gap-3">
            {section.items.map((g) => (
              <Gauge key={g.label} percent={g.percent} label={g.label} note={g.note} accent={accent} />
            ))}
          </div>
        </Card>
      )

    case 'ranked':
      return (
        <div>
          <Reveal>
            <h2 className="px-1 text-[15px] font-medium text-[#1c1a16]">{section.title}</h2>
          </Reveal>
          <div className="-mx-3.5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3.5 pb-1 scrollbar-hidden">
            {section.items.map((item, i) => (
              <Reveal key={item.label} delay={i * 70}>
                <div className={`card-press ${CARD} min-w-[168px] shrink-0 snap-start p-4`}>
                  <p className="text-[11px] font-medium text-[#9b958b] tabular-nums">{String(i + 1).padStart(2, '0')}</p>
                  <p className="mt-2 truncate text-[14px] font-medium text-[#1c1a16]">{item.label}</p>
                  <p className="truncate text-[11px] text-[#9b958b]">{item.sub}</p>
                  <AnimatedValue
                    value={item.value}
                    className="mt-3 block font-display text-[26px] leading-8 font-bold text-[#2f2424] tabular-nums"
                  />
                  <div className="mt-2.5">
                    <Meter percent={item.percent} accent={accent} delay={i * 70} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )

    case 'stat':
      return (
        <section className={`${CARD} p-5`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-[15px] font-medium text-[#1c1a16]">{section.title}</p>
            <p className="shrink-0 font-display text-[30px] leading-9 font-bold text-[#2f2424] tabular-nums">
              <AnimatedValue value={section.value} />
              {section.unit && <span className="ml-1 text-[13px] font-normal text-[#9b958b]">{section.unit}</span>}
            </p>
          </div>
          {section.percent !== undefined && (
            <div className="mt-4">
              <Meter percent={section.percent} accent={accent} />
            </div>
          )}
          {section.note && (
            <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-[18px] text-[#6d6860]">
              {section.tone && (
                <span
                  className="mt-[6px] size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: toneColor(section.tone) }}
                  aria-hidden
                />
              )}
              <span>{section.note}</span>
            </p>
          )}
        </section>
      )

    case 'rows':
      return <RowsCard section={section} />

    case 'timeline':
      return <TimelineCard section={section} accent={accent} />

    case 'calendar':
      return <CalendarCard section={section} accent={accent} />

  }
}

function RowsCard({ section }: { section: Extract<Section, { kind: 'rows' }> }) {
  const { ref, animate } = usePlay<HTMLUListElement>()

  return (
    <section className={`${CARD} px-5 py-5`}>
      <CardHead title={section.title} meta={section.meta} />
      <ul ref={ref} className="-mx-5 mt-2 divide-y divide-[#f4f3ef]">
        {section.items.map((item, i) => (
          <li
            key={`${item.label}-${item.sub}`}
            className={`flex items-center gap-3 px-5 py-3 transition-colors first:border-t first:border-[#f4f3ef] active:bg-[#faf9f7] ${
              animate ? 'animate-fade-up' : ''
            }`}
            style={animate ? { animationDelay: `${i * 55}ms` } : undefined}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                {item.tone && (
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: toneColor(item.tone) }}
                    aria-hidden
                  />
                )}
                <span className="truncate text-[14px] text-[#1c1a16]">{item.label}</span>
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-[#9b958b]">{item.sub}</span>
            </span>
            <span className="shrink-0 text-[12px] font-medium text-[#6d6860]">{item.value}</span>
            <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-[#9b958b]" aria-hidden />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The rail draws downward while each entry fades in beside it. */
function TimelineCard({ section, accent }: { section: Extract<Section, { kind: 'timeline' }>; accent: string }) {
  const { ref, animate } = usePlay<HTMLUListElement>()

  return (
    <Card title={section.title}>
      <ul ref={ref} className="flex flex-col">
        {section.items.map((item, i) => (
          <li key={`${item.time}-${i}`} className="flex gap-3">
            <span className="w-[54px] shrink-0 pt-[2px] text-right text-[11px] text-[#9b958b] tabular-nums">
              {item.time}
            </span>
            {/* The rail dot carries status when there is one — no second dot beside the tag. */}
            <span className="relative flex w-3 shrink-0 justify-center" aria-hidden>
              <span
                className={`mt-[6px] size-[7px] shrink-0 rounded-full ${animate ? 'animate-pop' : ''}`}
                style={{
                  backgroundColor: item.tone === 'bad' || item.tone === 'warn' ? toneColor(item.tone) : accent,
                  animationDelay: animate ? `${i * 90}ms` : undefined,
                }}
              />
              {i < section.items.length - 1 && (
                <span
                  className={`absolute top-[16px] bottom-0 w-px origin-top bg-[#f0efec] ${animate ? 'animate-grow-y' : ''}`}
                  style={animate ? { animationDelay: `${i * 90 + 60}ms` } : undefined}
                />
              )}
            </span>
            <span
              className={`min-w-0 flex-1 ${i < section.items.length - 1 ? 'pb-5' : ''} ${animate ? 'animate-fade-up' : ''}`}
              style={animate ? { animationDelay: `${i * 90 + 40}ms` } : undefined}
            >
              <span className="rounded-full bg-[#f4f3ef] px-2 py-[3px] text-[10px] font-medium text-[#6d6860]">
                {item.tag}
              </span>
              <span className="mt-1.5 block text-[13px] leading-[19px] text-[#3d3a34]">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function CalendarCard({ section, accent }: { section: Extract<Section, { kind: 'calendar' }>; accent: string }) {
  const { ref, animate } = usePlay<HTMLUListElement>()

  return (
    <Card title={section.title}>
      <ul ref={ref} className="flex flex-col gap-4">
        {section.items.map((item, i) => (
          <li
            key={`${item.date}-${item.label}`}
            className={`flex items-center gap-3.5 ${animate ? 'animate-fade-up' : ''}`}
            style={animate ? { animationDelay: `${i * 70}ms` } : undefined}
          >
            <span
              className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl"
              style={{ backgroundColor: tint(accent) }}
            >
              <span className="font-display text-[17px] leading-none font-bold text-[#1c1a16]">{item.date}</span>
              <span className="mt-0.5 text-[9px] font-medium tracking-[0.06em] text-[#6d6860]">{item.month}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-[#1c1a16]">{item.label}</span>
              <span className="mt-0.5 block truncate text-[11px] text-[#9b958b]">{item.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/**
 * Close bar on the sheet's white chrome. Once the hero scrolls away the eyebrow
 * collapses to the hero figure, so the page's headline number is never off-screen.
 */
function DetailHeader({
  page,
  heroValue,
  collapsed,
  onClose,
}: {
  page: DetailPageData
  heroValue: string
  collapsed: boolean
  onClose: () => void
}) {
  return (
    <header
      className="flex items-center gap-4 px-5 pt-1 pb-4 transition-shadow duration-500"
      /* A hairline appears only once content has scrolled up behind the bar. */
      style={{ boxShadow: `0 1px 0 rgba(28,26,22,${collapsed ? 0.07 : 0})` }}
    >
      <span className="animate-fade-up min-w-0 flex-1" style={{ animationDelay: '90ms' }}>
        <span
          key={collapsed ? 'kpi' : 'eyebrow'}
          className="animate-drop-in block truncate text-[11px] leading-4 font-medium tracking-[0.02em] text-[#6d6860]"
        >
          {collapsed ? `${heroValue} ${page.hero.label.toLowerCase()}` : 'Command Centre'}
        </span>
        <h1 className="mt-[3px] truncate text-[19px] leading-6 font-semibold tracking-[-0.015em] text-[#1c1a16]">
          {page.title}
        </h1>
      </span>
      <button
        type="button"
        onClick={onClose}
        className="card-press animate-pop grid size-10 shrink-0 place-items-center rounded-full bg-[#f4f3ef] transition-colors active:bg-[#eae7e0]"
        style={{ animationDelay: '160ms' }}
        aria-label="Close"
      >
        <X size={17} strokeWidth={2} className="text-[#3d3a34]" aria-hidden />
      </button>
    </header>
  )
}

/** Giant centered hero — same type and rhythm as the home screen's, settling in. */
function Hero({ page }: { page: DetailPageData }) {
  const counted = useCountUp(page.hero.value, { format: (v) => fmt(Math.round(v)) })
  const value = page.hero.display ?? counted

  return (
    <section className="px-5 pt-6" aria-label={page.hero.label}>
      <p className="animate-hero-in text-center font-display text-[58px] leading-none font-bold tracking-[-0.02em] text-[#2f2424]">
        {value}
      </p>
      <p className="animate-fade-up mt-2 text-center text-[16px] text-[#6d6860]" style={{ animationDelay: '150ms' }}>
        {page.hero.label}
      </p>
      <p className="animate-fade-up mt-1 text-center text-[12px] text-[#9b958b]" style={{ animationDelay: '230ms' }}>
        {page.hero.sub}
      </p>
      {page.hero.status && (
        /* A badge rather than a floating sentence — it reads as the module's state. */
        <p className="animate-fade-up mt-3 flex justify-center" style={{ animationDelay: '310ms' }}>
          <span
            className="rounded-full px-3 py-[5px] text-[12px] font-medium"
            style={{
              color: toneColor(page.hero.tone),
              backgroundColor: `color-mix(in oklab, ${toneColor(page.hero.tone)} 10%, white)`,
            }}
          >
            {page.hero.status}
          </span>
        </p>
      )}
    </section>
  )
}

/** Tracks the sheet's own scroller — the drill-down never scrolls the document. */
function useScrolledPastIn(ref: RefObject<HTMLElement | null>, threshold: number): boolean {
  const [past, setPast] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setPast(el.scrollTop > threshold))
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [ref, threshold])

  return past
}

/** Which chapter block the reader is currently inside, by scroll position. */
function useActiveChapter(scroller: RefObject<HTMLElement | null>, count: number): number {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const line = el.getBoundingClientRect().top + 96
        let current = 0
        el.querySelectorAll<HTMLElement>('[data-chapter]').forEach((block, i) => {
          if (block.getBoundingClientRect().top <= line) current = i
        })
        setActive(current)
      })
    }

    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [scroller, count])

  return active
}

/** How much of the home screen stays visible above the sheet. */
const PEEK = 'calc(env(safe-area-inset-top, 0px) + 44px)'
/** Drag past this and the sheet goes rather than springs back. */
const DISMISS_AT = 110

export default function DetailPage({
  page,
  others,
  onClose,
}: {
  page: DetailPageData
  others: { slug: string; title: string }[]
  onClose: () => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const collapsed = useScrolledPastIn(scroller, 148)
  const hero = useRef<HTMLDivElement>(null)
  const progress = useRef<HTMLSpanElement>(null)
  const reduce = usePrefersReducedMotion()

  /* Scroll-linked, written straight to the nodes: the hero sinks and dims as it
     leaves (handing off to the collapsed header) and a hairline tracks depth.
     Doing this in state would re-render the whole sheet on every frame. */
  useScrollDriven(scroller, (y) => {
    const el = scroller.current
    if (hero.current && !reduce) {
      const t = Math.min(y / 180, 1)
      hero.current.style.opacity = String(1 - t * 0.9)
      hero.current.style.transform = `translateY(${-y * 0.2}px) scale(${1 - t * 0.05})`
    }
    if (progress.current && el) {
      const max = el.scrollHeight - el.clientHeight
      progress.current.style.transform = `scaleX(${max > 8 ? Math.min(y / max, 1) : 0})`
    }
  })
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)
  const [dy, setDy] = useState(0)
  const [dragging, setDragging] = useState(false)
  const grab = useRef<{ id: number; y: number } | null>(null)

  // Rise into place on open. Two frames, so the closed transform paints first and
  // the transition actually has somewhere to travel from.
  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  // A module switch swaps content inside the same sheet — start it at the top.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
  }, [page.slug])

  // The home screen behind holds its scroll position while the sheet is up.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const close = useCallback(() => {
    setClosing(true)
    window.setTimeout(onClose, 260)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // The back chip and any control in the bar stay taps, not drags.
    if ((e.target as HTMLElement).closest('button, a')) return
    grab.current = { id: e.pointerId, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (grab.current?.id !== e.pointerId) return
    const moved = e.clientY - grab.current.y
    // Downward travels 1:1; pulling up meets resistance instead of a gap.
    setDy(moved > 0 ? moved : moved / 5)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (grab.current?.id !== e.pointerId) return
    grab.current = null
    setDragging(false)
    if (dy > DISMISS_AT) close()
    else setDy(0)
  }

  const away = !entered || closing
  const heroValue = page.hero.display ?? fmt(page.hero.value)
  const chapters = chaptersOf(page.sections)
  const activeChapter = useActiveChapter(scroller, chapters.length)

  /** Chapter chips jump the scroller to the block, measured live off the layout. */
  const jumpToChapter = (i: number) => {
    const el = scroller.current
    const block = el?.querySelectorAll<HTMLElement>('[data-chapter]')[i]
    if (!el || !block) return
    const top = block.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12
    el.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  }
  const accents = sectionAccents(page.sections, page.accent)

  return (
    <div className="fixed inset-0 z-40 font-sans" role="dialog" aria-modal="true" aria-label={page.title}>
      {/* Scrim over the home screen — lifts as the sheet is dragged down. */}
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute inset-0 size-full cursor-default bg-[#101a15] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: away ? 0 : Math.max(0, 0.22 * (1 - dy / 420)) }}
      />

      {/* Sheet spans the full phone width — only the ~44px top peek shows home. */}
      <div className="pointer-events-none absolute inset-0 mx-auto max-w-[390px]">
        <section
          className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-12px_44px_rgba(16,26,21,0.26)]"
          style={{
            top: PEEK,
            transform: away ? 'translateY(100%)' : `translateY(${dy}px)`,
            transition: dragging ? 'none' : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Grabber + close bar: the sheet's drag handle. */}
          <div
            className="relative z-10 shrink-0 touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="flex justify-center pt-2.5" aria-hidden>
              <span className="h-[5px] w-9 rounded-full bg-[#1c1a16]/12" />
            </div>
            <DetailHeader page={page} heroValue={heroValue} collapsed={collapsed} onClose={close} />

            {/* Chapter chips: where you are in the sheet, and a way to skip ahead.
                Same control as the trend ranges, so the sheet has one chip language. */}
            {chapters.length > 1 && (
              <nav className="px-5 pb-3" aria-label="Jump to section">
                <Chips
                  labels={chapters.map((c) => c.name)}
                  accent={page.accent}
                  active={activeChapter}
                  onPick={jumpToChapter}
                  fill
                />
              </nav>
            )}

            {/* Reading depth — the only thing on the page that tracks the finger. */}
            <span
              ref={progress}
              className="absolute inset-x-0 bottom-0 h-[2px] origin-left"
              style={{ backgroundColor: page.accent, opacity: 0.5, transform: 'scaleX(0)' }}
              aria-hidden
            />
          </div>

          <div
            ref={scroller}
            className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hidden"
          >
            <div key={page.slug} className="animate-swap-in">
              <div ref={hero} style={{ willChange: 'transform, opacity' }}>
                <Hero page={page} />
              </div>

            {/* The home screen's brand-green gradient, stretched over the sheet's whole
                scroll length — deepest around the middle, pale green at the very end, so
                no stretch of the sheet drops back to bare ground. */}
            <main
              className="mt-7 flex min-h-[70dvh] flex-col rounded-t-[20px] px-3.5 pt-5 pb-[max(40px,env(safe-area-inset-bottom))]"
              style={{
                backgroundColor: '#f4f3f0',
                backgroundImage:
                  'linear-gradient(180deg,#cde4d8 0%,#b4d3c4 30%,#a0c8b5 52%,#bfd9cb 76%,#dbe9e0 100%)',
              }}
            >
            {/* Cards sit close together inside a chapter and further apart between
                chapters, so the grouping is legible before you read a single label. */}
            {chapters.map((chapter, ci) => (
              <section
                key={chapter.name}
                data-chapter={chapter.name}
                className={`flex flex-col gap-2.5 ${ci ? 'mt-7' : ''}`}
                aria-label={chapter.name}
              >
                <Reveal>
                  <ChapterHead name={chapter.name} />
                </Reveal>
                {chapter.items.map(({ section, index }) =>
                  SELF_STAGGERED.has(section.kind) ? (
                    <SectionView key={`${section.kind}-${index}`} section={section} accent={accents[index]} />
                  ) : (
                    <Reveal key={`${section.kind}-${index}`}>
                      <SectionView section={section} accent={accents[index]} />
                    </Reveal>
                  ),
                )}
              </section>
            ))}

            <div className="mt-9">
              <ChapterHead name="More Modules" />
              <div className="-mx-3.5 mt-3 flex gap-2.5 overflow-x-auto px-3.5 pb-1 scrollbar-hidden">
                {others.map((o, i) => (
                  <Reveal key={o.slug} delay={i * 40}>
                    <a
                      href={`#/${o.slug}`}
                      className={`card-press ${CARD} block shrink-0 px-4 py-2.5 text-[12px] font-medium whitespace-nowrap text-[#3d3a34]`}
                    >
                      {o.title}
                    </a>
                  </Reveal>
                ))}
              </div>
            </div>

            <footer className="flex items-center justify-center gap-3 pt-6 text-[12px] text-[#9b958b]">
              <button type="button" onClick={close} className="underline-offset-2 hover:underline">
                ← ANTZ Command Centre
              </button>
            </footer>
              </main>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
