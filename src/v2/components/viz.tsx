import type { SplitSegment, BreakdownItem } from '../model'

/**
 * 12-point sparkline: 2px de-emphasis stroke, current period + end-dot in the
 * section accent, ~8% area wash. Decorative — the delta text carries the story.
 */
export function Sparkline({
  data,
  accent,
  animate,
  width = 84,
  height = 40,
}: {
  data: number[]
  accent: string
  animate: boolean
  width?: number
  height?: number
}) {
  const pad = 5
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const step = (width - pad * 2) / (data.length - 1)
  const points = data.map((v, i) => [
    pad + i * step,
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ])
  const path = points.map(([x, y]) => `${x},${y}`).join(' ')
  const [lx, ly] = points[points.length - 1]
  const [px, py] = points[points.length - 2] ?? points[points.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0 overflow-visible">
      <polygon
        points={`${pad},${height - pad} ${path} ${lx},${height - pad}`}
        fill={accent}
        opacity={animate ? 0.08 : 0}
        style={{ transition: 'opacity 500ms ease 250ms' }}
      />
      <polyline
        points={path}
        fill="none"
        stroke="var(--color-spark-dim)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={animate ? 0 : 1}
        style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
      <g opacity={animate ? 1 : 0} style={{ transition: 'opacity 300ms ease 400ms' }}>
        <line x1={px} y1={py} x2={lx} y2={ly} stroke={accent} strokeWidth={2} strokeLinecap="round" />
        <circle cx={lx} cy={ly} r={3.5} fill={accent} stroke="white" strokeWidth={2} />
      </g>
    </svg>
  )
}

/** Proportion bar split by lightness steps of one hue, 2px surface gaps, always direct-labeled. */
export function SplitBar({ segments, animate }: { segments: SplitSegment[]; animate: boolean }) {
  return (
    <div>
      <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full">
        {segments.map((s) => (
          <div
            key={s.label}
            className="origin-left rounded-full"
            style={{
              backgroundColor: s.color,
              flexGrow: s.share,
              transform: animate ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            <span className="text-[12px] text-ink-2">{s.label}</span>
            <span className="text-[12px] font-semibold text-ink">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Label + value rows with a thin single-hue proportion bar (magnitude, not identity). */
export function BreakdownList({
  items,
  accent,
  animate,
}: {
  items: BreakdownItem[]
  accent: string
  animate: boolean
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-ink">{item.label}</span>
            <span className="text-[13px] font-semibold text-ink">{item.value}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: accent,
                width: `${item.share * 100}%`,
                transform: animate ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
                transition: `transform 500ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 60}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Progress meter — accent fill on a lighter step of the same hue. */
export function Meter({
  label,
  value,
  fraction,
  accent,
  animate,
}: {
  label: string
  value: string
  fraction: number
  accent: string
  animate: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className="text-[13px] font-semibold text-ink">{value}</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: `color-mix(in oklab, ${accent} 16%, white)` }}
      >
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: accent,
            width: `${fraction * 100}%`,
            transform: animate ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: 'left',
            transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
    </div>
  )
}
