# Design — inlove-site-header-footer

**Тикет:** `docs/tasks/069_inlove_site_header_footer.md`  
**Дата:** 2026-09-10  
**Сервис:** `services/site-ksk-inlove`

## Context

После change `inlove-equestrian-site-init` сервис представляет нейтральный Next.js 15 starter: сохранены API client/types, site-settings provider и callback service, но `/` возвращает технический `404`, `src/ui/` отсутствует. Источники истины — карта `scheme.md`, каталог `components.md` и дизайн-протокол `site-ksk-inlove-design.md` с точечным чтением релевантных разделов `design_system_specification.md`.

Change создаёт первый presentation layer, но не реализует реальный контент страниц из задач 070/071. Локальный gitignored `.env` уже указывает `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api`; это используется только для будущего browser QA и не превращается в tracked fallback. Существующие callback wrapper/service и DTO подтверждают контракт `POST /callback_requests`; backend, БД и NATS не меняются.

Промежуточная заметка задачи от 2026-09-10 фиксирует rework уже реализованного shell и callback. Завершённые checkbox сохраняются как история; новые требования исполняются отдельными unchecked units до возобновления оставшихся `BQA-02`/`BQA-06` и Quality Gate.

## Goals / Non-Goals

**Goals:**

- реализовать полный переиспользуемый UI-каталог из `components.md` через semantic tokens INLOVE;
- создать семь SSR placeholder routes с общей оболочкой и route metadata;
- загрузить shared `site_settings` один раз в server layout, безопасно разобрать значения и предоставить fallbacks;
- реализовать доступные desktop/mobile header/footer и одну Zod callback form для любого CTA;
- закрепить consumer access boundary, responsive/a11y states и проверяемое качество.
- заменить текстовый fallback в штатном состоянии header/footer статическим клубным logo, сгруппировать service routes в «Услуги», синхронизировать компактный footer и его три contact channels;
- убрать route/page information из callback UI и итогового `comment`, не меняя DTO и endpoint.

**Non-Goals:**

- реальная композиция и CMS-данные страниц задач 070/071;
- новые routes, detail pages, backend endpoints, миграции, seed, NATS или CMS frontend;
- изменение `scheme.md`, `components.md`, дизайн-спецификации, `.helm/**`, `.github/**`, deployment identity или `services.manifest`;
- отправка CMS cookie/token и использование CMS-only endpoints.

## Decisions

### 1. UI каталог разделяется по назначению, но экспортируется через стабильные boundaries

`src/ui/` получает подкаталоги `foundations`, `atoms`, `controls`, `navigation`, `feedback`, `media`, `cards`, `sections` и локальные barrel exports. Page composition остаётся в `src/app`/последующих features. Это сохраняет контракты `components.md` и позволяет bounded units без монолитного файла. Альтернатива — собрать всё в одном UI-файле — отклонена из-за ownership, тестируемости и будущего переиспользования.

Tokens размещаются в `src/ui/foundations` и подключаются из `globals.css`; шрифты загружаются штатным Next.js font mechanism с системным serif/sans fallback. Компоненты используют CSS Modules либо согласованный локальный styling mechanism, но не дублируют raw palette по файлам.

### 2. Shared settings — server-first adapter с безопасным parsing

Существующий `getSiteSettings` отражает старые generic keys и требует расширения/адаптера для ключей `site.short_name`, `header.*`, `footer.*`, `contacts.*`, `social.*`, `callback.*`, `seo.default_*`. Server layout делает один `siteSettingList({key: [...]})`, валидирует `type`/JSON для object settings, фильтрует menu по allowlist семи routes и создаёт serializable view model. Client provider получает уже нормализованные данные только для интерактивных header/modal частей.

Ошибка всего запроса превращается в fallback model; ошибка одного key не заражает остальные. Ни server, ни client code не подставляет stand/prod URL или чужой tenant. Альтернатива client-only fetch отклонена: она скрывает shell/metadata до hydration и нарушает SSR-first.

