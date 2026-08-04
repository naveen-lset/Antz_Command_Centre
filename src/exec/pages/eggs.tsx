/**
 * EGGS & INCUBATION — the machine room.
 *
 * The only page whose first block is a picture of a physical thing: eight trays,
 * laid out as they stand on the floor. Everything after it is plant data — a
 * pipeline, rates, stability meters and a unit-by-unit service table.
 */

import {
  CalendarClock,
  Egg,
  EggOff,
  Gauge,
  Grid3x3,
  MapPin,
  Search,
  Thermometer,
  Wrench,
} from 'lucide-react'
import { report } from '../report'
import {
  Band,
  Facts,
  Funnel,
  MeterGroup,
  More,
  PeriodHero,
  Records,
  Scoreboard,
  Section,
  Sites,
  Stack,
  Stamp,
  Table,
  Tray,
} from '../system'

export default function Eggs() {
  return (
    <>
      <PeriodHero
        slug="eggs"
        icon={Egg}
        value="142"
        label="Eggs"
        status="89% Hatch"
        tone="good"
        stats={[
          { value: '21', label: 'Incubating' },
          { value: '6', label: 'Active' },
          { value: '2', label: 'Idle' },
        ]}
      />
      <Stack>
        {/* The tray value is days to hatch, not an egg count — the aside carries
            that unit once so no cell has to spend its label on it. */}
        <Section icon={Grid3x3} label="Floor" aside="Days to hatch">
          <Tray
            cols={4}
            cells={[
              { value: '—', label: 'INC-1 · Idle' },
              { value: '3', label: 'INC-2 · Francolin' },
              { value: '6', label: 'INC-3 · Peafowl' },
              { value: '9', label: 'INC-4 · Mallard' },
              { value: '4', label: 'INC-5 · Peafowl' },
              { value: '1', label: 'INC-6 · Finch', tone: 'warn' },
              { value: '—', label: 'INC-7 · 12 d down', tone: 'bad' },
              { value: '13', label: 'INC-8 · Emu' },
            ]}
          />
        </Section>

        {/* Overall stated above the six sites it is the sum of. */}
        <Section icon={MapPin} label="Sites">
          <Sites slug="eggs" />
        </Section>

        <Section icon={Egg} label="Pipeline" aside={<More href="#/eggs/records" />}>
          <Funnel
            stages={[
              { label: 'Collected', value: 142 },
              { label: 'Fertile', value: 129, sub: '13 discarded' },
              { label: 'Hatched', value: 96 },
              { label: 'Incubating', value: 21 },
              { label: 'Failed', value: 12, sub: 'Post-mortem' },
            ]}
          />
        </Section>

        {/* The discard stage got its own module — four reasons owned by three
            different departments could not be read off one funnel sub-label. */}
        <Section icon={EggOff} label="Discarded" aside={<More href="#/discarded" />}>
          <Facts
            items={[
              { label: 'Discarded', sub: '9% of collected · June 11%', value: '13', tone: 'warn' },
              { label: 'Infertile', sub: 'Breeding · pairing review', value: '5' },
              { label: 'Thin shelled', sub: 'Nutrition', value: '3' },
              { label: 'Rotten · Red ring', sub: 'Handling', value: '5', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Rates">
          <Scoreboard
            items={[
              { value: '89', unit: '%', label: 'Hatch, 96 of 108' },
              { value: '91', unit: '%', label: 'Fertility, 129 of 142' },
              { value: '12', label: 'Failed' },
              { value: '21', label: 'Expected' },
            ]}
          />
        </Section>

        <Section icon={CalendarClock} label="Expected" aside="13 d">
          <Facts
            items={[
              { label: 'Zebra Finch · INC-6', sub: '04 Aug · Day 14 of 14', value: '5', tone: 'warn' },
              { label: 'Grey Francolin · INC-2', sub: '06 Aug', value: '4' },
              { label: 'Indian Peafowl · INC-5', sub: '07 Aug', value: '3' },
              { label: 'Indian Peafowl · INC-3', sub: '09 Aug', value: '2' },
              { label: 'Mallard · INC-4', sub: '12 Aug · Candling today', value: '5' },
              { label: 'Emu · INC-8', sub: '16 Aug', value: '2' },
            ]}
          />
        </Section>

        <Section icon={Thermometer} label="Stability" aside="24 h">
          <MeterGroup
            items={[
              { label: 'Temperature · ±0.2 °C', value: '99.4%', percent: 99 },
              { label: 'Humidity · Band', value: '97.1%', percent: 97 },
              { label: 'Turn schedule', value: '100%', percent: 100 },
            ]}
          />
        </Section>

        <Section icon={Wrench} label="Fleet" aside="8 units · 98.2%">
          <Band label="Best" title="INC-3" sub="99.1% uptime · 12 mo" value="96" unit="%" />
          <div className="mt-4">
            <Table
              head={['Unit', 'Uptime', 'Hatch']}
              rows={[
                { label: 'INC-3', sub: 'Indian Peafowl · 2 eggs', cells: ['99.1%', '96%'] },
                { label: 'INC-8', sub: 'Emu · 2 eggs', cells: ['99.0%', '93%'] },
                { label: 'INC-2', sub: 'Grey Francolin · 4 eggs', cells: ['99.0%', '92%'] },
                { label: 'INC-1', sub: 'Idle', cells: ['98.9%', '91%'] },
                { label: 'INC-5', sub: 'Indian Peafowl · 3 eggs', cells: ['98.6%', '90%'] },
                { label: 'INC-4', sub: 'Mallard · 5 eggs', cells: ['97.4%', '88%'] },
                { label: 'INC-6', sub: 'Zebra Finch · 5 eggs', cells: ['96.2%', '84%'], tone: 'warn' },
                { label: 'INC-7', sub: 'Out of service · 12 d', cells: ['88.0%', '86%'], tone: 'bad' },
              ]}
            />
          </div>
        </Section>

        <Section icon={Search} label="Candling" aside="1 due">
          <Records
            items={[
              { label: 'Batch EG-2214 · Mallard', sub: 'INC-4 · 5 eggs · Day 10', value: 'Due', tone: 'warn' },
              { label: 'Batch EG-2211 · Grey Francolin', sub: '4 of 22 infertile', value: '08:45', tone: 'warn' },
              { label: 'Batch EG-2208 · Indian Peafowl', sub: '21 of 21 viable · Day 22', value: 'Yest.', tone: 'good' },
              { label: 'Batch EG-2204 · Mallard', sub: '5 discarded · Day 10', value: '28 Jul', tone: 'bad' },
              { label: 'Batch EG-2201 · Zebra Finch', sub: '14 of 14 viable', value: '27 Jul', tone: 'good' },
            ]}
          />
        </Section>

      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
