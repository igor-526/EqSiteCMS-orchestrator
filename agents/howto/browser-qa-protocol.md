# Browser QA Protocol

Канонические границы и invalidation: [verification policy](verification-policy.md).
Точный CLI/schema/report/privacy: [browser helper README](../../scripts/qa/browser/README.md).

## Scoped owner self-check и независимый QG

Owner до первого QG выбирает конечные scenario IDs по diff: keyboard/focus, hidden
sizing/remount, geometry/scroll/long error, contrast normal/hover/focus/error.
`self-check` меняет selection, не assertions. QG независимо исполняет обязательный
конечный registry, дополняя только новым подтверждённым риском с bounded budget.
Для docs/tooling без product UI diff manual lane не добавляется: FIX-01/BR-01..03
synthetic Chromium suite принадлежит QG-CONTRACTS, одна команда без duplicate runs:

```bash
source scripts/qa/browser-env.sh && node --test scripts/tests/qa-browser.test.mjs
```

FIX-01: safe bad fixture ожидаемо FAIL, good PASS; это не закрытие product finding.
Для product fix сохранять reproducer-before.json и reproducer-after.json по policy:
те же scenario/input/keys/route/DOM locator, environment, expected; actual/status,
revision и timestamps трассируются. Space → Escape проверяет оба слоя, focus return
и pending/nonpending, не общий Escape. Before уже PASS/среда недоступна —
unreproduced/blocked closure; не создавать искусственный product FAIL.
После exact PASS — impacted regression и один targeted QG recheck, затем stop.

## Назначение

`QG-FE` состоит из двух execution units, которые выполняет Quality Gate агент без участия человека:

1. `QG-FE-AUTO` — unit-тесты, lint, typecheck, build и существующие E2E.
2. `QG-FE-MANUAL` — автономное исследование UI в реальном браузере, scripted Playwright evidence и визуальная оценка скриншотов.

Отсутствие браузера, credentials, storage state или evidence не превращает lane в pass. Это infrastructure failure: агент пытается восстановить окружение по circuit breaker, затем возвращает `BLOCKED`/finding для `QG-SYNTH`.

## Предусловия

- Router один раз до пайплайна сообщает, что требуется режим **Full Access**. Субагенты наследуют его и не могут запрашивать approval внутри unit.
- npm/uv/Playwright caches остаются workspace-local как fallback.
- Runtime подготовлен lane `QG-ENV`; Docker-стек предпочтительнее dev servers.
- Auth state, cookies, сценарии, скрипты, screenshots, traces и отчёты хранятся в игнорируемой `.qa/<change>/QG-FE-MANUAL/` (auth — `.qa/auth-*.json`). В `docs/reports/` browser QA ничего не пишет, кроме своего раздела в отчёте `docs/reports/<change>.md`. `/tmp` не используется для данных между tool calls: в `workspace-write` он не является cross-tool persistent.

## Viewport

CMS (`services/frontend`) ориентирована только на компьютер. Эталон — **1366×768** (минимальная поддерживаемая ширина и высота), это единственный обязательный viewport: `run-scenarios.mjs --viewports desktop`. Tablet/mobile для CMS не проверяются, axe/layout-проблемы, воспроизводимые только на них, findings не являются. Публичные сайты `site-*` проверяются по своему design-протоколу (например, `site-ksk-inlove-design.md`).

## Браузер

Перед запуском Playwright выполни `source scripts/qa/browser-env.sh`: скрипт выставляет `PLAYWRIGHT_BROWSERS_PATH` и, если Chromium не находит системные библиотеки (`libnspr4`, `libnss3`, `libasound2`), без sudo распаковывает их в `.cache/browser-libs` и добавляет в `LD_LIBRARY_PATH`. Env не сохраняется между tool calls — `source` выполняется в каждой команде. Пользователя об установке библиотек не спрашивай.

## DAG

```text
QG-ENV
  ↓
QG-FE-AUTO ────────────┐
  ↓                    │
QG-FE-MANUAL           │
  └──────────────→ QG-SYNTH
```

`QG-FE-MANUAL` применим при UI/UX behavior diff: новые или изменённые страницы, компоненты, layout, формы, модалы, навигация, permissions, loading/empty/error states. Для backend-only, type-only или подтверждённого non-behavior diff lane помечается `неприменимо` с причиной.

Наличие E2E не отменяет browser QA для визуально или UX-критичного diff: E2E становится частью evidence и может сократить exploratory scope.

## `QG-FE-AUTO`

В затронутом frontend-сервисе независимо выполни один canonical `make test`,
`make lint`, non-mutating format-check и CMS `npm run build` на актуальной revision.
Эквивалентные npm aliases не повторять; отдельный tsc — только если не входит в lint.
Docs-only — static checks, не product suite. Причины повторов/invalidation — по policy.

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

