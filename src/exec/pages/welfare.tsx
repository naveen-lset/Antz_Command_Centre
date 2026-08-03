/**
 * WELFARE — the assessment.
 *
 * The one centred hero in the set: a verdict reads from the middle. Radar opens
 * with the five domains, Poles give the zone spread, the matrix locates the dip,
 * then completion, findings and the audit rail. Numbers only — no prose.
 */

import { CalendarClock, ClipboardCheck, Gauge, Grid3x3, Scale, ShieldCheck, TriangleAlert } from 'lucide-react'
import {
  Events,
  Highlights,
  Hero,
  Matrix,
  MeterGroup,
  Poles,
  Radar,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
} from '../system'

export default function Welfare() {
  return (
    <>
      <Hero
        icon={ShieldCheck}
        align="center"
        value="4.6"
        unit="/ 5"
        label="Welfare"
        status="Above benchmark"
        tone="good"
        stats={[
          { value: '4.4', label: 'Last quarter' },
          { value: '4.2', label: 'Benchmark' },
        ]}
      />
      <Stack>
        <Section icon={ClipboardCheck} label="Domains" aside="of 100">
          <Radar
            axes={[
              { label: 'Nutrition', score: 96 },
              { label: 'Environment', score: 88 },
              { label: 'Health', score: 94 },
              { label: 'Behaviour', score: 90 },
              { label: 'Mental state', score: 84 },
            ]}
          />
        </Section>

        <Section icon={Scale} label="Zones" aside="6 zones">
          <Poles
            caption={['Best', 'Lowest']}
            high={{ value: '4.9', label: 'Savanna Paddocks', sub: '96 mean' }}
            low={{ value: '3.7', label: 'Quarantine', sub: '79 mean · Mental state 68' }}
            lowTone="bad"
          />
        </Section>

        <Section icon={Grid3x3} label="Grid" aside="6 × 5">
          <Matrix
            rows={['Savanna', 'Aviaries', 'Aquatic', 'Herpetarium', 'Insectarium', 'Quarantine']}
            cols={['Nutr', 'Envt', 'Hlth', 'Behv', 'Mind']}
            values={[
              [98, 96, 97, 95, 94],
              [96, 88, 95, 92, 88],
              [95, 78, 92, 84, 76],
              [96, 90, 94, 88, 86],
              [95, 86, 93, 88, 85],
              [92, 72, 90, 74, 68],
            ]}
          />
          {/* The heat grid shows where the dip is but never states it — these are the
              column minima, all three from the same row. */}
          <Rule label="Floors" />
          <Snapshot
            cols={3}
            items={[
              { value: '92', label: 'Nutrition', note: 'Quarantine' },
              { value: '72', label: 'Environment', note: 'Quarantine', tone: 'bad' },
              { value: '68', label: 'Mental state', note: 'Quarantine', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Completion" aside="quarter">
          <MeterGroup
            items={[
              { label: 'Audits', value: '84 of 96', percent: 88 },
              { label: 'Enrichment', value: '88%', percent: 88 },
              { label: 'SLA closure', value: '91%', percent: 91 },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Findings" aside="7 open">
          <Records
            items={[
              { label: 'Quarantine Ward B', sub: 'Mental state 68 · Space per animal', value: '3 d', tone: 'bad' },
              { label: 'Aquatic Hall 2', sub: 'Environment 78 · Ammonia', value: '1 d', tone: 'bad' },
              { label: 'Open Aviary 7', sub: 'Behaviour 86 · Perch variety', value: '6 d', tone: 'warn' },
              { label: 'Insectarium', sub: 'Environment 86 · Humidity', value: '8 d', tone: 'warn' },
              { label: 'Savanna Paddock 6', sub: 'Environment 92 · Shade cover', value: '12 d' },
            ]}
          />
        </Section>

        <Section icon={CalendarClock} label="Audits" aside="12 due">
          <Events
            items={[
              { when: '05 Aug', label: 'Quarantine Ward B', sub: 'Mental state', value: '68', tone: 'bad' },
              { when: '06 Aug', label: 'Aquatic Hall 2', sub: 'Environment', value: '78' },
              { when: '09 Aug', label: 'Open Aviary 7', sub: 'Behaviour', value: '86', tone: 'warn' },
              { when: '14 Aug', label: 'Enrichment review', sub: 'Enclosures', value: '96' },
              { when: '28 Aug', label: 'Unaudited block', sub: 'Enclosures · 3 d', value: '12' },
            ]}
          />
        </Section>

        <Section icon={ShieldCheck} label="Highlights">
          <Highlights
            items={[
              { tag: 'Verdict', value: '4.6', unit: '/ 5', label: 'Above 4.2' },
              { tag: 'Nutrition', value: '96', label: 'Highest domain' },
              { tag: 'Weak zone', value: '3.7', label: 'Quarantine', tone: 'bad' },
              { tag: 'Mental state', value: '68', label: 'Quarantine floor', tone: 'bad' },
              { tag: 'Blind spot', value: '12', label: 'Unaudited enclosures', tone: 'warn' },
              { tag: 'Enrichment', value: '88', unit: '%', label: 'Rota delivered', tone: 'warn' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
