/**
 * WHERE THE SPECIES IS FROM — the Native range band's body: every place the column names,
 * beside a map that ZOOMS TO the place under the reader's attention.
 *
 * THE LIST LEADS AND THE MAP ANSWERS IT. The places column is the record (40 entries for a
 * European squirrel, one for a Madagascan one), so it renders first, numbered, every entry —
 * scrolling inside its own panel rather than truncating. The map sits beside it and does the
 * one thing a list cannot: show where those places ARE.
 *
 * THE MAP RESTS AT THE WORLD AND TRAVELS ON ATTENTION. It opens at the full world with the
 * range tinted emerald — every place in frame, nothing pre-cropped. Dwell on a place (a list
 * row or a country) for a beat and the view glides into that area; move away and it glides
 * back out. A CLICK LOCKS the view on that place — for reading, and for touch, where there
 * is no hover — and clicking it again, or the open water, releases it. The dwell delay is
 * what keeps a scroll down the list from turning the map into a slideshow; the glide is a
 * viewBox tween on the house curve, and it collapses to an instant jump under
 * `prefers-reduced-motion`.
 *
 * PLACES ARE COLUMN TEXT AND COUNTRIES ARE MAP PATHS, and the two vocabularies differ. The
 * column says "Türkiye", "Russian Federation", "Spain (mainland)", "Northwest European
 * Russia"; the map says "Turkey", "Russia", "Spain". Resolution is: strip parentheticals,
 * alias the known renames, then accept a place that CONTAINS a country's name (which is what
 * folds the five European-Russia sub-regions onto Russia). An entry that resolves to nothing
 * stays in the list — it hovers, it just has no map partner — because the list is the record
 * and the map is only an illustration of it.
 *
 * THE MAP IS A LAZY PUBLIC ASSET (`public/world.svg`, ~1.2 MB, 250 country paths), fetched
 * only when a Profile tab with a range actually renders — the same discipline as
 * `profiles.json`, because `dims.json`'s boot budget is a real number and a world map is not
 * boot data. If the fetch fails the list stands alone and says so.
 */

import { useEffect, useRef, useState } from 'react'
import { ACCENT, DEEP, FAINT, INK, TRACK, mix } from '../exec/system'

/* ── column vocabulary → map vocabulary ──────────────────────────────────── */

const ALIAS: Record<string, string> = {
  czechia: 'czech republic',
  'north macedonia': 'macedonia',
  'türkiye': 'turkey',
  'russian federation': 'russia',
  'european russia': 'russia',
  'northwest european russia': 'russia',
  'central european russia': 'russia',
  'east european russia': 'russia',
  'north european russia': 'russia',
}

const norm = (s: string) => {
  const n = s
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/-in-europe/g, '')
    .trim()
  return ALIAS[n] ?? n
}

/**
 * A place resolves to the path whose name it equals — or, failing that, the first country
 * whose name it CONTAINS ("northwest european russia" → Russia). Containment runs one way
 * only: a short place name must never borrow a long country's path ("India" is not the
 * British Indian Ocean Territory).
 */
function resolve(byName: Map<string, SVGPathElement>, place: string): SVGPathElement | null {
  const n = norm(place)
  const direct = byName.get(n)
  if (direct) return direct
  for (const [name, path] of byName) {
    if (name.length > 4 && n.includes(name)) return path
  }
  return null
}

/* ── timing — the whole feel lives in these four numbers ─────────────────── */

/** Dwell before the view commits to travelling — a scroll-past never zooms. */
const DWELL_MS = 380
/** Grace after leaving before the view returns — row-to-row moves never yo-yo. */
const RETURN_MS = 600
/** The glide itself. */
const GLIDE_MS = 700
/** A zoomed country keeps this much geography around it. */
const PAD_RATIO = 0.45

/* ── the band body ───────────────────────────────────────────────────────── */

