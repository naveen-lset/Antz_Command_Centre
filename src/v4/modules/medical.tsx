/**
 * MEDICAL & HOSPITALS — hospital-based.
 *
 * TWO CLOCKS, AND THE PAGE NEVER MIXES THEM. A medical case is an EVENT — it opened on a
 * day, and how many opened is a question about a window. Being in hospital is a STATUS —
 * an animal admitted three weeks ago is in a bed tonight whatever dates the reader picked.
 * So every activity card carries the window in its aside and every status card says "now",
 * and changing the date filter moves the first kind and not the second. A page that let
 * the date range empty the ward would be telling a director the animals had gone home.
 *
 * EVERYTHING IS ONE STREAM. `admissions` in `core/metrics.ts` is already hospital- and
 * ward-attributed with a presenting complaint on every event — that is a medical case. So
 * cases, in-patients, discharges, length of stay, recovery, hospital deaths, surgeries and
 * active medications are all that one stream read differently, and they cannot contradict
 * each other because there is nothing for them to contradict. See `medicalData.ts`.
 *
 * WHAT IS NOT HERE. No medicine stock, cost or reorder level — that is Pharmacy. No cause
 * of death analysis — that is Mortality; this page carries only the deaths that happened
 * in care, because a hospital's own mortality is a hospital fact. No recommendation, no
 * "needs attention", no forecast.
 *
 * THE HOSPITAL FILTER IS THIS PAGE'S OWN. The global scope is site and window, as it is
 * everywhere; a hospital is a level below a site and only this module has one, so it is a
 * contextual filter here rather than a fourth thing in the global header.
 */

import { useMemo, useState } from 'react'
import {
  Activity,
  BedDouble,
  Building2,
  ClipboardList,
  Dna,
  HeartPulse,
  Hourglass,
  Pill,
  Scissors,
  Search,
  Stethoscope,
  TriangleAlert,
} from 'lucide-react'
import { TODAY, shortDate } from '../../core/calendar'
import { decodeAnimalId } from '../../core/animals'
import { figure } from '../../core/query'
import { siteKeyOf } from '../../core/scope'
import { HOSPITALS, hospitalOf } from '../../core/world'
import {
  ACCENT_INK,
  AccentProvider,
  Bars,
  FAINT,
  Figure,
  HERO_INK,
  Rule,
  Section,
  Snapshot,
  Stack,
  TONE,
  fmt,
  mix,
} from '../../exec/system'
import { MoreRows, usePaged } from '../perf'
import { FindField } from '../filters'
import { useScope } from '../scope'
import { useSheet } from '../sheet'
import { DrillList, DrillRow } from './kit'
import { ScheduleGrid, SortableList, gridCells, type Column } from './preventiveMarks'
import {
  MEDICAL_ACCENT,
  OUTCOME_TONE,
  SEVERITY_TONE,
  byComplaintSlice,
  bySeveritySlice,
  casesBetween,
  casesIn,
  daysIn,
  dischargedIn,
  medicationSlices,
  openCases,
  hospitalLines,
  scopeLine,
  speciesLines,
  summarise,
  type HospitalLine,
  type MedCase,
  type SpeciesLine,
} from './medicalData'
import {
  AnimalMedicalSheet,
  CaseListSheet,
  CaseSheet,
  HospitalSheet,
  PeriodSheet,
  RecoverySheet,
} from './medicalSheets'

/* ── the page ────────────────────────────────────────────────────────────── */

export default function Medical() {
  /* The page's own filter. The window and the site stay in the global scope, so this page
     cannot hold a second opinion about either. */
  const [hospital, setHospital] = useState<string | undefined>(undefined)

  return (
    <AccentProvider value={MEDICAL_ACCENT}>
      <MedicalHero hospitalId={hospital} />
      <Stack>
        <Toolbar hospitalId={hospital} onHospital={setHospital} />
        <CaseTrend hospitalId={hospital} />
        <ActiveCases hospitalId={hospital} />
        <HospitalTable onOpenHospital={setHospital} />
        <Hospitalisation hospitalId={hospital} />
        <StayComparison hospitalId={hospital} />
        <Recovery hospitalId={hospital} />
        <Surgeries hospitalId={hospital} />
        <HospitalMortality hospitalId={hospital} />
        <ActiveMedications hospitalId={hospital} />
        <SpeciesWorkload hospitalId={hospital} />
        <CaseRecords hospitalId={hospital} />
      </Stack>
    </AccentProvider>
  )
}

/**
 * A section that keeps the whole column past the two-column break.
 *
 * `Stack` splits at 760px of column and a container query inside a section still measures
 * the column, so a table told to appear at 720 would appear inside a 455px half. The
 * data-dense sections say so; the compact ones stay half-width, where they read better
 * paired than stretched.
 */
