/**
 * FETAL DEATH — not recorded in this system.
 *
 * Split out of Birth Analytics on the reasoning that a still birth is a clinical event with a
 * dam, a history and a follow-up, and that a loss counted inside the births figure is a loss
 * nobody reviews. Both of those remain true and neither is answerable here: there is no
 * fetal-loss record in `species_mgmt_anon`, and `report_births` carries live births only.
 *
 * IT IS NOT FOLDED INTO MORTALITY, for the reason that module's own header gives — a fetal loss
 * is not an animal in the collection dying, and adding it to the death count would inflate a
 * figure 1,293 real records currently support. See `exec/noSource.tsx`.
 */

import { Baby } from 'lucide-react'
import { NoSource } from '../noSource'

export default function Fetal() {
  return (
    <NoSource
      icon={Baby}
      what="Losses before birth — the dam, the gestation stage they occurred at, and what followed."
      metrics={['fetal']}
    />
  )
}
