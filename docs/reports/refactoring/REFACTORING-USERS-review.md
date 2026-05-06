# Review: REFACTORING-USERS

**Статус: ✅ APPROVED**
**Дата:** 2026-05-06
**Ветка:** feature/refactoring-testing-audit

---

## Контекст

- План: `docs/plans/feature/refactoring/refactoring_users.md`
- Сервис: `services/backend`
- Scope задачи: service boundary для `UserService.get_users` и защита от утечки приватных полей.

---

## Проверенные файлы

- `services/backend/src/core/services/users.py`
- `services/backend/src/core/schemas/users.py`
- `services/backend/src/core/entities/user.py`
- `services/backend/src/core/protocols/repositories/user_repository.py`
- `services/backend/tests/unit/core/services/test_user_service.py`
- `docs/plans/feature/refactoring/refactoring_users.md`

---

## Итог

По `REFACTORING-USERS` подтверждено выполнение ключевого контракта плана:

- `UserService.get_users` работает только через `UserRepositoryProtocol`, без зависимости от FastAPI/ORM concrete layers.
- Возврат из сервиса приведен к `UserOutDto`, поэтому приватное поле `password` не отдается наружу.
- Unit-набор для `get_users` покрывает UC01-UC30 и проверяет как позитивные сценарии, так и boundary/ошибочные случаи.
- Порядок взаимодействия с репозиторием и стабильность mapping подтверждены через `FakeUserRepository`.

Блокеров в пределах проверенного scope не выявлено.

---

## Проверки

- `PYTHONPATH=src uv run pytest -q tests/unit/core/services/test_user_service.py -W error` в `services/backend`: ✅ 30 passed
- `uv run mypy src/core/services/users.py src/core/schemas/users.py tests/unit/core/services/test_user_service.py` в `services/backend`: ✅ Success: no issues found
- `uv run mypy src tests/unit` в `services/backend`: ✅ Success: no issues found in 129 source files
- `make test` в `services/backend`: ⚠️ target отсутствует (`Нет правила для сборки цели "test"`)

---

## SMOKE-тесты

Проверка smoke выполнена по добавленной секции `SM-US-*` в `docs/plans/feature/refactoring/refactoring_users.md` через `.claude/skills/api-smoke-test/SKILL.md`.

Итог: **9/9 passed**. `SMOKE_USERNAME=smoke_user_20260506174108`.

| ID | Endpoint | Status | Time, ms | Result |
|---|---|---:|---:|---|
| SM-US-01 | `POST /api/auth/login` | 200 | 46.1 | cookie saved |
| SM-US-02 | `GET /api/auth/me` | 200 | 53.5 | `UserOutDto`, no `password` |
| SM-US-03 | `GET /api/auth/me` без cookie | 401 | 7.7 | unauthorized |
| SM-US-04 | `POST /api/auth/register` | 200 | 51.6 | unique smoke user created, no `password` |
| SM-US-05 | `POST /api/auth/register` duplicate | 400 | 40.0 | duplicate rejected |
| SM-US-06 | `POST /api/auth/login` new user | 200 | 30.5 | new user cookie saved |
| SM-US-07 | `GET /api/auth/me` new user | 200 | 28.5 | username matches smoke user |
| SM-US-08 | `POST /api/auth/logout` | 204 | 12.3 | cookie jar updated from logout response |
| SM-US-09 | `GET /api/auth/me` after logout | 401 | 10.5 | unauthorized after logout |

Примечание: созданные smoke users не удаляются через HTTP, потому что публичного delete-user API нет; сценарий идемпотентен за счет уникального suffix.

---

## Замечания и риски

- `make test` не стандартизирован в `services/backend`; используется прямой запуск `pytest`.
