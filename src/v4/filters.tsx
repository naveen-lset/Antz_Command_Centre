/**
 * GLOBAL FILTERS — date, site, search. Three, as the brief specifies, and no more.
 *
 * WHAT CHANGED BENEATH THEM. The controls look much as they did; what they do is different in
 * three ways that matter.
 *
 * THE DATE RANGE IS NO LONGER AN ESTIMATE. This sheet used to end with a note explaining that a
 * custom range was "estimated from the nearest reported grain and scaled to the days you pick".
 * That note was honest about a dishonest number. `core/series.ts` now derives a real daily
 * series, so 12–19 May sums the actual days 12–19 May and the disclaimer is deleted rather than
 * reworded. The inputs are bounded to the ledger, so a range with no data behind it cannot be
 * requested in the first place — which is the brief's "if custom date ranges are unsupported,
 * disable them", satisfied by supporting them properly.
 *
 * THE SCOPE OUTLIVES NAVIGATION. Both filters read and write the one scope in `scope.tsx`,
 * which lives in the URL above the router. Previously the window sat in a provider that `App`
 * re-keyed per route, so it silently reset every time the reader opened a different module.
 *
 * SEARCH IS A FILTER NOW, not just a way to jump to a module. It searches entities and animals
 * as well as modules, because the brief makes entities the thing the product is organised
 * around — and a search that only finds modules cannot find an animal.
 */

import { useMemo, useState } from 'react'
import { CalendarRange, Check, MapPin, Search, X } from 'lucide-react'
import { WINDOWS } from '../core/calendar'
import { figure } from '../core/query'
import { SITES, type Site } from '../core/world'
import { ACCENT, ACCENT_INK, FAINT, Facts, Section, Stack, fmt, mix } from '../exec/system'
import { useScope } from './scope'
import { useSheet } from './sheet'

/* ── the site scope, for the call sites that still ask for it directly ────── */

/**
 * Kept as an adapter over the one scope, because `kit.tsx` and `panels.tsx` call it. It used to
 * own a `useState`, which is why the site filter and the window filter had different lifetimes
 * for a while — one survived navigation and the other did not, for no reason anybody chose.
 */
export function useSite(): { site: Site | null; set: (s: Site | null) => void } {
  const { scope, setSite } = useScope()
  return { site: scope.site, set: setSite }
}

/**
 * A module's figure under the current window AND site scope.
 *
 * Now a one-line call into `core/query.ts`. It previously returned `undefined` for a module with
 * no site model, and callers were expected to notice and print "zoo-wide" — every metric has a
 * site model now, so the exception path is gone. `known: false` remains for a slug that names no
 * metric at all, which is a programming error rather than a data gap.
 */
export function useScoped(slug: string): { value: number; of?: number; rate: boolean } | undefined {
  const { scope } = useScope()
  const f = figure(scope, slug)
  if (!f.known) return undefined
  return { value: f.kind === 'rate' ? (f.percent ?? 0) : f.value, of: f.of, rate: f.kind === 'rate' }
}

/* ── the bar ─────────────────────────────────────────────────────────────── */

/**
 * Two pills — window and site — pinned wherever figures are shown.
 *
 * `tone="home"` only changes the gutter so the bar lines up with the greeting above it; the
 * pills themselves are identical on every surface, because a control that looks different in two
 * places is read as two controls.
 */
export function FilterBar({ tone = 'sheet' }: { tone?: 'sheet' | 'home' }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const gutter = tone === 'home' ? 'px-5' : 'px-6'

  return (
    <div className={`flex items-center gap-2 ${gutter} pb-3`}>
      <Pill
        icon={CalendarRange}
        label={scope.win.label}
        onClick={() => open({ title: 'Date range', eyebrow: scope.win.window, body: <DateSheet /> })}
      />
      <Pill
        icon={MapPin}
        label={scope.site ? scope.site.name : 'All sites'}
        on={Boolean(scope.site)}
        onClick={() =>
          open({ title: 'Site', eyebrow: scope.site ? scope.site.name : 'All sites', body: <SiteSheet /> })
        }
      />
    </div>
  )
}

