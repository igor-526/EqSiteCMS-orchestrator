# Review: metrica-stats-parsing

**Профиль:** QG-FULL · **Вердикт:** APPROVED  
**Дата синтеза:** 2026-10-26 · runtime evidence: 2026-10-26  
**Ветки:** root/Метрика `metrica-stats-parsing`; Yandex `feature/metrica-stats-parsing-ys-1`.

## Итог и контекст

В рамках утверждённого dev-контракта change готов к следующему этапу: хранение дневной статистики, PostgreSQL-очередь, ограниченный по памяти ELT, Celery worker/beat, M2 и передача ciphertext через Y5 проверены. Остаточных blocking/minor findings нет. Это **не разрешение production deployment/release**: обязательный сетевой gate Q2 сохраняется.

Синтез основан на handoffs и сохранённых evidence; тесты и ревью реализации не повторялись.

## Ссылки и approval

- [Задача](../tasks/101_metrica_client.md).
- [Proposal](../../openspec/changes/metrica-stats-parsing/proposal.md), [design / access matrix / решения пользователя](../../openspec/changes/metrica-stats-parsing/design.md), [tasks](../../openspec/changes/metrica-stats-parsing/tasks.md).
- [Delta specs](../../openspec/changes/metrica-stats-parsing/specs/): `metrica-stats-storage`, `metrica-parse-queue`, `metrica-stats-ingestion`, `metrica-parse-trigger`, `yandex-peer-http-contract`.
- Approval scope: решения пользователя ревизии 2 в design; отдельных пользовательских waiver нет.
- CONTRACTS: `npx -y @fission-ai/openspec validate metrica-stats-parsing --strict` → valid, exit 0; `.qa/metrica-stats-parsing/qg-contracts/openspec-validation.log`.

## Lanes

| Lane | Статус и доказательства (от корня репозитория) |
|---|---|
| QG-ENV | пройден — `.qa/metrica-stats-parsing/qg-env/results.md`, `ready.json`, `status-after.json`, `verification.json` |
| QG-BE | пройден — `.qa/metrica-stats-parsing/qg-be/verification.json`, `matrix.json`, format/lint/test logs |
| QG-CONTRACTS | пройден, C-01/C-02 закрыты единственным recheck — `.qa/metrica-stats-parsing/qg-contracts/results.md`, `recheck-tests.log`, `recheck-probes.json` |
| QG-LIVE | пройден — `.qa/metrica-stats-parsing/qg-live/summary.json`, независимый повтор ключевых сценариев |
| QG-FE-AUTO / QG-FE-MANUAL | неприменимо — frontend/UI diff нет |
| QG-FORMAT | отдельного lane нет; процедура выполнена BE в обоих сервисах |
| QG-SYNTH | завершён — этот отчёт |

ENV: stackctl ready/rebuild двух API PASS; upgrade/current/heads = `20261026_0002`; три PostgreSQL PASS, Redis DB 5/6 PONG, health API 200, адресный worker pong, один beat. Repair attempts инфраструктуры: **0**. LIVE штатно обновил Compose runtime до FIX `642af6a`: Метрика localhost:32772, Yandex :8007, SEO :32768; head/pong/beat подтверждены повторно. Неустранённых blocked-env нет.

## Unit / integration и закрытие fixes

| Проверка | Результат |
|---|---|
| Метрика: `make format`, `make lint`; `TEST_DATABASE_URL=… make test-cov` | PASS; 656 passed, 100% строк/ветвей; остаточных test schemas 0 |
| Yandex: `make format`, `make lint`, `make test` | PASS; 664 passed, 7 deselected, 2 xfailed |
| CONTRACTS targeted Yandex / Метрика | 82 / 424 passed; ASGI/crypto probes PASS |
| FIX-1 targeted / lint | 52 passed / PASS |
| Независимый CONTRACTS recheck | 43 passed; canonical kwargs и TTL reproducer PASS |

Форматирование не оставило diff. BE проверил существенные assertions, транзакции/checkpoints, leases/locking, retries, bounded memory и credentials flow.
C-01 (`settings.py`, `populate_by_name=True`) и C-02 (`workers/app_factory.py`, `task_expires=3600`) **закрыты**: сервис `642af6a`, root `017e94e`, регрессионные тесты и независимый recheck. Полные suites относятся к состоянию до FIX; после него проверен затронутый slice и обновлён live runtime, без ложного заявления о новом полном прогоне.

## Покрытие Test matrix

| ID | Фактическое покрытие |
|---|---|
| IT-MS-01,07 | `tests/integration/test_schema_postgres.py`: миграции/constraints, реальная PostgreSQL |
| IT-MS-02..06 | `tests/integration/test_stats_repository_postgres.py`: upsert/агрегация/изоляция |
| IT-MS-08..14 | `tests/integration/test_tasks_repository_postgres.py`: FIFO/concurrency/lease/atomicity |
| UT-MS-01..16 | Точная ID → test-трассировка в `.qa/metrica-stats-parsing/qg-be/matrix.json`; full suite PASS |
| AT-MS-01..05 / 06 | `tests/api/test_parse_api.py` / `test_counters_api.py`, `test_health.py` |
| UT-YS-01..04 | Yandex `tests/unit/test_service_authorization.py`, `tests/api/test_servicing.py` |
| SM-MS-01..13 | `.qa/metrica-stats-parsing/smoke/results.md`: 13/13; ограничения M1 ниже |
| Независимые SM-MS-03,05,06,08,11,13 | QG-LIVE PASS; дополнительно SM-MS-12/SEO и H1 PASS |

