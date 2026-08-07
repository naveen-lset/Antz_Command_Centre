/**
 * The collection by IUCN Red List category, species by species.
 *
 * The Conservation card states ten counts. Every one of them is a question — "which
 * 388 animals are Critically Endangered?" is the only thing a curator wants to know
 * after reading 388 — and until now the card could not answer it.
 *
 * TWO RULES MAKE THIS SAFE TO AUTHOR BY HAND.
 *
 * The species listed for a category must sum to the count the card states, or the
 * drill contradicts the number it opened from. Where a category is too large to
 * enumerate — Least Concern is 176,180 animals across roughly 300 species — the named
 * species are followed by ONE residual row that says how many species it stands for.
 * A residual is honest; a list that silently stops at ten is not.
 *
 * And the at-risk categories are enumerated in full. Those are the ones a conservation
 * plan is written against, and "and 9 others" is exactly the wrong answer there.
 */

export interface RedListSpecies {
  name: string
  cls: string
  count: number
  /** Where the holding is. Several species sit in more than one site. */
  site: string
  /** Set on the aggregate row that closes a large category. */
  residualOf?: number
}

/**
 * Keyed by Red List code. Each list sums to the count on the Conservation card:
 * EX 0 · EW 24 · CR 388 · EN 2,984 · VU 9,640 · NT 24,180 · LC 176,180 · DD 1,640 ·
 * NE 316 · NC 80.
 */
