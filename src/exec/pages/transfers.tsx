/**
 * TRANSFERS — the dispatch board.
 *
 * Opens on what is moving right now: live counts, then the two named consignments
 * on the road. Lanes are the signature mark and appear nowhere else in the set.
 * Numbers only — every word here names a figure, none explains one.
 */

import { ArrowLeftRight, Gauge, MapPin, Route, Sparkles, TriangleAlert, Truck } from 'lucide-react'
import {
  Band,
  Bullet,
  Facts,
  Highlights,
  Hero,
  Lanes,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  StatusList,
} from '../system'

export default function Transfers() {
  return (
    <>
      <Hero
        icon={ArrowLeftRight}
        value="28"
        label="Transfers"
        status="96% On schedule"
        tone="good"
        stats={[
          { value: '2', label: 'In transit' },
          { value: '25', label: 'Completed' },
          { value: '1', label: 'Pending' },
        ]}
      />
      <Stack>
        {/* Counts first, then the two consignments they describe — a dispatch board
            is read for the live state before it is read for the month. */}
        <Section icon={MapPin} label="Now" aside="2 in transit">
          <Snapshot
            cols={4}
            items={[
              { label: 'In transit', value: '2', tone: 'warn' },
              { label: 'Pending', value: '1', tone: 'bad' },
              { label: 'Today', value: '3', tone: 'good' },
              { label: 'Delayed', value: '2', tone: 'warn' },
            ]}
          />
          <Rule label="On road" />
          <StatusList
            items={[
              { label: 'VH-01 · 4 Blackbuck → Wetland Reserve', value: '40 min', tone: 'warn' },
              { label: 'TRF-1180 · 2 Bengal Fox · CZA', value: 'Day 4', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={ArrowLeftRight} label="Movements" aside="July">
          <Snapshot
            cols={2}
            items={[
              { label: 'Internal', value: '7', note: '6 sites' },
              { label: 'External', value: '21', note: 'Partners' },
              { label: 'Incoming', value: '12', note: '6 rescue' },
              { label: 'Outgoing', value: '9', note: '4 breeding loan' },
            ]}
          />
        </Section>

        <Section icon={Route} label="Lanes" aside="5">
          <Lanes
            routes={[
              { from: 'Jamnagar Core', to: 'Wetland Reserve', value: 9, sub: '4 runs' },
              { from: 'Sasan Rescue', to: 'Quarantine', value: 6, sub: 'Intake' },
              { from: 'Aviary Complex', to: 'Open Aviary 7', value: 6, sub: 'Internal' },
              { from: 'Jamnagar Core', to: 'Junagadh Zoo', value: 4, sub: 'Breeding loan' },
              { from: 'Marine Zone', to: 'Aquatic Halls', value: 3, sub: 'Internal' },
            ]}
          />
          <div className="mt-4">
            <Band
              label="Longest"
              title="Jamnagar Core → Junagadh Zoo"
              sub="5 h 40 m · 2 stops"
              value="214"
              unit="km"
            />
          </div>
        </Section>

        <Section icon={Truck} label="Fleet" aside="4 vehicles">
          <StatusList
            items={[
              { label: 'VH-01 · Wetland Reserve', value: 'ETA 16:40', tone: 'warn' },
              { label: 'VH-02 · Junagadh · empty', value: 'ETA 19:10', tone: 'warn' },
              { label: 'VH-03 · Jamnagar Core', value: 'Ready', tone: 'good' },
              { label: 'VH-04 · brake inspection', value: 'Day 2', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Performance">
          <Bullet label="Success" value="96%" percent={96} target={95} note="24 of 25 · Target 95%" />
          <Rule label="Operating" />
          <Facts
            items={[
              { label: 'Average time', sub: 'Door to door', value: '6.4 h' },
              { label: 'Completed today', sub: 'Internal 2 · Intake 1', value: '3' },
              { label: 'Completed month', sub: 'Of 28', value: '25' },
              { label: 'Pending clearance', sub: 'CZA · Day 4', value: '1', tone: 'bad' },
              { label: 'Delayed', sub: 'Regulatory 1 · Welfare 1', value: '2', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Delayed" aside="2 open">
          <Records
            items={[
              {
                label: 'TRF-1180 · 2 Bengal Fox',
                sub: 'Jamnagar Core → Junagadh Zoo · CZA · 30 Jul',
                value: '4 d',
                tone: 'bad',
              },
              {
                label: 'TRF-1176 · 5 Silver Barb',
                sub: 'Wetland Reserve → Aquatic Hall 3 · tank temperature',
                value: '1 d',
                tone: 'warn',
              },
            ]}
          />
        </Section>

        <Section icon={Sparkles} label="Highlights">
          <Highlights
            items={[
              { tag: 'Blocked', value: '4', unit: 'd', label: 'TRF-1180 · CZA', tone: 'bad' },
              { tag: 'Throughput', value: '28', label: 'High since March' },
              { tag: 'On schedule', value: '96%', label: '24 of 25', tone: 'good' },
              { tag: 'Fleet', value: '1', label: 'Brake inspection', tone: 'warn' },
              { tag: 'Top lane', value: '9', label: 'Jamnagar → Wetland' },
              { tag: 'Longest', value: '214', unit: 'km', label: 'Junagadh Zoo' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
