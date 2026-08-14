/**
 * HOSPITAL — admission, care, stay, outcome, facility. One operational page, no sub-tabs: the
 * hierarchy is the order. The insight strip carries the three signals a curator acts on
 * (repeat admissions, deaths in care, long stays), the stat grid states the current load, and
 * the analytical bands below answer volume, outcome, facility and workload in that order.
 *
 * NOT A SECOND MEDICAL TAB, by specification. Medical reads the same flows and answers "how
 * sick is this species" — signs, diagnoses, preventive programmes. This page answers "what
 * does its hospital traffic look like" and states no figure Medical already states. The one
 * surface it owns outright is the dark strip: `DEEP` (the palette's own dark teal) carrying
 * the page's three headline joins, the treatment Medical never uses.
 *
 * WHERE THE NUMBERS COME FROM. `speciesHospitalData.ts` — real admission and mortality joins
 * for everything countable, three derived-and-declared exceptions (stay lengths, the facility
 * split, surgery). That file carries the argument; this one draws.
 *
 * EVERY TREATMENT IS AN EXISTING ONE — `Band`, the hairline stat grid, `AreaTrend` with the
 * 1Y/2Y/3Y/All span, `SplitRing` (its `center` prop states the share), `CoverageMeter` for
 * both distribution bars, `HousingTable`, the product's own sheet for every drill, and the
 * hospital entity page for facility rows.
 */

import { useMemo, useState, type CSSProperties } from 'react'
import {
  Building2,
  CalendarRange,
  ChevronRight,
  Clock3,
  HeartPulse,
  ListTree,
  Scissors,
} from 'lucide-react'
import { longDate } from '../core/calendar'
import { AreaTrend, SplitRing, type Pt } from '../exec/marks'
import {
  ACCENT,
  DEEP,
  FAINT,
  HAIR,
  MD3,
  MUTED,
  Section,
  Stack,
  TONE,
  TRACK,
  VALUE,
  fmt,
  mix,
} from '../exec/system'
import { useDrill } from './drillNav'
import { TapList, TapRow } from './panels'
import { useScope } from './scope'
import { useSheet } from './sheet'
import { HousingTable, type HCol } from './speciesHousing'
import { Band, CoverageMeter, SegmentToggle, TabBody } from './speciesLayout'
import { hospitalModel, type HospitalRow } from './speciesHospitalData'
import type { AnimalRef, MedRow } from './speciesMedicalData'
import { siteOf } from '../core/world'

/* ── shared treatments (file-private copies, the species tabs' own precedent) ─ */

const FOCUS_RING = { '--tw-ring-color': 'rgba(55,189,105,0.45)' } as CSSProperties

/** The 1Y/2Y/3Y/All span control — Medical's own underline strip, unchanged. */

function Stats({
  items,
}: {
  items: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad'; onOpen?: () => void }[]
}) {
  return (
    <div
      className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-card)] border @[720px]:grid-cols-3"
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
            {/* No qualifier line — the value and its name are the cell. */}
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

function InsightStrip({
  items,
}: {
  items: { value: number; title: string; sub: string; onOpen: () => void }[]
}) {
  return (
    <div className="grid overflow-hidden rounded-[var(--radius-card)] @[720px]:grid-cols-3" style={{ backgroundColor: DEEP }}>
      {items.map((s) => (
        <button
          key={s.title}
          type="button"
          onClick={s.onOpen}
          className="card-press flex items-start justify-between gap-3 border-b border-white/10 p-[var(--pad-card)] text-left outline-none focus-visible:ring-2 last:border-b-0 @[720px]:border-r @[720px]:border-b-0 @[720px]:last:border-r-0"
          style={FOCUS_RING}
        >
          {/* THE NUMBER LEADS, AND IT IS THE SAME SIZE IN ALL THREE. The evidence line under
              each title is gone and the figure is set at hero scale, so the strip reads as
              three headline counts rather than as three short paragraphs. */}
          <span className="min-w-0">
            <span className="block font-display text-[40px] leading-[1.05] font-bold tabular-nums text-white">
              {fmt(s.value)}
            </span>
            <span className="mt-1.5 block text-small font-semibold text-white">{s.title}</span>
          </span>
          <ChevronRight size={15} strokeWidth={2.25} className="mt-1 shrink-0 text-white/50" aria-hidden />
        </button>
      ))}
    </div>
  )
}

