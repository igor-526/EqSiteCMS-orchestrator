# Design — dsh-agent-roles-084

- **Тикет:** `docs/tasks/084_dsh_agent_roles_migration.md`
- **Дата:** 2026-10-07
- **Зона:** процесс/инструменты монорепо — `dsh/home/profiles/web/**`, `dsh-integration/**`, `AGENTS.md`, `agents/router.md` (новый), `agents/**`, `.agents/skills/**`, `dsh/README.md`, ссылки в `WORKFLOW.md`/`agents/howto/**`. Runtime-код сервисов не меняется.
- **Ревизия:** PLAN-084b — внесены решения пользователя (default после smoke, наследование модели, вынос Router-правил в `agents/router.md` в рамках 084, совместимость с Codex/Claude Code, удаление черновиков без архива, исполнитель DSH-units — Backend).
- **Access matrix:** неприменимо — endpoint'ов нет.

## Context

**Текущее состояние (проверено по живой конфигурации и коду пакетов `dsh/node_modules/@deepseek-ai/*`, DSH `0.2.0-rc.2`, Node `v24.18.0`):**

- Профиль `dsh/home/profiles/web` собирается из bundles `package.json` (`dsh-base`, `dsh-web-app`, `dsh-codex-connect`, `@eqsite/playwright-mcp`) и одного пользовательского слоя `cordis.patch.yml` (модель, ключ по имени env, `workspace-controller.documentsDirectory`). Сессии используют shipped preset `standard` из `dsh-web-app/presets/standard.patch.yml`.
- Файлы `cordis.patch.{eqsite-complete,fixes,mvp-additions,browser-automation}.yml` и `cordis.patch.yml.backup` не читаются DSH; их presets используют несуществующие поля (`dsh-persona.sections`, `dsh-tool-subagent.allowedPresets`). `dsh-integration/plugins/{openspec-tool,context-builder,openspec-commands}`, `ui/workflow-dashboard`, `presets/router-preset`, `examples/`, 20+ `*.md` — не установлены и описывают выдуманный API. Реально используется только `dsh-integration/plugins/playwright-mcp` (ссылка `link:/home/igor/...` в `package.json`, абсолютный `cwd`).
- Роли передаются субагентам текстом prompt'а; `dsh-agent-instructions` (`maxBytes: 65536`) уже инжектит `AGENTS.md` (30 664 байт, «Твоя роль: Router») и `CLAUDE.md` в **каждую** сессию, включая детей. По секциям `AGENTS.md` ≈ 12,1 КБ — общее для всех агентов (ownership, бюджет unit, handoff, circuit breaker, howto, API Access Policy, контекст проекта), ≈ 18,6 КБ — Router-специфичное (Router-first шаги, анти-зависание, экономия контекста Router, QG-оркестрация, карта агентов, маршрутизация, протокол передачи контекста, примеры, чеклист). Исполнители сейчас получают ~18,6 КБ чужих правил в каждом запросе.
- Change 083 (реализуется первым) в своём `DOC-1` добавляет в `AGENTS.md` шаг-указатель на skill `task-finalize` и пункт Чеклиста Router, правит `agents/quality_gate.md`; его requirement «Операционные шаги финализации выполняет Router по skill task-finalize» требует, чтобы указатель был в `AGENTS.md`.
- Размеры ролевых файлов: `backend.md` 57 КБ, `frontend.md` 50 КБ, `quality_gate.md` 34 КБ, `planner.md` 34 КБ, `site_consumer.md` 11 КБ. У Backend/Frontend есть `## 0. Протокол чтения` (ядро + секции по требованию).
- Skills: DSH сканирует `<projectRoot>/.agents/skills` (`stack-control`, `ui-qa`, `api-smoke-test`); OpenSpec-skills лежат в `.claude/skills` и в каталоге DSH-сессии сейчас **не видны**.

**Факты механизмов DSH, на которые опирается дизайн:**

| Факт | Источник |
|---|---|
| `dsh-tool-subagent`: поля `provider`, `toolName`, `persona: string`, `toolFilter: {allow?, deny?}`, `maxDepth`, `backgroundMode`, `agentOptions`, `modelSelectionSettings`; неизвестное имя в `toolFilter` валит старт ребёнка | `dsh-tool-subagent/lib/types/index.d.ts`, README |
| provider `spawn` объявляет capabilities `agentOptions`, `outputSchema`, `depthLimit`, `toolFilter`, `persona`, поддерживает `prepareContinuable` | `dsh-subagent-spawn-in-process/lib/index.js` |
| Глубина: `childDepth = depth(caller) + 1`, отказ при `childDepth > maxDepth`; Host default `subagent.maxDepth = 1` | `dsh-subagent/lib/index.js` (`resolveChildDepth`) |
| spawn-ребёнок получает свежую сессию без истории родителя, но в той же композиции preset: в этой сессии-ребёнке `Tool.listTools` показывает `subagent`, `workflow` и т. д. standard preset | живой `cordis_inspect_query Tool.listTools` |
| `workflow-ptc` передаёт в provider только `outputSchema`; `agent()` не имеет persona/toolFilter, опции — `schema`, `label`, `phase`, `provider`, `model` | `dsh-workflow-ptc/lib/index.js`, схема инструмента `workflow` |
| Внутри workflow-скрипта нет FS/сети/Node API и нельзя спросить пользователя | README `dsh-tool-workflow`, `dsh-workflow-ptc` |
| `dsh-persona` монтируется только внутри preset (`prefix`, `suffix`, `complete`, `includeRuntimeContext`) | README `dsh-persona` |
| `!!js` вычисляется Loader'ом как `with (ctx) eval(expr)` при активации строки; доступны `process`, `ctx.dshHomePath`; в Node 24 доступен `process.getBuiltinModule('node:fs')` | `cordis-plugin-loader/lib/index.js`, skill `cordis-composition-reference` |
| `dsh-skill-filesystem.customSkillDirs` добавляет корни skills (rank 300) | README `dsh-skill-filesystem` |
| Новый preset — bundle (`package.json` с `dsh.bundle.patch` + `cordis.patch.yml`), установка `plugin_manager install_bundle`, проверка `list_bundles`/`list_plugins`; существующие сессии держат старую ревизию | skill `editing-cordis-compositions` |

