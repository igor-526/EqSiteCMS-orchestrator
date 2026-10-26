# Tasks — seo-frontend

До пользовательского approval ничего из этого чеклиста не выполнять. Ownership, DAG и оценки — в [design](<design.md#execution-units>), сценарии тестов — в [Test matrix](<design.md#test-matrix>), браузерные шаги — в [Manual QA](<design.md#manual-qa-steps-ui-тестирование>). Checkbox отмечает только исполнитель назначенного unit сразу после фактического выполнения. Backend, peer, site-* и общие primitives не менять.

## Execution units

Все frontend пути ниже относительно `services/frontend`; A — Frontend ownership, B — Quality Gate (единственный отчёт последовательно). Точные файлы новых модулей заданы в задачах; tests находятся рядом. `contextFiles` — обязательный минимальный context pack, не весь change.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| FE-1 | Frontend | A | src/types/api/seo.ts; src/api/seo{,.test}.ts; feature SEO service/validator/scope и их tests | approval | UT-SEO-01..06 targeted; scoped lint/typecheck | [design D1/D4 и API/access](<design.md#decisions>), [data spec](<specs/cms-seo-data-ui/spec.md>), [API client](<../../../services/frontend/src/api/client.ts>), [yandex API](<../../../services/frontend/src/api/yandex.ts>), [scope registry](<../../../services/frontend/src/features/seo/hooks/useSeoScopes.ts>), [backend routes](<../../../services/backend/src/api/seo.py>), [DTO](<../../../services/backend/src/clients/seo_service/schemas.py>) |
| FE-2 | Frontend | A | hooks/useSeoDataTable; ui/SeoDataTable, SeoPagesPanel, SeoQueriesPanel, SeoPage, seoStyles; tests этих hooks/UI | FE-1 | UT-SEO-07..11 targeted; scoped lint/typecheck | [design D2 и матрица](<design.md#decisions>), [data spec](<specs/cms-seo-data-ui/spec.md>), [tabs delta](<specs/cms-seo-yandex-ui/spec.md>), [MainTable](<../../../services/frontend/src/ui/MainTable.tsx>), [TablePaginator](<../../../services/frontend/src/ui/TablePaginator.tsx>), [SeoPage](<../../../services/frontend/src/features/seo/ui/SeoPage.tsx>); новые `services/frontend/src/types/api/seo.ts`, `services/frontend/src/features/seo/services/seoDataService.ts` из FE-1 |
| FE-3 | Frontend | A | hooks/usePageNormalization; ui/PageNormalizationModal, NormalizationList; SeoPage integration; seoStyles; tests соответствующих hooks/UI | FE-2 | UT-SEO-12..17; полный frontend gate | [design D3/D4 и матрица](<design.md#decisions>), [data spec](<specs/cms-seo-data-ui/spec.md>), [ConfirmActionModal](<../../../services/frontend/src/features/seo/ui/ConfirmActionModal.tsx>), [SeoPage](<../../../services/frontend/src/features/seo/ui/SeoPage.tsx>); новые `services/frontend/src/features/seo/services/seoDataService.ts`, `services/frontend/src/features/seo/validators/normalization.ts`, `services/frontend/src/types/api/seo.ts` из FE-1 и handoff FE-2 |
| QG | Quality Gate | B | docs/reports/seo-frontend.md; .qa/seo-frontend/qg/** | FE-3 | QG-LITE auto/contracts; strict validation | [design Test matrix](<design.md#test-matrix>), [data spec](<specs/cms-seo-data-ui/spec.md>), [tabs delta](<specs/cms-seo-yandex-ui/spec.md>), [quality rules](<../../../agents/quality_gate.md>); handoffs FE-1..3, path-scoped diff |
| QG-FE-MANUAL | Quality Gate | B | тот же отчёт; .qa/seo-frontend/browser/** | QG | M01..M12, 1366×768; итоговый вердикт | [design Manual QA](<design.md#manual-qa-steps-ui-тестирование>), [data spec](<specs/cms-seo-data-ui/spec.md>), [browser protocol](<../../../agents/howto/browser-qa-protocol.md>); handoff/отчёт QG, skill ui-qa |

## 1. FE-1 — типизированный API boundary и правила доступа (профиль: Frontend)

**Specs:** [cms-seo-data-ui](<specs/cms-seo-data-ui/spec.md>) · **Deliverable:** A · **Зависит от:** approval пользователя. Один slice API/service/validation, ~9 существенных действий.

- [x] FE-1.1 Добавить `src/types/api/seo.ts`: DTO обоих ресурсов и правил, `items/total`, допустимые query/ordering и тип коллекции. Проверка: типы соответствуют backend DTO и не вводят page-based pagination/tenant input.
- [x] FE-1.2 Добавить `src/api/seo.ts`: 2 GET данных, 2 GET коллекций, 2 POST и 2 DELETE через общий apiFetch. Проверка: UT-SEO-01..04, ни PATCH, ни resolve, ни прямого peer URL.
- [x] FE-1.3 Добавить `src/features/seo/services/seoDataService.ts` с типизированными wrappers/mapping и сохранением ApiResult. Проверка: unit success/empty/error, whitelist ordering/clear и literal search из UT-SEO-01,03.
- [x] FE-1.4 Добавить `src/features/seo/validators/normalization.ts` на Zod с правилами D3. Проверка: UT-SEO-06, Unicode code points и отличия hash/params.
- [x] FE-1.5 Расширить [useSeoScopes](<../../../services/frontend/src/features/seo/hooks/useSeoScopes.ts>) и его tests новыми ADMIN-only действиями. Проверка: UT-SEO-05, повышенные роли без ADMIN не дают доступа.
- [x] FE-1.6 Добавить API-boundary MSW tests в `src/api/seo.test.ts`: UT-SEO-01..04 на все восемь операций, anonymous/authenticated, 401 refresh, 403 и применимые ошибки матрицы; без live calls. Проверка: fail-on-unhandled-request и targeted Vitest PASS.
- [x] FE-1.7 Добавить grouped service/validator tests рядом с модулями: UT-SEO-01,03,06; проверить отсутствие HTTP-status branching по тексту/сырого fetch и backend-only возможностей. Проверка: targeted Vitest PASS.
- [x] FE-1.V Прогнать targeted API/service/validator/scopes tests, scoped ESLint и `npx tsc --noEmit` из frontend; приложить evidence в `.qa/seo-frontend/fe-1/`, отметить только завершённое и вернуть Router handoff. Полный suite пока не запускать.

## 2. FE-2 — таблицы Страницы и Запросы (профиль: Frontend)

**Specs:** [данные](<specs/cms-seo-data-ui/spec.md>), [вкладки](<specs/cms-seo-yandex-ui/spec.md>) · **Deliverable:** A · **Зависит от:** FE-1. Один table/list slice, ~9–10 действий.

- [x] FE-2.1 Добавить `hooks/useSeoDataTable.ts`: независимые состояния обоих ресурсов, activation/permission guards, loading/empty/error/retry, generation cleanup. Проверка: UT-SEO-10,11, запрещённые и устаревшие запросы не меняют UI.
- [x] FE-2.2 Реализовать в этом hook draft + debounce300/trim/clear, whitelist sort, offset reset и adapter TablePaginator для limit/offset. Проверка: UT-SEO-07..09, без page/pageSize в API.
- [x] FE-2.3 Добавить `ui/SeoDataTable.tsx` на MainTable: колонки value/date, текст/tooltip, server sorter/header dropdown, верхняя пагинация без filter toolbar. Проверка: UT-SEO-07..10, по дате controls отсутствуют, legacy prop только на primitive boundary.
- [x] FE-2.4 Добавить тонкие `ui/SeoPagesPanel.tsx` и `ui/SeoQueriesPanel.tsx` с контейнером состояния таблиц. Проверка: component data/loading/empty/error/interaction и отсутствие API imports в UI.
- [x] FE-2.5 Дополнить [SeoPage](<../../../services/frontend/src/features/seo/ui/SeoPage.tsx>) четырьмя вкладками и семантикой «SEO», сохранив default Метрику, guards и независимое состояние при переключении. Проверка: UT-SEO-11; кнопку нормализации подключит FE-3, не создавать временную нерабочую кнопку.
- [x] FE-2.6 Добавить локальные стили таблиц при необходимости в [seoStyles](<../../../services/frontend/src/features/seo/ui/seoStyles.ts>); не менять UI primitives. Проверка: desktop layout constraints, длинный текст/дата не пересекаются в component markup; live visual — QG-FE-MANUAL.
- [x] FE-2.7 Реализовать grouped hook/table tests UT-SEO-07..10 рядом с модулями, включая pagination4+, filter4+, sort mapping/clear, table5+ на оба вида, race и revoke scopes. Проверка: targeted Vitest без live backend.
- [x] FE-2.8 Обновить [SeoPage tests](<../../../services/frontend/src/features/seo/ui/SeoPage.test.tsx>) по UT-SEO-11: anonymous/authenticated/scopes, четыре таба и регрессия Метрики/Вебмастера. Проверка: targeted SEO route/UI tests PASS.
- [x] FE-2.V Прогнать targeted hook/table/SeoPage tests, scoped ESLint, `npx tsc --noEmit`; no site-* mixing/API-import self-check по D1. Evidence `.qa/seo-frontend/fe-2/`, фактические checkbox и Router handoff; полный suite оставить FE-3.

## 3. FE-3 — модалка нормализации и интеграция (профиль: Frontend)

**Specs:** [cms-seo-data-ui](<specs/cms-seo-data-ui/spec.md>) · **Deliverable:** A · **Зависит от:** FE-2. Один modal/mutation slice, ~9–10 действий.

- [x] FE-3.1 Добавить `hooks/usePageNormalization.ts` с двумя list_all коллекциями, reset open/switch/close, локальной pagination10 и поколениями запросов. Проверка: UT-SEO-12; page click не делает GET и не отправляет query pagination.
- [x] FE-3.2 Реализовать create/delete flow этого hook: Zod, актуальный ADMIN guard, синхронный lock, selected kind/id/value, canonical success и GET refresh/reconciliation по D3/D4. Проверка: UT-SEO-13..16, 404 без status guessing, failed refresh не повторяет mutation.
- [x] FE-3.3 Добавить `ui/NormalizationList.tsx`: компактные строки, long value, aria-labeled иконка справа, loading/empty/error/retry и локальный paginator. Проверка: UT-SEO-12,14; index не используется как key.
- [x] FE-3.4 Добавить `ui/PageNormalizationModal.tsx`: Хеш/Параметры, input+plus/Enter, валидация, отдельный ConfirmActionModal, pending locks и focus return; пояснение про точные правила и отсутствие перенормализации. Проверка: UT-SEO-13..16.
- [x] FE-3.5 Подключить «Нормализация» в tabBarExtraContent только активного pages у [SeoPage](<../../../services/frontend/src/features/seo/ui/SeoPage.tsx>), вне таблицы/paginator; при необходимости дополнить локальные [стили](<../../../services/frontend/src/features/seo/ui/seoStyles.ts>). Проверка: UT-SEO-17, body/таблица/диалоги не получают лишних панелей.
- [x] FE-3.6 Реализовать grouped hook tests UT-SEO-12..16 с service mocks: scopes present/missing, double submit, ошибки mutation/read, обе коллекции, reset/correction и races. Проверка: targeted Vitest без live backend.
- [x] FE-3.7 Реализовать modal/list component tests UT-SEO-12..16: modal5+, list5+, permission4+ для действий, keyboard/confirm cancel и pending. Проверка: targeted Vitest PASS, отсутствие автоматического повторного DELETE/POST.
- [x] FE-3.8 Обновить integration [SeoPage tests](<../../../services/frontend/src/features/seo/ui/SeoPage.test.tsx>) по UT-SEO-17 и выполнить self-check D1/D4: no site-* mixing, raw fetch, DTO вне types, page-based API, feature-aware primitive. Проверка: компонентный CRUD flow и существующие SEO regressions PASS, локальные guards не заменяют backend.
- [x] FE-3.V Выполнить один полный suite исполнителя `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` из frontend; evidence `.qa/seo-frontend/fe-3/`, отметить фактически выполненное и вернуть Router handoff, не переходя к QG самостоятельно.

## 4. QG — автоматизированный единый gate QG-LITE (профиль: Quality Gate)

**Specs:** обе delta specs · **Deliverable:** B · **Зависит от:** FE-3. Проверки одного frontend-сервиса, без runtime backend diff.

- [x] QG.1 Проверить path-scoped diff и соответствие ownership/утверждённым specs, отсутствие backend/peer/site-* изменений. Проверка: review всех затронутых модулей и handoffs, не исправлять чужие пути.
- [x] QG.2 Независимо выполнить frontend `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; проверить качество tests относительно UT-SEO-01..17, MSW isolation и отсутствие live UT. Проверка: логи и review покрытия, не только счётчик PASS.
- [x] QG.3 Сверить все 8 строк access matrix с boundary mocks и guards, anonymous/authenticated/scopes/401/403/foreign404, общим refresh, 204 и D4 error limitations. Проверка: не добавлены Public Read GET или несуществующие API возможности.
- [x] QG.4 Выполнить self-checks из design, review limit/offset и header-only controls, локальной pagination и no site-* mixing; `openspec validate seo-frontend --type change --strict`. Проверка: совпадения классифицированы относительно diff, blocking/pre-existing разделены.
- [x] QG.5 Создать предварительную часть единственного `docs/reports/seo-frontend.md` с auto/contracts findings, test matrix coverage и handoff browser unit; evidence только `.qa/seo-frontend/qg/`. Проверка: окончательный UI verdict пока не выставлен, неприменимые lanes объяснены.
- [x] QG.V Отметить выполненные QG tasks, вернуть Router краткий handoff с результатами и готовностью/блокером M01..M12. Backend tests/DB smoke/QG-LIVE — неприменимо: runtime API не меняется; environment browser проверит следующий unit.

## 5. QG-FE-MANUAL — браузер и итоговый вердикт (профиль: Quality Gate)

**Specs:** обе delta specs · **Deliverable:** B · **Зависит от:** QG. Отдельная browser verification group, только desktop1366×768.

- [x] QG-FE-MANUAL.1 Загрузить ui-qa и browser-qa протокол, подготовить существующий CMS URL, сессии/fixtures и viewport по предусловиям design; не поднимать подменяющий сервер. Проверка: нужные auth states/data доступны либо явно blocked-env.
- [x] QG-FE-MANUAL.2 Выполнить M01..M06 по [Manual QA](<design.md#manual-qa-steps-ui-тестирование>): auth/tabs/table/filter/sort/pagination/states. Проверка: результаты каждого шага и network evidence, keyboard и отсутствие верхних фильтров.
- [x] QG-FE-MANUAL.3 Выполнить M07..M10: две коллекции, local pagination, реальные create/delete своих временных правил, ошибки и guards с обозначенными interceptions. Проверка: mutation happy path на существующем API и error evidence, без SQL/resolve UI.
- [x] QG-FE-MANUAL.4 Выполнить M11..M12: 1366×768 visual inspection, длинные значения, оба диалога/focus, регрессии Яндекса и cleanup только своих QA правил. Проверка: screenshots layout/error/permissions, очистка подтверждена; mobile/tablet не запускать.
- [x] QG-FE-MANUAL.5 Дополнить тот же `docs/reports/seo-frontend.md` browser-результатами, evidence `.qa/seo-frontend/browser/`, единым итоговым вердиктом; findings вернуть владельцу, при rework перепроверить только затронутое. Проверка: все M01..M12 passed/failed/blocked, нет второго отчёта/каталога reports.
- [x] QG-FE-MANUAL.V Вернуть Router итоговый handoff и статус gate, отметить только фактически выполненные задачи. Проверка: при BLOCKED/REWORK не разрешать финализацию; изменения specs и archive не выполнять из browser unit.

## 6. FE-FIX-1 — пагинация и accessibility SEO (профиль: Frontend)

Ownership: только SEO hooks/UI/styles/tests и этот tasks.md. Основание — F01–F04 браузерного QG; shared primitives, access/tenant/API и отчёт QG не менять.

- [x] FE-FIX-1.1 F01: исправить reset offset при двух callback реального TablePaginator; regression для обоих ресурсов и следующего обычного перехода страницы.
- [x] FE-FIX-1.2 F02: вынести нормализацию из ARIA tablist, сохранив строку вкладок и расположение вне pagination; regression на активных Страницах.
- [x] FE-FIX-1.3 F03: обеспечить Tab/Enter/Esc фильтра без сортировки и keyboard-focus scroll body обеих SEO таблиц; regression tests локальной интеграции.
- [x] FE-FIX-1.4 F04: заменить secondary пояснение модалки читаемым основным текстом; regression на локальную семантику/контраст.
- [x] FE-FIX-1.V Выполнить targeted SEO tests, scoped lint/typecheck и применимые a11y checks; evidence `.qa/seo-frontend/fe-fix-1/`. Вернуть mapping findings→fix/tests без продуктового вердикта; browser recheck выполняет прежний QG.

## 7. FE-FIX-2 — скрытый sizing focus F03-R1 (профиль: Frontend)

Дополнительный fix явно разрешён пользователем через Router. Ownership: только SEO frontend/tests и tasks.md; отчёт QG/shared primitives/API/backend/site-* не менять.

- [x] FE-FIX-2.1 F03-R1: исключить hidden sizing-кнопку обеих таблиц из keyboard/programmatic focus до отрисовки, сохранив видимый фильтр, размеры заголовка, scroll и sort.
- [x] FE-FIX-2.2 Добавить regression tests обоих ресурсов: sizing-кнопка disabled/не получает focus, Tab после scroll body не уходит в неё; проверить remount после sort и сохранение видимого Tab/Enter/Esc.
- [x] FE-FIX-2.V Выполнить targeted SEO tests, scoped ESLint/typecheck и scoped axe с aria-hidden-focus; evidence `.qa/seo-frontend/fe-fix-2/`. Вернуть handoff для повторной проверки остатка прежним QG, без продуктового вердикта.

## Workflow follow-up

- После APPROVED/APPROVED_WITH_WAIVER и разрешения пользователя Router выполняет sync только двух capabilities этого change, повторную strict validation, archive и штатную финализацию по gates.
- Если approval отклонён или scope расширен, Router возвращает Planner только затронутые артефакты; не начинать реализацию по предположениям.
- PLAN-1 не отмечает реализационные checkbox: подготовка артефактов не является выполнением frontend/QG tasks.
