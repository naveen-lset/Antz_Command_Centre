/**
 * ANIMALS — the register, organised by what the collection is ANSWERABLE for.
 *
 * The page's spine is regulatory status, not taxonomy. A curator's first question of a
 * collection this size is not "how many birds" — it is "how many of these animals does
 * a permit, a schedule or a CITES appendix apply to", because that is the number that
 * carries a legal obligation. Taxonomy is one card down; the drill to a named animal
 * is one tap further.
 *
 * Every string here names a number. There is no prose.
 */

import {
  ArrowLeftRight,
  Baby,
  Footprints,
  Layers,
  ListOrdered,
  MapPin,
  PawPrint,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Activity,
} from 'lucide-react'
import {
  Bars,
  Composition,
  Facts,
  Filter,
  RedList,
  Rule,
  Section,
  Snapshot,
  Stack,
  Table,
  fmt,
} from '../../exec/system'
import { DrillList, DrillRow, ModuleHero, NodePanel, SiteSplit, useSheet } from './kit'
import { MetricPanel } from '../panels'

const TOTAL = 215432
const REGULATORY = 37122
const share = (n: number) => `${((n / TOTAL) * 100).toFixed(1)}%`

/**
 * The regulated tail, by instrument.
 *
 * CITES and the Wildlife Protection Act schedules are different instruments over
 * overlapping animals, so they are stated as two lists rather than summed into one —
 * a Schedule I tiger listed on Appendix I is one animal with two obligations, and a
 * combined total would count it twice.
 */
const CITES: [string, number][] = [
  ['Appendix I', 4180],
  ['Appendix II', 12640],
  ['Appendix III', 3902],
]

const SCHEDULES: [string, number][] = [
  ['Schedule I', 6240],
  ['Schedule II', 8180],
  ['Schedule III', 1980],
]

const NON_REGULATORY: [string, number][] = [
  ['Domestic', 96420],
  ['Farm', 61180],
  ['Companion animals', 20710],
]

/**
 * The six flows that move the headcount, each opening its own records.
 *
 * Signed, so the column adds up in the reader's head: +45 +18 −23 −5 −1 +3 = +37 net
 * of the escapes and fetal losses that the bridge on the old page silently omitted.
 */
const EVENTS = [
  { key: 'birth', label: 'Birth', sub: '24 species', value: 45, tone: 'good' as const, icon: Sparkles },
  { key: 'mortality', label: 'Mortality', sub: '0.011% of collection', value: -23, tone: 'bad' as const, icon: Activity },
  { key: 'external', label: 'External transfer', sub: '12 in · 9 out', value: 3, icon: ArrowLeftRight },
  { key: 'internal', label: 'Internal transfer', sub: 'Between sites', value: 0, sublabel: '7 moves, no net change', icon: ArrowLeftRight },
  { key: 'escaped', label: 'Escaped animals', sub: '1 recaptured', value: -1, tone: 'warn' as const, icon: Footprints },
  { key: 'fetal', label: 'Fetal death', sub: '3 species', value: -5, tone: 'bad' as const, icon: Baby },
]

const TOP_SPECIES = [
  ['Common Carp', 'Actinopterygii', 12400],
  ['Zebra Finch', 'Aves', 6820],
  ['Nile Tilapia', 'Actinopterygii', 5940],
  ['Indian Peafowl', 'Aves', 4310],
  ['Rose Shrimp', 'Malacostraca', 3880],
  ['Silver Barb', 'Actinopterygii', 2940],
  ['Rock Pigeon', 'Aves', 2210],
  ['Grey Francolin', 'Aves', 1640],
  ['Bengal Fox', 'Mammalia', 1280],
  ['Flapshell Turtle', 'Reptilia', 1090],
].map(([label, sub, count]) => ({
  label: label as string,
  sub: sub as string,
  cells: [(count as number).toLocaleString('en-US'), share(count as number)],
}))

