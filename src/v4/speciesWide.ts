/**
 * ONE SPECIES, EVERY SITE.
 *
 * THE MODEL DISAGREED WITH THE PAGE, and this file is where they are reconciled. `dims` keys a
 * species as `<siteKey>:<name-slug>` — 5,717 rows for 2,352 species — because everything else
 * in this product is a metric, and a metric is always asked under a scope. That is right for a
 * metric and wrong for an identity: an Ochre Warbler at Stonehaven and an Ochre Warbler at
 * Ironwood are not two species, and a page titled with the animal's name that reads 537 when
 * the collection holds 544 across eleven sites has answered a question nobody asked.
 *
 * So the ROUTE stays site-scoped — every existing link, drill-down and breadcrumb keeps
 * working, and a reader who arrived from one site's list lands somewhere that still knows
 * which site that was — while the PAGE reads across every population of the same name.
 *
 * NOTHING HERE IS A NEW READING OF THE DATA. Each site's count is the same `stockOfSpecies`
 * the site-scoped page already called; this sums them and nothing more. Two figures that
 * disagree would be two models of one collection, which is the drift `drill.ts` documents at
 * length — so there is exactly one call, made once per site, and the total is its sum.
 */

import type { Win } from '../core/calendar'
import { sexSplit, stockOfSpecies } from '../core/animals'
import { speciesByName, speciesOf, siteOf } from '../core/world'
import type { Species } from '../core/world'

export interface SpeciesSite {
  species: Species
  siteKey: string
  siteName: string
  count: number
}

export interface SpeciesWide {
  /** The name every population here shares. */
  name: string
  cls: string
  /** Held across the whole collection, in this window. */
  total: number
  male: number
  female: number
  undetermined: number
  /** Sites actually holding one, largest first. A site with none is not a site it is at. */
  sites: SpeciesSite[]
  /** Females per male, or undefined where either side is zero and the ratio would divide by it. */
  ratio?: number
  /** Sexed as a share of the total. Derived from the same pair it is printed beside. */
  sexedPct: number
}

/**
 * Every population of one species, and their sum.
 *
 * SITES WITH NOTHING IN THEM ARE DROPPED. `speciesByName` returns a row wherever the extract
 * ever recorded the species, including sites that now hold none of it; counting those as sites
 * the species is "at" would print eleven when the animal lives at eight. The count is taken
 * first and the filter is on the count, so the two can never disagree.
 */
export function speciesWide(speciesId: string, win: Win): SpeciesWide | undefined {
  const self = speciesOf(speciesId)
  if (!self) return undefined

  const populations = speciesByName(self.name)
  const sites: SpeciesSite[] = populations
    .map((sp) => ({
      species: sp,
      siteKey: sp.siteKey,
      siteName: siteOf(sp.siteKey)?.name ?? sp.siteKey,
      count: stockOfSpecies(sp.id, win),
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)

  const split = sexSplit(sites.map((s) => ({ species: s.species, count: s.count })))
  const total = sites.reduce((n, s) => n + s.count, 0)
  const sexed = split.male + split.female

  return {
    name: self.name,
    cls: self.cls,
    total,
    male: split.male,
    female: split.female,
    undetermined: split.undetermined,
    sites,
    /* A ratio needs both sides. "1 : 1.2" off 164 males is a fact; off zero males it is a
       division by zero dressed as one, which is the shape that reads as a finding. */
    ratio: split.male > 0 && split.female > 0 ? split.female / split.male : undefined,
    /* Derived from the two numbers printed beside it, so it can never contradict them — the
       defect behind the reference design's "110% chipped", where a coverage percentage came
       from a different pair than the one on screen. */
    sexedPct: total > 0 ? (sexed / total) * 100 : 0,
  }
}

/**
 * The same reading, narrowed to the site pill when the reader has set one.
 *
 * WHY THE NARROWING LIVES HERE RATHER THAN IN EACH CALLER. The species header and the Overview
 * tab both state this species' holding, and until this existed each re-derived the filtered
 * total, the filtered sex split and the coverage percentage from the unfiltered reading. Two
 * copies of one derivation is two chances for a header to read 537 over a tab reading 1,045 —
 * exactly the contradiction the top of this file exists to prevent — so there is one copy and
 * both callers take it.
 *
 * THE PARTS ARE RECOUNTED, NOT RESCALED. Dropping sites and keeping the collection's sex split
 * would print one site's headcount beside every site's males. `sexSplit` is asked again with
 * only the surviving populations, so the total and its parts are the same walk.
 */
export function speciesWideAt(speciesId: string, win: Win, siteKey: string | null): SpeciesWide | undefined {
  const all = speciesWide(speciesId, win)
  if (!all || !siteKey) return all

  const sites = all.sites.filter((s) => s.siteKey === siteKey)
  const total = sites.reduce((n, s) => n + s.count, 0)
  const split = sexSplit(sites.map((s) => ({ species: s.species, count: s.count })))
  const sexed = split.male + split.female

  return {
    ...all,
    sites,
    total,
    male: split.male,
    female: split.female,
    undetermined: split.undetermined,
    ratio: split.male > 0 && split.female > 0 ? split.female / split.male : undefined,
    sexedPct: total > 0 ? (sexed / total) * 100 : 0,
  }
}
