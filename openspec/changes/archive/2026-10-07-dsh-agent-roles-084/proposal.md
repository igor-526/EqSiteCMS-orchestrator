## Why

Роли агентов EqSiteCMS (Router, Planner, Backend, Frontend, Site Consumer, Quality Gate) сейчас существуют только как текст в `AGENTS.md`/`agents/*.md` и передаются субагентам prompt'ом; ничто в DeepSeek Harness (DSH) не гарантирует, что исполнитель получил свою роль, не делегирует дальше и не видит лишних инструментов. Подготовленная ранее интеграция в `dsh-integration/` и `cordis.patch.*.yml` не подключена к профилю и использует несуществующие поля (`sections`, `allowedPresets`, `ctx.Tool.define`), поэтому её «Production Ready» статус ложный. Проект уже работает в DSH (`dsh/home/profiles/web`), и без настоящих композиций workflow держится только на дисциплине модели.

## What Changes

- Новый переносимый bundle `@eqsite/dsh-agents` в `dsh/home/profiles/web/bundles/eqsite-agents/` (подключается через `package.json` профиля относительной `link:`-ссылкой) объявляет preset `eqsite-router` (`@deepseek-ai/dsh-agent-preset`) с `dsh-persona`, инструментами Router (bash, fs, skills, `ask_user_question`, jobs, todo, workflow, subagent-control) и **без** универсального `subagent`.
- Пять делегирующих инструментов — отдельные экземпляры `@deepseek-ai/dsh-tool-subagent` на provider `spawn`: `delegate_planner`, `delegate_backend`, `delegate_frontend`, `delegate_site_consumer`, `delegate_quality_gate`; у каждого `persona`, `toolFilter.deny` (делегирование, workflow, `ask_user_question`), `maxDepth: 1` (Router → исполнитель разрешено, исполнитель → внук запрещён), `backgroundMode: continuable` для follow-up через `send_message`.
- Единый источник правил: persona каждой профильной роли собирается при загрузке preset через `!!js` из размеченного блока `<!-- dsh-persona:begin -->…<!-- dsh-persona:end -->` в `agents/<role>.md` (цель, роль и «Протокол чтения», ≤ 4096 байт); persona `eqsite-router` — весь `agents/router.md` через тот же `!!js` (≤ 24 576 байт, стабильный prefix → KV-cache, не режется pruner'ом/compaction). Модель и effort ролей наследуются от Router (`agentOptions` не задаются).
- **Разделение корневых правил:** `AGENTS.md` становится коротким общим ядром для всех агентов (≤ 12 288 байт: контекст проекта, ownership, бюджет unit, handoff, circuit breaker, howto, API Access Policy) с первой секцией «Определение роли»; всё Router-специфичное (Router-first/OpenSpec шаги, декомпозиция и делегирование, анти-зависание, экономия контекста Router, протокол передачи контекста, QG-оркестрация, карта агентов, маршрутизация, примеры, чеклист, указатель `task-finalize` из 083) переносится в новый `agents/router.md` без изменения норм. Верхнеуровневый агент без роли (Codex/Claude Code/DSH `standard`) — Router и читает `agents/router.md`; субагент с ролью его не читает. `CLAUDE.md` остаётся указателем на `AGENTS.md`. Дети больше не получают «Твоя роль: Router» (~18,6 КБ экономии на каждом запросе ребёнка).
- Quality Gate lanes: новый skill `.agents/skills/qg-lanes/` с шаблоном `workflow`-скрипта DAG `QG-ENV → (QG-BE ‖ QG-FE-AUTO ‖ QG-CONTRACTS) → (QG-LIVE ‖ QG-FE-MANUAL) → QG-SYNTH` и JSON Schema handoff lane; роль lane передаётся prompt'ом (workflow `agent()` не поддерживает persona), fallback — `delegate_quality_gate` по lane. Approval gates и решение о повторе lanes остаются у Router.
- Router preset видит skills OpenSpec (`.claude/skills` через `customSkillDirs`) и skill финализации из change 083 (`task-finalize`, `.agents/skills`); 084 не меняет их поведение.
- `eqsite-router` становится default preset профиля (`agent-preset-registry.default`) после успешного smoke (утверждено); `standard` остаётся выбираемым fallback.
- **BREAKING (для черновиков):** без архива удаляются неподключённые `dsh/home/profiles/web/cordis.patch.{eqsite-complete,fixes,mvp-additions,browser-automation}.yml`, `cordis.patch.yml.backup`, а также `dsh-integration/**`, кроме реально подключённого `dsh-integration/plugins/playwright-mcp`; абсолютные пути в его конфигурации заменяются переносимыми.
- Проверка — по живой конфигурации: `plugin_manager list_bundles/list_plugins`, `cordis_inspect_query` (`Config.listConfigs`, `Tool.listTools` в сессии preset), smoke-делегирование каждой роли с проверкой persona и отказа по `maxDepth`.

## Capabilities

### New Capabilities

- `dsh-agent-composition`: декларативная композиция ролей EqSiteCMS в DSH — Router preset, делегирующие инструменты по ролям, persona из единого источника, ограничения инструментов и глубины, QG workflow, переносимость и проверка по живой конфигурации.

### Modified Capabilities

- `openspec-workflow`: требования «Профильная мультиагентная реализация», «Анти-зависание исполнения», «Единый итоговый Quality Gate» и «Единый источник корневых агентных правил» уточняются: делегирование одного execution unit через ролевой инструмент, follow-up через `send_message` в границах unit, lane-модель Quality Gate с допускаемым workflow-исполнением, разделение `AGENTS.md` (ядро) / `agents/router.md` (Router) с правилом «Определение роли». Требование «Операционные шаги финализации выполняет Router по skill task-finalize» (добавляется change 083) меняет место шага-указателя: `agents/router.md` вместо `AGENTS.md`. Требование «Синхронизация и архивирование» не трогается.

## Impact

- Пути: `dsh/home/profiles/web/{package.json,cordis.patch.yml,bundles/eqsite-agents/**}`, удаляемые `dsh/home/profiles/web/cordis.patch.*.yml`, `cordis.patch.yml.backup`; `dsh-integration/**` (удаление всего, кроме `plugins/playwright-mcp`); `AGENTS.md` (сокращение до ядра); новый `agents/router.md`; `agents/{planner,backend,frontend,site_consumer,quality_gate}.md` (только persona-блоки); ссылки в `WORKFLOW.md`, `agents/howto/{README,context-economy-patterns}.md`; `.agents/skills/qg-lanes/**`; `dsh/README.md`.
- Runtime-код сервисов, Docker-стек, API и NATS-контракты не меняются. Endpoint'ов нет — access matrix неприменима.
- Изменение профиля применяется установкой bundle через `plugin_manager`; если профиль работает как startup-профиль, нужен перезапуск DSH пользователем (внешний шаг). Существующие сессии сохраняют старую ревизию preset — проверки выполняются в новой сессии.
- Жёсткая зависимость от change 083 (реализуется первым): units `DOC-0`/`DOC-1` 084 стартуют только после 083 `DOC-1` (фактически после 083 `QG-SYNTH`, т. к. 083 проверяет указатель в `AGENTS.md`); `OPS-SYNC` 084 — после архива 083.
- Совместимость с Codex/Claude Code сохраняется (утверждено): `AGENTS.md`, `agents/router.md` и `agents/*.md` остаются каноническими, persona-блоки — обычный markdown внутри них.
