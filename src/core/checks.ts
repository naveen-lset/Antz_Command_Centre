/**
 * INVARIANT CHECKS — run once in development, silent in production.
 *
 * The consistency requirement is the kind that decays quietly. Nothing breaks when a figure
 * drifts; a headline on a page four folders away simply stops matching the list underneath it,
 * and nobody notices until a director does. So the invariants are asserted rather than trusted.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED WHEN THE PRODUCT WAS CONNECTED TO THE DATABASE.
 *
 * Two of the old checks are gone because the thing they guarded no longer exists. They
 * asserted that every metric's current column summed to a headline typed elsewhere (`animals:
 * 215432`, `mortality: 23`) and that the solved daily series reproduced five authored window
 * totals exactly. Both were about keeping DERIVED data faithful to AUTHORED data. There is no
 * authored data left: the series is the events, counted, so "does the series reproduce the
 * authored figure" has no meaning and a hard-coded 215,432 would just be a second, worse copy
 * of a number the register already holds.
 *
 * What survives is everything that guards the reader rather than the author:
 *
 *   1. The clock matches the extract. A re-run of the ETL over a newer dump must not silently
 *      shift every date on every page — `calendar.ts` restates the horizon as a constant
 *      because `WINDOWS` is built before the store loads, so the two are checked against each
 *      other here.
 *   2. Breakdowns sum to their parent — species to site, site to collection — at more than one
 *      window, because an invariant that only holds in July is not an invariant.
 *   3. A flow's event count equals its series sum, which is what makes the record list and the
 *      KPI above it the same statement.
 *   4. The registries are internally consistent, and the population reconstruction never runs
 *      negative or exceeds today's exact count by an implausible margin.
 *
 * Failures print one grouped console error naming the metric and both figures. They are not
 * thrown: a mismatched total should not blank the screen during a design session.
 */

import { HISTORY_DAYS, WINDOWS, WORLD_TODAY, resolveWindow, toInput, type Win } from './calendar'
import { METRICS } from './metrics'
import { readSite } from './series'
import { bySpecies, figure } from './query'
import { count } from './events'
import { SITES, speciesCount, classCount, enclosureCount, USERS, SPECIES } from './world'
import { speciesStock } from './animals'
import { data } from './store'
import type { Scope } from './scope'

/**
 * Metrics with no source in `species_mgmt_anon`, and what is missing.
 *
 * Listed so the console says WHY a module is empty rather than leaving someone to work it out
 * from a blank card. Each of these was a real metric in the authored model and is now absent
 * on purpose — see the header of `metrics.ts`.
 */
const UNSOURCED: Record<string, string> = {
  eggs: 'no egg, clutch or incubation table',
  hatched: 'no hatch record',
  discarded: 'no egg record',
  fetal: 'no fetal-loss record',
  escaped: 'no escape record',
  escapedOpen: 'no escape record',
  lab: 'no lab test table — only a lab_test_id_count column',
  labOpen: 'no lab test table',
  approvals: 'no approvals table',
  tasks: 'no tasks table',
  attendance: 'no attendance table',
  alerts: 'no alerts table',
  alertsCritical: 'no alerts table',
  welfare: 'assessments exist but carry no pass/fail',
  breeding: 'no pairing outcome record',
  healthScore: 'no composite index in the source',
  wastage: 'no feed record — vaccination/deworming wastage is a dose figure, not feed',
  preventive: 'superseded by the per-programme coverage rates',
}

