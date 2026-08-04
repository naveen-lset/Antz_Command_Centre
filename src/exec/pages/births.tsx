/**
 * BIRTH ANALYTICS — the nursery.
 *
 * The only forward-facing sheet in the set, so the month grid opens the page and
 * the count sits above it in the hero. Performance is stated against the house
 * target and nothing else — the three-year average was a benchmark dressed as a
 * note, and this page is not a scorecard.
 *
 * Losses before birth used to live here as five words on a target bar. They are a
 * module now; what remains is the handoff to it, because a delivery-success figure
 * that quietly excludes five fetal deaths is a figure that misleads.
 */

import {
  Award,
  Baby,
  CalendarDays,
  Eye,
  Gauge,
  Home,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { report } from '../report'
import {
  Band,
  BulletGroup,
  Calendar,
  Duo,
  Facts,
  Ladder,
  More,
  PeriodHero,
  Records,
  Rule,
  Scoreboard,
  Section,
  Sites,
  Stack,
  Stamp,
  Trend,
} from '../system'

export default function Births() {
  return (
    <>
      <PeriodHero
        slug="births"
        icon={Sparkles}
        value="45"
        label="Births"
        status="+12% Month"
        tone="good"
        stats={[
          { value: '38', label: 'Expected' },
          { value: '24', label: 'Species' },
          { value: '4', label: 'High risk' },
        ]}
      />
      <Stack>
        <Section icon={CalendarDays} label="Calendar" aside={<More href="#/births/records" />}>
          <Calendar
            days={31}
            offset={5}
            marks={[
              { day: 2, count: 3, note: 'Blackbuck · Savanna Paddock 1' },
              { day: 7, count: 2, note: 'Sambar Deer · Zone A · High risk', tone: 'bad' },
              { day: 11, count: 12, note: 'Zebra Finch · Open Aviary 4' },
              { day: 14, count: 5, note: 'Nilgai · Wetland Reserve' },
              { day: 18, count: 4, note: 'Indian Peafowl · Aviary Complex' },
              { day: 21, count: 4, note: 'Bengal Fox · Savanna Paddock 6' },
              { day: 26, count: 3, note: 'Chital · Zone A · High risk', tone: 'bad' },
              { day: 29, count: 5, note: 'Grey Francolin · Open Aviary 7' },
            ]}
          />
        </Section>

        {/* Overall stated above the six sites it is the sum of. */}
        <Section icon={MapPin} label="Sites">
          <Sites slug="births" />
        </Section>

        <Section icon={TrendingUp} label="Trend" aside="30 d">
          <Trend
            values={[2, 2, 3, 3, 4, 4, 3, 3, 3, 4, 3, 3, 3, 3, 2]}
            labels={['Week 1', 'Week 2', 'Week 3', 'Week 4']}
            unit="45 births · 2-day buckets"
          />
        </Section>

        <Section icon={Gauge} label="Delivery" aside="vs target">
          <BulletGroup
            items={[
              {
                label: 'Delivery success',
                value: '93%',
                percent: 93,
                target: 90,
                note: 'Target 90% · 42 of 45',
              },
              {
                label: 'Neonatal survival',
                value: '88%',
                percent: 88,
                target: 85,
                note: 'Target 85% · first 30 d',
              },
            ]}
          />
        </Section>

        <Duo>
          <Section icon={Baby} label="Natural" tight>
            <Scoreboard items={[{ value: '38', label: '84% share' }]} />
          </Section>
          <Section icon={Users} label="Assisted" tight>
            <Scoreboard items={[{ value: '7', label: '3 sedated · 1 caesarean' }]} />
          </Section>
        </Duo>

        <Section icon={Award} label="Species" aside="July">
          <Ladder
            leader={{ label: 'Zebra Finch', sub: 'Open Aviary 4 · 2 clutches', value: '18' }}
            rest={[
              { label: 'Blackbuck', sub: 'Savanna Paddocks · 4 dams', value: '7' },
              { label: 'Nilgai', sub: 'Wetland Reserve', value: '6' },
              { label: 'Indian Peafowl', sub: 'Aviary Complex', value: '5' },
              { label: 'Sambar Deer', sub: 'Zone A · Neonatal watch', value: '4' },
            ]}
          />
          {/* The tail as a single row — a sixth ladder rung would imply a sixth ranked
              species rather than the 19 that share five births. */}
          <div className="mt-4">
            <Facts items={[{ label: 'Others', sub: '19 species', value: '5' }]} />
          </div>
        </Section>

        <Section icon={Home} label="Zones">
          <Band label="Best" title="Open Aviaries" sub="96% survival" value="23" unit="births" />
          <div className="mt-4">
            <Facts
              items={[
                { label: 'Savanna Paddocks', sub: '100% delivery · 100% survival', value: '11' },
                { label: 'Wetland Reserve', sub: '86% survival', value: '7' },
                { label: 'Zone A', sub: '75% survival', value: '4', tone: 'warn' },
              ]}
            />
          </div>
        </Section>

        <Section icon={Eye} label="Mothers" aside="9 dams · 4 risk">
          <Records
            items={[
              {
                label: 'Sundari · Sambar Deer',
                sub: 'High risk · 4th pregnancy · 12 y · Prior dystocia · Dr. Iyer',
                value: '07 Aug',
                tone: 'bad',
              },
              {
                label: 'Meera · Nilgai',
                sub: 'High risk · Dystocia 2025 · Twins · Dr. Rao',
                value: '14 Aug',
                tone: 'bad',
              },
              {
                label: 'Roshni · Chital',
                sub: 'High risk · Body condition 2.5 of 5',
                value: '26 Aug',
                tone: 'bad',
              },
              {
                label: 'Kavi · Bengal Fox',
                sub: 'High risk · 1st litter · Camera watch',
                value: '21 Aug',
                tone: 'bad',
              },
              {
                label: 'Ambika · Blackbuck',
                sub: 'Post-partum day 6 · 2 calves',
                value: 'Clear',
                tone: 'good',
              },
            ]}
          />
        </Section>

        <Section icon={Baby} label="Losses" aside={<More href="#/fetal" />}>
          <Facts
            items={[
              { label: 'Fetal deaths', sub: '3 still birth · 2 abortion', value: '5', tone: 'warn' },
              { label: 'Fetal loss rate', sub: '5 of 50 pregnancies', value: '10%' },
            ]}
          />
          <Rule label="Not in the 45" />
          <Facts items={[{ label: 'Live births counted above', sub: 'Excludes all 5 losses', value: '45' }]} />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