## Goals / Non-Goals

**Goals:**

- Router — настоящий preset `eqsite-router`, профильные роли — ролевые инструменты с persona, ограничением инструментов и глубины.
- Один источник текста ролей для DSH, Codex и Claude Code без копирования правил в YAML.
- `AGENTS.md` — короткое общее ядро для всех агентов; Router-правила — в `agents/router.md`, который читает только Router.
- Quality Gate lanes исполнимы одним `workflow`-запуском со структурированным handoff и fallback на ролевой инструмент.
- Переносимая конфигурация без абсолютных путей и секретов; удаление неработающих черновиков.
- Готовность подтверждается живой конфигурацией и smoke, а не документами.

**Non-Goals:**

- Изменение поведения `scripts/shipctl` и skill `task-finalize` (change 083).
- Изменение смысла правил: секции переносятся между `AGENTS.md` и `agents/router.md` без переформулирования норм; в ролевые файлы добавляются только persona-маркеры.
- Собственные Cordis-плагины (UI dashboard, openspec tool и т. п.) — механизмов preset/subagent/workflow/skills достаточно.
- Изменение runtime-сервисов, Docker-стека, API, NATS.
- Модели/effort по ролям: утверждено наследование маршрута Router, `agentOptions` не задаются.

## Decisions

### D1. Размещение композиции: отдельный bundle внутри профиля

Bundle `@eqsite/dsh-agents` в `dsh/home/profiles/web/bundles/eqsite-agents/` (`package.json` с `"dsh": {"bundle": {"patch": "./cordis.patch.yml"}}` + `cordis.patch.yml` с `insert` строки `preset-eqsite-router`). Профиль подключает его зависимостью `link:./bundles/eqsite-agents` и строкой в `dsh.profile.bundles`. Установка — `plugin_manager install_bundle` (live-применение), затем ссылка нормализуется в относительную и подтверждается `DSH_HOME=./home dsh plugin --profile web install`.

*Альтернативы:* (a) `insert` прямо в `cordis.patch.yml` профиля — меньше файлов, но смешивает пользовательские overrides (модель, ключи) с композицией ролей и не даёт проверки `list_bundles`; (b) bundle в `dsh-integration/` — сохраняет каталог, который change как раз очищает от черновиков, и требует межкаталожной ссылки. Выбран (D1): версионируется вместе с профилем, отделён от пользовательского слоя, соответствует процедуре skill `editing-cordis-compositions`.

### D2. Состав preset `eqsite-router`

Список плагинов — копия shipped `standard` (`persona`, `agent-instructions`, `tool-bash`/`tool-pwsh`, `tool-fs`, `tool-fs-search`, `tool-jobs`, `skill-filesystem`, `tool-skill`, `command-goal`, `tool-goal`, группа `planning`, группа `compaction`, `tool-ask-user`, `tool-todo`, `tool-web`, `present`) с изменениями:

- `persona` — `!!js`-загрузка `agents/router.md` целиком (D5), `suffix: Your working directory is {{cwd}}.` сохраняется;
- `skill-filesystem.customSkillDirs: !!js` → `[<repo>/.claude/skills]` (D8);
- группа `delegation` (с `isolate: {workflowEngine: true}`): `tool-subagent-control`, `tool-subagent-control/list-agents`, пять ролевых инструментов (D3), `workflow-ptc` (`provider: spawn`), `tool-workflow`; **без** `tool-subagent` (`subagent`), `tool-subagent-fork`, codex/claude-code и `tool-ralph`.

Так как spawn-дети собираются в композиции preset родителя, этот же список — базовая композиция исполнителей; поэтому `tool-fs` (write/edit) и `tool-web` остаются. «Router не пишет код» обеспечивается persona (`agents/router.md`): preset не является sandbox, а `toolFilter` действует только на детей.

*Альтернатива:* минимальный preset без write/edit — ломает исполнителей, которым нужны те же инструменты.

### D3. Ролевые делегирующие инструменты

| Строка / `toolName` | persona-источник | `toolFilter.deny` | `maxDepth` | `backgroundMode` |
|---|---|---|---|---|
| `delegate-planner` / `delegate_planner` | `agents/planner.md` | общий список | `1` | `continuable` |
| `delegate-backend` / `delegate_backend` | `agents/backend.md` | общий список | `1` | `continuable` |
| `delegate-frontend` / `delegate_frontend` | `agents/frontend.md` | общий список | `1` | `continuable` |
| `delegate-site-consumer` / `delegate_site_consumer` | `agents/site_consumer.md` | общий список | `1` | `continuable` |
| `delegate-quality-gate` / `delegate_quality_gate` | `agents/quality_gate.md` | общий список | `1` | `continuable` |

