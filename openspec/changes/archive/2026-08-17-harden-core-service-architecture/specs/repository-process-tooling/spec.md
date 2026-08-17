## ADDED Requirements

### Requirement: Полный non-mutating core release gate
Root tooling SHALL предоставлять отдельные fix и check commands. Aggregate check MUST без изменения tracked files запускать format-check, lint, typecheck и tests для backend, email-service, notification-service и CMS frontend; aggregate build MUST включать только эти четыре сервиса.

#### Scenario: Aggregate checks успешны
- **WHEN** Quality Gate запускает root check targets на clean worktrees
- **THEN** все включённые сервисы проверены, commands завершаются 0 и итоговый diff остаётся чистым

#### Scenario: Formatting требуется
- **WHEN** format-check обнаруживает drift
- **THEN** gate возвращает finding владельцу и не запускает auto-fix

### Requirement: Controlled core runtime gate
Root tooling SHALL валидировать compose, выполнять deterministic no-cache builds, controlled recreate, migrations, health/readiness waits, status/log capture и documented rollback только для core scope. Runtime gate MUST включать PostgreSQL, NATS, Redis и Celery evidence.

#### Scenario: Core stack готов
- **WHEN** свежие images подняты и migrations завершены
- **THEN** backend/frontend/email/notification и dependencies стабильны, readiness contracts зелёные и logs не содержат fatal/restart-loop errors

### Requirement: Синхронизированная архитектурная документация
`SERVICES.md` SHALL быть единственным каталогом бизнес-границ и включать notification-service; README и manifest SHALL использовать актуальные пути/commands и не заявлять неполный gate глобальным.

#### Scenario: Документация проверена
- **WHEN** reviewer сопоставляет SERVICES, README, manifest и root Makefile
- **THEN** список core services, роли и доступные commands согласованы
