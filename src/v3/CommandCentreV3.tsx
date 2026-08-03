import { Bell, MapPin } from 'lucide-react'
import { greetingFor, useNow } from '../hooks/useNow'
import { useCountUp } from '../hooks/useCountUp'
import { dailyUpdates, hero, mainPair, moduleCards, moreModules, site, welfare } from './data'
import type { DailyCardData, ModuleCardData } from './data'
import { ArcGauge, AreaMini, DotBars, MiniColumns, PulseLine } from './viz'

const VIZ = { dots: DotBars, pulse: PulseLine, area: AreaMini, cols: MiniColumns } as const

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

/** Soft personal greeting header with org switcher. */
function GreetingHeader() {
  const now = useNow(30_000)

  return (
    <header className="relative px-5 pt-12 pb-6">
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
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#fbfaf7]" aria-hidden>
          <Bell size={18} strokeWidth={1.75} className="text-[#1c1a16]" />
        </span>
      </div>

    </header>
  )
}

/**
 * Full-bleed illustrated horizon — a flat-vector zoo forest in tints of the
 * brand green: layered hills, bushes, a stream with a flamingo, an elephant
 * with a raised trunk, an antlered deer, a patched giraffe, and foreground
 * foliage. Original art, tone-matched to the app background.
 */
function ForestBand() {
  return (
    <svg viewBox="0 0 390 160" className="block h-[160px] w-full" aria-hidden preserveAspectRatio="xMidYMax slice">
      {/* sun + clouds */}
      <circle cx={348} cy={22} r={13} fill="#f0e6c6" opacity={0.9} />
      <g fill="#f2f7f2" opacity={0.6}>
        <ellipse cx={330} cy={30} rx={14} ry={5} />
        <ellipse cx={62} cy={20} rx={16} ry={6} />
        <ellipse cx={77} cy={17} rx={10} ry={4.5} />
        <ellipse cx={210} cy={12} rx={12} ry={4.5} opacity={0.8} />
      </g>
      <g fill="none" stroke="#5d8271" strokeWidth={1.2} strokeLinecap="round" opacity={0.7}>
        <path d="M148 28 c2 -3 4 -3 5 -1 c1 -2 3 -2 5 1" />
        <path d="M172 34 c1.5 -2.2 3 -2.2 3.7 -0.7 c0.7 -1.5 2.2 -1.5 3.7 0.7" />
        <path d="M128 20 c1.2 -1.8 2.5 -1.8 3.1 -0.5 c0.6 -1.3 1.9 -1.3 3.1 0.5" />
      </g>
      {/* far hills */}
      <path d="M0 84 Q80 56 160 74 T320 64 Q360 60 390 68 L390 160 L0 160 Z" fill="#b9d6c7" />
      {/* tree line */}
      <path
        d="M0 96 Q15 84 30 94 Q42 82 58 92 Q70 80 86 92 Q100 84 112 94 Q128 80 144 92 Q158 84 172 94 Q186 82 202 92 Q214 84 228 94 Q244 80 258 92 Q272 84 286 94 Q300 82 316 92 Q330 84 344 94 Q360 82 390 94 L390 160 L0 160 Z"
        fill="#a2c9b6"
      />
      {/* conifers + bushes on the tree line */}
      <g fill="#86b39c">
        <path d="M36 102 l7 -22 7 22 Z" />
        <path d="M246 100 l6 -18 6 18 Z" />
        <path d="M352 102 l7 -20 7 20 Z" />
      </g>
      <g fill="#93bfa9">
        <circle cx={130} cy={100} r={9} />
        <circle cx={141} cy={102} r={7} />
        <circle cx={278} cy={100} r={8} />
        <circle cx={288} cy={102} r={6} />
      </g>
      {/* foreground ground */}
      <path d="M0 118 Q90 108 180 116 T390 112 L390 160 L0 160 Z" fill="#8fbaa5" />
      {/* stream */}
      <path d="M166 116 C176 126 160 138 182 160 L138 160 C150 138 146 126 154 117 Z" fill="#d9ece2" opacity={0.85} />

      {/* ground florets */}
      <g fill="#f6f4ea">
        <circle cx={120} cy={130} r={1.8} />
        <circle cx={124} cy={128} r={1.8} />
        <circle cx={122} cy={132.5} r={1.8} />
        <circle cx={253} cy={136} r={1.8} />
        <circle cx={257} cy={134} r={1.8} />
        <circle cx={255} cy={138.5} r={1.8} />
      </g>
      <circle cx={122} cy={130} r={1.2} fill="#e0c98f" />
      <circle cx={255} cy={136} r={1.2} fill="#e0c98f" />

      {/* Animals are drawn as one continuous silhouette per species — back, neck and
          head in a single path — so each reads as a real animal rather than a body
          box with a head circle stuck on. Far-side limbs sit a shade darker behind
          the body for depth; the whole cast stays in the scene's sage range. */}

      {/* elephant — domed back, ear, raised trunk */}
      <g>
        <g stroke="#3f6555" strokeWidth={8} strokeLinecap="round" fill="none">
          <path d="M57 120 L57 133" />
          <path d="M86 120 L86 133" />
        </g>
        <path
          d="M46 116 C44 104 52 97 64 96 C74 95 83 97 89 102 C92 97 99 94 105 97 C111 100 112 108 110 114
             C109 118 104 121 99 120 C96 124 94 126 90 126 C78 128 58 128 48 124 C45 121 45 118 46 116 Z"
          fill="#4a6f5f"
        />
        <g stroke="#4a6f5f" strokeWidth={9} strokeLinecap="round" fill="none">
          <path d="M67 121 L67 134" />
          <path d="M95 121 L95 134" />
        </g>
        {/* trunk, raised and tapering to the tip */}
        <path
          d="M108 112 C116 111 123 104 122 95 C121 89 116 86 112 88 C116 91 117 97 113 101 C110 105 106 107 103 108 Z"
          fill="#4a6f5f"
        />
        <path d="M90 100 C97 98 102 103 102 110 C102 116 98 121 92 120 C88 115 87 105 90 100 Z" fill="#35544a" />
        <path d="M101 118 C105 120 108 122 109 125" fill="none" stroke="#e9e5d4" strokeWidth={2.2} strokeLinecap="round" />
        <path d="M46 106 C41 110 40 116 42 121" fill="none" stroke="#4a6f5f" strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={42} cy={122} r={1.8} fill="#4a6f5f" />
        <circle cx={104} cy={105} r={1.3} fill="#17342a" />
      </g>

      {/* flamingo — slim body, S-neck, one leg cocked */}
      <g>
        <path d="M172 116 C172 121 171 126 171 130 M175.5 116 C177.5 120 175.5 124 173.5 129" fill="none" stroke="#b98891" strokeWidth={1.5} strokeLinecap="round" />
        <path d="M167 109 C163 107 160 108 158 110 C161 112 164.5 112.5 167 112 Z" fill="#d8a8b0" />
        <path d="M167 112 C166 107 171 103 176 105 C180 107 181 111 178 114 C174 117 169 116 167 112 Z" fill="#d8a8b0" />
        <path d="M169 112 C172 110 176 111 177 113 C174 116 170 115 169 112 Z" fill="#c294a0" />
        <path d="M177 106 C181 102 179 96 176 93 C173 90 175 86 179 85" fill="none" stroke="#d8a8b0" strokeWidth={2.6} strokeLinecap="round" />
        <circle cx={180} cy={84.5} r={2.8} fill="#d8a8b0" />
        <path d="M182.5 84 L187.5 86 L182.5 88 Z" fill="#35544a" />
        <circle cx={180} cy={83.6} r={0.8} fill="#17342a" />
      </g>

      {/* deer — body and near legs cut from one silhouette, antlers branched */}
      <g>
        <g fill="#3f6555">
          <path d="M226 112 L225.5 132 C225.5 135 222.5 135 222.5 132 L223 111 Z" />
          <path d="M208 112 L207.5 132 C207.5 135 204.5 135 204.5 132 L205 111 Z" />
        </g>
        <path
          d="M209 116 C206 112 205 106 209 103 C213 100 219 100 224 102 C227 103 229 100 231 97
             C233 94 234 91 236 89 C237 87 241 87 242 89 C244 91 247 93 248 95
             C248 97 246 98 243 97 C240 96 238 97 236 99 C234 102 233 106 232 110
             C232 113 231 115 231 117 L230.5 133 C230.5 136 227.5 136 227.5 133 L227 119
             C223 121 218 121 214 118 L213 133 C213 136 210 136 210 133 L209.5 117 Z"
          fill="#4a6f5f"
        />
        <path d="M235 90 C232 87 231 84 233 83 C235 84 236 87 236.5 89 Z" fill="#35544a" />
        <g stroke="#4a6f5f" strokeWidth={1.3} strokeLinecap="round" fill="none">
          <path d="M239 88 C238 83 236 79 234 76" />
          <path d="M236.5 81 C234.5 80 233 79 232 78" />
          <path d="M238 84.5 C236 83.5 234.5 83 233.5 82.5" />
          <path d="M241.5 88 C242.5 83 243.5 80 244.5 77" />
          <path d="M242.5 82 C244 81 245.5 80.5 246.5 80" />
        </g>
        <path d="M208 107 C205 108 204 111 206 113 C208 111 209 109 208 107 Z" fill="#d9ece2" opacity={0.55} />
        <circle cx={243} cy={93} r={1} fill="#17342a" />
      </g>

      {/* giraffe — sloping back, long neck, mane and patches */}
      <g>
        <g fill="#3f6555">
          <path d="M318.5 119 L318 136 C318 139 315 139 315 136 L315.5 118 Z" />
          <path d="M305 120 L304.5 136 C304.5 139 301.5 139 301.5 136 L302 119 Z" />
        </g>
        {/* the back slopes down from a high shoulder to a low rump, and the chest —
            the deepest part of the body — sits directly under the neck */}
        <path
          d="M297 116 C295 110 300 105 308 103 C314 101 318 100 321 101 C322 94 326 84 330 76
             C332 70 334 66 336 62 C337 58 341 57 343 59 C345 61 347 63 348 65
             C348 67 345 68 343 67 C341 72 337 80 334 89 C331 97 329 104 328 112
             C327 117 326 120 325 122 L324 137 C324 140 320.5 140 320.5 137 L320 121
             C313 124 306 124 301 121 L300.5 137 C300.5 140 297 140 297 137 L297.5 118 Z"
          fill="#4a6f5f"
        />
        <path d="M337 59 C334 57 333 54 335 53 C337 55 338 57 338 59 Z" fill="#35544a" />
        <path d="M322 96 C326 86 331 75 336 63" fill="none" stroke="#35544a" strokeWidth={2.4} strokeLinecap="round" />
        <g stroke="#4a6f5f" strokeWidth={1.5} strokeLinecap="round" fill="none">
          <path d="M339 57 L338 53" />
          <path d="M342.5 57.5 L343 53.5" />
        </g>
        <path d="M297 106 C293 110 292 116 294 120" fill="none" stroke="#4a6f5f" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={294} cy={121} r={1.5} fill="#4a6f5f" />
        <g fill="#35544a">
          <circle cx={305} cy={110} r={2.4} />
          <circle cx={312} cy={111} r={2} />
          <circle cx={318} cy={108} r={1.7} />
          <circle cx={308} cy={116} r={1.6} />
          <circle cx={328} cy={94} r={1.6} />
          <circle cx={332} cy={84} r={1.4} />
        </g>
        <circle cx={342} cy={63} r={1} fill="#17342a" />
      </g>

      {/* foreground foliage — corners */}
      <g fill="#5f8b76">
        <path d="M0 160 C6 132 20 120 34 122 C28 138 16 152 6 160 Z" />
        <path d="M390 160 C384 134 372 122 356 124 C362 140 376 154 386 160 Z" />
      </g>
      <g fill="#7fae97">
        <path d="M14 160 C22 140 34 132 46 134 C40 146 30 156 22 160 Z" />
        <path d="M376 160 C370 144 358 136 346 138 C352 150 362 158 370 160 Z" />
      </g>
      <g stroke="#a8cbb8" strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.8}>
        <path d="M10 156 C16 142 24 132 32 126" />
        <path d="M380 156 C374 142 366 132 360 127" />
      </g>
    </svg>
  )
}

