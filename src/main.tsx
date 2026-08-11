import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Agentation } from 'agentation'
import './index.css'
import App from './App.tsx'
import { boot } from './core/boot'
import { runChecks } from './core/checks'

/*
 * THE DATABASE IS LOADED BEFORE ANYTHING RENDERS, and that ordering is the whole reason the
 * rest of the product could be connected to it without being rewritten.
 *
 * `core/query.ts` is a pure synchronous façade — a page calls `figure(scope, 'mortality')`
 * during render and gets an integer, with no loading state, because "the moment a figure
 * becomes async, two figures on one screen can be from two different scopes for a frame".
 * Awaiting here keeps that true: by the time React mounts, the registries are full and every
 * read downstream is a walk over a typed array.
 *
 * The cost is one wait on a cold load — 8 MB across four files, fetched in parallel. That is
 * paid once, against a browser cache, and it buys a product where no figure on any screen can
 * be mid-flight.
 */
boot()
  .then(() => {
    /*
     * Data-consistency invariants, asserted on every dev boot.
     *
     * Dev only, and statically eliminated from the production bundle along with the check
     * module. Run after the load, because every invariant is about the loaded data.
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
  })
  .catch((err: unknown) => {
    /*
     * A failed load is stated, not swallowed. The usual cause is that `public/data` has not
     * been built, and the fix is one command — so the message says which command rather than
     * leaving a blank page and a console trace.
     */
    console.error(err)
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML =
        '<div style="font:15px/1.6 ui-sans-serif,system-ui;padding:48px;max-width:60ch;color:#3d3a34">' +
        '<h1 style="font-size:19px;margin:0 0 12px">The command centre could not load its data.</h1>' +
        '<p style="margin:0 0 12px">' +
        String((err as Error)?.message ?? err) +
        '</p>' +
        '<p style="margin:0">Build it with <code style="background:#eceee8;padding:2px 6px;border-radius:4px">' +
        'python3 tools/etl/build.py</code> and reload.</p></div>'
    }
  })
