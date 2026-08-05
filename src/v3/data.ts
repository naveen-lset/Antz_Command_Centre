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
import type { ByPeriod, Figure } from '../exec/period'

/**
 * Which figures move with the reporting window, and which do not.
 *
 * A `ByPeriod` figure is a **flow** — a count of events inside the window, so it
 * is cut five ways. A plain string is a **stock**: a standing reading like "124
 * under care" or "14 approvals pending", which no window applies to. Total
 * population, species and enclosure counts, vaccination coverage and the whole
 * Operations group are stocks and stay put; the home's disclosure line says so
 * whenever the selected window is not the report month.
 *
 * Month is the authored truth — it is the window the board report is written
 * against — and `pick()` falls back to it for anything a figure has not been cut
 * for, so a missing window shows a stale number rather than a false zero.
 */

export const site = {
  userName: 'Bharathi Raja',
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
  /** A stock — the collection as it stands, not a sum over the window. */
  value: 215432,
  label: 'Animals',
  /** Net arrivals inside the window. "All time" is the collection's whole intake
      history since Apr 2019, which is why it approaches the total above. */
  gain: {
    today: '+11',
    week: '+76',
    month: '+324',
    sixMonths: '+1,842',
    all: '+186,904',
  } as ByPeriod<string>,
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
  /** Change against the preceding window of the same length, so it stays a
      like-for-like ratio whichever window is selected. */
  delta: Figure
  /** A flow — births and deaths counted inside the window. */
  value: ByPeriod<string>
  unit?: string
  viz: 'dots' | 'pulse' | 'area' | 'cols'
  accent: string
  /** Drill-down route — every card on the home screen opens its detail page. */
  href: string
}

/** The two headline life events, directly under the hero. */
export const mainPair: DailyCardData[] = [
  /* Today and six-month figures match `trends` below and the module pages behind
     both — the Trends card sits on this same screen, and two cards disagreeing about
     how many animals were born today is the one error a reader cannot un-see.
     Mortality's six months is the Mortality page's Feb–Apr 83 + May–Jul 77. */
  {
    title: 'Natality',
    icon: Sparkles,
    delta: { today: '+1', week: '+9%', month: '+12%', sixMonths: '+7%', all: '—' },
    value: { today: '3', week: '11', month: '45', sixMonths: '264', all: '9,412' },
    viz: 'dots',
    accent: '#e8590c',
    href: '#/births',
  },
  {
    title: 'Mortality',
    icon: Activity,
    delta: { today: '−1', week: '−14%', month: '−18%', sixMonths: '−6%', all: '—' },
    value: { today: '0', week: '5', month: '23', sixMonths: '160', all: '4,870' },
    viz: 'area',
    accent: '#9d174d',
    href: '#/mortality',
  },
]

export interface StatTileData {
  title: string
  /** `ByPeriod` → a flow, cut to the window. A plain string → a standing stock. */
  value: Figure
  /** Also a `Figure`: "of 142" is itself a count of eggs laid in the window. */
  unit: Figure
  href: string
  icon: LucideIcon
  accent: string
  /** Spans both columns — for an odd tile that would otherwise leave a gap. */
  wide?: boolean
  /** Secondary figure, right-aligned on the number row. Keep it short — a narrow
      tile shares that row with the value and unit. */
  note?: string
}

/**
 * 02 · Life Events, less the two above. Four events that were previously invisible
 * from the home screen: two of them had no page at all, and two were sub-labels
 * inside other modules.
 */
export const lifeEvents: StatTileData[] = [
  {
    title: 'Accession',
    value: { today: '1', week: '4', month: '18', sixMonths: '96', all: '3,204' },
    unit: 'intakes',
    href: '#/accession',
    icon: Rabbit,
    accent: '#059669',
  },
  {
    // Both halves are flows — eggs laid in the window, and how many of them hatched.
    title: 'Eggs Hatched',
    value: { today: '3', week: '22', month: '96', sixMonths: '540', all: '18,260' },
    unit: { today: 'of 5', week: 'of 33', month: 'of 142', sixMonths: 'of 780', all: 'of 26,410' },
    href: '#/eggs',
    icon: Egg,
    accent: '#d97706',
  },
  {
    title: 'Eggs Discarded',
    value: { today: '0', week: '3', month: '13', sixMonths: '78', all: '2,640' },
    unit: 'discarded',
    href: '#/discarded',
    icon: EggOff,
    accent: '#b45309',
  },
  {
    title: 'Fetal Death',
    value: { today: '0', week: '1', month: '5', sixMonths: '31', all: '1,105' },
    unit: 'losses',
    href: '#/fetal',
    icon: Baby,
    accent: '#9f1239',
  },
]

