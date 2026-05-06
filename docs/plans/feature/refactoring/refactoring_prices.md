# План: refactoring prices module

**Тикет:** REFACTORING-PRICES
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** draft, требуется согласование пользователя до передачи Backend

---

## Контекст

Модуль `prices` содержит два сервиса: `PriceGroupService` и `PriceService`. Самое крупное нарушение находится в `api/prices.py`: router напрямую получает repository protocols, enrich-ит цены связями, сортирует фото, собирает DTO и читает settings для URL.

## Цель

Перенести price enrichment/use cases из API в сервисный слой или presenter boundary, оставить роутеры тонкими и покрыть обе service classes UC01-UC30.

## Файлы

| Слой | Файлы |
|---|---|
| API | `services/backend/src/api/prices.py` |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/repositories.py` |
| Service | `services/backend/src/core/services/prices.py` |
| Schemas | `services/backend/src/core/schemas/prices.py`, `services/backend/src/core/schemas/photos.py` |
| Entities | `services/backend/src/core/entities/prices.py`, `services/backend/src/core/entities/price.py`, `services/backend/src/core/entities/photos.py` |
| Protocols | `services/backend/src/core/protocols/repositories/price_repository.py`, `photo_repository.py`, новый URL builder protocol при реализации |
| Repository | `services/backend/src/repositories/price_repository.py`, `photo_repository.py` |
| Tests | `services/backend/tests/unit/core/services/test_price_group_service.py`, `services/backend/tests/unit/core/services/test_price_service.py` |

## Что рефакторить

- Удалить `_enrich_price_with_relations` из API или превратить его в service/presenter method без repository injection в router.
- Убрать `get_price_repository`, `get_price_group_repository`, `get_photo_repository` из price endpoints; роутер получает только `PriceService`/`PriceGroupService`.
- Убрать settings URL building из `api/prices.py`; использовать URL builder protocol/adapter.
- Перенести not-found для single group/price из API в service-level `ClientError` contract.
- В `PriceService.create/update` проверять все group ids до persistence/update relation side effects.
- В `update_price_photos` проверять main photo membership и existence до `set_price_photos`.
- Зафиксировать order/rollback intent для create price + set groups и update price + set groups.
- Уточнить empty update behavior для `PriceGroupService.update` и `PriceService.update`.
- Проверить slug-or-id parsing: сейчас UUID приводится к `str(parsed)` перед repository call, сверить с protocol contract `str | UUID`.
- Покрыть relation sorting: main photo first, stable order при одинаковых ключах.

## Unit-тесты PriceGroupService

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `PriceGroupService` | `_ensure_unique_name` | helper function | UC01-UC30 |
| `PriceGroupService` | `create` | public service function | UC01-UC30 |
| `PriceGroupService` | `update` | public service function | UC01-UC30 |
| `PriceGroupService` | `get_by_id` | public service function | UC01-UC30 |
| `PriceGroupService` | `delete` | public service function | UC01-UC30 |
| `PriceGroupService` | `get_filtered` | public service function | UC01-UC30 |

## Unit-тесты PriceService

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `PriceService` | `_parse_slug_or_id` | helper function | UC01-UC30 |
| `PriceService` | `_ensure_unique_name` | helper function | UC01-UC30 |
| `PriceService` | `_ensure_unique_slug` | helper function | UC01-UC30 |
| `PriceService` | `create` | public service function | UC01-UC30 |
| `PriceService` | `update` | public service function | UC01-UC30 |
| `PriceService` | `get_by_slug_or_id` | public service function | UC01-UC30 |
| `PriceService` | `delete` | public service function | UC01-UC30 |
| `PriceService` | `get_filtered` | public service function | UC01-UC30 |
| `PriceService` | `update_price_photos` | public service function | UC01-UC30 |

### 30 UserCases/EdgeCases на каждую функцию

Каждая функция из таблиц выше получает все сценарии: UC01 happy path; UC02 minimal input; UC03 full input; UC04 omitted optional; UC05 empty value; UC06 whitespace value; UC07 unicode/case; UC08 boundary min; UC09 below min; UC10 boundary max; UC11 above max; UC12 malformed id/slug/token; UC13 not found; UC14 duplicate/conflict; UC15 self-exclusion; UC16 reference validation; UC17 permission allowed; UC18 permission denied; UC19 partial update; UC20 empty update; UC21 repository failure; UC22 dependency order; UC23 rollback intent; UC24 idempotency/retry; UC25 sorting stability; UC26 filtering semantics; UC27 pagination semantics; UC28 serialization/mapping; UC29 structural vs business validation; UC30 architecture boundary.

Для каждой функции раскрыть UC01-UC30 из `refactoring_and_testing_audit.md` отдельными unit-сценариями через fake price group, price, photo repository protocols и fake URL builder.

## Чеклист

- [ ] Убрать repository injection из `api/prices.py`
- [ ] Перенести enrichment/use case из API в service/presenter boundary
- [ ] Убрать settings URL building из API
- [ ] Зафиксировать service-level not-found contract
- [ ] Покрыть `PriceGroupService` функции UC01-UC30
- [ ] Покрыть `PriceService` функции UC01-UC30
