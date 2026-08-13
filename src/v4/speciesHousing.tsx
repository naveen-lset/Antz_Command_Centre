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
 * THIS TAB DOES NOT MOVE WITH THE DATE FILTER, and it says so on screen rather than quietly
 * ignoring it. `animals.bin` is a snapshot of who is housed where on the extract's last day and
 * carries no enclosure-move history, so there is no honest way to answer "which enclosure was
 * this animal in last March" — the question the window pill above implies can be asked of
 * everything under it. Every other tab here is a period; this one is a position. A tab that
 * silently ignored the pill the header is displaying would be the exact contradiction this
 * product spends its effort avoiding, so the reading date is stated twice: in the card's aside
 * and in the prose under it.
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
 * WHAT THIS TAB DELIBERATELY DOES NOT SHOW, and why:
 *   PAIRS — no pairing, mate or breeding-unit record exists anywhere in the dump, and the two
 *     plausible derivations disagree by four times on real data (Sable Kestrel at Lakeside
 *     Sanctuary: 61 by sum-of-min(M,F), 14 by enclosures-holding-both-sexes). What replaces the
 *     column counts enclosures holding both sexes, which is a thing that can actually be
 *     counted, and it is named for what it counts.
 *   "BREEDING READY" — a maturity claim. `born` is absent on 89,579 of 110,005 animals (81%)
 *     and `maturity_age_years` exists for 775 of 2,339 species, so the strongest supportable
 *     statement is which sexes are present. `compositionOf` already words it that way.
 *   CAPACITY AND OCCUPANCY % — the schema stores an enclosure as a name and nothing else, so
 *     `hydrate()` hard-sets `capacity: 0` on every row. There is no "12 / 20 occupied" figure.
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

