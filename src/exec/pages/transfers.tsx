/**
 * ANIMAL MOVEMENT — the dispatch board.
 *
 * Opens on what is moving right now: live counts, then the two named consignments
 * on the road. Lanes are the signature mark and appear nowhere else in the set.
 * Numbers only — every word here names a figure, none explains one.
 *
 * Movement is counted on two independent axes, which is why the taxonomy card
 * carries five figures and not one list. Scope (intersite / external / in-house)
 * is a regulatory question; direction (in / out / internal) is a population one.
 * The same twenty-eight movements answer both, and collapsing them into a single
 * five-row list would double-count every animal.
 */

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Gauge,
  MapPin,
  Route,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { report } from '../report'
import { useSiteDrill } from '../../v4/panels'
import {
  Band,
  Bullet,
  Facts,
  Lanes,
  More,
  PeriodHero,
  Records,
  Rule,
  Section,
  Sites,
  Snapshot,
  Stack,
  Stamp,
  StatusList,
} from '../system'

export default function Transfers() {
  /* The page a KPI card lands on is where the drill is entered: a site row opens the
     existing sheet, scoped to that site. */
  const openSite = useSiteDrill('transfers', 'Animal Movement')

  return (
    <>
      <PeriodHero
        slug="transfers"
        icon={ArrowLeftRight}
        value="28"
        label="Transfers"
        status="96% On schedule"
        tone="good"
        stats={[
          { value: '2', label: 'In transit' },
          { value: '25', label: 'Completed' },
          { value: '1', label: 'Pending' },
        ]}
      />
      <Stack>
        {/* Counts first, then the two consignments they describe — a dispatch board
            is read for the live state before it is read for the month. */}
        <Section icon={MapPin} label="Now" aside="2 in transit">
          <Snapshot
            cols={4}
            items={[
              { label: 'In transit', value: '2', tone: 'warn' },
              { label: 'Pending', value: '1', tone: 'bad' },
              { label: 'Today', value: '3', tone: 'good' },
              { label: 'Delayed', value: '2', tone: 'warn' },
            ]}
          />
          <Rule label="On road" />
          <StatusList
            items={[
              { label: 'VH-01 · 4 Blackbuck → Wetland', value: '40 min', tone: 'warn' },
              { label: 'TRF-1180 · 2 Bengal Fox · CZA', value: 'Day 4', tone: 'bad' },
            ]}
          />
        </Section>

        {/* Overall stated above the six sites it is the sum of. */}
        <Section icon={MapPin} label="Sites" aside="tap to drill">
          <Sites slug="transfers" onOpenSite={openSite} />
        </Section>

        <Section icon={ArrowLeftRight} label="Movements" aside="July">
          <Snapshot
            cols={3}
            items={[
              { label: 'Intersite', value: '7', note: 'Own 6 sites' },
              { label: 'External', value: '21', note: 'Partners' },
              { label: 'In-house', value: '46', note: 'Within a site' },
            ]}
          />
          {/* Same 28 movements, cut by direction instead of by scope. In-house moves
              sit above and are excluded here — they change no site's population. */}
          <Rule label="Direction · 28" />
          <Facts
            items={[
              { label: 'Transfer in', sub: '4 sources · 6 rescue', value: '12' },
              { label: 'Transfer out', sub: '4 destinations · 4 breeding loan', value: '9' },
              { label: 'Internal', sub: 'Between own sites', value: '7' },
            ]}
          />
        </Section>

        <Section icon={ArrowDownLeft} label="Transfer in" aside={<More href="#/transfers/in" />}>
          <Snapshot
            cols={3}
            items={[
              { label: 'Animals', value: '12' },
              { label: 'Species', value: '7' },
              { label: 'Sources', value: '4' },
            ]}
          />
        </Section>

        <Section icon={ArrowUpRight} label="Transfer out" aside={<More href="#/transfers/out" />}>
          <Snapshot
            cols={3}
            items={[
              { label: 'Animals', value: '9' },
              { label: 'Species', value: '5' },
              { label: 'Blocked', value: '1', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Route} label="Lanes" aside="5">
          <Lanes
            routes={[
              { from: 'Jamnagar Core', to: 'Wetland Reserve', value: 9, sub: '4 runs' },
              { from: 'Sasan Rescue', to: 'Quarantine', value: 6, sub: 'Intake' },
              { from: 'Aviary Complex', to: 'Open Aviary 7', value: 6, sub: 'Internal' },
              { from: 'Jamnagar Core', to: 'Junagadh Zoo', value: 4, sub: 'Breeding loan' },
              { from: 'Marine Zone', to: 'Aquatic Halls', value: 3, sub: 'Internal' },
            ]}
          />
          <div className="mt-4">
            <Band
              label="Longest"
              title="Jamnagar Core → Junagadh Zoo"
              sub="5 h 40 m · 2 stops"
              value="214"
              unit="km"
            />
          </div>
        </Section>

        <Section icon={Truck} label="Fleet" aside="4 vehicles">
          <StatusList
            items={[
              { label: 'VH-01 · Wetland Reserve', value: 'ETA 16:40', tone: 'warn' },
              { label: 'VH-02 · Junagadh · empty', value: 'ETA 19:10', tone: 'warn' },
              { label: 'VH-03 · Jamnagar Core', value: 'Ready', tone: 'good' },
              { label: 'VH-04 · brake inspection', value: 'Day 2', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Gauge} label="Performance">
          <Bullet label="Success" value="96%" percent={96} target={95} note="24 of 25 · Target 95%" />
          <Rule label="Operating" />
          <Facts
            items={[
              { label: 'Average time', sub: 'Door to door', value: '6.4 h' },
              { label: 'Completed today', sub: 'Internal 2 · Intake 1', value: '3' },
              { label: 'Completed month', sub: 'Of 28', value: '25' },
              { label: 'Pending clearance', sub: 'CZA · Day 4', value: '1', tone: 'bad' },
              { label: 'Delayed', sub: 'Regulatory 1 · Welfare 1', value: '2', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Delayed" aside="2 open">
          <Records
            items={[
              {
                label: 'TRF-1180 · 2 Bengal Fox',
                sub: 'Jamnagar Core → Junagadh Zoo · CZA · 30 Jul',
                value: '4 d',
                tone: 'bad',
              },
              {
                label: 'TRF-1176 · 5 Silver Barb',
                sub: 'Wetland Reserve → Aquatic Hall 3 · tank temperature',
                value: '1 d',
                tone: 'warn',
              },
            ]}
          />
        </Section>

      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
