/**
 * PREVENTIVE MEDICATION — vaccination, deworming, supplements.
 *
 * THREE PROGRAMMES, AND THE PAGE IS BUILT AS THREE, not as one merged compliance number. A
 * 92% vaccination rate and an 89% worming rate average to a figure that describes neither
 * herd, and the two are late in different ways: a missed booster slips a whole round, a
 * missed worming slips a cycle. So each programme gets its own block, its own mark and its
 * own drill, and only the site comparison at the end puts them side by side.
 *
 * WHAT THE PAGE IS ORGANISED AROUND IS OVERDUE. Completed work needs no decision. An animal
 * thirty days past its booster does, and an executive reading this page for ten seconds
 * should leave knowing that number. It is the loudest thing here and the only red.
 *
 * ACTIVITY IS CUT TO THE WINDOW; DUE STATUS IS READ TODAY. Those are different clocks and
 * the page never mixes them — every activity card carries the window in its aside, every
 * due-status card says "today". Letting the date filter move the overdue count would tell a
 * reader that changing the dates treated some animals. See `preventiveData.ts`.
 *
 * WHAT IS NOT HERE. Supplements have no overdue figure, because a mineral mix given with
 * feed has no covered / not-covered state to be late against. There is no recommendation,
 * no "needs attention", no forecast — the page shows what happened, what is outstanding,
 * and who it belongs to.
 *
 * The marks are this module's own — a schedule grid, a rotation cycle, a usage split — for
 * the reason given in `preventiveMarks.tsx`: a schedule is not a quantity over time.
 */

import { useMemo, useState } from 'react'
import {
  Activity,
  CalendarClock,
  ClipboardList,
  Dna,
  Layers,
  MapPin,
  Search,
  ShieldPlus,
  Syringe,
  TriangleAlert,
} from 'lucide-react'
import { sumIn } from '../../core/series'
import { bySpecies, byDimension } from '../../core/query'
import { siteKeyOf } from '../../core/scope'
import { SITES, speciesIn } from '../../core/world'
import { decodeAnimalId } from '../../core/animals'
import {
  ACCENT_INK,
  AccentProvider,
  Columns,
  FAINT,
  Facts,
  Figure,
  HERO_INK,
  Rule,
  Section,
  Snapshot,
  Stack,
  TONE,
  Trend,
  fmt,
  mix,
} from '../../exec/system'
import { MoreRows, usePaged } from '../perf'
import { FindField } from '../filters'
import { useScope } from '../scope'
import { useSheet } from '../sheet'
import { DrillList, DrillRow } from './kit'
import { OverdueLadder, RotationCycle, ScheduleGrid, SortableList, UsageSplit, gridCells, type Column } from './preventiveMarks'
import {
  PREVENTIVE_ACCENT,
  STREAMS,
  STREAM_LIST,
  activityOf,
  buckets,
  coverageOf,
  overdueBySite,
  overdueBySpecies,
  preventiveSiteLines,
  roster,
  scopeLine,
  siteLines,
  speciesLines,
  type PreventiveSiteLine,
  type SiteLine,
  type SpeciesLine,
  type Stream,
  type StreamKey,
} from './preventiveData'
import {
  AgentSheet,
  AnimalPreventiveSheet,
  OverdueSheet,
  PeriodSheet,
  SitePreventiveSheet,
  SpeciesSheet,
  StreamSheet,
  StreamSiteSheet,
} from './preventiveSheets'

const STREAM_ICON = { vaccination: Syringe, deworming: Activity, supplement: ClipboardList } as const

/**
 * A section that keeps the whole column past the two-column break.
 *
 * `Stack` splits into two columns past 760px of column, and a container query inside a
 * section still measures the COLUMN rather than the half it ended up in — so a table told
 * to appear at 720px would appear inside a 455px half and be unreadable. The sections that
 * carry a sortable table, a searchable list or three cards across say so here, and the
 * compact ones — the calendar, the ladders, the rotation — stay half-width where they read
 * better paired than stretched.
 */
const Wide = ({ children }: { children: React.ReactNode }) => (
  <div className="min-w-0 @[760px]:col-span-2">{children}</div>
)

/* ── the page ────────────────────────────────────────────────────────────── */

