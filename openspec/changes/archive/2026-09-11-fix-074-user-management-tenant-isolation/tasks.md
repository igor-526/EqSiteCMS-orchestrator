# Tasks — fix-074-user-management-tenant-isolation

Ownership разделён между production backend, regression tests и read-only Quality Gate; test matrix и DAG находятся в `design.md`. `contextFiles` заданы отдельно для каждого execution unit.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `U074-BE-1` | Backend | `services/backend/src/core/protocols/repositories/user_management_repository.py`, `services/backend/src/repositories/user_management_repository.py`, `services/backend/src/core/services/user_management.py` | — | точечные unit tests production slice | `design.md#decisions`, `design.md#api-access-matrix`, `specs/user-management-api/spec.md`, `agents/backend.md` (ядро + access/repository patterns) |
| `U074-BE-2` | Backend | `services/backend/tests/unit/core/services/test_user_management_service.py`, релевантные существующие repository/API unit test files | `U074-BE-1` | `UT-U074-01..UT-U074-14` | `design.md#test-matrix`, `specs/user-management-api/spec.md`, handoff `U074-BE-1`, `agents/backend.md` (ядро + tests) |
| `U074-QG-BE` | Quality Gate | read-only backend diff/tests | `U074-BE-2` | backend test/lint/type suite по gate profile | `design.md#decisions`, `design.md#test-matrix`, handoff `U074-BE-2`, production/test diff |
| `U074-QG-CONTRACTS` | Quality Gate | read-only specs/tasks/diff | `U074-BE-2` | strict validation, access/ownership audit | `proposal.md`, `design.md#api-access-matrix`, `design.md#execution-units`, `specs/user-management-api/spec.md`, `tasks.md`, production diff |
| `U074-QG-LIVE` | Quality Gate | live environment; evidence only | `U074-QG-BE`, `U074-QG-CONTRACTS` | `SM-U074-01..SM-U074-10` | `design.md#test-matrix`, `design.md#postgresql-для-smoke-тестов`, `specs/user-management-api/spec.md`, handoffs обоих lanes |
| `U074-QG-SYNTH` | Quality Gate | `docs/reports/**` | `U074-QG-LIVE` | единый verdict/report | handoffs `U074-QG-BE`, `U074-QG-CONTRACTS`, `U074-QG-LIVE`, `tasks.md` |

`QG-FE` — неприменимо: frontend diff отсутствует. `U074-QG-BE` и `U074-QG-CONTRACTS` можно запускать параллельно; полный DAG приведён в `design.md#dag`.

## 1. U074-BE-1 — tenant-safe repository и use cases (профиль: Backend)

**Specs:** `user-management-api` · **Пути:** production ownership из таблицы · **Зависит от:** —

- [x] U074-BE-1.1 Добавить обязательный keyword-only `equestrian_id` в tenant-sensitive методы `UserManagementRepositoryProtocol` для списка, lookup, username lookup и mutations.
- [x] U074-BE-1.2 Ограничить list query и count в `UserManagementRepository.get_users_with_filters` одним predicate `users.equestrian_id == equestrian_id`, сохранив фильтры, сортировку и пагинацию.
- [x] U074-BE-1.3 Ограничить `get_user_by_id` и tenant-sensitive `get_by_username` конюшней в SQL query.
- [x] U074-BE-1.4 Ограничить `soft_delete_user` и `block_user` атомарным predicate по `user_id` и `equestrian_id`.
- [x] U074-BE-1.5 Ограничить `unblock_user` и `change_password` атомарным predicate по `user_id` и `equestrian_id`.
- [x] U074-BE-1.6 Передавать `current_user.equestrian_id` из list/get service use cases во все repository reads.
- [x] U074-BE-1.7 Добавить create guard: mismatch `data.equestrian_id` и tenant текущего пользователя даёт `ForbiddenError` до username lookup/hash/create.
- [x] U074-BE-1.8 Передавать trusted tenant во все update/delete/block/unblock/password lookups и writes, сохраняя `404` для foreign/missing target и прежние role/self guards.
- [x] U074-BE-1.9 Проверить, что API paths/DTO shape не изменились и router не содержит tenant business logic.
- [x] U074-BE-1.V Прогнать точечные существующие unit tests user-management, отметить только выполненные task IDs и вернуть Router handoff.

## 2. U074-BE-2 — regression и access unit coverage (профиль: Backend)

**Specs:** `user-management-api` · **Пути:** test ownership из таблицы · **Зависит от:** `U074-BE-1`

