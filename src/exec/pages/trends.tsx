/**
 * TRENDS — every flow the database records, on one window and one axis.
 *
 * REBUILT ON THE SAME SERIES THE MODULES READ. The point of collecting them here is
 * comparability, and that premise was right in the authored version: read one at a time, nobody
 * notices that a rise in one series and a rise in another are the same event days apart.
 *
 * WHAT WAS WRONG WITH IT was that comparability was the one thing it did not have. The three
 * trends were fifteen typed values each, invented independently, under labels claiming four
 * weeks; one carried a comment dating an aviary respiratory outbreak to 21 July, which is a
 * finding asserted about a chart that was authored to show it. Every series here now comes from
 * `pointsOf` over the SAME window with the SAME bucket count, so two series are genuinely on
 * one axis and a coincidence between them is a fact about the collection rather than about the
 * person who typed them.
 *
 * IT COVERS ALL EIGHT FLOWS, not three. The old page picked natality, mortality and new cases
 * because those were the three that had been authored. The registry now has every flow the ETL
 * found, so the page shows what exists — and the ones with no source do not appear at all
 * rather than appearing flat at zero, because `METRICS[slug]` is undefined for them and this
 * page iterates the registry rather than a hand-written list. Extend the ETL and a ninth series
 * arrives here without anyone editing this file.
 *
 * THE TITLE IS NO LONGER "30-DAY". It reads the global window like every other page, and a page
 * called 30-Day Trends showing a six-month cut was the same class of contradiction as the July
 * 2025 footer. The registry title is left alone; the page states the real span.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE PAGE NOW ANSWERS ITS OWN PREMISE, AND IT DID NOT BEFORE.
 *
 * Everything above is the argument for comparability, and the page was built to deliver it: one
 * window, one bucket count, one axis, ten series. Then it drew the ten series as ten cards down a
 * column — which is READ ONE AT A TIME, the exact failure the header opens by naming. A reader
 * who has to scroll from Natality to Deworming to notice they moved together is in the position
 * the page was written to rescue them from. Comparability was in the DATA and never in the LAYOUT.
 *
 * Two blocks fix it, and both are readings across the whole registry rather than new charts:
 *
 *   WHAT MOVED        every series ranked by how far it shifted against the preceding span of
 *                     equal length. One list, so the biggest mover on the page is the first
 *                     thing on the page instead of the seventh card down.
 *   POPULATION BALANCE the four collection flows are the headcount equation — births and
 *                     accessions in, deaths and transfers out — and the page held all four
 *                     without ever adding them up. A director reading ten trends still could
 *                     not say whether the collection grew.
 *
 * The ten series stay exactly as they were, below. They are the evidence; these two are the
 * finding, and the order between them is the whole of the fix.
 *
 * DIRECTION IS NOT SIGN, AND THAT IS WHY `change` IS NOT USED ON THE RANKED LIST. `RankList`
 * colours a `change` string by its leading character — `+` reads good, `−` reads bad. Nine of
 * these series are fine with that and mortality and disease are not: deaths up is "+214" and
 * would print in the good tone. So the movement goes in `meta`, where it is stated and not
 * coloured, and the row's tone carries the reading with the inversion already applied.
 */

import { useMemo } from 'react'
import { Activity, ArrowLeftRight, Baby, Boxes, Skull, TrendingDown, TrendingUp } from 'lucide-react'
import { METRICS } from '../../core/metrics'
import { figure } from '../../core/query'
import { AccentProvider, FAINT, Figure, HERO_INK, Section, Stack, Stamp, fmt } from '../system'
import { EventTrend, FlowSplit, RankList } from '../marks'
import { compareOf, endsBeforeWindow, lastEventDay, peakOf, pointsOf } from '../../v4/plot'
import { shortDate } from '../../core/calendar'
import { useScope } from '../../v4/scope'
import type { LucideIcon } from 'lucide-react'

const TRENDS_ACCENT = '#2f5f6b'

/**
 * The order the series are read in — collection events first, then clinical, then preventive.
 *
 * A hand-written ORDER over a registry-driven list, which is the one thing authored here: the
 * registry's own key order is the ETL's, and "vaccinationDue before admissions" is an artefact
 * of how the tables were parsed rather than a reading order. Any flow not named here still
 * renders, after these, so adding a metric to the ETL cannot silently drop it from this page.
 */
const ORDER = [
  'births',
  'accession',
  'mortality',
  'transfers',
  'admissions',
  'disease',
  'pharmacy',
  'vaccinations',
  'deworming',
  'supplement',
]

