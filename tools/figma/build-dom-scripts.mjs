/**
 * antz-dom.json → out-dom/NN-*.js, one `use_figma` script per section.
 *
 *   node tools/figma/build-dom-scripts.mjs
 *
 * Split because `use_figma` caps `code` at 50,000 chars and the captured tree is
 * ~160KB. Each script re-finds the page and the screen frame by name, builds one
 * section, and returns the ids it made — so a failure costs one section, not the
 * whole screen.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { HERE } from './paths.mjs'

const DATA = resolve(HERE, 'antz-dom.json')
const OUT = resolve(HERE, 'out-dom')
const PRELUDE = readFileSync(resolve(HERE, 'dom-prelude.js'), 'utf8')

export const PAGE = 'claude output'
export const FRAME = 'Home — Desktop · 1440'

/* Only the constants above are safe to import: the emit below runs on import
   otherwise, so `push-images.mjs` reading PAGE/FRAME would silently rebuild every
   script mid-push. */
const MAIN = import.meta.url === `file://${process.argv[1]}`
const doc = MAIN ? JSON.parse(readFileSync(DATA, 'utf8')) : null
if (MAIN) emit()

function emit() {

/* ── compaction ──────────────────────────────────────────────────────────── */
/* Geometry to 0.1px and no null-valued keys. The browser's sub-pixel thirds
   (541.297px grid tracks) carry no design intent and cost ~25% of the payload. */
const r1 = (v) => Math.round(v * 10) / 10
function compact(n) {
  const o = {}
  for (const [k, v] of Object.entries(n)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'children') continue
    if (['x', 'y', 'w', 'h', 'size', 'lh', 'ls'].includes(k) && typeof v === 'number') { o[k] = r1(v); continue }
    if (k === 'pad') { const p = v.map(r1); if (p.some((x) => x)) o[k] = p; continue }
    if (k === 'radius') { o[k] = v.map(r1); continue }
    if (k === 'opacity') { if (v < 1) o[k] = r1(v); continue }
    if (k === 'layout' && v) {
      const l = { mode: v.mode }
      if (v.gap) l.gap = r1(v.gap)
      if (v.gapX) l.gapX = r1(v.gapX)
      if (v.wrap) l.wrap = true
      if (v.align) l.align = v.align
      if (v.justify) l.justify = v.justify
      o[k] = l
      continue
    }
    o[k] = v
  }
  if (n.children) o.children = n.children.map(compact)
  return o
}

/* ── locate the pieces ───────────────────────────────────────────────────── */
const find = (n, pred) => {
  if (pred(n)) return n
  for (const c of n.children || []) { const r = find(c, pred); if (r) return r }
  return null
}
const sidebar = find(doc.tree, (n) => n.name === 'Modules')
const tier = find(doc.tree, (n) => n.name === 'div.tier')
const ground = find(doc.tree, (n) => n.name === 'div.page-ground')
const banner = tier.children[0]
const main = tier.children.find((c) => c.tag === 'main')

/* One entry per pushed script. `nodes` are placed at their captured page
   coordinates inside the screen frame; auto-layout is decided per container by
   the prelude's `plan()`. */
const SECTIONS = [
  { id: '01', name: 'sidebar', nodes: [sidebar] },
  { id: '02', name: 'banner', nodes: [banner] },
  { id: '03', name: 'species-count', nodes: main.children.slice(0, 2) },
  { id: '04', name: 'executive-overview', nodes: main.children.slice(2, 3) },
  { id: '05', name: 'operational-status', nodes: main.children.slice(3, 5) },
  { id: '06', name: 'trends-head', nodes: main.children.slice(5, 6) },
  { id: '07', name: 'trends', nodes: main.children.slice(6, 7) },
  { id: '08', name: 'collection-watch-head', nodes: main.children.slice(7, 8) },
  { id: '09', name: 'collection-watch', nodes: main.children.slice(8, 9) },
  { id: '10', name: 'footer', nodes: main.children.slice(9) },
]

/* ── emit ────────────────────────────────────────────────────────────────── */
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const setup = `
/* ANTZ Command Centre — desktop Home. Creates the screen frame the section
   scripts append into. Re-runnable: an existing frame of the same name is
   cleared rather than duplicated. */
const page = figma.root.children.find(p => p.name === ${JSON.stringify(PAGE)})
if (!page) throw new Error('page not found: ${PAGE}')
await figma.setCurrentPageAsync(page)

let root = page.children.find(c => c.name === ${JSON.stringify(FRAME)})
if (root) root.remove()

root = figma.createFrame()
root.name = ${JSON.stringify(FRAME)}
root.resize(${r1(doc.width)}, ${r1(doc.height)})
root.layoutMode = 'NONE'
root.clipsContent = true
root.fills = [{ type: 'SOLID', color: { r: ${(0xf4 / 255).toFixed(4)}, g: ${(0xf7 / 255).toFixed(4)}, b: ${(0xf3 / 255).toFixed(4)} } }]

/* Clear of anything already on the page, per the position-away-from-origin rule. */
let x = 0
for (const c of page.children) if (c !== root) x = Math.max(x, c.x + c.width + 200)
root.x = x
root.y = 0

return { createdNodeIds: [root.id], frame: ${JSON.stringify(FRAME)}, x: root.x, width: root.width, height: root.height }
`.trim()
writeFileSync(resolve(OUT, '00-setup.js'), setup)

/* The page ground is a full-bleed fill behind everything — pushed with setup's
   sibling script so sections can be re-pushed without touching it. */
const groundScript = `
${PRELUDE}
const { root } = await screen(${JSON.stringify(PAGE)}, ${JSON.stringify(FRAME)})
const DATA = ${JSON.stringify(compact({ ...ground, children: [] }))}
const n = build(DATA)
root.appendChild(n)
n.x = 0; n.y = 0
n.name = 'page ground'
return { createdNodeIds: [n.id] }
`.trim()
writeFileSync(resolve(OUT, '01-ground.js'), groundScript)

let i = 2
for (const s of SECTIONS) {
  const nodes = s.nodes.filter(Boolean).map(compact)
  const num = String(i++).padStart(2, '0')
  const body = `
${PRELUDE}
const { root } = await screen(${JSON.stringify(PAGE)}, ${JSON.stringify(FRAME)})
const DATA = ${JSON.stringify(nodes)}
await loadFontsFor({ children: DATA })

const made = []
for (const d of DATA) {
  const n = build(d)
  if (!n) continue
  root.appendChild(n)
  n.x = d.x
  n.y = d.y
  made.push(n.id)
}
return { section: ${JSON.stringify(s.name)}, createdNodeIds: made }
`.trim()
  writeFileSync(resolve(OUT, `${num}-${s.name}.js`), body)
}

for (const f of readdirSync(OUT).sort()) {
  const kb = (readFileSync(resolve(OUT, f), 'utf8').length / 1024).toFixed(1)
  console.log(`  ${f.padEnd(30)} ${kb.padStart(7)}KB`)
}
}
