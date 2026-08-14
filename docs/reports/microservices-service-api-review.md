# Review: microservices-service-api

**Статус: ✅ APPROVED**
**Дата:** 2026-08-14
**OpenSpec change:** `openspec/changes/microservices-service-api/`

## Итог

Diff соответствует плану. Все тесты прошли. Архитектура не нарушена. Все findings предыдущего Quality Gate устранены.

---

## Тесты

| Команда | Результат | Примечание |
|---------|-----------|------------|
| `make test` | ✅ 873 passed, 5 skipped | pytest 8.4.2 |
| `make lint` | ✅ All checks passed | mypy, flake8, ruff — 0 ошибок |
| `make format` | ✅ All done (205 files unchanged) | black + isort — форматирование корректно |

## Архитектурный чеклист

| # | Проверка | Статус |
|---|----------|--------|
| 1 | `api/` не содержит бизнес-логики | ✅ |
| 2 | `core/services/` зависит от Protocol-контрактов | ✅ |
| 3 | `core/entities/` не импортирует `api/`, `depends/` и т.д. | ✅ |
| 4 | SQLAlchemy tables не импортированы в `core/services/` | ✅ |
| 5 | Depends-assembly: session → repository → service | ✅ |
| 6 | Бизнес-ошибки мапятся через `ClientError` / `InvalidServiceKey` | ✅ |
| 7 | Бизнес-валидация не в InDto | ✅ |

## Access Policy

| Endpoint | Access class | Без ключа | Валидный ключ | Cookie | Equestrian key | Результат |
|----------|-------------|-----------|---------------|--------|----------------|-----------|
| `GET /api/service/users/` | Service Read | 401 | 200 | 401 | 401 | ✅ |
| `GET /api/horses/` | Public/Protected | — | 307 (redirect) | — | — | ✅ (X-Service-Key игнорируется) |

- X-Service-Key изолирован от обычных эндпоинтов ✅
- Cookie не проходит на сервисные эндпоинты ✅
- Equestrian key не проходит на сервисные эндпоинты ✅

## SMOKE-тесты

| # | Endpoint | Method | Access class | Режим | HTTP | Time | Результат |
|---|----------|--------|-------------|-------|------|------|-----------|
| SM-01 | `/api/service/users/` | GET | Service Read | no key (anonymous) | 401 | 13 ms | ✅ |
| SM-02 | `/api/service/users/` | GET | Service Read | invalid key | 401 | 10 ms | ✅ |
| SM-03 | `/api/service/users/` | GET | Service Read | cookie only | 401 | 10 ms | ✅ |
| SM-04 | `/api/service/users/` | GET | Service Read | valid key | 200 | 29 ms | ✅ total=1 |
| SM-05 | `/api/service/users/?equestrian_service_keys=nonexistent` | GET | Service Read | valid key | 200 | 33 ms | ✅ total=0 |
| SM-06 | `/api/service/users/?role=admin` | GET | Service Read | valid key | 200 | 28 ms | ✅ total=0 |
| SM-07 | `/api/service/users/?limit=1&offset=0` | GET | Service Read | valid key | 200 | 28 ms | ✅ items=1 |
| SM-08 | `/api/horses/` | GET | Public | X-Service-Key present | 307 | 8 ms | ✅ (ignored) |
| SM-09 | `/api/service/users/` | GET | Service Read | equestrian key only | 401 | 8 ms | ✅ |

**Итог: 9/9 SMOKE-тестов прошли** ✅

---

## Архитектура реализации

### Backend

| Компонент | Путь | Статус |
|-----------|------|--------|
| Service router | `src/api/service_users.py` | ✅ |
| APIRouter с префиксом `/api/service` | `src/main.py` | ✅ |
| `get_service_context` dependency | `src/depends/services.py` | ✅ |
| `get_service_pagination_params` dependency | `src/depends/services.py` | ✅ |
| `InvalidServiceKey` exception + handler | `src/core/exceptions/auth.py`, `src/main.py` | ✅ |
| `SERVICE_KEY` в Settings | `src/settings.py` | ✅ |
| `SERVICE_KEY` в .env.example | `.env.example` | ✅ |
| `get_users_paginated` — Protocol | `src/core/protocols/repositories/user_repository.py` | ✅ |
| `get_users_paginated` — Repository | `src/repositories/user_repository.py` | ✅ |
| `get_users_paginated` — Service | `src/core/services/users.py` | ✅ |

### Микросервисы

| Компонент | Путь | Статус |
|-----------|------|--------|
| HTTP-клиент notification-service | `src/clients/main_backend/client.py` | ✅ |
| HTTP-клиент email-service | `src/clients/main_backend/client.py` | ✅ |
| ENV: MAIN_BACKEND_URL / MAIN_BACKEND_SERVICE_KEY | `.env.example` (оба сервиса) | ✅ |
| Settings для main_backend | `src/settings.py` (оба сервиса) | ✅ |

### Документация

| Компонент | Статус |
|-----------|--------|
| Секция «Сервисные эндпоинты» в agents/backend.md | ✅ |
| Секция «Пагинация сервисных эндпоинтов» в agents/backend.md | ✅ |
| Секция «HTTP-клиенты в микросервисах» в agents/backend.md | ✅ |
| Секция «ENV-переменные для межсервисного взаимодействия» в agents/backend.md | ✅ |

---

## Устранённые findings предыдущего Quality Gate

| # | Finding | Статус |
|---|---------|--------|
| 1 | Неиспользуемые импорты (F401) | ✅ Устранены — `make lint` чисто |
| 2 | Форматирование не применено | ✅ Устранены — `make format` чисто |
| 3 | Tasks 8.1-8.4 не отмечены | ✅ Устранены — все задачи отмечены в tasks.md |

---

Готово к merge.
