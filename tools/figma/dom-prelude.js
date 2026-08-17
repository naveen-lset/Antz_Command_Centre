/**
 * DOM layout tree → Figma nodes. Injected ahead of each per-section script by
 * build-dom-scripts.mjs; runs inside the `use_figma` sandbox.
 *
 * THE ONE IDEA HERE IS THAT AUTO-LAYOUT IS EARNED, NOT ASSUMED. A container only
 * becomes an auto-layout frame if auto-layout can be shown to reproduce the
 * positions the browser actually computed — `plan()` predicts where each child
 * would land and compares against the captured geometry, and anything that drifts
 * more than a pixel falls back to absolute placement. That keeps the design
 * editable where editing is meaningful and pixel-true everywhere else, instead of
 * trading one for the other across the whole page.
 */

/* ── colour ──────────────────────────────────────────────────────────────── */
const RGB = (hex) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const solid = (c) => (c ? [{ type: 'SOLID', color: RGB(c.hex), ...(c.a < 1 ? { opacity: c.a } : {}) }] : [])

/* CSS gradient angle is clockwise from "to top"; Figma wants a transform matrix.
   Only the two-point linear case and a centred radial are used on this screen. */
function gradPaint(g) {
  const stops = g.stops.map((s) => ({ position: Math.max(0, Math.min(1, s.pos)), color: { ...RGB(s.hex), a: s.a } }))
  if (g.kind === 'RADIAL') {
    return { type: 'GRADIENT_RADIAL', gradientStops: stops, gradientTransform: [[1, 0, 0], [0, 1, 0]] }
  }
  const rad = ((g.angle - 90) * Math.PI) / 180
  const c = Math.cos(rad), s = Math.sin(rad)
  return { type: 'GRADIENT_LINEAR', gradientStops: stops, gradientTransform: [[c, -s, 0.5 - c * 0.5 + s * 0.5], [s, c, 0.5 - s * 0.5 - c * 0.5]] }
}

/* ── fonts ───────────────────────────────────────────────────────────────── */
/* Verified against listAvailableFontsAsync, not guessed: Figtree ships
   "SemiBold", SF Pro Rounded ships "Semibold". One family's spelling applied to
   the other is an unloaded-font throw at the first `characters` write. */
const FAMILY = { 'Figtree Variable': 'Figtree', Figtree: 'Figtree', 'SF Pro Rounded': 'SF Pro Rounded' }
const STYLE = {
  Figtree: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' },
  'SF Pro Rounded': { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Heavy', 900: 'Black' },
}
const fontOf = (t) => {
  const family = FAMILY[t.font] || 'Figtree'
  const table = STYLE[family] || STYLE.Figtree
  const w = Math.round((t.weight || 400) / 100) * 100
  return { family, style: table[w] || table[400] }
}

async function loadFontsFor(tree) {
  const seen = new Map()
  const walk = (n) => {
    if (n.kind === 'text') { const f = fontOf(n); seen.set(f.family + '|' + f.style, f) }
    ;(n.children || []).forEach(walk)
  }
  walk(tree)
  for (const f of seen.values()) await figma.loadFontAsync(f)
  return [...seen.keys()]
}

/* ── layout planning ─────────────────────────────────────────────────────── */
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1.2 : tol)

/**
 * Decide how a frame should hold its children.
 * Returns {mode:'NONE'} for absolute placement, or an auto-layout spec that has
 * been checked against the captured child positions.
 */
function plan(n) {
  const kids = n.children || []
  if (!kids.length) return { mode: 'NONE' }
  if (kids.length === 1) {
    /* A single-child wrapper is the most common frame on the page — a card around
       its content, a link around a row. Left absolute they are dead boxes; made
       auto-layout they carry real padding, so editing the content reflows the card
       instead of leaving it floating at a fixed offset. `check` still has to agree. */
    const mode = n.layout && n.layout.mode === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL'
    return check(n, kids, mode)
  }
  if (n.layout && (n.layout.mode === 'VERTICAL' || n.layout.mode === 'HORIZONTAL')) {
    if (n.layout.wrap) return { mode: 'NONE' } // wrapped flex lines are rows, handled as absolute
    return check(n, kids, n.layout.mode)
  }
  if (n.layout && n.layout.mode === 'GRID') return grid(n, kids)
  /* A plain block whose children stack cleanly is a vertical stack in all but
     declaration — treating it as one is what keeps sections reflowable. */
  const v = check(n, kids, 'VERTICAL')
  return v.mode === 'NONE' ? check(n, kids, 'HORIZONTAL') : v
}

