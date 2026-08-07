/**
 * GLOBAL FILTERS — one date range, one site, one species search, everywhere.
 *
 * The chip row this replaces held five windows and worked because five is a number of
 * chips that fits. The brief asks for nine plus a custom range, and a nine-chip row is
 * a horizontal scroll where the option you want is always the one off-screen.
 *
 * So the filters become two pills that open sheets — which is also what the brief says
 * to do with filters ("Bottom Sheets should still be used for Search, Filters…"). It
 * costs one tap to change a window and gains: room for nine windows and a date picker,
 * a site selector that would never have fitted beside them, and the same control on
 * every surface rather than a chip row on the home and something else in a module.
 *
 * THE SITE FILTER IS THE ONE WITH TEETH. Picking Aquatic Halls re-cuts the home's
 * headline KPIs, pre-selects the facet in every drill sheet, and scopes the module
 * pages' hero and site card. Where a figure has no site model behind it — a welfare
 * score, a food-wastage percentage — the tile says "zoo-wide" rather than quietly
 * showing an unscoped number under a scoped heading.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { CalendarRange, Check, MapPin, Search, X } from 'lucide-react'
import { PERIODS, usePeriod, type PeriodKey } from '../exec/period'
import { SITES, siteCut, type Site } from '../exec/sites'
import { ACCENT, ACCENT_INK, FAINT, Facts, Section, Stack, TONE, fmt, mix } from '../exec/system'
import { useSheet } from './sheet'

/* ── the site scope ──────────────────────────────────────────────────────── */

interface SiteCtx {
  /** `null` is the whole collection, and is the default. */
  site: Site | null
  set: (s: Site | null) => void
}

const SiteContext = createContext<SiteCtx>({ site: null, set: () => {} })

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, set] = useState<Site | null>(null)
  const value = useMemo(() => ({ site, set }), [site])
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export const useSite = () => useContext(SiteContext)

/**
 * A module's figure under the current window AND the current site scope.
 *
 * Returns `undefined` when the module has no site model, which is the caller's signal
 * to keep showing the zoo-wide figure and label it as such. A silent fallback would be
 * the worse behaviour: a KPI grid where two tiles are scoped to Aquatic Halls and four
 * are not, with nothing on screen saying which is which.
 */
export function useScoped(slug: string): { value: number; of?: number; rate: boolean } | undefined {
  const { cut } = usePeriod()
  const { site } = useSite()
  const split = siteCut(slug, cut)
  if (!split) return undefined
  const rate = split.kind === 'rate'
  if (!site) return { value: split.overall, of: split.overallOf, rate }
  const row = split.rows.find((r) => r.site.key === site.key)
  if (!row) return { value: 0, of: 0, rate }
  return { value: rate ? row.percent : row.value, of: row.of, rate }
}

/* ── the bar ─────────────────────────────────────────────────────────────── */

/**
 * Two pills — window and site — pinned wherever figures are shown.
 *
 * `tone="home"` only changes the gutter so the bar lines up with the greeting above
 * it; the pills themselves are identical on every surface, because a control that
 * looks different in two places is read as two controls.
 */
