# Tasks — dsh-agent-roles-084

Ownership и порядок — по таблице ниже; DAG, test matrix (`CFG-*`, `LV-*`) и решения D1–D11 лежат в `design.md`, здесь на них только ссылки.

`contextFiles` перечислены **по units**, а не общим списком на весь change. `proposal.md` читается один раз; исполнитель получает только указанные разделы `design.md` и нужный `specs/<capability>/spec.md`. Access matrix — неприменимо (endpoint'ов нет).

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `DOC-0` | Planner | `AGENTS.md`, `agents/router.md` (новый), ссылки в `WORKFLOW.md`, `agents/howto/README.md`, `agents/howto/context-economy-patterns.md` | 083 `DOC-1` (жёстко), фактически 083 `QG-SYNTH` | `CFG-08`, `CFG-09`, `CFG-10` | `design.md` → D6, D11; `specs/openspec-workflow/spec.md` («Единый источник корневых агентных правил», «Операционные шаги финализации…»); `AGENTS.md` целиком (переносимый файл); handoff 083 `DOC-1` |
| `DOC-1` | Planner | `agents/{planner,backend,frontend,site_consumer,quality_gate}.md` (только persona-маркеры/блок) | 083 `DOC-1` (жёстко) | `CFG-01` | `design.md` → D5 (профильные роли); `specs/dsh-agent-composition/spec.md` («Persona из единого источника правил»); заголовки и первые 45 строк каждого `agents/<role>.md` |
| `DSH-1` | Backend | `dsh/home/profiles/web/bundles/eqsite-agents/**`, `dsh/home/profiles/web/package.json`, `dsh/home/profiles/web/pnpm-lock.yaml` | `DOC-0` | `CFG-03`, `LV-01` | `design.md` → D1, D2, D5 (Router), D8; spec «Router preset EqSiteCMS в версионируемом bundle», «Доступ Router к процедурным skills», «Persona из единого источника правил»; skill `editing-cordis-compositions`; `dsh/node_modules/@deepseek-ai/dsh-web-app/presets/standard.patch.yml`; handoff `DOC-0` |
| `DSH-2` | Backend | `dsh/home/profiles/web/bundles/eqsite-agents/cordis.patch.yml` | `DSH-1`, `DOC-1` | `CFG-04`, `LV-02` | `design.md` → D3, D4, D5; spec «Ролевые делегирующие инструменты», «Ограничение глубины», «Ограничение инструментов исполнителя», «Persona из единого источника правил»; README `dsh-tool-subagent` («Use this package»); handoff `DSH-1`, `DOC-1` |
| `QGW-1` | Backend | `.agents/skills/qg-lanes/**` | — | `CFG-05` | `design.md` → D7; spec «Quality Gate lanes через workflow»; секция QG lanes из `AGENTS.md` (до `DOC-0`) или `agents/router.md` (после); README `dsh-tool-workflow`/`dsh-workflow-ptc` («Use this package»); `.agents/skills/stack-control/SKILL.md` (формат frontmatter) |
| `CLEAN-1` | Backend | `dsh/home/profiles/web/cordis.patch.{eqsite-complete,fixes,mvp-additions,browser-automation}.yml` и `cordis.patch.yml.backup` (удаление), `dsh/home/profiles/web/cordis.patch.yml` (`documentsDirectory`), `dsh/home/profiles/web/package.json` (ссылка playwright-mcp), `dsh-integration/**`, `dsh/README.md` | `DSH-1` | `CFG-06`, `CFG-07`, `LV-01` | `design.md` → D10, Migration Plan; spec «Переносимость и отсутствие секретов», «Отсутствие неподключённых черновиков интеграции»; handoff `DSH-1` |
| `SMOKE-1` | Backend | — (evidence в `.qa/dsh-084/`) | `DSH-2`, `QGW-1`, `CLEAN-1` | `LV-03..LV-10` | `design.md` → `## Test matrix` (LV-03..10, «Метод smoke»); spec `dsh-agent-composition` (все scenarios); `.agents/skills/qg-lanes/SKILL.md`; handoff `DSH-2`, `QGW-1`, `CLEAN-1` |
| `DSH-3` | Backend | `dsh/home/profiles/web/cordis.patch.yml` (строка `agent-preset-registry`), `dsh/README.md` (раздел default) | `SMOKE-1` | `LV-11` | `design.md` → D9; spec «Проверка по живой конфигурации и default preset»; handoff `SMOKE-1`, `CLEAN-1` |
| `QG-CONTRACTS` | Quality Gate | — | `DSH-3` | ревью diff vs specs/tasks, повтор `CFG-01..10`, evidence `SMOKE-1`, strict validation | `design.md` → `## Execution units`, `## Test matrix`, D6; оба `specs/*/spec.md`; handoff'ы всех units |
| `QG-SYNTH` | Quality Gate | `docs/reports/084-dsh-agent-roles-review.md` | `QG-CONTRACTS` | один отчёт, вердикт | handoff `QG-CONTRACTS`; `design.md` → `## Execution units` |
| `OPS-SYNC` | Router/OpenSpec | `openspec/specs/**` | `QG-SYNTH = APPROVED`, архив 083 | `openspec validate --specs --strict` | `.claude/skills/openspec-sync-specs`; `design.md` → D11 |
| `OPS-ARCHIVE` | Router/OpenSpec | `openspec/changes/archive/**` | `OPS-SYNC` | `openspec list` | `.claude/skills/openspec-archive-change` |

Неприменимые lanes Quality Gate: `QG-ENV` — нет diff runtime-сервисов/Docker; `QG-BE` — нет Python diff; `QG-FE-AUTO`, `QG-FE-MANUAL` — нет diff `services/frontend`/`site-*`; `QG-LIVE` — нет runtime API diff (живая проверка DSH-конфигурации — `SMOKE-1`).

DAG: 083 `DOC-1` (фактически 083 `QG-SYNTH`) → `DOC-0` ‖ `DOC-1`; `DOC-0 → DSH-1`; `DSH-1 + DOC-1 → DSH-2`; `DSH-1 → CLEAN-1`; `QGW-1` — без зависимостей; `DSH-2 + QGW-1 + CLEAN-1 → SMOKE-1 → DSH-3 → QG-CONTRACTS → QG-SYNTH → OPS-SYNC` (после архива 083) `→ OPS-ARCHIVE` (см. `design.md` → `## Execution units`).

Внешний шаг пользователя: перезапуск DSH (`npm run web` в `dsh/`) и обновление Web GUI, если `plugin_manager` сообщает, что изменения профиля не применены live. Unit, упёршийся в этот шаг, возвращает `blocked` с точной командой.

## 1. DOC-0 — разделение `AGENTS.md` на ядро и `agents/router.md` (профиль: Planner)

**Specs:** `openspec-workflow` · **Пути:** `AGENTS.md`, `agents/router.md`, ссылки в `WORKFLOW.md`, `agents/howto/{README,context-economy-patterns}.md` · **Зависит от:** 083 `DOC-1` (жёстко; запуск после 083 `QG-SYNTH`)

- [x] DOC-0.1 Сохранить список заголовков текущего `AGENTS.md` (включая правки 083) во временный файл вне репозитория для `CFG-09`
- [x] DOC-0.2 Создать `agents/router.md`: перенести дословно Router-секции по таблице `design.md` → D6, включая указатель `task-finalize` и пункт Чеклиста Router из 083
- [x] DOC-0.3 Сократить `AGENTS.md` до общего ядра по D6 (ownership, бюджет unit, handoff, circuit breaker, howto, API Access Policy, контекст проекта), убрав перенесённые секции
- [x] DOC-0.4 Добавить первой секцией `AGENTS.md` «Определение роли» по D6 (роль назначена → `agents/<role>.md`; нет роли и верхний уровень → Router, прочитать `agents/router.md`; в `eqsite-router` не перечитывать)
- [x] DOC-0.5 Обновить ссылки на перенесённые секции в `WORKFLOW.md`, `agents/howto/README.md`, `agents/howto/context-economy-patterns.md`
- [x] DOC-0.V Прогнать `CFG-08`, `CFG-09`, `CFG-10`, отметить выполненные task IDs и вернуть handoff (размеры `AGENTS.md` и `agents/router.md` в байтах)

## 2. DOC-1 — persona-блоки ролей (профиль: Planner)

**Specs:** `dsh-agent-composition` · **Пути:** `agents/{planner,backend,frontend,site_consumer,quality_gate}.md` · **Зависит от:** 083 `DOC-1` (жёстко)

- [x] DOC-1.1 `agents/backend.md` и `agents/frontend.md`: обернуть «Цель/Роль» и `## 0. Протокол чтения` маркерами `<!-- dsh-persona:begin -->`/`<!-- dsh-persona:end -->` без изменения правил
- [x] DOC-1.2 `agents/planner.md`, `agents/quality_gate.md`, `agents/site_consumer.md`: обернуть вводные строки и краткий список «ядро / по требованию» (из существующих заголовков) маркерами persona
- [x] DOC-1.3 Убедиться, что каждый блок ссылается на формат handoff и circuit breaker из `AGENTS.md`, не копируя их текст
- [x] DOC-1.V Прогнать `CFG-01` из `design.md` → `## Test matrix`, отметить выполненные task IDs и вернуть handoff (размеры блоков в байтах)

## 3. DSH-1 — bundle и Router preset (профиль: Backend)

**Specs:** `dsh-agent-composition` · **Пути:** `dsh/home/profiles/web/bundles/eqsite-agents/**`, `dsh/home/profiles/web/{package.json,pnpm-lock.yaml}` · **Зависит от:** `DOC-0`

- [x] DSH-1.1 Создать `bundles/eqsite-agents/package.json` (`@eqsite/dsh-agents`, `type: module`, `dsh.bundle.patch`) по `design.md` → D1
- [x] DSH-1.2 Создать `bundles/eqsite-agents/cordis.patch.yml` с `insert` строки `preset-eqsite-router` (`config.id: eqsite-router`, `name`, `description`, `order`) и списком плагинов по D2, включая группу `delegation` (`isolate: {workflowEngine: true}`) с `tool-subagent-control`, `tool-subagent-control/list-agents`, `workflow-ptc` (`provider: spawn`), `tool-workflow` — без `tool-subagent`, `tool-subagent-fork`, codex/claude-code, `tool-ralph`
- [x] DSH-1.3 Persona Router через `!!js` из `agents/router.md` целиком по D5 (Router) и `skill-filesystem.customSkillDirs` через `!!js` по D8
- [x] DSH-1.4 Установить bundle через `plugin_manager install_bundle` (абсолютный путь каталога bundle)
- [x] DSH-1.5 Нормализовать зависимость в `package.json` профиля на `link:./bundles/eqsite-agents`, выполнить `DSH_HOME=./home dsh plugin --profile web install` из `dsh/`
- [x] DSH-1.6 Прогнать `CFG-03` (`dsh --profile web --dump-config` содержит `preset-eqsite-router`)
- [x] DSH-1.V Прогнать `LV-01` (`list_bundles`, `list_plugins` — строка активна без диагностики, `!!js` persona Router вычислилась); при необходимости рестарта — `blocked` с командой; при недоступности `process.getBuiltinModule`/`dshHomePath` — fallback `persona.cjs` из Risks; отметить task IDs и вернуть handoff (фактическая форма `!!js`)

## 4. DSH-2 — ролевые делегирующие инструменты (профиль: Backend)

**Specs:** `dsh-agent-composition` · **Пути:** `dsh/home/profiles/web/bundles/eqsite-agents/cordis.patch.yml` · **Зависит от:** `DSH-1`, `DOC-1`

- [x] DSH-2.1 Добавить в группу `delegation` строку `delegate-planner` (`dsh-tool-subagent`, `provider: spawn`, `toolName: delegate_planner`, `maxDepth: 1`, `backgroundMode: continuable`, `modelSelectionSettings: false`, без `agentOptions`) с `!!js` persona из блока `agents/planner.md` по D5
- [x] DSH-2.2 Переустановить bundle и проверить одну роль (`LV-02` для `delegate-planner`)
- [x] DSH-2.3 Добавить строки `delegate-backend`, `delegate-frontend`, `delegate-site-consumer`, `delegate-quality-gate` по таблице D3
- [x] DSH-2.4 Задать общий `toolFilter.deny` по D3 (только имена из композиции `eqsite-router`, без `mcp__*` и host-инструментов)
- [x] DSH-2.5 Прогнать `CFG-04` по `--dump-config`
- [x] DSH-2.V Переустановить bundle, прогнать `LV-02` для всех пяти строк, отметить task IDs и вернуть handoff

## 5. QGW-1 — skill `qg-lanes` (профиль: Backend)

**Specs:** `dsh-agent-composition` · **Пути:** `.agents/skills/qg-lanes/**` · **Зависит от:** —

- [x] QGW-1.1 `handoff.schema.json`: схема lane и схема `QG-SYNTH` по D7, только допустимые ключевые слова
- [x] QGW-1.2 `lanes.workflow.js`: уровни DAG через `phase()`/`parallel()`, пропуск неприменимых lanes, `blocked` для зависимых от `failed`/`blocked`, схемы из `args.schemas`
- [x] QGW-1.3 Преамбула назначения роли lane в prompt («Определение роли», секция `agents/quality_gate.md`, `contextFiles`, запрет вопросов и делегирования)
- [x] QGW-1.4 Режим `args.dryRun` (`{fail?: [lane]}`) и повтор подмножества `args.only`
- [x] QGW-1.5 `QG-SYNTH`: сведение handoff'ов, запись одного отчёта по `args.report_path`, вердикт `APPROVED|REWORK|BLOCKED`
- [x] QGW-1.6 `SKILL.md` (< 8192 символов, frontmatter `name/description/whenToUse`): сбор `args`, передача скрипта в `workflow`, разбор результата, fallback на `delegate_quality_gate`, approval gates у Router
- [x] QGW-1.V Прогнать `CFG-05`, отметить task IDs и вернуть handoff

## 6. CLEAN-1 — уборка черновиков и переносимость (профиль: Backend)

**Specs:** `dsh-agent-composition` · **Пути:** см. таблицу units · **Зависит от:** `DSH-1`

- [x] CLEAN-1.1 Удалить без архива `dsh/home/profiles/web/cordis.patch.{eqsite-complete,fixes,mvp-additions,browser-automation}.yml` и `cordis.patch.yml.backup` (проверить абсолютные пути перед удалением)
- [x] CLEAN-1.2 Удалить без архива `dsh-integration/**`, кроме `dsh-integration/plugins/playwright-mcp/{package.json,cordis.patch.yml,node_modules}`
- [x] CLEAN-1.3 Заменить абсолютный `cwd` в `dsh-integration/plugins/playwright-mcp/cordis.patch.yml` и `documentsDirectory` в `cordis.patch.yml` профиля на `!!js` от `dshHomePath()`; ссылку `@eqsite/playwright-mcp` — на относительную `link:`
- [x] CLEAN-1.4 Выполнить `DSH_HOME=./home dsh plugin --profile web install`, переустановить/перезагрузить профиль, проверить, что Playwright MCP стартует (`mcp__pw__*` в `Tool.listTools`)
- [x] CLEAN-1.5 Добавить в `dsh/README.md` раздел «Агентные роли EqSiteCMS» (установка bundle, проверка, применение правок persona-блоков и `agents/router.md`, рестарт)
- [x] CLEAN-1.6 Проверить, что новые файлы bundle не попадают под `.gitignore` (`git check-ignore`)
- [x] CLEAN-1.V Прогнать `CFG-06`, `CFG-07`, `LV-01`, отметить task IDs и вернуть handoff

## 7. SMOKE-1 — live-проверка композиции (профиль: Backend)

**Specs:** `dsh-agent-composition`, `openspec-workflow` · **Пути:** `.qa/dsh-084/**` (только evidence) · **Зависит от:** `DSH-2`, `QGW-1`, `CLEAN-1`

- [x] SMOKE-1.1 Подготовить `.qa/dsh-084/smoke-prompt.md`: шаги `LV-03..LV-10` для Router-сессии с ожидаемыми результатами
- [x] SMOKE-1.2 Через Playwright MCP открыть `http://127.0.0.1:3080`, создать новую сессию с preset `eqsite-router`, отправить smoke-prompt; при недоступности GUI — `blocked` с просьбой пользователю отправить prompt вручную
- [x] SMOKE-1.3 Проверить `LV-03` (инструменты Router, `agents/router.md` в persona) и `LV-09` (skills)
- [x] SMOKE-1.4 Проверить `LV-04` и `LV-10` для пяти ролей (роль, persona-блок, нет Router-правил, фильтр инструментов, модель = модель Router, `mcp__pw__*`)
- [x] SMOKE-1.5 Проверить `LV-05` (workflow-probe → `exceeds maxDepth`) и `LV-06` (`send_message` продолжает того же ребёнка)
- [x] SMOKE-1.6 Проверить `LV-07` и `LV-08` (dry-run `qg-lanes`)
- [x] SMOKE-1.7 Сохранить evidence: id сессии, скриншоты, выдержки из `dsh/home/sessions/` в `.qa/dsh-084/`
- [x] SMOKE-1.V Свести результаты `LV-03..LV-10` в `.qa/dsh-084/smoke-result.md`, отметить task IDs и вернуть handoff; любой провал — finding владельцу (`DSH-2`/`QGW-1`/`DOC-0`/`DOC-1`) как новый unit

## 8. DSH-3 — default preset после smoke (профиль: Backend)

**Specs:** `dsh-agent-composition` · **Пути:** `dsh/home/profiles/web/cordis.patch.yml`, `dsh/README.md` · **Зависит от:** `SMOKE-1` (все `LV-03..LV-10` пройдены)

- [x] DSH-3.1 Добавить в `cordis.patch.yml` override строки `agent-preset-registry` с `config.default: eqsite-router` по D9 (утверждено пользователем)
- [x] DSH-3.2 Применить профиль и описать в `dsh/README.md` rollback (удаление строки)
- [x] DSH-3.V Прогнать `LV-11`, отметить task IDs и вернуть handoff

## 9. QG-CONTRACTS — контракты и соответствие (профиль: Quality Gate)

**Specs:** `dsh-agent-composition`, `openspec-workflow` · **Пути:** — · **Зависит от:** `DSH-3`

- [x] QG-CONTRACTS.1 Сверить diff с delta specs и tasks (ownership, отсутствие runtime-изменений сервисов, неприменимость access matrix)
- [x] QG-CONTRACTS.2 Повторить `CFG-01..CFG-10`; построчно сравнить перенесённые секции `AGENTS.md` → `agents/router.md` (нормы не изменены); проверить evidence `SMOKE-1`
- [x] QG-CONTRACTS.3 Проверить отсутствие конфликтов с 083 в `AGENTS.md`, `agents/router.md`, `agents/quality_gate.md` и delta `openspec-workflow`
- [x] QG-CONTRACTS.V Прогнать `openspec validate dsh-agent-roles-084 --type change --strict`, вернуть handoff с findings

## 10. QG-SYNTH — единый вердикт (профиль: Quality Gate)

**Пути:** `docs/reports/084-dsh-agent-roles-review.md` · **Зависит от:** `QG-CONTRACTS`

- [x] QG-SYNTH.1 Свести findings, отразить неприменимые lanes с обоснованием, записать один отчёт
- [x] QG-SYNTH.V Поставить вердикт `APPROVED`/`REWORK` и вернуть handoff

## 11. OPS — sync и archive (Router/OpenSpec)

**Зависит от:** `QG-SYNTH = APPROVED`, архив change 083

- [x] OPS-SYNC.1 Сверить MODIFIED-блок «Операционные шаги финализации выполняет Router по skill task-finalize» с финальным текстом main spec после архива 083; при расхождении обновить delta и повторить strict validation change
- [x] OPS-SYNC.2 Синхронизировать delta specs в `openspec/specs/**` (skill `openspec-sync-specs`)
- [x] OPS-SYNC.V Прогнать `openspec validate --specs --strict`
- [ ] OPS-ARCHIVE.1 Архивировать change (skill `openspec-archive-change`) и проверить `openspec list`
