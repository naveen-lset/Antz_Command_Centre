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
 *
 * IT SEARCHES ENTITIES AND ANIMALS TOO, and that is the part the brief requires. A product
 * organised around entities cannot have a search that only finds modules: "Aquatic Halls",
 * "Asiatic Lion", "Raja" and a pasted accession id are all things a director types, and none of
 * them is a module name. Modules still rank first — they are how you get to a question — with
 * entities and then individual animals under their own headings, because a result that jumps
 * straight to one lion when you meant the species would be a worse answer than an ordered list.
 *
 * The entity and animal scans honour the SITE FILTER. Searching inside Carnivore Ridge and being
 * offered a carp would contradict the scope the reader set, which is the whole thing the scope
 * layer exists to prevent.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Search, X } from 'lucide-react'
import { execPages, type ExecPage } from '../exec/pages'
import { ACCENT, FAINT, GROUND_GRADIENT } from '../exec/system'
import { searchEntities, type Entity } from '../core/entities'
import { searchAnimals } from '../core/animals'
import { animalTitle } from '../core/animals'
import { KIND_ICON } from './entity'
import { KIND_ONE } from '../core/entities'
import { useScope } from './scope'
import { siteKeyOf } from '../core/scope'

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
      <Glyph size={17} strokeWidth={1.75} style={{ color: ACCENT }}
        className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium text-[#1c1a16]">{hit.page.title}</span>
        {meta && <span className="mt-0.5 block truncate text-[11.5px] text-[#9b958b]">{sub}</span>}
      </span>
      <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-[#c8c3ba]" aria-hidden />
    </button>
  )
}

/** An entity or animal result. Rendered like a module row, with its kind as the second line. */
function EntityResult({ entity, sub, onGo }: { entity: Entity; sub?: string; onGo: (href: string) => void }) {
  const Glyph = KIND_ICON[entity.kind]
  return (
    <button
      type="button"
      onClick={() => onGo(`e/${entity.kind}/${encodeURIComponent(entity.id)}`)}
      className="card-press flex w-full items-center gap-3 rounded-[14px] bg-white px-4 py-3 text-left"
    >
      <Glyph size={17} strokeWidth={1.75} style={{ color: ACCENT }}
        className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium text-[#1c1a16]">{entity.name}</span>
        <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: FAINT }}>
          {sub ?? `${KIND_ONE[entity.kind]}${entity.sub ? ` · ${entity.sub}` : ''}`}
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-[#c8c3ba]" aria-hidden />
    </button>
  )
}

