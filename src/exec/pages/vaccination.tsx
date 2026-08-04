/**
 * VACCINATION — the coverage drive.
 *
 * The rate opens the page as a ring with its own fraction inside it. A hundred
 * squares used to do this job and did it badly: they said "92%" in a form that
 * took eight seconds to count, and never said 92% of what. The ring says 2,184 of
 * 2,374 without being counted at all.
 *
 * Everything after is a figure and the word that names it: group coverage, the two
 * poles, the week's doses, compliance, the overdue rail, the August campaigns.
 */

import {
  CalendarClock,
  ClipboardCheck,
  Columns3,
  Grid2x2Check,
  Layers,
  MapPin,
  Scale,
  Syringe,
  TriangleAlert,
} from 'lucide-react'
import { report } from '../report'
import {
  Bars,
  Columns,
  Events,
  Facts,
  More,
  PeriodHero,
  Poles,
  Records,
  Ring,
  Rule,
  Section,
  Sites,
  Snapshot,
  Stack,
  Stamp,
} from '../system'

export default function Vaccination() {
  return (
    <>
      <PeriodHero
        slug="vaccination"
        icon={Syringe}
        value="92"
        unit="%"
        label="Herd coverage"
        status="5 Overdue"
        tone="warn"
        stats={[
          { value: '2,184', label: 'Vaccinated' },
          { value: '2,374', label: 'On protocol' },
          { value: '95', unit: '%', label: 'Target' },
        ]}
      />
      <Stack>
        {/* The gap figures stay inside the coverage card rather than taking one of
            their own — the rate and the 190 animals behind it are one fact. */}
        <Section icon={Grid2x2Check} label="Coverage" aside="on protocol">
          <Ring percent={92} label="Vaccinated" value="2,184" of="2,374" note="Target 95% by September" />
          <Rule label="Gap" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Uncovered', value: '190', note: 'Animals' },
              { label: 'In tolerance', value: '185' },
              { label: 'Overdue', value: '5', tone: 'bad' },
            ]}
          />
        </Section>

        {/* Overall stated above the six sites it is the sum of. */}
        <Section icon={MapPin} label="Sites">
          <Sites slug="vaccination" />
        </Section>

        <Section icon={Syringe} label="Drive" aside={<More href="#/vaccination/records" />}>
          <Snapshot
            cols={4}
            items={[
              { label: 'Doses', value: '76', note: 'Month' },
              { label: 'Due today', value: '12', note: '3 clinics' },
              { label: 'Booster due', value: '23', note: '30 d' },
              { label: 'Overdue', value: '5', note: 'Escalated', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Layers} label="Taxonomy" aside="5 classes">
          <Bars
            unit="%"
            items={[
              { label: 'Mammals', value: 96, sub: '712' },
              { label: 'Birds', value: 93, sub: '884' },
              { label: 'Amphibians', value: 90, sub: '96' },
              { label: 'Reptiles', value: 89, sub: '318' },
              { label: 'Fish', value: 84, sub: '364 · batch' },
            ]}
          />
        </Section>

        <Section icon={Scale} label="Extremes" aside="species">
          <Poles
            caption={['Most', 'Least']}
            high={{ value: '100%', label: 'Blackbuck', sub: '214 of 214 · FMD' }}
            low={{ value: '71%', label: 'Star Tortoise', sub: '34 of 48 · 2 deferrals' }}
            lowTone="warn"
          />
        </Section>

        <Section icon={Columns3} label="Daily" aside="7 d">
          <Columns
            values={[3, 5, 4, 2, 6, 4, 1]}
            labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            highlight={4}
            unit="doses"
          />
        </Section>

        <Section icon={ClipboardCheck} label="Compliance">
          <Facts
            size="lg"
            items={[
              { label: 'Schedule adherence', sub: '13 of 99 · 5 past grace', value: '87%', tone: 'warn' },
              { label: 'On due date', sub: '72 h tolerance', value: '91%' },
              { label: 'Cold chain', sub: '214 d', value: '0', tone: 'good' },
              { label: 'Adverse reactions', sub: 'Mild · same day', value: '2' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Overdue" aside="5 animals">
          <Records
            items={[
              {
                label: 'Star Tortoise · 3',
                sub: 'Herpesvirus · Herpetarium · Dr. Mehta',
                value: '11 d',
                tone: 'bad',
              },
              { label: 'Nile Tilapia · AQ-118', sub: 'Batch · fungal treatment', value: '8 d', tone: 'warn' },
              { label: 'Bengal Fox · ANM-40218', sub: 'Rabies · isolation', value: '4 d', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={CalendarClock} label="Campaigns" aside="5, August">
          <Events
            items={[
              { when: '04 Aug', label: 'FMD · Blackbuck', sub: 'Savanna Paddock 1 · Dr. Iyer', value: '12' },
              { when: '06 Aug', label: 'Newcastle · Indian Peafowl', sub: 'Aviary Complex · Dr. Rao', value: '20' },
              { when: '11 Aug', label: 'Rabies · Bengal Fox', sub: 'Savanna Paddock 6 · Dr. Mehta', value: '6' },
              {
                when: '15 Aug',
                label: 'Herpesvirus · Star Tortoise',
                sub: 'Herpetarium · attempt 3',
                value: '9',
                tone: 'warn',
              },
              { when: '22 Aug', label: 'Batch · 4 fish tanks', sub: 'Aquatic Halls · Dr. Shah', value: '4' },
            ]}
          />
        </Section>

      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
