import { CloudSun, MapPin, Search } from 'lucide-react'
import { greetingFor, useNow } from '../../hooks/useNow'
import { site } from '../data'
import type { Range } from '../model'

const two = (n: number) => String(n).padStart(2, '0')

export function HeroGreeting({ mountedAt }: { mountedAt: Date }) {
  const now = useNow()
  const agoMin = Math.floor((now.getTime() - mountedAt.getTime()) / 60_000)

  return (
    <header className="px-5 pt-10 pb-6">
      <p className="text-[16px] leading-6 text-ink-2">{greetingFor(now)},</p>
      <h1 className="mt-0.5 font-display text-[34px] leading-10 font-bold tracking-[-0.02em] text-ink">
        {site.userName}
      </h1>
      <p className="mt-2 text-[13px] leading-5 text-ink-2">
        {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        {' · '}
        <span className="tabular-nums">
          {two(now.getHours())}:{two(now.getMinutes())}
        </span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] leading-5 text-ink-2">
        <span className="flex items-center gap-1.5">
          <MapPin size={14} strokeWidth={1.75} aria-hidden className="text-ink-3" />
          {site.zooName}
        </span>
        <span className="flex items-center gap-1.5">
          <CloudSun size={14} strokeWidth={1.75} aria-hidden className="text-ink-3" />
          {site.weather.tempC}° {site.weather.summary}
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-4 text-ink-3">
        {agoMin < 1 ? 'Updated just now' : `Updated ${agoMin} min ago`}
      </p>
    </header>
  )
}

const RANGES: Array<{ key: Range; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
]

interface StickyBarProps {
  compact: boolean
  query: string
  onQuery: (q: string) => void
  range: Range
  onRange: (r: Range) => void
  chips: Array<{ id: string; label: string }>
  activeChip: string | null
  onChip: (id: string) => void
}

/** Sticky bar: compact identity fades in on scroll; search + range + section chips stay pinned. */
export function StickyBar({ compact, query, onQuery, range, onRange, chips, activeChip, onChip }: StickyBarProps) {
  const now = useNow()

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-white/92 backdrop-blur-md">
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: compact ? '1fr' : '0fr', opacity: compact ? 1 : 0 }}
        aria-hidden={!compact}
      >
        <div className="overflow-hidden">
          <div className="flex items-baseline justify-between px-5 pt-3">
            <p className="text-[13px] font-medium text-ink">
              {site.userName}
              <span className="font-normal text-ink-3"> — {site.zooName}</span>
            </p>
            <p className="text-[13px] text-ink-2 tabular-nums">
              {two(now.getHours())}:{two(now.getMinutes())}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-3">
        <label className="flex h-10 items-center gap-2.5 rounded-xl border border-line bg-page px-3.5">
          <Search size={16} strokeWidth={1.75} className="shrink-0 text-ink-3" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search animals, staff, records, modules…"
            className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
            aria-label="Universal search"
          />
        </label>
      </div>

      <div className="scrollbar-hidden flex items-center gap-2 overflow-x-auto px-5 py-3">
        <div className="flex shrink-0 rounded-full bg-page p-0.5" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onRange(r.key)}
              aria-pressed={range === r.key}
              className={`cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap transition-colors duration-200 ${
                range === r.key ? 'bg-white text-ink shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'text-ink-2'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="h-4 w-px shrink-0 bg-line" aria-hidden />
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChip(chip.id)}
            className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1 text-[12px] font-medium whitespace-nowrap transition-colors duration-200 ${
              activeChip === chip.id
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-white text-ink-2'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
