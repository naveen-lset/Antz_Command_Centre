import { useEffect, useRef, useState, type ReactNode } from 'react'
import CommandCentre from './v2/CommandCentre'
import CommandCentreV3 from './v3/CommandCentreV3'
import ClassicHome from './ClassicHome'
import DetailPage from './detail/DetailPage'
import { findDetailPage, otherPages } from './detail/pages'
import Sheet from './exec/Sheet'
import { PeriodBar, PeriodProvider, usePeriod } from './exec/period'
import { findExecPage } from './exec/pages'
import { RecordsView, findRecordPage } from './exec/records'
import { report } from './exec/report'

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

/** The screen a drill-down sheet opens over — and returns to when it closes. */
function HomeScreen({ route }: { route: string }) {
  if (route === '#/classic') {
    return (
      <>
        <ClassicHome />
        <a
          href="#/"
          className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-line bg-white/90 px-4 py-2 text-[12px] font-medium text-ink shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-md"
        >
          ← Command Centre
        </a>
      </>
    )
  }
  if (route === '#/feed') return <CommandCentre />
  return <CommandCentreV3 />
}

/**
 * `Sheet`, with the eyebrow and toolbar that depend on the selected window.
 *
 * Split out purely so it can sit inside `PeriodProvider` and call `usePeriod` — the
 * eyebrow has to restate the window every time it changes, or the header would keep
 * claiming "JULY 2025" over figures cut to last week.
 */
function ExecSheet({
  title,
  parentTitle,
  periods,
  ops,
  onClose,
  onBack,
  children,
}: {
  title: string
  parentTitle?: string
  periods: boolean
  ops: boolean
  onClose: () => void
  onBack?: () => void
  children: ReactNode
}) {
  const { period } = usePeriod()
  /* A record page names its parent module; a report-track module names the window it
     is cut against; an operations page is live and names neither. */
  const eyebrow = parentTitle ?? (ops ? 'Command Centre' : periods ? period.window : report.period)

  return (
    <Sheet
      title={title}
      eyebrow={eyebrow}
      toolbar={periods && !parentTitle ? <PeriodBar /> : undefined}
      onClose={onClose}
      onBack={onBack}
    >
      {children}
    </Sheet>
  )
}

export default function App() {
  const route = useHashRoute()
  const slug = route.replace(/^#\//, '')
  /* Three tiers, resolved most-specific first: a module page (`#/mortality`), its
     record page (`#/mortality/records`), then the older generic renderer for any
     detail route not yet rebuilt, so the app stays whole. */
  const exec = findExecPage(slug)
  const record = exec ? undefined : findRecordPage(slug)
  const detail = exec || record ? undefined : findDetailPage(slug)
  const open = Boolean(exec || record || detail)

  /* The home screen stays mounted under the sheet, so closing reveals the screen
     the user opened from — same scroll position, no remount, no replayed counters.
     Recorded during render rather than in an effect: an effect lands a render late,
     so opening #/classic or #/feed directly — or via the footer links — kept showing
     the previous home until some unrelated state change forced another render. */
  const home = useRef('#/')
  if (!open) home.current = route || '#/'
  const back = () => {
    window.location.hash = home.current
  }

  return (
    <>
      <HomeScreen route={home.current} />
      {/* One `Sheet` element for both tiers, not one per tier — React keeps the
          same instance mounted, so stepping into a record page swaps the content
          inside the sheet instead of sliding one sheet out and another in. */}
      {(exec || record) && (
        /* One provider around the sheet, so the window switcher in the header and
           every figure in the body read the same selection. Remounted per module —
           opening a different page should start on its own default window, not
           inherit "all time" from whatever was open before. */
        <PeriodProvider key={exec ? slug : record!.parent}>
          <ExecSheet
            title={exec ? exec.title : record!.title}
            parentTitle={record?.parentTitle}
            /* Only report-track modules get the switcher: a task list cut to
               "last 6 months" is not something anyone wants to read. */
            periods={Boolean(exec?.periods)}
            ops={Boolean(exec?.ops)}
            onClose={back}
            onBack={record ? () => { window.location.hash = `#/${record.parent}` } : undefined}
          >
            {exec ? <exec.Page /> : <RecordsView page={record!} />}
          </ExecSheet>
        </PeriodProvider>
      )}
      {detail && <DetailPage page={detail} others={otherPages(detail.slug)} onClose={back} />}
    </>
  )
}
