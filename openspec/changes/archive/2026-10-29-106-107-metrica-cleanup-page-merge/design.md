# Design — совместные 106 и 107

Задания: `docs/tasks/106_statistics_deleting.md`, `docs/tasks/107_seo_pages_merge.md`. Дата: 2026-10-29. Сервисы: `services/yandex-service`, `services/ya-metrica-service`, `services/seo-service`, `services/frontend` (пути подтверждены SERVICES.md и services.manifest).

## Context

Мотивация и границы — [proposal.md](proposal.md). Это проектируемые гарантии, не отчёт об уже работающей реализации.

Подтверждённый точечным чтением baseline:

| Источник | Наблюдаемое поведение / gap |
|---|---|
| yandex `src/core/services/yandex_metrica_counter_service.py`, `yandex_accounts_service.py`, `src/api/yandex_connections.py` | Удаление сейчас только repository delete; cascade теряет контекст привязки. POST меняет существующую привязку. Нет outbox очистки |
| metrica `src/core/services/parse_enqueue_service.py`, `parse_task_runner.py`, `src/repositories/metrica_parse_task_repository.py` | enqueue блокируется по конюшне, worker сериализован по аккаунту; нет общего tenant maintenance gate |
| metrica `src/models/metrica_stats.py`, `src/repositories/metrica_stats_repository.py`, `src/core/services/stat_ingestion_service.py` | Две таблицы статистик, unique tenant/date/entity; пять исходных аддитивных метрик, три generated ratio; ingestion суммирует совпавшие UUID, но upsert различает parse_task_id. Его нельзя слепо вызвать для merge |
| seo `src/core/services/page_normalizer.py`, `page_service.py`, `blacklisted_*_service.py`, `src/repositories/page_repository.py`, `src/models/pages.py` | POST/PATCH/DELETE пока только CRUD; resolve использует текущие списки, UUID уникален по tenant/path hash; нет исторического scan и отчёта |
| seo/metrica `docs/asyncapi.yaml` | Существующие PARSE_COMMANDS, `commands.parse.ya_metrica.run` v1; owner seo, consumer metrica. Не менять envelope ради обслуживания |
| frontend `src/features/seo/ui/ConfirmActionModal.tsx`, `MetricaConnectionCard.tsx`, `YandexAccountStep.tsx`, соответствующие hooks/tests | Общий confirm уже есть, но нет требуемых последствий и countdown |
| `openspec/changes/105-seo-role/proposal.md` | Целевой SEO-only gateway; main specs местами пока ADMIN. Зависимость до apply, не разрешение использовать незавершённый код как истину |

## Goals / Non-Goals

Цель — устойчивый tenant-арбитраж, ограниченные транзакции и наблюдаемый однократный эффект поверх at-least-once доставки. Не делать распределённую транзакцию между БД, новый общий framework очередей, массовый backfill старых правил без нового POST, восстановление разделённых URL, новые публичные API, progress dashboard, auth/network remediation или замену существующего scheduler.

Очистка удаляет только `metrica_page_stats` и `metrica_search_query_stats` конюшни. SEO-страницы и поисковые запросы как справочники при отвязке не очищаются. Audit runs/tasks/outbox не считаются статистикой и сохраняются; queued старого поколения получают cancelled. Удаление аккаунта без связанного счётчика не затрагивает метрику. Замена активного счётчика прямым существующим POST не превращается в неоговорённое каскадное удаление: сохраняется текущая семантика, но generation меняется и старые queued не могут использовать новую привязку. UI штатно сначала отвязывает счётчик.

## Decisions

### 1. Общая машина состояний, не приоритет брокера

PostgreSQL ya-metrica — источник истины: tenant gate с устойчивыми полями, maintenance operations/chunks, inbox, leases, checkpoints и pending parse intents. Очереди отдельно: существующая `ya_metrica` для parse и новые `ya_metrica_cleanup`, `ya_metrica_merge` для сигналов обслуживания (тот же сервисный Redis DB 5/6, без новой БД). Диспетчер/beat восстанавливает потерянные Celery-сигналы. Встроенного Celery priority/revoke недостаточно: оно не закрывает race нескольких worker и не является durable отменой.

Все enqueue/claim, отмена, batch commit/checkpoint и переходы gate используют один порядок коротких tenant locks, затем account locks для parse. SQL выполняется в repositories; core использует Protocol, DI — существующий контейнер, API не содержит SQL. Блокировки не удерживаются на время HTTP/NATS.

Приоритет: `cleanup > merge > parse`. Уже running parse попытки могут закончиться, queued run не дренируется целиком: иначе merge, ожидающий run, и parse, ожидающий merge, заблокируются. При merge queued задания остаются; при cleanup все queued старой привязки и deferred intents, сохранённые с observed_cleanup_requested_seq ниже cleanup_seq удаляемой привязки, отменяются. Новые parse intents после удаления сохраняют authoritative observed_cleanup_requested_seq (не момент локального получения NATS) и остаются в ожидании, не получают окончательные окна/credentials до выхода из gate. Существующий active-run rejection вне maintenance сохраняется. Уже сохранённый pending intent после снятия maintenance ждёт окончания существующего run, затем атомарно превращается в run с тем же job_id; при отсутствующем binding завершается missing-binding без вечной блокировки. На уровне каждого tenant нет concurrent parse с maintenance; account exclusivity остаётся дополнительным ограничением.

При удалении running parse получает шанс закончить текущую попытку (включая оставшиеся страницы API данного задания). Удалённые credentials могут дать штатный failed — обещать успех нельзя. Временная ошибка running при cleanup не возвращает его в исполнимый queued: terminal cancelled с диагностикой; retry/lease recovery не воскрешает старую работу. По истечении lease worker fenced: проверка token/lease и tenant gate в одной транзакции с записью статистик. Затем можно чистить. Миллион строк не держит единую транзакцию: claim → один батч → checkpoint/commit → перепроверка приоритета. Cleanup вытесняет merge на следующей границе батча.

