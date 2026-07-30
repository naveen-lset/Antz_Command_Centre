import type { ReactNode } from 'react'
import { MoveDownRight, MoveRight, MoveUpRight } from 'lucide-react'
import type { ActivityItem, Delta, Stat, Status, StatusTone } from '../model'

const TONE_DOT: Record<StatusTone, string> = {
  good: 'bg-status-good',
  warn: 'bg-status-warn',
  critical: 'bg-status-critical',
  neutral: 'bg-ink-3',
}

/** Status is never color alone — dot carries tone, text carries the label. */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className={`size-1.5 rounded-full ${TONE_DOT[status.tone]}`} aria-hidden />
      <span className="text-[12px] font-medium text-ink-2">{status.text}</span>
    </span>
  )
}

const DELTA_ICON = { up: MoveUpRight, down: MoveDownRight, flat: MoveRight }

export function DeltaBadge({ delta }: { delta: Delta }) {
  const Icon = DELTA_ICON[delta.direction]
  const color =
    delta.direction === 'flat'
      ? 'text-ink-2'
      : delta.positive
        ? 'text-status-good'
        : 'text-status-critical'
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      {delta.direction !== 'flat' && <Icon size={13} strokeWidth={2} aria-hidden />}
      <span className="text-[13px] font-medium">{delta.text}</span>
    </span>
  )
}

export function StatGrid({ items }: { items: Stat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
      {items.map((s) => (
        <div key={s.label}>
          <dd className={`text-[20px] leading-6 font-semibold ${s.accent ? 'text-status-critical' : 'text-ink'}`}>
            {s.value}
          </dd>
          <dt className="mt-0.5 text-[12px] text-ink-2">{s.label}</dt>
        </div>
      ))}
    </dl>
  )
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((item, i) => (
        <li
          key={`${item.time}-${i}`}
          className={`flex gap-3 py-2 ${i > 0 ? 'border-t border-line' : ''}`}
        >
          <span className="w-16 shrink-0 text-[12px] leading-5 text-ink-3 tabular-nums">{item.time}</span>
          <span className="text-[13px] leading-5 text-ink">{item.text}</span>
        </li>
      ))}
    </ul>
  )
}

export function SubTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-[12px] font-medium tracking-[0.04em] text-ink-3 uppercase">{children}</h3>
  )
}

/** Smooth inline expansion via grid-rows — no height measuring. */
export function Expandable({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden">
        <div
          className="transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(8px)' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
