/**
 * EGGS — one species' egg season, read top to bottom:
 * production → fertility → hatching → loss → the females behind all of it.
 *
 * FOUR SECTIONS AND NOTHING ELSE, by specification: the four season figures, the
 * Laid › Fertile › Hatched month-by-month, the discard reasons, and the female-level table.
 * No status donut, no per-site hatching chart, no generic egg dashboard — the reference this
 * was built against establishes the information architecture and this file keeps to it.
 *
 * WHERE THE NUMBERS COME FROM. `speciesEggSeason.ts` — the extract has no egg record, so the
 * season is derived under `core/seed.ts`'s determinism contract: real register females, real
 * birth-dated seasonality, seeded counts that reconcile exactly (the cards sum the table's
 * rows, the chart apportions the cards, the pills split the chart's shortfalls). That file
 * carries the full argument; this one only draws.
 *
 * EVERY MARK HERE IS AN EXISTING TREATMENT. The chart is `YearBars`' container — same axis
 * ladder, same gridlines, same tooltip, same grow-in — with the one difference the design asks
 * for: each column is a single stacked bar whose bands are the accent's own lightness ladder.
 * The pills are the Circle of Life causes pills; the category strip is its `LineTabs`; the
 * table is `HousingTable` under the same muted green header every records table wears.
 */

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  CalendarRange,
  Check,
  Egg,
  EggOff,
  Heart,
  MapPin,
  PawPrint,
  Venus,
  type LucideIcon,
} from 'lucide-react'
import type { SpeciesProfile } from '../core/profiles'
import { CLASS_ICONS } from '../exec/classIcons'
import {
  ACCENT,
  ACCENT_INK,
  FAINT,
  HAIR,
  INK,
  MD3,
  MUTED,
  Section,
  Stack,
  TONE,
  TRACK,
  VALUE,
  compact,
  fmt,
  mix,
  useChartTip,
} from '../exec/system'
import { usePlay } from '../motion'
import { useDrill } from './drillNav'
import { FindField } from './filters'
import { TapList, TapRow } from './panels'
import { usePaged } from './perf'
import { useScope } from './scope'
import { useSheet } from './sheet'
import {
  MONTHS,
  eggSeason,
  type DiscardReason,
  type EggSeason,
  type EggSite,
  type FemaleSeason,
  type LastSeason,
} from './speciesEggSeason'
import { HousingTable, type HCol } from './speciesHousing'
import { Band, RankedBars, TabBody } from './speciesLayout'

/* ── the gate ────────────────────────────────────────────────────────────── */

/**
 * Whether this species lays eggs at all — the test the tab strip gates on.
 *
 * THE PRESENCE OF A TAB IS ITSELF A CLAIM: a placental mammal offered an Eggs tab has been
 * told it lays. Only "Oviparous …" qualifies; viviparous, ovoviviparous and unrecorded
 * reproduction all withhold the tab. Exported for `entity.tsx`, which applies it once the
 * profile has resolved so the strip never flickers.
 */
export const laysEggs = (p?: SpeciesProfile): boolean => !!p?.reproduction_type?.startsWith('Oviparous')

/* ── shared treatments ───────────────────────────────────────────────────── */

/** The house focus ring, as `exec/marks.tsx` declares it. */
const FOCUS_RING = { '--tw-ring-color': 'rgba(55,189,105,0.45)' } as CSSProperties

/**
 * The progression's three greens — the page accent's own ladder, darkest where the outcome
 * is. Laid is the palest because it is the envelope; hatched is the deep green every other
 * "good" mark on the page already wears.
 */
const SHADE = {
  laid: mix(ACCENT, 0.25),
  fertile: ACCENT,
  hatched: ACCENT_INK,
} as const

/* ── 1 · a season figure ─────────────────────────────────────────────────── */

