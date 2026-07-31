/** Shared path roots so every driver works from a checkout, not a scratchpad. */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(HERE, '../..')
export const OUT = resolve(HERE, 'out')
export const LUCIDE_ESM = resolve(ROOT, 'node_modules/lucide-react/dist/esm')
