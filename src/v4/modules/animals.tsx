/**
 * ANIMAL POPULATION — the executive collection overview.
 *
 * A stock, not a flow, and the page is built around that distinction. The headline is a
 * READING taken on a date, so the page is stamped "as of" rather than given a range; the
 * things that moved it — births, deaths, transfers, escapes — are sums across the window, and
 * they live in one card together rather than being scattered as six tiles that never add up.
 *
 * FOUR RULES THIS PAGE IS BUILT ON.
 *
 * ONE SCOPE, AND EVERY SECTION OBEYS IT. Nothing here reads a zoo-wide constant. Every figure
 * on the page — hero, movement, trend, composition, CITES, schedules, Red List, sites, species,
 * sexes, leaders — is a query against `core/` under the site and window in force. Pick Carnivore
 * Ridge and the CITES card recuts to Carnivore Ridge, because it is counting the same animals a
 * different way rather than reading a number typed beside them. The scope is stated in the
 * toolbar so it never has to be inferred.
 *
 * THE HIERARCHY IS THE NAVIGATION. Overall → Site → Species → Animal, and every list on the
 * page is a door into it. None of those doors is a route: they all swap the content of the one
 * sheet, so four levels deep is still one panel and one gesture back out.
 *
 * THE MARK IS CHOSEN BY THE SHAPE OF THE QUESTION, and `exec/marks.tsx` holds one mark per
 * shape. What this page used to be was seventeen cards of title-number-bar-chevron: regulatory
 * standing was two bars, CITES three, the schedules three more of the same, sites six, species
 * twenty. None of those is the same question, and drawing them identically said they were. Now
 * the trend is a scrubbable curve against the period before it, the class composition is one
 * proportional strip, regulatory standing is two percentages over one ribbon, CITES is a
 * segmented composition, the schedules are three comparison tiles, sites are small multiples,
 * species a ranked list, and sex a ring.
 *
 * NOTHING IS EXPLAINED, ONLY STATED. There is no prose, no recommendation and no insight — every
 * string on this page names a number or a filter.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE PAGE WAS 18,014 PIXELS AND IS NOW ABOUT A THIRD OF THAT. Nothing was dropped to get
 * there; four things were drawn at the size of the question instead of the size of the data.
 *
 *   · BIRTHS AND MORTALITY WERE WHOLE MODULES, INLINED — 3,444px and 4,198px of trend,
 *     calendar, site ladder, species table and cause breakdown, plus transfers, escapes and
 *     fetal loss: 8,213px, 42% of the page. That made sense while those modules were authored
 *     fixtures and this was the only place the figures agreed. They now read the same events
 *     under the same scope, so a summary row that links out cannot contradict what it links
 *     to. `FlowSummaries` keeps the size, direction and recent shape of each flow — what a
 *     POPULATION page needs — and leaves the analysis to the module that owns it.
 *   · FIFTY SITES AS LIST ROWS WERE 3,211px. `TileGrid` keeps all fifty and drops the prose.
 *   · THE CLASS TREEMAP was 330px of three near-identical blocks and nine unlabelled slivers,
 *     sitting on top of a list with the same three figures. One strip replaced it.
 *   · TWENTY THREE-LINE SPECIES ROWS opened a registry of 4,745 at 1,693px. Ten do.
 *
 * Three figures went with the height, and they were the reason to do this rather than a side
 * effect: "0 natural · 0 assisted" under Births, "Transfer in +0", and an escape row reading
 * "−0 · 0 not recovered of 0". Each was a real column split into categories it does not
 * contain, or an absent metric rendered as a nil. See `MOVEMENTS` and `population.ts`.
 */

import { UNSOURCED } from '../../core/metrics'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeftRight,
  Baby,
  Boxes,
  Dna,
  Footprints,
  Info,
  Layers,
  MapPin,
  PawPrint,
  ScrollText,
  Search,
  Skull,
  Shell,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Trophy,
  Venus,
  X,
  ChevronRight,
} from 'lucide-react'
import { longDate, shortDate, type Win } from '../../core/calendar'
import { searchAnimals } from '../../core/animals'
import { count } from '../../core/events'
import { SITES, siteOf } from '../../core/world'
import { CLASS_ICONS } from '../../exec/classIcons'
import {
  ACCENT_INK,
  MUTED,
  VALUE,
  FAINT,
  HAIR,
  Figure,
  Hero,
  RED_LIST,
  Rule,
  Section,
  Stack,
  TONE,
  RedList,
  fmt,
  mix,
  useAccent,
  type RedListCode,
} from '../../exec/system'
import {
  AreaTrend,
  EventTrend,
  Concentration,
  PercentSplit,
  MicroBars,
  RankList,
  Ribbon,
  SplitRing,
  pct,
} from '../../exec/marks'
import { compareOf, pointsOf, tail } from '../plot'
import type { Pt } from '../../exec/marks'
import type { LucideIcon } from 'lucide-react'
import { AnimalPanel } from '../panels'
import { useSheet } from '../sheet'
import { CardWindowNote, useCardWindow } from '../cardWindow'
import { useScope } from '../scope'
import { DateSheet } from '../filters'
import { MoreRows, usePaged } from '../perf'
import { animalFromId } from '../drill'
import {
  citesBands,
  classBands,
  holdings,
  iucnCounts,
  isRegulated,
  regulatorySplit,
  scheduleBands,
  standingLabel,
  totalOf,
  type CitesAppendix,
  type Holding,
  type ScheduleClass,
} from './regulatory'
import {
  TREND_RANGES,
  change,
  leaders,
  sexTotals,
  movement,
  siteRows,
  sortSites,
  sortSpecies,
  searchSpecies,
  speciesRows,
  type Leader,
  type SiteRow,
  type SiteSort,
  type SpeciesRow,
  type SpeciesSort,
} from './population'
import {
  CitesGroup,
  FlowBucketPanel,
  IucnGroup,
  RegulatoryGroup,
  ScheduleGroup,
  SitePanel,
  SpeciesPanel,
} from './populationSheets'

/* ── the contextual lens ─────────────────────────────────────────────────── */

/**
 * The secondary filters, behind the toolbar's filter button rather than on the page.
 *
 * They are a LENS over the population, not a second scope: every one of them narrows which
 * animals the species-derived sections count, and the chips under the toolbar say which are
 * on. The flow sections — births, deaths, transfers, escapes — are event counts and cannot be
 * cut by a CITES appendix, so they are honest about following the site and window only.
 */
export interface Facets {
  regulatory: 'all' | 'regulated' | 'open'
  cites: 'all' | CitesAppendix | 'none'
  schedule: 'all' | ScheduleClass | 'none'
  iucn: 'all' | RedListCode
  cls: 'all' | string
  sex: 'all' | 'M' | 'F' | 'U'
}

const NO_FACETS: Facets = { regulatory: 'all', cites: 'all', schedule: 'all', iucn: 'all', cls: 'all', sex: 'all' }

const facetsOn = (f: Facets) => Object.values(f).filter((v) => v !== 'all').length

const SEX_WORD = { M: 'Male', F: 'Female', U: 'Unknown' } as const

function keepsStanding(h: Holding, f: Facets): boolean {
  const s = h.standing
  if (f.regulatory === 'regulated' && !isRegulated(s)) return false
  if (f.regulatory === 'open' && isRegulated(s)) return false
  if (f.cites !== 'all' && (f.cites === 'none' ? Boolean(s.cites) : s.cites !== f.cites)) return false
  if (f.schedule !== 'all' && (f.schedule === 'none' ? Boolean(s.schedule) : s.schedule !== f.schedule)) return false
  if (f.iucn !== 'all' && s.iucn !== f.iucn) return false
  if (f.cls !== 'all' && h.species.cls !== f.cls) return false
  return true
}

/**
 * THE POPULATION UNDER ONE WINDOW, WITH THE LENS APPLIED.
 *
 * Lifted out of the page body because it is no longer the page body's alone: the cards that
 * carry their own date range have to run the identical pipeline over a different window, and
 * two copies of "filter the holdings, then keep the species those holdings name" would be two
 * copies free to disagree about what the lens means. `win` is a parameter rather than a read of
 * the scope for the same reason.
 */
function useLens(siteKey: string | null, win: Win, facets: Facets) {
  /* ONE READ, EVERY SECTION — within a single window. `holdings` is the population with each
     species' standing attached; everything from the composition down to the leaders is an
     aggregation of this array or of the species rows beside it, which is what makes the parts
     sum to the hero for any card reading the SAME window as the hero. */
  const allHoldings = useMemo(() => holdings(siteKey, win), [siteKey, win])
  const rows = useMemo(
    () =>
      allHoldings
        .filter((h) => keepsStanding(h, facets))
        .map((h) => (facets.sex === 'all' ? h : { ...h, count: sexOfHolding(h, facets.sex) }))
        .filter((h) => h.count > 0),
    [allHoldings, facets],
  )
  const allSpecies = useMemo(() => speciesRows(siteKey, win), [siteKey, win])
  const species = useMemo(() => {
    const keep = new Set(rows.map((r) => r.species.id))
    return allSpecies
      .filter((s) => keep.has(s.id))
      .map((s) =>
        facets.sex === 'all'
          ? s
          : { ...s, animals: facets.sex === 'M' ? s.male : facets.sex === 'F' ? s.female : s.unknown },
      )
      .filter((s) => s.animals > 0)
      .sort((a, b) => b.animals - a.animals)
  }, [allSpecies, rows, facets.sex])
  return { allHoldings, rows, allSpecies, species }
}

/* `useFlowSheets` lived here — it built the per-flow sheets the movement list opened.
   That list and the summary strip under it are both gone; the flows are reached from the
   Births and Mortality columns and from `Recorded flows`, which route to the module. */

/* ── the page ────────────────────────────────────────────────────────────── */