Непокрытых ID нет; не утверждается полный live resume с уже сохранённой непустой страницей: авария была до первой зафиксированной страницы. Resume/rollback дополнительно покрыты UT/IT. Live foreign-срез пуст, новые чужие данные не создавались; непустая изоляция проверена IT.

## SMOKE и времена

| Сценарий / endpoint | HTTP | Время, мс | Результат |
|---|---|---|---|
| SM-MS-03 POST `/api/metrica/stats/parse` anonymous | 200 | 309.689 | два queued |
| SM-MS-06 тот же POST, повтор | 200 | 72.267 | inserted=0, updated=35/26, суммы прежние |
| SM-MS-08 тот же POST, 20 дней | 200 | 70.742 | 8 succeeded, max_running=1 |
| SM-MS-13 тот же POST, recovery | 200 | 74.887 | две duplicate deliveries; lease 600s, attempts=1, checkpoint 1→53 |
| H1 GET `/health` | 200 | 8.987 | прежний контракт |

Timings: `.qa/metrica-stats-parsing/qg-live/*http.json`, `H1.json`; остальные ответы/времена — `.qa/metrica-stats-parsing/smoke/SM-MS-*.json`.
Свежая API ↔ PostgreSQL сверка: pages 35 строк, суммы visits/users/pageviews/bounces/duration = 176/169/304/25/18844; queries 26 строк, 29/29/61/3/5704. Коллизия SEO объясняет 27 непустых API запросов → 26 строк БД. Recovery: 1180 выборок, max_running=1. Финал: 48 succeeded, active/failed/deleted=0; секрет-скан PASS.

## Access verification results

M2 — явное Private Peer Write exception; Y5/M1 — Sensitive Private Peer Read exceptions; H1 — Public Read. Anonymous, Cookie-only, Bearer-only проверены CONTRACTS, а не подменены CMS-login: peer-контракт намеренно не проверяет Cookie/Bearer. M2 валидный 200, invalid/active/unbound 400, безопасная проекция без account/token/ciphertext; Y5 200 только ciphertext, malformed/unknown 400; owner/foreign одинаковы в утверждённой peer trust boundary. `equestrian_id` M2 — resource ID, не tenant selector. H1 200. M1 success 200/missing 400 проверен автономным ASGI с синтетическими данными; live — безопасная ветка 400. Полные access matrices и local 200/204/400 подтверждены CONTRACTS.

## Findings, Pre-existing и ограничения

- Открытые blocking/minor/blocked-env: **нет**. C-01/C-02 закрыты, см. выше.
- **Pre-existing:** нет aliases stackctl для worker/beat/SEO; обход штатным Compose/Docker, без починки tooling. Router предложить отдельную задачу `docs/tasks` на расширение aliases; этот unit её не создаёт. Старые порты в ранних evidence не являются текущим runtime.
- **Production gate Q2:** API dev-стека опубликованы на interfaces (0.0.0.0/[::]); production isolation **не доказана**. До production deployment/release необходимо отдельное подтверждение защиты чувствительных peer APIs от внешних anonymous callers. Это ограничение утверждённого dev scope, не user waiver и не одобрение публичного production-доступа.
- Настоящий M1 success с token/ciphertext в URL намеренно не вызывался из-за access-log утечки; безопасная автономная ветка CONTRACTS компенсирует проверку контракта, но не доказывает безопасность реальных URL/access logs.
- NATS trigger, status endpoint и token rotation вне утверждённого scope.
- Redis credentials читаются только из собственного `.env` Метрики. Одноразовое копирование Router из `.docker-compose/.env` было явно разрешено пользователем (design); runtime от оркестратора не зависит. Секреты не включены в отчёт.
- **Waivers:** отсутствуют; `APPROVED_WITH_WAIVER` не применяется.

## Изменённые файлы change (для shipctl plan)

Пути от корня монорепозитория, сгруппированы по каталогу; полный построчный реестр: `.qa/metrica-stats-parsing/qg-synth/changed-paths.txt`. Посторонний dirty `dsh/home/profiles/web/cordis.patch.yml` исключён.

