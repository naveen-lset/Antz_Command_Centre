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

import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import { AnimatedValue, Reveal, usePlay } from '../detail/motion'

/* ── tokens (from the v3 home screen) ────────────────────────────────────── */
export const GROUND = '#e7f0ea'
export const INK = '#1c1a16'
export const VALUE = '#2f2424'
export const INK2 = '#3d3a34'
export const MUTED = '#6d6860'
export const FAINT = '#9b958b'
export const HAIR = '#f0efec'
export const TRACK = '#f2f1ed'
export const TONE = { good: '#1e7a44', warn: '#b45309', bad: '#dc2626', neutral: '#9b958b' } as const
export type Tone = keyof typeof TONE

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
      <section className={`rounded-[16px] bg-white ${tight ? 'p-4' : 'p-5'}`} aria-label={label}>
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
  return <div className="flex flex-col gap-3 px-5 pb-2">{children}</div>
}

/** Two half-width cards on one line — breaks the single-column drumbeat. */
export function Duo({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 items-start gap-3">{children}</div>
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
        style={{ fontSize: size, lineHeight: 1.05, letterSpacing: '-0.025em', color }}
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
    <div className="px-5 pb-3">
      <section
        className={`animate-hero-in rounded-[16px] bg-white p-5 ${centred ? 'text-center' : ''}`}
        aria-label={label}
      >
        <Figure value={value} unit={unit} size={58} />
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

/** Ranked composition — bar length is the message, accent step is the rank. */
export function Bars({
  items,
  unit,
  showShare = false,
}: {
  items: { label: string; value: number; sub?: string }[]
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
                <span className="ml-1.5 text-[11px] font-normal text-[#9b958b]">
                  {((it.value / total) * 100).toFixed(0)}%
                </span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
            <div
              className={`h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
              style={{
                width: `${Math.max(2, (it.value / max) * 100)}%`,
                backgroundColor: mix(accent, step(i)),
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
              <Figure value={c.value} size={18} />
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
  items: { label: string; value: string; sub?: string; delta?: string; tone?: Tone }[]
  size?: 'md' | 'lg'
}) {
  const lg = size === 'lg'
  return (
    <ul className="divide-y divide-[#f0efec]">
      {items.map((it) => (
        <li key={it.label} className={`flex items-baseline gap-3 ${lg ? 'py-3.5' : 'py-2.5'} first:pt-0 last:pb-0`}>
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
        </li>
      ))}
    </ul>
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
  items: { label: string; value: string; unit?: string; note?: string; tone?: Tone }[]
  cols?: 2 | 3 | 4
}) {
  const grid = cols === 4 ? 'grid-cols-4' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2'
  const size = cols === 4 ? 22 : cols === 3 ? 25 : 28
  return (
    <div className={`grid ${grid} gap-x-3 gap-y-4`}>
      {items.map((m, i) => (
        <div key={m.label} className={i >= cols ? 'border-t border-[#f0efec] pt-4' : ''}>
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

/** One line of headline numbers, hairline-ruled. The 3-second scan. */
export function Scoreboard({
  items,
}: {
  items: { value: string; unit?: string; label: string; tone?: Tone }[]
}) {
  const size = items.length > 3 ? 23 : 28
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
export function Roster({ head, groups }: { head: string[]; groups: RosterGroup[] }) {
  const accent = useAccent()
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
                    <th
                      key={h}
                      className={`px-2.5 py-2 text-left text-[10px] font-medium tracking-[0.05em] text-white/85 uppercase ${
                        i === 0 ? 'w-[38%]' : ''
                      } ${h === '' ? 'w-[38px] px-0' : ''}`}
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
                         on two lines, as the printed report does. */
                      <td
                        key={ci}
                        className="px-2.5 py-2.5 align-top text-[12px] leading-[16px] whitespace-pre-line text-[#6d6860]"
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

/**
 * Provenance, closing the page. A month's figures without the month they were
 * cut on are unciteable — the printed report stamps every page for this reason.
 */
export function Stamp({ asOf, source }: { asOf: string; source?: string }) {
  return (
    <p className="px-1 pt-1 pb-2 text-center text-[11px] text-[#9b958b]">
      As of {asOf}
      {source && ` · ${source}`}
    </p>
  )
}
