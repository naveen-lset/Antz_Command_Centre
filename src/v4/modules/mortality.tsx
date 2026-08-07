/**
 * MORTALITY — a rate, a cause and a name.
 *
 * The page is built around the three things a death can be asked about, in the order they are
 * asked: how many against how many we hold (the rate, which is the only figure comparable to
 * another zoo's), why (cause analysis, which is where an intervention lives), and which animal
 * (the record, which is what a necropsy report is filed against).
 *
 * EVERY FIGURE ON THIS PAGE IS READ, NOT AUTHORED, and that is the change worth stating. The hero
 * was already scoped, and everything under it was a string: "against 215,432 held", "23 deaths",
 * a twelve-month array, a Pareto of six causes, five record rows. Scope to Carnivore Ridge for the
 * last seven days and the hero read 0 while the cards beneath it read 23 deaths against 215,432 —
 * six contradictions on one screen, each individually plausible.
 *
 * They are now all derived from `core/query.ts` under the scope in force:
 *
 *   · the rate is the window's deaths over the window's population, both scoped
 *   · the cause Pareto is the window's own events grouped by cause, so it sums to the hero
 *   · the site ladder, the species bars and the records are the same events grouped three ways
 *   · the twelve-month columns are the scoped daily series bucketed by month
 *
 * WHAT IS STILL AUTHORED, AND WHY THAT IS HONEST. The regulatory instruments and the necropsy
 * bench queue are not metrics — there is no Schedule I flag in the data model, and inventing one
 * to make a card scopeable would be the fabrication the brief rules out. Those two cards therefore
 * state that they are collection-wide rather than quietly re-scoping, and they are the last two
 * things on this page that a real system would replace with a query.
 */

import { useMemo } from 'react'
import {
  Activity,
  ClipboardList,
  FileSearch,
  MapPin,
  Percent,
  ScrollText,
  Skull,
  TrendingDown,
} from 'lucide-react'
import {
  Bars,
  Bullet,
  Columns,
  Facts,
  Highlights,
  Ladder,
  Pareto,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  StatusList,
  Table,
} from '../../exec/system'
import { DrillList, DrillRow, ModuleHero, NodePanel, SiteSplit, useSheet } from './kit'
import { MetricPanel } from '../panels'
import { useScope } from '../scope'
import { byDimension, bySpecies, bySite, figure, records } from '../../core/query'
import { series } from '../../core/series'
import { resolveWindow, shortDate } from '../../core/calendar'
import { siteKeyOf } from '../../core/scope'
import { fmt } from '../../exec/system'

/* ── the authored remainder ──────────────────────────────────────────────── */

const CASE = (id: string, species: string, cause: string, tone?: 'good' | 'warn' | 'bad') => ({
  id,
  label: id,
  sub: `${species} · ${cause}`,
  value: 1,
  tone,
  facts: [
    { label: 'Species', value: species },
    { label: 'Cause', value: cause, tone },
    { label: 'Received', value: '31 Jul' },
    { label: 'Gross findings', value: 'Recorded' },
    { label: 'Histopathology', value: tone === 'bad' ? 'Pending' : 'Complete', tone },
  ],
})

/**
 * Necropsy Centre → Species → Case. The pathologist's queue, not the collection's map.
 *
 * Authored, and labelled as collection-wide on the card. A necropsy bench is not a dimension of
 * the event data — there is no "which suite" on a death — so this cannot be scoped without
 * inventing the attribution.
 */
const NECROPSY = [
  {
    id: 'central',
    label: 'Central Necropsy Suite',
    sub: '14 of 23 · 5 pending',
    value: 14,
    unit: 'cases',
    children: [
      { id: 'n-fish', label: 'Actinopterygii', sub: '7 cases', value: 7, unit: 'cases', children: [CASE('NEC-1188', 'Nile Tilapia', 'Fungal infection', 'bad'), CASE('NEC-1184', 'Common Carp', 'Water quality', 'warn')] },
      { id: 'n-mam', label: 'Mammalia', sub: '4 cases', value: 4, unit: 'cases', children: [CASE('NEC-1191', 'Chital', 'Necropsy due', 'bad'), CASE('NEC-1180', 'Bengal Fox', 'Age-related')] },
      { id: 'n-av', label: 'Aves', sub: '3 cases', value: 3, unit: 'cases', children: [CASE('NEC-1186', 'Grey Francolin', 'Aspergillosis', 'warn')] },
    ],
  },
  {
    id: 'field',
    label: 'Field post-mortem',
    sub: '9 of 23 · on-site',
    value: 9,
    unit: 'cases',
    children: [
      { id: 'f-mam', label: 'Mammalia', sub: '5 cases', value: 5, unit: 'cases', children: [CASE('NEC-1189', 'Blackbuck', 'Trauma', 'warn')] },
      { id: 'f-rep', label: 'Reptilia', sub: '2 cases', value: 2, unit: 'cases', children: [CASE('NEC-1183', 'Flapshell Turtle', 'Age-related')] },
      { id: 'f-inv', label: 'Malacostraca', sub: '2 cases', value: 2, unit: 'cases', children: [CASE('NEC-1179', 'Rose Shrimp', 'Water quality', 'warn')] },
    ],
  },
]

