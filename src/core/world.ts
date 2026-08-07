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
 */

import { apportion, between, pickBy, rng } from './seed'

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

/** Ordered biggest-collection first, which is also how every module's rows sort. */
export const SITES: Site[] = [
  {
    key: 'aquatic',
    name: 'Aquatic Halls',
    code: 'AQ',
    enclosures: 22,
    about: 'Freshwater and marine systems. Holds four fifths of the collection by headcount.',
  },
  {
    key: 'aviary',
    name: 'Aviary Complex',
    code: 'AV',
    enclosures: 24,
    about: 'Walk-through and breeding aviaries, and the zoo’s main hatchery.',
  },
  {
    key: 'savanna',
    name: 'Savanna',
    code: 'SV',
    enclosures: 18,
    about: 'Open grassland paddocks for herding ungulates. Site of the central hospital.',
  },
  {
    key: 'reptile',
    name: 'Reptile House',
    code: 'RP',
    enclosures: 14,
    about: 'Controlled-climate vivaria, incubation unit and the quarantine block.',
  },
  {
    key: 'primate',
    name: 'Primate Forest',
    code: 'PR',
    enclosures: 11,
    about: 'Forested islands and night houses for arboreal primates.',
  },
  {
    key: 'carnivore',
    name: 'Carnivore Ridge',
    code: 'CR',
    enclosures: 7,
    about: 'Large predator enclosures with off-show holding and a dedicated feed store.',
  },
]

export const siteOf = (key: string): Site | undefined => SITES.find((s) => s.key === key)
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

/** Kinds that exist for the operation rather than for an animal to live in. */
const SERVICE_KINDS = new Set(['Filtration bay', 'Feed store', 'Incubation room'])

const ENCLOSURE_KINDS: Record<string, string[]> = {
  aquatic: ['Display tank', 'Holding tank', 'Quarantine tank', 'Filtration bay'],
  aviary: ['Walk-through', 'Breeding aviary', 'Flight cage', 'Night shelter'],
  savanna: ['Paddock', 'Night house', 'Holding pen', 'Browse yard'],
  reptile: ['Vivarium', 'Terrarium', 'Basking enclosure', 'Incubation room'],
  primate: ['Island', 'Night house', 'Enrichment yard'],
  carnivore: ['Enclosure', 'Off-show holding', 'Feed store'],
}

/**
 * Enclosures are generated from each site's own count, so the registry and the KPI are
 * the same fact. `AQ-01 … AQ-22` is exactly the code form the records already print.
 */
export const ENCLOSURES: Enclosure[] = SITES.flatMap((site) =>
  Array.from({ length: site.enclosures }, (_, i) => {
    const id = `${site.code}-${String(i + 1).padStart(2, '0')}`
    const kinds = ENCLOSURE_KINDS[site.key] ?? ['Enclosure']
    const r = rng(`enc:${id}`)
    const kind = kinds[i % kinds.length]
    return {
      id,
      name: id,
      siteKey: site.key,
      kind,
      capacity: between(r, 4, 60),
      houses: !SERVICE_KINDS.has(kind),
    }
  }),
)

export const enclosuresOf = (siteKey: string): Enclosure[] =>
  ENCLOSURES.filter((e) => e.siteKey === siteKey)

/** Only the enclosures an animal can be assigned to. */
export const housingIn = (siteKey: string): Enclosure[] =>
  ENCLOSURES.filter((e) => e.siteKey === siteKey && e.houses)

export const enclosureCount = ENCLOSURES.length

/* ── species ─────────────────────────────────────────────────────────────── */

/** The nine scientific classes the collection spans. Derived below, not asserted. */
export type ClassName =
  | 'Mammalia'
  | 'Aves'
  | 'Reptilia'
  | 'Amphibia'
  | 'Actinopterygii'
  | 'Chondrichthyes'
  | 'Malacostraca'
  | 'Insecta'
  | 'Gastropoda'

/** [common name, class, share of its site's headcount]. Weights, not percentages. */
type Sp = [string, ClassName, number]

/**
 * The species each site holds, in the proportions the collection actually has.
 *
 * AQUATIC HALLS IS DELIBERATELY LOPSIDED. One carp population is tens of thousands of
 * animals against Carnivore Ridge's entire 1,892, and that asymmetry is the single most
 * surprising true fact about a collection this size. A tidy even split across every site
 * would make all six look the same shape and lose the only thing this level exists to
 * show.
 */
