/**
 * THE DATA STORE — the compiled database, loaded once, read synchronously forever after.
 *
 * WHY THE ASYNC BOUNDARY IS HERE AND NOWHERE ELSE. `query.ts` states the invariant this file
 * exists to protect: "the moment a figure becomes async, two figures on one screen can be from
 * two different scopes for a frame, which is the contradiction this whole layer exists to
 * prevent." Putting a fetch behind `figure()` would have meant a loading state in forty call
 * sites and a re-run of exactly the bug the façade was written to kill.
 *
 * So there is ONE await, in `main.tsx`, before React mounts. After it resolves, every accessor
 * below is a synchronous read over typed arrays and nothing downstream changes shape. A page
 * still calls `figure(scope, 'mortality')` during render and still gets an integer.
 *
 * WHAT IS LOADED. `tools/etl/build.py` compiles `Dump20260622.sql` into three files:
 *
 *   dims.json    sites, species, enclosures, staff, metric descriptors, detail vocabularies
 *   events.bin   305,754 events — five columns each, sorted by (site, day)
 *   animals.bin  110,005 housed animals — the register `core/animals.ts` never used to have
 *   levels.bin   the population reading for every site on every day
 *
 * COLUMNAR, NOT OBJECTS. 305,754 event objects is 30 MB of allocation and a GC pause on every
 * grouping pass. Five typed arrays is 3.4 MB, and `tally` walks integers — the same shape the
 * seeded model used, so the performance work in `events.ts` still applies.
 */

/* ── the shapes the ETL emits ────────────────────────────────────────────────── */

export interface SiteRow {
  key: string
  name: string
  code: string
  enclosures: number
  sections: number
  animals: number
}

export interface SpeciesRow {
  id: string
  name: string
  cls: string
  siteKey: string
  /** Animals of this species currently housed at this site. */
  weight: number
  /** IUCN Red List category, verbatim from the reference table. `null` where unmatched. */
  iucn: string | null
  /** CITES appendix, verbatim. `null` where unmatched. */
  cites: string | null
}

export interface EnclosureRow {
  id: string
  name: string
  siteKey: string
}

export interface UserRow {
  id: string
  name: string
  role: string
  departmentId: string
  siteKey: string | null
  status: 'active' | 'dormant'
  lastActive: number | null
  observations: number
  records: number
  assessments: number
}

export interface FlowDescriptor {
  kind: 'flow'
  count: number
  unit: string
  grain: 'event' | 'member'
  /** What the classifying dimension is called on this metric — "Manner of death". */
  detailLabel: string
  /** The dimension's real values, in first-seen order. */
  details: string[]
  /** Byte offsets into `events.bin`. */
  animal: number
  day: number
  species: number
  detail: number
  site: number
  /** `siteKey → [start, count]` into the metric's own event block. */
  slices: Record<string, [number, number]>
  /** Extra classifying columns — see `EventColumns.facets`. */
  facets: Record<string, { label: string; values: string[]; offset: number }>
}

export interface LevelDescriptor {
  kind: 'level' | 'rate'
  unit: string
  grain: 'event' | 'member'
  levels: { site: string; now: number; then: number; of?: number }[]
}

export interface AnimalDescriptor {
  count: number
  id: number
  species: number
  enclosure: number
  born: number
  accession: number
  sex: number
  site: number
  flags: number
  origin: number
  /** How the animal came to be held — `housing.accession_type`. */
  origins: string[]
  /** `speciesIndex → [start, count]` into the register. */
  spans: Record<string, [number, number]>
}

export interface Meta {
  database: string
  source: string
  epoch: string
  today: string
  historyDays: number
  sourceRows: Record<string, number>
  discarded: Record<string, number>
  notes: Record<string, string>
}

interface Dims {
  meta: Meta
  sites: SiteRow[]
  classes: string[]
  species: SpeciesRow[]
  enclosures: EnclosureRow[]
  departments: { id: string; name: string; weight: number }[]
  users: UserRow[]
  flows: Record<string, FlowDescriptor>
  rates: Record<string, LevelDescriptor>
  levels: Record<string, LevelDescriptor>
  population: { file: string; sites: string[] }
  animals: AnimalDescriptor
}

/* ── event columns, decoded ──────────────────────────────────────────────────── */

