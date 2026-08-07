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
 */

import { useMemo, useState } from 'react'
import { LayoutGrid, Search, X } from 'lucide-react'
import { EVERYTHING, SETTINGS, activeSlug, filterNav } from './nav'
import { site } from './data'
import { useSheet } from './sheet'
import { SettingsPanel } from './Settings'

export function Sidebar({ route }: { route: string }) {
  const [query, setQuery] = useState('')
  const groups = useMemo(() => filterNav(query), [query])
  const active = activeSlug(route)
  const onHome = active === ''
  const { open } = useSheet()

  return (
    <nav
      aria-label="Modules"
      className="sticky top-[var(--shell-pad)] flex max-h-[calc(100dvh-var(--shell-pad)*2)] w-[var(--rail)] shrink-0 flex-col overflow-hidden rounded-[20px] bg-white"
    >
      <div className="shrink-0 px-4 pt-5 pb-3">
        <p className="px-1 text-[15px] font-semibold tracking-[-0.01em] text-[#1c1a16]">{site.org}</p>
        <p className="mt-0.5 px-1 text-[12px] text-[#9b958b]">{site.zooName}</p>

        <label className="mt-4 flex items-center gap-2 rounded-[11px] bg-[#f4f6f4] px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#37bd69]/35">
          <Search size={15} strokeWidth={2} className="shrink-0 text-[#9b958b]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules"
            aria-label="Search modules"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[#1c1a16] outline-none placeholder:text-[#9b958b] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="grid size-5 shrink-0 place-items-center rounded-full text-[#9b958b] transition-colors hover:bg-[#e7ebe8] hover:text-[#3d3a34]"
            >
              <X size={12} strokeWidth={2.5} aria-hidden />
            </button>
          )}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hidden px-3 pb-2">
        <SidebarLink href="#/" icon={LayoutGrid} label="Home" active={onHome} />
        {/* The entity index. Beside Home rather than in a module group, because browsing things is
            the other axis of the product — see `nav.ts`. */}
        <SidebarLink
          href={`#/${EVERYTHING.slug}`}
          icon={EVERYTHING.icon}
          label={EVERYTHING.label}
          active={active === EVERYTHING.slug || active === 'browse' || active === 'e'}
        />

        {groups.map((group) => (
          <div key={group.name} className="mt-4 first:mt-3">
            <h2 className="px-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.09em] text-[#9b958b] uppercase">
              {group.name}
            </h2>
            {group.items.map((item) => (
              <SidebarLink
                key={item.slug}
                href={`#/${item.slug}`}
                icon={item.icon}
                label={item.label}
                active={active === item.slug}
              />
            ))}
          </div>
        ))}

        {groups.length === 0 && (
          <p className="px-3 pt-6 text-[13px] text-[#9b958b]">No module matches “{query}”.</p>
        )}
      </div>

      {/* Settings sits below the rule rather than in a group. It is not a module and
          putting it in the list would make it the twenty-first thing a director
          scrolls past looking for Vaccination. It opens a sheet, not a page: nothing
          in it is worth losing the screen behind. */}
      <div className="shrink-0 border-t border-[#f2f1ed] px-3 py-3">
        <button
          type="button"
          onClick={() => open({ title: 'Settings', eyebrow: site.zooName, body: <SettingsPanel /> })}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-[9px] text-left text-[13.5px] font-medium text-[#3d3a34] transition-colors hover:bg-[#f6f7f6]"
        >
          <SETTINGS.icon size={16} strokeWidth={1.75} className="text-[#9b958b]" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{SETTINGS.label}</span>
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
}: {
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  active: boolean
}) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-[10px] px-3 py-[9px] text-[13.5px] transition-colors duration-200 ${
        active ? 'bg-[#e7f0ea] font-semibold text-[#0a4d3c]' : 'font-medium text-[#3d3a34] hover:bg-[#f6f7f6]'
      }`}
    >
      <Glyph size={16} strokeWidth={1.75} className={active ? 'text-[#0a4d3c]' : 'text-[#9b958b]'} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </a>
  )
}
