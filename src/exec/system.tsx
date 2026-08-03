/**
 * Executive module-page design system.
 *
 * Premium enterprise, Apple-restrained: white surfaces, hairline structure, no
 * shadows, no glassmorphism. Data is MONOCHROME — magnitude is carried by ink
 * opacity and length, never by hue. Colour appears only as small semantic marks
 * (good / warn / critical) and only where it changes a decision.
 *
 * These are composition primitives, not a page template. Each module assembles
 * them in its own order and rhythm — see `src/exec/pages/`.
 */

import type { ReactNode } from 'react'

/* ── tokens ──────────────────────────────────────────────────────────────── */
export const INK = '#16150f'
export const INK2 = '#55524a'
export const MUTED = '#8a8680'
export const FAINT = '#b3aea6'
export const HAIR = '#eceae5'
export const WASH = '#f7f6f3'
export const TONE = { good: '#1f7a44', warn: '#a8620a', bad: '#c2311f', neutral: '#8a8680' } as const
export type Tone = keyof typeof TONE

/** Monochrome step for series `i` — lightness, never hue. */
export const step = (i: number) => [1, 0.62, 0.42, 0.28, 0.18, 0.12][i] ?? 0.1

export const fmt = (n: number) => n.toLocaleString('en-US')
export const compact = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (a >= 100_000) return `${Math.round(n / 1000)}K`
  if (a >= 10_000) return `${(n / 1000).toFixed(1)}K`
  return fmt(n)
}
/** “+3.2%” green, “−18” red, anything else inherits. */
export const signTone = (s: string) => {
  const t = s.trim()
  if (t.startsWith('+')) return TONE.good
  if (t.startsWith('-') || t.startsWith('−')) return TONE.bad
  return undefined
}

/* ── structure ───────────────────────────────────────────────────────────── */