Общий `deny`: `delegate_planner`, `delegate_backend`, `delegate_frontend`, `delegate_site_consumer`, `delegate_quality_gate`, `workflow`, `ask_user_question`. Все остальные поля: `provider: spawn`, `modelSelectionSettings: false`, `enableRunInBackground: true`, **без** `agentOptions`: модель, provider и reasoning effort ролей наследуются от сессии Router (решение пользователя; spawn наследует маршрут родителя по README).

- `continuable` нужен для анти-зависания: Router продолжает того же ребёнка через `send_message`, а не создаёт нового.
- В `deny` только имена, гарантированно присутствующие в композиции `eqsite-router`. Имена MCP (`mcp__pw__*`) и host-инструменты (`plugin_manager`, `cordis_inspect_*`) в `deny` **не** включаются: при сбое старта Playwright MCP (`failOnStartupError: false`) имена исчезнут, и неизвестное имя в фильтре сломает старт всех детей.
- `allow`-список не используется по той же причине (хрупкость при изменении композиции).

*Альтернативы:* один инструмент с параметром роли — невозможно (у `dsh-tool-subagent` persona фиксирована на экземпляр); presets на роль (как в черновике) — невозможно выбрать preset при вызове subagent.

### D4. `maxDepth: 1`, а не `0`

По `resolveChildDepth` значение `0` отклоняет уже вызов Router (глубина ребёнка 1 > 0). `1` разрешает Router → исполнитель и запрещает исполнитель → внук. Это второй рубеж: первый — `toolFilter.deny`. Рубеж реально нужен детям `workflow` (у них нет `toolFilter`, и они видят `delegate_*`): их попытка делегировать отклоняется по глубине; вложенный `workflow` у ребёнка тоже упирается в Host `subagent.maxDepth = 1`.

### D5. Единый источник persona: размеченный блок в `agents/<role>.md`, Router — весь `agents/router.md`

**Профильные роли.** В каждом `agents/<role>.md` вокруг уже существующих «Цель/Роль» и протокола чтения ставятся маркеры:

```markdown
<!-- dsh-persona:begin -->
… цель, роль, протокол чтения (что читать всегда / по требованию), ссылка на формат handoff …
<!-- dsh-persona:end -->
```

Persona ребёнка = фиксированная строка-идентичность + содержимое блока, вычисляемое при активации preset (форма выражения финализуется в `DSH-2`):

```yaml
persona: !!js |
  (() => {
    const fs = process.getBuiltinModule('node:fs');
    const path = process.getBuiltinModule('node:path');
    const file = path.resolve(dshHomePath(), '..', '..', 'agents', 'backend.md');
    const m = fs.readFileSync(file, 'utf8')
      .match(/<!-- dsh-persona:begin -->([\s\S]*?)<!-- dsh-persona:end -->/);
    if (!m) throw new Error('dsh-persona markers missing in ' + file);
    return 'Ты — агент Backend проекта EqSiteCMS; роль назначена Router через delegate_backend. '
      + 'agents/router.md не читай.\n\n' + m[1].trim();
  })()
```

- Бюджет блока ≤ 4096 байт (`CFG-01`). Persona входит в каждый запрос ребёнка, но стабильна → попадает в KV-cache prefix; полный файл (11–57 КБ) агент дочитывает по протоколу чтения только нужными секциями.
- Корень репозитория — `dshHomePath()/../..` (проектная установка `dsh/home`); отсутствие файла/маркеров — исключение при активации (строка остаётся в roster с диагностикой), а не пустая persona.
- Изменение блока применяется после перезагрузки preset (переустановка bundle или рестарт DSH); существующие сессии держат старую ревизию.
- Для Planner, Quality Gate и Site Consumer, где протокола чтения нет, блок оформляет существующие вводные строки и краткий список «ядро/по требованию» из текущих заголовков; содержание правил не меняется.

| Вариант (роли) | Плюсы | Минусы | Решение |
|---|---|---|---|
| A. `!!js` читает весь `agents/<role>.md` | ноль разметки | 11–57 КБ в каждом запросе ребёнка, дублирует то, что агент и так читает по протоколу | отклонено |
| **B. `!!js` читает размеченный блок** | один источник, малый размер, Codex/Claude читают тот же текст | маркеры можно сломать → ловится fail-loud и `CFG-01` | **выбрано** |
| C. Генерация persona/md скриптом | явная сборка | ещё один генератор и артефакт, риск рассинхронизации | отклонено |
| D. Роли как skills | загрузка по требованию | роль не гарантирована, `SKILL.md` > 8192 символов режется pruner'ом, дубли текста | отклонено |

**Router.** Persona `eqsite-router` = строка-идентичность + **весь** `agents/router.md` через тот же `!!js` (без маркеров; отсутствие файла — ошибка активации). Целевой размер `agents/router.md` ≤ 24 576 байт (`CFG-09`; сейчас Router-секции ≈ 18,6 КБ + указатель 083).

