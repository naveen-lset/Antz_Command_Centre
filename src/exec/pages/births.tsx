/** BIRTHS — a nursery. Forward-looking: what's due before what happened. */
import { Baby, CalendarClock, ClipboardCheck, Columns3, Sparkles, Users } from 'lucide-react'
import { AccentProvider, Columns, Events, Hero, Ledger, MetricGrid, Section, Stack } from '../system'

export default function Births() {
  return (
    <AccentProvider value="#e8590c">
      <Hero
        icon={Sparkles}
        value="45"
        label="Births this month"
        side={{ value: '38', label: 'due in 30 d' }}
        context="July 2026 · 93% delivery success across 24 species."
        status="+12% vs June"
        tone="good"
      />
      <Stack>
        <Section icon={CalendarClock} label="Expected births" aside="next 30 days">
          <Events
            items={[
              { when: '02 Aug', text: 'Blackbuck — 3 expected · Savanna Paddock 1 · Dr. Mehta', tone: 'good' },
              { when: '07 Aug', text: 'Sambar Deer — 2 expected · Zone A · neonatal kit prepared' },
              { when: '14 Aug', text: 'Nilgai — 5 expected · Wetland Reserve · Dr. Rao' },
              { when: '21 Aug', text: 'Bengal Fox — 4 expected · Savanna Paddock 6 · den monitored' },
            ]}
          />
        </Section>

        <Section icon={Columns3} label="Births per week" aside="last 6 weeks">
          <Columns values={[8, 6, 9, 7, 6, 9]} labels={['W26', 'W27', 'W28', 'W29', 'W30', 'W31']} unit="births" />
        </Section>

        <Section icon={Users} label="By species" aside="24 species">
          <Ledger
            items={[
              { label: 'Zebra Finch', sub: '18 hatchlings · Open Aviary 4', value: '18', share: 100 },
              { label: 'Blackbuck', sub: 'Dam Ambika · Savanna 3', value: '7', share: 39 },
              { label: 'Nilgai', sub: 'Wetland Reserve · 4 dams', value: '6', share: 33 },
              { label: 'Indian Peafowl', sub: 'Aviary Complex', value: '5', share: 28 },
              { label: 'Sambar Deer', sub: 'Zone A · neonatal watch', value: '4', share: 22 },
            ]}
          />
        </Section>

        <Section icon={ClipboardCheck} label="Delivery outcomes">
          <MetricGrid
            cols={3}
            items={[
              { label: 'Successful', value: '42', note: '93% of births' },
              { label: 'Still birth', value: '3', note: '−2 vs June' },
              { label: 'Neonatal survival', value: '88', unit: '%', note: 'First 30 days' },
            ]}
          />
        </Section>

        <Section icon={Baby} label="Overnight log">
          <Events
            items={[
              { when: '13:40', text: '2 Blackbuck calves, Savanna Paddock 3, both healthy', tone: 'good' },
              { when: '11:18', text: '1 Sambar Deer fawn, Zone A, under neonatal watch', tone: 'warn' },
              { when: '09:52', text: '18 Zebra Finch hatchlings, Open Aviary 4', tone: 'good' },
              { when: 'Yest.', text: '4 Nilgai calves, Wetland Reserve, all thriving', tone: 'good' },
              { when: '28 Jul', text: '1 Chital still birth, postmortem completed, no herd risk', tone: 'bad' },
            ]}
          />
        </Section>
      </Stack>
    </AccentProvider>
  )
}
