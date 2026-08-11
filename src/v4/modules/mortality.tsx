/**
 * MORTALITY & NECROPSY — how many died, where, why, and what the bench found.
 *
 * EVERY FIGURE ON THIS PAGE IS ONE READ OF ONE SET OF DEATHS. The page computes the window's
 * deaths once, narrows them by whatever contextual filter is active, and hands that single
 * array to all twelve sections. The hero, the trend, the site ladder, the species table, the
 * regulatory bands, the cause Pareto, the necropsy queue, the six benches and the records are
 * therefore the same rows counted nine ways — they sum to the hero because there is nothing
 * else for them to sum to, and they recut together because they are one array.
 *
 * That is the brief's §16, and it is the requirement the previous version of this page failed
 * hardest. It stated a scoped hero and then, underneath it, "against 215,432 held", "23 deaths",
 * six typed cause rows, a typed Schedule I count and a typed necropsy queue of fourteen cases at
 * a suite that does not exist in the data model. Scope to Carnivore Ridge for the last seven
 * days and the hero read 0 while five cards below it went on describing the whole collection in
 * July. Six contradictions on one screen, each individually plausible.
 *
 * WHAT MADE THE REGULATORY AND NECROPSY CARDS FIXABLE. The old file argued in a comment that
 * both were unscopeable because "there is no Schedule I flag in the data model". There is:
 * `modules/regulatory.ts` declares the CITES appendix and the Wildlife Protection Act schedule
 * for all 97 species, and a death carries a species. And a necropsy bench does not have to be
 * invented either — `core/world.ts` already holds two pathology laboratories with real
 * departmental turnarounds and four veterinary facilities that can host a gross post-mortem. So
 * both cards are now derived, scoped, and drillable to the animal. See `mortalityData.ts`.
 *
 * THE FILTERS ARE CONTEXTUAL, AND THEY ARE THE PAGE'S OWN. Date and site stay in the global
 * scope, where every module reads them and no page can hold a second opinion. Cause, regulatory
 * instrument and necropsy status are levels that only mortality has, so they are a filter here
 * rather than a fourth thing in the global header — the brief's §15. When one is active the hero
 * says so, because a hero reading 9 under a page titled Mortality had better name the nine.
 *
 * MORTALITY IS THE ONE MODULE WHERE UP IS BAD. Every other page in this product reads a rise as
 * progress. A green "+18%" over a rising death count would be the most misleading mark on the
 * screen, so the change tone is inverted here — deliberately, in `changeTone`, once, rather than
 * per card.
 *
 * WHAT IS NOT HERE. No medical cases, hospitalisation, pharmacy stock, lab throughput,
 * vaccination, natality, egg or food figures — those are their own modules and the brief's §23
 * rules them out. No recommendation, no forecast, no "needs attention". Fetal death is a
 * separate module and is not folded in: a fetal loss is not an animal in the collection dying.
 */

import { useMemo, useState } from 'react'
import {
  Activity,
  Building2,
  ClipboardList,
  Dna,
  FileSearch,
  FlaskConical,
  MapPin,
  ScrollText,
  Skull,
  SlidersHorizontal,
  TrendingDown,
} from 'lucide-react'
import { shortDate } from '../../core/calendar'
import { siteKeyOf } from '../../core/scope'
import {
  ACCENT_INK,
  AccentProvider,
  FAINT,
  Facts,
  Figure,
  HERO_INK,
  Pareto,
  Rule,
  Section,
  Snapshot,
  Stack,
  TONE,
  TRACK,
  fmt,
  mix,
  useAccent,
} from '../../exec/system'
import { strip } from '../../exec/marks'
import { RangeTabs, useChartRange } from '../../exec/range'
import { MoreRows, usePaged } from '../perf'
import { FindField } from '../filters'
import { useScope } from '../scope'
import { useSheet } from '../sheet'
import { DrillList, DrillRow } from './kit'
import { RankTable, type Col } from './mortalityTable'
import {
  AnimalMortalitySheet,
  CauseSheet,
  CentreSheet,
  DeathRows,
  DeathListSheet,
  NecropsyRows,
  PeriodSheet,
  RegulatorySheet,
  SearchSheet,
  SiteMortalitySheet,
  SpeciesMortalitySheet,
  SpeciesNecropsySheet,
} from './mortalitySheets'
import {
  CENTRES,
  MORTALITY_ACCENT,
  STATUSES,
  STATUS_TONE,
  byCause,
  bySpeciesSlice,
  centreLines,
  changeLabel,
  changeTone,
  citesBands,
  deathsBefore,
  deathsIn,
  grainsFor,
  necropsiesOf,
  regulatorySplit,
  scheduleBands,
  scopeLine,
  searchDeaths,
  siteLines,
  speciesLines,
  trend,
  type CentreLine,
  type Death,
  type Grain,
  type SiteLine,
  type SpeciesLine,
} from './mortalityData'

/* ── the contextual filter ───────────────────────────────────────────────── */

/**
 * The three narrowings only this module has.
 *
 * Kept in one object so that adding a filter cannot accidentally miss a section: every card
 * reads the already-filtered array, and none of them knows a filter exists.
 */
interface Cut {
  cause?: string
  /** A regulatory band — 'Regulatory', 'Non-regulatory', 'CITES I', 'Schedule I', … */
  band?: string
  /** A necropsy status, or the deliberate 'Not referred'. */
  status?: string
}

const BANDS = ['Regulatory', 'Non-regulatory', 'CITES I', 'CITES II', 'CITES III', 'Schedule I', 'Schedule II', 'Schedule III']
const STATUS_OPTIONS = [...STATUSES, 'Not referred']

const matchesBand = (d: Death, band: string): boolean => {
  switch (band) {
    case 'Regulatory':
      return d.regulated
    case 'Non-regulatory':
      return !d.regulated
    case 'CITES I':
    case 'CITES II':
    case 'CITES III':
      return d.cites === band.slice(6)
    default:
      return d.schedule === band.slice(9)
  }
}

