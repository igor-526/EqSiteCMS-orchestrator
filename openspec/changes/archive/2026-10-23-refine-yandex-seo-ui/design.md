# Проектирование уточнения интерфейса SEO Яндекса

Задача: [098](<../../../docs/tasks/098_yandex_frontend.md>), уточнение PLAN-UI-1. Дата: 2026-10-23. Сервис: CMS frontend. Change: `refine-yandex-seo-ui`.

## Context

Мотивация — [proposal](<proposal.md#why>). Текущее поведение подтверждено чтением компонентов/hooks и их тестов, а не повторным запуском прежнего QG:

- [SeoPage.tsx](<../../../services/frontend/src/features/seo/ui/SeoPage.tsx>) использует AntD Tabs с собственной `renderTabBar`: две кнопки-сегмента. [Тест страницы](<../../../services/frontend/src/features/seo/ui/SeoPage.test.tsx>) закрепляет grid/DOM этой панели; эти implementation-assertions нужно заменить, не ослабляя keyboard и tab/panel assertions. Forbidden section с `tabIndex=0` — сохранённая защита keyboard-scroll.
- [Визард](<../../../services/frontend/src/features/seo/ui/ConnectionWizardModal.tsx>) хранит account и step, требует «Далее», размонтируется при закрытии. [Шаг аккаунтов](<../../../services/frontend/src/features/seo/ui/YandexAccountStep.tsx>) содержит явный Empty и AntD List с его собственной пустой заглушкой, отдельные кнопки выбора/отвязки и баннер `oauth.waiting`.
- [Шаг счётчиков](<../../../services/frontend/src/features/seo/ui/MetricaCounterStep.tsx>) требует выбор и отдельную привязку. [Hook счётчиков](<../../../services/frontend/src/features/seo/hooks/useMetricaCounters.ts>) валидирует payload и имеет синхронный `submitting` ref, но читает selectedCounter из state — нельзя просто вызвать старые select и bind подряд.
- [Hook аккаунтов](<../../../services/frontend/src/features/seo/hooks/useYandexAccounts.ts>) уже защищает delete/selection, обновляет связь и список. [Popup hook](<../../../services/frontend/src/features/seo/hooks/useYandexOAuthPopup.ts>) уже проверяет origin/type/source/status, фокусирует открытое окно, опрашивает closed и защищает параллельный запуск. [Конфигурация цели](<../../../services/frontend/src/features/seo/wizardTargets.ts>) сохраняется расширяемой.

По переданному handoff прежняя реализация: frontend 765 pass, backend 1706 pass / 5 skip, controlled browser 27 pass / 0 fail на трёх viewport. Это исторические данные, не evidence нового change. Реальная авторизация в Яндексе не проверена без учётки. Архив не перечитывался и не изменяется. Незакоммиченный baseline на main и блокер `shipctl plan: dirty_worktree` принимаются как есть: git/tooling не ремонтировать.

## Goals / Non-Goals

**Цель:** убрать лишние подтверждения выбора, привести вкладки к реальному CMS-паттерну и получить доступные компактные строки при прежней безопасности.

**Не цели:** API/DTO, backend/peers/NATS/БД, consumer-контур, env/config, новые зависимости, глобальный дизайн или contrast, rollout ESLint по другим фичам, завершение старого release. Кнопка входа «Привязать» на [карточке](<../../../services/frontend/src/features/seo/ui/MetricaConnectionCard.tsx>) и подтверждение удаления её связи сохраняются.

## Decisions

### 1. Канонические вкладки и локальный мобильный адаптив

Конкретные эталоны:

- [SiteSettingsTabs.tsx:27–30](<../../../services/frontend/src/features/siteSettings/ui/SiteSettingsTabs.tsx#L27-L30>): обычный AntD `Tabs`, `items`, controlled `activeKey/onChange`, без кастомного tab bar.
- [NotificationsPage.tsx:55–72](<../../../services/frontend/src/features/notifications/ui/NotificationsPage.tsx#L55-L72>): тот же компонент, содержимое в `items.children`; это ближайшая композиция для SEO.

Общего Tabs-wrapper в `src/ui` нет. Reuse — непосредственно `Tabs` из установленного `antd`, не импорт внутреннего компонента другой feature и не создание новой общей библиотеки. Удалить SeoTabBar/renderTabBar; применить controlled activeKey и стандартный underline/ink-bar. Адаптив оставить локально в [seoStyles.ts](<../../../services/frontend/src/features/seo/ui/seoStyles.ts>): две вкладки должны умещаться в доступной ширине, при необходимости переносится label, не используется панель primary/default кнопок.

Известный axe-блокер не игнорировать: стандартный overflow может добавлять доступную more-button внутрь tablist. Для двух фиксированных вкладок выбрать локальную раскладку nav-list с двумя сжимаемыми tab и скрыть **только в SEO** ненужный `.ant-tabs-nav-operations` через `display:none`, а не просто пустой icon/`aria-hidden` на фокусируемом элементе. Уменьшить/обнулить лишние mobile gutters, обеспечить читаемость и min-width:0, обе вкладки не должны теряться за transform/overflow. Проверить реальный DOM и axe на 390px после resize с desktop и при изначальном mobile viewport. `more={{icon:null}}` само по себе не устраняет button и не считается решением. Не делать DOM surgery, не менять библиотеку, не чинить другие страницы. Это локальная настройка стандартного паттерна, а не новая tab bar. Сохранить доступное имя tablist и связи tab/tabpanel, клавиатурный переход и видимый фокус. Старые grid-specific assertions заменить поведенческими.

### 2. Компактные строки вместо deprecated List

Выбран элемент: семантический `ul/li` + AntD `Button` основной области строки, растянутый на доступную ширину, визуально нейтральный/текстовый; и отдельный sibling AntD icon-button `DisconnectOutlined` справа у аккаунтов. Строка-контейнер не имеет onClick. Нет вложенных button, clickable div и имитации listbox для немедленных действий. Это действия, поэтому обычные native button semantics и Enter/Space корректнее radio/listbox. Вспомогательные стили — `antd-style`, не новая зависимость.

Имя/логин/email аккаунта компактно группируются в основной и вторичной строке; длинные значения переносятся, недостающие данные имеют прежние безопасные fallback, DTO `display_name: string` не меняется. У счётчика показываются номер и сайт. Видимый focus, читаемые accessible names, target около 44px по высоте, отсутствие overlap с иконкой важнее жёсткого количества строк. Название действия иконки — «Отвязать аккаунт <логин>» (tooltip как дополнение, не единственный label). Активация основной области и иконки тестируется отдельно мышью и клавиатурой. Shared для этого узкого change не вводится: одинаковый локальный style-контракт применяется к обоим шагам.

### 3. Навигация аккаунта и одно пустое состояние

Визард принимает выбор `account | null`: ненулевой account атомарно сохраняется и переключает step=1; null сбрасывает выбор, не продвигает визард. «Назад» только меняет step=0 и сохраняет account; отсутствие effect «есть account → step 2» исключает немедленный обратный переход. Повторное нажатие прежней строки снова открывает цель. Удалить «Далее» полностью. При смене шага фокус переводится на заголовок/основной контент шага, после «Назад» — на выбранный аккаунт, если он есть. Повторное открытие — чистый первый шаг.

Иконка вызывает только openConfirmation: без onSelect, без перехода, без DELETE до подтверждения. Сохраняются cascade warning, запрет двойного DELETE, ошибки и refresh. Список `ul` при нуле данных не рендерит вторую заглушку; остаётся верхний Empty и добавление. Кнопка «Обновить аккаунты» вне запроса удаления — сохраняется. При OAuth убирается только info Alert, внутреннее waiting и guards остаются; «Добавить аккаунт» не блокируется одним waiting, иначе потеряется focus popup.

### 4. Активация счётчика — явная mutation с аргументом

Изменить внутренний hook-контракт на `bindCounter(counterId)` (идентификатор активированной строки), валидировать `{yandex_account_id: account.id, counter_id: String(counterId)}` прежней схемой. Не использовать последовательность `setSelectedCounter(id); bindCounter()` и не запускать POST из effect/наблюдения selection. Локальное состояние последней попытки допустимо только для pending/error оформления; оно не является источником устаревшего payload.

Синхронный ref-lock берётся до async boundary; повторный вызов, включая другую строку до rerender, ничего не отправляет. Непосредственно перед POST проверяется актуальный ADMIN. До завершения pending блокируются все строки, поиск/clear, pagination, «Назад», «Отмена», mask/Escape/close модального окна. Межшаговый контракт расширяется callback `onPendingChange(boolean)` для цели; визард хранит busy и блокирует навигацию/закрытие. UI-1 вводит этот интерфейс, UI-2 подключает pending hook и тестирует lifecycle; после terminal result busy снимается, после успеха вызывается onDone ровно один раз. Размонтирование/закрытие не оставляет busy при повторном открытии. Программный onDone по успешной mutation не блокируется busy.

На ошибке mutation не закрывать визард и не очищать account/список/search/offset, показать safe error, разрешить осознанный повтор активацией строки после pending; никаких автоматических retries POST. При `401` сохраняется существующая глобальная политика reauth: локальный hook не объявляет успех и не закрывает модалку самостоятельно. Успех — существующие onDone/completeWizard и reload карточки. Отдельные кнопки выбора, привязки, постоянного обновления счётчиков удаляются. В load-error Alert допускается «Повторить загрузку»: это только GET, не восстановленная постоянная кнопка и не автоматическая привязка. Loading блокирует активацию устаревших строк.

### 5. Access policy unchanged

Endpoints, методы, payload/response DTO и серверные статусы **unchanged**, новой access matrix нет. Sensitive Yandex GET остаются protected, все writes protected, ADMIN-only без role override. UI сохраняет guards, а frontend-тесты проверяют anonymous/authenticated/отзыв permissions/401/403. Ни consumer Public Read, ни прямые peer-запросы не используются. Pagination остаётся limit/offset; в UI допустим номер страницы, в запросах запрещён новый page/pageSize.

## Execution units

### Deliverables и ownership

- **A — Frontend SEO**, один владелец-профиль Frontend: только перечисленные ниже SEO UI/hooks/tests, оба delta specs как контракт (не редактировать в runtime). UI-1 и UI-2 строго последовательны из-за общего wizard/styles/test flow. Разрешены новые близкие `*.test.tsx`/hook tests в этой feature, но не изменение API/service/DTO и соседних фич.
- **B — Quality Gate**, профиль Quality Gate, без runtime-правок: scoped evidence в `.qa/refine-yandex-seo-ui/<lane>/`; только SYNTH владеет единым будущим [отчётом](<../../../docs/reports/>) `refine-yandex-seo-ui.md`. Findings возвращаются владельцу A. Каждый unit отмечает только собственные checkbox в [tasks](<tasks.md>).
- Planner владеет артефактами текущего change до approval; sync/main specs и archive — последующие действия Router, не runtime ownership исполнителя.

Точные пути и contextFiles расписаны в [tasks](<tasks.md#execution-units>); базовый префикс SEO — `services/frontend/src/features/seo/`.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| UI-1 | Frontend | A | `ui/{SeoPage,ConnectionWizardModal,YandexAccountStep,seoStyles}.*`, их тесты; `hooks/useYandexOAuthPopup.test.tsx` | approval | targeted Vitest FT-UI-01..07 |
| UI-2 | Frontend | A | `hooks/useMetricaCounters.ts`, `ui/MetricaCounterStep.*`, близкие integration tests; shared wizard/styles только при необходимом завершении UI-1 контракта | UI-1 | targeted Vitest FT-UI-08..16 |
| QG-ENV | Quality Gate | B | `.qa/refine-yandex-seo-ui/env/` | UI-2 | готовность актуального CMS runtime |
| QG-FE-AUTO | Quality Gate | B | `.qa/refine-yandex-seo-ui/auto/` | QG-ENV | npm test/lint, tsc, build, coverage review |
| QG-CONTRACTS | Quality Gate | B | `.qa/refine-yandex-seo-ui/contracts/` | QG-ENV | scoped diff/spec/access/ownership |
| QG-FE-MANUAL | Quality Gate | B | `.qa/refine-yandex-seo-ui/manual/` | QG-FE-AUTO, QG-CONTRACTS | M-01..10, 3 viewport, Playwright + axe |
| QG-FORMAT | Quality Gate | B | `.qa/refine-yandex-seo-ui/format/` | QG-FE-MANUAL | scoped frontend gate без clean-worktree |
| QG-SYNTH | Quality Gate | B | единый отчёт `docs/reports/refine-yandex-seo-ui.md` | QG-FORMAT | единый вердикт по всем lanes |

UI-1: около 9 существенных действий (tabs, адаптив, account rows, unlink semantics, empty, navigation/busy contract, три группы tests). UI-2: около 8 (bind hook, guards, counter rows, GET retry, busy integration, pagination regression, errors, happy-path integration). В каждом одна группа verification — targeted Vitest; общий frontend gate только в QG. При превышении 12 содержательных действий — circuit breaker, handoff partial и split до следующего invocation, не героическая реализация всего deliverable.

```text
approval → UI-1 → UI-2 → QG-ENV ─┬→ QG-FE-AUTO ──┐
                                └→ QG-CONTRACTS ─┴→ QG-FE-MANUAL → QG-FORMAT → QG-SYNTH
```

`QG-BE` неприменимо — Python diff отсутствует. `QG-LIVE` неприменимо — runtime API diff отсутствует; browser controlled requests относятся к manual QA, не backend smoke. PostgreSQL discovery не требуется: backend smoke в этом change не планируется. Все lanes одного общего QG запускаются после обоих UI units, а не между ними.

## Test matrix

Все FT — Vitest/Testing Library с MSW или service mocks; live backend в unit/component/API-boundary запрещён. Новые selectors опираются на role/access name, не текст старых отдельных кнопок. Команды запускаются из `services/frontend`.

- **V1:** `npm test -- src/features/seo/ui/SeoPage.test.tsx src/features/seo/ui/ConnectionWizardModal.test.tsx src/features/seo/ui/YandexAccountStep.test.tsx src/features/seo/hooks/useYandexOAuthPopup.test.tsx`
- **V2:** `npm test -- src/features/seo/ui/MetricaCounterStep.test.tsx src/features/seo/ui/MetricaConnectionCard.test.tsx src/features/seo/ui/ConnectionWizardModal.test.tsx` (добавить новые hook/integration tests, если выделены).
- **VA:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

| ID / Area | Behavior diff / сценарий delta | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| FT-UI-01 / SEO tabs | стандартный tabs, default Metrica, переключение Webmaster без новых API; корректные tab/panel и keyboard | component, убрать grid-specific asserts; browser axe отдельно | ADMIN | V1 |
| FT-UI-02 / route | anonymous redirect; forbidden focus/keyboard-scroll; zero Yandex calls без ADMIN | existing route/auth tests + component, browser M-02 | anonymous, ADMIN, отсутствие ADMIN, SUPERUSER, DEVELOPER | V1, существующий auth suite в VA |
| FT-UI-03 / accounts | data/loading/одна empty/error/retry/interaction; длинные данные; без List duplicate Empty | минимум 5 component cases | ADMIN; missing permission скрывает/блокирует actions и GET | V1 |
| FT-UI-04 / navigation | клик/Enter/Space строки → шаг 2, нет «Далее»; Back хранит выбор, null не продвигает; reopen reset; custom target | component wizard + account integration, перенос focus | ADMIN | V1 |
| FT-UI-05 / unlink | click/Enter/Space иконки не вызывает onSelect и шаг 2, warning, cancel, confirmed DELETE, double-submit, refresh, 404 | component/hook; минимум open/cancel/success/error/pending | ADMIN, revoked ADMIN, denied 401/403 | V1 |
| FT-UI-06 / accounts pagination | initial limit20 offset0; append по loaded count; refresh и OAuth reset0, без дубликатов | hook/API-boundary регрессия | ADMIN | V1 |
| FT-UI-07 / popup | отсутствие waiting Alert; focus без нового GET/popup, guard parallel open; success/closed reset0; block/error/cancel/retry; origin/type/source/status guards, cleanup | hook + account component; сохранить существующие assertions, поменять только баннер | ADMIN; missing/revoked ADMIN, link 401/403 | V1 |
| FT-UI-08 / bind argument | немедленный POST с ID активированной строки и account ID, без state race; смена строки после ошибки использует новый ID | hook/API-boundary success, edge, error | ADMIN | V2 |
| FT-UI-09 / counter list | data/loading/empty/error/callback; click/Enter/Space связывают по одному разу; прежних трёх кнопок нет | минимум 5 component cases + permission | ADMIN и missing ADMIN | V2 |
| FT-UI-10 / double-submit | быстрые активации той же/другой строки до rerender → один POST; pending снимается terminal result | hook синхронные вызовы + deferred component | ADMIN | V2 |
| FT-UI-11 / pending navigation | все строки, поиск/clear, pagination, Back/Cancel/Escape/mask/close заблокированы; завершение разблокирует; reopen не busy | wizard integration | ADMIN | V2 |
| FT-UI-12 / access | отсутствующая/отозванная ADMIN не вызывает bind; disabled UX, safe 401/403 без success/onDone; GET denial | минимум 4 permission tests | anonymous/page block; ADMIN present/missing/revoked; SUPERUSER/DEVELOPER не override | V2, VA |
| FT-UI-13 / validation/errors | некорректный ID → no POST; 400/422 validation, generic/network, 404 и 401/403 → тот же шаг/account/search/offset; один новый POST только после повторной активации | hook + API-boundary, без авто retry | ADMIN; backend denial | V2 |
| FT-UI-14 / counters pagination | initial limit20 offset0; page3→offset40; size50→offset0; API без page/pageSize | hook + pagination component, четыре случая вместе с FT-UI-15 | ADMIN | V2 |
| FT-UI-15 / search | debounce299/300, trim/clear, reset offset0 без stale-page GET; load error retry делает только GET | hook + component | ADMIN, disabled pending/missing permission | V2 |
| FT-UI-16 / whole flow | карточка «Привязать» → account activation → counter activation → 1 POST → close → карточка refresh ровно один раз; отвязка карточки по-прежнему confirm-only | MSW integration с реальным target + card regression | ADMIN | V2 |
| FT-UI-17 / callback | существующий callback StrictMode 1 POST; source guard и отсутствие ложного success при denied | существующие callback tests без расширения runtime scope | ADMIN, non-ADMIN, 401/403 | VA |
| FT-UI-18 / architecture | не импортировать peer/consumer; API через прежние feature services; никаких новых endpoints/DTO/page query | scoped static review и existing service tests | protected CMS, policy unchanged | VA + static checks ниже |

Account page-size/filter/search отсутствуют — соответствующие проверки неприменимы, не добавлять их ради общей матрицы. Counter sort/filter, кроме поиска, отсутствуют; size/search reset покрыты FT-UI-14..15.

Static self-check (совпадения анализировать по scope, не исправлять соседние фичи):

```bash
rg -n 'fetch\(|axios' services/frontend/src -g '*.{ts,tsx}'
rg -n "from ['\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'
rg -n '\bpage\b|pageSize|page_size' services/frontend/src/features/seo services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'
rg -n 'site-ad|site-\*|Public Read|public read' services/frontend/src -g '*.{ts,tsx}'
```

Проверить отсутствие новых shared/widgets/entities через glob/список директорий. QG-FORMAT scoped frontend: не требует чистого worktree, не стирает прошлую реализацию. Если AUTO уже выполнил VA для того же дерева, FORMAT ссылается на этот evidence вместо дублирования test/build без изменений; при изменении файлов повторяет затронутую проверку.

## Manual QA steps (UI тестирование)

Профиль QG-FULL, lane QG-FE-MANUAL выполняет агент, не пользователь. Предусловия: актуальная CMS frontend сборка опубликована в существующий runtime, известен реальный CMS BASE_URL (не DSH GUI 3080), тестовые ADMIN и non-ADMIN, безопасные controlled fixtures account/counter и MSW/Playwright interception. Для успешного controlled flow не менять реальные чужие аккаунты; удалить только созданные тестовые данные. Не выдавать mock flow за реальную OAuth-авторизацию.

Viewport: desktop **1440×900**, tablet **768×1024**, mobile **390×844**. M-01, M-03..06, M-10 выполнить на всех трёх; security/error M-02, M-07..09 минимум desktop и mobile. Scripted Playwright из frontend, screenshots и визуальная инспекция, console/network и axe на странице/обоих шагах/confirm; один итоговый scripted JSON и evidence по шагам/viewport.

| ID | URL / предусловие | Действия | Ожидаемый результат |
|---|---|---|---|
| M-01 | `/seo`, ADMIN | сравнить вкладки с `/site-settings` и `/notifications`; Metrica → Webmaster → назад; повторить клавиатурой; resize desktop→390 и отдельная загрузка на 390 | обычные underline tabs, обе достижимы, корректные tab/panel, Webmaster без запросов; нет `aria-required-children`, overlap, overflow страницы |
| M-02 | `/seo`, logout / non-ADMIN | открыть URL без сессии, затем с SUPERUSER/DEVELOPER без ADMIN, Tab/scroll forbidden | anonymous→login; forbidden фокусируется и скроллится клавиатурой, zero Yandex requests; ADMIN видит интерфейс |
| M-03 | `/seo`, connection null, accounts empty | «Привязать» → шаг аккаунта | одна верхняя empty hint, нет нижней заглушки; «Добавить аккаунт» доступно, «Далее» отсутствует; кнопка входа карточки сохранена |
| M-04 | accounts с длинными именем/login/email и null email | активировать строку мышью, затем отдельно Enter/Space после Back; повторно выбрать прежний аккаунт, закрыть/reopen | компактный читаемый ряд, сразу шаг цели; Back сохраняет выбор, focus корректен, reopen шаг1 без выбора; нет лишнего «Выбрать» |
| M-05 | accounts fixture | click и keyboard на unlink справа; cancel; повторить confirm с delayed response | только warning confirm, step1 и account selection не меняются; cancel no DELETE; confirm один DELETE, pending disabled, success refresh списка/карточки; не трогать реальный аккаунт |
| M-06 | шаг2, controlled counters | активировать счётчик кликом; повторить отдельными прогонами Enter/Space; delayed POST и два быстрых клика по разным строкам; попытаться Back/close/Escape | один POST с правильным ID; pending видим и блокирует действия/закрытие; после success close, success notification и карточка с нужным счётчиком; отсутствуют три удалённые кнопки |
| M-07 | шаг2: >20 counters | страница3, size50, поиск, очистка; GET error→«Повторить загрузку», empty response | limit/offset правильны, size/search/clear reset0 после 300мс, page-параметров нет; retry только GET и только в error; empty один |
| M-08 | шаг2, controlled POST errors | 400/422, 502/network, 404, 401/403; не трогать UI после ошибки, затем активировать строку | safe message, no onDone/ложного success; account/список/search/offset сохранены в локальном шаге (при глобальном 401 reauth — прежняя auth policy); автоматического POST нет, после ручного retry ровно одна попытка |
| M-09 | ADMIN permissions изменяются при открытом wizard | отозвать ADMIN перед bind/unlink/add; отдельно backend denial | действия hidden/disabled, hook no mutation, denial surfaced; не считать SUPERUSER/DEVELOPER ADMIN; чужие ресурсы не обходятся через UI |
| M-10 | шаг1 OAuth, controlled popup | add → повторный add; wrong origin/type/source/status; valid success; открыть заново и закрыть вручную; blocked popup/error/cancel | нет waiting баннера; повторный add фокусирует то же окно без GET; чужие сообщения ignored, success/closed refresh offset0; errors/retry сохранены, callback StrictMode1POST по AUTO |

Browser runtime из handoff (не менять env/config файлов):

```bash
LD_LIBRARY_PATH=/tmp/eqsitecms-browser-runtime/root/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=/srv/eqSiteCMS/.cache/ms-playwright \
node <scripted-qa-entry>
```

Модуль playwright брать из frontend. Точный scripted entry и BASE_URL обнаруживает QG по штатным `stack-control`/`ui-qa`; новый сервер вместо существующего не поднимать. Реальный вход в Яндекс без учётки остаётся непроверенным external-flow ограничением, controlled lifecycle обязателен. QG-отчёт содержит passed/failed по шагам и viewport, paths screenshots/traces, axe/console, для failed API — status/body без токенов/code. Pre-existing global contrast фиксировать отдельно, не чинить и не маскировать новые SEO violations.

## Risks / Trade-offs

- Стандартный Tabs возвращает mobile axe-блокер → локальная двухвкладочная раскладка без accessible overflow controls, browser axe + визуальная проверка обязательны, не принимать только JSDOM.
- Немедленный POST упрощает UX, но повышает риск ошибочного double-click → ref-lock, disabled pending и явный ID аргумент; подтверждение привязки не добавлять против запроса пользователя.
- Размонтирование во время POST → busy-контракт блокирует пользовательский выход и Back; terminal/error снимает busy, успешное onDone работает независимо от close guard.
- Иконка отвязки может конфликтовать с основным действием → sibling buttons, контейнер без selection handler, отдельные mouse/keyboard assertions.
- Старые тесты закрепляют устаревшие кнопки → переписать assertions по поведению, сохранить coverage guards/ошибок, не удалять тесты безопасности ради зелёного прогона.

## Migration Plan

После approval: UI-1 → UI-2 → единый QG-FULL. Релиз не требует миграций/новых env. Rollback — возврат только frontend UI-diff этого change, без удаления незакоммиченного baseline и без backend/data rollback. После APPROVED Router проводит sync только двух delta specs, strict validation и archive по отдельному разрешённому workflow; прежний архив не меняется. Git/shipctl dirty_worktree не решается этим планом и не является задачей UI/QG. Сейчас только артефакты, apply не запускать.

## Open Questions

Критических открытых вопросов нет. Выбраны defaults: AntD Tabs с локальным mobile адаптивом; ul/li + sibling AntD buttons; GET retry только при ошибке; навигация и закрытие блокируются на pending привязки. Эти решения не требуют дополнительного ожидания пользователя внутри PLAN-UI-1; approval gate показывает Router.
