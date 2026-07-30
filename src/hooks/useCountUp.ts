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
  const [value, setValue] = useState(0)
  const frame = useRef(0)

  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setValue(target * easeOutCubic(t))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration, enabled])

  return format ? format(value) : value.toFixed(decimals)
}
