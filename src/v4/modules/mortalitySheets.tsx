/**
 * MORTALITY & NECROPSY — the sheets.
 *
 * The page is the analytical view; everything on it opens here. Nothing is a route, because
 * none of it is a place: a site's deaths, a cause, a bench's queue, the animal at the bottom —
 * these are looks at the page you are already on. The brief's §22 is explicit about it, and
 * `sheet.tsx` already does the hard part: one sheet, content swapping, any depth, with the
 * browser's back button wired to the same gesture.
 *
 * TWO PATHS, ONE TREE. The brief asks for
 *
 *     Overall → Site → Species → Animal
 *     Mortality → Cause → Necropsy Centre → Necropsy Record → Animal
 *
 * and those are not two hierarchies — they are two routes through one set of deaths. Site,
 * species, cause, regulatory band and centre are all FILTERS over the same `Death[]`, so there
 * is one `DeathListSheet` that takes a title and a set of deaths, and every section differs
 * only in which deaths it hands over and what the figure at the top means. Nine separate
 * components would eventually give nine different answers about the same animal.
 *
 * Which is also why every sheet below narrows rather than re-queries. Open Aquatic Halls, then
 * Common Carp inside it, and the second sheet is the first sheet's rows filtered — not a fresh
 * read that might disagree with the row that was tapped. The eyebrow carries the trail so four
 * levels down the reader can still see it is Aquatic Halls › Disease › Common Carp.
 *
 * NOTHING PRINTS A FIELD IT DOES NOT HAVE. A death that was never referred to a bench shows no
 * necropsy section — it says it was not referred, which is a real and different answer from
 * "pending". A necropsy still in progress prints no finding. A non-regulatory animal shows no
 * CITES row, because it has no CITES listing and a dash in that slot reads like missing data.
 */

import { useMemo } from 'react'
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Dna,
  FileSearch,
  MapPin,
  PawPrint,
  ScrollText,
  Skull,
  Stethoscope,
} from 'lucide-react'
import { longDate, shortDate } from '../../core/calendar'
import { animalById } from '../../core/animals'
import { speciesHref } from '../../core/query'
import { siteKeyOf } from '../../core/scope'
import {
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
  STATUS_TONE,
  byCause,
  byCondition,
  byDisposal,
  bySiteSlice,
  bySpeciesSlice,
  byStatus,
  necropsiesOf,
  regulatorySplit,
  scopeLine,
  standingLabel,
  type Death,
} from './mortalityData'

/* ── shared chrome ───────────────────────────────────────────────────────── */

/** `Figure` takes no neutral tone — a neutral reading is simply the default ink. */
const hero = (t: 'good' | 'warn' | 'bad' | 'neutral' | undefined): 'good' | 'warn' | 'bad' | undefined =>
  t === 'neutral' ? undefined : t

function SheetHero({
  value,
  unit,
  label,
  note,
  tone,
  action,
}: {
  value: string
  unit?: string
  label: string
  note?: string
  tone?: 'good' | 'warn' | 'bad'
  /**
   * THE WAY OUT OF A POPUP ABOUT ONE NAMED THING — the same affordance, in the same place and the
   * same words, that the population sheets already offer.
   *
   * This module had none, and the species popup was the cost: a reader who found the worst-hit
   * species in Species-wise mortality opened a panel about it and then had nowhere to go, while
   * the identical row in Birth Analytics linked straight to the species record. A popup about a
   * named species is a selection already made, and it owes the reader the record underneath it.
   */
  action?: { label: string; href: string }
}) {
  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={value} unit={unit} size={48} color={tone ? TONE[tone] : HERO_INK} />
        <p className="mt-1 text-body text-[#3d3a34]">{label}</p>
        {note && (
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            {note}
          </p>
        )}
        {action && (
          /* An anchor rather than a callback, so it can be middle-clicked and copied like every
             other route — and because it LEAVES the popup rather than stacking a panel on it. */
          <a
            href={action.href}
            className="card-press mt-4 flex w-full items-center justify-between gap-3 rounded-[12px] bg-[#f4f3ef] px-3 py-2.5 text-left"
          >
            <span className="text-small font-semibold text-[#3d3a34]">{action.label}</span>
            <ArrowRight size={15} strokeWidth={2.25} className="shrink-0 text-[#5c574f]" aria-hidden />
          </a>
        )}
      </section>
    </div>
  )
}

const Empty = ({ what }: { what: string }) => (
  <p className="text-caption" style={{ color: FAINT }}>
    No {what} in this scope.
  </p>
)

/** How a death reads in a list: what died, and where it has got to. */
const deathValue = (d: Death): string =>
  d.necropsy ? (d.necropsy.status === 'Completed' ? 'Necropsy done' : d.necropsy.status) : shortDate(d.day)

const deathTone = (d: Death) => (d.necropsy ? STATUS_TONE[d.necropsy.status] : undefined)

