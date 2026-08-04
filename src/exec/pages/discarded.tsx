/**
 * EGGS DISCARDED — the losses in the incubation room.
 *
 * Promoted out of the egg pipeline, where it was a three-word sub-label on one
 * funnel stage. The reasons are the reason it needs a page: infertile is a breeding
 * result, thin shelled is a nutrition result, and rotten is a handling result. Three
 * different departments, one number, and no way to tell them apart from the funnel.
 */

import {
  Egg,
  EggOff,
  Grid3x3,
  ListChecks,
  MapPin,
  Search,
} from 'lucide-react'
import { report } from '../report'
import {
  Bars,
  Donut,
  Facts,
  More,
  PeriodHero,
  Records,
  Rule,
  Section,
  Sites,
  Snapshot,
  Stack,
  Stamp,
} from '../system'

export default function Discarded() {
  return (
    <>
      <PeriodHero
        slug="discarded"
        icon={EggOff}
        value="13"
        label="Eggs discarded"
        status="9% of collected"
        tone="warn"
        stats={[
          { value: '5', label: 'Species' },
          { value: '3', label: 'Units' },
          { value: '4', label: 'Reasons' },
        ]}
      />
      <Stack>
        <Section icon={ListChecks} label="Reasons" aside={<More href="#/discarded/records" />}>
          <Donut
            label="Eggs"
            items={[
              { label: 'Infertile', value: 5 },
              { label: 'Thin shelled', value: 3 },
              { label: 'Rotten', value: 3, tone: 'bad' },
              { label: 'Red ring', value: 2 },
            ]}
          />
          {/* Each reason points at a different owner — the split is only useful
              once the page says who acts on it. */}
          <Rule label="Owner" />
          <Facts
            items={[
              { label: 'Infertile', sub: 'Breeding · pairing review', value: '5' },
              { label: 'Thin shelled', sub: 'Nutrition · calcium supplementation', value: '3' },
              { label: 'Rotten · Red ring', sub: 'Handling · sanitation protocol', value: '5', tone: 'bad' },
            ]}
          />
        </Section>

        {/* Overall stated above the six sites it is the sum of. */}
        <Section icon={MapPin} label="Sites">
          <Sites slug="discarded" />
        </Section>

        <Section icon={Egg} label="Against collection" aside="July">
          <Snapshot
            cols={4}
            items={[
              { label: 'Collected', value: '142' },
              { label: 'Fertile', value: '129' },
              { label: 'Discarded', value: '13', tone: 'warn' },
              { label: 'Discard rate', value: '9', unit: '%', note: 'June 11%' },
            ]}
          />
        </Section>

        <Section icon={Search} label="Species" aside="5">
          <Bars
            showShare
            items={[
              { label: 'Mallard', value: 5, sub: 'INC-4' },
              { label: 'Grey Francolin', value: 4, sub: 'INC-2' },
              { label: 'Emu', value: 3, sub: 'INC-8' },
              { label: 'Indian Peafowl', value: 1 },
            ]}
          />
        </Section>

        <Section icon={Grid3x3} label="Units">
          <Facts
            items={[
              { label: 'INC-4 · Mallard', sub: 'Day 10 candling', value: '5', tone: 'warn' },
              { label: 'INC-2 · Grey Francolin', sub: 'Day 7 candling', value: '4' },
              { label: 'INC-8 · Emu', sub: 'Day 18 · one at day 21', value: '3' },
              { label: 'INC-3 · Indian Peafowl', sub: 'Day 12', value: '1' },
            ]}
          />
        </Section>

        <Section icon={Search} label="Detection" aside="candling">
          <Records
            items={[
              { label: 'Batch EG-2204 · Mallard', sub: 'Day 10 · 5 of 11 pulled', value: '28 Jul', tone: 'bad' },
              { label: 'Batch EG-2211 · Grey Francolin', sub: 'Day 7 · 4 of 22 · 3 infertile', value: '24 Jul', tone: 'warn' },
              { label: 'Batch EG-2216 · Emu', sub: 'Day 18 · 2 pulled · 1 late at day 21', value: '21 Jul', tone: 'warn' },
              { label: 'Batch EG-2208 · Indian Peafowl', sub: 'Day 12 · 1 of 21', value: '17 Jul' },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
