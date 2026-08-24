/**
 * ASSESSMENTS — Population → Physical Health → Endoscopy → Alerts, one tab, four shapes.
 *
 * THE SHAPE FOLLOWS THE KIND OF INFORMATION, by specification. Population is a table.
 * Physical Health is analytics — summary figures, a distribution, an intelligence ring, then
 * the table. Endoscopy is records — a count, a last-N control, a search, and rows. Alerts is
 * six actionable figures, each opening its own filtered animals. Nothing here forces the four
 * into one dashboard shape.
 *
 * WHERE THE NUMBERS COME FROM. `speciesAssessData.ts` — the real per-species rollup
 * (counts, types, reading ranges, stages, months) given per-animal detail under the
 * `core/seed.ts` determinism contract. That file carries the argument; this one only draws.
 *
 * EVERY TREATMENT IS AN EXISTING ONE. The top navigation is the Circle of Life `LineTabs`
 * with the count worn as a compact badge; the second-level controls are the records
 * workspace's filled pill segments; the summary strips are the Overview KPI strip's hairline
 * grid; the distribution is the house `Columns` mark; the intelligence ring is the dashboard's
 * `Slices` geometry carrying semantic tones; the tables are `HousingTable` under the same
 * muted green header as every records table in the product.
 */

import { useId, useMemo, useState, type CSSProperties } from 'react'
import {
  Activity,
  BellRing,
  Check,
  ClipboardList,
  Gauge,
  Microscope,
  PawPrint,
  Ruler,
  Scale,
  Stethoscope,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { SpeciesProfile } from '../core/profiles'
import { CLASS_ICONS } from '../exec/classIcons'
import {
  ACCENT,
  ACCENT_INK,
  Columns,
  DEEP,
  FAINT,
  HAIR,
  INK,
  INK2,
  MD3,
  MUTED,
  Section,
  Stack,
  TONE,
  TONE_FILL,
  TRACK,
  VALUE,
  fmt,
  mix,
  type Tone,
} from '../exec/system'
import { usePlay } from '../motion'
import { useDrill } from './drillNav'
import { FindField } from './filters'
import { TapList, TapRow } from './panels'
import { usePaged } from './perf'
import { useScope } from './scope'
import { useSheet } from './sheet'
import { assessModel, dmy, type AlertSet, type AssessRow, type RecordKind } from './speciesAssessData'
import { HousingTable, type HCol } from './speciesHousing'
import { Band, TabBody } from './speciesLayout'

/* ── shared treatments ───────────────────────────────────────────────────── */

const FOCUS_RING = { '--tw-ring-color': 'rgba(55,189,105,0.45)' } as CSSProperties

/** The Circle of Life underline tab, with the count worn as a compact rounded badge. */
function NavTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { key: T; label: string; count?: number }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 pb-2" role="tablist">
      {options.map((o) => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className="flex items-center gap-1.5 border-b-2 pb-1.5 text-small font-medium transition-colors"
            style={{ borderColor: on ? ACCENT_INK : 'transparent', color: on ? ACCENT_INK : FAINT }}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className="rounded-full px-1.5 py-px text-tick font-semibold tabular-nums"
                style={{ backgroundColor: on ? mix(ACCENT, 0.16) : TRACK, color: on ? ACCENT_INK : MUTED }}
              >
                {fmt(o.count)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** The records workspace's filled pill segments — green filled active, neutral idle. */
function Pills<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { key: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <span className="flex flex-wrap gap-1.5" role="group">
      {options.map((o) => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.key)}
            className="card-press shrink-0 rounded-full px-3 py-1.5 text-caption font-medium"
            style={on ? { backgroundColor: DEEP, color: '#ffffff' } : { backgroundColor: TRACK, color: MD3.onSurfaceVariant }}
          >
            {o.label}
          </button>
        )
      })}
    </span>
  )
}

