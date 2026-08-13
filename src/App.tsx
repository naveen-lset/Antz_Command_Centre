/**
 * V4 — the app, and the router.
 *
 * THREE ROUTE FAMILIES, not one. Modules (`#/mortality`) are questions. Entities
 * (`#/e/animal/ANM-AQ03-00142`) are things. The browser (`#/browse/species`) is the index of
 * things. Sheets remain a fourth layer that is deliberately NOT a route — a look at something,
 * dismissed with one gesture, costing no navigation.
 *
 * The entity family is the structural change. The product was module-centric: every screen was
 * a question, and the sites and species inside the answers were text. "What is going on in
 * Aquatic Halls" had no destination. Now it has a URL, and every module is a way into it.
 *
 * ONE SCOPE, ABOVE THE ROUTER. `ScopeProvider` wraps everything and reads from the URL, so the
 * window and the site survive navigation and can be shared in a link. This is where the old
 * arrangement went wrong most visibly: `PeriodProvider` was nested *inside* the router and
 * re-keyed per route, so the date filter reset on every module change. There is now exactly one
 * scope, and no page can shadow it.
 *
 * ONE HEADER, RENDERED HERE. Breadcrumbs, title, scope indicator and last-updated come from
 * `ScopeHeader` for every module, record and entity page. A page cannot omit it or render a
 * different one, which is the only way "show the scope on every page" survives the next page
 * somebody adds.
 *
 * TWO LAYOUTS, NOT ONE STRETCHED BETWEEN THEM. Below 768 the app is a phone app: one column,
 * modules as pages with a back chevron, sheets rising from the bottom. At 768 it is the shell —
 * permanent sidebar, modules in place, sheets from the right. One number decides, used by the
 * shell and the sheet alike.
 *
 * There used to be a third column at 1280 carrying the weather, the decision queues, the risk
 * list and a recent-activity feed. It has been removed, so the content column keeps the full
 * width beside the sidebar at every tier above 768.
 */

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { HomeView } from './v4/Home'
import { AppShell, ModulePane, PhoneFrame } from './v4/Shell'
import { Boundary } from './v4/Boundary'
import { SheetProvider } from './v4/sheet'
import { DrillProvider, useDrill } from './v4/drillNav'
import { ScopeHeader } from './v4/ScopeHeader'
import { ScopeProvider, useScope } from './v4/scope'
import { EntityBrowser, EntityIndex, EntityPage } from './v4/entity'
import { titleOf } from './v4/nav'
import { SubModules } from './v4/SubModules'
import { KIND_ONE, resolve, type EntityKind } from './core/entities'
import { parseEntityRoute } from './core/scope'
import { findExecPage } from './exec/pages'
import { RecordsView, findRecordPage } from './exec/records'
import { useMediaQuery } from './hooks/useMediaQuery'

/* ── routing ─────────────────────────────────────────────────────────────── */

type Route =
  | { kind: 'home' }
  | { kind: 'module'; slug: string }
  | { kind: 'record'; slug: string }
  | { kind: 'entity'; ref: { kind: EntityKind; id: string } }
  | { kind: 'browse'; entity: EntityKind }
  | { kind: 'entities' }
  | { kind: 'missing'; path: string }

const ENTITY_KINDS = new Set<string>([
  'site', 'species', 'animal', 'enclosure', 'hospital', 'ward', 'lab',
  'labdept', 'pharmacy', 'medicine', 'nursery', 'incubator', 'department', 'user',
])

/**
 * Resolve a path to a route, most specific first.
 *
 * Order matters: `entities` before `entity` so the bare index is not read as a malformed entity
 * reference, and modules before entities because a module slug is a single segment and could
 * otherwise collide with a kind name.
 */
