/**
 * Pushes the ANTZ screens straight into Figma via the remote Figma MCP server's
 * `use_figma` tool — no plugin, no manifest, no manual step.
 *
 *   node tools/figma/push.mjs                 # setup + home + all 14 detail pages
 *   node tools/figma/push.mjs 00 01           # only the named scripts
 *
 * Auth reuses the Figma OAuth token Claude Code already holds in the login
 * keychain. The token is never printed.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { OUT, ROOT } from './paths.mjs'

const FILE_KEY = 'WvxVp4VXLXD5JwMFlYehjR'
const ENDPOINT = 'https://mcp.figma.com/mcp'
const MAX_CODE = 50000

const esbuild = await import(pathToFileURL(resolve(ROOT, 'node_modules/esbuild/lib/main.js')).href)

/* ── token from the Claude Code login keychain ───────────────────────────── */
function token() {
  const raw = execFileSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf8' })
  const store = JSON.parse(raw).mcpOAuth || {}
  for (const [k, v] of Object.entries(store)) {
    if (/figma/i.test(k) && v && v.accessToken) return v.accessToken
  }
  throw new Error('No Figma access token found in the Claude Code keychain entry')
}
const TOKEN = token()

/* ── MCP call ────────────────────────────────────────────────────────────── */
let id = 0
async function rpc(method, params) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  })
  const text = await res.text()
  // Streamable HTTP replies as SSE; the JSON payload is the last `data:` frame.
  const frame = text.split('data: ').filter((x) => x.trim().startsWith('{')).pop()
  if (!frame) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`)
  const msg = JSON.parse(frame)
  if (msg.error) throw new Error(`${method}: ${JSON.stringify(msg.error).slice(0, 400)}`)
  return msg.result
}

/** Squeeze a script under the tool's 50K `code` cap without changing semantics. */
async function shrink(src, name) {
  if (src.length <= MAX_CODE) return src
  // The scripts use top-level `return`/`await` (the use_figma execution shape),
  // which ESM parsing rejects — minify inside an async wrapper, then strip it.
  const wrapped = `async function __antz__() {\n${src}\n}`
  const r = await esbuild.transform(wrapped, { loader: 'js', minify: true, target: 'es2020' })
  let out = r.code.trim()
  const m = out.match(/^async function __antz__\(\)\{([\s\S]*)\};?$/)
  if (!m) throw new Error(`${name}: unexpected minifier output shape`)
  out = m[1]
  if (out.length > MAX_CODE) throw new Error(`${name}: ${out.length} chars after minify, cap is ${MAX_CODE}`)
  return out
}

/* ── run ─────────────────────────────────────────────────────────────────── */
const only = process.argv.slice(2)
const files = readdirSync(OUT).filter((f) => f.endsWith('.js')).sort()
  .filter((f) => !only.length || only.some((p) => f.startsWith(p)))

console.log(`file ${FILE_KEY} · ${files.length} script(s)\n`)

const results = []
for (const f of files) {
  const raw = readFileSync(resolve(OUT, f), 'utf8')
  let code
  try {
    code = await shrink(raw, f)
  } catch (e) {
    console.log(`  FAIL ${f.padEnd(20)} ${e.message}`)
    results.push({ f, error: e.message })
    continue
  }
  const note = code.length === raw.length ? `${(raw.length / 1024).toFixed(0)}KB` : `${(raw.length / 1024).toFixed(0)}→${(code.length / 1024).toFixed(0)}KB`
  try {
    const r = await rpc('tools/call', {
      name: 'use_figma',
      arguments: {
        fileKey: FILE_KEY,
        code,
        description: `ANTZ Command Centre — build ${f.replace(/^\d+-|\.js$/g, '')} as native auto-layout Figma layers`,
        skillNames: 'figma-use',
      },
    })
    const txt = (r.content || []).map((c) => c.text || '').join(' ').replace(/\s+/g, ' ')
    const bad = r.isError || /error|failed|exception/i.test(txt.slice(0, 200))
    console.log(`  ${bad ? 'FAIL' : 'ok  '} ${f.padEnd(20)} ${note.padStart(11)}  ${txt.slice(0, 220)}`)
    results.push({ f, ok: !bad, txt })
    if (bad) break // don't pile 14 more failures on a broken foundation
  } catch (e) {
    console.log(`  FAIL ${f.padEnd(20)} ${note.padStart(11)}  ${e.message}`)
    results.push({ f, error: e.message })
    break
  }
}

const ok = results.filter((r) => r.ok).length
console.log(`\n${ok}/${files.length} pushed`)
if (ok !== files.length) process.exit(1)
