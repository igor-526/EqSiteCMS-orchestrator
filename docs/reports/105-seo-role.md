# Quality Gate: 105-seo-role

**Профиль:** QG-LITE · **Дата:** 2026-10-27 · **Итоговый статус: APPROVED_WITH_WAIVER.**
QG-LITE и browser unit завершены. ENV-01 принят пользователем; непроверенные live ветви не объявляются PASS. Новых продуктовых blocking findings: **0**.

## Основание и scope
- [Change/proposal](../../openspec/changes/105-seo-role/proposal.md), [design/access/test matrix](../../openspec/changes/105-seo-role/design.md), [tasks](../../openspec/changes/105-seo-role/tasks.md), deltas перечислены ниже.
- Approval: назначение Router/пользователя — «одобренного и реализованного change»; D1/D2 соблюдены: 11 SEO + 8 Yandex, строго SEO без ADMIN override.
- Backend/CMS согласованно пересобраны. Seed/provisioning и guards; UI adapter, page/callback/revoke guards. Peer/public consumers не менялись.
- Проверены только пути change. Посторонний change не читался. Ветки root/backend/frontend: `main`; ветка релиза здесь не создавалась.

## Lanes и проверки
| Lane | Результат и evidence относительно `.qa/105-seo-role/` |
|---|---|
| QG-ENV | PASS: `stackctl ready app frontend --no-migrate` → ok; backend healthy, CMS HTTP-ready :3001. `QG-ENV/{ready.json,ready.log,status-final.json}`. Repair attempts: 0; миграции неприменимы. |
| QG-BE | PASS: `make -C services/backend test` → **2545 passed, 5 skipped**; `make … lint` → 0. Дополнительно ruff maintain CLI → 0. `QG-BE/{test,lint,maintain-lint}.log`. |
| QG-FE-AUTO | Проверки выполнены; единственный timeout вне scope — PRE-01 ниже. Продуктовых ошибок не найдено. |
| QG-CONTRACTS | PASS: local OpenSpec 1.14.3 status JSON и strict validate → 0; inventory совпадает с приложением (unit test). `QG-CONTRACTS/{status.json,validate.log,coverage.json}`. |
| QG-LIVE | Завершён с waiver ENV-01; **147/147 выполненных HTTP проверок** соответствуют ожидаемым статусам. Это не PASS всей SMOKE matrix. |
| QG-FORMAT | Read-only эквивалент: backend ruff format --check чисто; frontend ESLint layout --fix-dry-run → без изменений (2 warnings); git diff --check чисто. Product code не исправлялся. |
| QG-FE-MANUAL | Завершён: **12/12 functional browser scenarios passed**, desktop **1366×768**; live gaps ENV-01 и pre-existing axe PRE-02 — ниже. Полный безусловный PASS не заявляется. |
| NATS/AsyncAPI/миграции | Неприменимо: соответствующего diff нет. Makefile не менялись; корневые несвязанные test/lint/format не запускались. |

## Frontend test gate
- `npm test`: **1536 passed, 1 failed / 1537**, 101/102 файлов прошли; все затронутые tests прошли. Изолированный повтор известного flaky файла → **17/17 PASS** (PRE-01).
- `npm run lint`: exit 0, **0 errors / 437 warnings**; `npx tsc --noEmit` (локальный бинарник): exit 0; `npm run build`: exit 0.
- Логи: `QG-FE-AUTO/{test,lint,tsc,build,vk-retry}.log`; результаты и non-mutating format: `{results,format-check}.json`.
- Self-check: нет новых fetch/axios, imports API из app/UI, consumer mixing/FSD dirs, inline handlers/styles или status===ok. Единственный inline style в изменённом NavigationMenu — прежний. Глобальные auth/email app imports и примеры fetch в документационных компонентах не менялись. `QG-FE-AUTO/{self-check.json,global-self-check.log}`.
- API boundary — mocks/MSW, реальные вызовы блокируются. Проверены scope present/missing, ADMIN-only/SEO-only/mixed, 401/403, stale callbacks, revoke/regrant, StrictMode, double submit, error/input preservation и limit/offset transitions. Assertions не ослаблены.
- Два PATCH — только контрактные tests без нового edit UI. Отдельный существующий SEO Playwright suite не найден; browser/live runner относится к следующему unit.

