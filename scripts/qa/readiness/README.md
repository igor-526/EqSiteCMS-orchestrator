# Offline readiness v1 — QA-ENV-1

Этот каталог проверяет **декларации**, не доступность и не подлинность consent.
Approval реализации ≠ runtime permit. Реальная SEO acceptance остаётся **blocked**.
Здесь нет provisioner, нового smoke harness, SQL bootstrap или issuer permit.

## Offline контракт

```sh
python3 scripts/qa/readiness/validate.py --profile <operator-provided-profile.json>
python3 -m unittest discover -s scripts/tests -p test_qa_readiness.py
```

Exit 0 печатает только `offline-profile-valid`; exit 2 — безопасные field/code,
без значений, путей из input, неизвестных ключей, exception text или credentials.
Это не `ready`, не разрешение действия и не PG/API/vendor PASS. Ошибка CLI usage
также даёт exit 2. [Schema](profile.schema.json) задаёт закрытые объекты; validator
проверяет используемое конечное подмножество schema и дополнительные cross-field
правила. Внешняя JSON Schema проверка одна недостаточна. Неизвестные поля запрещены.
[Шаблон](examples/profile.template.json) намеренно невалиден: null означает missing
input, а не согласие. Заполняет оператор; агент не создаёт настоящих permits,
manifest или consentRef. Полный synthetic профиль существует только в unit tests
как simulation в памяти, не как документ допуска.

### Поля и границы

- `change=restore-seo-qa-readiness`, свежий 32-hex `runId`, `ownerRef`,
  `isolationRef`, `residualJournalRef` — non-secret identity/attestation refs.
- `targets`: gateway/peer (scheme/host/port отдельно, без URL userinfo/query/path),
  backendPg/metricaPg/acceptancePg (host/port, database/role `_test`,
  dedicated-test-db-role, cluster/ACL attestation). IP/DNS — декларация без resolve.
  Изоляция API: dedicated project/network + внешняя attestation, не healthcheck.
  Все target IDs различны; PG acceptance DB отделена от обеих API DB.
- `resources`: project/network/volume/backendFixtures/metricaFixtures/
  acceptanceSchema с точными id/targetRef/ownerRef. `acceptanceSchema.id` строго
  `qa_<runId>_<12 lower hex>`. API fixture namespace — не runner schema.
  Project/network refs обоих API совпадают с declared resources; owner един.
- `source`: sourceRevision/runtimeRevision — одинаковые 40-hex revisions
  аттестованного source bundle; buildSourceAttestationRef должен внешне связывать
  точные backend/Метрика/CMS builds, их service revisions и bundle. Null/несовпадение
  блокируют профиль; совпадение строк без проверки attestation не доказывает runtime.
- `tenants.A/B` различны. Четыре actor refs: SEO-only, SEO+ADMIN, non-SEO(USER),
  ADMIN-only, точные role sets, tenantRef A/B; отдельно `anonymous=true`.
  `credentialRef` — opaque ID разрешённого operator secret channel, НЕ pathname,
  token, cookie, bearer, env variable или команда. Validator его не разыменовывает.
- `fixtures`: owned IDs, historyRef/afterUnbindRef, bindingRef, totals A/B,
  ordered IDs и pages; flat pages равны order, сумма totals равна числу IDs.
  Это ожидаемые данные, не доказательство persisted history.
- `permissions`: отдельные environment/actors/pg/read/cleanup группы обязательны;
  `post` опционален и требует `post` gates. Каждая содержит exact targetRefs,
  resourceRefs, actions, ownerRef, isolationRef, expiresAt с timezone,
  настоящий consentRef и opaque manifestRef/permitRef. Ни один ref не читается.
  Группы не наследуют права друг друга; наборы scopes сверяются cross-field.
  Read-only профиль без POST валиден; это не позволяет выполнить POST.
- `environment.actions`: review-existing для заранее выделенной среды; для новой
  только необходимые явно согласованные project-create/network-create/volume-create/
  db-create/role-create/acl-configure/migrate. Это ограниченный словарь, не команда.
  `actors`: fixture-setup; `pg`: setup/test/teardown; `read`: GET;
  `cleanup`: cleanup; `post`: POST-synthetic/delivery-observe/GET-readback.
  Cleanup scope фиксирует все owned resources, но не допускает массовое удаление:
  operator обязан проверить журнал и точные действия каждого underlying permit.