export function runChecks(): void {
  const fails: string[] = []
  const month = WINDOWS.find((w) => w.key === 'month')!
  const meta = data().meta

  /* 1 · the clock matches the extract it was pinned to. */
  if (toInput(WORLD_TODAY) !== meta.today)
    fails.push(
      `clock: calendar.ts says today is ${toInput(WORLD_TODAY)}, the extract ends ${meta.today} — ` +
        `update WORLD_TODAY and HISTORY_DAYS in core/calendar.ts`,
    )
  if (HISTORY_DAYS !== meta.historyDays)
    fails.push(`clock: calendar.ts has ${HISTORY_DAYS} days, the extract has ${meta.historyDays}`)

  /* 2 · breakdowns sum to their parent, at more than one window. */
  const windows: Win[] = [month, resolveWindow('last7'), resolveWindow('year'), resolveWindow('lastMonth')]

  for (const win of windows) {
    for (const slug of Object.keys(METRICS)) {
      /* Rates pool rather than sum, so the species check does not apply to them. */
      if (METRICS[slug].kind === 'rate') continue

      const overall: Scope = { site: null, win }
      const head = figure(overall, slug)
      const species = bySpecies(overall, slug).reduce((n, r) => n + r.value, 0)
      if (Math.round(species) !== Math.round(head.value))
        fails.push(`${slug} @ ${win.window}: species sum ${species} ≠ headline ${head.value}`)

      /* And per site, which is the case the scoped pages depend on. */
      for (const site of SITES) {
        const scoped: Scope = { site, win }
        const one = figure(scoped, slug)
        const rows = bySpecies(scoped, slug).reduce((n, r) => n + r.value, 0)
        if (Math.round(rows) !== Math.round(one.value))
          fails.push(`${slug}/${site.key} @ ${win.window}: species sum ${rows} ≠ ${one.value}`)
      }
    }
  }

  /* 3 · a flow's event count equals its series sum — the record list and the KPI. */
  for (const slug of Object.keys(METRICS)) {
    if (METRICS[slug].kind !== 'flow') continue
    for (const site of SITES) {
      const got = count(slug, site.key, month)
      const want = readSite(slug, site.key, month).value
      if (got !== want) fails.push(`${slug}/${site.key}: ${got} events vs ${want} in the series`)
    }
  }

  /* 4 · the registries and the reconstruction hold together. */
  const today = HISTORY_DAYS - 1
  const exact = SITES.reduce((n, s) => n + (data().sites.find((x) => x.key === s.key)?.animals ?? 0), 0)
  const stock = SITES.reduce((n, s) => n + speciesStock(s.key, month).reduce((m, r) => m + r.count, 0), 0)
  const onToday = SITES.reduce(
    (n, s) => n + speciesStock(s.key, { ...month, to: today } as Win).reduce((m, r) => m + r.count, 0),
    0,
  )
  if (onToday !== exact)
    fails.push(`population: species stock on the last day is ${onToday}, the register holds ${exact}`)
  if (stock < 0) fails.push(`population: reconstruction ran negative (${stock})`)

  if (enclosureCount !== SITES.reduce((n, s) => n + s.enclosures, 0))
    fails.push(`enclosures: registry has ${enclosureCount}, sites declare ${SITES.reduce((n, s) => n + s.enclosures, 0)}`)
  if (!SITES.length) fails.push('sites: registry is empty — did core/boot.ts run?')
  if (!SPECIES.length) fails.push('species: registry is empty')

  /* 5 · nothing that has a source is silently missing, and nothing missing is a surprise. */
  const missing = Object.keys(UNSOURCED).filter((slug) => METRICS[slug])
  for (const slug of missing) fails.push(`${slug}: listed as unsourced but a metric exists — update core/checks.ts`)

  if (fails.length) {
    /* One group, not one line per failure — a hundred species mismatches from a single
       bad row should read as one problem. */
    console.group(`%c⚠ ${fails.length} data-consistency check(s) failed`, 'color:#dc2626;font-weight:600')
    for (const f of fails.slice(0, 40)) console.error(f)
    if (fails.length > 40) console.error(`…and ${fails.length - 40} more`)
    console.groupEnd()
  } else {
    console.info(
      `%c✓ data consistency`,
      'color:#1e7a44;font-weight:600',
      `${Object.keys(METRICS).length} metrics · ${SITES.length} sites · ${speciesCount} species · ` +
        `${classCount} classes · ${enclosureCount} enclosures · ${USERS.length} staff · ` +
        `${exact.toLocaleString('en-US')} animals`,
    )
  }

  /* The unsourced list, printed once, so an empty module is explained rather than mysterious. */
  console.groupCollapsed(
    `%c○ ${Object.keys(UNSOURCED).length} metrics have no source in ${meta.database}`,
    'color:#8a5d06;font-weight:600',
  )
  for (const [slug, why] of Object.entries(UNSOURCED)) console.info(`${slug} — ${why}`)
  console.info(
    'These render the empty state rather than a zero. Rows discarded during the build:',
    meta.discarded,
  )
  console.groupEnd()
}
