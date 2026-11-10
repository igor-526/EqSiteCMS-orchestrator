# Purpose

Определить канонический Router-first процесс разработки EqSiteCMS через русскоязычные OpenSpec changes: от исходной задачи и обязательного пользовательского approval до профильной реализации, единого Quality Gate, синхронизации спецификаций и архивирования.

## Requirements

### Requirement: Каноническое планирование через OpenSpec
Система разработки SHALL принимать исходное описание из `docs/tasks` и SHALL использовать apply-ready OpenSpec change как единственный изменяемый план реализации; `docs/plans` MUST оставаться legacy/read-only контекстом.

#### Scenario: Новая задача поступает на планирование
- **WHEN** Router получает новую или неоднозначную задачу из `docs/tasks`
- **THEN** он передаёт её на `openspec-propose` и не создаёт параллельный реализационный план в `docs/plans`

### Requirement: Русскоязычные артефакты
Все содержательные части proposal, design, specs и tasks SHALL быть написаны на русском языке; технические идентификаторы, команды, пути и нормативный синтаксис OpenSpec MAY оставаться латинскими.

#### Scenario: Proposal готов к проверке
- **WHEN** созданы все apply-required артефакты
- **THEN** их содержательные разделы написаны на русском и change успешно проходит OpenSpec validation

### Requirement: Обязательная пользовательская проверка
Router MUST остановить workflow после создания и валидации apply-ready артефактов и MUST NOT запускать реализацию до явного подтверждения пользователя.

#### Scenario: Артефакты созданы без подтверждения
- **WHEN** status показывает apply-ready change, но пользователь ещё не подтвердил proposal
- **THEN** Router показывает proposal, design, specs, tasks и открытые вопросы, не вызывая apply и реализационных агентов

#### Scenario: Пользователь запросил исправления
- **WHEN** пользователь отклоняет или корректирует артефакты
- **THEN** Planner обновляет соответствующие OpenSpec-артефакты, повторяет validation и снова запрашивает подтверждение

### Requirement: Explore только по явному запросу
Workflow MUST NOT автоматически запускать `openspec-explore`; исследовательский режим SHALL использоваться только при явном запросе пользователя.

#### Scenario: Обычная новая задача
- **WHEN** пользователь передаёт задачу без запроса на исследование
- **THEN** Router начинает с propose, а не explore

### Requirement: Профильная мультиагентная реализация
После подтверждения Router SHALL делить OpenSpec tasks на ограниченные зоны выполнения, SHALL назначать соответствующих Backend, Frontend или Site Consumer субагентов и MUST NOT реализовывать задачи самостоятельно или передавать весь большой change одному субагенту.

#### Scenario: Change затрагивает несколько профилей
- **WHEN** подтверждённые tasks включают backend, frontend и consumer зоны
- **THEN** Router создаёт отдельные непересекающиеся задания профильным субагентам с завершённым deliverable и контекстным протоколом

#### Scenario: Два задания меняют один файл
- **WHEN** декомпозиция обнаруживает пересечение ownership одного файла или spec
- **THEN** Router назначает одного владельца либо выполняет задания последовательно

### Requirement: Анти-зависание исполнения
Каждое делегирование SHALL требовать продолжать до завершённого deliverable без ожидания новых инструкций при отсутствии конкретного блокера; Router SHALL немедленно продолжить зависшего агента follow-up сообщением.

#### Scenario: Субагент ожидает инструкцию без блокера
- **WHEN** назначенный агент переходит в awaiting instruction до завершения deliverable
- **THEN** Router отправляет команду продолжить текущий план и не запрашивает повторно исходную задачу у пользователя

### Requirement: Единый итоговый Quality Gate
После завершения всех реализационных задач Router SHALL запустить один общий Quality Gate, SHALL вернуть findings профильным исполнителям, SHALL повторить проверку после доработок и SHALL сохранить итоговый report в `docs/reports`.

#### Scenario: Все OpenSpec tasks отмечены выполненными
- **WHEN** профильные агенты завершили свои зоны
- **THEN** Quality Gate проверяет совокупный diff, архитектуру, тесты, access policy и OpenSpec validation до sync/archive

### Requirement: Профиль Quality Gate соразмерен diff
Router SHALL выбирать соразмерный фактическому diff профиль Quality Gate и соблюдать ограничения проверки, хранения evidence и повторного раунда, определённые сценариями этого требования.

