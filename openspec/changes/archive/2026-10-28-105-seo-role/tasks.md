# Tasks — 105-seo-role

Единственный изменяемый checklist реализации; ownership deliverables и DAG — `design.md#execution-units`, проверки — `design.md#test-matrix`. До пользовательского approval границ D1/D2 и завершения/sync `104-metrica-scheduling` ни один unit не запускать. Сразу отмечать только фактически выполненные пункты. Все пути contextFiles ниже от корня проекта, если не указано иное; `change/` означает `openspec/changes/105-seo-role/`.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| BE-1 | Backend | A+C | backend seed, maintain/provision_seo_smoke_user.py, относящиеся tests/unit/utils и tests/unit/maintain; обе копии SMOKE skill | approval, sync 104 | targeted seed/provisioning tests | `change/design.md` D3/D4 и UT-SEED; `change/specs/seo-role-provisioning/spec.md`; `services/backend/src/core/seeds/user_scopes.{json,py}`; `src/models/users.py`, `src/utils/security.py`, `src/utils/seeding/seeders/{simple_seeder,user_scopes_seeder,base_seeder}.py` внутри backend; обе SMOKE SKILL.md и только нужные локальные credentials без вывода секретов |
| BE-2 | Backend | A+C | backend api/{seo,yandex}.py, узкий SEO dependency при необходимости; API tests; maintain/route_inventory.py, backend docs/inventory и README; SERVICES.md | BE-1 | backend test+lint | `change/design.md` D1/D2/D5, access/test matrix; `change/specs/{seo-backend-proxy,yandex-backend-proxy,seo-parse-trigger-api,seo-peer-http-contract}/spec.md`; соответствующие backend routes, `tests/unit/api/test_{seo,yandex}_proxy_api.py`, client-boundary и inventory tests; handoff BE-1 |
| FE-1 | Frontend | B | enum, registry+tests, NavigationMenu+tests, SeoPage+tests, callback hook/UI+tests и SEO route shells при необходимости | approval, sync 104 | targeted access/navigation/callback Vitest+tsc | `change/design.md` D1/D5, FE-A01..05; `change/specs/{cms-seo-yandex-ui,yandex-oauth-cms-callback}/spec.md`; `services/frontend/src/types/api/user.ts`, `features/seo/hooks/{useSeoScopes,useYandexOAuthCallback}.ts`, `features/seo/ui/{SeoPage,YandexOAuthCallback}.tsx`, `ui/NavigationMenu/NavigationMenu.tsx`, соответствующие tests и protected layout внутри frontend src |
| FE-2 | Frontend | B | Yandex hooks/UI/tests feature SEO, кроме FE-1 файлов | FE-1 | targeted Yandex Vitest | `change/design.md` FE-Y01..03; `change/specs/{cms-seo-yandex-ui,yandex-backend-proxy}/spec.md`; `services/frontend/src/features/seo/hooks/useYandexOAuthPopup.ts`; YandexAccountStep/MetricaCounterStep/MetricaConnectionCard/ConnectionWizardModal и их tests; handoff FE-1 |
| FE-3 | Frontend | B | table/normalization/parse hooks/UI/tests feature SEO; API-boundary tests | FE-2 | frontend test/lint/tsc/build | `change/design.md` FE-A06/FE-D01..04; `change/specs/{cms-seo-data-ui,cms-seo-parse-refresh-ui}/spec.md`; frontend hooks useSeoDataTable/useSeoPagesTable/useSeoQueriesTable/usePageNormalization/useSeoParseRefresh и их tests, Normalization/Queries/DataTable UI tests, API boundary tests; handoff FE-2 |
| QG | Quality Gate | D | .qa/105-seo-role/, будущий docs/reports/105-seo-role.md | BE-2, FE-3 | QG-LITE ENV/BE/FE-AUTO/CONTRACTS/LIVE | `change/design.md` матрицы и SMOKE; профильные delta specs по diff; handoff BE/FE; `agents/quality_gate.md` профиль LITE; `.agents/skills/api-smoke-test/SKILL.md` |
| QG-FE-MANUAL | Quality Gate | D | .qa/105-seo-role/browser/, последовательное дополнение того же отчёта | QG | scripted browser M01..M08 и итоговый verdict | `change/design.md#manual-qa-steps-ui-тестирование`; `change/specs/{cms-seo-yandex-ui,cms-seo-data-ui,yandex-oauth-cms-callback,cms-seo-parse-refresh-ui}/spec.md`; handoff QG и его отчёт; `agents/howto/browser-qa-protocol.md`, skills ui-qa/stack-control |

