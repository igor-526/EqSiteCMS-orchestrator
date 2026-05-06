# План: refactoring site_settings module

**Тикет:** REFACTORING-SITE-SETTINGS
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** draft, требуется согласование пользователя до передачи Backend

---

## Контекст

Модуль `site_settings` валидирует typed string values, уникальность key/name, CRUD и фильтрацию. API содержит local not-found для single get, а value validation нужно покрыть детально для всех типов.

## Цель

Сделать validation contract настроек явным, убрать expected router errors и покрыть каждую функцию UC01-UC30.

## Файлы

| Слой | Файлы |
|---|---|
| API | `services/backend/src/api/site_settings.py` |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/repositories.py` |
| Service | `services/backend/src/core/services/site_settings.py` |
| Schemas | `services/backend/src/core/schemas/site_settings.py` |
| Entities | `services/backend/src/core/entities/site_settings.py` |
| Protocols | `services/backend/src/core/protocols/repositories/site_settings_repository.py` |
| Repository | `services/backend/src/repositories/site_settings_repository.py` |
| Tests | `services/backend/tests/unit/core/services/test_site_settings_service.py` |

## Что рефакторить

- Убрать expected `HTTPException` из `api/site_settings.py`, not-found мапить через service `ClientError`.
- Уточнить `_validate_value_by_type` для `number`: сейчас принимает только `int`, название типа может ожидать broader numeric contract; зафиксировать требуемое поведение.
- Для `float`, `boolean`, `object`, `date`, `time`, `datetime` покрыть valid/invalid formats и normalization.
- Проверить `except ValueError` before/after `json.JSONDecodeError`, так как `JSONDecodeError` наследуется от `ValueError`; порядок должен сохранять ожидаемый detail, если это важно.
- В `update` проверить transition `type + value`, type-only update с existing value и value-only update с existing type.
- Определить empty update behavior.
- Проверить self-exclusion для key/name duplicates.
- Для `get_filtered` покрыть list key filters, type filters, sort/limit/offset pass-through.

## Unit-тесты service functions

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `SiteSettingsService` | `_validate_value_by_type` | helper function | UC01-UC30 |
| `SiteSettingsService` | `create` | public service function | UC01-UC30 |
| `SiteSettingsService` | `update` | public service function | UC01-UC30 |
| `SiteSettingsService` | `get_by_id` | public service function | UC01-UC30 |
| `SiteSettingsService` | `delete` | public service function | UC01-UC30 |
| `SiteSettingsService` | `get_filtered` | public service function | UC01-UC30 |

### 30 UserCases/EdgeCases на каждую функцию

Каждая функция из таблицы выше получает все сценарии: UC01 happy path; UC02 minimal input; UC03 full input; UC04 omitted optional; UC05 empty value; UC06 whitespace value; UC07 unicode/case; UC08 boundary min; UC09 below min; UC10 boundary max; UC11 above max; UC12 malformed id/slug/token; UC13 not found; UC14 duplicate/conflict; UC15 self-exclusion; UC16 reference validation; UC17 permission allowed; UC18 permission denied; UC19 partial update; UC20 empty update; UC21 repository failure; UC22 dependency order; UC23 rollback intent; UC24 idempotency/retry; UC25 sorting stability; UC26 filtering semantics; UC27 pagination semantics; UC28 serialization/mapping; UC29 structural vs business validation; UC30 architecture boundary.

Для каждой функции раскрыть UC01-UC30 из `refactoring_and_testing_audit.md` отдельными unit-сценариями через fake `SiteSettingsRepositoryProtocol`.

## Чеклист

- [ ] Убрать expected `HTTPException` из router path
- [ ] Зафиксировать typed value validation contract
- [ ] Уточнить empty update behavior
- [ ] Покрыть `_validate_value_by_type` UC01-UC30
- [ ] Покрыть `create` UC01-UC30
- [ ] Покрыть `update` UC01-UC30
- [ ] Покрыть `get_by_id` UC01-UC30
- [ ] Покрыть `delete` UC01-UC30
- [ ] Покрыть `get_filtered` UC01-UC30
