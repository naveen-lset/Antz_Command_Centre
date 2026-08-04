/**
 * Home screen content — warm neutrals, number-first cards.
 *
 * The order below is the monthly board report's table of contents, section for
 * section: population, life events, veterinary, preventive care, movement, trends,
 * disease. That is the whole organising idea. Before this, the home screen was
 * fourteen tiles in rough order of how interesting they looked, and the report a
 * director actually reads had no counterpart here at all.
 *
 * `operations` is everything with no presence in that report — approvals, tasks,
 * staffing, alerting, lab throughput, welfare audits. Live-ops, not reporting: it
 * keeps its own group below the report sections rather than competing with them.
 */
import {
  Activity,
  ArrowLeftRight,
  BellRing,
  Biohazard,
  Baby,
  CheckCircle2,
  Egg,
  EggOff,
  FlaskConical,
  HeartPulse,
  ListTodo,
  PawPrint,
  Rabbit,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const site = {
  userName: 'Subhash',
  org: 'Vantara Wildlife Trust',
  zooName: 'Jamnagar Zoo',
  weather: { tempC: 24, summary: 'Partly Cloudy', feelsLike: 27, high: 31, low: 22 },
}

/**
 * 01 · Animal Population. The sex split rides with the total because the report
 * states them together, and because "undetermined" being the overwhelming majority
 * is the single most surprising fact about a collection this size.
 */
export const hero = {
  value: 215432,
  label: 'Animals',
  delta: '+324 this month',
  /** Drill-down route for the hero KPI. */
  href: '#/animals',
  sex: [
    { value: '18,204', label: 'Male' },
    { value: '16,880', label: 'Female' },
    { value: '180,348', label: 'Undetermined' },
  ],
}

/**
 * 01 · Animal Population, as a card. The hero above states the total; this states
 * how it is composed, and carries the only route to class composition — nine
 * scientific classes that had no entry point from the home screen at all.
 *
 * No total here on purpose: repeating 215,432 twelve pixels below the hero would
 * make the hero look like decoration.
 */
export const population = {
  title: 'Animal Population',
  icon: PawPrint,
  accent: '#0f766e',
  href: '#/animals',
  facts: [
    { value: '428', label: 'Species' },
    { value: '9', label: 'Classes' },
    { value: '6', label: 'Sites' },
    { value: '96', label: 'Enclosures' },
  ],
}

export interface DailyCardData {
  title: string
  icon: LucideIcon
  delta: string
  value: string
  unit?: string
  viz: 'dots' | 'pulse' | 'area' | 'cols'
  accent: string
  /** Drill-down route — every card on the home screen opens its detail page. */
  href: string
}

/** The two headline life events, directly under the hero. */
export const mainPair: DailyCardData[] = [
  { title: 'Natality', icon: Sparkles, delta: '+12%', value: '45', viz: 'dots', accent: '#e8590c', href: '#/births' },
  { title: 'Mortality', icon: Activity, delta: '−18%', value: '23', viz: 'area', accent: '#9d174d', href: '#/mortality' },
]

export interface StatTileData {
  title: string
  value: string
  unit: string
  href: string
  icon: LucideIcon
  accent: string
  /** Spans both columns — for an odd tile that would otherwise leave a gap. */
  wide?: boolean
  /** Secondary figure, right-aligned. Only read on a wide tile, which has the room. */
  note?: string
}

/**
 * 02 · Life Events, less the two above. Four events that were previously invisible
 * from the home screen: two of them had no page at all, and two were sub-labels
 * inside other modules.
 */
export const lifeEvents: StatTileData[] = [
  { title: 'Accession', value: '18', unit: 'intakes', href: '#/accession', icon: Rabbit, accent: '#059669' },
  { title: 'Eggs Hatched', value: '96', unit: 'of 142', href: '#/eggs', icon: Egg, accent: '#d97706' },
  { title: 'Eggs Discarded', value: '13', unit: 'discarded', href: '#/discarded', icon: EggOff, accent: '#b45309' },
  { title: 'Fetal Death', value: '5', unit: 'losses', href: '#/fetal', icon: Baby, accent: '#9f1239' },
]

export interface ModuleCardData {
  title: string
  icon: LucideIcon
  /** Module identity hue — matches the drill-down page accent. */
  accent: string
  value: string
  unit: string
  note?: string
  /** Renders the dashed arc gauge instead of a note. */
  gauge?: { fraction: number; label: string }
  href: string
}

/** 03 · Veterinary & Health, and 07 · Disease and Outbreak. */
export const clinical: ModuleCardData[] = [
  {
    title: 'Health & Medical',
    icon: HeartPulse,
    accent: '#e93353',
    value: '124',
    unit: 'under care · 50 new',
    note: '11 critical',
    href: '#/health',
  },
  {
    title: 'Disease & Outbreak',
    icon: Biohazard,
    accent: '#b91c1c',
    value: '9',
    unit: 'flagged · 112 cases',
    note: '2 outbreaks',
    href: '#/disease',
  },
]

/**
 * 04 · Preventive Health Care. One card for both rates, because "is the collection
 * protected?" is one question — and each rate carries the fraction it came from,
 * so 92% cannot be read without also seeing the 190 animals it leaves out.
 */
export const preventive = {
  title: 'Preventive Care',
  icon: ShieldPlus,
  accent: '#6d28d9',
  href: '#/preventive',
  note: '9 overdue',
  rates: [
    { label: 'Vaccinated', percent: 92, value: '2,184', of: '2,374' },
    { label: 'Dewormed', percent: 89, value: '1,946', of: '2,190' },
  ],
}

/** 05 · Animal Movements. */
export const movement: ModuleCardData = {
  title: 'Animal Movement',
  icon: ArrowLeftRight,
  accent: '#2563eb',
  value: '28',
  unit: 'transfers · 46 in-house',
  note: '2 in transit',
  href: '#/transfers',
}

/** 06 · 30 Days Trends — the three series on one window, so they can be compared. */
export const trends = {
  title: '30-Day Trends',
  icon: TrendingUp,
  accent: '#0e7490',
  href: '#/trends',
  /** Same series, same buckets as the Trends page — they have to match. */
  series: [
    { label: 'Births', value: '45', accent: '#e8590c', values: [2, 2, 3, 3, 4, 4, 3, 3, 3, 4, 3, 3, 3, 3, 2] },
    { label: 'Deaths', value: '23', accent: '#9d174d', values: [1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 4, 3, 1] },
    { label: 'New cases', value: '50', accent: '#0284c7', values: [2, 2, 3, 3, 3, 3, 3, 4, 4, 5, 6, 5, 4, 2, 1] },
  ],
}

/**
 * Operations. Nothing here appears in the monthly report — these are read today,
 * not reviewed at month end, so they sit in their own group rather than being
 * mixed into the report sections above.
 */
export const operations: StatTileData[] = [
  { title: 'Approvals', value: '14', unit: 'pending', href: '#/approvals', icon: CheckCircle2, accent: '#7c3aed' },
  { title: 'Tasks', value: '41', unit: 'of 76 done', href: '#/tasks', icon: ListTodo, accent: '#ea580c' },
  { title: 'Lab Requests', value: '31', unit: 'open', href: '#/lab', icon: FlaskConical, accent: '#0284c7' },
  { title: 'Staff Attendance', value: '243', unit: '/ 312', href: '#/attendance', icon: Users, accent: '#4f46e5' },
  { title: 'Welfare Audits', value: '4.6', unit: '/ 5 · 12 due', href: '#/welfare', icon: ShieldCheck, accent: '#db2777' },
  { title: 'Alerts', value: '6', unit: 'critical', note: '36 open', href: '#/alerts', icon: BellRing, accent: '#dc2626' },
]
