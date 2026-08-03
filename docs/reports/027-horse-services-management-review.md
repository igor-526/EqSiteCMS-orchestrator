# Review: 027 horse services management

**Статус:** `APPROVED`
**Дата:** 2026-08-02
**OpenSpec change:** `horse-services-management`

## Ссылки

- Задача: `[docs/tasks/027_horse_services_management.md](../tasks/027_horse_services_management.md)`
- OpenSpec: `openspec/changes/horse-services-management/`

## Краткий контекст

Реализован полный CRUD управления связями лошадь-услуга с override-полями (description, price, price_formatter). Добавлен новый API с 5 эндпоинтами, CMS UI с Drawer и модальным окном, исправлены баги валидации slug/description, обновлены инструкции. Override-подстановка интегрирована в репозиторий лошадей для корректного отображения в `HorseOutDto`.

## Измененные файлы

### Backend (новые)

| Файл | Что изменено |
|------|-------------|
| `services/backend/src/core/schemas/horse_service_relations.py` | DTO: `HorseServiceRelationOutDto`, `CreateDto`, `UpdateDto` |
| `services/backend/src/core/protocols/repositories/horse_service_relations_repository.py` | Protocol для репозитория |
| `services/backend/src/repositories/horse_service_relations_repository.py` | CRUD + `get_available_services` с search |
| `services/backend/src/core/services/horse_service_relations.py` | Бизнес-логика, валидация (уникальность, существование horse/service) |
| `services/backend/src/api/horse_service_relations.py` | 5 endpoints: POST/PATCH/DELETE/GET + available-services |
| `services/backend/tests/unit/core/services/test_horse_service_relations.py` | 14 тестов для сервиса связей |
| `services/backend/tests/unit/repositories/test_horse_repository_override.py` | 7 тестов для override-подстановки |

### Backend (измененные)

| Файл | Что изменено |
|------|-------------|
| `services/backend/src/core/services/horse_service.py` | Автогенерация slug, необязательное описание |
| `services/backend/src/repositories/horse_repository.py` | Override-подстановка в `_build_horse_dto` (is not None) |
| `services/backend/src/depends/repositories.py` | DI для нового репозитория |
| `services/backend/src/depends/services.py` | DI для нового сервиса |
| `services/backend/src/api/__init__.py` | Регистрация роутера |
| `services/backend/src/main.py` | Регистрация роутера + ConflictError handler |
| `services/backend/tests/unit/core/services/test_horse_service_service.py` | 6 тестов для валидации slug/description |

### Frontend (новые)

| Файл | Что изменено |
|------|-------------|
| `services/frontend/src/types/api/horseServiceRelations.ts` | TypeScript типы |
| `services/frontend/src/features/horses/validators/horseServiceRelations.ts` | Zod схемы |
| `services/frontend/src/api/horseServiceRelations.ts` | API клиент (5 функций) |
| `services/frontend/src/features/horses/services/horseServiceRelationsService.ts` | Сервисный слой |
| `services/frontend/src/features/horses/hooks/useHorseServiceRelations.ts` | Хук с CRUD + double submit guard |
| `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationsTable.tsx` | Таблица связанных услуг |
| `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationsDrawer.tsx` | Drawer с таблицей/NoData |
| `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationCreateUpdateModal.tsx` | Модальное окно с Select (серверный поиск) |
| `services/frontend/src/features/horses/ui/HorseServiceRelations/index.ts` | Barrel export |
| `services/frontend/src/features/horses/hooks/useHorseServiceRelations.test.ts` | 12 тестов хука |
| `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationsDrawer.test.tsx` | 11 тестов Drawer |
| `services/frontend/src/features/horses/ui/HorseServiceRelations/HorseServiceRelationCreateUpdateModal.test.tsx` | 12 тестов модального окна |

### Frontend (измененные)