export default function Animals() {
  const { open } = useSheet()

  const drill = (title: string) =>
    open({ title, eyebrow: 'Animal Population', body: <MetricPanel metric="animals" /> })

  return (
    <>
      <ModuleHero
        icon={PawPrint}
        slug="animals"
        value={fmt(TOTAL)}
        label="Animals"
        status="+37 net · month"
        tone="good"
        stats={[
          { value: '428', label: 'Species' },
          { value: '6', label: 'Sites' },
          { value: '96', label: 'Enclosures' },
        ]}
      />
      <Stack>
        {/* Regulatory status leads. It is the split that carries an obligation, and it
            is the one a director is asked about by an inspector. */}
        <Section icon={ScrollText} label="Regulatory standing" aside={share(REGULATORY)}>
          <Snapshot
            cols={2}
            items={[
              { label: 'Regulatory', value: fmt(REGULATORY), note: 'permit or schedule applies' },
              { label: 'Non-regulatory', value: fmt(TOTAL - REGULATORY), note: 'domestic, farm, companion' },
            ]}
          />
          <Rule label="CITES appendix" />
          <Bars items={CITES.map(([label, value]) => ({ label, value }))} unit="animals" showShare />
          <Rule label="Wildlife Protection Act" />
          <Bars items={SCHEDULES.map(([label, value]) => ({ label, value }))} unit="animals" showShare />
          {/* Stated because the two lists overlap and a reader will otherwise add
              them. Six numbers that cannot be summed have to say so. */}
          <p className="mt-3 text-[11px] text-[#9b958b]">
            The two instruments overlap — an animal can carry both, so the lists do not sum.
          </p>
        </Section>

        <Section icon={PawPrint} label="Non-regulatory" aside={fmt(TOTAL - REGULATORY)}>
          <Composition items={NON_REGULATORY.map(([label, value]) => ({ label, value }))} unit="animals" />
        </Section>

        {/* Population events: the six flows, each opening its records. Internal
            transfers are listed at a net of zero on purpose — seven animals moved and
            the collection did not change, which is exactly the fact a director needs
            when the transfer count looks alarming. */}
        <Section icon={Sparkles} label="Population events" aside="this month">
          <DrillList>
            {EVENTS.map((e) => (
              <DrillRow
                key={e.key}
                lead={e.icon}
                label={e.label}
                sub={e.sublabel ?? e.sub}
                value={`${e.value > 0 ? '+' : e.value < 0 ? '−' : ''}${Math.abs(e.value)}`}
                tone={e.tone}
                onOpen={() => drill(e.label)}
              />
            ))}
          </DrillList>
          <Rule label="Net" />
          <Facts
            items={[
              { label: 'Opening · 30 Jun', value: '215,395' },
              { label: 'Closing · 31 Jul', value: fmt(TOTAL), delta: '+37', tone: 'good' },
            ]}
          />
        </Section>

        <Section
          icon={MapPin}
          label="Sites"
          aside="tap to drill"
        >
          <SiteSplit slug="animals" onOpenSite={(_, name) => drill(name)} />
        </Section>

        <Section icon={Layers} label="Class composition" aside="9 classes">
          <Snapshot
            cols={2}
            items={[
              { label: 'Actinopterygii', value: '77,840', note: 'Ray-finned fish' },
              { label: 'Aves', value: '38,600', note: 'Birds' },
              { label: 'Malacostraca', value: '34,180', note: 'Crustaceans' },
              { label: 'Mammalia', value: '21,900', note: 'Mammals' },
              { label: 'Reptilia', value: '12,850', note: 'Reptiles' },
              { label: 'Insecta', value: '12,220', note: 'Insects' },
              { label: 'Chondrichthyes', value: '8,120', note: 'Sharks, rays' },
              { label: 'Amphibia', value: '5,482', note: 'Amphibians' },
              { label: 'Euchelicerata', value: '4,240', note: 'Arachnids' },
            ]}
          />
        </Section>

        <Section icon={ShieldAlert} label="Conservation" aside="IUCN">
          <RedList
            counts={{ NC: 80, DD: 1640, NE: 316, LC: 176180, NT: 24180, VU: 9640, EN: 2984, CR: 388, EW: 24, EX: 0 }}
          />
        </Section>

        <Section icon={ListOrdered} label="Top species" aside="10 of 428">
          <Filter
            options={['All', 'Actinopterygii', 'Aves', 'Malacostraca', 'Mammalia', 'Reptilia']}
            items={TOP_SPECIES}
            match={(r, option) => r.sub === option}
          >
            {(rows) => <Table head={['Species', 'Count', 'Share']} rows={rows} />}
          </Filter>
        </Section>

        <Section icon={Footprints} label="Enclosure occupancy" aside="96 enclosures">
          <NodeLauncher />
        </Section>
      </Stack>
    </>
  )
}