/** Page section. `Band` gives a section its own ground so the eye can group it. */
export function Section({
  label,
  aside,
  children,
  band = false,
  tight = false,
}: {
  label?: string
  aside?: ReactNode
  children: ReactNode
  band?: boolean
  tight?: boolean
}) {
  return (
    <section
      className={`${band ? 'bg-[#f7f6f3] py-9' : 'py-9'} ${tight ? 'py-7' : ''}`}
      aria-label={label}
    >
      <div className="px-6">
        {label && (
          <header className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[#8a8680] uppercase">{label}</h2>
            {aside}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}

export const Rule = () => <hr className="mx-6 border-0 border-t border-[#eceae5]" />

/** Big number + unit, rounded numerals. The page's typographic anchor. */
export function Figure({
  value,
  unit,
  size = 32,
  tone,
}: {
  value: string
  unit?: string
  size?: number
  tone?: string
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className="font-display font-bold tabular-nums"
        style={{ fontSize: size, lineHeight: 1.02, letterSpacing: '-0.025em', color: tone ?? INK }}
      >
        {value}
      </span>
      {unit && <span className="text-[13px] text-[#8a8680]">{unit}</span>}
    </span>
  )
}

/* ── hero ────────────────────────────────────────────────────────────────── */

/**
 * The 3-second read: one number, what it is, and whether it's fine.
 * `variants` change the composition so modules don't share a silhouette.
 */
export function Hero({
  value,
  unit,
  label,
  context,
  status,
  tone = 'neutral',
  side,
  align = 'left',
}: {
  value: string
  unit?: string
  label: string
  context?: string
  status?: string
  tone?: Tone
  /** Second figure shown beside the primary — for modules with a natural pair. */
  side?: { value: string; label: string }
  align?: 'left' | 'center'
}) {
  return (
    <div className={`px-6 pt-2 pb-8 ${align === 'center' ? 'text-center' : ''}`}>
      <p className="text-[13px] tracking-[0.02em] text-[#8a8680]">{label}</p>
      <div className={`mt-2 flex items-end gap-6 ${align === 'center' ? 'justify-center' : ''}`}>
        <Figure value={value} unit={unit} size={64} />
        {side && (
          <span className="mb-1.5 border-l border-[#eceae5] pl-6">
            <Figure value={side.value} size={28} />
            <span className="mt-0.5 block text-[12px] text-[#8a8680]">{side.label}</span>
          </span>
        )}
      </div>
      {context && <p className="mt-3 max-w-[46ch] text-[15px] leading-[22px] text-[#55524a]">{context}</p>}
      {status && (
        <p className="mt-3 inline-flex items-center gap-2">
          <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone] }} aria-hidden />
          <span className="text-[13px] font-medium" style={{ color: TONE[tone] }}>
            {status}
          </span>
        </p>
      )}
    </div>
  )
}

/** Executive summary — prose, because a director reads sentences, not tiles. */
export function Digest({ children }: { children: ReactNode }) {
  return <p className="max-w-[54ch] text-[17px] leading-[27px] text-[#16150f]">{children}</p>
}

/**
 * Current operational status — the "is anything on fire" line.
 * Dots carry state so it reads before any number is parsed.
 */
export function StatusList({ items }: { items: { label: string; value: string; tone?: Tone }[] }) {
  return (
    <ul className="divide-y divide-[#eceae5]">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-3 py-3">
          <span
            className="size-[7px] shrink-0 rounded-full"
            style={{ backgroundColor: TONE[it.tone ?? 'neutral'] }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-[15px] text-[#16150f]">{it.label}</span>
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

/** Key metrics as a hairline grid — no card per number, so nothing repeats. */
export function MetricGrid({
  items,
  cols = 2,
}: {
  items: { label: string; value: string; unit?: string; note?: string }[]
  cols?: 2 | 3
}) {
  return (
    <div className={`grid ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-x-5`}>
      {items.map((m, i) => (
        <div
          key={m.label}
          className={`py-4 ${i >= cols ? 'border-t border-[#eceae5]' : ''} ${
            i % cols !== 0 ? 'border-l border-[#eceae5] pl-5' : ''
          }`}
        >
          <Figure value={m.value} unit={m.unit} size={cols === 3 ? 24 : 28} />
          <p className="mt-1 text-[13px] text-[#55524a]">{m.label}</p>
          {m.note && <p className="mt-0.5 text-[11px] text-[#b3aea6]">{m.note}</p>}
        </div>
      ))}
    </div>
  )
}

/* ── data marks (all monochrome) ─────────────────────────────────────────── */

/** Ranked composition. Bar length is the message; ink step is the rank. */
export function Bars({
  items,
  unit,
  showShare = false,
}: {
  items: { label: string; value: number; sub?: string }[]
  unit?: string
  showShare?: boolean
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((it, i) => (
        <li key={it.label}>
          <div className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate text-[14px] text-[#16150f]">{it.label}</span>
            {it.sub && <span className="shrink-0 text-[11px] text-[#b3aea6]">{it.sub}</span>}
            <span className="shrink-0 text-[14px] font-medium tabular-nums text-[#16150f]">
              {compact(it.value)}
              {unit && <span className="ml-0.5 text-[11px] font-normal text-[#8a8680]">{unit}</span>}
              {showShare && (
                <span className="ml-1.5 text-[11px] font-normal text-[#b3aea6]">
                  {((it.value / total) * 100).toFixed(0)}%
                </span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-[#f0eee9]">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(1.5, (it.value / max) * 100)}%`, backgroundColor: INK, opacity: step(i) }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** One stacked bar + legend — composition at a glance, summary-first. */
export function Composition({ items, unit }: { items: { label: string; value: number }[]; unit?: string }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <div>
      <div className="flex h-[12px] w-full gap-[2px] overflow-hidden">
        {items.map((it, i) => (
          <div
            key={it.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(it.value / total) * 100}%`, backgroundColor: INK, opacity: step(i) }}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2.5">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-baseline gap-2">
            <span
              className="mt-[5px] size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: INK, opacity: step(i) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-[#55524a]">{it.label}</span>
            <span className="shrink-0 text-[13px] font-medium tabular-nums text-[#16150f]">
              {((it.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
      {unit && <p className="mt-3 text-[11px] text-[#b3aea6]">{fmt(total)} {unit} total</p>}
    </div>
  )
}

/** Thin sparkline. Monochrome, emphasized endpoint. */
export function Spark({ values, h = 40, w = 120 }: { values: number[]; h?: number; w?: number }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = w / Math.max(values.length - 1, 1)
  const pts = values.map((v, i) => [i * stepX, 3 + (1 - (v - min) / span) * (h - 6)] as const)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[40px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={INK} opacity={0.05} />
      <path d={d} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={INK} />
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
  const max = Math.max(...items.flatMap((i) => [i.a, i.b]), 1)
  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-[11px] text-[#8a8680]">
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded-full border border-[#16150f] bg-white" aria-hidden />
          {legend[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded-full bg-[#16150f]" aria-hidden />
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
                <span className="truncate text-[14px] text-[#16150f]">{it.label}</span>
                <span className="shrink-0 text-[13px] tabular-nums text-[#55524a]">
                  {compact(it.a)} → {compact(it.b)}
                  {unit && <span className="ml-0.5 text-[11px] text-[#8a8680]">{unit}</span>}
                </span>
              </div>
              <div className="relative mt-2 h-[9px]">
                <div className="absolute inset-x-0 top-[4px] h-px bg-[#f0eee9]" />
                <div
                  className="absolute top-[4px] h-px bg-[#16150f] opacity-30"
                  style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }}
                />
                <span
                  className="absolute top-0 size-[9px] -translate-x-1/2 rounded-full border border-[#16150f] bg-white"
                  style={{ left: `${(it.a / max) * 100}%` }}
                />
                <span
                  className="absolute top-0 size-[9px] -translate-x-1/2 rounded-full bg-[#16150f]"
                  style={{ left: `${(it.b / max) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Matrix heat grid — density read, no per-cell labels to parse. */
export function Matrix({
  rows,
  cols,
  values,
  legend,
}: {
  rows: string[]
  cols: string[]
  values: number[][]
  legend?: string
}) {
  /* Normalise across the OBSERVED range, not 0–max. Scores that all sit high
     (welfare 68–98) would otherwise compress into one indistinguishable tone. */
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
                <th key={c} className="pb-1 text-[10px] font-normal text-[#b3aea6]">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r}>
                <th className="pr-2 text-right text-[12px] font-normal whitespace-nowrap text-[#55524a]">{r}</th>
                {cols.map((c, ci) => {
                  const v = values[ri]?.[ci] ?? 0
                  return (
                    <td key={c} className="p-0">
                      <span
                        className="block h-[26px] rounded-[4px]"
                        style={{ backgroundColor: INK, opacity: 0.08 + ((v - lo) / span) * 0.8 }}
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
      {legend && <p className="mt-3 text-[11px] text-[#b3aea6]">{legend}</p>}
    </div>
  )
}

/** Status tray — a grid that mirrors a physical thing (trays, paddocks, wards). */
export function Tray({
  cells,
  cols = 4,
  legend,
}: {
  cells: { value: string; label: string; tone?: Tone }[]
  cols?: 3 | 4
  legend?: string
}) {
  return (
    <div>
      <div className={`grid ${cols === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
        {cells.map((c) => (
          <div key={c.label} className="rounded-[10px] border border-[#eceae5] px-2.5 py-3">
            <div className="flex items-center gap-1.5">
              {c.tone && c.tone !== 'neutral' && (
                <span className="size-[6px] shrink-0 rounded-full" style={{ backgroundColor: TONE[c.tone] }} aria-hidden />
              )}
              <Figure value={c.value} size={19} />
            </div>
            <p className="mt-1 truncate text-[11px] text-[#8a8680]">{c.label}</p>
          </div>
        ))}
      </div>
      {legend && <p className="mt-3 text-[11px] text-[#b3aea6]">{legend}</p>}
    </div>
  )
}

/**
 * Stage flow — where work currently sits. The count sits OUTSIDE the bar in ink:
 * inside-the-bar text is unreadable at low fill opacities, and blend modes only
 * trade one illegible case for another.
 */
export function Funnel({ stages, unit }: { stages: { label: string; value: number; sub?: string }[]; unit?: string }) {
  const max = Math.max(...stages.map((s) => s.value), 1)
  return (
    <ul className="flex flex-col gap-3">
      {stages.map((s, i) => (
        <li key={s.label}>
          <div className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 text-[14px] text-[#16150f]">{s.label}</span>
            {s.sub && <span className="shrink-0 text-[11px] text-[#b3aea6]">{s.sub}</span>}
            <span className="shrink-0 text-[14px] font-medium tabular-nums text-[#16150f]">
              {s.value}
              {unit && <span className="ml-0.5 text-[11px] font-normal text-[#8a8680]">{unit}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-[8px] w-full overflow-hidden rounded-[3px] bg-[#f0eee9]">
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, backgroundColor: INK, opacity: 0.24 + step(i) * 0.6 }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Directional flow — where things came from and went to. */
export function Lanes({ routes, unit }: { routes: { from: string; to: string; value: number; sub?: string }[]; unit?: string }) {
  const max = Math.max(...routes.map((r) => r.value), 1)
  return (
    <ul className="flex flex-col gap-3.5">
      {routes.map((r, i) => (
        <li key={`${r.from}-${r.to}`}>
          <div className="flex items-baseline gap-2 text-[14px]">
            <span className="min-w-0 truncate text-[#16150f]">{r.from}</span>
            <span className="shrink-0 text-[#b3aea6]" aria-hidden>→</span>
            <span className="min-w-0 flex-1 truncate text-[#16150f]">{r.to}</span>
            <span className="shrink-0 font-medium tabular-nums text-[#16150f]">
              {r.value}
              {unit && <span className="ml-0.5 text-[11px] font-normal text-[#8a8680]">{unit}</span>}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-[4px] flex-1 overflow-hidden rounded-full bg-[#f0eee9]">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(r.value / max) * 100}%`, backgroundColor: INK, opacity: step(i) }}
              />
            </span>
            {r.sub && <span className="shrink-0 text-[11px] text-[#b3aea6]">{r.sub}</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Ranked contributors — a ledger, tight enough to scan 5 rows in 3 seconds. */
export function Ledger({
  items,
  rank = true,
}: {
  items: { label: string; sub?: string; value: string; share?: number }[]
  rank?: boolean
}) {
  return (
    <ol className="divide-y divide-[#eceae5]">
      {items.map((it, i) => (
        <li key={it.label} className="flex items-center gap-3.5 py-3">
          {rank && (
            <span className="w-[16px] shrink-0 text-[12px] tabular-nums text-[#b3aea6]">{String(i + 1)}</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-[#16150f]">{it.label}</span>
            {it.sub && <span className="mt-0.5 block truncate text-[12px] text-[#8a8680]">{it.sub}</span>}
          </span>
          {it.share !== undefined && (
            <span className="hidden h-[4px] w-[52px] shrink-0 overflow-hidden rounded-full bg-[#f0eee9] xs:block">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(2, it.share)}%`, backgroundColor: INK, opacity: 0.55 }}
              />
            </span>
          )}
          <span className="shrink-0 text-[15px] font-medium tabular-nums text-[#16150f]">{it.value}</span>
        </li>
      ))}
    </ol>
  )
}

/** Period columns — one bar emphasized, the rest recessive. */
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
  const max = Math.max(...values, 1)
  const hi = highlight ?? values.length - 1
  return (
    <div>
      <div className="flex h-[92px] items-end gap-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            {i === hi && (
              <span className="text-[11px] font-semibold tabular-nums text-[#16150f]">{compact(v)}</span>
            )}
            <span
              className="w-full rounded-[3px]"
              style={{ height: `${Math.max(4, (v / max) * 68)}px`, backgroundColor: INK, opacity: i === hi ? 1 : 0.16 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {labels.map((l, i) => (
          <span
            key={`${l}-${i}`}
            className={`flex-1 text-center text-[10px] ${i === hi ? 'font-semibold text-[#16150f]' : 'text-[#b3aea6]'}`}
          >
            {l}
          </span>
        ))}
      </div>
      {unit && <p className="mt-2.5 text-[11px] text-[#b3aea6]">{unit}</p>}
    </div>
  )
}

/** Causes + cumulative share — the 80/20 read for a review page. */
export function Pareto({ items }: { items: { label: string; value: number }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  const max = Math.max(...items.map((i) => i.value), 1)
  let run = 0
  const cum = items.map((i) => ((run += i.value) / total) * 100)
  return (
    <div>
      <div className="relative flex h-[110px] items-end gap-2">
        {items.map((it, i) => (
          <div key={it.label} className="flex flex-1 flex-col items-center justify-end">
            <span
              className="w-full rounded-t-[3px]"
              style={{ height: `${Math.max(5, (it.value / max) * 86)}px`, backgroundColor: INK, opacity: step(i) }}
            />
          </div>
        ))}
        {/* Cumulative line sits over the bars, thin and ink-only. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <polyline
            points={cum
              .map((c, i) => `${((i + 0.5) / items.length) * 100}%,${100 - c * 0.86}%`)
              .join(' ')}
            fill="none"
            stroke={INK}
            strokeWidth={1.25}
            strokeDasharray="3 3"
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <ul className="mt-3 divide-y divide-[#eceae5]">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-baseline gap-3 py-2">
            <span
              className="size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: INK, opacity: step(i) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[14px] text-[#16150f]">{it.label}</span>
            <span className="shrink-0 text-[13px] tabular-nums text-[#8a8680]">{cum[i].toFixed(0)}% cum.</span>
            <span className="w-[34px] shrink-0 text-right text-[14px] font-medium tabular-nums text-[#16150f]">
              {it.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Five-axis scorecard — for frameworks that are genuinely multi-dimensional. */
export function Radar({ axes, max = 100 }: { axes: { label: string; score: number }[]; max?: number }) {
  const size = 200
  const c = size / 2
  const r = 74
  const pt = (i: number, frac: number) => {
    const a = (i / axes.length) * Math.PI * 2 - Math.PI / 2
    return [c + Math.cos(a) * r * frac, c + Math.sin(a) * r * frac] as const
  }
  const ring = (frac: number) =>
    axes.map((_, i) => pt(i, frac).map((n) => n.toFixed(1)).join(',')).join(' ')
  const shape = axes.map((ax, i) => pt(i, ax.score / max).map((n) => n.toFixed(1)).join(',')).join(' ')

  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[210px]" aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke={HAIR} strokeWidth={1} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, 1)
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke={HAIR} strokeWidth={1} />
        })}
        <polygon points={shape} fill={INK} fillOpacity={0.1} stroke={INK} strokeWidth={1.5} />
        {axes.map((ax, i) => {
          const [x, y] = pt(i, ax.score / max)
          return <circle key={ax.label} cx={x} cy={y} r={3} fill={INK} />
        })}
      </svg>
      <ul className="grid w-full grid-cols-2 gap-x-5 gap-y-2">
        {axes.map((ax) => (
          <li key={ax.label} className="flex items-baseline justify-between gap-2 border-b border-[#eceae5] pb-1.5">
            <span className="truncate text-[13px] text-[#55524a]">{ax.label}</span>
            <span className="shrink-0 text-[13px] font-medium tabular-nums text-[#16150f]">{ax.score}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Coverage as countable squares — “8 uncovered” beats “92%”. */
export function Waffle({ percent, caption }: { percent: number; caption?: string }) {
  const filled = Math.round(percent)
  return (
    <div>
      <div className="grid grid-cols-10 gap-[3px]">
        {Array.from({ length: 100 }, (_, i) => (
          <span
            key={i}
            className="aspect-square rounded-[2px]"
            style={{ backgroundColor: INK, opacity: i < filled ? 0.88 : 0.08 }}
          />
        ))}
      </div>
      {caption && <p className="mt-3.5 text-[13px] text-[#55524a]">{caption}</p>}
    </div>
  )
}

/** Thin progress meter for a single rate. */
export function Meter({ percent, label, value }: { percent: number; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] text-[#16150f]">{label}</span>
        <span className="text-[14px] font-medium tabular-nums text-[#16150f]">{value}</span>
      </div>
      <div className="mt-2 h-[5px] w-full overflow-hidden rounded-full bg-[#f0eee9]">
        <div
          className="h-full rounded-full bg-[#16150f]"
          style={{ width: `${Math.max(2, Math.min(percent, 100))}%` }}
        />
      </div>
    </div>
  )
}

/** Several rates together — operational health as one block, not four cards. */
export function MeterGroup({ items }: { items: { label: string; value: string; percent: number }[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((m) => (
        <Meter key={m.label} label={m.label} value={m.value} percent={m.percent} />
      ))}
    </div>
  )
}

/**
 * AI insights. Deliberately not a card: a hairline rail and a quiet label, so it
 * reads as annotation on the data above rather than another dashboard tile.
 */
export function Insights({ items }: { items: { text: string; tone?: Tone }[] }) {
  return (
    <ul className="flex flex-col gap-4 border-l border-[#dcd8d0] pl-5">
      {items.map((it) => (
        <li key={it.text} className="text-[15px] leading-[23px] text-[#16150f]">
          {it.tone && it.tone !== 'neutral' && (
            <span
              className="mr-2 inline-block size-[6px] -translate-y-[2px] rounded-full"
              style={{ backgroundColor: TONE[it.tone] }}
              aria-hidden
            />
          )}
          {it.text}
        </li>
      ))}
    </ul>
  )
}

/** Records that matter — capped short, because executives don't page through lists. */
export function Records({
  items,
}: {
  items: { label: string; sub: string; value: string; tone?: Tone }[]
}) {
  return (
    <ul className="divide-y divide-[#eceae5]">
      {items.map((it) => (
        <li key={`${it.label}-${it.sub}`} className="flex items-start gap-3 py-3">
          <span
            className="mt-[7px] size-[6px] shrink-0 rounded-full"
            style={{ backgroundColor: TONE[it.tone ?? 'neutral'] }}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] text-[#16150f]">{it.label}</span>
            <span className="mt-0.5 block truncate text-[12px] text-[#8a8680]">{it.sub}</span>
          </span>
          <span className="shrink-0 text-[12px] tabular-nums text-[#8a8680]">{it.value}</span>
        </li>
      ))}
    </ul>
  )
}

/** Dated highlights — only where chronology genuinely carries meaning. */
export function Events({ items }: { items: { when: string; text: string; tone?: Tone }[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((it, i) => (
        <li key={`${it.when}-${i}`} className="flex gap-4">
          <span className="w-[52px] shrink-0 pt-[1px] text-right text-[12px] tabular-nums text-[#b3aea6]">
            {it.when}
          </span>
          <span className="relative flex w-[9px] shrink-0 justify-center" aria-hidden>
            <span
              className="mt-[6px] size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: TONE[it.tone ?? 'neutral'] }}
            />
            {i < items.length - 1 && <span className="absolute top-[17px] bottom-0 w-px bg-[#eceae5]" />}
          </span>
          <span className={`min-w-0 flex-1 text-[14px] leading-[21px] text-[#55524a] ${i < items.length - 1 ? 'pb-5' : ''}`}>
            {it.text}
          </span>
        </li>
      ))}
    </ul>
  )
}
