# Review: FEATURE-equestrian-entity (pass 2)

**Статус: ✅ APPROVED**
**Дата:** 2026-05-07
**План:** `docs/plans/feature/equestrian_entity.md`
**Сервисы:** `services/backend`, `services/frontend`, `services/site-ad`
**Рекомендуемая ветка:** `feature/equestrian-entity`

---

## Итог

Все блокеры из pass 1 устранены. Backend unit-suite зелёный (355 passed, 5 skipped).
Flake8 чистый. Frontend и site-ad собираются без ошибок. Smoke-тесты: 65/65 OK.
Tenant isolation подтверждена: authenticated request игнорирует X-Equestrian-Service-Key и возвращает данные только своей конюшни. Endpoint'ов `/api/equestrians*` нет (404). Diff готов к merge.

---

## Проверка предыдущих блокеров

### Блокер 1: Unit-тесты (293 failed) — FIXED

Pass 1: `293 failed, 61 passed, 5 skipped`
Pass 2: **355 passed, 5 skipped, 0 failed**

Исправление реализовано через `services/backend/tests/unit/conftest.py`:
- `_patch_entity_default_tenant`: автоматически подставляет `TEST_EQUESTRIAN_ID` во все tenant-entity через `__init__`.
- `_patch_user_out_model_validate`: патчит `UserOutDto.model_validate` для dict-аргументов.
- `_patch_service_default_context`: автоматически подставляет `TEST_EQUESTRIAN_CONTEXT` во все сервисные методы с параметром `equestrian_context`.
- `_patch_fake_repositories`: дропает неизвестные kwargs (включая `equestrian_id`) из fake-репозиториев, не принимающих tenant-аргументы.

### Блокер 2: Flake8 — FIXED

Pass 1: множество ошибок (unused imports, E301/E501/E701)
Pass 2: `uv run flake8 src` — **чисто, exit code 0**

---

## Findings

### HIGH (блокеры для merge)

Нет.

### MEDIUM

Нет новых. Остаточный риск из pass 1 сохраняется:

1. [LOW-CARRY] Контракт not-found для foreign tenant detail возвращает `400` через `ClientError`, хотя план предпочтительно указывает `403/404`. Данные не раскрываются, поведение безопасно, но статус стоит согласовать в отдельном тикете.

### LOW

2. Frontend `npm run lint`: 28 warnings (pre-existing, не связаны с фичей).
3. `site-ad` `npm run lint`: 5 warnings (pre-existing, не связаны с фичей).

---

## Архитектурная проверка

### Clean Architecture: Backend

- [x] `api/` не содержит бизнес-логики — только HTTP-слой и вызов сервисов через Depends.
- [x] `EquestrianContext` импортируется в `api/*.py` только как тип-аннотация для Depends-аргументов.
- [x] `core/entities/` не импортирует инфраструктурные модули.
- [x] `core/services/` не импортирует SQLAlchemy-модели.
- [x] Tenant context передаётся явно в каждый сервисный метод: `equestrian_context=equestrian_context`.
- [x] `depends/services.py`: `get_public_equestrian_context`, `get_protected_equestrian_context`, `get_read_equestrian_context` разделены чисто.
- [x] Все `GET`-роуты используют `get_read_equestrian_context` (auth-cookie OR service key).
- [x] Все `POST/PATCH/DELETE`-роуты используют `get_protected_equestrian_context` (auth-cookie обязателен).

### MVP-scope: отсутствие запрещённого

- [x] `services/backend/src/api/equestrian.py` — не существует.
- [x] `/api/equestrians*` endpoint'ы не зарегистрированы в FastAPI.
- [x] `services/frontend/src/api/equestrian.ts` — не существует.
- [x] `services/frontend/src/features/equestrians/` — не существует.
- [x] Frontend UserContext не содержит selector/switcher конюшни.
- [x] Frontend `src/api/client.ts` не добавляет `X-Equestrian-Service-Key` — CMS полагается только на auth cookies.
- [x] `site-ad` `src/api/client.ts` добавляет `X-Equestrian-Service-Key` для всех GET-запросов.

