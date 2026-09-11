# Tasks — inlove-site-header-footer

Ownership разделён по deliverables; порядок и DAG находятся в `design.md#dag-зависимостей`, test matrix — в `design.md#test-matrix`. `contextFiles` указаны отдельно для каждого bounded execution unit.

## Execution units

| Unit | Профиль | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| `ILUI-SC-1` | Site Consumer | `src/ui/foundations/**`, `atoms/**`, `controls/**`, `app/globals.css`, UI barrels | — | targeted tests + typecheck | `design.md` decisions 1/6; `specs/inlove-ui-components/spec.md`; `components.md` Foundations–Controls; design spec §§0,2–16,29–34,47–54,100–101 |
| `ILUI-SC-2` | Site Consumer | `src/ui/feedback/**`, `media/**`, `cards/**`, UI barrels | `ILUI-SC-1` | targeted tests + typecheck | previous handoff; UI spec; `components.md` Overlays feedback/Media/Content cards; design spec §§18–28,35–37,48–54,63–65,76–79,91–100 |
| `ILUI-SC-3` | Site Consumer | `src/ui/sections/**`, UI barrels | `ILUI-SC-2` | targeted tests + typecheck | previous handoff; UI spec; `components.md` Reusable sections; `scheme.md` page section contracts; design spec §§41–43,55–62,72,84–100 |
| `ILSHELL-SC-1` | Site Consumer | shared settings adapter/provider, `src/ui/navigation/**`, `src/features/siteChrome/**`, `app/layout.tsx` | `ILUI-SC-1` | shell/settings tests + typecheck | `design.md` decisions 2/3; site-shell spec; `scheme.md` general rules/header/footer; `components.md` Navigation; design spec §§17,38–47,53–54,67,70–71,99–101 |
| `ILCB-SC-1` | Site Consumer | callback feature/schema/modal/tests, callback transport types/tests, package manifests | `ILUI-SC-1`, `ILSHELL-SC-1` | callback/API-boundary tests + typecheck | shell handoff; callback spec; `scheme.md` callback; `components.md` CallbackModal/controls; design spec §§29–34,53–54,73–77,99–101; existing callback API/service/types |
| `ILPAGE-SC-1` | Site Consumer | seven route pages, shared placeholder, metadata tests | `ILSHELL-SC-1` | route/render tests + build | shell handoff; placeholder spec; modified skeleton spec; `scheme.md` route metadata; `components.md` page coverage; design spec §§8–11,47,53–54,99–101 |
| `ILVERIFY-SC-1` | Site Consumer | verification-only; test/config fixes only | UI/callback/pages done | full site commands/static scans | all implementation handoffs; `design.md#test-matrix`; four delta specs; package scripts/config |
| `ILNOTE-SHELL-SC-1` | Site Consumer | `public/**`, `src/ui/atoms/**`, `src/ui/navigation/**`, точечно shared settings/tests | `ILVERIFY-SC-1` | targeted shell/home tests + typecheck | `design.md` decision 7/test rows `CT-NOTE-SHELL-*`; site-shell spec; task note lines 20–37; `scheme.md` header/footer; `components.md` Logo/Icon/Navigation/ContactSection; design spec §§0,16–17,38–45,53–54,67,99–101; current homepage `ContactSection` glyphs; source `media/yandex/logo.jpg` |
| `ILNOTE-CB-SC-1` | Site Consumer | `src/features/callBackRequest/**` | `ILVERIFY-SC-1` | targeted callback tests + typecheck | `design.md` decision 5/test row `CT-NOTE-CB-01`; callback spec; task note lines 38–41; `scheme.md` callback; `components.md` CallbackModal; design spec §§0,29–34,53–54,73–77,99–101; callback handoff |
| `ILQA-SC-1` | Site Consumer | verification-only | `ILNOTE-SHELL-SC-1`, `ILNOTE-CB-SC-1` | `BQA-01..10` | both note handoffs; `design.md#browser-qa-steps-ui-тестирование`; shell/callback/page specs; local env prerequisites |
| `QG-FE` | Quality Gate | read-only site diff | `ILQA-SC-1` | tests/lint/typecheck/build + review | all handoffs; `design.md` test/browser matrices; relevant site diff; design protocol |
| `QG-BE` | Quality Gate | read-only `services/backend/src/main.py` startup fix | `ILQA-SC-1` | targeted backend tests/review | backend bugfix handoff; explicitly attributed startup diff; exclude concurrent 070/news diff |
| `QG-CONTRACTS` | Quality Gate | read-only specs/tasks/diff | `ILQA-SC-1` | strict validation + conformance | proposal; design access/ownership/units; all delta specs; tasks; diff |
| `QG-LIVE` | Quality Gate | live verification only; runtime read-only | `QG-BE`, `QG-FE`, `QG-CONTRACTS` | backend startup/health + existing site API reachability | backend fix handoff; lane handoffs; local compose/runtime config |
| `QG-SYNTH` | Quality Gate | `docs/reports/**` | QG lanes | one verdict report | QG-BE, QG-FE, QG-CONTRACTS and QG-LIVE handoffs/findings; tasks status |
| `OPS-SYNC` | Router/OpenSpec | main specs | `QG-SYNTH=APPROVED` | sync + strict validation | approved report; delta specs |
| `OPS-ARCHIVE` | Router/OpenSpec | archive | `OPS-SYNC` | archive + final validation | sync handoff; completed tasks/change status |

