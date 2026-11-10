# Design — seo-metrica-task-monitor

Задание: `docs/tasks/110_seo_tasks.md`. Дата: 2026-11-06. Код: `ya-metrica-service`, `backend`, `frontend`; root tooling — только acceptance runner.

## Context

Мотивация — [proposal.md](proposal.md). При начале планирования CLI показал только активный `add-safe-services-autogit`; совпадающего change нет. CLI доступен как `.cache/openspec-tool/1.14.3/openspec-local` (далее `OS`), обычный `openspec` отсутствует в PATH. Реальные пути artifacts получены через `status --json`, store не используется.

Проверенные источники, не намерения legacy-планов:

| Источник | Факт и следствие |
|---|---|
| `SERVICES.md`, `services/backend/src/api/seo.py` | CMS работает только через gateway, строго SEO; POST запуска остаётся через seo-service |
| `services/frontend/src/features/seo/ui/SeoPage.tsx` | Сейчас четыре вкладки, refresh в header Страниц/Запросов; карточка в `MetricaConnectionCard.tsx` названа «Подключение Яндекс.Метрики» |
| `.../hooks/useSeoParseRefresh.ts` | Уже есть подтверждение, синхронный submit lock, отзыв права, безопасные ошибки; расширять, не дублировать |
| `services/ya-metrica-service/src/models/metrica_parse.py` | Run имеет id/job_id/tenant/created_at, но не общий статус; дочерние tasks имеют queued/running/succeeded/failed/cancelled |
| `.../models/metrica_maintenance.py` | Есть pending intents (включая admitted/cancelled/missing_binding), merge/cleanup ledger; merge не хранит counter_id/generation, нет универсальных started_at/finished_at |
| `.../repositories/metrica_pending_parse_repository.py` | Intent и run связываются атомарно; ACTIVE_RUN может отклоняться до сохранения intent |
| `.../repositories/metrica_cleanup_repository.py` | Удаляет только page/query stats, не run/tasks/intents/maintenance ledger; история удаления уже сохраняется |
| AsyncAPI `ya-metrica-service`, `seo-service`, `yandex-service` | Парсинг — job_id, maintenance — operation_id; chunk/seal/retry не отдельные пользовательские операции, awaiting_seo ещё не завершение |
| `scripts/qa/infra/contracts.py`, JSON schemas | Runner жёстко привязан к harden-agent-verification-pipeline, allowlist не содержит нового PG файла; переиспользование без изменения небезопасно и пишет evidence в чужой change |

Никакие runtime тесты/DB discovery не выполнялись. Наличие тестов в дереве не означает PASS. Чужие pre-existing diff (включая docs/tasks/108*, dsh и другой change) не принадлежат этому заданию.

## Goals / Non-Goals

**Цель:** минимальный read-only slice поверх текущих ledger и безопасный UI наблюдения с прежним запуском обновления. Источник истины — PostgreSQL Метрики, не Redis/Celery result и не `parse_dispatches` seo-service.

**Не цели:** менять исполнение/очереди, хранить отдельный materialized журнал, возвращать подробности ошибок/проценты/время завершения, добавлять ручной retry/cancel, изменять привязки и lifecycle, восстанавливать несохранённые события. Нет новых dependency packages или миграций. Нет кода seo-service/yandex-service/site-*.

## Decisions

### 1. Семантика истории и ограничения удаления

Выбрана история **конюшни**, не «история текущего счётчика». Кнопка открывается у текущей привязки, но окно явно сообщает, что содержит предыдущие привязки. Причина: cleanup tenant-wide, merge не связан с counter_id, исторические аккаунты удаляются. Counter filter или JOIN к текущему аккаунту потеряет именно delete-операции и часть merge; это отвергнуто. Новый полноценный counter audit потребует отдельного lifecycle/schema change и здесь не обещается.

После отвязки кнопка исчезает; API остаётся доступен SEO и без привязки. После повторной привязки старая история снова видна в UI. API не делает запросов в yandex-service для чтения списка. Существующий cleanup не меняется и не должен удалять ledger ради списка.

История начинается с сохранённых данных: не дошедшая NATS-команда, ACTIVE_RUN rejection до записи и утраченные ранее строки не могут быть восстановлены. `202` подтверждает принятие оркестратором, не создание записи в Метрике и не успешное исполнение. Отдельной optimistic строки нет: после POST один GET + явное пояснение eventual delivery и «Обновить список».

### 2. SQL read model и статусы

Новые файлы в Метрике: `core/entities/metrica_task_list.py`, `core/protocols/repositories/metrica_task_list.py`, `repositories/metrica_task_list_repository.py`. Проекция:

