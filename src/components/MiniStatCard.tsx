import CardShell from './CardShell'
import { useCountUp } from '../hooks/useCountUp'

interface Props {
  value: number
  label: string
  /** Weekly trend, first bar highlighted (current period). Heights in px, max 39. */
  trend: number[]
  color: 'secondary' | 'tertiary'
  onPress?: () => void
}

const BG: Record<Props['color'], string> = {
  secondary: 'bg-antz-secondary',
  tertiary: 'bg-antz-tertiary',
}

/** Compact KPI card — big number, small label, tiny bar sparkline. */
export default function MiniStatCard({ value, label, trend, color, onPress }: Props) {
  const display = useCountUp(value)

  return (
    <CardShell
      onPress={onPress}
      className={`flex min-h-0 min-w-0 flex-1 items-center overflow-hidden rounded-2xl ${BG[color]} px-4 pt-4 pb-3`}
    >
      <div className="flex w-full min-w-0 items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[32px] leading-[39px] text-white">{display}</span>
          <span className="text-[12px] leading-4 font-medium text-white">{label}</span>
        </div>
        <div className="flex h-[39px] w-[68px] min-w-0 shrink items-end justify-between gap-px" aria-hidden>
          {trend.map((h, i) => (
            <span
              key={i}
              className={`w-2 min-w-1 shrink origin-bottom animate-rise rounded-[2px] ${i === 0 ? 'bg-white/60' : 'bg-white/20'}`}
              style={{ height: h, animationDelay: `${200 + i * 45}ms` }}
            />
          ))}
        </div>
      </div>
    </CardShell>
  )
}
