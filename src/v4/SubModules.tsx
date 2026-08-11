/**
 * The chapters of a module, listed at the foot of the module.
 *
 * WHY THE ROUTER RENDERS THIS AND NOT THE PAGES. Folding seven pages under five parents in
 * the rail is only safe if the parents lead to them, and the phone has no rail at all — so
 * on a phone this list is the ONLY way into Eggs Discarded that isn't search. Leaving that
 * to each page to remember is how one of them ends up not remembering, and the page that
 * forgets is the one whose child then cannot be reached on a phone.
 *
 * So it is rendered once, by the router, for any module with children. A page cannot omit
 * it and a page added to the tree tomorrow gets it for free.
 *
 * It is deliberately the quietest card on every page it appears on: it is a door, not a
 * finding, and it sits after the last figure rather than competing with one.
 */

import { ChevronRight } from 'lucide-react'
import { ACCENT_INK, FAINT, Section, mix, useAccent } from '../exec/system'
import { childrenOf, titleOf } from './nav'
import { execPages } from '../exec/pages'

export function SubModules({ slug }: { slug: string }) {
  const accent = useAccent()
  const kids = childrenOf(slug)
  if (kids.length === 0) return null

  return (
    <div className="flex w-full flex-col px-[var(--gutter)] pb-2">
      <Section label={`In ${titleOf(slug)}`} aside={`${kids.length}`}>
        <ul className="flex flex-col">
          {kids.map((kid) => (
            <li key={kid.slug} className="border-b border-[#f0efec] last:border-0">
              <a
                href={`#/${kid.slug}`}
                className="card-press -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2.5"
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-[9px]"
                  style={{ backgroundColor: mix(accent, 0.1) }}
                  aria-hidden
                >
                  <kid.icon size={15} strokeWidth={1.75} style={{ color: accent }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small text-[#1c1a16]">{kid.label}</span>
                  {/* The registry's own keywords, which are the words someone would search
                      for — so the row says what the page is for without a sentence. */}
                  <span className="mt-0.5 block truncate text-caption" style={{ color: FAINT }}>
                    {(execPages[kid.slug]?.keywords ?? []).slice(0, 3).join(' · ')}
                  </span>
                </span>
                <ChevronRight size={13} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