export const RED_LIST_SPECIES: Record<string, RedListSpecies[]> = {
  EX: [],

  EW: [
    { name: 'Père David’s Deer', cls: 'Mammalia', count: 14, site: 'Savanna' },
    { name: 'Socorro Dove', cls: 'Aves', count: 10, site: 'Aviary Complex' },
  ],

  CR: [
    { name: 'Gharial', cls: 'Reptilia', count: 96, site: 'Reptile House' },
    { name: 'White-rumped Vulture', cls: 'Aves', count: 84, site: 'Aviary Complex' },
    { name: 'Indian Vulture', cls: 'Aves', count: 61, site: 'Aviary Complex' },
    { name: 'Pangasius Catfish', cls: 'Actinopterygii', count: 48, site: 'Aquatic Halls' },
    { name: 'Red-headed Vulture', cls: 'Aves', count: 34, site: 'Aviary Complex' },
    { name: 'Great Indian Bustard', cls: 'Aves', count: 22, site: 'Savanna' },
    { name: 'Sumatran Orangutan', cls: 'Mammalia', count: 18, site: 'Primate Forest' },
    { name: 'Hawksbill Turtle', cls: 'Reptilia', count: 14, site: 'Aquatic Halls' },
    { name: 'Malabar Civet', cls: 'Mammalia', count: 6, site: 'Carnivore Ridge' },
    { name: 'Pygmy Hog', cls: 'Mammalia', count: 5, site: 'Savanna' },
  ],

  EN: [
    { name: 'Asiatic Lion', cls: 'Mammalia', count: 42, site: 'Carnivore Ridge' },
    { name: 'Sangai Deer', cls: 'Mammalia', count: 38, site: 'Savanna' },
    { name: 'Lion-tailed Macaque', cls: 'Mammalia', count: 34, site: 'Primate Forest' },
    { name: 'Indian Skimmer', cls: 'Aves', count: 96, site: 'Aviary Complex' },
    { name: 'Egyptian Vulture', cls: 'Aves', count: 74, site: 'Aviary Complex' },
    { name: 'Nile Tilapia', cls: 'Actinopterygii', count: 1_940, site: 'Aquatic Halls' },
    { name: 'Blacktip Reef Shark', cls: 'Chondrichthyes', count: 480, site: 'Aquatic Halls' },
    { name: 'Fishing Cat', cls: 'Mammalia', count: 28, site: 'Carnivore Ridge' },
    { name: 'Indian Pangolin', cls: 'Mammalia', count: 16, site: 'Savanna' },
    { name: 'Nilgiri Langur', cls: 'Mammalia', count: 236, site: 'Primate Forest' },
  ],

  VU: [
    { name: 'Common Carp', cls: 'Actinopterygii', count: 6_180, site: 'Aquatic Halls' },
    { name: 'Sloth Bear', cls: 'Mammalia', count: 34, site: 'Carnivore Ridge' },
    { name: 'Indian Leopard', cls: 'Mammalia', count: 26, site: 'Carnivore Ridge' },
    { name: 'Sarus Crane', cls: 'Aves', count: 118, site: 'Aviary Complex' },
    { name: 'Painted Stork', cls: 'Aves', count: 204, site: 'Aviary Complex' },
    { name: 'Marsh Crocodile', cls: 'Reptilia', count: 186, site: 'Reptile House' },
    { name: 'Star Tortoise', cls: 'Reptilia', count: 342, site: 'Reptile House' },
    { name: 'Freshwater Stingray', cls: 'Chondrichthyes', count: 288, site: 'Aquatic Halls' },
    { name: 'Blackbuck', cls: 'Mammalia', count: 412, site: 'Savanna' },
    { name: 'Hanuman Langur', cls: 'Mammalia', count: 1_850, site: 'Primate Forest' },
  ],

  NT: [
    { name: 'Silver Barb', cls: 'Actinopterygii', count: 8_940, site: 'Aquatic Halls' },
    { name: 'Rose Shrimp', cls: 'Malacostraca', count: 9_620, site: 'Aquatic Halls' },
    { name: 'Sambar', cls: 'Mammalia', count: 486, site: 'Savanna' },
    { name: 'Nilgai', cls: 'Mammalia', count: 394, site: 'Savanna' },
    { name: 'Indian Rock Python', cls: 'Reptilia', count: 268, site: 'Reptile House' },
    { name: 'Flapshell Turtle', cls: 'Reptilia', count: 1_090, site: 'Reptile House' },
    { name: 'Bengal Fox', cls: 'Mammalia', count: 462, site: 'Carnivore Ridge' },
    { name: 'Striped Hyena', cls: 'Mammalia', count: 302, site: 'Carnivore Ridge' },
    { name: 'Grey Francolin', cls: 'Aves', count: 1_640, site: 'Aviary Complex' },
    { name: '18 further species', cls: 'Across 5 classes', count: 978, site: 'All sites', residualOf: 18 },
  ],

  LC: [
    { name: 'Common Carp', cls: 'Actinopterygii', count: 6_220, site: 'Aquatic Halls' },
    { name: 'Nile Tilapia', cls: 'Actinopterygii', count: 4_000, site: 'Aquatic Halls' },
    { name: 'Zebra Finch', cls: 'Aves', count: 6_820, site: 'Aviary Complex' },
    { name: 'Indian Peafowl', cls: 'Aves', count: 4_310, site: 'Aviary Complex' },
    { name: 'Rock Pigeon', cls: 'Aves', count: 2_210, site: 'Aviary Complex' },
    { name: 'Indian Mud Crab', cls: 'Malacostraca', count: 9_480, site: 'Aquatic Halls' },
    { name: 'Chital', cls: 'Mammalia', count: 1_748, site: 'Savanna' },
    { name: 'Rhesus Macaque', cls: 'Mammalia', count: 744, site: 'Primate Forest' },
    { name: 'Monitor Lizard', cls: 'Reptilia', count: 820, site: 'Reptile House' },
    { name: '305 further species', cls: 'Across 9 classes', count: 139_828, site: 'All sites', residualOf: 305 },
  ],

  DD: [
    { name: 'Malabar Pit Viper', cls: 'Reptilia', count: 86, site: 'Reptile House' },
    { name: 'Slow Loris', cls: 'Mammalia', count: 62, site: 'Primate Forest' },
    { name: 'Assorted Euchelicerata', cls: 'Euchelicerata', count: 640, site: 'Insectarium' },
    { name: 'Assorted Insecta', cls: 'Insecta', count: 728, site: 'Insectarium' },
    { name: '11 further species', cls: 'Across 4 classes', count: 124, site: 'All sites', residualOf: 11 },
  ],

  NE: [
    { name: 'Recent accessions', cls: 'Mixed', count: 184, site: 'Quarantine', residualOf: 22 },
    { name: 'Invertebrate cultures', cls: 'Malacostraca', count: 96, site: 'Aquatic Halls', residualOf: 6 },
    { name: 'Hybrid stock', cls: 'Actinopterygii', count: 36, site: 'Aquatic Halls', residualOf: 3 },
  ],

  NC: [{ name: 'Awaiting assessment', cls: 'Mixed', count: 80, site: 'All sites', residualOf: 9 }],
}

/** The count the Conservation card states, per category. Single source for both. */
export const RED_LIST_COUNTS = {
  NC: 80,
  DD: 1_640,
  NE: 316,
  LC: 176_180,
  NT: 24_180,
  VU: 9_640,
  EN: 2_984,
  CR: 388,
  EW: 24,
  EX: 0,
} as const

/**
 * How many species a category holds — named rows plus whatever a residual stands for.
 * Stated on the sheet so "10 rows" is never mistaken for "10 species".
 */
export const speciesCount = (code: string): number =>
  (RED_LIST_SPECIES[code] ?? []).reduce((n, s) => n + (s.residualOf ?? 1), 0)

/** Sum of the listed rows — checked against the card's count so the two cannot drift. */
export const listedTotal = (code: string): number =>
  (RED_LIST_SPECIES[code] ?? []).reduce((n, s) => n + s.count, 0)