## Покрытие test matrix
| IDs | Фактическая трассировка |
|---|---|
| UT-SEED-01 | backend `tests/unit/utils/test_user_scopes_seeder.py`; неизменность legacy roles, collision, repeat. |
| UT-SEED-02..03 | `tests/unit/maintain/test_provision_seo_smoke_user.py`; атомарность, conflict, password_ref, hash, concurrent create; PostgreSQL подтверждение SM-01. |
| UT-ACCESS-01..03 | `test_seo_proxy_api.py:test_ut05..07/test_ut_access_*/test_ut_bk01..02`, `test_yandex_proxy_api.py:test_ut11..13/test_ut_access_*`: все 19 строк, malformed body, invalid/expired cookie, SEO+ADMIN. |
| UT-ACCESS-04..05 | Там же tenant/foreign/OAuth state/400/409/502/503/credential stripping; `test_route_access_inventory.py` проверяет актуальность документа. |
| FE-A01..05 | useSeoScopes, NavigationMenu, SeoPage, YandexOAuthCallback tests: deny/allow, anonymous, mixed, page unmount, поздние ответы. |
| FE-A06 | `src/api/{seo,yandex}.test.ts`: 11+8 операций, success/empty/error/401/403, cookie include без selector/peer URL. |
| FE-Y01..03 | YandexAccountStep/MetricaCounterStep/MetricaConnectionCard/useYandexOAuthPopup tests: read/mutation/pending/error/revoke. |
| FE-D01..04 | data/pages/queries/normalization/parse hooks и UI tests: pagination/search/sort/reset, modal/error/double submit, актуальные guards. |
| M01..M08 | Browser evidence: `browser/{scenarios,report}.json`; детализация passed/waived/not-run ниже. |
Полная трассировка: `QG-CONTRACTS/coverage.json`. Performance/N+1 неприменимы: SQL, DTO и число peer вызовов не менялись.

## Access verification results и SMOKE
SMOKE исполнен по `.agents/skills/api-smoke-test/SKILL.md` (не pytest), cookie jars раздельные 0600, каталог 0700. Секреты извлекались в памяти.
| ID | Результат | Фактическое evidence / HTTP timings |
|---|---|---|
| SM-01 | **PASS** | Реальная PostgreSQL 16.15: discovery labels→name fallback+inspect; SEO seed применён; два seed без изменения ID/связей; CLI created→unchanged, concurrent repeats, tenant conflict отказ; штатные login/me. Isolated concurrent **create+unchanged**, ровно 1 user/1 SEO relation; forced assignment failure в TEMP tables → rollback. HTTP 28.17–72.86 мс. |
| SM-02 | **PASS** | Все 19 операций anonymous401 / ADMIN-only403, обычное и malformed тело: **76/76**, 25.43–84.02 мс. До peer подтверждено unit no-call assertions. |
| SM-03 | **PARTIAL / blocked-env** | **18/18** выполненных запросов, 36.20–321.98 мс; **13/19** SEO-only happy-path операций: 10 SEO read/CRUD и 3 Yandex reads. Остальные — только безопасные 400/404; SEO+ADMIN и OAuth/counters/bind/unlink success/parse202 не подтверждены live. |
| SM-04 | **PARTIAL / blocked-env** | Disposable foreign blacklist и spoof selector →404/tenant A, запись B сохранена; foreign OAuth state →403. **11/11**, 5.69–98.52 мс. Чужой disposable Yandex account отсутствует. |
| SM-05 | **PARTIAL** | Health200; pages/queries/normalization/resolve/parse-jobs: без/invalid selector401, с selector outcomes одинаковы без/с произвольными credentials. **37/37**, 0.49–82.17 мс. Resolve проверен с невалидным body400, parse с неизвестным provider400; положительный resolve/parse202 не выдаётся за проверенный. |
| SM-06 | **PASS** | Anonymous `GET /api/callback_requests/statuses` →200, **41.05 мс**; redaction review без утечек. |
- Каждая операция, её HTTP и индивидуальное время: `QG-LIVE/timings.md` и `smoke-results.json` (147 строк; тела OAuth/PII не сохранялись).
- PostgreSQL/fixtures: `QG-ENV/{postgres,profiles}.json`, `QG-LIVE/{provision,postgres-verify,concurrent-create,fixture-readiness}.json`.
- Создан `seo` только штатной BE-1 CLI в существующей явно тестовой конюшне `qg-seo-queries-metrics-351099e330 A`; роль только SEO, реальных Yandex привязок не меняли. Созданные blacklist fixtures удалены через API, чужие данные не менялись.
- Изолированная БД `qg105_concurrency_74a04031a5a6` оставлена как disposable artifact: только CREATE/INSERT через setup+штатную CLI, никаких DROP/деструктивных SQL. Её lifecycle cleanup — пользователю вне gate.
- Redaction: `QG-LIVE/redaction.json`; сырые auth ответы, пароли/хеши/DSN/реальные OAuth code не сохранялись. Приватные cookie jars — только auth inputs, не публикуемое evidence.

