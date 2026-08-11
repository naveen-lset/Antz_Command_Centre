/**
 * ACCESSION — how animals entered the collection.
 *
 * The population page says the collection grew; this one says by what route. That
 * distinction carries the whole page: eight rescues and eight purchases are the
 * same +8 and completely different institutions, so collection type opens and the
 * source organisations follow it.
 */

import {
  Building,
  ClipboardList,
  Handshake,
  MapPin,
  Rabbit,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import {
  Bars,
  Facts,
  Ledger,
  More,
  PeriodHero,
  Rule,
  Section,
  Sites,
  Snapshot,
  Stack,
  Stamp,
  StatusList,
  Trend,
} from '../system'

export default function Accession() {
  return (
    <>
      <PeriodHero
        slug="accession"
        icon={Rabbit}
        value="18"
        label="Accessioned"
        status="+6 Month"
        tone="good"
        stats={[
          { value: '12', label: 'Species' },
          { value: '6', label: 'Sources' },
          { value: '3', label: 'Sites' },
        ]}
      />
      <Stack>
        <Section
          icon={ClipboardList}
          label="Collection type"
          aside={<More href="#/accession/records" />}
        >
          <Bars
            showShare
            items={[
              { label: 'Rescue', value: 8, sub: '4 road injury' },
              { label: 'Rehab intake', value: 4, sub: 'Release failed' },
              { label: 'Wild observation', value: 3, sub: 'Free-ranging' },
              { label: 'Breeding loan', value: 2, sub: 'Inbound' },
              { label: 'Examination', value: 1 },
            ]}
          />
        </Section>

        {/* Overall stated above the six sites it is the sum of. */}
        <Section icon={MapPin} label="Sites">
          <Sites slug="accession" />
        </Section>

        <Section icon={Building} label="Organizations" aside="6">
          <Ledger
            items={[
              { label: 'Gujarat Forest Dept', sub: 'Rescue · 3 species', value: '5', share: 100 },
              { label: 'Sasan Gir Rescue', sub: 'Rescue', value: '4', share: 80 },
              { label: 'Wildlife SOS', sub: 'Rehab', value: '3', share: 60 },
              { label: 'CZA', sub: 'Wild observation', value: '3', share: 60 },
              { label: 'Junagadh Zoo', sub: 'Breeding loan', value: '2', share: 40 },
              { label: 'WWF-India', sub: 'Rehab', value: '1', share: 20 },
            ]}
          />
        </Section>

        {/* Quarantine state is the operative fact about a new arrival — an animal
            that has not cleared it is in the collection but not in the collection. */}
        <Section icon={ShieldCheck} label="Quarantine" aside="now">
          <StatusList
            items={[
              { label: 'Cleared to enclosure', value: '9', tone: 'good' },
              { label: 'In observation', value: '6', tone: 'warn' },
              { label: 'Awaiting first screen', value: '2', tone: 'warn' },
              { label: 'Held · pending serology', value: '1', tone: 'bad' },
            ]}
          />
          <Rule label="Duration" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Average hold', value: '21', unit: 'd' },
              { label: 'Longest', value: '38', unit: 'd', note: 'Sangai Deer', tone: 'warn' },
              { label: 'Protocol', value: '14', unit: 'd', note: 'Minimum' },
            ]}
          />
        </Section>

        <Section icon={Handshake} label="Taxonomy" aside="12 species">
          <Facts
            items={[
              { label: 'Mammalia', sub: 'Fishing Cat · Bengal Fox · Sangai Deer', value: '7' },
              { label: 'Aves', sub: 'Peafowl · Skimmer · Stork · Junglefowl', value: '8' },
              { label: 'Reptilia', sub: 'Malabar Pit Viper', value: '3' },
            ]}
          />
        </Section>

        <Section icon={TrendingUp} label="Trend" aside="30 d">
          <Trend
            values={[1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1]}
            labels={['Week 1', 'Week 2', 'Week 3', 'Week 4']}
            unit="18 accessions · 2-day buckets"
          />
        </Section>
      </Stack>
      <Stamp />
    </>
  )
}
