/**
 * Uploads every <img> the capture found and sets it as a correctly-cropped fill.
 *
 *   node tools/figma/push-images.mjs
 *
 * TWO THINGS THE OBVIOUS VERSION GETS WRONG.
 *
 * WebP uploads "successfully" and renders as nothing. `upload_assets` accepts the
 * bytes, returns an imageHash and reports `placedOnNodeId`, and the node ends up
 * with a valid IMAGE paint — which never decodes. Everything is converted to PNG
 * before upload for that reason; the failure is silent and looks like a z-order
 * bug for as long as you are willing to believe the success response.
 *
 * `scaleMode: 'FILL'` is not `object-fit: cover`. FILL always centres, so a
 * bottom-anchored hero (`object-position: 50% 100%`) loses the ground and keeps
 * the sky. Anchoring needs `scaleMode: 'CROP'` plus an imageTransform computed
 * from the real object-position, which is what `cropMatrix` below does.
 */
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, basename } from 'node:path'
import { HERE, ROOT } from './paths.mjs'
import { rpc, useFigma, DEFAULT_FILE } from './call.mjs'
import { PAGE, FRAME } from './build-dom-scripts.mjs'

const TMP = process.env.TMPDIR || '/tmp'
const doc = JSON.parse(readFileSync(resolve(HERE, 'antz-dom.json'), 'utf8'))

/* ── collect the images in capture order ─────────────────────────────────── */
const imgs = []
;(function walk(n) { if (n.kind === 'image') imgs.push(n); (n.children || []).forEach(walk) })(doc.tree)
if (!imgs.length) { console.log('no images in the capture'); process.exit(0) }

/* ── resolve the served URL back to a file on disk ───────────────────────── */
function sourceFile(src) {
  const name = decodeURIComponent(new URL(src).pathname.split('/').pop())
  /* Vite serves assets from src/ with a content hash appended in build, but in dev
     the basename is intact — match on the stem so both shapes resolve. */
  const stem = name.replace(/-[A-Za-z0-9_]{8,}(?=\.[a-z0-9]+$)/, '')
  for (const dir of ['src/assets', 'public', 'public/data', 'src']) {
    const p = resolve(ROOT, dir, stem)
    if (existsSync(p)) return p
  }
  return null
}

/** Anything that is not already PNG/JPEG goes through sips — see the note above. */
function asPng(file) {
  if (/\.(png|jpe?g)$/i.test(file)) return { file, type: /\.png$/i.test(file) ? 'image/png' : 'image/jpeg' }
  const out = resolve(TMP, basename(file).replace(/\.[a-z0-9]+$/i, '') + '.png')
  execFileSync('sips', ['-s', 'format', 'png', file, '--out', out], { stdio: 'ignore' })
  return { file: out, type: 'image/png' }
}

const dims = (file) => {
  const o = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' })
  return { w: Number(o.match(/pixelWidth:\s*(\d+)/)[1]), h: Number(o.match(/pixelHeight:\s*(\d+)/)[1]) }
}

/**
 * CSS object-fit/object-position → Figma CROP imageTransform.
 * The matrix rows are [xScale, 0, xOffset] and [0, yScale, yOffset], where the
 * scales are the fraction of the source that stays visible and the offsets are
 * the crop's top-left corner in normalised image space.
 */
function cropMatrix({ boxW, boxH, imgW, imgH, fit, pos }) {
  const [px, py] = (pos || '50% 50%').split(/\s+/).map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5))
  const boxAR = boxW / boxH
  const imgAR = imgW / imgH
  let fw = 1, fh = 1
  if (fit === 'cover' || fit === undefined) {
    if (imgAR > boxAR) fw = boxAR / imgAR   // source is wider — trim the sides
    else fh = imgAR / boxAR                 // source is taller — trim top/bottom
  } else if (fit === 'contain') {
    return [[1, 0, 0], [0, 1, 0]]           // nothing is cropped; FIT would letterbox
  }
  return [[fw, 0, (1 - fw) * px], [0, fh, (1 - fh) * py]]
}

/* ── locate the placeholders in the file ─────────────────────────────────── */
const locate = `
const page = figma.root.children.find(p => p.name === ${JSON.stringify(PAGE)})
await figma.setCurrentPageAsync(page)
const root = page.children.find(c => c.name === ${JSON.stringify(FRAME)})
if (!root) throw new Error('frame not found')
return root.query('RECTANGLE[name^=IMAGE]').values(['id', 'name', 'width', 'height'])
`
const nodes = JSON.parse((await useFigma(locate, { description: 'locate image placeholders' })).text)
console.log(`${nodes.length} placeholder(s), ${imgs.length} captured image(s)\n`)

/* ── upload and set each fill ────────────────────────────────────────────── */
const applied = []
for (let i = 0; i < Math.min(nodes.length, imgs.length); i++) {
  const node = nodes[i]
  const meta = imgs[i]
  const src = sourceFile(meta.src)
  if (!src) { console.log(`  skip ${node.name} — no local file for ${meta.src}`); continue }

  const { file, type } = asPng(src)
  const size = dims(file)

  const u = await rpc('tools/call', { name: 'upload_assets', arguments: { fileKey: DEFAULT_FILE, count: 1 } })
  const submitUrl = JSON.parse((u.content || []).map((c) => c.text || '').join('\n')).uploads[0].submitUrl

  const form = new FormData()
  form.append('file', new Blob([readFileSync(file)], { type }), basename(file))
  const res = await fetch(submitUrl, { method: 'POST', body: form })
  const out = await res.json()
  if (!out.imageHash) { console.log(`  FAIL ${node.name} — ${JSON.stringify(out).slice(0, 200)}`); continue }

  const m = cropMatrix({ boxW: node.width, boxH: node.height, imgW: size.w, imgH: size.h, fit: meta.fit, pos: meta.pos })
  applied.push({ id: node.id, hash: out.imageHash, m, name: basename(src) })
  console.log(`  ok   ${node.name.padEnd(16)} ${basename(src)} ${size.w}×${size.h} → ${node.width}×${node.height} ${meta.fit}/${meta.pos}`)
}

if (!applied.length) { console.log('\nnothing to apply'); process.exit(1) }

const setFills = `
const page = figma.root.children.find(p => p.name === ${JSON.stringify(PAGE)})
await figma.setCurrentPageAsync(page)
const spec = ${JSON.stringify(applied)}
const done = []
for (const s of spec) {
  const n = await figma.getNodeByIdAsync(s.id)
  if (!n) continue
  n.fills = [{ type: 'IMAGE', scaleMode: 'CROP', imageHash: s.hash, imageTransform: s.m }]
  n.name = s.name
  done.push(n.id)
}
return { mutatedNodeIds: done }
`
const r = await useFigma(setFills, { description: 'set cropped image fills on the hero artwork' })
console.log(`\n${r.isError ? 'FAIL' : 'applied'} ${r.text.slice(0, 200)}`)
