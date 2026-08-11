/**
 * LAB — the laboratory as a queue with a clock on it.
 *
 * Every other module here counts things that happened. This one counts things that have not
 * finished: how many requests are open, how long they have been open, and how long each
 * bench takes to turn one around. Thirty-one open requests at a day and a half is a healthy
 * laboratory; the same thirty-one at nine days is a clinical delay, and only the second
 * figure tells you which one you are looking at. So turnaround leads and volume follows.
 *
 * EVERY FIGURE IS DERIVED FROM ONE WALK. `labCut` reads the same daily series the KPI reads
 * and derives the LIMS view of each request — see `labData.ts`. Nothing on this page is
 * authored, and the department tallies, the site split, the record list and the hero are the
 * same set of records counted different ways, so they cannot disagree.
 *
 * THREE SCOPES, ALL ABSOLUTE. The window and the site come from the global scope the shared
 * header owns; the department is this page's own and sits in its control strip. Every
 * section below reads the scoped record set, so a page headed "Microbiology · This Month"
 * has no card left on it still reporting the whole laboratory.
 *
 * FOUR STATUSES THAT DO NOT OVERLAP. A request is pending, reported or rejected. Only a
 * reported one carries positive or negative. A flag is a review state ON a reported result,
 * so a flagged request is still counted in positive or negative — stated wherever both
 * appear, because the one thing that would make this page untrustworthy is a result counted
 * twice.
 *
 * THE DRILL IS THE SHEET. Department → Request → Result → Species → Animal, and Site →
 * Department → Request, all by swapping the content of the one sheet the product has.
 * Nothing here opens a page.
 */

import { useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  ClipboardList,
  FlaskConical,
  Hourglass,
  Layers,
  ListFilter,
  MapPin,
  Microscope,
  PawPrint,
  Search,
  Timer,
  TriangleAlert,
  Utensils,
} from 'lucide-react'
import { buckets, shortDate } from '../../core/calendar'
import { LAB_DEPARTMENTS } from '../../core/world'
import { usePeriod } from '../../exec/period'
import {
  ACCENT,
  ACCENT_INK,
  FAINT,
  Figure,
  HAIR,
  HERO_INK,
  INK,
  MUTED,
  Rule,
  Section,
  Snapshot,
  Stack,
  TONE,
  TRACK,
  VALUE,
  fmt,
  mix,
  useAccent,
} from '../../exec/system'
import { strip } from '../../exec/marks'
import { RangeTabs, useChartRange } from '../../exec/range'
import { DrillList, DrillRow, useSheet, useSite } from './kit'
import {
  labCut,
  pct,
  specimenLabel,
  statusLabel,
  statusTone,
  tatLabel,
  totalsOf,
  type Group,
  type LabRecord,
} from './labData'
import {
  DeptBody,
  FlaggedBody,
  FoodToxBody,
  PeriodBody,
  RecordList,
  RequestBody,
  SiteBody,
  SpeciesBody,
  StatusBody,
  TatBody,
  TestBody,
  bySite,
  bySpecies,
  byTest,
} from './labSheets'

/* ── the page ────────────────────────────────────────────────────────────── */