## 1. ILUI-SC-1 — foundations, atoms и controls (профиль: Site Consumer)

**Specs:** `inlove-ui-components` · **Пути:** `src/ui/foundations/**`, `atoms/**`, `controls/**`, `app/globals.css`, UI barrels · **Зависит от:** —

- [x] ILUI-SC-1.1 Создать semantic color, typography, spacing, radius, shadow, focus, breakpoint и motion tokens INLOVE с font fallbacks и reduced-motion правилами.
- [x] ILUI-SC-1.2 Реализовать `PageContainer`, `Section` и семантически независимый `Typography` по contracts каталога.
- [x] ILUI-SC-1.3 Реализовать `Logo`, `Icon` и `Badge` с light/dark/tone variants и accessible fallbacks.
- [x] ILUI-SC-1.4 Реализовать `ResponsiveImage`, `SectionLabel`, `Divider` и `PriceValue`, включая ratios, alt/fallback и unknown-price behavior.
- [x] ILUI-SC-1.5 Реализовать `Button`/`TextLink` со всеми interaction/loading/disabled states и touch target.
- [x] ILUI-SC-1.6 Реализовать `Field`, `TextArea`, `NativeSelect`, `Accordion` и `PaginationLoadMore` с keyboard/aria/error contracts.
- [x] ILUI-SC-1.7 Добавить exports и targeted `CT-ILUI-01..02`, включая long/empty labels и reduced motion.
- [x] ILUI-SC-1.V Прогнать targeted tests и `npx tsc --noEmit` из сайта, отметить только выполненные tasks и вернуть Router handoff.

## 2. ILUI-SC-2 — feedback, media и content cards (профиль: Site Consumer)

**Specs:** `inlove-ui-components` · **Пути:** `src/ui/feedback/**`, `media/**`, `cards/**`, UI barrels · **Зависит от:** `ILUI-SC-1`

- [x] ILUI-SC-2.1 Реализовать `Toast`, `InlineNotice`, `Skeleton`, `ErrorBlock` и `EmptyState` с live-region/alert и reduced-motion states.
- [x] ILUI-SC-2.2 Реализовать `HeroMedia` с variants, overlays, responsive crops и одним primary CTA.
- [x] ILUI-SC-2.3 Реализовать `Gallery`/`Carousel` с keyboard controls, announced changes и mobile peek contract.
- [x] ILUI-SC-2.4 Реализовать доступный `MapEmbed` с neutral fallback и без analytics/CMS credentials.
- [x] ILUI-SC-2.5 Реализовать `ServiceCard`/`PriceRow` с missing media/table/price fallbacks.
- [x] ILUI-SC-2.6 Реализовать `HorseCard`, `NewsCard`, `PersonCard`, `FeatureItem` и `ReviewSummary` без hover-only content.
- [x] ILUI-SC-2.7 Обновить exports и добавить targeted `CT-ILUI-03..04` для data/loading/empty/error/long-content states.
- [x] ILUI-SC-2.V Прогнать targeted component tests и `npx tsc --noEmit`, отметить tasks и вернуть handoff.

## 3. ILUI-SC-3 — reusable sections (профиль: Site Consumer)

**Specs:** `inlove-ui-components` · **Пути:** `src/ui/sections/**`, UI barrels · **Зависит от:** `ILUI-SC-2`

