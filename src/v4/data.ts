/**
 * V4 — the executive model.
 *
 * THE HOME SCREEN IS NO LONGER A LIST OF MODULES, so this file is no longer a list
 * of module tiles. V3's home was the board report's table of contents rendered as
 * cards: population, then life events, then veterinary, then preventive care. That
 * is the right shape for reading a report and the wrong shape for the ten seconds a
 * chairman gives the app between meetings.
 *
 * V4 organises around the five questions instead:
 *
 *   1. How healthy is the zoo?     → `zooHealth` and `kpis`
 *   2. What needs my attention?    → `criticalAlerts`
 *   3. What is waiting on me?      → `approvals`
 *   4. What is due soon?           → `upcoming`
 *   5. Are we improving?           → `executiveHealth` and `trends`
 *                                  → `risks` names what could go wrong next
 *
 * Every figure here is pinned to the module page behind it — 215,432 animals, 45
 * births, 23 deaths, 124 under care, 92% vaccinated, 14 approvals, 6 critical
 * alerts. A director who reads 14 in the rail, 14 on the home and 12 in the module
 * would trust none of the three, so the numbers are stated once and shared.
 */

import {
  Activity,
  AlertOctagon,
  ArrowLeftRight,
  Baby,
  Bandage,
  BellRing,
  Biohazard,
  Bug,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Dna,
  DoorOpen,
  Egg,
  FlaskConical,
  Footprints,
  GraduationCap,
  HeartPulse,
  IndianRupee,
  Leaf,
  ListTodo,
  type LucideIcon,
  MapPinOff,
  Package,
  PawPrint,
  Pill,
  ScanHeart,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Skull,
  Soup,
  Sparkles,
  Stethoscope,
  Syringe,
  Ticket,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Utensils,
  Wrench,
} from 'lucide-react'
import type { ByPeriod, Figure } from '../exec/period'

export const site = {
  userName: 'Bharathi Raja',
  role: 'Zoo Director',
  org: 'Vantara Wildlife Trust',
  zooName: 'Jamnagar Zoo',
  weather: { tempC: 24, summary: 'Partly Cloudy', feelsLike: 27, high: 31, low: 22 },
}

export type Level = 'critical' | 'high' | 'medium' | 'low'

/**
 * Severity → the tone vocabulary the design system already speaks. Declared once so
 * an alert, a risk and an approval that are all "high" are the same colour.
 */
export const LEVEL_TONE = { critical: 'bad', high: 'bad', medium: 'warn', low: 'neutral' } as const

/* ── 0 · overall zoo health ──────────────────────────────────────────────── */

/**
 * The single number the home opens on.
 *
 * V3 opened on the collection total — 215,432 — which is the largest number in the
 * product and answers a question nobody asks first. "How many animals do we have"
 * is a fact; "is the zoo well" is a decision. The total is still one tap away, in
 * the KPI grid directly beneath, and on the Animal Population page behind it.
 *
 * The composite is stated as a weighted mean of its four parts rather than typed,
 * so it cannot drift from the scores it claims to summarise.
 */
export const zooHealth = {
  label: 'Zoo Health',
  /** Each part carries the weight it contributes to the composite. */
  /* Labels are ONE WORD each. Four of them share a single row under the hero at
     390px, which leaves about 78px a cell — "Animal health" truncated to "Animal
     heal…" there, and a truncated label in the most-read row on the screen is worse
     than a less precise one. The sheet behind spells each of them out. */
  parts: [
    { label: 'Health', score: 94, weight: 0.35, href: '#/health' },
    { label: 'Welfare', score: 92, weight: 0.3, href: '#/welfare' },
    { label: 'Compliance', score: 88, weight: 0.2, href: '#/vaccination' },
    { label: 'Operations', score: 81, weight: 0.15, href: '#/tasks' },
  ],
  /** Same window as the KPI grid — the delta is against the preceding one. */
  delta: { today: '+0.2', week: '+0.6', month: '+1.4', sixMonths: '+3.1', all: '+9.8' } as ByPeriod<string>,
}

export const zooHealthScore = Math.round(
  zooHealth.parts.reduce((n, p) => n + p.score * p.weight, 0) * 10,
) / 10

/* ── 1 · executive KPIs ──────────────────────────────────────────────────── */

/**
 * Twelve months of shape, declared once.
 *
 * The headline KPI cards and the Trends section draw the same series, so they are
 * stated here and referenced from both. Typed twice, the Natality card would sooner or
 * later show a curve the Birth Trend chart disagrees with — and the two sit on the
 * same screen.
 *
 * Oldest first. The last reading is the figure the KPI states.
 */
export const SERIES = {
  population: [212040, 212580, 213100, 213480, 213900, 214180, 214460, 214690, 214900, 215120, 215389, 215432],
  natality: [31, 34, 29, 36, 40, 33, 38, 42, 45, 48, 50, 45],
  mortality: [34, 32, 36, 31, 33, 30, 30, 27, 26, 29, 25, 23],
  /* Standing caseload at each month's close — a stock, so it is drawn as a line.
     Ends on 124, the figure the Health & Medical card and module both state. */
  caseload: [146, 152, 149, 158, 161, 154, 148, 139, 141, 133, 132, 124],
} as const

export interface Kpi {
  key: string
  /** One or two words. Names the number, never explains it. */
  label: string
  /**
   * Only for a KPI with no metric behind it. Where `metric` is set the value is READ from
   * `core/query.ts` and authoring one here would be a second source of truth for the same
   * figure — which is how "215,432" ended up hardcoded on a card that also had a live
   * population query behind it.
   */
  value?: Figure
  unit?: string
  /** Short qualifier under the number — the unit or the denominator's noun, never a sentence. */
  note?: string
  /**
   * A published target, stated separately from the note.
   *
   * It used to be typed INTO the note ("Target 90"), which worked while the note was authored and
   * broke as soon as the note began carrying the metric's own fraction — the tile then read
   * "564 of 600 Target 90", two unrelated facts run together. Separate fields, joined by the
   * renderer.
   */
  target?: string
  /**
   * Suppress the "n of m" fraction the note otherwise composes.
   *
   * For a rate whose denominator is an ARTEFACT rather than a population. The health index is an
   * unweighted mean of six site scores, so its internal fraction is 564 of 600 — arithmetically how
   * the mean is computed, and meaningless as a statement about the zoo. Vaccination's 2,184 of 2,374
   * is the opposite: there the fraction IS the fact.
   */
  hideFraction?: true
  delta?: Figure
  icon: LucideIcon
  tone?: 'good' | 'warn' | 'bad'
  /**
   * The tile's own identity colour.
   *
   * Every tile used to draw its glyph in the one product green, so ten KPIs read as ten copies of
   * the same card and the eye had nothing to navigate by — finding "Vaccination" meant reading all
   * six labels. A hue per measure makes the grid scannable by position and colour before the label
   * is read at all.
   *
   * These are the module accents from `index.css`, not new colours: the tile and the page it opens
   * are the same hue, so the colour is a wayfinding cue rather than decoration.
   */
  accent?: string
  /**
   * The metric this KPI states, in `core/metrics.ts`. Drives the value, the delta against
   * the preceding window, the sparkline and the site scoping — all four from one key, so
   * they cannot disagree with each other or with the module page that shares the metric.
   */
  metric?: string
  /** Metric key for the Overall → Site → Species → Animal drill. */
  drill?: string
  /**
   * Key into `executiveHealth`, for the KPIs that are scores rather than counts.
   * A score has no site split to drill — "94 out of 100" does not decompose into six
   * sites — so it opens its target-and-trend panel instead. A KPI with neither opens
   * its module page, which is the honest destination when there is nothing to peek at.
   */
  measure?: string
  /** Module page this KPI is owned by. */
  href: string
}

