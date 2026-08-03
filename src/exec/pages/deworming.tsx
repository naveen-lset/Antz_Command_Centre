/** DEWORMING — a rotation schedule. Paddock grid + pre/post efficacy. */
import { CalendarClock, Gauge, Grid3x3, Pill, TriangleAlert } from 'lucide-react'
import { Dumbbell, Events, Hero, MeterGroup, Records, Section, Stack, Tray } from '../system'

export default function Deworming() {
  return (
    <>
      <Hero
        icon={Pill}
        value="63"
        label="Treatments this month"
        side={{ value: '4', label: 'overdue' }}
        context="89% of scheduled animals treated this cycle · rotation A through C."
        status="94% compliance"
        tone="good"
      />
      <Stack>
        <Section icon={Grid3x3} label="Paddock rotation" aside="drug class">
          <Tray
            cols={4}
            cells={[
              { value: 'A', label: 'Savanna 1', tone: 'good' },
              { value: 'A', label: 'Savanna 3', tone: 'good' },
              { value: 'B', label: 'Aviary 4', tone: 'good' },
              { value: 'B', label: 'Aviary 7', tone: 'warn' },
              { value: 'C', label: 'Herpetarium', tone: 'bad' },
              { value: 'A', label: 'Wetland', tone: 'good' },
              { value: 'C', label: 'Aquatic 2', tone: 'warn' },
              { value: 'B', label: 'Zone A', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Pre against post treatment" aside="faecal egg count">
          <Dumbbell
            legend={['Pre EPG', 'Post EPG']}
            unit="epg"
            items={[
              { label: 'Blackbuck herd', a: 420, b: 40 },
              { label: 'Sambar Deer', a: 380, b: 55 },
              { label: 'Nilgai', a: 310, b: 30 },
              { label: 'Indian Peafowl', a: 260, b: 90 },
              { label: 'Chital', a: 240, b: 120 },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Efficacy">
          <MeterGroup
            items={[
              { label: 'Treatment coverage', value: '89%', percent: 89 },
              { label: 'Egg count reduction', value: '84%', percent: 84 },
              { label: 'Schedule compliance', value: '94%', percent: 94 },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Overdue" aside="4 herds">
          <Records
            items={[
              { label: 'Herpetarium · 8 reptiles', sub: 'Rotation C — missed 28 Jul slot', value: '5 d', tone: 'bad' },
              { label: 'Open Aviary 7 · 11 birds', sub: 'Rotation B — keeper unavailable', value: '3 d', tone: 'warn' },
              { label: 'Aquatic Hall 2 · 4 batches', sub: 'Deferred pending water treatment', value: '2 d', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={CalendarClock} label="Next cycle">
          <Events
            items={[
              { when: '02 Aug', text: 'Rotation A — 14 mammals · Savanna Paddocks · Dr. Iyer' },
              { when: '06 Aug', text: 'Rotation B — 11 birds · Open Aviaries · Dr. Rao' },
              { when: '12 Aug', text: 'Rotation C — 8 reptiles · Herpetarium · Dr. Mehta', tone: 'warn' },
              { when: '19 Aug', text: 'Faecal recheck — 20 animals · lab-linked · Dr. Shah' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
