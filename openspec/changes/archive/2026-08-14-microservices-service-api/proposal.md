## Почему

Микросервисы EqSiteCMS (notification-service, email-service и будущие) взаимодействуют с основным backend как по NATS Jetstream, так и по HTTP API. Для HTTP-запросов необходимо стандартизировать способ авторизации и набор сервисных эндпоинтов, изолированных от обычных пользовательских/Consumer-запросов. Без этого каждый сервис будет реализовывать собственную логику получения данных, дублировать код или обращаться к «чужим» endpoint-ам напрямую.

## Что изменяется

- Добавляется новый уровень авторизации для сервисных эндпоинтов — заголовок `X-Service-Key`.
- Все сервисные эндпоинты выносятся под единый префикс `/api/service/` и недоступны через cookie/equestrian key-авторизацию.
- Реализуется первый сервисный эндпоинт `GET /api/service/users` — пагинированный список пользователей с фильтрацией по конюшням и ролям.
- Стандартизируются правила пагинации сервисных эндпоинтов (limit/offset, default 100, max 5000).
- В backend добавляется ENV-переменная `SERVICE_KEY`; в микросервисы — `MAIN_BACKEND_URL` и `MAIN_BACKEND_SERVICE_KEY`.
- Добавляется инфраструктурный HTTP-клиент (`aiohttp`) в микросервисы для обращения к backend через папку `clients/`.
- Все ошибки HTTP-клиента обрабатываются: вместо 502 возвращается 500 с описанием проблемы.
- Дорабатывается агент `backend.md` — добавляются правила сервисных эндпоинтов.

## Capabilities

### New Capabilities

- `service-endpoint-auth`: Авторизация сервисных эндпоинтов через `X-Service-Key`, middleware-валидация, изоляция от cookie/equestrian-авторизации.
- `service-users`: Пагинированный `GET /api/service/users` с фильтрами `equestrian_ids`, `equestrian_service_keys`, `role` (логика OR внутри, AND между фильтрами).
- `service-paging`: Стандартизированная пагинация сервисных эндпоинтов: limit/offset, default limit=100, max limit=5000, поле `total` для индикации наличия следующей страницы.
- `service-env-and-clients`: ENV-переменные SERVICE_KEY (backend), MAIN_BACKEND_URL и MAIN_BACKEND_SERVICE_KEY (микросервисы), HTTP-клиент aiohttp в `clients/`, обработка ошибок.

### Modified Capabilities

Отсутствуют: сервисные эндпоинты — полностью новая capability, не затрагивает существующие спецификации.

## Impact

- **Backend (`services/backend`):**
  - `src/settings.py` — новая ENV `SERVICE_KEY`.
  - `src/api/` — новый роутер `service/` с подроутерами.
  - `src/depends/services.py` — новый dependency `get_service_context` для валидации `X-Service-Key`.
  - `src/core/services/users.py` — новый метод `get_users_paginated` с фильтрацией.
  - `src/repositories/` — расширение UserRepository для фильтрации по equestrian_id, service_key и scope_name.
- **Микросервисы (`notification-service`, `email-service`):**
  - `.env`, `.env.example` — ENV-переменные `MAIN_BACKEND_URL`, `MAIN_BACKEND_SERVICE_KEY`.
  - `clients/` — новый HTTP-клиент на aiohttp к основному backend.
  - `core/` — обработка ошибок клиента.
- **Агенты:**
  - `agents/backend.md` — новые секции: «Сервисные эндпоинты», «X-Service-Key авторизация», «Пагинация сервисных эндпоинтов».
