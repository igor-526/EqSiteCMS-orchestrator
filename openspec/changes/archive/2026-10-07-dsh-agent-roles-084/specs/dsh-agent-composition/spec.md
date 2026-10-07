## ADDED Requirements

### Requirement: Router preset EqSiteCMS в версионируемом bundle
Профиль `dsh/home/profiles/web` SHALL подключать bundle `@eqsite/dsh-agents` из `dsh/home/profiles/web/bundles/eqsite-agents/` относительной ссылкой из `package.json`; bundle SHALL объявлять строку `preset-eqsite-router` пакета `@deepseek-ai/dsh-agent-preset` с `config.id: eqsite-router`, persona Router и инструментами bash, fs, fs-search, jobs, skills, todo, `ask_user_question`, workflow и subagent-control. Preset MUST NOT содержать универсальные инструменты `subagent` и `subagent_fork`: Router делегирует только через ролевые инструменты.

#### Scenario: Bundle установлен и preset смонтирован
- **WHEN** bundle установлен через `plugin_manager install_bundle` и DSH загрузил профиль
- **THEN** `plugin_manager list_bundles` показывает `@eqsite/dsh-agents`, а `list_plugins` показывает строку `preset-eqsite-router` активной без диагностики ошибки

#### Scenario: Сессия Router не видит универсального subagent
- **WHEN** в новой сессии preset `eqsite-router` выполняется `cordis_inspect_query` `Tool.listTools`
- **THEN** список содержит `delegate_planner`, `delegate_backend`, `delegate_frontend`, `delegate_site_consumer`, `delegate_quality_gate`, `workflow`, `ask_user_question`, `send_message` и не содержит `subagent` и `subagent_fork`

### Requirement: Ролевые делегирующие инструменты
Для каждой профильной роли (Planner, Backend, Frontend, Site Consumer, Quality Gate) preset SHALL монтировать отдельный экземпляр `@deepseek-ai/dsh-tool-subagent` с `provider: spawn`, уникальным `toolName` вида `delegate_<role>`, `persona` этой роли, `toolFilter`, `maxDepth: 1` и `backgroundMode: continuable`. Роль исполнителя MUST задаваться экземпляром инструмента, а не текстом prompt'а Router. Ролевые инструменты MUST NOT задавать `agentOptions` и SHALL использовать `modelSelectionSettings: false`: provider, модель и reasoning effort исполнителя наследуются от сессии Router.

#### Scenario: Исполнитель наследует модель Router
- **WHEN** Router в сессии с моделью `M` вызывает любой `delegate_<role>`
- **THEN** ребёнок работает на той же модели `M` и том же reasoning effort, а у инструмента нет параметров `provider`/`model`/`reasoning_effort`

#### Scenario: Делегирование применяет persona роли
- **WHEN** Router вызывает `delegate_backend` с заданием execution unit
- **THEN** дочерний агент стартует со своей сессией, его system prompt начинается с persona Backend, а Router получает id ребёнка для `send_message`

#### Scenario: Follow-up зависшему исполнителю
- **WHEN** исполнитель завершил активацию без handoff и без блокера
- **THEN** Router отправляет ему `send_message` с командой продолжать текущий execution unit, не создавая нового ребёнка

### Requirement: Ограничение глубины делегирования
Ролевые инструменты SHALL использовать `maxDepth: 1`: вызов из сессии Router (глубина 0) создаёт исполнителя глубины 1, а попытка исполнителя делегировать дальше (глубина 2) MUST отклоняться runtime-политикой. Значение `maxDepth: 0` MUST NOT использоваться на инструментах Router, так как оно запрещает делегирование самому Router.

#### Scenario: Исполнитель пытается делегировать
- **WHEN** агент глубины 1, которому делегирующий инструмент виден (ребёнок `workflow` без `toolFilter`), вызывает `delegate_<role>`
- **THEN** вызов завершается ошибкой превышения `maxDepth`, новый ребёнок не создаётся

#### Scenario: Конфигурация глубины видна в живом Config
- **WHEN** выполняется `cordis_inspect_query` `Config.listConfigs` для строк `delegate_*`
- **THEN** у каждой строки `maxDepth` равен `1`

