import { useEffect, useRef, useState } from 'react'

/** True once the element first enters the viewport (fires once, then disconnects). */
export function useInView<T extends HTMLElement>(rootMargin = '0px 0px -10% 0px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    /* Without an observer there is no signal, and callers render `opacity-0` until
       they get one — so the failure mode is a permanently invisible card rather than
       an unanimated one. Reveal everything instead. */
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}
