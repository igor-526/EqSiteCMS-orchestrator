# Tasks — send-email-confirmation-on-bind

Ownership deliverables A/B/C, DAG и test matrix — в `design.md`; unit исполняется только после пользовательского approval, каждый исполнитель немедленно отмечает лишь фактически завершённые пункты и сдаёт handoff, не продолжая следующий unit.

## Execution units

Все production/test paths ниже относительно `services/backend/`, кроме явно указанных root paths. Один owner Backend последовательно владеет tightly-coupled deliverable A, QG — отдельным deliverable B. Closure и правила расширения ownership — `design.md#deliverables-и-ownership`.

| Unit | Профиль | Deliverable / Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| EM-BE-1 | Backend | A: `src/api/emails.py`, `src/clients/email_service/{schemas.py,client.py}`, `src/core/services/email_proxy.py`, новый `src/core/exceptions/email_proxy.py` при необходимости, `src/main.py` только handler; `tests/unit/api/test_email_proxy_api.py`, `tests/unit/api/test_email_client_boundary.py`, новый `tests/unit/core/services/test_email_proxy.py` | approval | targeted email tests + scoped Ruff/mypy/flake8; baseline before правки | `design.md` Decisions/Access matrix/UT registry; delta spec; эти production/test файлы; `src/core/protocols/email_service.py` read-only; `services/frontend/src/features/notifications/hooks/useNotifications.ts` только submitEmail/resend; `services/backend/Makefile` |
| EM-BE-2 | Backend | A: новый `tests/integration/test_email_bind_confirmation.py` с локальными fixtures; пути A из EM-BE-1 только для исправления integration finding | EM-BE-1 | IT-EM-01, SM-EM-01..04; final-service make test/lint | `design.md` Test matrix/Acceptance registry/PostgreSQL; delta spec; handoff EM-BE-1; `src/clients/email_service/client.py`; read-only `services/email-service/src/api/endpoints/emails.py`, `src/core/services/user_email.py`, `src/utils/database.py`, `src/workers/tasks/confirmation.py` (последние три относительно email-service); переданные Router test-target descriptor/permit |
| EM-QG | Quality Gate | B: `docs/reports/send-email-confirmation-on-bind.md`, `.qa/send-email-confirmation-on-bind/QG/`; runtime paths read-only | EM-BE-2 | независимый единый QG-LITE; strict OpenSpec | `design.md` registry/risks, delta spec, tasks.md; handoffs EM-BE-1/2; изменённые пути A; безопасные test-target descriptor/permit |

## 1. EM-BE-1 — контракт и оркестрация create (профиль: Backend)

**Specs:** `email-backend-proxy` · **Deliverable:** A · **Зависит от:** пользовательского approval.

- [x] EM-BE-1.1 До правок воспроизвести UT-EM-01 на текущем create и сохранить безопасный before JSON в `.qa/send-email-confirmation-on-bind/EM-BE-1/`; при наличии заранее разрешённой эквивалентной среды снять runtime SM-EM-01 before без ручного resend. Отсутствие runtime prerequisites оформить как blocked baseline gap, не подменять runtime FAIL unit результатом и не запускать setup/teardown.
- [x] EM-BE-1.2 Добавить strict `send_confirmation=true` только в EmailCreateRequest и пробросить через POST route; параметризованными UT-EM-02 проверить omitted/true/false и invalid → `400`, совместимость прежнего body, неизменность PATCH.
- [x] EM-BE-1.3 В HTTP-клиенте валидировать create EmailResponse, совпадение owner/normalized email и JSON response без приватных полей; send-confirmation считать принятым только при `202`. UT-EM-07/09 и boundary часть UT-EM-05 подтверждают прежний downstream JSON без флага/credentials и отказ malformed/foreign response.
- [x] EM-BE-1.4 В EmailProxyService выполнить owner-check → create → условный один send без auto retry; UT-EM-01/03/04/06/08 проверяют последовательность, confirmed skip, no send при failed create и denied доступе, повтор неподтверждённого адреса.
- [x] EM-BE-1.5 Добавить узкую stage-aware ошибку и HTTP mapping для partial queue failure/invalid response; UT-EM-05/07 проверяют safe `502`, сообщение о сохранении только при достоверном create, отсутствие rollback DELETE и секретов в ответах/новых логах. Не менять общие handlers других routes.
- [x] EM-BE-1.6 Расширить API/core unit группы UT-EM-01..10 по матрице, включая настоящий service boundary для foreign ADMIN/SUPERUSER и anonymous/authenticated confirmation-исключения; сохранить after локализованного reproducer и OpenAPI-схему флага в evidence, не объявляя SMTP доказанным.
- [x] EM-BE-1.V Выполнить targeted `uv run pytest tests/unit/api/test_email_proxy_api.py tests/unit/api/test_email_client_boundary.py tests/unit/core/services/test_email_proxy.py tests/unit/api/test_notification_ui_gateway.py` из services/backend и scoped non-mutating Ruff/mypy/flake8 на изменённых путях; записать ledger в `.qa/send-email-confirmation-on-bind/EM-BE-1/`, отметить выполненные IDs, вернуть handoff Router и остановиться. Полный suite оставить EM-BE-2.

