/* ============================================================================
 * ANTZ Command Centre → Figma builder PRELUDE
 *
 * Paste this at the top of every `use_figma` call, followed by an entry snippet
 * (see figma-entries.md). Mirrors src/v3/CommandCentreV3.tsx, src/v3/viz.tsx,
 * src/detail/DetailPage.tsx and src/detail/charts.tsx 1:1.
 *
 * Everything is real auto-layout + vectors + text. No flattened images.
 * ==========================================================================*/

/* ── Plugin-API compatibility ─────────────────────────────────────────────
 * `node.set()` and `figma.createAutoLayout()` are conveniences of the MCP
 * sandbox, not the real Plugin API. Shim them so one builder runs in both.
 * ----------------------------------------------------------------------- */
const SET = (n, props) => {
  for (const k in props) {
    if (k === 'width') n.resize(props[k], n.height)
    else if (k === 'height') n.resize(n.width, props[k])
    else n[k] = props[k]
  }
  return n
}
/**
 * NEVER assign onto the `figma` global — it is frozen in the plugin sandbox, so
 * `figma.createAutoLayout = …` throws while the module is still evaluating and
 * Figma reports only "error loading the plugin environment". Dispatch locally.
 */
const CREATE_AL = (a, b) => {
  if (typeof figma.createAutoLayout === 'function') return figma.createAutoLayout(a, b)
  const dir = typeof a === 'string' ? a : 'HORIZONTAL'
  const props = typeof a === 'object' && a ? a : b
  const f = figma.createFrame()
  f.layoutMode = dir === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL'
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.clipsContent = false
  if (props) SET(f, props)
  return f
}
const RESCALE = (n, s) => {
  if (typeof n.rescale === 'function') { n.rescale(s); return n }
  const walk = (m) => {
    m.x *= s; m.y *= s
    if (typeof m.resize === 'function' && m.width && m.height) m.resize(Math.max(0.01, m.width * s), Math.max(0.01, m.height * s))
    if ('strokeWeight' in m && typeof m.strokeWeight === 'number') m.strokeWeight = m.strokeWeight * s
    if (m.children) for (const c of m.children) walk(c)
  }
  walk(n)
  return n
}

/* ── tokens (from src/index.css @theme + component literals) ─────────────── */
const C = {
  ground: '#e7f0ea',
  cardHome: '#ffffff',
  value: '#2f2424',
  white: '#ffffff',
  ink: '#1c1a16',
  ink2: '#3d3a34',
  muted: '#6d6860',
  faint: '#9b958b',
  pos: '#37bd69',
  neg: '#fa6140',
  brand: '#034739',
  grid: '#f0efec',
  track: '#f2f1ed',
  divider: '#f4f3ef',
  chip: '#f4f3ef',
  chapter: '#5f6b62',
  chipTrack: '#e8e6df',
  gaugeChip: '#f2f0ea',
  scrim: '#101a15',
}
const TONE = { good: '#1e7a44', warn: '#b45309', bad: '#dc2626', neutral: '#9b958b' }
const CHART_HUES = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#0284c7', '#be123c', '#4d7c0f', '#4f46e5', '#e8590c']
const SHARE_STEPS = [1, 0.62, 0.4, 0.26, 0.17]

const PHONE_W = 390
/** Viewport frame height — iPhone 14/15. Content taller than this is clipped. */
const PHONE_H = 844
const SHEET_INSET = 0                          // full-bleed sheet (was 8)
const SHEET_W = PHONE_W - SHEET_INSET * 2      // 390
const MAIN_PAD = 14                            // px-3.5
const CARD_PAD = 20                            // p-5
const CARD_W = SHEET_W - MAIN_PAD * 2          // 346
const CONTENT_W = CARD_W - CARD_PAD * 2        // 306
const HOME_PAD = 20                            // px-5
const HOME_CONTENT_W = PHONE_W - HOME_PAD * 2  // 350

