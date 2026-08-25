## Context

Тикет `054`, дата планирования: 2026-08-24. Change затрагивает пять runtime-приложений: `services/backend`, `services/email-service`, `services/notification-service`, `services/frontend` и `services/site-ad`, а также compose/build plumbing и эксплуатационную документацию.

Текущее evidence из кода:

- во всех трёх FastAPI-сервисах установлены `sentry-sdk`, `prometheus-client` и `prometheus-fastapi-instrumentator`; Sentry включается адаптером `utils/configure_sentry.py`, а отдельный Prometheus HTTP server запускается на `0.0.0.0:9000` только при `ENVIRONMENT=production`;
- `Instrumentator().instrument(app)` регистрирует HTTP-метрики, но отдельный server использует default registry, поэтому реализация должна доказать, что scrape действительно содержит инструментированные серии, либо исправить единообразный wiring;
- Sentry-настройки трёх backend-сервисов используют одинаковые env-имена, однако код и порядок shutdown частично различаются; целевые тесты наблюдаемости отсутствуют;
- в `services/frontend` и `services/site-ad` нет Sentry SDK/config files; Dockerfile и compose передают только существующие application variables;
- документация фрагментарна и местами противоречит коду (например, backend README утверждает, что Prometheus отсутствует).

Исходный запрос требует заполнять только `.env` и `.env.example` frontend-проектов. Поэтому backend `.env*` не меняются; их существующая совместимость проверяется read-only. `SENTRY_AUTH_TOKEN`, credential-bearing/private DSN и иные секреты не переносятся в specs, docs, tests или tracked fixtures. Intended public browser DSN является endpoint identifier, а не секретом, и ожидаемо может быть встроен в client bundle; его полное значение при этом не выводится в logs/evidence сверх минимально необходимой диагностики.

## Goals / Non-Goals

**Goals:**

- определить единый и тестируемый lifecycle Sentry/Prometheus для трёх FastAPI-сервисов и исправить только доказанные расхождения;
- подключить официальный `@sentry/nextjs` к CMS frontend и `site-ad` для client/server/edge ошибок;
- сохранить одинаковые прикладные env-имена во всех сервисах: `SENTRY_ENABLED`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_RELEASE`;
- обеспечить корректное встраивание public browser-конфигурации на build stage и server-конфигурации на runtime stage контейнеров;
- получить автоматизированное и ручное evidence, включая disabled-by-default, отсутствие live network в unit tests, production build и реальный Prometheus scrape;
- создать единый runbook `docs/operations/observability.md`.

**Non-Goals:**

- добавление Grafana, Alertmanager, OpenTelemetry collector, dashboards или production credentials;
- создание бизнес-метрик, изменение API endpoint'ов, NATS/AsyncAPI, БД или access policy;
- автоматическая загрузка source maps с долгоживущим auth token из frontend `.env`; если upload потребуется, краткоживущий `SENTRY_AUTH_TOKEN` должен передаваться секретом CI и станет отдельным change;
- изменение визуального дизайна страниц помимо минимального глобального error fallback, обязательного для Next.js error capture.

## Decisions

### 1. Один backend observability adapter contract, локальная реализация в каждом сервисе

Каждый FastAPI-сервис сохраняет собственную инфраструктурную границу, но использует одинаковые настройки, правила enablement и lifecycle. Инициализация Sentry происходит до обработки запросов; при `SENTRY_ENABLED=false` SDK не инициализируется; при `true` без DSN startup/config validation завершается явной ошибкой. Prometheus запускается один раз на `0.0.0.0:9000` в production, отдает инструментированные HTTP series и корректно освобождает server/thread при shutdown.

Альтернатива — общий Python package — отклонена для этого change: сервисы являются отдельными репозиториями с независимыми lock-файлами, а вынос пакета расширит release scope. Единообразие контролируется контрактом, тестами и Quality Gate.

### 2. Официальная интеграция Next.js без live-зависимости в тестах

Оба Next.js-приложения получают `@sentry/nextjs`, стандартные server/edge/client initialization boundaries, instrumentation hook и global error capture согласно версии Next.js 15. Конфигурация строится узкой helper-функцией, чтобы отдельно тестировать disabled/enabled, sample-rate boundaries, release/environment и отсутствие инициализации без разрешения.

Альтернатива — прямой browser SDK — отклонена: она не покрывает server/edge runtime и хуже интегрируется с App Router.

### 3. Имена backend сохраняются, browser exposure делается явно на build boundary

Source-of-truth остаются `SENTRY_ENABLED`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_RELEASE`. `next.config.ts`/Sentry config явно передают допустимую browser-конфигурацию в client bundle, не вводя вторую пользовательскую матрицу `NEXT_PUBLIC_SENTRY_*`. Intended public browser DSN считается endpoint identifier, а не auth secret, поэтому его присутствие в client bundle является ожидаемым. `SENTRY_AUTH_TOKEN`, credential-bearing/private DSN и иные секреты не коммитятся и не попадают в bundle/image; полное значение public DSN не печатается в logs/evidence сверх минимально необходимой диагностики. Dockerfile объявляет Sentry `ARG` до `npm run build` и соответствующие `ENV` на builder; runtime stage получает server-side values. Compose/Make targets передают значения декларативно и одинаково.