| Файл | Что изменено |
|------|-------------|
| `services/frontend/src/types/api/horses.ts` | Добавлено `services?: HorseServiceOutDto[]` в HorseOutDto |
| `services/frontend/src/features/horses/ui/Horses/HorsesTable.tsx` | Кнопка «Услуги» с Badge + DollarOutlined |
| `services/frontend/src/app/(protected)/horses/page.tsx` | Состояние, обработчики, рендер Drawer/Modal |
| `services/frontend/src/features/horses/ui/HorseServices/HorseServicesCreateUpdateModal.tsx` | `normalizeOptional` для пустых строк |
| `services/frontend/src/features/horses/hooks/useHorseServices.ts` | Использование Zod-валидированных данных |
| `services/frontend/src/features/horses/ui/HorsesUserDocumentationView.tsx` | Секция 9: Услуги лошади |
| `services/frontend/src/features/horses/ui/HorsesDeveloperDocumentationView.tsx` | Секция 7: API связей |

## Unit / Integration тесты

| Команда | Результат | Примечание |
|---------|-----------|------------|
| `PYTHONPATH=src uv run pytest -s -vv tests/unit` | `passed` | 792 passed, 5 skipped |
| `uv run mypy src` | `passed` | 145 source files, clean |
| `uv run isort src && uv run black src` | `passed` | форматирование корректно |
| `npx vitest run` | `passed` | 358 passed, 39 test files |

## Access verification

| Endpoint | Method | Access class | Anonymous | Auth + scope | No scope |
|----------|--------|-------------|-----------|--------------|----------|
| `/api/horses/{horse_id}/services` | POST | Protected Write | 401 | 201 | 403 |
| `/api/horses/{horse_id}/services/{relation_id}` | PATCH | Protected Write | 401 | 200 | 403 |
| `/api/horses/{horse_id}/services/{relation_id}` | DELETE | Protected Write | 401 | 204 | 403 |
| `/api/horses/{horse_id}/services` | GET | Public Read | 200 (tenant key) | 200 | — |
| `/api/horses/{horse_id}/available-services?search=` | GET | Protected Read | 401 | 200 | 403 |

Scopes: `SUPERUSER`, `ADMIN`, `DEVELOPER`. Исключений из access policy нет.

## Override-подстановка

| Scenario | Result |
|----------|--------|
| Лошадь с `price_override=600000` | `HorseOutDto.services[].price = 600000` |
| Лошадь без override | Дефолтные значения услуги |
| `or` → `is not None` fix | Пустые строки корректно обрабатываются |

## Frontend test gate

- `npx vitest run`: **39 files, 358 tests passed** (включая 35 новых для связей)
- `npx eslint src`: **0 errors** (396 pre-existing warnings)
- `npx tsc --noEmit`: **passed**
- MSW/jsdom покрывают: success, empty, validation, 401/403, server search, double submit
- Scope-aware UX: `canManageHorseServices` guards add button + row click

## UI verification

| Scenario | Status |
|----------|--------|
| Кнопка «Услуги» с badge | ✓ |
| Drawer с таблицей/NoData | ✓ |
| Select с серверным поиском | ✓ |
| Модальное окно создания | ✓ |
| Модальное окно редактирования/удаления | ✓ |
| Double submit protection (useRef) | ✓ |
| Scope-aware UX | ✓ |
| Consumer isolation (site-ad не изменён) | ✓ |

## Инструкции

- User docs: секция «Услуги лошади» — workflow добавления/редактирования/удаления связей
- Developer docs: секция «Связи лошадь-услуга» — API reference для 5 endpoints + curl examples

## Замечания и риски

- Нет batch-обновления связей (по design: не требуется)
- `HorseServiceRelations` не имеет `equestrian_id` — tenant scoping через horse validation
- Паттерн `or` vs `is not None` для optional override полей — потенциальный риск в другой подстановке

## Quality Gate findings (resolved)

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 1 | Double submit protection отсутствует | Major | useRef guard + submitting prop |
| 2 | `or` вместо `is not None` в override | Minor | Заменено на `is not None` |
| 3 | Нет frontend тестов для компонентов | Minor | 35 новых тестов добавлено |
| 4 | Инструкции не обновлены | Minor | User + Developer docs обновлены |
