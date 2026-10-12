# Согласование marker backend Alembic

Тикет: [094](../../../docs/tasks/094_reconcile_backend_alembic_marker.md). Сервис: backend и только его локальная development БД. Дата: 2026-10-12; временная привязка фактов — PLAN-DB-1R, не исторические предположения.

## Context

Read-only evidence PLAN-DB-1R: `scripts/stackctl psql db -c 'BEGIN READ ONLY; SELECT version_num FROM alembic_version; COMMIT;'` вернул `ok:true`, exitCode=0 и одну строку `d1e2f3a4b5c6`. Alias `db`: контейнер `eqsitecms-db`, project `eqsitecms-infra`; app: `eqsitecms-app`, project `eqsitecms-be`, running/unhealthy. DSN/секреты не выводились. Metadata 21 файлов `services/backend/src/migration/versions/*.py` образует одну связную цепь без циклов, дубликатов и отсутствующих родителей; единственный head `c8fda9794a60`, его родитель `7d28fbc9a631`. Неизвестный marker отсутствует в дереве. `services/backend/src/alembic.ini:8` задаёт `%(here)s/migration`.

Backend находится на `fix/backend-build-context-bytecode`, base из handoff `dev475a6958`; текущий diff только `.dockerignore` и `Dockerfile`. Это отдельное согласование. Host src bind rw заслоняет image src (evidence ENV-DIAG1); rebuild не устранил неизвестный marker. По handoff QG-ENV предыдущий `make be-build-nc` — FULL PASS, runtime BLOCKED. Эти исторические результаты не являются проверкой нового change. Поиск marker в 77 commits не повторять. Partial artifacts предыдущего PLAN-DB-1 отсутствовали при старте PLAN-DB-1R; текущий change новый. Чужой root dirty diff не принадлежит этому change.

## Goals / Non-Goals

**Цель:** только согласованная замена metadata `d1e2f3a4b5c6` → `c8fda9794a60` с защитой от неверной БД, изменения графа и конкурентной записи; доказательства SQL и Alembic; отдельная оценка runtime.

**Вне scope:** откат/восстановление schema удалённой миграции, schema equivalence audit, прикладные данные, DDL, stamp, upgrade, downgrade, создание/удаление миграций, изменения API/NATS/кода/Docker, restart/rebuild/migrate и сторонних DB. Unit QG-ENV в этом change read-only, не подразумевает разрешения на `ready`.

## Decisions

1. **Точный head вместо последнего имени/mtime.** Источник истины — `revision`/`down_revision` из текущего metadata. Проверить непосредственно перед записью наличие одного head, ацикличность, полноту родителей и уникальность revisions; он должен совпасть с `c8fda9794a60`. Альтернатива «выбрать последний файл» не отражает граф. Несовпадение — STOP и новое согласование, не подстановка другого head.
2. **SQL compare-and-swap вместо stamp.** Stamp допускает слишком широкую операцию, не выражает строгий rowcount guard и не подтверждает schema. В одной транзакции блокировать всю `alembic_version` от конкурентных INSERT/UPDATE/DELETE (`LOCK TABLE ... IN EXCLUSIVE MODE`), проверить count=1 и exact old marker, изменить только `version_num` условием `WHERE version_num = 'd1e2f3a4b5c6'`, проверить `GET DIAGNOSTICS ... ROW_COUNT = 1` и exact итоговую строку. Любое нарушение вызывает exception, транзакция abort/ROLLBACK, без COMMIT. Не вставлять отсутствующие строки и не удалять лишние. Ограничить lock_timeout/statement_timeout, например 5s/15s; timeout означает rollback/STOP, не циклический retry.
3. **Approval и evidence раньше write.** Router получает явное подтверждение exact transition и риска schema. Backend сначала повторно подтверждает DB identity (alias/container/compose service и соответствие backend development target; не экспортировать Config.Env/DSN), затем SELECT и сохраняет snapshot JSON/Markdown с marker, cardinality, identity без credentials, tree head, временем и связью с approval. Непосредственно перед CAS всё перепроверяется под lock. Evidence — в `docs/reports/reconcile-backend-alembic-marker/be-db1.md`, не внутри change и не backend code.
4. **Не путать rollback транзакции с восстановлением schema.** До COMMIT ошибки ничего не меняют. После COMMIT нет автоматического возврата старого неизвестного marker. Возврат marker из snapshot допускается только после отдельного решения/approval с обратным CAS и теми же guards; это опять лишь metadata, не schema rollback.
5. **Read-only postchecks.** Повторить SELECT, затем через `scripts/stackctl exec app` выполнить `alembic -c /app/src/alembic.ini current` и `heads` из runtime-каталога (уточнить фактический src path перед запуском, не угадывать). Результат current и единственный heads должны совпасть с target. Команды current/heads не заменять migrate/upgrade; если недоступен app или Alembic env вызывает неожиданную мутацию/ошибку — STOP. Health не является schema evidence.

