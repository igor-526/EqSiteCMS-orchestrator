# Spec Delta

## ADDED Requirements

### Requirement: Прикладные метрики девяти сервисов
Сервисы backend, notification-service, email-service, vk-service, seo-service, yandex-service, ya-metrica-service, frontend и site-ad SHALL предоставлять прикладные HTTP и runtime метрики отдельно от контейнерных. Метрики MUST учитывать число запросов, ошибки, распределение времени ответа и использовать конечный набор нормализованных маршрутов.

#### Scenario: HTTP-метрики после запроса (APP-01)
- **WHEN** разрешённый тестовый HTTP-запрос обрабатывается каждым сервисом
- **THEN** его счётчик запросов увеличивается и latency попадает в histogram, а errors различаются по status class
- **AND** runtime/process метрики относятся к обслуживающему процессу, а не к пустому exporter sidecar

#### Scenario: Неизвестные маршруты и отсутствие трафика (APP-02)
- **WHEN** scraper работает, но запросов нет, либо приходят неизвестные пути с разными ID/query
- **THEN** доступность scrape остаётся видимой, HTTP rate может быть нулевым, а неизвестные пути не создают неограниченные label values
- **AND** metrics/health scrapes не увеличивают прикладной HTTP throughput

### Requirement: Наблюдаемость самостоятельных фоновых runtime
Все включённые worker/beat/bot/scheduler/maintenance/consumer SHALL иметь component identity, heartbeat и применимые outcome/duration метрики. Очереди SHALL иметь backlog и observed wait по безопасным timestamps; недоступный oldest age MUST отмечаться явно. Instrumentation MUST NOT менять ack/retry/транзакции.

#### Scenario: Простой и выполнение работы (JOB-01)
- **WHEN** фоновый процесс запущен и ожидает работу
- **THEN** его heartbeat обновляется, scrape доступен, а счётчики обработки могут оставаться нулевыми
- **AND** разрешённая тестовая работа увеличивает success/failure/retry и duration соответствующего component без дублирования после fork

#### Scenario: Перезапуск и деградация (JOB-02)
- **WHEN** worker перезапускается или доступность его зависимости деградирует в изолированной проверке
- **THEN** метрики не мешают остановке/запуску, stale heartbeat отличается от простоя, а ошибка telemetry не меняет результат бизнес-операции

### Requirement: Внутренний доступ к служебным метрикам
Metrics listeners SHALL быть отдельными внутренними `GET :9000/metrics`, доступными только monitoring scraper. Они MUST NOT публиковаться business ingress/host/NodePort/LoadBalancer. Network isolation MUST применяться независимо от пользовательских credentials. Все исключения из Public Read определяются следующей access matrix и проверяются anonymous/authenticated тестами.

#### Scenario: Access matrix metrics endpoints (ACCESS-01)
- **WHEN** проверяется доступ к перечисленным служебным endpoint
- **THEN** применяется матрица ниже; «auth» означает валидную пользовательскую сессию, а не сетевое право scraper

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | backend :9000/metrics | Internal Metrics Read | monitoring scraper, не CMS role | 200 из разрешённого scraper; сетевой deny извне | то же; CMS auth не даёт сетевого доступа |
| GET | notification-service :9000/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | email-service API/worker :9000/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | vk-service API/worker/bot :9000/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | seo-service API/scheduler/maintenance :9000/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | yandex-service :9000/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | ya-metrica-service API/parse worker/cleanup worker/merge worker/beat :9000/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | frontend :9000/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | site-ad :9000/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | Redis exporter :9121/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | NATS exporter :7777/metrics | Internal Metrics Read | monitoring scraper | 200 из scraper; deny извне | то же |
| GET | NATS 127.0.0.1:8222/varz, /connz, /jsz | Internal Monitoring Read | exporter sidecar того же pod | 200 из sidecar; нет listener на podIP/public | то же; CMS auth не влияет |
| GET | PostgreSQL exporter :9187/metrics | Internal Metrics Read | monitoring scraper | существующий 200 из scraper; deny извне | то же |
| GET | публичные ingress пути /metrics и /api/metrics всех девяти сервисов | Protected Infrastructure Exclusion | нет | 404 | 404, включая ADMIN/SUPERUSER |
| POST | loki-gateway.monitoring:80/loki/api/v1/push | Internal Log Transport Write | доверенные Alloy/Grafana pods; не CMS role | 204 для валидного push из trust-set; network deny извне | то же; CMS auth не даёт сетевого доступа |
| GET | loki-gateway.monitoring:80/loki/api/v1/query, /query_range, /labels, /label/{name}/values | Internal Log Transport Read | доверенные Alloy/Grafana pods; не CMS role | 200 для валидного read из trust-set; network deny извне | то же |

Loki transport — явные исключения Public Read/Protected Write: при существующем auth_enabled=false защита сетевая, не user-role/per-method ACL. Alloy и Grafana входят в один внутренний trust-set gateway; proxy не обещает разделение write/read между ними. Нельзя публиковать Loki ingress или выдавать CMS session право raw logs.

Причина исключений: служебные runtime/queue/DB данные не являются публичным бизнес-контентом. Нет пользовательской роли, tenant override или business auth для scraper. Сетевой deny — отказ соединения/timeout policy, а не выдуманный HTTP 401. Внутренние listeners без пользовательской auth защищены allowlist сети; public paths всегда 404.

#### Scenario: Anonymous и authenticated доступ (ACCESS-02)
- **WHEN** выполняется anonymous и authenticated запрос из разрешённого scraper, запрещённого pod и внешнего клиента
- **THEN** scraper получает 200 с Prometheus content type независимо от cookie, запрещённый pod/внешний клиент не устанавливает соединение, public ingress возвращает 404
- **AND** валидная сессия и роли CMS не обходят границу; обычные бизнес GET/write сохраняют прежние outcomes

#### Scenario: Anonymous и authenticated Loki transport (LOG-ACCESS)
- **WHEN** проверяется gateway из доверенного и forbidden/external origin без и с пользовательской auth
- **THEN** валидный GET из trust-set получает 200, а валидный POST получает 204 только в разрешённой изолированной проверке; forbidden/external origin не устанавливает соединение независимо от auth
- **AND** production read-only QG не делает тестовый push; разрешённые существующие emission/ingestion подтверждаются чтением, а write contract независимо проверяется offline/изолированно

### Requirement: Единая безопасная схема логов и labels
Все runtime приложений SHALL писать структурированные stdout/stderr записи с timestamp, level, service, component, environment, event и безопасным сообщением. Labels MUST иметь ограниченную кардинальность. Credentials, cookies, tokens, DSN, тела запросов/сообщений, email, телефоны и tenant/user/job IDs MUST NOT попадать в telemetry labels; приватные payload и персональные данные MUST исключаться из logs до отправки.

#### Scenario: Санитизация и кардинальность (DATA-01)
- **WHEN** HTTP/task ошибка содержит тестовые секреты, персональные данные, query string или динамические идентификаторы
- **THEN** stdout/stderr и метрики не содержат эти значения, stacktrace остаётся одной логической записью, route/task/outcome labels принадлежат allowlist
- **AND** request correlation допускается только как неприватное неиндексируемое поле записи, не Loki/Prometheus label

#### Scenario: Startup и shutdown logs (DATA-02)
- **WHEN** runtime приложения стартует, применяет миграции или завершает работу
- **THEN** sanitized lifecycle запись остаётся доступной в stdout/stderr, библиотечные логгеры не отключаются и telemetry не удерживает процесс
- **AND** существующая Sentry sanitization/шумоподавление сохраняются
