/**
 * THE SPECIES LIST — the bridge between the home dashboard and a species' own page.
 *
 * WHAT THIS REPLACES. `#/browse/species` used to render `EntityBrowser`, the generic
 * every-kind index: a search box and a column of names with a chevron. That is the right
 * shape for wards and lab departments, of which there are thirty and about which the index
 * has nothing to say. It is the wrong shape for the collection's 2,352 species, where the
 * question a curator arrives with is never "which one is called what" — it is "which of these
 * is at risk, which is wholly unsexed, which lost more than it gained this month". A list that
 * cannot be asked those questions sends the reader into 2,352 pages one at a time.
 *
 * SO IT IS A WORKSPACE, NOT A DIRECTORY: one summary band across the top, a row of filter fields
 * under it, and a table that carries the eleven figures the species page would otherwise have to
 * be opened to read. `EntityBrowser` is untouched and still serves the other thirteen kinds.
 *
 * THE BAND AND THE BAR BOTH REPLACED SOMETHING WIDER. The band was five tinted stat cards and the
 * bar was a 21% column of collapsed accordions down the left; the notes on `StatBand` and
 * `FilterBar` give the argument for each. What they have in common is the reason: this page's
 * subject is an eleven-column table that does not fit, so every pixel spent on chrome above or
 * beside it was a figure pushed off the right edge.
 *
 * ONE READING, IN ONE PLACE. Every number here comes out of `speciesListData.ts`, which asks
 * `core/` the same questions the species page asks and merges by NAME the same way — so a row
 * reading 1,045 opens a page reading 1,045. Read the note at the top of that file before
 * adding a column; two of the reference design's columns are not in the dump and the file says
 * which and why.
 *
 * THE ROW IS THE LINK. Clicking anywhere on a row opens the existing species page at its
 * largest population, with the existing thirteen tabs — nothing about that flow is changed
 * here, and the species name inside the row is a real anchor so the row can also be
 * middle-clicked, copied and opened in a tab.
 *
 * WHAT IS DELIBERATELY NOT ON THIS PAGE:
 *   A SECOND SEARCH. The results header carries one field; the panel carries none. Two search
 *     boxes on one screen is two places a reader's query can fail to be.
 *   A ROW ACTION COLUMN. The row IS the action. A button repeating it on 2,352 rows is 2,352
 *     marks that all do what the row already does.
 *   PROSE. The empty state is the only sentence on the page, and it exists because a blank
 *     table is the one situation where the screen cannot explain itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  Download,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react'
import { CLASS_ICONS } from '../exec/classIcons'
import { loadProfiles, profilesNow } from '../core/profiles'
import { PawPrint } from 'lucide-react'
import { FAINT, HAIR, MUTED, RED_LIST, VALUE, fmt, mix } from '../exec/system'
import { Ribbon } from '../exec/marks'
import { MoreRows, usePaged } from './perf'
import { useScope } from './scope'
import {
  CRITICAL,
  applyFilters,
  csvName,
  facets,
  paramsFromPicked,
  pickedCount,
  pickedFromParams,
  sortRows,
  speciesRows,
  toCsv,
  withProfiles,
  type FacetGroup,
  type FacetKey,
  type Picked,
  type SortKey,
  type SpeciesListRow,
} from './speciesListData'

/* ── the page's own inks ─────────────────────────────────────────────────── */

/** The table header bar — the pale teal-green the brief asks for, not a grey. */
const HEAD_BG = '#e4efe8'
/** Header type: muted dark green, readable at 12px uppercase. */
const HEAD_INK = '#4a6156'
/** The row separator. One hairline, no vertical rules between cells. */
const ROW_LINE = '#eef1ee'
/** Deaths, and the critical card. Soft coral, never the alarm red. */
const CORAL = '#d4553a'
/** Births and population. The product's own dark green, which passes as type. */
const GREEN = '#1f6b45'

/* ── the summary band ────────────────────────────────────────────────────── */

/**
 * The collection under the live scope — NOT the filtered set.
 *
 * The results header two rows down already states what the filters left, and a band restating it
 * would leave the page with no fixed point: a reader who has narrowed to 41 rows still needs to
 * know it is 41 of 2,411. So the band holds still and the results line moves.
 */
interface Totals {
  species: number
  animals: number
  male: number
  female: number
  undetermined: number
  critical: number
}

function statsOf(rows: SpeciesListRow[]): Totals {
  let animals = 0
  let male = 0
  let female = 0
  let undetermined = 0
  let critical = 0
  for (const r of rows) {
    animals += r.total
    male += r.male
    female += r.female
    undetermined += r.undetermined
    if (CRITICAL.has(r.iucn)) critical++
  }
  return { species: rows.length, animals, male, female, undetermined, critical }
}