export default function Lab() {
  const { period, cut } = usePeriod()
  const { site } = useSite()
  const { open } = useSheet()

  /** The page's own scope. Site and window are global; the bench is local. */
  const [deptId, setDeptId] = useState<string | null>(null)

  /* One walk of the window under the site scope, then narrowed to the bench. Every
     section below reads `rows` — there is no card left reading the unscoped set. */
  const base = useMemo(() => labCut(site?.key ?? null, cut), [site, cut])
  const rows = useMemo(
    () => (deptId ? base.rows.filter((r) => r.dept.id === deptId) : base.rows),
    [base, deptId],
  )

  const t = useMemo(() => totalsOf(rows), [rows])
  const departments = useMemo(
    () => (deptId ? base.departments.filter((d) => d.key === deptId) : base.departments),
    [base, deptId],
  )
  const sites = useMemo(() => bySite(rows), [rows])
  const species = useMemo(() => bySpecies(rows), [rows])
  const tests = useMemo(() => byTest(rows), [rows])
  const pending = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows])
  const flagged = useMemo(() => rows.filter((r) => r.flagged), [rows])
  const positives = useMemo(() => rows.filter((r) => r.result === 'positive'), [rows])
  const negatives = useMemo(() => rows.filter((r) => r.result === 'negative'), [rows])
  const foodtox = useMemo(() => rows.filter((r) => r.dept.name === 'Toxicology'), [rows])

  const deptName = deptId ? (LAB_DEPARTMENTS.find((d) => d.id === deptId)?.name ?? null) : null
  const scopeText = [site?.name ?? 'Overall', deptName].filter(Boolean).join(' · ')

  return (
    <>
      {/* §1 — the page's own controls. Back, title, date and site belong to the shared
          header above; the bench filter, the search and the filter sheet are Lab's. */}
      <div className="w-full px-[var(--gutter)] pb-3">
        <Controls
          deptId={deptId}
          departments={base.departments}
          onDept={setDeptId}
          onSearch={() =>
            open({ title: 'Search', eyebrow: 'Lab', body: <SearchBody rows={base.rows} /> })
          }
          onFilter={() =>
            open({
              title: 'Filters',
              eyebrow: 'Lab',
              body: <FilterBody rows={base.rows} deptId={deptId} onDept={setDeptId} />,
            })
          }
        />
      </div>
      <LabHero totals={t} scope={scopeText} window={period.window} onOpen={open} rows={rows} />

      <Stack>
        {/* §3 — request activity. Height is what was received; the fill is what became of
            it. A line chart of one series would answer none of the three questions.
            The card reads its OWN range, so the shape of the bench's workload survives the
            page being cut to a single day. */}
        <RequestActivity siteKey={site?.key ?? null} deptId={deptId} onOpen={open} />

        {/* §4 — the pending workload, by bench. The one question a director asks first. */}
        <Section icon={Hourglass} label="Pending requests" aside={`${t.pending} open`}>
          {t.pending === 0 ? (
            <Nil>Nothing is waiting on a bench</Nil>
          ) : (
            <>
              <Snapshot
                cols={3}
                items={[
                  { label: 'Pending', value: String(t.pending), tone: 'warn' },
                  { label: 'Overdue', value: String(t.overdue), tone: t.overdue ? 'bad' : undefined },
                  {
                    label: 'Longest wait',
                    value: `${Math.max(...pending.map((r) => r.waiting ?? 0), 0)} d`,
                  },
                ]}
              />
              <Rule label="By department" />
              <PendingBars
                groups={departments}
                onOpen={(g) =>
                  open({
                    title: g.label,
                    eyebrow: 'Pending requests',
                    body: (
                      <StatusBody
                        rows={g.rows.filter((r) => r.status === 'pending')}
                        note={`${g.pending} of ${g.requests} requests on this bench are still open.`}
                      />
                    ),
                  })
                }
              />
            </>
          )}
        </Section>

        {/* §5 — every bench, all four figures, sortable. Dense where there is width. */}
        <Section icon={Microscope} label="Department-wise requests" aside={`${departments.length}`}>
          <MetricTable
            rows={departments}
            columns={DEPT_COLUMNS}
            onOpen={(g) =>
              open({ title: g.label, eyebrow: 'Department', body: <DeptBody rows={g.rows} name={g.label} /> })
            }
            unit="department"
          />
        </Section>

        {/* §7 — turnaround, and the distribution it is an average of. */}
        <Section icon={Timer} label="Turnaround" aside="received → reported">
          {t.reported === 0 ? (
            <Nil>Nothing reported in this window yet</Nil>
          ) : (
            <>
              <Snapshot
                cols={3}
                items={[
                  { label: 'Average TAT', value: tatLabel(t.tat) },
                  { label: 'Fastest', value: tatLabel(t.fastest), tone: 'good' },
                  { label: 'Slowest', value: tatLabel(t.slowest), tone: 'warn' },
                ]}
              />
              <Rule label="Distribution" />
              <TatHistogram
                rows={rows}
                onOpen={(label, list) =>
                  open({ title: label, eyebrow: 'Turnaround', body: <TatBody rows={list} name={label} /> })
                }
              />
              <p className="mt-3.5 text-caption" style={{ color: FAINT }}>
                Sample received → result reported, over the {t.reported} requests reported in this window.
                {' '}
                {t.withinSla} of them met their own bench's turnaround standard ·{' '}
                {Math.round(pct(t.withinSla, t.reported))}%.
              </p>
            </>
          )}
        </Section>

        {/* §8 — the same measure across benches, as one horizontal comparison. */}
        <Section icon={Hourglass} label="TAT by department" aside={tatLabel(t.tat) + ' overall'}>
          <TatBars
            groups={departments}
            overall={t.tat}
            onOpen={(g) =>
              open({ title: g.label, eyebrow: 'Turnaround', body: <TatBody rows={g.rows} name={g.label} /> })
            }
          />
        </Section>

        {/* §9 — the reported set, split two ways and no more. */}
        <Section icon={Activity} label="Positive vs negative" aside={`${t.reported} reported`}>
          {t.reported === 0 ? (
            <Nil>Nothing reported in this window yet</Nil>
          ) : (
            <>
              <div className="flex items-stretch">
                <ResultPole
                  label="Positive"
                  value={t.positive}
                  share={pct(t.positive, t.reported)}
                  tone={TONE.bad}
                  onOpen={() =>
                    open({
                      title: 'Positive results',
                      eyebrow: scopeText,
                      body: (
                        <StatusBody
                          rows={positives}
                          note={`${t.positive} of ${t.reported} reported results were positive.`}
                        />
                      ),
                    })
                  }
                />
                <span className="w-px shrink-0" style={{ backgroundColor: HAIR }} aria-hidden />
                <ResultPole
                  label="Negative"
                  value={t.negative}
                  share={pct(t.negative, t.reported)}
                  tone={TONE.good}
                  align="right"
                  onOpen={() =>
                    open({
                      title: 'Negative results',
                      eyebrow: scopeText,
                      body: (
                        <StatusBody
                          rows={negatives}
                          note={`${t.negative} of ${t.reported} reported results were negative.`}
                        />
                      ),
                    })
                  }
                />
              </div>
              <div className="mt-4 flex h-[11px] w-full gap-[2px]">
                <span
                  className="h-full rounded-l-full"
                  style={{ width: `${Math.max(2, pct(t.positive, t.reported))}%`, backgroundColor: TONE.bad }}
                />
                <span
                  className="h-full rounded-r-full"
                  style={{ width: `${Math.max(2, pct(t.negative, t.reported))}%`, backgroundColor: TONE.good }}
                />
              </div>
              <p className="mt-3.5 text-caption" style={{ color: FAINT }}>
                Reported results only. The {t.pending} pending and {t.rejected} rejected requests carry no
                result and are counted in neither.
              </p>
            </>
          )}
        </Section>

        {/* §10 — species, searchable, never truncated. */}
        <Section icon={Layers} label="Species-wise results" aside={`${species.length}`}>
          <SpeciesList
            groups={species}
            onOpen={(g) =>
              open({ title: g.label, eyebrow: 'Species', body: <SpeciesBody rows={g.rows} /> })
            }
          />
        </Section>

        {/* §12 — flagged, in the status treatment the system already reserves for it. */}
        <Section icon={TriangleAlert} label="Flagged results" aside={`${flagged.length}`}>
          {flagged.length === 0 ? (
            <Nil>Nothing flagged for review in this window</Nil>
          ) : (
            <>
              <DrillList>
                {flagged.slice(0, 6).map((r) => (
                  <DrillRow
                    key={r.id}
                    label={`${r.id} · ${r.test}`}
                    /* The finding rides in the sub, not the value slot: at 390px a value
                       reading "Fumonisin above limit" squeezes the id and the test into an
                       ellipsis, and the id is what a reader looks the record up by. */
                    sub={`${r.finding ?? ''} · ${specimenLabel(r)} · ${shortDate(r.received)}`}
                    value="Flagged"
                    tone="bad"
                    onOpen={() => open({ title: r.id, eyebrow: r.dept.name, body: <RequestBody record={r} /> })}
                  />
                ))}
              </DrillList>
              <button
                type="button"
                onClick={() =>
                  open({ title: 'Flagged results', eyebrow: scopeText, body: <FlaggedBody rows={flagged} /> })
                }
                className="mt-3 w-full rounded-full py-2 text-body font-medium"
                style={{ backgroundColor: TRACK, color: ACCENT_INK }}
              >
                All {flagged.length} flagged results →
              </button>
            </>
          )}
        </Section>

        {/* §13 — the one bench whose specimen is a feed batch rather than an animal. */}
        <Section icon={Utensils} label="Food toxicology" aside={`${foodtox.length} tests`}>
          {foodtox.length === 0 ? (
            <Nil>No toxicology work in this window</Nil>
          ) : (
            <FoodTox
              rows={foodtox}
              onOpen={() =>
                open({ title: 'Food toxicology', eyebrow: scopeText, body: <FoodToxBody rows={foodtox} /> })
              }
              onRecord={(r) => open({ title: r.id, eyebrow: 'Toxicology', body: <RequestBody record={r} /> })}
            />
          )}
        </Section>

        {/* §15 — the site view, because the command centre is site-oriented. */}
        <Section icon={MapPin} label="Site-wise lab activity" aside={`${sites.length}`}>
          <MetricTable
            rows={sites}
            columns={SITE_COLUMNS}
            onOpen={(g) => open({ title: g.label, eyebrow: 'Site', body: <SiteBody rows={g.rows} /> })}
            unit="site"
          />
        </Section>

        {/* Tests are the fourth hierarchy the model carries, and the only one not yet on the
            page. One compact list rather than a card each. */}
        <Section icon={FlaskConical} label="Tests" aside={`${tests.length}`}>
          <DrillList>
            {tests.map((g) => (
              <DrillRow
                key={g.key}
                label={g.label}
                sub={`${g.sub} · ${g.positive} positive · ${tatLabel(g.tat)}`}
                value={String(g.requests)}
                onOpen={() => open({ title: g.label, eyebrow: 'Test', body: <TestBody rows={g.rows} /> })}
              />
            ))}
          </DrillList>
        </Section>

        {/* The record layer. Everything above is this, counted. */}
        <LabRecords rows={rows} />
      </Stack>
    </>
  )
}