/* ── color helpers ───────────────────────────────────────────────────────── */
const hex = (h) => {
  const s = h.replace('#', '')
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const solid = (h, opacity) => {
  const p = { type: 'SOLID', color: hex(h) }
  if (opacity !== undefined && opacity !== 1) p.opacity = opacity
  return p
}
/** Flatten `accent @ a` over an opaque backdrop — matches alpha()/color-mix() over white. */
const mixOver = (h, a, over) => {
  const f = hex(h), b = hex(over || '#ffffff')
  const m = (x, y) => Math.round((x * a + y * (1 - a)) * 255)
  return `#${[m(f.r, b.r), m(f.g, b.g), m(f.b, b.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
const fmt = (n) => {
  const neg = Number(n) < 0
  const digits = String(Math.abs(Math.round(Number(n))))
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
const compact = (n) => {
  const a = Math.abs(n)
  if (a >= 100000) return `${Math.round(n / 1000)}K`
  if (a >= 10000) return `${(n / 1000).toFixed(1)}K`
  if (a >= 1000) return fmt(n)
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)))
}
const signColor = (t) => {
  const s = String(t).trim()
  if (s.startsWith('+')) return C.pos
  if (s.startsWith('-') || s.startsWith('−')) return C.neg
  return null
}
const toneColor = (t) => TONE[t || 'neutral']

/* ── fonts ───────────────────────────────────────────────────────────────── */
const F = {}
async function initFonts() {
  const avail = await figma.listAvailableFontsAsync()
  const have = new Set(avail.map((f) => `${f.fontName.family}|${f.fontName.style}`))
  // First family that has the style wins — DM Sans everywhere, Inter as safety net.
  const pick = (families, wanted) => {
    for (const family of families) {
      for (const w of wanted) if (have.has(`${family}|${w}`)) return { family, style: w }
    }
    return null
  }
  const sans = ['DM Sans', 'Inter']
  F[400] = pick(sans, ['Regular']) || { family: 'Inter', style: 'Regular' }
  F[500] = pick(sans, ['Medium', 'Regular']) || F[400]
  F[600] = pick(sans, ['SemiBold', 'Semi Bold', 'Medium']) || F[500]
  F[700] = pick(sans, ['Bold']) || F[600]
  // Numerals wear SF Pro Rounded (local font in the user's Figma); DM Sans Bold otherwise.
  F.display = pick(['SF Pro Rounded'], ['Bold', 'Semibold', 'Heavy']) || F[700]
  const uniq = {}
  for (const k of Object.keys(F)) uniq[`${F[k].family}|${F[k].style}`] = F[k]
  for (const f of Object.values(uniq)) await figma.loadFontAsync(f)
  return F
}

/* ── primitives ──────────────────────────────────────────────────────────── */
/**
 * @param o.s size  @o.w weight  @o.c hex  @o.lh line-height px  @o.ls letter-spacing %
 * @param o.wrap true → wrapping paragraph (needs a FILL/fixed width from the caller)
 */
function T(chars, o) {
  o = o || {}
  const t = figma.createText()
  t.fontName = o.display ? F.display : F[o.w || 400]
  t.characters = String(chars == null ? '' : chars)
  t.fontSize = o.s || 13
  t.fills = [o.fill || solid(o.c || C.ink)]
  if (o.lh) t.lineHeight = { unit: 'PIXELS', value: o.lh }
  if (o.ls) t.letterSpacing = { unit: 'PERCENT', value: o.ls }
  if (o.align) t.textAlignHorizontal = o.align
  if (o.upper) t.textCase = 'UPPER'
  t.textAutoResize = o.wrap ? 'HEIGHT' : 'WIDTH_AND_HEIGHT'
  if (o.name) t.name = o.name
  return t
}
/** Row/column auto-layout. gap, pad(number|[v,h]|[t,r,b,l]), align, justify. */
function AL(dir, o) {
  o = o || {}
  const f = CREATE_AL(dir === 'v' ? 'VERTICAL' : 'HORIZONTAL')
  f.itemSpacing = o.gap || 0
  const p = o.pad
  if (typeof p === 'number') SET(f, { paddingTop: p, paddingRight: p, paddingBottom: p, paddingLeft: p })
  else if (Array.isArray(p) && p.length === 2) SET(f, { paddingTop: p[0], paddingBottom: p[0], paddingLeft: p[1], paddingRight: p[1] })
  else if (Array.isArray(p) && p.length === 4) SET(f, { paddingTop: p[0], paddingRight: p[1], paddingBottom: p[2], paddingLeft: p[3] })
  f.fills = o.bg ? [solid(o.bg, o.bgOpacity)] : []
  if (o.radius) f.cornerRadius = o.radius
  if (o.align) f.counterAxisAlignItems = o.align            // 'MIN'|'CENTER'|'MAX'|'BASELINE'
  if (o.justify) f.primaryAxisAlignItems = o.justify        // 'MIN'|'CENTER'|'MAX'|'SPACE_BETWEEN'
  if (o.name) f.name = o.name
  if (o.clip !== undefined) f.clipsContent = o.clip
  if (o.shadow) f.effects = [{ type: 'DROP_SHADOW', color: { ...hex(o.shadow.c || C.ink), a: o.shadow.a }, offset: { x: 0, y: o.shadow.y }, radius: o.shadow.r, spread: 0, visible: true, blendMode: 'NORMAL' }]
  return f
}
/** Append then size: FILL/HUG are only legal once the node has an auto-layout parent. */
const add = (parent, child, hSize, vSize) => {
  parent.appendChild(child)
  if (hSize) child.layoutSizingHorizontal = hSize
  if (vSize) child.layoutSizingVertical = vSize
  return child
}
const fill = (parent, child) => add(parent, child, 'FILL')
/** Fixed-size spacer for margins auto-layout gaps can't express. */
const spacer = (parent, h) => {
  const s = figma.createFrame()
  s.resize(1, h); s.fills = []; s.name = 'spacer'
  parent.appendChild(s)
  s.layoutSizingHorizontal = 'FILL'
  return s
}
function rect(w, h, colr, radius, opacity) {
  const r = figma.createRectangle()
  r.resize(Math.max(0.01, w), Math.max(0.01, h))
  r.fills = colr ? [solid(colr, opacity)] : []
  if (radius) r.cornerRadius = radius
  return r
}
/**
 * Figma's `vectorPaths` accepts ONLY absolute M/L/C/Q/Z. SVG sources (lucide
 * icons, the forest band) use relative commands, H/V/S/T shorthands and arcs —
 * normalize everything down to the supported subset. Arcs become cubics via the
 * standard endpoint→center parameterization.
 */
function normPath(d) {
  const tokens = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[+-]?\d+)?/gi) || []
  let i = 0
  const num = () => parseFloat(tokens[i++])
  let out = ''
  let x = 0, y = 0, sx = 0, sy = 0
  let px = null, py = null, pq = null, pcmd = ''
  const emit = (s) => { out += s }

  const arcToCubics = (x1, y1, rx, ry, phi, laf, sf, x2, y2) => {
    // F.6.5 endpoint → center parameterization (SVG spec)
    if (!rx || !ry) { emit(` L ${x2} ${y2}`); return }
    const rad = (phi * Math.PI) / 180
    const cosp = Math.cos(rad), sinp = Math.sin(rad)
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
    const x1p = cosp * dx + sinp * dy
    const y1p = -sinp * dx + cosp * dy
    let rx2 = rx * rx, ry2 = ry * ry
    const lam = (x1p * x1p) / rx2 + (y1p * y1p) / ry2
    if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; rx2 = rx * rx; ry2 = ry * ry }
    let num2 = rx2 * ry2 - rx2 * y1p * y1p - ry2 * x1p * x1p
    if (num2 < 0) num2 = 0
    let root = Math.sqrt(num2 / (rx2 * y1p * y1p + ry2 * x1p * x1p || 1))
    if (laf === sf) root = -root
    const cxp = (root * rx * y1p) / ry
    const cyp = (-root * ry * x1p) / rx
    const cx = cosp * cxp - sinp * cyp + (x1 + x2) / 2
    const cy = sinp * cxp + cosp * cyp + (y1 + y2) / 2
    const ang = (ux, uy, vx, vy) => {
      const dot = ux * vx + uy * vy
      const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy)) || 1
      let a = Math.acos(Math.max(-1, Math.min(1, dot / len)))
      if (ux * vy - uy * vx < 0) a = -a
      return a
    }
    const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if (!sf && dth > 0) dth -= 2 * Math.PI
    if (sf && dth < 0) dth += 2 * Math.PI
    const segs = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2)))
    const delta = dth / segs
    const t = (4 / 3) * Math.tan(delta / 4)
    let th = th1
    let cx0 = x1, cy0 = y1
    for (let s = 0; s < segs; s++) {
      const th2 = th + delta
      const c1 = Math.cos(th), s1 = Math.sin(th)
      const c2 = Math.cos(th2), s2 = Math.sin(th2)
      const ex = cx + rx * (cosp * c2) - ry * (sinp * s2)
      const ey = cy + rx * (sinp * c2) + ry * (cosp * s2)
      const q1x = cx0 + t * (-rx * cosp * s1 - ry * sinp * c1)
      const q1y = cy0 + t * (-rx * sinp * s1 + ry * cosp * c1)
      const q2x = ex + t * (rx * cosp * s2 + ry * sinp * c2)
      const q2y = ey + t * (rx * sinp * s2 - ry * cosp * c2)
      emit(` C ${q1x} ${q1y} ${q2x} ${q2y} ${ex} ${ey}`)
      th = th2; cx0 = ex; cy0 = ey
    }
  }

  while (i < tokens.length) {
    const cmd = tokens[i++]
    const rel = cmd === cmd.toLowerCase()
    switch (cmd.toUpperCase()) {
      case 'M': {
        let mx = num(), my = num()
        if (rel) { mx += x; my += y }
        x = mx; y = my; sx = mx; sy = my
        emit(` M ${x} ${y}`)
        // subsequent pairs are implicit LineTos
        while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
          let lx = num(), ly = num()
          if (rel) { lx += x; ly += y }
          x = lx; y = ly
          emit(` L ${x} ${y}`)
        }
        px = py = pq = null; pcmd = 'M'
        break
      }
      case 'L': while (true) { let lx = num(), ly = num(); if (rel) { lx += x; ly += y } x = lx; y = ly; emit(` L ${x} ${y}`); if (i >= tokens.length || /[A-Za-z]/.test(tokens[i])) break } pcmd = 'L'; break
      case 'H': while (true) { let hx = num(); if (rel) hx += x; x = hx; emit(` L ${x} ${y}`); if (i >= tokens.length || /[A-Za-z]/.test(tokens[i])) break } pcmd = 'L'; break
      case 'V': while (true) { let vy = num(); if (rel) vy += y; y = vy; emit(` L ${x} ${y}`); if (i >= tokens.length || /[A-Za-z]/.test(tokens[i])) break } pcmd = 'L'; break
      case 'C': while (true) {
        let c1x = num(), c1y = num(), c2x = num(), c2y = num(), ex = num(), ey = num()
        if (rel) { c1x += x; c1y += y; c2x += x; c2y += y; ex += x; ey += y }
        emit(` C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`)
        px = c2x; py = c2y; x = ex; y = ey
        if (i >= tokens.length || /[A-Za-z]/.test(tokens[i])) break
      } pcmd = 'C'; break
      case 'S': while (true) {
        let c2x = num(), c2y = num(), ex = num(), ey = num()
        if (rel) { c2x += x; c2y += y; ex += x; ey += y }
        const c1x = pcmd === 'C' && px !== null ? 2 * x - px : x
        const c1y = pcmd === 'C' && py !== null ? 2 * y - py : y
        emit(` C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`)
        px = c2x; py = c2y; x = ex; y = ey; pcmd = 'C'
        if (i >= tokens.length || /[A-Za-z]/.test(tokens[i])) break
      } break
      case 'Q': while (true) {
        let qx = num(), qy = num(), ex = num(), ey = num()
        if (rel) { qx += x; qy += y; ex += x; ey += y }
        emit(` Q ${qx} ${qy} ${ex} ${ey}`)
        pq = [qx, qy]; x = ex; y = ey
        if (i >= tokens.length || /[A-Za-z]/.test(tokens[i])) break
      } pcmd = 'Q'; break
      case 'T': while (true) {
        let ex = num(), ey = num()
        if (rel) { ex += x; ey += y }
        const qx = pcmd === 'Q' && pq ? 2 * x - pq[0] : x
        const qy = pcmd === 'Q' && pq ? 2 * y - pq[1] : y
        emit(` Q ${qx} ${qy} ${ex} ${ey}`)
        pq = [qx, qy]; x = ex; y = ey; pcmd = 'Q'
        if (i >= tokens.length || /[A-Za-z]/.test(tokens[i])) break
      } break
      case 'A': while (true) {
        let rx = num(), ry = num(), rot = num(), laf = num(), sf = num(), ex = num(), ey = num()
        if (rel) { ex += x; ey += y }
        arcToCubics(x, y, rx, ry, rot, laf, sf, ex, ey)
        x = ex; y = ey
        if (i >= tokens.length || /[A-Za-z]/.test(tokens[i])) break
      } pcmd = 'C'; break
      case 'Z': emit(' Z'); x = sx; y = sy; pcmd = 'Z'; break
    }
  }
  // Figma also dislikes exponent notation and long floats — round to 3dp.
  return out.trim().replace(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi, (n) => String(Math.round(parseFloat(n) * 1000) / 1000))
}

/** Exact path bounds (curve extrema included) so vectors sit where drawn. */
function pathBBox(d) {
  const t = d.match(/[MLCQZ]|-?\d*\.?\d+/g) || []
  let i = 0, x = 0, y = 0
  let minX = Infinity, minY = Infinity
  const seen = (px, py) => { if (px < minX) minX = px; if (py < minY) minY = py }
  const cubicMin = (p0, p1, p2, p3) => {
    let m = Math.min(p0, p3)
    const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0
    const roots = []
    if (Math.abs(a) < 1e-9) { if (Math.abs(b) > 1e-9) roots.push(-c / b) }
    else { const disc = b * b - 4 * a * c; if (disc >= 0) { const q = Math.sqrt(disc); roots.push((-b + q) / (2 * a), (-b - q) / (2 * a)) } }
    for (const r of roots) if (r > 0 && r < 1) {
      const u = 1 - r
      m = Math.min(m, u * u * u * p0 + 3 * u * u * r * p1 + 3 * u * r * r * p2 + r * r * r * p3)
    }
    return m
  }
  const quadMin = (p0, p1, p2) => {
    let m = Math.min(p0, p2)
    const den = p0 - 2 * p1 + p2
    if (Math.abs(den) > 1e-9) { const r = (p0 - p1) / den; if (r > 0 && r < 1) { const u = 1 - r; m = Math.min(m, u * u * p0 + 2 * u * r * p1 + r * r * p2) } }
    return m
  }
  while (i < t.length) {
    const c = t[i++]
    if (c === 'M' || c === 'L') { x = +t[i++]; y = +t[i++]; seen(x, y) }
    else if (c === 'C') {
      const c1x = +t[i++], c1y = +t[i++], c2x = +t[i++], c2y = +t[i++], ex = +t[i++], ey = +t[i++]
      seen(cubicMin(x, c1x, c2x, ex), cubicMin(y, c1y, c2y, ey)); x = ex; y = ey
    } else if (c === 'Q') {
      const qx = +t[i++], qy = +t[i++], ex = +t[i++], ey = +t[i++]
      seen(quadMin(x, qx, ex), quadMin(y, qy, ey)); x = ex; y = ey
    }
  }
  return { minX: minX === Infinity ? 0 : minX, minY: minY === Infinity ? 0 : minY }
}

function vec(d, o) {
  o = o || {}
  const v = figma.createVector()
  const nd = normPath(d)
  v.vectorPaths = [{ windingRule: o.fillRule || 'NONE', data: nd }]
  // Figma re-origins the node to the path bounds — restore intended placement.
  const bb = pathBBox(nd)
  v.x = bb.minX
  v.y = bb.minY
  v.fills = o.fill ? [solid(o.fill, o.fillOpacity)] : []
  if (o.stroke) {
    v.strokes = [solid(o.stroke, o.strokeOpacity)]
    v.strokeWeight = o.sw || 1
    v.strokeCap = o.cap || 'ROUND'
    v.strokeJoin = 'ROUND'
    if (o.dash) v.dashPattern = o.dash
  } else v.strokes = []
  if (o.name) v.name = o.name
  return v
}
/** Absolute-positioned layer inside an auto-layout frame (overlays, gradients). */
const absolute = (parent, node, x, y) => {
  parent.appendChild(node)
  node.layoutPositioning = 'ABSOLUTE'
  node.x = x; node.y = y
  return node
}
/** Vertical linear gradient. stops: [[offset, hex, alpha], ...] */
const vgrad = (stops) => ({
  type: 'GRADIENT_LINEAR',
  gradientTransform: [[0, 1, 0], [1, 0, 0]],
  gradientStops: stops.map(([position, h, a]) => ({ position, color: { ...hex(h), a: a === undefined ? 1 : a } })),
})

/* ── lucide icons (ICONS injected by the entry snippet) ──────────────────── */
function icon(name, size, colr, weight) {
  const nodes = (typeof ICONS !== 'undefined' && ICONS[name]) || null
  const f = figma.createFrame()
  f.name = name || 'icon'
  f.resize(24, 24)
  f.fills = []
  f.clipsContent = false
  if (!nodes) { RESCALE(f, size / 24); return f }
  for (const [tag, a] of nodes) {
    let n = null
    if (tag === 'circle') {
      n = figma.createEllipse()
      n.resize(+a.r * 2, +a.r * 2)
      f.appendChild(n)
      n.x = +a.cx - +a.r; n.y = +a.cy - +a.r
      n.fills = []
    } else if (tag === 'rect') {
      n = figma.createRectangle()
      n.resize(+a.width, +a.height)
      f.appendChild(n)
      n.x = +(a.x || 0); n.y = +(a.y || 0)
      if (a.rx) n.cornerRadius = +a.rx
      n.fills = []
    } else {
      let d = a.d
      if (tag === 'line') d = `M ${a.x1} ${a.y1} L ${a.x2} ${a.y2}`
      if (tag === 'polyline' || tag === 'polygon') {
        const pts = String(a.points).trim().split(/[\s,]+/)
        d = `M ${pts[0]} ${pts[1]}`
        for (let i = 2; i < pts.length; i += 2) d += ` L ${pts[i]} ${pts[i + 1]}`
        if (tag === 'polygon') d += ' Z'
      }
      n = vec(d, {})
      f.appendChild(n)
    }
    n.strokes = [solid(colr)]
    n.strokeWeight = weight || 1.75
    n.strokeCap = 'ROUND'
    n.strokeJoin = 'ROUND'
  }
  RESCALE(f, size / 24)
  return f
}
/** Tinted rounded chip holding a module glyph — home stat tiles + calendar rows. */
function iconChip(name, accent, boxSize, radius, glyph, over) {
  const box = AL('h', { bg: mixOver(accent, 0.1, over || C.cardHome), radius: radius, align: 'CENTER', justify: 'CENTER' })
  box.resize(boxSize, boxSize)
  box.primaryAxisSizingMode = 'FIXED'; box.counterAxisSizingMode = 'FIXED'
  box.appendChild(icon(name, glyph, accent, 1.75))
  return box
}

/* ── path math (ports src/detail/charts.tsx) ─────────────────────────────── */
function niceTicks(min, max) {
  const span = max - min || Math.abs(max) || 1
  const raw = span / 2
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const out = []
  for (let v = lo; v <= hi + step / 1000; v += step) out.push(Number(v.toPrecision(12)))
  return out
}
function smoothPath(pts, tension) {
  tension = tension === undefined ? 0.2 : tension
  if (pts.length < 2) return ''
  const clamp = (v, a, b) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), v))
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const p3 = pts[i + 2] || pts[i + 1]
    const c1y = clamp(y1 + (y2 - p0[1]) * tension, y1, y2)
    const c2y = clamp(y2 - (p3[1] - y1) * tension, y1, y2)
    d += ` C ${x1 + (x2 - p0[0]) * tension} ${c1y}, ${x2 - (p3[0] - x1) * tension} ${c2y}, ${x2} ${y2}`
  }
  return d
}
const topRounded = (x, yTop, w, h, r) => {
  const rr = Math.max(0, Math.min(r === undefined ? 4 : r, w / 2, h))
  return `M${x},${yTop + h} L${x},${yTop + rr} Q${x},${yTop} ${x + rr},${yTop} L${x + w - rr},${yTop} Q${x + w},${yTop} ${x + w},${yTop + rr} L${x + w},${yTop + h} Z`
}
const tickLabel = (v, step) => {
  if (Math.abs(step) >= 1000) return compact(v)
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`
  return compact(v)
}

/* ── chart primitives ────────────────────────────────────────────────────── */

/** Large smooth area trend + gridlines, y-axis gutter, x labels. AreaTrend(). */
function areaTrend(values, xLabels, accent, unit, xSuffix, w) {
  const W = w || CONTENT_W
  const H = 148, PAD_Y = 12
  const wrap = AL('v', { gap: 0, name: 'AreaTrend' })

  const shown = values.length - 1
  const head = AL('h', { gap: 8, align: 'BASELINE' })
  head.appendChild(T(fmt(values[shown]), { s: 26, display: true, lh: 32, c: C.value }))
  if (unit) head.appendChild(T(unit, { s: 12, c: C.faint }))
  const gapNode = figma.createFrame(); gapNode.fills = []; gapNode.resize(1, 1)
  head.appendChild(gapNode); gapNode.layoutGrow = 1
  head.appendChild(T(`${xLabels[shown]}${xSuffix ? ` ${xSuffix}` : ''}`, { s: 12, c: C.muted }))
  fill(wrap, head)
  spacer(wrap, 8)

  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const lo = ticks[0], hi = ticks[ticks.length - 1]
  const labels = ticks.map((t) => tickLabel(t, ticks[1] - ticks[0]))
  const gutter = Math.max(30, Math.max(...labels.map((l) => l.length)) * 5.6 + 6)
  const plotW = W - gutter
  const step = plotW / Math.max(values.length - 1, 1)
  const y = (v) => PAD_Y + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD_Y * 2)
  const pts = values.map((v, i) => [i * step, y(v)])

  const plot = figma.createFrame()
  plot.name = 'plot'; plot.resize(W, H); plot.fills = []; plot.clipsContent = false
  ticks.forEach((t, ti) => {
    const g = rect(plotW, 1, C.grid)
    plot.appendChild(g); g.x = 0; g.y = y(t)
    const lab = T(labels[ti], { s: 9, c: C.faint, align: 'RIGHT' })
    plot.appendChild(lab)
    lab.textAutoResize = 'NONE'; lab.resize(gutter - 4, 12)
    lab.x = W - (gutter - 4); lab.y = y(t) - 6
  })
  const line = smoothPath(pts)
  const area = vec(`${line} L ${plotW} ${H} L 0 ${H} Z`, { fillRule: 'NONZERO', name: 'area' })
  area.fills = [{ ...vgrad([[0, accent, 0.16], [1, accent, 0]]) }]
  plot.appendChild(area)
  const stroke = vec(line, { stroke: accent, sw: 2, name: 'line' })
  plot.appendChild(stroke)
  const dot = figma.createEllipse()
  dot.resize(9, 9); dot.fills = [solid(accent)]
  dot.strokes = [solid('#ffffff')]; dot.strokeWeight = 2
  plot.appendChild(dot); dot.x = pts[shown][0] - 4.5; dot.y = pts[shown][1] - 4.5
  wrap.appendChild(plot)
  plot.layoutSizingHorizontal = 'FIXED'

  spacer(wrap, 4)
  const xs = AL('h', { justify: 'SPACE_BETWEEN' })
  xs.paddingRight = gutter
  const dense = xLabels.length > 12
  xLabels.forEach((l, i) => {
    const txt = dense && i % 2 === 1 ? '·' : l
    xs.appendChild(T(txt, i === shown ? { s: 9, w: 600, c: C.ink } : { s: 9, c: C.faint }))
  })
  fill(wrap, xs)
  return wrap
}

