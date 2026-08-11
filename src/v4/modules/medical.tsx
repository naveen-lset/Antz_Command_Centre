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
  ClipboardList,
  Dna,
  Search,
  Stethoscope,
} from 'lucide-react'
import { TODAY, shortDate } from '../../core/calendar'
import { decodeAnimalId } from '../../core/animals'
import { siteKeyOf } from '../../core/scope'
import {
  ACCENT_INK,
  AccentProvider,
  FAINT,
  Figure,
  HERO_INK,
  Rule,
  Section,
  Stack,
  TONE,
  fmt,
} from '../../exec/system'
import { RankList } from '../../exec/marks'
import { RangeTabs, useChartRange } from '../../exec/range'
import { MoreRows, usePaged } from '../perf'
import { FindField } from '../filters'
import { useScope } from '../scope'
import { useSheet } from '../sheet'
import { DrillList, DrillRow } from './kit'
import { ScheduleGrid, SortableList, gridCells, type Column } from './preventiveMarks'
import {
  MEDICAL_ACCENT,
  SEVERITY_TONE,
  byComplaintSlice,
  bySeveritySlice,
  casesBetween,
  casesIn,
  scopeLine,
  speciesLines,
  summarise,
  type MedCase,
  type SpeciesLine,
} from './medicalData'
import {
  AnimalMedicalSheet,
  CaseListSheet,
  CaseSheet,
  PeriodSheet,
} from './medicalSheets'

/* ── the page ────────────────────────────────────────────────────────────── */

export default function Medical() {
  return (
    <AccentProvider value={MEDICAL_ACCENT}>
      <MedicalHero />
      <Stack>
        <Toolbar />
        <CaseTrend />
        <SeverityBreakdown />
        <SpeciesWorkload />
        <CaseRecords />
      </Stack>
    </AccentProvider>
  )
}

/*
 * SEVEN SECTIONS CAME OFF THIS PAGE, and the hospital filter with them.
 *
 * Hospital-wise overview, Hospitalisation, Average days in hospital, Recovery rate, Surgeries,
 * Hospital mortality and Active medications were all readings of a lifecycle model that had no
 * source: `species_mgmt_anon` has no admission, no discharge, no bed, no ward, no procedure and
 * no outcome. The module's own information architecture was "caseload, then the building", and
 * the building is not in the data.
 *
 * What is left is the caseload, which is real and rich: 32,311 consultations, 191 presenting
 * signs, a recorded severity on each complaint, and the animals carrying a live prescription
 * now. `SeverityBreakdown` is new — it draws the severity facet the source has always had and
 * the page never showed, because the old model was busy drawing a severity it had invented.
 */

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
 * Two figures large, three small, one card.
 *
 * It carried eight, and five of them — in hospital, medications now, surgeries, died in care,
 * recovery rate, average stay — were readings of a lifecycle this schema does not record. What
 * is left is what the consultation record actually says: how many cases, how many animals are
 * under treatment right now, and the shape of the caseload.
 *
 * The status figure and the activity figures are still separated by a rule and captioned
 * differently — "now" against the window — because they answer on different clocks.
 */
function MedicalHero() {
  const { scope } = useScope()
  const s = useMemo(() => summarise(scope), [scope])

  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-end justify-between gap-4">
          <span>
            <Figure value={fmt(s.cases)} size={48} color={HERO_INK} />
            <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
              <Stethoscope size={15} strokeWidth={1.75} style={{ color: MEDICAL_ACCENT }} aria-hidden />
              Medical cases · {scope.win.label.toLowerCase()}
            </p>
          </span>
          <span className="shrink-0 pb-1 text-right text-caption" style={{ color: FAINT }}>
            {scopeLine(scope)}
            <br />
            {fmt(s.sites)} sites · {fmt(s.species)} species
          </span>
        </div>
        <div className="mt-5 flex items-stretch border-t border-[#f0efec] pt-4">
          <span className="min-w-0 flex-1 pr-4">
            <Figure value={fmt(s.underCare)} size={28} />
            <span className="mt-0.5 block text-caption text-[#6d6860]">Under treatment · now</span>
          </span>
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure value={fmt(s.severe)} size={28} color={s.severe ? TONE.bad : undefined} />
            <span className="mt-0.5 block text-caption" style={{ color: s.severe ? TONE.bad : '#6d6860' }}>
              High or extreme
            </span>
          </span>
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure value={fmt(s.complaints)} size={28} />
            <span className="mt-0.5 block text-caption text-[#6d6860]">Presenting signs</span>
          </span>
        </div>
      </section>
    </div>
  )
}

