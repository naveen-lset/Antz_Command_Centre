/**
 * LAB — a throughput page, organised by time rather than by volume.
 *
 * Every other module here counts things. This one counts WAITING: how many requests
 * are open, how long they have been open, and how long the lab is taking to turn them
 * around. A lab with 31 open requests and a 1.4-day turnaround is healthy; the same 31
 * at nine days is a clinical problem, and only the second figure says which it is.
 *
 * So turnaround leads, results follow, and the drill is Department → Species → Animal
 * — the lab's own organisation, not the collection's.
 */

import {
  Activity,
  Beaker,
  ClipboardList,
  FlaskConical,
  Hourglass,
  Layers,
  Microscope,
  TriangleAlert,
  Utensils,
} from 'lucide-react'
import {
  Bars,
  Columns,
  Composition,
  Events,
  Facts,
  Highlights,
  Poles,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  StatusList,
  Table,
} from '../../exec/system'
import { DrillList, DrillRow, ModuleHero, NodePanel, useSheet } from './kit'

const SPECIMEN = (id: string, species: string, result: string, tone?: 'good' | 'warn' | 'bad') => ({
  id,
  label: id,
  sub: species,
  value: 1,
  tone,
  facts: [
    { label: 'Species', value: species },
    { label: 'Received', value: '29 Jul' },
    { label: 'Reported', value: '31 Jul' },
    { label: 'Turnaround', value: '1.8 d' },
    { label: 'Result', value: result, tone },
  ],
})

/** Department → Species → Animal. The lab's benches, not the zoo's sites. */
const DEPARTMENTS = [
  {
    id: 'path',
    label: 'Pathology',
    sub: '14 open · 2.1 d average',
    value: 14,
    unit: 'requests',
    children: [
      { id: 'p-fish', label: 'Actinopterygii', sub: '6 requests', value: 6, unit: 'requests', children: [SPECIMEN('LAB-9042', 'Nile Tilapia', 'Fungal — positive', 'bad'), SPECIMEN('LAB-9031', 'Common Carp', 'Negative', 'good')] },
      { id: 'p-mam', label: 'Mammalia', sub: '5 requests', value: 5, unit: 'requests', children: [SPECIMEN('LAB-9038', 'Asiatic Lion', 'Pseudomonas — positive', 'bad'), SPECIMEN('LAB-9026', 'Chital', 'Negative', 'good')] },
      { id: 'p-av', label: 'Aves', sub: '3 requests', value: 3, unit: 'requests', children: [SPECIMEN('LAB-9014', 'Painted Stork', 'Repeat needed', 'warn')] },
    ],
  },
  {
    id: 'para',
    label: 'Parasitology',
    sub: '9 open · 0.9 d average',
    value: 9,
    unit: 'requests',
    children: [
      { id: 'pa-mam', label: 'Mammalia', sub: '6 requests', value: 6, unit: 'requests', children: [SPECIMEN('LAB-9021', 'Chital herd', 'High burden', 'warn'), SPECIMEN('LAB-9018', 'Blackbuck', 'Low burden', 'good')] },
      { id: 'pa-rep', label: 'Reptilia', sub: '3 requests', value: 3, unit: 'requests', children: [SPECIMEN('LAB-9009', 'Flapshell Turtle', 'Negative', 'good')] },
    ],
  },
  {
    id: 'micro',
    label: 'Microbiology',
    sub: '5 open · 3.4 d average',
    value: 5,
    unit: 'requests',
    tone: 'warn' as const,
    children: [
      { id: 'm-av', label: 'Aves', sub: '4 requests', value: 4, unit: 'requests', children: [SPECIMEN('LAB-9044', 'Aviary flock', 'Aspergillus — positive', 'bad')] },
      { id: 'm-mam', label: 'Mammalia', sub: '1 request', value: 1, unit: 'requests', children: [SPECIMEN('LAB-9040', 'Rhesus Macaque', 'Pending', 'warn')] },
    ],
  },
  {
    id: 'tox',
    label: 'Toxicology',
    sub: '3 open · 4.2 d average',
    value: 3,
    unit: 'requests',
    tone: 'warn' as const,
    children: [
      { id: 't-feed', label: 'Feed samples', sub: '3 requests', value: 3, unit: 'requests', children: [SPECIMEN('LAB-9047', 'Lucerne hay batch 21', 'Aflatoxin — within limit', 'good'), SPECIMEN('LAB-9046', 'Frozen fish grade A', 'Histamine — elevated', 'warn')] },
    ],
  },
]

