/**
 * ANIMALS — the register.
 *
 * Numbers only. Every word on this page names a number; none explains one.
 * Section headings are one word, sub-labels are tokens, and there is no prose
 * anywhere — the composition, not the copy, carries the reading order.
 */

import {
  Building2,
  HeartPulse,
  Layers,
  ListOrdered,
  PawPrint,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  Bars,
  Composition,
  Dial,
  Facts,
  Highlights,
  Hero,
  Movers,
  Poles,
  Rule,
  Scoreboard,
  Section,
  Stack,
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

        {/* Three extremes in one card. Separate cards for each would have made the
            page read as a list of widgets rather than a single executive fact. */}
        <Section icon={Scale} label="Extremes">
          <Poles
            caption={['Largest', 'Smallest']}
            high={{ value: '12,400', label: 'Common Carp', sub: 'Fish' }}
            low={{ value: '4', label: 'Sangai Deer', sub: 'Critically Endangered' }}
          />
          <Rule label="Sites" />
          <Poles
            caption={['Highest', 'Lowest']}
            high={{ value: '78,420', label: 'Jamnagar Core', sub: '36%' }}
            low={{ value: '11,822', label: 'Quarantine', sub: '5%' }}
          />
          <Rule label="Occupancy" />
          <Poles
            caption={['Highest', 'Lowest']}
            high={{ value: '104%', label: 'Aquatic Hall 2', sub: '2,480 of 2,400' }}
            low={{ value: '22%', label: 'Quarantine Ward C', sub: '18 of 80' }}
            lowTone="warn"
          />
        </Section>

        <Section icon={Layers} label="Distribution" aside="6 classes">
          <Composition
            unit="animals"
            items={[
              { label: 'Fish', value: 84200 },
              { label: 'Invertebrates', value: 52400 },
              { label: 'Birds', value: 38600 },
              { label: 'Mammals', value: 21900 },
              { label: 'Reptiles', value: 12850 },
              { label: 'Amphibians', value: 5482 },
            ]}
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
              { label: 'Common Carp', sub: 'Fish', cells: ['12,400', '+180'] },
              { label: 'Zebra Finch', sub: 'Bird', cells: ['6,820', '+182'] },
              { label: 'Nile Tilapia', sub: 'Fish', cells: ['5,940', '+96'] },
              { label: 'Indian Peafowl', sub: 'Bird', cells: ['4,310', '+22'] },
              { label: 'Rose Shrimp', sub: 'Invertebrate', cells: ['3,880', '+74'] },
              { label: 'Silver Barb', sub: 'Fish', cells: ['2,940', '+12'] },
              { label: 'Rock Pigeon', sub: 'Bird', cells: ['2,210', '−6'] },
              { label: 'Grey Francolin', sub: 'Bird', cells: ['1,640', '−18'] },
              { label: 'Bengal Fox', sub: 'Mammal', cells: ['1,280', '+4'] },
              { label: 'Flapshell Turtle', sub: 'Reptile', cells: ['1,090', '+8'] },
            ]}
          />
        </Section>

        <Section icon={TrendingUp} label="Movers" aside="30 d">
          <Movers
            items={[
              { label: 'Zebra Finch', sub: 'Bird', delta: 182 },
              { label: 'Common Carp', sub: 'Fish', delta: 180 },
              { label: 'Nile Tilapia', sub: 'Fish', delta: 96 },
              { label: 'Rose Shrimp', sub: 'Invertebrate', delta: 74 },
              { label: 'Chital', sub: 'Mammal', delta: -9 },
              { label: 'Grey Francolin', sub: 'Bird', delta: -18 },
              { label: 'Mallard', sub: 'Bird', delta: -24 },
            ]}
          />
        </Section>

        <Section icon={Sparkles} label="Month" aside="vs June">
          <Facts
            size="lg"
            items={[
              { label: 'Births', sub: '24 species', value: '45', delta: '+12%' },
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

        <Section icon={HeartPulse} label="Health">
          <Dial
            percent={97.4}
            value="97.4"
            unit="%"
            label="No open flag"
            benchmark={95}
            benchmarkLabel="Target 95% · 5,601 flagged"
          />
        </Section>

        <Section icon={Sparkles} label="Highlights">
          <Highlights
            items={[
              { tag: 'Growth', value: '+3,452', label: 'Year' },
              { tag: 'Threatened', value: '13,012', label: 'Vulnerable or worse', tone: 'warn' },
              { tag: 'Concentration', value: '36%', label: 'Jamnagar Core' },
              { tag: 'Over capacity', value: '104%', label: 'Aquatic Hall 2', tone: 'bad' },
              { tag: 'Under used', value: '22%', label: 'Quarantine Ward C', tone: 'warn' },
              { tag: 'Endangered', value: '388', label: 'Critically', tone: 'bad' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