/** Mortality is the one series where a rise is bad — the same inversion `mortality.tsx` makes. */
const INVERTED = new Set(['mortality', 'disease'])

/**
 * The lead glyph per series, so the ranked list is scannable without reading every label.
 *
 * Only the four collection flows get one. The clinical and preventive series are a homogeneous
 * block and giving each an invented icon would be decoration — the four that move the headcount
 * are the ones a reader picks out of the list by shape.
 */
const GLYPH: Record<string, LucideIcon> = {
  births: Baby,
  accession: Boxes,
  mortality: Skull,
  transfers: ArrowLeftRight,
}

/** The headcount equation, and the only four series that belong in it. */
const INWARD = ['births', 'accession']
const OUTWARD = ['mortality', 'transfers']

interface Move {
  slug: string
  label: string
  now: number
  before: number | undefined
  /** Signed change against the preceding span. Undefined where there is no span to compare to. */
  diff: number | undefined
  /**
   * |diff| as a share of the earlier figure. Undefined where that figure is zero, and DELIBERATELY
   * undefined where the metric's table ends before the window — that is what keeps a stale table
   * out of the ranking instead of at the top of it.
   */
  percent: number | undefined
  meta: string
  /** The movement with no direction glyph, for a row that already draws its own arrows. */
  plainMeta: string
  /** The window sits entirely after this metric's last record. */
  stale: boolean
}

/**
 * WHAT MOVED — every series against the span before it, ranked by how far it shifted.
 *
 * RANKED BY PERCENTAGE AND NOT BY ABSOLUTE CHANGE, because the series are on wildly different
 * scales: prescriptions run in the thousands and fetal losses in single figures, so an absolute
 * ranking is a ranking of which table the ETL found most rows in. A 40% swing is the same size of
 * event whichever series it happens in, which is the only basis on which ten unlike flows can
 * share one list.
 *
 * A SERIES WITH NO COMPARISON SPAN SINKS TO THE BOTTOM RATHER THAN BEING DROPPED. `compareOf`
 * returns nothing within one span of the start of the ledger; the series still exists and its
 * total is still a fact, so it is listed and says so.
 */
function movements(scope: ReturnType<typeof useScope>['scope'], slugs: string[]): Move[] {
  const site = scope.site?.key ?? null

  return slugs
    .map((slug): Move => {
      const now = figure(scope, slug).value
      const compare = compareOf(slug, site, scope.win)
      const before = compare?.value
      const diff = before === undefined ? undefined : now - before

      /**
       * A TABLE THAT ENDS IS NOT A HUNDRED PERCENT DECLINE.
       *
       * `admissions`, `disease` and `pharmacy` stop on one shared date in the current dump, so the
       * first draft of this list opened with three series reading "↓ 100%" — the page's own top
       * three findings were an artefact of where the extract was cut. `population.ts` rules on
       * exactly this shape of error: "not a missing figure, which reads as missing, but a
       * confident nil that reads as 'nothing left the collection this month'."
       *
       * A stale metric therefore takes NO percentage, which drops it out of the ranking, and its
       * meta states the last date it holds instead of a change it did not undergo.
       */
      const stale = endsBeforeWindow(slug, site, scope.win)
      const percent =
        stale || before === undefined || before === 0 ? undefined : (Math.abs(diff ?? 0) / before) * 100

      /**
       * NO ROW IS TONED, AND THE FIRST DRAFT OF THIS BLOCK TONED EVERY ONE OF THEM.
       *
       * `RankList` applies `tone` to the VALUE, not to the change — so a rule as reasonable as
       * "mortality falling is good" painted the figure 1,293 DEATHS in the good tone, sitting
       * beside 676 births in the bad one because natality had also fallen. The tone was a
       * statement about the direction and the eye read it as a statement about the number.
       *
       * The second problem was the rule itself. Inverting mortality and disease is a judgement
       * this page already makes and can defend; extending it to "everything else rising is good"
       * put Consultations, Prescriptions and Vaccinations at zero in three different colours and
       * asserted that fewer vet consultations is a bad month. That is an insight, and the header
       * of this page rules that "nothing is explained, only stated — every string names a number
       * or a filter".
       *
       * So the direction lives in the meta line, where it is an arrow and a figure, and every
       * value stays in the neutral ink. The per-series charts below still invert their own tone,
       * which is the right place for it: there the tone is on the CURVE, which is the thing that
       * moved.
       */
      const span = compare?.label ?? ''
      /* Branching on `diff` rather than on a derived string, so the narrowing holds — the figure
         and the sign are read off the same value that decided the branch. */
      const size =
        diff === undefined
          ? ''
          : `${fmt(Math.abs(diff))}${percent === undefined ? '' : ` · ${percent < 1 ? percent.toFixed(1) : Math.round(percent)}%`}`

      /* The coverage statement outranks every other reading: if there are no records in this
         window there is nothing for a change to be a change in. */
      const coverage = stale ? `No records after ${shortDate(lastEventDay(slug, site))}` : undefined

      const meta =
        coverage ??
        (diff === undefined
          ? 'No earlier span to compare'
          : diff === 0
            ? `No change · ${span}`.trim()
            : `${diff > 0 ? '↑' : '↓'} ${size} ${span}`.trim())

      /* The same fact for a row that draws its own direction arrow — a signed figure rather than
         a second ↑/↓ meaning something different from the one already on the row. */
      const plainMeta =
        coverage ??
        (diff === undefined
          ? 'No earlier span'
          : diff === 0
            ? `No change · ${span}`.trim()
            : `${diff > 0 ? '+' : '−'}${size} ${span}`.trim())

      return { slug, label: LABELS[slug] ?? slug, now, before, diff, percent, meta, plainMeta, stale }
    })
    .sort((a, b) => {
      /* Unrankable series last, then by how far the thing moved. */
      if ((a.percent === undefined) !== (b.percent === undefined)) return a.percent === undefined ? 1 : -1
      return (b.percent ?? 0) - (a.percent ?? 0)
    })
}

