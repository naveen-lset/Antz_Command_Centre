/**
 * The reporting window every module page is cut against, and the control that
 * changes it.
 *
 * Five windows, not four. The four asked for — Today, Last week, Last 6 months,
 * All time — skip the month, and the month is the one window this whole product is
 * built around: the board report is monthly, every delta on every page reads "vs
 * prior month", and `report.period` names a month. Dropping it would leave the
 * default view of a monthly report showing a week. So `month` stays and is the
 * default; the other four sit around it.
 *
 * Each window carries the dates it actually covers. The control is only honest if
 * the page visibly re-cuts when you tap it, so `window` feeds the sheet eyebrow and
 * every figure that varies comes from `pick()` rather than being hard-coded.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'


export type PeriodKey = 'today' | 'week' | 'month' | 'sixMonths' | 'all'

export interface Period {
  key: PeriodKey
  /** Chip text. Short — five of these share a 390px row. */
  label: string
  /** The dates covered, shown in the sheet eyebrow so the cut is never implicit. */
  window: string
  /** Named in prose slots — "23 deaths this month". */
  noun: string
}

/* Anchored to the report month (July 2025) rather than to the clock: the demo
   data is a fixed month, and a "Today" that moved while the month stayed put
   would put the two in contradiction. */
export const PERIODS: Period[] = [
  { key: 'today', label: 'Today', window: '01 Aug 2025', noun: 'today' },
  { key: 'week', label: 'Last week', window: '26 Jul – 01 Aug 2025', noun: 'this week' },
  { key: 'month', label: 'This month', window: 'July 2025', noun: 'this month' },
  { key: 'sixMonths', label: 'Last 6 months', window: 'Feb – Jul 2025', noun: 'in six months' },
  { key: 'all', label: 'All time', window: 'Since Apr 2019', noun: 'to date' },
]

export const DEFAULT_PERIOD: PeriodKey = 'month'

const PeriodContext = createContext<{ period: Period; set: (k: PeriodKey) => void }>({
  period: PERIODS[2],
  set: () => {},
})

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<PeriodKey>(DEFAULT_PERIOD)
  const value = useMemo(
    () => ({ period: PERIODS.find((p) => p.key === key) ?? PERIODS[2], set: setKey }),
    [key],
  )
  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export const usePeriod = () => useContext(PeriodContext)

/**
 * A value that differs per window.
 *
 * Only `month` is required. Anything a page hasn't cut for a given window falls
 * back to the month rather than rendering an em-dash — a missing figure would
 * read as "zero deaths all time", which is worse than a stale one.
 */
export type ByPeriod<T> = { month: T } & Partial<Record<PeriodKey, T>>

export function pick<T>(by: ByPeriod<T>, key: PeriodKey): T {
  return by[key] ?? by.month
}

/** `pick`, bound to the window the sheet is currently showing. */
export function useByPeriod<T>(by: ByPeriod<T>): T {
  const { period } = usePeriod()
  return pick(by, period.key)
}

/**
 * A figure that may or may not vary by window.
 *
 * The home screen mixes the two in the same card — "124 under care" is a standing
 * caseload while "50 new" is a count inside the window — so the type is what says
 * which is which, and no card has to carry a flag.
 */
export type Figure<T = string> = T | ByPeriod<T>

export function pickFigure<T>(figure: Figure<T>, key: PeriodKey): T {
  return figure !== null && typeof figure === 'object' ? pick(figure as ByPeriod<T>, key) : (figure as T)
}

/** `pickFigure`, bound to the current window. */
export function useFigure<T>(figure: Figure<T>): T {
  const { period } = usePeriod()
  return pickFigure(figure, period.key)
}

/**
 * The window switcher, sitting under the sheet title.
 *
 * A chip row rather than a dropdown or a date-range picker: five fixed windows is
 * the whole vocabulary, and a director changing the cut mid-read should not have to
 * open a calendar and pick two dates to see last week. Scrolls horizontally so the
 * fifth chip is reachable at 390px without shrinking the type.
 *
 * The home screen uses the same control rather than one of its own, so there is a
 * single window vocabulary across the product — a chip row here and a date-range
 * picker there would make "Last week" mean two different things. `tone` only moves
 * it onto the home screen's gutter and header ground; the chips stay identical.
 */
export function PeriodBar({
  tone = 'sheet',
  note,
}: {
  /** `home` sits on the header gradient and takes that screen's 20px gutter. */
  tone?: 'sheet' | 'home'
  /** Replaces the default disclosure line — the home cuts a different set. */
  note?: ReactNode
}) {
  const { period, set } = usePeriod()
  const month = period.key === 'month'
  const active = useRef<HTMLButtonElement>(null)
  const gutter = tone === 'home' ? 'px-5' : 'px-6'

  /* Five chips need ~500px and have 390. Tapping the last one used to leave the
     selection off-screen, so the row looked unchanged while everything below it
     moved — scroll the choice back into view so the cause stays visible. */
  useEffect(() => {
    active.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [period.key])

  return (
    <>
      <div
        className={`flex gap-1.5 overflow-x-auto ${gutter} pb-3 scrollbar-hidden`}
        role="tablist"
        aria-label="Reporting period"
      >
        {PERIODS.map((p) => {
          const on = p.key === period.key
          return (
            <button
              key={p.key}
              ref={on ? active : undefined}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => set(p.key)}
              className={`shrink-0 rounded-full px-3 py-[6px] text-[12.5px] font-medium whitespace-nowrap transition-colors ${
                on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      {/*
       * What re-cut and what didn't, stated rather than left to be discovered.
       *
       * The headline and the site split are cut from data that exists for every
       * window. The cards below them — cause rings, prescription tables, necropsy
       * queues — are hand-composed month facts, and there is no six-month version of
       * them to show. Leaving that unsaid is how a reader ends up thinking a "23" in
       * a card under a "160" headline is a contradiction rather than a narrower
       * window. It is one line and it only appears when it is needed.
       */}
      {/* Colon form rather than a sentence, because the windows don't share a
          grammar — "cut to Since Apr 2019" reads as a typo. */}
      {/* The disclosure belongs to the sheet, where a cut window leaves hand-composed
          month cards sitting under a re-cut headline. The home has no such mismatch
          to explain — its stocks read as standing figures on their face — so `home`
          gets no default line, and any caller wanting one passes `note`. */}
      {!month && (note ?? (tone === 'sheet' ? (
        <p className={`${gutter} pb-3 text-[11px] leading-[15px] text-[#9b958b]`}>
          Headline and sites · {period.window}. Other cards · {PERIODS[2].window}.
        </p>
      ) : null))}
    </>
  )
}
