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

/**
 * A count and the count it is out of, in that order.
 *
 * SAME ARGUMENT AS `Score`, DIFFERENT SOURCE OF THE MISTAKE. A coverage figure has a different
 * denominator for every species — 1,045 Ochre Warblers, 3 Tense Kirin — so a renderer that
 * drew a bar against a fixed 100, or printed a bare numerator, would be wrong on almost all of
 * them. The denominator travels from the ETL and no renderer may supply one.
 */
export type Of = readonly [value: number, outOf: number]

/** A vocabulary as `[label, count]`, commonest first, ties broken alphabetically. */
export type Tally = readonly (readonly [string, number])[]

/**
 * HOW MUCH OF A SPECIES' HOLDING CAN BE TOLD APART — the IDENTIFICATION tab, in one object.
 *
 * COUNTED OVER THE REGISTER, NOT OVER `housing`. `of` is the number of rows `animals.bin` holds
 * for this species name across every site, so the denominator printed at the top of the tab is
 * the same number the animal list beneath it can reproduce. Counting the raw table instead
 * would include the 15 rows the register discards for an unresolvable site or species, and put
 * a headcount on the page that nothing else on it agrees with.
 *
 * ABSENT MEANS ZERO, AND THAT IS WHY IT IS ABSENT. A species with no ringed animals carries no
 * `ring` key, so the page renders no row rather than "0 of 314" — which reads as a finding when
 * it is only a silence.
 *
 * `chip` AND `types` DO NOT RECONCILE, ON PURPOSE. `micro_chip` is filled on 36,530 housing rows
 * and `identifier_type` says 'Micro chip' on 31,084, the latter a strict subset — measured, and
 * recorded in `dims.meta.notes.identification`. Both are reported and neither is adjusted to
 * match the other, so the tab can cite the gap instead of asserting one number.
 */
export interface Identification {
  /** Animals of this species in the register, across every site. The denominator. */
  of: number
  /** `micro_chip` filled. */
  chip?: Of
  /** `ring_number` filled. */
  ring?: Of
  /** `identifier_type` filled. */
  identType?: Of
  /** `identifier_value` filled. */
  identValue?: Of
  /** Neither a chip, nor a ring, nor an identifier type — nothing to tell the animal apart by. */
  none?: Of
  /** Animals whose chip number is also carried by a different animal id. A chip two animals
   *  share identifies neither, so this is stated beside `chip` and never subtracted from it. */
  chipShared?: number
  /** Animals whose chip column holds a recorded refusal — '0', 'No chip', 'No' — rather than a
   *  number. Filled and usable are two facts; reconciling them would hide the useful one. */
  chipVoid?: number
  /** Animals whose ring number is also carried by a different animal id. */
  ringShared?: number
  /** `identifier_type` distribution — 'Micro chip', 'RN', 'Name', 'Local Id', … */
  types?: Tally
}

/**
 * WHAT STOCK THE HOLDING IS — the BREEDS tab.
 *
 * PRESENT ONLY WHERE THERE IS SOMETHING TO SAY. `breed_name` is filled on 4,224 of 110,020
 * housing rows and `morph_name` on 7,810, so 225 of 2,411 held species have either. For the
 * rest the key is absent entirely rather than an object carrying nothing but a denominator,
 * because a card whose only content is the size of the population it knows nothing about is
 * a card that should not render.
 */
export interface Breeds {
  of: number
  withBreed?: Of
  byBreed?: Tally
  withMorph?: Of
  byMorph?: Tally
}

/**
 * ONE NUMERIC ASSESSMENT TYPE, SUMMARISED — and split by unit, never pooled across units.
 *
 * WEIGHT IS RECORDED IN TWO UNITS IN ONE COLUMN: kilogram on 49,502 rows and gram on 34,584.
 * A mean over both is a number with no meaning — it averages a 940 g animal with a 3.1 kg one
 * and reports roughly 470 — so a species weighed in both gets two of these, each naming its
 * own `uom`, and the page shows two rows rather than one wrong one.
 */
