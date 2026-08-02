# Review: horse_pedigree_management

**Статус: ✅ APPROVED**
**Дата:** 2026-05-17

## Итог

Backend и CMS frontend rework прошли Quality Gate: unit/full tests зелёные, `SM-04` теперь возвращает structural `422`, полный live smoke `37/37` passed.

Повторный frontend Quality Gate после Manual QA comments и bugfix `Перейти` также пройден 2026-05-17: related horse outside current table list теперь загружается через existing `GET /api/horses/{slug_or_id}` API boundary/service, failed detail GET surfaced через notification, geld marker/header и selected-card label/border покрыты тестами.

По явному решению пользователя локальный diff во вложенном репозитории `services/site-ad` считается out-of-scope/pre-existing separate repo state и не блокирует текущую задачу. Файлы `services/site-ad` в рамках этого Quality Gate не изменялись. CMS/backend scope не смешивает consumer-контур, и CMS pedigree write usage в `site-ad` не найден.

## Findings

No blocking findings remain.

Out-of-scope note:
- `services/site-ad` has local nested-repo state outside this task. Per user decision, it is not part of the `horse_pedigree_management` approval decision.
- This Quality Gate did not edit `services/site-ad`.
- No CMS pedigree write usage or CMS/frontend import mixing with `site-ad` was found.

## Resolved Since Previous Review

- `SM-04` fixed: `GET /api/horses/{horse_id}/pedigree/badmode` now returns `422`.
- Added `services/frontend/src/features/horses/hooks/useHorsePedigree.test.ts`.
- Hook tests cover candidate search reset to `offset=0`, `limit/offset` candidate params without `page/pageSize/page_size`, and `401/403` mutation denial surfacing.
- Latest frontend rework fixed `Перейти` from pedigree modal for related horses outside the current table page/filter by using `useHorses.getHorseDetail()` -> `fetchHorse()` -> `horseGet()`.
- Frontend follow-up after user QA changes this behavior: open relation cards now refresh through detail reload after mutation while table indicators/tooltips still refresh through background `loadHorses()`.

## Changed Files Reviewed

Backend:
- `services/backend/src/main.py`
- `services/backend/src/api/horses.py`
- `services/backend/src/core/services/horse.py`
- `services/backend/src/core/schemas/horses.py`
- `services/backend/src/core/protocols/repositories/horse_repository.py`
- `services/backend/src/repositories/horse_repository.py`
- `services/backend/tests/unit/core/services/test_horse_service.py`
- `services/backend/tests/unit/api/test_route_order.py`

Frontend:
- `services/frontend/src/api/horses.ts`
- `services/frontend/src/api/api-boundary.test.ts`
- `services/frontend/src/types/api/horses.ts`
- `services/frontend/src/app/(protected)/horses/page.tsx`
- `services/frontend/src/features/horses/services/horseService.ts`
- `services/frontend/src/features/horses/hooks/useHorses.ts`
- `services/frontend/src/features/horses/hooks/useHorses.test.ts`
- `services/frontend/src/features/horses/hooks/useHorsePedigree.ts`
- `services/frontend/src/features/horses/hooks/useHorsePedigree.test.ts`
- `services/frontend/src/features/horses/hooks/useHorseScopes.ts`
- `services/frontend/src/features/horses/hooks/useHorseScopes.test.tsx`
- `services/frontend/src/features/horses/ui/Horses/HorsePedigreeCard.tsx`
- `services/frontend/src/features/horses/ui/Horses/HorsePedigreeCard.test.tsx`
- `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx`
- `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.test.tsx`
- `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx`
- `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.test.tsx`

Out-of-scope:
- `services/site-ad` nested-repo local state; not reviewed as task diff and not modified by Quality Gate.

## Backend Verification

- Clean Architecture spot-check: API router delegates to service; business validation is in `HorseService`; SQL is in repository; service depends on repository protocols.
- `services/backend/src/main.py` now maps FastAPI path validation errors to `422` while keeping non-path request validation mapped to current module `400` behavior.
- Access: `GET /api/horses/{horse_id}/pedigree/{mode}` has no cookie auth dependency. Public read requires tenant context header `X-Equestrian-Service-Key`, not auth cookie.
- `POST /api/horses/{horse_id}/pedigree` remains Protected Write via current user + protected equestrian context.

