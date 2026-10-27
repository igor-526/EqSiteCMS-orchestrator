# metrica-parse-command-consumer Specification

## Purpose
Приём ya-metrica-service команд парсинга из NATS JetStream и постановка заданий в существующую очередь парсинга: durable pull-consumer, идемпотентность по `job_id`, карта исходов ack/nak/term и устойчивый старт без брокера.

## Requirements

### Requirement: Durable pull-consumer команды Метрики
ya-metrica-service SHALL регистрировать durable `ya-metrica-parse-run` на stream `PARSE_COMMANDS` с `filter_subject=commands.parse.ya_metrica.run`, `ack_policy=explicit`, `deliver_policy=all`, `ack_wait`, `max_deliver` и размерами fetch из настроек, и обрабатывать сообщения pull-подпиской внутри процесса API. Сервис MUST NOT создавать stream.

#### Scenario: Consumer зарегистрирован
- **WHEN** сервис стартует при существующем stream
- **THEN** durable существует с указанными фильтром и ack policy, сообщения других провайдеров не доставляются

#### Scenario: Stream ещё не создан владельцем
- **WHEN** seo-service не успел создать stream
- **THEN** регистрация повторяется с bounded backoff только на `NotFoundError`, а несовместимая конфигурация durable (`BadRequestError`) падает сразу

### Requirement: Постановка заданий из команды
Валидная команда SHALL приводить к вызову существующего сервиса постановки с `equestrian_id`, режимом окна из `window` и `job_id`: привязка проверяется у yandex-service, создаются run и задания `pages` и `search_queries`, затем аккаунту отправляется сигнал на обработку. Команда `window=auto` SHALL использовать существующий автоматический резолв дат.

#### Scenario: Ежедневная команда
- **WHEN** приходит `window=auto`, последняя дата страниц и запросов — вчера
- **THEN** создан один run `date_mode=auto`, задания `pages` и `search_queries` на окно «вчера..сегодня» в статусе `queued`

#### Scenario: Конюшня без статистики
- **WHEN** у конюшни нет ни одной строки статистики
- **THEN** окно — от сегодня минус 2 года до сегодня, декомпозированное на окна ≤5 дней

### Requirement: Идемпотентность по job_id
Run SHALL хранить `job_id` команды (nullable, уникальный); повторная доставка команды с уже сохранённым `job_id` MUST NOT создавать run и задания и SHALL завершаться ack.

#### Scenario: Redelivery после успешной постановки
- **WHEN** сообщение доставлено повторно после сохранения run, но до ack
- **THEN** новых заданий нет, сообщение подтверждено

#### Scenario: Run без job_id
- **WHEN** выбирается существующий run, созданный до введения `job_id`
- **THEN** `job_id` равен `NULL`, миграция не изменяет статистику и задания

### Requirement: Карта исходов обработки команды
Исход обработки SHALL определять действие: успех и дубликат `job_id` — `ack`; активный запуск конюшни — `ack` (info, пропуск); отсутствие привязки — `ack` (warning); невозможный диапазон дат — `ack` (warning); невалидный JSON/схема/`schema_version`/несовпадение provider — `term` без повторов; недоступность yandex-service и ошибки хранилища — `nak` с повтором до `max_deliver`.

#### Scenario: Активный запуск
- **WHEN** у конюшни есть задания `queued` или `running`
- **THEN** команда подтверждается без новых заданий, в логе info без секретов

#### Scenario: Привязка удалена
- **WHEN** yandex-service возвращает `counter=null`
- **THEN** команда подтверждается, задания не создаются, warning в логе

#### Scenario: Временный сбой
- **WHEN** yandex-service недоступен
- **THEN** сообщение получает `nak`, доставляется повторно до `max_deliver`, после исчерпания остаётся в stream без обработки

#### Scenario: Битое сообщение
- **WHEN** тело — не JSON либо `schema_version` неизвестен
- **THEN** сообщение получает `term`, повторов нет, пишется безопасный warning без тела

### Requirement: Устойчивый старт без брокера
Недоступность NATS MUST NOT мешать старту и `GET /health` сервиса: подключение и регистрация consumer SHALL повторяться в фоне с backoff, транзиентные reconnect не эскалируются, затяжной сбой эскалируется один раз за инцидент; остановка сервиса корректно закрывает consumer и соединение.

#### Scenario: Брокер недоступен при старте
- **WHEN** сервис стартует при остановленном NATS
- **THEN** `/health` отвечает `200`, остальные peer-endpoint'ы работают, consumer стартует после появления брокера

#### Scenario: Остановка
- **WHEN** процесс получает сигнал остановки
- **THEN** consumer останавливается, `drain` не роняет shutdown

### Requirement: Секреты не покидают сервис
Логи обработки команды MUST NOT содержать тело сообщения, токены, ciphertext и идентификаторы аккаунтов Яндекса; допустимы `job_id`, `equestrian_id`, исход и счётчики.

#### Scenario: Лог ошибки обработки
- **WHEN** обработка команды завершилась исключением yandex-service
- **THEN** лог содержит категорию ошибки и `job_id`, но не URL, заголовки или тело ответа peer