### 3. Root layout владеет shell и единым modal controller

`app/layout.tsx` рендерит server shell и передаёт настройки в небольшой client boundary (`SiteChrome`/callback controller), необходимый для mobile menu, определения active route и открытия modal. Header/footer DOM и fallback content присутствуют в SSR HTML; интерактивность является progressive enhancement.

Mobile menu и modal имеют независимые focus traps, scroll lock и возврат focus. Одновременно открыт только один overlay. Sticky CTA реализуется как переиспользуемый компонент, но на placeholder pages не обязан показываться; при открытом modal он всегда скрыт.

### 4. Placeholder routes используют один server component factory без динамической карты URL

Каждый из семи route получает явный `page.tsx` для прозрачного App Router routing и route-specific static/dynamic metadata. Общий `UnderConstructionPage` обеспечивает ровно один `h1` и сообщение. Неизвестные пути остаются штатным `404`. Альтернатива catch-all route отклонена: она могла бы ошибочно обслуживать неутверждённые страницы.

### 5. Callback form расширяет существующий integration layer, не меняя API

`zod` задаёт единственную runtime/client schema. Consent хранится рядом с form state, но исключается из DTO. Context formatter может дописывать только предметный контекст service/tariff/horse к `comment` с учётом лимита 2000; текущий route/page не показывается в modal и не добавляется в payload. Existing `sendCallBackRequest`/`callBackRequestCreate` остаются transport boundary.

Form state machine: `idle → pending → success`, а validation/`4xx` возвращает редактируемое состояние с сохранёнными значениями; network/`5xx` добавляет retry. `401` показывает configuration error без login. Pending блокирует повторный submit. Альтернатива создавать новый server action/API route отклонена как лишний proxy и изменение существующего access boundary.

### 6. Компоненты каталога создаются сейчас, data orchestration — позднее

Cards/sections получают typed props и все visual/state variants, но не вызывают API сами. Их component tests используют локальные fixtures/mocks. Это исполняет задачу 069 и не захватывает CMS composition задач 070/071.

### 7. Промежуточный shell rework использует уже доступные source assets

Статическим logo-источником является подтверждённое клубное изображение `docs/parsings/ksk.inlove/media/yandex/logo.jpg`: оно переносится в `public/` под нейтральным стабильным именем, без изменения исходника. Компонент `Logo` рендерит asset в штатном состоянии с доступным именем ссылки и сохраняет документированный текстовый fallback только для ошибки загрузки. Light/dark presentation обеспечивает контраст, clear space и размеры дизайн-системы без изменения самого бренда.

Header группирует ровно три разрешённых route `/uslugi/zanyatiya`, `/uslugi/progulki`, `/uslugi/postoy` под trigger «Услуги». Dropdown доступен кнопкой, клавиатурой и `Escape`, отмечает активность при любом дочернем route и не создаёт нового URL. Footer отражает ту же информационную архитектуру, но может показывать группу компактным вложенным списком без интерактивного dropdown.

Три contact glyph берутся не из Tilda, а из уже реализованного на главной `ContactSection`: phone, VK и Instagram. Их следует вынести/переиспользовать через общий icon boundary, чтобы header/footer/home не получили расходящиеся копии. Все кликабельные footer contacts (`maps/address`, phone, VK, Instagram) открываются с `target="_blank" rel="noopener noreferrer"`; часы работы остаются обычным текстом. Видимая social label для VK нормализуется к `VK`.

## Детали реализации

Ожидаемые зоны:

- `src/ui/foundations/**`, `src/app/globals.css` — tokens, container, section, typography;
- `src/ui/atoms/**`, `controls/**`, `feedback/**`, `media/**`, `cards/**`, `sections/**` — каталог компонентов;
- `src/ui/navigation/**`, `src/features/siteChrome/**`, `src/app/layout.tsx` — shared shell;
- `public/**`, `src/ui/atoms/**`, `src/ui/navigation/**` — статический logo, общий contact icon boundary, dropdown и компактный footer rework;
- `src/features/siteSettings/**` — нормализованный shared settings adapter/provider;
- `src/features/callBackRequest/**`, существующие `src/api/callBackRequest.ts`, `src/types/callBackRequest.ts` — form schema/controller на текущем transport;
- `src/app/page.tsx` и шесть явных route pages — placeholders/metadata;
- colocated `*.test.ts(x)` и test setup — component/API-boundary проверки.

