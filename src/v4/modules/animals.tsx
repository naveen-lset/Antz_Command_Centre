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
 * NO TWO SECTIONS LOOK ALIKE. Seventeen sections of identical rows is a spreadsheet. The
 * composition is a stacked bar over tappable class rows, movement is a signed ledger around a
 * centre axis, the trend is a real axis, sites are a sortable table, species a searchable one,
 * the Red List is its published badges, and the leaders are five tiles. The design system is
 * unchanged; what varies is which of its marks each question deserves.
 *
 * NOTHING IS EXPLAINED, ONLY STATED. There is no prose, no recommendation and no insight — every
 * string on this page names a number or a filter.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowLeftRight,
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
import { longDate, shortDate, type Win } from '../../core/calendar'
import { searchAnimals } from '../../core/animals'
import { SITES, siteOf } from '../../core/world'
import { CLASS_ICONS } from '../../exec/classIcons'
import {
  ACCENT,
  ACCENT_INK,
  Band,
  Composition,
  Duo,
  FAINT,
  Facts,
  Figure,
  Hero,
  Pair,
  RED_LIST,
  Rule,
  Scoreboard,
  Section,
  Snapshot,
  Stack,
  TONE,
  TRACK,
  Trend,
  RedList,
  VALUE,
  fmt,
  mix,
  useAccent,
  type RedListCode,
} from '../../exec/system'
import { AnimalPanel, TapList, TapRow } from '../panels'
import { useSheet } from '../sheet'
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
  flowBySite,
  leaders,
  movement,
  sexTotals,
  siteRows,
  sortSites,
  sortSpecies,
  searchSpecies,
  speciesRows,
  trend,
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

  /* ONE READ, EVERY SECTION. `holdings` is the population with each species' standing attached;
     everything from the composition down to the leaders is an aggregation of this array or of
     the species rows beside it, which is what makes the parts sum to the hero. */
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

  const total = totalOf(rows)
  const collection = totalOf(allHoldings)
  const lensed = facetsOn(facets) > 0
  const delta = useMemo(() => change(siteKey, win), [siteKey, win])
  const move = useMemo(() => movement(siteKey, win), [siteKey, win])
  const specs = useMemo(() => flowSpecs(move), [move])
  const sites = useMemo(() => siteRows(win), [win])
  const enclosures = siteKey ? (siteOf(siteKey)?.enclosures ?? 0) : SITES.reduce((n, s) => n + s.enclosures, 0)
  const scopeName = scope.site ? scope.site.name : 'Overall'

  const openFlow = (key: keyof typeof specs) => {
    const spec = specs[key]
    open({ title: spec.title, eyebrow: 'Animal Population', body: <FlowPanel spec={spec} siteKey={siteKey} win={win} /> })
  }
  const openSite = (key: string) =>
    open({ title: siteOf(key)?.name ?? key, eyebrow: 'Animal Population', body: <SitePanel siteKey={key} win={win} /> })
  const openSpecies = (row: SpeciesRow) =>
    open({ title: row.name, eyebrow: row.siteName, body: <SpeciesPanel row={row} win={win} /> })

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
          <Section icon={Sparkles} label="Population change" aside={win.window}>
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
          </Section>
        </Wide>

        {/* 4 · TREND. Real readings on a zero-based axis, drawn for whichever range the reader
            picks. The range control belongs to the chart; the page's own as-of date and its
            flow window still come from the global scope. */}
        <Wide>
          <TrendCard siteKey={siteKey} scopeName={scopeName} globalWin={win} />
        </Wide>

        {/* 5 · COLLECTION COMPOSITION. The share as one stacked bar, then the classes as rows
            that open their species — the count answers "what is it made of", and the only
            useful next question is "which ones". */}
        <Section icon={Layers} label="Collection composition" aside={plural(classBands(rows).length, 'class')}>
          <Composition
            items={compositionBars(classBands(rows).map((c) => ({ label: c.cls, value: c.animals })))}
            unit="animals"
          />
          <Rule label="By class" />
          <TapList>
            {classBands(rows).map((c) => (
              <TapRow
                key={c.cls}
                lead={classGlyph(c.cls)}
                label={c.cls}
                sub={`${c.species} species · ${c.percent.toFixed(1)}%`}
                value={fmt(c.animals)}
                bar={(c.animals / Math.max(1, classBands(rows)[0]?.animals ?? 1)) * 100}
                onOpen={() =>
                  open({
                    title: c.cls,
                    eyebrow: 'Collection composition',
                    body: <ClassGroup cls={c.cls} rows={rows} win={win} siteKey={siteKey ?? undefined} />,
                  })
                }
              />
            ))}
          </TapList>
        </Section>

        {/* 6 · REGULATORY. The one split on this page that does NOT overlap: an animal carrying
            both a CITES listing and a schedule is counted once, which is why it is drawn as a
            single stacked bar and the two cards below it are not. */}
        <Section icon={ScrollText} label="Regulatory standing" aside={`${regulatorySplit(rows).regulated.percent.toFixed(1)}% regulated`}>
          <Composition
            items={[
              { label: 'Non-regulatory', value: regulatorySplit(rows).open.animals },
              { label: 'Regulatory', value: regulatorySplit(rows).regulated.animals },
            ]}
            unit="animals"
          />
          <Rule label="Tap to drill" />
          <TapList>
            {[regulatorySplit(rows).regulated, regulatorySplit(rows).open].map((b, i) => (
              <TapRow
                key={b.key}
                label={b.label}
                sub={`${b.species} species · ${b.percent.toFixed(1)}%`}
                value={fmt(b.animals)}
                bar={b.percent}
                onOpen={() =>
                  open({
                    title: b.label,
                    eyebrow: 'Regulatory standing',
                    body: <RegulatoryGroup regulated={i === 0} rows={rows} win={win} siteKey={siteKey ?? undefined} />,
                  })
                }
              />
            ))}
          </TapList>
        </Section>

        {/* 7 · CITES — a trade convention. Kept apart from the schedules below, because an
            animal routinely carries both and one merged chart would double-count it. */}
        <Section icon={ShieldAlert} label="CITES" aside="Appendix I · II · III">
          <TapList>
            {citesBands(rows).map((b) => (
              <TapRow
                key={b.key}
                label={b.label}
                sub={`${b.species} species · ${b.percent.toFixed(2)}%`}
                value={fmt(b.animals)}
                bar={b.animals ? Math.max(4, (b.animals / Math.max(1, Math.max(...citesBands(rows).map((x) => x.animals)))) * 100) : 0}
                onOpen={
                  b.animals > 0
                    ? () =>
                        open({
                          title: `CITES Appendix ${b.key}`,
                          eyebrow: 'Regulatory',
                          body: (
                            <CitesGroup
                              appendix={b.key as CitesAppendix}
                              rows={rows}
                              win={win}
                              siteKey={siteKey ?? undefined}
                            />
                          ),
                        })
                    : undefined
                }
              />
            ))}
          </TapList>
        </Section>

        {/* 8 · SCHEDULE — Indian domestic law, its own card for the same reason. */}
        <Section icon={ScrollText} label="Wildlife Protection Act" aside="Schedule I · II · III">
          <TapList>
            {scheduleBands(rows).map((b) => (
              <TapRow
                key={b.key}
                label={b.label}
                sub={`${b.species} species · ${b.percent.toFixed(2)}%`}
                value={fmt(b.animals)}
                bar={b.animals ? Math.max(4, (b.animals / Math.max(1, Math.max(...scheduleBands(rows).map((x) => x.animals)))) * 100) : 0}
                onOpen={
                  b.animals > 0
                    ? () =>
                        open({
                          title: `Schedule ${b.key}`,
                          eyebrow: 'Regulatory',
                          body: (
                            <ScheduleGroup
                              schedule={b.key as ScheduleClass}
                              rows={rows}
                              win={win}
                              siteKey={siteKey ?? undefined}
                            />
                          ),
                        })
                    : undefined
                }
              />
            ))}
          </TapList>
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

        {/* 12 · SEX. Compact by design — undetermined is the majority ANSWER in a collection
            four fifths made of fish and invertebrates, not a gap in the record. */}
        <Section icon={Venus} label="Sex distribution" aside={fmt(sexTotals(species).total)}>
          <Scoreboard
            items={[
              { value: fmt(sexTotals(species).male), label: 'Male' },
              { value: fmt(sexTotals(species).female), label: 'Female' },
              { value: fmt(sexTotals(species).unknown), label: 'Undetermined' },
            ]}
          />
          <Rule label="Share" />
          <Composition
            items={[
              { label: 'Undetermined', value: sexTotals(species).unknown },
              { label: 'Male', value: sexTotals(species).male },
              { label: 'Female', value: sexTotals(species).female },
            ]}
            unit="animals"
          />
        </Section>

        {/* 13 · 14 · Births and deaths, side by side. Population context only — the cause
            analysis belongs to the Mortality page and the breeding detail to Natality. */}
        <Duo>
          <Section icon={Sparkles} label="Births" tight aside={win.noun}>
            <Figure value={fmt(move.births.total)} size={34} />
            <p className="mt-0.5 text-[12px] text-[#6d6860]">births</p>
            <div className="mt-3">
              <Facts
                items={[
                  { label: 'Natural', value: fmt(move.births.natural) },
                  { label: 'Assisted', value: fmt(move.births.assisted) },
                  { label: 'Sites', value: String(flowBySite('births', siteKey, win).length) },
                ]}
              />
            </div>
            <OpenPill label="Records" onOpen={() => openFlow('births')} />
          </Section>

          <Section icon={Activity} label="Deaths" tight aside={win.noun}>
            <Figure value={fmt(move.deaths)} size={34} color={move.deaths > 0 ? TONE.bad : VALUE} />
            <p className="mt-0.5 text-[12px] text-[#6d6860]">deaths</p>
            <div className="mt-3">
              <Facts
                items={[
                  { label: 'Rate', value: `${((move.deaths / Math.max(1, delta.closing)) * 100).toFixed(3)}%` },
                  { label: 'Sites', value: String(flowBySite('mortality', siteKey, win).length) },
                  { label: 'Net of births', value: signed(move.births.total - move.deaths) },
                ]}
              />
            </div>
            <OpenPill label="Records" onOpen={() => openFlow('mortality')} />
          </Section>
        </Duo>

        {/* 15 · EXTERNAL TRANSFERS. In and out as two ends of one figure, with the internal
            moves stated beside them so nobody reads them as a population change. */}
        <Section icon={ArrowLeftRight} label="External transfers" aside={win.noun}>
          <Pair
            a={{ value: fmt(move.transfers.in), label: 'External in' }}
            b={{ value: fmt(move.transfers.out), label: 'External out' }}
            relation={`net ${signed(move.transfers.net)}`}
            tone={netTone(move.transfers.net)}
          />
          <Rule label="Movement" />
          <TapList>
            <TapRow
              label="External in"
              sub="Arrivals from other collections"
              value={fmt(move.transfers.in)}
              tone="good"
              onOpen={() => openFlow('transferIn')}
            />
            <TapRow
              label="External out"
              sub="Departures, releases and loans"
              value={fmt(move.transfers.out)}
              tone={move.transfers.out > 0 ? 'bad' : undefined}
              onOpen={() => openFlow('transferOut')}
            />
            <TapRow label="Internal moves" sub="Between own sites · no net change" value={fmt(move.transfers.internal)} />
          </TapList>
        </Section>

        {/* 16 · ESCAPES. The critical treatment when anything is still out, and never otherwise
            — an amber band over a clear board is how a reader learns to stop looking at it. */}
        <Section icon={Footprints} label="Escaped animals" aside={win.noun}>
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
              { label: 'Recovered', value: fmt(move.escapes.recovered), tone: 'good' },
              { label: 'Unrecovered', value: fmt(move.escapes.unrecovered), tone: move.escapes.unrecovered > 0 ? 'bad' : undefined },
            ]}
          />
          <div className="mt-4 border-t border-[#f0efec] pt-2">
            <TapList>
              <TapRow label="Escape records" sub="By site, species and animal" value="Open" onOpen={() => openFlow('escaped')} />
            </TapList>
          </div>
        </Section>

        {/* 17 · FETAL DEATH, kept apart from mortality. A stillbirth is not a death in the
            collection register, and merging the two would overstate mortality and understate
            the breeding programme's own loss rate. */}
        <Section icon={Baby} label="Fetal death" aside="not animal mortality">
          <Snapshot
            cols={3}
            items={[
              { label: 'Total', value: fmt(move.fetal.total), note: 'fetal loss' },
              { label: 'Stillbirth', value: fmt(move.fetal.stillbirth), note: 'late term' },
              { label: 'Abortion', value: fmt(move.fetal.abortion), note: 'mid term' },
            ]}
          />
          <Rule label="Where" />
          <TapList>
            {flowBySite('fetal', siteKey, win).map((s) => (
              <TapRow
                key={s.key}
                label={s.label}
                sub={siteOf(s.key)?.code}
                value={fmt(s.value)}
                onOpen={() => openFlow('fetal')}
              />
            ))}
            {flowBySite('fetal', siteKey, win).length === 0 && (
              <TapRow label="No fetal loss recorded" value="0" />
            )}
          </TapList>
        </Section>

        {/* 18 · LEADERS. Five extremes, computed rather than chosen, each opening the thing it
            names. Numbers and labels only. */}
        <Wide>
          <Section icon={Trophy} label="Population leaders" aside={win.window}>
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
          </Section>
        </Wide>
      </Stack>

      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-[11px] text-[#9b958b]">
        {scopeName} · population as of {longDate(win.to)}
      </p>
    </>
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

/** Six segments at most, so a nine-class collection does not become nine unreadable slivers. */
function compositionBars(items: { label: string; value: number }[]) {
  if (items.length <= 6) return items
  const head = items.slice(0, 5)
  const tail = items.slice(5)
  return [...head, { label: `Other · ${tail.length} classes`, value: tail.reduce((n, i) => n + i.value, 0) }]
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
        <span className="block truncate text-[13.5px] text-[#1c1a16]">{label}</span>
        {sub && <span className="mt-0.5 block text-[11px] leading-[15px] text-[#9b958b]">{sub}</span>}
      </span>
      <span
        className="w-[46px] shrink-0 text-right text-[14px] font-medium tabular-nums"
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
      className="card-press mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-[11.5px] font-medium whitespace-nowrap"
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
      <p className="truncate text-[9.5px] font-medium tracking-[0.09em] uppercase" style={{ color: accent }}>
        {leader.tag}
      </p>
      <div className="mt-1">
        <Figure value={leader.value} size={22} />
      </div>
      <p className="mt-0.5 text-[12px] leading-[16px] text-[#1c1a16]">{leader.label}</p>
      {leader.sub && <p className="mt-0.5 text-[11px] leading-[15px] text-[#9b958b]">{leader.sub}</p>}
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
          <p className="min-w-0 truncate text-[13px] font-medium text-[#1c1a16]">
            {scopeName} · as of {asOf}
          </p>
          <p className="shrink-0 text-[11px] whitespace-nowrap" style={{ color: FAINT }}>
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
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1c1a16] outline-none placeholder:text-[#9b958b]"
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
            className={`card-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium ${
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
                    <span className="block truncate text-[13px] text-[#1c1a16]">{a.callName ?? a.id}</span>
                    <span className="block truncate text-[11px]" style={{ color: FAINT }}>
                      {a.id} · {a.speciesName} · {a.siteName}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px]" style={{ color: ACCENT_INK }}>
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
                className="inline-flex items-center gap-1 rounded-full bg-[#f4f3ef] py-[4px] pr-1.5 pl-2.5 text-[11.5px] font-medium text-[#55524a]"
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
              className="rounded-full px-2 py-[4px] text-[11.5px] font-semibold"
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
          className="card-press flex-1 rounded-[11px] border border-[#eceae5] bg-white py-2.5 text-[13px] font-semibold text-[#3d3a34]"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draft)
            back()
          }}
          className="card-press flex-[2] rounded-[11px] py-2.5 text-[13px] font-semibold text-white"
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
            className={`shrink-0 rounded-full px-2.5 py-[5px] text-[11.5px] font-medium whitespace-nowrap transition-colors ${
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
  const { values, labels } = useMemo(() => trend(siteKey, win, win.days > 200 ? 24 : 30), [siteKey, win])

  const last = values[values.length - 1] ?? 0
  const high = values.length ? Math.max(...values) : 0
  const low = values.length ? Math.min(...values) : 0

  return (
    <Section icon={TrendingUp} label="Population trend" aside={`${scopeName} · ${win.window}`}>
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
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap transition-colors ${
                  on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
                }`}
              >
                {label}
              </button>
            )
          },
        )}
      </div>

      {values.length > 1 ? (
        <>
          <Trend values={values} labels={labels} unit={`animals held · ${scopeName.toLowerCase()}`} height={148} />
          {/* A READOUT OF THE CURVE, NOT A SECOND NET CHANGE. The population card above owns
              the delta and owns the window it was measured over; a change computed here across
              a different range would sit two cards away from it reading as a contradiction.
              High, low and latest are properties of the line that is drawn. */}
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
        </>
      ) : (
        /* The honest empty state the brief asks for: a range too short to plot is stated as
           such rather than drawn as a single point pretending to be a line. */
        <p className="py-4 text-[13px] text-[#6d6860]">
          {win.window} is a single reading — pick a longer range to see the curve.
        </p>
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
 * Every site, sorted on any of its four columns.
 *
 * TWO RENDERINGS OF ONE DATASET, chosen on the width of the CONTENT COLUMN rather than the
 * window — with a sidebar and an executive panel flanking it, a 1280px desktop hands this card
 * less room than a tablet in landscape. Past 560px it is a dense table; below it the same rows
 * stack, because a four-column table squeezed to 390px is four unreadable columns.
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
  const widest = Math.max(...shown.map((r) => r.animals), 1)

  return (
    <Section icon={MapPin} label="Site population" aside={`${shown.length} of ${rows.length} sites`}>
      <Chips
        options={SITE_SORTS.map(([k, l]) => [k, l] as [string, string])}
        value={sort}
        onPick={(v) => setSort(v as SiteSort)}
      />

      {/* Dense table where there is room. */}
      <div className="mt-3.5 hidden @[560px]:block">
        <table className="w-full">
          <thead>
            <tr>
              {['Site', 'Animals', 'Species', 'Enclosures', 'Share', 'Change'].map((h, i) => (
                <th
                  key={h}
                  className={`pb-2 text-[9.5px] font-medium tracking-[0.08em] whitespace-nowrap uppercase ${
                    i === 0 ? 'text-left' : 'pl-3 text-right'
                  }`}
                  style={{ color: FAINT }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className="border-t border-[#f0efec]">
                <td className="py-0">
                  <button type="button" onClick={() => onOpen(r.key)} className="card-press block w-full py-2.5 text-left">
                    <span className="block text-[13.5px] leading-[17px] text-[#1c1a16]">{r.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-[14px]" style={{ color: FAINT }}>
                      {r.code}
                    </span>
                  </button>
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(r.animals)}
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums text-[#3d3a34]">{r.species}</td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums text-[#3d3a34]">{r.enclosures}</td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums text-[#3d3a34]">
                  {r.percent.toFixed(1)}%
                </td>
                <td
                  className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums"
                  style={{ color: r.net === 0 ? FAINT : TONE[netTone(r.net)] }}
                >
                  {signed(r.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked rows on a phone — the same six facts, laid out for a thumb. */}
      <div className="mt-3.5 @[560px]:hidden">
        <ul className="flex flex-col">
          {shown.map((r) => (
            <li key={r.key} className="border-b border-[#f0efec] last:border-0">
              <button type="button" onClick={() => onOpen(r.key)} className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2.5 text-left">
                <span className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#1c1a16]">{r.name}</span>
                  <span className="shrink-0 text-[14px] font-medium tabular-nums" style={{ color: VALUE }}>
                    {fmt(r.animals)}
                  </span>
                  <span
                    className="w-[52px] shrink-0 text-right text-[12px] font-medium tabular-nums"
                    style={{ color: r.net === 0 ? FAINT : TONE[netTone(r.net)] }}
                  >
                    {signed(r.net)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px]" style={{ color: FAINT }}>
                  {r.code} · {r.species} species · {r.enclosures} enclosures · {r.percent.toFixed(1)}%
                </span>
                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(3, (r.animals / widest) * 100)}%`, backgroundColor: mix(ACCENT, 0.72) }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
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
 * Every species, searched and paged.
 *
 * NOT four hundred cards. The list is the whole registry under the scope, narrowed by the
 * toolbar's search box and paged twenty at a time — `MoreRows` states the real total beside
 * the page, so a list showing twenty rows can never be read as twenty species.
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
  const widest = Math.max(...matched.map((r) => r.animals), 1)

  return (
    <Section
      icon={Dna}
      label="Species population"
      aside={query ? `${matched.length} of ${rows.length}` : `${rows.length} species`}
    >
      <Chips
        options={SPECIES_SORTS.map(([k, l]) => [k, l] as [string, string])}
        value={sort}
        onPick={(v) => setSort(v as SpeciesSort)}
      />

      {matched.length === 0 && (
        <p className="mt-4 text-[12.5px]" style={{ color: FAINT }}>
          No species matches “{query.trim()}”.{' '}
          <button type="button" onClick={() => onQuery('')} className="font-semibold" style={{ color: ACCENT_INK }}>
            Clear
          </button>
        </p>
      )}

      {/* Dense table where there is room; the sex columns wait for a little more of it. */}
      <div className="mt-3.5 hidden @[560px]:block">
        <table className="w-full">
          <thead>
            <tr>
              <th className="pb-2 text-left text-[9.5px] font-medium tracking-[0.08em] uppercase" style={{ color: FAINT }}>
                Species
              </th>
              {['Animals', 'M', 'F', 'U', 'Sites', 'Share'].map((h) => (
                <th
                  key={h}
                  className={`pb-2 pl-3 text-right text-[9.5px] font-medium tracking-[0.08em] whitespace-nowrap uppercase ${
                    'MFU'.includes(h) && h.length === 1 ? 'hidden @[640px]:table-cell' : ''
                  }`}
                  style={{ color: FAINT }}
                >
                  {h}
                </th>
              ))}
              <th className="pb-2 pl-3 text-right text-[9.5px] font-medium tracking-[0.08em] uppercase" style={{ color: FAINT }}>
                Standing
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((r) => (
              <tr key={r.id} className="border-t border-[#f0efec]">
                <td className="py-0">
                  <button type="button" onClick={() => onOpen(r)} className="card-press block w-full py-2.5 text-left">
                    <span className="block text-[13.5px] leading-[17px] text-[#1c1a16]">{r.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-[14px]" style={{ color: FAINT }}>
                      {r.cls} · {r.siteName}
                    </span>
                  </button>
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(r.animals)}
                </td>
                <td className="hidden py-2.5 pl-3 text-right text-[12.5px] tabular-nums text-[#3d3a34] @[640px]:table-cell">
                  {fmt(r.male)}
                </td>
                <td className="hidden py-2.5 pl-3 text-right text-[12.5px] tabular-nums text-[#3d3a34] @[640px]:table-cell">
                  {fmt(r.female)}
                </td>
                <td className="hidden py-2.5 pl-3 text-right text-[12.5px] tabular-nums text-[#3d3a34] @[640px]:table-cell">
                  {fmt(r.unknown)}
                </td>
                <td className="py-2.5 pl-3 text-right text-[12.5px] tabular-nums text-[#3d3a34]">{r.sites}</td>
                <td className="py-2.5 pl-3 text-right text-[12.5px] tabular-nums text-[#3d3a34]">
                  {r.percent < 0.01 ? '<0.01' : r.percent.toFixed(2)}%
                </td>
                <td className="py-2.5 pl-3 text-right text-[11px] whitespace-nowrap" style={{ color: FAINT }}>
                  {standingLabel(r.standing)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked rows on a phone. */}
      <div className="mt-3.5 @[560px]:hidden">
        <ul className="flex flex-col">
          {paged.rows.map((r) => (
            <li key={r.id} className="border-b border-[#f0efec] last:border-0">
              <button type="button" onClick={() => onOpen(r)} className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2.5 text-left">
                <span className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#1c1a16]">{r.name}</span>
                  <span className="shrink-0 text-[14px] font-medium tabular-nums" style={{ color: VALUE }}>
                    {fmt(r.animals)}
                  </span>
                  <span
                    className="w-[46px] shrink-0 text-right text-[12px] font-medium tabular-nums"
                    style={{ color: r.net === 0 ? FAINT : TONE[netTone(r.net)] }}
                  >
                    {signed(r.net)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px]" style={{ color: FAINT }}>
                  {fmt(r.male)} M · {fmt(r.female)} F · {fmt(r.unknown)} U · {r.siteName} · {standingLabel(r.standing)}
                </span>
                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(3, (r.animals / widest) * 100)}%`, backgroundColor: mix(ACCENT, 0.72) }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <MoreRows page={paged} noun="species" />
    </Section>
  )
}
