## MODIFIED Requirements

### Requirement: Профильная мультиагентная реализация
После подтверждения Router SHALL делить OpenSpec tasks на непересекающиеся deliverables (ownership) и каждый deliverable — на execution units в бюджете `AGENTS.md`, SHALL делегировать ровно один execution unit одному запуску профильного агента (Planner, Backend, Frontend, Site Consumer или Quality Gate) и MUST NOT реализовывать задачи самостоятельно или передавать deliverable, секцию или весь change одному запуску. В DSH-сессии preset `eqsite-router` делегирование SHALL выполняться ролевым инструментом `delegate_<role>`; в Codex/Claude Code роль передаётся заданием по протоколу передачи контекста.

#### Scenario: Change затрагивает несколько профилей
- **WHEN** подтверждённые tasks включают backend, frontend и consumer зоны
- **THEN** Router создаёт отдельные непересекающиеся execution units профильным агентам с контекстным протоколом и точечными `contextFiles`

#### Scenario: Два задания меняют один файл
- **WHEN** декомпозиция обнаруживает пересечение ownership одного файла или spec
- **THEN** Router назначает одного владельца либо выполняет задания последовательно

#### Scenario: Делегирование в DSH
- **WHEN** Router в сессии `eqsite-router` делегирует unit `BE-2`
- **THEN** он вызывает `delegate_backend` с одним unit'ом и handoff предыдущего unit, а не универсальный `subagent`

### Requirement: Анти-зависание исполнения
Каждое делегирование SHALL требовать продолжать работу до завершения назначенного execution unit без ожидания новых инструкций при отсутствии конкретного блокера; Router SHALL немедленно продолжить зависшего агента follow-up сообщением (в DSH — `send_message` тому же ребёнку). Команда продолжить MUST NOT расширять границы execution unit и MUST NOT отменять circuit breaker исполнителя.

#### Scenario: Субагент ожидает инструкцию без блокера
- **WHEN** назначенный агент переходит в awaiting instruction до завершения execution unit
- **THEN** Router отправляет команду продолжить текущий unit и не запрашивает повторно исходную задачу у пользователя

#### Scenario: Исполнитель вернул partial со split
- **WHEN** агент вернул handoff `partial` с предложением split
- **THEN** Router принимает split, обновляет план execution units и не требует доделать всё в той же сессии

### Requirement: Единый итоговый Quality Gate
После завершения всех execution units Router SHALL запустить один логический Quality Gate, физически разделённый на lanes `QG-ENV`, `QG-BE`, `QG-FE-AUTO`, `QG-FE-MANUAL`, `QG-CONTRACTS`, `QG-LIVE`, `QG-SYNTH` по DAG из `AGENTS.md`, SHALL отмечать неприменимые lanes с обоснованием, SHALL возвращать findings владельцам как новые execution units, SHALL повторять только затронутые lanes и `QG-SYNTH` и SHALL сохранять один итоговый report в `docs/reports`. Lanes MAY исполняться одним `workflow`-запуском по skill `qg-lanes` или отдельными вызовами `delegate_quality_gate`; вердикт SHALL ставить только `QG-SYNTH`, а вопросы пользователю и approval gates MUST оставаться у Router.

#### Scenario: Все OpenSpec tasks отмечены выполненными
- **WHEN** профильные агенты завершили свои execution units
- **THEN** Router запускает применимые lanes по DAG, и `QG-SYNTH` сводит их в один вердикт и один report до sync/archive

#### Scenario: QG через workflow
- **WHEN** Router запускает lanes через skill `qg-lanes`
- **THEN** результат workflow содержит структурированный handoff каждого lane и вердикт `QG-SYNTH`, а Router сам решает о возврате findings и повторе lanes

