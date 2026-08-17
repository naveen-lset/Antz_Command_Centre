/**
 * THE SPECIES LIST'S ONE READING OF THE COLLECTION — 2,352 rows, built in a single pass.
 *
 * WHY A TABLE BUILDER AND NOT A PER-ROW HOOK. Every figure this page prints already exists
 * somewhere in `core/`: `speciesWide` sums a name across its sites, `holdingsByEnclosure`
 * counts where it lives, `bySpecies` tallies its births and deaths. Calling those ONCE PER
 * ROW would be quadratic — `stockOfSpecies` re-apportions a whole site's headcount to answer
 * for one species, so 2,352 of them is 2,352 apportionments of eleven sites. This file asks
 * each of those questions once for the WHOLE collection and hands back the rows.
 *
 * THE ROW IS A NAME, NOT A REGISTRY PAIR. `dims` keys a species as `<siteKey>:<name-slug>` —
 * 5,717 rows for 2,352 names — because a metric is always asked under a scope. A curator
 * counting species counts NAMES: an Ochre Warbler at Stonehaven and one at Ironwood are one
 * species held twice. So the list merges by name, exactly as `speciesWide.ts` does for the
 * species page, and `id` on each row is the largest population of that name — the one a
 * reader clicking the row most likely meant. See the note at the top of `speciesWide.ts`;
 * this is the same decision applied to the index rather than to the detail.
 *
 * NOTHING HERE IS A NEW READING. Every number below comes out of a function some other page
 * already draws from, under the same scope, so a species that reads 1,045 in this table reads
 * 1,045 on its own page. The one derived column is `pairable`, and it is derived by counting
 * — see the note on it.
 *
 * WHAT THE SOURCE CANNOT ANSWER, AND IS THEREFORE NOT A COLUMN:
 *   PAIRS / PAIRED — `core/metrics.ts` records `breeding: 'no pairing outcome record'`, and
 *     `speciesPairing.tsx` refuses the word at enclosure grain for the same reason. There is
 *     no pairing, mating or breeding-outcome row anywhere in the dump. What the register CAN
 *     be asked is how many of a species' enclosures hold both sexes together, which is the
 *     precondition rather than the event — so the column is `pairable`, headed PAIRABLE, and
 *     never states that anything was paired.
 *   BREEDING READY — readiness needs maturity, maturity needs an age, and `born` is absent on
 *     81% of register rows. `compositionOf` already refuses it one layer down.
 *
 * COST. One `population()` walk, one `sexSplit` per name, one `holdingsByEnclosure` per
 * POPULATION, and two flow tallies. The middle two are each a single pass over the 110,005
 * register rows in aggregate, not a pass per row — measured at roughly 120 ms cold on the
 * whole collection, and cached per (site, window) below, so filtering, sorting, searching and
 * paging afterwards cost nothing.
 */

import { holdingsByEnclosure, sexSplit } from '../core/animals'
import { bySpecies, population } from '../core/query'
import type { Scope } from '../core/scope'
import { siteKeyOf } from '../core/scope'
import type { SpeciesProfile } from '../core/profiles'
import { siteOf, type Species } from '../core/world'
import { standingOf, type CitesAppendix } from './modules/regulatory'
import type { RedListCode } from '../exec/system'

/* ── the row ─────────────────────────────────────────────────────────────── */

export interface SpeciesListRow {
  /** The common name, which is the identity a curator counts by. */
  name: string
  /** The largest population of this name — where the row navigates to. */
  id: string
  cls: string
  /** Held across every site in scope, on the window's last day. */
  total: number
  male: number
  female: number
  undetermined: number
  /** Sites actually holding one. A site with none is not a site it is at. */
  sites: number
  siteKeys: string[]
  /** Enclosures holding one, counted from the register. Current, never historical. */
  enclosures: number
  /**
   * Enclosures holding BOTH SEXES — the precondition for pairing, not a count of pairings.
   * See the header note; the dump carries no pairing record and this never claims one.
   */
  pairable: number
  births: number
  deaths: number
  /** Sexed as a share of the holding, from the same pair printed beside it. */
  sexedPct: number
  iucn: RedListCode
  cites?: CitesAppendix
  /* ── filled once `profiles.json` resolves; undefined until then ────────── */
  scientific?: string
  /** `micro_chip` filled, as a share of the register's count for this name. */
  chipPct?: number
  /** The source's own breeding partition — 'Conservation Focus', 'Domesticated', … */
  category?: string
  /** `breeding_feasibility`, folded to the five states an operator acts on. */
  readiness?: Readiness
}

