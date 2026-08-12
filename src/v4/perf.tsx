/**
 * PERFORMANCE PRIMITIVES — lazy pages, skeletons, paging, and a windowed list.
 *
 * WHAT EACH ONE IS ACTUALLY FOR, because "add lazy loading" is easy to satisfy without
 * making anything faster.
 *
 * LAZY MODULES. Twenty-three module pages plus the design system were one bundle, so opening
 * the home parsed the pharmacy page. Each module is now its own chunk, fetched when its route
 * is first visited and cached by the browser afterwards — so the home gets smaller and no
 * module gets slower on a second visit.
 *
 * SKELETONS, NOT SPINNERS. A spinner says "something is happening"; a skeleton says "a card
 * with a big number and three rows is about to be here", which is the same shape the content
 * arrives in, so nothing jumps. The skeletons here mirror the real cards' geometry rather
 * than being generic grey boxes.
 *
 * PAGING OVER TRUNCATION. The drill used to take the first forty animals of a species and
 * stop, with a note explaining the cap. Forty of 12,400 is not a list, and a cap dressed as a
 * decision is still a cap. `usePaged` walks the real total, and the count beside it is always
 * the real one.
 *
 * A WINDOWED LIST, NOT A VIRTUALISED FRAMEWORK. `VirtualRows` renders only the rows near the
 * viewport for lists past a threshold. Below the threshold it renders everything, because the
 * measurement and transform cost of windowing thirty rows is worse than the rows.
 */

import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { FAINT, TRACK } from '../exec/system'

/* ── skeletons ───────────────────────────────────────────────────────────── */

/** One shimmering block. `w` and `h` are CSS lengths so a caller can match real type. */
export function Bone({ w = '100%', h = 12, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <span
      className="skeleton block"
      style={{ width: w, height: h, borderRadius: r }}
      aria-hidden
    />
  )
}

/**
 * The shape a module page arrives in: a hero with a large figure, then two cards of rows.
 *
 * Deliberately generic across modules. A per-module skeleton would be more accurate and
 * would also be a second copy of every page's layout to keep in step — and the value of a
 * skeleton is entirely in the first 200ms, where "hero then two cards" is enough.
 */
export function PageSkeleton() {
  return (
    <div className="animate-fade-up" role="status" aria-label="Loading">
      <div className="w-full px-[var(--gutter)] pb-3">
        <div className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Bone w={168} h={44} r={10} />
          <div className="mt-3">
            <Bone w={120} h={13} />
          </div>
          <div className="mt-4">
            <Bone w={92} h={11} />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-[var(--gap)] px-[var(--gutter)]">
        {[0, 1].map((card) => (
          <div key={card} className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
            <Bone w={110} h={11} />
            <div className="mt-4 flex flex-col gap-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Bone w={`${64 - row * 8}%`} h={12} />
                  </div>
                  <Bone w={38} h={12} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** A few rows' worth, for a list that is fetching a further page. */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 py-2" role="status" aria-label="Loading rows">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Bone w={`${70 - (i % 4) * 9}%`} h={12} />
          </div>
          <Bone w={34} h={12} />
        </div>
      ))}
    </div>
  )
}

/* ── lazy module pages ───────────────────────────────────────────────────── */

/**
 * Wrap a dynamic import as a route-level component with a skeleton.
 *
 * `lazy` is memoised by the caller's module scope, so the component identity is stable across
 * renders and React does not remount the page on every parent update.
 */
export function lazyPage(load: () => Promise<{ default: ComponentType }>): ComponentType {
  const Loaded = lazy(load)
  return function LazyPage() {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Loaded />
      </Suspense>
    )
  }
}

/** Suspense boundary for anything else that loads — a sheet body, an entity tab. */
export const Loading = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <Suspense fallback={fallback ?? <RowsSkeleton />}>{children}</Suspense>
)

/* ── paging ──────────────────────────────────────────────────────────────── */

