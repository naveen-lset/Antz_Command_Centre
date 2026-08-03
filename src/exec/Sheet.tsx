/**
 * Executive module page shell.
 *
 * This is the FINAL level — there is no navigation out of it except closing.
 * No tabs, no chapter chips, no "view more": everything the module has lives in
 * one continuous scroll. The chrome is deliberately almost nothing — a title, a
 * close button, and a hairline that appears once you've scrolled.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** How much of the home screen stays visible above the sheet. */
const PEEK = 'calc(env(safe-area-inset-top, 0px) + 40px)'
const DISMISS_AT = 110

export default function Sheet({
  title,
  eyebrow = 'Command Centre',
  onClose,
  children,
}: {
  title: string
  eyebrow?: string
  onClose: () => void
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

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
    if (dy > DISMISS_AT) close()
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
          <div
            className="relative z-10 shrink-0 touch-none bg-white transition-shadow duration-300"
            style={{ boxShadow: scrolled ? '0 1px 0 rgba(22,21,15,0.08)' : 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="flex justify-center pt-2.5" aria-hidden>
              <span className="h-[4px] w-9 rounded-full bg-[#16150f]/10" />
            </div>
            <header className="flex items-center gap-4 px-6 pt-2.5 pb-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium tracking-[0.06em] text-[#b3aea6] uppercase">
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

          <div
            ref={scroller}
            className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hidden"
          >
            <div className="animate-swap-in pb-[max(48px,env(safe-area-inset-bottom))]">{children}</div>
          </div>
        </section>
      </div>
    </div>
  )
}
