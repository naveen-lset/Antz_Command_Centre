/**
 * Live DOM → layout tree, for rebuilding a screen as EDITABLE Figma layers.
 *
 *   node tools/figma/extract-dom.mjs [url] [out.json] [width]
 *
 * Why the DOM and not the source: the desktop Home composes ~10 components over
 * `core/query` reads of a 194MB extract. Re-deriving those figures in a builder
 * script would be a second implementation of the app that can silently disagree
 * with it. Reading the rendered tree takes the real numbers, the real wrapping and
 * the real geometry, and `prefers-reduced-motion` (set in cdp.mjs) guarantees the
 * capture is the settled state rather than a frame of the entrance animation.
 *
 * Why it stays editable: every flex container carries its direction, gap, padding
 * and alignment into a Figma auto-layout frame, so the result reflows when text is
 * edited. Only genuinely-absolute children (the hero foliage, the mist washes) are
 * placed by coordinate.
 */
import { open, scrollThrough } from './cdp.mjs'
import { writeFileSync } from 'node:fs'

const url = process.argv[2] || 'http://localhost:5202/#/'
const out = process.argv[3] || new URL('./antz-dom.json', import.meta.url).pathname
const width = Number(process.argv[4] || 1440)
/* TALL VIEWPORT, AND IT IS NOT A SCREENSHOT CONVENIENCE. The shell's sidebar is
   `h-screen` with its own scrolling nav list, so at an 900px viewport the lower
   half of the module list is scrolled out of its own container — captured, it
   comes back as a clipped sidebar with Settings sitting on top of Approvals.
   Measuring at full page height puts every internally-scrolled region at its
   natural size, which is the state the design is supposed to show. */
const height = Number(process.argv[5] || 2600)

const c = await open({ url, width, height, scale: 1 })
await scrollThrough(c.evalJS)