Минимальные состояния ledger: cleanup `pending → draining → deleting → completed` и `failed_blocked`; merge `collecting/waiting → running → awaiting_seo → completed` либо `superseded_by_delete → awaiting_seo → completed`. Lease содержит owner token, expires_at, fencing revision; transition выполняется compare-and-set. Gate может хранить несколько pending операций, но выдаёт только одну исполнимую на tenant. Queue индексы `(status,next_attempt_at)` и `(equestrian_id,status)`; chunks unique `(operation_id,part_index)`, inbox unique `(consumer,message_id)`, pending intent unique `job_id`, generation/seq неотрицательны. Завершение одной операции никогда не сбрасывает барьеры остальных.

### 2. Закрыть окно DELETE → rebind → задержанный NATS

В yandex отдельная tenant lifecycle-строка живёт независимо от FK привязки: `binding_generation bigint`, `cleanup_requested_seq bigint`, `cleanup_completed_seq bigint`. Начальные значения 0; импорт существующей привязки получает поколение 1. DELETE реальной привязки под tenant lock сохраняет cleanup operation UUID, следующий requested_seq и outbox до FK delete в той же транзакции. Account delete предварительно выбирает все его привязки (tenant locks в сортированном порядке), затем тот же use case и FK cascade. Конкурентные DELETE аккаунта/счётчика дают один эффект для одной реально удалённой привязки. Если несколько реальных удалений случились подряд — отдельные seq и операции, не lost update.

GET существующей private peer привязки добавляет lifecycle рядом с `counter`, даже при null. DTO клиентов SEO/Метрики обновляются; main gateway продолжает отдавать прежний безопасный DTO без новых внутренних полей. POST rebind меняет generation, но не requested/completed. Повтор с теми же данными остаётся no-op. Это локальный fencing-контракт, а не новый пользовательский endpoint.

Parse enqueue и dispatch/claim читают authoritative lifecycle без кэша. Pending cleanup блокирует разворачивание новых intents, даже если NATS не доставлен. При недоступности peer — fail closed/отложенный retry без потери intent. Прочитанный snapshot привязки сохраняется в run/tasks (generation); перед claim сверяется заново. In-flight claim со старым snapshot, пересёкшийся с DELETE, считается старой работой до локального delete-barrier: он не использует новую привязку, его обязательно дожидаются/fence перед очисткой. Никакие новые generation не стартуют пока requested > completed. Поздняя старая delete-команда с уже completed seq не чистит новые данные.

После очистки Метрика публикует коррелированный cleanup result. Yandex продвигает completed только по собственному ledger операций и непрерывно завершённому префиксу seq, не простым max незнакомого числа. Поздний отчёт seq=1 не разблокирует seq=2. Даже если новый parse видит завершённый lifecycle, локальный metrica gate ещё удерживает незавершённые merge/finalization. Не полагаться на порядок разных streams.

### 3. Топология и wire-контракты NATS

Канонические AsyncAPI producer/consumer должны совпасть в трёх сервисах. Existing PARSE_COMMANDS и core notification streams не расширяются.

| Stream / владелец | Subject | Producer → consumer / durable |
|---|---|---|
| `YANDEX_LIFECYCLE` / yandex | `events.yandex.metrica.cleanup.requested` | yandex → metrica / `ya-metrica-cleanup-requested` |
| `SEO_MAINTENANCE` / seo | `commands.seo.pages.merge` | seo → metrica / `ya-metrica-pages-merge` |
| `SEO_MAINTENANCE` / seo | `events.seo.pages.merge.finalized` | seo → metrica / `ya-metrica-pages-merge-finalized` |
| `METRICA_MAINTENANCE_RESULTS` / metrica | `events.metrica.cleanup.completed` | metrica → yandex / `yandex-metrica-cleanup-completed`; metrica → seo / `seo-metrica-cleanup-completed` |
| `METRICA_MAINTENANCE_RESULTS` / metrica | `events.metrica.pages.merge.completed` | metrica → seo / `seo-metrica-pages-merge-completed` |

Stream subjects — ровно перечисленные, без пересечения wildcard PARSE_COMMANDS. FILE/LIMITS, max_age=0 (не истекать до обработки), без автоматического discard старых бизнес-команд; дисковый budget/alerts контролирует оператор, overflow publish failure остаётся в outbox. Durable pull, ALL, explicit ack, ack_wait=30s; для новых maintenance consumers max_deliver=-1, задержка nak экспоненциальная 1..60s, после 5 ошибок — безопасная эскалация, не потеря валидной команды. Parse durable сохраняет прежние настройки. Лимит batch body 256 KiB, до 500 mappings; при превышении байтового лимита разделять раньше. Точное создание/актуализация stream только владельцем, чужой stream lookup retry 10×2s с линейным backoff, incompatible config fail fast; graceful stop без падения на reconnect.

Общий envelope v1: `schema_version=1`, `message_id:uuid`, `operation_id:uuid`, `equestrian_id:uuid`, `occurred_at:UTC RFC3339`. Строгие схемы дополнительных полей:

