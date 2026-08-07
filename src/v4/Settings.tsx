/**
 * Settings, as a sheet.
 *
 * The brief lists Settings in the sidebar, and a sidebar entry that goes nowhere is
 * worse than no entry at all. It is a sheet rather than a page for the same reason
 * every other peek is: nothing in here is worth losing the screen behind, and a
 * director who opens it to check which site they are scoped to should be back in one
 * gesture.
 *
 * Built entirely from `Section`, `Facts` and `Snapshot` — no settings-specific
 * widgets, no toggles that toggle nothing. What is stated is what the product knows.
 */

import { Bell, Building2, Clock, Monitor, ShieldCheck, UserRound } from 'lucide-react'
import { Facts, Section, Snapshot, Stack } from '../exec/system'
import { SITES } from '../exec/sites'
import { PERIODS } from '../exec/period'
import { site } from './data'

export function SettingsPanel() {
  return (
    <Stack>
      <Section icon={UserRound} label="Signed in">
        <Facts
          size="lg"
          items={[
            { label: 'Name', value: site.userName },
            { label: 'Role', value: site.role },
            { label: 'Organisation', value: site.org },
          ]}
        />
      </Section>

      <Section icon={Building2} label="Scope" aside={`${SITES.length} sites`}>
        <Facts
          items={SITES.map((s) => ({
            label: s.name,
            sub: `${s.code} · ${s.enclosures} enclosures`,
            value: 'Full access',
          }))}
        />
      </Section>

      <Section icon={Clock} label="Reporting" aside="defaults">
        <Facts
          items={[
            { label: 'Default window', value: 'This month' },
            { label: 'Windows available', value: String(PERIODS.length) },
            { label: 'Report period', value: 'July 2025' },
            { label: 'Approval SLA', value: '3 days' },
          ]}
        />
      </Section>

      <Section icon={Bell} label="Alerting">
        <Snapshot
          cols={2}
          items={[
            { label: 'Critical', value: 'Push', note: 'Immediate', icon: ShieldCheck },
            { label: 'High', value: 'Push', note: 'Within 4 h', icon: Bell },
            { label: 'Medium', value: 'Digest', note: 'Daily 08:00', icon: Clock },
            { label: 'Low', value: 'Digest', note: 'Weekly', icon: Monitor },
          ]}
        />
      </Section>

      <Section icon={Monitor} label="About">
        <Facts
          items={[
            { label: 'Build', value: 'V4' },
            { label: 'Data', value: 'Demonstration set' },
            { label: 'Figures as of', value: '31 Jul 2025' },
          ]}
        />
      </Section>
    </Stack>
  )
}