/* ── chrome ──────────────────────────────────────────────────────────────── */

function Nil({ children }: { children: ReactNode }) {
  return (
    <p className="py-5 text-center text-caption" style={{ color: FAINT }}>
      {children}
    </p>
  )
}

/**
 * The page's control strip — one row, and only what the shared header lacks.
 *
 * Back, title, date range and site all belong to `ScopeHeader` above and are NOT repeated
 * here; an earlier cut restated the window and the site scope directly under a header that
 * already showed both, which cost a card's height to say nothing new. What is left is Lab's
 * own: the bench, which no other module has, and the two doors to search and filters.
 *
 * The bench chip IS the scope indicator §19 asks for. Filled and named when one is picked,
 * so between the header's two pills and this chip the reader can always see all three
 * scopes without a line of prose.
 */
function Controls({
  deptId,
  departments,
  onDept,
  onSearch,
  onFilter,
}: {
  deptId: string | null
  departments: Group[]
  onDept: (id: string | null) => void
  onSearch: () => void
  onFilter: () => void
}) {
  const accent = useAccent()
  const [openMenu, setOpenMenu] = useState(false)
  const name = deptId ? (LAB_DEPARTMENTS.find((d) => d.id === deptId)?.name ?? 'Department') : 'All departments'

  return (
    <div className="relative flex items-center gap-2 rounded-[var(--radius-card)] bg-white px-[var(--pad-card-sm)] py-2.5">
      <button
        type="button"
        onClick={() => setOpenMenu((v) => !v)}
        aria-expanded={openMenu}
        aria-label="Department filter"
        className="card-press flex min-w-0 items-center gap-1.5 rounded-full px-3 py-[6px] text-caption font-medium"
        style={{
          backgroundColor: deptId ? mix(accent, 0.13) : TRACK,
          color: deptId ? ACCENT_INK : MUTED,
        }}
      >
        <span className="truncate">{name}</span>
        <span aria-hidden>▾</span>
      </button>
      <span className="min-w-0 flex-1" />

      <button
        type="button"
        onClick={onSearch}
        aria-label="Search lab requests"
        className="grid size-8 shrink-0 place-items-center rounded-full transition-colors active:bg-[#f2f1ed]"
      >
        <Search size={16} strokeWidth={2} style={{ color: MUTED }} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onFilter}
        aria-label="Filters"
        className="relative grid size-8 shrink-0 place-items-center rounded-full transition-colors active:bg-[#f2f1ed]"
      >
        <ListFilter size={15} strokeWidth={2} style={{ color: deptId ? ACCENT_INK : MUTED }} aria-hidden />
        {deptId && (
          <span
            className="absolute -top-[1px] -right-[1px] size-[8px] rounded-full"
            style={{ backgroundColor: accent }}
          />
        )}
      </button>

      {openMenu && (
        <div className="animate-drop-in absolute top-full left-[var(--pad-card-sm)] z-30 mt-1 w-[min(80vw,280px)] rounded-[14px] bg-white p-2.5 shadow-[0_10px_30px_rgba(28,26,22,0.18)] ring-1 ring-[#1c1a16]/[0.06]">
          <div className="max-h-[46vh] overflow-y-auto overscroll-contain scrollbar-hidden">
            <MenuRow
              label="All departments"
              on={!deptId}
              onClick={() => {
                onDept(null)
                setOpenMenu(false)
              }}
            />
            {departments.map((d) => (
              <MenuRow
                key={d.key}
                label={d.label}
                sub={`${d.requests}`}
                on={deptId === d.key}
                onClick={() => {
                  onDept(d.key)
                  setOpenMenu(false)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MenuRow({ label, sub, on, onClick }: { label: string; sub?: string; on: boolean; onClick: () => void }) {
  const accent = useAccent()
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-baseline gap-2 rounded-[9px] px-2.5 py-2 text-left transition-colors"
      style={{ backgroundColor: on ? mix(accent, 0.12) : 'transparent' }}
    >
      <span
        className="min-w-0 flex-1 truncate text-small"
        style={{ color: on ? ACCENT_INK : INK, fontWeight: on ? 600 : 400 }}
      >
        {label}
      </span>
      {sub && (
        <span className="shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>
          {sub}
        </span>
      )}
    </button>
  )
}

/* ── §2 · the hero ───────────────────────────────────────────────────────── */

/**
 * Six figures, three of them primary.
 *
 * Total requests takes the 58pt slot because "how much work is there" is the first question;
 * pending and average turnaround sit in the first supporting row because they are the two
 * that decide whether that volume is a problem. Positive, negative and flagged follow. Six
 * KPI cards would answer the first question sixth.
 */
function LabHero({
  totals: t,
  scope,
  window: win,
  rows,
  onOpen,
}: {
  totals: ReturnType<typeof totalsOf>
  scope: string
  window: string
  rows: LabRecord[]
  onOpen: ReturnType<typeof useSheet>['open']
}) {
  const cell = (label: string, value: string, tone?: string, body?: () => ReactNode, title?: string) => (
    <button
      key={label}
      type="button"
      disabled={!body}
      onClick={body ? () => onOpen({ title: title ?? label, eyebrow: scope, body: body() }) : undefined}
      className="card-press min-w-0 flex-1 text-left disabled:cursor-default"
    >
      <Figure value={value} size={24} color={tone ?? VALUE} />
      <span className="mt-0.5 block truncate text-caption" style={{ color: MUTED }}>
        {label}
      </span>
    </button>
  )

  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={fmt(t.requests)} size={64} color={HERO_INK} />
        <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
          <FlaskConical size={15} strokeWidth={1.75} style={{ color: ACCENT }} aria-hidden />
          Lab requests
        </p>
        <p className="mt-3 flex items-center gap-2">
          <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE.warn }} aria-hidden />
          <span className="text-small font-medium" style={{ color: TONE.warn }}>
            {t.pending} pending · {win}
          </span>
        </p>
        <div className="mt-5 flex items-stretch gap-3 border-t pt-4" style={{ borderColor: HAIR }}>
          {cell('Pending', String(t.pending), TONE.warn, () => (
            <StatusBody
              rows={rows.filter((r) => r.status === 'pending')}
              note={`${t.pending} requests are still with a bench, ${t.overdue} of them past their own department's turnaround standard.`}
            />
          ), 'Pending requests')}
          {cell('Average TAT', tatLabel(t.tat), undefined, () => (
            <TatBody rows={rows} name={scope} />
          ), 'Turnaround')}
          {cell('Flagged', String(t.flagged), t.flagged ? TONE.bad : undefined, () => (
            <FlaggedBody rows={rows.filter((r) => r.flagged)} />
          ), 'Flagged results')}
        </div>
        <div className="mt-4 flex items-stretch gap-3 border-t pt-4" style={{ borderColor: HAIR }}>
          {cell('Positive', String(t.positive), t.positive ? TONE.bad : undefined, () => (
            <StatusBody
              rows={rows.filter((r) => r.result === 'positive')}
              note={`${t.positive} of ${t.reported} reported results were positive.`}
            />
          ), 'Positive results')}
          {cell('Negative', String(t.negative), t.negative ? TONE.good : undefined, () => (
            <StatusBody
              rows={rows.filter((r) => r.result === 'negative')}
              note={`${t.negative} of ${t.reported} reported results were negative.`}
            />
          ), 'Negative results')}
          {cell('Reported', String(t.reported))}
        </div>
      </section>
    </div>
  )
}

/* ── §3 · request activity ───────────────────────────────────────────────── */

interface Bucket {
  from: number
  to: number
  list: LabRecord[]
  requests: number
  pending: number
  reported: number
  rejected: number
}

/**
 * Requests received per period, each column split by where they now stand.
 *
 * Column height is what came IN; the fill is what became of it. That makes the right-hand
 * tail — recent days, mostly still pending — read as work in progress rather than as a
 * collapse in reporting, which a completed-only chart would imply.
 */
/**
 * The card, with its own range over the bench's workload.
 *
 * Re-reads the records for the range it is showing rather than taking the page's rows: a chart
 * asked for the quarter cannot draw it out of a day's worth of records. The bench filter still
 * applies, because "Lab requests, Haematology" must mean the same thing in the chart as in the
 * table under it.
 */
function RequestActivity({
  siteKey,
  deptId,
  onOpen,
}: {
  siteKey: string | null
  deptId: string | null
  onOpen: (s: { title: string; eyebrow: string; body: ReactNode }) => void
}) {
  const range = useChartRange()

  const trend = useMemo(() => {
    const all = labCut(siteKey, range.win).rows
    const rows = deptId ? all.filter((r) => r.dept.id === deptId) : all
    /* `buckets` is the shared splitter every other trend uses, so the grain matches. Capped at
       24 columns; a day resolves to one, which the strip below draws as a bar rather than a
       slab. */
    return buckets(range.win, range.win.days <= 31 ? range.win.days : 24).map((b) => {
      const list = rows.filter((r) => r.received >= b.from && r.received <= b.to)
      return { ...b, list, ...totalsOf(list) }
    })
  }, [siteKey, deptId, range.win])

  const received = trend.reduce((n, b) => n + b.requests, 0)

  return (
    <Section icon={ClipboardList} label="Lab requests" aside={range.win.window}>
      <RangeTabs range={range} />
      {received === 0 ? (
        <Nil>No lab requests in {range.win.window}</Nil>
      ) : (
        <RequestTrend
          trend={trend}
          onOpen={(b) =>
            onOpen({
              title: `${shortDate(b.from)} – ${shortDate(b.to)}`,
              eyebrow: 'Requests received',
              body: <PeriodBody rows={b.list} label={`${shortDate(b.from)} – ${shortDate(b.to)}`} />,
            })
          }
        />
      )}
    </Section>
  )
}

function RequestTrend({ trend, onOpen }: { trend: Bucket[]; onOpen: (b: Bucket) => void }) {
  const accent = useAccent()
  const max = Math.max(...trend.map((b) => b.requests), 1)
  const stride = Math.max(1, Math.ceil(trend.length / 5))
  /* The strip caps and centres the columns, replacing a local `maxWidth: 72` that stopped a
     short window slabbing out but left the columns hard against the left edge of the card —
     which read as a chart that had failed to draw the rest of the range. */
  const bars = strip(trend.length)

  return (
    <div>
      <div className="flex h-[112px] items-end gap-[3px]" style={bars}>
        {trend.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(b)}
            title={`${shortDate(b.from)} – ${shortDate(b.to)} · ${b.requests} received · ${b.reported} reported · ${b.pending} pending`}
            aria-label={`${shortDate(b.from)} to ${shortDate(b.to)}, ${b.requests} requests`}
            className="group flex min-w-[8px] flex-1 flex-col justify-end gap-1 transition-transform active:scale-95"
          >
            <span
              className="flex w-full flex-col justify-end overflow-hidden rounded-[3px]"
              style={{ height: `${Math.max(2, (b.requests / max) * 96)}px`, backgroundColor: TRACK }}
            >
              {b.rejected > 0 && (
                <span className="w-full" style={{ height: `${(b.rejected / b.requests) * 100}%`, backgroundColor: mix(accent, 0.2) }} />
              )}
              {b.pending > 0 && (
                <span className="w-full" style={{ height: `${(b.pending / b.requests) * 100}%`, backgroundColor: mix(accent, 0.4) }} />
              )}
              {b.reported > 0 && <span className="w-full flex-1" style={{ backgroundColor: accent }} />}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px]" style={bars}>
        {trend.map((b, i) => (
          <span
            key={i}
            className="min-w-[8px] flex-1 text-center text-tick whitespace-nowrap tabular-nums"
            style={{ color: FAINT }}
          >
            {i % stride === 0 ? shortDate(b.to) : ''}
          </span>
        ))}
      </div>
      <ul className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption" style={{ color: MUTED }}>
        {[
          ['Reported', accent],
          ['Pending', mix(accent, 0.4)],
          ['Rejected', mix(accent, 0.2)],
        ].map(([label, colour]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className="size-[8px] rounded-[2px]" style={{ backgroundColor: colour }} aria-hidden />
            {label}
          </li>
        ))}
        <li style={{ color: FAINT }}>Column height is requests received</li>
      </ul>
    </div>
  )
}

/* ── §4 · pending by bench ───────────────────────────────────────────────── */

function PendingBars({ groups, onOpen }: { groups: Group[]; onOpen: (g: Group) => void }) {
  const live = groups.filter((g) => g.pending > 0).sort((a, b) => b.pending - a.pending)
  if (live.length === 0) return <Nil>Nothing pending</Nil>
  return (
    <DrillList>
      {live.map((g) => {
        const longest = Math.max(...g.rows.filter((r) => r.status === 'pending').map((r) => r.waiting ?? 0), 0)
        return (
          <DrillRow
            key={g.key}
            label={g.label}
            sub={`longest ${longest} d waiting · standard ${g.rows[0]?.dept.turnaround ?? '—'} d${g.overdue ? ` · ${g.overdue} overdue` : ''}`}
            value={String(g.pending)}
            unit="open"
            tone={g.overdue ? 'bad' : 'warn'}
            onOpen={() => onOpen(g)}
          />
        )
      })}
    </DrillList>
  )
}

/* ── §5 and §15 · the sortable table ─────────────────────────────────────── */

type ColKey = 'requests' | 'pending' | 'reported' | 'positive' | 'negative' | 'flagged' | 'tat'

interface Column {
  key: ColKey
  head: string
  /** Formats the cell. TAT is not a count. */
  cell: (g: Group) => string
  tone?: (g: Group) => string | undefined
}

const num = (k: Exclude<ColKey, 'tat'>): Column['cell'] => (g) => String(g[k])

const DEPT_COLUMNS: Column[] = [
  { key: 'requests', head: 'Requests', cell: num('requests') },
  { key: 'pending', head: 'Pending', cell: num('pending'), tone: (g) => (g.pending ? TONE.warn : undefined) },
  { key: 'reported', head: 'Completed', cell: num('reported') },
  { key: 'tat', head: 'Avg TAT', cell: (g) => tatLabel(g.tat) },
]

const SITE_COLUMNS: Column[] = [
  { key: 'requests', head: 'Requests', cell: num('requests') },
  { key: 'pending', head: 'Pending', cell: num('pending'), tone: (g) => (g.pending ? TONE.warn : undefined) },
  { key: 'positive', head: 'Positive', cell: num('positive'), tone: (g) => (g.positive ? TONE.bad : undefined) },
  { key: 'negative', head: 'Negative', cell: num('negative'), tone: (g) => (g.negative ? TONE.good : undefined) },
  { key: 'flagged', head: 'Flagged', cell: num('flagged'), tone: (g) => (g.flagged ? TONE.bad : undefined) },
]

/**
 * Two renderings of one table, chosen by how wide the CONTENT COLUMN is rather than the
 * window — a desktop with a sidebar and a context panel hands this less width than a tablet
 * landscape does, so a viewport breakpoint would give the widest screen the narrowest table.
 */
function MetricTable({
  rows,
  columns,
  onOpen,
  unit,
}: {
  rows: Group[]
  columns: Column[]
  onOpen: (g: Group) => void
  unit: string
}) {
  const accent = useAccent()
  const [sort, setSort] = useState<ColKey>('requests')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const sign = dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => {
      if (sort === 'tat') {
        if (a.tat === null && b.tat === null) return a.label.localeCompare(b.label)
        if (a.tat === null) return 1
        if (b.tat === null) return -1
        return sign * (a.tat - b.tat)
      }
      return sign * (a[sort] - b[sort]) || a.label.localeCompare(b.label)
    })
  }, [rows, sort, dir])

  const flip = (k: ColKey) => {
    if (k === sort) setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSort(k)
      setDir('desc')
    }
  }

  if (rows.length === 0) return <Nil>No {unit} in scope</Nil>

  return (
    <div>
      {/* Sort pills are the stacked rendering's control. Past the table breakpoint the
          column heads do the same job and a second control would be a second state. */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 @[620px]:hidden">
        <span className="mr-1 text-overline font-medium uppercase" style={{ color: FAINT }}>
          Sort
        </span>
        {columns.map((c) => {
          const on = c.key === sort
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => flip(c.key)}
              aria-pressed={on}
              className="flex items-center gap-1 rounded-full px-3 py-[5px] text-caption transition-colors active:scale-95"
              style={{
                backgroundColor: on ? mix(accent, 0.13) : TRACK,
                color: on ? ACCENT_INK : MUTED,
                fontWeight: on ? 600 : 400,
              }}
            >
              {c.head}
              {on && <span aria-hidden>{dir === 'desc' ? '↓' : '↑'}</span>}
            </button>
          )
        })}
      </div>
      <div className="@[620px]:hidden">
        <DrillList>
          {sorted.map((g) => (
            <DrillRow
              key={g.key}
              label={g.label}
              sub={columns
                .filter((c) => c.key !== 'requests')
                .map((c) => `${c.cell(g)} ${c.head.toLowerCase()}`)
                .join(' · ')}
              value={String(g.requests)}
              onOpen={() => onOpen(g)}
            />
          ))}
        </DrillList>
      </div>
      <div className="-mx-1 hidden overflow-x-auto px-1 @[620px]:block">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr>
              <th className="w-[30%] pb-2 text-left">
                <SortHead label="Name" on={false} dir={dir} onClick={() => undefined} align="left" />
              </th>
              {columns.map((c) => (
                <th key={c.key} className="pb-2 pl-3 text-right">
                  <SortHead label={c.head} on={c.key === sort} dir={dir} onClick={() => flip(c.key)} align="right" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <tr
                key={g.key}
                onClick={() => onOpen(g)}
                className="cursor-pointer border-t border-[#f0efec] transition-colors hover:bg-[#f7f9f7]"
              >
                <td className="py-2.5 pr-2">
                  <span className="block text-small" style={{ color: INK }}>
                    {g.label}
                  </span>
                  <span className="mt-0.5 block text-caption" style={{ color: FAINT }}>
                    {g.sub}
                  </span>
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className="py-2.5 pl-3 text-right text-small font-medium tabular-nums whitespace-nowrap"
                    style={{ color: c.tone?.(g) ?? (c.cell(g) === '0' ? '#c2beb6' : VALUE) }}
                  >
                    {c.cell(g)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHead({
  label,
  on,
  dir,
  onClick,
  align,
}: {
  label: string
  on: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
  align: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-overline font-medium whitespace-nowrap uppercase ${
        align === 'right' ? 'flex-row-reverse' : ''
      }`}
      style={{ color: on ? ACCENT_INK : FAINT }}
    >
      {label}
      <span aria-hidden style={{ opacity: on ? 1 : 0 }}>
        {dir === 'desc' ? '↓' : '↑'}
      </span>
    </button>
  )
}

/* ── §7 · the turnaround distribution ────────────────────────────────────── */

const TAT_BANDS: [string, number, number][] = [
  ['≤ 1 d', 0, 1],
  ['1–2 d', 1, 2],
  ['2–4 d', 2, 4],
  ['4–7 d', 4, 7],
  ['7–14 d', 7, 14],
  ['14 d +', 14, Infinity],
]

/**
 * The distribution the average came from.
 *
 * An average of 4.2 days over a laboratory whose benches range from a one-day haematology
 * to a seven-day histopathology is the mean of two different populations, and the shape says
 * so where the single figure cannot. Bands, not percentiles — the brief rules those out and
 * the model has no percentile in it.
 */
function TatHistogram({
  rows,
  onOpen,
}: {
  rows: LabRecord[]
  onOpen: (label: string, rows: LabRecord[]) => void
}) {
  const accent = useAccent()
  const bands = TAT_BANDS.map(([label, lo, hi]) => ({
    label,
    rows: rows.filter((r) => r.tat !== undefined && r.tat > lo && r.tat <= hi),
  }))
  const max = Math.max(...bands.map((b) => b.rows.length), 1)

  return (
    <div className="flex items-end gap-1.5">
      {bands.map((b) => (
        <button
          key={b.label}
          type="button"
          disabled={b.rows.length === 0}
          onClick={() => onOpen(b.label, b.rows)}
          className="flex min-w-0 flex-1 flex-col items-center gap-1.5 transition-transform active:scale-95 disabled:cursor-default"
        >
          <span className="text-caption font-semibold tabular-nums" style={{ color: b.rows.length ? INK : '#c2beb6' }}>
            {b.rows.length}
          </span>
          <span
            className="w-full rounded-[3px]"
            style={{
              height: `${Math.max(3, (b.rows.length / max) * 66)}px`,
              backgroundColor: b.rows.length ? mix(accent, 0.35 + (b.rows.length / max) * 0.6) : TRACK,
            }}
          />
          <span className="truncate text-tick whitespace-nowrap" style={{ color: FAINT }}>
            {b.label}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ── §8 · TAT by bench ───────────────────────────────────────────────────── */

function TatBars({
  groups,
  overall,
  onOpen,
}: {
  groups: Group[]
  overall: number | null
  onOpen: (g: Group) => void
}) {
  const accent = useAccent()
  const live = groups.filter((g) => g.tat !== null).sort((a, b) => (b.tat ?? 0) - (a.tat ?? 0))
  const max = Math.max(...live.map((g) => g.tat ?? 0), 1)
  if (live.length === 0) return <Nil>Nothing reported in this window yet</Nil>

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {live.map((g) => {
          const over = (g.tat ?? 0) > (g.rows[0]?.dept.turnaround ?? Infinity)
          return (
            <li key={g.key}>
              <button type="button" onClick={() => onOpen(g)} className="card-press w-full text-left">
                <span className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-small" style={{ color: INK }}>
                    {g.label}
                  </span>
                  <span className="shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>
                    {g.reported} reported
                  </span>
                  <span
                    className="shrink-0 text-small font-medium tabular-nums"
                    style={{ color: over ? TONE.warn : VALUE }}
                  >
                    {tatLabel(g.tat)}
                  </span>
                </span>
                <span className="relative mt-1.5 block h-[7px] overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(2, ((g.tat ?? 0) / max) * 100)}%`,
                      backgroundColor: over ? mix(TONE.warn, 0.55) : mix(accent, 0.8),
                    }}
                  />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-3.5 border-t pt-3 text-caption" style={{ borderColor: HAIR, color: FAINT }}>
        Received → reported, averaged per bench. Overall {tatLabel(overall)}. A bar is amber where the
        bench is running past its own turnaround standard.
      </p>
    </div>
  )
}

/* ── §9 · one side of the result split ───────────────────────────────────── */

function ResultPole({
  label,
  value,
  share,
  tone,
  align = 'left',
  onOpen,
}: {
  label: string
  value: number
  share: number
  tone: string
  align?: 'left' | 'right'
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`card-press min-w-0 flex-1 ${align === 'right' ? 'pl-4 text-right' : 'pr-4 text-left'}`}
    >
      <Figure value={fmt(value)} size={32} color={tone} />
      <span className="mt-1 block text-small" style={{ color: MUTED }}>
        {label}
      </span>
      <span className="mt-0.5 block text-caption tabular-nums" style={{ color: FAINT }}>
        {Math.round(share)}% of reported
      </span>
    </button>
  )
}

/* ── §10 · species ───────────────────────────────────────────────────────── */

const SPECIES_PAGE = 12

function SpeciesList({ groups, onOpen }: { groups: Group[]; onOpen: (g: Group) => void }) {
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(SPECIES_PAGE)
  const accent = useAccent()

  const matched = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? groups.filter((g) => g.label.toLowerCase().includes(needle)) : groups
  }, [groups, q])

  const page = matched.slice(0, shown)

  if (groups.length === 0) return <Nil>No animal specimens in this window</Nil>

  return (
    <div>
      <div className="relative">
        <Search
          size={14}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          style={{ color: FAINT }}
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setShown(SPECIES_PAGE)
          }}
          placeholder="Search species"
          aria-label="Search species"
          className="w-full rounded-[10px] py-2 pr-3 pl-8 text-small outline-none focus:ring-2 focus:ring-[#37bd69]/35 [&::-webkit-search-cancel-button]:hidden"
          style={{ backgroundColor: TRACK, color: INK }}
        />
      </div>
      <p className="mt-2.5 text-caption tabular-nums" style={{ color: FAINT }}>
        {q.trim() ? `${matched.length} of ${groups.length} matching` : `${groups.length} species with lab results`}
      </p>

      {page.length === 0 ? (
        <Nil>No match for “{q.trim()}”</Nil>
      ) : (
        <DrillList>
          {page.map((g) => (
            <DrillRow
              key={g.key}
              label={g.label}
              sub={`${g.positive} positive · ${g.negative} negative · ${
                g.reported ? Math.round(pct(g.positive, g.reported)) : 0
              }% positive`}
              value={String(g.requests)}
              tone={g.flagged ? 'bad' : undefined}
              onOpen={() => onOpen(g)}
            />
          ))}
        </DrillList>
      )}

      {shown < matched.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + SPECIES_PAGE)}
          className="mt-3 w-full rounded-full py-2 text-body font-medium"
          style={{ backgroundColor: TRACK, color: ACCENT_INK }}
        >
          Show {Math.min(SPECIES_PAGE, matched.length - shown)} more · {matched.length - shown} remaining
        </button>
      )}
      <p className="mt-3 text-caption" style={{ color: FAINT }}>
        Animal specimens only. Toxicology and water quality samples are feed batches and water bodies,
        so they carry no species — they are in Food toxicology below.
      </p>
      <span className="hidden" style={{ color: accent }} />
    </div>
  )
}

