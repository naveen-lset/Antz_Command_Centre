/** ALERTS — a signal wall. Feed-led: the newest line matters most. */
import { BellRing, Gauge, Grid3x3, Radio, TriangleAlert } from 'lucide-react'
import { Bars, Events, Hero, MeterGroup, Section, Stack, StatusList, Tray } from '../system'

export default function Alerts() {
  return (
    <>
      <Hero
        icon={BellRing}
        value="6"
        label="Critical alerts open"
        side={{ value: '36', label: 'total open' }}
        context="Average response to a critical alert is 12 minutes. 128 resolved this month."
        status="Needs review"
        tone="bad"
      />
      <Stack>
        <Section icon={TriangleAlert} label="By severity" aside="36 open">
          <StatusList
            items={[
              { label: 'Critical · immediate action', value: '6', tone: 'bad' },
              { label: 'High · within 4 h', value: '9', tone: 'warn' },
              { label: 'Medium · within 24 h', value: '14' },
              { label: 'Low · backlog', value: '7' },
            ]}
          />
        </Section>

        <Section icon={BellRing} label="Live feed" aside="newest first">
          <Events
            items={[
              { when: '13:48', text: 'Tank 9 ammonia above threshold — filtration service raised', tone: 'bad' },
              { when: '12:30', text: 'Aviary 4 humidity sensor back within range', tone: 'good' },
              { when: '11:12', text: 'Zone A perimeter gate left unsecured for 6 minutes', tone: 'warn' },
              { when: '09:40', text: 'ANM-40218 vitals escalated, 4-hourly checks started', tone: 'bad' },
              { when: '07:05', text: 'Heavy rain warning issued for the Jamnagar district', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Radio} label="By source">
          <Bars
            items={[
              { label: 'Medical', value: 11, sub: '2 critical' },
              { label: 'IoT sensors', value: 9, sub: '1 critical' },
              { label: 'Infrastructure', value: 9, sub: '2 critical' },
              { label: 'Weather', value: 5, sub: '1 critical' },
              { label: 'Animal escapes', value: 2, sub: 'contained' },
            ]}
          />
        </Section>

        <Section icon={Grid3x3} label="Sensor status" aside="by zone">
          <Tray
            cols={4}
            cells={[
              { value: 'OK', label: 'Savanna' },
              { value: 'OK', label: 'Wetland' },
              { value: '1', label: 'Aviary', tone: 'warn' },
              { value: '2', label: 'Aquatic', tone: 'bad' },
              { value: 'OK', label: 'Herpetarium' },
              { value: 'OK', label: 'Insectarium' },
              { value: '1', label: 'Quarantine', tone: 'warn' },
              { value: 'OK', label: 'Perimeter' },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Response performance">
          <MeterGroup
            items={[
              { label: 'Resolved within SLA', value: '96%', percent: 96 },
              { label: 'Auto-resolved by sensor', value: '41%', percent: 41 },
              { label: 'Critical acknowledged under 15 min', value: '92%', percent: 92 },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
