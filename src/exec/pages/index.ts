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
import type { ComponentType } from 'react'
import { lazyPage } from '../../v4/perf'

export interface ExecPage {
  title: string
  /**
   * A lazily-loaded chunk, not a statically imported component.
   *
   * All twenty-three pages plus the design system used to be one bundle, so opening the home
   * parsed the pharmacy page. Each is now fetched when its route is first visited and cached
   * by the browser after that — the home gets smaller and no module gets slower twice.
   * `lazyPage` supplies the skeleton, so a page cannot ship without a loading state.
   */
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
    Page: lazyPage(() => import('../../v4/modules/animals')),
    icon: PawPrint,
    periods: true,
    keywords: ['inventory', 'headcount', 'census', 'stock', 'species', 'classes', 'collection'],
  },
  accession: {
    title: 'Accession',
    Page: lazyPage(() => import('./accession')),
    icon: Rabbit,
    periods: true,
    keywords: ['intake', 'arrivals', 'acquired', 'new animals', 'rescue', 'received'],
  },
  births: {
    title: 'Birth Analytics',
    Page: lazyPage(() => import('./births')),
    icon: Sparkles,
    periods: true,
    keywords: ['natality', 'newborn', 'breeding', 'calves', 'litters', 'birth rate'],
  },
  eggs: {
    title: 'Eggs & Incubation',
    Page: lazyPage(() => import('../../v4/modules/eggs')),
    icon: Egg,
    periods: true,
    keywords: ['hatch', 'hatchery', 'clutch', 'incubator', 'fertile'],
  },
  discarded: {
    title: 'Eggs Discarded',
    Page: lazyPage(() => import('./discarded')),
    icon: EggOff,
    periods: true,
    keywords: ['infertile', 'unhatched', 'spoiled', 'rejected eggs'],
  },
  mortality: {
    title: 'Mortality & Necropsy',
    Page: lazyPage(() => import('../../v4/modules/mortality')),
    icon: Activity,
    periods: true,
    keywords: ['death', 'deaths', 'died', 'necropsy', 'postmortem', 'cause of death'],
  },
  fetal: {
    title: 'Fetal Death',
    Page: lazyPage(() => import('./fetal')),
    icon: Baby,
    periods: true,
    keywords: ['stillbirth', 'miscarriage', 'abortion', 'prenatal loss'],
  },
  health: {
    title: 'Health & Medical',
    Page: lazyPage(() => import('../../v4/modules/medical')),
    icon: HeartPulse,
    periods: true,
    keywords: ['clinical', 'treatment', 'vet', 'veterinary', 'medical', 'under care', 'recovery'],
  },
  disease: {
    title: 'Disease & Outbreak',
    Page: lazyPage(() => import('./disease')),
    icon: Biohazard,
    periods: true,
    keywords: ['infection', 'epidemic', 'quarantine', 'contagion', 'pathogen', 'zoonotic'],
  },
  preventive: {
    /* "Preventive Medication", not "Preventive Care" — the module is vaccination, deworming
       and supplements, and care is the clinical module next door. The route is unchanged. */
    title: 'Preventive Medication',
    Page: lazyPage(() => import('../../v4/modules/preventive')),
    icon: ShieldPlus,
    periods: true,
    keywords: [
      'prophylaxis', 'protection', 'coverage', 'routine care', 'screening',
      'vaccine', 'vaccination', 'booster', 'deworming', 'anthelmintic', 'wormer',
      'supplement', 'vitamin', 'mineral', 'overdue', 'due',
    ],
  },
  pharmacy: {
    title: 'Pharmacy',
    Page: lazyPage(() => import('../../v4/modules/pharmacy')),
    icon: Warehouse,
    periods: true,
    keywords: ['medicine', 'stock', 'dispensary', 'store', 'procurement', 'expiry', 'consumables', 'drugs'],
  },
  vaccination: {
    title: 'Vaccination',
    Page: lazyPage(() => import('./vaccination')),
    icon: Syringe,
    periods: true,
    keywords: ['vaccine', 'immunisation', 'immunization', 'jab', 'dose', 'booster'],
  },
  deworming: {
    title: 'Deworming',
    Page: lazyPage(() => import('./deworming')),
    icon: Pill,
    periods: true,
    keywords: ['parasite', 'anthelmintic', 'worming', 'faecal', 'fecal', 'load'],
  },
  transfers: {
    title: 'Animal Movement',
    Page: lazyPage(() => import('./transfers')),
    icon: ArrowLeftRight,
    periods: true,
    keywords: ['transfer', 'transport', 'loan', 'exchange', 'in transit', 'shifted', 'relocation'],
  },
  trends: {
    title: '30-Day Trends',
    Page: lazyPage(() => import('./trends')),
    icon: TrendingUp,
    periods: true,
    keywords: ['trend', 'over time', 'chart', 'graph', 'series', 'trajectory'],
  },

  /* operations track */
  approvals: {
    title: 'Approvals',
    Page: lazyPage(() => import('./approvals')),
    ops: true,
    icon: CheckCircle2,
    keywords: ['sign off', 'authorise', 'authorize', 'pending', 'sanction', 'permission'],
  },
  tasks: {
    title: 'Tasks',
    Page: lazyPage(() => import('./tasks')),
    ops: true,
    icon: ListTodo,
    keywords: ['todo', 'to do', 'assignments', 'work orders', 'overdue', 'checklist'],
  },
  lab: {
    title: 'Lab Requests',
    Page: lazyPage(() => import('../../v4/modules/lab')),
    ops: true,
    icon: FlaskConical,
    keywords: ['laboratory', 'samples', 'pathology', 'histopathology', 'test', 'panel', 'results'],
  },
  attendance: {
    title: 'Staff Attendance',
    Page: lazyPage(() => import('./attendance')),
    ops: true,
    icon: Users,
    keywords: ['staffing', 'roster', 'shift', 'keepers', 'headcount', 'present', 'leave'],
  },
  welfare: {
    title: 'Animal Welfare',
    Page: lazyPage(() => import('./welfare')),
    ops: true,
    icon: ShieldCheck,
    keywords: ['audit', 'enrichment', 'wellbeing', 'five domains', 'inspection', 'score'],
  },
  users: {
    title: 'Users',
    Page: lazyPage(() => import('../../v4/modules/users')),
    ops: true,
    icon: Users,
    keywords: ['accounts', 'access', 'login', 'active', 'adoption', 'permissions', 'staff accounts'],
  },
  alerts: {
    title: 'Alerts',
    Page: lazyPage(() => import('./alerts')),
    ops: true,
    icon: BellRing,
    keywords: ['alarm', 'critical', 'incident', 'escalation', 'notification', 'warning'],
  },
}

export const findExecPage = (slug: string) => execPages[slug]