Commands:
- `make format` from repo root: passed, files left unchanged.
- `uv run pytest tests/unit/core/services/test_horse_service.py tests/unit/api/test_route_order.py` from `services/backend`: `83 passed`.
- `make test` from repo root: `572 passed, 5 skipped`.
- `make lint` from repo root: mypy/flake8/ruff clean.

DB discovery:
- Container: `/eqsitecms-db`, image `postgres:17`.
- Labels: `com.docker.compose.project=eqsitecms`, `com.docker.compose.service=db`.
- DB env: `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`.
- Host port: `5433`.

## Frontend Test Gate

Commands from `services/frontend`:
- `npm test -- useHorses useHorsePedigree HorsePedigreeModal`: `4 passed`, `72 passed`.
- `npm test`: `15 passed`, `151 passed`.
- `npm run lint`: passed with `18 warnings`, `0 errors`. Warnings are existing unused vars/hook dependency warnings outside the pedigree rework files.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.

Latest frontend behavior checks:
- Filled relation menu now separates `Редактировать` and `Перейти`: edit opens the existing edit/card flow, go opens/switches the pedigree modal for the related horse.
- `HorsesPage.handleNavigateFromPedigree()` first uses current table data, then falls back to `getHorseDetail(horse.slug || horse.id.toString())`.
- `useHorses.getHorseDetail()` uses existing service/API boundary (`fetchHorse` -> `horseGet`) and surfaces failed detail GET through toast.
- `useHorsePedigree.applyMutation()` reloads selected horse detail with `pedigree=1` after successful POST, then calls `onChanged()`; page integration wires `onChanged()` to `loadHorses()` for table refresh.
- Tests cover successful detail fetch for outside-list related horse, failed detail GET returning `null`, `onChanged` after mutation, geld marker in modal/card, selected current card label/border, and go-menu callback.
- 2026-05-17 rerun confirmed add/replace/remove refresh behavior through `useHorsePedigree` tests and code review: successful mutation updates the opened modal from detail reload without browser refresh, while failed detail reload surfaces an operation error and leaves the picker open.

Self-check commands:
- `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'`: direct fetch only in API/auth boundary and developer documentation snippets.
- `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'`: feature services import API boundary; no pedigree UI direct API import found.
- `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'`: new `useHorsePedigree.test.ts` explicitly asserts no `page/pageSize/page_size`; existing news/page docs remain unrelated.
- `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'`: no CMS frontend consumer mixing found.
- `find services/frontend/src -maxdepth 2 -type d \( -name shared -o -name widgets -o -name entities \)`: no legacy FSD dirs found.

Frontend residual risk:
- Manual QA was not re-executed by Quality Gate in browser; this pass verified the reported Manual QA fixes through code review, unit/component tests, type-check, lint, and build.

## Site Consumer Verification

- `rg -n "POST.*/horses/.*/pedigree|horseSetPedigree|fetchSetHorsePedigree|/pedigree" services/site-ad/src services/site-ad/.env.example`: no CMS pedigree write usage found.
- `services/site-ad` local diff is treated as out-of-scope/pre-existing separate repo state by explicit user decision and was not modified during this Quality Gate.

## Smoke Tests

Smoke skill was read before execution. Live API was available at `http://localhost:8001`; login `su/string` and no-scope login `smoke_noscope_news/string` succeeded. Public GET smoke was run without auth cookie and with tenant header `X-Equestrian-Service-Key: default-equestrian`.

Backend code was not changed in the latest frontend-only rework, so backend smoke was not rerun in the 2026-05-17 frontend pass. The smoke skill was read again; the last backend smoke remains `37/37` passed and access policy remains unchanged.

Run data:
- `RUN_ID=qg-recheck-20260516221641`
- `HORSE_CURRENT_ID=f413dede-b695-497e-ad64-73a51c126713`
- `SIRE_ID=e1aad03a-1b9e-421b-8dd7-7e32d7d3a5c4`
- `DAM_ID=29a1b7e7-387f-468d-9217-42f925c5e2d5`
- `FOAL_ID=24a1531b-7791-4a5c-815b-a0fd96e661a0`

