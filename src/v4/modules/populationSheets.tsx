/**
 * WHAT THE ANIMAL POPULATION PAGE OPENS.
 *
 * The brief's rule is that contextual exploration never navigates: a site, a species, a CITES
 * appendix, a Red List category, a month's births — each is a LOOK at something, so each is a
 * sheet. `v4/sheet.tsx` already provides exactly one sheet with swapping content and a
 * breadcrumb eyebrow, so going Overall → CITES I → Aviary Complex → Sarus Crane → an animal is
 * four content swaps in one panel rather than four stacked overlays.
 *
 * FOUR PANELS, NOT TWELVE. The brief names ten drill targets and they collapse to four shapes:
 *
 *   SitePanel     one place, and everything in it
 *   SpeciesPanel  one species, its sexes, its standing, its animals
 *   GroupPanel    a set of species — a CITES appendix, a schedule, a Red List category, a
 *                 taxonomic class, the regulated half of the collection
 *   FlowPanel     a set of events — births, deaths, transfers, escapes, fetal losses
 *
 * Writing five near-identical event sheets is how "Deaths by site" and "Births by site" end up
 * grouping differently; one parameterised panel cannot.
 *
 * Nothing is drawn here. Every mark is `exec/system.tsx`, every row is `panels.tsx`'s `TapRow`,
 * and the animal record at the bottom is the same `AnimalPanel` the rest of the product opens.
 */

