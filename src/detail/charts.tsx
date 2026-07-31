/**
 * Chart primitives for the drill-down pages.
 *
 * House rules (dataviz): one accent hue per page, magnitude encoded by length or
 * by lightness steps of that single hue — never cycled categorical colors. Marks
 * are thin, gridlines are recessive hairlines, white does the separating, text
 * always wears ink tokens and never the series color.
 *
 * Motion: every mark animates in the direction its value is read — lines draw
 * left to right, bars grow from their baseline, arcs sweep from their start. It
 * plays once, when the chart first scrolls into view, and replays when the reader
 * changes what is plotted.
 */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CountUp, usePlay } from './motion'

export const INK = '#1c1a16'
export const MUTED = '#6d6860'
export const FAINT = '#9b958b'
export const GRID = '#f0efec'
export const TRACK = '#f2f1ed'

/** Accent at a given alpha — over white this is a monotone lightness step. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export const fmt = (n: number): string => n.toLocaleString('en-US')

/** Sign-based delta color: “+…” → brand green, “−…” → brand tertiary. */
export const signColor = (text: string): string | undefined => {
  const t = text.trim()
  if (t.startsWith('+')) return '#37bd69'
  if (t.startsWith('-') || t.startsWith('−')) return '#fa6140'
  return undefined
}

export const compact = (n: number): string => {
  const a = Math.abs(n)
  if (a >= 100_000) return `${Math.round(n / 1000)}K`
  if (a >= 10_000) return `${(n / 1000).toFixed(1)}K`
  if (a >= 1000) return n.toLocaleString('en-US')
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)))
}

/** Rounded ticks bracketing the domain — 3 lines, clean numbers. */
function niceTicks(min: number, max: number): number[] {
  const span = max - min || Math.abs(max) || 1
  const raw = span / 2
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const out: number[] = []
  for (let v = lo; v <= hi + step / 1000; v += step) out.push(Number(v.toPrecision(12)))
  return out
}

/** Catmull-Rom → cubic bezier, with control points clamped to kill overshoot. */
function smoothPath(pts: [number, number][], tension = 0.2): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]
    const clamp = (v: number, a: number, b: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), v))
    const c1y = clamp(y1 + (y2 - p0[1]) * tension, y1, y2)
    const c2y = clamp(y2 - (p3[1] - y1) * tension, y1, y2)
    d += ` C ${x1 + (x2 - p0[0]) * tension} ${c1y}, ${x2 - (p3[0] - x1) * tension} ${c2y}, ${x2} ${y2}`
  }
  return d
}

/* ── Large smooth area trend ─────────────────────────────────────────────── */

const W = 340
const H = 148
const PAD_Y = 12

/**
 * Axis labels are formatted from the tick *step*, not the value — a zoomed window
 * can step by 500 across 215,000, where rounding to "215K" would print the same
 * label twice.
 */
