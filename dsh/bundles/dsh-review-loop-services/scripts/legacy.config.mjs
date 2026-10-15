import { resolve } from 'node:path'
import { toolPath } from './tooling.mjs'
// Borrow only the test runner; SDK imports retain normal canonical resolution.
export default {
  test: { environment: 'node', include: ['tests/review-loop.spec.ts'], alias: { vitest: resolve(toolPath('vitest/package.json'), '../dist/index.js') } },
}
