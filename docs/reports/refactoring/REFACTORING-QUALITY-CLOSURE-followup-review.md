# Review: REFACTORING-QUALITY-CLOSURE

**Статус:** REWORK
**Дата:** 2026-05-06
**План:** `docs/plans/feature/refactoring/refactoring_quality_closure_followup.md`
**Сервис:** `services/backend` + docs

## Findings

1. `docs/reports/REFACTORING-SUMMARY-FINAL-2026-05-06.md:29` - отдельный финальный report для `refactoring_horse_service.md` в `docs/reports` не найден. Повторный поиск по `REFACTORING-HORSE-SERVICE`, `refactoring_horse_service`, `HorseServiceService`, `horse_service` находит только план, summary и сторонние упоминания, но не подтверждающий Quality Gate report со smoke/unit/mypy. Поэтому весь refactoring-пакет документально закрыть нельзя.
2. `docs/reports/REFACTORING-PHOTOS-review.md:55` - report всё ещё содержит устаревшее утверждение, что `uv run mypy <photos source files>` / `PYTHONPATH=src uv run pytest -q tests/unit` показывают ошибки в других модулях. На текущем прогоне `uv run pytest -q`, `uv run pytest -q -W error`, `uv run mypy src tests/unit` и `uv run mypy src` проходят зелёно, поэтому этот блок противоречит актуальному состоянию.
3. `docs/reports/REFACTORING-PHOTOS-review.md:59` - report всё ещё говорит о падениях проверок в других доменах. Это также устарело и должно быть заменено на актуальный общий статус.

## Проверки

- `uv run pytest -q -W error` из `services/backend`: PASS, `354 passed, 5 skipped`, warnings не было.
- `uv run pytest -q` из `services/backend`: PASS, `354 passed, 5 skipped`, warnings не было.
- `uv run mypy src tests/unit` из `services/backend`: PASS, `Success: no issues found in 129 source files`.
- `uv run mypy src` из `services/backend`: PASS, `Success: no issues found in 116 source files`.
- DB discovery: найден `eqsitecms-db`, image `postgres:17`, port `5433->5432`.

## SMOKE

Перед smoke прочитан `.claude/skills/api-smoke-test/SKILL.md`; API доступен на `http://localhost:8001`.

### Users

Итог повторного прогона: `9/9 passed`, `SMOKE_USERNAME=smoke_user_20260506174853`.

| ID | Endpoint | Status | Time, ms | Result |
|---|---|---:|---:|---|
| SM-US-01 | `POST /api/auth/login` | 200 | 28.5 | PASS |
| SM-US-02 | `GET /api/auth/me` | 200 | 29.3 | PASS |
| SM-US-03 | `GET /api/auth/me` без cookie | 401 | 2.5 | PASS |
| SM-US-04 | `POST /api/auth/register` | 200 | 44.9 | PASS |
| SM-US-05 | `POST /api/auth/register` duplicate | 400 | 24.3 | PASS |
| SM-US-06 | `POST /api/auth/login` new user | 200 | 25.5 | PASS |
| SM-US-07 | `GET /api/auth/me` new user | 200 | 24.2 | PASS |
| SM-US-08 | `POST /api/auth/logout` | 204 | 1.9 | PASS |
| SM-US-09 | `GET /api/auth/me` after logout | 401 | 3.1 | PASS |

### Photos

Итог повторного прогона: `13/13 passed`, `SMOKE_PHOTO_ID=bab562a0-45df-413b-9771-48f51b33a367`; cleanup выполнен.

| ID | Endpoint | Status | Time, ms | Result |
|---|---|---:|---:|---|
| SM-PH-01 | `POST /api/auth/login` | 200 | 24.8 | PASS |
| SM-PH-02 | `POST /api/photos` | 200 | 25.7 | PASS |
| SM-PH-03 | `GET /api/photos/{id}` | 200 | 34.0 | PASS |
| SM-PH-04 | `GET /api/photos?name=...` | 200 | 22.8 | PASS |
| SM-PH-05 | `PATCH /api/photos/{id}` | 200 | 30.3 | PASS |
| SM-PH-06 | `PATCH /api/photos/{id}` file | 200 | 48.0 | PASS |
| SM-PH-07 | `GET /api/photos?description=...` | 200 | 53.7 | PASS |
| SM-PH-08 | `GET /api/photos?limit=1&offset=0&sort=-created_at` | 200 | 31.1 | PASS |
| SM-PH-09 | `POST /api/photos` invalid `.txt` | 400 | 4.1 | PASS |
| SM-PH-10 | `GET /api/photos/not-a-uuid` | 400 | 4.1 | PASS |
| SM-PH-11 | `DELETE /api/photos/{id}` | 204 | 26.7 | PASS |
| SM-PH-12 | `GET /api/photos/{id}` after delete | 404 | 27.2 | PASS |
| SM-PH-13 | `POST /api/photos/batch-delete` repeated cleanup | 204 | 47.7 | PASS |

## Итог

Кодовые проверки, mypy и новые users/photos smoke зелёные. Quality Gate не может поставить APPROVED всему follow-up, пока не добавлен отдельный report для `refactoring_horse_service.md` и не очищены устаревшие строки в `REFACTORING-PHOTOS-review.md`.
