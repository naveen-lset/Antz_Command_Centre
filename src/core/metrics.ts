/**
 * THE METRIC CONSTRAINTS — what the collection actually reported, per site.
 *
 * This is the only authored numeric data in the product. Everything else — daily series,
 * species splits, individual records, every window on every page — is derived from it.
 *
 * TWO ROW SHAPES, BECAUSE THERE ARE TWO KINDS OF NUMBER, and conflating them is what the
 * old model did wrong. A FLOW accumulates: five nested window totals pin its shape over
 * time. A LEVEL is a reading taken at an instant: it has a value now and a value six
 * months ago, and no "all time" version at all — the all-time question about a population
 * is "how many have we ever held", which is a different metric with a different name, not
 * the same one over a longer window.
 *
 * The old `Series` type gave levels five columns anyway, so `animals` carried an all-time
 * figure of 221,800 that read as a running total of a headcount. Nothing consumed it
 * correctly and nothing could have.
 *
 * WHY THE FLOW ROWS ARE NESTED WINDOW TOTALS rather than a daily array. Nobody can author
 * 2,192 days × 6 sites × 13 metrics, and nobody can check it. But five totals per site
 * are readable, arguable, and pin the series tightly enough that every window in the
 * product lands within a rounding unit of what a real aggregation would give.
 * `series.ts` turns them into days.
 */

/** Nested window totals for a flow: [today, last 7 days, this month, last 6 months, all time]. */
export type Flow = [today: number, week: number, month: number, sixMonths: number, all: number]

export interface FlowRow {
  site: string
  v: Flow
}

/** A reading at an instant: now, and the same reading six months ago. */
export interface LevelRow {
  site: string
  now: number
  then: number
  /** Denominator, for a metric whose figure is a rate. Moves slowly; treated as fixed. */
  of?: number
}

export type MetricKind = 'flow' | 'level' | 'rate'

export interface Metric {
  /** Word after the number. Singular-agnostic — "deaths", not "death(s)". */
  unit: string
  kind: MetricKind
  /** What one row means at the finest level — a member of the collection, or an event. */
  grain: 'member' | 'event'
  flows?: FlowRow[]
  levels?: LevelRow[]
}

/*
 * Every `month` / `now` column below sums to the figure its page already states:
 *   animals 215,432 · accession 18 · births 45 · eggs 142 · hatched 96 · discarded 13
 *   fetal 5 · mortality 23 · health 124 · disease 9 · vaccination 2,184 of 2,374 (92%)
 *   preventive 2,136 of 2,374 (90%) · deworming 63 · transfers 28 · labOpen 31
 *   approvals 14 · tasks 41 of 76 · attendance 243 of 312 · alerts 36 · critical 6
 *
 * Those totals are asserted by `core/__checks__` at module load in development, so a typo
 * here fails loudly rather than quietly moving a headline.
 */