#### Scenario: Документационный change
- **WHEN** diff change содержит только docs, specs и агентские правила
- **THEN** Router запускает один QG-агент профиля `QG-DOCS`, а ENV, LIVE и FORMAT фиксируются как неприменимые

#### Scenario: Чужой падающий тест
- **WHEN** scoped `make test` падает в тесте, не импортирующем изменённые модули и вне путей change
- **THEN** finding получает класс `pre-existing`, вердикт может быть `APPROVED`, а Router предлагает отдельную задачу в `docs/tasks`

#### Scenario: Инструмент не поддерживает сервис
- **WHEN** `stackctl` не поддерживает затронутый сервис
- **THEN** QG использует штатный обход через `make`/`docker compose` сервиса, фиксирует `blocked-env` и не расширяет change починкой инструмента

#### Scenario: Выбор профиля и границы проверки
- **WHEN** Router выбирает и выполняет Quality Gate по фактическому diff
- **THEN** Router SHALL выбирать профиль Quality Gate по фактическому diff: `QG-DOCS` (только docs/specs/правила — один агент, OpenSpec validation и сверка specs), `QG-LITE` (код в не более чем двух сервисах без миграций и NATS-контрактов — один агент последовательно выполняет применимые lanes и пишет отчёт; при UI behavior diff затем отдельный агент `QG-FE-MANUAL` дописывает отчёт и ставит вердикт) или `QG-FULL` (миграции, NATS/AsyncAPI или более двух сервисов — lanes отдельными агентами `delegate_quality_gate` по DAG).
- **AND** Browser QA CMS SHALL выполняться в одном viewport 1366×768; tablet/mobile для CMS MUST NOT проверяться.
- **AND** В `docs/reports/` change SHALL получать один файл `docs/reports/<change>.md`; прочие артефакты агентов SHALL сохраняться в игнорируемой `.qa/<change>/`.
- **AND** Процедура `QG-FORMAT` SHALL выполнять format/lint/test только затронутых сервисов внутри lanes `QG-BE`/`QG-FE-AUTO` в текущем рабочем дереве и MUST NOT требовать чистый worktree, изолированные копии репозитория или установку зависимостей во все сервисы.
- **AND** Падения вне путей change, не вызванные им, SHALL классифицироваться как `pre-existing` и MUST NOT блокировать вердикт; дефекты окружения и инструментов вне scope SHALL фиксироваться как `blocked-env` и MUST NOT исправляться внутри change без решения пользователя.
- **AND** Повторная проверка после fix SHALL выполняться тем же QG-агентом и только по затронутым findings, не более одного повторного раунда.

### Requirement: Waiver пользователя
Если пользователь явно принимает риск по конкретному finding или blocker, Router SHALL зафиксировать его в отчёте Quality Gate как `waived by user` с формулировкой пользователя, SHALL выставить вердикт `APPROVED_WITH_WAIVER` и SHALL продолжить sync/archive/finalize без повторного требования. Waiver MUST NOT распространяться на вывод секретов и деструктивные операции с данными.

#### Scenario: Пользователь игнорирует finding
- **WHEN** QG вернул `REWORK` из-за finding, а пользователь пишет «игнорируем, архивируй»
- **THEN** Router вносит waiver в отчёт и выполняет sync и archive

### Requirement: Операционный режим Router
Router SHALL выполнять сам, без делегирования и без OpenSpec, операционные задачи, не меняющие продуктовый код (восстановление окружения, установка зависимостей, управление стеком, git-инвентаризация, ответы о состоянии, sync/archive проверенного change, финализация), а также любую задачу, для которой пользователь явно запросил работу без агентов. В операционном режиме Router MUST NOT менять продуктовый код, specs и конфигурацию сервисов.

#### Scenario: Пользователь просит поднять окружение без агентов
- **WHEN** пользователь просит установить зависимости и поднять контейнеры «без маршрутизации агентами»
- **THEN** Router выполняет команды сам через skill `stack-control`, не вызывая `delegate_*` и `workflow`

### Requirement: Ожидание агентов без поллинга
Router SHALL делегировать units в фоне без поллинга, возобновлять того же упавшего агента и соблюдать ограничения handoff и размера unit, определённые сценарием этого требования.

#### Scenario: Последовательный unit
- **WHEN** следующий шаг Router зависит от результата unit
- **THEN** Router делегирует unit в фоне, завершает ответ и продолжает после уведомления о завершении агента

#### Scenario: Агент упал по лимиту
- **WHEN** агент завершился ошибкой usage limit или транспорта до handoff
- **THEN** после возобновления работы Router отправляет тому же агенту `send_message` с просьбой продолжить unit и не запускает новый агент

