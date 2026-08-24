/**
 * A captured DOM tree → out-dom/NN-*.js, one `use_figma` script per chunk.
 *
 *   node tools/figma/build-dom-scripts.mjs
 *   node tools/figma/build-dom-scripts.mjs --in antz-dom-species.json \
 *        --frame "Species — Umber Langur · Desktop · 1440"
 *
 * Split because `use_figma` caps `code` at 50,000 chars and a captured tree is
 * 130–160KB. Each script re-finds the page and the screen frame by name, builds
 * its own chunk, and returns the ids it made — so a failure costs one chunk, not
 * the whole screen.
 *
 * THE SPLIT IS MEASURED, NOT AUTHORED, and that is the change that let a second
 * page through. The first version carried a table of ten named sections indexed
 * into `main.children` by hardcoded `slice()` bounds — `slice(6, 7)` was the
 * trends chart — plus four `find()` calls on Home's own class names. That is a
 * transcription of one screen's markup, so it produced ten scripts for any tree
 * it was handed: pointed at the species page it read `tier.children[0]` as a
 * banner that is really a breadcrumb, missed the tab bar entirely, and threw on
 * `main` because a species page has none. It would also have mis-assigned every
 * section the day Home gained or lost one, silently.
 *
 * So the tree is walked instead. A node that fits the budget is one unit; a node
 * that does not is EXPLODED into its children and each of those is measured in
 * turn. Exploding is lossless for position because every unit is placed at its
 * captured page coordinate inside a `layoutMode: 'NONE'` root — the only thing a
 * container would have contributed is its own surface, so a container that paints
 * one is kept as an empty shell behind its children. Units are then packed
 * greedily into scripts up to the cap.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { HERE } from './paths.mjs'

const OUT = resolve(HERE, 'out-dom')
const PRELUDE = readFileSync(resolve(HERE, 'dom-prelude.js'), 'utf8')

/* ── what a run is pointed at ────────────────────────────────────────────── */

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const IN = resolve(HERE, flag('in', 'antz-dom.json'))
export const PAGE = flag('page', 'claude output')
export const FRAME = flag('frame', 'Home — Desktop · 1440')

/**
 * The manifest is how `push-images.mjs` and `dryrun-dom.mjs` learn which frame
 * this run built.
 *
 * They used to `import { PAGE, FRAME }` from this module, which was correct only
 * while both were constants. Now that a run is pointed at a page from the command
 * line, an importer would read the DEFAULTS and go looking for Home's frame while
 * the species scripts sat in `out-dom` — so the answer is written down beside the
 * scripts it describes rather than recomputed from an import.
 */
export function manifest() {
  const path = resolve(OUT, 'manifest.json')
  return existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : { page: PAGE, frame: FRAME }
}

/* Only the exports above are safe to import: the emit below runs on import
   otherwise, so a consumer reading the manifest would silently rebuild every
   script mid-push. */
const MAIN = import.meta.url === `file://${process.argv[1]}`
if (MAIN) emit()

