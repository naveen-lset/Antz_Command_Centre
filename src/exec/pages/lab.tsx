/**
 * LAB REQUESTS — a pipeline.
 *
 * Stage-shaped: where work sits, how long it's taking against target, then what's
 * stuck. No trend at all — a lab manager cares about the queue in front of them.
 */

import { FlaskConical, Hourglass, ListChecks, Timer, TriangleAlert } from 'lucide-react'
import { AccentProvider, Dumbbell, Funnel, Hero, Ledger, MetricGrid, Records, Section, Stack, StatusList } from '../system'

const ACCENT = '#0284c7'

export default function Lab() {
  return (
    <AccentProvider value={ACCENT}>
      <Hero
        icon={FlaskConical}
        value="31"
        label="Open lab requests"
        side={{ value: '6.2 h', label: 'avg turnaround' }}
        context="Against a 12-hour SLA. Two requests are past SLA and both are histopathology."
        status="2 breaches"
        tone="warn"
      />
      <Stack>
        <Section icon={Hourglass} label="Where the work sits" aside="31 open">
          <Funnel
            stages={[
              { label: 'Awaiting collection', value: 4, sub: '2 tonight' },
              { label: 'Received, queued', value: 5 },
              { label: 'In analysis', value: 12, sub: '2 past SLA' },
              { label: 'Reporting', value: 10 },
            ]}
          />
        </Section>

        <Section icon={Timer} label="Turnaround against target" aside="hours">
          <Dumbbell
            legend={['SLA target', 'Actual']}
            unit="h"
            items={[
              { label: 'Faecal egg count', a: 12, b: 3 },
              { label: 'Blood panel', a: 12, b: 5 },
              { label: 'Water quality', a: 12, b: 6 },
              { label: 'Swab culture', a: 24, b: 18 },
              { label: 'Histopathology', a: 24, b: 31 },
            ]}
          />
        </Section>

        <Section icon={ListChecks} label="Throughput">
          <MetricGrid
            cols={3}
            items={[
              { label: 'Completed', value: '19', note: '96% in SLA' },
              { label: 'Collected', value: '27', unit: '/31', note: '4 outstanding' },
              { label: 'Rejected', value: '3', note: 'Sample quality' },
            ]}
          />
        </Section>

        <Section icon={TriangleAlert} label="Current status">
          <StatusList
            items={[
              { label: 'Past SLA', value: '2', tone: 'bad' },
              { label: 'High priority in progress', value: '4', tone: 'warn' },
              { label: 'Awaiting collection', value: '4', tone: 'warn' },
              { label: 'Reagent stock', value: 'OK', tone: 'good' },
            ]}
          />
        </Section>

        <Section icon={Hourglass} label="Oldest in queue">
          <Ledger
            rank={false}
            items={[
              { label: 'LAB-2284 · Histopathology', sub: 'Zebra Finch ANM-33810 · partner lab', value: '38 h' },
              { label: 'LAB-2279 · Histopathology', sub: 'Chital ANM-19042 · partner lab', value: '26 h' },
              { label: 'LAB-2292 · Swab culture', sub: 'Bengal Fox ANM-40218 · in analysis', value: '14 h' },
              { label: 'LAB-2295 · Water quality', sub: 'Tank 9 · awaiting collection', value: '9 h' },
            ]}
          />
        </Section>

        <Section icon={FlaskConical} label="Results worth knowing">
          <Records
            items={[
              { label: 'Tank 9 water quality', sub: 'Ammonia elevated — filtration service raised', value: 'Yest.', tone: 'bad' },
              { label: 'Blackbuck herd · faecal egg count', sub: 'Low burden — deworming effective', value: '09:10', tone: 'good' },
              { label: 'Sambar Deer · blood panel', sub: 'Within range, post-surgical', value: '10:55', tone: 'good' },
              { label: 'Bengal Fox · swab culture', sub: 'Rejected, insufficient sample — recollect', value: '28 Jul', tone: 'warn' },
            ]}
          />
        </Section>
      </Stack>
    </AccentProvider>
  )
}
