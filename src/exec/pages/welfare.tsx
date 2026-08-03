/**
 * ANIMAL WELFARE — an audit scorecard.
 *
 * Composition is assessment-shaped: the framework score first (radar over the
 * Five Domains), then where it dips (zone × domain matrix), then the specific
 * enclosures accountable. Centred hero, because this page is a verdict.
 */

import { Digest, Events, Hero, Insights, Matrix, MeterGroup, Radar, Records, Section } from '../system'

export default function Welfare() {
  return (
    <>
      <Hero
        align="center"
        value="4.6"
        unit="/ 5"
        label="Welfare score, quarter to date"
        context="128 assessments completed across 84 of 96 enclosures. Benchmark for accredited Indian zoos is 4.2."
        status="Above benchmark · 12 audits due"
        tone="good"
      />

      <Section label="Five Domains assessment" band>
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

      <Section label="Executive summary">
        <Digest>
          Welfare is strong and improving — <strong>twelve consecutive months of gains</strong>, from
          4.1 to 4.6. Nutrition and health are effectively solved. The weak domain is mental state at
          84, driven almost entirely by two locations: Quarantine Ward B and Aquatic Hall 2. Both have
          open remediation and neither is a new finding.
        </Digest>
      </Section>

      <Section label="Where the score dips" aside={<span className="text-[12px] text-[#b3aea6]">zone × domain</span>}>
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
          legend="Darker is better. Quarantine and Aquatic carry every low cell on the grid."
        />
      </Section>

      <Section label="Operational health" band>
        <MeterGroup
          items={[
            { label: 'Enclosures audited', value: '84 of 96', percent: 88 },
            { label: 'Enrichment rota delivered', value: '88%', percent: 88 },
            { label: 'Findings closed within SLA', value: '91%', percent: 91 },
            { label: 'Audits overdue', value: '3', percent: 12 },
          ]}
        />
      </Section>

      <Section label="Enclosures needing attention">
        <Records
          items={[
            { label: 'Quarantine Ward B', sub: 'Space per animal · mental state 68', value: '3 d open', tone: 'bad' },
            { label: 'Aquatic Hall 2', sub: 'Water clarity · environment 78', value: '1 d open', tone: 'bad' },
            { label: 'Open Aviary 7', sub: 'Perch variety · behaviour 86', value: '6 d open', tone: 'warn' },
            { label: 'Insectarium', sub: 'Humidity drift · environment 86', value: '8 d open', tone: 'warn' },
            { label: 'Savanna Paddock 6', sub: 'Shade cover · environment 92', value: '12 d open', tone: 'neutral' },
          ]}
        />
      </Section>

      <Section label="AI insights" band>
        <Insights
          items={[
            {
              text: 'Quarantine Ward B is the single highest-leverage fix on site: it holds the only critical welfare rating and is also the constraint on new animal intake. Resolving space per animal clears both.',
              tone: 'bad',
            },
            {
              text: 'Aquatic Hall 2 appears on welfare (water clarity), health (fungal treatment) and alerts (Tank 9 ammonia). These are one problem being reported three times.',
              tone: 'warn',
            },
            {
              text: 'A second filtration cycle in Aquatic Hall 2 is projected to lift the overall score to 4.7 — the largest single-action gain available this quarter.',
              tone: 'good',
            },
          ]}
        />
      </Section>

      <Section label="Audits due">
        <Events
          items={[
            { when: '01 Aug', text: 'Quarantine Ward B — re-audit after intake redistribution', tone: 'bad' },
            { when: '02 Aug', text: 'Aquatic Hall 2 — water quality re-check' },
            { when: '05 Aug', text: 'Open Aviary 7 — perch variety follow-up', tone: 'warn' },
            { when: '10 Aug', text: 'Quarterly enrichment review, all 96 enclosures' },
          ]}
        />
      </Section>
    </>
  )
}
