---
name: ui-qa
description: Автономная browser QA через scripted Playwright, evidence и визуальную инспекцию
whenToUse: Когда QG-FE-MANUAL должен проверить UI/UX изменения в браузере
---

# UI QA

Quality Gate агент выполняет browser QA самостоятельно. Нельзя перекладывать сценарии на человека.

Канон — [verification policy](../../../agents/howto/verification-policy.md),
[browser protocol](../../../agents/howto/browser-qa-protocol.md),
[actual CLI/schema/privacy](../../../scripts/qa/browser/README.md).
Owner self-check выбирает конечные IDs по diff; QG независимо проверяет registry,
не повторяет весь gate до первого QG. Для helper-only diff без UI product manual lane
не нужен: FIX-01/BR-01..03 synthetic Chromium suite исполняет CONTRACTS одной командой
`source scripts/qa/browser-env.sh && node --test scripts/tests/qa-browser.test.mjs`.
В docs-only unit runtime/browser не запускать.

## 1. Подготовь runtime

Сначала загрузи skill `stack-control` и проверь окружение:

```bash
scripts/stackctl status --json
scripts/stackctl doctor frontend  # если frontend unhealthy
```

Runtime подготовлен ENV; rebuild только при подтверждённой необходимости в scope и budget, не автоматически перед каждым сценарием. Не запускай `npm run dev &`: используй Docker или managed background job без shell `&`.

## 1a. Подготовь браузер

```bash
source scripts/qa/browser-env.sh && node -e 'require("playwright")' # из services/frontend
```

`browser-env.sh` выставляет `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright` и при нехватке системных библиотек Chromium (`libnspr4`, `libnss3`, `libasound2`) без sudo распаковывает их в `.cache/browser-libs`. Выполняй `source` в каждой команде с Playwright: env не сохраняется между tool calls. Это не blocker и не вопрос пользователю.

## 2. Получи auth state

Credentials существуют только runtime в ignored `.qa/credentials.json` либо совместимом smoke credential store. Не печатай пароль и не сохраняй его в отчётах.

```bash
node scripts/qa/login.mjs --role admin
```

Успех сохраняет `.qa/auth-admin.json`. Скрипт проверяет API login, UI login и повторное открытие защищённой `/dashboard`. Если credentials отсутствуют или отклонены, это machine-readable external blocker с exit 1, а не повод объявить QA успешной.

## 3. Составь и выполни сценарии

По OpenSpec tasks/design создай ignored `.qa/<change>/QG-FE-MANUAL/scenarios.json`. Минимально проверь changed flow, loading/empty/error states и доступность ключевых контролов.

```bash
node scripts/qa/run-scenarios.mjs \
  --scenarios .qa/<change>/QG-FE-MANUAL/scenarios.json \
  --auth .qa/auth-admin.json \
  --output-dir .qa/<change>/QG-FE-MANUAL/run \
  --base-url <discovered-url> --service frontend --viewports desktop \
  --mode qg --scenario-ids nested,table --timeout-ms 120000 --max-scenarios 10
```

Node runner не поддерживает `--help` (invalid_cli, exit 1); flags/schema сверяются
по browser README и `browser/schema.mjs`, не запуском продукта. Python helpers дают `--help`.

CMS — desktop-only: `desktop` = 1366×768, единственный viewport. `tablet`/`mobile` — только для `site-*`, если этого требует их design-протокол. Все evidence — в `.qa/<change>/`, не в `docs/reports/`.

Owner вызов: те же flags, `--mode self-check` и явные `--scenario-ids nested,table`.
QG без IDs запускает все scenarios manifest, но registry конечен. Schema v2:
id/riskId/url/prerequisites/steps/expected/axeScope/evidencePolicy. Actions:
`goto`, `click`, `fill`, `wait`, `press`, `checkVisible`, `checkText`, `screenshot`,
`checkHidden`, `checkCount`, `checkFocused`, `checkAttribute`, `checkGeometry`, `scroll`,
`checkContrast`. Unknown/empty/ambiguous inputs не PASS. Axe include обязателен,
exclude требует reason. Contrast text ≥4.5, largeText/UI ≥3; unsupported paint — failed.
Budget scenario ≤120s, suite ≤15min, max-scenarios ограничивает scenario×viewport.
Не более двух infrastructure repair attempts суммарно, одного targeted recheck;
key blocker/timeout/exhaustion — stop с unchecked IDs, не skip/PASS.
Exact fix: тот же Space → Escape, оба слоя/pending/focus return, safe before FAIL→after
PASS и impacted regression; before PASS — unreproduced/blocked, не искусственный FAIL.

Report schemaVersion 2 сохраняет compatibility keys summary/results/status/reasons/evidence;
console/network только коды/status, URL только origin+pathname, без query/hash/userinfo.
Raw text/headers/bodies/auth не экспортируются; ID/pathname также не должны содержать secrets.
Live raw trace OFF всегда, CLI включения нет. Trace только у внутреннего synthetic
loopback fixture runner без auth/внешних запросов/sources. Live screenshot default
`evidence-redacted`; только заранее проверенный целиком fragment:
`evidencePolicy.screenshot:{selector:"#safe-panel",mask:["#private-field"]}`.
Mask до записи; fullPage live запрещён. Нельзя писать raw и очищать потом.
Auth — отдельный ignored input, не evidence. Critical/serious axe violations блокируют PASS.

## 4. Выполни визуальную инспекцию

Прочитай `report.json`, затем screenshots **изменённых** состояний через `read_image` (по одному на state, ориентир ≤15 за сессию; каждое изображение остаётся в контексте до конца сессии). Сверь с дизайн-спецификацией:

- нет наложений, обрезки и горизонтального overflow;
- интерактивные элементы видимы и доступны в 1366×768;
- loading/empty/error states читаемы;
- focus и keyboard flow работают;
- тексты, цвета и компоненты соответствуют design system.

Playwright MCP (`mcp__pw__browser_*`) используй для exploratory debugging, поиска селекторов и проверки network/console. MCP дополняет, но не заменяет scripted report/evidence.

## PASS

- все scripted runs passed;
- console/page errors, request failures и HTTP 5xx отсутствуют;
- critical/serious axe violations отсутствуют;
- разрешённые safe screenshots визуально проверены агентом; evidence-redacted states с причиной и assertions не называются визуально просмотренными;
- report и evidence paths записаны в QG handoff.

Человек допустим только при внешнем blocker: отсутствующий secret, необходимость sudo/системного пакета или outage внешней системы. В таком случае lane `BLOCKED`/`REWORK`, но не `APPROVED`.
