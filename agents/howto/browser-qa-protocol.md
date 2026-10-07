# Browser QA Protocol

## Назначение

`QG-FE` состоит из двух execution units, которые выполняет Quality Gate агент без участия человека:

1. `QG-FE-AUTO` — unit-тесты, lint, typecheck, build и существующие E2E.
2. `QG-FE-MANUAL` — автономное исследование UI в реальном браузере, scripted Playwright evidence и визуальная оценка скриншотов.

Отсутствие браузера, credentials, storage state или evidence не превращает lane в pass. Это infrastructure failure: агент пытается восстановить окружение по circuit breaker, затем возвращает `BLOCKED`/finding для `QG-SYNTH`.

## Предусловия

- Router один раз до пайплайна сообщает, что требуется режим **Full Access**. Субагенты наследуют его и не могут запрашивать approval внутри unit.
- npm/uv/Playwright caches остаются workspace-local как fallback.
- Runtime подготовлен lane `QG-ENV`; Docker-стек предпочтительнее dev servers.
- Auth state, cookies, сценарии, screenshots, traces и отчёты хранятся в игнорируемой `.qa/`. `/tmp` не используется для данных между tool calls: в `workspace-write` он не является cross-tool persistent.

## DAG

```text
QG-ENV
  ↓
QG-FE-AUTO ────────────┐
  ↓                    │
QG-FE-MANUAL           │
  └──────────────→ QG-SYNTH
```

`QG-FE-MANUAL` применим при UI/UX behavior diff: новые или изменённые страницы, компоненты, layout, формы, модалы, навигация, permissions, loading/empty/error states, responsive behavior. Для backend-only, type-only или подтверждённого non-behavior diff lane помечается `неприменимо` с причиной.

Наличие E2E не отменяет browser QA для визуально или UX-критичного diff: E2E становится частью evidence и может сократить exploratory scope.

## `QG-FE-AUTO`

В затронутом frontend-сервисе запусти применимые команды:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Затем из корня запусти существующий Playwright suite для изменённых routes. Не вызывай `npx`, который скачивает отсутствующий пакет: зависимости должны быть установлены заранее в workspace.

Handoff фиксирует каждую команду, test count, существующее E2E coverage, findings и перечень routes/states для `QG-FE-MANUAL`.

## `QG-FE-MANUAL`: автономная процедура

### 1. Подтвердить окружение

Загрузи skill `stack-control`:

```bash
scripts/stackctl status --json
```

Проверь health затронутых backend/frontend контейнеров и реальные published ports. Не предполагай `:3000`, если compose публикует другой порт. Не запускай `npm run dev` или несуществующий `make dev`, когда Docker-стек доступен.

Если сервис отсутствует или unhealthy, применяй circuit breaker ниже.

### 2. Загрузить `ui-qa` и подготовить auth

Загрузи skill `ui-qa`. Для Protected Admin UI создай/проверь storage state в `.qa/` штатной QA-командой. Credentials не печатай в отчёт.

Anonymous и authenticated сценарии проверяются раздельно, если изменялись route guard, permissions или Protected Write UX.

### 3. Сформировать сценарии

Создай `.qa/<change>/scenarios.json` на основе:

- релевантных OpenSpec `design.md` и `tasks.md`;
- изменённых routes/components;
- обязательных states: happy path, loading, empty, error, validation, disabled/permission;
- access matrix для anonymous/authenticated flows;
- design specification для site consumer.

Каждый сценарий содержит точные шаги, ожидаемый результат и проверяемые viewport/state. Общая фраза «проверить, что UI работает» запрещена.

### 4. Scripted Playwright evidence

Запусти сценарии через `ui-qa` на desktop, tablet и mobile. Обязательное evidence:

- machine-readable `report.json`;
- screenshots для релевантных состояний и viewport;
- browser console errors;
- failed network requests и ответы `5xx`;
- axe findings уровня critical/serious;
- trace для упавшего сценария.