export interface HeadlineKpi extends Kpi {
  /**
   * Only for a KPI with no metric. A metric-backed sparkline is bucketed from the same daily
   * series its own figure sums, so the curve and the number are guaranteed to agree — and
   * the curve re-cuts itself when the reader changes the window, which a fixed twelve-month
   * array cannot.
   */
  series?: readonly number[]
  /**
   * A stock gets a line, a flow gets columns. Not a style choice: a line through
   * "births per month" implies a value between the months and there isn't one — 11
   * births on the 3rd and none on the 4th is not a slope. The design system already
   * splits these (`Spark`/`Trend` against `Columns`); this names which side a KPI
   * falls on so the tile cannot pick the wrong one.
   */
  chart: 'line' | 'bars'
}

/**
 * THE FOUR. Everything about the home's first screen is built to make these read in
 * three seconds: the collection, what is sick in it, what it gained, what it lost.
 *
 * They carry a graph and the other six do not, which is the whole point of separating
 * them — ten equal tiles is a statement that nothing matters more than anything else.
 *
 * Wording is the product's own, as it runs on port 5201: "Animal Population", not
 * "Animals"; "Health & Medical", not "Under Treatment"; "Natality" and "Mortality" as
 * the home there already calls them. Two names for one module is how a director stops
 * trusting that two screens are showing the same thing.
 */
export const headlineKpis: HeadlineKpi[] = [
  {
    key: 'animals',
    label: 'Animal Population',
    note: 'animals',
    icon: PawPrint,
    accent: '#2f9e5b',
    metric: 'animals',
    drill: 'animals',
    href: '#/animals',
    chart: 'line',
  },
  {
    key: 'treatment',
    label: 'Health & Medical',
    note: 'under care',
    icon: Stethoscope,
    accent: '#e93353',
    tone: 'warn',
    metric: 'health',
    drill: 'health',
    href: '#/health',
    chart: 'line',
  },
  {
    key: 'births',
    label: 'Natality',
    note: 'births',
    icon: Sparkles,
    accent: '#e8590c',
    tone: 'good',
    metric: 'births',
    drill: 'births',
    href: '#/births',
    chart: 'bars',
  },
  {
    key: 'deaths',
    label: 'Mortality',
    note: 'deaths',
    icon: Activity,
    accent: '#9d174d',
    metric: 'mortality',
    drill: 'mortality',
    href: '#/mortality',
    chart: 'bars',
  },
]

/**
 * The supporting six — rates and scores, no graphs, quieter tiles under the row.
 *
 * They are still executive KPIs; they are simply not what a chairman opens the app
 * for. Each opens either its target-and-trend panel or the module that owns it.
 */
export const supportingKpis: Kpi[] = [
  {
    key: 'breeding',
    label: 'Breeding Success',
    unit: '%',
    note: 'pairings',
    icon: Dna,
    accent: '#0f766e',
    tone: 'good',
    metric: 'breeding',
    measure: 'breeding',
    href: '#/births',
  },
  {
    key: 'vaccination',
    label: 'Vaccination',
    unit: '%',
    note: 'covered',
    icon: Syringe,
    accent: '#2563eb',
    metric: 'vaccination',
    drill: 'vaccination',
    href: '#/vaccination',
  },
  {
    key: 'tasks',
    label: 'Tasks',
    note: 'done',
    icon: ListTodo,
    accent: '#ea580c',
    tone: 'warn',
    metric: 'tasks',
    href: '#/tasks',
  },
  {
    key: 'welfare',
    label: 'Welfare Audits',
    unit: '%',
    note: 'audits passed',
    icon: ShieldCheck,
    accent: '#db2777',
    tone: 'good',
    metric: 'welfare',
    measure: 'welfare',
    href: '#/welfare',
  },
  {
    key: 'health-score',
    label: 'Health Score',
    unit: '%',
    note: 'site average',
    target: '90',
    hideFraction: true,
    icon: HeartPulse,
    accent: '#be123c',
    tone: 'good',
    metric: 'healthScore',
    measure: 'health',
    href: '#/health',
  },
  {
    key: 'wastage',
    label: 'Food Wastage',
    unit: '%',
    /* The fraction is suppressed here not because 34 of 1,000 kg is meaningless — it isn't — but
       because the target is the more useful of the two facts and both will not fit on one line in a
       two-column phone grid. The fraction is one tap away in the measure panel. */
    note: 'of feed',
    target: '3.0%',
    hideFraction: true,
    icon: Utensils,
    accent: '#b45309',
    tone: 'warn',
    metric: 'wastage',
    measure: 'wastage',
    href: '#/tasks',
  },
]

/* ── 2 · critical alerts ─────────────────────────────────────────────────── */

export interface AlertRow {
  id: string
  subject: string
  /** Where — site and enclosure, never a sentence. */
  where: string
  when: string
  status: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
  /** Animal id, where the row is about one animal — opens the animal record. */
  animal?: string
}

export interface CriticalAlert {
  key: string
  label: string
  count: number
  level: Level
  /** Short qualifier — "2 sites", "since 06:40". Never a sentence. */
  note: string
  icon: LucideIcon
  /** Module that owns the queue. Sheets no longer link out; the sidebar and search do. */
  href: string
  rows: AlertRow[]
}

/**
 * The wall. Ordered by severity then by count, which is the order a director triages
 * in — and deliberately capped at the ten that can start a phone call today.
 *
 * Every entry carries its actual rows. A count with nothing behind it is a number
 * that cannot be acted on, and "what needs my attention" is answered by the record,
 * not by the tally.
 */
