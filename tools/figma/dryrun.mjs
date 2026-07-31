/**
 * Executes every generated script against the mock Plugin API, so bad property
 * names, NaN path data and FILL/HUG ordering violations surface here rather than
 * as a failed `use_figma` call.
 *
 *   node tools/figma/dryrun.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { OUT } from './paths.mjs'
import { figma } from './mock-figma.mjs'

const files = readdirSync(OUT).filter((f) => f.endsWith('.js')).sort()

let pass = 0
const fails = []
for (const f of files) {
  const src = readFileSync(resolve(OUT, f), 'utf8')
  try {
    const fn = new Function('figma', `return (async () => {\n${src}\n})()`)
    const result = await fn(figma)
    const size = result && result.size ? `${Math.round(result.size[0])}x${Math.round(result.size[1])}` : ''
    console.log(`  ok   ${f.padEnd(20)} ${size.padStart(10)}  ${result && result.name ? result.name : ''}`)
    pass++
  } catch (e) {
    const line = (e.stack || '').split('\n').find((l) => /<anonymous>:\d+/.test(l)) || ''
    console.log(`  FAIL ${f.padEnd(20)} ${e.message}`)
    fails.push({ file: f, message: e.message, at: line.trim() })
  }
}
console.log(`\n${pass}/${files.length} scripts executed cleanly`)
if (fails.length) {
  console.log('\nFailures:')
  for (const x of fails) console.log(`  ${x.file}: ${x.message}\n    ${x.at}`)
  process.exit(1)
}
