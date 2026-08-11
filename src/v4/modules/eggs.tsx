/**
 * EGGS & INCUBATION — a lifecycle page, read left to right.
 *
 * Set → hatched → survived, with discarded held apart from mortality the whole way down. That
 * separation is the page's one non-negotiable rule: a discarded egg never hatched and a
 * mortality is a hatchling that did, and no bar, column, colour or total on this page mixes
 * them. Two of the twelve cards say so in words as well.
 *
 * EVERYTHING COMES FROM THE THREE METRICS CORE ALREADY OWNS. `eggs`, `hatched` and
 * `discarded` are real flow series asserted at 142 / 96 / 13 for the month in
 * `core/checks.ts`; the nurseries, the thirteen incubators, the species and the vocabularies
 * are all registry entries. `eggsData.ts` adds only what nothing models — whether a hatchling
 * lived, and which species hatched here for the first time.
 *
 * TWO CLOCKS, STATED EVERY TIME THEY MEET. An egg is counted on the day it was set and a
 * hatchling on the day it hatched, and core says why in a comment on the metric itself: a
 * clutch set in July may hatch in August. So hatch percentage is a rate between two window
 * flows rather than the fate of one clutch, it is never computed at day grain — where the
 * authored series legitimately invert on 914 site-days out of 13,152 — and the trend draws
 * the two series SIDE BY SIDE rather than one stacked inside the other.
 *
 * SCOPE IS ABSOLUTE. Window and site come from the global header; the nursery is this page's
 * own. Every card reads the scoped set.
 *
 * THE DRILL IS THE SHEET. Nursery → Incubator → Species → Record, by swapping the content of
 * the one sheet the product has. Nothing here opens a page.
 */

import { useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  Egg as EggIcon,
  EggOff,
  Filter,
  HeartPulse,
  Layers,
  MapPin,
  PawPrint,
  Percent,
  Search,
  Sparkles,
  Thermometer,
  X,
} from 'lucide-react'
import { buckets, shortDate } from '../../core/calendar'
import { usePeriod } from '../../exec/period'
import {
  ACCENT_INK,
  FAINT,
  Figure,
  HAIR,
  HERO_INK,
  INK,
  MUTED,
  Rule,
  Section,
  Stack,
  TONE,
  TRACK,
  VALUE,
  fmt,
  mix,
  useAccent,
} from '../../exec/system'
import { Lifecycle, RankList, strip } from '../../exec/marks'
import { RangeTabs, useChartRange } from '../../exec/range'
import { DrillList, DrillRow, useSheet, useSite } from './kit'
import {
  FIRST_HATCHES,
  NURSERIES,
  byIncubator,
  bySpecies,
  eggCut,
  firstHatchesIn,
  hatchRate,
  pct,
  recordStatus,
  recordTone,
  survivalRate,
  totalsOf,
  type EggRecord,
  type Group,
  type Totals,
} from './eggsData'
import {
  FirstHatchBody,
  IncubatorBody,
  NurseryBody,
  RecordBody,
  RecordList,
  SpeciesBody,
  StageBody,
} from './eggsSheets'