import { useMemo, useState } from 'react'
import { Boxes, MapPin } from 'lucide-react'
import { compositionOf, holdingsByEnclosure, type EnclosureHolding } from '../core/animals'
import { TODAY, longDate } from '../core/calendar'
import { siteOf, speciesByName, speciesOf } from '../core/world'
import { Bars, DEEP, FAINT, Rule, Section, TRACK, fmt } from '../exec/system'
import { useDrill } from './drillNav'
import { FindField } from './filters'
import { TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'

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
  /** Enclosures with at least one male AND at least one female. NOT a pair count. */
  bothSexes: number
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
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <div className="mb-4 flex gap-1.5" role="group">
      {options.map(([key, label]) => {
        const on = key === value
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className="card-press shrink-0 rounded-full px-3 py-1 text-caption font-medium"
            style={on ? { backgroundColor: DEEP, color: '#ffffff' } : { backgroundColor: TRACK, color: '#44544a' }}
          >
            {label}
          </button>
        )
      })}
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
        bothSexes: held.filter((h) => h.male > 0 && h.female > 0).length,
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

  /* PAGED AT EIGHT BECAUSE THE SPREAD IS ENORMOUS. The median (site, species) occupies two
     enclosures and the ninetieth percentile nine, but Auburn Caramel Peryton at Riverside
     occupies 807 — so a fixed list of twenty is mostly empty space for the median species and
     a silent truncation for the outlier. `MoreRows` states the real total either way. */
  const page = usePaged<EnclosureHolding>(
    (offset, limit) => ({ rows: encRows.slice(offset, offset + limit), total: encRows.length }),
    8,
    [encRows],
  )

  /* NOTHING HELD ANYWHERE MEANS NO TAB, not an empty table under a heading that implies we
     looked at somewhere. 972 of the 5,717 (site, species) pairs carry a weight of zero because
     they appear only in a mortality or accession record. */
  if (!sites.length) return null

  const held = sites.reduce(
    (a, s) => ({
      male: a.male + s.male,
      female: a.female + s.female,
      undetermined: a.undetermined + s.undetermined,
      total: a.total + s.total,
      enclosures: a.enclosures + s.enclosures,
      bothSexes: a.bothSexes + s.bothSexes,
    }),
    { male: 0, female: 0, undetermined: 0, total: 0, enclosures: 0, bothSexes: 0 },
  )

  /* The site this page is otherwise about — the one in the id, not the one at the top of the
     list. It may legitimately be absent from the rows: a species page exists for every pair the
     data names, including the ones that hold nothing today. */
  const thisSiteKey = speciesOf(speciesId)?.siteKey
  const thisSite = sites.find((s) => s.siteKey === thisSiteKey)
  const thisSiteName = siteOf(thisSiteKey ?? '')?.name

  const asOf = longDate(TODAY)
  const searchable = view === 'site' ? sites.length : enclosures.length
  const visible = view === 'site' ? siteRows.length : encRows.length

  return (
    <>
      <Section icon={MapPin} label="Where they are held" aside={`as of ${asOf}`}>
        {/* A LEAD LINE RATHER THAN A HERO NUMBER. The figure a reader wants here is not one
            number, it is the relationship between three — how many, spread over how many
            sites, in how many enclosures — and a 40pt headcount above two captions puts the
            wrong one of the three in the largest type. */}
        <p className="text-lead text-balance" style={{ color: '#1c1a16' }}>
          <span className="font-semibold tabular-nums">{fmt(held.total)}</span> held across{' '}
          <span className="font-semibold tabular-nums">{fmt(sites.length)}</span>{' '}
          {sites.length === 1 ? 'site' : 'sites'}, in{' '}
          <span className="font-semibold tabular-nums">{fmt(held.enclosures)}</span>{' '}
          {held.enclosures === 1 ? 'enclosure' : 'enclosures'}.
        </p>

        {/* The same wording the Overview tab uses for the same walk, deliberately — two cards
            counting the same register with two different phrasings read as two claims. */}
        <Rule label="Sex · counted from the register" />
        <Bars
          items={[
            { label: 'Male', value: held.male },
            { label: 'Female', value: held.female },
            { label: 'Undetermined', value: held.undetermined },
          ]}
          showShare
          precise
        />

        <p className="mt-4 text-caption leading-relaxed" style={{ color: FAINT }}>
          Counted where every animal is housed on {asOf}, the extract’s last day. This tab is a
          position rather than a period, so it does not move with the date filter above it —
          there is no enclosure-move history in the source to window it against.
        </p>

        {/* SAID ONLY WHEN IT IS TRUE, and it is worth saying: a reader who opened the
            Stonehaven page and finds nine rows, none of them Stonehaven, is owed the reason. */}
        {thisSiteName && !thisSite && (
          <p className="mt-2 text-caption leading-relaxed" style={{ color: FAINT }}>
            None are held at {thisSiteName}, the site this page belongs to. The rows below are
            the other sites that hold the name.
          </p>
        )}
      </Section>

      <Section
        icon={Boxes}
        label={view === 'site' ? 'Site-wise' : 'Enclosure-wise'}
        aside={
          view === 'site'
            ? `${fmt(sites.length)} ${sites.length === 1 ? 'site' : 'sites'}`
            : `${fmt(enclosures.length)} ${enclosures.length === 1 ? 'enclosure' : 'enclosures'}`
        }
      >
        <Segments
          value={view}
          options={[
            ['site', 'Site-wise'],
            ['enclosure', 'Enclosure-wise'],
          ]}
          onChange={(v) => {
            setView(v)
            /* CLEARED ON THE SWITCH, and this is a correctness fix rather than a courtesy. The
               field is only rendered past twelve rows, which for the site view is never — so a
               query typed against 800 enclosures would survive the switch, silently filter the
               site list, and hide sites with no visible field to explain why. */
            setQuery('')
          }}
        />

        {/* SEARCH ONLY WHERE THERE IS SOMETHING TO SEARCH. Site-wise tops out at eleven rows
            for any name in the dump, so the field would be permanent furniture over a list
            already short enough to read; enclosure-wise routinely is not. */}
        {searchable > 12 && (
          <div className="mb-4">
            <FindField
              value={query}
              onChange={setQuery}
              placeholder={view === 'site' ? 'Search sites' : 'Search enclosures'}
            />
          </div>
        )}

        {q && visible === 0 ? (
          <p className="text-small" style={{ color: '#6d6860' }}>
            No {view === 'site' ? 'site' : 'enclosure'} matches “{query.trim()}”.
          </p>
        ) : view === 'site' ? (
          <TapList>
            {siteRows.map((s) => (
              <TapRow
                key={s.siteKey}
                label={s.siteName}
                /* The sub carries the columns the reference design draws as columns — M, F, U,
                   enclosures, both-sexes — because `TapRow` is the row every other list on this
                   page uses and forking its geometry for one table would be the fourteenth
                   slightly-different row in the product. Its sub WRAPS by design, which is what
                   makes a five-part line survive a phone width. */
                sub={[
                  s.siteCode,
                  `${fmt(s.male)} M · ${fmt(s.female)} F · ${fmt(s.undetermined)} U`,
                  `${fmt(s.enclosures)} ${s.enclosures === 1 ? 'enclosure' : 'enclosures'}`,
                  /* WHERE THE "PAIRS" COLUMN WAS. Named for what it counts, because it is not
                     a pair count and no pair count exists — see the note at the top. */
                  `${fmt(s.bothSexes)} with both sexes`,
                  s.siteKey === thisSiteKey ? 'this page’s site' : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
                value={fmt(s.total)}
                active={s.siteKey === thisSiteKey}
                onOpen={() => drillTo({ kind: 'site', id: s.siteKey }, { module: 'species', label: name })}
              />
            ))}
          </TapList>
        ) : (
          <>
            <TapList>
              {page.rows.map((e) => (
                <TapRow
                  key={e.enclosureId}
                  label={e.enclosureName}
                  /* THE SITE IS NAMED ON EVERY ROW, because an enclosure name on its own does
                     not say where it is — `ENCLOSURES[ix].id === .name`, the housing column
                     verbatim, with no site prefix in it. The composition leads the line rather
                     than sitting as a chip on the right: it is the reading of the row, and the
                     row's right-hand column is already spoken for by the count. */
                  sub={`${compositionOf(e)} · ${siteOf(e.siteKey)?.name ?? e.siteKey} · ${fmt(e.male)} M · ${fmt(e.female)} F · ${fmt(e.undetermined)} U`}
                  value={fmt(e.total)}
                  onOpen={() =>
                    drillTo({ kind: 'enclosure', id: e.enclosureId }, { module: 'species', label: name })
                  }
                />
              ))}
            </TapList>
            {/* The noun changes under a search because the total does: a filtered list saying
                "8 of 34 enclosures" would state a population of 34 for a species that has 807.
                "Matching enclosures" is what the 34 actually is. */}
            <MoreRows page={page} noun={q ? 'matching enclosures' : 'enclosures'} />
          </>
        )}

        {/* THE THREE GAPS IN ONE PLACE, under the table they qualify rather than as three
            asides nobody reads together. The third is the one most likely to be misread: a row
            here counts THIS species in that enclosure, not the enclosure's occupancy. */}
        <p className="mt-5 text-caption leading-relaxed" style={{ color: FAINT }}>
          The source holds no pairing or mate record, so there is no pair count — only
          enclosures in which both sexes are present. It holds no enclosure capacity either, so
          there is no occupancy percentage. And 1,456 of 15,959 enclosures hold more than one
          species, so these counts are of {name} in each enclosure, not of everything living
          there.
        </p>
      </Section>
    </>
  )
}