Альтернатива — переименование в `NEXT_PUBLIC_SENTRY_*` — отклонена прямым требованием использовать backend names. Runtime-only injection browser DSN также невозможен для уже собранного client bundle.

### 4. Разделённый ownership и последовательность

1. Backend Agent владеет только тремя Python-сервисами и backend-specific tests; он сначала оформляет evidence текущего состояния, затем исправляет подтверждённые дефекты, не меняя frontend/compose/docs.
2. Frontend Agent владеет `services/frontend` и `.docker-compose/docker-compose.fe.yml`; он реализует CMS Sentry, tests и build plumbing.
3. Site Consumer Agent владеет `services/site-ad`; он реализует consumer Sentry, tests и container build plumbing.
4. После завершения трёх владельцев отдельный Documentation deliverable выполняется последовательно одним профильным агентом в `docs/operations/observability.md` и при необходимости README-ссылках, используя фактический итоговый diff.
5. Один Quality Gate проверяет совокупный diff, возвращает findings владельцам, повторяет проверки после fixes. После успешного gate Router синхронизирует delta spec, strict-validates и архивирует change.

Пересечение `package-lock.json`, `next.config.ts`, Dockerfile или env-файлов между агентами запрещено; каждый frontend-проект имеет одного владельца.

### 5. API Access Policy и данные

Endpoint changes отсутствуют, поэтому access matrix неприменима. Существующие `/health`, бизнес-API и auth outcomes не меняются. Prometheus listener `:9000` является инфраструктурным scrape port, а не новым FastAPI endpoint; compose не должен публиковать его на host/public network без отдельного security design. Ни Sentry events, ни метрики не должны содержать auth cookies, authorization headers, DSN credentials, tenant secrets, SMTP/DB credentials или request bodies по умолчанию.

### 6. Backend test strategy

Observability рассматривается как одна сквозная backend capability, поэтому план содержит 30 разнообразных unit-сценариев и 30 live smoke-сценариев для трёх сервисов. Smoke выполняются только через skill `smoke` на поднятых контейнерах, не создаются как pytest-файлы, и используют реальные PostgreSQL/NATS/Redis зависимости core stack.

#### PostgreSQL для smoke-тестов

Поиск 2026-08-24 по требуемым labels `com.docker.compose.project=eqsitecms` не совпал с фактическим project label `eqsitecms-core`; применён fallback по имени `eqsitecms-db`/image `postgres`. `docker inspect eqsitecms-db` обнаружил container id `7c720ddc783d`, image `postgres:16`, service label `db`, aliases `eqsitecms-db`/`db`, `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`, host port `5433`. Исполнитель MUST повторить discovery непосредственно перед smoke и использовать свежие inspect-значения; приведённые данные являются evidence планирования, а не хардкодом.

