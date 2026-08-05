import { useEffect, useRef, useState } from 'react'

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Animates 0 → target on mount (~900ms ease-out) and returns the formatted
 * value. Respects prefers-reduced-motion by jumping straight to the target.
 */
export function useCountUp(
  target: number,
  {
    duration = 900,
    decimals = 0,
    format,
    enabled = true,
  }: {
    duration?: number
    decimals?: number
    format?: (value: number) => string
    /** When false, holds at 0 — flip to true to start (e.g. on scroll into view). */
    enabled?: boolean
  } = {},
): string {
  /* Reduced motion is decided in the initialiser, not just in the effect below: the
     effect runs after the first paint, so setting the target there left one frame of
     "0" on screen for a reader who has asked for no animation. */
  const [value, setValue] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? target : 0,
  )
  const frame = useRef(0)

  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      /* `Math.max(…, 0)` matters: the first rAF timestamp can be EARLIER than the
         `performance.now()` captured a line above, because the frame's time is
         stamped before this effect runs. Unclamped, `t` goes slightly negative and
         `easeOutCubic` returns a negative multiplier — the population hero opened on
         "-13,186" and "-935" before it started climbing. */
      const t = Math.min(Math.max(now - start, 0) / duration, 1)
      setValue(target * easeOutCubic(t))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration, enabled])

  return format ? format(value) : value.toFixed(decimals)
}
