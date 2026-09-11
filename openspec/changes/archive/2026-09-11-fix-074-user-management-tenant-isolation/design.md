# Design — fix-074-user-management-tenant-isolation

**Тикет:** `074_users_management_bug`  
**Дата:** 2026-09-11  
**Сервисы:** Backend Core (`services/backend`)

## Context

Текущий `UserManagementService.get_users()` вызывает `UserManagementRepository.get_users_with_filters()` без tenant predicate. Адресные методы repository (`get_user_by_id`, `soft_delete_user`, `block_user`, `unblock_user`, `change_password`) также принимают только `user_id`, а `create_user()` доверяет `equestrian_id` из payload. Поэтому пользователь с `USER_MANAGER` или `SUPERUSER` может видеть и потенциально изменять аккаунты другой конюшни.

Tenant identity уже присутствует в `UserOutDto.equestrian_id` и в `users.equestrian_id`; новая схема БД не нужна. Изменение локально для backend, не затрагивает NATS, frontend API shape и публичные `site-*` контуры.

## Goals / Non-Goals

**Goals:**

- сделать список и `total` строго tenant-scoped;
- закрыть IDOR для чтения, обновления, soft-delete, block/unblock и смены пароля;
- не позволить payload создания выбрать чужую конюшню;
- сохранить текущие role-инварианты внутри tenant;
- зафиксировать и проверить доступ ко всем endpoint'ам user-management.

**Non-Goals:**

- изменение схемы БД, ролей или UI;
- предоставление `SUPERUSER` глобального доступа;
- изменение `/api/service/users`, `/api/users/me` или других доменов;
- рефакторинг N+1-загрузки ролей и произвольная переработка user-management.

## Decisions

### 1. Tenant boundary передаётся явно в repository

Protocol и реализация repository получают обязательный keyword-only `equestrian_id` для list, lookup, mutations и tenant-sensitive username lookup. SQL predicate по `users.equestrian_id` применяется в том же statement, что и ID/фильтры/`is_deleted`; `total` строится из идентичных условий.

Альтернатива — получить пользователя глобально и сравнить tenant в service — отвергнута: она допускает забытый guard в новых use case и отделяет проверку ownership от mutation statement, создавая TOCTOU/IDOR-риск.

### 2. Service всегда выводит tenant из текущей сессии

`current_user.equestrian_id` является единственным trusted tenant source. Для create payload обязан совпадать с ним; mismatch даёт `403`. Остальные операции передают trusted tenant в repository и получают `None`/`False` как `404` для чужого или отсутствующего ресурса.

Альтернатива — молча перезаписывать `data.equestrian_id` — отвергнута: это скрывает ошибочный/злонамеренный запрос и делает контракт менее наблюдаемым.

### 3. Cross-tenant адресные операции отвечают 404

Одинаковый `404` для отсутствующего и чужого пользователя не раскрывает существование UUID. Cross-tenant create отвечает `403`, поскольку запрет относится к явному tenant selector в теле запроса, а не к скрываемому target resource.

### 4. API router и frontend shape не меняются

Router продолжает передавать `current_user`; tenant enforcement остаётся use-case/repository concern. Существующие URL, query params и response DTO сохраняются.

## API access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/user-management/users` | Protected Admin Read (исключение: чувствительный список аккаунтов) | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой tenant; без роли `403` |
| GET | `/api/user-management/users/{id}` | Protected Admin Read (исключение: приватная запись аккаунта) | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой; чужой `404`; без роли `403` |
| POST | `/api/user-management/users` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `201` свой; чужой `403`; без роли `403` |
| PATCH | `/api/user-management/users/{id}` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой; чужой `404`; без роли `403` |
| DELETE | `/api/user-management/users/{id}` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `204` свой; чужой `404`; без роли `403` |
| PATCH | `/api/user-management/users/{id}/block` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой; чужой `404`; без роли `403` |
| PATCH | `/api/user-management/users/{id}/unblock` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `200` свой; чужой `404`; без роли `403` |
| PATCH | `/api/user-management/users/{id}/password` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | `204` свой; чужой `404`; без роли `403` |
| GET | `/api/user-management/roles` | Protected Admin Read (исключение: CMS role metadata) | `USER_MANAGER`, `SUPERUSER` | `401` | `200`; без роли `403` |