function emit() {
const doc = JSON.parse(readFileSync(IN, 'utf8'))

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

/* ── the budget ──────────────────────────────────────────────────────────── */

/**
 * How many characters of DATA one script may carry.
 *
 * The 50,000 is `use_figma`'s own cap on `code`, and the prelude is prepended to
 * every section script, so the real allowance is what is left after it. The
 * slack covers the four lines of scaffolding around the payload; measured at
 * ~330 chars, taken at 900 so a longer frame name cannot push a script over.
 */
const CAP = 50000
const BUDGET = CAP - PRELUDE.length - 900
if (BUDGET < 4000) throw new Error(`prelude is ${PRELUDE.length} chars; no room left under the ${CAP} cap`)

const sizeOf = (n) => JSON.stringify(compact(n)).length

/* ── the walk ────────────────────────────────────────────────────────────── */

/**
 * Does this node put anything on screen in its own right?
 *
 * Only a node that answers yes survives being exploded, as an empty shell behind
 * the children that replaced it. A bare layout wrapper — no fill, no border, no
 * shadow — draws nothing, so keeping one would add an invisible frame to the file
 * for every level of the DOM that happened to be too big to send in one piece.
 */
/* The key names are the extractor's, and they are `bg`/`grad` rather than
   `fill`/`gradient` — see `paintFrame` in the prelude, which is the one place that
   reads them. Getting them wrong here is invisible: every shell would test false
   and the surfaces would simply not be kept. */
const paints = (n) =>
  Boolean(n.bg || n.grad || (n.border && n.border.c) || (n.shadow && n.shadow !== 'none'))

/**
 * Flatten a subtree into placeable units, each within the budget.
 *
 * A leaf that is somehow over budget on its own is still emitted — a single
 * oversized node is a capture bug worth seeing fail loudly at push time rather
 * than being dropped here without a word. `oversize` counts them so the run says
 * so up front.
 */
const oversize = []
function units(node, out = []) {
  if (sizeOf(node) <= BUDGET) { out.push(node); return out }
  const kids = node.children || []
  if (!kids.length) { oversize.push(node); out.push(node); return out }
  if (paints(node)) out.push({ ...node, children: [] })
  for (const c of kids) units(c, out)
  return out
}

/**
 * The rows of the screen — the top-level things a reader would name.
 *
 * Descends through single-child wrappers first. Every capture opens with two or
 * three of them (`div` → `div.relative` → `div.relative`) and starting the split
 * at the outermost would make the whole page one unit, which is over budget by a
 * factor of four and would then be exploded back to exactly this level anyway.
 */
function topRows(tree) {
  let n = tree
  /* THE GROUND IS PICKED UP ON THE WAY DOWN. The wrappers being skipped are the only
     thing carrying the page's own background — on the species page it is the second
     of them, at `#e7f0ea` — and dropping them meant the screen frame kept the near
     white constant this script used to hardcode, so every push sat on a paler ground
     than the app it was copied from. */
  let ground = null
  while ((n.children || []).length === 1) {
    if (n.bg) ground = n.bg
    n = n.children[0]
  }
  if (n.bg) ground = n.bg
  return { rows: n.children || [], ground }
}

const { rows, ground: pageBg } = topRows(doc.tree)
if (!rows.length) throw new Error(`${IN}: the captured tree has no children to split`)

/** The screen frame's fill, as an RGB triple in Figma's 0–1 space. */
const frameFill = (() => {
  const hex = (pageBg && pageBg.hex) || '#f4f7f3'
  const v = hex.replace('#', '')
  return [0, 2, 4].map((i) => (parseInt(v.slice(i, i + 2), 16) / 255).toFixed(4))
})()

/* THE GROUND IS PULLED OUT AND PUSHED FIRST, where the page has one. It is a
   full-bleed wash behind everything, so it must be the bottom layer in paint
   order — and it is pushed as its own script so the sections above it can be
   re-pushed without disturbing it. A page without one simply skips the script. */
const find = (n, pred) => {
  if (pred(n)) return n
  for (const c of n.children || []) { const r = find(c, pred); if (r) return r }
  return null
}
const ground = find(doc.tree, (n) => n.name === 'div.page-ground')

const placed = rows.filter((r) => r !== ground).flatMap((r) => units(r))
if (!placed.length) throw new Error(`${IN}: nothing to place`)

/**
 * The frame's height is the CONTENT's extent, not the capture viewport's.
 *
 * `extract-dom.mjs` is run at a deliberately tall viewport so internally-scrolled
 * regions — the sidebar's module list, chiefly — report their natural size rather
 * than their clipped one. That height is a measurement instrument, not a page
 * height: the species page captured at 5,200 is 1,887 of content and 3,313 of
 * nothing, and a frame built to the viewport would be two thirds empty. Measured
 * over the units actually placed, so the root wrappers that span the viewport by
 * construction cannot contribute.
 */
const extent = Math.ceil(Math.max(...placed.map((n) => n.y + n.h), ground ? ground.y + ground.h : 0))
const height = Math.min(extent, doc.height)
const width = doc.width

/* ── pack ────────────────────────────────────────────────────────────────── */

/** A readable file-name stem for a chunk, from whatever it happens to start with. */
const slugOf = (n) => {
  const raw = (n.name || n.tag || 'section')
    .replace(/^(div|section|header|footer|main|nav|ul|li|span)\.?/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return raw || 'section'
}

const chunks = []
let current = null
for (const n of placed) {
  const s = sizeOf(n)
  /* +2 for the comma and the array brackets the payload is wrapped in. */
  if (current && current.size + s + 2 <= BUDGET) {
    current.nodes.push(n)
    current.size += s + 2
  } else {
    current = { nodes: [n], size: s + 2, name: slugOf(n) }
    chunks.push(current)
  }
}

/* Two chunks that begin with the same kind of block would write the same file
   name and the second would overwrite the first. */
const seen = new Map()
for (const c of chunks) {
  const n = (seen.get(c.name) ?? 0) + 1
  seen.set(c.name, n)
  if (n > 1) c.name = `${c.name}-${n}`
}

/* ── emit ────────────────────────────────────────────────────────────────── */

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const setup = `
/* ANTZ Command Centre — ${FRAME}. Creates the screen frame the section scripts
   append into. Re-runnable: an existing frame of the same name is cleared rather
   than duplicated. */
const page = figma.root.children.find(p => p.name === ${JSON.stringify(PAGE)})
if (!page) throw new Error('page not found: ${PAGE}')
await figma.setCurrentPageAsync(page)

let root = page.children.find(c => c.name === ${JSON.stringify(FRAME)})
if (root) root.remove()

root = figma.createFrame()
root.name = ${JSON.stringify(FRAME)}
root.resize(${r1(width)}, ${r1(height)})
root.layoutMode = 'NONE'
root.clipsContent = true
root.fills = [{ type: 'SOLID', color: { r: ${frameFill[0]}, g: ${frameFill[1]}, b: ${frameFill[2]} } }]

/* Clear of anything already on the page, per the position-away-from-origin rule. */
let x = 0
for (const c of page.children) if (c !== root) x = Math.max(x, c.x + c.width + 200)
root.x = x
root.y = 0

return { createdNodeIds: [root.id], frame: ${JSON.stringify(FRAME)}, x: root.x, width: root.width, height: root.height }
`.trim()
writeFileSync(resolve(OUT, '00-setup.js'), setup)

let i = 1
if (ground) {
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
  writeFileSync(resolve(OUT, `${String(i++).padStart(2, '0')}-ground.js`), groundScript)
}

for (const c of chunks) {
  const num = String(i++).padStart(2, '0')
  const body = `
${PRELUDE}
const { root } = await screen(${JSON.stringify(PAGE)}, ${JSON.stringify(FRAME)})
const DATA = ${JSON.stringify(c.nodes.map(compact))}
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
return { section: ${JSON.stringify(c.name)}, createdNodeIds: made }
`.trim()
  writeFileSync(resolve(OUT, `${num}-${c.name}.js`), body)
}

writeFileSync(
  resolve(OUT, 'manifest.json'),
  JSON.stringify({ page: PAGE, frame: FRAME, source: IN, width, height, chunks: chunks.length }, null, 2),
)

console.log(`${IN}\n  → ${FRAME}   ${width}×${height}   ${placed.length} unit(s) in ${chunks.length} chunk(s)\n`)
for (const f of readdirSync(OUT).sort()) {
  const kb = (readFileSync(resolve(OUT, f), 'utf8').length / 1024).toFixed(1)
  const over = f.endsWith('.js') && readFileSync(resolve(OUT, f), 'utf8').length > CAP ? '  OVER CAP' : ''
  console.log(`  ${f.padEnd(34)} ${kb.padStart(7)}KB${over}`)
}
if (oversize.length) {
  console.log(`\n  ${oversize.length} leaf node(s) exceed the ${BUDGET}-char budget on their own:`)
  for (const n of oversize) console.log(`    ${n.name || n.tag} ${Math.round(n.w)}×${Math.round(n.h)} — ${sizeOf(n)} chars`)
}
}