/* ── §13 · food toxicology ───────────────────────────────────────────────── */

function FoodTox({
  rows,
  onOpen,
  onRecord,
}: {
  rows: LabRecord[]
  onOpen: () => void
  onRecord: (r: LabRecord) => void
}) {
  const t = useMemo(() => totalsOf(rows), [rows])
  const reported = rows.filter((r) => r.status === 'reported').slice(0, 5)

  return (
    <>
      <Snapshot
        cols={3}
        items={[
          { label: 'Tests', value: String(t.requests) },
          { label: 'Above limit', value: String(t.positive), tone: t.positive ? 'bad' : undefined },
          { label: 'Within limit', value: String(t.negative), tone: t.negative ? 'good' : undefined },
        ]}
      />
      <Rule label="Results" />
      {reported.length === 0 ? (
        <Nil>Nothing reported yet — {t.pending} tests still with the bench</Nil>
      ) : (
        <DrillList>
          {reported.map((r) => (
            <DrillRow
              key={r.id}
              label={r.specimen.kind === 'sample' ? r.specimen.label : r.id}
              sub={`${r.finding ?? ''} · ${shortDate(r.reported ?? r.received)}`}
              value={r.result === 'positive' ? 'Above limit' : 'Within limit'}
              tone={r.result === 'positive' ? 'bad' : 'good'}
              onOpen={() => onRecord(r)}
            />
          ))}
        </DrillList>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 w-full rounded-full py-2 text-body font-medium"
        style={{ backgroundColor: TRACK, color: ACCENT_INK }}
      >
        All {t.requests} toxicology tests →
      </button>
    </>
  )
}

/* ── the record layer ────────────────────────────────────────────────────── */

type StatusFilter = 'all' | 'pending' | 'reported' | 'positive' | 'negative' | 'flagged' | 'rejected'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'reported', label: 'Reported' },
  { id: 'positive', label: 'Positive' },
  { id: 'negative', label: 'Negative' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'rejected', label: 'Rejected' },
]

