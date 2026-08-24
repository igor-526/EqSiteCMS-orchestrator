# 053 — устранение backend/email-service регрессий

## Контекст исполнения

`contextFiles`: `docs/tasks/053_bugs.md`, `docs/bugs/053_main_backend.json`, `docs/bugs/053_email_service.json`, `SERVICES.md`, `agents/backend.md`, `agents/howto/nats-jetstream-protocols.md`, `services/backend/docs/asyncapi.yaml`, `services/email-service/docs/asyncapi.yaml`, `openspec/changes/fix-053-backend-email-bugs/{proposal.md,design.md,specs/**/*.md}`.

Approval status: **NOT APPROVED**. До явного пользовательского approval ни один checkbox реализации не выполняется.

## Чеклист

### Backend

- [x] BE-H01 Backend owner: прочитать все `contextFiles`, подтвердить ownership только `services/backend/src/core/{services,protocols}`, `services/backend/src/repositories` и backend tests; не менять email-service.
- [x] BE-H02 Зафиксировать фактический max length/normalization horse slug по entity/model и переиспользовать один доменный механизм без параллельной slugify-логики.
- [x] BE-H03 Добавить/переиспользовать узкий tenant-scoped repository protocol для проверки candidate slug без импорта concrete repository в service.
- [x] BE-H04 Реализовать в horse service выбор минимального свободного `base[-N]` с обрезкой базы под полный суффикс.
- [x] BE-H05 Обработать race только для `ix_horse_equestrian_slug` через безопасную transaction/savepoint границу: ограниченный retry либо согласованный `ClientError` 400; другие IntegrityError не маскировать.
- [x] BE-H06 Проверить Access matrix `POST /api/horses`: anonymous `401`, invalid selector `401`, allowed scopes success, missing scope `403`, foreign tenant не изменяется; публичные GET не защищать.
- [x] BE-H07 Не создавать миграцию и не менять DTO/path/status успешного create; при выявленной необходимости остановиться и вернуть Router contract blocker.
- [x] BE-H08 После реализации выполнить в `services/backend`: `make format`, `make test`, `make lint`, затем отметить только фактически выполненные BE-H/Unit-H задачи.

- [x] Unit-H01 horse slug — первое уникальное имя сохраняет базовый slug без суффикса.
- [x] Unit-H02 horse slug — вторая коллизия получает `-1`.
- [x] Unit-H03 horse slug — занятые base/`-1`/`-2` приводят к `-3`.
- [x] Unit-H04 horse slug — gap в suffix sequence выбирает минимальный свободный номер.
- [x] Unit-H05 horse slug — кириллица нормализуется существующим entity-механизмом.
- [x] Unit-H06 horse slug — регистр/пробелы, дающие один base, считаются коллизией.
- [x] Unit-H07 horse slug — спецсимволы проходят существующую нормализацию без нового алгоритма.
- [x] Unit-H08 horse slug — одинаковый base в другом tenant не занят.
- [x] Unit-H09 horse slug — repository lookup всегда получает текущий `equestrian_id`.
- [x] Unit-H10 horse slug — max-length base без коллизии не обрезается лишний раз.
- [x] Unit-H11 horse slug — max-length base с `-1` обрезается до допустимой длины.
- [x] Unit-H12 horse slug — многозначный suffix учитывается при обрезке.
- [x] Unit-H13 horse slug — итоговый suffix не обрезается.
- [x] Unit-H14 horse slug — empty/degenerate normalized base обрабатывается по текущему domain contract как client error или валидный fallback.
- [x] Unit-H15 horse slug — allowed `SUPERUSER` проходит permission gate.
- [x] Unit-H16 horse slug — allowed `ADMIN` проходит permission gate.
- [x] Unit-H17 horse slug — allowed `DEVELOPER` проходит permission gate.
- [x] Unit-H18 horse slug — user без allowed scope получает `ForbiddenError` до repository create.
- [x] Unit-H19 horse slug — anonymous user получает auth/client error до repository create.
- [x] Unit-H20 horse slug — invalid breed прекращает операцию без slug insert.
- [x] Unit-H21 horse slug — invalid coat color прекращает операцию без slug insert.
- [x] Unit-H22 horse slug — invalid owner прекращает операцию без slug insert.
- [x] Unit-H23 horse slug — entity ValidationError мапится в ClientError без repository create.
- [x] Unit-H24 horse slug — успешный create возвращает suffixed slug в HorseOutDto.
- [x] Unit-H25 horse slug — конкретный `ix_horse_equestrian_slug` race не даёт необработанный IntegrityError.
- [x] Unit-H26 horse slug — race retry ограничен и не образует бесконечный цикл.
- [x] Unit-H27 horse slug — после race transaction корректно rollback/retry либо возвращает 400.
- [x] Unit-H28 horse slug — другой unique constraint не мапится в slug conflict.
- [x] Unit-H29 horse slug — generic DB error пробрасывается и сохраняет диагностику.
- [x] Unit-H30 horse slug — два последовательных вызова не мутируют входной `HorseCreateInDto` и дают разные slug.

