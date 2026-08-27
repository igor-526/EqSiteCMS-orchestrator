# Review: 058_notifications_bug

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-26  
**OpenSpec:** `fix-callback-notification-tenant-recipients`  
**Approval:** пользователь подтвердил apply сообщением `Apply`.

## Итог

Объединённый diff Backend Core и Notification Service соответствует proposal, design и delta specs. Callback event переносит обязательный tenant UUID, recipient lookup всегда одновременно ограничен tenant и ролями `ADMIN`/`SUPERUSER`, unscoped fallback отсутствует. Пересечение eligible users, enabled settings и approved/non-deleted emails работает fail-closed. Tenant UUID и callback UUID не попадают в subject/body письма. Новых или изменённых HTTP endpoints, миграций и frontend/site behavior diff нет.

Проверены context files из `openspec instructions apply --change fix-callback-notification-tenant-recipients --json`, `agents/backend.md`, `agents/quality_gate.md`, `agents/howto/nats-jetstream-protocols.md` и skill `.codex/skills/api-smoke-test/SKILL.md`.

Затронуты только:

- Backend: callback event DTO/service, AsyncAPI и unit/contract tests.
- Notification Service: consumer DTO/boundary, callback handler, backend-client protocol, AsyncAPI и unit/contract tests.
- OpenSpec change и этот evidence report.

Рекомендуемая ветка: текущая change/feature branch после spec sync; archive выполняется отдельно только после пользовательского подтверждения.

## Review

- Clean Architecture: бизнес-логика остаётся в service/handler; API, repositories и DB schema не менялись.
- Tenant isolation: `get_users(equestrian_ids=[tenant], role=[ADMIN, SUPERUSER])`; AND между tenant/roles, OR внутри roles подтверждены unit и live API.
- Fail-closed: missing/malformed tenant, lookup error, empty users/settings/emails и unsupported channel не создают command.
- Messaging: producer/consumer DTO и обе AsyncAPI имеют одинаковый required `equestrian_id` (`string`, `uuid`) и `additionalProperties: false`.
- NATS: subject `events.site.callback.requested`, durable `notification-service-callback-requested`, explicit ack/nak, `max_deliver=5`; malformed events дали redelivery и ноль commands.
- Delivery semantics: no-recipient оставляет `notifications_delivered=false`; успешная публикация ставит `true`; повторная доставка дедуплицируется по callback UUID.
- PII/UUID: retained command содержал только разрешённые адреса; tenant/callback UUID отсутствовали в subject/body.
- Frontend/site gate: `services/frontend` и `services/site-ad` — clean status, behavior diff отсутствует; frontend mandatory behavior commands неприменимы.
- Makefile contract: root `test`, `lint`, `format` содержат четыре явных вызова backend → notification → email → frontend. Root mutating `make format` не запускался на dirty multi-repo worktree; эквивалентные `ruff format --check` обоих затронутых сервисов подтвердили отсутствие format diff.

Blocking findings: отсутствуют.

## Проверки

| Команда | Результат |
|---|---|
| Backend targeted changed tests | `36 passed` |
| Backend `pytest tests/unit/core tests/unit/messaging -q` | `843 passed, 5 skipped` |
| Notification targeted changed tests | `35 passed` |
| Notification clients/containers/messaging/services | `40 passed` |
| Backend mypy / ruff / format check / flake8 | PASS; mypy 270 files, ruff clean, 270 formatted, flake8 0 |
| Notification mypy / basedpyright / ruff / format check | PASS; mypy 97 files, basedpyright 0 errors, ruff clean, 99 formatted |
| Notification flake8 | PASS с `--jobs 1`; multiprocessing sandbox limitation обойдена без изменения правил |
| AsyncAPI CLI 6.0.2: обе specs | PASS |
| `openspec validate ... --type change --strict` | PASS |

Полные `make test` targets воспроизводимо зависают в существующих API test-модулях без прогресса; bounded run остановлен. Это не затрагивает профильные unit/contract наборы выше, которые полностью зелёные. Первоначальная параллельная попытка `uv` также упёрлась в read-only shared cache; повтор выполнен с отдельными `UV_CACHE_DIR` в `/tmp`.

## PostgreSQL discovery

Перед smoke выполнен повторный discovery по Docker labels. Точный filter `project=eqsitecms,service=db` не совпал, fallback нашёл `eqsitecms-db`; `docker inspect` подтвердил фактические labels `project=eqsitecms-core,service=db`, image `postgres:16`, host port `5433`, aliases `eqsitecms-db`/`db`. Credentials брались только из container env и не сохранены в отчёте. Hardcoded DB connection не использовался.

## Access verification results

