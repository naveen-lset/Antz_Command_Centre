/**
 * V4 — the app.
 *
 * TWO LAYERS, NOT ONE. Routes are places: the home and the twenty module pages, each
 * with its own URL. Sheets are looks at things: an alert's rows, an approval's
 * decision, four levels of Overall → Site → Species → Animal. The first layer
 * navigates and the second does not, which is the whole of "never navigate
 * unnecessarily" — you can peek at any figure on the home from the home, and you are
 * back where you were with one gesture.
 *
 * TWO LAYOUTS, NOT ONE STRETCHED BETWEEN THEM. Below 768 the app is a phone app: one
 * column, one scroll, modules as pages with a back chevron, sheets rising from the
 * bottom edge. At 768 and above it is the shell — a permanent sidebar, modules
 * rendered in place, sheets sliding in from the right — and at 1280 a third column
 * appears with the live queues. The boundary is one number, used by the shell and by
 * the sheet alike, so the sidebar and the sheet geometry can never disagree about
 * which tier the app is in.
 *
 * `PeriodProvider` wraps `SheetProvider` rather than the other way round, because a
 * sheet opened from the home is a cut of the same window the home is showing. Module
 * pages keep their own keyed provider inside, so opening one starts it on its own
 * default instead of inheriting whatever the home was set to.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HomeView } from './v4/Home'
import { AppShell, ModuleHeader, ModulePane, PhonePage } from './v4/Shell'
import { SheetProvider } from './v4/sheet'
import { titleOf } from './v4/nav'
import { PeriodBar, PeriodProvider, usePeriod } from './exec/period'
import { findExecPage } from './exec/pages'
import { RecordsView, findRecordPage } from './exec/records'
import { report } from './exec/report'
import { useMediaQuery } from './hooks/useMediaQuery'

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

/** The eyebrow rules, in one place because three surfaces need them. */
function useEyebrow({
  parentTitle,
  periods,
  ops,
}: {
  parentTitle?: string
  periods: boolean
  ops: boolean
}) {
  const { period } = usePeriod()
  /* A record page names its parent module; a report-track module names the window it
     is cut against; an operations page is live and names neither. */
  return parentTitle ?? (ops ? 'Command Centre' : periods ? period.window : report.period)
}

function ModuleInPane({
  title,
  parentTitle,
  periods,
  ops,
  onBack,
  children,
}: {
  title: string
  parentTitle?: string
  periods: boolean
  ops: boolean
  onBack?: () => void
  children: ReactNode
}) {
  const eyebrow = useEyebrow({ parentTitle, periods, ops })
  return (
    <ModulePane>
      <ModuleHeader title={title} eyebrow={eyebrow} onBack={onBack} />
      {periods && !parentTitle && (
        <div className="px-[var(--gutter-lg)] pb-3">
          <PeriodBar />
        </div>
      )}
      {children}
    </ModulePane>
  )
}

function ModuleOnPhone({
  title,
  parentTitle,
  periods,
  ops,
  onBack,
  children,
}: {
  title: string
  parentTitle?: string
  periods: boolean
  ops: boolean
  onBack: () => void
  children: ReactNode
}) {
  const eyebrow = useEyebrow({ parentTitle, periods, ops })
  return (
    <PhonePage
      title={title}
      eyebrow={eyebrow}
      onBack={onBack}
      toolbar={periods && !parentTitle ? <PeriodBar /> : undefined}
    >
      {children}
    </PhonePage>
  )
}

export default function App() {
  const route = useHashRoute()
  const slug = route.replace(/^#\//, '')

  /* Two tiers, resolved most-specific first: a module page (`#/mortality`) and then
     its record page (`#/mortality/records`). */
  const exec = findExecPage(slug)
  const record = exec ? undefined : findRecordPage(slug)
  const open = Boolean(exec || record)

  /* The home the back chevron returns to. Recorded during render rather than in an
     effect, because an effect lands a render late. */
  const home = useRef('#/')
  if (!open) home.current = route || '#/'
  const back = () => {
    window.location.hash = home.current
  }

  /* Every module page starts at the top of the window. Without this, opening
     Vaccination from halfway down the home leaves you halfway down Vaccination. */
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [slug])

  const shell = useMediaQuery('(min-width: 768px)')
  const panel = useMediaQuery('(min-width: 1280px)')

  const title = exec ? titleOf(slug) : record ? record.title : ''
  const parentTitle = record?.parentTitle
  const periods = Boolean(exec?.periods)
  const ops = Boolean(exec?.ops)
  const body = exec ? <exec.Page /> : record ? <RecordsView page={record} /> : null
  const onBackToParent = record ? () => { window.location.hash = `#/${record.parent}` } : undefined

  return (
    <PeriodProvider>
      <SheetProvider>
        {shell ? (
          <AppShell route={route} panel={panel}>
            {open ? (
              /* Keyed per module so opening a page starts on its own default window
                 rather than inheriting the last one. */
              <PeriodProvider key={exec ? slug : record!.parent}>
                <ModuleInPane
                  title={title}
                  parentTitle={parentTitle}
                  periods={periods}
                  ops={ops}
                  onBack={onBackToParent}
                >
                  {body}
                </ModuleInPane>
              </PeriodProvider>
            ) : (
              <HomeView />
            )}
          </AppShell>
        ) : open ? (
          <PeriodProvider key={exec ? slug : record!.parent}>
            <ModuleOnPhone
              title={title}
              parentTitle={parentTitle}
              periods={periods}
              ops={ops}
              onBack={onBackToParent ?? back}
            >
              {body}
            </ModuleOnPhone>
          </PeriodProvider>
        ) : (
          <PhoneHome />
        )}
      </SheetProvider>
    </PeriodProvider>
  )
}

/** The phone home owns its own page background; the shell's content column owns it above. */
function PhoneHome() {
  return (
    <div
      className="content-box relative isolate min-h-dvh font-sans"
      style={{ background: 'linear-gradient(180deg, #ddeae3 0%, #c6ddd1 100%)' }}
    >
      <div className="tier">
        <HomeView />
      </div>
    </div>
  )
}
