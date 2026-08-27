## 1. Реализация и проверки

### Backend

- [x] 1.1 Backend Core owner: добавить обязательный `equestrian_id` в `services/backend/src/core/schemas/messaging/callback_requested.py`.
- [x] 1.2 Backend Core owner: передать tenant UUID сохранённой заявки в event из `services/backend/src/core/services/callback_request.py`.
- [x] 1.3 Backend Core owner: синхронно обновить callback payload в `services/backend/docs/asyncapi.yaml`.
- [x] 1.4 Backend Core owner: обновить producer/service/contract tests только в `services/backend/tests/**` и отметить задачи после фактического прохождения проверок.
- [x] 1.5 Notification owner: добавить обязательный `equestrian_id` в `services/notification-service/src/core/schemas/messaging/callback_requested.py`.
- [x] 1.6 Notification owner: синхронно обновить callback payload в `services/notification-service/docs/asyncapi.yaml`.
- [x] 1.7 Notification owner: передать tenant UUID через callback consumer/handler boundary без вывода UUID в письмо.
- [x] 1.8 Notification owner: изменить `CallbackEventHandler` так, чтобы `get_users` всегда получал одновременно `equestrian_ids=[tenant]` и `role=[ADMIN,SUPERUSER]`, без unscoped fallback.
- [x] 1.9 Notification owner: сохранить пересечение scoped users, enabled settings и approved emails и fail-closed обработку ошибок.
- [x] 1.10 Notification owner: при необходимости уточнить тип tenant UUID в `core/protocols/clients/main_backend.py`, не меняя HTTP endpoint/access boundary.
- [x] 1.11 Notification owner: обновить handler/client/contract tests только в `services/notification-service/tests/**` и отметить задачи после прохождения проверок.
- [x] 1.12 Зафиксировать Access matrix `GET /api/service/users`: Service Read, valid `X-Service-Key` → `200`; отсутствующий/invalid key, cookie-only или selector-only → `401`; новых/изменённых endpoint нет.
- [x] 1.13 Проверить, что NATS DTO и AsyncAPI producer/consumer совпадают по required fields, UUID format и `additionalProperties: false`.
- [x] 1.14 Не создавать миграции БД, smoke pytest-файлы или изменения Email Service/frontend.
- [x] 1.15 Перед smoke повторно найти PostgreSQL container по labels с fallback `eqsitecms-db`/postgres и получить env/host port через `docker inspect`, без хардкода.

- [x] Unit: tenant-scoped callback routing — UT-01 create переносит точный `EquestrianContext.id` в event DTO.
- [x] Unit: tenant-scoped callback routing — UT-02 event tenant совпадает с tenant сохранённой callback entity.
- [x] Unit: tenant-scoped callback routing — UT-03 producer DTO принимает валидный tenant UUID.
- [x] Unit: tenant-scoped callback routing — UT-04 producer DTO отклоняет отсутствующий tenant.
- [x] Unit: tenant-scoped callback routing — UT-05 producer DTO отклоняет malformed tenant.
- [x] Unit: tenant-scoped callback routing — UT-06 producer serialization включает UUID tenant.
- [x] Unit: tenant-scoped callback routing — UT-07 Backend AsyncAPI требует `equestrian_id`.
- [x] Unit: tenant-scoped callback routing — UT-08 Backend AsyncAPI фиксирует UUID format и запрещает extra fields.
- [x] Unit: tenant-scoped callback routing — UT-09 consumer DTO принимает producer payload с tenant.
- [x] Unit: tenant-scoped callback routing — UT-10 consumer DTO отклоняет payload без tenant.
- [x] Unit: tenant-scoped callback routing — UT-11 consumer DTO отклоняет malformed tenant.
- [x] Unit: tenant-scoped callback routing — UT-12 оба AsyncAPI совпадают по callback schema.
- [x] Unit: tenant-scoped callback routing — UT-13 handler передаёт `equestrian_ids=[tenant]` в service users.
- [x] Unit: tenant-scoped callback routing — UT-14 handler одновременно передаёт ADMIN и SUPERUSER.
- [x] Unit: tenant-scoped callback routing — UT-15 enabled ADMIN tenant A выбран.
- [x] Unit: tenant-scoped callback routing — UT-16 enabled SUPERUSER tenant A выбран.
- [x] Unit: tenant-scoped callback routing — UT-17 eligible пользователь tenant B исключён.
- [x] Unit: tenant-scoped callback routing — UT-18 eligible, но disabled пользователь исключён.
- [x] Unit: tenant-scoped callback routing — UT-19 enabled пользователь без роли исключён.
- [x] Unit: tenant-scoped callback routing — UT-20 blocked/deleted users отсутствуют в scoped response.
- [x] Unit: tenant-scoped callback routing — UT-21 unapproved email исключён.
- [x] Unit: tenant-scoped callback routing — UT-22 email foreign user_id исключён.
- [x] Unit: tenant-scoped callback routing — UT-23 empty scoped users не вызывает email lookup.
- [x] Unit: tenant-scoped callback routing — UT-24 empty settings/users intersection не вызывает email lookup.
- [x] Unit: tenant-scoped callback routing — UT-25 backend timeout работает fail-closed.
- [x] Unit: tenant-scoped callback routing — UT-26 backend HTTP error не запускает unscoped fallback.
- [x] Unit: tenant-scoped callback routing — UT-27 email client error работает fail-closed.
- [x] Unit: tenant-scoped callback routing — UT-28 unsupported channel не выполняет lookups.
- [x] Unit: tenant-scoped callback routing — UT-29 tenant/callback UUID отсутствуют в subject/body.
- [x] Unit: tenant-scoped callback routing — UT-30 redelivery сохраняет tenant filter и idempotency boundary.