/**
 * A side's composition and how far it moved, on one line.
 *
 * SIGNED, NOT ARROWED, for the reason the route rows are: each side of `FlowSplit` already shows
 * a `TrendingUp` / `TrendingDown` glyph for which way the animals are going, so an arrow here
 * meaning "rose or fell against last span" is a second arrow on the same line saying something
 * else. "−1,669" cannot be misread as a direction of travel.
 */
const movementMeta = (composition: string, diff: number | undefined): string =>
  diff === undefined || diff === 0 ? composition : `${composition} · ${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))}`

export default function Trends() {
  const { scope } = useScope()

  const slugs = useMemo(() => {
    const flows = Object.keys(METRICS).filter((s) => METRICS[s].kind === 'flow')
    const known = ORDER.filter((s) => flows.includes(s))
    return [...known, ...flows.filter((s) => !known.includes(s))]
  }, [])

  const moves = useMemo(() => movements(scope, slugs), [scope, slugs])
  const by = useMemo(() => new Map(moves.map((m) => [m.slug, m])), [moves])

  /* The headcount equation. Summed over whichever of the four the registry actually has, so a
     collection with no accession table states a balance of the flows it does record rather than
     counting a missing table as zero movement. */
  const sumOf = (keys: string[]) => keys.filter((k) => by.has(k)).reduce((n, k) => n + (by.get(k)?.now ?? 0), 0)
  const diffOf = (keys: string[]) => {
    const present = keys.filter((k) => by.get(k)?.diff !== undefined)
    return present.length ? present.reduce((n, k) => n + (by.get(k)?.diff ?? 0), 0) : undefined
  }
  const inward = sumOf(INWARD)
  const outward = sumOf(OUTWARD)
  const balance = INWARD.concat(OUTWARD).some((k) => by.has(k))

  return (
    <AccentProvider value={TRENDS_ACCENT}>
      <div className="w-full px-[var(--gutter)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <div className="flex items-end justify-between gap-4">
            <span>
              <Figure value={fmt(scope.win.days)} unit="d" size={48} color={HERO_INK} />
              <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
                <Activity size={15} strokeWidth={1.75} style={{ color: TRENDS_ACCENT }} aria-hidden />
                Trend window · {slugs.length} series
              </p>
            </span>
            <span className="shrink-0 pb-1 text-right text-caption" style={{ color: FAINT }}>
              {scope.site?.name ?? 'All sites'}
              <br />
              {scope.win.window}
            </span>
          </div>
        </section>
      </div>
      <Stack>
        {/* THE FINDING, ABOVE THE EVIDENCE. */}
        {/* THE ASIDE COUNTS SHIFTS, AND A STALE TABLE IS NOT ONE. Counting the three clinical
            flows as "shifted" would restate the same artefact the rows now refuse to. Where any
            series has run out of records the aside says so instead, because how much of the page
            has no data in this window is the more important of the two facts. */}
        <Section
          icon={Activity}
          label="What moved"
          aside={
            moves.some((m) => m.stale)
              ? `${moves.filter((m) => m.stale).length} of ${moves.length} without records`
              : `${moves.filter((m) => m.diff !== undefined && m.diff !== 0).length} of ${moves.length} shifted`
          }
        >
          <RankList
            rank={false}
            showShare={false}
            items={moves.map((m) => ({
              key: m.slug,
              title: m.label,
              meta: m.meta,
              value: fmt(m.now),
              lead: GLYPH[m.slug],
            }))}
          />
        </Section>

        {/* THE HEADCOUNT EQUATION. `transfers` is outward and only outward — every
            `transferred_to` value in the extract is a destination, which `modules/population.ts`
            rules on at length. An animal arriving is an accession, which is the inward side. */}
        {balance && (
          <Section icon={TrendingUp} label="Population balance" aside={`net ${inward - outward >= 0 ? '+' : '−'}${fmt(Math.abs(inward - outward))}`}>
            {/* NEITHER SIDE PASSES `change`, FOR THE REASON THE HEADER GIVES ABOUT `RankList`.
                `FlowSplit` inks a `change` through `deltaInk`, which is positive-is-good — true
                of the inward side and false of the outward one, where a rise is more animals
                leaving. Passing it on one side only would put a coloured delta on the left of a
                side-by-side mark and none on the right, so both state their movement in `meta`,
                uncoloured. The NET below them is signed and does read positive-is-good, which is
                correct without qualification: the collection grew or it did not. */}
            <FlowSplit
              unit="animals"
              net={inward - outward}
              inward={{
                label: 'Into the collection',
                value: inward,
                meta: movementMeta('Births · accessions', diffOf(INWARD)),
                icon: TrendingUp,
              }}
              outward={{
                label: 'Out of the collection',
                value: outward,
                meta: movementMeta('Deaths · transfers out', diffOf(OUTWARD)),
                icon: TrendingDown,
              }}
              routes={INWARD.concat(OUTWARD)
                .filter((k) => by.has(k))
                .map((k) => ({
                  key: k,
                  label: by.get(k)?.label ?? k,
                  /* `plainMeta`, not `meta` — a route row already carries an in/out arrow of its
                     own, and a second ↑/↓ two millimetres away meaning "rose or fell" is two
                     arrow systems on one line. Signed figures do not collide with it. */
                  meta: by.get(k)?.plainMeta,
                  value: by.get(k)?.now ?? 0,
                  direction: INWARD.includes(k) ? ('in' as const) : ('out' as const),
                }))}
            />
          </Section>
        )}

        {slugs.map((slug) => (
          <Series key={slug} slug={slug} />
        ))}
      </Stack>
      <Stamp />
    </AccentProvider>
  )
}

