import { useEffect, useRef, useState } from 'react'
import CommandCentre from './v2/CommandCentre'
import CommandCentreV3 from './v3/CommandCentreV3'
import ClassicHome from './ClassicHome'
import DetailPage from './detail/DetailPage'
import { findDetailPage, otherPages } from './detail/pages'
import Sheet from './exec/Sheet'
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
        <Sheet
          title={exec ? exec.title : record!.title}
          /* A record page names its parent module; a report-track module names the
             period it was cut against; an operations page names neither. */
          eyebrow={record ? record.parentTitle : exec!.ops ? 'Command Centre' : report.period}
          onClose={back}
          onBack={record ? () => { window.location.hash = `#/${record.parent}` } : undefined}
        >
          {exec ? <exec.Page /> : <RecordsView page={record!} />}
        </Sheet>
      )}
      {detail && <DetailPage page={detail} others={otherPages(detail.slug)} onClose={back} />}
    </>
  )
}
