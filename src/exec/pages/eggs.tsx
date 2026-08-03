/** EGGS — the incubator floor. Tray grid mirrors the physical thing. */
import { Columns3, Egg, Gauge, Grid3x3, Thermometer } from 'lucide-react'
import { Columns, MeterGroup, Hero, Records, Section, Stack, StatusList, Tray } from '../system'

export default function Eggs() {
  return (
    <>
      <Hero
        icon={Egg}
        value="21"
        label="Eggs incubating"
        side={{ value: '89%', label: 'hatch rate' }}
        context="Across 6 of 8 active incubators · 142 collected this month."
        status="On track"
        tone="good"
      />
      <Stack>
        <Section icon={Grid3x3} label="Incubator trays" aside="days to hatch">
          <Tray
            cols={4}
            cells={[
              { value: '1', label: 'INC-6 Finch', tone: 'warn' },
              { value: '3', label: 'INC-2 Francolin' },
              { value: '6', label: 'INC-3 Peafowl' },
              { value: '13', label: 'INC-8 Emu' },
              { value: '—', label: 'INC-1 idle' },
              { value: '9', label: 'INC-4 Mallard' },
              { value: '4', label: 'INC-5 Peafowl' },
              { value: '—', label: 'INC-7 idle' },
            ]}
          />
        </Section>

        <Section icon={Thermometer} label="Conditions" aside="24 h compliance">
          <MeterGroup
            items={[
              { label: 'Temperature within ±0.2 °C', value: '99.4%', percent: 99 },
              { label: 'Humidity within band', value: '97.1%', percent: 97 },
              { label: 'Turn schedule met', value: '100%', percent: 100 },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Incubator status">
          <StatusList
            items={[
              { label: 'Active incubators', value: '6 of 8', tone: 'good' },
              { label: 'Uptime this month', value: '98.2%', tone: 'good' },
              { label: 'Hatching within 48 h', value: '2 trays', tone: 'warn' },
              { label: 'Candling due today', value: '1 batch', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Columns3} label="Set against hatched" aside="6 months">
          <Columns values={[78, 71, 84, 80, 88, 96]} labels={['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']} unit="hatched" />
        </Section>

        <Section icon={Egg} label="Candling results">
          <Records
            items={[
              { label: 'Batch EG-2211 · Grey Francolin', sub: '4 of 22 infertile — discarded', value: '08:45', tone: 'warn' },
              { label: 'Batch EG-2208 · Indian Peafowl', sub: 'All 21 viable at day 22', value: 'Yest.', tone: 'good' },
              { label: 'Batch EG-2204 · Mallard', sub: '5 discarded after day-10 check', value: '28 Jul', tone: 'bad' },
              { label: 'Batch EG-2201 · Zebra Finch', sub: '14 set, all viable', value: '27 Jul', tone: 'good' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
