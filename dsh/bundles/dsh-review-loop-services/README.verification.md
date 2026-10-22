# QG-LIVE-1 — installed multi-repository review verification

**2026-10-15 · APPROVED, scoped to this Harness enhancement.** Not a CMS business/release gate or authorization to approve real repositories.

## Current truth and provenance

Parent reports the completed `node scripts/verify.mjs` gate: **exit 0; 21 tests passed, 0 failed** (7 workspace/backend + 7 rendered UI + 7 ported legacy tests), actual TypeScript semantic checking of seven source files, fresh production artifacts, canonical Host import, exported paths and public Client factory registration (React-only runtime import). These results supersede the old legacy-red/partial checkpoint in [README.build.md](</srv/eqSiteCMS/dsh/bundles/dsh-review-loop-services/README.build.md>); that historical file remains unchanged. This lane did not rerun the build/test group.

Parent installation: old upstream bundle removed; `@local/dsh-review-loop-services@0.1.0-local.1` installed, fresh row `review-loop-services`, application `applied`, warnings `[]`. Existing `/plugins/dsh-review-loop/{state,approve}` names now serve the aggregate implementation. No profile, build, installation or runtime changes were made in this lane.

Artifact identities supplied by parent:

```text
Host   0bd3e9839dc71a7c3755922e73ea0eaa789b15fd2043efa154e1937e42f04cd3
Client 21d7b7f308d8d781e10cbb44a1856da1501aa38b4f31c5b047ccd92f28fd6976
```

The build borrowed React 19.2.2 declarations/runtime from frontend tooling while the renderer SDK peer contract is React 18. The actual installed GUI now renders and interacts successfully through the real Client bridge; this replaces the earlier render-availability limitation, **not** the missing React-18-specific type/runtime proof.

## Actual GUI smoke

Exclusive existing browser tab 0, authenticated normal URL `http://127.0.0.1:3080/`; ordinary navigation refreshed Client code. No replacement server or HMR assumption. Desktop viewport **1536 × 785**, unchanged. One bounded scripted read-only smoke group: **32 checks passed, 0 failed**, plus cropped theme/button evidence.

Composer summary showed **11 repositories** (104 files at capture time). Open review retained root and all ten names from [services.manifest](</srv/eqSiteCMS/services.manifest>), including eight clean services. All eleven DOM HEAD prefixes match read-only `GIT_OPTIONAL_LOCKS=0 git [-C repo] rev-parse HEAD`:

| Group | HEAD prefix | Checkpoint displayed |
|---|---|---|
| root | `03a1d4a` | `03a1d4a` |
| backend | `475a695` | no checkpoint |
| notification-service | `962c9aa` | no checkpoint |
| email-service | `a02f7f1` | no checkpoint |
| frontend | `ba2c3ed` | no checkpoint |
| vk-service | `7082663` | no checkpoint |
| site-ad | `78212f9` | no checkpoint |
| site-ksk-inlove | `d31c623` | no checkpoint |
| seo-service | `5c202c3` | no checkpoint |
| yandex-service | `2ac9a2a` | no checkpoint |
| ya-metrica-service | `b64a0bd` | no checkpoint |

An actual modified safe source file, [yandex-service schema initializer](</srv/eqSiteCMS/services/yandex-service/src/core/schemas/api/__init__.py>), opened through its native **Show diff** button inside yandex-service. Visible unified diff had matching `diff --git a/... b/...` paths and hunk markers; Git metadata was +3/−0. Diff closed afterwards. Only metadata retained: no raw private source, response payload, credentials, bootstrap state or headers collected.

Light and Dark were selected through the real Settings UI. Four cropped PNGs were each inspected with `read_image`: readable group headings, paths, HEAD/checkpoint labels and native buttons; consistent theme colors, no overlap or horizontal overflow. The panel's expected vertical scrolling clips partially visible next groups normally. Both theme layouts: clientWidth = scrollWidth = 829. Keyboard focus + Enter collapsed the panel; reopening preserved all eleven groups. Final state: **System restored; panel collapsed**. Coding mode, input, sidebar and viewport were untouched.

Console: baseline and final **one unrelated existing 404** at `/open-in-app/icon/filemanager`; scripted window **0 new console errors, 0 warnings, 0 page errors**, 0 review-loop-attributed errors. This is not an all-app-clean claim.

## Safety and scope

- **Never clicked Approve & checkpoint or Submit feedback.** No approval endpoint invocation, review commands, messages, injection or goal controls. Live checkpoint mutation intentionally untested; per-root checkpoint isolation relies on parent's real temporary-Git backend tests, not writes to user repositories. Identical-relative-path collisions rely on the supplied rendered tests; no real fixtures created.
- Root [.gitignore](</srv/eqSiteCMS/.gitignore#L34-L35>) retained `/services/`; before/after SHA256 `cf6e638a964ccb512e6ea9f96b25ba73460b424f6f8972fb9037a95a2b99b42e`. Existing +1/−0 local ignore diff and sampled source +3/−0 metadata remained unchanged. No broad ignored-file walk.
- Existing Host authentication is inherited; no CMS public-read redesign or auth bypass. No anonymous/auth mutation probe performed.
- No CMS Docker/business stack, OpenSpec, full business gates, source commits, mobile/tablet/axe audit or full-application QA claim: explicitly outside this user-authorized Harness-only unit.
- Only this new verification document and new ignored evidence were written. No source/build/profile/service/index/ref/checkpoint modifications. No background jobs started.

## Evidence

- [Metadata-only report](</srv/eqSiteCMS/.qa/review-loop-services-live-20261015/report.json>) and [scripted smoke](</srv/eqSiteCMS/.qa/review-loop-services-live-20261015/smoke.cjs>) (invoke with Playwright `browser_run_code_unsafe` filename on this authenticated tab). The script returns metadata; the file tool persisted the report. Two initial wrapper failures (`require` and dynamic import unavailable) occurred before scenario actions, then the smoke passed.
- [Light panel/buttons](</srv/eqSiteCMS/.qa/review-loop-services-live-20261015/panel-light.png>) · [Dark panel/buttons](</srv/eqSiteCMS/.qa/review-loop-services-live-20261015/panel-dark.png>)
- [Light clean groups](</srv/eqSiteCMS/.qa/review-loop-services-live-20261015/groups-light.png>) · [Dark clean groups](</srv/eqSiteCMS/.qa/review-loop-services-live-20261015/groups-dark.png>)

**Finding:** no blocking defect observed in the requested read-only multi-repository GUI flow. **STOP**; real approval remains the user's action.
