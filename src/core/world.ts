/**
 * THE ENTITY GRAPH. Sites, enclosures, species, hospitals, wards, laboratories,
 * departments, pharmacies, medicines, nurseries, incubators, and people.
 *
 * WHY THIS EXISTS AS ITS OWN LAYER. The product was module-centric: `moduleSites` held a
 * mortality split and a vaccination split and a transfers split, and each one carried its
 * own copy of the word "aquatic". Nothing in the codebase knew that Aquatic Halls was a
 * *thing* — it was a string that eleven tables happened to share. So there was no way to
 * ask "what is going on in Aquatic Halls", only "what does each module say about the
 * string 'aquatic'", and the answers had no obligation to agree.
 *
 * Here every entity is declared once, with an id, and every figure anywhere in the
 * product is attributed to one. Modules become queries over this graph rather than
 * owners of their own private worlds, which is what makes "pick a site and everything
 * follows" true by construction rather than by fourteen pages remembering to do it.
 *
 * COUNTS ARE DERIVED FROM THE REGISTRY, NEVER AUTHORED BESIDE IT. The home screen used to
 * state "428 Species · 9 Classes · 96 Enclosures" as three hand-typed strings next to a
 * species list of forty. `speciesCount`, `classCount` and `enclosureCount` read the
 * registry, so the headline and the list it drills into cannot disagree — and adding a
 * species updates the KPI without anyone remembering to.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE REGISTRIES NOW COME FROM THE DATABASE, not from this file.
 *
 * Sites, species, enclosures, departments and staff are read from `store.ts`, which loads
 * what `tools/etl/build.py` compiled out of `species_mgmt_anon`. The hand-authored versions
 * they replace described a different collection: six sites against the database's fifty,
 * forty species against 2,411, ninety-six enclosures against 15,959, and a headcount that was
 * four-fifths fish where the real one is two-fifths birds.
 *
 * They are `const` arrays FILLED at load rather than reassigned, so every `import { SITES }`
 * elsewhere keeps working against the same reference — and the scalars below are `export let`
 * so their live bindings update with them. Nothing may read either before `loadWorld()`
 * resolves, which is why `main.tsx` awaits it before mounting React.
 *
 * WHAT IS STILL AUTHORED, AND WHY. Hospitals, wards, laboratories, lab departments,
 * pharmacies, medicines, nurseries and incubators have NO counterpart anywhere in the
 * schema — not a table, not a column. They are left exactly as they were so the modules
 * built on them keep rendering rather than crashing, and each is marked below. Their site
 * keys no longer resolve, which is the honest signal that they are not part of the real
 * graph.
 */

import { between, rng } from './seed'
import { data } from './store'

/* ── sites ───────────────────────────────────────────────────────────────── */

export interface Site {
  key: string
  name: string
  /** Enclosure-code prefix, as it appears on records. */
  code: string
  enclosures: number
  /** One line for the entity page — what this site is for. */
  about: string
}

/**
 * Every site the database names, biggest collection first — which is also how every module's
 * rows sort. Filled by `hydrate()`; empty until then.
 *
 * FIFTY, NOT FORTY-EIGHT. `housing` names 48, but two more appear in the reporting tables
 * without a housed animal behind them. Dropping those would silently lose the deaths and
 * accessions attributed to them, so the canonical list is the union.
 */
export const SITES: Site[] = []

const siteById = new Map<string, Site>()
export const siteOf = (key: string): Site | undefined => siteById.get(key)
export const siteName = (key: string): string => siteOf(key)?.name ?? key

/* ── enclosures ──────────────────────────────────────────────────────────── */

export interface Enclosure {
  id: string
  name: string
  siteKey: string
  /** What kind of housing it is — the axis a curator groups enclosures by. */
  kind: string
  capacity: number
  /**
   * Whether animals actually live here.
   *
   * A site's enclosure count includes its service spaces — a filtration bay, a feed store, an
   * incubation room — and those are real enclosures that appear on records but hold no
   * collection. Without this flag an animal could be assigned to one, and the first Asiatic
   * lion generated was housed in a feed store.
   */
  houses: boolean
}

/**
 * Every enclosure named in `housing`, under the site that holds it.
 *
 * The `kind` and `capacity` this interface carries have no source in the schema — the
 * database stores an enclosure as a name and nothing else — so they are left blank rather
 * than filled with a plausible guess. `houses` is true for all of them: every enclosure here
 * is one an animal was actually found in, which is a stronger guarantee than the service-space
 * flag it replaces.
 *
 * The site → enclosure hierarchy is strict in the data: of 15,959 enclosures, none appears
 * under two sites.
 */
