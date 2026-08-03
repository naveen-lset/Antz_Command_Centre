/**
 * HEALTH & MEDICAL — the ward board.
 *
 * Inverts Animals completely: today's movement opens the page, because this is
 * read when a radio call comes in. Nothing here is a trend — every block is a
 * live state, and the only ranked mark is the disease ledger.
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
        label="Animals under veterinary care"
        side={{ value: '11', label: 'critical' }}
        context="0.06% of the collection. Nine of the eleven critical cases are on four-hourly checks."
        status="Case load falling · herd status healthy"
        tone="good"
      />
      <Stack>
        <Section icon={ArrowLeftRight} label="Movement today">
          <Pair
            a={{ value: '14', label: 'Admitted today' }}
            b={{ value: '17', label: 'Discharged today' }}
            relation="net −3"
            tone="good"
            note="Discharges have outpaced admissions on six of the last seven days. Case load is down 11% in a fortnight."
          />
        </Section>

        <Section icon={Users} label="On duty right now">
          <StatusList
            items={[
              { label: 'Veterinarians on duty', value: '6 of 11', tone: 'good' },
              { label: 'Medicine doses due today', value: '42', tone: 'warn' },
              { label: 'Doses still outstanding', value: '14', tone: 'warn' },
              { label: 'Lab reports pending', value: '7' },
              { label: 'Critical cases on 4-hourly checks', value: '9', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={BedDouble} label="Ward occupancy" aside="hospital wing">
          <Utilization
            used={68}
            total={84}
            label="Beds occupied across 6 wards"
            free="16 beds available"
            note="Isolation is the constraint — 19 of 24 isolation wards are in use. The remaining 56 animals under care are treated in-enclosure."
          />
        </Section>

        <Section icon={Stethoscope} label="Where the 124 sit">
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

        <Section icon={Activity} label="Clinical performance" aside="year to date">
          <Facts
            size="lg"
            items={[
              { label: 'Treatment success rate', sub: '1,284 cases closed this year', value: '94%', tone: 'good' },
              { label: 'Average recovery time', sub: 'Admission to clinically clear', value: '8.4 d' },
              { label: 'Average hospital stay', sub: 'Was 6.1 days in June', value: '5.2 d' },
              { label: 'Discharged within 7 days', sub: '+5 points against June', value: '78%' },
            ]}
          />
        </Section>

        <Section icon={Pill} label="Top diseases" aside="presenting condition">
          <Ledger
            items={[
              { label: 'Respiratory', sub: 'Concentrated in Aviary 4 and Isolation 2', value: '31', share: 100 },
              { label: 'Gastrointestinal', sub: 'Mostly Savanna herds, feed-linked', value: '26', share: 84 },
              { label: 'Parasitic', sub: 'Falling as rotation C completes', value: '22', share: 71 },
              { label: 'Dermatological', sub: 'Reptile shell and scale lesions', value: '18', share: 58 },
              { label: 'Trauma', sub: 'Fence and enclosure injuries', value: '15', share: 48 },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Critical patient list" aside="11 cases">
          <Band
            label="Longest admitted"
            title="Star Tortoise · ANM-50133"
            sub="Shell lesion, third culture pending · Herpetarium · Dr. Mehta"
            value="38"
            unit="days"
            tone="warn"
          />
          <div className="mt-4">
            <Records
              items={[
                {
                  label: 'Bengal Fox · ANM-40218',
                  sub: 'Respiratory distress, deteriorated overnight · Isolation 2 · Dr. Mehta',
                  value: 'day 3',
                  tone: 'bad',
                },
                {
                  label: 'Nile Tilapia batch · AQ-118',
                  sub: 'Tank-wide fungal treatment, 240 fish · Dr. Shah',
                  value: 'day 4',
                  tone: 'bad',
                },
                {
                  label: 'Sambar Deer · ANM-22904',
                  sub: 'Post-surgical watch, stable · Ward B · Dr. Iyer',
                  value: 'day 2',
                  tone: 'warn',
                },
                {
                  label: 'Blackbuck · ANM-11726',
                  sub: 'Dystocia recovery, feeding resumed · Ward A · Dr. Iyer',
                  value: 'day 2',
                  tone: 'warn',
                },
              ]}
            />
          </div>
        </Section>

        <Section icon={HeartPulse} label="Medical highlights">
          <Highlights
            items={[
              {
                tag: 'Flow',
                text: 'Discharges beat admissions six days in seven. If it holds, case load falls below 100 within a fortnight — the first time this year.',
              },
              {
                tag: 'Risk',
                text: 'Bengal Fox ANM-40218 is on day three of respiratory distress and worsening. The swab culture is with the partner lab and is 14 hours old.',
                tone: 'bad',
              },
              {
                tag: 'Capacity',
                text: 'Isolation runs at 79%. A second respiratory cluster in Aviary 4 would exhaust it — the contingency ward has not been commissioned.',
                tone: 'warn',
              },
              {
                tag: 'Performance',
                text: 'Treatment success holds at 94% across 1,284 closed cases, and average stay is down from 6.1 to 5.2 days since the triage protocol changed.',
              },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
