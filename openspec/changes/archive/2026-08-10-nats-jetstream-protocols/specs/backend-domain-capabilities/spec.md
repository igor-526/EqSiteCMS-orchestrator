## ADDED Requirements

### Requirement: NATS Jetstream инфраструктура

Backend ДОЛЖЕН использовать NATS Jetstream для асинхронного взаимодействия между сервисами с использованием Dependency Injection.

#### Scenario: NATS клиент через DI контейнер
- **WHEN** backend запускается
- **THEN** NATS Jetstream клиент создается через Dependency Injector контейнер
- **AND** клиент доступен через DI, а не через `app.state`

#### Scenario: Публикация событий в NATS
- **WHEN** backend получает запрос на создание callback заявки через `POST /api/callback_requests`
- **THEN** backend публикует событие в stream "SITE_EVENTS"
- **AND** событие содержит информацию о заявке

#### Scenario: Настройки NATS в отдельном классе
- **WHEN** backend загружает конфигурацию
- **THEN** все настройки NATS Jetstream находятся в отдельном классе `NatsSettings`
- **AND** все переменные окружения NATS начинаются с префикса `NATS_`
