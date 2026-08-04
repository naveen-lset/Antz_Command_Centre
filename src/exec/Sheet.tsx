/**
 * Executive module page shell.
 *
 * A module page has no tabs, no chapter chips and no "view more": everything the
 * module aggregates lives in one continuous scroll. The chrome is deliberately
 * almost nothing — a title, a close button, and a hairline once you've scrolled.
 *
 * There is exactly ONE way deeper: a record page, reached from a `More` link.
 * When one is open the sheet grows a back chevron and nothing else — the stack is
 * two levels and cannot become three, so a breadcrumb would never have a third
 * crumb to show. Swipe-down and Escape step back one level; the ✕ leaves for home
 * from either level.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, X } from 'lucide-react'

/** How much of the home screen stays visible above the sheet. */
const PEEK = 'calc(env(safe-area-inset-top, 0px) + 40px)'
const DISMISS_AT = 110

export default function Sheet({
  title,
  eyebrow = 'Command Centre',
  toolbar,
  onClose,
  onBack,
  children,
}: {
  title: string
  eyebrow?: ReactNode
  /**
   * Pinned under the title — the reporting-window switcher, on the pages that have
   * one. It belongs in the header rather than in the scroller: the control that
   * decides what every figure below means must not scroll away from them.
   */
  toolbar?: ReactNode
  onClose: () => void
  /** Present only on a record page — steps back to its module. */
  onBack?: () => void
  children: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)
  const [dy, setDy] = useState(0)
  const [dragging, setDragging] = useState(false)
  const grab = useRef<{ id: number; y: number } | null>(null)

  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  // The home screen behind holds its scroll position while the sheet is up.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  /* Every level starts at the top. Dropping into a record page halfway down the
     module's scroll position would land mid-table with no header in sight. */
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
    setScrolled(false)
  }, [title])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrolled(el.scrollTop > 8))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const close = useCallback(() => {
    setClosing(true)
    window.setTimeout(onClose, 240)
  }, [onClose])

  /* Back where there is a level to go back to, otherwise out. Going back does not
     slide the sheet away — it stays put and its content swaps, which is what makes
     the two levels feel like one page rather than two stacked sheets. */
  const dismiss = useCallback(() => {
    if (onBack) {
      setDy(0)
      onBack()
    } else close()
  }, [onBack, close])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismiss])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, a')) return
    grab.current = { id: e.pointerId, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (grab.current?.id !== e.pointerId) return
    const moved = e.clientY - grab.current.y
    setDy(moved > 0 ? moved : moved / 5)
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (grab.current?.id !== e.pointerId) return
    grab.current = null
    setDragging(false)
    if (dy > DISMISS_AT) dismiss()
    else setDy(0)
  }

  const away = !entered || closing

  return (
    <div className="fixed inset-0 z-40 font-sans" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute inset-0 size-full cursor-default bg-[#0f1210] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: away ? 0 : Math.max(0, 0.2 * (1 - dy / 420)) }}
      />

      <div className="pointer-events-none absolute inset-0 mx-auto max-w-[430px]">
        <section
          className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[22px] bg-white"
          style={{
            top: PEEK,
            transform: away ? 'translateY(100%)' : `translateY(${dy}px)`,
            transition: dragging ? 'none' : 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* The drag area and the toolbar are siblings, not nested. `touch-action:
              none` on an ancestor is intersected down the whole subtree, so a chip
              row inside the drag area could never be panned sideways on touch. */}
          <div
            className="relative z-10 shrink-0 bg-white transition-shadow duration-300"
            style={{ boxShadow: scrolled ? '0 1px 0 rgba(22,21,15,0.08)' : 'none' }}
          >
            <div
              className="touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div className="flex justify-center pt-2.5" aria-hidden>
                <span className="h-[4px] w-9 rounded-full bg-[#16150f]/10" />
              </div>
              <header className={`flex items-center gap-3 px-6 pt-2.5 ${toolbar ? 'pb-3' : 'pb-4'}`}>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="-ml-2 grid size-9 shrink-0 place-items-center rounded-full transition-colors active:bg-[#f7f6f3]"
                    aria-label="Back"
                  >
                    <ChevronLeft size={20} strokeWidth={2} className="text-[#55524a]" aria-hidden />
                  </button>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium tracking-[0.06em] text-[#b3aea6] uppercase">
                    {eyebrow}
                  </span>
                  <h1 className="mt-[3px] truncate text-[21px] leading-7 font-semibold tracking-[-0.02em] text-[#16150f]">
                    {title}
                  </h1>
                </span>
                <button
                  type="button"
                  onClick={close}
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-[#eceae5] transition-colors active:bg-[#f7f6f3]"
                  aria-label="Close"
                >
                  <X size={16} strokeWidth={2} className="text-[#55524a]" aria-hidden />
                </button>
              </header>
            </div>
            {toolbar}
          </div>

          {/* Sage ground with white cards floating on it — the home screen's surface. */}
          <div
            ref={scroller}
            className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#e7f0ea] scrollbar-hidden"
          >
            {/* Keyed on the title so stepping between a module and its records
                remounts the content: swap-in replays, and the reveal-on-scroll
                marks get a fresh observer instead of arriving already-visible. */}
            <div key={title} className="animate-swap-in pt-4 pb-[max(48px,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
