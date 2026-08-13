/**
 * WHERE THIS SPECIES ACTUALLY LIVES — every site, every enclosure, counted from the register.
 *
 * THE SPECIES PAGE IS ONE SITE'S POPULATION; THIS TAB IS NOT. A species id is
 * `<siteKey>:<name-slug>`, so every other tab on this page reads one site's animals. A curator
 * asking "where are the Ochre Warblers" does not mean "where are the ones at Stonehaven" —
 * 1,115 of the 2,411 held common names sit at more than one site. So the tab aggregates by
 * NAME across `speciesByName`, and the id is used for exactly one thing: saying which of the
 * rows is the population this page is otherwise about, so a reader is never left working out
 * which line they arrived on.
 *
 * THIS TAB DOES NOT MOVE WITH THE DATE FILTER. `animals.bin` is a snapshot of who is housed
 * where on the extract's last day and carries no enclosure-move history, so there is no honest
 * way to answer "which enclosure was this animal in last March" — the question the window pill
 * above implies can be asked of everything under it. Every other tab here is a period; this one
 * is a position.
 *
 * ONE CARD, AND THE SHAPE IS A WORKSPACE RATHER THAN A DASHBOARD: a view toggle, a search, and a
 * table. The sex-split bars and the lead sentence that used to sit above it were a second,
 * softer telling of the M / F / U columns already in every row — the same walk, drawn twice, in
 * the one place a reader is trying to scan a table.
 *
 * COUNTED, NOT MODELLED. The sex split is `core/animals.ts`'s walk over the register spans, not
 * `population.ts`'s `speciesRows`, whose male/female/unknown come from an authored unsexed-rate
 * table. The two disagree on real data: Umber Langur at Pinecrest is 2,000 / 1,991 / 0 in
 * `animals.bin` where the rate table would invent an unsexed share of about 4%. It is also why
 * a site row's total is the sum of its own enclosure cells rather than `Species.weight` — the
 * two are equal (verified on all 4,745 housed pairs, with `enclosure` resolved on all 110,005
 * register rows), and summing the parts means a row's total and its parts cannot disagree on
 * screen even if that ever stops being true.
 *
 * THE "PAIRS" COLUMN COUNTS ENCLOSURES HOLDING BOTH SEXES, because no pairing, mate or
 * breeding-unit record exists anywhere in the dump and the two plausible derivations of one
 * disagree by four times on real data (Sable Kestrel at Lakeside Sanctuary: 61 by
 * sum-of-min(M,F), 14 by enclosures-holding-both-sexes). This is the second of those — a thing
 * the register actually contains — and tapping the figure opens exactly the enclosures it
 * counted, so the number can be checked against its own evidence in one click.
 *
 * WHAT THIS TAB CANNOT SHOW, and why:
 *   CAPACITY, OCCUPANCY % AND ENCLOSURE STATUS — the schema stores an enclosure as a name and
 *     nothing else. `build.py` emits `{id, name, siteKey}` per enclosure and `hydrate()`
 *     hard-sets `capacity: 0` and `kind: ''` on all 15,959 of them, so there is no "12 / 20
 *     occupied" figure and nothing behind Available / Near Capacity / At Capacity / Over
 *     Capacity / Restricted / Under Maintenance. Those two columns are absent rather than
 *     dashed: a column of 825 em dashes is furniture, and one filled with a derived guess would
 *     be a stated figure that is wrong.
 *   "BREEDING READY" — a maturity claim. `born` is absent on 89,579 of 110,005 animals (81%)
 *     and `maturity_age_years` exists for 775 of 2,339 species, so the strongest supportable
 *     statement is which sexes are present. `compositionOf` already words it that way.
 *   SECTION (Site › Section › Enclosure) — the ETL reads `housing.section_name` only to count
 *     distinct sections per site and never emits it per animal, so an animal cannot be placed
 *     in one.
 *   MICROCHIP, RING, BREED, MORPH, WEIGHT — selected by neither the register tuple nor, mostly,
 *     the ETL's housing getter. The per-animal identity a housing tab would like to show is not
 *     in `animals.bin` at all.
 *
 * AND WHAT THE PAIRING TAB OWNS INSTEAD. The enclosures here are NOT re-banded into "both sexes
 * / needs sexing / single sex" counts — `speciesPairing.tsx` is that card, on this same page,
 * and two tabs counting the same enclosures into the same three buckets is two chances for the
 * page to disagree with itself. Composition appears here only as a per-row reading of the row
 * the reader is looking at.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { Boxes, ChevronRight, MapPin, type LucideIcon } from 'lucide-react'
import { holdingsByEnclosure, type EnclosureHolding } from '../core/animals'
import { siteOf, speciesByName, speciesOf } from '../core/world'
import { ACCENT_INK, DEEP, FAINT, INK, Section, TRACK, VALUE, fmt } from '../exec/system'
import { useDrill } from './drillNav'
import { FindField } from './filters'
import { TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'
import { useSheet } from './sheet'

/** One site's holding of one common name. Every field is counted; none is apportioned. */
interface SiteHolding {
  siteKey: string
  siteName: string
  siteCode: string
  male: number
  female: number
  undetermined: number
  total: number
  enclosures: number
  /**
   * The enclosures holding at least one male AND at least one female.
   *
   * THIS IS WHAT THE "PAIRS" COLUMN COUNTS, and the rows are kept rather than just their length
   * because the column is tappable: the count opens the enclosures behind it. It is NOT a pair
   * record — none exists in the extract — and the two plausible derivations of one disagree by
   * four times on real data (Sable Kestrel at Lakeside Sanctuary: 61 by sum-of-min(M,F), 14 by
   * enclosures-holding-both-sexes). This is the second of those, because it counts a thing that
   * is actually in the register.
   */
  bothSexesRows: EnclosureHolding[]
}