/**
 * `breeding_feasibility` carries twelve values, several of which differ only in which sex is
 * short. An operator does one of five things about them, so they fold to five — and the fold
 * is stated here rather than in the filter panel, so the column and the facet cannot drift.
 */
export type Readiness =
  | 'Both sexes present'
  | 'Needs sexing'
  | 'Needs pairing'
  | 'Unbalanced'
  | 'Lone animal'

const READINESS: [RegExp, Readiness][] = [
  [/^breeding ready/i, 'Both sexes present'],
  [/^lone/i, 'Lone animal'],
  [/^needs pairing/i, 'Needs pairing'],
  [/^unbalanced/i, 'Unbalanced'],
  [/sexed|sexing/i, 'Needs sexing'],
]

const readinessOf = (raw?: string): Readiness | undefined =>
  raw ? READINESS.find(([test]) => test.test(raw))?.[1] : undefined

/* ── the build ───────────────────────────────────────────────────────────── */

/**
 * Every species in scope, with everything the list column-set asks of it.
 *
 * Cached on (site, window) at module scope rather than in a `useMemo`, so re-mounting the page
 * — which the router does on every navigation — does not re-walk the register. The cache holds
 * one entry: a reader moves the window forward, not back and forth between eleven of them, and
 * an unbounded map of 2,352-row arrays is a leak dressed as an optimisation.
 */
let cacheKey = ''
let cached: SpeciesListRow[] = []

export function speciesRows(scope: Scope): SpeciesListRow[] {
  const siteKey = siteKeyOf(scope)
  const key = `${siteKey ?? '*'}|${scope.win.from}|${scope.win.to}`
  if (key === cacheKey) return cached
  cacheKey = key
  cached = build(scope)
  return cached
}

function build(scope: Scope): SpeciesListRow[] {
  /* One apportionment of every site's headcount, shared by every row below. */
  const held = population(scope)

  /* Merge the registry pairs into names. `population` is already sorted biggest-first, so the
     first pair seen for a name is its largest population — which is the one the row opens. */
  const groups = new Map<string, { species: Species; count: number }[]>()
  for (const row of held) {
    const at = groups.get(row.species.name)
    if (at) at.push(row)
    else groups.set(row.species.name, [row])
  }

  /* The two flow tallies, asked once each for the whole collection. `bySpecies` keys a flow by
     species NAME already merged across sites, which is the same key this table uses. */
  const births = new Map(bySpecies(scope, 'births').map((r) => [r.label, r.value]))
  const deaths = new Map(bySpecies(scope, 'mortality').map((r) => [r.label, r.value]))

  const out: SpeciesListRow[] = []

  for (const [name, pops] of groups) {
    const total = pops.reduce((n, p) => n + p.count, 0)
    if (total <= 0) continue

    /* The sanctioned split — apportioned to the window's headcount, so the parts sum to the
       total exactly even on a reconstructed earlier day. Asked once per NAME with all of its
       populations, which is one span walk per population and no more. */
    const split = sexSplit(pops)

    /* Where it lives. Walked once per population; `holdingsByEnclosure` is unscaled and
       current by construction (the register carries no enclosure-move history), which the
       column header says rather than this pretending otherwise. */
    let enclosures = 0
    let pairable = 0
    for (const p of pops) {
      for (const h of holdingsByEnclosure(p.species.id)) {
        enclosures++
        if (h.male > 0 && h.female > 0) pairable++
      }
    }

    const standing = standingOf(name)
    const sexed = split.male + split.female

    out.push({
      name,
      id: pops[0].species.id,
      cls: pops[0].species.cls,
      total,
      male: split.male,
      female: split.female,
      undetermined: split.undetermined,
      sites: pops.length,
      siteKeys: pops.map((p) => p.species.siteKey),
      enclosures,
      pairable,
      births: births.get(name) ?? 0,
      deaths: deaths.get(name) ?? 0,
      sexedPct: total > 0 ? (sexed / total) * 100 : 0,
      iucn: standing.iucn,
      cites: standing.cites,
    })
  }

  return out.sort((a, b) => b.total - a.total)
}

