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
  useLayoutEffect,
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
/** Dragged this far down and letting go dismisses, however slowly it was moved. */
const DISMISS_AT = 110
/**
 * Or dragged at this speed, in px/ms, however short the distance. A flick is a
 * complete instruction and waiting for it to also cover 110px is what makes a sheet
 * feel like it is arguing with the finger.
 */
const FLING = 0.55
/** Slack below which a short sheet is not worth resting short. See `rest` in the host. */
const EXPAND_FROM = 140
/** Drag up by this much from a short rest and the sheet commits to full height. */
const EXPAND_AT = 44
/**
 * How dark the world goes behind a sheet.
 *
 * DIMMING, NOT BLUR. A backdrop-filter over the whole page is a read of every pixel
 * behind the sheet on every frame it animates, on a phone, for depth that a scrim
 * already provides. 0.22 was too little to separate a white sheet from a white card
 * underneath it; this is enough to put the page behind glass without hiding it, which
 * is the point of a sheet that only covers part of the screen.
 *
 * Lives here and not as a CSS custom property because the drag reads it as a NUMBER
 * to thin the scrim as the sheet travels, and two declarations of one value is how
 * they drift apart.
 */
const SCRIM = 0.38

/**
 * How long the host stays mounted after its last level is popped.
 *
 * Must be at least `--dur-emphasis-out`. It is a literal rather than a read of the
 * custom property because this is a safety net for React's unmount, not a duration a
 * reader perceives — the sheet is already gone from view when it fires.
 */
const EXIT_MS = 320

export function SheetProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SheetSpec[]>([])

  /**
   * THE SHEET HAD NO EXIT. `{stack.length > 0 && <SheetHost/>}` meant the last level
   * being popped removed the host from the tree on that frame — the sheet rose over
   * 360ms and then vanished between two frames, which is the single most abrupt
   * moment in the product and the one that happens most often.
   *
   * The fix is a held copy. When the stack empties, the levels it had are kept here
   * for the length of the exit so the host has something to render while it slides
   * out, and are dropped after. `leaving` is what tells the host to animate away
   * rather than to sit still.
   */
  const [closing, setClosing] = useState<SheetSpec[] | null>(null)
  const previous = useRef<SheetSpec[]>([])
  const unmountAt = useRef(0)

  /**
   * THE UNMOUNT TIMER IS ARMED ONCE PER DISMISSAL, and that is load-bearing rather
   * than tidy.
   *
   * This effect can run TWICE for a single dismissal. Assigning `location.hash` fires
   * both `popstate` and `hashchange` in Chrome, and this provider empties the stack on
   * each — with a different `[]` every time, so React sees two distinct states and
   * renders twice. The first version cancelled its timer in a dep-change cleanup and
   * re-armed on the next run; the second run found nothing left to close, returned
   * early, and never re-armed. The sheet then stayed mounted permanently over the page
   * it had been dismissed from, with `body { overflow: hidden }` still on — measured
   * still on screen 2.6 seconds after navigating away, and the page unscrollable.
   *
   * So the timer lives in a ref, is only ever armed when none is pending, and is only
   * cancelled by the provider actually going away.
   */
  useEffect(() => {
    if (stack.length) {
      previous.current = stack
      /* Re-opened before the exit finished — drop the held copy so the fresh stack is
         what renders, and so the host is not asked to leave and arrive at once. */
      window.clearTimeout(unmountAt.current)
      unmountAt.current = 0
      if (closing) setClosing(null)
      return
    }

    if (!previous.current.length && !closing) return
    if (previous.current.length) {
      setClosing(previous.current)
      previous.current = []
    }
    if (!unmountAt.current) {
      unmountAt.current = window.setTimeout(() => {
        unmountAt.current = 0
        setClosing(null)
      }, EXIT_MS)
    }
  }, [stack, closing])

  useEffect(() => () => window.clearTimeout(unmountAt.current), [])

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

  /**
   * THE HISTORY CALLS MUST NOT LIVE INSIDE THE STATE UPDATER.
   *
   * They did, and it was a real bug rather than a style point: React invokes an
   * updater twice under StrictMode, so one `open()` pushed TWO history entries while
   * the stack grew by one. `back()` then popped to an entry still claiming depth 1,
   * the truncation was a no-op, and the sheet would not close — selecting a site from
   * the filter left its own sheet sitting on screen.
   *
   * A ref carries the current depth so the push can happen outside, where a double
   * render cannot double it.
   */
  const depth = useRef(0)
  depth.current = stack.length

  const api = useMemo<SheetApi>(
    () => ({
      depth: stack.length,
      open: (spec) => {
        /* Spread the entry we are on. A sheet level adds `antzSheet` to the history
           state; it must not erase `antzNav`, which is how `ScopeProvider` tells a
           step back from a step onward — see the note there. */
        window.history.pushState({ ...window.history.state, antzSheet: depth.current + 1 }, '')
        setStack((s) => [...s, spec])
      },
      back: () => window.history.back(),
      /* One `go` for however deep we are, so the entries this sheet added are all
         unwound — otherwise closing from level four would leave three dead entries
         that the back button then walks back into. */
      close: () => {
        if (depth.current) window.history.go(-depth.current)
      },
    }),
    [stack.length],
  )

  const shown = stack.length ? stack : closing

  return (
    <Ctx.Provider value={api}>
      {children}
      {shown && (
        /* DELIBERATELY NOT KEYED on open-versus-closing. The host has to be the same
           element across the exit or there is nothing on screen to animate from, and
           keeping it also makes the exit interruptible: tap something new while the
           sheet is sliding out and `leaving` flips back to false, so it returns from
           wherever it had got to instead of restarting from off-screen. */
        <SheetHost stack={shown} leaving={!stack.length} onBack={api.back} onClose={api.close} />
      )}
    </Ctx.Provider>
  )
}

