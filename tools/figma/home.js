/* ============================================================================
 * ANTZ Command Centre → Figma HOME builder
 * Append after figma-prelude.js. Ports src/v3/CommandCentreV3.tsx + src/v3/viz.tsx.
 * ==========================================================================*/

/* ── home micro-viz (src/v3/viz.tsx) ─────────────────────────────────────── */
const DOT_COLUMNS = [4, 2, 5, 3, 6, 3, 4, 2, 5, 3, 4, 6]
const AREA_VALUES = [30, 28, 28.5, 26, 24, 24.5, 22, 20, 20.5, 18, 16, 15]
const COLUMN_VALUES = [0.45, 0.7, 0.55, 0.8, 0.6, 0.9, 0.7, 1]

/** Columns of small rounded dashes — activity-tracker style. DotBars(). */
function dotBars(accent) {
  const row = AL('h', { gap: 5, align: 'MAX', name: 'DotBars' })
  row.resize(10, 52)
  row.primaryAxisSizingMode = 'AUTO'   // hug the 12 columns; only height is fixed
  row.counterAxisSizingMode = 'FIXED'
  DOT_COLUMNS.forEach((count, i) => {
    const col = AL('v', { gap: 3, name: `col ${i}` })
    col.opacity = i % 3 === 1 ? 0.4 : 1
    for (let j = 0; j < count; j++) col.appendChild(rect(4, 5, accent, 999))
    row.appendChild(col)
  })
  return row
}

/** Solid rounded mini columns, latest period in full accent. MiniColumns(). */
function miniColumns(accent) {
  const row = AL('h', { gap: 7, align: 'MAX', name: 'MiniColumns' })
  row.resize(10, 52)
  row.primaryAxisSizingMode = 'AUTO'
  row.counterAxisSizingMode = 'FIXED'
  COLUMN_VALUES.forEach((v, i) => {
    const bar = rect(11, Math.round(v * 52), accent, 5, i === COLUMN_VALUES.length - 1 ? 1 : 0.35)
    row.appendChild(bar)
  })
  return row
}

