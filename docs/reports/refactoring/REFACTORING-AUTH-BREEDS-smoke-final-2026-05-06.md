# Review: REFACTORING-AUTH-BREEDS smoke final

**Статус: APPROVED**
**Дата:** 2026-05-06

## Планы

- `docs/plans/feature/refactoring/refactoring_auth.md`
- `docs/plans/feature/refactoring/refactoring_breeds.md`
- предыдущий smoke report: `docs/reports/REFACTORING-AUTH-BREEDS-smoke-retest-2026-05-06.md`

## Итог

Повторный Quality Gate / SMOKE выполнен после исправления `GET /api/auth/me`
без cookie. Блокер предыдущего ретеста снят: endpoint возвращает `401`
через централизованный handler, без `ResponseValidationError`.

Итог SMOKE: `13/13 passed`, `0 failed`, `0 blocked`.

Готово к merge в рамках backend auth/breeds refactoring.

## Проверка

Перед проверкой прочитаны:

- `agents/quality_gate.md`
- `agents/backend.md`
- `.claude/skills/api-smoke-test/SKILL.md`

Использованы credentials из `.claude/skills/api-smoke-test/credentials.json`:

- `base_url`: `http://localhost:8001`
- `auth_endpoint`: `/api/auth/login`
- `cookie_jar`: `/tmp/eqsitecms-smoke-cookies.txt`
- роль: `superuser` / `su`

## Измененные файлы / diff

Backend diff по `services/backend` на момент проверки отсутствует в `git diff`.
Проверены текущие релевантные файлы:

- `services/backend/src/depends/services.py`
- `services/backend/tests/unit/depends/test_auth_dependencies.py`
- `services/backend/src/api/auth.py`
- `services/backend/src/core/services/auth.py`
- `services/backend/src/main.py`

В рабочем дереве есть несвязанные изменения в агентских/документационных файлах
и untracked `docs/plans/feature/`, `docs/reports/`; они не относятся к backend
runtime diff этого Quality Gate.

## Unit / Lint

- `uv run pytest -q` в `services/backend`: `213 passed, 5 skipped, 7 warnings in 0.77s`
- `make lint` в `services/backend`: `uv run mypy src` -> success, `116 source files`

## Архитектура

- `get_current_user` в `depends/services.py` не возвращает `None` при отсутствии
  `access_token`, а выбрасывает `InvalidCredentials`.
- `api/auth.py` не содержит локального `try/except InvalidCredentials`; endpoint
  `/api/auth/me` остается тонким роутером с dependency.
- `main.py` содержит централизованный handler `InvalidCredentials` -> HTTP `401`.
- Бизнес-логика остается в `core/services/auth.py`; роутер не содержит SQL или
  прямого создания repository/service.

## SMOKE-тесты

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---:|---|
| SM-AUTH-00 | `/health` | GET | 200 | 2.197 ms | passed, API доступен |
| SM-AUTH-01 | `/api/auth/login` | POST | 200 | 29.797 ms | passed, установлены `access_token` и `refresh_token` cookie |
| SM-AUTH-02 | `/api/auth/me` с cookie | GET | 200 | 27.497 ms | passed, JSON содержит `username`, `password` отсутствует |
| SM-AUTH-03 | `/api/auth/refresh` с cookie | POST | 200 | 26.295 ms | passed, refresh cookies установлены |
| SM-AUTH-04 | `/api/auth/logout` с cookie | POST | 204 | 2.055 ms | passed, auth cookies удаляются через `Max-Age=0` |
| SM-AUTH-05 | `/api/auth/me` без cookie | GET | 401 | 6.200 ms | passed, нет `ResponseValidationError` / 500 |
| SM-AUTH-06 | `/api/auth/login` с неверным паролем | POST | 401 | 41.315 ms | passed, `detail=Неверный логин или пароль` |
| SM-BR-00 | `/health` | GET | 200 | 1.408 ms | passed |
| SM-BR-01 | `/api/horses/breeds?limit=1` | GET | 200 | 25.638 ms | passed, `total=31`, `items_len=1` |
| SM-BR-02 | `/api/horses/breeds?name=smoke&sort=name&limit=1&offset=0` | GET | 200 | 25.845 ms | passed, `total=1`, `items_len=1` |
| SM-BR-03 | `/api/horses/breeds/non-existent-smoke-breed` | GET | 400 | 28.680 ms | passed, `detail=Порода не найдена` |
| SM-BR-04 | `/api/horses/breeds/smoke-test-breed` | GET | 200 | 31.085 ms | passed, DTO без `page_data` |
| SM-BR-05 | `/api/horses/breeds/smoke-test-breed?page_data=true` | GET | 200 | 40.667 ms | passed, `page_data` присутствует |

## Рекомендация

APPROVED.