const Wide = ({ children }: { children: React.ReactNode }) => (
  <div className="min-w-0 @[760px]:col-span-2">{children}</div>
)

/* ── 1 · hero ────────────────────────────────────────────────────────────── */

/**
 * Three figures large, five small, one card.
 *
 * NOT EIGHT KPI CARDS. Eight cards of equal weight say these are eight equally important
 * numbers, and they are not: a director opens this page to learn how many animals are sick
 * and how many are in a bed. Those two and the case count lead; the other five sit under a
 * rule, where they are read second because they are read second.
 *
 * The status figures and the activity figures are separated by that rule too, and captioned
 * differently — "now" against the window — because they answer on different clocks.
 */
function MedicalHero({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const s = useMemo(() => summarise(scope, hospitalId), [scope, hospitalId])

  /* Animals under care is the CASELOAD metric, not the case model: it counts every animal
     under treatment including the out-patients a hospital never admits. Stated at the site
     grain it has, and suppressed under a hospital filter rather than silently widened. */
  const underCare = Math.round(figure(scope, 'health').value)

  return (
    <div className="w-full px-[var(--gutter-lg)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-end justify-between gap-4">
          <span>
            <Figure value={fmt(s.cases)} size={52} color={HERO_INK} />
            <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
              <Stethoscope size={15} strokeWidth={1.75} style={{ color: MEDICAL_ACCENT }} aria-hidden />
              Medical cases · {scope.win.label.toLowerCase()}
            </p>
          </span>
          <span className="shrink-0 pb-1 text-right text-[11px] leading-[15px]" style={{ color: FAINT }}>
            {scopeLine(scope, hospitalId)}
            <br />
            {hospitalId ? '1 hospital' : `${HOSPITALS.length} hospitals`} · {s.discharges} discharged
          </span>
        </div>

        <div className="mt-5 flex items-stretch border-t border-[#f0efec] pt-4">
          <span className="min-w-0 flex-1 pr-4">
            <Figure value={hospitalId ? '—' : fmt(underCare)} size={26} />
            {/* Wraps rather than truncates. The caption is the clock the figure is read on —
                "Animals sick · no…" has thrown away the only word that was doing work. */}
            <span className="mt-0.5 block text-[12px] leading-[15px] text-[#6d6860]">
              {hospitalId ? 'Sick · site level' : 'Animals sick · now'}
            </span>
          </span>
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure value={fmt(s.inHospital)} size={26} color={TONE.warn} />
            <span className="mt-0.5 block text-[12px] leading-[15px]" style={{ color: TONE.warn }}>
              In hospital · now
            </span>
          </span>
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure value={fmt(s.medications)} size={26} />
            <span className="mt-0.5 block text-[12px] leading-[15px] text-[#6d6860]">Medications · now</span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#f0efec] pt-4 @[520px]:grid-cols-4">
          {[
            { label: 'Surgeries', value: fmt(s.surgeries) },
            { label: 'Died in care', value: fmt(s.deaths), tone: s.deaths ? TONE.bad : undefined },
            {
              label: 'Recovery rate',
              value: s.recovery === undefined ? '—' : `${Math.round(s.recovery)}%`,
              tone: s.recovery === undefined ? undefined : '#1e7a44',
            },
            { label: 'Average stay', value: s.averageStay === undefined ? '—' : `${s.averageStay.toFixed(1)} d` },
          ].map((f) => (
            <span key={f.label} className="min-w-0">
              <span
                className="block font-display text-[19px] leading-none font-bold tabular-nums"
                style={{ color: f.tone ?? HERO_INK }}
              >
                {f.value}
              </span>
              <span className="mt-1 block truncate text-[11.5px]" style={{ color: FAINT }}>
                {f.label}
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ── 2 · the toolbar ─────────────────────────────────────────────────────── */

/** The hospital filter and search — what belongs to this page rather than to every page. */
function Toolbar({ hospitalId, onHospital }: { hospitalId?: string; onHospital: (id?: string) => void }) {
  const [query, setQuery] = useState('')

  return (
    <Section
      icon={Building2}
      label="Hospital"
      aside={hospitalId ? (hospitalOf(hospitalId)?.name ?? '') : 'All hospitals'}
    >
      <div className="flex flex-wrap gap-1.5">
        {[undefined, ...HOSPITALS.map((h) => h.id)].map((id) => {
          const on = hospitalId === id
          const h = id ? hospitalOf(id) : undefined
          return (
            <button
              key={id ?? 'all'}
              type="button"
              aria-pressed={on}
              onClick={() => onHospital(id)}
              className="card-press shrink-0 rounded-full px-3 py-[6px] text-[12px] font-medium whitespace-nowrap transition-colors"
              style={
                on
                  ? { backgroundColor: MEDICAL_ACCENT, color: '#ffffff' }
                  : { backgroundColor: mix(MEDICAL_ACCENT, 0.09), color: '#8a1430' }
              }
              title={h?.name}
            >
              {h ? h.code : 'All'}
              {h && <span className="ml-1.5 opacity-70">{h.beds}b</span>}
            </button>
          )
        })}
      </div>

      <Rule label="Find" />
      <FindField value={query} onChange={setQuery} placeholder="Animal ID, species, case ID, hospital, medicine" />
      <SearchResults query={query} hospitalId={hospitalId} onHospital={onHospital} />
    </Section>
  )
}

/**
 * What the search finds, while something is typed and not before.
 *
 * Bounded by construction: hospitals and medicines are short registries, species come from
 * the window's own cases, an animal id is decoded rather than searched, and a case id is
 * matched against the window's cases. Nothing here loads a population.
 */
function SearchResults({
  query,
  hospitalId,
  onHospital,
}: {
  query: string
  hospitalId?: string
  onHospital: (id?: string) => void
}) {
  const { scope } = useScope()
  const { open } = useSheet()
  const q = query.trim().toLowerCase()

  const hits = useMemo(() => {
    if (q.length < 2) return []
    const cases = casesIn(scope, hospitalId)
    const out: { key: string; label: string; sub: string; onOpen: () => void }[] = []

    const id = q.toUpperCase().startsWith('ANM-') ? q.toUpperCase() : `ANM-${q.toUpperCase()}`
    if (decodeAnimalId(id)) {
      out.push({
        key: id,
        label: id,
        sub: 'Animal',
        onOpen: () =>
          open({
            title: id,
            eyebrow: 'Animal',
            body: <AnimalMedicalSheet animalId={id} cases={casesBetween(siteKeyOf(scope), 0, TODAY).filter((c) => c.animalId === id)} />,
          }),
      })
    }

    for (const h of HOSPITALS) {
      if (!h.name.toLowerCase().includes(q) && !h.code.toLowerCase().includes(q)) continue
      out.push({
        key: h.id,
        label: h.name,
        sub: `Hospital · ${h.beds} beds`,
        onOpen: () => onHospital(h.id),
      })
    }

    for (const c of cases) {
      if (out.length >= 14) break
      if (!c.id.toLowerCase().includes(q)) continue
      out.push({
        key: c.id,
        label: c.id,
        sub: `Case · ${c.speciesName} · ${c.hospitalName}`,
        onOpen: () => open({ title: c.id, eyebrow: 'Medical case', body: <CaseSheet c={c} /> }),
      })
    }

    const seen = new Set<string>()
    for (const c of cases) {
      if (out.length >= 18 || seen.has(c.speciesName) || !c.speciesName.toLowerCase().includes(q)) continue
      seen.add(c.speciesName)
      const rows = cases.filter((x) => x.speciesName === c.speciesName)
      out.push({
        key: c.speciesId,
        label: c.speciesName,
        sub: `Species · ${rows.length} cases`,
        onOpen: () =>
          open({
            title: c.speciesName,
            eyebrow: 'Species',
            body: <CaseListSheet title={c.speciesName} cases={rows} label="Medical cases" />,
          }),
      })
    }

    for (const m of medicationSlices(siteKeyOf(scope), hospitalId)) {
      if (out.length >= 22 || !m.label.toLowerCase().includes(q)) continue
      out.push({
        key: m.id,
        label: m.label,
        sub: `Medicine · ${m.value} active`,
        onOpen: () =>
          open({
            title: m.label,
            eyebrow: 'Active medication',
            body: (
              <CaseListSheet
                title={m.label}
                cases={openCases(siteKeyOf(scope), hospitalId).filter((c) => c.medications.some((x) => x.id === m.id))}
                label={`Animals on ${m.label}`}
                note="Active today"
              />
            ),
          }),
      })
    }

    return out
  }, [q, scope, hospitalId, open, onHospital])

  if (q.length < 2) return null
  if (hits.length === 0) {
    return (
      <p className="mt-3 text-[12.5px]" style={{ color: FAINT }}>
        Nothing matches “{query.trim()}”.
      </p>
    )
  }

  return (
    <div className="mt-3">
      <DrillList>
        {hits.map((h) => (
          <DrillRow key={h.key} label={h.label} sub={h.sub} value="" lead={Search} onOpen={h.onOpen} />
        ))}
      </DrillList>
    </div>
  )
}

/* ── 3 · the case trend ──────────────────────────────────────────────────── */

/**
 * Cases opened over the window, as a schedule grid.
 *
 * The grid is the module's shared calendar mark, and it is the right one here for the same
 * reason it suits vaccination: an admission happens on a day, days cluster into bad weeks,
 * and "which week was the hospital busiest" is answered by looking rather than by tracing a
 * curve. Tap a square for the cases in it.
 */
function CaseTrend({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)

  const cells = useMemo(() => {
    const rows = casesBetween(site, scope.win.from, scope.win.to).filter(
      (c) => !hospitalId || c.hospitalId === hospitalId,
    )
    const byDay = new Map<number, number>()
    for (const c of rows) byDay.set(c.day, (byDay.get(c.day) ?? 0) + 1)
    return gridCells(scope.win, (from, to) => {
      let n = 0
      for (let d = from; d <= to; d++) n += byDay.get(d) ?? 0
      return n
    })
  }, [scope.win, site, hospitalId])

  const total = cells.cells.reduce((n, c) => n + c.value, 0)

  return (
    <Section icon={ClipboardList} label="Medical case trend" aside={`${fmt(total)} · ${scope.win.window}`}>
      <ScheduleGrid
        cells={cells.cells}
        grain={cells.grain}
        onOpen={(cell) =>
          open({
            title: `Cases · ${cell.label}`,
            eyebrow: scopeLine(scope, hospitalId),
            body: (
              <PeriodSheet
                label={cell.label}
                from={cell.from}
                to={cell.to}
                cases={casesBetween(site, cell.from, cell.to).filter((c) => !hospitalId || c.hospitalId === hospitalId)}
              />
            ),
          })
        }
      />
    </Section>
  )
}

/* ── 4 · active cases ────────────────────────────────────────────────────── */

/** The current workload, and the one card on the page where every figure is read today. */
function ActiveCases({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)

  const inHospital = useMemo(() => openCases(site, hospitalId), [site, hospitalId])
  const severity = useMemo(() => bySeveritySlice(inHospital), [inHospital])
  const underCare = Math.round(figure(scope, 'health').value)

  return (
    <Section icon={HeartPulse} label="Active medical workload" aside="now, not the window">
      <Snapshot
        cols={3}
        items={[
          /* Two different grains, and both are labelled. "Under care" is the clinical
             caseload metric and includes animals treated in their own enclosure; "in
             hospital" is the case model and counts beds. One is not a subset the page can
             compute from the other, so it never implies it is. */
          { label: 'Animals sick', value: hospitalId ? '—' : fmt(underCare), note: 'under care · site' },
          { label: 'In hospital', value: fmt(inHospital.length), note: 'admitted', tone: 'warn' },
          {
            label: 'Active medications',
            value: fmt(inHospital.reduce((n, c) => n + c.medications.length, 0)),
            note: 'courses',
          },
        ]}
      />
      <Rule label="Severity in hospital" />
      <DrillList>
        {severity.map((r) => (
          <DrillRow
            key={r.id}
            label={r.label}
            value={fmt(r.value)}
            unit={`${Math.round(r.percent)}%`}
            bar={r.percent}
            tone={SEVERITY_TONE[r.label as keyof typeof SEVERITY_TONE]}
            onOpen={() =>
              open({
                title: r.label,
                eyebrow: 'In hospital › Severity',
                body: (
                  <CaseListSheet
                    title={r.label}
                    cases={inHospital.filter((c) => c.severity === r.label)}
                    label={`${r.label} · in hospital`}
                    note="Read today"
                    tone={r.label === 'Critical' ? 'bad' : r.label === 'Serious' ? 'warn' : undefined}
                  />
                ),
              })
            }
          />
        ))}
      </DrillList>
    </Section>
  )
}

/* ── 5 · the hospital table ──────────────────────────────────────────────── */

const H_SORTS: Record<string, (r: HospitalLine) => number> = {
  cases: (r) => r.cases,
  inHospital: (r) => r.inHospital,
  medications: (r) => r.medications,
  surgeries: (r) => r.surgeries,
  deaths: (r) => r.deaths,
  recovery: (r) => r.recovery ?? -1,
  stay: (r) => r.averageStay ?? -1,
}

function HospitalTable({ onOpenHospital }: { onOpenHospital: (id: string) => void }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const [sortKey, setSortKey] = useState('cases')

  const rows = useMemo(() => {
    const by = H_SORTS[sortKey] ?? H_SORTS.cases
    return [...hospitalLines(scope)].sort((a, b) => by(b) - by(a))
  }, [scope, sortKey])

  const columns: Column<HospitalLine>[] = [
    { key: 'cases', head: 'Cases', cell: (r) => fmt(r.cases), sort: H_SORTS.cases },
    { key: 'inHospital', head: 'In hosp', cell: (r) => fmt(r.inHospital), sort: H_SORTS.inHospital, tone: () => 'warn' },
    { key: 'medications', head: 'Meds', cell: (r) => fmt(r.medications), sort: H_SORTS.medications },
    { key: 'surgeries', head: 'Surgery', cell: (r) => fmt(r.surgeries), sort: H_SORTS.surgeries },
    { key: 'deaths', head: 'Deaths', cell: (r) => fmt(r.deaths), sort: H_SORTS.deaths, tone: (r) => (r.deaths ? 'bad' : undefined) },
    {
      key: 'recovery',
      head: 'Recovery',
      cell: (r) => (r.recovery === undefined ? '—' : `${Math.round(r.recovery)}%`),
      sort: H_SORTS.recovery,
      tone: (r) => (r.recovery === undefined ? undefined : 'good'),
    },
    {
      key: 'stay',
      head: 'Avg stay',
      cell: (r) => (r.averageStay === undefined ? '—' : `${r.averageStay.toFixed(1)} d`),
      sort: H_SORTS.stay,
    },
  ]

  return (
    <Wide>
      <Section icon={Building2} label="Hospital-wise overview" aside={`${rows.length} · sortable`}>
        <SortableList
          rows={rows}
          columns={columns}
          sortKey={sortKey}
          onSort={setSortKey}
          name={(r) => r.hospital.name}
          sub={(r) => `${r.hospital.code} · ${r.hospital.beds} beds · ${Math.round(r.occupancy)}% occupied`}
          onOpen={(r) => {
            onOpenHospital(r.hospital.id)
            open({
              title: r.hospital.name,
              eyebrow: `Hospital · ${scope.win.window}`,
              body: <HospitalSheet hospitalId={r.hospital.id} />,
            })
          }}
        />
      </Section>
    </Wide>
  )
}

/* ── 6 · hospitalisation ─────────────────────────────────────────────────── */

/** Who is in a bed tonight, where, and how the beds are filling. */
function Hospitalisation({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)

  const inHospital = useMemo(() => openCases(site, hospitalId), [site, hospitalId])
  const admitted = useMemo(() => casesIn(scope, hospitalId), [scope, hospitalId])
  const discharged = useMemo(() => dischargedIn(scope, hospitalId), [scope, hospitalId])

  const rows = useMemo(
    () =>
      HOSPITALS.filter((h) => !hospitalId || h.id === hospitalId).map((h) => ({
        hospital: h,
        n: inHospital.filter((c) => c.hospitalId === h.id).length,
      })),
    [inHospital, hospitalId],
  )

  return (
    <Section icon={BedDouble} label="Hospitalisation" aside="in hospital · now">
      <div className="flex items-end gap-4">
        <span>
          <Figure value={fmt(inHospital.length)} size={44} color={TONE.warn} />
          <p className="mt-1 text-[13px]" style={{ color: TONE.warn }}>
            currently hospitalised
          </p>
        </span>
        <span className="flex-1 pb-1 text-right text-[11px]" style={{ color: FAINT }}>
          {admitted.length} admitted · {discharged.length} discharged
          <br />
          {scope.win.window}
        </span>
      </div>

      <Rule label="By hospital" />
      <DrillList>
        {rows.map((r) => (
          <DrillRow
            key={r.hospital.id}
            label={r.hospital.name}
            sub={`${r.hospital.code} · ${r.hospital.beds} beds · ${Math.round((r.n / r.hospital.beds) * 100)}% occupied`}
            value={fmt(r.n)}
            bar={(r.n / r.hospital.beds) * 100}
            tone={r.n / r.hospital.beds > 0.85 ? 'bad' : undefined}
            onOpen={() =>
              open({
                title: r.hospital.name,
                eyebrow: 'Hospitalisation › Hospital',
                body: (
                  <CaseListSheet
                    title={r.hospital.name}
                    cases={inHospital.filter((c) => c.hospitalId === r.hospital.id)}
                    label={`In hospital · ${r.hospital.name}`}
                    note={`${r.hospital.beds} beds · read today`}
                    tone="warn"
                  />
                ),
              })
            }
          />
        ))}
      </DrillList>
    </Section>
  )
}

/* ── 7 · average stay ────────────────────────────────────────────────────── */

/**
 * Average days in hospital, per hospital, against the collection's own mean.
 *
 * Read from the cases that CLOSED in the window — a case still open has no length of stay
 * yet, and averaging the days-so-far of open cases with the full stays of closed ones would
 * pull the figure down every time a ward filled. Hospitals with nothing discharged in the
 * window state a dash rather than a zero.
 */
function StayComparison({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()

  const overall = useMemo(() => summarise(scope, hospitalId), [scope, hospitalId])
  const rows = useMemo(
    () =>
      HOSPITALS.map((h) => ({ hospital: h, ...summarise(scope, h.id) }))
        .filter((r) => r.discharges > 0)
        .sort((a, b) => (b.averageStay ?? 0) - (a.averageStay ?? 0)),
    [scope],
  )
  const longest = Math.max(...rows.map((r) => r.averageStay ?? 0), 1)

  return (
    <Section icon={Hourglass} label="Average days in hospital" aside={scope.win.window}>
      <div className="flex items-end gap-4">
        <span>
          <Figure
            value={overall.averageStay === undefined ? '—' : overall.averageStay.toFixed(1)}
            unit={overall.averageStay === undefined ? undefined : 'd'}
            size={44}
            color={HERO_INK}
          />
          <p className="mt-1 text-[13px] text-[#3d3a34]">
            {hospitalId ? (hospitalOf(hospitalId)?.name ?? '') : 'across all hospitals'}
          </p>
        </span>
        <span className="flex-1 pb-1 text-right text-[11px]" style={{ color: FAINT }}>
          over {overall.discharges} discharged
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-[12.5px]" style={{ color: FAINT }}>
          Nothing discharged in {scope.win.window}.
        </p>
      ) : (
        <>
          <Rule label="By hospital" />
          <DrillList>
            {rows.map((r) => (
              <DrillRow
                key={r.hospital.id}
                label={r.hospital.name}
                sub={`${r.discharges} discharged`}
                value={(r.averageStay ?? 0).toFixed(1)}
                unit="d"
                bar={((r.averageStay ?? 0) / longest) * 100}
                onOpen={() =>
                  open({
                    title: r.hospital.name,
                    eyebrow: 'Average stay › Hospital',
                    body: (
                      <CaseListSheet
                        title={r.hospital.name}
                        cases={dischargedIn(scope, r.hospital.id)}
                        label={`Discharged · ${(r.averageStay ?? 0).toFixed(1)} d average`}
                        note={`${r.hospital.name} · ${scope.win.window}`}
                      />
                    ),
                  })
                }
              />
            ))}
          </DrillList>
        </>
      )}
    </Section>
  )
}

/* ── 8 · recovery ────────────────────────────────────────────────────────── */

/** Recovered ÷ discharged, per hospital. The outcomes are the data; there is no formula. */
function Recovery({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()

  const closed = useMemo(() => dischargedIn(scope, hospitalId), [scope, hospitalId])
  const overall = closed.length
    ? (closed.filter((c) => c.outcome === 'Recovered').length / closed.length) * 100
    : undefined

  const rows = useMemo(
    () =>
      HOSPITALS.map((h) => {
        const rows = dischargedIn(scope, h.id)
        return {
          hospital: h,
          n: rows.length,
          rate: rows.length ? (rows.filter((c) => c.outcome === 'Recovered').length / rows.length) * 100 : undefined,
        }
      })
        .filter((r) => r.n > 0)
        .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)),
    [scope],
  )

  return (
    <Section icon={Activity} label="Recovery rate" aside={`${closed.length} discharged · ${scope.win.window}`}>
      <div className="flex items-end gap-4">
        <span>
          <Figure
            value={overall === undefined ? '—' : String(Math.round(overall))}
            unit={overall === undefined ? undefined : '%'}
            size={44}
            color={overall === undefined ? HERO_INK : '#1e7a44'}
          />
          <p className="mt-1 text-[13px] text-[#3d3a34]">discharged recovered</p>
        </span>
        <span className="flex-1 pb-1 text-right text-[11px]" style={{ color: FAINT }}>
          {closed.filter((c) => c.outcome === 'Recovered').length} of {closed.length}
        </span>
      </div>

      {rows.length > 0 && (
        <>
          <Rule label="By hospital" />
          {/* Bars against 100, not against the best hospital: a recovery rate is measured
              against everyone recovering, and scaling to the leader would make 84% look
              like a failure next to 94%. */}
          <Bars
            items={rows.map((r) => ({
              label: r.hospital.name,
              value: Math.round(r.rate ?? 0),
              sub: `${r.n} discharged`,
            }))}
            unit="%"
          />
          <Rule label="Outcomes" />
          <DrillList>
            {rows.map((r) => (
              <DrillRow
                key={r.hospital.id}
                label={r.hospital.name}
                value={`${Math.round(r.rate ?? 0)}%`}
                onOpen={() =>
                  open({
                    title: r.hospital.name,
                    eyebrow: 'Recovery › Hospital',
                    body: <RecoverySheet cases={dischargedIn(scope, r.hospital.id)} title={r.hospital.name} />,
                  })
                }
              />
            ))}
          </DrillList>
        </>
      )}
    </Section>
  )
}

/* ── 9 · surgeries ───────────────────────────────────────────────────────── */

/** Compact by design — the brief's "do not turn this into a surgical dashboard". */
function Surgeries({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()

  const rows = useMemo(() => casesIn(scope, hospitalId).filter((c) => c.surgery), [scope, hospitalId])
  const procedures = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of rows) m.set(c.surgery!.procedure, (m.get(c.surgery!.procedure) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  return (
    <Section icon={Scissors} label="Surgeries" aside={scope.win.window}>
      <div className="flex items-end gap-4">
        <span>
          <Figure value={fmt(rows.length)} size={40} color={HERO_INK} />
          <p className="mt-1 text-[13px] text-[#3d3a34]">procedures performed</p>
        </span>
        <span className="flex-1 pb-1 text-right text-[11px]" style={{ color: FAINT }}>
          {new Set(rows.map((c) => c.hospitalName)).size} hospitals · {new Set(rows.map((c) => c.speciesName)).size}{' '}
          species
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-[12.5px]" style={{ color: FAINT }}>
          No procedures in {scope.win.window}.
        </p>
      ) : (
        <>
          <Rule label="Procedures" />
          <DrillList>
            {procedures.map(([name, n]) => (
              <DrillRow
                key={name}
                label={name}
                value={fmt(n)}
                bar={(n / procedures[0][1]) * 100}
                onOpen={() =>
                  open({
                    title: name,
                    eyebrow: 'Surgery › Procedure',
                    body: (
                      <CaseListSheet
                        title={name}
                        cases={rows.filter((c) => c.surgery?.procedure === name)}
                        label={`${name} · procedures`}
                      />
                    ),
                  })
                }
              />
            ))}
          </DrillList>
        </>
      )}
    </Section>
  )
}

/* ── 10 · hospital mortality ─────────────────────────────────────────────── */

/**
 * Deaths in care — and only those.
 *
 * This is not the Mortality module and does not try to be: no cause analysis, no species
 * ranking beyond the hospital context, no trend. It is the `Died in care` outcome of the
 * discharge stream, which is the only mortality a hospital owns.
 */
function HospitalMortality({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()

  const closed = useMemo(() => dischargedIn(scope, hospitalId), [scope, hospitalId])
  const deaths = useMemo(() => closed.filter((c) => c.outcome === 'Died in care'), [closed])
  const rate = closed.length ? (deaths.length / closed.length) * 100 : undefined

  const byHospital = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of deaths) m.set(c.hospitalName, (m.get(c.hospitalName) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [deaths])

  return (
    <Section icon={TriangleAlert} label="Hospital mortality" aside={`${scope.win.window} · in care only`}>
      <Snapshot
        cols={3}
        items={[
          { label: 'Died in care', value: fmt(deaths.length), tone: deaths.length ? 'bad' : 'neutral' },
          { label: 'Of discharges', value: rate === undefined ? '—' : `${rate.toFixed(1)}`, unit: rate === undefined ? undefined : '%' },
          { label: 'Species affected', value: String(new Set(deaths.map((c) => c.speciesName)).size) },
        ]}
      />
      {deaths.length > 0 && (
        <>
          <Rule label="By hospital" />
          <DrillList>
            {byHospital.map(([name, n]) => (
              <DrillRow
                key={name}
                label={name}
                value={fmt(n)}
                tone="bad"
                bar={(n / byHospital[0][1]) * 100}
                onOpen={() =>
                  open({
                    title: name,
                    eyebrow: 'Hospital mortality › Hospital',
                    body: (
                      <CaseListSheet
                        title={name}
                        cases={deaths.filter((c) => c.hospitalName === name)}
                        label="Died in care"
                        tone="bad"
                        note={`${name} · ${scope.win.window}`}
                      />
                    ),
                  })
                }
              />
            ))}
          </DrillList>
        </>
      )}
    </Section>
  )
}

/* ── 11 · active medications ─────────────────────────────────────────────── */

/** Courses running on the animals in hospital right now — not stock, not requests. */
function ActiveMedications({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)

  const slices = useMemo(() => medicationSlices(site, hospitalId), [site, hospitalId])
  const total = slices.reduce((n, s) => n + s.value, 0)
  const inHospital = useMemo(() => openCases(site, hospitalId), [site, hospitalId])

  return (
    <Section icon={Pill} label="Active medications" aside="now, not the window">
      <div className="flex items-end gap-4">
        <span>
          <Figure value={fmt(total)} size={40} color={HERO_INK} />
          <p className="mt-1 text-[13px] text-[#3d3a34]">courses running</p>
        </span>
        <span className="flex-1 pb-1 text-right text-[11px]" style={{ color: FAINT }}>
          {inHospital.filter((c) => c.medications.length > 0).length} animals · {slices.length} medicines
        </span>
      </div>
      <Rule label="By medicine" />
      <DrillList>
        {slices.slice(0, 10).map((m) => (
          <DrillRow
            key={m.id}
            label={m.label}
            sub={m.sub}
            value={fmt(m.value)}
            bar={m.percent}
            onOpen={() =>
              open({
                title: m.label,
                eyebrow: 'Active medication › Medicine',
                body: (
                  <CaseListSheet
                    title={m.label}
                    cases={inHospital.filter((c) => c.medications.some((x) => x.id === m.id))}
                    label={`Animals on ${m.label}`}
                    note="Active today"
                  />
                ),
              })
            }
          />
        ))}
      </DrillList>
    </Section>
  )
}

/* ── 12 · species workload ───────────────────────────────────────────────── */

const S_SORTS: Record<string, (r: SpeciesLine) => number> = {
  cases: (r) => r.cases,
  inHospital: (r) => r.inHospital,
  surgeries: (r) => r.surgeries,
  deaths: (r) => r.deaths,
}

function SpeciesWorkload({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('cases')

  const all = useMemo(() => speciesLines(scope, hospitalId), [scope, hospitalId])
  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    const by = S_SORTS[sortKey] ?? S_SORTS.cases
    const rows = q ? all.filter((r) => r.name.toLowerCase().includes(q) || r.siteName.toLowerCase().includes(q)) : all
    return [...rows].sort((a, b) => by(b) - by(a))
  }, [all, q, sortKey])

  const page = usePaged<SpeciesLine>(
    (offset, limit) => ({ rows: filtered.slice(offset, offset + limit), total: filtered.length }),
    20,
    [filtered.length, q, sortKey, hospitalId],
  )

  const columns: Column<SpeciesLine>[] = [
    { key: 'cases', head: 'Cases', cell: (r) => fmt(r.cases), sort: S_SORTS.cases },
    { key: 'inHospital', head: 'In hosp', cell: (r) => fmt(r.inHospital), sort: S_SORTS.inHospital, tone: () => 'warn' },
    { key: 'surgeries', head: 'Surgery', cell: (r) => fmt(r.surgeries), sort: S_SORTS.surgeries },
    { key: 'deaths', head: 'Deaths', cell: (r) => fmt(r.deaths), sort: S_SORTS.deaths, tone: (r) => (r.deaths ? 'bad' : undefined) },
    { key: 'medications', head: 'Meds', cell: (r) => fmt(r.medications), compact: false },
  ]

  return (
    <Wide>
      <Section icon={Dna} label="Species-wise medical workload" aside={`${all.length} species`}>
        <FindField value={query} onChange={setQuery} placeholder="Find a species" />
        <div className="mt-3">
          <SortableList
            rows={page.rows}
            columns={columns}
            sortKey={sortKey}
            onSort={setSortKey}
            name={(r) => r.name}
            sub={(r) => r.siteName}
            onOpen={(r) =>
              open({
                title: r.name,
                eyebrow: 'Species › Medical',
                body: (
                  <CaseListSheet
                    title={r.name}
                    cases={casesIn(scope, hospitalId).filter((c) => c.speciesName === r.name)}
                    label="Medical cases"
                    note={`${r.name} · ${scope.win.window}`}
                  />
                ),
              })
            }
            empty={
              <p className="text-[12.5px]" style={{ color: FAINT }}>
                No species matches “{query.trim()}”.
              </p>
            }
          />
          <MoreRows page={page} noun="species" />
        </div>
      </Section>
    </Wide>
  )
}

/* ── 13 · the records ────────────────────────────────────────────────────── */

/** The case list itself, paged — the bottom of the page and the top of the drill. */
function CaseRecords({ hospitalId }: { hospitalId?: string }) {
  const { scope } = useScope()
  const { open } = useSheet()

  const rows = useMemo(() => casesIn(scope, hospitalId), [scope, hospitalId])
  const complaints = useMemo(() => byComplaintSlice(rows), [rows])
  const page = usePaged<MedCase>(
    (offset, limit) => ({ rows: rows.slice(offset, offset + limit), total: rows.length }),
    15,
    [rows.length, hospitalId, scope.win.key, scope.win.from],
  )

  return (
    <Wide>
      <Section icon={ClipboardList} label="Medical cases" aside={`${fmt(rows.length)} · ${scope.win.window}`}>
        {complaints.length > 0 && (
          <>
            <Bars
              items={complaints.map((c) => ({ label: c.label, value: c.value }))}
              unit="cases"
              showShare
            />
            <Rule label="Records" />
          </>
        )}
        <DrillList>
          {page.rows.map((c) => (
            <DrillRow
              key={c.id}
              label={`${c.speciesName} · ${c.complaint}`}
              sub={`${c.id} · ${c.animalId} · ${c.hospitalName} · ${shortDate(c.day)}`}
              value={c.open ? `${daysIn(c)} d` : (c.outcome ?? '—')}
              tone={c.open ? SEVERITY_TONE[c.severity] : OUTCOME_TONE[c.outcome ?? 'Recovered']}
              onOpen={() => open({ title: c.id, eyebrow: 'Medical case', body: <CaseSheet c={c} /> })}
            />
          ))}
        </DrillList>
        <MoreRows page={page} noun="cases" />
        <p className="pt-3 text-[11px]" style={{ color: ACCENT_INK }}>
          Cases opened in {scope.win.window} · an open case keeps its bed whatever the window says
        </p>
      </Section>
    </Wide>
  )
}
