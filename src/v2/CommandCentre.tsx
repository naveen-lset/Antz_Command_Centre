import { useEffect, useMemo, useRef, useState } from 'react'
import MetricSection from './components/MetricSection'
import { HeroGreeting, StickyBar } from './components/Header'
import { sections } from './data'
import type { Range } from './model'

export default function CommandCentre() {
  const [mountedAt] = useState(() => new Date())
  const [range, setRange] = useState<Range>('today')
  const [query, setQuery] = useState('')
  const [compact, setCompact] = useState(false)
  const [activeChip, setActiveChip] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const chips = useMemo(
    () => sections.filter((s) => s.chip).map((s) => ({ id: s.id, label: s.chip! })),
    [],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sections
    return sections.filter((s) => s.title.toLowerCase().includes(q))
  }, [query])

  // Greeting sentinel → compact sticky bar
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), {
      rootMargin: '-96px 0px 0px 0px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Scrollspy for section chips
  useEffect(() => {
    const root = listRef.current
    if (!root) return
    const targets = Array.from(root.querySelectorAll('section[id]'))
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveChip(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    targets.forEach((t) => spy.observe(t))
    return () => spy.disconnect()
  }, [visible])

  const scrollToSection = (id: string) => {
    setActiveChip(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-dvh bg-page font-sans">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-white shadow-[0_0_40px_rgba(0,0,0,0.06)]">
        <HeroGreeting mountedAt={mountedAt} />
        <div ref={sentinelRef} aria-hidden />
        <StickyBar
          compact={compact}
          query={query}
          onQuery={setQuery}
          range={range}
          onRange={setRange}
          chips={chips}
          activeChip={activeChip}
          onChip={scrollToSection}
        />
        <main ref={listRef}>
          {visible.map((section) => (
            <MetricSection key={section.id} section={section} range={range} />
          ))}
          {visible.length === 0 && (
            <p className="px-5 py-16 text-center text-[13px] text-ink-3">
              No modules match “{query}”.
            </p>
          )}
        </main>
        <footer className="flex items-center justify-between px-5 py-8">
          <p className="text-[12px] text-ink-3">ANTZ Command Centre</p>
          <a href="#/classic" className="text-[12px] font-medium text-ink-2 underline-offset-2 active:underline">
            View classic concept →
          </a>
        </footer>
      </div>
    </div>
  )
}
