/**
 * WHAT TELLS THESE ANIMALS APART, AND WHAT STOCK THEY ARE — identification and breeds, read
 * across every site that holds the species rather than across the one in the route.
 *
 * THE ROUTE IS SITE-SCOPED AND THIS TAB IS NOT, deliberately. `dims` keys a species as
 * `<siteKey>:<name-slug>` because everything else in this product is a metric and a metric is
 * always asked under a scope. A chip is not a metric. An animal at Ironwood either carries one
 * or does not, and that fact does not change when a reader arrives from Stonehaven's list — so
 * the coverage here is compiled over every animal held under this NAME, which is the same thing
 * `speciesByName` enumerates and the same thing the page title says. Measured over the whole
 * extract: `identification.of` equals the sum of `weight` across every population of the name
 * for all 2,411 held names, with no exceptions, so the denominator printed at the top of this
 * tab is a number the site list beneath it reproduces exactly.
 *
 * THE ONE FIGURE THIS TAB EXISTS TO NOT PRINT IS "110% CHIPPED". That is what the reference
 * design shows, and it is not a rounding fault — it is a coverage figure whose numerator and
 * denominator came from different counts. Every proportion below is computed from the pair on
 * its own line, from `[value, outOf]` as the ETL emitted it, and nothing here may supply a
 * denominator of its own. A share that cannot see a second number cannot disagree with one.
 *
 * ABSENT IS NOT ZERO AND RENDERS NOTHING. The ETL drops a key where the count is zero, so a
 * species with no ringed animals carries no `ring` key and gets no ring row — rather than
 * "0 of 1,045", which reads as a finding when it is only a silence. Every card here returns
 * null on an empty set for the same reason.
 *
 * WHAT THE REFERENCE DESIGN SHOWS THAT IS NOT HERE, and why:
 *   A PER-ANIMAL IDENTIFIER LIST — chip number, ring number and breed beside each animal.
 *     `animals.bin` carries nine columns per animal (id, species, enclosure, born, accession,
 *     sex, site, flags, origin) and not one of them is an identifier or a breed. The counts
 *     below are all the ETL compiled; the strings behind them never left `housing`. So no row
 *     on this tab drills to an animal, because there is no per-animal fact to drill to.
 *   A PER-SITE CHIP COVERAGE SPLIT — "84% chipped at Riverside, 12% at Lakeside". The
 *     identification block is compiled per species NAME, not per (site, name), so a site-wise
 *     coverage bar would be this one number drawn eleven times. The site roll below states the
 *     holding it was counted over and stops there.
 *   AN UNCHIPPED-ANIMAL WORKLIST. That needs the animals, not the count of them — see above.
 */

import { useEffect, useMemo, useState } from 'react'
import { Fingerprint, Layers, MapPin, Palette, Sparkles, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { loadProfiles, profileOf, profilesNow } from '../core/profiles'
import type { Of, Tally } from '../core/profiles'
import { siteOf, speciesByName } from '../core/world'
import { Bars, FAINT, INK, Section, TRACK, VALUE, fmt, useAccent } from '../exec/system'
import { TapList, TapRow } from './panels'
import { FindField } from './filters'
import { MoreRows, usePaged } from './perf'
import { useDrill } from './drillNav'

/* ── the share, and the two roundings that would lie ──────────────────────── */

/**
 * A percentage of a pair, stated so that it cannot say something the pair does not.
 *
 * TWO ROUNDINGS ARE SUPPRESSED HERE AND BOTH OCCUR ON REAL DATA. Auburn Caramel Peryton is
 * 2,127 of 2,141 breeded, which is 99.35% and rounds to "100%" — a claim that every animal
 * carries a breed when fourteen do not. Ochre Warbler is 1 of 1,045 chipped, which is 0.096%
 * and prints as "0.0%" under `toFixed(1)` — a real animal rounded into nothing. So a value
 * short of its total never reads 100, and a value above zero never reads 0.
 *
 * The caller always holds `outOf > 0`: the ETL emits no pair whose denominator is the size of
 * a holding it did not find, and the cards below do not render without one.
 */
/* EXPORTED, because the species header now states chip coverage too — see `statsOf` in
   `speciesHeader.tsx`. Two roundings of one pair is how a header comes to read "100% chipped"
   over a tab reading "99%", which is this function's entire reason for existing. */
export function pctText(value: number, outOf: number): string {
  const pct = (value / outOf) * 100
  if (value === 0) return '0%'
  if (pct < 0.1) return '<0.1%'
  if (pct < 1) return `${pct.toFixed(1)}%`
  const whole = Math.round(pct)
  if (whole === 100 && value < outOf) return '99%'
  return `${whole}%`
}

/* ── primitives ──────────────────────────────────────────────────────────── */

/**
 * "97 of 1,045 · 9%" — a numerator, its OWN denominator, and the share of exactly those two.
 *
 * The pair is the figure. A reader can check the percentage against the two numbers beside it
 * without leaving the row, and no third count anywhere on the page can contradict it — which is
 * the property the reference design's chipped figure did not have.
 */
function Coverage({ label, of, sub }: { label: string; of: Of; sub?: string }) {
  const accent = useAccent()
  const [value, outOf] = of
  const pct = outOf > 0 ? (value / outOf) * 100 : 0
  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-small" style={{ color: INK }}>
          {label}
        </span>
        <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
          {fmt(value)}
          <span className="text-caption" style={{ color: FAINT }}>
            {' of '}
            {fmt(outOf)} · {pctText(value, outOf)}
          </span>
        </span>
      </div>
      <span className="mt-2 block h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
      </span>
      {sub && (
        <p className="mt-1.5 text-caption" style={{ color: FAINT }}>
          {sub}
        </p>
      )}
    </li>
  )
}

