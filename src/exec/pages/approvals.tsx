/** APPROVALS — a queue. Aging-first: "stuck 5 days with the CFO" is the fact. */
import { CheckCircle2, Columns3, Hourglass, IndianRupee, ListChecks } from 'lucide-react'
import { AccentProvider, Columns, Funnel, Hero, Ledger, Records, Section, Stack, StatusList } from '../system'

export default function Approvals() {
  return (
    <AccentProvider value="#7c3aed">
      <Hero
        icon={CheckCircle2}
        value="14"
        label="Pending approvals"
        side={{ value: '1.4 d', label: 'avg decision' }}
        context="Across 4 departments · 128 raised this month, 114 already closed."
        status="3 past SLA"
        tone="warn"
      />
      <Stack>
        <Section icon={Columns3} label="How long they have waited" aside="days">
          <Columns values={[5, 4, 2, 3]} labels={['0–1 d', '2–3 d', '4–5 d', '6 d +']} highlight={3} unit="requests pending" />
        </Section>

        <Section icon={Hourglass} label="Queue stages">
          <Funnel
            stages={[
              { label: 'Submitted', value: 14 },
              { label: 'Under review', value: 9 },
              { label: 'Awaiting sign-off', value: 5, sub: '3 past SLA' },
              { label: 'Cleared today', value: 9 },
            ]}
          />
        </Section>

        <Section icon={IndianRupee} label="Oldest requests">
          <Ledger
            rank={false}
            items={[
              { label: 'APR-4412 · Feed contract renewal', sub: 'Finance · ₹18.4L · with CFO', value: '5 d' },
              { label: 'APR-4408 · Locum vet engagement', sub: 'HR · 2 positions · with HR head', value: '4 d' },
              { label: 'APR-4401 · Herpetarium retrofit', sub: 'Administration · ₹6.2L', value: '4 d' },
              { label: 'APR-4433 · Incubator spare parts', sub: 'Finance · ₹1.2L', value: '2 d' },
            ]}
          />
        </Section>

        <Section icon={ListChecks} label="By department">
          <StatusList
            items={[
              { label: 'Finance', value: '5', tone: 'bad' },
              { label: 'Veterinary', value: '4', tone: 'warn' },
              { label: 'HR', value: '3', tone: 'warn' },
              { label: 'Administration', value: '2' },
            ]}
          />
        </Section>

        <Section icon={CheckCircle2} label="Decisions today">
          <Records
            items={[
              { label: 'APR-4431 · Vaccine procurement', sub: 'Veterinary · ₹3.8L · Dr. Mehta', value: 'Approved', tone: 'good' },
              { label: 'APR-4429 · Night-shift roster change', sub: 'HR · 12 staff', value: 'Approved', tone: 'good' },
              { label: 'APR-4425 · Off-site enrichment trip', sub: 'Insufficient keeper cover', value: 'Rejected', tone: 'bad' },
              { label: 'APR-4412 · Feed contract renewal', sub: 'Escalated to the CFO', value: 'Escalated', tone: 'warn' },
            ]}
          />
        </Section>
      </Stack>
    </AccentProvider>
  )
}
