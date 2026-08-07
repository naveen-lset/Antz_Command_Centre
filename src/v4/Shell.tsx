/**
 * The tablet and desktop shell — sidebar, content, executive panel.
 *
 * THREE COLUMNS, ONE SCROLLBAR. The columns are a single flex row and each side
 * column is `sticky`, so the page keeps one scroll position. Independent per-column
 * scrolling looks identical until the content is short, at which point three scroll
 * positions become three things that can disagree.
 *
 * THE CONTENT COLUMN IS THE MEASURING STICK. `content-box` makes it a container and
 * `tier` is the child the container queries in `index.css` are allowed to restyle, so
 * every card inside sizes itself off the room it actually has rather than off the
 * window. This is load-bearing rather than tidy: a 1280px desktop hands the content
 * column ~600px once the rail and the panel take their share, while a 1194px tablet
 * landscape hands it ~900px. Sizing off the window would put desktop type into the
 * narrower of the two columns.
 */

import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ExecutivePanel } from './ExecPanel'

export function AppShell({
  route,
  panel,
  children,
}: {
  route: string
  /** Desktop only — there is no width for a third column below 1280. */
  panel: boolean
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-[#e7f0ea] font-sans">
      <div className="flex items-start gap-[var(--shell-gap)] p-[var(--shell-pad)]">
        <Sidebar route={route} />

        <div className="content-box min-w-0 flex-1 overflow-hidden rounded-[22px] bg-[#e7f0ea]">
          <div className="tier">{children}</div>
        </div>

        {panel && <ExecutivePanel />}
      </div>
    </div>
  )
}

/**
 * Header for a module or record page rendered in the content column.
 *
 * There is no close button and, at this width, no back button to the home: the sidebar
 * already holds that door open, and a second way out beside a permanent one is chrome.
 * A record page keeps its single step back to the module it came from.
 */
export function ModuleHeader({
  title,
  eyebrow,
  onBack,
}: {
  title: string
  eyebrow: string
  onBack?: () => void
}) {
  return (
    <header className="flex items-center gap-3 px-[var(--gutter-lg)] pt-7 pb-5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/70"
        >
          <ChevronLeft size={20} strokeWidth={2} className="text-[#55524a]" aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-[0.06em] text-[#9b958b] uppercase">{eyebrow}</p>
        <h1 className="mt-[3px] truncate text-[length:var(--fs-name)] leading-[1.2] font-semibold tracking-[-0.02em] text-[#16150f]">
          {title}
        </h1>
      </div>
    </header>
  )
}

/**
 * A module page in the content column, keyed by the caller on the route so the
 * entrance animation and the reveal-on-scroll observers replay when you move between
 * modules — without the key, stepping from Mortality to Health would swap the numbers
 * under a page that never announced it had changed.
 */
export function ModulePane({ children }: { children: ReactNode }) {
  return <div className="animate-swap-in pt-1 pb-10">{children}</div>
}

/**
 * The phone's module page.
 *
 * V3 rendered a module as a bottom sheet over the home. V4 cannot: the sheet layer is
 * now the peek layer — alerts, approvals, drill-downs, four levels of it — and putting
 * a whole module underneath a peek would mean two different things arriving with the
 * same gesture and the same geometry. So on a phone a module is a page, with a back
 * chevron to the home, and the sheet stays the thing you open on top of wherever
 * you are.
 */
export function PhonePage({
  title,
  eyebrow,
  onBack,
  toolbar,
  children,
}: {
  title: string
  eyebrow: string
  onBack: () => void
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="content-box min-h-dvh font-sans" style={{ background: 'linear-gradient(180deg, #ddeae3 0%, #c6ddd1 100%)' }}>
      <div className="tier">
        <header className="flex items-center gap-3 px-[var(--gutter-lg)] pt-[max(20px,env(safe-area-inset-top))] pb-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-2 grid size-9 shrink-0 place-items-center rounded-full transition-colors active:bg-white/60"
          >
            <ChevronLeft size={20} strokeWidth={2} className="text-[#55524a]" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium tracking-[0.06em] text-[#9b958b] uppercase">{eyebrow}</p>
            <h1 className="mt-[3px] truncate text-[21px] leading-7 font-semibold tracking-[-0.02em] text-[#16150f]">
              {title}
            </h1>
          </div>
        </header>
        {toolbar}
        <div className="animate-swap-in pb-[max(48px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}
