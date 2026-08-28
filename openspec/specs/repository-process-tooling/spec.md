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
Backend, Frontend и Quality Gate SHALL использовать сервисные и корневые Makefile-команды `format`, `test` и `lint`, а runtime API smoke SHALL выполняться на живом API через назначенный skill, а не как pytest smoke suite. Каждый из core-сервисов `backend`, `frontend`, `notification-service`, `email-service` MUST предоставлять эти три Makefile-цели. Наличие правил или команд MUST NOT считаться доказательством конкретного прогона без отдельного report.

#### Scenario: Профильный исполнитель передаёт diff на Quality Gate
- **WHEN** Backend или Frontend завершает назначенный deliverable в core-сервисе
- **THEN** он сообщает результаты применимых сервисных `make format`, `make test`, `make lint`, а Quality Gate повторяет применимые проверки через корневые агрегирующие цели

#### Scenario: Требуется API smoke
- **WHEN** Quality Gate проверяет runtime API diff
- **THEN** smoke выполняется через live API skill с endpoint timings, а не через файлы `tests/smoke/`

#### Scenario: Evidence задачи 005 остаётся неполным
- **WHEN** capability проверяется только по текущим инструкциям и lint/test структуре
- **THEN** gap `G-005` остаётся открытым до timestamped live-smoke report и явного audit пяти skipped tests; полное smoke или anonymous/authenticated покрытие не заявляется

#### Scenario: Проверяется tooling-only change
- **WHEN** diff меняет только Makefile и agent governance без runtime API изменений
- **THEN** Quality Gate фиксирует live API smoke и access matrix как `N/A`, но сохраняет evidence запусков Makefile-команд

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
Root tooling SHALL предоставлять отдельные mutating `format`/`fix` и non-mutating `test`/`lint`/`check` commands. Core-сервисы `backend`, `frontend`, `notification-service`, `email-service` SHALL иметь `.PHONY` цели `test`, `lint`, `format`; `test` MUST работать без поднятой инфраструктуры, `lint` MUST проверять весь поддерживаемый исходный и тестовый код без его изменения, а `format` SHALL форматировать весь поддерживаемый код сервиса. Корневые `test`, `lint` и `format` MUST отдельными явными рецептами, без цикла, вызывать соответствующую цель каждого из четырёх core-сервисов и MUST NOT включать `site-*`. Aggregate `check` MUST без изменения tracked files запускать format-check, lint, typecheck и tests для этих четырёх сервисов; aggregate build MUST включать только эти четыре сервиса.

#### Scenario: Сервисный CI-контракт доступен
- **WHEN** GitHub Actions worker с установленными lockfile dependencies выполняет `make test` или `make lint` в любом core-сервисе без PostgreSQL, NATS, Redis и внешних сервисов
- **THEN** соответствующие автономные tests или полный non-mutating lint gate завершаются с кодом 0 при корректном коде

#### Scenario: Форматирование сервиса требуется
- **WHEN** инженер выполняет `make format` в core-сервисе
- **THEN** доступный нативный formatter/autofix обрабатывает весь поддерживаемый исходный и тестовый scope этого сервиса

#### Scenario: Корневые CI-команды агрегируют core scope
- **WHEN** инженер выполняет корневой `make test`, `make lint` или `make format`
- **THEN** Make явно вызывает одноимённую цель backend, notification-service, email-service и frontend по отдельности и не вызывает consumer site

#### Scenario: Aggregate checks успешны
- **WHEN** Quality Gate запускает root check targets на clean worktrees
- **THEN** все включённые сервисы проверены, commands завершаются 0 и итоговый diff остаётся чистым

#### Scenario: Formatting drift обнаружен non-mutating gate
- **WHEN** format-check обнаруживает drift во время `lint` или `check`
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

### Requirement: Кросс-репозиторные контрактные проверки не теряются вне монорепы

Тесты, сверяющие контракт сервиса с AsyncAPI-документом соседнего сервиса, SHALL корректно работать в обоих контурах исполнения: в монорепе, где соседний репозиторий доступен, и в CI отдельного сервисного репозитория, где его нет. При отсутствии соседнего документа тест MUST завершаться явным `skip` с указанием недостающего пути, а не `FileNotFoundError`, чтобы `make test` сервисного репозитория не блокировал деплой. Молчаливая потеря покрытия MUST быть исключена: при переменной окружения `EQCMS_MONOREPO=1` отсутствие соседнего документа MUST приводить к падению теста, а не к `skip`. Root tooling SHALL предоставлять `.PHONY` цель `contracts-check`, запускающую эти тесты с выставленной переменной, и MUST включать её в aggregate `check`.

#### Scenario: CI сервисного репозитория без соседей
- **WHEN** `make test` выполняется в чекауте одного сервисного репозитория, где соседнего сервиса нет на диске
- **THEN** кросс-репозиторные контрактные тесты помечаются `skipped` с причиной, содержащей недостающий путь
- **AND** прогон завершается кодом 0, а деплой не блокируется

#### Scenario: Монорепа исполняет контрактные проверки
- **WHEN** из корня монорепы выполняется `make contracts-check`
- **THEN** кросс-репозиторные контрактные тесты фактически исполняются и сравнивают схемы соседних сервисов
- **AND** ни один из них не имеет статус `skipped`

#### Scenario: Guard ловит молчаливую потерю покрытия
- **WHEN** при `EQCMS_MONOREPO=1` соседний AsyncAPI-документ недоступен по ожидаемому пути
- **THEN** тест падает с явным сообщением о недостающем документе
- **AND** расхождение возвращается владельцу как finding, а не остаётся незамеченным
