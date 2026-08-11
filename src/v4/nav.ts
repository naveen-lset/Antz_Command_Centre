/**
 * The V4 module list.
 *
 * Derived from `execPages` — the page registry already carries every module's title,
 * icon, search keywords and report/operations flag, and a second hand-written list is
 * a second chance for the sidebar and the search results to disagree.
 *
 * TWENTY-TWO ROWS WAS THE PROBLEM. Every page the product has had its own line in the rail,
 * which put "Eggs Discarded" at the same level as "Animal Population" and made finding
 * Vaccination a scan of a list that did not fit on a tablet without scrolling. Length is not
 * the only cost: a flat list of twenty-two says these are twenty-two equally important
 * places, and they are not. Nor were the two groups it sat in enough — "Modules" held the
 * hospital and the vaccination programme side by side, which are different work.
 *
 * SO THE RAIL IS A TREE NOW, TWO DEEP. Nine modules and seven operations pages stay on the
 * rail; the seven pages that are a chapter of another module become its children, shown
 * indented under it while you are inside it and hidden while you are not. Nothing is
 * removed, nothing loses its route, and no page becomes unreachable — search still matches
 * every one of them, a child's parent lights up while you are on it, and the router itself
 * renders the child list at the foot of every parent page, so the phone (which has no rail
 * at all) reaches them the same way.
 *
 *   Animal Population   → Accession
 *   Health & Medical    → Disease & Outbreak
 *   Birth Analytics     → Fetal Death
 *   Eggs & Incubation   → Eggs Discarded
 *   Preventive Medication → Vaccination, Deworming
 *
 * The preventive one is the clearest case of the general rule: Vaccination and Deworming are
 * two of the three programmes that module IS, so listing all three side by side asked the
 * reader to guess which one held the vaccination figure.
 *
 * THE TITLES ARE THE REGISTRY'S, NOT OURS. There was briefly an override map here that
 * shortened them for the sidebar — "Animals" for Animal Population, "Lab" for Lab Requests,
 * "Natality" for Birth Analytics. It read well and it was wrong: the module you click and
 * the page you land on then say different things, and two names for one module is how a
 * reader stops trusting that two screens are showing the same figure.
 * `titleOf` survives as the single place any future exception would go.
 */

import { Boxes, Settings, type LucideIcon } from 'lucide-react'
import { execPages } from '../exec/pages'

export const titleOf = (slug: string): string => execPages[slug]?.title ?? slug

export interface NavItem {
  slug: string
  label: string
  icon: LucideIcon
  /** Pages that are a chapter of this one. Shown under it, never beside it. */
  children?: NavItem[]
}

export interface NavGroup {
  name: string
  items: NavItem[]
}

/**
 * The rail, declared as the tree it is.
 *
 * FOUR GROUPS, AND THE MEDICAL / PREVENTIVE SPLIT IS THE LOAD-BEARING ONE. They are two
 * different kinds of veterinary work and they were sitting in one undifferentiated list:
 *
 *   MEDICAL          is hospital-based — an animal is admitted, treated, dispensed to,
 *                    sampled, discharged. It is reactive, it is per-case, and its figures
 *                    are caseloads and outcomes.
 *   PREVENTIVE CARE  is programme-based — vaccination, deworming, supplements, given to a
 *                    herd on a schedule whether or not anything is wrong. Its figures are
 *                    coverage and what is overdue.
 *
 * Nothing in a caseload answers "how many boosters are late", and nothing in a coverage rate
 * answers "how many animals are in the hospital tonight" — so a reader looking for one of
 * them should never have to scan past the other. COLLECTION is the animals themselves and
 * the events that change their number; OPERATIONS is the queues that need working today.
 *
 * The split is by what a director does, not by which track a page belongs to. V3 split Report
 * from Operations, which is the right split for assembling a board pack and the wrong one for
 * finding Vaccination: "is this a monthly figure" is not a question anyone asks on the way to
 * a page.
 */