export const criticalAlerts: CriticalAlert[] = [
  {
    key: 'missing',
    label: 'Missing Animals',
    count: 2,
    level: 'critical',
    note: '2 sites · since 06:40',
    icon: MapPinOff,
    href: '#/animals',
    rows: [
      { id: 'ANM-40218', subject: 'Grey Francolin', where: 'Aviary Complex · AV-12', when: '06:40', status: 'Search on', tone: 'bad', animal: 'ANM-40218' },
      { id: 'ANM-31904', subject: 'Bengal Fox', where: 'Savanna · SV-04', when: '08:15', status: 'Perimeter clear', tone: 'warn', animal: 'ANM-31904' },
    ],
  },
  {
    key: 'medical',
    label: 'Critical Medical Cases',
    count: 7,
    level: 'critical',
    note: 'of 124 under care',
    icon: ScanHeart,
    href: '#/health',
    rows: [
      { id: 'ANM-40218', subject: 'Asiatic Lion · respiratory', where: 'Carnivore Ridge · CR-02', when: '4 h', status: 'Escalated', tone: 'bad', animal: 'ANM-40218' },
      { id: 'ANM-22771', subject: 'Chital · trauma', where: 'Savanna · SV-09', when: '9 h', status: 'Surgery', tone: 'bad', animal: 'ANM-22771' },
      { id: 'ANM-19043', subject: 'Indian Rock Python · anorexia', where: 'Reptile House · RP-06', when: '2 d', status: 'Tube feeding', tone: 'warn', animal: 'ANM-19043' },
      { id: 'ANM-50882', subject: 'Nile Tilapia stock · fungal', where: 'Aquatic Halls · AQ-14', when: '2 d', status: 'Bath therapy', tone: 'warn', animal: 'ANM-50882' },
      { id: 'ANM-30115', subject: 'Rhesus Macaque · enteritis', where: 'Primate Forest · PR-03', when: '3 d', status: 'Stable', tone: 'warn', animal: 'ANM-30115' },
      { id: 'ANM-41266', subject: 'Painted Stork · fracture', where: 'Aviary Complex · AV-08', when: '4 d', status: 'Pinned', tone: 'warn', animal: 'ANM-41266' },
      { id: 'ANM-28450', subject: 'Blackbuck · lameness', where: 'Savanna · SV-02', when: '5 d', status: 'Improving', tone: 'good', animal: 'ANM-28450' },
    ],
  },
  {
    key: 'deaths',
    label: 'Animal Deaths',
    count: 1,
    level: 'critical',
    note: 'last 24 h · necropsy due',
    icon: Skull,
    href: '#/mortality',
    rows: [
      { id: 'ANM-22140', subject: 'Chital', where: 'Savanna · Zone A', when: '09:42', status: 'Necropsy due', tone: 'bad', animal: 'ANM-22140' },
    ],
  },
  {
    key: 'escaped',
    label: 'Escaped Animals',
    count: 1,
    level: 'critical',
    note: 'contained · perimeter held',
    icon: Footprints,
    href: '#/animals',
    rows: [
      { id: 'ESC-0091', subject: 'Rhesus Macaque', where: 'Primate Forest · PR-01', when: '05:20', status: 'Recaptured 07:10', tone: 'warn', animal: 'ANM-30115' },
    ],
  },
  {
    key: 'outbreak',
    label: 'Disease Outbreaks',
    count: 2,
    level: 'critical',
    note: '2 enclosures quarantined',
    icon: Biohazard,
    href: '#/disease',
    rows: [
      { id: 'OUT-118', subject: 'Aspergillosis · 9 birds', where: 'Aviary Complex · AV-04', when: 'Day 6', status: 'Quarantined', tone: 'bad' },
      { id: 'OUT-121', subject: 'Columnaris · tank stock', where: 'Aquatic Halls · AQ-09', when: 'Day 2', status: 'Contained', tone: 'warn' },
    ],
  },
  {
    key: 'biosecurity',
    label: 'Biosecurity Incidents',
    count: 1,
    level: 'critical',
    note: 'perimeter · unresolved',
    icon: ShieldAlert,
    href: '#/alerts',
    rows: [
      { id: 'BIO-0447', subject: 'Perimeter gate unsecured', where: 'Zone A · Gate 3', when: '11:12', status: 'Open 6 min', tone: 'bad' },
    ],
  },
  {
    key: 'fetal',
    label: 'Fetal Deaths',
    count: 5,
    level: 'high',
    note: 'this month · 3 species',
    icon: Baby,
    href: '#/fetal',
    rows: [
      { id: 'FTL-0412', subject: 'Blackbuck · third trimester', where: 'Savanna · SV-02', when: '28 Jul', status: 'Necropsy done', tone: 'neutral' },
      { id: 'FTL-0409', subject: 'Chital · second trimester', where: 'Savanna · SV-09', when: '21 Jul', status: 'Necropsy done', tone: 'neutral' },
      { id: 'FTL-0404', subject: 'Nile Tilapia brood loss', where: 'Aquatic Halls · AQ-11', when: '17 Jul', status: 'Cause unknown', tone: 'warn' },
      { id: 'FTL-0401', subject: 'Rhesus Macaque', where: 'Primate Forest · PR-03', when: '09 Jul', status: 'Necropsy done', tone: 'neutral' },
      { id: 'FTL-0398', subject: 'Sarus Crane · egg-bound', where: 'Aviary Complex · AV-06', when: '04 Jul', status: 'Necropsy done', tone: 'neutral' },
    ],
  },
  {
    key: 'lab',
    label: 'Critical Lab Results',
    count: 4,
    level: 'high',
    note: 'of 31 open requests',
    icon: FlaskConical,
    href: '#/lab',
    rows: [
      { id: 'LAB-9042', subject: 'Histopath · Nile Tilapia', where: 'Aquatic Halls', when: '07:58', status: 'Fungal', tone: 'bad' },
      { id: 'LAB-9038', subject: 'Culture · Asiatic Lion', where: 'Carnivore Ridge', when: 'Yesterday', status: 'Pseudomonas', tone: 'bad' },
      { id: 'LAB-9021', subject: 'Faecal load · Chital herd', where: 'Savanna', when: '2 d', status: 'High burden', tone: 'warn' },
      { id: 'LAB-9014', subject: 'Serology · Aviary flock', where: 'Aviary Complex', when: '3 d', status: 'Repeat needed', tone: 'warn' },
    ],
  },
  {
    key: 'medicine',
    label: 'Medicine Out of Stock',
    count: 3,
    level: 'high',
    note: '2 on order',
    icon: Pill,
    href: '#/health',
    rows: [
      { id: 'MED-2210', subject: 'Enrofloxacin 100 mg/ml', where: 'Central Pharmacy', when: 'Nil', status: 'PO raised', tone: 'bad' },
      { id: 'MED-2244', subject: 'Ivermectin injectable', where: 'Central Pharmacy', when: 'Nil', status: 'PO raised', tone: 'bad' },
      { id: 'MED-2301', subject: 'Ketamine 50 mg/ml', where: 'Veterinary Hospital', when: 'Nil', status: 'Approval pending', tone: 'bad' },
    ],
  },
  {
    key: 'food',
    label: 'Food Inventory Critical',
    count: 2,
    level: 'high',
    note: 'under 3 days cover',
    icon: Soup,
    href: '#/tasks',
    rows: [
      { id: 'FD-0182', subject: 'Frozen fish · grade A', where: 'Aquatic Halls store', when: '2 d cover', status: 'Contract pending', tone: 'bad' },
      { id: 'FD-0206', subject: 'Lucerne hay', where: 'Savanna store', when: '3 d cover', status: 'Delivery 09 Aug', tone: 'warn' },
    ],
  },
  {
    key: 'enclosure',
    label: 'Enclosure Safety Issues',
    count: 5,
    level: 'medium',
    note: '1 restricts access',
    icon: Wrench,
    href: '#/welfare',
    rows: [
      { id: 'ENC-311', subject: 'Moat railing corroded', where: 'Primate Forest · PR-01', when: '3 d', status: 'Access restricted', tone: 'bad' },
      { id: 'ENC-318', subject: 'Mesh tension low', where: 'Aviary Complex · AV-16', when: '5 d', status: 'Scheduled', tone: 'warn' },
      { id: 'ENC-322', subject: 'Heat lamp fault', where: 'Reptile House · RP-11', when: '5 d', status: 'Scheduled', tone: 'warn' },
      { id: 'ENC-327', subject: 'Drain blockage', where: 'Aquatic Halls · AQ-03', when: '6 d', status: 'Assigned', tone: 'warn' },
      { id: 'ENC-330', subject: 'Gate latch worn', where: 'Savanna · SV-07', when: '8 d', status: 'Assigned', tone: 'neutral' },
    ],
  },
  {
    key: 'welfare-audit',
    label: 'Pending Welfare Audit',
    count: 12,
    level: 'medium',
    note: '4 past due',
    icon: ClipboardCheck,
    href: '#/welfare',
    rows: [
      { id: 'WA-2041', subject: 'Five domains · Carnivore Ridge', where: 'Carnivore Ridge', when: 'Due 02 Aug', status: 'Past due', tone: 'bad' },
      { id: 'WA-2044', subject: 'Enrichment review · Primate Forest', where: 'Primate Forest', when: 'Due 04 Aug', status: 'Past due', tone: 'bad' },
      { id: 'WA-2048', subject: 'Space audit · Aviary Complex', where: 'Aviary Complex', when: 'Due 05 Aug', status: 'Past due', tone: 'bad' },
      { id: 'WA-2052', subject: 'Water quality · Aquatic Halls', where: 'Aquatic Halls', when: 'Due 06 Aug', status: 'Past due', tone: 'bad' },
      { id: 'WA-2055', subject: 'Behaviour scan · Savanna', where: 'Savanna', when: 'Due 09 Aug', status: 'Scheduled', tone: 'warn' },
      { id: 'WA-2061', subject: 'Thermal audit · Reptile House', where: 'Reptile House', when: 'Due 12 Aug', status: 'Scheduled', tone: 'neutral' },
    ],
  },
]

