## Context

Фактический `services/backend` принимает `POST /callback_requests`, создаёт случайный id только для NATS payload и ничего не сохраняет. `CallbackRequestEventPublisher` добавляет `X-Equestrian-Id`; notification-service переносит его в payload и HTML вместе с UUID заявки. `site-ad` отправляет на ошибочный `/call_back_requests`, использует `notes` вместо backend `comment`, а submit-кнопка постоянно disabled. В CMS callback feature отсутствует.

Источником требований служит `docs/tasks/055_callback_backend_and_ui.md`; старые reports подтверждают работоспособность delivery infrastructure, но не заменяют runtime evidence. Change затрагивает Backend Core, Notification Service, CMS Frontend и `site-ad`, поэтому требует последовательного contract owner и непересекающихся implementer ownership.

## Goals / Non-Goals

**Goals:**

- Сохранять tenant-scoped заявки до публикации события и предоставлять строго ограниченные admin/service операции.
- Дать ADMIN/SUPERUSER полноценный CMS workflow списка и обработки.
- Исправить anonymous consumer form.
- Удалить UUID всадника из callback-flow и любые UUID из пользовательского email, сохранив callback_request_id как внутренний correlation key.
- Доказать contract/access/data/UI поведение разнообразными unit, live API smoke и frontend tests/Manual QA.

**Non-Goals:**

- Редактирование или удаление заявок, настройка пользовательских статусов через UI, ML-классификация spam.
- Публичное чтение заявок либо использование CMS API в `site-ad`.
- История переходов/audit-log и гарантированный transactional outbox в рамках этой задачи.
- Унификация NATS adapters или изменение subjects/streams/durable.

## Decisions

### 1. Данные и числовые статусы

Создаются `callback_request_statuses` (`id SMALLINT PK`, unique name, `color CHAR(7)` с HEX validation) и tenant-scoped `callback_requests` с FK на status. Фиксируем полный реестр из двух состояний: `1=Новая`, `2=Обработана`; установка spam переводит заявку в `2=Обработана`. Seed выполняется существующим backend seed mechanism идемпотентно.

Альтернатива — enum/строка в одной таблице — отвергнута, потому что ТЗ требует сортируемые числовые значения, человекочитаемый реестр и HEX color.

### 2. Сначала commit, затем NATS publish

Use case валидирует selector, сохраняет заявку и после успешного commit публикует событие с её id и applicant data. Ошибка публикации не удаляет журналируемую заявку и возвращает controlled failure; повторная доставка/repair может быть отдельным operational workflow. Полный outbox — более сильная гарантия, но выходит за scope; риск фиксируется тестами частичной недоступности.

### 3. Correlation и notification-delivered

`callback_request_id` остаётся внутренним полем event для вызова notification-service → backend service PATCH. `X-Equestrian-Id` и equestrian UUID удаляются из publisher, AsyncAPI, consumer schema/handler/tests. После успешной публикации хотя бы одной предусмотренной downstream email command notification-service выставляет `notifications_delivered=true`; если нет eligible recipients либо routing/publish завершился ошибкой, флаг остаётся false. Это окончательная семантика поля: фактическая SMTP-доставка и SMTP acknowledgement/receipt не входят в callback contract и не требуются для выставления флага.

Альтернатива — удалить все UUID из межсервисного сообщения — исключила бы точную корреляцию service update; альтернатива — показывать id в письме — прямо запрещена.

### 4. Узкие API вместо generic update

Admin API: protected list/detail и два PATCH (`status`, `spam`). Service API: три PATCH под существующим `X-Service-Key`. Status lookup остаётся Public Read согласно общей policy, потому что не содержит PII. List/detail — явные protected GET exceptions из-за phone/name/comment. Public create — явное anonymous POST exception с обязательным tenant selector (`401` при missing/invalid).

Отдельные DTO с `extra=forbid` исключают изменение applicant data. Tenant scoping выполняется в service/repository query; чужой id маскируется `404`.

### 5. Безопасный поиск и стабильная выдача

