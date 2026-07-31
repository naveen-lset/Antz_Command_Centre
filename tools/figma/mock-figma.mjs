/**
 * Minimal Figma Plugin API stand-in — enough to execute the builders and surface
 * exceptions, bad property names, and ordering violations before we write to the
 * real file. Layout maths are approximate; correctness of geometry is verified
 * later with a real screenshot.
 */
const loaded = new Set()

let idc = 0
const AUTO = new Set(['FRAME', 'COMPONENT'])

class Node {
  constructor(type) {
    this.id = `${type}:${++idc}`
    this.type = type
    this.children = []
    this.parent = null
    this.width = 100
    this.height = 20
    this.x = 0
    this.y = 0
    this.fills = []
    this.strokes = []
    this.layoutMode = 'NONE'
    this.itemSpacing = 0
    this.opacity = 1
    this.name = type.toLowerCase()
    this._sizing = { h: 'FIXED', v: 'FIXED' }
  }
  set(props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'width') this.resize(v, this.height)
      else if (k === 'height') this.resize(this.width, v)
      else this[k] = v
    }
    return this
  }
  resize(w, h) {
    if (!(w > 0) || !(h > 0)) throw new Error(`${this.name}: resize needs positive dims, got ${w}x${h}`)
    this.width = w; this.height = h
    return this
  }
  rescale(s) {
    if (!(s > 0)) throw new Error(`${this.name}: rescale needs a positive scale, got ${s}`)
    this.width *= s; this.height *= s
    for (const c of this.children) c.rescale(s)
    return this
  }
  appendChild(c) {
    if (!c) throw new Error(`${this.name}: appendChild(undefined)`)
    if (c.parent) c.parent.children = c.parent.children.filter((n) => n !== c)
    c.parent = this
    this.children.push(c)
    this._relayout()
    return c
  }
  insertChild(i, c) { this.appendChild(c); return c }
  // Crude auto-layout: enough for HUG heights the builders read back.
  _relayout() {
    if (this.layoutMode === 'NONE') return
    const pad = (a, b) => (this[a] || 0) + (this[b] || 0)
    const along = this.children.reduce((n, c) => n + (this.layoutMode === 'VERTICAL' ? c.height : c.width), 0)
      + Math.max(0, this.children.length - 1) * this.itemSpacing
    const across = this.children.reduce((n, c) => Math.max(n, this.layoutMode === 'VERTICAL' ? c.width : c.height), 0)
    if (this.layoutMode === 'VERTICAL') {
      if (this._sizing.v === 'HUG' || this.primaryAxisSizingMode === 'AUTO') this.height = along + pad('paddingTop', 'paddingBottom')
      if (this._sizing.h === 'HUG' || this.counterAxisSizingMode === 'AUTO') this.width = across + pad('paddingLeft', 'paddingRight')
    } else {
      if (this._sizing.h === 'HUG' || this.primaryAxisSizingMode === 'AUTO') this.width = along + pad('paddingLeft', 'paddingRight')
      if (this._sizing.v === 'HUG' || this.counterAxisSizingMode === 'AUTO') this.height = across + pad('paddingTop', 'paddingBottom')
    }
    if (this.parent) this.parent._relayout()
  }
  get layoutSizingHorizontal() { return this._sizing.h }
  set layoutSizingHorizontal(v) { this._checkSizing('horizontal', v); this._sizing.h = v; this._relayout() }
  get layoutSizingVertical() { return this._sizing.v }
  set layoutSizingVertical(v) { this._checkSizing('vertical', v); this._sizing.v = v; this._relayout() }
  _checkSizing(axis, v) {
    if (!['FIXED', 'HUG', 'FILL'].includes(v)) throw new Error(`set_layoutSizing${axis}: expected FIXED|HUG|FILL, got ${v}`)
    const parentAuto = this.parent && this.parent.layoutMode && this.parent.layoutMode !== 'NONE'
    const selfAuto = this.layoutMode && this.layoutMode !== 'NONE'
    if (v === 'FILL' && !parentAuto) throw new Error(`set_layoutSizing${axis}: FILL can only be set on children of auto-layout frames (${this.name})`)
    if (v === 'HUG' && !selfAuto && this.type !== 'TEXT') throw new Error(`set_layoutSizing${axis}: HUG only on auto-layout frames or TEXT children (${this.name}/${this.type})`)
    if (v === 'FILL' && this.layoutPositioning === 'ABSOLUTE') throw new Error(`set_layoutSizing${axis}: FILL cannot be set on absolute children (${this.name})`)
  }
  set layoutGrow(v) {
    if (!Number.isInteger(v)) throw new Error(`in set_layoutGrow: Property "layoutGrow" failed validation: Expected integer, received float (${v})`)
    this._grow = v; if (this.parent) this.parent._relayout()
  }
  get layoutGrow() { return this._grow || 0 }
  query() { return { first: () => null, toArray: () => [], length: 0 } }
  findAllWithCriteria() { return [] }
  async screenshot() { return null }
}

