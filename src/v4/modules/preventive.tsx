/**
 * PREVENTIVE CARE — three streams, one compliance question.
 *
 * Vaccination, deworming and supplements are separate programmes with separate
 * schedules and separate herds, and the page is built as three parallel columns rather
 * than one merged list for that reason: a 92% vaccination rate and an 89% deworming
 * rate average to a number that describes neither.
 *
 * The organising fact is OVERDUE, not completed. Completed work needs no decision;
 * an animal 30 days past its booster does.
 */

import {
  CalendarClock,
  Columns3,
  MapPin,
  Pill,
  ShieldPlus,
  Syringe,
  Leaf,
  TriangleAlert,
} from 'lucide-react'
import {
  BulletGroup,
  Columns,
  Facts,
  Records,
  Ring,
  Rule,
  Section,
  Snapshot,
  Stack,
  Table,
} from '../../exec/system'
import { DrillList, DrillRow, ModuleHero, SiteSplit, useSheet } from './kit'
import { MetricPanel } from '../panels'

interface Stream {
  key: string
  label: string
  icon: typeof Syringe
  covered: number
  herd: number
  completed: number
  overdue: number
  dueToday: number
  dueWeek: number
  metric?: string
}

const STREAMS: Stream[] = [
  {
    key: 'vaccination',
    label: 'Vaccination',
    icon: Syringe,
    covered: 2184,
    herd: 2374,
    completed: 806,
    overdue: 62,
    dueToday: 24,
    dueWeek: 300,
    metric: 'vaccination',
  },
  {
    key: 'deworming',
    label: 'Deworming',
    icon: Pill,
    covered: 1946,
    herd: 2190,
    completed: 634,
    overdue: 88,
    dueToday: 0,
    dueWeek: 102,
  },
  {
    key: 'supplement',
    label: 'Supplements',
    icon: Leaf,
    covered: 1712,
    herd: 1980,
    completed: 1408,
    overdue: 41,
    dueToday: 44,
    dueWeek: 164,
  },
]

const pct = (s: Stream) => Math.round((s.covered / s.herd) * 100)

/** Compliance at five grains — the trend the brief asks for, on one axis. */
const TREND = {
  labels: ['Today', 'Week', 'Month', 'Quarter', 'Year'],
  vaccination: [94, 93, 92, 90, 88],
  deworming: [91, 90, 89, 87, 84],
  supplement: [88, 87, 86, 85, 82],
}