Исключения GET оправданы тем, что user-management — Protected Admin API с персональными и служебными данными, а не Public Read consumer API. Все строки получают anonymous/authenticated тесты; writes дополнительно проверяются на отсутствие побочного эффекта.

## Deliverables

| Deliverable | Профиль-владелец | Ownership | Результат |
|---|---|---|---|
| A — tenant-safe backend use cases | Backend | `services/backend/src/core/protocols/repositories/user_management_repository.py`, `services/backend/src/repositories/user_management_repository.py`, `services/backend/src/core/services/user_management.py` | Tenant predicate на всех чтениях/writes и create guard |
| B — regression tests | Backend | `services/backend/tests/unit/core/services/test_user_management_service.py`, релевантные repository/API unit tests при наличии | Risk-based regression и access coverage |
| C — Quality Gate evidence | Quality Gate | `docs/reports/**` (создание итогового отчёта), чтение diff/specs/tests | Единый вердикт по lanes |

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `U074-BE-1` | Backend | A | production paths deliverable A | — | `make test-unit` либо точечная эквивалентная unit-команда backend |
| `U074-BE-2` | Backend | B | user-management unit tests | `U074-BE-1` | `UT-U074-01..UT-U074-14` |
| `U074-QG-BE` | Quality Gate | C | read-only backend diff/tests | `U074-BE-2` | backend tests, lint/type checks по профилю gate |
| `U074-QG-CONTRACTS` | Quality Gate | C | read-only specs/tasks/diff | `U074-BE-2` | strict validation + access/ownership review |
| `U074-QG-LIVE` | Quality Gate | C | live environment; evidence only | `U074-QG-BE`, `U074-QG-CONTRACTS` | `SM-U074-01..SM-U074-10` через smoke skill |
| `U074-QG-SYNTH` | Quality Gate | C | `docs/reports/**` | `U074-QG-LIVE` | сведение lanes, вердикт `APPROVED`/`REWORK` |

`QG-FE` неприменим: diff в `services/frontend` не планируется. Site Consumer lane неприменим: публичные сайты и Public Read API не меняются.

### DAG

```text
U074-BE-1 → U074-BE-2 ─┬→ U074-QG-BE ───────┐
                       └→ U074-QG-CONTRACTS ─┴→ U074-QG-LIVE → U074-QG-SYNTH
```

`U074-QG-BE` и `U074-QG-CONTRACTS` независимы и могут выполняться параллельно. Остальные units последовательны.

## Test matrix

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Трассировка / где проверяется |
|---|---|---|---|---|---|
| `UT-U074-01` | unit service/repository | happy path list | два tenant, запрос оператора A | только A, корректный `total` | Tenant isolation / backend unit tests |
| `UT-U074-02` | unit repository | фильтры/пагинация | фильтр совпадает с пользователем B | B не попадает в items/total | Tenant isolation / repository tests |
| `UT-U074-03` | unit service | own-tenant lookup | target в tenant A | DTO target | Tenant isolation |
| `UT-U074-04` | unit service | IDOR lookup | target в tenant B | `404` | Tenant isolation |
| `UT-U074-05` | unit service | create | payload tenant A | `201`-эквивалент, запись A | Tenant isolation |
| `UT-U074-06` | unit service | create guard | payload tenant B | `403`, repository create не вызван | Tenant isolation / POST matrix |
| `UT-U074-07` | unit service | update IDOR | target tenant B | `404`, update/scopes не меняются | Tenant isolation / PATCH matrix |
| `UT-U074-08` | unit service | delete IDOR | target tenant B | `404`, soft-delete не вызван | Tenant isolation / DELETE matrix |
| `UT-U074-09` | unit service | block/unblock IDOR | target tenant B | `404`, статус не меняется | Tenant isolation / PATCH matrix |
| `UT-U074-10` | unit service | password IDOR/secret | target tenant B | `404`, hash/write не выполняются | Tenant isolation / password matrix |
| `UT-U074-11` | unit/API | anonymous | каждый endpoint matrix | `401` | Access matrix |
| `UT-U074-12` | unit/API | insufficient role | auth без UM/SU | `403` | Access matrix |
| `UT-U074-13` | unit service | role invariants | own-tenant UM против SU/self | прежние `403` сохраняются | Регрессия существующих правил |
| `UT-U074-14` | unit repository | atomic mutation | tenant predicate в UPDATE | чужой tenant не изменён даже при известном UUID | Транзакционность/конкурентность |
| `SM-U074-01` | smoke | list + PostgreSQL | пользователи A/B, login A | только A, total A | Tenant isolation |
| `SM-U074-02` | smoke | filtered list | filter совпадает только с B | пусто для A | Tenant isolation |
| `SM-U074-03` | smoke | lookup IDOR | GET target B как A | `404`, no private fields | GET-by-id matrix |
| `SM-U074-04` | smoke | create guard | POST tenant B как A | `403`, записи нет | POST matrix |
| `SM-U074-05` | smoke | update IDOR | PATCH target B как A | `404`, данные неизменны | PATCH matrix |
| `SM-U074-06` | smoke | delete IDOR | DELETE target B как A | `404`, target остаётся | DELETE matrix |
| `SM-U074-07` | smoke | block/unblock IDOR | обе PATCH target B как A | `404`, статус неизменен | PATCH matrix |
| `SM-U074-08` | smoke | password IDOR | PATCH password target B как A | `404`, старый пароль действует | Password matrix |
| `SM-U074-09` | smoke | anonymous access | все 9 routes без auth | `401` | Access matrix |
| `SM-U074-10` | smoke | insufficient role | все 9 routes с auth без UM/SU | `403` | Access matrix |

