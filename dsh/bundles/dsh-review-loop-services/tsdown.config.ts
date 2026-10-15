/** Historical filename; public Rolldown options consumed by scripts/build.mjs, not tsdown. */
export default [
  {
    input: 'src/index.ts',
    platform: 'node',
    external: (id: string) => !id.startsWith('.') && !id.startsWith('/'),
    transform: { target: 'es2022' },
    output: { file: 'lib/index.mjs', format: 'esm' },
  },
  {
    input: 'src/client/review-panel.tsx',
    platform: 'browser',
    external: (id: string) => !id.startsWith('.') && !id.startsWith('/'),
    // Classic JSX with the public React bridge; no source behavior rewrite or jsx-runtime request.
    transform: { target: 'es2022', jsx: 'react', inject: { React: ['react', '*'] } },
    output: {
      file: 'lib/client.js', format: 'cjs',
      banner: 'window.__ModuleLoader__.load({ id: "@local/dsh-review-loop-services", factory: (require) => {',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
]
