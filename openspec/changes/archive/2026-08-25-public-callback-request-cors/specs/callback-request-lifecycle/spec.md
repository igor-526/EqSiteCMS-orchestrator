## MODIFIED Requirements

### Requirement: Access matrix callback API
Backend MUST реализовать следующую матрицу доступа, CORS и проверять tenant selector до доступа к tenant data. `POST /callback_requests` является публичным write-исключением, потому что его вызывает anonymous consumer form; для точного runtime path `/api/callback_requests` его actual POST и preflight SHALL использовать Public credentialless CORS аналогично Public GET. Три service PATCH являются защищёнными машинными командами по `X-Service-Key`; GET списка/детали являются защищёнными исключениями из Public Read из-за персональных данных. CORS-разрешение MUST NOT изменять application authorization или tenant validation.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| OPTIONS (`Access-Control-Request-Method: POST`) | `/callback_requests` | Public credentialless CORS preflight | any origin; no credentials | `200`; ACAO `*`; methods `POST, OPTIONS`; allow headers `Content-Type`, `X-Equestrian-Service-Key`; no credentials | для CMS origin `200`, reflected allowed origin + credentials + `Vary: Origin`; application auth не проверяется |
| POST | `/callback_requests` | Public Write exception + tenant selector + Public credentialless CORS | anonymous/authenticated | `201`, включая missing optional `name` и ignored extra field; missing/invalid selector `401`; schema-invalid body `422`; consumer origin получает ACAO `*` без credentials | те же application statuses; CMS origin получает strict CORS, но auth не требуется |
| GET | `/callback_requests/statuses` | Public Read | all | `200` | `200` |
| GET | `/callback_requests` | Protected Read exception (PII) | ADMIN, SUPERUSER | `401` | `200`; other role `403` |
| GET | `/callback_requests/{id}` | Protected Read exception (PII) | ADMIN, SUPERUSER | `401` | `200`; other role `403`; missing `404` |
| PATCH | `/callback_requests/{id}/status` | Protected Write | ADMIN, SUPERUSER | `401` | `200`; other role `403`; missing `404` |
| PATCH | `/callback_requests/{id}/spam` | Protected Write | ADMIN, SUPERUSER | `401` | `200`; other role `403`; missing `404` |
| PATCH | `/service/callback_requests/{id}/status` | Protected Service Write | valid service key | `401` | `200`; invalid key `401`; missing `404` |
| PATCH | `/service/callback_requests/{id}/spam` | Protected Service Write | valid service key | `401` | `200`; invalid key `401`; missing `404` |
| PATCH | `/service/callback_requests/{id}/notifications-delivered` | Protected Service Write | valid service key | `401` | `200`; invalid key `401`; missing `404` |

#### Scenario: Anonymous и authenticated access
- **WHEN** матрица проверяется без cookie, с ADMIN/SUPERUSER, с иной ролью и с valid/invalid service key
- **THEN** каждый endpoint возвращает указанный статус и не раскрывает чужие tenant-записи

#### Scenario: Публичный preflight callback POST
- **WHEN** consumer origin отправляет `OPTIONS /api/callback_requests` с requested method `POST` и requested headers `Content-Type, X-Equestrian-Service-Key`
- **THEN** backend возвращает `200`, wildcard origin, разрешённые `POST, OPTIONS` и headers без credentials

#### Scenario: Публичные success и error responses читаемы браузером
- **WHEN** consumer origin выполняет actual POST с valid payload, missing либо invalid selector или schema-invalid body
- **THEN** application возвращает соответственно `201`, `401` либо `422`, каждый response содержит wildcard origin и не содержит credentials

#### Scenario: CORS change сохраняет optional name
- **WHEN** consumer origin отправляет валидный create payload без `name`
- **THEN** application сохраняет заявку по существующему контракту, возвращает `201` с wildcard origin и не требует изменения DTO

#### Scenario: CORS change сохраняет BaseSchema extra-ignore
- **WHEN** consumer origin добавляет неизвестное extra field к валидному create payload
- **THEN** application возвращает `201` с wildcard origin, игнорирует extra field и не сохраняет/не возвращает его

#### Scenario: CMS origin сохраняет strict CORS без изменения access
- **WHEN** CMS origin выполняет preflight или actual публичный callback POST
- **THEN** backend отражает CMS origin, разрешает credentials и добавляет `Vary: Origin`, но endpoint по-прежнему не требует application auth

#### Scenario: Исключение ограничено точным route
- **WHEN** foreign origin выполняет preflight/actual `POST`, `PATCH`, `DELETE` или `PUT` к соседнему, service, detail, trailing-slash либо похожему пути
- **THEN** protected CORS остаётся строгим и foreign origin не получает доступ

#### Scenario: Неизвестный public requested header отклоняется
- **WHEN** consumer preflight к callback POST запрашивает заголовок вне `Content-Type` и `X-Equestrian-Service-Key`
- **THEN** backend возвращает `400` без permissive CORS headers

#### Scenario: Чужая tenant-заявка
- **WHEN** разрешённый CMS user обращается к id другого tenant
- **THEN** backend возвращает `404` без раскрытия существования ресурса
