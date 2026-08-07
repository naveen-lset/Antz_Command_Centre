/**
 * PHARMACY — money first, then the queue, then the shelf.
 *
 * The only module in the set whose primary axis is cost. A director opens Pharmacy to
 * answer "what are we spending and on what", and every other question here — who is
 * waiting, what has expired, what has run out — is a consequence of that one. So the
 * page opens on spend, splits it four ways, and only then becomes operational.
 *
 * Its drill is Central Pharmacy → Site Pharmacy → Medicine, which is a supply chain
 * rather than a taxonomy, and is why this page does not reuse the site card the animal
 * modules share: a site pharmacy is a stockroom, not an enclosure.
 */

import {
  Building2,
  CalendarClock,
  Columns3,
  IndianRupee,
  Package,
  PackageX,
  TrendingDown,
  TriangleAlert,
} from 'lucide-react'
import {
  Bars,
  Columns,
  Composition,
  Highlights,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  StatusList,
  Table,
} from '../../exec/system'
import { DrillList, DrillRow, ModuleHero, NodePanel, useSheet } from './kit'

/* ── spend ───────────────────────────────────────────────────────────────── */

const SPEND = [
  { label: 'Medicine', value: 9.8 },
  { label: 'Vaccination', value: 4.2 },
  { label: 'Supplement', value: 2.6 },
  { label: 'Consumables', value: 1.9 },
]
const TOTAL_SPEND = SPEND.reduce((n, s) => n + s.value, 0)

/** Six months of issue volume per stream — the shape behind the four cost figures. */
const USAGE: { label: string; values: number[]; unit: string }[] = [
  { label: 'Medicine', values: [1840, 1910, 1880, 2010, 1960, 2080], unit: 'units issued' },
  { label: 'Vaccination', values: [610, 640, 720, 690, 740, 806], unit: 'doses' },
  { label: 'Supplement', values: [1240, 1180, 1320, 1290, 1360, 1408], unit: 'units' },
  { label: 'Consumables', values: [3400, 3260, 3510, 3380, 3620, 3740], unit: 'items' },
]

/* ── the supply chain ────────────────────────────────────────────────────── */

const MEDICINES = (site: string) => [
  {
    id: `${site}-1`,
    label: 'Enrofloxacin 100 mg/ml',
    sub: 'Antibiotic · injectable',
    value: 0,
    unit: 'units',
    tone: 'bad' as const,
    facts: [
      { label: 'On hand', value: '0', tone: 'bad' as const },
      { label: 'Reorder level', value: '20' },
      { label: 'On order', value: '40', sub: 'PO-1182 · due 12 Aug' },
      { label: 'Unit cost', value: '₹340' },
      { label: 'Last issued', value: '29 Jul' },
    ],
  },
  {
    id: `${site}-2`,
    label: 'Meloxicam 5 mg/ml',
    sub: 'NSAID · injectable',
    value: 120,
    unit: 'units',
    facts: [
      { label: 'On hand', value: '120' },
      { label: 'Reorder level', value: '40' },
      { label: 'Expiry', value: '21 Sep 2025', tone: 'warn' as const },
      { label: 'Unit cost', value: '₹78' },
      { label: 'Last issued', value: '31 Jul' },
    ],
  },
  {
    id: `${site}-3`,
    label: 'Ivermectin injectable',
    sub: 'Antiparasitic',
    value: 0,
    unit: 'units',
    tone: 'bad' as const,
    facts: [
      { label: 'On hand', value: '0', tone: 'bad' as const },
      { label: 'Reorder level', value: '30' },
      { label: 'On order', value: '60', sub: 'PO-1184 · due 09 Aug' },
      { label: 'Unit cost', value: '₹210' },
      { label: 'Last issued', value: '26 Jul' },
    ],
  },
  {
    id: `${site}-4`,
    label: 'Vitamin B complex',
    sub: 'Supplement · 300 ml',
    value: 46,
    unit: 'units',
    facts: [
      { label: 'On hand', value: '46' },
      { label: 'Reorder level', value: '25' },
      { label: 'Expiry', value: '30 Sep 2025', tone: 'warn' as const },
      { label: 'Unit cost', value: '₹126' },
      { label: 'Last issued', value: '30 Jul' },
    ],
  },
]