### 7. Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| CMS Sentry config/instrumentation/global error | Ошибки client/server/edge захватываются только при enabled config; fallback сохраняется | unit для disabled/enabled/invalid/rate/release, component для global error, mocked SDK | anonymous и authenticated ошибки одинаково санитизируются; auth routing не меняется | `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` |
| CMS Docker/Make/compose boundary | Build-time browser config и runtime server config доходят до приложения | static assertions + production container build с placeholder DSN | Protected Admin UI и существующие `401/403` flow не меняются | `docker compose config`, `make build`, `rg` checks |
| site-ad Sentry config/instrumentation/global error | Public consumer client/server/edge ошибки захватываются без CMS mixing | unit/component tests с mocked SDK, production build | anonymous Public Read поведение и tenant selector не меняются | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` |

Unit/component tests MUST mock Sentry and MUST NOT call live backend or Sentry. Изменений list/table/pagination/permissioned actions нет, поэтому pagination и scope-action test minima неприменимы; регрессия auth/public boundaries остаётся частью static/manual checks.

### Manual QA steps (UI тестирование)

1. С выключенным Sentry (`SENTRY_ENABLED=false`) собрать и открыть CMS на `/login`, затем authenticated dashboard; убедиться, что страницы работают, browser console/network не содержит Sentry envelopes, layout не изменён.
2. Собрать CMS с тестовым non-production DSN и `SENTRY_ENABLED=true`; вызвать контролируемую ошибку только существующим безопасным test mechanism Sentry/локальным throw в QA build, убедиться в global fallback и одном sanitized event. Не добавлять публичный debug route в production.
3. Повторить CMS flow для anonymous и authenticated состояния; auth redirect/block и отображение backend `401/403` должны остаться прежними.
4. Открыть CMS на desktop 1440px, tablet 768px и mobile 390px; вызвать error fallback и проверить отсутствие overlap/обрезки текста/кнопки retry.
5. С выключенным Sentry открыть основные public routes `site-ad` без CMS cookie и с валидным tenant selector; убедиться, что Public Read render не изменился и envelope-запросов нет.
6. В QA build `site-ad` с тестовым DSN вызвать контролируемую client и server ошибку, проверить один sanitized event и корректный fallback без раскрытия selector/cookie/request body.
7. Проверить fallback `site-ad` на 1440/768/390px без overlap и нарушения SSR/SEO shell.
8. Для обоих приложений проверить generic error, повторный render/retry и навигацию после ошибки; приложение не должно застревать в цикле повторной отправки.
9. Итоговый QA report фиксирует passed/failed steps; для failed responsive/error cases прикладывает screenshots, для failed network cases — status и sanitized body без DSN/token/cookie.

## Risks / Trade-offs

- [Build-time browser config может устареть при runtime замене env] → документировать обязательную rebuild при изменении browser Sentry variables и проверять Docker build args.
- [Public browser DSN попадёт в client bundle] → считать это ожидаемым свойством endpoint identifier, не считать такой DSN секретом; запретить `SENTRY_AUTH_TOKEN`, credential-bearing/private DSN и иные secrets в bundle/image, не выводить полное значение DSN в logs/evidence и включить server-side Sentry project controls.
- [Дублирование событий между Next.js boundaries] → использовать официальный instrumentation path и тестировать один capture на одну ошибку.
- [Prometheus отдельного процесса/порта не содержит FastAPI registry либо конфликтует при нескольких workers] → проверить реальный scrape и startup/shutdown; зафиксировать single-process ограничение или выбрать единый supported multiprocess design до production rollout.
- [Port 9000 случайно станет публичным] → оставлять его только во внутренней Docker network, проверять compose effective config.
- [Manual changes уже частично некорректны] → Backend Agent сначала пишет evidence/findings, затем минимально исправляет; Quality Gate сравнивает три реализации.
- [`.env` может быть локальным/ignored файлом] → изменять только указанные frontend `.env` локально без публикации реальных значений; tracked contract хранится в `.env.example`.

## Migration Plan

1. Получить пользовательское approval apply-ready change.
2. Выполнить независимые backend, CMS frontend и site-ad deliverables с локальными тестами.
3. Собрать контейнеры с disabled defaults; затем QA build с тестовым non-production Sentry project.
4. Провести live scrape и smoke на core stack, повторно обнаружив PostgreSQL через `docker inspect`.
5. Создать runbook по фактической реализации и выполнить общий Quality Gate.
6. Production rollout: сначала Sentry enabled с `traces_sample_rate=0`, затем малый согласованный rate; Prometheus scrape подключать только из внутренней сети.
7. Rollback: выставить `SENTRY_ENABLED=false` и пересобрать frontend client bundles; при backend regression вернуть observability-only commit/image, сохранив business API и БД неизменными.

## Open Questions

- Нужны ли в текущем deployment source maps? По умолчанию change их не загружает, чтобы не вводить `SENTRY_AUTH_TOKEN`; отдельное решение потребуется при подтверждении CI secret store и retention policy.
- Какой внешний Prometheus scraper и retention используются в production? Change гарантирует внутренний scrape contract, но не создаёт инфраструктуру хранения/алертинга.
