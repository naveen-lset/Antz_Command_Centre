/**
 * Removes all frames from the generated page so a corrected push starts clean.
 * Variables and every other page are untouched.
 *
 *   node tools/figma/clean.mjs
 */
import { execFileSync } from 'node:child_process'

const FILE_KEY = 'WvxVp4VXLXD5JwMFlYehjR'
const ENDPOINT = 'https://mcp.figma.com/mcp'
const PAGE_NAME = 'ANTZ — Command Centre (from code)'

function token() {
  const raw = execFileSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf8' })
  const store = JSON.parse(raw).mcpOAuth || {}
  for (const [k, v] of Object.entries(store)) if (/figma/i.test(k) && v && v.accessToken) return v.accessToken
  throw new Error('No Figma token')
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: {
      name: 'use_figma',
      arguments: {
        fileKey: FILE_KEY,
        description: 'Remove previously generated ANTZ frames so the corrected build starts clean',
        skillNames: 'figma-use',
        code: `
const page = figma.root.children.find((p) => p.name === ${JSON.stringify(PAGE_NAME)})
if (!page) return { removed: 0, note: 'page missing' }
await figma.setCurrentPageAsync(page)
const removed = []
for (const n of [...page.children]) { removed.push(n.name); n.remove() }
return { removed: removed.length, names: removed }
`,
      },
    },
  }),
})
const text = await res.text()
const frame = text.split('data: ').filter((x) => x.trim().startsWith('{')).pop()
console.log(frame ? JSON.stringify(JSON.parse(frame).result?.content?.[0] ?? JSON.parse(frame), null, 0).slice(0, 400) : text.slice(0, 300))
