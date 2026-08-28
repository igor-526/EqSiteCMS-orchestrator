## 1. Реализация и проверки

### Backend

- [x] 1.1 Notification owner: в `services/notification-service/src/core/schemas/messaging/**` добавить строгий VK command DTO (`occurred_at`, `event_uuid`, `callback_request_id`, unique non-empty `user_ids`, plain-text `text`) без сырого `dict` на publisher boundary.
- [x] 1.2 Notification owner: добавить отдельный VK publisher Protocol и NATS adapter для `commands.notification.vk.send` с `Nats-Msg-Id=callback_request_id`, не изменяя email protocol/payload.
- [x] 1.3 Notification owner: расширить callback handler tenant+role пересечением для `vk`, применяя только переданные `enabled_user_ids` канала и не запрашивая/не передавая `vk_peer_id`.
- [x] 1.4 Notification owner: сформировать безопасный plain-text callback message с fallback для optional name/comment и без callback/tenant/event/user UUID.
- [x] 1.5 Notification owner: изменить orchestrator на type-safe channel dispatch email/VK и подтверждать delivery flag ровно после PubAck хотя бы одной command, сохранив fail-closed для отсутствующих recipients.
- [x] 1.6 Notification owner: обновить DI/settings/exports только в `services/notification-service/**`, сохранив ownership stream `NOTIFICATION_COMMANDS` и wildcard subject.
- [x] 1.7 Notification owner: синхронно добавить VK publish channel/schema в `services/notification-service/docs/asyncapi.yaml`, не меняя callback/email contracts.
- [x] 1.8 Notification owner: добавить/обновить unit, contract и applicable integration tests в `services/notification-service/tests/**`; отметить задачи только после фактического прогона.
- [x] 1.9 VK owner: в `services/vk-service/src/core/schemas/messaging/**` добавить consumer DTO, идентичный Notification AsyncAPI/DTO contract.
- [x] 1.10 VK owner: добавить migration/model/repository для `vk_notification_deliveries` с unique `(event_uuid,user_id)`, peer snapshot, `PENDING/SENT/FAILED`, attempts, safe error и timestamps; не менять binding/confirmation semantics.
- [x] 1.11 VK owner: реализовать узкий delivery service через repository protocols и `VkMessengerProtocol`, выбирающий только ACTIVE/non-deleted bindings перечисленных users.
- [x] 1.12 VK owner: обеспечить partial-retry idempotency: SENT не повторяется, FAILED повторяется, concurrent duplicate не даёт второй успешный send.
- [x] 1.13 VK owner: реализовать durable pull consumer с explicit ACK/NAK, filter subject `commands.notification.vk.send`, настройками ack wait/max deliver/fetch и корректным start/stop.
- [x] 1.14 VK owner: активировать только собственный durable consumer в NATS setup/lifespan, не создавать stream `NOTIFICATION_COMMANDS` и не запускать consumer в bot runtime.
- [x] 1.15 VK owner: добавить `services/vk-service/docs/asyncapi.yaml` с зеркальным subscribe contract и обновить README только в части активированной VK delivery topology/операционных команд.
- [x] 1.16 VK owner: добавить migration/repository/service/consumer/contract tests только в `services/vk-service/tests/**`, включая database concurrency; отметить после фактических проверок.
- [x] 1.17 Orchestration owner после обоих сервисов: при необходимости включить новый VK AsyncAPI в отдельную root validation-команду, не расширяя core deploy/Helm scope и не меняя service-owned runtime files.
- [x] 1.18 Зафиксировать отсутствие HTTP endpoint diff и проверить access matrix: public callback POST exception, protected notification settings, protected service users/delivery endpoints.
- [x] 1.19 Перед smoke повторить discovery всех PostgreSQL containers и взять DB/user/password/host port через `docker inspect`, без хардкода snapshot из design.
- [x] 1.20 Не создавать `tests/smoke/**`, не менять `services/frontend`, `services/site-ad`, `services/email-service`, VK Helm/CI и не выполнять deploy.