export interface EventColumns {
  count: number
  unit: string
  grain: 'event' | 'member'
  detailLabel: string
  details: string[]
  /** Real animal id, as it appears in the database. `0` where the row carried none. */
  animal: Int32Array
  /** Ledger day index. */
  day: Uint16Array
  /** Index into `SPECIES`. `0xFFFF` where the species could not be resolved. */
  species: Uint16Array
  /** Index into `details`. */
  detail: Uint16Array
  site: Uint8Array
  slices: Record<string, [number, number]>
  /**
   * EXTRA CLASSIFYING COLUMNS, per event.
   *
   * `detail` is the one dimension every flow has. Some metrics record more about each event
   * than that, and those facts are per-EVENT rather than per-metric: a death carries whether
   * its necropsy is done, what condition the carcass was in and how it was disposed of; a
   * consultation carries the severity of its complaint. They travel as extra columns on the
   * same rows, so grouping by one sums to the metric's own total exactly as `detail` does.
   */
  facets: Map<string, { label: string; values: string[]; col: Uint16Array }>
  /**
   * Per-site daily counts, built lazily.
   *
   * Not emitted by the ETL: 50 sites × 2,332 days × 10 metrics of mostly-zero would be
   * 4.5 MB of padding. Built on first read from the metric's own site slice instead, which
   * is one pass over that site's events and nothing else's.
   */
  daily: Map<string, Int32Array>
}

export interface AnimalColumns {
  count: number
  spans: Record<string, [number, number]>
  origins: string[]
  id: Int32Array
  species: Uint16Array
  enclosure: Uint16Array
  born: Uint16Array
  accession: Uint16Array
  sex: Uint8Array
  site: Uint8Array
  /** Bit 0 vaccinated · bit 1 dewormed · bit 2 under care. Set memberships, not draws. */
  flags: Uint8Array
  /** Index into `origins`; 255 where the record carried none. */
  origin: Uint8Array
}

export const FLAG_VACCINATED = 1
export const FLAG_DEWORMED = 2
export const FLAG_CARE = 4

/** Sentinel for a date the source could not supply or that fell outside the ledger. */
export const NO_DAY = 0xffff
/** Sentinel for a species or enclosure that could not be resolved to the registry. */
export const UNRESOLVED = 0xffff

interface Store {
  meta: Meta
  sites: SiteRow[]
  siteIndex: Map<string, number>
  classes: string[]
  species: SpeciesRow[]
  speciesIndex: Map<string, number>
  enclosures: EnclosureRow[]
  departments: { id: string; name: string; weight: number }[]
  users: UserRow[]
  flows: Map<string, EventColumns>
  rates: Record<string, LevelDescriptor>
  levels: Record<string, LevelDescriptor>
  /** `[siteIndex][day]` — the population reading. */
  population: Int32Array[]
  animals: AnimalColumns
}

let store: Store | undefined

/**
 * The loaded data.
 *
 * Throws rather than returning a default, deliberately. A default would let a page render a
 * zero that looks like a figure; the only correct behaviour before the load resolves is not
 * to render at all, which is what `main.tsx` arranges.
 */
export function data(): Store {
  if (!store) throw new Error('core/store: read before load — await loadWorld() before rendering')
  return store
}

export const isLoaded = (): boolean => store !== undefined

/* ── loading ─────────────────────────────────────────────────────────────────── */

const BASE = `${import.meta.env.BASE_URL ?? '/'}data`.replace(/\/{2,}/g, '/')