/** One flow, on the shared window. Nothing here knows which flow it is beyond the registry. */
function Series({ slug }: { slug: string }) {
  const { scope } = useScope()
  const site = scope.site?.key ?? null
  const metric = METRICS[slug]

  const points = useMemo(() => pointsOf(slug, site, scope.win), [slug, site, scope.win])
  const compare = useMemo(() => compareOf(slug, site, scope.win), [slug, site, scope.win])
  const peak = useMemo(() => peakOf(points), [points])
  const total = figure(scope, slug).value

  return (
    <Section label={LABELS[slug] ?? slug} aside={`${fmt(total)} ${metric?.unit ?? ''}`}>
      <EventTrend
        points={points}
        unit={metric?.unit}
        span={scope.win.window}
        compare={compare}
        tone={INVERTED.has(slug) ? 'bad' : undefined}
        marks={peak ? [{ index: peak.index, note: peak.note }] : undefined}
        empty={`Nothing recorded in ${scope.win.window}.`}
      />
    </Section>
  )
}

/** The reader's name for each series. The registry's slug is the ETL's name, not a heading. */
const LABELS: Record<string, string> = {
  births: 'Natality',
  accession: 'Accession',
  mortality: 'Mortality',
  transfers: 'Movement out',
  admissions: 'Consultations',
  disease: 'Diagnoses',
  pharmacy: 'Prescriptions',
  vaccinations: 'Vaccinations',
  deworming: 'Deworming',
  supplement: 'Supplements',
  vaccinationDue: 'Vaccinations pending',
  dewormingDue: 'Deworming pending',
}
