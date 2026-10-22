# QG-STATE-RECOVERY-1 — actual UI recovery

**Verdict: scoped PASS** for the reported selected-root state-loading failure in the existing authorized GUI at `http://127.0.0.1:3080/`. No install, restart, source, profile, checkpoint, approval, feedback, or goal changes were made by this verification unit.

## Observed, not inferred

- Selected conversation remained `session-f2662fac-e03d-4e76-8b49-875d1f8255b7`, title “Дерево изменений репозиториев в браузере”.
- After one ordinary reload to load the fresh Client module, its actual GET `/plugins/dsh-review-loop/state?session=session-f2662fac-e03d-4e76-8b49-875d1f8255b7` returned **200**, `application/json; charset=utf-8`, aggregate `ok: true`, **11 repositories**, **0 failed**.
- Three successive natural polling responses returned the same successful metadata and repository labels. Observed intervals were **1977 ms / 1986 ms**; no synthetic requests or arbitrary sleeps were used.
- Open review rendered root plus all ten service groups. Eight service groups were clean; root, yandex-service and ya-metrica-service had current changes. The pending count was 82 at observation and is dynamic.
- No active “Failed to load review state” alert. The historical user chat message containing that text appropriately remains; it is not an active plugin failure.
- Root retained checkpoint **03a1d4a · 15.10.2026, 15:39:37**; all ten services displayed **no checkpoint**.
- One further ordinary reload again returned **200 JSON / 11 repositories / 0 failed**, and reopening rendered all eleven groups with the same root checkpoint. The panel was then left **collapsed**. Theme, viewport, Mode, input, and sidebar were not adjusted.
- Optional native diff was skipped because root `.gitignore` was not uniquely listed; no private diff was opened or dumped.
- Root `.gitignore` SHA-256 remained `cf6e638a964ccb512e6ea9f96b25ba73460b424f6f8972fb9037a95a2b99b42e`; `git diff --quiet -- .gitignore` succeeded before/after.
- No observed review-loop state/client console error. Unrelated `/open-in-app/icon/filemanager` and `/api/changes.summary` 404s remain: this is **not** a whole-app console-clean claim.

## Supplied prerequisite evidence (not rerun here)

Parent reports 23 tests passed / 0 failed, seven TypeScript checks, normal Host import and fresh Client React-only VM checks passed. Canonical-context lifecycle regressions cover late/already-present webServer, removal/re-provision, replacement, parent cleanup and headless CLI.

Installed artifact identifiers supplied by parent: `@local/dsh-review-loop-services-v2@0.1.0-local.2`, row `review-loop-services-v2`; Host SHA-256 `69ed756c03302b245229c47a5d3f6aaf438e286721480df31e7a9dbcf5990077`; Client SHA-256 `c8fd17c3c962c87b72b41e5285dd2a0dcfdaa858fca557266c2185a5c8b643a5`.

## Finding and limits

The actual reported 404/load-error case is recovered after replacement. The supported defect class is missing HTTP registration from a one-shot optional dependency gap, with late-provision behavior proven by the supplied regression tests. **The historical ordering that caused the original 404 is unproven**; successful runtime recovery does not establish that ordering or every Host startup sequence. No anonymous/auth audit, full theme audit, or approval/checkpoint mutation was attempted.

Ignored local evidence: [metadata report](<../../../.qa/review-loop-state-recovery/report.json>), [expanded panel](<../../../.qa/review-loop-state-recovery/expanded-panel.png>), [final collapsed status](<../../../.qa/review-loop-state-recovery/final-collapsed.png>). Both screenshots were visually inspected: normal readable status/panel, no observed clipping or overlap in the captured scope. No background jobs remain.
