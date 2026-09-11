# Review: 074 — user-management tenant isolation

**Статус: ✅ APPROVED**  
**Дата:** 2026-09-11  
**Рекомендуемая ветка:** `fix/074-user-management-tenant-isolation`

## Итог

User-management API ограничен конюшней текущего оператора на уровне repository и use case. Роль `SUPERUSER` не обходит tenant boundary. Все применимые Quality Gate lanes пройдены, blocking findings отсутствуют: backend suite зелёная, OpenSpec strict validation успешна, live API и PostgreSQL smoke закрыли 10/10 сценариев и 27/27 assertions.

## Ссылки

- Задача: [`docs/tasks/074_users_management_bug.md`](../tasks/074_users_management_bug.md)
- OpenSpec change: [`fix-074-user-management-tenant-isolation`](../../openspec/changes/fix-074-user-management-tenant-isolation/)
- Артефакты: [`proposal.md`](../../openspec/changes/fix-074-user-management-tenant-isolation/proposal.md), [`design.md`](../../openspec/changes/fix-074-user-management-tenant-isolation/design.md), [`spec.md`](../../openspec/changes/fix-074-user-management-tenant-isolation/specs/user-management-api/spec.md), [`tasks.md`](../../openspec/changes/fix-074-user-management-tenant-isolation/tasks.md)
- Approval: пользователь явно подтвердил apply сообщением `Apply`.

## Lanes

| Lane | Статус | Evidence / findings |
|---|---|---|
| `QG-BE` | пройден | 77 targeted tests и 1431 full-suite tests пройдены, 5 skipped; lint, mypy и format-check чистые; tenant predicates, atomic writes, `404` и create guard подтверждены; findings нет |
| `QG-FE` | неприменимо | В change отсутствует diff в `services/frontend` и `services/site-*`; frontend test gate не запускался |
| `QG-CONTRACTS` | пройден | Все 9 строк access matrix соответствуют реализации; ownership change — 3 production и 3 test-файла; frontend/NATS/schema diff отсутствует; strict validation — `valid`; findings нет |
| `QG-LIVE` | пройден | 10/10 smoke scenarios, 27/27 assertions; реальные API и PostgreSQL; cleanup завершён, остаточные counts `0,0,0`; findings нет |

## Выполненные изменения

- Tenant-sensitive repository protocol и SQL queries требуют `equestrian_id`.
- List/count, lookup и mutations ограничены tenant predicate; mutations проверяют tenant атомарно.
- Use cases передают доверенный tenant текущего пользователя, скрывают foreign target через `404` и запрещают cross-tenant create через `403` до side effects.
- Регрессионные service, repository и API tests покрывают tenant isolation и access policy.

## Изменённые файлы change

| Файл | Что изменено |
|---|---|
| `services/backend/src/core/protocols/repositories/user_management_repository.py` | Tenant-aware signatures repository protocol |
| `services/backend/src/core/services/user_management.py` | Tenant enforcement, create guard и foreign-target handling |
| `services/backend/src/repositories/user_management_repository.py` | Tenant predicates для reads и atomic writes |
| `services/backend/tests/unit/api/test_user_management_api.py` | Anonymous/role access regression coverage |
| `services/backend/tests/unit/core/services/test_user_management_service.py` | Service-level tenant isolation и negative side-effect assertions |
| `services/backend/tests/unit/repositories/test_user_management_repository.py` | SQL tenant predicates, list/count и mutation coverage |

В backend worktree также присутствовали не относящиеся к ownership этого change изменения `src/core/services/prices.py` и `tests/unit/core/services/test_price_service.py`; `QG-CONTRACTS` не включил их в change scope.

## Покрытие по test matrix

