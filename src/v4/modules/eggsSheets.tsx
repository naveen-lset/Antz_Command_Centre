/**
 * THE EGG DRILL — Nursery → Incubator → Species → Record, in the sheet the product has.
 *
 * Same discipline as the Lab drill: a `Summary` block opens every state, a paged `RecordList`
 * ends every state, and what sits between the two is composed per state because a nursery, a
 * species and a discard reason are not the same question.
 *
 * The one thing repeated in every summary is the caveat that carries the page: hatchings are
 * counted on their own clock, not against the eggs above them, so the two figures describe
 * overlapping but different sets of eggs. Stating it once on the page and never again in the
 * sheets would leave every drilled figure quotable out of context.
 */

import { useMemo, useState } from 'react'
import { Egg, EggOff, Layers, MapPin, PawPrint, Sparkles, Thermometer } from 'lucide-react'
import { longDate, shortDate } from '../../core/calendar'
import { ACCENT_INK, Composition, FAINT, Facts, Rule, Section, Snapshot, Stack } from '../../exec/system'
import { DrillList, DrillRow, useSheet } from './kit'
import {
  byIncubator,
  bySpecies,
  hatchRate,
  pct,
  recordStatus,
  recordTone,
  totalsOf,
  type EggRecord,
  type Group,
} from './eggsData'

/* ── shared ──────────────────────────────────────────────────────────────── */

export function Summary({ rows, note }: { rows: EggRecord[]; note?: string }) {
  const t = useMemo(() => totalsOf(rows), [rows])
  const hatch = hatchRate(t)
  return (
    <Section icon={Egg} label="Eggs" aside={`${t.laid} set`}>
      <Snapshot
        cols={3}
        items={[
          { label: 'Eggs set', value: String(t.laid) },
          { label: 'Hatched', value: String(t.hatched), tone: t.hatched ? 'good' : undefined },
          { label: 'Hatch %', value: hatch === null ? '—' : `${Math.round(hatch)}%` },
        ]}
      />
      <Rule label="Of the hatchlings" />
      <Snapshot
        cols={3}
        items={[
          { label: 'Survived', value: String(t.survived), tone: t.survived ? 'good' : undefined },
          { label: 'Mortality', value: String(t.mortality), tone: t.mortality ? 'bad' : undefined },
          { label: 'Discarded', value: String(t.discarded), tone: t.discarded ? 'warn' : undefined },
        ]}
      />
      <p className="mt-3.5 text-[11px] leading-[16px]" style={{ color: FAINT }}>
        {note ??
          'Eggs set and hatchings are counted on their own dates — a clutch set in one month may hatch in the next — so the hatch percentage is a rate between two window flows, not the fate of one clutch. Survival is read as of today.'}
      </p>
    </Section>
  )
}

const PAGE = 20

export function RecordList({
  rows,
  label = 'Egg records',
  empty = 'Nothing recorded in this window',
}: {
  rows: EggRecord[]
  label?: string
  empty?: string
}) {
  const { open } = useSheet()
  const [shown, setShown] = useState(PAGE)
  const page = rows.slice(0, shown)

  return (
    <Section icon={Egg} label={label} aside={`${rows.length}`}>
      {rows.length === 0 ? (
        <p className="py-5 text-center text-[12.5px]" style={{ color: FAINT }}>
          {empty}
        </p>
      ) : (
        <>
          <DrillList>
            {page.map((r) => (
              <DrillRow
                key={r.id}
                label={`${r.id} · ${r.speciesName}`}
                sub={`${r.detail} · ${r.incubator?.name ?? r.nursery.name} · ${shortDate(r.day)}`}
                value={recordStatus(r)}
                tone={recordTone(r)}
                onOpen={() => open({ title: r.id, eyebrow: r.nursery.name, body: <RecordBody record={r} /> })}
              />
            ))}
          </DrillList>
          {shown < rows.length && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-3 w-full rounded-full py-2 text-[12.5px] font-medium"
              style={{ backgroundColor: '#f2f1ed', color: ACCENT_INK }}
            >
              Show {Math.min(PAGE, rows.length - shown)} more · {rows.length - shown} remaining
            </button>
          )}
        </>
      )}
    </Section>
  )
}

