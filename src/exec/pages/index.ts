/**
 * Registry of executive module pages.
 *
 * Each entry is a hand-composed page, not a template instance — the whole point
 * is that no two share a structure. Modules absent from this map still render
 * through the older generic renderer until their page is built.
 */
import type { ComponentType } from 'react'
import Animals from './animals'
import Health from './health'
import Welfare from './welfare'
import Lab from './lab'

export const execPages: Record<string, { title: string; Page: ComponentType }> = {
  animals: { title: 'Animals', Page: Animals },
  health: { title: 'Health & Medical', Page: Health },
  welfare: { title: 'Animal Welfare', Page: Welfare },
  lab: { title: 'Lab Requests', Page: Lab },
}

export const findExecPage = (slug: string) => execPages[slug]