const applyStatus = (rows: LabRecord[], f: StatusFilter): LabRecord[] => {
  switch (f) {
    case 'pending':
      return rows.filter((r) => r.status === 'pending')
    case 'reported':
      return rows.filter((r) => r.status === 'reported')
    case 'rejected':
      return rows.filter((r) => r.status === 'rejected')
    case 'positive':
      return rows.filter((r) => r.result === 'positive')
    case 'negative':
      return rows.filter((r) => r.result === 'negative')
    case 'flagged':
      return rows.filter((r) => r.flagged)
    default:
      return rows
  }
}

function LabRecords({ rows }: { rows: LabRecord[] }) {
  const accent = useAccent()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const shown = useMemo(() => applyStatus(rows, filter), [rows, filter])

  return (
    <Section icon={FlaskConical} label="Lab records" aside={`${shown.length}`}>
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const on = f.id === filter
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={on}
              className="rounded-full px-3 py-[5px] text-caption transition-colors active:scale-95"
              style={{
                backgroundColor: on ? mix(accent, 0.13) : TRACK,
                color: on ? ACCENT_INK : MUTED,
                fontWeight: on ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>
      <RecordList rows={shown} label="Requests" empty="No requests match this filter" />
    </Section>
  )
}

/* ── §16 · search ────────────────────────────────────────────────────────── */

function SearchBody({ rows }: { rows: LabRecord[] }) {
  const { open } = useSheet()
  const [q, setQ] = useState('')

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []
    return rows
      .filter((r) =>
        `${r.id} ${r.test} ${r.dept.name} ${r.siteName} ${specimenLabel(r)}`.toLowerCase().includes(needle),
      )
      .slice(0, 60)
  }, [rows, q])

  return (
    <Stack>
      <Section icon={Search} label="Search">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Request ID, animal, species, test, department or site"
          aria-label="Search lab records"
          className="w-full rounded-[10px] px-3 py-2.5 text-small outline-none focus:ring-2 focus:ring-[#37bd69]/35"
          style={{ backgroundColor: TRACK, color: INK }}
        />
        <p className="mt-2.5 text-caption" style={{ color: FAINT }}>
          {q.trim().length < 2
            ? 'Type two characters or more. Search covers the current window and site scope.'
            : `${hits.length} shown${hits.length === 60 ? ' · narrow the query for the rest' : ''}`}
        </p>
      </Section>
      {hits.length > 0 && (
        <Section icon={FlaskConical} label="Matches" aside={`${hits.length}`}>
          <DrillList>
            {hits.map((r) => (
              <DrillRow
                key={r.id}
                label={`${r.id} · ${r.test}`}
                sub={`${specimenLabel(r)} · ${r.dept.name} · ${shortDate(r.received)}`}
                value={statusLabel(r)}
                tone={statusTone(r)}
                onOpen={() => open({ title: r.id, eyebrow: r.dept.name, body: <RequestBody record={r} /> })}
              />
            ))}
          </DrillList>
        </Section>
      )}
    </Stack>
  )
}

/* ── §17 · filters ───────────────────────────────────────────────────────── */

function FilterBody({
  rows,
  deptId,
  onDept,
}: {
  rows: LabRecord[]
  deptId: string | null
  onDept: (id: string | null) => void
}) {
  const counts = useMemo(() => {
    const by = new Map<string, number>()
    for (const r of rows) by.set(r.dept.id, (by.get(r.dept.id) ?? 0) + 1)
    return by
  }, [rows])

  return (
    <Stack>
      <Section icon={Microscope} label="Department" aside="Rescopes every section">
        <MenuRow label="All departments" on={!deptId} onClick={() => onDept(null)} />
        {LAB_DEPARTMENTS.map((d) => (
          <MenuRow
            key={d.id}
            label={d.name}
            sub={String(counts.get(d.id) ?? 0)}
            on={deptId === d.id}
            onClick={() => onDept(d.id)}
          />
        ))}
      </Section>
      <Section icon={PawPrint} label="Date range and site">
        <p className="text-caption" style={{ color: MUTED }}>
          The window and the site are global — they are set from the pills in the page header and apply
          to every module, not just this one.
        </p>
      </Section>
    </Stack>
  )
}