/* ── 2 · toolbar ─────────────────────────────────────────────────────────── */

/**
 * Search only.
 *
 * The hospital chips are gone with the hospitals. Nothing in `species_mgmt_anon` attributes a
 * consultation to a building, so the filter had four buttons that could only ever have
 * filtered on an invented field.
 */
function Toolbar() {
  const [query, setQuery] = useState('')

  return (
    <Section icon={Stethoscope} label="Find" aside="cases in the window">
      <FindField value={query} onChange={setQuery} placeholder="Animal ID, species, site, presenting sign" />
      <SearchResults query={query} />
    </Section>
  )
}

/* ── 3 · severity ────────────────────────────────────────────────────────── */

/**
 * How severe the recorded complaints were.
 *
 * NEW, AND ONLY BECAUSE THE OLD MODEL WAS IN THE WAY. `complaints.severity` has always been in
 * the source — Mild 6,908, Moderate 1,233, High 478, Extreme 128 — and the page never drew it,
 * because `medicalData.ts` was assigning its own four-tier severity from a seeded draw and that
 * is what every section read. With the draw gone, the real column has somewhere to go.
 *
 * "Not recorded" is a bar like any other: 73% of consultations carry no complaint row at all,
 * and hiding that would make the four severities look like the whole caseload.
 */
function SeverityBreakdown() {
  const { scope } = useScope()
  const rows = useMemo(() => casesIn(scope), [scope])
  const slices = useMemo(() => bySeveritySlice(rows), [rows])

  return (
    <Section icon={Stethoscope} label="Complaint severity" aside={scope.win.window}>
      <DrillList>
        {slices.map((x) => (
          <DrillRow
            key={x.id}
            label={x.label}
            sub={`${Math.round(x.percent)}% of cases`}
            value={fmt(x.value)}
            tone={SEVERITY_TONE[x.id as keyof typeof SEVERITY_TONE]}
          />
        ))}
      </DrillList>
    </Section>
  )
}

/* ── 2 · the toolbar ─────────────────────────────────────────────────────── */

/** The hospital filter and search — what belongs to this page rather than to every page. */
/**
 * What the search finds, while something is typed and not before.
 *
 * Bounded by construction: hospitals and medicines are short registries, species come from
 * the window's own cases, an animal id is decoded rather than searched, and a case id is
 * matched against the window's cases. Nothing here loads a population.
 */