- [x] ILUI-SC-3.1 Реализовать `IntroSection` и `EditorialSplitSection` с логичным DOM-order на mobile.
- [x] ILUI-SC-3.2 Реализовать `BenefitsSection` с вариантами program/club и без выдуманных optional items.
- [x] ILUI-SC-3.3 Реализовать `PricesSection` с карточками/таблицами, unknown-price и local retry states.
- [x] ILUI-SC-3.4 Реализовать `HorsesSection` и `NewsSection` с loading/empty/error/success contracts.
- [x] ILUI-SC-3.5 Реализовать `ContactSection` с address/phone/hours/social/map collapse behavior.
- [x] ILUI-SC-3.6 Реализовать `PreparationSafetySection`, `ConditionsSection` и `PrivacySection` с доступной heading hierarchy.
- [x] ILUI-SC-3.7 Обновить exports и расширить `CT-ILUI-04` на responsive, long/empty content и state variants секций.
- [x] ILUI-SC-3.V Прогнать targeted section tests и `npx tsc --noEmit`, отметить tasks и вернуть handoff.

## 4. ILSHELL-SC-1 — shared settings, header и footer (профиль: Site Consumer)

**Specs:** `inlove-site-shell` · **Пути:** shared settings adapter/provider, `src/ui/navigation/**`, `src/features/siteChrome/**`, `app/layout.tsx` · **Зависит от:** `ILUI-SC-1`

- [x] ILSHELL-SC-1.1 Определить typed shared settings model/fallbacks и один server query для header/footer/callback/default SEO keys.
- [x] ILSHELL-SC-1.2 Реализовать per-key parsing string/object values и allowlist/filter/order семи route без tenant/domain fallback.
- [x] ILSHELL-SC-1.3 Расширить provider/client boundary только serializable shared model, сохранив SSR content.
- [x] ILSHELL-SC-1.4 Реализовать `SiteHeader` с logo, active route, optional phone, desktop menu и callback trigger contract.
- [x] ILSHELL-SC-1.5 Реализовать `MobileMenu` с focus trap, scroll lock, `Escape`, CTA/social и focus return.
- [x] ILSHELL-SC-1.6 Реализовать `SiteFooter` и `StickyMobileCta` с responsive/collapse/safe-area contracts.
- [x] ILSHELL-SC-1.7 Подключить shell в root layout и реализовать `CT-SHELL-01..04`, включая settings error и unknown href.
- [x] ILSHELL-SC-1.V Прогнать shell/settings tests и `npx tsc --noEmit`, отметить tasks и вернуть handoff.

## 5. ILCB-SC-1 — универсальная callback form (профиль: Site Consumer)

**Specs:** `inlove-callback-form` · **Пути:** callback feature/schema/modal/tests, callback transport types/tests, package manifests · **Зависит от:** `ILUI-SC-1`, `ILSHELL-SC-1`

- [x] ILCB-SC-1.1 Добавить `zod` штатным package manager и создать schema для contract fields и локального consent.
- [x] ILCB-SC-1.2 Реализовать безопасное добавление visible route/service/tariff/horse context в `comment` в пределах 2000 символов.
- [x] ILCB-SC-1.3 Реализовать поля, непредвыбранный consent, policy URL fallback и focus первого invalid control.
- [x] ILCB-SC-1.4 Реализовать accessible modal shell: name/description, trap, scroll lock, `Escape`, focus return, mobile scroll/safe area.
- [x] ILCB-SC-1.5 Реализовать idle/pending/success state machine, double-submit guard и скрытие sticky CTA при modal.
- [x] ILCB-SC-1.6 Подключить существующий callback service и mapping `201`, validation `4xx`, `401`, `5xx`/network с сохранением values/consent.
- [x] ILCB-SC-1.7 Реализовать `CT-CB-01..08`, включая exact anonymous payload, отсутствие CMS credentials и все focus/error outcomes.
- [x] ILCB-SC-1.V Прогнать callback/API-boundary tests и `npx tsc --noEmit`, отметить tasks и вернуть handoff.

## 6. ILPAGE-SC-1 — семь placeholder routes и metadata (профиль: Site Consumer)

**Specs:** `inlove-placeholder-pages`, `inlove-site-skeleton` · **Пути:** seven route pages, shared placeholder, metadata tests · **Зависит от:** `ILSHELL-SC-1`

