/**
 * LAB REQUESTS — a pipeline.
 *
 * Composition is stage-shaped: where work sits, how long it's taking against
 * target, then what's stuck. No trend at all — a lab manager cares about the
 * queue in front of them, not a twelve-month history.
 */

import { Digest, Dumbbell, Funnel, Hero, Insights, Ledger, MetricGrid, Records, Section, StatusList } from '../system'

export default function Lab() {
  return (
    <>
      <Hero
        value="31"
        label="Open lab requests"
        side={{ value: '6.2 h', label: 'avg turnaround' }}
        context="Against a 12-hour SLA. Two requests are past SLA and both are histopathology."
        status="2 breaches"
        tone="warn"
      />

      <Section label="Where the work sits" band aside={<span className="text-[12px] text-[#b3aea6]">31 open</span>}>
        <Funnel
          stages={[
            { label: 'Awaiting collection', value: 4, sub: '2 scheduled tonight' },
            { label: 'Received, queued', value: 5 },
            { label: 'In analysis', value: 12, sub: '2 past SLA' },
            { label: 'Reporting', value: 10 },
          ]}
        />
        <p className="mt-5 text-[13px] leading-[20px] text-[#55524a]">
          A further <strong className="font-medium text-[#16150f]">19 requests</strong> were completed
          and closed this month.
        </p>
      </Section>

      <Section label="Executive summary">
        <Digest>
          The lab is running well ahead of its service level — <strong>6.2 hours against a 12-hour
          SLA</strong>, down from 10.0 in June. The exception is histopathology, which averages 31
          hours and holds both current breaches. Sample rejections are the quieter problem: 3 this
          month, all collection quality, all avoidable.
        </Digest>
      </Section>

      <Section label="Turnaround against target" band aside={<span className="text-[12px] text-[#b3aea6]">hours</span>}>
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
        <p className="mt-5 text-[13px] leading-[20px] text-[#55524a]">
          Histopathology is the only test type where actual exceeds target — it is also the only one
          sent to an external partner lab.
        </p>
      </Section>

      <Section label="Throughput">
        <MetricGrid
          cols={3}
          items={[
            { label: 'Completed this month', value: '19', note: '96% within SLA' },
            { label: 'Samples collected', value: '27', unit: '/31', note: '4 outstanding' },
            { label: 'Rejected', value: '3', note: 'Collection quality' },
          ]}
        />
      </Section>

      <Section label="Oldest in queue" band>
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

      <Section label="Current status">
        <StatusList
          items={[
            { label: 'Past SLA', value: '2', tone: 'bad' },
            { label: 'High priority in progress', value: '4', tone: 'warn' },
            { label: 'Awaiting collection', value: '4', tone: 'warn' },
            { label: 'Reagent stock', value: 'OK', tone: 'good' },
          ]}
        />
      </Section>

      <Section label="Results worth knowing" band>
        <Records
          items={[
            { label: 'Tank 9 water quality', sub: 'Ammonia elevated — filtration service raised', value: 'Yesterday', tone: 'bad' },
            { label: 'Blackbuck herd · faecal egg count', sub: 'Low burden — deworming effective', value: '09:10', tone: 'good' },
            { label: 'Sambar Deer ANM-22904 · blood panel', sub: 'Within range, post-surgical', value: '10:55', tone: 'good' },
            { label: 'Bengal Fox ANM-40218 · swab', sub: 'Rejected, insufficient sample — recollect', value: '28 Jul', tone: 'warn' },
          ]}
        />
      </Section>

      <Section label="AI insights">
        <Insights
          items={[
            {
              text: 'Both SLA breaches are histopathology at the external partner lab. Internal tests have never breached. This is a vendor problem, not a capacity problem.',
              tone: 'bad',
            },
            {
              text: 'All 3 rejections this month were insufficient sample volume, and all 3 came from the same two keepers. A 20-minute collection refresher would likely eliminate them.',
              tone: 'warn',
            },
            {
              text: 'Tank 9 ammonia connects to the Aquatic Hall 2 welfare finding and the fungal treatment in Health — one root cause across three modules.',
              tone: 'warn',
            },
          ]}
        />
      </Section>
    </>
  )
}
