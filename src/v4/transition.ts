/**
 * ONE PLACE THAT KNOWS HOW A SCREEN IS REPLACED.
 *
 * Navigation in this app is a hash change, and a hash change is a `setState` — which
 * means the old screen is gone in the same frame the new one appears in. That is
 * fast and it is the reason moving around felt like a slide deck rather than an
 * application: nothing on screen ever suggested that Mortality is *inside* the home
 * rather than *instead of* it.
 *
 * `startViewTransition` is the browser's answer and it is the whole of the mechanism
 * here. It snapshots the current document, runs the callback, snapshots the result,
 * and cross-animates the two under CSS we own (`::view-transition-old/new` in
 * `index.css`). React does not need to keep the outgoing tree alive, so a module page
 * with forty charts leaves for the cost of one texture.
 *
 * THREE THINGS THIS FILE IS CAREFUL ABOUT:
 *
 * 1. IT ONLY FIRES ON A ROUTE CHANGE. Changing the reporting window rewrites the hash
 *    too — `#/?w=yesterday` — and a scope change must never look like a navigation.
 *    The caller decides; `runPageTransition` is simply not called for those.
 *
 * 2. THE UPDATE MUST BE SYNCHRONOUS. The second snapshot is taken the moment the
 *    callback returns, so a React update that is merely *scheduled* inside it would be
 *    captured before it rendered — the new page would animate in showing the old
 *    page's content. `flushSync` is what makes the callback mean "the DOM is now the
 *    new screen".
 *
 * 3. IT DEGRADES TO WHAT WE HAD. No support, or a reader who has asked for less
 *    motion, and the update simply runs. Nothing is conditional except the animation.
 */

import { flushSync } from 'react-dom'

export type NavDirection = 'forward' | 'back'

interface ViewTransition {
  finished: Promise<void>
}

type WithViewTransitions = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Run a route change as a page transition.
 *
 * `direction` picks which half of the mirrored motion the incoming page gets — it is
 * written to `<html data-nav>` for the length of the transition and read by the CSS.
 */
export function runPageTransition(direction: NavDirection, apply: () => void): void {
  const doc = document as WithViewTransitions

  if (typeof doc.startViewTransition !== 'function' || prefersReducedMotion()) {
    apply()
    return
  }

  const root = document.documentElement
  root.dataset.nav = direction

  const transition = doc.startViewTransition(() => {
    flushSync(apply)
    /* Reset the scroll INSIDE the capture. The router resets it in an effect, which
       normally lands on the same frame — but a passive effect that slips a frame here
       is captured as a new page that starts halfway down and then jumps to its top
       while the incoming animation is still running. Doing it in the callback makes
       the new snapshot's scroll position part of what was captured. */
    window.scrollTo({ top: 0 })
  })

  const clear = () => {
    if (root.dataset.nav === direction) delete root.dataset.nav
  }
  transition.finished.then(clear, clear)
}
