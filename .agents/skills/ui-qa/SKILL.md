---
name: ui-qa
description: Автономная browser QA через scripted Playwright, evidence и визуальную инспекцию
whenToUse: Когда QG-FE-MANUAL должен проверить UI/UX изменения в браузере
---

# UI QA

Quality Gate агент выполняет browser QA самостоятельно. Нельзя перекладывать сценарии на человека.

## 1. Подготовь runtime

Сначала загрузи skill `stack-control` и проверь окружение:

```bash
scripts/stackctl status --json
scripts/stackctl doctor frontend  # если frontend unhealthy
```

При изменениях UI пересобери соответствующий сервис через `stackctl rebuild`. Не запускай `npm run dev &`: используй Docker или managed background job без shell `&`.

## 2. Получи auth state

Credentials существуют только runtime в ignored `.qa/credentials.json` либо совместимом smoke credential store. Не печатай пароль и не сохраняй его в отчётах.

```bash
node scripts/qa/login.mjs --role admin
```

Успех сохраняет `.qa/auth-admin.json`. Скрипт проверяет API login, UI login и повторное открытие защищённой `/dashboard`. Если credentials отсутствуют или отклонены, это machine-readable external blocker с exit 1, а не повод объявить QA успешной.

## 3. Составь и выполни сценарии

По OpenSpec tasks/design создай ignored `.qa/scenarios.json`. Минимально проверь changed flow, loading/empty/error states и доступность ключевых контролов.

```bash
node scripts/qa/run-scenarios.mjs \
  --scenarios .qa/scenarios.json \
  --auth .qa/auth-admin.json \
  --output-dir .qa/reports/qg-fe-manual \
  --viewports desktop,tablet,mobile
```

Поддерживаемые действия: `goto`, `click`, `fill`, `wait`, `press`, `checkVisible`, `checkText`, `screenshot`. Неизвестное действие завершает run ошибкой.

Runner собирает console/page errors, request failures, HTTP 5xx, axe violations, screenshots и trace. Critical/serious axe violations блокируют PASS.

## 4. Выполни визуальную инспекцию

Прочитай `report.json`, затем каждый final/step screenshot через `read_image`. Сверь с дизайн-спецификацией:

- нет наложений, обрезки и горизонтального overflow;
- интерактивные элементы видимы на desktop/tablet/mobile;
- loading/empty/error states читаемы;
- focus и keyboard flow работают;
- тексты, цвета и компоненты соответствуют design system.

Playwright MCP (`mcp__pw__browser_*`) используй для exploratory debugging, поиска селекторов и проверки network/console. MCP дополняет, но не заменяет scripted report/evidence.

## PASS

- все scripted runs passed;
- console/page errors, request failures и HTTP 5xx отсутствуют;
- critical/serious axe violations отсутствуют;
- screenshots визуально проверены агентом;
- report и evidence paths записаны в QG handoff.

Человек допустим только при внешнем blocker: отсутствующий secret, необходимость sudo/системного пакета или outage внешней системы. В таком случае lane `BLOCKED`/`REWORK`, но не `APPROVED`.