function Breakdown({
  icon,
  label,
  groups,
  metric = 'laid',
  onOpen,
  empty,
}: {
  icon: typeof MapPin
  label: string
  groups: Group[]
  metric?: 'laid' | 'hatched' | 'discarded' | 'mortality'
  onOpen: (g: Group) => void
  empty: string
}) {
  const live = groups.filter((g) => g[metric] > 0).sort((a, b) => b[metric] - a[metric])
  const widest = Math.max(...live.map((g) => g[metric]), 1)
  if (live.length === 0)
    return (
      <Section icon={icon} label={label}>
        <p className="py-5 text-center text-[12.5px]" style={{ color: FAINT }}>
          {empty}
        </p>
      </Section>
    )
  return (
    <Section icon={icon} label={label} aside={`${live.length}`}>
      <DrillList>
        {live.map((g) => (
          <DrillRow
            key={g.key}
            label={g.label}
            sub={
              metric === 'laid'
                ? `${g.hatched} hatched${g.hatchPct === null ? '' : ` · ${Math.round(g.hatchPct)}%`}${g.discarded ? ` · ${g.discarded} discarded` : ''}`
                : g.sub
            }
            value={String(g[metric])}
            bar={(g[metric] / widest) * 100}
            onOpen={() => onOpen(g)}
          />
        ))}
      </DrillList>
    </Section>
  )
}

/* ── one record ──────────────────────────────────────────────────────────── */

export function RecordBody({ record: r }: { record: EggRecord }) {
  return (
    <Stack>
      <Section icon={Egg} label="Record" aside={r.id}>
        <Facts
          items={[
            { label: 'Record ID', value: r.id },
            { label: 'Stage', value: r.slug === 'eggs' ? 'Egg set' : r.slug === 'hatched' ? 'Hatched' : 'Discarded' },
            { label: r.slug === 'discarded' ? 'Reason' : 'Detail', value: r.detail, tone: recordTone(r) },
            { label: 'Species', value: r.speciesName },
            { label: 'Site', value: r.siteName },
            { label: 'Nursery', value: r.nursery.name },
            ...(r.incubator
              ? [
                  { label: 'Incubator', value: r.incubator.name, sub: `${r.incubator.trays} trays · ${r.incubator.tempC} °C` },
                ]
              : []),
            { label: 'Date', value: longDate(r.day) },
            ...(r.slug === 'hatched'
              ? [
                  { label: 'Hatchling', value: r.animalId },
                  {
                    label: 'Survival',
                    value: r.survived ? 'Alive' : `Died ${r.died === undefined ? '—' : longDate(r.died)}`,
                    tone: r.survived ? ('good' as const) : ('bad' as const),
                  },
                ]
              : []),
          ]}
        />
      </Section>
      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-[11px]" style={{ color: FAINT }}>
        Deepest level
      </p>
    </Stack>
  )
}

/* ── nursery ─────────────────────────────────────────────────────────────── */

export function NurseryBody({ rows, name }: { rows: EggRecord[]; name: string }) {
  const { open } = useSheet()
  const t = useMemo(() => totalsOf(rows), [rows])
  return (
    <Stack>
      <Summary rows={rows} />

      {t.discarded > 0 && (
        <Section icon={EggOff} label="Discard reasons" aside={`${t.discarded}`}>
          <Composition
            items={Object.entries(
              rows
                .filter((r) => r.slug === 'discarded')
                .reduce<Record<string, number>>((m, r) => ({ ...m, [r.detail]: (m[r.detail] ?? 0) + 1 }), {}),
            ).map(([label, value]) => ({ label, value }))}
            unit="eggs"
          />
        </Section>
      )}

      <Breakdown
        icon={Thermometer}
        label="Incubators"
        groups={byIncubator(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: `${name} · incubator`, body: <IncubatorBody rows={g.rows} /> })}
        empty="No incubator recorded"
      />
      <Breakdown
        icon={Layers}
        label="Species"
        groups={bySpecies(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: `${name} · species`, body: <SpeciesBody rows={g.rows} /> })}
        empty="No species recorded"
      />
      <RecordList rows={rows} />
    </Stack>
  )
}

