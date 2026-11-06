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
Валидная команда SHALL передавать `equestrian_id`, `window` и `job_id` в постановку. Вне обслуживания SHALL проверяться привязка и создаваться run с заданиями pages/search_queries и сигналом аккаунту. При maintenance SHALL сначала сохраняться pending intent; auto-окно и актуальная привязка SHALL определяться после снятия барьеров, без потери команды после ACK.

#### Scenario: Ежедневная команда
- **WHEN** вне maintenance приходит `window=auto`, последняя дата страниц и запросов — вчера
- **THEN** создан один run `date_mode=auto`, задания `pages` и `search_queries` на окно «вчера..сегодня» в статусе `queued`

#### Scenario: Конюшня без статистики
- **WHEN** у конюшни нет ни одной строки статистики и maintenance завершён
- **THEN** окно — от сегодня минус 2 года до сегодня, декомпозированное на окна ≤5 дней

#### Scenario: PC-01 Команда ожидает обслуживание
- **WHEN** команда поступает при активном cleanup/merge или незавершённой SEO-финализации
- **THEN** intent сохраняется с job_id и authoritative generation/cleanup seq, ACK следует commit; новые tasks не стартуют до снятия барьера и завершения уже существующего активного run

### Requirement: Идемпотентность по job_id
Run SHALL хранить nullable уникальный `job_id`; pending intent SHALL дедуплицироваться по тому же job_id. Повтор MUST NOT создавать второй intent/run/tasks и SHALL завершаться ack. Переход intent→run SHALL сохранять identity без окна для двойной постановки.

#### Scenario: Redelivery после успешной постановки
- **WHEN** сообщение доставлено повторно после сохранения run, но до ack
- **THEN** новых заданий нет, сообщение подтверждено

#### Scenario: Run без job_id
- **WHEN** выбирается существующий run, созданный до введения `job_id`
- **THEN** `job_id` равен `NULL`, миграция не изменяет статистику и задания

#### Scenario: PC-02 Redelivery ожидающей команды
- **WHEN** job_id уже сохранён в pending intent либо переведён в run
- **THEN** остаётся один логический запуск, durable dedup работает вне broker duplicate_window

### Requirement: Карта исходов обработки команды
Успех, duplicate job_id и устойчиво сохранённое ожидание maintenance SHALL давать ack. Вне maintenance активный run, отсутствие привязки и невозможный диапазон SHALL давать ack с безопасной диагностикой. Невалидный envelope/provider SHALL давать term; временный сбой peer/storage SHALL давать nak до max_deliver. Maintenance MUST проверяться до обычного пропуска из-за активного run/отсутствия binding.

#### Scenario: Активный запуск
- **WHEN** вне maintenance у конюшни есть задания `queued` или `running`
- **THEN** команда подтверждается без новых заданий, в логе info без секретов

#### Scenario: Привязка удалена
- **WHEN** yandex-service возвращает `counter=null` и нет pending cleanup/merge
- **THEN** команда подтверждается, задания не создаются, warning в логе

#### Scenario: Временный сбой
- **WHEN** yandex-service недоступен
- **THEN** сообщение получает `nak`, доставляется повторно до `max_deliver`, после исчерпания остаётся в stream без обработки

#### Scenario: Битое сообщение
- **WHEN** тело — не JSON либо `schema_version` неизвестен
- **THEN** сообщение получает `term`, повторов нет, пишется безопасный warning без тела

#### Scenario: PC-03 Удаление до доставки команды
- **WHEN** lifecycle показывает pending cleanup, но локальная cleanup-команда ещё не дошла
- **THEN** parse intent сохраняется в ожидании, а не пропускается из-за counter=null; после завершения обслуживания при всё ещё отсутствующем binding завершается обычным missing-binding outcome

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