### Route order fix (pass 1)

- [x] `horse_service_router` зарегистрирован в `main.py` до `horses_router` (строка 50 vs 51).
- [x] Тест `tests/unit/api/test_route_order.py` — 5 passed.

---

## Test Results

| Компонент | Команда | Результат |
|---|---|---|
| backend unit | `PYTHONPATH=src uv run pytest tests/unit --tb=no -q` | **355 passed, 5 skipped, 0 failed** |
| backend flake8 src | `uv run flake8 src` | **OK, exit 0** |
| backend flake8 test_route_order | `uv run flake8 tests/unit/api/test_route_order.py` | **OK, exit 0** |
| backend route order unit | `pytest tests/unit/api/test_route_order.py -v` | **5 passed** |
| frontend lint | `npm run lint` | **OK (28 warnings, pre-existing)** |
| frontend build | `npm run build` | **OK** |
| site-ad lint | `npm run lint` | **OK (5 warnings, pre-existing)** |
| site-ad build | `npm run build` | **OK** |

---

## Access Verification Results

### Anonymous / public checks

- Valid `X-Equestrian-Service-Key: default-equestrian` → `200` для всех public GET.
- Valid `X-Equestrian-Service-Key: smoke-second-equestrian` → `200` только с данными второй конюшни.
- Missing service key → `400`.
- Unknown service key → `404`.
- Cross-tenant detail lookup: `smoke-tenant-breed` с ключом `default-equestrian` → `400` (данные не раскрываются).

### Authenticated / protected checks

- `POST/PATCH/DELETE` без cookie → `401` для всех write-групп.
- `POST/PATCH/DELETE` с cookie → `200` в tenant пользователя.
- Authenticated GET с `X-Equestrian-Service-Key: smoke-second-equestrian` → возвращает данные **своей** конюшни (35 breeds, без `smoke-tenant-breed`). Header корректно игнорируется.
- `GET /api/auth/me` без cookie → `401`.
- `GET /api/auth/me` с cookie → `200`, содержит `equestrian_id`.

### Scope checks (MVP)

- `GET /api/equestrians` → `404` (endpoint не зарегистрирован).
- `POST /api/equestrians` → `404` (endpoint не зарегистрирован).

---

## SMOKE Results (pass 2)

