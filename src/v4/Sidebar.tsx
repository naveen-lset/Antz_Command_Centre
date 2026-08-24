/**
 * Permanent module sidebar — tablet and up.
 *
 * A rounded white panel on the sage ground, the same surface as every card, so the
 * shell reads as one material rather than as chrome wrapped around content. It is
 * permanent by design: on a tablet there is room to say where you are in the product
 * at all times, and a director moving between six modules in a sitting should not
 * navigate through a menu that has to be opened first.
 *
 * The phone has no equivalent and gains none. Modules are reached there from the
 * sheets that name them and from search — the same journey with the map left
 * implicit. A 244px rail on a 390px screen would be the screen.
 *
 * Header and footer are pinned and only the list scrolls: twenty modules exceed a
 * tablet's height, and a search box that scrolls out of reach is one you have to hunt
 * for before you can hunt with it.
 *
 * IT COLLAPSES TO A RAIL OF ICONS, and the control for it is the one thing in the design's
 * sidebar header besides the product name — a `«` at the top right. Collapsed it is 76px: an
 * icon, its hit area, and nothing else.
 *
 * WHY COLLAPSE AT ALL, on a panel whose own note argues for being permanent. The argument
 * above is about ALWAYS KNOWING WHERE YOU ARE, and an icon rail keeps that — the active row is
 * still filled, still in the same position, still the same glyph. What it gives back is 208px
 * of column, which on a 13-inch laptop is the difference between the species page's three
 * composition rings fitting on one row and wrapping onto two. The reader who wants the names
 * back gets them in one click, and the choice is remembered.
 *
 * THE STATE IS THIS COMPONENT'S OWN and it survives navigation for free: the sidebar is
 * mounted once by `Shell`, outside the route switch, so a route change does not remount it.
 * `localStorage` is what carries it across a reload.
 */

/** Collapsed width — a 40px hit target, centred, with the panel's own 18px either side. */
const RAIL_SHUT = 76
const STORE = 'antz.rail'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronsLeft, ChevronsRight, LayoutGrid, Search, X } from 'lucide-react'
import { EVERYTHING, SETTINGS, SPECIES, activeSlug, filterNav, inSpecies } from './nav'
import { site } from './data'
import { useSheet } from './sheet'
import { SettingsPanel } from './Settings'

