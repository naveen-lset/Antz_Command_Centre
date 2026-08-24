/**
 * Runs every out-dom script against the Plugin API mock before anything touches
 * a real file — the sandbox's error messages are terse and a failed push costs a
 * round trip, so the rules worth enforcing are enforced here.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { HERE } from './paths.mjs'
import { figma, mockState } from './mock-figma.mjs'
import { manifest } from './build-dom-scripts.mjs'

const { page: PAGE, frame: FRAME } = manifest()

const OUT = resolve(HERE, 'out-dom')
mockState.page.name = PAGE

/* The section scripts expect the setup script's frame to exist. */
const seed = new (Object.getPrototypeOf(mockState.page).constructor)('FRAME')
seed.name = FRAME
seed.resize(1440, 2496)
mockState.page.appendChild(seed)

let fail = 0
/* `.js` ONLY. The directory also holds `manifest.json`, and macOS drops a
   `.DS_Store` into any folder Finder has opened — both would be read as source and
   fail the run for a reason that has nothing to do with the scripts. */
for (const f of readdirSync(OUT).filter((f) => f.endsWith('.js')).sort()) {
  const src = readFileSync(resolve(OUT, f), 'utf8')
  try {
    const fn = new Function('figma', `return (async () => {\n${src}\n})()`)
    const r = await fn(figma)
    const made = (r && r.createdNodeIds) || []
    console.log(`  ok   ${f.padEnd(30)} ${String(made.length).padStart(3)} node(s) returned`)
  } catch (e) {
    console.log(`  FAIL ${f.padEnd(30)} ${e.message}`)
    fail++
  }
}
console.log(fail ? `\n${fail} script(s) failed` : '\nall scripts pass the mock')
process.exit(fail ? 1 : 0)
