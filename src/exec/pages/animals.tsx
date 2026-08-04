/**
 * ANIMAL POPULATION — the register.
 *
 * Numbers only. Every word on this page names a number; none explains one.
 * Section headings are one word, sub-labels are tokens, and there is no prose
 * anywhere — the composition, not the copy, carries the reading order.
 *
 * Classes are named scientifically and counted individually. "Fish" collapsed
 * ray-finned fish, sharks and lungfish into one bar, which is fine for a poster and
 * useless for a collection plan — those are three husbandry systems.
 */

import {
  Building2,
  Layers,
  ListOrdered,
  PawPrint,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Venus,
} from 'lucide-react'
import { report } from '../report'
import {
  Bars,
  Composition,
  Facts,
  Hero,
  Movers,
  Poles,
  Rule,
  Scoreboard,
  Section,
  Snapshot,
  Stack,
  Stamp,
  Table,
} from '../system'

export default function Animals() {
  return (
    <>
      <Hero
        icon={PawPrint}
        value="215,432"
        label="Animals"
        status="+324 Month"
        tone="good"
        stats={[
          { value: '428', label: 'Species' },
          { value: '6', label: 'Sites' },
          { value: '96', label: 'Enclosures' },
        ]}
      />
      <Stack>
        {/* Undetermined is the majority answer, not missing data: most of a
            collection this size is fish and invertebrates that are never sexed. */}
        <Section icon={Venus} label="Sex" aside="215,432">
          <Scoreboard
            items={[
              { value: '18,204', label: 'Male' },
              { value: '16,880', label: 'Female' },
              { value: '180,348', label: 'Undetermined' },
            ]}
          />
          <Rule label="Sexed" />
          <Facts
            items={[
              { label: 'Determined', sub: '16% of collection', value: '35,084' },
              { label: 'Sex ratio', sub: 'Male to female', value: '1.08 : 1' },
            ]}
          />
        </Section>

        <Section icon={Building2} label="Scale">
          <Scoreboard
            items={[
              { value: '92', label: 'Occupied' },
              { value: '4', label: 'Vacant' },
              { value: '+6', label: 'Species, quarter' },
              { value: '1.6', unit: '%', label: 'Growth, year' },
            ]}
          />
        </Section>

        {/* Nine classes as counts, three to a row — the report's own grid. A stacked
            bar for nine segments produced four slivers with no readable share. */}
        <Section icon={Layers} label="Class composition" aside="9 classes">
          <Snapshot
            cols={3}
            items={[
              { label: 'Actinopterygii', value: '77,840', note: 'Ray-finned fish' },
              { label: 'Aves', value: '38,600', note: 'Birds' },
              { label: 'Malacostraca', value: '34,180', note: 'Crustaceans' },
              { label: 'Mammalia', value: '21,900' },
              { label: 'Reptilia', value: '12,850' },
              { label: 'Insecta', value: '12,220' },
              { label: 'Chondrichthyes', value: '8,120', note: 'Sharks, rays' },
              { label: 'Amphibia', value: '5,482' },
              { label: 'Euchelicerata', value: '4,240', note: 'Arachnids' },
            ]}
          />
          <Rule label="Share" />
          <Composition
            unit="animals"
            items={[
              { label: 'Actinopterygii', value: 77840 },
              { label: 'Aves', value: 38600 },
              { label: 'Malacostraca', value: 34180 },
              { label: 'Mammalia', value: 21900 },
              { label: 'Reptilia', value: 12850 },
              { label: 'Other · 4 classes', value: 30062 },
            ]}
          />
        </Section>

        <Section icon={Scale} label="Extremes">
          <Poles
            caption={['Largest', 'Smallest']}
            high={{ value: '12,400', label: 'Common Carp', sub: 'Actinopterygii' }}
            low={{ value: '4', label: 'Sangai Deer', sub: 'Critically Endangered' }}
          />
          <Rule label="Sites" />
          <Poles
            caption={['Highest', 'Lowest']}
            high={{ value: '78,420', label: 'Jamnagar Core', sub: '36%' }}
            low={{ value: '11,822', label: 'Quarantine', sub: '5%' }}
          />
        </Section>

        <Section icon={ShieldAlert} label="Conservation" aside="IUCN">
          <Bars
            showShare
            items={[
              { label: 'Least Concern', value: 178240 },
              { label: 'Near Threatened', value: 24180 },
              { label: 'Vulnerable', value: 9640 },
              { label: 'Endangered', value: 2984 },
              { label: 'Critically Endangered', value: 388 },
            ]}
          />
        </Section>

        <Section icon={ListOrdered} label="Top species" aside="10">
          <Table
            head={['Species', 'Count', '30 d']}
            rows={[
              { label: 'Common Carp', sub: 'Actinopterygii', cells: ['12,400', '+180'] },
              { label: 'Zebra Finch', sub: 'Aves', cells: ['6,820', '+182'] },
              { label: 'Nile Tilapia', sub: 'Actinopterygii', cells: ['5,940', '+96'] },
              { label: 'Indian Peafowl', sub: 'Aves', cells: ['4,310', '+22'] },
              { label: 'Rose Shrimp', sub: 'Malacostraca', cells: ['3,880', '+74'] },
              { label: 'Silver Barb', sub: 'Actinopterygii', cells: ['2,940', '+12'] },
              { label: 'Rock Pigeon', sub: 'Aves', cells: ['2,210', '−6'] },
              { label: 'Grey Francolin', sub: 'Aves', cells: ['1,640', '−18'] },
              { label: 'Bengal Fox', sub: 'Mammalia', cells: ['1,280', '+4'] },
              { label: 'Flapshell Turtle', sub: 'Reptilia', cells: ['1,090', '+8'] },
            ]}
          />
        </Section>

        <Section icon={TrendingUp} label="Movers" aside="30 d">
          <Movers
            items={[
              { label: 'Zebra Finch', sub: 'Aves', delta: 182 },
              { label: 'Common Carp', sub: 'Actinopterygii', delta: 180 },
              { label: 'Nile Tilapia', sub: 'Actinopterygii', delta: 96 },
              { label: 'Rose Shrimp', sub: 'Malacostraca', delta: 74 },
              { label: 'Chital', sub: 'Mammalia', delta: -9 },
              { label: 'Grey Francolin', sub: 'Aves', delta: -18 },
              { label: 'Mallard', sub: 'Aves', delta: -24 },
            ]}
          />
        </Section>

        <Section icon={Sparkles} label="Month" aside="vs June">
          <Facts
            size="lg"
            items={[
              { label: 'Births', sub: '24 species', value: '45', delta: '+12%' },
              { label: 'Accessions', sub: '6 sources', value: '18', delta: '+6' },
              { label: 'Deaths', sub: '0.011%', value: '23', delta: '−18%' },
              { label: 'Transfers', sub: '12 in · 9 out · 7 internal', value: '28', delta: '+8' },
              { label: 'Net', sub: 'Month 12', value: '+324', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={PawPrint} label="New species" aside="6, quarter">
          <Facts
            items={[
              { label: 'Sangai Deer', sub: '12 Jun', value: '4' },
              { label: 'Indian Skimmer', sub: '28 May', value: '6' },
              { label: 'Fishing Cat', sub: '19 May', value: '2' },
              { label: 'Malabar Pit Viper', sub: '04 May', value: '3' },
              { label: 'Painted Stork', sub: '22 Apr', value: '8' },
              { label: 'Grey Junglefowl', sub: '09 Apr', value: '3' },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
