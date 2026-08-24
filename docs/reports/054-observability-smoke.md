# 054 Observability — backend live smoke evidence

Дата повторного прогона: 2026-08-24 (Europe/Moscow).

Результат: **31/31 PASS**, 0 FAIL. Прогон выполнен по skill
`.codex/skills/api-smoke-test/SKILL.md`, без создания pytest smoke-файлов.
Все значения credentials, DSN и паролей удалены из evidence.

## Окружение и discovery

Первичный поиск `docker ps --filter label=com.docker.compose.project=eqsitecms
--filter label=com.docker.compose.service=db` вернул `0` контейнеров. Применён
предусмотренный fallback по именам PostgreSQL-контейнеров.

| Контур | Container ID | Image | Compose project/service | Aliases | Host port | DB env |
|---|---:|---|---|---|---:|---|
| Backend Core | `7c720ddc783d` | `postgres:16` | `eqsitecms-core/db` | `eqsitecms-db`, `db` | 5433 | `POSTGRES_DB/USER/PASSWORD=<configured>` |
| Notification | `71ffa0bcde12` | `postgres:16` | `eqsitecms-core/db-notifications` | `eqsitecms-db-notifications`, `db-notifications` | 5434 | `POSTGRES_DB/USER/PASSWORD=<configured>` |
| Email | `4e0c9823ee32` | `postgres:16` | `eqsitecms-core/db-email` | `eqsitecms-db-email`, `db-email` | 5435 | `POSTGRES_DB/USER/PASSWORD=<configured>` |

Live dependencies: `eqsitecms-nats` и `eqsitecms-redis` были running; все три
application containers были healthy. Production QA запускался отдельными
`docker exec -e ENVIRONMENT=production ... uvicorn ... --port 8010` процессами
в существующих контейнерах. Для прохождения уже существующей production-secret
validation использовались только ephemeral QA placeholders для Backend S3 и
Email Redis; env-файлы, image metadata и tracked artifacts не менялись.

## Сценарии 1.43–1.73

Время HTTP указано wall-clock для каждого реально выполненного endpoint request.
`n/a` означает, что сценарий проверяет socket/process/config, а не HTTP endpoint.