/**
 * The reference biology, folded onto rows that already exist.
 *
 * SEPARATE FROM THE BUILD, because `profiles.json` is 6.2 MB fetched on demand while every
 * figure above is synchronous off `dims`. Blocking the table on the fetch would leave the page
 * empty for as long as the network takes to answer a question about four of its columns; this
 * way the population, the split, the sites and the flows are on screen immediately and the
 * scientific name, the chip share and the two source classifications arrive when they arrive.
 *
 * Returns a NEW array — the rows are read by `useMemo` downstream and mutating them in place
 * would not re-render.
 */
export function withProfiles(
  rows: SpeciesListRow[],
  profiles: Record<string, SpeciesProfile> | undefined,
): SpeciesListRow[] {
  if (!profiles) return rows
  return rows.map((r) => {
    /* Species ids are `<siteKey>:<name-slug>`; a profile is unscoped, so the site half goes.
       The same fold `profileOf` makes, inlined because this runs 2,352 times. */
    const p = profiles[r.id.includes(':') ? r.id.slice(r.id.indexOf(':') + 1) : r.id]
    if (!p) return r
    const chip = p.identification?.chip
    return {
      ...r,
      scientific: p.scientific_name,
      /* From the pair the ETL supplied, never from a denominator invented here — the defect
         behind the reference design's "110% chipped". Absent where nothing is recorded, so the
         cell prints an em dash rather than 0%, which would read as a finding. */
      chipPct: chip && chip[1] > 0 ? (chip[0] / chip[1]) * 100 : undefined,
      category: p.breeding_category,
      readiness: readinessOf(p.breeding_feasibility),
    }
  })
}

/* ── the facets the panel offers ─────────────────────────────────────────── */

/** Which axis a filter group narrows on. One key per group, and the group owns the fold. */
export type FacetKey =
  | 'analysis'
  | 'category'
  | 'cls'
  | 'population'
  | 'readiness'
  | 'conservation'
  | 'cites'
  | 'gender'
  | 'site'

export interface FacetGroup {
  key: FacetKey
  label: string
  /** Open on arrival. Category and Class are, per the reference; the rest are not. */
  open: boolean
  /** How many values to show before "+ N more". */
  cap: number
  values: { value: string; label: string; count: number }[]
}

/**
 * The value one row takes on one axis, or `null` where the axis does not apply to it.
 *
 * A ROW CAN SIT UNDER SEVERAL VALUES OF ONE AXIS — a species held at four sites answers to
 * four of the SITE checkboxes, and one flagged by three analyses answers to three. So this
 * returns an array, and a group matches when ANY of its ticked values is in it. Between groups
 * the test is AND: ticking Aves and Endangered asks for endangered birds, not for either.
 */
function valuesOf(row: SpeciesListRow, key: FacetKey): string[] {
  switch (key) {
    case 'analysis':
      return analysesOf(row)
    case 'category':
      return row.category ? [row.category] : []
    case 'cls':
      return [row.cls]
    case 'population':
      return [bandOf(row.total)]
    case 'readiness':
      return row.readiness ? [row.readiness] : []
    case 'conservation':
      return [row.iucn]
    case 'cites':
      return [row.cites ? `Appendix ${row.cites}` : 'Not listed']
    case 'gender':
      return [genderOf(row)]
    case 'site':
      return row.siteKeys
  }
}

/** Population bands. Fixed rather than quantile — a curator's "how many do we hold" is absolute. */
export const POPULATION_BANDS: [label: string, lo: number, hi: number][] = [
  ['Single animal', 1, 1],
  ['2 – 9', 2, 9],
  ['10 – 49', 10, 49],
  ['50 – 199', 50, 199],
  ['200 – 999', 200, 999],
  ['1,000 +', 1000, Infinity],
]

const bandOf = (n: number): string =>
  POPULATION_BANDS.find(([, lo, hi]) => n >= lo && n <= hi)?.[0] ?? POPULATION_BANDS[0][0]

/** What the register knows about a holding's sexes — the same vocabulary `compositionOf` uses. */
const genderOf = (r: SpeciesListRow): string => {
  if (r.male > 0 && r.female > 0) return 'Both sexes'
  if (r.male + r.female === 0) return 'All unsexed'
  if (r.male > 0) return r.undetermined > 0 ? 'Males + unsexed' : 'Males only'
  return r.undetermined > 0 ? 'Females + unsexed' : 'Females only'
}

