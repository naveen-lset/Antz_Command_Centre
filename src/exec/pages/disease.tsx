/**
 * DISEASE & OUTBREAK — the epidemiological view.
 *
 * Health & Medical counts patients; this counts pathogens. The difference matters
 * because one animal with a contagious diagnosis is a different problem from ten
 * with unrelated injuries — so nothing here is ranked by case volume alone.
 * Severity and containment sit above the ledger, and the two active outbreaks are
 * named before any total is given.
 */

import { Biohazard, Bug, MapPin, ShieldCheck, Siren, TrendingUp } from 'lucide-react'
import { report } from '../report'
import {
  Band,
  Bars,
  Donut,
  Facts,
  Hero,
  More,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  Stamp,
  Trend,
} from '../system'

export default function Disease() {
  return (
    <>
      <Hero
        icon={Biohazard}
        value="9"
        label="Diseases flagged"
        status="2 Active outbreaks"
        tone="bad"
        stats={[
          { value: '112', label: 'Cases' },
          { value: '6', label: 'Sites' },
          { value: '34', label: 'High severity' },
        ]}
      />
      <Stack>
        {/* Outbreaks first. A flagged disease is a record; an outbreak is a
            decision, and there are only ever a few. */}
        <Section icon={Siren} label="Outbreaks" aside="2 open">
          <Records
            items={[
              {
                label: 'Avian respiratory complex · Open Aviary 4',
                sub: '31 birds · 3 species · Aviary closed to transfers',
                value: 'Day 11',
                tone: 'bad',
              },
              {
                label: 'Aquatic fungal infection · Aquatic Hall 2',
                sub: '22 animals · Tank 9 filtration replaced 28 Jul',
                value: 'Day 6',
                tone: 'bad',
              },
            ]}
          />
        </Section>

        <Section icon={Bug} label="Flagged" aside={<More href="#/disease/records" />}>
          <Bars
            showShare
            items={[
              { label: 'Avian respiratory complex', value: 31, sub: 'Outbreak' },
              { label: 'Gastrointestinal parasitism', value: 26 },
              { label: 'Aquatic fungal infection', value: 22, sub: 'Outbreak' },
              { label: 'Dermatological', value: 18 },
              { label: 'Trauma-associated sepsis', value: 8 },
              { label: 'Herpesvirus', value: 4 },
              { label: 'Undetermined', value: 3 },
            ]}
          />
        </Section>

        {/* Undetermined is a segment, not a rounding error — three animals are
            flagged with no confirmed severity and the ring has to say so. */}
        <Section icon={Biohazard} label="Severity" aside="112 cases">
          <Donut
            label="Cases"
            unit="flagged animals"
            items={[
              { label: 'High', value: 34, tone: 'bad' },
              { label: 'Medium', value: 48 },
              { label: 'Low', value: 24 },
              { label: 'Undetermined', value: 6 },
            ]}
          />
        </Section>

        <Section icon={MapPin} label="Concentration" aside="6 sites">
          <Band
            label="Highest site"
            title="Open Aviary 4"
            sub="31 of 112 · one disease"
            value="28"
            unit="%"
            tone="bad"
          />
          <Rule label="Spread" />
          <Facts
            items={[
              { label: 'Aquatic Hall 2', sub: 'Fungal · Tank 9', value: '22', tone: 'bad' },
              { label: 'Zone A', sub: 'Parasitic · 2 herds', value: '19', tone: 'warn' },
              { label: 'Savanna Paddocks', sub: 'Parasitic · Dermatological', value: '17' },
              { label: 'Herpetarium', sub: 'Dermatological · Herpesvirus', value: '14' },
              { label: 'Aviary Complex', sub: 'Respiratory · contained', value: '9' },
            ]}
          />
        </Section>

        <Section icon={TrendingUp} label="Trend" aside="30 d">
          <Trend
            tone="bad"
            values={[4, 5, 5, 6, 6, 7, 7, 8, 9, 10, 11, 10, 9, 8, 7]}
            labels={['Week 1', 'Week 2', 'Week 3', 'Week 4']}
            unit="112 newly flagged · 2-day buckets"
          />
        </Section>

        <Section icon={ShieldCheck} label="Containment">
          <Snapshot
            cols={2}
            items={[
              { label: 'Under isolation', value: '53', note: 'Of 112' },
              { label: 'Screened', value: '486', note: 'Contact animals' },
              { label: 'Cleared this month', value: '41', tone: 'good' },
              { label: 'Sites under movement hold', value: '2', tone: 'bad' },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