function SheetHost({
  stack,
  leaving,
  onBack,
  onClose,
}: {
  stack: SheetSpec[]
  /** The stack has emptied and this host is animating out before unmounting. */
  leaving: boolean
  onBack: () => void
  onClose: () => void
}) {
  /* The same threshold the shell uses, so the sheet becomes a side panel exactly
     when the sidebar appears — one tier boundary in the product, not two. */
  const side = useMediaQuery('(min-width: 768px)')
  const top = stack[stack.length - 1]
  const deep = stack.length > 1

  const scroller = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const scrim = useRef<HTMLButtonElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [entered, setEntered] = useState(false)

  /**
   * THE RESTING OFFSET — how far down the sheet sits when what is in it is short.
   *
   * Every sheet used to open to the same height: the full screen bar 44px, whether it
   * held a forty-row species list or four lines about one enclosure. The brief calls
   * that out and it is the right call — a sheet is a peek, and a peek that covers the
   * screen has stopped being one.
   *
   * The resting position is a TRANSFORM, not a height. Animating the box between two
   * heights re-lays-out its contents on every frame of every open; translating a
   * full-height panel down by the slack instead is a compositor-only change, and the
   * arithmetic works out so the content still ends exactly at the bottom of the screen:
   *
   *   content top    = PEEK + rest
   *   content bottom = PEEK + rest + natural
   *                  = PEEK + (available − natural) + natural
   *                  = PEEK + available          ← the bottom of the viewport
   *
   * `EXPAND_FROM` keeps it honest: below that much slack the sheet is near enough to
   * full that resting short would read as a misaligned full sheet rather than as a
   * deliberate smaller one, and stepping between levels of similar length would make
   * it twitch. Long content rests at 0 and behaves exactly as it always has.
   */
  const [rest, setRest] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const restRef = useRef(0)
  restRef.current = expanded ? 0 : rest

  const dragging = useRef(false)
  const grab = useRef<{ id: number; y: number; last: number; lastAt: number; speed: number } | null>(null)

  /* +1 stepping in, −1 stepping out, 0 for a re-render at the same depth. Read during
     render rather than in an effect: the class has to be on the element on the frame it
     first paints, and an effect lands a frame after that. */
  const wasDeep = useRef(stack.length)
  const step = stack.length - wasDeep.current
  wasDeep.current = stack.length

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

  /* Re-measured per level, because each level holds a different amount. A side sheet
     is a full-height column by design and never rests short. */
  useEffect(() => {
    if (side) {
      setRest(0)
      return
    }
    const box = panel.current
    const inner = content.current
    if (!box || !inner) return

    const measure = () => {
      const available = box.clientHeight
      const natural = (box.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0
      const slack = available - (natural + inner.offsetHeight)
      setRest(slack > EXPAND_FROM ? slack : 0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [side, stack.length, top.title])

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
    /* A level opens at ITS OWN resting height, not at whatever the level above was
       expanded to. Stepping from a long species list into one animal and staying
       full-screen would hide the change of subject the shorter sheet is there to make. */
    setExpanded(false)
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

  /**
   * THE DRAG IS WRITTEN STRAIGHT TO THE ELEMENT, not through React state.
   *
   * It used to `setDy` on every pointermove, which re-rendered the host — and the host
   * renders the whole sheet, header and body and every chart in it — once per frame of
   * a gesture whose entire job is to move one element by one transform. On a phone
   * dragging a species list that is a re-render of forty rows per frame to move a
   * panel the compositor could have moved for free.
   *
   * Nothing in here calls a setter, so React does not re-render mid-gesture and the
   * inline styles written below survive until the finger lifts.
   *
   * WRITING BACK IS THE HARD HALF, and getting it wrong is invisible until you drag.
   * The obvious release — blank the inline styles and let React take over — does not
   * work, because React does not re-apply a style whose value it believes it has
   * already set. Clearing `transform` therefore left the sheet with NO transform (a
   * collapsed sheet snapped to full height), clearing `transition` left it with none
   * (the spring-back was instant, and so was the close), and clearing the scrim's
   * `opacity` dropped it to the default 1 — a full black screen after every drag.
   * Measured, all three at once: `transform: none, transition: all 0s, opacity: 1`.
   *
   * So the release WRITES THE RESTING VALUES rather than removing them, from the very
   * same strings the JSX below uses. React's belief and the element then agree, and
   * whichever of the two writes last writes the same thing.
   */
  const away = !entered || leaving
  const restingY = away ? '100%' : `${expanded ? 0 : rest}px`
  const restingTransform = `translateY(${restingY})`
  const restingScrim = away ? 0 : SCRIM
  /* ARRIVING TAKES LONGER THAN LEAVING. A sheet coming up is new information and is
     given the room to be read as arriving; a sheet going away has already been dealt
     with, and every millisecond it spends leaving is a millisecond the reader is
     waiting to get back to the page. Both curves are the house's. */
  const travel = `transform ${away ? 'var(--dur-emphasis-out) var(--ease-in)' : 'var(--dur-emphasis) var(--ease-out)'}`
  const veilFade = `opacity ${away ? 'var(--dur-emphasis-out)' : 'var(--dur-emphasis)'} var(--ease-out)`

  const applyY = (y: number) => {
    const box = panel.current
    if (box) box.style.transform = `translateY(${y}px)`
    const veil = scrim.current
    /* The scrim thins with how far the sheet has been dragged FROM ITS RESTING
       POSITION, not with its absolute offset. Measured from zero, a sheet already
       resting 396px down began its drag with the scrim at nothing — the page behind
       went bright the instant a finger touched a short sheet. */
    if (veil) veil.style.opacity = String(Math.max(0, SCRIM * (1 - (y - restRef.current) / 420)))
  }

  const settle = () => {
    const box = panel.current
    if (box) {
      box.style.transition = travel
      box.style.transform = restingTransform
    }
    const veil = scrim.current
    if (veil) {
      veil.style.transition = veilFade
      veil.style.opacity = String(restingScrim)
    }
  }

  /* Swipe-down is a phone gesture and a phone gesture only. On a side sheet the
     drag axis would be horizontal and the sheet is dismissed by the scrim or the
     chevron, both of which are within reach of a cursor. */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (side) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, a, input')) return
    grab.current = { id: e.pointerId, y: e.clientY, last: e.clientY, lastAt: performance.now(), speed: 0 }
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    if (panel.current) panel.current.style.transition = 'none'
    if (scrim.current) scrim.current.style.transition = 'none'
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = grab.current
    if (g?.id !== e.pointerId) return

    /* Speed is sampled BETWEEN MOVES and kept. Taking it at pointerup does not work:
       the up event fires at the same coordinate as the last move, so the reading is
       always ~0 and no flick would ever be recognised. */
    const now = performance.now()
    g.speed = (e.clientY - g.last) / Math.max(1, now - g.lastAt)
    g.last = e.clientY
    g.lastAt = now

    const moved = e.clientY - g.y
    const from = restRef.current
    /* Downward the sheet tracks the finger exactly. Upward it does not: past full
       height there is nothing above to reveal, so it takes a fifth of the movement —
       the rubber band that says "this is as far as it goes" without refusing the
       gesture outright. A sheet resting short is the exception, because up IS
       somewhere to go, so it tracks until it reaches full and bands after. */
    const raw = from + moved
    applyY(raw >= 0 ? raw : raw / 5)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = grab.current
    if (g?.id !== e.pointerId) return
    grab.current = null
    dragging.current = false

    /* HOW FAR THE FINGER WENT, not where the sheet ended up. These are the same number
       only for a sheet resting at full height; for one resting 396px down they are not,
       and testing the absolute offset meant a 40px nudge on a short sheet read as 436px
       of travel and dismissed it. */
    const moved = e.clientY - g.y

    /* Restore the transition FIRST, whatever happens next. `pointerdown` set it to
       `none` so the sheet could track the finger, and React will only rewrite it if
       its own string changed — which it does not when a drag ends on a level POP, where
       `away` stays false. Leaving it `none` there meant the next level arrived by
       teleporting into place. */
    if (panel.current) panel.current.style.transition = travel
    if (scrim.current) scrim.current.style.transition = veilFade

    if (moved > DISMISS_AT || g.speed > FLING) {
      /* `settle()` is deliberately NOT called here. React is about to re-render with
         `away` true, and the transition it writes runs from wherever the finger left
         the sheet to off-screen — so the dismissal continues the gesture rather than
         snapping back to rest and then leaving. */
      dismiss()
      return
    }
    if (rest > 0 && !expanded && moved < -EXPAND_AT) {
      setExpanded(true)
      return /* React re-renders to the expanded rest; `settle` here would fight it. */
    }
    settle()
  }

  /**
   * THE ELEMENT ALWAYS ENDS UP WHERE THE RENDER SAYS IT SHOULD BE.
   *
   * Runs after every render, with no dependency array on purpose. React skips writing
   * a style whose value it believes it already wrote, and a drag writes over those
   * values behind its back — so any render where the intent happens to be UNCHANGED
   * would leave the sheet pinned wherever the finger let go. Popping a level from a
   * dragged sheet into another of the same height did exactly that.
   *
   * A finger on the sheet outranks it: nothing here runs mid-gesture, and no render
   * happens mid-gesture either, because the drag deliberately sets no state.
   */
  useLayoutEffect(() => {
    if (!dragging.current) settle()
  })

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
            <span className="block truncate text-overline font-medium text-[#b3aea6] uppercase">
              {top.eyebrow ?? 'Command Centre'}
            </span>
            <h1 className="mt-[3px] truncate text-h2 font-semibold text-[#16150f]">
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
              and hands the reveal-on-scroll marks a fresh observer.

              THE SLIDE NOW HAS A DIRECTION. Every level change used to arrive from
              the right, including the ones going back — so the chevron out of Species
              and the tap into it produced the same motion, and the sheet said "onward"
              while the reader was retreating. 8px each way, mirrored: barely a
              movement, and the only thing on screen that says which way you just went.
              A repeat of the same level (a re-render at the same depth) is not a step
              and gets no animation at all. */}
          <div
            ref={content}
            key={`${stack.length}-${top.title}`}
            className={`${step === 0 ? '' : step > 0 ? 'animate-swap-fwd' : 'animate-swap-back'} pt-4 pb-[max(48px,env(safe-area-inset-bottom))]`}
          >
            {top.body}
          </div>
        </div>
      </div>
    </div>
  )

  if (side) {
    return (
      <div
        className="fixed inset-0 z-40 font-sans"
        style={{ pointerEvents: leaving ? 'none' : undefined }}
        role="dialog"
        aria-modal="true"
        aria-label={top.title}
      >
        <button
          ref={scrim}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute inset-0 size-full cursor-default bg-[#0f1210]"
          style={{ opacity: restingScrim, transition: veilFade }}
        />
        <section
          ref={panel}
          /* Width is clamped rather than a percentage: below ~380px the two-column
             blocks inside stop fitting, and past ~520px the sheet starts competing
             with the page it is explaining rather than annotating it. */
          className="absolute inset-y-0 right-0 flex w-[clamp(380px,34vw,520px)] max-w-full flex-col overflow-hidden bg-white shadow-[-8px_0_40px_rgba(15,18,16,0.14)]"
          style={{ transform: away ? 'translateX(100%)' : 'translateX(0)', transition: travel }}
        >
          {header}
          {scrollerEl}
        </section>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-40 font-sans"
      style={{ pointerEvents: leaving ? 'none' : undefined }}
      role="dialog"
      aria-modal="true"
      aria-label={top.title}
    >
      <button
        ref={scrim}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 size-full cursor-default bg-[#0f1210]"
        style={{ opacity: restingScrim, transition: veilFade }}
      />
      <div className="pointer-events-none absolute inset-0 mx-auto max-w-[430px]">
        <section
          ref={panel}
          className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[22px] bg-white"
          style={{
            top: PEEK,
            /* `100%` off the bottom when away, its resting slack otherwise — see the
               note on `rest`. React owns this value; a drag overwrites it directly on
               the element and hands it back on release. */
            transform: away ? 'translateY(100%)' : `translateY(${expanded ? 0 : rest}px)`,
            transition: travel,
          }}
        >
          {header}
          {scrollerEl}
        </section>
      </div>
    </div>
  )
}
