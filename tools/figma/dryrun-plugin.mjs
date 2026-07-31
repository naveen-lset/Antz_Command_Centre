/**
 * Runs plugin/code.js against the mock with the MCP-only conveniences REMOVED,
 * which is what the real Figma plugin sandbox looks like. Proves the SET /
 * createAutoLayout / RESCALE shims carry the build.
 *
 *   node tools/figma/dryrun-plugin.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { HERE } from './paths.mjs'
import { figma as base } from './mock-figma.mjs'

// Strip the sandbox-only helpers so the shims have to do the work.
delete base.createAutoLayout

const nodesById = new Map()
const origCreate = {}
for (const k of ['createFrame', 'createText', 'createRectangle', 'createEllipse', 'createVector']) {
  origCreate[k] = base[k]
  base[k] = (...a) => {
    const n = origCreate[k](...a)
    nodesById.set(n.id, n)
    return n
  }
}

const figma = {
  ...base,
  getNodeById: (id) => nodesById.get(id) || null,
  viewport: { scrollAndZoomIntoView: () => {} },
  closePlugin: (msg) => { figma.__closed = msg },
}
Object.defineProperty(figma, 'currentPage', {
  get: () => base.currentPage,
  set: (v) => { base.currentPage = v },
})

const src = readFileSync(resolve(HERE, 'plugin/code.js'), 'utf8')
// Return the build report instead of ending at closePlugin.
const body = src.replace(/main\(\)\n\s*\.then[\s\S]*$/, 'return await main()')

try {
  const fn = new Function('figma', `return (async () => {\n${body}\n})()`)
  const made = await fn(figma)
  console.log(`  built ${made.length} frames\n`)
  for (const m of made) {
    console.log(`  ${String(m.name).padEnd(34)} frame 390x844   content h=${m.content}`)
  }
  const bad = made.filter((m) => !m.content || m.content < 800)
  console.log(`\n${made.length} screens; ${bad.length} suspicious`)
  if (bad.length) { console.log(bad); process.exit(1) }
} catch (e) {
  console.error('FAILED:', e.message)
  console.error((e.stack || '').split('\n').slice(1, 4).join('\n'))
  process.exit(1)
}
