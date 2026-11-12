# Quality Gate: send-email-confirmation-on-bind

**Профиль:** QG-LITE · **Вердикт: APPROVED_WITH_WAIVER** · **Дата:** 2026-11-11 · **Unit:** EM-QG

## Ссылки и контекст

- [Задача 112](../tasks/112_email_confirmation_on_bind.md).
- [Proposal](../../openspec/changes/archive/2026-11-11-send-email-confirmation-on-bind/proposal.md), [design / registry / risks](../../openspec/changes/archive/2026-11-11-send-email-confirmation-on-bind/design.md), [delta spec](../../openspec/changes/archive/2026-11-11-send-email-confirmation-on-bind/specs/email-backend-proxy/spec.md), [tasks](../../openspec/changes/archive/2026-11-11-send-email-confirmation-on-bind/tasks.md).
- Approval реализации передан Router. Это не waiver acceptance и не разрешение destructive setup.
- Текущая ветка — `main`; специальная ветка в design не задана.
- Backend POST-привязка принимает strict `send_confirmation=true` по умолчанию; после валидного create выполняет максимум один send для неподтверждённого адреса. `false` и approved пропускают send. Ошибка второго шага — безопасный partial `502`, без DELETE/auto retry. PATCH остаётся save-only.
- В проверенном diff дефектов, требующих code fix, не найдено. Независимые unit/static проверки зелёные; реальная persistence/queue/delivery acceptance не закрыта, поэтому merge approval не выдан.

## Scope / ownership

Проверены только пути change в `services/backend` (включая новые untracked файлы):

| Путь от корня | Изменение |
|---|---|
| `services/backend/src/api/emails.py` | Передача флага сервису |
| `services/backend/src/clients/email_service/schemas.py` | StrictBool/default только create |
| `services/backend/src/clients/email_service/client.py` | Валидация ответа create и принятия send |
| `services/backend/src/core/services/email_proxy.py` | Owner-first orchestration |
| `services/backend/src/core/exceptions/email_proxy.py` | Узкие безопасные ошибки |
| `services/backend/src/main.py` | Узкий handler `502` |
| `services/backend/tests/unit/api/test_email_proxy_api.py` | API/OpenAPI/access/error tests |
| `services/backend/tests/unit/api/test_email_client_boundary.py` | HTTP boundary/response privacy |
| `services/backend/tests/unit/core/services/test_email_proxy.py` | Порядок, skip, partial failure, retry |

QG изменяет только этот отчёт, выполненные checkbox в tasks и `.qa/send-email-confirmation-on-bind/QG/`.
Frontend чист; миграции/NATS/Makefile не менялись. В email-service есть чужие изменения SMTP/settings/fixtures — они не входят в change и не ревьюились/не присваивались. Runtime-код QG не менял.

## Lanes

| Lane | Статус |
|---|---|
| QG-ENV | blocked-env — app unhealthy, нет выделенной разрешённой test infra |
| QG-BE | Unit/архитектурный review пройден; paired persistence blocked |
| QG-CONTRACTS | Пройден — delta/access review и независимая strict OpenSpec validation |
| QG-FORMAT | Пройден — независимые full unit + canonical lint/check |
| QG-LIVE | blocked-env — SM-EM-01..03; SM-EM-04 unchecked |
| QG-FE-AUTO / QG-FE-MANUAL | Неприменимо — нет UI/frontend diff |
| QG-SYNTH | APPROVED_WITH_WAIVER — оставшиеся acceptance gaps приняты пользователем, см. решение ниже |

## Verification / fingerprints

Все пути evidence ниже относительно `.qa/send-email-confirmation-on-bind/QG/`.

| Команда | Фактический результат |
|---|---|
| `UV_NO_SYNC=1 make test` в backend | **2765 passed, 5 skipped**, 13.24 с; `test.log` |
| `UV_NO_SYNC=1 make lint` в backend | PASS: mypy 335 файлов, Ruff check, Ruff format --check 335 файлов, flake8; `lint.log` |
| `git -C services/backend diff --check` | PASS; `static.log` |
| `scripts/stackctl status --json` / `doctor app` | Диагностика выполнена; `stack-status.json`, `doctor-app.json` |
| `openspec validate send-email-confirmation-on-bind --type change --strict` через абсолютный путь | PASS, exit 0, Change is valid; `openspec-validate-recheck.log` |
| `openspec status --change send-email-confirmation-on-bind --json` через абсолютный путь | PASS, exit 0; `openspec-status-recheck.json` |

