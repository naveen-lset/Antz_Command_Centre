/**
 * ANIMALS — a census.
 *
 * What we hold → what it's made of → where it sits → who dominates. Opens on
 * composition, not time: a director asks "what have we got" before "how has it
 * changed". The 12-month trend appears once, small, near the end.
 */

import { Building2, Compass, Grid3x3, Layers, PawPrint, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'
import { AccentProvider, Bars, Composition, Events, Figure, Hero, Ledger, MetricGrid, Section, Spark, Stack, Tray } from '../system'

const ACCENT = '#2f9e5b'

export default function Animals() {
  return (
    <AccentProvider value={ACCENT}>
      <Hero
        icon={PawPrint}
        value="215,432"
        label="Total animals under management"
        context="Across 6 sites and 428 species. Population has grown every month for a year."
        status="+324 this month"
        tone="good"
      />
      <Stack>
        <Section icon={Layers} label="Population composition" aside="by class">
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

        <Section icon={Compass} label="Scale">
          <MetricGrid
            items={[
              { label: 'Sites', value: '6', note: 'All reporting' },
              { label: 'Species', value: '428', note: '+6 this quarter' },
              { label: 'Enclosures', value: '96', note: '92 occupied' },
              { label: 'Annual growth', value: '1.6', unit: '%', note: 'Trailing 12 months' },
            ]}
          />
        </Section>

        <Section icon={Building2} label="Where they are" aside="6 sites">
          <Bars
            showShare
            items={[
              { label: 'Jamnagar Core', value: 78420, sub: '28 units' },
              { label: 'Wetland Reserve', value: 46900, sub: '19' },
              { label: 'Aviary Complex', value: 31250, sub: '17' },
              { label: 'Marine Zone', value: 24860, sub: '14' },
              { label: 'Reptile House', value: 22180, sub: '12' },
              { label: 'Quarantine & Rescue', value: 11822, sub: '6' },
            ]}
          />
        </Section>

        <Section icon={Grid3x3} label="Enclosure occupancy" aside="92 of 96">
          <Tray
            cols={3}
            cells={[
              { value: '28/28', label: 'Jamnagar Core' },
              { value: '19/19', label: 'Wetland' },
              { value: '17/17', label: 'Aviary' },
              { value: '14/14', label: 'Marine' },
              { value: '12/12', label: 'Reptile House' },
              { value: '2/6', label: 'Quarantine', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Sparkles} label="Largest holdings">
          <Ledger
            items={[
              { label: 'Common Carp', sub: 'Fish · Aquatic Halls', value: '12,400', share: 100 },
              { label: 'Zebra Finch', sub: 'Bird · Open Aviaries', value: '6,820', share: 55 },
              { label: 'Nile Tilapia', sub: 'Fish · Aquatic Halls', value: '5,940', share: 48 },
              { label: 'Indian Peafowl', sub: 'Bird · Aviary Complex', value: '4,310', share: 35 },
              { label: 'Bengal Fox', sub: 'Mammal · Savanna', value: '1,280', share: 10 },
            ]}
          />
        </Section>

        <Section icon={ShieldAlert} label="Conservation status" aside="IUCN">
          <Bars
            showShare
            items={[
              { label: 'Least Concern', value: 178240 },
              { label: 'Vulnerable', value: 24180 },
              { label: 'Endangered', value: 9640 },
              { label: 'Critically Endangered', value: 3372 },
            ]}
          />
        </Section>

        <Section icon={TrendingUp} label="Twelve-month trend" aside="+3,452 net">
          <div className="flex items-end gap-4">
            <span className="shrink-0">
              <Figure value="215,432" size={24} />
              <span className="mt-0.5 block text-[11px] text-[#9b958b]">today</span>
            </span>
            <span className="min-w-0 flex-1">
              <Spark values={[211980, 212410, 212790, 213120, 213460, 213820, 214150, 214420, 214690, 214930, 215108, 215432]} />
            </span>
          </div>
        </Section>

        <Section icon={PawPrint} label="Notable this week">
          <Events
            items={[
              { when: '13:40', text: '2 Blackbuck calves born at Savanna Paddock 3, both healthy', tone: 'good' },
              { when: '12:05', text: '6 Indian Peafowl moved to Open Aviary 7' },
              { when: '09:15', text: '1 senior Nile Tilapia died of natural causes, Aquatic Hall 2', tone: 'bad' },
              { when: '08:04', text: '3 Star Tortoise received from Sasan Rescue Centre' },
              { when: '28 Jul', text: '18 Zebra Finch hatchlings added to the registry' },
            ]}
          />
        </Section>
      </Stack>
    </AccentProvider>
  )
}