/**
 * The two views, as a segmented control.
 *
 * REGROUPING, NOT REFETCHING. Both views are the same animals — the enclosure cells summed by
 * site, or listed as they are. That is why it is a toggle rather than two cards: a reader who
 * adds up the enclosure rows gets the site rows, and the control says so by sitting between
 * them rather than beside them.
 *
 * Drawn here rather than pulled from the design system because the system has no segmented
 * control: `Filter` is a popup facet list and `Option` in `cardWindow` is a full-width menu
 * row, and neither is a two-state switch that has to sit above a table without becoming the
 * loudest thing in the card. The colours are system tokens so it still cannot drift.
 */
function Segments<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: [T, string, LucideIcon][]
  onChange: (v: T) => void
}) {
  return (
    /* A `span` rather than a `div`, because this now sits in `Section`'s `aside`, which is a
       span — a block element inside it is invalid markup the browser silently re-parents. */
    <span className="flex gap-1.5" role="group">
      {options.map(([key, label, Glyph]) => {
        const on = key === value
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className="card-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium"
            style={on ? { backgroundColor: DEEP, color: '#ffffff' } : { backgroundColor: TRACK, color: '#44544a' }}
          >
            <Glyph size={13} strokeWidth={2} aria-hidden />
            {label}
          </button>
        )
      })}
    </span>
  )
}

/* ── the housing table ───────────────────────────────────────────────────── */

/**
 * One column of the housing table.
 *
 * `sticky` is a LEFT OFFSET IN PIXELS, not a boolean, because two columns are pinned and the
 * second has to know how wide the first is. Getting it from the DOM would mean measuring on
 * every render; declaring it beside the width that produces it keeps the two numbers adjacent
 * and wrong together rather than apart and wrong separately.
 */
export interface HCol<T> {
  key: string
  head: string
  align?: 'right'
  width?: string
  sticky?: number
  /** The identifying column — carries the row's weight. One per table. */
  strong?: boolean
  /** Ordinals and other supporting figures, set back so the counts read first. */
  muted?: boolean
  cell: (row: T, i: number) => ReactNode
}

/**
 * THE HOUSING TABLE — a real table at every width, scrolled rather than restacked.
 *
 * WHY THIS IS NOT `DataTable`. The kit's table drops low-priority columns at tablet and becomes
 * a stack of cards on a phone, which is the right default for the analytical tabs and the wrong
 * one here: this tab is a location workspace whose whole value is reading M / F / U / Total
 * across a row, and a card per site is that row taken apart. So the table keeps all its columns
 * at all widths and scrolls horizontally, with the ordinal and the name pinned to the left edge
 * so the row a reader is scrolling stays identified.
 *
 * EVERY VISUAL HERE IS AN EXISTING TOKEN. The header type is `mortalityTable`'s — `text-overline`
 * semibold uppercase — over the palette's own recessive surface; the row hairline, the hover
 * wash and the chevron are that table's too. Nothing is a new colour, and the only thing this
 * component adds to the product is the pinning.
 *
 * THE ROW BACKGROUND IS A CLASS, NOT A STYLE, and that is load-bearing rather than stylistic: an
 * inline `backgroundColor` outranks a `hover:` class, so setting the active tint inline would
 * silently kill the hover state on exactly the row the reader is most likely to point at.
 */