/** Predict auto-layout output and accept it only if it matches the browser. */
function check(n, kids, mode) {
  const vert = mode === 'VERTICAL'
  const pos = (k) => (vert ? k.y - n.y : k.x - n.x)
  const len = (k) => (vert ? k.h : k.w)
  const sorted = [...kids].sort((a, b) => pos(a) - pos(b))

  for (let i = 1; i < sorted.length; i++) {
    if (pos(sorted[i]) + 0.5 < pos(sorted[i - 1]) + len(sorted[i - 1])) return { mode: 'NONE' } // overlap
  }
  const gaps = []
  for (let i = 1; i < sorted.length; i++) gaps.push(pos(sorted[i]) - (pos(sorted[i - 1]) + len(sorted[i - 1])))
  const gap = gaps.length ? Math.min(...gaps) : 0
  if (gap < -0.5) return { mode: 'NONE' }

  const padA = pos(sorted[0])
  const spread = gaps.length ? Math.max(...gaps) - Math.min(...gaps) : 0

  /* Uneven gaps are still auto-layoutable when the run is exactly two children
     pushed apart — that is `justify-content: space-between`, not a broken stack. */
  let justify = 'MIN'
  if (spread > 1.2) {
    if (sorted.length === 2) justify = 'SPACE_BETWEEN'
    else return { mode: 'NONE' }
  }
  /* Cross-axis: only a uniform alignment survives; mixed offsets mean absolute. */
  const cross = (k) => (vert ? k.x - n.x : k.y - n.y)
  const crossEnd = (k) => (vert ? n.w - (k.x - n.x + k.w) : n.h - (k.y - n.y + k.h))
  let align = 'MIN'
  if (kids.every((k) => near(cross(k), cross(kids[0]), 1.2))) align = 'MIN'
  else if (kids.every((k) => near(cross(k) + (vert ? k.w : k.h) / 2, (vert ? n.w : n.h) / 2, 2))) align = 'CENTER'
  else if (kids.every((k) => near(crossEnd(k), crossEnd(kids[0]), 1.2))) align = 'MAX'
  else align = null
  if (align === null) return { mode: 'NONE' }

  const crossPad = align === 'MIN' ? Math.min(...kids.map(cross)) : 0
  const pad = vert
    ? { t: padA, l: crossPad, r: n.w - Math.max(...kids.map((k) => k.x - n.x + k.w)), b: n.h - (pos(sorted.at(-1)) + len(sorted.at(-1))) }
    : { l: padA, t: crossPad, b: n.h - Math.max(...kids.map((k) => k.y - n.y + k.h)), r: n.w - (pos(sorted.at(-1)) + len(sorted.at(-1))) }

  /* A negative padding means a child hangs outside its parent — an absolutely
     positioned decoration, or artwork bleeding past the edge. Auto-layout cannot
     express that and would silently pull the child inside the box, so the whole
     container stays absolute rather than quietly moving something. */
  if (Math.min(pad.t, pad.r, pad.b, pad.l) < -0.5) return { mode: 'NONE' }

  return {
    mode, gap: Math.max(0, Math.round(gap * 10) / 10), justify, align,
    pad: { t: Math.max(0, pad.t), r: Math.max(0, pad.r), b: Math.max(0, pad.b), l: Math.max(0, pad.l) },
    order: sorted,
  }
}

/**
 * CSS grid → rows of auto-layout. Figma's own grid is deliberately not used: a
 * vertical stack of horizontal rows is what a designer can actually drag a card
 * out of, and it survives round-tripping through older Figma clients.
 */
function grid(n, kids) {
  const rows = []
  for (const k of [...kids].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.find((r) => Math.abs(r[0].y - k.y) < 4)
    if (row) row.push(k); else rows.push([k])
  }
  if (rows.length === 1 && rows[0].length === kids.length) return check(n, kids, 'HORIZONTAL')
  if (rows.every((r) => r.length === 1)) return check(n, kids, 'VERTICAL')
  return { mode: 'GRID_ROWS', rows, gap: n.layout.gap || 0, gapX: n.layout.gapX || 0 }
}

/* ── build ───────────────────────────────────────────────────────────────── */
const clamp = (v) => Math.max(0.01, v)

/** CSS painting order for overlapping siblings, as a stable sort by stacking level. */
const stack = (kids) => kids.map((k, i) => [k, i]).sort((a, b) => (a[0].z || 0) - (b[0].z || 0) || a[1] - b[1]).map((p) => p[0])

