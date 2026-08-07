/**
 * The reporting window every figure in the product is cut against.
 *
 * NINE WINDOWS AND A CUSTOM RANGE, over five authored columns.
 *
 * The demo data set states each module's figures at five grains — a day, a week, a
 * month, six months and all time — and those five are what `sites.ts` holds per site.
 * The windows an executive actually asks for are a different, longer list: yesterday,
 * last 30 days, last month, this quarter, this year. Rather than hand-author nine
 * columns for thirteen modules across six sites (a spreadsheet nobody could keep
 * consistent), each window declares which authored column it reads from and how it
 * scales off it.
 *
 * That is a real modelling decision and it is stated rather than hidden: `anchor` is
 * public, `Stamp` prints the window, and the scale only ever applies to COUNTS. A
 * stock — how many animals are alive — is a headcount at the window's end and does not
 * multiply; a rate is a ratio and does not either. Only flows accumulate.
 */

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * The five authored columns. These are the grains `sites.ts` actually holds, and the
 * keys `ByPeriod` figures are written against.
 */
export type AnchorKey = 'today' | 'week' | 'month' | 'sixMonths' | 'all'

/** Every window the product offers, plus the three anchors that are not themselves offered. */
export type PeriodKey =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'month'
  | 'lastMonth'
  | 'quarter'
  | 'year'
  | 'custom'
  | AnchorKey

export interface Period {
  key: PeriodKey
  /** Menu text. */
  label: string
  /** The dates covered — shown wherever a figure needs its window stated. */
  window: string
  /** Named in prose slots — "23 deaths this month". */
  noun: string
}

/**
 * A window, resolved to the authored column it reads and the factor to apply.
 *
 * Passed around instead of the bare key so that a custom range — whose anchor depends
 * on how many days the reader picked — cannot be resolved differently by two callers.
 * The alternative was a module-level "current custom range" that every cut reached
 * into, which is the same bug waiting for a second provider to exist.
 */
export interface Cut {
  key: PeriodKey
  of: AnchorKey
  scale: number
}

/*
 * Anchored to the report month (July 2025) rather than to the clock: the demo data is
 * a fixed month, and a "Today" that moved while the month stayed put would put the two
 * in contradiction. "Today" is 01 Aug 2025, the day after the month closes.
 */
export const PERIODS: Period[] = [
  { key: 'today', label: 'Today', window: '01 Aug 2025', noun: 'today' },
  { key: 'yesterday', label: 'Yesterday', window: '31 Jul 2025', noun: 'yesterday' },
  { key: 'last7', label: 'Last 7 days', window: '26 Jul – 01 Aug 2025', noun: 'this week' },
  { key: 'last30', label: 'Last 30 days', window: '03 Jul – 01 Aug 2025', noun: 'in 30 days' },
  { key: 'month', label: 'This month', window: 'July 2025', noun: 'this month' },
  { key: 'lastMonth', label: 'Last month', window: 'June 2025', noun: 'last month' },
  { key: 'quarter', label: 'Quarter', window: 'May – Jul 2025', noun: 'this quarter' },
  { key: 'year', label: 'Year', window: 'Aug 2024 – Jul 2025', noun: 'this year' },
  { key: 'custom', label: 'Custom range', window: 'Custom', noun: 'in the range' },
]

export const DEFAULT_PERIOD: PeriodKey = 'month'

/**
 * Which authored column a window reads, and the factor between them.
 *
 * `scale` is applied to COUNTS ONLY. Deliberately not round: a quarter is 2.92 months
 * of reporting days, not three, and a year of flow against a six-month column is a
 * shade under double because the collection was smaller in the earlier half.
 */
