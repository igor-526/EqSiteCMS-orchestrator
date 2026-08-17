# Review: 045 / `harden-core-service-architecture`

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-17  
**Прогон:** QG5, полный повтор `5.1–5.21` после fixes QG4-01/QG4-02

## Итог

Совокупный core diff соответствует утверждённому OpenSpec. Все static, unit, real infrastructure, build, recreate, access, live API, CMS live, production security и policy gates прошли. QG4-01 закрыт event-loop-local lifecycle и fresh-worker regression; QG4-02 закрыт удалением credential logging и независимым runtime log audit.

Blocking findings отсутствуют. Router может отметить подтверждённые tasks `5.1–5.21`, затем выполнить `5.23` spec sync + strict validation и только после успеха `5.24` archive.

Consumer Frontend (`services/site-*`) не читался, не собирался, не тестировался и не изменялся.

## OpenSpec и ownership

- `openspec status --change harden-core-service-architecture --json`: proposal/design/specs/tasks `done`, `isComplete=true`.
- `openspec validate harden-core-service-architecture --type change --strict`: PASS.
- До QG progress `125/149`, QG tasks оставлены Router.
- Перечитаны все proposal/design/9 delta specs/tasks, Backend/QG instructions, NATS/Celery howto, smoke skill, QG4 report и handoff.
- Root и четыре service worktree status-shapes до/после совпали; QG не запускал formatter/fix. Единственная намеренная итоговая правка QG — этот report. `qa:live` обновляет собственный checked evidence по проектному runner contract.

## Static/unit/aggregate gates

| Gate | Результат |
|---|---|
| Backend mypy `src tests` | PASS, 228 files |
| Backend Ruff / format-check / flake8 | PASS / PASS / PASS |
| Backend pytest | **959 passed, 5 skipped**, 2.17 s |
| Email mypy / basedpyright / Ruff / format / flake8 | PASS, 0 errors/warnings |
| Email default pytest | **39 passed, 4 infrastructure deselected**, 0.60 s |
| Notification mypy / basedpyright / Ruff / format / flake8 | PASS, 0 errors/warnings |
| Notification default pytest | **23 passed, 2 infrastructure deselected**, 0.61 s |
| CMS Vitest | **41 files / 384 tests**, 13.71 s |
| CMS ESLint | PASS, 0 errors / 398 classified legacy warnings |
| CMS deterministic typecheck / build | PASS / PASS, Next 15.5.23 |
| Compose validation | PASS: individual + unified core |
| AsyncAPI CLI 6.0.2 | 3/3 valid, 0 errors; governance warnings classified |
| Secret scan | PASS |
| Root `make check` | PASS; non-mutating status verified |

Generated backend inventory содержит **88 routes** и проходит regeneration/contract tests. Exact email owner-only/public-exception, tenant selector и `site_settings` scope rows присутствуют. Email unit matrix покрывает более 30 разнообразных cases, включая foreign/privileged denial до downstream, `400/401/403/404/409`, idempotent `201`, public confirmation и отсутствие peer credential. Pytest smoke scripts отсутствуют.

## Real messaging и Celery

- Real JetStream: **2 passed, 23 deselected**, 1.70 s — stream/durable/filter, explicit ack, nak/redelivery, max-deliver, duplicate suppression и backend→notification→email/database E2E.
- Real Redis/Celery/PostgreSQL: **4 passed, 39 deselected**, 22.06 s — delivery, retry, `acks_late`, idempotency, worker restart/redelivery, concurrent repository/session и sequential confirmation lifecycle.
- После fresh second recreate targeted sequential-confirmation regression выполнена ещё **дважды**: PASS 1.14 s и PASS 0.39 s. Каждый прогон отправил две последовательные задачи одному worker; scoped logs не содержали different-loop/event-loop-closed/traceback/retry.
- Readiness: targeted `celery inspect ping --destination email-worker@email-worker --timeout 5` → pong, 1 node online. Queue/canary не использовались.

Infrastructure endpoints/credentials для tests извлечены fresh через `docker inspect`; DB/container ID не захардкожены в source/tests.

## Fresh no-cache builds и два recreate

`make build-nc` PASS:

| Image | Fresh ID |
|---|---|
| backend | `sha256:b1384d762f3974e74d382b9edf717ad10f75b0e84f99f5486c7118678bc4bbfe` |
| notification | `sha256:ebf8f41f62be3f2d467e85ec156eef086062c574e4daf85fc6b35f1f006c0944` |
| email | `sha256:8c2cb261305f4af296c44b966ecc986ed2e37b44aaf1ae92ed76ec2eecc30b47` |
| email celery | `sha256:67b6d2fc3934d368407d347998db0d4d3ad9d611ec11870582d091b501f88918` |
| CMS | `sha256:e3bd8556f27af1392e8390ab9049b73a7b67fd1e9e9cdf1b711f6ffba90f39a9` |

