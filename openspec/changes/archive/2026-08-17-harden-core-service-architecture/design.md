## Context

Единственный нормативный вход — `docs/reports/045-project-architecture-audit-brief.md`; исходная задача 045 используется только для трассировки. Audit evidence: backend `918 passed/5 skipped`, но mypy `6` source и `547` full errors, Ruff `3`, format drift `11`; email/notification basedpyright `3/5`; CMS `380` tests и build PASS, но `401` lint warning и `.next/types` race. Real NATS/Celery evidence отсутствует, peer HTTP ports опубликованы, Celery worker не имеет корректного Redis/readiness contract, root gate неполон и мутирует файлы.

Изменение охватывает orchestration, backend, CMS frontend, email-service, notification-service и agent/howto policy. Consumer Frontend полностью исключён. Схема БД не меняется.

## Goals / Non-Goals

**Goals:**

- Реализовать утверждённые email owner/access/error/idempotency outcomes и private peer boundary.
- Синхронизировать tenant-selector governance с фактической tenant isolation.
- Сделать Python/CMS/messaging/Celery/root gates полными, non-mutating и воспроизводимыми.
- Получить real infrastructure evidence и один общий Quality Gate.
- Обновить agent policy только после стабилизации runtime contracts.

**Non-Goals:**

- Любая работа, чтение, тестирование или проверка `services/site-ad`/`services/site-*`.
- Изменение NATS topology, payload, subject, stream/durable либо БД schema без повторного approval.
- Privileged override email ownership, peer-to-peer authentication или замена tenant selector slug/host mapping.
- Использование queue inspection/canary как Celery readiness.

## Decisions

### Ownership и dependency graph

| Package | Owner | Exclusive zone | Depends on |
|---|---|---|---|
| P-A private network | Backend/orchestration | email/notification compose exposure, network tests | approval |
| P-B1 email boundary | Backend | backend email API/client Protocol/DI + email repository/service semantics/tests | P-A |
| P-B2 source typing | Backend | user protocols/services/repository | approval; parallel to P-A |
| P-B3 typed tests/style | Backend | sequential test-domain batches, then mechanical style | P-B1, P-B2 |
| P-M1 contracts | Backend messaging contract owner | three AsyncAPI + NATS howto/contract tests | approval |
| P-M2 infrastructure | Backend sequentially per service | backend→notification→email adapters/tests; Celery/Redis/session lifecycle | P-M1, P-A |
| P-E / P-N | Backend, separate owners | email-only / notification-only basedpyright paths | approval |
| P-F1 CMS gate | Frontend | package/Next/ESLint/type generation/test harness | approval |
| P-F2 horses | Frontend | horses hotspot/tests | P-F1 |
| P-F3 prices/docs | Frontend | prices hotspots/tests | P-F1; sequential after overlapping shared changes |
| P-F4 rollout | Frontend | gallery→news→siteSettings, one feature at a time | P-F2/P-F3 |
| P-O orchestration/catalog/config | Backend/orchestration | root Make/compose/docs/config examples | all service packages |
| P-D policy | Backend documentation owner | AGENTS/planner/backend/QG, then Celery/NATS howto sequentially | runtime specs stable, P-M1 |
| P-Q | Quality Gate | only one `docs/reports/...` report | all packages |

Один файл/тесно связанная зона имеет одного владельца. P-D не выполняется параллельно с P-M1, поскольку оба касаются howto. Findings возвращаются package owner, затем P-Q повторяется полностью.

### Email boundary

Network isolation выполняется раньше удаления peer credential. Backend аутентифицирует пользователя и проверяет exact owner до downstream lookup. Проверка находится в service/Depends boundary, не в router business logic; client подключается через Protocol/DI. Public confirmation endpoints используют контрольную строку и не требуют CMS session. Endpoint-specific handler нормализует malformed body/path/UUID в `400`, не меняя глобальный `422` contract других endpoints.

Same-email create выполняется транзакционно/идемпотентно: возвращает существующий logical resource с `201`, не меняет confirmed/approved; concurrent duplicate оставляет одну запись. Different email возвращает `409`.

### Messaging и Celery

