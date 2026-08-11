/**
 * ALERTS — not recorded in this system.
 *
 * The signal wall: 6 critical, 36 open, a live rail of what fired, the zones that raised it and
 * response rates against SLA. There is no alerts table in `species_mgmt_anon` and no severity
 * column anywhere to derive one from. See `exec/noSource.tsx`.
 *
 * The nearest real signal is a clinical one rather than an operational one: `complaints` carries
 * a severity that Health & Medical reads. It is not an alerting system and the pointer says so —
 * a reader who came here for "what needs attention now" should not be handed a case list and
 * left to assume it is the same thing.
 */

import { BellRing } from 'lucide-react'
import { NoSource } from '../noSource'

export default function Alerts() {
  return (
    <NoSource
      icon={BellRing}
      what="What fired, how severe it was, where it came from, and whether anyone answered it in time."
      metrics={['alerts', 'alertsCritical']}
      related={{
        href: '#/health',
        label: 'Health & Medical',
        note: 'Complaints carry a recorded severity and a prognosis — the only graded signal in the extract. It is a clinical record, not an alerting queue.',
      }}
    />
  )
}