### Requirement: Единый источник корневых агентных правил
`AGENTS.md` SHALL быть коротким общим ядром для всех агентов (контекст проекта и ссылки на `SERVICES.md`/`README.md`, ownership, бюджет execution unit, формат handoff, circuit breaker исполнителя, howto/skills, API Access Policy) размером не более 12 288 байт и MUST NOT содержать Router-специфичных правил. Router-правила (Router-first и OpenSpec workflow, декомпозиция и делегирование, экономия контекста Router, анти-зависание, протокол передачи контекста, оркестрация Quality Gate lanes, карта агентов, правила и примеры маршрутизации, чеклист Router, указатель на финализацию) SHALL находиться в `agents/router.md` размером не более 24 576 байт. Первой секцией `AGENTS.md` SHALL быть «Определение роли»: агент с назначенной профильной ролью работает по `agents/<role>.md` и MUST NOT читать `agents/router.md`; верхнеуровневый агент без назначенной роли является Router и SHALL прочитать `agents/router.md` до любого ответа. Корневой `CLAUDE.md` SHALL оставаться коротким указателем на `AGENTS.md`. В DSH persona Router SHALL загружаться из `agents/router.md`, а persona профильных ролей — из размеченного блока `agents/<role>.md`; текст правил MUST NOT копироваться в конфигурацию DSH.

#### Scenario: Агент стартует через CLAUDE-совместимую среду
- **WHEN** среда читает корневой `CLAUDE.md`
- **THEN** она получает однозначное указание прочитать и соблюдать `AGENTS.md`, а из «Определения роли» — прочитать `agents/router.md`, если роль не назначена

#### Scenario: Субагент с назначенной ролью
- **WHEN** Codex/Claude Code-субагент получает задание «Ты — агент Backend» или DSH-ребёнок стартует с persona Backend
- **THEN** он получает только ядро `AGENTS.md` и свой `agents/backend.md`, не читает `agents/router.md` и не выполняет маршрутизацию

#### Scenario: Router-правило попало в ядро
- **WHEN** в `AGENTS.md` появляется Router-секция или размер файла превышает 12 288 байт
- **THEN** проверка `CFG-08` в Quality Gate фиксирует finding владельцу корневых правил

#### Scenario: Правило потерялось при переносе
- **WHEN** секция исходного `AGENTS.md` отсутствует и в ядре, и в `agents/router.md`
- **THEN** проверка `CFG-09` завершается ошибкой до approval Quality Gate

### Requirement: Операционные шаги финализации выполняет Router по skill task-finalize
Стадии `READY-FOR-MANUAL`, `MERGE`, `RELEASE` и контроль CI SHALL выполняться Router как операционные шаги строго по самодостаточному skill `.agents/skills/task-finalize/SKILL.md` через `scripts/stackctl ready` и `scripts/shipctl`. Skill SHALL иметь frontmatter `name`, `description`, `whenToUse` и размер менее 8192 символов; `agents/router.md` SHALL содержать только короткий шаг-указатель на skill, а `AGENTS.md` и `agents/router.md` MUST NOT дублировать процедуру. Router MUST NOT при этом редактировать файлы, разрешать конфликты, выполнять мутирующие git-команды вне `shipctl`, перезапускать CI, делать revert или иные автоисправления. Любая остановка инструмента SHALL завершаться отчётом пользователю с явным перечнем уже слитых, запушенных, конфликтных и не обработанных репозиториев.

#### Scenario: Инструмент остановился с ошибкой
- **WHEN** `shipctl` возвращает ненулевой exit-код (отказ push, сбой sync, расхождение `release`, detached HEAD, ветка не `main`)
- **THEN** Router прекращает финализацию, показывает пользователю JSON-итог в виде таблицы repo → стадия → ошибка и ждёт решения пользователя

#### Scenario: Конфликт оставлен для ручного разбора
- **WHEN** `shipctl merge` остановился со стадией `conflict`
- **THEN** Router показывает репозиторий и конфликтующие файлы, не трогает рабочее дерево и после сообщения пользователя о закоммиченном разрешении запускает `shipctl merge --resume --change <name>`

#### Scenario: Указатель финализации после выноса Router-правил
- **WHEN** Router читает `agents/router.md` после `QG-SYNTH = APPROVED`
- **THEN** он находит в нём шаг-указатель на skill `task-finalize`, а в `AGENTS.md` такого шага нет
