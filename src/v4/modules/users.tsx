/**
 * USERS — adoption, not administration.
 *
 * The only module in the set whose subject is people rather than animals, and the only
 * one where the interesting number is a RATIO OF ACTIVITY: 312 accounts is a licence
 * cost, 243 of them active this week is whether the system is being used. A page that
 * led with the headcount would be a directory; this one leads with the daily active
 * figure and treats the roster as the detail behind it.
 *
 * Its drill is Site Usage → Department → User — the org chart, not the collection.
 */

import {
  Activity,
  Building2,
  KeyRound,
  Monitor,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserCog,
  Users as UsersIcon,
} from 'lucide-react'
import {
  Bars,
  Bullet,
  Composition,
  Events,
  Facts,
  Highlights,
  Records,
  Ring,
  Rule,
  Section,
  Snapshot,
  Stack,
  StatusList,
  Table,
  Trend,
} from '../../exec/system'
import { DrillList, DrillRow, ModuleHero, NodePanel, useSheet } from './kit'

const USER = (name: string, role: string, last: string, tone?: 'good' | 'warn' | 'bad') => ({
  id: name,
  label: name,
  sub: role,
  value: 1,
  tone,
  facts: [
    { label: 'Role', value: role },
    { label: 'Last active', value: last, tone },
    { label: 'Access', value: tone === 'bad' ? 'Revoked' : 'Granted', tone },
    { label: 'Sessions · 30 d', value: tone === 'bad' ? '0' : '42' },
    { label: 'Two-factor', value: 'Enabled', tone: 'good' as const },
  ],
})

/** Site → Department → User. The org chart, which is a different tree from the zoo's. */
const USAGE = [
  {
    id: 'aquatic',
    label: 'Aquatic Halls',
    sub: '68 accounts · 54 active',
    value: 54,
    unit: 'active',
    children: [
      { id: 'aq-keep', label: 'Keepers', sub: '38 of 44 active', value: 38, unit: 'active', children: [USER('R. Solanki', 'Head keeper', 'Today 07:30', 'good'), USER('M. Chauhan', 'Keeper', 'Today 06:50', 'good'), USER('D. Patel', 'Keeper', '18 days ago', 'warn')] },
      { id: 'aq-vet', label: 'Veterinary', sub: '9 of 10 active', value: 9, unit: 'active', children: [USER('Dr. Mehta', 'Senior veterinarian', 'Today 09:40', 'good')] },
      { id: 'aq-admin', label: 'Administration', sub: '7 of 14 active', value: 7, unit: 'active', tone: 'warn' as const, children: [USER('S. Joshi', 'Records officer', '31 days ago', 'bad')] },
    ],
  },
  {
    id: 'aviary',
    label: 'Aviary Complex',
    sub: '61 accounts · 49 active',
    value: 49,
    unit: 'active',
    children: [
      { id: 'av-keep', label: 'Keepers', sub: '34 of 40 active', value: 34, unit: 'active', children: [USER('P. Rathod', 'Head keeper', 'Today 07:10', 'good')] },
      { id: 'av-vet', label: 'Veterinary', sub: '8 of 9 active', value: 8, unit: 'active', children: [USER('Dr. Iyer', 'Veterinarian', 'Yesterday', 'good')] },
      { id: 'av-admin', label: 'Administration', sub: '7 of 12 active', value: 7, unit: 'active', children: [USER('N. Desai', 'Registrar', 'Today 08:15', 'good')] },
    ],
  },
  {
    id: 'savanna',
    label: 'Savanna',
    sub: '54 accounts · 42 active',
    value: 42,
    unit: 'active',
    children: [
      { id: 'sv-keep', label: 'Keepers', sub: '30 of 36 active', value: 30, unit: 'active', children: [USER('A. Bhatt', 'Head keeper', 'Today 06:40', 'good')] },
      { id: 'sv-vet', label: 'Veterinary', sub: '6 of 8 active', value: 6, unit: 'active', children: [USER('Dr. Nair', 'Veterinarian', '3 days ago', 'warn')] },
      { id: 'sv-admin', label: 'Administration', sub: '6 of 10 active', value: 6, unit: 'active', children: [USER('K. Shah', 'Administrator', 'Today 10:05', 'good')] },
    ],
  },
  { id: 'reptile', label: 'Reptile House', sub: '44 accounts · 36 active', value: 36, unit: 'active', children: [{ id: 'rp-keep', label: 'Keepers', sub: '26 of 32 active', value: 26, unit: 'active', children: [USER('V. Modi', 'Head keeper', 'Today 07:55', 'good')] }] },
  { id: 'primate', label: 'Primate Forest', sub: '43 accounts · 34 active', value: 34, unit: 'active', children: [{ id: 'pr-keep', label: 'Keepers', sub: '25 of 31 active', value: 25, unit: 'active', children: [USER('L. Trivedi', 'Head keeper', 'Today 07:20', 'good')] }] },
  { id: 'carnivore', label: 'Carnivore Ridge', sub: '42 accounts · 28 active', value: 28, unit: 'active', tone: 'warn' as const, children: [{ id: 'cr-keep', label: 'Keepers', sub: '20 of 30 active', value: 20, unit: 'active', children: [USER('H. Vyas', 'Head keeper', 'Yesterday', 'good')] }] },
]