/**
 * THE COLLECTION IN ONE BAND — and it was five tinted boxes.
 *
 * WHAT WAS WRONG WITH THE BOXES was not that any figure was wrong. It was that five equal cards,
 * each a big number over an uppercase word, each on its own pastel wash, say "here are five
 * equally important things" — and they are not five things. Two are the size of the collection,
 * three are one composition. Drawing them identically is the repeated number-and-label ROW this
 * product removes everywhere else it appears, and the five washes made it louder rather than
 * clearer: a green, a grey, a blue, a second green and a pink across the top of a page whose
 * table below is almost entirely ink on white.
 *
 * SO THE BAND SAYS THE THREE THINGS IT ACTUALLY HOLDS, at three different weights:
 *
 *   THE COUNT        2,411 species, and the animals inside them. One figure leads and the other
 *                    supports it, because this is the SPECIES list — the species count is the
 *                    subject and the headcount is its size.
 *   THE COMPOSITION  one proportional bar, not two numbers. Male, female and undetermined are
 *                    parts of a whole and a whole is a bar; as three separate boxes the reader
 *                    had to do the subtraction to notice the finding, which is that MOST OF THE
 *                    COLLECTION IS UNSEXED — 57,040 of 110,020. The old row omitted undetermined
 *                    entirely, so the one fact worth acting on was the one it did not print.
 *   THE EXCEPTION    critical species, in coral, alone on the right. It is the only figure here a
 *                    reader would act on today, so it is the only one given a colour.
 *
 * `Ribbon` rather than a hand-rolled bar: it already carries the 2px segment gap, the sliver floor
 * that keeps a tiny real part visible, and the grow-in on the product's motion scale.
 */