export function ModuleSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const field = useRef<HTMLInputElement>(null)
  const { scope, href } = useScope()

  /**
   * SEARCH OPENS AND CLOSES; IT DOES NOT APPEAR AND DISAPPEAR.
   *
   * It was mounted and unmounted on a boolean, so a full-screen surface replaced the
   * home between two frames in both directions — the most abrupt thing in the product
   * after the sheet, and reached from a button that sits two centimetres from the
   * reader's thumb.
   *
   * The exit is owned HERE rather than by the caller. `onClose` unmounts this
   * component, so anything that wants to animate out has to delay that call by its own
   * duration; pushing that requirement onto every caller is how one of them forgets.
   * `dismiss` is the only thing wired to Escape and to the close button.
   */
  const [entered, setEntered] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    field.current?.focus()
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const dismiss = useCallback(() => {
    setLeaving(true)
    /* Matches `--dur-emphasis-out`. A timer rather than `transitionend`, which does not
       fire at all for a reader on reduced motion — where the whole thing is 0.01ms and
       the surface is already gone. */
    setTimeout(onClose, 260)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismiss])

  const open = entered && !leaving

  const query = q.trim().toLowerCase()

  const hits = useMemo<Hit[]>(() => {
    if (!query) return []
    return ALL.flatMap(({ slug, page }) => {
      const s = score(query, page)
      return s ? [{ slug, page, ...s }] : []
    }).sort((a, b) => a.rank - b.rank || a.page.title.localeCompare(b.page.title))
  }, [query])

  /* Entities and animals, narrowed to the site scope in force. Both scans are bounded — see
     `core/animals.ts` for why scanning 215,432 derived records on every keystroke is not a
     search — so a long query returns fast or returns nothing. */
  const entities = useMemo(() => searchEntities(query, siteKeyOf(scope), 8), [query, scope])
  const animals = useMemo(
    () => searchAnimals(query, siteKeyOf(scope), scope.win, 6),
    [query, scope],
  )

  const go = (path: string) => {
    /* Through `href` so the reader's window and site survive the jump — a search result that
       silently resets the scope would answer a different question from the one asked. */
    window.location.hash = href(path)
    onClose()
  }

  /* Enter goes to the best match. Typing "mortality⏎" should not require also
     reaching for the list. */
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    /* A module beats an entity beats an animal, which is the order they are offered in. */
    if (hits[0]) go(hits[0].slug)
    else if (entities[0]) go(`e/${entities[0].kind}/${encodeURIComponent(entities[0].id)}`)
    else if (animals[0]) go(`e/animal/${animals[0].id}`)
  }

  const report = ALL.filter((m) => !m.page.ops)
  const ops = ALL.filter((m) => m.page.ops)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col font-sans"
      style={{
        background: GROUND_GRADIENT,
        opacity: open ? 1 : 0,
        transition: `opacity ${open ? 'var(--dur-emphasis) var(--ease-out)' : 'var(--dur-emphasis-out) var(--ease-in)'}`,
        pointerEvents: leaving ? 'none' : undefined,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[430px] flex-1 flex-col">
        <form
          onSubmit={onSubmit}
          className="shrink-0 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3"
        >
          {/* THE FIELD UNROLLS FROM WHERE THE BUTTON WAS.
              A `clip-path` inset from the right, not an animated `width`: the pill is
              laid out at its final size from the first frame, so the placeholder and
              the icons never reflow or squash on the way out — the reveal is a mask
              moving across finished type. It also costs no layout, which an animated
              width on a full-bleed element would on every frame.
              The 44px start is the search button's own size, so what expands is
              visibly the control that was tapped rather than a new thing. */}
          <div
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5"
            style={{
              clipPath: open ? 'inset(0 0 0 0 round 999px)' : 'inset(0 0 0 calc(100% - 44px) round 999px)',
              transition: `clip-path ${open ? 'var(--dur-emphasis) var(--ease-out)' : 'var(--dur-emphasis-out) var(--ease-in)'}`,
            }}
          >
            <Search size={17} strokeWidth={2} className="shrink-0 text-[#9b958b]" aria-hidden />
            <input
              ref={field}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search modules, sites, species, animals"
              aria-label="Search modules, sites, species and animals"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#1c1a16] outline-none placeholder:text-[#9b958b]"
            />
            <button
              type="button"
              onClick={() => (q ? setQ('') : dismiss())}
              aria-label={q ? 'Clear' : 'Close search'}
              className="-mr-1 grid size-7 shrink-0 place-items-center rounded-full transition-colors active:bg-[#f2f1ed]"
            >
              <X size={15} strokeWidth={2} className="text-[#6d6860]" aria-hidden />
            </button>
          </div>
        </form>

        {/* The results arrive just behind the field rather than with it — the reader is
            looking at what they are typing into, and the list settling a beat later is
            what makes the field feel like the thing that opened. */}
        {/* NOT KEYED ON THE QUERY. Re-mounting this on every keystroke would replay the
            entrance sixteen times while someone types "mortality" — a list flashing
            under a moving cursor. Results update in place; only the opening animates. */}
        <div
          className="animate-section-in min-h-0 flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] scrollbar-hidden"
          style={{ animationDelay: '60ms' }}
        >
          {query ? (
            hits.length + entities.length + animals.length > 0 ? (
              <>
                {hits.length > 0 && (
                  <>
                    <ResultHead label="Modules" count={hits.length} />
                    <ul className="mb-2 flex flex-col gap-2">
                      {hits.map((h) => (
                        <li key={h.slug}>
                          <Row hit={h} onGo={go} meta />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {entities.length > 0 && (
                  <>
                    <ResultHead label={scope.site ? `In ${scope.site.name}` : 'Sites, species and places'} count={entities.length} />
                    <ul className="mb-2 flex flex-col gap-2">
                      {entities.map((e) => (
                        <li key={`${e.kind}-${e.id}`}>
                          <EntityResult entity={e} onGo={go} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {animals.length > 0 && (
                  <>
                    <ResultHead label="Animals" count={animals.length} />
                    <ul className="mb-2 flex flex-col gap-2">
                      {animals.map((a) => (
                        <li key={a.id}>
                          <EntityResult
                            entity={{ kind: 'animal', id: a.id, name: animalTitle(a) }}
                            sub={`${a.id} · ${a.siteName} · ${a.enclosureId}`}
                            onGo={go}
                          />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <p className="px-1 pt-6 text-[13.5px] text-[#6d6860]">
                Nothing matches “{q.trim()}”
                {scope.site ? ` in ${scope.site.name}` : ''}. Try a word from the figure you're after
                — “death”, “vaccine”, “intake” — or a site, a species, or an animal's id.
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

/** One heading over a group of results. Counts, so a short group is visibly short. */
function ResultHead({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-2 pb-2">
      <h2 className="text-[11px] font-semibold tracking-[0.09em] text-[#6d6860] uppercase">{label}</h2>
      <span className="h-px flex-1 bg-[#1c1a16]/8" aria-hidden />
      <span className="text-[11px] tabular-nums" style={{ color: FAINT }}>
        {count}
      </span>
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
