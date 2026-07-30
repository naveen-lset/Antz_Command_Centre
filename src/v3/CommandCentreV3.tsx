import { Bell, ChevronDown, ChevronRight } from 'lucide-react'
import { greetingFor, useNow } from '../hooks/useNow'
import { useCountUp } from '../hooks/useCountUp'
import { dailyUpdates, hero, mainPair, moduleCards, moreModules, site, welfare } from './data'
import type { DailyCardData, ModuleCardData } from './data'
import { ArcGauge, DotBars, PulseLine } from './viz'

/** Paper surface — one warm tonal step above the ground. No border, no shadow. */
const CARD = 'rounded-[16px] bg-[#fbfaf7]'

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

/** Soft personal greeting header with org switcher. */
function GreetingHeader() {
  const now = useNow(30_000)

  return (
    <header className="relative px-5 pt-12 pb-6">
      <MistBackdrop />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] text-[#6d6860]">{greetingFor(now)},</p>
          <h1 className="mt-0.5 text-[30px] leading-9 font-bold tracking-[-0.02em] text-[#1c1a16]">
            {site.userName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1.5 flex items-center gap-1 text-[14px] font-medium text-[#3d3a34]">
            {site.org}
            <ChevronDown size={14} strokeWidth={2} className="text-[#9b958b]" aria-hidden />
          </p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#fbfaf7]" aria-hidden>
          <Bell size={18} strokeWidth={1.75} className="text-[#1c1a16]" />
        </span>
      </div>

    </header>
  )
}

/**
 * Full-bleed illustrated horizon — zoo forest in tints of the brand green.
 * Background art, not a card: hills, tree line, a stream, animal silhouettes.
 */
function ForestBand() {
  return (
    <svg viewBox="0 0 390 130" className="block h-[150px] w-full" aria-hidden preserveAspectRatio="xMidYMax slice">
      <g fill="#f2f7f2" opacity={0.5}>
        <ellipse cx={64} cy={16} rx={16} ry={6.5} />
        <ellipse cx={79} cy={13} rx={10} ry={5} />
        <ellipse cx={296} cy={10} rx={12} ry={5} opacity={0.7} />
      </g>
      <g fill="none" stroke="#5d8271" strokeWidth={1.2} strokeLinecap="round" opacity={0.7}>
        <path d="M150 22 c2 -3 4 -3 5 -1 c1 -2 3 -2 5 1" />
        <path d="M176 29 c1.5 -2.2 3 -2.2 3.7 -0.7 c0.7 -1.5 2.2 -1.5 3.7 0.7" />
      </g>
      {/* far hills */}
      <path d="M0 62 Q70 44 140 58 T270 54 Q330 50 390 60 L390 130 L0 130 Z" fill="#b6d4c5" />
      {/* tree line */}
      <path
        d="M0 78 Q15 66 30 76 Q42 64 58 74 Q70 62 86 74 Q100 66 112 76 Q128 62 144 74 Q158 66 172 76 Q186 64 202 74 Q214 66 228 76 Q244 62 258 74 Q272 66 286 76 Q300 64 316 74 Q330 66 344 76 Q360 64 390 76 L390 130 L0 130 Z"
        fill="#a2c9b6"
      />
      {/* conifers */}
      <g fill="#86b39c">
        <path d="M40 84 l7 -20 7 20 Z" />
        <path d="M226 82 l6 -17 6 17 Z" />
        <path d="M336 84 l7 -19 7 19 Z" />
      </g>
      {/* foreground ground */}
      <path d="M0 96 Q90 88 180 94 T390 92 L390 130 L0 130 Z" fill="#8fbaa5" />
      {/* stream */}
      <path d="M158 96 C168 104 154 112 174 130 L140 130 C148 112 142 102 148 97 Z" fill="#d9ece2" opacity={0.8} />

      {/* elephant */}
      <g fill="#3a5f50">
        <rect x={58} y={86} width={34} height={18} rx={9} />
        <circle cx={94} cy={92} r={9} />
        <circle cx={90} cy={91} r={5} fill="#48705f" />
        <rect x={62} y={100} width={5} height={14} rx={2} />
        <rect x={72} y={100} width={5} height={14} rx={2} />
        <rect x={83} y={100} width={5} height={14} rx={2} />
        <path d="M101 96 q7 5 5 15" fill="none" stroke="#3a5f50" strokeWidth={4} strokeLinecap="round" />
        <path d="M58 90 l-5 6" fill="none" stroke="#3a5f50" strokeWidth={2} strokeLinecap="round" />
      </g>

      {/* deer */}
      <g fill="#3a5f50" stroke="#3a5f50" strokeLinecap="round">
        <rect x={182} y={92} width={16} height={9} rx={4.5} stroke="none" />
        <circle cx={201} cy={88} r={3.5} stroke="none" />
        <path d="M197 94 l3 -5" strokeWidth={3.5} fill="none" />
        <rect x={184} y={99} width={2.5} height={13} rx={1.2} stroke="none" />
        <rect x={193} y={99} width={2.5} height={13} rx={1.2} stroke="none" />
        <path d="M201 85 l1.5 -4 M202 85.5 l3 -3" strokeWidth={1.1} fill="none" />
      </g>

      {/* giraffe */}
      <g fill="#3a5f50">
        <rect x={287} y={84} width={26} height={14} rx={7} />
        <rect x={291} y={94} width={3.5} height={20} rx={1.7} />
        <rect x={305} y={94} width={3.5} height={20} rx={1.7} />
        <path d="M311 88 L325 58" fill="none" stroke="#3a5f50" strokeWidth={5} strokeLinecap="round" />
        <circle cx={326} cy={56} r={4} />
        <path d="M324 52 l-1 -4 M328 52 l1 -4" fill="none" stroke="#3a5f50" strokeWidth={1.5} strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** Giant centered hero. */
function HeroBlock() {
  const value = useCountUp(hero.value, { format: (v) => Math.round(v).toLocaleString('en-US') })

  return (
    <section className="px-5 pt-9" aria-label="Zoo population">
      <a href={hero.href} className="card-press block">
        <p className="text-center font-display text-[58px] leading-none font-bold tracking-[-0.02em] text-[#1c1a16]">
          {value}
        </p>
        <p className="mt-2 flex items-center justify-center gap-1 text-[16px] text-[#6d6860]">
          {hero.label}
          <ChevronRight size={15} strokeWidth={2} className="text-[#9b958b]" aria-hidden />
        </p>
        <p className="mt-1.5 text-center text-[12px] font-medium" style={{ color: deltaColor(hero.delta) }}>
          ▲ {hero.delta}
        </p>
      </a>
    </section>
  )
}

function DailyCard({ card, prominent = false }: { card: DailyCardData; prominent?: boolean }) {
  return (
    <a href={card.href} className={`${TAP} ${CARD} flex min-w-0 flex-col ${prominent ? 'p-5' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-[#1c1a16]">
          <card.icon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: card.accent }} aria-hidden />
          <span className="truncate">{card.title}</span>
        </span>
        <span className="shrink-0 text-[12px] font-medium" style={{ color: deltaColor(card.delta) }}>
          {card.delta}
        </span>
      </div>
      <p
        className={`mt-4 font-semibold text-[#1c1a16] ${prominent ? 'text-[38px] leading-11' : 'text-[30px] leading-9'}`}
      >
        {card.value}
        {card.unit && <span className="ml-1 text-[12px] font-normal text-[#9b958b]">{card.unit}</span>}
      </p>
      <div className="mt-3" aria-hidden>
        {card.viz === 'dots' ? <DotBars accent={card.accent} /> : <PulseLine accent={card.accent} />}
      </div>
    </a>
  )
}

function ModuleCard({ card }: { card: ModuleCardData }) {
  return (
    <a href={card.href} className={`${TAP} ${CARD} flex w-full items-center gap-4 p-5`}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-medium text-[#1c1a16]">
          <card.icon size={16} strokeWidth={1.75} style={{ color: card.accent }} aria-hidden />
          {card.title}
        </span>
        <span className="mt-2 block text-[28px] leading-8 font-semibold text-[#1c1a16]">
          {card.value} <span className="text-[13px] font-normal text-[#9b958b]">{card.unit}</span>
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

export default function CommandCentreV3() {
  return (
    <div className="relative isolate min-h-dvh bg-[#e7f0ea] font-sans">
      {/* Brand-green #034739 gradient — full-bleed, edge to edge, completing
          within the first screen: light at the very top → richest behind the
          hero → settling into the light-green ground */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[880px] bg-[linear-gradient(180deg,#cde4d8_0%,#b4d3c4_34%,#a0c8b5_56%,rgba(231,240,234,0)_100%)]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[430px]">
        <GreetingHeader />
        <HeroBlock />
      </div>

      {/* Background illustration — edge to edge */}
      <ForestBand />

      <div className="mx-auto w-full max-w-[430px]">
        <main className="flex flex-col gap-3 px-5 pt-6 pb-[max(40px,env(safe-area-inset-bottom))]">
          {/* Natality & Mortality — the headline pair */}
          <div className="grid grid-cols-2 gap-3">
            {mainPair.map((card) => (
              <DailyCard key={card.title} card={card} prominent />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {dailyUpdates.map((card) => (
              <DailyCard key={card.title} card={card} />
            ))}
          </div>

          <a href={welfare.href} className={`${TAP} ${CARD} flex items-center justify-between gap-4 p-5`}>
            <div>
              <p className="flex items-center gap-2 text-[15px] font-medium text-[#1c1a16]">
                <welfare.icon size={16} strokeWidth={1.75} style={{ color: welfare.accent }} aria-hidden />
                {welfare.title}
              </p>
              <p className="mt-1.5 text-[11px] text-[#6d6860]">{welfare.sub}</p>
            </div>
            <p className="text-[30px] leading-9 font-semibold text-[#1c1a16]">
              {welfare.value}
              <span className="text-[13px] font-normal text-[#9b958b]">{welfare.of}</span>
            </p>
          </a>

          {moduleCards.map((card) => (
            <ModuleCard key={card.title} card={card} />
          ))}

          {/* Everything else — number-first stat tiles, 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {moreModules.map((m) => (
              <a key={m.title} href={m.href} className={`${TAP} ${CARD} flex min-w-0 flex-col p-4`}>
                <span className="flex items-start justify-between">
                  <span
                    className="grid size-9 place-items-center rounded-xl"
                    style={{ backgroundColor: `color-mix(in oklab, ${m.accent} 10%, #fbfaf7)` }}
                  >
                    <m.icon size={17} strokeWidth={1.75} style={{ color: m.accent }} aria-hidden />
                  </span>
                  <ChevronRight size={15} strokeWidth={2} className="mt-1 text-[#9b958b]" aria-hidden />
                </span>
                <span className="mt-4 text-[30px] leading-9 font-semibold text-[#1c1a16]">
                  {m.value}
                  <span className="ml-1 text-[12px] font-normal text-[#9b958b]">{m.unit}</span>
                </span>
                <span className="mt-0.5 truncate text-[13px] text-[#6d6860]">{m.title}</span>
              </a>
            ))}
          </div>

          <footer className="flex items-center justify-center gap-3 pt-6 text-[12px] text-[#9b958b]">
            <span>ANTZ Command Centre</span>
            <span aria-hidden>·</span>
            <a href="#/feed" className="underline-offset-2 hover:underline">
              Feed concept
            </a>
            <span aria-hidden>·</span>
            <a href="#/classic" className="underline-offset-2 hover:underline">
              Classic
            </a>
          </footer>
        </main>
      </div>
    </div>
  )
}