export function HousingTable<T>({
  rows,
  columns,
  keyOf,
  onOpen,
  active,
}: {
  rows: T[]
  columns: HCol<T>[]
  keyOf: (row: T) => string
  onOpen?: (row: T) => void
  /** The row this page already belongs to — tinted so the reader can find it in a long list. */
  active?: (row: T) => boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse">
        <thead>
          <tr>
            {columns.map((c, ci) => (
              <th
                key={c.key}
                className={`px-3 py-2.5 text-overline font-semibold whitespace-nowrap uppercase ${
                  c.align === 'right' ? 'text-right' : 'text-left'
                } ${ci === 0 ? 'rounded-l-[8px]' : ''} ${
                  !onOpen && ci === columns.length - 1 ? 'rounded-r-[8px]' : ''
                } ${c.sticky !== undefined ? 'sticky z-20' : ''}`}
                style={{ backgroundColor: TRACK, color: '#44544a', width: c.width, left: c.sticky }}
              >
                {c.head}
              </th>
            ))}
            {onOpen && (
              <th className="w-[30px] rounded-r-[8px]" style={{ backgroundColor: TRACK }} aria-hidden />
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={keyOf(row)}
              onClick={onOpen ? () => onOpen(row) : undefined}
              className={`border-b last:border-0 ${
                onOpen ? 'cursor-pointer transition-colors' : ''
              } ${active?.(row) ? 'bg-[#f2f8f4] hover:bg-[#ecf4ef]' : 'bg-white hover:bg-[#faf9f7]'}`}
              style={{ borderColor: '#f6f5f2' }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-3.5 text-small whitespace-nowrap ${
                    c.align === 'right' ? 'text-right tabular-nums' : ''
                  } ${c.strong ? 'font-medium' : ''} ${c.sticky !== undefined ? 'sticky z-10 bg-inherit' : ''}`}
                  style={{ color: c.muted ? FAINT : c.strong ? INK : VALUE, left: c.sticky }}
                >
                  {c.cell(row, i)}
                </td>
              ))}
              {onOpen && (
                <td className="px-2 py-3.5 align-middle" style={{ color: ACCENT_INK }} aria-hidden>
                  <ChevronRight size={13} strokeWidth={2.25} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The one empty state this tab can reach, in the product's own inline form. */
function NoRecords() {
  return (
    <div className="py-10 text-center">
      <p className="text-small font-medium" style={{ color: INK }}>
        No housing records found
      </p>
      <p className="mt-1 text-caption" style={{ color: FAINT }}>
        Try changing your search or selected housing view.
      </p>
    </div>
  )
}

/**
 * THE HOUSING TAB — which sites hold this species, and which enclosures within them.
 *
 * Answers one question in two grains: "where is it" at site level, and "where exactly" at
 * enclosure level, both as counts of THIS species and never as shares of anything. It does not
 * restate the Animal Population page: there is no trend, no window, no class breakdown and no
 * collection-wide figure here — only the position of one name, today.
 */
export function SpeciesHousingTab({ speciesId, name }: { speciesId: string; name: string }) {
  const { drillTo } = useDrill()
  const { open } = useSheet()
  const [view, setView] = useState<'site' | 'enclosure'>('site')
  const [query, setQuery] = useState('')

  /* ONE WALK PER POPULATION OF THIS NAME, and the site totals are built from the same walk that
     builds the enclosure rows so the two views cannot report different animals. The cost is
     bounded and measured rather than assumed: the largest common name in the dump is Umber
     Langur at 4,010 animals across two sites, and the largest single (site, species) is Auburn
     Caramel Peryton at Riverside with 2,072 — a few thousand integer reads, which is why the
     paging in this file is in the VIEW and not in the derivation. */
  const { sites, enclosures } = useMemo(() => {
    const pops = speciesByName(name).filter((sp) => sp.weight > 0)
    const encs: EnclosureHolding[] = []
    const rows: SiteHolding[] = []

    for (const sp of pops) {
      const held = holdingsByEnclosure(sp.id)
      if (!held.length) continue
      encs.push(...held)
      const site = siteOf(sp.siteKey)
      rows.push({
        siteKey: sp.siteKey,
        siteName: site?.name ?? sp.siteKey,
        siteCode: site?.code ?? '',
        male: held.reduce((n, h) => n + h.male, 0),
        female: held.reduce((n, h) => n + h.female, 0),
        undetermined: held.reduce((n, h) => n + h.undetermined, 0),
        total: held.reduce((n, h) => n + h.total, 0),
        enclosures: held.length,
        bothSexesRows: held.filter((h) => h.male > 0 && h.female > 0),
      })
    }

    /* Every site, in order of how many are held — not a top five. `siteRows` in the population
       module truncates at five because it ranks fifty sites against each other; here the row
       set is the sites that hold ONE name, which tops out at eleven in the whole dump. */
    return {
      sites: rows.sort((a, b) => b.total - a.total),
      enclosures: encs.sort((a, b) => b.total - a.total),
    }
  }, [name])

  const q = query.trim().toLowerCase()

  /* Site name AND code, because a curator who knows a site as "RIV" should not have to know it
     is Riverside Sanctuary to find it. */
  const siteRows = useMemo(
    () => (q ? sites.filter((s) => `${s.siteName} ${s.siteCode}`.toLowerCase().includes(q)) : sites),
    [sites, q],
  )

  const encRows = useMemo(
    () =>
      q
        ? enclosures.filter((e) =>
            `${e.enclosureName} ${siteOf(e.siteKey)?.name ?? e.siteKey}`.toLowerCase().includes(q),
          )
        : enclosures,
    [enclosures, q],
  )

  /* PAGED BECAUSE THE SPREAD IS ENORMOUS. The median (site, species) occupies two enclosures and
     the ninetieth percentile nine, but Auburn Caramel Peryton at Riverside occupies 807 — so a
     fixed list of several hundred is mostly empty space for the median species and a silent
     truncation for the outlier. `MoreRows` states the real total either way.

     TWELVE RATHER THAN THE EIGHT THIS CARRIED AS A LIST. The rows are table rows now, roughly
     half the height of the `TapRow`s they replaced, so eight of them left the card ending well
     above the fold it used to fill. */
  const page = usePaged<EnclosureHolding>(
    (offset, limit) => ({ rows: encRows.slice(offset, offset + limit), total: encRows.length }),
    12,
    [encRows],
  )

  /* NOTHING HELD ANYWHERE MEANS NO TAB, not an empty table under a heading that implies we
     looked at somewhere. 972 of the 5,717 (site, species) pairs carry a weight of zero because
     they appear only in a mortality or accession record. */
  if (!sites.length) return null

  /* The site this page is otherwise about — the one in the id, not the one at the top of the
     list. It may legitimately be absent from the rows: a species page exists for every pair the
     data names, including the ones that hold nothing today. */
  const thisSiteKey = speciesOf(speciesId)?.siteKey

  const visible = view === 'site' ? siteRows.length : encRows.length

  /**
   * SITE ROW → THE SAME TAB, ENCLOSURE-WISE, NARROWED TO THAT SITE.
   *
   * The drill the tab already owns rather than a new destination: the enclosure view and its
   * search are both here, so "show me this site's enclosures" is a view switch and a filter,
   * not a page. The site's NAME goes into the search box rather than into a hidden filter
   * because the box is the one control that already explains itself — the reader sees what
   * narrowed the list and `FindField`'s own clear button undoes it.
   *
   * Safe as an exact-name match: measured across all 50 sites in the extract, no site name is a
   * substring of another, so the filter cannot pull in a neighbour.
   */
  const openSite = (s: SiteHolding) => {
    setView('enclosure')
    setQuery(s.siteName)
  }

  /**
   * THE PAIRS COUNT OPENS THE ENCLOSURES IT COUNTED, which is the only honest destination.
   *
   * There is no pairing record in the extract to list, so the sheet shows the enclosures that
   * put both sexes together — the thing the number actually counted — and each row leaves for
   * that enclosure's own page. No new flow: this is `useSheet` and `TapRow`, the same pair the
   * Pairing tab's own drill-down uses.
   */
  const openPairs = (s: SiteHolding) =>
    open({
      title: 'Enclosures holding both sexes',
      eyebrow: `${name} · ${s.siteName}`,
      body: (
        <TapList>
          {s.bothSexesRows.map((e) => (
            <TapRow
              key={e.enclosureId}
              label={e.enclosureName}
              sub={`${fmt(e.male)} M · ${fmt(e.female)} F · ${fmt(e.undetermined)} U`}
              value={fmt(e.total)}
              onOpen={() => drillTo({ kind: 'enclosure', id: e.enclosureId }, { module: 'species', label: name })}
            />
          ))}
        </TapList>
      ),
    })

  const siteColumns: HCol<SiteHolding>[] = [
    { key: 'no', head: 'No', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
    { key: 'site', head: 'Site', sticky: 52, strong: true, cell: (s) => s.siteName },
    { key: 'm', head: 'M', align: 'right', width: '64px', cell: (s) => fmt(s.male) },
    { key: 'f', head: 'F', align: 'right', width: '64px', cell: (s) => fmt(s.female) },
    { key: 'u', head: 'U', align: 'right', width: '64px', cell: (s) => fmt(s.undetermined) },
    { key: 'total', head: 'Total', align: 'right', width: '84px', strong: true, cell: (s) => fmt(s.total) },
    { key: 'enclosures', head: 'Enclosures', align: 'right', width: '110px', cell: (s) => fmt(s.enclosures) },
    {
      key: 'pairs',
      head: 'Pairs',
      align: 'right',
      width: '84px',
      /* The only cell on the row with its own handler, so the click has to be stopped from
         reaching the row underneath it — otherwise opening the pairs sheet would also switch
         the view out from under it. */
      cell: (s) =>
        s.bothSexesRows.length > 0 ? (
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation()
              openPairs(s)
            }}
            className="card-press rounded-[6px] px-1 font-medium underline decoration-dotted underline-offset-4"
            style={{ color: ACCENT_INK }}
          >
            {fmt(s.bothSexesRows.length)}
          </button>
        ) : (
          fmt(0)
        ),
    },
  ]

  const encColumns: HCol<EnclosureHolding>[] = [
    { key: 'no', head: 'No', width: '52px', sticky: 0, muted: true, cell: (_r, i) => i + 1 },
    { key: 'enclosure', head: 'Enclosure', sticky: 52, strong: true, cell: (e) => e.enclosureName },
    { key: 'site', head: 'Site', cell: (e) => siteOf(e.siteKey)?.name ?? e.siteKey },
    { key: 'm', head: 'M', align: 'right', width: '64px', cell: (e) => fmt(e.male) },
    { key: 'f', head: 'F', align: 'right', width: '64px', cell: (e) => fmt(e.female) },
    { key: 'u', head: 'U', align: 'right', width: '64px', cell: (e) => fmt(e.undetermined) },
    { key: 'total', head: 'Total', align: 'right', width: '84px', strong: true, cell: (e) => fmt(e.total) },
  ]

  return (
    <Section
      wide
      icon={view === 'site' ? MapPin : Boxes}
      label={`${view === 'site' ? 'Sites' : 'Enclosures'} · ${fmt(view === 'site' ? sites.length : enclosures.length)}`}
      aside={
        <Segments
          value={view}
          options={[
            ['site', 'Site-Wise', MapPin],
            ['enclosure', 'Enclosure-Wise', Boxes],
          ]}
          onChange={(v) => {
            setView(v)
            /* CLEARED ON THE SWITCH, and this is a correctness fix rather than a courtesy. A
               query typed against 800 enclosures would otherwise survive into the site view and
               silently filter it. The one path that deliberately carries a query across is
               `openSite`, which sets the view and the query together. */
            setQuery('')
          }}
        />
      }
    >
      <div className="mb-4">
        <FindField
          value={query}
          onChange={setQuery}
          placeholder={view === 'site' ? 'Search sites...' : 'Search enclosures...'}
        />
      </div>

      {visible === 0 ? (
        <NoRecords />
      ) : view === 'site' ? (
        <HousingTable
          rows={siteRows}
          columns={siteColumns}
          keyOf={(s) => s.siteKey}
          onOpen={openSite}
          active={(s) => s.siteKey === thisSiteKey}
        />
      ) : (
        <>
          <HousingTable
            rows={page.rows}
            columns={encColumns}
            keyOf={(e) => e.enclosureId}
            onOpen={(e) => drillTo({ kind: 'enclosure', id: e.enclosureId }, { module: 'species', label: name })}
          />
          {/* The noun changes under a search because the total does: a filtered list saying
              "8 of 34 enclosures" would state a population of 34 for a species that has 807.
              "Matching enclosures" is what the 34 actually is. */}
          <MoreRows page={page} noun={q ? 'matching enclosures' : 'enclosures'} />
        </>
      )}
    </Section>
  )
}

