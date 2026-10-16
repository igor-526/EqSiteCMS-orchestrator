# QG-ENV — normalize-yandex-client-failures

**Статус lane: passed (QG-ENV-BE01-refresh после main fixes BE-01; актуальная readiness/SQL группа — в конце отчёта).** История ENV-R1/ENV-R2 сохранена; ENV-02 закрыт. Оба peers пересобраны после YA/M FIX и running/healthy; обе реальные БД подтвердили SELECT 1 и password-auth отказ неверного пароля, DB Id/StartedAt не изменились. **Актуальные BASE_YA=`http://127.0.0.1:8007`, BASE_M=`http://127.0.0.1:32770`; прежний M `:32769` — только история.** Production isolation не подтверждена; общий APPROVED/REWORK остаётся за QG-SYNTH.

## ENV-01 устранён — реальный targeted ready после TOOL-1

Прежний blocker `Unknown service: ya-metrica-service` устранён: dry-run и реальный ready успешно принимают точные aliases. Выполнена одна runtime readiness/SQL auth/inspect verification-группа; stdout парсился как JSON. Raw build/DB logs не публиковались и не сохранялись.

| Проверка | Exit | Elapsed | Evidence |
|---|---:|---:|---|
| `scripts/stackctl status --json` до ready | 0 | 0.770 s | Оба peers running/healthy; обе PostgreSQL running, healthcheck отсутствует |
| `scripts/stackctl ready yandex-service ya-metrica-service --dry-run --no-migrate` | 0 | 0.169 s | `ok:true`; rebuild только двух peers, migrate=false у обоих |
| `scripts/stackctl ready yandex-service ya-metrica-service --no-migrate` | 0 | 46.884 s | `ok:true`; оба rebuilt=true, running/healthy; проекты сохранены: eqsitecms-yandex / eqsitecms-ya-metrica |
| `scripts/stackctl psql db-yandex -c "SELECT 1"` | 0 | 0.242 s | `ok:true`, одна строка со значением 1 |
| `scripts/stackctl psql db-ya-metrica -c "SELECT 1"` | 0 | 0.218 s | `ok:true`, одна строка со значением 1 |
| `scripts/stackctl status --json` после ready | 0 | — | Оба peers running/healthy, обе БД running; актуальные bindings ниже |

Изначальная плановая пересборка: **1 ready invocation / 2 peer rebuilds**. Дополнительные repair/restart/rebuild attempts: **0**. БД не пересобирались: их StartedAt до/после совпадает (YA `2026-10-16T06:53:53.083424918Z`, M `2026-10-16T06:53:53.336725724Z`). Соседний infra stack не запускался. Миграции явно отключены; schema/repository diff нет. Direct compose/exec/psql обходы не выполнялись; docker ps/inspect использовались только read-only.