function resolveRoute(path: string): Route {
  if (!path) return { kind: 'home' }
  if (path === 'entities') return { kind: 'entities' }

  const browse = /^browse\/([a-z]+)$/.exec(path)
  if (browse && ENTITY_KINDS.has(browse[1])) return { kind: 'browse', entity: browse[1] as EntityKind }

  if (path.startsWith('e/')) {
    const ref = parseEntityRoute(`#/${path}`)
    return ref ? { kind: 'entity', ref } : { kind: 'missing', path }
  }

  if (findExecPage(path)) return { kind: 'module', slug: path }
  if (findRecordPage(path)) return { kind: 'record', slug: path }
  return { kind: 'missing', path }
}

/* ── the page under the header ───────────────────────────────────────────── */

interface Framed {
  title: string
  eyebrow?: string
  /** Inserted into the breadcrumb between the site and the entity trail. */
  moduleTitle?: string
  /** Present where there is one level up. Absent on a module at shell width. */
  onBack?: () => void
  body: ReactNode
  /** The entity being viewed, so the header can build its trail. */
  entity?: { kind: EntityKind; id: string }
}

function useFramed(route: Route, phone: boolean, home: () => void): Framed {
  const { go } = useScope()
  const { origin } = useDrill()

  return useMemo(() => {
    switch (route.kind) {
      case 'module': {
        const page = findExecPage(route.slug)!
        return {
          /* NO EYEBROW ON A MODULE PAGE. It used to print "Monthly report" or "Operations"
             above the title — a classification of the page rather than information about it,
             and one the reader has no use for: nobody arrives at Animal Population needing to
             be told which track it belongs to, and the word "monthly" actively misleads once
             the date filter is on a week. Record and entity pages keep their eyebrow, because
             theirs names the parent or the kind, which is a fact about the thing on screen. */
          title: titleOf(route.slug),
          moduleTitle: titleOf(route.slug),
          /* THE CHEVRON IS ON EVERY TIER NOW, not just the phone. It was hidden at shell width
             on the reasoning that the sidebar shows where you are — true, but the sidebar cannot
             say where you came FROM, and a reader who reached this page from a KPI or a drill had
             no way back but the browser. */
          onBack: home,
          /* The module, then its chapters. `SubModules` renders nothing for a module that
             has none, and it is here rather than in the pages so that folding a page into
             a parent in `nav.ts` is the only edit that folding it ever needs — see the note
             in that file about pages that become unreachable. */
          body: (
            <>
              <page.Page />
              <SubModules slug={route.slug} />
            </>
          ),
        }
      }

      case 'record': {
        const page = findRecordPage(route.slug)!
        return {
          /* No eyebrow here either, for a plainer reason than on a module: it printed the
             parent module's name, and the breadcrumb one row above it already ends on that
             exact word. Two copies of "Mortality" stacked over "Mortality Records". */
          title: page.title,
          moduleTitle: page.parentTitle,
          /* `{ back: true }` on every one of these. It does not change where the chevron
             goes — that is still the computed parent rather than the previous history
             entry — only which half of the page transition plays, so climbing out of a
             record reads as climbing out rather than as opening the module afresh. */
          onBack: () => go(page.parent, { back: true }),
          body: <RecordsView page={page} />,
        }
      }

      case 'entity': {
        const entity = resolve(route.ref.kind, route.ref.id)
        /* WHERE THE READER CAME FROM, when they came from a drill and are still on the
           page that drill led to. `forPath` is what keeps it honest: navigate on to a
           second entity and the trail is the new page's own lineage again rather than a
           crumb inherited from a popup two pages back. The brief's §17 — subtle, and
           only where there is something true to say. */
        const from = origin && origin.forPath === `e/${route.ref.kind}/${encodeURIComponent(route.ref.id)}` ? origin : null
        return {
          title: entity?.name ?? route.ref.id,
          eyebrow: KIND_ONE[route.ref.kind],
          moduleTitle: from ? [titleOf(from.module), from.label].filter(Boolean).join(' › ') : undefined,
          /* One step up the lineage, which is the entity's own parent rather than wherever the
             reader happened to arrive from — so the back button is the same from a search hit,
             a module row and a pasted link. */
          onBack: entity?.parent
            ? () => go(`e/${entity.parent!.kind}/${encodeURIComponent(entity.parent!.id)}`, { back: true })
            : phone
              ? home
              : undefined,
          body: <EntityPage ref={route.ref} />,
          entity: route.ref,
        }
      }

      case 'browse':
        return {
          title: KIND_ONE[route.entity],
          eyebrow: 'Browse',
          onBack: () => go('entities', { back: true }),
          body: <EntityBrowser kind={route.entity} />,
        }

      case 'entities':
        return {
          title: 'Everything',
          eyebrow: 'Entities',
          onBack: phone ? home : undefined,
          body: <EntityIndex />,
        }

      default:
        return {
          title: 'Not found',
          eyebrow: 'Route',
          onBack: home,
          body: <Missing path={route.kind === 'missing' ? route.path : ''} />,
        }
    }
  }, [route, phone, home, go, origin])
}