- `.docker-compose/`: `docker-compose.ya_metrica.yml`
- `agents/howto/`: `celery-protocols.md`
- `agents/`: `redis-databases.yaml`
- `docs/reports/`: `metrica-stats-parsing.md`
- `openspec/changes/metrica-stats-parsing/`: `.openspec.yaml`, `design.md`, `proposal.md`, `tasks.md`
- `openspec/changes/metrica-stats-parsing/specs/metrica-parse-queue/`: `spec.md`
- `openspec/changes/metrica-stats-parsing/specs/metrica-parse-trigger/`: `spec.md`
- `openspec/changes/metrica-stats-parsing/specs/metrica-stats-ingestion/`: `spec.md`
- `openspec/changes/metrica-stats-parsing/specs/metrica-stats-storage/`: `spec.md`
- `openspec/changes/metrica-stats-parsing/specs/yandex-peer-http-contract/`: `spec.md`
- `services/ya-metrica-service/`: `.env.example`, `README.md`, `pyproject.toml`, `uv.lock`
- `services/ya-metrica-service/src/api/`: `parse.py`
- `services/ya-metrica-service/src/clients/`: `__init__.py`, `base.py`, `seo_service.py`, `yandex_metrica.py`, `yandex_metrica_stat.py`, `yandex_service.py`
- `services/ya-metrica-service/src/containers/`: `application.py`, `clients.py`, `repositories.py`, `services.py`, `settings.py`
- `services/ya-metrica-service/src/core/entities/`: `__init__.py`, `metrica_parse.py`, `metrica_stats.py`
- `services/ya-metrica-service/src/core/exceptions/`: `__init__.py`, `parse.py`, `peer.py`
- `services/ya-metrica-service/src/core/protocols/clients/`: `__init__.py`, `seo_service.py`, `yandex_metrica_stat.py`, `yandex_service.py`
- `services/ya-metrica-service/src/core/protocols/`: `parse_dispatcher.py`
- `services/ya-metrica-service/src/core/protocols/repositories/`: `__init__.py`, `metrica_parse.py`, `metrica_stats.py`
- `services/ya-metrica-service/src/core/schemas/api/`: `parse.py`
- `services/ya-metrica-service/src/core/schemas/clients/`: `seo_service.py`, `yandex_metrica_stat.py`, `yandex_service.py`
- `services/ya-metrica-service/src/core/schemas/`: `parse.py`
- `services/ya-metrica-service/src/core/services/`: `__init__.py`, `parse_date_resolver.py`, `parse_decomposer.py`, `parse_dispatch_service.py`, `parse_enqueue_service.py`, `parse_job_factory.py`, `parse_retry_policy.py`, `parse_task_runner.py`, `stat_ingestion_service.py`
- `services/ya-metrica-service/src/`: `main.py`, `settings.py`
- `services/ya-metrica-service/src/migration/versions/`: `20261026_0002_metrica_stats.py`
- `services/ya-metrica-service/src/models/`: `__init__.py`, `metrica_parse.py`, `metrica_stats.py`
- `services/ya-metrica-service/src/repositories/`: `__init__.py`, `metrica_parse_run_repository.py`, `metrica_parse_task_repository.py`, `metrica_stats_repository.py`
- `services/ya-metrica-service/src/utils/`: `basemodel.py`, `database.py`
- `services/ya-metrica-service/src/workers/`: `__init__.py`, `app_factory.py`, `celery_app.py`, `dispatcher.py`
- `services/ya-metrica-service/src/workers/tasks/`: `__init__.py`, `metrica_parse.py`
- `services/ya-metrica-service/tests/api/`: `test_counters_api.py`, `test_parse_api.py`
- `services/ya-metrica-service/tests/clients/`: `conftest.py`, `test_base_client.py`, `test_seo_service.py`, `test_yandex_metrica.py`, `test_yandex_metrica_stat.py`, `test_yandex_service.py`
- `services/ya-metrica-service/tests/integration/`: `conftest.py`, `test_schema_postgres.py`, `test_stats_repository_postgres.py`, `test_tasks_repository_postgres.py`
- `services/ya-metrica-service/tests/unit/`: `test_change_guards.py`, `test_containers.py`, `test_database.py`, `test_migrations.py`, `test_parse_date_resolver.py`, `test_parse_decomposer.py`, `test_parse_dispatch_service.py`, `test_parse_enqueue_service.py`, `test_parse_job_factory.py`, `test_parse_retry_policy.py`, `test_parse_task_runner.py`, `test_settings.py`, `test_stat_ingestion_service.py`
- `services/ya-metrica-service/tests/workers/`: `test_celery_app.py`, `test_metrica_parse_tasks.py`
- `services/yandex-service/`: `README.md`
- `services/yandex-service/src/api/`: `servicing.py`
- `services/yandex-service/src/containers/`: `services.py`
- `services/yandex-service/src/core/schemas/api/`: `service_authorization.py`
- `services/yandex-service/src/core/services/`: `yandex_service_authorization_service.py`
- `services/yandex-service/tests/api/`: `test_servicing.py`
- `services/yandex-service/tests/unit/`: `test_containers.py`, `test_schemas.py`, `test_service_authorization.py`

## Следующий этап

QG-SYNTH.1 завершён. Change готов к sync/archive workflow **через Router**: sync пяти delta capabilities, повторные OpenSpec status/strict validation, затем archive; финализация по approval gates. Этот unit не выполнял sync/archive, commit, merge или push. Production release до закрытия Q2 запрещён независимо от завершения dev change.
