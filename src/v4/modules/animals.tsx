/**
 * ANIMAL POPULATION — five questions, in the order a curator asks them.
 *
 *   How many species?          → Species
 *   How is it sexed?           → Gender distribution
 *   Where is it?               → Site-wise population
 *   What is it made of?        → Class composition
 *   What are we answerable for? → Regulatory standing and Conservation
 *
 * Conservation is the only card on the page whose rows open something, and that is
 * deliberate: "388 Critically Endangered" is the one figure here that is useless
 * without the names behind it. Tapping a category opens the species and their counts.
 *
 * Every string on this page names a number. There is no prose.
 */

import {
  ArrowLeftRight,
  Baby,
  Footprints,
  Layers,
  ListOrdered,
  MapPin,
  PawPrint,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Activity,
  Venus,
} from 'lucide-react'
import { CLASS_ICONS } from '../../exec/classIcons'
import {
  Bars,
  Composition,
  Facts,
  Filter,
  RED_LIST,
  RedList,
  Rule,
  Scoreboard,
  Section,
  Snapshot,
  Stack,
  Table,
  fmt,
  type RedListCode,
} from '../../exec/system'
import { DrillList, DrillRow, ModuleHero, NodePanel, SiteSplit, useSheet } from './kit'
import { MetricPanel } from '../panels'
import { ConservationPanel } from './conservationPanel'
import { RED_LIST_COUNTS, speciesCount } from './conservation'

const TOTAL = 215432
const REGULATORY = 37122
const SPECIES_TOTAL = 428
const share = (n: number) => `${((n / TOTAL) * 100).toFixed(1)}%`

const CITES: [string, number][] = [
  ['Appendix I', 4180],
  ['Appendix II', 12640],
  ['Appendix III', 3902],
]

const SCHEDULES: [string, number][] = [
  ['Schedule I', 6240],
  ['Schedule II', 8180],
  ['Schedule III', 1980],
]

const NON_REGULATORY: [string, number][] = [
  ['Domestic', 96420],
  ['Farm', 61180],
  ['Companion animals', 20710],
]

/**
 * The nine classes, with their counts and their species tallies.
 *
 * Counts sum to 215,432 and species to 428 — the two figures the hero states — so the
 * card cannot drift from the page it sits on.
 */
const CLASSES: { name: keyof typeof CLASS_ICONS; common: string; count: number; species: number }[] = [
  { name: 'Actinopterygii', common: 'Ray-finned fish', count: 77840, species: 96 },
  { name: 'Aves', common: 'Birds', count: 38600, species: 112 },
  { name: 'Malacostraca', common: 'Crustaceans', count: 34180, species: 38 },
  { name: 'Mammalia', common: 'Mammals', count: 21900, species: 74 },
  { name: 'Reptilia', common: 'Reptiles', count: 12850, species: 48 },
  { name: 'Insecta', common: 'Insects', count: 12220, species: 26 },
  { name: 'Chondrichthyes', common: 'Sharks, rays', count: 8120, species: 12 },
  { name: 'Amphibia', common: 'Amphibians', count: 5482, species: 14 },
  { name: 'Euchelicerata', common: 'Arachnids', count: 4240, species: 8 },
]

const EVENTS = [
  { key: 'birth', label: 'Birth', sub: '24 species', value: 45, tone: 'good' as const, icon: Sparkles },
  { key: 'mortality', label: 'Mortality', sub: '0.011% of collection', value: -23, tone: 'bad' as const, icon: Activity },
  { key: 'external', label: 'External transfer', sub: '12 in · 9 out', value: 3, icon: ArrowLeftRight },
  { key: 'internal', label: 'Internal transfer', sub: '7 moves, no net change', value: 0, icon: ArrowLeftRight },
  { key: 'escaped', label: 'Escaped animals', sub: '1 recaptured', value: -1, tone: 'warn' as const, icon: Footprints },
  { key: 'fetal', label: 'Fetal death', sub: '3 species', value: -5, tone: 'bad' as const, icon: Baby },
]

const TOP_SPECIES = [
  ['Common Carp', 'Actinopterygii', 12400],
  ['Zebra Finch', 'Aves', 6820],
  ['Nile Tilapia', 'Actinopterygii', 5940],
  ['Indian Peafowl', 'Aves', 4310],
  ['Rose Shrimp', 'Malacostraca', 3880],
  ['Silver Barb', 'Actinopterygii', 2940],
  ['Rock Pigeon', 'Aves', 2210],
  ['Grey Francolin', 'Aves', 1640],
  ['Bengal Fox', 'Mammalia', 1280],
  ['Flapshell Turtle', 'Reptilia', 1090],
].map(([label, sub, count]) => ({
  label: label as string,
  sub: sub as string,
  cells: [(count as number).toLocaleString('en-US'), share(count as number)],
}))