- [x] Smoke-H01 real PostgreSQL — через smoke skill создать первую лошадь и проверить base slug/HTTP 200.
- [x] Smoke-H02 real PostgreSQL — повторить то же имя в tenant и проверить `-1`/не 500.
- [x] Smoke-H03 real PostgreSQL — третья коллизия получает `-2`.
- [x] Smoke-H04 real PostgreSQL — подготовить gap suffix и проверить минимальный свободный candidate.
- [x] Smoke-H05 real PostgreSQL — кириллическое имя создаёт ожидаемый transliterated base.
- [x] Smoke-H06 real PostgreSQL — нормализационно эквивалентные пробелы/регистр не дают 500.
- [x] Smoke-H07 real PostgreSQL — max-length base без коллизии сохраняется в лимите.
- [x] Smoke-H08 real PostgreSQL — max-length base с коллизией получает полный `-1` в лимите.
- [x] Smoke-H09 real PostgreSQL — suffix >=10 остаётся полным и slug укладывается в лимит.
- [x] Smoke-H10 real PostgreSQL — одинаковое имя в tenant B получает base без утечки tenant A.
- [x] Smoke-H11 real PostgreSQL — list tenant A показывает обе suffixed записи.
- [x] Smoke-H12 real PostgreSQL — detail lookup по base возвращает первую запись.
- [x] Smoke-H13 real PostgreSQL — detail lookup по suffixed slug возвращает вторую запись.
- [x] Smoke-H14 real PostgreSQL — public GET с valid selector остаётся `200`.
- [x] Smoke-H15 real PostgreSQL — public GET без selector возвращает `401`.
- [x] Smoke-H16 real PostgreSQL — public GET с invalid selector возвращает `401`.
- [x] Smoke-H17 real PostgreSQL — anonymous POST возвращает `401` и count не меняется.
- [x] Smoke-H18 real PostgreSQL — authenticated без allowed scope возвращает `403` и count не меняется.
- [x] Smoke-H19 real PostgreSQL — `SUPERUSER` duplicate create успешен.
- [x] Smoke-H20 real PostgreSQL — `ADMIN` duplicate create успешен.
- [x] Smoke-H21 real PostgreSQL — `DEVELOPER` duplicate create успешен.
- [x] Smoke-H22 real PostgreSQL — foreign/invalid tenant selector не создаёт запись и возвращает `401`.
- [x] Smoke-H23 real PostgreSQL — invalid breed возвращает контрактный `400` без orphan horse.
- [x] Smoke-H24 real PostgreSQL — invalid coat color возвращает `400` без orphan horse.
- [x] Smoke-H25 real PostgreSQL — invalid owner возвращает `400` без orphan horse.
- [x] Smoke-H26 real PostgreSQL — structural invalid body возвращает `422`, не `500`.
- [x] Smoke-H27 real PostgreSQL — business-invalid field возвращает `400`, не `500`.
- [x] Smoke-H28 real PostgreSQL — параллельные create одного имени дают уникальные результаты либо один согласованный `400`, никогда `500`.
- [x] Smoke-H29 real PostgreSQL — после конкурентного конфликта следующий валидный create работает, подтверждая здоровую transaction/session.
- [x] Smoke-H30 real PostgreSQL — cleanup созданных fixtures tenant-scoped и проверка отсутствия изменений чужого tenant.

- [x] BE-E01 Email owner: прочитать все `contextFiles`, подтвердить ownership только `services/email-service/src/clients/nats/consumers` и email tests; не менять backend.
- [x] BE-E02 Сверить фактические timeout types установленной `nats-py` и ограничить их перехват непосредственной операцией `fetch()`.
- [x] BE-E03 Реализовать idle branch без error/warning log, Sentry exception event, sleep, ack/nak и handler call.
- [x] BE-E04 Сохранить отдельные ветви `CancelledError` propagation, real broker error log+backoff и message handler ack/nak.
- [x] BE-E05 Сверить runtime stream/subject/durable/headers/payload с обоими AsyncAPI; не менять topology, а при drift/необходимости изменения остановиться и вернуть Router blocker.
- [x] BE-E06 После реализации выполнить в `services/email-service`: `make format`, `make test`, `make lint`, затем отметить только фактически выполненные BE-E/Unit-E задачи.

