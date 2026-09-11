## Why

CMS API управления пользователями сейчас возвращает и позволяет адресовать пользователей любых конюшен, хотя оператор должен работать только внутри конюшни, к которой принадлежит сам. Это нарушает tenant isolation и делает чтение и опасные административные операции межтенантными.

## What Changes

- Ограничить `GET /api/user-management/users` конюшней (`equestrian_id`) текущего авторизованного пользователя с сохранением фильтров, сортировки, пагинации и корректного `total`.
- Защитить `GET /api/user-management/users/{id}`, `PATCH`/`DELETE` и специальные mutation endpoint'ы (`block`, `unblock`, `password`) от чтения или изменения пользователя другой конюшни.
- Запретить `POST /api/user-management/users` создавать пользователя для конюшни, отличной от конюшни текущего оператора; клиентский `equestrian_id` не может расширять tenant boundary.
- Сохранить существующее требование роли `USER_MANAGER` или `SUPERUSER`: роль не даёт глобального межтенантного доступа.
- Добавить регрессионные unit- и live smoke-проверки tenant isolation и полный аудит access matrix затронутых endpoint'ов.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `user-management-api`: все операции CMS user-management становятся tenant-scoped по `current_user.equestrian_id`; уточняется поведение при попытке доступа к чужому tenant и access matrix.

## Impact

- Backend Core: `services/backend/src/core/protocols/repositories/user_management_repository.py`, `services/backend/src/repositories/user_management_repository.py`, `services/backend/src/core/services/user_management.py` и их unit-тесты.
- API: контракт методов под `/api/user-management/users`; пути и HTTP-методы не меняются, но межтенантные обращения перестают раскрывать наличие чужого пользователя и возвращают `404`, а cross-tenant create возвращает `403`.
- База данных: миграции и изменение схемы не требуются; используется существующая колонка `users.equestrian_id`.
- Frontend, NATS и межсервисные контракты не изменяются.
