/**
 * WHAT THE ANIMAL POPULATION PAGE OPENS.
 *
 * A popup here is a SELECTOR. Clicking an aggregate — a site's headcount, a CITES appendix, a
 * class, one column of the births chart — opens a centered popup that says what was clicked and
 * lists what can be chosen from it. Choosing a named thing LEAVES: the popup's history is wound
 * off and the reader lands on that entity's own page. See `drillNav.tsx` for why in that order.
 *
 * THREE PANELS, NOT TWELVE. The brief names ten drill targets and they collapse to three shapes:
 *
 *   SitePanel     one place, and everything in it
 *   GroupPanel    a set of species — a CITES appendix, a schedule, a Red List category, a
 *                 taxonomic class, the regulated half of the collection
 *   FlowPanel     a set of events — births, deaths, transfers, escapes, fetal losses
 *
 * Writing five near-identical event sheets is how "Deaths by site" and "Births by site" end up
 * grouping differently; one parameterised panel cannot.
 *
 * `SpeciesPanel` WAS THE FOURTH, AND IS GONE. It held one species' sexes, standing, sites and
 * animals — which is what `#/e/species/<id>` holds, in more depth and at a URL that can be
 * linked. Keeping both meant a species read one way from a popup and another way from a page,
 * the same "two models of one thing" drift `drill.ts` documents at length. Species rows now go
 * to the page. Nothing that was reachable stopped being reachable.
 *
 * Nothing is drawn here. Every mark is `exec/system.tsx` and every row is `panels.tsx`'s
 * `TapRow`.
 */

import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  Baby,
  Dna,
  Footprints,
  Layers,
  ListOrdered,
  MapPin,
  PawPrint,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { shortDate, type Win } from '../../core/calendar'
import { animalsInScope, type Animal } from '../../core/animals'
import { page as eventPage, tally, type Ev } from '../../core/events'
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
import { TapList, TapRow } from '../panels'
import { useSheet } from '../sheet'
import { useDrill } from '../drillNav'
import { FindField } from '../filters'
import { useScope } from '../scope'
import { MoreRows, usePaged } from '../perf'
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
  action,
}: {
  value: string
  unit?: string
  label: string
  note?: string
  status?: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
  /** The published Red List badge, where the sheet is about one. */
  badge?: (typeof RED_LIST)[number]
  /**
   * THE WAY OUT OF THE POPUP AND INTO THE PAGE.
   *
   * A popup about ONE named thing — a site, a species — is a selector whose selection
   * has already been made, so it owes the reader the page underneath it. Every popup
   * that has one offers it in the same place and the same words, which is what stops
   * "where is the full record" from being a different gesture per card. Popups about a
   * CATEGORY (a date's births, an appendix) have no single entity to offer and pass
   * nothing — the rows below them are the selection.
   */
  action?: { label: string; onOpen: () => void }
}) {
  return (
    <div className="w-full px-[var(--gutter)] pb-3">
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
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            {note}
          </p>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onOpen}
            className="card-press mt-4 flex w-full items-center justify-between gap-3 rounded-[12px] bg-[#f4f3ef] px-3 py-2.5 text-left"
          >
            <span className="text-small font-semibold text-[#3d3a34]">{action.label}</span>
            <ArrowRight size={15} strokeWidth={2.25} className="shrink-0 text-[#5c574f]" aria-hidden />
          </button>
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
  const { drillTo } = useDrill()
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
            /* An animal is always the end of a drill — there is nothing under it to
               select. Straight to its page, and the popup closes behind it. */
            onOpen={() => drillTo({ kind: 'animal', id: a.id }, { module: 'animals', label: eyebrow })}
          />
        ))}
      </TapList>
      {paged.total === 0 && <p className="text-small text-[#5c574f]">No animals in this scope.</p>}
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
  const { drillTo } = useDrill()
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
        action={{
          label: 'Open site details',
          onOpen: () => drillTo({ kind: 'site', id: siteKey }, { module: 'animals', label: 'Site population' }),
        }}
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
                onOpen={() => drillTo({ kind: 'species', id: s.id }, { module: 'animals', label: site.name })}
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

/* ── one bucket of one flow — the graph's own drill ──────────────────────── */

/**
 * WHAT ONE COLUMN OF A BIRTHS OR MORTALITY CHART CONTAINS.
 *
 * THE BRIDGE THE PRODUCT WAS MISSING. A bar was a figure with nowhere to go: the reader could
 * see that the 12th was the month's worst day for deaths and had no way to ask which species.
 * This is the sheet that answers it, and it is deliberately the ONLY thing between the mark and
 * a species page — graph → sheet → species → species details, with no intermediate screen.
 *
 * IT IS SCOPED TO THE BUCKET, NOT TO THE PAGE. `win` here is the column's own span, handed over
 * by `EventTrend`'s `onPick` (see `Pt.from`), so a weekly bucket on a six-month range lists that
 * week and a daily bucket lists that day. The site comes from the page's own scope, so a reader
 * who narrowed to one site sees that site's species and the header says so. This is the whole of
 * "never lose the active filter context": both halves travel with the click.
 *
 * SEARCH ONLY WHERE THERE IS SOMETHING TO SEARCH. A field over four rows is furniture.
 */