export const ANCHOR: Record<PeriodKey, { of: AnchorKey; scale: number }> = {
  today: { of: 'today', scale: 1 },
  /* The set authors one day. Yesterday reads the same column at a different draw —
     31 July was a heavier day than 1 August across every module, which is why the
     factor is above one rather than a copy. */
  yesterday: { of: 'today', scale: 1.6 },
  last7: { of: 'week', scale: 1 },
  last30: { of: 'month', scale: 1 },
  month: { of: 'month', scale: 1 },
  lastMonth: { of: 'month', scale: 0.94 },
  quarter: { of: 'month', scale: 2.92 },
  year: { of: 'sixMonths', scale: 1.96 },
  custom: { of: 'month', scale: 1 },
  week: { of: 'week', scale: 1 },
  sixMonths: { of: 'sixMonths', scale: 1 },
  all: { of: 'all', scale: 1 },
}

interface Custom {
  from: string
  to: string
}

interface Ctx {
  period: Period
  /** The window resolved against the authored columns — hand this to every cut. */
  cut: Cut
  set: (k: PeriodKey) => void
  custom: Custom
  setCustom: (c: Custom) => void
}

const DEFAULT_CUSTOM: Custom = { from: '2025-07-01', to: '2025-07-31' }

const PeriodContext = createContext<Ctx>({
  period: PERIODS[4],
  cut: { key: 'month', of: 'month', scale: 1 },
  set: () => {},
  custom: DEFAULT_CUSTOM,
  setCustom: () => {},
})

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`
}

/** Whole days between two ISO dates, inclusive. Drives the custom range's anchor. */
export const spanDays = (c: Custom) =>
  Math.max(1, Math.round((Date.parse(c.to) - Date.parse(c.from)) / 86_400_000) + 1)

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<PeriodKey>(DEFAULT_PERIOD)
  const [custom, setCustom] = useState<Custom>(DEFAULT_CUSTOM)

  const value = useMemo<Ctx>(() => {
    const found = PERIODS.find((p) => p.key === key) ?? PERIODS[4]
    /* A custom range names its own dates rather than the word "Custom" — the window is
       stated on every page, and "Custom" states nothing. */
    const period =
      key === 'custom'
        ? { ...found, window: `${fmtDate(custom.from)} – ${fmtDate(custom.to)}` }
        : found
    return { period, cut: { key, ...resolve(key, custom) }, set: setKey, custom, setCustom }
  }, [key, custom])

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export const usePeriod = () => useContext(PeriodContext)

/**
 * Resolve a window to the authored column it reads and the factor to apply.
 *
 * A custom range picks its anchor by LENGTH — a four-day range reads the week column,
 * a ten-week range reads six months — and scales by how far the requested span is from
 * that column's own. It is an estimate and the UI says so by printing the dates.
 */
export function resolve(key: PeriodKey, custom?: Custom): { of: AnchorKey; scale: number } {
  if (key !== 'custom' || !custom) return ANCHOR[key] ?? ANCHOR.month
  const days = spanDays(custom)
  if (days <= 1) return { of: 'today', scale: 1 }
  if (days <= 10) return { of: 'week', scale: days / 7 }
  if (days <= 45) return { of: 'month', scale: days / 30 }
  if (days <= 400) return { of: 'sixMonths', scale: days / 182 }
  return { of: 'all', scale: 1 }
}

/**
 * A value that differs per window.
 *
 * Only `month` is required. Anything a page has not cut for a window falls back to its
 * ANCHOR column first and then to the month, rather than rendering an em-dash — a
 * missing figure would read as "zero deaths all time", which is worse than a coarse
 * one. It is the anchor fallback that lets nine windows run on five authored columns
 * without every call site being rewritten.
 */
export type ByPeriod<T> = { month: T } & Partial<Record<PeriodKey, T>>

export function pick<T>(by: ByPeriod<T>, key: PeriodKey): T {
  return by[key] ?? by[ANCHOR[key]?.of ?? 'month'] ?? by.month
}

/** `pick`, bound to the window currently selected. */
export function useByPeriod<T>(by: ByPeriod<T>): T {
  const { period } = usePeriod()
  return pick(by, period.key)
}

/**
 * A figure that may or may not vary by window.
 *
 * The home mixes the two in one card — "124 under care" is a standing caseload while
 * "50 new" is a count inside the window — so the type is what says which is which, and
 * no card has to carry a flag.
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