Оси внешних зависимостей неприменимы: use case не вызывает внешние сервисы/NATS. Новая миграция и идемпотентный повтор записи неприменимы; конкурентный риск mutation закрывает атомарный tenant predicate `UT-U074-14`. Реальная PostgreSQL обязательна в smoke, поскольку проверяются SQL predicates, count и отсутствие write side effects. Контракт ответа проверяется отсутствием чужих/приватных данных в `UT-U074-01`, `SM-U074-01`, `SM-U074-03`.

## PostgreSQL для smoke-тестов

Discovery выполнен 2026-09-11 через точный контейнер `eqsitecms-db` после fallback по имени (ожидаемый label project `eqsitecms` не совпал: фактический project — `eqsitecms-core`). `docker inspect eqsitecms-db` показал:

- container ID `7c720ddc783d`, image `postgres:16`;
- labels: `com.docker.compose.project=eqsitecms-core`, `com.docker.compose.service=db`;
- aliases: `eqsitecms-db`, `db` в `eqsitecms_network`;
- inspect env: `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`;
- host binding: `5432/tcp → 5433`.

`U074-QG-LIVE` обязан повторить discovery и `docker inspect`, не полагаться на эти значения как на постоянные, затем выполнять smoke через `.claude/skills/api-smoke-test` на живом backend и реальной PostgreSQL. Секреты не включать в отчёт/логи сверх локальной диагностики.

## Risks / Trade-offs

- [Неполная сигнатура repository оставит обход] → сделать `equestrian_id` обязательным во всех tenant-sensitive protocol methods и покрыть каждый use case.
- [Глобальная уникальность username может выдавать существование имени из другого tenant] → в scope этого bugfix username lookup tenant-scoped; если БД имеет глобальный unique constraint, поведение создания одинакового username в разных tenant требует отдельного решения схемы и не должно обходить isolation.
- [Изменение mock signatures ломает старые тесты] → обновить fixtures и сохранить проверки прежних role/self invariants.
- [404 усложняет диагностику оператору] → это намеренный security trade-off против раскрытия чужого resource ID.

## Migration Plan

1. Реализовать обязательные tenant predicates без миграции.
2. Прогнать unit regression.
3. Quality Gate: backend/contracts, затем live smoke на реальной PostgreSQL, затем synthesis.
4. При rollback вернуть совместимый код и тесты одним revert; данных и схемы rollback не требует.
5. После `APPROVED` синхронизировать delta spec в main specs, strict validate и архивировать change отдельными workflow-шагами.

## Open Questions

Нет блокирующих вопросов. Принято безопасное правило: `SUPERUSER` ограничен своей конюшней; cross-tenant target operations отвечают `404`, cross-tenant create — `403`.
