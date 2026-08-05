/**
 * Global search over the twenty modules.
 *
 * The home screen is a monthly report read top to bottom, which is the right shape
 * for reviewing and the wrong shape for looking one thing up. Twenty modules is past
 * the point where scanning beats typing, and the ones below the report line were the
 * hardest to reach at exactly the moment someone needs them most.
 *
 * Matching runs over each module's title AND its keywords, because the word a
 * director types is rarely the word on the card: "death" has to find Mortality,
 * "vaccine" has to find Vaccination, "sign off" has to find Approvals. Ranking puts
 * title hits above keyword hits so typing a real title never buries it under a
 * synonym match somewhere else.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Search, X } from 'lucide-react'
import { execPages, type ExecPage } from '../exec/pages'
import { GROUND_GRADIENT } from '../exec/system'

interface Hit {
  slug: string
  page: ExecPage
  rank: number
  /** The keyword that matched, shown so a synonym hit explains itself. */
  via?: string
}

const ALL: { slug: string; page: ExecPage }[] = Object.entries(execPages).map(([slug, page]) => ({ slug, page }))

/**
 * Lower is better.
 *
 * An EXACT keyword match outranks a mere title-word match, which is the one tier that
 * looks wrong and isn't: typing "death" wants Mortality, but "Fetal Death" has the
 * word in its title. "death" is a deliberate exact keyword on Mortality, and a
 * curated synonym is a stronger statement of intent than a word that happens to
 * appear in a longer title. Title prefixes still win outright, so "fetal" lands where
 * it should.
 */
function score(q: string, page: ExecPage): { rank: number; via?: string } | undefined {
  const title = page.title.toLowerCase()
  const keywords = page.keywords ?? []

  if (title === q) return { rank: 0 }
  if (title.startsWith(q)) return { rank: 1 }

  for (const k of keywords) {
    if (k.toLowerCase() === q) return { rank: 2, via: k }
  }

  if (title.split(/[\s&]+/).some((w) => w.startsWith(q))) return { rank: 3 }
  if (title.includes(q)) return { rank: 4 }

  for (const k of keywords) {
    if (k.toLowerCase().startsWith(q)) return { rank: 5, via: k }
  }
  for (const k of keywords) {
    if (k.toLowerCase().includes(q)) return { rank: 6, via: k }
  }
  return undefined
}

/**
 * `meta` is the second line, and it is only ever shown when it says something the
 * row doesn't. Browsing under a "MONTHLY REPORT" heading, printing "Monthly report"
 * under all fourteen rows is fourteen repetitions of the heading; in results there
 * is no heading, so the track — or the synonym that matched — is worth the line.
 */
function Row({ hit, onGo, meta = false }: { hit: Hit; onGo: (slug: string) => void; meta?: boolean }) {
  const Glyph = hit.page.icon
  const sub = hit.via ? `matches “${hit.via}”` : hit.page.ops ? 'Operations' : 'Monthly report'
  return (
    <button
      type="button"
      onClick={() => onGo(hit.slug)}
      className="card-press flex w-full items-center gap-3 rounded-[14px] bg-white px-4 py-3 text-left"
    >
      <Glyph size={17} strokeWidth={1.75} className="shrink-0 text-[#2f9e5b]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium text-[#1c1a16]">{hit.page.title}</span>
        {meta && <span className="mt-0.5 block truncate text-[11.5px] text-[#9b958b]">{sub}</span>}
      </span>
      <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-[#c8c3ba]" aria-hidden />
    </button>
  )
}

export function ModuleSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    field.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const query = q.trim().toLowerCase()

  const hits = useMemo<Hit[]>(() => {
    if (!query) return []
    return ALL.flatMap(({ slug, page }) => {
      const s = score(query, page)
      return s ? [{ slug, page, ...s }] : []
    }).sort((a, b) => a.rank - b.rank || a.page.title.localeCompare(b.page.title))
  }, [query])

  const go = (slug: string) => {
    window.location.hash = `#/${slug}`
    onClose()
  }

  /* Enter goes to the best match. Typing "mortality⏎" should not require also
     reaching for the list. */
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hits[0]) go(hits[0].slug)
  }

  const report = ALL.filter((m) => !m.page.ops)
  const ops = ALL.filter((m) => m.page.ops)

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-sans" style={{ background: GROUND_GRADIENT }} role="dialog" aria-modal="true" aria-label="Search modules">
      <div className="mx-auto flex min-h-0 w-full max-w-[430px] flex-1 flex-col">
        <form
          onSubmit={onSubmit}
          className="shrink-0 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3"
        >
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5">
            <Search size={17} strokeWidth={2} className="shrink-0 text-[#9b958b]" aria-hidden />
            <input
              ref={field}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search modules"
              aria-label="Search modules"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#1c1a16] outline-none placeholder:text-[#9b958b]"
            />
            <button
              type="button"
              onClick={() => (q ? setQ('') : onClose())}
              aria-label={q ? 'Clear' : 'Close search'}
              className="-mr-1 grid size-7 shrink-0 place-items-center rounded-full active:bg-[#f2f1ed]"
            >
              <X size={15} strokeWidth={2} className="text-[#6d6860]" aria-hidden />
            </button>
          </div>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] scrollbar-hidden">
          {query ? (
            hits.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {hits.map((h) => (
                  <li key={h.slug}>
                    <Row hit={h} onGo={go} meta />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-1 pt-6 text-[13.5px] text-[#6d6860]">
                Nothing matches “{q.trim()}”. Try a word from the figure you're after — “death”,
                “vaccine”, “intake”, “sign off”.
              </p>
            )
          ) : (
            /* Empty state is the full index, not a blank screen with a hint. Twenty
               modules fits a scroll, and browsing it is a legitimate way to search. */
            <>
              <Group label="Monthly report" items={report} onGo={go} />
              <Group label="Operations" items={ops} onGo={go} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Group({
  label,
  items,
  onGo,
}: {
  label: string
  items: { slug: string; page: ExecPage }[]
  onGo: (slug: string) => void
}) {
  return (
    <>
      <h2 className="px-1 pt-2 pb-2 text-[11px] font-semibold tracking-[0.09em] text-[#6d6860] uppercase">
        {label}
      </h2>
      <ul className="mb-2 flex flex-col gap-2">
        {items.map(({ slug, page }) => (
          <li key={slug}>
            <Row hit={{ slug, page, rank: 0 }} onGo={onGo} />
          </li>
        ))}
      </ul>
    </>
  )
}
