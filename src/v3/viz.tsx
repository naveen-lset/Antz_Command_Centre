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
