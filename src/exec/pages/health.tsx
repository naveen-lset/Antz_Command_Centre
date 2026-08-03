/**
 * HEALTH & MEDICAL — a live clinical board.
 *
 * Inverts Animals: operational status comes FIRST, before any analysis, because
 * this page is read when something is wrong. The signature is a flow comparison
 * — "are we keeping up" rather than "how many are sick".
 */

import { Activity, ArrowLeftRight, HeartPulse, Pill, Stethoscope, Syringe, TriangleAlert } from 'lucide-react'
import { AccentProvider, Composition, Dumbbell, Hero, MetricGrid, Records, Section, Stack, StatusList } from '../system'

const ACCENT = '#e93353'

export default function Health() {
  return (
    <AccentProvider value={ACCENT}>
      <Hero
        icon={HeartPulse}
        value="124"
        label="Animals under veterinary care"
        side={{ value: '9', label: 'critical' }}
        context="Case load is falling — discharges have outpaced admissions six of the last seven days."
        status="Herd status: healthy"
        tone="good"
      />
      <Stack>
        {/* Status before analysis: this is the page you open when a radio call comes in. */}
        <Section icon={TriangleAlert} label="Right now">
          <StatusList
            items={[
              { label: 'Critical watch, 4-hourly checks', value: '9', tone: 'bad' },
              { label: 'Isolation wards occupied', value: '19 of 24', tone: 'warn' },
              { label: 'Vets on duty', value: '6', tone: 'good' },
              { label: 'Doses due before 18:00', value: '42', tone: 'warn' },
              { label: 'Lab results pending', value: '7' },
            ]}
          />
        </Section>

        <Section icon={ArrowLeftRight} label="Admissions vs discharges" aside="5 weeks">
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
          <p className="mt-4 text-[13px] leading-[20px] text-[#3d3a34]">
            The mid-July crossover is when the respiratory cluster in Aviary Complex closed out.
          </p>
        </Section>

        <Section icon={Stethoscope} label="Case mix" aside="of 124">
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

        <Section icon={Syringe} label="Operational health">
          <MetricGrid
            cols={3}
            items={[
              { label: 'Treatment success', value: '94', unit: '%', note: '1,284 closed YTD' },
              { label: 'Discharge under 7 d', value: '78', unit: '%', note: '+5 pts vs June' },
              { label: 'Avg stay', value: '5.2', unit: 'd', note: 'was 6.1' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Presenting conditions">
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

        <Section icon={Pill} label="Critical cases" aside="4 on watch">
          <Records
            items={[
              { label: 'Bengal Fox · ANM-40218', sub: 'Respiratory distress · Isolation 2 · Dr. Mehta', value: 'day 3', tone: 'bad' },
              { label: 'Sambar Deer · ANM-22904', sub: 'Post-surgical watch · Ward B · Dr. Iyer', value: 'day 2', tone: 'warn' },
              { label: 'Star Tortoise · ANM-50133', sub: 'Shell lesion, culture pending · Dr. Mehta', value: 'day 6', tone: 'warn' },
              { label: 'Nile Tilapia batch · AQ-118', sub: 'Fungal treatment, tank-wide · Dr. Shah', value: 'day 4', tone: 'warn' },
            ]}
          />
        </Section>
      </Stack>
    </AccentProvider>
  )
}