class TextNode extends Node {
  constructor() {
    super('TEXT')
    this._chars = ''
    this._font = { family: 'Inter', style: 'Regular' }
    this.fontSize = 12
    this.textAutoResize = 'WIDTH_AND_HEIGHT'
  }
  get fontName() { return this._font }
  set fontName(f) {
    if (!f || !f.family) throw new Error('fontName needs {family, style}')
    if (!loaded.has(`${f.family}|${f.style}`)) throw new Error(`Cannot write to node with unloaded font "${f.family} ${f.style}"`)
    this._font = f
  }
  get characters() { return this._chars }
  set characters(v) {
    if (!loaded.has(`${this._font.family}|${this._font.style}`)) throw new Error(`Cannot write to node with unloaded font "${this._font.family} ${this._font.style}"`)
    this._chars = v
    this.width = Math.max(4, String(v).length * this.fontSize * 0.55)
    this.height = Math.ceil(this.fontSize * 1.3)
    if (this.parent) this.parent._relayout()
  }
  set lineHeight(v) {
    if (!v || typeof v !== 'object' || !('unit' in v)) throw new Error('lineHeight needs {unit, value}')
    this._lh = v; this.height = v.value || this.height
  }
  set letterSpacing(v) {
    if (!v || typeof v !== 'object' || !('unit' in v)) throw new Error('letterSpacing needs {unit, value}')
    this._ls = v
  }
  set textTruncation(v) { this._trunc = v }
  set textCase(v) { this._case = v }
}

class VectorNode extends Node {
  constructor() { super('VECTOR') }
  set vectorPaths(paths) {
    if (!Array.isArray(paths)) throw new Error('vectorPaths must be an array')
    for (const p of paths) {
      if (!p || typeof p.data !== 'string') throw new Error('vectorPath needs {windingRule, data}')
      if (!/^M/.test(p.data.trim())) throw new Error(`path must start with an absolute moveto: ${p.data.slice(0, 40)}`)
      if (!['NONE', 'NONZERO', 'EVENODD'].includes(p.windingRule)) throw new Error(`bad windingRule ${p.windingRule}`)
      // Real Figma accepts ONLY absolute M/L/C/Q/Z — reject relative commands,
      // H/V/S/T shorthands and arcs exactly like set_vectorPaths does.
      const cmds = p.data.match(/[A-Za-z]/g) || []
      for (const c of cmds) {
        if (!'MLCQZ'.includes(c)) throw new Error(`in set_vectorPaths: Failed to convert path. Invalid command ${c}: ${p.data.slice(0, 60)}`)
      }
      const nums = p.data.match(/-?\d*\.?\d+(e-?\d+)?/gi) || []
      for (const n of nums) if (!Number.isFinite(Number(n))) throw new Error(`NaN in path data: ${p.data.slice(0, 60)}`)
      if (/NaN|undefined|Infinity/.test(p.data)) throw new Error(`bad path data: ${p.data.slice(0, 80)}`)
    }
    this._paths = paths
  }
  get vectorPaths() { return this._paths || [] }
  set arcData(a) {
    if (!a || !Number.isFinite(a.startingAngle) || !Number.isFinite(a.endingAngle)) throw new Error(`bad arcData ${JSON.stringify(a)}`)
    this._arc = a
  }
  set dashPattern(d) {
    if (!Array.isArray(d) || d.some((n) => !Number.isFinite(n))) throw new Error(`bad dashPattern ${JSON.stringify(d)}`)
    this._dash = d
  }
}

