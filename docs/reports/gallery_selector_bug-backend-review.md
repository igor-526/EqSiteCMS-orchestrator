# Review: gallery_selector_bug backend

**Статус: ✅ APPROVED**  
**Дата:** 2026-05-17  
**Сервис:** `services/backend`

## Итог

Backend diff по URL фотографий лошадей соответствует плану `docs/plans/bugfix/gallery_selector_bug.md`. Rework по `isort` проверен: предыдущие style findings сняты.

`HorseRepository` больше не собирает `/media/{path}` через backend domain, а получает `PhotoUrlBuilderProtocol` через DI и использует общий S3 URL builder в horse-read DTO. Live `GET /api/horses` вернул 9 photo URLs вида `http://localhost:9000/gallery/<file>`.

## Scope review

Основной backend scope:

- `services/backend/src/repositories/horse_repository.py`
- `services/backend/src/depends/repositories.py`
- `services/backend/tests/unit/repositories/test_horse_repository.py`
- `services/backend/tests/unit/depends/test_s3_wiring.py`

Unrelated backend worktree changes не откатывались и не входят в основной scope:

- `services/backend/src/api/auth.py`
- `services/backend/src/depends/services.py`
- `services/backend/tests/unit/depends/test_auth_dependencies.py`
- `services/backend/tests/unit/api/test_auth_cookie_contract.py`

## Findings

Блокирующих findings нет.

Предыдущие rework findings закрыты:

- ✅ `services/backend/src/repositories/horse_repository.py` import order исправлен.
- ✅ `services/backend/tests/unit/repositories/test_horse_repository.py` локальные импорты разделены пустой строкой.

## Архитектура

- ✅ `HorseRepository` принимает `PhotoUrlBuilderProtocol` через конструктор и не импортирует `settings`.
- ✅ `depends/repositories.py` собирает `session -> repository` и прокидывает `get_photo_url_builder`.
- ✅ API routers не менялись в scoped diff; бизнес-логика не добавлялась в `api/`.
- ✅ `GET /api/horses`, `GET /api/horses/{slug_or_id}` и `GET /api/horses/{horse_id}/pedigree/{mode}` остаются на `get_read_equestrian_context`.
- ✅ `POST /api/horses/{horse_id}/photos` остаётся Protected Write через `get_current_user` и `get_protected_equestrian_context`.

## Access Verification Results

| Endpoint / flow | Access class | Результат |
|---|---|---|
| `GET /api/horses` | Public Read, anonymous no-cookie with tenant service key | ✅ `200`, 138.345 ms, `X-Equestrian-Service-Key: default-equestrian`; response contains S3-style photo URLs |
| `GET /api/horses` | Anonymous no-cookie without tenant key | ✅ `400`, 11.509 ms, `{"detail":"Отсутствует X-Equestrian-Service-Key"}`; auth cookie не требуется, tenant key contract сохранён |
| `GET /api/horses/{horse_id}/pedigree/sire` | Public Read, anonymous no-cookie with tenant service key | ✅ `200`, 46.649 ms |
| `POST /api/horses/{horse_id}/photos` | Protected Write | ✅ no-cookie check returned `401`, 2.459 ms |

## Тесты и команды

| Команда | Результат |
|---|---|
| `git diff --check -- src/repositories/horse_repository.py src/depends/repositories.py tests/unit/repositories/test_horse_repository.py tests/unit/depends/test_s3_wiring.py` | ✅ clean |
| `uv run isort --check-only src tests` | ✅ passed |
| `PYTHONPATH=src uv run pytest -q tests/unit/repositories/test_horse_repository.py tests/unit/depends/test_s3_wiring.py` | ✅ 8 passed |
| `PYTHONPATH=src uv run pytest -q tests/unit/repositories/test_horse_repository.py tests/unit/depends/test_s3_wiring.py tests/unit/core/services/test_horse_service.py tests/unit/core/services/test_horse_service_service.py` | ✅ 110 passed |
| `PYTHONPATH=src uv run pytest -q tests/unit` | ✅ 593 passed, 5 skipped |
| `uv run ruff check src/repositories/horse_repository.py src/depends/repositories.py tests/unit/repositories/test_horse_repository.py tests/unit/depends/test_s3_wiring.py` | ✅ All checks passed |
| `uv run ruff check src tests` | ✅ All checks passed |
| `uv run black --check src/repositories/horse_repository.py src/depends/repositories.py tests/unit/repositories/test_horse_repository.py tests/unit/depends/test_s3_wiring.py` | ✅ 4 files would be left unchanged |
| `uv run mypy src` | ✅ Success: no issues found in 135 source files |
| `uv run flake8` | ✅ no output, exit code 0 |

`make format` / root `make lint` were not executed because they contain mutating steps (`isort`, `black`, and `ruff check --fix`), while this Quality Gate was limited to no runtime-code changes. Equivalent non-mutating checks passed.

## SMOKE-тесты

`.claude/skills/api-smoke-test/SKILL.md` прочитан. Формальный smoke scenario из skill не может быть извлечён, потому что `docs/plans/bugfix/gallery_selector_bug.md` не содержит `SMOKE` section, variables или test table.

Вместо этого выполнены live API smoke/access checks для изменённой horse-read поверхности и Protected Write no-cookie contract:

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---|---|
| SM-ADHOC-01 | `/api/horses` | GET | 400 | 11.509 ms | ✅ no cookie, no tenant key: auth not required, tenant key error |
| SM-ADHOC-02 | `/api/horses` | GET | 200 | 138.345 ms | ✅ no cookie, `X-Equestrian-Service-Key: default-equestrian`; S3-style photo URLs present |
| SM-ADHOC-03 | `/api/horses/{horse_id}/pedigree/sire` | GET | 200 | 46.649 ms | ✅ no cookie, `X-Equestrian-Service-Key: default-equestrian` |
| SM-ADHOC-04 | `/api/horses/{horse_id}/photos` | POST | 401 | 2.459 ms | ✅ Protected Write rejects no-cookie request |

## Рекомендуемая ветка

`bugfix/gallery-selector-bug`

## Финальный статус

✅ APPROVED. Diff готов к merge после обычного контроля PR/ветки и отдельного review unrelated auth/cookie изменений.
