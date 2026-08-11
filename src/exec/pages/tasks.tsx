/**
 * TASKS — not recorded in this system.
 *
 * This page opened on a completion dial reading 87% on time, a board of 35 open tasks, five
 * teams with workloads, a closure-density matrix and the oldest and latest work outstanding.
 * None of it came from anywhere: `species_mgmt_anon` has no tasks table, no assignment, no due
 * date and no closure. See `exec/noSource.tsx` for why the route survives the figures.
 */

import { ListTodo } from 'lucide-react'
import { NoSource } from '../noSource'

export default function Tasks() {
  return (
    <NoSource
      icon={ListTodo}
      what="What work is open, who it sits with, and whether the place closes what it opens."
      metrics={['tasks']}
    />
  )
}
