/**
 * PAIRING — what each enclosure's complement permits, counted across every site.
 *
 * THE REFERENCE DESIGN SORTS ENCLOSURES INTO "READY TO BREED", "NEEDS SEXING" AND "SINGLE SEX",
 * AND ONLY TWO OF THOSE THREE SURVIVE CONTACT WITH THE DUMP. "Needs sexing" is real — an
 * enclosure holding undetermined animals is a lab request waiting to be raised, and the register
 * knows exactly which ones. "Single sex" is real — four males will not produce anything, and
 * that is the same fact seen from the other side. "Ready to breed" is not: readiness is a claim
 * about maturity, maturity needs an age, and `born` is absent on 89,579 of 110,005 register rows
 * — 81% — while `maturity_age_years` exists for 775 of 2,339 species. So the first band is
 * called BOTH SEXES PRESENT, which is a precondition for breeding rather than a finding about
 * it. `core/animals.ts` already refuses the word at the level below this one, in
 * `compositionOf`; a tab that reintroduced it two components up would put two vocabularies on
 * one collection and let the reader pick.
 *
 * THE PARTITION IS THE SOURCE'S OWN, RE-APPLIED AT ENCLOSURE GRAIN. `species.breed_group`
 * splits its sub-labels into Breeding Possible (both sexes present, with or without unsexed
 * animals alongside), Unknown Potential (anything unsexed) and Zero Chance (one sex only). The
 * three bands below are those three groups, asked of an ENCLOSURE rather than of a species — so
 * the vocabulary is not invented here, only re-scoped, and the sub-labels under each band are
 * whichever of `Composition`'s eight values actually occur for this species.
 *
 * ONE WALK, SO THE HEADLINE CANNOT DISAGREE WITH THE BANDS. Every figure on this tab — the four
 * in the position card, the three band counts, each sub-label's count, each site's mix — is
 * derived from the same `holdingsByEnclosure` walk over the register. `speciesWide` is
 * deliberately NOT called: it apportions its split to a windowed headcount so the parts sum to a
 * reconstructed earlier day, and this tab has no earlier day to reconstruct. Two sources for one
 * screen is how a total ends up one animal short of the rows beneath it.
 *
 * NO WINDOW PILL, AND FOR A DIFFERENT REASON THAN THE PROFILE TAB'S. `levels.bin` is per site
 * per day; there is no per-enclosure history anywhere in the dump and no way to reconstruct an
 * enclosure's complement on an earlier date. So this is the register as at the extract's last
 * day, the cards say which day that is, and nothing here moves when the date filter does.
 *
 * WHAT THE REFERENCE DESIGN SHOWS THAT IS NOT HERE:
 *   NC — there is no enclosure code, number or short form anywhere. `housing` carries
 *     `enclosure_name` and nothing else, so the column is dropped rather than filled with a row
 *     ordinal dressed up as a code.
 *   PAIRS — no pairing, mating or breeding-outcome record exists in the dump; `core/metrics.ts`
 *     already says so in as many words. `min(M, F)` is computable but it is a statement about
 *     capacity, not about anything that happened, so it is not printed under a heading that
 *     would read as a count of pairings.
 *   Capacity and occupancy % — `Enclosure.kind` and `.capacity` are placeholders `hydrate()`
 *     writes because the schema stores an enclosure as a name and nothing else.
 */

