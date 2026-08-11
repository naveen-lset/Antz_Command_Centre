/**
 * THE MARKS THIS MODULE DRAWS AND NO OTHER PAGE DOES.
 *
 * The brief is explicit that preventive medication must not look like Animal Population or
 * Pharmacy, and the reason is not decoration: those pages plot a quantity over time, and
 * this one plots a SCHEDULE. A schedule has three shapes that a line chart cannot hold —
 *
 *   VACCINATION  is a calendar. Rounds happen on days, days cluster into campaigns, and the
 *                question "when did the work happen" is answered by looking at the grid, not
 *                by reading a curve. `ScheduleGrid`.
 *   DEWORMING    is a rotation. Anthelmintics are cycled deliberately so parasites do not
 *                settle on one drug, so the useful mark is the share each drug took of the
 *                round, laid out as the cycle it is. `RotationCycle`.
 *   SUPPLEMENTS  is consumption. It goes out with the feed every day and nobody schedules
 *                it, so it gets the quietest mark in the set: one composition bar and the
 *                names behind it. `UsageSplit`.
 *
 * `OverdueLadder` is shared by the two programmes that have a due status, because lateness
 * has one shape whatever is late.
 *
 * Everything is drawn with the design system's own tokens — `mix` over the accent in
 * context, `TRACK` for unfilled, `Figure` for numerals. No new colour enters the product.
 */

import { type ReactNode } from 'react'
import { usePlay } from '../../motion'
import { dateAt, shortDate, type Win } from '../../core/calendar'
import {
  FAINT,
  INK,
  TONE,
  TRACK,
  VALUE,
  fmt,
  mix,
  step,
  useAccent,
  type Tone,
} from '../../exec/system'
import { Rail } from '../../exec/marks'

/* ── vaccination · the schedule grid ─────────────────────────────────────── */

export interface Cell {
  /** Ledger indices this cell covers, inclusive. */
  from: number
  to: number
  label: string
  value: number
  /** Weekday column for a single-day cell, 0 = Monday. Absent for coarser grains. */
  weekday?: number
}

/**
 * The window, bucketed to whatever grain fits it, as a heat grid.
 *
 * ONE GRAIN PER WINDOW, chosen from the window's own length rather than fixed. A month of
 * days is a calendar and reads as one; six years of days is 2,192 cells and reads as noise,
 * so it becomes months. The grain is stated under the grid — a reader must never have to
 * work out what one square means.
 */