/* ── the tab ─────────────────────────────────────────────────────────────── */

type Span = '1y' | '2y' | '3y' | 'all'

export function SpeciesHospitalTab({
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

  const model = useMemo(() => hospitalModel(name, siteKey), [name, siteKey])
  const [span, setSpan] = useState<Span>('1y')

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
      eyebrow: eyebrow ?? `${fmt(rows.length)} admissions · ${name}`,
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
                  value={r.severity && r.severity !== 'Not recorded' ? r.severity : ''}
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

  if (!model) {
    return (
      <TabBody>
        <Band title="No hospital records" icon={Building2}>
          <p className="text-small" style={{ color: MUTED }}>
            No admissions are recorded for this species.
          </p>
        </Band>
      </TabBody>
    )
  }

  /* ── derived-for-render slices ─────────────────────────────────────────── */

  const monthsBack = { '1y': 12, '2y': 24, '3y': 36, all: model.monthly.length }[span]
  const points: Pt[] = model.monthly.slice(-monthsBack)
  /* Floored to a decimal when anything died — 3 deaths in 3,511 cases rounds to 100%, and a
     ring reading "100% recovered" beside "Died · 3" contradicts itself. */
  const recRaw = model.completed ? (model.recovered / model.completed) * 100 : 0
  const recPct = model.diedCases > 0 && recRaw > 99 ? `${Math.floor(recRaw * 10) / 10}%` : `${Math.round(recRaw)}%`
  const s = model.surgery
  const hospCompPct = s.inHospital ? Math.round((s.compHospital / s.inHospital) * 100) : 0
  const fieldCompPct = s.field ? Math.round((s.compField / s.field) * 100) : 0
  /* Progressively stronger emphasis as the stay lengthens — greens into amber into the
     semantic tones, all the palette's own. */
  const stayFills = [mix(ACCENT, 0.45), ACCENT, MD3.moderateSecondary, MD3.tertiary, MD3.error]
  const twoCol = 'grid items-start gap-4 @[860px]:grid-cols-2'

  const hospColumns: HCol<HospitalRow>[] = [
    {
      key: 'name',
      head: 'Hospital',
      sticky: 0,
      strong: true,
      cell: (h) => (
        <span className="min-w-0">
          <span className="block">{h.name}</span>
          <span className="block text-caption font-normal" style={{ color: FAINT }}>
            {h.code} · {fmt(h.beds)} beds
          </span>
        </span>
      ),
    },
    { key: 'adm', head: 'Admissions', align: 'right', cell: (h) => fmt(h.admissions) },
    {
      key: 'died',
      head: 'Died',
      align: 'right',
      width: '90px',
      cell: (h) =>
        h.died > 0 ? (
          <span
            className="inline-flex min-w-[28px] justify-center rounded-full px-2 py-0.5 text-caption font-semibold tabular-nums"
            style={{ backgroundColor: MD3.errorContainer, color: TONE.bad }}
          >
            {fmt(h.died)}
          </span>
        ) : (
          <span style={{ color: FAINT }}>{fmt(0)}</span>
        ),
    },
  ]

  return (
    <TabBody>
      {/* ── 1 · the insight strip — the page's three headline joins ───────── */}

      <InsightStrip
        items={[
          {
            value: model.repeat.length,
            title: 'Repeatedly Hospitalised',
            sub: `2+ admissions · worst ${fmt(model.repeatWorst)}×`,
            onOpen: () =>
              openAnimals('Repeatedly hospitalised', model.repeat, `${fmt(model.repeat.length)} animals keep coming back · ${name}`),
          },
          {
            value: model.died.length,
            title: 'Died in Care',
            sub: model.died.length
              ? `mortality rate ${model.mortalityPct.toFixed(1)}%`
              : 'no deaths within 90 days of an admission',
            onOpen: () => openAnimals('Died in care', model.died),
          },
          {
            value: model.longStay.length,
            title: 'Long Stay · Over 7 Days',
            sub: model.longStay.length ? `longest ${fmt(model.longestStay)} d and counting` : 'none under care past 7 days',
            onOpen: () => openAnimals('In care over 7 days', model.longStay),
          },
        ]}
      />

      {/* ── 2 · current operational state ─────────────────────────────────── */}

      <Stats
        items={[
          {
            label: 'In care now',
            value: fmt(model.inCare.length),
            sub: `of ${fmt(model.held)} animals`,
            tone: 'good',
            onOpen: () => openAnimals('In care now', model.inCare),
          },
          {
            label: 'Admissions',
            value: fmt(model.admissions),
            sub: `all time · ${place}`,
            onOpen: () => openCases('Admissions', model.admRows),
          },
          {
            label: 'Avg stay',
            value: `${model.avgStay.toFixed(1)} d`,
            sub: `median ${fmt(model.medianStay)} d · derived`,
          },
        ]}
      />

      {/* ── 3 · analytics — volume and outcome ────────────────────────────── */}

      <div className={twoCol}>
        <Band
          title="Admissions Trend"
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
          <AreaTrend points={points} unit="admissions" baseline="zero" height={148} />
        </Band>

        <Band
          title="Outcomes"
          note={`How the ${fmt(model.completed)} completed cases ended · all time`}
          icon={HeartPulse}
        >
          <SplitRing
            size={158}
            center={{ value: recPct, label: 'recovered' }}
            unit="cases"
            items={[
              {
                key: 'recovered',
                label: 'Recovered',
                value: model.recovered,
                color: ACCENT,
                onPick: () => openCases('Recovered cases', model.recoveredRows),
              },
              {
                key: 'died',
                label: 'Died in care',
                value: model.diedCases,
                color: MD3.error,
                onPick: () => openAnimals('Died in care', model.died),
              },
            ]}
          />
        </Band>
      </div>

      {/* ── 4 · facility and stay ─────────────────────────────────────────── */}

      <div className={twoCol}>
        <Band title="Admissions by Hospital" aside={`${fmt(model.hospitals.length)} facilities`} icon={Building2}>
          <HousingTable
            rows={model.hospitals}
            columns={hospColumns}
            keyOf={(h) => h.id}
            minWidth={420}
            onOpen={(h) => drillTo({ kind: 'hospital', id: h.id }, { module: 'medical', label: name })}
          />
        </Band>

        <Band title="Length of Stay" aside={`${fmt(model.staysCompleted)} completed stays`} icon={Clock3}>
          <p className="mb-4 flex flex-wrap items-baseline gap-x-2">
            <span
              className="font-display text-[28px] leading-none font-bold tabular-nums"
              style={{ color: model.past14Pct >= 50 ? TONE.warn : VALUE }}
            >
              {model.past14Pct}%
            </span>
            <span className="text-small" style={{ color: MUTED }}>
              of completed stays run past 14 days
            </span>
          </p>
          <CoverageMeter
            segments={model.stayBuckets.map((b, i) => ({ label: b.label, value: b.value, fill: stayFills[i] }))}
            total={model.staysCompleted}
          />
        </Band>
      </div>

      {/* ── 5 · clinical workload ─────────────────────────────────────────── */}

      <Band title="Surgery" aside={`derived workload · ${place}`} icon={Scissors}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-[28px] leading-none font-bold tabular-nums" style={{ color: VALUE }}>
            {fmt(s.total)}
          </span>
          <span className="text-small" style={{ color: MUTED }}>
            surgical cases across {fmt(model.admissions)} admissions
          </span>
        </div>
        {s.total > 0 && (
          <div className="mt-4">
            <CoverageMeter
              segments={[
                { label: 'In hospital', value: s.inHospital, fill: DEEP },
                { label: 'Field', value: s.field, fill: ACCENT },
              ]}
              total={s.total}
            />
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className="flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-caption"
            style={{ backgroundColor: TRACK, color: MD3.onSurfaceVariant }}
          >
            Complications — hospital
            <b className="font-semibold tabular-nums" style={{ color: VALUE }}>
              {fmt(s.compHospital)} of {fmt(s.inHospital)} · {hospCompPct}%
            </b>
          </span>
          <span
            className="flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-caption"
            style={{ backgroundColor: fieldCompPct > hospCompPct ? MD3.notes : TRACK, color: MD3.onSurfaceVariant }}
          >
            Complications — field
            <b className="font-semibold tabular-nums" style={{ color: fieldCompPct > hospCompPct ? TONE.warn : VALUE }}>
              {fmt(s.compField)} of {fmt(s.field)} · {fieldCompPct}%
            </b>
          </span>
        </div>
      </Band>
    </TabBody>
  )
}
