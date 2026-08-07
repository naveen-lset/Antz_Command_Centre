/**
 * THE GLOBAL SCOPE — one window, one site, one search, for the whole application.
 *
 * WHAT WAS WRONG BEFORE. The window lived in a `PeriodProvider` that `App` re-keyed on every
 * route (`<PeriodProvider key={slug}>`), so choosing "Last 7 days" on Mortality and then
 * clicking Vaccination silently put you back on "This month". A filter that resets when you
 * navigate is not a global filter; it is a per-page control that looks like one. The site
 * filter did persist, but only because it happened to sit above the re-keyed provider —
 * nothing in the design said so, and nothing stopped the next provider from being nested
 * the other way.
 *
 * THE SCOPE LIVES IN THE URL, and that is the part that matters beyond the bug. `#/mortality
 * ?w=last7&s=aquatic` is the whole state of what the reader is looking at, which buys three
 * things at once: the filters survive navigation because they are not owned by any page,
 * the back button steps through scopes as well as routes, and a director can send a
 * colleague the exact figure they are questioning instead of describing how to reach it.
 *
 * LINKS DO NOT HAVE TO CARRY THE FILTERS. There are a hundred plain `href="#/mortality"`
 * anchors in this codebase and rewriting every one to append the current scope would be a
 * hundred chances to forget. Instead, when a hash arrives with no filter params, the
 * provider re-stamps them with `replaceState` — no history entry, no reload, and no way for
 * an ordinary link to drop the scope. Explicit params in a URL always win, so a shared link
 * still opens on the scope it was shared with.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_WINDOW,
  MAX_INPUT,
  MIN_INPUT,
  WINDOWS,
  WORLD_TODAY,
  resolveWindow,
  toInput,
  type Win,
  type WindowKey,
} from '../core/calendar'
import type { Scope } from '../core/scope'
import { SITES, siteOf, type Site } from '../core/world'

/* ── the URL ─────────────────────────────────────────────────────────────── */

export interface RouteParts {
  /** `#/mortality/records` → `mortality/records`. Never carries the query. */
  path: string
  params: URLSearchParams
}

export function parseHash(hash: string): RouteParts {
  const raw = hash.replace(/^#\/?/, '')
  const q = raw.indexOf('?')
  return q === -1
    ? { path: raw, params: new URLSearchParams() }
    : { path: raw.slice(0, q), params: new URLSearchParams(raw.slice(q + 1)) }
}

const DEFAULT_CUSTOM = { from: toInput(new Date(WORLD_TODAY.getFullYear(), WORLD_TODAY.getMonth(), 1)), to: MAX_INPUT }

interface Filters {
  windowKey: WindowKey
  custom: { from: string; to: string }
  siteKey: string | null
}

const VALID = new Set<string>([...WINDOWS.map((w) => w.key), 'custom'])

function fromParams(params: URLSearchParams): Partial<Filters> {
  const out: Partial<Filters> = {}
  const w = params.get('w')
  if (w && VALID.has(w)) out.windowKey = w as WindowKey
  const site = params.get('s')
  if (site && siteOf(site)) out.siteKey = site
  else if (site === '') out.siteKey = null
  const from = params.get('from')
  const to = params.get('to')
  if (from && to) out.custom = { from, to }
  return out
}

/** The params a scope contributes to a URL. Defaults are omitted so links stay short. */
function toParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.windowKey !== DEFAULT_WINDOW) p.set('w', f.windowKey)
  if (f.windowKey === 'custom') {
    p.set('from', f.custom.from)
    p.set('to', f.custom.to)
  }
  if (f.siteKey) p.set('s', f.siteKey)
  return p
}

const buildHash = (path: string, f: Filters): string => {
  const q = toParams(f).toString()
  return `#/${path}${q ? `?${q}` : ''}`
}

/* ── the provider ────────────────────────────────────────────────────────── */

interface ScopeApi {
  /** What every query takes. The only thing a page should need. */
  scope: Scope
  /** The route, with the query already stripped. */
  path: string
  windowKey: WindowKey
  setWindow: (k: WindowKey) => void
  custom: { from: string; to: string }
  setCustom: (c: { from: string; to: string }) => void
  setSite: (s: Site | null) => void
  /** Navigate, keeping the scope. Prefer this to assigning `location.hash`. */
  go: (path: string) => void
  /** A link that carries the scope explicitly — for anchors, which cannot call `go`. */
  href: (path: string) => string
  /** Bounds for the date inputs. There is no data outside the ledger. */
  bounds: { min: string; max: string }
}

const Ctx = createContext<ScopeApi | undefined>(undefined)

export function useScope(): ScopeApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('useScope outside ScopeProvider')
  return api
}

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [hash, setHash] = useState(() => window.location.hash)

  /* Seed from the URL so a shared link opens on the scope it was shared with. */
  const [filters, setFilters] = useState<Filters>(() => ({
    windowKey: DEFAULT_WINDOW,
    custom: DEFAULT_CUSTOM,
    siteKey: null,
    ...fromParams(parseHash(window.location.hash).params),
  }))

  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const { path, params } = useMemo(() => parseHash(hash), [hash])

  /**
   * Reconcile the URL and the state after every hash change.
   *
   * Two directions, and the order is deliberate. If the URL carries filter params they win
   * — that is a shared link or a back-button step, and both are the reader stating a scope.
   * If it carries none, the current scope is stamped back on with `replaceState`, which is
   * what lets a bare `href="#/mortality"` keep the window the reader chose.
   */
  useEffect(() => {
    const incoming = fromParams(params)
    const hasAny = params.has('w') || params.has('s') || params.has('from')

    if (hasAny) {
      setFilters((f) => {
        const next = { ...f, ...incoming }
        /* `s` absent from a URL that carries `w` means "all sites", not "leave it alone" —
           otherwise clearing the site by editing the URL would be impossible. */
        if (!params.has('s')) next.siteKey = null
        return next.windowKey === f.windowKey && next.siteKey === f.siteKey && next.custom === f.custom
          ? f
          : next
      })
      return
    }

    const want = buildHash(path, filters)
    if (want !== `#/${path}` && window.location.hash !== want) {
      window.history.replaceState(window.history.state, '', want)
      setHash(want)
    }
  }, [params, path, filters])

  const write = useCallback(
    (next: Filters) => {
      setFilters(next)
      const want = buildHash(parseHash(window.location.hash).path, next)
      /* `replaceState` rather than a hash assignment: changing the window is not a
         navigation, and filling the back stack with every chip tap would make the back
         button useless for getting out of a module. */
      window.history.replaceState(window.history.state, '', want)
      setHash(want)
    },
    [],
  )

  const api = useMemo<ScopeApi>(() => {
    const win: Win = resolveWindow(filters.windowKey, filters.custom)
    const site = filters.siteKey ? (siteOf(filters.siteKey) ?? null) : null

    return {
      scope: { site, win },
      path,
      windowKey: filters.windowKey,
      custom: filters.custom,
      bounds: { min: MIN_INPUT, max: MAX_INPUT },
      setWindow: (k) => write({ ...filters, windowKey: k }),
      setCustom: (c) => write({ ...filters, windowKey: 'custom', custom: c }),
      setSite: (s) => write({ ...filters, siteKey: s?.key ?? null }),
      go: (to) => {
        window.location.hash = buildHash(to.replace(/^#\/?/, ''), filters)
      },
      href: (to) => buildHash(to.replace(/^#\/?/, ''), filters),
    }
  }, [filters, path, write])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/** Every site, for the site picker. Re-exported so pickers need one import. */
export { SITES }