const tickLabel = (v: number, step: number): string => {
  if (Math.abs(step) >= 1000) return compact(v)
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`
  return compact(v)
}

export function AreaTrend({
  values,
  xLabels,
  accent,
  unit,
  xSuffix,
  /** Bumped by the caller when the plotted window changes, so the line redraws. */
  playKey = 0,
}: {
  values: number[]
  xLabels: string[]
  accent: string
  unit?: string
  xSuffix?: string
  playKey?: number
}) {
  const [active, setActive] = useState<number | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const { ref, animate } = usePlay()
  const id = `grad-${accent.slice(1)}`

  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]
  const labels = ticks.map((t) => tickLabel(t, ticks[1] - ticks[0]))
  // The axis gutter sizes to its widest label so nothing bleeds into the plot.
  const gutter = Math.max(30, Math.max(...labels.map((l) => l.length)) * 5.6 + 6)
  const plotW = W - gutter
  const step = plotW / Math.max(values.length - 1, 1)
  const y = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD_Y * 2)
  const pts = values.map((v, i) => [i * step, y(v)] as [number, number])
  const line = smoothPath(pts)
  const shown = active ?? values.length - 1
  // 12 monthly labels still fit; 14 daily ones don't, so alternates become ticks.
  const dense = xLabels.length > 12

  const track = (e: ReactPointerEvent) => {
    const rect = wrap.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * W
    setActive(Math.max(0, Math.min(values.length - 1, Math.round(x / step))))
  }

  return (
    <div ref={ref}>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[26px] leading-8 font-bold text-[#2f2424] tabular-nums">
          {/* Counts only on the initial draw; scrubbing must track the finger exactly. */}
          {active === null ? (
            <CountUp value={values[shown]} animate={animate} duration={1000} format={fmt} />
          ) : (
            fmt(values[shown])
          )}
        </span>
        {unit && <span className="text-[12px] text-[#9b958b]">{unit}</span>}
        <span className="ml-auto text-[12px] text-[#6d6860]">
          {xLabels[shown]}
          {xSuffix && ` ${xSuffix}`}
        </span>
      </div>

      <div
        ref={wrap}
        className="mt-2 touch-pan-y"
        onPointerDown={track}
        onPointerMove={(e) => e.buttons && track(e)}
        onPointerLeave={() => setActive(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trend over time">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.16} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>

          {ticks.map((t, ti) => (
            <g key={t} className={animate ? 'animate-veil' : undefined}>
              <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={W} y={y(t) + 3} textAnchor="end" fontSize={9} fill={FAINT}>
                {labels[ti]}
              </text>
            </g>
          ))}

          {/* Remounted on window change so the draw replays against the new series. */}
          <g key={`${playKey}-${values.length}`}>
            <path
              d={`${line} L ${plotW} ${H} L 0 ${H} Z`}
              fill={`url(#${id})`}
              className={animate ? 'origin-fill-bottom animate-grow-y' : undefined}
              style={animate ? { animationDelay: '180ms', animationDuration: '820ms' } : undefined}
            />
            <path
              d={line}
              fill="none"
              stroke={accent}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={animate ? 1 : undefined}
              className={animate ? 'animate-draw' : undefined}
            />
          </g>

          {active !== null && (
            <line
              x1={pts[shown][0]}
              x2={pts[shown][0]}
              y1={0}
              y2={H}
              stroke={alpha(accent, 0.28)}
              strokeWidth={1}
              className="animate-veil"
            />
          )}
          {/* Wrapper carries position (so scrubbing glides); circle carries the pop. */}
          <g
            style={{
              transform: `translate(${pts[shown][0]}px, ${pts[shown][1]}px)`,
              transition: 'transform 170ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <circle
              r={4.5}
              fill={accent}
              stroke="#ffffff"
              strokeWidth={2}
              className={animate ? 'animate-pop' : undefined}
              style={animate ? { animationDelay: '760ms' } : undefined}
            />
          </g>
        </svg>
      </div>

      <div className="mt-1 flex justify-between" style={{ paddingRight: `${(gutter / W) * 100}%` }}>
        {xLabels.map((l, i) => (
          <span
            key={`${l}-${i}`}
            className={`text-[9px] transition-colors duration-300 ${
              i === shown ? 'font-semibold text-[#1c1a16]' : 'text-[#9b958b]'
            }`}
          >
            {dense && i % 2 === 1 ? '·' : l}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Columns ─────────────────────────────────────────────────────────────── */

const topRounded = (x: number, yTop: number, w: number, h: number, r = 4) => {
  const rr = Math.max(0, Math.min(r, w / 2, h))
  return `M${x},${yTop + h} L${x},${yTop + rr} Q${x},${yTop} ${x + rr},${yTop} L${x + w - rr},${yTop} Q${x + w},${yTop} ${x + w},${yTop + rr} L${x + w},${yTop + h} Z`
}

export function Columns({
  values,
  xLabels,
  accent,
  highlight,
}: {
  values: number[]
  xLabels: string[]
  accent: string
  highlight?: number
}) {
  const h = 96
  const max = Math.max(...values)
  const band = W / values.length
  const bw = Math.min(24, band - 6) // leftover band stays air
  const hi = highlight ?? values.indexOf(max)
  const { ref, animate } = usePlay()
  const barH = (v: number) => Math.max(3, (v / (max || 1)) * (h - 18))

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${h}`} className="w-full" role="img" aria-label="Period comparison">
        <line x1={0} x2={W} y1={h} y2={h} stroke={GRID} strokeWidth={1} />
        {values.map((v, i) => (
          <path
            key={i}
            d={topRounded(i * band + (band - bw) / 2, h - barH(v), bw, barH(v))}
            fill={i === hi ? accent : alpha(accent, 0.28)}
            className={animate ? 'origin-fill-bottom animate-grow-y' : undefined}
            style={animate ? { animationDelay: `${i * 70}ms` } : undefined}
          />
        ))}
        {values.map((v, i) =>
          i === hi ? (
            <text
              key={`l-${i}`}
              x={i * band + band / 2}
              y={h - barH(v) - 6}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill={INK}
              className={animate ? 'animate-veil' : undefined}
              style={animate ? { animationDelay: `${values.length * 70 + 80}ms` } : undefined}
            >
              <CountUp
                value={v}
                animate={animate}
                delay={values.length * 70 + 80}
                duration={700}
                format={compact}
              />
            </text>
          ) : null,
        )}
      </svg>
      <div className="mt-1.5 flex">
        {xLabels.map((l, i) => (
          <span
            key={`${l}-${i}`}
            className={`flex-1 text-center text-[9px] ${i === hi ? 'font-semibold text-[#1c1a16]' : 'text-[#9b958b]'}`}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Bar rows ────────────────────────────────────────────────────────────── */

function BarRow({
  item,
  max,
  accent,
  unit,
  animate,
  delay,
}: {
  item: { label: string; value: number; sub?: string }
  max: number
  accent: string
  unit?: string
  animate: boolean
  delay: number
}) {
  return (
    <li>
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-[13px] text-[#3d3a34]">{item.label}</span>
        {item.sub && <span className="text-[11px] text-[#9b958b]">{item.sub}</span>}
        <span className="text-[13px] font-semibold text-[#1c1a16] tabular-nums">
          {/* Every number starts at once and finishes in the bars' order — a row
              held at 0 while its neighbours count would read as a real zero. */}
          <CountUp value={item.value} animate={animate} duration={780 + delay} format={fmt} />
          {unit && <span className="ml-0.5 text-[10px] font-normal text-[#9b958b]">{unit}</span>}
        </span>
      </div>
      <div className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
        <div
          className={`h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
          style={{
            width: `${Math.max(2, (item.value / max) * 100)}%`,
            backgroundColor: accent,
            animationDelay: animate ? `${delay}ms` : undefined,
          }}
        />
      </div>
    </li>
  )
}

export function BarRows({
  items,
  accent,
  unit,
}: {
  items: { label: string; value: number; sub?: string }[]
  accent: string
  unit?: string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const { ref, animate } = usePlay<HTMLUListElement>()

  return (
    <ul ref={ref} className="flex flex-col gap-3.5">
      {items.map((item, i) => (
        <BarRow
          key={item.label}
          item={item}
          max={max}
          accent={accent}
          unit={unit}
          animate={animate}
          delay={i * 65}
        />
      ))}
    </ul>
  )
}

/* ── Stacked share bar ───────────────────────────────────────────────────── */

/** One-hue lightness steps — magnitude, not identity, so no cycled categorical hues. */
const SHARE_STEPS = [1, 0.62, 0.4, 0.26, 0.17]

function ShareRow({
  item,
  total,
  swatch,
  unit,
  animate,
  delay,
}: {
  item: { label: string; value: number; sub?: string }
  total: number
  swatch: string
  unit?: string
  animate: boolean
  delay: number
}) {
  return (
    <li
      className={`flex items-baseline gap-2.5 ${animate ? 'animate-fade-up' : ''}`}
      style={animate ? { animationDelay: `${delay}ms` } : undefined}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: swatch }} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[13px] text-[#3d3a34]">{item.label}</span>
      <span className="text-[11px] text-[#9b958b] tabular-nums">
        <CountUp
          value={item.value}
          animate={animate}
          duration={780 + delay}
          format={(n) => `${((n / total) * 100).toFixed(1)}%`}
        />
      </span>
      <span className="w-[68px] text-right text-[13px] font-semibold text-[#1c1a16] tabular-nums">
        <CountUp value={item.value} animate={animate} duration={780 + delay} format={fmt} />
        {unit && <span className="ml-0.5 text-[10px] font-normal text-[#9b958b]">{unit}</span>}
      </span>
    </li>
  )
}

export function ShareBar({
  items,
  accent,
  unit,
}: {
  items: { label: string; value: number; sub?: string }[]
  accent: string
  unit?: string
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  const color = (i: number) => alpha(accent, SHARE_STEPS[i] ?? 0.1)
  const { ref, animate } = usePlay()

  return (
    <div ref={ref}>
      {/* 2px white gaps do the separating — no strokes around segments */}
      <div className="flex h-[10px] w-full gap-[2px]">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`h-full origin-left first:rounded-l-full last:rounded-r-full ${animate ? 'animate-grow-x' : ''}`}
            style={{
              width: `${(item.value / total) * 100}%`,
              backgroundColor: color(i),
              animationDelay: animate ? `${i * 90}ms` : undefined,
            }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((item, i) => (
          <ShareRow
            key={item.label}
            item={item}
            total={total}
            swatch={color(i)}
            unit={unit}
            animate={animate}
            delay={180 + i * 60}
          />
        ))}
      </ul>
    </div>
  )
}

/* ── Card-width mini area — same visual weight as the home cards' PulseLine ── */

export function MiniArea({ values, accent }: { values: number[]; accent: string }) {
  const w = 132
  const h = 44
  const id = `mini-${accent.slice(1)}`
  const min = Math.min(...values)
  const max = Math.max(...values)
  const step = w / Math.max(values.length - 1, 1)
  const pts = values.map(
    (v, i) => [i * step, 4 + (1 - (v - min) / (max - min || 1)) * (h - 12)] as [number, number],
  )
  const line = smoothPath(pts)
  const { ref, animate } = usePlay()

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[44px] w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.18} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d={`${line} L ${w} ${h} L 0 ${h} Z`}
          fill={`url(#${id})`}
          className={animate ? 'animate-veil' : undefined}
          style={animate ? { animationDelay: '220ms' } : undefined}
        />
        <path
          d={line}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={animate ? 1 : undefined}
          className={animate ? 'animate-draw' : undefined}
        />
      </svg>
    </div>
  )
}

/* ── Meter ───────────────────────────────────────────────────────────────── */

export function Meter({ percent, accent, delay = 0 }: { percent: number; accent: string; delay?: number }) {
  const { ref, animate } = usePlay()

  return (
    <div
      ref={ref}
      className="h-[6px] w-full overflow-hidden rounded-full"
      style={{ backgroundColor: alpha(accent, 0.14) }}
    >
      <div
        className={`h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
        style={{
          width: `${Math.max(2, Math.min(percent, 100))}%`,
          backgroundColor: accent,
          animationDelay: animate ? `${delay}ms` : undefined,
        }}
      />
    </div>
  )
}

export function Ring({ percent, accent }: { percent: number; accent: string }) {
  const size = 72
  const r = 30
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(percent, 100))

  return (
    <div className="relative size-[72px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={alpha(accent, 0.14)} strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold" style={{ color: INK }}>
        {Math.round(clamped)}%
      </span>
    </div>
  )
}

/* ── Status dot ──────────────────────────────────────────────────────────── */

export const TONE_COLOR: Record<string, string> = {
  good: '#1e7a44',
  warn: '#b45309',
  bad: '#dc2626',
  neutral: '#9b958b',
}