Full suite и эффективные lint-команды исполнены по одному разу независимо от owner. Aliases и timestamps — `ledger.json`. Первый launcher не стартовал suite из-за отсутствия host `python`; использован существующий `python3`, без установки/ремонта окружения. Canonical formatter — Ruff; mutating format/Black не запускались.
Backend revision `c817025d31c9518027ee0dad3fa6fa7c1412a6c1` + dirty fingerprint `985a65b50928652bc5dcad805700a8141ef22cef51e699f191bc4db86e616c5c`; после прогонов пути не изменились.
`fingerprints.json` содержит per-file hashes и supporting config/fixture hashes; Python backend 3.13.5, uv 0.13.5, hash uv.lock зафиксирован. `registry.json` — конечные IDs/status/reasons, единственный независимый evidenceOwner `EM-QG`; BE/CONTRACTS используют один run без дублирования suite.
Owner before/after ledger проверен: локальный unit FAIL→PASS подтверждает пропуск вызова, но не заменяет отсутствующий runtime before. Fingerprint полного QG отличается от owner по составу входных путей, сравнение digest между разными наборами не является проверкой revision.

## Трассировка test matrix

Пути ниже относительно `services/backend/tests/unit/`; все перечисленные UT выполнены full suite, критичные email-группы не skipped.

| ID | Тест / результат |
|---|---|
| UT-EM-01 | `core/services/test_email_proxy.py::test_create_order_and_conditional_confirmation`, `api/test_email_proxy_api.py::test_real_create_boundary` — passed |
| UT-EM-02 | `test_invalid_confirmation_flag_is_400_without_effects`, `test_create_passes_strict_flag_to_service`, `test_openapi_flag_is_post_only` — passed |
| UT-EM-03 | `test_create_order_and_conditional_confirmation`, boundary approved — passed |
| UT-EM-04 | `test_failed_create_never_sends`, boundary create errors — passed |
| UT-EM-05 | `test_send_failure_is_stage_aware`, `api/test_email_client_boundary.py::test_send_requires_202_and_json_object`, boundary send errors — passed |
| UT-EM-06 | `test_retry_same_unconfirmed_resource_repeats_send` — passed; не доказывает SQL uniqueness |
| UT-EM-07 | `test_create_rejects_untrusted_response`, `test_create_normalizes_comparison_and_filters_private_response`, boundary malformed/foreign — passed |
| UT-EM-08 | `test_foreign_owner_denied_before_any_peer_call`, `test_foreign_create_has_no_privileged_override`, `test_anonymous_create_is_401_before_client` — passed |
| UT-EM-09 | Client acceptance `202`, core/boundary happy path — passed; не доказательство worker/SMTP |
| UT-EM-10 | API update/delete/confirmation matrix; core `test_update_does_not_send_confirmation`; `api/test_notification_ui_gateway.py::test_u01_anonymous_email_me_is_401_without_downstream`, owner/missing tests — passed |
| IT-EM-01 | **blocked** — нет P-PAIR/permit, integration harness не создан владельцем |
| SM-EM-01 | **blocked / runtime before unreproduced** — нет безопасной real API/PG/queue acceptance |
| SM-EM-02 | **blocked** — нет isolated injectable peer/permit |
| SM-EM-03 | **blocked** — нет healthy isolated API/test accounts/разрешённого code source |
| SM-EM-04 | **unchecked** — нет разрешённого test SMTP sink/worker |
| A-SELECTOR | Неприменимо — email routes selector не принимают |

## Access verification results