1. По tenant агрегировать tasks GROUP BY run_id; вычислить наличие running/queued/failed/cancelled и число tasks в SQL.
2. Intents LEFT JOIN runs по сохранённому run_id **и tenant**. У admitted intent брать статус run; у pending — queued, cancelled — cancelled, missing_binding — failed. Все intent получают `parsing:<job_id>` и created_at intent.
3. Отдельная ветка runs без связанного intent (anti-join по tenant/run_id). Идентичность `parsing:<job_id>` или `parsing-run:<id>` при NULL. created_at run.
4. Maintenance — одна строка на operation_id, cleanup → delete. Статусы маппятся по delta `metrica-task-list`, включая awaiting_seo и failed_blocked; chunks/outbox не попадают в выборку.
5. UNION ALL логических строк; `is_active DESC, created_at DESC, id DESC`; один LIMIT/OFFSET после UNION. Не извлекать полную историю для сортировки/группировки Python. Без N+1/peer calls. Сначала aggregate status, затем сортировка, не наоборот.

При любом running итог running; иначе при queued — queued; терминальный приоритет failed > cancelled > succeeded. Run без задач — failed. failed_blocked неактивен в UI, но сохраняет блокирующую семантику исполнителя: кнопка запуска не обещает немедленный старт и не снимает барьер.

`total` и items получают один согласованный DB snapshot: одна SQL-команда с count/page CTE и корректной обработкой пустой страницы либо read-only REPEATABLE READ для count+page; предпочтительна одна команда. Максимум два SQL, ноль locks/commit/write в read use case. Тесты на реальной PG проверяют snapshot, CASE/UNION, NULL job_id, одинаковые timestamps и tenant. Новый индекс/миграция не требуется для корректности; при неожиданной проблеме плана SQL — bounded blocker Router, не скрытое расширение schema scope. Offset pagination не обеспечивает неизменность между отдельными HTTP запросами при изменении статусов; tie-break гарантирует порядок только для неизменного набора.

### 3. API и gateway

Peer: `GET /api/metrica/tasks`, `X-Equestrian-Id` UUID обязателен до query parsing; limit default 20, строго 1..100, offset default 0, строго ≥0. Нечисловое/дробное значение — 400, missing/invalid selector — 401 даже при неверном query. Cookie/Bearer игнорируются. Использовать явную selector dependency и отложенную валидацию query, а не автоматическую 422 раньше selector.

Новые `core/schemas/api/metrica_tasks.py`, `core/services/metrica_task_list_service.py`, `api/metrica_tasks.py`; wiring в `containers/application.py`, `api/__init__.py`, `main.py` по существующему read session pattern. Ответ только `{items,total}`; item поля зафиксированы в delta; safe generic errors без SQL/OAuth/checkpoints. Строковый id включает type-prefix: UUID разных источников не конфликтуют.

CMS: `GET /api/seo/metrica/tasks` в существующем `api/seo.py` с `Actor`/`require_seo_scope`. Отдельный peer client/protocol/schema/service: `clients/ya_metrica_service/{client,schemas,__init__}.py`, `core/protocols/ya_metrica_service.py`, `core/services/metrica_tasks_proxy.py`, DI `depends/services.py`. Не подменять URL seo-client и не расширять его ответственность. `settings.py`: `YA_METRICA_SERVICE_URL=http://eqsitecms-ya-metrica-service:8000`; документировать в `.env.example`, README, `SERVICES.md`. Фактические env не читать/менять. HTTP timeout 4 с, trust_env=false, без retry, cookie/Bearer и логирования response/query. Клиент валидирует production DTO; transport/timeout/неожиданные статусы/невалидный DTO → нейтральный 502. Входной query валидируется после auth/SEO до peer. Tenant только actor, клиентские header/query hints игнорируются.

`maintain/route_inventory.py`, generator outputs `docs/backend-route-inventory.md` и inventory tests входят в ownership gateway. Существующие 11 путей не меняются, всего SEO routes 12. POST запуска по-прежнему backend → seo-service → NATS; удалённый HTTP trigger Метрики не возвращается.

### 4. UI и асинхронные состояния

FE-1 добавляет DTO в `src/types/api/seo.ts`, boundary в `src/api/seo.ts`, service `features/seo/services/metricaTasksService.ts`, hook `hooks/useMetricaTasks.ts`, action `LIST_METRICA_TASKS` в SEO registry. Hook принимает состояние привязки от владельца карточки; не делает дублирующий GET connection. Начало 20/0, 20/50/100; новый размер → offset=0, reopen → 20/0. Нет filters/sort control (порядок фиксирован), debounce неприменим. На закрытии/отзыве права/смене привязки увеличить generation/отменить чтение; поздние ответы не должны записывать старые данные. Коррекция offset за концом — максимум один GET последней страницы после ответа с total>0; при total=0 offset=0 без лишнего GET.

