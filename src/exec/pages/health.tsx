/**
 * HEALTH & MEDICAL — the ward board.
 *
 * Inverts Animals: today's movement opens, then live status, beds, case mix.
 * Nothing here is a trend — every block is a live state, and the only ranked
 * mark is the disease ledger. Numbers only; no block explains another.
 */

import { Activity, ArrowLeftRight, BedDouble, HeartPulse, Pill, Stethoscope, TriangleAlert, Users } from 'lucide-react'
import {
  Band,
  Facts,
  Highlights,
  Hero,
  Ledger,
  Pair,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  StatusList,
  Utilization,
} from '../system'

export default function Health() {
  return (
    <>
      <Hero
        icon={HeartPulse}
        value="124"
        label="Under care"
        status="−11% Fortnight"
        tone="good"
        stats={[
          { value: '11', label: 'Critical' },
          { value: '9', label: '4-hourly' },
          { value: '6', label: 'Wards' },
        ]}
      />
      <Stack>
        <Section icon={ArrowLeftRight} label="Movement" aside="today">
          <Pair
            a={{ value: '14', label: 'Admitted' }}
            b={{ value: '17', label: 'Discharged' }}
            relation="net −3"
            tone="good"
          />
        </Section>

        <Section icon={Users} label="Status" aside="now">
          <StatusList
            items={[
              { label: 'Vets on duty', value: '6 of 11', tone: 'good' },
              { label: 'Doses due', value: '42', tone: 'warn' },
              { label: 'Doses outstanding', value: '14', tone: 'warn' },
              { label: 'Lab reports pending', value: '7' },
              { label: 'Critical · 4-hourly', value: '9', tone: 'bad' },
            ]}
          />
        </Section>

        {/* Beds and the where-treated split share one card: 68 in hospital plus 56
            in-enclosure is the same 124, and two cards would break that read. */}
        <Section icon={BedDouble} label="Beds" aside="6 wards">
          <Utilization used={68} total={84} label="Beds occupied" free="16 free" />
          <Rule label="Split" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Hospital', value: '68' },
              { label: 'In-enclosure', value: '56' },
              { label: 'Isolation', value: '79', unit: '%', note: '19 of 24', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Stethoscope} label="Case mix" aside="124">
          <Snapshot
            cols={4}
            items={[
              { label: 'Recovery', value: '48' },
              { label: 'Observation', value: '46' },
              { label: 'Isolation', value: '19' },
              { label: 'Critical', value: '11', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Clinical" aside="year">
          <Facts
            size="lg"
            items={[
              { label: 'Success rate', sub: '1,284 closed', value: '94%', tone: 'good' },
              { label: 'Recovery time', sub: 'Average', value: '8.4 d' },
              { label: 'Hospital stay', sub: 'June 6.1 d', value: '5.2 d' },
              { label: 'Discharged ≤ 7 d', delta: '+5', value: '78%' },
            ]}
          />
        </Section>

        <Section icon={Pill} label="Diseases" aside="top 5">
          <Ledger
            items={[
              { label: 'Respiratory', sub: 'Aviary 4 · Isolation 2', value: '31', share: 100 },
              { label: 'Gastrointestinal', sub: 'Savanna herds', value: '26', share: 84 },
              { label: 'Parasitic', sub: 'Rotation C', value: '22', share: 71 },
              { label: 'Dermatological', sub: 'Reptiles', value: '18', share: 58 },
              { label: 'Trauma', sub: 'Enclosure injuries', value: '15', share: 48 },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Critical" aside="11 cases">
          <Band
            label="Longest admitted"
            title="Star Tortoise · ANM-50133"
            sub="Herpetarium · Dr. Mehta · Culture 3"
            value="38"
            unit="days"
            tone="warn"
          />
          <div className="mt-4">
            <Records
              items={[
                {
                  label: 'Bengal Fox · ANM-40218',
                  sub: 'Respiratory · Isolation 2 · Dr. Mehta',
                  value: 'Day 3',
                  tone: 'bad',
                },
                {
                  label: 'Nile Tilapia · AQ-118',
                  sub: 'Fungal · 240 fish · Dr. Shah',
                  value: 'Day 4',
                  tone: 'bad',
                },
                {
                  label: 'Sambar Deer · ANM-22904',
                  sub: 'Post-surgical · Ward B · Dr. Iyer',
                  value: 'Day 2',
                  tone: 'warn',
                },
                {
                  label: 'Blackbuck · ANM-11726',
                  sub: 'Dystocia · Ward A · Dr. Iyer',
                  value: 'Day 2',
                  tone: 'warn',
                },
              ]}
            />
          </div>
        </Section>

        <Section icon={HeartPulse} label="Highlights">
          <Highlights
            items={[
              { tag: 'Flow', value: '6 of 7', label: 'Discharge days', tone: 'good' },
              { tag: 'Forecast', value: '<100', label: 'Cases, fortnight' },
              { tag: 'Risk', value: '14', unit: 'h', label: 'Culture · Bengal Fox', tone: 'bad' },
              { tag: 'Isolation', value: '79', unit: '%', label: '19 of 24', tone: 'warn' },
              { tag: 'Success', value: '94', unit: '%', label: '1,284 closed' },
              { tag: 'Stay', value: '5.2', unit: 'd', label: 'June 6.1 d' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
