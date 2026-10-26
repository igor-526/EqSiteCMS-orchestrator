# Design — SEO frontend

- **Тикет:** [100](<../../../docs/tasks/100_seo_frontend.md>).
- **Дата:** 2026-10-24.
- **Изменяемый сервис:** `services/frontend`; backend и seo-service исследованы только как контракт.
- **Change:** `seo-frontend`; после реализации — единый `QG-LITE` с отдельным browser unit.
- **Gate:** это план, не разрешение реализации. До явного approval пользователя apply запрещён.

## Context

Мотивация — [proposal](<proposal.md#why>). Активных релевантных changes нет (`openspec list --json`); 098/099 завершены, поэтому создан отдельный change.

### Подтверждённый контекст и gaps

| Источник | Наблюдение и значение для плана |
|---|---|
| [Исходная задача](<../../../docs/tasks/100_seo_frontend.md>) | Требуются две таблицы и нормализация, без расширения SEO-аналитики |
| [SeoPage](<../../../services/frontend/src/features/seo/ui/SeoPage.tsx>) и [route](<../../../services/frontend/src/app/(protected)/seo/page.tsx>) | Сейчас только две вкладки; page — тонкий shell. Разрешение ADMIN проверяется до рендера содержимого |
| [Registry SEO](<../../../services/frontend/src/features/seo/hooks/useSeoScopes.ts>) | Локальные actions → ADMIN; без наследования повышенных ролей |
| [Backend routes](<../../../services/backend/src/api/seo.py>) и [DTO](<../../../services/backend/src/clients/seo_service/schemas.py>) | Уже есть необходимые восемь операций и два неиспользуемых PATCH; `items/total`, нет tenant из браузера |
| [Proxy service](<../../../services/backend/src/core/services/seo_proxy.py>) | Списки страниц/запросов имеют search/ordering/limit/offset; настройки — list_all без query-параметров |
| [Настройки нормализации](<../../specs/seo-page-normalization-settings/spec.md>) и [параметры](<../../../services/seo-service/src/core/services/blacklisted_query_param_service.py>), [хеши](<../../../services/seo-service/src/core/services/blacklisted_hash_service.py>) | Полный список правил, точные значения, trim и ограничения; изменения не переписывают страницы |
| [Listing spec](<../../specs/seo-entity-listing/spec.md>) | Единственный search по значению, только ordering page/query с минусом; даты не сортируются и не фильтруются |
| [MainTable](<../../../services/frontend/src/ui/MainTable.tsx>) и [NewsTable](<../../../services/frontend/src/features/news/ui/NewsTable.tsx>) | Small table, header filterDropdown, server sort, pagination=false; исторический prop `сolumns` содержит кириллическую букву |
| [TablePaginator](<../../../services/frontend/src/ui/TablePaginator.tsx>), [constants](<../../../services/frontend/src/lib/constants.ts>) | Общий контрол использует limit/offset; размеры 10/25/50/100. Его setter не сбрасывает offset при смене размера — нужен feature adapter, не правка primitive |
| [StringFilter](<../../../services/frontend/src/ui/filters/StringFilter.tsx>) | Trim каждого нажатия мешает многословному query. Использовать локальный controlled Input в header dropdown, trim только при сериализации; generic primitive не менять |
| [ConfirmActionModal](<../../../services/frontend/src/features/seo/ui/ConfirmActionModal.tsx>) | Подходящее существующее отдельное подтверждение с pending/error; переиспользовать без Яндекс-специфичного каскадного предупреждения |
| [API client](<../../../services/frontend/src/api/client.ts>) | apiFetch сохраняет ApiResult, обрабатывает refresh, 204; HTTP status не возвращает. Нельзя изобретать status-aware поведение в hooks или распознавать статус по тексту |
| [Существующая UI spec](<../../specs/cms-seo-yandex-ui/spec.md>) | Мобильный сценарий исторический; delta заменяет только требование вкладок на актуальный desktop contract |

Исторический [design 099](<../archive/2026-10-24-seo-service-queries-pages/design.md>) — контекст, не чеклист реализации. Runtime в PLAN-1 не запускался; доступность развернутого API и визуальное поведение предстоит проверить после реализации. Фактический backend access подтверждён кодом и [контрактом proxy](<../../specs/seo-backend-proxy/spec.md>), не перенесён из намерений задачи.

## Goals / Non-Goals

**Goals:** переиспользовать принятые CMS controls; сохранить цепочку page → UI → hooks → feature service → API; явно различить серверную пагинацию данных и локальную пагинацию правил; проверить доступ и ошибки.

**Non-Goals:** backend/peer изменения, новые endpoints/scopes, PATCH UI, resolve/import/seed, редактирование страниц/запросов, сортировка дат, wildcard-правила, массовое удаление, статистика, перенормализация старых страниц, рефакторинг UI-kit/API client, mobile/tablet.

## Decisions

### D1. Слои и файлы

Новые контракты в `src/types/api/seo.ts`: DTO страниц, запросов, blacklist item/body, `items/total`, query с union допустимого ordering; тип коллекции правил и filter/domain types — тоже в `src/types`, не внутри hooks/UI. Пригодные существующие generic-типы переиспользовать.

`src/api/seo.ts` — восемь thin операций apiFetch с путями `/seo/...` (base URL уже включает `/api`), query через addQueryParamsToUrl, ID через encodeURIComponent. В blacklist GET нет limit/offset/search/ordering. `src/features/seo/services/seoDataService.ts` сохраняет ApiResult; mapping server sort и нормализация search принадлежат feature service/hook. Никаких прямых API imports в UI, raw fetch вне client и заимствования `site-*` кода.

`src/features/seo/validators/normalization.ts` — Zod schema для обоих видов правил. Расширить существующий [registry](<../../../services/frontend/src/features/seo/hooks/useSeoScopes.ts>) действиями LIST_PAGES, LIST_QUERIES, LIST_NORMALIZATION, CREATE_NORMALIZATION, DELETE_NORMALIZATION → только ADMIN. Hook проверяет права перед чтением и перед mutation; при отзыве ADMIN перестаёт показывать данные/принимать ответы старых запросов. Новых backend scopes нет.

Альтернатива отдельной feature или маршрутов отклонена: общий SEO-контекст уже существует. Общие primitive-файлы остаются read-only.

### D2. Две таблицы с независимым состоянием

`useSeoDataTable.ts` управляет двумя независимыми наборами `searchDraft/search/ordering/limit/offset/items/total/loading/error`, активирует чтение только для посещённого разрешённого таба. Состояние сохраняется до ухода с `/seo`; прямые API calls из обработчиков UI запрещены. Один hook может обслуживать оба ресурса с фиксированным типизированным resource discriminator; не превращать это в общую table framework.

`SeoDataTable.tsx` собирает MainTable для обоих ресурсов, `SeoPagesPanel.tsx`/`SeoQueriesPanel.tsx` — тонкие feature containers. [SeoPage](<../../../services/frontend/src/features/seo/ui/SeoPage.tsx>) добавляет keys `pages`, `queries`; default `metrica`, порядок прежних вкладок сохраняется. Смысл aria-label расширить до «SEO», не «Сервисы Яндекса».

Колонки: «Страница» (`page`) / «Запрос» (`query`) и «Создано» (`created_at`, принятый формат DD.MM.YYYY HH:mm). Значение — текст с ограничением ширины и tooltip полного значения, без ссылки на выдуманный домен, UUID — key. Дата display-only. В value header — controlled Input в filterDropdown, очистка и sorter. Причина локального Input вместо StringFilter — подтверждённый trim-on-keystroke; оформление и фильтр-иконка как у NewsTable.

Debounce 300 мс в hook, не в компоненте: draft не теряет пробелы при вводе, search сериализуется после trim, пустой параметр отсутствует; clear немедленный с отменой таймера. Сервер выполняет literal substring search, клиент не добавляет `~*`, `%` или regex. Явный sort adapter принимает только `page/-page` или `query/-query`; clear удаляет ordering (сервер возвращается к created_at DESC). Sort/filter/size → offset=0. Начально limit=25, offset=0, варианты PAGE_SIZES. Setter adapter к TablePaginator сбрасывает offset при смене limit, обычный page change сохраняет `(page-1)*limit`.

Над таблицей только TablePaginator. «Нормализация» находится в tabBarExtraContent строки SEO-вкладок **только при активном pages**; не в filtersElements и не в панели пагинации. Так одновременно выполняются требования «кнопка на Страницах» и «сверху только пагинация».

Ошибки и повтор GET видимы отдельно от empty. При сокращении total и пустой странице с offset>0 hook один раз вычисляет последнюю валидную страницу и перечитывает. Request generation/cleanup отсекает поздние ответы и отозванный permission; ошибки также подчиняются generation. Не менять тип MainTable: legacy prop использовать только на boundary call site, не вводить новый primitive и не распространять его в новых props.

### D3. Нормализация: list_all с локальной страницей

`usePageNormalization.ts` хранит состояние открытой модалки, коллекции `hashes/params`, input/errors, локального `{limit:10, offset:0}`, выбранного `{kind,id,value}`, pending и поколений GET/mutation. `PageNormalizationModal.tsx` и `NormalizationList.tsx` — представление. [ConfirmActionModal](<../../../services/frontend/src/features/seo/ui/ConfirmActionModal.tsx>) — второе модальное окно, а не Popconfirm/browser confirm.

При открытии — «Хеш», чистый input/ошибки/selection, запрос полного списка активной коллекции. При смене вкладки — input/selection/error/offset сбрасываются, список нужного типа загружается; при закрытии поколение инвалидируется. Pagination AntD small с фиксированным size=10, без size changer: slice полного items, total=items.length; переход страницы **не вызывает GET**. Сортировка value ASC сохраняется по серверной выдаче; никакой локальной фильтрации правил сверх пользовательского запроса не добавляется. Риск полного ответа принят в пределах существующего API; серверную пагинацию нельзя добавить незаметно.

Над списком input и icon-only плюс справа (aria-label «Добавить …»); Enter равнозначен плюсу. Элементы small, значение занимает доступную ширину и не перекрывает иконку с aria-label «Удалить …». Подсказка: это точные исключаемые значения, изменения применяются при последующем сохранении, старые страницы не меняются. Нет seed/пересчёта/маски `utm_*`.

Zod: trim, у hashes удалить **один** ведущий #, непусто, длина ≤255 Unicode code points (не UTF-16 code units), пробельные/control категории Cc/# запрещены; у params дополнительно & = ?. Регистр не менять; `!/catalog?x=1` — валидный hash. POST передаёт только value, DELETE только тип коллекции и ID. Синхронный ref lock до первого await плюс pending UI блокирует двойную отправку, обе mutation actions, input, вкладки, пагинацию и закрытие основной модалки; отдельное подтверждение тоже не закрывается в pending.

После 201: очистить input, перейти на первую страницу, учесть canonical item из ответа и перечитать активный список. После 204: убрать item, закрыть только подтверждение, исправить offset при опустевшей последней странице, перечитать. Если mutation успешна, но GET упал — отдельно показать ошибку обновления, повторять только GET. Не сохранять ложную ошибку mutation, не делать повторный POST/DELETE автоматически.

Альтернатива server-side pagination отклонена: backend её не поддерживает; альтернатива скрыть пагинацию не выполняет задачу. Редактирование через PATCH намеренно не используется.

### D4. Access/error boundary без изменения общего клиента

Нормативные статусы — в матрице ниже. Shared apiFetch не отдаёт HTTP code hooks: не добавлять локальный raw fetch/дублированный client и не рефакторить глобальный ApiResult. Для 400/409/403/502 достаточно безопасного backend error/нейтрального текста без интерпретации HTML/объектов; форма остаётся. 401 проходит общий refresh/login; сохранение модалки не обещается при обязательном logout. MSW проверяет реальные статусы на API boundary, component tests — соответствующие ApiResult и UX.

Для DELETE error hook сохраняет подтверждение и сообщает «Не удалось удалить элемент. Возможно, он уже отсутствует», затем делает только фоновый GET активной коллекции (не DELETE). Это покрывает 404 без распознавания статуса по тексту: если выбранного ID больше нет, повторное подтверждение disabled до отмены, список/offset сверены. Другие ошибки не теряют input и контекст; успешного удаления не объявлять. Отображение ошибок не должно рендерить сырой body как HTML или падать на detail-array.

### D5. Verification и жизненный цикл

Без runtime API diff, миграций и NATS выбран QG-LITE: единый gate начинается после FE-3, unit QG делает автоматические/контрактные проверки и черновую часть единственного отчёта; затем QG-FE-MANUAL проверяет браузер и ставит итоговый вердикт в том же отчёте. Backend code/tests, самостоятельный QG-LIVE и DB smoke неприменимы — потребляемый API не меняется. Browser flow использует существующий backend, без записи SQL и без парсеров/resolve в CMS. Для access matrix API ответы тестируются MSW на всех восьми операциях; browser дополнительно подтверждает auth/permissions и CRUD на своих временных правилах.

После APPROVED/APPROVED_WITH_WAIVER Router выполняет разрешённые пользователем sync specs → strict validation → archive и штатную финализацию. Это оркестрация, не дополнительный мелкий execution unit; до approval плана ни один apply task не выполняется. Findings возвращаются владельцу соответствующей зоны; QG перепроверяет изменённую область, не вводит параллельного владельца frontend-файлов.

## API-контракт

| Ресурс | Запрос | Ответ/семантика |
|---|---|---|
| Страницы | GET /api/seo/pages, search?, ordering=page/-page?, limit, offset | 200 `{items:[{id,page,created_at}],total}` |
| Запросы | GET /api/seo/search-queries, search?, ordering=query/-query?, limit, offset | 200 `{items:[{id,query,created_at}],total}` |
| Правила обоих видов | GET /api/seo/page-normalization/blacklisted-hashes или blacklisted-query-params, **без query** | 200 `{items:[{id,value,created_at}],total}`; весь список, value ASC |
| Добавление | POST на коллекцию, `{value:string}` | 201 canonical `{id,value,created_at}` |
| Удаление | DELETE коллекция/{item_id} | 204 без тела |

Дата — ISO datetime от backend. Default API list limit=20, но UI явно отправляет 25; clamp backend 1..100 и offset≥0 не заменяет клиентские корректные параметры. Страницы/запросы не содержат метрик, домена, source и updated_at в DTO. Batch resolve у backend нет. PATCH правила существует, но не вызывается.

## Access matrix

Tenant определяется `actor.equestrian_id`, frontend не отправляет X-Equestrian-Id и не выбирает конюшню. У peer missing/invalid selector → 401, но это внутренний контракт: backend нарушение отображает 502, не browser auth 401. Прямой peer исключён из browser flow. Причина каждого GET-исключения: внутренние административные SEO-данные и настройки, не публичный контент. SUPERUSER/DEVELOPER без ADMIN → 403.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/pages` | Protected GET exception | только ADMIN | 401 | 200; без ADMIN 403; неверный query 400; ошибка peer 502 |
| GET | `/api/seo/search-queries` | Protected GET exception | только ADMIN | 401 | 200; без ADMIN 403; неверный query 400; ошибка peer 502 |
| GET | `/api/seo/page-normalization/blacklisted-hashes` | Protected GET exception | только ADMIN | 401 | 200; без ADMIN 403; ошибка peer 502 |
| GET | `/api/seo/page-normalization/blacklisted-query-params` | Protected GET exception | только ADMIN | 401 | 200; без ADMIN 403; ошибка peer 502 |
| POST | `/api/seo/page-normalization/blacklisted-hashes` | Protected Write | только ADMIN | 401 | 201; без ADMIN 403; невалидное значение/тело 400; дубль 409; ошибка peer 502 |
| POST | `/api/seo/page-normalization/blacklisted-query-params` | Protected Write | только ADMIN | 401 | 201; без ADMIN 403; невалидное значение/тело 400; дубль 409; ошибка peer 502 |
| DELETE | `/api/seo/page-normalization/blacklisted-hashes/{item_id}` | Protected Write | только ADMIN | 401 | 204 без тела; без ADMIN 403; malformed ID 400; чужой/отсутствующий 404; ошибка peer 502 |
| DELETE | `/api/seo/page-normalization/blacklisted-query-params/{item_id}` | Protected Write | только ADMIN | 401 | 204 без тела; без ADMIN 403; malformed ID 400; чужой/отсутствующий 404; ошибка peer 502 |

Новые endpoints/access exceptions не вводятся. Трассировка всех строк — UT-SEO-01..04, дополнительно UI UT-SEO-11,15..16 и M01..M03,M09..M10. Foreign ID — mock backend contract 404, не попытка доказать tenant isolation frontend-тестом; источник реальной серверной гарантии — существующая backend spec.

## Deliverables и ownership

| Deliverable | Владелец | Разрешённые изменения | Исключения |
|---|---|---|---|
| A — SEO CMS | Frontend | `src/types/api/seo.ts`, `src/api/seo.ts`, `src/api/seo.test.ts`, SEO feature новые hooks/services/validators/UI/tests; существующие useSeoScopes/его tests и SeoPage/его tests; при необходимости локальный seoStyles | Все пути относительно services/frontend; общие primitives, client, другие features, backend/peer/site-* не менять |
| B — единый Quality Gate | Quality Gate | Единственный итоговый `docs/reports/seo-frontend.md`; evidence `.qa/seo-frontend/**` | Отчёт последовательно QG → QG-FE-MANUAL, не параллельно; продуктовый код не менять |
| P — контракт | Planner до approval, Router lifecycle после gate | Артефакты этого change, затем только sync затронутых двух capabilities | Исполнители не переписывают утверждённые specs; tasks checkbox отмечает только текущий unit |

## Execution units

Пути таблицы — от `services/frontend/src`, кроме отчёта QG. В одном unit один slice, ~8–10 существенных действий с grouped tests, одна verification group. Units одного frontend ownership идут последовательно; параллельных product units нет.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| FE-1 | Frontend | A | types/api/seo, api/seo (+test), feature services/seoDataService (+test), validators/normalization (+test), useSeoScopes (+test) | approval | targeted Vitest UT-SEO-01..06 + scoped lint/typecheck |
| FE-2 | Frontend | A | hooks/useSeoDataTable (+test), ui/SeoDataTable (+test), SeoPagesPanel, SeoQueriesPanel, SeoPage (+test), локальные table styles | FE-1 | targeted Vitest UT-SEO-07..11 + scoped lint/typecheck |
| FE-3 | Frontend | A | hooks/usePageNormalization (+test), ui/PageNormalizationModal (+test), NormalizationList (+test), SeoPage integration (+test), локальные modal styles | FE-2 | full frontend test/lint/typecheck/build, UT-SEO-12..17 |
| QG | Quality Gate | B | отчёт; .qa/seo-frontend/qg/** | FE-3 | QG-LITE: frontend auto + contracts review |
| QG-FE-MANUAL | Quality Gate | B | тот же отчёт; .qa/seo-frontend/browser/** | QG | M01..M12, 1366×768; итоговый вердикт |

DAG:

```text
approval пользователя → FE-1 → FE-2 → FE-3 → QG → QG-FE-MANUAL
                                                     ↓
                       Router: sync → validate → archive/finalize (по gates)
```

Точечные `contextFiles` для каждой сессии — в [tasks](<tasks.md#execution-units>). Если до делегирования оценка превышает бюджет, Router делит unit, не расширяет invocation. Handoff и отметка фактически завершённых tasks входят в unit, не отдельные запуски.

## Test matrix

Тесты UT — Vitest/Testing Library + MSW и mock services, fail-on-unhandled-request; live backend в UT запрещён. Новые тесты рядом с API/hook/UI/validator, общий test setup не переписывать. Нормативные сценарии — [данные](<specs/cms-seo-data-ui/spec.md>) и [вкладки](<specs/cms-seo-yandex-ui/spec.md>).

| ID / Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| UT-SEO-01 / api + service | DTO, пути, сериализация 8 операций | API-boundary success для каждого метода; items/total, пустой список, canonical item, 204=null; body только value, blacklist GET без query, ID encoded; no selector/peer URL | authenticated ADMIN, tenant не из UI | targeted api/seo.test + seoDataService.test |
| UT-SEO-02 / errors | Отказы не становятся success | Параметризовать все 8 операций: MSW 401 с refresh success/retry и refresh denial; 403; 502/сеть; применимые 400/409/404; безопасное отображение detail-array | anonymous/session expired и authenticated non-ADMIN | targeted api/seo.test |
| UT-SEO-03 / API contracts | Списки не изобретают возможностей | limit/offset/search/ordering whitelist/clear, page/pageSize отсутствуют в query; 400 invalid ordering/query как error; literal спецсимволы закодированы URL, не transformed | ADMIN | targeted api/service tests |
| UT-SEO-04 / tenant | Чужое удаление | DELETE foreign ID mock 404 для обоих видов, selector в браузерном request отсутствует; код не обращается к peer | ADMIN A, foreign B | targeted api/seo.test |
| UT-SEO-05 / scopes | Явные новые действия | scope present, missing, только SUPERUSER/DEVELOPER, обновление permissions после rerender, action map; чтение без ADMIN не запускается | anonymous/authenticated scopes | useSeoScopes.test + service mocks |
| UT-SEO-06 / validators | Валидация правил | Оба вида: trim, пусто/#/##, 255/256 code points в том числе astral, whitespace/control, запреты params, допустимый hash !/catalog?x=1; регистр не меняется | Запрет запроса при невалидном вводе | normalization.test |
| UT-SEO-07 / filter | Поиск только header | ≥4: apply 300мс, clear/trim/empty, timer отменяется, offset reset; ввод нескольких слов; нет второй панели поиска | ADMIN | useSeoDataTable.test + SeoDataTable.test |
| UT-SEO-08 / sort | Явный adapter | Asc/desc/clear для каждого ресурса, invalid field не отправляется, controlled indicator, offset reset; date не сортируется | ADMIN | hook + table tests |
| UT-SEO-09 / pagination | Серверные таблицы | ≥4: initial 25/0, page change, size change reset, filter/sort reset; total из ответа, correction пустой последней страницы | ADMIN | hook + table tests |
| UT-SEO-10 / table states | Отображение двух ресурсов | ≥5 на вариант: data/loading/empty/error/interaction; отсутствие CRUD; long value; stale success/error игнорируются, состояния табов независимы | scope present/missing, revoke ADMIN | hook + table tests |
| UT-SEO-11 / route | Новые вкладки, старые flow | Protected route anonymous redirect с mock auth, ADMIN четыре вкладки/default Метрика, non-ADMIN forbidden без SEO/Yandex вызовов, keyboard tab/panel; Webmaster без запросов | anonymous/ADMIN/non-ADMIN | SeoPage.test + existing SEO regressions |
| UT-SEO-12 / local lists | Нормализация list_all | ≥5: data/loading/empty/error/interaction; >10 items, local page без GET, switch/open reset, late response ignored | ADMIN, missing scope не грузит | usePageNormalization.test + NormalizationList.test |
| UT-SEO-13 / create modal | POST через plus/Enter | ≥5: open/close, valid submit, client validation, backend error 400/409/502, success refresh; ошибка GET после 201 отдельно и без повторного POST | ADMIN; forbidden guard | hook + PageNormalizationModal.test |
| UT-SEO-14 / delete modal | Отдельное подтверждение | ≥5: open/cancel без DELETE, correct ID+kind, 204 refresh, 404 reconcile/clamp, failure сохраняет контекст; ошибка GET после 204 не повторяет DELETE | ADMIN; foreign 404 по матрице | hook + modal/list tests |
| UT-SEO-15 / permissions | Protected Write UX | ≥4 на action: scope present, scope missing hidden/disabled, hook no-call guard, сервер 401/403 как ошибка/auth flow; отозванный ADMIN перед отправкой | anonymous/session expired, ADMIN, non-ADMIN | hook + modal component tests |
| UT-SEO-16 / concurrency | Двойная отправка | plus/Enter, confirm двойной клик ≤1 mutation; tabs/input/page/close disabled pending, unlock после ошибки, selected kind не меняется; delete error revalidates GET only | ADMIN, backend denial | hook + modal tests |
| UT-SEO-17 / integration | Полный SEO flow и регрессии | Страницы→нормализация→create/delete, обе коллекции, список страниц не изменяется после правил; Метрика и Вебмастер работают как прежде; no site-* mixing | ADMIN | component flow + существующие SEO tests |
| M01..M12 / browser | Live UX и layout | Отдельный browser unit по шагам ниже, happy-path smoke frontend flow, не pytest и не live UT | anonymous/ADMIN/non-ADMIN | scripted Playwright + визуальная инспекция |

Verification FE-1/2: `npm test -- <назначенные test paths>`, scoped ESLint назначенных путей, `npx tsc --noEmit` из `services/frontend`. FE-3 и QG: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` из `services/frontend`. Полный suite исполнителя — один раз в FE-3; QG повторяет независимо. Проблемы вне scope не исправлять, передать baseline/gap.

QG также выполняет self-check с классификацией совпадений только в diff (page — допустимое имя SEO domain field, не признак page-based pagination):

```bash
rg -n 'fetch\(|axios' services/frontend/src -g '*.{ts,tsx}'
rg -n "from ['\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'
rg -n '\bpage\b|pageSize|page_size' services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'
rg -n 'site-ad|site-\*|Public Read|public read' services/frontend/src -g '*.{ts,tsx}'
rg -n 'type .*Dto|interface .*Dto|type .*Query|interface .*Query' services/frontend/src -g '*.{ts,tsx}'
```

Дополнительно проверить отсутствие новых каталогов shared/widgets/entities через glob, отсутствие API imports в feature UI и сортировки даты. Найденные старые нарушения — не разрешение повторять их, но не повод расширять scope.

## Manual QA steps (UI тестирование)

**Предусловия:** только desktop viewport **1366×768**; существующий CMS URL окружения (обозначение `CMS_BASE_URL`, не новый сервер), route `/seo`; подготовленные ADMIN A, non-ADMIN (включая SUPERUSER/DEVELOPER без ADMIN), anonymous browser context. Данные страниц/запросов берутся из существующего tenant или согласованных fixtures, желательно >25 строк; правила >10 при проверке локальной пагинации. Не добавлять resolve/import UI и не менять backend ради фикстур. Сетевые отказы можно воспроизвести browser interception, явно отметив mock в evidence; хотя бы create/delete happy path — реальный существующий API. Browser-агент использует ui-qa/browser-qa протокол. Если runtime/data недоступны, фиксирует blocked-env, не заявляет PASS.

| ID | Действия в браузере | Ожидаемый результат |
|---|---|---|
| M01 | Anonymous: открыть CMS_BASE_URL/seo; отдельно проверить перехваченные 401 на потребляемых операциях | Protected layout → /login; без ложных данных/успеха; общий refresh/login не зациклен |
| M02 | Войти ADMIN A, открыть /seo, переключить четыре вкладки мышью и клавиатурой | Default Метрика, прежняя привязка не сломана; Вебмастер — заглушка; Страницы/Запросы содержат таблицы; корректные tab/panel и focus |
| M03 | Non-ADMIN, в том числе повышенные роли без ADMIN: меню и прямой /seo; отдельно mock отказ 403 после открытия ADMIN | Нет доступа/запросов без ADMIN; при backend denial видимый отказ без mutation success; иконки/кнопки guarded |
| M04 | На Страницах и Запросах в value header ввести многословный search с пробелами, %, _, очистить; перейти на следующую страницу до фильтра | Только header search, debounce 300мс, literal URL params, offset=0; нет поиска/сортировки над таблицей |
| M05 | На обоих табах включить asc/desc/clear, page change и size change; переключить табы и вернуться | ordering только разрешённый; date без controls; вверху только paginator; limit/offset корректны, size/filter/sort reset, состояния независимы |
| M06 | Проверить long query/URL, loading, empty, failed GET и повтор; быстро изменить фильтр | Нет overlap и перепутанных stale results; полный текст доступен; ошибка не маскируется empty; повтор GET корректен |
| M07 | На Страницах открыть Нормализация, переключить Хеш/Параметры, пролистать >10 правил, закрыть и открыть | Кнопка вне paginator; input+plus выше компактного списка, удаление справа; API list_all без query, локальная page без GET, reopen reset |
| M08 | В обеих коллекциях добавить уникальные временные qa-правила; проверить пустое/#/длинное/пробелы/запрещённые символы и hash !/catalog?x=1; Enter и плюс | Zod блокирует неверное до запроса; valid 201 обновляет только нужный список, input чистый, page=1; старые страницы неизменны |
| M09 | Для POST воспроизвести duplicate409, validation400, forbidden403, expired401, network/502; дважды быстро нажать плюс/Enter; ошибка refresh GET после 201 | Сохранение ввода при mutation error (кроме logout), нет дублей; pending блокирует контекст; success mutation и refresh error различимы, retry только GET |
| M10 | Иконка удаления→отмена; затем подтверждение; удалить последний item последней локальной страницы; 404/403/502, двойной confirm, refresh error после 204 | Без подтверждения DELETE нет; удаляется выбранный ID/kind; после успеха основной modal открыт, pagination clamp; при error нет ложного успеха/автоDELETE, есть сообщение и GET reconciliation |
| M11 | Клавиатурой открыть/закрыть filter dropdown, основную модалку и отдельное подтверждение; проверить длинные элементы, tooltip, доступные имена и z-index | Focus trap/return и Esc корректны, pending закрытие запрещено; при 1366×768 нет overlap таблицы, tab action, input, иконок, pagination, обоих modal; body/dialog scroll предсказуем |
| M12 | Удалить только созданные QA правила API/UI, вернуться к Метрике/Вебмастеру; проверить network | Регрессий старого SEO flow нет, нет site-* imports/peer calls/tenant selector; собрать результаты M01..M12, screenshots ключевых состояний и network status/body ошибок без секретов |

Evidence только `.qa/seo-frontend/browser/**`; итог passed/failed/blocked по каждому шагу и ссылки в единственном будущем `docs/reports/seo-frontend.md`. Layout/error/permission findings требуют screenshot, API findings — очищенный status/body. Mobile/tablet не запускать и findings по ним не заводить.

## Risks / Trade-offs

- **Полный ответ правил может расти** → локальная пагинация выполняет запрос без изменений backend; при проблеме объёма отдельная задача серверной пагинации, не скрытый scope change.
- **Общий клиент не сохраняет HTTP code** → D4: общий error UX и reconciliation DELETE без code branching; MSW фиксирует статусы на boundary. Глобальный refactor исключён.
- **Legacy primitive quirks** → узкий call-site adapter, не массовая миграция MainTable/TablePaginator/StringFilter.
- **Production isolation peer не доказана задачей UI** → наследуемое ограничение [каталога сервисов](<../../../SERVICES.md#10-seo-service-servicesseo-service>); frontend не меняет сеть и не выдаёт production security approval.
- **Нехватка runtime/данных** → QG указывает blocked-env и необходимые fixture-предусловия, не пишет ложный PASS.

## Migration Plan

Изменений БД, backend и ENV нет. После пользовательского approval выполнить FE units, один QG-LITE, затем Router sync/validate/archive и штатные release gates. Rollback — вернуть только frontend diff этого change и пересобрать существующий frontend; записи правил — обычные пользовательские настройки, автоматически не удаляются. Backend 099 обязателен до развёртывания UI; при его недоступности видимый GET error вместо скрытого fallback к peer.

## Решения на approval и открытые вопросы

План уже выбирает: локальную pagination правил, только value/date колонки, только value search/sort, кнопку в tab bar. Требуется approval всего этого варианта; если пользователь хочет server pagination правил, date filters или дополнительные метрики — это изменение scope и пересмотр плана, не оставленный выбор исполнителю.

Блокирующих неизвестных API нет. Отложенный организационный вопрос: какие существующие ADMIN/non-ADMIN сессии и tenant fixtures использовать для browser QA? Это не меняет specs/units; определить перед QG-FE-MANUAL без записи секретов в артефакты. Apply до approval не начинать.
