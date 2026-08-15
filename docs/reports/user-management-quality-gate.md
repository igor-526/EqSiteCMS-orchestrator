# Quality Gate: user-management

**Статус: ❌ REWORK**
**Дата:** 2026-08-14
**OpenSpec Change:** `openspec/changes/user-management/`

---

## Итог

Change `user-management` реализует управление пользователями с ролью USER_MANAGER, soft-delete и блокировкой. Обнаружены **критические проблемы**, блокирующие merge.

---

## 🚨 Критические находки (BLOCKING)

### 1. Missing Export — `UserManagementRepositoryProtocol`

**Файл:** `services/backend/src/core/protocols/repositories/__init__.py`
**Проблема:** `UserManagementRepositoryProtocol` НЕ экспортирован из пакета `core/protocols/repositories/`, хотя используется в:
- `depends/services.py:14` — `from core.protocols.repositories import UserManagementRepositoryProtocol`
- `depends/repositories.py:131` — type annotation в функции `get_user_management_repository`

**Impact:** 
- **11 тестов падают при сборке** с `ImportError: cannot import name 'UserManagementRepositoryProtocol'`
- Приложение не может запуститься (FastAPI не стартует)
- Затронутые тесты: `test_auth_cookie_contract`, `test_cors_middleware`, `test_horse_code_access`, `test_horse_service_relations_access_pagination`, `test_horse_services_filter_api`, `test_route_order`, `test_service_users_api`, `test_short_name_query_contract`, `test_user_management_api`, `test_auth_dependencies`, `test_service_dependencies`

**Исправление:** Добавить в `__init__.py`:
```python
from .user_management_repository import UserManagementRepositoryProtocol
```

---

### 2. Duplicate Method Definition — `get_users_paginated`

**Файл:** `services/backend/src/repositories/user_repository.py`
**Проблема:** Метод `get_users_paginated` определён **дважды**:
- Строка 36: оригинальная версия без `exclude_deleted`/`exclude_blocked`
- Строка 102: новая версия с параметрами `exclude_deleted` и `exclude_blocked`

**Impact:** Python использует вторую определение, первая молча игнорируется. Нарушение принципа DRY, потенциальная путаница при поддержке.

**Исправление:** Удалить первую версию (строки 36-100) или переименовать одну из них.

---

## ⚠️ Проблемы линтинга и форматирования

### 3. Ruff Lint Errors — 19 ошибок

**Файлы с ошибками:**

| Файл | Ошибка | Описание |
|------|--------|----------|
| `api/depends/user_management.py:5` | F401 | `UserScope` imported but unused |
| `api/depends/user_management.py:9` | F401 | `get_user_repository` imported but unused |
| `core/entities/user.py:1` | F401 | `datetime.datetime` imported but unused |
| `core/services/user_management.py:1` | F401 | `datetime` and `timezone` imported but unused |
| `core/services/user_management.py:6` | F401 | `UserScope` imported but unused |
| `repositories/user_management_repository.py:40,89` | E712 | `== False` should use `not` operator |
| `repositories/user_repository.py:102` | F811 | `get_users_paginated` redefined |

**Исправление:** Удалить неиспользуемые импорты, заменить `== False` на `not`.

---

### 4. Backend Formatting — 14 файлов требуют форматирования

```
Would reformat: src/api/depends/user_management.py
Would reformat: src/api/user_management.py
Would reformat: src/core/exceptions/auth.py
Would reformat: src/core/protocols/repositories/user_management_repository.py
Would reformat: src/core/schemas/user_management.py
Would reformat: src/core/services/auth.py
Would reformat: src/core/services/horse.py
Would reformat: src/core/services/user_management.py
Would reformat: src/migration/versions/a1b2c3d4e5f6_add_soft_delete_and_block_to_users.py
Would reformat: src/models/tokens.py
Would reformat: src/repositories/user_management_repository.py
Would reformat: src/repositories/user_repository.py
Would reformat: src/utils/configure_logger.py
Would reformat: src/utils/seeding/init_registry.py
```

**Исправление:** Запустить `cd services/backend && uv run ruff format src/`

---

### 5. Frontend Formatting — 48+ файлов

Prettier обнаружил проблемы в множестве файлов, включая как новые файлы change, так и существующие.

**Исправление:** Запустить `cd services/frontend && npx prettier --write src/`

---

## ✅ Пройденные проверки

### Access Matrix — ВСЕ ENDPOINTS ЗАЩИЩЕНЫ

