/**
 * Extracts the live ANTZ page data (home + 14 detail pages) to plain JSON so the
 * Figma builder renders from exactly the same source of truth as the app.
 *
 * lucide-react is stubbed so `icon: PawPrint` serializes as the string "PawPrint".
 *
 *   node tools/figma/extract-data.mjs   →  tools/figma/antz-data.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { HERE, ROOT } from './paths.mjs'

const esbuild = await import(pathToFileURL(resolve(ROOT, 'node_modules/esbuild/lib/main.js')).href)

const SOURCES = [
  'src/v3/data.ts',
  'src/detail/pages/animals.ts',
  'src/detail/pages/breeding.ts',
  'src/detail/pages/medical.ts',
  'src/detail/pages/operations.ts',
]

// Named imports need real named exports, so emit an explicit shim per icon used.
const lucideNames = new Set()
for (const file of SOURCES) {
  const src = readFileSync(resolve(ROOT, file), 'utf8')
  const m = src.match(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/)
  if (m) {
    for (const raw of m[1].split(',')) {
      const t = raw.trim()
      if (t && t !== 'type LucideIcon') lucideNames.add(t)
    }
  }
}

const stub = {
  name: 'lucide-stub',
  setup(build) {
    build.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide', namespace: 'stub' }))
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: [...lucideNames].map((n) => `export const ${n} = ${JSON.stringify(n)};`).join('\n'),
      loader: 'js',
    }))
  },
}

const entry = `
import { site, hero, mainPair, dailyUpdates, welfare, moduleCards, moreModules } from '${resolve(ROOT, 'src/v3/data.ts')}'
import { detailPages } from '${resolve(ROOT, 'src/detail/pages/index.ts')}'
export const payload = {
  home: { site, hero, mainPair, dailyUpdates, welfare, moduleCards, moreModules },
  pages: detailPages,
}
`

const result = await esbuild.build({
  stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  plugins: [stub],
})

const tmp = resolve(HERE, '_bundle.mjs')
writeFileSync(tmp, result.outputFiles[0].text)
const { payload } = await import(pathToFileURL(tmp).href)
writeFileSync(resolve(HERE, 'antz-data.json'), JSON.stringify(payload, null, 2))

const kinds = {}
for (const p of payload.pages) for (const s of p.sections) kinds[s.kind] = (kinds[s.kind] ?? 0) + 1
console.log(JSON.stringify({
  pages: payload.pages.length,
  slugs: payload.pages.map((p) => p.slug),
  sectionKinds: kinds,
  totalSections: payload.pages.reduce((n, p) => n + p.sections.length, 0),
}, null, 2))
