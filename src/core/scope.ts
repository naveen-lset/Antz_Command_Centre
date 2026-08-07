/**
 * SCOPE — the one answer to "what am I looking at".
 *
 * The requirement is blunt about this: a user should never have to question which data they
 * are viewing, and no screen may mix Overall figures into a Site view. That is a data
 * problem (solved by `series.ts` and `query.ts`, where every figure is a function of the
 * scope) and a *labelling* problem, which is this file.
 *
 * A scope is three things and nothing else: a site or the whole collection, a window, and
 * optionally the entity being looked at. Everything a header needs to say — "Overall ·
 * July 2025", "Aquatic Halls · Last 7 days", "Aquatic Halls › Common Carp › Leo" — is
 * derived from those three, so a page cannot label itself one way and read its data
 * another. Pages state the scope by rendering it, not by describing it.
 *
 * THE ENTITY PATH IS DERIVED FROM THE ENTITY, not accumulated as the reader navigates. A
 * trail built up by each screen pushing a crumb is a trail that is wrong the moment
 * someone arrives from a search, a URL or an alert. Walking `parent` gives the same answer
 * from every direction.
 */

import { type Win } from './calendar'
import { lineage, resolve, type Entity, type Ref } from './entities'
import { siteOf, type Site } from './world'

export interface Scope {
  /** `null` is the whole collection, and is the default. */
  site: Site | null
  win: Win
  /** The entity page or drill level currently open, if any. */
  entity?: Ref
}

/** The scope as a data query — what `query.ts` and `series.ts` actually take. */
export const siteKeyOf = (scope: Scope): string | null => scope.site?.key ?? null

/** "Overall" or the site's name. The first segment of every scope label. */
export const placeLabel = (scope: Scope): string => scope.site?.name ?? 'Overall'

/**
 * The entity trail below the place, as names.
 *
 * The site link is dropped when it merely repeats the place: scoped to Aquatic Halls and
 * viewing a carp, the label is "Aquatic Halls › Common Carp", not "Aquatic Halls › Aquatic
 * Halls › Common Carp".
 */
export function entityTrail(scope: Scope): Entity[] {
  if (!scope.entity) return []
  const chain = lineage(scope.entity)
  return chain.filter((e, i) => !(i === 0 && e.kind === 'site' && e.id === scope.site?.key))
}

/**
 * The full scope indicator: place, entity trail, then the window.
 *
 * The window is separated by a middle dot rather than another chevron, because it is not
 * another level of the hierarchy — "Aquatic Halls › Common Carp" narrows *what*, and
 * "July 2025" narrows *when*, and running them together with the same separator invites
 * the reader to think July is inside Common Carp.
 */
export function scopeLabel(scope: Scope, withWindow = true): string {
  const parts = [placeLabel(scope), ...entityTrail(scope).map((e) => e.name)]
  const where = parts.join(' › ')
  return withWindow ? `${where} · ${scope.win.window}` : where
}

/** Shorter form for a dense slot — place and window only. */
export const shortScope = (scope: Scope): string => `${placeLabel(scope)} · ${scope.win.window}`

export interface Crumb {
  label: string
  /** Absent on the last crumb — you are already there. */
  href?: string
}

/**
 * Breadcrumbs for the page header.
 *
 * Always begins at the collection, because "Overall" is a real place a reader can return
 * to and the first crumb is the shortest way back to it. Entity crumbs link to their own
 * entity route, so any level of a drill is a URL someone can send to a colleague.
 */
export function crumbs(scope: Scope, moduleTitle?: string): Crumb[] {
  const out: Crumb[] = [{ label: 'Overall', href: '#/' }]

  if (scope.site) out.push({ label: scope.site.name, href: `#/e/site/${scope.site.key}` })
  if (moduleTitle) out.push({ label: moduleTitle })

  for (const e of entityTrail(scope)) out.push({ label: e.name, href: `#/e/${e.kind}/${e.id}` })

  /* The reader is standing on the last crumb, so it is not a link. */
  const last = out[out.length - 1]
  if (last) delete last.href
  return out
}

/** The route for an entity — the single place the URL shape is decided. */
export const entityHref = (ref: Ref): string => `#/e/${ref.kind}/${encodeURIComponent(ref.id)}`

/** Parse `#/e/<kind>/<id>` back into a ref. Returns undefined for anything else. */
export function parseEntityRoute(route: string): Ref | undefined {
  const m = /^#\/e\/([a-z]+)\/(.+)$/.exec(route)
  if (!m) return undefined
  const ref = { kind: m[1] as Ref['kind'], id: decodeURIComponent(m[2]) }
  return resolve(ref.kind, ref.id) ? ref : undefined
}

/** Whether an entity is inside the site scope in force — used to warn about a contradiction. */
export function withinScope(scope: Scope, ref: Ref): boolean {
  if (!scope.site) return true
  const e = resolve(ref.kind, ref.id)
  /* An entity with no site of its own — a medicine, a department — belongs to all of them. */
  if (!e || e.siteKey === null || e.siteKey === undefined) return true
  return e.siteKey === scope.site.key
}

/** The site an entity implies, for offering to follow it. */
export function siteFor(ref: Ref): Site | undefined {
  const e = resolve(ref.kind, ref.id)
  return e?.siteKey ? siteOf(e.siteKey) : undefined
}