export const METRICS: Record<string, Metric> = {
  /* ── population and life events ─────────────────────────────────────────── */

  animals: {
    unit: 'animals',
    kind: 'level',
    grain: 'member',
    levels: [
      { site: 'aquatic', now: 178400, then: 172900 },
      { site: 'aviary', now: 21300, then: 20640 },
      { site: 'savanna', now: 6240, then: 6080 },
      { site: 'reptile', now: 5120, then: 4980 },
      { site: 'primate', now: 2480, then: 2410 },
      { site: 'carnivore', now: 1892, then: 1830 },
    ],
  },

  /* Three sites reported an intake this month, six over six months. A quiet site is
     normal for a low-volume flow, and the Accession page says "3 Sites" for this reason. */
  accession: {
    unit: 'intakes',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aquatic', v: [1, 2, 8, 34, 412] },
      { site: 'aviary', v: [0, 2, 6, 22, 268] },
      { site: 'savanna', v: [0, 1, 4, 17, 196] },
      { site: 'reptile', v: [0, 0, 0, 12, 141] },
      { site: 'primate', v: [0, 0, 0, 9, 104] },
      { site: 'carnivore', v: [0, 0, 0, 6, 73] },
    ],
  },

  births: {
    unit: 'births',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aquatic', v: [2, 4, 14, 82, 986] },
      { site: 'aviary', v: [1, 3, 11, 64, 742] },
      { site: 'savanna', v: [0, 2, 8, 47, 538] },
      { site: 'reptile', v: [0, 1, 5, 29, 331] },
      { site: 'primate', v: [0, 1, 4, 24, 268] },
      { site: 'carnivore', v: [0, 0, 3, 18, 196] },
    ],
  },

  eggs: {
    unit: 'eggs',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aviary', v: [4, 22, 96, 540, 6280] },
      { site: 'reptile', v: [1, 8, 34, 196, 2264] },
      { site: 'aquatic', v: [0, 3, 12, 64, 742] },
      { site: 'savanna', v: [0, 0, 0, 0, 0] },
      { site: 'primate', v: [0, 0, 0, 0, 0] },
      { site: 'carnivore', v: [0, 0, 0, 0, 0] },
    ],
  },

  /* Hatchings, against the eggs laid above. Its own metric rather than a fraction of
     `eggs`, because a clutch laid in July may hatch in August. */
  hatched: {
    unit: 'hatched',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aviary', v: [3, 15, 62, 352, 4090] },
      { site: 'reptile', v: [1, 5, 24, 132, 1520] },
      { site: 'aquatic', v: [0, 2, 10, 44, 512] },
      { site: 'savanna', v: [0, 0, 0, 0, 0] },
      { site: 'primate', v: [0, 0, 0, 0, 0] },
      { site: 'carnivore', v: [0, 0, 0, 0, 0] },
    ],
  },

  discarded: {
    unit: 'discarded',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aviary', v: [1, 2, 9, 48, 552] },
      { site: 'reptile', v: [0, 1, 3, 17, 196] },
      { site: 'aquatic', v: [0, 0, 1, 6, 68] },
      { site: 'savanna', v: [0, 0, 0, 0, 0] },
      { site: 'primate', v: [0, 0, 0, 0, 0] },
      { site: 'carnivore', v: [0, 0, 0, 0, 0] },
    ],
  },

  fetal: {
    unit: 'losses',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'savanna', v: [0, 1, 2, 9, 104] },
      { site: 'aquatic', v: [0, 0, 2, 4, 46] },
      { site: 'aviary', v: [0, 0, 1, 6, 72] },
      { site: 'primate', v: [0, 0, 0, 4, 41] },
      { site: 'reptile', v: [0, 0, 0, 2, 24] },
      { site: 'carnivore', v: [0, 0, 0, 2, 19] },
    ],
  },

  /* The month column is pinned by three separate claims on the Mortality page: Aquatic
     Halls is 11 of 23 (48%), five sites reported, and the highest of the other four is 5. */
  mortality: {
    unit: 'deaths',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aquatic', v: [0, 3, 11, 61, 742] },
      { site: 'aviary', v: [0, 1, 5, 34, 398] },
      { site: 'savanna', v: [0, 1, 3, 26, 306] },
      { site: 'reptile', v: [0, 0, 2, 17, 204] },
      { site: 'primate', v: [0, 0, 2, 13, 151] },
      { site: 'carnivore', v: [0, 0, 0, 9, 98] },
    ],
  },

  transfers: {
    unit: 'transfers',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aquatic', v: [1, 2, 8, 46, 548] },
      { site: 'aviary', v: [0, 2, 6, 36, 412] },
      { site: 'savanna', v: [0, 1, 5, 29, 336] },
      { site: 'reptile', v: [0, 1, 4, 22, 258] },
      { site: 'primate', v: [0, 1, 3, 17, 196] },
      { site: 'carnivore', v: [0, 0, 2, 12, 142] },
    ],
  },

  /* ── clinical ───────────────────────────────────────────────────────────── */

  /*
   * Caseload — animals under care right now.
   *
   * `then` is a CASELOAD six months ago, not the number of animals treated over six
   * months. The old model stored 96 here and read it whenever the window was six months,
   * which quietly turned a standing caseload of 41 into a cumulative admissions count
   * under a heading that still said "under care". Those are two different questions and
   * they now have two metrics: this one and `admissions` below.
   */
  health: {
    unit: 'under care',
    kind: 'level',
    grain: 'member',
    levels: [
      { site: 'aquatic', now: 41, then: 36 },
      { site: 'aviary', now: 28, then: 31 },
      { site: 'savanna', now: 19, then: 17 },
      { site: 'reptile', now: 14, then: 15 },
      { site: 'primate', now: 12, then: 10 },
      { site: 'carnivore', now: 10, then: 9 },
    ],
  },

  /* Admissions — the flow behind the `health` caseload level. */
  admissions: {
    unit: 'admissions',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aquatic', v: [1, 4, 17, 98, 1180] },
      { site: 'aviary', v: [1, 3, 11, 66, 790] },
      { site: 'savanna', v: [0, 2, 8, 46, 552] },
      { site: 'reptile', v: [0, 1, 6, 33, 396] },
      { site: 'primate', v: [0, 1, 4, 25, 300] },
      { site: 'carnivore', v: [0, 1, 4, 22, 264] },
    ],
  },

  disease: {
    unit: 'flagged',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aquatic', v: [1, 2, 3, 8, 74] },
      { site: 'aviary', v: [0, 1, 2, 6, 52] },
      { site: 'savanna', v: [1, 1, 1, 5, 46] },
      { site: 'reptile', v: [0, 0, 1, 3, 28] },
      { site: 'primate', v: [0, 0, 1, 2, 19] },
      { site: 'carnivore', v: [0, 0, 1, 1, 12] },
    ],
  },

  /*
   * Rate metrics. `of` is the eligible herd, which does not move with the window — the
   * same animals are due whichever way you cut the dates.
   *
   * The per-site rates deliberately SPREAD (86–95% on vaccination). An earlier draft gave
   * all six the pooled 92%, which is arithmetically fine and completely useless: six
   * identical bars answer "how are we doing" and hide the only thing the card is for,
   * which is that Reptile House is nine points behind Aquatic Halls.
   */
  vaccination: {
    unit: 'covered',
    kind: 'rate',
    grain: 'member',
    levels: [
      { site: 'aquatic', now: 656, then: 630, of: 690 },
      { site: 'aviary', now: 500, then: 478, of: 532 },
      { site: 'savanna', now: 406, then: 388, of: 446 },
      { site: 'reptile', now: 256, then: 240, of: 298 },
      { site: 'primate', now: 212, then: 202, of: 238 },
      { site: 'carnivore', now: 154, then: 146, of: 170 },
    ],
  },

  preventive: {
    unit: 'protected',
    kind: 'rate',
    grain: 'member',
    levels: [
      { site: 'aquatic', now: 642, then: 620, of: 690 },
      { site: 'aviary', now: 489, then: 470, of: 532 },
      { site: 'savanna', now: 397, then: 382, of: 446 },
      { site: 'reptile', now: 250, then: 238, of: 298 },
      { site: 'primate', now: 207, then: 198, of: 238 },
      { site: 'carnivore', now: 151, then: 145, of: 170 },
    ],
  },

  deworming: {
    unit: 'treatments',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aquatic', v: [2, 5, 19, 118, 1420] },
      { site: 'aviary', v: [1, 4, 14, 86, 1032] },
      { site: 'savanna', v: [1, 3, 11, 68, 818] },
      { site: 'reptile', v: [0, 2, 8, 48, 576] },
      { site: 'primate', v: [0, 1, 6, 38, 458] },
      { site: 'carnivore', v: [0, 1, 5, 30, 362] },
    ],
  },

  /* ── laboratory ─────────────────────────────────────────────────────────── */

  lab: {
    unit: 'samples',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aquatic', v: [2, 14, 68, 392, 4680] },
      { site: 'aviary', v: [1, 9, 46, 268, 3180] },
      { site: 'savanna', v: [1, 8, 38, 219, 2610] },
      { site: 'reptile', v: [1, 5, 26, 150, 1790] },
      { site: 'primate', v: [0, 4, 20, 116, 1380] },
      { site: 'carnivore', v: [0, 3, 16, 92, 1100] },
    ],
  },

  /* Samples still awaiting a result. A level, not a flow — the queue is however long it
     is right now, and summing it over a month would be meaningless. */
  labOpen: {
    unit: 'open',
    kind: 'level',
    grain: 'event',
    levels: [
      { site: 'aquatic', now: 11, then: 9 },
      { site: 'aviary', now: 7, then: 8 },
      { site: 'savanna', now: 5, then: 6 },
      { site: 'reptile', now: 4, then: 3 },
      { site: 'primate', now: 2, then: 3 },
      { site: 'carnivore', now: 2, then: 2 },
    ],
  },

  /* ── pharmacy ───────────────────────────────────────────────────────────── */

  pharmacy: {
    unit: 'dispensed',
    kind: 'flow',
    grain: 'event',
    flows: [
      { site: 'aquatic', v: [12, 88, 386, 2240, 26800] },
      { site: 'aviary', v: [8, 61, 268, 1560, 18600] },
      { site: 'savanna', v: [7, 53, 232, 1350, 16100] },
      { site: 'reptile', v: [5, 36, 158, 920, 11000] },
      { site: 'primate', v: [4, 29, 128, 745, 8900] },
      { site: 'carnivore', v: [3, 26, 112, 650, 7800] },
    ],
  },

  /* ── operations ─────────────────────────────────────────────────────────── */

  approvals: {
    unit: 'pending',
    kind: 'level',
    grain: 'event',
    levels: [
      { site: 'aquatic', now: 4, then: 3 },
      { site: 'aviary', now: 3, then: 4 },
      { site: 'savanna', now: 3, then: 2 },
      { site: 'reptile', now: 2, then: 3 },
      { site: 'primate', now: 1, then: 2 },
      { site: 'carnivore', now: 1, then: 1 },
    ],
  },

  tasks: {
    unit: 'done',
    kind: 'rate',
    grain: 'event',
    levels: [
      { site: 'aquatic', now: 12, then: 14, of: 22 },
      { site: 'aviary', now: 9, then: 11, of: 16 },
      { site: 'savanna', now: 7, then: 9, of: 13 },
      { site: 'reptile', now: 5, then: 6, of: 10 },
      { site: 'primate', now: 4, then: 5, of: 8 },
      { site: 'carnivore', now: 4, then: 4, of: 7 },
    ],
  },

  attendance: {
    unit: 'present',
    kind: 'rate',
    grain: 'member',
    levels: [
      { site: 'aquatic', now: 56, then: 58, of: 72 },
      { site: 'aviary', now: 61, then: 63, of: 78 },
      { site: 'savanna', now: 45, then: 47, of: 58 },
      { site: 'reptile', now: 35, then: 36, of: 45 },
      { site: 'primate', now: 28, then: 29, of: 36 },
      { site: 'carnivore', now: 18, then: 19, of: 23 },
    ],
  },

  alerts: {
    unit: 'open',
    kind: 'level',
    grain: 'event',
    levels: [
      { site: 'aquatic', now: 12, then: 9 },
      { site: 'aviary', now: 8, then: 7 },
      { site: 'savanna', now: 6, then: 8 },
      { site: 'reptile', now: 4, then: 5 },
      { site: 'primate', now: 3, then: 4 },
      { site: 'carnivore', now: 3, then: 2 },
    ],
  },

  /* Sums to 14, which is what the home's own alert list holds at critical level. The first
     draft of this metric said 6 — carried over from an older panel — and the result was a rail
     reading "6 critical" beside a section listing fourteen of them. */
  alertsCritical: {
    unit: 'critical',
    kind: 'level',
    grain: 'event',
    levels: [
      { site: 'aquatic', now: 5, then: 4 },
      { site: 'aviary', now: 3, then: 3 },
      { site: 'savanna', now: 2, then: 3 },
      { site: 'reptile', now: 2, then: 1 },
      { site: 'primate', now: 1, then: 2 },
      { site: 'carnivore', now: 1, then: 1 },
    ],
  },

  welfare: {
    unit: 'passed',
    kind: 'rate',
    grain: 'member',
    levels: [
      { site: 'aquatic', now: 23, then: 21, of: 24 },
      { site: 'aviary', now: 18, then: 17, of: 20 },
      { site: 'savanna', now: 15, then: 14, of: 16 },
      { site: 'reptile', now: 11, then: 10, of: 12 },
      { site: 'primate', now: 9, then: 9, of: 10 },
      { site: 'carnivore', now: 6, then: 6, of: 7 },
    ],
  },

  /* ── the four that had no site model ────────────────────────────────────── */

  /*
   * Breeding success, the health index and food wastage were the last figures on the home
   * screen with nothing behind them per site. The consequence was visible: scoping to
   * Carnivore Ridge left four of the ten executive KPIs showing collection-wide numbers,
   * captioned "zoo-wide" in the hope that the reader would notice.
   *
   * That caption was the honest handling of a real gap, and closing the gap is better than
   * captioning it. Each is now a rate with its own six rows, so every KPI on the home screen
   * answers the site filter and the exception path is gone rather than explained.
   */
  breeding: {
    unit: 'pairings',
    kind: 'rate',
    grain: 'member',
    levels: [
      { site: 'aquatic', now: 14, then: 13, of: 17 },
      { site: 'aviary', now: 11, then: 10, of: 14 },
      { site: 'savanna', now: 8, then: 8, of: 10 },
      { site: 'reptile', now: 5, then: 4, of: 7 },
      { site: 'primate', now: 4, then: 4, of: 6 },
      { site: 'carnivore', now: 3, then: 3, of: 4 },
    ],
  },

  /* An unweighted average across sites, out of 100 — so each site's score counts once
     regardless of headcount, which is what makes a small site's poor score visible. */
  healthScore: {
    unit: 'index',
    kind: 'rate',
    grain: 'member',
    levels: [
      { site: 'aquatic', now: 92, then: 90, of: 100 },
      { site: 'aviary', now: 95, then: 93, of: 100 },
      { site: 'savanna', now: 96, then: 95, of: 100 },
      { site: 'reptile', now: 93, then: 92, of: 100 },
      { site: 'primate', now: 94, then: 92, of: 100 },
      { site: 'carnivore', now: 94, then: 94, of: 100 },
    ],
  },

  /* Feed wasted against feed prepared, in kilograms per day. The one metric where a LOWER
     percentage is better, which is why nothing here encodes a direction — tone belongs to
     the card that knows what it is showing, not to the data. */
  wastage: {
    unit: 'wasted',
    kind: 'rate',
    grain: 'member',
    levels: [
      { site: 'aquatic', now: 12, then: 11, of: 380 },
      { site: 'aviary', now: 8, then: 7, of: 210 },
      { site: 'savanna', now: 6, then: 6, of: 160 },
      { site: 'reptile', now: 3, then: 3, of: 95 },
      { site: 'primate', now: 3, then: 2, of: 85 },
      { site: 'carnivore', now: 2, then: 2, of: 70 },
    ],
  },
}

export const metricOf = (slug: string): Metric | undefined => METRICS[slug]

export const isFlow = (m: Metric): boolean => m.kind === 'flow'
export const isRate = (m: Metric): boolean => m.kind === 'rate'