## 2. EM-BE-2 — paired persistence и final-service acceptance (профиль: Backend)

**Specs:** `email-backend-proxy` · **Deliverable:** A · **Зависит от:** EM-BE-1.

- [ ] EM-BE-2.1 Проверить переданный Router safe test-target descriptor, lockfile environments backend/email-service, `_test` PG isolation и отдельные target/resource/expiry permits до mutation; сохранить безопасную identity/ограниченный inspect в evidence. Missing prerequisites → blocked с точной причиной, без app/public fallback и без самовольного setup/teardown.
- [ ] EM-BE-2.2 Добавить bounded paired integration harness в `tests/integration/test_email_bind_confirmation.py`: настоящий backend client → private email-service API/DTO/storage в отдельных environments, локальный queue spy/test sink, запрет внешних адресов и cleanup только owned test resources; подтвердить отсутствие skip для критичного IT-EM-01 при missing peer.
- [ ] EM-BE-2.3 Реализовать и прогнать группу IT-EM-01 на реальной PostgreSQL: commit виден send; одна запись при normalized retry/concurrent sessions; conflict без изменения; после injected failure B запись видна новой session; повтор и confirmed branch. Сохранить результаты, не выдавать spy за реальный SMTP. Обнаруженный peer visibility race вернуть blocker без sleep/широкого изменения второго сервиса.
- [ ] EM-BE-2.4 Выполнить SM-EM-01..03 через `.claude/skills/api-smoke-test` на реальном изолированном API/PostgreSQL с разрешёнными данными и контролируемым failure B; сопоставить runtime before/after и impacted regression. Если исходный runtime FAIL не получен, явно оставить closure gap, не откатывать искусственно код и не запускать legacy e2e runner.
- [ ] EM-BE-2.5 Проверить SM-EM-04 только на разрешённом test mail sink, ожидание не более 60 с; нет sink → unchecked с причиной и вопросом Router, не «письмо доставлено». Для SM-EM-03 code получать из разрешённого источника, немедленно confirm, не сохранять секрет в evidence.
- [ ] EM-BE-2.V Выполнить `uv run pytest tests/integration/test_email_bind_confirmation.py` по IT-EM-01 и финальный gate backend `make test`, `make lint` (Ruff canonical check уже внутри lint, aliases не повторять); сохранить ledger/evidence в `.qa/send-email-confirmation-on-bind/EM-BE-2/`, отметить реально выполненные IDs и вернуть Router handoff с blocked/unchecked gaps. После unit остановиться.

### EM-BE-2 — фактический результат запуска 2026-11-11