export default function Preventive() {
  /* The contextual filter, and the only page state there is. Everything else — the window,
     the site — is the global scope, so this page cannot hold a second opinion about either. */
  const [only, setOnly] = useState<StreamKey | 'all'>('all')

  const shows = (key: StreamKey) => only === 'all' || only === key

  return (
    <AccentProvider value={PREVENTIVE_ACCENT}>
      <PreventiveHero />
      <Stack>
        <Toolbar only={only} onOnly={setOnly} />
        <Overview />

        {shows('vaccination') && (
          <AccentProvider value={STREAMS.vaccination.accent}>
            <VaccinationTrend />
            <VaccinationOverdue />
            <BadlyOverdue />
            <StreamSites stream={STREAMS.vaccination} />
            <StreamSpecies stream={STREAMS.vaccination} />
          </AccentProvider>
        )}

        {shows('deworming') && (
          <AccentProvider value={STREAMS.deworming.accent}>
            <DewormingRotation />
            <DewormingTrend />
            <DewormingOverdue />
          </AccentProvider>
        )}

        {shows('supplement') && (
          <AccentProvider value={STREAMS.supplement.accent}>
            <Supplements />
            <SupplementTrend />
          </AccentProvider>
        )}

        <SiteComparison />
        <SpeciesComparison />
      </Stack>
    </AccentProvider>
  )
}

/* ── 1 · hero ────────────────────────────────────────────────────────────── */

/**
 * Four figures and the scope they were cut under, in one card.
 *
 * NOT FOUR KPI CARDS. Four cards of this weight would fill a phone screen with the summary
 * of a page whose whole point is what is underneath it — and three of the four numbers are
 * activity while the fourth is a due status, which four identical cards would hide.
 * One card, one rule, and the overdue figure sits after the rule in the only red on the page.
 */
function PreventiveHero() {
  const { scope } = useScope()
  const site = siteKeyOf(scope)

  const vaccinations = activityOf(scope, STREAMS.vaccination)
  const treatments = activityOf(scope, STREAMS.deworming)
  const supplements = activityOf(scope, STREAMS.supplement)
  const overdue = useMemo(
    () =>
      [STREAMS.vaccination, STREAMS.deworming].reduce(
        (n, s) => n + roster(site, s).filter((r) => r.daysOverdue > 0).length,
        0,
      ),
    [site],
  )

  const siteCount = site ? 1 : SITES.length
  const speciesCount = useMemo(
    () => (site ? speciesIn(site).length : SITES.reduce((n, s) => n + speciesIn(s.key).length, 0)),
    [site],
  )

  return (
    <div className="w-full px-[var(--gutter-lg)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-end justify-between gap-4">
          <span>
            <Figure value={fmt(vaccinations)} size={52} color={HERO_INK} />
            <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
              <Syringe size={15} strokeWidth={1.75} style={{ color: STREAMS.vaccination.accent }} aria-hidden />
              Vaccinations · {scope.win.label.toLowerCase()}
            </p>
          </span>
          {/* The scope, stated on the largest card rather than only in the header — this is
              the figure a reader screenshots, and it must carry its own caption. */}
          <span className="shrink-0 pb-1 text-right text-[11px] leading-[15px]" style={{ color: FAINT }}>
            {scopeLine(scope)}
            <br />
            {siteCount} {siteCount === 1 ? 'site' : 'sites'} · {speciesCount} species
          </span>
        </div>

        <div className="mt-5 flex items-stretch border-t border-[#f0efec] pt-4">
          {[
            { value: fmt(treatments), label: 'Deworming', accent: STREAMS.deworming.accent },
            { value: fmt(supplements), label: 'Supplements', accent: STREAMS.supplement.accent },
          ].map((s, i) => (
            <span key={s.label} className={`min-w-0 flex-1 ${i ? 'border-l border-[#f0efec] pl-4' : 'pr-4'}`}>
              <Figure value={s.value} size={24} />
              <span className="mt-0.5 block truncate text-[12px] text-[#6d6860]">{s.label}</span>
            </span>
          ))}
          {/* The one due-status figure on the card, separated and captioned as one — the
              other three move with the date filter and this one does not. */}
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure value={fmt(overdue)} size={24} color={TONE.bad} />
            <span className="mt-0.5 block truncate text-[12px]" style={{ color: TONE.bad }}>
              Overdue · today
            </span>
          </span>
        </div>
      </section>
    </div>
  )
}

/* ── 2 · the toolbar ─────────────────────────────────────────────────────── */

/**
 * Search and the one contextual filter, in the page's own card.
 *
 * The window and the site live in the global header where every module's do; what belongs
 * to this page is which programme you are reading and what you are looking for. The
 * category selector is horizontal because on a phone it is the fastest way to put one
 * programme on screen without scrolling past the other two.
 */