| # | Method | Endpoint | HTTP | Time | Result |
|---|---|---|---|---:|---|
| SM-01 | GET | `/api/horses/{id}/pedigree/sire?limit=10&offset=0` | 200 | 45 ms | PASS |
| SM-02 | GET | `/api/horses/{id}/pedigree/dam?limit=10&offset=0` | 200 | 47 ms | PASS |
| SM-03 | GET | `/api/horses/{id}/pedigree/children?limit=10&offset=0` | 200 | 37 ms | PASS |
| SM-04 | GET | `/api/horses/{id}/pedigree/badmode` | 422 | 24 ms | PASS |
| SM-05 | GET | `/api/horses/{missing}/pedigree/sire` | 400 | 23 ms | PASS |
| SM-06 | GET | `/api/horses/{id}/pedigree/sire?limit=999` | 200 | 36 ms | PASS |
| SM-07 | GET | `/api/horses/{id}/pedigree/sire?limit=0` | 200 | 32 ms | PASS |
| SM-08 | GET | `/api/horses/{id}/pedigree/dam?offset=-10` | 200 | 49 ms | PASS |
| SM-09 | GET | `/api/horses/{id}/pedigree/sire?search=...` | 200 | 44 ms | PASS |
| SM-10 | GET | `/api/horses/{id}/pedigree/dam?search=...` | 200 | 47 ms | PASS |
| SM-11 | GET | `/api/horses/{id}/pedigree/children?search=...` | 200 | 43 ms | PASS |
| SM-12 | GET | `/api/horses/{id}/pedigree/sire` | 200 | 48 ms | PASS |
| SM-13 | GET | `/api/horses/{id}/pedigree/dam` | 200 | 40 ms | PASS |
| SM-14 | GET | `/api/horses/{id}/pedigree/sire` | 200 | 52 ms | PASS |
| SM-15 | GET | `/api/horses/{id}/pedigree/dam` | 200 | 54 ms | PASS |
| SM-16 | GET | `/api/horses/{id}/pedigree/children` | 200 | 36 ms | PASS |
| SM-17 | GET | `/api/horses/{id}/pedigree/children` | 200 | 39 ms | PASS |
| SM-18 | GET | `/api/horses/{id}/pedigree/sire?search=same-date` | 200 | 68 ms | PASS |
| SM-19 | GET | `/api/horses/{id}/pedigree/dam?search=same-date` | 200 | 50 ms | PASS |
| SM-20 | GET | `/api/horses/{id}/pedigree/children?search=same-date` | 200 | 64 ms | PASS |
| SM-21 | POST | `/api/horses/{id}/pedigree` without auth | 401 | 2 ms | PASS |
| SM-22 | POST | `/api/horses/{id}/pedigree` no-scope auth | 400 | 24 ms | PASS |
| SM-23 | POST | set `sire_id` | 204 | 35 ms | PASS |
| SM-24 | POST | set `dam_id` | 204 | 32 ms | PASS |
| SM-25 | POST | set `foals` | 204 | 40 ms | PASS |
| SM-26 | POST | clear `sire_id` | 204 | 44 ms | PASS |
| SM-27 | POST | clear `dam_id` | 204 | 41 ms | PASS |
| SM-28 | POST | clear `foals` | 204 | 32 ms | PASS |
| SM-29 | POST | duplicate foals | 400 | 22 ms | PASS |
| SM-30 | POST | wrong-sex sire | 400 | 27 ms | PASS |
| SM-31 | POST | wrong-sex dam | 400 | 29 ms | PASS |
| SM-32 | POST | same-date parent | 400 | 28 ms | PASS |
| SM-33 | POST | same-date foal | 400 | 30 ms | PASS |
| SM-34 | POST | `sire_id == dam_id` | 400 | 29 ms | PASS |
| SM-35 | POST | `sire_id` also in `foals` | 400 | 34 ms | PASS |
| SM-23b | POST | restore final relations | 204 | 34 ms | PASS |
| SM-36 | GET | `/api/horses/{id}?pedigree=1` | 200 | 67 ms | PASS |

Summary: `37/37` passed.

## Access Verification Results

- Public Read GET without auth cookie: `200` for valid modes with tenant service key.
- Invalid path `mode`: structural `422`.
- Missing horse: business `400`.
- Protected Write POST without auth: `401`.
- Protected Write POST with no-scope user: `400` current module permission denial.
- Protected Write POST with `su` auth: `204` for valid writes.
- No new public write exception observed.

## Residual Risks

- Manual QA was not re-executed by Quality Gate in browser after the latest frontend-only rework.
- `services/site-ad` nested-repo local state remains out-of-scope and was not changed.

Готово к merge по backend/frontend scope текущей задачи.
