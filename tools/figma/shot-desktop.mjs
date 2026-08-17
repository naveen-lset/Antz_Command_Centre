/** Full-page desktop screenshot of a route, for diffing against the Figma push. */
import { open, scrollThrough } from './cdp.mjs'
import { writeFileSync } from 'node:fs'
const url = process.argv[2] || 'http://localhost:5202/#/'
const out = process.argv[3] || '/tmp/home-desktop.png'
const width = Number(process.argv[4] || 1440)
const c = await open({ url, width, height: 900, scale: 1 })
await scrollThrough(c.evalJS)
const full = await c.evalJS('document.documentElement.scrollHeight')
await c.send('Emulation.setDeviceMetricsOverride', { width, height: Math.min(full, 12000), deviceScaleFactor: 1, mobile: false })
await c.sleep(1400)
const shot = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
writeFileSync(out, Buffer.from(shot.data, 'base64'))
console.log(`saved ${out} — ${width}×${full}`)
c.close()