| Вариант (Router) | Плюсы | Минусы | Решение |
|---|---|---|---|
| **R1. `!!js` persona = `agents/router.md`** | правила гарантированно в system prompt с первого запроса; стабильный prefix → KV-cache (после первого запроса оплачивается в основном как cache-hit); не вытесняется compaction и `tool-result-pruner` | ≈ 6–7 тыс. токенов в каждом запросе Router (как и сейчас: Router-секции и так приходят в составе `AGENTS.md`) | **выбрано** |
| R2. Router читает `agents/router.md` по инструкции | меньше prompt до чтения | зависит от дисциплины модели; результат `read` > 8192 символов режется `tool-result-pruner` (`thresholdChars: 8192`) в последующих запросах и выпадает при compaction → Router теряет правила посреди сессии; повторные чтения дороже cache-hit | отклонено для DSH; остаётся механизмом для Codex/Claude Code |

Итог по контексту: Router получает `AGENTS.md`-ядро (≤ 12 КБ, через `dsh-agent-instructions`) + `agents/router.md` (≤ 24 КБ, persona) — примерно как сейчас (30,6 КБ); каждый исполнитель — ядро ≤ 12 КБ + persona ≤ 4 КБ вместо 30,6 КБ, т. е. экономия ≈ 15–18 КБ на каждом запросе каждого ребёнка.

### D6. Разделение `AGENTS.md` → общее ядро + `agents/router.md`

`AGENTS.md` становится общим ядром для всех агентов; Router-специфичное переносится в новый `agents/router.md` **без изменения формулировок норм** (только заголовки/ссылки). Распределение секций текущего `AGENTS.md`:

| Секция | Куда |
|---|---|
| Заголовок, «Контекст проекта» (SERVICES.md, README.md, services.manifest) | `AGENTS.md` |
| **Новая** «Определение роли» (первой секцией) | `AGENTS.md` |
| «Ownership и декомпозиция» — общие правила (один владелец файла, исполнитель меняет только назначенные пути, отмечает только выполненные tasks) | `AGENTS.md` |
| «Ownership и декомпозиция» — «Router не пишет код…, вся профильная работа делегируется» | `agents/router.md` |
| «Декомпозиция: Deliverable → Execution Unit» — иерархия и «Бюджет execution unit» | `AGENTS.md` |
| «Декомпозиция…» — типовое разбиение BE-1…SMOKE-1 и правило «Router делегирует execution unit» | `agents/router.md` |
| «Checkpoint и handoff между execution units» (формат handoff) | `AGENTS.md` |
| «Circuit breaker исполнителя» (абзац «Router обязан принять split» — в `agents/router.md`) | `AGENTS.md` |
| «API Access Policy» целиком | `AGENTS.md` |
| «Howto инструкции» (список howto/skills) | `AGENTS.md` (пометка «context-economy-patterns читает Router» → `agents/router.md`) |
| «Твоя роль: Router», «Router-first и OpenSpec workflow» (шаги 1–8 + указатель `task-finalize` из 083) | `agents/router.md` |
| «Экономия контекста» (обязанности Router) | `agents/router.md` |
| «Анти-зависание делегирования» и список «Запрещено» Router | `agents/router.md` |
| «Quality Gate: один вердикт, несколько lanes» (оркестрация, DAG, применимость) | `agents/router.md` (lane-чеклисты уже в `agents/quality_gate.md`) |
| «Карта агентов», «Правила маршрутизации», «Примеры маршрутизации» | `agents/router.md` |
| «Протокол передачи контекста» | `agents/router.md` |
| «Чеклист Router перед любым ответом» (включая пункт 083 про финализацию) | `agents/router.md` |

**«Определение роли»** (≈ 600 байт, заменяет ранее планировавшийся «Приоритет роли»): «Если тебе назначена профильная роль (persona DSH, задание Router, prompt lane Quality Gate) — работай по `agents/<role>.md`, `agents/router.md` не читай. Если роль не назначена и ты верхнеуровневый агент — ты Router: прочитай `agents/router.md` целиком до любого ответа (в DSH-сессии `eqsite-router` он уже в system prompt — не перечитывай)». `CLAUDE.md` не меняется (указатель на `AGENTS.md`).

Так как дети больше не получают «Твоя роль: Router», отдельное правило приоритета не нужно: ядро не содержит Router-инструкций, а «Определение роли» однозначно для обеих сред.

**Целевые размеры и проверки:** `AGENTS.md` ≤ 12 288 байт (`CFG-08`, `wc -c`), в нём нет Router-секций (`rg` по заголовкам «Твоя роль: Router», «Router-first», «Анти-зависание», «Карта агентов», «Правила маршрутизации», «Протокол передачи контекста», «Чеклист Router», «Примеры маршрутизации» → пусто); каждая секция старого `AGENTS.md` присутствует ровно в одном из двух файлов (`CFG-09`, сверка списка заголовков с `git show HEAD:AGENTS.md`/копией до правки). Ссылки на перенесённые секции в `WORKFLOW.md`, `agents/howto/README.md`, `agents/howto/context-economy-patterns.md` обновляются (`CFG-10`). Ссылки ролевых файлов на «бюджет/handoff в `AGENTS.md`» остаются верными.

*Альтернативы:* (a) оставить `AGENTS.md` целиком + «Приоритет роли» — дети продолжают платить ~18,6 КБ за чужие правила и получают противоречивое «Твоя роль: Router»; (b) отдельный change на вынос — третий конкурирующий набор правок `AGENTS.md` поверх 083 и 084, а persona Router и «Определение роли» tightly-coupled с выносом; (c) Router-правила только в DSH-persona — ломает Codex/Claude Code (утверждено сохранить совместимость).

### D7. Quality Gate lanes через `workflow` (skill `qg-lanes`)