Схема БД, backend API и NATS: изменений нет. `zod` добавляется в `package.json`/lockfile. Любые другие новые runtime-зависимости требуют отдельного обоснования в handoff.

## Access matrix

Change не изменяет backend endpoint, но UI использует следующие существующие строки:

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `GET` | `/api/site_settings?key=...` | Public Read + tenant selector | нет | `200` с корректным selector; `401` missing/invalid selector | CMS auth не требуется и не отправляется |
| `POST` | `/api/callback_requests` | Public POST exception + tenant selector | нет | `201` valid; `400/422` invalid payload; `401` missing/invalid selector | CMS auth не требуется, не отправляется и не меняет outcomes |

Причина POST-исключения: посетитель публичного сайта должен оставить запрос на звонок до какой-либо аутентификации. Tenant selector — non-secret identity hint; `401` является ошибкой конфигурации сайта. Для GET и POST запрещены CMS cookie/Authorization и fallback на другой tenant.

## Deliverables и ownership

| Deliverable | Профиль-владелец | Ownership | Результат |
|---|---|---|---|
| A — UI system | Site Consumer | `src/ui/foundations/**`, `atoms/**`, `controls/**`, `feedback/**`, `media/**`, `cards/**`, `sections/**`, `app/globals.css` | полный каталог и semantic tokens |
| B — shared shell | Site Consumer | `src/ui/navigation/**`, `src/features/siteChrome/**`, shared часть `src/features/siteSettings/**`, `app/layout.tsx` | SSR header/mobile/footer/settings fallback |
| C — callback experience | Site Consumer | callback UI/controller/schema/tests в `src/features/callBackRequest/**`; точечные transport types/tests | единый доступный modal и public POST flow |
| D — placeholder routes | Site Consumer | route `page.tsx`/metadata и общий placeholder component | семь SSR страниц, неизвестные routes 404 |
| E — verification | Site Consumer / Quality Gate | tests/config read-write только исполнителю; QG read-only, `docs/reports/**` у synthesis | automated/browser evidence и единый verdict |
| F — intermediate-note rework | Site Consumer | `public/**`, logo/contact icons в `src/ui/atoms/**`, `src/ui/navigation/**`, точечно shared settings и callback feature/tests | logo/menu/footer/contact/callback corrections без backend diff |