function makeText(t) {
  const node = figma.createText()
  const f = fontOf(t)
  node.fontName = f
  node.characters = t.chars
  node.fontSize = Math.max(1, t.size)
  if (t.color) node.fills = solid(t.color)
  if (t.lh) node.lineHeight = { unit: 'PIXELS', value: t.lh }
  if (t.ls) node.letterSpacing = { unit: 'PIXELS', value: t.ls }
  if (t.transform === 'uppercase') node.textCase = 'UPPER'
  else if (t.transform === 'lowercase') node.textCase = 'LOWER'
  if (t.decoration && t.decoration.includes('line-through')) node.textDecoration = 'STRIKETHROUGH'
  else if (t.decoration && t.decoration.includes('underline')) node.textDecoration = 'UNDERLINE'
  node.textAlignHorizontal = { center: 'CENTER', right: 'RIGHT', justify: 'JUSTIFIED' }[t.align] || 'LEFT'

  /* One line hugs — it stays draggable and re-measures when the copy changes. A
     wrapped block is pinned to the width the browser wrapped it at, because
     WIDTH_AND_HEIGHT would unwrap it into a single long line.

     CENTRED AND RIGHT-ALIGNED TEXT MUST NOT HUG. Its alignment is expressed
     against the width of its box, so hugging collapses the node to the glyphs and
     pins it at the box's left edge — which is how the hero's "110,020" and
     "Total Animals" came through left-aligned against a 1032px column. Keeping
     the measured width is what preserves the centring. */
  const oneLine = !t.lh || t.h <= t.lh * 1.4
  const aligned = node.textAlignHorizontal !== 'LEFT'
  if (oneLine && !aligned) node.textAutoResize = 'WIDTH_AND_HEIGHT'
  else {
    node.textAutoResize = 'HEIGHT'
    node.resize(clamp(t.w), clamp(t.h))
  }
  node.name = t.chars.length > 40 ? t.chars.slice(0, 40) + '…' : t.chars
  if (t.opacity < 1) node.opacity = t.opacity
  return node
}

function paintFrame(f, node) {
  const fills = []
  if (f.bg) fills.push(...solid(f.bg))
  if (f.grad) fills.push(gradPaint(f.grad))
  node.fills = fills
  if (f.radius) {
    /* `rounded-full` computes to 33554400px. Figma clamps it anyway, but an
       explicit clamp keeps the layer panel readable and survives a later resize. */
    const cap = Math.max(0.01, Math.min(f.w, f.h) / 2)
    const [tl, tr, br, bl] = f.radius.map((r) => Math.min(r, cap))
    node.topLeftRadius = tl; node.topRightRadius = tr; node.bottomRightRadius = br; node.bottomLeftRadius = bl
  }
  if (f.border && f.border.c) { node.strokes = solid(f.border.c); node.strokeWeight = f.border.w; node.strokeAlign = 'INSIDE' }
  if (f.shadow && f.shadow !== 'none') {
    const m = f.shadow.match(/rgba?\(([^)]+)\)\s*(-?[\d.]+)px\s*(-?[\d.]+)px\s*(-?[\d.]+)px/)
    if (m) {
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
      node.effects = [{ type: 'DROP_SHADOW', color: { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p.length > 3 ? p[3] : 1 },
        offset: { x: Number(m[2]), y: Number(m[3]) }, radius: Number(m[4]), spread: 0, visible: true, blendMode: 'NORMAL' }]
    }
  }
  if (f.overflow === 'hidden') node.clipsContent = true
  else node.clipsContent = false
}

