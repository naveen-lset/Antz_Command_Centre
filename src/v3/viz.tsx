/** Micro-visualizations for the aesthetic concept. All decorative (aria-hidden by callers). */

const DOT_COLUMNS = [4, 2, 5, 3, 6, 3, 4, 2, 5, 3, 4, 6]

/** Columns of small rounded dashes — activity-tracker style. */
export function DotBars({ accent }: { accent: string }) {
  return (
    <div className="flex h-[52px] items-end gap-[5px]">
      {DOT_COLUMNS.map((count, i) => (
        <div key={i} className="flex flex-col-reverse gap-[3px]" style={{ opacity: i % 3 === 1 ? 0.4 : 1 }}>
          {Array.from({ length: count }, (_, j) => (
            <span key={j} className="h-[5px] w-[4px] rounded-full" style={{ backgroundColor: accent }} />
          ))}
        </div>
      ))}
    </div>
  )
}

const AREA_VALUES = [30, 28, 28.5, 26, 24, 24.5, 22, 20, 20.5, 18, 16, 15]

/** Smooth mini area line with a soft wash and an end dot. */
export function AreaMini({ accent }: { accent: string }) {
  const w = 132
  const h = 44
  const pad = 5
  const min = Math.min(...AREA_VALUES)
  const max = Math.max(...AREA_VALUES)
  const span = max - min || 1
  const step = (w - pad * 2) / (AREA_VALUES.length - 1)
  const pts = AREA_VALUES.map((v, i) => [pad + i * step, pad + (1 - (v - min) / span) * (h - pad * 2)])
  // Midpoint-quadratic smoothing: each point is a control, curve passes midway.
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const [nx, ny] = pts[i + 1]
    d += ` Q ${x} ${y}, ${(x + nx) / 2} ${(y + ny) / 2}`
  }
  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`
  const [lx, ly] = pts[pts.length - 1]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[44px] w-full overflow-visible" preserveAspectRatio="none">
      <path d={`${d} L ${lx} ${h} L ${pts[0][0]} ${h} Z`} fill={accent} opacity={0.1} />
      <path d={d} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3.5} fill={accent} stroke="white" strokeWidth={2} />
    </svg>
  )
}

/**
 * `AreaMini` with the series passed in — the 30-day trends card carries three
 * different ones, and a shared module constant could only draw one.
 *
 * Zero-based, unlike `AreaMini`: these are counts, and a floor at the series
 * minimum turns "two deaths instead of one" into a cliff.
 */
export function Sparkline({ values, accent, h = 34 }: { values: number[]; accent: string; h?: number }) {
  const w = 132
  const pad = 4
  const max = Math.max(...values, 1)
  const step = (w - pad * 2) / Math.max(values.length - 1, 1)
  const pts = values.map((v, i) => [pad + i * step, pad + (1 - v / max) * (h - pad * 2)] as const)
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const [nx, ny] = pts[i + 1]
    d += ` Q ${x} ${y}, ${(x + nx) / 2} ${(y + ny) / 2}`
  }
  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <path d={`${d} L ${w - pad} ${h} L ${pad} ${h} Z`} fill={accent} opacity={0.12} />
      <path d={d} fill="none" stroke={accent} strokeWidth={1.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Three series on ONE set of axes, rather than three stacked sparklines.
 *
 * The whole point of this card is whether births, deaths and new cases move
 * together — and three separate mini-charts, each auto-scaled to its own maximum,
 * is the one layout that cannot answer it: a flat line at 1–2 deaths and a rising
 * line at 2–6 cases were drawn the same height. One shared zero-based scale makes
 * the comparison true, and puts the three lines in the same picture so it can be
 * read at a glance instead of assembled from three.
 *
 * Zero-based on purpose: these are counts, and a floor at the series minimum turns
 * "two deaths instead of one" into a cliff.
 */
export function TrendLines({
  series,
  h = 96,
}: {
  series: { label: string; values: number[]; accent: string }[]
  h?: number
}) {
  const w = 300
  const pad = 6
  const max = Math.max(...series.flatMap((s) => s.values), 1)
  const inner = h - pad * 2

  const path = (values: number[]) => {
    const step = (w - pad * 2) / Math.max(values.length - 1, 1)
    const pts = values.map((v, i) => [pad + i * step, pad + (1 - v / max) * inner] as const)
    if (pts.length === 1) return { d: '', last: pts[0] }
    let d = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i]
      const [nx, ny] = pts[i + 1]
      d += ` Q ${x} ${y}, ${(x + nx) / 2} ${(y + ny) / 2}`
    }
    d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`
    return { d, last: pts[pts.length - 1] }
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none" aria-hidden>
      {/* One baseline, so the shared zero is visible and the lines have a floor to
          sit on rather than floating in the card. */}
      <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="#e6e4de" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {series.map((s) => {
        const { d } = path(s.values)
        return (
          <path
            key={s.label}
            d={d}
            fill="none"
            stroke={s.accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      {/* The latest point marked on each line — with three lines crossing, the end
          is the only place a reader can reliably tell which series is which. */}
      {series.map((s) => {
        const { last } = path(s.values)
        return <circle key={s.label} cx={last[0]} cy={last[1]} r={3} fill={s.accent} />
      })}
    </svg>
  )
}

const COLUMN_VALUES = [0.45, 0.7, 0.55, 0.8, 0.6, 0.9, 0.7, 1]

/** Solid rounded mini columns, the latest period in full accent. */
export function MiniColumns({ accent }: { accent: string }) {
  return (
    <div className="flex h-[52px] items-end gap-[7px]">
      {COLUMN_VALUES.map((v, i) => (
        <span
          key={i}
          className="w-[11px] rounded-[5px]"
          style={{
            height: `${Math.round(v * 100)}%`,
            backgroundColor: accent,
            opacity: i === COLUMN_VALUES.length - 1 ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  )
}

/** Calm ECG-style line. */
export function PulseLine({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 132 44" className="h-[44px] w-full" preserveAspectRatio="none">
      <polyline
        points="0,26 16,26 22,18 28,32 36,10 42,26 60,26 66,21 72,26 90,26 97,6 103,37 111,26 132,26"
        fill="none"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

const arcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
  const [sx, sy] = polar(cx, cy, r, start)
  const [ex, ey] = polar(cx, cy, r, end)
  return `M ${sx} ${sy} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${ex} ${ey}`
}

/** Dashed 270° arc gauge with a centered label — streak-ring style. */
export function ArcGauge({ fraction, label, accent = '#7c3aed' }: { fraction: number; label: string; accent?: string }) {
  const size = 84
  const r = 34
  const start = -135
  const sweep = 270

  return (
    <div className="relative size-[84px] shrink-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full">
        <path
          d={arcPath(size / 2, size / 2, r, start, start + sweep)}
          fill="none"
          stroke={accent}
          strokeOpacity={0.18}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="1 9"
        />
        <path
          d={arcPath(size / 2, size / 2, r, start, start + sweep * Math.min(fraction, 1))}
          fill="none"
          stroke={accent}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="7 6"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-10 place-items-center rounded-2xl bg-[#f2f0ea] text-[13px] font-semibold" style={{ color: accent }}>
          {label}
        </span>
      </span>
    </div>
  )
}