export function ScheduleGrid({
  cells,
  grain,
  onOpen,
}: {
  cells: Cell[]
  grain: 'day' | 'week' | 'month'
  onOpen?: (cell: Cell) => void
}) {
  const accent = useAccent()
  /* The grid reads the same in-view signal every other mark in the system does, so a card
     and the squares inside it arrive together rather than the card fading up over a grid
     that was already there. */
  const { ref, animate } = usePlay()
  const max = Math.max(...cells.map((c) => c.value), 1)
  const cols = grain === 'day' ? 7 : grain === 'week' ? 13 : 12
  const pad = grain === 'day' ? (cells[0]?.weekday ?? 0) : 0

  return (
    /* A DAY GRID IS CAPPED, the coarser grains are not. Seven square cells across a
       thousand-pixel tablet column are 140px each — a wall of tiles rather than a calendar,
       and a calendar is the whole reason this mark exists. Thirteen weeks or twelve months
       across the same width are already the right size, so only the day grain is held. */
    <div ref={ref} className={grain === 'day' ? 'max-w-[480px]' : undefined}>
      {grain === 'day' && (
        <div className="mb-1 grid grid-cols-7 gap-[3px]">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
            <span key={i} className="text-center text-[9.5px]" style={{ color: FAINT }}>
              {w}
            </span>
          ))}
        </div>
      )}
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: pad }, (_, i) => (
          <span key={`pad-${i}`} aria-hidden />
        ))}
        {cells.map((c, i) => {
          const heat = c.value / max
          const lit = heat > 0.55
          const inner = (
            <>
              <span className="text-[9.5px] leading-none tabular-nums" style={{ color: lit ? '#ffffff' : FAINT }}>
                {c.label}
              </span>
              {c.value > 0 && (
                <span
                  className="mt-[2px] font-display text-[11px] leading-none font-bold tabular-nums"
                  style={{ color: lit ? '#ffffff' : INK }}
                >
                  {c.value > 999 ? `${Math.round(c.value / 100) / 10}k` : c.value}
                </span>
              )}
            </>
          )
          /* A short per-cell delay, capped: a month is 31 squares and a six-year window is
             72, and a stagger that scales with the count would still be arriving after the
             reader has moved on. 14ms a square, never more than half a second in total. */
          const style = {
            backgroundColor: c.value ? mix(accent, 0.18 + heat * 0.7) : TRACK,
            animationDelay: animate ? `${Math.min(i * 14, 480)}ms` : undefined,
          }
          const motion = animate ? 'animate-pop' : ''
          return onOpen && c.value > 0 ? (
            <button
              key={`${c.from}-${c.to}`}
              type="button"
              onClick={() => onOpen(c)}
              title={`${c.label} · ${fmt(c.value)}`}
              className={`card-press flex aspect-square flex-col items-center justify-center rounded-[6px] ${motion}`}
              style={style}
            >
              {inner}
            </button>
          ) : (
            <span
              key={`${c.from}-${c.to}`}
              title={`${c.label} · ${fmt(c.value)}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-[6px] ${motion}`}
              style={style}
            >
              {inner}
            </span>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[10px] tracking-[0.06em] uppercase" style={{ color: '#b3aea6' }}>
          One square · one {grain}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: FAINT }}>
            0
          </span>
          {[0.2, 0.4, 0.6, 0.8, 1].map((h) => (
            <span key={h} className="size-[9px] rounded-[3px]" style={{ backgroundColor: mix(accent, 0.18 + h * 0.7) }} />
          ))}
          <span className="text-[10px] tabular-nums" style={{ color: FAINT }}>
            {fmt(max)}
          </span>
        </span>
      </div>
    </div>
  )
}

/** Bucket a window into the grain that suits its length, counting with the caller's reader. */
export function gridCells(win: Win, countIn: (from: number, to: number) => number): { cells: Cell[]; grain: 'day' | 'week' | 'month' } {
  const grain = win.days <= 62 ? 'day' : win.days <= 210 ? 'week' : 'month'
  const cells: Cell[] = []

  if (grain === 'day') {
    for (let d = win.from; d <= win.to; d++) {
      const date = dateAt(d)
      cells.push({
        from: d,
        to: d,
        label: String(date.getDate()),
        value: countIn(d, d),
        /* 0 = Monday, so the grid's first column is the week's first working day. */
        weekday: (date.getDay() + 6) % 7,
      })
    }
    return { cells, grain }
  }

  const size = grain === 'week' ? 7 : 30
  for (let from = win.from; from <= win.to; from += size) {
    const to = Math.min(win.to, from + size - 1)
    cells.push({
      from,
      to,
      label: grain === 'week' ? shortDate(from).split(' ')[0] : shortDate(to).split(' ')[1],
      value: countIn(from, to),
    })
  }
  return { cells, grain }
}

/* ── deworming · the rotation ────────────────────────────────────────────── */

/**
 * The anthelmintic rotation, as a cycle rather than a ranking.
 *
 * A bar chart of four drugs answers "which is most used", which is not the question a
 * veterinary director asks about worming — rotation is a policy, and what matters is that
 * the programme moves through the classes rather than leaning on one. So the drugs are laid
 * around a track in rotation order with each one's share of the window under it, and the
 * widest segment is visible as a lean rather than reported as a winner.
 */