export default function Animals() {
  const { scope } = useScope()
  const { open } = useSheet()
  const win = scope.win
  const siteKey = scope.site?.key ?? null

  const [facets, setFacets] = useState<Facets>(NO_FACETS)
  const [query, setQuery] = useState('')

  /* The sheet stores the element it was handed, so a facet sheet reading `facets` from this
     closure would show the values it opened with for ever. It keeps its own draft and calls
     back through a ref, which is stable for the life of the page. */
  const applyRef = useRef(setFacets)
  applyRef.current = setFacets
  const applyFacets = useCallback((next: Facets) => applyRef.current(next), [])

  const { allHoldings, rows, species } = useLens(siteKey, win, facets)

  const total = totalOf(rows)
  const collection = totalOf(allHoldings)
  const lensed = facetsOn(facets) > 0
  const delta = useMemo(() => change(siteKey, win), [siteKey, win])
  const sites = useMemo(() => siteRows(win), [win])
  const enclosures = siteKey ? (siteOf(siteKey)?.enclosures ?? 0) : SITES.reduce((n, s) => n + s.enclosures, 0)
  const scopeName = scope.site ? scope.site.name : 'Overall'

  const openSite = (key: string) =>
    open({ title: siteOf(key)?.name ?? key, eyebrow: 'Animal Population', body: <SitePanel siteKey={key} win={win} /> })
  /* "View all" is the same contextual sheet every other drill uses, holding the complete
     listing the card only shows the head of. Each row opens that site's own panel, so the
     sheet is a way IN rather than a terminus. */
  /* The complete listing keeps `SpeciesCard` — it already carries search, four sorts and
     paging over 4,745 rows, and rebuilding that inside the sheet would be a second
     implementation of a control that works. */
  const openAllSpecies = () =>
    open({
      title: 'Species',
      eyebrow: 'Collection Explorer',
      body: (
        <div className="pb-2">
          <SpeciesCard rows={species} query={query} onQuery={setQuery} onOpen={openSpecies} />
        </div>
      ),
    })

  const openAllSites = () =>
    open({
      title: 'Sites',
      eyebrow: 'Animal Population',
      body: (
        <div className="px-[var(--gutter)] pb-2">
          <Section icon={MapPin} label="Site population" aside={`${sites.length} sites`}>
            <RankList
              items={sites.map((r) => ({
                key: r.key,
                title: r.name,
                meta: `${r.code} · ${r.species} species · ${r.enclosures} enclosures`,
                value: fmt(r.animals),
                share: r.percent,
                change: r.net === 0 ? undefined : signed(r.net),
                onPick: () => openSite(r.key),
              }))}
            />
          </Section>
        </div>
      ),
    })

  const openSpecies = (row: SpeciesRow) =>
    open({ title: row.name, eyebrow: row.siteName, body: <SpeciesPanel row={row} win={win} /> })

  /* THE SAME FOUR SHEETS THE ROWS ALWAYS OPENED, named rather than inlined five times over.
     What changed on this page is which mark carries the tap, never where the tap goes. */
  /* `openClass` opened the class sheet. Selecting a class in the explorer recuts the panel
     beside it instead, which is the whole point of the two-panel layout. */





  const openRegulatory = (regulated: boolean) =>
    open({
      title: regulated ? 'Regulatory' : 'Non-regulatory',
      eyebrow: 'Regulatory standing',
      body: <RegulatoryGroup regulated={regulated} rows={rows} win={win} siteKey={siteKey ?? undefined} />,
    })
  const openCites = (appendix: CitesAppendix) =>
    open({
      title: `CITES Appendix ${appendix}`,
      eyebrow: 'Regulatory',
      body: <CitesGroup appendix={appendix} rows={rows} win={win} siteKey={siteKey ?? undefined} />,
    })
  const openSchedule = (schedule: ScheduleClass) =>
    open({
      title: `Schedule ${schedule}`,
      eyebrow: 'Regulatory',
      body: <ScheduleGroup schedule={schedule} rows={rows} win={win} siteKey={siteKey ?? undefined} />,
    })
  /* ── what the marks are fed ────────────────────────────────────────────────
     Every one of these is an aggregation of `rows`, `species` or the event stream under the
     scope in force — the same reads the page always made, grouped once here instead of being
     recomputed inside the JSX three times per card. */
  const classes = useMemo(() => classBands(rows), [rows])
  const reg = useMemo(() => regulatorySplit(rows), [rows])
  const cites = useMemo(() => citesBands(rows), [rows])
  const schedules = useMemo(() => scheduleBands(rows), [rows])
  const citesTotal = cites.reduce((n, b) => n + b.animals, 0)
  const scheduleTotal = schedules.reduce((n, b) => n + b.animals, 0)
  const citesShare = total ? (citesTotal / total) * 100 : 0

  return (
    <>
      {/* 1 · TOOLBAR. The router's header already carries the back chevron, the title, the
          window pill and the site pill; this adds the three the brief asks for that are the
          page's own — the as-of statement, search over the collection, and the secondary
          filters. Putting them here rather than in the shared header keeps every other module
          exactly as it was. */}
      {/* 1 · HERO, WITH THE TOOLBAR INSIDE IT. The strongest thing on the page and only three
          supporting figures — the brief's "do not create multiple oversized KPI cards".

          The toolbar was a card of its own directly above this one: an as-of line, a search
          field and the secondary filters. It reads as part of the hero because it governs the
          hero, and two cards to say "here is where you are, here is the number" was one card
          more than the page needed. */}
      <Hero
        head={
          <Toolbar
            bare
            query={query}
            onQuery={setQuery}
            facets={facets}
            holdings={allHoldings}
            onApply={applyFacets}
            onOpenAnimal={(id, name) =>
              open({ title: id, eyebrow: name, body: <AnimalPanel record={animalFromId(id, name)} /> })
            }
            win={win}
          />
        }
        icon={PawPrint}
        value={fmt(lensed ? total : delta.closing)}
        label={lensed ? `Animals · filtered of ${fmt(collection)}` : 'Total animals'}
        status={
          lensed
            ? `${((total / Math.max(1, collection)) * 100).toFixed(1)}% of ${scopeName.toLowerCase()}`
            : `${signed(delta.net)} net · ${win.window}`
        }
        tone={lensed ? 'neutral' : netTone(delta.net)}
        stats={[
          { value: fmt(species.length), label: 'Species' },
          { value: String(siteKey ? 1 : SITES.length), label: 'Sites' },
          { value: fmt(enclosures), label: 'Enclosures' },
        ]}
      />

      {/*
        FOUR CONTAINERS, NOT EIGHTEEN.
        =============================
        This page carried eighteen white cards down one column: population change, trend,
        composition, regulatory standing, CITES, the schedules, IUCN, sites, species, sex,
        births, mortality, transfers, escapes, fetal death and leaders, each in a card of its
        own. Every one was the right card and the stack was the wrong shape — eighteen cards of
        equal weight say these are eighteen equally important things to consider, and a reader
        looking for the species list scrolled past nine of them to reach it.

        They are grouped by the QUESTION each answers, and NOTHING WAS DROPPED: every block that
        was a card is a block inside one. `Section bare` prints its label as a hairline
        sub-heading instead of opening a card — see the note on that prop in `exec/system.tsx` —
        so the hierarchy reads group, then block, then rows, and a group animates in as one
        thing rather than as eighteen separate arrivals.

        The grouping is the reader's, not the schema's:
          WHAT WE HOLD          the standing collection — its shape, its sites, its species
          WHAT CHANGED          the flows that moved it, and the curve they add up to
          WHAT WE ANSWER FOR    the three regulatory instruments
      */}
      <Stack>
        <SectionLabel n={1}>Population</SectionLabel>
        <Grid cols={2}>
          <div className="@[560px]:col-span-2">
            <PopulationOverview siteKey={siteKey} facets={facets} onSex={(v) => setFacets({ ...facets, sex: v })} />
          </div>
          {/* BIRTHS AND MORTALITY SHARE A ROW, and the order is the argument for it: they are
              the same question with opposite signs, so reading them side by side is reading
              population IN against population OUT. Split across rows — trend beside births,
              mortality beside flows — the comparison needed a scroll. They are also two copies
              of the same mark at the same height, so the row edges come out level without any
              equal-height override. */}
          <FlowTrendCard slug="births" label="Births" noun="births" icon={Baby} tone="good" siteKey={siteKey} />
          <FlowTrendCard slug="mortality" label="Mortality" noun="deaths" icon={Skull} tone="bad" siteKey={siteKey} />
          {/* The curve and the ledger that explains it, paired: the trend states WHAT the
              headcount did, the flows state WHY. */}
          <TrendCard siteKey={siteKey} scopeName={scopeName} globalWin={win} />
          <FlowSummaries siteKey={siteKey} />
        </Grid>

        <SectionLabel n={2}>Collection</SectionLabel>
        {/* TWO COLUMNS, NOT THREE. The band holds Site population, Population leaders and the
            full-width explorer — so a 3-column grid put two cards in row one and left the third
            cell EMPTY, which measured as a 351px ragged edge. Two columns fill the row. */}
        <Grid cols={2}>
          <SitesCard rows={sites} scoped={siteKey} onOpen={openSite} onViewAll={openAllSites} />
          <LeadersCard siteKey={siteKey} facets={facets} />

          {/* THE EXPLORER SPANS THE ROW. Two cards became one: the composition list is now the
              class index on its left, and the species list is what a class selection recuts. */}
          <div className="@[560px]:col-span-2 @[900px]:col-span-3">
            <CollectionExplorer
              classes={classes}
              species={species}
              onOpenSpecies={openSpecies}
              onViewAllSpecies={openAllSpecies}
            />
          </div>
        </Grid>

        <SectionLabel n={3}>Conservation &amp; Regulatory</SectionLabel>
        {/* THE THREE INSTRUMENTS STAY APART. CITES is a trade convention, the Schedules are
            Indian domestic law and the Red List is an assessment of extinction risk. An animal
            routinely carries two or all three, so they do NOT sum and must never be drawn as one
            distribution — four cards, not one stacked chart. */}
        <Grid cols={2}>
          <Section icon={ScrollText} label="Regulatory standing" aside={`${pct(reg.regulated.percent)} regulated`}>
            <PercentSplit
              unit="animals"
              left={{
                label: 'Regulatory',
                value: reg.regulated.animals,
                meta: `${reg.regulated.species} species`,
                onPick: () => openRegulatory(true),
              }}
              right={{
                label: 'Non-regulatory',
                value: reg.open.animals,
                meta: `${reg.open.species} species`,
                onPick: () => openRegulatory(false),
              }}
            />
          </Section>

          <Section icon={ShieldAlert} label="CITES" aside={`${pct(citesShare)} listed`}>
            <Ribbon items={cites.map((b) => ({ label: b.label, value: b.animals }))} height={11} />
            <div className="mt-4">
              <RankList
                rank={false}
                showShare={false}
                items={cites.map((b) => ({
                  key: b.key,
                  title: b.label,
                  meta: `${b.species} species · ${pct(b.percent)}`,
                  value: fmt(b.animals),
                  share: citesTotal ? (b.animals / citesTotal) * 100 : 0,
                  onPick: b.animals > 0 ? () => openCites(b.key as CitesAppendix) : undefined,
                }))}
              />
            </div>
          </Section>

          <Section icon={ScrollText} label="Wildlife Protection Act" aside="Schedule I · II · III">
            {/* A LIST, LIKE CITES ABOVE IT. Three comparison tiles gave each schedule a box of
                its own, which reads as three separate findings and cost three times the height
                of three rows — and the two cards sit side by side stating the same KIND of
                thing, so they should stack the same way. */}
            <RankList
              rank={false}
              showShare={false}
              items={schedules.map((b) => ({
                key: b.key,
                title: `Schedule ${b.key}`,
                meta: `${b.species} species · ${pct(b.percent)}`,
                value: fmt(b.animals),
                share: scheduleTotal ? (b.animals / scheduleTotal) * 100 : 0,
                onPick: b.animals > 0 ? () => openSchedule(b.key as ScheduleClass) : undefined,
              }))}
            />
          </Section>

          <Section icon={ShieldAlert} label="IUCN conservation status" aside="tap a category">
            <RedList
              counts={iucnCounts(rows)}
              onOpen={(code) =>
                open({
                  title: RED_LIST.find((c) => c.code === code)?.name ?? code,
                  eyebrow: 'IUCN Red List',
                  body: <IucnGroup code={code} rows={rows} win={win} siteKey={siteKey ?? undefined} />,
                })
              }
            />
          </Section>
        </Grid>

        <SectionFoot>
          All numbers are as of {longDate(win.to)} and based on the selected filters.
        </SectionFoot>
      </Stack>
    </>
  )
}