## Findings, Pre-existing, Waivers
- **ENV-01 — blocked-env, ключевая live ось:** нет согласованного свежего OAuth code/disposable Yandex account и SEO+ADMIN credential fixture (в runtime 0 mixed пользователей). BE-1 CLI создаёт только SEO-only; выдавать другую роль или трогать реальные аккаунты вне разрешения нельзя. SM-03/04 и positive peer parse/resolve остаются неполными. Обход: mocked unit access/ownership покрытие + безопасный частичный live; это не заменяет требуемый live PASS. Пользовательский waiver получен (см. ниже); live пробелы сохранены, повторно fixtures не запрашивались. Инструменты/продукт не ремонтировались.
- **PRE-01 — pre-existing:** `src/features/notifications/ui/VkCard.test.tsx:238` timeout5000ms при полном frontend прогоне; файл/notification slice не менялись и в HEAD уже стоит TODO Flaky in CI. Повтор без изменения кода →17/17 PASS. Не блокирует change; предложить отдельную задачу `docs/tasks` на стабилизацию этого теста (здесь не создавалась).
- **ENV-01 — waived by user:** на вопрос о принятии риска неполной live-проверки пользователь ответил «принимаю». Непроверенные сценарии SM-03/04 и positive peer parse/resolve остаются явно непроверенными; waiver не означает PASS и не разрешает дополнительные side effects. Статус автоматизированного/live этапа: **APPROVED_WITH_WAIVER**; финальный общий verdict: **APPROVED_WITH_WAIVER** после browser unit. Blocking регрессий кода: 0.

