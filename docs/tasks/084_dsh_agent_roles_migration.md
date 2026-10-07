# Перенос агентных ролей в DeepSeek Harness

## Контекст

Проект переезжает на DeepSeek Harness (DSH, проектная установка в `dsh/`, профиль `dsh/home/profiles/web`). Роли агентов (Router, Planner, Backend, Frontend, Site Consumer, Quality Gate) сейчас описаны в `AGENTS.md` и `agents/*.md` и передаются субагентам текстом в prompt.

Ранее в `dsh-integration/` готовилась интеграция, но она не работает:

- presets `eqsite-*` лежат в `dsh/home/profiles/web/cordis.patch.eqsite-complete.yml`, `cordis.patch.fixes.yml`, `cordis.patch.mvp-additions.yml`, `cordis.patch.browser-automation.yml` и **не подключены** — DSH читает только `cordis.patch.yml` и bundles из `package.json`;
- конфиги используют несуществующие поля: у `@deepseek-ai/dsh-persona` нет `sections` (есть только `prefix`, `suffix`, `complete`, `includeRuntimeContext`), у `@deepseek-ai/dsh-tool-subagent` нет `allowedPresets`;
- плагины `dsh-integration/plugins/{openspec-tool,context-builder,openspec-commands}` и `ui/workflow-dashboard` не установлены и используют выдуманный API (`ctx.Tool.define`);
- `dsh-integration/FINAL_SUMMARY.md` («Production Ready») не соответствует живой конфигурации.

## Цель

Сделать роли агентов настоящими DSH-композициями, проверяемыми через живую конфигурацию.

## Реальные механизмы DSH (проверено по README пакетов в `dsh/node_modules/@deepseek-ai/`)

- `dsh-agent-preset` + `dsh-agent-preset-registry` — preset сессии (Router) со списком дочерних плагинов.
- `dsh-persona` — persona preset'а (`prefix`/`suffix`, шаблоны), монтируется только внутри preset.
- `dsh-tool-subagent` — один экземпляр на цель делегирования с уникальным `toolName`; поддерживает `persona`, `toolFilter`, `agentOptions`, `maxDepth`, `backgroundMode`. Выбрать preset при вызове subagent нельзя — роль задаётся экземпляром инструмента (`delegate_planner`, `delegate_backend`, …).
- `dsh-tool-workflow` / `dsh-workflow-ptc` — JS-оркестрация `agent()/parallel()/pipeline()` со структурированным выводом по JSON Schema; вопрос пользователю изнутри скрипта задать нельзя.
- `dsh-user-questions` (`ask_user_question`) — структурированные approval gates.
- `dsh-skill-filesystem` — skills из `<projectRoot>/.agents/skills` и `.dsh/skills`.
- Cordis Loader поддерживает `!!js` выражения в patch (см. skill `cordis-composition-reference`).

## Требования

1. Router — DSH preset с persona; approval gates через `ask_user_question`.
2. Профильные роли — отдельные delegation tools с persona и ограничением инструментов.
3. Quality Gate lanes — по возможности через `workflow` (DAG lanes, структурированный handoff).
4. Единый источник правил: решить судьбу `AGENTS.md`/`agents/*.md` (Codex/Claude Code тоже их читают) — например, persona загружает текст из md через `!!js`, чтобы не дублировать.
5. Конфигурация переносимая (версионируется в `dsh/home/profiles/web/`), без секретов.
6. Черновики `dsh-integration/` и неподключённые `cordis.patch.*.yml` удаляются или заменяются.
7. Проверка — по живой конфигурации (`plugin_manager list_plugins`, `cordis_inspect_query`), а не по документам.

## Связь с 083

Change 083 (финализация задачи: ready-for-manual, merge, release) делает engine `scripts/shipctl` и skill `task-finalize`. 084 не меняет их поведение, только подключает к Router preset.
