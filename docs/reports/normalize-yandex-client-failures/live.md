# QG-LIVE — normalize-yandex-client-failures

**Актуальный статус lane: PASSED — QG-LIVE-R1, SM-03 завершён, LIVE-FIXTURE-01 закрыт.** Предыдущие 84/84 safe HTTP checks сохранены; новый bounded SM-03 — 11/11. Общий APPROVED выставляет только QG-SYNTH. Production isolation остаётся условием release.

Ниже сохранена история первоначального BLOCKED-прогона; актуальное разрешение использовать existing dev account, persistence evidence и cleanup приведены в заключительной секции QG-LIVE-R1.

## Scope и prerequisites

Приняты handoffs ENV-BE01-refresh, QG-BE-R1 passed и QG-CONTRACTS-R1 passed. Прочитаны только назначенные инструкции, SM-01..04/PostgreSQL из [design](../../../openspec/changes/normalize-yandex-client-failures/design.md#L214-L235), HTTP access/expectations, LIVE tasks и [актуальная ENV refresh секция](environment.md#L133-L180). Source предыдущих units, proposal и чужие изменения не читались/не менялись. Загружены stack-control и проектный api-smoke-test SKILL.md.

`scripts/stackctl status --json` → exit 0: YA и M running/healthy, обе PostgreSQL running/health=none. Только актуальные BASE_YA=`http://127.0.0.1:8007`, BASE_M=`http://127.0.0.1:32770`; старые порты не использовались. Main backend в общем status unhealthy; он не target этого unit, не ремонтировался. Новый live main-backend 401/403 check не заявляется; сохранение main auth принято из BE/CONTRACTS handoffs. Ни ready, ни rebuild/restart, ни миграций, ни infrastructure changes.

## Fixture safety и внешний blocker LIVE-FIXTURE-01

До любой потенциальной записи read-only discovery через live `/openapi.json` и `stackctl psql` установил:

- YA API создания аккаунта предоставляет только `POST /api/auth/code`, требующий OAuth code. Отдельного supported fixture/account-create API нет в опубликованном контракте.
- SQL: `yandex_user` содержит **1** аккаунт; `yandex_metrica_counters` содержит **0** счётчиков. PII, ID существующего аккаунта, encrypted tokens и credentials не извлекались/не печатались.
- Counter имеет обязательный `yandex_user_id`, FK `REFERENCES yandex_user(id) ON DELETE CASCADE`, UNIQUE по equestrian_id. Произвольный UUID account не является валидной fixture.
- Существующий аккаунт не подтверждён как принадлежащий QG. Наличие строки не разрешает использовать её для writes. Прямой SQL seed запрещён, реальный OAuth exchange/внешние credentials не применялись.

Заранее залогированы только новые безопасные UUID для read-only probes:

```text
T = c77b5eb9-95e0-4e09-8ec2-beef39f3277f (tenant)
A = dd2dedec-9e9b-407a-a4d9-fce44804a8fe (unknown account)
```

До и после HTTP SQL подтвердил tenant_accounts=0, unknown_account=0, tenant_counters=0. Это **не созданная валидная account fixture**. Cleanup policy: никакой DELETE чужого account/counter; поскольку записи не разрешались и не создавались, cleanup — no-op с проверкой отсутствия собственных строк. Создание counter, получение его DB ID, POST/GET/DELETE/DELETE и persistence readback **не выполнялись**. Даже malformed write не подменял SM-03.

Условие разблокировки: передать подтверждённый изолированный QG-owned account и разрешение использовать его для собственного counter с точным cleanup либо поддерживаемый API provision без внешних credentials. В рамках текущих разрешений автономно создать валидный account нельзя. Нового source/seed API здесь не добавлять.

## Одна live HTTP/SQL verification group

Вызовы выполнялись Python subprocess wrapper без сохранения скриптов/новых tests. Discovery и проверка — одна bounded live группа. Все bash wrappers завершились exit 0; background jobs не запускались. Команды:

```text
scripts/stackctl status --json
docker inspect eqsitecms-yandex-service eqsitecms-ya-metrica-service eqsitecms-db-yandex eqsitecms-db-ya-metrica
scripts/stackctl psql db-yandex -c <read-only schema/constraints/counts/UUID absence SELECT>
scripts/stackctl psql db-ya-metrica -c "SELECT 1;"
curl -sS --connect-timeout 5 --max-time 20 -X <method> [mode header] -w '\n%{http_code}\n%{time_total}\n%{redirect_url}' <BASE+path>
```

`-L` отсутствует: redirect не следовали, `%{redirect_url}` проверен пустым. Три режима каждого сценария: **N** anonymous без auth/cookie; **A** `Authorization: Bearer qg-noncredential-marker`; **C** `Cookie: session=qg-noncredential-marker`. Это намеренно не реальные пользовательские credentials: peer routes не аутентифицируют user cookies/Authorization, дополнительные права от них не заявляются. Логин main backend и чтение его credential store для этих dev exceptions не требуются. Валидная CMS session не проверялась.

### HTTP результаты и timings

84/84 выполненных запросов прошли assertions, 28 сценариев × N/A/C. Статус в таблице одинаков во всех трёх режимах. Время — curl time_total, ms, в порядке **N / A / C**. D1 проверен как непустой документ, без исполнения/загрузки внешних JS. Все 400 содержали JSON detail; traceback и отражение token/header marker отсутствовали.

| Peer / ID | Запрос (T/A — UUID выше) | HTTP | ms N / A / C | Safe payload / assertion |
|---|---|---:|---|---|
| YA H1 | GET /health | 200 | 1.17 / 1.04 / 1.09 | `{"status":"ok"}` |
| YA D1 | GET /docs | 200 | 0.91 / 0.71 / 1.33 | HTML, 1023 bytes |
| YA D1 | GET /redoc | 200 | 1.59 / 1.06 / 1.37 | HTML, 905 bytes |
| YA D1 | GET /openapi.json | 200 | 1.28 / 0.91 / 0.85 | JSON, 12937 bytes |
| YA D1 | GET /docs/oauth2-redirect | 200 | 0.87 / 0.81 / 0.49 | HTML, 3012 bytes |
| YA R1 | GET /qg-live-no-such-route | 400 | 1.07 / 0.86 / 0.77 | `{"detail":"Запрос отклонён"}` |
| YA R1 | POST /health | 400 | 0.56 / 1.17 / 0.86 | тот же detail; unsupported method, не write |
| YA R1 | GET /health/ | 400 | 0.88 / 0.84 / 0.76 | тот же detail; redirect отсутствует |
| YA Y1 | GET /api/auth/link?equestrian_id=T | 200 | 20.39 / 1.35 / 2.02 | auth_link HTTPS oauth.yandex.ru/authorize; query не сохранён |
| YA Y3 | GET /api/accounts/?equestrian_id=T | 200 | 34.26 / 25.32 / 28.36 | `{"items":[],"total":0}` |
| YA Y7 | GET /api/connections/metrica/T | 200 | 24.23 / 22.85 / 25.17 | `{"counter":null}` |
| YA Y5 | GET /api/servicing/access-token/A | 400 | 25.61 / 26.36 / 24.97 | `{"detail":"Не удалось выполнить запрос"}` |
| YA Y6 | GET /api/metrica/counters?account_id=A | 400 | 26.27 / 23.63 / 22.39 | тот же safe detail |
| YA Y1 | GET /api/auth/link (missing selector) | 400 | 1.47 / 1.46 / 2.41 | request_validation |
| YA Y1 | GET /api/auth/link?equestrian_id=not-a-uuid | 400 | 1.13 / 1.19 / 1.91 | request_validation |
| YA Y3 | GET /api/accounts/?equestrian_id=T&limit=not-an-integer | 400 | 1.67 / 2.12 / 1.24 | request_validation |
| YA Y7 | GET /api/connections/metrica/not-a-uuid | 400 | 1.69 / 2.97 / 3.72 | request_validation |
| M H1 | GET /health | 200 | 0.94 / 0.71 / 0.80 | `{"status":"ok"}` |
| M D1 | GET /docs | 200 | 0.67 / 0.46 / 0.79 | HTML, 1015 bytes |
| M D1 | GET /redoc | 200 | 0.61 / 0.46 / 0.39 | HTML, 897 bytes |
| M D1 | GET /openapi.json | 200 | 0.56 / 0.90 / 0.56 | JSON, 3090 bytes |
| M D1 | GET /docs/oauth2-redirect | 200 | 0.58 / 0.64 / 0.56 | HTML, 3012 bytes |
| M R1 | GET /qg-live-no-such-route | 400 | 0.56 / 0.68 / 0.50 | `{"detail":"Ошибка HTTP-запроса"}` |
| M R1 | POST /health | 400 | 0.51 / 0.55 / 0.90 | тот же detail; unsupported method |
| M R1 | GET /health/ | 400 | 0.78 / 0.89 / 0.56 | тот же detail; redirect отсутствует |
| M M1 | GET /api/metrica/counters (missing token) | 400 | 22.63 / 1.36 / 1.33 | `{"detail":[{"loc":["query","access_token"],"type":"missing"}]}` |
| M M1 | GET /api/metrica/counters?access_token=qg-invalid-ciphertext | 400 | 2.19 / 2.28 / 1.40 | `{"detail":"Ошибка расшифровки токена"}` |
| M M1 | GET /api/metrica/counters?access_token=qg-invalid-ciphertext&limit=not-an-integer | 400 | 0.98 / 0.96 / 0.85 | `{"detail":[{"loc":["query","limit"],"type":"int_parsing"}]}` |

YA request_validation payload: `{"detail":[{"type":"request_validation","msg":"Некорректные параметры запроса"}]}`. Real access-token GET для существующего account не делался; OAuth link не открывался, реальный OAuth code не обменивался, внешние Яндекс API с credentials не вызывались. Live upstream failure/success/partial counters **не заявляются**; их ранее переданное MockTransport evidence (YA 662/M 262) здесь не повторялось. Успешный M1 200 требует upstream fixture и live не проверялся.

### SQL evidence и cleanup verification

Полный docker inspect получен только в памяти subprocess; наружу выводились safe booleans/bindings. Для обеих пар peer/DB POSTGRES_USER/DB/PASSWORD непустые и совпадают; peer port=5432, host соответствует DB alias. Credentials/полные DSN не попадали в argv, tool output или report. SQL исполнялся исключительно через `scripts/stackctl psql`, его safe TCP auth gate подтвердил на **каждом** вызове:

```json
{"database":"db-yandex","target":{"container":"eqsitecms-db-yandex","address":"172.20.0.11","port":5432},"probes":{"positive":"passed","negative":"password_auth_rejected"},"exitCode":0}
{"database":"db-ya-metrica","target":{"container":"eqsitecms-db-ya-metrica","address":"172.20.0.18","port":5432},"probes":{"positive":"passed","negative":"password_auth_rejected"},"exitCode":0}
```

Discovery: YA tables yandex_user/yandex_metrica_counters/alembic_version; M только alembic_version. Это реальные PostgreSQL, не SQLite. Safe readback:

| Проверка | До HTTP | После HTTP |
|---|---:|---:|
| YA accounts (общая cardinality) | 1 | 1 |
| YA counters (общая cardinality) | 0 | 0 |
| YA tenant_accounts по T | 0 | 0 |
| YA unknown_account по A | 0 | 0 |
| YA tenant_counters по T | 0 | 0 |
| M SELECT 1 | 1 | 1 |

Проверка read-only cardinality/отсутствия UUID **не является SM-03 persistence evidence**. Созданных fixtures=0, удалённых rows=0; cleanup no-op подтверждён. Существующие данные не изменялись.

## SM traceability, exposure и handoff

| ID | Результат |
|---|---|
| SM-01 | safe read/health/docs/routing и anonymous/header/cookie parity passed; положительный upstream M1 не выполнялся |
| SM-02 | malformed UUID/limit, invalid ciphertext, unknown account Y5/Y6 passed |
| SM-03 | **BLOCKED**: нет подтверждённого QG-owned account; цепочка 200→200→204→204 и persistence DB readback не выполнены |
| SM-04 | dev exposure зафиксирован, production isolation не доказана |

Read-only inspect подтвердил dev bindings YA `0.0.0.0/[::]:8007→8000`, M `0.0.0.0/[::]:32770→8000`; DB опубликованы на `5438/5439→5432`, общая сеть из ENV `eqsitecms_network`. DB StartedAt при inspect: YA `2026-10-16T06:53:53.083424918Z`, M `2026-10-16T06:53:53.336725724Z`, совпадают с refresh. Это допустимый dev Q2, не blocker само по себе и **не доказательство production isolation**. Перед production deployment/release требуется технически подтверждённая защита чувствительных peer APIs от внешних anonymous callers; без неё production release блокируется. Никакие auth/network/401/403 changes не выполнялись.

Infrastructure fault целевых peers отсутствовал; doctor/logs и repair не требовались, repair attempts=0. Source/tests/smoke/DB seed не менялись; pytest/make/commit/reset/stash не запускались. Изменены только этот report и собственный evidence checkbox [LIVE tasks](../../../openspec/changes/normalize-yandex-client-failures/tasks.md#L170-L176): QG-LIVE.V выполнен как фиксация BLOCKED + cleanup/handoff; QG-LIVE.1/.2 оставлены unchecked из-за незавершённых fixture/persistence требований. Следующий шаг Router на момент первоначального прогона — обеспечить безопасную account fixture/разрешённый provision для отдельного bounded LIVE resume; не считать 84 passing probes полным прохождением lane.

## QG-LIVE-R1 — bounded resume SM-03, актуальный итог

### Разрешение и границы

Пользователь явно разрешил тестировать на единственном existing dev account («В базе есть один аккаунт. На нём можно тестировать») в контексте временного counter без изменения account/tokens. Это разрешение использовать FK, **не** разрешение удалять/менять account или его existing data. LIVE-FIXTURE-01 закрыт выполненным ниже сценарием и cleanup. SM-01/02/04 приняты из предыдущих 84/84 checks; без повторного полного прогона. Предпосылки BE-R1/CONTRACTS-R1 сохранены.

`scripts/stackctl status --json` → exit 0: целевые YA/M running/healthy; BASE_YA=`http://127.0.0.1:8007`, BASE_M=`http://127.0.0.1:32770`. Read-only `/health` обоих peers → 200 `{"status":"ok"}` (discovery probes, отдельные timings не сохранялись). Main backend unhealthy вне scope; ready/rebuild/repair не выполнялись.

Из SQL account извлечены только UUID и tenant selector, без PII/tokens:

```text
account A = 36eef62f-4ea8-488b-af76-6f00403da4cc
account tenant = 3fa85f64-5717-4562-b3fc-2c963f66afa6
fixture tenant T = 379327f9-0220-4f60-814e-ece5c3524cc5
fixture counter_id marker M = qg-live-r1-b030a53d917d4505ab98
created row ID C = 86b1a470-93fa-4d5b-bd6e-88ad0bd36141
```

T — явно выбранный собственный UUID, не tenant существующего account. Никаких account/tenant relationships не provisioned: существующий account использован только через разрешённый FK. До POST: accounts=1, counters=0, tenant_accounts(T)=0, fixture=0, collisions=0. Поэтому существующий counter не перезаписывался; конфликтные строки не трогались.

До записи объявлен cleanup plan: искать только строку по точной тройке T/A/M; DELETE только по её UUID после read-only подтверждения. API сам назначает C; значение подтверждено SQL и залогировано **до DELETE**. `finally` работает также при failure POST/ответа: повторно ищет ровно свою тройку, не удаляет чужие ресурсы. Account DELETE не вызывался.

### Команды и безопасность

Одна bounded live HTTP/SQL группа через Python subprocess/urllib wrapper, без сохранения test scripts и без background jobs:

```text
scripts/stackctl status --json
docker inspect eqsitecms-yandex-service eqsitecms-ya-metrica-service eqsitecms-db-yandex eqsitecms-db-ya-metrica
GET <BASE_YA|BASE_M>/health
GET <BASE_YA>/openapi.json  # только интерфейс connections DTO
scripts/stackctl psql db-yandex -c "BEGIN READ ONLY; <schema/UUID/counts/fixture SELECT>; COMMIT;"
scripts/stackctl psql db-ya-metrica -c "BEGIN READ ONLY; SELECT 1; COMMIT;"
Python urllib, timeout=20, NoRedirect: POST/GET/DELETE <BASE_YA>/api/connections/metrica[/{T|C}]
```

Inspect разобран только в памяти: у обеих пар peer/DB совпали POSTGRES_USER/DB/PASSWORD, host входит в network aliases DB, port=5432, health=healthy. Секреты/DSN не выводились и не попадали в argv/report. Весь SQL исключительно READ ONLY через stackctl, без seed/INSERT/UPDATE/DELETE.

TCP gate **на каждом** SQL вызове: positive=`passed`, negative=`password_auth_rejected`, exitCode=0. Targets: YA `eqsitecms-db-yandex / 172.20.0.11:5432`, M `eqsitecms-db-ya-metrica / 172.20.0.18:5432`; M SELECT 1 до/после → 1.

Полные HTTP DTO могут включать nested `yandex_account`: они оставались только в памяти. В evidence whitelist только id/equestrian_id/counter_id, проверка account.id=A без сохранения его прочих полей. Реальные OAuth/upstream, account access-token endpoints и credential store не вызывались.

### Предварительные ошибки harness и восстановление

1. Первый wrapper завершился exit 1 **до HTTP/SQL записи**: неверно сравнивал host с коротким alias вместо полного имени. Read-only inspect установил фактические host `eqsitecms-db-yandex` / `eqsitecms-db-ya-metrica`; проверка исправлена на membership в DB aliases. Это не runtime failure.
2. Первый fixture marker `qg-live-r1-b030a53d-917d-4505-ab98-aaf059c2145f` превышал max_length=31. Pre-GET N → 200 counter=null, 30.36 ms; POST N → 400, 27.39 ms (64 bytes, полный error payload не сохранялся). Wrapper exit 1, но `finally` отработал: fixture отсутствует, accounts=1/counters=0, extra DELETE=0. Точечно прочитаны только DTO/entity/table как интерфейс fixture; ограничение подтверждено [entity:13](../../../services/yandex-service/src/core/entities/yandex_metrica_counter.py#L13) и [table:25](../../../services/yandex-service/src/models/yandex_metrica_counters.py#L25). Маркер сокращён до M (31 символ), новый cleanup plan объявлен до успешного POST. Это исправление входных данных smoke, не source fix. Overlong attempt не засчитан как SM-03 pass.

### Успешный SM-03 — HTTP evidence

Режимы **N/A/C** те же, что в первоначальном прогоне: anonymous / synthetic Authorization header / synthetic Cookie. A/C **не являются валидной CMS session** и не дают user ownership. Это утверждённые credential-less private-peer exceptions Y7/Y8/Y9; same fixture используется во всех вариантах, чужие IDs не проверяются destructive-вызовами. POST выполнен один раз N, GET и DELETE — N/A/C; это не повторная запись fixture под видом auth.

POST body: `{"equestrian_id":T,"yandex_account_id":A,"counter_id":M}`. Safe counter payload **P**: `{"id":C,"equestrian_id":T,"counter_id":M}`; nested account не сохранялся.

| Шаг | Запрос | Режим | HTTP | ms | Safe payload/assertion |
|---|---|---|---:|---:|---|
| 1 | GET /api/connections/metrica/T | N | 200 | 29.95 | `{"counter":null}` |
| 2 | POST /api/connections/metrica | N | 200 | 34.06 | P, account.id=A в памяти |
| 3 | GET /api/connections/metrica/T | N | 200 | 30.19 | `{"counter":P}` |
| 4 | GET /api/connections/metrica/T | A | 200 | 25.56 | тот же C/T/M |
| 5 | GET /api/connections/metrica/T | C | 200 | 30.63 | тот же C/T/M |
| 6 | DELETE /api/connections/metrica/C | N | 204 | 30.98 | body 0 bytes |
| 7 | DELETE /api/connections/metrica/C | A | 204 | 27.92 | body 0 bytes, idempotent |
| 8 | DELETE /api/connections/metrica/C | C | 204 | 28.81 | body 0 bytes, idempotent |
| 9 | GET /api/connections/metrica/T | N | 200 | 25.15 | `{"counter":null}` |
| 10 | GET /api/connections/metrica/T | A | 200 | 25.06 | `{"counter":null}` |
| 11 | GET /api/connections/metrica/T | C | 200 | 23.96 | `{"counter":null}` |

11/11 assertions passed, wrapper exit 0. Во всех строках redirect отсутствует. POST/GET с fixture — 368/380 bytes, после удаления GET — 16 bytes; сырые nested payload не логировались. Последовательность SM-03 подтверждена: 200→200→204→204→200 counter=null, плюс третий идемпотентный DELETE и header/cookie parity.

### SQL persistence и finally cleanup

| Readback | accounts | counters | exact fixture T/A/M | collisions | account identity A/tenant | accounts updated_at после старта |
|---|---:|---:|---:|---:|---:|---:|
| До POST | 1 | 0 | 0 | 0 | 1 | 0 |
| После POST | 1 | 1 | 1 | 0 | 1 | 0 |
| После DELETE N | 1 | 0 | 0 | 0 | 1 | 0 |
| После DELETE A | 1 | 0 | 0 | 0 | 1 | 0 |
| После DELETE C | 1 | 0 | 0 | 0 | 1 | 0 |
| finally | 1 | 0 | 0 | 0 | 1 | 0 |

Отдельный SELECT id по T/A/M после POST вернул только C. В `finally` SELECT вернул пустой набор, extra DELETE=0; исходный readback целиком восстановлен. Создана и удалена **одна собственная counter row**. Account identity/cardinality сохранены, SQL-предикат не обнаружил обновлений account после старта группы; PII/tokens для сравнения не извлекались, byte-for-byte сравнение секретных полей не заявляется. Ни один account write endpoint не вызывался.

**Актуальный итог:** SM-03 PASSED; в сочетании с сохранёнными SM-01/02/04 и предыдущими 84/84 safe checks lane QG-LIVE **PASSED**. Успешный bounded сценарий добавил 11/11, а не заменил историю; два health discovery probes и предварительный input-error attempt в это число не включены. LIVE-FIXTURE-01 закрыт. QG-LIVE.1/.2 отмечены, QG-LIVE.V сохранён checked. Изменены только этот report и свои checkbox [LIVE tasks](../../../openspec/changes/normalize-yandex-client-failures/tasks.md#L175-L177).

Остаток LIVE отсутствует. Production isolation всё ещё **не проверена**, остаётся обязательным условием production deployment/release; lane PASS не является общим APPROVED и не разрешает production exposure. Source/runtime/commits/make/pytest не затрагивались. Router может продолжать назначенный checkpoint/gate DAG; агент после handoff останавливается.