AsyncAPI становится source of truth для существующей topology, но не меняет её. Real JetStream suite проверяет provisioning/filter/ack/nak/redelivery/max-deliver/idempotency/E2E. Celery readiness — только targeted `celery inspect ping -d <stable-node>` с timeout после healthy Redis; integration suite отдельно проверяет delivery/retry/acks-late/idempotency/restart/session concurrency.

### CMS rollout

P-F1 создаёт isolated type-generation directory/process и blocking lint pilot. Pilot: API/auth boundary и horses. Далее `prices → gallery → news → siteSettings`; status branches переходят на `API_STATUS` helpers. Hotspots делятся по responsibilities и только при наличии behavior tests. Blanket disable и механический перенос запрещены.

### PostgreSQL для live SMOKE

Discovery 2026-08-16: основной label search `project=eqsitecms/service=db` не выбрал DB; fallback выбрал `eqsitecms-db` (`3836f158458f`), image `postgres:16`, aliases `eqsitecms-db`,`db`, inspect env `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`, host port `5433`. Это snapshot evidence: перед smoke параметры MUST заново извлекаться через `docker inspect`, не копироваться как hardcode.

### Unit-тесты backend-фичи email owner boundary

| ID | Сценарий |
|---|---|
| U-01 | anonymous create → 401 до client |
| U-02 | owner first create → 201 EmailResponse |
| U-03 | foreign create → 403 до lookup |
| U-04 | SUPERUSER foreign create также 403 |
| U-05 | ADMIN foreign create также 403 |
| U-06 | malformed create UUID → 400 |
| U-07 | malformed create body → 400 |
| U-08 | invalid email → 400 |
| U-09 | same normalized email → 201 same logical resource |
| U-10 | same email не создаёт вторую запись |
| U-11 | same email сохраняет approved=true |
| U-12 | same email сохраняет confirmed=true |
| U-13 | different email existing owner → 409 |
| U-14 | concurrent same-email create идемпотентен |
| U-15 | anonymous update → 401 |
| U-16 | owner update success |
| U-17 | foreign update → 403 до lookup |
| U-18 | privileged foreign update → 403 |
| U-19 | owner missing update → 404 |
| U-20 | invalid update body → 400 |
| U-21 | anonymous delete → 401 |
| U-22 | owner delete → 204 |
| U-23 | foreign delete → 403 до lookup |
| U-24 | privileged foreign delete → 403 |
| U-25 | owner missing delete → 404 |
| U-26 | malformed path UUID → 400 |
| U-27 | public send-confirmation valid → 202 |
| U-28 | public confirm valid → success |
| U-29 | invalid confirmation requests → 400 |
| U-30 | downstream timeout/non-JSON error controlled |
| U-31 | DI provides Protocol client, no global concrete client |
| U-32 | downstream request has no peer credential |

### Smoke-тесты backend-фичи email owner boundary

SMOKE выполняется только live skill `.claude/skills/api-smoke-test`, не pytest, на реальной PostgreSQL; variables: `BASE_URL`, `OWNER_ID`, `FOREIGN_ID`, `OWNER_COOKIE`, `PRIVILEGED_COOKIE`, `EMAIL_A`, `EMAIL_B`, `VALID_CODE`.

| ID | Запрос/проверка |
|---|---|
| SM-01 | health/migrations/DB inspect ready |
| SM-02 | anonymous create 401, DB unchanged |
| SM-03 | owner first create 201, DB row |
| SM-04 | foreign create 403 before existence leak |
| SM-05 | privileged foreign create 403 |
| SM-06 | malformed UUID/body 400 |
| SM-07 | invalid email 400 |
| SM-08 | same email 201 same body shape |
| SM-09 | same email leaves one row |
| SM-10 | same email preserves confirmed/approved |
| SM-11 | different email 409, original unchanged |
| SM-12 | concurrent same create leaves one row |
| SM-13 | anonymous update 401 |
| SM-14 | owner update success and DB changed |
| SM-15 | foreign update 403 before lookup |
| SM-16 | privileged foreign update 403 |
| SM-17 | owner missing update 404 |
| SM-18 | invalid update 400 |
| SM-19 | anonymous delete 401 |
| SM-20 | owner delete 204 and DB state |
| SM-21 | foreign delete 403 before lookup |
| SM-22 | privileged foreign delete 403 |
| SM-23 | owner missing delete 404 |
| SM-24 | malformed delete UUID 400 |
| SM-25 | public send-confirmation without cookie 202 |
| SM-26 | public confirm without cookie success |
| SM-27 | invalid public confirmation request 400 |
| SM-28 | expired/reused code domain contract |
| SM-29 | downstream unavailable controlled response, backend healthy |
| SM-30 | peer request/log contains no service credential |
| SM-31 | tenant GET missing selector 401 |
| SM-32 | tenant GET invalid selector 401 |
| SM-33 | tenant GET valid selector success without cookie |
| SM-34 | cleanup and timings for every endpoint recorded |

### Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| type generation/build | isolated deterministic Next types | clean/cache-missing/concurrent orchestration regression | N/A | `npm test`, lint, `npx tsc --noEmit`, build |
| API/auth pilot | status helpers and error paths | MSW success/empty/validation/generic/401/403, no live backend | anonymous redirect, authenticated render, refresh failure | same |
| horses hotspot | responsibility split | hook/component data/loading/empty/error/action; pagination initial/page/size/reset | scope present/missing, hidden/guarded writes, 401/403 | same |
| prices/docs hotspot | modal/docs split | open/close/valid/validation/backend error/double submit/success invalidation | Protected Write owner/scope/denial | same |
| gallery/news/siteSettings | lint/API status rollout | helper success/edge/error and applicable list/form matrix | anonymous/authenticated/scopes/401/403 | same |

Tests use Vitest/RTL/user-event/jsdom/MSW and fail on unhandled live calls. Required self-checks from Planner apply, including `limit/offset`, API boundary and proof that no `site-*` files were read/changed/tested.

## Manual QA steps (UI тестирование)

Предусловия: core stack healthy, users со scope present/missing, DevTools; Consumer Frontend не открывать.

1. На `/login` и protected CMS routes проверить anonymous redirect/block без private flash, затем authenticated render и deep-link refresh.
2. Проверить expired session/401 refresh path без loop и 403 для scope-missing с сохранением UI state.
3. На horses проверить loading/data/empty/error, search/filter/sort, initial/page/page-size и reset `offset`; выполнить разрешённые actions, validation/generic/401/403, double-submit и success refresh.
4. На prices проверить modal open/close, valid submit, field/backend errors, denied action, double-submit и invalidation после split.
5. Повторить затронутые flows gallery/news/siteSettings после каждой lint/status rollout wave.
6. На 1440/768/360 проверить отсутствие overlap/обрезки таблиц, controls, modals и docs; keyboard Tab/Escape/focus и accessible labels.
7. Проверить Console без runtime errors и Network status/body; Consumer routes и `services/site-*` не использовать.
8. QA report содержит passed/failed steps, screenshots failed responsive/error/permission cases и network status/body/timing.

## Risks / Trade-offs

- [Удаление peer credential до network isolation расширит surface] → строгая dependency P-A → P-B1 и network verification.
- [Endpoint-specific 400 конфликтует с global 422] → узкая email-only normalization и regression остальных routes.
- [547 typed test errors создают конфликт ownership] → sequential domain batches после source protocols.
- [Real integration tests могут быть flaky] → deterministic provisioning, bounded timeouts, unique resources и cleanup; skip не PASS.
- [CMS 401 warnings провоцируют suppressions] → feature waves и behavior evidence до rule escalation.
- [Policy edits расходятся с runtime] → P-D выполняется после runtime contracts одним владельцем.

## Migration Plan

1. После user approval: P-A и независимые P-B2/P-E/P-N/P-F1.
2. P-B1 после network isolation; затем P-B3.
3. P-M1 → последовательные adapters/P-M2; real infrastructure evidence.
4. P-F2/P-F3 → feature rollout P-F4.
5. P-O и P-D после service packages.
6. Один P-Q; findings владельцам и полный повтор.
7. После APPROVED: sync delta specs, strict validation, archive.

Rollback: вернуть path-scoped package и предыдущие image/compose configs; peer credential нельзя возвращать как замену network isolation без нового approved change. Миграций БД нет.

## Open Questions

Нет. Бриф фиксирует все продуктовые и архитектурные outcomes; implementation details выбираются внутри design без их изменения.