/** Giant centered hero. */
function HeroBlock() {
  const value = useCountUp(hero.value, { format: (v) => Math.round(v).toLocaleString('en-US') })

  return (
    <section className="px-5 pt-5" aria-label="Zoo population">
      <a href={hero.href} className="card-press block">
        <p className="bg-[linear-gradient(180deg,#20291f_0%,#0a4d3c_62%,#034739_100%)] bg-clip-text text-center font-display text-[58px] leading-none font-bold tracking-[-0.02em] text-transparent">
          {value}
        </p>
        <p className="mt-2 text-center text-[16px] text-[#1c1a16]">Total {hero.label}</p>
        <p className="mt-1.5 text-center text-[12px] font-semibold text-[#37bd69]">▲ {hero.delta}</p>
      </a>
    </section>
  )
}

function DailyCard({ card, prominent = false }: { card: DailyCardData; prominent?: boolean }) {
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
        {card.value}
        <span className="font-sans text-[13px] font-medium" style={{ color: deltaColor(card.delta) }}>
          {card.delta}
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
  return (
    <a href={card.href} className={`${TAP} ${CARD} flex w-full items-center gap-4 p-5`}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-medium text-[#1c1a16]">
          <card.icon size={16} strokeWidth={1.75} style={{ color: card.accent }} aria-hidden />
          {card.title}
        </span>
        <span className="mt-2 block font-display text-[28px] leading-8 font-bold text-[#2f2424]">
          {card.value} <span className="font-sans text-[13px] font-normal text-[#9b958b]">{card.unit}</span>
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
      <div className="mx-auto w-full max-w-[390px]">
        <GreetingHeader />
        <HeroBlock />
      </div>

      {/* Background illustration — edge to edge */}
      <ForestBand />

      <div className="mx-auto w-full max-w-[390px]">
        {/* 16px gutters on the card stack — tighter than the header's 20px, so the
            cards sit slightly wider than the greeting and hero above them. */}
        <main className="flex flex-col gap-3 px-4 pt-3 pb-[max(40px,env(safe-area-inset-bottom))]">
          <h2 className="pt-1 text-[20px] font-semibold text-[#1c1a16]">Overview</h2>
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
            <p className="font-display text-[30px] leading-9 font-bold text-[#2f2424]">
              {welfare.value}
              <span className="font-sans text-[13px] font-normal text-[#9b958b]">{welfare.of}</span>
            </p>
          </a>

          {moduleCards.map((card) => (
            <ModuleCard key={card.title} card={card} />
          ))}

          {/* Everything else — number-first stat tiles, 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {moreModules.map((m) => (
              <a key={m.title} href={m.href} className={`${TAP} ${CARD} flex min-w-0 flex-col p-4`}>
                <span className="flex items-center gap-2 text-[15px] font-medium text-[#1c1a16]">
                  <m.icon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: m.accent }} aria-hidden />
                  <span className="truncate">{m.title}</span>
                </span>
                <span className="mt-3 font-display text-[28px] leading-8 font-bold text-[#2f2424]">
                  {m.value}
                  <span className="ml-1 font-sans text-[13px] font-normal text-[#9b958b]">{m.unit}</span>
                </span>
              </a>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