/** Column chart with a highlighted period. Columns(). */
function columnsChart(values, xLabels, accent, highlight, w) {
  const W = w || CONTENT_W, h = 96
  const max = Math.max(...values)
  const band = W / values.length
  const bw = Math.min(24, band - 6)
  const hi = highlight === undefined ? values.indexOf(max) : highlight
  const barH = (v) => Math.max(3, (v / (max || 1)) * (h - 18))

  const wrap = AL('v', { gap: 0, name: 'Columns' })
  const plot = figma.createFrame()
  plot.name = 'plot'; plot.resize(W, h); plot.fills = []; plot.clipsContent = false
  const base = rect(W, 1, C.grid); plot.appendChild(base); base.x = 0; base.y = h - 1
  values.forEach((v, i) => {
    const bh = barH(v)
    const x = i * band + (band - bw) / 2
    const bar = vec(topRounded(x, h - bh, bw, bh, 4), {
      fillRule: 'NONZERO',
      fill: i === hi ? accent : mixOver(accent, 0.28, C.white),
      name: `bar ${i}`,
    })
    plot.appendChild(bar)
    if (i === hi) {
      const lab = T(compact(v), { s: 10, w: 600, c: C.ink, align: 'CENTER' })
      plot.appendChild(lab)
      lab.textAutoResize = 'NONE'; lab.resize(band, 13)
      lab.x = i * band; lab.y = h - bh - 6 - 13
    }
  })
  wrap.appendChild(plot); plot.layoutSizingHorizontal = 'FIXED'
  spacer(wrap, 6)
  const xs = AL('h', { gap: 0 })
  xLabels.forEach((l, i) => {
    const t = T(l, i === hi ? { s: 9, w: 600, c: C.ink, align: 'CENTER' } : { s: 9, c: C.faint, align: 'CENTER' })
    xs.appendChild(t); t.textAutoResize = 'HEIGHT'; t.layoutGrow = 1
  })
  fill(wrap, xs)
  return wrap
}