/** Recursively build `n` and return the created node (unparented). */
function build(n) {
  if (n.kind === 'text') return makeText(n)

  if (n.kind === 'svg') {
    let g
    try { g = figma.createNodeFromSvg(n.svg) } catch (e) { return null }
    g.name = n.name || 'icon'
    g.resize(clamp(n.w), clamp(n.h))
    if (n.opacity < 1) g.opacity = n.opacity
    return g
  }

  if (n.kind === 'image') {
    /* The bytes arrive after the tree is built — `upload_assets` sets the fill on
       this node by id. Named so the follow-up can find it without guessing. */
    const r = figma.createRectangle()
    r.name = 'IMAGE:' + (n.name || 'image')
    r.resize(clamp(n.w), clamp(n.h))
    r.fills = [{ type: 'SOLID', color: RGB('#dfe9e0') }]
    if (n.radius) { const [tl, tr, br, bl] = n.radius; r.topLeftRadius = tl; r.topRightRadius = tr; r.bottomRightRadius = br; r.bottomLeftRadius = bl }
    if (n.opacity < 1) r.opacity = n.opacity
    if (!n.mask) return r

    /* A CSS alpha mask becomes a real mask layer: a rectangle carrying the same
       gradient, marked `isMask`, sitting UNDER the image — Figma masks every
       sibling above it in the same parent, so the order is mask first. */
    const wrap = figma.createFrame()
    wrap.name = 'artwork'
    wrap.layoutMode = 'NONE'
    wrap.fills = []
    wrap.clipsContent = false
    wrap.resize(clamp(n.w), clamp(n.h))
    const m = figma.createRectangle()
    m.name = 'mask'
    m.resize(clamp(n.w), clamp(n.h))
    m.fills = [gradPaint(n.mask)]
    wrap.appendChild(m)
    wrap.appendChild(r)
    m.x = 0; m.y = 0; r.x = 0; r.y = 0
    m.isMask = true
    return wrap
  }

  const p = plan(n)
  const kids = n.children || []

  if (p.mode === 'GRID_ROWS') {
    const outer = figma.createAutoLayout('VERTICAL', { name: n.name || 'grid' })
    outer.itemSpacing = p.gap
    paintFrame(n, outer)
    outer.resize(clamp(n.w), clamp(n.h))
    outer.primaryAxisSizingMode = 'FIXED'; outer.counterAxisSizingMode = 'FIXED'
    for (const row of p.rows) {
      const rf = figma.createAutoLayout('HORIZONTAL', { name: 'row' })
      rf.itemSpacing = p.gapX
      rf.fills = []
      outer.appendChild(rf)
      rf.layoutSizingHorizontal = 'FILL'
      for (const k of row) {
        const c = build(k)
        if (!c) continue
        rf.appendChild(c)
        if (c.type !== 'TEXT') c.resize(clamp(k.w), clamp(k.h))
      }
      rf.layoutSizingVertical = 'HUG'
    }
    return outer
  }

  if (p.mode === 'VERTICAL' || p.mode === 'HORIZONTAL') {
    const f = figma.createAutoLayout(p.mode, { name: n.name || 'frame' })
    paintFrame(n, f)
    f.itemSpacing = p.justify === 'SPACE_BETWEEN' ? 0 : p.gap
    f.paddingTop = p.pad.t; f.paddingRight = p.pad.r; f.paddingBottom = p.pad.b; f.paddingLeft = p.pad.l
    f.primaryAxisAlignItems = p.justify
    f.counterAxisAlignItems = p.align
    /* resize() freezes both axes to FIXED, so it comes before the sizing modes —
       reversing these two silently discards the size. */
    f.resize(clamp(n.w), clamp(n.h))
    f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'FIXED'
    for (const k of p.order || kids) {
      const c = build(k)
      if (!c) continue
      f.appendChild(c)
      if (c.type !== 'TEXT') c.resize(clamp(k.w), clamp(k.h))
    }
    if (n.opacity < 1) f.opacity = n.opacity
    return f
  }

  /* Absolute: the browser's own coordinates, relative to this frame. */
  const f = figma.createFrame()
  f.name = n.name || 'frame'
  f.layoutMode = 'NONE'
  paintFrame(n, f)
  f.resize(clamp(n.w), clamp(n.h))
  /* Paint order, not DOM order. Figma draws later children on top, so the CSS
     stacking level has to become a sort: negatives behind, then the auto/0 run in
     document order, then positives. Only overlapping containers reach this branch
     — an auto-layout run reorders nothing, because there its order is the layout. */
  for (const k of stack(kids)) {
    const c = build(k)
    if (!c) continue
    f.appendChild(c)
    if (c.type !== 'TEXT') c.resize(clamp(k.w), clamp(k.h))
    c.x = k.x - n.x
    c.y = k.y - n.y
  }
  if (n.opacity < 1) f.opacity = n.opacity
  return f
}

/** Find the target page and the root screen frame created by the setup script. */
async function screen(pageName, frameName) {
  const page = figma.root.children.find((p) => p.name === pageName)
  if (!page) throw new Error('page not found: ' + pageName)
  await figma.setCurrentPageAsync(page)
  const root = page.children.find((c) => c.name === frameName)
  if (!root) throw new Error('frame not found: ' + frameName)
  return { page, root }
}