function StatBand({ t }: { t: Totals }) {
  const sexes = [
    { label: 'Male', value: t.male, color: GREEN },
    { label: 'Female', value: t.female, color: '#8fd9ae' },
    /* The pale step, and the largest segment — see the note above on why it is here at all. */
    { label: 'Undetermined', value: t.undetermined, color: '#dcebe1' },
  ]

  return (
    <div className="rounded-[var(--radius-card)] bg-white px-[var(--pad-card-sm)] py-4">
      <div className="flex flex-col gap-4 @[720px]:flex-row @[720px]:items-center @[720px]:gap-6">
        {/* THE COUNT. `items-baseline`, so the two figures sit on one line however they wrap. */}
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="font-display text-[32px] leading-none font-semibold tabular-nums" style={{ color: VALUE }}>
            {fmt(t.species)}
          </span>
          <span className="text-body" style={{ color: MUTED }}>
            species
          </span>
          <span className="text-body tabular-nums" style={{ color: FAINT }}>
            · {fmt(t.animals)} animals
          </span>
        </div>

        {/* THE COMPOSITION. Takes the slack, because a bar is the one thing here that reads
            better wide and the two figures either side of it do not. */}
        <div className="min-w-0 flex-1">
          <Ribbon items={sexes} height={8} />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {sexes.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 text-caption tabular-nums">
                <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                <span style={{ color: MUTED }}>{s.label}</span>
                <span style={{ color: VALUE }}>{fmt(s.value)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* THE EXCEPTION. Hidden at zero — a nil here is not a finding, and a coral "0" beside a
            calm band is an alarm about nothing. */}
        {t.critical > 0 && (
          <div className="flex shrink-0 items-baseline gap-2 @[720px]:flex-col @[720px]:items-end @[720px]:gap-0">
            <span className="font-display text-[26px] leading-none font-semibold tabular-nums" style={{ color: CORAL }}>
              {fmt(t.critical)}
            </span>
            <span className="text-overline font-medium uppercase" style={{ color: MUTED }}>
              Critical
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── the filter bar ──────────────────────────────────────────────────────── */

/**
 * THE FILTERS ARE ONE ROW OF FIELDS, AND THEY WERE A 21% COLUMN DOWN THE LEFT.
 *
 * THE COLUMN COST THE TABLE THE THING THE TABLE NEEDED MOST. Eleven columns already do not fit —
 * the note at `COLS` says so and accepts a horizontal scroll for them — and the filter rail was
 * taking a fifth of the content width to show nine headings, seven of them collapsed to a word and
 * a chevron. So the page spent its widest asset on controls that were not in use, and the data it
 * exists to show was what got pushed off the right edge.
 *
 * A FIELD IS THE SAME CONTROL, ADDRESSED DIFFERENTLY. Every group keeps its exact value list, its
 * counts, its multi-select and its "+ N more" — nothing about what a filter DOES has changed. What
 * changed is that a group is closed until asked for, which is what a dropdown is, and nine closed
 * groups are a row rather than a column.
 *
 * THE FIELD LABEL DOES NOT CHANGE WIDTH WHEN IT IS PICKED. It states the axis and carries a count
 * badge — never the chosen value. Substituting "Aves" for "Class" reflows the whole row on every
 * tick, and a control that moves out from under the pointer as you use it is the one thing a filter
 * bar must not do. What was ticked is one press away and the badge says how many.
 *
 * ONE ROW AT EVERY WIDTH, so the tablet disclosure that used to wrap the column is gone with it.
 * The row wraps; it does not need a second implementation to be usable narrow.
 */
function FilterBar({
  groups,
  picked,
  onToggle,
  onClear,
}: {
  groups: FacetGroup[]
  picked: Picked
  onToggle: (key: FacetKey, value: string) => void
  onClear: () => void
}) {
  const n = pickedCount(picked)

  return (
    <div className="rounded-[var(--radius-card)] bg-white px-[var(--pad-card-sm)] py-3">
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={15} strokeWidth={1.75} className="shrink-0" style={{ color: GREEN }} aria-hidden />
        {groups.map((g) => (
          <FilterField key={g.key} group={g} picked={picked[g.key]} onToggle={onToggle} />
        ))}
        {/* Present only when there is something to clear — a permanently-lit Clear is chrome. */}
        {n > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="card-press ml-auto shrink-0 rounded-full px-2.5 py-[5px] text-caption font-semibold"
            style={{ backgroundColor: mix(CORAL, 0.1), color: CORAL }}
          >
            Clear {n}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * One axis, as a field that opens its own values.
 *
 * THE PANEL FLIPS TO THE RIGHT EDGE NEAR THE VIEWPORT'S, measured when it opens rather than
 * guessed from a breakpoint. With nine fields on one row the last of them is always close to the
 * right edge, and a 264px panel anchored left from there opens off-screen — on a page whose body
 * must never scroll sideways, that is a control the reader cannot reach at all.
 */
function FilterField({
  group,
  picked,
  onToggle,
}: {
  group: FacetGroup
  picked?: Set<string>
  onToggle: (key: FacetKey, value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState(false)
  const [flip, setFlip] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  const on = picked?.size ?? 0
  const shown = full ? group.values : group.values.slice(0, group.cap)
  const hidden = group.values.length - shown.length

  /* Dismissal, both ways a reader expects it. `mousedown` rather than `click`, so a press that
     starts outside closes the panel instead of waiting for the release. */
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  if (!group.values.length) return null

  const toggleOpen = () => {
    const r = box.current?.getBoundingClientRect()
    if (r) setFlip(r.left + PANEL_W > window.innerWidth - 12)
    setOpen((v) => !v)
  }

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="true"
        className="card-press flex items-center gap-1.5 rounded-full py-[5px] pr-2 pl-3 text-small font-medium whitespace-nowrap transition-colors"
        style={{
          /* Ticked reads as a filled field, untouched as an outlined one. The border is on both,
             so the row does not change height or step sideways when one lights up. */
          backgroundColor: on > 0 ? mix(GREEN, 0.1) : '#ffffff',
          border: `1px solid ${on > 0 ? mix(GREEN, 0.28) : HAIR}`,
          color: on > 0 ? GREEN : '#3d3a34',
        }}
      >
        {group.label}
        {on > 0 && (
          <span
            className="rounded-full px-1.5 text-caption font-semibold tabular-nums"
            style={{ backgroundColor: GREEN, color: '#ffffff' }}
          >
            {on}
          </span>
        )}
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: on > 0 ? GREEN : FAINT }}
          aria-hidden
        />
      </button>

      {open && (
        <div
          /* `animate-drop-in` is the emphasis tier — the same arrival every other panel in the
             product uses, rather than a duration invented here. */
          className={`animate-drop-in absolute top-[calc(100%+6px)] z-20 rounded-[12px] bg-white p-2 shadow-[0_10px_30px_rgba(20,40,30,0.14)] ${
            flip ? 'right-0' : 'left-0'
          }`}
          style={{ width: PANEL_W, border: `1px solid ${HAIR}` }}
        >
          <ul className="max-h-[300px] overflow-y-auto">
            {shown.map((v) => {
              const ticked = picked?.has(v.value) ?? false
              return (
                <li key={v.value}>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-[8px] px-1.5 py-[6px] transition-colors hover:bg-[#f4f9f6] ${
                      v.count === 0 && !ticked ? 'opacity-45' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={ticked}
                      onChange={() => onToggle(group.key, v.value)}
                      /* The browser control, restyled by `accent-color` rather than replaced.
                         A hand-drawn checkbox loses the keyboard behaviour, the indeterminate
                         state and the platform's own focus ring for a 1px difference in the tick. */
                      className="size-[15px] shrink-0 accent-[#1f6b45]"
                    />
                    <span
                      className="min-w-0 flex-1 truncate text-small"
                      style={{ color: ticked ? '#1c1a16' : '#3d3a34' }}
                    >
                      {v.label}
                    </span>
                    <span className="shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>
                      {fmt(v.count)}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setFull(true)}
              className="card-press mt-1 px-1.5 py-1 text-caption font-semibold"
              style={{ color: GREEN }}
            >
              + {hidden} more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** The dropdown's width, and the number the flip test measures against. */
const PANEL_W = 264

/* ── the species cell ────────────────────────────────────────────────────── */

/**
 * Identity, standing and binomial in one cell — the reference's shape, kept.
 *
 * THE IUCN CODE IS A DOT AND TWO LETTERS, NOT A FILLED BADGE. The Red List's published fills
 * include a yellow that is 1.9:1 on white; the standard's own artwork sets white type on it,
 * which is unreadable at row scale. `RED_LIST` in `exec/system.tsx` already solves this for the
 * conservation card — the FILL is exact and carries the encoding, the type beside it is ink
 * that can be read. Same treatment here, at 8px, so 2,352 rows do not become 2,352 colour
 * blocks.
 */
function SpeciesCell({ row, href }: { row: SpeciesListRow; href: string }) {
  const Glyph: LucideIcon | undefined = CLASS_ICONS[row.cls] as LucideIcon | undefined
  const rl = RED_LIST.find((r) => r.code === row.iucn)

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-[9px]"
        style={{ backgroundColor: mix(GREEN, 0.09) }}
        aria-hidden
      >
        {Glyph ? (
          <Glyph size={16} strokeWidth={1.6} style={{ color: GREEN }} />
        ) : (
          <PawPrint size={16} strokeWidth={1.6} style={{ color: GREEN }} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          {/* A real anchor inside a clickable row, so the row can be opened in a tab, copied
              and reached by the keyboard without the row inventing link behaviour. */}
          <a
            href={href}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 truncate text-small font-semibold text-[#1c1a16] hover:underline"
          >
            {row.name}
          </a>
          {rl && (
            <span className="flex shrink-0 items-center gap-1" title={rl.name}>
              {/* Not Evaluated's published fill is WHITE, so on a white row the dot was a gap
                  where a mark should be. `RED_LIST` already carries the outline the standard's
                  own artwork uses for exactly this case; it is read here rather than a grey
                  being substituted, which would put NE in the same visual family as Data
                  Deficient — a different assessment. */}
              <span
                className="size-[7px] rounded-full"
                style={{
                  backgroundColor: rl.fill,
                  boxShadow: 'outline' in rl && rl.outline ? `inset 0 0 0 1px ${rl.outline}` : undefined,
                }}
                aria-hidden
              />
              <span className="text-caption font-semibold" style={{ color: MUTED }}>
                {rl.code}
              </span>
            </span>
          )}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2">
          {/* Italic where there IS a binomial. A dash where the reference table carries none —
              never an invented Latin name, which is the rule `modules/animals.tsx` already sets. */}
          <span className="min-w-0 truncate text-caption italic" style={{ color: FAINT }}>
            {row.scientific ?? '—'}
          </span>
          {row.cites && (
            <span
              className="shrink-0 rounded-[5px] px-1.5 text-[10px] leading-[16px] font-semibold whitespace-nowrap"
              style={{ backgroundColor: '#eef1ee', color: '#4a6156' }}
            >
              CITES {row.cites}
            </span>
          )}
        </span>
      </span>
    </div>
  )
}

/* ── the table ───────────────────────────────────────────────────────────── */

interface Col {
  key: string
  label: string
  /** Sortable columns name the field they sort on; the rest do not sort. */
  sort?: SortKey
  align: 'left' | 'right'
  width?: number
}

/**
 * The column set, and what each one is measured in.
 *
 * PAIRABLE, NOT PAIRED. The dump carries no pairing record — `core/metrics.ts` says so in as
 * many words and `speciesPairing.tsx` refuses the word at enclosure grain for the same reason.
 * This counts enclosures holding both sexes, which is the precondition a curator plans from,
 * and the header says which. See the note at the top of `speciesListData.ts`.
 *
 * ELEVEN COLUMNS, ALWAYS, AND THE TABLE SCROLLS INSTEAD OF DROPPING ANY.
 *
 * There was a container-query hide on four of them, and it was a worse answer twice over. It
 * silently dropped Sexed % and Chip % at every width the product actually renders at — the
 * content column is about 930px on a 1600 desktop once the sidebar and the filter panel have
 * taken theirs, so a threshold written against the window was never going to fire. And even
 * working it would have been wrong: a column that vanishes is a figure the reader cannot ask
 * for, whereas a column past the right edge is one scroll away. The brief accepts the scroll.
 *
 * WHAT MAKES THE SCROLL USABLE is that NO and SPECIES are pinned to the left edge, so the row
 * never loses its identity while the figures move under it. That is the reason `NO_W` is a
 * hard width rather than a hint: the species column's `left` offset has to be an exact number.
 */
const NO_W = 44

const COLS: Col[] = [
  { key: 'no', label: 'No', align: 'left', width: NO_W },
  { key: 'species', label: 'Species', sort: 'name', align: 'left' },
  { key: 'total', label: 'Population', sort: 'total', align: 'right', width: 98 },
  { key: 'split', label: 'M · F · U', align: 'right', width: 124 },
  { key: 'sites', label: 'Sites', sort: 'sites', align: 'right', width: 62 },
  { key: 'enclosures', label: 'Enclosures', sort: 'enclosures', align: 'right', width: 98 },
  { key: 'pairable', label: 'Pairable', sort: 'pairable', align: 'right', width: 82 },
  { key: 'births', label: 'Births', sort: 'births', align: 'right', width: 72 },
  { key: 'deaths', label: 'Deaths', sort: 'deaths', align: 'right', width: 76 },
  { key: 'sexed', label: 'Sexed %', sort: 'sexedPct', align: 'right', width: 84 },
  { key: 'chip', label: 'Chip %', sort: 'chipPct', align: 'right', width: 78 },
]

/** The two pinned columns, and where the second one starts. */
const PINNED = new Set(['no', 'species'])
const pinLeft = (key: string) => (key === 'no' ? 0 : NO_W)

/**
 * The species column is CAPPED, and harder on a phone than anywhere else.
 *
 * Auto table layout gives an unbounded cell whatever its longest name wants — "Auburn Caramel
 * Peryton" took 278px — and because this column is pinned, every pixel it takes is a pixel the
 * figures beside it never get. On a 500px screen that left 136px of scroller and clipped the
 * population mid-number. The name truncates instead: a reader who cannot read a whole name can
 * still tell the rows apart, where a reader who cannot read a whole figure has nothing.
 */
const SPECIES_W = 'max-w-[188px] @[560px]:max-w-[320px]'

/**
 * The sort affordance — lit on the sorted column, and shown faintly on hover for the rest.
 *
 * Nine permanently-visible chevrons across a header bar is nine marks saying the same thing
 * about columns nobody is sorting by; none at all leaves a reader with no way to discover the
 * header is a control. So the mark is there on the one that IS sorted, and appears under the
 * pointer on the ones that could be.
 */
function SortMark({ dir }: { dir: 'asc' | 'desc' | null }) {
  return (
    <ChevronDown
      size={12}
      strokeWidth={2.5}
      className={`shrink-0 transition-transform duration-150 ${dir === 'asc' ? 'rotate-180' : ''} ${
        dir ? '' : 'opacity-0 group-hover/th:opacity-40'
      }`}
      style={{ color: GREEN }}
      aria-hidden
    />
  )
}

function SpeciesTable({
  rows,
  offset,
  sort,
  dir,
  onSort,
  onOpen,
  href,
}: {
  rows: SpeciesListRow[]
  offset: number
  sort: SortKey
  dir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
  onOpen: (row: SpeciesListRow) => void
  href: (row: SpeciesListRow) => string
}) {
  return (
    /* THE SCROLLER IS THE TABLE'S, NOT THE PAGE'S. Eleven columns will not fit a tablet and the
       brief accepts a horizontal scroll for them — but the page body must never scroll
       sideways, so the overflow is bounded here and the filter panel beside it stays put. */
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[860px] border-separate border-spacing-0">
        <thead>
          <tr>
            {COLS.map((c, i) => {
              const active = c.sort === sort
              const pinned = PINNED.has(c.key)
              /* `uppercase` sits on the inner span, not only on the cell: a `<button>` does not
                 inherit `text-transform` from its ancestors in Chrome's UA sheet, which left
                 nine of the eleven headers in sentence case while the two unsortable ones were
                 correctly capitalised. */
              /**
               * ON A RIGHT-ALIGNED COLUMN THE SORT MARK GOES BEFORE THE LABEL, and that is an
               * alignment fix rather than a preference.
               *
               * With the chevron after the label, it occupies the rightmost 12px of the cell plus
               * its 4px gap — so the header TEXT stopped 16px short of the cell's padding edge
               * while every figure beneath it sat flush against that edge. Measured across the
               * table, all nine sortable numeric headers were out by exactly 16px, and `M · F · U`
               * — the one right-aligned column with no sort — was the only one landing at zero.
               * That is what the eye was reading as a crooked table: a column of numbers is a
               * vertical edge, and its heading was not on it.
               *
               * Putting the mark on the far side of the label restores the edge without hiding the
               * affordance. Left-aligned columns keep the mark trailing, for the same reason —
               * there the text edge is on the left and the chevron is not standing on it.
               */
              const mark = c.sort ? <SortMark dir={active ? dir : null} /> : null
              const head = (
                <span
                  className={`flex items-center gap-1 text-overline font-semibold uppercase ${
                    c.align === 'right' ? 'justify-end' : ''
                  }`}
                  style={{ color: HEAD_INK }}
                >
                  {c.align === 'right' ? (
                    <>
                      {mark}
                      {c.label}
                    </>
                  ) : (
                    <>
                      {c.label}
                      {mark}
                    </>
                  )}
                </span>
              )
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  style={{
                    backgroundColor: HEAD_BG,
                    width: c.width,
                    minWidth: c.width,
                    left: pinned ? pinLeft(c.key) : undefined,
                  }}
                  className={`group/th sticky top-0 whitespace-nowrap ${
                    c.key === 'no' ? 'px-3' : 'px-2.5'
                  } py-2.5 ${c.key === 'species' ? SPECIES_W : ''} ${pinned ? 'z-[3]' : 'z-[2]'} ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  } ${i === 0 ? 'rounded-l-[10px]' : ''} ${i === COLS.length - 1 ? 'rounded-r-[10px]' : ''}`}
                >
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() => onSort(c.sort!)}
                      className={`w-full cursor-pointer ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {head}
                    </button>
                  ) : (
                    head
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <Row key={r.name} row={r} n={offset + i + 1} onOpen={onOpen} href={href(r)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * One species.
 *
 * A `<tr>` cannot wrap an anchor, so the row carries the click and the name carries the href —
 * both land on the same page. `tabIndex` and the Enter/Space handler are what make the row
 * itself reachable without a mouse; the anchor inside is what makes it copyable.
 */
function Row({
  row,
  n,
  onOpen,
  href,
}: {
  row: SpeciesListRow
  n: number
  onOpen: (row: SpeciesListRow) => void
  href: string
}) {
  const cell = (c: Col, body: React.ReactNode, style?: React.CSSProperties) => (
    <td
      key={c.key}
      className={`border-b ${c.key === 'no' ? 'px-3' : 'px-2.5'} py-2.5 text-small tabular-nums whitespace-nowrap ${
        c.align === 'right' ? 'text-right' : 'text-left'
      } ${PINNED.has(c.key) ? 'sticky z-[1]' : ''}`}
      style={{
        borderColor: ROW_LINE,
        left: PINNED.has(c.key) ? pinLeft(c.key) : undefined,
        /* A pinned cell has to be opaque or the columns scroll visibly under it, and it has to
           follow the row's hover or the two pinned cells stay white while the other nine wash.
           One variable set on the `<tr>` drives both, so they cannot fall out of step. */
        backgroundColor: PINNED.has(c.key) ? 'var(--row-bg)' : undefined,
        ...style,
      }}
    >
      {body}
    </td>
  )

  const by = (key: string) => COLS.find((c) => c.key === key)!

  return (
    <tr
      onClick={() => onOpen(row)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(row)
        }
      }}
      tabIndex={0}
      /* Written out rather than interpolated from `ROW_HOVER` — Tailwind scans this file as
         text, so a class assembled from a constant produces no rule at all. */
      className="cursor-pointer outline-none [--row-bg:#ffffff] hover:[--row-bg:#f4f9f6] focus-visible:[--row-bg:#f4f9f6]"
      style={{ backgroundColor: 'var(--row-bg)' }}
    >
      {cell(by('no'), n, { color: FAINT })}
      <td
        className={`sticky z-[1] border-b px-2.5 py-2.5 ${SPECIES_W}`}
        style={{ borderColor: ROW_LINE, left: pinLeft('species'), backgroundColor: 'var(--row-bg)' }}
      >
        <SpeciesCell row={row} href={href} />
      </td>
      {/* THE POPULATION IS THE ONE FIGURE ON THE ROW THAT IS ALWAYS WORTH FINDING, so it is the
          one that carries weight. Colouring every number would rank none of them. */}
      {cell(by('total'), fmt(row.total), { color: GREEN, fontWeight: 600 })}
      {cell(
        by('split'),
        <span className="flex items-center justify-end gap-1" style={{ color: MUTED }}>
          <span>{fmt(row.male)}</span>
          <span style={{ color: '#c3cec7' }}>·</span>
          <span>{fmt(row.female)}</span>
          <span style={{ color: '#c3cec7' }}>·</span>
          {/* Unsexed is the number an operator acts on — a lab request waiting to be raised —
              so it is the half of this cell that is not grey. */}
          <span style={{ color: row.undetermined > 0 ? '#3d3a34' : '#c3cec7' }}>{fmt(row.undetermined)}</span>
        </span>,
      )}
      {cell(by('sites'), row.sites, { color: '#3d3a34' })}
      {cell(by('enclosures'), fmt(row.enclosures), { color: '#3d3a34' })}
      {cell(by('pairable'), row.pairable || '—', { color: row.pairable ? '#3d3a34' : '#a9b3ad' })}
      {cell(by('births'), row.births || '—', { color: row.births ? GREEN : '#a9b3ad' })}
      {cell(by('deaths'), row.deaths || '—', { color: row.deaths ? CORAL : '#a9b3ad' })}
      {cell(by('sexed'), `${Math.round(row.sexedPct)}%`, { color: '#3d3a34' })}
      {/* An em dash, not 0% — `profiles.json` omits the key where nothing is recorded, and
          "0% chipped" reads as a finding when it is only a silence. */}
      {cell(by('chip'), row.chipPct === undefined ? '—' : `${Math.round(row.chipPct)}%`, {
        color: row.chipPct === undefined ? '#a9b3ad' : '#3d3a34',
      })}
    </tr>
  )
}

/* ── the filters, in the URL ─────────────────────────────────────────────── */

/**
 * SEEDED FROM THE LINK, WRITTEN BACK ON EVERY CHANGE.
 *
 * The seeding half is what makes a species count anywhere else in the product worth clicking:
 * arrive from a critically-endangered figure and the Conservation group is already ticked at
 * CR, so the 96 you clicked is the 96 you see. The writing-back half is what keeps it honest
 * afterwards — narrow to endangered birds, copy the address bar, and the colleague you send it
 * to opens the same 49 rows.
 *
 * `replaceState`, NOT a hash assignment. Every checkbox tap would otherwise be a history
 * entry, and a reader who ticked six boxes would need seven presses of Back to leave the page.
 * The current entry is rewritten instead, so Back goes where the reader came from and the
 * filters they left behind are still on the entry when they return.
 */
interface Narrowing {
  picked: Picked
  query: string
}

const readParams = (): URLSearchParams => {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const cut = raw.indexOf('?')
  return new URLSearchParams(cut === -1 ? '' : raw.slice(cut + 1))
}

function useUrlFilters(): [Narrowing, (fn: (prev: Narrowing) => Narrowing) => void] {
  /* Read ONCE, at mount. The URL is an INPUT to this state, not a mirror of it — re-reading on
     every render would fight the write below, and the only other writer (the scope, when the
     window or site changes) carries these params through untouched. */
  const [state, setState] = useState<Narrowing>(() => {
    const p = readParams()
    return { picked: pickedFromParams(p), query: p.get('q') ?? '' }
  })

  /**
   * RE-SEED ON A REAL NAVIGATION, and only on a real one.
   *
   * The router keys this page on the PATH, so arriving at `?iucn=CR` from `?cls=Aves` — a
   * second species-count link, or the Back button over two filtered states — does not remount
   * the component and the mount-time read above never runs again. The reader would press Back
   * and watch the address bar change under an unchanged table.
   *
   * Listening for `hashchange` is safe precisely because the write below uses `replaceState`,
   * which fires no event. So this hears genuine navigations and never its own writes — the
   * loop that would otherwise reset the panel on every checkbox tap cannot form.
   */
  useEffect(() => {
    const onNav = () => {
      const p = readParams()
      setState({ picked: pickedFromParams(p), query: p.get('q') ?? '' })
    }
    window.addEventListener('hashchange', onNav)
    return () => window.removeEventListener('hashchange', onNav)
  }, [])

  /* ONE state object rather than two, so the writer always has both halves in hand. With two
     `useState`s the setter for either would have had to reach for the other through a ref kept
     in sync by hand, which is a second copy of the state and the usual place they diverge. */
  const update = useCallback((fn: (prev: Narrowing) => Narrowing) => {
    setState((prev) => {
      const next = fn(prev)
      const raw = window.location.hash.replace(/^#\/?/, '')
      const cut = raw.indexOf('?')
      const path = cut === -1 ? raw : raw.slice(0, cut)
      const params = new URLSearchParams(cut === -1 ? '' : raw.slice(cut + 1))

      for (const [key, values] of Object.entries(paramsFromPicked(next.picked, next.query))) {
        params.delete(key)
        if (values) for (const v of values) params.append(key, v)
      }
      const search = params.toString()
      window.history.replaceState(window.history.state, '', `#/${path}${search ? `?${search}` : ''}`)
      return next
    })
  }, [])

  return [state, update]
}

/* ── the page ────────────────────────────────────────────────────────────── */

export function SpeciesList() {
  const { scope, go, href } = useScope()

  /* The base table — one register walk per (site, window), cached in `speciesListData.ts`. */
  const base = useMemo(() => speciesRows(scope), [scope])

  /* The reference biology, folded on when it lands. Four columns and two filter groups are
     empty until then; the other seven columns and seven groups are on screen immediately. */
  const [profiles, setProfiles] = useState(profilesNow)
  useEffect(() => {
    if (profiles) return
    let live = true
    loadProfiles().then(
      (p) => live && setProfiles(p),
      () => {
        /* A failed fetch costs the binomial and the chip share. Every figure that came from
           `dims` is already drawn, so the page degrades rather than breaks. */
      },
    )
    return () => {
      live = false
    }
  }, [profiles])

  const rows = useMemo(() => withProfiles(base, profiles), [base, profiles])

  /* Seeded from the link that opened the page, written back on every change — see the note on
     `useUrlFilters`. This is what makes "231 species" on another page a link worth pressing. */
  const [{ picked, query }, narrow] = useUrlFilters()
  const setQuery = useCallback((q: string) => narrow((prev) => ({ ...prev, query: q })), [narrow])
  const [sort, setSort] = useState<SortKey>('total')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const groups = useMemo(() => facets(rows, picked, query), [rows, picked, query])
  const filtered = useMemo(() => applyFilters(rows, picked, query), [rows, picked, query])
  const sorted = useMemo(() => sortRows(filtered, sort, dir), [filtered, sort, dir])

  const totals = useMemo(() => statsOf(rows), [rows])
  const shownAnimals = useMemo(() => sorted.reduce((n, r) => n + r.total, 0), [sorted])

  /* Fifty at a time, through the product's own pager. `reset` is keyed on everything that
     changes the list, so narrowing to 12 rows while scrolled to row 400 cannot ask for a page
     that no longer exists. */
  const page = usePaged<SpeciesListRow>(
    (offset, limit) => ({ rows: sorted.slice(offset, offset + limit), total: sorted.length }),
    50,
    [sorted],
  )

  const toggle = useCallback(
    (key: FacetKey, value: string) => {
      narrow((prev) => {
        const next: Picked = { ...prev.picked }
        const set = new Set(prev.picked[key] ?? [])
        if (set.has(value)) set.delete(value)
        else set.add(value)
        if (set.size) next[key] = set
        else delete next[key]
        return { ...prev, picked: next }
      })
    },
    [narrow],
  )

  const clear = useCallback(() => narrow(() => ({ picked: {}, query: '' })), [narrow])

  const onSort = useCallback((key: SortKey) => {
    setSort((prev) => {
      if (prev === key) {
        /* Same column: flip. A third click returning to unsorted is a state nobody asks for
           and one the header cannot show. */
        setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
        return prev
      }
      /* A new column opens biggest-first, except the name, which opens A–Z. */
      setDir(key === 'name' ? 'asc' : 'desc')
      return key
    })
  }, [])

  const open = useCallback(
    (row: SpeciesListRow) => go(`e/species/${encodeURIComponent(row.id)}`),
    [go],
  )

  return (
    <div className="content-box w-full px-[var(--gutter)] pb-4">
      <Header rows={sorted} scope={scope} />

      <div className="mt-4">
        <StatBand t={totals} />
      </div>

      {/* ONE COLUMN NOW, AND THE TABLE HAS ALL OF IT. The 21/79 grid that used to hold the filter
          rail is gone with the rail — see the note on `FilterBar`. The three surfaces stack in the
          order a reader uses them: what the collection is, how to narrow it, what is left. */}
      <div className="mt-4">
        <FilterBar groups={groups} picked={picked} onToggle={toggle} onClear={clear} />
      </div>

      <section className="mt-4 min-w-0 rounded-[var(--radius-card)] bg-white p-[var(--pad-card-sm)]">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="min-w-0">
            <h2 className="text-[length:var(--fs-title)] leading-[var(--lh-title)] font-semibold tracking-[-0.2px] text-[#1c1a16]">
              Results
            </h2>
            {/* The one line on the page that moves with the filters — see the note on
                `statsOf`. Both halves are of the SAME set, so they cannot disagree. */}
            <p className="mt-0.5 text-caption tabular-nums" style={{ color: FAINT }}>
              {fmt(sorted.length)} species · {fmt(shownAnimals)} animals
            </p>
          </div>
          <SearchField value={query} onChange={setQuery} />
        </header>

        {sorted.length === 0 ? (
          <Empty onClear={clear} />
        ) : (
          <>
            <SpeciesTable
              rows={page.rows}
              offset={0}
              sort={sort}
              dir={dir}
              onSort={onSort}
              onOpen={open}
              href={(r) => href(`e/species/${encodeURIComponent(r.id)}`)}
            />
            <MoreRows page={page} noun="species" />
          </>
        )}
      </section>
    </div>
  )
}

/* ── header, search, empty ───────────────────────────────────────────────── */

/**
 * Title and the export, and nothing between them.
 *
 * The router renders this page with `titleInBody`, so the shell draws the breadcrumb trail and
 * stops — this row is the page's only title. The brief asks for no breadcrumbs of our own and
 * there are none.
 */
function Header({ rows, scope }: { rows: SpeciesListRow[]; scope: ReturnType<typeof useScope>['scope'] }) {
  const link = useRef<HTMLAnchorElement>(null)

  /**
   * The rows on screen, serialised in the browser.
   *
   * NO NEW ENDPOINT, and none needed: the table was derived here, so the file is the array that
   * drew it. An export assembled from a second query is a second reading of the collection, and
   * the two would eventually differ. Revoked on the next frame — the click has already started
   * the download by then, and an un-revoked blob URL holds the whole string for the session.
   */
  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = link.current
    if (!a) return
    a.href = url
    a.download = csvName(scope)
    a.click()
    requestAnimationFrame(() => URL.revokeObjectURL(url))
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <h1 className="min-w-0 truncate text-[length:var(--fs-name)] leading-[var(--lh-name)] font-semibold tracking-[-0.4px] text-[#16150f]">
        Species List
      </h1>
      <button
        type="button"
        onClick={download}
        className="card-press tap-tall flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-body font-medium text-[#3d3a34] transition-colors hover:bg-[#f4f9f6]"
      >
        <Download size={14} strokeWidth={2} style={{ color: GREEN }} aria-hidden />
        Download
      </button>
      <a ref={link} className="hidden" aria-hidden tabIndex={-1} />
    </div>
  )
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full bg-[#f4f6f4] px-3 py-2 @[560px]:max-w-[280px] @[560px]:flex-none focus-within:ring-2 focus-within:ring-[#37bd69]/35">
      <Search size={14} strokeWidth={2} className="shrink-0" style={{ color: FAINT }} aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search species…"
        aria-label="Search species by common or scientific name"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-small text-[#1c1a16] outline-none placeholder:text-[#736e67]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="-mr-1 grid size-5 shrink-0 place-items-center rounded-full active:bg-[#e6eae7]"
        >
          <X size={13} strokeWidth={2} style={{ color: MUTED }} aria-hidden />
        </button>
      )}
    </label>
  )
}

/** The only prose on the page, and the one place a blank table would say nothing. */
function Empty({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1 py-14 text-center">
      <p className="text-body font-semibold text-[#1c1a16]">No species found</p>
      <p className="text-small" style={{ color: MUTED }}>
        Try removing or changing your filters.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="card-press mt-3 rounded-full px-4 py-2 text-small font-semibold text-white"
        style={{ backgroundColor: GREEN }}
      >
        Clear filters
      </button>
    </div>
  )
}