async function grab(file: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/${file}`)
  if (!res.ok) throw new Error(`core/store: cannot read ${file} (${res.status})`)
  return res.arrayBuffer()
}

/**
 * Fetch and decode the compiled database. Called once, from `main.tsx`, before React mounts.
 *
 * The three binaries are fetched in parallel and decoded as views over their buffers rather
 * than copied — `new Uint16Array(buf, offset, n)` costs nothing and shares memory with the
 * response, so 5.4 MB of data is 5.4 MB of heap and not twice that.
 */
export async function loadWorld(): Promise<void> {
  if (store) return

  const [dimsRes, eventsBuf, animalsBuf, levelsBuf] = await Promise.all([
    fetch(`${BASE}/dims.json`).then((r) => {
      if (!r.ok) throw new Error(`core/store: cannot read dims.json (${r.status})`)
      return r.json() as Promise<Dims>
    }),
    grab('events.bin'),
    grab('animals.bin'),
    grab('levels.bin'),
  ])

  const dims = dimsRes

  const flows = new Map<string, EventColumns>()
  for (const [slug, f] of Object.entries(dims.flows)) {
    flows.set(slug, {
      count: f.count,
      unit: f.unit,
      grain: f.grain,
      detailLabel: f.detailLabel,
      details: f.details,
      animal: new Int32Array(eventsBuf, f.animal, f.count),
      day: new Uint16Array(eventsBuf, f.day, f.count),
      species: new Uint16Array(eventsBuf, f.species, f.count),
      detail: new Uint16Array(eventsBuf, f.detail, f.count),
      site: new Uint8Array(eventsBuf, f.site, f.count),
      slices: f.slices,
      daily: new Map(),
      facets: new Map(
        Object.entries(f.facets ?? {}).map(([name, spec]) => [
          name,
          { label: spec.label, values: spec.values, col: new Uint16Array(eventsBuf, spec.offset, f.count) },
        ]),
      ),
    })
  }

  const a = dims.animals
  const animals: AnimalColumns = {
    count: a.count,
    spans: a.spans,
    origins: a.origins,
    flags: new Uint8Array(animalsBuf, a.flags, a.count),
    origin: new Uint8Array(animalsBuf, a.origin, a.count),
    id: new Int32Array(animalsBuf, a.id, a.count),
    species: new Uint16Array(animalsBuf, a.species, a.count),
    enclosure: new Uint16Array(animalsBuf, a.enclosure, a.count),
    born: new Uint16Array(animalsBuf, a.born, a.count),
    accession: new Uint16Array(animalsBuf, a.accession, a.count),
    sex: new Uint8Array(animalsBuf, a.sex, a.count),
    site: new Uint8Array(animalsBuf, a.site, a.count),
  }

  const days = dims.meta.historyDays
  const population = dims.sites.map(
    (_, i) => new Int32Array(levelsBuf, i * days * 4, days),
  )

  store = {
    meta: dims.meta,
    sites: dims.sites,
    siteIndex: new Map(dims.sites.map((s, i) => [s.key, i])),
    classes: dims.classes,
    species: dims.species,
    speciesIndex: new Map(dims.species.map((s, i) => [s.id, i])),
    enclosures: dims.enclosures,
    departments: dims.departments,
    users: dims.users,
    flows,
    rates: dims.rates,
    levels: dims.levels,
    population,
    animals,
  }
}

/* ── reads ───────────────────────────────────────────────────────────────────── */

export const flowOf = (slug: string): EventColumns | undefined => data().flows.get(slug)

/**
 * A metric's daily count array for one site.
 *
 * Built on first request from that site's own contiguous event slice — the ETL sorts events by
 * (site, day) precisely so this is a walk rather than a scan. Cached for the session, the same
 * way the seeded series were.
 */
export function dailyOf(slug: string, siteKey: string): Int32Array {
  const f = data().flows.get(slug)
  const days = data().meta.historyDays
  if (!f) return new Int32Array(days)

  const hit = f.daily.get(siteKey)
  if (hit) return hit

  const out = new Int32Array(days)
  const span = f.slices[siteKey]
  if (span) {
    const [start, count] = span
    for (let i = start; i < start + count; i++) out[f.day[i]]++
  }
  f.daily.set(siteKey, out)
  return out
}

/**
 * Where a metric's events for one (site, day) begin, as an absolute row index.
 *
 * The ETL sorts each metric's events by (site, day), so the `i`th event of a day is at
 * `offset(site, day) + i` and nothing has to be searched for. The prefix sums are built once
 * per (metric, site) alongside the daily counts and share their cache key.
 */
const offsets = new Map<string, Int32Array>()

export function rowIndex(slug: string, siteKey: string, day: number, i: number): number {
  const f = data().flows.get(slug)
  const span = f?.slices[siteKey]
  if (!f || !span) return -1

  const key = `${slug}:${siteKey}`
  let prefix = offsets.get(key)
  if (!prefix) {
    const counts = dailyOf(slug, siteKey)
    prefix = new Int32Array(counts.length + 1)
    for (let d = 0; d < counts.length; d++) prefix[d + 1] = prefix[d] + counts[d]
    offsets.set(key, prefix)
  }

  if (day < 0 || day >= prefix.length - 1) return -1
  if (i < 0 || i >= prefix[day + 1] - prefix[day]) return -1
  return span[0] + prefix[day] + i
}

/** The whole population series for one site. Charts read it; nothing else should need to. */
export function populationSeries(siteKey: string): Int32Array {
  const s = data()
  const i = s.siteIndex.get(siteKey)
  return i === undefined ? new Int32Array(s.meta.historyDays) : s.population[i]
}

/** The population reading for one site on one day. */
export function populationAt(siteKey: string, day: number): number {
  const s = data()
  const i = s.siteIndex.get(siteKey)
  if (i === undefined) return 0
  const row = s.population[i]
  return row[Math.max(0, Math.min(row.length - 1, day))] ?? 0
}

/**
 * Register row for a database animal id.
 *
 * The index is built on first lookup rather than at boot — most sessions never open an
 * individual animal, and 110,005 entries is not worth putting on the load path for them.
 */
let byId: Map<number, number> | undefined

export function animalRow(id: number): number {
  if (!byId) {
    const a = data().animals
    byId = new Map()
    for (let i = 0; i < a.count; i++) byId.set(a.id[i], i)
  }
  return byId.get(id) ?? -1
}

/** The register slice for one species — `[start, count]` into the animal columns. */
export function speciesSpan(speciesId: string): [number, number] | undefined {
  const s = data()
  const ix = s.speciesIndex.get(speciesId)
  return ix === undefined ? undefined : s.animals.spans[String(ix)]
}