## 1. BE-1 — роль и безопасный тестовый профиль (профиль: Backend)

**Specs:** seo-role-provisioning. **Пути:** A+C только seed/provisioning/skill. **Зависит от:** approval и sync 104.

- [x] BE-1.1 Сгенерировать UUID через `uuid.uuid4()` однократно при реализации и добавить SEO в `services/backend/src/core/seeds/user_scopes.json`; проверить парсинг seed и неизменность четырёх прежних ролей.
- [x] BE-1.2 Добавить явную локальную dev-команду `maintain/provision_seo_smoke_user.py` с выбором существующей тестовой конюшни и безопасным чтением пароля; проверить отказ без требуемых параметров/подтверждения локального окружения без изменения БД.
- [x] BE-1.3 В этой команде реализовать создание active SEO-only пользователя штатным hash и единой транзакцией; unit test подтверждает одну связь SEO и отсутствие ADMIN.
- [x] BE-1.4 Добавить no-op повтор, блокировку конкурентных запусков и безопасный отказ на несовместимом username/tenant/roles; UT-SEED-02..03 подтверждают rollback и отсутствие перезаписи чужой учётки.
- [x] BE-1.5 В двух копиях credentials добавить `roles.seo` с login и `password_ref=admin`, без литерала пароля; проверить независимость base_url/прочих ролей и отсутствие новых секретов в diff.
- [x] BE-1.6 Обновить два SKILL.md: выбор seo, разрешение password_ref в том же файле, ошибка missing/cycle и отдельные cookie jars; проверить непротиворечивость инструкций и отсутствие раскрытия пароля.
- [x] BE-1.7 Реализовать targeted tests UT-SEED-01..03 и тест разрешения smoke password_ref без реальных секретов; все cases проходят, включая повтор и конфликт.
- [x] BE-1.V Выполнить targeted seed/provisioning unit tests через `uv run pytest <назначенные tests>` в backend, проверить secret-free diff, отметить выполненные IDs и вернуть handoff; live provisioning и PostgreSQL smoke оставить QG после общего readiness.

## 2. BE-2 — SEO-only API и inventory (профиль: Backend)

**Specs:** seo-backend-proxy, yandex-backend-proxy, seo-parse-trigger-api, seo-peer-http-contract. **Пути:** A+C API/inventory/документация. **Зависит от:** BE-1.

- [x] BE-2.1 Заменить ADMIN guard на точную роль SEO для всех 11 `/api/seo/**`, включая GET и parse-jobs; UT-ACCESS-01..03 подтверждают 401/403/allow до peer и разбора невалидного тела.
- [x] BE-2.2 Аналогично защитить восемь `/api/yandex/**`, включая auth/code; проверить SEO-only allow, ADMIN-only deny, без нового public POST exception.
- [x] BE-2.3 Уточнить имена/докстроки локальных dependencies без изменения global auth; проверить, что role override и SQL не добавлены, consumer routes и peer код не изменены.
- [x] BE-2.4 Обновить и прогнать группы тестов UT-ACCESS-01..03 параметризацией всех 19 строк и mixed roles; legacy ADMIN-positive fixtures менять только в пределах этих routes.
- [x] BE-2.5 Адаптировать и прогнать UT-ACCESS-04..05: tenant spoof/foreign UUID/OAuth state, validation, 409/502/503 и credential stripping; прежние DTO и безопасные ошибки сохранены.
- [x] BE-2.6 Актуализировать 19 записей `maintain/route_inventory.py`, перегенерировать backend `docs/backend-route-inventory.md`; inventory test проходит без изменения других access rules.
- [x] BE-2.7 Обновить SEO/Yandex access-описания `SERVICES.md` и backend README, включая dev provisioning/rollback; проверить соответствие D1..D5 и отсутствие секретов, не менять исторические отчёты.
- [x] BE-2.V Выполнить `make -C services/backend test` и `make -C services/backend lint` как финальную группу проверок backend, отметить только выполненные IDs и вернуть handoff; непрошедшие проверки явно описать, не чинить несвязанный сервис.

## 3. FE-1 — единая роль, навигация и callback (профиль: Frontend)

**Specs:** cms-seo-yandex-ui, yandex-oauth-cms-callback. **Пути:** B core access/navigation/page/callback. **Зависит от:** approval и sync 104.

