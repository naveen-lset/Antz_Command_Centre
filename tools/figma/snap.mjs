/**
 * Headless-Chrome screenshot at iPhone metrics.
 *   node tools/figma/snap.mjs <url> <out.png> [heightPx]
 * The OS window minimum is 500px wide, so the 390px viewport comes from CDP
 * Emulation.setDeviceMetricsOverride — never from --window-size.
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9341
const url = process.argv[2] || 'http://localhost:5199/#/'
const out = process.argv[3] || '/tmp/snap.png'
const height = Number(process.argv[4] || 844)

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--hide-scrollbars', '--window-size=500,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let target
for (let i = 0; i < 40; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    target = l.find((x) => x.type === 'page')
    if (target) break
  } catch {}
  await sleep(250)
}
if (!target) { chrome.kill(); throw new Error('no CDP target') }

const ws = new WebSocket(target.webSocketDebuggerUrl)
let id = 0
const pend = new Map()
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
})
await new Promise((r) => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id
  pend.set(i, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)))
  ws.send(JSON.stringify({ id: i, method, params }))
})

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url })
await sleep(2500)
const shot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync(out, Buffer.from(shot.data, 'base64'))
console.log('saved', out)
ws.close()
chrome.kill()