const SPECIES_BY_SITE: Record<string, Sp[]> = {
  aquatic: [
    ['Common Carp', 'Actinopterygii', 300],
    ['Nile Tilapia', 'Actinopterygii', 230],
    ['Rohu', 'Actinopterygii', 180],
    ['Silver Barb', 'Actinopterygii', 120],
    ['Mrigal Carp', 'Actinopterygii', 96],
    ['Catla', 'Actinopterygii', 88],
    ['Rose Shrimp', 'Malacostraca', 140],
    ['Giant River Prawn', 'Malacostraca', 74],
    ['Indian Mud Crab', 'Malacostraca', 46],
    ['Fiddler Crab', 'Malacostraca', 28],
    ['Apple Snail', 'Gastropoda', 34],
    ['Freshwater Mussel', 'Gastropoda', 22],
    ['Mosquitofish', 'Actinopterygii', 64],
    ['Zebra Danio', 'Actinopterygii', 58],
    ['Climbing Perch', 'Actinopterygii', 30],
    ['Snakehead Murrel', 'Actinopterygii', 24],
    ['Blacktip Reef Shark', 'Chondrichthyes', 9],
    ['Whitespotted Bamboo Shark', 'Chondrichthyes', 6],
    ['Freshwater Stingray', 'Chondrichthyes', 5],
    ['Honeycomb Whipray', 'Chondrichthyes', 3],
    ['Indian Bullfrog', 'Amphibia', 12],
    ['Common Skittering Frog', 'Amphibia', 9],
  ],
  aviary: [
    ['Zebra Finch', 'Aves', 260],
    ['Rock Pigeon', 'Aves', 150],
    ['Indian Peafowl', 'Aves', 132],
    ['Grey Francolin', 'Aves', 108],
    ['Red Avadavat', 'Aves', 96],
    ['Common Myna', 'Aves', 84],
    ['Rose-ringed Parakeet', 'Aves', 76],
    ['Painted Stork', 'Aves', 54],
    ['Black-headed Ibis', 'Aves', 42],
    ['Lesser Whistling Duck', 'Aves', 40],
    ['Indian Skimmer', 'Aves', 30],
    ['Sarus Crane', 'Aves', 22],
    ['Greater Flamingo', 'Aves', 34],
    ['Spot-billed Pelican', 'Aves', 20],
    ['Barn Owl', 'Aves', 14],
    ['Indian Eagle-Owl', 'Aves', 10],
    ['Oriental Darter', 'Aves', 16],
    ['White-rumped Vulture', 'Aves', 8],
    ['Crested Serpent Eagle', 'Aves', 6],
  ],
  savanna: [
    ['Chital', 'Mammalia', 250],
    ['Blackbuck', 'Mammalia', 200],
    ['Sambar', 'Mammalia', 140],
    ['Nilgai', 'Mammalia', 116],
    ['Indian Gazelle', 'Mammalia', 78],
    ['Sangai Deer', 'Mammalia', 62],
    ['Hog Deer', 'Mammalia', 48],
    ['Wild Boar', 'Mammalia', 44],
    ['Four-horned Antelope', 'Mammalia', 34],
    ['Indian Bison', 'Mammalia', 22],
    ['Barasingha', 'Mammalia', 26],
    ['Asiatic Wild Ass', 'Mammalia', 18],
    ['Blue Bull Calf Herd', 'Mammalia', 16],
    ['Indian Hare', 'Mammalia', 30],
    ['Indian Crested Porcupine', 'Mammalia', 20],
  ],
  reptile: [
    ['Indian Flapshell Turtle', 'Reptilia', 230],
    ['Indian Rock Python', 'Reptilia', 160],
    ['Bengal Monitor', 'Reptilia', 140],
    ['Indian Star Tortoise', 'Reptilia', 120],
    ['Marsh Crocodile', 'Reptilia', 96],
    ['Indian Cobra', 'Reptilia', 74],
    ['Russell’s Viper', 'Reptilia', 58],
    ['Malabar Pit Viper', 'Reptilia', 44],
    ['Common Rat Snake', 'Reptilia', 62],
    ['Checkered Keelback', 'Reptilia', 50],
    ['Garden Lizard', 'Reptilia', 40],
    ['Gharial', 'Reptilia', 18],
    ['King Cobra', 'Reptilia', 10],
    ['Indian Chameleon', 'Reptilia', 24],
    ['Common Indian Toad', 'Amphibia', 26],
    ['Bombay Bush Frog', 'Amphibia', 14],
    ['Atlas Moth', 'Insecta', 30],
    ['Common Rose Butterfly', 'Insecta', 22],
    ['Giant Wood Spider Beetle', 'Insecta', 12],
  ],
  primate: [
    ['Rhesus Macaque', 'Mammalia', 260],
    ['Hanuman Langur', 'Mammalia', 210],
    ['Bonnet Macaque', 'Mammalia', 150],
    ['Lion-tailed Macaque', 'Mammalia', 96],
    ['Nilgiri Langur', 'Mammalia', 64],
    ['Slow Loris', 'Mammalia', 52],
    ['Capped Langur', 'Mammalia', 40],
    ['Assamese Macaque', 'Mammalia', 34],
    ['Hoolock Gibbon', 'Mammalia', 20],
    ['Slender Loris', 'Mammalia', 24],
  ],
  carnivore: [
    ['Bengal Fox', 'Mammalia', 220],
    ['Jungle Cat', 'Mammalia', 180],
    ['Striped Hyena', 'Mammalia', 140],
    ['Asiatic Lion', 'Mammalia', 116],
    ['Fishing Cat', 'Mammalia', 96],
    ['Indian Leopard', 'Mammalia', 84],
    ['Golden Jackal', 'Mammalia', 70],
    ['Rusty-spotted Cat', 'Mammalia', 44],
    ['Sloth Bear', 'Mammalia', 38],
    ['Indian Grey Mongoose', 'Mammalia', 46],
    ['Honey Badger', 'Mammalia', 22],
    ['Caracal', 'Mammalia', 14],
  ],
}

