/**
 * MORTALITY — a rate, a cause and a name.
 *
 * The page is built around the three things a death can be asked about, in the order
 * they are asked: how many against how many we hold (the rate, which is the only
 * figure comparable to another zoo's), why (cause analysis, which is where an
 * intervention lives), and which animal (the record, which is what a necropsy report
 * is filed against).
 *
 * The regulatory split leads the counts, because a Schedule I death is a notifiable
 * event and an aquarium fish is not.
 */

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

/** Necropsy Centre → Species → Case. The pathologist's queue, not the collection's map. */
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

export default function Mortality() {
  const { open } = useSheet()

  return (
    <>
      <ModuleHero
        icon={Activity}
        slug="mortality"
        value="23"
        label="Deaths"
        status="−18% on prior month"
        tone="good"
        stats={[
          { value: '0.011', unit: '%', label: 'Rate' },
          { value: '9', label: 'Species' },
          { value: '5', label: 'Sites' },
        ]}
      />
      <Stack>
        {/* The rate, with the denominator visible. A count of 23 means nothing without
            215,432 beside it, and a rate without its base cannot be compared to
            anyone else's. */}
        <Section icon={Percent} label="Mortality rate" aside="against 215,432 held">
          <Bullet
            label="This month"
            value="0.011%"
            percent={73}
            target={100}
            note="Ceiling 0.015% · 73% of allowance unused"
            tone="good"
          />
          <Rule label="Twelve months" />
          <Columns
            values={[34, 32, 36, 31, 33, 30, 30, 27, 26, 29, 25, 23]}
            labels={['A', 'S', 'O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J']}
            unit="Deaths · per month"
          />
        </Section>

        {/* Regulatory first. A Schedule I death is notifiable within 24 hours; an
            aquarium fish is a husbandry note. Splitting them is the difference. */}
        <Section icon={ScrollText} label="Regulatory standing" aside="23 deaths">
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

        <Section icon={ClipboardList} label="Where they died" aside="23 deaths">
          <StatusList
            items={[
              { label: 'In hospital', value: '4', tone: 'bad' },
              { label: 'In enclosure', value: '16' },
              { label: 'In quarantine', value: '2', tone: 'warn' },
              { label: 'In transit', value: '1', tone: 'warn' },
            ]}
          />
        </Section>

        {/* Necropsy Centre → Species → Case. A pathologist's queue is organised by
            bench and specimen, not by the site the animal came from. */}
        <Section icon={FileSearch} label="Necropsy" aside="5 pending">
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

        {/* Pareto, because the point of cause analysis is which two causes account for
            most of it — and the cumulative line is the only mark that says so. */}
        <Section icon={Skull} label="Cause analysis" aside="23 deaths">
          <Pareto
            items={[
              { label: 'Water quality', value: 7 },
              { label: 'Age-related', value: 5 },
              { label: 'Infection', value: 4 },
              { label: 'Trauma', value: 3 },
              { label: 'Parasitic', value: 2 },
              { label: 'Undetermined', value: 2 },
            ]}
          />
        </Section>

        <Section icon={MapPin} label="Concentration" aside="tap to drill">
          <SiteSplit
            slug="mortality"
            onOpenSite={(_, name) => open({ title: name, eyebrow: 'Mortality', body: <MetricPanel metric="mortality" /> })}
          />
          <Rule label="Leading" />
          <Ladder
            leader={{ label: 'Aquatic Halls', sub: '11 of 23 · water quality', value: '48%' }}
            rest={[
              { label: 'Aviary Complex', sub: '5 deaths', value: '22%' },
              { label: 'Savanna', sub: '3 deaths', value: '13%' },
              { label: 'Reptile House', sub: '2 deaths', value: '9%' },
              { label: 'Primate Forest', sub: '2 deaths', value: '9%' },
            ]}
          />
        </Section>

        <Section icon={TrendingDown} label="Top mortality species" aside="9 species">
          <Bars
            items={[
              { label: 'Nile Tilapia', value: 6, sub: 'Aquatic Halls' },
              { label: 'Common Carp', value: 5, sub: 'Aquatic Halls' },
              { label: 'Grey Francolin', value: 3, sub: 'Aviary Complex' },
              { label: 'Chital', value: 2, sub: 'Savanna' },
              { label: 'Rose Shrimp', value: 2, sub: 'Aquatic Halls' },
              { label: 'Five others', value: 5, sub: 'One each' },
            ]}
            unit="deaths"
            showShare
          />
        </Section>

        <Section icon={Skull} label="Records" aside="most recent">
          <Records
            items={[
              { label: 'ANM-22140 · Chital', sub: 'Savanna · Zone A · necropsy due', value: '01 Aug', tone: 'bad' },
              { label: 'ANM-50771 · Nile Tilapia', sub: 'Aquatic Halls · AQ-11 · fungal', value: '29 Jul', tone: 'bad' },
              { label: 'ANM-41902 · Grey Francolin', sub: 'Aviary Complex · aspergillosis', value: '26 Jul', tone: 'warn' },
              { label: 'ANM-31140 · Bengal Fox', sub: 'Carnivore Ridge · age-related', value: '21 Jul' },
              { label: 'ANM-50440 · Common Carp', sub: 'Aquatic Halls · AQ-14 · water quality', value: '18 Jul', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Highlights">
          <Highlights
            items={[
              { tag: 'Deaths', value: '23', label: 'This month', tone: 'good' },
              { tag: 'Rate', value: '0.011', unit: '%', label: 'Of collection', tone: 'good' },
              { tag: 'Top site', value: '11', label: 'Aquatic Halls', tone: 'warn' },
              { tag: 'Top cause', value: '7', label: 'Water quality', tone: 'warn' },
              { tag: 'Notifiable', value: '6', label: 'Regulatory', tone: 'bad' },
              { tag: 'Pending', value: '5', label: 'Necropsy', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={ScrollText} label="Reporting">
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