- Unit: anonymous POST/PATCH/DELETE и sensitive GET → `401`; owner create/update/delete/get → контрактные результаты. Denied запросы не вызывают downstream.
- Foreign create проверен с обоими флагами и ADMIN/SUPERUSER: `403` до любых peer calls; update/delete также owner-only без override (код и API-тесты).
- Public POST send-confirmation и **PATCH confirm** проверены anonymous/authenticated, включая `404`, confirm `400/409/410`; одинаковые исходы без CMS gate. Метод confirm не изменён.
- Strict invalid flag → `400` без effects; OpenAPI boolean/default true, PATCH без флага. Downstream create JSON содержит только user_id/email, без флага и credentials.
- Реальный HTTP adapter на MockTransport проверяет owner/normalized email, malformed response → safe `502`, фильтрует приватные поля. Partial `502` не раскрывает payload, нет автоматического повтора или компенсации. Это unit boundary, не paired peer acceptance.
- Live anonymous/authenticated матрица **не проверена**; unit PASS не объявлен live PASS.

## Blocked-env / незакрытые prerequisites

| ID | Воспроизводимость / что требуется |
|---|---|
| ENV-EM-01 | `stackctl status --json` показывает app `running/unhealthy`; `doctor app` — startup `init_registry → apply_migration → TimeoutError`. Email-service healthy internal:8000, Redis healthy; email worker в status отсутствует. Нужен разрешённый healthy test runtime, не ремонт в этом change. |
| ENV-EM-02 | Переданный descriptor и `.qa/send-email-confirmation-on-bind/EM-BE-2/db{,-email}-identity.json`: development `eqsitecms`/`eqsitecmsemail`, не `_test`. QG не повторял DB access: отсутствие permit/изоляции уже останавливает acceptance. Нужны isolated `_test` targets/roles, отдельный permit target/resources/expiry и bounded cleanup; затем владелец завершает paired harness/IT-EM-01. |
| ENV-EM-03 | Для SM-EM-01..03 нужны тестовые owner/foreign аккаунты, разрешённый источник code, injectable isolated peer и queue introspection; для SM-EM-04 — явное разрешение sink delivery. Runtime before отсутствует и автоматически не восстанавливается; требуется решение по closure gap. |
| TOOL-EM-01 — снят | Первоначально вызов по PATH вернул 127. Router указал установленный CLI `/srv/eqSiteCMS/.cache/openspec-tool/1.14.3/node_modules/.bin/openspec`; независимый targeted recheck status/strict validate → PASS (exit 0). CLI не устанавливался, PATH/окружение не менялись. |

Repair attempts **0**; rebuild/ready/migrations не выполнялись: startup сам запускает миграции, отсутствует отдельный permit. БД/очереди не мутировались, внешние письма не отправлялись. Smoke skill прочитан; из-за prerequisites до авторизации/HTTP effects остановлено. Endpoint timings — **не измерены**, smoke PASS **0/4** (3 blocked, 1 unchecked).

## Pre-existing / Waivers / продолжение

Pre-existing public-helper selector drift известен из design, вне email scope; не исправлен и не перепроверен. Router может оформить отдельную задачу в `docs/tasks`, не расширяя этот change. SMTP-параллельный change не является evidence данного gate.
Waiver **отсутствует**. Фраза «Проверки можно проводить в этой базе, она как раз для разработки» не отменяет isolated acceptance policy и не разрешает destructive setup/внешнюю доставку.
После предоставления prerequisites Router возвращает владельцу незавершённый EM-BE-2 (paired harness + real acceptance), затем тому же QG — только оставшиеся gaps с invalidation по фактическому diff. До решения нет APPROVED, sync/archive/lifecycle не запускать.
Checkbox завершены EM-QG.1/.2/.4/.5/.V; EM-QG.3 и EM-BE-2 остаются открытыми. Targeted recheck снял только TOOL-EM-01; suite/lint не повторялись, runtime gaps и вердикт BLOCKED не изменились. Поле status `isComplete` относится к planning artifacts, не к выполнению acceptance.


## Решение пользователя — waiver

Пользователь явно подтвердил: «Архивируй change, я принимаю риски».
Вердикт: **APPROVED_WITH_WAIVER**. ENV-EM-01, ENV-EM-02, ENV-EM-03 и связанные gaps IT-EM-01, SM-EM-01..03, отсутствие runtime before и SM-EM-04 — **waived by user** для архивирования этого change. Предшествующие разделы сохраняют исторические результаты gate; это решение заменяет прежний BLOCKED и запрет lifecycle.
Persistence, реальная постановка в очередь и SMTP-доставка не объявляются проверенными; незавершённые задачи сохраняются открытыми. Разрешение не распространяется на деструктивные операции, вывод секретов или отправку внешних писем.
