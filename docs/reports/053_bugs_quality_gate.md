# Quality Gate: 053 backend/email regressions

**Статус:** ✅ APPROVED  
**Дата:** 2026-08-24  
**OpenSpec change:** `fix-053-backend-email-bugs` (пользовательский apply approval получен)

## Финальный полный прогон — 2026-08-24

QG053-01..04 устранены и подтверждены третьим полным прогоном. QG-01..QG-12,
FE-01, Smoke-H01..H30 и Smoke-E01..E30: **PASS**. QG-13/QG-14 не выполнялись.

### Финальные проверки

- backend `make format/test/lint`: 259 files unchanged; **1121 passed, 5 skipped**;
  mypy/ruff/flake8/format-check PASS; `git diff --check` PASS.
- email-service `make format/test/lint`: 81 files unchanged; **70 passed,
  4 infrastructure deselected**; mypy/basedpyright/ruff/flake8/format-check PASS.
- Targeted backend regression/access/repository set: **143 passed**.
- `make asyncapi-validate`: exit 0 для backend/notification/email, 0 errors;
  существующие governance warnings не связаны с diff.
- `openspec validate fix-053-backend-email-bugs --type change --strict`: PASS.
- Финальное idle окно 6 s: нет `ERROR`, `WARNING`, traceback или
  `Failed to fetch NATS messages`.
- Frontend/site diff отсутствует; FE behavior matrix неприменима.

### Smoke-H01..H30 — 30/30 PASS

| ID | ms | Evidence |
|---|---:|---|
| H01 | 52.84 | 200, base slug |
| H02 | 34.80 | 200, `-1` |
| H03 | 42.01 | 200, `-2` |
| H04 | 68.75 | DELETE 204, gap reused as `-1` |
| H05 | 29.10 | Cyrillic transliteration |
| H06 | 65.21 | equivalent normalization, suffix |
| H07 | 32.05 | max base length 63 |
| H08 | 24.78 | collision suffix retained, length 63 |
| H09 | 392.27 | 11 creates, final `-10` |
| H10 | 29.57 | same foreign slug does not collide |
| H11 | 142.80 | tenant list contains fixtures |
| H12 | 29.24 | public detail by base |
| H13 | 29.21 | public detail by suffix |
| H14 | 30.96 | public GET + valid selector = 200 |
| H15 | 5.13 | missing selector = 401 |
| H16 | 19.06 | invalid selector = 401 |
| H17 | 2.72 | anonymous POST = 401, count unchanged |
| H18 | 63.88 | authenticated missing scope = 403 |
| H19 | 26.81 | SUPERUSER create = 200 |
| H20 | 28.80 | ADMIN create = 200 |
| H21 | 24.13 | DEVELOPER create = 200 |
| H22 | 3.43 | invalid/foreign selector = 401, foreign count unchanged |
| H23 | 24.33 | invalid breed = 400, no insert |
| H24 | 24.63 | invalid coat = 400, no insert |
| H25 | 28.24 | invalid owner = 400, no insert |
| H26 | 23.58 | structural `{}` = 422 |
| H27 | 20.48 | business-invalid name = 400 |
| H28 | 75.49 | concurrent create = `[200, 400]`, never 500 |
| H29 | 26.23 | session healthy after race = 200 |
| H30 | 905.21 | API/DB cleanup; tenant A/B counts `0/0` |

### Smoke-E01..E30 — 30/30 PASS

| ID | ms | Evidence |
|---|---:|---|
| E01 | 13.85 | real NATS + email PostgreSQL ready |
| E02 | 1.61 | stream/durable ready |
| E03 | 5516.44 | one idle fetch window quiet |
| E04 | 15530.95 | three idle windows quiet |
| E05 | 0.00 | idle DB count unchanged |
| E06 | 0.00 | consumer service running/healthy |
| E07 | 80.15 | valid command delivered after idle |
| E08 | 78.04 | exactly one email_log |
| E09 | 502.59 | `ack_pending=0` after handler |
| E10 | 73.23 | second command after new idle |
| E11 | 78.93 | real batch 3/10 processed |
| E12 | 87.41 | real batch 10/10 processed |
| E13 | 0.00 | 15 distinct UUID/log rows |
| E14 | 1080.75 | duplicate event DB count remains 1 |
| E15 | 1020.78 | invalid JSON process error/nak, not idle |
| E16 | 1015.41 | schema-invalid process error/nak |
| E17 | 0.56 | real-broker transient failure -> nak |
| E18 | 202.50 | redelivery #2 -> ack; pending 0 |
| E19 | 1757.36 | poison deliveries `[1..5]`, sixth absent |
| E20 | 5500.00 | idle after poison quiet |
| E21 | 15793.95 | restart healthy, durable unchanged |
| E22 | 0.00 | graceful stop produced no fetch-failure log |
| E23 | 83.50 | command accepted after restart |
| E24 | 23.88 | broker outage logged as transport error |
| E25 | 80.92 | delivery resumed after broker recovery |
| E26 | 0.00 | transport error distinct from idle telemetry |
| E27 | 0.00 | canonical subject/filter retained |
| E28 | 0.00 | canonical stream/durable retained |
| E29 | 0.00 | payload fields + custom header accepted end-to-end |
| E30 | 5734.41 | 20 test messages + DB rows cleaned; idle quiet |

### Ownership, architecture и access

Diff остаётся в назначенных backend/email paths; migrations, DTO success contract,
NATS topology, frontend и site consumers не менялись. Service зависит от repository
Protocol; SQLAlchemy остаётся в repository; savepoint локализует race; mapping
ограничен точным constraint. Access matrix подтверждена H14-H27. Секреты в evidence
не сохранены; DB env/ports получены только через `docker inspect`.

## История устранённых findings

- QG053-01: stale email/notification runtime images не содержали Prometheus dependencies. Контейнеры пересобраны; оба healthy, restart count 0.
- QG053-02: backend owner подтвердил Unit-H29/H30 и отметил tasks.
- QG053-03: asyncpg-wrapped slug constraint не извлекался. Добавлен точный traversal error chain; live race теперь `[200, 400]`.
- QG053-04: отсутствующий `name` на `POST /api/horses` возвращал 400. Узкий structural mapping теперь даёт 422; другие body/business контракты сохранены.

Все четыре finding закрыты повторными unit и live smoke проверками.