`.agents/skills/qg-lanes/`:

- `SKILL.md` (< 8192 символов, frontmatter `name/description/whenToUse`) — процедура Router: собрать `args` (change, номер отчёта, применимость lanes с обоснованиями, `contextFiles` на lane, путь отчёта), прочитать `lanes.workflow.js` read-инструментом и передать его тело в `workflow.script`; после результата — решить о findings/повторе (повтор — тот же скрипт с `args.only`).
- `lanes.workflow.js` — тело скрипта: `phase()` по уровням DAG, `parallel()` внутри уровня, зависимый lane получает `blocked`, если предшественник `failed`/`blocked`; неприменимые lanes не запускаются; `QG-SYNTH` получает все handoff'ы и пишет один отчёт в `docs/reports/`. `args.dryRun` (`{fail?: [lane]}`) заменяет prompt lane на заглушку, возвращающую валидный handoff, — для проверки DAG без реального QG.
- `handoff.schema.json` — схема lane (только `type/properties/required/additionalProperties/items/enum/const/oneOf`): `lane` (enum lanes), `status` (`passed|failed|blocked|not_applicable`), `findings[]` (`severity`, `owner_profile`, `path`, `summary`, `suggested_unit`), `commands[]` (`cmd`, `result`), `evidence[]`, `notes`; схема `QG-SYNTH` добавляет `verdict` (`APPROVED|REWORK|BLOCKED`) и `report_path`. Скрипт встраивает схемы из `args.schemas` (Router читает JSON-файл и передаёт его в `args`, так как в VM нет FS).

**Компромисс persona:** `agent()` не применяет persona/`toolFilter`, поэтому prompt каждого lane начинается с преамбулы «Тебе назначена роль Quality Gate EqSiteCMS, lane `<ID>` (см. «Определение роли» в `AGENTS.md`); прочитай `agents/quality_gate.md` → секцию `<lane>` и указанные `contextFiles`; Full Access; не задавай вопросов, не делегируй; верни JSON по схеме». Дети workflow получают ядро `AGENTS.md` без Router-правил; `delegate_*` они видят, но `maxDepth` отклоняет вызовы (D4). Approval gates и повтор lanes остаются у Router.

| Способ | Плюсы | Минусы |
|---|---|---|
| **`workflow` + `qg-lanes` (основной)** | DAG в коде, параллелизм, schema-валидированный handoff, один tool-result в контексте Router | роль — prompt'ом, нет `toolFilter`; без промежуточного диалога; `null` при невалидном ответе |
| `delegate_quality_gate` по lane (fallback) | настоящая persona и `toolFilter`, `send_message` для follow-up | DAG ведёт Router вручную, handoff — свободный текст, больше токенов в контексте Router |

Fallback используется, если `workflow` недоступен, lane вернул `null` дважды или lane требует интерактивного follow-up (`QG-FE-MANUAL` при инфраструктурном сбое).

### D8. Skills для Router

`customSkillDirs: !!js [path.resolve(dshHomePath(), '..', '..', '.claude', 'skills')]` в строке `skill-filesystem` preset добавляет `openspec-*`; `.agents/skills` (включая `task-finalize` из 083 и новый `qg-lanes`) подключается штатно. Дубликаты имён разрешаются rank'ом (`.agents/skills` раньше `custom`). 084 не меняет `task-finalize`/`shipctl` — указатель на skill только переезжает в `agents/router.md`.

### D9. Default preset — после smoke (утверждено)

Строка-override `agent-preset-registry` (`config: {default: eqsite-router}`) добавляется в `cordis.patch.yml` в `DSH-3`, только после успешного `SMOKE-1`. До этого `eqsite-router` выбирается вручную, `standard` остаётся выбираемым fallback для работ по самому DSH. Пользовательский `selectedDefault` по-прежнему имеет приоритет.

*Альтернативы:* сразу default — риск сломать все новые сессии при ошибке активации; навсегда выбираемый — Router-first не гарантирован для новых сессий.

### D10. Уборка и переносимость

- Удаляются **без архива** (решение пользователя): `dsh/home/profiles/web/cordis.patch.{eqsite-complete,fixes,mvp-additions,browser-automation}.yml`, `cordis.patch.yml.backup`; весь `dsh-integration/**`, кроме `dsh-integration/plugins/playwright-mcp/{package.json,cordis.patch.yml}` (и его `node_modules`).
- `@eqsite/playwright-mcp`: ссылка в `package.json` профиля → `link:../../../../dsh-integration/plugins/playwright-mcp`; `cwd` в его patch → `!!js` от `dshHomePath()`.
- `workspace-controller.documentsDirectory` в `cordis.patch.yml` → `!!js` от `dshHomePath()`.
- `dsh/README.md` получает короткий раздел «Агентные роли EqSiteCMS» (как установить bundle, проверить, переключить default, что требует рестарта, как применить правку persona/`agents/router.md`).
- Секреты: ключи только именами env (`apiKeyEnv`); `.credentials.yaml`, `.env`, `credentials.json` под `dsh/home` уже в `.gitignore`.

### D11. Связь с change 083 и порядок (жёсткая последовательность по `AGENTS.md`)