const TREE: { name: string; items: { slug: string; children?: string[] }[] }[] = [
  {
    name: 'Collection',
    items: [
      { slug: 'animals' },
      /* ACCESSION IS ITS OWN ROW, not a chapter of Animal Population.
         It was folded under it on the reasoning that an accession is a headcount movement and
         the movements belong with the count. In use it reads differently: registering an
         arrival is a job somebody goes and does, and a job you go and do should be a
         destination in the rail rather than something you find by first opening a report and
         scrolling to the bottom of it. Fetal death and Discarded eggs stay folded — those are
         readings ABOUT the page above them, not tasks of their own. */
      { slug: 'accession' },
      { slug: 'births', children: ['fetal'] },
      { slug: 'eggs', children: ['discarded'] },
      { slug: 'mortality' },
      { slug: 'transfers' },
      { slug: 'trends' },
    ],
  },
  {
    /* Hospital-based. Disease & Outbreak is folded under Health & Medical rather than given
       its own row: an outbreak is a clinical finding about the caseload, not a separate
       place to go and look. */
    name: 'Medical',
    items: [
      { slug: 'health', children: ['disease'] },
      { slug: 'pharmacy' },
      { slug: 'lab' },
    ],
  },
  {
    /* One row, and that is the point of the module — vaccination, deworming and supplements
       are the three programmes it IS, so they sit inside it rather than beside it. The
       heading names the domain; the row is the page that answers for all three. */
    name: 'Preventive care',
    items: [{ slug: 'preventive', children: ['vaccination', 'deworming'] }],
  },
  {
    name: 'Operations',
    items: [
      { slug: 'approvals' },
      { slug: 'tasks' },
      { slug: 'alerts' },
      { slug: 'welfare' },
      { slug: 'attendance' },
      { slug: 'users' },
    ],
  },
]

const toItem = (slug: string, children?: string[]): NavItem | undefined => {
  const page = execPages[slug]
  if (!page) return undefined
  const kids = (children ?? []).map((c) => toItem(c)).filter((i): i is NavItem => Boolean(i))
  return { slug, label: titleOf(slug), icon: page.icon, ...(kids.length ? { children: kids } : {}) }
}

export const navGroups: NavGroup[] = TREE.map((g) => ({
  name: g.name,
  items: g.items.map((i) => toItem(i.slug, i.children)).filter((i): i is NavItem => Boolean(i)),
}))

/**
 * Any page the tree does not place, appended rather than dropped.
 *
 * A registry entry with no home in the tree is a bug in the tree, and the honest failure
 * mode is an extra row in the rail — not a page nobody can reach. If this group ever renders,
 * the fix is to place the page in `TREE` above.
 */
const placed = new Set(navGroups.flatMap((g) => g.items.flatMap((i) => [i.slug, ...(i.children ?? []).map((c) => c.slug)])))
const unplaced = Object.keys(execPages).filter((slug) => !placed.has(slug))
if (unplaced.length > 0) {
  navGroups.push({
    name: 'Other',
    items: unplaced.map((s) => toItem(s)).filter((i): i is NavItem => Boolean(i)),
  })
}

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
export const activeSlug = (route: string): string => route.replace(/^#\//, '').split('/')[0].split('?')[0]

/** The parent of a folded-in page, if it has one. */
export function parentOf(slug: string): string | undefined {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.children?.some((c) => c.slug === slug)) return item.slug
    }
  }
  return undefined
}

/** The children of a module, for the rail and for the list the router prints under the page. */
export function childrenOf(slug: string): NavItem[] {
  for (const group of navGroups) {
    for (const item of group.items) if (item.slug === slug) return item.children ?? []
  }
  return []
}

/** The TOP-LEVEL row a route belongs to — a child route lights its parent. */
export const activeTop = (route: string): string => {
  const slug = activeSlug(route)
  return parentOf(slug) ?? slug
}

const matches = (item: NavItem, q: string): boolean =>
  item.label.toLowerCase().includes(q) || (execPages[item.slug]?.keywords ?? []).some((k) => k.includes(q))

/**
 * Search over the whole tree, flattened.
 *
 * A CHILD THAT MATCHES IS RETURNED AS A ROW OF ITS OWN, not as a branch under a parent that
 * did not match. Typing "deworming" must produce Deworming — folding it under Preventive
 * Medication would make the reader open a module to find the thing they had already named,
 * which is the failure that hiding a page in a tree normally causes.
 */
export const filterNav = (query: string): NavGroup[] => {
  const q = query.trim().toLowerCase()
  if (!q) return navGroups
  return navGroups
    .map((g) => ({
      ...g,
      items: g.items.flatMap((item) => {
        const kids = (item.children ?? []).filter((c) => matches(c, q))
        if (matches(item, q)) return [{ ...item, children: kids.length ? kids : item.children }]
        return kids
      }),
    }))
    .filter((g) => g.items.length > 0)
}
