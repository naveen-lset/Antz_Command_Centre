import { useEffect, useRef, useState } from 'react'

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/**
 * Tweens a number toward `target` and returns the current value.
 *
 * Unlike `useCountUp` (which always starts from 0 on mount and returns a
 * formatted string), this animates from wherever it currently is — so a value
 * that changes later (a chart range switch, a gauge re-render) glides instead of
 * jumping. Honours `prefers-reduced-motion` by snapping to the target.
 */
export function useTween(
  target: number,
  {
    duration = 900,
    enabled = true,
    /** Holds at the origin this long first — used to land with a bar or arc. */
    delay = 0,
  }: { duration?: number; enabled?: boolean; delay?: number } = {},
): number {
  const [value, setValue] = useState(enabled ? 0 : target)
  const frame = useRef(0)
  const from = useRef(0)

  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    const start = performance.now() + delay
    const origin = from.current
    const tick = (now: number) => {
      const t = Math.min(Math.max(now - start, 0) / duration, 1)
      const next = origin + (target - origin) * easeOutCubic(t)
      setValue(next)
      from.current = next
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration, enabled, delay])

  return value
}
