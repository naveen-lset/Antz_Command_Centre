/**
 * DEWORMING — the rotation programme.
 *
 * Paddock tray first, so the drug class on the ground is read before any rate.
 * Then coverage as a ring with its fraction inside, the overdue herds, and the
 * next four rotation dates.
 *
 * Egg-count reduction and resistance status came off this page. Both are real and
 * both are parasitology, not governance: a pre/post epg dumbbell is the single
 * most technical mark in the app, and no director has ever needed to read a larval
 * culture result off a monthly summary. The programme figures that replaced them —
 * covered, compliant, overdue — are what a rotation is actually managed on.
 */

import { Activity, CalendarClock, Grid3x3, Pill, TriangleAlert } from 'lucide-react'
import { report } from '../report'
import {
  Events,
  Facts,
  Hero,
  More,
  Records,
  Ring,
  Rule,
  Section,
  Snapshot,
  Stack,
  Stamp,
  Tray,
} from '../system'

export default function Deworming() {
  return (
    <>
      <Hero
        icon={Pill}
        value="63"
        label="Treatments"
        status="4 Overdue"
        tone="warn"
        stats={[
          { value: '89', unit: '%', label: 'Coverage' },
          { value: '94', unit: '%', label: 'Compliance' },
          { value: '3', label: 'Medicines' },
        ]}
      />
      <Stack>
        <Section icon={Grid3x3} label="Rotation" aside="3 past slot">
          <Tray
            cols={4}
            cells={[
              { value: 'A', label: 'Savanna 1', tone: 'good' },
              { value: 'A', label: 'Savanna 3', tone: 'good' },
              { value: 'A', label: 'Wetland', tone: 'good' },
              { value: 'B', label: 'Aviary 4', tone: 'good' },
              { value: 'B', label: 'Zone A', tone: 'good' },
              { value: 'B', label: 'Aviary 7', tone: 'warn' },
              { value: 'C', label: 'Aquatic 2', tone: 'warn' },
              { value: 'C', label: 'Herpetarium', tone: 'bad' },
            ]}
          />
          {/* The A/B/C key is a paddock count, not a caption — the class names have to
              be readable, and a legend line would be the only prose on the page. */}
          <Rule label="Classes" />
          <Facts
            items={[
              { label: 'A · Ivermectin 1%', value: '3' },
              { label: 'B · Fenbendazole', value: '3' },
              { label: 'C · Praziquantel', value: '2' },
            ]}
          />
        </Section>

        <Section icon={Pill} label="Coverage" aside="on rotation">
          <Ring percent={89} label="Dewormed" value="1,946" of="2,190" note="244 uncovered · 4 herds overdue" />
          <Rule label="Programme" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Slots treated', value: '63', note: 'Of 71' },
              { label: 'Compliance', value: '94', unit: '%', note: '4 missed' },
              { label: 'Overdue herds', value: '4', note: 'Oldest 5 d', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Status" aside={<More href="#/deworming/records" />}>
          <Facts
            size="lg"
            items={[
              { label: 'Treated', sub: '71 scheduled', value: '63' },
              { label: 'Due today', sub: 'Savanna 1 · A · Dr. Iyer', value: '6', tone: 'warn' },
              { label: 'Overdue herds', sub: 'Oldest 5 d', value: '4', tone: 'bad' },
              { label: 'Recheck due', sub: '4 herds · 19 Aug', value: '20' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Overdue" aside="4 herds">
          <Records
            items={[
              { label: 'Herpetarium · 8 reptiles', sub: 'Rotation C · 28 Jul slot', value: '5 d', tone: 'bad' },
              { label: 'Open Aviary 7 · 11 birds', sub: 'Rotation B · Keeper', value: '3 d', tone: 'warn' },
              { label: 'Aquatic Hall 2 · 4 batches', sub: 'Deferred · Fungal course', value: '2 d', tone: 'warn' },
              { label: 'Insectarium · 2 colonies', sub: 'Rotation C · Scheduling', value: '1 d' },
            ]}
          />
        </Section>

        <Section icon={CalendarClock} label="Next rotation">
          <Events
            items={[
              { when: '04 Aug', label: 'Rotation A · Savanna Paddocks', sub: 'Dr. Iyer', value: '14' },
              { when: '08 Aug', label: 'Rotation B · Open Aviaries', sub: 'Dr. Rao · Clears overdue', value: '11' },
              { when: '12 Aug', label: 'Rotation C · Herpetarium', sub: 'Dr. Mehta', value: '8', tone: 'warn' },
              { when: '12 Aug', label: 'Chital · Class change', sub: 'Zone A · Larval culture', tone: 'bad' },
              { when: '19 Aug', label: 'Faecal recheck · 4 herds', sub: 'Dr. Shah · Lab-linked', value: '20' },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
