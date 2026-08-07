/**
 * HEALTH & MEDICAL — the clinical record.
 *
 * This page used to be a ward board: beds, admissions, discharges, hospital stay,
 * hospital-versus-enclosure. That is bed management, and it is the wrong frame for a
 * zoo. Most animals here are never admitted anywhere — they are examined, assessed
 * and treated inside their own enclosure — so a page organised around a hospital
 * described a minority of the care and hid all of it behind occupancy.
 *
 * What a veterinary team actually keeps is a record per animal, and the page now
 * follows the shape of that record, in the order clinical work happens:
 *
 *   symptom observed → examined and assessed → diagnosis → prescription →
 *   supplement → diagnostics → reassessment
 *
 * So the sections are Symptoms, Clinical Assessment, Medical Records,
 * Prescriptions, Supplements, Diagnostics and Follow-ups. Beds are gone. Case
 * counts stay — "how many animals have an open case" is a health question, not an
 * occupancy one — but they no longer imply a building.
 *
 * Supplements earn a section of their own because in a collection this size they
 * are the most-administered intervention by a wide margin and had no presence on
 * the page at all: calcium and D3 for reptiles and birds is routine husbandry that
 * a prescription table filtered on drug class will never surface.
 */

import {
  Activity,
  Biohazard,
  CalendarClock,
  ClipboardList,
  FileText,
  HeartPulse,
  Leaf,
  MapPin,
  Microscope,
  Pill,
  Stethoscope,
  Thermometer,
  TriangleAlert,
} from 'lucide-react'
import { report } from '../report'
import {
  Band,
  Bars,
  Facts,
  Filter,
  Funnel,
  More,
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

/**
 * Filtered on what the supplement is *for*, not on the compound. "Which animals are
 * on something for a deficiency we found" and "which are on routine husbandry
 * support" are different questions, and the compound name answers neither.
 */
const SUPPLEMENTS = [
  { label: 'Calcium + D3', sub: 'Husbandry · reptiles, birds', cells: ['186', 'Daily'] },
  { label: 'Multivitamin', sub: 'Husbandry · collection-wide', cells: ['142', 'Daily'] },
  { label: 'Iron', sub: 'Deficiency · confirmed on bloods', cells: ['68', 'Daily'] },
  { label: 'Omega-3', sub: 'Husbandry · coat and joint', cells: ['54', 'Alternate'] },
  { label: 'Probiotic', sub: 'Recovery · post-antibiotic', cells: ['48', 'Daily'] },
  { label: 'Vitamin E + Selenium', sub: 'Deficiency · hoofstock', cells: ['32', 'Weekly'] },
  { label: 'Thiamine', sub: 'Husbandry · fish-fed species', cells: ['28', 'Per feed'] },
]

export default function Health() {
  return (
    <>
      {/* "Under care" counts animals with an open clinical case, wherever they are
          treated — it is no longer a bed count, so the ward stat is gone and the
          clinical work of the window stands beside it instead. */}
      <PeriodHero
        slug="health"
        icon={HeartPulse}
        value="124"
        label="Under care"
        status="−11% Fortnight"
        tone="good"
        stats={[
          { value: '11', label: 'Critical' },
          { value: '486', label: 'Examined' },
          { value: '1,274', label: 'Records' },
        ]}
      />
      <Stack>
        {/* The four states of a case, in the order a case passes through them. */}
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

        {/* Where a case starts: something was observed. Kept first because it is the
            only section describing the animal rather than the paperwork. */}
        <Section icon={Thermometer} label="Symptoms" aside="50 new cases">
          <Bars
            showShare
            items={[
              { label: 'Laboured breathing', value: 11, sub: 'Aviary' },
              { label: 'Reduced appetite', value: 9 },
              { label: 'Lameness · limping', value: 8 },
              { label: 'Open wound', value: 7 },
              { label: 'Skin redness', value: 6 },
              { label: 'Fungal patches', value: 5, sub: 'Aquatic' },
              { label: 'Other · 6 signs', value: 4 },
            ]}
          />
          {/* Catalogue growth, not case volume — new terms the clinical team had to
              add because the existing vocabulary could not describe what they saw. */}
          <Rule label="Catalogue · 30 d" />
          <Facts
            items={[
              { label: 'New symptom terms', value: '23' },
              { label: 'New complaint terms', value: '12' },
            ]}
          />
        </Section>

        {/* The examination itself. A funnel because the drop between stages is the
            finding — 486 animals examined and 344 leaving with a plan means 142
            examinations closed without one, which is either reassurance or a gap. */}
        <Section icon={ClipboardList} label="Clinical assessment" aside="month">
          <Funnel
            stages={[
              { label: 'Examinations', value: 486 },
              { label: 'Assessment recorded', value: 462 },
              { label: 'Diagnosis assigned', value: 388 },
              { label: 'Treatment plan', value: 344 },
            ]}
          />
          <Rule label="Assessment outcome" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Normal', value: '214', tone: 'good' },
              { label: 'Monitor', value: '172', tone: 'warn' },
              { label: 'Abnormal', value: '76', tone: 'bad' },
            ]}
          />
          {/* Body condition is scored at every examination and is the one clinical
              reading that applies to an animal with nothing wrong with it. */}
          <Rule label="Body condition · 412 scored" />
          <Bars
            items={[
              { label: 'Ideal', value: 286 },
              { label: 'Overweight', value: 58 },
              { label: 'Thin', value: 46 },
              { label: 'Obese', value: 14 },
              { label: 'Emaciated', value: 8 },
            ]}
          />
        </Section>

        {/* The record itself — what was written down, and whether a vet has signed
            it. Pending sign-off is the one number here with an owner and a deadline. */}
        <Section icon={FileText} label="Medical records" aside="1,274 month">
          <Table
            head={['Type', 'Logged', 'Animals']}
            rows={[
              { label: 'Examination', sub: 'Routine and presenting', cells: ['486', '412'] },
              { label: 'Treatment note', sub: 'Dose administered', cells: ['372', '118'] },
              { label: 'Supplement log', sub: 'Batch and individual', cells: ['156', '342'] },
              { label: 'Vaccination', sub: 'Also in Preventive Care', cells: ['118', '118'] },
              { label: 'Lab result', sub: 'Attached to a case', cells: ['96', '74'] },
              { label: 'Procedure · surgery', sub: 'Theatre and field', cells: ['34', '34'] },
              { label: 'Necropsy', sub: 'Also in Mortality', cells: ['12', '12'] },
            ]}
          />
          <Rule label="Sign-off" />
          <Facts
            items={[
              { label: 'Signed off', sub: 'Of 1,274 logged', value: '1,198', tone: 'good' },
              { label: 'Pending sign-off', sub: 'Oldest 4 days', value: '76', tone: 'warn' },
              { label: 'Amended after sign-off', value: '14' },
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

        {/* The most-administered intervention in the collection, and the one a
            prescription table cannot show: 342 animals on a supplement against 118
            on a medicine. Split by reason, because a deficiency correction is a
            clinical finding and routine husbandry support is not. */}
        <Section icon={Leaf} label="Supplements" aside="342 animals">
          <Filter
            options={['All', 'Husbandry', 'Deficiency', 'Recovery']}
            items={SUPPLEMENTS}
            match={(r, option) => r.sub.split(' · ')[0] === option}
          >
            {(rows) => <Table head={['Supplement', 'Animals', 'Schedule']} rows={rows} />}
          </Filter>
          <Rule label="Coverage" />
          <Facts
            items={[
              { label: 'On at least one', sub: 'Of 2,374 in managed care', value: '342' },
              { label: 'Started this month', sub: '12 deficiency-led', value: '38' },
              { label: 'Stopped this month', value: '21' },
            ]}
          />
        </Section>

        <Section icon={Microscope} label="Diagnostics" aside="month">
          <Facts
            items={[
              { label: 'Samples submitted', sub: 'Haematology, culture, faecal', value: '96' },
              { label: 'Abnormal results', sub: 'Of 89 returned', value: '34', tone: 'warn' },
              { label: 'Results pending', sub: 'Oldest 3 days', value: '7' },
              { label: 'Turnaround', sub: 'Average', value: '1.8 d' },
            ]}
          />
        </Section>

        {/* What the record says is owed. Replaces the old ward roster — vets on duty
            and beds free are staffing questions, and these are clinical ones. */}
        <Section icon={CalendarClock} label="Follow-ups" aside="now">
          <StatusList
            items={[
              { label: 'Reassessments due this week', value: '28' },
              { label: 'Reassessments overdue', value: '9', tone: 'bad' },
              { label: 'Doses due today', value: '42', tone: 'warn' },
              { label: 'Doses outstanding', value: '14', tone: 'warn' },
              { label: 'Records pending sign-off', value: '76', tone: 'warn' },
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

        <Section icon={TriangleAlert} label="Priority cases" aside="11 critical">
          {/* Longest *open case*, not longest admitted — the tortoise has been on
              the books 38 days whether or not it ever occupied a pen. */}
          <Band
            label="Longest open case"
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
                  sub: 'Post-surgical · Recovery 2 · Dr. Iyer',
                  value: 'Day 2',
                  tone: 'warn',
                },
                {
                  label: 'Blackbuck · ANM-11726',
                  sub: 'Dystocia · Maternity 1 · Dr. Iyer',
                  value: 'Day 2',
                  tone: 'warn',
                },
              ]}
            />
          </div>
        </Section>

        {/* Outcomes, not throughput. "Hospital stay" was here and has gone with the
            rest of the bed framing; what replaced it asks whether the assessment was
            right — a revised diagnosis is the honest measure of that. */}
        <Section icon={Activity} label="Outcomes" aside="year">
          <Facts
            size="lg"
            items={[
              { label: 'Success rate', sub: '1,284 closed', value: '94%', tone: 'good' },
              { label: 'Recovery time', sub: 'Average', value: '8.4 d' },
              { label: 'Reassessed ≤ 7 d', delta: '+5', value: '78%' },
              { label: 'Diagnosis revised', sub: 'Of 1,284 closed', value: '6%' },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
