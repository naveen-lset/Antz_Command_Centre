/**
 * LAB REQUESTS — not recorded in this system.
 *
 * The LIMS layer. Its header made an honest case for itself: the departments, their turnaround
 * standards, the tests, the sites, the species and the animals were all real registry entries,
 * and only the result, the reporting lag and the flag were drawn — from `rng(ev.id)`, so that a
 * department tally and the records behind it could not disagree. It even calibrated the lag so
 * the emergent pending queue equalled the `labOpen` figure home published.
 *
 * Every one of those safeguards was about keeping DERIVED values consistent with each other. It
 * had no answer for the case where the events themselves stop existing, and that is the case
 * `species_mgmt_anon` presents: there is no lab test table, only a `lab_test_id_count` column on
 * medical records — a count of tests ordered, with no test, no department, no turnaround and no
 * result behind it. Nothing was left to seed the draw from.
 *
 * WHAT WENT WITH IT. `labData.ts` and `labSheets.tsx`. `world.ts` keeps its two laboratories and
 * nine departments with their working-day turnarounds, because `entity.tsx` browses them and
 * `mortality.tsx` reads them for necropsy benches — they are authored as well, and that is a
 * separate decision, written down rather than half-made here.
 *
 * See `exec/noSource.tsx` for why the route survives the figures.
 */

import { FlaskConical } from 'lucide-react'
import { NoSource } from '../../exec/noSource'

export default function Lab() {
  return (
    <NoSource
      icon={FlaskConical}
      what="Which samples were sent, to which bench, how long they took, and what came back."
      metrics={['lab', 'labOpen']}
      related={{
        href: '#/health',
        label: 'Health & Medical',
        note: '6,808 diagnoses and 61,970 medical records are recorded, and each carries how many lab tests were ordered against it — the count survived the extract, the results did not.',
      }}
    />
  )
}