/**
 * A page of death records. Every list of deaths on this page is one of these.
 *
 * Paged at twelve, because "All time" at the collection scope is a few thousand rows and a
 * sheet that renders them all stutters on the swipe that opened it. `usePaged` is the shared
 * pager the other modules already use.
 */
export function DeathRows({ rows, eyebrow }: { rows: Death[]; eyebrow: string }) {
  const { open } = useSheet()
  const page = usePaged<Death>(
    (offset, limit) => ({ rows: rows.slice(offset, offset + limit), total: rows.length }),
    12,
    [rows.length, rows[0]?.id],
  )

  if (rows.length === 0) return <Empty what="deaths" />

  return (
    <>
      <DrillList>
        {page.rows.map((d) => (
          <DrillRow
            key={d.id}
            label={`${d.animalId} · ${d.speciesName}`}
            sub={`${shortDate(d.day)} · ${d.cause} · ${d.siteName}`}
            value={deathValue(d)}
            tone={deathTone(d)}
            onOpen={() =>
              open({
                title: d.animalId,
                eyebrow: `${eyebrow} › Animal`,
                body: <AnimalMortalitySheet death={d} />,
              })
            }
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun="deaths" />
    </>
  )
}

/** A page of necropsy records — the same deaths, read as the bench's paperwork. */
export function NecropsyRows({ rows, eyebrow }: { rows: Death[]; eyebrow: string }) {
  const { open } = useSheet()
  const referred = useMemo(() => necropsiesOf(rows), [rows])
  const page = usePaged<Death>(
    (offset, limit) => ({ rows: referred.slice(offset, offset + limit), total: referred.length }),
    12,
    [referred.length, referred[0]?.id],
  )

  if (referred.length === 0) return <Empty what="necropsies" />

  return (
    <>
      <DrillList>
        {page.rows.map((d) => (
          <DrillRow
            key={d.id}
            label={`${d.necropsy!.id} · ${d.speciesName}`}
            sub={`${d.animalId} · ${d.necropsy!.condition} · died ${shortDate(d.day)}`}
            value={d.necropsy!.status}
            tone={STATUS_TONE[d.necropsy!.status]}
            onOpen={() =>
              open({
                title: d.necropsy!.id,
                eyebrow: `${eyebrow} › Necropsy`,
                body: <NecropsyRecordSheet death={d} />,
              })
            }
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun="necropsies" />
    </>
  )
}

/**
 * The four breakdowns every filtered list of deaths carries, then the records.
 *
 * A caller passes handlers only for the axes it has not already been cut by — the Aquatic Halls
 * sheet shows species and causes but no site card, because a site breakdown of one site is a
 * row that repeats the title. That is what `skip` is for.
 */
function Splits({
  rows,
  eyebrow,
  skip = [],
  onSite,
  onSpecies,
  onCause,
}: {
  rows: Death[]
  eyebrow: string
  skip?: ('site' | 'species' | 'cause' | 'centre')[]
  onSite?: (id: string) => void
  onSpecies?: (name: string) => void
  onCause?: (cause: string) => void
}) {
  const sites = useMemo(() => bySiteSlice(rows), [rows])
  const species = useMemo(() => bySpeciesSlice(rows), [rows])
  const causes = useMemo(() => byCause(rows), [rows])
  const disposal = useMemo(() => byDisposal(rows), [rows])
  const statuses = useMemo(() => byStatus(rows), [rows])
  const referred = useMemo(() => necropsiesOf(rows), [rows])

  return (
    <>
      {!skip.includes('site') && sites.length > 1 && (
        <Section icon={MapPin} label="Sites affected" aside={`${sites.length}`}>
          <DrillList>
            {sites.map((s) => (
              <DrillRow
                key={s.id}
                label={s.label}
                value={fmt(s.value)}
                unit={`${Math.round(s.percent)}%`}
                onOpen={onSite ? () => onSite(s.id) : undefined}
              />
            ))}
          </DrillList>
        </Section>
      )}

      {!skip.includes('species') && species.length > 0 && (
        <Section icon={Dna} label="Species affected" aside={`${species.length}`}>
          <DrillList>
            {species.slice(0, 14).map((s) => (
              <DrillRow
                key={s.id}
                label={s.label}
                sub={s.sub}
                value={fmt(s.value)}
                unit={`${Math.round(s.percent)}%`}
                onOpen={onSpecies ? () => onSpecies(s.label) : undefined}
              />
            ))}
          </DrillList>
        </Section>
      )}

      {!skip.includes('cause') && causes.length > 0 && (
        <Section icon={Skull} label="Causes" aside={`${causes.length}`}>
          <DrillList>
            {causes.map((c) => (
              <DrillRow
                key={c.id}
                label={c.label}
                value={fmt(c.value)}
                unit={`${Math.round(c.percent)}%`}
                tone={c.tone}
                onOpen={onCause ? () => onCause(c.label) : undefined}
              />
            ))}
          </DrillList>
        </Section>
      )}

      {/* The necropsy standing of this exact set of deaths — the brief's §14, kept inside the
          mortality flow rather than parked on a dashboard of its own. */}
      <Section
        icon={FileSearch}
        label="Necropsy"
        aside={rows.length ? `${referred.length} of ${fmt(rows.length)} referred` : undefined}
      >
        {statuses.length > 0 ? (
          <>
            <DrillList>
              {statuses.map((s) => (
                <DrillRow key={s.id} label={s.label} value={fmt(s.value)} tone={s.tone} />
              ))}
            </DrillList>
            {!skip.includes('centre') && disposal.length > 0 && (
              <>
                {/* Disposal, where the centre breakdown used to be. It is the other thing the
                    record states about a carcass, and unlike a centre it exists. The rows do
                    not open — there is nothing below a disposal method to drill into. */}
                <Rule label="Disposal" />
                <DrillList>
                  {disposal.map((c) => (
                    <DrillRow key={c.id} label={c.label} value={fmt(c.value)} />
                  ))}
                </DrillList>
              </>
            )}
          </>
        ) : (
          /* Not a zero. None of these deaths went to a bench, and saying so is different from
             saying nothing is pending. */
          <p className="text-caption" style={{ color: FAINT }}>
            None of these deaths were referred for necropsy.
          </p>
        )}
      </Section>
      <Section icon={ClipboardList} label="Death records" aside={`${fmt(rows.length)}`}>
        <DeathRows rows={rows} eyebrow={eyebrow} />
      </Section>
    </>
  )
}

/* ── the universal list · what most sections open ────────────────────────── */

/**
 * ONE SHEET FOR EVERY SLICE. A site, a species, a cause, a regulatory band, a trend period, a
 * necropsy status — all of them are "these deaths", and the only thing that differs is which
 * deaths and what the figure at the top means.
 *
 * It recurses into itself through `Splits`, which is how Site → Species → Animal and
 * Cause → Species → Animal both work without either being written twice.
 */
export function DeathListSheet({
  title,
  rows,
  label,
  note,
  tone,
  skip = [],
}: {
  title: string
  rows: Death[]
  /** What the count at the top IS — "Deaths", "Schedule I deaths", "Deaths · Disease". */
  label: string
  note?: string
  tone?: 'good' | 'warn' | 'bad'
  skip?: ('site' | 'species' | 'cause' | 'centre')[]
}) {
  const { scope } = useScope()
  const { open } = useSheet()

  /* Every child narrows THIS set rather than re-reading the window, so a row's figure and the
     sheet it opens can never disagree. */
  const into = (childTitle: string, kind: string, filter: (d: Death) => boolean, childSkip: typeof skip) =>
    open({
      title: childTitle,
      eyebrow: `${title} › ${kind}`,
      body: (
        <DeathListSheet
          title={childTitle}
          rows={rows.filter(filter)}
          label={label}
          note={`${childTitle} · ${scope.win.window}`}
          tone={tone}
          skip={[...skip, ...childSkip]}
        />
      ),
    })

  return (
    <>
      <SheetHero value={fmt(rows.length)} label={label} note={note ?? scopeLine(scope)} tone={tone} />
      <Stack>
        <Splits
          rows={rows}
          eyebrow={title}
          skip={skip}
          onSite={(id) => {
            const name = rows.find((d) => d.siteKey === id)?.siteName ?? id
            into(name, 'Site', (d) => d.siteKey === id, ['site'])
          }}
          onSpecies={(name) => into(name, 'Species', (d) => d.speciesName === name, ['species'])}
          onCause={(cause) => into(cause, 'Cause', (d) => d.cause === cause, ['cause'])}
        />
      </Stack>
    </>
  )
}

/* ── one site, in full · the brief's §4 ─────────────────────────────────── */

/**
 * Everything the site table showed, then the way down.
 *
 * Deliberately not `DeathListSheet` with a site filter: the brief asks this one to carry the
 * regulatory split and the necropsy standing as figures at the top, because "how many of
 * Aquatic Halls' deaths were regulated" is the question a site row raises. Below the summary it
 * hands over to the shared splits, so the path onward is the same one every other sheet uses.
 */
export function SiteMortalitySheet({ siteKey, rows }: { siteKey: string; rows: Death[] }) {
  const { scope } = useScope()
  const mine = useMemo(() => rows.filter((d) => d.siteKey === siteKey), [rows, siteKey])
  const name = mine[0]?.siteName ?? siteKey
  const split = useMemo(() => regulatorySplit(mine), [mine])
  const referred = useMemo(() => necropsiesOf(mine), [mine])
  const completed = referred.filter((d) => d.necropsy!.status === 'Completed').length
  const share = rows.length ? (mine.length / rows.length) * 100 : 0

  return (
    <>
      <SheetHero
        value={fmt(mine.length)}
        label={`Deaths · ${name}`}
        note={`${Math.round(share)}% of the window's mortality · ${scope.win.window}`}
        tone={mine.length ? 'bad' : 'good'}
      />
      <Stack>
        <Section icon={MapPin} label="Site mortality" aside={scope.win.window}>
          <Snapshot
            cols={4}
            items={[
              { label: 'Deaths', value: fmt(mine.length) },
              { label: 'Species', value: fmt(new Set(mine.map((d) => d.speciesName)).size) },
              { label: 'Regulatory', value: fmt(split.regulated.deaths), tone: split.regulated.deaths ? 'warn' : 'neutral' },
              { label: 'Necropsies', value: fmt(referred.length) },
            ]}
          />
          <Rule label="Regulatory standing" />
          <Snapshot
            cols={2}
            items={[
              {
                label: 'Regulatory',
                value: fmt(split.regulated.deaths),
                note: `${Math.round(split.regulated.percent)}% · ${split.regulated.species} species`,
                tone: 'warn',
              },
              {
                label: 'Non-regulatory',
                value: fmt(split.open.deaths),
                note: `${Math.round(split.open.percent)}% · husbandry record`,
              },
            ]}
          />
          <Rule label="Necropsy" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Referred', value: fmt(referred.length) },
              { label: 'Completed', value: fmt(completed), tone: 'good' },
              { label: 'Pending', value: fmt(referred.length - completed), tone: referred.length - completed ? 'warn' : 'neutral' },
            ]}
          />
        </Section>
        <SiteSplits rows={mine} title={name} />
      </Stack>
    </>
  )
}

/** The onward path from a site — species, causes, necropsy, records. */
function SiteSplits({ rows, title }: { rows: Death[]; title: string }) {
  const { scope } = useScope()
  const { open } = useSheet()

  return (
    <Splits
      rows={rows}
      eyebrow={title}
      skip={['site']}
      onSpecies={(name) =>
        open({
          title: name,
          eyebrow: `${title} › Species`,
          body: <SpeciesMortalitySheet speciesName={name} rows={rows} within={title} />,
        })
      }
      onCause={(cause) =>
        open({
          title: cause,
          eyebrow: `${title} › Cause`,
          body: (
            <DeathListSheet
              title={cause}
              rows={rows.filter((d) => d.cause === cause)}
              label={`Deaths · ${cause}`}
              note={`${title} · ${scope.win.window}`}
              tone="bad"
              skip={['site', 'cause']}
            />
          ),
        })
      }
    />
  )
}

/* ── one species, in full · the brief's §5 ──────────────────────────────── */

/**
 * A species' mortality, and the regulatory instruments it actually carries.
 *
 * `standingOf` is a species-level fact, so this is the natural place to state the CITES
 * appendix and the schedule — and the only place they can be stated without a caveat, because
 * every animal on this sheet carries them by definition.
 */
export function SpeciesMortalitySheet({
  speciesName,
  rows,
  within,
}: {
  speciesName: string
  rows: Death[]
  /** Where this cut came from — "Aquatic Halls", "Disease". Named in the note. */
  within?: string
}) {
  const { scope } = useScope()
  const mine = useMemo(() => rows.filter((d) => d.speciesName === speciesName), [rows, speciesName])
  const first = mine[0]
  const referred = useMemo(() => necropsiesOf(mine), [mine])
  const completed = referred.filter((d) => d.necropsy!.status === 'Completed').length
  const share = rows.length ? (mine.length / rows.length) * 100 : 0
  const sites = new Set(mine.map((d) => d.siteName))
  /* Scoped to the site pill where one is set, so the record opened is the population the reader
     is already looking at rather than the largest one anywhere. */
  const record = useMemo(() => speciesHref(speciesName, siteKeyOf(scope)), [speciesName, scope])

  return (
    <>
      <SheetHero
        value={fmt(mine.length)}
        label={`Deaths · ${speciesName}`}
        note={`${Math.round(share)}% of ${within ?? 'the window'} · ${scope.win.window}`}
        tone={mine.length ? 'bad' : 'good'}
        /* THE WAY OUT — see `SheetHero`'s own note. `speciesHref` is the one function in the
           product that decides which population a bare name means, so this popup and a births
           row naming the same species land on the same record. */
        action={record ? { label: 'Open the species record', href: record } : undefined}
      />
      <Stack>
        <Section icon={Dna} label="Species" aside={first?.cls}>
          <Facts
            items={[
              { label: 'Species', sub: first?.cls, value: speciesName },
              { label: 'Deaths', value: fmt(mine.length) },
              { label: 'Share of mortality', value: `${Math.round(share)}%` },
              { label: 'Sites affected', value: `${sites.size}`, sub: [...sites].join(' · ') },
              {
                label: 'Regulatory status',
                value: first?.regulated ? 'Regulatory' : 'Non-regulatory',
                tone: first?.regulated ? 'warn' : undefined,
              },
              /* Only where the instrument applies. A dash against CITES on a common carp
                 reads as missing data rather than as "not listed". */
              ...(first?.cites ? [{ label: 'CITES', value: `Appendix ${first.cites}` as string, tone: 'warn' as const }] : []),
              ...(first?.schedule
                ? [
                    {
                      label: 'Wildlife Protection Act',
                      value: `Schedule ${first.schedule}`,
                      tone: (first.schedule === 'I' ? 'bad' : 'warn') as 'bad' | 'warn',
                    },
                  ]
                : []),
              ...(first ? [{ label: 'IUCN Red List', value: first.standing.iucn }] : []),
            ]}
          />
          <Rule label="Necropsy" />
          <Snapshot
            cols={3}
            items={[
              { label: 'Referred', value: fmt(referred.length) },
              { label: 'Completed', value: fmt(completed), tone: 'good' },
              {
                label: 'Pending',
                value: fmt(referred.length - completed),
                tone: referred.length - completed ? 'warn' : 'neutral',
              },
            ]}
          />
        </Section>
        <Splits rows={mine} eyebrow={speciesName} skip={['species']} />
      </Stack>
    </>
  )
}

/* ── one cause · the brief's §8 ─────────────────────────────────────────── */

export function CauseSheet({ cause, rows }: { cause: string; rows: Death[] }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const mine = useMemo(() => rows.filter((d) => d.cause === cause), [rows, cause])
  const referred = useMemo(() => necropsiesOf(mine), [mine])
  const completed = referred.filter((d) => d.necropsy!.status === 'Completed')
  /* What the benches actually concluded about this cause — the one figure a cause card cannot
     show on its own, and the reason the necropsy sits inside the mortality flow. */
  const share = rows.length ? (mine.length / rows.length) * 100 : 0

  return (
    <>
      <SheetHero
        value={fmt(mine.length)}
        label={`Deaths · ${cause}`}
        note={`${Math.round(share)}% of mortality · ${scopeLine(scope)}`}
        tone={hero(mine[0]?.tone)}
      />
      <Stack>
        <Section icon={Skull} label="Cause" aside={`${Math.round(share)}% of the window`}>
          <Snapshot
            cols={4}
            items={[
              { label: 'Deaths', value: fmt(mine.length) },
              { label: 'Species', value: fmt(new Set(mine.map((d) => d.speciesName)).size) },
              { label: 'Sites', value: fmt(new Set(mine.map((d) => d.siteKey)).size) },
              { label: 'Necropsies', value: fmt(referred.length) },
            ]}
          />
          {completed.length > 0 && (
            <>
              {/* CONFIRMED / REVISED IS GONE. It compared the cause recorded at the enclosure
                  against the bench's own finding, and the schema has no finding — only whether
                  the necropsy is done. What survives is the completion count, which is real. */}
              <Rule label="At the bench" />
              <Snapshot
                cols={2}
                items={[
                  { label: 'Completed', value: fmt(completed.length), tone: 'good' },
                  { label: 'Still pending', value: fmt(referred.length - completed.length), tone: 'warn' },
                ]}
              />
            </>
          )}
        </Section>

        <Splits
          rows={mine}
          eyebrow={cause}
          skip={['cause']}
          onSite={(id) => {
            const name = mine.find((d) => d.siteKey === id)?.siteName ?? id
            open({
              title: name,
              eyebrow: `${cause} › Site`,
              body: (
                <DeathListSheet
                  title={name}
                  rows={mine.filter((d) => d.siteKey === id)}
                  label={`Deaths · ${cause}`}
                  note={`${name} · ${scope.win.window}`}
                  tone="bad"
                  skip={['cause', 'site']}
                />
              ),
            })
          }}
          onSpecies={(name) =>
            open({
              title: name,
              eyebrow: `${cause} › Species`,
              body: <SpeciesMortalitySheet speciesName={name} rows={mine} within={cause} />,
            })
          }
        />
      </Stack>
    </>
  )
}

/* ── regulatory · the brief's §6 ────────────────────────────────────────── */

/**
 * A regulatory band, drilled contextually rather than on a page of its own.
 *
 * The brief is specific that this must not become a separate page and must follow
 * band → site → species → animal, and that CITES and Schedule information is shown only where
 * it actually applies. Both fall out of the data: the band is a filter over the window's
 * deaths, and the instruments are read from each animal's own species standing.
 */
export function RegulatorySheet({
  title,
  rows,
  label,
  note,
}: {
  title: string
  rows: Death[]
  label: string
  note?: string
}) {
  const { scope } = useScope()
  const { open } = useSheet()
  const instruments = useMemo(() => {
    /* Every distinct instrument combination present in this band, biggest first. A band is not
       one instrument — Schedule I contains animals that also carry Appendix I and animals that
       carry nothing else, and a curator reads those differently. */
    const map = new Map<string, Death[]>()
    for (const d of rows) {
      const k = standingLabel(d.standing)
      const at = map.get(k)
      if (at) at.push(d)
      else map.set(k, [d])
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [rows])

  return (
    <>
      <SheetHero
        value={fmt(rows.length)}
        label={label}
        note={note ?? scopeLine(scope)}
        tone={rows.length ? 'warn' : 'good'}
      />
      <Stack>
        {instruments.length > 1 && (
          <Section icon={ScrollText} label="Instruments held" aside={`${instruments.length}`}>
            <DrillList>
              {instruments.map(([text, list]) => (
                <DrillRow
                  key={text}
                  label={text}
                  sub={`${new Set(list.map((d) => d.speciesName)).size} species`}
                  value={fmt(list.length)}
                  onOpen={() =>
                    open({
                      title: text,
                      eyebrow: `${title} › Instrument`,
                      body: (
                        <DeathListSheet
                          title={text}
                          rows={list}
                          label={`Deaths · ${text}`}
                          note={`${text} · ${scope.win.window}`}
                          tone="warn"
                        />
                      ),
                    })
                  }
                />
              ))}
            </DrillList>
          </Section>
        )}

        <Splits
          rows={rows}
          eyebrow={title}
          onSite={(id) => {
            const name = rows.find((d) => d.siteKey === id)?.siteName ?? id
            open({
              title: name,
              eyebrow: `${title} › Site`,
              body: (
                <RegulatorySheet
                  title={name}
                  rows={rows.filter((d) => d.siteKey === id)}
                  label={label}
                  note={`${name} · ${scope.win.window}`}
                />
              ),
            })
          }}
          onSpecies={(name) =>
            open({
              title: name,
              eyebrow: `${title} › Species`,
              body: <SpeciesMortalitySheet speciesName={name} rows={rows} within={title} />,
            })
          }
          onCause={(cause) =>
            open({
              title: cause,
              eyebrow: `${title} › Cause`,
              body: (
                <DeathListSheet
                  title={cause}
                  rows={rows.filter((d) => d.cause === cause)}
                  label={`${label} · ${cause}`}
                  note={`${cause} · ${scope.win.window}`}
                  tone="warn"
                  skip={['cause']}
                />
              ),
            })
          }
        />
      </Stack>
    </>
  )
}

/* ── one necropsy centre · the brief's §10 ──────────────────────────────── */

/* ── species-wise necropsy · the brief's §11 ────────────────────────────── */

export function SpeciesNecropsySheet({
  speciesName,
  rows,
  within,
}: {
  speciesName: string
  rows: Death[]
  within?: string
}) {
  const { scope } = useScope()
  const mine = useMemo(() => rows.filter((d) => d.speciesName === speciesName), [rows, speciesName])
  const referred = useMemo(() => necropsiesOf(mine), [mine])
  const completed = referred.filter((d) => d.necropsy!.status === 'Completed')
  const first = mine[0]
  const record = useMemo(() => speciesHref(speciesName, siteKeyOf(scope)), [speciesName, scope])

  return (
    <>
      <SheetHero
        value={fmt(referred.length)}
        label={`Necropsies · ${speciesName}`}
        note={`of ${fmt(mine.length)} deaths · ${within ?? scope.site?.name ?? 'Overall'} · ${scope.win.window}`}
        tone={referred.length > completed.length ? 'warn' : 'good'}
        action={record ? { label: 'Open the species record', href: record } : undefined}
      />
      <Stack>
        <Section icon={Dna} label="Species" aside={first?.cls}>
          <Facts
            items={[
              { label: 'Species', sub: first?.cls, value: speciesName },
              { label: 'Deaths', value: fmt(mine.length) },
              { label: 'Necropsies', value: fmt(referred.length) },
              {
                label: 'Necropsy rate',
                value: mine.length ? `${Math.round((referred.length / mine.length) * 100)}%` : '—',
              },
              { label: 'Completed', value: fmt(completed.length), tone: 'good' },
              {
                label: 'Pending',
                value: fmt(referred.length - completed.length),
                tone: referred.length - completed.length ? 'warn' : 'neutral',
              },
              ...(first?.regulated ? [{ label: 'Regulatory', value: standingLabel(first.standing), tone: 'warn' as const }] : []),
            ]}
          />
        </Section>

        {referred.length > 0 && (
          <>
            {/* Carcass condition, where the centre list used to be — the record's own first
                observation about each animal that reached the bench. */}
            <Section icon={Building2} label="Carcass condition" aside={`${byCondition(referred).length}`}>
              <DrillList>
                {byCondition(referred).map((c) => (
                  <DrillRow key={c.id} label={c.label} value={fmt(c.value)} />
                ))}
              </DrillList>
            </Section>

            {completed.length > 0 && (
              <Section icon={Skull} label="Findings" aside={`${completed.length} completed`}>
                <DrillList>
                  {byCause(completed).map((c) => (
                    <DrillRow key={c.id} label={c.label} value={fmt(c.value)} tone={c.tone} />
                  ))}
                </DrillList>
              </Section>
            )}
          </>
        )}

        <Section icon={MapPin} label="Sites" aside={`${bySiteSlice(mine).length}`}>
          <DrillList>
            {bySiteSlice(mine).map((s) => (
              <DrillRow key={s.id} label={s.label} value={fmt(s.value)} />
            ))}
          </DrillList>
        </Section>
        <Section icon={FileSearch} label="Necropsy records" aside={`${referred.length}`}>
          <NecropsyRows rows={mine} eyebrow={speciesName} />
        </Section>
        <Section icon={ClipboardList} label="Death records" aside={`${mine.length}`}>
          <DeathRows rows={mine} eyebrow={speciesName} />
        </Section>
      </Stack>
    </>
  )
}

/* ── one necropsy record · the brief's §12 ──────────────────────────────── */

/** Every field the necropsy has, and no field it does not. */
export function NecropsyRecordSheet({ death: d }: { death: Death }) {
  const { open } = useSheet()
  const n = d.necropsy!

  return (
    <>
      <SheetHero
        value={n.status === 'Completed' ? 'Complete' : n.status}
        label={`${n.id} · ${d.speciesName}`}
        note={`${d.siteName} · died ${longDate(d.day)}`}
        tone={hero(STATUS_TONE[n.status])}
      />
      <Stack>
        <Section icon={FileSearch} label="Necropsy record">
          <Facts
            items={[
              { label: 'Necropsy ID', value: n.id },
              { label: 'Animal ID', value: d.animalId },
              { label: 'Species', sub: d.cls, value: d.speciesName },
              { label: 'Site', value: d.siteName },
              { label: 'Date of death', value: longDate(d.day) },
              { label: 'Status', value: n.status, tone: STATUS_TONE[n.status] },
              { label: 'Cause recorded at enclosure', value: d.cause, tone: d.tone },
              { label: 'Carcass condition', value: n.condition },
              { label: 'Disposal', value: n.disposal },
              /* THE FIELDS THAT ARE NOT HERE. A necropsy centre, the date the bench received
                 the animal, a turnaround, a due date, a confirmed finding and a "cause
                 revised" flag were all on this sheet, and every one of them was modelled.
                 `report_deaths` records a status, a carcass condition and a disposal method,
                 and nothing else about the examination — so this sheet now shows three real
                 fields instead of nine, four of which a director might have acted on. */
            ]}
          />
        </Section>
        <Section icon={PawPrint} label="Animal" aside={d.animalId}>
          <DrillList>
            <DrillRow
              label={d.speciesName}
              sub={`${d.animalId} · ${d.siteName}`}
              value="Record"
              onOpen={() =>
                open({
                  title: d.animalId,
                  eyebrow: `${n.id} › Animal`,
                  body: <AnimalMortalitySheet death={d} />,
                })
              }
            />
          </DrillList>
        </Section>
      </Stack>
    </>
  )
}

/* ── the animal, at the bottom of every path · the brief's §13 ──────────── */

/**
 * The deepest level, and the end of both drill paths.
 *
 * Reached from a site, a species, a cause, a regulatory band, a bench, a trend column and
 * search — all seven arrive here, which is the point of having one of these rather than seven.
 *
 * `animalById` supplies the husbandry record: sex, enclosure, age, origin. Where it cannot
 * resolve the id the sheet prints what the death record itself carries rather than dashes,
 * because a death is a real event whether or not the animal is still in the population index.
 */
export function AnimalMortalitySheet({ death: d }: { death: Death }) {
  const { open } = useSheet()
  const animal = animalById(d.animalId)
  const n = d.necropsy

  return (
    <>
      <SheetHero
        value={shortDate(d.day)}
        label={`${d.speciesName} · ${d.cause}`}
        note={`${d.animalId} · ${d.siteName}`}
        tone="bad"
      />
      <Stack>
        <Section icon={PawPrint} label="Animal">
          <Facts
            items={[
              { label: 'Animal ID', value: d.animalId },
              ...(animal?.callName ? [{ label: 'Call name', value: animal.callName }] : []),
              { label: 'Species', sub: d.cls, value: d.speciesName },
              ...(animal ? [{ label: 'Sex', value: SEX[animal.sex] }] : []),
              { label: 'Site', value: d.siteName },
              ...(animal ? [{ label: 'Enclosure', value: animal.enclosureId }] : []),
              ...(animal ? [{ label: 'Age at death', value: animal.age }] : []),
              ...(animal ? [{ label: 'Origin', value: animal.origin }] : []),
              ...(animal ? [{ label: 'Accession', value: animal.accession }] : []),
            ]}
          />
        </Section>
        <Section icon={Skull} label="Death" aside={shortDate(d.day)}>
          <Facts
            items={[
              { label: 'Date of death', value: longDate(d.day) },
              { label: 'Cause of death', value: d.cause, tone: d.tone },
              { label: 'Recorded at', value: d.siteName },
            ]}
          />
        </Section>
        <Section icon={ScrollText} label="Regulatory standing">
          <Facts
            items={[
              {
                label: 'Classification',
                value: d.regulated ? 'Regulatory' : 'Non-regulatory',
                tone: d.regulated ? 'warn' : undefined,
              },
              /* Each instrument only where the species actually carries it. */
              ...(d.cites ? [{ label: 'CITES', value: `Appendix ${d.cites}`, tone: 'warn' as const }] : []),
              ...(d.schedule
                ? [
                    {
                      label: 'Wildlife Protection Act',
                      value: `Schedule ${d.schedule}`,
                      tone: (d.schedule === 'I' ? 'bad' : 'warn') as 'bad' | 'warn',
                    },
                  ]
                : []),
              { label: 'IUCN Red List', value: d.standing.iucn },
              ...(d.regulated
                ? []
                : [{ label: 'Note', value: 'Husbandry record', sub: 'No permit or schedule applies' }]),
            ]}
          />
        </Section>
        <Section icon={FileSearch} label="Necropsy" aside={n ? n.id : 'not referred'}>
          {n ? (
            <>
              <Facts
                items={[
                  { label: 'Necropsy ID', value: n.id },
                  { label: 'Status', value: n.status, tone: STATUS_TONE[n.status] },
                  { label: 'Carcass condition', value: n.condition },
                  { label: 'Disposal', value: n.disposal },
                ]}
              />
              <Rule label="Record" />
              <DrillList>
                <DrillRow
                  label={n.id}
                  sub={`${n.condition} · ${n.status}`}
                  value="Open"
                  tone={STATUS_TONE[n.status]}
                  onOpen={() =>
                    open({
                      title: n.id,
                      eyebrow: `${d.animalId} › Necropsy`,
                      body: <NecropsyRecordSheet death={d} />,
                    })
                  }
                />
              </DrillList>
            </>
          ) : (
            /* Not "pending". This death was never referred, and the two are different answers
               — one is a backlog and the other is a decision. */
            <p className="text-caption" style={{ color: FAINT }}>
              Not referred for necropsy. Recorded as a husbandry death at {d.siteName}.
            </p>
          )}
        </Section>
      </Stack>
      <p className="px-[var(--gutter)] pt-1 pb-2 text-center text-caption" style={{ color: FAINT }}>
        Deepest level
      </p>
    </>
  )
}

const SEX: Record<string, string> = { M: 'Male', F: 'Female', U: 'Unknown' }

/* ── a period of the trend · the brief's §3 ─────────────────────────────── */

export function PeriodSheet({
  rows,
  label,
  from,
  to,
  before,
}: {
  rows: Death[]
  label: string
  from: number
  to: number
  /** The same period one window earlier, where the comparison exists. */
  before?: number
}) {
  const { scope } = useScope()

  return (
    <>
      <SheetHero
        value={fmt(rows.length)}
        label={`Deaths · ${label}`}
        note={[
          from === to ? longDate(from) : `${shortDate(from)} – ${shortDate(to)}`,
          before !== undefined ? `${before} in the previous period` : undefined,
          scope.site?.name,
        ]
          .filter(Boolean)
          .join(' · ')}
        tone={rows.length ? 'bad' : 'good'}
      />
      <Stack>
        <Splits rows={rows} eyebrow={label} />
      </Stack>
    </>
  )
}

/* ── search results · the brief's §17 ───────────────────────────────────── */

/**
 * What a search found, as the one thing a search result can honestly be: the matching deaths.
 *
 * Deliberately not six lists by field. Somebody typing "gharial" wants the gharials that died,
 * and whether the word matched the species column or a necropsy finding is not a distinction
 * worth a section header. The splits above the records then say where those deaths were.
 */
export function SearchSheet({ query, rows }: { query: string; rows: Death[] }) {
  const { scope } = useScope()
  return (
    <>
      <SheetHero
        value={fmt(rows.length)}
        label={`Matching deaths · “${query}”`}
        note={scopeLine(scope)}
        tone={rows.length ? undefined : 'good'}
      />
      <Stack>
        {rows.length > 0 ? (
          <Splits rows={rows} eyebrow={`“${query}”`} />
        ) : (
          <Section icon={Stethoscope} label="No match">
            <p className="text-caption" style={{ color: FAINT }}>
              Nothing in {scope.win.window} matches “{query}”. Search covers animal ID, species, site, cause,
              necropsy ID, centre and finding.
            </p>
          </Section>
        )}
      </Stack>
    </>
  )
}