/* The whole walk runs inside the page — one round trip, no per-node CDP chatter. */
const WALK = `(() => {
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }

  /* Computed colours arrive as rgb()/rgba(); Figma wants hex + alpha. */
  function color(v) {
    const c = colorKeep(v)
    return c && c.a === 0 ? null : c
  }

  /* COLOURS ARE RESOLVED BY PAINTING THEM, NOT BY PARSING THEM.
     Tailwind v4 hands back oklab() — "oklab(0.999994 0.0000455 0.00002 / 0.85)"
     is what bg-white/85 computes to — and an rgb()-only regex silently returns
     null for it, which is how every white pill on the hero came through with no
     background at all. Rather than reimplement oklab→sRGB (and then oklch, and
     color(display-p3 …) after it), one canvas pixel is filled and read back: the
     browser converts whatever syntax it supports, exactly as it renders it.
     getImageData is un-premultiplied, so the alpha comes back intact. */
  const CTX = (() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    return cv.getContext('2d', { willReadFrequently: true })
  })()

  /* Alpha 0 survives here. A background of alpha 0 is nothing and gets dropped by
     color() above; the first stop of a mask ramp is alpha 0 BY DESIGN, and
     dropping it turns a soft fade into a hard edge. */
  function colorKeep(v) {
    if (!v || v === 'none' || v === 'transparent') return null
    CTX.clearRect(0, 0, 1, 1)
    /* A value the browser rejects leaves fillStyle untouched, so it is parked on a
       sentinel first — otherwise an unparseable colour silently inherits whatever
       was painted last. */
    CTX.fillStyle = '#010203'
    CTX.fillStyle = v
    if (CTX.fillStyle === '#010203' && !/^#010203$/i.test(v.trim())) return null
    CTX.fillRect(0, 0, 1, 1)
    const d = CTX.getImageData(0, 0, 1, 1).data
    const hex = '#' + [d[0], d[1], d[2]].map((x) => x.toString(16).padStart(2, '0')).join('')
    return { hex, a: d[3] / 255 }
  }

  /* linear-gradient / radial-gradient → stops Figma can rebuild. Decorative washes
     on this screen are all two- or three-stop; anything more exotic is dropped
     rather than guessed at. */
  function gradient(bg) {
    if (!bg || bg === 'none') return null
    const kind = bg.startsWith('radial-gradient') ? 'RADIAL' : bg.startsWith('linear-gradient') ? 'LINEAR' : null
    if (!kind) return null
    const inner = bg.slice(bg.indexOf('(') + 1, bg.lastIndexOf(')'))
    const parts = []
    let depth = 0, cur = ''
    for (const ch of inner) {
      if (ch === '(') depth++
      if (ch === ')') depth--
      if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = '' } else cur += ch
    }
    if (cur.trim()) parts.push(cur.trim())
    const stops = []
    let angle = 180
    /* Each part is "<colour> <position>?" in any colour syntax, so the position is
       peeled off the end and the remainder handed to the canvas resolver — the
       same reason as colorKeep above: an oklab stop must not be skipped. */
    for (const p of parts) {
      const t = p.trim()
      if (/^-?[\\d.]+deg$/.test(t)) { angle = parseFloat(t); continue }
      if (/^to\\s/.test(t)) {
        angle = /bottom/.test(t) ? 180 : /top/.test(t) ? 0 : /right/.test(t) ? 90 : 270
        continue
      }
      if (/^(in|from)\\s/.test(t)) continue // interpolation hints: "in oklab"
      const pm = t.match(/\\s([-\\d.]+)%\\s*$/)
      const col = colorKeep(pm ? t.slice(0, pm.index).trim() : t)
      if (col) stops.push({ ...col, pos: pm ? Number(pm[1]) / 100 : null })
    }
    if (stops.length < 2) return null
    stops.forEach((s, i) => { if (s.pos === null) s.pos = i / (stops.length - 1) })

    /* A FULLY TRANSPARENT STOP HAS NO COLOUR OF ITS OWN, AND THAT MATTERS.
       Reading one back off the canvas gives #000000 — the cleared pixel — because
       at alpha 0 the channels carry no information. CSS interpolates gradients in
       premultiplied space, so "white → transparent" stays white as it fades;
       Figma interpolates straight RGB, so the same pair fades white → BLACK and
       the hero's soft mist washes come out as grey blobs. Borrowing the nearest
       opaque stop's colour reproduces the premultiplied result. */
    const lit = stops.filter((s) => s.a > 0)
    if (lit.length) {
      for (const s of stops) {
        if (s.a > 0) continue
        let best = lit[0]
        for (const l of lit) if (Math.abs(l.pos - s.pos) < Math.abs(best.pos - s.pos)) best = l
        s.hex = best.hex
      }
    }
    return { kind, angle, stops }
  }
  function hexToRgb(h) {
    h = h.replace('#', '')
    if (h.length === 3) h = h.split('').map((x) => x + x).join('')
    const n = parseInt(h.slice(0, 6), 16)
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    return 'rgba(' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',') + ',' + a + ')'
  }

  /* SVG children → absolute path data. Lucide draws with path/circle/line/rect/
     polyline only, and the app's own marks add ellipse — so those six cover it. */
  function svgPaths(svg) {
    const out = []
    const vb = (svg.getAttribute('viewBox') || '').split(/[ ,]+/).map(Number)
    for (const el of svg.querySelectorAll('path,circle,line,rect,polyline,polygon,ellipse')) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const t = el.tagName.toLowerCase()
      const n = (a) => px(el.getAttribute(a))
      let d = null
      if (t === 'path') d = el.getAttribute('d')
      else if (t === 'circle') {
        const [cx, cy, r] = [n('cx'), n('cy'), n('r')]
        d = 'M' + (cx - r) + ' ' + cy + 'A' + r + ' ' + r + ' 0 1 0 ' + (cx + r) + ' ' + cy +
            'A' + r + ' ' + r + ' 0 1 0 ' + (cx - r) + ' ' + cy + 'Z'
      } else if (t === 'ellipse') {
        const [cx, cy, rx, ry] = [n('cx'), n('cy'), n('rx'), n('ry')]
        d = 'M' + (cx - rx) + ' ' + cy + 'A' + rx + ' ' + ry + ' 0 1 0 ' + (cx + rx) + ' ' + cy +
            'A' + rx + ' ' + ry + ' 0 1 0 ' + (cx - rx) + ' ' + cy + 'Z'
      } else if (t === 'line') d = 'M' + n('x1') + ' ' + n('y1') + 'L' + n('x2') + ' ' + n('y2')
      else if (t === 'rect') {
        const [x, y, w, h] = [n('x'), n('y'), n('width'), n('height')]
        d = 'M' + x + ' ' + y + 'H' + (x + w) + 'V' + (y + h) + 'H' + x + 'Z'
      } else if (t === 'polyline' || t === 'polygon') {
        const pts = (el.getAttribute('points') || '').trim().split(/\\s+|,/).map(Number)
        for (let i = 0; i < pts.length; i += 2) d = (d ? d + 'L' : 'M') + pts[i] + ' ' + pts[i + 1]
        if (t === 'polygon' && d) d += 'Z'
      }
      if (!d) continue
      out.push({
        d,
        stroke: color(cs.stroke),
        fill: color(cs.fill),
        width: px(cs.strokeWidth) || 1,
        cap: cs.strokeLinecap || 'butt',
        join: cs.strokeLinejoin || 'miter',
        dash: (cs.strokeDasharray || 'none') === 'none' ? null : cs.strokeDasharray.split(/[ ,]+/).map(Number).filter((x) => !isNaN(x)),
        opacity: Number(cs.strokeOpacity === '' ? 1 : cs.strokeOpacity),
      })
    }
    return { viewBox: vb.length === 4 ? vb : null, paths: out }
  }

  const rootRect = document.body.getBoundingClientRect()
  const SX = window.scrollX, SY = window.scrollY

  function walk(el, depth) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return null
    const r = el.getBoundingClientRect()
    if (r.width < 0.5 || r.height < 0.5) return null
    const op = Number(cs.opacity)

    const tag = el.tagName.toLowerCase()

    /* An <svg> is a leaf: its geometry is the node. It leaves as a self-contained
       SVG string so the builder can hand it to figma.createNodeFromSvg — that
       yields an editable vector tree and sidesteps the vectorPaths rules
       (absolute commands only, re-origining to the path bbox) entirely.
       The computed stroke/fill are inlined because lucide draws with
       stroke="currentColor", which means nothing outside the document. */
    if (tag === 'svg') {
      const g = svgPaths(el)
      if (!g.paths.length) return null
      const vb = g.viewBox ? g.viewBox.join(' ') : '0 0 ' + r.width + ' ' + r.height
      const body = g.paths.map((p) => {
        const a = ['d="' + p.d + '"']
        a.push('fill="' + (p.fill ? p.fill.hex : 'none') + '"')
        if (p.fill && p.fill.a < 1) a.push('fill-opacity="' + p.fill.a + '"')
        if (p.stroke) {
          a.push('stroke="' + p.stroke.hex + '"', 'stroke-width="' + p.width + '"')
          if (p.stroke.a < 1 || p.opacity < 1) a.push('stroke-opacity="' + (p.stroke.a * p.opacity) + '"')
          a.push('stroke-linecap="' + p.cap + '"', 'stroke-linejoin="' + p.join + '"')
          if (p.dash) a.push('stroke-dasharray="' + p.dash.join(' ') + '"')
        }
        return '<path ' + a.join(' ') + '/>'
      }).join('')
      return {
        kind: 'svg', name: el.getAttribute('data-name') || el.classList[0] || 'icon',
        x: r.x + SX, y: r.y + SY, w: r.width, h: r.height, opacity: op,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + r.width + '" height="' + r.height + '">' + body + '</svg>',
      }
    }

    if (tag === 'img') {
      /* The hero artwork is masked by a vertical alpha ramp — transparent at the
         top, solid through the middle, fading out at the foot — which is the only
         reason it has no seam against the banner gradient above it or the ground
         below. Captured here and rebuilt as a real Figma mask layer; dropped, the
         illustration lands as a hard-edged rectangle. */
      const mask = gradient(cs.maskImage) || gradient(cs.webkitMaskImage)
      return { kind: 'image', name: el.getAttribute('alt') || 'image', src: el.currentSrc || el.src,
        x: r.x + SX, y: r.y + SY, w: r.width, h: r.height, opacity: op,
        fit: cs.objectFit, pos: cs.objectPosition, radius: radii(cs), mask }
    }

    /* An input's prompt lives in the placeholder attribute, not in textContent, so
       the module search reads back as an empty rounded box unless it is lifted out
       here. Rendered at the input's own type, at the placeholder's colour. */
    if (tag === 'input' || tag === 'textarea') {
      const chars = el.value || el.getAttribute('placeholder') || ''
      if (!chars.trim()) return null
      return {
        kind: 'text', chars,
        x: r.x + SX + px(cs.paddingLeft), y: r.y + SY, w: Math.max(4, r.width - px(cs.paddingLeft)), h: r.height,
        opacity: op, font: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        size: px(cs.fontSize), weight: Number(cs.fontWeight) || 400,
        color: color(cs.color) || { hex: '#9aa39c', a: 1 }, align: cs.textAlign,
        lh: cs.lineHeight === 'normal' ? null : px(cs.lineHeight), ls: px(cs.letterSpacing),
        transform: cs.textTransform, decoration: 'none',
      }
    }

    /* A leaf that holds only text becomes one text node — never a frame wrapping a
       string, which is what makes the result editable rather than a pile of boxes. */
    const kids = [...el.childNodes]
    const hasElementChild = kids.some((k) => k.nodeType === 1)
    const raw = el.textContent.replace(/\\s+/g, ' ').trim()
    if (!hasElementChild && raw) {
      return {
        kind: 'text', chars: raw,
        x: r.x + SX, y: r.y + SY, w: r.width, h: r.height, opacity: op,
        font: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        size: px(cs.fontSize), weight: Number(cs.fontWeight) || 400,
        color: color(cs.color), align: cs.textAlign,
        lh: cs.lineHeight === 'normal' ? null : px(cs.lineHeight),
        ls: px(cs.letterSpacing), transform: cs.textTransform,
        decoration: cs.textDecorationLine,
      }
    }

    const children = []
    for (const k of kids) {
      if (k.nodeType === 1) { const n = walk(k, depth + 1); if (n) children.push(n) }
      else if (k.nodeType === 3 && k.textContent.trim()) {
        /* Mixed content — a bare string beside elements. Keep it as its own text
           node at the parent's own type, so nothing silently vanishes. */
        const range = document.createRange(); range.selectNode(k)
        const rr = range.getBoundingClientRect()
        if (rr.width > 0.5) children.push({
          kind: 'text', chars: k.textContent.replace(/\\s+/g, ' ').trim(),
          x: rr.x + SX, y: rr.y + SY, w: rr.width, h: rr.height, opacity: 1,
          font: cs.fontFamily.split(',')[0].replace(/["']/g, ''), size: px(cs.fontSize),
          weight: Number(cs.fontWeight) || 400, color: color(cs.color), align: cs.textAlign,
          lh: cs.lineHeight === 'normal' ? null : px(cs.lineHeight), ls: px(cs.letterSpacing),
          transform: cs.textTransform, decoration: 'none',
        })
      }
    }
    if (!children.length && !color(cs.backgroundColor) && !gradient(cs.backgroundImage)) return null

    const flex = cs.display === 'flex' || cs.display === 'inline-flex'
    const grid = cs.display === 'grid' || cs.display === 'inline-grid'
    return {
      kind: 'frame',
      name: el.getAttribute('data-name') || el.getAttribute('aria-label') || tag + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''),
      tag, x: r.x + SX, y: r.y + SY, w: r.width, h: r.height, opacity: op,
      layout: flex ? {
        mode: cs.flexDirection.startsWith('column') ? 'VERTICAL' : 'HORIZONTAL',
        wrap: cs.flexWrap === 'wrap',
        gap: px(cs.rowGap === 'normal' ? 0 : cs.rowGap),
        gapX: px(cs.columnGap === 'normal' ? 0 : cs.columnGap),
        align: cs.alignItems, justify: cs.justifyContent,
      } : grid ? { mode: 'GRID', cols: cs.gridTemplateColumns, gap: px(cs.rowGap === 'normal' ? 0 : cs.rowGap), gapX: px(cs.columnGap === 'normal' ? 0 : cs.columnGap) } : null,
      pad: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
      bg: color(cs.backgroundColor), grad: gradient(cs.backgroundImage),
      radius: radii(cs),
      border: px(cs.borderTopWidth) ? { w: px(cs.borderTopWidth), c: color(cs.borderTopColor) } : null,
      shadow: cs.boxShadow === 'none' ? null : cs.boxShadow,
      overflow: cs.overflow,
      position: cs.position,
      /* Figma has no z-index — paint order IS child order — so the stacking level
         has to travel with the node and be resolved into an order by the builder.
         Without it the hero artwork (its container is -z-10) lands on top of the
         figure it is supposed to sit behind. */
      z: cs.zIndex === 'auto' ? 0 : Number(cs.zIndex) || 0,
      children,
    }
  }
  function radii(cs) {
    const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
      .map((v) => parseFloat(v) || 0)
    return r.some((x) => x) ? r : null
  }

  const root = document.querySelector('#root') || document.body
  return { width: document.documentElement.clientWidth, height: document.documentElement.scrollHeight, tree: walk(root, 0) }
})()`

const data = await c.evalJS(WALK)
c.close()

let n = 0
const count = (t) => { n++; (t.children || []).forEach(count) }
count(data.tree)
writeFileSync(out, JSON.stringify(data))
console.log(`${out} — ${data.width}×${data.height}, ${n} nodes, ${(JSON.stringify(data).length / 1024).toFixed(0)}KB`)
