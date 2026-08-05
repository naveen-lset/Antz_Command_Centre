import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Agentation } from 'agentation'
import './index.css'
import App from './App.tsx'

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