function Missing({ path }: { path: string }) {
  return (
    <div className="px-[var(--gutter)] pt-2">
      <div className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <p className="text-small text-[#3d3a34]">
          Nothing is routed at <span className="tabular-nums">#/{path}</span>.
        </p>
        <a href="#/" className="mt-3 inline-block text-small font-semibold text-[#1a6b40]">
          Back to the command centre
        </a>
      </div>
    </div>
  )
}

/* ── the app ─────────────────────────────────────────────────────────────── */

export default function App() {
  return (
    <ScopeProvider>
      {/* OUTSIDE the sheet, and that is load-bearing. `SheetProvider` renders its host as a
          SIBLING of `children`, so a provider nested inside it does not enclose the popup —
          every panel rendered in the popup would read the default context and its drill
          would be a silent no-op. Out here, the host is within scope. `drillNav` therefore
          reads the popup's depth from history state rather than from `useSheet`, which is
          what lets it sit above the sheet instead of inside it. */}
      <DrillProvider>
        <SheetProvider>
          <Router />
        </SheetProvider>
      </DrillProvider>
    </ScopeProvider>
  )
}

function Router() {
  const { path, go } = useScope()
  const route = useMemo(() => resolveRoute(path), [path])
  const atHome = route.kind === 'home'

  const shell = useMediaQuery('(min-width: 768px)')
  const phone = !shell

  /* The home the back chevron returns to. Recorded during render rather than in an effect,
     because an effect lands a render late and the chevron would point at the previous page. */
  const lastHome = useRef('')
  if (atHome) lastHome.current = path
  /* The home is always a step OUT of wherever you are, so it takes the back half of
     the page transition — the home grows back from 0.98 rather than rising from below. */
  const home = useMemo(() => () => go(lastHome.current, { back: true }), [go])

  /* Every page starts at the top of the window. Without this, opening Vaccination from halfway
     down the home leaves you halfway down Vaccination. Keyed on the path rather than the route
     object so changing only the window does not scroll the reader away from what they were
     reading. */
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [path])

  const framed = useFramed(route, phone, home)

  const content = atHome ? (
    <HomeView />
  ) : (
    /* Keyed on the path so moving between pages replays the entrance and hands the
       reveal-on-scroll observers a fresh element — without it, the numbers swap under a page
       that never announced it had changed. Not keyed on the scope, so changing the window
       re-reads the figures in place instead of re-animating the whole page. */
    <ModulePane key={path}>
      <ScopeHeader
        title={framed.title}
        eyebrow={framed.eyebrow}
        moduleTitle={framed.moduleTitle}
        entity={framed.entity}
        onBack={framed.onBack}
      />
      <Boundary key={`${path}-body`} title={framed.title}>
        {framed.body}
      </Boundary>
    </ModulePane>
  )

  return shell ? (
    <AppShell route={`#/${path}`}>
      {content}
    </AppShell>
  ) : (
    <PhoneFrame home={atHome}>{content}</PhoneFrame>
  )
}