export interface Species {
  id: string
  name: string
  cls: ClassName
  siteKey: string
  /** Share of its site's headcount. Normalised at read time. */
  weight: number
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * The species registry.
 *
 * The id carries the site, because the same common name held in two sites is two
 * populations with two enclosure sets and two keepers. Where a *curator's* view is
 * wanted — one Common Carp, wherever it lives — `speciesByName` merges them, and the
 * merge is by name so the two views can never drift apart.
 */
export const SPECIES: Species[] = Object.entries(SPECIES_BY_SITE).flatMap(([siteKey, list]) =>
  list.map(([name, cls, weight]) => ({ id: `${siteKey}:${slug(name)}`, name, cls, siteKey, weight })),
)

export const speciesOf = (id: string): Species | undefined => SPECIES.find((s) => s.id === id)

export const speciesIn = (siteKey?: string): Species[] =>
  siteKey ? SPECIES.filter((s) => s.siteKey === siteKey) : SPECIES

/** Distinct common names — what a curator means by "how many species do we hold". */
export const speciesNames: string[] = [...new Set(SPECIES.map((s) => s.name))].sort()

export const speciesCount = speciesNames.length

export const CLASSES: ClassName[] = [...new Set(SPECIES.map((s) => s.cls))] as ClassName[]

export const classCount = CLASSES.length

/** Every population of one common name, across sites. */
export const speciesByName = (name: string): Species[] => SPECIES.filter((s) => s.name === name)

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

export const DEPARTMENTS: Department[] = (
  [
    ['Animal Keeping', 34],
    ['Veterinary', 14],
    ['Curatorial', 8],
    ['Laboratory', 7],
    ['Pharmacy', 4],
    ['Nutrition', 6],
    ['Horticulture', 8],
    ['Security', 10],
    ['Administration', 6],
    ['IT & Systems', 3],
  ] as [string, number][]
).map(([name, weight]) => ({ id: slug(name), name, weight }))

export const departmentOf = (id: string): Department | undefined => DEPARTMENTS.find((d) => d.id === id)

export interface User {
  id: string
  name: string
  role: string
  departmentId: string
  siteKey: string
  /** Ledger day index of last sign-in. Drives active / dormant. */
  lastActive: number
  /** Sign-ins in the last 90 days — the adoption figure. */
  sessions90: number
  status: 'active' | 'dormant' | 'never'
}

const FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Kabir', 'Ishaan', 'Rudra', 'Aryan',
  'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Meera', 'Kavya', 'Ira', 'Riya', 'Anika', 'Pari',
  'Rajesh', 'Suresh', 'Mahesh', 'Nilesh', 'Bhavesh', 'Jayesh', 'Hitesh', 'Paresh',
  'Priya', 'Sunita', 'Rekha', 'Asha', 'Nita', 'Bhavna', 'Falguni', 'Hansa',
  'Subhash', 'Dinesh', 'Kiran', 'Manoj', 'Vikram', 'Sanjay', 'Pankaj', 'Deepak',
]

const LAST = [
  'Patel', 'Shah', 'Desai', 'Joshi', 'Mehta', 'Trivedi', 'Chauhan', 'Solanki',
  'Rathod', 'Parmar', 'Vaghela', 'Gohil', 'Jadeja', 'Bhatt', 'Pandya', 'Dave',
  'Modi', 'Amin', 'Thakkar', 'Sheth', 'Raval', 'Panchal', 'Vyas', 'Kapadia',
]

