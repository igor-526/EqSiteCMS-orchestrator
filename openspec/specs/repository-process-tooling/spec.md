# Purpose

Репозиторные процессы, профильные агентные границы, quality workflow и evidence-based offline tooling.

## Requirements

### Requirement: Профильные агентные границы репозитория
Репозиторий SHALL задавать профильным агентам фактические архитектурные и access-границы их контуров, а Router SHALL передавать реализацию назначенному владельцу вместо самостоятельного изменения профильных файлов. Backend-инструкции SHALL ориентироваться на фактический `services/backend`, а CMS frontend SHALL быть отделён от Public Read consumer-контура.

#### Scenario: Backend получает профильную задачу
- **WHEN** Router делегирует подтверждённую backend-задачу
- **THEN** Backend использует слои, Protocol/DI, тестовые правила и запреты, зафиксированные для фактического `services/backend`

#### Scenario: Frontend задача пересекает consumer boundary
- **WHEN** CMS frontend change затрагивает API access или зависимости публичного сайта
- **THEN** профильные инструкции требуют сохранить Protected Admin CMS отдельно от `site-*` Public Read и передать consumer-часть владельцу Site Consumer

### Requirement: Проверяемый quality workflow
Backend и Quality Gate SHALL использовать репозиторные format, unit-test и lint проверки, а runtime API smoke SHALL выполняться на живом API через назначенный skill, а не как pytest smoke suite. Наличие этих правил MUST NOT считаться доказательством конкретного прогона без отдельного report.

#### Scenario: Backend передаёт runtime diff на Quality Gate
- **WHEN** Backend завершает назначенный runtime deliverable
- **THEN** он сообщает результаты применимых `make format`, `make test`, `make lint`, а Quality Gate повторяет применимые проверки

#### Scenario: Требуется API smoke
- **WHEN** Quality Gate проверяет runtime API diff
- **THEN** smoke выполняется через live API skill с endpoint timings, а не через файлы `tests/smoke/`

#### Scenario: Evidence задачи 005 остаётся неполным
- **WHEN** capability проверяется только по текущим инструкциям и lint/test структуре
- **THEN** gap `G-005` остаётся открытым до timestamped live-smoke report и явного audit пяти skipped tests; полное smoke или anonymous/authenticated покрытие не заявляется

### Requirement: Evidence-based offline import artifacts
Repository SHALL сохранять существующие discovery, parser, JSON, SQL/photo manifest и import report задачи `021` как подготовительные offline artifacts. Эти artifacts MUST NOT считаться доказательством SQL dry-run, выбора целевой БД или применения импорта.

#### Scenario: Используются артефакты legacy Joomla import
- **WHEN** инженер анализирует подготовленный offline import pipeline
- **THEN** он может трассировать parser, JSON, SQL/photo manifests и import report, не выполняя runtime endpoint calls

#### Scenario: Запрашивается подтверждение завершённого импорта
- **WHEN** отсутствуют воспроизводимый transaction/dry-run report, выбранная БД, reconciliation и Quality Gate
- **THEN** gap `G-021` остаётся открытым и spec не утверждает применение данных

### Requirement: Нумерованные исторические артефакты
Все верхнеуровневые исторические task artifacts и только достоверно связанные с ними по manifest задачи `022` plan/report artifacts SHALL использовать согласованные трёхзначные идентификаторы и сохранять однозначную трассировку между связанными документами. Подтверждённый baseline задачи `022` SHALL содержать 23 уникальных непрерывных task ID `001`–`023` и согласованные ссылки связанных legacy artifacts.

#### Scenario: Проверяется baseline нумерации
- **WHEN** репозиторные task artifacts сверяются с итоговым report задачи `022`
- **THEN** обнаруживаются ровно 23 уникальных непрерывных ID `001`–`023`, а повторная dry-run проверка не предлагает дополнительных rename

### Requirement: Канонический OpenSpec lifecycle
Новая или неоднозначная работа SHALL проходить последовательность `docs/tasks → propose → user approval → apply профильными владельцами → единый Quality Gate → sync → archive`. OpenSpec change SHALL быть единственным изменяемым планом реализации, а `docs/plans` SHALL оставаться legacy/read-only контекстом.

#### Scenario: Proposal готов к реализации
- **WHEN** Planner создал русскоязычные proposal, design, delta specs и tasks и выполнил status/strict validation
- **THEN** Router показывает артефакты пользователю и не запускает apply до явного approval

#### Scenario: Реализация завершена исполнителями
- **WHEN** все назначенные deliverables выполнены и отмечены
- **THEN** Router запускает один общий Quality Gate, возвращает findings владельцам и допускает sync/archive только после успешной повторной проверки

#### Scenario: Миграция workflow ещё не завершена
- **WHEN** не выполнены capability backfill, покрытие 23/23, общий Quality Gate, sync или archive родительского change
- **THEN** gap `G-023` остаётся открытым и завершённый lifecycle не заявляется

### Requirement: Process capability не создаёт runtime-контракт
Capability `repository-process-tooling` MUST ограничиваться repository instructions, documentation evidence и offline tooling и MUST NOT добавлять требования к runtime endpoint, auth behavior, бизнес-данным или схеме БД.

#### Scenario: Проверяется API access applicability
- **WHEN** reviewer анализирует этот process/tooling change
- **THEN** access matrix и anonymous/authenticated HTTP проверки отмечаются `N/A`, поскольку endpoint changes отсутствуют

#### Scenario: Process evidence упоминает access policy
- **WHEN** агентные инструкции описывают Public Read или Protected Write для будущей runtime-задачи
- **THEN** это трактуется как governance rule, а не как evidence фактического endpoint behavior

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