#### Scenario: Протокол делегирования и завершения unit
- **WHEN** Router организует исполнение агентных units
- **THEN** Router SHALL делегировать units в фоне (continuable) и завершать ответ до уведомления о завершении; независимые units SHALL запускаться одним сообщением.
- **AND** Упавший по лимиту или транспорту агент SHALL возобновляться через `send_message`, а не заменяться новым.
- **AND** Goal-режим в preset `eqsite-router` SHALL быть отключён.
- **AND** Router MUST NOT ожидать агентов через `sleep` или циклы `job_output`/`list_agents` и MUST NOT перечитывать файлы правил перед каждым делегированием.
- **AND** Исполнители SHALL возвращать handoff финальным сообщением; `send_message` у дочерних агентов SHALL быть отключён.
- **AND** Execution unit SHALL содержать не менее ~5 существенных действий: чекпоинты, фиксации и отметка tasks выполняются в составе рабочего unit, а Planner вызывается только для исходного плана и реального изменения scope.

### Requirement: Синхронизация и архивирование
Успешно проверенный change SHALL синхронизировать delta specs в main specs и SHALL быть архивирован только после завершённых tasks, положительного Quality Gate (`APPROVED` или `APPROVED_WITH_WAIVER`) и успешной стадии `READY-FOR-MANUAL`. Архивирование MUST NOT завершать workflow: после него Router SHALL перейти к approval gate «Сливать в main?».

#### Scenario: Quality Gate одобрил change
- **WHEN** findings устранены, повторная проверка успешна, `READY-FOR-MANUAL` завершилась успешно и delta specs валидны
- **THEN** Router запускает sync specs, проверяет main specs и архивирует change

#### Scenario: Change архивирован
- **WHEN** archive успешно выполнен
- **THEN** Router не завершает пайплайн итоговым отчётом, а формирует план слияния и задаёт пользователю вопрос «Сливать в main?»

### Requirement: Стадия READY-FOR-MANUAL
После `QG-SYNTH = APPROVED` и до sync/archive Router SHALL выполнить `READY-FOR-MANUAL` через `scripts/stackctl ready`, включая обработку сбоев и передачу результата по сценарию этого требования.

#### Scenario: Изменения после QG-ENV попадают в контейнеры
- **WHEN** после `QG-ENV` исполнитель внёс правки по `REWORK`, а `QG-SYNTH` выставил `APPROVED`
- **THEN** `READY-FOR-MANUAL` пересобирает затронутые сервисы заново, и контейнеры содержат итоговый код

#### Scenario: Change не затрагивает runtime-сервисы
- **WHEN** план слияния не содержит runtime aliases (например, изменены только docs, specs или tooling корня)
- **THEN** стадия завершается статусом «нет runtime-изменений» без rebuild, и это явно отражается в отчёте

#### Scenario: Сервис не поднялся из-за кода
- **WHEN** контейнер изменённого сервиса падает при старте с traceback из изменённого кода
- **THEN** Router не выполняет sync/archive, оформляет fix execution unit владельцу и повторяет `READY-FOR-MANUAL` после исправления и повторной проверки затронутых lanes

#### Scenario: Отчёт для ручной проверки
- **WHEN** все затронутые сервисы healthy
- **THEN** пользователь получает таблицу alias → статус/health → URL (или пометку «внутренний сервис без URL»)

#### Scenario: Полный контракт стадии и обработки сбоев
- **WHEN** после `QG-SYNTH = APPROVED` Router готовит change к ручной проверке до sync/archive
- **THEN** После `QG-SYNTH = APPROVED` и до sync/archive Router SHALL выполнить стадию `READY-FOR-MANUAL`: пересобрать и перезапустить все runtime-сервисы, затронутые change, из итогового состояния рабочих деревьев (включая правки после `QG-ENV`), применить миграции затронутых профилей, подтвердить health/readiness и сообщить пользователю URL для ручной проверки.
- **AND** Стадия SHALL выполняться через `scripts/stackctl ready` и MUST покрывать `site-*`.
- **AND** Сбой стадии MUST NOT исправляться кодом: допускаются не более двух инфраструктурных repair-попыток через `stackctl doctor`/`logs`, а startup crash или регрессия из кода становятся fix execution unit владельцу с повтором затронутых lanes, `QG-SYNTH` и `READY-FOR-MANUAL`.

