import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'

export const packageDir = fileURLToPath(new URL('../', import.meta.url))
export const localRequire = createRequire(new URL('../package.json', import.meta.url))
const root = resolve(packageDir, '../../..')
const frontendRequire = createRequire(resolve(root, 'services/frontend/package.json'))
export function toolPath(name) {
  for (const require of [localRequire, frontendRequire]) {
    try { return require.resolve(name) } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error }
  }
  throw new Error(`Missing local build tool ${name}; provide it in this package or the EqSiteCMS frontend/root toolchain (no automatic installs).`)
}
export const importTool = (name) => import(pathToFileURL(toolPath(name)).href)
export function reactTypes() {
  const path = toolPath('@types/react/package.json')
  const metadata = createRequire(import.meta.url)(path)
  console.log(`React declarations: ${metadata.version} (${path}); renderer SDK declares React 18, frontend fallback may be React 19; this is not React-18-specific proof.`)
  return resolve(dirname(path), 'index.d.ts')
}
export function canonicalNodeTypes() {
  const path = localRequire.resolve('@types/node/package.json')
  if (!existsSync(path)) throw new Error('Canonical Node types unavailable')
  return resolve(dirname(path), '..')
}
