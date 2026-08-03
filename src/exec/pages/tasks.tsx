/**
 * TASKS — delivery.
 *
 * Opens on the completion dial: for a delivery page the first number is whether
 * the place closes what it opens. Board, teams, workload and closure density
 * follow, then the two blocks that name the oldest and latest work outstanding.
 */

import { Activity, Gauge, Grid3x3, ListTodo, Scale, Sparkles, TriangleAlert, Users } from 'lucide-react'
import {
  Band,
  Dial,
  Highlights,
  Hero,
  Matrix,
  Poles,
  Records,
  Rule,
  Scoreboard,
  Section,
  Stack,
  Table,
} from '../system'

export default function Tasks() {
  return (
    <>
      <Hero
        icon={ListTodo}
        value="35"
        label="Open Tasks"
        status="5 Overdue · 2 High"
        tone="warn"
        stats={[
          { value: '41', label: 'Closed' },
          { value: '14', label: 'Due Today' },
          { value: '8', label: 'High Priority' },
        ]}
      />
      <Stack>
        <Section icon={Gauge} label="Completion">
          <Dial
            percent={87}
            value="87"
            unit="%"
            label="On Time"
            benchmark={90}
            benchmarkLabel="Target 90% · 5 of 41 late"
          />
        </Section>

        <Section icon={Activity} label="Board">
          <Scoreboard
            items={[
              { value: '14', label: 'Due today' },
              { value: '12', label: 'In progress' },
              { value: '5', label: 'Overdue', tone: 'bad' },
              { value: '8', label: 'High priority' },
            ]}
          />
        </Section>

        <Section icon={Users} label="Teams" aside="this week">
          <Table
            head={['Team', 'Open', 'Closed', 'On time']}
            rows={[
              { label: 'Veterinary', cells: ['6', '13', '96%'] },
              { label: 'Animal Keeping', cells: ['8', '11', '92%'] },
              { label: 'Administration', cells: ['4', '3', '90%'] },
              { label: 'Lab', cells: ['6', '5', '84%'], tone: 'warn' },
              { label: 'Maintenance', cells: ['11', '9', '71%'], tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Scale} label="Workload" aside="35 open">
          <Poles
            caption={['Highest', 'Lowest']}
            high={{ value: '11', label: 'Maintenance', sub: '31% · 4 staff' }}
            low={{ value: '4', label: 'Administration', sub: '11% · 6 staff' }}
          />
        </Section>

        {/* The heat grid carries the shape of the week; the poles under it carry the
            two column totals a director actually quotes. Same card, one reading. */}
        <Section icon={Grid3x3} label="Closures" aside="41, week">
          <Matrix
            rows={['Veterinary', 'Keeping', 'Maintenance', 'Lab', 'Admin']}
            cols={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
            values={[
              [3, 2, 3, 2, 3],
              [2, 3, 2, 2, 2],
              [1, 2, 3, 2, 1],
              [0, 1, 2, 1, 1],
              [0, 1, 1, 1, 0],
            ]}
          />
          <Rule label="Days" />
          <Poles
            caption={['Best', 'Worst']}
            high={{ value: '11', label: 'Wednesday' }}
            low={{ value: '7', label: 'Friday', sub: 'Admin 0' }}
          />
        </Section>

        <Section icon={TriangleAlert} label="Overdue" aside="5 tasks">
          <Band
            label="Longest Pending"
            title="Zone A perimeter fence inspection"
            sub="Maintenance · 14 Jul"
            value="20"
            unit="d"
            tone="bad"
          />
          {/* The band is the outlier, the list is the rest of the same set — the gap
              keeps them from reading as one continuous rail. */}
          <div className="mt-4">
            <Records
              items={[
                {
                  label: 'Tank 9 filtration service',
                  sub: 'Maintenance · High · Ramesh K. · 6 prawn deaths',
                  value: '1 d over',
                  tone: 'bad',
                },
                {
                  label: 'Zone A perimeter fence inspection',
                  sub: 'Maintenance · High · Ramesh K.',
                  value: '1 d over',
                  tone: 'bad',
                },
                {
                  label: 'Reagent stock count',
                  sub: 'Lab · Medium · Dr. Shah',
                  value: '2 d over',
                  tone: 'warn',
                },
                {
                  label: 'Enrichment rota update',
                  sub: 'Animal Keeping · Priya S. · Aviary 7',
                  value: '3 d over',
                  tone: 'warn',
                },
                {
                  label: 'Quarantine intake redistribution plan',
                  sub: 'Curator · High · 5 Aug',
                  value: 'Due today',
                  tone: 'warn',
                },
              ]}
            />
          </div>
        </Section>

        <Section icon={Sparkles} label="Highlights">
          <Highlights
            items={[
              { tag: 'Constraint', value: '11 of 35', label: 'Maintenance open', tone: 'bad' },
              { tag: 'Late', value: '4 of 5', label: 'Maintenance', tone: 'bad' },
              { tag: 'Standout', value: '96', unit: '%', label: 'Veterinary on time' },
              { tag: 'Volume', value: '13', label: 'Veterinary closed' },
              { tag: 'Age', value: '20', unit: 'd', label: 'Oldest open', tone: 'bad' },
              { tag: 'Rate', value: '87', unit: '%', label: 'Target 90%', tone: 'warn' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
