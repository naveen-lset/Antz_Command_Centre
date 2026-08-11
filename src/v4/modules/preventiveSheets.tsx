/**
 * PREVENTIVE MEDICATION — the sheets.
 *
 * The page is the analytical view; everything you tap on it opens here. Nothing in this
 * file is a route, because none of it is a place: a vaccine, a site's worming, an animal 34
 * days past its booster — these are looks at the page you are already on, and closing one
 * should put you back exactly where you were rather than navigating you home.
 *
 * TWO DRILL PATHS, ONE SET OF SHEETS. The brief asks for both
 *
 *   Overall → Site → Species → Animal
 *   Vaccination → Vaccine → Site → Species → Animal
 *
 * and they are the same tree entered at different heights, so `SiteSheet`, `SpeciesSheet`
 * and the two animal sheets are shared and the paths differ only in what opens first. A
 * second set of components for the second path is how the two would eventually disagree.
 *
 * EVERY SHEET STATES ITS OWN SCOPE. A sheet opened under a site filter shows that site's
 * figures and says so in the eyebrow, because a drill that quietly widens back to zoo-wide
 * is worse than no drill.
 */

import { useMemo } from 'react'
import {
  Activity,
  CalendarClock,
  ClipboardList,
  Dna,
  MapPin,
  PawPrint,
  Syringe,
  TriangleAlert,
} from 'lucide-react'
import { longDate, shortDate } from '../../core/calendar'
import { eventsForAnimal, pageWhere, type Ev } from '../../core/events'
import { bySite, bySpecies, byDimension, figure } from '../../core/query'
import { siteKeyOf } from '../../core/scope'
import { siteOf } from '../../core/world'
import { animalById } from '../../core/animals'
import {
  ACCENT_INK,
  AccentProvider,
  FAINT,
  Facts,
  Figure,
  HERO_INK,
  Rule,
  Section,
  Snapshot,
  Stack,
  TONE,
  fmt,
} from '../../exec/system'
import { MoreRows, usePaged } from '../perf'
import { useScope } from '../scope'
import { useSheet } from '../sheet'
import { DrillList, DrillRow } from './kit'
import {
  BUCKETS,
  STREAMS,
  STREAM_LIST,
  activityOf,
  buckets,
  coverageOf,
  dueLabel,
  lastLabel,
  roster,
  scopeLine,
  type OverdueRow,
  type Stream,
} from './preventiveData'

/* ── shared chrome ───────────────────────────────────────────────────────── */

/** The card every sheet opens on: one figure, what it is, and the scope it was cut under. */
function SheetHero({
  value,
  unit,
  label,
  note,
  tone,
}: {
  value: string
  unit?: string
  label: string
  note?: string
  tone?: 'good' | 'warn' | 'bad'
}) {
  return (
    <div className="w-full px-[var(--gutter-lg)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={value} unit={unit} size={48} color={tone ? TONE[tone] : HERO_INK} />
        <p className="mt-1 text-body text-[#3d3a34]">{label}</p>
        {note && (
          <p className="mt-2.5 text-caption" style={{ color: FAINT }}>
            {note}
          </p>
        )}
      </section>
    </div>
  )
}

