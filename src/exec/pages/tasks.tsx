/** TASKS — a day board. Today first, then who is buried. */
import { Columns3, Grid3x3, ListTodo, TriangleAlert, Users } from 'lucide-react'
import { Bars, Columns, Hero, Matrix, Records, Section, Stack, StatusList } from '../system'

export default function Tasks() {
  return (
    <>
      <Hero
        icon={ListTodo}
        value="41"
        label="Tasks closed this week"
        side={{ value: '35', label: 'still open' }}
        context="Week of 27 Jul – 02 Aug · 76 raised · 87% closed on time."
        status="5 overdue"
        tone="warn"
      />
      <Stack>
        <Section icon={Columns3} label="Closed per day" aside="this week">
          <Columns values={[6, 9, 11, 8, 7]} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']} highlight={4} unit="tasks closed" />
        </Section>

        <Section icon={Grid3x3} label="Team workload" aside="open tasks">
          <Matrix
            rows={['Veterinary', 'Keeping', 'Maintenance', 'Lab', 'Admin']}
            cols={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
            values={[
              [4, 6, 5, 3, 6],
              [5, 4, 7, 6, 4],
              [8, 9, 7, 9, 8],
              [2, 3, 2, 4, 3],
              [1, 2, 1, 2, 1],
            ]}
          />
        </Section>

        <Section icon={Users} label="Open by team">
          <Bars
            items={[
              { label: 'Maintenance', value: 9, sub: '6 open' },
              { label: 'Veterinary', value: 6, sub: '18 closed' },
              { label: 'Animal Keeping', value: 7, sub: '14 closed' },
              { label: 'Lab', value: 7, sub: '2 closed' },
              { label: 'Administration', value: 6, sub: '1 closed' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Overdue" aside="5 tasks">
          <Records
            items={[
              { label: 'Tank 9 filtration service', sub: 'Maintenance · High · Ramesh K.', value: '1 d', tone: 'bad' },
              { label: 'Zone A perimeter fence inspection', sub: 'Maintenance · High · Ramesh K.', value: '1 d', tone: 'bad' },
              { label: 'Reagent stock count', sub: 'Lab · Medium · Dr. Shah', value: '2 d', tone: 'warn' },
              { label: 'Enrichment rota update', sub: 'Animal Keeping · Priya S.', value: '3 d', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={ListTodo} label="Status">
          <StatusList
            items={[
              { label: 'Due today', value: '14', tone: 'warn' },
              { label: 'In progress', value: '12' },
              { label: 'Overdue', value: '5', tone: 'bad' },
              { label: 'Closed on time', value: '87%', tone: 'good' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
