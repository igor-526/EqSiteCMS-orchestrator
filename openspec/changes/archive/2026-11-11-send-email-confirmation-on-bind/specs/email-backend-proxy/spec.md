# Spec Delta

## MODIFIED Requirements

### Requirement: Проксирование POST /emails
Backend MUST проксировать `POST /api/emails` в private email-service только после user authentication и проверки точного совпадения authenticated user ID с `body.user_id`; role/scope MUST NOT обходить owner rule. Downstream call MUST выполняться без peer-service credential после подтверждённой network isolation. После сохранения backend MUST учитывать флаг отправки подтверждения и контракт частичного успеха.

#### Scenario: Первый create владельцем
- **WHEN** authenticated owner отправляет валидный новый email и все требуемые шаги успешны
- **THEN** backend возвращает `201` с `EmailResponse`, создаётся один ресурс и при включённой отправке неподтверждённого адреса подтверждение ставится в существующую очередь

#### Scenario: Повторный create того же email
- **WHEN** owner повторно создаёт тот же нормализованный email и требуемые шаги успешны
- **THEN** backend возвращает `201` с тем же логическим `EmailResponse`, не создаёт вторую запись и сохраняет `confirmed/approved=true`; для неподтверждённого адреса включённая отправка запрашивается заново

#### Scenario: Другой email уже существующего owner
- **WHEN** owner создаёт email, отличный от уже существующего
- **THEN** backend возвращает `409`, не меняет существующий ресурс и не запрашивает отправку

#### Scenario: Anonymous и foreign create
- **WHEN** запрос не аутентифицирован либо authenticated ID не равен `body.user_id`
- **THEN** backend возвращает соответственно `401` либо `403` до lookup/downstream независимо от scope и значения флага

#### Scenario: Invalid create
- **WHEN** UUID, body, email или boolean-флаг некорректен
- **THEN** backend возвращает `400`, а не framework `422`, без downstream call

## ADDED Requirements

### Requirement: Управление отправкой при привязке
`POST /api/emails` MUST принимать необязательный строгий boolean `send_confirmation` с default `true`. Флаг MUST управлять только отправкой при create и MUST NOT передаваться в private create API. Успешный ответ MUST сохранять `201` и прежнюю схему `EmailResponse`; `PATCH /api/emails` остаётся без автоматической отправки.

#### Scenario: F-DEFAULT — текущий frontend без нового поля
- **WHEN** owner создаёт неподтверждённый адрес без `send_confirmation` либо с `true`
- **THEN** backend после успешного сохранения запрашивает существующий send-confirmation ровно один раз за HTTP-запрос и возвращает `201` при его `202`, без изменения frontend

#### Scenario: F-OFF — явный отказ от отправки
- **WHEN** owner передаёт `send_confirmation=false`
- **THEN** backend только сохраняет адрес, не вызывает send-confirmation и возвращает `201` при успешном create

#### Scenario: F-INVALID — строгий тип флага
- **WHEN** owner передаёт `null`, строку, число, массив или объект вместо boolean
- **THEN** backend возвращает `400`, не вызывает create или отправку; отсутствие поля допустимо

#### Scenario: F-APPROVED — подтверждённый адрес
- **WHEN** idempotent create возвращает для того же owner/email `approved=true` при включённой отправке
- **THEN** backend возвращает `201`, не запрашивает письмо, не меняет approved и не инвалидирует коды

#### Scenario: F-WIRE — проверка ответа перед отправкой
- **WHEN** create возвращает некорректный ответ, чужой user_id или email, не совпадающий после нормализации с запросом
- **THEN** backend возвращает контролируемый `502`, не запрашивает отправку и не раскрывает чужой payload

### Requirement: Границы сохранения и асинхронной доставки
Backend MUST запрашивать подтверждение только после успешного завершения private create. Сохранение и отправка MUST NOT объявляться общей атомарной транзакцией. Успех постановки MUST NOT означать доставку SMTP. Автоматические повторы второго HTTP-вызова внутри create MUST NOT выполняться.

#### Scenario: F-CREATE-FAIL — сохранение не завершено успешно
- **WHEN** private create возвращает доменную ошибку либо transport error
- **THEN** backend не запрашивает отправку; доменный HTTP-статус сохраняется, transport error становится `502`, а неизвестный результат записи при timeout не объявляется откатом

#### Scenario: F-QUEUE-FAIL — адрес сохранён, постановка не подтверждена
- **WHEN** private create успешно завершён, но send-confirmation возвращает не `202`, некорректный ответ либо timeout/ошибку сети
- **THEN** backend возвращает `502` с безопасным detail «Email сохранён, но отправку подтверждения не удалось подтвердить. Повторите запрос или используйте повторную отправку.», не удаляет адрес и не утверждает, что задача точно отсутствует в очереди

