# Канонический browser runner

Только test tooling, без запуска/изменения продукта. Зависимости разрешаются через
`services/frontend/package.json`: существующие `playwright` и `axe-core` (прямая
инъекция локального axe, `@axe-core/playwright` не требуется). Root npm install не нужен.
Отсутствующие зависимости/Chromium — blocker, не skip/PASS.

## Одна verification-команда (из корня)

```bash
source scripts/qa/browser-env.sh && node --test scripts/tests/qa-browser.test.mjs
```

FIX-01/BR-01..03 и CT-01/02: настоящий Chromium, последовательно, **1366×768**. Managed HTTP
fixture слушает случайный port только на 127.0.0.1, ограничен 14 минутами и закрывается
в finally; suite timeout 14 минут, scenario ≤120 секунд (в suite 5 секунд).
Нет PG/NATS, credentials, product server или vendor calls. Deliberately bad fixtures
должны FAIL; suite проверяет эти FAIL как ожидаемый результат. Это демонстрация
exact reproducer на синтетике, **не доказательство исправления продукта**.

Evidence по умолчанию: `.qa/restore-seo-qa-readiness/QA-BROWSER-1/qa-browser-<timestamp>-<pid>/`: `suite.json`,
`positive/report.json`, `negative/report.json`, `reproducer-{pending,nonpending}-{before,after}.json`
и соответствующие browser reports. Пары reproducer имеют одинаковые scenario/input/
keys/route/DOM/expected, actual содержит оба слоя, pending и focus return.
`QA_EVIDENCE_ROOT` принимает только относительные безопасные lane roots
`.qa/restore-seo-qa-readiness/QA-BROWSER-1[/child]`,
`.qa/restore-seo-qa-readiness/QG[/child]` и legacy
`.qa/harden-agent-verification-pipeline/<lane>[/child]`. Suite создаёт эксклюзивный
`qa-browser` child; существующий child, symlink, файл вместо каталога,
absolute/traversal/backslash/чужой change отклоняются без перезаписи evidence.
Default также проверяется и получает уникальный child. Старые suites/ledgers не мигрируются.

Fixture cases и пригодные для сериализации examples: `fixtures/scenarios.mjs`.
Suite writes synthetic input `cli-scenarios.json` отдельно от report: это input,
не экспортируемый evidence (последний кейс намеренно невалиден).

## Вызовы self-check / QG

Сценарии и auth — ignored `.qa/`, auth не копировать в evidence.
Продуктовое окружение должно быть подготовлено отдельно.

```bash
source scripts/qa/browser-env.sh && node scripts/qa/run-scenarios.mjs \
  --scenarios .qa/change/scenarios.json --auth .qa/auth-admin.json \
  --output-dir .qa/change/owner --base-url http://localhost:3000 \
  --service frontend --mode self-check --scenario-ids nested,table \
  --timeout-ms 120000 --max-scenarios 10 --viewports desktop

source scripts/qa/browser-env.sh && node scripts/qa/run-scenarios.mjs \
  --scenarios .qa/change/scenarios.json --auth .qa/auth-admin.json \
  --output-dir .qa/change/qg --base-url http://localhost:3000 --mode qg
```

`self-check` требует явные конечные IDs; assertions те же, что в QG. QG без IDs
исполняет все. Неизвестные/пустые/повторные IDs, unknown action, NaN/Infinity,
invalid scope/threshold/budget — exit 1 до browser PASS. Defaults: max 50 scenario×viewport,
120000 ms на scenario, максимум max-scenarios 100. Step timeout не расширяет budget.
`--backend-url` сохранён для безопасного environment hint, не обращается к backend.
Все flags принимаются как `--flag value` и `--flag=value`.

CMS `scripts/qa-browser.mjs --service=frontend --scenarios=... --mode=self-check
--scenario-ids=... --output-dir=...` делегирует этому runner (flags **через `=`**,
как прежний facade). Не стартует dev server. CMS старые `--checks`/`--page` отвергаются:
нужны явные scenario assertions. Только desktop **1366×768**, mobile/tablet reject.
Ветки site-ad/site-ksk-inlove старого facade и их viewport policy сохранены;
canonical runner также принимает `--service site-ad --viewports desktop,tablet,mobile`,
только если это разрешено design сайта. Этот helper suite не исполняет mobile/tablet.

## Schema и assertions

```json
{
  "schemaVersion": 2,
  "scenarios": [{
    "id": "nested", "riskId": "BR-01", "url": "/safe-route",
    "prerequisites": ["prepared synthetic or isolated UI"],
    "expected": {},
    "axeScope": {"include": ["#wizard"], "exclude": [{"selector": "#decoration", "reason": "Reviewed non-interactive fixture"}]},
    "evidencePolicy": {},
    "steps": [{"id": "focus", "action": "checkFocused", "selector": "#confirmTrigger"}]
  }]
}
```

IDs: `[A-Za-z0-9][A-Za-z0-9_.-]{0,95}`, unique. URL HTTP(S), без userinfo.
Prerequisites — декларация подготовленной среды, не разрешение setup/teardown.
Нет schemaVersion/версия 1 — legacy: прежние goto/click/fill/wait/press/checkVisible/
checkText/screenshot сохранены, scope по умолчанию body. Для v2 scope обязателен,
exclude всегда требует причину. Serious/critical axe всегда блокируют; HTML/сырой
axe DOM не экспортируется. Empty/missing scope не PASS.