- `budgets`: setup/scenario ≤120s, HTTP ≤10s, group ≤900s, cleanup ≤30s.
  Expiry каждой группы покрывает минимум setup + group + cleanup от текущего UTC.
  Перед реальным действием expiry/остаточный budget проверяются снова штатным guard.
- `smoke`: diskPresent и runtimeLoadVerified независимы; true runtime требует
  loadEvidenceRef и diskPresent=true. False runtime допустим в offline профиле,
  но оставляет SK-02/реальный smoke blocked-tool. `vendorStatus=unchecked` всегда.

Уточнение scope групп: environment — все targets + project/network/volume и оба
API fixture namespace (миграции); actors — gateway + обе API PG и оба namespace;
pg — только acceptancePg/acceptanceSchema; read — gateway/peer и оба API namespace;
cleanup — все targets/resources. Optional POST — gateway + exact binding/queue/
worker/delivery refs. Никакой group не выдаёт разрешение за пределами своего
операторского документа. UI consent согласуется отдельно, в профиль v1 не входит.

## Planned runbook: только после внешнего допуска

**Ни один шаг setup/preflight/run/HTTP/Docker/PG/NATS/cleanup в QA-ENV-1
не выполняется.** Ниже инструкции оператору, не автоматический план запуска.
Исходные [ENV](../../../.qa/seo-metrica-task-monitor/QG-ENV/prerequisites.md) и
[LIVE](../../../.qa/seo-metrica-task-monitor/QG-LIVE/prerequisites.md) описывают app
stack, но НЕ предоставляют test target. Healthy app не fallback и не consent.

### 1. OP-ENV review и два штатных пути

Router получает от оператора безопасные identities: точные project/network/volume,
API endpoint, PG cluster/DB/role/ACL, отдельный acceptance target, owned namespaces,
source/build attestation, owner и residual journal. Для каждого действия нужен
отдельный подтверждённый target/resources/actions/expiry/isolation/consentRef,
включая create/drop DB/role/volume при необходимости. Credentials — только по
разрешённому operator channel; не искать app `.env`, settings или secrets.

**Путь A: заранее предоставленный dedicated test stack.** Оператор передаёт identity,
изоляцию, разрешённый read scope и runtime revision; Router сверяет resolved config
и fixtures. Никакого rebuild/migrate/создания DB без отдельного права. Для уже
предоставленного stack environment может декларировать только review-existing.

**Путь B: отдельный project/cluster создаёт оператор.** После exact permit оператор
берёт существующие Compose/сервисные средства, готовит отдельный project/config,
сеть/volumes, test DB/roles/ACL и migrations. Перед запуском он проверяет resolved
config в приватном канале: уникальные project/container names, порты, volumes,
отсутствие shared external resources и app bind mounts, только test endpoints,
непубличные peer/PG, отключённый vendor egress. Resolved config может содержать
секреты: в evidence лишь safe identity/attestation, не raw config/env dumps.

[stackctl](../../stackctl) применим для discovery/readiness только поддерживаемых
целей и только когда оператор доказал соответствие dedicated identity. Он имеет
фиксированные app aliases: не направлять `ready app` на существующий app stack,
не считать поддержку alias поддержкой произвольного test project. Если dedicated
цель не поддерживается — штатные service Make/Compose средства с review exact
project/config, без расширения stackctl. Backend/Метрика Makefile имеют test/lint,
а не универсальную setup цель; не выдумывать `make setup`.

Планируемая форма обычного Compose вызова **не готова к выполнению**, пока оператор
не подставил/проверил конфигурацию и exact service scope:

```text
docker compose --project-name <approved-dedicated-project> -f <reviewed-test-compose> up -d <approved-service-keys>
```

Штатный [Compose Метрики](../../../services/ya-metrica-service/docker-compose.yaml)
— источник service config, не готовое разрешение и не гарантированно isolated
конфигурация. Общий backend deployment ведётся root Compose; нельзя просто сменить
project name при фиксированных container names/external volumes. Если штатная
конфигурация не допускает dedicated project без нового кода — stop, Router назначает
bounded environment unit. Здесь ничего не патчится и не провизионируется.

### 2. OP-ACTORS и API fixtures