FE-2 добавляет `ui/MetricaTasksModal.tsx` с MainTable и TablePaginator, русскими type/status labels, created_at и empty/loading/error/retry; использует styles текущей feature. Два различимых действия: «Обновить список» (GET) и «Обновить данные» (POST после подтверждения). Автопарсинг, polling, auto-POST запрещены. Никакого клиентского resort текущей страницы.

Карточка передаёт актуальную identity привязки и mount/open state. Вкладку можно оставить с внутренним ключом metrica для минимального diff, пользовательское имя — «Интеграции»; webmaster item/import/file удаляются. В `SeoPage.tsx` убрать header refresh/refs/modal; не переносить новую orchestration в page shell. Состояние задач и подтверждения — в feature hooks/container. Страницы/Запросы сохраняют пагинацию, фильтры, «Сбросить» и «Нормализация» страниц.

`useSeoParseRefresh` расширяется optional callback успешного принятия; существующие guards/errors сохраняются. После 202 закрыть только подтверждение, notify, сбросить offset задач и перечитать один раз; дата-таблицы не инвалидировать. Confirmation остаётся общим `ConfirmActionModal`, okDanger=false, без нового пятисекундного ожидания. Отвязка сохраняет свой danger и 5 секунд. Вложенные окна: Esc закрывает только верхнее, focus returns внутри задач; в pending не закрывать ни parent, ни confirmation. Close/revoke не отменяет уже принятый POST на сервере и не вызывает его повторно.

### 5. Минимальное устранение tooling gap

Отдельный T-1 принадлежит Backend-профилю root tooling. В `scripts/qa/infra/{contracts.py,manifest.schema.json,permit.schema.json}` заменить единственный hardcoded change на конечный registry с двумя **точными** change IDs. Для нового change разрешить только ya-metrica-service + pg + `test_metrica_task_list_postgres.py` (конечные test node IDs передаёт M-1); старый набор сохранить. Evidence root строится из **проверенного** m.change, не свободного user path. Обновить README, offline tests `scripts/tests/test_qa_infra.py`; не менять lifecycle/PG ACL/выдачу permits и не открывать arbitrary command registration. Это необходимая часть acceptance, а не новая универсальная платформа. NATS registration нового change запрещена.

## Access matrix