/** Horizontal bar rows with a value at the tip. BarRows(). */
function barRows(items, accent, unit) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const list = AL('v', { gap: 14, name: 'BarRows' })
  items.forEach((item) => {
    const row = AL('v', { gap: 6 })
    const head = AL('h', { gap: 12, align: 'BASELINE' })
    const label = T(item.label, { s: 13, c: C.ink2 })
    head.appendChild(label); label.layoutGrow = 1; label.textTruncation = 'ENDING'
    if (item.sub) head.appendChild(T(item.sub, { s: 11, c: C.faint }))
    const val = AL('h', { gap: 2, align: 'BASELINE' })
    val.appendChild(T(fmt(item.value), { s: 13, w: 600, c: C.ink }))
    if (unit) val.appendChild(T(unit, { s: 10, c: C.faint }))
    head.appendChild(val)
    fill(row, head)
    const track = AL('h', { bg: C.track, radius: 999, clip: true })
    track.appendChild(rect(Math.max(2, (item.value / max) * 100) / 100 * CONTENT_W, 6, accent, 999))
    fill(row, track)
    track.layoutSizingVertical = 'HUG'
    fill(list, row)
  })
  return list
}

/** Stacked share bar + direct-labelled legend. ShareBar(). */
function shareBar(items, accent, unit) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  const color = (i) => mixOver(accent, SHARE_STEPS[i] === undefined ? 0.1 : SHARE_STEPS[i], C.white)
  const wrap = AL('v', { gap: 0, name: 'ShareBar' })

  const bar = AL('h', { gap: 2 })
  items.forEach((item, i) => {
    // Proportion lives in the fixed width — layoutGrow only accepts 0 | 1.
    const seg = rect((item.value / total) * (CONTENT_W - (items.length - 1) * 2), 10, color(i))
    if (i === 0) SET(seg, { topLeftRadius: 999, bottomLeftRadius: 999 })
    if (i === items.length - 1) SET(seg, { topRightRadius: 999, bottomRightRadius: 999 })
    bar.appendChild(seg)
  })
  fill(wrap, bar); bar.layoutSizingVertical = 'HUG'
  spacer(wrap, 16)

  const legend = AL('v', { gap: 10 })
  items.forEach((item, i) => {
    const row = AL('h', { gap: 10, align: 'BASELINE' })
    const dot = figma.createEllipse(); dot.resize(8, 8); dot.fills = [solid(color(i))]
    row.appendChild(dot)
    const label = T(item.label, { s: 13, c: C.ink2 })
    row.appendChild(label); label.layoutGrow = 1; label.textTruncation = 'ENDING'
    row.appendChild(T(`${((item.value / total) * 100).toFixed(1)}%`, { s: 11, c: C.faint }))
    const val = T(`${fmt(item.value)}${unit ? ` ${unit}` : ''}`, { s: 13, w: 600, c: C.ink, align: 'RIGHT' })
    row.appendChild(val); val.textAutoResize = 'HEIGHT'; val.resize(68, val.height)
    fill(legend, row)
  })
  fill(wrap, legend)
  return wrap
}

