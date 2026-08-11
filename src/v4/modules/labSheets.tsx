/**
 * THE LAB DRILL — every contextual view the module opens, and nothing that is a page.
 *
 * The details page is the analysis; a sheet is the record behind a figure. So Department →
 * Request → Result → Species → Animal all happen here, in the one sheet the product already
 * has, by swapping its content and pushing a history entry per level. Nothing below
 * navigates.
 *
 * Two things are shared and the rest is composed per state. `Summary` is the figure block a
 * sheet opens with, and `RecordList` is the paged record layer every state ends in — because
 * every one of them must end somewhere a director can see the actual samples. What sits
 * between those two is different in each state, since a department, a species and a feed
 * batch are not the same question.
 *
 * Every list is paged. A six-year window is fourteen thousand requests and a sheet renders
 * twenty of them.
 */

import { useMemo, useState } from 'react'
import {
  Activity,
  Beaker,
  ClipboardList,
  FlaskConical,
  Hourglass,
  Layers,
  MapPin,
  Microscope,
  PawPrint,
  TriangleAlert,
  Utensils,
} from 'lucide-react'
import { longDate, shortDate } from '../../core/calendar'
import {
  Composition,
  FAINT,
  Facts,
  HAIR,
  Rule,
  Section,
  Snapshot,
  Stack,
  TONE,
} from '../../exec/system'
import { DrillList, DrillRow, useSheet } from './kit'
import {
  pct,
  specimenLabel,
  statusLabel,
  statusTone,
  tatLabel,
  totalsOf,
  type Group,
  type LabRecord,
} from './labData'

/* ── shared blocks ───────────────────────────────────────────────────────── */

/** The figure block every sheet opens with — the same six numbers, in the same order. */
export function Summary({ rows, note }: { rows: LabRecord[]; note?: string }) {
  const t = useMemo(() => totalsOf(rows), [rows])
  return (
    <Section icon={ClipboardList} label="Requests" aside={`${t.requests}`}>
      <Snapshot
        cols={3}
        items={[
          { label: 'Requests', value: String(t.requests) },
          { label: 'Pending', value: String(t.pending), tone: t.pending ? 'warn' : undefined },
          { label: 'Average TAT', value: tatLabel(t.tat) },
        ]}
      />
      <Rule label="Reported results" />
      <Snapshot
        cols={3}
        items={[
          { label: 'Positive', value: String(t.positive), tone: t.positive ? 'bad' : undefined },
          { label: 'Negative', value: String(t.negative), tone: t.negative ? 'good' : undefined },
          { label: 'Flagged', value: String(t.flagged), tone: t.flagged ? 'bad' : undefined },
        ]}
      />
      <p className="mt-3.5 text-caption" style={{ color: FAINT }}>
        {note ??
          `${t.reported} reported, ${t.pending} still with the bench${t.rejected ? `, ${t.rejected} rejected` : ''}. Positive and negative are the reported results only — pending and rejected requests carry neither.`}
      </p>
    </Section>
  )
}

const PAGE = 20

/**
 * The record layer. Every sheet ends here.
 *
 * A row is the request, not a summary of it: the id, the test, the specimen it came from and
 * where it stands. Tapping one opens the request itself, which is the deepest level.
 */
export function RecordList({
  rows,
  label = 'Lab requests',
  empty = 'No requests in this window',
}: {
  rows: LabRecord[]
  label?: string
  empty?: string
}) {
  const { open } = useSheet()
  const [shown, setShown] = useState(PAGE)
  const page = rows.slice(0, shown)

  return (
    <Section icon={FlaskConical} label={label} aside={`${rows.length}`}>
      {rows.length === 0 ? (
        <p className="py-5 text-center text-caption" style={{ color: FAINT }}>
          {empty}
        </p>
      ) : (
        <>
          <DrillList>
            {page.map((r) => (
              <DrillRow
                key={r.id}
                label={`${r.id} · ${r.test}`}
                sub={`${specimenLabel(r)} · ${shortDate(r.received)}`}
                value={statusLabel(r)}
                tone={statusTone(r)}
                onOpen={() => open({ title: r.id, eyebrow: r.dept.name, body: <RequestBody record={r} /> })}
              />
            ))}
          </DrillList>
          {shown < rows.length && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-3 w-full rounded-full py-2 text-body font-medium"
              style={{ backgroundColor: '#f2f1ed', color: '#1a6b40' }}
            >
              Show {Math.min(PAGE, rows.length - shown)} more · {rows.length - shown} remaining
            </button>
          )}
        </>
      )}
    </Section>
  )
}