#### Scenario: F-RETRY — повтор после частичного успеха
- **WHEN** owner повторяет тот же нормализованный неподтверждённый адрес после `502` с включённой отправкой
- **THEN** сохраняется одна email-запись, выполняется новая попытка постановки; гарантия exactly-once для письма не предоставляется, используются существующие TTL и инвалидация кодов

#### Scenario: F-ASYNC — сбой после принятия задачи
- **WHEN** send-confirmation вернул `202`, а worker/SMTP позднее завершился ошибкой
- **THEN** ранее возвращённый `201` не меняется; ошибка и retry остаются ответственностью существующего email-service flow

#### Scenario: F-CONCURRENT — параллельные запросы
- **WHEN** owner одновременно создаёт одинаковый нормализованный адрес с включённой отправкой
- **THEN** ресурс остаётся единственным по существующему idempotency-контракту, но отдельные HTTP-запросы могут поставить несколько задач; backend не обещает межпроцессную дедупликацию и не добавляет новых автоматических HTTP-retry

### Requirement: Матрица доступа при автоматической отправке
Backend MUST соблюдать следующую матрицу при любом значении нового флага. Новый флаг MUST NOT создавать public create или privileged override. Существующие public confirmation-исключения и sensitive-read исключение MUST сохраняться.

#### Scenario: A-MATRIX — полный контракт доступа
- **WHEN** anonymous и authenticated callers обращаются к email API
- **THEN** MUST соблюдаться матрица и связанные anonymous/authenticated тесты:

| method | path | access class | roles | expected without auth | expected with auth | tests |
|---|---|---|---|---|---|---|
| POST | `/api/emails` | Protected Write | только owner, без ADMIN/SUPERUSER override | `401`, без downstream | owner `201`; different email `409`; foreign `403` до lookup; partial queue failure `502`; invalid `400` | UT-EM-01..08, UT-EM-10; SM-EM-01..03 |
| PATCH | `/api/emails` | Protected Write | только owner, без override | `401` | owner `200` / missing `404`; foreign `403`; invalid `400`; без auto-send | UT-EM-10; SM-EM-03 |
| DELETE | `/api/emails/{user_id}` | Protected Write | только owner, без override | `401` | owner `204` / missing `404`; foreign `403`; invalid UUID `400` | UT-EM-10; SM-EM-03 |
| GET | `/api/emails/me` | Protected Sensitive Read | owner из session | `401` | `200` / missing `404` | UT-EM-10; SM-EM-03 |
| POST | `/api/emails/send-confirmation` | Public Confirmation Write | anonymous / authenticated | `202`; missing email `404`; invalid body `400` | те же исходы, без owner-gate | UT-EM-10; SM-EM-03 |
| PATCH | `/api/emails/confirm` | Public Confirmation Write | anonymous / authenticated | `200`; invalid `400`; expired `410`; used `409`; отсутствующий email `404` | те же исходы, без owner-gate | UT-EM-10; SM-EM-03 |

Protected GET — персональные данные, не public consumer content. Public send-confirmation позволяет начать подтверждение без CMS session; текущий request содержит `user_id`, не секретный токен. Confirm идентифицирует подтверждение по code. Фактический метод confirm — PATCH, а не POST; метод не меняется. Создание с флагом остаётся Protected Write.

#### Scenario: A-SELECTOR — tenant selector не заменяет аутентификацию
- **WHEN** используется существующий endpoint с обязательным tenant selector, который отсутствует либо невалиден
- **THEN** сохраняется нормативный `401`; selector является non-secret identity hint и не даёт прав owner; в email proxy отдельного selector нет (N/A), и новый флаг его не вводит

| method | path | access class | roles | expected without auth | expected with auth | tests |
|---|---|---|---|---|---|---|
| — | существующие endpoints с обязательным tenant selector; email routes — N/A | неизменяемый tenant boundary | selector не даёт роли | missing/invalid selector `401` | missing/invalid selector `401` независимо от роли | существующий tenant suite; применимость отдельно фиксирует QG, без изменения чужих routes |

#### Scenario: A-NO-BYPASS — проверка owner предшествует эффектам
- **WHEN** anonymous caller либо authenticated foreign caller, включая ADMIN/SUPERUSER, передаёт `send_confirmation=true` или `false`
- **THEN** возвращается соответственно `401` или `403` до чтения email и любых downstream create/send вызовов

#### Scenario: A-PUBLIC — сохранение confirmation-исключений
- **WHEN** anonymous и authenticated caller выполняют ручной send-confirmation либо confirm
- **THEN** сохраняются одинаковые статусы матрицы без требования CMS cookie и без peer credential; новый create-флаг не участвует в этих запросах
