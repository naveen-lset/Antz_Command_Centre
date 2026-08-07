/**
 * The sheet — one component, two geometries, any depth.
 *
 * The brief asks for a bottom sheet on the phone and a side sheet on tablet and
 * desktop, and for both to nest. This is that, with three decisions worth stating.
 *
 * ONE SHEET, NOT A STACK OF THEM. Going four levels deep — alert → animal, or
 * Overall → Site → Species → Animal — does not slide four panels over each other.
 * The sheet stays exactly where it is and its CONTENT swaps, with a back chevron and
 * a breadcrumb in the eyebrow. V3's module sheet already worked this way for its two
 * levels and the reasoning holds harder at four: stacked panels put the reader in a
 * pile of overlays, each hiding the one that explains it, and every level costs a
 * dismissal to get out of. Here one gesture goes back one level, wherever you are.
 *
 * THE BROWSER'S BACK BUTTON IS THE SAME GESTURE. Each level pushes a history entry
 * carrying its own depth, and `popstate` truncates the stack to whatever depth the
 * entry it landed on claims. That makes the Android back gesture, the desktop back
 * button, Escape, the chevron and the swipe-down all one behaviour rather than five
 * — and it means a level can never be popped twice or half-popped, because the
 * history entry is the source of truth rather than a counter this file keeps.
 *
 * IT IS NOT A ROUTE. A sheet is a look at something, not a place — the brief's "do
 * not open unnecessary pages" and "never navigate unnecessarily". Modules stay real
 * routes; what you opened to peek at inside one does not.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { GROUND_GRADIENT } from '../exec/system'
import { useMediaQuery } from '../hooks/useMediaQuery'

export interface SheetSpec {
  title: string
  /** One short line above the title — a count, a window, a status. Never a sentence. */
  eyebrow?: string
  /** Rendered inside the scroller, on the sage ground, as a stack of cards. */
  body: ReactNode
}

interface SheetApi {
  /** Push a level. */
  open: (spec: SheetSpec) => void
  /** Pop one level — the chevron, Escape, swipe-down and the browser back button. */
  back: () => void
  /** Leave the sheet entirely, from any depth. */
  close: () => void
  depth: number
}

const Ctx = createContext<SheetApi>({ open: () => {}, back: () => {}, close: () => {}, depth: 0 })

export const useSheet = () => useContext(Ctx)

/** How much of the screen behind stays visible above a phone sheet. */
const PEEK = 'calc(env(safe-area-inset-top, 0px) + 44px)'
const DISMISS_AT = 110

