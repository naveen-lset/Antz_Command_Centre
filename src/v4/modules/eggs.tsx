/**
 * EGGS — a funnel, because that is literally what it is.
 *
 * An egg is laid, it is fertile or it is not, it hatches or it does not, and the
 * hatchling survives or it does not. Four gates in sequence, and every other card on
 * this page is a way of asking which gate is losing the most: which nursery, which
 * site, which species.
 *
 * The page therefore opens on the funnel rather than on a count. "142 eggs" is not a
 * result; "142 laid, 96 hatched, 13 discarded" is.
 */

import {
  Award,
  Building2,
  Egg,
  EggOff,
  ListOrdered,
  MapPin,
  Percent,
  Sparkles,
} from 'lucide-react'
import {
  Band,
  Bars,
  Facts,
  Funnel,
  Highlights,
  Records,
  Rule,
  Section,
  Snapshot,
  Stack,
  Table,
  Tray,
} from '../../exec/system'
import { DrillList, DrillRow, ModuleHero, NodePanel, useSheet } from './kit'

const LAID = 142
const HATCHED = 96
const SURVIVED = 88
const DISCARDED = 13

/** Nursery → clutch → egg. The one hierarchy this module has that no other shares. */
const NURSERIES = [
  {
    id: 'inc1',
    label: 'Incubator 1',
    sub: 'Aviary Complex · 92% hatch',
    value: 48,
    unit: 'eggs',
    children: [
      { id: 'c24', label: 'Clutch 24 · Grey Francolin', sub: 'Set 18 Jul', value: 12, unit: 'eggs', facts: [{ label: 'Fertile', value: '11' }, { label: 'Hatched', value: '9', tone: 'good' as const }, { label: 'Discarded', value: '1' }, { label: 'Due', value: '10 Aug' }] },
      { id: 'c22', label: 'Clutch 22 · Indian Peafowl', sub: 'Set 14 Jul', value: 9, unit: 'eggs', facts: [{ label: 'Fertile', value: '8' }, { label: 'Hatched', value: '6', tone: 'good' as const }, { label: 'Discarded', value: '1' }, { label: 'Due', value: '08 Aug' }] },
      { id: 'c19', label: 'Clutch 19 · Zebra Finch', sub: 'Set 09 Jul', value: 27, unit: 'eggs', facts: [{ label: 'Fertile', value: '25' }, { label: 'Hatched', value: '24', tone: 'good' as const }, { label: 'Discarded', value: '1' }, { label: 'Closed', value: '28 Jul' }] },
    ],
  },
  {
    id: 'inc2',
    label: 'Incubator 2',
    sub: 'Aviary Complex · 71% hatch',
    value: 38,
    unit: 'eggs',
    children: [
      { id: 'c27', label: 'Clutch 27 · Painted Stork', sub: 'Set 21 Jul', value: 6, unit: 'eggs', tone: 'warn' as const, facts: [{ label: 'Fertile', value: '4', tone: 'warn' as const }, { label: 'Hatched', value: '—' }, { label: 'Discarded', value: '2' }, { label: 'Due', value: '21 Aug' }] },
      { id: 'c25', label: 'Clutch 25 · Sarus Crane', sub: 'Set 16 Jul', value: 4, unit: 'eggs', facts: [{ label: 'Fertile', value: '3' }, { label: 'Hatched', value: '2' }, { label: 'Discarded', value: '1' }, { label: 'Closed', value: '30 Jul' }] },
      { id: 'c21', label: 'Clutch 21 · Indian Skimmer', sub: 'Set 11 Jul', value: 28, unit: 'eggs', facts: [{ label: 'Fertile', value: '22' }, { label: 'Hatched', value: '18' }, { label: 'Discarded', value: '4', tone: 'warn' as const }, { label: 'Closed', value: '29 Jul' }] },
    ],
  },
  {
    id: 'rept',
    label: 'Reptile House nursery',
    sub: 'RP · 64% hatch',
    value: 34,
    unit: 'eggs',
    children: [
      { id: 'r04', label: 'Flapshell Turtle · RP-04', sub: 'Set 02 Jul', value: 20, unit: 'eggs', facts: [{ label: 'Fertile', value: '16' }, { label: 'Hatched', value: '14' }, { label: 'Discarded', value: '4', tone: 'warn' as const }, { label: 'Due', value: '13 Aug' }] },
      { id: 'r09', label: 'Indian Rock Python · RP-09', sub: 'Set 08 Jul', value: 14, unit: 'eggs', facts: [{ label: 'Fertile', value: '12' }, { label: 'Hatched', value: '—' }, { label: 'Discarded', value: '2' }, { label: 'Due', value: '30 Aug' }] },
    ],
  },
  {
    id: 'aq',
    label: 'Aquatic hatchery',
    sub: 'AQ · 83% hatch',
    value: 22,
    unit: 'eggs',
    children: [
      { id: 'a11', label: 'Nile Tilapia brood · AQ-11', sub: 'Set 17 Jul', value: 22, unit: 'eggs', facts: [{ label: 'Fertile', value: '20' }, { label: 'Hatched', value: '18' }, { label: 'Discarded', value: '2' }, { label: 'Closed', value: '27 Jul' }] },
    ],
  },
]

