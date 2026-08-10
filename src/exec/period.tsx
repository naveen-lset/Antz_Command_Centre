/**
 * THE REPORTING WINDOW — now a thin adapter over `core/calendar` and the global scope.
 *
 * WHAT THIS FILE USED TO BE, AND WHY IT ISN'T ANY MORE. It held a table that mapped nine
 * windows onto five authored data columns and multiplied the gap: yesterday was today ×
 * 1.6, a quarter was a month × 2.92, a year was six months × 1.96, and a custom range was
 * read off "the nearest reported grain" and scaled by however many days you picked. The UI
 * even printed a note admitting the last one was an estimate.
 *
 * Those factors were invented. Not approximations of something measured — invented, and
 * then rendered in the same typeface as the figures that weren't. `core/series.ts` now
 * derives a real daily series that satisfies every authored figure exactly, so a window is a
 * sum over days and the factor table is deleted rather than relabelled. A custom range of
 * 12–19 May sums the actual days 12–19 May, which is why the estimate disclaimer is gone
 * from the date sheet: there is nothing left to disclaim.
 *
 * WHY THE FILE SURVIVES AT ALL. Twenty-two pages and the whole design system import
 * `usePeriod` from here. Keeping the name and the shape means the change to real
 * aggregation is one edit in two adapter files rather than an edit in every page — and a
 * page that was reading a scaled figure is now reading a real one without knowing it
 * changed. `PeriodProvider` survives as a no-op for the same reason.
 */

import type { ReactNode } from 'react'
import { WINDOWS, resolveWindow, type Win, type WindowKey } from '../core/calendar'
import { useScope } from '../v4/scope'

/** The window keys. Named `PeriodKey` because that is what the call sites already say. */
export type PeriodKey = WindowKey

export interface Period {
  key: PeriodKey
  /** Menu text. */
  label: string
  /** The dates covered — printed wherever a figure needs its window stated. */
  window: string
  /** Named in prose slots — "23 deaths this month". */
  noun: string
}

/**
 * A resolved window: real first and last day, and the day count.
 *
 * Still called `Cut` at the call sites. It no longer carries a scale factor, because there
 * is nothing to scale — the name survives, the estimate does not.
 */
export type Cut = Win

/** Every window the product offers, plus the custom range. */
export const PERIODS: Period[] = [
  ...WINDOWS.map((w) => ({ key: w.key, label: w.label, window: w.window, noun: w.noun })),
  { key: 'custom' as PeriodKey, label: 'Custom range', window: 'Pick two dates', noun: 'in the range' },
]

export const DEFAULT_PERIOD: PeriodKey = 'month'

/**
 * Kept so the twenty-two existing call sites compile, and deliberately inert.
 *
 * It used to create a window that reset per module — `App` re-keyed it on every route,
 * which is precisely how the window filter stopped being global. The scope now lives in one
 * place above the router (`v4/scope.tsx`), so nesting this can no longer isolate anything.
 * Left as a passthrough rather than deleted so a stray usage degrades to correct behaviour
 * instead of a crash.
 */
export function PeriodProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function usePeriod(): {
  period: Period
  cut: Cut
  set: (k: PeriodKey) => void
  custom: { from: string; to: string }
  setCustom: (c: { from: string; to: string }) => void
} {
  const { scope, windowKey, setWindow, custom, setCustom } = useScope()
  const base = PERIODS.find((p) => p.key === windowKey) ?? PERIODS[4]
  return {
    /* A custom range names its own dates rather than the word "Custom" — the window is
       stated on every page, and "Custom" states nothing. */
    period: { ...base, window: scope.win.window },
    cut: scope.win,
    set: setWindow,
    custom,
    setCustom,
  }
}

/* ── authored values that differ by window ───────────────────────────────── */

/**
 * A value a page authors per window — a status sentence, a caption, a label.
 *
 * This is legitimate authoring rather than estimation: it holds *words*, not derived
 * figures. Every number in the product now comes from `core/query.ts`. Where a page still
 * authors a number here it is stating something no metric models, and the fallback below is
 * why such a value never renders as an em-dash.
 */
export type ByPeriod<T> = { month: T } & Partial<Record<PeriodKey, T>>

/** Windows fall back to the nearest coarser authored one, then to the month. */
const FALLBACK: Record<PeriodKey, PeriodKey> = {
  today: 'today',
  yesterday: 'today',
  last7: 'last7',
  last30: 'month',
  month: 'month',
  lastMonth: 'month',
  quarter: 'month',
  /* Six months falls to the all-time wording where a page authored one, as `year` does — a
     half-year caption written for "this month" reads wrong at that span. */
  half: 'all',
  year: 'all',
  all: 'all',
  custom: 'month',
}

export function pick<T>(by: ByPeriod<T>, key: PeriodKey): T {
  return by[key] ?? by[FALLBACK[key]] ?? by.month
}

export function useByPeriod<T>(by: ByPeriod<T>): T {
  const { period } = usePeriod()
  return pick(by, period.key)
}

/** A value that may or may not vary by window. The type is what says which. */
export type Figure<T = string> = T | ByPeriod<T>

export function pickFigure<T>(figure: Figure<T>, key: PeriodKey): T {
  return figure !== null && typeof figure === 'object' ? pick(figure as ByPeriod<T>, key) : (figure as T)
}

export function useFigure<T>(figure: Figure<T>): T {
  const { period } = usePeriod()
  return pickFigure(figure, period.key)
}

/** Resolve a key without a hook — for the few places outside the tree. */
export const resolvePeriod = (key: PeriodKey, custom?: { from: string; to: string }): Cut =>
  resolveWindow(key, custom)
