/**
 * THE DRILL-DOWN NAVIGATION — where a popup stops and a page begins.
 *
 * Named `drillNav` rather than `drill` because `drill.ts` beside it is already taken, and
 * by a different concern: that file is the DATA adapter (Overall → Site → Species →
 * Animal, forwarding to `core/query.ts`), this one is where a selection GOES. Two files
 * called `drill` in one directory is an ambiguous specifier, so the distinction is in the
 * filename rather than in a comment nobody reads before importing.
 *
 * The drill-down brief draws one line through the whole product: a popup is a SELECTOR,
 * a page is the DESTINATION. "What exactly did I click, and what can I select from
 * here?" is the popup's question; "tell me everything about the thing I selected" is the
 * page's. So picking a species, a site or an animal inside a popup does not open another
 * popup on top of it — it closes the popup and navigates to that entity's own page.
 *
 * THIS REVERSES AN EARLIER DECISION, DELIBERATELY. `sheet.tsx` was built to swap its
 * CONTENT rather than stack panels, and to walk CITES → Site → Species → Animal without
 * a second screen existing. That was the right call when it was made, because no such
 * screen existed. `entity.tsx` since gave every site, species and animal a real URL with
 * its own lineage, so the sheet is no longer the only place a species can be read — and
 * a selector that can also be a destination is the thing that makes a reader unsure
 * which one they are looking at. Intermediate EXPLORATION still happens inside the one
 * popup (search, filters, narrowing by site); only SELECTION leaves it.
 *
 * WHY THE HISTORY IS UNWOUND BEFORE THE NAVIGATION, and not after.
 *
 * Each popup level pushes a history entry (see `sheet.tsx`), so a reader two levels deep
 * who selects a species sits on `[…, animals, sheet¹, sheet²]`. Navigating from there
 * would append the species page to that, and the back button out of it would land on
 * `sheet²` — a dead entry whose popup the hashchange has already closed, so Back would
 * appear to do nothing, twice, before reaching the page they came from.
 *
 * So the sheet's own entries are wound off first and the navigation happens once the
 * `popstate` for that has landed, leaving `[…, animals, species]`. Back out of the
 * details page returns to the page the drill started on, which is what the brief's §16
 * asks for and what a reader assumes without being told.
 *
 * `history.go(-n)` is asynchronous and fires exactly one `popstate` however many entries
 * it covers, which is why this waits for the event rather than counting frames.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Ref } from '../core/entities'
import { useScope } from './scope'

/**
 * Where a details page was reached FROM, for the breadcrumb the brief's §17 asks for.
 *
 * Held in memory rather than in the URL because `go()` rebuilds the query string from
 * the scope filters alone — an extra param would be dropped on the next window change,
 * and `from`/`to` are already taken by the custom date range. A reader who reloads a
 * details page gets the entity's own lineage instead, which is the honest fallback: the
 * trail says where they came from, and after a reload nobody came from anywhere.
 */
export interface DrillOrigin {
  /** The route the drill started on — `'animals'`. */
  module: string
  /** The popup's own context — `'Births · 12 May 2026'`, `'CITES Appendix II'`. */
  label?: string
  /** The entity path this origin belongs to, so it applies to one page and not the next. */
  forPath: string
}

interface DrillApi {
  /** Close whatever popup is open and navigate to an entity's page. */
  drillTo: (ref: Ref, origin?: { module: string; label?: string }) => void
  /** The origin of the page currently on screen, if it was reached by a drill. */
  origin: DrillOrigin | null
}

const Ctx = createContext<DrillApi>({ drillTo: () => {}, origin: null })

export const useDrill = () => useContext(Ctx)

const pathOf = (ref: Ref) => `e/${ref.kind}/${encodeURIComponent(ref.id)}`

export function DrillProvider({ children }: { children: ReactNode }) {
  const { go } = useScope()
  const [origin, setOrigin] = useState<DrillOrigin | null>(null)

  const drillTo = useCallback<DrillApi['drillTo']>(
    (ref, from) => {
      const path = pathOf(ref)
      setOrigin(from ? { ...from, forPath: path } : null)

      /**
       * HOW DEEP THE POPUP IS, READ FROM HISTORY RATHER THAN FROM `useSheet`.
       *
       * This provider sits ABOVE `SheetProvider` — it has to, because the sheet renders
       * its host as a sibling of its children and a drill handler inside the popup would
       * otherwise fall through to the no-op default. So it cannot call `useSheet`.
       *
       * It does not need to. Each popup level stamps its own depth onto the history
       * entry as `antzSheet`, and the sheet's own `popstate` handler treats that stamp
       * as the source of truth rather than any counter it keeps — so reading the same
       * stamp here is reading the same fact from the same place, not a second guess at
       * it. Nothing to keep in sync, and it is correct on the frame of the click.
       */
      const levels = (window.history.state?.antzSheet as number | undefined) ?? 0
      if (!levels) {
        go(path)
        return
      }
      const onPop = () => {
        window.removeEventListener('popstate', onPop)
        go(path)
      }
      window.addEventListener('popstate', onPop)
      window.history.go(-levels)
    },
    [go],
  )

  return <Ctx.Provider value={useMemo(() => ({ drillTo, origin }), [drillTo, origin])}>{children}</Ctx.Provider>
}