/** The Overview KPI strip's hairline grid, value first — the compact summary cell. */
function Stats({
  items,
  cols,
}: {
  items: { label: string; value: number; tone?: Tone; onOpen?: () => void }[]
  cols: 4 | 5 | 6
}) {
  const at = { 4: '@[720px]:grid-cols-4', 5: '@[900px]:grid-cols-5', 6: '@[720px]:grid-cols-3 @[1080px]:grid-cols-6' }[cols]
  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border ${at}`}
      style={{ borderColor: HAIR, background: HAIR }}
    >
      {items.map((k) => {
        const body = (
          <>
            <p
              className="font-display text-n font-bold tabular-nums"
              style={{ color: k.tone && k.tone !== 'neutral' ? TONE[k.tone] : VALUE }}
            >
              {fmt(k.value)}
            </p>
            <p className="mt-0.5 text-caption" style={{ color: FAINT }}>
              {k.label}
            </p>
          </>
        )
        return k.onOpen ? (
          <button
            key={k.label}
            type="button"
            onClick={k.onOpen}
            className="card-press bg-white px-4 py-3.5 text-left outline-none focus-visible:ring-2"
            style={FOCUS_RING}
          >
            {body}
          </button>
        ) : (
          <div key={k.label} className="bg-white px-4 py-3.5">
            {body}
          </div>
        )
      })}
    </div>
  )
}

/* ── the intelligence ring — `Slices` geometry on semantic tones ─────────── */

interface ToneSlice {
  label: string
  value: number
  tone: Tone
}

function ToneRing({ items, centre }: { items: ToneSlice[]; centre: [string, string] }) {
  const uid = useId()
  const { ref, animate, reduce } = usePlay<HTMLDivElement>()
  const parts = items.filter((s) => s.value > 0)
  const total = parts.reduce((n, s) => n + s.value, 0)
  if (!total) return null

  const size = 188
  const R = size / 2
  const ro = R - 4
  const ri = ro * 0.62
  const GAP = 1.6
  let at = -90
  const rad = (d: number) => (d * Math.PI) / 180
  const pt = (r: number, d: number): [number, number] => [R + r * Math.cos(rad(d)), R + r * Math.sin(rad(d))]

  return (
    <div ref={ref} className="grid place-items-center py-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-labelledby={uid}
        /* The reduced-motion case is spent here, not left to `animate`. See the long note
           on the same line in `v4/dashboard.tsx`: `usePlay` reports whether to ANIMATE, and a
           reader who asked for no motion would otherwise be left with a permanently
           `opacity-0` ring. */
        className={`overflow-visible ${animate ? 'animate-fade-up' : reduce ? '' : 'opacity-0'}`}
      >
        <title id={uid}>{parts.map((s) => `${s.label} ${fmt(s.value)}`).join(', ')}</title>
        <defs>
          {parts.map((s) => (
            <linearGradient key={s.label} id={`${uid}-${s.tone}-${s.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={mix(TONE_FILL[s.tone], 0.82)} />
              <stop offset="100%" stopColor={TONE_FILL[s.tone]} />
            </linearGradient>
          ))}
        </defs>
        {parts.map((s) => {
          const sweep = (s.value / total) * 360
          const a = at + GAP / 2
          const b = at + sweep - GAP / 2
          at += sweep
          if (b <= a) return null
          const big = b - a > 180 ? 1 : 0
          const [x1, y1] = pt(ro, a)
          const [x2, y2] = pt(ro, b)
          const [x3, y3] = pt(ri, b)
          const [x4, y4] = pt(ri, a)
          return (
            <path
              key={s.label}
              d={`M${x1} ${y1}A${ro} ${ro} 0 ${big} 1 ${x2} ${y2}L${x3} ${y3}A${ri} ${ri} 0 ${big} 0 ${x4} ${y4}Z`}
              fill={`url(#${uid}-${s.tone}-${s.label})`}
            >
              <title>{`${s.label}: ${fmt(s.value)} (${Math.round((s.value / total) * 100)}%)`}</title>
            </path>
          )
        })}
        <text x={R} y={R - 6} textAnchor="middle" className="text-caption" fill={FAINT}>
          {centre[0]}
        </text>
        <text
          x={R}
          y={R + 21}
          textAnchor="middle"
          className="font-display text-n-sm font-bold tracking-[-.6px] tabular-nums"
          fill={VALUE}
        >
          {centre[1]}
        </text>
      </svg>
    </div>
  )
}