## Browser QA — QG-FE-MANUAL
Scripted Chromium: `source scripts/qa/browser-env.sh; node .qa/105-seo-role/browser/run.cjs` (targeted repeats по ID). **12/12 functional сценариев passed**, failed: **0** после уточнения селекторов; это не PASS отсутствующих live fixtures. Backend/frontend suites повторно не запускались.
| ID | Passed / waived / not-run |
|---|---|
| M01 | **passed live**: anonymous `/seo` и callback → login, приватного UI и обмена кода нет. |
| M02 | **passed live**: ADMIN-only меню отсутствует, forbidden фокусируется; callback denied, **0 SEO/Yandex calls**, code/state не отображаются. |
| M03 | **passed live SEO-only**: активный пункт и четыре вкладки; Webmaster без calls. **waived / not-run live mixed** (ENV-01); mixed policy подтверждена предыдущими unit tests, не браузерной mixed-сессией. |
| M04 | **passed browser fixtures**: обе таблицы, offset25/page2, limit100→offset0, trim search/sort/reset, прокрутка 100 строк/31 metric columns, без page overflow. |
| M05 | **passed browser fixtures**: normalization create/delete/cancel, blank validation, 409/403/502 сохраняют input/dialog, double-submit→1 POST; parse cancel без mutation, fixture202→«поставлено в очередь». **waived / not-run positive live parse**. |
| M06 | **passed browser fixtures**: account/counter wizard, focus/pending, bind/unlink cancel/confirm; callback ровно 1 fixture POST; локальный popup, wrong origin/source ignored, отмена принята. **waived / not-run real OAuth/Yandex** (ENV-01). |
| M07 | **passed safe fixtures**: intercepted `/auth/me` без SEO + вызов существующего `provider.refreshUser()` test harness при pending mutation, **без reload**: workspace/modal исчезают, late response их не восстанавливает, новых calls нет. Дополнительно remount, injected401→login и403→видимый отказ. Реальные роли в БД не менялись; это не live административный revoke. |
| M08 | **passed scoped regression review**: anonymous consumer GET200; visual/console/network/axe собраны. Raw axe **не чистый**, PRE-02 ниже; новых serious/critical регрессий не найдено. |
- Evidence: `.qa/105-seo-role/browser/{run.cjs,scenarios.json,report.json,runtime-status.json,redaction.json,axe-baseline.json}`; screenshots `M*.png`; ранние ошибки селекторов — `report-attempt*.json`, sanitized `M03-trace-sanitized.zip`, `M04-trace-sanitized.zip` (не продуктовые падения).
- Визуально просмотрены через `read_image`: Метрика empty, Webmaster, ADMIN forbidden/callback, обе широкие таблицы, normalization502, parse confirm, wizard accounts/counters, unlink confirm, revoked. Видимые controls/focus/диалоги без обрезки/наложений на **1366×768**; overflow только внутри таблиц. Мобильные viewport не запускались.
- Console: **0 page errors**; live ADMIN/SEO positive flows — 0 console errors/failed requests/5xx. Ожидаемые resource errors: anonymous401 и injected401/403/409/502; единственный 5xx — намеренно injected502. Два `ERR_ABORTED` на fixture DELETE204 при успешном завершении UI отмечены в raw report, не скрыты; неожиданных live failures нет.
- **PRE-02 — pre-existing, nonblocking:** axe `color-contrast` serious у общей палитры Ant primary/link/secondary text; critical:0, иных serious:0. Воспроизводится на неизменённом `/login`; прежний HEAD уже содержит тот же Result/link markup, SEO styles/table/modal не менялись (`axe-baseline.json`). Moderate landmark/heading/region также сохранены в raw report. Предложить отдельную `docs/tasks` задачу на общую a11y палитру, не расширять change.
- Redaction: cookies/auth state — раздельные приватные inputs0600, credentials только в памяти; headers/cookies/auth bodies из traces удалены, бывшие raw traces перезаписаны sanitized содержимым. В evidence нет реальных OAuth code; только dummy placeholders. Все mutations SEO/Yandex в browser перехвачены: **реальных Yandex side effects нет**.
- MCP exploration недоступен: system Chrome отсутствует; обход — локальный Chromium Playwright и DOM locators, axe-core injection вместо отсутствующего wrapper. Product/runtime repair attempts: **0**. Пересборка актуального diff уже подтверждена QG-ENV; runtime healthy.
- QG-FE-MANUAL.1/.2/.V завершены с указанными waiver/not-run; QG.6 остаётся неполным по ENV-01. Далее только Router approval/финализация; sync/archive/merge/release этим unit не выполнялись.