/** Card-width sparkline. MiniArea(). */
function miniArea(values, accent, w) {
  const W = w || 132, H = 44
  const min = Math.min(...values), max = Math.max(...values)
  const step = W / Math.max(values.length - 1, 1)
  const pts = values.map((v, i) => [i * step, 4 + (1 - (v - min) / (max - min || 1)) * (H - 12)])
  const line = smoothPath(pts)
  const f = figma.createFrame()
  f.name = 'MiniArea'; f.resize(W, H); f.fills = []; f.clipsContent = false
  const area = vec(`${line} L ${W} ${H} L 0 ${H} Z`, { fillRule: 'NONZERO' })
  area.fills = [{ ...vgrad([[0, accent, 0.18], [1, accent, 0]]) }]
  f.appendChild(area)
  const s = vec(line, { stroke: accent, sw: 2 })
  f.appendChild(s)
  return f
}

/** Thin progress meter. Meter(). */
function meter(percent, accent, w) {
  const W = w || CONTENT_W
  const track = AL('h', { bg: mixOver(accent, 0.14, C.white), radius: 999, clip: true, name: 'Meter' })
  track.appendChild(rect(Math.max(2, Math.min(percent, 100)) / 100 * W, 6, accent, 999))
  return track
}

/** Dashed 270° arc gauge with a centered chip. ArcGauge(). */
function arcGauge(fraction, label, accent) {
  const size = 84, d = 68, inset = (size - d) / 2
  const f = figma.createFrame()
  f.name = 'ArcGauge'; f.resize(size, size); f.fills = []; f.clipsContent = false
  const START = (135 * Math.PI) / 180
  const mk = (sweepDeg, dash, opacity) => {
    const e = figma.createEllipse()
    e.resize(d, d)
    e.fills = []
    e.strokes = [solid(accent, opacity)]
    e.strokeWeight = 5
    e.strokeCap = 'ROUND'
    e.dashPattern = dash
    e.arcData = { startingAngle: START, endingAngle: START + (sweepDeg * Math.PI) / 180, innerRadius: 0 }
    f.appendChild(e); e.x = inset; e.y = inset
    return e
  }
  mk(270, [1, 9], 0.18)
  mk(270 * Math.min(fraction, 1), [7, 6], 1)
  const chip = AL('h', { bg: C.gaugeChip, radius: 16, align: 'CENTER', justify: 'CENTER' })
  chip.resize(40, 40)
  chip.primaryAxisSizingMode = 'FIXED'; chip.counterAxisSizingMode = 'FIXED'
  chip.appendChild(T(label, { s: 13, w: 600, c: accent }))
  f.appendChild(chip); chip.x = (size - 40) / 2; chip.y = (size - 40) / 2
  return f
}

/** iOS-style segmented control. Chips(). Active segment = raised white pill. */
function chips(labels, accent, active, o) {
  o = o || {}
  const track = AL('h', { gap: 0, pad: 3, radius: 999, bg: mixOver(accent, 0.07, C.chipTrack), name: 'Chips' })
  labels.forEach((label, i) => {
    const on = i === active
    const seg = AL('h', {
      radius: 999, align: 'CENTER', justify: 'CENTER',
      pad: o.fill ? [7, 8] : o.small ? [4, 12] : [6, 14],
      bg: on ? C.white : undefined,
      shadow: on ? { a: 0.14, y: 1, r: 2 } : undefined,
    })
    seg.name = label
    seg.appendChild(T(label, {
      s: o.fill ? 13 : o.small ? 11 : 12,
      w: on ? 600 : 500,
      c: on ? C.ink : '#5f5a52',
    }))
    track.appendChild(seg)
    if (o.fill) seg.layoutGrow = 1
  })
  return track
}