export function FlowBucketPanel({
  slug,
  title,
  bucketLabel,
  win,
  siteKey,
  tone,
}: {
  slug: string
  title: string
  /** The column's own label — "12 May", "25 – 31 Jul". Stated, never rebuilt from the span. */
  bucketLabel: string
  win: Win
  siteKey: string | null
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const { scope } = useScope()
  const { drillTo } = useDrill()
  const [query, setQuery] = useState('')

  const rows = useMemo(() => tally(slug, siteKey, win, 'species'), [slug, siteKey, win])
  const total = useMemo(() => rows.reduce((n, r) => n + r.value, 0), [rows])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? rows.filter((r) => r.label.toLowerCase().includes(q)) : rows
  }, [rows, query])

  const where = siteKey ? (siteOf(siteKey)?.name ?? siteKey) : 'All sites'
  /* THE TWO PERIODS ARE NOT THE SAME PERIOD, and the popup says so when they differ.
     The page is filtered to a window; the reader then clicked ONE column inside it. Both
     facts are live and only one of them is the popup's subject, so printing the bucket
     alone invites "42 births" to be read as the window's total. Identical spans print
     once — a bucket that IS the window has nothing to distinguish. */
  const localised = win.window !== scope.win.window

  /**
   * NAVIGATE THROUGH `drillTo`, WHICH UNWINDS THE POPUP'S HISTORY FIRST.
   *
   * This used to call `go()` directly, with a note warning against also calling
   * `close()` — `close()` is `history.go(-depth)`, which is ASYNCHRONOUS, so it landed
   * after the hash had been set and navigated straight back to this page. The sheet
   * closed, the species page never opened, and nothing errored.
   *
   * `drillTo` is that fix done properly rather than avoided: it winds the popup's
   * entries off and navigates on the `popstate`, so the two are ordered instead of
   * racing, and Back out of the species page lands on Animal Population rather than on
   * the dead entry this popup left behind. See `drillNav.tsx`.
   */
  const openSpecies = (name: string) => {
    const sp = speciesByName(name).sort((a, b) => b.weight - a.weight)[0]
    if (!sp) return
    drillTo({ kind: 'species', id: sp.id }, { module: 'animals', label: `${title}` })
  }

  return (
    <>
      <SheetHero
        value={fmt(total)}
        label={title}
        note={
          localised
            ? `Selected ${bucketLabel} · ${where}   ·   Global period ${scope.win.window}`
            : `${bucketLabel} · ${where}`
        }
        tone={tone}
      />
      <Stack>
        <Section icon={PawPrint} label="Species" aside={fmt(rows.length)}>
          {rows.length === 0 ? (
            <p className="py-2 text-caption" style={{ color: FAINT }}>
              Nothing recorded in {bucketLabel}.
            </p>
          ) : (
            <>
              {rows.length > 8 && (
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search species"
                  aria-label="Search species"
                  className="mb-3 w-full rounded-[10px] bg-[#f7f6f3] px-3 py-2 text-small text-[#1c1a16] outline-none focus:ring-2 focus:ring-[#37bd69]/35"
                />
              )}
              <TapList>
                {shown.map((r) => (
                  <TapRow
                    key={r.key}
                    label={r.label}
                    value={fmt(r.value)}
                    onOpen={() => openSpecies(r.label)}
                  />
                ))}
              </TapList>
              {shown.length === 0 && (
                <p className="py-2 text-caption" style={{ color: FAINT }}>
                  No species matches “{query}”.
                </p>
              )}
            </>
          )}
        </Section>
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
  const { drillTo } = useDrill()
  const [query, setQuery] = useState('')
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

  /* SEARCH ONLY WHERE THERE IS SOMETHING TO SEARCH — the rule `FlowBucketPanel` already
     states. CITES Appendix II holds 1,780 species and a reader looking for one of them
     should not be scrolling; Schedule III under one site can hold four, and a field over
     four rows is furniture. Twelve is where a list stops being readable at a glance.
     Matches the class too, so "Aves" narrows an appendix to its birds. */
  const searchable = detailed.length > 12
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return detailed
    return detailed.filter((s) => s.name.toLowerCase().includes(q) || s.cls.toLowerCase().includes(q))
  }, [detailed, query])

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
            <p className="text-small text-[#5c574f]">The collection holds no animals in this category.</p>
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
            <Section
              icon={Dna}
              label="Species"
              aside={query.trim() ? `${shown.length} of ${detailed.length}` : `${detailed.length}`}
            >
              {searchable && <FindField value={query} onChange={setQuery} placeholder="Search species" />}
              <div className={searchable ? 'mt-3' : undefined}>
                <TapList>
                  {shown.map((s) => (
                    <TapRow
                      key={s.id}
                      label={s.name}
                      sub={`${s.cls} · ${s.siteName}`}
                      value={fmt(s.animals)}
                      /* The selection. Closes the popup and opens the species' own page
                         rather than stacking a second panel on the one above it. */
                      onOpen={() => drillTo({ kind: 'species', id: s.id }, { module: 'animals', label: title })}
                    />
                  ))}
                </TapList>
                {shown.length === 0 && (
                  <p className="text-small text-[#5c574f]">No species here match “{query.trim()}”.</p>
                )}
              </div>
            </Section>
          </>
        )}
      </Stack>
      <p className="px-[var(--gutter)] pt-1 pb-2 text-center text-caption text-[#736e67]">{eyebrow}</p>
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
  const { drillTo } = useDrill()
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
                /* The animal named in an event row is the end of the drill, the same as
                   every other animal row in this file. */
                onOpen={() =>
                  drillTo({ kind: 'animal', id: ev.animalId }, { module: 'animals', label: spec.title })
                }
              />
            ))}
          </TapList>
          {paged.total === 0 && (
            <p className="text-small text-[#5c574f]">Nothing recorded in {win.window}.</p>
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
