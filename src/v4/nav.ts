/**
 * The V4 module list.
 *
 * Derived from `execPages` — the page registry already carries every module's title,
 * icon, search keywords and report/operations flag, and a second hand-written list is
 * a second chance for the sidebar and the search results to disagree.
 *
 * TWO THINGS ARE DIFFERENT FROM V3'S NAV.
 *
 * The grouping is by what a director does with a module rather than by which track it
 * belongs to. V3 split Report from Operations, which is the right split for assembling
 * a board pack and the wrong one for finding Vaccination: "is this a monthly figure"
 * is not a question anyone asks on the way to a page. The thirteen the brief names are
 * the working set and lead; the seven that only ever appear inside the monthly report
 * follow under their own rule.
 *
 * And a few titles are renamed to the words the brief uses — "Natality", not "Birth
 * Analytics"; "Animals", not "Animal Population". The rename lives here, in one map,
 * and is applied to the sidebar AND the page header, so the row you click and the
 * heading you land on always say the same thing.
 */

import { Settings, type LucideIcon } from 'lucide-react'
import { execPages } from '../exec/pages'

/** Executive naming. Anything absent keeps the registry's own title. */
export const TITLES: Record<string, string> = {
  animals: 'Animals',
  births: 'Natality',
  transfers: 'Transfers',
  health: 'Health',
  lab: 'Lab',
  attendance: 'Attendance',
  welfare: 'Welfare',
  trends: 'Trends',
  disease: 'Disease',
  preventive: 'Preventive',
  discarded: 'Eggs Discarded',
}

export const titleOf = (slug: string): string => TITLES[slug] ?? execPages[slug]?.title ?? slug

export interface NavItem {
  slug: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  name: string
  items: NavItem[]
}

/** The thirteen the brief names, in the order it names them. */
const PRIMARY = [
  'animals',
  'health',
  'births',
  'mortality',
  'transfers',
  'vaccination',
  'deworming',
  'lab',
  'approvals',
  'attendance',
  'tasks',
  'alerts',
  'welfare',
]

const toItem = (slug: string): NavItem | undefined => {
  const page = execPages[slug]
  return page ? { slug, label: titleOf(slug), icon: page.icon } : undefined
}

const primary = PRIMARY.map(toItem).filter((i): i is NavItem => Boolean(i))

/** Everything else the product already has — kept, not hidden. */
const secondary = Object.keys(execPages)
  .filter((slug) => !PRIMARY.includes(slug))
  .map(toItem)
  .filter((i): i is NavItem => Boolean(i))

export const navGroups: NavGroup[] = [
  { name: 'Modules', items: primary },
  { name: 'Report detail', items: secondary },
]

export const SETTINGS: NavItem = { slug: 'settings', label: 'Settings', icon: Settings }

/**
 * Which sidebar entry to light up. A record page (`mortality/records`) highlights its
 * module — the sidebar names where you are in the product, not which level you are on.
 */
export const activeSlug = (route: string): string => route.replace(/^#\//, '').split('/')[0]

export const filterNav = (query: string): NavGroup[] => {
  const q = query.trim().toLowerCase()
  if (!q) return navGroups
  return navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          (execPages[i.slug]?.keywords ?? []).some((k) => k.includes(q)),
      ),
    }))
    .filter((g) => g.items.length > 0)
}