- [x] FE-1.1 Добавить `KNOWN_USER_SCOPES.SEO` в `src/types/api/user.ts`; typecheck подтверждает совместимость остальных ролей/DTO.
- [x] FE-1.2 Перевести все SEO_ACTIONS в useSeoScopes на SEO без административного override; FE-A01/05 проверяют каждое действие и mixed roles.
- [x] FE-1.3 Проверить/адаптировать NavigationMenu к общему SEO adapter; component tests подтверждают SEO-only visible, ADMIN-only hidden и переход `/seo`.
- [x] FE-1.4 Проверить/адаптировать SeoPage и прямой SEO shell: anonymous login, без SEO forbidden/no calls, SEO render; FE-A02 проходит без новых глобальных route rules.
- [x] FE-1.5 Обеспечить очистку приватных данных/модалок при отзыве SEO на странице и игнорирование поздних ответов; FE-A04 подтверждает отсутствие утечки и новых вызовов.
- [x] FE-1.6 Обновить callback hook/UI guards и относящиеся tests: SEO-only один POST, ADMIN-only/anonymous no POST, safe 401/403, параметры и StrictMode; FE-A03 проходит без вывода OAuth code.
- [x] FE-1.7 Актуализировать targeted registry/navigation/page/callback fixtures и добавить отдельные отрицательные ADMIN-only cases; mock-only тесты FE-A01..05 проходят, нет ослабленных assertions.
- [x] FE-1.V Из frontend выполнить targeted Vitest для назначенных файлов и `npx tsc --noEmit`, отметить IDs и вернуть handoff с перечнем оставшихся Yandex/data test adaptations для FE-2/FE-3.

## 4. FE-2 — регрессии интеграции Яндекса (профиль: Frontend)

**Specs:** cms-seo-yandex-ui, yandex-backend-proxy. **Пути:** B Yandex hooks/components/tests. **Зависит от:** FE-1.

- [x] FE-2.1 Заменить упоминания требуемого ADMIN в useYandexOAuthPopup и других локальных SEO error messages на SEO; FE-Y03 проверяет корректный текст.
- [x] FE-2.2 Адаптировать popup tests к SEO-only и добавить ADMIN-only/revoke/no-call cases; guard и запрет параллельного запуска сохраняются.
- [x] FE-2.3 Адаптировать YandexAccountStep tests: SEO чтение/догрузка/выбор/unlink, scope missing и 401/403; FE-Y01..02 проходит без live API.
- [x] FE-2.4 Адаптировать MetricaCounterStep tests: SEO-only load/bind и ADMIN-only deny, double-submit/revoke; search/pagination и pending contract сохранены.
- [x] FE-2.5 Адаптировать MetricaConnectionCard tests: SEO-only connection/unlink, missing scope, ошибки и refresh; deny не становится success.
- [x] FE-2.6 Адаптировать ConnectionWizardModal и подтверждения в назначенном Yandex slice; keyboard/focus, cancel и сохранение шага при ошибке проверены тестами.
- [x] FE-2.7 Реализовать только необходимые локальные guard/race исправления в Yandex hooks, выявленные FE-Y01..03; тесты подтверждают отсутствие API-вызова без SEO и отсутствие утечек после revoke.
- [x] FE-2.V Выполнить targeted Yandex Vitest, проверить отсутствие ADMIN guards и no site-* mixing в назначенном slice, отметить IDs и вернуть handoff; полный frontend suite запускает FE-3.

## 5. FE-3 — данные, нормализация и запуск парсинга (профиль: Frontend)

**Specs:** cms-seo-data-ui, cms-seo-parse-refresh-ui. **Пути:** B data/normalization/parse и API-boundary tests. **Зависит от:** FE-2.

- [x] FE-3.1 Адаптировать useSeoDataTable/useSeoPagesTable/useSeoQueriesTable tests к SEO-only, ADMIN-only deny и revoke/race; FE-D01 проходит без изменения метрик/SQL/DTO.
- [x] FE-3.2 Адаптировать tests SeoDataTable/SeoQueriesPanel и назначенных data components: data/loading/empty/error/interaction и scope missing; FE-D01 проходит.
- [x] FE-3.3 Адаптировать usePageNormalization/PageNormalizationModal tests: SEO-only, guard, double-submit, client validation, 400/409/403/502 и success refresh; FE-D02 проходит без сброса input/list при ошибке.
- [x] FE-3.4 Адаптировать useSeoParseRefresh/подтверждение: SEO-only, ADMIN-only deny, stale callback, 202 и 400/401/403/502/503; FE-D03 проходит без автоматического повторного POST.
- [x] FE-3.5 Проверить API-boundary tests всех 19 потребляемых операций на success/empty/error/401/403 и отсутствие selector/direct peer calls; FE-A06 проходит на mocks/MSW.
- [x] FE-3.6 Сохранить и прогнать регрессию FE-D04 по limit/offset, четырём pagination transitions, search/sort/reset и независимости вкладок; серверные defaults не пересчитываются в CMS.
- [x] FE-3.7 Выполнить только необходимые guard/race исправления в data/normalization/parse slice и no site-* mixing self-check; отсутствие raw fetch/API imports в app/новых FSD directories подтверждено поиском.
- [x] FE-3.V Из frontend выполнить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, отметить выполненные IDs и вернуть handoff; зафиксировать failures без массовой несвязанной переработки тестов.