/** Critical-and-high count, stated once so the section header and the rail agree. */
export const alertsUrgent = criticalAlerts
  .filter((a) => a.level === 'critical' || a.level === 'high')
  .reduce((n, a) => n + a.count, 0)

export const alertsCritical = criticalAlerts
  .filter((a) => a.level === 'critical')
  .reduce((n, a) => n + a.count, 0)

/* ── 3 · needs my approval ───────────────────────────────────────────────── */

export interface ApprovalRequest {
  id: string
  title: string
  /** Who raised it and what it costs — the two things a decision needs. */
  from: string
  value?: string
  age: string
  /** True once past the 3-day standard SLA. */
  overdue?: boolean
}

export interface ApprovalGroup {
  key: string
  label: string
  icon: LucideIcon
  requests: ApprovalRequest[]
}

/**
 * Only what is actionable by this reader, grouped by the kind of decision.
 *
 * No aggregate charts, no aging histogram, no departmental table — those are on the
 * Approvals module page, where someone managing the queue reads them. Here the
 * question is "what is waiting on me", and the only honest answer is a list of
 * things that can be decided.
 *
 * The fourteen below are the same fourteen the Approvals page and the executive rail
 * state, and the four rupee figures are that page's.
 */
export const approvals: ApprovalGroup[] = [
  {
    key: 'breeding',
    label: 'Breeding',
    icon: Dna,
    requests: [
      { id: 'APR-4451', title: 'Sangai Deer pairing · SV-06', from: 'Curator', age: '1 d' },
      { id: 'APR-4448', title: 'Indian Skimmer clutch plan', from: 'Curator', age: '2 d' },
      { id: 'APR-4440', title: 'Asiatic Lion studbook match', from: 'Conservation lead', age: '3 d' },
    ],
  },
  {
    key: 'transfer',
    label: 'Transfer',
    icon: ArrowLeftRight,
    requests: [
      { id: 'APR-4453', title: '2 Blackbuck → Junagadh Zoo', from: 'Curator', age: '1 d' },
      { id: 'APR-4446', title: '4 Painted Stork → Bharatpur', from: 'Curator', value: '₹0.8L', age: '2 d' },
      { id: 'APR-4437', title: 'Fishing Cat intake · Bhitarkanika', from: 'Registrar', age: '3 d' },
      { id: 'APR-4429', title: 'Reptile House internal move · 6', from: 'Head keeper', age: '4 d', overdue: true },
    ],
  },
  {
    key: 'budget',
    label: 'Budget',
    icon: IndianRupee,
    requests: [
      { id: 'APR-4412', title: 'Feed contract · annual', from: 'Chief Financial Officer', value: '₹18.4L', age: '5 d', overdue: true },
      { id: 'APR-4401', title: 'Herpetarium retrofit', from: 'Administration', value: '₹6.2L', age: '4 d', overdue: true },
    ],
  },
  {
    key: 'procurement',
    label: 'Procurement',
    icon: Package,
    requests: [
      { id: 'APR-4433', title: 'Incubator spares · 3 units', from: 'Hatchery', value: '₹1.2L', age: '2 d' },
      { id: 'APR-4444', title: 'Ketamine 50 mg/ml · restock', from: 'Veterinary', value: '₹0.9L', age: '1 d' },
    ],
  },
  {
    key: 'access',
    label: 'User Access',
    icon: UserCog,
    requests: [{ id: 'APR-4455', title: 'Records access · 2 locum vets', from: 'HR', age: '1 d' }],
  },
  {
    key: 'veterinary',
    label: 'Veterinary',
    icon: HeartPulse,
    requests: [
      { id: 'APR-4454', title: 'Surgery consent · ANM-22771', from: 'Dr. Mehta', age: '4 h' },
      { id: 'APR-4450', title: 'Euthanasia review · ANM-19043', from: 'Dr. Mehta', age: '1 d' },
    ],
  },
]

export const approvalsPending = approvals.reduce((n, g) => n + g.requests.length, 0)
export const approvalsOverdue = approvals.reduce(
  (n, g) => n + g.requests.filter((r) => r.overdue).length,
  0,
)

/* ── 4 · upcoming ────────────────────────────────────────────────────────── */

export interface DueRow {
  /** Absolute date, never "in 3 days" — a relative age goes stale in a static build. */
  date: string
  subject: string
  where: string
  count: number
  /** Days from 07 Aug 2025, so the 7/30-day split is derived rather than authored. */
  inDays: number
}

