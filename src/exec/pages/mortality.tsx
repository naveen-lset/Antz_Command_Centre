/**
 * MORTALITY — the review.
 *
 * Deliberately sober: no leaderboards, no praise language, no sector comparison
 * and no falling-streak counter. Twenty-three animals died; the page's job is to
 * say which, where, why, and what was done — not to grade the month.
 *
 * `Undetermined` is a cause on the ring, not a gap in it. Two of the twenty-three
 * have no confirmed cause and pretending otherwise would be the one dishonest
 * thing on the page.
 */

import {
  Activity,
  ClipboardCheck,
  ListChecks,
  MapPin,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react'
import { report } from '../report'
import {
  Band,
  Donut,
  Events,
  Facts,
  More,
  PeriodHero,
  Records,
  Rule,
  Section,
  Sites,
  Snapshot,
  Stack,
  Stamp,
  Trend,
} from '../system'

export default function Mortality() {
  return (
    <>
      <PeriodHero
        slug="mortality"
        icon={Activity}
        value="23"
        label="Deaths"
        status="−18% Month"
        tone="good"
        stats={[
          { value: '0.011', unit: '%', label: 'Rate' },
          { value: '9', label: 'Species' },
          { value: '5', label: 'Sites' },
        ]}
      />
      <Stack>
        <Section icon={Activity} label="Month" aside={<More href="#/mortality/records" />}>
          <Snapshot
            cols={4}
            items={[
              { label: 'Deaths', value: '23', note: '−5 June' },
              { label: 'Rate', value: '0.011', unit: '%' },
              { label: '7-day', value: '5', note: 'Prior 6' },
              { label: 'Avg age', value: '6.2', unit: 'y', note: '78% lifespan' },
            ]}
          />
        </Section>

        {/* Overall stated above the six sites it is the sum of. */}
        <Section icon={MapPin} label="Sites">
          <Sites slug="mortality" />
        </Section>

        {/* One ring rather than a Pareto: the 80/20 line was answering a question
            nobody asked here, and it had no room for the two undetermined deaths
            or the three-cause tail. */}
        <Section icon={ListChecks} label="Causes" aside="6">
          <Donut
            label="Deaths"
            items={[
              { label: 'Natural causes', value: 9 },
              { label: 'Disease', value: 5 },
              { label: 'Injury', value: 3 },
              { label: 'Trauma', value: 2, tone: 'bad' },
              { label: 'Undetermined', value: 2 },
              { label: 'Other · 3 causes', value: 2 },
            ]}
          />
          <Rule label="Trauma & injury" />
          <Facts
            items={[
              { label: 'Enclosure falls', sub: 'Savanna', value: '2' },
              { label: 'Fence injury', sub: 'Savanna', value: '1' },
              { label: 'Post-surgical', sub: 'Zone A', value: '1' },
              { label: 'Water quality', sub: 'Aquatic Halls · AQ-204', value: '1' },
            ]}
          />
        </Section>

        {/* The "Highest site" band that used to sit here said Aquatic Halls 48% —
            which the Sites card above now states as the first row of the full split.
            What the split cannot say is that one enclosure inside that site accounts
            for six of its eleven, so that is all this card is left holding. */}
        <Section icon={MapPin} label="Concentration" aside="AQ-204">
          <Band label="Highest species" title="Giant Prawn" sub="AQ-204 · 26 Jul" value="6" unit="deaths" tone="bad" />
          <Rule label="Ex event" />
          <Facts
            items={[
              { label: 'Aquatic Halls', sub: 'Ex AQ-204', value: '5' },
              { label: 'Site maximum', sub: 'Four other sites', value: '5' },
            ]}
          />
        </Section>

        {/* Thirty days on the report's standard window, with the six-month figures
            stated underneath rather than plotted — the long view is a list of six
            numbers, and six columns were spending a third of the page on it. */}
        <Section icon={TrendingDown} label="Trend" aside="30 d">
          {/* The week-4 spike is AQ-204 on 26 July — the same event the
              Concentration card above names. The two have to agree. */}
          <Trend
            tone="bad"
            values={[1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 4, 3, 1]}
            labels={['Week 1', 'Week 2', 'Week 3', 'Week 4']}
            unit="23 deaths · 2-day buckets"
          />
          <Rule label="Six months" />
          <Facts
            items={[
              { label: 'Feb – Apr', sub: '30 · 27 · 26', value: '83' },
              { label: 'May – Jul', sub: '29 · 25 · 23', value: '77' },
            ]}
          />
        </Section>

        <Section icon={ClipboardCheck} label="Necropsy" aside="4 open">
          <Records
            items={[
              { label: 'Giant Prawn · AQ-204', sub: 'Water panel · Partner lab', value: '3 d', tone: 'bad' },
              { label: 'Zebra Finch · ANM-33810', sub: 'Histopathology · Partner lab', value: '2 d', tone: 'warn' },
              { label: 'Chital · ANM-19042', sub: 'Fence injury · Dr. Mehta', value: '1 d', tone: 'warn' },
              { label: 'Mallard · ANM-30119', sub: 'Report drafting', value: '1 d' },
            ]}
          />
        </Section>

        <Section icon={ShieldCheck} label="Actions" aside="July">
          <Events
            items={[
              { when: '28 Jul', label: 'Filtration service · Tank 9', sub: 'High priority', tone: 'good' },
              { when: '27 Jul', label: 'Fence inspection · Zone A', sub: 'Chital', tone: 'warn' },
              { when: '25 Jul', label: 'Respiratory screening · Aviary 4', sub: 'Birds', value: '340' },
              { when: '22 Jul', label: 'Cohort review · Aquatic Halls', sub: 'Past lifespan', value: '41' },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
