/**
 * ONE TAP, TWO DESTINATIONS — a sheet on a phone, a page above it.
 *
 * The brief is explicit for Critical Attention: "Tap ↓ Bottom Sheet (Phone) ↓ Detail
 * Page (Tablet/Desktop)". Everywhere else a tap opens a sheet at every width, and that
 * is right — a peek at a KPI is a peek. But a critical alert is not a peek. It is the
 * thing you stop and work on, it often ends in a phone call, and on a tablet propped on
 * a desk it deserves the whole column rather than a 440px panel with the home behind
 * it. On a phone there is no second column to give it, so the sheet stays.
 *
 * The route is real (`#/attention/<key>`), so a detail page can be linked, reloaded and
 * shared. The sheet is not, because it never was.
 *
 * The two destinations render the SAME body. If they diverged, the phone and the desk
 * would be looking at different things under one name, which is the failure this whole
 * file exists to avoid.
 */

import { useMediaQuery } from '../hooks/useMediaQuery'
import { criticalAlerts, type CriticalAlert } from './data'
import { useSheet, type SheetSpec } from './sheet'

/** Route prefix for the attention detail pages. */
export const ATTENTION = 'attention'

export const findAttentionPage = (slug: string): CriticalAlert | undefined =>
  slug.startsWith(`${ATTENTION}/`)
    ? criticalAlerts.find((a) => a.key === slug.slice(ATTENTION.length + 1))
    : undefined

/**
 * Open something as a sheet, or navigate to it as a page — decided by width, not by
 * the caller. A caller that omits `href` always gets the sheet, which keeps the
 * default behaviour of every other surface unchanged.
 */
export function useOpenDetail() {
  const { open } = useSheet()
  const asPage = useMediaQuery('(min-width: 768px)')

  return (spec: SheetSpec & { href?: string }) => {
    if (asPage && spec.href) {
      window.location.hash = spec.href
      return
    }
    open(spec)
  }
}
