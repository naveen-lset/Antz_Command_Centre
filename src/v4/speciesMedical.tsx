/**
 * MEDICAL — one module, seven shapes: an operational overview, decision-support insights, the
 * animal-level clinical workspace, three preventive-care programmes, and the prescription book.
 *
 * THE SHAPE FOLLOWS THE INFORMATION, by specification. Overview is figures a keeper acts on
 * today; Insights is analysis a curator plans with; Clinical is a workspace of pills and rows;
 * the three programmes share ONE PreventiveView (configuration, not copies); Prescription is
 * the existing pharmacy record, re-dressed. No tab is a copy of another.
 *
 * WHERE THE NUMBERS COME FROM. `speciesMedicalData.ts` — real walks and per-animal joins over
 * the five clinical flows and the two scheduled-dose flows (every row carries its animal id at
 * 100% fill, so repeat-sick, conversion and care-load are real joins), with two derived and
 * declared exceptions: recovery durations and the supplements programme. That file carries the
 * argument; this one draws.
 *
 * EVERY TREATMENT IS AN EXISTING ONE — the underline tabs, the filled pill segments, the
 * hairline stat grid, `AreaTrend` with its ghost compare, `Concentration`, `RankedBars`,
 * `HousingTable`, the causes pill, the product's own sheet for every drill. The one net-new
 * chrome is the right-side drawer the reference demands for the two View-all tables; it is
 * local to this file and borrows the sheet's own scrim, radius and header grammar.
 */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  Activity,
  Bug,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Leaf,
  ListTree,
  MapPin,
  PawPrint,
  Pill,
  Stethoscope,
  Syringe,
  X,
} from 'lucide-react'
import { dateAt, longDate } from '../core/calendar'
import { CLASS_ICONS } from '../exec/classIcons'
import { AreaTrend, Concentration, type Pt } from '../exec/marks'
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
  TONE_FILL,
  TRACK,
  VALUE,
  fmt,
  mix,
} from '../exec/system'
import { useDrill } from './drillNav'
import { FindField } from './filters'
import { TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'
import { useScope } from './scope'
import { useSheet } from './sheet'
import { HousingTable, type HCol } from './speciesHousing'
import { Band, SegmentToggle, TabBody } from './speciesLayout'
import {
  medicalModel,
  type AnimalRef,
  type ClinAnimal,
  type MedRow,
  type Preventive,
  type VocabRow,
} from './speciesMedicalData'
import { siteOf, speciesByName } from '../core/world'

/* ── shared treatments (file-private copies, the species tabs' own precedent) ─ */

const FOCUS_RING = { '--tw-ring-color': 'rgba(55,189,105,0.45)' } as CSSProperties
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function NavTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { key: T; label: string }[]
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
            className="border-b-2 pb-1.5 text-small font-medium transition-colors"
            style={{ borderColor: on ? ACCENT_INK : 'transparent', color: on ? ACCENT_INK : FAINT }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}



function Stats({
  items,
  cols,
}: {
  items: { label: string; value: string; tone?: 'good' | 'warn' | 'bad'; onOpen?: () => void }[]
  cols: 3 | 4
}) {
  const at = cols === 3 ? '@[720px]:grid-cols-3' : '@[720px]:grid-cols-4'
  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border ${at}`}
      style={{ borderColor: HAIR, background: HAIR }}
    >
      {items.map((k) => {
        const body = (
          <>
            <p className="font-display text-n font-bold tabular-nums" style={{ color: k.tone ? TONE[k.tone] : VALUE }}>
              {k.value}
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

function InsightCard({ value, title, onOpen }: { value: number; title: string; sub?: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-press flex w-full items-start justify-between gap-3 rounded-[var(--radius-card)] border bg-white p-[var(--pad-card)] text-left outline-none focus-visible:ring-2"
      style={{ borderColor: HAIR, ...FOCUS_RING }}
    >
      <span className="min-w-0">
        <span className="block font-display text-[28px] leading-[1.1] font-bold tabular-nums" style={{ color: VALUE }}>
          {fmt(value)}
        </span>
        <span className="mt-1.5 block text-small font-semibold" style={{ color: INK }}>
          {title}
        </span>
      </span>
      <ChevronRight size={15} strokeWidth={2.25} className="mt-1 shrink-0" style={{ color: FAINT }} aria-hidden />
    </button>
  )
}

function VocabPill({ label, count, onOpen }: { label: string; count: number; onOpen?: () => void }) {
  const body = (
    <>
      <span className="max-w-[220px] truncate">{label}</span>
      <b className="font-semibold tabular-nums" style={{ color: VALUE }}>
        {fmt(count)}
      </b>
    </>
  )
  /* The wash is the causes pill's own paper — the same literal `speciesOverview.tsx` sets. */
  const cls = 'flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-caption'
  const tint = { backgroundColor: '#f4f3ef', color: MD3.onSurfaceVariant }
  return onOpen ? (
    <button type="button" onClick={onOpen} className={`card-press ${cls}`} style={tint}>
      {body}
    </button>
  ) : (
    <span className={cls} style={tint}>
      {body}
    </span>
  )
}

function InsightRow({
  label,
  share,
  fill,
  value,
  sub,
  onOpen,
}: {
  label: string
  /** 0–1 against the section's own maximum. */
  share: number
  fill: string
  value: string
  sub?: string
  onOpen: () => void
}) {
  return (
    <button type="button" onClick={onOpen} className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2 text-left">
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-small" style={{ color: INK }}>
          {label}
        </span>
        <span className="shrink-0 text-small font-semibold tabular-nums" style={{ color: VALUE }}>
          {value}
          {sub && (
            <span className="ml-1.5 text-caption font-normal" style={{ color: FAINT }}>
              {sub}
            </span>
          )}
        </span>
      </span>
      <span className="mt-1.5 block h-[5px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
        <span className="block h-full rounded-full" style={{ width: `${Math.max(2, share * 100)}%`, backgroundColor: fill }} />
      </span>
    </button>
  )
}

/* ── the right-side drawer — the one net-new chrome, local to Medical ────── */

function Drawer({ title, aside, onClose, children }: { title: string; aside?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/35" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-fade-up absolute inset-y-0 right-0 flex w-[720px] max-w-[94vw] flex-col overflow-hidden rounded-l-[20px] bg-white shadow-[0_24px_70px_rgba(8,16,12,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 pt-5 pb-4" style={{ borderColor: HAIR }}>
          <span>
            {aside && (
              <span className="block text-overline font-semibold tracking-[0.04em] uppercase" style={{ color: FAINT }}>
                {aside}
              </span>
            )}
            <span className="block text-lead font-semibold" style={{ color: INK }}>
              {title}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="card-press grid size-9 shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: TRACK }}
          >
            <X size={15} strokeWidth={2.25} style={{ color: MD3.onSurfaceVariant }} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  )
}

/* ── the preventive-care view, shared by all three programmes ────────────── */

function PreventiveView({
  p,
  noun,
  icon: Glyph,
  sitesOf,
  place,
}: {
  p: Preventive
  /** 'vaccines' | 'dewormers' | 'supplements' — the table noun and search placeholder. */
  noun: string
  icon: typeof Syringe
  sitesOf: number
  place: string
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const items = q ? p.items.filter((i) => i.name.toLowerCase().includes(q)) : p.items

  const columns: HCol<Preventive['items'][number]>[] = [
    { key: 'name', head: noun.slice(0, -1), sticky: 0, strong: true, width: '30%', cell: (r) => r.name },
    { key: 'b0', head: '0–30 days', align: 'right', cell: (r) => fmt(r.b[0]) },
    { key: 'b1', head: '31–60 days', align: 'right', cell: (r) => fmt(r.b[1]) },
    { key: 'b2', head: '61–90 days', align: 'right', cell: (r) => fmt(r.b[2]) },
    {
      key: 'b3',
      head: '90+ days',
      align: 'right',
      cell: (r) =>
        r.b[3] > 0 ? (
          <span className="font-semibold" style={{ color: TONE.bad }}>
            {fmt(r.b[3])}
          </span>
        ) : (
          fmt(0)
        ),
    },
    { key: 'sites', head: 'Sites affected', align: 'right', cell: (r) => `${fmt(r.sites)} of ${fmt(sitesOf)} sites` },
  ]

  const trend: Pt[] = p.monthly.map((m) => ({ label: m.label, value: m.value }))
  const anyDoses = p.monthly.some((m) => m.value > 0)

  return (
    <>
      <Stats
        cols={3}
        items={[
          { label: 'Overdue', value: fmt(p.overdue), tone: p.overdue > 0 ? 'bad' : undefined },
          { label: 'Upcoming in 30 days', value: fmt(p.upcoming), tone: 'good' },
          { label: 'Never given', value: fmt(p.never) },
        ]}
      />

      <Band title={`${noun[0].toUpperCase()}${noun.slice(1)}`} aside={`${fmt(p.items.length)} with doses overdue`} icon={Glyph}>
        {p.items.length > 3 && (
          <div className="mb-4 w-[220px] max-w-full">
            <FindField value={query} onChange={setQuery} placeholder={`Search ${noun}...`} />
          </div>
        )}
        {items.length === 0 ? (
          <p className="py-6 text-center text-small" style={{ color: FAINT }}>
            {p.items.length === 0 ? 'No scheduled doses are pending.' : 'Nothing matches your search.'}
          </p>
        ) : (
          <HousingTable rows={items} columns={columns} keyOf={(r) => r.name} />
        )}
        {p.derived && (
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            The source records supplement administrations without a product name or a schedule, so
            this programme&rsquo;s split and positions are derived — stable for this species, and
            not records.
          </p>
        )}
      </Band>

      <Band title={`Most Used ${noun[0].toUpperCase()}${noun.slice(1)}`} aside={`last 12 months · ${place}`} icon={Activity}>
        {p.used.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {p.used.slice(0, 5).map((u) => (
              <VocabPill key={u.label} label={u.label} count={u.value} />
            ))}
          </div>
        )}
        {anyDoses ? (
          <AreaTrend points={trend} unit="doses given" baseline="zero" height={132} />
        ) : (
          <p className="py-6 text-center text-small" style={{ color: FAINT }}>
            No doses were recorded in the last twelve months.
          </p>
        )}
      </Band>
    </>
  )
}

/* ── the tab ─────────────────────────────────────────────────────────────── */

type View = 'overview' | 'insights' | 'clinical' | 'vaccination' | 'deworming' | 'supplements' | 'prescription'
type ClinCut = 'all' | 'symptoms' | 'assessments'
type Span = '1y' | '2y' | '3y' | 'all'

export function SpeciesMedicalTab({
  name,
}: {
  /** Site-scoped and deliberately unused — the identity this tab reads by is the NAME. */
  speciesId: string
  name: string
}) {
  const { scope } = useScope()
  const { drillTo } = useDrill()
  const { open } = useSheet()
  const siteKey = scope.site?.key ?? null
  const place = scope.site?.name ?? 'all sites'

  const model = useMemo(() => medicalModel(name, siteKey), [name, siteKey])

  const [view, setView] = useState<View>('overview')
  const [span, setSpan] = useState<Span>('1y')
  const [cut, setCut] = useState<ClinCut>('all')
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<'symptoms' | 'assessments' | null>(null)

  const cls = speciesByName(name)[0]?.cls ?? ''
  const Avatar = CLASS_ICONS[cls] ?? PawPrint

  /* ── the drills, all on the product's own sheet ────────────────────────── */

  const openAnimal = (id: string) => drillTo({ kind: 'animal', id }, { module: 'animals', label: name })

  const openAnimals = (title: string, refs: AnimalRef[], eyebrow?: string) =>
    open({
      title,
      eyebrow: eyebrow ?? `${fmt(refs.length)} animals · ${name}`,
      body: (
        <Stack>
          <Section icon={HeartPulse} label="Animals" aside={fmt(refs.length)}>
            {refs.length === 0 ? (
              <p className="py-2 text-small" style={{ color: FAINT }}>
                No animals sit under this figure.
              </p>
            ) : (
              <TapList>
                {refs.slice(0, 60).map((r) => (
                  <TapRow
                    key={r.id}
                    label={`Animal ${r.id}`}
                    sub={[r.siteName, r.note].filter(Boolean).join(' · ')}
                    value=""
                    onOpen={() => openAnimal(r.id)}
                  />
                ))}
              </TapList>
            )}
            {refs.length > 60 && (
              <p className="mt-3 text-caption" style={{ color: FAINT }}>
                and {fmt(refs.length - 60)} more animals
              </p>
            )}
          </Section>
        </Stack>
      ),
    })

  const openCases = (title: string, rows: MedRow[], eyebrow?: string) =>
    open({
      title,
      eyebrow: eyebrow ?? `${fmt(rows.length)} records · ${name}`,
      body: (
        <Stack>
          <Section icon={ListTree} label="Records" aside={fmt(rows.length)}>
            <TapList>
              {rows.slice(0, 50).map((r, i) => (
                <TapRow
                  key={`${r.animalId}-${r.day}-${i}`}
                  label={r.detail === 'Not recorded' ? 'No sign recorded' : r.detail}
                  sub={[longDate(r.day), siteOf(r.siteKey)?.name ?? r.siteKey, r.animalId ? `Animal ${r.animalId}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                  value=""
                  onOpen={r.animalId ? () => openAnimal(r.animalId) : undefined}
                />
              ))}
            </TapList>
            {rows.length > 50 && (
              <p className="mt-3 text-caption" style={{ color: FAINT }}>
                and {fmt(rows.length - 50)} more records
              </p>
            )}
          </Section>
        </Stack>
      ),
    })

  /* ── clinical table paging (hooks live above any early return) ─────────── */

  const q = query.trim().toLowerCase()
  const clinRows = useMemo(() => {
    const rows = (model?.clinAnimals ?? []).filter((c) => {
      if (cut === 'symptoms' && c.signs.length === 0) return false
      if (cut === 'assessments' && c.dx.length === 0) return false
      return !q || `animal ${c.id} ${c.siteName}`.toLowerCase().includes(q)
    })
    return rows
  }, [model, cut, q])
  const clinPage = usePaged<ClinAnimal>(
    (offset, limit) => ({ rows: clinRows.slice(offset, offset + limit), total: clinRows.length }),
    10,
    [clinRows],
  )

  if (!model) {
    return (
      <TabBody>
        <Band title="No medical records" icon={Stethoscope}>
          <p className="text-small" style={{ color: MUTED }}>
            No medical data is available for this species.
          </p>
        </Band>
      </TabBody>
    )
  }

  /* ── overview pieces ───────────────────────────────────────────────────── */

  const monthsBack = { '1y': 12, '2y': 24, '3y': 36, all: model.monthly.labels.length }[span]
  const fellPts: Pt[] = model.monthly.labels.slice(-monthsBack).map((label, i) => ({
    label,
    value: model.monthly.fell.slice(-monthsBack)[i],
  }))

  const programs = [
    { key: 'vaccination' as View, p: model.vaccination },
    { key: 'deworming' as View, p: model.deworming },
    { key: 'supplements' as View, p: model.supplements },
  ]

  const identity = (id: string, siteName: string) => (
    <span className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: mix(ACCENT, 0.12) }}>
        <Avatar size={15} strokeWidth={1.75} style={{ color: ACCENT_INK }} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block">Animal {id}</span>
        <span className="block text-caption font-normal" style={{ color: FAINT }}>
          {siteName}
        </span>
      </span>
    </span>
  )

  const pillCell = (labels: string[]) => (
    <span className="flex flex-wrap items-center gap-1">
      {labels.slice(0, 2).map((l) => (
        <span
          key={l}
          className="max-w-[150px] truncate rounded-full px-2 py-0.5 text-tick font-medium"
          style={{ backgroundColor: mix(ACCENT, 0.1), color: MD3.onSurfaceVariant }}
        >
          {l}
        </span>
      ))}
      {labels.length > 2 && (
        <span className="text-tick font-medium whitespace-nowrap" style={{ color: FAINT }}>
          +{labels.length - 2} more
        </span>
      )}
    </span>
  )

  const clinColumns: HCol<ClinAnimal>[] = [
    { key: 'no', head: 'No', width: '48px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
    { key: 'animal', head: 'Animal', sticky: 48, strong: true, cell: (c) => identity(c.id, c.siteName) },
    { key: 'signs', head: 'Symptoms', cell: (c) => (c.signs.length ? pillCell(c.signs) : '') },
    { key: 'dx', head: 'Clinical assessments', cell: (c) => (c.dx.length ? pillCell(c.dx) : '') },
    { key: 'records', head: 'Records', align: 'right', width: '84px', cell: (c) => fmt(c.records) },
    { key: 'active', head: 'Active', align: 'right', width: '76px', cell: (c) => fmt(c.active) },
    {
      key: 'status',
      head: 'Status',
      width: '96px',
      cell: (c) => (
        <span className="font-medium" style={{ color: c.status === 'Active' ? TONE.warn : TONE.good }}>
          {c.status}
        </span>
      ),
    },
  ]

  const vocabDrawer = (kind: 'symptoms' | 'assessments') => {
    const rows = kind === 'symptoms' ? model.symptoms : model.assessments
    const columns: HCol<VocabRow>[] = [
      { key: 'label', head: kind === 'symptoms' ? 'Symptom' : 'Assessment', sticky: 0, strong: true, cell: (r) => r.label },
      { key: 'cat', head: 'Category', cell: (r) => r.category },
      { key: 'records', head: 'Records', align: 'right', cell: (r) => fmt(r.records) },
      { key: 'animals', head: 'Animals', align: 'right', cell: (r) => fmt(r.animals) },
      { key: 'rec', head: 'Recurrence', align: 'right', cell: (r) => `${r.recurrence.toFixed(1)}×` },
    ]
    return (
      <Drawer
        title={kind === 'symptoms' ? 'All Symptoms' : 'All Clinical Assessments'}
        aside={`${fmt(rows.length)} types · ${name}`}
        onClose={() => setDrawer(null)}
      >
        <HousingTable
          rows={rows}
          columns={columns}
          keyOf={(r) => r.label}
          onOpen={(r) =>
            openCases(r.label, (kind === 'symptoms' ? model.admRows : model.dxRows).filter((x) => x.detail === r.label))
          }
        />
      </Drawer>
    )
  }

  const recoveryMax = Math.max(...model.recovery.map((r) => r.days), 1)
  const recoverySpread =
    model.recovery.length > 1
      ? [Math.min(...model.recovery.map((r) => r.days)), Math.max(...model.recovery.map((r) => r.days))]
      : undefined
  const conversionMax = Math.max(...model.conversion.map((c) => c.pct), 1)
  const seasonMax = Math.max(...model.seasonality, 1)
  const seasonPeak = model.seasonality.indexOf(seasonMax)
  const twoCol = 'grid items-start gap-4 @[860px]:grid-cols-2'

  return (
    <TabBody>
      <NavTabs
        value={view}
        onChange={(v) => {
          setView(v)
          setQuery('')
        }}
        options={[
          { key: 'overview', label: 'Overview' },
          { key: 'insights', label: 'Insights' },
          { key: 'clinical', label: 'Clinical' },
          { key: 'vaccination', label: 'Vaccination' },
          { key: 'deworming', label: 'Deworming' },
          { key: 'supplements', label: 'Supplements' },
          { key: 'prescription', label: 'Prescription' },
        ]}
      />

      {/* ── 1 · OVERVIEW ─────────────────────────────────────────────────── */}

      {view === 'overview' && (
        <>
          <button
            type="button"
            onClick={() => openAnimals('Sick right now', model.sickNow, `${fmt(model.sickNow.length)} animals under care · ${name}`)}
            className="card-press flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-[var(--radius-card)] border bg-white p-[var(--pad-card)] text-left outline-none focus-visible:ring-2"
            style={{ borderColor: HAIR, ...FOCUS_RING }}
          >
            <span className="flex min-w-0 items-baseline gap-3">
              <span className="font-display text-[34px] leading-none font-bold tabular-nums" style={{ color: ACCENT_INK }}>
                {fmt(model.sickNow.length)}
              </span>
              <span className="text-lead font-semibold" style={{ color: INK }}>
                animals are sick right now
              </span>
              <ChevronRight size={15} strokeWidth={2.25} style={{ color: FAINT }} aria-hidden />
            </span>
          </button>

          <div className="grid grid-cols-1 gap-4 @[560px]:grid-cols-2 @[900px]:grid-cols-3">
            <InsightCard
              value={model.repeatSick.length}
              title="Repeat-Sick Animals"
              sub="Sick 3+ times, or the same condition returning"
              onOpen={() => openAnimals('Repeat-sick animals', model.repeatSick)}
            />
            <InsightCard
              value={model.undiagnosed.length}
              title="Undiagnosed"
              sub={
                model.undiagnosedOldest !== undefined
                  ? `Oldest symptom ${fmt(model.undiagnosedOldest)} d without an assessment`
                  : 'Consulted, never diagnosed'
              }
              onOpen={() => openAnimals('Undiagnosed animals', model.undiagnosed)}
            />
            <InsightCard
              value={model.severe.length}
              title="Severe Cases"
              sub="Prognosis Poor or Grave, or High severity"
              onOpen={() => openAnimals('Severe cases', model.severe)}
            />
          </div>

          <Band title="Overdue Preventive Care" aside={`by days past the scheduled dose · ${place}`} icon={Syringe}>
            <HousingTable
              rows={programs}
              keyOf={(r) => r.key}
              onOpen={(r) => setView(r.key)}
              columns={[
                { key: 'program', head: 'Program', sticky: 0, strong: true, cell: (r) => r.p.program },
                { key: 'overdue', head: 'Overdue animals', align: 'right', cell: (r) => fmt(r.p.overdue) },
                { key: 'b0', head: '0–30 days', align: 'right', cell: (r) => fmt(r.p.items.reduce((n, i) => n + i.b[0], 0)) },
                { key: 'b1', head: '31–60 days', align: 'right', cell: (r) => fmt(r.p.items.reduce((n, i) => n + i.b[1], 0)) },
                { key: 'b2', head: '61–90 days', align: 'right', cell: (r) => fmt(r.p.items.reduce((n, i) => n + i.b[2], 0)) },
                {
                  key: 'b3',
                  head: '90+ days',
                  align: 'right',
                  cell: (r) => {
                    const v = r.p.items.reduce((n, i) => n + i.b[3], 0)
                    return v > 0 ? (
                      <span className="font-semibold" style={{ color: TONE.bad }}>
                        {fmt(v)}
                      </span>
                    ) : (
                      fmt(0)
                    )
                  },
                },
              ]}
            />
          </Band>

          <Band
            title="Sick Animals Each Month"
            aside={
              <SegmentToggle
                value={span}
                onChange={setSpan}
                options={[
                  { key: '1y', label: '1Y' },
                  { key: '2y', label: '2Y' },
                  { key: '3y', label: '3Y' },
                  { key: 'all', label: 'All' },
                ]}
              />
            }
            icon={CalendarRange}
          >
            <AreaTrend
              points={fellPts}
              unit="animals fell sick"
              baseline="zero"
              height={148}
            />
          </Band>
        </>
      )}

      {/* ── 2 · INSIGHTS ─────────────────────────────────────────────────── */}

      {view === 'insights' && (
        <>
          <div className={twoCol}>
            <Band title="Recovery Time by Condition" aside="durations derived · cases counted" icon={Activity}>
              {model.recovery.length ? (
                <>
                  <p className="mb-3 text-small font-medium" style={{ color: INK }}>
                    {recoverySpread && recoverySpread[1] - recoverySpread[0] <= 6
                      ? `Recovery times are even — ${recoverySpread[0]}–${recoverySpread[1]} days across conditions`
                      : `${model.recovery.reduce((a, b) => (a.days > b.days ? a : b)).condition} takes longest to resolve`}
                  </p>
                  {model.recovery.map((r) => (
                    <InsightRow
                      key={r.condition}
                      label={r.condition}
                      share={r.days / recoveryMax}
                      fill={MD3.secondaryDark}
                      value={`${r.days}d`}
                      sub={`${fmt(r.cases)} case${r.cases === 1 ? '' : 's'}`}
                      onOpen={() => openCases(r.condition, model.dxRows.filter((x) => x.detail === r.condition))}
                    />
                  ))}
                </>
              ) : (
                <p className="py-6 text-center text-small" style={{ color: FAINT }}>
                  No diagnoses are recorded for this species.
                </p>
              )}
            </Band>

            <Band title="Symptom → Diagnosis Conversion · Within 45 Days" aside="joined over real rows" icon={FlaskConical}>
              {model.conversion.length ? (
                <>
                  <p className="mb-3 text-small font-medium" style={{ color: INK }}>
                    {model.conversion[0].symptom} is the loudest early warning
                  </p>
                  {model.conversion.map((c) => (
                    <InsightRow
                      key={c.symptom}
                      label={c.symptom}
                      share={c.pct / conversionMax}
                      fill={TONE_FILL.warn}
                      value={`${c.pct}%`}
                      sub={`${fmt(c.animals.length)} escalated`}
                      onOpen={() => openAnimals(`${c.symptom} — escalated to a diagnosis`, c.animals)}
                    />
                  ))}
                </>
              ) : (
                <p className="py-6 text-center text-small" style={{ color: FAINT }}>
                  No presenting signs are recorded for this species.
                </p>
              )}
            </Band>

            <Band title="Seasonality · Illness Onsets by Calendar Month" aside="pooled over every year" icon={CalendarRange}>
              <div className="grid grid-cols-6 gap-1.5 @[420px]:grid-cols-12">
                {model.seasonality.map((v, m) => (
                  <button
                    key={MONTH_NAMES[m]}
                    type="button"
                    onClick={() =>
                      openCases(
                        `${MONTH_NAMES[m]} onsets`,
                        model.admRows.filter((r) => dateAt(r.day).getMonth() === m),
                      )
                    }
                    className="card-press flex flex-col items-center gap-1 rounded-[8px] pt-1"
                  >
                    <span
                      className="grid h-[34px] w-full place-items-center rounded-[6px] text-tick font-semibold tabular-nums"
                      style={{
                        backgroundColor: v > 0 ? mix(MD3.error, 0.12 + (v / seasonMax) * 0.78) : TRACK,
                        color: v / seasonMax > 0.55 ? '#ffffff' : MUTED,
                        boxShadow: m === seasonPeak ? `inset 0 0 0 2px ${TONE.bad}` : undefined,
                      }}
                    >
                      {v > 0 ? fmt(v) : ''}
                    </span>
                    <span
                      className={`text-tick ${m === seasonPeak ? 'font-semibold' : ''}`}
                      style={{ color: m === seasonPeak ? INK : FAINT }}
                    >
                      {MONTH_NAMES[m]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-2 text-caption" style={{ color: FAINT }}>
                fewer
                {[0.15, 0.35, 0.6, 0.9].map((a) => (
                  <span key={a} className="size-[10px] rounded-[3px]" style={{ backgroundColor: mix(MD3.error, a) }} aria-hidden />
                ))}
                more onsets
              </p>
            </Band>

            <Band title="Preventive ↔ Sickness Link" aside="consulted in the last year while overdue" icon={Syringe}>
              <div className="flex flex-col gap-1">
                {model.prevLink.map((l) => (
                  <button
                    key={l.program}
                    type="button"
                    onClick={() => openAnimals(`Sick while overdue — ${l.program.toLowerCase()}`, l.sick)}
                    className="card-press -mx-2 flex items-baseline gap-3 rounded-[10px] px-2 py-2 text-left"
                  >
                    <span
                      className="w-[44px] shrink-0 font-display text-[24px] leading-none font-bold tabular-nums"
                      style={{ color: l.sick.length > 0 ? TONE.bad : VALUE }}
                    >
                      {fmt(l.sick.length)}
                    </span>
                    <span className="min-w-0 text-caption leading-snug" style={{ color: MUTED }}>
                      fell sick while overdue on {l.program.toLowerCase()} ·{' '}
                      <b className="font-semibold tabular-nums" style={{ color: VALUE }}>
                        of {fmt(l.overdue)} overdue
                      </b>
                    </span>
                  </button>
                ))}
              </div>
            </Band>
          </div>

          <Band title="Care-Load Concentration" aside={`${fmt(model.careEvents)} clinical events · ${place}`} icon={HeartPulse}>
            <p className="mb-1 text-small font-medium" style={{ color: INK }}>
              {model.careAnimals > 0 && model.chronicFew.events / Math.max(1, model.careEvents) >= 0.4
                ? 'A chronic few, not a sick herd'
                : 'Care is spread across the herd'}
              {' — '}
              <span className="tabular-nums">
                {fmt(model.chronicFew.animals)} animals = {Math.round((model.chronicFew.events / Math.max(1, model.careEvents)) * 100)}%
                of all {fmt(model.careEvents)} clinical events
              </span>
            </p>
            <div className="mt-3 mb-5">
              <Concentration
                items={model.careTop.slice(0, 8).map((c) => ({ label: `Animal ${c.id}`, value: c.events }))}
                total={model.careEvents}
                of={model.careAnimals}
                unit="clinical events"
              />
            </div>
            <TapList>
              {model.careTop.slice(0, 3).map((c) => (
                <TapRow
                  key={c.id}
                  label={`Animal ${c.id}`}
                  sub={[c.enclosure && c.enclosure !== '—' ? c.enclosure : null, c.siteName].filter(Boolean).join(' · ')}
                  value={`${fmt(c.events)} events`}
                  onOpen={() => openAnimal(c.id)}
                />
              ))}
            </TapList>
            {model.careTop.length > 3 && (
              <button
                type="button"
                onClick={() =>
                  openAnimals(
                    'Highest care-load animals',
                    model.careTop.map((c) => ({
                      id: c.id,
                      siteKey: '',
                      siteName: c.siteName,
                      note: `${fmt(c.events)} events`,
                    })),
                  )
                }
                className="card-press tap-tall mt-2 text-caption font-medium"
                style={{ color: ACCENT_INK }}
              >
                View all {fmt(model.careTop.length)} animals →
              </button>
            )}
          </Band>
        </>
      )}

      {/* ── 3 · CLINICAL ─────────────────────────────────────────────────── */}

      {view === 'clinical' && (
        <>
          <Stats
            cols={4}
            items={[
              { label: 'Animals affected', value: fmt(model.affected) },
              { label: 'Active symptoms', value: fmt(model.activeSymptoms), tone: model.activeSymptoms ? 'warn' : undefined },
              { label: 'Active assessments', value: fmt(model.activeAssessments) },
              { label: 'Resolved', value: `${model.resolvedPct}%`, tone: 'good' },
            ]}
          />

          <div className={twoCol}>
            <Band title="Top Symptoms" aside={`${fmt(model.symptoms.length)} types`} icon={ClipboardList}>
              <div className="flex flex-wrap items-center gap-2">
                {model.symptoms.slice(0, 7).map((s) => (
                  <VocabPill
                    key={s.label}
                    label={s.label}
                    count={s.animals}
                    onOpen={() => openCases(s.label, model.admRows.filter((r) => r.detail === s.label))}
                  />
                ))}
                {model.symptoms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDrawer('symptoms')}
                    className="card-press tap-tall text-caption font-medium whitespace-nowrap"
                    style={{ color: ACCENT_INK }}
                  >
                    View all →
                  </button>
                )}
              </div>
            </Band>

            <Band title="Clinical Assessments" aside={`${fmt(model.assessments.length)} types`} icon={FlaskConical}>
              <div className="flex flex-wrap items-center gap-2">
                {model.assessments.slice(0, 6).map((s) => (
                  <VocabPill
                    key={s.label}
                    label={s.label}
                    count={s.animals}
                    onOpen={() => openCases(s.label, model.dxRows.filter((r) => r.detail === s.label))}
                  />
                ))}
                {model.assessments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDrawer('assessments')}
                    className="card-press tap-tall text-caption font-medium whitespace-nowrap"
                    style={{ color: ACCENT_INK }}
                  >
                    View all →
                  </button>
                )}
              </div>
            </Band>
          </div>

          <Band title="Clinical Animals" aside={`${fmt(model.affected)} animals · ${place}`} icon={ListTree}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <SegmentToggle
                value={cut}
                onChange={setCut}
                options={[
                  { key: 'all', label: 'All', count: model.clinAnimals.length },
                  { key: 'symptoms', label: 'Symptoms', count: model.clinAnimals.filter((c) => c.signs.length > 0).length },
                  { key: 'assessments', label: 'Assessments', count: model.clinAnimals.filter((c) => c.dx.length > 0).length },
                ]}
              />
              <span className="w-[220px] max-w-full">
                <FindField value={query} onChange={setQuery} placeholder="Search animal, site..." />
              </span>
            </div>
            {clinRows.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-small font-medium" style={{ color: INK }}>
                  No clinical records found
                </p>
                <p className="mt-1 text-caption" style={{ color: FAINT }}>
                  Try changing your search or selected view.
                </p>
              </div>
            ) : (
              <>
                <HousingTable rows={clinPage.rows} columns={clinColumns} keyOf={(c) => c.id} onOpen={(c) => openAnimal(c.id)} />
                <MoreRows page={clinPage} noun={q || cut !== 'all' ? 'matching animals' : 'animals'} />
              </>
            )}
          </Band>

          {drawer && vocabDrawer(drawer)}
        </>
      )}

      {/* ── 4–6 · the preventive programmes, one view configured three ways ─ */}

      {view === 'vaccination' && (
        <PreventiveView p={model.vaccination} noun="vaccines" icon={Syringe} sitesOf={model.siteCount} place={place} />
      )}
      {view === 'deworming' && (
        <PreventiveView p={model.deworming} noun="dewormers" icon={Bug} sitesOf={model.siteCount} place={place} />
      )}
      {view === 'supplements' && (
        <PreventiveView p={model.supplements} noun="supplements" icon={Leaf} sitesOf={model.siteCount} place={place} />
      )}

      {/* ── 7 · PRESCRIPTION ─────────────────────────────────────────────── */}

      {view === 'prescription' && (
        <>
          <Stats
            cols={3}
            items={[
              { label: 'Prescriptions', value: fmt(model.pharmacy.total) },
              { label: 'Medicines', value: fmt(model.pharmacy.medicines.length) },
              { label: 'Animals prescribed for', value: fmt(model.pharmacy.animals) },
            ]}
          />

          <div className={twoCol}>
            <Band title="Medicines" aside={`${fmt(model.pharmacy.medicines.length)} distinct`} icon={Pill}>
              {model.pharmacy.medicines.length ? (
                model.pharmacy.medicines
                  .slice(0, 8)
                  .map((m) => (
                    <InsightRow
                      key={m.label}
                      label={m.label}
                      share={m.value / Math.max(1, model.pharmacy.medicines[0].value)}
                      fill={ACCENT}
                      value={fmt(m.value)}
                      onOpen={() => openCases(m.label, model.pharmacy.rows.filter((r) => r.detail === m.label))}
                    />
                  ))
              ) : (
                <p className="py-6 text-center text-small" style={{ color: FAINT }}>
                  No prescriptions are recorded for this species.
                </p>
              )}
            </Band>

            <Band title="Delivery Route" aside={`${fmt(model.pharmacy.total)} prescriptions`} icon={MapPin}>
              {model.pharmacy.routes.length ? (
                model.pharmacy.routes.map((r) => (
                  <InsightRow
                    key={r.label}
                    label={r.label}
                    share={r.value / Math.max(1, model.pharmacy.routes[0].value)}
                    fill={MD3.secondaryDark}
                    value={fmt(r.value)}
                    onOpen={() => openCases(r.label, model.pharmacy.rows.filter((x) => x.severity === r.label))}
                  />
                ))
              ) : (
                <p className="py-6 text-center text-small" style={{ color: FAINT }}>
                  No delivery route is recorded.
                </p>
              )}
            </Band>
          </div>

          <Band title="Prescriptions Written" aside={`last 12 months · ${place}`} icon={Activity}>
            {model.pharmacy.monthly.some((m) => m.value > 0) ? (
              <AreaTrend
                points={model.pharmacy.monthly.map((m) => ({ label: m.label, value: m.value }))}
                unit="prescriptions"
                baseline="zero"
                height={132}
              />
            ) : (
              <p className="py-6 text-center text-small" style={{ color: FAINT }}>
                No prescriptions were written in the last twelve months.
              </p>
            )}
            <p className="mt-3 text-caption" style={{ color: FAINT }}>
              The source carries no dispensed quantity, no dose and no course length, so this counts
              prescriptions written and not drugs given.
            </p>
          </Band>
        </>
      )}
    </TabBody>
  )
}
