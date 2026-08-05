/**
 * ANIMAL POPULATION — the register.
 *
 * Numbers only. Every word on this page names a number; none explains one.
 * Section headings are one word, sub-labels are tokens, and there is no prose
 * anywhere — the composition, not the copy, carries the reading order.
 *
 * Classes are named scientifically and counted individually. "Fish" collapsed
 * ray-finned fish, sharks and lungfish into one bar, which is fine for a poster and
 * useless for a collection plan — those are three husbandry systems.
 */

import {
  Layers,
  ListOrdered,
  MapPin,
  PawPrint,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Venus,
} from 'lucide-react'
import { CLASS_ICONS } from '../classIcons'
import { report } from '../report'
import {
  Bars,
  Composition,
  Facts,
  Filter,
  IUCN,
  Movers,
  PeriodHero,
  Poles,
  Records,
  Rule,
  Scoreboard,
  Section,
  Sites,
  Snapshot,
  Stack,
  Stamp,
  Table,
} from '../system'

/**
 * Lifted out of the JSX so the filter can measure it before rendering a subset.
 *
 * Second column is share of the 215,432 collection, computed once here rather than
 * printed by hand — 12,400/215,432 is 5.8%, and a rounded 6% typed into a string is
 * a number nobody can check.
 */
const TOTAL = 215432
const share = (n: number) => `${((n / TOTAL) * 100).toFixed(1)}%`
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
  return (
    <>
      <PeriodHero
        slug="animals"
        icon={PawPrint}
        value="215,432"
        label="Animals"
        status="+43 Month"
        tone="good"
        stats={[
          { value: '428', label: 'Species' },
          { value: '6', label: 'Sites' },
          { value: '96', label: 'Enclosures' },
        ]}
      />
      <Stack>
        {/* Undetermined is the majority answer, not missing data: most of a
            collection this size is fish and invertebrates that are never sexed. The
            "Sexed" sub-block that used to restate that as 35,084 and a 1.08:1 ratio is
            gone — the three figures are the answer, and two derivations of them were
            the card's whole second half. */}
        <Section icon={Venus} label="Sex">
          <Scoreboard
            items={[
              { value: '18,204', label: 'Male' },
              { value: '16,880', label: 'Female' },
              { value: '180,348', label: 'Undetermined' },
            ]}
          />
        </Section>

        {/* Overall stated above the six sites it is the sum of, with a find-a-site
            field. Six rows fit on screen, so the field is not for discovery — it is for
            going straight to the site you came to read. Overall does not re-total while
            filtering; the count beside it says how many rows are showing. */}
        <Section icon={MapPin} label="Sites">
          <Sites slug="animals" searchable />
        </Section>

        {/* Nine classes as counts, three to a row — the report's own grid. A stacked
            bar for nine segments produced four slivers with no readable share.
            Each class wears its own glyph: nine scientific names in a 3×3 grid are
            nine similar-length words, and the icon is what makes a row findable
            without reading it. */}
        <Section icon={Layers} label="Class composition" aside="9 classes">
          <Snapshot
            cols={3}
            items={[
              { label: 'Actinopterygii', value: '77,840', note: 'Ray-finned fish', icon: CLASS_ICONS.Actinopterygii },
              { label: 'Aves', value: '38,600', note: 'Birds', icon: CLASS_ICONS.Aves },
              { label: 'Malacostraca', value: '34,180', note: 'Crustaceans', icon: CLASS_ICONS.Malacostraca },
              { label: 'Mammalia', value: '21,900', icon: CLASS_ICONS.Mammalia },
              { label: 'Reptilia', value: '12,850', icon: CLASS_ICONS.Reptilia },
              { label: 'Insecta', value: '12,220', icon: CLASS_ICONS.Insecta },
              { label: 'Chondrichthyes', value: '8,120', note: 'Sharks, rays', icon: CLASS_ICONS.Chondrichthyes },
              { label: 'Amphibia', value: '5,482', icon: CLASS_ICONS.Amphibia },
              { label: 'Euchelicerata', value: '4,240', note: 'Arachnids', icon: CLASS_ICONS.Euchelicerata },
            ]}
          />
          <Rule label="Share" />
          <Composition
            unit="animals"
            items={[
              { label: 'Actinopterygii', value: 77840 },
              { label: 'Aves', value: 38600 },
              { label: 'Malacostraca', value: 34180 },
              { label: 'Mammalia', value: 21900 },
              { label: 'Reptilia', value: 12850 },
              { label: 'Other · 4 classes', value: 30062 },
            ]}
          />
        </Section>

        {/* Renamed from "Extremes", which read as body size — the figures are
            headcounts, so the caption now says so. The site pair that used to sit
            underneath is gone twice over: the Sites card above is sorted, so its first
            and last rows ARE the extremes, and the pair named two sites
            ("Jamnagar Core", "Quarantine") that contradicted it — claiming a 78,420
            leader at 36% where Sites states 178,400 at 83%. */}
        <Section icon={Scale} label="Most & fewest animals" aside="by species">
          <Poles
            caption={['Most', 'Fewest']}
            high={{ value: '12,400', label: 'Common Carp', sub: 'Actinopterygii' }}
            low={{ value: '4', label: 'Sangai Deer', sub: 'Critically Endangered' }}
          />
        </Section>

        {/* Published IUCN colours, not accent steps. See `IUCN` in system.tsx for why
            this is allowed to break the one-accent rule. */}
        <Section icon={ShieldAlert} label="Conservation" aside="IUCN">
          <Bars
            showShare
            items={[
              { label: 'Least Concern', value: 178240, color: IUCN['Least Concern'] },
              { label: 'Near Threatened', value: 24180, color: IUCN['Near Threatened'] },
              { label: 'Vulnerable', value: 9640, color: IUCN.Vulnerable },
              { label: 'Endangered', value: 2984, color: IUCN.Endangered },
              { label: 'Critically Endangered', value: 388, color: IUCN['Critically Endangered'] },
            ]}
          />
        </Section>

        {/* Ten species across five classes, and the class is already printed under
            every name — so it is the one axis the reader can see before they filter
            on it. Sorted by count, which puts the four fish first; anyone asking
            "what about the mammals" was previously scanning for them.

            Columns are Count and Share. The "30 d" column is gone: it held the same
            numbers as the Net change card below — +182 Zebra Finch, +180 Common Carp,
            +96 Nile Tilapia — so the two sections were one dataset shown twice. This
            card now answers "how is the collection composed" and that one answers
            "what is moving". */}
        <Section icon={ListOrdered} label="Top species" aside="10 of 428">
          <Filter
            options={['All', 'Actinopterygii', 'Aves', 'Malacostraca', 'Mammalia', 'Reptilia']}
            items={TOP_SPECIES}
            match={(r, option) => r.sub === option}
          >
            {(rows) => <Table head={['Species', 'Count', 'Share']} rows={rows} />}
          </Filter>
        </Section>

        {/* Net change per species — births and intakes less deaths and outward
            transfers. Not the same as the Animal Movement module, which counts
            transfer events: a species can be flat here while being moved a great deal.
            Named "Net change" because "Movers" was read as transfers. */}
        <Section icon={TrendingUp} label="Net change" aside="30 d · per species">
          <Movers
            items={[
              { label: 'Zebra Finch', sub: 'Aves', delta: 182 },
              { label: 'Common Carp', sub: 'Actinopterygii', delta: 180 },
              { label: 'Nile Tilapia', sub: 'Actinopterygii', delta: 96 },
              { label: 'Rose Shrimp', sub: 'Malacostraca', delta: 74 },
              { label: 'Chital', sub: 'Mammalia', delta: -9 },
              { label: 'Grey Francolin', sub: 'Aves', delta: -18 },
              { label: 'Mallard', sub: 'Aves', delta: -24 },
            ]}
          />
        </Section>

        {/* Signed values, so the column adds up in the reader's head: 45 + 18 − 23 + 3
            = 43. Transfers contributes its NET, not its volume — 28 movements with 7
            internal among them changes the headcount by three, and stating 28 beside a
            net of 43 was most of why the old total looked arbitrary. */}
        {/*
          * A BRIDGE, not a list of five figures.
          *
          * It opens on the headcount at the start of the month and closes on the one
          * the hero states, with the four flows that get you from one to the other in
          * between. That shape has two properties the old list didn't: the reader can
          * verify it by adding a column, and it cannot silently disagree with itself —
          * 215,389 + 45 + 18 − 23 + 3 = 215,432, or the card is wrong on its face.
          *
          * The list it replaced ended in a "Net" of +324 against components summing to
          * +43, and nothing about its shape made that visible.
          *
          * Transfers contributes its NET. 28 movements with 7 internal among them
          * changes the collection by three, and stating 28 in a column that is being
          * added up would break the bridge.
          */}
        <Section icon={Sparkles} label="Month">
          <Facts
            size="lg"
            items={[
              { label: 'Opening', sub: '30 Jun', value: '215,389' },
              { label: 'Births', sub: '24 species', value: '+45', delta: '+12%' },
              { label: 'Accessions', sub: '6 sources', value: '+18', delta: '+6' },
              { label: 'Deaths', sub: '0.011% of collection', value: '−23', delta: '−18%' },
              { label: 'Transfers', sub: '12 in · 9 out · 7 internal', value: '+3', delta: '+8' },
              { label: 'Closing', sub: '31 Jul', value: '215,432', delta: '+43', tone: 'good' },
            ]}
          />
          {/* The two growth rates that used to sit in a "Scale" card alongside
              enclosure occupancy. They are the long view of this same bridge, so they
              belong under it; occupancy went to Sites, and Scale is gone. */}
          <Rule label="Longer view" />
          <Facts
            items={[
              { label: 'New species', sub: 'Quarter', value: '+6' },
              { label: 'Collection growth', sub: 'Rolling year', value: '1.6%' },
            ]}
          />
        </Section>

        {/* Where, who and when — a first-of-species arrival is an event with a
            provenance, and a name against a date was none of it. Four columns rather
            than five: the head count moves into the sub-line beside the source, because
            at 390px a fifth column would clip the organisation names that are the
            point of the "who". */}
        <Section icon={PawPrint} label="New species">
          <Records
            items={[
              { label: 'Sangai Deer · 4', sub: 'Savanna Paddocks · Manipur Forest Dept', value: '12 Jun' },
              { label: 'Indian Skimmer · 6', sub: 'Aviary Complex · Chambal rescue', value: '28 May' },
              { label: 'Fishing Cat · 2', sub: 'Zone A · Bhitarkanika transfer', value: '19 May' },
              { label: 'Malabar Pit Viper · 3', sub: 'Reptile House · Agumbe rescue', value: '04 May' },
              { label: 'Painted Stork · 8', sub: 'Aviary Complex · Bharatpur exchange', value: '22 Apr' },
              { label: 'Grey Junglefowl · 3', sub: 'Savanna Paddocks · Confiscation', value: '09 Apr' },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
