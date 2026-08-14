/**
 * LAB — request volume, the trend that made it, and the benches that ran the tests.
 *
 * ONE FILTER STATE, AND IT IS THE PAGE'S OWN. The date range and the site on this tab are
 * `scope.win` and `scope.site` — the global scope that lives in the URL above the router
 * (`v4/scope.tsx`), the same pair the species header states and every other page reads. The
 * toolbar at the top of this tab renders THE CONTROLS THEMSELVES via `ScopeFilters`, not copies
 * of them: change the window here and the header pill has already changed, because there is one
 * state and two places it is drawn. No card, chart or table on this tab owns a date or a site,
 * and none of them may — a section-level filter is a second source of truth, and the first
 * figure drawn under the wrong one is a number the reader cannot reconcile with the one beside
 * it. `labModel` takes the window as an argument for the same reason: the narrowing happens at
 * the row, once, and everything below it inherits.
 *
 * WHAT THE FIGURES ARE. Read `speciesLabData.ts` first — the source has no lab test table, so
 * the REQUESTS are derived against a real spine of medical records under `core/seed.ts`'s
 * determinism contract, and the benches are `world.ts`'s own authored departments. The record
 * counts, the animals and the dates are real and scope-cut; the requests, their state and their
 * bench are drawn and say so on the page.
 *
 * EVERY TREATMENT IS AN EXISTING ONE — the kit's `Band` and `StatGrid`, `AreaTrend`, the pinned
 * `HousingTable`, the product's own sheet for every drill, and the global pills from
 * `filters.tsx`. The tab adds no chrome of its own.
 */

import { useMemo } from 'react'
import { Activity, Beaker, FlaskConical, ListTree, Microscope } from 'lucide-react'
import { longDate } from '../core/calendar'
import { AreaTrend, type Pt } from '../exec/marks'
import { FAINT, INK, MUTED, Section, Stack, fmt } from '../exec/system'
import { useDrill } from './drillNav'
import { ScopeFilters } from './filters'
import { TapList, TapRow } from './panels'
import { useScope } from './scope'
import { useSheet } from './sheet'
import { HousingTable, type HCol } from './speciesHousing'
import { Band, StatGrid, TabBody } from './speciesLayout'
import { labModel, type DeptRow, type LabRequest, type LabRow } from './speciesLabData'
import { siteOf } from '../core/world'