const checkPaint = (p, where) => {
  if (!p || !p.type) throw new Error(`${where}: paint needs a type`)
  if (p.type === 'SOLID') {
    if (!p.color) throw new Error(`${where}: SOLID needs color`)
    for (const k of ['r', 'g', 'b']) {
      const v = p.color[k]
      if (!Number.isFinite(v)) throw new Error(`${where}: color.${k} is ${v}`)
      if (v < 0 || v > 1) throw new Error(`${where}: color.${k}=${v} out of 0-1 range`)
    }
    if ('a' in p.color) throw new Error(`${where}: SOLID color must not carry 'a' — use paint.opacity`)
  }
  if (p.type.startsWith('GRADIENT')) {
    if (!Array.isArray(p.gradientStops) || !p.gradientStops.length) throw new Error(`${where}: gradient needs stops`)
    for (const s of p.gradientStops) {
      if (!Number.isFinite(s.position)) throw new Error(`${where}: stop position ${s.position}`)
      for (const k of ['r', 'g', 'b', 'a']) if (!Number.isFinite(s.color[k])) throw new Error(`${where}: stop color.${k}=${s.color[k]}`)
    }
    if (!Array.isArray(p.gradientTransform)) throw new Error(`${where}: gradient needs gradientTransform`)
  }
}
// Validate paints on assignment across every node type.
for (const Cls of [Node, TextNode, VectorNode]) {
  Object.defineProperty(Cls.prototype, 'fills', {
    get() { return this._fills || [] },
    set(v) { if (!Array.isArray(v)) throw new Error(`${this.name}: fills must be an array`); v.forEach((p) => checkPaint(p, `${this.name}.fills`)); this._fills = v },
    configurable: true,
  })
  Object.defineProperty(Cls.prototype, 'strokes', {
    get() { return this._strokes || [] },
    set(v) { if (!Array.isArray(v)) throw new Error(`${this.name}: strokes must be an array`); v.forEach((p) => checkPaint(p, `${this.name}.strokes`)); this._strokes = v },
    configurable: true,
  })
  Object.defineProperty(Cls.prototype, 'effects', {
    get() { return this._effects || [] },
    set(v) {
      for (const e of v) {
        if (!e.type) throw new Error('effect needs type')
        if (e.type === 'DROP_SHADOW') {
          for (const k of ['r', 'g', 'b', 'a']) if (!Number.isFinite(e.color[k])) throw new Error(`shadow color.${k}=${e.color[k]}`)
          if (!Number.isFinite(e.radius)) throw new Error('shadow radius')
          if (!e.offset || !Number.isFinite(e.offset.y)) throw new Error('shadow offset')
        }
      }
      this._effects = v
    },
    configurable: true,
  })
}

const page = new Node('PAGE')
page.name = 'ANTZ — Command Centre (from code)'
const root = new Node('DOCUMENT')
root.children = [page]

export const figma = {
  root,
  currentPage: page,
  createFrame: () => new Node('FRAME'),
  createText: () => new TextNode(),
  createRectangle: () => new Node('RECTANGLE'),
  createEllipse: () => new Node('ELLIPSE'),
  createVector: () => new VectorNode(),
  createPage: () => { const p = new Node('PAGE'); root.children.push(p); return p },
  createAutoLayout: (dirOrProps, maybeProps) => {
    const dir = typeof dirOrProps === 'string' ? dirOrProps : 'HORIZONTAL'
    const props = typeof dirOrProps === 'object' ? dirOrProps : maybeProps
    const f = new Node('FRAME')
    f.layoutMode = dir
    f._sizing = { h: 'HUG', v: 'HUG' }
    f.primaryAxisSizingMode = 'AUTO'
    f.counterAxisSizingMode = 'AUTO'
    if (props) f.set(props)
    return f
  },
  group: (nodes, parent) => { const g = new Node('GROUP'); nodes.forEach((n) => g.appendChild(n)); parent.appendChild(g); return g },
  setCurrentPageAsync: async (p) => { figma.currentPage = p },
  getNodeByIdAsync: async () => null,
  loadFontAsync: async (f) => { loaded.add(`${f.family}|${f.style}`) },
  listAvailableFontsAsync: async () => [
    { fontName: { family: 'Inter', style: 'Regular' } },
    { fontName: { family: 'Inter', style: 'Medium' } },
    { fontName: { family: 'Inter', style: 'Semi Bold' } },
    { fontName: { family: 'Inter', style: 'Bold' } },
    { fontName: { family: 'DM Sans', style: 'Regular' } },
    { fontName: { family: 'DM Sans', style: 'Medium' } },
    { fontName: { family: 'DM Sans', style: 'SemiBold' } },
    { fontName: { family: 'DM Sans', style: 'Bold' } },
    { fontName: { family: 'SF Pro Rounded', style: 'Bold' } },
    { fontName: { family: 'Space Grotesk', style: 'Bold' } },
  ],
  variables: {
    getLocalVariableCollectionsAsync: async () => [],
    createVariableCollection: (name) => ({ id: 'c1', name, modes: [{ modeId: 'm1' }], variableIds: [] }),
    createVariable: (name) => ({ name, scopes: [], setValueForMode: () => {} }),
    getVariableByIdAsync: async () => null,
  },
  notify: () => { throw new Error('not implemented') },
}
export const mockState = { page, loaded }