### Requirement: Approval gate «Сливать в main?»
После archive Router SHALL запросить явное подтверждение пофайлового плана слияния; выполнение `MERGE`, изменение плана и отказ SHALL подчиняться сценарию этого требования.

#### Scenario: Пользователь подтверждает план
- **WHEN** пользователь выбирает «Слить в main»
- **THEN** Router запускает `shipctl merge` ровно с подтверждённым plan-файлом

#### Scenario: Пользователь корректирует список файлов
- **WHEN** пользователь свободным ответом просит исключить или добавить файлы
- **THEN** Router перегенерирует план с `--exclude`/`--include` и повторно задаёт вопрос, не выполняя merge

#### Scenario: Пользователь отказывается от слияния
- **WHEN** пользователь выбирает «Не сливать»
- **THEN** ни один репозиторий не меняет ветку, индекс или коммиты, а итоговый отчёт фиксирует, что change архивирован, но не слит

#### Scenario: Среда без ask_user_question
- **WHEN** Router работает в среде без `ask_user_question`
- **THEN** он задаёт тот же вопрос с вариантами «Слить в main» / «Не сливать» текстом и не выполняет merge до явного ответа

#### Scenario: Содержание вопроса и запрет неутверждённого слияния
- **WHEN** после archive Router проводит approval gate «Сливать в main?»
- **THEN** После archive Router SHALL сформировать пофайловый план слияния (`shipctl plan`) и задать пользователю **один** вопрос, объединяющий решение о слиянии в `main` и подтверждение плана.
- **AND** В DSH вопрос SHALL задаваться через `ask_user_question` с фиксированными вариантами «Слить в main» и «Не сливать»; текст вопроса SHALL содержать URL из `READY-FOR-MANUAL` и план: репозиторий → ветка (с автосуффиксом при необходимости) → включённые файлы → посторонние dirty-файлы, которые не будут закоммичены → предупреждения, commit message и пометку, что feature-ветки будут запушены.
- **AND** Если `ask_user_question` недоступен (Codex, Claude Code), Router SHALL задать тот же вопрос с теми же вариантами обычным сообщением и остановиться до ответа.
- **AND** Router MUST NOT выполнять `MERGE` без явного выбора «Слить в main».
- **AND** Свободный ответ с правкой списка файлов SHALL приводить к перегенерации плана и повторному вопросу; «Не сливать» SHALL завершать пайплайн итоговым отчётом без изменения git-состояния.

### Requirement: Approval gate «Релизить?»
Router SHALL проводить approval gate «Релизить?» только после полностью успешного `MERGE` и MUST NOT выполнять `RELEASE` без явного выбора «Релизить»; состав вопроса и сужение списка SHALL соответствовать сценарию этого требования.

#### Scenario: Пользователь подтверждает релиз
- **WHEN** пользователь выбирает «Релизить» (или перечисляет репозитории свободным ответом)
- **THEN** Router запускает `shipctl release` только для подтверждённых репозиториев и затем контроль CI

#### Scenario: MERGE завершился частично
- **WHEN** `shipctl merge` остановился на одном из репозиториев (включая конфликт, оставленный для ручного разбора)
- **THEN** Router показывает таблицу состояния по репозиториям и команду продолжения и не задаёт вопрос «Релизить?»

#### Scenario: Нет репозиториев для релиза
- **WHEN** среди слитых репозиториев нет ни одного с веткой `release` (например, изменён только корень)
- **THEN** Router сообщает в итоговом отчёте, что релиз `not-applicable`, без вопроса о релизе

#### Scenario: Содержание вопроса и ограничения релиза
- **WHEN** Router определяет возможность и условия approval gate «Релизить?»
- **THEN** После успешного `MERGE` (все изменённые репозитории в стадии `pushed`) Router SHALL задать пользователю вопрос «Релизить?» через `ask_user_question` с фиксированными вариантами «Релизить» и «Не релизить» (вне DSH — тем же текстом).
- **AND** Текст вопроса SHALL перечислять репозитории, слитые в этой задаче и имеющие ветку `release`, с SHA `main` и ожидаемым результатом (fast-forward или `noop`) и явно предупреждать, что push в `release` запускает CI/CD с деплоем.
- **AND** Свободный ответ со списком репозиториев SHALL сужать релиз до них.
- **AND** Router MUST NOT выполнять `RELEASE` без явного выбора «Релизить» и MUST NOT задавать вопрос о релизе, если `MERGE` завершился частично или с ошибкой.