Tightly-coupled shared файлы (`globals.css`, barrel exports, `layout.tsx`) имеют одного deliverable-owner и меняются последовательно. Execution unit не получает право менять соседние deliverables.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| `ILUI-SC-1` | Site Consumer | A | `src/ui/foundations/**`, `atoms/**`, `controls/**`, `app/globals.css`, UI barrels | — | targeted render tests + `npx tsc --noEmit` |
| `ILUI-SC-2` | Site Consumer | A | `src/ui/feedback/**`, `media/**`, `cards/**`, UI barrels | `ILUI-SC-1` | targeted component tests + `npx tsc --noEmit` |
| `ILUI-SC-3` | Site Consumer | A | `src/ui/sections/**`, UI barrels | `ILUI-SC-2` | targeted section tests + `npx tsc --noEmit` |
| `ILSHELL-SC-1` | Site Consumer | B | shared settings adapter/provider tests, `src/ui/navigation/**`, `src/features/siteChrome/**`, `app/layout.tsx` | `ILUI-SC-1` | shell/settings tests + `npx tsc --noEmit` |
| `ILCB-SC-1` | Site Consumer | C | callback schema/helpers/form/modal/controller/tests, package manifests | `ILUI-SC-1`, `ILSHELL-SC-1` | callback/API-boundary tests + `npx tsc --noEmit` |
| `ILPAGE-SC-1` | Site Consumer | D | seven route pages, shared placeholder, metadata tests | `ILSHELL-SC-1` | route/render tests + production build |
| `ILVERIFY-SC-1` | Site Consumer | E | verification-only; test fixes only in owned test/config paths | `ILUI-SC-3`, `ILCB-SC-1`, `ILPAGE-SC-1` | `npm test`, lint, typecheck, build, static scans |
| `ILNOTE-SHELL-SC-1` | Site Consumer | F | `public/**`, logo/contact icon boundary в `src/ui/atoms/**`, `src/ui/navigation/**`, точечно shared settings/tests | `ILVERIFY-SC-1` | targeted shell/home tests + `npx tsc --noEmit` |
| `ILNOTE-CB-SC-1` | Site Consumer | F | `src/features/callBackRequest/**` | `ILVERIFY-SC-1` | targeted callback tests + `npx tsc --noEmit` |
| `ILQA-SC-1` | Site Consumer | E | verification-only | `ILNOTE-SHELL-SC-1`, `ILNOTE-CB-SC-1` | browser steps `BQA-01..10` на local API |
| `QG-FE` | Quality Gate | E | read-only site diff | `ILQA-SC-1` | tests/lint/typecheck/build + UI/a11y review |
| `QG-BE` | Quality Gate | E | read-only `services/backend/src/main.py` observability startup fix | `ILQA-SC-1` | targeted backend tests/review; lane already passed |
| `QG-CONTRACTS` | Quality Gate | E | read-only specs/tasks/diff | `ILQA-SC-1` | strict OpenSpec + access/ownership conformance |
| `QG-LIVE` | Quality Gate | E | live verification only; runtime files read-only | `QG-BE`, `QG-FE`, `QG-CONTRACTS` | backend startup/health and existing site API reachability |
| `QG-SYNTH` | Quality Gate | E | `docs/reports/**` | `QG-BE`, `QG-FE`, `QG-CONTRACTS`, `QG-LIVE` | единый `APPROVED`/`REWORK` report |
| `OPS-SYNC` | Router/OpenSpec | — | main specs | `QG-SYNTH=APPROVED` | sync + strict validation |
| `OPS-ARCHIVE` | Router/OpenSpec | — | change archive | `OPS-SYNC` | archive + final validation |

`QG-BE` и `QG-LIVE` применимы только к явно разрешённому вне исходного site scope исправлению запуска observability в `services/backend/src/main.py`: `QG-BE` проверяет кодовый diff, `QG-LIVE` — что backend стартует и отвечает после исправления. Это не добавляет backend feature/API requirements к change 069. Параллельные backend/news изменения change 070 и несвязанные изменения `docs/**` исключаются из gate 069 по явной атрибуции пути/коммита, а не считаются неизменными.

## DAG зависимостей

```text
ILUI-SC-1 ─┬→ ILUI-SC-2 → ILUI-SC-3 ───────────────┐
           └→ ILSHELL-SC-1 ─┬→ ILCB-SC-1 ─────────┤
                            └→ ILPAGE-SC-1 ────────┴→ ILVERIFY-SC-1 ─┬→ ILNOTE-SHELL-SC-1 ─┐
                                                                    └→ ILNOTE-CB-SC-1 ────┴→ ILQA-SC-1
                                                                                              ├→ QG-FE ─────────┐
                                                                                              ├→ QG-BE ─────────┤
                                                                                              └→ QG-CONTRACTS ──┴→ QG-LIVE → QG-SYNTH → OPS-SYNC → OPS-ARCHIVE
```

После завершённого automated gate новые units `ILNOTE-SHELL-SC-1` и `ILNOTE-CB-SC-1` независимы и могут выполняться параллельно: первый владеет shell/assets, второй — callback feature. `ILQA-SC-1` возобновляется только после обоих handoff; затем параллельны `QG-FE`, `QG-BE` и `QG-CONTRACTS`. `QG-LIVE` начинается после трёх code/contracts lanes и проверяет только startup/health исправленного backend и достижимость уже существующих site API; затем выполняется synthesis.