const ADOPTION = [186, 198, 204, 212, 221, 228, 231, 236, 238, 240, 242, 243]

export default function Users() {
  const { open } = useSheet()

  return (
    <>
      <ModuleHero
        icon={UsersIcon}
        value="243"
        label="Daily active users"
        status="78% of 312 accounts"
        tone="good"
        stats={[
          { value: '289', label: 'Weekly active' },
          { value: '304', label: 'Monthly active' },
          { value: '312', label: 'Accounts' },
        ]}
      />
      <Stack>
        {/* Activity leads, not the headcount. 312 accounts is a licence line; 243 of
            them signing in today is whether the product is working. */}
        <Section icon={Activity} label="Activity" aside="of 312 accounts">
          <Ring
            percent={78}
            label="Active today"
            value="243"
            of="312"
            note="289 this week · 304 this month"
            tone="good"
          />
          <Rule label="Reach" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Daily', value: '243', note: '78%', tone: 'good' },
              { label: 'Weekly', value: '289', note: '93%', tone: 'good' },
              { label: 'Monthly', value: '304', note: '97%', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={TrendingUp} label="Adoption" aside="12 months">
          <Trend
            values={ADOPTION}
            labels={['Aug 24', 'Nov 24', 'Feb 25', 'Jul 25']}
            unit="Daily active users · monthly average"
            tone="good"
          />
        </Section>

        <Section icon={UserCheck} label="Onboarding" aside="this month">
          <Snapshot
            cols={2}
            items={[
              { label: 'New users', value: '18', note: 'accounts created', tone: 'good' },
              { label: 'Activated', value: '14', note: 'signed in at least once' },
              { label: 'Never signed in', value: '4', note: 'over 14 days old', tone: 'warn' },
              { label: 'Dormant', value: '8', note: 'no session in 30 days', tone: 'warn' },
            ]}
          />
          <Rule label="Activation" />
          <Bullet label="Activated within 7 days" value="78%" percent={78} target={90} note="Target 90% · 14 of 18" tone="warn" />
        </Section>

        {/* Site → Department → User. Adoption is uneven by department, and the
            department is where a training intervention actually lands. */}
        <Section icon={Building2} label="Site usage" aside="tap to drill">
          <DrillList>
            {USAGE.map((s) => (
              <DrillRow
                key={s.id}
                label={s.label}
                sub={s.sub}
                value={String(s.value)}
                unit="active"
                tone={s.tone}
                bar={(s.value / 54) * 100}
                onOpen={() =>
                  open({
                    title: s.label,
                    eyebrow: 'Site usage',
                    body: <NodePanel title="Departments" unit="active" nodes={s.children} trail={[s.label]} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>

        <Section icon={UserCog} label="By role" aside="312 accounts">
          <Composition
            items={[
              { label: 'Keepers', value: 213 },
              { label: 'Veterinary', value: 41 },
              { label: 'Administration', value: 38 },
              { label: 'Management', value: 12 },
              { label: 'Laboratory', value: 8 },
            ]}
            unit="accounts"
          />
        </Section>

        <Section icon={KeyRound} label="Access" aside="this month">
          <StatusList
            items={[
              { label: 'Granted', value: '18', tone: 'good' },
              { label: 'Pending approval', value: '2', tone: 'warn' },
              { label: 'Revoked', value: '5', tone: 'bad' },
              { label: 'Elevated · admin rights', value: '11' },
            ]}
          />
          <Rule label="Pending" />
          <Records
            items={[
              { label: 'APR-4455 · Records access', sub: '2 locum vets · raised by HR', value: '1 d', tone: 'warn' },
              { label: 'Elevated rights · S. Joshi', sub: 'Registrar · Aquatic Halls', value: '3 d', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Monitor} label="Engagement" aside="30 days">
          <Table
            head={['Role', 'Accounts', 'Active', 'Sessions']}
            rows={[
              { label: 'Keepers', sub: 'Field entry', cells: ['213', '186', '18.4'], tone: 'good' },
              { label: 'Veterinary', sub: 'Clinical records', cells: ['41', '39', '24.1'], tone: 'good' },
              { label: 'Administration', sub: 'Approvals, procurement', cells: ['38', '27', '9.2'], tone: 'warn' },
              { label: 'Management', sub: 'Command centre', cells: ['12', '11', '31.6'], tone: 'good' },
              { label: 'Laboratory', sub: 'Results entry', cells: ['8', '8', '15.8'], tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={Building2} label="Weakest adoption" aside="by department">
          <Bars
            items={[
              { label: 'Carnivore Ridge · keepers', value: 67, sub: '20 of 30' },
              { label: 'Aquatic Halls · administration', value: 50, sub: '7 of 14' },
              { label: 'Savanna · administration', value: 60, sub: '6 of 10' },
              { label: 'Aviary · administration', value: 58, sub: '7 of 12' },
            ]}
            unit="% active"
          />
        </Section>

        <Section icon={ShieldCheck} label="Today">
          <Events
            items={[
              { when: '10:05', label: 'K. Shah signed in', sub: 'Savanna · administration', tone: 'good' },
              { when: '09:40', label: 'Dr. Mehta signed in', sub: 'Aquatic Halls · veterinary', tone: 'good' },
              { when: '08:15', label: 'Access revoked · 1 account', sub: 'Left the organisation', tone: 'bad' },
              { when: '07:30', label: 'Shift opened · 243 checked in', sub: 'All sites' },
            ]}
          />
        </Section>

        <Section icon={UsersIcon} label="Highlights">
          <Highlights
            items={[
              { tag: 'Daily', value: '243', label: 'Active users', tone: 'good' },
              { tag: 'Reach', value: '97', unit: '%', label: 'Monthly active', tone: 'good' },
              { tag: 'New', value: '18', label: 'This month' },
              { tag: 'Dormant', value: '8', label: 'No session · 30 d', tone: 'warn' },
              { tag: 'Pending', value: '2', label: 'Access requests', tone: 'warn' },
              { tag: 'Weakest', value: '50', unit: '%', label: 'AQ administration', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={UserCog} label="Estate">
          <Facts
            items={[
              { label: 'Accounts', value: '312' },
              { label: 'Sites', value: '6' },
              { label: 'Departments', value: '5' },
              { label: 'Two-factor enforced', value: '312 of 312', tone: 'good' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
