import { useEffect, useState } from 'react'

/**
 * Subscribes to a media query and returns whether it currently matches.
 *
 * Almost every responsive decision in this app belongs in CSS, where it costs
 * nothing and never disagrees with itself. This hook is for the handful that
 * cannot: where the *behaviour* differs by tier, not just the styling — the
 * module sheet, which rises from the bottom edge on a phone and fades in
 * centred on a desktop, and so needs a different transform, a different
 * transition and a different dismissal geometry rather than a different width.
 *
 * Read during the first render rather than in an effect. Setting it afterwards
 * would mount every sheet in its phone geometry and then correct it a frame
 * later, which on a desktop is a visible slide-up before the fade-in.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    // Re-read on subscribe: the query can have flipped between the first render
    // and this effect if the window was being resized as the component mounted.
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}