## Test matrix

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| `CT-ILUI-01` | component | foundations | token/container/typography variants | semantic classes/tokens, корректная семантика heading | UI tests |
| `CT-ILUI-02` | component | controls | button/field loading, disabled, error | accessible name/state, aria links, double action blocked | controls tests |
| `CT-ILUI-03` | component | states | loading/empty/error/success feedback | локальное состояние, live region/alert без дубля | feedback tests |
| `CT-ILUI-04` | component | cards/sections | data, empty, long text, missing media | fallback без ложных данных, контент не обрезан | cards/sections tests |
| `CT-SHELL-01` | component | settings success | валидные string/object shared settings | parsed model, menu order/labels и contacts применены | settings/shell tests |
| `CT-SHELL-02` | component | settings degradation | request error, invalid type/JSON, missing optional | fallback menu/text; optional block hidden | settings/shell tests |
| `CT-SHELL-03` | component | navigation | active route, unknown href, empty phone | `aria-current`, href filtered, остальной header видим | header tests |
| `CT-SHELL-04` | component | keyboard | mobile overlay open/close/Escape/tab | trap, scroll lock, focus return | navigation tests |
| `CT-CB-01` | unit | validation | valid payload и boundary lengths | schema принимает 1/63 phone, 127 name, 2000 comment | schema tests |
| `CT-CB-02` | unit | validation errors | empty/64 phone, 128 name, 2001 comment | submit blocked, field error/focus | form tests |
| `CT-CB-03` | component | consent | unchecked, checked, policy fallback | unchecked blocked/aria error; link independently focusable | modal tests |
| `CT-CB-04` | API boundary | anonymous success | valid form + selector, no CMS auth | один POST, exact JSON, `201` success state | mocked callback tests |
| `CT-CB-05` | API boundary | auth isolation | cookie/Authorization attempt | CMS credentials не отправляются и не меняют outcome | client/form tests |
| `CT-CB-06` | component | error mapping | validation `4xx`, `401`, `5xx`, network | values preserved; correct inline/config/retry UX | modal tests |
| `CT-CB-07` | component | concurrency | repeated submit while pending | ровно один POST, `aria-busy`, stable geometry | modal tests |
| `CT-CB-08` | component | modal a11y | open, tab, Escape, close, success | named dialog, trap, focus return, persistent result | modal tests |
| `REN-PAGE-01` | render | SSR routes | все семь route HTML responses | `2xx`, shell + один route `h1` + placeholder в HTML | route/build runtime tests |
| `REN-PAGE-02` | render | SEO | JS disabled/source каждого route | title/description/canonical доступны server-side | metadata tests/runtime |
| `REN-PAGE-03` | render | route boundary | неизвестный path | `404`, no accidental catch-all/detail route | production runtime |
| `ST-BOUND-01` | static | consumer boundary | scan fetch/API imports/writes/auth | только Public Read GET и callback POST; no CMS credentials | `rg` + review |
| `ST-BOUND-02` | static | config | inspect tracked config/fallback | local API только в gitignored env, stand/prod URL не hardcoded | `git check-ignore` + `rg` |
| `CT-NOTE-SHELL-01` | component | logo asset | header/footer штатно используют static logo, image failure | доступное имя ссылки; один source asset; текст только как failure fallback | atoms/navigation tests |
| `CT-NOTE-SHELL-02` | component | services navigation | desktop keyboard/mouse dropdown и compact/mobile navigation | trigger «Услуги», три дочерних route, active state, Escape/focus, без новых href | navigation tests |
| `CT-NOTE-SHELL-03` | component | footer alignment | header/footer получают одну route model | одинаковая группировка/порядок; compact spacing без потери 44px targets | settings/navigation tests |
| `CT-NOTE-SHELL-04` | component | footer contacts | address/maps, phone, VK, Instagram и неполные settings | три channel icons из shared set; `VK`; каждый link `_blank` + safe rel; optional collapse | navigation/home tests |
| `CT-NOTE-CB-01` | unit/component | page context removal | callback открыт с route и optional entity context | route не виден и не попадает в comment; entity context/typed DTO и лимит сохраняются | schema/modal/API-boundary tests |
| `BQA-01` | browser | desktop shell | 1440 px, все routes/menu/active/footer | no overlap/scroll; correct navigation/current route | local browser |
| `BQA-02` | browser | responsive | 320, 768, 1024 px + long settings | compact/mobile switch, wraps, 44px targets, no clipping | local browser |
| `BQA-03` | browser | mobile nav | keyboard/touch open, tab, Escape | trap/scroll lock/focus return | local browser |
| `BQA-04` | browser | callback validation | empty/boundary/consent errors | no request, inline error and first-error focus | local browser |
| `BQA-05` | browser | callback success | anonymous valid submit to local API | `201`, one request, success message | local browser + Network |
| `BQA-06` | browser | callback errors | mocked/offline `401`, `4xx`, `5xx` | correct UX, values retained, retry | browser/network evidence |
| `BQA-07` | browser | a11y/motion | keyboard, 200% zoom, reduced motion | usable flow, visible focus, no loss/mandatory animation | local browser |
| `BQA-08` | browser | SSR/security | view source/Network without CMS session | shell/metadata present, no CMS-only/auth calls | local browser |
| `BQA-09` | browser | note shell acceptance | 1440/1024/768/320: logo, «Услуги», compact footer, три contacts | logo виден/контрастен; dropdown keyboard-ready; header/footer aligned; no overlap/scroll | local browser |
| `BQA-10` | browser | note callback acceptance | открыть callback с разных routes/CTA и отправить comment | page/route нигде не виден и не отправлен; endpoint/access outcome неизменны | local browser + Network |