- 083 реализуется первым. `DOC-0` и `DOC-1` 084 стартуют **только после завершения 083 `DOC-1`** (оба правят `AGENTS.md`, `agents/quality_gate.md`). Так как 083 `QG-CONTRACTS.3` проверяет шаг-указатель `task-finalize` именно в `AGENTS.md`, Router запускает `DOC-0` после 083 `QG-SYNTH = APPROVED` (иначе 083 получит ложный finding).
- `DOC-0` переносит указатель 083 и пункт Чеклиста Router о финализации в `agents/router.md` дословно.
- Delta `openspec-workflow` 084 MODIFIED-ит, помимо четырёх требований, ADDED-требование 083 «Операционные шаги финализации выполняет Router по skill task-finalize» (меняется только место указателя: `agents/router.md` вместо `AGENTS.md`). `OPS-SYNC` 084 выполняется только после архива 083, когда это требование уже в main spec; перед sync Router сверяет заголовок и текст с актуальной main spec.
- 084 не трогает «Синхронизация и архивирование» (MODIFIED в 083).

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `DOC-0` | Planner | A — корневые правила | `AGENTS.md`, `agents/router.md` (новый), ссылки в `WORKFLOW.md`, `agents/howto/README.md`, `agents/howto/context-economy-patterns.md` | 083 `DOC-1` (жёстко), фактически 083 `QG-SYNTH` | `CFG-08`, `CFG-09`, `CFG-10` |
| `DOC-1` | Planner | A | `agents/{planner,backend,frontend,site_consumer,quality_gate}.md` (только persona-маркеры/блок) | 083 `DOC-1` (жёстко) | `CFG-01` |
| `DSH-1` | Backend | B — композиция DSH | `dsh/home/profiles/web/bundles/eqsite-agents/**`, `dsh/home/profiles/web/package.json`, `pnpm-lock.yaml` | `DOC-0` (persona Router читает `agents/router.md`) | `CFG-03`, `LV-01` |
| `DSH-2` | Backend | B | `dsh/home/profiles/web/bundles/eqsite-agents/cordis.patch.yml` | `DSH-1`, `DOC-1` | `CFG-04`, `LV-02` |
| `QGW-1` | Backend | C — QG workflow skill | `.agents/skills/qg-lanes/**` | — | `CFG-05` |
| `CLEAN-1` | Backend | D — уборка и переносимость | удаляемые `dsh/home/profiles/web/cordis.patch.*.yml` (кроме `cordis.patch.yml`), `cordis.patch.yml.backup`, `dsh/home/profiles/web/cordis.patch.yml` (`documentsDirectory`), `dsh/home/profiles/web/package.json` (ссылка playwright-mcp), `dsh-integration/**`, `dsh/README.md` | `DSH-1` (общий `package.json`) | `CFG-06`, `CFG-07`, `LV-01` |
| `SMOKE-1` | Backend | E — live verification | — (evidence в `.qa/dsh-084/`) | `DSH-2`, `QGW-1`, `CLEAN-1` | `LV-03..LV-10` |
| `DSH-3` | Backend | B | `dsh/home/profiles/web/cordis.patch.yml` (`agent-preset-registry`), `dsh/README.md` (раздел default) | `SMOKE-1` | `LV-11` |
| `QG-CONTRACTS` | Quality Gate | — | — | `DSH-3` | ревью diff vs specs/tasks, `CFG-01..10`, evidence `SMOKE-1`, strict validation |
| `QG-SYNTH` | Quality Gate | — | `docs/reports/084-dsh-agent-roles-review.md` | `QG-CONTRACTS` | один отчёт, вердикт |
| `OPS-SYNC` | Router/OpenSpec | — | `openspec/specs/**` | `QG-SYNTH = APPROVED`, архив 083 | `openspec validate --specs --strict` |
| `OPS-ARCHIVE` | Router/OpenSpec | — | `openspec/changes/archive/**` | `OPS-SYNC` | `openspec list` |

Неприменимые lanes Quality Gate: `QG-ENV` — нет diff runtime-сервисов и Docker-стека; `QG-BE` — нет Python diff; `QG-FE-AUTO`, `QG-FE-MANUAL` — нет diff `services/frontend`/`site-*`; `QG-LIVE` — нет runtime API diff (живая проверка DSH-конфигурации выполняется в `SMOKE-1`).

**DAG:**

```text
083 DOC-1 (… 083 QG-SYNTH) ─┬→ DOC-0 ──→ DSH-1 ──┬──────────→ DSH-2 ──┐
                             └→ DOC-1 ────────────┼──────────↗         │
                                                  └→ CLEAN-1 ──────────┼→ SMOKE-1 → DSH-3 → QG-CONTRACTS → QG-SYNTH → OPS-SYNC* → OPS-ARCHIVE
QGW-1 ─────────────────────────────────────────────────────────────────┘
* OPS-SYNC — после архива 083
```

Параллельно: `QGW-1` — сразу (не зависит от 083); `DOC-0` ‖ `DOC-1` (непересекающиеся файлы); `CLEAN-1` ‖ `DSH-2` после `DSH-1`.

**Внешние шаги пользователя:** перезапуск DSH (`npm run web` в `dsh/`), если `plugin_manager` сообщает, что профиль startup и изменения не применены live; обновление страницы Web GUI. Unit с таким шагом возвращает `partial`/`blocked` с явной причиной, а не обходит проверку.

## Test matrix

Статические проверки (`CFG-*`) и live-проверки (`LV-*`). Трассировка → requirement delta spec.