export function SpeciesLabTab({
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

  /* THE ONE READ OF THE GLOBAL SCOPE. Keyed on the window's own day bounds rather than the
     `Win` object, so a re-resolved window with identical bounds does not recompute — and a
     genuinely different range always does. */
  const model = useMemo(
    () => labModel(name, siteKey, scope.win),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the model reads only these bounds
    [name, siteKey, scope.win.from, scope.win.to],
  )

  const openAnimal = (id: string) => drillTo({ kind: 'animal', id }, { module: 'animals', label: name })

  const openRequests = (title: string, rows: LabRequest[]) =>
    open({
      title,
      eyebrow: `${fmt(rows.length)} requests · ${scope.win.label} · ${place}`,
      body: (
        <Stack>
          <Section icon={ListTree} label="Requests" aside={fmt(rows.length)}>
            {rows.length === 0 ? (
              <p className="py-2 text-small" style={{ color: FAINT }}>
                No requests sit under this figure in the current date range.
              </p>
            ) : (
              <TapList>
                {rows.slice(0, 60).map((q, i) => (
                  <TapRow
                    key={`${q.animalId}-${q.day}-${i}`}
                    label={q.animalId ? `Animal ${q.animalId}` : 'Unattributed request'}
                    sub={[longDate(q.day), siteOf(q.siteKey)?.name ?? q.siteKey, `${fmt(q.tests)} tests`, q.source]
                      .filter(Boolean)
                      .join(' · ')}
                    value={q.state}
                    onOpen={q.animalId ? () => openAnimal(q.animalId) : undefined}
                  />
                ))}
              </TapList>
            )}
            {rows.length > 60 && (
              <p className="mt-3 text-caption" style={{ color: FAINT }}>
                and {fmt(rows.length - 60)} more requests
              </p>
            )}
          </Section>
        </Stack>
      ),
    })

  const toolbar = (
    /* THE CONTROL LAYER, NOT A CARD. It carries no surface of its own so it reads as chrome
       above the content rather than as the first section of it. */
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-1">
      <h2 className="text-body font-semibold" style={{ color: INK }}>
        Lab
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <ScopeFilters />
      </div>
    </div>
  )

  if (!model || (!model.requests && !model.records)) {
    return (
      <TabBody>
        {toolbar}
        <Band title="No lab requests" icon={FlaskConical}>
          <p className="text-small" style={{ color: MUTED }}>
            No medical records fall inside {scope.win.window} for {place}, so no tests were
            ordered against this species in this range. Widen the date range to see more.
          </p>
        </Band>
      </TabBody>
    )
  }

  const points: Pt[] = model.trend
  const anyRequests = model.requests > 0
  const stateRows = (s: LabRequest['state']) => model.rows.filter((q) => q.state === s)

  const deptColumns: HCol<DeptRow>[] = [
    {
      key: 'name',
      head: 'Test',
      sticky: 0,
      strong: true,
      cell: (d) => (
        <span className="min-w-0">
          <span className="block">{d.name}</span>
          <span className="block text-caption font-normal" style={{ color: FAINT }}>
            {d.labCode} · {fmt(d.turnaround)}-day standard
          </span>
        </span>
      ),
    },
    { key: 'tests', head: 'Tests', align: 'right', cell: (d) => fmt(d.tests) },
    { key: 'requests', head: 'Requests', align: 'right', cell: (d) => fmt(d.requests) },
    { key: 'animals', head: 'Animals', align: 'right', cell: (d) => fmt(d.animals) },
  ]

  const labColumns: HCol<LabRow>[] = [
    {
      key: 'name',
      head: 'Laboratory',
      sticky: 0,
      strong: true,
      cell: (l) => (
        <span className="min-w-0">
          <span className="block">{l.name}</span>
          <span className="block text-caption font-normal" style={{ color: FAINT }}>
            {l.code} · {fmt(l.departments)} benches
          </span>
        </span>
      ),
    },
    { key: 'tests', head: 'Tests', align: 'right', cell: (l) => fmt(l.tests) },
    { key: 'animals', head: 'Animals', align: 'right', cell: (l) => fmt(l.animals) },
  ]

  const twoCol = 'grid items-start gap-4 @[860px]:grid-cols-2'

  return (
    <TabBody>
      {toolbar}

      {/* ── 1 · request volume ────────────────────────────────────────────── */}

      <StatGrid
        items={[
          {
            label: 'Requests',
            value: fmt(model.requests),
            sub: `${fmt(model.tests)} tests · ${fmt(model.animals)} animals`,
            onOpen: anyRequests ? () => openRequests('Lab requests', model.rows) : undefined,
          },
          {
            label: 'Completed',
            value: fmt(model.completed),
            tone: 'good',
            onOpen: model.completed ? () => openRequests('Completed requests', stateRows('Completed')) : undefined,
          },
          {
            label: 'In progress',
            value: fmt(model.inProgress),
            onOpen: model.inProgress ? () => openRequests('Requests in progress', stateRows('In progress')) : undefined,
          },
          {
            label: 'Pending',
            value: fmt(model.pending),
            tone: model.pending > 0 ? 'warn' : undefined,
            onOpen: model.pending ? () => openRequests('Pending requests', stateRows('Pending')) : undefined,
          },
          {
            label: 'Cancelled',
            value: fmt(model.cancelled),
            tone: model.cancelled > 0 ? 'bad' : undefined,
            onOpen: model.cancelled ? () => openRequests('Cancelled requests', stateRows('Cancelled')) : undefined,
          },
          {
            /* A range with no requests in it has no completion rate — 0% would read as a
               failure to report where there was nothing to report. */
            label: 'Completed of those run',
            value: model.requests > model.cancelled ? `${model.completionPct}%` : '—',
            sub: 'cancelled requests excluded',
          },
        ]}
      />

      {/* ── 2 · the trend ─────────────────────────────────────────────────── */}

      <Band
        title="Request Trend"
        aside={`per ${model.trendGrain} · ${scope.win.label} · ${place}`}
        icon={Activity}
      >
        {anyRequests ? (
          <AreaTrend points={points} unit="lab requests" baseline="zero" height={148} />
        ) : (
          <p className="py-6 text-center text-small" style={{ color: FAINT }}>
            No requests were raised in this date range.
          </p>
        )}
      </Band>

      {/* ── 3 · the benches ───────────────────────────────────────────────── */}

      <div className={twoCol}>
        <Band title="All Tests" aside={`${fmt(model.depts.length)} benches`} icon={Microscope}>
          {model.depts.length ? (
            <HousingTable
              rows={model.depts}
              columns={deptColumns}
              keyOf={(d) => d.id}
              minWidth={460}
              onOpen={(d) => drillTo({ kind: 'labdept', id: d.id }, { module: 'lab', label: name })}
            />
          ) : (
            <p className="py-6 text-center text-small" style={{ color: FAINT }}>
              No tests were run in this date range.
            </p>
          )}
        </Band>

        <Band title="Tests by Lab" aside={`${fmt(model.labs.length)} laboratories`} icon={Beaker}>
          {model.labs.length ? (
            <HousingTable
              rows={model.labs}
              columns={labColumns}
              keyOf={(l) => l.id}
              minWidth={400}
              onOpen={(l) => drillTo({ kind: 'lab', id: l.id }, { module: 'lab', label: name })}
            />
          ) : (
            <p className="py-6 text-center text-small" style={{ color: FAINT }}>
              No laboratory ran tests for this species in this date range.
            </p>
          )}
        </Band>
      </div>

    </TabBody>
  )
}
