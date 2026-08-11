/**
 * STAFF ATTENDANCE — not recorded in this system.
 *
 * The roster: 243 present of 312 rostered, 78% against an 82% target, split by shift and
 * department, with overtime and exceptions. `species_mgmt_anon` has a `users` table — 529 real
 * accounts, which the Users module reads — and no attendance against them. Knowing who holds an
 * account is not knowing who turned up, so the two are not substitutes and the pointer below
 * says which is which. See `exec/noSource.tsx`.
 */

import { Users } from 'lucide-react'
import { NoSource } from '../noSource'

export default function Attendance() {
  return (
    <NoSource
      icon={Users}
      what="Who was rostered, who was present, and where the shortfall fell by shift and department."
      metrics={['attendance']}
      related={{
        href: '#/users',
        label: 'Users',
        note: '529 staff accounts are recorded, with the sites and departments they belong to — but no shift, roster or presence against them.',
      }}
    />
  )
}
