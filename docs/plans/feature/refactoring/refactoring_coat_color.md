# План: refactoring coat_color module

**Тикет:** REFACTORING-COAT-COLOR
**Дата:** 2026-05-06
**Затронутые сервисы:** services/backend
**Ветка:** feature/refactoring-testing-audit
**Статус:** draft, требуется согласование пользователя до передачи Backend

---

## Контекст

Модуль `coat_color` повторяет CRUD-паттерн пород: slug-or-id lookup, уникальность `name`/`slug`, default `page_data`, фильтрация. API содержит local not-found через `HTTPException`, который нужно заменить service-level `ClientError` contract.

## Цель

Сделать `CoatColorService` источником бизнес-валидации мастей и покрыть все функции UC01-UC30.

## Файлы

| Слой | Файлы |
|---|---|
| API | `services/backend/src/api/coat_color.py` |
| DI | `services/backend/src/depends/services.py`, `services/backend/src/depends/repositories.py` |
| Service | `services/backend/src/core/services/coat_color.py` |
| Schemas | `services/backend/src/core/schemas/coat_color.py` |
| Entities | `services/backend/src/core/entities/coat_color.py`, `services/backend/src/core/entities/base.py` |
| Protocols | `services/backend/src/core/protocols/repositories/coat_color_repository.py` |
| Repository | `services/backend/src/repositories/coat_color_repository.py` |
| Tests | `services/backend/tests/unit/core/services/test_coat_color_service.py` |

## Что рефакторить

- Перенести expected not-found из `api/coat_color.py` в сервисный контракт.
- Убрать локальные imports `_generate_slug` внутри методов, оставить dependency-free domain helper usage.
- Явно описать и реализовать поведение empty update payload.
- Проверить, что duplicate name и slug collision всегда возвращают `ClientError`.
- Проверить self-exclusion для update при неизмененных `name`/`slug`.
- Проверить default `page_data` только в service/entity, без бизнес-логики в API.
- Для `_ensure_unique_slug` покрыть suffix loop и стабильность при нескольких конфликтах.
- Для фильтрации покрыть pass-through параметров и границы limit/offset.

## Unit-тесты service functions

| Класс | Функция | Тип | Обязательные сценарии |
|---|---|---|---|
| `CoatColorService` | `_parse_slug_or_id` | helper function | UUID happy path, malformed slug fallback, unicode/whitespace token stability |
| `CoatColorService` | `_ensure_unique_slug` | helper function | free slug, suffix loop, repository call order, self-exclusion, repository failure propagation |
| `CoatColorService` | `create` | public service function | minimal/full input, normalization, required/optional text validation, max length, duplicate name, explicit slug collision, generated slug collision retry, default `page_data`, repository failure |
| `CoatColorService` | `update` | public service function | slug-or-id lookup, not found, partial update, empty payload, duplicate name/slug, self-exclusion, generated slug on name change, business validation as `ClientError`, repository failure |
| `CoatColorService` | `get_by_slug_or_id` | public service function | lookup by slug, lookup by UUID, not found as `ClientError`, repository failure |
| `CoatColorService` | `delete` | public service function | delete by slug, not found without delete call, repository failure |
| `CoatColorService` | `get_filtered` | public service function | pass-through filters/sort/pagination, omitted optionals, zero limit/offset boundary, negative pagination as `ClientError`, repository failure |

### Матрица покрытия UC01-UC30

UC01-UC30 используются как общий каталог рисков из `refactoring_and_testing_audit.md`, а не как требование 30 искусственных тестов на каждую функцию. Для `CoatColorService` обязательны только релевантные сценарии; нерелевантные для модуля случаи фиксируются явно и не покрываются padding-тестами.

| UC | Смысл | Проверка |
|---|---|---|
| UC01 | happy path | create/update/get/delete/get_filtered happy-path тесты |
| UC02 | minimal input | `test_create_uc01_minimal_input_generates_slug_and_default_page_data`, `test_get_filtered_uc02_omitted_optional_defaults_are_passed_as_none` |
| UC03 | full input | `test_create_uc03_full_input_preserves_normalized_fields` |
| UC04 | omitted optional | default `page_data`, omitted filter params |
| UC05-UC06 | empty/whitespace value | `test_create_uc05_uc06_empty_or_whitespace_business_values_are_client_errors`, `test_update_uc29_business_validation_uses_client_error` |
| UC07 | unicode/case | unicode name slug generation in create/update, unicode slug token stability |
| UC08-UC11 | boundaries | `test_create_uc10_uc11_length_boundaries_are_enforced`, `test_get_filtered_uc08_boundary_zero_limit_and_offset_are_passed`, `test_get_filtered_uc09_negative_limit_or_offset_is_client_error` |
| UC12 | malformed id/slug/token | `_parse_slug_or_id` keeps malformed UUID as slug token |
| UC13 | not found | update/get/delete not-found tests assert `ClientError` |
| UC14 | duplicate/conflict | duplicate name, explicit slug collision, generated slug suffix loop |
| UC15 | self-exclusion | `_ensure_unique_slug` and update allow same entity name/slug |
| UC16 | reference validation | not applicable: coat color has no inbound foreign-key references in service create/update |
| UC17-UC18 | permission allowed/denied | not applicable: current coat color service contract has no authorization dependency |
| UC19 | partial update | `test_update_uc19_changes_only_explicit_fields` |
| UC20 | empty update | `test_update_uc20_empty_payload_is_client_error` |
| UC21 | repository failure | helper/create/update/get/delete/list repository failure tests |
| UC22 | dependency order | `_ensure_unique_slug` call-order assertion |
| UC23 | rollback intent | repository failure tests assert no delete/create side effects in fake repository |
| UC24 | idempotency/retry | generated slug collision retry test |
| UC25 | sorting stability | `get_filtered` passes sort contract unchanged |
| UC26 | filtering semantics | `get_filtered` passes filters unchanged |
| UC27 | pagination semantics | `get_filtered` passes/validates limit and offset |
| UC28 | serialization/mapping | API layer maps service entities to `CoatColorOutDto`; service keeps entity contract |
| UC29 | structural vs business validation | business validation raises `ClientError`, not FastAPI/Pydantic router errors |
| UC30 | architecture boundary | service module has no FastAPI `HTTPException` dependency |