/* ── the eight cards that carry their own date range ─────────────────────── */

/**
 * POPULATION OVERVIEW — the headcount and who it is made of, in one container.
 *
 * TWO CARDS BECAME ONE, AND THE REASON IS HEIGHT RATHER THAN TIDINESS. Population change and Sex
 * distribution were two cards in one row that could not agree on a height, because one is a
 * bridge plus a six-part breakdown and the other is a ring plus three rows. Whichever was shorter
 * ended in white space. Merged, there is one header, one set of padding and one card edge, and the
 * two zones simply end where their content ends — the divider between them carries the boundary
 * the two card edges used to.
 *
 * 55/45, and the left is wider because it holds a 3x2 grid of figures while the right holds a ring
 * and three rows.
 *
 * THE SPLIT ENGAGES AT 880px OF CARD, NOT 700. At 700 it turned on before there was room for it:
 * measured at a 1024px viewport the right zone was 315px, the ring took 140 of them, and the
 * legend labels rendered at ZERO width — three coloured dots with numbers and no words. The class
 * list in the explorer went the same way, truncating "Mammalia" to "Mam...". 880 is the width at
 * which both zones hold their content without a single truncation; below it they stack, which
 * measures clean at every width tested.
 *
 * CENSUS ADJUSTMENT IS HIDDEN AT ZERO. It was "Census revision" and always rendered — a technical
 * word for the arithmetic gap between the register and the records, printing "0" on an executive
 * overview to say nothing happened. It now appears only when it is non-zero, which is the only
 * time it is information, and it is named for what a reader would call it.
 */
/* The three inks this container uses, named where they are used. Neutral dark rather than pure
   black: #1F2421 on a white card reads as considered, #000 reads as a default. */
const INK = '#1F2421'
const INK_2 = '#777C78'
const INK_3 = '#9A9E9B'