function ToneKey({ items }: { items: ToneSlice[] }) {
  const total = items.reduce((n, s) => n + s.value, 0)
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {items
        .filter((s) => s.value > 0)
        .map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-caption" style={{ color: INK2 }}>
            <span className="size-[9px] shrink-0 rounded-[2.5px]" style={{ background: TONE_FILL[s.tone] }} aria-hidden />
            {s.label}{' '}
            <b className="font-semibold tabular-nums" style={{ color: VALUE }}>
              {fmt(s.value)}
            </b>
            <span className="tabular-nums" style={{ color: FAINT }}>
              {total ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
    </ul>
  )
}

/** ↑ Top Gainer · Animal 14561 · +12.4% — pressable, landing on the animal itself. */
function MoverLine({
  up,
  label,
  animal,
  note,
  onOpen,
}: {
  up: boolean
  label: string
  animal: string
  note: string
  onOpen: () => void
}) {
  const Glyph = up ? TrendingUp : TrendingDown
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-press -mx-2 flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left"
    >
      <Glyph size={14} strokeWidth={2} aria-hidden style={{ color: up ? TONE.good : TONE.bad }} />
      <span className="text-caption" style={{ color: FAINT }}>
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-caption font-medium" style={{ color: INK }}>
        {animal}
      </span>
      <span className="shrink-0 text-caption font-semibold tabular-nums" style={{ color: up ? TONE.good : TONE.bad }}>
        {note}
      </span>
    </button>
  )
}

/* ── the BCS distribution — `Columns` geometry, one semantic fill per bar ── */