Новые шаги:
- `checkHidden`: hidden/detached; `checkCount`: явный `count` (collection selector).
- `checkFocused`: настоящий activeElement; `checkAttribute`: `name`, `value` (null = absent).
- `press`: `key` (Tab, Shift+Tab, Enter, Space, Escape), optional selector. Chromium keyboard,
  не dispatchEvent. Единственный target обязателен, ambiguous/missing target не PASS.
- `wait`: visible/hidden/attached/detached; assertion locator re-resolves при remount.
- `checkGeometry`: хотя бы один из `noOverflow`, `unclipped`, `inViewport`,
  `focusedInViewport` = true. Geometry требует видимый ненулевой box; clipping проверяет
  scroll/overflow ancestors, viewport — текущую позицию, не auto-scroll ради PASS.
- `scroll`: selector + x/y или `intoView:true`. Это отдельное явное действие.
- `checkContrast`: selector, threshold, state normal/hover/focus/error, kind text/largeText/ui.
  Computed CSS, ancestor backgrounds + alpha fg/bg, белый browser canvas. Threshold floors:
  text 4.5, largeText 3 (проверяется реальный размер/weight), UI 3 с явным
  `property:backgroundColor|borderTopColor` относительно внешнего фона. Error требует
  aria-invalid=true или data-state=error. Hover использует pointer, focus — focus API.
  Gradient/image, opacity/filter/blend, pseudo paint/overlap ambiguity — `contrast_unsupported`
  и failed, не выдуманный ratio. Не снижать threshold ради PASS.
  Failed step сохраняет `code:contrast_unsupported`, `stepId`, `state` и только
  allowlisted `unsupportedReason`: `color-format`, `background-image`, `opacity`,
  `filter-or-blend`, `pseudo-paint`, `overlap`, `not-visible`. Ratio/threshold при
  отказе не экспортируются; неизвестная причина не переносится в report.
  Никаких DOM text, CSS strings или raw exception messages в диагностике.
  `overlap` — консервативная граница: любой несвязанный элемент hit-test stack,
  даже если он может оказаться за target. Helper не доказывает порядок paint или
  непрозрачность перекрывающихся слоёв и не считает такую неоднозначность PASS.
  Pseudo content target/предков также считается неоднозначностью (не rasterization).

CT-01: отдельные scenario IDs normal/hover/focus/error; black/white=21,
alpha/white и #333/white=12.6347, #666/white=5.7418, #600/white=13.4189
(допуск 0.001); одинаковые цвета=1 и FAIL. Есть transparent ancestors,
largeText/UI=21, size/error applicability negatives. Перед каждым состоянием helper
убирает pointer и focus target, затем применяет только нужное состояние. Error
требует реальную разметку applicability; он не создаёт ошибку искусственно.
CT-02: gradient/image, opacity, filter/blend/backdrop, target/ancestor pseudo,
overlap, неподдерживаемый color format и невидимость дают failed без ratio.
Чтобы unsupported одного состояния не скрыл остальные, состояния размещают в
**отдельных сценариях**: внутри одного сценария сохраняется legacy fail-fast.
Numeric assertions не заменяются axe; thresholds и прежние исключения не ослаблены.

CT-03: exact `UI-QA-07-error`/`UI-QA-07-contrast` воспроизводятся только при наличии
прежнего production build и fail-closed synthetic routes. Owner evidence нового
change хранится отдельно от прежнего SEO evidence. Оба исходных normal шага
остаются `contrast_unsupported:overlap`; supported paint classification fix не
доказан, исходные findings **blocked**, hover/focus после первого отказа **unchecked**.
Это не numeric/product acceptance; расширение stacked paint, gradient rasterization,
CSS color spaces и screenshot pixel sampling не поддерживаются.

Сортировка/page-size проверяют fixture callbacks/data-offset, **не реальную API семантику**.

## Report / privacy контракт для PROTOCOL и QG

`report.json` schemaVersion **2** сохраняет compatibility keys: summary total/passed/failed,
results scenarioId/scenarioName/viewport/status/reasons/finalUrl, consoleErrors/pageErrors/
requestFailures/http5xx/axeViolations/evidence, timestamps/duration. Добавлены riskId,
steps stepId/action/status/code и contrast ratio/threshold. Paths внутри evidence относительны
output-dir. `scenarioName` = безопасный ID, не произвольное имя. inputs paths = null.
URL только origin+pathname: query/hash/userinfo удалены. Использовать только безопасные
route names (не помещать секрет в URL path/ID). Ошибки — коды, не exception.message;
console/network — код/HTTP status, без текста, headers, bodies, auth state.
Stdout: `{ok,report:"report.json",summary}` либо `{ok:false,blocker:<safe-code>}`.
Exit 0 только при всех passed, иначе 1. Report `summary.failed` у negative fixture
является ожидаемым доказательством, не общим verdict unit.

**Live raw trace всегда выключен**, даже если JSON просит trace. CLI не имеет
флага включения. Внутренний fixture runner может включить trace только для своего
127.0.0.1 origin без auth; внешние запросы при этом блокируются. Fixture trace не содержит
credentials, sources отключены. Не передавать private/auth данные fixture runner.
Live screenshot по умолчанию не создаётся (`evidence.status:evidence-redacted`).
Только предварительно проверенный fragment разрешается через
`evidencePolicy.screenshot:{selector:"#safe-panel",mask:["#private-field"]}`.
Это allowlist оператора сценария: он обязан проверить безопасность **всего** fragment,
включая динамические сообщения. Masks применяются до кодирования/записи; fullPage в
live не поддерживается. Никакого raw secret файла с последующей «очисткой».
Auth остаётся отдельным ignored input. Протокол/skill меняет только PROTOCOL-1.