function Pill({
  icon: Glyph,
  label,
  on,
  onClick,
}: {
  icon: typeof MapPin
  label: string
  on?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-press flex min-w-0 items-center gap-1.5 rounded-full px-3 py-[7px] text-[12.5px] font-medium whitespace-nowrap transition-colors ${
        on ? 'bg-[#123a2c] text-white' : 'bg-white/85 text-[#3d3a34] backdrop-blur-sm'
      }`}
    >
      <Glyph size={13} strokeWidth={2} className="shrink-0" style={{ color: on ? '#8fd6ae' : ACCENT }} aria-hidden />
      <span className="max-w-[130px] truncate">{label}</span>
      <span className="shrink-0 text-[9px] opacity-60" aria-hidden>
        ▾
      </span>
    </button>
  )
}

/* ── the date-range sheet ────────────────────────────────────────────────── */

export function DateSheet() {
  const { scope, windowKey, setWindow, custom, setCustom, bounds } = useScope()
  const { back } = useSheet()
  const [draft, setDraft] = useState(custom)

  const span = useMemo(() => {
    const a = Date.parse(draft.from)
    const b = Date.parse(draft.to)
    if (Number.isNaN(a) || Number.isNaN(b)) return 0
    return Math.abs(Math.round((b - a) / 86_400_000)) + 1
  }, [draft])

  return (
    <Stack>
      <Section icon={CalendarRange} label="Window" aside={scope.win.window}>
        <ul className="flex flex-col">
          {WINDOWS.map((w) => (
            <Option
              key={w.key}
              label={w.label}
              sub={w.window}
              value={w.days > 1 ? `${w.days} d` : undefined}
              on={w.key === windowKey}
              onClick={() => {
                setWindow(w.key)
                /* A window is a one-tap decision, so the sheet closes itself rather than making
                   the reader dismiss a list they have finished with. */
                back()
              }}
            />
          ))}
        </ul>
      </Section>

      <Section icon={CalendarRange} label="Custom range" aside={span ? `${span} days` : undefined}>
        <div className="flex items-center gap-3">
          <DateField
            label="From"
            value={draft.from}
            min={bounds.min}
            max={bounds.max}
            onChange={(from) => setDraft({ ...draft, from })}
          />
          <span className="mt-4 shrink-0 text-[13px]" style={{ color: FAINT }} aria-hidden>
            →
          </span>
          <DateField
            label="To"
            value={draft.to}
            min={bounds.min}
            max={bounds.max}
            onChange={(to) => setDraft({ ...draft, to })}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setCustom(draft)
            back()
          }}
          className="card-press mt-4 w-full rounded-[11px] py-2.5 text-[13px] font-semibold text-white"
          style={{ backgroundColor: '#123a2c' }}
        >
          Apply range
        </button>
        {/* The old note here said a custom range was an estimate. It is not any more: every
            figure is summed over the days the reader picked, from the same daily series every
            preset above reads. What the inputs still can't offer is a date the ledger has no
            data for, which is why they are bounded rather than free. */}
        <p className="mt-3 text-[11px] leading-[15px]" style={{ color: FAINT }}>
          Any range inside {bounds.min.slice(0, 4)}–{bounds.max.slice(0, 4)} is summed from daily
          records. Dates outside the ledger are not offered.
        </p>
      </Section>
    </Stack>
  )
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: string
  min: string
  max: string
  onChange: (v: string) => void
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="block text-[10px] font-medium tracking-[0.09em] uppercase" style={{ color: FAINT }}>
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[10px] bg-[#f7f6f3] px-3 py-2 text-[13px] tabular-nums text-[#1c1a16] outline-none focus:ring-2 focus:ring-[#37bd69]/35"
      />
    </label>
  )
}

/* ── the site sheet ──────────────────────────────────────────────────────── */

/**
 * Every site, with its headcount beside it so the choice is informed — "Carnivore Ridge" means
 * something different once you can see it holds 1,892 animals against Aquatic Halls' 178,400.
 */
export function SiteSheet() {
  const { scope, setSite } = useScope()
  const { back } = useSheet()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const rows = SITES.filter((s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))

  const overall = figure({ site: null, win: scope.win }, 'animals')
  const headcount = (site: Site) => figure({ site, win: scope.win }, 'animals').value

  return (
    <Stack>
      <Section icon={MapPin} label="Scope" aside={`${SITES.length} sites`}>
        <FindField value={query} onChange={setQuery} placeholder="Find a site" />
        <ul className="mt-3 flex flex-col">
          <Option
            label="All sites"
            sub="The whole collection"
            value={fmt(Math.round(overall.value))}
            on={!scope.site}
            onClick={() => {
              setSite(null)
              back()
            }}
          />
          {rows.map((s) => (
            <Option
              key={s.key}
              label={s.name}
              sub={`${s.code} · ${s.enclosures} enclosures`}
              value={fmt(Math.round(headcount(s)))}
              on={scope.site?.key === s.key}
              onClick={() => {
                setSite(s)
                back()
              }}
            />
          ))}
        </ul>
        {rows.length === 0 && (
          <p className="pt-3 text-[12.5px]" style={{ color: FAINT }}>
            No site matches “{query.trim()}”.
          </p>
        )}
      </Section>

      {/* The honest version of this card used to have a fourth row reading "Scores and rates ·
          zoo-wide", because four home KPIs had no site model. They do now, so the exception is
          gone and this card says so without qualification. */}
      <Section icon={MapPin} label="What the scope reaches">
        <Facts
          items={[
            { label: 'Executive KPIs', value: 'Scoped' },
            { label: 'Charts and trends', value: 'Scoped' },
            { label: 'Module pages', value: 'Scoped' },
            { label: 'Tables and records', value: 'Scoped' },
            { label: 'Entity pages', sub: 'Own figures, plus a warning if outside scope', value: 'Scoped' },
          ]}
        />
      </Section>
    </Stack>
  )
}

/* ── shared bits ─────────────────────────────────────────────────────────── */

/** A radio row. The tick is the selection; there is no separate control to hunt for. */
function Option({
  label,
  sub,
  value,
  on,
  onClick,
}: {
  label: string
  sub?: string
  value?: string
  on: boolean
  onClick: () => void
}) {
  return (
    <li className="border-b border-[#f0efec] last:border-0">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left"
        style={on ? { backgroundColor: mix(ACCENT, 0.09) } : undefined}
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[13.5px] ${on ? 'font-semibold' : ''} text-[#1c1a16]`}>{label}</span>
          {sub && (
            <span className="mt-0.5 block truncate text-[11px]" style={{ color: FAINT }}>
              {sub}
            </span>
          )}
        </span>
        {value && (
          <span className="shrink-0 text-[13px] font-medium tabular-nums" style={{ color: FAINT }}>
            {value}
          </span>
        )}
        <span className="grid w-[16px] shrink-0 place-items-center" aria-hidden>
          {on && <Check size={15} strokeWidth={2.5} style={{ color: ACCENT_INK }} />}
        </span>
      </button>
    </li>
  )
}

