# Review: 052 photos bug

**Статус: ✅ APPROVED**
**Дата:** 2026-08-24

## Итог

Совокупный diff change `fix-photo-upload-edge-cases` соответствует proposal/design/delta specs и прошёл повторный unit/static/frontend/Helm/runtime gate. Блокирующих findings не найдено. Production/deployed API и Browser Plugin/manual QA отмечены N/A по явному user waiver; они не представлены как выполненные тесты и не входят в acceptance.

## Контекст

- OpenSpec: `openspec/changes/fix-photo-upload-edge-cases/`
- Approval: пользователь явно подтвердил `Apply`; исходное имя хранить не требуется.
- Источник: `docs/tasks/052_photos_bug.md`.
- Изменения: bounded Unicode naming и tenant-scoped collision retry, PostgreSQL unique constraint с cleanup migration, локальное удаление temporary/error frontend upload item, Helm ingress body-size `20m`.
- Рекомендуемые ветки: текущие рабочие ветки nested repositories; diff готов к Router sync/validation/archive workflow.

## Findings

Blocking findings: нет.

Неблокирующее наблюдение: frontend lint сохраняет существующий набор из 414 warnings, включая legacy warnings в gallery-файлах; ошибок нет, configured gate проходит.

## Backend gate

- Финальный `make test` в `services/backend`: `1091 passed, 5 skipped`, 0 failed, 8.24 s.
- `make lint` в `services/backend`: mypy clean (259 files), Ruff clean, Ruff format check clean (259 files), flake8 clean.
- Проверено более 30 релевантных сценариев: 28 bounded-name/service tests и 8 migration tests, включая Unicode boundaries, basename/control cleanup, content/UUID digest, suffix budgeting, collision retry/exhaustion, rollback и migration planning.
- Clean Architecture соблюдена: naming находится в `core/photo_names.py`, orchestration — в `core/services/photos.py`, DB race arbitration/savepoint — в repository; router не содержит naming/SQL logic. MIME validation и bounded naming выполняются до storage save; DB failure удаляет новый media object.
- NATS/AsyncAPI не затронуты; NATS howto и asyncapi validation неприменимы.

## Access verification results

Матрица совпадает с delta spec: GET остаётся Public Read с tenant selector, POST/PATCH/DELETE — Protected Write, исключений нет.

- Ранее отмечены: anonymous POST/PATCH/DELETE → `401`; authenticated owner create/update/delete success; anonymous GET list/by-id success с selector; missing/invalid selector → `401`.
- Независимый foreign-tenant live check на PostgreSQL container `7c720ddc783d`:
  - authenticated `PATCH /api/photos/{foreign_id}` → `400`, 23.834 ms; DB сохранила `qg-foreign.jpg|sentinel`;
  - authenticated `DELETE /api/photos/{foreign_id}` → `400`, 22.982 ms; DB row count остался `1`;
  - fixture удалена прямым cleanup SQL.

## Smoke и timing evidence

OpenSpec tasks использованы как явный repo-workflow override вместо legacy `docs/plans`. Acceptance основан на локальном API и реальной PostgreSQL; production/deployed auth и per-endpoint deployed timings — N/A по user waiver. Ниже сохранено дополнительное, но не обязательное deployed evidence и локальные foreign-tenant timings.

| Проверка | Surface / mode | HTTP | Timing | Результат |
|---|---|---:|---:|---|
| health | deployed ingress, anonymous | 200 | 140.753 ms | ingress доступен |
| redirect health | deployed HTTP | 308 | 89.916 ms | redirect на HTTPS |
| 1.63 policy precheck | deployed `POST /api/photos`, no cookie, JPEG 4,180,959 bytes | 401 | 4,656.004 ms | request прошёл ingress до backend; local DB count `2241 → 2241` |
| deployed login | `POST` auth endpoint | 401 | 258.202 ms | дополнительное evidence; production auth N/A |
| deployed auth/me | cookie jar после failed login | 401 | 114.943 ms | дополнительное evidence; production auth N/A |
| deployed authenticated attempt | `POST /api/photos`, cookie jar | 401 | 594.691 ms | дополнительное evidence; production upload N/A |
| 1.59 | local live API, authenticated foreign PATCH | 400 | 23.834 ms | row/object metadata неизменны |
| 1.62 | local live API, authenticated foreign DELETE | 400 | 22.982 ms | row/object сохранены |
| 1.66 | deployed ingress request 22,020,437 bytes | 413 | 24.000 ms ingress request time | upstream не вызван, подтверждено controller access log |

