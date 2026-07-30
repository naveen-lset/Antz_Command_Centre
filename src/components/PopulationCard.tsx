import CardShell from './CardShell'
import { useCountUp } from '../hooks/useCountUp'
import type { SexSplit } from '../data'

interface Props {
  totalLakh: number
  split: SexSplit
  onPress?: () => void
}

const SEGMENTS = [
  { key: 'male', label: 'M', name: 'Male', className: 'bg-antz-secondary' },
  { key: 'female', label: 'F', name: 'Female', className: 'bg-antz-secondary-container' },
  { key: 'unknown', label: 'U', name: 'Unknown', className: 'bg-black/20' },
] as const

/** Flagship KPI — total animal population with male/female/unknown split. */
export default function PopulationCard({ totalLakh, split, onPress }: Props) {
  const total = useCountUp(totalLakh, { decimals: 1 })
  const sum = split.male + split.female + split.unknown
  const pct = (n: number) => Math.round((n / sum) * 100)

  return (
    <CardShell
      onPress={onPress}
      className="flex h-[180px] min-w-0 basis-1/2 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-b from-antz-deep-blue to-antz-primary p-4"
    >
      <div className="flex flex-col gap-1 text-white">
        <span className="text-[40px] leading-none">{total}L</span>
        <span className="pt-1 text-[12px] leading-4">Total Animals</span>
      </div>
      <div className="flex w-full flex-col gap-2">
        <span className="sr-only">
          {SEGMENTS.map((s) => `${s.name} ${pct(split[s.key])}%`).join(', ')}
        </span>
        <div className="flex h-[5px] w-full overflow-hidden rounded" aria-hidden>
          {SEGMENTS.map((s) => (
            <div key={s.key} className={s.className} style={{ flexGrow: split[s.key] }} />
          ))}
        </div>
        <div className="flex gap-2" aria-hidden>
          {SEGMENTS.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className={`size-1 ${s.className}`} />
              <span className="text-[10px] leading-none font-medium text-white">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
    </CardShell>
  )
}