export const ENCLOSURES: Enclosure[] = []

const enclosuresBySite = new Map<string, Enclosure[]>()

export const enclosuresOf = (siteKey: string): Enclosure[] => enclosuresBySite.get(siteKey) ?? []

/** Only the enclosures an animal can be assigned to. */
export const housingIn = (siteKey: string): Enclosure[] => enclosuresOf(siteKey)

export let enclosureCount = 0

/* ── species ─────────────────────────────────────────────────────────────── */

/**
 * A scientific class, as the database spells it.
 *
 * WIDENED FROM A NINE-MEMBER UNION TO A STRING, because the union was a claim about the
 * collection and the collection disagrees. The database holds thirteen classes and does not
 * use the same names: `Teleostei` where this file said `Actinopterygii`, plus `Arachnida`,
 * `Chilopoda`, `Holostei` and `Dipnoi` — and none of the `Gastropoda` or `Insecta` the union
 * asserted. Every consumer already defaults on an unknown key, so widening loses nothing.
 */
export type ClassName = string

export interface Species {
  id: string
  name: string
  cls: ClassName
  siteKey: string
  /** Animals of this species currently housed at this site. A real count, not a share. */
  weight: number
  /** IUCN Red List category, verbatim from the reference table. */
  iucn?: string | null
  /** CITES appendix, verbatim from the reference table. */
  cites?: string | null
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * THE SPECIES REGISTRY, read from the database.
 *
 * Keyed by (site, common name), because the same species held at two sites is two
 * populations with two enclosure sets and two keepers — the convention this file already
 * used. `weight` is no longer a share to apportion by: it is the REAL number of that species
 * currently housed at that site, counted from `housing`.
 *
 * The registry spans every (site, species) pair seen anywhere in the data, not just the
 * currently-housed ones. A mortality record names a species that may no longer be held, and
 * an event whose species cannot be resolved would break the invariant that every event lands
 * in exactly one bucket of every dimension. Those pairs carry a weight of zero and are
 * filtered out of population views by the `count > 0` tests already in place.
 *
 * 5,717 pairs across 2,411 distinct common names, against the forty this file used to hold.
 */
export const SPECIES: Species[] = []

const speciesById = new Map<string, Species>()
const speciesBySite = new Map<string, Species[]>()
const speciesByCommonName = new Map<string, Species[]>()

export const speciesOf = (id: string): Species | undefined => speciesById.get(id)

export const speciesIn = (siteKey?: string): Species[] =>
  siteKey ? (speciesBySite.get(siteKey) ?? []) : SPECIES

/** Distinct common names — what a curator means by "how many species do we hold". */
export let speciesNames: string[] = []

export let speciesCount = 0

export let CLASSES: ClassName[] = []

export let classCount = 0

/** Every population of one common name, across sites. */
export const speciesByName = (name: string): Species[] => speciesByCommonName.get(name) ?? []

/* ── hospitals and wards · the Medical hierarchy ──────────────────────────── */

export interface Hospital {
  id: string
  name: string
  code: string
  /** Where it physically sits. It still admits from every site. */
  siteKey: string
  beds: number
}

export interface Ward {
  id: string
  name: string
  hospitalId: string
  beds: number
  /** Wards differ in what they are for, which is what makes the level worth having. */
  kind: 'Intensive' | 'General' | 'Isolation' | 'Surgical' | 'Recovery' | 'Neonatal'
}

export const HOSPITALS: Hospital[] = [
  { id: 'cvh', name: 'Central Veterinary Hospital', code: 'CVH', siteKey: 'savanna', beds: 64 },
  { id: 'ahu', name: 'Aquatic Health Unit', code: 'AHU', siteKey: 'aquatic', beds: 38 },
  { id: 'arc', name: 'Avian & Reptile Clinic', code: 'ARC', siteKey: 'aviary', beds: 30 },
  { id: 'qib', name: 'Quarantine & Isolation Block', code: 'QIB', siteKey: 'reptile', beds: 22 },
]

const WARD_PLAN: Record<string, [string, Ward['kind'], number][]> = {
  cvh: [
    ['Intensive Care', 'Intensive', 10],
    ['General Ward A', 'General', 18],
    ['General Ward B', 'General', 16],
    ['Surgical Suite', 'Surgical', 8],
    ['Recovery', 'Recovery', 12],
  ],
  ahu: [
    ['Treatment Pools', 'General', 16],
    ['Critical Pools', 'Intensive', 8],
    ['Quarantine Pools', 'Isolation', 14],
  ],
  arc: [
    ['Avian Ward', 'General', 12],
    ['Reptile Ward', 'General', 10],
    ['Neonatal', 'Neonatal', 8],
  ],
  qib: [
    ['Isolation A', 'Isolation', 12],
    ['Isolation B', 'Isolation', 10],
  ],
}

export const WARDS: Ward[] = HOSPITALS.flatMap((h) =>
  (WARD_PLAN[h.id] ?? []).map(([name, kind, beds]) => ({
    id: `${h.id}:${slug(name)}`,
    name,
    hospitalId: h.id,
    kind,
    beds,
  })),
)

export const hospitalOf = (id: string): Hospital | undefined => HOSPITALS.find((h) => h.id === id)
export const wardsOf = (hospitalId: string): Ward[] => WARDS.filter((w) => w.hospitalId === hospitalId)
export const wardOf = (id: string): Ward | undefined => WARDS.find((w) => w.id === id)

/* ── laboratories and departments · the Lab hierarchy ─────────────────────── */

export interface Laboratory {
  id: string
  name: string
  code: string
  siteKey: string
}

export interface LabDepartment {
  id: string
  name: string
  labId: string
  /** Working days to a result. Drives whether a sample is overdue. */
  turnaround: number
}

export const LABS: Laboratory[] = [
  { id: 'cdl', name: 'Central Diagnostic Laboratory', code: 'CDL', siteKey: 'savanna' },
  { id: 'fpl', name: 'Field Pathology Laboratory', code: 'FPL', siteKey: 'aquatic' },
]

const LAB_PLAN: Record<string, [string, number][]> = {
  cdl: [
    ['Haematology', 1],
    ['Clinical Pathology', 2],
    ['Microbiology', 4],
    ['Serology', 3],
    ['Histopathology', 7],
    ['Molecular Diagnostics', 5],
  ],
  fpl: [
    ['Parasitology', 2],
    ['Water Quality', 1],
    ['Toxicology', 6],
  ],
}

export const LAB_DEPARTMENTS: LabDepartment[] = LABS.flatMap((l) =>
  (LAB_PLAN[l.id] ?? []).map(([name, turnaround]) => ({
    id: `${l.id}:${slug(name)}`,
    name,
    labId: l.id,
    turnaround,
  })),
)

export const labOf = (id: string): Laboratory | undefined => LABS.find((l) => l.id === id)
export const labDepartmentsOf = (labId: string): LabDepartment[] =>
  LAB_DEPARTMENTS.filter((d) => d.labId === labId)
export const labDepartmentOf = (id: string): LabDepartment | undefined =>
  LAB_DEPARTMENTS.find((d) => d.id === id)

/* ── pharmacies and medicines · the Pharmacy hierarchy ────────────────────── */

export interface Pharmacy {
  id: string
  name: string
  /** `null` for the central store, which belongs to no single site. */
  siteKey: string | null
  central: boolean
}

export interface Medicine {
  id: string
  name: string
  category: 'Antibiotic' | 'Anthelmintic' | 'Analgesic' | 'Anaesthetic' | 'Vaccine' | 'Supplement' | 'Antifungal' | 'Fluid'
  /** Dispensing unit — what one of the consumption counts means. */
  unit: string
  /** Relative share of consumption. */
  weight: number
}

export const PHARMACIES: Pharmacy[] = [
  { id: 'central', name: 'Central Pharmacy', siteKey: null, central: true },
  ...SITES.map((s) => ({ id: `ph-${s.key}`, name: `${s.name} Pharmacy`, siteKey: s.key, central: false })),
]

export const MEDICINES: Medicine[] = (
  [
    ['Enrofloxacin 10%', 'Antibiotic', 'vial', 90],
    ['Amoxicillin–Clavulanate', 'Antibiotic', 'vial', 76],
    ['Ceftriaxone', 'Antibiotic', 'vial', 54],
    ['Oxytetracycline LA', 'Antibiotic', 'vial', 48],
    ['Metronidazole', 'Antibiotic', 'bottle', 40],
    ['Ivermectin 1%', 'Anthelmintic', 'vial', 84],
    ['Fenbendazole', 'Anthelmintic', 'sachet', 70],
    ['Praziquantel', 'Anthelmintic', 'tablet', 58],
    ['Albendazole', 'Anthelmintic', 'bottle', 44],
    ['Meloxicam', 'Analgesic', 'vial', 66],
    ['Butorphanol', 'Analgesic', 'vial', 30],
    ['Tramadol', 'Analgesic', 'vial', 26],
    ['Ketamine–Medetomidine', 'Anaesthetic', 'vial', 34],
    ['Isoflurane', 'Anaesthetic', 'bottle', 22],
    ['Atipamezole', 'Anaesthetic', 'vial', 18],
    ['Rabies Vaccine', 'Vaccine', 'dose', 62],
    ['FMD Trivalent', 'Vaccine', 'dose', 50],
    ['Clostridial 8-way', 'Vaccine', 'dose', 36],
    ['Newcastle Disease (LaSota)', 'Vaccine', 'dose', 44],
    ['Vitamin B-complex', 'Supplement', 'bottle', 72],
    ['Calcium Borogluconate', 'Supplement', 'bottle', 46],
    ['Vitamin E–Selenium', 'Supplement', 'vial', 38],
    ['Multivitamin Premix', 'Supplement', 'kg', 56],
    ['Itraconazole', 'Antifungal', 'capsule', 28],
    ['Ketoconazole Shampoo', 'Antifungal', 'bottle', 20],
    ['Ringer’s Lactate', 'Fluid', 'bag', 80],
    ['Normal Saline 0.9%', 'Fluid', 'bag', 88],
    ['Dextrose 5%', 'Fluid', 'bag', 52],
  ] as [string, Medicine['category'], string, number][]
).map(([name, category, unit, weight]) => ({ id: slug(name), name, category, unit, weight }))

export const pharmacyOf = (id: string): Pharmacy | undefined => PHARMACIES.find((p) => p.id === id)
export const medicineOf = (id: string): Medicine | undefined => MEDICINES.find((m) => m.id === id)
export const sitePharmacies = (): Pharmacy[] => PHARMACIES.filter((p) => !p.central)

/* ── nurseries and incubators · the Eggs hierarchy ────────────────────────── */

export interface Nursery {
  id: string
  name: string
  siteKey: string
}

export interface Incubator {
  id: string
  name: string
  nurseryId: string
  /** Trays, each holding a batch. */
  trays: number
  /** Set-point, in °C — the fact that distinguishes one incubator from another. */
  tempC: number
}

export const NURSERIES: Nursery[] = [
  { id: 'avian', name: 'Avian Hatchery', siteKey: 'aviary' },
  { id: 'reptile', name: 'Reptile Incubation Unit', siteKey: 'reptile' },
  { id: 'aquatic', name: 'Aquatic Hatchery', siteKey: 'aquatic' },
]

export const INCUBATORS: Incubator[] = NURSERIES.flatMap((n) => {
  const count = n.id === 'avian' ? 6 : n.id === 'reptile' ? 4 : 3
  return Array.from({ length: count }, (_, i) => {
    const r = rng(`inc:${n.id}:${i}`)
    return {
      id: `${n.id}:inc-${i + 1}`,
      name: `Incubator ${String(i + 1).padStart(2, '0')}`,
      nurseryId: n.id,
      trays: between(r, 4, 12),
      tempC: n.id === 'avian' ? 37 + Math.round(r() * 10) / 10 : n.id === 'reptile' ? 29 + Math.round(r() * 30) / 10 : 26 + Math.round(r() * 20) / 10,
    }
  })
})

export const nurseryOf = (id: string): Nursery | undefined => NURSERIES.find((n) => n.id === id)
export const incubatorsOf = (nurseryId: string): Incubator[] =>
  INCUBATORS.filter((i) => i.nurseryId === nurseryId)
export const incubatorOf = (id: string): Incubator | undefined => INCUBATORS.find((i) => i.id === id)

/* ── departments and users · the Users hierarchy ──────────────────────────── */

export interface Department {
  id: string
  name: string
  /** Share of staff. */
  weight: number
}

/**
 * The departments the staff register actually splits into.
 *
 * `users` has no department column — it has a ROLE, thirty-nine of them, and that is the
 * finest real grouping the data supports. So a "department" here is a role, and the Users
 * module's Department → User drill is a Role → User drill. That is a rename of a level, not
 * an invention of one: every row under it is a real person with that real job title.
 */
export const DEPARTMENTS: Department[] = []

const departmentById = new Map<string, Department>()
export const departmentOf = (id: string): Department | undefined => departmentById.get(id)

export interface User {
  id: string
  name: string
  role: string
  departmentId: string
  /** `null` where the account has no site assigned, which 84 of them do not. */
  siteKey: string | null
  /** Ledger day index of last sign-in. `null` where the account has never signed in. */
  lastActive: number | null
  /**
   * Records this account has created — observations, medical records and assessments summed.
   *
   * The database counts WORK, not sign-ins, so this is no longer a 90-day session count. It is
   * the better figure for the question the Users module asks ("activity, not headcount") and
   * it is real, which the session count never was.
   */
  sessions90: number
  status: 'active' | 'dormant' | 'never'
}

/** The staff register, read from `users`. */
export const USERS: User[] = []

const userById = new Map<string, User>()
export const userOf = (id: string): User | undefined => userById.get(id)
export const usersIn = (siteKey?: string, departmentId?: string): User[] =>
  USERS.filter((u) => (!siteKey || u.siteKey === siteKey) && (!departmentId || u.departmentId === departmentId))

/** Total staff accounts. */
export let STAFF_TOTAL = 0

/* ── the organisation ────────────────────────────────────────────────────── */

export const ORG: { name: string; zoo: string; viewer: User | undefined } = {
  name: 'Vantara Wildlife Trust',
  zoo: 'Jamnagar Zoo',
  /**
   * Who is signed in. Read from the register rather than typed beside it — and assigned in
   * `hydrate()` rather than here, because the register is empty until the data loads.
   */
  viewer: undefined,
}

/* ── hydration ───────────────────────────────────────────────────────────────── */

/**
 * Fill the registries from the loaded database. Called once by `loadWorld()`.
 *
 * The arrays are MUTATED rather than reassigned so that every `import { SITES }` across the
 * product keeps pointing at the same reference — a reassignment would leave every module that
 * imported before the load holding an empty array forever. The scalars are `export let`, whose
 * ES-module live bindings do update for their importers.
 */
export function hydrate(): void {
  if (SITES.length) return
  const d = data()

  for (const s of d.sites) {
    const site: Site = {
      key: s.key,
      name: s.name,
      code: s.code,
      enclosures: s.enclosures,
      /* Composed from what the record actually says about the site. The authored version
         described what each site was FOR, which nothing in the schema records. */
      about: `${s.animals.toLocaleString('en-US')} animals · ${s.enclosures.toLocaleString('en-US')} enclosures · ${s.sections} sections`,
    }
    SITES.push(site)
    siteById.set(site.key, site)
  }

  for (const e of d.enclosures) {
    const enc: Enclosure = { id: e.id, name: e.name, siteKey: e.siteKey, kind: '', capacity: 0, houses: true }
    ENCLOSURES.push(enc)
    const at = enclosuresBySite.get(enc.siteKey)
    if (at) at.push(enc)
    else enclosuresBySite.set(enc.siteKey, [enc])
  }
  enclosureCount = ENCLOSURES.length

  for (const s of d.species) {
    const sp: Species = {
      id: s.id,
      name: s.name,
      cls: s.cls,
      siteKey: s.siteKey,
      weight: s.weight,
      iucn: s.iucn,
      cites: s.cites,
    }
    SPECIES.push(sp)
    speciesById.set(sp.id, sp)
    const bySite = speciesBySite.get(sp.siteKey)
    if (bySite) bySite.push(sp)
    else speciesBySite.set(sp.siteKey, [sp])
    const byName = speciesByCommonName.get(sp.name)
    if (byName) byName.push(sp)
    else speciesByCommonName.set(sp.name, [sp])
  }
  speciesNames = [...speciesByCommonName.keys()].sort()
  speciesCount = speciesNames.length
  CLASSES = d.classes
  classCount = CLASSES.length

  /* Pharmacies are the one authored hierarchy keyed off the real sites, so it is built here
     rather than at module scope — a site dispensary per site, plus the central store. There
     is no pharmacy table; this is a shape for the module, not a claim about the estate. */
  for (const s of SITES) {
    PHARMACIES.push({ id: `ph-${s.key}`, name: `${s.name} Pharmacy`, siteKey: s.key, central: false })
  }

  for (const dept of d.departments) {
    DEPARTMENTS.push(dept)
    departmentById.set(dept.id, dept)
  }

  for (const u of d.users) {
    const user: User = {
      id: u.id,
      name: u.name,
      role: u.role,
      departmentId: u.departmentId,
      siteKey: u.siteKey,
      lastActive: u.lastActive,
      sessions90: u.observations + u.records + u.assessments,
      status: u.lastActive === null ? 'never' : u.status,
    }
    USERS.push(user)
    userById.set(user.id, user)
  }
  STAFF_TOTAL = USERS.length

  ORG.viewer =
    USERS.find((u) => /director/i.test(u.role)) ??
    USERS.find((u) => /curator/i.test(u.role)) ??
    USERS[0]
}