export function FilterBar({ tone = 'sheet' }: { tone?: 'sheet' | 'home' }) {
  const { period } = usePeriod()
  const { site } = useSite()
  const { open } = useSheet()
  const gutter = tone === 'home' ? 'px-5' : 'px-6'

  return (
    <div className={`flex items-center gap-2 ${gutter} pb-3`}>
      <Pill
        icon={CalendarRange}
        label={period.label}
        onClick={() => open({ title: 'Date range', eyebrow: period.window, body: <DateRangePanel /> })}
      />
      <Pill
        icon={MapPin}
        label={site ? site.name : 'All sites'}
        on={Boolean(site)}
        onClick={() => open({ title: 'Site', eyebrow: site ? site.name : 'All sites', body: <SitePanel /> })}
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

function DateRangePanel() {
  const { period, set, custom, setCustom } = usePeriod()
  const { back } = useSheet()

  return (
    <Stack>
      <Section icon={CalendarRange} label="Window" aside={period.window}>
        <ul className="flex flex-col">
          {PERIODS.map((p) => (
            <Option
              key={p.key}
              label={p.label}
              sub={p.key === 'custom' ? 'Pick two dates below' : p.window}
              on={p.key === period.key}
              onClick={() => {
                set(p.key)
                /* A window is a one-tap decision, so the sheet closes itself rather
                   than making the reader dismiss a list they have finished with. The
                   custom range is the exception — it needs the dates below. */
                if (p.key !== 'custom') back()
              }}
            />
          ))}
        </ul>
      </Section>

      <Section icon={CalendarRange} label="Custom range">
        <div className="flex items-center gap-3">
          <DateField label="From" value={custom.from} onChange={(from) => setCustom({ ...custom, from })} />
          <span className="mt-4 shrink-0 text-[13px]" style={{ color: FAINT }} aria-hidden>
            →
          </span>
          <DateField label="To" value={custom.to} onChange={(to) => setCustom({ ...custom, to })} />
        </div>
        <button
          type="button"
          onClick={() => {
            set('custom')
            back()
          }}
          className="card-press mt-4 w-full rounded-[11px] py-2.5 text-[13px] font-semibold text-white"
          style={{ backgroundColor: '#123a2c' }}
        >
          Apply range
        </button>
        {/* Stated, not hidden. The demo set is authored at five grains, so a custom
            range is read off the nearest of them and scaled by how long it is — an
            estimate, and one the reader is entitled to know is an estimate. */}
        <p className="mt-3 text-[11px] leading-[15px]" style={{ color: FAINT }}>
          A custom range is estimated from the nearest reported grain and scaled to the
          days you pick.
        </p>
      </Section>
    </Stack>
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
      <span className="block text-[10px] font-medium tracking-[0.09em] uppercase" style={{ color: FAINT }}>
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[10px] bg-[#f7f6f3] px-3 py-2 text-[13px] tabular-nums text-[#1c1a16] outline-none focus:ring-2 focus:ring-[#37bd69]/35"
      />
    </label>
  )
}

/* ── the site sheet ──────────────────────────────────────────────────────── */

/**
 * Every site, with the collection headcount beside it so the choice is informed —
 * "Carnivore Ridge" means something different when you can see it holds 1,892 animals
 * against Aquatic Halls' 178,400.
 */
function SitePanel() {
  const { cut } = usePeriod()
  const { site, set } = useSite()
  const { back } = useSheet()
  const [query, setQuery] = useState('')
  const split = siteCut('animals', cut)

  const q = query.trim().toLowerCase()
  const rows = SITES.filter(
    (s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
  )

  const headcount = (key: string) => split?.rows.find((r) => r.site.key === key)?.value ?? 0

  return (
    <Stack>
      <Section icon={MapPin} label="Scope" aside={`${SITES.length} sites`}>
        <FindField value={query} onChange={setQuery} placeholder="Find a site" />
        <ul className="mt-3 flex flex-col">
          <Option
            label="All sites"
            sub="The whole collection"
            value={split ? fmt(split.overall) : undefined}
            on={!site}
            onClick={() => {
              set(null)
              back()
            }}
          />
          {rows.map((s) => (
            <Option
              key={s.key}
              label={s.name}
              sub={`${s.code} · ${s.enclosures} enclosures`}
              value={fmt(headcount(s.key))}
              on={site?.key === s.key}
              onClick={() => {
                set(s)
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
      <Section icon={MapPin} label="What the scope reaches">
        <Facts
          items={[
            { label: 'Executive KPIs', value: 'Scoped' },
            { label: 'Drill-downs', value: 'Scoped' },
            { label: 'Module heroes', value: 'Scoped' },
            { label: 'Scores and rates', sub: 'No site model behind them', value: 'Zoo-wide' },
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
          {sub && <span className="mt-0.5 block truncate text-[11px]" style={{ color: FAINT }}>{sub}</span>}
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
 * The banner every scoped surface carries when a site is picked.
 *
 * Without it a page headed "Mortality · 23" that is actually showing five is simply
 * wrong. One line, dismissible by clearing the scope from where you are.
 */
export function ScopeNote() {
  const { site, set } = useSite()
  if (!site) return null
  return (
    <div className="px-[var(--gutter-lg)] pb-2">
      <div
        className="flex items-center gap-2 rounded-[12px] px-3 py-2"
        style={{ backgroundColor: mix(TONE.warn, 0.1) }}
      >
        <MapPin size={13} strokeWidth={2} className="shrink-0" style={{ color: TONE.warn }} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium" style={{ color: TONE.warn }}>
          Scoped to {site.name}
        </span>
        <button
          type="button"
          onClick={() => set(null)}
          className="shrink-0 rounded-full px-2 py-[2px] text-[11px] font-semibold"
          style={{ backgroundColor: mix(TONE.warn, 0.18), color: TONE.warn }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

/** For a KPI whose figure has no site model — states the exception rather than hiding it. */
export const ZOO_WIDE_NOTE = 'zoo-wide'

export type { PeriodKey }