const applyCut = (rows: Death[], cut: Cut): Death[] =>
  rows.filter(
    (d) =>
      (!cut.cause || d.cause === cut.cause) &&
      (!cut.band || matchesBand(d, cut.band)) &&
      (!cut.status || (cut.status === 'Not referred' ? !d.necropsy : d.necropsy?.status === cut.status)),
  )

/** "Disease · Schedule I · Awaiting", or nothing when the page is unfiltered. */
const cutLabel = (cut: Cut): string | undefined =>
  [cut.cause, cut.band, cut.status].filter(Boolean).join(' · ') || undefined

/* ── the page ────────────────────────────────────────────────────────────── */

export default function Mortality() {
  const { scope } = useScope()
  const [cut, setCut] = useState<Cut>({})

  /* Read once, narrow once. Every section below takes `rows` and nothing else, which is what
     makes the whole page agree with its own hero at any scope and under any filter. */
  const all = useMemo(() => deathsIn(scope), [scope])
  const rows = useMemo(() => applyCut(all, cut), [all, cut])
  const prev = useMemo(() => applyCut(deathsBefore(scope), cut), [scope, cut])

  return (
    <AccentProvider value={MORTALITY_ACCENT}>
      <MortalityHero rows={rows} prev={prev} cut={cut} />
      <Stack>
        <Toolbar all={all} rows={rows} cut={cut} onCut={setCut} />

        {/* The trend takes the contextual filter rather than the filtered rows: it reads its
            own range, which is usually wider than the page's window. */}
        <Wide>
          <MortalityTrend cut={cut} />
        </Wide>
        <Wide>
          <SiteWise rows={rows} prev={prev} />
        </Wide>
        <Wide>
          <SpeciesWise rows={rows} />
        </Wide>
        <MajorImpact rows={rows} />
        <CauseOfDeath rows={rows} />
        <RegulatoryMortality rows={rows} />
        <NecropsyOverview rows={rows} />

        <Wide>
          <CentreWise rows={rows} />
        </Wide>
        <Wide>
          <NecropsySpeciesWise rows={rows} />
        </Wide>
        <Wide>
          <RecordsSection rows={rows} />
        </Wide>
      </Stack>
    </AccentProvider>
  )
}

/**
 * A section that keeps the whole column past the two-column break.
 *
 * `Stack` splits at 760px of column and a container query inside a section still measures the
 * column, so a table told to appear at 720 would appear inside a 455px half. The data-dense
 * sections say so; the compact ones stay half-width, where they read better paired than
 * stretched — which is also the brief's §20 split of main against supporting.
 */
const Wide = ({ children }: { children: React.ReactNode }) => (
  <div className="min-w-0 @[760px]:col-span-2">{children}</div>
)

/* ── 1 · the hero · the brief's §2 ──────────────────────────────────────── */

/**
 * ONE NUMBER, AND IT ANSWERS THE QUESTION THE PAGE IS OPENED WITH.
 *
 * The brief asks for total mortality, its change against the previous period, and the window —
 * and explicitly for no unnecessary KPI cards. So there is one figure at full size, the change
 * beside it, and four supporting figures under a rule where they are read second because they
 * are read second. The necropsy figures are up here rather than only in their own section
 * because "how many of these deaths were investigated" is part of the headline, not a footnote.
 */
