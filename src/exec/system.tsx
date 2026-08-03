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

/** The module hue. Icons and data marks wear it; text never does. */
const AccentContext = createContext('#2f9e5b')
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
  children,
}: {
  icon?: Icon
  label?: string
  aside?: ReactNode
  children: ReactNode
}) {
  const accent = useAccent()
  return (
    <section className="rounded-[16px] bg-white p-5" aria-label={label}>
      {label && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            {Glyph && <Glyph size={16} strokeWidth={1.75} style={{ color: accent }} aria-hidden />}
            {/* Wraps rather than truncates — a clipped section title loses meaning. */}
            <h2 className="text-[15px] leading-[20px] font-medium text-balance text-[#1c1a16]">{label}</h2>
          </span>
          {aside && <span className="shrink-0 text-[12px] whitespace-nowrap text-[#9b958b]">{aside}</span>}
        </header>
      )}
      {children}
    </section>
  )
}

/** The card stack — sage ground and 12px gaps, same rhythm as the home main. */
export function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 px-5 pb-2">{children}</div>
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
      <span
        className="font-display font-bold tabular-nums"
        style={{ fontSize: size, lineHeight: 1.05, letterSpacing: '-0.025em', color }}
      >
        {value}
      </span>
      {unit && <span className="text-[13px] text-[#9b958b]">{unit}</span>}
    </span>
  )
}

/* ── hero ────────────────────────────────────────────────────────────────── */

/**
 * The 3-second read, on the sage ground above the cards — same placement and
 * type as the home hero. `side` and `align` vary the silhouette per module.
 */
