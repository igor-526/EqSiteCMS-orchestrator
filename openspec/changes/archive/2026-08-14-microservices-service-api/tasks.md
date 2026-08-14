## 1. ENV и конфигурация

- [x] 1.1 Добавить ENV-переменную `SERVICE_KEY` в `services/backend/.env.example` и сгенерировать рандомное значение в `services/backend/.env`
- [x] 1.2 Добавить поле `service_key: str` в класс `Settings` в `services/backend/src/settings.py`
- [x] 1.3 Добавить ENV-переменные `MAIN_BACKEND_URL` и `MAIN_BACKEND_SERVICE_KEY` в `services/notification-service/.env.example`
- [x] 1.4 Добавить ENV-переменные `MAIN_BACKEND_URL` и `MAIN_BACKEND_SERVICE_KEY` в `services/email-service/.env.example`

## 2. Авторизация сервисных эндпоинтов (BE-1)

- [x] 2.1 Создать dependency `get_service_context` в `services/backend/src/depends/services.py`, валидирующий `X-Service-Key` header
- [x] 2.2 Создать exception `InvalidServiceKey` в `services/backend/src/core/exceptions/auth.py`
- [x] 2.3 Зарегистрировать exception handler для `InvalidServiceKey` в `services/backend/src/main.py`
- [x] 2.4 Создать отдельный APIRouter для сервисных эндпоинтов с префиксом `/api/service` в `services/backend/src/main.py`

## 3. Пагинация сервисных эндпоинтов (BE-1)

- [x] 3.1 Создать dependency `get_service_pagination_params` в `services/backend/src/depends/services.py` с валидацией limit (default=100, max=5000) и offset (default=0, min=0)

## 4. Репозиторий пользователей — расширение фильтрации (BE-1)

- [x] 4.1 Расширить `UserRepositoryProtocol` в `services/backend/src/core/protocols/repositories.py` методом `get_users_paginated(equestrian_ids, equestrian_service_keys, roles, limit, offset)`
- [x] 4.2 Реализовать `get_users_paginated` в `services/backend/src/repositories/user.py` с фильтрацией по equestrian_id, equestrian.service_key и user_scopes.scope_name (OR внутри фильтров, AND между фильтрами)

## 5. Сервисный слой пользователей (BE-1)

- [x] 5.1 Добавить метод `get_users_paginated` в `UserService` в `services/backend/src/core/services/users.py`, принимающий фильтры и параметры пагинации, возвращающий `PaginatedEntities[UserOutDto]`

## 6. API-эндпоинт GET /api/service/users (BE-1)

- [x] 6.1 Создать роутер `services/backend/src/api/service_users.py` с эндпоинтом `GET /api/service/users`
- [x] 6.2 Зарегистрировать роутер в `services/backend/src/api/__init__.py` и подключить к сервисному APIRouter в `main.py`
- [x] 6.3 Добавить query-параметры: `equestrian_ids` (list[UUID]), `equestrian_service_keys` (list[str]), `role` (list[str]), `limit` (int), `offset` (int)

## 7. HTTP-клиенты в микросервисах

- [x] 7.1 Создать HTTP-клиент `MainBackendClient` в `services/notification-service/clients/main_backend.py` на aiohttp
- [x] 7.2 Создать HTTP-клиент `MainBackendClient` в `services/email-service/clients/main_backend.py` на aiohttp
- [x] 7.3 Реализовать метод `get_users` в клиентах, принимающий фильтры и возвращающий `PaginatedEntities[UserOutDto]`
- [x] 7.4 Обработать ошибки: `aiohttp.ClientError`, `asyncio.TimeoutError` → кастомные exceptions с описанием проблемы

## 8. Обновление агента backend.md

- [x] 8.1 Добавить секцию «Сервисные эндпоинты» в `agents/backend.md` с описанием X-Service-Key авторизации
- [x] 8.2 Добавить секцию «Пагинация сервисных эндпоинтов» в `agents/backend.md`
- [x] 8.3 Добавить секцию «HTTP-клиенты в микросервисах» в `agents/backend.md` с описанием паттерна `clients/` и обработки ошибок
- [x] 8.4 Добавить секцию «ENV-переменные для межсервисного взаимодействия» в `agents/backend.md`

## 9. Тестирование

- [x] 9.1 Написать unit-тесты для `get_service_context` dependency
- [x] 9.2 Написать unit-тесты для `get_service_pagination_params` dependency
- [x] 9.3 Написать unit-тесты для `UserRepository.get_users_paginated`
- [x] 9.4 Написать unit-тесты для `UserService.get_users_paginated`
- [x] 9.5 Написать интеграционные тесты для `GET /api/service/users` (валидный ключ, невалидный ключ, фильтры, пагинация)

## 10. Quality Gate и финализация

- [x] 10.1 Запустить Quality Gate: проверить diff, тесты, соответствие specs
- [x] 10.2 Устранить findings Quality Gate
- [x] 10.3 Синхронизировать delta specs в main specs
- [x] 10.4 Повторить валидацию
- [x] 10.5 Архивировать change