- [x] U074-BE-2.1 Обновить mocks/fixtures под обязательные tenant-aware protocol signatures, не ослабляя существующие проверки ролей и self-protection.
- [x] U074-BE-2.2 Реализовать и прогнать `UT-U074-01..UT-U074-06` для list/count, lookup и create boundary из `design.md#test-matrix`.
- [x] U074-BE-2.3 Реализовать и прогнать `UT-U074-07..UT-U074-10` для update/delete/block/unblock/password IDOR и отсутствия side effects.
- [x] U074-BE-2.4 Реализовать и прогнать `UT-U074-11..UT-U074-14` для anonymous/role access, прежних инвариантов и атомарного tenant predicate mutation.
- [x] U074-BE-2.5 Проверить response contract: чужие записи/поля не появляются в items, `total` или single-resource response.
- [x] U074-BE-2.V Прогнать полную применимую backend unit suite, отметить выполненные IDs и вернуть Router handoff с командами и результатом.

## 3. U074-QG-BE — backend/runtime lane (профиль: Quality Gate)

**Specs:** `user-management-api` · **Пути:** read-only production/test diff · **Зависит от:** `U074-BE-2`

- [x] U074-QG-BE.1 Проверить Clean Architecture, обязательность tenant parameters и отсутствие обходных global lookup/mutation paths.
- [x] U074-QG-BE.2 Проверить атомарность write predicates, одинаковый `404` foreign/missing и отсутствие side effects до tenant authorization.
- [x] U074-QG-BE.3 Оценить качество `UT-U074-01..UT-U074-14` относительно behavior diff, включая negative assertions.
- [x] U074-QG-BE.4 Запустить применимые backend tests, lint и type checks по `agents/quality_gate.md`, сохранив точные команды/evidence в handoff.
- [x] U074-QG-BE.V Вернуть lane finding list без общего verdict; findings оформить как bounded rework units владельцу Backend.

## 4. U074-QG-CONTRACTS — contracts/access lane (профиль: Quality Gate)

**Specs:** `user-management-api` · **Пути:** read-only change artifacts и diff · **Зависит от:** `U074-BE-2`

- [x] U074-QG-CONTRACTS.1 Сверить diff с tenant requirements и всеми строками access matrix.
- [x] U074-QG-CONTRACTS.2 Проверить `401` anonymous, `403` insufficient role/create mismatch и `404` foreign target для обеих разрешённых ролей.
- [x] U074-QG-CONTRACTS.3 Проверить ownership: production и tests менялись только назначенными Backend units; frontend/NATS/DB schema не затронуты.
- [x] U074-QG-CONTRACTS.4 Выполнить `openspec validate fix-074-user-management-tenant-isolation --type change --strict`.
- [x] U074-QG-CONTRACTS.V Вернуть lane finding list без общего verdict; findings разложить на bounded rework units по владельцам.

## 5. U074-QG-LIVE — live API и PostgreSQL lane (профиль: Quality Gate)

**Specs:** `user-management-api` · **Пути:** live environment, без tracked smoke scripts · **Зависит от:** `U074-QG-BE`, `U074-QG-CONTRACTS`

- [x] U074-QG-LIVE.1 Повторно обнаружить DB container по labels/fallback и получить актуальные DB/port параметры через `docker inspect`, не хардкодя значения из design.
- [x] U074-QG-LIVE.2 Проверить health backend и подготовить изолированные fixtures двух конюшен и ролей через допустимый live API/DB setup с cleanup plan.
- [x] U074-QG-LIVE.3 Выполнить `SM-U074-01..SM-U074-03` через `.claude/skills/api-smoke-test` на живом API и реальной PostgreSQL.
- [x] U074-QG-LIVE.4 Выполнить `SM-U074-04..SM-U074-08`, фиксируя status/body и доказательство отсутствия каждого write side effect.
- [x] U074-QG-LIVE.5 Выполнить `SM-U074-09..SM-U074-10` для всех девяти routes без auth и с недостаточной ролью.
- [x] U074-QG-LIVE.6 Удалить только созданные lane fixtures recoverable/targeted способом и зафиксировать evidence; не создавать `tests/smoke/**`.
- [x] U074-QG-LIVE.V Вернуть lane finding list и smoke evidence без общего verdict.

## 6. U074-QG-SYNTH — единый Quality Gate verdict (профиль: Quality Gate)

**Specs:** `user-management-api` · **Пути:** `docs/reports/**` · **Зависит от:** `U074-QG-LIVE`

- [x] U074-QG-SYNTH.1 Свести evidence и findings `QG-BE`, `QG-CONTRACTS`, `QG-LIVE`; отметить `QG-FE` неприменимым с причиной.
- [x] U074-QG-SYNTH.2 При findings сформировать непересекающиеся bounded rework execution units владельцу Backend и указать затронутые lanes для rerun.
- [x] U074-QG-SYNTH.3 При отсутствии blocking findings создать единый отчёт в `docs/reports/` с verdict `APPROVED`; иначе `REWORK`.
- [x] U074-QG-SYNTH.4 Зафиксировать, что после `APPROVED` Router должен запустить `openspec-sync-specs`, повторную strict validation и только затем `openspec-archive-change`.
- [x] U074-QG-SYNTH.V Отметить фактически завершённые Quality Gate tasks и вернуть Router итоговый handoff.