### SMOKE-тесты на реальном API

Smoke запускается по `.claude/skills/api-smoke-test/SKILL.md` против реального backend API. Авторизация берется из credentials skill-файла; токены/cookies сохраняются между запросами.

Переменные:

```bash
BASE_URL="${BASE_URL:-http://localhost:8001}"
AUTH_ENDPOINT="/api/auth/login"
SMOKE_SUFFIX="$(date +%Y%m%d%H%M%S)"
SMOKE_NAME="Smoke Coat Color ${SMOKE_SUFFIX}"
SMOKE_SLUG="smoke-coat-color-${SMOKE_SUFFIX}"
SMOKE_UPDATED_NAME="Smoke Coat Color Updated ${SMOKE_SUFFIX}"
SMOKE_UPDATED_SLUG="smoke-coat-color-updated-${SMOKE_SUFFIX}"
SMOKE_CURRENT_SLUG="$SMOKE_SLUG"
```

`CoatColorService.update` регенерирует slug при изменении `name`, если явный `slug` не передан. Поэтому после `SM-CC-08` smoke должен сохранить фактический `slug` из ответа в `SMOKE_CURRENT_SLUG` и использовать его в последующих проверках фильтрации. При ручном повторе с тем же `SMOKE_SUFFIX` после прерванного прогона `SM-CC-05` можно выполнить best-effort cleanup и для `${SMOKE_UPDATED_SLUG}`.

| ID | Method | Endpoint | Body / параметры | Ожидание | Назначение |
|---|---|---|---|---|---|
| SM-CC-01 | GET | `/health` | - | `200` | API доступен |
| SM-CC-02 | POST | `/api/auth/login` | credentials из skill | `200`, cookie/session доступна | Авторизация |
| SM-CC-03 | GET | `/api/auth/me` | cookie/session | `200` | Проверка авторизованной сессии |
| SM-CC-04 | GET | `/api/horses/coat_colors?limit=1&offset=0` | - | `200`, JSON содержит `items` и `total` | List endpoint не перехвачен `/api/horses/{slug_or_id}` |
| SM-CC-05 | DELETE | `/api/horses/coat_colors/${SMOKE_SLUG}` | best-effort cleanup | `204` или `400` с not-found | Идемпотентная очистка перед create |
| SM-CC-06 | POST | `/api/horses/coat_colors` | `{"name": "$SMOKE_NAME", "slug": "$SMOKE_SLUG", "description": "smoke"}` | `200`, сохранить `id` как `SMOKE_ID` | Create |
| SM-CC-07 | GET | `/api/horses/coat_colors/${SMOKE_ID}` | - | `200`, `slug == SMOKE_SLUG` | Get by UUID |
| SM-CC-08 | PATCH | `/api/horses/coat_colors/${SMOKE_ID}` | `{"name": "$SMOKE_UPDATED_NAME", "description": "smoke updated"}` | `200`, name/description обновлены, сохранить `slug` из ответа как `SMOKE_CURRENT_SLUG` | Update |
| SM-CC-09 | GET | `/api/horses/coat_colors?slug=${SMOKE_CURRENT_SLUG}&limit=10&offset=0` | - | `200`, созданная запись найдена в `items`, `items[*].id` содержит `SMOKE_ID` | Filter/list |
| SM-CC-10 | DELETE | `/api/horses/coat_colors/${SMOKE_ID}` | - | `204` | Cleanup |
| SM-CC-11 | GET | `/api/horses/coat_colors/${SMOKE_ID}` | - | `400`, detail содержит `Масть не найдена` | Подтверждение удаления |

## Чеклист

- [x] Убрать expected `HTTPException` из router path
- [x] Зафиксировать service-level not-found contract
- [x] Уточнить empty update behavior
- [x] Покрыть `_parse_slug_or_id` релевантными UC-сценариями
- [x] Покрыть `_ensure_unique_slug` релевантными UC-сценариями
- [x] Покрыть `create` релевантными UC-сценариями
- [x] Покрыть `update` релевантными UC-сценариями
- [x] Покрыть `get_by_slug_or_id` релевантными UC-сценариями
- [x] Покрыть `delete` релевантными UC-сценариями
- [x] Покрыть `get_filtered` релевантными UC-сценариями
- [x] Добавить smoke-suite для `/api/horses/coat_colors`