Долгий запуск делай через bash `run_in_background` **без** завершающего `&`; после timeout собирай результат через `job_output`. Не запускай долгоживущие процессы конструкцией `command &`.

### 5. Визуальная инспекция агентом

Прочитай каждый обязательный screenshot через `read_image` и сравни с design/spec evidence. Проверь:

- clipping, overlap, horizontal overflow и unreadable text;
- responsive layout и touch targets;
- видимость focus и keyboard flow;
- корректность loading/empty/error/disabled states;
- соответствие дизайн-системе и отсутствие очевидной визуальной регрессии.

Сам факт создания screenshot не является визуальной проверкой.

### 6. Exploratory debugging через Playwright MCP

Используй `mcp__pw__browser_*` для:

- accessibility snapshot и поиска стабильных locator refs;
- воспроизведения неясного сценария;
- console/network inspection;
- проверки keyboard/focus;
- уточнения селекторов перед повторным scripted run.

MCP не заменяет воспроизводимый scripted report. После exploratory исправления/уточнения сценарий повторно запускается scripted runner.

## Self-healing circuit breaker

Для infrastructure fault:

1. `scripts/stackctl doctor <service>` и `scripts/stackctl logs <service> --since 10m`.
2. Не более двух суммарных repair/restart/rebuild попыток через `stack-control`.
3. После каждой попытки — status/health и повтор только затронутого сценария.

Не считать infrastructure fault:

- startup traceback, вызванный изменённым кодом;
- failing test/regression;
- контрактный `4xx/5xx` из проверяемой функциональности;
- воспроизводимый UI crash.

Это code findings, которые Router возвращает владельцу как ограниченный fix execution unit. Агент не ремонтирует их бесконечными restart/rebuild.

Человек привлекается только при внешнем блокере, который нельзя provision автономно: отсутствующий внешний secret, необходимость `sudo` для системного пакета или third-party outage. Lane при этом `BLOCKED`, а общий gate не может быть `APPROVED`.

## Container и process rules

- Не использовать `docker exec -it`; у tool call нет TTY. Использовать `scripts/stackctl exec` или `docker exec` без `-it`.
- Runtime поднимать через Docker `up -d`.
- Если Docker неприменим, долгоживущий процесс запускать bash tool с `run_in_background: true` и без trailing `&`.
- Сначала проверять существующий stack; не создавать второй compose project поверх уже работающих контейнеров.

## PASS / FAIL

`QG-FE-MANUAL: PASS` возможен только если:

- все обязательные scripted scenarios пройдены;
- console errors и неожиданные `5xx` отсутствуют;
- нет critical/serious axe findings либо каждое исключение утверждено спецификацией;
- обязательные screenshots просмотрены агентом через `read_image`;
- report, screenshots и traces сохранены в `.qa/` и перечислены в handoff.

`FAIL/REWORK` — функциональная, визуальная, accessibility или access regression. `BLOCKED` — только доказанный infrastructure/external blocker после circuit breaker.

## Handoff

```text
Unit: QG-FE-MANUAL | Профиль: Quality Gate | Статус: done / rework / blocked
Environment: stackctl status → <результат>; repair attempts: <0..2>
Scenarios: <passed>/<total>; viewports: desktop/tablet/mobile
Evidence: <report.json, screenshots, traces>
Console/network/axe: <результат>
Visual inspection: <просмотренные screenshots и вывод>
MCP exploration: <что проверялось | не требовалось>
Findings: <список или нет>
Остаток: <только реальный blocker>
```

## Запрещённые legacy-паттерны

- Делегировать browser QA пользователю или ждать его checklist.
- Выдавать `APPROVED_WITH_MANUAL_QA`.
- Пропускать lane из-за утверждения «субагент не может открыть браузер».
- Считать lane пройденным без report и визуального evidence.
- Запускать dev server, не проверив доступный Docker stack.