export function SheetProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SheetSpec[]>([])

  /* Truncate to the depth the landed-on history entry declares, rather than popping
     one per event. `history.go(-3)` fires a single popstate in every browser, so a
     "pop one" handler would leave two levels stranded. */
  useEffect(() => {
    const onPop = () => {
      const depth = (window.history.state?.antzSheet as number | undefined) ?? 0
      setStack((s) => (s.length > depth ? s.slice(0, depth) : s))
    }
    const onHash = () => setStack([])
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  const api = useMemo<SheetApi>(
    () => ({
      depth: stack.length,
      open: (spec) => {
        setStack((s) => {
          window.history.pushState({ antzSheet: s.length + 1 }, '')
          return [...s, spec]
        })
      },
      back: () => window.history.back(),
      close: () => {
        /* One `go` for however deep we are, so the entries this sheet added are all
           unwound — otherwise closing from level four would leave three dead entries
           that the back button then walks back into. */
        setStack((s) => {
          if (s.length) window.history.go(-s.length)
          return s
        })
      },
    }),
    [stack.length],
  )

  return (
    <Ctx.Provider value={api}>
      {children}
      {stack.length > 0 && <SheetHost stack={stack} onBack={api.back} onClose={api.close} />}
    </Ctx.Provider>
  )
}

function SheetHost({
  stack,
  onBack,
  onClose,
}: {
  stack: SheetSpec[]
  onBack: () => void
  onClose: () => void
}) {
  /* The same threshold the shell uses, so the sheet becomes a side panel exactly
     when the sidebar appears — one tier boundary in the product, not two. */
  const side = useMediaQuery('(min-width: 768px)')
  const top = stack[stack.length - 1]
  const deep = stack.length > 1

  const scroller = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [entered, setEntered] = useState(false)
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

  /* The screen behind holds its scroll position while the sheet is up. */
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  /* Every level starts at the top. Landing halfway down a species list because the
     level above happened to be scrolled there is disorienting in a way that is hard
     to recover from — there is no header in sight to say where you are. */
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
    setScrolled(false)
    setDy(0)
  }, [stack.length, top.title])

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

  const dismiss = useCallback(() => {
    if (stack.length > 1) onBack()
    else onClose()
  }, [stack.length, onBack, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismiss])

  /* Swipe-down is a phone gesture and a phone gesture only. On a side sheet the
     drag axis would be horizontal and the sheet is dismissed by the scrim or the
     chevron, both of which are within reach of a cursor. */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (side) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, a, input')) return
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

  const away = !entered

  const header = (
    <div
      className="relative z-10 shrink-0 bg-white transition-shadow duration-300"
      style={{ boxShadow: scrolled ? '0 1px 0 rgba(22,21,15,0.08)' : 'none' }}
    >
      <div
        className={side ? undefined : 'touch-none'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {!side && (
          <div className="flex justify-center pt-2.5" aria-hidden>
            <span className="h-[4px] w-9 rounded-full bg-[#16150f]/10" />
          </div>
        )}
        <header className={`flex items-center gap-3 px-5 pb-4 ${side ? 'pt-5' : 'pt-2.5'}`}>
          {deep && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-2 grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-[#f7f6f3] active:bg-[#f2f1ed]"
              aria-label="Back"
            >
              <ChevronLeft size={20} strokeWidth={2} className="text-[#55524a]" aria-hidden />
            </button>
          )}
          <span className="min-w-0 flex-1">
            {/* The eyebrow is the trail. Four levels deep it is the only thing that
                says which species of which site this is, and it costs one line. */}
            <span className="block truncate text-[11px] font-medium tracking-[0.06em] text-[#b3aea6] uppercase">
              {top.eyebrow ?? 'Command Centre'}
            </span>
            <h1 className="mt-[3px] truncate text-[21px] leading-7 font-semibold tracking-[-0.02em] text-[#16150f]">
              {top.title}
            </h1>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[#eceae5] transition-colors hover:bg-[#f7f6f3] active:bg-[#f2f1ed]"
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} className="text-[#55524a]" aria-hidden />
          </button>
        </header>
      </div>
    </div>
  )

  const scrollerEl = (
    <div
      ref={scroller}
      className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hidden"
      style={{ background: GROUND_GRADIENT }}
    >
      {/* `content-box` + `tier` so the cards inside a sheet read their own column
          width, exactly as they do in the page. A side sheet is ~440px wide on a
          desktop whose content column is 900 — sizing its figures off the window
          would put desktop type into a phone-width column. */}
      <div className="content-box">
        <div className="tier">
          {/* Keyed on the depth and title so stepping a level replays the swap-in
              and hands the reveal-on-scroll marks a fresh observer. */}
          <div key={`${stack.length}-${top.title}`} className="animate-swap-in pt-4 pb-[max(48px,env(safe-area-inset-bottom))]">
            {top.body}
          </div>
        </div>
      </div>
    </div>
  )

  if (side) {
    return (
      <div className="fixed inset-0 z-40 font-sans" role="dialog" aria-modal="true" aria-label={top.title}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute inset-0 size-full cursor-default bg-[#0f1210] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ opacity: away ? 0 : 0.22 }}
        />
        <section
          /* Width is clamped rather than a percentage: below ~380px the two-column
             blocks inside stop fitting, and past ~520px the sheet starts competing
             with the page it is explaining rather than annotating it. */
          className="absolute inset-y-0 right-0 flex w-[clamp(380px,34vw,520px)] max-w-full flex-col overflow-hidden bg-white shadow-[-8px_0_40px_rgba(15,18,16,0.14)]"
          style={{
            transform: away ? 'translateX(100%)' : 'translateX(0)',
            transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {header}
          {scrollerEl}
        </section>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 font-sans" role="dialog" aria-modal="true" aria-label={top.title}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 size-full cursor-default bg-[#0f1210] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: away ? 0 : Math.max(0, 0.22 * (1 - dy / 420)) }}
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
          {header}
          {scrollerEl}
        </section>
      </div>
    </div>
  )
}