/* ── detail-page cards ───────────────────────────────────────────────────── */
const CARD_SHADOW = { a: 0.05, y: 1, r: 3 }
function detailCard(o) {
  o = o || {}
  return AL('v', { gap: 0, pad: o.pad === undefined ? CARD_PAD : o.pad, radius: 16, bg: C.white, shadow: CARD_SHADOW, name: o.name || 'Card' })
}
function cardHead(parent, title, meta, headNode) {
  const row = AL('h', { gap: 12, align: 'BASELINE' })
  const t = T(title, { s: 15, w: 500, c: C.ink })
  row.appendChild(t); t.layoutGrow = 1
  if (headNode) row.appendChild(headNode)
  else if (meta) row.appendChild(T(meta, { s: 12, c: C.faint }))
  fill(parent, row)
  return row
}

/* ── section renderers — one per `kind` in src/detail/model.ts ───────────── */
const SECTION = {
  trend(s, accent) {
    const card = detailCard({ name: `Trend — ${s.title}` })
    cardHead(card, s.title, null, s.ranges ? chips(s.ranges.map((r) => r.label), accent, 0, { small: true }) : null)
    spacer(card, 16)
    fill(card, areaTrend(s.values, s.xLabels, accent, s.unit, s.xSuffix))
    if (s.note) {
      spacer(card, 16)
      const n = T(s.note, { s: 12, lh: 18, c: C.muted, wrap: true })
      fill(card, n)
    }
    return card
  },

  summary(s, accent) {
    const three = s.items.length === 3
    const grid = AL('h', { gap: three ? 10 : 12, name: 'Summary' })
    const cols = three ? 3 : 2
    let row = null
    s.items.forEach((item, i) => {
      if (i % cols === 0) {
        row = AL('h', { gap: three ? 10 : 12 })
        if (i === 0) { grid.layoutMode = 'VERTICAL'; grid.itemSpacing = three ? 10 : 12 }
        fill(grid, row)
      }
      const tile = AL('v', { gap: 0, pad: 16, radius: 16, bg: C.white, shadow: CARD_SHADOW, name: item.label })
      const lab = T(item.label, { s: three ? 13 : 15, w: 500, c: C.ink, lh: three ? 16 : 18, wrap: true })
      fill(tile, lab)
      spacer(tile, 8)
      fill(tile, T(item.value, { s: three ? 26 : 30, display: true, lh: three ? 32 : 36, c: C.value }))
      if (item.note) {
        spacer(tile, 6)
        const nr = AL('h', { gap: 6, align: 'CENTER' })
        if (item.tone) {
          const d = figma.createEllipse(); d.resize(6, 6); d.fills = [solid(toneColor(item.tone))]
          nr.appendChild(d)
        }
        const nt = T(item.note, { s: 11, c: signColor(item.note) || C.muted })
        nr.appendChild(nt); nt.layoutGrow = 1; nt.textTruncation = 'ENDING'
        fill(tile, nr)
      }
      row.appendChild(tile); tile.layoutGrow = 1
    })
    return grid
  },

  share(s, accent) {
    const card = detailCard({ name: `Share — ${s.title}` })
    cardHead(card, s.title, s.note)
    spacer(card, 16)
    fill(card, shareBar(s.items, accent, s.unit))
    return card
  },

  breakdown(s, accent) {
    const card = detailCard({ name: `Breakdown — ${s.title}` })
    cardHead(card, s.title, s.note)
    spacer(card, 16)
    fill(card, barRows(s.items, accent, s.unit))
    return card
  },

  tabs(s, accent) {
    const card = detailCard({ name: `Tabs — ${s.title}` })
    cardHead(card, s.title)
    spacer(card, 16)
    const wrap = AL('v', { gap: 0 })
    wrap.appendChild(chips(s.tabs.map((t) => t.label), accent, 0))
    spacer(wrap, 16)
    fill(wrap, barRows(s.tabs[0].items, accent, s.unit))
    fill(card, wrap)
    return card
  },

  compare(s, accent) {
    const row = AL('h', { gap: 12, name: `Compare — ${s.title}` })
    s.cards.forEach((c) => {
      const tile = AL('v', { gap: 0, pad: 16, radius: 16, bg: C.white, shadow: CARD_SHADOW, name: c.label })
      const lab = T(c.label, { s: 15, w: 500, c: C.ink })
      fill(tile, lab); lab.textTruncation = 'ENDING'
      spacer(tile, 8)
      fill(tile, T(c.value, { s: 30, display: true, lh: 36, c: C.value }))
      spacer(tile, 4)
      fill(tile, T(c.delta, { s: 11, w: 500, c: signColor(c.delta) || toneColor(c.tone) }))
      spacer(tile, 12)
      const ma = miniArea(c.values, accent, (CARD_W - 12) / 2 - 32)
      tile.appendChild(ma); ma.layoutSizingHorizontal = 'FILL'
      row.appendChild(tile); tile.layoutGrow = 1
    })
    return row
  },

  columns(s, accent) {
    const card = detailCard({ name: `Columns — ${s.title}` })
    cardHead(card, s.title, s.note)
    spacer(card, 16)
    fill(card, columnsChart(s.values, s.xLabels, accent, s.highlight))
    return card
  },

  gauges(s, accent) {
    const card = detailCard({ name: `Gauges — ${s.title}` })
    cardHead(card, s.title)
    spacer(card, 16)
    const row = AL('h', { gap: 12, justify: 'SPACE_BETWEEN', align: 'MIN' })
    s.items.forEach((g) => {
      const col = AL('v', { gap: 8, align: 'CENTER' })
      col.appendChild(arcGauge(g.percent / 100, `${Math.round(g.percent)}%`, accent))
      col.appendChild(T(g.label, { s: 13, w: 500, c: C.ink, align: 'CENTER' }))
      if (g.note) {
        const n = T(g.note, { s: 11, lh: 16, c: C.faint, align: 'CENTER', wrap: true })
        col.appendChild(n); n.resize(Math.min(130, CONTENT_W / s.items.length - 8), n.height)
      }
      row.appendChild(col)
      col.layoutGrow = 1
    })
    fill(card, row)
    return card
  },

  ranked(s, accent) {
    const wrap = AL('v', { gap: 0, name: `Ranked — ${s.title}` })
    const h = T(s.title, { s: 15, w: 500, c: C.ink })
    const hr = AL('h', { pad: [0, 4] }); hr.appendChild(h)
    fill(wrap, hr)
    spacer(wrap, 12)
    // Off-card rail: -mx-3.5 bleeds to the sheet edge and scrolls horizontally.
    const rail = AL('h', { gap: 12, name: 'rail' })
    s.items.forEach((item, i) => {
      const tile = AL('v', { gap: 0, pad: 16, radius: 16, bg: C.white, shadow: CARD_SHADOW, name: item.label })
      tile.resize(168, 10)
      tile.counterAxisSizingMode = 'FIXED'
      fill(tile, T(String(i + 1).padStart(2, '0'), { s: 11, w: 500, c: C.faint }))
      spacer(tile, 8)
      const l = T(item.label, { s: 14, w: 500, c: C.ink }); fill(tile, l); l.textTruncation = 'ENDING'
      const sub = T(item.sub, { s: 11, c: C.faint }); fill(tile, sub); sub.textTruncation = 'ENDING'
      spacer(tile, 12)
      fill(tile, T(item.value, { s: 26, display: true, lh: 32, c: C.value }))
      spacer(tile, 10)
      const m = meter(item.percent, accent, 136)
      fill(tile, m); m.layoutSizingVertical = 'HUG'
      rail.appendChild(tile)
    })
    fill(wrap, rail)
    return wrap
  },

  stat(s, accent) {
    const card = detailCard({ name: `Stat — ${s.title}` })
    const row = AL('h', { gap: 12, align: 'BASELINE' })
    const t = T(s.title, { s: 15, w: 500, c: C.ink })
    row.appendChild(t); t.layoutGrow = 1
    const v = AL('h', { gap: 4, align: 'BASELINE' })
    v.appendChild(T(s.value, { s: 30, display: true, lh: 36, c: C.value }))
    if (s.unit) v.appendChild(T(s.unit, { s: 13, c: C.faint }))
    row.appendChild(v)
    fill(card, row)
    if (s.percent !== undefined) {
      spacer(card, 16)
      const m = meter(s.percent, accent)
      fill(card, m); m.layoutSizingVertical = 'HUG'
    }
    if (s.note) {
      spacer(card, 12)
      const nr = AL('h', { gap: 6, align: 'MIN' })
      if (s.tone) {
        const d = figma.createEllipse(); d.resize(6, 6); d.fills = [solid(toneColor(s.tone))]
        nr.appendChild(d); d.y = 6
      }
      const nt = T(s.note, { s: 12, lh: 18, c: C.muted, wrap: true })
      nr.appendChild(nt); nt.layoutGrow = 1
      fill(card, nr)
    }
    return card
  },

  rows(s) {
    const card = detailCard({ name: `Rows — ${s.title}` })
    cardHead(card, s.title, s.meta)
    spacer(card, 8)
    // The list bleeds the card's 20px padding (-mx-5) so dividers span edge to edge.
    const list = AL('v', { gap: 0, name: 'list' })
    list.paddingLeft = 0; list.paddingRight = 0
    s.items.forEach((item, i) => {
      if (i === 0) { const top = rect(CARD_W, 1, C.divider); list.appendChild(top); top.layoutSizingHorizontal = 'FILL' }
      const row = AL('h', { gap: 12, pad: [12, CARD_PAD], align: 'CENTER' })
      const left = AL('v', { gap: 2 })
      const lr = AL('h', { gap: 6, align: 'CENTER' })
      if (item.tone) {
        const d = figma.createEllipse(); d.resize(6, 6); d.fills = [solid(toneColor(item.tone))]
        lr.appendChild(d)
      }
      const lab = T(item.label, { s: 14, c: C.ink })
      lr.appendChild(lab); lab.layoutGrow = 1; lab.textTruncation = 'ENDING'
      fill(left, lr)
      const sub = T(item.sub, { s: 11, c: C.faint }); fill(left, sub); sub.textTruncation = 'ENDING'
      row.appendChild(left); left.layoutGrow = 1
      row.appendChild(T(item.value, { s: 12, w: 500, c: C.muted }))
      row.appendChild(icon('ChevronRight', 15, C.faint, 2))
      fill(list, row)
      const div = rect(CARD_W, 1, C.divider); list.appendChild(div); div.layoutSizingHorizontal = 'FILL'
    })
    fill(card, list)
    card.paddingLeft = 0; card.paddingRight = 0
    // Re-inset only the head, since the list needs the full width.
    const head = card.children[0]
    if (head && head.type === 'FRAME') { head.paddingLeft = CARD_PAD; head.paddingRight = CARD_PAD }
    return card
  },

  timeline(s, accent) {
    const card = detailCard({ name: `Timeline — ${s.title}` })
    cardHead(card, s.title)
    spacer(card, 16)
    const list = AL('v', { gap: 0 })
    s.items.forEach((item, i) => {
      const row = AL('h', { gap: 12, align: 'MIN' })
      const time = T(item.time, { s: 11, c: C.faint, align: 'RIGHT' })
      row.appendChild(time); time.textAutoResize = 'HEIGHT'; time.resize(54, time.height); time.y = 2
      // Rail: dot carries status, hairline continues to the next entry.
      const rail = figma.createFrame()
      rail.name = 'rail'; rail.fills = []; rail.resize(12, 10); rail.clipsContent = false
      row.appendChild(rail)
      const dot = figma.createEllipse(); dot.resize(7, 7)
      dot.fills = [solid(item.tone === 'bad' || item.tone === 'warn' ? toneColor(item.tone) : accent)]
      rail.appendChild(dot); dot.x = 2.5; dot.y = 6
      const body = AL('v', { gap: 0 })
      const tagRow = AL('h', {})
      const tag = AL('h', { pad: [3, 8], radius: 999, bg: C.chip })
      tag.appendChild(T(item.tag, { s: 10, w: 500, c: C.muted }))
      tagRow.appendChild(tag)
      fill(body, tagRow)
      spacer(body, 6)
      const txt = T(item.text, { s: 13, lh: 19, c: C.ink2, wrap: true })
      fill(body, txt)
      if (i < s.items.length - 1) spacer(body, 20)
      row.appendChild(body); body.layoutGrow = 1
      fill(list, row)
      rail.layoutSizingVertical = 'FILL'
      if (i < s.items.length - 1) {
        const lineH = Math.max(1, body.height - 16)
        const ln = rect(1, lineH, C.grid)
        rail.appendChild(ln); ln.x = 5.5; ln.y = 16
      }
    })
    fill(card, list)
    return card
  },

  calendar(s, accent) {
    const card = detailCard({ name: `Calendar — ${s.title}` })
    cardHead(card, s.title)
    spacer(card, 16)
    const list = AL('v', { gap: 16 })
    s.items.forEach((item) => {
      const row = AL('h', { gap: 14, align: 'CENTER' })
      const chip = AL('v', { radius: 12, align: 'CENTER', justify: 'CENTER', bg: mixOver(accent, 0.11, C.white) })
      chip.resize(44, 44)
      chip.primaryAxisSizingMode = 'FIXED'; chip.counterAxisSizingMode = 'FIXED'
      chip.appendChild(T(item.date, { s: 17, display: true, lh: 17, c: C.ink }))
      chip.appendChild(T(item.month, { s: 9, w: 500, ls: 6, c: C.muted }))
      chip.itemSpacing = 2
      row.appendChild(chip)
      const body = AL('v', { gap: 2 })
      const l = T(item.label, { s: 14, w: 500, c: C.ink }); fill(body, l); l.textTruncation = 'ENDING'
      const sb = T(item.sub, { s: 11, c: C.faint }); fill(body, sb); sb.textTruncation = 'ENDING'
      row.appendChild(body); body.layoutGrow = 1
      fill(list, row)
    })
    fill(card, list)
    return card
  },
}