function Toolbar({ only, onOnly }: { only: StreamKey | 'all'; onOnly: (k: StreamKey | 'all') => void }) {
  const [query, setQuery] = useState('')

  return (
    <Section icon={Layers} label="Preventive type" aside={only === 'all' ? 'All three' : STREAMS[only].label}>
      {/* Wraps rather than scrolls. Four chips fit one line on a phone and inside a
          half-width card they do not — a chip half off the edge of a card reads as a
          rendering fault, where a second line reads as four options. */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'vaccination', 'deworming', 'supplement'] as const).map((k) => {
          const on = only === k
          const accent = k === 'all' ? PREVENTIVE_ACCENT : STREAMS[k].accent
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onOnly(k)}
              className="card-press shrink-0 rounded-full px-3 py-[6px] text-[12px] font-medium whitespace-nowrap transition-colors"
              style={
                on
                  ? { backgroundColor: accent, color: '#ffffff' }
                  : { backgroundColor: mix(accent, 0.1), color: accent }
              }
            >
              {k === 'all' ? 'All' : STREAMS[k].label}
            </button>
          )
        })}
      </div>

      <Rule label="Find" />
      <FindField value={query} onChange={setQuery} placeholder="Animal ID, species, vaccine, treatment" />
      <SearchResults query={query} />
    </Section>
  )
}

/**
 * What the search finds, and only while something is typed.
 *
 * Bounded by construction rather than by a cap on a big scan: species and agents are short
 * registries, and an animal id is decoded rather than searched — `ANM-AQ03-00142` resolves
 * to one animal without a single row being read. Nothing here loads a population.
 */
function SearchResults({ query }: { query: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const q = query.trim().toLowerCase()

  const hits = useMemo(() => {
    if (q.length < 2) return []
    const out: { key: string; label: string; sub: string; onOpen: () => void }[] = []

    /* An id typed in full is a direct hit and is never ranked against anything. */
    const id = q.toUpperCase().startsWith('ANM-') ? q.toUpperCase() : `ANM-${q.toUpperCase()}`
    if (decodeAnimalId(id)) {
      out.push({
        key: id,
        label: id,
        sub: 'Animal',
        onOpen: () => open({ title: id, eyebrow: 'Animal', body: <AnimalPreventiveSheet animalId={id} /> }),
      })
    }

    for (const stream of STREAM_LIST) {
      for (const a of byDimension(scope, stream.activity, 'detail')) {
        if (!a.label.toLowerCase().includes(q) || out.length >= 12) continue
        out.push({
          key: `${stream.key}:${a.label}`,
          label: a.label,
          sub: `${stream.agent} · ${fmt(a.value)} ${stream.noun}`,
          onOpen: () =>
            open({ title: a.label, eyebrow: stream.label, body: <AgentSheet stream={stream} agent={a.label} /> }),
        })
      }
    }

    const seen = new Set<string>()
    for (const site of SITES) {
      if (scope.site && site.key !== scope.site.key) continue
      for (const sp of speciesIn(site.key)) {
        if (out.length >= 18 || seen.has(sp.name) || !sp.name.toLowerCase().includes(q)) continue
        seen.add(sp.name)
        out.push({
          key: sp.id,
          label: sp.name,
          sub: `Species · ${sp.cls} · ${site.name}`,
          onOpen: () =>
            open({
              title: sp.name,
              eyebrow: 'Species',
              body: <SpeciesSheet stream={STREAMS.vaccination} speciesName={sp.name} speciesId={sp.id} />,
            }),
        })
      }
    }

    return out
  }, [q, scope, open])

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

/* ── 3 · the overview ────────────────────────────────────────────────────── */

/** The three programmes as three doors — activity, movement, and what is outstanding. */
function Overview() {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)

  return (
    <Wide>
      <Section icon={ShieldPlus} label="Preventive care" aside={scope.win.window}>
        <div className="grid gap-[var(--gap)] @[640px]:grid-cols-3">
          {STREAM_LIST.map((stream) => (
            <OverviewCard
              key={stream.key}
              stream={stream}
              site={site}
              onOpen={() =>
                open({ title: stream.label, eyebrow: scopeLine(scope), body: <StreamSheet stream={stream} /> })
              }
            />
          ))}
        </div>
      </Section>
    </Wide>
  )
}

function OverviewCard({ stream, site, onOpen }: { stream: Stream; site: string | null; onOpen: () => void }) {
  const { scope } = useScope()
  const Glyph = STREAM_ICON[stream.key]
  const given = activityOf(scope, stream)
  const cover = coverageOf(site, stream)
  const rows = useMemo(() => roster(site, stream), [site, stream])
  const overdue = rows.filter((r) => r.daysOverdue > 0).length

  /* The change against the preceding window of equal length, from the same series — not an
     authored "+12%" that stays +12% however the reader cuts the dates. */
  const move = useMemo(() => {
    const prevFrom = scope.win.from - scope.win.days
    const before = SITES.filter((s) => !site || s.key === site).reduce(
      (n, s) => n + sumIn(stream.activity, s.key, prevFrom, scope.win.from - 1),
      0,
    )
    if (!before) return undefined
    return ((given - before) / before) * 100
  }, [scope.win.from, scope.win.days, site, stream.activity, given])

  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-press -mx-2 block rounded-[12px] px-2 py-2.5 text-left"
    >
      <span className="flex items-center gap-2">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-[9px]"
          style={{ backgroundColor: mix(stream.accent, 0.12) }}
          aria-hidden
        >
          <Glyph size={15} strokeWidth={1.9} style={{ color: stream.accent }} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[#1c1a16]">{stream.label}</span>
        <span className="shrink-0 text-[11px] font-semibold" style={{ color: ACCENT_INK }}>
          ›
        </span>
      </span>

      <span className="mt-2.5 flex items-baseline gap-2">
        <Figure value={fmt(given)} size={30} color={HERO_INK} />
        {move !== undefined && (
          <span
            className="shrink-0 text-[11.5px] font-semibold tabular-nums"
            style={{ color: move > 0 ? '#1e7a44' : move < 0 ? TONE.warn : FAINT }}
          >
            {move > 0 ? '+' : ''}
            {move.toFixed(0)}%
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-[11.5px]" style={{ color: FAINT }}>
        {stream.noun} · {scope.win.label.toLowerCase()}
      </span>

      <span className="mt-2.5 flex items-center gap-2 border-t border-[#f0efec] pt-2.5">
        {cover ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: FAINT }}>
              {Math.round(cover.percent)}% covered · {fmt(cover.covered)}/{fmt(cover.herd)}
            </span>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: TONE.bad }}>
              {overdue} overdue
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: FAINT }}>
            Activity only · no due schedule
          </span>
        )}
      </span>
    </button>
  )
}

