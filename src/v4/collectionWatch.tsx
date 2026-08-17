/**
 * COLLECTION WATCH — the species altitude the home screen did not have.
 *
 * WHAT THIS REPLACES, AND WHY IT IS NOT THE SAME SHAPE. Upcoming and Risk Indicators stood here:
 * seventeen authored rows naming species and sites the register does not hold. The note in
 * `Home.tsx` gives the full argument for removing them. The question they were asking — what in
 * the collection needs attention — was the right question, and the screen was left unable to
 * answer it: eleven KPIs above, five of them permanently empty, and not one about conservation,
 * breeding capability, or whether anything is disappearing.
 *
 * EVERY FIGURE HERE IS COUNTED FROM THE REGISTER, and every one of them is a LINK into the
 * species list already filtered to the rows behind it. That second half is the point. The list
 * has always been able to take `#/browse/species?lens=At+risk` — `speciesListData.ts` documents
 * the pattern at length and the panel re-seeds itself from the URL — and until now exactly one
 * caller in the product used it. A count you cannot open is a number a director has to ask
 * somebody about.
 *
 * THREE MARKS, NOT A ROW OF TILES. The home already carries eleven label-figure KPI cards, and
 * eight more of the same card is the repeated title/number/bar row this product removes wherever
 * it appears. So the section is built the way `speciesList.tsx`'s own summary band is built,
 * which is the shape this content already has elsewhere:
 *
 *   THE TRAJECTORY   one proportional ribbon — how many species are growing, holding, shrinking.
 *                    Parts of a whole are a bar; as three figures the reader has to subtract.
 *   THE WATCHLIST    ranked rows, biggest first, each a door into the filtered list. This is the
 *                    actionable half and it gets the most room.
 *   THE EXCEPTIONS   the two or three figures a curator would act on today, in coral, and only
 *                    where they are not zero — a coral nought is an alarm about nothing.
 *
 * WHAT IS DELIBERATELY ABSENT. The reference build's dashboard carries ASSESSED 30% and an
 * "Overdue assessment" / "Never assessed" pair. They are not here, because a collection-wide
 * assessment coverage cannot be counted from this extract without walking every species' own
 * assessment history — which is a per-species read the species Assessments tab owns and which
 * would cost more on the home screen than the figure is worth. Stating a coverage figure whose
 * denominator nobody has defined is the thing this product refuses everywhere else.
 *
 * COST, AND WHY THE HOME'S FIRST PAINT IS UNTOUCHED. `speciesRows` is one register walk, roughly
 * 120 ms cold, cached per (site, window) at module scope. It is not called during the home's
 * first render: the section mounts empty and asks for the rows on an idle callback, so the
 * greeting, the total and the KPI grid paint at the speed they always did and this section fills
 * in behind them. Once the species list has been opened the walk is already cached and this is
 * free.
 */

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ShieldAlert } from 'lucide-react'
import { ACCENT, ACCENT_INK, FAINT, HAIR, MUTED, VALUE, fmt, mix } from '../exec/system'
import { Ribbon } from '../exec/marks'
import { useScope } from './scope'
import {
  ANALYSES,
  CRITICAL,
  FACET_PARAM,
  speciesRows,
  type SpeciesListRow,
} from './speciesListData'

/* ── the page's own inks, shared with the species list ───────────────────── */

/** Deaths, and the exceptions. Soft coral, never the alarm red — `speciesList.tsx`'s own. */
const CORAL = '#d4553a'
/** The product's dark green, which passes as type. */
const GREEN = '#1f6b45'

/* ── the derivation ──────────────────────────────────────────────────────── */

/**
 * A watchlist row: what it counts, how many, and the filter that shows them.
 *
 * `lens` is a value of the `analysis` facet rather than a predicate of its own, so the count
 * here and the rows the link opens are decided by the SAME function — `ANALYSES` in
 * `speciesListData.ts`. A second predicate written here would eventually disagree with the one
 * the list filters by, and the failure mode is the worst kind: a link that opens a different
 * number from the one it was labelled with.
 */
