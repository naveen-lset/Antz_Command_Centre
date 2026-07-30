import CardShell from './CardShell'
import iconPharmacy from '../assets/icon-pharmacy.svg'
import iconInjection from '../assets/icon-injection.svg'
import iconTransfers from '../assets/icon-transfers.svg'
import iconNecropsy from '../assets/icon-necropsy.svg'

interface Action {
  label: string
  icon: string
  iconClass: string
}

const ACTIONS: Action[] = [
  { label: 'Pharmacy', icon: iconPharmacy, iconClass: 'h-[42px] w-12' },
  { label: 'Deworming', icon: iconInjection, iconClass: 'size-12' },
  { label: 'Transfers', icon: iconTransfers, iconClass: 'h-[52px] w-[45px]' },
  { label: 'Necropsy', icon: iconNecropsy, iconClass: 'h-[38px] w-12' },
]

/** Horizontally scrollable module shortcuts. */
export default function QuickActions({ onPress }: { onPress?: (label: string) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto scrollbar-hidden">
      <div className="flex w-max gap-4 px-4 pb-1">
        {ACTIONS.map((a) => (
          <CardShell
            key={a.label}
            onPress={onPress && (() => onPress(a.label))}
            className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-xl bg-antz-secondary-container/30 p-4"
          >
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-antz-secondary-container/30">
              <img alt="" src={a.icon} className={a.iconClass} />
            </span>
            <span className="text-center text-[14px] font-medium tracking-[0.1px] whitespace-nowrap text-antz-on-surface-variant">
              {a.label}
            </span>
          </CardShell>
        ))}
      </div>
    </div>
  )
}