export function NativeRangeMap({ places }: { places: string[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const ac = new AbortController()
    fetch(`${import.meta.env.BASE_URL}world.svg`, { signal: ac.signal })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((svgText) => {
        const host = mapRef.current
        const list = listRef.current
        const tip = tipRef.current
        if (ac.signal.aborted || !host || !list || !tip) return
        host.innerHTML = svgText
        const svg = host.querySelector('svg')
        if (!svg) return
        svg.setAttribute('width', '100%')
        svg.setAttribute('height', '100%')
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        svg.style.display = 'block'

        /* index the countries, resolve every place, paint the two populations */
        const byName = new Map<string, SVGPathElement>()
        svg.querySelectorAll('path').forEach((p) => {
          const name = p.getAttribute('name')
          if (name) byName.set(name.toLowerCase(), p)
          p.style.fill = TRACK
          p.style.stroke = '#ffffff'
          p.style.strokeWidth = '0.6'
          /* Strokes stay screen-width whatever the zoom — a travelled-to country must read
             as a fill with a fine edge, not as an outline drawing. */
          p.setAttribute('vector-effect', 'non-scaling-stroke')
        })
        const ids = places.map((place) => {
          const path = resolve(byName, place)
          if (path) {
            path.style.fill = ACCENT
            path.style.fillOpacity = '0.35'
            path.style.stroke = DEEP
            path.style.strokeWidth = '1'
            path.style.cursor = 'pointer'
            path.style.transition = 'fill-opacity 180ms ease'
          }
          return path?.id ?? null
        })
        const matched = [...new Set(ids.filter(Boolean))] as string[]
        const pathOf = (id: string) => svg.querySelector(`#${CSS.escape(id)}`) as SVGPathElement

        /* ── the camera ──────────────────────────────────────────────────── */

        const worldBox = (svg.getAttribute('viewBox') ?? '0 0 1010 666').split(/\s+/).map(Number)
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        let raf = 0

        /* ── the place's name, ON the map ────────────────────────────────── */

        /* The label is anchored to the COUNTRY, not the cursor — selected from the list, from
           the map, or locked by a click, the name sits over the place it names and rides the
           glide, repositioned every frame from the live viewBox. Clamped to the map's box so
           a country against the frame's edge never pushes its name out of view. */
        let labelId: string | null = null
        const placeLabel = () => {
          if (!labelId) return
          const ctm = svg.getScreenCTM()
          if (!ctm) return
          const b = pathOf(labelId).getBBox()
          const at = new DOMPoint(b.x + b.width / 2, b.y).matrixTransform(ctm)
          const r = host.getBoundingClientRect()
          tip.style.left = `${Math.min(Math.max(at.x - r.left, 48), r.width - 48)}px`
          tip.style.top = `${Math.min(Math.max(at.y - r.top, 30), r.height - 10)}px`
        }
        const showLabel = (id: string | null) => {
          labelId = id
          if (!id) {
            tip.style.opacity = '0'
            return
          }
          tip.textContent = pathOf(id).getAttribute('name')
          tip.style.opacity = '1'
          placeLabel()
        }

        const setVB = (b: number[]) => {
          svg.setAttribute('viewBox', b.map((v) => v.toFixed(2)).join(' '))
          placeLabel()
        }

        /** Glide the viewBox — interruptible, and an instant jump under reduced motion. */
        const glideTo = (target: number[]) => {
          cancelAnimationFrame(raf)
          if (reduced) return setVB(target)
          const from = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number)
          const t0 = performance.now()
          const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
          const step = (now: number) => {
            const k = ease(Math.min(1, (now - t0) / GLIDE_MS))
            setVB(from.map((v, i) => v + (target[i] - v) * k))
            if (k < 1) raf = requestAnimationFrame(step)
          }
          raf = requestAnimationFrame(step)
        }

        /** A country's stage: its box, padded, never tighter than a microstate can carry. */
        const stageOf = (path: SVGPathElement): number[] => {
          const b = path.getBBox()
          const pad = Math.max(b.width, b.height) * PAD_RATIO + 6
          let w = b.width + pad * 2
          let h = b.height + pad * 2
          const MIN = 46
          if (w < MIN) w = MIN
          if (h < MIN * 0.62) h = MIN * 0.62
          return [b.x + b.width / 2 - w / 2, b.y + b.height / 2 - h / 2, w, h]
        }

        /* ── attention: dwell in, grace out, click to lock ───────────────── */

        let zoomT: ReturnType<typeof setTimeout> | undefined
        let backT: ReturnType<typeof setTimeout> | undefined
        let locked: string | null = null

        const rows = [...list.querySelectorAll('li')] as HTMLLIElement[]
        const paint = (hotId: string | null) => {
          matched.forEach((id) => {
            pathOf(id).style.fillOpacity = id === hotId || id === locked ? '0.75' : '0.35'
          })
          rows.forEach((row, i) => {
            const id = ids[i]
            row.style.backgroundColor =
              id && (id === hotId || id === locked) ? mix(DEEP, id === locked ? 0.09 : 0.06) : ''
          })
        }
        const attend = (id: string | null) => {
          clearTimeout(zoomT)
          clearTimeout(backT)
          paint(id)
          showLabel(id ?? locked)
          if (id) zoomT = setTimeout(() => glideTo(stageOf(pathOf(id))), DWELL_MS)
          else if (!locked) backT = setTimeout(() => glideTo(worldBox), RETURN_MS)
          else glideTo(stageOf(pathOf(locked)))
        }
        const toggleLock = (id: string | null) => {
          locked = locked === id ? null : id
          clearTimeout(zoomT)
          clearTimeout(backT)
          paint(id)
          showLabel(locked ?? id)
          glideTo(locked ? stageOf(pathOf(locked)) : worldBox)
        }

        rows.forEach((row, i) => {
          const id = ids[i]
          row.addEventListener('mouseenter', () => attend(id), { signal: ac.signal })
          row.addEventListener('mouseleave', () => attend(null), { signal: ac.signal })
          if (id) row.addEventListener('click', () => toggleLock(id), { signal: ac.signal })
        })
        matched.forEach((id) => {
          const path = pathOf(id)
          path.addEventListener('mouseenter', () => {
            attend(id)
            rows[ids.indexOf(id)]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }, { signal: ac.signal })
          path.addEventListener('mouseleave', () => attend(null), { signal: ac.signal })
          path.addEventListener('click', (e) => {
            e.stopPropagation()
            toggleLock(id)
          }, { signal: ac.signal })
        })
        /* open water releases the lock */
        svg.addEventListener('click', () => locked && toggleLock(locked), { signal: ac.signal })

        ac.signal.addEventListener('abort', () => {
          cancelAnimationFrame(raf)
          clearTimeout(zoomT)
          clearTimeout(backT)
        })
      })
      .catch(() => {
        if (!ac.signal.aborted) setFailed(true)
      })
    return () => ac.abort()
  }, [places])

  return (
    <div className="flex flex-col gap-5 @[760px]:flex-row">
      {/* every place the column carries — numbered, aligned, scrolling in its own panel */}
      <div className="shrink-0 rounded-[12px] p-1.5 @[760px]:w-[280px]" style={{ backgroundColor: 'rgba(31,81,91,0.05)' }}>
        <ul ref={listRef} className="max-h-[240px] overflow-y-auto @[760px]:max-h-[400px]" style={{ scrollbarWidth: 'thin' }}>
          {places.map((place, i) => (
            <li
              key={`${place}-${i}`}
              className="flex cursor-pointer items-baseline gap-3 rounded-[8px] px-2.5 py-1.5 transition-colors hover:bg-[#1f515b14]"
            >
              <span className="w-[22px] shrink-0 text-right text-caption tabular-nums" style={{ color: FAINT }}>
                {i + 1}
              </span>
              <span className="min-w-0 text-small" style={{ color: INK }}>
                {place}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* the map — resting at the world, travelling to whatever holds attention */}
      <div className="relative min-w-0 flex-1">
        {failed ? (
          <p className="text-small" style={{ color: FAINT }}>
            The world map could not be loaded — the places list beside it is unaffected.
          </p>
        ) : (
          <>
            <div ref={mapRef} className="h-[260px] overflow-hidden rounded-[12px] @[760px]:h-[400px]" />
            <div
              ref={tipRef}
              className="pointer-events-none absolute z-10 rounded-[8px] px-2.5 py-1 text-caption font-semibold whitespace-nowrap"
              style={{
                backgroundColor: '#123a2c',
                color: '#eef8f1',
                opacity: 0,
                transform: 'translate(-50%, -130%)',
                transition: 'opacity 120ms ease',
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
