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
 * the trend is a scrubbable curve against the period before it, the class composition is a
 * treemap, regulatory standing is two percentages over one ribbon, CITES is a segmented
 * composition, the schedules are three comparison tiles, sites and species are ranked lists
 * with no bars in them at all, sex is a ring, births and deaths are event trends over a real
 * calendar, transfers are a flow, escapes an incident rail, and fetal loss an outcome split.
 * Nothing about the DATA changed in that move — every figure is the same query it was.
 *
 * NOTHING IS EXPLAINED, ONLY STATED. There is no prose, no recommendation and no insight — every
 * string on this page names a number or a filter.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Baby,
  Dna,
  Footprints,
  Layers,
  MapPin,
  PawPrint,
  ScrollText,
  Search,
  Shell,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Trophy,
  Venus,
  X,
} from 'lucide-react'
import { longDate, previous, shortDate, type Win } from '../../core/calendar'
import { searchAnimals } from '../../core/animals'
import { page as eventPage } from '../../core/events'
import { SITES, siteOf } from '../../core/world'
import { CLASS_ICONS } from '../../exec/classIcons'
import {
  ACCENT_INK,
  Band,
  FAINT,
  Facts,
  Figure,
  Hero,
  Pair,
  RED_LIST,
  Rule,
  Section,
  Snapshot,
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
  CompareTiles,
  Concentration,
  DayHeat,
  EventTrend,
  FlowSplit,
  IncidentRail,
  OutcomeSplit,
  PercentSplit,
  RankList,
  Ribbon,
  SplitRing,
  Treemap,
  pct,
  type RankItem,
} from '../../exec/marks'
import { compareOf, dayCells, peakOf, pointsOf } from '../plot'
import { AnimalPanel, TapList, TapRow } from '../panels'
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
  plural,
  regulatorySplit,
  scheduleBands,
  standingLabel,
  standingOf,
  totalOf,
  type CitesAppendix,
  type Holding,
  type ScheduleClass,
} from './regulatory'
import {
  TREND_RANGES,
  change,
  flowByCause,
  flowBySite,
  flowBySpecies,
  leaders,
  movement,
  sexTotals,
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
  ClassGroup,
  FlowPanel,
  IucnGroup,
  RegulatoryGroup,
  ScheduleGroup,
  SitePanel,
  SpeciesPanel,
  flowSpecs,
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

/**
 * The flow sheets a card opens, bound to THAT CARD'S window rather than the page's.
 *
 * This is the part of per-card ranges that is a correctness requirement rather than a
 * convenience. A Births card set to six months whose "Birth records" sheet opened on the page's
 * window would list a different set of records from the figure the reader tapped to get there —
 * the single most damaging thing a drill-down can do, because the reader has no way to tell.
 */
function useFlowSheets(siteKey: string | null, win: Win) {
  const { open } = useSheet()
  const move = useMemo(() => movement(siteKey, win), [siteKey, win])
  const specs = useMemo(() => flowSpecs(move), [move])
  const openFlow = (key: keyof typeof specs) => {
    const spec = specs[key]
    open({ title: spec.title, eyebrow: 'Animal Population', body: <FlowPanel spec={spec} siteKey={siteKey} win={win} /> })
  }
  const openFlowSite = (key: keyof typeof specs, row: string) =>
    open({
      title: siteOf(row)?.name ?? row,
      eyebrow: specs[key].title,
      body: <FlowPanel spec={specs[key]} siteKey={row} win={win} />,
    })
  return { move, openFlow, openFlowSite }
}

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

  const { allHoldings, rows, allSpecies, species } = useLens(siteKey, win, facets)

  const total = totalOf(rows)
  const collection = totalOf(allHoldings)
  const lensed = facetsOn(facets) > 0
  const delta = useMemo(() => change(siteKey, win), [siteKey, win])
  const sites = useMemo(() => siteRows(win), [win])
  const enclosures = siteKey ? (siteOf(siteKey)?.enclosures ?? 0) : SITES.reduce((n, s) => n + s.enclosures, 0)
  const scopeName = scope.site ? scope.site.name : 'Overall'

  const openSite = (key: string) =>
    open({ title: siteOf(key)?.name ?? key, eyebrow: 'Animal Population', body: <SitePanel siteKey={key} win={win} /> })
  const openSpecies = (row: SpeciesRow) =>
    open({ title: row.name, eyebrow: row.siteName, body: <SpeciesPanel row={row} win={win} /> })

  /* THE SAME FOUR SHEETS THE ROWS ALWAYS OPENED, named rather than inlined five times over.
     What changed on this page is which mark carries the tap, never where the tap goes. */
  const openClass = (cls: string) =>
    open({
      title: cls,
      eyebrow: 'Collection composition',
      body: <ClassGroup cls={cls} rows={rows} win={win} siteKey={siteKey ?? undefined} />,
    })
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
      <Toolbar
        scopeName={scopeName}
        asOf={longDate(win.to)}
        sites={siteKey ? 1 : SITES.length}
        species={allSpecies.length}
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

      {/* 2 · HERO. The strongest thing on the page, and only three supporting figures — the
          brief's "do not create multiple oversized KPI cards". */}
      <Hero
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
          { value: String(enclosures), label: 'Enclosures' },
        ]}
      />

      <Stack>
        {/* 3 · POPULATION CHANGE. One card, not six — the two balances as bookends, the flows
            that moved between them as a signed ledger, and the part the records do not explain
            named rather than hidden inside the total. Every flow row opens its own sheet. */}
        <Wide>
          <PopulationChangeCard siteKey={siteKey} />
        </Wide>

        {/* 4 · TREND. Real readings on a zero-based axis, drawn for whichever range the reader
            picks. The range control belongs to the chart; the page's own as-of date and its
            flow window still come from the global scope. */}
        <Wide>
          <TrendCard siteKey={siteKey} scopeName={scopeName} globalWin={win} />
        </Wide>

        {/* 5 · COLLECTION COMPOSITION, as a treemap — because the AREA is the share.
            Nine classes running from 178,240 animals down to 41 cannot be drawn as bars: at
            true scale eight of the nine are invisible, and floored they lie about the shape of
            the collection. Every cell is a door into its species. */}
        <Wide>
          <Section icon={Layers} label="Collection composition" aside={plural(classes.length, 'class')}>
            <Treemap
              items={classes.map((c) => ({
                key: c.cls,
                label: c.cls,
                value: c.animals,
                meta: `${c.species} species`,
                onPick: () => openClass(c.cls),
              }))}
            />
            <Rule label="By class" />
            <RankList
              rank={false}
              items={classes.map((c) => ({
                key: c.cls,
                title: c.cls,
                meta: `${c.species} species`,
                value: fmt(c.animals),
                share: c.percent,
                lead: classGlyph(c.cls),
                onPick: () => openClass(c.cls),
              }))}
            />
          </Section>
        </Wide>

        {/* 6 · REGULATORY. Two parts, so two percentages facing each other over one ribbon —
            not two bars, which is what this was and which stated the same number twice. The
            split does NOT overlap: an animal carrying both a CITES listing and a schedule is
            counted once here, which is why the appendix and schedule cards below are separate. */}
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

        {/* 7 · CITES — a trade convention, and a segmented composition rather than three
            identical bars: the ribbon is the relative distribution across the three appendices,
            the rows carry the counts, the species and the share each is of the collection. Kept
            apart from the schedules below, because an animal routinely carries both. */}
        <Section icon={ShieldAlert} label="CITES" aside={`${pct(citesShare)} of collection listed`}>
          <Ribbon items={cites.map((b) => ({ label: b.label, value: b.animals }))} height={11} />
          <div className="mt-4">
            <RankList
              rank={false}
              showShare={false}
              items={cites.map((b) => ({
                key: b.key,
                title: b.label,
                meta: `${b.species} species · ${pct(b.percent)} of collection`,
                value: fmt(b.animals),
                share: citesTotal ? (b.animals / citesTotal) * 100 : 0,
                onPick: b.animals > 0 ? () => openCites(b.key as CitesAppendix) : undefined,
              }))}
            />
          </div>
        </Section>

        {/* 8 · SCHEDULE — Indian domestic law, and three named classes rather than a ranking, so
            three tiles: the count, the species behind it, its share of the collection, and an arc
            for its share of everything scheduled. */}
        <Section icon={ScrollText} label="Wildlife Protection Act" aside="Schedule I · II · III">
          <CompareTiles
            items={schedules.map((b) => ({
              key: b.key,
              kicker: `Schedule ${b.key}`,
              value: b.animals,
              share: scheduleTotal ? (b.animals / scheduleTotal) * 100 : 0,
              facts: [`${b.species} species`, `${pct(b.percent)} of collection`],
              onPick: b.animals > 0 ? () => openSchedule(b.key as ScheduleClass) : undefined,
            }))}
          />
        </Section>

        {/* 9 · IUCN. The published badges, in the published colours — a curator reads these on
            the Red List and on enclosure signage, so they are not ours to restyle. */}
        <Wide>
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
        </Wide>

        {/* 10 · SITES. All of them, sorted on whichever column the reader picks — dense table
            where there is room, stacked rows where there is not. */}
        <Wide>
          <SitesCard rows={sites} scoped={siteKey} onOpen={openSite} />
        </Wide>

        {/* 11 · SPECIES. All of them, searchable and paged rather than four hundred cards. */}
        <Wide>
          <SpeciesCard rows={species} query={query} onQuery={setQuery} onOpen={openSpecies} />
        </Wide>

        {/* 12 · SEX — a ring, which is the mark for three parts of one whole. Compact by design:
            undetermined is the majority ANSWER in a collection four fifths made of fish and
            invertebrates, not a gap in the record. */}
        <SexCard siteKey={siteKey} facets={facets} />

        {/* 13 · BIRTHS — an event flow, so columns and a real calendar rather than a bar chart.
            A line through births per day would claim a value between the days and there isn't
            one. The card answers how many, against when, where and which species. */}
        <Wide>
          <BirthsCard siteKey={siteKey} />
        </Wide>

        {/* 14 · MORTALITY. Population context, and the one thing a total cannot say: WHERE the
            impact fell. The trend is the event flow, the band names the species carrying it, and
            the ranked lists below are the site and species tails. Cause analysis stays on the
            Mortality module; nothing medical is mixed in here. */}
        <Wide>
          <MortalityCard siteKey={siteKey} />
        </Wide>

        {/* 15 · EXTERNAL TRANSFERS — direction first. Two counts in a column say nothing about
            which way the animals went; the glyph, the side and the net do it before a number is
            read. The routes below name what the record names — a counterparty kind, not an
            invented collection — and internal moves are stated so nobody reads them as change. */}
        <TransfersCard siteKey={siteKey} />

        {/* 16 · ESCAPES — an incident rail, because what is asked about an escape is when it
            happened, what got out and whether it is back. The critical band appears only while
            something is still out; an amber board over a clear one is how a reader learns to
            stop looking. */}
        <EscapesCard siteKey={siteKey} />

        {/* 17 · FETAL DEATH, kept apart from mortality. A stillbirth is not a death in the
            collection register, and merging the two would overstate mortality and understate the
            breeding programme's own loss rate. An outcome split, because these are terminal
            states of one population rather than a ranking of two things. */}
        <FetalCard siteKey={siteKey} />

        {/* 18 · LEADERS. Five extremes, computed rather than chosen, each opening the thing it
            names. Numbers and labels only. */}
        <Wide>
          <LeadersCard siteKey={siteKey} facets={facets} />
        </Wide>
      </Stack>
    </>
  )
}

