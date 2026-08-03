/** MORTALITY — a causes review. Pareto-led, sober register. */
import { Activity, ClipboardCheck, Columns3, Layers, ListChecks } from 'lucide-react'
import { Columns, Composition, Events, Hero, MetricGrid, Pareto, Records, Section, Stack } from '../system'

export default function Mortality() {
  return (
    <>
      <Hero
        icon={Activity}
        value="23"
        label="Deaths this month"
        side={{ value: '0.011%', label: 'of collection' }}
        context="Benchmark for comparable collections is 0.018%. Seven-day average 9.4, down from 11.2."
        status="−18% vs June"
        tone="good"
      />
      <Stack>
        <Section icon={ListChecks} label="Causes of death" aside="cumulative">
          <Pareto
            items={[
              { label: 'Natural', value: 9 },
              { label: 'Old age', value: 6 },
              { label: 'Disease', value: 5 },
              { label: 'Accident', value: 3 },
            ]}
          />
        </Section>

        <Section icon={Layers} label="By taxon">
          <Composition
            items={[
              { label: 'Fish', value: 8 },
              { label: 'Invertebrates', value: 6 },
              { label: 'Birds', value: 4 },
              { label: 'Mammals', value: 3 },
              { label: 'Reptiles', value: 2 },
            ]}
          />
        </Section>

        <Section icon={Columns3} label="Monthly trend" aside="6 months">
          <Columns values={[30, 27, 26, 29, 25, 23]} labels={['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']} unit="deaths" />
        </Section>

        <Section icon={ClipboardCheck} label="Necropsy queue" aside="4 pending">
          <Records
            items={[
              { label: 'Giant Prawn batch · AQ-204', sub: 'Water panel pending — day 3', value: '3 d', tone: 'bad' },
              { label: 'Zebra Finch · ANM-33810', sub: 'Sample at lab — day 2', value: '2 d', tone: 'warn' },
              { label: 'Chital · ANM-19042', sub: 'Awaiting Dr. Mehta', value: '1 d', tone: 'warn' },
              { label: 'Mallard · ANM-30119', sub: 'Report drafting', value: '1 d' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Rate against benchmark">
          <MetricGrid
            cols={3}
            items={[
              { label: 'This month', value: '23', note: '−18% vs June' },
              { label: '7-day average', value: '9.4', note: 'was 11.2' },
              { label: 'Benchmark', value: '0.018', unit: '%', note: 'we are 0.011%' },
            ]}
          />
        </Section>

        <Section icon={ListChecks} label="Corrective actions">
          <Events
            items={[
              { when: '28 Jul', text: 'Tank 9 water quality corrected after prawn losses', tone: 'good' },
              { when: '27 Jul', text: 'Zone A perimeter fence flagged after Chital fence injury', tone: 'warn' },
              { when: '25 Jul', text: 'Aviary 4 respiratory screening extended to all 340 birds' },
              { when: '22 Jul', text: 'Senior cohort review scheduled for Aquatic Halls' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