- [x] ILPAGE-SC-1.1 Реализовать общий SSR `UnderConstructionPage` с одним `h1` и route-specific heading/message contract.
- [x] ILPAGE-SC-1.2 Создать `/` и `/uslugi/zanyatiya` с route-specific fallback metadata/canonical.
- [x] ILPAGE-SC-1.3 Создать `/uslugi/progulki` и `/uslugi/postoy` с route-specific fallback metadata/canonical.
- [x] ILPAGE-SC-1.4 Создать `/loshadi` и `/novosti` с route-specific fallback metadata/canonical.
- [x] ILPAGE-SC-1.5 Создать `/about`, включая доступную anchor target `/about#privacy`, и route metadata/canonical.
- [x] ILPAGE-SC-1.6 Подключить available SEO settings server-side с documented per-route/default fallback без client fetch.
- [x] ILPAGE-SC-1.7 Реализовать `REN-PAGE-01..03`: семь SSR pages, metadata/source и неизвестный route `404`.
- [x] ILPAGE-SC-1.V Прогнать route/render tests и production build, отметить tasks и вернуть handoff.

## 7. ILVERIFY-SC-1 — полный automated gate сайта (профиль: Site Consumer)

**Specs:** четыре новые capability и modified skeleton · **Пути:** verification-only; test/config fixes только в назначенных paths · **Зависит от:** `ILUI-SC-3`, `ILCB-SC-1`, `ILPAGE-SC-1`

- [x] ILVERIFY-SC-1.1 Прогнать весь component/render/API-boundary test matrix `CT-*`, `REN-*`; подтвердить mocks и отсутствие live calls в unit tests.
- [x] ILVERIFY-SC-1.2 Прогнать `npm test` из `services/site-ksk-inlove` и устранить только test/config regressions в ownership unit.
- [x] ILVERIFY-SC-1.3 Прогнать `npm run lint` и `npx tsc --noEmit` без mutating autofix.
- [x] ILVERIFY-SC-1.4 Прогнать `npm run build` и проверить route manifest: семь pages и `404` вне карты.
- [x] ILVERIFY-SC-1.5 Выполнить `ST-BOUND-01`: scan fetch/API imports, writes, cookie/Authorization и CMS-only endpoints.
- [x] ILVERIFY-SC-1.6 Выполнить `ST-BOUND-02`: подтвердить local API только в gitignored env и отсутствие tracked stand/prod/API fallback.
- [x] ILVERIFY-SC-1.7 Проверить полноту exports против `components.md` и отсутствие edits `.helm/**`, `.github/**`, backend, docs design sources.
- [x] ILVERIFY-SC-1.V Свести команды/evidence, отметить фактически выполненные tasks и вернуть Router handoff.

## 8. ILNOTE-SHELL-SC-1 — rework logo, меню и footer (профиль: Site Consumer)

**Specs:** `inlove-site-shell` · **Пути:** `public/**`, `src/ui/atoms/**`, `src/ui/navigation/**`, точечно shared settings/tests · **Зависит от:** `ILVERIFY-SC-1`

- [x] ILNOTE-SHELL-SC-1.1 Перенести `docs/parsings/ksk.inlove/media/yandex/logo.jpg` в `public/` под стабильным logo path, не изменяя read-only source.
- [x] ILNOTE-SHELL-SC-1.2 Обновить `Logo`: asset в штатном header/footer, ссылка `/`, accessible name, light/dark presentation, clear space и текстовый fallback только при error.
- [x] ILNOTE-SHELL-SC-1.3 Вынести phone/VK/Instagram glyphs текущей homepage `ContactSection` в общий `Icon` boundary и переиспользовать их без дублирования.
- [x] ILNOTE-SHELL-SC-1.4 Реализовать desktop dropdown «Услуги» для трёх service routes с mouse/keyboard/Escape/focus и active group semantics; mobile menu сохранить доступным.
- [x] ILNOTE-SHELL-SC-1.5 Синхронизировать footer route structure с header и уменьшить menu spacing, сохранив `44 × 44px` targets и long-label wrapping.
- [x] ILNOTE-SHELL-SC-1.6 Нормализовать label `ВКонтакте` в `VK`; показать icons для phone/VK/Instagram; всем footer contact links задать `_blank` и `noopener noreferrer`.
- [x] ILNOTE-SHELL-SC-1.7 Реализовать/обновить `CT-NOTE-SHELL-01..04`, включая missing asset/settings, active child route, keyboard dropdown и safe external links.
- [x] ILNOTE-SHELL-SC-1.V Прогнать targeted shell/home tests и `npx tsc --noEmit`, отметить только выполненные tasks и вернуть Router handoff.

## 9. ILNOTE-CB-SC-1 — удаление page context из callback (профиль: Site Consumer)

