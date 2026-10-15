import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { packageDir, toolPath } from './tooling.mjs'
export function run(args, env = process.env) {
  const result = spawnSync(process.execPath, args, { cwd: packageDir, stdio: 'inherit', env })
  if (result.error) throw result.error
  return result.status ?? 1
}
if (process.argv.includes('--legacy')) {
  const vitest = resolve(toolPath('vitest/package.json'), '../vitest.mjs')
  const tempRoot = realpathSync(tmpdir())
  const fixtures = mkdtempSync(resolve(tempRoot, 'review-loop-legacy-'))
  try {
    process.exitCode = run([vitest, 'run', '--config', 'scripts/legacy.config.mjs', '--configLoader', 'runner'], { ...process.env, TMPDIR: fixtures })
  } finally {
    // Delete only the exact private fixture directory created above, after path checks.
    if (dirname(fixtures) !== tempRoot || realpathSync(fixtures) !== fixtures || !fixtures.startsWith(resolve(tempRoot, 'review-loop-legacy-'))) throw new Error('Unsafe legacy fixture cleanup path')
    rmSync(fixtures, { recursive: true, force: true })
  }
} else {
  const backend = run(['--experimental-transform-types', '--test', 'tests/workspaces.test.mjs', 'tests/integration.test.mjs'])
  const frontend = run(['--test', 'src/client/review-panel.test.mjs'])
  process.exitCode = backend || frontend
}