| Endpoint | Method | Access Class | Dependency | Статус |
|----------|--------|--------------|------------|--------|
| `/api/user-management/users` | GET | Protected | `require_user_management` | ✅ |
| `/api/user-management/users/{id}` | GET | Protected | `require_user_management` | ✅ |
| `/api/user-management/users` | POST | Protected | `require_user_management` | ✅ |
| `/api/user-management/users/{id}` | PATCH | Protected | `require_user_management` | ✅ |
| `/api/user-management/users/{id}` | DELETE | Protected | `require_user_management` | ✅ |
| `/api/user-management/users/{id}/block` | PATCH | Protected | `require_user_management` | ✅ |
| `/api/user-management/users/{id}/unblock` | PATCH | Protected | `require_user_management` | ✅ |
| `/api/user-management/users/{id}/password` | PATCH | Protected | `require_user_management` | ✅ |
| `/api/user-management/roles` | GET | Protected | `require_user_management` | ✅ |

**Dependency `require_user_management`** проверяет:
1. Пользователь не заблокирован
2. Имеет роль `USER_MANAGER` или `SUPERUSER`

✅ Нет публичных GET endpoint'ов в user-management
✅ Нет случайной приватизации публичных GET в service-users

---

### Migration — Корректна

**Файл:** `services/backend/src/migration/versions/a1b2c3d4e5f6_add_soft_delete_and_block_to_users.py`

✅ Добавляет `is_deleted` (boolean, default=false, not null)
✅ Добавляет `deleted_at` (datetime, nullable)
✅ Добавляет `is_blocked` (boolean, default=false, not null)
✅ Создаёт индексы на `is_deleted` и `is_blocked`
✅ Дефолтные значения корректны
✅ Downgrade корректно удаляет поля и индексы

---

### Business Rules — Реализованы в Service Layer

**Файл:** `services/backend/src/core/services/user_management.py`

| Правило | Реализация | Статус |
|---------|------------|--------|
| UM не может удалить/заблокировать самого себя | `if user_id == current_user.id` check | ✅ |
| UM не может снять с себя роль UM | Check в `update_user` | ✅ |
| UM не может назначить SUPERUSER | `if is_um and SUPERUSER_SCOPE in target_scopes` | ✅ |
| UM не может действовать с SUPERUSER | Check в delete/block/unblock/change_password | ✅ |
| SU может всё кроме self-delete/self-block | Proper SU checks | ✅ |

---

### FSD Structure — Корректна

✅ Страница в `src/app/(protected)/users/page.tsx`
✅ Фичи в `src/features/user-management/`
✅ API хуки корректно структурированы (`hooks/useUserManagement.ts`, `hooks/useUserManagementScopes.ts`)
✅ Sidebar кнопка с условной видимостью (`useCanAccessUserManagement`)
✅ Компоненты: `UserManagementTable`, `UserActionsCell`, `UserFormModal`, `ChangePasswordModal`, `ConfirmBlockModal`, `ConfirmDeleteModal`

---

### Service Users Endpoint — Безопасен

**Файл:** `services/backend/src/api/service_users.py`

✅ Требует `X-Service-Key` header
✅ Автоматически исключает `is_deleted=true` и `is_blocked=true`
✅ Не затронут изменениями в user-management API

---

## Чеклист доработки

### Backend (ОБЯЗАТЕЛЬНО)

- [ ] **CRITICAL:** Добавить `UserManagementRepositoryProtocol` в `services/backend/src/core/protocols/repositories/__init__.py`
- [ ] **CRITICAL:** Удалить дубликат метода `get_users_paginated` в `services/backend/src/repositories/user_repository.py`
- [ ] Исправить 19 ruff lint errors (удалить неиспользуемые импорты, заменить `== False` на `not`)
- [ ] Отформатировать 14 файлов: `cd services/backend && uv run ruff format src/`

### Frontend

- [ ] Отформатировать файлы: `cd services/frontend && npx prettier --write src/`

### Quality Gate (после исправлений)

- [ ] Запустить `cd services/backend && uv run ruff check src/` — 0 errors
- [ ] Запустить `cd services/backend && uv run ruff format --check src/` — all formatted
- [ ] Запустить `cd services/backend && uv run pytest tests/unit/ -v` — все тесты проходят
- [ ] Запустить `cd services/frontend && npm run lint` — без новых ошибок
- [ ] Повторно проверить архитектуру (Clean Architecture)
- [ ] Повторно проверить Access Matrix
- [ ] Запустить SMOKE тесты (после запуска backend)

---

## Сводка

| Проверка | Результат |
|----------|-----------|
| Ruff Lint | ❌ 19 ошибок |
| Ruff Format | ❌ 14 файлов |
| Prettier | ❌ 48+ файлов |
| Unit Tests | ❌ 11 collection errors (не могут запуститься) |
| Access Matrix | ✅ Все endpoints защищены |
| Migration | ✅ Корректна |
| Business Rules | ✅ Реализованы |
| FSD Structure | ✅ Корректна |
| Clean Architecture | ⚠️ Невозможно полностью проверить из-за ошибок импорта |

**Статус: ❌ REWORK** — Критические ошибки блокируют merge и запуск тестов.
