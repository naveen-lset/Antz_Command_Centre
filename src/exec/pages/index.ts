/**
 * Registry of executive module pages.
 *
 * Each entry is a hand-composed page, not a template instance — no two share a
 * structure. Twenty modules, split into two tracks:
 *
 *   REPORT      the fourteen that the monthly board report is made of, in the
 *               order its table of contents lists them
 *   OPERATIONS  the six that are live-ops rather than reporting — approvals,
 *               tasks, staffing, alerting, lab throughput, welfare auditing.
 *               None of them appear anywhere in the report, so they sit below the
 *               fold on the home screen and carry no reporting period.
 *
 * The split is about the reading occasion, not importance. An overdue approval
 * matters more today than last month's hatch rate; it just isn't a monthly figure.
 */
import type { ComponentType } from 'react'
import {
  Activity,
  ArrowLeftRight,
  Baby,
  BellRing,
  Biohazard,
  CheckCircle2,
  Egg,
  EggOff,
  FlaskConical,
  HeartPulse,
  ListTodo,
  PawPrint,
  Pill,
  Rabbit,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Syringe,
  TrendingUp,
  Users,
  Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Animals from '../../v4/modules/animals'
import Pharmacy from '../../v4/modules/pharmacy'
import UsersPage from '../../v4/modules/users'
import Accession from './accession'
import Health from '../../v4/modules/medical'
import Births from './births'
import Eggs from '../../v4/modules/eggs'
import Discarded from './discarded'
import Fetal from './fetal'
import Mortality from '../../v4/modules/mortality'
import Disease from './disease'
import Transfers from './transfers'
import Preventive from '../../v4/modules/preventive'
import Vaccination from './vaccination'
import Deworming from './deworming'
import Trends from './trends'
import Lab from '../../v4/modules/lab'
import Welfare from './welfare'
import Approvals from './approvals'
import Tasks from './tasks'
import Attendance from './attendance'
import Alerts from './alerts'

export interface ExecPage {
  title: string
  Page: ComponentType
  /**
   * Report-track pages are cut against a reporting period and say so in the sheet
   * eyebrow. Operations pages are live and must not — stamping "JULY 2025" over a
   * list of tasks due today states the opposite of the truth.
   */
  ops?: true
  /** Shown by global search. */
  icon: LucideIcon
  /**
   * Extra terms global search matches on — the words someone would actually type.
   * Nobody searches "Mortality" when an animal has died; they search "death". These
   * are synonyms and near-misses, never a restatement of the title.
   */
  keywords?: string[]
  /**
   * Page offers the window switcher. Report pages do; operations pages don't, because
   * a task list cut to "last 6 months" is not a thing anyone wants to read.
   */
  periods?: true
}

export const execPages: Record<string, ExecPage> = {
  /* report track */
  animals: {
    title: 'Animal Population',
    Page: Animals,
    icon: PawPrint,
    periods: true,
    keywords: ['inventory', 'headcount', 'census', 'stock', 'species', 'classes', 'collection'],
  },
  accession: {
    title: 'Accession',
    Page: Accession,
    icon: Rabbit,
    periods: true,
    keywords: ['intake', 'arrivals', 'acquired', 'new animals', 'rescue', 'received'],
  },
  births: {
    title: 'Birth Analytics',
    Page: Births,
    icon: Sparkles,
    periods: true,
    keywords: ['natality', 'newborn', 'breeding', 'calves', 'litters', 'birth rate'],
  },
  eggs: {
    title: 'Eggs & Incubation',
    Page: Eggs,
    icon: Egg,
    periods: true,
    keywords: ['hatch', 'hatchery', 'clutch', 'incubator', 'fertile'],
  },
  discarded: {
    title: 'Eggs Discarded',
    Page: Discarded,
    icon: EggOff,
    periods: true,
    keywords: ['infertile', 'unhatched', 'spoiled', 'rejected eggs'],
  },
  mortality: {
    title: 'Mortality',
    Page: Mortality,
    icon: Activity,
    periods: true,
    keywords: ['death', 'deaths', 'died', 'necropsy', 'postmortem', 'cause of death'],
  },
  fetal: {
    title: 'Fetal Death',
    Page: Fetal,
    icon: Baby,
    periods: true,
    keywords: ['stillbirth', 'miscarriage', 'abortion', 'prenatal loss'],
  },
  health: {
    title: 'Health & Medical',
    Page: Health,
    icon: HeartPulse,
    periods: true,
    keywords: ['clinical', 'treatment', 'vet', 'veterinary', 'medical', 'under care', 'recovery'],
  },
  disease: {
    title: 'Disease & Outbreak',
    Page: Disease,
    icon: Biohazard,
    periods: true,
    keywords: ['infection', 'epidemic', 'quarantine', 'contagion', 'pathogen', 'zoonotic'],
  },
  preventive: {
    title: 'Preventive Care',
    Page: Preventive,
    icon: ShieldPlus,
    periods: true,
    keywords: ['prophylaxis', 'protection', 'coverage', 'routine care', 'screening'],
  },
  pharmacy: {
    title: 'Pharmacy',
    Page: Pharmacy,
    icon: Warehouse,
    periods: true,
    keywords: ['medicine', 'stock', 'dispensary', 'store', 'procurement', 'expiry', 'consumables', 'drugs'],
  },
  vaccination: {
    title: 'Vaccination',
    Page: Vaccination,
    icon: Syringe,
    periods: true,
    keywords: ['vaccine', 'immunisation', 'immunization', 'jab', 'dose', 'booster'],
  },
  deworming: {
    title: 'Deworming',
    Page: Deworming,
    icon: Pill,
    periods: true,
    keywords: ['parasite', 'anthelmintic', 'worming', 'faecal', 'fecal', 'load'],
  },
  transfers: {
    title: 'Animal Movement',
    Page: Transfers,
    icon: ArrowLeftRight,
    periods: true,
    keywords: ['transfer', 'transport', 'loan', 'exchange', 'in transit', 'shifted', 'relocation'],
  },
  trends: {
    title: '30-Day Trends',
    Page: Trends,
    icon: TrendingUp,
    periods: true,
    keywords: ['trend', 'over time', 'chart', 'graph', 'series', 'trajectory'],
  },

  /* operations track */
  approvals: {
    title: 'Approvals',
    Page: Approvals,
    ops: true,
    icon: CheckCircle2,
    keywords: ['sign off', 'authorise', 'authorize', 'pending', 'sanction', 'permission'],
  },
  tasks: {
    title: 'Tasks',
    Page: Tasks,
    ops: true,
    icon: ListTodo,
    keywords: ['todo', 'to do', 'assignments', 'work orders', 'overdue', 'checklist'],
  },
  lab: {
    title: 'Lab Requests',
    Page: Lab,
    ops: true,
    icon: FlaskConical,
    keywords: ['laboratory', 'samples', 'pathology', 'histopathology', 'test', 'panel', 'results'],
  },
  attendance: {
    title: 'Staff Attendance',
    Page: Attendance,
    ops: true,
    icon: Users,
    keywords: ['staffing', 'roster', 'shift', 'keepers', 'headcount', 'present', 'leave'],
  },
  welfare: {
    title: 'Animal Welfare',
    Page: Welfare,
    ops: true,
    icon: ShieldCheck,
    keywords: ['audit', 'enrichment', 'wellbeing', 'five domains', 'inspection', 'score'],
  },
  users: {
    title: 'Users',
    Page: UsersPage,
    ops: true,
    icon: Users,
    keywords: ['accounts', 'access', 'login', 'active', 'adoption', 'permissions', 'staff accounts'],
  },
  alerts: {
    title: 'Alerts',
    Page: Alerts,
    ops: true,
    icon: BellRing,
    keywords: ['alarm', 'critical', 'incident', 'escalation', 'notification', 'warning'],
  },
}

export const findExecPage = (slug: string) => execPages[slug]
