/**
 * ALERTS — the signal wall.
 *
 * Feed-led: severity first, then the live rail, then where the signals came from
 * and which zones raised them. Response rates and SLA close the page. Every line
 * is a name and a number — the feed states what fired, never what it means.
 */

import { BellRing, Gauge, Grid3x3, Radio, ShieldCheck, TriangleAlert } from 'lucide-react'
import {
  Bars,
  Dial,
  Events,
  Highlights,
  Hero,
  MeterGroup,
  Section,
  Stack,
  StatusList,
  Tray,
} from '../system'

export default function Alerts() {
  return (
    <>
      <Hero
        icon={BellRing}
        value="6"
        label="Critical alerts"
        status="36 Open"
        tone="bad"
        stats={[
          { value: '36', label: 'Open' },
          { value: '9', label: 'High' },
          { value: '96', unit: '%', label: 'SLA' },
        ]}
      />
      <Stack>
        <Section icon={TriangleAlert} label="Severity" aside="36 open">
          <StatusList
            items={[
              { label: 'Critical · immediate', value: '6', tone: 'bad' },
              { label: 'High · 4 h', value: '9', tone: 'warn' },
              { label: 'Medium · 24 h', value: '14' },
              { label: 'Low · backlog', value: '7' },
            ]}
          />
        </Section>

        <Section icon={BellRing} label="Feed" aside="today">
          <Events
            items={[
              { when: '13:48', label: 'Ammonia · Tank 9', sub: 'Filtration', tone: 'bad' },
              { when: '12:30', label: 'Humidity · Aviary 4', sub: 'In range', tone: 'good' },
              { when: '11:12', label: 'Perimeter gate · Zone A', sub: 'Unsecured', value: '6 min', tone: 'warn' },
              { when: '09:40', label: 'Vitals · ANM-40218', sub: 'Escalated', value: '4 h', tone: 'bad' },
              { when: '07:05', label: 'Rain warning · Jamnagar', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Radio} label="Sources" aside="6 critical">
          <Bars
            items={[
              { label: 'Medical', value: 11, sub: '2 critical' },
              { label: 'IoT sensors', value: 9, sub: '1 critical' },
              { label: 'Infrastructure', value: 9, sub: '2 critical' },
              { label: 'Weather', value: 5, sub: '1 critical' },
              { label: 'Animal escapes', value: 2, sub: 'Contained' },
            ]}
          />
        </Section>

        {/* 0 rather than "OK" — the tray is a fault count, so a clear zone has to
            sit on the same scale as the 1s and the 2. */}
        <Section icon={Grid3x3} label="Sensors" aside="4 faults">
          <Tray
            cols={4}
            cells={[
              { value: '0', label: 'Savanna' },
              { value: '0', label: 'Wetland' },
              { value: '1', label: 'Aviary', tone: 'warn' },
              { value: '2', label: 'Aquatic', tone: 'bad' },
              { value: '0', label: 'Herpetarium' },
              { value: '0', label: 'Insectarium' },
              { value: '1', label: 'Quarantine', tone: 'warn' },
              { value: '0', label: 'Perimeter' },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Response">
          <MeterGroup
            items={[
              { label: 'Acknowledged · 15 min', value: '92%', percent: 92 },
              { label: 'Auto · sensor', value: '41%', percent: 41 },
              { label: 'Manual', value: '59%', percent: 59 },
            ]}
          />
        </Section>

        {/* SLA is pulled out of the response meters: it is the compliance number,
            not one rate among three. */}
        <Section icon={ShieldCheck} label="Resolved" aside="this month">
          <Dial percent={96} value="96" unit="%" label="Within SLA" benchmarkLabel="128 resolved · 12 min average" />
        </Section>

        <Section icon={BellRing} label="Highlights">
          <Highlights
            items={[
              { tag: 'Critical', value: '6', label: 'Open', tone: 'bad' },
              { tag: 'Queue', value: '36', label: 'All severities' },
              { tag: 'Top source', value: '11', label: 'Medical' },
              { tag: 'Sensors', value: '4', label: 'Faults · 3 zones', tone: 'warn' },
              { tag: 'SLA', value: '96', unit: '%', label: 'Resolved', tone: 'good' },
              { tag: 'Response', value: '92', unit: '%', label: 'Under 15 min' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
