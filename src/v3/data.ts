/** Aesthetic Command Centre concept — warm neutrals, number-first cards. */
import { Activity, ArrowLeftRight, BellRing, CheckCircle2, Egg, FlaskConical, HeartPulse, ListTodo, Pill, ShieldCheck, Sparkles, Syringe, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const site = {
  userName: 'Subhash',
  org: 'Vantara Wildlife Trust',
  zooName: 'Jamnagar Zoo',
  weather: { tempC: 24, summary: 'Partly Cloudy', feelsLike: 27, high: 31, low: 22 },
}

export const hero = {
  value: 215432,
  label: 'Animals',
  delta: '+324 this month',
  /** Drill-down route for the hero KPI. */
  href: '#/animals',
}

export interface DailyCardData {
  title: string
  icon: LucideIcon
  delta: string
  value: string
  unit?: string
  viz: 'dots' | 'pulse'
  accent: string
  /** Drill-down route — every card on the home screen opens its detail page. */
  href: string
}

/** The two headline cards directly under the hero. */
export const mainPair: DailyCardData[] = [
  { title: 'Natality', icon: Sparkles, delta: '+12%', value: '45', viz: 'dots', accent: '#e8590c', href: '#/births' },
  { title: 'Mortality', icon: Activity, delta: '−18%', value: '23', viz: 'pulse', accent: '#9d174d', href: '#/mortality' },
]

export const dailyUpdates: DailyCardData[] = [
  { title: 'Eggs', icon: Egg, delta: '+4', value: '21', unit: 'incubating', viz: 'dots', accent: '#d97706', href: '#/eggs' },
  { title: 'Alerts', icon: BellRing, delta: '36 open', value: '6', unit: 'critical', viz: 'pulse', accent: '#dc2626', href: '#/alerts' },
]

export const welfare = {
  title: 'Assessment',
  icon: ShieldCheck,
  accent: '#db2777',
  sub: '128 done this quarter · 12 due',
  value: '4.6',
  of: '/5',
  href: '#/welfare',
}

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

export const moduleCards: ModuleCardData[] = [
  { title: 'Health & Medical', icon: HeartPulse, accent: '#e93353', value: '124', unit: 'under care', note: '−7 this week', href: '#/health' },
  { title: 'Approvals', icon: CheckCircle2, accent: '#7c3aed', value: '14', unit: 'pending · avg 1.4 d', gauge: { fraction: 0.88, label: '88%' }, href: '#/approvals' },
  { title: 'Tasks', icon: ListTodo, accent: '#ea580c', value: '41', unit: 'of 76 done', note: '5 overdue', href: '#/tasks' },
  { title: 'Vaccination', icon: Syringe, accent: '#6d28d9', value: '92%', unit: 'herd coverage', note: '+76 this month', href: '#/vaccination' },
]

/** Remaining modules — number-first stat tiles in a 2×2 grid. */
export interface StatTileData {
  title: string
  value: string
  unit: string
  href: string
  icon: LucideIcon
  accent: string
}

export const moreModules: StatTileData[] = [
  { title: 'Transfers', value: '28', unit: 'this month', href: '#/transfers', icon: ArrowLeftRight, accent: '#2563eb' },
  { title: 'Deworming', value: '63', unit: 'treatments', href: '#/deworming', icon: Pill, accent: '#0d9488' },
  { title: 'Lab Requests', value: '31', unit: 'open', href: '#/lab', icon: FlaskConical, accent: '#0284c7' },
  { title: 'Staff Attendance', value: '243', unit: '/ 312', href: '#/attendance', icon: Users, accent: '#4f46e5' },
]