| ID | Проверка | Как | Requirement | Unit |
|---|---|---|---|---|
| `CFG-01` | В каждом из 5 `agents/<role>.md` ровно одна пара маркеров, блок ≤ 4096 байт | `node -e` подсчёт маркеров и `Buffer.byteLength` блока | Persona из единого источника | `DOC-1` |
| `CFG-08` | `AGENTS.md` ≤ 12 288 байт, первой секцией «Определение роли», нет Router-секций | `wc -c AGENTS.md`; `rg -n "Твоя роль: Router|Router-first|Анти-зависание|Карта агентов|Правила маршрутизации|Протокол передачи контекста|Чеклист Router|Примеры маршрутизации" AGENTS.md` → пусто | Единый источник корневых агентных правил | `DOC-0` |
| `CFG-09` | `agents/router.md` ≤ 24 576 байт; каждая секция исходного `AGENTS.md` (снимок до правки) есть ровно в одном из двух файлов; указатель `task-finalize` и пункт Чеклиста 083 — в `agents/router.md` | сверка списков заголовков `node -e`; `rg -n "task-finalize" AGENTS.md agents/router.md` | Единый источник корневых агентных правил, Операционные шаги финализации | `DOC-0` |
| `CFG-10` | Нет ссылок на перенесённые секции как на `AGENTS.md` | `rg -n "AGENTS.md.*(Router|маршрутиз|Протокол передачи|Анти-зависание)" WORKFLOW.md agents/ docs/operations/` → пусто или обновлено | Единый источник корневых агентных правил | `DOC-0` |
| `CFG-03` | Bundle валиден, `dsh.bundle.patch` указывает на файл, профиль собирается | `DSH_HOME=./home dsh --profile web --dump-config` содержит `preset-eqsite-router` | Router preset в bundle | `DSH-1` |
| `CFG-04` | В preset нет строк `subagent`/`subagent_fork`; пять `delegate_*` с `provider: spawn`, `maxDepth: 1`, `continuable`, общим `deny`, без `agentOptions` | `--dump-config` + проверка скриптом `node -e` по YAML | Ролевые инструменты, Ограничение глубины | `DSH-2` |
| `CFG-05` | `lanes.workflow.js` парсится как тело async-функции; схемы используют только допустимые ключевые слова; `SKILL.md` < 8192 символов | `node -e "new (async function(){}).constructor(src)"`, обход JSON schema | QG lanes через workflow | `QGW-1` |
| `CFG-06` | Нет `/home/` и шаблонов секретов в версионируемой конфигурации | `rg -n "/home/|sk-[A-Za-z0-9]|api[_-]?key\s*:" <пути из spec>` → пусто (кроме `apiKeyEnv`) | Переносимость и отсутствие секретов | `CLEAN-1` |
| `CFG-07` | В профиле только `cordis.yml`, `cordis.patch.yml`, bundles; в `dsh-integration/` только `plugins/playwright-mcp` | `ls`/`find` | Отсутствие неподключённых черновиков | `CLEAN-1` |
| `LV-01` | `list_bundles` содержит `@eqsite/dsh-agents` и `@eqsite/playwright-mcp`; `list_plugins` — `preset-eqsite-router` активен | `plugin_manager` | Router preset в bundle | `DSH-1`, `CLEAN-1` |
| `LV-02` | `Config.listConfigs` для строк `delegate-*` — схема `dsh-tool-subagent`, `maxDepth = 1`; persona не пустая | `cordis_inspect_query` | Ограничение глубины, Persona | `DSH-2` |
| `LV-03` | Сессия `eqsite-router`: `Tool.listTools` содержит 5 `delegate_*`, `workflow`, `ask_user_question`, `send_message`; нет `subagent`, `subagent_fork`; Router цитирует первый заголовок `agents/router.md` без чтения файла | smoke-prompt в новой сессии | Router preset, Persona | `SMOKE-1` |
| `LV-04` | Для каждой из 5 ролей ребёнок называет роль, первую строку своего persona-блока, подтверждает отсутствие Router-правил в своём контексте; его `Tool.listTools` без `delegate_*`, `workflow`, `ask_user_question`; модель ребёнка = модель Router | `delegate_<role>` с тестовым заданием | Ролевые инструменты, Ограничение инструментов | `SMOKE-1` |
| `LV-05` | Ребёнок `workflow` (без `toolFilter`) вызывает `delegate_planner` → ошибка `exceeds maxDepth` | одноагентный workflow-probe | Ограничение глубины | `SMOKE-1` |
| `LV-06` | `send_message` продолжает continuable-ребёнка (второй ответ того же child id) | `delegate_planner` + `send_message` | Ролевые инструменты (follow-up), Анти-зависание | `SMOKE-1` |
| `LV-07` | `qg-lanes` dry-run: все уровни DAG, схемы валидны, `QG-SYNTH` вердикт `APPROVED` | `workflow` с `args.dryRun = {}` | QG lanes через workflow | `SMOKE-1` |
| `LV-08` | `qg-lanes` dry-run с `fail: ["QG-ENV"]` → зависимые lanes `blocked`, вердикт не `APPROVED`; неприменимый lane → `not_applicable` с причиной | `workflow` с `args.dryRun = {fail: ["QG-ENV"]}` | QG lanes через workflow | `SMOKE-1` |
| `LV-09` | Каталог skills сессии Router содержит `openspec-propose`, `openspec-apply-change`, `openspec-sync-specs`, `openspec-archive-change`, `stack-control`, `ui-qa`, `qg-lanes`, `task-finalize` | smoke-prompt | Доступ Router к skills | `SMOKE-1` |
| `LV-10` | Ребёнок `delegate_quality_gate` и ребёнок workflow видят `mcp__pw__browser_*` | `Tool.listTools` в детях | QG lanes (browser QA возможен) | `SMOKE-1` |
| `LV-11` | Новая сессия без явного выбора стартует с `eqsite-router`; `standard` выбирается вручную | Web GUI / `list_plugins` + новая сессия | Проверка по живой конфигурации и default preset | `DSH-3` |

