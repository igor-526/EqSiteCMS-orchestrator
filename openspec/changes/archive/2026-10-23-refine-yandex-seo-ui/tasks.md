# Tasks — refine-yandex-seo-ui

Только после approval Router. Deliverable A принадлежит Frontend, UI-1 → UI-2 последовательно; B — read-only runtime Quality Gate с раздельными evidence-зонами. [DAG, решения и ownership](<design.md#execution-units>), [FT-матрица](<design.md#test-matrix>) и [manual M-01..10](<design.md#manual-qa-steps-ui-тестирование>) не дублируются здесь. Отмечать только фактически выполненные checkbox своего unit, сразу после проверки; каждый invocation заканчивается handoff и остановкой. API/access policy unchanged. Ни git/tooling repair, ни исправление старого dirty_worktree не входят в задачи.

## Execution units

Пути ownership ниже относительно `services/frontend/src/features/seo/`, если не указан полный префикс. `contextFiles` — точечный набор для каждого invocation, дополнительно Router передаёт handoff непосредственного предшественника. QG читает path-scoped diff, не весь старый архив или отчёты.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| UI-1 | Frontend | A | `ui/{SeoPage,ConnectionWizardModal,YandexAccountStep,seoStyles}.*`, их tests; `hooks/useYandexOAuthPopup.test.tsx` | approval | V1 | [решения 1–3 и pending-контракт](<design.md#decisions>), [UI delta](<specs/cms-seo-yandex-ui/spec.md>), [OAuth delta](<specs/yandex-oauth-cms-callback/spec.md>), [SeoPage](<../../../services/frontend/src/features/seo/ui/SeoPage.tsx>), [wizard](<../../../services/frontend/src/features/seo/ui/ConnectionWizardModal.tsx>), [accounts UI](<../../../services/frontend/src/features/seo/ui/YandexAccountStep.tsx>), [accounts hook](<../../../services/frontend/src/features/seo/hooks/useYandexAccounts.ts>), [popup hook](<../../../services/frontend/src/features/seo/hooks/useYandexOAuthPopup.ts>), [эталон settings](<../../../services/frontend/src/features/siteSettings/ui/SiteSettingsTabs.tsx>), [эталон notifications:55–72](<../../../services/frontend/src/features/notifications/ui/NotificationsPage.tsx#L55-L72>); только близкие tests по мере изменения |
| UI-2 | Frontend | A | `hooks/useMetricaCounters.ts`, `ui/MetricaCounterStep.*`, близкие hook/integration tests; wizard/styles последовательно после UI-1 при необходимости | UI-1 | V2 | [решение 4 и FT-08..16](<design.md#test-matrix>), [UI delta, счётчики/guards](<specs/cms-seo-yandex-ui/spec.md#requirement-шаг-выбора-счётчика-метрики>), [counter hook](<../../../services/frontend/src/features/seo/hooks/useMetricaCounters.ts>), [counter UI](<../../../services/frontend/src/features/seo/ui/MetricaCounterStep.tsx>), [counter tests](<../../../services/frontend/src/features/seo/ui/MetricaCounterStep.test.tsx>), [wizard](<../../../services/frontend/src/features/seo/ui/ConnectionWizardModal.tsx>), [карточка](<../../../services/frontend/src/features/seo/ui/MetricaConnectionCard.tsx>), [target](<../../../services/frontend/src/features/seo/wizardTargets.ts>), handoff UI-1 с busy-контрактом |
| QG-ENV | Quality Gate | B | `.qa/refine-yandex-seo-ui/env/` | UI-2 | runtime readiness | [manual предусловия](<design.md#manual-qa-steps-ui-тестирование>), [правила ENV](<../../../agents/quality_gate.md#подготовка-окружения--lane-qg-env>), skill stack-control, handoff UI-2 |
| QG-FE-AUTO | Quality Gate | B | `.qa/refine-yandex-seo-ui/auto/` | QG-ENV | VA, FT-01..18 review | [FT matrix](<design.md#test-matrix>), обе delta specs, handoffs UI-1/UI-2, только изменённые frontend tests и их production targets |
| QG-CONTRACTS | Quality Gate | B | `.qa/refine-yandex-seo-ui/contracts/` | QG-ENV | spec/diff/static review | [ownership и policy](<design.md#execution-units>), обе delta specs, [proposal impact](<proposal.md#impact>), path-scoped frontend diff |
| QG-FE-MANUAL | Quality Gate | B | `.qa/refine-yandex-seo-ui/manual/` | QG-FE-AUTO, QG-CONTRACTS | M-01..10 | [manual steps и risks](<design.md#manual-qa-steps-ui-тестирование>), [browser QA протокол](<../../../agents/howto/browser-qa-protocol.md>), skills stack-control/ui-qa, handoffs AUTO/CONTRACTS и селекторы/fixtures |
| QG-FORMAT | Quality Gate | B | `.qa/refine-yandex-seo-ui/format/` | QG-FE-MANUAL | scoped frontend VA/evidence | [команды и self-check](<design.md#test-matrix>), [scoped format rules](<../../../agents/quality_gate.md#финальная-проверка-форматирования-и-тестов--lane-qg-format-scoped>), lane handoffs и их проверенные ревизии |
| QG-SYNTH | Quality Gate | B | `docs/reports/refine-yandex-seo-ui.md` | QG-FORMAT | единый вердикт | [FT matrix](<design.md#test-matrix>), [manual steps](<design.md#manual-qa-steps-ui-тестирование>), handoffs/evidence всех lanes; specs только по findings |

`QG-BE`: неприменимо — нет Python diff. `QG-LIVE`: неприменимо — нет runtime API diff. Профиль QG-FULL из-за UI behavior. Параллельно допустимы только QG-FE-AUTO и QG-CONTRACTS после ENV. QG units — проверки без runtime-изменений; не создавать отдельные invocations ради подготовки/чекпоинта/коммита.

## 1. UI-1 — вкладки, компактные аккаунты и навигация (профиль: Frontend)

**Specs:** cms-seo-yandex-ui, yandex-oauth-cms-callback. **Ownership:** A, только UI-1 пути таблицы. Одна группа verification V1; около 9 существенных действий.

- [x] UI-1.1 Заменить локальный SeoTabBar стандартным controlled AntD Tabs по эталонам; проверить FT-UI-01, не удалить forbidden focus из FT-UI-02.
- [x] UI-1.2 В локальных SEO styles обеспечить две читаемые вкладки с underline и без доступной overflow-button в tablist на узком экране; unit assertions по семантике/keyboard, окончательная axe/mobile проверка M-01 в QG.
- [x] UI-1.3 Заменить аккаунт List на компактный ul/li с AntD Button основной области и отдельной icon-button справа, без nested button/clickable div; проверить data/loading/long values/Enter/Space по FT-UI-03..05.
- [x] UI-1.4 Связать иконку только с прежним confirm unlink, сохранить cascade warning/permissions/double-submit/errors/refresh; FT-UI-05 не вызывает onSelect при активации иконки.
- [x] UI-1.5 Удалить дублирующий empty и OAuth waiting Alert, сохранить Add/focus/closed-refresh/error UX; FT-UI-03, FT-UI-06..07 проходят, внутренний popup hook не ослаблен.
- [x] UI-1.6 Переводить выбор аккаунта сразу на цель без «Далее», сохранить Back/null/reset/custom target и перенос focus; FT-UI-04 покрывает каждый переход без эффекта auto-advance при возврате.
- [x] UI-1.7 Ввести локальный busy-контракт цели/визарда и guards закрытия/Back для UI-2, не меняя API/DTO; wizard tests проверяют busy/reset/success callback. Обновить близкие fixtures при расширении props.
- [x] UI-1.8 Адаптировать и дополнить близкие tests по FT-UI-01..07, включая ADMIN/missing/revoked и 401/403, без live backend; удалить только assertions старой панели/«Далее»/баннера, не security coverage.
- [x] UI-1.V Выполнить V1 из [матрицы](<design.md#test-matrix>), проверить scoped ownership/no consumer imports, отметить выполненные IDs и вернуть handoff Router с props busy и нужным UI-2 остатком; остановиться.

## 2. UI-2 — привязка по строке счётчика и интеграция (профиль: Frontend)

**Specs:** cms-seo-yandex-ui. **Ownership:** A, UI-2 пути таблицы, общий wizard/styles только последовательно после UI-1. Одна группа verification V2; около 8 существенных действий.

- [x] UI-2.1 Переработать hook на явный bindCounter(counterId), сохранить Zod/payload и защиту от stale selection; FT-UI-08 проверяет идентификатор первой и другой строки после ошибки.
- [x] UI-2.2 Сохранить синхронный lock, актуальную проверку ADMIN перед mutation и безопасные errors без onDone при failure; реализовать FT-UI-10, FT-UI-12..13, включая двойной вызов до rerender.
- [x] UI-2.3 Представить счётчики компактными семантическими строками по UI-1 style-контракту; активация сразу POST, удалить «Выбрать счётчик», «Привязать», «Обновить счётчики» только из шага2; FT-UI-09 проходит mouse/Enter/Space.
- [x] UI-2.4 Добавить contextual GET retry при load error и одну empty hint, не постоянную кнопку обновления; FT-UI-09/15 подтверждают retry только GET.
- [x] UI-2.5 Подключить pending к busy-контракту UI-1, заблокировать строки/search/clear/pagination/Back/Cancel/mask/Escape/close; FT-UI-11 проверяет terminal reset/reopen и onDone при success.
- [x] UI-2.6 Адаптировать hook/component tests FT-UI-08..15: сохранение шага/account/search/offset при ошибках, явный retry без auto-POST, pagination limit/offset и debounce/clear regressions; mocks/MSW без live backend.
- [x] UI-2.7 Обновить интеграционный flow FT-UI-16 с реальной конфигурацией цели: вход с карточки → account row → counter row → один POST → close/refresh, плюс card confirm regression; публичные consumer/DTO/API не меняются.
- [x] UI-2.V Выполнить V2 из [матрицы](<design.md#test-matrix>), scoped self-check FT-UI-18, отметить фактические IDs и вернуть handoff Router с ready-for-QG scope; остановиться.

## 3. QG-ENV — актуальность CMS runtime (профиль: Quality Gate)

- [x] QG-ENV.1 Обнаружить штатный CMS runtime/BASE_URL через stack-control, проверить service status; не использовать DSH GUI и не поднимать заменяющий сервер.
- [x] QG-ENV.2 Проверить актуальность frontend сборки и штатно rebuild изменённый frontend при необходимости, сохранить evidence команды/ревизии без env/config repair.
- [x] QG-ENV.3 Проверить health/readiness зависимостей, требуемых UI; отсутствие backend/data migration зафиксировать как неприменимое.
- [x] QG-ENV.4 Проверить доступность тестовых auth states и controlled browser fixtures, Playwright runtime из [design](<design.md#manual-qa-steps-ui-тестирование>); не требовать реальную учётку Яндекса для controlled flow.
- [x] QG-ENV.V Сохранить readiness evidence в своей зоне, отметить IDs, вернуть ready/blocked-env handoff; не чинить git/tooling/dirty_worktree.

## 4. QG-FE-AUTO — frontend автоматизация (профиль: Quality Gate)

- [x] QG-FE-AUTO.1 Выполнить `npm test` из frontend и сопоставить FT-UI-01..18 с assertions, сохранить результат; прежние 765 pass не заменяют новый прогон.
- [x] QG-FE-AUTO.2 Выполнить `npm run lint`, сохранить diagnostics, не расширять scope исправлений на другие фичи.
- [x] QG-FE-AUTO.3 Выполнить `npx tsc --noEmit` и `npm run build`, сохранить команды/exit codes и актуальность проверенного дерева.
- [x] QG-FE-AUTO.4 Проверить качество MSW/no live backend, access/revoked permissions/401/403, sync double-submit, direct ID, pagination/debounce, callback StrictMode1POST и security guard coverage.
- [x] QG-FE-AUTO.V Передать результаты/FT gaps/селекторы и fixtures для manual, evidence из своей зоны, отметить только фактические IDs; остановиться.

## 5. QG-CONTRACTS — границы и спецификации (профиль: Quality Gate)

- [x] QG-CONTRACTS.1 Сверить scoped diff с двумя delta specs и пользовательскими исключениями, зафиксировать gaps и сохранность незакоммиченного baseline.
- [x] QG-CONTRACTS.2 Подтвердить API/DTO/ADMIN-only/sensitive GET/write policy unchanged и отсутствие новых endpoints, backend/peers/consumer/env/config/git/tooling diff.
- [x] QG-CONTRACTS.3 Проверить reuse AntD Tabs по двум конкретным эталонам, доступные sibling-button rows, отсутствие deprecated List и нарушения layer boundaries.
- [x] QG-CONTRACTS.4 Проверить static self-check FT-UI-18, limit/offset без нового page API и no site-* mixing; совпадения вне scope только классифицировать.
- [x] QG-CONTRACTS.V Выполнить `npx -y @fission-ai/openspec@1.14.3 validate refine-yandex-seo-ui --type change --strict`, передать handoff/findings/evidence; остановиться.

## 6. QG-FE-MANUAL — browser UX, a11y и responsive (профиль: Quality Gate)

- [x] QG-FE-MANUAL.1 Выполнить весь набор M-01..10 по [Manual QA](<design.md#manual-qa-steps-ui-тестирование>) с предписанными viewport/auth/error комбинациями; протокол browser QA и skills stack-control/ui-qa обязательны.
- [x] QG-FE-MANUAL.2 Получить scripted Playwright JSON, network/console/axe evidence; проверить отсутствие aria-required-children при начальной mobile загрузке и resize с desktop.
- [x] QG-FE-MANUAL.3 Сохранить screenshots и визуально осмотреть desktop/tablet/mobile: tabs, строки, иконки, длинные данные, empty/pending/errors/confirm/pagination без overlap/overflow.
- [x] QG-FE-MANUAL.4 Сверить mutation count/ID, keyboard Enter/Space, focus, permissions, сохранение шага/error и controlled popup guards; отдельно указать непроверенную реальную авторизацию и pre-existing contrast без ложного PASS.
- [x] QG-FE-MANUAL.V Вернуть handoff с passed/failed по ID/viewport, evidence paths и findings; при недоступной ключевой browser проверке blocked-env, не передавать QA человеку.

## 7. QG-FORMAT — scoped frontend gate (профиль: Quality Gate)

- [x] QG-FORMAT.1 Установить frontend-only scope и проверяемый diff, не требовать clean-worktree и не запускать root mutating autofix.
- [x] QG-FORMAT.2 Проверить formatter/style gate затронутого frontend по штатному сервисному контракту, сохранить diagnostics без runtime-правок Quality Gate.
- [x] QG-FORMAT.3 Подтвердить lint/test/build/typecheck evidence AUTO для неизменённого дерева; при изменениях после AUTO повторить относящиеся frontend команды VA, не backend suite.
- [x] QG-FORMAT.4 Проверить отсутствие новых changes вне ownership и незакрытых format/test findings; передать владельцу A только scoped исправления.
- [x] QG-FORMAT.V Вернуть scoped gate evidence и handoff, отметить фактические IDs; не чинить shipctl dirty_worktree.

## 8. QG-SYNTH — единый итог (профиль: Quality Gate)

- [x] QG-SYNTH.1 Собрать handoffs всех применимых lanes и сопоставить FT-UI-01..18/M-01..10 с evidence, не подменять новым gate исторический QG.
- [x] QG-SYNTH.2 Классифицировать findings/blockers и неприменимые BE/LIVE; при rework вернуть scoped fix units владельцу A с точечным retest, не исправлять runtime самим.
- [x] QG-SYNTH.3 Создать один отчёт `docs/reports/refine-yandex-seo-ui.md` с итоговым QG-FULL вердиктом, viewport, passed/failed, API policy unchanged, browser/external OAuth ограничениями и evidence paths.
- [x] QG-SYNTH.4 Проверить полноту фактических checkbox и отсутствие неразрешённых critical findings; final status/strict validate не заменяют QA, но должны оставаться успешными.
- [x] QG-SYNTH.V Вернуть Router единый APPROVED / APPROVED_WITH_WAIVER / REWORK / BLOCKED handoff, отметить только выполненные IDs; sync/archive/apply вне этой lane.

## UI-FIX-1 — QG AUTO-01 и точечное покрытие (профиль: Frontend)

Ownership: только `ui/MetricaCounterStep.test.tsx`, `ui/YandexAccountStep.test.tsx` и необходимые локальные test helpers в SEO; production/config/timeouts/workers unchanged. Назначено пользователем после QG REWORK, без Planner.

- [x] UI-FIX-1.1 Устранить стоимость FT-UI-11 test composition/async, сохранив pending guards и success/error assertions; не увеличивать timeout и не снижать параллельность.
- [x] UI-FIX-1.2 Дополнить FT-UI-13/15: network exception с непустыми search/offset, сохранение контекста, GET retry без автоматического POST.
- [x] UI-FIX-1.3 Выполнено отдельным согласованным unit UI-FIX-2: исправить и покрыть [FT-UI-06](<design.md#test-matrix>) overlapping pages/dedup в `hooks/useYandexAccounts.ts`. Stable-ID merge сохраняет existing-first и порядок новых аккаунтов; cursor = offset + raw items.length, total из payload без пересчёта по unique. Проверены дубли внутри/между страницами, duplicate-only page, error/retry cursor, refresh/empty/OAuth reset0, локальность dedup между mounts, однократный selection и сброс выбранного аккаунта при unlink. API/service/DTO/popup/permissions/config unchanged.
- [x] UI-FIX-1.V Выполнить целевые SEO tests и минимум два успешных последовательных штатных `npm test`, scoped read-only lint при необходимости; передать evidence/ограничения тому же QG для targeted recheck.

Verification UI-FIX-1 (финальное дерево): targeted V2 + accounts — 76 pass / 4 files; два последовательных `npm test` без worker/timeout overrides — 793 pass / 83 files каждый (45.04s и 44.94s), [полный прогон 1](</tmp/refine-yandex-seo-ui-ui-fix-1-full-11.log>), [полный прогон 2](</tmp/refine-yandex-seo-ui-ui-fix-1-full-12.log>). Scoped ESLint обоих изменённых tests — 0 errors / 0 warnings; `npx tsc --noEmit --incremental false` — exit 0. Build не повторялся: test-only diff, production/API/config unchanged.

AUTO-01: не deadlock deferred POST, а суммарная стоимость whole-page composition, последовательных user-event pointer checks и повторного вычисления accessible names всех кнопок AntD modal через `getByRole`. Первоначальный isolated FT-UI-11 — 3065ms; промежуточный split без caching всё ещё воспроизводил timeout на полном suite. Финальная композиция — реальный wizard/target/MSW, контролируемый account slot (whole flow с реальными accounts остаётся в FT-UI-16), только локальное отключение decorative motion; native controls найдены один раз с assertions accessible names. Pending/error-context и terminal Back/reopen разделены на независимые scenarios без удаления assertions. В финальных full runs guard scenario — 1454/1422ms, lifecycle — 2218/1629ms. FT-UI-13/15 добавлены отдельные GET/POST network exceptions с search=example/offset40, GET retry без auto-POST; OAuth success/closed после append проверяют offset0/replacement. Единственный остаток — product gap dedup из UI-FIX-1.3; не маскировать зелёным suite и не расширять production scope без Router.

## UI-FIX-2 — FT-UI-06 stable-ID dedup (профиль: Frontend)

Согласованный split UI-FIX-1 → выполненные 1.1/1.2/V + UI-FIX-2 (закрывает checkbox UI-FIX-1.3). Ownership: `hooks/useYandexAccounts.ts`, близкие SEO tests и точечный tasks; исправление предусмотренной FT-UI-06 функциональности, без расширения scope. Production diff: чистый локальный merge по account.id, без общего cache; offset0 использует пустую базу, append сохраняет существующие записи. Raw cursor/limit20/payload total и request/permission/mutation guards не изменены. Поиск у аккаунтов отсутствует и не добавлялся.

Verification UI-FIX-2: до исправления 5 новых regressions падают ([red](</tmp/refine-yandex-seo-ui-ui-fix-2-red.log>)); после — targeted accounts/counters/wizard/card/popup **95 pass / 5 files** ([лог](</tmp/refine-yandex-seo-ui-ui-fix-2-targeted.log>)); полный штатный `npm test` **800 pass / 83 files**, 44.43s ([лог](</tmp/refine-yandex-seo-ui-ui-fix-2-full-2.log>)). Первый полный прогон: 799 pass, один сторонний timeout VK clipboard ([лог](</tmp/refine-yandex-seo-ui-ui-fix-2-full.log>)); в исходном тесте уже есть TODO flaky, изолированный повтор — pass 2126ms ([лог](</tmp/refine-yandex-seo-ui-ui-fix-2-vk-isolated.log>)), затем весь suite прошёл без изменений кода/settings. Scoped `npx eslint src/features/seo/hooks/useYandexAccounts.ts src/features/seo/ui/YandexAccountStep.test.tsx` — exit0, без diagnostics ([лог](</tmp/refine-yandex-seo-ui-ui-fix-2-lint.log>)); `npx tsc --noEmit --incremental false` — exit0 ([лог](</tmp/refine-yandex-seo-ui-ui-fix-2-tsc.log>)). Команды последовательны, workers/timeouts/CI не переопределялись. Scoped static review: нет API/consumer/page-query imports. Build и QG в этом unit не запускались: единый targeted recheck всех fixes тем же QG-FE-AUTO, затем manual — после handoff Router; production hook требует актуализации build/runtime этим gate. Коммитов и shipctl нет.

## Workflow follow-up

- PLAN-UI-1 заканчивается созданием артефактов и status/strict validate; все реализационные checkbox остаются пустыми. Approval gate показывает Router, apply сейчас не запускать.
- После реализации и общего QG устранить согласованные findings владельцем A; после APPROVED Router проводит sync двух delta specs, повторную strict validation и archive нового change по разрешённому workflow.
- Старый архив не редактировать; git/tooling и dirty_worktree старой финализации остаются за границами change, не добавлять workaround-коммиты/ветки/env.