- cleanup requested: `cleanup_seq:positive bigint`, `binding_generation:bigint`, `reason:counter_unlinked|account_deleted`. Никаких токенов, логинов, OAuth code или PII. Tenant достаточно для очистки обеих таблиц.
- merge command: `normalization_revision:positive bigint`, `kind:mappings|seal`. Mappings: `part_index>=0`, `mappings:[{source_page_id:uuid,target_page_id:uuid}]` (1..500), source != target. Seal: `part_count>=0`; пустой scan запечатывается нулём. Снимок mappings устойчив в SEO, один source принадлежит одной цели ревизии; проверка tenant и membership у SEO producer обязательна. Часть уникальна по operation/part_index; повтор с другим content hash — conflict, не новая работа.
- cleanup completed: `cleanup_seq`, `status:completed`. Результат только после удаления обеих таблиц и fencing старого parse; failed/retry не выдаёт completed.
- merge completed: `normalization_revision`, `status:completed|superseded_by_delete`, `part_count` (null допустим только для немедленного superseded), `cleanup_operation_id` и `cleanup_seq` обязательны только при superseded. Частичное суммирование не обозначается completed.
- merge finalized: `normalization_revision`, `result_message_id:uuid`; подтверждает безопасную обработку конкретного результата SEO, а не только получение сообщения.

`Nats-Msg-Id = uuid5(NAMESPACE_URL, "eqcms:maintenance:v1:<subject>:<operation_id>:<part_index-or-kind>")`; message_id равен этому ID, определяется один раз и сохраняется в outbox. Cleanup result включает seq через operation ID, финализация включает result ID в suffix kind. Разные subjects не используют общий Msg-Id; PubAck.duplicate явно логируется warning и считается доставленным повтором того же сообщения. В БД inbox unique(consumer,message_id) и сравнение payload hash; повтор после duplicate_window также безопасен. Временная DB/integration ошибка → nak, invalid schema/tenant correlation → term и диагностика. ACK только после commit inbox+operation/chunk/result. Consumers не выполняют батчи в обработчике NATS.

Outbox publisher хранит pending/published, attempts, next_attempt_at, claim lease; публикация вне транзакции, отметка после PubAck. Retry 1..60s без удаления намерения по cap, с эскалацией. Новый consumer после длительного простоя восстанавливается из retained stream, а локальный dispatcher — из ledger. При потере брокерного хранилища восстановление из producer ledger — операционная процедура, не автоматическое разрешение gate. NATS — Internal Trusted Network Write; user roles неприменимы, production isolation gate не снимается.

### 4. Батчи удаления и суммирования

Cleanup: под gate отменить queued старой привязки, дождаться/fence running, удалить по tenant ограниченными наборами PK (default 1000, диапазон 1..10000) из обеих таблиц по очереди. Нет OFFSET при DELETE и нет `.all()` миллионных RETURNING. Эффект/checkpoint/lease renew атомарны; повтор ищет оставшиеся строки. Пустые таблицы — успех. Только после проверки отсутствия строк обеих таблиц сохранить completed+result outbox одной транзакцией. Несколько cleanup seq выполняются по порядку; без parse между ними.

Merge: по source UUID и датам keyset до 1000 исходных строк. Для каждой строки в одной транзакции заблокировать source и target, прибавить пять base metrics по unique(tenant,date,target), удалить source, сохранить cursor и renew lease. Если target отсутствует — вставить. Использовать общую чистую функцию/описание аддитивных метрик ingestion, но отдельный repository move: текущий `StatsRepository.upsert` с веткой same_task не годится. Generated ratios пересчитаются в БД. При переносе `parse_task_id` целевой строки сбрасывать в NULL как агрегат разных задач; последующий свежий parse заменяет окно и выполняет обычный reconcile. Source delete+addition атомарны — повтор пустого source ничего не добавляет. Разные part не трогают одни source; пересекающиеся target сериализованы tenant gate. Aggregate overflow не обрезается: rollback и failed-blocked с диагностикой.

### 5. SEO scan, снимки и подтверждение

POST нового правила атомарно сохраняет правило, монотонную normalization revision, снимок обоих списков и pending scan. HTTP остаётся 201 со старым DTO; нет запроса миллиона страниц внутри request. Текущий POST duplicate не создаёт ревизию. PATCH/DELETE не инициируют backfill/split. В списках и mutation UI новый progress API не нужен.

Для pages добавить индексируемый монотонный `scan_seq bigint` (sequence; существующим строкам backfill в maintenance window). Новые значения выделяются при insert только после взятия tenant lock. Фоновый scan — keyset `scan_seq > cursor AND scan_seq <= high_water`, default 500 страниц/транзакция; high-water фиксируется под тем же коротким tenant lock, что resolve/изменение правил. `created_at` не подходит для watermark: PostgreSQL transaction timestamp может предшествовать фактическому insert после ожидания lock. Каждая страница до high-water проверяется один раз; source пути нормализуются существующим PageNormalizer по снимку ревизии. Канонический UUID получается существующим resolve: использовать уже существующий canonical path, иначе создать target; даже одиночное переименование — source→target. Unchanged paths пропускаются. В scan transaction фиксируются mapping, redirect/alias по source UUID и outbox part; затем отдельный seal с total parts. Не складывать весь mapping в память и не передавать URL через NATS.

Resolve использует текущие настройки и переводит найденный UUID по действующим redirect-chain под тем же lock. До завершения scan новые canonical пути уже создаются обычным resolve; scan использует именно их. Запросы resolve, начатые до изменения правил, коммитятся до установки high-water благодаря общему lock. Aliases хранятся по UUID, не как вечный rewrite исходного URL: если позднее правило удалено, будущий resolve может создать новый UUID для вновь разрешённого варианта, но не воскресить удалённый UUID. Текущий snapshot backfill не пересчитывается PATCH/DELETE. Следующий POST фиксирует новый snapshot, но его scan/операции идут после финализации предыдущей ревизии, что исключает циклы и удаление цели нового merge. Для chain требуется path compression/проверка отсутствия цикла в транзакции.

Метрический consumer допускает части не по порядку; завершённость только при seal и всех 0..part_count-1. Итог completed сохраняется вместе с outbox. SEO валидирует operation/tenant/revision/part_count и выполненность своего scan, потом батчами удаляет только source UUID из сохранённых mappings. Target не удаляется. Ledger/UUID redirects сохраняются после physical delete для идемпотентности старых результатов. После последнего batch SEO сохраняет finalized+outbox; до получения этой финализации metrica держит parse gate, чтобы следующий run не гонялся с удалением страниц.

