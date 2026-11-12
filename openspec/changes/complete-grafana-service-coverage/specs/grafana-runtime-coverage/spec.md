# Spec Delta

## Purpose

Оператор EqSiteCMS должен видеть проверяемое покрытие каждого включённого runtime прикладными метриками и логами в Grafana, отличать простой от потери сбора и воспроизводить конфигурацию из её согласованного источника.

## ADDED Requirements

### Requirement: Полная инвентаризация runtime
Проект SHALL вести перечень сервисов и runtime components с источником deployment, enabled state, владельцем, ожидаемыми metrics/log signals и evidence. Перечень MUST включать девять сервисов задачи 115 и их фоновые процессы, Redis/NATS/PostgreSQL; site-ksk-inlove и чужие проекты MUST быть исключены из coverage и discovery.

#### Scenario: Покрытие всех включённых компонентов (COV-01)
- **WHEN** проводится сверка manifest, effective deployment и Grafana
- **THEN** каждому включённому API, Next.js server, worker, beat, VK bot, SEO scheduler/maintenance и встроенному consumer соответствует строка с прикладным scrape/heartbeat и логами
- **AND** выключенный компонент помечен disabled с источником настройки, а не passed; завершившийся migration Job имеет lifecycle logs и completion/exit через Kubernetes, но не обязан иметь постоянный scrape
- **AND** container CPU/memory отображаются отдельно и не считаются прикладной метрикой

### Requirement: Согласованное discovery и доставка логов
Сбор SHALL использовать согласованные внутренние scrape targets и pipeline stdout/stderr → collector → Loki. Каждый target/stream MUST однозначно соответствовать service и component, без смешения API и workers. Система MUST обнаруживать потерю scrape и задержку доставки; отсутствие обычного трафика MUST NOT считаться отсутствием сбора.

#### Scenario: Scrape wiring (PIPE-01)
- **WHEN** внутренний scraper обнаруживает включённый component
- **THEN** selectors, namespace, named port, path и registry согласованы, `up=1` виден не менее трёх последовательных scrape intervals, а process/heartbeat свидетельствуют о фактическом runtime
- **AND** отказ одного component не маскируется метриками другого

#### Scenario: Подтверждение логов без бизнес-трафика (PIPE-02)
- **WHEN** доступна разрешённая безопасная lifecycle/диагностическая запись конкретного runtime
- **THEN** запись обнаруживается в Loki с его service/component и timestamp не позднее 120 секунд от emission
- **AND** отсутствие старых строк в коротком окне само по себе не считается FAIL; если эмиссия не подтверждена, статус unchecked/blocked с причиной, не passed

### Requirement: Инфраструктурные метрики зависимостей
Redis, NATS и PostgreSQL SHALL иметь отдельные health/capacity/connection и применимые queue/JetStream метрики. Существующий PostgreSQL exporter MUST переиспользоваться без повышения текущих grants; согласованное ранее исключение повышенных прав MUST оставаться явно видимым, не выдаваться за least privilege. Labels MUST исключать бизнес-данные. Инфраструктурный exporter MUST NOT заменять прикладные метрики worker.

#### Scenario: Слой зависимостей (INFRA-01)
- **WHEN** проверяется monitoring инфраструктуры EqSiteCMS
- **THEN** видны Redis availability/memory/connections, NATS connections/JetStream pending/ack/redelivery и PostgreSQL availability/connections/storage по фактически доступным безопасным collectors
- **AND** неподдерживаемая метрика явно отмечена с причиной, secret values и payload не собираются, дублирующий PostgreSQL exporter не появляется

### Requirement: Dashboards отражают качество покрытия
Grafana SHALL предоставлять versioned dashboards покрытия, HTTP RED, фоновой работы, инфраструктуры и логов с фильтрами service/component/environment и переходами в логи. Панели MUST различать zero traffic, missing series, scrape down, stale heartbeat и disabled runtime; они MUST NOT включать inlove или чужие проекты.

#### Scenario: Прикладные панели и логи (DASH-01)
- **WHEN** оператор выбирает любой включённый runtime
- **THEN** видит его coverage, применимые rate/errors/p50/p95/p99, job duration/failure/backlog/heartbeat и логи
- **AND** «нет данных» не подменяется нулём, runtime labels соединяются без неоднозначного many-to-many, readiness/health traffic не создаёт ложную HTTP активность

### Requirement: Воспроизводимый источник конфигурации и release gate
Каждая monitoring конфигурация SHALL иметь согласованный source и владельца с воспроизводимой версией: Git revision либо allowlisted file digests и chart version. Live acceptance MUST ссылаться на эту identity, среду и окно после разрешённого rollout. Отсутствие доступа или источника конфигурации MUST блокировать соответствующий delivery slice, а не разрешать ручное изменение live ресурсов.

#### Scenario: Неизвестен внешний monitoring repository (OWN-01)
- **WHEN** Helm release виден read-only, но его source repository или write permission не переданы
- **THEN** локальные артефакты можно подготовить, а внешняя интеграция и итоговое live acceptance остаются blocked/unchecked с причиной и отдельным ограниченным заданием владельцу
- **AND** proposal approval не трактуется как разрешение deploy/apply или PG/NATS setup/teardown

#### Scenario: Найденный source и сохранение deployment overrides (OWN-02)
- **WHEN** реализуется monitoring часть из согласованного `/srv/EqCMS_Infra`
- **THEN** runtime values и dashboard JSON меняются только в назначенных charts этого source, без второй редактируемой копии в CMS root и без live patch
- **AND** local render/adoption monitoring сохраняют PostgreSQL overlay Grafana, Secret references, storage/retention и текущие объекты shared monitoring; отсутствие Git не даёт права init/commit

#### Scenario: Независимое live подтверждение (LIVE-01)
- **WHEN** после согласованного rollout выполняется Quality Gate
- **THEN** evidence содержит конечный inventory всех включённых components, три успешных scrape intervals, log delivery до 120 секунд, проверки внешней недоступности metrics и sanitized telemetry
- **AND** отсутствующие prerequisites/непроверенные runtime не выдаются за полное покрытие

### Requirement: Безопасное подключение инфраструктурных логов и exporter
Native инфраструктурные логи SHALL нормализоваться по allowlist service/component/event без raw SQL/payload в Loki. Exporter credentials MUST задаваться references, не literals/CLI/evidence. Новые collectors MUST ограничиваться согласованными project instances и queues, не читать application message bodies.

#### Scenario: Минимизация native логов (INFRA-02)
- **WHEN** собираются native Redis/NATS/PostgreSQL и exporter logs
- **THEN** collector сохраняет timestamp/severity и ограниченную event category, заменяя невалидированные свободные сообщения безопасным фиксированным текстом до Loki
- **AND** инфраструктурные строки не обходят policy через непротоколированный raw branch и не присоединяют GlitchTip/moneyhelper/mcp/inlove workloads

#### Scenario: Redis secret contract (INFRA-03)
- **WHEN** chart Redis готовится к включению exporter
- **THEN** startup/probe/exporter используют согласованные Secret references без plaintext credential; offline tests используют только synthetic values
- **AND** production provisioning/rotation выполняются отдельно владельцем; их отсутствие блокирует rollout, но не разрешает literal fallback
