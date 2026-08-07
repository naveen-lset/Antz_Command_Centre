/**
 * Executive panel — the desktop right rail.
 *
 * Appears only when there is width to spare, and carries only live state: weather over
 * the site, the queues waiting on a decision, and what has happened this morning. It
 * is deliberately the quietest column on the screen — smaller type, no display
 * numerals in the lists, no charts — because everything in it is context for the home
 * in the middle rather than a competitor to it. A rail with its own hero would split
 * the page into two things to read first.
 *
 * The queues are DERIVED from the same arrays the home renders, not restated. V3's
 * rail carried four hand-typed figures beside a comment asking that they be kept in
 * step by hand; here approving a request on the home is the same object the rail is
 * counting.
 *
 * The rows open sheets rather than navigating, matching the home. The one exception is
 * Recent activity, whose entries genuinely belong to another module — the rail states
 * that something happened; the module is where it is dealt with.
 */

import { ChevronRight, CloudSun, Thermometer } from 'lucide-react'
import { TONE } from '../exec/system'
import {
  activity,
  approvals,
  criticalAlerts,
  railQueues,
  risks,
  site,
} from './data'
import { useSheet } from './sheet'
import { AlertPanel, ApprovalPanel, RiskPanel } from './panels'
import { titleOf } from './nav'

const CARD = 'rounded-[18px] bg-white'

export function ExecutivePanel() {
  return (
    <aside
      aria-label="Live operations"
      className="sticky top-[var(--shell-pad)] flex max-h-[calc(100dvh-var(--shell-pad)*2)] w-[var(--panel)] shrink-0 flex-col gap-[var(--shell-gap)] overflow-y-auto scrollbar-hidden"
    >
      <Weather />
      <Queues />
      <TopRisks />
      <Recent />
    </aside>
  )
}

function Weather() {
  return (
    <section className={`${CARD} p-5`} aria-label="Weather">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#1c1a16]">{site.zooName}</p>
          <p className="mt-0.5 text-[11.5px] text-[#9b958b]">{site.weather.summary}</p>
        </div>
        <CloudSun size={26} strokeWidth={1.5} className="shrink-0 text-[#0284c7]" aria-hidden />
      </div>
      <p className="mt-3 font-display text-[38px] leading-none font-bold tabular-nums text-[#1c1a16]">
        {site.weather.tempC}°
      </p>
      <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] tabular-nums text-[#6d6860]">
        <Thermometer size={12} strokeWidth={1.75} aria-hidden />
        Feels {site.weather.feelsLike}° · H {site.weather.high}° · L {site.weather.low}°
      </p>
    </section>
  )
}

function Queues() {
  const { open } = useSheet()

  /* The first two rows open the thing they count. The last two have no home-screen
     object behind them, so they navigate to the module that owns the queue — the one
     place in V4 where a rail row still leaves the page. */
  const openFor = (slug: string) => {
    if (slug === 'alerts') {
      const worst = criticalAlerts[0]
      return () => open({ title: worst.label, eyebrow: `${worst.count} open · ${worst.level}`, body: <AlertPanel alert={worst} /> })
    }
    if (slug === 'approvals') {
      const first = approvals[0]
      return () =>
        open({ title: first.label, eyebrow: `${first.requests.length} waiting on you`, body: <ApprovalPanel group={first} /> })
    }
    return undefined
  }

  return (
    <section className={`${CARD} px-5 py-4`} aria-label="Queues">
      <h2 className="pb-1 text-[10.5px] font-semibold tracking-[0.09em] text-[#9b958b] uppercase">Needs attention</h2>
      <ul className="divide-y divide-[#f0efec]">
        {railQueues.map((q) => {
          const onOpen = openFor(q.slug)
          const inner = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[#1c1a16]">{q.label}</span>
                <span className="mt-0.5 block truncate text-[11.5px] text-[#9b958b]">{q.note}</span>
              </span>
              <span
                className="shrink-0 font-display text-[19px] leading-none font-bold tabular-nums"
                style={{ color: TONE[q.tone] }}
              >
                {q.value}
              </span>
              <ChevronRight size={14} strokeWidth={2} className="shrink-0 text-[#c9c4bb]" aria-hidden />
            </>
          )
          return (
            <li key={q.slug}>
              {onOpen ? (
                <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 py-3 text-left last:pb-0">
                  {inner}
                </button>
              ) : (
                <a href={`#/${q.slug}`} className="flex items-center gap-3 py-3 last:pb-0">
                  {inner}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * The three highest risks, as a rail-sized version of the home's section.
 *
 * The rail is read while working inside a module, which is exactly when the home's
 * risk list is off screen — and a risk that only exists on a screen you are not on is
 * a risk nobody sees.
 */
function TopRisks() {
  const { open } = useSheet()
  const top = risks.filter((r) => r.level === 'high').slice(0, 3)
  if (top.length === 0) return null

  return (
    <section className={`${CARD} px-5 py-4`} aria-label="Risks">
      <h2 className="pb-1 text-[10.5px] font-semibold tracking-[0.09em] text-[#9b958b] uppercase">Top risks</h2>
      <ul className="divide-y divide-[#f0efec]">
        {top.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              onClick={() => open({ title: r.label, eyebrow: `${r.level} risk`, body: <RiskPanel risk={r} /> })}
              className="flex w-full items-center gap-3 py-3 text-left last:pb-0"
            >
              <r.icon size={15} strokeWidth={1.75} className="shrink-0" style={{ color: TONE.bad }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[#1c1a16]">{r.label}</span>
                <span className="mt-0.5 block truncate text-[11.5px] text-[#9b958b]">{r.note}</span>
              </span>
              <span className="shrink-0 font-display text-[17px] leading-none font-bold tabular-nums" style={{ color: TONE.bad }}>
                {r.value}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Recent() {
  return (
    <section className={`${CARD} px-5 py-4`} aria-label="Recent activity">
      <h2 className="pb-2 text-[10.5px] font-semibold tracking-[0.09em] text-[#9b958b] uppercase">Recent activity</h2>
      <ul className="flex flex-col">
        {activity.map((a, i) => (
          <li key={`${a.at}-${i}`}>
            <a href={`#/${a.slug}`} className="flex gap-3 py-2" title={titleOf(a.slug)}>
              {/* A dot and a rule, not a bullet list: the column of dots reads as one
                  thread through the morning rather than seven separate notes. */}
              <span className="relative flex w-2 shrink-0 justify-center pt-[6px]" aria-hidden>
                <span
                  className="size-[5px] rounded-full"
                  style={{ backgroundColor: a.tone ? TONE[a.tone] : '#c9c4bb' }}
                />
                {i < activity.length - 1 && <span className="absolute top-[15px] bottom-[-8px] w-px bg-[#f0efec]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] leading-[17px] text-[#3d3a34]">{a.text}</span>
                <span className="mt-0.5 block text-[11px] tabular-nums text-[#9b958b]">{a.at}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