**Specs:** `inlove-callback-form` · **Пути:** `src/features/callBackRequest/**` · **Зависит от:** `ILVERIFY-SC-1`

- [x] ILNOTE-CB-SC-1.1 Удалить route/page из видимого context блока modal, сохранив optional service/tariff/horse context.
- [x] ILNOTE-CB-SC-1.2 Исключить route/page и строку `Страница:` из композиции `comment`, не меняя `CallbackRequestCreateDto`, selector или transport boundary.
- [x] ILNOTE-CB-SC-1.3 Обновить schema/modal/API-boundary regressions `CT-NOTE-CB-01`, включая exact payload с пользовательским comment и optional entity context.
- [x] ILNOTE-CB-SC-1.V Прогнать targeted callback tests и `npx tsc --noEmit`, отметить только выполненные tasks и вернуть Router handoff.

## 10. ILQA-SC-1 — browser QA на локальном API (профиль: Site Consumer)

**Specs:** shell, callback, placeholder pages, UI components · **Пути:** verification-only · **Зависит от:** `ILNOTE-SHELL-SC-1`, `ILNOTE-CB-SC-1`

- [x] ILQA-SC-1.1 Проверить prerequisites: local API URL `http://localhost:8001/api`, tenant selector, запущенный сайт и отсутствие CMS session.
- [x] ILQA-SC-1.2 Повторить `BQA-01..03`: desktop/responsive shell и keyboard navigation после note rework, включая ранее незакрытый 1024 px кейс `BQA-02`.
- [x] ILQA-SC-1.3 Выполнить `BQA-04`: Zod boundary/consent validation без сетевого запроса.
- [x] ILQA-SC-1.4 Выполнить `BQA-05`: anonymous valid callback к локальному API, один POST, selector/no auth, `201`.
- [x] ILQA-SC-1.5 Выполнить `BQA-06`: `401`, validation `4xx`, offline/`5xx`, сохранение values и retry.
- [x] ILQA-SC-1.6 Выполнить `BQA-07`: keyboard, focus, 200% zoom, reduced motion, modal viewport/safe-area.
- [x] ILQA-SC-1.7 Выполнить `BQA-08`: SSR source/metadata и Network scan без CMS-only/auth calls.
- [x] ILQA-SC-1.8 Выполнить `BQA-09`: logo/dropdown/footer/contact acceptance на 1440/1024/768/320 px с keyboard и new-tab evidence.
- [x] ILQA-SC-1.9 Выполнить `BQA-10`: отсутствие route/page в modal и callback payload при неизменном public POST contract.
- [x] ILQA-SC-1.V Зафиксировать passed/failed IDs, viewport/screenshots/sanitized Network evidence, отметить tasks и вернуть handoff.

## 11. QG-FE — frontend/browser lane (профиль: Quality Gate)

**Specs:** все capability · **Пути:** read-only site diff · **Зависит от:** `ILQA-SC-1`