export default function Lab() {
  return (
    <>
      <ModuleHero
        icon={FlaskConical}
        value="31"
        label="Open lab requests"
        status="9 overdue · 1.4 d average turnaround"
        tone="warn"
        stats={[
          { value: '164', label: 'Completed' },
          { value: '1.4', unit: 'd', label: 'Average TAT' },
          { value: '4', label: 'Flagged' },
        ]}
      />
      <Stack>
        {/* Turnaround leads. It is the number that decides whether an open queue is
            healthy or a clinical delay. */}
        <Section icon={Hourglass} label="Turnaround" aside="this month">
          <Snapshot
            cols={3}
            items={[
              { label: 'Average TAT', value: '1.4', unit: 'd', tone: 'good' },
              { label: 'Median', value: '1.1', unit: 'd' },
              { label: 'Slowest bench', value: '4.2', unit: 'd', note: 'Toxicology', tone: 'warn' },
            ]}
          />
          <Rule label="Ageing of the open queue" />
          <Columns values={[14, 8, 5, 4]} labels={['0–1 d', '2–3 d', '4–7 d', '7 d +']} highlight={3} unit="Open requests · days waiting" />
        </Section>

        <Section icon={ClipboardList} label="Queue" aside="195 requests">
          <StatusList
            items={[
              { label: 'Completed', value: '164', tone: 'good' },
              { label: 'Pending', value: '31', tone: 'warn' },
              { label: 'Overdue against SLA', value: '9', tone: 'bad' },
              { label: 'Rejected specimens', value: '4' },
            ]}
          />
        </Section>

        {/* Results as one bar: positive, negative and flagged partition the reported
            set, so a stacked bar is the honest shape rather than three counts. */}
        <Section icon={Activity} label="Results" aside="164 reported">
          <Composition
            items={[
              { label: 'Negative', value: 118 },
              { label: 'Positive', value: 42 },
              { label: 'Inconclusive', value: 4 },
            ]}
            unit="results"
          />
          <Rule label="Flagged for review" />
          <Records
            items={[
              { label: 'LAB-9042 · Histopathology', sub: 'Nile Tilapia · Aquatic Halls', value: 'Fungal', tone: 'bad' },
              { label: 'LAB-9038 · Culture', sub: 'Asiatic Lion · Carnivore Ridge', value: 'Pseudomonas', tone: 'bad' },
              { label: 'LAB-9021 · Faecal load', sub: 'Chital herd · Savanna', value: 'High burden', tone: 'warn' },
              { label: 'LAB-9014 · Serology', sub: 'Aviary flock', value: 'Repeat needed', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Microscope} label="Benches" aside="4 departments">
          <DepartmentList />
          <Rule label="Volume" />
          <Bars
            items={[
              { label: 'Pathology', value: 78, sub: '2.1 d' },
              { label: 'Parasitology', value: 61, sub: '0.9 d' },
              { label: 'Microbiology', value: 38, sub: '3.4 d' },
              { label: 'Toxicology', value: 18, sub: '4.2 d' },
            ]}
            unit="requests"
            showShare
          />
        </Section>

        <Section icon={Layers} label="Specimen types" aside="195 received">
          <Table
            head={['Specimen', 'Received', 'Positive', 'TAT']}
            rows={[
              { label: 'Faecal', sub: 'Parasitology', cells: ['61', '18', '0.9 d'] },
              { label: 'Blood', sub: 'Pathology', cells: ['48', '11', '1.6 d'] },
              { label: 'Tissue', sub: 'Histopathology', cells: ['30', '9', '3.1 d'], tone: 'warn' },
              { label: 'Swab', sub: 'Microbiology', cells: ['38', '4', '3.4 d'], tone: 'warn' },
              { label: 'Feed', sub: 'Toxicology', cells: ['18', '0', '4.2 d'] },
            ]}
          />
        </Section>

        {/* Food toxicology is its own card because it is the only bench whose subject
            is not an animal — a failed feed batch is a procurement decision. */}
        <Section icon={Utensils} label="Food toxicology" aside="18 batches">
          <Snapshot
            cols={3}
            items={[
              { label: 'Batches tested', value: '18' },
              { label: 'Within limit', value: '16', tone: 'good' },
              { label: 'Elevated', value: '2', tone: 'warn' },
            ]}
          />
          <Rule label="Findings" />
          <Records
            items={[
              { label: 'Frozen fish · grade A', sub: 'Histamine 42 ppm · limit 50', value: 'Elevated', tone: 'warn' },
              { label: 'Lucerne hay · batch 21', sub: 'Aflatoxin 8 ppb · limit 20', value: 'Within limit', tone: 'good' },
              { label: 'Live insect culture', sub: 'Heavy metals · not detected', value: 'Clear', tone: 'good' },
              { label: 'Pellet feed · batch 44', sub: 'Salmonella · not detected', value: 'Clear', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={Beaker} label="Fastest and slowest" aside="by bench">
          <Poles
            high={{ label: 'Parasitology', sub: '61 requests', value: '0.9 d' }}
            low={{ label: 'Toxicology', sub: '18 requests', value: '4.2 d' }}
            lowTone="warn"
          />
        </Section>

        <Section icon={FlaskConical} label="Today">
          <Events
            items={[
              { when: '13:20', label: 'LAB-9047 reported', sub: 'Lucerne hay · within limit', tone: 'good' },
              { when: '11:05', label: 'LAB-9044 reported', sub: 'Aviary flock · Aspergillus positive', tone: 'bad' },
              { when: '09:30', label: '6 specimens received', sub: 'Pathology bench' },
              { when: '07:58', label: 'LAB-9042 reported', sub: 'Nile Tilapia · fungal', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Highlights">
          <Highlights
            items={[
              { tag: 'Open', value: '31', label: 'Requests', tone: 'warn' },
              { tag: 'Overdue', value: '9', label: 'Against SLA', tone: 'bad' },
              { tag: 'TAT', value: '1.4', unit: 'd', label: 'Average', tone: 'good' },
              { tag: 'Positive', value: '26', unit: '%', label: 'Of reported' },
              { tag: 'Flagged', value: '4', label: 'For review', tone: 'bad' },
              { tag: 'Feed', value: '2', label: 'Batches elevated', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Microscope} label="Capacity">
          <Facts
            items={[
              { label: 'Technicians', value: '6' },
              { label: 'Benches', value: '4' },
              { label: 'Daily throughput', sub: 'Median', value: '9' },
              { label: 'SLA', sub: 'Routine specimens', value: '3 d' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}

function DepartmentList() {
  const { open } = useSheet()
  return (
    <DrillList>
      {DEPARTMENTS.map((d) => (
        <DrillRow
          key={d.id}
          label={d.label}
          sub={d.sub}
          value={String(d.value)}
          unit="open"
          tone={d.tone}
          onOpen={() =>
            open({
              title: d.label,
              eyebrow: 'Lab Requests',
              body: <NodePanel title="Species" unit="requests" nodes={d.children} trail={[d.label]} />,
            })
          }
        />
      ))}
    </DrillList>
  )
}
