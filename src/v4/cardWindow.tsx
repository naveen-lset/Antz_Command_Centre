/**
 * A DATE RANGE PER CARD — the control that replaced nine restatements of the page's own window.
 *
 * WHAT WAS THERE BEFORE. Every card on the Animal Population page printed the reporting window
 * in its header: "30 Jul 2025" on Population change, on Births, on Mortality, on Population
 * leaders, "yesterday" on Transfers and on Escapes, and the page footer said it a tenth time.
 * All ten were the same fact, set once at the top of the page in a pill the reader had just
 * used, restated as static text in the one place on a card that could have been a control.
 *
 * WHAT REPLACED IT. The header slot now holds a real window picker, and the card reads the
 * window IT is set to rather than the page's. The default is still the page — a card the reader
 * has not touched follows the pill at the top, so nothing changes until they ask it to — and
 * once a card is on its own range it says so, because a figure on a different window from the
 * page around it must never look like one that agrees with it.
 *
 * THE HONEST COST, STATED PLAINLY. `animals.tsx` opens with "ONE READ, EVERY SECTION": the page
 * derived every card from one `holdings(siteKey, win)` call so that the parts summed to the hero
 * by construction. Per-card windows give that up on purpose. A reader can now put Births on six
 * months and Mortality on yesterday, and the two cards then describe different spans of time on
 * one screen — which is exactly the disagreement the single scope existed to prevent. That is a
 * reasonable thing to want (comparing a flow across spans is real analysis) and it is the reason
 * every overridden card is marked: the pill fills in, and a "vs page" note names the page window
 * it has departed from, so a divergence is always something the reader chose and can see.
 */

import { useState, type ReactNode } from 'react'
import { CalendarRange, RotateCcw } from 'lucide-react'
import {
  MAX_INPUT,
  MIN_INPUT,
  WINDOWS,
  resolveWindow,
  type Win,
  type WindowKey,
} from '../core/calendar'
import { ACCENT, ACCENT_INK, FAINT, HAIR, MUTED, Section, mix } from '../exec/system'
import { useScope } from './scope'
import { useSheet } from './sheet'

interface Override {
  key: WindowKey
  custom: { from: string; to: string }
}

/**
 * The card's window, and the control that sets it.
 *
 * `null` means "follow the page", which is deliberately a distinct state from "the reader chose
 * the same window the page is on". A card following the page keeps following it when the page
 * pill changes; a card that happens to match does not.
 */
export function useCardWindow(): { win: Win; pill: ReactNode; overridden: boolean } {
  const { scope, custom: pageCustom } = useScope()
  const { open, back } = useSheet()
  const [override, setOverride] = useState<Override | null>(null)

  const win = override ? resolveWindow(override.key, override.custom) : scope.win
  const overridden = override !== null

  const pill = (
    <span className="flex shrink-0 items-center gap-1.5">
      {overridden && (
        <button
          type="button"
          onClick={() => setOverride(null)}
          title={`Follow the page window (${scope.win.label})`}
          className="card-press grid size-[22px] shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: mix(ACCENT, 0.12), color: ACCENT_INK }}
        >
          <RotateCcw size={11} strokeWidth={2.5} aria-hidden />
          <span className="sr-only">Follow the page window</span>
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          open({
            title: 'Card date range',
            eyebrow: win.window,
            body: (
              <CardRangeSheet
                current={override ?? { key: scope.win.key, custom: pageCustom }}
                pageWin={scope.win}
                following={!overridden}
                onPick={(next) => {
                  setOverride(next)
                  back()
                }}
              />
            ),
          })
        }
        className="card-press flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[3px] text-caption font-medium whitespace-nowrap"
        style={
          overridden
            ? { backgroundColor: mix(ACCENT, 0.14), color: ACCENT_INK }
            : { backgroundColor: '#f7f6f3', color: MUTED }
        }
      >
        <CalendarRange size={11} strokeWidth={2} aria-hidden />
        {win.label}
      </button>
    </span>
  )

  return { win, pill, overridden }
}

/**
 * `Section` with its own date range in the header.
 *
 * A render prop rather than plain children, because the card's data has to be derived from the
 * card's window and the window lives in here. Every converted card is therefore a component of
 * its own that calls `useCardWindow` and derives its figures from what it returns — see the eight
 * of them in `modules/animals.tsx`.
 */
export function CardWindowNote({ win, overridden }: { win: Win; overridden: boolean }) {
  const { scope } = useScope()
  if (!overridden) return null
  return (
    <p className="mt-3 border-t pt-2.5 text-caption" style={{ borderColor: HAIR, color: FAINT }}>
      This card is on {win.window} — the rest of the page is on {scope.win.window}.
    </p>
  )
}

/** The presets, plus a bounded custom range. Mirrors `filters.tsx`'s page-level sheet. */
function CardRangeSheet({
  current,
  pageWin,
  following,
  onPick,
}: {
  current: Override
  pageWin: Win
  following: boolean
  onPick: (next: Override | null) => void
}) {
  const [draft, setDraft] = useState(current.custom)

  return (
    <div className="flex w-full flex-col gap-[var(--gap)] px-[var(--gutter-lg)] pb-2">
      <Section icon={CalendarRange} label="This card's window">
        <ul className="flex flex-col">
          <Option
            label={`Follow the page · ${pageWin.label}`}
            sub={pageWin.window}
            on={following}
            onClick={() => onPick(null)}
          />
          {WINDOWS.map((w) => (
            <Option
              key={w.key}
              label={w.label}
              sub={w.window}
              on={!following && current.key === w.key}
              onClick={() => onPick({ key: w.key, custom: current.custom })}
            />
          ))}
        </ul>
      </Section>

      <Section icon={CalendarRange} label="Custom range">
        <div className="flex items-center gap-3">
          <DateField label="From" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} />
          <span className="mt-4 shrink-0 text-small" style={{ color: FAINT }} aria-hidden>
            →
          </span>
          <DateField label="To" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} />
        </div>
        <button
          type="button"
          onClick={() => onPick({ key: 'custom', custom: draft })}
          className="card-press mt-4 w-full rounded-[11px] py-2.5 text-body font-semibold text-white"
          style={{ backgroundColor: '#123a2c' }}
        >
          Apply to this card
        </button>
        <p className="mt-3 text-caption" style={{ color: FAINT }}>
          Only this card moves. The rest of the page stays on {pageWin.window}.
        </p>
      </Section>
    </div>
  )
}

function Option({
  label,
  sub,
  on,
  onClick,
}: {
  label: string
  sub: string
  on: boolean
  onClick: () => void
}) {
  return (
    <li className="border-b last:border-0" style={{ borderColor: HAIR }}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-small ${on ? 'font-semibold' : ''}`} style={{ color: '#1c1a16' }}>
            {label}
          </span>
          <span className="mt-0.5 block truncate text-caption" style={{ color: FAINT }}>
            {sub}
          </span>
        </span>
        {on && (
          <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} aria-hidden />
        )}
      </button>
    </li>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="block text-overline font-medium uppercase" style={{ color: FAINT }}>
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={MIN_INPUT}
        max={MAX_INPUT}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[10px] bg-[#f7f6f3] px-3 py-2 text-body tabular-nums text-[#1c1a16] outline-none focus:ring-2 focus:ring-[#37bd69]/35"
      />
    </label>
  )
}