/* ── the eight cards that carry their own date range ─────────────────────── */

/**
 * Each of these was a `<Section>` inline in the page body, reading the page's window and
 * printing it back out as static text in its header. They are components now for one reason:
 * a card that can be set to its own range has to DERIVE its own figures, and the derivation
 * needs hooks, so it needs a component. The bodies are otherwise the markup they always were.
 *
 * Every one of them takes `siteKey` and the lens rather than the resolved data, because the data
 * is a function of the window and the window is theirs.
 */

function PopulationChangeCard({ siteKey }: { siteKey: string | null }) {
  const { win, pill, overridden } = useCardWindow()
  const { move, openFlow } = useFlowSheets(siteKey, win)
  const delta = useMemo(() => change(siteKey, win), [siteKey, win])

  return (
    <Section icon={Sparkles} label="Population change" aside={pill}>
      <Pair
        a={{ value: fmt(delta.opening), label: `Opening · ${shortDate(Math.max(0, win.from - 1))}` }}
        b={{ value: fmt(delta.closing), label: `Current · ${shortDate(win.to)}` }}
        relation={signed(delta.net)}
        tone={netTone(delta.net)}
      />
      <Rule label="Recorded movement" />
      <ul className="flex flex-col">
        {[
          { key: 'births' as const, label: 'Births', sub: `${move.births.natural} natural · ${move.births.assisted} assisted`, value: move.births.total },
          { key: 'transferIn' as const, label: 'Transfer in', sub: 'External · other collections', value: move.transfers.in },
          { key: null, label: 'Accessions', sub: 'Rescue, confiscation, intake', value: move.accessions },
          { key: 'mortality' as const, label: 'Deaths', sub: `${((move.deaths / Math.max(1, delta.closing)) * 100).toFixed(3)}% of collection`, value: -move.deaths },
          { key: 'transferOut' as const, label: 'Transfer out', sub: 'External · releases and loans', value: -move.transfers.out },
          { key: 'escaped' as const, label: 'Escaped', sub: `${move.escapes.unrecovered} not recovered of ${move.escapes.total}`, value: -move.escapes.unrecovered },
        ].map((f) => (
          <MoveRow
            key={f.label}
            label={f.label}
            sub={f.sub}
            value={f.value}
            peak={Math.max(move.births.total, move.deaths, move.accessions, move.transfers.out, 1)}
            onOpen={f.key ? () => openFlow(f.key) : undefined}
          />
        ))}
      </ul>
      <div className="mt-3 border-t border-[#f0efec] pt-3">
        <Facts
          items={[
            { label: 'Net recorded movement', value: signed(move.recorded), tone: netTone(move.recorded) },
            {
              label: 'Census revision',
              sub: 'Change not attributed to records',
              value: signed(delta.net - move.recorded),
            },
          ]}
        />
      </div>
      {/* Fetal loss is a breeding figure, not a headcount movement — a fetus was never in
          the collection. It sits under its own rule so it cannot be added into the column
          above, and it opens the same sheet the Fetal Death section does. */}
      <Rule label="Not a headcount change" />
      <TapList>
        <TapRow
          lead={Baby}
          label="Fetal death"
          sub={`${move.fetal.stillbirth} stillbirth · ${move.fetal.abortion} abortion`}
          value={fmt(move.fetal.total)}
          onOpen={() => openFlow('fetal')}
        />
      </TapList>
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

function SexCard({ siteKey, facets }: { siteKey: string | null; facets: Facets }) {
  const { win, pill, overridden } = useCardWindow()
  const { species } = useLens(siteKey, win, facets)
  const sexes = useMemo(() => sexTotals(species), [species])

  return (
    <Section icon={Venus} label="Sex distribution" aside={pill}>
      <SplitRing
        label="Animals"
        unit="animals"
        items={[
          { key: 'u', label: 'Undetermined', value: sexes.unknown, meta: 'Shoals, colonies, unsexed' },
          { key: 'm', label: 'Male', value: sexes.male },
          { key: 'f', label: 'Female', value: sexes.female },
        ]}
      />
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

function BirthsCard({ siteKey }: { siteKey: string | null }) {
  const { win, pill, overridden } = useCardWindow()
  const { move, openFlow, openFlowSite } = useFlowSheets(siteKey, win)
  const births = useFlowCard('births', siteKey, win)
  /* The calendar is drawn only where it can say something a total cannot: a window of under a
     week is a handful of cells, and an empty window is an empty grid. */
  const birthDays = useMemo(
    () => (win.days >= 7 && move.births.total > 0 ? dayCells('births', siteKey, win).cells : undefined),
    [siteKey, win, move.births.total],
  )

  return (
    <Section icon={Sparkles} label="Births" aside={pill}>
      <EventTrend
        points={births.points}
        compare={births.compare}
        span={win.window}
        unit="births"
        marks={births.peak ? [births.peak] : undefined}
        empty={`No births recorded in ${win.window}.`}
      />
      {birthDays && (
        <>
          <Rule label="Date distribution" />
          <DayHeat days={birthDays} />
        </>
      )}
      <div className="mt-4 border-t border-[#f0efec] pt-3">
        <Facts
          items={[
            { label: 'Natural', value: fmt(move.births.natural) },
            { label: 'Assisted', value: fmt(move.births.assisted), sub: 'Hand-reared or assisted delivery' },
          ]}
        />
      </div>
      {births.sites.length > 0 && (
        <>
          <Rule label="By site" />
          <RankList items={siteRank(births.sites, births.total, (key) => openFlowSite('births', key))} />
        </>
      )}
      {births.species.length > 0 && (
        <>
          <Rule label="By species" />
          <RankList items={nameRank(births.species, births.total)} />
        </>
      )}
      <OpenPill label="Birth records" onOpen={() => openFlow('births')} />
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

function MortalityCard({ siteKey }: { siteKey: string | null }) {
  const { win, pill, overridden } = useCardWindow()
  const { move, openFlow, openFlowSite } = useFlowSheets(siteKey, win)
  const deaths = useFlowCard('mortality', siteKey, win)
  const delta = useMemo(() => change(siteKey, win), [siteKey, win])

  return (
    <Section icon={Activity} label="Mortality" aside={pill}>
      <EventTrend
        points={deaths.points}
        compare={deaths.compare}
        span={win.window}
        unit="deaths"
        marks={deaths.peak ? [{ ...deaths.peak, tone: 'bad' as const }] : undefined}
        empty={`No deaths recorded in ${win.window}.`}
      />

      {deaths.species[0] && (
        <>
          <Rule label="Highest mortality impact" />
          <Band
            label="Species"
            title={deaths.species[0].label}
            sub={`${pct((deaths.species[0].value / Math.max(1, deaths.total)) * 100)} of deaths${
              deaths.causes[0] ? ` · leading cause ${deaths.causes[0].label.toLowerCase()}` : ''
            }`}
            value={fmt(deaths.species[0].value)}
            unit="deaths"
            tone="bad"
          />
        </>
      )}

      <div className="mt-4 border-t border-[#f0efec] pt-3">
        <Facts
          items={[
            {
              label: 'Mortality rate',
              sub: 'Of the closing headcount',
              value: `${((move.deaths / Math.max(1, delta.closing)) * 100).toFixed(3)}%`,
            },
            {
              label: 'Regulatory species',
              sub: 'CITES-listed or scheduled',
              value: `${fmt(deaths.regulated)} of ${fmt(deaths.total)}`,
            },
            { label: 'Net of births', value: signed(move.births.total - move.deaths), tone: netTone(move.births.total - move.deaths) },
          ]}
        />
      </div>

      {deaths.sites.length > 0 && (
        <>
          <Rule label="By site" />
          <RankList items={siteRank(deaths.sites, deaths.total, (key) => openFlowSite('mortality', key))} />
        </>
      )}
      {deaths.species.length > 0 && (
        <>
          <Rule label="By species" />
          <RankList items={nameRank(deaths.species, deaths.total)} />
        </>
      )}
      {deaths.causes.length > 0 && (
        <>
          <Rule label="Recorded cause" />
          <RankList rank={false} items={nameRank(deaths.causes, deaths.total)} />
        </>
      )}
      <OpenPill label="Mortality records" onOpen={() => openFlow('mortality')} />
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

function TransfersCard({ siteKey }: { siteKey: string | null }) {
  const { win, pill, overridden } = useCardWindow()
  const { move, openFlow } = useFlowSheets(siteKey, win)
  const prevMove = useMemo(() => movement(siteKey, previous(win)), [siteKey, win])

  /* Transfer routes name the counterparty the RECORD names — "other zoo", "the wild" — and
     nothing more. The data has a kind of counterparty, not an institution, so neither does this. */
  const routes = useMemo(
    () =>
      flowByCause('transfers', siteKey, win).map((c) => {
        const direction = TRANSFER_DIRECTION[c.label] ?? 'internal'
        return {
          key: c.key,
          label: c.label,
          meta: TRANSFER_META[c.label],
          value: c.value,
          direction,
          onPick:
            direction === 'in'
              ? () => openFlow('transferIn')
              : direction === 'out'
                ? () => openFlow('transferOut')
                : undefined,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siteKey, win],
  )

  return (
    <Section icon={ArrowLeftRight} label="External transfers" aside={pill}>
      <FlowSplit
        unit="animals"
        net={move.transfers.net}
        inward={{
          label: 'External in',
          value: move.transfers.in,
          meta: 'From other collections',
          change: move.transfers.in - prevMove.transfers.in,
          icon: ArrowDownLeft,
          onPick: () => openFlow('transferIn'),
        }}
        outward={{
          label: 'External out',
          value: move.transfers.out,
          meta: 'Releases, loans, transfers',
          change: move.transfers.out - prevMove.transfers.out,
          icon: ArrowUpRight,
          onPick: () => openFlow('transferOut'),
        }}
        routes={routes}
      />
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

function EscapesCard({ siteKey }: { siteKey: string | null }) {
  const { win, pill, overridden } = useCardWindow()
  const { open } = useSheet()
  const { move, openFlow } = useFlowSheets(siteKey, win)

  /* Escapes are read as RECORDS, not as a count: the six most recent, each with the outcome its
     own event carries — "Not recovered" is an open incident, every other outcome is a closed one. */
  const escapes = useMemo(
    () =>
      eventPage('escaped', siteKey, win, 0, 6).rows.map((ev) => ({
        key: ev.id,
        when: shortDate(ev.day),
        title: ev.speciesName,
        meta: `${siteOf(ev.siteKey)?.name ?? ev.siteKey} · ${ev.animalId} · ${ev.detail.toLowerCase()}`,
        /* TWO STATES, NOT FOUR. The record's own outcome — same day, within seven days, off site
           — belongs in the meta line; the chip answers the only question asked of an escape,
           which is whether the animal is back. */
        status:
          ev.detail === 'Not recovered'
            ? { label: 'Open', tone: 'bad' as const }
            : { label: 'Recovered', tone: 'good' as const },
        onPick: () =>
          open({
            title: ev.animalId,
            eyebrow: `Escape · ${shortDate(ev.day)}`,
            body: <AnimalPanel record={animalFromId(ev.animalId, ev.speciesName)} />,
          }),
      })),
    [siteKey, win, open],
  )

  return (
    <Section icon={Footprints} label="Escaped animals" aside={pill}>
      {move.escapes.atLarge > 0 ? (
        <Band
          label="Critical"
          title="Currently escaped"
          sub={`Not recovered as of ${longDate(win.to)}`}
          value={fmt(move.escapes.atLarge)}
          tone="bad"
        />
      ) : (
        <Band label="Clear" title="Currently escaped" sub={`None at large as of ${longDate(win.to)}`} value="0" tone="good" />
      )}
      <Rule label={win.window} />
      <Snapshot
        cols={3}
        items={[
          { label: 'Escaped in window', value: fmt(move.escapes.total) },
          { label: 'Resolved', value: fmt(move.escapes.recovered), tone: 'good' },
          { label: 'Open', value: fmt(move.escapes.unrecovered), tone: move.escapes.unrecovered > 0 ? 'bad' : undefined },
        ]}
      />
      <Rule label="Recent incidents" />
      <IncidentRail items={escapes} empty={`No escapes recorded in ${win.window}.`} />
      {move.escapes.total > escapes.length && (
        <OpenPill label="All escape records" onOpen={() => openFlow('escaped')} />
      )}
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

function FetalCard({ siteKey }: { siteKey: string | null }) {
  const { win, pill, overridden } = useCardWindow()
  const { move, openFlow, openFlowSite } = useFlowSheets(siteKey, win)
  const fetal = useFlowCard('fetal', siteKey, win)

  return (
    <Section icon={Baby} label="Fetal death" aside={pill}>
      <EventTrend
        points={fetal.points}
        compare={fetal.compare}
        span={win.window}
        unit="fetal losses"
        height={96}
        empty={`No fetal loss recorded in ${win.window}.`}
      />
      {move.fetal.total > 0 && (
        <>
          <Rule label="Outcome" />
          <OutcomeSplit
            lead={false}
            total={move.fetal.total}
            label="fetal losses"
            outcomes={[
              {
                key: 'stillbirth',
                label: 'Stillbirth',
                value: move.fetal.stillbirth,
                meta: 'Late-term loss · dystocia',
                onPick: () => openFlow('fetal'),
              },
              {
                key: 'abortion',
                label: 'Abortion',
                value: move.fetal.abortion,
                meta: 'Mid-term loss · early resorption',
                onPick: () => openFlow('fetal'),
              },
            ]}
          />
        </>
      )}
      {fetal.sites.length > 0 && (
        <>
          <Rule label="By site" />
          <RankList items={siteRank(fetal.sites, fetal.total, (key) => openFlowSite('fetal', key))} />
        </>
      )}
      {fetal.species.length > 0 && (
        <>
          <Rule label="By species" />
          <RankList items={nameRank(fetal.species, fetal.total)} />
        </>
      )}
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

function LeadersCard({ siteKey, facets }: { siteKey: string | null; facets: Facets }) {
  const { win, pill, overridden } = useCardWindow()
  const { open } = useSheet()
  const { species } = useLens(siteKey, win, facets)
  const sites = useMemo(() => siteRows(win), [win])

  const openSite = (key: string) =>
    open({ title: siteOf(key)?.name ?? key, eyebrow: 'Animal Population', body: <SitePanel siteKey={key} win={win} /> })
  const openSpecies = (row: SpeciesRow) =>
    open({ title: row.name, eyebrow: row.siteName, body: <SpeciesPanel row={row} win={win} /> })

  return (
    <Section icon={Trophy} label="Population leaders" aside={pill}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 @[560px]:grid-cols-3">
        {leaders(species, sites).map((l) => (
          <LeaderTile
            key={l.key}
            leader={l}
            onOpen={
              l.species
                ? () => openSpecies(l.species!)
                : l.siteKey
                  ? () => openSite(l.siteKey!)
                  : undefined
            }
          />
        ))}
      </div>
      <CardWindowNote win={win} overridden={overridden} />
    </Section>
  )
}

/* ── small shared pieces ─────────────────────────────────────────────────── */

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`
const netTone = (n: number): 'good' | 'bad' | 'neutral' => (n > 0 ? 'good' : n < 0 ? 'bad' : 'neutral')

/** A section that spans both columns once the stack has split — tables and the Red List. */
const Wide = ({ children }: { children: React.ReactNode }) => (
  <div className="@[760px]:col-span-2">{children}</div>
)

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

/**
 * One flow, as everything the card built from it asks for.
 *
 * Births, deaths and fetal losses are all read the same five ways — a bucketed series, the same
 * span one period earlier, the peak, and the site, species and cause tallies — so the reads are
 * grouped rather than repeated three times over. Nothing here is derived twice: `total` is the
 * sum of the site tally, which is the same figure `count` returns, and `regulated` is that tally
 * re-asked of the species' published standing.
 */
function useFlowCard(slug: string, siteKey: string | null, win: Win, max = 24) {
  return useMemo(() => {
    const points = pointsOf(slug, siteKey, win, max)
    const sites = flowBySite(slug, siteKey, win)
    const species = flowBySpecies(slug, siteKey, win)
    const causes = flowByCause(slug, siteKey, win)
    return {
      points,
      compare: compareOf(slug, siteKey, win, max),
      peak: peakOf(points),
      sites,
      species,
      causes,
      total: sites.reduce((n, s) => n + s.value, 0),
      regulated: species
        .filter((s) => isRegulated(standingOf(s.label)))
        .reduce((n, s) => n + s.value, 0),
    }
  }, [slug, siteKey, win, max])
}

/** A site tally as ranked rows, each opening its own site. */
function siteRank(
  rows: { key: string; label: string; value: number }[],
  total: number,
  onPick?: (key: string) => void,
): RankItem[] {
  return rows.map((r) => ({
    key: r.key,
    title: r.label,
    meta: siteOf(r.key)?.code,
    value: fmt(r.value),
    share: total ? (r.value / total) * 100 : 0,
    onPick: onPick ? () => onPick(r.key) : undefined,
  }))
}

/**
 * A species or cause tally as ranked rows, capped.
 *
 * NO CHEVRON, and that is deliberate rather than an omission: there is no species-level event
 * panel to open, and a chevron that opens the whole flow instead of the row it sits on is worse
 * than no chevron. The records pill under the card is the door, and the drill it opens —
 * flow → site → species → animal — is the one that already existed.
 */
function nameRank(rows: { key: string; label: string; value: number }[], total: number, cap = 8): RankItem[] {
  return rows.slice(0, cap).map((r) => ({
    key: r.key,
    title: r.label,
    value: fmt(r.value),
    share: total ? (r.value / total) * 100 : 0,
  }))
}

/** Which way each recorded transfer cause moves an animal, and what the record means by it. */
const TRANSFER_DIRECTION: Record<string, 'in' | 'out' | 'internal'> = {
  'Inward · other zoo': 'in',
  'Outward · other zoo': 'out',
  'Release to wild': 'out',
  'Breeding loan': 'out',
  'Internal move': 'internal',
}

const TRANSFER_META: Record<string, string> = {
  'Inward · other zoo': 'Arrival from another collection',
  'Outward · other zoo': 'Departure to another collection',
  'Release to wild': 'Released to the wild',
  'Breeding loan': 'Loaned out for breeding',
  'Internal move': 'Between own sites · no net change',
}

/**
 * A signed movement row.
 *
 * `Movers` draws exactly this bar and `TapRow` draws exactly this chevron; neither draws both,
 * and the whole point of the movement card is that each flow is a figure you can open. So the
 * two are composed here, in the one place that needs it, from the same tokens.
 */
function MoveRow({
  label,
  sub,
  value,
  peak,
  onOpen,
}: {
  label: string
  sub?: string
  value: number
  peak: number
  onOpen?: () => void
}) {
  const up = value >= 0
  const body = (
    <span className="flex items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-small text-[#1c1a16]">{label}</span>
        {sub && <span className="mt-0.5 block text-caption text-[#9b958b]">{sub}</span>}
      </span>
      <span
        className="w-[46px] shrink-0 text-right text-small font-medium tabular-nums"
        style={{ color: value === 0 ? FAINT : up ? TONE.good : TONE.bad }}
      >
        {up ? '+' : '−'}
        {fmt(Math.abs(value))}
      </span>
      <span className="relative h-[8px] w-[68px] shrink-0" aria-hidden>
        <span className="absolute inset-y-0 left-1/2 w-px" style={{ backgroundColor: '#e3e1dc' }} />
        <span
          className="absolute top-[1px] h-[6px]"
          style={{
            left: up ? '50%' : undefined,
            right: up ? undefined : '50%',
            width: `${Math.max(2, (Math.abs(value) / Math.max(1, peak)) * 50)}%`,
            borderRadius: up ? '0 3px 3px 0' : '3px 0 0 3px',
            backgroundColor: value === 0 ? '#e3e1dc' : up ? TONE.good : mix(TONE.bad, 0.6),
          }}
        />
      </span>
      <span className="w-[10px] shrink-0" style={{ color: onOpen ? ACCENT_INK : 'transparent' }} aria-hidden>
        ›
      </span>
    </span>
  )
  return (
    <li className="border-b border-[#f0efec] last:border-0">
      {onOpen ? (
        <button type="button" onClick={onOpen} className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2.5 text-left">
          {body}
        </button>
      ) : (
        <div className="py-2.5">{body}</div>
      )}
    </li>
  )
}

/**
 * `More`'s pill with a handler instead of an href.
 *
 * The same swap `TapRow` makes on `Facts`, and for the same reason: this layer drills through
 * sheets rather than routes, and an anchor navigates. Used only in the half-width cards, where
 * a full row cannot spare the width for a label.
 */
function OpenPill({ label, onOpen }: { label: string; onOpen: () => void }) {
  const accent = useAccent()
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-press mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-caption font-medium whitespace-nowrap"
      style={{ backgroundColor: mix(accent, 0.11), color: ACCENT_INK }}
    >
      {label}
      <span aria-hidden>→</span>
    </button>
  )
}

function LeaderTile({ leader, onOpen }: { leader: Leader; onOpen?: () => void }) {
  const accent = useAccent()
  const body = (
    <>
      <p className="truncate text-overline font-medium uppercase" style={{ color: accent }}>
        {leader.tag}
      </p>
      <div className="mt-1">
        <Figure value={leader.value} size={24} />
      </div>
      <p className="mt-0.5 text-small text-[#1c1a16]">{leader.label}</p>
      {leader.sub && <p className="mt-0.5 text-caption text-[#9b958b]">{leader.sub}</p>}
    </>
  )
  return (
    <div className="border-l-2 pl-3" style={{ borderColor: mix(accent, 0.55) }}>
      {onOpen ? (
        <button type="button" onClick={onOpen} className="card-press block w-full text-left">
          {body}
        </button>
      ) : (
        body
      )}
    </div>
  )
}

/* ── the toolbar ─────────────────────────────────────────────────────────── */

function Toolbar({
  scopeName,
  asOf,
  sites,
  species,
  query,
  onQuery,
  facets,
  holdings: all,
  onApply,
  onOpenAnimal,
  win,
}: {
  scopeName: string
  asOf: string
  sites: number
  species: number
  query: string
  onQuery: (v: string) => void
  facets: Facets
  holdings: Holding[]
  onApply: (f: Facets) => void
  onOpenAnimal: (id: string, name: string) => void
  win: Win
}) {
  const { open } = useSheet()
  const on = facetsOn(facets)

  /* An id typed into the search box is a record, not a row — `searchAnimals` resolves one
     directly, so "ANM-AQ03-00142" opens the animal rather than filtering a species list that
     will never contain it. */
  const hits = useMemo(() => (query.trim().length >= 3 ? searchAnimals(query, null, win, 3) : []), [query, win])

  return (
    <div className="px-[var(--gutter-lg)] pb-3">
      <div className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card-sm)]">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-small font-medium text-[#1c1a16]">
            {scopeName} · as of {asOf}
          </p>
          <p className="shrink-0 text-caption whitespace-nowrap" style={{ color: FAINT }}>
            {sites} {sites === 1 ? 'site' : 'sites'} · {species} species
          </p>
        </div>
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
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {activeChips(facets).map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full bg-[#f4f3ef] py-[4px] pr-1.5 pl-2.5 text-caption font-medium text-[#55524a]"
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
      </div>
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
      <div className="flex gap-2 px-[var(--gutter-lg)] pt-1 pb-3">
        <button
          type="button"
          onClick={() => {
            onApply(NO_FACETS)
            back()
          }}
          className="card-press flex-1 rounded-[11px] border border-[#eceae5] bg-white py-2.5 text-small font-semibold text-[#3d3a34]"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draft)
            back()
          }}
          className="card-press flex-[2] rounded-[11px] py-2.5 text-small font-semibold text-white"
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
            className={`shrink-0 rounded-full px-2.5 py-[5px] text-caption font-medium whitespace-nowrap transition-colors ${
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
  globalWin,
}: {
  siteKey: string | null
  scopeName: string
  globalWin: Win
}) {
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

  const values = points.map((p) => p.value)
  const last = values[values.length - 1] ?? 0
  const high = values.length ? Math.max(...values) : 0
  const low = values.length ? Math.min(...values) : 0

  return (
    <Section icon={TrendingUp} label="Population trend">
      <div className="-mx-1 mb-3.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hidden">
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
                className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-medium whitespace-nowrap transition-colors ${
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
      <AreaTrend
        points={points}
        compare={compare}
        unit={`animals held · ${scopeName.toLowerCase()}`}
        height={156}
        empty={`${win.window} is a single reading — pick a longer range to see the curve.`}
      />

      {points.length > 1 && (
        /* A READOUT OF THE CURVE, NOT A SECOND NET CHANGE. The population card above owns the
           delta and the window it was measured over; a change computed here across a different
           range would sit two cards away from it reading as a contradiction. High, low and
           latest are properties of the line that is drawn. */
        <div className="mt-4 border-t border-[#f0efec] pt-3">
          <Snapshot
            cols={3}
            items={[
              { label: 'Latest', value: fmt(last) },
              { label: 'Range high', value: fmt(high) },
              { label: 'Range low', value: fmt(low) },
            ]}
          />
        </div>
      )}
    </Section>
  )
}

/* ── sites ───────────────────────────────────────────────────────────────── */

const SITE_SORTS: [SiteSort, string][] = [
  ['animals', 'Population'],
  ['species', 'Species'],
  ['enclosures', 'Enclosures'],
  ['net', 'Change'],
]

/**
 * EVERY SITE, AS A RANKED LIST — one rendering, not two.
 *
 * This card used to be a six-column table above 560px and, below it, six stacked rows each
 * carrying a full-width progress bar. Both were drawing the ranking twice: the rows are already
 * in order, so the bar was a chart of the fact that row one is above row two. What a director
 * reads off a site is its position, its headcount, its share and which way it moved — all four
 * of which are type — so the only mark left is the rail down the left edge, whose weight carries
 * the share.
 *
 * One rendering means the tablet and the desktop get the same list with more room in it rather
 * than a different component, and the phone stops being the version with a bar in it.
 */
function SitesCard({
  rows,
  scoped,
  onOpen,
}: {
  rows: SiteRow[]
  scoped: string | null
  onOpen: (key: string) => void
}) {
  const [sort, setSort] = useState<SiteSort>('animals')
  const shown = useMemo(() => sortSites(scoped ? rows.filter((r) => r.key === scoped) : rows, sort), [rows, scoped, sort])

  return (
    <Section icon={MapPin} label="Site population" aside={`${shown.length} of ${rows.length} sites`}>
      <Chips
        options={SITE_SORTS.map(([k, l]) => [k, l] as [string, string])}
        value={sort}
        onPick={(v) => setSort(v as SiteSort)}
      />
      <div className="mt-2">
        <RankList
          items={shown.map((r) => ({
            key: r.key,
            title: r.name,
            meta: `${r.code} · ${r.species} species · ${r.enclosures} enclosures`,
            value: fmt(r.animals),
            share: r.percent,
            /* One decimal here, not the calm whole number: at six sites the reader is comparing
               9.8 against 10.4, and both round to the same figure. */
            shareText: `${r.percent.toFixed(1)}%`,
            change: r.net === 0 ? undefined : signed(r.net),
            onPick: () => onOpen(r.key),
          }))}
        />
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
  onOpen,
}: {
  rows: SpeciesRow[]
  query: string
  onQuery: (v: string) => void
  onOpen: (row: SpeciesRow) => void
}) {
  const [sort, setSort] = useState<SpeciesSort>('animals')
  const matched = useMemo(() => sortSpecies(searchSpecies(rows, query), sort), [rows, query, sort])
  const paged = usePaged<SpeciesRow>(
    (offset, limit) => ({ rows: matched.slice(0, offset + limit), total: matched.length }),
    20,
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