- [x] Unit-E01 email idle — `nats.errors.TimeoutError` продолжает fetch loop без error log.
- [x] Unit-E02 email idle — built-in/asyncio TimeoutError продолжает loop без error log, если distinct runtime type.
- [x] Unit-E03 email idle — timeout не вызывает warning log.
- [x] Unit-E04 email idle — timeout не вызывает `logger.exception`.
- [x] Unit-E05 email idle — timeout не вызывает handler.
- [x] Unit-E06 email idle — timeout не вызывает ack.
- [x] Unit-E07 email idle — timeout не вызывает nak.
- [x] Unit-E08 email idle — timeout не создаёт дополнительный sleep/backoff.
- [x] Unit-E09 email idle — после timeout выполняется следующий fetch.
- [x] Unit-E10 email idle — несколько последовательных timeout сохраняют running state.
- [x] Unit-E11 email idle — message после одного timeout передаётся handler.
- [x] Unit-E12 email idle — message после нескольких timeout успешно ack-ается.
- [x] Unit-E13 email idle — batch/timeout settings передаются fetch без изменений.
- [x] Unit-E14 email idle — `CancelledError` из fetch пробрасывается.
- [x] Unit-E15 email idle — stop во время fetch очищает task/subscription.
- [x] Unit-E16 email idle — повторный start при running consumer идемпотентен.
- [x] Unit-E17 email idle — stop до start безопасен.
- [x] Unit-E18 email idle — start использует канонические subject/stream/durable.
- [x] Unit-E19 email idle — connection error логируется как `Failed to fetch NATS messages`.
- [x] Unit-E20 email idle — protocol error логируется и вызывает backoff.
- [x] Unit-E21 email idle — generic non-timeout error не подавляется как idle.
- [x] Unit-E22 email idle — после broker error/backoff fetch повторяется.
- [x] Unit-E23 email idle — handler success вызывает ровно один ack.
- [x] Unit-E24 email idle — handler error вызывает ровно один nak.
- [x] Unit-E25 email idle — handler error логируется отдельно как process failure.
- [x] Unit-E26 email idle — ack error не классифицируется как fetch idle timeout.
- [x] Unit-E27 email idle — nak error не классифицируется как fetch idle timeout.
- [x] Unit-E28 email idle — message headers передаются handler без изменений.
- [x] Unit-E29 email idle — payload bytes передаются handler без изменений.
- [x] Unit-E30 email idle — timeout fix не меняет public adapter protocol/signature.