## Изменённые файлы change (для shipctl plan)
Локальные credentials и `.qa/` не включать в shipping; продуктовые файлы Quality Gate не менял.
```
SERVICES.md
.agents/skills/api-smoke-test/SKILL.md
.claude/skills/api-smoke-test/SKILL.md
services/backend/README.md
services/backend/docs/backend-route-inventory.md
services/backend/maintain/route_inventory.py
services/backend/src/api/seo.py
services/backend/src/api/yandex.py
services/backend/src/core/seeds/user_scopes.json
services/backend/src/utils/seeding/seeders/user_scopes_seeder.py
services/backend/tests/unit/api/test_route_access_inventory.py
services/backend/tests/unit/api/test_seo_proxy_api.py
services/backend/tests/unit/api/test_yandex_proxy_api.py
services/backend/maintain/provision_seo_smoke_user.py
services/backend/tests/unit/maintain/test_provision_seo_smoke_user.py
services/backend/tests/unit/utils/test_user_scopes_seeder.py
services/frontend/src/api/seo.test.ts
services/frontend/src/features/seo/hooks/useMetricaConnection.ts
services/frontend/src/features/seo/hooks/useMetricaCounters.ts
services/frontend/src/features/seo/hooks/usePageNormalization.test.ts
services/frontend/src/features/seo/hooks/usePageNormalization.ts
services/frontend/src/features/seo/hooks/useSeoDataTable.test.ts
services/frontend/src/features/seo/hooks/useSeoPagesTable.test.ts
services/frontend/src/features/seo/hooks/useSeoParseRefresh.test.ts
services/frontend/src/features/seo/hooks/useSeoQueriesTable.test.ts
services/frontend/src/features/seo/hooks/useSeoScopes.test.ts
services/frontend/src/features/seo/hooks/useSeoScopes.ts
services/frontend/src/features/seo/hooks/useYandexAccounts.ts
services/frontend/src/features/seo/hooks/useYandexOAuthCallback.ts
services/frontend/src/features/seo/hooks/useYandexOAuthPopup.test.tsx
services/frontend/src/features/seo/hooks/useYandexOAuthPopup.ts
services/frontend/src/features/seo/ui/MetricaConnectionCard.test.tsx
services/frontend/src/features/seo/ui/MetricaCounterStep.test.tsx
services/frontend/src/features/seo/ui/PageNormalizationModal.test.tsx
services/frontend/src/features/seo/ui/SeoPage.test.tsx
services/frontend/src/features/seo/ui/SeoPage.tsx
services/frontend/src/features/seo/ui/YandexAccountStep.test.tsx
services/frontend/src/features/seo/ui/YandexOAuthCallback.test.tsx
services/frontend/src/features/seo/ui/YandexOAuthCallback.tsx
services/frontend/src/types/api/user.ts
services/frontend/src/ui/NavigationMenu/NavigationMenu.test.tsx
services/frontend/src/ui/NavigationMenu/NavigationMenu.tsx
services/frontend/src/api/yandex.test.ts
openspec/changes/105-seo-role/.openspec.yaml
openspec/changes/105-seo-role/design.md
openspec/changes/105-seo-role/proposal.md
openspec/changes/105-seo-role/specs/cms-seo-data-ui/spec.md
openspec/changes/105-seo-role/specs/cms-seo-parse-refresh-ui/spec.md
openspec/changes/105-seo-role/specs/cms-seo-yandex-ui/spec.md
openspec/changes/105-seo-role/specs/seo-backend-proxy/spec.md
openspec/changes/105-seo-role/specs/seo-parse-trigger-api/spec.md
openspec/changes/105-seo-role/specs/seo-peer-http-contract/spec.md
openspec/changes/105-seo-role/specs/seo-role-provisioning/spec.md
openspec/changes/105-seo-role/specs/yandex-backend-proxy/spec.md
openspec/changes/105-seo-role/specs/yandex-oauth-cms-callback/spec.md
openspec/changes/105-seo-role/tasks.md
docs/reports/105-seo-role.md
```
