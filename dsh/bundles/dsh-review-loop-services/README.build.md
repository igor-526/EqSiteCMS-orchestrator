# BUILD-RESUME-2 — production artifact checkpoint (partial)

No OpenSpec work, installation, profile changes, server/restart, browser operations, publishing, or commits were performed. Existing upstream plugin was not modified. Source behavior was not rewritten in this unit.

## Identity and installation boundary

- Package: `@local/dsh-review-loop-services@0.1.0-local.1`.
- Patch row: `review-loop-services`; lazy Client factory ID: `@local/dsh-review-loop-services` (fresh, not upstream).
- Future install spec: `/home/igor/projects/eqSiteCMS/dsh/bundles/dsh-review-loop-services`.
- Runtime files: `lib/index.mjs` (Host ESM), `lib/client.js` (public module-loader CJS factory), `lib/index.d.mts` forwarding to newly emitted `lib/types/index.d.ts` and its declaration graph. Every manifest export exists.
- Parent owns any removal/install and subsequent actual GUI/runtime verification. This checkpoint does **not** claim a fully green legacy gate or live success.

## Reproduction (from this package directory)

```sh
node scripts/build.mjs       # same as package build script
node scripts/typecheck.mjs   # same as package typecheck script
node scripts/test.mjs        # same as package test script
node scripts/test.mjs --legacy
node scripts/verify.mjs      # full gate; currently exits 1, intentionally
```

All commands are offline; no install/lifecycle/download is attempted. `build` performs full source typechecking before bundling. `verify` rebuilds, runs the 14 Node tests plus legacy Vitest, checks both artifact syntaxes and all exported paths, imports the actual Host production artifact, verifies canonical SDK resolution, executes the public Client factory with the real borrowed React module, and prints SHA256s. Legacy temporary Git/checkpoint fixtures are contained under one freshly created temporary directory, whose exact absolute path is validated before cleanup. Existing Node tests use their own temporary fixtures.

## Toolchain and limitations

Read-only borrowed tools: Node 24.18.0; TypeScript 5.9.3 from the enclosing root; Rolldown 1.0 and Vitest 4.1.6 from `services/frontend/node_modules`. Resolution checks confirm `@deepseek-ai/cordis` and `@deepseek-ai/dsh-llm` resolve identically to the canonical DSH ancestor. Production Host bare SDK imports remain external; no duplicate SDK classes, production aliases, monkeypatches, or resolution remaps were introduced.

React runtime and typings are borrowed from the frontend. Actual React declaration version is **19.2.2**, whereas the renderer SDK/package peer contract is React 18. Full typecheck uses these real declarations with `skipLibCheck` as configured; this is **not React-18-specific compatibility proof**. UI Node tests are rendered jsdom mocks, not live GUI evidence. A read-only Client Builtin inspect query timed out; no browser reconnect was attempted.

The historical `tsdown.config.ts` filename now contains plain public Rolldown options; no tsdown dependency is required. Client compilation uses classic JSX and requests only `react`, with no Harness Client runtime imports or `react/jsx-runtime`. Type-only renderer/locale/conversation imports are erased. All seven source files receive actual TypeScript semantic checking and fresh declaration emission, not syntax-only transpilation. Removed author-specific dependency links do not remain in the package or its minimal lockfile.

## Verification results

- Full TypeScript source check: **PASS**, 7 source files; declarations emitted.
- Backend/workspaces Node tests: **7 passed, 0 failed**.
- Rendered UI Node tests: **7 passed, 0 failed**.
- Both production artifact syntax checks: **PASS**.
- Actual canonical Host production import: **PASS**.
- VM registration/public factory: **PASS**, fresh package ID, only `react` requested; exports include `apply` and `ReviewPanel`. This tests the loader contract, not a fake HTML app or live browser registration.
- Manifest exported paths: **PASS**.
- Legacy Vitest: executes **7 tests, 7 failed**, all at `tests/review-loop.spec.ts:30`, before review assertions: **`TypeError: Inbox is not a constructor`**. Existing legacy fixture imports `Inbox` from canonical `@deepseek-ai/dsh-agent`, whose current public runtime does not provide that constructor. The test fixture requires a separate current-SDK port; no test/SDK behavior was patched to hide this failure. The legacy runner also emits a nonfatal Vite dynamic-import analysis warning for the generic tooling loader.
- Full `verify`: **exit 1**, preserving the legacy failure rather than pretending green.

## Artifact SHA256

```text
0bd3e9839dc71a7c3755922e73ea0eaa789b15fd2043efa154e1937e42f04cd3  lib/index.mjs
21d7b7f308d8d781e10cbb44a1856da1501aa38b4f31c5b047ccd92f28fd6976  lib/client.js
8b9167d57152a78b6147fa13f6329f34083cd0975891a72bbec759ee4d80dd06  lib/index.d.mts
a4134a70be5a2665939f1ebebe1829961cc1cf9d9bca4eae03ac555f50ec954e  lib/types/checkpoint.d.ts
915853d95ba266e2d702d9922726299b666c409c80e2ffd81916ec1a493f58c7  lib/types/git.d.ts
8c71214cda8d9e402e71ccd4fbb9683f4b139d53d859aa0c24a412f7d95e7895  lib/types/http.d.ts
5bad2ee3a6f43a3f88f5d4c2bf639478df217e3ff3641d1aaf61e98208f1e326  lib/types/index.d.ts
05fee25fcce2edfe4d791941a3d65a84ba8134af57fd83fca456769fc01f1bfd  lib/types/review.d.ts
aea0834afb946766d1abd1bf5ec01a94eeb4d2024020c48ebb6e0b564c776760  lib/types/workspaces.d.ts
cacdd8df2ec030bee1536262e85aff890d0544a24b40dce121af5510d5e371d3  lib/types/client/review-panel.d.ts
```

## Exact next unit

`BUILD-RESUME-2 → BUILD-LEGACY-SDK`: assign ownership of `tests/review-loop.spec.ts` (outside this unit's build zone), port only the legacy harness fixture to current public Agent/Inbox APIs, rerun `node scripts/verify.mjs`, then hand back. Do not change production SDK resolution or review behavior merely to make that fixture pass. Parent can separately decide whether the passing new integration suite is sufficient to proceed with an explicitly qualified install. Actual profile installation and GUI verification remain separate and unperformed.