Матрица также нормативно включена в соответствующие delta specs. Новые read endpoints не являются Public Read для сайтов: выдаётся служебная история tenant. Внутренний peer использует прежнюю модель доверенной сети; selector не secret. Protected Write запуска не меняется, но проверяется при переносе UI.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/metrica/tasks` | Protected GET exception | только SEO | 401 до query/peer | SEO-only/SEO+ADMIN 200; без SEO 403; invalid query 400; peer/DTO 502 |
| GET | `/api/metrica/tasks`, UUID selector | Internal Trusted Network Read exception | не применяются | 200; invalid query 400 | те же 200/400, credentials игнорируются |
| GET | `/api/metrica/tasks`, missing/invalid selector | Internal Trusted Network Read exception | не применяются | 401 до query/storage | 401, credentials не заменяют selector |
| POST | `/api/seo/parse-jobs` (перенос UI, API неизменен) | Protected Write | только SEO | 401 до body/downstream | 202; без SEO 403; invalid body/provider/нет binding 400; downstream 502; очередь 503 |

Tenant spoofing: gateway SEO A всегда адресует A, независимо от browser selector B. Peer выбирает tenant из selector по определению Internal Trusted Network; роль/cookie там не security boundary. Production isolation peers/БД остаётся отдельным блокирующим release gate; новый GET не разрешает их публичную публикацию.

## Deliverables и ownership

| Deliverable | Владелец | Исключительные пути и closure |
|---|---|---|
| A — read model Метрики | Backend | Новые metrica_task_list entities/protocol/repository/service, schemas/api/metrica_tasks.py, api/metrica_tasks.py; read wiring containers/application.py, api/__init__.py, main.py; `tests/unit/test_metrica_task_list*`, `tests/api/test_metrica_tasks_api.py`, `tests/integration/test_metrica_task_list_postgres.py`, непосредственно нужные shared conftest; README Метрики. Units M-1 → M-2 последовательно |
| B — CMS gateway | Backend | backend api/seo.py; новые clients/ya_metrica_service/**, protocol/service; settings.py, depends/services.py, .env.example, README; tests/unit/api/test_metrica_tasks* и core/services/test_metrica_tasks*; route inventory source/generator/tests/output; `SERVICES.md` |
| C — CMS задачи | Frontend | frontend src/types/api/seo.ts, src/api/seo{,.test}.ts, feature seo services/hooks/ui и непосредственно зависимые tests/styles; FE-1 → FE-2 последовательно, shared scope files только эти units |
| D — infra регистрация | Backend | scripts/qa/infra/contracts.py, manifest.schema.json, permit.schema.json, README.md, scripts/tests/test_qa_infra.py; tests/outputs строго этой зоны |
| E — независимый gate | Quality Gate | Только `.qa/seo-metrica-task-monitor/<lane>/`; SYNTH — единственный будущий docs/reports/seo-metrica-task-monitor.md. Product файлы QG не меняет |

Новые пути вне таблицы, schema/index/worker изменения или чужой pre-existing diff — согласовать с Router до правки. Spec ownership: A — metrica-task-list; B — seo-backend-proxy; C — три cms-*; D — agent-acceptance-tooling; синхронизацию общих specs выполняет Router после QG. Planning unit меняет только change artifacts и своё ignored evidence. Реализационные units отмечают только свои фактически выполненные IDs tasks.md последовательно.

## Execution units

Пути A/B/C/D раскрыты выше; оценки — существенные действия, не число файлов. Final-service границы: T-1 для tooling offline suite, M-2 для Метрики, B-1 для backend, F-2 для frontend.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| T-1 | Backend | D | registry/schemas/README/offline tests D | approval | 6 действий; python3 -m unittest discover -s scripts/tests -p test_qa_infra.py; scoped static |
| M-1 | Backend | A | entities/protocol/repository, unit/PG tests и conftest A | T-1 | 7 действий; targeted UT + PG-01..04 через permit runner |
| M-2 | Backend | A | DTO/service/API/read wiring/API tests/README A | M-1 | 7 действий; API UT, полный make test/lint + Ruff canonical check Метрики |
| B-1 | Backend | B | gateway/client/DI/env/docs/inventory/tests B | M-2 | 9 действий; GW UT, paired WIRE-01, полный make test/lint backend |
| F-1 | Frontend | C | DTO/API/service/hooks/scopes и их tests C | approval | 7 действий; targeted Vitest, scoped ESLint |
| F-2 | Frontend | C | modal/card/page/styles/refresh hook и UI tests C | F-1, B-1 | 9 действий; FE component matrix; scoped browser self-check; полный make test/lint, npm run build |
| QG-ENV | Quality Gate | E | ignored prerequisites/evidence | все T/M/B/F | readiness, safe identity, permits, инструменты, finite registry |
| QG-BE | Quality Gate | E | ignored Python/PG evidence | QG-ENV | независимо full suites backend+Метрика, PG-01..04, scoped canonical checks |
| QG-FE-AUTO | Quality Gate | E | ignored FE evidence | QG-ENV | независимо make test/lint/build, mocks review/no live calls |
| QG-CONTRACTS | Quality Gate | E | ignored contracts/tooling evidence | QG-ENV | TOOL/WIRE/inventory/OpenSpec/access review, root offline tests |
| QG-LIVE | Quality Gate | E | ignored HTTP smoke evidence | QG-BE, QG-FE-AUTO, QG-CONTRACTS | SM-01..04 через api-smoke-test на real PG |
| QG-FE-MANUAL | Quality Gate | E | ignored scripted browser evidence | QG-BE, QG-FE-AUTO, QG-CONTRACTS | UI-QA-01..08 Chromium 1366×768 |
| QG-SYNTH | Quality Gate | E | единый итоговый отчёт + ignored summary | QG-LIVE, QG-FE-MANUAL | finite registry, вердикт, strict validate |

```text
approval ─┬→ T-1 → M-1 → M-2 → B-1 ─┐
          └→ F-1 ────────────────────┴→ F-2