### Requirement: Ограничение инструментов исполнителя
`toolFilter.deny` каждого ролевого инструмента SHALL удалять у исполнителя все `delegate_*`, `workflow` и `ask_user_question`; список SHALL содержать только имена, существующие в композиции ребёнка. Approval gates и вопросы пользователю MUST оставаться у Router; исполнитель возвращает открытые вопросы в handoff.

#### Scenario: Исполнитель не видит запрещённых инструментов
- **WHEN** исполнитель любой роли выполняет `cordis_inspect_query` `Tool.listTools`
- **THEN** в списке нет `delegate_*`, `workflow` и `ask_user_question`, а инструменты чтения, записи, bash и skills присутствуют

#### Scenario: Неизвестное имя в фильтре
- **WHEN** `toolFilter` ссылается на отсутствующее в композиции имя инструмента
- **THEN** старт ребёнка падает с явной ошибкой, и smoke фиксирует это как дефект конфигурации, а не как пропуск проверки

### Requirement: Persona из единого источника правил
Persona профильной роли SHALL собираться при активации preset выражением `!!js` из блока между маркерами `<!-- dsh-persona:begin -->` и `<!-- dsh-persona:end -->` в `agents/<role>.md`; текст блока MUST NOT дублироваться в YAML bundle. Блок SHALL содержать цель, роль и протокол чтения роли и MUST NOT превышать 4096 байт. Отсутствие файла или маркеров MUST приводить к явной ошибке активации, а не к пустой persona. Persona Router SHALL собираться тем же способом из всего файла `agents/router.md` (не более 24 576 байт); отсутствие файла MUST приводить к ошибке активации. Ядро `AGENTS.md` SHALL поступать всем агентам через `dsh-agent-instructions`, поэтому дети MUST NOT получать Router-правила ни через persona, ни через workspace instructions.

#### Scenario: Router получает свои правила без чтения файла
- **WHEN** в новой сессии `eqsite-router` пользователь просит процитировать первый заголовок `agents/router.md`, не вызывая инструменты
- **THEN** Router отвечает дословно, потому что `agents/router.md` уже входит в его persona

#### Scenario: Исполнитель не получает Router-правил
- **WHEN** ребёнок `delegate_<role>` проверяет свой system prompt и workspace instructions
- **THEN** в них есть ядро `AGENTS.md` и persona-блок роли, но нет секций из `agents/router.md`

#### Scenario: Правка правил роли
- **WHEN** разработчик меняет текст внутри persona-блока `agents/frontend.md` и preset перезагружается
- **THEN** новая сессия `delegate_frontend` получает обновлённую persona без правок bundle, а Codex/Claude Code читают тот же текст из того же файла

#### Scenario: Блок превысил бюджет
- **WHEN** persona-блок любой роли длиннее 4096 байт
- **THEN** проверка размера в verification реализации завершается ошибкой до установки bundle

#### Scenario: Маркеры удалены
- **WHEN** в `agents/<role>.md` нет пары маркеров persona
- **THEN** активация preset сообщает ошибку с именем файла, и строка preset остаётся в roster с диагностикой

### Requirement: Quality Gate lanes через workflow
Skill `.agents/skills/qg-lanes/` SHALL содержать процедуру и шаблон `workflow`-скрипта, исполняющего DAG `QG-ENV → (QG-BE ‖ QG-FE-AUTO ‖ QG-CONTRACTS) → (QG-LIVE ‖ QG-FE-MANUAL) → QG-SYNTH` только для применимых lanes, с JSON Schema handoff каждого lane. Так как `agent()` не применяет persona и `toolFilter`, роль lane MUST назначаться преамбулой prompt'а (по правилу «Определение роли» в `AGENTS.md`) со ссылкой на секцию `agents/quality_gate.md`. Скрипт MUST NOT задавать вопросы пользователю; вердикт `APPROVED`/`REWORK` SHALL ставить только `QG-SYNTH`. Router SHALL иметь fallback — запуск lanes через `delegate_quality_gate`.

#### Scenario: Провал QG-ENV
- **WHEN** lane `QG-ENV` возвращает статус `failed`
- **THEN** скрипт не запускает зависимые lanes, `QG-SYNTH` получает их как `blocked` и возвращает вердикт `REWORK` или `BLOCKED` с причиной

