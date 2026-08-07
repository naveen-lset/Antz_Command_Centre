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

import { Layers, ListOrdered, MapPin, PawPrint, ShieldAlert, Sparkles, TrendingUp, Venus } from 'lucide-react'
import { CLASS_ICONS } from '../classIcons'
import {
  Bridge,
  Composition,
  Facts,
  Filter,
  More,
  Movers,
  PeriodHero,
  Records,
  RedList,
  Rule,
  Scoreboard,
  Section,
  Sites,
  Snapshot,
  Stack,
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
        <Section icon={Venus} label="Gender">
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
            filtering; the count beside it says how many rows are showing.

            The bars answer "which site holds most"; they cannot answer "what is IN
            Aquatic Halls", which is the next question every time. That is a different
            grain — species within a site — so it goes to the record tier rather than
            being crammed under six bars. */}
        <Section icon={MapPin} label="Sites" aside={<More href="#/animals/sites" label="All sites" />}>
          <Sites slug="animals" />
        </Section>

        {/* Nine classes as counts, TWO to a row, then their share as one stacked bar.

            Two columns rather than three: at three, a cell was ~95px, which is where
            "Chondrichthyes" and "Euchelicerata" stopped fitting on one line and the
            figure above them had to shrink to ~25px to stay inside its column. At two,
            a cell is ~150px — every Latin name sits on one line, the figures get their
            full size back, and there is room for the common name under every one of
            them rather than only the four that used to fit.

            Each class wears its own glyph: nine scientific names in a grid are nine
            similar-length words, and the icon is what makes a row findable without
            reading it. */}
        <Section icon={Layers} label="Class composition" aside="9 classes">
          <Snapshot
            cols={2}
            items={[
              { label: 'Actinopterygii', value: '77,840', note: 'Ray-finned fish', icon: CLASS_ICONS.Actinopterygii },
              { label: 'Aves', value: '38,600', note: 'Birds', icon: CLASS_ICONS.Aves },
              { label: 'Malacostraca', value: '34,180', note: 'Crustaceans', icon: CLASS_ICONS.Malacostraca },
              { label: 'Mammalia', value: '21,900', note: 'Mammals', icon: CLASS_ICONS.Mammalia },
              { label: 'Reptilia', value: '12,850', note: 'Reptiles', icon: CLASS_ICONS.Reptilia },
              { label: 'Insecta', value: '12,220', note: 'Insects', icon: CLASS_ICONS.Insecta },
              { label: 'Chondrichthyes', value: '8,120', note: 'Sharks, rays', icon: CLASS_ICONS.Chondrichthyes },
              { label: 'Amphibia', value: '5,482', note: 'Amphibians', icon: CLASS_ICONS.Amphibia },
              { label: 'Euchelicerata', value: '4,240', note: 'Arachnids', icon: CLASS_ICONS.Euchelicerata },
            ]}
          />
          <Rule label="Share" />
          <Composition
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

        {/* The published Red List badges, grouped into IUCN's own three tiers so the
            at-risk tail leads and Least Concern — much the largest number and much the
            least interesting — sits under it. Same ten categories, same counts; they
            partition the collection and sum to 215,432, the hero's own figure. */}
        {/* Every non-empty badge opens the species behind it — the count answers "how
            many Endangered animals", and the only useful next question is "which ones,
            and where". Empty categories stay inert rather than opening a page that says
            nothing. */}
        <Section icon={ShieldAlert} label="Conservation" aside="IUCN">
          <RedList
            hrefFor={(code) => `#/animals/conservation/${code}`}
            counts={{
              NC: 80,
              DD: 1640,
              NE: 316,
              LC: 176180,
              NT: 24180,
              VU: 9640,
              EN: 2984,
              CR: 388,
              EW: 24,
              EX: 0,
            }}
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
          {/* The four flows open their own records; the two balances do not.
              Opening and Closing are positions — a headcount on a date — and there is
              no list of animals behind "215,389", so a chevron there would promise one.
              Each flow's records are animal-level and already grouped by site, which is
              the "which species, where" the figure prompts.

              Values are signed numbers, not strings, so `Bridge` can add them up and
              check its own invariant rather than trusting the closing figure typed
              beside it. */}
          <Bridge
            opening={{ label: 'Opening', sub: '30 Jun', value: 215389 }}
            closing={{ label: 'Closing', sub: '31 Jul', value: 215432, delta: '+43' }}
            flows={[
              { label: 'Births', sub: '24 species', value: 45, href: '#/births/records' },
              { label: 'Accessions', sub: '6 sources', value: 18, href: '#/accession/records' },
              { label: 'Deaths', sub: '0.011% of collection', value: -23, href: '#/mortality/records' },
              { label: 'Transfers', sub: '12 in · 9 out · 7 internal', value: 3, href: '#/transfers/in' },
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
    </>
  )
}