- [x] Smoke-E01 real NATS/PostgreSQL — повторно получить email DB параметры через inspect и подтвердить readiness.
- [x] Smoke-E02 real NATS/PostgreSQL — подтвердить readiness stream `NOTIFICATION_COMMANDS` и durable consumer.
- [x] Smoke-E03 real NATS/PostgreSQL — пустая очередь один fetch window не создаёт error event.
- [x] Smoke-E04 real NATS/PostgreSQL — пустая очередь три fetch windows не создаёт error events.
- [x] Smoke-E05 real NATS/PostgreSQL — idle windows не создают email_logs.
- [x] Smoke-E06 real NATS/PostgreSQL — consumer остаётся running после idle windows.
- [x] Smoke-E07 real NATS/PostgreSQL — валидная command после idle доставляется.
- [x] Smoke-E08 real NATS/PostgreSQL — валидная command после idle создаёт ровно один email_log.
- [x] Smoke-E09 real NATS/PostgreSQL — валидная command после idle ack-ается.
- [x] Smoke-E10 real NATS/PostgreSQL — вторая валидная command после нового idle window не теряется.
- [x] Smoke-E11 real NATS/PostgreSQL — batch меньше configured size возвращается/обрабатывается без ложного timeout error.
- [x] Smoke-E12 real NATS/PostgreSQL — batch configured size обрабатывается без потерь.
- [x] Smoke-E13 real NATS/PostgreSQL — distinct event UUID создают distinct email_logs.
- [x] Smoke-E14 real NATS/PostgreSQL — duplicate event identity не создаёт повторную пользовательскую отправку по существующему контракту.
- [x] Smoke-E15 real NATS/PostgreSQL — invalid JSON вызывает process error/nak, не idle classification.
- [x] Smoke-E16 real NATS/PostgreSQL — schema-invalid command вызывает process error/nak.
- [x] Smoke-E17 real NATS/PostgreSQL — transient handler failure даёт nak/redelivery.
- [x] Smoke-E18 real NATS/PostgreSQL — redelivery затем success приводит к ack.
- [x] Smoke-E19 real NATS/PostgreSQL — poison message достигает max-deliver согласно текущему contract.
- [x] Smoke-E20 real NATS/PostgreSQL — idle после poison message остаётся тихим.
- [x] Smoke-E21 real NATS/PostgreSQL — restart consumer после idle сохраняет durable binding.
- [x] Smoke-E22 real NATS/PostgreSQL — graceful stop во время long fetch не логирует fetch failure.
- [x] Smoke-E23 real NATS/PostgreSQL — start после graceful stop снова принимает command.
- [x] Smoke-E24 real NATS/PostgreSQL — временная потеря broker connection логируется как реальная ошибка.
- [x] Smoke-E25 real NATS/PostgreSQL — восстановление broker connection возобновляет fetch/delivery.
- [x] Smoke-E26 real NATS/PostgreSQL — real broker error не смешивается со счётчиком idle timeout telemetry.
- [x] Smoke-E27 real NATS/PostgreSQL — subject остаётся `commands.notification.email.send`.
- [x] Smoke-E28 real NATS/PostgreSQL — stream остаётся `NOTIFICATION_COMMANDS`, durable не меняется.
- [x] Smoke-E29 real NATS/PostgreSQL — headers/payload проходят end-to-end без contract drift.
- [x] Smoke-E30 real NATS/PostgreSQL — cleanup test messages/log fixtures и финальная проверка отсутствия новых idle error events.

### Frontend

- [x] FE-01 Подтвердить по diff отсутствие изменений `services/frontend` и `services/site-*`; frontend test matrix/manual QA неприменимы, так как UI behavior diff отсутствует.

### Quality Gate

- [x] QG-01 После завершения обоих owners провести один общий path/ownership review; не принимать пересекающиеся или вне-scope изменения.
- [x] QG-02 Проверить Access matrix anonymous/authenticated/scopes/tenant для `POST /api/horses` и отсутствие регрессии Public Read GET.
- [x] QG-03 Проверить наличие и качество минимум 30 различных Unit-H и 30 Smoke-H, их трассировку к slug/access/race требованиям; не засчитывать дублирующие happy paths.
- [x] QG-04 Проверить наличие и качество минимум 30 различных Unit-E и 30 Smoke-E, их трассировку к timeout/cancellation/error/ack-nak требованиям; не засчитывать mocked broker как smoke.
- [x] QG-05 Повторить Docker discovery сначала обязательными labels, затем fallback; получить main/email PostgreSQL env/ports только через `docker inspect` и приложить evidence без hardcode.
- [x] QG-06 Запустить `make format`, `make test`, `make lint` в `services/backend` и сохранить точные результаты.
- [x] QG-07 Запустить `make format`, `make test`, `make lint` в `services/email-service` и сохранить точные результаты.
- [x] QG-08 Запустить AsyncAPI validation и сверить backend/email runtime settings с stream/subject/durable/headers/payload; topology diff является blocker.
- [x] QG-09 Через smoke skill выполнить Smoke-H01..H30 на живом API и реальной PostgreSQL; не создавать `tests/smoke/*.py`.
- [x] QG-10 Через smoke skill выполнить Smoke-E01..E30 на живом NATS JetStream и реальной email PostgreSQL; отсутствие инфраструктуры/skip не считать PASS.
- [x] QG-11 Проверить telemetry/log evidence: idle timeout не создаёт error/warning/Sentry event, реальные broker/handler errors остаются видимыми.
- [x] QG-12 Сохранить единый отчёт evidence в `docs/reports/053_bugs_quality_gate.md`; findings вернуть владельцам, дождаться исправлений и повторить общий gate.
- [x] QG-13 После полного PASS синхронизировать обе delta specs в main specs через `openspec-sync-specs` и повторить `openspec validate fix-053-backend-email-bugs --type change --strict`.
- [x] QG-14 Только после sync/validation архивировать change через `openspec-archive-change`; до пользовательского approval apply/archive запрещены.