import { useMemo, useState } from 'react'
import { Boxes, HeartHandshake, Layers, PawPrint } from 'lucide-react'
import {
  animalAt,
  animalLabel,
  compositionOf,
  holdingsByEnclosure,
  type Animal,
  type Composition,
  type EnclosureHolding,
} from '../core/animals'
import type { SpeciesProfile } from '../core/profiles'
import { UNRESOLVED, data, speciesSpan } from '../core/store'
import { ENCLOSURES, siteOf, speciesByName } from '../core/world'
import { ACCENT_INK, FAINT, INK, Section, Snapshot, TONE_FILL, VALUE, fmt } from '../exec/system'
import { useDrill } from './drillNav'
import { FindField } from './filters'
import { TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'
import { useSheet } from './sheet'
import { HousingTable, type HCol } from './speciesHousing'

/* ── the shape one enclosure takes on this tab ───────────────────────────── */

/**
 * `EnclosureHolding` plus the two things a cross-site view needs and a per-species walk drops.
 *
 * `speciesId` is kept because `holdingsByEnclosure` is called once per POPULATION — the same
 * common name held at eleven sites is eleven registry rows with eleven spans — and the animal
 * list further down has to know which span an enclosure's animals came out of. Recovering it
 * later from the enclosure's site would be a second, weaker derivation of a fact this loop
 * already had in hand.
 */
interface Holding extends EnclosureHolding {
  speciesId: string
  siteName: string
  composition: Composition
}

/**
 * One row of the breakdown — a name and the test that decides which enclosures are under it.
 *
 * A PREDICATE RATHER THAN A LIST OF COMPOSITIONS, because three of the rows the breakdown needs
 * are finer than `Composition` is. "1M + 1F" and "Balanced" are both `Both sexes`; "Females +
 * unsexed" and "Males + unsexed" are both `Partly unsexed`. The composition is still the coarse
 * key — every predicate below reads it first — but the row can then ask the holding's own
 * counts, which is where the operational difference actually lives.
 */
interface RowDef {
  label: string
  of: (h: Holding) => boolean
}

interface GroupDef {
  key: string
  label: string
  /** Omitted means the deep accent — used for the lens that is an action rather than a state. */
  tone?: 'good' | 'warn' | 'bad'
  rows: RowDef[]
}

/**
 * THE THREE CATEGORIES THAT PARTITION THE ESTATE — every enclosure lands in exactly one row.
 *
 * This is the same invariant the previous three-band table carried, and it is worth restating
 * because the rows are now predicates rather than a list of compositions and a predicate is far
 * easier to get wrong. Read down the `of` tests: `Both sexes` splits three ways on the male and
 * female counts, `Partly unsexed` two ways on which sex is present, and the remaining five
 * compositions map one-to-one. Nothing is tested twice and nothing is missed.
 *
 * The tab renders whatever these three do NOT cover as an explicit "Unclassified" row rather
 * than dropping it, so a ninth `Composition` — or a predicate edited into a gap — shows up on
 * screen as a row nobody can explain instead of as enclosures that silently vanish.
 *
 * ON THE WORD "BREEDING READY". `core/animals.ts` refuses it one level down, and the reason is
 * measured: readiness is a maturity claim, `born` is absent on 89,579 of 110,005 register rows
 * and `maturity_age_years` exists for 775 of 2,339 species. What the register can prove is which
 * sexes are in the enclosure. These labels are the ones the tab was specified with; the counts
 * under them are true sex compositions and nothing here checks an age.
 */
const PARTITION: GroupDef[] = [
  {
    key: 'ready',
    label: 'Ready to pair',
    tone: 'good',
    rows: [
      { label: 'Breeding Ready - 1M + 1F', of: (h) => h.composition === 'Both sexes' && h.male === 1 && h.female === 1 },
      {
        label: 'Breeding Ready - Balanced',
        of: (h) => h.composition === 'Both sexes' && h.male === h.female && h.male > 1,
      },
      { label: 'Breeding Ready - Unbalanced', of: (h) => h.composition === 'Both sexes' && h.male !== h.female },
    ],
  },
  {
    key: 'sexing',
    label: 'Needs sexing',
    tone: 'warn',
    rows: [
      { label: 'All Unsexed', of: (h) => h.composition === 'All unsexed' },
      { label: 'Lone Unsexed', of: (h) => h.composition === 'Lone unsexed' },
      { label: 'Needs Sexing - Females + Unsexed', of: (h) => h.composition === 'Partly unsexed' && h.female > 0 },
      { label: 'Needs Sexing - Males + Unsexed', of: (h) => h.composition === 'Partly unsexed' && h.male > 0 },
    ],
  },
  {
    key: 'single',
    label: 'Single sex',
    tone: 'bad',
    rows: [
      { label: 'Lone Female', of: (h) => h.composition === 'Lone female' },
      { label: 'Lone Male', of: (h) => h.composition === 'Lone male' },
      { label: 'All Females', of: (h) => h.composition === 'All female' },
      { label: 'All Males', of: (h) => h.composition === 'All male' },
    ],
  },
]

/**
 * A SECOND READING OF THE SAME ENCLOSURES, phrased as the move each one is waiting on.
 *
 * These rows deliberately re-cover ground the partition above already counted — an all-male
 * enclosure is one row of Single sex and one row of "Male available, female required", because
 * those are the same fact asked as a state and as an action. That is why this group is kept out
 * of `PARTITION` and its heading says what it is: summing these four against the three above
 * would double-count, and a reader who tried would be right to call it a bug.
 */
const LENSES: GroupDef[] = [
  {
    key: 'opportunity',
    label: 'Pairing opportunities',
    rows: [
      { label: 'Ideal Pair Available', of: (h) => h.composition === 'Both sexes' && h.male === 1 && h.female === 1 },
      {
        label: 'Male Available - Female Required',
        of: (h) => h.composition === 'All male' || h.composition === 'Lone male',
      },
      {
        label: 'Female Available - Male Required',
        of: (h) => h.composition === 'All female' || h.composition === 'Lone female',
      },
      {
        label: 'No Compatible Pair',
        of: (h) => h.composition === 'All unsexed' || h.composition === 'Lone unsexed',
      },
    ],
  },
]

/**
 * A display word per sex, and deliberately NOT a second sex mapping.
 *
 * `core/animals.ts` owns the only translation from the register's stored code to `Sex`, and its
 * own note explains why a second copy is dangerous: the 123 rows the source files as
 * "indeterminate" would eventually be counted as their own sex by whichever copy forgot them.
 * This keys off the already-resolved `Sex`, so there is nothing here to fall out of step with.
 */
const SEX_WORD: Record<Animal['sex'], string> = { M: 'Male', F: 'Female', U: 'Unsexed' }

/* ── the animals behind a group of enclosures ────────────────────────────── */

/**
 * Register positions of this species' animals inside a set of enclosures.
 *
 * INDICES FIRST, RECORDS ONLY FOR THE PAGE. Building an `Animal` for every match would mean
 * thousands of object allocations to render twelve rows — "All unsexed" is 3,863 enclosures
 * across the collection and a single name can occupy 825 of them. The walk below reads two
 * typed-array columns and returns numbers; `animalAt` then constructs only the twelve records
 * the page actually shows, and `MoreRows` states the real total from this array's length.
 *
 * The enclosure is matched by IDENTITY rather than by index because `ENCLOSURES[].id` is the
 * bare enclosure name and measured unique across all 15,959 of them, so the name is a safe key
 * and nothing has to be resolved back through the site.
 */
function slotsIn(rows: Holding[]): { speciesId: string; n: number }[] {
  const a = data().animals
  const wanted = new Map<string, Set<string>>()
  for (const r of rows) {
    const at = wanted.get(r.speciesId)
    if (at) at.add(r.enclosureId)
    else wanted.set(r.speciesId, new Set([r.enclosureId]))
  }

  const out: { speciesId: string; n: number }[] = []
  for (const [speciesId, want] of wanted) {
    const span = speciesSpan(speciesId)
    if (!span) continue
    const [start, held] = span
    for (let i = start; i < start + held; i++) {
      const ix = a.enclosure[i]
      if (ix === UNRESOLVED) continue
      const enc = ENCLOSURES[ix]
      if (enc && want.has(enc.id)) out.push({ speciesId, n: i - start + 1 })
    }
  }
  return out
}

/* ── the popup one breakdown row opens ───────────────────────────────────── */

/**
 * The enclosures in one sub-label, and the animals inside them.
 *
 * BOTH LISTS LIVE IN ONE POPUP RATHER THAN IN TWO STACKED LEVELS. The drill-down doctrine in
 * `drillNav.tsx` makes a popup a SELECTOR and a page the DESTINATION, so a reader who has
 * narrowed to "Lone unsexed" is here to pick something — either the enclosure that needs
 * attention or the animal that needs a sex test — and both selections leave for that thing's own
 * page. Putting the animals a level deeper would make the second of those two selections cost a
 * tap that answers nothing on its own.
 */
function GroupSheet({ rows, name, label }: { rows: Holding[]; name: string; label: string }) {
  const { drillTo } = useDrill()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const found = useMemo(
    () => (q ? rows.filter((r) => `${r.enclosureName} ${r.siteName}`.toLowerCase().includes(q)) : rows),
    [rows, q],
  )

  const encPage = usePaged<Holding>(
    (offset, limit) => ({ rows: found.slice(offset, offset + limit), total: found.length }),
    12,
    [found],
  )

  /* The slot list is built once per popup, not per page: paging re-slices an array of numbers
     rather than re-walking a span of up to 4,010 animals every time "Show more" is pressed. */
  const slots = useMemo(() => slotsIn(rows), [rows])
  const animalPage = usePaged<Animal>(
    (offset, limit) => ({
      rows: slots
        .slice(offset, offset + limit)
        .map((s) => animalAt(s.speciesId, s.n))
        .filter((a): a is Animal => Boolean(a)),
      total: slots.length,
    }),
    12,
    [slots],
  )

  return (
    <>
      <Section icon={Boxes} label="Enclosures" aside={`${fmt(rows.length)} · ${label.toLowerCase()}`}>
        {/* Search past twelve rows and not before. Below that the field is furniture over a list
            the eye has already read — and 2,182 of the 2,411 housed names never reach it. */}
        {rows.length > 12 && (
          <div className="mb-3">
            <FindField value={query} onChange={setQuery} placeholder="Search enclosures" />
          </div>
        )}
        <TapList>
          {encPage.rows.map((e) => (
            <TapRow
              key={`${e.speciesId}:${e.enclosureId}`}
              label={e.enclosureName}
              /* THE SITE IS ON EVERY ROW, and the M/F/U beside it are THIS SPECIES' complement
                 rather than the enclosure's population: 1,456 of 15,959 enclosures hold more
                 than one species, so an unqualified "2" here would be a claim about who lives
                 there that the walk behind it never made. */
              sub={`${e.siteName} · ${fmt(e.male)} M · ${fmt(e.female)} F · ${fmt(e.undetermined)} U`}
              value={fmt(e.total)}
              onOpen={() => drillTo({ kind: 'enclosure', id: e.enclosureId }, { module: 'animals', label: name })}
            />
          ))}
        </TapList>
        {found.length === 0 && (
          <p className="text-small text-[#5c574f]">No enclosure here matches “{query.trim()}”.</p>
        )}
        <MoreRows page={encPage} noun="enclosures" />
      </Section>

      {slots.length > 0 && (
        <Section icon={PawPrint} label="Animals" aside={fmt(slots.length)}>
          <TapList>
            {animalPage.rows.map((a) => (
              <TapRow
                key={a.id}
                label={animalLabel(a)}
                /* The age is printed only where there is one. `born` is unusable on 81% of the
                   register, and `ageFrom` returns an em dash for those — a dash in a row that
                   otherwise reads as fact is indistinguishable from a missing value nobody
                   noticed, so the segment is dropped instead. */
                sub={`${a.enclosureId} · ${a.siteName}${a.age === '—' ? '' : ` · ${a.age}`}`}
                value={SEX_WORD[a.sex]}
                onOpen={() => drillTo({ kind: 'animal', id: a.id }, { module: 'animals', label: name })}
              />
            ))}
          </TapList>
          <MoreRows page={animalPage} noun="animals" />
        </Section>
      )}
    </>
  )
}

/* ── the breakdown's own row and category ────────────────────────────────── */

/** One row's worth of resolved data — the label, the enclosures behind it, and its count. */
interface Counted {
  label: string
  rows: Holding[]
}


/** The row hairline, matched to `TapRow`'s so the two lists sit on one rhythm. */
const HAIR_ROW = '#f0efec'

/**
 * THE SOURCE'S OWN PAIRING STATEMENT, which is one value per species rather than a distribution.
 *
 * `pairing_status`, `breed_group` and `breed_sub` are columns of the `species` REFERENCE table —
 * the ETL keeps one row per species NAME, so a species has a single pairing status the way it
 * has a single scientific name. There is nothing to count and nothing to draw a bar from, so
 * this group states the three values and does not pretend to a breakdown. It is rendered beside
 * the counted categories because that is the comparison worth having: what the SOURCE says about
 * this species, next to what the REGISTER counts across its enclosures.
 */
function ReferenceGroup({ label, fill, items }: { label: string; fill: string; items: [string, string][] }) {
  return (
    <section className="mb-7 break-inside-avoid last:mb-0">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className="size-[7px] shrink-0 translate-y-[-1px] rounded-full"
          style={{ backgroundColor: fill }}
          aria-hidden
        />
        <h4 className="text-overline font-semibold tracking-[0.04em] uppercase" style={{ color: '#3d3a34' }}>
          {label}
        </h4>
        <span className="ml-auto shrink-0 text-caption" style={{ color: FAINT }}>
          species reference
        </span>
      </div>
      <ul className="flex flex-col">
        {items.map(([k, v]) => (
          <li
            key={k}
            className="flex items-baseline justify-between gap-4 border-b py-3 last:border-0"
            style={{ borderColor: HAIR_ROW }}
          >
            <span className="min-w-0 flex-1 text-small" style={{ color: INK }}>
              {k}
            </span>
            <span className="shrink-0 text-right text-small font-medium" style={{ color: VALUE }}>
              {v}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ── the tab ─────────────────────────────────────────────────────────────── */

/**
 * Enclosure readiness for one species, across every site that holds it.
 *
 * The question is a curator's: "where could this species breed, where is it blocked, and where
 * do I not yet know because nobody has sexed the animals". It is answered by counting
 * ENCLOSURES rather than animals, because an enclosure is the unit a pairing decision is taken
 * about — two hundred males spread across forty enclosures is forty dead ends, not one.
 *
 * `speciesId` IS DELIBERATELY NOT READ. The route is site-scoped — `stonehaven-wildlife-haven:
 * ochre-warbler` — because every existing link and breadcrumb depends on it, but an Ochre
 * Warbler at Stonehaven and one at Ironwood are one species with one pairing question. Reading
 * the id here would scope the tab to whichever site the reader happened to arrive through and
 * silently drop the enclosures at the other ten, which is the defect `speciesWide.ts` was
 * written to document. The NAME is the key; the id stays in the signature because the page
 * passes it and the next person to open this file should see why it is ignored.
 */
export function SpeciesPairingTab({ name, profile }: { speciesId: string; name: string; profile?: SpeciesProfile }) {
  const { open } = useSheet()

  const holdings = useMemo<Holding[]>(() => {
    const out: Holding[] = []
    for (const sp of speciesByName(name)) {
      /* A registry row exists wherever the extract ever named the species, including sites that
         now hold none of it. Walking those adds nothing and would let a site with no animals
         appear in the per-site card as though it were somewhere the species lives. */
      if (sp.weight <= 0) continue
      const siteName = siteOf(sp.siteKey)?.name ?? sp.siteKey
      for (const h of holdingsByEnclosure(sp.id)) {
        out.push({ ...h, speciesId: sp.id, siteName, composition: compositionOf(h) })
      }
    }
    return out.sort((a, b) => b.total - a.total)
  }, [name])

  /**
   * Every group's rows resolved against the register, plus the scale the bars share.
   *
   * ONE PASS PER ROW OVER THE HOLDINGS, and that is affordable because the row set is fixed at
   * fifteen while the largest holding list in the dump is 807 enclosures for one name — twelve
   * thousand predicate calls at the extreme, once per name change. Grouping by composition first
   * and re-splitting would save most of that and cost the thing that matters: a row could then
   * only ever be a composition, which is exactly the constraint that made "1M + 1F" impossible
   * to draw before.
   *
   * EMPTY ROWS ARE DROPPED, and this is the rule the previous build already set: a "Lone female ·
   * 0" line states that we looked and found none, which for a species held in one enclosure is a
   * row about nothing. A category whose rows are all empty disappears with them.
   */
  const { groups, lenses, unclassified } = useMemo(() => {
    const resolve = (defs: GroupDef[]) =>
      defs
        .map((g) => ({
          ...g,
          items: g.rows
            .map((r) => ({ label: r.label, rows: holdings.filter(r.of) }))
            .filter((i) => i.rows.length > 0)
            .sort((a, b) => b.rows.length - a.rows.length),
        }))
        .filter((g) => g.items.length > 0)

    const groups = resolve(PARTITION)
    const lenses = resolve(LENSES)

    /* THE PARTITION'S OWN AUDIT, on screen rather than in a comment. If the fifteen predicates
       above stop covering `Composition` the difference appears as a row, because enclosures that
       fall out of a breakdown silently are the one failure this card cannot survive. */
    const claimed = new Set<Holding>()
    for (const g of groups) for (const i of g.items) for (const h of i.rows) claimed.add(h)
    const unclassified = holdings.filter((h) => !claimed.has(h))

    return { groups, lenses, unclassified }
  }, [holdings])

  /* THE POSITIONS, FLATTENED. One row per position with the category it belongs to, biggest
     first — the shape the table above draws. The counted partition and the two lenses are kept
     apart by the `kind` flag, because a lens re-reads the same enclosures and summing the two
     together would double the estate. */
  const positions = useMemo(() => {
    const out: { group: string; kind: 'partition' | 'lens'; fill: string; item: Counted }[] = []
    for (const g of groups)
      for (const it of g.items)
        out.push({ group: g.label, kind: 'partition', fill: TONE_FILL[g.tone ?? 'neutral'], item: it })
    for (const g of lenses)
      for (const it of g.items) out.push({ group: g.label, kind: 'lens', fill: ACCENT_INK, item: it })
    for (const it of unclassified.length
      ? [{ label: 'Not matched by any category', rows: unclassified }]
      : [])
      out.push({ group: 'Unclassified', kind: 'partition', fill: TONE_FILL.bad, item: it })
    return out.sort((a, b) => b.item.rows.length - a.item.rows.length)
  }, [groups, lenses, unclassified])

  const positionColumns: HCol<(typeof positions)[number]>[] = [
    {
      key: 'label',
      head: 'Position',
      sticky: 0,
      strong: true,
      cell: (r) => (
        <span className="flex items-baseline gap-2">
          <span
            className="size-[7px] shrink-0 translate-y-[-1px] rounded-full"
            style={{ backgroundColor: r.fill }}
            aria-hidden
          />
          <span className="min-w-0">{r.item.label}</span>
        </span>
      ),
    },
    { key: 'group', head: 'Category', cell: (r) => r.group },
    { key: 'n', head: 'Enclosures', align: 'right', cell: (r) => fmt(r.item.rows.length) },
    {
      key: 'share',
      head: 'Of holdings',
      align: 'right',
      width: '110px',
      cell: (r) =>
        r.kind === 'lens'
          ? '—'
          : `${Math.round((r.item.rows.length / Math.max(1, holdings.length)) * 100)}%`,
    },
  ]

  /* The source's own species-level statement, printed only where the extract carries it. */
  const reference = useMemo(
    () =>
      (
        [
          ['Pairing status', profile?.pairing_status],
          ['Breeding group', profile?.breed_group],
          ['Group detail', profile?.breed_sub],
        ] as [string, string | undefined][]
      ).filter((r): r is [string, string] => Boolean(r[1])),
    [profile],
  )

  const openGroup = (groupLabel: string) => (item: Counted) =>
    open({
      title: item.label,
      eyebrow: `${name} · ${groupLabel}`,
      body: <GroupSheet rows={item.rows} name={name} label={groupLabel} />,
    })

  /**
   * NOTHING HOUSED IS A SENTENCE, NOT AN EMPTY TAB.
   *
   * 108 names in `housing` have no species row and 45 species rows carry a stated headcount with
   * no housing row behind them, so a reader can legitimately land here on a species the register
   * holds none of. Returning null would leave a blank panel under a tab they just pressed, which
   * reads as a page that failed rather than as an answer.
   */
  if (!holdings.length) {
    return (
      <Section icon={HeartHandshake} label="Pairing">
        <p className="text-small text-[#5c574f]">
          The register holds no animal of this species at any site, so there is no enclosure to
          read a pairing position from.
        </p>
      </Section>
    )
  }

  const held = holdings.reduce((n, h) => n + h.total, 0)
  const male = holdings.reduce((n, h) => n + h.male, 0)
  const female = holdings.reduce((n, h) => n + h.female, 0)
  const unsexed = holdings.reduce((n, h) => n + h.undetermined, 0)

  return (
    <>
      {/* THE ASIDE CARRIES THE DATE BECAUSE THE HEADER'S WINDOW PILL DOES NOT APPLY HERE. A
          reader who has set the filter to "last 7 days" is owed a statement of what these four
          figures are as at, in the place they are read rather than in a note at the bottom. */}
      <Section
        wide
        icon={HeartHandshake}
        label="Pairing position"
      >
        <Snapshot
          cols={4}
          items={[
            { label: 'Held', value: fmt(held) },
            { label: 'Males', value: fmt(male) },
            { label: 'Females', value: fmt(female) },
            {
              label: 'Unsexed',
              value: fmt(unsexed),
              /* Derived from the three cells beside it rather than from a second count, so the
                 percentage and the numbers it describes can never tell different stories. */
              note: `${Math.round(((male + female) / held) * 100)}% sexed`,
            },
          ]}
        />
      </Section>

      {/* ONE CARD, FIVE CATEGORIES, TWO COLUMNS — and `wide` is what makes the two columns
          honest. The container every `@[…]` rule on this page resolves against is the shell's
          content column, not the card, so a half-width `Section` asking for two columns would
          get them at widths where its own box is 560px wide. A `wide` card spans that column, so
          card width and container width are the same measurement and the breakpoint means what
          it says. Below it the grid collapses and the categories stack, each keeping its rows. */}
      <Section
        wide
        icon={Layers}
        label="Pairing readiness breakdown"
        aside={`${fmt(holdings.length)} enclosure${holdings.length === 1 ? '' : 's'} · tap a row`}
      >
        {/* ONE TABLE, NOT FIVE MINI-CHARTS IN TWO COLUMNS. The card was a masonry of category
            blocks, each a heading over rows of label · count · bar — the same three-part row
            repeated seventeen times down two columns, which is a shape that has to be READ
            rather than scanned, and which balanced its columns by height so no two categories
            lined up. The positions are one flat list of comparable facts, so they are drawn as
            one: a row per position, its category named beside it, ordered by size. Every row
            drills exactly where its old row did. */}
        <HousingTable
          rows={positions}
          columns={positionColumns}
          keyOf={(r) => `${r.group}:${r.item.label}`}
          minWidth={520}
          onOpen={(r) => openGroup(r.group)(r.item)}
        />

        {reference.length > 0 && (
          <div className="mt-6">
            <ReferenceGroup label="Pairing status" fill={TONE_FILL.neutral} items={reference} />
          </div>
        )}
      </Section>

      {/* "WHERE IT IS HELD" IS GONE FROM THIS TAB. It listed the species' sites with each
          site's own readiness mix — a location breakdown on a tab about pairing, restating a
          distribution the Housing tab owns and the Overview's Population by Site already ranks.
          The per-site readiness mix it added was the only thing here that was not stated
          elsewhere, and it was not worth a card at the foot of this tab to say it. */}
    </>
  )
}
