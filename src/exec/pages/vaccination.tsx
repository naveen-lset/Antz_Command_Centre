/** VACCINATION — a coverage drive. Waffle makes the uncovered countable. */
import { CalendarClock, Grid2x2Check, Layers, Syringe, TriangleAlert } from 'lucide-react'
import { AccentProvider, Bars, Events, Hero, Ledger, MetricGrid, Records, Section, Stack, Waffle } from '../system'

export default function Vaccination() {
  return (
    <AccentProvider value="#6d28d9">
      <Hero
        icon={Syringe}
        value="92"
        unit="%"
        label="Herd vaccination coverage"
        side={{ value: '76', label: 'doses this month' }}
        context="Target is 95% by September. Five animals are overdue and escalated."
        status="8% uncovered"
        tone="warn"
      />
      <Stack>
        <Section icon={Grid2x2Check} label="Coverage" aside="each square = 1%">
          <Waffle percent={92} />
        </Section>

        <Section icon={Layers} label="Coverage by group">
          <Bars
            unit="%"
            items={[
              { label: 'Mammals', value: 96, sub: '28 doses' },
              { label: 'Birds', value: 93, sub: '24' },
              { label: 'Amphibians', value: 90, sub: '4' },
              { label: 'Reptiles', value: 89, sub: '12' },
              { label: 'Fish', value: 84, sub: '8' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Below target" aside="5 overdue">
          <Records
            items={[
              { label: 'Star Tortoise · Herpetarium', sub: 'Herpesvirus — deferred once', value: '11 d', tone: 'bad' },
              { label: 'Nile Tilapia · Aquatic Hall 2', sub: 'Batch vaccination deferred', value: '8 d', tone: 'warn' },
              { label: 'Bengal Fox · Savanna 6', sub: 'Rabies booster', value: '4 d', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Syringe} label="Most vaccinated">
          <Ledger
            items={[
              { label: 'Blackbuck', sub: 'FMD booster', value: '18', share: 100 },
              { label: 'Indian Peafowl', sub: 'Newcastle disease', value: '14', share: 78 },
              { label: 'Sambar Deer', sub: 'FMD booster', value: '11', share: 61 },
              { label: 'Bengal Fox', sub: 'Rabies', value: '9', share: 50 },
              { label: 'Star Tortoise', sub: 'Herpesvirus', value: '6', share: 33 },
            ]}
          />
        </Section>

        <Section icon={CalendarClock} label="Upcoming drives">
          <Events
            items={[
              { when: '01 Aug', text: 'FMD booster — 12 Blackbuck · Savanna Paddock 1 · Dr. Iyer' },
              { when: '03 Aug', text: 'Newcastle — 20 Peafowl · Aviary Complex · Dr. Rao' },
              { when: '08 Aug', text: 'Rabies — 6 Bengal Fox · Savanna Paddock 6 · Dr. Mehta' },
              { when: '15 Aug', text: 'Herpesvirus — 9 Tortoise · Herpetarium · Dr. Mehta', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Layers} label="Programme">
          <MetricGrid
            cols={3}
            items={[
              { label: 'Completed', value: '76', note: 'This month' },
              { label: 'Due in 7 d', value: '18', note: 'Scheduled' },
              { label: 'Adherence', value: '87', unit: '%', note: '5 of 99 overdue' },
            ]}
          />
        </Section>
      </Stack>
    </AccentProvider>
  )
}
