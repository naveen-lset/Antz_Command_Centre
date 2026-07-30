import CardShell from './CardShell'
import { useCountUp } from '../hooks/useCountUp'

interface Props {
  icon: string
  iconSize: number
  title: string
  subtitle: string
  value: number
  valueLabel: string
  /** Card tint — colour is an accent, never a loud fill. */
  bg: 'surface-variant' | 'secondary-container'
  onPress?: () => void
}

const BG: Record<Props['bg'], string> = {
  'surface-variant': 'bg-antz-surface-variant',
  'secondary-container': 'bg-antz-secondary-container',
}

/** Full-width module summary row: icon, title + insight, big metric. */
export default function ModuleRow({ icon, iconSize, title, subtitle, value, valueLabel, bg, onPress }: Props) {
  const display = useCountUp(value)

  return (
    <CardShell
      onPress={onPress}
      className={`flex w-full items-center gap-3 overflow-hidden rounded-2xl ${BG[bg]} p-4`}
    >
      <span className="flex size-[57px] shrink-0 items-center justify-center rounded-full bg-white">
        <img alt="" src={icon} style={{ width: iconSize, height: iconSize }} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] leading-5 font-semibold text-antz-deep">{title}</span>
        <span className="text-[12px] leading-[18px] text-antz-deep/70">{subtitle}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end text-black">
        <span className="text-[32px] leading-[39px]">{display}</span>
        <span className="text-[12px] leading-4">{valueLabel}</span>
      </span>
    </CardShell>
  )
}