/**
 * A vocabulary as a ranking — identifier types, breeds, morphs.
 *
 * PAGED RATHER THAN CAPPED, because the three lists this serves are three different sizes and
 * one cap would be wrong for all of them. Measured across the extract: `identifier_type` tops
 * out at six values for any species, `morph_name` at sixty, and `breed_name` at 163 for Auburn
 * Caramel Peryton. A fixed eight-row list with "155 more" underneath answers "what breeds are
 * there" with a number instead of an answer, and `MoreRows` states the real total on every page
 * so the count and the list can never drift apart.
 *
 * EACH ROW CARRIES ITS OWN DENOMINATOR IN WORDS, not as a bare percentage. `Bars`'s own
 * `showShare` divides by the sum of the items it was handed, which on a paged list is the sum
 * of the visible page — so ten rows of 163 would each report a share of the ten. The share here
 * is computed against `denom`, which is the count the ETL emitted for the whole vocabulary, and
 * the row names it: "8% of the 2,127 that carry one".
 */
function Ranking({
  icon,
  label,
  items,
  denom,
  denomNoun,
  noun,
}: {
  icon: LucideIcon
  label: string
  items: Tally
  /** The count the whole vocabulary was compiled over — `withBreed`, `identType`. */
  denom: number
  /** How that count reads in a row's caption — "that carry a breed". */
  denomNoun: string
  noun: string
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const hits = useMemo(
    () => (q ? items.filter(([name]) => name.toLowerCase().includes(q)) : items),
    [items, q],
  )
  const page = usePaged<readonly [string, number]>(
    (offset, limit) => ({ rows: hits.slice(offset, offset + limit), total: hits.length }),
    10,
    [hits],
  )

  if (!items.length) return null

  return (
    <Section icon={icon} label={label} aside={`${fmt(items.length)} recorded`}>
      {/* Search only where there is something to search. Twelve is the threshold the rest of
          this product uses; below it the field is furniture over a list already on screen. */}
      {items.length > 12 && (
        <div className="mb-3">
          <FindField value={query} onChange={setQuery} placeholder={`Search ${noun}`} />
        </div>
      )}

      <Bars
        items={page.rows.map(([name, value]) => ({
          label: name,
          value,
          sub: denom > 0 ? `${pctText(value, denom)} of the ${fmt(denom)} ${denomNoun}` : undefined,
        }))}
        unit="animals"
      />
      <MoreRows page={page} noun={noun} />

      {hits.length === 0 && (
        <p className="text-small" style={{ color: '#5c574f' }}>
          No {noun.replace(/s$/, '')} matches “{query.trim()}”.
        </p>
      )}
    </Section>
  )
}

/* ── the tab ─────────────────────────────────────────────────────────────── */

/**
 * IDENTIFICATION AND BREEDS for one species, across the whole collection.
 *
 * It answers two questions a keeper asks together and the schema answers from one table: which
 * of these animals could be picked out of the enclosure and named, and what stock the holding
 * actually is. Both are read from `housing` by the ETL and arrive on the profile as counted
 * pairs; nothing on this tab is derived from anything else, and nothing is derived twice.
 *
 * THE PROFILE IS FETCHED HERE RATHER THAN PASSED IN, because the tab's contract is
 * `(speciesId, name)` and `profiles.json` is 5.3 MB that only a species page ever needs. The
 * await is safe for the reason `core/profiles.ts` states at length: nothing in it is scoped, so
 * there is no window and no site for a frame of skew to put out of step. Concurrent callers
 * share the one request and the session cache, so opening this tab after the Profile tab costs
 * nothing.
 */
export function SpeciesIdentityTab({ speciesId, name }: { speciesId: string; name: string }) {
  const { drillTo } = useDrill()

  const [profiles, setProfiles] = useState(profilesNow)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (profiles) return
    let live = true
    loadProfiles().then(
      (p) => live && setProfiles(p),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [profiles])

  const profile = useMemo(() => profileOf(speciesId, profiles), [speciesId, profiles])

  /**
   * EVERY POPULATION OF THIS NAME, from the register — the holding the coverage was counted
   * over, named site by site.
   *
   * `speciesByName` returns a row wherever the extract ever recorded the species, including
   * sites that hold none of it now; a site with nothing in it is not a site the species is at,
   * so the zero-weight rows are dropped exactly as `speciesWide` drops them. Eleven is the most
   * any name reaches (Aaru Macaw), which is why this list is not paged and the vocabularies
   * below are.
   */
  const sites = useMemo(
    () =>
      speciesByName(name)
        .filter((sp) => sp.weight > 0)
        .map((sp) => ({
          key: sp.siteKey,
          name: siteOf(sp.siteKey)?.name ?? sp.siteKey,
          code: siteOf(sp.siteKey)?.code ?? '',
          count: sp.weight,
        }))
        .sort((a, b) => b.count - a.count),
    [name],
  )
  const held = sites.reduce((n, s) => n + s.count, 0)

  if (failed) {
    return (
      <Section icon={Fingerprint} label="Identification & breeds">
        <p className="text-small" style={{ color: '#5c574f' }}>
          The species reference could not be loaded, and every figure on this tab comes from it.
          The rest of this page is unaffected — it reads the register directly.
        </p>
      </Section>
    )
  }

  if (!profiles) {
    return (
      <Section icon={Fingerprint} label="Identification & breeds">
        <p className="text-small" style={{ color: '#5c574f' }}>
          Loading the register summary…
        </p>
      </Section>
    )
  }

  const id = profile?.identification
  const breeds = profile?.breeds

  /* WHAT THE COVERAGE CARD WOULD CONTAIN, decided before it is drawn. A card whose only content
     is the size of the holding it knows nothing about is a card that should not render, so the
     rows are assembled first and the card exists only if one of them does. */
  const hasCoverage = Boolean(id && (id.chip || id.ring || id.identType || id.none))
  const hasBreeds = Boolean(breeds && (breeds.withBreed || breeds.withMorph))

  /**
   * NOTHING AT ALL, SAID AS THE ABSENCE IT IS RATHER THAN DRAWN AS AN EMPTY SHELL.
   *
   * WHICH SPECIES REACH THIS, MEASURED: the ETL emits an identification block for every one of
   * the 2,411 names the collection holds, and every block it emits carries at least one row —
   * none is a bare denominator. So this branch is the 36 of 2,447 profile keys that are
   * reference biology for a species we do not hold, plus anything whose slug the profile file
   * does not know. Both are a silence about our register, not about the animal, and the copy
   * below says which.
   *
   * A HEADING OVER FOUR EM DASHES IS THE ALTERNATIVE THIS REJECTS. It states that we looked and
   * found nothing, when what happened is that the column was never filled — and the second is
   * the fact a curator can act on.
   */
  if (!hasCoverage && !hasBreeds) {
    return (
      <Section icon={Fingerprint} label="Identification & breeds" aside={held > 0 ? `${fmt(held)} animals` : undefined}>
        <p className="text-small leading-relaxed" style={{ color: '#3d3a34' }}>
          {held > 0
            ? `The register holds ${fmt(held)} ${name} across ${sites.length} site${sites.length === 1 ? '' : 's'}, and carries no microchip, ring number, identifier type, breed or morph for any of them.`
            : 'The register holds none of this species, so there is nothing to identify.'}{' '}
          Breed and morph are the exception rather than the rule in this source: a breed is
          recorded on 4,224 of 110,020 housing rows and a morph on 7,810, between them reaching
          225 of the 2,411 held species. This is a gap in the extract rather than a finding about
          the animals.
        </p>
      </Section>
    )
  }

  /* THE TWO COUNTS OF A MICROCHIP, WHICH THE SOURCE DOES NOT RECONCILE AND NEITHER DOES THIS.
     `micro_chip` is filled on 36,530 housing rows dump-wide while `identifier_type` says
     'Micro chip' on 31,084 — the latter a strict subset. They differ for 281 of the 1,209
     species that have a chip at all, so on those pages one number is stated and a second,
     smaller one sits in the type ranking below it. Naming the gap costs a line; picking a
     winner the source never nominated costs the reader their trust in both figures. */
  const chipFilled = id?.chip?.[0]
  const chipType = id?.types?.find(([label]) => label === 'Micro chip')?.[1]
  /* Carried as a pair rather than as two loose numbers so the sentence below cannot be written
     with one of them missing and a zero standing in for it. */
  const chipGap =
    chipFilled !== undefined && chipType !== undefined && chipType !== chipFilled
      ? { filled: chipFilled, typed: chipType }
      : undefined

  return (
    <>
      {id && hasCoverage && (
        <Section
          icon={Fingerprint}
          label="How they are told apart"
          aside={`${fmt(id.of)} animals${sites.length > 1 ? ` · ${sites.length} sites` : ''}`}
        >
          <ul className="flex flex-col divide-y" style={{ borderColor: '#f0efec' }}>
            {id.chip && <Coverage label="Microchipped" of={id.chip} />}
            {id.ring && <Coverage label="Ringed" of={id.ring} />}
            {id.identType && (
              <Coverage
                label="Carries an identifier type"
                of={id.identType}
                /* `identifier_type` and `identifier_value` are filled together on all but one
                   species dump-wide — Onyx Babbler, where 16 rows name a type and 15 carry a
                   value. That row is a type with nothing behind it, which is worth a clause on
                   the one page it happens on and not a second bar on 1,425 pages where it
                   would draw the same length twice. */
                sub={
                  id.identValue && id.identValue[0] !== id.identType[0]
                    ? `${fmt(id.identValue[0])} of those carry an identifier value; the rest name a type and record nothing under it`
                    : undefined
                }
              />
            )}
            {id.none && (
              <Coverage
                label="Nothing to tell them apart by"
                of={id.none}
                sub="no chip, no ring and no identifier type"
              />
            )}
          </ul>

          {/* THE CAVEATS ARE FIGURES RATHER THAN PROSE, because each one changes what the bar
              above it means. A chip two animals share identifies neither; a chip column holding
              '0' or 'No chip' is a recorded refusal rather than a number. Both are counted
              beside the coverage and neither is subtracted from it — filled and usable are two
              facts, and collapsing them into one would hide whichever is the useful one. */}
          {(id.chipShared || id.chipVoid || id.ringShared) && (
            <p className="mt-3 text-caption" style={{ color: FAINT }}>
              {[
                id.chipShared ? `${fmt(id.chipShared)} share a chip number with another animal` : null,
                id.chipVoid ? `${fmt(id.chipVoid)} carry a recorded refusal rather than a chip number` : null,
                id.ringShared ? `${fmt(id.ringShared)} share a ring number with another animal` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              . Counted, not subtracted.
            </p>
          )}

          {chipGap && (
            <p className="mt-2 text-caption" style={{ color: FAINT }}>
              The chip column is filled on {fmt(chipGap.filled)} of these animals while{' '}
              {fmt(chipGap.typed)} are typed as ‘Micro chip’. Both counts are the source’s;
              neither is adjusted to the other.
            </p>
          )}

          {/* THE DENOMINATOR IS A POSITION, NOT A PERIOD, and the header above this tab states a
              window. `housing` is a snapshot of who is held on the extract's last day and no
              identifier carries a date, so there is no honest way to say how many were chipped
              last March. Saying so is the alternative to a card that quietly ignores the pill a
              reader can see. */}
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            Counted over every animal held under this name on the extract’s last day. This tab is
            a position rather than a period, so it does not move with the date filter.
          </p>

          {/* TWO COUNTS OF ONE HOLDING, STATED BOTH WAYS IF THEY EVER DISAGREE. The
             identification block's denominator and the register's own per-site sum are compiled
             from the same table by different passes, and they match for all 2,411 held names in
             today's extract. A re-extract that broke that would otherwise show as a coverage
             share quietly computed against the wrong holding, which is invisible; this makes it
             a sentence instead. */}
          {held !== id.of && (
            <p className="mt-2 text-caption" style={{ color: FAINT }}>
              The register holds {fmt(held)} under this name across {sites.length} site
              {sites.length === 1 ? '' : 's'}; the identification summary was compiled over{' '}
              {fmt(id.of)}. Both figures are the extract’s and neither is adjusted.
            </p>
          )}
        </Section>
      )}

      {/* WHERE THE ONE NUMBER CAME FROM. Shown only for a species held at more than one site,
          because that is the only case where a reader could reasonably take the coverage above
          for a site's own figure. At one site the card would restate the aside. */}
      {sites.length > 1 && (
        <Section icon={MapPin} label="Counted across" aside={`${sites.length} sites`}>
          <TapList>
            {sites.map((s) => (
              <TapRow
                key={s.key}
                label={s.name}
                sub={s.code}
                value={fmt(s.count)}
                onOpen={() => drillTo({ kind: 'site', id: s.key }, { module: 'animals', label: name })}
              />
            ))}
          </TapList>
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            The coverage above is one figure over all {fmt(held)} of them. Identification is
            compiled per species rather than per site in this extract, so it cannot be narrowed
            to one of these rows.
          </p>
        </Section>
      )}

      {id?.types?.length ? (
        <Ranking
          icon={Tag}
          label="By identifier type"
          items={id.types}
          /* The vocabulary sums to `identType` exactly for every species in the extract — no
             row is dropped and none is double-counted — so this is the honest denominator for
             a row's share, and the reader can add the rows up and land on it. */
          denom={id.identType?.[0] ?? 0}
          denomNoun="that carry one"
          noun="identifier types"
        />
      ) : null}

      {breeds && hasBreeds && (
        <Section icon={Sparkles} label="Breed & morph" aside={`${fmt(breeds.of)} animals`}>
          <ul className="flex flex-col divide-y" style={{ borderColor: '#f0efec' }}>
            {breeds.withBreed && <Coverage label="Carries a breed" of={breeds.withBreed} />}
            {breeds.withMorph && <Coverage label="Carries a morph" of={breeds.withMorph} />}
          </ul>
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            Breed and morph are recorded for 225 of the 2,411 held species. Where a row is
            missing below, the extract carries nothing under that column for this species.
          </p>
        </Section>
      )}

      {breeds?.byBreed?.length ? (
        <Ranking
          icon={Layers}
          label="By breed"
          items={breeds.byBreed}
          denom={breeds.withBreed?.[0] ?? 0}
          denomNoun="that carry a breed"
          noun="breeds"
        />
      ) : null}

      {breeds?.byMorph?.length ? (
        <Ranking
          icon={Palette}
          label="By morph"
          items={breeds.byMorph}
          denom={breeds.withMorph?.[0] ?? 0}
          denomNoun="that carry a morph"
          noun="morphs"
        />
      ) : null}

      {/* THE HALF OF THE TAB THAT HAS NOTHING, SAID ONCE. A page carrying chip coverage and no
          breed card leaves a reader unsure whether the breeds were absent or the card was
          forgotten. This is not an empty shell — it states which column is empty and how empty
          that column is across the whole source, which is a fact about the extract rather than
          a gap dressed as one. It renders only when the other half rendered something, so a
          species with neither still gets the single absence above. */}
      {hasCoverage && !hasBreeds && (
        <Section icon={Sparkles} label="Breed & morph">
          <p className="text-small leading-relaxed" style={{ color: '#3d3a34' }}>
            No breed or morph is recorded for this species. The register carries one for 225 of
            its 2,411 held species — a breed on 4,224 of 110,020 housing rows and a morph on
            7,810 — so this is the ordinary state of the source rather than a finding about this
            holding.
          </p>
        </Section>
      )}
    </>
  )
}
