/**
 * MEDICAL & HOSPITAL — a caseload, and the building that holds it.
 *
 * Two different questions live on this page and the layout keeps them apart. The
 * caseload is clinical: how many animals are under treatment, how sick, recovering or
 * not. The hospital is physical: which department, which ward, how full, how long a
 * stay. A director asks the first; a hospital manager asks the second; the page
 * answers them in that order.
 *
 * The drill is Hospital → Department → Ward → Animal, which is four levels rather than
 * the animal modules' three, because a ward is a real place with its own occupancy.
 */

import {
  Activity,
  BedDouble,
  Building2,
  ClipboardList,
  HeartPulse,
  Hourglass,
  MapPin,
  Scissors,
  Stethoscope,
} from 'lucide-react'
import {
  Bars,
  Dial,
  Events,
  Facts,
  Highlights,
  Pareto,
  Poles,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  StatusList,
} from '../../exec/system'
import { DrillList, DrillRow, ModuleHero, NodePanel, SiteSplit, useSheet } from './kit'
import { MetricPanel } from '../panels'

const ANIMAL = (id: string, species: string, day: string) => ({
  id,
  label: id,
  sub: species,
  value: 1,
  facts: [
    { label: 'Species', value: species },
    { label: 'Admitted', value: day },
    { label: 'Presenting sign', value: 'Inappetence' },
    { label: 'Treatment', value: 'Fluids · antibiotics' },
    { label: 'Status', value: 'Stable' },
  ],
})

/**
 * Hospital → Department → Ward → Animal.
 *
 * The wards carry occupancy rather than a headcount, because "Ward 2: 8" is ambiguous
 * and "Ward 2: 8 of 10" is a decision about whether the next admission has anywhere
 * to go.
 */
const HOSPITAL = [
  {
    id: 'internal',
    label: 'Internal medicine',
    sub: '3 wards · 22 animals',
    value: 22,
    unit: 'animals',
    children: [
      { id: 'w1', label: 'Ward 1 · general', sub: '8 of 10 beds', value: 8, unit: 'animals', children: [ANIMAL('ANM-19043', 'Indian Rock Python', '29 Jul'), ANIMAL('ANM-30115', 'Rhesus Macaque', '28 Jul'), ANIMAL('ANM-28450', 'Blackbuck', '26 Jul')] },
      { id: 'w2', label: 'Ward 2 · isolation', sub: '9 of 10 beds', value: 9, unit: 'animals', tone: 'warn' as const, children: [ANIMAL('ANM-50882', 'Nile Tilapia stock', '30 Jul'), ANIMAL('ANM-41266', 'Painted Stork', '27 Jul')] },
      { id: 'w3', label: 'Ward 3 · recovery', sub: '5 of 12 beds', value: 5, unit: 'animals', children: [ANIMAL('ANM-22771', 'Chital', '25 Jul')] },
    ],
  },
  {
    id: 'surgery',
    label: 'Surgery',
    sub: '2 wards · 14 animals',
    value: 14,
    unit: 'animals',
    children: [
      { id: 'w4', label: 'Theatre recovery', sub: '6 of 8 beds', value: 6, unit: 'animals', children: [ANIMAL('ANM-22771', 'Chital', '25 Jul'), ANIMAL('ANM-40218', 'Asiatic Lion', '30 Jul')] },
      { id: 'w5', label: 'Post-op ward', sub: '8 of 14 beds', value: 8, unit: 'animals', children: [ANIMAL('ANM-31904', 'Bengal Fox', '21 Jul')] },
    ],
  },
  {
    id: 'quarantine',
    label: 'Quarantine',
    sub: '2 wards · 12 animals · full',
    value: 12,
    unit: 'animals',
    tone: 'bad' as const,
    children: [
      { id: 'w6', label: 'Quarantine A', sub: '6 of 6 beds', value: 6, unit: 'animals', tone: 'bad' as const, children: [ANIMAL('ANM-41266', 'Painted Stork', '27 Jul')] },
      { id: 'w7', label: 'Quarantine B', sub: '6 of 6 beds', value: 6, unit: 'animals', tone: 'bad' as const, children: [ANIMAL('ANM-19043', 'Indian Rock Python', '29 Jul')] },
    ],
  },
  {
    id: 'nursery',
    label: 'Neonatal',
    sub: '1 ward · 9 animals',
    value: 9,
    unit: 'animals',
    children: [
      { id: 'w8', label: 'Hand-rearing', sub: '9 of 16 cots', value: 9, unit: 'animals', children: [ANIMAL('ANM-15011', 'Rock Pigeon', '31 Jul')] },
    ],
  },
]