/** A breakdown whose rows open their own sheet. The shape most of these states share. */
function Breakdown({
  icon,
  label,
  groups,
  metric = 'requests',
  onOpen,
  empty,
}: {
  icon: typeof MapPin
  label: string
  groups: Group[]
  metric?: 'requests' | 'pending' | 'flagged' | 'positive'
  onOpen: (g: Group) => void
  empty: string
}) {
  const live = groups.filter((g) => g[metric] > 0)
  if (live.length === 0)
    return (
      <Section icon={icon} label={label}>
        <p className="py-5 text-center text-caption" style={{ color: FAINT }}>
          {empty}
        </p>
      </Section>
    )
  return (
    <Section icon={icon} label={label} aside={`${live.length}`}>
      <DrillList>
        {live.map((g) => (
          <DrillRow
            key={g.key}
            label={g.label}
            /* A pending-only cut has nothing reported, so the reported count and the
               turnaround would both read as dashes. State the sub alone there. */
            sub={g.reported ? `${g.sub} · ${g.reported} reported · ${tatLabel(g.tat)}` : g.sub}
            value={String(g[metric])}
            onOpen={() => onOpen(g)}
          />
        ))}
      </DrillList>
    </Section>
  )
}

/** Groups a record set on the fly — sheets below need cuts their parent did not compute. */
function regroup(
  rows: LabRecord[],
  keyOf: (r: LabRecord) => string | undefined,
  sub: (rows: LabRecord[]) => string,
): Group[] {
  const by = new Map<string, LabRecord[]>()
  for (const r of rows) {
    const k = keyOf(r)
    if (!k) continue
    const at = by.get(k)
    if (at) at.push(r)
    else by.set(k, [r])
  }
  return [...by.entries()]
    .map(([key, list]) => ({ key, label: key, sub: sub(list), ...totalsOf(list), rows: list }))
    .sort((a, b) => b.requests - a.requests || a.label.localeCompare(b.label))
}

export const byDept = (rows: LabRecord[]) =>
  regroup(rows, (r) => r.dept.name, (l) => `${l[0].labName}`)
export const bySpecies = (rows: LabRecord[]) =>
  regroup(
    rows.filter((r) => r.specimen.kind === 'animal'),
    (r) => (r.specimen.kind === 'animal' ? r.specimen.speciesName : undefined),
    (l) => {
      const n = new Set(l.map((r) => r.dept.name)).size
      return `${n} bench${n === 1 ? '' : 'es'}`
    },
  )
export const bySite = (rows: LabRecord[]) => regroup(rows, (r) => r.siteName, (l) => `${l[0].dept.name} and others`)
export const byTest = (rows: LabRecord[]) => regroup(rows, (r) => r.test, (l) => l[0].dept.name)
export const byAnimal = (rows: LabRecord[]) =>
  regroup(
    rows.filter((r) => r.specimen.kind === 'animal'),
    (r) => (r.specimen.kind === 'animal' ? r.specimen.animalId : undefined),
    (l) => (l[0].specimen.kind === 'animal' ? l[0].specimen.speciesName : ''),
  )

/* ── one request · the deepest level ─────────────────────────────────────── */

/**
 * A single lab request.
 *
 * Only the fields the record actually holds. There is no reference range on this model and
 * no technician, so neither appears — a row of dashes for a field the data does not have
 * invents it just as surely as a made-up number would.
 */
export function RequestBody({ record: r }: { record: LabRecord }) {
  return (
    <Stack>
      <Section icon={FlaskConical} label="Request" aside={r.id}>
        <Facts
          items={[
            { label: 'Request ID', value: r.id },
            { label: 'Test', value: r.test },
            { label: 'Department', value: r.dept.name, sub: r.labName },
            { label: 'Site', value: r.siteName },
            {
              label: r.specimen.kind === 'animal' ? 'Species' : 'Specimen',
              value: r.specimen.kind === 'animal' ? r.specimen.speciesName : r.specimen.label,
            },
            ...(r.specimen.kind === 'animal' ? [{ label: 'Animal', value: r.specimen.animalId }] : []),
            { label: 'Sample received', value: longDate(r.received) },
            { label: 'Result reported', value: r.reported === undefined ? '—' : longDate(r.reported) },
            {
              label: 'Status',
              value: statusLabel(r),
              tone: statusTone(r),
            },
            ...(r.finding ? [{ label: 'Finding', value: r.finding, tone: statusTone(r) }] : []),
            ...(r.flagged ? [{ label: 'Flagged', value: 'For review', tone: 'bad' as const }] : []),
            {
              label: 'Turnaround',
              value: r.status === 'pending' ? `${r.waiting} d waiting` : tatLabel(r.tat),
              sub: `Standard ${r.dept.turnaround} d`,
              tone: r.overdue ? 'bad' : r.tat !== undefined && r.tat > r.dept.turnaround ? 'warn' : undefined,
            },
          ]}
        />
      </Section>
      <p className="px-[var(--gutter)] pt-1 pb-2 text-center text-caption" style={{ color: FAINT }}>
        Deepest level
      </p>
    </Stack>
  )
}