/** Icon → label → figure → support, on its own wash. Compact by specification: no chart, no delta, no shadow. */
function SummaryCard({
  icon: Glyph,
  title,
  value,
  sub,
  ink,
}: {
  icon: LucideIcon
  title: string
  value: string
  sub: ReactNode
  ink: string
}) {
  return (
    /* WHITE SURFACE, COLOUR ON THE LABEL ONLY. The three cards were washed in their own tint,
       which made the row read as three coloured tiles competing with the chart under them. The
       hue still identifies each card — it is carried by the label and its glyph, which is where
       the reader looks to tell them apart — over the same white paper as every other card. */
    <div className="rounded-[var(--radius-card)] border bg-white px-4 py-3.5" style={{ borderColor: HAIR }}>
      <p className="flex items-center gap-1.5 text-overline font-semibold tracking-[0.04em] uppercase" style={{ color: ink }}>
        <Glyph size={14} strokeWidth={2} aria-hidden />
        {title}
      </p>
      <p className="mt-1.5 font-display text-[24px] leading-[1.15] font-semibold tabular-nums" style={{ color: VALUE }}>
        {value}
      </p>
      <p className="mt-0.5 text-caption" style={{ color: MUTED }}>
        {sub}
      </p>
    </div>
  )
}

/* ── 2 · the stacked months ──────────────────────────────────────────────── */

/**
 * One stacked bar per month — never three bars. The full column is the laid count; the two
 * darker bands inside it are the eggs that proved fertile and the fertile that hatched, so
 * the funnel is read within each month rather than across three charts.
 *
 * Container, axis ladder, gridlines, tick type, tooltip and grow-in are `YearBars`' own,
 * verbatim — this is that chart with bands, not a new chart style.
 */