export default function Medical() {
  const { open } = useSheet()

  return (
    <>
      <ModuleHero
        icon={Stethoscope}
        slug="health"
        value="124"
        label="Animals under treatment"
        status="7 critical · 57 hospitalised"
        tone="warn"
        stats={[
          { value: '50', label: 'New cases' },
          { value: '38', label: 'Discharged' },
          { value: '8.4', unit: 'd', label: 'Average stay' },
        ]}
      />
      <Stack>
        {/* Clinical read first — nothing here is about the building. */}
        <Section icon={HeartPulse} label="Caseload" aside="this month">
          <Snapshot
            cols={3}
            items={[
              { label: 'Medical cases', value: '186', note: 'opened this month' },
              { label: 'Under treatment', value: '124', note: 'standing' },
              { label: 'Hospitalised', value: '57', note: 'of 124' },
              { label: 'Surgeries', value: '22', note: '3 emergency' },
              { label: 'Hospital mortality', value: '4', note: '2.2% of admissions', tone: 'bad' },
              { label: 'Recovery rate', value: '91%', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Severity" aside="124 animals">
          <StatusList
            items={[
              { label: 'Critical · continuous care', value: '7', tone: 'bad' },
              { label: 'Serious · twice daily', value: '19', tone: 'warn' },
              { label: 'Stable · daily', value: '58' },
              { label: 'Recovering · weekly', value: '40', tone: 'good' },
            ]}
          />
        </Section>

        {/* Hospital → Department → Ward → Animal. Four levels, because a ward is a
            place with its own capacity and the level above cannot express that. */}
        <Section icon={Building2} label="Veterinary Hospital" aside="8 wards">
          <DrillList>
            <DrillRow
              label="Veterinary Hospital"
              sub="4 departments · 57 in-patients"
              value="57"
              unit="animals"
              onOpen={() =>
                open({
                  title: 'Veterinary Hospital',
                  eyebrow: 'Health & Medical',
                  body: <NodePanel title="Departments" unit="animals" nodes={HOSPITAL} trail={['Veterinary Hospital']} />,
                })
              }
            />
          </DrillList>
          <Rule label="Occupancy" />
          <Bars
            items={[
              { label: 'Quarantine', value: 100, sub: '12 of 12' },
              { label: 'Isolation', value: 90, sub: '9 of 10' },
              { label: 'General', value: 80, sub: '8 of 10' },
              { label: 'Theatre recovery', value: 75, sub: '6 of 8' },
              { label: 'Neonatal', value: 56, sub: '9 of 16' },
              { label: 'Post-op', value: 57, sub: '8 of 14' },
              { label: 'Recovery', value: 42, sub: '5 of 12' },
            ]}
            unit="%"
          />
          <p className="mt-3 text-[11px] text-[#9b958b]">
            Quarantine is full — the next isolation case has nowhere to go.
          </p>
        </Section>

        <Section icon={Hourglass} label="Length of stay" aside="discharged this month">
          <Poles
            caption={['Shortest', 'Longest']}
            high={{ label: 'Neonatal', sub: '14 discharged', value: '3.2 d' }}
            low={{ label: 'Quarantine', sub: '6 discharged', value: '21.4 d' }}
            lowTone="warn"
          />
          <Rule label="Distribution" />
          <Bars
            items={[
              { label: '1–3 days', value: 14 },
              { label: '4–7 days', value: 11 },
              { label: '8–14 days', value: 8 },
              { label: '15 days +', value: 5 },
            ]}
            unit="animals"
            showShare
          />
        </Section>

        <Section icon={ClipboardList} label="Presenting causes" aside="186 cases">
          <Pareto
            items={[
              { label: 'Gastrointestinal', value: 52 },
              { label: 'Trauma', value: 41 },
              { label: 'Respiratory', value: 34 },
              { label: 'Parasitic', value: 26 },
              { label: 'Dermatological', value: 18 },
              { label: 'Other', value: 15 },
            ]}
          />
        </Section>

        <Section icon={Scissors} label="Surgery" aside="22 this month">
          <Snapshot
            cols={3}
            items={[
              { label: 'Elective', value: '19', tone: 'good' },
              { label: 'Emergency', value: '3', tone: 'warn' },
              { label: 'Complications', value: '1', tone: 'bad' },
            ]}
          />
          <Rule label="Recent" />
          <Records
            items={[
              { label: 'Fracture pinning · ANM-41266', sub: 'Painted Stork · 27 Jul', value: 'Recovered', tone: 'good' },
              { label: 'Laparotomy · ANM-22771', sub: 'Chital · 25 Jul', value: 'In recovery', tone: 'warn' },
              { label: 'Dental extraction · ANM-40218', sub: 'Asiatic Lion · 22 Jul', value: 'Recovered', tone: 'good' },
              { label: 'Wound debridement · ANM-31904', sub: 'Bengal Fox · 21 Jul', value: 'Recovered', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Recovery rate">
          <Dial percent={91} value="91" unit="%" label="Discharged recovered" benchmark={85} benchmarkLabel="Target 85% · 38 discharged" />
        </Section>

        <Section icon={MapPin} label="Caseload by site" aside="tap to drill">
          <SiteSplit
            slug="health"
            onOpenSite={(_, name) => open({ title: name, eyebrow: 'Health & Medical', body: <MetricPanel metric="health" /> })}
          />
        </Section>

        <Section icon={BedDouble} label="Admissions" aside="today">
          <Events
            items={[
              { when: '11:40', label: 'ANM-15011 · Rock Pigeon', sub: 'Neonatal · hand-rearing', tone: 'warn' },
              { when: '09:20', label: 'ANM-40218 · Asiatic Lion', sub: 'Theatre recovery · respiratory', tone: 'bad' },
              { when: '08:05', label: 'ANM-50882 · Nile Tilapia stock', sub: 'Isolation · fungal', tone: 'warn' },
              { when: '07:15', label: 'Discharged · ANM-28450 Blackbuck', sub: 'Ward 1 · lameness resolved', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={HeartPulse} label="Highlights">
          <Highlights
            items={[
              { tag: 'Caseload', value: '124', label: 'Under treatment', tone: 'warn' },
              { tag: 'Critical', value: '7', label: 'Continuous care', tone: 'bad' },
              { tag: 'Recovery', value: '91', unit: '%', label: 'Discharged well', tone: 'good' },
              { tag: 'Stay', value: '8.4', unit: 'd', label: 'Average' },
              { tag: 'Capacity', value: '100', unit: '%', label: 'Quarantine full', tone: 'bad' },
              { tag: 'Surgery', value: '22', label: '3 emergency' },
            ]}
          />
        </Section>

        <Section icon={Stethoscope} label="Establishment">
          <Facts
            items={[
              { label: 'Veterinarians', value: '9', sub: '2 locum posts pending' },
              { label: 'Veterinary nurses', value: '14' },
              { label: 'Beds', value: '72', sub: 'across 8 wards' },
              { label: 'Theatres', value: '2' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