export function Sidebar({ route }: { route: string }) {
  const [query, setQuery] = useState('')
  /* Read once, synchronously, so the rail paints at its remembered width instead of opening
     wide and snapping shut on the first effect — which is a visible jolt on every page load. */
  const [shut, setShut] = useState(() => {
    try {
      return localStorage.getItem(STORE) === '1'
    } catch {
      return false
    }
  })
  const search = useRef<HTMLInputElement>(null)
  const groups = useMemo(() => filterNav(query), [query])
  const active = activeSlug(route)
  const onHome = active === ''
  const onSpecies = inSpecies(route)
  const { open } = useSheet()

  useEffect(() => {
    try {
      localStorage.setItem(STORE, shut ? '1' : '0')
    } catch {
      /* Private browsing, or a quota — the rail still works, it just forgets. */
    }
  }, [shut])

  /* A QUERY TYPED WHILE SHUT MAKES NO SENSE, so shutting the rail clears it. Otherwise the
     list would stay filtered to whatever was typed before, with the field that explains why
     now hidden — a nav showing four of twenty rows and nothing saying so. */
  const close = () => {
    setShut(true)
    setQuery('')
  }

  return (
    <nav
      aria-label="Modules"
      className="sticky top-[var(--shell-pad)] flex max-h-[calc(100dvh-var(--shell-pad)*2)] shrink-0 flex-col overflow-hidden rounded-[20px] bg-white transition-[width] duration-[var(--dur-standard)] ease-[var(--ease-out)]"
      style={{ width: shut ? RAIL_SHUT : 'var(--rail)' }}
    >
      <div className={`shrink-0 pt-5 pb-3 ${shut ? 'px-[18px]' : 'px-4'}`}>
        {/* THE TOGGLE IS THE HEADER'S OWN ROW, beside the name — where the design puts it and
            where a reader expects a panel's own control to be. Shut, the name goes and the
            button centres, because a 76px rail has no room for a word and the button is the
            only thing in it that still means something. */}
        <div className={`flex items-start gap-2 ${shut ? 'justify-center' : ''}`}>
          {!shut && (
            <span className="min-w-0 flex-1 px-1">
              <span className="block truncate text-body font-semibold text-[#1c1a16]">{site.org}</span>
              <span className="mt-1 block truncate text-caption text-[#736e67]">{site.zooName}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => (shut ? setShut(false) : close())}
            aria-expanded={!shut}
            aria-label={shut ? 'Expand the module rail' : 'Collapse the module rail'}
            title={shut ? 'Expand' : 'Collapse'}
            className="grid size-10 shrink-0 place-items-center rounded-[10px] text-[#736e67] transition-colors hover:bg-[#f6f7f6] hover:text-[#3d3a34]"
          >
            {shut ? (
              <ChevronsRight size={18} strokeWidth={2} aria-hidden />
            ) : (
              <ChevronsLeft size={18} strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>

        {/* SHUT, SEARCH IS A BUTTON THAT OPENS THE RAIL AND LANDS IN THE FIELD. A 76px column
            cannot hold an input, and hiding search outright would mean the one way to find a
            module by name is only available in the wide state. One click gets both. */}
        {shut ? (
          <button
            type="button"
            onClick={() => {
              setShut(false)
              requestAnimationFrame(() => search.current?.focus())
            }}
            aria-label="Search modules"
            title="Search modules"
            className="mt-3 grid size-10 place-items-center rounded-[11px] bg-[#f4f6f4] text-[#736e67] transition-colors hover:text-[#3d3a34]"
          >
            <Search size={16} strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <label className="mt-4 flex items-center gap-2 rounded-[11px] bg-[#f4f6f4] px-3 py-3 focus-within:ring-2 focus-within:ring-[#37bd69]/35">
            <Search size={15} strokeWidth={2} className="shrink-0 text-[#736e67]" aria-hidden />
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules"
              aria-label="Search modules"
              className="min-w-0 flex-1 bg-transparent text-small text-[#1c1a16] outline-none placeholder:text-[#736e67] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="grid size-5 shrink-0 place-items-center rounded-full text-[#736e67] transition-colors hover:bg-[#e7ebe8] hover:text-[#3d3a34]"
              >
                <X size={12} strokeWidth={2.5} aria-hidden />
              </button>
            )}
          </label>
        )}
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto scrollbar-hidden pb-2 ${shut ? 'px-[18px]' : 'px-3'}`}>
        <SidebarLink href="#/" icon={LayoutGrid} label="Home" active={onHome} shut={shut} />
        {/* The entity index. Beside Home rather than in a module group, because browsing things is
            the other axis of the product — see `nav.ts`.
            IT NO LONGER CLAIMS THE SPECIES ROUTES. `active === 'browse' || active === 'e'` lit this
            row for the species list and every species record, which is why adding the row below
            required narrowing this one: two lit rows say the reader is in two places. */}
        <SidebarLink
          href={`#/${EVERYTHING.slug}`}
          icon={EVERYTHING.icon}
          label={EVERYTHING.label}
          active={
            !onSpecies && (active === EVERYTHING.slug || active === 'browse' || active === 'e')
          }
          shut={shut}
        />
        {/* SPECIES. The module with thirteen tabs and, until now, no row — see `nav.ts`. */}
        <SidebarLink
          href={`#/${SPECIES.slug}`}
          icon={SPECIES.icon}
          label={SPECIES.label}
          active={onSpecies}
          shut={shut}
        />

        {groups.map((group) => (
          /* 14px between groups and 4px under a heading, down from 16 and 6. Four headings
             instead of two cost about a row and a half of height, and the rail is worth
             keeping inside a 13-inch laptop — this is where that comes back from. */
          <div key={group.name} className="mt-4 first:mt-3">
            {/* SHUT, THE HEADING BECOMES THE RULE IT WAS ALREADY IMPLYING. Four uppercase words
                will not fit in 40px and truncating them to "COL…" is worse than not having
                them; a hairline keeps the four groups readable as four groups, which is most of
                what the heading was doing. The name is still on the row's own tooltip. */}
            {shut ? (
              <div className="mx-auto mb-2 h-px w-6 bg-[#eceae5]" aria-hidden />
            ) : (
              <h2 className="px-3 pb-1 text-overline font-semibold text-[#736e67] uppercase">
                {group.name}
              </h2>
            )}
            {group.items.map((item) => {
              /* Children appear while you are inside the module and while you are on one of
                 them, and at no other time. That is what keeps the rail at sixteen rows: the
                 chapters of a module are context, not destinations you scan past on the way
                 to something else. Search overrides it — a filtered list shows what matched. */
              const inside = active === item.slug || (item.children ?? []).some((c) => c.slug === active)
              const kids = query ? (item.children ?? []) : inside ? (item.children ?? []) : []
              return (
                <div key={item.slug}>
                  <SidebarLink
                    href={`#/${item.slug}`}
                    icon={item.icon}
                    label={item.label}
                    active={active === item.slug}
                    shut={shut}
                  />
                  {kids.length > 0 && (
                    /* Indented against a hairline rather than merely padded, so two levels
                       are legible at a glance instead of reading as a slightly-offset flat
                       list. */
                    <div className="mt-0.5 mb-1 ml-[22px] border-l border-[#eceae5] pl-2">
                      {kids.map((child) => (
                        <SidebarLink
                          key={child.slug}
                          href={`#/${child.slug}`}
                          icon={child.icon}
                          label={child.label}
                          active={active === child.slug}
                          small
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {groups.length === 0 && !shut && (
          <p className="px-3 pt-6 text-small text-[#736e67]">No module matches “{query}”.</p>
        )}
      </div>

      {/* Settings sits below the rule rather than in a group. It is not a module and
          putting it in the list would make it the twenty-first thing a director
          scrolls past looking for Vaccination. It opens a sheet, not a page: nothing
          in it is worth losing the screen behind. */}
      <div className={`shrink-0 border-t border-[#f2f1ed] py-3 ${shut ? 'px-[18px]' : 'px-3'}`}>
        <button
          type="button"
          onClick={() => open({ title: 'Settings', eyebrow: site.zooName, body: <SettingsPanel /> })}
          aria-label={SETTINGS.label}
          title={shut ? SETTINGS.label : undefined}
          className={`flex items-center rounded-[10px] text-left text-small font-medium text-[#3d3a34] transition-colors hover:bg-[#f6f7f6] ${
            shut ? 'size-10 justify-center' : 'w-full gap-3 px-3 py-[9px]'
          }`}
        >
          <SETTINGS.icon size={16} strokeWidth={1.75} className="text-[#736e67]" aria-hidden />
          {!shut && <span className="min-w-0 flex-1 truncate">{SETTINGS.label}</span>}
        </button>
      </div>
    </nav>
  )
}

/**
 * The active row is filled, not merely tinted or ruled: it has to survive being read
 * at a glance from across a desk, and a 1px accent bar does not.
 */
function SidebarLink({
  href,
  icon: Glyph,
  label,
  active,
  small,
  shut,
}: {
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  active: boolean
  /** A child row — quieter, and no glyph tile competing with its parent's. */
  small?: boolean
  /** The rail is collapsed: the glyph centres and the name becomes the tooltip. */
  shut?: boolean
}) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      /* THE NAME STILL REACHES A SCREEN READER WHEN IT IS OFF THE SCREEN. Dropping the span
         would leave the row announced as nothing but its href, so the label moves to
         `aria-label` — and to `title`, which is what gives a mouse the name back on hover. */
      aria-label={shut ? label : undefined}
      title={shut ? label : undefined}
      className={`flex items-center rounded-[10px] transition-colors duration-200 ${
        shut ? 'size-10 justify-center' : `gap-3 px-3 ${small ? 'py-[6px] text-small' : 'py-2 text-body'}`
      } ${active ? 'bg-[#e7f0ea] font-semibold text-[#0a4d3c]' : 'font-medium text-[#3d3a34] hover:bg-[#f6f7f6]'}`}
    >
      <Glyph
        size={small && !shut ? 14 : 16}
        strokeWidth={1.75}
        className={active ? 'text-[#0a4d3c]' : 'text-[#736e67]'}
      />
      {/* NO COUNT BADGE. A folded row used to print how many chapters were under it, on the
          reasoning that the fold should announce itself. Read in place it does not announce a
          fold — it reads as a figure, and a rail of names with a scattering of small numbers
          against them invites the reader to compare numbers that mean nothing to each other.
          The chapters still appear the moment the module is open, which is when they matter. */}
      {!shut && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </a>
  )
}
