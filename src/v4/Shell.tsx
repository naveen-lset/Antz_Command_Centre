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

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ExecutivePanel } from './ExecPanel'
import { Landscape } from './landscape'

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

        {/* `relative isolate` so the landscape can sit on its own layer behind the
            column's content without escaping the rounded clip. */}
        <div className="content-box relative isolate min-w-0 flex-1 overflow-hidden rounded-[22px] bg-[#e7f0ea]">
          <Landscape />
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
        <p className="text-overline font-medium text-[#9b958b] uppercase">{eyebrow}</p>
        <h1 className="mt-[3px] truncate text-[length:var(--fs-name)] leading-[var(--lh-name)] font-semibold tracking-[-0.4px] text-[#16150f]">
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
  /**
   * THE PANE NO LONGER SLIDES IN AS A BLOCK.
   *
   * It carried `animate-swap-in` — the whole page translating 16px sideways and fading
   * — which was the only page transition there was. Now that the route change itself is
   * animated (`runPageTransition`), a pane that also slid would be two transitions on
   * one navigation: the page arriving, and then the page arriving again inside itself.
   *
   * What replaces it is finer-grained and does the job the block slide was standing in
   * for. `.page-enter` in `index.css` brings the header in first and steps the page's
   * own cards 40ms apart behind it, so a page assembles in the order a reader reads it.
   *
   * THE CLASS TAKES ITSELF OFF. Those stagger delays live on the same `Reveal` elements
   * that fade a card up when it scrolls into view — every `Section` on the page mounts
   * at once and merely waits, held at `opacity-0`, for its turn to be scrolled to. Leave
   * the class on and the delay meant for the entrance is still there twenty seconds
   * later, in front of a card the reader has just scrolled down to.
   *
   * THE CLOCK STARTS WHEN THE CONTENT ARRIVES, NOT WHEN THE PANE DOES, and that
   * distinction is the whole reason this is a poll rather than a `setTimeout` in mount.
   * Module pages are lazily loaded: measured against a cold chunk, the pane mounted at
   * 0ms and the first card appeared at 450ms. A fixed 600ms from mount left the
   * entrance 150ms of overlap on a good day and none at all on a slow network — the
   * stagger would simply not happen, intermittently, which is worse than not having it.
   */
  const pane = useRef<HTMLDivElement>(null)
  const [entering, setEntering] = useState(true)

  useEffect(() => {
    let raf = 0
    let timer = 0
    /* Give up after ~3s. A page that has rendered nothing by then has a problem the
       motion layer should not be waiting on. */
    const deadline = performance.now() + 3000
    const look = () => {
      if (pane.current?.querySelector('.page-stack')) {
        /* 160ms of stagger plus a 320ms animation, and a little air. */
        timer = window.setTimeout(() => setEntering(false), 600)
        return
      }
      if (performance.now() > deadline) {
        setEntering(false)
        return
      }
      raf = requestAnimationFrame(look)
    }
    raf = requestAnimationFrame(look)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div ref={pane} className={`${entering ? 'page-enter' : ''} pt-1 pb-10`}>
      {children}
    </div>
  )
}

/**
 * The phone's frame — the page background and the container query context.
 *
 * The header used to live in here, which meant the phone and the shell rendered two different
 * headers with two different sets of things in them. The router now renders one `ScopeHeader`
 * for both tiers, so this is just the frame: the gradient ground, the `content-box` container
 * and the safe-area padding. One header, two frames — rather than two of each.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="content-box relative isolate min-h-dvh font-sans"
      style={{ background: 'linear-gradient(180deg, #ddeae3 0%, #c6ddd1 100%)' }}
    >
      <Landscape />
      <div className="tier pb-[max(48px,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  )
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
 *
 * Retained for any surface that still wants its own header; the router uses `PhoneFrame` plus
 * the shared `ScopeHeader` instead.
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
            <p className="truncate text-overline font-medium text-[#9b958b] uppercase">{eyebrow}</p>
            <h1 className="mt-[3px] truncate text-h2 font-semibold text-[#16150f]">
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