- [x] QG-FE.1 Запустить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` из сайта и зафиксировать результаты.
- [x] QG-FE.2 Проверить качество tests против behavior diff, mock/no-live boundary и coverage `CT-*`, `REN-*`, `ST-*`.
- [x] QG-FE.3 Проверить SSR shell/metadata, семь route/404, отсутствие CMS-only/auth mixing и callback access outcomes.
- [x] QG-FE.4 Проверить evidence `BQA-01..10`, дизайн-протокол, responsive 320/768/1024/1440, keyboard/focus/AA/reduced-motion.
- [x] QG-FE.5 Вернуть findings с severity, file/line, violated scenario и предложенным bounded rework ownership.
- [x] QG-FE.V Вернуть Router lane handoff; не ставить общий verdict и не менять runtime/spec files.

## 12. QG-CONTRACTS — architecture/contracts lane (профиль: Quality Gate)

**Specs:** все capability · **Пути:** read-only specs/tasks/diff · **Зависит от:** `ILQA-SC-1`

- [x] QG-CONTRACTS.1 Выполнить strict OpenSpec validation и сверить diff с утверждёнными proposal/specs/tasks.
- [x] QG-CONTRACTS.2 Проверить ownership/execution boundedness и соответствие отмеченных checkbox фактическим handoff/diff.
- [x] QG-CONTRACTS.3 Сверить access matrix: anonymous settings GET и callback POST, selector `401`, no CMS credentials; отдельно атрибутировать разрешённый startup fix без изменения API contract.
- [x] QG-CONTRACTS.4 Подтвердить отсутствие изменений design sources, deployment trees, NATS, DB/schema и out-of-scope routes в атрибутированном diff 069; разрешить только `services/backend/src/main.py` startup fix и явно исключить concurrent change 070/news и несвязанные `docs/**` изменения по пути/коммиту, не объявляя весь worktree неизменным.
- [x] QG-CONTRACTS.5 Вернуть findings с severity, evidence и затронутым owner/unit.
- [x] QG-CONTRACTS.V Вернуть Router lane handoff; не ставить общий verdict.

## 13. QG-BE — backend/runtime code lane (профиль: Quality Gate)

**Specs:** process-only startup correction, без backend feature spec · **Пути:** read-only `services/backend/src/main.py` · **Зависит от:** `ILQA-SC-1`

- [x] QG-BE.1 Проверить только явно разрешённый observability startup diff в `services/backend/src/main.py`, исключив concurrent change 070/news backend diff по явной атрибуции.
- [x] QG-BE.2 Запустить относящиеся к startup fix targeted backend tests/static checks и проверить отсутствие изменений API/domain/schema/NATS/access policy.
- [x] QG-BE.V Вернуть Router lane handoff без общего verdict; результат: pass, findings отсутствуют.

## 14. QG-LIVE — bounded startup verification lane (профиль: Quality Gate)

**Specs:** process-only startup correction, существующие site API contracts без новых требований · **Пути:** runtime read-only · **Зависит от:** `QG-BE`, `QG-FE`, `QG-CONTRACTS`

- [x] QG-LIVE.1 Поднять/проверить локальный backend после observability fix и подтвердить успешный startup и health response без прежнего `PrometheusFastApiInstrumentator.add_filter` exception.
- [x] QG-LIVE.2 Подтвердить достижимость существующих site settings GET и callback POST контуров, не вводя новые feature/API assertions и не изменяя runtime.
- [x] QG-LIVE.3 Зафиксировать sanitized команды/status evidence; concurrent change 070/news и несвязанные `docs/**` изменения не включать в verdict 069.
- [x] QG-LIVE.V Вернуть Router lane handoff; findings адресовать владельцу startup fix, общий verdict не ставить.

## 15. QG-SYNTH — единый Quality Gate verdict (профиль: Quality Gate)

**Specs:** все capability · **Пути:** `docs/reports/**` · **Зависит от:** `QG-BE`, `QG-FE`, `QG-CONTRACTS`, `QG-LIVE`

- [x] QG-SYNTH.1 Собрать lane handoffs и удалить дубли findings, сохранив severity/evidence/owner.
- [x] QG-SYNTH.2 Учесть `QG-BE` и `QG-LIVE` как применимые только к разрешённому observability startup fix; отделить его от concurrent change 070/news и несвязанных `docs/**` diff явной path/commit attribution и не приписывать change 069 новых backend feature requirements.
- [x] QG-SYNTH.3 Сформировать bounded rework execution units по владельцам для каждого blocking finding.
- [x] QG-SYNTH.4 Записать один отчёт в `docs/reports/**` с verdict `APPROVED` либо `REWORK`.
- [x] QG-SYNTH.V Вернуть Router synthesis handoff; при `REWORK` указать lanes для повторной проверки.

## 16. OPS-SYNC — синхронизация main specs (профиль: Router/OpenSpec workflow)

**Specs:** все delta specs · **Пути:** `openspec/specs/**` · **Зависит от:** `QG-SYNTH=APPROVED`

- [x] OPS-SYNC.1 Синхронизировать новые и modified delta requirements в main specs через OpenSpec workflow.
- [x] OPS-SYNC.2 Повторно выполнить strict validation change/main specs и проверить отсутствие потери modified skeleton requirement.
- [x] OPS-SYNC.V Зафиксировать status/validation и перейти к archive только при успехе.

## 17. OPS-ARCHIVE — архивирование change (профиль: Router/OpenSpec workflow)

**Specs:** завершённый change · **Пути:** `openspec/changes/archive/**` · **Зависит от:** `OPS-SYNC`

- [x] OPS-ARCHIVE.1 Подтвердить завершённые implementation/QG tasks и отсутствие незакрытых blocking findings.
- [x] OPS-ARCHIVE.2 Архивировать `inlove-site-header-footer` штатной OpenSpec командой.
- [x] OPS-ARCHIVE.V Выполнить финальную validation/status проверку и сообщить пользователю путь архива.
