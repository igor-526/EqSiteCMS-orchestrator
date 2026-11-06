# Сохранение parse intent во время обслуживания

## MODIFIED Requirements

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