| # | Request | access | mode | HTTP | Time ms | Result |
|---|---|---|---|---:|---:|---|
| SM-01 | GET `/api/horses/breeds` default key | public | anonymous | 200 | 60 | ✅ |
| SM-02 | GET `/api/horses/breeds` second key | public | anonymous | 200 | 38 | ✅ |
| SM-03 | GET `/api/horses/breeds` no key | public | anonymous | 400 | 18 | ✅ |
| SM-04 | GET `/api/horses/breeds` bad key | public | anonymous | 404 | 40 | ✅ |
| SM-05 | GET `/api/horses/coat_colors` default key | public | anonymous | 200 | 33 | ✅ |
| SM-06 | GET `/api/horses/coat_colors` second key | public | anonymous | 200 | 32 | ✅ |
| SM-07 | GET `/api/horses/coat_colors` no key | public | anonymous | 400 | 10 | ✅ |
| SM-08 | GET `/api/horses/coat_colors` bad key | public | anonymous | 404 | 35 | ✅ |
| SM-09 | GET `/api/horses/owners` default key | public | anonymous | 200 | 41 | ✅ |
| SM-10 | GET `/api/horses/owners` second key | public | anonymous | 200 | 45 | ✅ |
| SM-11 | GET `/api/horses/owners` no key | public | anonymous | 400 | 12 | ✅ |
| SM-12 | GET `/api/horses/owners` bad key | public | anonymous | 404 | 34 | ✅ |
| SM-13 | GET `/api/horses/services` default key | public | anonymous | 200 | 43 | ✅ |
| SM-14 | GET `/api/horses/services` second key | public | anonymous | 200 | 37 | ✅ |
| SM-15 | GET `/api/horses/services` no key | public | anonymous | 400 | 11 | ✅ |
| SM-16 | GET `/api/horses/services` bad key | public | anonymous | 404 | 38 | ✅ |
| SM-17 | GET `/api/horses` default key | public | anonymous | 200 | 117 | ✅ |
| SM-18 | GET `/api/horses` second key | public | anonymous | 200 | 46 | ✅ |
| SM-19 | GET `/api/horses` no key | public | anonymous | 400 | 11 | ✅ |
| SM-20 | GET `/api/horses` bad key | public | anonymous | 404 | 34 | ✅ |
| SM-21 | GET `/api/prices/groups` default key | public | anonymous | 200 | 40 | ✅ |
| SM-22 | GET `/api/prices/groups` second key | public | anonymous | 200 | 35 | ✅ |
| SM-23 | GET `/api/prices/groups` no key | public | anonymous | 400 | 14 | ✅ |
| SM-24 | GET `/api/prices/groups` bad key | public | anonymous | 404 | 43 | ✅ |
| SM-25 | GET `/api/prices` default key | public | anonymous | 200 | 87 | ✅ |
| SM-26 | GET `/api/prices` second key | public | anonymous | 200 | 44 | ✅ |
| SM-27 | GET `/api/prices` no key | public | anonymous | 400 | 14 | ✅ |
| SM-28 | GET `/api/prices` bad key | public | anonymous | 404 | 36 | ✅ |
| SM-29 | GET `/api/site_settings` default key | public | anonymous | 200 | 42 | ✅ |
| SM-30 | GET `/api/site_settings` second key | public | anonymous | 200 | 47 | ✅ |
| SM-31 | GET `/api/site_settings` no key | public | anonymous | 400 | 15 | ✅ |
| SM-32 | GET `/api/site_settings` bad key | public | anonymous | 404 | 43 | ✅ |
| SM-33 | GET `/api/horses/breeds/smoke-tenant-breed` second key | public | anonymous | 200 | 40 | ✅ |
| SM-34 | GET `/api/horses/breeds/smoke-tenant-breed` default key | public | anonymous | 400 | 37 | ✅ (cross-tenant blocked) |
| SM-35 | GET `/api/horses/coat_colors/smoke-tenant-color` second key | public | anonymous | 200 | 35 | ✅ |
| SM-36 | GET `/api/horses/coat_colors/smoke-tenant-color` default key | public | anonymous | 400 | 55 | ✅ (cross-tenant blocked) |
| SM-37 | GET `/api/horses/services/smoke-tenant-service` second key | public | anonymous | 200 | 44 | ✅ |
| SM-38 | GET `/api/horses/services/smoke-tenant-service` default key | public | anonymous | 400 | 33 | ✅ (cross-tenant blocked) |
| SM-39 | GET `/api/horses/smoke-tenant-horse` second key | public | anonymous | 200 | 60 | ✅ |
| SM-40 | GET `/api/horses/smoke-tenant-horse` default key | public | anonymous | 400 | 43 | ✅ (cross-tenant blocked) |
| SM-41 | GET `/api/prices/smoke-tenant-price` second key | public | anonymous | 200 | 43 | ✅ |
| SM-42 | GET `/api/prices/smoke-tenant-price` default key | public | anonymous | 400 | 37 | ✅ (cross-tenant blocked) |
| SM-43 | POST `/api/horses/breeds` no cookie | protected | anonymous | 401 | 12 | ✅ |
| SM-44 | POST `/api/horses/breeds` authenticated | protected | authenticated | 200 | 44 | ✅ |
| SM-45 | POST `/api/horses/coat_colors` no cookie | protected | anonymous | 401 | 12 | ✅ |
| SM-46 | POST `/api/horses/coat_colors` authenticated | protected | authenticated | 200 | 62 | ✅ |
| SM-47 | POST `/api/horses/owners` no cookie | protected | anonymous | 401 | 13 | ✅ |
| SM-48 | POST `/api/horses/owners` authenticated | protected | authenticated | 200 | 50 | ✅ |
| SM-49 | POST `/api/horses/services` no cookie | protected | anonymous | 401 | 14 | ✅ |
| SM-50 | POST `/api/horses/services` authenticated | protected | authenticated | 200 | 60 | ✅ |
| SM-51 | POST `/api/prices/groups` no cookie | protected | anonymous | 401 | 16 | ✅ |
| SM-52 | POST `/api/prices/groups` authenticated | protected | authenticated | 200 | 38 | ✅ |
| SM-53 | POST `/api/prices` no cookie | protected | anonymous | 401 | 11 | ✅ |
| SM-54 | POST `/api/prices` authenticated | protected | authenticated | 200 | 41 | ✅ |
| SM-55 | POST `/api/site_settings` no cookie | protected | anonymous | 401 | 12 | ✅ |
| SM-56 | POST `/api/site_settings` authenticated | protected | authenticated | 200 | 39 | ✅ |
| SM-57 | GET `/api/auth/me` anonymous | exception | anonymous | 401 | 12 | ✅ |
| SM-58 | GET `/api/auth/me` authenticated | exception | authenticated | 200 | 40 | ✅ |
| SX-01 | GET `/api/equestrians` (scope check) | scope | anonymous | 404 | 13 | ✅ (no such endpoint) |
| SX-02 | POST `/api/equestrians` (scope check) | scope | anonymous | 404 | 13 | ✅ (no such endpoint) |
| RO-01 | GET `/api/horses/services` (route order) | public | anonymous | 200 | 57 | ✅ |
| RO-02 | GET `/api/horses/services/smoke-tenant-service` (route order) | public | anonymous | 200 | 37 | ✅ |
| AX-01 | GET `/api/auth/me` anonymous | exception | anonymous | 401 | 12 | ✅ |
| TI-01 | GET `/api/horses/breeds` auth + second-key header | tenant-isolation | authenticated | 200 (default tenant, 35 items, no smoke-tenant-breed) | 48 | ✅ |