### Requirement: Операционные шаги финализации выполняет Router по skill task-finalize
Router SHALL выполнять операционные стадии финализации строго по skill `task-finalize` через `scripts/stackctl ready` и `scripts/shipctl`, соблюдая границы skill, запреты автоисправлений и отчётность при остановке из сценария этого требования.

#### Scenario: Инструмент остановился с ошибкой
- **WHEN** `shipctl` возвращает ненулевой exit-код (отказ push, сбой sync, расхождение `release`, detached HEAD, ветка не `main`)
- **THEN** Router прекращает финализацию, показывает пользователю JSON-итог в виде таблицы repo → стадия → ошибка и ждёт решения пользователя

#### Scenario: Конфликт оставлен для ручного разбора
- **WHEN** `shipctl merge` остановился со стадией `conflict`
- **THEN** Router показывает репозиторий и конфликтующие файлы, не трогает рабочее дерево и после сообщения пользователя о закоммиченном разрешении запускает `shipctl merge --resume --change <name>`

#### Scenario: Границы skill и операционной финализации
- **WHEN** Router выполняет операционные шаги финализации
- **THEN** Стадии `READY-FOR-MANUAL`, `MERGE`, `RELEASE` и контроль CI SHALL выполняться Router как операционные шаги строго по самодостаточному skill `.agents/skills/task-finalize/SKILL.md` через `scripts/stackctl ready` и `scripts/shipctl`.
- **AND** Skill SHALL иметь frontmatter `name`, `description`, `whenToUse` и размер менее 8192 символов; `AGENTS.md` SHALL содержать только короткий шаг-указатель на skill, а не дублировать процедуру.
- **AND** Router MUST NOT при этом редактировать файлы, разрешать конфликты, выполнять мутирующие git-команды вне `shipctl`, перезапускать CI, делать revert или иные автоисправления.
- **AND** Любая остановка инструмента SHALL завершаться отчётом пользователю с явным перечнем уже слитых, запушенных, конфликтных и не обработанных репозиториев.

### Requirement: Ожидание CI фоновой задачей
После успешного `shipctl release` Router SHALL запускать `scripts/shipctl ci --change <name> --wait` как фоновую задачу (в DSH — Bash с `run_in_background`), MUST NOT опрашивать статус CI в цикле и SHALL забирать JSON-результат после уведомления о завершении задачи. Вне DSH та же команда SHALL выполняться в foreground. Неуспешный результат MUST NOT исправляться автоматически.

#### Scenario: CI завершился неуспешно
- **WHEN** фоновая задача `shipctl ci --wait` завершилась с `failure`, `cancelled`, `timed_out` или `no_run`
- **THEN** Router показывает таблицу repo → run URL → conclusion и выдержку `--log-failed`, не выполняя rerun, revert и правки

#### Scenario: Router не блокируется ожиданием
- **WHEN** CI ещё выполняется
- **THEN** Router не вызывает `gh` и `shipctl ci` повторно, а ждёт уведомления о завершении фоновой задачи

### Requirement: Итоговый отчёт финализации
Пайплайн задачи SHALL завершаться итоговым отчётом пользователю, который содержит: результат `READY-FOR-MANUAL` (URL), решение по слиянию, таблицу repo → ветка → commit → merge → push (`main` и feature-ветки), решение по релизу и таблицу repo → release SHA → run URL → conclusion (корень — `not-applicable`). Evidence SHALL сохраняться в игнорируемой `.qa/ship/<change>/`, а не в отслеживаемых файлах после merge.

#### Scenario: Полный успешный проход
- **WHEN** пользователь подтвердил слияние и релиз, и все CI-runs завершились `success`
- **THEN** итоговый отчёт содержит все три таблицы и пути к JSON-evidence в `.qa/ship/<change>/`

### Requirement: Единый источник корневых агентных правил
`AGENTS.md` SHALL содержать полный workflow, а корневой `CLAUDE.md` SHALL быть коротким указателем на обязательное чтение `AGENTS.md` и MUST NOT дублировать полный набор правил.

#### Scenario: Агент стартует через CLAUDE-совместимую среду
- **WHEN** среда читает корневой `CLAUDE.md`
- **THEN** она получает однозначное указание прочитать и соблюдать `AGENTS.md`

### Requirement: Acceptance prerequisites до выполнения
Planner SHALL фиксировать риск → scenario → unit → evidence owner → prerequisites → stop condition. Отсутствие внешнего OAuth/ролей, инструментов, изолированных PG/NATS и разрешения на test cleanup SHALL различаться. Необеспеченная ключевая проверка SHALL приводить к решению о подготовке, переносе или явном gap до дорогого выполнения.

