import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { importTool, packageDir, reactTypes, canonicalNodeTypes } from './tooling.mjs'

export async function typecheck(emit = false) {
  const { default: ts } = await importTool('typescript')
  const config = ts.readConfigFile(resolve(packageDir, 'tsconfig.json'), ts.sys.readFile)
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, packageDir)
  const react = reactTypes()
  const options = { ...parsed.options, paths: { react: [react], 'react/jsx-runtime': [resolve(react, '../jsx-runtime.d.ts')], 'react/*': [resolve(react, '../*')] }, typeRoots: [canonicalNodeTypes()], noEmit: !emit, declaration: true, emitDeclarationOnly: emit, outDir: resolve(packageDir, 'lib/types') }
  const program = ts.createProgram(parsed.fileNames, options)
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
  if (diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: p => p, getCurrentDirectory: () => packageDir, getNewLine: () => '\n' }))
    throw new Error(`Full source typecheck failed: ${diagnostics.length} diagnostic(s)`)
  }
  if (emit) {
    const result = program.emit()
    if (result.emitSkipped || result.diagnostics.length) throw new Error('Declaration emission failed')
  }
  console.log(`Full source typecheck passed (${parsed.fileNames.length} source files, TypeScript ${ts.version})${emit ? '; declarations emitted' : ''}`)
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await typecheck()