export default function Eggs() {
  const { period, cut } = usePeriod()
  const { site } = useSite()
  const { open } = useSheet()

  const [nurseryId, setNurseryId] = useState<string | null>(null)
  const [speciesName, setSpeciesName] = useState<string | null>(null)

  const base = useMemo(() => eggCut(site?.key ?? null, cut), [site, cut])
  const rows = useMemo(
    () =>
      base.rows
        .filter((r) => !nurseryId || r.nursery.id === nurseryId)
        .filter((r) => !speciesName || r.speciesName === speciesName),
    [base, nurseryId, speciesName],
  )

  const t = useMemo(() => totalsOf(rows), [rows])
  const laid = useMemo(() => rows.filter((r) => r.slug === 'eggs'), [rows])
  const hatched = useMemo(() => rows.filter((r) => r.slug === 'hatched'), [rows])
  const discarded = useMemo(() => rows.filter((r) => r.slug === 'discarded'), [rows])
  const survived = useMemo(() => hatched.filter((r) => r.survived), [hatched])
  const lost = useMemo(() => hatched.filter((r) => !r.survived), [hatched])

  const nurseries = useMemo(
    () => (nurseryId ? base.nurseries.filter((n) => n.key === nurseryId) : base.nurseries),
    [base, nurseryId],
  )
  const incubators = useMemo(() => byIncubator(rows), [rows])
  const species = useMemo(() => bySpecies(rows), [rows])
  const reasons = useMemo(() => tallyDetail(discarded), [discarded])
  const debuts = useMemo(() => firstHatchesIn(cut, site?.key ?? null), [cut, site])

  const nurseryName = nurseryId ? (NURSERIES.find((n) => n.id === nurseryId)?.name ?? null) : null
  const scope = [site?.name ?? 'Overall', nurseryName, speciesName].filter(Boolean).join(' · ')

  const stage = (rows: EggRecord[], title: string, note: string) => () =>
    open({ title, eyebrow: scope, body: <StageBody rows={rows} note={note} /> })

  return (
    <>
      <div className="w-full px-[var(--gutter)] pb-3">
        <Controls
          nurseryId={nurseryId}
          speciesName={speciesName}
          nurseries={base.nurseries}
          onNursery={setNurseryId}
          onClearSpecies={() => setSpeciesName(null)}
          onSearch={() => open({ title: 'Search', eyebrow: 'Eggs', body: <SearchBody rows={base.rows} /> })}
          onFilter={() =>
            open({
              title: 'Filters',
              eyebrow: 'Eggs',
              body: (
                <FilterBody
                  nurseries={base.nurseries}
                  species={base.species}
                  nurseryId={nurseryId}
                  speciesName={speciesName}
                  onNursery={setNurseryId}
                  onSpecies={setSpeciesName}
                />
              ),
            })
          }
        />
      </div>
      <EggHero totals={t} window={period.window} onStage={stage} rows={{ laid, hatched, discarded, survived, lost }} />

      <Stack>
        {/* The lifecycle, as one shape. Discard hangs off the eggs set, never off the
            hatchlings — that is the whole reason this card exists. Both this and the paired
            trend below read their own range: a hatch is weeks downstream of the set that
            produced it, so a day-wide window shows a conversion between two unrelated
            cohorts. Widening the range is what makes the funnel mean anything. */}
        <OutcomeCard siteKey={site?.key ?? null} nurseryId={nurseryId} speciesName={speciesName} scope={scope} />

        {/* Set against hatched, period by period. Two bars, not one inside the other. */}
        <PairedCard
          siteKey={site?.key ?? null}
          nurseryId={nurseryId}
          speciesName={speciesName}
          onOpen={open}
        />

        {/* One rate, one axis, a toggle for the dimension. */}
        <Section
          icon={Percent}
          label="Hatch percentage"
          aside={hatchRate(t) === null ? period.window : `${Math.round(hatchRate(t)!)}% overall`}
        >
          <RateCompare
            nurseries={nurseries}
            species={species}
            overall={hatchRate(t)}
            onNursery={(g) => open({ title: g.label, eyebrow: 'Nursery', body: <NurseryBody rows={g.rows} name={g.label} /> })}
            onSpecies={(g) => open({ title: g.label, eyebrow: 'Species', body: <SpeciesBody rows={g.rows} /> })}
          />
        </Section>

        {/* Nursery is one per site in this collection, so the card says both rather than
            printing the same split twice under two headings. */}
        <Section icon={MapPin} label="Nursery-wise eggs" aside={`${nurseries.length}`}>
          <NurseryTable
            rows={nurseries}
            onOpen={(g) => open({ title: g.label, eyebrow: 'Nursery', body: <NurseryBody rows={g.rows} name={g.label} /> })}
          />
          <p className="mt-3.5 border-t pt-3 text-caption" style={{ borderColor: HAIR, color: FAINT }}>
            Each site runs one nursery, so this is also the site split. The unit below it — the
            incubator — is where the collection's thirteen trays actually differ.
          </p>
        </Section>
        <Section icon={Thermometer} label="Incubator-wise eggs" aside={`${incubators.length}`}>
          <NurseryTable
            rows={incubators}
            onOpen={(g) => open({ title: g.label, eyebrow: 'Incubator', body: <IncubatorBody rows={g.rows} /> })}
          />
        </Section>
        <Section icon={Layers} label="Species-wise eggs" aside={`${species.length}`}>
          <SpeciesList
            groups={species}
            onOpen={(g) => open({ title: g.label, eyebrow: 'Species', body: <SpeciesBody rows={g.rows} /> })}
          />
        </Section>

        {/* Survival sits apart from discard, and says so. */}
        <Section icon={HeartPulse} label="Survival & mortality" aside={`${t.hatched} hatched`}>
          {t.hatched === 0 ? (
            <Nil>Nothing hatched in this window</Nil>
          ) : (
            <SurvivalSplit totals={t} onStage={stage} rows={{ survived, lost }} />
          )}
        </Section>
        <Section icon={EggOff} label="Egg discard" aside={`${t.discarded} of ${t.laid} set`}>
          {t.discarded === 0 ? (
            <Nil>Nothing discarded in this window</Nil>
          ) : (
            <>
              <DrillList>
                {reasons.map((r) => (
                  <DrillRow
                    key={r.label}
                    label={r.label}
                    sub={`${Math.round(pct(r.value, t.discarded))}% of discards`}
                    value={String(r.value)}
                    onOpen={stage(
                      discarded.filter((d) => d.detail === r.label),
                      r.label,
                      `${r.value} eggs discarded for this reason. A discarded egg never hatched — it is not counted as mortality.`,
                    )}
                  />
                ))}
              </DrillList>
              <Rule label="By nursery" />
              <DrillList>
                {nurseries
                  .filter((n) => n.discarded > 0)
                  .map((n) => (
                    <DrillRow
                      key={n.key}
                      label={n.label}
                      sub={`${n.laid} set · ${Math.round(pct(n.discarded, n.laid))}% discarded`}
                      value={String(n.discarded)}
                      onOpen={() =>
                        open({ title: n.label, eyebrow: 'Nursery', body: <NurseryBody rows={n.rows} name={n.label} /> })
                      }
                    />
                  ))}
              </DrillList>
              <p className="mt-3.5 border-t pt-3 text-caption" style={{ borderColor: HAIR, color: FAINT }}>
                Eggs removed before hatching. Never counted as mortality — mortality is a hatchling
                that hatched alive and died, and it is in the card above.
              </p>
            </>
          )}
        </Section>

        {/* The milestone card. Computed over the whole ledger; the window only decides which
            of them are shown, and when it shows none the card says so rather than going blank. */}
        <Section
          icon={PawPrint}
          label="First hatch on record"
          aside={debuts.length ? `${debuts.length} in window` : `${FIRST_HATCHES.length} on record`}
        >
          <Debuts inWindow={debuts} all={FIRST_HATCHES} onOpen={(name) => {
            const forSpecies = base.rows.filter((r) => r.speciesName === name)
            open({ title: name, eyebrow: 'First hatch on record', body: <FirstHatchBody rows={forSpecies} speciesName={name} /> })
          }} />
        </Section>
        <Records rows={rows} />
      </Stack>
    </>
  )
}

/* ── chrome ──────────────────────────────────────────────────────────────── */

function Nil({ children }: { children: ReactNode }) {
  return (
    <p className="py-5 text-center text-caption" style={{ color: FAINT }}>
      {children}
    </p>
  )
}