- [x] Smoke: tenant-scoped callback routing — SM-01 public POST tenant A сохраняет tenant A в реальной PostgreSQL.
- [x] Smoke: tenant-scoped callback routing — SM-02 tenant B callback сохраняется отдельно в реальной PostgreSQL.
- [x] Smoke: tenant-scoped callback routing — SM-03 public POST без cookie возвращает `201` по контракту.
- [x] Smoke: tenant-scoped callback routing — SM-04 missing tenant selector возвращает `401` без event.
- [x] Smoke: tenant-scoped callback routing — SM-05 invalid selector возвращает `401` без event.
- [x] Smoke: tenant-scoped callback routing — SM-06 service users без key возвращает `401`.
- [x] Smoke: tenant-scoped callback routing — SM-07 service users с invalid key возвращает `401`.
- [x] Smoke: tenant-scoped callback routing — SM-08 service users cookie-only возвращает `401`.
- [x] Smoke: tenant-scoped callback routing — SM-09 service users selector-only возвращает `401`.
- [x] Smoke: tenant-scoped callback routing — SM-10 valid key+tenant A+roles возвращает только A admins.
- [x] Smoke: tenant-scoped callback routing — SM-11 valid key+tenant B+roles возвращает только B admins.
- [x] Smoke: tenant-scoped callback routing — SM-12 tenant без eligible roles возвращает empty без fallback.
- [x] Smoke: tenant-scoped callback routing — SM-13 tenant A ADMIN присутствует в scoped response.
- [x] Smoke: tenant-scoped callback routing — SM-14 tenant A SUPERUSER присутствует в scoped response.
- [x] Smoke: tenant-scoped callback routing — SM-15 tenant A user другой роли отсутствует.
- [x] Smoke: tenant-scoped callback routing — SM-16 blocked ADMIN отсутствует.
- [x] Smoke: tenant-scoped callback routing — SM-17 soft-deleted ADMIN отсутствует.
- [x] Smoke: tenant-scoped callback routing — SM-18 tenant+roles применяются AND/OR по контракту.
- [x] Smoke: tenant-scoped callback routing — SM-19 pagination items/total не включают tenant B.
- [x] Smoke: tenant-scoped callback routing — SM-20 live NATS event tenant A содержит UUID A.
- [x] Smoke: tenant-scoped callback routing — SM-21 live NATS event tenant B содержит UUID B.
- [x] Smoke: tenant-scoped callback routing — SM-22 event без tenant не создаёт email command и наблюдаем в retry/DLQ.
- [x] Smoke: tenant-scoped callback routing — SM-23 malformed tenant не создаёт email command.
- [x] Smoke: tenant-scoped callback routing — SM-24 enabled confirmed ADMIN tenant A получает scoped command.
- [x] Smoke: tenant-scoped callback routing — SM-25 ADMIN tenant B не указан в command события A.
- [x] Smoke: tenant-scoped callback routing — SM-26 disabled ADMIN tenant A не получает command.
- [x] Smoke: tenant-scoped callback routing — SM-27 unapproved email tenant A не включён.
- [x] Smoke: tenant-scoped callback routing — SM-28 no recipients оставляет delivery flag false.
- [x] Smoke: tenant-scoped callback routing — SM-29 successful scoped command ставит delivery flag true.
- [x] Smoke: tenant-scoped callback routing — SM-30 NATS redelivery не добавляет cross-tenant адреса и сохраняет idempotency.

### Frontend

- [x] 1.16 Подтвердить отсутствующий frontend/site behavior diff и отсутствие изменений `services/frontend`, `services/site-ad`.

### Quality Gate

- [x] 1.17 Выполнить один общий review diff Backend Core и Notification Service на tenant isolation, Clean Architecture, отсутствие PII/UUID в письме и отсутствие unscoped fallback.
- [x] 1.18 Проверить Access matrix и anonymous/authenticated service scenarios: no/invalid key `401`, valid service key `200`, cookie/selector не заменяют key.
- [x] 1.19 Проверить, что новых/изменённых HTTP endpoint нет и `GET /api/service/users` не стал Public Read.
- [x] 1.20 Проверить обе AsyncAPI schema и DTO на обязательный одинаковый `equestrian_id` UUID; запустить применимый AsyncAPI validation.
- [x] 1.21 Проверить наличие и качество минимум 30 разных Unit checklist-сценариев для backend-фичи, включая tenant, access, error и idempotency paths.
- [x] 1.22 Проверить наличие и качество минимум 30 разных Smoke checklist-сценариев на живом API/NATS и реальной PostgreSQL.
- [x] 1.23 Проверить повторный `docker inspect` и отсутствие hardcoded DB discovery в smoke execution.
- [x] 1.24 Запустить unit/contract test, lint и typecheck команды из Makefile/pyproject обоих сервисов; сохранить команды и результаты в `docs/reports/058_notifications_bug_quality_gate.md`.
- [x] 1.25 Выполнить SM-01..SM-30 только через skill `smoke`, не создавать `tests/smoke` или pytest smoke scripts; сохранить request/status/evidence без секретов.
- [x] 1.26 Проверить NATS redelivery/retry/DLQ и отсутствие email command/`notifications_delivered=true` для malformed или recipient-less events.
- [x] 1.27 Вернуть findings владельцам файлов, дождаться исправлений и повторить единый Quality Gate до отсутствия блокирующих findings.
- [x] 1.28 После успешного gate синхронизировать delta specs в main specs и повторить `openspec validate fix-callback-notification-tenant-recipients --type change --strict`.
- [x] 1.29 Только после успешных sync/validation и пользовательского подтверждения финализации архивировать change.