function SearchResults({ query }: { query: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const q = query.trim().toLowerCase()

  const hits = useMemo(() => {
    if (q.length < 2) return []
    const cases = casesIn(scope)
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

    for (const c of cases) {
      if (out.length >= 14) break
      if (!c.id.toLowerCase().includes(q)) continue
      out.push({
        key: c.id,
        label: c.id,
        sub: `${c.speciesName} · ${c.siteName}`,
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

    /* THE MEDICINE ARM IS GONE. It searched the active medication courses, which were
       drawn per case from the medicine registry — no prescription is attributed to a
       consultation in a way this page can read. Species and animal hits remain. */

    return out
  }, [q, scope, open])

  if (q.length < 2) return null
  if (hits.length === 0) {
    return (
      <p className="mt-3 text-caption" style={{ color: FAINT }}>
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
function CaseTrend() {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)
  /* Its own range, for the same reason the vaccination calendar has one: a grid of one square
     answers nothing, and the page is often cut to a day on purpose. */
  const range = useChartRange()

  const cells = useMemo(() => {
    const rows = casesBetween(site, range.win.from, range.win.to)
    const byDay = new Map<number, number>()
    for (const c of rows) byDay.set(c.day, (byDay.get(c.day) ?? 0) + 1)
    return gridCells(range.win, (from, to) => {
      let n = 0
      for (let d = from; d <= to; d++) n += byDay.get(d) ?? 0
      return n
    })
  }, [range.win, site])

  const total = cells.cells.reduce((n, c) => n + c.value, 0)

  return (
    <Section icon={ClipboardList} label="Medical case trend" aside={`${fmt(total)} · ${range.win.window}`}>
      <RangeTabs range={range} />
      <ScheduleGrid
        cells={cells.cells}
        grain={cells.grain}
        onOpen={(cell) =>
          open({
            title: `Cases · ${cell.label}`,
            eyebrow: scopeLine(scope),
            body: (
              <PeriodSheet
                label={cell.label}
                from={cell.from}
                to={cell.to}
                cases={casesBetween(site, cell.from, cell.to)}
              />
            ),
          })
        }
      />
    </Section>
  )
}

/* ── 12 · species workload ───────────────────────────────────────────────── */

const S_SORTS: Record<string, (r: SpeciesLine) => number> = {
  cases: (r) => r.cases,
  severe: (r) => r.severe,
  complaints: (r) => r.complaints,
}

function SpeciesWorkload() {
  const { scope } = useScope()
  const { open } = useSheet()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('cases')

  const all = useMemo(() => speciesLines(scope), [scope])
  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    const by = S_SORTS[sortKey] ?? S_SORTS.cases
    const rows = q ? all.filter((r) => r.name.toLowerCase().includes(q) || r.siteName.toLowerCase().includes(q)) : all
    return [...rows].sort((a, b) => by(b) - by(a))
  }, [all, q, sortKey])

  const page = usePaged<SpeciesLine>(
    (offset, limit) => ({ rows: filtered.slice(offset, offset + limit), total: filtered.length }),
    20,
    [filtered.length, q, sortKey],
  )

  const columns: Column<SpeciesLine>[] = [
    { key: 'cases', head: 'Cases', cell: (r) => fmt(r.cases), sort: S_SORTS.cases },
    {
      key: 'severe',
      head: 'Severe',
      cell: (r) => fmt(r.severe),
      sort: S_SORTS.severe,
      tone: (r) => (r.severe ? 'bad' : undefined),
    },
    { key: 'complaints', head: 'Signs', cell: (r) => fmt(r.complaints), sort: S_SORTS.complaints, compact: false },
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
                    cases={casesIn(scope).filter((c) => c.speciesName === r.name)}
                    label="Medical cases"
                    note={`${r.name} · ${scope.win.window}`}
                  />
                ),
              })
            }
            empty={
              <p className="text-caption" style={{ color: FAINT }}>
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
function CaseRecords() {
  const { scope } = useScope()
  const { open } = useSheet()

  const rows = useMemo(() => casesIn(scope), [scope])
  const complaints = useMemo(() => byComplaintSlice(rows), [rows])
  const caseTotal = rows.length
  const page = usePaged<MedCase>(
    (offset, limit) => ({ rows: rows.slice(offset, offset + limit), total: rows.length }),
    15,
    [rows.length, scope.win.key, scope.win.from],
  )

  return (
    <Wide>
      <Section icon={ClipboardList} label="Medical cases" aside={`${fmt(rows.length)} · ${scope.win.window}`}>
        {complaints.length > 0 && (
          <>
            <RankList
              rank={false}
              items={complaints.map((c) => ({
                key: c.label,
                title: c.label,
                value: fmt(c.value),
                share: caseTotal ? (c.value / caseTotal) * 100 : 0,
              }))}
            />
            <Rule label="Records" />
          </>
        )}
        <DrillList>
          {page.rows.map((c) => (
            <DrillRow
              key={c.id}
              label={`${c.speciesName} · ${c.complaint}`}
              sub={`${c.siteName} · ${shortDate(c.day)}`}
              value={c.severity ?? '—'}
              tone={c.severity ? SEVERITY_TONE[c.severity] : undefined}
              onOpen={() => open({ title: c.id, eyebrow: 'Medical case', body: <CaseSheet c={c} /> })}
            />
          ))}
        </DrillList>
        <MoreRows page={page} noun="cases" />
        <p className="pt-3 text-caption" style={{ color: ACCENT_INK }}>
          Consultations recorded in {scope.win.window}
        </p>
      </Section>
    </Wide>
  )
}