export default function Animals() {
  const { open } = useSheet()

  const drill = (title: string) =>
    open({ title, eyebrow: 'Animal Population', body: <MetricPanel metric="animals" /> })

  const openCategory = (code: RedListCode) => {
    const cat = RED_LIST.find((c) => c.code === code)
    if (!cat) return
    open({
      title: cat.name,
      eyebrow: `${fmt(RED_LIST_COUNTS[code] ?? 0)} animals · ${speciesCount(code)} species`,
      body: <ConservationPanel code={code} />,
    })
  }

  return (
    <>
      <ModuleHero
        icon={PawPrint}
        slug="animals"
        value={fmt(TOTAL)}
        label="Animals"
        status="+37 net · month"
        tone="good"
        stats={[
          { value: String(SPECIES_TOTAL), label: 'Species' },
          { value: '6', label: 'Sites' },
          { value: '96', label: 'Enclosures' },
        ]}
      />
      <Stack>
        {/* 1 · SPECIES. How many kinds of animal, and how that is moving. */}
        <Section icon={ListOrdered} label="Species" aside={`${SPECIES_TOTAL} held`}>
          <Snapshot
            cols={4}
            items={[
              { label: 'Species', value: String(SPECIES_TOTAL) },
              { label: 'Classes', value: String(CLASSES.length) },
              { label: 'New', value: '+6', note: 'this quarter', tone: 'good' },
              { label: 'Lost', value: '−1', note: 'this quarter', tone: 'bad' },
            ]}
          />
          <Rule label="Species per class" />
          <Bars
            items={CLASSES.map((c) => ({ label: c.name, value: c.species, sub: c.common }))}
            unit="species"
            showShare
          />
        </Section>

        {/* 2 · GENDER. Undetermined is the majority ANSWER, not missing data: most of a
            collection this size is fish and invertebrates that are never sexed. The
            sexed ratio is stated separately because that is the only part a breeding
            programme can act on. */}
        <Section icon={Venus} label="Gender distribution" aside="215,432 animals">
          <Scoreboard
            items={[
              { value: '18,204', label: 'Male' },
              { value: '16,880', label: 'Female' },
              { value: '180,348', label: 'Undetermined' },
            ]}
          />
          <Rule label="Share" />
          <Composition
            items={[
              { label: 'Undetermined', value: 180348 },
              { label: 'Male', value: 18204 },
              { label: 'Female', value: 16880 },
            ]}
            unit="animals"
          />
          <Rule label="Of the sexed" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Sexed', value: '35,084', note: '16% of collection' },
              { label: 'Ratio', value: '1.08', note: 'male per female' },
              { label: 'Breeding pairs', value: '58', note: '45 productive' },
            ]}
          />
        </Section>

        {/* 3 · SITE-WISE POPULATION. Honours the global site filter — with one picked
            this shows that site alone. Each row drills to its species and animals. */}
        <Section icon={MapPin} label="Site-wise population" aside="tap to drill">
          <SiteSplit slug="animals" onOpenSite={(_, name) => drill(name)} />
        </Section>

        {/* 4 · CLASS COMPOSITION, each class wearing its own glyph. Nine scientific
            names in a grid are nine similar-length words, and the icon is what makes a
            row findable without reading it. */}
        <Section icon={Layers} label="Class composition" aside={`${CLASSES.length} classes`}>
          <Snapshot
            cols={2}
            items={CLASSES.map((c) => ({
              label: c.name,
              value: fmt(c.count),
              note: `${c.common} · ${c.species} species`,
              icon: CLASS_ICONS[c.name],
            }))}
          />
          <Rule label="Share" />
          <Composition
            items={[
              ...CLASSES.slice(0, 5).map((c) => ({ label: c.name, value: c.count })),
              { label: 'Other · 4 classes', value: CLASSES.slice(5).reduce((n, c) => n + c.count, 0) },
            ]}
            unit="animals"
          />
        </Section>

        {/* 5 · CONSERVATION, and every non-empty badge opens its species.
            The count answers "how many Endangered animals"; the only useful next
            question is "which ones", and it is now one tap rather than a phone call. */}
        <Section icon={ShieldAlert} label="Conservation" aside="IUCN · tap a category">
          <RedList counts={RED_LIST_COUNTS} onOpen={openCategory} />
        </Section>

        <Section icon={ScrollText} label="Regulatory standing" aside={share(REGULATORY)}>
          <Snapshot
            cols={2}
            items={[
              { label: 'Regulatory', value: fmt(REGULATORY), note: 'permit or schedule applies' },
              { label: 'Non-regulatory', value: fmt(TOTAL - REGULATORY), note: 'domestic, farm, companion' },
            ]}
          />
          <Rule label="CITES appendix" />
          <Bars items={CITES.map(([label, value]) => ({ label, value }))} unit="animals" showShare />
          <Rule label="Wildlife Protection Act" />
          <Bars items={SCHEDULES.map(([label, value]) => ({ label, value }))} unit="animals" showShare />
          <p className="mt-3 text-[11px] text-[#9b958b]">
            The two instruments overlap — an animal can carry both, so the lists do not sum.
          </p>
        </Section>

        <Section icon={PawPrint} label="Non-regulatory" aside={fmt(TOTAL - REGULATORY)}>
          <Composition items={NON_REGULATORY.map(([label, value]) => ({ label, value }))} unit="animals" />
        </Section>

        <Section icon={Sparkles} label="Population events" aside="this month">
          <DrillList>
            {EVENTS.map((e) => (
              <DrillRow
                key={e.key}
                lead={e.icon}
                label={e.label}
                sub={e.sub}
                value={`${e.value > 0 ? '+' : e.value < 0 ? '−' : ''}${Math.abs(e.value)}`}
                tone={e.tone}
                onOpen={() => drill(e.label)}
              />
            ))}
          </DrillList>
          <Rule label="Net" />
          <Facts
            items={[
              { label: 'Opening · 30 Jun', value: '215,395' },
              { label: 'Closing · 31 Jul', value: fmt(TOTAL), delta: '+37', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={ListOrdered} label="Top species" aside={`10 of ${SPECIES_TOTAL}`}>
          <Filter
            options={['All', 'Actinopterygii', 'Aves', 'Malacostraca', 'Mammalia', 'Reptilia']}
            items={TOP_SPECIES}
            match={(r, option) => r.sub === option}
          >
            {(rows) => <Table head={['Species', 'Count', 'Share']} rows={rows} />}
          </Filter>
        </Section>

        <Section icon={Footprints} label="Enclosure occupancy" aside="96 enclosures">
          <NodeLauncher />
        </Section>
      </Stack>
    </>
  )
}

/**
 * Occupancy, which is the one animal-side question the Site → Species → Animal drill
 * cannot answer: it is a property of the ENCLOSURE, not of the animals in it.
 */
const OCCUPANCY = [
  {
    id: 'aquatic',
    label: 'Aquatic Halls',
    sub: '22 enclosures · 4 over 90%',
    value: 22,
    children: [
      { id: 'AQ-14', label: 'Tank 14', sub: '98% of capacity', value: 98, unit: '%', tone: 'bad' as const, facts: [{ label: 'Holding', value: '4,180' }, { label: 'Capacity', value: '4,270' }, { label: 'Species', value: '3' }, { label: 'Last survey', value: '12 Jul' }] },
      { id: 'AQ-09', label: 'Tank 9', sub: '91% of capacity', value: 91, unit: '%', tone: 'warn' as const, facts: [{ label: 'Holding', value: '3,640' }, { label: 'Capacity', value: '4,000' }, { label: 'Species', value: '2' }, { label: 'Last survey', value: '12 Jul' }] },
      { id: 'AQ-03', label: 'Tank 3', sub: '76% of capacity', value: 76, unit: '%', facts: [{ label: 'Holding', value: '2,280' }, { label: 'Capacity', value: '3,000' }, { label: 'Species', value: '4' }, { label: 'Last survey', value: '02 Jul' }] },
    ],
  },
  {
    id: 'aviary',
    label: 'Aviary Complex',
    sub: '24 enclosures · 1 over 90%',
    value: 24,
    children: [
      { id: 'AV-04', label: 'Flight 4', sub: '97% of capacity', value: 97, unit: '%', tone: 'bad' as const, facts: [{ label: 'Holding', value: '1,940' }, { label: 'Capacity', value: '2,000' }, { label: 'Species', value: '6' }, { label: 'Last survey', value: '09 Jul' }] },
      { id: 'AV-16', label: 'Flight 16', sub: '68% of capacity', value: 68, unit: '%', facts: [{ label: 'Holding', value: '1,020' }, { label: 'Capacity', value: '1,500' }, { label: 'Species', value: '4' }, { label: 'Last survey', value: '09 Jul' }] },
    ],
  },
  {
    id: 'savanna',
    label: 'Savanna',
    sub: '18 enclosures · 1 over 90%',
    value: 18,
    children: [
      { id: 'SV-09', label: 'Paddock 9', sub: '96% of capacity', value: 96, unit: '%', tone: 'warn' as const, facts: [{ label: 'Holding', value: '480' }, { label: 'Capacity', value: '500' }, { label: 'Species', value: '2' }, { label: 'Last survey', value: '18 Jul' }] },
      { id: 'SV-02', label: 'Paddock 2', sub: '71% of capacity', value: 71, unit: '%', facts: [{ label: 'Holding', value: '355' }, { label: 'Capacity', value: '500' }, { label: 'Species', value: '1' }, { label: 'Last survey', value: '18 Jul' }] },
    ],
  },
]

function NodeLauncher() {
  const { open } = useSheet()
  return (
    <DrillList>
      {OCCUPANCY.map((s) => (
        <DrillRow
          key={s.id}
          label={s.label}
          sub={s.sub}
          value={`${s.value}`}
          unit="enclosures"
          onOpen={() =>
            open({
              title: s.label,
              eyebrow: 'Enclosure occupancy',
              body: <NodePanel title="Enclosures" unit="% occupancy" nodes={s.children} trail={[s.label]} />,
            })
          }
        />
      ))}
      <DrillRow label="Over 95% occupancy" sub="Flagged as critical capacity" value="4" tone="bad" />
    </DrillList>
  )
}