При cleanup сразу формируется `superseded_by_delete`, даже до seal. Это отмена вычислений, НЕ разрешение на немедленное удаление справочника: статистики ещё могут ссылаться на source. SEO сохраняет ожидание cleanup_operation_id/seq, продолжает ограниченный scan и aliases, ждёт одновременно seal и `cleanup.completed`, после чего удаляет source и публикует finalized. Cleanup result, пришедший раньше cancelled report, хранится inbox/ledger для последующей корреляции. Late части superseded операции не исполняются; отмена идемпотентна. Новое удаление при уже ожидающей финализации не снимает другие барьеры.

### 6. UI, только desktop

Изменения локальны в `src/features/seo`: существующая ConfirmActionModal принимает список React-пунктов последствий и восстановление, deadline/countdown локальным hook. Общий `src/ui` не получает бизнес-тексты; `src/api`/DTO не получают таймер. Изначально «Подтвердить (5)», затем 4..1, после дедлайна «Подтвердить». Проверка deadline также в handler, не только disabled; время считается от открытия (не от количества interval ticks), очищается при unmount/close, сбрасывается при смене entity. Pending сильнее countdown, Enter и double-click не обходят запрет. Ошибка сохраняет модалку и контекст; ручной retry после дедлайна допустим. Обе мутации повторно проверяют актуальный SEO.

Перечень потерь: привязка; статистики страниц; статистики поисковых запросов; для аккаунта — аккаунт в CMS и условный каскад связанной Метрики. Восстановление: OAuth (для аккаунта), повторная привязка, дождаться фоновой очистки, ручная/плановая загрузка; не обещать восстановление всей истории сверх доступности источника. После DELETE уведомление «Отвязано. Очистка статистики выполняется в фоне», а не «Все данные уже удалены». Новые интеграции в этом change не добавляются.

## Access matrix

Нормативные полные строки и парные anonymous/authenticated сценарии: [yandex-metrica-gateway](specs/yandex-metrica-gateway/spec.md), [yandex-oauth-accounts](specs/yandex-oauth-accounts/spec.md), [seo-normalization](specs/seo-normalization/spec.md), [seo-page-normalization-settings](specs/seo-page-normalization-settings/spec.md). Эти таблицы — часть данного design, не ссылка на будущий анализ. Все новые HTTP endpoints отсутствуют; изменены эффекты старых DELETE/POST и private GET binding DTO. Gateway GET `/api/yandex/metrica/connection` остаётся sensitive exception, не Public Read. Внутренние peers сохраняют явные credential-less исключения; cookies не доказывают auth. Selector SEO missing/invalid →401; у yandex UUID в path malformed →400 по существующему peer контракту. Не переносить нормализацию peer ошибок на gateway 401/403.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| DELETE | backend `/api/yandex/metrica/connection` | Protected Write | строго SEO, свой tenant | 401 | SEO 204; без SEO 403; отсутствующая привязка 204 |
| POST | backend `/api/yandex/metrica/connection` | Protected Write | строго SEO, свой tenant | 401 | SEO 200; без SEO 403; чужой account 404; invalid 400 |
| GET | backend `/api/yandex/metrica/connection` | Sensitive Private Read | строго SEO | 401 | SEO 200; без SEO 403; без lifecycle/token полей |
| DELETE | yandex `/api/connections/metrica/{counter_id}` | Internal Trusted Network Write, exception | доверенный peer | 204, absent 204; malformed 400 | то же, Cookie/Bearer игнорируются |
| POST | yandex `/api/connections/metrica` | Internal Trusted Network Write, exception | доверенный peer | 200; invalid/conflict 400 | то же |
| GET | yandex `/api/connections/metrica/{equestrian_id}` | Private Peer Read, exception | доверенный peer | 200 с lifecycle; malformed 400 | то же |
| DELETE | backend `/api/yandex/accounts/{account_id}` | Protected Write | строго SEO, свой tenant | 401 | SEO 204; без SEO 403; чужой/неизвестный account 404; malformed 400 |
| DELETE | yandex `/api/accounts/{account_id}` | Internal Trusted Network Write, exception | доверенный peer | 204, включая absent; malformed/storage failure 400 | то же, Cookie/Bearer игнорируются |
| POST | seo `/api/pages/resolve` | Internal Trusted Network Write, exception | доверенный peer | 200; missing/invalid X-Equestrian-Id 401; invalid items 400 | то же; Cookie/Bearer не заменяют selector |
| POST | backend `/api/seo/page-normalization/blacklisted-query-params` | Protected Write | строго SEO, свой tenant | 401 | SEO 201; без SEO 403; invalid 400; duplicate 409 |
| POST | backend `/api/seo/page-normalization/blacklisted-hashes` | Protected Write | строго SEO, свой tenant | 401 | SEO 201; без SEO 403; invalid 400; duplicate 409 |
| POST | seo `/api/page-normalization/blacklisted-query-params` | Internal Trusted Network Write, exception | доверенный peer | 201; selector missing/invalid 401; invalid 400; duplicate 409 | то же, Cookie/Bearer игнорируются |
| POST | seo `/api/page-normalization/blacklisted-hashes` | Internal Trusted Network Write, exception | доверенный peer | 201; selector missing/invalid 401; invalid 400; duplicate 409 | то же, Cookie/Bearer игнорируются |