Локальные live smoke 1.41–1.75 приняты обновлённым OpenSpec scope; smoke pytest-файлы не создавались. Production timing completeness не требуется по waiver. Отсутствующие исторические timings не реконструировались.

## PostgreSQL discovery

- Container: `7c720ddc783d`, image `postgres:16`, compose service `db`, host port `5433`, aliases `eqsitecms-db`/`db`.
- Фактические credentials получались из container/runtime configuration и не записаны в report.
- Backend container `eqsitecms-app` использует image `sha256:30cf3d18f41f33215d6ba427fac49cd2b06468d703fcf31a425320eeb3c93fd3`; health/runtime доступен на host port `8001`.

## Frontend test gate

- `npm test`: 56 files, 494 tests passed.
- `npm run lint`: 0 errors, 414 warnings (baseline/legacy warnings; warnings присутствуют и в gallery files).
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; `/gallery` собран.
- Tests покрывают temporary/error/uploading local removal, malformed uid, server DELETE success/401/403/network retention, duplicate-delete guard, scopes present/missing, protected route, MSW API boundary и `limit/offset` reset/load-more.
- Required self-checks выполнены: direct calls находятся в API/service boundary; новых `shared/widgets/entities` нет; CMS gallery не смешан с `site-*`; pagination остаётся `limit/offset`.
- Browser Plugin/manual responsive/screenshots/Network QA: N/A по user waiver для Arch. Это не представлено как выполненный browser test; acceptance обеспечено jsdom/component/hook/MSW suite.

## Helm

- Default `helm template`: annotation `nginx.ingress.kubernetes.io/proxy-body-size: "20m"`.
- Override `--set ingressProxyBodySize=32m`: annotation `"32m"`.
- TLS secret `eqcms-backend-tls`, host `api.eqcms.ru`, path `/`, service port `8000` совпадают между renders.
- Kubernetes: ingress `cms/eqcms-backend-ingress` имеет effective annotation `20m`.
- Helm: release `eqcms-backend`, namespace `cms`, revision `19`, status `deployed`.
- Live tasks 1.64–1.66 подтверждены владельцем runtime; controller log дополнительно подтверждает `22,020,437` byte request → `413`, request time `0.024 s`, upstream не вызывался.
- Production/deployed authenticated upload: N/A по user waiver. Helm render и controlled runtime evidence являются acceptance.

## Validation и ownership

- `openspec validate fix-photo-upload-edge-cases --strict`: valid.
- Main specs не изменены; sync/archive не выполнялись.
- Root Makefile и четыре core service Makefiles содержат `.PHONY test/lint/format`; root targets используют четыре явных `$(MAKE) -C` в порядке backend → notification-service → email-service → frontend.
- Форматирующие mutating targets не запускались Quality Gate агентом; применённые format-check/static gates не изменили diff.
- `.claude/skills/api-smoke-test/credentials.json` имеет локальное runtime/config изменение вне implementation deliverable; секретные значения не читались в report и файл не относится к source/spec ownership change.

## Повторный gate

Финальный повторный review выполнен 2026-08-24 после обновления OpenSpec waiver. Backend, frontend, Helm, access matrix, migration safety, tenant isolation, ownership и full diff перепроверены; strict validation успешна, main specs не изменены. Verdict: APPROVED. Router может выполнить 3.14 sync + strict validation и затем 3.15 archive.
