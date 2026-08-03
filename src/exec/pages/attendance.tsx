/**
 * STAFF ATTENDANCE — the roster.
 *
 * Roster split first, then the rate against target, then the two attributions —
 * shift and department — that the gap resolves to. Overtime and exceptions close
 * the operational read; every string names a number, none explains one.
 */

import { Building2, Clock, Gauge, IndianRupee, Scale, TriangleAlert, UserCheck, Users } from 'lucide-react'
import {
  Bullet,
  Composition,
  Facts,
  Highlights,
  Hero,
  Poles,
  Records,
  Section,
  Stack,
  StatusList,
  Table,
} from '../system'

export default function Attendance() {
  return (
    <>
      <Hero
        icon={Users}
        value="243"
        label="Present"
        status="78% · Target 82%"
        tone="warn"
        stats={[
          { value: '312', label: 'Rostered' },
          { value: '41', label: 'Absent' },
          { value: '28', label: 'Leave' },
        ]}
      />
      <Stack>
        <Section icon={UserCheck} label="Roster">
          <Composition
            unit="staff"
            items={[
              { label: 'Present', value: 243 },
              { label: 'Absent', value: 41 },
              { label: 'Leave', value: 28 },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Attendance">
          <Bullet label="Rate" value="78%" percent={78} target={82} note="Target 82% · 13 short" tone="warn" />
        </Section>

        {/* Late arrivals ride the shift list rather than a card of their own — the
            18 only means something next to the coverage it degrades. */}
        <Section icon={Clock} label="Shifts" aside="today">
          <StatusList
            items={[
              { label: 'Shift A · 06:00–14:00', value: '118 of 137 · 86%', tone: 'good' },
              { label: 'Shift B · 14:00–22:00', value: '84 of 110 · 76%', tone: 'warn' },
              { label: 'Shift C · 22:00–06:00', value: '41 of 65 · 63%', tone: 'bad' },
              { label: 'Late arrivals', value: '18', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Building2} label="Departments" aside="7">
          <Table
            head={['Department', 'Rostered', 'Present', 'Rate']}
            rows={[
              { label: 'Lab', cells: ['12', '11', '92%'] },
              { label: 'Veterinary', sub: '6 vets', cells: ['46', '41', '89%'] },
              { label: 'Security', cells: ['38', '33', '87%'] },
              { label: 'Grounds', cells: ['21', '17', '81%'] },
              { label: 'Animal Keeping', sub: 'Shift B · 19 short', cells: ['114', '85', '75%'], tone: 'warn' },
              { label: 'Administration', sub: '5 unplanned', cells: ['28', '20', '71%'], tone: 'warn' },
              { label: 'Maintenance', sub: '17 short', cells: ['53', '36', '68%'], tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Scale} label="Extremes">
          <Poles
            caption={['Highest', 'Lowest']}
            high={{ value: '92%', label: 'Lab', sub: '11 of 12 · 0 unplanned' }}
            low={{ value: '68%', label: 'Maintenance', sub: '36 of 53 · 17 short · 3 shifts' }}
            lowTone="bad"
          />
        </Section>

        <Section icon={IndianRupee} label="Overtime" aside="August">
          <Facts
            size="lg"
            items={[
              { label: 'Hours', sub: 'Month', value: '412 h' },
              { label: 'Cost', sub: 'Maintenance 61%', value: '₹2.1L', tone: 'warn' },
              { label: 'Late arrivals', sub: 'Average 19 min', value: '18' },
              { label: 'Unplanned absence', sub: 'Tolerance 6%', value: '13%', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Exceptions" aside="4">
          <Records
            items={[
              { label: 'Maintenance · Shift C', sub: '7 of 22 · Night rota 1', value: '68%', tone: 'bad' },
              { label: 'Animal Keeping · Shift B', sub: 'Unplanned', value: '5', tone: 'warn' },
              { label: 'Administration', sub: '5 absent · 3rd Monday', value: '71%', tone: 'warn' },
              { label: 'Meena Joshi · Administration', sub: '22 min late · Gate 1', value: '09:22', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Users} label="Highlights">
          <Highlights
            items={[
              { tag: 'Gap', value: '13', label: 'Staff short', tone: 'warn' },
              { tag: 'Below target', value: '9', label: 'Working days', tone: 'warn' },
              { tag: 'Thinnest cover', value: '63', unit: '%', label: 'Shift C', tone: 'bad' },
              { tag: 'Night rota', value: '1', label: 'Maintenance · Shift C', tone: 'bad' },
              { tag: 'Overtime', value: '₹2.1L', label: '412 hours', tone: 'warn' },
              { tag: 'Open tasks', value: '1/3', label: 'Maintenance', tone: 'bad' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