export interface UpcomingGroup {
  key: string
  label: string
  icon: LucideIcon
  href: string
  rows: DueRow[]
}

/**
 * Everything date-driven, in one place, under one 7 / 30-day switch.
 *
 * The switch filters `inDays` rather than selecting between two hand-written lists,
 * so the seven-day view is provably a subset of the thirty-day one. Two authored
 * lists is two chances for a vaccination to appear in one and not the other.
 *
 * Anchored to 07 Aug 2025 — the day after the report month closes, which is when
 * this screen is read.
 */
export const upcoming: UpcomingGroup[] = [
  {
    key: 'births',
    label: 'Expected Births',
    icon: Sparkles,
    href: '#/births',
    rows: [
      { date: '09 Aug', subject: 'Sangai Deer · 2 dams', where: 'Savanna · SV-06', count: 2, inDays: 2 },
      { date: '11 Aug', subject: 'Blackbuck · 3 dams', where: 'Savanna · SV-02', count: 3, inDays: 4 },
      { date: '14 Aug', subject: 'Rhesus Macaque', where: 'Primate Forest · PR-03', count: 1, inDays: 7 },
      { date: '19 Aug', subject: 'Chital · 4 dams', where: 'Savanna · SV-09', count: 4, inDays: 12 },
      { date: '27 Aug', subject: 'Bengal Fox', where: 'Carnivore Ridge · CR-05', count: 2, inDays: 20 },
      { date: '02 Sep', subject: 'Sambar', where: 'Savanna · SV-11', count: 1, inDays: 26 },
    ],
  },
  {
    key: 'hatchings',
    label: 'Expected Hatchings',
    icon: Egg,
    href: '#/eggs',
    rows: [
      { date: '08 Aug', subject: 'Indian Peafowl · clutch 22', where: 'Aviary · Incubator 2', count: 6, inDays: 1 },
      { date: '10 Aug', subject: 'Grey Francolin · clutch 24', where: 'Aviary · Incubator 1', count: 9, inDays: 3 },
      { date: '13 Aug', subject: 'Flapshell Turtle', where: 'Reptile House · RP-04', count: 14, inDays: 6 },
      { date: '21 Aug', subject: 'Painted Stork · clutch 27', where: 'Aviary · Incubator 3', count: 4, inDays: 14 },
      { date: '30 Aug', subject: 'Indian Rock Python', where: 'Reptile House · RP-09', count: 18, inDays: 23 },
    ],
  },
  {
    key: 'vaccination',
    label: 'Vaccination Due',
    icon: Syringe,
    href: '#/vaccination',
    rows: [
      { date: '08 Aug', subject: 'Rabies booster · carnivores', where: 'Carnivore Ridge', count: 24, inDays: 1 },
      { date: '10 Aug', subject: 'Newcastle · aviary flock', where: 'Aviary Complex', count: 180, inDays: 3 },
      { date: '12 Aug', subject: 'FMD · ungulates', where: 'Savanna', count: 96, inDays: 5 },
      { date: '18 Aug', subject: 'Tetanus · equids', where: 'Savanna · SV-04', count: 11, inDays: 11 },
      { date: '26 Aug', subject: 'Rabies booster · primates', where: 'Primate Forest', count: 38, inDays: 19 },
      { date: '04 Sep', subject: 'Newcastle · second round', where: 'Aviary Complex', count: 164, inDays: 28 },
    ],
  },
  {
    key: 'health',
    label: 'Health Assessment Due',
    icon: Stethoscope,
    href: '#/health',
    rows: [
      { date: '08 Aug', subject: 'Post-op review · ANM-22771', where: 'Savanna · SV-09', count: 1, inDays: 1 },
      { date: '11 Aug', subject: 'Quarterly · geriatric cohort', where: 'All sites', count: 42, inDays: 4 },
      { date: '15 Aug', subject: 'Pre-transfer · Blackbuck', where: 'Savanna · SV-02', count: 2, inDays: 8 },
      { date: '23 Aug', subject: 'Annual · Carnivore Ridge', where: 'Carnivore Ridge', count: 31, inDays: 16 },
      { date: '01 Sep', subject: 'Annual · Primate Forest', where: 'Primate Forest', count: 46, inDays: 25 },
    ],
  },
  {
    key: 'welfare',
    label: 'Welfare Assessment Due',
    icon: ShieldCheck,
    href: '#/welfare',
    rows: [
      { date: '09 Aug', subject: 'Behaviour scan · Savanna', where: 'Savanna', count: 1, inDays: 2 },
      { date: '12 Aug', subject: 'Thermal audit · Reptile House', where: 'Reptile House', count: 1, inDays: 5 },
      { date: '17 Aug', subject: 'Five domains · Aquatic Halls', where: 'Aquatic Halls', count: 1, inDays: 10 },
      { date: '25 Aug', subject: 'Enrichment review · Aviary', where: 'Aviary Complex', count: 1, inDays: 18 },
    ],
  },
  {
    key: 'enclosure',
    label: 'Enclosure Assessment Due',
    icon: Building2,
    href: '#/welfare',
    rows: [
      { date: '08 Aug', subject: 'Mesh tension · AV-16', where: 'Aviary Complex', count: 1, inDays: 1 },
      { date: '13 Aug', subject: 'Moat railing · PR-01', where: 'Primate Forest', count: 1, inDays: 6 },
      { date: '20 Aug', subject: 'Water systems · AQ block', where: 'Aquatic Halls', count: 8, inDays: 13 },
      { date: '29 Aug', subject: 'Perimeter survey · Zone A', where: 'Savanna', count: 1, inDays: 22 },
    ],
  },
  {
    key: 'deworming',
    label: 'Deworming Due',
    icon: Pill,
    href: '#/deworming',
    rows: [
      { date: '09 Aug', subject: 'Chital herd · high burden', where: 'Savanna · SV-09', count: 64, inDays: 2 },
      { date: '14 Aug', subject: 'Primate cohort', where: 'Primate Forest', count: 38, inDays: 7 },
      { date: '22 Aug', subject: 'Aviary flock', where: 'Aviary Complex', count: 210, inDays: 15 },
      { date: '31 Aug', subject: 'Reptile cohort', where: 'Reptile House', count: 26, inDays: 24 },
    ],
  },
  {
    key: 'supplement',
    label: 'Supplement Due',
    icon: Leaf,
    href: '#/health',
    rows: [
      { date: '08 Aug', subject: 'Calcium · juvenile reptiles', where: 'Reptile House', count: 44, inDays: 1 },
      { date: '11 Aug', subject: 'Vitamin A · aquatic stock', where: 'Aquatic Halls', count: 120, inDays: 4 },
      { date: '18 Aug', subject: 'Mineral lick · ungulates', where: 'Savanna', count: 96, inDays: 11 },
      { date: '28 Aug', subject: 'Thiamine · piscivores', where: 'Aviary Complex', count: 34, inDays: 21 },
    ],
  },
  {
    key: 'training',
    label: 'Staff Training Due',
    icon: GraduationCap,
    href: '#/attendance',
    rows: [
      { date: '08 Aug', subject: 'Chemical restraint refresher', where: 'Veterinary · 9 staff', count: 9, inDays: 1 },
      { date: '13 Aug', subject: 'Biosecurity drill', where: 'All sites · 46 staff', count: 46, inDays: 6 },
      { date: '19 Aug', subject: 'Enrichment protocol', where: 'Keepers · 28 staff', count: 28, inDays: 12 },
      { date: '27 Aug', subject: 'Fire and evacuation', where: 'All sites · 62 staff', count: 62, inDays: 20 },
    ],
  },
]