export default function Eggs() {
  const { open } = useSheet()

  return (
    <>
      <ModuleHero
        icon={Egg}
        slug="eggs"
        value={String(LAID)}
        label="Eggs laid"
        status={`${Math.round((HATCHED / LAID) * 100)}% hatch rate`}
        tone="good"
        stats={[
          { value: String(HATCHED), label: 'Hatched' },
          { value: String(SURVIVED), label: 'Survived' },
          { value: String(DISCARDED), label: 'Discarded' },
        ]}
      />
      <Stack>
        {/* The funnel is the page. Counts sit outside the bars so they read at any
            fill, and the gates are in the order an egg actually passes them. */}
        <Section icon={Percent} label="From laying to fledging" aside="this month">
          <Funnel
            stages={[
              { label: 'Laid', value: LAID, sub: '18 clutches' },
              { label: 'Fertile', value: 121, sub: '85% of laid' },
              { label: 'Hatched', value: HATCHED, sub: '79% of fertile' },
              { label: 'Survived 14 days', value: SURVIVED, sub: '92% of hatched' },
            ]}
            unit=" eggs"
          />
          <Rule label="Losses" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Infertile', value: '21', note: '15% of laid', tone: 'warn' },
              { label: 'Egg mortality', value: '25', note: 'in incubation', tone: 'bad' },
              { label: 'Discarded', value: String(DISCARDED), note: 'unviable', tone: 'warn' },
            ]}
          />
        </Section>

        {/* Nursery performance is the actionable split: an incubator running nine
            points behind its neighbour is a machine or a technique, and both are
            fixable this week. */}
        <Section icon={Building2} label="Nursery performance" aside="4 nurseries">
          <DrillList>
            {NURSERIES.map((n) => (
              <DrillRow
                key={n.id}
                label={n.label}
                sub={n.sub}
                value={String(n.value)}
                unit="eggs"
                onOpen={() =>
                  open({
                    title: n.label,
                    eyebrow: 'Nursery',
                    body: <NodePanel title="Clutches" unit="eggs" nodes={n.children} trail={[n.label]} />,
                  })
                }
              />
            ))}
          </DrillList>
          <Rule label="Hatch rate" />
          <Tray
            cols={4}
            cells={[
              { value: '92%', label: 'Incubator 1', tone: 'good' },
              { value: '71%', label: 'Incubator 2', tone: 'warn' },
              { value: '64%', label: 'Reptile House', tone: 'bad' },
              { value: '83%', label: 'Aquatic', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={MapPin} label="Site performance" aside="3 laying sites">
          <Bars
            items={[
              { label: 'Aviary Complex', value: 96, sub: '86 hatched' },
              { label: 'Reptile House', value: 34, sub: '14 hatched' },
              { label: 'Aquatic Halls', value: 12, sub: '18 hatched' },
            ]}
            unit="eggs"
            showShare
          />
          <p className="mt-3 text-[11px] text-[#9b958b]">
            Aquatic hatchlings exceed eggs laid this month — a June clutch closed in July.
          </p>
        </Section>

        <Section icon={ListOrdered} label="Species performance" aside="8 species">
          <Table
            head={['Species', 'Laid', 'Hatched', 'Rate']}
            rows={[
              { label: 'Zebra Finch', sub: 'Aviary Complex', cells: ['27', '24', '89%'], tone: 'good' },
              { label: 'Nile Tilapia', sub: 'Aquatic Halls', cells: ['22', '18', '82%'], tone: 'good' },
              { label: 'Flapshell Turtle', sub: 'Reptile House', cells: ['20', '14', '70%'] },
              { label: 'Indian Skimmer', sub: 'Aviary Complex', cells: ['28', '18', '64%'], tone: 'warn' },
              { label: 'Indian Rock Python', sub: 'Reptile House', cells: ['14', '0', '—'] },
              { label: 'Grey Francolin', sub: 'Aviary Complex', cells: ['12', '9', '75%'] },
              { label: 'Indian Peafowl', sub: 'Aviary Complex', cells: ['9', '6', '67%'], tone: 'warn' },
              { label: 'Sarus Crane', sub: 'Aviary Complex', cells: ['4', '2', '50%'], tone: 'bad' },
            ]}
          />
        </Section>

        {/* A first hatch is a conservation event, not a statistic. It gets a band. */}
        <Section icon={Award} label="First successful hatch" aside="this zoo">
          <Band
            label="First for Jamnagar"
            title="Indian Skimmer · 18 hatchlings"
            sub="Clutch 21 · Incubator 2 · closed 29 Jul"
            value="18"
            tone="good"
          />
          <Rule label="Earlier firsts" />
          <Records
            items={[
              { label: 'Sarus Crane', sub: 'Incubator 2 · 2 hatchlings', value: 'Mar 2025', tone: 'good' },
              { label: 'Malabar Pit Viper', sub: 'Reptile House · 6 hatchlings', value: 'Nov 2024', tone: 'good' },
              { label: 'Painted Stork', sub: 'Incubator 1 · 4 hatchlings', value: 'Aug 2024', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={EggOff} label="Discards" aside={`${DISCARDED} eggs`}>
          <Bars
            items={[
              { label: 'Infertile', value: 6 },
              { label: 'Cracked in handling', value: 3 },
              { label: 'Arrested development', value: 3 },
              { label: 'Contamination', value: 1 },
            ]}
            unit="eggs"
            showShare
          />
        </Section>

        <Section icon={Sparkles} label="Highlights">
          <Highlights
            items={[
              { tag: 'Laid', value: String(LAID), label: 'This month' },
              { tag: 'Hatch rate', value: '68', unit: '%', label: 'Of eggs laid', tone: 'good' },
              { tag: 'Survival', value: '92', unit: '%', label: 'Of hatched', tone: 'good' },
              { tag: 'Best nursery', value: '92', unit: '%', label: 'Incubator 1', tone: 'good' },
              { tag: 'Weakest', value: '64', unit: '%', label: 'Reptile House', tone: 'warn' },
              { tag: 'First hatch', value: '18', label: 'Indian Skimmer', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={Egg} label="Programme">
          <Facts
            items={[
              { label: 'Clutches set', value: '18' },
              { label: 'Average clutch', value: '7.9', sub: 'eggs' },
              { label: 'Incubation days', sub: 'Median across species', value: '24' },
              { label: 'Nursery capacity', value: '62%', sub: '142 of 230 slots' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
