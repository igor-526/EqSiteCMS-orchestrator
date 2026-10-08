## Why

SEO-модуль требует интеграции с внешними источниками метрик. Яндекс (Метрика и Вебмастер) — первый provider. Прежде чем реализовывать OAuth и управление счётчиками/хостами, необходимо создать foundation инфраструктуры: сервис, БД, encryption utilities, миграции, Git-репозиторий, документацию.

## What Changes

- Новый микросервис `services/yandex-service` на основе `fastapi-template` (scaffold)
- Infrastructure setup: PostgreSQL БД `yandex_service` в `docker-compose.infrastructure.yml`
- Database foundation: базовая схема БД, миграции Alembic
- Encryption foundation: Fernet encryption utilities, key management — **основа для будущего хранения токенов**
- Git setup: initial commit в `main` и `release` branches
- Documentation foundation: базовая структура SEO-документации для yandex-service
- Testing foundation: базовая структура тестов (unit/integration/access)
- Health check endpoint: `GET /health` (Public Read)
- Обновление корневого `Makefile` для работы с новым сервисом
- Обновление `services.manifest` с Git-репозиторием `git@github.com:igor-526/EqSiteCMS-yandex-service.git`

**В будущие tasks перенесено:**
- OAuth 2.0 implementation (authorize, callback, refresh endpoints)
- Управление счётчиками Яндекс.Метрика (CRUD counters)
- Управление хостами Яндекс.Вебмастер (CRUD hosts)
- NATS события при отвязке аккаунта
- Internal credentials API

## Capabilities

### New Capabilities

- `yandex-health`: Health check endpoint для проверки работоспособности сервиса

### Modified Capabilities

<!-- Не требуется: новый сервис, не меняет существующие specs -->

## Impact

**Новые компоненты:**
- `services/yandex-service/**` — scaffold нового микросервиса
- PostgreSQL БД `yandex_service` в `docker-compose.infrastructure.yml`
- Encryption utilities для будущего хранения credentials

**Изменения в инфраструктуре:**
- `docker-compose.infrastructure.yml` — добавление PostgreSQL БД `yandex_service`
- `Makefile` — команды для работы с yandex-service (`build`, `up`, `down`, `migrate`, `test`)
- `services.manifest` — регистрация нового сервиса

**Изменения в документации:**
- `docs/seo/services.md` — placeholder для yandex-service
- `services/yandex-service/README.md` — базовая документация сервиса

**Зависимости:**
- Нет (foundation task, не зависит от других сервисов)

**Внешние интеграции:**
- Нет (OAuth интеграция будет в следующих tasks)

**API access policy:**
- `GET /health` — Public Read (доступен без авторизации для мониторинга)