export interface ModuleCardData {
  title: string
  icon: LucideIcon
  /** Module identity hue — matches the drill-down page accent. */
  accent: string
  /** `ByPeriod` → a flow, cut to the window. A plain string → a standing stock. */
  value: Figure
  /** Carries the flow that sits beside the headline stock — "· 50 new". */
  unit: Figure
  /** Always a stock: what is critical or in transit right now. */
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
    // Caseload is a standing figure; admissions are counted inside the window.
    value: '124',
    unit: {
      today: 'under care · 2 new',
      week: 'under care · 12 new',
      month: 'under care · 50 new',
      sixMonths: 'under care · 296 new',
      all: 'under care · 10,480 new',
    },
    href: '#/health',
  },
  {
    title: 'Disease & Outbreak',
    icon: Biohazard,
    accent: '#b91c1c',
    // Conditions currently flagged is a stock; cases reported is a flow.
    value: '9',
    unit: {
      today: 'flagged · 4 cases',
      week: 'flagged · 26 cases',
      month: 'flagged · 112 cases',
      sixMonths: 'flagged · 690 cases',
      all: 'flagged · 24,300 cases',
    },
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
  // Both counts are movements completed inside the window; "in transit" is a stock.
  value: { today: '1', week: '6', month: '28', sixMonths: '168', all: '5,940' },
  unit: {
    today: 'transfers · 2 in-house',
    week: 'transfers · 11 in-house',
    month: 'transfers · 46 in-house',
    sixMonths: 'transfers · 274 in-house',
    all: 'transfers · 9,860 in-house',
  },
  note: '2 in transit',
  href: '#/transfers',
}

/**
 * 06 · Trends — the three series on one window, so they can be compared.
 *
 * The card is titled from the selected window rather than carrying a fixed
 * "30-Day": a chip row that can cut to six months while the card underneath still
 * says "30-Day Trends" is the exact contradiction the window vocabulary exists to
 * avoid. Bucket shapes are kept — they describe the window's profile, whatever its
 * length — and only the totals are cut.
 */
export const trends = {
  title: {
    today: 'Today’s Trend',
    week: '7-Day Trends',
    month: '30-Day Trends',
    sixMonths: '6-Month Trends',
    all: 'All-Time Trends',
  } as ByPeriod<string>,
  icon: TrendingUp,
  accent: '#0e7490',
  href: '#/trends',
  /**
   * Same series, same buckets as the Trends page — they have to match.
   *
   * The plotted series is now cut per window too. It used to be one fixed 15-point
   * 30-day array drawn under every title, so "Today's Trend" rendered a month of
   * shape: the label said one thing and the line said another. Bucket size follows
   * the window — daily for a week, 2-day for a month, monthly for six months, yearly
   * for all time — and each array sums to the figure beside it.
   *
   * `today` is deliberately a single point. One day has no shape, and the card drops
   * the plot entirely rather than drawing a line through one reading.
   *
   * Six-month figures are pinned to the module pages: deaths 160 is the Mortality
   * page's Feb–Apr 83 + May–Jul 77, and its monthly buckets are that page's
   * 30·27·26 · 29·25·23 exactly.
   */
  series: [
    {
      label: 'Births',
      value: { today: '3', week: '11', month: '45', sixMonths: '264', all: '9,412' },
      accent: '#e8590c',
      values: {
        today: [3],
        week: [1, 2, 1, 2, 1, 3, 1],
        month: [2, 2, 3, 3, 4, 4, 3, 3, 3, 4, 3, 3, 3, 3, 2],
        sixMonths: [38, 42, 45, 48, 50, 41],
        all: [620, 980, 1240, 1480, 1620, 1780, 1692],
      } as ByPeriod<number[]>,
    },
    {
      label: 'Deaths',
      value: { today: '0', week: '5', month: '23', sixMonths: '160', all: '4,870' },
      accent: '#9d174d',
      values: {
        today: [0],
        week: [0, 1, 0, 1, 1, 1, 1],
        month: [1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 4, 3, 1],
        sixMonths: [30, 27, 26, 29, 25, 23],
        all: [280, 520, 680, 760, 840, 920, 870],
      } as ByPeriod<number[]>,
    },
    {
      label: 'New cases',
      value: { today: '2', week: '12', month: '50', sixMonths: '297', all: '10,480' },
      accent: '#0284c7',
      values: {
        today: [2],
        week: [1, 2, 2, 1, 2, 2, 2],
        month: [2, 2, 3, 3, 3, 3, 3, 4, 4, 5, 6, 5, 4, 2, 1],
        sixMonths: [42, 46, 48, 54, 56, 51],
        all: [680, 1180, 1480, 1680, 1820, 1940, 1700],
      } as ByPeriod<number[]>,
    },
  ],
  /** Bucket width, named under the plot so the x-axis needs no ticks. */
  buckets: {
    today: 'One reading',
    week: 'Daily · 7 days',
    month: '2-day buckets · 30 days',
    sixMonths: 'Monthly · Feb – Jul',
    all: 'Yearly · 2019 – 2025',
  } as ByPeriod<string>,
}

/**
 * Operations. Every value here is a stock, so the window control leaves the group
 * untouched — "14 approvals pending" cut to last week would be nonsense, the queue
 * is however long it is right now. The home's disclosure line names the exclusion
 * rather than leaving a reader to notice these six tiles never moved.
 *
 * Nothing here appears in the monthly report — these are read today,
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
