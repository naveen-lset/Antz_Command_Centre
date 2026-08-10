import { useLayoutEffect, useRef, useState } from 'react'

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/**
 * How long a figure takes to travel to a NEW value, once it has already been read.
 *
 * Long enough that the eye follows the change rather than being handed a different
 * number, short enough to be over before the reader looks for the next figure.
 */
const RECOUNT_MS = 380

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
  /**
   * THE FIRST COUNT AND A LATER CHANGE ARE NOT THE SAME EVENT, and they had the same
   * duration.
   *
   * Counting up from zero the first time a figure is seen is an entrance: it says
   * "this was measured", and 900ms of it in step with the bar beside it is the point.
   * Re-counting 215,432 → 42,831 because a site was picked is a CORRECTION to a number
   * already on screen, in response to a tap the reader has just made and is waiting on.
   * At 900ms that reads as the app thinking; at a quarter of a second it reads as the
   * answer. Every figure on the home moves at once when a filter changes, so this is
   * the difference between a screen that updates and a screen that churns.
   */
  const seen = useRef(false)

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
    /* `enabled` is what gates the first run — a figure below the fold has not been
       "seen" yet however many times this effect has re-run for it. */
    const entrance = !seen.current
    seen.current = true
    const span = entrance ? duration : RECOUNT_MS
    const wait = entrance ? delay : 0

    setValue(from.current)
    const start = performance.now() + wait
    const origin = from.current
    const tick = (now: number) => {
      /* Clamped at zero because the first rAF timestamp can predate the
         `performance.now()` above — the frame's time is stamped before this effect
         runs, so an unclamped `t` goes negative and drives the easing below its
         origin. */
      const t = Math.min(Math.max(now - start, 0) / span, 1)
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
