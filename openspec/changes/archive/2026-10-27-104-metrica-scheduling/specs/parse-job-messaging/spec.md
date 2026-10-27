# Spec Delta

## Purpose

Единый NATS JetStream-контракт команды парсинга внешнего источника для конюшни: owner stream, subjects, envelope, идемпотентность и правила подключения новых провайдеров без изменения контракта. Заменяет прямой HTTP-вызов сервиса метрики.

## ADDED Requirements

### Requirement: Stream команд парсинга принадлежит seo-service
Stream `PARSE_COMMANDS` с subjects `commands.parse.>` SHALL создаваться программно (`add_stream`, storage `FILE`, retention `LIMITS`, `max_age` из настройки) только seo-service при старте каждого его процесса (API и scheduler) и MUST NOT создаваться потребителями. Повторный запуск с той же конфигурацией MUST быть идемпотентным.

#### Scenario: Пустой брокер
- **WHEN** seo-service стартует, а stream `PARSE_COMMANDS` не существует
- **THEN** stream создаётся с subjects `commands.parse.>`, storage `FILE`, retention `LIMITS`

#### Scenario: Повторный старт и два процесса
- **WHEN** API и scheduler seo-service стартуют одновременно либо перезапускаются
- **THEN** stream не пересоздаётся и не теряет сообщения, оба процесса стартуют успешно

#### Scenario: Потребитель не создаёт stream
- **WHEN** ya-metrica-service стартует раньше seo-service
- **THEN** он не вызывает `add_stream`, повторяет регистрацию durable с bounded backoff только на `NotFoundError`

### Requirement: Subject провайдера и состав команды
Команда SHALL публиковаться в subject `commands.parse.<provider>.run`, где `provider` — код провайдера по маске `^[a-z][a-z0-9_]{1,31}$`; для Метрики это `commands.parse.ya_metrica.run`. Тело — JSON envelope `schema_version=1`, `occurred_at`, `job_id`, `provider`, `equestrian_id`, `trigger` (`schedule`|`manual`), `window`, `params`; лишние поля envelope запрещены.

#### Scenario: Команда Метрики по расписанию
- **WHEN** scheduler публикует команду для конюшни E
- **THEN** subject равен `commands.parse.ya_metrica.run`, `provider=ya_metrica`, `trigger=schedule`, `equestrian_id=E`, `window={"mode":"auto"}`, `params={}`

#### Scenario: Несовпадение subject и provider
- **WHEN** потребитель получает сообщение, у которого `provider` не равен коду из subject
- **THEN** сообщение отклоняется как невалидное без повторной доставки

### Requirement: Окно дат и provider-specific параметры
`window` SHALL быть `{"mode":"auto"}` либо `{"mode":"explicit","date_from":"YYYY-MM-DD","date_to":"YYYY-MM-DD"}` и интерпретироваться потребителем. `params` — JSON-объект провайдера, валидируемый потребителем строго по его схеме; для `ya_metrica` он MUST быть пустым объектом.

#### Scenario: Автоматическое окно
- **WHEN** `window.mode=auto`
- **THEN** потребитель сам определяет даты по последней сохранённой статистике и своей текущей дате

#### Scenario: Неизвестные params
- **WHEN** в команде `ya_metrica` `params` содержит ключ
- **THEN** команда отклоняется как невалидная без повторной доставки

### Requirement: Идемпотентность и Nats-Msg-Id
Заголовок `Nats-Msg-Id` MUST быть `uuid5(NAMESPACE_PARSE_COMMANDS, "<provider>:<job_id>")` и уникален в пределах stream. Для `trigger=schedule` `job_id` MUST быть детерминированным `uuid5(NAMESPACE_PARSE_COMMANDS, "schedule:<provider>:<equestrian_id>:<локальная дата слота>")`, для `manual` — случайный UUID. Publisher MUST проверять `PubAck.duplicate` и логировать дубликат не ниже `warning`.

#### Scenario: Повторная публикация слота
- **WHEN** scheduler повторно публикует команду того же `provider`, конюшни и локальной даты в окне дедупликации
- **THEN** `Nats-Msg-Id` совпадает, брокер возвращает `duplicate=true`, publisher логирует warning и не считает команду новой

#### Scenario: Разные конюшни и провайдеры
- **WHEN** публикуются команды для разных конюшен либо провайдеров
- **THEN** их `Nats-Msg-Id` различаются

### Requirement: Подключение нового провайдера без изменения контракта
Добавление провайдера SHALL требовать только: реализацию провайдера в seo-service и регистрацию в реестре, отдельный subject `commands.parse.<code>.run` под существующим wildcard, durable consumer потребителя с `filter_subject` этого subject и канал в AsyncAPI. Envelope, stream, scheduler и API MUST NOT меняться.

#### Scenario: Фильтр durable
- **WHEN** потребитель `ya_metrica` регистрирует durable `ya-metrica-parse-run`
- **THEN** `filter_subject=commands.parse.ya_metrica.run`, `ack_policy=explicit`, `deliver_policy=all`, `max_deliver` и `ack_wait` из настроек, команды других провайдеров ему не доставляются

### Requirement: Канонический AsyncAPI и локальная проверка
seo-service (producer) и ya-metrica-service (consumer) SHALL содержать `docs/asyncapi.yaml` с фактическими stream, subject, durable, headers и payload; корневой Makefile SHALL иметь цель `asyncapi-validate-parse`, валидирующую оба файла. Цель `asyncapi-validate` core-сервисов MUST NOT меняться. README каждого сервиса SHALL содержать секцию «NATS JetStream».

#### Scenario: Валидация контрактов
- **WHEN** выполняется `make asyncapi-validate-parse`
- **THEN** оба файла проходят validation, а subject/durable/поля payload совпадают с runtime settings и моделями

#### Scenario: Real-broker acceptance
- **WHEN** выполняется infrastructure-набор против реального NATS JetStream
- **THEN** подтверждены создание stream, durable/filter, explicit ack, nak/redelivery, `max_deliver`, term без redelivery и duplicate по `Nats-Msg-Id`; отсутствие брокера — провал, а не skip

### Requirement: Нет авторизации NATS и секретов в сообщении
Команда MUST NOT содержать токены, ciphertext, идентификаторы аккаунтов Яндекса и данные профиля; она SHALL содержать только идентификаторы и режим окна. Доступ к NATS — доверенная внутренняя сеть, как у существующих streams; причина и production gate фиксируются в README без изменения сетевых настроек.

#### Scenario: Содержимое сообщения
- **WHEN** QG просматривает сообщение в stream `PARSE_COMMANDS`
- **THEN** в нём нет секретов и приватных данных Яндекса

Access class сообщений — Internal Trusted Network Write (producer: seo-service; consumer: ya-metrica-service); HTTP-endpoint'ов capability не вводит, роли CMS не проверяются.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| — (NATS publish) | `commands.parse.ya_metrica.run` | Internal Trusted Network Write | seo-service (producer) | брокер без auth принимает валидную команду | то же; секреты не передаются |