| ID | Scenario | Command / mode | Expected | Actual, включая timing | Result |
|---|---|---|---|---|---|
| 1.43 | Backend Core на real PostgreSQL | production QA process, fresh fallback inspect | startup на discovered DB | `/health` 200 in **7.292 ms** | PASS |
| 1.44 | Notification на real PostgreSQL/NATS | production QA process, live `db-notifications` + NATS | startup ready | `/health` 200 in **9.189 ms** | PASS |
| 1.45 | Email на real PostgreSQL/NATS/Redis | production QA process, live `db-email` + NATS + Redis | startup ready | `/health` 200 in **9.584 ms** | PASS |
| 1.46 | Backend `/health` | internal GET `:8010/health` | 200 | 200, **7.292 ms** | PASS |
| 1.47 | Notification `/health` | internal GET `:8010/health` | 200 | 200, **9.189 ms** | PASS |
| 1.48 | Email `/health` | internal GET `:8010/health` | 200 | 200, **9.584 ms** | PASS |
| 1.49 | Backend production metrics | internal GET `:9000/metrics` | 200 + Prometheus content type | 200, `text/plain; version=0.0.4`, **1.960 ms** | PASS |
| 1.50 | Notification production metrics | internal GET `:9000/metrics` | 200 + Prometheus content type | 200, `text/plain; version=0.0.4`, **2.205 ms** | PASS |
| 1.51 | Email production metrics | internal GET `:9000/metrics` | 200 + Prometheus content type | 200, `text/plain; version=0.0.4`, **2.020 ms** | PASS |
| 1.52 | Backend HTTP metric after traffic | GET health then GET metrics | `http_requests_total`, no credential | health **1.922 ms**, scrape **1.802 ms**; family present, forbidden list empty | PASS |
| 1.53 | Notification HTTP metric after traffic | GET health then GET metrics | same | health **1.851 ms**, scrape **2.768 ms**; family present, forbidden list empty | PASS |
| 1.54 | Email HTTP metric after traffic | GET health then GET metrics | same | health **0.963 ms**, scrape **1.906 ms**; family present, forbidden list empty | PASS |
| 1.55 | Development Backend не слушает metrics | socket connect `127.0.0.1:9000` | refused | `connect_ex=111`; control GET health 200 in **11.509 ms** | PASS |
| 1.56 | Development Notification не слушает metrics | socket connect | refused | `connect_ex=111`; control GET health 200 in **12.396 ms** | PASS |
| 1.57 | Development Email не слушает metrics | socket connect | refused | `connect_ex=111`; control GET health 200 in **10.088 ms** | PASS |
| 1.58 | Backend repeated scrape increments | GET metrics → GET health → GET metrics | no duplicate registration, counter grows | counter `2→3`; requests **1.960/1.922/1.802 ms** | PASS |
| 1.59 | Notification repeated scrape increments | same | same | counter `2→3`; requests **2.205/1.851/2.768 ms** | PASS |
| 1.60 | Email repeated scrape increments | same | same | counter `2→3`; requests **2.020/0.963/1.906 ms** | PASS |
| 1.61 | Backend graceful stop | SIGTERM targeted QA uvicorn PIDs; socket poll | `:9000` released | refused after cleanup; all three released within final cleanup window `<22.5 s`; n/a | PASS |
| 1.62 | Notification graceful stop | same, live consumer/NATS | listener released, process stops | refused; unit cleanup-order evidence green; n/a | PASS |
| 1.63 | Email graceful stop | same, live consumer/DB | listener released, process stops | refused; unit cleanup-order evidence green; n/a | PASS |
| 1.64 | Backend restart after stop | restart production QA process | no address-in-use | ready; GET health 200 in **8.578 ms** | PASS |
| 1.65 | Notification restart after stop | restart production QA process | no address-in-use | ready; GET health 200 in **9.445 ms** | PASS |
| 1.66 | Email restart after stop | restart production QA process | no address-in-use | ready; GET health 200 in **10.994 ms** | PASS |
| 1.67 | Disabled Sentry readiness | existing disabled dev containers | no DSN required, all ready | Backend/Email/Notification GET health 200 in **11.509/10.088/12.396 ms** | PASS |
| 1.68 | Enabled Sentry без DSN | isolated settings import in each container | explicit config failure, no ready process | exits `1/1/1`, message `SENTRY_DSN is required`, **198/600/547 ms**; n/a | PASS |
| 1.69 | Placeholder DSN не логируется | enabled production QA startup, captured stdout/stderr | value absent | value/DSN absent; GET health 200 in **14.259/10.673/10.522 ms** | PASS |
| 1.70 | Metrics не содержат secrets | scrape после real traffic; scan authorization/cookie/service key/DB/SMTP names | none found | forbidden list empty in all three; scrape **1.802/2.768/1.906 ms** | PASS |
| 1.71 | Anonymous Public Read regression | anonymous GET `http://localhost:8001/health` | 200 | 200 (container control timing **11.509 ms**) | PASS |
| 1.72 | Protected write regression | anonymous PATCH `/api/users/me`; затем cookie login + authenticated PATCH | anonymous 401/403, authenticated success | anonymous 401 **2.909 ms**; login 200 **24.122 ms**; `/auth/me` 200 **21.522 ms**; authenticated PATCH 200 **26.953 ms** | PASS |
| 1.73 | Cleanup smoke fixtures | no mutating fixture request; unlink cookie/response temp files | no DB rows/files left | zero created DB rows; temp artifacts removed; n/a | PASS |

## Финальный cleanup

- Все ephemeral production/enabled-Sentry QA processes получили SIGTERM.
- `:9000` после финального poll закрыт во всех трёх containers (`connect_ex=111`).
- Обычные development processes сохранены: Backend, Email и Notification
  `/health` вернули 200 за **8.408 ms**, **10.190 ms**, **9.335 ms** соответственно.
- Docker port inspection подтвердил отсутствие публикации `9000`: Backend имеет
  только host `8001→8000`, Email и Notification имеют internal `8000` без host binding.
- После smoke не создавались строки БД и не менялись API, NATS/AsyncAPI или DB schema.