Регрессия parse: backend POST `/api/seo/parse-jobs` — Protected Write, строго SEO, anonymous 401, без SEO 403, с SEO 202 после PubAck, validation/нет binding 400, upstream 502, NATS 503. Peer seo POST `/api/parse-jobs` — Internal Trusted Network Write exception для внутреннего producer, anonymous/с Cookie одинаково 202, selector missing/invalid 401, validation 400, upstream 502, broker 503. Это существующие контракты, не изменение HTTP смысла 202. Отложенный maintenance intent не равен finished parse.

## Migration Plan

1. Только после завершения параллельной задачи, approval и повторной сверки 105: зафиксировать финальные SEO-only/status/DTO и текущие Alembic heads всех трёх сервисов. Не назначать номера ревизий от незавершённого дерева заранее.
2. Additive schema: yandex lifecycle+cleanup ledger+outbox/inbox; metrica tenant gate+maintenance operations/chunks+inbox/outbox+pending intents+cancelled/generation; seo revisions/scans/mappings/UUID redirects+inbox/outbox. Индексы ready/status/next_attempt/tenant, unique операция/часть/consumer-message, tenant-qualified ссылки; существующие статистики не переписывать миграцией. Индексы для bounded cleanup выбирать по EXPLAIN реальной БД.
3. Развёртывать в maintenance window без нового parse: схемы, metrica handlers/gates, SEO scan/results/finalized, yandex lifecycle/outbox, затем UI. Пока все consumers не готовы, destructive UI не включать. Новые producer features включать совместно после проверки streams/durables, не менять стек во время планирования. Собственные настройки/compose worker queues меняются только исполнителями своих сервисов; оператор согласует root compose при необходимости отдельным ownership, без скрытой tooling-починки.
4. Backfill lifecycle существующих binding generation=1 и watermarks=0; завершить ранее начатые run либо перевести их generation по снимку под остановленным dispatcher. Старые workers без gate не должны оставаться параллельно новым.
5. Rollback: до включения producers — отключить новые worker/producer paths и оставить additive таблицы. После первого удаления/merge данные необратимы; остановить новые admissions, сохранить ledgers и брокерные сообщения, восстановить БД из согласованной резервной копии либо forward-fix. Не downgrade с потерей outbox/барьеров и не возвращать старый parse поверх неполных операций.

## Risks / Trade-offs

- [Больше таблиц/handshake] → это минимальная durable защита cross-service гонок; Redis-only locks, HTTP fire-and-forget и большой NATS payload отклонены как ненадёжные.
- [Блокировка tenant при failed maintenance] → fail closed, оператор исправляет причину и возобновляет ledger, не автоматический skip. Другие tenant работают.
- [users не является distinct между URL] → используем уже принятую ingestion-семантику суммы, без нового расчёта аудитории.
- [Удаление правила не возвращает историю] → прямо описать пользователю; snapshot/alias не является резервной копией исходных метрик.
- [Рост retained streams/ledger] → наблюдение backlog/возраста/failed/lease; автоматический purge не вводится до подтверждённой обработки. Секреты в сообщениях/логах запрещены.
- [Рабочее дерево меняется параллельно] → planning-only ownership; rebase контракта перед apply, без изменений 105, SERVICES.md, навыков или credentials.

## Execution units

Deliverables (ownership): **Y** — Backend, весь yandex-service и его сервисная compose queue/runtime область; **M** — Backend, весь ya-metrica-service и его сервисная compose worker область; **S** — Backend, весь seo-service и его сервисная compose worker область; **F** — Frontend, только SEO UI/hooks/tests frontend; **Q** — Quality Gate, аудит продукта (feature findings исправляет соответствующий Backend/Frontend владелец; scoped format допускается только после окончания его units с эксклюзивной передачей Router), evidence `.qa/106-107-metrica-cleanup-page-merge/<lane>/`, итоговый отчёт только QG-SYNTH. QG-CONTRACTS запускает существующий валидатор по service AsyncAPI файлам, не создаёт root targets и не чинит tooling. Любой неучтённый root config diff требует назначения Router до работы.

Внутри deliverable units строго последовательны и могут менять общие tightly-coupled файлы; между deliverables пересечений нет. Unit получает не весь сервис, а указанный slice и contextFiles из tasks. Ожидаемый бюджет каждого реализационного unit — 5–9 содержательных действий плюс scoped verification/handoff; при обнаружении большего — circuit breaker.

