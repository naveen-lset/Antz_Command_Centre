/**
 * EGGS DISCARDED — not recorded in this system.
 *
 * Promoted out of the egg pipeline on a good argument: infertile is a breeding result, thin
 * shelled is a nutrition result and rotten is a handling result — three departments behind one
 * number, indistinguishable on a funnel stage. The argument still holds. The number does not.
 * `species_mgmt_anon` has no egg record at all, so there is no clutch to discard from and no
 * reason column to split. See `exec/noSource.tsx`.
 */

import { EggOff } from 'lucide-react'
import { NoSource } from '../noSource'

export default function Discarded() {
  return (
    <NoSource
      icon={EggOff}
      what="Which eggs were thrown away and why — infertile, thin shelled or spoiled being three different departments' results."
      metrics={['discarded', 'eggs']}
      related={{
        href: '#/eggs',
        label: 'Eggs & Incubation',
        note: 'The same gap, stated in full: no egg, clutch or incubation table anywhere in the extract.',
      }}
    />
  )
}
