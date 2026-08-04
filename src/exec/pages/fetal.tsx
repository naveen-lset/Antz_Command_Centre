/**
 * FETAL DEATH — losses before birth.
 *
 * Split out of Birth Analytics, where it had been a five-word note on a target
 * bar. It belongs on its own page because a still birth is a clinical event with a
 * dam, a history and a follow-up, and none of that fits in a footnote — and because
 * a loss counted inside the births figure is a loss nobody reviews.
 *
 * The tone here is the same as Mortality's: no targets, no praise, no streaks.
 */

import { Baby, HeartPulse, ListChecks, MapPin, Stethoscope } from 'lucide-react'
import { report } from '../report'
import { Facts, Hero, More, Records, Rule, Section, Snapshot, Stack, Stamp } from '../system'

export default function Fetal() {
  return (
    <>
      <Hero
        icon={Baby}
        value="5"
        label="Fetal deaths"
        status="−2 Month"
        tone="good"
        stats={[
          { value: '4', label: 'Species' },
          { value: '3', label: 'Sites' },
          { value: '2', label: 'Causes' },
        ]}
      />
      <Stack>
        <Section icon={ListChecks} label="Causes" aside={<More href="#/fetal/records" />}>
          <Facts
            size="lg"
            items={[
              { label: 'Still birth', sub: 'Full or near-term', value: '3' },
              { label: 'Abortion', sub: 'Pre-term loss', value: '2' },
            ]}
          />
        </Section>

        {/* Stated against deliveries, because five is meaningless alone: five out of
            fifty pregnancies and five out of five hundred are different months. */}
        <Section icon={HeartPulse} label="Rate" aside="vs deliveries">
          <Snapshot
            cols={3}
            items={[
              { label: 'Fetal loss', value: '10', unit: '%', note: '5 of 50' },
              { label: 'Live births', value: '45' },
              { label: 'Prior month', value: '7', unit: '%', note: '3 of 41' },
            ]}
          />
          <Rule label="Distribution" />
          <Facts
            items={[
              { label: 'Cervids', sub: 'Sambar Deer · Chital · Nilgai', value: '4' },
              { label: 'Bovids', sub: 'Blackbuck', value: '1' },
            ]}
          />
        </Section>

        <Section icon={Stethoscope} label="Dams" aside="5 events">
          <Records
            items={[
              {
                label: 'Sundari · Sambar Deer',
                sub: 'Still birth · 4th pregnancy · 12 y · Prior dystocia 2024 · Dr. Iyer',
                value: '07 Jul',
                tone: 'bad',
              },
              {
                label: 'Meera · Nilgai',
                sub: 'Still birth · Twins · One live calf · Dr. Rao',
                value: '14 Jul',
                tone: 'bad',
              },
              {
                label: 'Roshni · Chital',
                sub: 'Abortion · Body condition 2.5 of 5 · Nutrition review open',
                value: '19 Jul',
                tone: 'warn',
              },
              {
                label: 'Vasudha · Blackbuck',
                sub: 'Abortion · First pregnancy · No prior history',
                value: '23 Jul',
                tone: 'warn',
              },
            ]}
          />
        </Section>

        <Section icon={MapPin} label="Sites">
          <Facts
            items={[
              { label: 'Zone A', sub: 'Sambar Deer · Chital', value: '2', tone: 'warn' },
              { label: 'Wetland Reserve', sub: 'Nilgai · twins', value: '2' },
              { label: 'Savanna Paddock 1', sub: 'Blackbuck', value: '1' },
            ]}
          />
        </Section>

        <Section icon={ListChecks} label="Follow-up" aside="4 open">
          <Records
            items={[
              { label: 'Histopathology · Sundari', sub: 'Partner lab · placental tissue', value: '3 d', tone: 'bad' },
              { label: 'Nutrition review · Zone A cervids', sub: 'Body condition scoring · 41 animals', value: 'Open' },
              { label: 'Breeding hold · Sundari', sub: 'No further cycles pending review', value: 'Active' },
              { label: 'Dam screening · Wetland Reserve', sub: '9 dams · serology', value: '2 d', tone: 'warn' },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
