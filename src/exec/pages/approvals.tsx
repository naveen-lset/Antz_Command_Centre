/**
 * APPROVALS — not recorded in this system.
 *
 * The decision queue: 14 pending, 3 past SLA, a 1.4-day average and ₹31.4L held up in it. There
 * is no approvals table in `species_mgmt_anon`, and the rupee figures were the last money on any
 * page in the product — every cost column in the source sums to zero, which is why Pharmacy
 * counts administrations rather than spend. See `exec/noSource.tsx`.
 */

import { CheckCircle2 } from 'lucide-react'
import { NoSource } from '../noSource'

export default function Approvals() {
  return (
    <NoSource
      icon={CheckCircle2}
      what="What is waiting on a signature, how long it has waited, and who is holding it."
      metrics={['approvals']}
    />
  )
}