/** How many groups have anything inside a horizon — used for the section aside. */
export const dueWithin = (days: number) =>
  upcoming.reduce((n, g) => n + g.rows.filter((r) => r.inDays <= days).length, 0)

/* ── 5 · executive health ────────────────────────────────────────────────── */

export interface Measure {
  key: string
  label: string
  value: string
  unit?: string
  /** Where the bar fills to. For a "lower is better" measure this is inverted. */
  percent: number
  target: number
  /** Stated target, as the reader would say it — "90", "≤ 3.0%". */
  targetLabel: string
  /** Six monthly readings, oldest first. Drawn as one compact trend. */
  history: number[]
  /** Direction of travel, already judged against whether up is good. */
  tone: 'good' | 'warn' | 'bad'
  delta: string
  href: string
}

/**
 * The six measures the board is held to, each against its stated target.
 *
 * This is where "are we improving?" is answered, so every measure carries three
 * things a bare number cannot: the target it is judged against, the direction it
 * moved, and six months of shape. Two of the six are "lower is better" — mortality
 * and wastage — and their bars are inverted so a full bar always means good. A grid
 * where some long bars are wins and others are losses cannot be read at a glance,
 * which is the only speed this screen has.
 */
export const executiveHealth: Measure[] = [
  {
    key: 'health',
    label: 'Animal Health',
    value: '94',
    unit: '/ 100',
    percent: 94,
    target: 90,
    targetLabel: 'Target 90',
    history: [88, 89, 91, 90, 92, 94],
    tone: 'good',
    delta: '+2',
    href: '#/health',
  },
  {
    key: 'welfare',
    label: 'Animal Welfare',
    value: '4.6',
    unit: '/ 5',
    percent: 92,
    target: 90,
    targetLabel: 'Target 4.5',
    history: [4.3, 4.4, 4.4, 4.5, 4.5, 4.6],
    tone: 'good',
    delta: '+0.1',
    href: '#/welfare',
  },
  {
    key: 'breeding',
    label: 'Breeding Success',
    value: '78',
    unit: '%',
    percent: 78,
    target: 75,
    targetLabel: 'Target 75%',
    history: [70, 72, 71, 74, 76, 78],
    tone: 'good',
    delta: '+4',
    href: '#/births',
  },
  {
    key: 'mortality',
    label: 'Mortality Rate',
    value: '0.011',
    unit: '%',
    /* Inverted: 0.011 against a 0.015 ceiling is 73% of the allowance unused. */
    percent: 73,
    target: 100,
    targetLabel: 'Ceiling 0.015%',
    history: [0.014, 0.013, 0.013, 0.012, 0.012, 0.011],
    tone: 'good',
    delta: '−18%',
    href: '#/mortality',
  },
  {
    key: 'vaccination',
    label: 'Vaccination Compliance',
    value: '92',
    unit: '%',
    percent: 92,
    target: 95,
    targetLabel: 'Target 95%',
    history: [87, 88, 90, 90, 91, 92],
    tone: 'warn',
    delta: '+1',
    href: '#/vaccination',
  },
  {
    key: 'wastage',
    label: 'Food Wastage',
    value: '3.4',
    unit: '%',
    /* Inverted against a 3.0% ceiling — over target, so the bar is short. */
    percent: 88,
    target: 100,
    targetLabel: 'Ceiling 3.0%',
    history: [2.8, 2.9, 3.1, 3.0, 3.2, 3.4],
    tone: 'warn',
    delta: '+0.3',
    href: '#/tasks',
  },
]

/* ── 6 · risk indicators ─────────────────────────────────────────────────── */

export interface Risk {
  key: string
  label: string
  level: Level
  value: string
  /** The exposure, stated as a figure — "22 lines", "4 enclosures". Never advice. */
  note: string
  icon: LucideIcon
  href: string
  rows: AlertRow[]
}

/**
 * What could go wrong next, and nothing about what to do.
 *
 * The brief is explicit that this section carries risks only — no suggestions. That
 * is a real constraint rather than a stylistic one: a suggested action from a system
 * that cannot see the calendar, the budget or the politics is a suggestion a director
 * has to spend attention discarding. Naming the exposure and its size is the whole
 * job; the decision is the reader's.
 */