function PopulationOverview({
  siteKey,
  facets,
  onSex,
}: {
  siteKey: string | null
  facets: Facets
  onSex: (sex: Facets['sex']) => void
}) {
  /* NO PER-CARD WINDOW. The pill let this card be recut independently of the page, which is right
     for a chart buried mid-page and wrong for the page's headline card — an overview on a different
     window from the filter above it is the contradiction the scope header exists to prevent. */
  const { scope } = useScope()
  const win = scope.win
  const move = useMemo(() => movement(siteKey, win), [siteKey, win])
  const delta = useMemo(() => change(siteKey, win), [siteKey, win])
  const { species } = useLens(siteKey, win, facets)
  const sexes = useMemo(() => sexTotals(species), [species])

  const share = (n: number) => Math.round((n / Math.max(1, sexes.total)) * 100)

  const flows: { key: string; label: string; icon: LucideIcon; value: number | null; sign: 1 | -1; note?: string }[] = [
    { key: 'births', label: 'Births', icon: Baby, value: move.births.total, sign: 1 },
    { key: 'accession', label: 'Accessions', icon: Boxes, value: move.accessions, sign: 1 },
    { key: 'mortality', label: 'Mortality', icon: Skull, value: move.deaths, sign: -1 },
    { key: 'transfers', label: 'Transfers out', icon: ArrowLeftRight, value: move.transfers.out, sign: -1 },
    { key: 'escaped', label: 'Escapes', icon: Footprints, value: null, sign: -1, note: UNSOURCED.escaped },
    { key: 'fetal', label: 'Fetal loss', icon: Dna, value: null, sign: -1, note: UNSOURCED.fetal },
  ]

  /* Lightness steps of the accent, never cycled hues — the house rule in `exec/marks.tsx`. */
  /* Three flat steps of the brand green, and white ink ONLY on the one dark enough to carry it —
     white on the two pale segments is the low-contrast label the brief rules out. */
  const bars = [
    { key: 'm', label: 'Male', value: sexes.male, fill: '#37bd69', ink: '#ffffff' },
    { key: 'f', label: 'Female', value: sexes.female, fill: '#8fd9ae', ink: '#15512f' },
    { key: 'u', label: 'Undetermined', value: sexes.unknown, fill: '#d6f0e0', ink: '#15512f' },
  ]

  return (
    <Section lead icon={Sparkles} label="Population overview">
      <div className="grid grid-cols-1 gap-5 @[880px]:grid-cols-[55%_1fr] @[880px]:gap-7">
        {/* ── left · how the headcount moved ─────────────────────────────── */}
        <div className="min-w-0 @[880px]:border-r @[880px]:border-[#f0efec] @[880px]:pr-7">
          {/* EACH FIGURE SITS OVER ITS OWN CAPTION. Inline, the date read as part of the number
              beside it — "109,878 30 Apr" is two facts with no boundary, and at three figures to a
              row the eye had to work out where each one ended. Stacked, the number is the thing
              and the line under it says which number it is. */}
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <span className="min-w-0">
              <span className="block font-display text-n-sm font-medium tabular-nums" style={{ color: INK_2 }}>
                {fmt(delta.opening)}
              </span>
              <span className="mt-1 block text-caption" style={{ color: INK_3 }}>
                {shortDate(Math.max(0, win.from - 1))} · starting
              </span>
            </span>
            <span className="pb-5 text-caption" style={{ color: INK_3 }} aria-hidden>
              →
            </span>
            <span className="min-w-0">
              <span
                className="block font-display text-n font-semibold tabular-nums"
                style={{ color: TONE[netTone(delta.net)] }}
              >
                {signed(delta.net)}
              </span>
              <span className="mt-1 block text-caption" style={{ color: INK_3 }}>
                net change
              </span>
            </span>
            <span className="pb-5 text-caption" style={{ color: INK_3 }} aria-hidden>
              →
            </span>
            <span className="min-w-0">
              <span className="block font-display text-n-xl font-semibold tabular-nums" style={{ color: INK }}>
                {fmt(delta.closing)}
              </span>
              <span className="mt-1 block text-caption" style={{ color: INK_3 }}>
                {shortDate(win.to)} · current
              </span>
            </span>
          </div>

          {/* A LABEL, NOT A `Rule`. The rule drew a hairline the full width of the zone and cost
              about 40px to say two words — and §6 asks for fewer dividers, keeping only the one
              above Net change and the vertical one between the zones. */}
          <p className="mt-6 mb-3 text-body font-semibold" style={{ color: INK }}>What changed</p>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-3 @[420px]:grid-cols-3">
            {flows.map((f) => (
              <li key={f.key} className="min-w-0">
                <span className="flex items-center gap-2">
                  <f.icon size={18} strokeWidth={1.75} className="shrink-0" style={{ color: INK_3 }} aria-hidden />
                  <span className="min-w-0 truncate text-body" style={{ color: INK_2 }}>
                    {f.label}
                  </span>
                </span>
                {/* "NA", not an em dash. A dash reads as a value the card declined to print; NA
                    reads as "not available", which is what `UNSOURCED` means — the extract holds
                    no escape or fetal-loss record. The reason stays in the tooltip. */}
                {f.value === null ? (
                  <span className="mt-1 block text-lead font-medium italic" style={{ color: INK_3 }} title={f.note}>
                    NA
                  </span>
                ) : (
                  <span
                    className="mt-1 block font-display text-lead font-bold tabular-nums"
                    style={{ color: f.value === 0 ? INK_3 : f.sign > 0 ? TONE.good : TONE.bad }}
                  >
                    {f.value === 0 ? '0' : signed(f.sign * f.value)}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* "Net change from records" and "Census adjustment" lived here. The first was the
              third printing of +142 — the bridge above states it as the net, and the six metrics
              beside it are what it is the sum of. */}
        </div>

        {/* ── right · who they are ───────────────────────────────────────── */}
        <div className="min-w-0">
          {/* 140, NOT 158 — AND THE META LINE IS GONE. At 158 the ring took so much of a 45%
              zone that the legend beside it collapsed: measured at a 1180px viewport, "Male" had
              27px for 30px of text and "Undetermined" 36px for 90px, so every label rendered as
              a sliver. Three coloured dots with numbers and no words is not a legend.

              "Shoals, colonies, unsexed" went with it for the same reason — it needed 136px and
              had 36px, so it was never readable at this width, and the word Undetermined already
              carries the meaning it was explaining. */}
          <SplitRing
            size={140}
            label="Animals"
            unit="animals"
            items={[
              { key: 'm', label: 'Male', value: sexes.male, onPick: () => onSex('M') },
              { key: 'f', label: 'Female', value: sexes.female, onPick: () => onSex('F') },
              { key: 'u', label: 'Undetermined', value: sexes.unknown, onPick: () => onSex('U') },
            ]}
          />
          {/* ONE BAR, NO LEGEND UNDER IT. The rows above already state each count and share, so a
              second set of figures below the bar would be the third printing of the same three
              numbers. The bar answers only "how do they compare", which needs no labels of its
              own beyond the percentages inside it. */}
          {/* A FLOOR ON EVERY SEGMENT'S WIDTH. At 6% the Undetermined band was 40px of a 570px
              bar and read as a rounding artefact rather than a third category — the brief's
              objection exactly. A 12% floor keeps it legible while the two majors still divide
              the rest in their true ratio, and the percentage inside states the real figure so
              nothing is overstated. */}
          <span className="mt-5 flex h-[38px] w-full overflow-hidden rounded-[10px]" aria-hidden>
            {bars.map((p) => {
              const real = (p.value / Math.max(1, sexes.total)) * 100
              return p.value > 0 ? (
                <span
                  key={p.key}
                  className="grid place-items-center text-caption font-semibold tabular-nums"
                  /* FLAT, NOT GRADED. The gradient read as a grey wash over the green — the
                     "dirty" look — because `mix()` lightens toward the page ground, so the top of
                     each segment drifted off-hue. A composition bar states three shares; the only
                     thing its fill has to do is tell them apart. */
                  style={{ width: `${Math.max(12, real)}%`, backgroundColor: p.fill, color: p.ink }}
                >
                  {share(p.value)}%
                </span>
              ) : null
            })}
          </span>
        </div>
      </div>
    </Section>
  )
}

/**
 * The flows that moved the population, one row each, each leading to the module that owns it.
 *
 * SIX ROWS AND TWO OF THEM ARE DASHES. Escapes and fetal loss are in `UNSOURCED` — no escape
 * record, no fetal-loss record — and they are listed rather than dropped, because a reader who
 * knows the estate has escapes should find out that the SYSTEM has none, not be left to assume
 * the page forgot. The four that are real carry a figure, a ten-day tail and a route.
 *
 * The tail is deliberately ten days rather than the window: a row-scale mark cannot carry an
 * axis, so what it can honestly say is "and lately", which is what ten columns show. See
 * `plot.ts`'s own note on `tail`.
 */
function FlowSummaries({ siteKey, bare }: { siteKey: string | null; bare?: boolean }) {
  const { win, pill, overridden } = useCardWindow()

  const rows = useMemo(() => {
    const of = (slug: string) => ({
      total: count(slug, siteKey, win),
      spark: tail(slug, siteKey, win, 12),
    })
    return [
      { slug: 'births', label: 'Births', href: '#/births', sign: 1, tone: 'good' as const, ...of('births') },
      { slug: 'accession', label: 'Accessions', href: '#/accession', sign: 1, tone: 'good' as const, ...of('accession') },
      { slug: 'mortality', label: 'Deaths', href: '#/mortality', sign: -1, tone: 'bad' as const, ...of('mortality') },
      {
        slug: 'transfers',
        label: 'Released or transferred out',
        href: '#/transfers',
        sign: -1,
        tone: 'neutral' as const,
        ...of('transfers'),
      },
    ]
  }, [siteKey, win])

  return (
    <Section bare={bare} icon={ArrowLeftRight} label="Recorded flows" aside={pill}>
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.slug} className="border-b border-[#f0efec] last:border-0">
            <a href={r.href} className="card-press -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-3 no-underline">
              <span className="min-w-0 flex-1 truncate text-small text-[#1c1a16]">{r.label}</span>
              <span className="hidden w-[86px] shrink-0 @[420px]:block">
                <MicroBars values={r.spark} tone={r.tone} />
              </span>
              <span
                className="w-[76px] shrink-0 text-right text-small font-medium tabular-nums"
                style={{ color: r.tone === 'bad' ? TONE.bad : r.tone === 'good' ? TONE.good : VALUE }}
              >
                {signed(r.sign * r.total)}
              </span>
              <ChevronRight size={13} strokeWidth={2.25} style={{ color: ACCENT_INK }} aria-hidden />
            </a>
          </li>
        ))}
        {(['escaped', 'fetal'] as const).map((slug) => (
          <li key={slug} className="flex items-baseline justify-between gap-3 border-b border-[#f0efec] py-3 last:border-0">
            <span className="text-small" style={{ color: MUTED }}>
              {slug === 'escaped' ? 'Escapes' : 'Fetal loss'}
            </span>
            <span className="shrink-0 text-caption" style={{ color: FAINT }}>
              — {UNSOURCED[slug]}
            </span>
          </li>
        ))}
      </ul>
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

/**
 * ONE CARD FOR BOTH DIRECTIONS — births and deaths, drawn identically and read together.
 *
 * PARAMETERISED RATHER THAN WRITTEN TWICE. Two near-identical event cards is how "births by day"
 * and "deaths by day" end up bucketed differently, or one gains a drill the other never got.
 * They are the same question about opposite signs, so the only things that vary are the slug,
 * the word and the tone.
 *
 * A LEVEL GETS A CURVE AND A FLOW GETS COLUMNS. A line through "births per day" claims a value
 * between the days and there is not one — eleven births on the 3rd and none on the 4th is not a
 * slope.
 *
 * IT CARRIES ITS OWN WINDOW, like every other card on this page. These two were the only cards
 * reading the page window directly, so they were the only two with no control in their corner —
 * a filter row above six cards, four of which could be recut and two of which could not, for no
 * reason a reader could see.
 *
 * THE GRAPH IS THE INTERACTION, and there is no "View details" button beside it. A column opens
 * `FlowBucketPanel` for that column's own span, scoped to the site in force. Zero columns stay
 * inert, because nothing is behind them.
 */
function FlowTrendCard({
  slug,
  label,
  noun,
  icon,
  tone,
  siteKey,
  bare,
}: {
  slug: string
  label: string
  noun: string
  icon: LucideIcon
  tone: 'good' | 'bad'
  siteKey: string | null
  bare?: boolean
}) {
  const { open } = useSheet()
  /* CHIPS, NOT A DATE PILL. The pill opened a sheet to choose a range — two taps and a modal to
     do what six always-visible chips do in one, on a card whose whole subject is a time series.
     `TREND_RANGES` is the same ladder `TrendCard` offers, so the two charts on this page are
     recut by the same set of spans rather than by two different vocabularies. */
  const [range, setRange] = useState(FLOW_RANGE_DEFAULT)
  const win = (TREND_RANGES.find((r) => r.key === range) ?? TREND_RANGES[1]).win
  const max = win.days > 200 ? 24 : 30
  const points = useMemo(() => pointsOf(slug, siteKey, win, max), [slug, siteKey, win, max])
  const compare = useMemo(() => compareOf(slug, siteKey, win, max), [slug, siteKey, win, max])

  /* The bucket's own span becomes the sheet's window. `days` is recomputed rather than carried,
     so a bucket can never claim a length its own bounds do not support. */
  const pick = (pt: Pt) => {
    if (pt.from === undefined || pt.to === undefined) return
    const bucket: Win = { ...win, from: pt.from, to: pt.to, days: pt.to - pt.from + 1, window: pt.label }
    open({
      title: label,
      eyebrow: 'Animal Population',
      body: (
        <FlowBucketPanel
          slug={slug}
          title={`${label} · ${pt.label}`}
          bucketLabel={pt.label}
          win={bucket}
          siteKey={siteKey}
          tone={tone}
        />
      ),
    })
  }

  return (
    <Section bare={bare} icon={icon} label={label}>
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hidden">
        {TREND_RANGES.map((r) => {
          const on = r.key === range
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={on}
              onClick={() => setRange(r.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-caption font-medium whitespace-nowrap transition-colors ${
                on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
              }`}
            >
              {r.label}
            </button>
          )
        })}
      </div>
      {/* Keyed on the scope for the reason `TrendCard` documents: `usePlay` latches on scroll, so
          a card already in view would swap to a different span with no motion at all. */}
      <EventTrend
        key={`${slug}-${siteKey ?? 'all'}-${win.from}-${win.to}`}
        points={points}
        compare={compare}
        unit={noun}
        tone={tone}
        onPick={pick}
        empty={`No ${noun} recorded in ${win.window}.`}
      />
    </Section>
  )
}

/* `SexCard` was merged into `PopulationOverview` above. */


function LeadersCard({ siteKey, facets, bare }: { siteKey: string | null; facets: Facets; bare?: boolean }) {
  const { win, pill, overridden } = useCardWindow()
  const { open } = useSheet()
  const { species } = useLens(siteKey, win, facets)
  const sites = useMemo(() => siteRows(win), [win])

  const openSite = (key: string) =>
    open({ title: siteOf(key)?.name ?? key, eyebrow: 'Animal Population', body: <SitePanel siteKey={key} win={win} /> })
  const openSpecies = (row: SpeciesRow) =>
    open({ title: row.name, eyebrow: row.siteName, body: <SpeciesPanel row={row} win={win} /> })

  /* THE FIVE ARE NOT FIVE OF A KIND, and the old 3-column grid said they were. Largest species,
     largest site and fastest growing are the card's finding; highest increase and lowest
     population are the footnotes to it. Split by KEY rather than by index because `leaders()`
     drops "fastest" when no species clears its 500-animal floor and "gained" when nothing grew,
     so position four is not reliably the same insight from one window to the next. */
  const all = leaders(species, sites)
  const of = (key: string) => all.find((l) => l.key === key)
  const primary = ['largest-species', 'largest-site', 'fastest'].map(of).filter(Boolean) as Leader[]
  const secondary = ['gained', 'smallest'].map(of).filter(Boolean) as Leader[]
  const openFor = (l: Leader) =>
    l.species ? () => openSpecies(l.species!) : l.siteKey ? () => openSite(l.siteKey!) : undefined

  return (
    <Section bare={bare} icon={Trophy} label="Population leaders" aside={pill}>
      {/* Three rows on hairlines, the same separator the site table uses — the two cards in this
          band read as one system rather than as a table beside a grid. */}
      <ul className="flex flex-col">
        {primary.map((l) => (
          <li key={l.key} className="border-b last:border-0" style={{ borderColor: HAIR }}>
            <LeaderRow leader={l} onOpen={openFor(l)} />
          </li>
        ))}
      </ul>
      {secondary.length > 0 && (
        /* THE FOOTNOTES, PAIRED. Half the type size of the three above and side by side, so the
           eye reads three findings and then two asides rather than five equal claims. This block
           is what closes the 74px of white the card used to end on. */
        <div className="mt-3 grid grid-cols-2 gap-x-4 border-t pt-3" style={{ borderColor: HAIR }}>
          {secondary.map((l) => (
            <LeaderMini key={l.key} leader={l} onOpen={openFor(l)} />
          ))}
        </div>
      )}
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

/* ── small shared pieces ─────────────────────────────────────────────────── */

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`
const netTone = (n: number): 'good' | 'bad' | 'neutral' => (n > 0 ? 'good' : n < 0 ? 'bad' : 'neutral')

/* ── the page's own layout: three labelled bands of cards ────────────────── */

/**
 * A NUMBERED SECTION LABEL, and why it is not a card.
 *
 * The page used to wrap each band in a white `Section` whose children were `bare` blocks. That
 * made three enormous cards, and a card is a unit of reading — one card holding six charts says
 * "these six are one thing". The band is now a LABEL over a grid: the heading carries no surface,
 * and every block inside is a card of its own.
 */
function SectionLabel({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="@[760px]:col-span-2 pt-2 first:pt-0">
      <h2 className="text-overline font-semibold uppercase" style={{ color: ACCENT_INK }}>
        <span className="tabular-nums">{n}.</span> {children}
      </h2>
    </div>
  )
}

/**
 * A CARD GRID that steps 1 → 2 → n with the CONTENT COLUMN, not the window.
 *
 * CARDS SIZE TO THEIR CONTENT — `items-start`, not stretch.
 *
 * This went the other way for one revision: `[&>*]:h-full` made every card fill its grid row, so
 * the ROW edges were flush. It traded a ragged outer edge for white space inside the shorter
 * card, which is the worse of the two — an empty half-card reads as a card that failed to load,
 * where a short card that stops where its content stops reads as finished.
 *
 * The real fix is not in this component. Ragged columns are a symptom of one card carrying far
 * more rows than its neighbour; the cure is capping the long lists and moving the remainder into
 * the sheet, which is what `SitesCard`, `SpeciesCard` and the composition card do.
 *
 * ONE GAP, 16px, AT EVERY WIDTH. It was `--gap`, which steps 12 → 16 → 20 with the container,
 * so card-to-card spacing grew as the cards did and a wide desktop drew 20px channels between
 * six cards while the section spacing above them stayed put — two different rhythms on one
 * screen. `--space-4` is the scale's `default` step and does not move, so the grid reads as one
 * consistent field of cards at every tier. The token, not the number, because the whole point of
 * the scale is that 16 is written down once.
 *
 * SECTION SPACING IS STILL `--gap`, and deliberately: the space between a label and its grid, and
 * between one band and the next, should breathe more on a wide screen than the gap between two
 * cards inside a row. That is the hierarchy — cards are tighter than sections.
 *
 * The thresholds are written as literals because Tailwind scans source text — a class name
 * assembled at runtime never reaches the stylesheet.
 *
 * WHY THE COUNTS DIFFER PER BAND. Two for Population, whose cards carry charts that need width.
 * Three for Collection and four for Conservation, which are lists and meters that read perfectly
 * well narrow. One count for all three would either starve the charts or waste width on lists.
 */
function Grid({ cols, children }: { cols: 2 | 3 | 4; children: ReactNode }) {
  const steps =
    cols === 2
      ? '@[560px]:grid-cols-2'
      : cols === 3
        ? '@[560px]:grid-cols-2 @[900px]:grid-cols-3'
        : '@[560px]:grid-cols-2 @[1000px]:grid-cols-4'
  return (
    /* Stretched, not `items-start` — cards on one row end level. See the note in `Stack`. */
    <div className={`@[760px]:col-span-2 grid grid-cols-1 gap-[var(--space-4)] ${steps}`}>
      {children}
    </div>
  )
}

/** The page's closing line — one statement of the scope every figure above was cut to. */
function SectionFoot({ children }: { children: ReactNode }) {
  return (
    <p className="@[760px]:col-span-2 flex items-start gap-2 pt-1 pb-2 text-caption" style={{ color: FAINT }}>
      <Info size={13} strokeWidth={2} className="mt-1 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

/**
 * The class glyph, as `TapRow` wants it.
 *
 * `CLASS_ICONS` covers eight of the nine classes the world holds and three of its entries are
 * drawn here rather than imported from Lucide, so the union does not line up with `LucideIcon`
 * structurally. The props are identical — size, strokeWidth, className, style — which is why
 * this is a cast rather than a wrapper. Gastropoda has no entry at all and falls to a shell.
 */
const classGlyph = (cls: string) => (CLASS_ICONS[cls] ?? Shell) as typeof Shell

/** One holding's count, cut to a single sex. Mirrors `core/animals.ts`'s own rates. */
function sexOfHolding(h: Holding, sex: 'M' | 'F' | 'U'): number {
  const UNSEXED: Record<string, number> = {
    Actinopterygii: 0.985, Chondrichthyes: 0.6, Malacostraca: 0.99, Gastropoda: 0.995,
    Insecta: 0.97, Amphibia: 0.8, Aves: 0.06, Reptilia: 0.09, Mammalia: 0.04,
  }
  const unknown = Math.round(h.count * (UNSEXED[h.species.cls] ?? 0.1))
  if (sex === 'U') return unknown
  const male = Math.round((h.count - unknown) * 0.52)
  return sex === 'M' ? male : h.count - unknown - male
}

/* ── what an event card needs, in one read ───────────────────────────────── */






/* `MoveRow` lived here — the row component for the movement list that
   `PopulationChangeCard` no longer carries. `Recorded flows` owns that list. */


/**
 * One of the three headline insights — label, figure, subject.
 *
 * THE FIGURE AND THE NAME SIT ON ONE LINE, which is the whole reason the card now fits. Stacked
 * — label, figure, name, sub, as the tiles had it — a leader is four lines and about 94px; three
 * of those plus the footnote pair overruns the 353px this card has by forty. Side by side it is
 * two lines and 56px, the hierarchy survives intact because it was never carried by the stacking
 * but by the type sizes, and the card gains back the room the old grid was wasting on gutters.
 *
 * THE FIGURE COLUMN IS A FIXED WIDTH so the three subjects start on one vertical. Sized to the
 * widest figure the card can hold — a five-digit grouped count at the desktop tier, "14,445" —
 * and stepped down a notch below 900px of column, where the type steps down with it.
 */
function LeaderRow({ leader, onOpen }: { leader: Leader; onOpen?: () => void }) {
  const body = (
    <>
      <p className="truncate text-overline font-semibold uppercase" style={{ color: FAINT }}>
        {leader.tag}
      </p>
      {/* CENTRED, NOT BASELINED. On a baseline the figure's ascent stacks on top of the name
          column's descent — and that column is two lines, so its descent carries the sub as
          well. Measured, that cost seven pixels a row over centring for no typographic gain,
          since the thing the eye aligns here is the figure against the PAIR, not against the
          first of two lines. Twenty-one pixels across the three rows, which is most of what
          this card had to give back. */}
      <div className="mt-0.5 flex items-center gap-3">
        <span className="w-[100px] shrink-0 @[900px]:w-[116px]">
          <Figure value={leader.value} size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium text-[#1c1a16]">{leader.label}</span>
          {leader.sub && (
            <span className="block truncate text-caption" style={{ color: FAINT }}>
              {leader.sub}
            </span>
          )}
        </span>
      </div>
    </>
  )
  return onOpen ? (
    <button type="button" onClick={onOpen} className="card-press -mx-2 block w-full rounded-[10px] px-2 py-1.5 text-left">
      {body}
    </button>
  ) : (
    <div className="py-1.5">{body}</div>
  )
}

/**
 * One of the two footnote insights — the same three fields at half the weight.
 *
 * The `sub` the tiles printed here ("357 held", the site a lone animal is kept at) is on the
 * hover title rather than a third line: these two exist to be glanced at under three findings
 * that outrank them, and a fourth line would cost this pair the size difference that makes it
 * read as secondary at all. The drill-down behind each still opens the full record.
 */
function LeaderMini({ leader, onOpen }: { leader: Leader; onOpen?: () => void }) {
  const body = (
    <>
      <p className="truncate text-overline font-semibold uppercase" style={{ color: FAINT }}>
        {leader.tag}
      </p>
      <div className="mt-0.5">
        <Figure value={leader.value} size={17} />
      </div>
      <p className="truncate text-small text-[#1c1a16]">{leader.label}</p>
    </>
  )
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      title={leader.sub ? `${leader.label} · ${leader.sub}` : leader.label}
      className="card-press -mx-2 block w-full min-w-0 rounded-[10px] px-2 py-1 text-left"
    >
      {body}
    </button>
  ) : (
    <div className="min-w-0 py-1">{body}</div>
  )
}

/* ── the toolbar ─────────────────────────────────────────────────────────── */

function Toolbar({
  query,
  onQuery,
  facets,
  holdings: all,
  onApply,
  onOpenAnimal,
  win,
  bare,
}: {
  query: string
  onQuery: (v: string) => void
  facets: Facets
  holdings: Holding[]
  onApply: (f: Facets) => void
  onOpenAnimal: (id: string, name: string) => void
  /** Rendered inside the hero's card rather than as one of its own. */
  bare?: boolean
  win: Win
}) {
  const { open } = useSheet()
  const on = facetsOn(facets)

  /* An id typed into the search box is a record, not a row — `searchAnimals` resolves one
     directly, so "ANM-AQ03-00142" opens the animal rather than filtering a species list that
     will never contain it. */
  const hits = useMemo(() => (query.trim().length >= 3 ? searchAnimals(query, null, win, 3) : []), [query, win])

  const body = (
    <>
        {/* The "Overall · as of …" / "50 sites · 4,745 species" line lived here. Both are
            restated below — the as-of date by the page footer, the counts by the hero's own
            stats. The search field and the filter button stay. */}
        <div className="mt-3 flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#f7f6f3] px-3 py-2">
            <Search size={14} strokeWidth={2} className="shrink-0" style={{ color: FAINT }} aria-hidden />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Species, class, site or animal ID"
              aria-label="Search the collection"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-small text-[#1c1a16] outline-none placeholder:text-[#9b958b]"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQuery('')}
                aria-label="Clear search"
                className="-mr-1 grid size-5 shrink-0 place-items-center rounded-full active:bg-[#eceae5]"
              >
                <X size={13} strokeWidth={2} style={{ color: '#6d6860' }} aria-hidden />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() =>
              open({
                title: 'Filters',
                eyebrow: 'Animal Population',
                body: <FacetSheet initial={facets} holdings={all} onApply={onApply} />,
              })
            }
            aria-label="Filters"
            className={`card-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-caption font-medium ${
              on ? 'bg-[#123a2c] text-white' : 'bg-[#f7f6f3] text-[#3d3a34]'
            }`}
          >
            <SlidersHorizontal size={13} strokeWidth={2} aria-hidden />
            Filter
            {on > 0 && <span className="tabular-nums opacity-70">{on}</span>}
          </button>
        </div>

        {hits.length > 0 && (
          <ul className="mt-2 flex flex-col">
            {hits.map((a) => (
              <li key={a.id} className="border-b border-[#f0efec] last:border-0">
                <button
                  type="button"
                  onClick={() => onOpenAnimal(a.id, a.speciesName)}
                  className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left"
                >
                  <PawPrint size={14} strokeWidth={1.75} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small text-[#1c1a16]">{a.callName ?? a.id}</span>
                    <span className="block truncate text-caption" style={{ color: FAINT }}>
                      {a.id} · {a.speciesName} · {a.siteName}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption" style={{ color: ACCENT_INK }}>
                    Record ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {on > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {activeChips(facets).map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full bg-[#f4f3ef] py-[4px] pr-1.5 pl-3 text-caption font-medium text-[#55524a]"
              >
                {c.label}
                <button
                  type="button"
                  onClick={() => onApply({ ...facets, [c.key]: 'all' } as Facets)}
                  aria-label={`Clear ${c.label}`}
                  className="grid size-[16px] shrink-0 place-items-center rounded-full bg-[#e4e2dc]"
                >
                  <X size={10} strokeWidth={2.5} aria-hidden />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => onApply(NO_FACETS)}
              className="rounded-full px-2 py-[4px] text-caption font-semibold"
              style={{ color: ACCENT_INK }}
            >
              Clear all
            </button>
          </div>
        )}
    </>
  )

  /* Bare inside the hero's card; its own card everywhere else, so the component stays usable
     on a page that has not been grouped. */
  return bare ? (
    body
  ) : (
    <div className="px-[var(--gutter)] pb-3">
      <div className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card-sm)]">{body}</div>
    </div>
  )
}

function activeChips(f: Facets): { key: keyof Facets; label: string }[] {
  const out: { key: keyof Facets; label: string }[] = []
  if (f.regulatory !== 'all') out.push({ key: 'regulatory', label: f.regulatory === 'regulated' ? 'Regulatory' : 'Non-regulatory' })
  if (f.cites !== 'all') out.push({ key: 'cites', label: f.cites === 'none' ? 'No CITES listing' : `CITES ${f.cites}` })
  if (f.schedule !== 'all') out.push({ key: 'schedule', label: f.schedule === 'none' ? 'Not scheduled' : `Schedule ${f.schedule}` })
  if (f.iucn !== 'all') out.push({ key: 'iucn', label: RED_LIST.find((c) => c.code === f.iucn)?.name ?? f.iucn })
  if (f.cls !== 'all') out.push({ key: 'cls', label: f.cls })
  if (f.sex !== 'all') out.push({ key: 'sex', label: SEX_WORD[f.sex] })
  return out
}

/**
 * The secondary filters, as a sheet.
 *
 * It holds its own draft rather than driving the page on every tap: the sheet stores the
 * element it was handed, so a control reading the page's state through a closure would show
 * the values it opened with for ever. Apply is one write, and Reset is one more.
 */
function FacetSheet({
  initial,
  holdings: all,
  onApply,
}: {
  initial: Facets
  holdings: Holding[]
  onApply: (f: Facets) => void
}) {
  const { back } = useSheet()
  const [draft, setDraft] = useState(initial)

  const classes = useMemo(() => [...new Set(all.map((h) => h.species.cls))].sort(), [all])
  const codes = useMemo(
    () => RED_LIST.filter((c) => all.some((h) => h.standing.iucn === c.code)).map((c) => c.code),
    [all],
  )

  const set = <K extends keyof Facets>(key: K, value: Facets[K]) => setDraft((d) => ({ ...d, [key]: value }))

  return (
    <>
      <Stack>
        <Section icon={ScrollText} label="Regulatory">
          <Chips
            options={[
              ['all', 'All'],
              ['regulated', 'Regulatory'],
              ['open', 'Non-regulatory'],
            ]}
            value={draft.regulatory}
            onPick={(v) => set('regulatory', v as Facets['regulatory'])}
          />
          <Rule label="CITES appendix" />
          <Chips
            options={[
              ['all', 'All'],
              ['I', 'Appendix I'],
              ['II', 'Appendix II'],
              ['III', 'Appendix III'],
              ['none', 'Not listed'],
            ]}
            value={draft.cites}
            onPick={(v) => set('cites', v as Facets['cites'])}
          />
          <Rule label="Wildlife Protection Act" />
          <Chips
            options={[
              ['all', 'All'],
              ['I', 'Schedule I'],
              ['II', 'Schedule II'],
              ['III', 'Schedule III'],
              ['none', 'Not scheduled'],
            ]}
            value={draft.schedule}
            onPick={(v) => set('schedule', v as Facets['schedule'])}
          />
        </Section>
        <Section icon={ShieldAlert} label="IUCN status">
          <Chips
            options={[['all', 'All'], ...codes.map((c) => [c, RED_LIST.find((x) => x.code === c)!.name] as [string, string])]}
            value={draft.iucn}
            onPick={(v) => set('iucn', v as Facets['iucn'])}
          />
        </Section>
        <Section icon={Layers} label="Taxonomic class">
          <Chips
            options={[['all', 'All'], ...classes.map((c) => [c, c] as [string, string])]}
            value={draft.cls}
            onPick={(v) => set('cls', v)}
          />
        </Section>
        <Section icon={Venus} label="Sex">
          <Chips
            options={[
              ['all', 'All'],
              ['M', 'Male'],
              ['F', 'Female'],
              ['U', 'Unknown'],
            ]}
            value={draft.sex}
            onPick={(v) => set('sex', v as Facets['sex'])}
          />
        </Section>
      </Stack>
      <div className="flex gap-2 px-[var(--gutter)] pt-1 pb-3">
        <button
          type="button"
          onClick={() => {
            onApply(NO_FACETS)
            back()
          }}
          className="card-press flex-1 rounded-[11px] border border-[#eceae5] bg-white py-3 text-small font-semibold text-[#3d3a34]"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draft)
            back()
          }}
          className="card-press flex-[2] rounded-[11px] py-3 text-small font-semibold text-white"
          style={{ backgroundColor: '#123a2c' }}
        >
          Apply
        </button>
      </div>
    </>
  )
}

/** The chip row every facet and every sort control on this page uses. */
function Chips({
  options,
  value,
  onPick,
}: {
  options: [string, string][]
  value: string
  onPick: (v: string) => void
}) {
  return (
    <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
      {options.map(([key, label]) => {
        const on = key === value
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(key)}
            className={`shrink-0 rounded-full px-3 py-[5px] text-caption font-medium whitespace-nowrap transition-colors ${
              on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ── the trend card ──────────────────────────────────────────────────────── */

function TrendCard({
  siteKey,
  scopeName,
  globalWin, bare }: {
  siteKey: string | null
  scopeName: string
  globalWin: Win; bare?: boolean }) {
  const { open } = useSheet()
  const [range, setRange] = useState('30d')

  /* "Custom" draws whatever the global date filter is set to, which is the only custom range
     the product has — so the chip opens the existing date sheet rather than growing a second
     date picker that could disagree with it. */
  const win = range === 'custom' ? globalWin : (TREND_RANGES.find((r) => r.key === range) ?? TREND_RANGES[1]).win
  const max = win.days > 200 ? 24 : 30
  const points = useMemo(() => pointsOf('animals', siteKey, win, max), [siteKey, win, max])
  /* THE COMPARISON IS A FIGURE HERE, NOT A GHOST CURVE. A headcount wobbles from day to day in
     the ledger, and two wobbling curves over each other is noise on noise — the earlier span's
     closing reading and the delta say the same thing and can be read at a glance. The event
     trends below DO draw their ghost, because a count per day is a much calmer series. */
  const compare = useMemo(() => {
    const c = compareOf('animals', siteKey, win, max)
    return c && { ...c, series: undefined }
  }, [siteKey, win, max])


  return (
    <Section bare={bare} icon={TrendingUp} label="Population trend">
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hidden">
        {[...TREND_RANGES.map((r) => [r.key, r.label] as [string, string]), ['custom', 'Custom'] as [string, string]].map(
          ([key, label]) => {
            const on = key === range
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setRange(key)
                  if (key === 'custom') {
                    open({ title: 'Date range', eyebrow: globalWin.window, body: <DateSheet /> })
                  }
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-caption font-medium whitespace-nowrap transition-colors ${
                  on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
                }`}
              >
                {label}
              </button>
            )
          },
        )}
      </div>

      {/* THE CURVE IS SCRUBBABLE, and the headline figure is whatever is under the finger.
          That is the whole difference between a chart and a readout: the number a director
          quotes comes from the axis they are pointing at, not from a legend. The dashed line
          behind it is the same span one period earlier — real readings, drawn in neutral ink so
          it cannot be mistaken for part of the series it is being compared against. */}
      {/* THE KEY IS WHY IT REDRAWS WHEN YOU CHANGE THE RANGE.

          `usePlay` latches on scroll: it flips `animate` true the first time the mark enters
          the viewport and stays true. That is right for a page being read downward, and wrong
          for a control the reader is operating — pick 90d and the card is already in view, so
          `inView` never transitions, the CSS animation class never restarts, and the curve
          swapped to a completely different span with no motion at all. It read as a static
          image that had quietly changed behind you.

          Keying on the span and the scope makes React mount a new element, which replays the
          draw. The window is what changed, so the window is what identifies the mark. */}
      <AreaTrend
        key={`${siteKey ?? 'all'}-${win.from}-${win.to}`}
        points={points}
        compare={compare}
        unit={`animals held · ${scopeName.toLowerCase()}`}
        height={156}
        empty={`${win.window} is a single reading — pick a longer range to see the curve.`}
      />

      {/* THE LATEST / RANGE-HIGH / RANGE-LOW READOUT LIVED HERE.

          Removed: "Latest" restated the headline figure directly above it — the same number
          twice in one card — and the two range bounds were already the two figures printed
          inside the plot's own scale. Three stats, none of which the curve had not already
          said. Taking them out is what makes this card the height of its chart.
          `last`, `high` and `low` go with it. */}
    </Section>
  )
}

/** Births and Mortality open on the same span as the population curve. */
const FLOW_RANGE_DEFAULT = '30d'

/** Species rows rendered into the page. The rest live in the sheet. */
const SPECIES_ROWS = 5

/**
 * THE COLLECTION EXPLORER — class on the left, its species on the right, one container.
 *
 * WHAT IT REPLACES AND WHY. The composition card listed twelve classes with counts; the species
 * card listed species with a metadata line naming their class. Two cards, one hierarchy, and the
 * relationship between them — these species are IN that class — was left for the reader to infer
 * from a string. Selecting a class here recuts the right panel in place, so the hierarchy is the
 * interaction rather than a caption.
 *
 * NO SCIENTIFIC NAME. The brief asks for one under each species; the extract is anonymised and
 * carries no binomial, so the row states what the database holds. An invented Latin name is the
 * one thing worse than its absence.
 *
 * NOTHING IS FETCHED OR RECOMPUTED. `classes` and `species` are the same two arrays the old
 * cards read, already scoped to the page's site and window. The class filter is a `filter` over
 * rows that are already in memory, which is why switching class costs nothing.
 */
function CollectionExplorer({
  classes,
  species,
  onOpenSpecies,
  onViewAllSpecies,
}: {
  classes: { cls: string; animals: number; species: number; percent: number }[]
  species: SpeciesRow[]
  onOpenSpecies: (row: SpeciesRow) => void
  onViewAllSpecies: () => void
}) {
  const accent = useAccent()
  /* Default is the largest class rather than a hardcoded name — "Aves" is only first because it
     happens to be biggest, and a filtered scope may not hold it at all. */
  const [cls, setCls] = useState<string>(classes[0]?.cls ?? '')
  /* Fixed order: the top of a class by population. The full listing in the sheet sorts. */
  const sort: SpeciesSort = 'animals'

  const active = classes.find((c) => c.cls === cls) ?? classes[0]
  const inClass = useMemo(
    () => sortSpecies(species.filter((r) => r.cls === (active?.cls ?? '')), sort),
    [species, active, sort],
  )
  const shown = inClass.slice(0, SPECIES_ROWS)

  return (
    <Section
      icon={Layers}
      label="Collection Explorer"
    >
      {/* 30/70, and the split is the argument: the class list is a short index the reader passes
          through, the species list is where they spend their time. Stacked below 700px of CARD —
          not of window — because two 45% panels on a phone are two unusable panels. */}
      <div className="grid grid-cols-1 gap-4 @[880px]:grid-cols-[30%_1fr] @[880px]:gap-6">
        {/* ── left · classes ─────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col @[880px]:border-r @[880px]:border-[#f0efec] @[880px]:pr-6">
          <p className="mb-2 text-overline font-semibold uppercase" style={{ color: FAINT }}>
            Collection classes
          </p>
          <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1 scrollbar-hidden">
            {classes.map((c) => {
              const on = c.cls === active?.cls
              const Glyph = classGlyph(c.cls)
              return (
                <li key={c.cls}>
                  <button
                    type="button"
                    onClick={() => setCls(c.cls)}
                    aria-pressed={on}
                    className="card-press -mx-2 flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left transition-colors"
                    style={on ? { backgroundColor: mix(accent, 0.1) } : undefined}
                  >
                    <Glyph size={14} strokeWidth={1.75} className="shrink-0" style={{ color: on ? ACCENT_INK : FAINT }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-small font-medium text-[#1c1a16]">{c.cls}</span>
                    <span className="shrink-0 text-caption tabular-nums text-[#3d3a34]">{fmt(c.animals)}</span>
                    <span className="w-[38px] shrink-0 text-right text-caption tabular-nums" style={{ color: FAINT }}>
                      {pct(c.percent)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {/* THE LIST SCROLLS IN PLACE instead of offering "View all 12 classes". Twelve rows is
              not a listing that needs a sheet — it needs about four rows of height back, which a
              scroll area gives while keeping every class one gesture away in the same container.

              ITS HEIGHT IS THE COLUMN'S, NOT A NUMBER. A fixed max-height clipped the list at
              eight rows while the species column beside it left the panel half empty below — the
              list was cut short in a container that had the room. `flex-1` spends whatever height
              the row already has, so the scroll only starts once the space is genuinely gone. */}
        </div>

        {/* ── right · species in the selected class ──────────────────────── */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-small font-semibold text-[#1c1a16]">Species in {active?.cls ?? '—'}</p>
            <span className="flex items-baseline gap-3">
              <span className="text-body font-medium tabular-nums" style={{ color: MUTED }}>
                {fmt(inClass.length)} species
              </span>
              {/* AT THE TOP, beside the count it qualifies. At the foot it sat below eight rows,
                  so a reader had to reach the end of a truncated list to learn it was truncated. */}
              {inClass.length > shown.length && (
                <button type="button" onClick={onViewAllSpecies} className="text-caption font-semibold" style={{ color: ACCENT_INK }}>
                  View all →
                </button>
              )}
            </span>
          </div>

          {/* The four sort chips lived here. The list is the top eight of a class by population,
              which is the one order that answers "what dominates this class" — re-sorting eight
              rows by name is a control with nothing to do. The full listing in the sheet keeps all
              four sorts, where 2,232 rows make them worth having. */}

          {shown.length === 0 ? (
            <p className="py-2 text-caption" style={{ color: FAINT }}>
              No species recorded in {active?.cls ?? 'this class'}.
            </p>
          ) : (
            <ul className="flex flex-col">
              {shown.map((r) => (
                <li key={r.id} className="border-b border-[#f0efec] last:border-0">
                  <button
                    type="button"
                    onClick={() => onOpenSpecies(r)}
                    className="card-press -mx-2 flex w-full items-start gap-3 rounded-[10px] px-2 py-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-small font-medium text-[#1c1a16]">{r.name}</span>
                        <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
                          {fmt(r.animals)}
                        </span>
                      </span>
                      <SexBar row={r} />
                    </span>
                    <span className="shrink-0 pt-1 text-right">
                      {r.net !== 0 && (
                        <span
                          className="block text-caption font-medium tabular-nums"
                          style={{ color: r.net > 0 ? TONE.good : TONE.bad }}
                        >
                          {signed(r.net)}
                        </span>
                      )}
                    </span>
                    <ChevronRight size={13} strokeWidth={2.25} className="mt-1 shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

        </div>
      </div>
    </Section>
  )
}

/**
 * ONE SEGMENTED BAR, not three unrelated figures.
 *
 * Male, female and undetermined are parts of one headcount, so they are drawn as one bar whose
 * segments sum to it. The three percentages are stated under it because a bar answers "which is
 * bigger" and a reader also needs "by how much" — the bar is for scanning, the numbers for the
 * one row they stopped on.
 */
function SexBar({ row }: { row: SpeciesRow }) {
  const accent = useAccent()
  const parts = [
    { key: 'm', word: 'Male', value: row.male, fill: mix(accent, 0.85) },
    { key: 'f', word: 'Female', value: row.female, fill: mix(accent, 0.5) },
    { key: 'u', word: 'Undetermined', value: row.unknown, fill: mix(accent, 0.22) },
  ]

  /* THE HAIRLINE BAR IS GONE, and so is the dot-separated string it sat under. Five pixels of
     three-part bar is too thin to compare and too wide to ignore, and "M 49% · F 42% · U 9% · 2
     sites" is four facts run into one line where none of them can be found. Each sex is now a
     labelled figure with its own swatch, which is what "properly shown" means for three parts of
     one headcount: the word, the count, the share, aligned so the eye can go down the column. */
  return (
    <span className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      {parts.map((p) => (
        <span key={p.key} className="flex items-baseline gap-1.5">
          <span className="size-[7px] shrink-0 translate-y-[-1px] rounded-full" style={{ backgroundColor: p.fill }} aria-hidden />
          <span className="text-caption" style={{ color: FAINT }}>
            {p.word}
          </span>
          <span className="text-caption font-medium tabular-nums text-[#3d3a34]">{fmt(p.value)}</span>
        </span>
      ))}
      <span className="text-caption tabular-nums" style={{ color: FAINT }}>
        {row.sites} {row.sites === 1 ? 'site' : 'sites'}
      </span>
    </span>
  )
}

/**
 * Rows rendered into the page. The rest live in the sheet.
 *
 * FIVE, DOWN FROM EIGHT TILES. A named row costs more width than a code tile but it is the
 * name that answers "where is the collection" — "CF 14,445" needs a decoder, "Crimson Frosted
 * Wildlife Estate 14,445" does not. Five named rows and eight anonymous tiles occupy the same
 * height, so the card did not grow; it stopped spending its height on a legend the reader
 * holds in their head.
 */
const SITE_ROWS = 5

/* ── sites ───────────────────────────────────────────────────────────────── */

const SITE_SORTS: [SiteSort, string][] = [
  ['animals', 'Population'],
  ['species', 'Species'],
  ['enclosures', 'Enclosures'],
  ['net', 'Change'],
]

/**
 * THE TOP FIVE SITES, NAMED — a ranked table, not a grid of tiles.
 *
 * The tiles this replaces showed a two-letter code, a figure and a share bar, eight to a card in
 * three columns. Three things were wrong with that. The CODE IS NOT THE SITE: "CF" and "CH" are
 * a lookup the reader performs from memory, and the name — the one field that answers "where is
 * the collection" — was reachable only on hover. The BAR RE-DREW THE ORDER: the tiles are sorted,
 * so a bar under each one charted the fact that tile one outranks tile two. And a 3-column grid
 * of small boxes spends its width on gutters and box padding rather than on content, which is
 * why eight tiles and five named rows come to the same height.
 *
 * Four fields, four columns, one line each: rank, name, population, change. Population is the
 * primary value and is set a step above the name; change is secondary and carries the only
 * colour in the card, because direction is the one thing here that is not a magnitude.
 *
 * SPECIES AND ENCLOSURE COUNTS STAY ON THE HOVER TITLE, where the tiles already kept them. A
 * second line under each name is the one change that would not fit: five rows of two lines is
 * 280px against the 230px this card has to give, so the metadata would have cost the card its
 * fifth site. It is one tap away in the site sheet, which is where a full record belongs.
 */
function SitesCard({
  rows,
  scoped,
  onOpen,
  onViewAll, bare }: {
  rows: SiteRow[]
  scoped: string | null
  onOpen: (key: string) => void
  onViewAll: () => void; bare?: boolean }) {
  const [sort, setSort] = useState<SiteSort>('animals')
  const shown = useMemo(() => sortSites(scoped ? rows.filter((r) => r.key === scoped) : rows, sort), [rows, scoped, sort])

  /* The leaders, stated rather than left to be counted off the grid — concentration is the
     finding a reader takes from fifty sites, and a grid shows the spread without naming it. */
  const total = shown.reduce((n, r) => n + r.animals, 0)
  const lead = sortSites(shown, 'animals').slice(0, 3)
  const leadShare = total ? (lead.reduce((n, r) => n + r.animals, 0) / total) * 100 : 0
  /* The five that print. `shown` is already in the reader's chosen order, so the rank column is
     the row's position in THAT order — sort by Change and 01 is the biggest mover, not the
     biggest site. */
  const top = shown.slice(0, SITE_ROWS)

  return (
    <Section bare={bare} icon={MapPin} label="Site population" aside={`${shown.length} of ${rows.length} sites`}>
      <Chips
        options={SITE_SORTS.map(([k, l]) => [k, l] as [string, string])}
        value={sort}
        onPick={(v) => setSort(v as SiteSort)}
      />
      {/* THE COLUMN HEADER NAMES THE TWO FIGURES, and is the reason the rows need no labels of
          their own. `text-overline` is the scale's own table-header size — see `index.css`. The
          three widths are repeated on every row below rather than being a grid, because a
          four-cell grid would make the rank a track wide enough to matter on a 352px tablet
          card; as flex, the rank and the two figures are fixed and the NAME takes the rest. */}
      {/* THE TWO FIGURE COLUMNS ARE SIZED TO THE HEADER, NOT THE FIGURE. "POPULATION" sets 81px
          at the overline size and "14,445" only 66 — size to the number and the header word
          overflows its cell and runs back under the site name, which it did at both tiers. The
          widths are the same at every tier for the same reason: the header does not shrink. */}
      <div
        className="mt-3 flex items-center gap-2 border-b pb-1.5 text-overline font-semibold uppercase @[900px]:gap-3"
        style={{ borderColor: HAIR, color: FAINT }}
      >
        <span className="w-[16px] shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">Site</span>
        <span className="w-[84px] shrink-0 text-right">Population</span>
        <span className="w-[56px] shrink-0 text-right">Change</span>
      </div>

      <ul className="flex flex-col">
        {top.map((r, i) => (
          <li key={r.key} className="border-b last:border-0" style={{ borderColor: HAIR }}>
            <button
              type="button"
              onClick={() => onOpen(r.key)}
              /* The species and enclosure counts the tiles carried, in the one place they can go
                 without costing the row a second line. */
              title={`${r.name} · ${fmt(r.species)} species · ${fmt(r.enclosures)} enclosures`}
              /* `w-[calc(100%+1rem)]`, NOT `w-full`. The `-mx-2`/`px-2` pair exists so the press
                 highlight bleeds past the text to the card's padding edge. With `w-full` the
                 width is pinned to the row, so the negative margins only SHIFT the button 8px
                 left — every figure landed 16px inside its own column header. Widening by the
                 two margins is what makes the bleed a bleed instead of an offset. */
              className="card-press -mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-[10px] px-2 py-[7px] text-left @[900px]:gap-3"
            >
              <span className="w-[16px] shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1 truncate text-body text-[#1c1a16]">{r.name}</span>
              <span
                className="w-[84px] shrink-0 text-right font-semibold tabular-nums @[900px]:text-lead"
                style={{ color: VALUE }}
              >
                {fmt(r.animals)}
              </span>
              {/* THE ONLY COLOUR IN THE CARD. A zero is a sourced fact here — the site held
                  station — so it prints as 0 in the faint ink rather than as a dash, which this
                  product reserves for a figure it does not have. */}
              <span
                className="w-[56px] shrink-0 text-right text-small font-semibold tabular-nums"
                style={{ color: r.net === 0 ? FAINT : TONE[netTone(r.net)] }}
              >
                {signed(r.net)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* THE CONCENTRATION LINE AND THE ACTION SHARE A ROW. The sentence used to sit above the
          grid and restate what row one now says in full — "led by <name>" is the first row of
          the table. What it still knows that the table does not is the SHARE the leaders hold,
          so that clause survives and the rest goes, on the same line as the action, for nothing. */}
      <div className="mt-3 flex items-baseline justify-between gap-3">
        {shown.length > 3 ? (
          <p className="min-w-0 truncate text-caption" style={{ color: MUTED }}>
            Top 3 hold <span className="font-medium tabular-nums">{pct(leadShare)}</span> of{' '}
            <span className="tabular-nums">{fmt(total)}</span>
          </p>
        ) : (
          <span />
        )}
        {shown.length > SITE_ROWS && (
          <button
            type="button"
            onClick={() => onViewAll()}
            className="card-press shrink-0 text-small font-semibold whitespace-nowrap"
            style={{ color: ACCENT_INK }}
          >
            View all {shown.length} sites →
          </button>
        )}
      </div>
    </Section>
  )
}

/* ── species ─────────────────────────────────────────────────────────────── */

const SPECIES_SORTS: [SpeciesSort, string][] = [
  ['animals', 'Population'],
  ['net', 'Change'],
  ['sites', 'Sites'],
  ['name', 'Name'],
]

/**
 * EVERY SPECIES, searched, sorted and paged — with the distribution stated once above the list
 * instead of drawn on four hundred rows.
 *
 * The concentration ribbon is the whole reason this card does not need a bar per row. Before
 * scrolling anything, the reader wants to know whether this is a collection of a few enormous
 * shoals or of four hundred comparable holdings — that is one ribbon and one percentage, and
 * once it is stated, every row below it can go back to being what it is: a name, a count, a
 * share, a change and a door.
 *
 * The sex split moves into the row's own meta line rather than into three table columns that
 * only appeared past 640px. Same five facts, no second rendering to keep in step.
 */
function SpeciesCard({
  rows,
  query,
  onQuery,
  onOpen, bare }: {
  rows: SpeciesRow[]
  query: string
  onQuery: (v: string) => void
  onOpen: (row: SpeciesRow) => void; bare?: boolean }) {
  const [sort, setSort] = useState<SpeciesSort>('animals')
  const matched = useMemo(() => sortSpecies(searchSpecies(rows, query), sort), [rows, query, sort])
  /* TEN, NOT TWENTY. Each species row is three lines by design — name, class and site, then
     standing and the sex split — which the mark's own note defends: one long line ends
     "…265 M · 244 F" with the standing truncated away. Three good lines cost 78px, so twenty
     of them opened the card at 1,693px, and this is a REGISTRY of 4,745 species rather than a
     ranking anyone reads to the end. Ten leaders, then the sorts and the search for everything
     else, and `MoreRows` still walks the rest twenty at a time. */
  const paged = usePaged<SpeciesRow>(
    (offset, limit) => ({ rows: matched.slice(0, offset + limit), total: matched.length }),
    10,
    [matched],
  )

  /* Concentration is a property of the WHOLE registry under the scope, so it is computed from
     `rows` rather than from the search results — a ribbon that recut itself on every keystroke
     would be answering a different question each time. */
  const spread = useMemo(() => {
    const top = [...rows].sort((a, b) => b.animals - a.animals).slice(0, 5)
    return {
      items: top.map((r) => ({ label: r.name, value: r.animals })),
      total: rows.reduce((n, r) => n + r.animals, 0),
    }
  }, [rows])

  return (
    <Section
      bare={bare}
      icon={Dna}
      label="Species population"
      aside={query ? `${matched.length} of ${rows.length}` : `${rows.length} species`}
    >
      {rows.length > 5 && (
        <div className="mb-4 border-b border-[#f0efec] pb-4">
          <Concentration items={spread.items} total={spread.total} of={rows.length} unit="animals" />
        </div>
      )}

      <Chips
        options={SPECIES_SORTS.map(([k, l]) => [k, l] as [string, string])}
        value={sort}
        onPick={(v) => setSort(v as SpeciesSort)}
      />

      {matched.length === 0 && (
        <p className="mt-4 text-caption" style={{ color: FAINT }}>
          No species matches “{query.trim()}”.{' '}
          <button type="button" onClick={() => onQuery('')} className="font-semibold" style={{ color: ACCENT_INK }}>
            Clear
          </button>
        </p>
      )}

      <div className="mt-2">
        <RankList
          rank={sort === 'animals'}
          items={paged.rows.map((r) => ({
            key: r.id,
            title: r.name,
            meta: `${r.cls} · ${r.siteName}`,
            meta2: `${standingLabel(r.standing)} · ${fmt(r.male)} M · ${fmt(r.female)} F · ${fmt(r.unknown)} U`,
            value: fmt(r.animals),
            share: r.percent,
            change: r.net === 0 ? undefined : signed(r.net),
            onPick: () => onOpen(r),
          }))}
        />
      </div>
      <MoreRows page={paged} noun="species" />
    </Section>
  )
}
