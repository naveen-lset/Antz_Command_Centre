/**
 * DEWORMING — the rotation programme.
 *
 * Paddock tray first, so the drug class on the ground is read before any rate.
 * The pre/post dumbbell is the only place in the set where two values per row are
 * compared — the gap between them is the whole measure, and the aggregate figures
 * sit directly under it rather than in a caption.
 */

import { Activity, CalendarClock, FlaskConical, Gauge, Grid3x3, Pill, TriangleAlert } from 'lucide-react'
import {
  Band,
  BulletGroup,
  Dumbbell,
  Events,
  Facts,
  Highlights,
  Hero,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  Tray,
} from '../system'

export default function Deworming() {
  return (
    <>
      <Hero
        icon={Pill}
        value="63"
        label="Treatments"
        status="4 overdue"
        tone="warn"
        stats={[
          { value: '94%', label: 'Compliance' },
          { value: '89%', label: 'Coverage' },
          { value: '96%', label: 'Success' },
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
              { label: 'A · Macrocyclic lactone', value: '3' },
              { label: 'B · Benzimidazole', value: '3' },
              { label: 'C · Praziquantel', value: '2' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Status" aside="July">
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

        <Section icon={Gauge} label="Coverage" aside="vs target">
          <BulletGroup
            items={[
              { label: 'Coverage', value: '89%', percent: 89, target: 90, note: '63 of 71' },
              { label: 'Compliance', value: '94%', percent: 94, target: 95, note: '4 missed · Keeper' },
              { label: 'Success', value: '96%', percent: 96, target: 90, note: 'Post-treatment epg' },
            ]}
          />
        </Section>

        <Section icon={FlaskConical} label="Reduction" aside="5 herds">
          <Dumbbell
            legend={['Before', 'After']}
            unit="epg"
            items={[
              { label: 'Blackbuck herd', a: 420, b: 40 },
              { label: 'Sambar Deer', a: 380, b: 55 },
              { label: 'Nilgai', a: 310, b: 30 },
              { label: 'Indian Peafowl', a: 260, b: 90 },
              { label: 'Chital', a: 240, b: 120 },
            ]}
          />
          <Rule label="Aggregate" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Reduction', value: '79', unit: '%', note: 'Target 90%', tone: 'warn' },
              { label: 'Before', value: '1,610', unit: 'epg' },
              { label: 'After', value: '335', unit: 'epg' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Resistance">
          <Band
            label="Non-responder"
            title="Chital · Zone A"
            sub="50% · Rotation B · Cycle 2"
            value="120"
            unit="epg"
            tone="bad"
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

        <Section icon={Pill} label="Highlights">
          <Highlights
            items={[
              { tag: 'Resistance', value: '50%', label: 'Chital · Cycle 2', tone: 'bad' },
              { tag: 'Efficacy', value: '79%', label: 'Aggregate reduction', tone: 'warn' },
              { tag: 'Cleared', value: '4 of 5', label: 'Herds over 65%' },
              { tag: 'Compliance', value: '94%', label: '4 missed slots' },
              { tag: 'Overdue', value: '5 d', label: 'Herpetarium · 8', tone: 'warn' },
              { tag: 'Coverage', value: '89%', label: '63 of 71' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