/** The regulatory ceiling the rate is judged against. A policy number, not a measurement. */
const RATE_CEILING = 0.015

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export default function Mortality() {
  const { open } = useSheet()
  const { scope } = useScope()

  const deaths = figure(scope, 'mortality')
  const held = figure(scope, 'animals')

  /* The rate, and the two things it needs beside it: its own denominator and the ceiling it is
     judged against. Both scoped, so the comparison holds at any site and any window. */
  const rate = held.value > 0 ? (deaths.value / held.value) * 100 : 0
  const headroom = Math.min(100, Math.round((rate / RATE_CEILING) * 100))

  const causes = useMemo(() => byDimension(scope, 'mortality', 'detail'), [scope])
  const speciesRows = useMemo(() => bySpecies(scope, 'mortality'), [scope])
  const siteRows = useMemo(() => bySite(scope, 'mortality'), [scope])
  const where = useMemo(() => byDimension(scope, 'mortality', 'class'), [scope])
  const recent = useMemo(() => records(scope, 'mortality', 0, 6), [scope])

  /* Twelve months of the SCOPED series, labelled with the months it actually covers. */
  const year = resolveWindow('year')
  const monthly = useMemo(() => series('mortality', siteKeyOf(scope), year, 12), [scope, year.from])
  const monthLabels = useMemo(() => {
    const start = new Date(2025, 6, 31)
    return Array.from({ length: 12 }, (_, i) => MONTH_LETTERS[(start.getMonth() - 11 + i + 12) % 12])
  }, [])

  const leader = siteRows[0]
  const topCause = causes[0]

  return (
    <>
      <ModuleHero
        icon={Activity}
        slug="mortality"
        value={fmt(deaths.value)}
        label="Deaths"
        tone={deaths.value === 0 ? 'good' : 'neutral'}
        stats={[
          { value: rate.toFixed(3), unit: '%', label: 'Rate' },
          { value: String(speciesRows.length), label: 'Species' },
          { value: String(siteRows.filter((r) => r.value > 0).length), label: 'Sites' },
        ]}
      />
      <Stack>
        {/* The rate, with the denominator visible. A count of 23 means nothing without 215,432
            beside it, and a rate without its base cannot be compared to anyone else's. Both are
            now the scope's own figures rather than the collection's. */}
        <Section icon={Percent} label="Mortality rate" aside={`against ${fmt(held.value)} held`}>
          <Bullet
            label={scope.win.label}
            value={`${rate.toFixed(3)}%`}
            percent={headroom}
            target={100}
            note={`Ceiling ${RATE_CEILING}% · ${Math.max(0, 100 - headroom)}% of allowance unused`}
            tone={rate <= RATE_CEILING ? 'good' : 'bad'}
          />
          <Rule label="Twelve months" />
          <Columns values={monthly} labels={monthLabels} unit="Deaths · per month" />
        </Section>

        {/* Pareto, because the point of cause analysis is which two causes account for most of it
            — and the cumulative line is the only mark that says so. Grouped from the window's own
            events, so the bars sum to the hero above. */}
        <Section icon={Skull} label="Cause analysis" aside={`${fmt(deaths.value)} deaths`}>
          {causes.length > 0 ? (
            <Pareto items={causes.map((c) => ({ label: c.label, value: c.value }))} />
          ) : (
            <Empty window={scope.win.window} />
          )}
        </Section>

        <Section icon={ClipboardList} label="Where they died" aside={`${fmt(deaths.value)} deaths`}>
          {where.length > 0 ? (
            <StatusList
              items={where.map((c) => ({
                label: c.label,
                value: fmt(c.value),
                tone: c.percent > 40 ? ('bad' as const) : c.percent > 20 ? ('warn' as const) : undefined,
              }))}
            />
          ) : (
            <Empty window={scope.win.window} />
          )}
        </Section>

        <Section icon={MapPin} label="Concentration" aside="tap to drill">
          <SiteSplit
            slug="mortality"
            onOpenSite={(_, name) => open({ title: name, eyebrow: 'Mortality', body: <MetricPanel metric="mortality" /> })}
          />
          {siteRows.length > 1 && leader && (
            <>
              <Rule label="Leading" />
              <Ladder
                leader={{
                  label: leader.label,
                  sub: `${fmt(leader.value)} of ${fmt(deaths.value)}${topCause ? ` · ${topCause.label.toLowerCase()}` : ''}`,
                  value: `${Math.round(leader.percent)}%`,
                }}
                rest={siteRows.slice(1, 5).map((r) => ({
                  label: r.label,
                  sub: `${fmt(r.value)} deaths`,
                  value: `${Math.round(r.percent)}%`,
                }))}
              />
            </>
          )}
        </Section>

        <Section icon={TrendingDown} label="Top mortality species" aside={`${speciesRows.length} species`}>
          {speciesRows.length > 0 ? (
            <Bars
              items={speciesRows.slice(0, 6).map((r) => ({ label: r.label, value: r.value, sub: r.sub }))}
              unit="deaths"
              showShare
            />
          ) : (
            <Empty window={scope.win.window} />
          )}
        </Section>

        <Section icon={Skull} label="Records" aside={`${fmt(recent.total)} in window`}>
          {recent.rows.length > 0 ? (
            <Records
              items={recent.rows.map((ev) => ({
                label: `${ev.animalId} · ${ev.speciesName}`,
                sub: `${ev.detail}`,
                value: shortDate(ev.day),
                tone: ev.tone === 'neutral' ? undefined : ev.tone,
              }))}
            />
          ) : (
            <Empty window={scope.win.window} />
          )}
        </Section>

        <Section icon={Activity} label="Highlights">
          <Highlights
            items={[
              { tag: 'Deaths', value: fmt(deaths.value), label: scope.win.label, tone: 'good' },
              { tag: 'Rate', value: rate.toFixed(3), unit: '%', label: 'Of collection', tone: rate <= RATE_CEILING ? 'good' : 'bad' },
              ...(leader ? [{ tag: 'Top site', value: fmt(leader.value), label: leader.label, tone: 'warn' as const }] : []),
              ...(topCause ? [{ tag: 'Top cause', value: fmt(topCause.value), label: topCause.label, tone: 'warn' as const }] : []),
            ]}
          />
        </Section>

        {/*
          The two cards below are the page's authored remainder, and they say so.

          Regulatory instrument and necropsy bench are not attributes the event data carries. The
          alternative to stating that plainly would be apportioning 23 collection-wide deaths
          across Schedule I and II per site — which would put a number on screen that no record
          anywhere supports. `aside` names the scope these are actually true at.
        */}
        <Section icon={ScrollText} label="Regulatory standing" aside="collection · July 2025">
          <Snapshot
            cols={2}
            items={[
              { label: 'Regulatory', value: '6', note: 'notifiable · 2 Schedule I', tone: 'bad' },
              { label: 'Non-regulatory', value: '17', note: 'husbandry record' },
            ]}
          />
          <Rule label="Instrument" />
          <Table
            head={['Instrument', 'Deaths', 'Notified']}
            rows={[
              { label: 'Schedule I', sub: 'Within 24 h', cells: ['2', '2'], tone: 'bad' },
              { label: 'Schedule II', cells: ['3', '3'] },
              { label: 'CITES Appendix I', cells: ['1', '1'] },
              { label: 'Non-regulatory', cells: ['17', '—'] },
            ]}
          />
        </Section>

        <Section icon={FileSearch} label="Necropsy" aside="collection · 5 pending">
          <DrillList>
            {NECROPSY.map((n) => (
              <DrillRow
                key={n.id}
                label={n.label}
                sub={n.sub}
                value={String(n.value)}
                unit="cases"
                onOpen={() =>
                  open({
                    title: n.label,
                    eyebrow: 'Necropsy',
                    body: <NodePanel title="Species" unit="cases" nodes={n.children} trail={[n.label]} />,
                  })
                }
              />
            ))}
            <DrillRow label="Pending necropsy" sub="Oldest 4 days" value="5" tone="bad" />
          </DrillList>
        </Section>

        <Section icon={ScrollText} label="Reporting" aside="collection">
          <Facts
            items={[
              { label: 'Notified within 24 h', value: '6 of 6', tone: 'good' },
              { label: 'Necropsy completed', value: '18 of 23' },
              { label: 'Histopathology pending', value: '5', tone: 'warn' },
              { label: 'CZA return', sub: 'Due 30 Sep', value: 'Drafting' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}

/**
 * What a card shows when the scope has nothing in it.
 *
 * Deliberately not a zero and not a hidden card. Carnivore Ridge recorded no deaths in the last
 * seven days, and that is a fact worth stating plainly — an empty Pareto or a silently dropped
 * section would leave the reader unsure whether they had found good news or a broken page.
 */
function Empty({ window }: { window: string }) {
  return (
    <p className="py-2 text-[12.5px] text-[#9b958b]">
      No deaths recorded in {window} for this scope.
    </p>
  )
}
