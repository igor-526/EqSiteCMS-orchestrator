## Context

**Текущее состояние:**
- SEO-модуль требует интеграции с внешними sources (Яндекс.Метрика, Яндекс.Вебмастер)
- Для реализации OAuth и управления credentials нужна инфраструктурная основа: сервис, БД, encryption utilities
- Существует `fastapi-template` для создания новых микросервисов
- В будущем этот сервис будет хранить credentials и предоставлять их парсерам

**Stakeholders:**
- Backend-агент (реализация foundation)
- Quality Gate (проверка foundation infrastructure, encryption setup)

**Constraints:**
- Токены должны храниться в зашифрованном виде (compliance) — **encryption foundation обязателен**
- БД в infrastructure docker-compose, приложение — отдельный docker-compose
- Git: initial commit в `main` и `release` после foundation setup
- Сервис должен быть готов к разработке (контейнеры поднимаются, миграции работают)

## Goals / Non-Goals

**Goals:**
- Создать infrastructure foundation для yandex-service (docker-compose, PostgreSQL, Makefile)
- Подготовить базовую структуру сервиса из `fastapi-template`
- Реализовать encryption foundation (Fernet utilities, key management) — основа для будущих токенов
- Настроить Git-репозиторий с initial commit в `main` и `release`
- Создать базовую документацию и структуру тестов
- Реализовать health check endpoint для мониторинга

**Non-Goals:**
- OAuth 2.0 implementation (будет в следующих tasks)
- Управление счётчиками и хостами (будет в следующих tasks)
- NATS интеграция (будет в следующих tasks)
- Internal credentials API (будет в следующих tasks)
- UI для OAuth flow (будет в следующих tasks)
- Мониторинг и alerting (будет в следующих tasks)
- Helm и CI/CD инфраструктура (не на данном этапе)

## Decisions

### D1: Encryption Foundation

**Решение:** Реализовать encryption utilities на основе Fernet (symmetric encryption) с key management через environment variable.

**Rationale:**
- Fernet обеспечивает authenticated encryption (AES-128 CBC + HMAC-SHA256)
- Ключ шифрования хранится в переменной окружения `YANDEX_ENCRYPTION_KEY`
- Это foundation для будущего хранения OAuth токенов — **обязательная часть архитектуры**
- Trade-off: Если `YANDEX_ENCRYPTION_KEY` утрачен, все токены станут недоступны (требуется re-authorization пользователей в будущем)

**Alternatives considered:**
- ❌ Plain text storage — не соответствует compliance
- ❌ Asymmetric encryption (RSA) — избыточно, нет необходимости в public key distribution
- ❌ AWS KMS / HashiCorp Vault — избыточны для foundation этапа
- ✅ Fernet (symmetric) — баланс между безопасностью и простотой, готов к использованию

### D2: Database Schema Foundation

**Решение:** Создать минимальную схему БД с одной таблицей `yandex_accounts` (без foreign keys на счётчики/хосты).

**Rationale:**
- Таблица `yandex_accounts` будет использоваться для хранения OAuth credentials в будущем
- Схема создаётся сейчас, чтобы foundation был готов к расширению
- Поля: `id`, `user_id`, `encrypted_access_token`, `encrypted_refresh_token`, `expires_at`, `requires_reauth`, `deleted_at`, `created_at`
- Счётчики и хосты будут добавлены в следующих tasks