export interface WatchRow {
  lens: string
  label: string
  count: number
  /** Coral where the row is an exception rather than an observation. */
  grave?: true
}

export interface Watch {
  species: number
  growing: number
  stable: number
  declining: number
  /** Worse than endangered — the species list's own `CRITICAL` set. */
  critical: number
  /** Animals with no recorded sex, and the share of the collection they are. */
  unsexed: number
  unsexedPct: number
  rows: WatchRow[]
}

/**
 * The lenses the home screen watches, in the order a curator triages them.
 *
 * Not all nine of the list's lenses — "Gaining ground", "Held at one site" and "Across four or
 * more sites" are ways of exploring the collection rather than things that need doing about it,
 * and a watchlist that includes them is a list nobody reads to the end. The three left out are
 * one tap away in the panel this section links into.
 */
const WATCHED: { lens: string; label: string; grave?: true }[] = [
  { lens: 'Three or fewer', label: 'Three or fewer animals left', grave: true },
  { lens: 'At risk', label: 'Threatened on the Red List' },
  { lens: 'Losing ground', label: 'Losing ground this window' },
  { lens: 'Single sex', label: 'Single sex — cannot breed' },
  { lens: 'Wholly unsexed', label: 'Wholly unsexed' },
]

/**
 * TRAJECTORY IS READ OFF THE WINDOW'S OWN FLOWS, and it is honest about what that means.
 *
 * A species is declining if it recorded more deaths than births inside the reporting window,
 * growing on the reverse, and holding when it recorded neither or recorded them equally. That is
 * the same arithmetic the 'Losing ground' and 'Gaining ground' lenses use, so the ribbon and the
 * watchlist row beneath it cannot disagree.
 *
 * IT IS NOT A POPULATION TRAJECTORY, and the label says "recorded" rather than implying one. The
 * extract's events do not fully account for every change in the register — `entity.tsx` makes the
 * same point about the species header — so a species can be flat on births and deaths while its
 * headcount moved through an accession or a transfer. Naming this off the flows is the reading the
 * data supports; inferring a trend from two reconstructed headcounts is not.
 */
export function watchOf(rows: SpeciesListRow[], lensCount: (lens: string) => number): Watch {
  let growing = 0
  let declining = 0
  let critical = 0
  let unsexed = 0
  let animals = 0

  for (const r of rows) {
    animals += r.total
    unsexed += r.undetermined
    if (CRITICAL.has(r.iucn)) critical++
    if (r.births > r.deaths && r.births > 0) growing++
    else if (r.deaths > r.births && r.deaths > 0) declining++
  }

  return {
    species: rows.length,
    growing,
    declining,
    stable: rows.length - growing - declining,
    critical,
    unsexed,
    unsexedPct: animals > 0 ? (unsexed / animals) * 100 : 0,
    rows: WATCHED.map((w) => ({ ...w, count: lensCount(w.lens) })),
  }
}

/* ── the section ─────────────────────────────────────────────────────────── */

/**
 * The rows, fetched off the critical path.
 *
 * `requestIdleCallback` where the browser has it, a macrotask where it does not — Safari still
 * ships neither at the time of writing. Either way the first paint has already happened, which
 * is the whole requirement.
 */
