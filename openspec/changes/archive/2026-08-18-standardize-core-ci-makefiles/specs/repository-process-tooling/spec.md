## MODIFIED Requirements

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
