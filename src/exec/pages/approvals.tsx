/**
 * APPROVALS — the decision queue.
 *
 * Aging-led: queue count, then age buckets, then the money, then the holder.
 * Rupee values appear on this page and nowhere else in the set. Every string
 * names a number — the composition carries the reading order, not the copy.
 */

import {
  Building2,
  CheckCircle2,
  Columns3,
  Hourglass,
  IndianRupee,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  Band,
  Bars,
  Columns,
  Facts,
  Highlights,
  Hero,
  Ledger,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  Table,
} from '../system'

export default function Approvals() {
  return (
    <>
      <Hero
        icon={CheckCircle2}
        value="14"
        label="Pending"
        status="3 past SLA"
        tone="warn"
        stats={[
          { value: '1.4 d', label: 'Average' },
          { value: '₹31.4L', label: 'Queue' },
          { value: '5 d', label: 'Oldest' },
        ]}
      />
      <Stack>
        <Section icon={CheckCircle2} label="Today">
          <Facts
            items={[
              { label: 'Approved', sub: '7 routine', value: '9', tone: 'good' },
              { label: 'Rejected', sub: 'Keeper cover', value: '2' },
              { label: 'Escalated', sub: 'CFO', value: '1', tone: 'warn' },
              { label: 'Past SLA', sub: 'Standard 3 d', value: '3', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Columns3} label="Aging" aside="14 pending">
          <Columns
            values={[5, 4, 2, 3]}
            labels={['0–1 d', '2–3 d', '4–5 d', '6 d +']}
            highlight={3}
            unit="Requests · days"
          />
        </Section>

        {/* Two orderings of one queue in one card: the band ranks by value, the
            ledger below it by age. Split into two cards they read as duplicates. */}
        <Section icon={IndianRupee} label="Money" aside="₹31.4L">
          <Band
            label="Highest value"
            title="APR-4412 · Feed contract"
            sub="Finance · CFO · 29 Jul · cover 22 Aug"
            value="₹18.4L"
            tone="bad"
          />
          <Rule label="Oldest" />
          <Ledger
            rank={false}
            items={[
              { label: 'APR-4412 · Feed contract', sub: 'Finance · ₹18.4L · CFO', value: '5 d' },
              { label: 'APR-4408 · Locum vet', sub: 'HR · 2 posts · HR head', value: '4 d' },
              { label: 'APR-4401 · Herpetarium retrofit', sub: 'Administration · ₹6.2L · Director', value: '4 d' },
              { label: 'APR-4433 · Incubator spares', sub: 'Finance · ₹1.2L · Controller', value: '2 d' },
            ]}
          />
        </Section>

        <Section icon={Users} label="Waiting with" aside="4 approvers">
          <Bars
            items={[
              { label: 'Chief Financial Officer', value: 5, sub: 'Oldest 5 d' },
              { label: 'Zoo Director', value: 4, sub: 'Oldest 4 d' },
              { label: 'Head of HR', value: 3, sub: 'Oldest 4 d' },
              { label: 'Curator', value: 2, sub: 'Oldest 1 d' },
            ]}
          />
          <Rule label="Concentration" />
          <Snapshot
            items={[
              { label: 'Top two', value: '9', note: 'of 14 pending' },
              { label: 'Oldest four', value: '3', note: 'Top two' },
            ]}
          />
        </Section>

        <Section icon={Building2} label="Departments" aside="this month">
          <Table
            head={['Department', 'Pending', 'Raised', 'Avg']}
            rows={[
              { label: 'Finance', sub: '2 past SLA', cells: ['5', '38', '1.9 d'], tone: 'bad' },
              { label: 'Veterinary', sub: 'Fastest', cells: ['4', '44', '0.8 d'] },
              { label: 'HR', sub: '1 past SLA', cells: ['3', '26', '2.4 d'], tone: 'warn' },
              { label: 'Administration', sub: 'Clear', cells: ['2', '20', '1.6 d'] },
            ]}
          />
        </Section>

        <Section icon={Hourglass} label="Decisions" aside="today">
          <Records
            items={[
              {
                label: 'APR-4431 · Vaccine procurement',
                sub: 'Veterinary · ₹3.8L · Dr. Mehta',
                value: 'Approved',
                tone: 'good',
              },
              {
                label: 'APR-4429 · Night-shift roster change',
                sub: 'HR · 12 staff · Shift C',
                value: 'Approved',
                tone: 'good',
              },
              {
                label: 'APR-4425 · Off-site enrichment trip',
                sub: 'Keeper cover',
                value: 'Rejected',
                tone: 'bad',
              },
              {
                label: 'APR-4412 · Feed contract',
                sub: 'Finance · ₹18.4L · CFO',
                value: 'Escalated',
                tone: 'warn',
              },
            ]}
          />
        </Section>

        <Section icon={Sparkles} label="Highlights">
          <Highlights
            items={[
              { tag: 'Queue', value: '₹31.4L', label: 'Pending', tone: 'warn' },
              { tag: 'Largest', value: '₹18.4L', label: 'Feed contract', tone: 'bad' },
              { tag: 'Speed', value: '1.4 d', label: '114 closed' },
              { tag: 'Bottleneck', value: '9', unit: 'of 14', label: 'Two approvers', tone: 'warn' },
              { tag: 'Fastest', value: '0.8 d', label: 'Veterinary · 44 raised' },
              { tag: 'Slowest', value: '2.4 d', label: 'HR · 26 raised', tone: 'warn' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
