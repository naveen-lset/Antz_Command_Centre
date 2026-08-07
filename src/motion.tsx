/**
 * Motion primitives for the drill-down pages.
 *
 * Rules of the house: one easing family, nothing longer than a second, and every
 * animation has to explain something — where a number came from, how a series
 * moved, what just changed. Anything decorative is left out. All of it collapses
 * to nothing under `prefers-reduced-motion` (the CSS animations via the global
 * media query, the JS ones via the guards below).
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useInView } from './hooks/useInView'
import { useTween } from './hooks/useTween'

/**
 * One scroll threshold for a card, its marks and its numbers, so all three fire on
 * the same frame rather than within a few pixels of each other.
 */
const REVEAL_MARGIN = '0px 0px -4% 0px'

export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduce(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduce
}

/**
 * Fades a block up the first time it scrolls into view. Charts inside read the
 * same signal through their own observer, so a card and its marks animate together.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  /** ms — used to stagger siblings in a grid or list. */
  delay?: number
  className?: string
}) {
  /* Same margin as `usePlay` and `AnimatedValue` below. It was -6% here against
     their -4%, so a card began fading up on a slightly earlier scroll position than
     the marks and numbers inside it — the comment above claimed they animate together
     and they very nearly did. */
  const { ref, inView } = useInView<HTMLDivElement>(REVEAL_MARGIN)
  const reduce = usePrefersReducedMotion()
  const play = inView || reduce

  return (
    <div
      ref={ref}
      className={`${play ? 'animate-fade-up' : 'opacity-0'} ${className}`}
      style={play && !reduce ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

/**
 * True once the element has been seen — the trigger charts use to draw. The
 * observer goes on a wrapping div, since `IntersectionObserver` here is typed for
 * HTML elements and the marks themselves are SVG.
 */
export function usePlay<T extends HTMLElement = HTMLDivElement>() {
  const { ref, inView } = useInView<T>(REVEAL_MARGIN)
  const reduce = usePrefersReducedMotion()
  return { ref, reduce, animate: inView && !reduce }
}

const NUMERIC = /^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/s

/**
 * Counts a display string's leading number up when it scrolls into view, keeping
 * whatever prefix/suffix it carries — "1.4 d", "0.011%", "243 / 312", "₹18.4L".
 * Strings without a number render as-is.
 */
export function AnimatedValue({
  value,
  className,
  style,
}: {
  value: string
  className?: string
  /** `Figure` sets its own size, tracking and colour here — pass them through. */
  style?: CSSProperties
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(REVEAL_MARGIN)
  const reduce = usePrefersReducedMotion()
  const match = NUMERIC.exec(value)
  const raw = match?.[2] ?? ''
  const target = Number(raw.replace(/,/g, ''))
  const animatable = match !== null && Number.isFinite(target)

  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0
  const grouped = raw.includes(',')
  const tweened = useTween(animatable ? target : 0, { enabled: animatable && inView && !reduce })

  let text = value
  if (animatable) {
    /*
     * Before the first intersection this renders the ORIGIN, not the target.
     *
     * It used to render the target, on the reasoning that an unseen number should
     * still read correctly. But "unseen" is not the same as "invisible": a sheet
     * mounts with its content translated fully off-screen and then slides up, so
     * every number in it painted its final figure during the slide and then dropped
     * to zero to count back up. Measured frame by frame, a Mortality hero read
     * "23", "0", "1", … "23".
     *
     * A number that genuinely never intersects is one nobody can see, so showing 0
     * there costs nothing — and the two cases that must not animate are handled
     * above it: reduced motion renders the target outright, and a missing
     * IntersectionObserver reports in-view immediately.
     */
    const shown = reduce ? target : inView ? tweened : 0
    text = `${match[1]}${shown.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: grouped,
    })}${match[3]}`
  }

  return (
    <span ref={ref} className={className} style={style}>
      {text}
    </span>
  )
}

/**
 * Counts a plain number up. Unlike `AnimatedValue` this takes the trigger from its
 * parent, so a value can land in step with the bar or arc it belongs to.
 */
export function CountUp({
  value,
  animate,
  delay = 0,
  duration = 900,
  format = (n) => Math.round(n).toLocaleString('en-US'),
}: {
  value: number
  animate: boolean
  delay?: number
  duration?: number
  format?: (n: number) => string
}) {
  const tweened = useTween(value, { enabled: animate, delay, duration })
  /* Snap to the target's own precision — an un-snapped tween prints 54,852.757
     for a count of animals. */
  const decimals = Number.isInteger(value) ? 0 : (String(value).split('.')[1]?.length ?? 1)
  const factor = 10 ** decimals
  const shown = animate ? Math.round(tweened * factor) / factor : value
  return <>{format(shown)}</>
}

/**
 * Runs `apply` with the scroller's offset on every scroll frame, writing styles
 * imperatively — a scroll-linked value must not re-render the whole sheet.
 */
export function useScrollDriven(
  scroller: RefObject<HTMLElement | null>,
  apply: (scrollTop: number) => void,
) {
  const applyRef = useRef(apply)
  applyRef.current = apply

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => applyRef.current(el.scrollTop))
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [scroller])
}

/** Fires once the page has scrolled past `threshold` px — drives the compact header. */
export function useScrolledPast(threshold: number): boolean {
  const [past, setPast] = useState(false)
  const raf = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => setPast(window.scrollY > threshold))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf.current)
    }
  }, [threshold])

  return past
}
