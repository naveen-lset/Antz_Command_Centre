import type { DetailPageData } from '../model'
import { animals } from './animals'
import { births, eggs } from './breeding'
import { deworming, health, lab, mortality, vaccination } from './medical'
import { alerts, approvals, attendance, tasks, transfers, welfare } from './operations'

/** Registry order also drives the "More Modules" rail at the foot of every page. */
export const detailPages: DetailPageData[] = [
  animals,
  health,
  births,
  eggs,
  mortality,
  transfers,
  vaccination,
  deworming,
  lab,
  welfare,
  approvals,
  tasks,
  attendance,
  alerts,
]

export const findDetailPage = (slug: string): DetailPageData | undefined =>
  detailPages.find((p) => p.slug === slug)

export const otherPages = (slug: string) =>
  detailPages.filter((p) => p.slug !== slug).map(({ slug: s, title }) => ({ slug: s, title }))
