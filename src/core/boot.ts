/**
 * BOOT — the one place the application waits for data.
 *
 * `core/query.ts` is pure and synchronous and says why: "the moment a figure becomes async,
 * two figures on one screen can be from two different scopes for a frame, which is the
 * contradiction this whole layer exists to prevent." Connecting the product to a database
 * without breaking that meant putting the await somewhere it happens exactly once, before
 * anything renders — here.
 *
 * The order matters. `loadWorld` fetches and decodes; `hydrate` fills the entity registries
 * from it; `hydrateMetrics` builds the metric registry from the same load. Nothing downstream
 * may read any of the three before this resolves, which is why `main.tsx` awaits it rather
 * than rendering a loading state around it — a half-populated registry would let a page draw
 * a zero that looks like a figure.
 */

import { loadWorld } from './store'
import { hydrate } from './world'
import { hydrateMetrics } from './metrics'

let started: Promise<void> | undefined

export function boot(): Promise<void> {
  if (!started) {
    started = loadWorld().then(() => {
      hydrate()
      hydrateMetrics()
    })
  }
  return started
}
