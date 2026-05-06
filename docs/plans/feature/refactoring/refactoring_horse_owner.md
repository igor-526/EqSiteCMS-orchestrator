# План: refactoring horse_owner module

**Тикет:** REFACTORING-HORSE-OWNER
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** draft, требуется согласование пользователя до передачи Backend

---

## Контекст

Модуль `horse_owner` реализует CRUD владельцев и фильтрацию. В `core/schemas/horse_owner.py` есть `field_validator`, который импортирует `ClientError`; бизнес-валидацию телефонов нужно держать в service/entity. API содержит local not-found для single get.

## Цель

Разделить structural DTO validation и бизнес-валидацию владельца, перенести expected not-found в service contract и покрыть функции UC01-UC30.

## Файлы

| Слой | Файлы |
|---|---|
| API | `services/backend/src/api/horse_owner.py` |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/repositories.py` |
| Service | `services/backend/src/core/services/horse_owner.py` |
| Schemas | `services/backend/src/core/schemas/horse_owner.py` |
| Entities | `services/backend/src/core/entities/horse_owner.py` |
| Protocols | `services/backend/src/core/protocols/repositories/horse_owner_repository.py` |
| Repository | `services/backend/src/repositories/horse_owner_repository.py` |
| Tests | `services/backend/tests/unit/core/services/test_horse_owner_service.py`, `services/backend/tests/unit/core/entities/test_horse_owner.py` |

## Что рефакторить

- Убрать expected `HTTPException` из `api/horse_owner.py`, not-found мапить через service `ClientError`.
- Перенести бизнес-проверки phone numbers из DTO validators в entity/service.
- Оставить DTO validators только для структурной формы, если они нужны.
- В `create` мапить entity validation errors в `ClientError`.
- В `update` определить поведение empty payload и partial update.
- Проверить, что `get_by_id` либо остается nullable query helper, либо получает throwing variant для API.
- Для `delete` сохранить проверку existence до side effect.
- Для `get_filtered` покрыть filters/sort/limit/offset pass-through.

## Unit-тесты service functions

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `HorseOwnerService` | `create` | public service function | UC01-UC30 |
| `HorseOwnerService` | `update` | public service function | UC01-UC30 |
| `HorseOwnerService` | `get_by_id` | public service function | UC01-UC30 |
| `HorseOwnerService` | `delete` | public service function | UC01-UC30 |
| `HorseOwnerService` | `get_filtered` | public service function | UC01-UC30 |

### 30 UserCases/EdgeCases на каждую функцию

Каждая функция из таблицы выше получает все сценарии: UC01 happy path; UC02 minimal input; UC03 full input; UC04 omitted optional; UC05 empty value; UC06 whitespace value; UC07 unicode/case; UC08 boundary min; UC09 below min; UC10 boundary max; UC11 above max; UC12 malformed id/slug/token; UC13 not found; UC14 duplicate/conflict; UC15 self-exclusion; UC16 reference validation; UC17 permission allowed; UC18 permission denied; UC19 partial update; UC20 empty update; UC21 repository failure; UC22 dependency order; UC23 rollback intent; UC24 idempotency/retry; UC25 sorting stability; UC26 filtering semantics; UC27 pagination semantics; UC28 serialization/mapping; UC29 structural vs business validation; UC30 architecture boundary.

Для каждой функции раскрыть UC01-UC30 из `refactoring_and_testing_audit.md` отдельными unit-сценариями через fake `HorseOwnerRepositoryProtocol`.

## Чеклист

- [ ] Перенести phone business validation из DTO в service/entity
- [ ] Убрать expected `HTTPException` из router path
- [ ] Уточнить nullable vs throwing get contract
- [ ] Покрыть `create` UC01-UC30
- [ ] Покрыть `update` UC01-UC30
- [ ] Покрыть `get_by_id` UC01-UC30
- [ ] Покрыть `delete` UC01-UC30
- [ ] Покрыть `get_filtered` UC01-UC30