Дополнительная проверка интерфейса `scripts/stackctl help` вернула exit 1 (`Unknown command: help`); это неподдерживаемая команда, а не runtime fault. Нужные интерфейсы уточнены точечным чтением [stackctl](../../../scripts/stackctl#L423-L445); перебор aliases не выполнялся.

## История ENV-02 — TCP loopback использует trust (закрыто ENV-R2 ниже)

Новый путь [stackctl:431–445](../../../scripts/stackctl#L431-L445) действительно запускает `psql -X -w -h 127.0.0.1 -p 5432` с `PGPASSWORD`, полученным из runtime POSTGRES_PASSWORD внутри контейнера. Пароль не попадает в host argv/evidence. Но наличие PGPASSWORD и `-w` не заставляет PostgreSQL проверять пароль при HBA `trust`.

Через тот же `stackctl psql` выполнены только read-only запросы:

```sql
SELECT line_number,type,address,netmask,auth_method,error
FROM pg_hba_file_rules WHERE type LIKE 'host%' ORDER BY rule_number;

SELECT inet_client_addr(),inet_server_addr(),inet_server_port();
SELECT rule_number,line_number,type,database,user_name,address,auth_method,error
FROM pg_hba_file_rules WHERE type LIKE 'host%' ORDER BY rule_number;
```

| Evidence | db-yandex | db-ya-metrica |
|---|---|---|
| Первый запрос: exit / elapsed | 0 / 0.215 s | 0 / 0.225 s |
| Уточнение соединения и first-match: exit / elapsed | 0 / 0.193 s | 0 / 0.191 s |
| Client / server / port | 127.0.0.1 / 127.0.0.1 / 5432 | 127.0.0.1 / 127.0.0.1 / 5432 |
| Первый подходящий host rule | rule 2, line 119, database=all, user=all, 127.0.0.1/32, **trust** | то же |
| Поздний общий host rule | rule 7, line 128, address=all, scram-sha-256 | то же |
| HBA parse errors | нет | нет |

Таким образом SQL/TCP readiness подтверждена, но обязательное password-auth evidence отсутствует: ранний loopback trust совпадает с адресом текущего соединения. Это не outage и не startup code crash; restart/rebuild не устраняет детерминированный выбор HBA. Диагностика выполнена, без вывода raw logs:

| Команда | Exit | Elapsed | Safe evidence |
|---|---:|---:|---|
| `scripts/stackctl doctor db-yandex` | 0 | 0.123 s | running, health=none, exitCode=0, oomKilled=false, 0 recommendations |
| `scripts/stackctl logs db-yandex --since 5m` | 0 | 0.105 s | 0 строк |
| `scripts/stackctl doctor db-ya-metrica` | 0 | 0.127 s | running, health=none, exitCode=0, oomKilled=false, 0 recommendations |
| `scripts/stackctl logs db-ya-metrica --since 5m` | 0 | 0.106 s | 0 строк |

**Handoff Router / owner tooling:** требуется отдельное bounded решение для реального password-auth probe через stackctl с учётом existing loopback trust. Жёсткое требование TCP127.0.0.1 в [tooling delta](../../../openspec/changes/normalize-yandex-client-failures/specs/repository-process-tooling/spec.md#L9) конфликтует с фактическим HBA для доказательства password auth; TOOL-1 hermetic success этого не обнаруживает. Возможный дальнейший slice — согласовать путь к уже password-protected TCP адресу и проверить failure при неверном пароле, не изменяя DB auth/network/compose. В этом unit такой scope не расширялся; PostgreSQL/HBA/credentials не менялись. Прежний ENV-01 не переоткрывается.

## Safe PostgreSQL discovery / DSN consistency

Read-only discovery повторён: legacy labels `project=eqsitecms, service=db` дали 0 контейнеров (exit 0, 0.018 s); fallback docker ps нашёл обе БД (exit 0, 0.419 s). Inspect БД и затем всех четырёх контейнеров после ready завершились exit 0 (0.017 s / 0.018 s).

| Признак | YA | M |
|---|---|---|
| Container | `eqsitecms-db-yandex` | `eqsitecms-db-ya-metrica` |
| Image | `postgres:16` | `postgres:16` |
| Compose project / service | `eqsitecms-infra` / `db-yandex` | `eqsitecms-infra` / `db-ya-metrica` |
| DB / user | `eqsitecmsyandex` / `eqsitecmsyandex` | `eqsitecmsyametrica` / `eqsitecmsyametrica` |
| Service DB host / port | `eqsitecms-db-yandex:5432` | `eqsitecms-db-ya-metrica:5432` |
| Host published DB port | `5438` | `5439` |
| Runtime state | running | running |
| DSN DB/user/password/host alias/port/shared network | все совпадают | все совпадают |

Пароли из inspect находились только в памяти Python, не записаны и не напечатаны; выведены булевы результаты сравнения. POSTGRES_* rebuilt peers сопоставлены с БД и формированием database_url в [YA settings:39–44](../../../services/yandex-service/src/settings.py#L39-L44) и [M settings:36–41](../../../services/ya-metrica-service/src/settings.py#L36-L41). Для обеих пар credential_present/password_equal=true, host входит в aliases БД, общая сеть `eqsitecms_network`. DSN consistency не подменяет password authentication. Schema readback/fixtures остаются QG-LIVE.

## Текущие endpoints — для handoff QG-LIVE

| Переменная | Значение | Read-only endpoint evidence после rebuild |
|---|---|---|
| `BASE_YA` | `http://127.0.0.1:8007` | `GET /health` → 200, `{"status":"ok"}`, 11.69 ms |
| `BASE_M` | `http://127.0.0.1:32769` | `GET /health` → 200, `{"status":"ok"}`, 1.60 ms |

HTTP/inspect wrapper ENV-R1 exit 0. **Старый BASE_M=:32768 больше не использовать.** Ready вернул localhost URLs с дублированием IPv4/IPv6; выше указан единый IPv4 URL. SM-01..04, smoke writes и fixture операции не выполнялись. ENV-02 впоследствии закрыт ENV-R2 ниже; следующие units запускает только Router.

## Dev exposure / Q2 / SM-04 prerequisite

Пользователь подтвердил dev окружение («Это dev окружение. На production такого не будет»). Apply approval «Начинай» и отдельный tooling approval «Да, доработать stackctl (Recommended)» переданы в назначении unit. Это разрешает текущий dev runtime, но не доказывает production isolation.

Inspect после ready read-only подтвердил:

- YA HTTP: `0.0.0.0:8007` и `[::]:8007` → `8000/tcp`.
- M HTTP: `0.0.0.0:32769` и `[::]:32769` → `8000/tcp`.
- YA DB: `0.0.0.0:5438` и `[::]:5438` → `5432/tcp`.
- M DB: `0.0.0.0:5439` и `[::]:5439` → `5432/tcp`.

Host exposure сохраняется; Internet reachability/firewall и production isolation не проверялись. Auth/network/compose не менялись. All-interface bindings не являются blocker dev live по закрытому Q2; ENV-02 касается достоверности SQL password-auth verification, не dev exposure. **Production deployment/release запрещён без технического подтверждения защиты чувствительных APIs от external anonymous callers.** Отдельный security change не вводится как prerequisite dev apply/live/sync/archive. SM-04 получает это evidence, сам smoke остаётся QG-LIVE.

## ENV-R2 — реальная SQL password-auth / health группа после TOOL-2

Выполнена только одна SQL-auth/health группа, по одному `stackctl psql … -c "SELECT 1"` на БД. Approval база: «Начинай» и tooling extension «Да, доработать stackctl (Recommended)»; handoff TOOL-2: 115 passed hermetic, без live Docker до этого unit. Source только точечно прочитан: [runtimeTcp gate](../../../scripts/stackctl#L431-L490), не изменён; полный code review не выполнялся.

| Команда / проверка | Exit | Elapsed | Безопасный результат |
|---|---:|---:|---|
| `scripts/stackctl status --json` перед SQL | 0 | 0.779 s | оба peers running/healthy, обе DB running/health=none |
| `docker inspect eqsitecms-db-yandex eqsitecms-db-ya-metrica eqsitecms-yandex-service eqsitecms-ya-metrica-service --format <identity/state/network/ports>` до SQL | 0 | 0.020 s | identity, StartedAt, container IP и published HTTP ports; без Config.Env |
| `GET http://127.0.0.1:8007/health` до SQL | 0 | 6.7 ms | HTTP 200, `{"status":"ok"}` |
| `GET http://127.0.0.1:32769/health` до SQL | 0 | 1.2 ms | HTTP 200, `{"status":"ok"}` |
| `scripts/stackctl psql db-yandex -c "SELECT 1"` | 0 | 0.260 s | positive passed; negative password_auth_rejected; SELECT 1 → 1 |
| `scripts/stackctl psql db-ya-metrica -c "SELECT 1"` | 0 | 0.262 s | positive passed; negative password_auth_rejected; SELECT 1 → 1 |
| `scripts/stackctl status --json` после SQL | 0 | 0.716 s | прежние running/healthy и bindings |
| тот же read-only `docker inspect` после SQL | 0 | 0.021 s | Id/StartedAt всех четырёх контейнеров совпадают с before |
| `GET http://127.0.0.1:8007/health` после SQL | 0 | 2.1 ms | HTTP 200, `{"status":"ok"}` |
| `GET http://127.0.0.1:32769/health` после SQL | 0 | 2.0 ms | HTTP 200, `{"status":"ok"}` |

Wrapper группы завершился exit 0. Предварительный status завершился exit 0 / 0.721 s. До SQL две read-only inspect попытки завершились exit 1: Go template обращался к отсутствующему DB `.State.Health`; уточнение показало `map has no entry for key "Health"`. Elapsed этих двух не измерялся. Исправлен только локальный template: Health исключён из inspect, берётся из stackctl status. Это ошибка диагностического wrapper, не infrastructure/auth failure; SQL до её исправления не выполнялся, repair не проводился.

### Safe JSON обоих реальных SQL-auth результатов

```json
{"ok":true,"database":"db-yandex","target":{"container":"eqsitecms-db-yandex","address":"172.20.0.11","port":5432},"probes":{"positive":"passed","negative":"password_auth_rejected"},"stdout":"1\n","stderr":"","exitCode":0}
{"ok":true,"database":"db-ya-metrica","target":{"container":"eqsitecms-db-ya-metrica","address":"172.20.0.18","port":5432},"probes":{"positive":"passed","negative":"password_auth_rejected"},"stdout":"1\n","stderr":"","exitCode":0}
```

Оба адреса сверены wrapper с текущим read-only inspect: единственный IPv4 на `eqsitecms_network` выбранного DB-контейнера, не loopback, не host published port. [Gate](../../../scripts/stackctl#L454-L490) закрепляет exec за inspected 64-hex Id и использует один IP:5432/runtime user/database для обеих probes. Runtime user/db соответствуют сохранённому ENV-R1 evidence: YA `eqsitecmsyandex`/`eqsitecmsyandex`, M `eqsitecmsyametrica`/`eqsitecmsyametrica`; ENV-R2 credentials на host повторно не извлекал. Positive строго вернул 1; negative с отличным generated password завершился psql exit 2 с C-locale password authentication failure, распознанным только внутри контейнера. Trust success, timeout, connection/exec/SQL error не засчитываются gate. Пароли и raw diagnostics не выводились и не сохранялись; stdout содержит только безопасный результат SELECT 1. Повторный HBA SQL не понадобился: реальная negative probe подтверждает password check, historical HBA all/scram rule согласуется с non-loopback target, HBA не изменялся.

### No-restart / readiness

| DB | Verified immutable Id | StartedAt до = после = ENV-R1 |
|---|---|---|
| db-yandex | `90546fb30909a10ab9aebd575a4ae5664edba65baf51805b0911f676cf6015ff` | `2026-10-16T06:53:53.083424918Z` |
| db-ya-metrica | `64affe244fbd4f749f3a6527a0c38bbf8872aa2e0dd00724381d8892a843ed52` | `2026-10-16T06:53:53.336725724Z` |

Peer Id/StartedAt также неизменны в группе: YA `2026-10-16T08:15:27.439542164Z`, M `2026-10-16T08:15:51.195889256Z`. BASE_YA=`http://127.0.0.1:8007`, BASE_M=`http://127.0.0.1:32769` read-only обнаружены по текущим bindings и проверены до/после. ENV-R1 rebuild evidence сохранён; новых ready/rebuild/restart/repair/migrations: **0**. HBA/auth/network/compose/env/source/fixtures не менялись, DB write SQL не выполнялся. Отрицательная login probe может штатно создать серверный auth-failure log; raw DB logs не читались/не публиковались.

## QG-ENV-BE01-refresh — актуализация после main fixes, до LIVE

Выполнен один повтор affected ENV lane, без нового функционального scope и новых task IDs. Основание — переданные Router approval «Начинай»/«Доделывай», YA/M FIX и R1 handoffs: QG-BE-R1 passed, BE-01 closed по actual Uvicorn positive/negative control; YA 662 passed дважды, M 262 passed, mypy 104/54 clean; QG-CONTRACTS-R1 passed. Ссылки на lane evidence: [backend](backend.md), [contracts](contracts.md). Эти результаты приняты из handoff, а не повторно проверены здесь. Переданный runtime fix: pure ASGI boundary внутри ServerErrorMiddleware, generic Exception registration removed; prestart 400 с safe category/cause без server log, BaseException/cancel/started propagate. ENV-R1 был собран до этих main fixes, ENV-R2 затем подтвердил только SQL/health; этот unit обновляет именно runtime readiness. Source/specs/tests не перечитывались, код и runtime config не менялись.

### Команды и безопасные outcomes одной readiness/SQL группы

| Команда / проверка | Exit | Время | Результат |
|---|---:|---:|---|
| `scripts/stackctl status --json` до ready | 0 | не измерялось | два peers running/healthy, обе DB running/health=none; M ещё `:32769` |
| `docker inspect eqsitecms-yandex-service eqsitecms-ya-metrica-service eqsitecms-db-yandex eqsitecms-db-ya-metrica` до ready; safe projection wrapper | 0 | не измерялось | DB Id/StartedAt равны ENV-R2; исходные peers Id/StartedAt сохранены в tool evidence; секреты не выводились |
| `scripts/stackctl ready yandex-service ya-metrica-service --no-migrate` | 0 | не измерялось | `ok:true`, оба `rebuilt:true`, running/healthy; только два peers, без миграций |
| `scripts/stackctl status --json` перед SQL | 0 | 0.671 s | два peers running/healthy, обе DB running/health=none |
| тот же `docker inspect`, безопасная проекция перед SQL | 0 | 0.018 s | текущие identity/image/state/network/ports; DB без изменений |
| DSN consistency wrapper, только сравнения в памяти | 0 | в составе группы | у обеих пар совпали непустые user/db/password, port=5432, host — DB alias в общей сети |
| `GET http://127.0.0.1:8007/health` перед SQL | 0 | 20.80 ms | HTTP 200, `{"status":"ok"}` |
| `GET http://127.0.0.1:32770/health` перед SQL | 0 | 1.65 ms | HTTP 200, `{"status":"ok"}` |
| `scripts/stackctl psql db-yandex -c "SELECT 1"` | 0 | 0.273 s | positive passed, SELECT 1 → 1; negative password_auth_rejected |
| `scripts/stackctl psql db-ya-metrica -c "SELECT 1"` | 0 | 0.248 s | positive passed, SELECT 1 → 1; negative password_auth_rejected |
| `scripts/stackctl status --json` после SQL | 0 | 0.662 s | прежние running/healthy и bindings |
| тот же `docker inspect`, безопасная проекция после SQL | 0 | 0.017 s | Id/StartedAt всех четырёх совпадают с before-SQL |
| `GET http://127.0.0.1:8007/health` после SQL | 0 | 1.79 ms | HTTP 200, `{"status":"ok"}` |
| `GET http://127.0.0.1:32770/health` после SQL | 0 | 1.28 ms | HTTP 200, `{"status":"ok"}` |

Python verification wrapper группы — exit 0. Оба SQL вызова — по одному на DB; negative probe встроена в stackctl, отдельно raw psql не запускался. Safe JSON:

```json
{"ok":true,"database":"db-yandex","target":{"container":"eqsitecms-db-yandex","address":"172.20.0.11","port":5432},"probes":{"positive":"passed","negative":"password_auth_rejected"},"stdout":"1\n","stderr":"","exitCode":0}
{"ok":true,"database":"db-ya-metrica","target":{"container":"eqsitecms-db-ya-metrica","address":"172.20.0.18","port":5432},"probes":{"positive":"passed","negative":"password_auth_rejected"},"stdout":"1\n","stderr":"","exitCode":0}
```

Оба SQL target IP:5432 сверены с актуальным read-only inspect соответствующей DB в `eqsitecms_network`, не loopback и не host published ports. Полный inspect захвачен только в памяти subprocess; наружу выведена безопасная проекция. Credential values/полные DSN/raw auth diagnostics не печатались и не сохранялись.

### Identity / URLs / отсутствие DB restart

| Контейнер | Id | StartedAt после ready = после SQL |
|---|---|---|
| yandex-service | `17876c7d110ffdac01d2f7c5d94c4cce3cfbe695d0b8f9880671e6d84ce99639` | `2026-10-16T13:20:05.957439287Z` |
| ya-metrica-service | `4623ce4e43fe844ad7ad9a2f2fa27866b5546057064f8c5da18827a3815f85a5` | `2026-10-16T13:20:19.465882497Z` |
| db-yandex | `90546fb30909a10ab9aebd575a4ae5664edba65baf51805b0911f676cf6015ff` | `2026-10-16T06:53:53.083424918Z` |
| db-ya-metrica | `64affe244fbd4f749f3a6527a0c38bbf8872aa2e0dd00724381d8892a843ed52` | `2026-10-16T06:53:53.336725724Z` |

Новые peer image IDs: YA `sha256:f9a576339e02e701997797fe3e87da2811cd364ac81dc8d9fc7894f414ff50a9`, M `sha256:18bfddc512b5a281e5242028a71348581c0a82afc2a76acd2a8f8eb1d94bddb3`. DB Id/StartedAt совпали с ENV-R2 до ready, после ready и после SQL; обе DB не перезапускались.

Актуальные URL для следующего QG-LIVE: **BASE_YA=`http://127.0.0.1:8007`, BASE_M=`http://127.0.0.1:32770`**. Dynamic M port изменился штатно при recreate; `:32769` и `:32768` не использовать. Ready выдаёт localhost URLs с IPv4/IPv6 дублированием, приведённые IPv4 URLs обнаружены по inspect и подтверждены health до/после SQL. Dev bindings: peers `0.0.0.0/[::]:8007/32770 → 8000`; DB `0.0.0.0/[::]:5438/5439 → 5432`, сеть `eqsitecms_network`; projects peers `eqsitecms-yandex`/`eqsitecms-ya-metrica`, DB `eqsitecms-infra`. Dev Q2 сохраняется; это **не доказательство production isolation**. Production deployment/release требует отдельного технического подтверждения защиты чувствительных API от внешних anonymous callers.

Справка: `scripts/stackctl --help` и `scripts/stackctl help` дали exit 1 `Unknown command`; вызов без аргументов дал exit 1 и Usage со списком поддерживаемых команд. Это неподдерживаемый синтаксис справки, не runtime failure; он разобран до ready. Ready предупредил об отсутствии buildx (успешный classic builder fallback) и unset `EXPOSE_YA_METRICA_SERVICE_PORT` (штатный dynamic binding M); никаких config исправлений не требовалось и не выполнялось.

Findings/blockers: нет новых в ENV; repair/doctor/logs не понадобились, repair attempts **0**. Выполнен ровно один разрешённый targeted ready, infra/DB/соседние сервисы не restart/rebuild, миграции не запускались. Auth/network/HBA/env/compose/source не менялись; SELECT 1 — единственный SQL, LIVE/API writes/fixtures не выполнялись. Отрицательные password probes могут штатно создать DB auth-failure logs; raw logs не собирались. Commit/reset/stash не выполнялись. Изменён только этот report; существующие done QG-ENV checkbox и ENV-R2 tasks сохранены без правок, новых IDs не добавлено. QG-ENV-BE01-refresh **done / passed**; дальнейший LIVE — отдельный unit через Router.

## Tasks / остаток (исторический handoff ENV-R2)

В [tasks, секции 8–8a](../../../openspec/changes/normalize-yandex-client-failures/tasks.md#L119-L134) закрыты **ENV-R2.1/.2/.V и QG-ENV.1** по факту успешной проверки обеих БД и peers. Ранее завершённые QG-ENV.2/.3/.V и TOOL-1/TOOL-2 не изменены. ENV-02 закрыт, QG-ENV passed; ENV-R2 done. Другие lanes, source changes, commits и fixture writes не выполнялись. Остаток — дальнейшие units только через Router; окончательный gate verdict остаётся QG-SYNTH. Dev Q2 не доказывает production isolation: production deployment/release по-прежнему запрещён без технического подтверждения защиты чувствительных APIs от external anonymous callers.
