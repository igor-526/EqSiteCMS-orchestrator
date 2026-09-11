# Tasks — inlove-static-pages

Пользователь явно подтвердил Apply (Router → DOC-1, 2026-09-09), включая backend scope; execution units запускаются по DAG. Ownership deliverables, DAG, test matrix и manual QA — в `design.md`; contextFiles точечно указаны в таблице. Общий design context SC units и backend verification определены в `design.md#execution-units`. Один invocation выполняет один unit, отмечает только фактически выполненное и возвращает handoff.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| DOC-1 | Planner | D | docs/sites/inlove/{scheme,components}.md | approval | сверка route/data contracts | design.md#переход-069; specs/inlove-placeholder-pages/spec.md; scheme.md: Новости/SSR; components.md: NewsPage/матрица маршрутов |
| BE-1 | Backend | A | services/backend/src/{models/news.py,core/entities/news.py,migration/versions/*news_slug*}; services/backend/tests/unit/migration/*news_slug* | approval | backend verification | design.md#news-storage; specs/news-public-slugs/spec.md: Стабильный сохраняемый slug; src/models/news.py; src/core/entities/news.py |
| BE-2 | Backend | A | services/backend/src/{core/services/news.py,core/protocols/repositories/news_repository.py,repositories/news_repository.py,core/utils/news_slug.py}; services/backend/tests/unit/core/services/test_news_service.py | BE-1 | backend verification | design.md#news-storage; specs/news-public-slugs/spec.md; src/core/services/news.py; src/core/protocols/repositories/news_repository.py |
| BE-3a | Backend | A | services/backend/src/{api/news.py,core/schemas/news.py,core/services/news.py}; services/backend/tests/unit/api/*news* | BE-2 | backend verification | design.md#api-и-access-matrix; specs/news-public-slugs/spec.md: Публичный lookup/Access matrix; src/api/news.py; src/core/schemas/news.py |
| BE-3b | Backend | A | services/backend/src/depends/services.py (news-specific helper only); src/api/news.py; tests/unit/api/*news*; maintain/route_inventory.py; docs/backend-route-inventory.md; tests/unit/api/test_route_access_inventory.py | BE-3a | backend verification | design.md#api-и-access-matrix; specs/news-public-slugs/spec.md: Access matrix; handoff BE-3a |
| BE-3c | Backend | A | services/backend/src/main.py (news-only RequestValidationError condition); services/backend/tests/unit/api/test_news_access.py (structural 422 cases) | BE-3b | backend verification | design.md#api-и-access-matrix; specs/news-public-slugs/spec.md: Access matrix; handoff BE-3b |
| SC-1 | Site Consumer | B | services/site-ksk-inlove/src/{api/news.ts,api/news.test.ts,types/news.ts,features/contentPages/services/**,lib/content/**}; services/site-ksk-inlove/package{,-lock}.json | DOC-1, BE-3c | targeted server-data Vitest | design.md#данные-и-ssr; specs/inlove-news-pages/spec.md; src/api/client.ts; src/api/price.ts; src/features/siteSettings/services/getSiteSettings.ts |
| SC-2a | Site Consumer | B | services/site-ksk-inlove/src/app/page.tsx; services/site-ksk-inlove/src/features/contentPages/home/** | SC-1 | targeted home Vitest | design.md#данные-и-ssr; specs/inlove-content-pages/spec.md: Серверная главная/Общие SSR; scheme.md: Главная; components.md: HomePage |
| SC-3 | Site Consumer | B | services/site-ksk-inlove/src/app/about/page.tsx; services/site-ksk-inlove/src/features/contentPages/about/** | SC-1 | targeted about Vitest | design.md#данные-и-ssr; specs/inlove-content-pages/spec.md: Серверная страница О клубе/Общие SSR; scheme.md: О клубе; components.md: AboutPage |
| SC-4 | Site Consumer | B | services/site-ksk-inlove/src/app/novosti/page.tsx; services/site-ksk-inlove/src/features/contentPages/newsArchive/** | SC-1 | targeted archive Vitest | design.md#данные-и-ssr; specs/inlove-news-pages/spec.md: Архив; scheme.md: Новости; components.md: NewsPage |
| SC-5 | Site Consumer | B | services/site-ksk-inlove/src/app/novosti/[slug]/**; services/site-ksk-inlove/src/features/contentPages/newsDetail/** | SC-1 | targeted detail Vitest | design.md#данные-и-ssr; specs/inlove-news-pages/spec.md: Отдельная серверная деталь; components.md: NewsPage |
| SC-6 | Site Consumer | B | services/site-ksk-inlove/src/{ui/cards/**,ui/sections/**,features/placeholderPages/**} | SC-2a, SC-3, SC-4, SC-5 | targeted route/component Vitest | specs/inlove-placeholder-pages/spec.md; design.md#переход-069; src/features/placeholderPages/routeTree.test.ts; src/ui/cards/index.tsx; src/ui/sections/index.tsx |
| SC-2b | Site Consumer | B | services/site-ksk-inlove/src/features/contentPages/home/{HomeContent.tsx,HomeContent.test.tsx,home.module.css} | SC-6 | targeted home Vitest | handoffs SC-2a/SC-6; specs/inlove-content-pages/spec.md: Серверная главная; components.md: HomePage/NewsSection |
| SC-7a | Site Consumer | B | verification only | SC-2b | browser baseline real CMS | design.md#manual-qa-steps; specs/inlove-content-pages/spec.md: Общие SSR SEO; handoffs SC-2..6 |
| SC-7b.1 | Site Consumer | B | verification only; temporary fixture API | SC-7a | fixture setup + detail responsive/error/404 | design.md#manual-qa-steps; specs/inlove-news-pages/spec.md; handoff SC-7a |
| SC-7b.2 | Site Consumer | B | verification only; existing temporary fixture API | SC-7b.1 | archive/no-JS/gallery/a11y remaining UI-01..04 | design.md#manual-qa-steps; handoff SC-7b.1 |
| QG-BE | Quality Gate | C | read-only backend diff | BE-3, SC-7b.2 | make test + make lint | design.md#test-matrix: UT-BE; specs/news-public-slugs/spec.md; handoffs BE-1..3 |
| QG-FE | Quality Gate | C | read-only site diff | SC-7b.2 | npm test; npm run lint; npx tsc --noEmit; npm run build | design.md#test-matrix: UT-SC/UI; specs/inlove-content-pages/spec.md; specs/inlove-news-pages/spec.md; handoff SC-7 |
| QG-CONTRACTS | Quality Gate | C | read-only affected contracts | BE-3, SC-7b.2 | diff/spec/access review | design.md#api-и-access-matrix; design.md#переход-069; specs/news-public-slugs/spec.md; specs/inlove-placeholder-pages/spec.md; handoff DOC-1 |
| QG-LIVE | Quality Gate | C | verification only | QG-BE, QG-FE, QG-CONTRACTS | SM-01..07 на живом API | design.md#postgresql-для-smoke-тестов; design.md#test-matrix: SM; specs/news-public-slugs/spec.md: Access matrix |
| QG-LIVE-DB | Quality Gate | C | verification only; отдельная временная PostgreSQL DB | QG-LIVE.1 | SM-05 upgrade/downgrade/backfill/DB unique | design.md#postgresql-для-smoke-тестов; design.md#test-matrix: SM-05; specs/news-public-slugs/spec.md: slug storage; discovery handoff |
| QG-LIVE-API | Quality Gate | C | verification only; собственные tenant/user/news fixtures | QG-LIVE.1 | SM-01..04, SM-06, concurrent create из SM-05; curl timings и cleanup | design.md#api-и-access-matrix; design.md#test-matrix: SM-01..06; specs/news-public-slugs/spec.md: Access matrix; discovery handoff |
| QG-LIVE-SSR | Quality Gate | C | verification only; настоящий site с real backend | QG-LIVE-API, новые SC-N units по note070 | SM-07 anonymous SSR archive/detail, hidden404 | specs/inlove-news-pages/spec.md; design.md#test-matrix: SM-07; QG-LIVE-API handoff; handoffs SC-N |
| QG-SYNTH | Quality Gate | C | docs/reports/070_inlove_static_pages.md | QG-LIVE | синтез lane evidence | handoffs QG-BE/QG-FE/QG-CONTRACTS/QG-LIVE; design.md#test-matrix |
| SYNC-1 | Planner | D | openspec/specs/{news-public-slugs,inlove-content-pages,inlove-news-pages,inlove-placeholder-pages}/**; openspec/changes/inlove-static-pages/specs/inlove-placeholder-pages/spec.md | QG-SYNTH APPROVED | openspec validate --strict | design.md#переход-069; handoff QG-SYNTH; конкретные 4 delta spec paths |
| ARCHIVE-1 | Planner | D | openspec/changes/inlove-static-pages → archive | SYNC-1 | openspec status/validate | handoff SYNC-1; docs/reports/070_inlove_static_pages.md |

## 1. DOC-1 — Согласование документов и baseline (профиль: Planner)

**Deliverable:** D · **Specs:** назначенные contracts по contextFiles · **Пути:** `docs/sites/inlove/{scheme,components}.md` · **Зависит от:** approval

- [x] DOC-1.1 Зафиксировать разрешённый Router snapshot ревизий/status/hash затрагиваемых файлов 069 для его оставшихся QA (handoff владельца не предоставлен); при активном владельце конфликтующих paths остановить только эти paths.
- [x] DOC-1.2 Согласовать scheme.md и components.md с отдельным news route, полным content, SSR всей страницы и ссылочной пагинацией; прочие маршруты сохранить.
- [x] DOC-1.3 Зафиксировать порядок sync placeholder capability и запрет позднего перезаписывания результата старым delta 069.
- [x] DOC-1.V Выполнить сверка route/data contracts, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 2. BE-1 — News storage (профиль: Backend)

**Deliverable:** A · **Specs:** news-public-slugs · **Пути:** `services/backend/src/{models/news.py,core/entities/news.py,migration/versions/*news_slug*}; services/backend/tests/unit/migration/*news_slug*` · **Зависит от:** approval

- [x] BE-1.1 Добавить slug в SQLAlchemy table и domain entity с tenant unique constraint.
- [x] BE-1.2 Создать expand/backfill/NOT NULL миграцию; использовать frozen алгоритм генерации, включить scheduled/deleted записи и downgrade.
- [x] BE-1.3 Покрыть UT-BE-01..03 миграционными и schema tests.
- [x] BE-1.V Выполнить backend verification, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 3. BE-2 — News domain и repository (профиль: Backend)

**Deliverable:** A · **Specs:** news-public-slugs · **Пути:** `services/backend/src/{core/services/news.py,core/protocols/repositories/news_repository.py,repositories/news_repository.py,core/utils/news_slug.py}; services/backend/tests/unit/core/services/test_news_service.py` · **Зависит от:** BE-1

- [x] BE-2.1 Реализовать генерацию slug при create и стабильность при update без изменения входного контракта CMS.
- [x] BE-2.2 Добавить tenant-scoped public lookup в Protocol/repository/service с фильтром публикации и устойчивым порядком list.
- [x] BE-2.3 Покрыть UT-BE-04..07 доменными тестами, сохранить thin API/Clean Architecture.
- [x] BE-2.V Выполнить backend verification, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 4. BE-3a / BE-3b / BE-3c — News HTTP и DTO (профиль: Backend)

**Deliverable:** A · **Specs:** news-public-slugs · **Пути:** `services/backend/src/{api/news.py,core/schemas/news.py,core/services/news.py}; services/backend/tests/unit/api/*news*` · **Зависит от:** BE-2

- [x] BE-3.1 Добавить slug в list/CMS DTO, отдельный public detail DTO с content и сборку detail в service.
- [x] BE-3.2 Добавить by-slug endpoint, сохранить UUID route, status semantics и protected write.
- [x] BE-3.3 Реализовать UT-BE-08..12: anonymous/authenticated, selector и tenant isolation для всех строк A1–A9.
- [x] BE-3.V Выполнить backend verification, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

Split: BE-3a реализовал DTO/detail routes и contract tests. BE-3b завершает BE-3.2 (selector 401), BE-3.3 и BE-3.V; добавляет news-specific dependency без изменения общего public context, обновляет access inventory и regression guard количества маршрутов. SC-1 зависит от BE-3c. BE-3a verification: scoped format PASS; lint PASS; tests 1337 passed, 5 skipped, 2 inventory guards failed (новый маршрут, артефакт устарел).

## 5. SC-1 — Public news API и server data (профиль: Site Consumer)

**Deliverable:** B · **Specs:** inlove-content-pages, inlove-news-pages, inlove-placeholder-pages · **Пути:** `services/site-ksk-inlove/src/{api/news.ts,api/news.test.ts,types/news.ts,features/contentPages/services/**,lib/content/**}; services/site-ksk-inlove/package{,-lock}.json` · **Зависит от:** DOC-1, BE-3

- [x] SC-1.1 Добавить типизированные list/detail wrappers через существующий anonymous API client; не менять общий клиент без отдельного unit.
- [x] SC-1.2 Реализовать request-scoped server loaders для news, home и about, typed success/empty/error, page normalization и no-store news.
- [x] SC-1.3 Добавить серверный HTML allowlist sanitizer и UT-SC-01..04; dependency только если нет подходящей текущей утилиты.
- [x] SC-1.V Выполнить targeted server-data Vitest, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 6. SC-2a / SC-2b — Главная композиция (профиль: Site Consumer)

**Deliverable:** B · **Specs:** inlove-content-pages, inlove-news-pages, inlove-placeholder-pages · **Пути:** `services/site-ksk-inlove/src/app/page.tsx; services/site-ksk-inlove/src/features/contentPages/home/**` · **Зависит от:** SC-1

**Принятый split:** SC-2a завершает SC-2.2/SC-2.3/SC-2.V и передаёт handoff. SC-2b после SC-6 заменяет локальный latest article на SSR-safe NewsSection и закрывает SC-2.1; ownership только HomeContent.tsx, HomeContent.test.tsx и home.module.css. SC-7 запускается после SC-2b.

- [x] SC-2.1 Исторический checkpoint до note070: собрать прежнюю семисекционную композицию главной с settings/fallback и latest slug link. Текущий исполняемый критерий заменён `SC-N1.1`: hero, четыре service cards, преимущества, latest news и контакты; блок стоимости и price fetch отсутствуют.
- [x] SC-2.2 Добавить route metadata, один h1, независимые empty/error состояния и callback context «Главная».
- [x] SC-2.3 Покрыть UT-SC-05: SSR полный/пустой/ошибка, ссылки и отсутствие дублирования сущностей.
- [x] SC-2.V Выполнить targeted home Vitest, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

- [x] SC-2b.V Выполнить targeted home Vitest после интеграции NewsSection и вернуть handoff; остановиться.

## 7. SC-3 — О клубе композиция (профиль: Site Consumer)

**Deliverable:** B · **Specs:** inlove-content-pages, inlove-news-pages, inlove-placeholder-pages · **Пути:** `services/site-ksk-inlove/src/app/about/page.tsx; services/site-ksk-inlove/src/features/contentPages/about/**` · **Зависит от:** SC-1

- [x] SC-3.1 Исторический checkpoint до note070: собрать прежнюю about-композицию, включая тогдашние payment/privacy. Текущий исполняемый критерий заменён `SC-N3.1`: about, gallery, одобренная team, reviews summary, contacts и CTA сохраняются, а payment/privacy отсутствуют.
- [x] SC-3.2 Сохранить документированные fallback, безопасный вывод и callback context «О клубе».
- [x] SC-3.3 Исторический checkpoint до note070: покрыть прежний privacy fallback. Текущий `UT-SC-06` проверяет invalid JSON, approval команды, пустые блоки, gallery selection, отсутствие payment/privacy и отсутствие ссылки `/about#privacy`, включая HTML без JS.
- [x] SC-3.V Выполнить targeted about Vitest, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 8. SC-4 — Архив новостей (профиль: Site Consumer)

**Deliverable:** B · **Specs:** inlove-content-pages, inlove-news-pages, inlove-placeholder-pages · **Пути:** `services/site-ksk-inlove/src/app/novosti/page.tsx; services/site-ksk-inlove/src/features/contentPages/newsArchive/**` · **Зависит от:** SC-1

- [x] SC-4.1 Реализовать SSR архив, featured без дубля, 3/2/1 сетку и обычную пагинацию page/limit=12.
- [x] SC-4.2 Добавить page canonical, empty/error/noindex, retry links и выход за диапазон.
- [x] SC-4.3 Покрыть UT-SC-07..08 для server pagination и состояний списка.
- [x] SC-4.V Выполнить targeted archive Vitest, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 9. SC-5 — Деталь новости (профиль: Site Consumer)

**Deliverable:** B · **Specs:** inlove-content-pages, inlove-news-pages, inlove-placeholder-pages · **Пути:** `services/site-ksk-inlove/src/app/novosti/[slug]/**; services/site-ksk-inlove/src/features/contentPages/newsDetail/**` · **Зависит от:** SC-1

- [x] SC-5.1 Создать request-time SSR route, безопасный content renderer и metadata из согласованной выборки.
- [x] SC-5.2 Обработать настоящие 404 отдельно от 401/timeout/5xx, добавить ссылку на архив.
- [x] SC-5.3 Покрыть UT-SC-09..10: прямой вход/metadata, безопасность и ошибки.
- [x] SC-5.V Выполнить targeted detail Vitest, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 10. SC-6 — Совместимость общих компонентов и route tests (профиль: Site Consumer)

**Deliverable:** B · **Specs:** inlove-content-pages, inlove-news-pages, inlove-placeholder-pages · **Пути:** `services/site-ksk-inlove/src/{ui/cards/**,ui/sections/**,features/placeholderPages/**}` · **Зависит от:** handoff SC-2a, SC-3, SC-4, SC-5

- [x] SC-6.1 Обновить прежние проверки семи заглушек: три контентные страницы плюс четыре оставшиеся и news slug routes.
- [x] SC-6.2 Адаптировать shared cards/sections лишь при необходимости для ссылок/контента без регрессии 069; перед правкой получить baseline/handoff владельца.
- [x] SC-6.3 Покрыть UT-SC-11: общий chrome, callback, четыре placeholders и unknown route 404.
- [x] SC-6.V Выполнить targeted route/component Vitest, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 11. SC-7 — Browser verification страниц (профиль: Site Consumer)

**Deliverable:** B · **Specs:** inlove-content-pages, inlove-news-pages, inlove-placeholder-pages · **Пути:** `verification only` · **Зависит от:** SC-6

- [x] SC-7a.1 Baseline real CMS: home/about/empty archive на 375/768/1440 без overflow и с одним h1; прямые загрузки без JS; callback Enter/Escape и возврат focus. Evidence `/tmp/inlove-sc7/`; остальные UI-сценарии переданы SC-7b.
- [x] SC-7b.1 Изолированный fixture API + отдельный site runtime; длинная detail без фото 375/768/1440 без overflow/один h1, title/canonical, error noindex HTTP200 и missing HTTP404 проверены; screenshots в /tmp/inlove-sc7.
- [x] SC-7b.2 Оставшиеся browser сценарии archive/no-JS/gallery/a11y по handoff SC-7b.1.
- [x] SC-7b.2a Архив с 12 длинными карточками без фото на 375/768/1440, no-JS pagination → slug → direct reload, callback focus trap и reduced-motion CSS проверены. Evidence `/tmp/inlove-sc7/archive-populated-{375,768,1440}.png`; handoff SC-7b.2a.
- [x] SC-7b.2b Изолированные fixtures gallery + long home/about, browser keyboard/gallery, metadata и оставшийся AA; затем закрыть общие SC-7 только при полной матрице.
- [x] SC-7.1 Проверить UI-01..04 на трёх viewport, JavaScript off, длинные/пустые данные, keyboard и reduced motion; вернуть screenshots/evidence в handoff.
- [x] SC-7.V Выполнить browser QA UI-01..04, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 12. QG-BE — Backend lane (профиль: Quality Gate)

**Deliverable:** C · **Specs:** назначенные contracts по contextFiles · **Пути:** `read-only backend diff` · **Зависит от:** BE-3, SC-7b

- [x] QG-BE.1 Проверить Clean Architecture, миграцию, tests и A1–A9; вернуть findings без общего вердикта.
- [x] QG-BE.V Выполнить make test + make lint, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 13. QG-FE — Site lane (профиль: Quality Gate)

**Deliverable:** C · **Specs:** назначенные contracts по contextFiles · **Пути:** `read-only site diff` · **Зависит от:** SC-7b

- [x] QG-FE.1 Проверить SSR/browser evidence, SEO, accessibility, data boundary и тесты; frontend CMS неприменим, команды выполнять в site-ksk-inlove.
- [x] QG-FE.V Выполнить npm test; npm run lint; npx tsc --noEmit; npm run build, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 14. QG-CONTRACTS — Contracts lane (профиль: Quality Gate)

**Deliverable:** C · **Specs:** назначенные contracts по contextFiles · **Пути:** `read-only affected contracts` · **Зависит от:** BE-3, SC-7b

- [x] QG-CONTRACTS.1 Сверить diff с approved tasks/specs, ownership и access matrix; NATS/AsyncAPI изменения неприменимы с обоснованием.
- [x] QG-CONTRACTS.V Выполнить diff/spec/access review, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 15. QG-LIVE — Live lane (профиль: Quality Gate)

**Deliverable:** C · **Specs:** назначенные contracts по contextFiles · **Пути:** `verification only` · **Зависит от:** QG-BE, QG-FE, QG-CONTRACTS

- [x] QG-LIVE.1 Повторить discovery PostgreSQL через docker inspect без вывода пароля; получить живые API URL/selector/auth через smoke skill.
- [x] QG-LIVE.2 Выполнить SM-01..07 только через .claude/skills/api-smoke-test (доступный alias smoke), реальная PostgreSQL, без tests/smoke pytest; вернуть evidence, очистить только свои fixtures.
- [x] QG-LIVE.V Выполнить SM-01..07 на живом API, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

### QG-LIVE-DB — миграционный slice

**Deliverable:** C · **Ownership:** verification only, отдельная временная PostgreSQL DB · **Зависит от:** QG-LIVE.1. **contextFiles/verification:** строка execution units выше. Не откатывать пользовательскую DB; независим от API.

- [x] QG-LIVE-DB.1 Выполнить migration upgrade/downgrade/backfill и DB unique из SM-05 на собственных fixtures временной DB.
- [x] QG-LIVE-DB.V Передать SQL/command evidence, очистить временную DB, вернуть handoff и остановиться.

### QG-LIVE-API — API/access slice

**Deliverable:** C · **Ownership:** verification only, собственные tenant/user/news fixtures · **Зависит от:** QG-LIVE.1. **contextFiles/verification:** строка execution units выше. Независим от DB unit при его изоляции.

- [x] QG-LIVE-API.1 Через smoke skill выполнить SM-01..04, SM-06 и concurrent same-title create из SM-05; anonymous/authenticated, no-scope/foreign policy, endpoint timings.
- [x] QG-LIVE-API.V Очистить только свои fixtures либо передать SSR точный ownership/cleanup handoff нужных записей; вернуть evidence и остановиться.

### QG-LIVE-SSR — real SSR slice

**Deliverable:** C · **Ownership:** verification only, настоящий site с real backend · **Зависит от:** QG-LIVE-API и новых SC-N units по note070. **contextFiles/verification:** строка execution units выше.

- [x] QG-LIVE-SSR.1 Выполнить SM-07: anonymous SSR archive → detail и hidden404 на реальном API, без fixture API.
- [x] QG-LIVE-SSR.V Очистить переданные свои fixtures/temporary runtime, вернуть timings/evidence/handoff и остановиться.

Родительские QG-LIVE.2/V остаются открытыми до завершения QG-LIVE-DB, QG-LIVE-API и QG-LIVE-SSR с cleanup evidence.

## 16. QG-SYNTH — Единый вердикт (профиль: Quality Gate)

**Deliverable:** C · **Specs:** назначенные contracts по contextFiles · **Пути:** `docs/reports/070_inlove_static_pages.md` · **Зависит от:** QG-LIVE

- [x] QG-SYNTH.1 Свести все lanes в один отчёт с APPROVED/REWORK; findings назначить владельцам как новые bounded units, повторять только затронутые lanes и synthesis.
- [x] QG-SYNTH.V Выполнить синтез lane evidence, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 17. SYNC-1 — Синхронизация спецификаций (профиль: Planner)

**Deliverable:** D · **Specs:** назначенные contracts по contextFiles · **Пути:** `openspec/specs/{news-public-slugs,inlove-content-pages,inlove-news-pages,inlove-placeholder-pages}/**; openspec/changes/inlove-static-pages/specs/inlove-placeholder-pages/spec.md` · **Зависит от:** QG-SYNTH APPROVED

- [x] SYNC-1.1 Через openspec-sync-specs согласовать операцию ADDED/MODIFIED placeholder с фактическим main baseline; не потерять четыре оставшихся заглушки и metadata.
- [x] SYNC-1.2 Синхронизировать четыре capabilities, проверить итоговые main specs и change строго; не архивировать до успешной проверки.
- [x] SYNC-1.V Выполнить openspec validate --strict, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

## 18. ARCHIVE-1 — Архивация (профиль: Planner)

**Deliverable:** D · **Specs:** назначенные contracts по contextFiles · **Пути:** `openspec/changes/inlove-static-pages → archive` · **Зависит от:** SYNC-1

- [x] ARCHIVE-1.1 Через openspec-archive-change архивировать проверенный change после sync, проверить archive result и вернуть итог Router.
- [x] ARCHIVE-1.V Выполнить openspec status/validate, отметить только выполненные tasks и вернуть Router handoff по AGENTS.md; остановиться в границах unit.

Checkpoint BE-3b (partial): news-specific public selector 401, A1–A9 real DI/AuthService/JWT tests и route inventory109 готовы. BE-3.2 завершён. BE-3.3 остаётся открытым только для structural DTO 422 (UT-BE-12); BE-3.V передан BE-3c. Verification: scoped format PASS; make lint PASS; make test: 1392 passed, 5 skipped, 2 failed — test_news_access.py::test_news_validation[payload1-422-POST/PATCH], фактический400 вместо422. Причина: общий RequestValidationError handler в src/main.py вне BE-3b ownership. BE-3c меняет только news-specific condition handler и structural tests, затем повторяет backend verification. Остальные API сохраняют текущие статусы.

Принятый split SC-7: SC-7a — baseline на текущих CMS данных (home/about/empty archive, responsive/no-JS/callback); SC-7b — изолированный временный fixture API без изменения CMS, published detail/pagination/long/no-photo/gallery/error/404, оставшиеся keyboard/focus/reduced-motion/AA и metadata сценарии UI-01..04. SC-7b получает handoff SC-7a; QG начинается после SC-7b. Общие SC-7.1/SC-7.V закрываются только после всей матрицы.

Принятый Router split SC-7b: SC-7b.1 — изолированный fixture runtime, опубликованная длинная detail без фото (375/768/1440), missing/error и HTTP outcomes; SC-7b.2 — archive pagination/no-JS navigation, gallery, keyboard/focus trap/reduced motion/AA, оставшиеся home/about long-data и metadata. Setup потребовал отдельной атомарной части; QG после SC-7b.2. Runtime код и реальные CMS записи не изменяются.

Принятый Router split SC-7b.2: SC-7b.2a завершает archive/no-JS/callback focus/reduced motion; SC-7b.2b — temporary fixture gallery/long home/about + оставшаяся AA/metadata проверка, verification-only ownership, зависит от handoff SC-7b.2a. QG после SC-7b.2b.

## Промежуточная заметка 070 — авторизованное продолжение

Уточнение пользователя разрешает эти изменения и seed данных; дополнительный approval не требуется. Старые checkbox отражают предыдущий checkpoint, не отменяют новые критерии. Execution units/ownership/context packs/DAG — `design.md` → «Промежуточная заметка 070». Новые runtime units запускаются последовательно по указанным зависимостям, каждый с отдельным handoff.

- [x] DATA-N1.1 Подготовить и применить tenant-scoped повторяемый seed трёх mock news и редакционных about settings с обратимостью; проверить NOTE-06 и вернуть handoff.
- [x] DATA-N1-FIX.1 Заменить конфликтный no-op news seed на tenant/id scoped guarded upsert; проверить повторный apply, repair собственного drift, неизменность backup/slug/published_at и безопасность чужих/существующих строк.
- [x] SC-N1.1 Выполнить hero photo/4 square cards/local icons/remove prices и зависимый loader cleanup; проверить NOTE-01 и вернуть handoff.
- [x] SC-N2.1 Реализовать общий контактный блок и settings-based widget map; проверить NOTE-02 и вернуть handoff.
- [x] SC-N3.1 Убрать about payment/privacy, использовать settings text, устранить мёртвые policy fragment ссылки с сохранением callback consent; проверить NOTE-03 и вернуть handoff.
- [x] SC-N4.1 Исправить QG-FE typography/AA findings на обновлённом UI; проверить NOTE-04 и вернуть handoff.
- [x] SC-N5.1 Исправить QG-FE mobile gallery swipe; проверить NOTE-05 и вернуть handoff.
- [x] DOC-N1.1 Согласовать scheme/components с окончательной композицией note, без обновления прочих маршрутов; вернуть handoff.
- [x] QG-NFE.1 Актуализировать frontend lane по новому diff и NOTE-01..05/manual QA; переиспользовать прежнее evidence где применимо.
- [x] QG-NCONTRACTS.1 Актуализировать contracts lane после DOC-N1 по итоговым specs/tasks и сохранённой access matrix; lane завершён с blocking finding о противоречащих note070 старых критериях.
- [x] DOC-N1-FIX.1 Устранить только противоречия исполняемых критериев в `tasks.md`/`design.md`: сохранить закрытые исторические checkpoint, а актуальные test/manual QA проверки привести к отсутствию price block/price fetch на home и payment/privacy/`/about#privacy` на about.
- [x] QG-NCONTRACTS-RERUN.1 После `DOC-N1-FIX` повторить contracts lane по итоговым specs/tasks/design и подтвердить отсутствие активных противоречий; access matrix и runtime scope не пересматривать.
- [x] QG-NSSR.1 После новых UI lanes и DATA-N1 выполнить актуальный LIVE SSR в рамках существующего LIVE split с тремя реальными seed news/settings; передать evidence QG-SYNTH.

QG-SYNTH/SYNC/ARCHIVE ожидают новые note tasks и применимые LIVE units. Backend PASS сохраняется при отсутствии нового backend runtime diff; новые mock записи не являются поводом повторять 1398 unit tests.
