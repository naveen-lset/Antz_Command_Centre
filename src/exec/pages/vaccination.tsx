/**
 * VACCINATION — the coverage drive.
 *
 * A hundred squares open the page, eight of them empty, with the count behind
 * those eight stated directly underneath. Everything after is a figure and the
 * word that names it: group coverage, the two poles, the week's doses,
 * compliance, the overdue rail, the August campaigns.
 */

import {
  CalendarClock,
  ClipboardCheck,
  Columns3,
  Grid2x2Check,
  Layers,
  Scale,
  Syringe,
  TriangleAlert,
} from 'lucide-react'
import {
  Bars,
  Columns,
  Events,
  Facts,
  Highlights,
  Hero,
  Poles,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  Waffle,
} from '../system'

export default function Vaccination() {
  return (
    <>
      <Hero
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
        {/* The gap figures stay inside the waffle card rather than taking one of
            their own — the eight empty squares and the 190 animals are one fact. */}
        <Section icon={Grid2x2Check} label="Coverage" aside="1% per square">
          <Waffle percent={92} />
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

        <Section icon={Syringe} label="Drive" aside="July">
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

        <Section icon={Syringe} label="Highlights">
          <Highlights
            items={[
              { tag: 'Gap', value: '71', label: 'Animals to target' },
              { tag: 'Target', value: '95', unit: '%', label: 'September' },
              { tag: 'Clinic days', value: '3', label: 'To close' },
              { tag: 'Weakest', value: '71', unit: '%', label: 'Star Tortoise', tone: 'bad' },
              { tag: 'Cold chain', value: '214', label: 'Days clear', tone: 'good' },
              { tag: 'On time', value: '91', unit: '%', label: 'Exact due date' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