export function IncubatorBody({ rows }: { rows: EggRecord[] }) {
  const { open } = useSheet()
  const inc = rows[0]?.incubator
  return (
    <Stack>
      <Summary rows={rows} />
      {inc && (
        <Section icon={Thermometer} label="Unit">
          <Facts
            items={[
              { label: 'Incubator', value: inc.name },
              { label: 'Nursery', value: rows[0].nursery.name, sub: rows[0].siteName },
              { label: 'Trays', value: String(inc.trays) },
              { label: 'Set temperature', value: `${inc.tempC} °C` },
            ]}
          />
        </Section>
      )}
      <Breakdown
        icon={Layers}
        label="Species"
        groups={bySpecies(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Species', body: <SpeciesBody rows={g.rows} /> })}
        empty="No species recorded"
      />
      <RecordList rows={rows} />
    </Stack>
  )
}

/* ── species ─────────────────────────────────────────────────────────────── */

export function SpeciesBody({ rows }: { rows: EggRecord[] }) {
  const { open } = useSheet()
  const t = useMemo(() => totalsOf(rows), [rows])
  return (
    <Stack>
      <Summary rows={rows} />
      {t.hatched > 0 && (
        <Section icon={Sparkles} label="Hatch outcome" aside={`${t.hatched} hatched`}>
          <Composition
            items={[
              { label: 'Survived', value: t.survived },
              { label: 'Mortality', value: t.mortality },
            ]}
            unit="hatchlings"
          />
          <p className="mt-3.5 text-[11px] leading-[16px]" style={{ color: FAINT }}>
            {Math.round(pct(t.survived, t.hatched))}% survival, read as of today.
          </p>
        </Section>
      )}
      <Breakdown
        icon={Thermometer}
        label="Incubators"
        groups={byIncubator(rows)}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Incubator', body: <IncubatorBody rows={g.rows} /> })}
        empty="No incubator recorded"
      />
      <RecordList rows={rows} />
    </Stack>
  )
}

/* ── a stage cut · set, hatched, discarded, survived, mortality ──────────── */

export function StageBody({ rows, note }: { rows: EggRecord[]; note: string }) {
  const { open } = useSheet()
  return (
    <Stack>
      <Summary rows={rows} note={note} />
      <Breakdown
        icon={MapPin}
        label="By nursery"
        groups={useMemo(() => byNurseryLocal(rows), [rows])}
        metric={rows[0]?.slug === 'discarded' ? 'discarded' : rows[0]?.slug === 'hatched' ? 'hatched' : 'laid'}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Nursery', body: <NurseryBody rows={g.rows} name={g.label} /> })}
        empty="Nothing to break down"
      />
      <Breakdown
        icon={Layers}
        label="By species"
        groups={bySpecies(rows)}
        metric={rows[0]?.slug === 'discarded' ? 'discarded' : rows[0]?.slug === 'hatched' ? 'hatched' : 'laid'}
        onOpen={(g) => open({ title: g.label, eyebrow: 'Species', body: <SpeciesBody rows={g.rows} /> })}
        empty="No species"
      />
      <RecordList rows={rows} />
    </Stack>
  )
}

/* Local rather than imported so the stage cut groups the rows it was handed, not the page's. */
function byNurseryLocal(rows: EggRecord[]): Group[] {
  const by = new Map<string, EggRecord[]>()
  for (const r of rows) {
    const at = by.get(r.nursery.id)
    if (at) at.push(r)
    else by.set(r.nursery.id, [r])
  }
  return [...by.entries()].map(([key, list]) => {
    const t = totalsOf(list)
    return { key, label: list[0].nursery.name, sub: list[0].siteName, ...t, hatchPct: hatchRate(t), rows: list }
  })
}

/* ── first hatch on record ───────────────────────────────────────────────── */

export function FirstHatchBody({ rows, speciesName }: { rows: EggRecord[]; speciesName: string }) {
  const first = rows.filter((r) => r.slug === 'hatched').sort((a, b) => a.day - b.day)[0]
  return (
    <Stack>
      <Section icon={PawPrint} label="First hatch on record" aside={speciesName}>
        <Facts
          items={[
            { label: 'Species', value: speciesName },
            { label: 'First hatch', value: first ? longDate(first.day) : '—' },
            { label: 'Nursery', value: first?.nursery.name ?? '—', sub: first?.siteName },
            { label: 'Incubator', value: first?.incubator?.name ?? '—' },
            { label: 'How it hatched', value: first?.detail ?? '—' },
          ]}
        />
        <p className="mt-3.5 text-[11px] leading-[16px]" style={{ color: FAINT }}>
          Earliest hatching for this species anywhere in the ledger, not the earliest inside the
          reporting window.
        </p>
      </Section>
      <RecordList rows={rows} label="Every record for this species" />
    </Stack>
  )
}

export { byIncubator, bySpecies }
