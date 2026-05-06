# Review: REFACTORING-AUTH-BREEDS repeat

**Статус: REWORK**
**Дата:** 2026-05-06

## Планы

- `docs/plans/feature/refactoring/refactoring_auth.md`
- `docs/plans/feature/refactoring/refactoring_breeds.md`
- предыдущий отчет: `docs/reports/REFACTORING-AUTH-BREEDS-review.md`

## Итог

Rework частично закрыт: auth smoke skill синхронизирован на `/api/auth/login` и `/api/auth/me`, `api/auth.py` больше не перехватывает `InvalidCredentials`, `breeds_router` зарегистрирован до `horses_router`, route-order regression test проходит.

Approve невозможен: обязательный SMOKE выявил runtime 500 на `GET /api/auth/me` без cookie, а два breeds smoke сценария по существующей породе не могут быть проверены из-за пустой базы (`total=0`).

## Проверенный diff

`git diff --name-only` на момент ревью:

- `.claude/skills/api-smoke-test/SKILL.md`
- `.claude/skills/api-smoke-test/credentials.json`
- `AGENTS.md`
- `CLAUDE.md`
- `Makefile`
- `agents/backend.md`
- `agents/frontend.md`
- `agents/planner.md`
- `agents/quality_gate.md`

`git status --short services/backend docs/plans/feature/refactoring docs/reports` показывает untracked `docs/plans/feature/refactoring/` и `docs/reports/`; tracked diff по `services/backend` отсутствует. Ревью выполнено по фактическому содержимому backend-файлов и работающему API на `http://localhost:8001`.

## Проблемы

1. [SMOKE/API] `services/backend/src/api/auth.py:110` объявляет `response_model=UserOutDto`, но dependency `services/backend/src/depends/services.py:52` возвращает `None`, когда cookie `access_token` отсутствует. Фактический SMOKE `GET /api/auth/me` без cookie вернул `500` с traceback за `2.621 ms`. План `refactoring_auth.md` ожидает текущий контракт `null`/`200` или отдельно согласованное ужесточение до `401`; `500` не является допустимым клиентским контрактом.
2. [SMOKE/DATA] `SM-BR-04` и `SM-BR-05` из `refactoring_breeds.md` требуют существующую породу, но `GET /api/horses/breeds?limit=1` вернул `200`, `total=0`, `items=[]`. Проверить single lookup success и `page_data=true` невозможно без seed/test fixture или явного smoke setup.

## Архитектура

- Auth service зависит от `UserRepositoryProtocol` и `SecurityProtocol`, FastAPI/settings/cookie logic остается в API/DI boundary.
- `api/auth.py` не содержит `try/except InvalidCredentials`; централизованный handler находится в `main.py`.
- Breeds router вызывает service layer, service-level not-found идет через `ClientError`.
- `main.py` регистрирует `breeds_router` раньше `horses_router`, что подтверждено route-order unit test и SMOKE `SM-BR-01`.

## Тесты

- `make lint` из `services/backend`: passed (`uv run mypy src`, `Success: no issues found in 114 source files`)
- `PYTHONPATH=src uv run pytest -q`: `57 passed, 7 warnings`
- `PYTHONPATH=src uv run pytest -q tests/unit/core/services/test_auth_service.py`: `26 passed, 7 warnings`
- `PYTHONPATH=src uv run pytest -q tests/unit/core/services/test_breed_service.py`: `30 passed, 7 warnings`
- `PYTHONPATH=src uv run pytest -q tests/unit/api/test_route_order.py`: `1 passed, 7 warnings`
- `make test` из `services/backend`: not available, `No rule to make target 'test'`

## SMOKE-тесты

Перед запуском прочитан `.claude/skills/api-smoke-test/SKILL.md`. Использованы credentials:

- `base_url`: `http://localhost:8001`
- `auth_endpoint`: `/api/auth/login`
- `cookie_jar`: `/tmp/eqsitecms-smoke-cookies.txt`
- роль: `su`/`superuser`

Первый shell-прогон был заблокирован локальным lookup `curl` внутри zsh function (`command not found: curl`). Повторный прогон выполнен под `bash` с явным `/usr/bin/curl`.

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---:|---|
| SM-AUTH-00 | `/health` | GET | 200 | 2.543 ms | passed |
| SM-AUTH-01 | `/api/auth/login` | POST | 200 | 27.234 ms | passed, cookie jar создан |
| SM-AUTH-02 | `/api/auth/me` | GET | 200 | 24.266 ms | passed, `username=su`, password отсутствует |
| SM-AUTH-03 | `/api/auth/refresh` | POST | 200 | 21.258 ms | passed |
| SM-AUTH-04 | `/api/auth/logout` | POST | 204 | 1.683 ms | passed |
| SM-AUTH-05 | `/api/auth/me` без cookie | GET | 500 | 2.621 ms | failed, traceback в ответе |
| SM-AUTH-06 | `/api/auth/login` неверный пароль | POST | 401 | 26.323 ms | passed, `detail=Неверный логин или пароль` |
| SM-BR-00 | `/health` | GET | 200 | 0.914 ms | passed |
| SM-BR-01 | `/api/horses/breeds?limit=1` | GET | 200 | 19.477 ms | passed, `total=0`, `items_len=0` |
| SM-BR-02 | `/api/horses/breeds?name=smoke&sort=name&limit=1&offset=0` | GET | 200 | 20.475 ms | passed, `total=0`, `items_len=0` |
| SM-BR-03 | `/api/horses/breeds/non-existent-smoke-breed` | GET | 400 | 18.683 ms | passed, `detail=Порода не найдена` |
| SM-BR-04 | `/api/horses/breeds/{existing_slug_or_id}` | GET | BLOCKED | 0 ms | blocked, нет существующей породы в smoke DB |
| SM-BR-05 | `/api/horses/breeds/{existing_slug_or_id}?page_data=true` | GET | BLOCKED | 0 ms | blocked, нет существующей породы в smoke DB |

Итог SMOKE: `10/13 passed`, `1 failed`, `2 blocked`.

## Чеклист доработки

### Backend

- [ ] Исправить контракт `GET /api/auth/me` без cookie: вернуть согласованный клиентский ответ (`200 null` с корректной response model или `401`) вместо `500`.
- [ ] Добавить API/unit regression test на `GET /api/auth/me` без cookie.
- [ ] Обеспечить smoke data/setup для минимум одной породы или скорректировать SMOKE-план так, чтобы `SM-BR-04`/`SM-BR-05` создавали и затем удаляли временную породу.

### Frontend

- [ ] Не требуется.

### Quality Gate

- [ ] Повторно прочитать `.claude/skills/api-smoke-test/SKILL.md`.
- [ ] Повторно запустить `make lint`, targeted tests и полный `PYTHONPATH=src uv run pytest -q`.
- [ ] Повторно запустить SMOKE с endpoint timings; approve возможен только без failed/blocked smoke сценариев.