function useDeferredRows(): SpeciesListRow[] | undefined {
  const { scope } = useScope()
  const [rows, setRows] = useState<SpeciesListRow[] | undefined>()

  useEffect(() => {
    let live = true
    const run = () => {
      if (!live) return
      /* Cached per (site, window) inside `speciesListData.ts`, so changing the window costs one
         walk and changing it back costs nothing. */
      setRows(speciesRows(scope))
    }

    /* `requestIdleCallback` is not in Safari at the time of writing, so the timeout is a real
       path rather than a defensive one. `idled` records which was used, because the two take
       different cancel functions and guessing wrong leaks the callback. */
    const idled = typeof window.requestIdleCallback === 'function'
    const handle = idled ? window.requestIdleCallback(run) : window.setTimeout(run, 0)

    return () => {
      live = false
      if (idled) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
    /* Re-read when the scope moves — this section is as scoped as everything above it. */
  }, [scope])

  return rows
}

const CARD = 'rounded-[var(--radius-card)] bg-white'

export function CollectionWatch() {
  const rows = useDeferredRows()

  /* The lens counts come from the same `ANALYSES` predicates the list filters by — see the note
     on `WatchRow`. Counted once here for every watched lens rather than per row. */
  const watch = useMemo(() => {
    if (!rows) return undefined
    const counts = new Map<string, number>()
    for (const w of WATCHED) counts.set(w.lens, 0)
    /* One pass, all five lenses. `analysesOf` is not exported and does not need to be: the row's
       own lens membership is recomputed here from the same table via `lensesOf` below. */
    for (const r of rows) {
      for (const lens of lensesOf(r)) {
        const at = counts.get(lens)
        if (at !== undefined) counts.set(lens, at + 1)
      }
    }
    return watchOf(rows, (lens) => counts.get(lens) ?? 0)
  }, [rows])

  if (!watch || watch.species === 0) return <Skeleton />

  return (
    <div className={`${CARD} p-[var(--pad-card)]`}>
      <Trajectory watch={watch} />
      <Watchlist watch={watch} />
      <Exceptions watch={watch} />
    </div>
  )
}

/**
 * A card of the right height with nothing in it, for the frame or two before the walk lands.
 *
 * Not a spinner, and not zeroes. A spinner on a section that fills in within a frame is a flash
 * of chrome; a zero is a claim. The card holds its space so the page does not jump when the
 * figures arrive.
 *
 * THE HEIGHT IS MEASURED, AND THE 268px IT REPLACES WAS NOT RIGHT AT ANY WIDTH. Whatever it was
 * taken from, the rendered card is 418px from 520px of container upward and 470px below it — the
 * rows stack narrow, so the phone is the TALLER case, which is the opposite of what a single
 * desktop-tuned number would assume. At 268 the placeholder was 150–200px short everywhere, so
 * the page jumped down by that much when the register walk landed, on every breakpoint.
 *
 * Measured in the browser at 1680, 1280, 900 and 420 CSS px with the panel in its live grid
 * column: 418 / 418 / 414 / 470. The two steps below are the ceiling of each group, because
 * reserving a few pixels too many is invisible and reserving too few is the jump.
 *
 * IF THE PANEL'S CONTENT CHANGES, THIS NUMBER HAS TO BE RE-MEASURED. That is the cost of holding
 * space with a literal, and it is still cheaper than the alternatives — a spinner flashes and a
 * min-height of zero jumps.
 */
function Skeleton() {
  return <div className={`${CARD} h-[470px] animate-pulse @[520px]:h-[418px]`} aria-hidden />
}

function Trajectory({ watch }: { watch: Watch }) {
  const parts = [
    { label: 'Declining', value: watch.declining, color: CORAL },
    { label: 'Holding', value: watch.stable, color: '#dcebe1' },
    { label: 'Growing', value: watch.growing, color: GREEN },
  ]

  return (
    <>
      {/* The subject and its size on one baseline, as the species list's band does it — one
          figure leads and the other supports it. */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-display text-[26px] leading-none font-semibold tabular-nums" style={{ color: VALUE }}>
          {fmt(watch.species)}
        </span>
        <span className="text-body" style={{ color: MUTED }}>
          species held
        </span>
        <span className="text-body tabular-nums" style={{ color: FAINT }}>
          · {fmt(watch.declining)} recorded more deaths than births
        </span>
      </div>

      <div className="mt-3">
        <Ribbon items={parts} height={8} />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {parts.map((p) => (
            <span key={p.label} className="flex items-center gap-1.5 text-caption tabular-nums">
              <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
              <span style={{ color: MUTED }}>{p.label}</span>
              <span style={{ color: VALUE }}>{fmt(p.value)}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

/**
 * The watchlist — five rows, each one a filtered species list.
 *
 * `href` is built from `FACET_PARAM` rather than from a typed `?lens=`, so if the param name for
 * the analysis axis ever changes there is one place it changes. `href()` from the scope carries
 * the window and site forward, which is what makes the count the reader clicked the count they
 * then see.
 */
function Watchlist({ watch }: { watch: Watch }) {
  const { href } = useScope()

  return (
    <ul className="mt-4 flex flex-col border-t pt-1" style={{ borderColor: HAIR }}>
      {watch.rows.map((r) => (
        <li key={r.lens} className="border-b last:border-0" style={{ borderColor: '#f0efec' }}>
          <a
            href={href(`browse/species?${FACET_PARAM.analysis}=${encodeURIComponent(r.lens)}`)}
            className="card-press -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-3"
          >
            <span
              className="size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: r.grave ? CORAL : mix(ACCENT, 0.55) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-small text-[#1c1a16]">{r.label}</span>
            <span
              className="shrink-0 text-small font-semibold tabular-nums"
              style={{ color: r.grave && r.count > 0 ? CORAL : VALUE }}
            >
              {fmt(r.count)}
            </span>
            <ChevronRight size={13} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  )
}

/**
 * The two figures a curator acts on today.
 *
 * Both are links, both are hidden at zero, and both state their own denominator — an unsexed
 * count without the share it is of is a big number with no meaning. The unsexed figure is here
 * rather than in the KPI grid because it is the collection's largest single data gap and the
 * screen had no statement of it at all: 57,040 of 110,020 animals carry no recorded sex.
 */
function Exceptions({ watch }: { watch: Watch }) {
  const { href } = useScope()
  if (watch.critical === 0 && watch.unsexed === 0) return null

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 border-t pt-4" style={{ borderColor: HAIR }}>
      {watch.critical > 0 && (
        <a
          /* ALL THREE CODES, NOT JUST `CR`.
             The figure counts the species list's own `CRITICAL` set — CR, EW and EX, which is what
             "or worse" in the label means — and a link carrying only `iucn=CR` opened 93 rows under
             a label reading 96. That is the precise failure the note on `WatchRow` warns about, and
             it appeared here rather than in the watchlist because this row was the one place a
             filter was written out by hand instead of read off the set.
             Multi-valued by repetition, which is what `FACET_PARAM` documents: several of these
             values contain characters any separator would eventually collide with. */
          href={href(
            `browse/species?${[...CRITICAL]
              .map((code) => `${FACET_PARAM.conservation}=${encodeURIComponent(code)}`)
              .join('&')}`,
          )}
          className="card-press flex items-baseline gap-2"
        >
          <ShieldAlert size={14} strokeWidth={2} className="translate-y-[2px]" style={{ color: CORAL }} aria-hidden />
          <span className="font-display text-[20px] leading-none font-semibold tabular-nums" style={{ color: CORAL }}>
            {fmt(watch.critical)}
          </span>
          <span className="text-caption" style={{ color: MUTED }}>
            critically endangered or worse
          </span>
        </a>
      )}
      {watch.unsexed > 0 && (
        <a
          href={href(`browse/species?${FACET_PARAM.analysis}=${encodeURIComponent('Wholly unsexed')}`)}
          className="card-press flex items-baseline gap-2"
        >
          <span className="font-display text-[20px] leading-none font-semibold tabular-nums" style={{ color: VALUE }}>
            {Math.round(watch.unsexedPct)}%
          </span>
          <span className="text-caption tabular-nums" style={{ color: MUTED }}>
            of the collection unsexed · {fmt(watch.unsexed)} animals
          </span>
        </a>
      )}
    </div>
  )
}

/* ── the lens membership, read from the list's own table ─────────────────── */

/**
 * Which lenses a row answers to.
 *
 * `speciesListData.ts` keeps its own `analysesOf` private and exports `ANALYSES`, so this reads
 * the exported table rather than duplicating any predicate. That is the invariant that matters:
 * there is one definition of "Losing ground" in the product, and both the count on this card and
 * the rows behind its link are decided by it.
 */
function lensesOf(row: SpeciesListRow): string[] {
  return ANALYSES.filter((a) => a.test(row)).map((a) => a.value)
}
