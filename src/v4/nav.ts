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
 * THE TITLES ARE THE REGISTRY'S, NOT OURS. There was briefly an override map here that
 * shortened them for the sidebar — "Animals" for Animal Population, "Lab" for Lab
 * Requests, "Natality" for Birth Analytics. It read well and it was wrong: the module
 * you click and the page you land on then say different things, and two names for one
 * module is how a reader stops trusting that two screens are showing the same figure.
 * `titleOf` survives as the single place any future exception would go.
 */

import { Boxes, Settings, type LucideIcon } from 'lucide-react'
import { execPages } from '../exec/pages'

export const titleOf = (slug: string): string => execPages[slug]?.title ?? slug

export interface NavItem {
  slug: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  name: string
  items: NavItem[]
}

/**
 * The nine the brief lists in the sidebar, in the order it lists them: Animals,
 * Health, Birth, Mortality, Transfers, Vaccination, Pharmacy, Lab, Approvals. Home and
 * Settings are not modules and are placed by the sidebar itself, above and below.
 *
 * Everything else the product has follows in a second group rather than being hidden —
 * a module that exists and cannot be reached is worse than a longer list.
 */
const PRIMARY = [
  'animals',
  'health',
  'births',
  'mortality',
  'transfers',
  'vaccination',
  'pharmacy',
  'lab',
  'approvals',
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
 * The entity index — the way in that is not a module.
 *
 * Placed beside Home rather than inside the module groups, because it is not a module: it is the
 * other axis the product is organised on. A director looking for "the quarantine block" should not
 * have to work out which module mentions it.
 */
export const EVERYTHING: NavItem = { slug: 'entities', label: 'Everything', icon: Boxes }

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