Backend принимает ограниченные по длине regex patterns и отклоняет невалидные/опасные конструкции до SQL. Regex применяется case-insensitive к name/comment и нормализованному phone; phone UI запрещает обычные буквы. Стабильный tie-breaker `id ASC` предотвращает дубли/пропуски пагинации.

### 6. CMS feature boundary

Новый `features/callbackRequests` владеет types/service/hooks/components; route только композирует feature. Sidebar фильтрует item по ADMIN/SUPERUSER, route/hook повторно guard-ят доступ. Справочник статусов загружается при render и не хранится постоянно. Server state обновляется только после подтверждения mutation, с pending/double-submit guard и invalidation.

Фильтры следуют принятому в CMS table-паттерну `filterIcon`/`filterDropdown` и располагаются в заголовках соответствующих колонок: период `created_at_from`/`created_at_to` — в «Дата и время», multi-status — в «Статус», multi-spam — в «Спам», поисковые поля `name`, `phone`, `comment` — в «Имя», «Телефон», «Комментарий». Активный фильтр визуально выделяет иконку колонки; общий reset может оставаться отдельным действием над таблицей. Пользовательские placeholder/`aria-label` поисковых полей не содержат технической подписи `(regex)`, хотя debounce, допустимый синтаксис, backend query names и regex-семантика API не меняются.

### 7. Consumer form boundary

`site-ad` остаётся client-only интерактивным enhancement и не влияет на SEO content. API boundary исправляется на `/callback_requests`, `notes` преобразуется в `comment` (предпочтительно единое имя в view model), submit становится form submit, ошибки видимыми, pending блокирует повторный POST. CMS credentials не добавляются.

### 8. Ownership и порядок

1. Backend contract/data owner последовательно меняет `services/backend` и callback AsyncAPI, migration/seed/API/tests/docs.
2. Notification owner после backend contract меняет только `services/notification-service` callback schema/handler/client/AsyncAPI/tests.
3. CMS Frontend owner независимо меняет только `services/frontend`.
4. Site Consumer owner независимо меняет только `services/site-ad`.
5. Один Quality Gate проверяет общий diff, access matrix, 30+30 backend scenarios, NATS contract, frontend matrices и Manual QA; findings возвращаются соответствующим owners. После PASS Router синхронизирует delta specs, строго валидирует и архивирует change.

## Risks / Trade-offs

- [Commit выполнен, NATS publish упал] → заявка сохраняется с `notifications_delivered=false`; controlled error и operational evidence позволяют повторную обработку, outbox остаётся будущим улучшением.
- [Название delivery-флага может восприниматься как SMTP-гарантия] → API/spec/docs однозначно определяют его как подтверждение успешного downstream publish notification-service; SMTP acknowledgement/receipt не является частью acceptance.
- [Regex может быть дорогим] → лимиты длины/синтаксиса, statement timeout/безопасная subset validation и негативные тесты.
- [Одновременные status/spam updates] → atomic repository update и concurrency tests; spam=true всегда выигрывает бизнес-инвариантом status=2 («Обработана»).
- [NATS breaking header change] → backend contract owner первым обновляет обе AsyncAPI, затем producer/consumer; `make asyncapi-validate` и real JetStream acceptance до rollout.
- [PII leakage] → protected GET, tenant-scoped repository, response-schema review и запрет UUID в email snapshots.
- [Разные API conventions frontend/consumer] → MSW contract tests фиксируют exact path/body/query/status.

## Migration Plan

1. Применить миграцию таблиц/constraints/indexes и идемпотентные seed statuses; проверить upgrade/downgrade на реальной PostgreSQL.
2. Развернуть совместимые backend и notification-service изменения в одном release window; до этого не публиковать header-less callback event старому consumer.
3. Развернуть CMS feature и исправленный `site-ad`; проверить anonymous create и protected admin processing.
4. Rollback UI безопасен независимо. При rollback messaging вернуть producer/consumer одновременно. Downgrade DB допустим только если потеря новых callback rows явно принята; предпочтительный operational rollback — оставить таблицы и откатить runtime.