/* ── 4 · vaccination trend ───────────────────────────────────────────────── */

/**
 * The window as a schedule grid — one square per day, week or month, whichever the window
 * length makes readable. Tap a square for what happened in it.
 */
function VaccinationTrend() {
  const { scope } = useScope()
  const { open } = useSheet()
  const stream = STREAMS.vaccination
  const site = siteKeyOf(scope)

  const { cells, grain } = useMemo(
    () =>
      gridCells(scope.win, (from, to) =>
        SITES.filter((s) => !site || s.key === site).reduce((n, s) => n + sumIn(stream.activity, s.key, from, to), 0),
      ),
    [scope.win, site, stream.activity],
  )

  const total = cells.reduce((n, c) => n + c.value, 0)
  const busiest = cells.reduce((a, b) => (b.value > a.value ? b : a), cells[0])

  return (
    <Section icon={CalendarClock} label="Vaccination trend" aside={`${fmt(total)} · ${scope.win.window}`}>
      <ScheduleGrid
        cells={cells}
        grain={grain}
        onOpen={(c) =>
          open({
            title: `${stream.label} · ${c.label}`,
            eyebrow: scopeLine(scope),
            body: <PeriodSheet stream={stream} from={c.from} to={c.to} label={c.label} />,
          })
        }
      />
      {busiest && busiest.value > 0 && (
        <>
          <Rule label="Busiest" />
          <Facts
            items={[
              { label: `Heaviest ${grain}`, sub: 'Tap any square for its records', value: fmt(busiest.value) },
              {
                label: `Average per ${grain}`,
                value: fmt(Math.round(total / Math.max(1, cells.filter((c) => c.value > 0).length))),
              },
            ]}
          />
        </>
      )}
    </Section>
  )
}

/* ── 5 · vaccination overdue ─────────────────────────────────────────────── */

function VaccinationOverdue() {
  return <OverdueBlock stream={STREAMS.vaccination} label="Vaccination overdue" />
}

function DewormingOverdue() {
  return <OverdueBlock stream={STREAMS.deworming} label="Deworming overdue" />
}

/**
 * The four due-status buckets, with more than fifteen days given its own weight.
 *
 * Read today and captioned as such, whatever the date filter says. The buckets sum to the
 * coverage gap — 190 animals uncovered is 190 animals in these four rungs — so the ladder
 * and the coverage percentage above it are the same statement.
 */
function OverdueBlock({ stream, label }: { stream: Stream; label: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)

  const rows = useMemo(() => buckets(site, stream), [site, stream])
  const all = useMemo(() => roster(site, stream), [site, stream])
  const overdue = all.filter((r) => r.daysOverdue > 0).length
  const over15 = all.filter((r) => r.daysOverdue > 15).length

  return (
    <Section icon={TriangleAlert} label={label} aside="due status · today">
      <Snapshot
        cols={3}
        items={[
          { label: 'Outstanding', value: fmt(all.length), note: scope.site ? scope.site.name : 'all sites' },
          { label: 'Overdue', value: fmt(overdue), tone: 'warn' },
          { label: 'Over 15 days', value: fmt(over15), tone: 'bad' },
        ]}
      />
      <Rule label="By lateness" />
      <OverdueLadder
        rows={rows.map((r) => ({ bucket: r.bucket, value: r.value, over15: r.bucket === 'Over 15 days' }))}
        onOpen={(bucket) =>
          open({
            title: `${stream.label} · ${bucket}`,
            eyebrow: scope.site?.name ?? 'Overall',
            body: <OverdueSheet stream={stream} bucket={bucket} />,
          })
        }
      />
    </Section>
  )
}

