/**
 * THE PAGE FOR A MODULE THE DATABASE CANNOT ANSWER.
 *
 * Nine modules survived the move onto `species_mgmt_anon` with their original authored
 * fixtures intact — eggs and incubation, discarded eggs, fetal loss, the laboratory, approvals,
 * tasks, staff attendance, welfare auditing and alerts. Every one of them rendered a confident
 * hero, a dial, a board and a records table, none of which came from anywhere. On its own that
 * is a mock. Beside `#/mortality`, which reads 1,293 real deaths off the extract, and under the
 * same footer, it is something worse: the reader has no way to tell the two apart, and the
 * mock is the more polished of the pair. That is precisely the failure the "real data only"
 * directive exists to prevent, and it was the largest remaining instance of it.
 *
 * SO THE PAGE STAYS AND THE FIGURES GO. Retiring the routes was the other option and it throws
 * away the thing worth keeping: a director looking for Tasks should find out that the system
 * does not record tasks, which is a fact about the estate's software, not a missing page.
 * `#/tasks` 404-ing teaches nothing; `#/tasks` reading "no tasks table" teaches the reader
 * something true about what they bought.
 *
 * WHY THE REASONS ARE NOT WRITTEN HERE. They come from `core/metrics.ts`'s `UNSOURCED`, which
 * `core/checks.ts` prints to the console and asserts against the live registry on every boot.
 * A slug listed there that later acquires a metric fails the boot, so the day someone extends
 * the ETL to cover eggs, the check fires, the entry comes out, and this page stops claiming a
 * gap that has been filled. Had the copy been written into the page it would have gone on
 * saying "no egg table" over a working egg table, which is the same class of error as the
 * July 2025 footer this pass just removed.
 *
 * THE DASH IS THE MARK. It is the same one `Home`'s `EmptyCard` uses, at hero size, for the
 * same reason `query.ts` gives: "'0 deaths in Carnivore Ridge' and 'we do not track deaths in
 * Carnivore Ridge' are different statements and only one of them is true." A zero here would
 * be a number, and a number is a claim.
 */

import type { ComponentType } from 'react'
import { ArrowRight } from 'lucide-react'
import { UNSOURCED } from '../core/metrics'
import { FAINT, HAIR, Section, Stack, Stamp } from './system'

type Icon = ComponentType<{ size?: number | string; strokeWidth?: number; style?: object }>

export interface NoSourceProps {
  icon: Icon
  /**
   * What the module would report if the estate recorded it, in the reader's words rather than
   * the schema's. This is the one line on the page that is authored, and it authors a QUESTION,
   * never a figure — "Clutches set down, hatch rate and incubator throughput" states what is
   * absent without implying a value for it.
   */
  what: string
  /**
   * The slugs whose absence empties this page, in the order they should be read. Each must be
   * a key of `UNSOURCED`; the reason is looked up, never passed in.
   */
  metrics: string[]
  /**
   * The nearest module that DOES hold something, where one exists.
   *
   * Not every page gets one and none is invented — there is no adjacent source for approvals
   * or tasks, and pointing at a loosely related module would imply a substitute that isn't.
   * Where it is real it turns a dead end into the next click: a reader who came looking for
   * lab results is genuinely better served by the diagnoses that were recorded.
   */
  related?: { href: string; label: string; note: string }
}

export function NoSource({ icon: Glyph, what, metrics, related }: NoSourceProps) {
  return (
    <>
      {/* Not `Hero`. The hero prints its figure at 64px through `Figure`, whose tween counts
          a number up on arrival — animating an em-dash into place would dress absence as an
          event. This is the same silhouette, drawn still. */}
      <div className="w-full px-[var(--gutter)] pb-3">
        <section
          className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]"
          aria-label={what}
        >
          <span className="block font-display text-[64px] leading-none font-bold" style={{ color: '#c9c4bb' }}>
            —
          </span>
          <p className="mt-2 flex items-center gap-2 text-body text-[#3d3a34]">
            <Glyph size={15} strokeWidth={1.75} style={{ color: FAINT }} aria-hidden />
            Not recorded in this system
          </p>
          <p className="mt-3 text-small text-balance text-[#5c574f]">{what}</p>
        </section>
      </div>

      <Stack>
        <Section label="What is missing" aside={`${metrics.length} ${metrics.length === 1 ? 'figure' : 'figures'}`}>
          <ul className="divide-y" style={{ borderColor: HAIR }}>
            {metrics.map((slug) => (
              <li key={slug} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                <span className="text-small font-medium text-[#1c1a16]">{LABELS[slug] ?? slug}</span>
                <span className="text-caption text-[#5c574f]">
                  {UNSOURCED[slug] ?? 'no source in the extract'}
                </span>
              </li>
            ))}
          </ul>
          {/* Named, because "no source" invites the question "in what?" and the answer is a
              specific extract with a specific horizon rather than the product in general. */}
          <p className="mt-4 border-t pt-3 text-caption text-[#736e67]" style={{ borderColor: HAIR }}>
            Checked against <span className="font-medium">species_mgmt_anon</span>. Extend the ETL and
            this page fills itself.
          </p>
        </Section>

        {related && (
          <Section label="What is recorded instead">
            <a
              href={related.href}
              className="flex items-center gap-3 rounded-[10px] py-1 no-underline transition-opacity hover:opacity-70"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-small font-medium text-[#1c1a16]">{related.label}</span>
                <span className="mt-1 block text-caption text-balance text-[#5c574f]">{related.note}</span>
              </span>
              <ArrowRight size={16} strokeWidth={1.75} style={{ color: FAINT }} aria-hidden />
            </a>
          </Section>
        )}
      </Stack>
      <Stamp />
    </>
  )
}

/**
 * The reader's name for each absent figure.
 *
 * `UNSOURCED` is keyed by metric slug and says what is missing from the schema; this says what
 * the reader was looking for. Two different sentences about the same gap, and the page needs
 * both — "labOpen: no lab test table" alone reads as a developer's note left on a screen.
 */
const LABELS: Record<string, string> = {
  eggs: 'Eggs set down',
  hatched: 'Hatched',
  discarded: 'Eggs discarded',
  fetal: 'Fetal loss',
  escaped: 'Escapes',
  escapedOpen: 'Escapes still open',
  lab: 'Lab requests',
  labOpen: 'Lab requests outstanding',
  approvals: 'Approvals waiting',
  tasks: 'Open tasks',
  attendance: 'Staff present',
  alerts: 'Alerts raised',
  alertsCritical: 'Critical alerts',
  welfare: 'Welfare audits passed',
  breeding: 'Breeding success',
  healthScore: 'Health score',
  wastage: 'Food wastage',
}
