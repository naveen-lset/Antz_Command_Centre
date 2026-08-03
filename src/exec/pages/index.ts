/**
 * Registry of executive module pages.
 *
 * Each entry is a hand-composed page, not a template instance — no two share a
 * structure. All 14 modules are covered, so the older generic renderer is now
 * unreachable from a module route.
 */
import type { ComponentType } from 'react'
import Animals from './animals'
import Health from './health'
import Births from './births'
import Eggs from './eggs'
import Mortality from './mortality'
import Transfers from './transfers'
import Vaccination from './vaccination'
import Deworming from './deworming'
import Lab from './lab'
import Welfare from './welfare'
import Approvals from './approvals'
import Tasks from './tasks'
import Attendance from './attendance'
import Alerts from './alerts'

export const execPages: Record<string, { title: string; Page: ComponentType }> = {
  animals: { title: 'Animals', Page: Animals },
  health: { title: 'Health & Medical', Page: Health },
  births: { title: 'Birth Analytics', Page: Births },
  eggs: { title: 'Eggs & Incubation', Page: Eggs },
  mortality: { title: 'Mortality', Page: Mortality },
  transfers: { title: 'Transfers', Page: Transfers },
  vaccination: { title: 'Vaccination', Page: Vaccination },
  deworming: { title: 'Deworming', Page: Deworming },
  lab: { title: 'Lab Requests', Page: Lab },
  welfare: { title: 'Animal Welfare', Page: Welfare },
  approvals: { title: 'Approvals', Page: Approvals },
  tasks: { title: 'Tasks', Page: Tasks },
  attendance: { title: 'Staff Attendance', Page: Attendance },
  alerts: { title: 'Alerts', Page: Alerts },
}

export const findExecPage = (slug: string) => execPages[slug]
