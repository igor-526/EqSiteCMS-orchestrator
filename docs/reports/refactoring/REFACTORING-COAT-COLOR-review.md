# Review: REFACTORING-COAT-COLOR

**Статус: ✅ APPROVED**
**Дата:** 2026-05-06

## Контекст

- План: `docs/plans/feature/refactoring/refactoring_coat_color.md`
- Сервис: `services/backend`
- Рекомендуемая ветка по плану: `feature/refactoring-testing-audit`
- Повторный Quality Gate после исправления smoke-плана `SM-CC-09`.

## Проверенные файлы

- `services/backend/src/api/coat_color.py`
- `services/backend/src/core/services/coat_color.py`
- `services/backend/src/main.py`
- `services/backend/tests/unit/core/services/test_coat_color_service.py`
- `services/backend/tests/unit/api/test_route_order.py`
- `services/backend/pyproject.toml`
- `docs/plans/feature/refactoring/refactoring_coat_color.md`

## Итог

Diff по `coat_color` соответствует плану и архитектурным правилам backend:

- `api/coat_color.py` содержит только HTTP-маппинг, DTO mapping и вызовы сервиса.
- Expected not-found, duplicate checks, empty update и бизнес-валидация находятся в `CoatColorService` и возвращают `ClientError`.
- `CoatColorService` зависит от `CoatColorRepositoryProtocol`, не импортирует FastAPI, SQLAlchemy models или concrete repository.
- `coat_color_router` зарегистрирован до общего `/api/horses/{slug_or_id}`; route-order покрыт unit-тестом.
- Исправленный smoke-контракт `SM-CC-09` подтвержден: после `PATCH` используется фактический slug из ответа `SM-CC-08`, запись найдена через list/filter.

Блокеров по `REFACTORING-COAT-COLOR` не найдено. Готово к merge в рамках проверенного scope.

## Проверки

- `PYTHONPATH=src uv run pytest -q tests/unit` в `services/backend`: ✅ 197 passed, 5 skipped, 7 warnings
- `uv run mypy src` в `services/backend`: ✅ Success, no issues in 114 source files
- `make lint` в `services/backend`: ✅ запускает `uv run mypy src`, passed
- `uv run isort --check-only src tests/unit` в `services/backend`: ✅ passed
- `git diff --check` в корне репозитория: ✅ no whitespace errors
- `uv run black --check src/api/coat_color.py src/core/services/coat_color.py src/main.py tests/unit/core/services/test_coat_color_service.py tests/unit/api/test_route_order.py` в `services/backend`: ✅ 5 files would be left unchanged
- `make test` в `services/backend`: ⚠️ target отсутствует (`No rule to make target 'test'`); unit suite проверен прямой командой `pytest`

Предупреждение вне scope: полный `uv run black --check src tests/unit` сейчас возвращает ❌ из-за `src/core/services/horse_service.py`, `tests/unit/core/services/test_horse_service_service.py`, `tests/unit/core/services/test_horse_owner_service.py`. У этих файлов нет локального diff в текущем рабочем дереве, поэтому это не блокирует approve для повторного `coat_color` Quality Gate.

## SMOKE-тесты

Перед smoke прочитан `.claude/skills/api-smoke-test/SKILL.md`.
Credentials прочитаны из `.claude/skills/api-smoke-test/credentials.json`: `base_url=http://localhost:8001`, `auth_endpoint=/api/auth/login`, роль `su`.

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---|---|
| SM-CC-01 | `/health` | GET | 200 | 3 ms | ✅ API доступен |
| SM-CC-02 | `/api/auth/login` | POST | 200 | 43 ms | ✅ cookie login успешен |
| SM-CC-03 | `/api/auth/me` | GET | 200 | 25 ms | ✅ cookie авторизация работает |
| SM-CC-04 | `/api/horses/coat_colors?limit=1&offset=0` | GET | 200 | 31 ms | ✅ `items` и `total` есть |
| SM-CC-05 | `/api/horses/coat_colors/{SMOKE_SLUG}` | DELETE | 400 | 23 ms | ✅ best-effort cleanup: `Масть не найдена` допустимо |
| SM-CC-06 | `/api/horses/coat_colors` | POST | 200 | 26 ms | ✅ создана запись `b6b606ff-2cff-4a1c-bb4d-980500c9221f` |
| SM-CC-07 | `/api/horses/coat_colors/{SMOKE_ID}` | GET | 200 | 24 ms | ✅ `slug == SMOKE_SLUG` |
| SM-CC-08 | `/api/horses/coat_colors/{SMOKE_ID}` | PATCH | 200 | 33 ms | ✅ name/description обновлены; slug сохранен как `smoke-coat-color-updated-20260506155226` |
| SM-CC-09 | `/api/horses/coat_colors?slug={SMOKE_CURRENT_SLUG}&limit=10&offset=0` | GET | 200 | 23 ms | ✅ `items` содержит `SMOKE_ID` по фактическому slug из `SM-CC-08` |
| SM-CC-10 | `/api/horses/coat_colors/{SMOKE_ID}` | DELETE | 204 | 25 ms | ✅ cleanup выполнен |
| SM-CC-11 | `/api/horses/coat_colors/{SMOKE_ID}` | GET | 400 | 26 ms | ✅ `Масть не найдена` после удаления |

Итог SMOKE: 11/11 сценариев прошли.