/* ── chapter grouping (ports CHAPTER_OF / chaptersOf) ────────────────────── */
const CHAPTERS = ['Overview', 'Breakdown', 'Activity']
const CHAPTER_OF = {
  trend: 0, summary: 0,
  share: 1, breakdown: 1, tabs: 1, columns: 1, gauges: 1, ranked: 1, compare: 1, stat: 1,
  rows: 2, timeline: 2, calendar: 2,
}
function chaptersOf(sections) {
  const blocks = []
  let at = -1
  sections.forEach((section, index) => {
    const next = Math.max(at, CHAPTER_OF[section.kind])
    if (next !== at) { at = next; blocks.push({ name: CHAPTERS[at], items: [] }) }
    blocks[blocks.length - 1].items.push({ section, index })
  })
  return blocks
}
const CHART_KINDS = new Set(['trend', 'share', 'breakdown', 'tabs', 'compare', 'columns', 'gauges', 'ranked', 'stat'])
function sectionAccents(sections, pageAccent) {
  const pool = CHART_HUES.filter((h) => h.toLowerCase() !== pageAccent.toLowerCase())
  let chart = 0
  return sections.map((section) => {
    if (section.accent) return section.accent
    if (!CHART_KINDS.has(section.kind)) return pageAccent
    const hue = chart === 0 ? pageAccent : pool[(chart - 1) % pool.length]
    chart += 1
    return hue
  })
}
function chapterHead(parent, name) {
  const wrap = AL('h', { pad: [0, 4, 4, 4] })
  wrap.appendChild(T(name, { s: 11, w: 600, ls: 10, upper: true, c: C.chapter }))
  fill(parent, wrap)
  return wrap
}

