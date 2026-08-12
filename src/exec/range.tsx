/**
 * THE PER-CHART RANGE — a window that belongs to one card rather than to the page.
 *
 * WHY A SECOND WINDOW CONTROL EXISTS AT ALL. The global filter answers "what period is this
 * report about", and every figure on the page obeys it. A trend asks a different question:
 * "what shape is this over time". Those two wants collide at exactly the point the global
 * window gets short — with the filter on Today, a daily trend is one column, a schedule grid
 * is one square, and a stacked usage chart is a single slab of colour that states its total
 * twice. The reader who wants to see the last twelve weeks of mortality should not have to
 * change the window for the whole page, and lose the day they were reading, to get it.
 *
 * SO EVERY TREND CARD CARRIES ITS OWN RANGE, and starts by FOLLOWING the page. On arrival the
 * chart shows the same span as everything else, so the chart's total and the hero's total are
 * the same number — a chart that quietly opened on a different range than the KPI above it
 * would read as a contradiction rather than as a control. The moment the reader taps a range
 * the card stops following and holds what they picked, including across a later change to the
 * global filter, because they have said what they want this card to show.
 *
 * THE RANGES ARE THE GLOBAL WINDOWS, not a parallel set of spans invented here. Each preset
 * resolves through `core/calendar`, so "Month" on a chart is the same month the date sheet
 * means, summed from the same daily series. There is no second definition of a month in the
 * product, and no arithmetic in this file — `resolveWindow` does all of it.
 *
 * CUSTOM IS A DOOR, NOT A SEVENTH PRESET. Picking it opens the global date sheet rather than
 * inventing a per-card date picker: two range pickers with different memories is how a reader
 * ends up reading July under a header that says June. A card on Custom follows the page again,
 * which is the honest meaning of "the dates you chose up there".
 */

import { useMemo, useState } from 'react'
import { resolveWindow, type Win, type WindowKey } from '../core/calendar'
import { useScope } from '../v4/scope'
import { useSheet } from '../v4/sheet'
import { DateSheet } from '../v4/filters'

export interface ChartRange {
  key: string
  /** Pill text. Short, because six of these sit on a phone's width. */
  label: string
  /** The global window it resolves to. */
  window: WindowKey
}

/**
 * Six spans and a door to the date sheet.
 *
 * Deliberately not the full nine the date sheet offers: `yesterday`, `last30` and `lastMonth`
 * are windows a reader *reports* on and rarely wants a chart's shape over, and nine pills is a
 * scroller nobody reaches the end of. The six here are the ladder — a day, a week, a month, a
 * quarter, a half, a year — which is what "zoom out" means on a trend.
 */
export const CHART_RANGES: ChartRange[] = [
  { key: 'today', label: 'Today', window: 'today' },
  { key: 'week', label: 'Week', window: 'last7' },
  { key: 'month', label: 'Month', window: 'month' },
  { key: '3m', label: '3M', window: 'quarter' },
  { key: '6m', label: '6M', window: 'half' },
  { key: 'year', label: 'Year', window: 'year' },
]

/** Which preset a global window is, so a following card can show itself as following. */
export const rangeOfWindow = (key: WindowKey): string =>
  CHART_RANGES.find((r) => r.window === key)?.key ?? 'custom'

export interface RangeApi {
  /** The window this card draws. Identical to the page's until the reader picks. */
  win: Win
  /** The pill that is lit. */
  key: string
  set: (key: string) => void
  /** True while the card is still obeying the global filter. */
  following: boolean
}

/**
 * A card's own window, following the page until touched.
 *
 * `picked` starts null rather than being initialised from the global key, so the card keeps
 * following through later changes to the filter instead of latching whatever window the reader
 * happened to arrive on.
 */
export function useChartRange(): RangeApi {
  const { scope, windowKey } = useScope()
  const [picked, setPicked] = useState<string | null>(null)
  const key = picked ?? rangeOfWindow(windowKey)

  const win = useMemo(() => {
    const spec = CHART_RANGES.find((r) => r.key === key)
    /* Custom, and any window with no pill of its own, is the page's window verbatim. */
    return spec ? resolveWindow(spec.window) : scope.win
  }, [key, scope.win])

  return { win, key, set: setPicked, following: picked === null }
}

/**
 * The pill row. One tap, no menu — a range control that costs a sheet is one nobody uses.
 *
 * `tone` only sets the lit colour, so a mortality chart's active pill is the module's red and a
 * pharmacy chart's is green: the pill belongs to the card it sits in, not to a global palette.
 */
export function RangeTabs({ range, tone = '#123a2c' }: { range: RangeApi; tone?: string }) {
  const { open } = useSheet()
  const { key, set } = range

  return (
    <div
      className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hidden"
      role="group"
      aria-label="Chart range"
    >
      {CHART_RANGES.map((r) => (
        <Pill key={r.key} label={r.label} on={r.key === key} tone={tone} onClick={() => set(r.key)} />
      ))}
      {/* Custom hands the reader the one date picker the product has, then follows it. */}
      <Pill
        label="Custom"
        on={key === 'custom'}
        tone={tone}
        onClick={() => {
          set('custom')
          open({ title: 'Date range', eyebrow: 'Applies to the whole page', body: <DateSheet /> })
        }}
      />
    </div>
  )
}

function Pill({
  label,
  on,
  tone,
  onClick,
}: {
  label: string
  on: boolean
  tone: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-caption font-medium whitespace-nowrap transition-colors ${
        on ? 'text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
      }`}
      style={on ? { backgroundColor: tone } : undefined}
    >
      {label}
    </button>
  )
}
