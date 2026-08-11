/**
 * EGGS & INCUBATION — not recorded in this system.
 *
 * This module was the most elaborate thing in the product that had nothing behind it. Its own
 * data layer opened by explaining that core already carried three real flow metrics — `eggs` set
 * down, `hatched`, `discarded`, "each asserted in core/checks.ts at 142 / 96 / 13 for the month"
 * — and that it therefore only needed to add survival and first-hatch-on-record on top. That was
 * true of the authored model it was written against. `species_mgmt_anon` has no egg, clutch or
 * incubation table at all, so the three constraints it was careful to respect no longer exist,
 * and the funnel, the nurseries, the thirteen incubators and the survival draw were all
 * standing on a floor that had been removed underneath them.
 *
 * WHAT WENT WITH IT. `eggsData.ts` and `eggsSheets.tsx`, and with them the centred tapering
 * `Lifecycle` funnel this page was the only caller of — the mark survives in `exec/marks.tsx`
 * for the next module that has an outcome to draw. `world.ts` still registers three nurseries
 * and thirteen incubators; they are authored too, and they are left alone here because
 * `entity.tsx` browses them and unpicking that is a separate decision. It is written down in
 * the handoff rather than half-done here.
 *
 * See `exec/noSource.tsx` for why the route survives the figures.
 */

import { Egg } from 'lucide-react'
import { NoSource } from '../../exec/noSource'

export default function Eggs() {
  return (
    <NoSource
      icon={Egg}
      what="Clutches set down, what hatched, what was discarded, and which incubator each sat in."
      metrics={['eggs', 'hatched', 'discarded']}
      related={{
        href: '#/births',
        label: 'Birth Analytics',
        note: '66,303 live births are recorded, with the species and site behind each. They are births of animals, not hatches from a clutch — no egg precedes them in the extract.',
      }}
    />
  )
}
