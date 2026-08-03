/**
 * ANIMALS — a census.
 *
 * Composition: what we hold → what it's made of → where it sits → who dominates.
 * Opens on composition, not time: a director asks "what have we got" before
 * "how has it changed". The 12-month trend appears once, small, as a footnote.
 */

import { Bars, Composition, Digest, Events, Figure, Hero, Insights, Ledger, MetricGrid, Section, Spark, Tray } from '../system'

export default function Animals() {
  return (
    <>
      <Hero
        value="215,432"
        label="Total animals under management"
        context="Across 6 sites and 428 species. Population has grown every month for a year."
        status="+324 this month"
        tone="good"
      />

      <Section label="Executive summary" band>
        <Digest>
          The collection is stable and growing slowly — <strong>+1.6% over twelve months</strong> with no
          month of net decline. Fish and invertebrates account for two-thirds of headcount but under a
          fifth of enclosure space; mammals and birds drive most of the operational load. Four of 96
          enclosures sit empty, all in Quarantine &amp; Rescue.
        </Digest>
      </Section>

      <Section label="Population composition" aside={<span className="text-[12px] text-[#b3aea6]">by class</span>}>
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

      <Section label="Scale">
        <MetricGrid
          cols={2}
          items={[
            { label: 'Sites', value: '6', note: 'All reporting' },
            { label: 'Species', value: '428', note: '+6 this quarter' },
            { label: 'Enclosures', value: '96', note: '92 occupied' },
            { label: 'Annual growth', value: '1.6', unit: '%', note: 'Trailing 12 months' },
          ]}
        />
      </Section>

      <Section label="Where they are" band>
        <Bars
          showShare
          items={[
            { label: 'Jamnagar Core', value: 78420, sub: '28 enclosures' },
            { label: 'Wetland Reserve', value: 46900, sub: '19' },
            { label: 'Aviary Complex', value: 31250, sub: '17' },
            { label: 'Marine Zone', value: 24860, sub: '14' },
            { label: 'Reptile House', value: 22180, sub: '12' },
            { label: 'Quarantine & Rescue', value: 11822, sub: '6' },
          ]}
        />
      </Section>

      <Section label="Enclosure occupancy" aside={<span className="text-[12px] text-[#b3aea6]">92 of 96</span>}>
        <Tray
          cols={3}
          legend="Four vacant units, all in Quarantine & Rescue — capacity held deliberately for intake."
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

      <Section label="Largest holdings" band>
        <Ledger
          items={[
            { label: 'Common Carp', sub: 'Fish · Aquatic Halls', value: '12,400', share: 100 },
            { label: 'Zebra Finch', sub: 'Bird · Open Aviaries', value: '6,820', share: 55 },
            { label: 'Nile Tilapia', sub: 'Fish · Aquatic Halls', value: '5,940', share: 48 },
            { label: 'Indian Peafowl', sub: 'Bird · Aviary Complex', value: '4,310', share: 35 },
            { label: 'Bengal Fox', sub: 'Mammal · Savanna Paddocks', value: '1,280', share: 10 },
          ]}
        />
      </Section>

      <Section label="Conservation status" aside={<span className="text-[12px] text-[#b3aea6]">IUCN</span>}>
        <Bars
          showShare
          items={[
            { label: 'Least Concern', value: 178240 },
            { label: 'Vulnerable', value: 24180 },
            { label: 'Endangered', value: 9640 },
            { label: 'Critically Endangered', value: 3372 },
          ]}
        />
        <p className="mt-4 text-[13px] leading-[20px] text-[#55524a]">
          <strong className="font-medium text-[#16150f]">13,012 animals</strong> are Endangered or
          Critically Endangered — 6.1% of the collection, held across 24 species.
        </p>
      </Section>

      <Section label="Twelve-month trend" band tight>
        <div className="flex items-end gap-5">
          <span className="shrink-0">
            <Figure value="+3,452" size={26} />
            <span className="mt-0.5 block text-[12px] text-[#8a8680]">net change</span>
          </span>
          <span className="min-w-0 flex-1">
            <Spark values={[211980, 212410, 212790, 213120, 213460, 213820, 214150, 214420, 214690, 214930, 215108, 215432]} />
          </span>
        </div>
      </Section>

      <Section label="AI insights">
        <Insights
          items={[
            {
              text: 'Quarantine & Rescue is the only site below capacity and the only one flagged on welfare. Its 4 vacant units are the constraint on new intake, not enclosure count overall.',
              tone: 'warn',
            },
            {
              text: 'Fish account for 39% of headcount but sit in 14 units. A single water-quality incident in Aquatic Halls would affect more animals than any other failure mode on site.',
              tone: 'warn',
            },
            {
              text: 'Species count grew +6 this quarter while headcount grew 0.4% — the collection is diversifying rather than simply expanding.',
            },
          ]}
        />
      </Section>

      <Section label="Notable this week" band>
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
    </>
  )
}