| Endpoint | Режим | Ожидание | Факт |
|---|---|---|---|
| `POST /api/callback_requests` | anonymous + valid tenant selector | public exception, `201` | `201` |
| тот же POST | missing selector | `401`, no row/event | `401`, no row |
| тот же POST | invalid selector | `401`, no row/event | `401`, no row |
| `GET /api/service/users/` | no key | `401` | `401` |
| тот же GET | invalid key | `401` | `401` |
| тот же GET | cookie-only | `401` | `401` |
| тот же GET | selector-only | `401` | `401` |
| тот же GET | valid `X-Service-Key` | `200` | `200` |

`GET /api/service/users/` остаётся Service Read exception и не стал Public Read. Реальный route со slash проверен напрямую; вариант без slash возвращает штатный `307` canonical redirect.

## SMOKE-тесты

Выполнены через skill `smoke` на live API (`localhost:8001`), реальных PostgreSQL и NATS JetStream. Cookie login и `/api/auth/me`: `200` за 26.092 ms и 27.040 ms. Временные fixtures имели префикс `QG058`/UUID `05800000-*`; cleanup подтвердил по нулю остаточных callback/settings/email/scope rows. Retained NATS evidence остаётся частью broker history.

| # | Проверка | HTTP / broker time | Результат |
|---|---|---:|---|
| SM-01 | tenant A POST → DB tenant A | 201 / 56.282 ms | PASS |
| SM-02 | tenant B POST → отдельный DB tenant B | 201 / 27.838 ms | PASS |
| SM-03 | public POST без cookie | 201 / 56.282 ms | PASS |
| SM-04 | missing selector, no row/event | 401 / 1.601 ms | PASS |
| SM-05 | invalid selector, no row/event | 401 / 22.721 ms | PASS |
| SM-06 | service users no key | 401 / 2.041 ms | PASS |
| SM-07 | invalid key | 401 / 1.838 ms | PASS |
| SM-08 | cookie-only | 401 / 1.978 ms | PASS |
| SM-09 | selector-only | 401 / 1.382 ms | PASS |
| SM-10 | valid key + tenant A + roles | 200 / 29.408 ms | PASS, exactly A ADMIN+SUPERUSER |
| SM-11 | valid key + tenant B + roles | 200 / 19.431 ms | PASS, empty/no cross-tenant |
| SM-12 | tenant without eligible roles | 200 / 19.254 ms | PASS, empty |
| SM-13 | A ADMIN included | 200 / 29.408 ms | PASS |
| SM-14 | A SUPERUSER included | 200 / 29.408 ms | PASS |
| SM-15 | A other role excluded | 200 / 29.408 ms | PASS |
| SM-16 | temporarily blocked ADMIN excluded | 200 / 22.362 ms | PASS |
| SM-17 | soft-deleted user with temporary ADMIN scope excluded | 200 / 22.362 ms | PASS |
| SM-18 | tenant AND roles / roles OR | 200 / 40.457 ms | PASS |
| SM-19 | `limit=1&offset=0`, scoped total=2 | 200 / 40.457 ms | PASS |
| SM-20 | retained tenant A event carries exact A UUID | broker read <1 s | PASS |
| SM-21 | retained tenant B event carries exact B UUID | broker read <1 s | PASS |
| SM-22 | missing tenant event | 3 s observation | PASS, command delta 0, redelivery |
| SM-23 | malformed tenant event | 3 s observation | PASS, command delta 0, redelivery |
| SM-24 | enabled+approved A ADMIN/SUPERUSER | 201 / 26.989 ms | PASS, two scoped recipients |
| SM-25 | tenant B address absent from A command | broker read <1 s | PASS |
| SM-26 | disabled A ADMIN | 201 / 31.411 ms | PASS, only enabled SUPERUSER |
| SM-27 | temporarily unapproved remaining email | 201 / 25.820 ms | PASS, command delta 0 |
| SM-28 | no recipients | 201 / 25.820 ms | PASS, delivery false |
| SM-29 | successful scoped command | 201 / 26.989 ms | PASS, delivery true |
| SM-30 | same valid event redelivered | 201 / 34.815 ms + 2 s | PASS, command seq `44→45→45`, no duplicate/cross-tenant |

Итого: **30/30 smoke scenarios PASS**.

При первом broker прогоне notification container держал старый Python module в памяти, хотя mounted source уже был новым. Это было доказано расхождением process behavior и direct DTO validation. После restart только `eqsitecms-notification-service`, ожидания healthy и полного повтора актуальный consumer дал command delta 0 для invalid events; pre-restart данные не использованы как release evidence.

## Финализация

Quality Gate успешен. Следующий Router-шаг: sync delta specs в main specs (task 1.28), повторная strict validation; archive task 1.29 только после отдельного пользовательского подтверждения.
