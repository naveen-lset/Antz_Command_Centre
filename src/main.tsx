import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Agentation } from 'agentation'
import './index.css'
import App from './App.tsx'
import { runChecks } from './core/checks'

/*
 * Data-consistency invariants, asserted on every dev boot.
 *
 * The requirement that no two figures may contradict each other is the kind that decays
 * silently: editing a site row in `core/metrics.ts` breaks nothing, it just makes a headline
 * stop matching the list under it. So the invariants are checked rather than trusted — the
 * derived daily series must reproduce every authored window exactly, and every breakdown must
 * sum to its parent at four different windows.
 *
 * Dev only, and statically eliminated from the production bundle along with the check module.
 */
if (import.meta.env.DEV) runChecks()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/*
     * Annotation overlay for agent feedback — dev only.
     *
     * Gated on `import.meta.env.DEV`, not the `process.env.NODE_ENV` the install
     * page shows: Vite does not define `process` in the browser, so that check
     * throws a ReferenceError rather than evaluating false. `import.meta.env.DEV`
     * is statically replaced at build time, so the import is tree-shaken out of
     * the production bundle entirely.
     */}
    {import.meta.env.DEV && <Agentation />}
  </StrictMode>,
)
