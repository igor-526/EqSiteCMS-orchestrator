# Quality Gate: 061 VK notifications

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-28  
**OpenSpec:** `openspec/changes/vk-callback-notifications-061` (apply и smoke-harness amendment подтверждены пользователем)

## Итоговый вердикт

Все применимые Quality Gate lanes завершены без блокирующих findings. Реализация соответствует утверждённым proposal/design/specs, access matrix не изменена, а SM-01..SM-40 фактически пройдены. Предыдущий finding по destructive teardown исправлен и закрыт regression-проверкой; findings по безопасной failure injection закрыты изолированными one-shot harness без изменения production DI/lifespan и без реальных VK-отправок synthetic recipients.

`QG-FE` неприменим: runtime/behavior diff в `services/frontend` и `services/site-*` отсутствует. Ранее выполненная targeted UI regression для существующих email/VK notification settings: `6 passed`.

## Lane synthesis

| Lane | Статус | Evidence |
|---|---|---|
| `QG-BE-R3` | passed | Clean Architecture, typed boundaries, fail-fast harness guards, deterministic adapters и cleanup подтверждены; focused suite `39 passed`, architecture/cleanup checks зелёные |
| `QG-CONTRACTS-R3` | passed | HTTP/AsyncAPI/deploy/Helm/CI diff отсутствует; producer/consumer contract, isolated run-scoped topology, strict OpenSpec и AsyncAPI validation зелёные |
| `QG-FE` | неприменимо | frontend/site behavior diff отсутствует; targeted UI regression `6 passed` |
| `QG-LIVE-H1` | passed | pending live/synthetic scenarios `22/22`; вместе с ранее пройденными сценариями SM-01..SM-40 закрыты |
| `QG-SYNTH-R1` | passed | checkbox/evidence consistency проверена; blockers отсутствуют; verdict `APPROVED` |

## Findings

Открытых findings нет.

Закрытые findings:

1. Destructive fixture teardown заменён транзакцией/savepoint и точечным cleanup; unrelated ACTIVE binding сохраняется после rollback.
2. VK provider failure/partial failure проверяются отдельным guarded harness со `ScriptedVkMessenger`; production VK API для synthetic recipients не вызывается.
3. Notification publish failure проверяется отдельным guarded harness со scripted publishers; общий NATS и production runtime не переключаются.
4. Ранее отсутствовавшие live evidence SM-11..24, SM-26, SM-28..32, SM-34 и SM-35 получены в изолированном прогоне.

## Проверки кода и контрактов

- Root `make test`: backend `1300 passed, 5 skipped`; Notification `89 passed, 2 deselected`; Email `80 passed, 4 deselected`; frontend `591 passed`.
- Harness suites после amendment: VK `263 passed`; Notification `107 passed`; focused architecture/cleanup regression `39 passed`.
- Root/service lint, format-check, mypy/basedpyright: успешно, 0 errors.
- VK migration `upgrade head → downgrade -1 → upgrade head`: успешно.
- Real Notification NATS integration и VK PostgreSQL/NATS/Redis/Celery integration: успешно.
- `make asyncapi-validate` и VK contract validation: успешно; producer/consumer subject, DTO и headers совпадают.
- Strict OpenSpec validation: успешно.
- В implementation/report не сохранены token, peer ID, phone, payload или иные PII/secrets.

## Architecture / isolation

- Notification Service остаётся владельцем tenant, role и channel-preference eligibility; в VK command не передаётся `vk_peer_id`.
- Email/VK используют отдельные typed DTO/Protocol/publisher boundaries; unknown/SMS channel остаётся fail-closed.
- VK Service выбирает только ACTIVE/non-deleted binding и ведёт per-recipient ledger с unique `(event_uuid, user_id)`; SENT не отправляется повторно, FAILED допускает redelivery, concurrent claim сериализован.
- Notification Service владеет stream; VK Service — только своим durable consumer с explicit ACK/NAK и bounded max-deliver.
- Harness composition roots не подключены к production container/lifespan, используют отдельные run-scoped stream/subject/durable и fail-fast guards.

## Access verification

HTTP endpoint diff отсутствует. Anonymous/authenticated/service-key outcomes пяти существующих boundaries подтверждены; ни один Protected Write/Service endpoint не открыт, public callback POST exception не изменён.

| Boundary | Проверенный outcome |
|---|---|
| `POST /api/callback_requests` | valid selector `201`; missing/invalid selector `401` без row/event |
| `GET /api/notification-settings` | anonymous `401`; authenticated actor `200` |
| `PATCH /api/notification-settings/{event}/{channel}` | anonymous `401`; authenticated owner `200` |
| `GET /api/service/users` | missing/invalid key `401`; cookie/selector не заменяют key; valid service key `200` с tenant/role scope |
| `PATCH /api/service/callback_requests/{id}/notifications-delivered` | missing/invalid key `401`; valid service key `200`, повтор идемпотентен |

## SMOKE evidence

Smoke выполнен по skill `smoke`, без `tests/smoke/**`. Все `SM-01..SM-40` passed.

| Группа | Сценарии | Результат | Sanitized timing/evidence |
|---|---|---|---|
| Public/access | SM-01..10 | `10/10 passed` | HTTP `1.6–52.5 ms`; public selector, anonymous/authenticated/service-key outcomes подтверждены |
| Eligibility/preferences/contracts | SM-11..19 | `9/9 passed` | Notification harness `1494–1931 ms`; tenant, roles, channel preferences, unique recipients и AsyncAPI подтверждены |
| Binding states/message | SM-20..26 | `7/7 passed` | VK harness `31.596–33.217 s`; malformed/unknown/PENDING/BLOCKED/deleted не отправляются; SM-25 подтверждён пользователем; message без UUID |
| Delivery/idempotency/failures | SM-27..35 | `9/9 passed` | SENT/FAILED, retry, partial failure, concurrent duplicate, PubAck semantics и no-recipient/publish-failure outcomes подтверждены |
| Service access/topology/cleanup | SM-36..40 | `5/5 passed` | HTTP `1.6–57.3 ms`; restart/topology стабильны; restore `37.7 ms`, verify `32.4 ms` |

SM-25: пользователь подтвердил получение реального VK-сообщения; identifiers, peer/token/phone и текст сообщения в evidence не записаны.

Cleanup выполнялся в `finally`. После исправления первоначального UUID join точечный cleanup повторён по сохранённому run prefix: core fixture rows `0`, VK fixture/ledger rows `0`, run-scoped streams/consumers `0`; unrelated DB rows и NATS resources сохранены.

## Scope / forbidden diffs

- Runtime implementation ограничена `services/notification-service/**` и `services/vk-service/**`; root orchestration diff — только согласованные `Makefile`/`SERVICES.md` изменения.
- Изменений Email Service, frontend, `site-*`, deploy, Helm и CI в deliverable нет.
- Runtime bot state не является deliverable/evidence.
- Следующие шаги не входят в этот unit: task 1.36 (sync трёх delta specs и повторная strict validation) и task 1.37 (archive только после явного подтверждения финализации).