/**
 * ANALYSIS — the saved questions, each one a test over columns already on screen.
 *
 * These are lenses rather than a dimension: nothing in the source says "at risk and growing",
 * it is `iucn` and `births` read together. Every one is computable from the row, so a reader
 * can check the answer by looking along it — which is the bar a derived filter has to clear
 * before it earns a place beside the source's own classifications.
 */
export const ANALYSES: { value: string; test: (r: SpeciesListRow) => boolean }[] = [
  { value: 'At risk', test: (r) => RISK.has(r.iucn) },
  /**
   * THREE OR FEWER — the reference build calls this CRISIS and it is the sharpest signal in the
   * whole table: a species down to three animals is one loss from being gone from the
   * collection. It was derivable from the Population facet's "Single animal" and "2 – 9" bands
   * and therefore not actually available, because 2–9 spans the line that matters. Stated as its
   * own lens so it can be counted on the home screen and ticked in the panel from one
   * definition. Deliberately overlaps 'Single animal'; a lens is a question, not a partition.
   */
  { value: 'Three or fewer', test: (r) => r.total <= 3 },
  { value: 'Losing ground', test: (r) => r.deaths > r.births && r.deaths > 0 },
  { value: 'Gaining ground', test: (r) => r.births > r.deaths && r.births > 0 },
  /**
   * SINGLE SEX — held in numbers, but every animal the same sex, so the holding cannot breed
   * however long it is left. The reference calls the same idea "breeding stalled". Restricted to
   * holdings that ARE sexed: a wholly unsexed group is not single-sex, it is unknown, and the
   * lens beside this one already names that case.
   */
  { value: 'Single sex', test: (r) => r.male + r.female > 0 && (r.male === 0 || r.female === 0) },
  { value: 'Wholly unsexed', test: (r) => r.male + r.female === 0 },
  { value: 'Single animal', test: (r) => r.total === 1 },
  { value: 'Held at one site', test: (r) => r.sites === 1 },
  { value: 'Across four or more sites', test: (r) => r.sites >= 4 },
]

const RISK = new Set<RedListCode>(['EX', 'EW', 'CR', 'EN', 'VU'])

/** The categories a curator means by critical — worse than endangered, not merely at risk. */
export const CRITICAL = new Set<RedListCode>(['CR', 'EW', 'EX'])

const analysesOf = (r: SpeciesListRow): string[] =>
  ANALYSES.filter((a) => a.test(r)).map((a) => a.value)

/* ── filtering ───────────────────────────────────────────────────────────── */

export type Picked = Partial<Record<FacetKey, Set<string>>>

export const pickedCount = (picked: Picked): number =>
  Object.values(picked).reduce((n, s) => n + (s?.size ?? 0), 0)

/**
 * Rows surviving every ticked group, and the text query.
 *
 * AND between groups, OR within one — see `valuesOf`. Ticking nothing in a group means the
 * group is not narrowing, which is why an empty set is skipped rather than matching nothing.
 */
export function applyFilters(rows: SpeciesListRow[], picked: Picked, query: string): SpeciesListRow[] {
  const q = query.trim().toLowerCase()
  const groups = (Object.entries(picked) as [FacetKey, Set<string>][]).filter(([, s]) => s.size > 0)
  if (!groups.length && !q) return rows

  return rows.filter((r) => {
    /* Common AND scientific name, because a keeper searches the first and a vet the second. */
    if (q && !r.name.toLowerCase().includes(q) && !r.scientific?.toLowerCase().includes(q)) return false
    for (const [key, on] of groups) {
      const mine = valuesOf(r, key)
      if (!mine.some((v) => on.has(v))) return false
    }
    return true
  })
}

/**
 * The panel's groups, counted against the rows that survive EVERY OTHER group.
 *
 * WHY NOT AGAINST THE VISIBLE ROWS. A count taken after its own group is applied reads "Aves
 * 981" before the tick and "Aves 981 · Reptilia 0" after it, which tells a reader that ticking
 * Reptilia as well would find nothing — and it would find 698. Counting each group against the
 * others only is the standard faceted-search answer: the number beside a box is what ticking it
 * would ADD, so the badge is a promise the tap keeps.
 */