export const risks: Risk[] = [
  {
    key: 'expiry',
    label: 'Medicine Expiry',
    level: 'high',
    value: '22',
    note: 'lines expiring in 60 d · ₹4.1L',
    icon: Bandage,
    href: '#/health',
    rows: [
      { id: 'MED-1904', subject: 'Enrofloxacin · 40 vials', where: 'Central Pharmacy', when: 'Exp 12 Sep', status: '₹1.4L', tone: 'bad' },
      { id: 'MED-2011', subject: 'Meloxicam · 120 vials', where: 'Veterinary Hospital', when: 'Exp 21 Sep', status: '₹0.9L', tone: 'warn' },
      { id: 'MED-2088', subject: 'Vitamin B complex · 300 ml', where: 'Aviary dispensary', when: 'Exp 30 Sep', status: '₹0.4L', tone: 'warn' },
      { id: 'MED-2140', subject: '19 further lines', where: 'All stores', when: 'Exp within 60 d', status: '₹1.4L', tone: 'neutral' },
    ],
  },
  {
    key: 'stock',
    label: 'Low Medicine Stock',
    level: 'high',
    value: '8',
    note: 'items under reorder level',
    icon: Pill,
    href: '#/health',
    rows: [
      { id: 'MED-2210', subject: 'Enrofloxacin 100 mg/ml', where: 'Central Pharmacy', when: '0 units', status: 'PO raised', tone: 'bad' },
      { id: 'MED-2244', subject: 'Ivermectin injectable', where: 'Central Pharmacy', when: '0 units', status: 'PO raised', tone: 'bad' },
      { id: 'MED-2301', subject: 'Ketamine 50 mg/ml', where: 'Veterinary Hospital', when: '0 units', status: 'Approval pending', tone: 'bad' },
      { id: 'MED-2318', subject: 'Xylazine 20 mg/ml', where: 'Veterinary Hospital', when: '4 of 20', status: 'Below reorder', tone: 'warn' },
      { id: 'MED-2340', subject: 'Praziquantel', where: 'Central Pharmacy', when: '9 of 40', status: 'Below reorder', tone: 'warn' },
    ],
  },
  {
    key: 'capacity',
    label: 'Critical Capacity',
    level: 'high',
    value: '4',
    note: 'enclosures over 95% occupancy',
    icon: DoorOpen,
    href: '#/animals',
    rows: [
      { id: 'AQ-14', subject: 'Aquatic Halls · Tank 14', where: '98% occupancy', when: '6 weeks', status: 'Over', tone: 'bad' },
      { id: 'AV-04', subject: 'Aviary Complex · Flight 4', where: '97% occupancy', when: '4 weeks', status: 'Over', tone: 'bad' },
      { id: 'SV-09', subject: 'Savanna · Paddock 9', where: '96% occupancy', when: '3 weeks', status: 'Over', tone: 'warn' },
      { id: 'RP-06', subject: 'Reptile House · Vivarium 6', where: '95% occupancy', when: '2 weeks', status: 'At limit', tone: 'warn' },
    ],
  },
  {
    key: 'biosecurity',
    label: 'Biosecurity Risk',
    level: 'high',
    value: '3',
    note: 'controls lapsed · 2 zones',
    icon: ShieldAlert,
    href: '#/alerts',
    rows: [
      { id: 'BSR-01', subject: 'Footbath renewal overdue', where: 'Aviary Complex · 4 gates', when: '9 d late', status: 'Open', tone: 'bad' },
      { id: 'BSR-02', subject: 'Quarantine block at capacity', where: 'Veterinary Hospital', when: '12 of 12', status: 'No isolation space', tone: 'bad' },
      { id: 'BSR-03', subject: 'Visitor contact barrier damaged', where: 'Savanna · SV-07', when: '3 d', status: 'Scheduled', tone: 'warn' },
    ],
  },
  {
    key: 'inbreeding',
    label: 'Inbreeding Risk',
    level: 'medium',
    value: '14',
    note: 'pairings above 0.125 kinship',
    icon: Dna,
    href: '#/births',
    rows: [
      { id: 'KIN-041', subject: 'Asiatic Lion · pair 3', where: 'Carnivore Ridge', when: 'F 0.21', status: 'Hold', tone: 'bad' },
      { id: 'KIN-052', subject: 'Sangai Deer · pair 1', where: 'Savanna', when: 'F 0.18', status: 'Hold', tone: 'bad' },
      { id: 'KIN-066', subject: 'Fishing Cat · pair 2', where: 'Carnivore Ridge', when: 'F 0.16', status: 'Review', tone: 'warn' },
      { id: 'KIN-078', subject: '11 further pairings', where: 'All sites', when: 'F 0.13 – 0.15', status: 'Watch', tone: 'neutral' },
    ],
  },
  {
    key: 'food',
    label: 'Low Food Inventory',
    level: 'medium',
    value: '3',
    note: 'lines under 5 days cover',
    icon: Soup,
    href: '#/tasks',
    rows: [
      { id: 'FD-0182', subject: 'Frozen fish · grade A', where: 'Aquatic Halls store', when: '2 d cover', status: 'Contract pending', tone: 'bad' },
      { id: 'FD-0206', subject: 'Lucerne hay', where: 'Savanna store', when: '3 d cover', status: 'Delivery 09 Aug', tone: 'warn' },
      { id: 'FD-0219', subject: 'Live insect culture', where: 'Insectarium', when: '5 d cover', status: 'On order', tone: 'warn' },
    ],
  },
  {
    key: 'training',
    label: 'Training Compliance',
    level: 'medium',
    value: '68',
    note: '% of 312 staff current',
    icon: GraduationCap,
    href: '#/attendance',
    rows: [
      { id: 'TR-01', subject: 'Chemical restraint', where: 'Veterinary · 9 of 14', when: 'Lapsed 5', status: '64%', tone: 'warn' },
      { id: 'TR-02', subject: 'Biosecurity', where: 'All sites · 214 of 312', when: 'Lapsed 98', status: '69%', tone: 'warn' },
      { id: 'TR-03', subject: 'Fire and evacuation', where: 'All sites · 226 of 312', when: 'Lapsed 86', status: '72%', tone: 'warn' },
    ],
  },
  {
    key: 'compliance',
    label: 'Compliance Risk',
    level: 'low',
    value: '6',
    note: 'statutory filings open',
    icon: ClipboardCheck,
    href: '#/welfare',
    rows: [
      { id: 'CMP-118', subject: 'CZA annual inventory return', where: 'Registrar', when: 'Due 30 Sep', status: 'Drafting', tone: 'neutral' },
      { id: 'CMP-121', subject: 'Wildlife health surveillance', where: 'Veterinary', when: 'Due 15 Sep', status: 'Drafting', tone: 'neutral' },
      { id: 'CMP-124', subject: 'Effluent discharge consent', where: 'Administration', when: 'Due 20 Aug', status: 'With CFO', tone: 'warn' },
      { id: 'CMP-130', subject: '3 further filings', where: 'Administration', when: 'Due Oct – Nov', status: 'Not started', tone: 'neutral' },
    ],
  },
]

/* ── 7 · trends ──────────────────────────────────────────────────────────── */

export interface TrendCard {
  key: string
  label: string
  /** Only where there is no metric. See `Kpi.value`. */
  value?: string
  unit?: string
  delta?: string
  /** Judged direction — a rising mortality trend is bad, a rising population is not. */
  tone: 'good' | 'warn' | 'bad' | 'neutral'
  icon: LucideIcon
  /** The card's identity hue. See `Kpi.accent`. */
  accent?: string
  /**
   * HOW THE CARD DRAWS ITSELF, and why this is not decoration.
   *
   * Eight identical sparkline tiles was the wrong answer twice over. It made the section a wall of
   * the same card, so nothing in it could be found by eye — and more seriously it drew four
   * different KINDS of number the same way. A population is a level that moves continuously; births
   * are discrete monthly events with no value between them; wastage is a rate with a published
   * target it is either under or over; procurement spend is read as a level within a range.
   *
   * A line through "births per month" implies a value between the months and there isn't one, and a
   * sparkline beside "3.4% against a 3.0% target" hides the only fact that matters. So the mark is
   * chosen from what the figure IS:
   *
   *   `area`    a level over time — the shape is continuous and worth reading as one
   *   `columns` discrete monthly counts — each month stands alone
   *   `meter`   a rate against a stated target — the gap to target is the whole story
   *   `range`   a level read against its own twelve-month floor and ceiling
   */
  shape?: 'area' | 'columns' | 'meter' | 'range'
  /**
   * The published target, for a `meter` card. Stated rather than derived — it is a policy number,
   * not a measurement, and the card says so.
   */
  target?: number
  /** Spans two columns. For the one card whose shape is worth the width. */
  wide?: true
  /** The metric behind it, when one exists. Then the value, delta and curve are all read. */
  metric?: string
  /** Twelve monthly readings, oldest first. Only for a card with no metric. */
  values?: number[]
  /** Axis labels for the expanded chart — four quarters across twelve months. */
  labels: string[]
  /** Stated under the expanded chart. */
  unitNote: string
  href: string
  /**
   * `false` for a figure with no site dimension at all — visitors through the gate,
   * procurement spend, rupees of medicine.
   *
   * These are not gaps to be filled with an apportionment. A visitor is not attributable to
   * Carnivore Ridge, and inventing a split so the card keeps working under a site filter
   * would be exactly the fabrication the brief rules out. So the home screen moves them into
   * their own labelled group when a site is picked, rather than showing collection-wide
   * numbers inside a scoped view.
   */
  scoped?: false
}