export function Hero({
  icon: Glyph,
  value,
  unit,
  label,
  context,
  status,
  tone = 'neutral',
  side,
  align = 'left',
}: {
  icon?: Icon
  value: string
  unit?: string
  label: string
  context?: string
  status?: string
  tone?: Tone
  side?: { value: string; label: string }
  align?: 'left' | 'center'
}) {
  const accent = useAccent()
  const centred = align === 'center'
  return (
    <div className={`px-5 pt-1 pb-7 ${centred ? 'text-center' : ''}`}>
      <p className={`flex items-center gap-2 text-[13px] text-[#6d6860] ${centred ? 'justify-center' : ''}`}>
        {Glyph && <Glyph size={15} strokeWidth={1.75} style={{ color: accent }} aria-hidden />}
        {label}
      </p>
      <div className={`mt-2 flex items-end gap-5 ${centred ? 'justify-center' : ''}`}>
        <Figure value={value} unit={unit} size={58} />
        {side && (
          <span className="mb-1.5 border-l border-[#cfe0d6] pl-5">
            <Figure value={side.value} size={26} />
            <span className="mt-0.5 block text-[12px] text-[#6d6860]">{side.label}</span>
          </span>
        )}
      </div>
      {context && (
        <p className={`mt-3 text-[14px] leading-[21px] text-[#3d3a34] ${centred ? 'mx-auto max-w-[42ch]' : 'max-w-[44ch]'}`}>
          {context}
        </p>
      )}
      {status && (
        <p className={`mt-3 inline-flex items-center gap-2 ${centred ? '' : ''}`}>
          <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone] }} aria-hidden />
          <span className="text-[13px] font-medium" style={{ color: TONE[tone] }}>
            {status}
          </span>
        </p>
      )}
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
  const max = Math.max(...items.map((i) => i.value), 1)
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <ul className="flex flex-col gap-3.5">
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
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, backgroundColor: mix(accent, step(i)) }}
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
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <div>
      <div className="flex h-[11px] w-full gap-[2px]">
        {items.map((it, i) => (
          <div
            key={it.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(it.value / total) * 100}%`, backgroundColor: mix(accent, step(i)) }}
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
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = w / Math.max(values.length - 1, 1)
  const pts = values.map((v, i) => [i * stepX, 3 + (1 - (v - min) / span) * (h - 6)] as const)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[40px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={accent} opacity={0.1} />
      <path d={d} fill="none" stroke={accent} strokeWidth={1.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={2.75} fill={accent} />
    </svg>
  )
}

/** Paired comparison — the gap between two values is the point. */
export function Dumbbell({
  items,
  legend,
  unit,
}: {
  items: { label: string; a: number; b: number }[]
  legend: [string, string]
  unit?: string
}) {
  const accent = useAccent()
  const max = Math.max(...items.flatMap((i) => [i.a, i.b]), 1)
  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-[11px] text-[#9b958b]">
        <span className="flex items-center gap-1.5">
          <span className="size-[8px] rounded-full border-[1.5px] bg-white" style={{ borderColor: accent }} aria-hidden />
          {legend[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[8px] rounded-full" style={{ backgroundColor: accent }} aria-hidden />
          {legend[1]}
        </span>
      </div>
      <ul className="flex flex-col gap-4">
        {items.map((it) => {
          const lo = Math.min(it.a, it.b) / max
          const hi = Math.max(it.a, it.b) / max
          return (
            <li key={it.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[14px] text-[#1c1a16]">{it.label}</span>
                <span className="shrink-0 text-[13px] tabular-nums text-[#3d3a34]">
                  {compact(it.a)} → {compact(it.b)}
                  {unit && <span className="ml-0.5 text-[11px] text-[#9b958b]">{unit}</span>}
                </span>
              </div>
              <div className="relative mt-2 h-[10px]">
                <div className="absolute inset-x-0 top-[4.5px] h-px" style={{ backgroundColor: TRACK }} />
                <div
                  className="absolute top-[4.5px] h-px"
                  style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, backgroundColor: mix(accent, 0.45) }}
                />
                <span
                  className="absolute top-0 size-[10px] -translate-x-1/2 rounded-full border-[1.5px] bg-white"
                  style={{ left: `${(it.a / max) * 100}%`, borderColor: accent }}
                />
                <span
                  className="absolute top-0 size-[10px] -translate-x-1/2 rounded-full"
                  style={{ left: `${(it.b / max) * 100}%`, backgroundColor: accent }}
                />
              </div>
            </li>
          )
        })}
      </ul>
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
  const flat = values.flat()
  const lo = Math.min(...flat)
  const hi = Math.max(...flat)
  const span = hi - lo || 1
  return (
    <div>
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
                        className="block h-[26px] rounded-[5px]"
                        style={{ backgroundColor: mix(accent, 0.1 + ((v - lo) / span) * 0.8) }}
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
  return (
    <div>
      <div className={`grid ${cols === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-[12px] px-2.5 py-3"
            style={{ backgroundColor: c.tone && c.tone !== 'neutral' ? mix(TONE[c.tone], 0.08) : mix(accent, 0.07) }}
          >
            <div className="flex items-center gap-1.5">
              {c.tone && c.tone !== 'neutral' && (
                <span className="size-[6px] shrink-0 rounded-full" style={{ backgroundColor: TONE[c.tone] }} aria-hidden />
              )}
              <Figure value={c.value} size={18} />
            </div>
            <p className="mt-1 truncate text-[11px] text-[#6d6860]">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Stage flow — counts sit outside the bar so they're readable at any fill. */
export function Funnel({ stages, unit }: { stages: { label: string; value: number; sub?: string }[]; unit?: string }) {
  const accent = useAccent()
  const max = Math.max(...stages.map((s) => s.value), 1)
  return (
    <ul className="flex flex-col gap-3">
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
              className="h-full rounded-[4px]"
              style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, backgroundColor: mix(accent, 0.3 + step(i) * 0.55) }}
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
  const max = Math.max(...routes.map((r) => r.value), 1)
  return (
    <ul className="flex flex-col gap-3.5">
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
                className="block h-full rounded-full"
                style={{ width: `${(r.value / max) * 100}%`, backgroundColor: mix(accent, step(i)) }}
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
            {it.sub && <span className="mt-0.5 block truncate text-[11px] text-[#9b958b]">{it.sub}</span>}
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
  const max = Math.max(...values, 1)
  const hi = highlight ?? values.length - 1
  return (
    <div>
      <div className="flex h-[92px] items-end gap-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            {i === hi && <span className="text-[11px] font-semibold tabular-nums text-[#1c1a16]">{compact(v)}</span>}
            <span
              className="w-full rounded-[4px]"
              style={{
                height: `${Math.max(4, (v / max) * 68)}px`,
                backgroundColor: i === hi ? accent : mix(accent, 0.28),
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
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  const max = Math.max(...items.map((i) => i.value), 1)
  let run = 0
  const cum = items.map((i) => ((run += i.value) / total) * 100)
  return (
    <div>
      <div className="relative flex h-[104px] items-end gap-2">
        {items.map((it, i) => (
          <div key={it.label} className="flex flex-1 flex-col items-center justify-end">
            <span
              className="w-full rounded-t-[4px]"
              style={{ height: `${Math.max(5, (it.value / max) * 84)}px`, backgroundColor: mix(accent, step(i)) }}
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
    <div className="flex flex-col items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[196px]" aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke={HAIR} strokeWidth={1} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, 1)
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke={HAIR} strokeWidth={1} />
        })}
        <polygon points={shape} fill={accent} fillOpacity={0.14} stroke={accent} strokeWidth={1.75} />
        {axes.map((ax, i) => {
          const [x, y] = pt(i, ax.score / max)
          return <circle key={ax.label} cx={x} cy={y} r={3.25} fill={accent} />
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

/** Coverage as countable squares — “8 uncovered” beats “92%”. */
export function Waffle({ percent }: { percent: number }) {
  const accent = useAccent()
  const filled = Math.round(percent)
  return (
    <div>
      <div className="grid grid-cols-10 gap-[3px]">
        {Array.from({ length: 100 }, (_, i) => (
          <span
            key={i}
            className="aspect-square rounded-[3px]"
            style={{ backgroundColor: i < filled ? accent : TRACK }}
          />
        ))}
      </div>
    </div>
  )
}

export function Meter({ percent, label, value }: { percent: number; label: string; value: string }) {
  const accent = useAccent()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] text-[#1c1a16]">{label}</span>
        <span className="text-[14px] font-medium tabular-nums text-[#1c1a16]">{value}</span>
      </div>
      <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
        <div
          className="h-full rounded-full"
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
            <span className="mt-0.5 block truncate text-[11px] text-[#9b958b]">{it.sub}</span>
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-[#9b958b]">{it.value}</span>
        </li>
      ))}
    </ul>
  )
}

/** Dated highlights — the rail dot carries status. */
export function Events({ items }: { items: { when: string; text: string; tone?: Tone }[] }) {
  const accent = useAccent()
  return (
    <ul className="flex flex-col">
      {items.map((it, i) => (
        <li key={`${it.when}-${i}`} className="flex gap-3">
          <span className="w-[48px] shrink-0 pt-[1px] text-right text-[11px] tabular-nums text-[#9b958b]">
            {it.when}
          </span>
          <span className="relative flex w-[9px] shrink-0 justify-center" aria-hidden>
            <span
              className="mt-[6px] size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: it.tone && it.tone !== 'neutral' ? TONE[it.tone] : accent }}
            />
            {i < items.length - 1 && <span className="absolute top-[17px] bottom-0 w-px bg-[#f0efec]" />}
          </span>
          <span
            className={`min-w-0 flex-1 text-[13px] leading-[19px] text-[#3d3a34] ${
              i < items.length - 1 ? 'pb-4' : ''
            }`}
          >
            {it.text}
          </span>
        </li>
      ))}
    </ul>
  )
}