export interface Paged<T> {
  rows: T[]
  total: number
  shown: number
  hasMore: boolean
  more: () => void
  /** Reset to the first page — call when the scope changes under a mounted list. */
  reset: () => void
}

/**
 * Page through a synchronous source.
 *
 * `fetchPage` is called with an offset and a limit and returns the slice plus the real total.
 * The source is synchronous because `core/` is synchronous — a list of animals is derived, not
 * fetched — so there is no loading state to manage and no chance of two pages arriving from
 * two different scopes.
 *
 * The dependency array resets paging, which matters: without it, changing the window while
 * scrolled to offset 400 would ask for rows 400–420 of a list that now has 30.
 */
export function usePaged<T>(
  fetchPage: (offset: number, limit: number) => { rows: T[]; total: number },
  limit = 20,
  deps: unknown[] = [],
): Paged<T> {
  const [shown, setShown] = useState(limit)

  /* eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's scope keys */
  useEffect(() => setShown(limit), [limit, ...deps])

  const { rows, total } = useMemo(
    () => fetchPage(0, shown),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [shown, ...deps],
  )

  return {
    rows,
    total,
    shown: rows.length,
    hasMore: rows.length < total,
    more: () => setShown((n) => n + limit),
    reset: () => setShown(limit),
  }
}

/**
 * The "showing 20 of 12,400" control.
 *
 * States the real total always. A list that shows twenty rows under a heading that says
 * twenty has told the reader the population is twenty.
 */
export function MoreRows({
  page,
  noun,
  label = 'Show more',
}: {
  page: Pick<Paged<unknown>, 'shown' | 'total' | 'hasMore' | 'more'>
  noun: string
  label?: string
}) {
  if (page.total === 0) return null
  return (
    <div className="flex items-center gap-3 pt-3">
      <span className="shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>
        {page.shown.toLocaleString('en-US')} of {page.total.toLocaleString('en-US')} {noun}
      </span>
      <span className="h-px flex-1" style={{ backgroundColor: TRACK }} aria-hidden />
      {page.hasMore && (
        <button
          type="button"
          onClick={page.more}
          className="card-press shrink-0 rounded-full bg-[#f2f1ed] px-3 py-1 text-caption font-semibold text-[#3d3a34]"
        >
          {label}
        </button>
      )}
    </div>
  )
}

/* ── windowed rows ───────────────────────────────────────────────────────── */

/**
 * Render only the rows near the viewport, for a long list.
 *
 * Uniform row height is required and passed in rather than measured: measuring means a layout
 * read per row per frame, which costs more than it saves at these list lengths. Every list
 * this is used on is a table of one-line records, which are uniform by construction.
 *
 * Under `threshold` rows it renders everything and adds no wrapper — windowing a short list is
 * pure overhead and introduces a scroll container where the page did not need one.
 */
export function VirtualRows<T>({
  items,
  rowHeight,
  height,
  threshold = 60,
  overscan = 6,
  render,
}: {
  items: T[]
  rowHeight: number
  /** Viewport height for the scroller. Only used past the threshold. */
  height: number
  threshold?: number
  overscan?: number
  render: (item: T, index: number) => ReactNode
}) {
  const [top, setTop] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  const onScroll = useCallback(() => {
    const el = box.current
    if (el) setTop(el.scrollTop)
  }, [])

  if (items.length <= threshold) return <>{items.map(render)}</>

  const first = Math.max(0, Math.floor(top / rowHeight) - overscan)
  const last = Math.min(items.length, Math.ceil((top + height) / rowHeight) + overscan)
  const slice = items.slice(first, last)

  return (
    <div
      ref={box}
      onScroll={onScroll}
      className="overflow-y-auto overscroll-contain scrollbar-hidden"
      style={{ height }}
    >
      {/* A spacer of the full height, with the visible slice translated into place — so the
          scrollbar reflects the whole list rather than the rendered window. */}
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${first * rowHeight}px)` }}>
          {slice.map((item, i) => render(item, first + i))}
        </div>
      </div>
    </div>
  )
}
