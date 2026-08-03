/**
 * MORTALITY — the review.
 *
 * Deliberately sober: no leaderboards, no praise language. Four numbers, the
 * causes, where it concentrated, the trend, the open necropsies and what was
 * done. The Pareto is the only chart — two causes carry 65% of the month.
 */

import { Activity, ClipboardCheck, ListChecks, MapPin, ShieldCheck, TrendingDown } from 'lucide-react'
import {
  Band,
  Columns,
  Events,
  Facts,
  Highlights,
  Hero,
  Pareto,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
} from '../system'

export default function Mortality() {
  return (
    <>
      <Hero
        icon={Activity}
        value="23"
        label="Deaths"
        status="−18% Month"
        tone="good"
        stats={[
          { value: '0.011', unit: '%', label: 'Rate' },
          { value: '0.018', unit: '%', label: 'Benchmark' },
          { value: '6', label: 'Months falling' },
        ]}
      />
      <Stack>
        <Section icon={Activity} label="Month" aside="July">
          <Snapshot
            cols={4}
            items={[
              { label: 'Deaths', value: '23', note: '−5 June' },
              { label: 'Rate', value: '0.011', unit: '%', note: 'Benchmark 0.018' },
              { label: '7-day', value: '5', note: 'Prior 6' },
              { label: 'Avg age', value: '6.2', unit: 'y', note: '78% lifespan' },
            ]}
          />
        </Section>

        {/* The accident split rides under the Pareto rather than taking its own
            card — three deaths don't earn a section, but the breakdown is data. */}
        <Section icon={ListChecks} label="Causes" aside="65% top two">
          <Pareto
            items={[
              { label: 'Natural causes', value: 9 },
              { label: 'Old age', value: 6 },
              { label: 'Disease', value: 5 },
              { label: 'Accident', value: 3 },
            ]}
          />
          <Rule label="Accidents" />
          <Facts
            items={[
              { label: 'Enclosure falls', sub: 'Savanna', value: '2' },
              { label: 'Fence injury', sub: 'Savanna', value: '1' },
            ]}
          />
        </Section>

        <Section icon={MapPin} label="Concentration" aside="6 sites">
          <Band label="Highest species" title="Giant Prawn" sub="AQ-204 · 26 Jul" value="6" unit="deaths" tone="bad" />
          {/* Stacked, not a Duo — half-width bands would shrink the two figures
              that the section exists to compare. */}
          <div className="mt-2.5">
            <Band
              label="Highest site"
              title="Aquatic Halls"
              sub="11 of 23 · 6 AQ-204"
              value="48"
              unit="%"
              tone="warn"
            />
          </div>
          <Rule label="Ex event" />
          <Facts
            items={[
              { label: 'Aquatic Halls', sub: 'Ex AQ-204', value: '5' },
              { label: 'Site maximum', sub: 'Five other sites', value: '5' },
            ]}
          />
        </Section>

        <Section icon={TrendingDown} label="Trend" aside="6 months">
          <Columns
            values={[30, 27, 26, 29, 25, 23]}
            labels={['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']}
            unit="Deaths, month"
          />
        </Section>

        <Section icon={ClipboardCheck} label="Necropsy" aside="4 open">
          <Records
            items={[
              { label: 'Giant Prawn · AQ-204', sub: 'Water panel · Partner lab', value: '3 d', tone: 'bad' },
              { label: 'Zebra Finch · ANM-33810', sub: 'Histopathology · Partner lab', value: '2 d', tone: 'warn' },
              { label: 'Chital · ANM-19042', sub: 'Fence injury · Dr. Mehta', value: '1 d', tone: 'warn' },
              { label: 'Mallard · ANM-30119', sub: 'Report drafting', value: '1 d' },
            ]}
          />
        </Section>

        <Section icon={ShieldCheck} label="Actions" aside="July">
          <Events
            items={[
              { when: '28 Jul', label: 'Filtration service · Tank 9', sub: 'High priority', tone: 'good' },
              { when: '27 Jul', label: 'Fence inspection · Zone A', sub: 'Chital', tone: 'warn' },
              { when: '25 Jul', label: 'Respiratory screening · Aviary 4', sub: 'Birds', value: '340' },
              { when: '22 Jul', label: 'Cohort review · Aquatic Halls', sub: 'Past lifespan', value: '41' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Highlights">
          <Highlights
            items={[
              { tag: 'Single event', value: '6', label: 'AQ-204', tone: 'warn' },
              { tag: 'Ex event', value: '17', label: 'Record low', tone: 'good' },
              { tag: 'Rate', value: '0.011', unit: '%', label: 'Sector 0.018%' },
              { tag: 'Streak', value: '6', label: 'Months falling', tone: 'good' },
              { tag: 'Backlog', value: '4', label: 'Necropsies open', tone: 'bad' },
              { tag: 'Ageing', value: '78', unit: '%', label: 'Lifespan · 71% prior' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
