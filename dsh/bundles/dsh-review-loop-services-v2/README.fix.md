# FIX-STATE-LIFECYCLE-1 — verified candidate, not deployed

## Identity and scope

- Install spec: `/srv/eqSiteCMS/dsh/bundles/dsh-review-loop-services-v2`
- Package: `@local/dsh-review-loop-services-v2@0.1.0-local.2`
- Patch row: `review-loop-services-v2`; Client public loader ID: `@local/dsh-review-loop-services-v2`.
- Fresh directory absence was checked at its literal resolved absolute path before creation. Source/tests/scripts and necessary metadata/docs/license copied; no old node_modules, profile, caches, historical QGUI report, assets or Git directory copied. Build emits fresh lib artifacts.
- V1 was read-only and remains the backup/provenance. No runtime/plugin-manager/profile/Core/Host restart, user-source inspection/mutation, real approval, or checkpoint reset was performed. Parent owns old removal/new installation and same-URL GUI verification.

## Known evidence versus inference

Parent supplied current evidence: the actual root session `session-f266...` repeatedly received empty-content-type HTTP 404 for `GET /plugins/dsh-review-loop/state?session=...`, before and after one reload. V1 review-loop-services and webserver rows were enabled/ACTIVE. The review route handler itself emits 400 (missing context), 405 (method), 500 (exception), or 200, not 404. Thus loaded-plugin plus available-server plus an unreached named route is established; historical startup ordering/restart is **not** established.

V1 source index lines 121–123 performs a one-shot optional webServer lookup. This can miss a late provider and cannot follow replacement, even though the command-only plugin remains active. Canonical public Cordis registry declarations document `ctx.inject` as a child plugin that unloads/re-runs when services change (registry.d.ts lines 99–111 and 178–185). Current WebServer inspection confirms unmatched requests can return startup fallback 404. Its real `register` implementation (installed lib/index.js lines 177–183) throws on duplicate kind/path and returns a route-table deletion disposer.

The fix replaces only that one-shot block with `ctx.inject(['webServer'], webCtx => { webCtx.effect(() => registerWebRoutes(webCtx, { store: cfg.store }), label) })`. The injected **child** context owns both registration and cleanup/rebind. Top-level `inject = ['commands']` remains unchanged, preserving headless CLI. HTTP URLs, handlers, checkpoint `$DSH_HOME/review-loop` storage, aggregation, feedback, and Client source remain unchanged. This fixes the demonstrated registration-gap class; attribution of the actual historical sequence and live 404→200 recovery requires parent redeployment evidence.

## Verification

From this candidate directory: `node scripts/verify.mjs` → **exit 0**, **23 passed / 0 failed**: 9 backend/workspace Node tests (prior 7 plus 2 lifecycle regressions), 7 rendered UI Node tests, 7 current-SDK legacy Vitest tests. Full semantic TypeScript 5.9.3 check and declarations: all 7 source files. Production Host ESM import and canonical ancestor SDK resolution, export existence, both artifact syntax checks, fresh VM Client loader ID, React-only public factory: PASS.

Both lifecycle regressions mount the actual plugin in the real canonical Cordis Context with actual CommandRuntime and SessionStore. MockWebServer is supplied through public `ctx.provide`, never a monkeypatched inject/SDK alias. Cases cover plugin-before-provider/no routes with functioning headless command; late availability; already-available provider; GET/POST handler success using private temporary Git repositories; provider removal disposing both routes; same-table reprovide without duplicate registrations; replacement provider; parent disposal removing child routes and command. No real actors are driven or injected.

The first verification attempt found two **fixture** failures: CommandRuntime logs to `session.append`, absent from the old plain actor stub. Corrected only the new lifecycle fixture to use real SessionStore sessions; the complete same gate then passed. This is separate from the earlier provider/transport failure reported by parent: its cause is unavailable in this transcript, and the resumed filesystem contained no v2 partial writes.

Offline existing tooling only: no dependency installs, lifecycle scripts, network or global SDK duplicates. React runtime/declarations borrowed from frontend are 19.2.2 while renderer SDK peer is React 18; this is not React-18-specific proof or new live GUI proof. Expected Node experimental type-transform and nonfatal existing Vite dynamic-import-analysis warnings remain. V1 README.build.md historical red was already superseded by V1 README.verification.md (21/0); neither historical report was copied or promoted to a new runtime claim.

## SHA256

```text
69ed756c03302b245229c47a5d3f6aaf438e286721480df31e7a9dbcf5990077  lib/index.mjs
c8fd17c3c962c87b72b41e5285dd2a0dcfdaa858fca557266c2185a5c8b643a5  lib/client.js
8b9167d57152a78b6147fa13f6329f34083cd0975891a72bbec759ee4d80dd06  lib/index.d.mts
b8215130e538b812b6e51d890883f36a78dcb6689678e80798625dbacecdad1c  src/index.ts
7c1fa44ffdb770c8667ea34026547c2cba8863d06778e7673b48547aee8a7c7a  tests/integration.test.mjs
8cea52998177a4af1a97053cd9bd0e7fae7627250a9dffed2504d5223e544303  package.json
34ec2ee8649615297854f5de54d6288382ba187e836e97f28e505855120abe4e  cordis.patch.yml
```

**STOP:** candidate ready for parent-owned deployment; no claim that the current GUI is fixed yet. No OpenSpec/tasks, public reports/specs, release, branch or commit created.