## Access matrix

Endpoint changes — N/A. Новых/изменённых HTTP method/path нет; access class, roles, expected without auth/with auth, исключения и anonymous/authenticated endpoint tests неприменимы. Это локальная операторская DB-операция, не публичный endpoint. Бизнес-контракты и NATS не меняются; обязательный CONTRACTS проверяет именно отсутствие скрытого diff.

## Deliverables и ownership

| Deliverable | Владелец | Зона |
|---|---|---|
| A — metadata correction | Backend | Только `db.alembic_version.version_num` и `docs/reports/reconcile-backend-alembic-marker/be-db1.md` |
| B — независимые gate evidence | Quality Gate | Отдельные `qg-env.md`, `qg-be.md`, `qg-contracts.md`, `qg-live.md`, `qg-format-prep.md`, `qg-format.md` в `docs/reports/reconcile-backend-alembic-marker/`; без DB writes |
| C — общий verdict | Quality Gate SYNTH | Только `docs/reports/reconcile-backend-alembic-marker-qg-review.md` |
| D — изолированная проверочная копия | Quality Gate FORMAT | Чистый изолированный worktree с зафиксированными root/service revisions и согласованным snapshot; formatter меняет только эту копию |

Specs/план принадлежат Planner. Каждый unit отмечает только свои task IDs; правки checklist сериализуются Router. Каждая evidence-страница принадлежит ровно своему unit, evidence не хранится внутри change. Рабочий root и backend checkout, их чужой dirty diff не форматировать. FORMAT получает временную проверочную копию, не право менять исходную реализацию; возникший formatter diff фиксируется как finding, не переносится автоматически.

## Execution units

В таблице `reports` означает `docs/reports/reconcile-backend-alembic-marker/`.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| BE-DB1 | Backend | A | `db.alembic_version.version_num`, `reports/be-db1.md` | новое approval | Graph/identity/snapshot/CAS/SELECT/current/heads |
| QG-ENV | Quality Gate | B | `reports/qg-env.md` | BE-DB1 | Read-only status/doctor/logs app, health; без ready/rebuild/migrate |
| QG-BE | Quality Gate | B | `reports/qg-be.md` | QG-ENV | Независимый SELECT/current/heads, review guards |
| QG-CONTRACTS | Quality Gate | B | `reports/qg-contracts.md` | QG-ENV | Scope и отсутствие API/NATS/schema/code diff |
| QG-LIVE | Quality Gate | B | `reports/qg-live.md` | QG-BE, QG-CONTRACTS | Реальная SQL metadata проверка и read-only health |
| QG-FORMAT-PREP | Quality Gate | B, D | `reports/qg-format-prep.md`, проверочный worktree | QG-LIVE | Чистая изоляция, revisions/snapshot, caches, baseline |
| QG-FORMAT | Quality Gate | B, D | `reports/qg-format.md`, проверочный worktree | QG-FORMAT-PREP | Из корня worktree: `make format`, `make lint`, `make test`; дополнительно strict validate |
| QG-SYNTH | Quality Gate | C | `docs/reports/reconcile-backend-alembic-marker-qg-review.md` | QG-FORMAT и результаты всех предыдущих lanes | Единственный overall verdict |