function BcsCols({ values }: { values: number[] }) {
  const { ref, animate } = usePlay<HTMLDivElement>()
  const labels = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']
  const max = Math.max(...values, 1)
  const fillOf = (i: number) => {
    const score = 1 + i * 0.5
    return score < 2.5 ? MD3.error : score > 3.5 ? MD3.moderateSecondary : MD3.primary
  }
  return (
    <div ref={ref}>
      <div className="flex h-[92px] items-end gap-1.5">
        {values.map((v, i) => (
          <div key={labels[i]} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-caption tabular-nums" style={{ color: FAINT }}>
              {v}
            </span>
            <span
              className={`w-full origin-bottom rounded-[4px] ${animate ? 'animate-grow-y' : ''}`}
              style={{
                height: `${Math.max(4, (v / max) * 68)}px`,
                backgroundColor: fillOf(i),
                animationDelay: animate ? `${i * 55}ms` : undefined,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {labels.map((l) => (
          <span key={l} className="flex-1 text-center text-tick" style={{ color: MUTED }}>
            {l}
          </span>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {(
          [
            ['Under', MD3.error],
            ['Ideal', MD3.primary],
            ['Over', MD3.moderateSecondary],
          ] as [string, string][]
        ).map(([label, fill]) => (
          <li key={label} className="flex items-center gap-2 text-caption" style={{ color: MUTED }}>
            <span className="size-[8px] shrink-0 rounded-full" style={{ backgroundColor: fill }} aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── small shared parts ──────────────────────────────────────────────────── */

/** One reusable compact pill for every assessment result — muted ground, dark text. */
function ResultPill({ text }: { text: string }) {
  return (
    <span
      className="inline-block max-w-[260px] truncate rounded-[8px] px-2.5 py-1 text-caption font-medium align-middle"
      style={{ backgroundColor: mix(ACCENT, 0.1), color: MD3.onSurfaceVariant }}
      title={text}
    >
      {text}
    </span>
  )
}

/** A tiny inline reading curve — the same polyline every sparkline in the product draws. */
function TrendLine({ values, w = 64, h = 18 }: { values: number[]; w?: number; h?: number }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const at = (v: number) => (max === min ? h / 2 : 2 + (1 - (v - min) / span) * (h - 4))
  const stepX = w / (values.length - 1)
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)} ${at(v).toFixed(1)}`).join('')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="inline-block align-middle">
      <path d={d} fill="none" stroke={ACCENT_INK} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const twoCol = 'grid items-stretch gap-4 @[860px]:grid-cols-2'

const NoRows = ({ what }: { what: string }) => (
  <div className="py-10 text-center">
    <p className="text-small font-medium" style={{ color: INK }}>
      No assessment records
    </p>
    <p className="mt-1 text-caption" style={{ color: FAINT }}>
      No {what} data is available for this species.
    </p>
  </div>
)

/* ── the tab ─────────────────────────────────────────────────────────────── */

type View = 'population' | 'physical' | 'endoscopy' | 'alerts'
type PhysicalView = 'weight' | 'bcs' | 'exam'
type ScopeKind = Exclude<RecordKind, 'exam'>

const KIND_LABEL: Record<RecordKind, string> = {
  exam: 'General Examination',
  finding: 'Remark/Findings',
  breeding: 'Breeding status',
  gonad: 'Gonad status',
}

export function SpeciesAssessmentsTab({ name, profile }: { name?: string; profile?: SpeciesProfile }) {
  const { scope } = useScope()
  const { drillTo } = useDrill()
  const { open } = useSheet()
  const siteKey = scope.site?.key ?? null

  const speciesName = name ?? profile?.common_name ?? ''
  const model = useMemo(
    () => assessModel(speciesName, siteKey, profile),
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- the rollup is the model's only profile read */
    [speciesName, siteKey, profile?.assessments],
  )

  /* PHYSICAL HEALTH LEADS. The tab opens on the analytics rather than on the roster — the
     question a curator brings here is how the animals are doing, and the population table is
     the drill-down from that, so it reads last. */
  const [view, setView] = useState<View>('physical')
  const [physical, setPhysical] = useState<PhysicalView>('weight')
  const [endo, setEndo] = useState<ScopeKind>('finding')
  const [lastN, setLastN] = useState<number | null>(10)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const matches = (r: AssessRow) =>
    !q || `animal ${r.animal.id} ${r.animal.enclosureId} ${r.animal.siteName}`.toLowerCase().includes(q)

  const popRows = useMemo(() => (model?.rows ?? []).filter(matches), [model, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const popPage = usePaged<AssessRow>(
    (offset, limit) => ({ rows: popRows.slice(offset, offset + limit), total: popRows.length }),
    Math.max(1, popRows.length),
    [popRows],
  )
  const weightRows = useMemo(() => (model?.rows ?? []).filter((r) => r.weight !== undefined).filter(matches), [model, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const weightPage = usePaged<AssessRow>(
    (offset, limit) => ({ rows: weightRows.slice(offset, offset + limit), total: weightRows.length }),
    Math.max(1, weightRows.length),
    [weightRows],
  )
  const bcsRows = useMemo(() => (model?.rows ?? []).filter((r) => r.bcs !== undefined).filter(matches), [model, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const bcsPage = usePaged<AssessRow>(
    (offset, limit) => ({ rows: bcsRows.slice(offset, offset + limit), total: bcsRows.length }),
    Math.max(1, bcsRows.length),
    [bcsRows],
  )

  const Avatar = CLASS_ICONS[model?.rows[0]?.animal.cls ?? ''] ?? PawPrint

  const idCell = (r: AssessRow) => (
    <span className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: mix(ACCENT, 0.12) }}>
        <Avatar size={15} strokeWidth={1.75} style={{ color: ACCENT_INK }} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block">Animal {r.animal.id}</span>
        <span className="block text-caption font-normal" style={{ color: FAINT }}>
          {r.animal.enclosureId !== '—' ? `${r.animal.enclosureId} · ${r.animal.siteName}` : r.animal.siteName}
        </span>
      </span>
    </span>
  )

  const openAnimal = (r: AssessRow) =>
    drillTo({ kind: 'animal', id: r.animal.id }, { module: 'animals', label: speciesName })

  const unit = model?.weightUnit ?? ''
  const w = (v?: number) => (v === undefined ? '' : `${fmt(v)}${unit ? ` ${unit}` : ''}`)

  const bcsCell = (r: AssessRow) =>
    r.bcs === undefined ? (
      ''
    ) : (
      <span
        className="font-medium tabular-nums"
        style={{ color: r.bcs < 2.5 ? TONE.bad : r.bcs > 3.5 ? TONE.warn : INK }}
      >
        {r.bcs}
      </span>
    )

  /* ── sheets ────────────────────────────────────────────────────────────── */

  const openAlert = (al: AlertSet) =>
    open({
      title: al.label,
      eyebrow: `${fmt(al.rows.length)} animals · ${speciesName}`,
      body: (
        <Stack>
          <Section icon={BellRing} label="Animals" aside={fmt(al.rows.length)}>
            {al.rows.length === 0 ? (
              <p className="py-2 text-small" style={{ color: FAINT }}>
                No animals sit under this alert.
              </p>
            ) : (
              <>
                <TapList>
                  {al.rows.slice(0, 60).map((r) => (
                    <TapRow
                      key={r.animal.id}
                      label={`Animal ${r.animal.id}`}
                      sub={r.animal.enclosureId !== '—' ? `${r.animal.enclosureId} · ${r.animal.siteName}` : r.animal.siteName}
                      value={
                        al.key === 'up' || al.key === 'down'
                          ? `${(r.weightPct ?? 0) > 0 ? '+' : ''}${r.weightPct}%`
                          : al.key === 'underweight' || al.key === 'overweight'
                            ? `BCS ${r.bcs}`
                            : al.key === 'thin-file'
                              ? `${fmt(r.records)} records`
                              : dmy(r.lastDay)
                      }
                      onOpen={() => openAnimal(r)}
                    />
                  ))}
                </TapList>
                {al.rows.length > 60 && (
                  <p className="mt-3 text-caption" style={{ color: FAINT }}>
                    and {fmt(al.rows.length - 60)} more animals
                  </p>
                )}
              </>
            )}
          </Section>
        </Stack>
      ),
    })

  const openLastN = () =>
    open({
      title: 'Entries',
      eyebrow: 'Assessment records',
      body: <LastNPick current={lastN} onPick={setLastN} />,
    })

  /* ── empty world ───────────────────────────────────────────────────────── */

  if (!model) {
    return (
      <TabBody>
        <Band title="No assessment records" icon={Ruler}>
          <p className="text-small" style={{ color: MUTED }}>
            No assessment data is available for this species.
          </p>
        </Band>
      </TabBody>
    )
  }

  /* ── tables ────────────────────────────────────────────────────────────── */

  const popColumns: HCol<AssessRow>[] = [
    { key: 'no', head: 'NC', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
    { key: 'animal', head: 'Animal', sticky: 52, strong: true, cell: idCell },
    { key: 'weight', head: 'Weight', align: 'right', width: '110px', cell: (r) => w(r.weight) },
    { key: 'bcs', head: 'BCS', align: 'right', width: '80px', cell: bcsCell },
    {
      key: 'overall',
      head: 'Overall %',
      align: 'right',
      width: '100px',
      /* An em dash where no overall score exists — never a fake 0%. */
      cell: (r) => (r.overall === undefined ? '—' : `${r.overall}%`),
    },
    { key: 'last', head: 'Last assessed', align: 'right', width: '130px', muted: true, cell: (r) => dmy(r.lastDay) },
  ]

  const weightColumns: HCol<AssessRow>[] = [
    { key: 'no', head: 'NC', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
    { key: 'animal', head: 'Animal', sticky: 52, strong: true, cell: idCell },
    {
      key: 'trend',
      head: 'Weight trend',
      align: 'right',
      width: '170px',
      cell: (r) => (
        <span className="inline-flex items-center gap-2.5">
          {r.weightSeries && r.weightSeries.length > 1 && <TrendLine values={r.weightSeries} />}
          <span className="font-medium tabular-nums">{w(r.weight)}</span>
        </span>
      ),
    },
    {
      key: 'overall',
      head: 'Overall %',
      align: 'right',
      width: '100px',
      cell: (r) => (r.overall === undefined ? '—' : `${r.overall}%`),
    },
    { key: 'last', head: 'Last assessed', align: 'right', width: '130px', muted: true, cell: (r) => dmy(r.lastDay) },
  ]

  const bcsColumns: HCol<AssessRow>[] = [
    { key: 'no', head: 'NC', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
    { key: 'animal', head: 'Animal', sticky: 52, strong: true, cell: idCell },
    {
      key: 'trend',
      head: 'BCS trend',
      align: 'right',
      width: '150px',
      cell: (r) => (
        <span className="inline-flex items-center gap-2.5">
          {r.bcsPrev !== undefined && <TrendLine values={[r.bcsPrev, r.bcs ?? r.bcsPrev]} w={48} h={14} />}
          {bcsCell(r)}
        </span>
      ),
    },
    { key: 'weight', head: 'Weight', align: 'right', width: '110px', cell: (r) => w(r.weight) },
    { key: 'last', head: 'Last assessed', align: 'right', width: '130px', muted: true, cell: (r) => dmy(r.lastDay) },
  ]

  const recordTable = (kind: RecordKind) => {
    const all = model.records[kind]
    const found = all.filter(matches)
    const rows = lastN === null ? found : found.slice(0, lastN)
    return (
      <Band title={KIND_LABEL[kind]} aside={`${fmt(all.length)} animals`} icon={kind === 'exam' ? Stethoscope : Microscope}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <span className="text-small" style={{ color: MUTED }}>
            <b className="font-semibold tabular-nums" style={{ color: VALUE }}>
              {fmt(found.length)}
            </b>{' '}
            animal{found.length === 1 ? '' : 's'}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openLastN}
              className="card-press tap-tall flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium"
              style={{ backgroundColor: TRACK, color: MD3.onSurfaceVariant }}
            >
              {lastN === null ? 'All entries' : `Last ${lastN} entries`}
              <span className="opacity-60" aria-hidden>
                ▾
              </span>
            </button>
            <span className="w-[220px] max-w-full">
              <FindField value={query} onChange={setQuery} placeholder="Search animal..." />
            </span>
          </span>
        </div>
        {rows.length === 0 ? (
          <NoRows what={KIND_LABEL[kind].toLowerCase()} />
        ) : (
          <HousingTable
            rows={rows}
            keyOf={(r) => r.animal.id}
            onOpen={openAnimal}
            columns={[
              { key: 'animal', head: 'Animal', sticky: 0, strong: true, cell: idCell },
              {
                key: 'value',
                head: `${KIND_LABEL[kind]} assessment`,
                cell: (r) => (
                  <span className="flex flex-col items-start gap-1">
                    <ResultPill text={r.recs[kind]?.text ?? ''} />
                    <span className="text-caption" style={{ color: FAINT }}>
                      {dmy(r.recs[kind]?.day ?? r.lastDay)}
                    </span>
                  </span>
                ),
              },
            ]}
          />
        )}
      </Band>
    )
  }

  /* ── the intelligence panels' slices ───────────────────────────────────── */

  const weightSlices: ToneSlice[] = [
    { label: 'Gaining', value: model.weight.gaining, tone: 'good' },
    { label: 'Stable', value: model.weight.stable, tone: 'neutral' },
    { label: 'Declining', value: model.weight.declining, tone: 'bad' },
  ]
  const trendTotal = model.weight.gaining + model.weight.stable + model.weight.declining
  const gainPct = trendTotal ? Math.round((model.weight.gaining / trendTotal) * 100) : 0

  const bcsSlices: ToneSlice[] = [
    { label: 'Ideal', value: model.bcs.ideal, tone: 'good' },
    { label: 'Under', value: model.bcs.under, tone: 'bad' },
    { label: 'Over', value: model.bcs.over, tone: 'warn' },
  ]
  const idealPct = model.bcs.assessed ? Math.round((model.bcs.ideal / model.bcs.assessed) * 100) : 0

  const switchView = (v: View) => {
    setView(v)
    setQuery('')
  }

  return (
    <TabBody>
      <NavTabs
        value={view}
        onChange={switchView}
        options={[
          { key: 'physical', label: 'Physical Health' },
          { key: 'endoscopy', label: 'Endoscopy' },
          { key: 'alerts', label: 'Alerts', count: model.alertCount },
          { key: 'population', label: 'Population', count: model.rows.length },
        ]}
      />

      {/* ── 1 · population, which is a table ─────────────────────────────── */}

      {/* THE SEARCH RIDES THE HEADER ROW. It sat in a strip of its own under the title with a
          row count opposite it — a band of chrome between the heading and the table it acts on.
          As the band's `aside` it is on the title's own line, and the count it faced is gone:
          the table beneath is the count. */}
      {view === 'population' && (
        <Band
          title="Population Assessment"
          icon={ClipboardList}
          aside={
            <span className="w-[220px] max-w-full">
              <FindField value={query} onChange={setQuery} placeholder="Search animal..." />
            </span>
          }
        >
          {popRows.length === 0 ? (
            <NoRows what="population assessment" />
          ) : (
            <>
              <HousingTable rows={popPage.rows} columns={popColumns} keyOf={(r) => r.animal.id} onOpen={openAnimal} />
            </>
          )}
        </Band>
      )}

      {/* ── 2 · physical health, which is analytics ──────────────────────── */}

      {view === 'physical' && (
        <>
          <Pills
            value={physical}
            onChange={(v) => {
              setPhysical(v)
              setQuery('')
            }}
            options={[
              { key: 'weight', label: 'Weight' },
              { key: 'bcs', label: 'BCS' },
              { key: 'exam', label: 'General Examination' },
            ]}
          />

          {physical === 'weight' && (
            <>
              <Stats
                cols={4}
                items={[
                  { label: 'Assessed', value: model.weight.assessed },
                  { label: 'Gaining', value: model.weight.gaining, tone: 'good' },
                  { label: 'Declining', value: model.weight.declining, tone: 'bad' },
                  { label: 'Stable', value: model.weight.stable },
                ]}
              />
              <div className={twoCol}>
                <Band title="Weight Distribution" aside={model.weight.distNote} icon={Scale}>
                  {model.weight.dist.length ? (
                    <Columns
                      values={model.weight.dist.map((b) => b.value)}
                      labels={model.weight.dist.map((b) => b.label)}
                      noun="animals"
                      highlight={model.weight.dist.reduce((hi, b, i, xs) => (b.value > xs[hi].value ? i : hi), 0)}
                      showValues
                      fill={MD3.secondaryDark}
                    />
                  ) : (
                    <NoRows what="weight" />
                  )}
                </Band>
                <Band title="Weight Intelligence" aside={`${fmt(trendTotal)} trended`} icon={Activity}>
                  {trendTotal ? (
                    <>
                      <ToneRing items={weightSlices} centre={['Gaining', `${gainPct}%`]} />
                      <ToneKey items={weightSlices} />
                      <div className="mt-4 border-t pt-3" style={{ borderColor: HAIR }}>
                        {model.weight.topGainer && (
                          <MoverLine
                            up
                            label="Top Gainer"
                            animal={`Animal ${model.weight.topGainer.animal.id}`}
                            note={`+${model.weight.topGainer.pct}%`}
                            onOpen={() =>
                              drillTo({ kind: 'animal', id: model.weight.topGainer!.animal.id }, { module: 'animals', label: speciesName })
                            }
                          />
                        )}
                        {model.weight.topLoser && (
                          <MoverLine
                            up={false}
                            label="Top Loser"
                            animal={`Animal ${model.weight.topLoser.animal.id}`}
                            note={`${model.weight.topLoser.pct}%`}
                            onOpen={() =>
                              drillTo({ kind: 'animal', id: model.weight.topLoser!.animal.id }, { module: 'animals', label: speciesName })
                            }
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <NoRows what="weight trend" />
                  )}
                </Band>
              </div>
              <Band title="Weighed Animals" aside={`${fmt(weightRows.length)} animals`} icon={Scale}>
                <div className="mb-4 w-[220px] max-w-full">
                  <FindField value={query} onChange={setQuery} placeholder="Search animal..." />
                </div>
                {weightRows.length === 0 ? (
                  <NoRows what="weight" />
                ) : (
                  <>
                    <HousingTable rows={weightPage.rows} columns={weightColumns} keyOf={(r) => r.animal.id} onOpen={openAnimal} />
                  </>
                )}
              </Band>
            </>
          )}

          {physical === 'bcs' && (
            <>
              <Stats
                cols={5}
                items={[
                  { label: 'with no BCS records', value: model.bcs.none },
                  { label: 'overweight (BCS > 3.5)', value: model.bcs.over, tone: 'warn' },
                  { label: 'underweight (BCS < 2.5)', value: model.bcs.under, tone: 'bad' },
                  { label: 'improved toward ideal', value: model.bcs.improved, tone: 'good' },
                  { label: 'declined from ideal', value: model.bcs.declined, tone: 'bad' },
                ]}
              />
              <div className={twoCol}>
                <Band title="BCS Distribution" aside={`${fmt(model.bcs.assessed)} scored`} icon={Gauge}>
                  {model.bcs.assessed ? <BcsCols values={model.bcs.dist} /> : <NoRows what="body condition" />}
                </Band>
                <Band title="BCS Intelligence" aside="ideal is 2.5 – 3.5" icon={Activity}>
                  {model.bcs.assessed ? (
                    <>
                      <ToneRing items={bcsSlices} centre={['Ideal', `${idealPct}%`]} />
                      <ToneKey items={bcsSlices} />
                      <div className="mt-4 border-t pt-3" style={{ borderColor: HAIR }}>
                        {model.bcs.mostImproved && (
                          <MoverLine
                            up
                            label="Most Improved"
                            animal={`Animal ${model.bcs.mostImproved.animal.id}`}
                            note={`${model.bcs.mostImproved.bcsPrev} → ${model.bcs.mostImproved.bcs}`}
                            onOpen={() => openAnimal(model.bcs.mostImproved!)}
                          />
                        )}
                        {model.bcs.mostDeclined && (
                          <MoverLine
                            up={false}
                            label="Most Declined"
                            animal={`Animal ${model.bcs.mostDeclined.animal.id}`}
                            note={`${model.bcs.mostDeclined.bcsPrev} → ${model.bcs.mostDeclined.bcs}`}
                            onOpen={() => openAnimal(model.bcs.mostDeclined!)}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <NoRows what="body condition" />
                  )}
                </Band>
              </div>
              <Band title="Scored Animals" aside={`${fmt(bcsRows.length)} animals`} icon={Gauge}>
                <div className="mb-4 w-[220px] max-w-full">
                  <FindField value={query} onChange={setQuery} placeholder="Search animal..." />
                </div>
                {bcsRows.length === 0 ? (
                  <NoRows what="body condition" />
                ) : (
                  <>
                    <HousingTable rows={bcsPage.rows} columns={bcsColumns} keyOf={(r) => r.animal.id} onOpen={openAnimal} />
                  </>
                )}
              </Band>
            </>
          )}

          {physical === 'exam' && recordTable('exam')}
        </>
      )}

      {/* ── 3 · endoscopy, which is records ──────────────────────────────── */}

      {view === 'endoscopy' && (
        <>
          <Pills
            value={endo}
            onChange={(v) => {
              setEndo(v)
              setQuery('')
            }}
            options={[
              { key: 'finding', label: 'Remark/Findings' },
              { key: 'breeding', label: 'Breeding status' },
              { key: 'gonad', label: 'Gonad status' },
            ]}
          />
          {recordTable(endo)}
        </>
      )}

      {/* ── 4 · alerts, which are actions ────────────────────────────────── */}

      {view === 'alerts' && (
        <Band title="Physical Health" aside={`${fmt(model.alertCount)} alerts`} icon={BellRing}>
          <Stats
            cols={6}
            items={model.alerts.map((al) => ({
              label: al.label,
              value: al.rows.length,
              tone: al.rows.length ? al.tone : undefined,
              onOpen: () => openAlert(al),
            }))}
          />
        </Band>
      )}
    </TabBody>
  )
}

/* ── the last-N sheet ────────────────────────────────────────────────────── */

function LastNPick({ current, onPick }: { current: number | null; onPick: (n: number | null) => void }) {
  const { back } = useSheet()
  const choices: [number | null, string][] = [
    [10, 'Last 10 entries'],
    [25, 'Last 25 entries'],
    [50, 'Last 50 entries'],
    [null, 'All entries'],
  ]
  return (
    <Stack>
      <Section icon={ClipboardList} label="Show" aside="entries">
        <ul className="flex flex-col">
          {choices.map(([n, label]) => {
            const on = current === n
            return (
              <li key={label} className="border-b last:border-0" style={{ borderColor: HAIR }}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(n)
                    back()
                  }}
                  aria-pressed={on}
                  className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-3 text-left"
                  style={on ? { backgroundColor: mix(ACCENT, 0.09) } : undefined}
                >
                  <span className={`min-w-0 flex-1 truncate text-small ${on ? 'font-semibold' : ''}`} style={{ color: INK }}>
                    {label}
                  </span>
                  <span className="grid w-[16px] shrink-0 place-items-center" aria-hidden>
                    {on && <Check size={15} strokeWidth={2.5} style={{ color: ACCENT_INK }} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Section>
    </Stack>
  )
}
