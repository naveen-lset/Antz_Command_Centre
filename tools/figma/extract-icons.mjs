/**
 * Extracts lucide 24x24 icon geometry for every icon the app uses, so the Figma
 * build draws real vectors instead of placeholder squares.
 *
 *   node tools/figma/extract-icons.mjs   →  tools/figma/antz-icons.json
 *
 * Shape: { <ExportName>: [ ["circle"|"path"|"rect"|…, {attrs}], … ] }
 * All lucide icons are stroke-only on a 24x24 grid, round caps and joins.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { HERE, ROOT, LUCIDE_ESM } from './paths.mjs'

// 1. every icon name imported anywhere in src/
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  )

const names = new Set()
for (const file of walk(resolve(ROOT, 'src'))) {
  if (!/\.(ts|tsx)$/.test(file)) continue
  const src = readFileSync(file, 'utf8')
  const re = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g
  let m
  while ((m = re.exec(src))) {
    for (const raw of m[1].split(',')) {
      const t = raw.trim().replace(/^type\s+/, '')
      if (t && t !== 'LucideIcon' && /^[A-Z]/.test(t)) names.add(t)
    }
  }
}

// 2. export name -> icon module, from the barrel
const barrel = readFileSync(`${LUCIDE_ESM}/lucide-react.mjs`, 'utf8')
const fileFor = {}
for (const line of barrel.split('\n')) {
  const src = line.match(/from\s+'\.\/icons\/([^']+)'/)
  if (!src) continue
  for (const m of line.matchAll(/default as (\w+)/g)) fileFor[m[1]] = src[1]
}

// 3. read each icon's __iconNode
const icons = {}
const missing = []
for (const name of [...names].sort()) {
  const file = fileFor[name]
  if (!file) { missing.push(name); continue }
  const src = readFileSync(`${LUCIDE_ESM}/icons/${file}`, 'utf8')
  const body = src.match(/const __iconNode = (\[[\s\S]*?\]);/)
  if (!body) { missing.push(name); continue }
  // The array is plain JS with unquoted keys — evaluate it in isolation.
  const nodes = new Function(`return ${body[1]}`)()
  icons[name] = nodes.map(([tag, attrs]) => {
    const { key, ...rest } = attrs
    return [tag, rest]
  })
}

writeFileSync(resolve(HERE, 'antz-icons.json'), JSON.stringify(icons, null, 2))
console.log(JSON.stringify({
  count: Object.keys(icons).length,
  icons: Object.keys(icons),
  missing,
  tags: [...new Set(Object.values(icons).flat().map(([t]) => t))],
}, null, 2))