```text
новое approval → BE-DB1 → QG-ENV ─┬→ QG-BE ─────────┐
                                 └→ QG-CONTRACTS ──┴→ QG-LIVE
                                                       ↓
                                  QG-FORMAT-PREP → QG-FORMAT → QG-SYNTH
```

Обязательный порядок gates: ENV → параллельные BE + CONTRACTS → LIVE → FORMAT → SYNTH. FORMAT preparation — отдельный ограниченный unit внутри стадии FORMAT, не замена gate. Router поручает изоляцию отдельному invocation; при выходе за бюджет подготовка делится до запуска команд. Каждый unit — один slice и одна группа verification; отметки checklist сериализуются.

QG-FE-AUTO/MANUAL — N/A: нет UI/FE diff. LIVE применим к изменённому состоянию реальной development DB: SELECT/current/heads и health достаточны для metadata-only scope; API business smoke/browser/mutating probes не нужны. Это не доказательство schema equivalence. ENV read-only: при unhealthy — BLOCKED и отдельное согласование restart/repair, не автоматические repair attempts.

**FORMAT обязателен всегда:** отсутствие code diff не отменяет `make format`, `make lint`, `make test` из корня чистого изолированного worktree. Strict OpenSpec validation и review ссылок дополняют, но не заменяют эти команды. Подготовка фиксирует точные root/service revisions, согласованный snapshot без чужого dirty diff, границу внешних сервисных репозиториев и безопасные cache paths; команды не должны через mounts/Compose воздействовать на рабочий checkout или development DB. При невозможности изоляции — честный BLOCKED, не пропуск FORMAT. Baseline failures отделяются от change findings сравнением на тех же revisions/окружении; сохраняются команда, exit code и output, failure не переименовывается в PASS.

Перед будущим Full Access запуском Router уведомляет пользователя о проверочных командах и изоляции по своему протоколу; PLAN-DB-2 не запрашивает approval/escalation. Если стандартные caches недоступны, FORMAT использует явно заданные caches внутри проверочного workspace (например `UV_CACHE_DIR`, `XDG_CACHE_HOME`) без обхода denial или повышения прав. Если команды требуют дополнительных прав/небезопасного runtime доступа — STOP и handoff Router, без повторов с escalation.

Общий QG начинается после BE-DB1. Lanes сообщают частные findings; единственный overall APPROVED/REWORK/BLOCKED выпускает SYNTH в общем report. После APPROVED Router отдельно организует sync/archive/finalization; никакого implicit разрешения на runtime/schema repair.

## Test matrix