**Метод smoke (`SMOKE-1`):** исполнитель открывает Web GUI `http://127.0.0.1:3080` через Playwright MCP, создаёт новую сессию с preset `eqsite-router` и отправляет фиксированный smoke-prompt из `.qa/dsh-084/smoke-prompt.md`; evidence — id сессии, скриншоты и выдержки из сохранённой сессии в `dsh/home/sessions/`. Если GUI недоступен автоматизации, unit возвращает `blocked` с просьбой к пользователю отправить тот же prompt вручную; анализ результатов по сохранённой сессии остаётся за агентом.

PostgreSQL для smoke-тестов — неприменимо (нет backend API). Manual QA UI — неприменимо (нет CMS frontend diff).

## Risks / Trade-offs

- [Композиция spawn-ребёнка отличается от preset родителя (например, Host default preset)] → `CFG-04`/`LV-04` фиксируют фактический список; если `deny`-имена отсутствуют у ребёнка, старт падает явно — `DSH-2` переводит общий `deny` на имена, видимые в детях, и фиксирует решение в handoff.
- [`!!js` с `process.getBuiltinModule` или `dshHomePath` недоступен в контексте строки] → `DSH-1` проверяет выражение на persona Router первым (`LV-01`), `DSH-2` — на одной роли (`LV-02`); fallback — bundle-локальный `persona.cjs`, загружаемый через `createRequire`, с тем же форматом маркеров (решение фиксируется в handoff).
- [Persona/`agents/router.md` устаревает до перезагрузки preset] → правило в `dsh/README.md`: после правки persona-блока или `agents/router.md` — переустановка bundle или рестарт DSH; проверять в новой сессии.
- [`agents/router.md` (~20 КБ) в каждом запросе Router] → стабильный prefix и KV-cache; бюджет ≤ 24 576 байт (`CFG-09`); суммарно не больше, чем текущий `AGENTS.md` в prompt Router.
- [Потеря нормы при переносе секций] → `CFG-09` сверяет полный список заголовков до/после; QG-CONTRACTS сравнивает тексты секций построчно.
- [Верхнеуровневый агент Codex/Claude Code не прочитает `agents/router.md`] → «Определение роли» — первая секция `AGENTS.md` с явным «прочитай до любого ответа»; `CLAUDE.md` уже обязывает читать `AGENTS.md`.
- [Дети workflow без `toolFilter` видят `delegate_*` и `ask_user_question`] → `maxDepth` (D4) блокирует делегирование; `ask_user_question` у детей с approval `never` — преамбула запрещает, нарушение = finding в `QG-SYNTH`.
- [`plugin_manager install_bundle` записывает абсолютную `link:`] → `DSH-1` нормализует ссылку и подтверждает `dsh plugin --profile web install` + `LV-01`.
- [Рестарт DSH не может выполнить агент] → внешний шаг пользователя, unit возвращает `blocked` с точной командой.
- [Конфликт с 083 в `AGENTS.md`/`quality_gate.md`/`openspec-workflow`] → жёсткая последовательность D11; `OPS-SYNC` после архива 083.
- [Удаление черновиков без архива необратимо (`dsh-integration/` не под git)] → принято пользователем; `CLEAN-1` удаляет только перечисленные пути и проверяет, что `plugins/playwright-mcp` работает (`LV-01`).
- [`.agents/skills/api-smoke-test/credentials.json` в skill-каталоге] → вне scope 084; отмечено для отдельной задачи.

## Migration Plan

1. После 083 (`DOC-1`, фактически `QG-SYNTH`): `DOC-0` ‖ `DOC-1`; `QGW-1` — в любой момент.
2. `DSH-1` → (`DSH-2` ‖ `CLEAN-1`) → `SMOKE-1` → `DSH-3`. До `DSH-3` поведение по умолчанию не меняется (`standard`), `eqsite-router` выбирается вручную.
3. **Rollback:** удалить строку `agent-preset-registry` из `cordis.patch.yml` (default снова `standard`); при необходимости `plugin_manager remove_bundle @eqsite/dsh-agents`. Разделение `AGENTS.md`/`agents/router.md` и persona-маркеры работают и без DSH-композиции (Codex/Claude Code), поэтому не откатываются; при необходимости откат — через git. Удалённые черновики не восстанавливаются (архив не делается — решение пользователя).

## Open Questions

Решения пользователя (PLAN-084b) закрыли все вопросы PLAN-084: default после smoke; наследование модели/effort; вынос Router-правил в `agents/router.md` в рамках 084; совместимость с Codex/Claude Code; удаление черновиков без архива; исполнитель DSH-units — Backend.

Оставшийся вопрос (не блокирует approval):

1. Если 083 переименует или переформулирует requirement «Операционные шаги финализации выполняет Router по skill task-finalize» до архива, MODIFIED-блок 084 нужно будет синхронизировать с финальным текстом — Router выполняет это перед `OPS-SYNC` (новая валидация change).