| Unit | Профиль | Deliverable | Ownership paths / slice | Зависит от | Verification |
|---|---|---|---|---|---|
| `Y-1` | Backend | Y | services/yandex-service/src/{models,migration,repositories,core,containers,depends}/**; services/yandex-service/tests/**; services/yandex-service/README.md | approval/завершение текущей задачи/сверка 105 | `cd services/yandex-service && uv run pytest tests -k "lifecycle or cleanup or account or counter" -m "not infrastructure"` |
| `Y-2` | Backend | Y | services/yandex-service/src/**; services/yandex-service/docs/asyncapi.yaml; services/yandex-service/tests/**; services/yandex-service/README.md; services/yandex-service/.env.example; .docker-compose/docker-compose.yandex.yml | Y-1 | `make -C services/yandex-service lint test test-infra` |
| `M-1` | Backend | M | services/ya-metrica-service/src/{models,migration,core/entities,core/protocols,repositories}/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/README.md | approval/завершение текущей задачи/сверка 105 | `cd services/ya-metrica-service && uv run pytest tests -k "maintenance or gate or lease" -m "not infrastructure"` |
| `M-2` | Backend | M | services/ya-metrica-service/src/{core/services,clients,workers,repositories,containers,depends}/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/README.md | M-1 | `cd services/ya-metrica-service && uv run pytest tests -k "parse or gate or ingestion" -m "not infrastructure"` |
| `M-3` | Backend | M | services/ya-metrica-service/src/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/docs/asyncapi.yaml; services/ya-metrica-service/README.md; services/ya-metrica-service/.env.example; .docker-compose/docker-compose.ya_metrica.yml | M-2 | `cd services/ya-metrica-service && uv run pytest tests -k "cleanup or maintenance or nats" -m "not infrastructure"` |
| `M-4` | Backend | M | services/ya-metrica-service/src/**; services/ya-metrica-service/tests/**; services/ya-metrica-service/README.md | M-3 | `make -C services/ya-metrica-service lint test test-infra` |
| `S-1` | Backend | S | services/seo-service/src/{models,migration,repositories,core/entities,core/protocols}/**; services/seo-service/tests/**; services/seo-service/README.md | approval/завершение текущей задачи/сверка 105 | `cd services/seo-service && uv run pytest tests -k "normaliz or merge or page" -m "not infrastructure"` |
| `S-2` | Backend | S | services/seo-service/src/{core/services,core/protocols,repositories,containers,depends}/**; services/seo-service/tests/**; services/seo-service/README.md | S-1 | `cd services/seo-service && uv run pytest tests -k "normaliz or merge or page" -m "not infrastructure"` |
| `S-3` | Backend | S | services/seo-service/src/**; services/seo-service/tests/**; services/seo-service/docs/asyncapi.yaml; services/seo-service/README.md; services/seo-service/.env.example; .docker-compose/docker-compose.seo.yml | S-2 | `make -C services/seo-service lint test test-infra` |
| `F-1` | Frontend | F | services/frontend/src/features/seo/{ui,hooks}/**; services/frontend/src/api/yandex.test.ts | approval/завершение текущей задачи/сверка 105 | `cd services/frontend && npm test -- src/features/seo src/api/yandex.test.ts && npm run lint && npm run typecheck` |
| `QG-ENV` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-ENV/** (evidence; продукт read-only) | Y-2, M-4, S-3, F-1 | `stackctl discovery/ready для поддерживаемых сервисов; штатный service Compose для остальных` |
| `QG-BE-Y` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-BE-Y/**; services/yandex-service/** (только scoped format после передачи Router, без feature fixes) | QG-ENV | `make -C services/yandex-service lint test test-infra; scoped format в lane по правилам QG` |
| `QG-BE-M` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-BE-M/**; services/ya-metrica-service/** (только scoped format после передачи Router, без feature fixes) | QG-ENV | `make -C services/ya-metrica-service lint test test-infra; scoped format в lane по правилам QG` |
| `QG-BE-S` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-BE-S/**; services/seo-service/** (только scoped format после передачи Router, без feature fixes) | QG-ENV | `make -C services/seo-service lint test test-infra; scoped format в lane по правилам QG` |
| `QG-FE-AUTO` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-FE-AUTO/**; services/frontend/** (только scoped format после передачи Router, без feature fixes) | QG-ENV | `cd services/frontend && npm test && npm run lint && npm run typecheck && npm run build` |
| `QG-CONTRACTS` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-CONTRACTS/** (evidence; продукт read-only) | QG-ENV | `существующая AsyncAPI validation по трём service файлам + IT-N-03 на реальном JetStream` |
| `QG-LIVE` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-LIVE/** (evidence; продукт read-only) | QG-BE-Y, QG-BE-M, QG-BE-S, QG-FE-AUTO, QG-CONTRACTS | `SM-D-01..02, SM-N-01..03 через API smoke skill; реальные PostgreSQL/NATS` |
| `QG-FE-MANUAL` | Quality Gate | Q | .qa/106-107-metrica-cleanup-page-merge/QG-FE-MANUAL/** (evidence; продукт read-only) | QG-BE-Y, QG-BE-M, QG-BE-S, QG-FE-AUTO, QG-CONTRACTS | `Manual QA шаги 1–8; scripted Playwright + screenshot/console/network/axe` |
| `QG-SYNTH` | Quality Gate | Q | docs/reports/106-107-metrica-cleanup-page-merge.md; .qa/106-107-metrica-cleanup-page-merge/QG-SYNTH/** | QG-LIVE, QG-FE-MANUAL | `единый отчёт и openspec status/validate --strict` |


DAG реализации:

```text
approval + завершение текущей задачи + сверка финала 105
  ├─ Y-1 → Y-2 ───────────────────┐
  ├─ M-1 → M-2 → M-3 → M-4 ──────┤
  ├─ S-1 → S-2 → S-3 ───────────────────┤
  └─ F-1 ────────────────────────┘
```

Y/M/S/F могут писать параллельно только после согласованного wire-контракта данного design. M-2 принимает versioned yandex DTO по mocks и не требует готового live Y-2; M-4 — по контракту S-3. Live-интеграция только после всех веток.

Общий QG-FULL: `QG-ENV → (QG-BE-Y ∥ QG-BE-M ∥ QG-BE-S ∥ QG-FE-AUTO ∥ QG-CONTRACTS) → (QG-LIVE ∥ QG-FE-MANUAL) → QG-SYNTH`. Backend lane разделён по сервисам ради бюджета, не три независимых approval. QG-FORMAT отдельным unit неприменим, scoped format/lint/test внутри соответствующих lanes. Исправления findings возвращаются владельцу; пересекающиеся исправления последовательны, затем затронутые проверки повторяются. Только общий APPROVED/согласованный waiver разрешает Router последующие sync specs → strict validate → archive по отдельным gates; на стадии плана этого не выполнять.

## Test matrix

Трассировка: MP/PQ/PC/YD/YA/SN/NS/ER/UI — идентификаторы scenario соответствующих delta specs. `UT` — unit с mocks без live API; `IT` — реальная PostgreSQL/NATS, без mock брокера; `SM` — live API через `.agents/skills/api-smoke-test` (эквивалентная копия `.claude/skills/api-smoke-test`), не pytest smoke. Отсутствие инфраструктуры в обязательном gate — FAIL/blocked, не skip=PASS.

### Удаление и арбитраж

| ID | Уровень / риск | Сценарий и ожидаемый результат | Трассировка / место |
|---|---|---|---|
| UT-D-01 | unit / happy path | DELETE binding создаёт одну операцию; account каскад; несвязанный account не чистит | Y2-17, YA-01; yandex tests/unit |
| UT-D-02 | unit / валидация | malformed UUID, absent binding, повтор и DTO null без секретов | Y2-18, YD-01; yandex tests/unit |
| UT-D-03 | unit / внешняя ошибка | publish timeout/duplicate, lost PubAck, startup до owner, безопасный retry | MP-01..02; yandex/metrica tests/unit |
| UT-D-04 | unit / гонки | generation, два DELETE, rebind до delivery, поздний completed seq, peer outage fail closed | YD-01..02, PQ-05; yandex/metrica tests/unit |
| UT-D-05 | unit / очередь | cancelled queued/retry, running finish/error, lease expiration, late worker fenced | PQ-01, PQ-04; metrica tests/unit |
| UT-D-06 | unit / приоритет | delete>merge>parse; merge ждёт running, не весь queued run; другое tenant не блокируется | PQ-02..03, PQ-06, PC-01..03; metrica tests/unit |
| UT-D-07 | unit / access | anonymous/SEO-only/SEO+ADMIN/ADMIN-only/без SEO/foreign gateway; peer Cookie не влияет | YD-03, YA-02; mocks gateway/peer |
| IT-D-01 | PostgreSQL / atomicity | FK cascade, rollback outbox, unique seq, concurrent DELETE/rebind и watermark | YD-02, Y1-17; yandex tests/infrastructure |
| IT-D-02 | PostgreSQL / batch | обе таблицы >2 батчей, empty, другой tenant, crash before/after commit, lease fence | MP-03..04, PQ-04..06; metrica tests/infrastructure |
| SM-D-01 | live API / persistence | два DELETE через gateway и повторная привязка; stats обеих таблиц очищены после running, новые не удалены | YD-01, YA-01, PQ-05; QG-LIVE |
| SM-D-02 | live API / access | все HTTP-строки yandex matrix парно anonymous/authenticated, foreign tenant, ответы без внутренних lifecycle/token | YD-03, YA-02; QG-LIVE |

### Историческая нормализация и надёжная доставка

| ID | Уровень / риск | Сценарий и ожидаемый результат | Трассировка / место |
|---|---|---|---|
| UT-N-01 | unit / happy path | query/hash POST snapshot, canonical target существует/нет, unchanged path пропущен | SN-01..02, NS-01; seo tests/unit |
| UT-N-02 | unit / validation | duplicate POST, invalid value, rollback не публикуют; source=target и conflicting part rejected | NS-01, MP-02; seo/metrica tests/unit |
| UT-N-03 | unit / aggregation | пять сумм, ratios weighted/generated, users additive; разные даты/empty; не вызвать parse upsert неправильно | MP-05..06; metrica tests/unit |
| UT-N-04 | unit / порядок | seal раньше частей, part duplicate, разные hash, result/finalized redelivery, неизвестный result не удаляет | MP-01, MP-07..08, ER-01; seo/metrica tests/unit |
| UT-N-05 | unit / конфликты | новые правила/resolve параллельно, цепочка ревизий, PATCH/DELETE не делают split | SN-01..03, NS-03; seo tests/unit |
| UT-N-06 | unit / delete race | cleanup в queued/active merge, immediate superseded result, report раньше/после cleanup, late chunks не исполняются | MP-09..10; seo/metrica tests/unit |
| UT-N-07 | unit / access и DTO | все POST normalization/resolve matrix, selector missing/invalid 401, SEO only gateway, без URL/секретов в NATS | SN-04, NS-02; seo tests/unit |
| IT-N-01 | PostgreSQL / bounded scan | >2 scan/mapping/delete batches, high-water, aliases, tenant unique, concurrent resolve и rule changes | SN-01..03, MP-04; seo tests/infrastructure |
| IT-N-02 | PostgreSQL / exactly-once effect | source+target same date collision, retry checkpoint, stale lease, overflow rollback; свежий parse reconcile после merge | MP-03, MP-05..06; metrica tests/infrastructure |
| IT-N-03 | реальный NATS / доставка | owner/config/durable/filter, explicit ack, nak/redelivery, invalid term, duplicate вне broker window, restart/outbox, все четыре направления результатов | MP-01..02, MP-07..10; QG-CONTRACTS |
| SM-N-01 | live API / persistence | POST обоих правил через gateway, история складывается, SEO удаляет sources после result и finalized; PATCH/DELETE без split | SN-01..03, MP-05, MP-07; QG-LIVE |
| SM-N-02 | live API / race | parse→merge ожидание, merge→parse ожидание, delete→merge cancel, rebind сразу после delete | PQ-02..05, MP-09..10; QG-LIVE |
| SM-N-03 | live API / access | обе POST matrix и resolve парно, 400/409, чужой item PATCH/DELETE 404, parse 202 не completed | NS-02..03, SN-04; QG-LIVE |

Временные HTTP/DB/NATS сбои и задержанные сообщения проверяются контролируемыми fixtures без изменения параллельного стека. Большой объём: blocking functional test использует несколько батчей с искусственно малым лимитом, отдельный ограниченный performance-прогон EXPLAIN/размера payload подтверждает отсутствие полного scan в памяти; миллион реальных записей не является обязательным временем каждой unit-сессии. Public consumer GET не меняется — отдельный новый Public Read тест неприменим; regression отсутствие `site-*` diff обязательно.

### Frontend

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| ConfirmActionModal / countdown | deadline 5s, список, закрытие/другая entity | FE-01 open/close reset; FE-02 fake timers 0..4999/5000 + Enter guard; FE-03 pending/double submit; FE-04 unmount/смена entity | SEO present/missing, локальный guard | `npm test -- src/features/seo/ui/ConfirmActionModal.test.tsx` |
| MetricaConnectionCard/useMetricaConnection | текст потерь, фоновой успех | FE-05 success/invalidation; FE-06 backend 400/validation, generic error; FE-07 401/403 сохраняют modal | anonymous route block, SEO-only success, ADMIN-only forbidden | `npm test -- src/features/seo` |
| YandexAccountStep/useYandexAccounts | условный каскад, иконка без выбора | FE-08 success refresh+selection reset; FE-09 empty/error/404 refresh; FE-10 permission revoked и disabled/hidden | SEO+ADMIN разрешён; без SEO нет mutation | `npm test -- src/features/seo` |
| API boundary / интеграция | прежние DELETE и POST, без новых DTO UI | FE-11 MSW success/empty/validation/generic/401/403; FE-12 не делать запрос до deadline | `src/api/yandex.test.ts`; без live backend | `npm test -- src/api/yandex.test.ts`; `npm run lint`; `npm run typecheck`; `npm run build` |

Обе модалки покрывают минимум open/close, valid submit, validation error, backend error, success refresh и permission case. Fake timers контролируют абсолютный deadline; API/component tests только MSW/mocks. Списки не перепроектируются, regression сохраняет «Показать ещё» и параметры paging; новые фильтры/сортировки неприменимы. Shared hooks/services при извлечении покрыть base/empty/error в существующей группе FE-01..12, не live substitution. No `site-*` mixing — проверить отсутствие новых consumer imports.

## PostgreSQL для smoke-тестов

На этапе PLAN окружение не исследовалось через Docker и не изменялось по прямому запрету задания; параметры БД и credentials не читались. Это отложенная обязательная discovery, не fake evidence. QG-ENV после освобождения стека находит контейнеры yandex/metrica/seo по compose labels и делает scoped `docker inspect`: имена, network, DB name/user/host/port, состояние migration, без вывода environment/паролей целиком. Секреты передаются только локально skill. QG-LIVE читает handoff discovery и подтверждает реальную PostgreSQL по контрольным tenant fixtures; изменения/cleanup fixtures не затрагивают чужие данные. Credentials из изменённого `credentials.json` планировщик не открывает. Если DB/NATS недоступны — gate blocked, не обход tooling и не skip.

## Manual QA steps (UI тестирование)

Предусловия: QG-ENV освободил стек, migrations/consumers готовы, две тестовые конюшни, SEO-only/SEO+ADMIN/ADMIN-only/без роли/anonymous; controlled данные страниц и запросов, отдельный несвязанный аккаунт. URL CMS `/seo`. Только 1366×768. Выполнять scripted Playwright с network/console/axe и визуальной инспекцией; evidence в `.qa/106-107-metrica-cleanup-page-merge/QG-FE-MANUAL/`.

1. Открыть `/seo` anonymous → login; ADMIN-only/без SEO → forbidden без запросов SEO/Яндекса; SEO-only и SEO+ADMIN видят раздел. При отзыве SEO открытая модалка не допускает mutation.
2. На вкладке Метрики открыть отвязку счётчика. Проверить список обеих статистик, сохранение аккаунта и действия восстановления. В кнопке (5)..(1), disabled; мышь/Enter до 5 секунд не создают DELETE. На 1366×768 список, кнопки, таймер не перекрываются и помещаются, фокус в модалке, отмена доступна.
3. Отменить через кнопку/крестик/Escape, затем открыть заново: снова 5 секунд, данных/запросов удаления нет. После 5 секунд быстро дважды подтвердить: один DELETE, pending блокирует повтор; успех обновляет блок, уведомление не обещает завершения cleanup.
4. Повторить для иконки аккаунта внутри визарда: открывается только confirm, не выбор/следующий шаг; связанный аккаунт предупреждает о каскаде, несвязанный — условно, без ложного удаления другой привязки. Успех обновляет список/connection, выбор сбрасывается только при удалении выбранного аккаунта. Догрузка/offset списка не сломаны.
5. Для обеих модалок через контролируемые ответы проверить 400/validation, generic error, 401, 403 и отдельно account 404. Нет ложного успеха; контекст/ошибка видимы, повтор только вручную, состояние списка соответствует контракту. Смена entity не наследует countdown.
6. После отвязки сразу заново привязать и запросить обновление статистики. UI не блокирует допустимую привязку; backend не запускает новую статистику поверх cleanup. После завершения обслуживание и parse дают актуальные данные без исчезновения свежих строк.
7. Добавить query/hash правило на исторических страницах; проверить итоговую единую страницу и суммы после background выполнения, затем PATCH/DELETE — история не расщепляется. Существующая пагинация/фильтры/сортировки страниц сохраняют правильный offset/reset, новых UI progress элементов нет.
8. Зафиксировать passed/failed по шагам, screenshots для failed layout/error/permissions, network status/body без секретов, console/axe. `site-*` и mobile/tablet не тестировать; отсутствие consumer mixing проверить по imports/diff.

## Решения для пользовательского approval

Предложенный план закончен технически; перед отдельным разрешением apply подтвердить продуктовые границы:

1. Несвязанный аккаунт не очищает статистику активного счётчика; очистка не удаляет SEO справочники.
2. Ретроактивный merge только POST нового правила, PATCH/DELETE — без merge/split; snapshot уже запущенного merge доводится до конца после изменения правила. Необратимость объединения принимается.
3. `users` суммируется как при существующем ingestion, без distinct между страницами. UI обещает повторную загрузку только в пределах доступности истории у Яндекса.

Если ответы меняют эти границы, Planner правит затронутые артефакты до apply. Главный gate: завершение текущей задачи и финальная сверка 105. Ни apply, ни runtime-проверки, ни финализация в PLAN-1 не выполняются.
