## ADDED Requirements

### Requirement: Создание NATS JetStream stream для SEO-задач
Система SHALL создать JetStream stream для постановки задач парсерам согласно протоколам из `agents/howto/nats-jetstream-protocols.md`.

#### Scenario: Stream SEO_TASKS
- **WHEN** инициализируется NATS инфраструктура
- **THEN** создаётся stream `SEO_TASKS` с retention policy `WorkQueue`
- **THEN** stream принимает subjects вида `seo.tasks.*`
- **THEN** stream поддерживает at-least-once delivery

#### Scenario: Результаты НЕ возвращаются через NATS
- **WHEN** рассматривается архитектура получения результатов
- **THEN** stream `SEO_RESULTS` НЕ создаётся
- **THEN** результаты парсинга остаются в сервисах-парсерах
- **THEN** архитектура получения результатов будет проработана в отдельной задаче

### Requirement: NATS client в seo-service
Система SHALL интегрировать NATS client для публикации задач парсерам.

#### Scenario: Публикация задачи парсинга
- **WHEN** seo-service ставит задачу парсинга
- **THEN** публикуется NATS message в subject `seo.tasks.<parser_type>` (например, `seo.tasks.yandex_metrics`)
- **THEN** message содержит JSON payload с `task_id`, `site_id`, `params`
- **THEN** message имеет headers с `trace_id` для корреляции

#### Scenario: Subject для Яндекс.Метрики как заготовка
- **WHEN** создаётся NATS publisher
- **THEN** предусмотрен subject `seo.tasks.yandex_metrics` как заготовка для будущего парсера
- **THEN** другие subjects будут добавлены при реализации соответствующих парсеров

### Requirement: Инициализация NATS streams в docker-compose
Система SHALL автоматически создавать NATS streams при старте инфраструктуры.

#### Scenario: Init-контейнер для NATS streams
- **WHEN** выполняется `docker-compose up`
- **THEN** запускается init-контейнер, создающий streams через NATS CLI
- **THEN** контейнер проверяет существование streams перед созданием (idempotent)
- **THEN** logs показывают успешное создание streams

#### Scenario: Проверка stream после старта
- **WHEN** инфраструктура поднята
- **THEN** выполнение `nats stream list` показывает `SEO_TASKS`
- **THEN** stream имеет корректную конфигурацию (subjects `seo.tasks.*`, retention `WorkQueue`)

### Requirement: Graceful shutdown NATS connection
Система SHALL корректно закрывать NATS connection при остановке сервиса.

#### Scenario: Закрытие connection при shutdown
- **WHEN** выполняется `docker-compose down` или SIGTERM
- **THEN** seo-service завершает обработку текущих messages
- **THEN** NATS connection закрывается gracefully
- **THEN** нет потерянных messages

### Requirement: Structured logging для NATS events
Система SHALL логировать NATS события с `trace_id` для debugging.

#### Scenario: Логирование публикации задачи
- **WHEN** публикуется NATS message
- **THEN** логируется событие с `trace_id`, `subject`, `task_id`, `timestamp`
- **THEN** log level `INFO` для успешных публикаций

#### Scenario: Логирование ошибок NATS
- **WHEN** происходит ошибка при публикации message
- **THEN** логируется событие с `trace_id`, `error`, `subject`
- **THEN** log level `ERROR`
