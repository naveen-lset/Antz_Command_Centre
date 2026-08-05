import { useLayoutEffect, useRef, useState } from 'react'

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

  /*
   * A LAYOUT effect, not a passive one, and it snaps to the origin before starting.
   *
   * With `useEffect` the browser painted one frame of the value the tween was about
   * to animate *towards*, because the effect that resets to the origin ran after that
   * paint. Every animated number in the app flashed its final figure and then dropped
   * to zero to count up to it — a Mortality hero measured frame by frame went
   * "23", "1", "2", … "23". A layout effect is flushed before paint, so the origin is
   * the first thing on screen.
   *
   * On a later `target` change (switching the reporting window) `from.current` already
   * holds what is on screen, so the snap is a no-op and the value glides.
   */
  useLayoutEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    setValue(from.current)
    const start = performance.now() + delay
    const origin = from.current
    const tick = (now: number) => {
      /* Clamped at zero because the first rAF timestamp can predate the
         `performance.now()` above — the frame's time is stamped before this effect
         runs, so an unclamped `t` goes negative and drives the easing below its
         origin. */
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
