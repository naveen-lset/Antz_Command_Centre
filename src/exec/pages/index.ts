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
import Animals from './animals'
import Accession from './accession'
import Health from './health'
import Births from './births'
import Eggs from './eggs'
import Discarded from './discarded'
import Fetal from './fetal'
import Mortality from './mortality'
import Disease from './disease'
import Transfers from './transfers'
import Preventive from './preventive'
import Vaccination from './vaccination'
import Deworming from './deworming'
import Trends from './trends'
import Lab from './lab'
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
}

export const execPages: Record<string, ExecPage> = {
  /* report track */
  animals: { title: 'Animal Population', Page: Animals },
  accession: { title: 'Accession', Page: Accession },
  births: { title: 'Birth Analytics', Page: Births },
  eggs: { title: 'Eggs & Incubation', Page: Eggs },
  discarded: { title: 'Eggs Discarded', Page: Discarded },
  mortality: { title: 'Mortality', Page: Mortality },
  fetal: { title: 'Fetal Death', Page: Fetal },
  health: { title: 'Health & Medical', Page: Health },
  disease: { title: 'Disease & Outbreak', Page: Disease },
  preventive: { title: 'Preventive Care', Page: Preventive },
  vaccination: { title: 'Vaccination', Page: Vaccination },
  deworming: { title: 'Deworming', Page: Deworming },
  transfers: { title: 'Animal Movement', Page: Transfers },
  trends: { title: '30-Day Trends', Page: Trends },

  /* operations track */
  approvals: { title: 'Approvals', Page: Approvals, ops: true },
  tasks: { title: 'Tasks', Page: Tasks, ops: true },
  lab: { title: 'Lab Requests', Page: Lab, ops: true },
  attendance: { title: 'Staff Attendance', Page: Attendance, ops: true },
  welfare: { title: 'Animal Welfare', Page: Welfare, ops: true },
  alerts: { title: 'Alerts', Page: Alerts, ops: true },
}

export const findExecPage = (slug: string) => execPages[slug]