**Schema (foundation):**
```sql
CREATE TABLE yandex_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    encrypted_access_token TEXT,
    encrypted_refresh_token TEXT,
    expires_at TIMESTAMP,
    requires_reauth BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Alternatives considered:**
- ❌ Отложить схему БД до OAuth implementation — нарушает foundation цель
- ❌ Создать сразу все таблицы (counters, hosts) — избыточно для foundation
- ✅ Минимальная схема с одной таблицей — достаточно для encryption foundation

### D3: Infrastructure Separation

**Решение:**
- `docker-compose.infrastructure.yml` — PostgreSQL БД `yandex_service` с credentials из `.env.infrastructure`
- `services/yandex-service/docker-compose.yml` — приложение и миграции с credentials из `services/yandex-service/.env`
- Креды БД дублируются в обоих `.env` файлах

**Rationale:**
- Infrastructure БД может быть запущена независимо от приложения
- Приложение не поднимается с `env` инфраструктуры (separation of concerns)
- Это стандартный паттерн для всех сервисов EqSiteCMS

**Alternatives considered:**
- ❌ Один `.env` для всех компонентов — tight coupling
- ❌ Приложение поднимается с `env` инфраструктуры — нарушает separation
- ✅ Дублирование credentials — явное разделение concerns

## Risks / Trade-offs

### R1: Потеря ключа шифрования

**Risk:** Если `YANDEX_ENCRYPTION_KEY` утрачен, все сохранённые токены (в будущем) становятся недоступны.

**Mitigation:**
- Ключ хранится в `.env` файле с restricted permissions (600)
- В production: ключ будет храниться в secrets management (например, AWS Secrets Manager)
- Backup ключа в secure vault (будет настроено перед production deployment)
- Процедура recovery: пользователи должны пройти re-authorization через OAuth (в будущем)

### R2: БД credential duplication

**Risk:** Креденшиалы БД дублируются в `.env.infrastructure` и `services/yandex-service/.env` — риск рассинхронизации.

**Mitigation:**
- Документация явно указывает на необходимость синхронизации
- В будущем: shared secrets через Docker secrets или Consul
- На foundation этапе: manual sync с явной проверкой в verification steps

## Migration Plan

### Deployment Steps

1. **Infrastructure:**
   - Обновить `docker-compose.infrastructure.yml`: добавить PostgreSQL БД `yandex_service`
   - Запустить инфраструктуру: `make infra-up`
   - Проверить доступность БД: `psql -h localhost -U yandex_user -d yandex_service -c "SELECT 1"`

2. **Service Setup:**
   - Скопировать `fastapi-template` в `services/yandex-service`
   - Создать `.env` с credentials БД и encryption key
   - Запустить миграции: `make migrate SERVICE=yandex-service`
   - Запустить сервис: `make up SERVICE=yandex-service`

3. **Git Initialization:**
   - Инициализировать Git: `cd services/yandex-service && git init`
   - Зафиксировать foundation код: `git add . && git commit -m "Initial commit: yandex-service foundation"`
   - Push в `main`: `git push -u origin main`
   - Создать `release` branch: `git checkout -b release && git push -u origin release`

4. **Documentation:**
   - Создать `services/yandex-service/README.md` с базовой документацией
   - Обновить `docs/seo/services.md` с placeholder для yandex-service

### Rollback Strategy

- **Если сервис не стартует:** Откатить docker-compose изменения, удалить БД `yandex_service`
- **Если миграции не применяются:** Откатить миграции через Alembic `downgrade`, удалить БД

### Verification

- Unit tests: `make test SERVICE=yandex-service` (encryption utilities)
- Smoke tests: `curl http://localhost:8000/health` → `200 OK {"status": "healthy"}`
- Infrastructure check: `docker-compose ps` → yandex-service container running

## Open Questions

### Q1: Multi-tenant architecture

**Question:** Может ли один пользователь привязать несколько аккаунтов Яндекс?

**Options:**
- A: Один пользователь = один аккаунт Яндекс (1:1)
- B: Один пользователь = несколько аккаунтов Яндекс (1:N)

**Decision:** Выбор B — один пользователь может привязать несколько аккаунтов Яндекс. Таблица `yandex_accounts` имеет поле `user_id` (UUID, без foreign key на данном foundation этапе). Это позволит пользователям управлять метриками нескольких организаций в будущем.

### Q2: Encryption key rotation

**Question:** Нужен ли механизм ротации encryption key на foundation этапе?

**Options:**
- A: Реализовать key versioning и механизм re-encryption
- B: Отложить на production этап

**Decision:** Выбор B — на foundation этапе ротация не критична. Ключ генерируется один раз и документируется в README. Key rotation будет добавлен перед production deployment.
