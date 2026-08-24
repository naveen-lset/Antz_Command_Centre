/**
 * Pushes out-dom/*.js into the Figma file, in order, stopping at the first
 * failure — a section built on a missing screen frame just produces more noise.
 *
 *   node tools/figma/push-dom.mjs            # all scripts
 *   node tools/figma/push-dom.mjs 00 01      # only the named ones
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { HERE } from './paths.mjs'
import { useFigma, DEFAULT_FILE } from './call.mjs'
import { manifest } from './build-dom-scripts.mjs'

const OUT = resolve(HERE, 'out-dom')
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const files = readdirSync(OUT).filter((f) => f.endsWith('.js')).sort()
  .filter((f) => !only.length || only.some((p) => f.startsWith(p)))

/* A FILTER THAT MATCHES NOTHING IS A FAILED RUN, not an empty success. `ok ===
   files.length` is `0 === 0` for a mistyped prefix, so the script exited 0 having
   pushed nothing and the caller had no way to tell that from a clean push. */
if (!files.length) {
  console.log(only.length ? `no script matches ${only.join(', ')}` : `nothing in ${OUT}`)
  process.exit(1)
}

const { frame } = manifest()
console.log(`file ${DEFAULT_FILE} · ${frame} · ${files.length} script(s)\n`)
let ok = 0
for (const f of files) {
  const code = readFileSync(resolve(OUT, f), 'utf8')
  const kb = (code.length / 1024).toFixed(1) + 'KB'
  try {
    const r = await useFigma(code, { description: `ANTZ — ${frame}: ${f.replace(/^\d+-|\.js$/g, '')} as native Figma layers` })
    const txt = r.text.replace(/\s+/g, ' ').slice(0, 240)
    const bad = r.isError || /\berror\b|exception|failed/i.test(txt)
    console.log(`  ${bad ? 'FAIL' : 'ok  '} ${f.padEnd(30)} ${kb.padStart(8)}  ${txt}`)
    if (bad) break
    ok++
  } catch (e) {
    console.log(`  FAIL ${f.padEnd(30)} ${kb.padStart(8)}  ${e.message}`)
    break
  }
}
console.log(`\n${ok}/${files.length} pushed`)
process.exit(ok === files.length ? 0 : 1)