const CHAIN = [
  { id: 'aquatic', label: 'Aquatic Halls pharmacy', sub: 'AQ · 4 lines below reorder', value: 412, unit: 'lines', children: MEDICINES('aq') },
  { id: 'aviary', label: 'Aviary Complex pharmacy', sub: 'AV · 2 lines below reorder', value: 366, unit: 'lines', children: MEDICINES('av') },
  { id: 'savanna', label: 'Savanna pharmacy', sub: 'SV · 1 line below reorder', value: 298, unit: 'lines', children: MEDICINES('sv') },
  { id: 'reptile', label: 'Reptile House pharmacy', sub: 'RP · clear', value: 204, unit: 'lines', children: MEDICINES('rp') },
  { id: 'primate', label: 'Primate Forest pharmacy', sub: 'PR · 1 line below reorder', value: 186, unit: 'lines', children: MEDICINES('pr') },
  { id: 'carnivore', label: 'Carnivore Ridge pharmacy', sub: 'CR · clear', value: 148, unit: 'lines', children: MEDICINES('cr') },
]

export default function Pharmacy() {
  const { open } = useSheet()

  return (
    <>
      <ModuleHero
        icon={IndianRupee}
        value="₹18.5L"
        label="Pharmacy spend"
        status="+4% on prior month"
        tone="warn"
        stats={[
          { value: '1,614', label: 'Lines held' },
          { value: '8', label: 'Below reorder' },
          { value: '22', label: 'Near expiry' },
        ]}
      />
      <Stack>
        {/* Cost first, because that is why this page is opened. Four figures, then the
            same four as one bar so the proportions read without arithmetic. */}
        <Section icon={IndianRupee} label="Cost" aside="this month">
          <Snapshot
            cols={2}
            items={[
              { label: 'Medicine', value: '₹9.8L', note: '53% of spend' },
              { label: 'Vaccination', value: '₹4.2L', note: '23%' },
              { label: 'Supplement', value: '₹2.6L', note: '14%' },
              { label: 'Consumables', value: '₹1.9L', note: '10%' },
            ]}
          />
          <Rule label="Share" />
          {/* No unit on the composition — the line under it already states the total, and
              Composition would otherwise print "18.5 ₹ lakh total" directly above it. */}
          <Composition items={SPEND} />
          <p className="mt-3 text-[11px] text-[#9b958b]">₹{TOTAL_SPEND.toFixed(1)}L total · 6-month average ₹17.2L</p>
        </Section>

        {/* Volume, not cost — the two move apart when a unit price changes, and a page
            that only shows spend cannot tell a price rise from a usage rise. */}
        <Section icon={TrendingDown} label="Usage" aside="6 months">
          <div className="flex flex-col gap-5">
            {USAGE.map((u) => (
              <div key={u.label}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] text-[#1c1a16]">{u.label}</span>
                  <span className="text-[11px] text-[#9b958b]">{u.unit}</span>
                </div>
                <Columns
                  values={u.values}
                  labels={['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']}
                  unit={undefined}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section icon={Package} label="Site requests" aside="this month">
          <Snapshot
            cols={2}
            items={[
              { label: 'Requested cost', value: '₹6.4L' },
              { label: 'Requested quantity', value: '4,180', note: 'units' },
              { label: 'Pending', value: '38', tone: 'warn' },
              { label: 'Completed', value: '164', tone: 'good' },
            ]}
          />
        </Section>

        {/* Aging is the operational read: a queue of 38 is fine, a queue with 7 items
            older than a month is not, and only the buckets can tell them apart. */}
        <Section icon={Columns3} label="Pending aging" aside="38 requests">
          <Columns values={[18, 9, 4, 7]} labels={['0–7 d', '8–15 d', '16–30 d', '30 d +']} highlight={3} unit="Requests · days waiting" />
          <Rule label="Oldest" />
          <Records
            items={[
              { label: 'REQ-2214 · Ketamine 50 mg/ml', sub: 'Veterinary Hospital · 60 units', value: '41 d', tone: 'bad' },
              { label: 'REQ-2231 · Enrofloxacin', sub: 'Aquatic Halls · 40 units', value: '36 d', tone: 'bad' },
              { label: 'REQ-2248 · Calcium supplement', sub: 'Reptile House · 200 units', value: '31 d', tone: 'warn' },
            ]}
          />
        </Section>

        {/* Central → Site → Medicine. A supply chain, so the levels are stockrooms
            rather than enclosures — which is why this module does not share the site
            card the animal modules use. */}
        <Section icon={Building2} label="Central pharmacy" aside="6 site pharmacies">
          <DrillList>
            <DrillRow
              label="Central Pharmacy"
              sub="Master stock · 1,614 lines"
              value="₹31.2L"
              unit="held"
              onOpen={() =>
                open({
                  title: 'Central Pharmacy',
                  eyebrow: 'Pharmacy',
                  body: <NodePanel title="Site pharmacies" unit="lines" nodes={CHAIN} trail={['Central Pharmacy']} />,
                })
              }
            />
          </DrillList>
          <Rule label="By site" />
          <Bars items={CHAIN.map((c) => ({ label: c.label.replace(' pharmacy', ''), value: c.value, sub: c.sub.split(' · ')[1] }))} unit="lines" />
        </Section>

        <Section icon={PackageX} label="Shelf risk" aside="30 lines">
          <StatusList
            items={[
              { label: 'Unavailable · nil stock', value: '3', tone: 'bad' },
              { label: 'Low stock · below reorder', value: '5', tone: 'warn' },
              { label: 'Near expiry · within 60 days', value: '22', tone: 'warn' },
            ]}
          />
          <Rule label="Expired this month" />
          <Table
            head={['Medicine', 'Qty', 'Value']}
            rows={[
              { label: 'Enrofloxacin 100 mg/ml', sub: 'Central Pharmacy', cells: ['40', '₹1.4L'], tone: 'bad' },
              { label: 'Meloxicam 5 mg/ml', sub: 'Veterinary Hospital', cells: ['120', '₹0.9L'], tone: 'warn' },
              { label: 'Vitamin B complex', sub: 'Aviary dispensary', cells: ['300 ml', '₹0.4L'], tone: 'warn' },
              { label: '19 further lines', sub: 'All stores', cells: ['—', '₹1.4L'] },
            ]}
          />
        </Section>

        <Section icon={CalendarClock} label="Expiry horizon">
          <Bars
            items={[
              { label: 'Within 30 days', value: 9, sub: '₹1.8L' },
              { label: '31 – 60 days', value: 13, sub: '₹2.3L' },
              { label: '61 – 90 days', value: 21, sub: '₹3.1L' },
              { label: '90 days +', value: 48, sub: '₹7.4L' },
            ]}
            unit="lines"
          />
        </Section>

        <Section icon={TriangleAlert} label="Highlights">
          <Highlights
            items={[
              { tag: 'Spend', value: '₹18.5L', label: 'This month', tone: 'warn' },
              { tag: 'Largest', value: '₹9.8L', label: 'Medicine' },
              { tag: 'Queue', value: '38', label: 'Pending requests', tone: 'warn' },
              { tag: 'Oldest', value: '41 d', label: 'REQ-2214', tone: 'bad' },
              { tag: 'Nil stock', value: '3', label: 'Lines', tone: 'bad' },
              { tag: 'Expiry', value: '₹4.1L', label: 'Within 60 days', tone: 'warn' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