const ROLES: Record<string, string[]> = {
  'animal-keeping': ['Head Keeper', 'Senior Keeper', 'Keeper', 'Assistant Keeper'],
  veterinary: ['Chief Veterinarian', 'Senior Veterinarian', 'Veterinarian', 'Veterinary Assistant'],
  curatorial: ['Curator', 'Assistant Curator', 'Registrar'],
  laboratory: ['Lab In-charge', 'Lab Technician', 'Sample Coordinator'],
  pharmacy: ['Pharmacist', 'Store Keeper'],
  nutrition: ['Nutritionist', 'Kitchen Supervisor', 'Feed Assistant'],
  horticulture: ['Horticulturist', 'Gardener', 'Browse Supervisor'],
  security: ['Security Supervisor', 'Security Guard', 'Gate Officer'],
  administration: ['Director', 'Administrative Officer', 'Accounts Officer'],
  'it-systems': ['Systems Administrator', 'Support Engineer'],
}

/*
 * `calendar.ts` is deliberately NOT imported here. It would be a cycle — the calendar has no
 * need of the world, and the world needs exactly one number from it — so the ledger's last
 * index is restated. It must be declared BEFORE the `USERS` initialiser below rather than
 * after it: `const` is hoisted but not initialised, so a reference from an IIFE that runs
 * during module evaluation hits the temporal dead zone. It did, and only in the browser —
 * the bundler used for the invariant checks reordered the declarations and hid it.
 */
const TODAY_INDEX = 2191

/** Total staff accounts. Matches the 312 the attendance module reports against. */
export const STAFF_TOTAL = 312

/**
 * The staff register.
 *
 * Generated, but generated ONCE and deterministically, so a user has one identity
 * wherever they are reached from — an approval's approver, a lab sample's requester, the
 * Users module's own list. Before this, each of those invented its own name.
 *
 * `status` is derived from `lastActive` rather than stored beside it, so the Users
 * module's "dormant" count and the date on the row can never contradict each other.
 */
export const USERS: User[] = (() => {
  const perDept = apportion(STAFF_TOTAL, DEPARTMENTS.map((d) => d.weight))
  /* Staff are spread across sites in proportion to how much housing each one has, which
     is the closest honest proxy for where the work is. */
  const siteWeights = SITES.map((s) => s.enclosures)

  return DEPARTMENTS.flatMap((dept, di) => {
    const count = perDept[di]
    const perSite = apportion(count, siteWeights)
    return SITES.flatMap((site, si) =>
      Array.from({ length: perSite[si] }, (_, i) => {
        const id = `USR-${String(1000 + di * 100 + si * 12 + i).slice(0, 4)}-${di}${si}${i}`
        const r = rng(id)
        const name = `${pickBy(`${id}:f`, FIRST)} ${pickBy(`${id}:l`, LAST)}`
        const roles = ROLES[dept.id] ?? ['Officer']
        /* Roles are ordered seniority-first, so the first person generated in a
           department at a site is its senior — one head keeper per site, not fourteen. */
        const role = i === 0 ? roles[0] : roles[Math.min(roles.length - 1, 1 + Math.floor(r() * (roles.length - 1)))]

        const roll = r()
        const lastActive =
          roll < 0.06 ? -1 : Math.max(0, Math.round(TODAY_INDEX - Math.pow(r(), 2.4) * 210))
        const status: User['status'] =
          lastActive < 0 ? 'never' : TODAY_INDEX - lastActive > 30 ? 'dormant' : 'active'
        const sessions90 =
          status === 'active' ? between(r, 8, 120) : status === 'dormant' ? between(r, 0, 6) : 0

        return { id, name, role, departmentId: dept.id, siteKey: site.key, lastActive, sessions90, status }
      }),
    )
  })
})()


export const userOf = (id: string): User | undefined => USERS.find((u) => u.id === id)
export const usersIn = (siteKey?: string, departmentId?: string): User[] =>
  USERS.filter((u) => (!siteKey || u.siteKey === siteKey) && (!departmentId || u.departmentId === departmentId))

/* ── the organisation ────────────────────────────────────────────────────── */

export const ORG = {
  name: 'Vantara Wildlife Trust',
  zoo: 'Jamnagar Zoo',
  /** Who is signed in. Read from the register rather than typed beside it. */
  viewer: USERS.find((u) => u.role === 'Director') ?? USERS[0],
}