- [x] Unit: VK callback delivery — UT-01 валидный VK DTO принимает UUID, recipients и text.
- [x] Unit: VK callback delivery — UT-02 DTO отклоняет missing event/callback identity.
- [x] Unit: VK callback delivery — UT-03 DTO отклоняет пустой `user_ids`.
- [x] Unit: VK callback delivery — UT-04 DTO обрабатывает duplicate `user_ids` по контракту.
- [x] Unit: VK callback delivery — UT-05 DTO отклоняет пустой/слишком длинный text.
- [x] Unit: VK callback delivery — UT-06 DTO запрещает extra properties.
- [x] Unit: VK callback delivery — UT-07 publisher использует VK subject.
- [x] Unit: VK callback delivery — UT-08 publisher ставит callback ID в `Nats-Msg-Id`.
- [x] Unit: VK callback delivery — UT-09 оба AsyncAPI совпадают по payload/headers.
- [x] Unit: VK callback delivery — UT-10 handler передаёт tenant и ADMIN/SUPERUSER.
- [x] Unit: VK callback delivery — UT-11 ADMIN нужной конюшни с VK enabled выбран.
- [x] Unit: VK callback delivery — UT-12 SUPERUSER нужной конюшни с VK enabled выбран.
- [x] Unit: VK callback delivery — UT-13 неадминистратор исключён.
- [x] Unit: VK callback delivery — UT-14 администратор другой конюшни исключён.
- [x] Unit: VK callback delivery — UT-15 VK disabled исключает только VK command.
- [x] Unit: VK callback delivery — UT-16 email disabled не исключает VK command.
- [x] Unit: VK callback delivery — UT-17 пустой VK recipient set не публикуется.
- [x] Unit: VK callback delivery — UT-18 users lookup error fail-closed.
- [x] Unit: VK callback delivery — UT-19 email/VK форматируются независимо.
- [x] Unit: VK callback delivery — UT-20 unknown/SMS channel не публикуется.
- [x] Unit: VK callback delivery — UT-21 только email PubAck ставит flag.
- [x] Unit: VK callback delivery — UT-22 только VK PubAck ставит flag.
- [x] Unit: VK callback delivery — UT-23 два PubAck дают один confirm call.
- [x] Unit: VK callback delivery — UT-24 без PubAck confirm отсутствует.
- [x] Unit: VK callback delivery — UT-25 consumer ACK после полного успеха.
- [x] Unit: VK callback delivery — UT-26 malformed command NAK без VK API.
- [x] Unit: VK callback delivery — UT-27 ACTIVE binding вызывает send.
- [x] Unit: VK callback delivery — UT-28 PENDING binding не вызывает send.
- [x] Unit: VK callback delivery — UT-29 BLOCKED binding не вызывает send.
- [x] Unit: VK callback delivery — UT-30 soft-deleted binding не вызывает send.
- [x] Unit: VK callback delivery — UT-31 чужой user binding исключён.
- [x] Unit: VK callback delivery — UT-32 несколько ACTIVE получают по одному send.
- [x] Unit: VK callback delivery — UT-33 success сохраняет SENT/attempt.
- [x] Unit: VK callback delivery — UT-34 send failure сохраняет FAILED и NAK.
- [x] Unit: VK callback delivery — UT-35 redelivery пропускает SENT.
- [x] Unit: VK callback delivery — UT-36 redelivery повторяет FAILED.
- [x] Unit: VK callback delivery — UT-37 unique ledger выдерживает concurrency.
- [x] Unit: VK callback delivery — UT-38 partial retry не дублирует success.
- [x] Unit: VK callback delivery — UT-39 consumer/lifespan start-stop идемпотентны.
- [x] Unit: VK callback delivery — UT-40 logs/ledger не содержат token/text/phone.