#### Scenario: Неприменимый lane
- **WHEN** в `args.lanes` lane помечен неприменимым с обоснованием
- **THEN** скрипт не запускает его, а `QG-SYNTH` отражает lane как `неприменимо` с этим обоснованием

#### Scenario: Handoff lane не прошёл схему
- **WHEN** ребёнок lane вернул ответ, не соответствующий JSON Schema, и `agent()` разрешился в `null`
- **THEN** lane отражается как `failed (no structured handoff)`, и Router повторяет только этот lane

### Requirement: Доступ Router к процедурным skills
Сессия `eqsite-router` SHALL видеть skills OpenSpec из `.claude/skills` (через `customSkillDirs` скилл-провайдера preset) и skills из `.agents/skills`, включая skill финализации change 083, без копирования их содержимого в bundle.

#### Scenario: Каталог skills Router
- **WHEN** в новой сессии `eqsite-router` проверяется каталог skills
- **THEN** в нём присутствуют `openspec-propose`, `openspec-apply-change`, `openspec-sync-specs`, `openspec-archive-change`, `stack-control`, `ui-qa`, `qg-lanes` и `task-finalize` (change 083 реализуется раньше 084)

### Requirement: Переносимость и отсутствие секретов
Версионируемая конфигурация профиля и bundle MUST NOT содержать абсолютных путей пользователя, API-ключей и токенов; пути к репозиторию SHALL вычисляться выражением `!!js` от `dshHomePath()`, ключи провайдеров SHALL задаваться только именами переменных окружения.

#### Scenario: Поиск абсолютных путей
- **WHEN** выполняется поиск строки `/home/` и ключевых шаблонов секретов по `dsh/home/profiles/web/{package.json,cordis.patch.yml,bundles/**}` и `dsh-integration/plugins/playwright-mcp/{package.json,cordis.patch.yml}`
- **THEN** совпадений нет

### Requirement: Отсутствие неподключённых черновиков интеграции
Профиль SHALL содержать только реально подключаемые слои (`cordis.yml`, `cordis.patch.yml`, bundles из `package.json`); неподключённые `cordis.patch.*.yml`, `cordis.patch.yml.backup` и черновики `dsh-integration/**`, кроме `dsh-integration/plugins/playwright-mcp`, MUST быть удалены без создания архивов или резервных копий в репозитории.

#### Scenario: Ревизия каталога профиля
- **WHEN** просматривается `dsh/home/profiles/web` и `dsh-integration`
- **THEN** нет файлов `cordis.patch.*.yml` кроме `cordis.patch.yml`, нет `cordis.patch.yml.backup`, а в `dsh-integration` остался только `plugins/playwright-mcp`

### Requirement: Проверка по живой конфигурации и default preset
Готовность композиции SHALL подтверждаться только живой конфигурацией: `plugin_manager list_bundles`/`list_plugins`, `cordis_inspect_query` `Config.listConfigs`/`Tool.listTools` и smoke-делегированием каждой роли в новой сессии. `eqsite-router` SHALL становиться `default` в `agent-preset-registry` только после успешного smoke; `standard` SHALL оставаться выбираемым. Перезапуск DSH, если профиль не применяет изменения live, является внешним шагом пользователя.

#### Scenario: Smoke роли
- **WHEN** Router в новой сессии `eqsite-router` вызывает `delegate_<role>` с тестовым заданием «назови свою роль и выполни Tool.listTools»
- **THEN** ответ ребёнка называет ожидаемую роль и первую строку её persona-блока, а его список инструментов соответствует `toolFilter` (нет `delegate_*`, `workflow`, `ask_user_question`)

#### Scenario: Smoke пройден
- **WHEN** все роли и проверки `SMOKE-1` прошли
- **THEN** в `cordis.patch.yml` профиля появляется override `agent-preset-registry` с `default: eqsite-router`, новая сессия без явного выбора стартует с `eqsite-router`, а `standard` доступен для ручного выбора

#### Scenario: Smoke не пройден
- **WHEN** хотя бы одна роль не прошла smoke
- **THEN** default preset не переключается, и в профиле остаётся `standard`
