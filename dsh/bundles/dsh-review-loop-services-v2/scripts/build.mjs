import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { importTool, packageDir } from './tooling.mjs'
import { typecheck } from './typecheck.mjs'
import configs from '../tsdown.config.ts'

// Check the whole actual source before replacing production artifacts.
await typecheck(true)
const { build } = await importTool('rolldown')
mkdirSync(resolve(packageDir, 'lib'), { recursive: true })
for (const config of configs) {
  await build({ ...config, cwd: packageDir, output: { ...config.output, file: resolve(packageDir, config.output.file) } })
}
writeFileSync(resolve(packageDir, 'lib/index.d.mts'), '// Generated from actual source by TypeScript; includes feedback source augmentation.\nexport * from "./types/index.js";\n')
console.log('Built fresh Host ESM, classic-JSX Client factory, and source declarations.')