/** Smooth mini area with a soft wash and an end dot. AreaMini(). */
function areaMini(accent, w) {
  const W = w, H = 44, pad = 5
  const min = Math.min(...AREA_VALUES), max = Math.max(...AREA_VALUES)
  const span = max - min || 1
  const step = (W - pad * 2) / (AREA_VALUES.length - 1)
  const pts = AREA_VALUES.map((v, i) => [pad + i * step, pad + (1 - (v - min) / span) * (H - pad * 2)])
  // Midpoint-quadratic smoothing: each point is a control, the curve passes midway.
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const [nx, ny] = pts[i + 1]
    d += ` Q ${x} ${y}, ${(x + nx) / 2} ${(y + ny) / 2}`
  }
  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`
  const [lx, ly] = pts[pts.length - 1]

  const f = figma.createFrame()
  f.name = 'AreaMini'; f.resize(W, H); f.fills = []; f.clipsContent = false
  const area = vec(`${d} L ${lx} ${H} L ${pts[0][0]} ${H} Z`, { fillRule: 'NONZERO', fill: accent, fillOpacity: 0.1 })
  f.appendChild(area); area.x = 0; area.y = 0
  const line = vec(d, { stroke: accent, sw: 2 })
  f.appendChild(line); line.x = 0; line.y = 0
  const dot = figma.createEllipse()
  dot.resize(7, 7); dot.fills = [solid(accent)]
  dot.strokes = [solid('#ffffff')]; dot.strokeWeight = 2
  f.appendChild(dot); dot.x = lx - 3.5; dot.y = ly - 3.5
  return f
}

/** Calm ECG-style line. PulseLine(). */
function pulseLine(accent, w) {
  const PTS = [[0,26],[16,26],[22,18],[28,32],[36,10],[42,26],[60,26],[66,21],[72,26],[90,26],[97,6],[103,37],[111,26],[132,26]]
  const sx = w / 132
  let d = `M ${PTS[0][0] * sx} ${PTS[0][1]}`
  for (let i = 1; i < PTS.length; i++) d += ` L ${PTS[i][0] * sx} ${PTS[i][1]}`
  const f = figma.createFrame()
  f.name = 'PulseLine'; f.resize(w, 44); f.fills = []; f.clipsContent = false
  const line = vec(d, { stroke: accent, sw: 2 })
  f.appendChild(line)
  return f
}
const homeViz = (kind, accent, w) =>
  kind === 'dots' ? dotBars(accent)
  : kind === 'cols' ? miniColumns(accent)
  : kind === 'area' ? areaMini(accent, w)
  : pulseLine(accent, w)

const deltaColor = (t) => {
  const s = String(t).trim()
  if (s.startsWith('+')) return C.pos
  if (s.startsWith('-') || s.startsWith('−')) return C.neg
  return C.faint
}

/* ── the illustrated horizon (ForestBand) ────────────────────────────────── */
/** Flat-vector zoo forest in tints of the brand green. 1:1 at 390x160. */
function forestBand() {
  const f = figma.createFrame()
  f.name = 'ForestBand'
  f.resize(390, 160)
  f.fills = []
  f.clipsContent = true
  const put = (n, x, y) => { f.appendChild(n); if (x !== undefined) { n.x = x; n.y = y } return n }
  const path = (d, o) => { const v = vec(d, o); f.appendChild(v); return v }
  const circle = (cx, cy, r, colr, opacity) => {
    const e = figma.createEllipse(); e.resize(r * 2, r * 2); e.fills = [solid(colr, opacity)]
    return put(e, cx - r, cy - r)
  }
  const ellipse = (cx, cy, rx, ry, colr, opacity) => {
    const e = figma.createEllipse(); e.resize(rx * 2, ry * 2); e.fills = [solid(colr, opacity)]
    return put(e, cx - rx, cy - ry)
  }

  /* sun + clouds */
  circle(348, 22, 13, '#f0e6c6', 0.9)
  ellipse(330, 30, 14, 5, '#f2f7f2', 0.6)
  ellipse(62, 20, 16, 6, '#f2f7f2', 0.6)
  ellipse(77, 17, 10, 4.5, '#f2f7f2', 0.6)
  ellipse(210, 12, 12, 4.5, '#f2f7f2', 0.48)
  /* distant birds */
  ;[
    'M148 28 c2 -3 4 -3 5 -1 c1 -2 3 -2 5 1',
    'M172 34 c1.5 -2.2 3 -2.2 3.7 -0.7 c0.7 -1.5 2.2 -1.5 3.7 0.7',
    'M128 20 c1.2 -1.8 2.5 -1.8 3.1 -0.5 c0.6 -1.3 1.9 -1.3 3.1 0.5',
  ].forEach((d) => path(d, { stroke: '#5d8271', sw: 1.2, strokeOpacity: 0.7 }))

  /* far hills → tree line → foreground ground */
  path('M0 84 Q80 56 160 74 T320 64 Q360 60 390 68 L390 160 L0 160 Z', { fillRule: 'NONZERO', fill: '#b9d6c7' })
  path('M0 96 Q15 84 30 94 Q42 82 58 92 Q70 80 86 92 Q100 84 112 94 Q128 80 144 92 Q158 84 172 94 Q186 82 202 92 Q214 84 228 94 Q244 80 258 92 Q272 84 286 94 Q300 82 316 92 Q330 84 344 94 Q360 82 390 94 L390 160 L0 160 Z', { fillRule: 'NONZERO', fill: '#a2c9b6' })
  /* conifers + bushes */
  ;['M36 102 l7 -22 7 22 Z', 'M246 100 l6 -18 6 18 Z', 'M352 102 l7 -20 7 20 Z']
    .forEach((d) => path(d, { fillRule: 'NONZERO', fill: '#86b39c' }))
  circle(130, 100, 9, '#93bfa9'); circle(141, 102, 7, '#93bfa9')
  circle(278, 100, 8, '#93bfa9'); circle(288, 102, 6, '#93bfa9')
  path('M0 118 Q90 108 180 116 T390 112 L390 160 L0 160 Z', { fillRule: 'NONZERO', fill: '#8fbaa5' })
  /* stream */
  path('M166 116 C176 126 160 138 182 160 L138 160 C150 138 146 126 154 117 Z', { fillRule: 'NONZERO', fill: '#d9ece2', fillOpacity: 0.85 })
  /* ground florets */
  ;[[120,130],[124,128],[122,132.5],[253,136],[257,134],[255,138.5]].forEach(([x, y]) => circle(x, y, 1.8, '#f6f4ea'))
  circle(122, 130, 1.2, '#e0c98f'); circle(255, 136, 1.2, '#e0c98f')

  /* elephant — domed back, ear, raised trunk */
  path('M57 120 L57 133', { stroke: '#3f6555', sw: 8 })
  path('M86 120 L86 133', { stroke: '#3f6555', sw: 8 })
  path('M46 116 C44 104 52 97 64 96 C74 95 83 97 89 102 C92 97 99 94 105 97 C111 100 112 108 110 114 C109 118 104 121 99 120 C96 124 94 126 90 126 C78 128 58 128 48 124 C45 121 45 118 46 116 Z', { fillRule: 'NONZERO', fill: '#4a6f5f' })
  path('M67 121 L67 134', { stroke: '#4a6f5f', sw: 9 })
  path('M95 121 L95 134', { stroke: '#4a6f5f', sw: 9 })
  path('M108 112 C116 111 123 104 122 95 C121 89 116 86 112 88 C116 91 117 97 113 101 C110 105 106 107 103 108 Z', { fillRule: 'NONZERO', fill: '#4a6f5f' })
  path('M90 100 C97 98 102 103 102 110 C102 116 98 121 92 120 C88 115 87 105 90 100 Z', { fillRule: 'NONZERO', fill: '#35544a' })
  path('M101 118 C105 120 108 122 109 125', { stroke: '#e9e5d4', sw: 2.2 })
  path('M46 106 C41 110 40 116 42 121', { stroke: '#4a6f5f', sw: 1.8 })
  circle(42, 122, 1.8, '#4a6f5f'); circle(104, 105, 1.3, '#17342a')

  /* flamingo — slim body, S-neck, one leg cocked */
  path('M172 116 C172 121 171 126 171 130', { stroke: '#b98891', sw: 1.5 })
  path('M175.5 116 C177.5 120 175.5 124 173.5 129', { stroke: '#b98891', sw: 1.5 })
  path('M167 109 C163 107 160 108 158 110 C161 112 164.5 112.5 167 112 Z', { fillRule: 'NONZERO', fill: '#d8a8b0' })
  path('M167 112 C166 107 171 103 176 105 C180 107 181 111 178 114 C174 117 169 116 167 112 Z', { fillRule: 'NONZERO', fill: '#d8a8b0' })
  path('M169 112 C172 110 176 111 177 113 C174 116 170 115 169 112 Z', { fillRule: 'NONZERO', fill: '#c294a0' })
  path('M177 106 C181 102 179 96 176 93 C173 90 175 86 179 85', { stroke: '#d8a8b0', sw: 2.6 })
  circle(180, 84.5, 2.8, '#d8a8b0')
  path('M182.5 84 L187.5 86 L182.5 88 Z', { fillRule: 'NONZERO', fill: '#35544a' })
  circle(180, 83.6, 0.8, '#17342a')

  /* deer — one silhouette, antlers branched */
  path('M226 112 L225.5 132 C225.5 135 222.5 135 222.5 132 L223 111 Z', { fillRule: 'NONZERO', fill: '#3f6555' })
  path('M208 112 L207.5 132 C207.5 135 204.5 135 204.5 132 L205 111 Z', { fillRule: 'NONZERO', fill: '#3f6555' })
  path('M209 116 C206 112 205 106 209 103 C213 100 219 100 224 102 C227 103 229 100 231 97 C233 94 234 91 236 89 C237 87 241 87 242 89 C244 91 247 93 248 95 C248 97 246 98 243 97 C240 96 238 97 236 99 C234 102 233 106 232 110 C232 113 231 115 231 117 L230.5 133 C230.5 136 227.5 136 227.5 133 L227 119 C223 121 218 121 214 118 L213 133 C213 136 210 136 210 133 L209.5 117 Z', { fillRule: 'NONZERO', fill: '#4a6f5f' })
  path('M235 90 C232 87 231 84 233 83 C235 84 236 87 236.5 89 Z', { fillRule: 'NONZERO', fill: '#35544a' })
  ;['M239 88 C238 83 236 79 234 76', 'M236.5 81 C234.5 80 233 79 232 78', 'M238 84.5 C236 83.5 234.5 83 233.5 82.5', 'M241.5 88 C242.5 83 243.5 80 244.5 77', 'M242.5 82 C244 81 245.5 80.5 246.5 80']
    .forEach((d) => path(d, { stroke: '#4a6f5f', sw: 1.3 }))
  path('M208 107 C205 108 204 111 206 113 C208 111 209 109 208 107 Z', { fillRule: 'NONZERO', fill: '#d9ece2', fillOpacity: 0.55 })
  circle(243, 93, 1, '#17342a')

  /* giraffe — sloping back, long neck, mane and patches */
  path('M318.5 119 L318 136 C318 139 315 139 315 136 L315.5 118 Z', { fillRule: 'NONZERO', fill: '#3f6555' })
  path('M305 120 L304.5 136 C304.5 139 301.5 139 301.5 136 L302 119 Z', { fillRule: 'NONZERO', fill: '#3f6555' })
  path('M297 116 C295 110 300 105 308 103 C314 101 318 100 321 101 C322 94 326 84 330 76 C332 70 334 66 336 62 C337 58 341 57 343 59 C345 61 347 63 348 65 C348 67 345 68 343 67 C341 72 337 80 334 89 C331 97 329 104 328 112 C327 117 326 120 325 122 L324 137 C324 140 320.5 140 320.5 137 L320 121 C313 124 306 124 301 121 L300.5 137 C300.5 140 297 140 297 137 L297.5 118 Z', { fillRule: 'NONZERO', fill: '#4a6f5f' })
  path('M337 59 C334 57 333 54 335 53 C337 55 338 57 338 59 Z', { fillRule: 'NONZERO', fill: '#35544a' })
  path('M322 96 C326 86 331 75 336 63', { stroke: '#35544a', sw: 2.4 })
  path('M339 57 L338 53', { stroke: '#4a6f5f', sw: 1.5 })
  path('M342.5 57.5 L343 53.5', { stroke: '#4a6f5f', sw: 1.5 })
  path('M297 106 C293 110 292 116 294 120', { stroke: '#4a6f5f', sw: 1.5 })
  circle(294, 121, 1.5, '#4a6f5f')
  ;[[305,110,2.4],[312,111,2],[318,108,1.7],[308,116,1.6],[328,94,1.6],[332,84,1.4]]
    .forEach(([x, y, r]) => circle(x, y, r, '#35544a'))
  circle(342, 63, 1, '#17342a')

  /* foreground foliage — corners */
  path('M0 160 C6 132 20 120 34 122 C28 138 16 152 6 160 Z', { fillRule: 'NONZERO', fill: '#5f8b76' })
  path('M390 160 C384 134 372 122 356 124 C362 140 376 154 386 160 Z', { fillRule: 'NONZERO', fill: '#5f8b76' })
  path('M14 160 C22 140 34 132 46 134 C40 146 30 156 22 160 Z', { fillRule: 'NONZERO', fill: '#7fae97' })
  path('M376 160 C370 144 358 136 346 138 C352 150 362 158 370 160 Z', { fillRule: 'NONZERO', fill: '#7fae97' })
  path('M10 156 C16 142 24 132 32 126', { stroke: '#a8cbb8', sw: 1.2, strokeOpacity: 0.8 })
  path('M380 156 C374 142 366 132 360 127', { stroke: '#a8cbb8', sw: 1.2, strokeOpacity: 0.8 })

  return f
}

/** Faint birds over a warm mist — the header's whisper of wilderness. */
function mistBackdrop(w, h) {
  const f = figma.createFrame()
  f.name = 'MistBackdrop'; f.resize(w, h); f.fills = []; f.clipsContent = true
  const glow = figma.createEllipse()
  glow.resize(256, 256)
  glow.fills = [{
    type: 'GRADIENT_RADIAL',
    gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
    gradientStops: [
      { position: 0, color: { r: 1, g: 1, b: 1, a: 0.5 } },
      { position: 0.7, color: { r: 1, g: 1, b: 1, a: 0 } },
    ],
  }]
  f.appendChild(glow); glow.x = w - 256; glow.y = -64
  ;[[250,34,1],[292,22,0.8],[322,44,0.65],[275,58,0.55],[341,18,0.5]].forEach(([bx, by, s]) => {
    const v = vec('M0,4 C2.5,0.5 4.5,0.5 6,3.2 C7.5,0.5 9.5,0.5 12,4', { stroke: '#34544a', sw: 1.3, strokeOpacity: 0.35 })
    f.appendChild(v)
    RESCALE(v, s)
    v.x = bx; v.y = by
  })
  return f
}

/* ── home cards ──────────────────────────────────────────────────────────── */
const HOME_CARD = (name) => AL('v', { gap: 0, pad: 16, radius: 16, bg: C.cardHome, name })

/** DailyCard — icon + delta, big number, micro-viz. */
function dailyCard(card, prominent, w) {
  const pad = prominent ? 20 : 16
  const tile = AL('v', { gap: 0, pad, radius: 16, bg: C.cardHome, name: card.title })
  const head = AL('h', { gap: 8, align: 'CENTER' })
  head.appendChild(icon(card.icon, 16, card.accent, 1.75))
  const title = T(card.title, { s: 15, w: 500, c: C.ink })
  head.appendChild(title); title.textTruncation = 'ENDING'
  fill(tile, head)
  spacer(tile, 12)
  // Reference anatomy: the delta reads with the number, not in the header.
  const val = AL('h', { gap: 6, align: 'BASELINE' })
  val.appendChild(T(card.value, prominent ? { s: 38, display: true, lh: 44, c: C.value } : { s: 30, display: true, lh: 36, c: C.value }))
  val.appendChild(T(card.delta, { s: 13, w: 500, c: deltaColor(card.delta) }))
  if (card.unit) val.appendChild(T(card.unit, { s: 13, c: C.faint }))
  fill(tile, val)
  spacer(tile, 12)
  const viz = homeViz(card.viz, card.accent, w - pad * 2)
  tile.appendChild(viz)
  if (card.viz === 'area' || card.viz === 'pulse') viz.layoutSizingHorizontal = 'FILL'
  return tile
}

/** ModuleCard — wide row, big number, optional arc gauge or note. */
function moduleCard(card) {
  const row = AL('h', { gap: 16, pad: 20, radius: 16, bg: C.cardHome, align: 'CENTER', name: card.title })
  const left = AL('v', { gap: 0 })
  const head = AL('h', { gap: 8, align: 'CENTER' })
  head.appendChild(icon(card.icon, 16, card.accent, 1.75))
  head.appendChild(T(card.title, { s: 15, w: 500, c: C.ink }))
  fill(left, head)
  spacer(left, 8)
  const val = AL('h', { gap: 5, align: 'BASELINE' })
  val.appendChild(T(card.value, { s: 28, display: true, lh: 32, c: C.value }))
  val.appendChild(T(card.unit, { s: 13, c: C.faint }))
  fill(left, val)
  row.appendChild(left); left.layoutGrow = 1
  if (card.gauge) row.appendChild(arcGauge(card.gauge.fraction, card.gauge.label, card.accent))
  else if (card.note) row.appendChild(T(card.note, { s: 13, w: 500, c: deltaColor(card.note) }))
  return row
}

/** Number-first stat tile — tinted glyph chip, chevron, value, title. */
function statTile(m) {
  const tile = AL('v', { gap: 0, pad: 16, radius: 16, bg: C.cardHome, name: m.title })
  const head = AL('h', { gap: 8, align: 'CENTER' })
  head.appendChild(icon(m.icon, 16, m.accent, 1.75))
  const t = T(m.title, { s: 15, w: 500, c: C.ink })
  head.appendChild(t); t.textTruncation = 'ENDING'
  fill(tile, head)
  spacer(tile, 12)
  const val = AL('h', { gap: 5, align: 'BASELINE' })
  val.appendChild(T(m.value, { s: 28, display: true, lh: 32, c: C.value }))
  val.appendChild(T(m.unit, { s: 13, c: C.faint }))
  fill(tile, val)
  return tile
}

/* ── home page assembler ─────────────────────────────────────────────────── */
function buildHome(H, x, y, greeting) {
  const half = (HOME_CONTENT_W - 12) / 2   // 169

  const frame = figma.createFrame()
  frame.name = 'Home — ANTZ Command Centre'
  frame.resize(PHONE_W, 1400)
  frame.fills = [solid(C.ground)]
  frame.x = x; frame.y = y
  frame.clipsContent = true

  // Brand-green gradient, full-bleed, completing within the first screen.
  const grad = rect(PHONE_W, 880)
  grad.name = 'Header gradient'
  grad.fills = [{ ...vgrad([[0, '#cde4d8', 1], [0.34, '#b4d3c4', 1], [0.56, '#a0c8b5', 1], [1, '#e7f0ea', 0]]) }]
  frame.appendChild(grad); grad.x = 0; grad.y = 0

  const col = AL('v', { gap: 0, name: 'Content' })
  col.resize(PHONE_W, 100)
  col.counterAxisSizingMode = 'FIXED'
  col.fills = []
  frame.appendChild(col); col.x = 0; col.y = 0

  /* greeting header */
  const header = AL('h', { gap: 16, pad: [48, HOME_PAD, 24, HOME_PAD], align: 'MIN', name: 'GreetingHeader' })
  fill(col, header)
  const left = AL('v', { gap: 0 })
  fill(left, T(`${greeting},`, { s: 18, c: C.muted }))
  spacer(left, 2)
  fill(left, T(`${H.site.userName} 👋`, { s: 30, w: 700, lh: 36, ls: -2, c: C.ink }))
  spacer(left, 6)
  const org = AL('h', { gap: 4, align: 'CENTER' })
  org.appendChild(icon('MapPin', 14, C.ink2, 1.75))
  org.appendChild(T(H.site.org, { s: 14, c: C.ink2 }))
  fill(left, org)
  header.appendChild(left); left.layoutGrow = 1
  const bell = AL('h', { radius: 999, bg: C.cardHome, align: 'CENTER', justify: 'CENTER', name: 'Bell' })
  bell.resize(44, 44)
  bell.primaryAxisSizingMode = 'FIXED'; bell.counterAxisSizingMode = 'FIXED'
  bell.appendChild(icon('Bell', 18, C.ink, 1.75))
  header.appendChild(bell)

  /* hero */
  const hero = AL('v', { gap: 0, pad: [20, HOME_PAD, 0, HOME_PAD], align: 'CENTER', name: 'Hero' })
  fill(col, hero)
  const heroVal = T(fmt(H.hero.value), { s: 58, display: true, lh: 58, ls: -2, align: 'CENTER' })
  heroVal.fills = [{ ...vgrad([[0, '#20291f'], [0.62, '#0a4d3c'], [1, '#034739']]) }]
  fill(hero, heroVal)
  spacer(hero, 8)
  fill(hero, T(`Total ${H.hero.label}`, { s: 16, c: C.ink, align: 'CENTER' }))
  spacer(hero, 6)
  fill(hero, T(`▲ ${H.hero.delta}`, { s: 12, w: 600, c: C.pos, align: 'CENTER' }))

  /* illustrated horizon — edge to edge */
  const band = forestBand()
  col.appendChild(band)
  band.layoutSizingHorizontal = 'FIXED'

  /* main */
  const main = AL('v', { gap: 12, pad: [12, HOME_PAD, 40, HOME_PAD], name: 'Main' })
  fill(col, main)

  const ovr = AL('h', { pad: [8, 0, 0, 0] })
  ovr.appendChild(T('Overview', { s: 20, w: 600, c: C.ink }))
  fill(main, ovr)

  const pairRow = (cards, prominent) => {
    const row = AL('h', { gap: 12 })
    cards.forEach((c) => {
      const t = dailyCard(c, prominent, half)
      row.appendChild(t); t.layoutGrow = 1
    })
    fill(main, row)
  }
  pairRow(H.mainPair, true)
  pairRow(H.dailyUpdates, false)

  /* welfare / assessment */
  const w = H.welfare
  const wRow = AL('h', { gap: 16, pad: 20, radius: 16, bg: C.cardHome, align: 'CENTER', name: w.title })
  const wLeft = AL('v', { gap: 0 })
  const wHead = AL('h', { gap: 8, align: 'CENTER' })
  wHead.appendChild(icon(w.icon, 16, w.accent, 1.75))
  wHead.appendChild(T(w.title, { s: 15, w: 500, c: C.ink }))
  fill(wLeft, wHead)
  spacer(wLeft, 6)
  fill(wLeft, T(w.sub, { s: 11, c: C.muted }))
  wRow.appendChild(wLeft); wLeft.layoutGrow = 1
  const wVal = AL('h', { gap: 0, align: 'BASELINE' })
  wVal.appendChild(T(w.value, { s: 30, display: true, lh: 36, c: C.value }))
  wVal.appendChild(T(w.of, { s: 13, c: C.faint }))
  wRow.appendChild(wVal)
  fill(main, wRow)

  H.moduleCards.forEach((c) => fill(main, moduleCard(c)))

  /* everything else — 2x2 stat tiles */
  for (let i = 0; i < H.moreModules.length; i += 2) {
    const row = AL('h', { gap: 12 })
    H.moreModules.slice(i, i + 2).forEach((m) => {
      const t = statTile(m)
      row.appendChild(t); t.layoutGrow = 1
    })
    fill(main, row)
  }

  col.layoutSizingVertical = 'HUG'
  const total = col.height
  grad.resize(PHONE_W, Math.min(880, total))
  frame.resize(PHONE_W, PHONE_H)
  frame.clipsContent = true
  return { frame: frame, contentHeight: total }
}