[Backend README](../../../services/backend/README.md#доступ-seo-и-локальный-smoke-профиль)
описывает startup SEO seeder и существующий
[provision_seo_smoke_user.py](../../../services/backend/maintain/provision_seo_smoke_user.py).
Из `services/backend` после отдельного fixture permit, только для local test DB:

```text
PYTHONPATH=src uv run python -m maintain.provision_seo_smoke_user --confirm-local-test-db --equestrian-id <provided-test-tenant-UUID> --credentials <operator-approved-local-file>
```

Команда принимает повторяемый `--credentials`; фактические files/operator channel
согласуются отдельно. Никаких password/DSN в argv/evidence. Это средство создаёт
только active `seo` SEO-only; НЕ даёт tenants A/B, SEO+ADMIN/non-SEO/ADMIN-only и history.
Остальные fixtures оператор/acceptance owner готовят через существующее управление
scopes/seed и явно согласованные операции. Журнал фиксирует exact synthetic IDs,
relations, owner, ожидаемые totals/order/pages, историю mixed A/B, одну parsing при
children, старый delete после cleanup и историю после unbind (SM-03).

**Missing native fixture tool — blocked:** универсальное штатное средство A/B +
все роли + persisted history этим unit не установлено. Если существующего управления
недостаточно, Router назначает отдельный bounded fixture unit после согласования
путей. Никакого скрытого SQL, массового backfill, новых scopes или one-off LIVE seed.
Конфликт ID/username/tenant/roles/status → stop, без overwrite настоящих пользователей.

### 3. OP-PG: существующий guarded runner, не новый registry

Нормативный [infra README](../infra/README.md), [manifest schema](../infra/manifest.schema.json),
[permit schema](../infra/permit.schema.json), [runner](../infra/run.py) неизменны.
PG registry остаётся `change=seo-metrica-task-monitor`, service `ya-metrica-service`,
kind `pg`; этот readiness change **не** регистрируется. Для PG-01..04 нужны все четыре:

```text
tests/integration/test_metrica_task_list_postgres.py::test_aggregate_identity
tests/integration/test_metrica_task_list_postgres.py::test_status_order_pagination
tests/integration/test_metrica_task_list_postgres.py::test_consistent_read_snapshot
tests/integration/test_metrica_task_list_postgres.py::test_history_survives_cleanup
```

Оператор предоставляет настоящие manifest/permit старого registry со свежим runId,
точно совпадающими target/resource/change/runId/kind и actions setup/test/teardown,
consentRef и timezone expiry. Profile refs — не эти документы и не их замена.
DB/role `_test`, no superuser/CREATEDB/CREATEROLE/BYPASSRLS/non-test CONNECT;
изолированный cluster или внешне подготовленные ACL. Runner не создаёт DB/роль,
не ремонтирует PUBLIC CONNECT. Schema `qa_<runId>_<12 random hex>` только owned,
не API namespace, не `public`. Credentials только в operator process
`QA_INFRA_PG_URL`, без app fallback или env dump. Service interpreter/lock/deps
предоставляет владелец среды; runner выполняет exact-node collection gate.

Только после внешнего допуска, из root (здесь **не запускалось**):

```text
python3 scripts/qa/infra/run.py preflight --kind pg --manifest <provided-manifest> --permit <provided-permit>
python3 scripts/qa/infra/run.py run --kind pg --manifest <provided-manifest> --permit <provided-permit>
```

Preflight exit0 = offline-preflight-only, не PG PASS. Runner journal остаётся
`.qa/seo-metrica-task-monitor/INFRA-1/<runId>/`; новое readiness evidence только
ссылается на него. Никакого NATS/selftest/new-change scope, произвольных pytest nodes.
≤120s/scenario, ≤15min group, cleanup≤30s; оператор согласует underlying command
budgets с этим лимитом, не копирует прежний timeout=480 как scenario budget.
Максимум 2 отдельно разрешённых repairs, один targeted QG recheck, затем stop.

### 4. OP-READ, OP-POST и OP-CLEANUP

OP-READ принадлежит прежнему LIVE: test gateway/peer + realPG + current-source,
actors/history, read permit и штатный smoke skill обязательны. Контрольная access
matrix — [approved spec](../../../openspec/changes/restore-seo-qa-readiness/specs/qa-readiness-profile/spec.md).
Gateway GET/POST: anonymous401, non-SEO и ADMIN-only403 до peer, SEO-only/SEO+ADMIN
по контракту; tenant spoof не меняет session tenant. Peer GET: missing/invalid
selector401, valid200/invalid query400 с Cookie/Bearer и без них одинаково.
Selector не credential; peer остаётся Internal Trusted Network, не public endpoint.
Реальный UI требует отдельного UI consent, viewport 1366×768.

OP-POST отдельный от read/PG/fixtures: exact binding/counter/account, изолированные
queue, worker, delivery target, readback и cleanup, no-vendor-egress attestation.
Каждый gate независим: health API не queue readiness, binding не delivery,
202 ≠ delivery ≠ completion; явный GET проверяется отдельно. Если worker нельзя
безопасно остановить перед vendor boundary — POST blocked. Создание NATS/Redis
resources требует отдельного exact scope; этот unit этого не делает.
Actual vendor path всегда unchecked, synthetic evidence его не закрывает.

OP-CLEANUP выполняет тот же operator только при действующем permit и подтверждённой
ownership. Fixture удаляется по сохранённым ID/tenant/relations, не username.
Runner удаляет только свою schema; project/network/volumes — только явно разрешённые
owned IDs, без global prune/down -v/shared cleanup. Истёкший permit или неизвестная
ownership → stop и безопасный residual journal; новое согласие до любых дальнейших
действий, даже teardown. Git rollback не разрешает runtime cleanup.

## Disk/runtime smoke matrix и внешний handoff

| Capability | Disk факт | Runtime факт | Статус / следующий владелец |
|---|---|---|---|
| `.agents/skills/api-smoke-test/SKILL.md` | файл существует | не означает catalog entry | disk-only |
| `.claude/skills/api-smoke-test/SKILL.md` | совместимый файл существует | не означает load success | disk-only |
| `api-smoke-test` catalog | не filesystem свойство | отсутствует в текущем переданном catalog | blocked-tool, внешний DSH owner |
| штатный loader | старый LIVE получил `unknown or no longer available` | успешная загрузка не доказана | SK-02 blocked |
| реальные SM-01..04 | disk ни о чём не свидетельствует | prerequisites/permits отсутствуют | blocked, прежний LIVE |

SK-01 проверяется статически, credential files рядом не открывать. Доказанный
[старый loader result](../../../.qa/seo-metrica-task-monitor/QG-LIVE/prerequisites.md)
не является новым вызовом. Router передаёт внешнему владельцу DSH catalog/loader:
зарегистрировать **существующий** skill штатным механизмом, назвать owner/ticket,
дать новую сессию с catalog entry `api-smoke-test` и успешным
`skill(name="api-smoke-test")`. Лишь тогда отдельно фиксируется load evidence.
Точная runtime ownership/ticket пока не предоставлены; их нельзя выдумывать.
Не менять `dsh/**`, mapping/preset/package/lock; не читать SKILL.md вручную как
замену штатному loader, не создавать pytest HTTP smoke. Load success не разрешает
HTTP и не даёт API/PG/vendor acceptance.

## Решение BACKLOG-A11Y-CARD

**deferred / non-waived**: старые unbound/bound card и non-SEO/ADMIN forbidden
contrast findings остаются открытыми. Будущая отдельная задача Router: exact axe
before/after, прежние selectors, feature-local text styles, 1366×768. Shared/global
palette/theme, disabled/outline изменения исключены. Закрытые modal cases не
переоткрываются; новый offline tooling PASS не закрывает эти долги.

## Точные внешние missing inputs

- Operator/Router: exact dedicated project/network/volume/API/peer/PG identities,
  isolation/cluster-ACL и current-source attestation; dependencies и свежий run scope.
- Operator + acceptance owner: tenants A/B, четыре actors/roles/auth-channel refs,
  fixtures/history/binding/expected pages, ownership и residual journal; штатное
  средство полного fixture bootstrap либо отдельный bounded unit.
- Operator: отдельные настоящие consent/manifest/permit refs и документы для
  environment, actors, PG, read, cleanup; exact targets/resources/actions/expiry.
- Внешний DSH owner через Router: имя ответственного/ticket, штатная registration,
  новая сессия и load evidence. Диск присутствует, runtime skill недоступен.
- Для optional POST: отдельный permit, binding/queue/worker/delivery/no-egress,
  readback/cleanup. Без этого только POST blocked; vendor unchecked в любом случае.

ENV-01..03/SK-01 — offline self-check; ENV-04/05/AC-01/02/SK-02 и старые SEO tasks
этим unit не закрываются. Evidence: `.qa/restore-seo-qa-readiness/QA-ENV-1/`, не
`docs/reports/` и не перезапись старого SEO change/report.
