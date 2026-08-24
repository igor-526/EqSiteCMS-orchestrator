# Review: 054 Observability

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-24  
**OpenSpec:** `openspec/changes/observability-054` (approved пользователем; proposal, design, delta spec, tasks)

## Итог

Совокупный diff соответствует `platform-observability`; API/AsyncAPI/DB schema не
изменены. После исправления QG-054-01 сохранён и независимо проверен live smoke
report: 31/31 сценарий прошёл с per-endpoint timings, fresh PostgreSQL discovery,
production scrape и cleanup evidence. Полный применимый Quality Gate повторён;
blocking findings отсутствуют.

## Re-review history

### QG-054-01 — RESOLVED

- **Owner:** Backend / documentation evidence owner.
- **Требование:** tasks 5.5 и Quality Gate protocol требуют минимум 30 live smoke
  сценариев через skill `smoke`, реальную PostgreSQL и timings каждого проверенного
  endpoint.
- **Факт:** `docs/reports/054-observability-implementation-evidence.md` содержит
  только browser/documentation QA. В репозитории не найден smoke report/table,
  endpoint timings, команды production scrape/restart или sanitized результаты
  30 сценариев. Checkbox-ы 1.43–1.73 сами по себе evidence не заменяют.
- **Исправление:** создан `docs/reports/054-observability-smoke.md`: 31/31 PASS,
  fresh inspect трёх PostgreSQL-контуров, timings всех HTTP requests, production
  metrics scrape, counters, sanitization, graceful stop/restart, access и cleanup.
- **Повторная проверка:** 2026-08-24 весь применимый gate повторён. Текущий cleanup
  независимо подтверждён: три development health endpoint вернули 200 за
  9.257/11.070/10.212 ms, socket `:9000` во всех контейнерах вернул
  `connect_ex=111`; QA build-каталоги удалены.

## Tests and checks

- `openspec status --change observability-054`: 4/4 artifacts done.
- `openspec validate observability-054 --strict`: valid.
- Root Makefile contract: `test`, `lint`, `format` имеют четыре явных вызова в
  порядке backend → notification-service → email-service → frontend; `test` не
  поднимает infrastructure.
- Повторный `make test`: backend 1135 passed / 5 skipped; notification 48 passed / 2
  deselected; email 80 passed / 4 deselected; CMS 469 passed. Итого 1732 passed,
  0 failed.
- Повторный `make lint`: Python mypy/basedpyright/ruff/format-check/flake8 clean; CMS ESLint
  0 errors (419 существующих warnings), typecheck successful.
- Повторный CMS `npm run build`: successful, 16 routes.
- Повторный site-ad `npm test`: 20 passed; `npm run lint`: 0 errors, 8 warnings; `npx tsc
  --noEmit`: successful; `npm run build`: successful, SSR routes сохранены.
- Root `make format` намеренно не запускался на dirty multi-repo worktree: target
  mutating. Все Python format-check gates прошли; frontend format target также
  mutating и не нужен для доказательства формата.

## Frontend test gate

CMS Sentry config, client/server/edge instrumentation и global fallback покрыты
mocked tests без live backend/Sentry calls. Обязательные static checks выполнены:
runtime `fetch` остаётся в `src/api`; примеры fetch в developer-documentation UI
не являются runtime boundary; API imports в features идут через service modules,
а существующие app auth imports не изменены; pagination diff отсутствует; новых
legacy `shared/widgets/entities` директорий и `site-*` mixing нет.

QA build artifacts `.next-qa/` и `.next-qa-enabled/` удалены; path-accounted
frontend status их больше не содержит.

## Access verification results

- Endpoint diff отсутствует, access matrix для change неприменима.
- Live read-only check текущего backend: `/health` 200 за 8.17 ms; notification
  `/health` 200 за 9.35 ms; email `/health` 200 за 9.84 ms.
- Текущий stack development: `:9000` во всех трёх контейнерах отклоняет connection,
  что соответствует development contract.
- Anonymous Public Read SSR `site-ad` и CMS anonymous guard зафиксированы в
  implementation evidence. Smoke подтвердил protected write: anonymous PATCH 401
  за 2.909 ms, login 200 за 24.122 ms, `/auth/me` 200 за 21.522 ms,
  authenticated PATCH 200 за 26.953 ms.
- API routes, access implementation, NATS subjects/AsyncAPI и DB migrations/schema
  observability diff не меняет. В email-service присутствует отдельный ранее
  назначенный NATS timeout diff; он не относится к change 054.

## Docker and security

- Effective frontend compose config валиден; Sentry defaults disabled, metrics
  port backend-сервисов не публикуется. Host `:9000` принадлежит MinIO, не metrics.
- Fresh `docker inspect` подтвердил DB container `eqsitecms-db`, image `postgres:16`,
  service label `db`, aliases `eqsitecms-db`/`db`, host port `5433`; password в
  evidence не записан.
- Обновлённый spec явно допускает intended public browser DSN в client bundle как
  endpoint identifier. `SENTRY_AUTH_TOKEN`, credential-bearing/private DSN и
  credentials отсутствуют; полное значение public DSN в evidence не раскрывается.
  Tenant selector site-ad является non-secret identity hint по общей access policy.

## Accepted gaps (не PASS)

Пользователь явно принял перенос следующих Manual QA проверок в будущую задачу при
возникновении багов:

- task 4.3: current-build CMS authenticated/permission fixture и реальные UI
  `401/403`, browser-triggered global fallback/ровно одно sanitized event;
- task 4.4: site-ad browser-triggered client/server error, fallback и ровно одно
  sanitized event.

Они остаются unchecked и не заявляются как выполненные. Disabled/enabled startup,
anonymous routes, SSR/SEO shell и responsive 1440/768/390 evidence сохранены в
implementation report.

## Решение

**APPROVED.** Все blocking findings устранены, полный применимый gate повторён.
OpenSpec tasks 5.1–5.17 доказаны. Tasks 4.3–4.4 остаются согласованными
`ACCEPTED GAP`, не PASS. Sync/archive не выполнялись; tasks 5.18–5.19 остаются
Router workflow.