#### Scenario: Внешний vendor OAuth недоступен
- **WHEN** acceptance требует vendor credentials, которых нет
- **THEN** внешний gap остаётся явно непроверенным; синтетический контракт не объявляется real OAuth coverage, пользователь решает о риске

#### Scenario: Исправимый tooling blocker
- **WHEN** необходимые aliases или assertions runner отсутствуют
- **THEN** planner назначает конкретный tooling deliverable с тестами и зависимостями либо фиксирует отдельный scope decision; blocker не маскируется под внешнюю зависимость

### Requirement: Ownership closure завершённого slice
Ownership unit SHALL включать непосредственно зависимые tests, fixtures, wiring и генерируемые inventories. Бюджет ~5–12 существенных действий SHALL оставаться эвристикой контекста, не счётчиком файлов; split SHALL основываться на реальном превышении или blocker, не на двух связанных fixtures. Несвязанные pre-existing изменения MUST NOT включаться автоматически.

#### Scenario: Контракт меняет тестовую fixture
- **WHEN** реализация требует обновить зависимый DTO test или migration fixture
- **THEN** зависимый путь уже принадлежит тому же владельцу либо предварительно передаётся ему без параллельной записи; отдельный checkpoint-unit не создаётся

#### Scenario: Обоснованный circuit breaker
- **WHEN** исполнитель обнаружил превышение бюджета контекста или нового архитектурного slice
- **THEN** он сдаёт безопасную атомарную часть с partial причиной и bounded split; требования продолжать героически нет

### Requirement: Exact reproducer для fix
Fix unit SHALL до исправления выполнить точный исходный reproducer и сохранить FAIL, после — PASS в эквивалентной среде и targeted regression. Scenario/input/keys/DOM path/status и revision SHALL быть трассируемыми. Замена реального browser/PG/NATS на mock MUST NOT закрывать исходный finding.

#### Scenario: Space и Escape не эквивалентны абстрактному Escape
- **WHEN** finding описывает Space → Escape внутри вложенного wizard
- **THEN** проверяется эта последовательность и состояние обоих слоёв; общий component test не является evidence закрытия

#### Scenario: Исходный FAIL не воспроизводится
- **WHEN** окружение отсутствует либо точный reproducer уже проходит до fix
- **THEN** исполнитель сообщает blocked/unreproduced с причиной и наблюдением; не выдаёт искусственно сломанный тест за исходный FAIL и не заявляет проверенное закрытие

### Requirement: Scoped self-check до QG
Frontend SHALL выполнять краткий browser self-check изменённых механизмов до первого QG; Backend SHALL предоставлять применимые paired wire и real transaction/topology acceptance. Owner tests SHALL оставаться запускаемыми в проекте. Self-check MUST NOT заменять независимый QG или дублировать весь browser gate.

#### Scenario: Передача UI изменений
- **WHEN** diff меняет controls, modals или tables CMS
- **THEN** исполнитель сообщает выбранные Chromium 1366×768 scenario IDs и evidence contrast/keyboard/focus/scroll по рискам; неприменимые механизмы объяснены

#### Scenario: Передача wire или recovery изменений
- **WHEN** diff затрагивает DTO/envelope, recovery transaction либо startup topology
- **THEN** owner передаёт production producer→consumer checks, real-PG rollback/recovery или existing-topology негативные проверки соответственно; mock-only coverage не заменяет их

### Requirement: Конечный и недублирующий QG
Перед запуском QG SHALL иметь реестр scenario IDs с одним владельцем evidence, prerequisites, бюджетом и stop condition. Соседние lanes SHALL ссылаться на общее доказательство и проверять свою границу, не воспроизводить одно finding независимо без причины. QG SHALL независимо исполнять owner tests и дополнять их по риску, не принимать owner PASS на веру.

#### Scenario: Один identity finding в двух lanes
- **WHEN** BE и CONTRACTS проверяют пересекающееся NATS свойство
- **THEN** один назначенный lane воспроизводит его, второй проверяет достаточность evidence и свою часть контракта; дублирующий harness не строится

#### Scenario: Исчерпан бюджет или повторный раунд
- **WHEN** конечный набор выполнен, возник ключевой blocker, исчерпан бюджет либо после единственного recheck finding остаётся открытым
- **THEN** lane останавливается с passed/failed/unchecked и причинами; SYNTH не скрывает gap, Router передаёт решение пользователю, а не расширяет сценарии бесконечно