- [x] Smoke: VK callback delivery — SM-01 public callback valid selector создаёт row/event.
- [x] Smoke: VK callback delivery — SM-02 missing selector возвращает `401` без row/event.
- [x] Smoke: VK callback delivery — SM-03 invalid selector возвращает `401` без row/event.
- [x] Smoke: VK callback delivery — SM-04 anonymous notification settings GET возвращает `401`.
- [x] Smoke: VK callback delivery — SM-05 admin settings GET возвращает email/VK channels.
- [x] Smoke: VK callback delivery — SM-06 anonymous setting PATCH возвращает `401`.
- [x] Smoke: VK callback delivery — SM-07 admin VK setting PATCH сохраняется в PostgreSQL.
- [x] Smoke: VK callback delivery — SM-08 service users без key возвращает `401`.
- [x] Smoke: VK callback delivery — SM-09 cookie/selector не заменяют service key.
- [x] Smoke: VK callback delivery — SM-10 valid key tenant+roles даёт scoped admins.
- [x] Smoke: VK callback delivery — SM-11 неадминистратор не получает email/VK.
- [x] Smoke: VK callback delivery — SM-12 admin другой конюшни не получает email/VK.
- [x] Smoke: VK callback delivery — SM-13 email off/VK on публикует только VK.
- [x] Smoke: VK callback delivery — SM-14 email on/VK off публикует только email.
- [x] Smoke: VK callback delivery — SM-15 оба off не публикуют commands, flag false.
- [x] Smoke: VK callback delivery — SM-16 оба on публикуют обе commands.
- [x] Smoke: VK callback delivery — SM-17 SUPERUSER tenant A входит в VK recipients.
- [x] Smoke: VK callback delivery — SM-18 два admins дают два уникальных IDs.
- [x] Smoke: VK callback delivery — SM-19 live VK command проходит AsyncAPI validation.
- [x] Smoke: VK callback delivery — SM-20 malformed VK command retry без send.
- [x] Smoke: VK callback delivery — SM-21 unknown user ID не вызывает send.
- [x] Smoke: VK callback delivery — SM-22 PENDING binding не вызывает send.
- [x] Smoke: VK callback delivery — SM-23 BLOCKED binding не вызывает send.
- [x] Smoke: VK callback delivery — SM-24 soft-deleted binding не вызывает send.
- [x] Smoke: VK callback delivery — SM-25 ACTIVE admin получает реальное VK-сообщение с подтверждением пользователя.
- [x] Smoke: VK callback delivery — SM-26 message содержит поля заявки и не содержит UUID.
- [x] Smoke: VK callback delivery — SM-27 VK success создаёт SENT с одним attempt.
- [x] Smoke: VK callback delivery — SM-28 повторный event не создаёт второе сообщение.
- [x] Smoke: VK callback delivery — SM-29 concurrent duplicate даёт не более одного send.
- [x] Smoke: VK callback delivery — SM-30 VK API failure создаёт FAILED и redelivery.
- [x] Smoke: VK callback delivery — SM-31 partial failure повторяет только failed recipient.
- [x] Smoke: VK callback delivery — SM-32 email PubAck ставит flag без SMTP receipt.
- [x] Smoke: VK callback delivery — SM-33 VK PubAck ставит flag до VK receipt.
- [x] Smoke: VK callback delivery — SM-34 no eligible recipients оставляет flag false.
- [x] Smoke: VK callback delivery — SM-35 publish failures оставляют flag false.
- [x] Smoke: VK callback delivery — SM-36 delivery PATCH без/invalid key возвращает `401`.
- [x] Smoke: VK callback delivery — SM-37 delivery PATCH с valid key идемпотентно возвращает `200`.
- [x] Smoke: VK callback delivery — SM-38 restart consumer не дублирует SENT.
- [x] Smoke: VK callback delivery — SM-39 stream/durable имеют contract topology.
- [x] Smoke: VK callback delivery — SM-40 cleanup удаляет fixtures и восстанавливает admin settings.

### Frontend

- [x] 1.21 Подтвердить отсутствующий behavior diff и отсутствие изменений в `services/frontend` и `services/site-ad`; UI regression ограничить отображением существующих email/VK notification settings.

### Quality Gate

