/**
 * HEALTH & MEDICAL — a live clinical board.
 *
 * Composition inverts Animals: operational status comes FIRST, before any
 * analysis, because this page is read when something is wrong. The signature is
 * a flow comparison (admitted vs discharged) — "are we keeping up" is the
 * question, not "how many are sick".
 */

import { Composition, Digest, Dumbbell, Hero, Insights, MetricGrid, Records, Section, StatusList } from '../system'

export default function Health() {
  return (
    <>
      <Hero
        value="124"
        label="Animals under veterinary care"
        side={{ value: '9', label: 'critical' }}
        context="Case load is falling — discharges have outpaced admissions six of the last seven days."
        status="Herd status: healthy"
        tone="good"
      />

      {/* Status before analysis: this is the page you open when a radio call comes in. */}
      <Section label="Right now" band>
        <StatusList
          items={[
            { label: 'Critical watch, 4-hourly checks', value: '9', tone: 'bad' },
            { label: 'Isolation wards occupied', value: '19 of 24', tone: 'warn' },
            { label: 'Vets on duty', value: '6', tone: 'good' },
            { label: 'Medication doses due before 18:00', value: '42', tone: 'warn' },
            { label: 'Lab results pending', value: '7' },
          ]}
        />
      </Section>

      <Section label="Executive summary">
        <Digest>
          Nothing on this page needs a director's decision today. Case load is down{' '}
          <strong>14 animals in a week</strong>, treatment success holds at 94%, and every ward is
          staffed. The one pressure point is isolation capacity at 79% — a second respiratory cluster
          would exceed it.
        </Digest>
      </Section>

      <Section label="Admissions against discharges" aside={<span className="text-[12px] text-[#b3aea6]">last 5 weeks</span>}>
        <Dumbbell
          legend={['Admitted', 'Discharged']}
          items={[
            { label: 'Week of 30 Jul', a: 41, b: 55 },
            { label: 'Week of 23 Jul', a: 47, b: 52 },
            { label: 'Week of 16 Jul', a: 52, b: 49 },
            { label: 'Week of 09 Jul', a: 44, b: 46 },
            { label: 'Week of 02 Jul', a: 39, b: 38 },
          ]}
        />
        <p className="mt-5 text-[13px] leading-[20px] text-[#55524a]">
          The crossover in mid-July is when the respiratory cluster in Aviary Complex closed out.
        </p>
      </Section>

      <Section label="Case mix" band aside={<span className="text-[12px] text-[#b3aea6]">of 124</span>}>
        <Composition
          unit="animals"
          items={[
            { label: 'Recovery', value: 48 },
            { label: 'Observation', value: 46 },
            { label: 'Isolation', value: 19 },
            { label: 'Critical', value: 11 },
          ]}
        />
      </Section>

      <Section label="Operational health">
        <MetricGrid
          cols={3}
          items={[
            { label: 'Treatment success', value: '94', unit: '%', note: '1,284 closed YTD' },
            { label: 'Discharge under 7 d', value: '78', unit: '%', note: '+5 pts vs June' },
            { label: 'Avg length of stay', value: '5.2', unit: 'd', note: 'was 6.1' },
          ]}
        />
      </Section>

      <Section label="Presenting conditions" band>
        <Composition
          items={[
            { label: 'Respiratory', value: 31 },
            { label: 'Gastrointestinal', value: 26 },
            { label: 'Parasitic', value: 22 },
            { label: 'Dermatological', value: 18 },
            { label: 'Trauma', value: 15 },
            { label: 'Other', value: 12 },
          ]}
        />
      </Section>

      <Section label="Critical cases">
        <Records
          items={[
            { label: 'Bengal Fox · ANM-40218', sub: 'Respiratory distress · Isolation 2 · Dr. Mehta', value: 'day 3', tone: 'bad' },
            { label: 'Sambar Deer · ANM-22904', sub: 'Post-surgical watch · Ward B · Dr. Iyer', value: 'day 2', tone: 'warn' },
            { label: 'Star Tortoise · ANM-50133', sub: 'Shell lesion, culture pending · Dr. Mehta', value: 'day 6', tone: 'warn' },
            { label: 'Nile Tilapia batch · AQ-118', sub: 'Fungal treatment, tank-wide · Dr. Shah', value: 'day 4', tone: 'warn' },
          ]}
        />
      </Section>

      <Section label="AI insights" band>
        <Insights
          items={[
            {
              text: 'Isolation is at 79% with a respiratory case still open. Historically clusters peak 9 days after the index case — that puts likely peak demand on 5 August, above current free capacity.',
              tone: 'bad',
            },
            {
              text: 'Respiratory cases concentrate in Aviary Complex (11 of 31). Ventilation in Open Aviary 4 has been flagged twice on welfare audits this quarter.',
              tone: 'warn',
            },
            {
              text: 'Average length of stay fell from 6.1 to 5.2 days after the morning round was moved to 08:00. Worth holding.',
              tone: 'good',
            },
          ]}
        />
      </Section>
    </>
  )
}