/**
 * Occupancy, which is the one animal-side question the Site → Species → Animal drill
 * cannot answer: it is a property of the ENCLOSURE, not of the animals in it.
 */
const OCCUPANCY = [
  {
    id: 'aquatic',
    label: 'Aquatic Halls',
    sub: '22 enclosures · 4 over 90%',
    value: 22,
    children: [
      { id: 'AQ-14', label: 'Tank 14', sub: '98% of capacity', value: 98, unit: '%', tone: 'bad' as const, facts: [{ label: 'Holding', value: '4,180' }, { label: 'Capacity', value: '4,270' }, { label: 'Species', value: '3' }, { label: 'Last survey', value: '12 Jul' }] },
      { id: 'AQ-09', label: 'Tank 9', sub: '91% of capacity', value: 91, unit: '%', tone: 'warn' as const, facts: [{ label: 'Holding', value: '3,640' }, { label: 'Capacity', value: '4,000' }, { label: 'Species', value: '2' }, { label: 'Last survey', value: '12 Jul' }] },
      { id: 'AQ-03', label: 'Tank 3', sub: '76% of capacity', value: 76, unit: '%', facts: [{ label: 'Holding', value: '2,280' }, { label: 'Capacity', value: '3,000' }, { label: 'Species', value: '4' }, { label: 'Last survey', value: '02 Jul' }] },
    ],
  },
  {
    id: 'aviary',
    label: 'Aviary Complex',
    sub: '24 enclosures · 1 over 90%',
    value: 24,
    children: [
      { id: 'AV-04', label: 'Flight 4', sub: '97% of capacity', value: 97, unit: '%', tone: 'bad' as const, facts: [{ label: 'Holding', value: '1,940' }, { label: 'Capacity', value: '2,000' }, { label: 'Species', value: '6' }, { label: 'Last survey', value: '09 Jul' }] },
      { id: 'AV-16', label: 'Flight 16', sub: '68% of capacity', value: 68, unit: '%', facts: [{ label: 'Holding', value: '1,020' }, { label: 'Capacity', value: '1,500' }, { label: 'Species', value: '4' }, { label: 'Last survey', value: '09 Jul' }] },
    ],
  },
  {
    id: 'savanna',
    label: 'Savanna',
    sub: '18 enclosures · 1 over 90%',
    value: 18,
    children: [
      { id: 'SV-09', label: 'Paddock 9', sub: '96% of capacity', value: 96, unit: '%', tone: 'warn' as const, facts: [{ label: 'Holding', value: '480' }, { label: 'Capacity', value: '500' }, { label: 'Species', value: '2' }, { label: 'Last survey', value: '18 Jul' }] },
      { id: 'SV-02', label: 'Paddock 2', sub: '71% of capacity', value: 71, unit: '%', facts: [{ label: 'Holding', value: '355' }, { label: 'Capacity', value: '500' }, { label: 'Species', value: '1' }, { label: 'Last survey', value: '18 Jul' }] },
    ],
  },
]

function NodeLauncher() {
  const { open } = useSheet()
  return (
    <DrillList>
      {OCCUPANCY.map((s) => (
        <DrillRow
          key={s.id}
          label={s.label}
          sub={s.sub}
          value={`${s.value}`}
          unit="enclosures"
          onOpen={() =>
            open({
              title: s.label,
              eyebrow: 'Enclosure occupancy',
              body: <NodePanel title="Enclosures" unit="% occupancy" nodes={s.children} trail={[s.label]} />,
            })
          }
        />
      ))}
      <DrillRow label="Over 95% occupancy" sub="Flagged as critical capacity" value="4" tone="bad" />
    </DrillList>
  )
}