export function facets(rows: SpeciesListRow[], picked: Picked, query: string): FacetGroup[] {
  return GROUPS.map((g) => {
    const others: Picked = { ...picked }
    delete others[g.key]
    const pool = applyFilters(rows, others, query)

    const tally = new Map<string, number>()
    for (const r of pool) for (const v of valuesOf(r, g.key)) tally.set(v, (tally.get(v) ?? 0) + 1)

    /* A value that is ticked stays listed at zero rather than vanishing under the reader's
       finger — a checkbox that disappears when you tick it cannot be un-ticked. */
    for (const v of picked[g.key] ?? []) if (!tally.has(v)) tally.set(v, 0)

    const values = [...tally.entries()]
      .map(([value, count]) => ({ value, label: g.name?.(value) ?? value, count }))
      .sort((a, b) => (g.order ? g.order(a.value) - g.order(b.value) : b.count - a.count))

    return { key: g.key, label: g.label, open: g.open, cap: g.cap, values }
  })
}

interface GroupDef {
  key: FacetKey
  label: string
  open: boolean
  cap: number
  /** Printed instead of the raw value — a site key is not a site name. */
  name?: (value: string) => string
  /** A published order, where the values have one. Absent means biggest first. */
  order?: (value: string) => number
}

const IUCN_ORDER = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE', 'NC']
const IUCN_NAME: Record<string, string> = {
  EX: 'Extinct',
  EW: 'Extinct in the Wild',
  CR: 'Critically Endangered',
  EN: 'Endangered',
  VU: 'Vulnerable',
  NT: 'Near Threatened',
  LC: 'Least Concern',
  DD: 'Data Deficient',
  NE: 'Not Evaluated',
  NC: 'Not Checked',
}

const GROUPS: GroupDef[] = [
  { key: 'analysis', label: 'Analysis', open: false, cap: 8 },
  /* Open on arrival, per the reference — these two are the axes a curator narrows on first. */
  { key: 'category', label: 'Category', open: true, cap: 6 },
  { key: 'cls', label: 'Class', open: true, cap: 6 },
  {
    key: 'population',
    label: 'Population',
    open: false,
    cap: 8,
    order: (v) => POPULATION_BANDS.findIndex(([l]) => l === v),
  },
  { key: 'readiness', label: 'Readiness', open: false, cap: 6 },
  {
    key: 'conservation',
    label: 'Conservation',
    open: false,
    cap: 6,
    name: (v) => IUCN_NAME[v] ?? v,
    order: (v) => IUCN_ORDER.indexOf(v),
  },
  { key: 'cites', label: 'CITES', open: false, cap: 6 },
  { key: 'gender', label: 'Gender', open: false, cap: 6 },
  { key: 'site', label: 'Site', open: false, cap: 6, name: (v) => siteOf(v)?.name ?? v },
]

/* ── the filters as a link ───────────────────────────────────────────────── */

/**
 * THE QUERY KEY EACH GROUP ANSWERS TO — what makes a species count elsewhere a real link.
 *
 * A figure on another page that reads "231 species" is only worth clicking if the page it
 * opens shows those 231. So the list's filter state is addressable: `#/browse/species?iucn=EN`
 * lands on the endangered ones, `?cls=Aves&iucn=EN` on the endangered birds, and the panel
 * opens with those boxes already ticked so the reader can widen from there rather than start
 * again. `scope.tsx` was taught to preserve these — read the note on `buildHash` there for
 * why they used to be stripped.
 *
 * MULTI-VALUED BY REPETITION, not by a separator. Two of these values contain a comma
 * ("1,000 +") and several contain a plus ("Both Sexes + Unsexed"), so any character chosen to
 * join them would eventually appear inside one. `?cls=Aves&cls=Reptilia` has no such problem.
 *
 * THE SITE AXIS IS NOT HERE. A link that means "the species at Ironwood" sets the GLOBAL site
 * scope (`?s=ironwood`), because that also re-cuts every figure in the table to that site —
 * where ticking the panel's SITE box would filter the rows while leaving the populations
 * counted estate-wide. Two site controls that disagree is worse than one that is a step away.
 */
