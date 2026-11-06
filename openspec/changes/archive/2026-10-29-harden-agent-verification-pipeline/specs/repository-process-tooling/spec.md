## MODIFIED Requirements

### Requirement: Проверяемый quality workflow
Backend, Frontend и Quality Gate SHALL использовать единую staged verification policy: targeted проверки промежуточного unit, полный suite затронутого сервиса в его последнем unit и независимо в QG, exact reproducer и impacted regression для fix. Действующие Makefile-цели core-сервисов SHALL сохраняться; root suites SHALL запускаться только по применимости. Отчёт SHALL различать команду и доказанный прогон.

#### Scenario: Профильный исполнитель передаёт diff на Quality Gate
- **WHEN** Backend или Frontend завершает назначенный deliverable в core-сервисе
- **THEN** он сообщает staged verification, включая применимые сервисные `make format`, `make test`, `make lint` на финальной границе, а Quality Gate независимо проверяет затронутые сервисы без повторного запуска алиасов одних команд

#### Scenario: Требуется API smoke
- **WHEN** Quality Gate проверяет runtime API diff
- **THEN** smoke выполняется через live API skill с endpoint timings, а не через файлы `tests/smoke/`

#### Scenario: Evidence задачи 005 остаётся неполным
- **WHEN** capability проверяется только по текущим инструкциям и lint/test структуре
- **THEN** gap `G-005` остаётся открытым до timestamped live-smoke report и явного audit пяти skipped tests; полное smoke или anonymous/authenticated покрытие не заявляется

#### Scenario: Проверяется tooling-only change
- **WHEN** diff меняет только Makefile и agent governance без runtime API изменений
- **THEN** Quality Gate фиксирует live API smoke и access matrix как `N/A`, но сохраняет evidence применимых tooling/Makefile-команд

#### Scenario: Промежуточный unit и fix
- **WHEN** unit не является последним в сервисе либо исправляет конкретный finding
- **THEN** промежуточный unit запускает targeted tests и scoped static checks, fix сначала воспроизводит точный FAIL, затем PASS и impacted regression; повтор полного suite требует причины в verification ledger

#### Scenario: Механическое форматирование
- **WHEN** scoped formatter меняет только whitespace/import ordering без изменения смысла и канонический gate проходит
- **THEN** это minor без отдельного fix/recheck; конфликт formatter tools фиксируется одним воспроизводимым tooling finding, а не циклами Black/Ruff

## ADDED Requirements

### Requirement: Ограниченная поддержка SEO в stackctl
stackctl SHALL поддерживать только явные aliases SEO API, scheduler, maintenance и db-seo, сохраняя существующий Compose project и service key. DB SHALL оставаться non-buildable; URL discovery SHALL использовать runtime published ports без секретов. Автомиграции SEO, Compose/auth/network изменения и destructive команды MUST NOT добавляться.

#### Scenario: SEO операции из allowlist
- **WHEN** запрошены doctor/logs/rebuild/ready для `seo-service`, `seo-scheduler` или `seo-maintenance`
- **THEN** операция направлена только выбранному существующему контейнеру; ready использует `--no-migrate`, без запуска соседей; неизвестные aliases отклоняются

#### Scenario: Изолированный dry-run
- **WHEN** вызывается ready SEO aliases с `--dry-run --no-migrate`, в том числе при занятом lock
- **THEN** возвращается план без lock/build/up/exec/migration; неявная миграция отклоняется до mutation

#### Scenario: DB и динамические порты
- **WHEN** запрошены SQL readiness db-seo либо URL API с динамическим published port
- **THEN** SQL использует существующие безопасные TCP password-auth guarantees Яндекс DB aliases, ready/rebuild DB отказывает, URL отражает inspect ports; внутренний сервис без порта не получает вымышленный URL

#### Scenario: Ошибка или secret в discovery
- **WHEN** inspect не даёт однозначный target либо diagnostics содержат чувствительные данные
- **THEN** команда возвращает безопасный ненулевой JSON результат без fallback к hardcoded порту, вывода env и изменения runtime configuration