function StackedMonths({ months }: { months: EggSeason['months'] }) {
  const { ref, animate } = usePlay<HTMLDivElement>()
  const { show, hide, node } = useChartTip()
  /* All three bands in one reading, each with its own swatch — the stacked column's whole
     point is the relationship between them, so the tip states it rather than one number. */
  const tipRows = (m: number, v: number) => [
    { label: 'Laid', value: fmt(v), fill: SHADE.laid },
    { label: 'Fertile', value: fmt(fertile[m]), fill: SHADE.fertile },
    { label: 'Hatched', value: fmt(hatched[m]), fill: SHADE.hatched },
  ]
  const { laid, fertile, hatched } = months

  const peak = Math.max(...laid, 1)
  const raw = peak / 4
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)))
  const stepSize = (raw / mag <= 1 ? 1 : raw / mag <= 2 ? 2 : 5) * mag
  const top = Math.ceil(peak / stepSize) * stepSize
  const lines = Array.from({ length: Math.round(top / stepSize) + 1 }, (_, i) => i * stepSize)
  const total = laid.reduce((n, v) => n + v, 0)

  return (
    <div ref={ref} className="pl-8">
      <div
        className="relative h-[196px] rounded-[8px] outline-none focus-visible:ring-2"
        style={FOCUS_RING}
        role="img"
        tabIndex={0}
        aria-label={`Laid, fertile and hatched by month — ${fmt(total)} eggs laid across the season: ${MONTHS.map(
          (m, i) => `${m} ${laid[i]} laid, ${fertile[i]} fertile, ${hatched[i]} hatched`,
        ).join('; ')}.`}
      >
        {lines.map((v) => (
          <div
            key={v}
            className="absolute inset-x-0 h-px"
            style={{ bottom: `${(v / top) * 100}%`, background: v === 0 ? mix(INK, 0.12) : HAIR }}
          >
            <span className="absolute -top-2 -left-8 w-6 text-right text-tick tabular-nums" style={{ color: FAINT }}>
              {compact(v)}
            </span>
          </div>
        ))}

        <div className="absolute inset-0 flex items-end justify-around gap-1.5">
          {laid.map((v, m) => (
            <div
              key={MONTHS[m]}
              className="relative flex h-full max-w-[104px] flex-1 flex-col justify-end"
              onPointerEnter={(e) => show(e, MONTHS[m], tipRows(m, v))}
              onPointerDown={(e) => show(e, MONTHS[m], tipRows(m, v))}
              onPointerMove={(e) => show(e, MONTHS[m], tipRows(m, v))}
              onPointerLeave={hide}
            >
              {/* The column's own ground is the laid band; the two inner spans cover its lower
                  reaches, so the three heights cannot disagree with the one total. */}
              <span
                className={`flex origin-bottom flex-col justify-end overflow-hidden rounded-t-[4px] ${animate ? 'animate-grow-y' : ''}`}
                style={{
                  height: `${Math.max(2, (v / top) * 100)}%`,
                  background: `linear-gradient(180deg, ${mix(ACCENT, 0.14)} 0%, ${SHADE.laid} 100%)`,
                  animationDelay: animate ? `${m * 40}ms` : undefined,
                }}
              >
                {v > 0 && (
                  <>
                    <span
                      className="block w-full"
                      style={{
                        height: `${((fertile[m] - hatched[m]) / v) * 100}%`,
                        background: `linear-gradient(180deg, ${mix(ACCENT, 0.62)} 0%, ${SHADE.fertile} 100%)`,
                      }}
                    />
                    <span
                      className="block w-full"
                      style={{
                        height: `${(hatched[m] / v) * 100}%`,
                        background: `linear-gradient(180deg, ${mix(ACCENT_INK, 0.72)} 0%, ${SHADE.hatched} 100%)`,
                      }}
                    />
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {node}
      <div className="mt-2 flex justify-around gap-1.5">
        {MONTHS.map((m) => (
          <span key={m} className="max-w-[104px] flex-1 text-center text-tick" style={{ color: MUTED }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── 3 · a discard reason ────────────────────────────────────────────────── */

/** The causes-of-death pill, made pressable: reason then count, the count carrying the weight. */
function ReasonPill({ reason, count, onOpen }: { reason: string; count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      /* The wash is the causes pill's own paper — `speciesOverview.tsx` sets this same value
         on the identical control, and matching it matters more than routing it via a token. */
      className="card-press tap-tall flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-caption"
      style={{ backgroundColor: '#f4f3ef', color: MD3.onSurfaceVariant }}
    >
      {reason}
      <b className="font-semibold tabular-nums" style={{ color: VALUE }}>
        {fmt(count)}
      </b>
    </button>
  )
}

/* ── 4 · the category strip ──────────────────────────────────────────────── */

/**
 * The underline tab row — Circle of Life's `LineTabs`, kept file-private there and duplicated
 * here on the same argument `speciesEggs` has always used for four-line helpers: one pass,
 * one file. Text, a count, and a 2px underline in the page's active green; never buttons,
 * never cards.
 */
function CatTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { key: T; label: string; count: number }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1" role="tablist">
      {options.map((o) => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className="flex items-center gap-1.5 border-b-2 pb-1 text-caption font-medium transition-colors"
            style={{ borderColor: on ? ACCENT_INK : 'transparent', color: on ? ACCENT_INK : FAINT }}
          >
            {o.label}
            <span className="tabular-nums" style={{ color: on ? ACCENT_INK : FAINT }}>
              {fmt(o.count)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ── 5 · the site filter's sheet ─────────────────────────────────────────── */

function SitePick({
  sites,
  current,
  total,
  onPick,
}: {
  sites: EggSite[]
  current: string | null
  total: number
  onPick: (key: string | null) => void
}) {
  const { back } = useSheet()
  const row = (on: boolean, label: string, value: number, click: () => void) => (
    <li key={label} className="border-b last:border-0" style={{ borderColor: HAIR }}>
      <button
        type="button"
        onClick={click}
        aria-pressed={on}
        className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-3 text-left"
        style={on ? { backgroundColor: mix(ACCENT, 0.09) } : undefined}
      >
        <span className={`min-w-0 flex-1 truncate text-small ${on ? 'font-semibold' : ''}`} style={{ color: INK }}>
          {label}
        </span>
        <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: FAINT }}>
          {fmt(value)}
        </span>
        <span className="grid w-[16px] shrink-0 place-items-center" aria-hidden>
          {on && <Check size={15} strokeWidth={2.5} style={{ color: ACCENT_INK }} />}
        </span>
      </button>
    </li>
  )
  return (
    <Stack>
      <Section icon={MapPin} label="Filter the table" aside={`${sites.length} sites`}>
        <ul className="flex flex-col">
          {row(!current, 'All sites', total, () => {
            onPick(null)
            back()
          })}
          {sites.map((s) =>
            row(current === s.key, s.name, s.count, () => {
              onPick(s.key)
              back()
            }),
          )}
        </ul>
      </Section>
    </Stack>
  )
}

/* ── the tab ─────────────────────────────────────────────────────────────── */

type Cat = 'all' | 'none' | 'one' | 'two'

export function SpeciesEggsTab({
  name,
  profile,
}: {
  /**
   * Site-scoped (`<siteKey>:<name-slug>`), and deliberately not destructured. The identity
   * this tab reads by is the NAME, across every site in scope — reading the site out of the
   * id would report a species held at six sites as one site's share of it. The header's site
   * pill is the reader's own narrowing and IS honoured, through `scope.site` below.
   */
  speciesId: string
  name: string
  profile?: SpeciesProfile
}) {
  const { scope } = useScope()
  const { drillTo } = useDrill()
  const { open } = useSheet()

  const siteKey = scope.site?.key ?? null
  const place = scope.site?.name ?? 'every site'

  /* Keyed on the one profile figure the model reads, not the object — the profile resolves
     lazily and may arrive as a fresh reference after any navigation. */
  const season = useMemo(
    () => eggSeason(name, siteKey, profile),
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- clutch size is the model's only profile read */
    [name, siteKey, profile?.clutch_litter_size],
  )

  const [cat, setCat] = useState<Cat>('all')
  const [siteFilter, setSiteFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()

  const rows = useMemo(
    () =>
      season.females.filter((f) => {
        if (cat === 'none' && f.eggs > 0) return false
        if (cat === 'one' && f.clutches !== 1) return false
        if (cat === 'two' && f.clutches < 2) return false
        if (siteFilter && f.animal.siteKey !== siteFilter) return false
        if (q && !`animal ${f.animal.id} ${f.animal.enclosureId} ${f.animal.siteName}`.toLowerCase().includes(q))
          return false
        return true
      }),
    [season, cat, siteFilter, q],
  )

  /* EVERY MATCHING FEMALE, NOT A PAGE OF THEM. The table is the answer to the filter above it,
     and a reader who has narrowed to one site and one clutch band wants the list, not the first
     twelve of it. The limit tracks the row count so nothing is ever withheld. */
  const page = usePaged<FemaleSeason>(
    (offset, limit) => ({ rows: rows.slice(offset, offset + limit), total: rows.length }),
    Math.max(1, rows.length),
    [rows],
  )

  /* ── drill-downs, on the product's own sheet ───────────────────────────── */

  const openReason = (r: DiscardReason) =>
    open({
      title: r.reason,
      eyebrow: `${fmt(r.count)} eggs · ${name}`,
      body: (
        <Stack>
          <Section icon={EggOff} label="Egg records" aside={`${fmt(r.females.length)} females`}>
            <TapList>
              {r.females.slice(0, 40).map((x) => (
                <TapRow
                  key={x.animal.id}
                  label={`Animal ${x.animal.id}`}
                  sub={x.animal.enclosureId !== '—' ? `${x.animal.enclosureId} · ${x.animal.siteName}` : x.animal.siteName}
                  value={`${fmt(x.count)} eggs`}
                  onOpen={() => drillTo({ kind: 'animal', id: x.animal.id }, { module: 'animals', label: name })}
                />
              ))}
            </TapList>
            {r.females.length > 40 && (
              <p className="mt-3 text-caption" style={{ color: FAINT }}>
                and {fmt(r.females.length - 40)} more females
              </p>
            )}
          </Section>
        </Stack>
      ),
    })

  const discarded = season.laid - season.hatched

  const openAllReasons = () =>
    open({
      title: 'Why eggs were discarded',
      eyebrow: `${fmt(discarded)} of ${fmt(season.laid)} eggs · ${name}`,
      body: (
        <Stack>
          <Section icon={EggOff} label="Reasons" aside={fmt(discarded)}>
            <RankedBars
              items={season.reasons.map((r) => [r.reason, r.count] as [string, number])}
              unit="eggs"
              max={season.reasons.length}
              total={discarded}
              onOpen={(label) => {
                const hit = season.reasons.find((r) => r.reason === label)
                if (hit) openReason(hit)
              }}
            />
          </Section>
        </Stack>
      ),
    })

  const openSites = () =>
    open({
      title: 'Site',
      eyebrow: 'Female performance',
      body: <SitePick sites={season.sites} current={siteFilter} total={season.females.length} onPick={setSiteFilter} />,
    })

  /* ── the table's columns ───────────────────────────────────────────────── */

  const Avatar = CLASS_ICONS[season.females[0]?.animal.cls ?? ''] ?? PawPrint

  const lastCell = (last: LastSeason) => {
    if (last.kind === 'none')
      return (
        <span className="text-caption font-medium" style={{ color: FAINT }}>
          No eggs this season
        </span>
      )
    if (last.kind === 'same')
      return (
        <span className="text-caption font-medium" style={{ color: MUTED }}>
          Same as last season
        </span>
      )
    const up = last.kind === 'up'
    return (
      <span className="text-caption font-semibold tabular-nums" style={{ color: up ? TONE.good : TONE.bad }}>
        {up ? '+' : '−'}
        {last.pct}%
      </span>
    )
  }

  const columns: HCol<FemaleSeason>[] = [
    {
      key: 'female',
      head: 'Female',
      sticky: 0,
      strong: true,
      cell: (f) => (
        <span className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: mix(ACCENT, 0.12) }}>
            <Avatar size={15} strokeWidth={1.75} style={{ color: ACCENT_INK }} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block">Animal {f.animal.id}</span>
            <span className="block text-caption font-normal" style={{ color: FAINT }}>
              {f.animal.enclosureId !== '—' ? `${f.animal.enclosureId} · ${f.animal.siteName}` : f.animal.siteName}
            </span>
          </span>
        </span>
      ),
    },
    { key: 'clutches', head: 'Clutches', align: 'right', width: '96px', cell: (f) => fmt(f.clutches) },
    { key: 'eggs', head: 'Eggs', align: 'right', width: '80px', cell: (f) => fmt(f.eggs) },
    {
      key: 'hatch',
      head: 'Hatch %',
      align: 'right',
      width: '96px',
      /* An em dash where there is genuinely no egg — 0% is a measured figure and this is not one. */
      cell: (f) => (f.eggs > 0 ? `${Math.round((f.hatched / f.eggs) * 100)}%` : '—'),
    },
    { key: 'last', head: 'Vs her last season', align: 'right', width: '176px', cell: (f) => lastCell(f.last) },
  ]

  /* ── empty world ───────────────────────────────────────────────────────── */

  if (season.females.length === 0) {
    return (
      <TabBody>
        <Band title="Egg performance" icon={Egg}>
          <p className="text-small" style={{ color: MUTED }}>
            No females of this species are on the register across {place}, so there is no egg season to draw.
          </p>
        </Band>
      </TabBody>
    )
  }

  const pctHatched = season.laid > 0 ? Math.round((season.hatched / season.laid) * 100) : 0
  const pctFertile = season.laid > 0 ? Math.round((season.fertile / season.laid) * 100) : 0
  const pctDied = season.laid > 0 ? Math.round((season.died / season.laid) * 100) : 0
  const pctLaying = Math.round((season.laying / season.females.length) * 100)

  return (
    <TabBody>
      {/* ── 1 · the four season figures ──────────────────────────────────── */}

      <div className="grid grid-cols-1 gap-4 @[560px]:grid-cols-2 @[900px]:grid-cols-4">
        <SummaryCard
          icon={Egg}
          title="Hatched"
          value={`${fmt(season.hatched)} · ${pctHatched}%`}
          sub={`of ${fmt(season.laid)} laid`}
          ink={ACCENT_INK}
        />
        <SummaryCard
          icon={Heart}
          title="Fertility"
          value={`${pctFertile}%`}
          sub={`${fmt(season.fertile)} of ${fmt(season.laid)} fertile`}
          ink={MD3.onSecondaryContainer}
        />
        <SummaryCard
          icon={Venus}
          title="Females laid"
          value={`${fmt(season.laying)}/${fmt(season.females.length)} · ${pctLaying}%`}
          sub={
            season.laidNothing > 0 ? (
              <span className="font-medium" style={{ color: TONE.bad }}>
                {fmt(season.laidNothing)} laid nothing
              </span>
            ) : (
              'every female laid'
            )
          }
          ink={TONE.warn}
        />
        <SummaryCard
          icon={EggOff}
          title="Died developing"
          value={`${fmt(season.died)} · ${pctDied}%`}
          sub="review incubation"
          ink={TONE.bad}
        />
      </div>

      {/* ── 2 · laid › fertile › hatched, month by month ─────────────────── */}

      {season.laid > 0 && (
        <Band title="Laid › Fertile › Hatched — Month by Month" aside="pooled this season" icon={CalendarRange}>
          <StackedMonths months={season.months} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {(
                [
                  ['Laid', SHADE.laid],
                  ['Fertile', SHADE.fertile],
                  ['Hatched', SHADE.hatched],
                ] as [string, string][]
              ).map(([label, fill]) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="size-[8px] shrink-0 rounded-full" style={{ backgroundColor: fill }} aria-hidden />
                  <span className="text-caption" style={{ color: MUTED }}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Band>
      )}

      {/* ── 3 · why eggs were discarded ──────────────────────────────────── */}

      {discarded > 0 && season.reasons.length > 0 && (
        <Band title="Why Eggs Were Discarded" aside={`${fmt(discarded)} of ${fmt(season.laid)} eggs`} icon={EggOff}>
          <div className="flex flex-wrap items-center gap-2">
            {season.reasons.slice(0, 5).map((r) => (
              <ReasonPill key={r.reason} reason={r.reason} count={r.count} onOpen={() => openReason(r)} />
            ))}
            {season.reasons.length > 5 && (
              <button
                type="button"
                onClick={openAllReasons}
                className="card-press tap-tall text-caption font-medium"
                style={{ color: ACCENT_INK }}
              >
                View more ({season.reasons.length - 5})
              </button>
            )}
          </div>
        </Band>
      )}

      {/* ── 4 · the females ──────────────────────────────────────────────── */}

      <Band title="Female-Level Egg Performance" aside={`${fmt(season.females.length)} females · ${place}`} icon={Venus}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <CatTabs
            value={cat}
            onChange={setCat}
            options={[
              { key: 'all', label: 'All Females', count: season.females.length },
              { key: 'none', label: 'Laid Nothing', count: season.laidNothing },
              { key: 'one', label: '1 Clutch', count: season.oneClutch },
              { key: 'two', label: '2+ Clutches', count: season.twoPlus },
            ]}
          />
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            {season.sites.length > 1 && (
              <button
                type="button"
                onClick={openSites}
                className="card-press tap-tall flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium"
                style={{ backgroundColor: TRACK, color: MD3.onSurfaceVariant }}
              >
                <MapPin size={13} strokeWidth={2} aria-hidden style={{ color: ACCENT_INK }} />
                {siteFilter ? (season.sites.find((s) => s.key === siteFilter)?.name ?? siteFilter) : 'All sites'}
                <span className="opacity-60" aria-hidden>
                  ▾
                </span>
              </button>
            )}
            <span className="w-[220px] max-w-full">
              <FindField value={query} onChange={setQuery} placeholder="Search females..." />
            </span>
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-small font-medium" style={{ color: INK }}>
              No females found
            </p>
            <p className="mt-1 text-caption" style={{ color: FAINT }}>
              Try changing your search or selected view.
            </p>
          </div>
        ) : (
          <>
            <HousingTable
              rows={page.rows}
              columns={columns}
              keyOf={(f) => f.animal.id}
              onOpen={(f) => drillTo({ kind: 'animal', id: f.animal.id }, { module: 'animals', label: name })}
            />
          </>
        )}
      </Band>
    </TabBody>
  )
}
