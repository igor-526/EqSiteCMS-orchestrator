# nats-jetstream-protocols Specification

## Purpose
Документирование протоколов и паттернов работы с NATS Jetstream включая настройку, Dependency Injection, публикацию и потребление событий.

## Requirements

### Requirement: NATS Jetstream конфигурация должна использовать отдельный класс настроек

Система ДОЛЖНА использовать отдельный класс `NatsSettings` для всех настроек NATS Jetstream с префиксом `NATS_`.

#### Scenario: Настройки NATS вынесены в отдельный класс
- **WHEN** приложение запускается
- **THEN** все настройки NATS Jetstream загружаются из отдельного класса `NatsSettings`
- **AND** все переменные окружения NATS начинаются с префикса `NATS_`

#### Scenario: Валидация настроек NATS
- **WHEN** заданы некорректные настройки NATS
- **THEN** система должна выбросить ошибку валидации при запуске

### Requirement: NATS Jetstream клиент должен использовать Dependency Injection

Система ДОЛЖНА использовать Dependency Injector для управления жизненным циклом NATS Jetstream клиента.

#### Scenario: NATS клиент создается через DI контейнер
- **WHEN** приложение запускается
- **THEN** NATS Jetstream клиент создается через Dependency Injector контейнер
- **AND** клиент доступен через DI, а не через `app.state`

#### Scenario: NATS клиент корректно закрывается
- **WHEN** приложение останавливается
- **THEN** NATS Jetstream клиент корректно закрывается через DI контейнер

### Requirement: NATS Jetstream streams должны настраиваться автоматически

Система ДОЛЖНА автоматически настраивать NATS Jetstream streams при запуске.

#### Scenario: Streams создаются при запуске
- **WHEN** сервис запускается
- **THEN** все необходимые NATS Jetstream streams создаются автоматически
- **AND** конфигурация streams соответствует требованиям сервиса

#### Scenario: Идемпотентность настройки streams
- **WHEN** сервис перезапускается
- **THEN** существующие streams не создаются заново
- **AND** конфигурация streams обновляется при необходимости

### Requirement: NATS Jetstream consumers должны настраиваться автоматически

Система ДОЛЖНА автоматически настраивать NATS Jetstream consumers при запуске.

#### Scenario: Consumers создаются при запуске
- **WHEN** сервис запускается
- **THEN** все необходимые NATS Jetstream consumers создаются автоматически
- **AND** конфигурация consumers соответствует требованиям сервиса

#### Scenario: Идемпотентность настройки consumers
- **WHEN** сервис перезапускается
- **THEN** существующие consumers не создаются заново
- **AND** конфигурация consumers обновляется при необходимости

### Requirement: NATS Jetstream publishing должен использовать DI

Система ДОЛЖНА использовать Dependency Injection для публикации сообщений в NATS Jetstream.

#### Scenario: Publisher создается через DI
- **WHEN** нужно опубликовать сообщение
- **THEN** publisher создается через Dependency Injection
- **AND** publisher использует NATS клиент из DI контейнера

#### Scenario: Публикация сообщения
- **WHEN** нужно отправить событие в NATS Jetstream
- **THEN** сообщение публикуется в указанный subject
- **AND** возвращается PubAck подтверждение

### Requirement: NATS Jetstream consuming должен использовать DI

Система ДОЛЖНА использовать Dependency Injection для потребления сообщений из NATS Jetstream.

#### Scenario: Consumer создается через DI
- **WHEN** нужно потреблять сообщения
- **THEN** consumer создается через Dependency Injection
- **AND** consumer использует NATS клиент из DI контейнера

#### Scenario: Обработка сообщений
- **WHEN** сообщение поступает в NATS Jetstream
- **THEN** consumer обрабатывает сообщение
- **AND** отправляет ack подтверждение после успешной обработки
