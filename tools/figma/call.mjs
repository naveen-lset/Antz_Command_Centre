/**
 * Ad-hoc `use_figma` call against the remote Figma MCP server.
 *   node tools/figma/call.mjs <script.js> [fileKey] [description]
 * Auth reuses the Figma OAuth token in the Claude Code login keychain; never printed.
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

export const DEFAULT_FILE = 'LyhE0YVJFactktZoIgNlxV'
const ENDPOINT = 'https://mcp.figma.com/mcp'

export function token() {
  const raw = execFileSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf8' })
  const store = JSON.parse(raw).mcpOAuth || {}
  for (const [k, v] of Object.entries(store)) if (/figma/i.test(k) && v && v.accessToken) return v.accessToken
  throw new Error('No Figma access token in the Claude Code keychain entry')
}

let id = 0
export async function rpc(method, params, tok = token()) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  })
  const text = await res.text()
  const frame = text.split('data: ').filter((x) => x.trim().startsWith('{')).pop()
  if (!frame) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`)
  const msg = JSON.parse(frame)
  if (msg.error) throw new Error(`${method}: ${JSON.stringify(msg.error).slice(0, 600)}`)
  return msg.result
}

export async function useFigma(code, { fileKey = DEFAULT_FILE, description = 'ANTZ push' } = {}) {
  if (code.length > 50000) throw new Error(`code is ${code.length} chars, cap is 50000`)
  const r = await rpc('tools/call', {
    name: 'use_figma',
    arguments: { fileKey, code, description, skillNames: 'figma-use' },
  })
  return { isError: !!r.isError, text: (r.content || []).map((c) => c.text || '').join('\n') }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = readFileSync(process.argv[2], 'utf8')
  const r = await useFigma(code, { fileKey: process.argv[3] || DEFAULT_FILE, description: process.argv[4] || 'ANTZ push' })
  console.log(r.isError ? 'ERROR' : 'OK')
  console.log(r.text.slice(0, 4000))
}