/* ── detail page assembler (ports DetailPage.tsx) ────────────────────────── */
function buildDetailPage(page, others, x, y) {
  const accents = sectionAccents(page.sections, page.accent)
  const chapters = chaptersOf(page.sections)

  const frame = figma.createFrame()
  frame.name = `Detail — ${page.title}`
  frame.resize(PHONE_W, 900)
  frame.fills = [solid(C.ground)]
  frame.x = x; frame.y = y
  frame.clipsContent = true
  // Home screen behind the sheet, dimmed by the sheet's scrim.
  const scrim = rect(PHONE_W, 900, C.scrim, 0, 0.22)
  frame.appendChild(scrim); scrim.x = 0; scrim.y = 0; scrim.name = 'scrim'

  const sheet = AL('v', { gap: 0, bg: C.white, name: 'Sheet' })
  SET(sheet, { topLeftRadius: 20, topRightRadius: 20 })
  sheet.resize(SHEET_W, 800)
  sheet.counterAxisSizingMode = 'FIXED'
  frame.appendChild(sheet)
  sheet.x = SHEET_INSET; sheet.y = 44

  /* grabber */
  const grab = AL('h', { pad: [10, 0, 0, 0], justify: 'CENTER' })
  grab.appendChild(rect(36, 5, C.ink, 999, 0.12))
  fill(sheet, grab)

  /* close bar */
  const header = AL('h', { gap: 16, pad: [4, CARD_PAD, 16, CARD_PAD], align: 'CENTER', name: 'Header' })
  const hl = AL('v', { gap: 3 })
  fill(hl, T('Command Centre', { s: 11, w: 500, lh: 16, ls: 2, c: C.muted }))
  const h1 = T(page.title, { s: 19, w: 600, lh: 24, ls: -1.5, c: C.ink })
  fill(hl, h1); h1.textTruncation = 'ENDING'
  header.appendChild(hl); hl.layoutGrow = 1
  const close = AL('h', { radius: 999, bg: C.chip, align: 'CENTER', justify: 'CENTER', name: 'Close' })
  close.resize(40, 40)
  close.primaryAxisSizingMode = 'FIXED'; close.counterAxisSizingMode = 'FIXED'
  close.appendChild(icon('X', 17, C.ink2, 2))
  header.appendChild(close)
  fill(sheet, header)

  /* chapter chips */
  if (chapters.length > 1) {
    const nav = AL('h', { pad: [0, CARD_PAD, 12, CARD_PAD], name: 'Chapter nav' })
    const ch = chips(chapters.map((c) => c.name), page.accent, 0, { fill: true })
    nav.appendChild(ch); ch.layoutGrow = 1
    fill(sheet, nav)
  }

  /* scroll body */
  const body = AL('v', { gap: 0, name: 'Scroll body' })
  fill(sheet, body)

  /* hero */
  const hero = AL('v', { gap: 0, pad: [24, CARD_PAD, 0, CARD_PAD], align: 'CENTER', name: 'Hero' })
  const heroVal = T(page.hero.display || fmt(page.hero.value), { s: 58, display: true, lh: 58, ls: -2, c: C.value, align: 'CENTER' })
  fill(hero, heroVal)
  spacer(hero, 8)
  fill(hero, T(page.hero.label, { s: 16, c: C.muted, align: 'CENTER' }))
  spacer(hero, 4)
  fill(hero, T(page.hero.sub, { s: 12, c: C.faint, align: 'CENTER' }))
  if (page.hero.status) {
    spacer(hero, 12)
    const badgeRow = AL('h', { justify: 'CENTER' })
    const badge = AL('h', { pad: [5, 12], radius: 999, bg: mixOver(toneColor(page.hero.tone), 0.1, C.white) })
    badge.appendChild(T(page.hero.status, { s: 12, w: 500, c: toneColor(page.hero.tone) }))
    badgeRow.appendChild(badge)
    fill(hero, badgeRow)
  }
  fill(body, hero)
  spacer(body, 28)

  /* main — the sheet's warm gradient ground */
  const main = AL('v', { gap: 0, pad: [20, MAIN_PAD, 40, MAIN_PAD], name: 'Main' })
  SET(main, { topLeftRadius: 20, topRightRadius: 20 })
  fill(body, main)
  main.fills = [{ ...vgrad([[0, '#cde4d8'], [0.3, '#b4d3c4'], [0.52, '#a0c8b5'], [0.76, '#bfd9cb'], [1, '#dbe9e0']]) }]

  chapters.forEach((chapter, ci) => {
    if (ci) spacer(main, 28)
    const block = AL('v', { gap: 10, name: chapter.name })
    fill(main, block)
    chapterHead(block, chapter.name)
    chapter.items.forEach(({ section, index }) => {
      const render = SECTION[section.kind]
      if (!render) return
      const node = render(section, accents[index])
      fill(block, node)
    })
  })

  /* More Modules rail */
  spacer(main, 36)
  const more = AL('v', { gap: 0, name: 'More Modules' })
  fill(main, more)
  chapterHead(more, 'More Modules')
  spacer(more, 12)
  const rail = AL('h', { gap: 10 })
  others.forEach((o) => {
    const pill = AL('h', { pad: [10, 16], radius: 16, bg: C.white, shadow: CARD_SHADOW })
    pill.appendChild(T(o.title, { s: 12, w: 500, c: C.ink2 }))
    rail.appendChild(pill)
  })
  fill(more, rail)

  /* footer */
  spacer(main, 24)
  const footer = AL('h', { justify: 'CENTER' })
  footer.appendChild(T('← ANTZ Command Centre', { s: 12, c: C.faint }))
  fill(main, footer)

  /* size the frame to the built sheet */
  sheet.layoutSizingVertical = 'HUG'
  const total = 44 + sheet.height
  scrim.resize(PHONE_W, total)
  frame.resize(PHONE_W, PHONE_H)
  frame.clipsContent = true
  return { frame: frame, contentHeight: total }
}
