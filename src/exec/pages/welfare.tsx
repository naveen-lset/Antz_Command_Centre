/**
 * ANIMAL WELFARE — not recorded in this system.
 *
 * The one centred hero in the set, reading 4.6 / 5 "above benchmark", over a five-domain radar,
 * a zone spread, a completion dial and an audit rail.
 *
 * THIS ONE IS THE SHARPEST OF THE NINE, because the gap is narrower than the others and so the
 * invented figure was more plausible. Assessments do exist in `species_mgmt_anon` — what they
 * carry is no pass, no fail, no score and no domain. A 4.6 was therefore not an approximation of
 * something recorded but a verdict on a body of work whose verdict column is empty, printed in
 * green under the word "benchmark". See `exec/noSource.tsx`.
 */

import { ShieldCheck } from 'lucide-react'
import { NoSource } from '../noSource'

export default function Welfare() {
  return (
    <NoSource
      icon={ShieldCheck}
      what="Which enclosures were assessed, against which domains, and what the assessor concluded."
      metrics={['welfare']}
    />
  )
}