export function RotationCycle({
  items,
  unit,
  onOpen,
}: {
  items: { id: string; label: string; value: number }[]
  unit?: string
  onOpen?: (id: string) => void
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const total = items.reduce((n, i) => n + i.value, 0) || 1

  return (
    <div ref={ref}>
      {/* The cycle itself — one continuous track, each drug holding its share of it.
          Each segment grows from its own left edge in rotation order, so the track builds
          the way the programme runs rather than appearing all at once. */}
      <div className="flex h-[10px] w-full overflow-hidden rounded-full">
        {items.map((it, i) => (
          <span
            key={it.id}
            className={`h-full origin-left first:rounded-l-full last:rounded-r-full ${animate ? 'animate-grow-x' : ''}`}
            style={{
              width: `${(it.value / total) * 100}%`,
              backgroundColor: mix(accent, step(i)),
              animationDelay: animate ? `${i * 90}ms` : undefined,
            }}
            title={`${it.label} · ${fmt(it.value)}`}
          />
        ))}
      </div>

      <ul className="mt-4 grid gap-x-4 gap-y-3 @[420px]:grid-cols-2">
        {items.map((it, i) => {
          const share = Math.round((it.value / total) * 100)
          const body = (
            <>
              <span className="flex items-center gap-2">
                <span className="size-[9px] shrink-0 rounded-[3px]" style={{ backgroundColor: mix(accent, step(i)) }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: INK }}>
                  {it.label}
                </span>
                <span className="shrink-0 font-display text-[14px] font-bold tabular-nums" style={{ color: VALUE }}>
                  {fmt(it.value)}
                </span>
                <span className="w-[30px] shrink-0 text-right text-[11px] tabular-nums" style={{ color: FAINT }}>
                  {share}%
                </span>
              </span>
              {/* The rotation position, stated as a step rather than a rank — "3 of 4" says
                  where in the cycle this drug sits, which a bar's length cannot. */}
              <span className="mt-1 block text-[10.5px]" style={{ color: '#b3aea6' }}>
                Cycle position {i + 1} of {items.length}
                {unit ? ` · ${unit}` : ''}
              </span>
            </>
          )
          return (
            <li key={it.id}>
              {onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(it.id)}
                  className="card-press -mx-2 block w-full rounded-[10px] px-2 py-1.5 text-left"
                >
                  {body}
                </button>
              ) : (
                <div className="py-1.5">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ── supplements · the usage split ───────────────────────────────────────── */

/** The quietest mark in the module: what went out, in what proportion, and to how many sites. */
export function UsageSplit({
  items,
  onOpen,
}: {
  items: { id: string; label: string; value: number }[]
  onOpen?: (id: string) => void
}) {
  const { ref } = usePlay<HTMLUListElement>()
  const total = items.reduce((n, i) => n + i.value, 0) || 1

  return (
    <ul ref={ref} className="flex flex-col">
      {items.map((it) => {
        const share = (it.value / total) * 100
        const body = (
          /* The share is the rail's weight, not a bar under the row — see the note on `TapRow`'s
             `bar` in `v4/panels.tsx`. */
          <span className="flex items-stretch gap-3">
            <Rail share={share} />
            <span className="flex min-w-0 flex-1 items-baseline gap-3">
              <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: INK }}>
                {it.label}
              </span>
              <span className="shrink-0 text-[13.5px] font-medium tabular-nums" style={{ color: VALUE }}>
                {fmt(it.value)}
              </span>
              <span className="w-[34px] shrink-0 text-right text-[11px] tabular-nums" style={{ color: FAINT }}>
                {share.toFixed(1)}%
              </span>
            </span>
          </span>
        )
        return (
          <li key={it.id} className="border-b border-[#f0efec] py-2.5 last:border-0">
            {onOpen ? (
              <button type="button" onClick={() => onOpen(it.id)} className="card-press -mx-2 block w-full rounded-[10px] px-2 text-left">
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* ── lateness · the ladder ───────────────────────────────────────────────── */

/**
 * The four due-status buckets, with the last one drawn as the finding it is.
 *
 * Due today, one week late, two weeks late and more than fifteen days late are not four
 * points on a scale — the first is a task and the last is a compliance failure. So the
 * ladder gives the fourth rung its own block, its own weight and the one red in the module,
 * and the three above it share a quieter row. That is the whole executive question about
 * lateness, and it is answered before a number is read.
 */
export function OverdueLadder({
  rows,
  onOpen,
}: {
  rows: { bucket: string; value: number; over15?: boolean }[]
  onOpen?: (bucket: string) => void
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay<HTMLUListElement>()
  const max = Math.max(...rows.map((r) => r.value), 1)

  return (
    <ul ref={ref} className="flex flex-col gap-2.5">
      {rows.map((r, i) => {
        const bad = Boolean(r.over15)
        const colour = bad ? TONE.bad : mix(accent, step(i))
        const body = (
          <>
            <span className="flex items-baseline gap-3">
              <span
                className={`min-w-0 flex-1 truncate ${bad ? 'text-[13.5px] font-semibold' : 'text-[13px]'}`}
                style={{ color: bad ? TONE.bad : INK }}
              >
                {r.bucket}
              </span>
              <span
                className={`shrink-0 font-display font-bold tabular-nums ${bad ? 'text-[22px]' : 'text-[15px]'}`}
                style={{ color: bad ? TONE.bad : VALUE }}
              >
                {fmt(r.value)}
              </span>
            </span>
            <span
              className="mt-1.5 block overflow-hidden rounded-full"
              style={{ backgroundColor: TRACK, height: bad ? 8 : 5 }}
            >
              {/* Top rung first, so the over-fifteen bar — the one the section exists for —
                  is the last thing to arrive and the eye is already there when it does. */}
              <span
                className={`block h-full origin-left rounded-full ${animate ? 'animate-grow-x' : ''}`}
                style={{
                  width: `${Math.max(2, (r.value / max) * 100)}%`,
                  backgroundColor: colour,
                  animationDelay: animate ? `${i * 110}ms` : undefined,
                }}
              />
            </span>
          </>
        )
        return (
          <li key={r.bucket}>
            {onOpen && r.value > 0 ? (
              <button
                type="button"
                onClick={() => onOpen(r.bucket)}
                className="card-press -mx-2 block w-full rounded-[10px] px-2 py-1 text-left"
              >
                {body}
              </button>
            ) : (
              <div className="py-1">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* ── the sortable list · a table when there is room, rows when there is not ── */

export interface Column<T> {
  key: string
  head: string
  /** Right-aligned figure for this row. */
  cell: (row: T) => string
  /** What sorting by this column compares. Absent means the column does not sort. */
  sort?: (row: T) => number
  tone?: (row: T) => Tone | undefined
  /** Shown in the stacked phone row. Off for columns that would crowd it. */
  compact?: boolean
}

/**
 * ONE DATA SET, TWO LAYOUTS, NOT ONE SQUEEZED.
 *
 * Past 720px of column the rows are a dense sortable table, which is what a desk is for.
 * Below it the same rows stack: name and leading figure on the first line, the remaining
 * columns as labelled chips underneath. Not a horizontally scrolled table — a table that
 * has to be dragged sideways on a phone is a table nobody reads the right-hand half of.
 *
 * The sort control is shared by both, because sorting is the point of the section: "which
 * site has the most overdue" is a different question from "which gave the most doses", and
 * both are one tap apart.
 */
export function SortableList<T>({
  rows,
  columns,
  name,
  sub,
  sortKey,
  onSort,
  onOpen,
  empty,
}: {
  rows: T[]
  columns: Column<T>[]
  name: (row: T) => string
  sub?: (row: T) => string | undefined
  sortKey: string
  onSort: (key: string) => void
  onOpen?: (row: T) => void
  empty?: ReactNode
}) {
  const accent = useAccent()
  const { ref, animate } = usePlay()
  const sortable = columns.filter((c) => c.sort)

  if (rows.length === 0) return <>{empty ?? <p className="text-[12.5px]" style={{ color: FAINT }}>Nothing to show.</p>}</>

  return (
    <div ref={ref}>
      {/* The sort chips. Present at every width — the table's own headers sort too, but a
          phone has no headers to tap. */}
      <div className="mb-3 flex flex-wrap gap-1.5 @[720px]:hidden">
        {sortable.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={sortKey === c.key}
            onClick={() => onSort(c.key)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap transition-colors ${
              sortKey === c.key ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
            }`}
          >
            {c.head}
          </button>
        ))}
      </div>

      {/* Wide: the dense table. */}
      <div className="hidden @[720px]:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#f0efec]">
              <th className="pb-2 text-left text-[10.5px] font-semibold tracking-[0.07em] uppercase" style={{ color: FAINT }}>
                Site
              </th>
              {columns.map((c) => (
                <th key={c.key} className="pb-2 text-right">
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() => onSort(c.key)}
                      className="text-[10.5px] font-semibold tracking-[0.07em] uppercase transition-colors"
                      style={{ color: sortKey === c.key ? accent : FAINT }}
                    >
                      {c.head}
                      {sortKey === c.key ? ' ↓' : ''}
                    </button>
                  ) : (
                    <span className="text-[10.5px] font-semibold tracking-[0.07em] uppercase" style={{ color: FAINT }}>
                      {c.head}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              /* Rows cascade rather than appearing as a block — six hospitals or six sites
                 read as a list being filled in, which is what a sortable table is. Capped so
                 a ninety-species page is not still arriving a second later. */
              <tr
                key={i}
                className={`border-b border-[#f6f5f2] last:border-0 ${animate ? 'animate-drop-in' : ''} ${
                  onOpen ? 'cursor-pointer hover:bg-[#f9f8f5]' : ''
                }`}
                style={{ animationDelay: animate ? `${Math.min(i * 45, 400)}ms` : undefined }}
                onClick={onOpen ? () => onOpen(row) : undefined}
              >
                <td className="py-2.5 pr-3">
                  <span className="block truncate text-[13px]" style={{ color: INK }}>
                    {name(row)}
                  </span>
                  {sub?.(row) && (
                    <span className="mt-0.5 block truncate text-[10.5px]" style={{ color: FAINT }}>
                      {sub(row)}
                    </span>
                  )}
                </td>
                {columns.map((c) => {
                  const tone = c.tone?.(row)
                  return (
                    <td
                      key={c.key}
                      className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums"
                      style={{ color: tone && tone !== 'neutral' ? TONE[tone] : VALUE }}
                    >
                      {c.cell(row)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow: the same rows, stacked. */}
      <ul className="flex flex-col @[720px]:hidden">
        {rows.map((row, i) => {
          const lead = columns.find((c) => c.key === sortKey) ?? columns[0]
          const rest = columns.filter((c) => c.key !== lead.key && c.compact !== false)
          const body = (
            <>
              <span className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px]" style={{ color: INK }}>
                    {name(row)}
                  </span>
                  {sub?.(row) && (
                    <span className="mt-0.5 block truncate text-[11px]" style={{ color: FAINT }}>
                      {sub(row)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className="font-display text-[17px] leading-none font-bold tabular-nums"
                    style={{ color: lead.tone?.(row) && lead.tone(row) !== 'neutral' ? TONE[lead.tone(row)!] : VALUE }}
                  >
                    {lead.cell(row)}
                  </span>
                  <span className="mt-0.5 block text-[10px] tracking-[0.05em] uppercase" style={{ color: '#b3aea6' }}>
                    {lead.head}
                  </span>
                </span>
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {rest.map((c) => {
                  const tone = c.tone?.(row)
                  return (
                    <span
                      key={c.key}
                      className="inline-flex items-baseline gap-1 rounded-full px-2 py-[3px] text-[10.5px]"
                      style={{ backgroundColor: tone && tone !== 'neutral' ? mix(TONE[tone], 0.1) : '#f6f5f2' }}
                    >
                      <span style={{ color: FAINT }}>{c.head}</span>
                      <span
                        className="font-semibold tabular-nums"
                        style={{ color: tone && tone !== 'neutral' ? TONE[tone] : VALUE }}
                      >
                        {c.cell(row)}
                      </span>
                    </span>
                  )
                })}
              </span>
            </>
          )
          return (
            <li
              key={i}
              className={`border-b border-[#f0efec] last:border-0 ${animate ? 'animate-drop-in' : ''}`}
              style={{ animationDelay: animate ? `${Math.min(i * 45, 400)}ms` : undefined }}
            >
              {onOpen ? (
                <button type="button" onClick={() => onOpen(row)} className="card-press -mx-2 block w-full rounded-[10px] px-2 py-3 text-left">
                  {body}
                </button>
              ) : (
                <div className="py-3">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