Создай `.qa/<change>/QG-FE-MANUAL/scenarios.json` на основе:

- релевантных OpenSpec `design.md` и `tasks.md`;
- изменённых routes/components;
- обязательных states: happy path, loading, empty, error, validation, disabled/permission;
- access matrix для anonymous/authenticated flows;
- design specification для site consumer.

Каждый сценарий содержит конечный id/riskId/url/prerequisites/steps/expected/axeScope/evidencePolicy (schemaVersion 2). Axe include обязателен, exclude требует причину. Keyboard использует реальные Tab/Shift+Tab/Enter/Space/Escape, focus/hidden/count/attribute assertions; geometry/scroll и computed contrast с alpha: text ≥4.5, largeText/UI ≥3. Unsupported background — failed, не PASS. Unknown/ambiguous locator, empty selection или invalid threshold — ошибка. Общая фраза «проверить, что UI работает» запрещена.

### 4. Scripted Playwright evidence

Запусти через `ui-qa`, CMS только 1366×768 (`--viewports desktop`).
Перед запуском registry фиксирует IDs/prerequisites/evidenceOwner/permission/budget/stopCondition.
Пример из корня; URL — обнаруженный runtime endpoint, не выдуманный default:

```bash
source scripts/qa/browser-env.sh && node scripts/qa/run-scenarios.mjs \
  --scenarios .qa/<change>/QG-FE-MANUAL/scenarios.json --auth .qa/auth-admin.json \
  --output-dir .qa/<change>/QG-FE-MANUAL/run --base-url <discovered-url> \
  --mode qg --scenario-ids nested,table --timeout-ms 120000 --max-scenarios 10 \
  --service frontend --viewports desktop
```

Owner использует тот же CLI с `--mode self-check` и явными IDs. QG без IDs исполняет
все scenarios manifest; registry всё равно конечен. Budget scenario ≤120s, suite ≤15min;
max-scenarios ограничивает scenario×viewport (default 50, max 100), не заменяет общий deadline.
При timeout/key blocker — stop, failed/blocked + unchecked IDs, не skip/PASS.
Обязательное evidence:

- machine-readable `report.json`;
- safe fragment screenshots для релевантных состояний либо evidence-redacted с причиной и assertions;
- browser console errors;
- failed network requests и ответы `5xx`;
- axe findings уровня critical/serious;
- schemaVersion 2 report с compatibility keys, counts/outcomes и safe origin+pathname.

Live raw trace всегда OFF (CLI включения нет), даже при FAIL. Только внутренний
synthetic fixture runner без auth на своём loopback origin может писать trace,
без sources и внешних запросов. Live screenshot по умолчанию evidence-redacted;
разрешён только заранее проверенный целиком fragment через
`evidencePolicy.screenshot:{selector:"#safe-panel",mask:["#private-field"]}`.
Mask применяется до записи. Нет fullPage live, raw console text/headers/bodies/auth
в evidence. Report хранит коды/статусы, URL без query/hash/userinfo; secrets также
запрещены в pathname/IDs. Auth — отдельный ignored input. Не писать raw с очисткой потом.

Долгий запуск делай через bash `run_in_background` **без** завершающего `&`; после timeout собирай результат через `job_output`. Не запускай долгоживущие процессы конструкцией `command &`.

### 5. Визуальная инспекция агентом

Каждое изображение остаётся в контексте до конца сессии (91–93 screenshots подняли контекст QA-агента до 215K токенов), поэтому бюджет строгий:

- `read_image` — только для screenshots **изменённых** состояний, по одному на state, не больше ~15 за сессию;
- состояния, полностью покрытые assertions и axe без нарушений, визуально не перепроверяются;
- при повторной проверке после fix смотри только screenshots исправленных findings.

Прочитай обязательные screenshots через `read_image` и сравни с design/spec evidence. Проверь:

- clipping, overlap, horizontal overflow и unreadable text;
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
- обязательные безопасные screenshots просмотрены через `read_image`; запрещённые fragment states явно evidence-redacted и проверены assertions, не выданы за визуальную инспекцию;
- report и разрешённые safe screenshots/fixture traces сохранены в `.qa/<change>/<lane>/`; redacted/trace-off причины и соответствующие assertions перечислены в handoff. Privacy exception не освобождает от проверки behavior, но запрещает raw capture.

`FAIL/REWORK` — функциональная, визуальная, accessibility или access regression. `BLOCKED` — только доказанный infrastructure/external blocker после circuit breaker.

## Handoff

```text
Unit: QG-FE-MANUAL | Профиль: Quality Gate | Статус: done / rework / blocked
Environment: stackctl status → <результат>; repair attempts: <0..2>
Scenarios: <passed>/<total>; viewport: 1366×768
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
