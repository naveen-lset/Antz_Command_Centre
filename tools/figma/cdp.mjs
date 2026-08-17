/**
 * Minimal CDP driver shared by the desktop snapshot and the DOM extractor.
 * Headless Chrome's OS window minimum is 500px, so any viewport — desktop or
 * phone — comes from Emulation.setDeviceMetricsOverride, never --window-size.
 */
import { spawn } from 'node:child_process'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function open({ port = 9342, width = 1440, height = 900, scale = 2, url }) {
  const chrome = spawn(
    CHROME,
    ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--hide-scrollbars', '--window-size=1600,1000', 'about:blank'],
    { stdio: 'ignore' },
  )

  let target
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
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

  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id
      pend.set(i, (m) => (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)))
      ws.send(JSON.stringify({ id: i, method, params }))
    })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false })
  /* THE ONE SETTING THAT MAKES A CAPTURE HONEST. `Reveal` gates on
     `inView || prefersReducedMotion` and `useCountUp` initialises to the target
     under the same query, so emulating it lands every section at full opacity and
     every figure at its final value — instead of a page of half-faded cards
     reading "0K". Set before navigate so the initialisers see it on first render. */
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await send('Page.navigate', { url })
  await sleep(3000)

  /** Evaluate a function body in the page and return its JSON value. */
  const evalJS = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'page eval threw')
    return r.result.value
  }

  const close = () => { try { ws.close() } catch {} ; chrome.kill() }
  return { send, evalJS, close, sleep }
}

/**
 * `Reveal` is scroll-gated — sections below the fold read back as opacity 0 and
 * never lay out — so every capture walks the page down in viewport steps and
 * waits at each stop before measuring.
 */
export async function scrollThrough(evalJS, step = 700, pause = 260) {
  const h = await evalJS('document.documentElement.scrollHeight')
  for (let y = 0; y < h; y += step) {
    await evalJS(`window.scrollTo(0, ${y})`)
    await sleep(pause)
  }
  await evalJS('window.scrollTo(0, 0)')
  await sleep(500)
  return h
}
