import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { packageDir, localRequire, toolPath } from './tooling.mjs'

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: packageDir, stdio: 'inherit' })
  if (result.error) throw result.error
  return result.status ?? 1
}
assert.equal(run(['scripts/build.mjs']), 0, 'production build and full typecheck')
const nodeTests = run(['scripts/test.mjs'])
const legacyTests = run(['scripts/test.mjs', '--legacy'])
for (const file of ['lib/index.mjs', 'lib/client.js']) assert.equal(run(['--check', file]), 0, `syntax: ${file}`)
const manifest = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'))
for (const entry of Object.values(manifest.exports)) {
  for (const file of typeof entry === 'string' ? [entry] : Object.values(entry)) assert.ok(existsSync(resolve(packageDir, file)), `export exists: ${file}`)
}
const ancestorRequire = createRequire(resolve(packageDir, '../../package.json'))
for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/dsh-llm']) {
  assert.equal(realpathSync(localRequire.resolve(name)), realpathSync(ancestorRequire.resolve(name)), `canonical SDK: ${name}`)
}
const host = await import(pathToFileURL(resolve(packageDir, 'lib/index.mjs')).href)
assert.equal(typeof host.apply, 'function')
let registration
vm.runInNewContext(readFileSync(resolve(packageDir, 'lib/client.js'), 'utf8'), {
  window: { __ModuleLoader__: { load: entry => { assert.equal(registration, undefined); registration = entry } } },
}, { filename: 'lib/client.js' })
assert.equal(registration.id, manifest.name)
const requests = []
const client = registration.factory(name => {
  requests.push(name)
  assert.equal(name, 'react', 'only the public React bridge is requested')
  return localRequire(toolPath('react'))
})
assert.deepEqual(requests, ['react'])
assert.equal(typeof client.apply, 'function')
assert.equal(typeof client.ReviewPanel, 'function')
console.log('PASS: exported paths, canonical Host production import, fresh Client loader id, React-only public factory, both artifact syntax checks')
for (const file of ['lib/index.mjs', 'lib/client.js', 'lib/index.d.mts']) {
  console.log(`SHA256 ${file} ${createHash('sha256').update(readFileSync(resolve(packageDir, file))).digest('hex')}`)
}
process.exitCode = nodeTests || legacyTests
