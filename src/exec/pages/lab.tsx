/**
 * LAB REQUESTS — the queue.
 *
 * Stage-shaped and entirely present tense. The Funnel opens on where every open
 * sample physically sits, the month Snapshot and turnaround Table set it against
 * standard, volume and technician load explain the backlog, and the sheet closes
 * on the oldest sample and what came back.
 */

import { Beaker, FlaskConical, Hourglass, Microscope, Timer, TriangleAlert, Users } from 'lucide-react'
import {
  Band,
  Bars,
  Funnel,
  Highlights,
  Hero,
  Ladder,
  Records,
  Section,
  Snapshot,
  Stack,
  Table,
} from '../system'

export default function Lab() {
  return (
    <>
      <Hero
        icon={FlaskConical}
        value="31"
        label="Open Requests"
        status="2 breaches"
        tone="warn"
        stats={[
          { value: '6.2', unit: 'h', label: 'Avg Turnaround' },
          { value: '112', label: 'Completed' },
          { value: '12', label: 'In Analysis' },
        ]}
      />
      <Stack>
        <Section icon={Hourglass} label="Status" aside="31 open">
          <Funnel
            stages={[
              { label: 'Awaiting Collection', value: 4, sub: '2 tonight' },
              { label: 'Queued', value: 5 },
              { label: 'In Analysis', value: 12, sub: '2 past SLA' },
              { label: 'Reporting', value: 10 },
            ]}
          />
        </Section>

        <Section icon={Beaker} label="Month">
          <Snapshot
            cols={4}
            items={[
              { label: 'Completed', value: '112', note: '96% in SLA' },
              { label: 'Pending', value: '31', note: 'Open' },
              { label: 'Rejected', value: '3', note: 'Sample quality', tone: 'warn' },
              { label: 'Breaches', value: '2', note: 'External', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Timer} label="Turnaround" aside="hours">
          <Table
            head={['Test', 'Volume', 'SLA', 'Actual']}
            rows={[
              { label: 'Faecal egg count', sub: 'In-house', cells: ['41', '12', '3'] },
              { label: 'Water quality', sub: 'In-house', cells: ['28', '12', '6'] },
              { label: 'Blood panel', sub: 'In-house', cells: ['22', '12', '5'] },
              { label: 'Swab culture', sub: 'In-house', cells: ['14', '24', '18'] },
              { label: 'Histopathology', sub: 'Partner lab · Ahmedabad', cells: ['7', '24', '31'], tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={Microscope} label="Volume" aside="112 completed">
          <Ladder
            leader={{ label: 'Faecal egg count', sub: 'Deworming rechecks', value: '41' }}
            rest={[
              { label: 'Water quality', sub: '+40% · Tank 9', value: '28' },
              { label: 'Blood panel', sub: 'Routine · post-surgical', value: '22' },
              { label: 'Swab culture', sub: 'Respiratory · dermatological', value: '14' },
              { label: 'Histopathology', sub: 'Partner lab', value: '7' },
            ]}
          />
        </Section>

        <Section icon={Users} label="Technicians" aside="mean 76%">
          <Bars
            unit="%"
            items={[
              { label: 'S. Pandya', value: 92, sub: '37 h' },
              { label: 'R. Desai', value: 88, sub: '35 h' },
              { label: 'A. Kulkarni', value: 74, sub: '30 h' },
              { label: 'M. Sheth · trainee', value: 51, sub: '20 h' },
            ]}
          />
        </Section>

        {/* The record and its chasing pack share one card: split apart, the 38 h
            outlier would read as unrelated to the four samples behind it. */}
        <Section icon={TriangleAlert} label="Oldest" aside="38 h">
          <Band
            label="Longest Waiting"
            title="LAB-2284 · Histopathology"
            sub="Zebra Finch ANM-33810 · Partner lab · 01 Aug"
            value="38"
            unit="h"
            tone="bad"
          />
          <div className="mt-4">
            <Records
              items={[
                { label: 'LAB-2279 · Histopathology', sub: 'Chital ANM-19042 · Partner lab', value: '26 h', tone: 'bad' },
                { label: 'LAB-2292 · Swab culture', sub: 'Bengal Fox ANM-40218 · In analysis', value: '14 h', tone: 'warn' },
                { label: 'LAB-2295 · Water quality', sub: 'Tank 9 · Awaiting collection', value: '9 h', tone: 'warn' },
                { label: 'LAB-2301 · Faecal egg count', sub: 'Chital herd · Larval culture', value: '4 h' },
              ]}
            />
          </div>
        </Section>

        <Section icon={FlaskConical} label="Results" aside="4">
          <Records
            items={[
              { label: 'Tank 9 · Water quality', sub: 'Ammonia elevated · 6 prawn deaths', value: 'Yest.', tone: 'bad' },
              { label: 'Blackbuck herd · Faecal egg count', sub: 'Burden low · Rotation A', value: '09:10', tone: 'good' },
              { label: 'Sambar Deer · Blood panel', sub: 'In range · Post-surgical', value: '10:55', tone: 'good' },
              { label: 'Bengal Fox · Swab culture', sub: 'Rejected · Insufficient sample', value: '28 Jul', tone: 'warn' },
            ]}
          />
        </Section>

        <Section icon={Beaker} label="Highlights">
          <Highlights
            items={[
              { tag: 'Breaches', value: '2', label: 'Histopathology', tone: 'bad' },
              { tag: 'In SLA', value: '96', unit: '%', label: 'Completed', tone: 'good' },
              { tag: 'Bottleneck', value: '12', label: 'In analysis', tone: 'warn' },
              { tag: 'Utilisation', value: '2 of 4', label: 'Above 88%', tone: 'warn' },
              { tag: 'Collection', value: '4', label: 'Uncollected', tone: 'warn' },
              { tag: 'Tank 9', value: '6', label: 'Prawn deaths' },
            ]}
          />
        </Section>
      </Stack>
    </>
  )
}
