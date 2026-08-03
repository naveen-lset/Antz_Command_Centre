/**
 * ANIMAL WELFARE — an audit scorecard.
 *
 * Assessment-shaped: the framework score first (radar over the Five Domains),
 * then where it dips (zone × domain matrix), then the enclosures accountable.
 * Centred hero, because this page is a verdict.
 */

import { CalendarClock, ClipboardCheck, Gauge, Grid3x3, ShieldCheck, TriangleAlert } from 'lucide-react'
import { AccentProvider, Events, Hero, Matrix, MeterGroup, Radar, Records, Section, Stack } from '../system'

const ACCENT = '#db2777'

export default function Welfare() {
  return (
    <AccentProvider value={ACCENT}>
      <Hero
        icon={ShieldCheck}
        align="center"
        value="4.6"
        unit="/ 5"
        label="Welfare score, quarter to date"
        context="128 assessments across 84 of 96 enclosures. Benchmark for accredited Indian zoos is 4.2."
        status="Above benchmark · 12 audits due"
        tone="good"
      />
      <Stack>
        <Section icon={ClipboardCheck} label="Five Domains assessment">
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

        <Section icon={Grid3x3} label="Where the score dips" aside="zone × domain">
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
        </Section>

        <Section icon={Gauge} label="Operational health">
          <MeterGroup
            items={[
              { label: 'Enclosures audited', value: '84 of 96', percent: 88 },
              { label: 'Enrichment rota delivered', value: '88%', percent: 88 },
              { label: 'Findings closed within SLA', value: '91%', percent: 91 },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Enclosures needing attention" aside="7 open">
          <Records
            items={[
              { label: 'Quarantine Ward B', sub: 'Space per animal · mental state 68', value: '3 d', tone: 'bad' },
              { label: 'Aquatic Hall 2', sub: 'Water clarity · environment 78', value: '1 d', tone: 'bad' },
              { label: 'Open Aviary 7', sub: 'Perch variety · behaviour 86', value: '6 d', tone: 'warn' },
              { label: 'Insectarium', sub: 'Humidity drift · environment 86', value: '8 d', tone: 'warn' },
              { label: 'Savanna Paddock 6', sub: 'Shade cover · environment 92', value: '12 d' },
            ]}
          />
        </Section>

        <Section icon={CalendarClock} label="Audits due">
          <Events
            items={[
              { when: '01 Aug', text: 'Quarantine Ward B — re-audit after intake redistribution', tone: 'bad' },
              { when: '02 Aug', text: 'Aquatic Hall 2 — water quality re-check' },
              { when: '05 Aug', text: 'Open Aviary 7 — perch variety follow-up', tone: 'warn' },
              { when: '10 Aug', text: 'Quarterly enrichment review, all 96 enclosures' },
            ]}
          />
        </Section>
      </Stack>
    </AccentProvider>
  )
}