/** A page of administered records, with the real total stated above the rows. */
function RecordRows({
  stream,
  match,
  onOpen,
  noun,
}: {
  stream: Stream
  /** Narrows the flow to one species, one site or one agent. Absent means the whole scope. */
  match?: (ev: Ev) => boolean
  onOpen: (ev: Ev) => void
  noun: string
}) {
  const { scope } = useScope()
  const site = siteKeyOf(scope)

  const page = usePaged<Ev>(
    (offset, limit) => {
      const r = pageWhere(stream.activity, site, scope.win, match ?? (() => true), offset, limit)
      return { rows: r.rows, total: r.total }
    },
    12,
    [stream.key, site, scope.win.key, scope.win.from, scope.win.to],
  )

  if (page.total === 0) {
    return (
      <p className="text-caption" style={{ color: FAINT }}>
        No {noun} recorded in {scope.win.window}.
      </p>
    )
  }

  return (
    <>
      <DrillList>
        {page.rows.map((ev) => (
          <DrillRow
            key={ev.id}
            label={`${ev.detail} · ${ev.speciesName}`}
            sub={`${ev.animalId} · ${siteOf(ev.siteKey)?.name ?? ev.siteKey}`}
            value={shortDate(ev.day)}
            onOpen={() => onOpen(ev)}
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun={noun} />
    </>
  )
}

/** Overdue rows, paged. The list a director asks for by name. */
function OverdueRows({ rows, onOpen }: { rows: OverdueRow[]; onOpen: (row: OverdueRow) => void }) {
  const page = usePaged<OverdueRow>(
    (offset, limit) => ({ rows: rows.slice(offset, offset + limit), total: rows.length }),
    12,
    [rows.length, rows[0]?.animalId],
  )

  if (rows.length === 0) {
    return (
      <p className="text-caption" style={{ color: FAINT }}>
        Nothing outstanding.
      </p>
    )
  }

  return (
    <>
      <DrillList>
        {page.rows.map((r) => (
          <DrillRow
            key={r.animalId}
            label={`${r.speciesName} · ${r.agent}`}
            sub={`${r.animalId} · ${r.siteName}`}
            value={r.daysOverdue === 0 ? 'Today' : `${r.daysOverdue} d`}
            tone={r.daysOverdue > 15 ? 'bad' : r.daysOverdue > 0 ? 'warn' : 'neutral'}
            onOpen={() => onOpen(r)}
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun="animals" />
    </>
  )
}

/* ── the animal, at the bottom of every path ─────────────────────────────── */

/**
 * ONE ANIMAL SHEET, AT THE BOTTOM OF EVERY PATH.
 *
 * The overdue path arrives with a due row, the activity path arrives with a record, and
 * search arrives with only an id — but all three are asking the same thing, which is "what
 * is this animal's preventive standing". Three components would eventually give three
 * answers, so there is one, and what the caller knows becomes the lead rather than a
 * different sheet.
 *
 * Every field the brief lists is here and no field it does not: id, species, site, the
 * agent, the dates, the status, and days overdue where there are any. Where an animal has
 * no previous record the sheet says so rather than printing a plausible date.
 */
export function AnimalPreventiveSheet({
  animalId,
  due,
  given,
}: {
  animalId: string
  /** Arrived from an overdue row — the sheet leads with how late it is. */
  due?: { row: OverdueRow; stream: Stream }
  /** Arrived from a record — the sheet leads with what was administered. */
  given?: { ev: Ev; stream: Stream }
}) {
  const { scope } = useScope()
  const animal = animalById(animalId)
  const late = due?.row.daysOverdue ?? 0

  /* This animal's standing in each programme that HAS a due status, looked up in the same
     roster the counts above it come from — so a sheet cannot call an animal overdue that
     the site's overdue figure does not include. */
  const standing = useMemo(
    () =>
      [STREAMS.vaccination, STREAMS.deworming].map((s) => ({
        stream: s,
        row: animal ? roster(animal.siteKey, s).find((r) => r.animalId === animalId) : undefined,
      })),
    [animal, animalId],
  )

  const history = useMemo(
    () => (animal ? eventsForAnimal(animal, scope.win, STREAM_LIST.map((s) => s.activity)).slice(0, 12) : []),
    [animal, scope.win],
  )

  return (
    <>
      {due ? (
        <SheetHero
          value={late === 0 ? 'Due' : String(late)}
          unit={late === 0 ? undefined : 'd'}
          label={late === 0 ? `${due.stream.agent} due today · ${due.row.agent}` : `Days overdue · ${due.row.agent}`}
          note={`${due.row.speciesName} · ${due.row.siteName}`}
          tone={late > 15 ? 'bad' : late > 0 ? 'warn' : undefined}
        />
      ) : given ? (
        <SheetHero
          value={shortDate(given.ev.day)}
          label={`${given.ev.detail} · ${given.ev.speciesName}`}
          note={`${given.ev.animalId} · ${siteOf(given.ev.siteKey)?.name ?? given.ev.siteKey}`}
        />
      ) : (
        <SheetHero
          value={animal?.callName ?? animalId.slice(-5)}
          label={animal?.speciesName ?? 'Animal'}
          note={animal ? `${animal.siteName} · ${animal.enclosureId}` : undefined}
        />
      )}

      <Stack>
        <Section icon={PawPrint} label="Animal">
          <Facts
            items={[
              { label: 'Animal ID', value: animalId },
              ...(animal?.callName ? [{ label: 'Call name', value: animal.callName }] : []),
              { label: 'Species', sub: animal?.cls, value: animal?.speciesName ?? due?.row.speciesName ?? '—' },
              { label: 'Site', value: animal?.siteName ?? due?.row.siteName ?? '—' },
              ...(animal ? [{ label: 'Enclosure', value: animal.enclosureId }] : []),
              ...(animal ? [{ label: 'Age', value: animal.age }] : []),
              ...(animal
                ? [
                    {
                      label: 'Status',
                      value: animal.status,
                      tone: (animal.status === 'Critical' ? 'bad' : animal.status === 'Healthy' ? 'good' : 'warn') as
                        | 'bad'
                        | 'good'
                        | 'warn',
                    },
                  ]
                : []),
            ]}
          />
        </Section>

        {due && (
          <Section icon={CalendarClock} label={due.stream.label} aside={due.row.agent}>
            <Facts
              items={[
                { label: due.stream.agent, value: due.row.agent },
                { label: 'Due date', value: longDate(due.row.dueOn) },
                {
                  label: 'Days overdue',
                  value: late === 0 ? 'Due today' : `${late} d`,
                  tone: late > 15 ? 'bad' : late > 0 ? 'warn' : 'neutral',
                },
                { label: `Last ${due.stream.label.toLowerCase()}`, value: lastLabel(due.row) },
                {
                  label: 'Status',
                  value: late === 0 ? 'Due' : late > 15 ? 'Overdue · over 15 days' : 'Overdue',
                  tone: late > 15 ? 'bad' : late > 0 ? 'warn' : 'neutral',
                },
              ]}
            />
          </Section>
        )}

        {given && (
          <Section icon={Syringe} label={given.stream.label} aside={given.ev.detail}>
            <Facts
              items={[
                { label: given.stream.agent, value: given.ev.detail },
                { label: 'Administered', value: longDate(given.ev.day) },
                { label: 'Record', value: given.ev.id },
                { label: 'Status', value: 'Completed', tone: 'good' },
              ]}
            />
          </Section>
        )}

        {/* The standing in the two scheduled programmes, whichever way the reader arrived —
            an animal overdue for its booster is worth knowing about while you are reading its
            worming record. */}
        <Section icon={TriangleAlert} label="Preventive standing" aside="today">
          <Facts
            items={standing.map(({ stream, row }) => ({
              label: stream.label,
              sub: row ? `${row.agent} · due ${shortDate(row.dueOn)}` : undefined,
              value: !row ? 'Up to date' : row.daysOverdue === 0 ? 'Due today' : `${row.daysOverdue} d overdue`,
              tone: (!row ? 'good' : row.daysOverdue > 15 ? 'bad' : row.daysOverdue > 0 ? 'warn' : 'neutral') as
                | 'good'
                | 'bad'
                | 'warn'
                | 'neutral',
            }))}
          />
        </Section>
        <Section icon={ClipboardList} label="Preventive history" aside={scope.win.window}>
          {history.length === 0 ? (
            <p className="text-caption" style={{ color: FAINT }}>
              No preventive record for this animal in {scope.win.window}.
            </p>
          ) : (
            <Facts
              items={history.map((ev) => ({
                label: ev.detail,
                sub: STREAM_LIST.find((s) => s.activity === ev.kind)?.label,
                value: shortDate(ev.day),
              }))}
            />
          )}
        </Section>
      </Stack>
      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-caption" style={{ color: FAINT }}>
        Deepest level
      </p>
    </>
  )
}

/* The two names the drills call, so a call site says which path it is on while there stays
   exactly one implementation of the animal record. */
export const AnimalOverdueSheet = ({ row, stream }: { row: OverdueRow; stream: Stream }) => (
  <AnimalPreventiveSheet animalId={row.animalId} due={{ row, stream }} />
)

export const AnimalGivenSheet = ({ ev, stream }: { ev: Ev; stream: Stream }) => (
  <AnimalPreventiveSheet animalId={ev.animalId} given={{ ev, stream }} />
)

/* ── species ─────────────────────────────────────────────────────────────── */

/**
 * One species within one programme — activity, what is outstanding, and the animals.
 *
 * Reached from the species list on the page, from a site sheet, and from a vaccine sheet.
 * One component for all three, so the figure is the same whichever way it was arrived at.
 */
export function SpeciesSheet({
  stream,
  speciesName,
  speciesId,
  siteKey,
}: {
  stream: Stream
  speciesName: string
  speciesId?: string
  siteKey?: string
}) {
  const { scope } = useScope()
  const { open } = useSheet()
  const scoped = siteKey ?? siteKeyOf(scope) ?? null

  const given = useMemo(
    () => bySpecies({ ...scope, site: siteKey ? (siteOf(siteKey) ?? scope.site) : scope.site }, stream.activity)
      .find((r) => r.label === speciesName)?.value ?? 0,
    [scope, stream.activity, speciesName, siteKey],
  )

  const outstanding = useMemo(
    () => roster(scoped, stream).filter((r) => r.speciesName === speciesName),
    [scoped, stream, speciesName],
  )
  const over15 = outstanding.filter((r) => r.daysOverdue > 15).length

  return (
    <>
      <SheetHero
        value={fmt(given)}
        label={`${stream.noun} · ${speciesName}`}
        note={`${siteKey ? (siteOf(siteKey)?.name ?? siteKey) : scope.site?.name ?? 'Overall'} · ${scope.win.window}`}
      />
      <Stack>
        {stream.cover && (
          <Section icon={TriangleAlert} label="Due status" aside="today">
            <Snapshot
              cols={3}
              items={[
                { label: 'Outstanding', value: String(outstanding.length), tone: outstanding.length ? 'warn' : 'good' },
                {
                  label: 'Overdue',
                  value: String(outstanding.filter((r) => r.daysOverdue > 0).length),
                  tone: 'warn',
                },
                { label: 'Over 15 days', value: String(over15), tone: over15 ? 'bad' : 'neutral' },
              ]}
            />
          </Section>
        )}

        {outstanding.length > 0 && (
          <Section icon={PawPrint} label="Outstanding animals" aside={`${outstanding.length}`}>
            <OverdueRows
              rows={outstanding}
              onOpen={(r) =>
                open({
                  title: r.animalId,
                  eyebrow: `${speciesName} › Animal`,
                  body: <AnimalOverdueSheet row={r} stream={stream} />,
                })
              }
            />
          </Section>
        )}

        <Section icon={ClipboardList} label={`${stream.label} records`} aside={scope.win.window}>
          <RecordRows
            stream={stream}
            noun={stream.noun}
            match={(ev) => ev.speciesName === speciesName && (!siteKey || ev.siteKey === siteKey)}
            onOpen={(ev) =>
              open({
                title: ev.animalId,
                eyebrow: `${speciesName} › Record`,
                body: <AnimalGivenSheet ev={ev} stream={stream} />,
              })
            }
          />
        </Section>
      </Stack>
      {speciesId && (
        <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-caption" style={{ color: FAINT }}>
          {speciesId}
        </p>
      )}
    </>
  )
}

/* ── site, within one programme ──────────────────────────────────────────── */

export function StreamSiteSheet({ stream, siteKey }: { stream: Stream; siteKey: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteOf(siteKey)
  const cover = coverageOf(siteKey, stream)
  const rows = useMemo(() => roster(siteKey, stream), [siteKey, stream])
  const given = Math.round(figure({ ...scope, site: site ?? null }, stream.activity).value)

  const species = useMemo(
    () => bySpecies({ ...scope, site: site ?? null }, stream.activity).filter((r) => r.value > 0),
    [scope, site, stream.activity],
  )

  return (
    <>
      <SheetHero
        value={fmt(given)}
        label={`${stream.noun} · ${site?.name ?? siteKey}`}
        note={`${scope.win.window}${cover ? ` · ${Math.round(cover.percent)}% covered` : ''}`}
      />
      <Stack>
        {cover && (
          <Section icon={TriangleAlert} label="Due status" aside="today">
            <Snapshot
              cols={4}
              items={[
                { label: 'Covered', value: fmt(cover.covered), note: `of ${fmt(cover.herd)}` },
                { label: 'Outstanding', value: String(cover.outstanding), tone: 'warn' },
                {
                  label: 'Overdue',
                  value: String(rows.filter((r) => r.daysOverdue > 0).length),
                  tone: 'warn',
                },
                {
                  label: 'Over 15 d',
                  value: String(rows.filter((r) => r.daysOverdue > 15).length),
                  tone: 'bad',
                },
              ]}
            />
          </Section>
        )}

        <Section icon={Dna} label="Species" aside={`${species.length}`}>
          <DrillList>
            {species.slice(0, 12).map((s) => (
              <DrillRow
                key={s.id}
                label={s.label}
                sub={s.sub}
                value={fmt(s.value)}
                onOpen={() =>
                  open({
                    title: s.label,
                    eyebrow: `${site?.name ?? siteKey} › Species`,
                    body: <SpeciesSheet stream={stream} speciesName={s.label} speciesId={s.id} siteKey={siteKey} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>

        {rows.length > 0 && (
          <Section icon={PawPrint} label="Outstanding animals" aside={`${rows.length}`}>
            <OverdueRows
              rows={rows}
              onOpen={(r) =>
                open({
                  title: r.animalId,
                  eyebrow: `${site?.name ?? siteKey} › Animal`,
                  body: <AnimalOverdueSheet row={r} stream={stream} />,
                })
              }
            />
          </Section>
        )}

        <Section icon={ClipboardList} label={`${stream.label} records`} aside={scope.win.window}>
          <RecordRows
            stream={stream}
            noun={stream.noun}
            match={(ev) => ev.siteKey === siteKey}
            onOpen={(ev) =>
              open({
                title: ev.animalId,
                eyebrow: `${site?.name ?? siteKey} › Record`,
                body: <AnimalGivenSheet ev={ev} stream={stream} />,
              })
            }
          />
        </Section>
      </Stack>
    </>
  )
}

/* ── site, all three programmes ──────────────────────────────────────────── */

/**
 * A site's whole preventive picture — the consolidated site comparison's drill.
 *
 * Three programmes in one sheet rather than three sheets, because the question the
 * consolidated table poses is "how is this site doing overall", and answering it by making
 * the reader open three sheets and hold three numbers in their head is not answering it.
 */
export function SitePreventiveSheet({ siteKey }: { siteKey: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteOf(siteKey)

  return (
    <>
      <SheetHero
        value={String(
          [STREAMS.vaccination, STREAMS.deworming].reduce(
            (n, s) => n + roster(siteKey, s).filter((r) => r.daysOverdue > 0).length,
            0,
          ),
        )}
        label={`Overdue · ${site?.name ?? siteKey}`}
        note={`Due status today · activity ${scope.win.window}`}
        tone="warn"
      />
      <Stack>
        {STREAM_LIST.map((stream) => {
          const cover = coverageOf(siteKey, stream)
          const rows = roster(siteKey, stream)
          const given = Math.round(figure({ ...scope, site: site ?? null }, stream.activity).value)
          return (
            <AccentProvider key={stream.key} value={stream.accent}>
              <Section
                icon={stream.key === 'vaccination' ? Syringe : stream.key === 'deworming' ? Activity : ClipboardList}
                label={stream.label}
                aside={cover ? `${Math.round(cover.percent)}% covered` : scope.win.window}
              >
                <Snapshot
                  cols={cover ? 4 : 2}
                  items={[
                    { label: 'Given', value: fmt(given), note: scope.win.label.toLowerCase() },
                    ...(cover
                      ? [
                          { label: 'Covered', value: fmt(cover.covered), note: `of ${fmt(cover.herd)}` },
                          {
                            label: 'Overdue',
                            value: String(rows.filter((r) => r.daysOverdue > 0).length),
                            tone: 'warn' as const,
                          },
                          {
                            label: 'Over 15 d',
                            value: String(rows.filter((r) => r.daysOverdue > 15).length),
                            tone: 'bad' as const,
                          },
                        ]
                      : [{ label: 'Species', value: String(bySpecies({ ...scope, site: site ?? null }, stream.activity).filter((r) => r.value > 0).length) }]),
                  ]}
                />
                <Rule label="Drill" />
                <DrillList>
                  <DrillRow
                    label={`${stream.label} at ${site?.name ?? siteKey}`}
                    sub="Species, animals and records"
                    value={fmt(given)}
                    onOpen={() =>
                      open({
                        title: `${stream.label} · ${site?.name ?? siteKey}`,
                        eyebrow: `${site?.name ?? siteKey} › ${stream.label}`,
                        body: <StreamSiteSheet stream={stream} siteKey={siteKey} />,
                      })
                    }
                  />
                </DrillList>
              </Section>
            </AccentProvider>
          )
        })}
      </Stack>
    </>
  )
}

/* ── a vaccine, a drug, a supplement ─────────────────────────────────────── */

/** One agent — the second level of the `Vaccination → Vaccine → Site → Species → Animal` path. */
export function AgentSheet({ stream, agent }: { stream: Stream; agent: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)

  const total = useMemo(
    () => byDimension(scope, stream.activity, 'detail').find((r) => r.label === agent)?.value ?? 0,
    [scope, stream.activity, agent],
  )

  /* THE AGENT'S OWN SITE AND SPECIES SPLIT.
     A `tally` groups by one dimension; this needs the cross of two — this vaccine, by site —
     so it walks the window once and counts, with a predicate that always returns false so
     nothing is materialised. One pass over the window's events, no rows built. */
  const { sites, species } = useMemo(() => {
    const bySiteMap = new Map<string, number>()
    const bySpeciesMap = new Map<string, number>()
    pageWhere(stream.activity, site, scope.win, (ev) => {
      if (ev.detail !== agent) return false
      bySiteMap.set(ev.siteKey, (bySiteMap.get(ev.siteKey) ?? 0) + 1)
      bySpeciesMap.set(ev.speciesName, (bySpeciesMap.get(ev.speciesName) ?? 0) + 1)
      return false
    })
    return {
      sites: [...bySiteMap.entries()].sort((a, b) => b[1] - a[1]),
      species: [...bySpeciesMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
    }
  }, [stream.activity, site, scope.win, agent])


  return (
    <>
      <SheetHero value={fmt(total)} label={`${stream.noun} · ${agent}`} note={scopeLine(scope)} />
      <Stack>
        <Section icon={MapPin} label="Sites" aside={`${sites.length}`}>
          <DrillList>
            {sites.map(([key, n]) => (
              <DrillRow
                key={key}
                label={siteOf(key)?.name ?? key}
                value={fmt(n)}
                onOpen={() =>
                  open({
                    title: siteOf(key)?.name ?? key,
                    eyebrow: `${agent} › Site`,
                    body: <StreamSiteSheet stream={stream} siteKey={key} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Section icon={Dna} label="Species" aside={`${species.length}`}>
          <DrillList>
            {species.map(([name, n]) => (
              <DrillRow
                key={name}
                label={name}
                value={fmt(n)}
                onOpen={() =>
                  open({
                    title: name,
                    eyebrow: `${agent} › Species`,
                    body: <SpeciesSheet stream={stream} speciesName={name} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Section icon={ClipboardList} label="Records" aside={scope.win.window}>
          <RecordRows
            stream={stream}
            noun={stream.noun}
            match={(ev) => ev.detail === agent}
            onOpen={(ev) =>
              open({
                title: ev.animalId,
                eyebrow: `${agent} › Record`,
                body: <AnimalGivenSheet ev={ev} stream={stream} />,
              })
            }
          />
        </Section>
      </Stack>
    </>
  )
}

/* ── a period from the schedule grid ─────────────────────────────────────── */

/** What happened in one day, week or month of the trend — the grid cell's drill. */
export function PeriodSheet({
  stream,
  from,
  to,
  label,
}: {
  stream: Stream
  from: number
  to: number
  label: string
}) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)

  /* The cell's own window, not the page's — a day cell states that day's figure, and the
     site and species splits under it are that day's too. */
  const at = useMemo(
    () => ({ ...scope, win: { ...scope.win, from, to, days: to - from + 1, window: label } }),
    [scope, from, to, label],
  )
  const total = Math.round(figure(at, stream.activity).value)
  const sites = useMemo(() => bySite(at, stream.activity).filter((r) => r.value > 0), [at, stream.activity])
  const species = useMemo(() => bySpecies(at, stream.activity).filter((r) => r.value > 0).slice(0, 12), [at, stream.activity])
  const agents = useMemo(() => byDimension(at, stream.activity, 'detail'), [at, stream.activity])

  return (
    <>
      <SheetHero
        value={fmt(total)}
        label={`${stream.noun} · ${label}`}
        note={`${scope.site?.name ?? 'Overall'} · ${from === to ? longDate(from) : `${shortDate(from)} – ${shortDate(to)}`}`}
      />
      <Stack>
        <Section icon={MapPin} label="Sites" aside={`${sites.length}`}>
          <DrillList>
            {sites.map((r) => (
              <DrillRow
                key={r.id}
                label={r.label}
                value={fmt(r.value)}
                onOpen={() =>
                  open({
                    title: r.label,
                    eyebrow: `${label} › Site`,
                    body: <StreamSiteSheet stream={stream} siteKey={r.id} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Section icon={Syringe} label={stream.agent} aside={`${agents.length}`}>
          <DrillList>
            {agents.map((r) => (
              <DrillRow
                key={r.id}
                label={r.label}
                value={fmt(r.value)}
                onOpen={() =>
                  open({ title: r.label, eyebrow: `${label} › ${stream.agent}`, body: <AgentSheet stream={stream} agent={r.label} /> })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Section icon={Dna} label="Species" aside={`${species.length}`}>
          <DrillList>
            {species.map((r) => (
              <DrillRow
                key={r.id}
                label={r.label}
                sub={r.sub}
                value={fmt(r.value)}
                onOpen={() =>
                  open({
                    title: r.label,
                    eyebrow: `${label} › Species`,
                    body: <SpeciesSheet stream={stream} speciesName={r.label} speciesId={r.id} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Section icon={ClipboardList} label="Records" aside={label}>
          <PeriodRecords stream={stream} site={site} from={from} to={to} label={label} />
        </Section>
      </Stack>
    </>
  )
}

/** The period's own records — paged out of the period rather than the page's window. */
function PeriodRecords({
  stream,
  site,
  from,
  to,
  label,
}: {
  stream: Stream
  site: string | null
  from: number
  to: number
  label: string
}) {
  const { open } = useSheet()
  const win = { key: 'custom' as const, label, noun: label, from, to, days: to - from + 1, window: label }
  const page = usePaged<Ev>(
    (offset, limit) => {
      const r = pageWhere(stream.activity, site, win, () => true, offset, limit)
      return { rows: r.rows, total: r.total }
    },
    12,
    [stream.key, site, from, to],
  )

  if (page.total === 0) {
    return (
      <p className="text-caption" style={{ color: FAINT }}>
        Nothing recorded in {label}.
      </p>
    )
  }

  return (
    <>
      <DrillList>
        {page.rows.map((ev) => (
          <DrillRow
            key={ev.id}
            label={`${ev.detail} · ${ev.speciesName}`}
            sub={`${ev.animalId} · ${siteOf(ev.siteKey)?.name ?? ev.siteKey}`}
            value={shortDate(ev.day)}
            onOpen={() =>
              open({ title: ev.animalId, eyebrow: `${label} › Record`, body: <AnimalGivenSheet ev={ev} stream={stream} /> })
            }
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun={stream.noun} />
    </>
  )
}

/* ── overdue ─────────────────────────────────────────────────────────────── */

/**
 * The overdue record list, at whatever depth of lateness was tapped.
 *
 * `minDays` is what separates "overdue" from "more than fifteen days overdue" — one sheet,
 * two entry points, so the two lists cannot use different definitions of late.
 */
export function OverdueSheet({
  stream,
  minDays = 1,
  bucket,
  siteKey,
}: {
  stream: Stream
  minDays?: number
  /** A single bucket, when one rung of the ladder was tapped rather than the whole. */
  bucket?: string
  siteKey?: string
}) {
  const { scope } = useScope()
  const { open } = useSheet()
  const scoped = siteKey ?? siteKeyOf(scope) ?? null

  const rows = useMemo(() => {
    const all = roster(scoped, stream)
    if (bucket) return all.filter((r) => r.bucket === bucket)
    return all.filter((r) => r.daysOverdue >= minDays)
  }, [scoped, stream, bucket, minDays])

  const sites = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.siteKey, (m.get(r.siteKey) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const species = useMemo(() => {
    const m = new Map<string, { id: string; n: number }>()
    for (const r of rows) {
      const at = m.get(r.speciesName)
      if (at) at.n++
      else m.set(r.speciesName, { id: r.speciesId, n: 1 })
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12)
  }, [rows])


  return (
    <>
      <SheetHero
        value={fmt(rows.length)}
        label={bucket ? `${stream.label} · ${bucket}` : minDays > 15 ? `${stream.label} over 15 days overdue` : `${stream.label} overdue`}
        note={`Due status today · ${siteKey ? (siteOf(siteKey)?.name ?? siteKey) : scope.site?.name ?? 'Overall'}`}
        tone={minDays > 15 || bucket === 'Over 15 days' ? 'bad' : 'warn'}
      />
      <Stack>
        <Section icon={MapPin} label="Sites" aside={`${sites.length}`}>
          <DrillList>
            {sites.map(([key, n]) => (
              <DrillRow
                key={key}
                label={siteOf(key)?.name ?? key}
                value={fmt(n)}
                tone="warn"
                onOpen={() =>
                  open({
                    title: siteOf(key)?.name ?? key,
                    eyebrow: `${stream.label} overdue › Site`,
                    body: <OverdueSheet stream={stream} minDays={minDays} bucket={bucket} siteKey={key} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Section icon={Dna} label="Species" aside={`${species.length}`}>
          <DrillList>
            {species.map(([name, v]) => (
              <DrillRow
                key={name}
                label={name}
                value={fmt(v.n)}
                tone="warn"
                onOpen={() =>
                  open({
                    title: name,
                    eyebrow: `${stream.label} overdue › Species`,
                    body: <SpeciesSheet stream={stream} speciesName={name} speciesId={v.id} siteKey={siteKey} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Section icon={PawPrint} label="Animals" aside={`${rows.length}`}>
          <OverdueRows
            rows={rows}
            onOpen={(r) =>
              open({
                title: r.animalId,
                eyebrow: `${stream.label} overdue › Animal`,
                body: <AnimalOverdueSheet row={r} stream={stream} />,
              })
            }
          />
        </Section>
      </Stack>
    </>
  )
}

/* ── the programme sheet ─────────────────────────────────────────────────── */

/** Vaccination, Deworming or Supplements in full — what the overview cards open. */
export function StreamSheet({ stream }: { stream: Stream }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const site = siteKeyOf(scope)

  const given = activityOf(scope, stream)
  const cover = coverageOf(site, stream)
  const rows = useMemo(() => roster(site, stream), [site, stream])
  const bucketRows = useMemo(() => buckets(site, stream), [site, stream])
  const agents = useMemo(() => byDimension(scope, stream.activity, 'detail'), [scope, stream.activity])
  const sites = useMemo(() => bySite(scope, stream.activity).filter((r) => r.value > 0), [scope, stream.activity])

  return (
    <AccentProvider value={stream.accent}>
      <SheetHero
        value={fmt(given)}
        label={`${stream.noun} · ${scope.win.label.toLowerCase()}`}
        note={`${scopeLine(scope)}${cover ? ` · ${Math.round(cover.percent)}% covered` : ''}`}
      />
      <Stack>
        {cover && (
          <Section icon={TriangleAlert} label="Due status" aside="today, not the window">
            <Snapshot
              cols={4}
              items={[
                { label: 'Covered', value: fmt(cover.covered), note: `of ${fmt(cover.herd)}` },
                { label: 'Due today', value: String(bucketRows[0].value) },
                {
                  label: 'Overdue',
                  value: String(rows.filter((r) => r.daysOverdue > 0).length),
                  tone: 'warn',
                },
                {
                  label: 'Over 15 d',
                  value: String(rows.filter((r) => r.daysOverdue > 15).length),
                  tone: 'bad',
                },
              ]}
            />
            <Rule label="By lateness" />
            <DrillList>
              {bucketRows.map((b) => (
                <DrillRow
                  key={b.bucket}
                  label={b.bucket}
                  value={fmt(b.value)}
                  tone={b.bucket === BUCKETS[3] ? 'bad' : b.bucket === BUCKETS[0] ? 'neutral' : 'warn'}
                  onOpen={
                    b.value > 0
                      ? () =>
                          open({
                            title: b.bucket,
                            eyebrow: `${stream.label} › Overdue`,
                            body: <OverdueSheet stream={stream} bucket={b.bucket} />,
                          })
                      : undefined
                  }
                />
              ))}
            </DrillList>
          </Section>
        )}

        <Section icon={MapPin} label="Sites" aside={`${sites.length}`}>
          <DrillList>
            {sites.map((r) => (
              <DrillRow
                key={r.id}
                label={r.label}
                value={fmt(r.value)}
                onOpen={() =>
                  open({
                    title: r.label,
                    eyebrow: `${stream.label} › Site`,
                    body: <StreamSiteSheet stream={stream} siteKey={r.id} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Section icon={Syringe} label={stream.agent} aside={`${agents.length}`}>
          <DrillList>
            {agents.map((r) => (
              <DrillRow
                key={r.id}
                label={r.label}
                value={fmt(r.value)}
                onOpen={() =>
                  open({
                    title: r.label,
                    eyebrow: `${stream.label} › ${stream.agent}`,
                    body: <AgentSheet stream={stream} agent={r.label} />,
                  })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Section icon={ClipboardList} label="Records" aside={scope.win.window}>
          <RecordRows
            stream={stream}
            noun={stream.noun}
            onOpen={(ev) =>
              open({
                title: ev.animalId,
                eyebrow: `${stream.label} › Record`,
                body: <AnimalGivenSheet ev={ev} stream={stream} />,
              })
            }
          />
        </Section>
      </Stack>
      <p className="px-[var(--gutter-lg)] pt-1 pb-3 text-center text-caption" style={{ color: ACCENT_INK }}>
        {dueLabelHint(stream)}
      </p>
    </AccentProvider>
  )
}

const dueLabelHint = (stream: Stream): string =>
  stream.cover
    ? 'Activity is cut to the window · due status is read today'
    : 'Activity only — a supplement has no due status'

export { dueLabel }