/* ── department ──────────────────────────────────────────────────────────── */

export function DeptBody({
  rows,
  name,
  allRows,
}: {
  rows: LabRecord[]
  name: string
  /** When a request opened this, the parent set is unknown — fall back to its own row. */
  allRows?: LabRecord[]
}) {
  const { open } = useSheet()
  const set = rows.length ? rows : (allRows ?? [])
  const t = useMemo(() => totalsOf(set), [set])
  const dept = set[0]?.dept

  return (
    <Stack>
      <Summary rows={set} />
      <Section icon={Hourglass} label="Turnaround" aside={dept ? `standard ${dept.turnaround} d` : undefined}>
        <Snapshot
          cols={3}
          items={[
            { label: 'Average', value: tatLabel(t.tat) },
            { label: 'Fastest', value: tatLabel(t.fastest) },
            { label: 'Slowest', value: tatLabel(t.slowest), tone: 'warn' },
          ]}
        />
        {dept && t.reported > 0 && (
          <p className="mt-3.5 text-caption" style={{ color: FAINT }}>
            {t.withinSla} of {t.reported} reported inside this bench's {dept.turnaround}-day standard ·{' '}
            {Math.round(pct(t.withinSla, t.reported))}%
          </p>
        )}
      </Section>

      <Breakdown
        icon={Layers}
        label="Species"
        groups={bySpecies(set)}
        onOpen={(g) => open({ title: g.label, eyebrow: `${name} · species`, body: <SpeciesBody rows={g.rows} /> })}
        empty="No animal specimens on this bench in this window"
      />

      <Breakdown
        icon={MapPin}
        label="Site"
        groups={bySite(set)}
        onOpen={(g) => open({ title: g.label, eyebrow: `${name} · site`, body: <SiteBody rows={g.rows} /> })}
        empty="No sites recorded"
      />
      <RecordList rows={set} />
    </Stack>
  )
}

/* ── site ────────────────────────────────────────────────────────────────── */

