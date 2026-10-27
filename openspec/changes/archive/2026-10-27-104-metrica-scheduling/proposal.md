# Proposal

Источник запроса: `docs/tasks/104_metrica_planning.md` (read-only). Изменяемый план — только этот OpenSpec change.

## Why

Парсинг Яндекс.Метрики (задача 101) сегодня запускается только вручную прямым вызовом `POST /api/metrica/stats/parse` сервиса `ya-metrica-service`; UI (задачи 102–103) только читает данные. Данные не обновляются сами, у администратора CMS нет кнопки обновления, а backend вынужден был бы ходить в сервис метрики напрямую. Нужно, чтобы **всеми запусками управлял `seo-service`**: по расписанию и по ручной команде он ставит задачу сервису метрики через NATS JetStream, причём так, чтобы такие же «клиенты парсинга» (например, Вебмастер) подключались без переделки.

## What Changes

- **seo-service — оркестратор парсинга.** Новый scheduler-процесс ежедневно в настраиваемое `.env` время (с часовым поясом конюшен из `SEO_UTC_OFFSET_HOURS`) находит все конюшни с привязанным счётчиком и публикует по одной команде парсинга на конюшню. Новый ручной endpoint `POST /api/parse-jobs` публикует ту же команду по запросу.
- **Универсальная job-команда в NATS.** Stream `PARSE_COMMANDS` создаётся программно в seo-service (владелец). Subject `commands.parse.<provider>.run`, единый envelope (`provider`, `equestrian_id`, `trigger`, `window`, `params`). Новый клиент парсинга подключается регистрацией провайдера в seo и собственным durable consumer — без изменения envelope, scheduler и API.
- **ya-metrica-service — исполнитель.** Принимает команды `commands.parse.ya_metrica.run` durable pull-consumer'ом и ставит задания в существующую очередь (`ParseEnqueueService`). Идемпотентность по `job_id`. Окно дат — существующий автоматический резолв (последняя статистика → сегодня; при ежедневной работе это «вчера и сегодня», то есть 2 дня).
- **BREAKING (внутренний peer): удаляется** `POST /api/metrica/stats/parse` из ya-metrica-service. Постановка задач возможна только через NATS.
- **yandex-service — источник целей.** Новый peer-endpoint `GET /api/connections/metrica` (список привязок: `equestrian_id`, `counter_id`) нужен scheduler'у, чтобы найти конюшни со счётчиком.
- **backend.** Новый маршрут `POST /api/seo/parse-jobs` (ADMIN-only, конюшня из сессии) проксирует команду в seo-service. Backend не обращается к сервису метрики.
- **CMS frontend.** На вкладках «Страницы» и «Запросы» страницы SEO — кнопка «Обновить данные» и модалка подтверждения; после подтверждения вызывается backend, SEO ставит задачу метрике.
- **Контракты и документация.** AsyncAPI для seo-service (producer) и ya-metrica-service (consumer), цель `asyncapi-validate-parse`, README «NATS JetStream», обновление `SERVICES.md` и `.env.example`.

## Capabilities

### New Capabilities
- `parse-job-messaging`: NATS-контракт универсальной команды парсинга (stream, subjects, envelope, идемпотентность, программное создание stream, AsyncAPI, правила подключения нового провайдера).
- `seo-parse-scheduling`: ежедневное расписание в seo-service (время и часовой пояс из `.env`, выбор конюшен через реестр провайдеров, ledger диспетчеризации, окно дат «автоматически»).
- `seo-parse-trigger-api`: ручной endpoint `POST /api/parse-jobs` seo-service и backend-прокси `POST /api/seo/parse-jobs` с access matrix.
- `metrica-parse-command-consumer`: приём команды сервисом метрики, идемпотентность по `job_id`, карта исходов ack/nak/term.
- `yandex-metrica-binding-list`: peer-endpoint списка привязок счётчиков.
- `cms-seo-parse-refresh-ui`: кнопка обновления и модалка подтверждения в CMS.

### Modified Capabilities
- `metrica-parse-trigger`: удаляется HTTP-endpoint M2 и его access-контракт; требования привязки/активного запуска переносятся на обработку NATS-команды; автоматический резолв дат уточняется сценарием ежедневного запуска.
- `yandex-peer-http-contract`: из матрицы peer-endpoints убирается M2 (теперь rejection по R1), добавляется новый endpoint списка привязок.
- `seo-peer-http-contract`: набор статусов дополняется `202` и `503`; новый маршрут входит в Internal Trusted Network Write.
- `seo-backend-proxy`: route inventory расширяется до 11 маршрутов.

## Impact

- Код: `services/seo-service` (NATS, scheduler, providers, ledger-миграция, API), `services/ya-metrica-service` (consumer, миграция `job_id`, удаление endpoint), `services/yandex-service` (list endpoint), `services/backend` (прокси-маршрут), `services/frontend` (кнопка, модалка, hook).
- Инфраструктура: новый контейнер `seo-scheduler` в `.docker-compose/docker-compose.seo.yml`; зависимость `nats-py` в seo-service и ya-metrica-service; новая миграция в seo-service (`parse_dispatches`) и в ya-metrica-service (`job_id`).
- API: `POST /api/parse-jobs` (seo), `POST /api/seo/parse-jobs` (backend), `GET /api/connections/metrica` (yandex), удалён `POST /api/metrica/stats/parse` (metrica). Access matrix — в `design.md#access-matrix` и в delta specs.
- NATS: новый stream `PARSE_COMMANDS`, subject `commands.parse.ya_metrica.run`, durable `ya-metrica-parse-run`; AsyncAPI-файлы обоих сервисов.
- Не затрагивается: схема данных статистики, чтение метрик (M1/M3–M6), логика ingestion, Celery-очередь метрики, `SITE_EVENTS`/`NOTIFICATION_COMMANDS`.
- Quality Gate: **`QG-FULL`** (миграции, NATS/AsyncAPI, >2 сервисов с кодом).
