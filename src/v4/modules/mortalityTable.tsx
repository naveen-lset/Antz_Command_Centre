/**
 * The sortable comparison table this module needs in four places.
 *
 * ONE DATA SET, TWO LAYOUTS, NOT ONE SQUEEZED. Past 720px of column the rows are a dense
 * sortable table, which is what a desk is for. Below it the same rows stack: the name and the
 * leading figure on the first line, the remaining columns as labelled chips underneath. Not a
 * horizontally scrolled table — a table that has to be dragged sideways on a phone is a table
 * nobody reads the right-hand half of, and the right-hand half here is where the necropsy
 * backlog lives.
 *
 * WHY THIS IS NOT `preventiveMarks.SortableList`. That component does the same job and does it
 * well, but its first column header is the literal string "Site". This module needs the same
 * table headed Site, Species and Necropsy centre in three different sections, and a Necropsy
 * centre table whose first column says "Site" is worse than no header at all. Rather than reach
 * into another module's file to parameterise it — that module is being worked on in a parallel
 * session — the header is a prop here.
 *
 * THE SORT CONTROL IS PRESENT AT EVERY WIDTH. Sorting is the point of these sections: "which
 * site has the most deaths" and "which bench has the biggest backlog" are different questions
 * and both are one tap apart. The wide layout also sorts from the column headers, because at a
 * desk that is where a reader reaches; the phone has no headers to tap, so it gets chips.
 */

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { FAINT, TONE, TRACK, VALUE, mix, useAccent, type Tone } from '../../exec/system'

export interface Col<T> {
  key: string
  head: string
  /** The figure for this row, already formatted. */
  cell: (row: T) => string
  /** What sorting by this column compares. Absent means the column does not sort. */
  sort?: (row: T) => number
  tone?: (row: T) => Tone | undefined
  /** Shown in the stacked phone row. Off for columns that would crowd it. */
  compact?: boolean
}

export function RankTable<T>({
  rows,
  columns,
  head,
  name,
  sub,
  sortKey,
  onSort,
  onOpen,
  /** Drawn under the stacked phone row — the row's share of the total. */
  bar,
  empty,
}: {
  rows: T[]
  columns: Col<T>[]
  /** What the first column IS — "Site", "Species", "Necropsy centre". */
  head: string
  name: (row: T) => string
  sub?: (row: T) => string | undefined
  sortKey: string
  onSort: (key: string) => void
  onOpen?: (row: T) => void
  bar?: (row: T) => number
  empty?: ReactNode
}) {
  const accent = useAccent()
  const sortable = columns.filter((c) => c.sort)
  const lead = columns[0]

  if (rows.length === 0) {
    return (
      <>
        {empty ?? (
          <p className="text-[12.5px]" style={{ color: FAINT }}>
            Nothing to show.
          </p>
        )}
      </>
    )
  }

  return (
    <div>
      {/* Sort chips — the phone's only sort control, and a shortcut on the desk. */}
      {sortable.length > 1 && (
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
      )}

      {/* Wide: the dense table. */}
      <div className="hidden @[720px]:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#f0efec]">
              <th
                className="pb-2 text-left text-[10.5px] font-semibold tracking-[0.07em] uppercase"
                style={{ color: FAINT }}
              >
                {head}
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
                    <span
                      className="text-[10.5px] font-semibold tracking-[0.07em] uppercase"
                      style={{ color: FAINT }}
                    >
                      {c.head}
                    </span>
                  )}
                </th>
              ))}
              {onOpen && <th className="w-[18px]" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${name(r)}-${i}`}
                className={`border-b border-[#f6f5f2] last:border-0 ${onOpen ? 'cursor-pointer transition-colors hover:bg-[#faf9f7]' : ''}`}
                onClick={onOpen ? () => onOpen(r) : undefined}
              >
                <td className="py-2.5 pr-3">
                  <span className="block truncate text-[13px] text-[#1c1a16]">{name(r)}</span>
                  {sub?.(r) && (
                    <span className="mt-0.5 block truncate text-[11px]" style={{ color: FAINT }}>
                      {sub(r)}
                    </span>
                  )}
                </td>
                {columns.map((c) => {
                  const t = c.tone?.(r)
                  return (
                    <td
                      key={c.key}
                      className="py-2.5 text-right text-[13px] font-medium tabular-nums whitespace-nowrap"
                      style={{ color: t && t !== 'neutral' ? TONE[t] : VALUE }}
                    >
                      {c.cell(r)}
                    </td>
                  )
                })}
                {onOpen && (
                  <td className="py-2.5 pl-1 align-middle" style={{ color: accent }} aria-hidden>
                    <ChevronRight size={13} strokeWidth={2.25} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow: the same rows, stacked. */}
      <ul className="flex flex-col @[720px]:hidden">
        {rows.map((r, i) => {
          const chips = columns.slice(1).filter((c) => c.compact !== false)
          const leadTone = lead?.tone?.(r)
          const body = (
            <>
              <span className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-[#1c1a16]">{name(r)}</span>
                  {sub?.(r) && (
                    <span className="mt-0.5 block truncate text-[11px] leading-[15px]" style={{ color: FAINT }}>
                      {sub(r)}
                    </span>
                  )}
                </span>
                {lead && (
                  <span className="shrink-0 text-right">
                    <span
                      className="text-[14px] font-medium tabular-nums"
                      style={{ color: leadTone && leadTone !== 'neutral' ? TONE[leadTone] : VALUE }}
                    >
                      {lead.cell(r)}
                    </span>
                    <span className="ml-1 text-[11px]" style={{ color: FAINT }}>
                      {lead.head.toLowerCase()}
                    </span>
                  </span>
                )}
                {onOpen && (
                  <span className="w-[10px] shrink-0" style={{ color: accent }} aria-hidden>
                    <ChevronRight size={13} strokeWidth={2.25} />
                  </span>
                )}
              </span>

              {bar && (
                <span
                  className="mt-1.5 block h-[5px] overflow-hidden rounded-full"
                  style={{ backgroundColor: TRACK }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(2, Math.min(100, bar(r)))}%`, backgroundColor: mix(accent, 0.72) }}
                  />
                </span>
              )}

              {chips.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {chips.map((c) => {
                    const t = c.tone?.(r)
                    return (
                      <span key={c.key} className="text-[11px] whitespace-nowrap" style={{ color: FAINT }}>
                        {c.head}{' '}
                        <span
                          className="font-medium tabular-nums"
                          style={{ color: t && t !== 'neutral' ? TONE[t] : '#55524a' }}
                        >
                          {c.cell(r)}
                        </span>
                      </span>
                    )
                  })}
                </span>
              )}
            </>
          )

          return (
            <li key={`${name(r)}-${i}`} className="border-b border-[#f0efec] last:border-0">
              {onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(r)}
                  className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2.5 text-left"
                >
                  {body}
                </button>
              ) : (
                <div className="py-2.5">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
