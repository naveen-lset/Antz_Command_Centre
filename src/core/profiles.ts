/**
 * SPECIES REFERENCE BIOLOGY — what a species IS, as opposed to what we hold of it.
 *
 * WHY THIS IS THE ONE THING IN `core/` THAT IS ALLOWED TO BE ASYNC. `query.ts` is pure and
 * synchronous on a stated principle: "the moment a figure becomes async, two figures on one
 * screen can be from two different scopes for a frame." That argument is about SCOPED figures
 * — a count under a window and a site. Nothing here is scoped. An incubation period is 24 days
 * in May and 24 days in December, at every site, under every filter, so it cannot disagree
 * with a figure beside it and there is nothing for a frame of skew to corrupt.
 *
 * The payoff is 5.3 MB that the home screen never pays. `dims.json` is read at boot by every
 * page; folding profiles into it took that file from 2.89 MB to 8.67 MB to carry facts only a
 * species page can display. Fetched here, on the first species page a reader opens, and cached
 * for the session.
 *
 * EVERY FIELD IS READ FROM `species`, NEVER DERIVED. The ETL drops empty columns rather than
 * emitting nulls, so an absent key means the extract has no value and the page renders no row
 * — which is the honest shape of this source. `lifespan_years` is filled for 55% of species,
 * `incubation_days` for 41%, `gestation_days` for 17%: a bird has an incubation period and a
 * mammal has a gestation, and a species carrying neither is a gap rather than a zero.
 */

/**
 * A numeric score and the top of ITS OWN scale.
 *
 * THE SCALES ARE NOT ALL THE SAME, and assuming they were is a bug that renders. Measured over
 * all 2,352 species: intelligence, activity, social, space, stress, size, need, conservation
 * priority and visitor appeal are 1–5. `budget_score` is 0–20, and 393 species sit above 10.
 * Drawn on a common 0–10 track — which is what the design this page was modelled on did — the
 * welfare bars all read at half their true value and the budget bar prints "11/10".
 *
 * So the denominator travels with the numerator, from the ETL, and no renderer may assume one.
 */
export type Score = readonly [value: number, outOf: number]

export interface SpeciesProfile {
  common_name?: string
  scientific_name?: string
  taxonomic_class?: string
  taxonomic_order?: string
  taxonomic_family?: string
  taxonomic_genus?: string
  iucn_status?: string
  iucn_trend?: string
  cites_appendix?: string
  native_countries?: string
  avg_weight_g?: string
  sexual_dimorphism?: string
  sex_id_method?: string
  habitat_zone?: string
  habitat_type?: string
  activity_pattern?: string
  social_structure?: string
  migration_pattern?: string
  diet_category?: string
  communication_type?: string
  reproduction_type?: string
  mating_system?: string
  parental_care?: string
  danger_level?: string
  can_be_handled?: string
  venomous_poisonous?: string
  enclosure_type_required?: string
  substrate_type?: string
  uv_light_required?: string
  water_feature_required?: string
  recommended_id_method?: string
  lifespan_years?: string
  maturity_age_years?: string
  gestation_days?: string
  incubation_days?: string
  clutch_litter_size?: string
  independence_days?: string
  birth_egg_weight_g?: string
  weaning_age_days?: string
  litters_per_year?: string
  daily_kcal_estimate?: string
  protein_pct_range?: string
  fat_pct_range?: string
  fiber_pct_range?: string
  ca_p_ratio?: string
  feeding_frequency?: string
  foraging_mode?: string
  intelligence_score?: Score
  activity_needs_score?: Score
  social_needs_score?: Score
  space_needs_score?: Score
  stress_risk_score?: Score
  size_score?: Score
  need_score?: Score
  conservation_priority?: Score
  visitor_appeal?: Score
  budget_score?: Score
  breeding_category?: string
  breeding_feasibility?: string
  species_description?: string
  fun_fact?: string
  iconic_trait?: string
  group_name?: string
  baby_name?: string
  sound_description?: string
  visitor_tip?: string
  cultural_significance?: string
  uniqueness?: string
}

let cache: Record<string, SpeciesProfile> | undefined
let inflight: Promise<Record<string, SpeciesProfile>> | undefined

/** Fetch once per session. Concurrent callers share the one request. */
export function loadProfiles(): Promise<Record<string, SpeciesProfile>> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = fetch(`${import.meta.env.BASE_URL}data/profiles.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`profiles.json ${r.status}`)
        return r.json() as Promise<Record<string, SpeciesProfile>>
      })
      .then((p) => {
        cache = p
        return p
      })
      .catch((e) => {
        /* A species page without its biology still has its population, its births and its
           animals — every one of which comes from `dims`. So a failure here degrades the
           page rather than breaking it, and the tab says so instead of rendering blanks. */
        inflight = undefined
        throw e
      })
  }
  return inflight
}

/** Whatever has already been fetched, for a synchronous read after `loadProfiles` resolves. */
export const profilesNow = (): Record<string, SpeciesProfile> | undefined => cache

/**
 * The profile for a species id.
 *
 * Species ids in `dims` are `<siteKey>:<name-slug>` because a metric is always asked under a
 * scope. A profile is not scoped, so the site half is dropped: the same warbler at eleven
 * sites has one biology, and holding eleven copies of it is how two of them come to disagree.
 */
export const profileOf = (
  speciesId: string,
  all: Record<string, SpeciesProfile> | undefined = cache,
): SpeciesProfile | undefined => all?.[speciesId.includes(':') ? speciesId.split(':')[1] : speciesId]