/* ── 6 · over fifteen days ───────────────────────────────────────────────── */

/**
 * The one section this page would keep if it could keep only one.
 *
 * Fifteen days is the line between a scheduling slip and a compliance finding, so the
 * animals past it get their own count, their own site distribution and their own species
 * distribution — the three facts that turn "57 animals" into somebody's Monday.
 */
function BadlyOverdue() {
  const { scope } = useScope()
  const { open } = useSheet()
  const stream = STREAMS.vaccination
  const site = siteKeyOf(scope)

  const sites = useMemo(() => overdueBySite(site, stream, 16), [site, stream])
  const species = useMemo(() => overdueBySpecies(site, stream, 16).slice(0, 8), [site, stream])
  const total = sites.reduce((n, s) => n + s.value, 0)
  const widestSite = Math.max(...sites.map((s) => s.value), 1)
  const widestSpecies = Math.max(...species.map((s) => s.value), 1)

  return (
    <Section icon={TriangleAlert} label="Over 15 days overdue" aside="vaccination · today">
      <div className="flex items-end gap-4">
        <span>
          <Figure value={fmt(total)} size={44} color={TONE.bad} />
          <p className="mt-1 text-[13px]" style={{ color: TONE.bad }}>
            animals past 15 days
          </p>
        </span>
        <span className="flex-1 pb-1 text-right text-[11px]" style={{ color: FAINT }}>
          {sites.length} {sites.length === 1 ? 'site' : 'sites'} · {species.length} species
        </span>
      </div>

      {total === 0 ? (
        <p className="mt-3 text-[12.5px]" style={{ color: FAINT }}>
          Nothing more than fifteen days overdue{scope.site ? ` at ${scope.site.name}` : ''}.
        </p>
      ) : (
        <>
          <Rule label="By site" />
          <DrillList>
            {sites.map((s) => (
              <DrillRow
                key={s.id}
                label={s.label}
                value={fmt(s.value)}
                tone="bad"
                bar={(s.value / widestSite) * 100}
                onOpen={() =>
                  open({
                    title: s.label,
                    eyebrow: 'Over 15 days › Site',
                    body: <OverdueSheet stream={stream} minDays={16} siteKey={s.id} />,
                  })
                }
              />
            ))}
          </DrillList>

          <Rule label="By species" />
          <DrillList>
            {species.map((s) => (
              <DrillRow
                key={s.id}
                label={s.label}
                sub={s.sub}
                value={fmt(s.value)}
                tone="bad"
                bar={(s.value / widestSpecies) * 100}
                onOpen={() =>
                  open({
                    title: s.label,
                    eyebrow: 'Over 15 days › Species',
                    body: <SpeciesSheet stream={stream} speciesName={s.label} speciesId={s.id} />,
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

/* ── 7 · site-wise, for one stream ───────────────────────────────────────── */

const SORTS: Record<string, (r: SiteLine) => number> = {
  given: (r) => r.given,
  overdue: (r) => r.overdue,
  over15: (r) => r.over15,
  covered: (r) => r.percent,
}

function StreamSites({ stream }: { stream: Stream }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const [sortKey, setSortKey] = useState('given')

  const rows = useMemo(() => {
    const lines = siteLines(scope, stream)
    const by = SORTS[sortKey] ?? SORTS.given
    return [...lines].sort((a, b) => by(b) - by(a))
  }, [scope, stream, sortKey])

  const columns: Column<SiteLine>[] = [
    { key: 'given', head: stream.label === 'Vaccination' ? 'Given' : 'Treated', cell: (r) => fmt(r.given), sort: SORTS.given },
    { key: 'covered', head: 'Covered', cell: (r) => `${Math.round(r.percent)}%`, sort: SORTS.covered },
    { key: 'overdue', head: 'Overdue', cell: (r) => fmt(r.overdue), sort: SORTS.overdue, tone: () => 'warn' },
    { key: 'over15', head: '>15 d', cell: (r) => fmt(r.over15), sort: SORTS.over15, tone: (r) => (r.over15 ? 'bad' : undefined) },
    { key: 'species', head: 'Species', cell: (r) => fmt(r.species), compact: false },
  ]

  return (
    <Wide>
      <Section icon={MapPin} label={`${stream.label} by site`} aside={`${rows.length} · sortable`}>
      <SortableList
        rows={rows}
        columns={columns}
        sortKey={sortKey}
        onSort={setSortKey}
        name={(r) => r.site.name}
        sub={(r) => `${r.site.code} · ${fmt(r.covered)}/${fmt(r.herd)} covered`}
        onOpen={(r) =>
          open({
            title: r.site.name,
            eyebrow: `${stream.label} › Site`,
            body: <StreamSiteSheet stream={stream} siteKey={r.site.key} />,
          })
        }
        />
      </Section>
    </Wide>
  )
}

/* ── 8 · species-wise, for one stream ────────────────────────────────────── */

/**
 * Ninety-seven species, searched and paged rather than rendered whole.
 *
 * The brief's "do not create hundreds of large cards" and "all species must remain
 * accessible" are the same requirement read from two ends, and one list satisfies both:
 * twenty rows at a time, a search over the whole set, and the real total stated above.
 */
function StreamSpecies({ stream }: { stream: Stream }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const [query, setQuery] = useState('')
  const site = siteKeyOf(scope)

  const all = useMemo(() => {
    const given = bySpecies(scope, stream.activity)
    const late = new Map<string, { overdue: number; over15: number }>()
    for (const r of roster(site, stream)) {
      if (r.daysOverdue <= 0) continue
      const at = late.get(r.speciesName) ?? { overdue: 0, over15: 0 }
      at.overdue++
      if (r.daysOverdue > 15) at.over15++
      late.set(r.speciesName, at)
    }
    return given
      .map((g) => ({ ...g, ...(late.get(g.label) ?? { overdue: 0, over15: 0 }) }))
      .filter((g) => g.value > 0 || g.overdue > 0)
  }, [scope, stream, site])

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => (q ? all.filter((r) => r.label.toLowerCase().includes(q) || (r.sub ?? '').toLowerCase().includes(q)) : all), [all, q])
  const page = usePaged(
    (offset, limit) => ({ rows: filtered.slice(offset, offset + limit), total: filtered.length }),
    20,
    [filtered.length, q, stream.key],
  )

  return (
    <Wide>
      <Section icon={Dna} label={`${stream.label} by species`} aside={`${all.length} species`}>
      <FindField value={query} onChange={setQuery} placeholder="Find a species" />
      <div className="mt-3">
        <DrillList>
          {page.rows.map((r) => (
            <DrillRow
              key={r.id}
              label={r.label}
              sub={`${r.sub ?? ''}${r.overdue ? ` · ${r.overdue} overdue${r.over15 ? `, ${r.over15} over 15 d` : ''}` : ''}`}
              value={fmt(r.value)}
              tone={r.over15 ? 'bad' : r.overdue ? 'warn' : undefined}
              bar={r.percent}
              onOpen={() =>
                open({
                  title: r.label,
                  eyebrow: `${stream.label} › Species`,
                  body: <SpeciesSheet stream={stream} speciesName={r.label} speciesId={r.id} />,
                })
              }
            />
          ))}
        </DrillList>
          <MoreRows page={page} noun="species" />
        </div>
      </Section>
    </Wide>
  )
}

/* ── 9 · deworming ───────────────────────────────────────────────────────── */

/** The anthelmintic rotation — the mark that is this programme's and nothing else's. */
function DewormingRotation() {
  const { scope } = useScope()
  const { open } = useSheet()
  const stream = STREAMS.deworming
  const site = siteKeyOf(scope)

  const drugs = useMemo(() => byDimension(scope, stream.activity, 'detail'), [scope, stream.activity])
  const cover = coverageOf(site, stream)
  const given = activityOf(scope, stream)

  return (
    <Section icon={Activity} label="Deworming" aside={`${fmt(given)} · ${scope.win.window}`}>
      {cover && (
        <>
          <Snapshot
            cols={3}
            items={[
              { label: 'Dewormed', value: fmt(cover.covered), note: `of ${fmt(cover.herd)}` },
              { label: 'Coverage', value: `${Math.round(cover.percent)}`, unit: '%' },
              { label: 'Outstanding', value: fmt(cover.outstanding), tone: 'warn' },
            ]}
          />
          <Rule label="Rotation" />
        </>
      )}
      <RotationCycle
        items={drugs.map((d) => ({ id: d.id, label: d.label, value: d.value }))}
        unit={stream.noun}
        onOpen={(id) => {
          const drug = drugs.find((d) => d.id === id)
          if (!drug) return
          open({ title: drug.label, eyebrow: 'Deworming › Treatment', body: <AgentSheet stream={stream} agent={drug.label} /> })
        }}
      />
    </Section>
  )
}

/**
 * Deworming over the window as compact activity columns.
 *
 * Deliberately not the schedule grid above: worming runs as rounds on a cycle, so what
 * matters is the height of each round against the last, and columns say that in a tenth of
 * the space a grid needs. Two programmes, two marks, one page.
 */
function DewormingTrend() {
  const { scope } = useScope()
  const { open } = useSheet()
  const stream = STREAMS.deworming
  const site = siteKeyOf(scope)

  const n = scope.win.days <= 14 ? Math.max(1, scope.win.days) : 12
  const buckets = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const from = scope.win.from + Math.floor((i * scope.win.days) / n)
        const to = scope.win.from + Math.floor(((i + 1) * scope.win.days) / n) - 1
        const value = SITES.filter((s) => !site || s.key === site).reduce(
          (sum, s) => sum + sumIn(stream.activity, s.key, from, Math.max(from, to)),
          0,
        )
        return { from, to: Math.max(from, to), value }
      }),
    [scope.win, site, stream.activity, n],
  )

  const peak = buckets.reduce((a, b) => (b.value > a.value ? b : a), buckets[0])

  return (
    <Section icon={Activity} label="Deworming trend" aside={`${scope.win.label.toLowerCase()} · ${n} periods`}>
      <Columns
        values={buckets.map((b) => b.value)}
        labels={[scope.win.window]}
        highlight={buckets.indexOf(peak)}
        unit={`${stream.noun} · ${scope.win.window}`}
      />
      <Rule label="Periods" />
      <DrillList>
        {buckets
          .map((b, i) => ({ ...b, i }))
          .filter((b) => b.value > 0)
          .slice(-6)
          .reverse()
          .map((b) => (
            <DrillRow
              key={b.i}
              label={`Period ${b.i + 1}`}
              sub={`${b.to - b.from + 1} days`}
              value={fmt(b.value)}
              onOpen={() =>
                open({
                  title: `Deworming · period ${b.i + 1}`,
                  eyebrow: scopeLine(scope),
                  body: <PeriodSheet stream={stream} from={b.from} to={b.to} label={`Period ${b.i + 1}`} />,
                })
              }
            />
          ))}
      </DrillList>
    </Section>
  )
}

/* ── 10 · supplements ────────────────────────────────────────────────────── */

function Supplements() {
  const { scope } = useScope()
  const { open } = useSheet()
  const stream = STREAMS.supplement
  const site = siteKeyOf(scope)

  const items = useMemo(() => byDimension(scope, stream.activity, 'detail'), [scope, stream.activity])
  const given = activityOf(scope, stream)
  const sites = SITES.filter((s) => !site || s.key === site)

  return (
    <Section icon={ClipboardList} label="Supplements" aside={`${fmt(given)} · ${scope.win.window}`}>
      <Snapshot
        cols={3}
        items={[
          { label: 'Administered', value: fmt(given), note: scope.win.label.toLowerCase() },
          { label: 'Supplements', value: String(items.length) },
          { label: 'Sites', value: String(sites.length) },
        ]}
      />
      <Rule label="What went out" />
      <UsageSplit
        items={items.map((i) => ({ id: i.id, label: i.label, value: i.value }))}
        onOpen={(id) => {
          const it = items.find((x) => x.id === id)
          if (!it) return
          open({ title: it.label, eyebrow: 'Supplements › Supplement', body: <AgentSheet stream={stream} agent={it.label} /> })
        }}
      />
    </Section>
  )
}

/** Supplements over time — a level, drawn as one, because it is a routine and not a round. */
function SupplementTrend() {
  const { scope } = useScope()
  const { open } = useSheet()
  const stream = STREAMS.supplement
  const site = siteKeyOf(scope)

  const n = Math.min(24, Math.max(2, scope.win.days))
  const buckets = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const from = scope.win.from + Math.floor((i * scope.win.days) / n)
        const to = Math.max(from, scope.win.from + Math.floor(((i + 1) * scope.win.days) / n) - 1)
        return {
          from,
          to,
          value: SITES.filter((s) => !site || s.key === site).reduce(
            (sum, s) => sum + sumIn(stream.activity, s.key, from, to),
            0,
          ),
        }
      }),
    [scope.win, site, stream.activity, n],
  )

  const sites = useMemo(
    () => siteLines(scope, stream).sort((a, b) => b.given - a.given),
    [scope, stream],
  )
  const widest = Math.max(...sites.map((s) => s.given), 1)

  return (
    <Section icon={ClipboardList} label="Supplement trend" aside={scope.win.window}>
      <Trend
        values={buckets.map((b) => b.value)}
        labels={[scope.win.window]}
        unit={`${stream.noun} · ${scope.win.window}`}
      />
      <Rule label="By site" />
      <DrillList>
        {sites.map((s) => (
          <DrillRow
            key={s.site.key}
            label={s.site.name}
            sub={`${s.species} species`}
            value={fmt(s.given)}
            bar={(s.given / widest) * 100}
            onOpen={() =>
              open({
                title: s.site.name,
                eyebrow: 'Supplements › Site',
                body: <StreamSiteSheet stream={stream} siteKey={s.site.key} />,
              })
            }
          />
        ))}
      </DrillList>
    </Section>
  )
}

/* ── 11 · the consolidated site comparison ───────────────────────────────── */

const SITE_SORTS: Record<string, (r: PreventiveSiteLine) => number> = {
  vaccinations: (r) => r.vaccinations,
  vaccinationOverdue: (r) => r.vaccinationOverdue,
  vaccinationOver15: (r) => r.vaccinationOver15,
  deworming: (r) => r.deworming,
  dewormingOverdue: (r) => r.dewormingOverdue,
  supplements: (r) => r.supplements,
}

function SiteComparison() {
  const { scope } = useScope()
  const { open } = useSheet()
  const [sortKey, setSortKey] = useState('vaccinationOver15')

  const rows = useMemo(() => {
    const by = SITE_SORTS[sortKey] ?? SITE_SORTS.vaccinations
    return [...preventiveSiteLines(scope)].sort((a, b) => by(b) - by(a))
  }, [scope, sortKey])

  const columns: Column<PreventiveSiteLine>[] = [
    { key: 'vaccinations', head: 'Vacc', cell: (r) => fmt(r.vaccinations), sort: SITE_SORTS.vaccinations },
    { key: 'vaccinationOverdue', head: 'Vacc late', cell: (r) => fmt(r.vaccinationOverdue), sort: SITE_SORTS.vaccinationOverdue, tone: () => 'warn' },
    {
      key: 'vaccinationOver15',
      head: '>15 d',
      cell: (r) => fmt(r.vaccinationOver15),
      sort: SITE_SORTS.vaccinationOver15,
      tone: (r) => (r.vaccinationOver15 ? 'bad' : undefined),
    },
    { key: 'deworming', head: 'Deworm', cell: (r) => fmt(r.deworming), sort: SITE_SORTS.deworming },
    { key: 'dewormingOverdue', head: 'Deworm late', cell: (r) => fmt(r.dewormingOverdue), sort: SITE_SORTS.dewormingOverdue, tone: () => 'warn' },
    { key: 'supplements', head: 'Suppl', cell: (r) => fmt(r.supplements), sort: SITE_SORTS.supplements },
  ]

  return (
    <Wide>
      <Section icon={MapPin} label="Site-wise preventive care" aside={`${rows.length} · sortable`}>
      <SortableList
        rows={rows}
        columns={columns}
        sortKey={sortKey}
        onSort={setSortKey}
        name={(r) => r.site.name}
        sub={(r) => `${r.site.code} · ${r.site.enclosures} enclosures`}
        onOpen={(r) =>
          open({
            title: r.site.name,
            eyebrow: `Preventive care · ${scope.win.window}`,
            body: <SitePreventiveSheet siteKey={r.site.key} />,
          })
        }
        />
      </Section>
    </Wide>
  )
}

/* ── 12 · the consolidated species list ──────────────────────────────────── */

function SpeciesComparison() {
  const { scope } = useScope()
  const { open } = useSheet()
  const [query, setQuery] = useState('')

  const all = useMemo(() => speciesLines(scope), [scope])
  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => (q ? all.filter((r) => r.name.toLowerCase().includes(q) || r.cls.toLowerCase().includes(q) || r.siteName.toLowerCase().includes(q)) : all),
    [all, q],
  )
  const page = usePaged<SpeciesLine>(
    (offset, limit) => ({ rows: filtered.slice(offset, offset + limit), total: filtered.length }),
    20,
    [filtered.length, q],
  )

  return (
    <Wide>
      <Section icon={Dna} label="Species-wise preventive care" aside={`${all.length} species`}>
      <FindField value={query} onChange={setQuery} placeholder="Common name, class or site" />
      <div className="mt-3">
        <DrillList>
          {page.rows.map((r) => (
            <DrillRow
              key={r.id}
              label={r.name}
              sub={`${r.cls} · ${r.siteName}${r.vaccinationOverdue || r.dewormingOverdue ? ` · ${r.vaccinationOverdue + r.dewormingOverdue} overdue` : ''}`}
              value={fmt(r.vaccinations + r.deworming + r.supplements)}
              tone={r.vaccinationOverdue || r.dewormingOverdue ? 'warn' : undefined}
              onOpen={() =>
                open({
                  title: r.name,
                  eyebrow: 'Preventive care › Species',
                  body: <SpeciesSheet stream={STREAMS.vaccination} speciesName={r.name} speciesId={r.id} />,
                })
              }
            />
          ))}
        </DrillList>
        <MoreRows page={page} noun="species" />
      </div>
      {/* The three programmes for one species live in the sheet's own tabs of sections; this
          list leads with the total so a reader can sort by "most preventive activity" and
          then read the split inside. */}
        <p className="pt-3 text-[11px]" style={{ color: FAINT }}>
          Figure is all three programmes combined · {scope.win.window}
        </p>
      </Section>
    </Wide>
  )
}
