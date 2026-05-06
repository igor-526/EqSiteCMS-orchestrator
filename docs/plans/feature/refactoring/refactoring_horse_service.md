# План: refactoring horse_service module

**Тикет:** REFACTORING-HORSE-SERVICE
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** in progress (rework после Quality Gate, изменения внесены в рабочее дерево)

---

## Контекст

Модуль `horse_service` описывает справочник услуг для лошадей: CRUD, slug-or-id lookup, unique `name`/`slug`, default `page_data`, фильтрацию. API содержит local not-found через `HTTPException`.

## Цель

Сделать `HorseServiceService` единственным местом бизнес-валидации справочника услуг и покрыть все функции UC01-UC30.

## Файлы

| Слой | Файлы |
|---|---|
| API | `services/backend/src/api/horse_service.py` |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/repositories.py` |
| Service | `services/backend/src/core/services/horse_service.py` |
| Schemas | `services/backend/src/core/schemas/horse_service.py` |
| Entities | `services/backend/src/core/entities/horse_service.py`, `services/backend/src/core/entities/base.py` |
| Protocols | `services/backend/src/core/protocols/repositories/horse_service_repository.py` |
| Repository | `services/backend/src/repositories/horse_service_repository.py` |
| Tests | `services/backend/tests/unit/core/services/test_horse_service_service.py` |

## Что рефакторить

- Убрать expected `HTTPException` из `api/horse_service.py`, not-found мапить через service `ClientError`.
- Убрать локальные imports `_generate_slug` внутри методов.
- Явно определить empty update payload behavior.
- Проверить duplicate `name` и `slug` collision с self-exclusion.
- Проверить default `page_data` в service/entity boundary.
- Для `_ensure_unique_slug` покрыть suffix loop и repository call order.
- Для `get_filtered` покрыть сортировку по `price` и остальные pass-through параметры.
- Сверить naming collision `HorseServiceService` с модулем `horse.HorseService`; при реализации не менять публичное имя без отдельного согласования.

## Unit-тесты service functions

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `HorseServiceService` | `_parse_slug_or_id` | helper function | UC01-UC30 |
| `HorseServiceService` | `_ensure_unique_slug` | helper function | UC01-UC30 |
| `HorseServiceService` | `create` | public service function | UC01-UC30 |
| `HorseServiceService` | `update` | public service function | UC01-UC30 |
| `HorseServiceService` | `get_by_slug_or_id` | public service function | UC01-UC30 |
| `HorseServiceService` | `delete` | public service function | UC01-UC30 |
| `HorseServiceService` | `get_filtered` | public service function | UC01-UC30 |

### 30 UserCases/EdgeCases на каждую функцию

Каждая функция из таблицы выше получает все сценарии: UC01 happy path; UC02 minimal input; UC03 full input; UC04 omitted optional; UC05 empty value; UC06 whitespace value; UC07 unicode/case; UC08 boundary min; UC09 below min; UC10 boundary max; UC11 above max; UC12 malformed id/slug/token; UC13 not found; UC14 duplicate/conflict; UC15 self-exclusion; UC16 reference validation; UC17 permission allowed; UC18 permission denied; UC19 partial update; UC20 empty update; UC21 repository failure; UC22 dependency order; UC23 rollback intent; UC24 idempotency/retry; UC25 sorting stability; UC26 filtering semantics; UC27 pagination semantics; UC28 serialization/mapping; UC29 structural vs business validation; UC30 architecture boundary.

Для каждой функции раскрыть UC01-UC30 из `refactoring_and_testing_audit.md` отдельными unit-сценариями через fake `HorseServiceRepositoryProtocol`.

## Фактическое покрытие UC (rework)

Ниже указано **честное текущее состояние**: покрыт не полный набор UC01-UC30 для каждой функции, а приоритетный поднабор для бизнес-границы сервиса.

| Функция | Покрытые UC (по текущим unit-тестам) | Статус |
|---|---|---|
| `_parse_slug_or_id` | UC01, UC12 | частично |
| `_ensure_unique_slug` | UC14, UC15, UC22 | частично |
| `create` | UC01, UC03, UC05, UC06, UC09, UC14, UC21, UC22 | частично |
| `update` | UC01, UC13, UC14, UC15, UC19, UC20, UC21, UC22 | частично |
| `get_by_slug_or_id` | UC01, UC13, UC21 | частично |
| `delete` | UC01, UC13, UC21 | частично |
| `get_filtered` | UC01, UC09, UC21, UC25, UC26, UC27, UC29 | частично |

## Чеклист

- [x] Убрать expected `HTTPException` из router path
- [x] Уточнить empty update behavior (`update` возвращает `ClientError` при пустом payload)
- [ ] Покрыть `_parse_slug_or_id` UC01-UC30 (сейчас: UC01, UC12)
- [ ] Покрыть `_ensure_unique_slug` UC01-UC30 (сейчас: UC14, UC15, UC22)
- [ ] Покрыть `create` UC01-UC30 (сейчас: UC01, UC03, UC05, UC06, UC09, UC14, UC21, UC22)
- [ ] Покрыть `update` UC01-UC30 (сейчас: UC01, UC13, UC14, UC15, UC19, UC20, UC21, UC22)
- [ ] Покрыть `get_by_slug_or_id` UC01-UC30 (сейчас: UC01, UC13, UC21)
- [ ] Покрыть `delete` UC01-UC30 (сейчас: UC01, UC13, UC21)
- [ ] Покрыть `get_filtered` UC01-UC30 (сейчас: UC01, UC09, UC21, UC25, UC26, UC27, UC29)
