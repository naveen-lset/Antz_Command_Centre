/**
 * HEALTH & MEDICAL — the ward board.
 *
 * Inverts Animal Population: the live case state opens, then today's movement,
 * then what is actually wrong with the animals and what they are being given for
 * it. Nothing here is a trend — 30-day movement lives on the Trends page, and
 * pathogens live on Disease & Outbreak; this page is the ward as it stands now.
 *
 * Complaints and prescriptions are the two things a director cannot get anywhere
 * else. A case count says the ward is busy; "eleven birds with laboured breathing
 * on 5 mg enrofloxacin" says what is happening in it.
 */

import {
  Activity,
  ArrowLeftRight,
  Biohazard,
  HeartPulse,
  MapPin,
  MessageSquare,
  Pill,
  Stethoscope,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { report } from '../report'
import {
  Band,
  Bars,
  Facts,
  Filter,
  More,
  Pair,
  PeriodHero,
  Records,
  Rule,
  Section,
  Sites,
  Snapshot,
  Stack,
  Stamp,
  StatusList,
  Table,
} from '../system'

/** Lifted out of the JSX so the filter can count each class before rendering. */
const PRESCRIPTIONS = [
  { label: 'Enrofloxacin 5 mg', sub: 'Antibacterial · aviary', cells: ['16', '14'] },
  { label: 'Meloxicam 0.5 mg', sub: 'Anti-inflammatory', cells: ['13', '13'] },
  { label: 'Ceftriaxone 20 mg', sub: 'Antibacterial · wounds', cells: ['9', '7'] },
  { label: 'Ivermectin 0.2 mg', sub: 'Antiparasitic', cells: ['8', '8'] },
  { label: 'Doxycycline 10 mg', sub: 'Antibacterial', cells: ['7', '6'] },
  { label: 'Ceftazidime 20 mg', sub: 'Antibacterial · reptiles', cells: ['5', '4'] },
  { label: 'Malachite green', sub: 'Bath · batch treatment', cells: ['4', '240'] },
]

export default function Health() {
  return (
    <>
      <PeriodHero
        slug="health"
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
        {/* The four states of a case, in the order a case passes through them. This
            quartet is the report's opening figure and it was missing entirely —
            "124 under care" says nothing about whether the ward is filling or
            emptying. */}
        <Section icon={Stethoscope} label="Cases" aside={<More href="#/health/records" />}>
          <Snapshot
            cols={4}
            items={[
              { label: 'Active', value: '124' },
              { label: 'New', value: '50', note: 'Month' },
              { label: 'Critical', value: '11', tone: 'bad' },
              { label: 'Recovered', value: '96', note: 'Month', tone: 'good' },
            ]}
          />
        </Section>

        {/* Overall stated above the six sites it is the sum of. */}
        <Section icon={MapPin} label="Sites">
          <Sites slug="health" />
        </Section>

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

        <Section icon={MessageSquare} label="Complaints" aside="50 new cases">
          <Bars
            showShare
            items={[
              { label: 'Laboured breathing', value: 11, sub: 'Aviary' },
              { label: 'Reduced appetite', value: 9 },
              { label: 'Lameness · limping', value: 8 },
              { label: 'Open wound', value: 7 },
              { label: 'Skin redness', value: 6 },
              { label: 'Fungal patches', value: 5, sub: 'Aquatic' },
              { label: 'Other · 6 complaints', value: 4 },
            ]}
          />
          {/* Catalogue growth, not case volume — new terms the clinical team had to
              add because the existing vocabulary could not describe what they saw. */}
          <Rule label="Catalogue · 30 d" />
          <Facts
            items={[
              { label: 'New complaint terms', value: '12' },
              { label: 'New symptom terms', value: '23' },
            ]}
          />
        </Section>

        {/* Filtered on drug class, which is the question actually asked of a
            prescription list — four of the seven lines are antibacterials, and
            "how much antibacterial are we using" is an antimicrobial-stewardship
            question, not a browsing one. */}
        <Section icon={Pill} label="Prescriptions" aside="62 Rx">
          <Filter
            options={['All', 'Antibacterial', 'Antiparasitic', 'Anti-inflammatory', 'Bath']}
            items={PRESCRIPTIONS}
            match={(r, option) => r.sub.split(' · ')[0] === option}
          >
            {(rows) => <Table head={['Medicine', 'Rx', 'Animals']} rows={rows} />}
          </Filter>
          <Rule label="No prescription" />
          <Facts items={[{ label: 'Observation only', sub: '12 of 50 new cases', value: '12' }]} />
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
          <Rule label="Treated at" />
          <Snapshot
            cols={2}
            items={[
              { label: 'Hospital', value: '68' },
              { label: 'In-enclosure', value: '56' },
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

        {/* Diagnoses moved to their own module — a contagious diagnosis is an
            institutional decision, not a ward statistic. What stays here is the
            handoff. */}
        <Section icon={Biohazard} label="Flagged" aside={<More href="#/disease" />}>
          <Facts
            items={[
              { label: 'Diseases flagged', sub: '112 cases · 6 sites', value: '9' },
              { label: 'Active outbreaks', sub: 'Open Aviary 4 · Aquatic Hall 2', value: '2', tone: 'bad' },
              { label: 'Under isolation', sub: 'Of 112 flagged', value: '53', tone: 'warn' },
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
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