Все строки трассируются на одноимённые scenarios delta spec. Без негативных мутаций настоящей development DB: adverse paths проверяются review SQL guards/транзакционных гарантий, при необходимости в отдельном изолированном транзакционном sandbox без применения к рабочему marker; не создавать schema/fixtures в development DB.

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| DB-01 | контракт/review | отсутствие approval | Нет нового approval | Никаких DB writes | BE-DB1 / CONTRACTS; «Нет разрешения» |
| DB-02 | metadata/read-only | граф | Точный единственный head | 21 revisions, target `c8fda9794a60` | BE-DB1 / BE; «Единственная вершина» |
| DB-03 | review guards | boundary | Несколько heads/цикл/неполный граф/другой head | STOP без writes | BE; «Неоднозначный граф» |
| DB-04 | real PostgreSQL | identity/cardinality | Верная development DB и единственная old строка | Snapshot secret-free до write | BE-DB1; «Подтверждённая БД» |
| DB-05 | review guards | concurrency/idempotency | Чужой marker/0 или >1 строка/повтор запуска | STOP; нет success/no-op под видом CAS | BE; «Несоответствие состояния» |
| DB-06 | real PostgreSQL | happy path/regression | Согласованный CAS | rowcount=1; exact target; COMMIT | BE-DB1; «Успешная коррекция» |
| DB-07 | review транзакции | внешние ошибки/атомарность | Ошибка, timeout, rowcount≠1 | ROLLBACK; без частичного изменения | BE; «Сбой транзакции» |
| DB-08 | real runtime | postchecks | SELECT/current/heads | Все exact target, один head | BE-DB1 / BE / LIVE; «Проверка metadata» |
| DB-09 | runtime/read-only | деградация | App остаётся unhealthy либо current падает | BLOCKED, без auto repair/schema выводов | ENV / LIVE; «Runtime не восстановлен» |
| DB-10 | контракт/review | честность результата | Marker исправлен | Не утверждать schema equivalence/rollback | CONTRACTS / SYNTH; «Ограниченный результат» |
| QG-11 | изолированная проверка | обязательность FORMAT/dirty diff/baseline | FORMAT после LIVE | Все root make-команды выполнены в чистой копии; baseline отдельно; рабочий checkout неизменён | FORMAT / SYNTH; «Обязательный FORMAT после LIVE» |

Access/auth, чужие ресурсы, HTTP response schema, frontend tests — N/A: endpoint/UI diff нет. Секреты в SQL output/log evidence редактируются; DSN/Env не сохраняются. Обязательные FORMAT проверки `make format`, `make lint`, `make test` выполняются из корня чистого изолированного worktree; включённые в эти цели unit/type/format проверки не исключаются из-за отсутствия code diff. Baseline failures фиксируются отдельно от change findings, рабочий dirty checkout не изменяется. API smoke на pytest и files `tests/smoke` не планируются.

## PostgreSQL для проверки

Используется реальная локальная DB через `scripts/stackctl psql db -c ...`, контейнер обнаружен status, credentials остаются внутри stackctl. Это SQL metadata verification, не API smoke; discovery секретов через inspect не нужен. Перед write проверить sanitized identity и соответствие backend DB target без вывода DSN; неясная DB — блокер. Production/staging запрещены.

## Risks / Trade-offs

- **Неизвестные schema effects удалённой миграции** → пользователь явно принимает риск; никакой вывод о schema equivalence не делается. Health/current PASS этого не доказывает.
- Конкурентное изменение marker/tree → table lock, count/old/rowcount guards и повтор metadata; STOP при несовпадении.
- Unknown marker после обратной коррекции → нет автоматического rollback после COMMIT; отдельное approval.
- Backend unhealthy останется → отдельный ENV finding; не обещать устранение всего runtime одним marker.
- Секреты в диагностике → только sanitized identity/output; не читать/выводить .env/DSN.

## Migration Plan

Никакая migration не исполняется. Router получает новое approval с exact old→target и schema риском; BE-DB1 сохраняет snapshot, выполняет CAS и postchecks; затем ENV → параллель BE+CONTRACTS → LIVE → FORMAT (с отдельной подготовкой изолированного worktree) → SYNTH. Evidence — только в `docs/reports/reconcile-backend-alembic-marker/`, единственный общий report — `docs/reports/reconcile-backend-alembic-marker-qg-review.md`. Любая неясность до write — STOP. Любая ошибка внутри транзакции — ROLLBACK. Ошибка после COMMIT — фиксировать фактический target и blocked runtime, не менять marker обратно автоматически.

## Open Questions

Единственный обязательный gate: согласен ли пользователь на `d1e2f3a4b5c6` → `c8fda9794a60` именно как marker-only repair, принимая, что schema не откатывается и её эквивалентность не доказана? Технический target определён, иных текущих блокеров планирования нет. Если потребуется restart или schema repair — новое отдельное согласование, не скрытое расширение этого change.
