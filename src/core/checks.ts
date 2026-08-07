/**
 * INVARIANT CHECKS — run once in development, silent in production.
 *
 * The consistency requirement is the kind that decays quietly. Nothing breaks when someone
 * edits a site row in `metrics.ts`; a headline on a page four folders away simply stops
 * matching the list underneath it, and nobody notices until a director does. So the
 * invariants are asserted rather than trusted:
 *
 *   1. Every metric's current column sums to the figure the product states for it.
 *   2. The derived daily series reproduces all five authored windows EXACTLY. This is the
 *      one that makes "every window is a real sum" a fact rather than a claim.
 *   3. Breakdowns sum to their parent — species to site, site to collection — at more than
 *      one window, because an invariant that only holds in July is not an invariant.
 *
 * Failures print a single grouped console error naming the metric and both figures. They
 * are not thrown: a mismatched total should not blank the screen during a design session,
 * and the message is specific enough to fix without a stack trace.
 */

import { WINDOWS, resolveWindow, type Win } from './calendar'
import { METRICS } from './metrics'
import { readSite, split, sumIn } from './series'
import { bySpecies, figure } from './query'
import { count } from './events'
import { SITES, siteOf, speciesCount, classCount, enclosureCount, USERS, STAFF_TOTAL } from './world'
import { speciesStock } from './animals'
import type { Scope } from './scope'

/** What the product states elsewhere. A mismatch here means one of the two has moved. */
const HEADLINES: Record<string, number> = {
  animals: 215432,
  accession: 18,
  births: 45,
  eggs: 142,
  hatched: 96,
  discarded: 13,
  fetal: 5,
  mortality: 23,
  transfers: 28,
  health: 124,
  admissions: 50,
  disease: 9,
  deworming: 63,
  lab: 214,
  labOpen: 31,
  pharmacy: 1284,
  approvals: 14,
  alerts: 36,
  alertsCritical: 14,
}

/** Rate metrics, as numerator / denominator. */
const RATES: Record<string, [number, number]> = {
  vaccination: [2184, 2374],
  preventive: [2136, 2374],
  tasks: [41, 76],
  attendance: [243, 312],
  welfare: [82, 89],
  breeding: [45, 58],
  healthScore: [564, 600],
  wastage: [34, 1000],
}

export function runChecks(): void {
  const fails: string[] = []
  const month = WINDOWS.find((w) => w.key === 'month')!

  /* 1 · authored columns sum to the stated headlines. */
  for (const [slug, expected] of Object.entries(HEADLINES)) {
    const s = split(slug, month)
    if (!s) {
      fails.push(`${slug}: no metric defined`)
      continue
    }
    if (Math.round(s.total) !== expected) fails.push(`${slug}: rows sum to ${s.total}, product states ${expected}`)
  }

  for (const [slug, [num, den]] of Object.entries(RATES)) {
    const s = split(slug, month)
    if (!s) {
      fails.push(`${slug}: no metric defined`)
      continue
    }
    const gotNum = s.rows.reduce((n, r) => n + r.value, 0)
    if (gotNum !== num) fails.push(`${slug}: numerator sums to ${gotNum}, product states ${num}`)
    if (s.totalOf !== den) fails.push(`${slug}: denominator sums to ${s.totalOf}, product states ${den}`)
  }

  /* 2 · the daily series reproduces every authored window exactly. */
  const authored: [string, Win][] = [
    ['today', resolveWindow('today')],
    ['last7', resolveWindow('last7')],
    ['month', month],
  ]

  for (const [slug, metric] of Object.entries(METRICS)) {
    if (metric.kind !== 'flow') continue
    for (const row of metric.flows ?? []) {
      const want = { today: row.v[0], last7: row.v[1], month: row.v[2] }
      for (const [name, win] of authored) {
        const got = sumIn(slug, row.site, win.from, win.to)
        const expected = want[name as keyof typeof want]
        if (got !== expected)
          fails.push(`${slug}/${row.site} ${name}: series sums to ${got}, authored ${expected}`)
      }
    }
  }

  /* 3 · breakdowns sum to their parent, at more than one window. */
  const windows: Win[] = [month, resolveWindow('last7'), resolveWindow('year'), resolveWindow('lastMonth')]

  for (const win of windows) {
    for (const slug of Object.keys(METRICS)) {
      const metric = METRICS[slug]
      /* Rates pool rather than sum, so the species check does not apply to them. */
      if (metric.kind === 'rate') continue

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

  /* 4 · a flow's event count equals its series sum — the record list and the KPI. */
  for (const slug of Object.keys(METRICS)) {
    if (METRICS[slug].kind !== 'flow') continue
    for (const site of SITES) {
      const got = count(slug, site.key, month)
      const want = readSite(slug, site.key, month).value
      if (got !== want) fails.push(`${slug}/${site.key}: ${got} events vs ${want} in the series`)
    }
  }

  /* 5 · the entity registry matches the counts the home screen states. */
  const stock = SITES.reduce((n, s) => n + speciesStock(s.key, month).reduce((m, r) => m + r.count, 0), 0)
  if (stock !== HEADLINES.animals) fails.push(`population: species stock sums to ${stock}, expected ${HEADLINES.animals}`)
  if (enclosureCount !== SITES.reduce((n, s) => n + s.enclosures, 0))
    fails.push(`enclosures: registry has ${enclosureCount}`)
  if (USERS.length !== STAFF_TOTAL) fails.push(`users: registry has ${USERS.length}, expected ${STAFF_TOTAL}`)

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
      `${Object.keys(METRICS).length} metrics · ${speciesCount} species · ${classCount} classes · ` +
        `${enclosureCount} enclosures · ${USERS.length} users · ${SITES.length} sites`,
    )
  }
}

/** Named for the console, so the info line above says something useful. */
export const siteNames = SITES.map((s) => siteOf(s.key)?.name).join(', ')