function MortalityHero({ rows, prev, cut }: { rows: Death[]; prev: Death[]; cut: Cut }) {
  const { scope } = useScope()
  const referred = necropsiesOf(rows)
  const completed = referred.filter((d) => d.necropsy!.status === 'Completed').length
  const pending = referred.length - completed
  const regulated = rows.filter((d) => d.regulated).length
  const change = prev.length ? ((rows.length - prev.length) / prev.length) * 100 : undefined
  const tone = changeTone(change)
  const label = changeLabel(change, 'the previous period')
  const active = cutLabel(cut)

  return (
    <div className="w-full px-[var(--gutter-lg)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-end justify-between gap-4">
          <span className="min-w-0">
            <Figure value={fmt(rows.length)} size={64} color={HERO_INK} />
            <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
              <Activity size={15} strokeWidth={1.75} style={{ color: MORTALITY_ACCENT }} aria-hidden />
              {active ? `Deaths · ${active}` : `Deaths · ${scope.win.label.toLowerCase()}`}
            </p>
          </span>
          <span className="shrink-0 pb-1 text-right text-caption" style={{ color: FAINT }}>
            {scopeLine(scope)}
            <br />
            {rows.length === 0 ? 'nothing recorded' : `${new Set(rows.map((d) => d.speciesName)).size} species`}
          </span>
        </div>

        {/* The change, and the tone inverted: a rise in deaths is not good news. */}
        {label && (
          <p className="mt-3 flex items-center gap-2">
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone] }} aria-hidden />
            <span className="text-small font-medium" style={{ color: TONE[tone] }}>
              {label}
            </span>
            <span className="text-caption" style={{ color: FAINT }}>
              {fmt(prev.length)} before
            </span>
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#f0efec] pt-4 @[520px]:grid-cols-4">
          {[
            {
              label: 'Necropsy rate',
              value: rows.length ? `${Math.round((referred.length / rows.length) * 100)}%` : '—',
              note: `${referred.length} referred`,
            },
            { label: 'Completed', value: fmt(completed), note: 'findings signed', tone: TONE.good },
            {
              label: 'Pending',
              value: fmt(pending),
              note: 'at the bench',
              tone: pending ? TONE.warn : undefined,
            },
            {
              label: 'Regulatory',
              value: fmt(regulated),
              note: 'CITES or schedule',
              tone: regulated ? TONE.bad : undefined,
            },
          ].map((f) => (
            <span key={f.label} className="min-w-0">
              <span
                className="block font-display text-n-sm font-bold tabular-nums"
                style={{ color: f.tone ?? HERO_INK }}
              >
                {f.value}
              </span>
              <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
                {f.label}
              </span>
              <span className="block truncate text-caption" style={{ color: '#c2bdb4' }}>
                {f.note}
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ── 2 · the toolbar · the brief's §15 and §17 ──────────────────────────── */

/**
 * Search, and the three contextual filters — not permanently expanded.
 *
 * The chip rows only offer values that are actually PRESENT in the window: a cause nobody died
 * of this month is not a filter worth a tap, and offering it produces the empty state that makes
 * a reader distrust the page. Each chip carries its count for the same reason — it tells you
 * whether the narrowing is worth the tap before you spend it.
 */
function Toolbar({
  all,
  rows,
  cut,
  onCut,
}: {
  all: Death[]
  rows: Death[]
  cut: Cut
  onCut: (c: Cut) => void
}) {
  const { open } = useSheet()
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(false)

  const causes = useMemo(() => byCause(all).map((c) => c.label), [all])
  const bands = useMemo(() => BANDS.filter((b) => all.some((d) => matchesBand(d, b))), [all])
  const statuses = useMemo(
    () => STATUS_OPTIONS.filter((s) => all.some((d) => (s === 'Not referred' ? !d.necropsy : d.necropsy?.status === s))),
    [all],
  )

  const hits = useMemo(() => searchDeaths(rows, query), [rows, query])
  const active = cutLabel(cut)

  return (
    <Section
      icon={SlidersHorizontal}
      label="Find & filter"
      aside={active ?? `${fmt(rows.length)} of ${fmt(all.length)}`}
    >
      <FindField
        value={query}
        onChange={setQuery}
        placeholder="Animal ID, species, site, cause, necropsy ID, centre"
      />

      {/* Results inline, so a search does not cost a sheet to read — but the full set is one
          tap away when the answer is a list rather than a glance. */}
      {query.trim().length > 0 && (
        <>
          <Rule label={`${hits.length} match${hits.length === 1 ? '' : 'es'}`} />
          {hits.length > 0 ? (
            <>
              <DrillList>
                {hits.slice(0, 5).map((d) => (
                  <DrillRow
                    key={d.id}
                    label={`${d.animalId} · ${d.speciesName}`}
                    sub={`${shortDate(d.day)} · ${d.cause} · ${d.siteName}`}
                    value={d.necropsy ? d.necropsy.id : 'No necropsy'}
                    tone={d.necropsy ? STATUS_TONE[d.necropsy.status] : undefined}
                    onOpen={() =>
                      open({
                        title: d.animalId,
                        eyebrow: `Search › Animal`,
                        body: <AnimalMortalitySheet death={d} />,
                      })
                    }
                  />
                ))}
              </DrillList>
              {hits.length > 5 && (
                <button
                  type="button"
                  onClick={() =>
                    open({ title: `“${query}”`, eyebrow: 'Search', body: <SearchSheet query={query} rows={hits} /> })
                  }
                  className="card-press mt-2 w-full rounded-full py-2 text-body font-medium"
                  style={{ backgroundColor: mix(MORTALITY_ACCENT, 0.09), color: ACCENT_INK }}
                >
                  All {hits.length} matches
                </button>
              )}
            </>
          ) : (
            <p className="text-caption" style={{ color: FAINT }}>
              Nothing matches “{query}” in this scope.
            </p>
          )}
        </>
      )}

      {/* The filters themselves stay folded until asked for — three permanent chip rows would
          be more control than the page needs to show at rest. */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="card-press rounded-full px-3 py-[6px] text-caption font-medium"
          style={{ backgroundColor: mix(MORTALITY_ACCENT, 0.09), color: ACCENT_INK }}
          aria-expanded={shown}
        >
          {shown ? 'Hide filters' : 'Filters'}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onCut({})}
            className="text-caption font-medium underline decoration-dotted underline-offset-2"
            style={{ color: FAINT }}
          >
            Clear {active}
          </button>
        )}
      </div>

      {shown && (
        <>
          <ChipRow
            label="Cause"
            options={causes}
            value={cut.cause}
            count={(o) => all.filter((d) => d.cause === o).length}
            onPick={(cause) => onCut({ ...cut, cause })}
          />
          <ChipRow
            label="Regulatory"
            options={bands}
            value={cut.band}
            count={(o) => all.filter((d) => matchesBand(d, o)).length}
            onPick={(band) => onCut({ ...cut, band })}
          />
          <ChipRow
            label="Necropsy status"
            options={statuses}
            value={cut.status}
            count={(o) => all.filter((d) => (o === 'Not referred' ? !d.necropsy : d.necropsy?.status === o)).length}
            onPick={(status) => onCut({ ...cut, status })}
          />
        </>
      )}
    </Section>
  )
}

/** One filter row. Tapping the active chip clears it, so a filter is never a one-way door. */
function ChipRow({
  label,
  options,
  value,
  count,
  onPick,
}: {
  label: string
  options: string[]
  value?: string
  count: (o: string) => number
  onPick: (v?: string) => void
}) {
  if (options.length === 0) return null
  return (
    <>
      <Rule label={label} />
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hidden">
        {options.map((o) => {
          const on = value === o
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? undefined : o)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-medium whitespace-nowrap transition-colors ${
                on ? 'text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
              }`}
              style={on ? { backgroundColor: MORTALITY_ACCENT } : undefined}
            >
              {o}
              <span className={`ml-1 tabular-nums ${on ? 'text-white/60' : 'text-[#9b958b]'}`}>{count(o)}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ── 3 · the trend · the brief's §3 ─────────────────────────────────────── */

/**
 * The window's actual shape, at a granularity the window can carry.
 *
 * TWO CONTROLS, BECAUSE THERE ARE TWO QUESTIONS. The range says how far back to look and is
 * the card's own — the page can sit on Today while this chart shows the quarter behind it,
 * which is the pairing an executive actually reads: one day's deaths, against the shape of the
 * three months that produced it. The grain says how finely to cut whatever range is chosen.
 * They used to be one control, and the result was that a page filtered to a single day drew a
 * trend of one column filling the whole card.
 *
 * The rows are re-read for the card's range rather than taken from the page, because the page's
 * rows stop at the page's window — a chart showing the quarter would otherwise draw one day of
 * data across thirteen empty weeks. The page's contextual filter still applies, so the cause or
 * schedule the reader narrowed to narrows the trend with it.
 *
 * Every column is countable and tappable, and the previous period is drawn behind it as a
 * ghost rather than a second row of bars: the question is "is this rising", and two series
 * competing for the same axis answers it worse than one with a watermark.
 */
function MortalityTrend({ cut }: { cut: Cut }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const accent = useAccent()
  const range = useChartRange()

  const rows = useMemo(() => applyCut(deathsIn({ ...scope, win: range.win }), cut), [scope, range.win, cut])
  const prev = useMemo(() => applyCut(deathsBefore({ ...scope, win: range.win }), cut), [scope, range.win, cut])

  const grains = useMemo(() => grainsFor(range.win), [range.win])
  const [grain, setGrain] = useState<Grain>(grains[grains.length - 1])

  /* The range can change under a grain that is no longer offered — picking Monthly on a year
     and then switching to Week must not leave the chart on a grain with one column. */
  const active = grains.includes(grain) ? grain : grains[grains.length - 1]
  const buckets = useMemo(() => trend(range.win, rows, prev, active), [range.win, rows, prev, active])

  const max = Math.max(...buckets.map((b) => Math.max(b.deaths, b.before ?? 0)), 1)
  const total = buckets.reduce((n, b) => n + b.deaths, 0)
  const bars = strip(buckets.length)

  return (
    <Section icon={TrendingDown} label="Mortality trend" aside={`${fmt(total)} · ${range.win.window}`}>
      <RangeTabs range={range} tone={MORTALITY_ACCENT} />

      {grains.length > 1 && (
        <div className="mb-4 flex gap-1.5">
          {grains.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={g === active}
              onClick={() => setGrain(g)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-medium transition-colors ${
                g === active
                  ? 'text-white'
                  : 'border border-[#e8e6e0] text-[#55524a] active:bg-[#f4f3ef]'
              }`}
              /* The grain reads as the quieter of the two controls — an outline rather than a
                 second row of filled pills, which would present it as a peer of the range. */
              style={g === active ? { backgroundColor: mix(MORTALITY_ACCENT, 0.55) } : undefined}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {total === 0 && buckets.every((b) => !b.before) ? (
        <NoDeaths window={range.win.window} />
      ) : (
        <>
          <div className="flex h-[112px] items-end gap-[3px]" style={bars}>
            {buckets.map((b) => {
              const h = (b.deaths / max) * 100
              const ghost = b.before === undefined ? 0 : (b.before / max) * 100
              return (
                <button
                  key={b.from}
                  type="button"
                  onClick={() =>
                    open({
                      title: b.label,
                      eyebrow: `Mortality trend · ${active.toLowerCase()}`,
                      body: (
                        <PeriodSheet
                          rows={rows.filter((d) => d.day >= b.from && d.day <= b.to)}
                          label={b.label}
                          from={b.from}
                          to={b.to}
                          before={b.before}
                        />
                      ),
                    })
                  }
                  className="group relative flex h-full flex-1 items-end"
                  title={`${b.label} · ${b.deaths} deaths${b.before !== undefined ? ` · ${b.before} before` : ''}`}
                  aria-label={`${b.label}, ${b.deaths} deaths`}
                >
                  {/* The previous period, behind. */}
                  {ghost > 0 && (
                    <span
                      className="absolute bottom-0 left-0 w-full rounded-t-[3px]"
                      style={{ height: `${ghost}%`, backgroundColor: TRACK }}
                      aria-hidden
                    />
                  )}
                  <span
                    className="relative w-full rounded-t-[3px] transition-opacity group-hover:opacity-80"
                    style={{
                      height: `${Math.max(b.deaths > 0 ? 3 : 0, h)}%`,
                      backgroundColor: mix(accent, 0.85),
                    }}
                    aria-hidden
                  />
                </button>
              )
            })}
          </div>

          {/* The ticks carry the bars' own width, or the dates stop sitting under their
              columns the moment the strip is capped. */}
          <div className="mt-2 flex gap-[3px]" style={bars}>
            {buckets.map((b, i) => (
              <span
                key={b.from}
                className="min-w-0 flex-1 truncate text-center text-tick tabular-nums"
                style={{ color: FAINT }}
              >
                {/* Every label at a coarse grain; every third at a fine one, or they collide. */}
                {buckets.length <= 14 || i % Math.ceil(buckets.length / 10) === 0 ? b.label : ''}
              </span>
            ))}
          </div>
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            {active} · deaths per {active === 'Daily' ? 'day' : active === 'Weekly' ? 'week' : 'month'}
            {buckets.some((b) => b.before !== undefined) && ' · grey is the previous period'} · tap a column
          </p>
        </>
      )}
    </Section>
  )
}

/* ── 4 · site-wise · the brief's §4 ─────────────────────────────────────── */

const SITE_SORTS: Record<string, (r: SiteLine) => number> = {
  deaths: (r) => r.deaths,
  lowest: (r) => -r.deaths,
  change: (r) => r.change ?? -Infinity,
  necropsies: (r) => r.necropsies,
  pending: (r) => r.pending,
}

/** ALL sites, always — the brief is explicit that this is not a top five. */
function SiteWise({ rows, prev }: { rows: Death[]; prev: Death[] }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const [sortKey, setSortKey] = useState('deaths')

  const lines = useMemo(() => {
    const by = SITE_SORTS[sortKey] ?? SITE_SORTS.deaths
    return siteLines(rows, prev, siteKeyOf(scope)).sort((a, b) => by(b) - by(a))
  }, [rows, prev, scope, sortKey])

  const cols: Col<SiteLine>[] = [
    { key: 'deaths', head: 'Deaths', cell: (r) => fmt(r.deaths), sort: SITE_SORTS.deaths, tone: (r) => (r.deaths ? 'bad' : 'good') },
    { key: 'share', head: 'Share', cell: (r) => `${Math.round(r.percent)}%` },
    {
      key: 'change',
      head: 'Change',
      cell: (r) => (r.change === undefined ? '—' : `${r.change > 0 ? '+' : ''}${Math.round(r.change)}%`),
      sort: SITE_SORTS.change,
      tone: (r) => changeTone(r.change),
    },
    { key: 'species', head: 'Species', cell: (r) => fmt(r.species) },
    { key: 'necropsies', head: 'Necropsy', cell: (r) => fmt(r.necropsies), sort: SITE_SORTS.necropsies },
    {
      key: 'pending',
      head: 'Pending',
      cell: (r) => fmt(r.pending),
      sort: SITE_SORTS.pending,
      tone: (r) => (r.pending ? 'warn' : undefined),
    },
  ]

  return (
    <Section icon={MapPin} label="Site-wise mortality" aside={`${lines.length} site${lines.length === 1 ? '' : 's'}`}>
      <RankTable
        rows={lines}
        columns={cols}
        head="Site"
        name={(r) => r.name}
        sub={(r) => `${r.code} · ${r.species} species${r.regulated ? ` · ${r.regulated} regulatory` : ''}`}
        sortKey={sortKey}
        onSort={setSortKey}
        onOpen={(r) =>
          open({
            title: r.name,
            eyebrow: 'Site mortality',
            body: <SiteMortalitySheet siteKey={r.id} rows={rows} />,
          })
        }
        empty={<NoDeaths window={scope.win.window} />}
      />
      {/* Sorting by "lowest" is a real question — which site is doing well — and it is one tap
          rather than a second table. */}
      <div className="mt-3 flex gap-1.5">
        {[
          ['deaths', 'Highest'],
          ['lowest', 'Lowest'],
          ['change', 'Change'],
        ].map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={sortKey === key}
            onClick={() => setSortKey(key)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-medium transition-colors ${
              sortKey === key ? 'text-white' : 'bg-[#f4f3ef] text-[#55524a]'
            }`}
            style={sortKey === key ? { backgroundColor: MORTALITY_ACCENT } : undefined}
          >
            {text}
          </button>
        ))}
      </div>
    </Section>
  )
}

/* ── 5 · species-wise · the brief's §5 ─────────────────────────────────── */

const SPECIES_SORTS: Record<string, (r: SpeciesLine) => number> = {
  deaths: (r) => r.deaths,
  percent: (r) => r.percent,
  sites: (r) => r.sites,
  necropsies: (r) => r.necropsies,
  pending: (r) => r.pending,
}

function SpeciesWise({ rows }: { rows: Death[] }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const [sortKey, setSortKey] = useState('deaths')
  const [query, setQuery] = useState('')

  const lines = useMemo(() => {
    const by = SPECIES_SORTS[sortKey] ?? SPECIES_SORTS.deaths
    const q = query.trim().toLowerCase()
    return speciesLines(rows)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.cls.toLowerCase().includes(q))
      .sort((a, b) => by(b) - by(a))
  }, [rows, sortKey, query])

  const cols: Col<SpeciesLine>[] = [
    { key: 'deaths', head: 'Deaths', cell: (r) => fmt(r.deaths), sort: SPECIES_SORTS.deaths, tone: () => 'bad' },
    { key: 'percent', head: 'Share', cell: (r) => `${Math.round(r.percent)}%`, sort: SPECIES_SORTS.percent },
    { key: 'sites', head: 'Sites', cell: (r) => fmt(r.sites), sort: SPECIES_SORTS.sites },
    { key: 'necropsies', head: 'Necropsy', cell: (r) => fmt(r.necropsies), sort: SPECIES_SORTS.necropsies },
    {
      key: 'pending',
      head: 'Pending',
      cell: (r) => fmt(r.pending),
      sort: SPECIES_SORTS.pending,
      tone: (r) => (r.pending ? 'warn' : undefined),
    },
    { key: 'cause', head: 'Top cause', cell: (r) => r.topCause, compact: false },
  ]

  /* Paged at eight. Seventeen species stacked on a phone is an 1,800px card, and a section
     taller than five screens is not a section anybody reads to the end of — but the brief is
     equally clear that ALL species must stay accessible, so this pages rather than truncates
     and `MoreRows` states the real total above the control. */
  const page = usePaged<SpeciesLine>(
    (offset, limit) => ({ rows: lines.slice(offset, offset + limit), total: lines.length }),
    8,
    [lines.length, sortKey, query],
  )

  return (
    <Section icon={Dna} label="Species-wise mortality" aside={`${lines.length} species`}>
      <FindField value={query} onChange={setQuery} placeholder="Search species" />
      <div className="mt-3.5">
        <RankTable
          rows={page.rows}
          columns={cols}
          head="Species"
          name={(r) => r.name}
          /* The regulatory standing belongs on this row rather than in a column: it is the
             thing that changes how the death is read, and it is text, not a figure. */
          sub={(r) => `${r.cls} · ${r.standingText}${r.sites > 1 ? ` · ${r.siteNames}` : ''}`}
          sortKey={sortKey}
          onSort={setSortKey}
          onOpen={(r) =>
            open({
              title: r.name,
              eyebrow: 'Species mortality',
              body: <SpeciesMortalitySheet speciesName={r.name} rows={rows} />,
            })
          }
          empty={<NoDeaths window={scope.win.window} />}
        />
        <MoreRows page={page} noun="species" />
      </div>
    </Section>
  )
}

/* ── 6 · major impact · the brief's §7 ─────────────────────────────────── */

/**
 * The one executive insight the brief asks for by name: which species is worst hit, and what is
 * killing most animals.
 *
 * Calculated, never authored — it is the top row of the species table and the top row of the
 * cause table, which is why it cannot disagree with either.
 */
function MajorImpact({ rows }: { rows: Death[] }) {
  const { open } = useSheet()
  const species = useMemo(() => bySpeciesSlice(rows), [rows])
  const causes = useMemo(() => byCause(rows), [rows])
  const top = species[0]
  const cause = causes[0]

  if (!top || !cause) {
    return (
      <Section icon={Skull} label="Major mortality impact">
        <NoDeaths window="this window" />
      </Section>
    )
  }

  const sites = [...new Set(rows.filter((d) => d.speciesName === top.label).map((d) => d.siteName))]

  return (
    <Section icon={Skull} label="Major mortality impact" aside="highest species">
      <button
        type="button"
        onClick={() =>
          open({
            title: top.label,
            eyebrow: 'Highest mortality species',
            body: <SpeciesMortalitySheet speciesName={top.label} rows={rows} />,
          })
        }
        className="card-press -mx-2 block w-full rounded-[12px] px-2 py-1 text-left"
      >
        <Figure value={fmt(top.value)} size={40} color={TONE.bad} />
        <p className="mt-1 text-body font-medium text-[#1c1a16]">{top.label}</p>
        <p className="mt-1 text-caption" style={{ color: FAINT }}>
          {Math.round(top.percent)}% of total mortality · {sites.length === 1 ? sites[0] : `${sites.length} sites`}
        </p>
        {top.sub && (
          <p className="mt-0.5 text-caption" style={{ color: FAINT }}>
            {top.sub}
          </p>
        )}
      </button>
      <Rule label="Major cause" />
      <button
        type="button"
        onClick={() => open({ title: cause.label, eyebrow: 'Major cause', body: <CauseSheet cause={cause.label} rows={rows} /> })}
        className="card-press -mx-2 block w-full rounded-[12px] px-2 py-1 text-left"
      >
        <Figure value={fmt(cause.value)} size={32} color={TONE.warn} />
        <p className="mt-1 text-small font-medium text-[#1c1a16]">{cause.label}</p>
        <p className="mt-1 text-caption" style={{ color: FAINT }}>
          {Math.round(cause.percent)}% of deaths · {new Set(rows.filter((d) => d.cause === cause.label).map((d) => d.speciesName)).size}{' '}
          species
        </p>
      </button>
    </Section>
  )
}

/* ── 7 · cause of death · the brief's §8 ───────────────────────────────── */

/**
 * A Pareto, because the point of cause analysis is which two causes account for most of it —
 * and the cumulative line is the only mark that says so.
 *
 * The causes are the ones the events actually carry, grouped from the window's own deaths. No
 * fixed category list is declared here, which is the brief's explicit instruction: a cause that
 * nobody died of does not get a row.
 */
function CauseOfDeath({ rows }: { rows: Death[] }) {
  const { open } = useSheet()
  const causes = useMemo(() => byCause(rows), [rows])

  return (
    <Section icon={Activity} label="Cause of death" aside={`${causes.length} cause${causes.length === 1 ? '' : 's'}`}>
      {causes.length > 0 ? (
        <>
          <Pareto items={causes.map((c) => ({ label: c.label, value: c.value }))} />
          <Rule label="Tap to investigate" />
          <DrillList>
            {causes.map((c) => (
              <DrillRow
                key={c.id}
                label={c.label}
                sub={`${new Set(rows.filter((d) => d.cause === c.label).map((d) => d.speciesName)).size} species`}
                value={fmt(c.value)}
                unit={`${Math.round(c.percent)}%`}
                tone={c.tone}
                onOpen={() => open({ title: c.label, eyebrow: 'Cause of death', body: <CauseSheet cause={c.label} rows={rows} /> })}
              />
            ))}
          </DrillList>
        </>
      ) : (
        <NoDeaths window="this window" />
      )}
    </Section>
  )
}

/* ── 8 · regulatory · the brief's §6 ──────────────────────────────────── */

/**
 * The same hierarchy Animal Population uses, applied to deaths.
 *
 * Read from each dead animal's own species standing, so it recuts with the scope and sums to the
 * hero. The three instruments are kept apart deliberately: CITES is a trade convention and the
 * Schedules are Indian domestic law, an animal routinely carries both, so they do NOT sum and
 * must never be drawn as one distribution. The regulatory/non split above them counts each
 * animal once, which is why that one does sum.
 */
function RegulatoryMortality({ rows }: { rows: Death[] }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const split = useMemo(() => regulatorySplit(rows), [rows])
  const cites = useMemo(() => citesBands(rows), [rows])
  const schedules = useMemo(() => scheduleBands(rows), [rows])

  const band = (title: string, list: Death[], label: string) =>
    open({
      title,
      eyebrow: 'Regulatory mortality',
      body: <RegulatorySheet title={title} rows={list} label={label} note={`${title} · ${scope.win.window}`} />,
    })

  if (rows.length === 0) {
    return (
      <Section icon={ScrollText} label="Regulatory mortality">
        <NoDeaths window={scope.win.window} />
      </Section>
    )
  }

  return (
    <Section icon={ScrollText} label="Regulatory mortality" aside={`${split.regulated.deaths} of ${fmt(rows.length)}`}>
      <Snapshot
        cols={2}
        items={[
          {
            label: 'Regulatory',
            value: fmt(split.regulated.deaths),
            note: `${Math.round(split.regulated.percent)}% · ${split.regulated.species} species`,
            tone: split.regulated.deaths ? 'bad' : 'neutral',
          },
          {
            label: 'Non-regulatory',
            value: fmt(split.open.deaths),
            note: `${Math.round(split.open.percent)}% · husbandry`,
          },
        ]}
      />
      <Rule label="CITES" />
      <DrillList>
        {cites.map((b) => (
          <DrillRow
            key={b.key}
            label={b.label}
            sub={b.deaths ? `${b.species} species` : 'none in window'}
            value={fmt(b.deaths)}
            unit={b.deaths ? `${Math.round(b.percent)}%` : undefined}
            tone={b.key === 'I' && b.deaths ? 'bad' : undefined}
            onOpen={
              b.deaths
                ? () => band(`CITES ${b.label}`, rows.filter((d) => d.cites === b.key), `Deaths · CITES ${b.label}`)
                : undefined
            }
          />
        ))}
      </DrillList>
      <Rule label="Wildlife Protection Act" />
      <DrillList>
        {schedules.map((b) => (
          <DrillRow
            key={b.key}
            label={b.label}
            sub={b.deaths ? `${b.species} species` : 'none in window'}
            value={fmt(b.deaths)}
            unit={b.deaths ? `${Math.round(b.percent)}%` : undefined}
            tone={b.key === 'I' && b.deaths ? 'bad' : undefined}
            onOpen={
              b.deaths
                ? () => band(b.label, rows.filter((d) => d.schedule === b.key), `Deaths · ${b.label}`)
                : undefined
            }
          />
        ))}
      </DrillList>
      <p className="mt-3 text-caption" style={{ color: FAINT }}>
        CITES and the Schedules overlap — an animal can carry both, so these two lists do not sum.
      </p>
    </Section>
  )
}

/* ── 9 · necropsy overview · the brief's §9 ───────────────────────────── */

/**
 * Deaths, referrals, and where the referrals have got to.
 *
 * The rate is referrals over deaths, and the three statuses partition the referrals — so the
 * card cannot state a combination the collection could not produce. Not every death requires a
 * necropsy, which the brief is explicit about, so "not referred" is shown as its own figure
 * rather than folded into pending: one is a decision and the other is a backlog.
 */
function NecropsyOverview({ rows }: { rows: Death[] }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const referred = useMemo(() => necropsiesOf(rows), [rows])
  const completed = referred.filter((d) => d.necropsy!.status === 'Completed')
  const inProgress = referred.filter((d) => d.necropsy!.status === 'In progress')
  const awaiting = referred.filter((d) => d.necropsy!.status === 'Awaiting')
  const notReferred = rows.filter((d) => !d.necropsy)

  const into = (title: string, list: Death[], label: string, tone?: 'good' | 'warn' | 'bad') =>
    open({
      title,
      eyebrow: 'Necropsy',
      body: <DeathListSheet title={title} rows={list} label={label} tone={tone} note={`${title} · ${scope.win.window}`} />,
    })

  return (
    <Section
      icon={FileSearch}
      label="Necropsy overview"
      aside={rows.length ? `${Math.round((referred.length / rows.length) * 100)}% referred` : undefined}
    >
      {rows.length === 0 ? (
        <NoDeaths window={scope.win.window} />
      ) : (
        <>
          <Snapshot
            cols={2}
            items={[
              { label: 'Total deaths', value: fmt(rows.length) },
              { label: 'Necropsies', value: fmt(referred.length), note: 'referred to a bench' },
            ]}
          />
          <Rule label="Status" />
          {/* All four bars are a share of DEATHS, not of referrals.
              The three statuses partition the referrals and "not referred" is the complement, so
              on one denominator the four rows partition every death in the window and the bars
              sum to the full track. Drawing the first three against referrals and the fourth
              against deaths — which is what this list did first — puts four bars in one column on
              two different bases, where a 2 looks bigger than a 5. */}
          <DrillList>
            {(
              [
                ['Completed', 'finding signed off', completed, 'good'],
                ['In progress', 'at the bench', inProgress, 'warn'],
                ['Awaiting', 'queued, not yet started', awaiting, 'bad'],
                ['Not referred', 'husbandry death · no necropsy required', notReferred, undefined],
              ] as const
            ).map(([label, sub, list, tone]) => (
              <DrillRow
                key={label}
                label={label}
                sub={sub}
                value={fmt(list.length)}
                /* No bar at all for an empty status — `DrillRow` floors a bar at 3%, so a zero
                   would still draw a sliver and read as "a few". */

                tone={list.length && tone ? tone : undefined}
                onOpen={
                  list.length
                    ? () => into(label, [...list], `${label === 'Not referred' ? 'Deaths' : 'Necropsies'} · ${label.toLowerCase()}`, tone)
                    : undefined
                }
              />
            ))}
          </DrillList>
          <Facts
            items={[
              {
                label: 'Necropsy rate',
                sub: 'referrals ÷ deaths',
                value: `${Math.round((referred.length / rows.length) * 100)}%`,
              },
              {
                label: 'Clearance',
                sub: 'completed ÷ referred',
                value: referred.length ? `${Math.round((completed.length / referred.length) * 100)}%` : '—',
                tone: 'good',
              },
            ]}
          />
        </>
      )}
    </Section>
  )
}

/* ── 10 · centre-wise · the brief's §10 ──────────────────────────────── */

const CENTRE_SORTS: Record<string, (r: CentreLine) => number> = {
  necropsies: (r) => r.necropsies,
  completed: (r) => r.completed,
  pending: (r) => r.pending,
  species: (r) => r.species,
}

/** ALL six benches, including the ones that received nothing in the window. */
function CentreWise({ rows }: { rows: Death[] }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const [sortKey, setSortKey] = useState('necropsies')

  /* Derived from the FILTERED rows, not from the scope — a page cut to Schedule I must show
     each bench's Schedule I caseload, not its whole queue. */
  const lines = useMemo(() => {
    const by = CENTRE_SORTS[sortKey] ?? CENTRE_SORTS.necropsies
    return centreLines(rows).sort((a, b) => by(b) - by(a))
  }, [rows, sortKey])

  const cols: Col<CentreLine>[] = [
    { key: 'necropsies', head: 'Cases', cell: (r) => fmt(r.necropsies), sort: CENTRE_SORTS.necropsies },
    { key: 'completed', head: 'Completed', cell: (r) => fmt(r.completed), sort: CENTRE_SORTS.completed, tone: (r) => (r.completed ? 'good' : undefined) },
    {
      key: 'pending',
      head: 'Pending',
      cell: (r) => fmt(r.pending),
      sort: CENTRE_SORTS.pending,
      tone: (r) => (r.awaiting ? 'bad' : r.pending ? 'warn' : undefined),
    },
    { key: 'species', head: 'Species', cell: (r) => fmt(r.species), sort: CENTRE_SORTS.species },
    { key: 'clearance', head: 'Clearance', cell: (r) => (r.clearance === undefined ? '—' : `${Math.round(r.clearance)}%`) },
    { key: 'share', head: 'Share', cell: (r) => `${Math.round(r.percent)}%`, compact: false },
  ]

  return (
    <Section icon={Building2} label="Necropsy centre-wise" aside={`${CENTRES.length} centres`}>
      <RankTable
        rows={lines}
        columns={cols}
        head="Necropsy centre"
        name={(r) => r.centre.name}
        sub={(r) => `${r.centre.code} · ${r.centre.kind} · ${r.centre.turnaround} d turnaround`}
        sortKey={sortKey}
        onSort={setSortKey}
        onOpen={(r) =>
          open({
            title: r.centre.name,
            eyebrow: 'Necropsy centre',
            body: <CentreSheet centreId={r.centre.id} rows={rows} />,
          })
        }
        empty={<NoDeaths window={scope.win.window} />}
      />
      <p className="mt-3 text-caption" style={{ color: FAINT }}>
        A laboratory signs off histopathology and toxicology; a field bench records gross findings the next day. A
        centre receives from every site, so scoping to one site changes the cases counted, not the list.
      </p>
    </Section>
  )
}

/* ── 11 · necropsy species-wise · the brief's §11 ────────────────────── */

function NecropsySpeciesWise({ rows }: { rows: Death[] }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const [sortKey, setSortKey] = useState('necropsies')

  const lines = useMemo(() => {
    const by = SPECIES_SORTS[sortKey] ?? SPECIES_SORTS.necropsies
    /* Only species that actually went to a bench — a species with deaths but no referral has
       nothing to say in a necropsy table, and it is already in the mortality table above. */
    return speciesLines(rows)
      .filter((r) => r.necropsies > 0)
      .sort((a, b) => by(b) - by(a))
  }, [rows, sortKey])

  const cols: Col<SpeciesLine>[] = [
    { key: 'necropsies', head: 'Necropsies', cell: (r) => fmt(r.necropsies), sort: SPECIES_SORTS.necropsies },
    { key: 'deaths', head: 'Deaths', cell: (r) => fmt(r.deaths), sort: SPECIES_SORTS.deaths },
    { key: 'rate', head: 'Rate', cell: (r) => (r.rate === undefined ? '—' : `${Math.round(r.rate)}%`) },
    { key: 'completed', head: 'Completed', cell: (r) => fmt(r.completed), tone: (r) => (r.completed ? 'good' : undefined) },
    {
      key: 'pending',
      head: 'Pending',
      cell: (r) => fmt(r.pending),
      sort: SPECIES_SORTS.pending,
      tone: (r) => (r.pending ? 'warn' : undefined),
    },
  ]

  const page = usePaged<SpeciesLine>(
    (offset, limit) => ({ rows: lines.slice(offset, offset + limit), total: lines.length }),
    8,
    [lines.length, sortKey],
  )

  return (
    <Section icon={FlaskConical} label="Necropsy species-wise" aside={`${lines.length} species`}>
      <RankTable
        rows={page.rows}
        columns={cols}
        head="Species"
        name={(r) => r.name}
        sub={(r) => `${r.cls} · ${r.standingText}`}
        sortKey={sortKey}
        onSort={setSortKey}
        onOpen={(r) =>
          open({
            title: r.name,
            eyebrow: 'Species necropsy',
            body: <SpeciesNecropsySheet speciesName={r.name} rows={rows} />,
          })
        }
        empty={
          <p className="text-caption" style={{ color: FAINT }}>
            No deaths in {scope.win.window} were referred for necropsy in this scope.
          </p>
        }
      />
      <MoreRows page={page} noun="species" />
    </Section>
  )
}

/* ── 12 · records · the brief's §12 ──────────────────────────────────── */

/**
 * The two record sets, side by side rather than on two pages.
 *
 * A death record and a necropsy record are two views of the same event — one is what happened,
 * the other is what the bench did about it — so they sit in one card and the reader picks which
 * question they are asking. Both drill to the animal.
 */
function RecordsSection({ rows }: { rows: Death[] }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const [tab, setTab] = useState<'deaths' | 'necropsy'>('deaths')
  const referred = useMemo(() => necropsiesOf(rows), [rows])

  return (
    <Section
      icon={ClipboardList}
      label="Mortality & necropsy records"
      aside={`${fmt(rows.length)} deaths · ${fmt(referred.length)} necropsies`}
    >
      <div className="mb-3.5 flex gap-1.5">
        {(
          [
            ['deaths', `Deaths ${rows.length}`],
            ['necropsy', `Necropsies ${referred.length}`],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-3 py-1 text-caption font-medium transition-colors ${
              tab === key ? 'text-white' : 'bg-[#f4f3ef] text-[#55524a]'
            }`}
            style={tab === key ? { backgroundColor: MORTALITY_ACCENT } : undefined}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === 'deaths' ? (
        <DeathRows rows={rows} eyebrow="Records" />
      ) : (
        <NecropsyRows rows={rows} eyebrow="Records" />
      )}

      {/* The full record set, where the section's twelve rows are not enough. */}
      {(tab === 'deaths' ? rows.length : referred.length) > 12 && (
        <button
          type="button"
          onClick={() =>
            open({
              title: tab === 'deaths' ? 'Death records' : 'Necropsy records',
              eyebrow: scopeLine(scope),
              body: (
                <DeathListSheet
                  title={tab === 'deaths' ? 'Death records' : 'Necropsy records'}
                  rows={tab === 'deaths' ? rows : referred}
                  label={tab === 'deaths' ? 'Deaths' : 'Necropsies'}
                  tone="bad"
                />
              ),
            })
          }
          className="card-press mt-3 w-full rounded-full py-2 text-body font-medium"
          style={{ backgroundColor: mix(MORTALITY_ACCENT, 0.09), color: ACCENT_INK }}
        >
          Open all records
        </button>
      )}
    </Section>
  )
}

/* ── the empty state ─────────────────────────────────────────────────── */

/**
 * What a card shows when the scope has nothing in it.
 *
 * Deliberately not a zero and not a hidden card. Carnivore Ridge recorded no deaths in the last
 * seven days, and that is a fact worth stating plainly — an empty chart or a silently dropped
 * section leaves the reader unsure whether they have found good news or a broken page.
 */
function NoDeaths({ window }: { window: string }) {
  return (
    <p className="py-2 text-caption" style={{ color: FAINT }}>
      No deaths recorded in {window} for this scope.
    </p>
  )
}