import { useMemo } from 'react'
import {
  Activity,
  ArrowLeftRight,
  Baby,
  Dna,
  Footprints,
  Layers,
  ListOrdered,
  MapPin,
  PawPrint,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Venus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { shortDate, type Win } from '../../core/calendar'
import { animalsInScope, animalsOfSpecies, type Animal } from '../../core/animals'
import { page as eventPage, type Ev } from '../../core/events'
import { SITES, siteOf, speciesByName } from '../../core/world'
import {
  Bars,
  Composition,
  FAINT,
  Facts,
  Figure,
  HERO_INK,
  RED_LIST,
  Rule,
  Section,
  Snapshot,
  Stack,
  TONE,
  fmt,
  type RedListCode,
} from '../../exec/system'
import { AnimalPanel, TapList, TapRow } from '../panels'
import { useSheet } from '../sheet'
import { MoreRows, usePaged } from '../perf'
import { animalFromId } from '../drill'
import {
  citesSpecies,
  classBands,
  holdings,
  iucnSpecies,
  isRegulated,
  plural,
  regulatorySplit,
  scheduleSpecies,
  standingLabel,
  totalOf,
  type CitesAppendix,
  type Holding,
  type ScheduleClass,
} from './regulatory'
import {
  change,
  flowByCause,
  flowBySite,
  flowBySpecies,
  flowCount,
  movement,
  speciesRows,
  type SpeciesRow,
} from './population'

const SEX_WORD = { M: 'Male', F: 'Female', U: 'Undetermined' } as const

/* ── a shared sheet hero, so five panels open the same way ───────────────── */

function SheetHero({
  value,
  unit,
  label,
  note,
  status,
  tone,
  badge,
}: {
  value: string
  unit?: string
  label: string
  note?: string
  status?: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
  /** The published Red List badge, where the sheet is about one. */
  badge?: (typeof RED_LIST)[number]
}) {
  return (
    <div className="w-full px-[var(--gutter-lg)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-center gap-3">
          {badge && (
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full rounded-tr-[6px] font-display text-small font-bold"
              style={{
                backgroundColor: badge.fill,
                color: badge.ink,
                boxShadow: 'outline' in badge && badge.outline ? `inset 0 0 0 1.5px ${badge.outline}` : undefined,
              }}
              aria-hidden
            >
              {badge.code}
            </span>
          )}
          <Figure value={value} unit={unit} size={badge ? 40 : 48} color={HERO_INK} />
        </div>
        <p className="mt-1 text-body text-[#3d3a34]">{label}</p>
        {status && (
          <p className="mt-3 flex items-center gap-2">
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone ?? 'neutral'] }} aria-hidden />
            <span className="text-small font-medium" style={{ color: TONE[tone ?? 'neutral'] }}>
              {status}
            </span>
          </p>
        )}
        {note && (
          <p className="mt-2.5 text-caption" style={{ color: FAINT }}>
            {note}
          </p>
        )}
      </section>
    </div>
  )
}

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`
const netTone = (n: number): 'good' | 'bad' | 'neutral' => (n > 0 ? 'good' : n < 0 ? 'bad' : 'neutral')

/* ── the animal list every panel ends on ─────────────────────────────────── */

/**
 * A page of real animals, never a sample presented as a total.
 *
 * `usePaged` walks the real population and `MoreRows` prints "20 of 12,400" beside it, so a
 * list that shows twenty rows can never be read as a population of twenty.
 */
function Animals({
  fetch,
  deps,
  eyebrow,
}: {
  fetch: (offset: number, limit: number) => { rows: Animal[]; total: number }
  deps: unknown[]
  eyebrow: string
}) {
  const { open } = useSheet()
  const paged = usePaged(fetch, 20, deps)

  return (
    <Section icon={PawPrint} label="Animals" aside={paged.total ? fmt(paged.total) : undefined}>
      <TapList>
        {paged.rows.map((a) => (
          <TapRow
            key={a.id}
            label={a.callName ?? a.id}
            sub={`${a.id} · ${a.speciesName} · ${a.enclosureId} · ${SEX_WORD[a.sex]} · ${a.age}`}
            value={a.status}
            tone={a.status === 'Healthy' ? 'good' : a.status === 'Critical' ? 'bad' : 'warn'}
            onOpen={() => open({ title: a.callName ?? a.id, eyebrow, body: <AnimalPanel record={animalFromId(a.id)} /> })}
          />
        ))}
      </TapList>
      {paged.total === 0 && <p className="text-small text-[#6d6860]">No animals in this scope.</p>}
      <MoreRows page={paged} noun="animals" />
    </Section>
  )
}

/* ── one site ────────────────────────────────────────────────────────────── */

/**
 * The site sheet, in the order the brief sets: what is here, what it is answerable for, how it
 * moved, what species make it up, then the animals themselves.
 */
export function SitePanel({ siteKey, win }: { siteKey: string; win: Win }) {
  const { open } = useSheet()
  const site = siteOf(siteKey)
  const rows = useMemo(() => holdings(siteKey, win), [siteKey, win])
  const species = useMemo(() => speciesRows(siteKey, win), [siteKey, win])
  const move = useMemo(() => movement(siteKey, win), [siteKey, win])
  const delta = useMemo(() => change(siteKey, win), [siteKey, win])
  const split = regulatorySplit(rows)
  const total = totalOf(rows)

  if (!site) return null

  return (
    <>
      <SheetHero
        value={fmt(total)}
        label={`Animals · ${site.name}`}
        status={`${signed(delta.net)} · ${win.window}`}
        tone={netTone(delta.net)}
        note={`${site.code} · ${species.length} species · ${site.enclosures} enclosures`}
      />
      <Stack>
        <Section icon={MapPin} label="Site population" aside={site.code}>
          <Snapshot
            cols={2}
            items={[
              { label: 'Total animals', value: fmt(total) },
              { label: 'Species', value: String(species.length) },
              { label: 'Regulatory', value: fmt(split.regulated.animals), note: `${split.regulated.percent.toFixed(1)}%` },
              { label: 'Non-regulatory', value: fmt(split.open.animals), note: `${split.open.percent.toFixed(1)}%` },
            ]}
          />
          <Rule label="Standing" />
          <Composition
            items={[
              { label: 'Non-regulatory', value: split.open.animals },
              { label: 'Regulatory', value: split.regulated.animals },
            ]}
            unit="animals"
          />
        </Section>
        <Section icon={Sparkles} label="Recent population change" aside={win.window}>
          <Facts
            items={[
              { label: 'Births', value: signed(move.births.total), tone: 'good' },
              { label: 'External transfer in', value: signed(move.transfers.in), tone: 'good' },
              { label: 'Deaths', value: signed(-move.deaths), tone: 'bad' },
              { label: 'External transfer out', value: signed(-move.transfers.out), tone: 'bad' },
              { label: 'Escaped · not recovered', value: signed(-move.escapes.unrecovered), tone: 'bad' },
              { label: 'Net recorded movement', value: signed(move.recorded), tone: netTone(move.recorded) },
            ]}
          />
        </Section>
        <Section icon={Layers} label="Class composition" aside={plural(classBands(rows).length, 'class')}>
          <Bars
            items={classBands(rows).map((c) => ({ label: c.cls, value: c.animals, sub: `${c.species} sp` }))}
            unit="animals"
            showShare
          />
        </Section>
        <Section icon={Dna} label="Species distribution" aside={`${species.length}`}>
          <TapList>
            {species.map((s) => (
              <TapRow
                key={s.id}
                label={s.name}
                sub={`${s.cls} · ${standingLabel(s.standing)}`}
                value={fmt(s.animals)}
                onOpen={() => open({ title: s.name, eyebrow: site.name, body: <SpeciesPanel row={s} win={win} /> })}
              />
            ))}
          </TapList>
        </Section>

        <Animals
          fetch={(offset, limit) => animalsInScope(siteKey, win, offset, limit)}
          deps={[siteKey, win.to]}
          eyebrow={site.name}
        />
      </Stack>
    </>
  )
}

/* ── one species ─────────────────────────────────────────────────────────── */

export function SpeciesPanel({ row, win }: { row: SpeciesRow; win: Win }) {
  const badge = RED_LIST.find((c) => c.code === row.standing.iucn)
  const populations = speciesByName(row.name)

  return (
    <>
      <SheetHero
        value={fmt(row.animals)}
        label={row.name}
        status={`${signed(row.net)} · ${win.window}`}
        tone={netTone(row.net)}
        note={`${row.cls} · ${row.siteName} · ${row.percent.toFixed(2)}% of population`}
      />
      <Stack>
        <Section icon={Venus} label="Sex distribution" aside={fmt(row.animals)}>
          <Snapshot
            cols={3}
            items={[
              { label: 'Male', value: fmt(row.male) },
              { label: 'Female', value: fmt(row.female) },
              { label: 'Unknown', value: fmt(row.unknown) },
            ]}
          />
          {row.unknown < row.animals && (
            <>
              <Rule label="Share" />
              <Composition
                items={[
                  { label: 'Unknown', value: row.unknown },
                  { label: 'Male', value: row.male },
                  { label: 'Female', value: row.female },
                ]}
                unit="animals"
              />
            </>
          )}
        </Section>
        <Section icon={ScrollText} label="Regulatory status" aside={standingLabel(row.standing)}>
          <Facts
            items={[
              { label: 'CITES', value: row.standing.cites ? `Appendix ${row.standing.cites}` : 'Not listed' },
              { label: 'Wildlife Protection Act', value: row.standing.schedule ? `Schedule ${row.standing.schedule}` : 'Not scheduled' },
              { label: 'Regulatory', value: isRegulated(row.standing) ? 'Yes' : 'No' },
            ]}
          />
          {badge && (
            <>
              <Rule label="IUCN Red List" />
              <div className="flex items-center gap-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full rounded-tr-[6px] font-display text-small font-bold"
                  style={{
                    backgroundColor: badge.fill,
                    color: badge.ink,
                    boxShadow: 'outline' in badge && badge.outline ? `inset 0 0 0 1.5px ${badge.outline}` : undefined,
                  }}
                  aria-hidden
                >
                  {badge.code}
                </span>
                <span className="text-small text-[#1c1a16]">{badge.name}</span>
              </div>
            </>
          )}
        </Section>
        <Section icon={MapPin} label="Site distribution" aside={`${populations.length} holding`}>
          <Facts
            items={populations.map((p) => ({
              label: siteOf(p.siteKey)?.name ?? p.siteKey,
              sub: siteOf(p.siteKey)?.code,
              value: p.siteKey === row.siteKey ? fmt(row.animals) : '—',
            }))}
          />
        </Section>

        <Animals
          fetch={(offset, limit) => animalsOfSpecies(row.id, win, offset, limit)}
          deps={[row.id, win.to]}
          eyebrow={row.name}
        />
      </Stack>
    </>
  )
}

/* ── a set of species — CITES, schedule, Red List, class, regulatory ─────── */

/**
 * One shape for every "which species are these" question.
 *
 * `onSite` is what makes CITES → Site → Species → Animal work: tapping a site re-opens this
 * same panel narrowed to it, which is a content swap rather than a new kind of screen.
 */
export function GroupPanel({
  title,
  eyebrow,
  rows,
  win,
  siteKey,
  badge,
  note,
  reopen,
}: {
  title: string
  eyebrow: string
  rows: Holding[]
  win: Win
  /** The site this panel is already narrowed to, if any. */
  siteKey?: string
  badge?: (typeof RED_LIST)[number]
  note?: string
  /** Re-open this same group under a site. Absent once already inside one. */
  reopen?: (siteKey: string) => void
}) {
  const { open } = useSheet()
  const total = totalOf(rows)
  const classes = classBands(rows)

  const bySite = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.species.siteKey, (map.get(r.species.siteKey) ?? 0) + r.count)
    return SITES.filter((s) => map.has(s.key)).map((s) => ({ site: s, value: map.get(s.key) ?? 0 }))
      .sort((a, b) => b.value - a.value)
  }, [rows])

  /* Species rows carry the sexes and the delta, so the group's list is the same row the main
     page's species list uses rather than a thinner copy of it. */
  const detailed = useMemo(() => {
    const index = new Map(speciesRows(siteKey ?? null, win).map((s) => [s.id, s]))
    return rows.flatMap((r) => {
      const hit = index.get(r.species.id)
      return hit ? [hit] : []
    })
  }, [rows, siteKey, win])

  return (
    <>
      <SheetHero
        value={fmt(total)}
        label={title}
        badge={badge}
        note={note ?? `${rows.length} species · ${plural(classes.length, 'class')}`}
      />
      <Stack>
        {total === 0 ? (
          <Section icon={ShieldAlert} label={title}>
            <p className="text-small text-[#6d6860]">The collection holds no animals in this category.</p>
          </Section>
        ) : (
          <>
            <Section icon={MapPin} label="By site" aside={`${bySite.length}`}>
              <TapList>
                {bySite.map((b) => (
                  <TapRow
                    key={b.site.key}
                    label={b.site.name}
                    sub={`${b.site.code} · ${((b.value / total) * 100).toFixed(1)}% of this group`}
                    value={fmt(b.value)}
                    active={siteKey === b.site.key}
                    onOpen={reopen ? () => reopen(b.site.key) : undefined}
                  />
                ))}
              </TapList>
            </Section>
            <Section icon={Layers} label="By class" aside={`${classes.length}`}>
              <Bars
                items={classes.map((c) => ({ label: c.cls, value: c.animals, sub: `${c.species} sp` }))}
                unit="animals"
                showShare
              />
            </Section>
            <Section icon={Dna} label="Species" aside={`${detailed.length}`}>
              <TapList>
                {detailed.map((s) => (
                  <TapRow
                    key={s.id}
                    label={s.name}
                    sub={`${s.cls} · ${s.siteName}`}
                    value={fmt(s.animals)}
                    onOpen={() => open({ title: s.name, eyebrow: title, body: <SpeciesPanel row={s} win={win} /> })}
                  />
                ))}
              </TapList>
            </Section>
          </>
        )}
      </Stack>
      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-caption text-[#9b958b]">{eyebrow}</p>
    </>
  )
}

/**
 * The five group sheets.
 *
 * Each is the same `GroupPanel` with a different filter and its own re-entry: tapping a site
 * inside one re-opens it narrowed to that site, which is how the brief's CITES → Site →
 * Species → Animal path is walked without a second screen existing.
 */
export function CitesGroup({
  appendix,
  rows,
  win,
  siteKey,
}: {
  appendix: CitesAppendix
  rows: Holding[]
  win: Win
  siteKey?: string
}) {
  const { open } = useSheet()
  const matched = citesSpecies(rows, appendix)
  return (
    <GroupPanel
      title={`CITES Appendix ${appendix}`}
      eyebrow="Convention on International Trade in Endangered Species"
      rows={matched}
      win={win}
      siteKey={siteKey}
      reopen={
        siteKey
          ? undefined
          : (key) =>
              open({
                title: `${siteOf(key)?.name ?? key}`,
                eyebrow: `CITES Appendix ${appendix}`,
                body: <CitesGroup appendix={appendix} rows={holdings(key, win)} win={win} siteKey={key} />,
              })
      }
    />
  )
}

export function ScheduleGroup({
  schedule,
  rows,
  win,
  siteKey,
}: {
  schedule: ScheduleClass
  rows: Holding[]
  win: Win
  siteKey?: string
}) {
  const { open } = useSheet()
  const matched = scheduleSpecies(rows, schedule)
  return (
    <GroupPanel
      title={`Schedule ${schedule}`}
      eyebrow="Wildlife Protection Act 1972"
      rows={matched}
      win={win}
      siteKey={siteKey}
      reopen={
        siteKey
          ? undefined
          : (key) =>
              open({
                title: `${siteOf(key)?.name ?? key}`,
                eyebrow: `Schedule ${schedule}`,
                body: <ScheduleGroup schedule={schedule} rows={holdings(key, win)} win={win} siteKey={key} />,
              })
      }
    />
  )
}

export function IucnGroup({
  code,
  rows,
  win,
  siteKey,
}: {
  code: RedListCode
  rows: Holding[]
  win: Win
  siteKey?: string
}) {
  const { open } = useSheet()
  const cat = RED_LIST.find((c) => c.code === code)
  const matched = iucnSpecies(rows, code)
  return (
    <GroupPanel
      title={cat?.name ?? code}
      eyebrow="IUCN Red List"
      rows={matched}
      win={win}
      siteKey={siteKey}
      badge={cat}
      reopen={
        siteKey
          ? undefined
          : (key) =>
              open({
                title: `${siteOf(key)?.name ?? key}`,
                eyebrow: cat?.name ?? code,
                body: <IucnGroup code={code} rows={holdings(key, win)} win={win} siteKey={key} />,
              })
      }
    />
  )
}

export function RegulatoryGroup({
  regulated,
  rows,
  win,
  siteKey,
}: {
  regulated: boolean
  rows: Holding[]
  win: Win
  siteKey?: string
}) {
  const { open } = useSheet()
  const matched = rows.filter((r) => isRegulated(r.standing) === regulated)
  const title = regulated ? 'Regulatory' : 'Non-regulatory'
  return (
    <GroupPanel
      title={title}
      eyebrow={regulated ? 'Under a CITES listing or a schedule' : 'Neither listed nor scheduled'}
      rows={matched}
      win={win}
      siteKey={siteKey}
      reopen={
        siteKey
          ? undefined
          : (key) =>
              open({
                title: `${siteOf(key)?.name ?? key}`,
                eyebrow: title,
                body: <RegulatoryGroup regulated={regulated} rows={holdings(key, win)} win={win} siteKey={key} />,
              })
      }
    />
  )
}

export function ClassGroup({ cls, rows, win, siteKey }: { cls: string; rows: Holding[]; win: Win; siteKey?: string }) {
  const { open } = useSheet()
  const matched = rows.filter((r) => r.species.cls === cls)
  return (
    <GroupPanel
      title={cls}
      eyebrow="Taxonomic class"
      rows={matched}
      win={win}
      siteKey={siteKey}
      reopen={
        siteKey
          ? undefined
          : (key) =>
              open({
                title: `${siteOf(key)?.name ?? key}`,
                eyebrow: cls,
                body: <ClassGroup cls={cls} rows={holdings(key, win)} win={win} siteKey={key} />,
              })
      }
    />
  )
}

/* ── a set of events — births, deaths, transfers, escapes, fetal loss ───── */

export interface FlowSpec {
  slug: string
  title: string
  icon: LucideIcon
  /** Word after the number. */
  unit: string
  /** The two-to-four executive figures this flow is read for. */
  facts: { label: string; value: string; note?: string; tone?: 'good' | 'warn' | 'bad' }[]
  /** Only these recorded causes count toward the panel. Absent means all of them. */
  only?: string[]
  status?: string
  statusTone?: 'good' | 'warn' | 'bad' | 'neutral'
}

/**
 * The event sheet: how many, why, where, which species, and then the records.
 *
 * `only` narrows the panel to a subset of the flow's own causes, which is what lets External
 * Transfer In and External Transfer Out be two sheets over one metric without either of them
 * counting an internal move.
 */
export function FlowPanel({ spec, siteKey, win }: { spec: FlowSpec; siteKey: string | null; win: Win }) {
  const { open } = useSheet()
  const keep = spec.only ? new Set(spec.only) : undefined

  const causes = useMemo(
    () => flowByCause(spec.slug, siteKey, win).filter((c) => !keep || keep.has(c.label)),
    [spec.slug, spec.only, siteKey, win],
  )
  const total = keep ? causes.reduce((n, c) => n + c.value, 0) : flowCount(spec.slug, siteKey, win)
  const sites = useMemo(() => flowBySite(spec.slug, siteKey, win), [spec.slug, siteKey, win])
  const species = useMemo(() => flowBySpecies(spec.slug, siteKey, win), [spec.slug, siteKey, win])

  /* Records are the events themselves. Where the panel is narrowed to a subset of causes the
     rows are filtered to match, so the list and the figure above it stay the same set. */
  const paged = usePaged<Ev>(
    (offset, limit) => {
      if (!keep) {
        const p = eventPage(spec.slug, siteKey, win, offset, limit)
        return { rows: p.rows, total: p.total }
      }
      /* A filtered flow pages over a wider slice and keeps what matches — the counts here are
         tens, not thousands, so this is a short walk rather than a scan. */
      const wide = eventPage(spec.slug, siteKey, win, 0, Math.max(200, offset + limit * 6))
      const rows = wide.rows.filter((ev) => keep.has(ev.detail))
      return { rows: rows.slice(0, offset + limit), total }
    },
    20,
    [spec.slug, spec.only, siteKey, win.to, win.from],
  )

  const where = siteKey ? (siteOf(siteKey)?.name ?? 'Site') : 'Zoo-wide'

  return (
    <>
      <SheetHero
        value={fmt(total)}
        label={`${spec.unit} · ${where}`}
        status={spec.status}
        tone={spec.statusTone}
        note={win.window}
      />
      <Stack>
        <Section icon={spec.icon} label={spec.title} aside={win.window}>
          <Snapshot cols={spec.facts.length >= 4 ? 2 : 3} items={spec.facts} />
        </Section>

        {causes.length > 0 && (
          <Section icon={ListOrdered} label="Recorded as" aside={`${causes.length}`}>
            <Bars items={causes.map((c) => ({ label: c.label, value: c.value }))} unit={spec.unit} showShare />
          </Section>
        )}

        {!siteKey && sites.length > 0 && (
          <Section icon={MapPin} label="By site" aside={`${sites.length}`}>
            <TapList>
              {sites.map((s) => (
                <TapRow
                  key={s.key}
                  label={s.label}
                  sub={siteOf(s.key)?.code}
                  value={fmt(s.value)}
                  onOpen={() =>
                    open({ title: s.label, eyebrow: spec.title, body: <FlowPanel spec={spec} siteKey={s.key} win={win} /> })
                  }
                />
              ))}
            </TapList>
          </Section>
        )}

        {species.length > 0 && (
          <Section icon={Dna} label="By species" aside={`${species.length}`}>
            <Bars
              items={species.slice(0, 12).map((s) => ({ label: s.label, value: s.value }))}
              unit={spec.unit}
              showShare
            />
          </Section>
        )}

        <Section icon={PawPrint} label="Records" aside={paged.total ? fmt(paged.total) : undefined}>
          <TapList>
            {paged.rows.map((ev) => (
              <TapRow
                key={ev.id}
                label={ev.speciesName}
                sub={`${shortDate(ev.day)} · ${siteOf(ev.siteKey)?.name ?? ev.siteKey} · ${ev.animalId}`}
                value={ev.detail}
                tone={ev.tone}
                onOpen={() =>
                  open({
                    title: ev.animalId,
                    eyebrow: `${spec.title} · ${shortDate(ev.day)}`,
                    body: <AnimalPanel record={animalFromId(ev.animalId, ev.speciesName)} />,
                  })
                }
              />
            ))}
          </TapList>
          {paged.total === 0 && (
            <p className="text-small text-[#6d6860]">Nothing recorded in {win.window}.</p>
          )}
          <MoreRows page={paged} noun={spec.unit} />
        </Section>
      </Stack>
    </>
  )
}

/* ── the five flow specs the page opens ──────────────────────────────────── */

/**
 * Assembled from the movement figures the page already computed, so a sheet can never state a
 * different number from the row that opened it.
 */
export function flowSpecs(m: ReturnType<typeof movement>): Record<string, FlowSpec> {
  return {
    births: {
      slug: 'births',
      title: 'Births',
      icon: Sparkles,
      unit: 'births',
      facts: [
        { label: 'Total births', value: fmt(m.births.total) },
        { label: 'Natural', value: fmt(m.births.natural) },
        { label: 'Assisted', value: fmt(m.births.assisted), tone: 'warn' },
      ],
    },
    mortality: {
      slug: 'mortality',
      title: 'Mortality',
      icon: Activity,
      unit: 'deaths',
      facts: [
        { label: 'Total deaths', value: fmt(m.deaths) },
        { label: 'Fetal loss', value: fmt(m.fetal.total), note: 'counted separately' },
      ],
      statusTone: 'bad',
    },
    transferIn: {
      slug: 'transfers',
      title: 'External transfer in',
      icon: ArrowLeftRight,
      unit: 'transfers',
      only: ['Inward · other zoo'],
      facts: [
        { label: 'Transfer in', value: fmt(m.transfers.in), tone: 'good' },
        { label: 'Transfer out', value: fmt(m.transfers.out) },
        { label: 'Net external', value: `${m.transfers.net >= 0 ? '+' : '−'}${Math.abs(m.transfers.net)}` },
      ],
    },
    transferOut: {
      slug: 'transfers',
      title: 'External transfer out',
      icon: ArrowLeftRight,
      unit: 'transfers',
      only: ['Outward · other zoo', 'Release to wild', 'Breeding loan'],
      facts: [
        { label: 'Transfer out', value: fmt(m.transfers.out) },
        { label: 'Transfer in', value: fmt(m.transfers.in), tone: 'good' },
        { label: 'Internal moves', value: fmt(m.transfers.internal), note: 'no net change' },
      ],
    },
    escaped: {
      slug: 'escaped',
      title: 'Escaped animals',
      icon: Footprints,
      unit: 'escapes',
      facts: [
        { label: 'Currently escaped', value: fmt(m.escapes.atLarge), tone: m.escapes.atLarge > 0 ? 'bad' : undefined },
        { label: 'In window', value: fmt(m.escapes.total) },
        { label: 'Recovered', value: fmt(m.escapes.recovered), tone: 'good' },
        { label: 'Unrecovered', value: fmt(m.escapes.unrecovered), tone: m.escapes.unrecovered > 0 ? 'bad' : undefined },
      ],
      status: m.escapes.atLarge > 0 ? `${m.escapes.atLarge} still at large` : undefined,
      statusTone: 'bad',
    },
    fetal: {
      slug: 'fetal',
      title: 'Fetal death',
      icon: Baby,
      unit: 'losses',
      facts: [
        { label: 'Total fetal death', value: fmt(m.fetal.total) },
        { label: 'Stillbirth', value: fmt(m.fetal.stillbirth), note: 'late term · dystocia' },
        { label: 'Abortion', value: fmt(m.fetal.abortion), note: 'mid term · resorption' },
      ],
    },
  }
}