- Final-service выполнен один раз: `UV_NO_SYNC=1 make test` → **2765 passed, 5 skipped**; `UV_NO_SYNC=1 make lint` → **PASS** (mypy/Ruff/check-format/flake8). Полный EM-BE-2.V не отмечен: IT-EM-01 не исполнен.
- EM-BE-2.1..2.4 / IT-EM-01 / SM-EM-01..03 — **blocked** до mutation: read-only SELECT подтвердил development DB/role `eqsitecms` и `eqsitecmsemail`, не выделенные `_test` targets. Пользователь разрешил уникальные записи без cleanup в development DB на время unit/независимой проверки, но verification policy требует isolated `_test` и запрещает app/public fallback; формальное исключение не добавлено. Harness не создан и mock/skip PASS не заявлен.
- Дополнительный blocked-env: app unhealthy; doctor показывает startup timeout в `init_registry → apply_migration`. `ready app --no-migrate` не выполнялся: startup сам вызывает миграции, а изменение схемы development DB не разрешено. Worker отсутствует в status; изолированный injectable peer и безопасный источник confirmation code не предоставлены. Runtime before остаётся unreproduced; код искусственно не откатывался.
- EM-BE-2.5 / SM-EM-04 — **unchecked**: гарантированный разрешённый SMTP test sink не предоставлен; отправки и ожидания доставки не было. OpenSpec CLI по-прежнему отсутствует.
- Evidence: `.qa/send-email-confirmation-on-bind/EM-BE-2/ledger.json`, `acceptance.json`, ограниченные identity/doctor/prerequisites и логи gates. Созданных DB/queue ресурсов нет; очистка, setup/teardown, legacy email e2e и QG не выполнялись. Все EM-BE-2 checkbox оставлены открытыми: составные задачи не завершены.

## 3. EM-QG — независимый Quality Gate (профиль: Quality Gate)

**Specs:** `email-backend-proxy` · **Deliverable:** B · **Зависит от:** EM-BE-2, включая явные решения по gaps.

- [x] EM-QG.1 Выполнить независимый QG-LITE scope/ownership/архитектура review; подтвердить отсутствие изменений frontend/email-service/миграций/NATS, сверить strict boolean/OpenAPI и требование actual PATCH confirm. Проверка артефактов — `openspec validate send-email-confirmation-on-bind --type change --strict`.
- [x] EM-QG.2 Независимо выполнить backend full unit suite и canonical lint/check один раз на текущей revision, сверить UT-EM-01..10 с access matrix, partial failure/response privacy; owner PASS не заменяет независимое evidence.
- [ ] EM-QG.3 При подтверждённых prerequisites независимо выполнить IT-EM-01 и SM-EM-01..04, сверить before/after, PostgreSQL persistence/изоляцию, фактическую queue acceptance и отдельный delivery gap; missing infra/permit → blocked/unchecked, а не PASS. FE/browser lanes — неприменимы, UI diff отсутствует.
- [x] EM-QG.4 Проверить ledger fingerprints, конечные scenario IDs, anonymous/authenticated public exceptions и отсутствие role override; A-SELECTOR отметить N/A для email, pre-existing public-helper drift не считать исправленным. Findings вернуть владельцу A; допускается не более одного targeted QG recheck после fix.
- [x] EM-QG.5 Создать единственный итоговый `docs/reports/send-email-confirmation-on-bind.md` с вердиктом и явными gaps/waiver decision; все логи/JSON хранить только `.qa/send-email-confirmation-on-bind/QG/`, без секретов и отдельного каталога reports.
- [x] EM-QG.V Повторить `openspec status --change send-email-confirmation-on-bind --json` и `openspec validate send-email-confirmation-on-bind --type change --strict`, отметить только фактически завершённые задачи, вернуть Router handoff и остановиться; без APPROVED либо явно согласованного APPROVED_WITH_WAIVER не переходить к lifecycle.

## Workflow follow-up

- Router после единого QG вердикта разрешает findings/gaps с пользователем; применение флага и setup/teardown инфраструктуры требуют разных разрешений.
- Router выполняет sync только capability `email-backend-proxy`, повторную strict validation и archive/финализацию по approval gates; это lifecycle, не новый checkpoint execution unit.
- До пользовательского approval этого change реализацию не начинать. PLAN-1 подготовил артефакты, а не выполнил перечисленные implementation tasks.
