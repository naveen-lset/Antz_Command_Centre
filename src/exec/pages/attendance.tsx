/** ATTENDANCE — a roster. The gap between rostered and present is the story. */
import { Clock, Grid3x3, TriangleAlert, UserCheck, Users } from 'lucide-react'
import { Composition, Dumbbell, Hero, Matrix, Records, Section, Stack, StatusList } from '../system'

export default function Attendance() {
  return (
    <>
      <Hero
        icon={Users}
        value="243"
        label="Staff present"
        side={{ value: '312', label: 'rostered' }}
        context="Shift A · 30 July 2026 · target is 82% attendance."
        status="78% present"
        tone="warn"
      />
      <Stack>
        {/* Percent of each department's own roster — raw headcount would make a
            12-person Lab read as empty next to a 114-person Keeping team. */}
        <Section icon={Grid3x3} label="Attendance rate" aside="% present, this week">
          <Matrix
            rows={['Keeping', 'Veterinary', 'Maintenance', 'Security', 'Admin', 'Lab']}
            cols={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
            values={[
              [81, 82, 79, 77, 84],
              [87, 91, 89, 85, 91],
              [57, 64, 53, 51, 72],
              [84, 87, 82, 79, 89],
              [64, 71, 61, 57, 75],
              [92, 100, 92, 83, 100],
            ]}
          />
        </Section>

        <Section icon={UserCheck} label="Roster split" aside="312 staff">
          <Composition
            unit="staff"
            items={[
              { label: 'Present', value: 243 },
              { label: 'Absent', value: 41 },
              { label: 'On leave', value: 28 },
            ]}
          />
        </Section>

        <Section icon={Users} label="Rostered against present" aside="by department">
          <Dumbbell
            legend={['Rostered', 'Present']}
            items={[
              { label: 'Animal Keeping', a: 114, b: 96 },
              { label: 'Veterinary', a: 46, b: 42 },
              { label: 'Maintenance', a: 53, b: 38 },
              { label: 'Security', a: 38, b: 34 },
              { label: 'Administration', a: 28, b: 21 },
            ]}
          />
        </Section>

        <Section icon={Clock} label="Shift cover">
          <StatusList
            items={[
              { label: 'Shift A · 06–14', value: '118 (86%)', tone: 'good' },
              { label: 'Shift B · 14–22', value: '84 (76%)', tone: 'warn' },
              { label: 'Shift C · 22–06', value: '41 (68%)', tone: 'bad' },
              { label: 'Late arrivals today', value: '18', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Exceptions">
          <Records
            items={[
              { label: 'Maintenance · Shift C', sub: '7 of 22 absent — lowest cover on site', value: '68%', tone: 'bad' },
              { label: 'Meena Joshi · Administration', sub: 'Late by 22 min · Gate 1', value: '13:22', tone: 'warn' },
              { label: 'Animal Keeping · Shift B', sub: '5 unplanned absences', value: '5', tone: 'warn' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