Два последовательных unified `make recreate-core && make health-core` прошли. Notification/email/backend migrations выполнены оба раза. Все пять runtime IDs точно совпали с candidates; Compose project `eqsitecms-core`, restart count 0. Datastore/broker volume names и destinations стабильны до/после обоих recreate.

Private boundary PASS: host peer ports `8002/8003` denied; backend→email/notification health `200/200`; peers не публикуют `8000`. `EMAIL_SERVICE_SERVICE_KEY` отсутствует в checked source/compose/runtime path; разрешённый `MAIN_BACKEND_SERVICE_KEY` сохранён только microservice→backend `/api/service/*`.

## Live API SMOKE

Smoke skill прочитан и применён. Cookie credentials загружены автоматически; protected requests использовали cookie, Public Read/public write exceptions проверялись без cookie. Main PostgreSQL и email PostgreSQL обнаружены через актуальный Docker inspect. Timings — wall time curl.

Исправленный независимый основной run: **35/35 PASS**. Первый reviewer invocation с `.test` email и неверным health/owner-missing fixture был отброшен как operator input; fixture очищена и не учитывается.

| Группа | Outcomes | Timing range |
|---|---|---:|
| login/me + fixture lifecycle | `200/200/201/204` | 22.398–37.678 ms |
| tenant missing/invalid/valid anonymous | `401/401/200` | 2.787–32.755 ms |
| anonymous/foreign create | `401/403` | 1.986–25.563 ms |
| malformed UUID/email | `400/400` | 26.313–46.280 ms |
| owner create / same / different | `201/201/409` | 31.482–38.873 ms |
| update anonymous/foreign/invalid/owner | `401/403/400/200` | 1.960–59.569 ms |
| delete anonymous/foreign/malformed/owner | `401/403/400/204` | 3.589–48.265 ms |
| owner missing update/delete | `404/404` | 55.616–64.857 ms |
| public send-confirmation / invalid confirm | `202/400` | 2.661–138.054 ms |
| backend health after boundary workload | `200` | 1.652 ms |
| `site_settings` anonymous GET/write | `401/401` | 2.299–2.732 ms |

Supplemental exact acceptance: **8/8 PASS** — two concurrent same-email creates `201/201` (63.205/83.924 ms), send confirmation `202` 15.722 ms, valid confirm `200` 19.706 ms, reused `409` 15.467 ms, expired `410` 22.732 ms, email/user cleanup `204/204`. Active QG5 email rows after cleanup: 0.

## Credential/log security

На fresh backend выполнены login + refresh (`200` за 29.777/24.666 ms). Cookie values были извлечены только в memory для exact sentinel comparison и не выводились/не записывались в report. Scoped log audit:

- captured credential values: 3; exact-value hits: **0**;
- JWT-shape hits: **0**;
- literal legacy `accessToken` hits: **0**.

Финальный 20-minute scan backend/notification/email/celery logs дал 0 matches для different-loop, event-loop-closed, traceback, retry, legacy accessToken и JWT-shape. Containers healthy, restart count 0.

## CMS frontend gate

- Required tests/lint/typecheck/build: PASS как указано выше.
- `npm run qa:live`: **26/26 PASS** на canonical `http://localhost:3001` и real backend: login, 15 deep-links на 1440/768/360 без overflow, keyboard focus, protected mutation/refresh, anonymous `401`, no-scope `403`, cleanup, logout redirect.
- Tests review: MSW/no-live unit boundary, auth/scopes/Protected Write/401/403, horses pagination/reset и price modal validation/backend error/double-submit/invalidation покрыты.
- Self-check review: runtime requests находятся в API/service boundary; feature/API import matches относятся к approved service layer; pagination сохраняет `limit/offset`; legacy `shared/widgets/entities` dirs отсутствуют; consumer mixing отсутствует.
- Fresh final image `npm audit --omit=dev --json`: **0 vulnerabilities**, 229 production dependencies. Full dev-inclusive install advisories (8 high, 1 critical) классифицированы отдельно от approved production graph.

## Production config и policy

- Production fail-fast PASS для backend/email/notification: `ENVIRONMENT=production PYTHONPATH=src uv run python -c 'import settings'` завершился non-zero с ожидаемой unsafe/missing-secret validation до traffic.
- `.env.example` placeholders, source secret scan и rotation checklist PASS.
- AGENTS/Planner/Backend/QG/Celery/NATS policy согласованы с selector `401`, email owner-only/invalid `400`, private peers, one-way service key, basedpyright, targeted ping, real-infra и skip-is-not-pass.

## Verdict

**APPROVED.** Реализация готова к Router-owned checklist completion, delta-spec sync/strict validation и archive в установленной последовательности.
