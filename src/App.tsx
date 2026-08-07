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
 * permanent sidebar, modules in place, sheets from the right — and at 1280 a third column
 * appears. One number decides, used by the shell and the sheet alike.
 */

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { HomeView } from './v4/Home'
import { AppShell, ModulePane, PhoneFrame } from './v4/Shell'
import { Boundary } from './v4/Boundary'
import { SheetProvider } from './v4/sheet'
import { ScopeHeader } from './v4/ScopeHeader'
import { ScopeProvider, useScope } from './v4/scope'
import { EntityBrowser, EntityIndex, EntityPage } from './v4/entity'
import { titleOf } from './v4/nav'
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

  return useMemo(() => {
    switch (route.kind) {
      case 'module': {
        const page = findExecPage(route.slug)!
        return {
          title: titleOf(route.slug),
          eyebrow: page.ops ? 'Operations' : 'Monthly report',
          moduleTitle: titleOf(route.slug),
          onBack: phone ? home : undefined,
          body: <page.Page />,
        }
      }

      case 'record': {
        const page = findRecordPage(route.slug)!
        return {
          title: page.title,
          eyebrow: page.parentTitle,
          moduleTitle: page.parentTitle,
          onBack: () => go(page.parent),
          body: <RecordsView page={page} />,
        }
      }

      case 'entity': {
        const entity = resolve(route.ref.kind, route.ref.id)
        return {
          title: entity?.name ?? route.ref.id,
          eyebrow: KIND_ONE[route.ref.kind],
          /* One step up the lineage, which is the entity's own parent rather than wherever the
             reader happened to arrive from — so the back button is the same from a search hit,
             a module row and a pasted link. */
          onBack: entity?.parent
            ? () => go(`e/${entity.parent!.kind}/${encodeURIComponent(entity.parent!.id)}`)
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
          onBack: () => go('entities'),
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
  }, [route, phone, home, go])
}

function Missing({ path }: { path: string }) {
  return (
    <div className="px-[var(--gutter-lg)] pt-2">
      <div className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <p className="text-[13.5px] text-[#3d3a34]">
          Nothing is routed at <span className="tabular-nums">#/{path}</span>.
        </p>
        <a href="#/" className="mt-3 inline-block text-[13px] font-semibold text-[#1a6b40]">
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
      <SheetProvider>
        <Router />
      </SheetProvider>
    </ScopeProvider>
  )
}

function Router() {
  const { path, go } = useScope()
  const route = useMemo(() => resolveRoute(path), [path])
  const atHome = route.kind === 'home'

  const shell = useMediaQuery('(min-width: 768px)')
  const panel = useMediaQuery('(min-width: 1280px)')
  const phone = !shell

  /* The home the back chevron returns to. Recorded during render rather than in an effect,
     because an effect lands a render late and the chevron would point at the previous page. */
  const lastHome = useRef('')
  if (atHome) lastHome.current = path
  const home = useMemo(() => () => go(lastHome.current), [go])

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
    <AppShell route={`#/${path}`} panel={panel}>
      {content}
    </AppShell>
  ) : (
    <PhoneFrame>{content}</PhoneFrame>
  )
}

