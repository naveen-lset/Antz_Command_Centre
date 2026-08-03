/** TRANSFERS — movement. Directional lanes are the signature. */
import { ArrowLeftRight, CalendarClock, ClipboardCheck, Route, Truck } from 'lucide-react'
import { AccentProvider, Dumbbell, Events, Hero, Lanes, Records, Section, Stack, StatusList } from '../system'

export default function Transfers() {
  return (
    <AccentProvider value="#2563eb">
      <Hero
        icon={ArrowLeftRight}
        value="28"
        label="Transfers this month"
        side={{ value: '2', label: 'in transit' }}
        context="12 inbound · 9 outbound · 7 internal. Both vehicles on schedule."
        status="98% completion rate"
        tone="good"
      />
      <Stack>
        <Section icon={Route} label="Movement lanes" aside="head-count">
          <Lanes
            unit=""
            routes={[
              { from: 'Jamnagar Core', to: 'Wetland Reserve', value: 9, sub: '4 in transit' },
              { from: 'Sasan Rescue', to: 'Quarantine', value: 6, sub: 'received' },
              { from: 'Aviary Complex', to: 'Open Aviary 7', value: 6, sub: 'complete' },
              { from: 'Jamnagar Core', to: 'Junagadh Zoo', value: 4, sub: 'complete' },
              { from: 'Marine Zone', to: 'Aquatic Halls', value: 3, sub: 'complete' },
            ]}
          />
        </Section>

        <Section icon={Truck} label="In transit now">
          <StatusList
            items={[
              { label: 'Vehicles on the road', value: '2', tone: 'warn' },
              { label: 'Next arrival · Wetland Reserve', value: '16:40', tone: 'warn' },
              { label: 'Awaiting CZA clearance', value: '1', tone: 'bad' },
              { label: 'Completed this month', value: '25', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={ArrowLeftRight} label="Inbound against outbound" aside="6 months">
          <Dumbbell
            legend={['Inbound', 'Outbound']}
            items={[
              { label: 'July', a: 12, b: 16 },
              { label: 'June', a: 10, b: 13 },
              { label: 'May', a: 14, b: 11 },
              { label: 'April', a: 9, b: 12 },
              { label: 'March', a: 11, b: 8 },
            ]}
          />
        </Section>

        <Section icon={CalendarClock} label="Scheduled arrivals">
          <Events
            items={[
              { when: 'Today', text: '4 Blackbuck arriving Wetland Reserve, ETA 16:40', tone: 'warn' },
              { when: '02 Aug', text: '3 Star Tortoise from Sasan Rescue Centre' },
              { when: '06 Aug', text: '8 Zebra Finch outbound to Junagadh Zoo' },
              { when: '12 Aug', text: '2 Bengal Fox — held pending CZA clearance', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={ClipboardCheck} label="Manifests" aside="last 7 days">
          <Records
            items={[
              { label: 'TRF-1184 · 6 Indian Peafowl', sub: 'Aviary Complex → Open Aviary 7', value: 'Complete', tone: 'good' },
              { label: 'TRF-1183 · 3 Star Tortoise', sub: 'Sasan Rescue → Quarantine', value: 'Complete', tone: 'good' },
              { label: 'TRF-1182 · 4 Blackbuck', sub: 'Jamnagar Core → Wetland Reserve', value: 'In transit', tone: 'warn' },
              { label: 'TRF-1180 · 2 Bengal Fox', sub: 'Awaiting CZA clearance — 4 days', value: 'Pending', tone: 'bad' },
            ]}
          />
        </Section>
      </Stack>
    </AccentProvider>
  )
}
