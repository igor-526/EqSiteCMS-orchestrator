# Review: REFACTORING-AUTH-BREEDS

**Статус: ❌ REWORK**
**Дата:** 2026-05-06
**Рекомендуемая ветка:** `feature/refactoring-testing-audit`

## Ссылки

- План: [docs/plans/feature/refactoring/refactoring_auth.md](../plans/feature/refactoring/refactoring_auth.md)
- План: [docs/plans/feature/refactoring/refactoring_breeds.md](../plans/feature/refactoring/refactoring_breeds.md)
- Задача: не передана отдельным md-файлом

## Краткий контекст

Проверено текущее рабочее дерево `services/backend` после refactoring auth и breeds. Ветка сейчас `main`; `git diff main...HEAD -- services/backend` пустой, поэтому ревью выполнено по фактическому содержимому файлов и real API на `http://localhost:8001`.

## Измененные файлы

| Файл | Что проверено |
| --- | --- |
| `services/backend/src/core/services/auth.py` | token payload validation, DTO mapping, register/login/refresh flow |
| `services/backend/src/utils/security.py` | token payload `token_type`, decode requirements |
| `services/backend/src/core/protocols/security.py` | security protocol contract |
| `services/backend/tests/unit/core/services/test_auth_service.py` | auth service unit coverage |
| `services/backend/src/api/breeds.py` | breeds routes and service delegation |
| `services/backend/src/core/services/breeds.py` | breeds validation, not-found contract, update behavior |
| `services/backend/tests/unit/core/services/test_breed_service.py` | breed service unit coverage |
| `services/backend/src/main.py` | router registration order and exception handlers |
| `.claude/skills/api-smoke-test/credentials.json` | smoke auth endpoint and base URL |

## Проблемы

1. [API/SMOKE] `services/backend/src/main.py:48` регистрирует `horses_router` раньше `breeds_router`, при этом `services/backend/src/api/horses.py:101` содержит catch-all route `/api/horses/{slug_or_id}`. В результате `GET /api/horses/breeds?limit=1` попадает в horse lookup и возвращает `400 {"detail":"Лошадь не найдена"}`, а не список пород из `services/backend/src/api/breeds.py:18`. Это ломает публичный breeds endpoint.

2. [SMOKE] `.claude/skills/api-smoke-test/credentials.json:3` указывает `auth_endpoint` `/api/auth/token`, которого нет в текущем OpenAPI. Обязательная авторизация по skill возвращает `404`; `/api/auth/verify` из skill также отсутствует. Smoke по инструкции нельзя считать успешно пройденным, хотя адаптированный ручной прогон через `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh` работает.

3. [АРХИТЕКТУРА] `services/backend/src/api/auth.py:48` и `services/backend/src/api/auth.py:92` ловят `InvalidCredentials` в роутере. Это нарушает Quality Gate правило "нет try/except доменных исключений в роутерах"; для `InvalidCredentials` уже есть централизованный handler в `services/backend/src/main.py:92`.

4. [СТИЛЬ/QUALITY] `make lint` в `services/backend` падает на mypy в `src/api/prices.py` с 23 ошибками типизации. Ошибки не относятся к auth/breeds diff, но текущий backend quality gate по инструкции `make lint` не зеленый.

5. [ТЕСТЫ/ПЛАН] Планы требуют раскрыть UC01-UC30 для каждой функции: auth 4 функции, breeds 7 функций. Фактические unit-тесты покрывают ключевые сценарии, но не полный объем плана UC01-UC30 для каждой функции.

## Unit / Integration тесты

| Команда | Результат | Примечание |
| --- | --- | --- |
| `uv run pytest -q` | passed | `55 passed, 7 warnings in 0.16s` |
| `uv run black --check <targeted files>` | passed | 7 targeted files unchanged |
| `uv run flake8 <targeted files>` | passed | без вывода |
| `make lint` | failed | 23 mypy errors in `src/api/prices.py` |

## SMOKE-тесты

Перед запуском прочитан `.claude/skills/api-smoke-test/SKILL.md`. В планах `refactoring_auth.md` и `refactoring_breeds.md` нет секции `SMOKE`/`SM-*`, поэтому проверены обязательная авторизация из skill и минимальные фактические endpoint'ы auth/breeds.

| # | Endpoint | Method | HTTP | Time | Результат | Примечание |
| --- | --- | --- | --- | --- | --- | --- |
| SM-00 | `/health` | GET | 200 | 1.934 ms | passed | API доступен |
| SM-01 | `/api/auth/token` | POST | 404 | 2.557 ms | failed | endpoint из `credentials.json` отсутствует |
| SM-02 | `/api/auth/verify` | GET | 404 | 2.920 ms | failed | endpoint из skill отсутствует |
| SM-03 | `/api/auth/login` | POST | 200 | 41.419 ms | passed | адаптированный фактический login, cookie установлены |
| SM-04 | `/api/auth/me` | GET | 200 | 24.734 ms | passed | адаптированная проверка текущего пользователя |
| SM-05 | `/api/auth/refresh` | POST | 200 | 22.509 ms | passed | refresh cookie flow работает |
| SM-06 | `/api/horses/breeds?limit=1` | GET | 400 | 33.359 ms | failed | запрос перехвачен horse route, `Лошадь не найдена` |
| SM-07 | `/api/horses/breeds/non-existent-smoke` | GET | 400 | 27.931 ms | passed | service-level not-found для single breed |

Итог SMOKE: `5/8 passed`; mandatory smoke по skill: failed/blocker.

## Замечания и риски

- `services/backend/src/main.py:97` переводит `RequestValidationError` в HTTP 400. Это соответствует текущему коду, но конфликтует с чеклистом Quality Gate, где структурные ошибки должны оставаться 422, а бизнес-ошибки 400. Не блокирую отдельно для auth/breeds, но это архитектурный риск для следующих задач.
- `git status` показывает несвязанные изменения в агентских инструкциях, smoke credentials, plans/reports/tasks. Backend-файлы в `services/backend` не имеют unstaged diff на момент ревью.

## Rework checklist

### Backend

- [ ] Исправить порядок регистрации routers или структуру prefixes так, чтобы `/api/horses/breeds` и `/api/horses/breeds/{slug_or_id}` не перехватывались `/api/horses/{slug_or_id}`.
- [ ] Убрать `try/except InvalidCredentials` из `api/auth.py` или согласовать явный архитектурный exception contract, не нарушающий централизованный mapping.
- [ ] Добавить/актуализировать SMOKE-секцию в планах auth/breeds либо отдельный smoke plan с `SM-*` сценариями.
- [ ] Привести `.claude/skills/api-smoke-test/credentials.json` к фактическому auth endpoint (`/api/auth/login`) или добавить совместимый `/api/auth/token`.
- [ ] Довести unit coverage до объема, заявленного в планах UC01-UC30, либо обновить планы до фактического согласованного объема.

### Frontend

- не требуется

### Quality Gate

- [ ] Повторно запустить `uv run pytest -q`.
- [ ] Повторно запустить targeted black/flake8 для auth/breeds файлов.
- [ ] Повторно запустить `make lint` или зафиксировать согласованное исключение для текущих `src/api/prices.py` mypy ошибок.
- [ ] Прочитать `.claude/skills/api-smoke-test/SKILL.md` и повторно запустить SMOKE с endpoint timings.
- [ ] Убедиться, что `/api/horses/breeds?limit=1` возвращает breeds list, а не horse not-found.