export function SiteBody({ rows }: { rows: LabRecord[] }) {
  const { open } = useSheet()
  return (
    <Stack>
      <Summary rows={rows} />
      <Breakdown
        icon={Microscope}
        label="Departments"
        groups={byDept(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Department', body: <DeptBody rows={g.rows} name={g.label} /> })}
        empty="No benches used"
      />
      <Breakdown
        icon={Layers}
        label="Species"
        groups={bySpecies(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Species', body: <SpeciesBody rows={g.rows} /> })}
        empty="No animal specimens"
      />
      <RecordList rows={rows} />
    </Stack>
  )
}

/* ── species and animal ──────────────────────────────────────────────────── */

export function SpeciesBody({ rows }: { rows: LabRecord[] }) {
  const { open } = useSheet()
  const t = useMemo(() => totalsOf(rows), [rows])
  return (
    <Stack>
      <Summary rows={rows} />

      {t.reported > 0 && (
        <Section icon={Activity} label="Results" aside={`${t.reported} reported`}>
          <Composition
            items={[
              { label: 'Negative', value: t.negative },
              { label: 'Positive', value: t.positive },
            ]}
            unit="results"
          />
          <p className="mt-3.5 text-caption" style={{ color: FAINT }}>
            {Math.round(pct(t.positive, t.reported))}% positive of {t.reported} reported
            {t.flagged ? ` · ${t.flagged} flagged for review` : ''}
          </p>
        </Section>
      )}

      <Breakdown
        icon={PawPrint}
        label="Animals"
        groups={byAnimal(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Animal', body: <AnimalBody rows={g.rows} /> })}
        empty="No animal specimens"
      />
      <RecordList rows={rows} />
    </Stack>
  )
}

export function AnimalBody({ rows }: { rows: LabRecord[] }) {
  const first = rows[0]
  const t = useMemo(() => totalsOf(rows), [rows])
  return (
    <Stack>
      <Section icon={PawPrint} label="Animal" aside={first?.specimen.kind === 'animal' ? first.specimen.animalId : ''}>
        <Facts
          items={[
            { label: 'Animal ID', value: first?.specimen.kind === 'animal' ? first.specimen.animalId : '—' },
            { label: 'Species', value: first?.specimen.kind === 'animal' ? first.specimen.speciesName : '—' },
            { label: 'Site', value: first?.siteName ?? '—' },
            { label: 'Lab requests', value: String(t.requests) },
            { label: 'Positive', value: String(t.positive), tone: t.positive ? 'bad' : undefined },
            { label: 'Negative', value: String(t.negative), tone: t.negative ? 'good' : undefined },
            { label: 'Flagged', value: String(t.flagged), tone: t.flagged ? 'bad' : undefined },
          ]}
        />
      </Section>
      <RecordList rows={rows} label="This animal's requests" empty="No requests for this animal in this window" />
    </Stack>
  )
}

/* ── a status cut · pending, positive, negative, flagged, overdue ────────── */

export function StatusBody({
  rows,
  note,
  breakdownLabel = 'By department',
}: {
  rows: LabRecord[]
  note: string
  breakdownLabel?: string
}) {
  const { open } = useSheet()
  return (
    <Stack>
      <Summary rows={rows} note={note} />
      <Breakdown
        icon={Microscope}
        label={breakdownLabel}
        groups={byDept(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Department', body: <DeptBody rows={g.rows} name={g.label} /> })}
        empty="Nothing to break down"
      />
      <Breakdown
        icon={Layers}
        label="By species"
        groups={bySpecies(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Species', body: <SpeciesBody rows={g.rows} /> })}
        empty="No animal specimens"
      />
      <Breakdown
        icon={MapPin}
        label="By site"
        groups={bySite(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Site', body: <SiteBody rows={g.rows} /> })}
        empty="No sites"
      />
      <RecordList rows={rows} />
    </Stack>
  )
}

/* ── turnaround ──────────────────────────────────────────────────────────── */

export function TatBody({ rows, name }: { rows: LabRecord[]; name: string }) {
  const t = useMemo(() => totalsOf(rows), [rows])
  const reported = rows.filter((r) => r.status === 'reported')
  const slowest = [...reported].sort((a, b) => (b.tat ?? 0) - (a.tat ?? 0)).slice(0, 8)

  return (
    <Stack>
      <Section icon={Hourglass} label="Turnaround" aside={name}>
        <Snapshot
          cols={3}
          items={[
            { label: 'Average', value: tatLabel(t.tat) },
            { label: 'Fastest', value: tatLabel(t.fastest) },
            { label: 'Slowest', value: tatLabel(t.slowest), tone: 'warn' },
          ]}
        />
        <Rule label="Against the bench standard" />
        <Snapshot
          cols={3}
          items={[
            { label: 'Reported', value: String(t.reported) },
            { label: 'Within standard', value: String(t.withinSla), tone: 'good' },
            { label: 'Over', value: String(t.reported - t.withinSla), tone: t.reported - t.withinSla ? 'warn' : undefined },
          ]}
        />
        <p className="mt-3.5 text-caption" style={{ color: FAINT }}>
          Turnaround is sample received → result reported. The standard is each department's own
          turnaround from the laboratory registry, not a target set here.
        </p>
      </Section>
      <Section icon={ClipboardList} label="Queue" aside={`${t.pending} pending`}>
        <Snapshot
          cols={3}
          items={[
            { label: 'Requests', value: String(t.requests) },
            { label: 'Pending', value: String(t.pending), tone: t.pending ? 'warn' : undefined },
            { label: 'Overdue', value: String(t.overdue), tone: t.overdue ? 'bad' : undefined },
          ]}
        />
      </Section>
      <RecordList rows={slowest} label="Slowest reported" empty="Nothing reported in this window" />
      <RecordList rows={rows} label="All requests" />
    </Stack>
  )
}

/* ── food toxicology ─────────────────────────────────────────────────────── */

/**
 * Food toxicology, which is the one bench whose specimen is not an animal.
 *
 * A failed feed batch is a procurement decision rather than a clinical one, so this state
 * lists BATCHES rather than species — and the drill from here is Test → Result → Record,
 * which is the hierarchy the samples actually have.
 */
export function FoodToxBody({ rows }: { rows: LabRecord[] }) {
  const { open } = useSheet()
  const t = useMemo(() => totalsOf(rows), [rows])
  const batches = regroup(
    rows,
    (r) => (r.specimen.kind === 'sample' ? r.specimen.label : undefined),
    (l) => `${l.length} test${l.length === 1 ? '' : 's'}`,
  )

  return (
    <Stack>
      <Section icon={Utensils} label="Food toxicology" aside={`${t.requests} tests`}>
        <Snapshot
          cols={3}
          items={[
            { label: 'Tests', value: String(t.requests) },
            { label: 'Reported', value: String(t.reported) },
            { label: 'Pending', value: String(t.pending), tone: t.pending ? 'warn' : undefined },
          ]}
        />
        <Rule label="Reported results" />
        <Snapshot
          cols={3}
          items={[
            { label: 'Above limit', value: String(t.positive), tone: t.positive ? 'bad' : undefined },
            { label: 'Within limit', value: String(t.negative), tone: t.negative ? 'good' : undefined },
            { label: 'Flagged', value: String(t.flagged), tone: t.flagged ? 'bad' : undefined },
          ]}
        />
        <p className="mt-3.5 text-caption" style={{ color: FAINT }}>
          Toxicology is the only bench whose specimen is a feed batch rather than an animal, so these
          results carry no species. Average turnaround {tatLabel(t.tat)}.
        </p>
      </Section>

      <Breakdown
        icon={Beaker}
        label="Batches tested"
        groups={batches}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Feed batch', body: <BatchBody rows={g.rows} /> })}
        empty="No batches tested in this window"
      />
      <RecordList rows={rows} label="Toxicology results" empty="No toxicology results in this window" />
    </Stack>
  )
}

function BatchBody({ rows }: { rows: LabRecord[] }) {
  const t = useMemo(() => totalsOf(rows), [rows])
  return (
    <Stack>
      <Section icon={Beaker} label="Batch" aside={`${t.requests} tests`}>
        <Facts
          items={[
            { label: 'Specimen', value: rows[0]?.specimen.kind === 'sample' ? rows[0].specimen.label : '—' },
            { label: 'Department', value: rows[0]?.dept.name ?? '—', sub: rows[0]?.labName },
            { label: 'Tests', value: String(t.requests) },
            { label: 'Above limit', value: String(t.positive), tone: t.positive ? 'bad' : undefined },
            { label: 'Within limit', value: String(t.negative), tone: t.negative ? 'good' : undefined },
            { label: 'Flagged', value: String(t.flagged), tone: t.flagged ? 'bad' : undefined },
          ]}
        />
      </Section>
      <RecordList rows={rows} label="Results" empty="No results for this batch" />
    </Stack>
  )
}

/* ── a test type ─────────────────────────────────────────────────────────── */

export function TestBody({ rows }: { rows: LabRecord[] }) {
  const { open } = useSheet()
  return (
    <Stack>
      <Summary rows={rows} />
      <Breakdown
        icon={Layers}
        label="Species"
        groups={bySpecies(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Species', body: <SpeciesBody rows={g.rows} /> })}
        empty="No animal specimens for this test"
      />
      <RecordList rows={rows} />
    </Stack>
  )
}

/* ── a period from the trend ─────────────────────────────────────────────── */

export function PeriodBody({ rows, label }: { rows: LabRecord[]; label: string }) {
  const { open } = useSheet()
  return (
    <Stack>
      <Summary rows={rows} note={`Requests received ${label}.`} />
      <Breakdown
        icon={Microscope}
        label="By department"
        groups={byDept(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Department', body: <DeptBody rows={g.rows} name={g.label} /> })}
        empty="Nothing received in this period"
      />
      <RecordList rows={rows} empty="Nothing received in this period" />
    </Stack>
  )
}

/* ── flagged ─────────────────────────────────────────────────────────────── */

export function FlaggedBody({ rows }: { rows: LabRecord[] }) {
  const { open } = useSheet()
  return (
    <Stack>
      <Section icon={TriangleAlert} label="Flagged for review" aside={`${rows.length}`}>
        <Snapshot
          cols={3}
          items={[
            { label: 'Flagged', value: String(rows.length), tone: rows.length ? 'bad' : undefined },
            { label: 'Positive', value: String(rows.filter((r) => r.result === 'positive').length) },
            { label: 'Negative', value: String(rows.filter((r) => r.result === 'negative').length) },
          ]}
        />
        <p className="mt-3.5 text-caption" style={{ color: FAINT }}>
          A flag is a review state on a reported result, not a third outcome — a flagged request is
          still counted in positive or negative above.
        </p>
      </Section>
      <Breakdown
        icon={Microscope}
        label="By department"
        groups={byDept(rows)}
        metric="flagged"
        onOpen={(g) => open({ title: g.label, eyebrow: 'Department', body: <DeptBody rows={g.rows} name={g.label} /> })}
        empty="Nothing flagged"
      />
      <RecordList rows={rows} label="Flagged results" empty="Nothing flagged in this window" />
    </Stack>
  )
}

export { HAIR, TONE }