- [x] 1.22 Выполнить единый review diff Notification/VK/orchestration owners на tenant isolation, Clean Architecture, typed protocols, transaction/idempotency boundaries и отсутствие PII/secrets.
- [x] 1.23 Проверить access matrix и anonymous/authenticated/service-key outcomes всех пяти связанных endpoints; подтвердить отсутствие endpoint diff.
- [x] 1.24 Проверить, что не открыт ни один Protected Write/Service endpoint и не изменён public callback POST exception/missing-invalid selector `401`.
- [x] 1.25 Сравнить Notification publish и VK subscribe AsyncAPI, DTO и headers; проверить неизменность callback/email contracts и выполнить `make asyncapi-validate` плюс VK contract validation.
- [x] 1.26 Проверить качество и фактическое прохождение минимум 40 разных unit scenarios, включая roles, tenant, preferences, binding states, errors, concurrency и idempotency.
- [x] 1.27 Повторить docker discovery/inspect трёх PostgreSQL перед smoke и проверить отсутствие hardcoded connection values в smoke execution/evidence.
- [x] 1.28 Выполнить SM-01..SM-40 только через skill `smoke` на live API/NATS/PostgreSQL; не создавать pytest smoke scripts.
- [x] 1.29 Получить у пользователя подтверждение реального VK сообщения для SM-25, не записывая token/peer/phone в report; если пользователь недоступен, gate остаётся незавершённым, а не объявляется passed.
- [x] 1.30 Запустить из `services/notification-service` применимые `make test`, lint, format-check, mypy/basedpyright и integration NATS checks по Makefile/pyproject.
- [x] 1.31 Запустить из `services/vk-service` применимые `make test`, migration upgrade/downgrade/upgrade, lint, format-check, mypy/basedpyright и real NATS/PostgreSQL checks.
- [x] 1.32 Проверить partial failure/redelivery/max-deliver, concurrent duplicate и отсутствие повторного VK send для SENT ledger row.
- [x] 1.33 Проверить отсутствие изменений Email Service/frontend/site/deploy Helm/CI и отсутствие runtime secret/token в tracked diff/logs/report.
- [x] 1.34 Сохранить команды, результаты, sanitized NATS/DB/VK evidence и passed/failed таблицу в `docs/reports/061_vk_notifications_quality_gate.md`.
- [x] 1.35 Вернуть findings владельцам непересекающихся зон, дождаться исправлений и повторять один общий Quality Gate до отсутствия блокирующих findings.
- [x] 1.36 После успешного gate синхронизировать три delta specs в main specs и повторить `openspec validate vk-callback-notifications-061 --type change --strict`.
- [x] 1.37 Только после успешных sync/validation и явного пользовательского подтверждения финализации архивировать change.

## 2. QG REWORK amendment: isolated live smoke harness

### Backend execution units

- [x] 2.1 `VK-H1`: реализовать только в `services/vk-service/src/smoke_harness/**` отдельный guarded one-shot CLI composition root, run-scoped JetStream lifecycle и `ScriptedVkMessenger`; переиспользовать production consumer/handler/repositories, не менять штатный container/lifespan и не вызывать VK API.
- [x] 2.2 `VK-H1`: реализовать и прогнать `HT-VK-01..06` в `services/vk-service/tests/unit/smoke_harness/**`; выполнить одну targeted test group и сервисные lint/type checks; вернуть handoff.
- [x] 2.3 `NT-H1`: реализовать только в `services/notification-service/src/smoke_harness/**` отдельный guarded one-shot CLI composition root и scripted email/VK publishers; переиспользовать production handler/orchestrator/repositories, не менять штатный container/lifespan и не публиковать downstream commands.
- [x] 2.4 `NT-H1`: реализовать и прогнать `HT-NT-01..05` в `services/notification-service/tests/unit/smoke_harness/**`; выполнить одну targeted test group и сервисные lint/type checks; вернуть handoff.

### Quality Gate lanes

- [x] 2.5 `QG-BE-R1`: после `VK-H1` и `NT-H1` проверить Clean Architecture, fail-fast guards, отсутствие production DI/lifespan imports, deterministic adapters, cleanup и targeted/root backend gates.
- [x] 2.6 `QG-CONTRACTS-R1`: параллельно проверить отсутствие HTTP/AsyncAPI/deploy/Helm/CI diff, run-scoped topology и production subject/durable isolation; выполнить strict OpenSpec и применимые AsyncAPI validation.
- [x] 2.7 `SMOKE-H1`: через skill `smoke` создать только synthetic fixtures и выполнить pending `SM-11..24, SM-26, SM-28..32, SM-34, SM-35`; использовать VK harness для `SM-30/31`, Notification harness для `SM-35`, не повторять уже подтверждённую реальную отправку `SM-25`.
- [x] 2.8 `SMOKE-H1`: в `finally` удалить строго сохранённые fixture IDs и run-scoped NATS resources, подтвердить сохранность unrelated rows/resources и записать только sanitized counters/status/timings без payload/PII/secrets.
- [x] 2.9 `QG-SYNTH-R1`: свести lane handoffs в единственный обновлённый `docs/reports/061_vk_notifications_quality_gate.md` и поставить общий `APPROVED` либо `REWORK`; при findings создать узкий execution unit владельцу и повторить только затронутые lanes.