export default function Preventive() {
  const { open } = useSheet()

  return (
    <>
      <ModuleHero
        icon={ShieldPlus}
        value="90"
        unit="%"
        label="Preventive compliance"
        status="191 overdue across three streams"
        tone="warn"
        stats={[
          { value: '92', unit: '%', label: 'Vaccination' },
          { value: '89', unit: '%', label: 'Deworming' },
          { value: '86', unit: '%', label: 'Supplements' },
        ]}
      />
      <Stack>
        {/* Each stream as its own ring, with the fraction the percentage came from.
            "92%" alone hides whether the base is 24 animals or 2,374. */}
        {STREAMS.map((s) => (
          <Section key={s.key} icon={s.icon} label={s.label} aside={`${s.herd.toLocaleString('en-US')} eligible`}>
            <Ring
              percent={pct(s)}
              label="Covered"
              value={s.covered.toLocaleString('en-US')}
              of={s.herd.toLocaleString('en-US')}
              note={`${s.overdue} overdue`}
              tone={s.overdue > 70 ? 'warn' : undefined}
            />
            <Rule label="Schedule" />
            <Snapshot
              cols={4}
              items={[
                { label: 'Completed', value: `${s.completed}`, note: 'this month', tone: 'good' },
                { label: 'Due today', value: `${s.dueToday}`, tone: s.dueToday ? 'warn' : 'neutral' },
                { label: 'This week', value: `${s.dueWeek}` },
                { label: 'Overdue', value: `${s.overdue}`, tone: 'bad' },
              ]}
            />
          </Section>
        ))}

        {/* One plot, three streams, five grains. They are separate programmes but they
            share a herd and a keeper roster, so whether they move together is the
            question this card exists to answer. */}
        <Section icon={Columns3} label="Compliance trend" aside="today → year">
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-[13px] text-[#1c1a16]">Vaccination</p>
              <Columns values={TREND.vaccination} labels={TREND.labels} highlight={2} unit="% covered" />
            </div>
            <div>
              <p className="mb-2 text-[13px] text-[#1c1a16]">Deworming</p>
              <Columns values={TREND.deworming} labels={TREND.labels} highlight={2} unit="% covered" />
            </div>
            <div>
              <p className="mb-2 text-[13px] text-[#1c1a16]">Supplements</p>
              <Columns values={TREND.supplement} labels={TREND.labels} highlight={2} unit="% covered" />
            </div>
          </div>
        </Section>

        {/* Overdue by age. Fifteen days late is a scheduling slip; ninety is a welfare
            finding, and only the buckets separate them. */}
        <Section icon={TriangleAlert} label="Overdue" aside="191 animals">
          <Columns values={[96, 58, 37]} labels={['0–15 d', '15–30 d', '30 d +']} highlight={2} unit="Animals · days past due" />
          <Rule label="By stream" />
          <Table
            head={['Stream', '0–15', '15–30', '30 +']}
            rows={[
              { label: 'Vaccination', sub: '62 overdue', cells: ['34', '18', '10'], tone: 'warn' },
              { label: 'Deworming', sub: '88 overdue', cells: ['42', '26', '20'], tone: 'bad' },
              { label: 'Supplements', sub: '41 overdue', cells: ['20', '14', '7'], tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={ShieldPlus} label="Against target">
          <BulletGroup
            items={[
              { label: 'Vaccination', value: '92%', percent: 92, target: 95, note: 'Target 95%', tone: 'warn' },
              { label: 'Deworming', value: '89%', percent: 89, target: 90, note: 'Target 90%', tone: 'warn' },
              { label: 'Supplements', value: '86%', percent: 86, target: 85, note: 'Target 85%', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={MapPin} label="Coverage by site" aside="tap to drill">
          <SiteSplit
            slug="vaccination"
            onOpenSite={(_, name) =>
              open({ title: name, eyebrow: 'Vaccination coverage', body: <MetricPanel metric="vaccination" /> })
            }
          />
        </Section>

        <Section icon={CalendarClock} label="Next 7 days" aside="566 due">
          <DrillList>
            <DrillRow
              label="Rabies booster · carnivores"
              sub="08 Aug · Carnivore Ridge"
              value="24"
              onOpen={() => open({ title: 'Vaccination', eyebrow: 'Due 08 Aug', body: <MetricPanel metric="vaccination" /> })}
            />
            <DrillRow label="Newcastle · aviary flock" sub="10 Aug · Aviary Complex" value="180" />
            <DrillRow label="FMD · ungulates" sub="12 Aug · Savanna" value="96" />
            <DrillRow label="Chital herd deworming" sub="09 Aug · Savanna · high burden" value="64" tone="warn" />
            <DrillRow label="Primate cohort deworming" sub="14 Aug · Primate Forest" value="38" />
            <DrillRow label="Calcium · juvenile reptiles" sub="08 Aug · Reptile House" value="44" />
            <DrillRow label="Vitamin A · aquatic stock" sub="11 Aug · Aquatic Halls" value="120" />
          </DrillList>
        </Section>

        <Section icon={Syringe} label="Recent rounds">
          <Records
            items={[
              { label: 'Newcastle round closed', sub: 'Aviary Complex · 178 of 180', value: '31 Jul', tone: 'good' },
              { label: 'Rabies booster · primates', sub: 'Primate Forest · 38 of 38', value: '26 Jul', tone: 'good' },
              { label: 'Deworming · aquatic stock', sub: 'Aquatic Halls · 96 of 120', value: '22 Jul', tone: 'warn' },
              { label: 'FMD · ungulates', sub: 'Savanna · 88 of 96', value: '14 Jul', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={ShieldPlus} label="Programme">
          <Facts
            items={[
              { label: 'Eligible herd', sub: 'Across three streams', value: '2,374' },
              { label: 'Rounds this month', value: '18' },
              { label: 'Average round size', value: '84' },
              { label: 'Keeper hours', sub: 'Preventive only', value: '412' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
