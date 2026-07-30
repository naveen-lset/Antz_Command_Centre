import CardShell from './CardShell'
import type { CommandCentreSnapshot } from '../data'
import avatar from '../assets/avatar.png'

interface Props {
  approvals: CommandCentreSnapshot['approvals']
  onPress?: () => void
}

const two = (n: number) => String(n).padStart(2, '0')

const R = 24.5
const CIRC = 2 * Math.PI * R

export default function ApprovalsCard({ approvals, onPress }: Props) {
  const { pendingTasks, totalTasks, reviewers, more } = approvals
  const percentLeft = Math.round((pendingTasks / totalTasks) * 100)

  return (
    <CardShell
      onPress={onPress}
      className="flex w-full flex-col gap-3 overflow-hidden rounded-2xl bg-antz-deep p-4"
    >
      <span className="text-[14px] font-medium tracking-[0.1px] text-white">Approvals Pending</span>
      <span className="flex w-full items-center justify-between gap-3 rounded-lg bg-white p-3">
        <span className="flex min-w-0 flex-col gap-3">
          <span className="text-[14px] text-antz-on-surface-variant">
            <span className="font-semibold">{two(pendingTasks)}</span>
            <span className="font-medium tracking-[0.1px]">/{totalTasks} </span>
            tasks needs approval
          </span>
          <span className="flex items-center">
            {reviewers.map((r, i) =>
              r.photo ? (
                <img
                  key={i}
                  alt={r.initials}
                  src={avatar}
                  className="-mr-3 size-7 rounded-full border border-white object-cover"
                />
              ) : (
                <span
                  key={i}
                  className="-mr-3 flex size-7 items-center justify-center rounded-full border border-white text-[12px] font-medium tracking-[0.1px] text-antz-deep"
                  style={{ backgroundColor: r.color }}
                >
                  {r.initials}
                </span>
              ),
            )}
            <span className="flex size-7 items-center justify-center rounded-full border border-white bg-antz-surface-variant text-[12px] font-medium tracking-[0.1px] text-antz-on-surface">
              +{more}
            </span>
          </span>
        </span>
        <span className="grid shrink-0 place-items-center">
          {/* Progress arc driven by the data, starting at 12 o'clock */}
          <svg viewBox="0 0 56 56" className="col-start-1 row-start-1 size-[56px] -rotate-90" aria-hidden>
            <circle cx="28" cy="28" r={R} fill="none" stroke="var(--color-antz-deep-blue)" strokeOpacity="0.25" strokeWidth="3" />
            <circle
              cx="28"
              cy="28"
              r={R}
              fill="none"
              stroke="var(--color-antz-deep-blue)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(percentLeft / 100) * CIRC} ${CIRC}`}
            />
            <circle cx={28 + R} cy="28" r="3" fill="white" stroke="var(--color-antz-deep-blue)" strokeWidth="1.5" />
          </svg>
          <span className="col-start-1 row-start-1 flex flex-col items-center text-center">
            <span className="text-[16px] leading-tight font-medium text-antz-deep-blue">{percentLeft}%</span>
            <span className="text-[10px] leading-tight font-medium text-antz-on-surface-variant">left</span>
          </span>
        </span>
      </span>
    </CardShell>
  )
}
