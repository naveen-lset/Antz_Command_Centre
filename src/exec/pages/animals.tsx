/**
 * ANIMALS — the register.
 *
 * Personality: an institutional inventory read out loud. Scale first, then the
 * two ends of every distribution (a director asks "biggest and smallest" before
 * "distribution"), then the named holdings, then what moved. One chart shape in
 * the whole page — the composition bar — plus a single dial for the verdict.
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
  Snapshot,
  Stack,
  Table,
} from '../system'

export default function Animals() {
  return (
    <>
      <Hero
        icon={PawPrint}
        value="215,432"
        label="Total animals under management"
        side={{ value: '428', label: 'species' }}
        context="Six sites, 96 enclosures. Twelve consecutive months of net growth."
        status="+324 this month · +3,452 this year"
        tone="good"
      />
      <Stack>
        <Section icon={Building2} label="Scale of the collection">
          <Scoreboard
            items={[
              { value: '6', label: 'Sites, all reporting' },
              { value: '96', label: 'Enclosures, 92 occupied' },
              { value: '428', label: 'Species, +6 this quarter' },
              { value: '1.6', unit: '%', label: 'Growth, 12 months' },
            ]}
          />
        </Section>

        {/* Three extremes in one card. Separate cards for each would have made the
            page read as a list of widgets rather than a single executive fact. */}
        <Section icon={Scale} label="The two ends of the collection">
          <Poles
            caption={['Largest holding', 'Smallest holding']}
            high={{ value: '12,400', label: 'Common Carp', sub: 'Fish · Aquatic Halls' }}
            low={{ value: '4', label: 'Sangai Deer', sub: 'Critically Endangered · Zone A' }}
          />
          <Rule label="Sites" />
          <Poles
            caption={['Most populated', 'Least populated']}
            high={{ value: '78,420', label: 'Jamnagar Core', sub: '36% of collection · 28 enclosures' }}
            low={{ value: '11,822', label: 'Quarantine & Rescue', sub: '5% · 6 enclosures' }}
          />
          <Rule label="Enclosures" />
          <Poles
            caption={['Fullest', 'Emptiest']}
            high={{ value: '104%', label: 'Aquatic Hall 2', sub: '2,480 against 2,400 design capacity' }}
            low={{ value: '22%', label: 'Quarantine Ward C', sub: '18 of 80 places used' }}
            lowTone="warn"
          />
        </Section>

        <Section icon={Layers} label="Taxonomic distribution" aside="6 classes">
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

        <Section icon={ShieldAlert} label="IUCN status" aside="13,012 threatened">
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

        <Section icon={ListOrdered} label="Top 10 species" aside="by head-count">
          <Table
            head={['Species', 'Count', '30 d']}
            rows={[
              { label: 'Common Carp', sub: 'Fish · Aquatic Halls', cells: ['12,400', '+180'] },
              { label: 'Zebra Finch', sub: 'Bird · Open Aviaries', cells: ['6,820', '+182'] },
              { label: 'Nile Tilapia', sub: 'Fish · Aquatic Halls', cells: ['5,940', '+96'] },
              { label: 'Indian Peafowl', sub: 'Bird · Aviary Complex', cells: ['4,310', '+22'] },
              { label: 'Rose Shrimp', sub: 'Invertebrate · Marine Zone', cells: ['3,880', '+74'] },
              { label: 'Silver Barb', sub: 'Fish · Wetland Reserve', cells: ['2,940', '+12'] },
              { label: 'Rock Pigeon', sub: 'Bird · Aviary Complex', cells: ['2,210', '−6'] },
              { label: 'Grey Francolin', sub: 'Bird · Open Aviaries', cells: ['1,640', '−18'] },
              { label: 'Bengal Fox', sub: 'Mammal · Savanna', cells: ['1,280', '+4'] },
              { label: 'Flapshell Turtle', sub: 'Reptile · Wetland Reserve', cells: ['1,090', '+8'] },
            ]}
          />
        </Section>

        <Section icon={TrendingUp} label="Growing and declining" aside="30-day change">
          <Movers
            items={[
              { label: 'Zebra Finch', sub: 'Hatchings plus rescue intake', delta: 182 },
              { label: 'Common Carp', sub: 'Spawning season in Aquatic Halls', delta: 180 },
              { label: 'Nile Tilapia', sub: 'Batch recruitment, Hall 2', delta: 96 },
              { label: 'Rose Shrimp', sub: 'Marine Zone breeding tanks', delta: 74 },
              { label: 'Chital', sub: 'Two transfers out, one fence injury', delta: -9 },
              { label: 'Grey Francolin', sub: 'Respiratory losses in Aviary 4', delta: -18 },
              { label: 'Mallard', sub: 'Outbound to Junagadh Zoo', delta: -24 },
            ]}
          />
        </Section>

        <Section icon={Sparkles} label="This month">
          <Snapshot
            cols={4}
            items={[
              { label: 'Births', value: '45', note: '+12% vs June' },
              { label: 'Deaths', value: '23', note: '−18% vs June' },
              { label: 'Transfers', value: '28', note: '12 in · 9 out' },
              { label: 'Net', value: '+324', note: 'Head-count', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={PawPrint} label="Newly added species" aside="6 this quarter">
          <Facts
            items={[
              { label: 'Sangai Deer', sub: 'Zone A · from Keibul Lamjao · 12 Jun', value: '4' },
              { label: 'Indian Skimmer', sub: 'Wetland Reserve · rescue intake · 28 May', value: '6' },
              { label: 'Fishing Cat', sub: 'Wetland Reserve · breeding loan · 19 May', value: '2' },
              { label: 'Malabar Pit Viper', sub: 'Herpetarium · 04 May', value: '3' },
              { label: 'Painted Stork · Indian Skimmer', sub: 'Two further species registered in April', value: '11' },
            ]}
          />
        </Section>

        <Section icon={HeartPulse} label="Collection health">
          <Dial
            percent={97.4}
            value="97.4"
            unit="%"
            label="No open medical, welfare or nutrition flag"
            benchmark={95}
            benchmarkLabel="Internal target 95% · 5,601 animals carry an open flag"
          />
        </Section>

        <Section icon={Sparkles} label="Collection highlights">
          <Highlights
            items={[
              {
                tag: 'Growth',
                text: 'Twelfth consecutive month of net growth. The year added 3,452 animals, and births plus hatchings outpaced deaths four to one.',
              },
              {
                tag: 'Concentration',
                text: 'Jamnagar Core holds 36% of everything we have. Aquatic Hall 2 is 4% over design capacity and should be relieved before the monsoon intake.',
                tone: 'warn',
              },
              {
                tag: 'Conservation',
                text: '13,012 animals — 6% of the collection — are Near Threatened or worse. The four Sangai Deer are the only Critically Endangered mammals on site.',
              },
              {
                tag: 'Attention',
                text: 'Quarantine & Rescue sits at 22% occupancy while two sites are full. Intake routing is not using the space that already exists.',
                tone: 'bad',
              },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