export const FACET_PARAM: Record<FacetKey, string> = {
  analysis: 'lens',
  category: 'cat',
  cls: 'cls',
  population: 'pop',
  readiness: 'ready',
  conservation: 'iucn',
  cites: 'cites',
  gender: 'sex',
  site: 'at',
}

const PARAM_FACET = Object.entries(FACET_PARAM) as [FacetKey, string][]

/** The ticked boxes a URL asks for. Unknown keys and empty values are ignored, not errors. */
export function pickedFromParams(params: URLSearchParams): Picked {
  const out: Picked = {}
  for (const [key, param] of PARAM_FACET) {
    const values = params.getAll(param).filter(Boolean)
    if (values.length) out[key] = new Set(values)
  }
  return out
}

/**
 * The same state as a query, for writing back after the reader changes something.
 *
 * A key mapped to `null` is one to REMOVE — the caller cannot know which params were there
 * before, so every facet is named on every write and the ones with nothing ticked say so.
 */
export function paramsFromPicked(picked: Picked, query: string): Record<string, string[] | null> {
  const out: Record<string, string[] | null> = { q: query.trim() ? [query.trim()] : null }
  for (const [key, param] of PARAM_FACET) {
    const on = picked[key]
    out[param] = on && on.size ? [...on] : null
  }
  return out
}

/* ── sorting ─────────────────────────────────────────────────────────────── */

export type SortKey =
  | 'name'
  | 'total'
  | 'sites'
  | 'enclosures'
  | 'pairable'
  | 'births'
  | 'deaths'
  | 'sexedPct'
  | 'chipPct'

/**
 * Sorted in place on a copy.
 *
 * A MISSING NUMBER SORTS LAST IN BOTH DIRECTIONS. `chipPct` is undefined until `profiles.json`
 * lands and stays undefined for a species the register has no identification rollup for;
 * treating that as zero would put "nothing is known" at the top of an ascending sort as though
 * it were a coverage finding.
 */
export function sortRows(rows: SpeciesListRow[], key: SortKey, dir: 'asc' | 'desc'): SpeciesListRow[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'name') return sign * a.name.localeCompare(b.name)
    const x = a[key]
    const y = b[key]
    if (x === undefined) return y === undefined ? 0 : 1
    if (y === undefined) return -1
    return sign * (x - y) || a.name.localeCompare(b.name)
  })
}

/* ── export ──────────────────────────────────────────────────────────────── */

const CSV_HEAD = [
  'No',
  'Species',
  'Scientific name',
  'Class',
  'IUCN',
  'CITES',
  'Population',
  'Male',
  'Female',
  'Unsexed',
  'Sites',
  'Enclosures',
  'Pairable enclosures',
  'Births',
  'Deaths',
  'Sexed %',
  'Chip %',
]

/**
 * The rows on screen, as a file — the same set, the same order, the same numbers.
 *
 * CLIENT-SIDE AND NOTHING ELSE. There is no export endpoint in this product and this does not
 * invent one: the table is already derived in the browser, so the download is the array that
 * drew it, serialised. What that buys is that the file cannot disagree with the screen — an
 * export built from a second query is a second reading of the collection.
 *
 * Filtered and sorted, deliberately. A reader who has narrowed to 41 endangered birds and
 * pressed Download wants those 41; handing them 2,352 would discard the work they just did.
 */
export function toCsv(rows: SpeciesListRow[]): string {
  const cell = (v: string | number | undefined): string => {
    if (v === undefined) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const pct = (n?: number) => (n === undefined ? '' : n.toFixed(1))

  const lines = [CSV_HEAD.join(',')]
  rows.forEach((r, i) => {
    lines.push(
      [
        i + 1,
        r.name,
        r.scientific,
        r.cls,
        r.iucn,
        r.cites ? `Appendix ${r.cites}` : '',
        r.total,
        r.male,
        r.female,
        r.undetermined,
        r.sites,
        r.enclosures,
        r.pairable,
        r.births,
        r.deaths,
        pct(r.sexedPct),
        pct(r.chipPct),
      ]
        .map(cell)
        .join(','),
    )
  })
  return lines.join('\n')
}

/** The window and site the file was cut under, in its name — so two downloads cannot be confused. */
export function csvName(scope: Scope): string {
  const site = scope.site ? scope.site.code.toLowerCase() : 'all-sites'
  return `antz-species-${site}-${scope.win.key}.csv`
}
