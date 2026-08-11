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
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftRight,
  Dna,
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
  Facts,
  Figure,
  Hero,
  HERO_INK,
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
  PercentSplit,
  MicroBars,
  RankList,
  Ribbon,
  SplitRing,
  TileGrid,
  pct,
} from '../../exec/marks'
import { compareOf, pointsOf, tail } from '../plot'
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
  plural,
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
        <Wide>
          <Section icon={PawPrint} label="What we hold" aside={`as of ${longDate(win.to)}`}>
            {/* Composition first: the shape of the collection before any list of it.

                THE TREEMAP IS GONE AND THE RULE WENT WITH IT. It drew three near-identical
                green blocks — Aves, Mammalia, Reptilia — above a row of unlabelled slivers for
                the nine classes under about 13% of the box, in 330px, directly on top of a list
                naming the same three classes with the same three figures. Two marks answering
                one question, and the more prominent of them was the one that could not name its
                own cells. A squarified treemap earns its space on a deep hierarchy with a
                readable spread; a 39/32/27 split with a nine-class tail is neither.

                What replaces it is the one thing the list underneath genuinely cannot show: all
                twelve classes as parts of a single whole, in one line. The list has the names
                and the numbers; the strip has the proportion. */}
            <Section bare icon={Layers} label="Collection composition" aside={plural(classes.length, 'class')}>
              <Ribbon items={classes.map((c) => ({ label: c.cls, value: c.animals }))} height={12} />
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

            <SexCard bare siteKey={siteKey} facets={facets} />
            <SitesCard bare rows={sites} scoped={siteKey} onOpen={openSite} />
            <SpeciesCard bare rows={species} query={query} onQuery={setQuery} onOpen={openSpecies} />
            <LeadersCard bare siteKey={siteKey} facets={facets} />
          </Section>
        </Wide>

        <Wide>
          <Section icon={Sparkles} label="What changed" aside={win.window}>
            <PopulationChangeCard bare siteKey={siteKey} />
            <TrendCard bare siteKey={siteKey} scopeName={scopeName} globalWin={win} />
            {/* FIVE MODULES STOPPED BEING RE-ANSWERED HERE.

                Births ran to 3,444px inside this card and Mortality to 4,198px — each a full
                module page's worth of trend, calendar, site ladder, species table and cause
                breakdown, inlined. Together with transfers, escapes and fetal loss that was
                8,213px, 42% of a page that measured eighteen thousand, and every one of those
                questions has a page of its own that now reads the same tables directly.

                The reason it was built this way no longer holds. When those modules were
                authored fixtures, inlining them here was the only place the figures agreed;
                now `#/births` and `#/mortality` derive from the same events under the same
                scope, so a summary that links out cannot disagree with what it links to.

                What stays is what belongs on a POPULATION page: the size of each flow, its
                direction, and its recent shape. What goes is the analysis of each flow, which
                is the module's job. */}
            <FlowSummaries bare siteKey={siteKey} />
          </Section>
        </Wide>

        <Wide>
          <Section icon={ScrollText} label="What we answer for" aside={`${pct(reg.regulated.percent)} regulated`}>
            {/* THE THREE INSTRUMENTS STAY APART INSIDE THE GROUP. CITES is a trade convention,
                the Schedules are Indian domestic law and the Red List is an assessment of
                extinction risk. An animal routinely carries two of them or all three, so they do
                NOT sum and must never be drawn as one distribution. Grouping them in one card is
                a statement about where a reader looks, not about the figures adding up. */}
            <Section bare icon={ScrollText} label="Regulatory standing" aside={`${pct(reg.regulated.percent)} regulated`}>
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

            <Section bare icon={ShieldAlert} label="CITES" aside={`${pct(citesShare)} of collection listed`}>
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

            <Section bare icon={ScrollText} label="Wildlife Protection Act" aside="Schedule I · II · III">
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

            <Section bare icon={ShieldAlert} label="IUCN conservation status" aside="tap a category">
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
          </Section>
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

/**
 * The rows of the movement column, and what each one is allowed to claim.
 *
 * THREE SUB-LINES CAME OFF THESE ROWS, each of them a real column split into categories the
 * column does not contain:
 *
 *   · "0 natural · 0 assisted" under Births. `report_births.accession_type` is 'Natality' on
 *     all 66,303 rows, so both halves of the split are empty and the line said the collection
 *     had no natural births in the window.
 *   · "Transfer in +0". Every destination in the extract is outbound — see `population.ts`.
 *     The row is gone rather than zeroed, because an animal arriving is an accession and is
 *     already counted one row down.
 *   · "Transfer out" is now "Released or transferred out", which is what 84% Wild Release is.
 *
 * The deaths sub-line survives because it is a genuine ratio of two real counts.
 */
