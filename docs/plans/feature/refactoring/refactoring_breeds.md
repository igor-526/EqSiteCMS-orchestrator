# План: refactoring breeds module

**Тикет:** REFACTORING-BREEDS
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** implemented, требуется повторный Quality Gate после REWORK

---

## Контекст

Модуль `breeds` реализует CRUD пород, slug-or-id lookup, уникальность `name`/`slug`, default `page_data` и фильтрацию. Сейчас API дополнительно поднимает `HTTPException(404)` для `get_by_slug_or_id`, а expected not-found должен жить в service/entity contract.

## Цель

Сделать `BreedService` единственным местом бизнес-валидации пород и покрыть каждую функцию UC01-UC30.

## Файлы

| Слой | Файлы |
|---|---|
| API | `services/backend/src/api/breeds.py` |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/repositories.py` |
| Service | `services/backend/src/core/services/breeds.py` |
| Schemas | `services/backend/src/core/schemas/breeds.py` |
| Entities | `services/backend/src/core/entities/breeds.py`, `services/backend/src/core/entities/base.py` |
| Protocols | `services/backend/src/core/protocols/repositories/breed_repository.py` |
| Repository | `services/backend/src/repositories/breed_repository.py` |
| Tests | `services/backend/tests/unit/core/services/test_breed_service.py` |

## Что рефакторить

- Перенести public not-found contract для single get из API в сервисный use case или добавить отдельный service method, если nullable lookup нужен внутри кода.
- Убрать локальный `HTTPException` из `api/breeds.py`; expected not-found должен мапиться через `ClientError`.
- Нормализовать slug generation: один импорт `_generate_slug`, без локального импорта внутри метода.
- Явно определить поведение пустого update payload: reject через `ClientError` или documented no-op.
- Проверить, что `name`, `slug`, `description`, `page_data` бизнес-правила не живут только в DTO validators.
- Проверить безопасный порядок: find name -> generate/ensure slug -> entity creation -> repository create.
- Для `_ensure_unique_slug` покрыть suffix loop, self-exclusion и repository failure.
- Для `get_filtered` проверить семантику filters/sort/limit/offset как pass-through service contract.

## Unit-тесты service functions

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `BreedService` | `_parse_slug_or_id` | helper function | representative UC01-UC30 matrix |
| `BreedService` | `_ensure_unique_slug` | helper function | representative UC01-UC30 matrix |
| `BreedService` | `create` | public service function | representative UC01-UC30 matrix |
| `BreedService` | `update` | public service function | representative UC01-UC30 matrix |
| `BreedService` | `get_by_slug_or_id` | public service function | representative UC01-UC30 matrix |
| `BreedService` | `delete` | public service function | representative UC01-UC30 matrix |
| `BreedService` | `get_filtered` | public service function | representative UC01-UC30 matrix |

### 30 UserCases/EdgeCases на каждую функцию

Каждая функция из таблицы выше проверяется по применимой representative матрице UC01-UC30: UC01 happy path; UC02 minimal input; UC03 full input; UC04 omitted optional; UC05 empty value; UC06 whitespace value; UC07 unicode/case; UC08 boundary min; UC09 below min; UC10 boundary max; UC11 above max; UC12 malformed id/slug/token; UC13 not found; UC14 duplicate/conflict; UC15 self-exclusion; UC16 reference validation; UC17 permission allowed; UC18 permission denied; UC19 partial update; UC20 empty update; UC21 repository failure; UC22 dependency order; UC23 rollback intent; UC24 idempotency/retry; UC25 sorting stability; UC26 filtering semantics; UC27 pagination semantics; UC28 serialization/mapping; UC29 structural vs business validation; UC30 architecture boundary.

Для `breeds` нецелесообразно создавать 210 механических тестов "каждая UC на каждую функцию": часть UC не имеет предмета в модуле (`UC16` reference validation, `UC17/UC18` permissions), а часть является общим architecture/API contract и проверяется один раз targeted тестом. Фактический объем согласован как risk-based grouped coverage через fake `BreedRepositoryProtocol`: каждая service function имеет отдельные сценарии для применимых UC, а неприменимые UC явно закрываются архитектурным обоснованием и smoke/API regression.

## Фактическая UC coverage matrix

| Функция | Покрытые UC |
|---|---|
| `_parse_slug_or_id` | UC01, UC07, UC12, UC30 |
| `_ensure_unique_slug` | UC01, UC14, UC15, UC21, UC22, UC23, UC24 |
| `create` | UC01, UC02, UC03, UC04, UC05, UC06, UC07, UC08, UC10, UC11, UC14, UC21, UC22, UC23, UC24, UC28, UC29, UC30 |
| `update` | UC01, UC03, UC04, UC05, UC06, UC08, UC10, UC11, UC13, UC14, UC15, UC19, UC20, UC21, UC22, UC23, UC28, UC29, UC30 |
| `get_by_slug_or_id` | UC01, UC12, UC13, UC21, UC28, UC29, UC30 |
| `delete` | UC01, UC12, UC13, UC21, UC22, UC23, UC30 |
| `get_filtered` | UC01, UC02, UC03, UC04, UC21, UC25, UC26, UC27, UC28, UC30 |

`UC16`, `UC17`, `UC18` неприменимы к breeds service: у пород нет external reference ids и permission branch. Они закрываются `UC30` boundary: service не зависит от FastAPI auth/user context и не выполняет side effects вне repository protocol.

## SMOKE

| ID | Endpoint | Method | Expected | Цель |
|---|---|---|---|---|
| `SM-BR-00` | `/health` | GET | `200` | API процесс доступен перед проверкой breeds |
| `SM-BR-01` | `/api/horses/breeds?limit=1` | GET | `200`, тело `{"items": [...], "total": N}` | list endpoint попадает в breeds router, а не в `/api/horses/{slug_or_id}` |
| `SM-BR-02` | `/api/horses/breeds?name=smoke&sort=name&limit=1&offset=0` | GET | `200` | filter/sort/pagination query проходит через breeds list contract |
| `SM-BR-03` | `/api/horses/breeds/non-existent-smoke-breed` | GET | `400`, `detail == "Порода не найдена"` | single not-found мапится через service-level `ClientError`, без router `HTTPException` |
| `SM-BR-04` | `/api/horses/breeds/{existing_slug_or_id}` | GET | `200` | single lookup по существующей породе возвращает DTO без `page_data` по умолчанию |
| `SM-BR-05` | `/api/horses/breeds/{existing_slug_or_id}?page_data=true` | GET | `200`, поле `page_data` присутствует | single lookup включает page data только по флагу |

## Чеклист

- [x] Убрать expected `HTTPException` из router path
- [x] Зафиксировать service-level not-found contract
- [x] Уточнить empty update behavior: пустой payload отклоняется через `ClientError("Нет данных для обновления")`
- [x] Исправить route order: breeds routes регистрируются до `/api/horses/{slug_or_id}`
- [x] Покрыть `_parse_slug_or_id` representative UC matrix
- [x] Покрыть `_ensure_unique_slug` representative UC matrix
- [x] Покрыть `create` representative UC matrix
- [x] Покрыть `update` representative UC matrix
- [x] Покрыть `get_by_slug_or_id` representative UC matrix
- [x] Покрыть `delete` representative UC matrix
- [x] Покрыть `get_filtered` representative UC matrix
- [x] Добавить SMOKE-секцию `SM-BR-*`