const tallyDetail = (rows: EggRecord[]) => {
  const by = new Map<string, number>()
  for (const r of rows) by.set(r.detail, (by.get(r.detail) ?? 0) + 1)
  return [...by.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

/** One row. Window and site belong to the shared header; the nursery is this page's own. */
function Controls({
  nurseryId,
  speciesName,
  nurseries,
  onNursery,
  onSearch,
  onFilter,
  onClearSpecies,
}: {
  nurseryId: string | null
  speciesName: string | null
  nurseries: Group[]
  onNursery: (id: string | null) => void
  onSearch: () => void
  onFilter: () => void
  onClearSpecies: () => void
}) {
  const accent = useAccent()
  const [openMenu, setOpenMenu] = useState(false)
  const name = nurseryId ? (NURSERIES.find((n) => n.id === nurseryId)?.name ?? 'Nursery') : 'All nurseries'

  return (
    <div className="relative flex items-center gap-2 rounded-[var(--radius-card)] bg-white px-[var(--pad-card-sm)] py-2.5">
      <button
        type="button"
        onClick={() => setOpenMenu((v) => !v)}
        aria-expanded={openMenu}
        aria-label="Nursery filter"
        className="card-press flex min-w-0 items-center gap-1.5 rounded-full px-3 py-[6px] text-caption font-medium"
        style={{ backgroundColor: nurseryId ? mix(accent, 0.13) : TRACK, color: nurseryId ? ACCENT_INK : MUTED }}
      >
        <span className="truncate">{name}</span>
        <span aria-hidden>▾</span>
      </button>
      {/* A scope the reader cannot see is a scope they will misread a figure against.
          The nursery has its own chip; the species needs one too, and a way off. */}
      {speciesName && (
        <span
          className="flex shrink-0 items-center gap-1 rounded-full py-[6px] pr-1.5 pl-3 text-caption font-medium whitespace-nowrap"
          style={{ backgroundColor: mix(accent, 0.13), color: ACCENT_INK }}
        >
          <span className="max-w-[120px] truncate">{speciesName}</span>
          <button
            type="button"
            onClick={onClearSpecies}
            aria-label={`Clear ${speciesName}`}
            className="grid size-[18px] place-items-center rounded-full transition-colors active:bg-white/70"
          >
            <X size={11} strokeWidth={2.5} aria-hidden />
          </button>
        </span>
      )}

      <span className="min-w-0 flex-1" />
      <button
        type="button"
        onClick={onSearch}
        aria-label="Search egg records"
        className="grid size-8 shrink-0 place-items-center rounded-full transition-colors active:bg-[#f2f1ed]"
      >
        <Search size={16} strokeWidth={2} style={{ color: MUTED }} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onFilter}
        aria-label="Filters"
        className="relative grid size-8 shrink-0 place-items-center rounded-full transition-colors active:bg-[#f2f1ed]"
      >
        <Filter size={15} strokeWidth={2} style={{ color: nurseryId || speciesName ? ACCENT_INK : MUTED }} aria-hidden />
        {(nurseryId || speciesName) && (
          <span className="absolute -top-[1px] -right-[1px] size-[8px] rounded-full" style={{ backgroundColor: accent }} />
        )}
      </button>

      {openMenu && (
        <div className="animate-drop-in absolute top-full left-[var(--pad-card-sm)] z-30 mt-1 w-[min(80vw,280px)] rounded-[14px] bg-white p-2.5 shadow-[0_10px_30px_rgba(28,26,22,0.18)] ring-1 ring-[#1c1a16]/[0.06]">
          <MenuRow label="All nurseries" on={!nurseryId} onClick={() => { onNursery(null); setOpenMenu(false) }} />
          {nurseries.map((n) => (
            <MenuRow
              key={n.key}
              label={n.label}
              sub={String(n.laid)}
              on={nurseryId === n.key}
              onClick={() => { onNursery(n.key); setOpenMenu(false) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MenuRow({ label, sub, on, onClick }: { label: string; sub?: string; on: boolean; onClick: () => void }) {
  const accent = useAccent()
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-baseline gap-2 rounded-[9px] px-2.5 py-2 text-left"
      style={{ backgroundColor: on ? mix(accent, 0.12) : 'transparent' }}
    >
      <span className="min-w-0 flex-1 truncate text-small" style={{ color: on ? ACCENT_INK : INK, fontWeight: on ? 600 : 400 }}>
        {label}
      </span>
      {sub && <span className="shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>{sub}</span>}
    </button>
  )
}

/* ── hero ────────────────────────────────────────────────────────────────── */

interface Sets {
  laid: EggRecord[]
  hatched: EggRecord[]
  discarded: EggRecord[]
  survived: EggRecord[]
  lost: EggRecord[]
}

type Stage = (rows: EggRecord[], title: string, note: string) => () => void

function EggHero({
  totals: t,
  window: win,
  rows,
  onStage,
}: {
  totals: Totals
  window: string
  rows: Sets
  onStage: Stage
}) {
  const hatch = hatchRate(t)
  const cell = (label: string, value: string, tone?: string, onClick?: () => void) => (
    <button
      key={label}
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className="card-press min-w-0 flex-1 text-left disabled:cursor-default"
    >
      <Figure value={value} size={24} color={tone ?? VALUE} />
      <span className="mt-0.5 block truncate text-caption" style={{ color: MUTED }}>{label}</span>
    </button>
  )

  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={fmt(t.laid)} size={64} color={HERO_INK} />
        <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
          <EggIcon size={15} strokeWidth={1.75} style={{ color: '#2f9e5b' }} aria-hidden />
          Eggs set
        </p>
        <p className="mt-3 flex items-center gap-2">
          <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE.good }} aria-hidden />
          <span className="text-small font-medium" style={{ color: TONE.good }}>
            {t.hatched} hatched · {win}
          </span>
        </p>
        <div className="mt-5 flex items-stretch gap-3 border-t pt-4" style={{ borderColor: HAIR }}>
          {cell('Hatched', fmt(t.hatched), TONE.good, onStage(rows.hatched, 'Hatched', `${t.hatched} hatchings recorded in this window.`))}
          {cell('Hatch %', hatch === null ? '—' : `${Math.round(hatch)}%`)}
          {cell('Discarded', fmt(t.discarded), t.discarded ? TONE.warn : undefined, onStage(rows.discarded, 'Discarded', `${t.discarded} eggs removed before hatching. Not mortality.`))}
        </div>
        <div className="mt-4 flex items-stretch gap-3 border-t pt-4" style={{ borderColor: HAIR }}>
          {cell('Survived', fmt(t.survived), TONE.good, onStage(rows.survived, 'Survived', `${t.survived} of ${t.hatched} hatchlings are alive as of today.`))}
          {cell('Mortality', fmt(t.mortality), t.mortality ? TONE.bad : undefined, onStage(rows.lost, 'Mortality', `${t.mortality} hatchlings hatched alive and died. Discarded eggs are not counted here.`))}
          {cell('Nurseries', String(NURSERIES.length))}
        </div>
      </section>
    </div>
  )
}

/* ── the lifecycle ───────────────────────────────────────────────────────── */

/**
 * One read of the egg ledger for a card's own range, under the page's nursery and species.
 *
 * The two cards below each hold a range, and each needs the same four narrowings applied to
 * whatever span it is showing. Doing it here keeps the two cards honest with each other and
 * with the page: change the nursery in the toolbar and both recut, change a card's range and
 * only that card moves.
 */
function useEggRange(siteKey: string | null, nurseryId: string | null, speciesName: string | null) {
  const range = useChartRange()
  const rows = useMemo(() => {
    return eggCut(siteKey, range.win)
      .rows.filter((r) => !nurseryId || r.nursery.id === nurseryId)
      .filter((r) => !speciesName || r.speciesName === speciesName)
  }, [siteKey, range.win, nurseryId, speciesName])

  const laid = useMemo(() => rows.filter((r) => r.slug === 'eggs'), [rows])
  const hatched = useMemo(() => rows.filter((r) => r.slug === 'hatched'), [rows])
  const discarded = useMemo(() => rows.filter((r) => r.slug === 'discarded'), [rows])
  const survived = useMemo(() => hatched.filter((r) => r.survived), [hatched])
  const lost = useMemo(() => hatched.filter((r) => !r.survived), [hatched])

  return { range, rows, totals: totalsOf(rows), sets: { laid, hatched, discarded, survived, lost } }
}

/** §2 — the funnel, over its own span. */
function OutcomeCard({
  siteKey,
  nurseryId,
  speciesName,
  scope,
}: {
  siteKey: string | null
  nurseryId: string | null
  speciesName: string | null
  scope: string
}) {
  const { open } = useSheet()
  const { range, totals: t, sets } = useEggRange(siteKey, nurseryId, speciesName)

  const stage = (rows: EggRecord[], title: string, note: string) => () =>
    open({ title, eyebrow: scope, body: <StageBody rows={rows} note={note} /> })

  return (
    <Section icon={Activity} label="Egg outcome" aside={range.win.window}>
      <RangeTabs range={range} />
      {t.laid === 0 && t.hatched === 0 ? (
        <Nil>No egg activity in {range.win.window}</Nil>
      ) : (
        <EggLifecycle totals={t} onStage={stage} rows={sets} />
      )}
    </Section>
  )
}

/** §3 — set against hatched, bucketed over its own span. */
function PairedCard({
  siteKey,
  nurseryId,
  speciesName,
  onOpen,
}: {
  siteKey: string | null
  nurseryId: string | null
  speciesName: string | null
  onOpen: (s: { title: string; eyebrow: string; body: ReactNode }) => void
}) {
  const { range, totals: t, sets } = useEggRange(siteKey, nurseryId, speciesName)

  /* Paired series per period: what was set, and what hatched. Never stacked — see the
     header. `buckets` is the shared splitter, so the grain matches every other trend. */
  const trend = useMemo(() => {
    const win = range.win
    return buckets(win, win.days <= 31 ? win.days : 24).map((b) => {
      const inBucket = (r: EggRecord) => r.day >= b.from && r.day <= b.to
      return {
        ...b,
        laid: sets.laid.filter(inBucket),
        hatched: sets.hatched.filter(inBucket),
        discarded: sets.discarded.filter(inBucket),
      }
    })
  }, [range.win, sets])

  return (
    <Section icon={EggIcon} label="Set and hatched" aside={range.win.window}>
      <RangeTabs range={range} />
      {t.laid === 0 ? (
        <Nil>Nothing set in {range.win.window}</Nil>
      ) : (
        <PairedTrend
          trend={trend}
          onOpen={(b) =>
            onOpen({
              title: `${shortDate(b.from)} – ${shortDate(b.to)}`,
              eyebrow: 'Egg activity',
              body: (
                <StageBody
                  rows={[...b.laid, ...b.hatched, ...b.discarded]}
                  note={`Everything recorded between ${shortDate(b.from)} and ${shortDate(b.to)}.`}
                />
              ),
            })
          }
        />
      )}
    </Section>
  )
}

/**
 * THE LIFECYCLE, AS A FUNNEL — and the two losses that hang off it, as rows.
 *
 * This card was five indented progress bars, which is the shape that hid the only thing it
 * exists to say. Set, hatched and survived are a real chain — each a subset of the one above —
 * and a funnel is the mark for that: the taper IS the conversion, and the percentage beside
 * each stage names it.
 *
 * DISCARD AND MORTALITY ARE NOT STAGES OF THAT CHAIN, and drawing them as two more bars in the
 * same list is exactly how a reader comes to believe a discarded egg is a dead hatchling. They
 * sit under their own rule, each stating the base it is a share OF — discard off the eggs set,
 * mortality off the hatchlings — which is the distinction the note at the bottom of the card
 * spells out.
 */
function EggLifecycle({ totals: t, rows, onStage }: { totals: Totals; rows: Sets; onStage: Stage }) {
  const surv = survivalRate(t)
  const hatch = hatchRate(t)

  return (
    <>
      <Lifecycle
        stages={[
          {
            key: 'laid',
            label: 'Eggs set',
            value: t.laid,
            meta: 'by set date',
            onPick: onStage(rows.laid, 'Eggs set', `${t.laid} eggs set down in this window.`),
          },
          {
            key: 'hatched',
            label: 'Hatched',
            value: t.hatched,
            meta: hatch === null ? 'by hatch date' : `${Math.round(hatch)}% hatch rate`,
            onPick: onStage(rows.hatched, 'Hatched', `${t.hatched} hatchings recorded in this window.`),
          },
          {
            key: 'survived',
            label: 'Survived',
            value: t.survived,
            meta: surv === null ? 'of hatched' : `${Math.round(surv)}% of hatched`,
            onPick: onStage(rows.survived, 'Survived', `${t.survived} of ${t.hatched} hatchlings alive as of today.`),
          },
        ]}
      />
      <Rule label="Losses, and what each is a share of" />
      <RankList
        rank={false}
        showShare={false}
        items={[
          {
            key: 'discarded',
            title: 'Discarded',
            meta: t.laid === 0 ? 'of eggs set' : `${Math.round(pct(t.discarded, t.laid))}% of the eggs set`,
            value: fmt(t.discarded),
            share: t.laid === 0 ? 0 : pct(t.discarded, t.laid),
            onPick: onStage(rows.discarded, 'Discarded', `${t.discarded} eggs removed before hatching. Not mortality.`),
          },
          {
            key: 'mortality',
            title: 'Mortality',
            meta: surv === null ? 'of hatched' : `${100 - Math.round(surv)}% of the hatchlings`,
            value: fmt(t.mortality),
            share: surv === null ? 0 : 100 - surv,
            onPick: onStage(rows.lost, 'Mortality', `${t.mortality} hatchlings hatched alive and died.`),
          },
        ]}
      />
      <p className="mt-4 border-t pt-3 text-caption" style={{ borderColor: HAIR, color: FAINT }}>
        Discard hangs off the eggs set, not off the hatchlings: an egg that was thrown away never
        hatched, so it is never mortality. Set and hatched are counted on their own dates — a clutch
        set in one month may hatch in the next — so hatch percentage is a rate between two flows.
      </p>
    </>
  )
}

/* ── paired trend ────────────────────────────────────────────────────────── */

interface Bucket {
  from: number
  to: number
  laid: EggRecord[]
  hatched: EggRecord[]
  discarded: EggRecord[]
}

/**
 * Set and hatched, side by side per period.
 *
 * NOT STACKED, and that is a data constraint rather than a taste. The two series are counted
 * on different dates, so on a given day hatchings can exceed the eggs set — it happens on 914
 * site-days in the ledger. A stacked column would draw a segment taller than its own total.
 */
function PairedTrend({ trend, onOpen }: { trend: Bucket[]; onOpen: (b: Bucket) => void }) {
  const accent = useAccent()
  const max = Math.max(...trend.flatMap((b) => [b.laid.length, b.hatched.length]), 1)
  const stride = Math.max(1, Math.ceil(trend.length / 5))
  /* Capped and centred by the shared strip, in place of a local `maxWidth: 72` that held the
     columns to a sane size but left them stranded against the left edge of the card. */
  const bars = strip(trend.length)

  return (
    <div>
      <div className="flex h-[112px] items-end gap-[3px]" style={bars}>
        {trend.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(b)}
            title={`${shortDate(b.from)} – ${shortDate(b.to)} · ${b.laid.length} set · ${b.hatched.length} hatched · ${b.discarded.length} discarded`}
            className="flex min-w-[8px] flex-1 items-end justify-center gap-[2px] transition-transform active:scale-95"
          >
            <span className="w-1/2 rounded-t-[2px]" style={{ height: `${Math.max(2, (b.laid.length / max) * 96)}px`, backgroundColor: mix(accent, 0.32) }} />
            <span className="w-1/2 rounded-t-[2px]" style={{ height: `${Math.max(2, (b.hatched.length / max) * 96)}px`, backgroundColor: accent }} />
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px]" style={bars}>
        {trend.map((b, i) => (
          <span key={i} className="min-w-[8px] flex-1 text-center text-tick whitespace-nowrap tabular-nums" style={{ color: FAINT }}>
            {i % stride === 0 ? shortDate(b.to) : ''}
          </span>
        ))}
      </div>
      <ul className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption" style={{ color: MUTED }}>
        <li className="flex items-center gap-1.5"><span className="size-[8px] rounded-[2px]" style={{ backgroundColor: mix(accent, 0.32) }} aria-hidden />Eggs set</li>
        <li className="flex items-center gap-1.5"><span className="size-[8px] rounded-[2px]" style={{ backgroundColor: accent }} aria-hidden />Hatched</li>
        <li style={{ color: FAINT }}>Two clocks — a clutch set here may hatch in a later column</li>
      </ul>
    </div>
  )
}

/* ── hatch rate comparison ───────────────────────────────────────────────── */

function RateCompare({
  nurseries,
  species,
  overall,
  onNursery,
  onSpecies,
}: {
  nurseries: Group[]
  species: Group[]
  overall: number | null
  onNursery: (g: Group) => void
  onSpecies: (g: Group) => void
}) {
  const accent = useAccent()
  const [dim, setDim] = useState<'nursery' | 'species'>('nursery')
  const source = dim === 'nursery' ? nurseries : species
  const rows = useMemo(
    () => source.filter((g) => g.hatchPct !== null).sort((a, b) => (b.hatchPct ?? 0) - (a.hatchPct ?? 0)).slice(0, 12),
    [source],
  )

  return (
    <div>
      <div className="mb-3.5 flex gap-1.5">
        {(['nursery', 'species'] as const).map((d) => {
          const on = d === dim
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDim(d)}
              aria-pressed={on}
              className="rounded-full px-3 py-[5px] text-caption capitalize transition-colors active:scale-95"
              style={{ backgroundColor: on ? mix(accent, 0.13) : TRACK, color: on ? ACCENT_INK : MUTED, fontWeight: on ? 600 : 400 }}
            >
              {d === 'nursery' ? 'Nurseries' : 'Species'}
            </button>
          )
        })}
      </div>
      {rows.length === 0 ? (
        <Nil>Nothing with {8} or more eggs set in this window</Nil>
      ) : (
        <ul className="flex flex-col">
          {rows.map((g) => (
            <li key={g.key}>
              <button
                type="button"
                onClick={() => (dim === 'nursery' ? onNursery(g) : onSpecies(g))}
                className="card-press flex w-full items-center gap-3 py-2 text-left"
              >
                <span className="w-[38%] min-w-0 shrink-0">
                  <span className="block truncate text-small" style={{ color: INK }}>{g.label}</span>
                  <span className="mt-0.5 block truncate text-caption tabular-nums" style={{ color: FAINT }}>
                    {g.hatched} of {g.laid} set
                  </span>
                </span>
                <span className="relative h-[18px] min-w-0 flex-1">
                  <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ backgroundColor: TRACK }} aria-hidden />
                  {overall !== null && (
                    <span className="absolute inset-y-[1px] w-px" style={{ left: `${Math.min(100, overall)}%`, backgroundColor: '#c9c6bf' }} aria-hidden />
                  )}
                  <span className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full" style={{ width: `${Math.min(100, g.hatchPct ?? 0)}%`, backgroundColor: mix(accent, 0.32) }} aria-hidden />
                  <span className="absolute top-1/2 size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${Math.min(100, g.hatchPct ?? 0)}%`, backgroundColor: accent }} aria-hidden />
                </span>
                <span className="w-[42px] shrink-0 text-right text-small font-medium tabular-nums" style={{ color: VALUE }}>
                  {Math.round(g.hatchPct ?? 0)}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2.5 border-t pt-2.5 text-caption" style={{ borderColor: HAIR, color: FAINT }}>
        Hatchings ÷ eggs set × 100, both over this window.
        {overall !== null && ` The line marks the overall ${Math.round(overall)}%.`} Rows under eight
        eggs set show no rate — a rate off three eggs is a sample, not a rate.
      </p>
    </div>
  )
}

/* ── the sortable table, shared by nurseries and incubators ──────────────── */

type ColKey = 'laid' | 'hatched' | 'discarded' | 'survived' | 'mortality' | 'hatchPct'

const COLUMNS: { key: ColKey; head: string }[] = [
  { key: 'laid', head: 'Set' },
  { key: 'hatched', head: 'Hatched' },
  { key: 'survived', head: 'Survived' },
  { key: 'mortality', head: 'Mortality' },
  { key: 'discarded', head: 'Discarded' },
  { key: 'hatchPct', head: 'Hatch %' },
]

function NurseryTable({ rows, onOpen }: { rows: Group[]; onOpen: (g: Group) => void }) {
  const accent = useAccent()
  const [sort, setSort] = useState<ColKey>('laid')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const sign = dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => {
      if (sort === 'hatchPct') {
        if (a.hatchPct === null && b.hatchPct === null) return a.label.localeCompare(b.label)
        if (a.hatchPct === null) return 1
        if (b.hatchPct === null) return -1
        return sign * (a.hatchPct - b.hatchPct)
      }
      return sign * (a[sort] - b[sort]) || a.label.localeCompare(b.label)
    })
  }, [rows, sort, dir])

  const flip = (k: ColKey) => {
    if (k === sort) setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSort(k); setDir('desc') }
  }

  if (rows.length === 0) return <Nil>Nothing in scope</Nil>

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 @[620px]:hidden">
        <span className="mr-1 text-overline font-medium uppercase" style={{ color: FAINT }}>Sort</span>
        {COLUMNS.map((c) => {
          const on = c.key === sort
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => flip(c.key)}
              aria-pressed={on}
              className="flex items-center gap-1 rounded-full px-3 py-[5px] text-caption transition-colors active:scale-95"
              style={{ backgroundColor: on ? mix(accent, 0.13) : TRACK, color: on ? ACCENT_INK : MUTED, fontWeight: on ? 600 : 400 }}
            >
              {c.head}
              {on && <span aria-hidden>{dir === 'desc' ? '↓' : '↑'}</span>}
            </button>
          )
        })}
      </div>
      <div className="@[620px]:hidden">
        <DrillList>
          {sorted.map((g) => (
            <DrillRow
              key={g.key}
              label={g.label}
              sub={`${g.hatched} hatched · ${g.survived} survived · ${g.mortality} mortality · ${g.discarded} discarded`}
              value={String(g.laid)}
              onOpen={() => onOpen(g)}
            />
          ))}
        </DrillList>
      </div>
      <div className="-mx-1 hidden overflow-x-auto px-1 @[620px]:block">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              <th className="w-[26%] pb-2 text-left">
                <span className="text-overline font-medium uppercase" style={{ color: FAINT }}>Name</span>
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="pb-2 pl-3 text-right">
                  <button
                    type="button"
                    onClick={() => flip(c.key)}
                    className="inline-flex flex-row-reverse items-center gap-1 text-overline font-medium whitespace-nowrap uppercase"
                    style={{ color: c.key === sort ? ACCENT_INK : FAINT }}
                  >
                    {c.head}
                    <span aria-hidden style={{ opacity: c.key === sort ? 1 : 0 }}>{dir === 'desc' ? '↓' : '↑'}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <tr key={g.key} onClick={() => onOpen(g)} className="cursor-pointer border-t border-[#f0efec] transition-colors hover:bg-[#f7f9f7]">
                <td className="py-2.5 pr-2">
                  <span className="block text-small" style={{ color: INK }}>{g.label}</span>
                  <span className="mt-0.5 block text-caption" style={{ color: FAINT }}>{g.sub}</span>
                </td>
                {COLUMNS.map((c) => {
                  const raw = c.key === 'hatchPct' ? g.hatchPct : g[c.key]
                  const text = c.key === 'hatchPct' ? (raw === null ? '—' : `${Math.round(raw as number)}%`) : fmt(raw as number)
                  const colour =
                    c.key === 'mortality' && g.mortality > 0 ? TONE.bad
                    : c.key === 'discarded' && g.discarded > 0 ? TONE.warn
                    : raw === 0 || raw === null ? '#c2beb6'
                    : VALUE
                  return (
                    <td key={c.key} className="py-2.5 pl-3 text-right text-small font-medium tabular-nums whitespace-nowrap" style={{ color: colour }}>
                      {text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── species list ────────────────────────────────────────────────────────── */

const SPECIES_PAGE = 12

function SpeciesList({ groups, onOpen }: { groups: Group[]; onOpen: (g: Group) => void }) {
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(SPECIES_PAGE)

  const matched = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? groups.filter((g) => g.label.toLowerCase().includes(needle)) : groups
  }, [groups, q])

  const page = matched.slice(0, shown)
  if (groups.length === 0) return <Nil>No species in this window</Nil>

  return (
    <div>
      <div className="relative">
        <Search size={14} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" style={{ color: FAINT }} aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setShown(SPECIES_PAGE) }}
          placeholder="Search species"
          aria-label="Search species"
          className="w-full rounded-[10px] py-2 pr-3 pl-8 text-small outline-none focus:ring-2 focus:ring-[#37bd69]/35 [&::-webkit-search-cancel-button]:hidden"
          style={{ backgroundColor: TRACK, color: INK }}
        />
      </div>
      <p className="mt-2.5 text-caption tabular-nums" style={{ color: FAINT }}>
        {q.trim() ? `${matched.length} of ${groups.length} matching` : `${groups.length} species with egg records`}
      </p>
      {page.length === 0 ? (
        <Nil>No match for “{q.trim()}”</Nil>
      ) : (
        <DrillList>
          {page.map((g) => (
            <DrillRow
              key={g.key}
              label={g.label}
              sub={`${g.hatched} hatched${g.hatchPct === null ? '' : ` · ${Math.round(g.hatchPct)}%`} · ${g.mortality} mortality · ${g.discarded} discarded`}
              value={String(g.laid)}
              onOpen={() => onOpen(g)}
            />
          ))}
        </DrillList>
      )}
      {shown < matched.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + SPECIES_PAGE)}
          className="mt-3 w-full rounded-full py-2 text-body font-medium"
          style={{ backgroundColor: TRACK, color: ACCENT_INK }}
        >
          Show {Math.min(SPECIES_PAGE, matched.length - shown)} more · {matched.length - shown} remaining
        </button>
      )}
    </div>
  )
}

/* ── survival ────────────────────────────────────────────────────────────── */

function SurvivalSplit({
  totals: t,
  rows,
  onStage,
}: {
  totals: Totals
  rows: Pick<Sets, 'survived' | 'lost'>
  onStage: Stage
}) {
  const surv = survivalRate(t)
  return (
    <>
      <div className="flex items-stretch">
        <button type="button" onClick={onStage(rows.survived, 'Survived', `${t.survived} of ${t.hatched} hatchlings alive as of today.`)} className="card-press min-w-0 flex-1 pr-4 text-left">
          <Figure value={fmt(t.survived)} size={32} color={TONE.good} />
          <span className="mt-1 block text-small" style={{ color: MUTED }}>Survived</span>
          <span className="mt-0.5 block text-caption tabular-nums" style={{ color: FAINT }}>{surv === null ? '—' : `${Math.round(surv)}% of hatched`}</span>
        </button>
        <span className="w-px shrink-0" style={{ backgroundColor: HAIR }} aria-hidden />
        <button type="button" onClick={onStage(rows.lost, 'Mortality', `${t.mortality} hatchlings hatched alive and died.`)} className="card-press min-w-0 flex-1 pl-4 text-right">
          <Figure value={fmt(t.mortality)} size={32} color={TONE.bad} />
          <span className="mt-1 block text-small" style={{ color: MUTED }}>Mortality</span>
          <span className="mt-0.5 block text-caption tabular-nums" style={{ color: FAINT }}>{surv === null ? '—' : `${100 - Math.round(surv)}% of hatched`}</span>
        </button>
      </div>
      <div className="mt-4 flex h-[11px] w-full gap-[2px]">
        <span className="h-full rounded-l-full" style={{ width: `${Math.max(2, pct(t.survived, t.hatched))}%`, backgroundColor: TONE.good }} />
        <span className="h-full rounded-r-full" style={{ width: `${Math.max(2, pct(t.mortality, t.hatched))}%`, backgroundColor: TONE.bad }} />
      </div>
      <p className="mt-3.5 border-t pt-3 text-caption" style={{ borderColor: HAIR, color: FAINT }}>
        Read as of today over the hatchlings of this window. Neonatal loss falls inside the first
        three weeks, so a window of recent hatches will show a survival rate that has not finished
        settling. Discarded eggs never appear here.
      </p>
    </>
  )
}

/* ── first hatch on record ───────────────────────────────────────────────── */

function Debuts({
  inWindow,
  all,
  onOpen,
}: {
  inWindow: typeof FIRST_HATCHES
  all: typeof FIRST_HATCHES
  onOpen: (speciesName: string) => void
}) {
  const accent = useAccent()
  const shown = inWindow.length ? inWindow : all.slice(0, 4)

  return (
    <>
      {inWindow.length === 0 && (
        <p className="mb-3 text-caption" style={{ color: FAINT }}>
          No species hatched here for the first time in this window. The most recent on record:
        </p>
      )}
      <ul className="flex flex-col gap-2.5">
        {shown.map((f) => (
          <li key={f.speciesName}>
            <button
              type="button"
              onClick={() => onOpen(f.speciesName)}
              className="card-press flex w-full items-center gap-3 rounded-[12px] border-l-[3px] py-3 pr-3.5 pl-3 text-left"
              style={{ backgroundColor: mix(accent, 0.07), borderColor: accent }}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-overline font-bold uppercase" style={{ color: ACCENT_INK }}>
                  First hatch on record
                </span>
                <span className="mt-1 block truncate text-small font-medium" style={{ color: INK }}>{f.speciesName}</span>
                <span className="mt-1 block truncate text-caption tabular-nums" style={{ color: MUTED }}>
                  {shortDate(f.day)} · {f.nursery.name}
                  {f.incubator ? ` · ${f.incubator.name}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-display block text-n font-bold tabular-nums" style={{ color: VALUE }}>{f.clutch}</span>
                <span className="mt-1 block text-caption whitespace-nowrap" style={{ color: MUTED }}>hatched</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3.5 border-t pt-3 text-caption" style={{ borderColor: HAIR, color: FAINT }}>
        The earliest hatching for each species anywhere in the ledger — computed over the whole
        record, never over the window. Species already hatching when the record opens are excluded,
        because the ledger cannot tell a genuine first from its own starting edge.
      </p>
    </>
  )
}

/* ── records ─────────────────────────────────────────────────────────────── */

type Filter = 'all' | 'eggs' | 'hatched' | 'survived' | 'mortality' | 'discarded'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'eggs', label: 'Set' },
  { id: 'hatched', label: 'Hatched' },
  { id: 'survived', label: 'Survived' },
  { id: 'mortality', label: 'Mortality' },
  { id: 'discarded', label: 'Discarded' },
]

function Records({ rows }: { rows: EggRecord[] }) {
  const accent = useAccent()
  const [filter, setFilter] = useState<Filter>('all')
  const shown = useMemo(() => {
    switch (filter) {
      case 'eggs': return rows.filter((r) => r.slug === 'eggs')
      case 'hatched': return rows.filter((r) => r.slug === 'hatched')
      case 'survived': return rows.filter((r) => r.slug === 'hatched' && r.survived)
      case 'mortality': return rows.filter((r) => r.slug === 'hatched' && !r.survived)
      case 'discarded': return rows.filter((r) => r.slug === 'discarded')
      default: return rows
    }
  }, [rows, filter])

  return (
    <Section icon={Sparkles} label="Egg & hatch records" aside={`${shown.length}`}>
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const on = f.id === filter
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={on}
              className="rounded-full px-3 py-[5px] text-caption transition-colors active:scale-95"
              style={{ backgroundColor: on ? mix(accent, 0.13) : TRACK, color: on ? ACCENT_INK : MUTED, fontWeight: on ? 600 : 400 }}
            >
              {f.label}
            </button>
          )
        })}
      </div>
      <RecordList rows={shown} label="Records" empty="Nothing matches this filter" />
    </Section>
  )
}

/* ── search ──────────────────────────────────────────────────────────────── */

function SearchBody({ rows }: { rows: EggRecord[] }) {
  const { open } = useSheet()
  const [q, setQ] = useState('')
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []
    return rows
      .filter((r) => `${r.id} ${r.speciesName} ${r.detail} ${r.nursery.name} ${r.incubator?.name ?? ''} ${r.siteName} ${r.animalId}`.toLowerCase().includes(needle))
      .slice(0, 60)
  }, [rows, q])

  return (
    <Stack>
      <Section icon={Search} label="Search">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Record ID, species, nursery, incubator or hatchling"
          aria-label="Search egg records"
          className="w-full rounded-[10px] px-3 py-2.5 text-small outline-none focus:ring-2 focus:ring-[#37bd69]/35"
          style={{ backgroundColor: TRACK, color: INK }}
        />
        <p className="mt-2.5 text-caption" style={{ color: FAINT }}>
          {q.trim().length < 2
            ? 'Type two characters or more. Search covers the current window and site scope.'
            : `${hits.length} shown${hits.length === 60 ? ' · narrow the query for the rest' : ''}`}
        </p>
      </Section>
      {hits.length > 0 && (
        <Section icon={EggIcon} label="Matches" aside={`${hits.length}`}>
          <DrillList>
            {hits.map((r) => (
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
        </Section>
      )}
    </Stack>
  )
}

/* ── filters ─────────────────────────────────────────────────────────────── */

/**
 * Nursery and species, both scoping the whole page.
 *
 * The window and the site are global and set from the header pills — this sheet says so
 * rather than offering a second, page-local copy of them that could drift out of step with
 * every other module.
 */
function FilterBody({
  nurseries,
  species,
  nurseryId,
  speciesName,
  onNursery,
  onSpecies,
}: {
  nurseries: Group[]
  species: Group[]
  nurseryId: string | null
  speciesName: string | null
  onNursery: (id: string | null) => void
  onSpecies: (name: string | null) => void
}) {
  return (
    <Stack>
      <Section icon={MapPin} label="Nursery" aside="Rescopes every section">
        <MenuRow label="All nurseries" on={!nurseryId} onClick={() => onNursery(null)} />
        {nurseries.map((n) => (
          <MenuRow key={n.key} label={n.label} sub={String(n.laid)} on={nurseryId === n.key} onClick={() => onNursery(n.key)} />
        ))}
      </Section>
      <Section icon={Layers} label="Species" aside={`${species.length} with records`}>
        <div className="max-h-[320px] overflow-y-auto overscroll-contain scrollbar-hidden">
          <MenuRow label="All species" on={!speciesName} onClick={() => onSpecies(null)} />
          {species.map((g) => (
            <MenuRow key={g.key} label={g.label} sub={String(g.laid)} on={speciesName === g.label} onClick={() => onSpecies(g.label)} />
          ))}
        </div>
      </Section>
      <Section icon={PawPrint} label="Date range and site">
        <p className="text-caption" style={{ color: MUTED }}>
          The window and the site are global — set from the pills in the page header, and applied
          to every module rather than to this page alone.
        </p>
      </Section>
    </Stack>
  )
}