const MOVEMENTS = (
  move: ReturnType<typeof movement>,
  delta: { closing: number },
): { key: 'births' | 'mortality' | 'transferOut' | null; label: string; sub?: string; value: number }[] => [
  { key: 'births', label: 'Births', value: move.births.total },
  { key: null, label: 'Accessions', sub: 'Rescue, confiscation, intake', value: move.accessions },
  {
    key: 'mortality',
    label: 'Deaths',
    sub: `${((move.deaths / Math.max(1, delta.closing)) * 100).toFixed(3)}% of collection`,
    value: -move.deaths,
  },
  {
    key: 'transferOut',
    label: 'Released or transferred out',
    sub: 'External · releases, loans and rehoming',
    value: -move.transfers.out,
  },
]

function PopulationChangeCard({ siteKey, bare }: { siteKey: string | null; bare?: boolean }) {
  const { win, pill, overridden } = useCardWindow()
  const { move, openFlow } = useFlowSheets(siteKey, win)
  const delta = useMemo(() => change(siteKey, win), [siteKey, win])

  return (
    <Section bare={bare} icon={Sparkles} label="Population change" aside={pill}>
      {/* THE BRIDGE IS ONE ROW, NOT THREE.

          Opening, change and current were three full-width rows carrying one number each —
          about 180px to say 109,677 → +142 → 109,813, and stacked like that the reader has to
          hold two figures in their head to see that the middle one connects the other two. The
          relationship IS the card, so it is drawn as a relationship: three terms on one line
          with the arithmetic between them, in a third of the height. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tabular-nums" style={{ color: MUTED }}>
          <span className="text-body font-medium">{fmt(delta.opening)}</span>
          <span className="ml-1.5 text-caption">{shortDate(Math.max(0, win.from - 1))}</span>
        </span>
        <span className="text-caption" style={{ color: FAINT }} aria-hidden>
          →
        </span>
        <span
          className="text-body font-semibold tabular-nums"
          style={{ color: TONE[netTone(delta.net)] }}
        >
          {signed(delta.net)}
        </span>
        <span className="text-caption" style={{ color: FAINT }} aria-hidden>
          →
        </span>
        <span className="tabular-nums" style={{ color: HERO_INK }}>
          <span className="font-display text-n-md font-bold">{fmt(delta.closing)}</span>
          <span className="ml-1.5 text-caption" style={{ color: MUTED }}>
            {shortDate(win.to)}
          </span>
        </span>
      </div>
      <Rule label="Recorded movement" />
      <ul className="flex flex-col">
        {MOVEMENTS(move, delta).map((f) => (
          <MoveRow
            key={f.label}
            label={f.label}
            sub={f.sub}
            value={f.value}
            peak={Math.max(move.births.total, move.deaths, move.accessions, move.transfers.out, 1)}
            onOpen={f.key ? () => openFlow(f.key!) : undefined}
          />
        ))}
      </ul>
      {/* Escapes are not a zero here, they are an absence. `core/metrics.ts` lists `escaped`
          under UNSOURCED — there is no escape record in the extract — and the row used to
          render "−0 · 0 not recovered of 0", which states that nothing escaped rather than
          that nothing is recorded. Same distinction the nine empty modules exist for. */}
      <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-[#f0efec] pt-2.5">
        <span className="text-small" style={{ color: MUTED }}>
          Escapes
        </span>
        <span className="text-caption" style={{ color: FAINT }}>
          — {UNSOURCED.escaped}
        </span>
      </p>
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
      {/* Fetal loss used to sit here under its own rule, on the good argument that a fetus was
          never in the collection so its loss must not be added into the column above. The
          argument still holds and the figure does not: `fetal` is in `UNSOURCED`, so the row
          rendered "0 stillbirth · 0 abortion" beside a real headcount — three zeros stating
          that the collection lost no pregnancies this month. It is listed with the escapes
          instead, where the dash says what is true. */}
      <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-[#f0efec] pt-2.5">
        <span className="text-small" style={{ color: MUTED }}>
          Fetal loss
        </span>
        <span className="text-caption" style={{ color: FAINT }}>
          — {UNSOURCED.fetal}
        </span>
      </p>
      <CardWindowNote win={win} overridden={overridden} />
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
            <a href={r.href} className="card-press -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2.5 no-underline">
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
          <li key={slug} className="flex items-baseline justify-between gap-3 border-b border-[#f0efec] py-2.5 last:border-0">
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

function SexCard({ siteKey, facets, bare }: { siteKey: string | null; facets: Facets; bare?: boolean }) {
  const { win, pill, overridden } = useCardWindow()
  const { species } = useLens(siteKey, win, facets)
  const sexes = useMemo(() => sexTotals(species), [species])

  return (
    <Section bare={bare} icon={Venus} label="Sex distribution" aside={pill}>
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


function LeadersCard({ siteKey, facets, bare }: { siteKey: string | null; facets: Facets; bare?: boolean }) {
  const { win, pill, overridden } = useCardWindow()
  const { open } = useSheet()
  const { species } = useLens(siteKey, win, facets)
  const sites = useMemo(() => siteRows(win), [win])

  const openSite = (key: string) =>
    open({ title: siteOf(key)?.name ?? key, eyebrow: 'Animal Population', body: <SitePanel siteKey={key} win={win} /> })
  const openSpecies = (row: SpeciesRow) =>
    open({ title: row.name, eyebrow: row.siteName, body: <SpeciesPanel row={row} win={win} /> })

  return (
    <Section bare={bare} icon={Trophy} label="Population leaders" aside={pill}>
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
        {/* A zero takes no sign. `+0` claims a direction that a nil does not have, and this
            column carries genuine zeros — no transfer was recorded in a twenty-day window. */}
        {value === 0 ? '' : up ? '+' : '−'}
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
  bare,
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
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-small font-medium text-[#1c1a16]">
            {scopeName} · as of {asOf}
          </p>
          <p className="shrink-0 text-caption whitespace-nowrap" style={{ color: FAINT }}>
            {sites} {sites === 1 ? 'site' : 'sites'} · {fmt(species)} species
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

  const values = points.map((p) => p.value)
  const last = values[values.length - 1] ?? 0
  const high = values.length ? Math.max(...values) : 0
  const low = values.length ? Math.min(...values) : 0

  return (
    <Section bare={bare} icon={TrendingUp} label="Population trend">
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
  onOpen, bare }: {
  rows: SiteRow[]
  scoped: string | null
  onOpen: (key: string) => void; bare?: boolean }) {
  const [sort, setSort] = useState<SiteSort>('animals')
  const shown = useMemo(() => sortSites(scoped ? rows.filter((r) => r.key === scoped) : rows, sort), [rows, scoped, sort])

  /* The leaders, stated rather than left to be counted off the grid — concentration is the
     finding a reader takes from fifty sites, and a grid shows the spread without naming it. */
  const total = shown.reduce((n, r) => n + r.animals, 0)
  const lead = sortSites(shown, 'animals').slice(0, 3)
  const leadShare = total ? (lead.reduce((n, r) => n + r.animals, 0) / total) * 100 : 0

  return (
    <Section bare={bare} icon={MapPin} label="Site population" aside={`${shown.length} of ${rows.length} sites`}>
      <Chips
        options={SITE_SORTS.map(([k, l]) => [k, l] as [string, string])}
        value={sort}
        onPick={(v) => setSort(v as SiteSort)}
      />
      {shown.length > 3 && (
        <p className="mt-3 text-caption" style={{ color: MUTED }}>
          Top 3 hold <span className="font-medium tabular-nums">{pct(leadShare)}</span> of{' '}
          <span className="tabular-nums">{fmt(total)}</span> — led by {lead[0]?.name}
        </p>
      )}
      {/* FIFTY ROWS BECAME FIFTY TILES. As list rows this card was 3,211px — five screens for
          one block, and the single biggest reason the page ran to 18,000. The rows were not
          long because there were fifty of them but because each carried a name, a code, a
          species count and an enclosure count, none of which is what "where is the collection"
          asks. `TileGrid` keeps every site and drops the prose; the name survives on hover and
          for the screen reader, and the counts are one tap away in the drill. */}
      <div className="mt-3">
        <TileGrid
          items={shown.map((r) => ({
            key: r.key,
            code: r.code,
            label: `${r.name} · ${r.species} species · ${r.enclosures} enclosures`,
            value: r.animals,
            share: r.percent,
            change: r.net === 0 ? undefined : signed(r.net),
            changeTone: r.net > 0 ? ('good' as const) : ('bad' as const),
          }))}
          onPick={onOpen}
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