Неприменимые backend feature-оси: новая запись/транзакционность/идемпотентность БД и деградация NATS отсутствуют, поскольку observability startup fix не меняет API/domain/schema. Риск repeated submission закрывается client concurrency scenario. `QG-LIVE` не вводит новый feature smoke: он подтверждает startup/health и достижимость существующих site API после исправления. Pagination/filter/search отсутствуют в placeholder flow.

## Browser QA steps (UI тестирование)

Предусловия: локальный API доступен на `http://localhost:8001/api`; gitignored `services/site-ksk-inlove/.env` содержит `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api` и корректный `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`; сайт запущен локально после production build либо в dev mode. CMS cookie/token не устанавливать.

1. `BQA-01`: на 1440 px открыть последовательно семь routes; проверить один `h1`, placeholder, header/footer, переходы, active marker и отсутствие горизонтального scroll.
2. `BQA-02`: повторить shell на 320, 768 и 1024 px; через локальную fixture/настройки проверить длинные labels/address/hours и пустые optional phone/social; зафиксировать отсутствие overlap/обрезки focus.
3. `BQA-03`: на 320 px открыть mobile menu мышью и клавиатурой, пройти Tab/Shift+Tab, закрыть `Escape`; проверить scroll lock и focus return.
4. `BQA-04`: открыть callback из header; отправить пустую форму, без consent и с превышением каждого лимита; Network должен оставаться без POST, focus — на первом invalid control.
5. `BQA-05`: заполнить валидные name/phone/comment, дать consent, отправить; проверить один `POST /api/callback_requests`, selector, отсутствие Authorization, `201` и постоянный success result.
6. `BQA-06`: воспроизвести `401`, backend validation `4xx`, offline/`5xx`; проверить configuration message без login, сохранение значений и retry. Для failure сохранить screenshot и status/body без секретов.
7. `BQA-07`: пройти весь overlay/form flow только клавиатурой при 200% zoom и `prefers-reduced-motion`; проверить touch targets, scrollable modal, focus и отсутствие перекрытия клавиатурой/safe-area.
8. `BQA-08`: с отключённым JS либо через View Source подтвердить shell, route heading и metadata; в Network подтвердить отсутствие CMS-only endpoints, cookies и bearer credentials.
9. `BQA-09`: на 1440/1024/768/320 px проверить static logo в header/footer, trigger «Услуги» и три ссылки клавиатурой/мышью, одинаковую структуру footer, компактные интервалы, glyphs phone/VK/Instagram, label `VK`; открыть каждый footer contact и подтвердить новую вкладку без opener.
10. `BQA-10`: открыть callback с главной и внутреннего route, в том числе contextual CTA; убедиться, что route/page не показан, отправить comment и в Network подтвердить отсутствие строки `Страница:` при неизменных полях DTO/selector/no-auth.