(T-1,M-2,B-1,F-2) → QG-ENV → (QG-BE ∥ QG-FE-AUTO ∥ QG-CONTRACTS)
→ (QG-LIVE ∥ QG-FE-MANUAL) → QG-SYNTH → пользовательская финализация → sync/validate/archive
```

Параллельны T-1/F-1, позднее только непересекающиеся QG lanes. Не делегировать A или C целиком вместо unit. contextFiles на каждый unit перечислены в tasks; handoff predecessor обязателен. При превышении бюджета — atomic partial и bounded split, не новый checkpoint unit.

## Test matrix

Каждая строка — группа сценариев, не отдельные checkbox. Все новые test paths ниже **планируемые**, сейчас не создаются. Основной spec mapping: MT — metrica-task-list; GW — seo-backend-proxy; UI — cms-seo-yandex-ui; RF — cms-seo-parse-refresh-ui; TOOL — agent-acceptance-tooling.

### Backend и PostgreSQL

| ID | Уровень / riskId | scenarioId | Сценарий и ожидание | testPath/command (план) | Unit / независимый evidenceOwner |
|---|---|---|---|---|---|
| UT-M-01 | unit / R-STATUS | MT-03..07 | все комбинации queued/running/terminal, failed priority, retry, zero-task, awaiting_seo/failed_blocked | tests/unit/test_metrica_task_list.py | M-1 / QG-BE |
| PG-01 | real PG / R-AGG | MT-01,03,04 | intent/run dedup, 8 children → 1 row, NULL job_id, tenant anti-join, counts | tests/integration/test_metrica_task_list_postgres.py::test_aggregate_identity | M-1 / QG-BE |
| PG-02 | real PG / R-ORDER | MT-05..09 | все native statuses, mixed active/terminal, tie-break, limit/offset/empty, общий total | ...::test_status_order_pagination | M-1 / QG-BE |
| PG-03 | real PG / R-SNAPSHOT | MT-08 | независимая вторая session меняет status; count/items одного HTTP response согласованы; read не меняет ledger | ...::test_consistent_read_snapshot | M-1 / QG-BE |
| PG-04 | real PG / R-HISTORY | MT-02 | production cleanup удаляет seeded stats, но ledger остаётся; новая session читает parsing/delete/merge, без JOIN к аккаунту | ...::test_history_survives_cleanup | M-1 / QG-BE |
| UT-M-02 | API / R-PEER | MT-09..11 | anonymous vs Cookie/Bearer; selector приоритет 401; limits boundary 1/100/0/101/negative/non-int, no storage при invalid | tests/api/test_metrica_tasks_api.py | M-2 / QG-BE |
| UT-GW-01 | API / R-ACCESS | GW-01,03,04 | anonymous 401, все роли, SEO-only/SEO+ADMIN, invalid query после auth, tenant spoof, headers не пересылаются | tests/unit/api/test_metrica_tasks_proxy.py | B-1 / QG-BE |
| UT-GW-02 | unit / R-DEGRADE | GW-02 | transport/timeout/peer 401/5xx/invalid JSON/DTO → safe 502; malformed limit/offset → 400 без peer | tests/unit/api/test_metrica_tasks_client.py | B-1 / QG-BE |
| WIRE-01 | paired / R-WIRE | MT-01,GW-01,02 | production response serializer Метрики → production backend parser в отдельных lockfile env; valid, missing field, invalid enum/тип → reject | service DTO tests + `.qa/.../B-1/wire-*.json` без секретов | B-1 / QG-CONTRACTS |
| TOOL-UT | offline / R-PERMIT | TOOL-01,02 | новый exact registry, сохранение старого, unknown change/path/kind/service/expiry/scope отказ; evidence root из validated change | python3 -m unittest discover -s scripts/tests -p test_qa_infra.py | T-1 / QG-CONTRACTS |

Идемпотентность записи не меняется: endpoint read-only, повторный GET не создаёт работы (PG-03). Транзакционность собственной записи/lease/recovery/new topology — неприменимо: нет write path или broker diff; production cleanup регрессия и consistent snapshot проверяются real PG, не mock. Изменение timezone/даты парсинга не планируется; created_at отдаётся RFC3339 из storage.

### Frontend

| ID / Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| FE-01 API/service | новый GET и DTO | ≥3 success/empty/error; MSW 400/401/403/502/network, params limit/offset, no peer URL | 401 auth flow, 403 neutral denial | Vitest src/api/seo.test.ts и metricaTasksService.test.ts |
| FE-02 hook pagination initial | 20/0 при открытии | initial query и одна загрузка; server order без resort | только SEO + binding | Vitest useMetricaTasks.test.ts |
| FE-03 hook page | переход страницы | следующая страница 20/20, total, stale answer suppression | tenant не берётся из UI | тот же targeted Vitest |
| FE-04 hook size | размер 20/50/100 | смена размера → offset=0; offset за концом ограниченно исправляется | без extra privileges | тот же targeted Vitest |
| FE-05 hook reset | reopen/binding reset | 20/0; scope revoke/unmount/counter change игнорирует старый ответ | нет запроса после revoke | тот же targeted Vitest |
| FE-06 scope action | LIST_METRICA_TASKS/START_PARSE | ≥4: scope present, missing, hidden/disabled, backend 401/403; no override ADMIN | guard повторно перед GET/POST | Vitest useSeoScopes/useMetricaTasks/useSeoParseRefresh |
| FE-07 modal table | type/status/date/pagination | ≥5: data, loading, empty, error+retry, callbacks, плюс permission; фиксированный order, без filters | UI-01..06 | Vitest MetricaTasksModal.test.tsx |
| FE-08 nested mutation | запуск внутри задач | ≥5: open/close, submit, 400 validation, 403/502/503/network, 202 reload/notice; double-submit, no optimistic row, нет invalidation pages/queries | RF-01..03, текущие guards | Vitest useSeoParseRefresh/MetricaTasksModal |
| FE-09 navigation/card | три вкладки и карточка | labels/default, Webmaster отсутствует, «Задачи» только binding; оба header без refresh; unlink 5s/danger сохранён | anonymous redirect, SEO render, non-SEO forbidden/no calls | Vitest SeoPage/MetricaConnectionCard |
| FE-10 boundaries | no site mixing | review imports/raw fetch/API-layer и limit/offset (page допускается только в UI adapter) | protected CMS, не consumer | scoped rg/grep по изменённым src paths |
| FE-11 browser | nested modal desktop | scripted assertions keyboard/focus/geometry/scroll/contrast/axe, см. UI QA | anonymous/SEO/missing scope/pending | существующий ui-qa runner, Chromium 1366×768 |

Все unit/component/API-boundary tests используют MSW/mocks, live backend calls запрещены. Filter/debounce/user sort tests неприменимы: в задаче нет таких controls; фиксированный серверный sort проверяется PG-02/FE-07. Имена tests и exact node IDs фиксируют владельцы в handoff, не заменяют эти сценарии формальной collection.

### Acceptance prerequisites и конечный registry

Статусы ниже — **planned**, не evidence PASS. Общие лимиты: scenario ≤120 секунд, suite ≤15 минут; ≤2 infra repair attempts суммарно, ≤1 targeted QG recheck тем же lane; затем stop/решение Router. Evidence key и ledger по `agents/howto/verification-policy.md`, включая revision/environment fingerprint; логи только `.qa/seo-metrica-task-monitor/<unit или lane>/`. Infra lifecycle journal — `.qa/seo-metrica-task-monitor/INFRA-1/<runId>/`.

| riskId | scenarioId | unit | testPath/command | evidenceOwner | prerequisites | isolation | permission | budget | stopCondition | status |
|---|---|---|---|---|---|---|---|---|---|---|
| R-PERMIT | TOOL-01,02 | T-1 / QG-CONTRACTS | TOOL-UT выше | QG-CONTRACTS | root python, test files; schemas+registry обновлены | offline env, без DB | non-mutating tests, без runtime permit | suite 5m | любой unsafe acceptance → stop | planned |
| R-AGG/ORDER/SNAPSHOT/HISTORY | PG-01..04 | M-1 / QG-BE | exact nodes из PG matrix через scripts/qa/infra/run.py | QG-BE | T-1, ya-metrica .venv+uv.lock+asyncpg, отдельный PG target/role, manifest и permit | dedicated *_test DB/role, qa_<runId>_<suffix> schema, две sessions; без public fallback | отдельное consentRef, exact target/resources/actions/expiry; user/ENV подтверждает изоляцию | 120s/node, 15m group, cleanup ≤30s | missing permit/deps/target, skipped/0 tests или residual → blocked; без auto provisioning DB/ACL | planned |
| R-STATUS/PEER/ACCESS/DEGRADE | UT-M/GW | M-1,M-2,B-1 / QG-BE | пути UT matrix | QG-BE | service lockfile env и fixtures | fake HTTP/no app DB | offline tests | 15m/service | реальный HTTP или потеря сценария → stop | planned |
| R-WIRE | WIRE-01 | B-1 / QG-CONTRACTS | serializer→parser exchange | QG-CONTRACTS | оба checkout/lockfile env, production DTO | отдельные interpreters, synthetic non-secret payload | non-mutating local DTO run | 120s/case | missing peer или mock substitute → blocked | planned |
| R-FE | FE-01..10 | F-1,F-2 / QG-FE-AUTO | targeted Vitest; final make test/lint + npm run build | QG-FE-AUTO | frontend dependencies/Node, MSW | network denied except mocks | offline tooling | 15m/group | live backend call/critical missing assertion → fail | planned |
| R-LIVE | SM-01..04 | QG-LIVE | HTTP matrix ниже | QG-LIVE | owner gates, реальные изолированные API+PG, SEO/non-SEO test actors, parse queue/worker и binding для SM-04 | tenant fixtures в выделенном test stack, не app/shared tenants | user permit на fixture/setup/cleanup и synthetic parse; без vendor credentials discovery | 120s/scenario, HTTP 10s | missing real PG/permit/binding → blocked, не synthetic PASS | planned |
| R-UX | UI-QA-01..08 | F-2 / QG-FE-MANUAL | scripted Playwright UI QA ниже | QG-FE-MANUAL | app URL, Chromium/ui-qa, safe fixture actors/history; staged error network injection | отдельный test tenant/auth input, 1366×768 | UI-only consent, real POST только SM-04 permit; остальные fixture/MSW | 120s/step, 15m run | missing browser/key checks или budget → blocked | planned |

QG-CONTRACTS единственный evidence owner WIRE/TOOL, QG-BE — SQL/peer access, QG-LIVE — live HTTP, QG-FE-MANUAL — browser UX; соседние lanes ссылаются, не повторяют свойства. Владельцы до QG выполняют те же релевантные свойства независимо; self-check не заменяет независимый QG.

## PostgreSQL для smoke-тестов

В planning доступ к Docker/DB не нужен и не выполнялся. **Test target пока не предоставлен**: это external acceptance prerequisite, не критическая неопределённость продуктового контракта. SERVICES.md описывает app DB Метрики; она запрещена как test fallback. До реального запуска QG-ENV получает от пользователя/оператора безопасные target id/host/port/database/role/isolation и отдельный permit; при необходимости читает только явно выбранные `docker inspect --format` поля identity/network, никогда Config.Env/DSN/credentials. Runtime setup/teardown без permit запрещён.

M-1 создаёт tests на уже существующих `pg_engine/pg_session` fixtures и безопасный manifest с точными PG node IDs; T-1 расширяет только registry. Команда **после разрешения**, с реальными переданными путями вместо placeholders:

`python3 scripts/qa/infra/run.py preflight --kind pg --manifest <ignored-manifest> --permit <ignored-permit>`

`python3 scripts/qa/infra/run.py run --kind pg --manifest <ignored-manifest> --permit <ignored-permit>`

Preflight не доказывает PG доступность. Runner не создаёт роль/БД и не выдаёт permit. Все raw credentials — только operator environment, не argv/evidence; новый runId на запуск. Нет NATS diff: real broker topology acceptance неприменима; для smoke реального запуска требуется готовая изолированная очередь, её setup этим change не разрешается.

### Live HTTP сценарии (не pytest smoke)

Через доступный skill api-smoke-test; если он отсутствует в runtime — blocked, не изобретать pytest smoke. Переменные: `CMS_BASE_URL`, `METRICA_PEER_BASE_URL`, `TEST_TENANT_A/B`, входы сессий SEO-only/SEO+ADMIN/non-SEO (секреты отдельно). Fixtures поставляет владелец acceptance, одноразовые runtime helpers не создаются.

| ID | Запрос/действие | Проверка |
|---|---|---|
| SM-01 | GET gateway без сессии/с SEO/non-SEO, включая invalid query | 401/200/403, invalid SEO query 400; auth отказ до peer |
| SM-02 | GET peer с/без валидного selector, отдельно Cookie/Bearer; limits/offset | 200/401/400 по matrix; чужая session не меняет header tenant; scope fixture A не выдаёт B |
| SM-03 | GET gateway со spoof selector B, страницы seeded смешанной истории A | только A, тот же total/order, один parsing, delete после очистки; GET не ставит работы |
| SM-04 | Подтверждённый POST /api/seo/parse-jobs из нового окна, затем явный GET | 202 означает accepted, запись появляется после delivery; один parsing при множестве children; actual vendor parsing без credentials/permit остаётся unchecked с причиной, не считать fake wire доказательством vendor |

## Manual QA steps (UI тестирование)

Все шаги — Chromium **1366×768**, `/seo`, только desktop. Вход: отдельный test tenant с активной привязкой, seeded mixed history >20 строк (включая deleted binding), разрешённые SEO/non-SEO actors; ошибки через контролируемую network fixture, не ломать production. Scripted evidence и визуальная инспекция по ui-qa/browser-qa protocol; failed geometry/error/permission — безопасный screenshot и redacted status/body в `.qa/seo-metrica-task-monitor/QG-FE-MANUAL/`.

1. **UI-QA-01 Auth:** открыть `/seo` anonymous → `/login`; non-SEO → forbidden без SEO/Yandex calls; SEO-only → три вкладки, «Интеграции» active, карточка «Яндекс.Метрика», Webmaster отсутствует. ADMIN-only не override.
2. **UI-QA-02 Binding:** активная привязка показывает «Задачи»; null/error/loading — не показывает. Открыть мышью, закрыть Esc и повторить клавиатурой Enter/Space: фокус внутри, после закрытия на исходной кнопке; одно чтение при открытии.
3. **UI-QA-03 Table:** проверить русские типы/статусы/date, одну parsing строку при 8 children, активные выше новых terminal; пояснение предыдущих привязок и delete-строка видимы. Loading/empty/error различимы, error не выдаётся за пустой список.
4. **UI-QA-04 Pagination:** initial 20/0, страница 2 → 20/20, размер 50 → 50/0; reopen → 20/0. «Обновить список» сохраняет текущую страницу; уменьшение total корректирует offset один раз. Пользовательских фильтров/сортировки нет; список не пересортирован локально.
5. **UI-QA-05 Nested confirm:** «Обновить данные» открывает confirmation; Escape закрывает только верхнее, фокус возвращается внутрь задач. Повторить, подтвердить дважды быстро: один POST; pending блокирует закрытие обеих модалок/повтор. При 202 закрыто только подтверждение, toast и один GET offset=0; без автоматического reload Pages/Queries. Если delivery задержан — пояснение, не фиктивный успех исполнения.
6. **UI-QA-06 Errors/access:** по очереди GET 400/401/403/502/network и POST 400/401/403/502/503/network: safe messages, auth flow, нет автоматических повторов, состояние не потеряно. Отозвать SEO или поменять binding при pending GET: окно закрыто, старый ответ не проявляется, новые вызовы не отправляются. Реальный POST только при отдельном permit.
7. **UI-QA-07 Layout/a11y:** 100 строк и длинные значения, scroll таблицы/окна, tab/shift-tab, видимый focus, focus trap, aria labels, scoped axe, contrast normal/focus/error; нет overlap заголовка/кнопок/paginator или недоступных footer. Скриншот/геометрия проверяются явно, не только DOM presence.
8. **UI-QA-08 Regression:** «Страницы»/«Запросы» без refresh, их пагинаторы/сброс/метрики работают, «Нормализация» только у страниц; unlink по-прежнему 5s и danger, wizard/OAuth не изменены. Нет site-* imports/consumer API или горизонтального page scroll из-за окна.

Owner F-2 перед первым QG выполняет scoped selection UI-QA-02/04/05/07 с fixtures; независимый QG-FE-MANUAL — весь конечный набор, без mobile/tablet finding. Failed real cases исправляются только после exact reproducer-before/after по policy, один targeted recheck тем же lane.

## Risks / Trade-offs

- [R-HISTORY] Нет counter identity у всех старых операций → tenant-wide история и явная подпись, без ложной точности/backfill.
- [R-EVENTUAL] 202 и видимость истории не атомарны, часть отклонённых команд не сохраняется → пояснение + ручной GET, нет optimistic fake persisted task/polling.
- [R-ORDER] Offset может сдвигаться при смене статуса между запросами → стабильный id tie-break на неизменном наборе; нет обещания cursor snapshot на всю сессию.
- [R-BLOCKED] failed_blocked не означает снятия maintenance barrier → отдельный русский статус «Ошибка: требуется вмешательство», без обещания немедленного запуска.
- [R-PERF] SQL агрегирует tenant history → SQL aggregation до pagination, bounded result и проверка плана на synthetic fixture; отдельное решение о materialization/retention только если доказана необходимость.
- [R-ISOLATION] Peer credential-less и dev ports опубликованы → production release gate остаётся блокирующим до отдельного подтверждения внешней недоступности; approval change его не закрывает.
- [R-INFRA] Missing test PG/permit/tool registration → T-1 устраняет software gap, но missing target/consent означает blocked acceptance без обхода guards.

## Migration Plan

Миграций БД/AsyncAPI нет. Развёртывать Метрика read API → backend gateway с настройкой peer URL → frontend. Откат в обратном порядке; сохраняемые ledger не изменяются. Old UI продолжает работать с прежним POST, удалённый HTTP parse endpoint не восстанавливается.

После всех handoff — один общий QG-FULL. Сейчас отчёт не создаётся; будущий QG-SYNTH владеет единственным `docs/reports/seo-metrica-task-monitor.md`. После APPROVED/явного пользовательского решения Router выполняет sync specs, повторный strict validate и archive по соответствующим skills и approval gates, без отдельного агентного checkpoint unit. PLAN-1 до approval ничего из этого не выполняет.

## Open Questions

Критических продуктовых вопросов нет: tenant-wide история и её недоступность из UI без binding выбраны явно для approval. Если требуется наблюдение cleanup сразу после отвязки без новой привязки или строгая история одного счётчика, это изменение выбранного scope и потребует пересмотра proposal/specs до apply. До acceptance оператор должен предоставить изолированную PG/test actors, отдельные permits и при необходимости vendor credentials; отсутствующие условия остаются blocked/unchecked, не PASS.
