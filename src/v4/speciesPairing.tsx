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
import { Boxes, HeartHandshake, Layers, MapPin, PawPrint } from 'lucide-react'
import {
  animalAt,
  animalLabel,
  compositionOf,
  holdingsByEnclosure,
  type Animal,
  type Composition,
  type EnclosureHolding,
} from '../core/animals'
import { TODAY, longDate } from '../core/calendar'
import { UNRESOLVED, data, speciesSpan } from '../core/store'
import { ENCLOSURES, siteOf, speciesByName } from '../core/world'
import { Bars, FAINT, Section, Snapshot, fmt } from '../exec/system'
import { useDrill } from './drillNav'
import { FindField } from './filters'
import { TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'
import { useSheet } from './sheet'

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
 * The three bands, declared as data rather than as three render blocks.
 *
 * Every value of `Composition` appears below exactly once, so a composition cannot land in two
 * bands or in none — the defect a chain of if-statements invites. A ninth value added to the
 * type and not to this table surfaces as bands that do not sum to the enclosure count, which is
 * visible, rather than as rows that quietly disappear.
 */
const BANDS: { key: string; label: string; of: Composition[] }[] = [
  { key: 'both', label: 'Both sexes present', of: ['Both sexes'] },
  { key: 'unsexed', label: 'Needs sexing', of: ['All unsexed', 'Lone unsexed', 'Partly unsexed'] },
  { key: 'single', label: 'Single sex', of: ['All male', 'All female', 'Lone male', 'Lone female'] },
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
          <p className="text-small text-[#6d6860]">No enclosure here matches “{query.trim()}”.</p>
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
export function SpeciesPairingTab({ name }: { speciesId: string; name: string }) {
  const { open } = useSheet()
  const { drillTo } = useDrill()

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

  const bands = useMemo(() => {
    const byComposition = new Map<Composition, Holding[]>()
    for (const h of holdings) {
      const at = byComposition.get(h.composition)
      if (at) at.push(h)
      else byComposition.set(h.composition, [h])
    }
    return BANDS.map((b) => ({
      ...b,
      rows: b.of.flatMap((c) => byComposition.get(c) ?? []),
      /* Sub-labels sort by size within their band, and a sub-label with no enclosures is not in
         the array at all — a "Lone female · 0" row states that we looked and found none, which
         for a species held in one enclosure is a sentence about nothing. */
      parts: b.of
        .map((c) => ({ composition: c, rows: byComposition.get(c) ?? [] }))
        .filter((p) => p.rows.length > 0)
        .sort((x, y) => y.rows.length - x.rows.length),
    })).filter((b) => b.rows.length > 0)
  }, [holdings])

  const sites = useMemo(() => {
    const by = new Map<string, { key: string; name: string; rows: Holding[] }>()
    for (const h of holdings) {
      const at = by.get(h.siteKey)
      if (at) at.rows.push(h)
      else by.set(h.siteKey, { key: h.siteKey, name: h.siteName, rows: [h] })
    }
    return [...by.values()]
      .map((s) => ({
        ...s,
        held: s.rows.reduce((n, h) => n + h.total, 0),
        mix: BANDS.map((b) => ({ label: b.label, n: s.rows.filter((h) => b.of.includes(h.composition)).length })),
      }))
      .sort((a, b) => b.held - a.held)
  }, [holdings])

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
        <p className="text-small text-[#6d6860]">
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
        icon={HeartHandshake}
        label="Pairing position"
        aside={`from the register · ${longDate(TODAY)}`}
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

      <Section
        icon={Layers}
        label="Enclosure readiness"
        aside={`${fmt(holdings.length)} enclosure${holdings.length === 1 ? '' : 's'}`}
      >
        {/* `precise`, so the bars are drawn at full width and two bands can be compared by
            length. Everywhere else in the product the rows are already ordered and a rail would
            be drawing that ordering twice; here the question really is "how much of the estate
            is stuck", which is a magnitude. */}
        <Bars
          precise
          showShare
          unit="enclosures"
          items={bands.map((b) => ({ label: b.label, value: b.rows.length }))}
        />
        <p className="mt-4 text-caption" style={{ color: FAINT }}>
          Enclosures, not animals. A band says which sexes of this species are present in the
          enclosure — not that the animals in it are mature, and not that they are the only
          animals in it.
        </p>
      </Section>

      <Section icon={Boxes} label="Readiness breakdown" aside="tap a row for the enclosures">
        <TapList>
          {bands.flatMap((b) =>
            b.parts.map((p) => (
              <TapRow
                key={p.composition}
                label={p.composition}
                sub={`${b.label} · ${Math.round((p.rows.length / holdings.length) * 100)}% of enclosures`}
                value={fmt(p.rows.length)}
                unit="encl."
                onOpen={() =>
                  open({
                    title: p.composition,
                    eyebrow: `${name} · ${b.label}`,
                    body: <GroupSheet rows={p.rows} name={name} label={b.label} />,
                  })
                }
              />
            )),
          )}
        </TapList>
        {/* THE ONE PLACE THE SOURCE CONTRADICTS ITSELF, named rather than smoothed over. Under
            the extract's own `breed_group`, a single unsexed animal is filed as Unknown
            Potential for 11 species and as Zero Chance for 168 — the same fact, two verdicts.
            This tab files it under Needs sexing, because that is the verdict with an action
            behind it, and says so here rather than picking silently. */}
        <p className="mt-4 text-caption" style={{ color: FAINT }}>
          The source itself files a lone unsexed animal as unknown potential for 11 species and as
          no chance for 168. It is counted here as needing sexing, which is the reading with
          something to do about it.
        </p>
      </Section>

      {/* ONE SITE IS NOT A DISTRIBUTION. Most names sit at a single site and 767 in a single
          enclosure, and a card headed "Where it is held" with one row under it repeats the
          figures above it in a wider box. */}
      {sites.length > 1 && (
        <Section icon={MapPin} label="Where it is held" aside={`${sites.length} sites`}>
          <TapList>
            {sites.map((s) => (
              <TapRow
                key={s.key}
                label={s.name}
                /* Each site's own three-band mix, because the collection-wide bands above can
                   hide the thing worth acting on: a species that is 60% ready overall may be
                   entirely single-sex at the one site with room to move animals. Bands with no
                   enclosures at this site are dropped from the line rather than printed as
                   zeroes. */
                sub={s.mix
                  .filter((m) => m.n > 0)
                  .map((m) => `${fmt(m.n)} ${m.label.toLowerCase()}`)
                  .join(' · ')}
                value={fmt(s.held)}
                onOpen={() => drillTo({ kind: 'site', id: s.key }, { module: 'animals', label: name })}
              />
            ))}
          </TapList>
        </Section>
      )}

    </>
  )
}