QA handoff перечисляет passed/failed IDs, viewport, screenshot для failed responsive/error/a11y cases и sanitized network status/body для API failure. Визуальная проверка не считается выполненной без фактического browser run.

## Migration Plan

1. Последовательно создать foundations/controls, оставшийся каталог и sections.
2. Поверх foundations внедрить shared settings adapter и shell; затем независимо callback и placeholder routes.
3. Завершённый automated verification сохранить как evidence; после approval заметки независимо выполнить `ILNOTE-SHELL-SC-1` и `ILNOTE-CB-SC-1`.
4. Возобновить browser QA на локальном API: повторить незакрытые `BQA-02`/`BQA-06`, выполнить новые `BQA-09`/`BQA-10`, затем закрыть общий QA handoff.
5. Провести параллельные `QG-FE`, `QG-BE`, `QG-CONTRACTS`, затем bounded `QG-LIVE` и синтезировать один verdict; учитывать только атрибутированные change 069 site-файлы и разрешённый startup fix в `services/backend/src/main.py`, исключая concurrent change 070/news и несвязанные `docs/**` diff.
6. После `APPROVED` синхронизировать delta specs, strict validate и архивировать change.

Rollback до deployment: удалить новые presentation routes/UI и восстановить нейтральный `layout.tsx`/`globals.css` baseline; integration API layer остаётся. Deployment текущего `site-ksk-inlove` по-прежнему запрещён из-за унаследованных `.helm/**`/`.github/**`.

## Risks / Trade-offs

- [Полный каталог компонентов велик для одного change] → реализация разделена на три последовательных UI units и отдельные shell/callback/pages units с одной verification group каждый.
- [Header SSR и active route требуют client state] → SSR отдаёт структуру/fallback, минимальный client boundary добавляет active/overlay behavior без client-only content fetch.
- [Существующий settings adapter использует старые generic keys] → выделяется нормализующий shared adapter с per-key fallback и тестами, transport wrapper не дублируется.
- [Форма может случайно отправить unsupported context/consent] → Zod DTO projection и exact-payload API-boundary tests ограничивают JSON тремя контрактными полями.
- [Raster-logo имеет квадратный фон и один цветовой вариант] → используется подтверждённый `yandex/logo.jpg` без выдумывания нового брендинга; component/browser tests проверяют фактическую читаемость light/dark variants, а текст остаётся error fallback.
- [Dropdown может ухудшить keyboard navigation или скрыть active route] → trigger/button, Escape/focus, дочерний `aria-current` и mobile fallback закреплены `CT-NOTE-SHELL-02`/`BQA-09`.
- [Локальный API/env не воспроизводим в Git] → automated tests используют mocks; фактический local URL и selector проверяются как QA prerequisite без tracked secret/fallback.
- [Созданные sections пока не используются placeholder pages] → component contracts тестируются изолированно и предназначены для задач 070/071; placeholders используют только foundations/shell.

## Open Questions

Открытых блокирующих вопросов нет. Реальные branded logo/media assets не указаны в задаче 069: компоненты используют текстовый logo и нейтральные fallbacks; добавление/генерация контентных assets остаётся отдельной подтверждённой задачей.
