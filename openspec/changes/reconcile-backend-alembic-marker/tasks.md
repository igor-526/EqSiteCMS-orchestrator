# Tasks — reconcile-backend-alembic-marker

Approval отсутствует: все задачи реализации unchecked. Deliverables/ownership, DAG и test matrix — в [design](design.md#execution-units); units отмечают только фактически выполненные свои задачи, checklist сериализуется Router. PLAN-DB-2 исправляет план gates, не выполняет реализацию.

## Execution units

`reports` — `docs/reports/reconcile-backend-alembic-marker/`; `spec` — [delta spec](specs/backend-alembic-marker-reconciliation/spec.md). Backend source paths ниже имеют префикс `services/backend/`. Context pack каждого unit — точечный, <20K с ядром; корректирующий PLAN-DB-2 — <8K. Не читать upgrades миграций, всю историю и другие changes. Применимые профиль/skills загружаются по протоколу.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| BE-DB1 | Backend | A | `db.alembic_version.version_num`, `reports/be-db1.md` | новое approval | DB-01..08; graph/CAS/SELECT/current/heads | task 094; design Context/Decisions/Tests; spec; `src/alembic.ini` script_location и metadata `src/migration/versions/*.py`; stack-control; approval handoff |
| QG-ENV | Quality Gate | B | `reports/qg-env.md` | BE-DB1 | status/doctor/logs app; DB-09 | design Scope/Execution units; spec runtime gate; BE-DB1 handoff/evidence; stack-control |
| QG-BE | Quality Gate | B | `reports/qg-be.md` | QG-ENV | DB-02..08; независимый SELECT/current/heads | design Decisions/Test matrix; spec; BE-DB1/ENV evidence; stack-control |
| QG-CONTRACTS | Quality Gate | B | `reports/qg-contracts.md` | QG-ENV | DB-01/10; scope review | design Scope/Access matrix; spec; task 094; BE-DB1 handoff |
| QG-LIVE | Quality Gate | B | `reports/qg-live.md` | QG-BE, QG-CONTRACTS | DB-08/09 read-only runtime+SQL | design Tests/PostgreSQL; spec runtime gate; ENV/BE/CONTRACTS handoffs; stack-control |
| QG-FORMAT-PREP | Quality Gate | B, D | `reports/qg-format-prep.md`, изолированный worktree | QG-LIVE | Чистота изоляции/revisions/cache/baseline | design Execution units FORMAT; LIVE handoff; Router isolation/revisions handoff; только нужные Makefile targets |
| QG-FORMAT | Quality Gate | B, D | `reports/qg-format.md`, изолированный worktree | QG-FORMAT-PREP | Из корня `make format`, `make lint`, `make test`; дополнительно strict validate | design FORMAT; PREP handoff; собственные spec/tasks; только нужные Makefile targets |
| QG-SYNTH | Quality Gate | C | `docs/reports/reconcile-backend-alembic-marker-qg-review.md` | QG-FORMAT и все предыдущие lanes | единственный overall verdict | spec; tasks; handoffs/evidence перечисленных lanes |

Gates: ENV → параллель BE+CONTRACTS → LIVE → FORMAT → SYNTH. PREP — отдельный invocation внутри FORMAT-stage. FE N/A: нет UI diff. LIVE — реальная SQL metadata проверка, без API business smoke/browser: scope меняет только marker, не HTTP поведение. ENV read-only, без ready/migrate/rebuild/restart. Evidence не внутри change. Router уведомляет о будущем Full Access запуске и проверочных командах по протоколу; PLAN-DB-2 не запрашивает approval/escalation. Workspace caches fallback — в PREP/FORMAT; отказ прав не обходить. После SYNTH APPROVED Router отдельно организует sync/validation/archive; runtime/schema repair не подразумеваются.

## 1. BE-DB1 — транзакционная коррекция metadata (профиль: Backend)

**Specs:** `backend-alembic-marker-reconciliation` · **Ownership:** deliverable A · **Зависит от:** новое явное approval exact transition и риска schema.

- [ ] BE-DB1.1 Проверить новое approval и признание риска: marker repair не откатывает schema и не доказывает equivalence; старое Docker approval неприменимо.
- [ ] BE-DB1.2 Повторно проверить текущий metadata graph/host-runtime соответствие: единственный exact head `c8fda9794a60`, нет duplicate/cycle/missing parent; при расхождении STOP.
- [ ] BE-DB1.3 Подтвердить sanitized identity development backend DB через stackctl alias `db` без DSN/credentials, исключить production/staging/неоднозначность.
- [ ] BE-DB1.4 Получить read-only SELECT, убедиться count=1 и old=`d1e2f3a4b5c6`, сохранить snapshot/time/identity/head/approval в собственной evidence до write.
- [ ] BE-DB1.5 Составить и проверить узкую транзакцию с table lock, таймаутами, повторным count/old guard, conditional UPDATE, rowcount=1 и target guard; нарушения дают exception/ROLLBACK. Не применять отрицательные тесты к рабочей development DB.
- [ ] BE-DB1.6 Через `scripts/stackctl psql db -c ...` выполнить ровно один согласованный CAS `d1e2f3a4b5c6` → `c8fda9794a60`; зафиксировать COMMIT или полный ROLLBACK/STOP без auto retry.
- [ ] BE-DB1.7 После COMMIT выполнить SELECT и через stackctl exec app только Alembic current/heads из подтверждённого runtime src path, сохранить exit codes и exact результаты; без health repair/schema выводов.
- [ ] BE-DB1.V Сверить DB-01..08 по test matrix, отметить только фактически выполненное и передать Router handoff с old→target, evidence и postcheck blockers; остановиться.

## 2. QG-ENV — отдельная проверка runtime (профиль: Quality Gate)

**Ownership:** `reports/qg-env.md` · **Зависит от:** BE-DB1.

- [ ] QG-ENV.1 Read-only проверить stackctl status для app/db, при unhealthy собрать sanitized doctor/logs app; без ready/restart/rebuild/migrate.
- [ ] QG-ENV.2 Зафиксировать DB-09: running/healthy либо BLOCKED; health не доказывает schema equivalence, repair требует другого согласования.
- [ ] QG-ENV.V Сохранить evidence/exit codes и частный handoff Router, без overall verdict.

## 3. QG-BE — guards и metadata (профиль: Quality Gate)

**Ownership:** `reports/qg-be.md` · **Зависит от:** QG-ENV; параллельно CONTRACTS.

- [ ] QG-BE.1 Review DB-02..07: exact head/identity/cardinality/snapshot/lock/CAS rowcount/rollback/timeout; no stamp/schema writes.
- [ ] QG-BE.2 Независимо read-only повторить SELECT/current/heads (DB-08), проверить одну строку/один head/target; без повторной коррекции.
- [ ] QG-BE.V Сохранить частные findings/exit codes и handoff Router; обязательный полный FORMAT выполняется отдельной стадией.

## 4. QG-CONTRACTS — границы (профиль: Quality Gate)

**Ownership:** `reports/qg-contracts.md` · **Зависит от:** QG-ENV; параллельно BE.

- [ ] QG-CONTRACTS.1 Проверить DB-01/10: новое approval, exact transition, schema риск, отсутствие заявлений equivalence/rollback.
- [ ] QG-CONTRACTS.2 Подтвердить отсутствие API/NATS/schema/migration/code/Docker diff этого change, не присваивать чужой dirty diff; endpoint/auth N/A обоснована.
- [ ] QG-CONTRACTS.V Сохранить частные findings и handoff Router.

## 5. QG-LIVE — фактическое состояние (профиль: Quality Gate)

**Ownership:** `reports/qg-live.md` · **Зависит от:** QG-BE и QG-CONTRACTS.

- [ ] QG-LIVE.1 Подтвердить stackctl app running/healthy; при unhealthy STOP/BLOCKED без auto repair.
- [ ] QG-LIVE.2 На реальной development PostgreSQL выполнить DB-08/09: read-only SELECT/current/heads и exact target; API/browser business smoke не нужен, write probes запрещены.
- [ ] QG-LIVE.V Сохранить live evidence/exit codes и частный handoff без schema equivalence; передать результат на FORMAT preparation.

## 6. QG-FORMAT-PREP — изоляция проверок (профиль: Quality Gate)

**Ownership:** `reports/qg-format-prep.md`, deliverable D · **Зависит от:** QG-LIVE; отдельное поручение Router.

- [ ] QG-FORMAT-PREP.1 Получить Router handoff о Full Access notification и разрешённых проверочных командах, точных root/service revisions и согласованном snapshot; не запрашивать escalation при denied access.
- [ ] QG-FORMAT-PREP.2 Подготовить чистый изолированный worktree без чужого dirty diff; явно подтвердить абсолютные пути и границы сервисных репозиториев, отсутствие опасных mounts/Compose действий с рабочим checkout/development DB.
- [ ] QG-FORMAT-PREP.3 Зафиксировать baseline comparison и безопасные workspace caches (`UV_CACHE_DIR`, `XDG_CACHE_HOME`) как fallback при недоступности стандартных caches; отсутствие безопасной изоляции — BLOCKED, не skip FORMAT.
- [ ] QG-FORMAT-PREP.V Передать FORMAT точный корень worktree, revisions/clean-state/caches/baseline и evidence; не переносить formatter diff в основной checkout.

## 7. QG-FORMAT — обязательные root проверки (профиль: Quality Gate)

**Ownership:** `reports/qg-format.md`, deliverable D · **Зависит от:** QG-FORMAT-PREP.

- [ ] QG-FORMAT.1 Проверить PREP handoff и чистоту изоляции; выполнить из её корня обязательно `make format`, `make lint`, `make test`, сохраняя отдельные exit codes/output каждой команды. Code diff отсутствует — не основание отмены проверок.
- [ ] QG-FORMAT.2 Отделить baseline failures от change findings на одинаковых revisions/окружении; сохранить formatter diff как finding без автоматического переноса. При недоступности caches использовать workspace fallback, denied access — STOP/handoff без escalation.
- [ ] QG-FORMAT.3 Дополнительно выполнить OpenSpec status и strict validate, проверить ссылки/checklist/русский язык и secret-free evidence; это не заменяет make-команды.
- [ ] QG-FORMAT.V Сохранить частный результат всех команд, baseline и change findings; handoff Router для SYNTH.

## 8. QG-SYNTH — единственный общий verdict (профиль: Quality Gate)

**Ownership:** `docs/reports/reconcile-backend-alembic-marker-qg-review.md` · **Зависит от:** QG-FORMAT и всех предыдущих lanes.

- [ ] QG-SYNTH.1 Свести ENV/BE/CONTRACTS/LIVE/PREP/FORMAT, FE N/A и baseline findings; проверить соблюдение порядка gates и evidence.
- [ ] QG-SYNTH.2 Выпустить единственный overall APPROVED/REWORK/BLOCKED без расширения scope; rework вернуть конкретному владельцу, sync/archive до APPROVED запрещены.
- [ ] QG-SYNTH.V Передать итоговый report/handoff Router; после APPROVED отдельная sync specs/повторная validation/archive, без implicit runtime/schema repair.