export interface Reading {
  /** `assessment_type` — 'Weight', 'Body Condition Score', 'Heart Rate', … */
  type: string
  n: number
  lo: number
  hi: number
  /**
   * A plain number for a measurement, `[mean, outOf]` for a scale.
   *
   * THE SCALES ARE NOT THE SAME AND THE SCHEMA DECLARES NONE. Measured across the dump, Body
   * Condition Score runs 1–5 in half steps, Lively and Sociable run to 10, the musth
   * observations to 3, Mahouts Command to 2. So `outOf` is the highest value recorded ANYWHERE
   * in the dump for that assessment type — which makes it a floor on the true scale rather
   * than the true scale, and a page quoting it should say "recorded up to" and not "out of".
   */
  mean: number | Of
  /** Absent where the source recorded no unit — 80,998 assessment rows carry none. */
  uom?: string
}

/**
 * EVERY ASSESSMENT EVER RECORDED AGAINST THIS SPECIES NAME, at every site, rolled up.
 *
 * WHY THIS IS A ROLLUP AND NOT A METRIC. Every other feed compiles into `events.bin`, whose
 * rows are five integer columns. `assessment_value` is free text carrying "3.135", "544",
 * "Bored/Inactive" and a paragraph about a morning walk, and no column in that format can hold
 * it — a flow block would give a tab that lists WHAT WAS ASSESSED and can never show WHAT WAS
 * FOUND. Summarised against `response_type` and `uom` here, 79,424 weights and 10,409 body
 * condition scores survive as readings instead of as bare counts.
 *
 * WHAT IT THEREFORE CANNOT DO, so no page promises it: there is no per-animal history and no
 * daily series here. `months` is the finest grain, and an individual animal's weight curve
 * would need the assessment feed compiled into `events.bin` with a Float32 value column.
 */
export interface Assessments {
  /** Assessment rows for this species name across all sites. 2 rows of 167,512 are dropped
   *  dump-wide for a date outside the ledger; nothing else is discarded. */
  n: number
  /** Ledger day index of the first and last assessment — days since `meta.epoch`. */
  first: number
  last: number
  /** Distinct assessed animals against the register's count for this species. Both halves are
   *  counted over the same set, so this can never exceed one. */
  assessed?: Of
  /** Assessed animal ids the register does not hold under this name. Zero across the whole
   *  dump today; present only if a re-extract makes the two disagree, and stated if it does. */
  strayIds?: number
  /** `assessment_category` — Physical Health, Behaviour, Nutrition, Endoscopy, … */
  categories?: Tally
  /** `assessment_type`. 135 values dump-wide. */
  types?: Tally
  /** `response_type` — numeric_value, numeric_scale, text, list. */
  responses?: Tally
  /** `life_stage`. Null on 47,183 rows dump-wide, and nulls are dropped rather than bucketed,
   *  so this does NOT sum to `n`. */
  stages?: Tally
  /** `contraception_type`. Set on 1,994 rows dump-wide — real, and never a headline. */
  contraception?: Tally
  /** `YYYY-MM` → assessments in that month. Sparse: absent months are zero. Sums to `n`. */
  months: Record<string, number>
  /** The numeric readings, one entry per (assessment type, unit). Commonest first. */
  readings?: Reading[]
}

export interface SpeciesProfile {
  /**
   * WHAT THE COLLECTION HOLDS, as opposed to what the species is — three blocks appended to the
   * reference biology rather than filed separately, because they are asked on the same page,
   * keyed the same way, and fetched by the same request.
   *
   * A PROFILE MAY NOW CARRY THESE AND NOTHING ELSE. 108 held names have no `species` row at all,
   * so `profileOf` used to return undefined for them and every tab on those pages had nothing.
   * A holding fact does not need reference biology to be true — the register knows how many of
   * them carry a chip whether or not anybody wrote down their gestation — so those slugs now
   * exist with only the blocks below. Read a biology field before checking it is there and you
   * will get undefined, which is the same contract as always.
   */
  identification?: Identification
  breeds?: Breeds
  assessments?: Assessments

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
  /** The husbandry arrangement the source records — 'Co-housed', 'Studbook Managed', … */
  pairing_status?: string
  /** The source's own three-way breeding partition — 'Breeding Possible', 'Unknown Potential',
   *  'Zero Chance'. Carried so a page can state what the SOURCE says beside what the register
   *  counts, and name the two apart rather than letting one stand in for the other. */
  breed_group?: string
  /** Its sub-label — 'All Unsexed', 'Lone Female', … */
  breed_sub?: string
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