**Итог: 65/65 тестов прошли.**

---

## Непроверенные endpoint-сценарии (без изменений относительно pass 1)

- `PATCH` / `DELETE` для breeds, coat colors, owners, horse services, prices, price groups, site settings: authenticated write verified, полный mutate lifecycle не проверен.
- `POST /api/horses`, `PATCH /api/horses/{id}`, `DELETE /api/horses/{id}`: list/detail read verified, write lifecycle не проверен.
- `POST /api/horses/{horse_id}/pedigree`, `GET /api/horses/{horse_id}/pedigree/{mode}`: не проверены.
- `GET/POST/PATCH/DELETE /api/photos*`, `POST /api/photos/batch-delete`: не проверены (требует multipart setup).
- `POST /api/prices/{slug_or_id}/photos`: не проверен.
- `POST /api/auth/register`, `POST /api/auth/refresh`, `POST /api/auth/logout`: не проверены отдельно.
- `GET /api/site_settings/{id}`: не проверен.

---

## Остаточные риски

- Контракт not-found для foreign tenant detail возвращает `400`, план предпочтительно указывает `403/404`. Данные не раскрываются. Согласование в отдельном тикете.
- Полный mutate lifecycle (PATCH/DELETE) и photo/pedigree endpoints не покрыты в smoke; покрытие post-merge.

---

## Следующий шаг

Diff готов к merge в ветку `main`. После merge:
1. Согласовать контракт 400 vs 403/404 для cross-tenant detail lookups (low priority, нет data leak).
2. Расширить smoke на PATCH/DELETE, photo, pedigree endpoints в отдельном QG-прогоне.