export function FindField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="flex items-center gap-2 rounded-full bg-[#f7f6f3] px-3 py-2">
      <Search size={14} strokeWidth={2} className="shrink-0" style={{ color: FAINT }} aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1c1a16] outline-none placeholder:text-[#9b958b]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear"
          className="-mr-1 grid size-5 shrink-0 place-items-center rounded-full active:bg-[#eceae5]"
        >
          <X size={13} strokeWidth={2} style={{ color: '#6d6860' }} aria-hidden />
        </button>
      )}
    </label>
  )
}

/**
 * Kept for the surfaces that render their own header — the phone home, mainly.
 *
 * The router now renders `ScopeHeader` on every module and entity page, which states the scope
 * whether or not it is narrowed. This remains for the one surface above the router, and it
 * returns nothing when the scope is Overall so the two do not stack.
 */
export function ScopeNote() {
  const { scope, setSite } = useScope()
  if (!scope.site) return null
  /* The bleed lives here rather than on a wrapper at the call site, so that when this
     returns null there is no empty flex child left behind holding a gap. */
  return (
    <div className="-mx-[var(--gutter)] px-[var(--gutter-lg)] pb-2">
      <div className="flex items-center gap-2 rounded-[12px] px-3 py-2" style={{ backgroundColor: mix('#b45309', 0.1) }}>
        <MapPin size={13} strokeWidth={2} className="shrink-0" style={{ color: '#b45309' }} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium" style={{ color: '#b45309' }}>
          Scoped to {scope.site.name} · {scope.win.window}
        </span>
        <button
          type="button"
          onClick={() => setSite(null)}
          className="shrink-0 rounded-full px-2 py-[2px] text-[11px] font-semibold"
          style={{ backgroundColor: mix('#b45309', 0.18), color: '#b45309' }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export const ZOO_WIDE_NOTE = 'zoo-wide'
export type { Site }