| ID | Фактическая проверка | Статус |
|---|---|---|
| `UT-U074-01..06` | Backend service/repository tests: list/count, filters, lookup, own/cross-tenant create | покрыто |
| `UT-U074-07..10` | Backend service tests: update/delete/block/unblock/password IDOR и отсутствие side effects | покрыто |
| `UT-U074-11..13` | API/service tests: anonymous `401`, insufficient role `403`, role/self invariants | покрыто |
| `UT-U074-14` | Repository tests: tenant predicate в atomic mutations | покрыто |
| `SM-U074-01..03` | Live list/filter/foreign lookup на реальной PostgreSQL | выполнено |
| `SM-U074-04..08` | Live cross-tenant create и foreign mutations с DB before/after checks | выполнено |
| `SM-U074-09..10` | Все 9 routes без auth и с недостаточной ролью | выполнено |

Непокрытые IDs: нет. Внешние сервисы/NATS, миграция и идемпотентный повтор записи неприменимы по design; конкурентный mutation risk закрыт `UT-U074-14`.

## Unit / Integration тесты

| Проверка | Результат |
|---|---|
| Targeted backend tests | `77 passed` |
| Полная backend suite | `1431 passed, 5 skipped, 0 failed` |
| Lint | чисто |
| Mypy | чисто |
| Format check | чисто |

## SMOKE-тесты

| ID | Endpoint / сценарий | HTTP | Time | Результат |
|---|---|---|---:|---|
| `SM-U074-01` | `GET /api/user-management/users`, tenant A list/count | `200` | 0.0643s | `total=4`, DB count=4, foreign=0 |
| `SM-U074-02` | `GET /api/user-management/users`, filter совпадает только с tenant B | `200` | 0.0751s | items=0, total=0 |
| `SM-U074-03` | `GET /api/user-management/users/{id}`, foreign target | `404` | 0.0525s | identifiers/private data отсутствуют |
| `SM-U074-04` | `POST /api/user-management/users`, foreign tenant | `403` | 0.0647s | created rows=0 |
| `SM-U074-05` | `PATCH /api/user-management/users/{id}`, foreign target | `404` | 0.0660s | row/scopes неизменны |
| `SM-U074-06` | `DELETE /api/user-management/users/{id}`, foreign target | `404` | 0.0605s | row существует и неизменна |
| `SM-U074-07` | `PATCH .../{id}/block` и `/unblock`, foreign target | `404` | 0.0564s / 0.0584s | status/row неизменны |
| `SM-U074-08` | `PATCH .../{id}/password`, foreign target | `404` | 0.0557s | hash неизменён, старый пароль даёт login `200` |
| `SM-U074-09` | Все 9 routes без auth | `401` | 0.0028–0.0057s | 9/9 |
| `SM-U074-10` | Все 9 routes с ролью без UM/SU | `403` | 0.0501–0.0648s | 9/9 |

Итог SMOKE: `10/10` scenario IDs, `27/27` assertions. PostgreSQL: контейнер `eqsitecms-db`, PostgreSQL 16.14, Compose service `db`, host binding `5433→5432`. Fixtures и временные файлы удалены; `tests/smoke/**` не создавался.

## Access verification results

- Anonymous: все 9 protected routes вернули `401`.
- Недостаточная роль: все 9 routes вернули `403`.
- Разрешённые `USER_MANAGER` / `SUPERUSER`: list/count и own-tenant paths работают только в tenant текущего пользователя; `SUPERUSER` bypass отсутствует.
- Foreign target: GET/update/delete/block/unblock/password возвращают одинаковый `404` без раскрытия приватных данных и без write side effects.
- Cross-tenant create: `403`, запись не создаётся.
- Protected Admin Read исключения зафиксированы для двух user GET routes и roles GET; публичных write-исключений нет.

## Замечания и риски

- Blocking findings отсутствуют; rework execution units не требуются.
- Глобальная уникальность `username` между tenant остаётся известным ограничением вне scope этого bugfix.

## Следующий workflow

После `APPROVED` Router должен последовательно выполнить `openspec-sync-specs`, повторную strict validation change и только затем `openspec-archive-change`.