## 6. QG — единый автоматизированный и live gate (профиль: Quality Gate)

**Specs:** профильные deltas по diff. **Пути:** D. **Зависит от:** BE-2, FE-3. **Профиль:** QG-LITE, финальный UI verdict после QG-FE-MANUAL.

- [x] QG.1 Проверить readiness актуального Docker runtime по stack-control, применённость seed и согласованное развёртывание backend/CMS; evidence только `.qa/105-seo-role/`, без продуктовых repair-изменений.
- [x] QG.2 Повторить discovery DB по labels с fallback и `docker inspect`, извлечь параметры в памяти; подтвердить реальную PostgreSQL и локальные disposable fixtures без вывода пароля/DSN.
- [x] QG.3 Выполнить QG-BE review и scoped backend test/lint; UT-SEED/UT-ACCESS трассируются на tests, матрица всех 19 операций и foreign ownership подтверждены.
- [x] QG.4 Выполнить QG-FE-AUTO: frontend test/lint/tsc/build и review FE-A/Y/D coverage, no live calls в unit tests, no site-* mixing и pagination regression; evidence содержит реальные результаты.
- [x] QG.5 Выполнить QG-CONTRACTS: сверить scope D1/D2, route inventory, peer policy и sync104 baseline; `openspec status --change 105-seo-role --json` и `openspec validate 105-seo-role --type change --strict` проходят.
- [ ] QG.6 Явно подготовить локального пользователя через BE-1 dev-команду и выполнить SM-01..06 через SMOKE skill на реальной PostgreSQL, включая anonymous/authenticated/ADMIN-only/SEO-only/SEO+ADMIN; без pytest-smoke и без изменения реальных Yandex привязок. Отсутствие безопасных OAuth fixtures фиксировать blocked-env, не выдумывать PASS.
- [x] QG.7 Создать единственный итоговый файл `docs/reports/105-seo-role.md` с результатами автоматизированных/live проверок и findings; финальный вердикт отложить до browser unit, логи/JSON держать только в `.qa/105-seo-role/`.
- [x] QG.V Проверить redaction evidence и покрытие всех применимых осей; отметить выполненные IDs и вернуть handoff с указанием passed/failed/blocked сценариев для QG-FE-MANUAL; при блокере не объявлять APPROVED.

## 7. QG-FE-MANUAL — browser QA и финальный вердикт (профиль: Quality Gate)

**Specs:** CMS deltas. **Пути:** D; отчёт передан последовательно от QG. **Зависит от:** QG.

- [x] QG-FE-MANUAL.1 Выполнить M01..M08 из `design.md` через scripted Playwright и визуальную инспекцию по browser QA protocol на 1366×768; evidence подтверждает permissions, anonymous/authenticated/mixed roles, direct route, callback, layout/errors и revoke без секретов. Выполненные browser fixtures/live checks — в отчёте; mixed и реальные OAuth/Yandex/positive parse остаются waived/not-run по принятому ENV-01, не PASS.
- [x] QG-FE-MANUAL.2 Проверить полноту accumulated evidence и findings общего gate, дополнить тот же `docs/reports/105-seo-role.md` browser результатами и выставить единый итоговый verdict; при REWORK вернуть findings владельцам, перепроверять только исправленный scope.
- [x] QG-FE-MANUAL.V Отметить только выполненные IDs и вернуть Router итоговый handoff со ссылкой на отчёт и оставшимися approval/финализационными gates; sync/archive самостоятельно не выполнять.

## Workflow follow-up

- Router после итогового APPROVED/согласованного waiver и нужных пользовательских approval устраняет остаточные findings через владельцев, выполняет sync specs, повторную strict validation, archive и штатную task-finalize процедуру.
- После sync104 перед apply105 повторно проверить, что requirements из 104 доступны в main specs и не расходятся с 105 deltas. При расхождении вернуть Planner только затронутые артефакты.
- PLAN-105 завершает только планирование: создание пользователя, генерация UUID, runtime/apply, отчёт Quality Gate и финализация здесь не выполняются.