const MONTHS = ['Aug 24', 'Nov 24', 'Feb 25', 'Jul 25']

/**
 * Eight executive trends, twelve months each.
 *
 * On the home they are sparklines — the shape and the direction, nothing more. The
 * axis, the gridlines and the readable scale come with the sheet, because a chart
 * small enough to fit eight to a screen cannot carry them and pretending otherwise
 * gives a reader numbers they cannot actually read off it.
 */
export const trends: TrendCard[] = [
  {
    key: 'population',
    label: 'Animal Population',
    tone: 'good',
    icon: PawPrint,
    accent: '#2f9e5b',
    metric: 'animals',
    /* A level, and the only card whose shape is worth two columns — it is the collection itself. */
    shape: 'area',
    wide: true,
    labels: MONTHS,
    unitNote: 'Animals · monthly close',
    href: '#/animals',
  },
  {
    key: 'births',
    label: 'Birth Trend',
    tone: 'good',
    icon: Sparkles,
    accent: '#e8590c',
    metric: 'births',
    shape: 'columns',
    labels: MONTHS,
    unitNote: 'Births · per month',
    href: '#/births',
  },
  {
    key: 'mortality',
    label: 'Mortality Trend',
    tone: 'good',
    icon: Activity,
    accent: '#9d174d',
    metric: 'mortality',
    shape: 'columns',
    labels: MONTHS,
    unitNote: 'Deaths · per month',
    href: '#/mortality',
  },
  {
    key: 'disease',
    label: 'Disease Trend',
    tone: 'warn',
    icon: Biohazard,
    accent: '#b91c1c',
    metric: 'disease',
    shape: 'columns',
    labels: MONTHS,
    unitNote: 'Flagged · per month',
    href: '#/disease',
  },
  {
    key: 'medicine',
    label: 'Medicine Spend',
    value: '₹9.8L',
    delta: '+4%',
    tone: 'neutral',
    icon: Pill,
    accent: '#0284c7',
    shape: 'range',
    values: [8.2, 8.6, 8.4, 8.9, 9.1, 8.8, 9.2, 9.4, 9.1, 9.6, 9.4, 9.8],
    labels: MONTHS,
    unitNote: '₹ lakh · per month',
    href: '#/health',
    scoped: false,
  },
  {
    key: 'wastage',
    label: 'Food Wastage',
    tone: 'warn',
    icon: Utensils,
    accent: '#b45309',
    metric: 'wastage',
    /* The one card with a published target, so the gap to it is the mark. */
    shape: 'meter',
    target: 3.0,
    labels: MONTHS,
    unitNote: '% of feed issued',
    href: '#/tasks',
  },
  {
    key: 'procurement',
    label: 'Procurement Spend',
    value: '₹64.2L',
    delta: '−3%',
    tone: 'good',
    icon: Truck,
    accent: '#4f46e5',
    shape: 'range',
    values: [58, 61, 66, 72, 69, 63, 60, 67, 71, 68, 66, 64],
    labels: MONTHS,
    unitNote: '₹ lakh · per month',
    href: '#/approvals',
    scoped: false,
  },
  {
    key: 'visitors',
    label: 'Visitor Trend',
    value: '186K',
    delta: '+9%',
    tone: 'good',
    icon: Ticket,
    accent: '#7c3aed',
    shape: 'area',
    values: [122, 138, 164, 191, 210, 186, 148, 132, 141, 158, 171, 186],
    labels: MONTHS,
    unitNote: 'Thousands · per month',
    href: '#/attendance',
    scoped: false,
  },
]

/* ── the executive rail ──────────────────────────────────────────────────── */

/**
 * The desktop right rail's queues — now four METRIC KEYS rather than four numbers.
 *
 * They were derived from the authored sections above, which was better than V3's hand-typed
 * copies but still left two problems. The rail was unscoped, so picking Carnivore Ridge left
 * four collection-wide figures in the third column of a scoped screen. And the lab and
 * attendance rows were literals — 31 and 243 — typed beside the modules that state the same
 * two numbers, which is exactly the arrangement the comment above used to warn about.
 *
 * Naming the metric instead means the rail reads the same series the module does, under the
 * same scope, and the note beside each figure is composed from the metric's own denominator.
 */
export const railQueues = [
  { slug: 'alerts', label: 'Alerts', metric: 'alertsCritical', note: 'critical', tone: 'bad' as const },
  { slug: 'approvals', label: 'Approvals', metric: 'approvals', note: 'pending', tone: 'warn' as const },
  { slug: 'lab', label: 'Lab Requests', metric: 'labOpen', note: 'open', tone: 'warn' as const },
  { slug: 'attendance', label: 'Staff Attendance', metric: 'attendance', note: 'on site', tone: 'good' as const },
]

export interface Activity {
  at: string
  text: string
  slug: string
  tone?: 'good' | 'warn' | 'bad'
}

export const activity: Activity[] = [
  { at: '11:12', text: 'Perimeter gate unsecured · Zone A', slug: 'alerts', tone: 'bad' },
  { at: '09:42', text: 'Mortality logged · Chital, Zone A', slug: 'mortality', tone: 'bad' },
  { at: '09:15', text: 'Vaccination round closed · Aviary Complex', slug: 'vaccination', tone: 'good' },
  { at: '08:51', text: '3 hatchlings recorded · Open Aviary 4', slug: 'eggs', tone: 'good' },
  { at: '08:20', text: 'Transfer approved · 2 Blackbuck to Junagadh', slug: 'transfers' },
  { at: '07:58', text: 'Lab result returned · Nile Tilapia, fungal', slug: 'lab', tone: 'warn' },
  { at: '07:30', text: 'Shift opened · 243 staff checked in', slug: 'attendance' },
]

/** Icons the sections use for their own headers. */
export const SECTION_ICONS = {
  kpis: TrendingUp,
  alerts: AlertOctagon,
  approvals: CheckCircle2,
  upcoming: CalendarClock,
  health: ShieldPlus,
  risks: Bug,
  trends: Footprints,
  /* Zoo Health and Executive Health are two sections and were one glyph, which made the page look
     as though it repeated itself. */
  zooHealth: ScanHeart,
  bell: BellRing,
  users: Users,
  baby: Baby,
} satisfies Record<string, LucideIcon>
