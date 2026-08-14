/**
 * The tablet and desktop shell — sidebar and content.
 *
 * TWO COLUMNS, ONE SCROLLBAR. The columns are a single flex row and the sidebar is
 * `sticky`, so the page keeps one scroll position. Independent per-column scrolling
 * looks identical until the content is short, at which point two scroll positions
 * become two things that can disagree.
 *
 * THE CONTENT COLUMN IS THE MEASURING STICK. `content-box` makes it a container and
 * `tier` is the child the container queries in `index.css` are allowed to restyle, so
 * every card inside sizes itself off the room it actually has rather than off the
 * window. This is load-bearing rather than tidy: sizing off the window would put
 * desktop type into a column that may be much narrower than the window suggests.
 *
 * THE EXECUTIVE PANEL IS GONE. A third column carried the weather, the decision queues,
 * the risk list and a recent-activity feed, and appeared at 1280px by taking 296px from
 * the content. Removed on request. Two consequences worth knowing: the content column is
 * now the full width beside the sidebar at every tier, so a desktop reader crosses the
 * 900px container step and gets the wider type scale; and `ExecPanel.tsx` is still on
 * disk, simply not rendered, so restoring it is one import and one line here.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'

/**
 * The page's ground — the sage the whole product stands on, and on the home the light green
 * carried down out of the illustration.
 *
 * ONE GROUND FOR THE WHOLE WINDOW. Painted on the content column instead, the home's descent
 * from canopy green back to sage made the column seventeen levels greener than the page
 * around it — a tinted panel floating on a paler ground, with the twenty-pixel shell margin
 * drawing its outline. That is exactly the "separate container behind every section" this
 * work exists to remove. So the shell paints it edge to edge and the column carries none.
 *
 * `--env-offset` is the distance from wherever this layer starts to the top of the content
 * column, because the column's top is what `--env-top` is measured from. Zero on the phone,
 * where the frame IS the column; the shell's own padding under the shell.
 *
 * TWO WAYS OF GETTING BEHIND THE CONTENT, and the difference is not arbitrary.
 *
 * In the phone frame it is `-z-20`, under `Landscape`'s `-z-10` and under the page, which is
 * in flow and therefore paints above every negative layer. That frame already isolates, so a
 * negative layer has a stacking context to be negative INSIDE.
 *
 * The shell's does not, and must not. A negative z-index resolves against the nearest
 * ancestor stacking context, and the shell's outer element is not one — so `-z-20` there
 * escapes to the root and paints UNDERNEATH the shell's own background colour, which is to
 * say it does not paint at all. Making the shell isolate would fix that and would also trap
 * the search overlay's `z-50` inside it, putting an open sheet's `z-40` — a sibling out in
 * the root — on top of a search the reader has just opened. So the shell's ground carries no
 * z-index and relies on paint order instead: it is the first child, and the column row after
 * it is `relative`, so two positioned siblings paint in the order they are written.
 *
 * Either way it is `pointer-events-none` and `aria-hidden`: it can never take a tap or reach
 * a screen reader.
 */
function Ground({ home, shell }: { home?: boolean; shell?: boolean }) {
  return (
    <div
      aria-hidden
      className={`page-ground${home ? ' is-home' : ''}${shell ? ' is-shell' : ''} pointer-events-none absolute inset-0 ${
        shell ? '' : '-z-20'
      }`}
    />
  )
}

export function AppShell({
  route,
  children,
}: {
  route: string
  children: ReactNode
}) {
  return (
    /* `relative` so the ground can be a layer over the whole window rather than a
       background on the column — see `Ground` above for why that distinction matters. */
    <div className="relative min-h-dvh bg-[var(--env-ground)] font-sans">
      <Ground home={route === '#/'} shell />
      {/* `mx-auto` + `--shell-max` is the whole of the very-wide-screen behaviour: past
          1800px the columns stop growing and the window's extra width becomes equal
          margin either side. Capping the CONTENT column alone would have left the rail
          pinned to the screen edge with a gap in the middle, which is the one
          arrangement worse than stretching. */}
      {/* `relative` is load-bearing: it puts this row and the ground above it in the same
          positioned-sibling paint order, which is how the ground gets behind the page
          without a z-index — see `Ground`. */}
      <div className="relative mx-auto flex max-w-[var(--shell-max)] items-start gap-[var(--shell-gap)] p-[var(--shell-pad)]">
        <Sidebar route={route} />

        {/* `relative isolate` so the landscape can sit on its own layer behind the
            column's content without escaping the rounded clip.

            NO BACKGROUND ON THE COLUMN. The ground is painted on the shell above, across the
            whole window, so the column and the twenty pixels of shell margin around it are
            the same surface at every height. The rounded corners stay and now have nothing
            to be a corner between — which is the intent: the column is a measuring stick and
            a clip, not a panel. */}
        <div className="content-box relative isolate min-w-0 flex-1 overflow-hidden rounded-[22px]">
          {/* NO SCENERY LAYER, ON ANY ROUTE.
              It came off content pages first, where at 5–10% it read as noise through the
              cards — trees and bird tracks showing in the gaps between sections. It is now
              off the home too, for the same reason one tier up: the page below the
              illustration is the GROUND'S SHADE and nothing else. Flat vector foliage under a
              photograph reads as a second, cruder drawing at any strength you can actually
              see, and as smudges at any strength you cannot. `Landscape` and its `.env-home`
              rules are kept — remounting is this one line. */}
          <div className="tier">{children}</div>
        </div>
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
    <header className="flex items-center gap-3 px-[var(--gutter)] pt-7 pb-5">
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
        <p className="text-overline font-medium text-[#736e67] uppercase">{eyebrow}</p>
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
export function PhoneFrame({ home, children }: { home?: boolean; children: ReactNode }) {
  return (
    /**
     * THE SAME GROUND AS THE SHELL, rather than the `#ddeae3 → #c6ddd1` gradient this frame
     * used to carry on its own. Two frames with two different grounds is how the phone ended
     * up with the illustration's fade finishing on `#e7f0ea` over a ground fourteen levels
     * darker — a pale strip exactly where the artwork was meant to disappear. One `Ground`
     * for both tiers, and the direction the old gradient had is now the home's own descent
     * from the canopy colour back to the settled sage.
     */
    <div className="content-box relative isolate min-h-dvh bg-[var(--env-ground)] font-sans">
      {/* Same split as the shell above: on the home the ground is shaped around the foot of
          the illustration, everywhere else it starts at the top. And, as in the shell, no
          scenery layer on either — see the note there. */}
      <Ground home={home} />
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
        <header className="flex items-center gap-3 px-[var(--gutter)] pt-[max(20px,env(safe-area-inset-top))] pb-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-2 grid size-9 shrink-0 place-items-center rounded-full transition-colors active:bg-white/60"
          >
            <ChevronLeft size={20} strokeWidth={2} className="text-[#55524a]" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-overline font-medium text-[#736e67] uppercase">{eyebrow}</p>
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
