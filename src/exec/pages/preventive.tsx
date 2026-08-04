/**
 * PREVENTIVE CARE — the two coverage rates, side by side.
 *
 * Vaccination and Deworming each have their own module; this page exists because
 * they are one question at director level ("is the collection protected?") and
 * answering it needs them adjacent, not two taps apart.
 *
 * Both rates are shown as a ring with the fraction inside. A bare "92%" invites the
 * wrong follow-up question — the useful one is always about the 190 animals in the
 * remainder, and the ring keeps them on screen.
 */

import { CalendarClock, Pill, ShieldPlus, Syringe, TriangleAlert } from 'lucide-react'
import { report } from '../report'
import { Facts, Hero, Records, Ring, Rule, Section, Snapshot, Stack, Stamp } from '../system'

export default function Preventive() {
  return (
    <>
      <Hero
        icon={ShieldPlus}
        value="90"
        unit="%"
        label="Protected"
        status="9 Overdue"
        tone="warn"
        stats={[
          { value: '2,184', label: 'Vaccinated' },
          { value: '1,946', label: 'Dewormed' },
          { value: '139', label: 'Doses, month' },
        ]}
      />
      <Stack>
        <Section icon={Syringe} label="Vaccination" aside="on protocol">
          <Ring
            percent={92}
            label="Vaccinated"
            value="2,184"
            of="2,374"
            note="190 uncovered · 5 overdue"
            href="#/vaccination"
          />
        </Section>

        <Section icon={Pill} label="Deworming" aside="on rotation">
          <Ring
            percent={89}
            label="Dewormed"
            value="1,946"
            of="2,190"
            note="244 uncovered · 4 herds overdue"
            href="#/deworming"
          />
        </Section>

        <Section icon={CalendarClock} label="Due" aside="30 d">
          <Snapshot
            cols={2}
            items={[
              { label: 'Due today', value: '18', note: '12 vaccine · 6 anthelmintic' },
              { label: 'Due this week', value: '54' },
              { label: 'Boosters, 30 d', value: '23' },
              { label: 'Overdue', value: '9', note: 'Escalated', tone: 'bad' },
            ]}
          />
          <Rule label="Clinic days" />
          <Facts
            items={[
              { label: '04 Aug · Savanna Paddocks', sub: 'FMD · Rotation A · Dr. Iyer', value: '26' },
              { label: '08 Aug · Open Aviaries', sub: 'Newcastle · Rotation B · Dr. Rao', value: '31' },
              { label: '12 Aug · Herpetarium', sub: 'Herpesvirus · Rotation C · Dr. Mehta', value: '17', tone: 'warn' },
            ]}
          />
        </Section>

        {/* Both modules' overdue rails, merged. Split across two pages, nobody ever
            saw that Star Tortoise is late for both at once. */}
        <Section icon={TriangleAlert} label="Overdue" aside="9 open">
          <Records
            items={[
              {
                label: 'Star Tortoise · 3 animals',
                sub: 'Herpesvirus 11 d · Praziquantel 5 d · Herpetarium · Dr. Mehta',
                value: 'Both',
                tone: 'bad',
              },
              { label: 'Herpetarium · 8 reptiles', sub: 'Rotation C · 28 Jul slot', value: '5 d', tone: 'bad' },
              { label: 'Open Aviary 7 · 11 birds', sub: 'Rotation B · keeper unavailable', value: '3 d', tone: 'warn' },
              { label: 'Nile Tilapia · AQ-118', sub: 'Batch · deferred, fungal course', value: '8 d', tone: 'warn' },
              { label: 'Bengal Fox · ANM-40218', sub: 'Rabies · in isolation', value: '4 d', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={ShieldPlus} label="Quality" aside="year">
          <Facts
            size="lg"
            items={[
              { label: 'Cold chain breaks', sub: '214 days clear', value: '0', tone: 'good' },
              { label: 'Adverse reactions', sub: 'Mild · same day', value: '2' },
              { label: 'On exact due date', sub: '72 h tolerance', value: '91%' },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
