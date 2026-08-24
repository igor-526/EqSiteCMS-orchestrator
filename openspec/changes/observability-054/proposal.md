## Why

Sentry и Prometheus уже вручную подключены к backend-сервисам, но единый проверяемый контракт наблюдаемости отсутствует, а оба Next.js-приложения не передают ошибки в Sentry. Из-за этого конфигурация сервисов может расходиться, сборочные переменные frontend теряться при Docker-сборке, а эксплуатация зависит от незафиксированных знаний.

## What Changes

- Проверить и унифицировать Sentry и Prometheus в `services/backend`, `services/email-service` и `services/notification-service`: настройки, инициализацию, жизненный цикл metrics server, экспонирование метрик и тестовое evidence.
- Подключить официальный Sentry SDK для Next.js в защищённый CMS frontend и публичный `site-ad`, покрыв client/server/edge runtime и используя согласованные с backend имена переменных `SENTRY_ENABLED`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_RELEASE`.
- Провести frontend-переменные через `.env`, `.env.example`, Docker build/runtime и Makefile/build workflow без публикации DSN или иных секретных значений в документации и истории репозитория.
- Добавить автоматизированные проверки disabled/enabled/invalid конфигурации и захвата ошибок без live-вызовов Sentry в unit/component tests.
- Запротоколировать архитектуру, конфигурацию, локальную проверку, production-подключение и безопасную эксплуатацию Sentry/Prometheus.
- Не добавлять и не изменять бизнес-API endpoint'ы, NATS subjects, схемы БД или access policy.

## Capabilities

### New Capabilities

- `platform-observability`: Единый контракт конфигурации, инициализации, метрик, error monitoring, тестирования и эксплуатационной документации для backend-сервисов, CMS frontend и `site-ad`.

### Modified Capabilities

Отсутствуют.

## Impact

- Backend-аудит и при необходимости исправления: `services/backend`, `services/email-service`, `services/notification-service` (settings, observability adapters, application lifecycle, зависимости, env-примеры и тесты).
- CMS frontend: `services/frontend` (Sentry SDK/configuration, Next.js config, `.env`, `.env.example`, Dockerfile, Makefile, package lock и tests).
- Public consumer: `services/site-ad` (Sentry SDK/configuration, Next.js config, `.env`, `.env.example`, Dockerfile, package lock и tests).
- Оркестрация и документация: применимые `.docker-compose/*.yml`, корневой Makefile/compose validation и новый эксплуатационный документ в `docs/operations/`.
- API Access Policy: неприменима, поскольку HTTP endpoint'ы не добавляются и не меняются; существующие `/health`, API routes и их anonymous/authenticated outcomes сохраняются.
- NATS/БД: контракты AsyncAPI, subjects, миграции и данные не меняются.
