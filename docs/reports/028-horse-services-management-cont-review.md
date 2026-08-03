# Review: horse-services-management-cont-028

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-03  
**Цикл:** пятый полный Quality Gate  
**OpenSpec approval:** `apply`

## Итог

Все findings QG-028-01..QG-028-10 исправлены. Последний блокер устранён: protected-read `available-services` возвращает typed DTO с `description`, `price` и `price_formatter`, а также сохраняет access contract 401/403/success. Backend/frontend mandatory suites, реальная PostgreSQL migration rehearsal, live SMOKE **30/30** и Manual QA завершены успешно.

Quality Gate одобрен. Отмечены задачи 1.40–1.69, 2.15 и 3.1–3.11. OpenSpec progress: **95/98**. Задачи 3.12–3.14 намеренно оставлены Router: sync delta specs, strict validation после sync и archive.

## Mandatory suites

### Backend

- `PYTHONPATH=src uv run pytest -s -vv tests/unit`: **841 passed, 5 skipped**, 0 failed, 4.85s.
- `uv run mypy src`: pass, 146 files.
- `uv run flake8`: pass.
- `uv run isort --check-only src tests`: pass.
- `uv run black --check src tests`: pass, 185 files unchanged.
- `git diff --check`: pass.
- Clean Architecture, typed authorization, tenant-safe items/count, stable relation ordering/pagination and full available-service response reviewed.

### Frontend

- `npm test`: **39 files, 365 tests passed**.
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass, 13 pages.
- `git diff --check`: pass.
- MSW rejects unhandled requests; repeated query keys, pagination resets, scope guard, error persistence, inherited/null overrides, invalidation and double-submit protection covered.

## Migration and PostgreSQL evidence

- Docker inspect: `eqsitecms-db`, image `postgres:16`, aliases `db`/`eqsitecms-db`, host port `5433`.
- Actual downgrade/upgrade completed; relation count preserved **9 -> 9**.
- `created_at` backfilled, `NOT NULL`, server default `now()`; new rows receive a server-generated timestamp.
- QG fixtures used marker `02800000-*`/`qg028_*`; cleanup query confirmed **0** remaining rows.

## Live SMOKE SM-01..SM-30

| ID | Result | Time | Evidence |
|---|---|---:|---|
| SM-01 | PASS | 0s | inspect real PostgreSQL |
| SM-02 | PASS | 0s | migrations at head |
| SM-03 | PASS | 0s | rows preserved |
| SM-04 | PASS | 0s | backfill/not-null/default |
| SM-05 | PASS | 0.025062s | server-generated timestamp |
| SM-06 | PASS | 0.021577s | newest-first |
| SM-07 | PASS | 0.021577s | stable id DESC tie-break |
| SM-08 | PASS | 0.041243s | stable relation pagination |
| SM-09 | PASS | 0s | downgrade/upgrade no loss |
| SM-10 | PASS | 0s | lint/type/format clean |
| SM-11 | PASS | 0.023922s | anonymous tenant-key GET 200 |
| SM-12 | PASS | 0.003214s | missing tenant 400 |
| SM-13 | PASS | 0.026931s | authenticated GET 200 |
| SM-14 | PASS | 0.023210s | repeated services OR |
| SM-15 | PASS | 0.023210s | no duplicate horses |
| SM-16 | PASS | 0.021020s | unmatched empty |
| SM-17 | PASS | 0.020490s | foreign tenant isolated |
| SM-18 | PASS | 0.025566s | mixed IDs own only |
| SM-19 | PASS | 0.024047s | malformed UUID 422 |
| SM-20 | PASS | 0.036012s | omitted-filter compatibility |
| SM-21 | PASS | 0.035842s | unique count |
| SM-22 | PASS | 0.055279s | filtered pagination/count |
| SM-23 | PASS | 0.025333s | sort preserved |
| SM-24 | PASS | 0.022473s | name intersection |
| SM-25 | PASS | 0.021235s | breed/kind intersection |
| SM-26 | PASS | 0.019539s | anonymous relation GET 200 |
| SM-27 | PASS | 0.004047s | anonymous writes 401/401/401 |
| SM-28 | PASS | 0.054239s | no-scope writes 403/403/403, DB unchanged |
| SM-29 | PASS | 0.046316s | scoped override create/read |
| SM-30 | PASS | 0s | fixture cleanup verified |

**Итог: 30/30 passed.** Access matrix подтверждена для Public Read, protected available-service read и Protected Write, включая anonymous, no-scope, allowed-scope и tenant isolation.

## Browser Manual QA

Manual QA выполнен локальным Playwright в cached Chromium на desktop/tablet/mobile. Network evidence сопоставлено с component/API tests и live smoke.

| Step | Result | Evidence |
|---|---|---|
| 1 Anonymous auth state | PASS | `/horses` redirects to `/login` |
| 2 Desktop badges | PASS | 1440x900; 25 rows/75 uniform gray badges |
| 3 Responsive layout | PASS | 768x1024 and 390x844; no body overflow |
| 4 Drawer/order | PASS | paginated relations render newest-first |
| 5 Select/change defaults | PASS | A populates `A default`/1000/`equal`; B populates `B default`/2000/`gt` |
| 6 Create/refresh | PASS | overrides sent once; Drawer refresh shows `QG028 Service B от 33 ₽` |
| 7 Null clearing/fallback | PASS | explicit null body and inherited fallback contract verified |
| 8 Service filter | PASS | one/two/clear selections use repeated keys and reset offset |
| 9 Pagination/search/sort | PASS | count, pages and query state remain consistent |
| 10 Permission state | PASS | no-scope mutation state unavailable; live endpoint returns 403 |
| 11 Error/double submit | PASS | form persistence and 401/403/422/generic handling covered; one POST observed on repeated submit |
| 12 Independent actions | PASS | handlers remain isolated; no site-consumer mixing |

Ephemeral screenshots: `/tmp/qg028-select5.png`, `/tmp/qg028-drawer4.png`, `/tmp/qg028-horses-{desktop,tablet,mobile}.png`.

## Isolation and validation

- `services/site-ad`: clean; `git diff --check` pass.
- `openspec validate horse-services-management-cont-028 --strict`: pass.
- OpenSpec progress: **95/98**.
- Remaining: 3.12 sync four delta specs, 3.13 strict validation after sync, 3.14 archive.
- Quality Gate did not sync or archive the change.
