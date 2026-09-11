# Design — inlove-static-pages

Тикет: `docs/tasks/070_inlove_static_pages.md` · Дата: 2026-09-09 · Сервисы: backend, site-ksk-inlove.

## Context

069 создал компоненты/оболочку и семь заглушек; часть QA ещё не закрыта. Код news хранит HTML content, но публичный DTO его не отдаёт и lookup принимает UUID. Прямой запрос 070 требует отдельный slug route и весь контент SSR. Эти факты отличаются от прежних намерений inline-only в scheme/components.

## Goals / Non-Goals

**Цели:** полноценные главная, новости с detail и about; SSR всех индексируемых секций; доступный responsive; настоящий сохраняемый slug и Public Read full content.

**За границами:** CMS UI редактор slug, другие site routes, deploy, NATS, новая БД/сервис, изменение seed данных. Миграция существующей news таблицы входит в scope.

## Decisions

### News storage

`news.slug VARCHAR(160) NOT NULL`, `UNIQUE(equestrian_id, slug)` для всех строк. Генерация сервером один раз: lowercase транслитерация кириллицы существующим алгоритмом `_generate_slug`, ASCII `[a-z0-9-]`, схлопывание/trim дефисов, основа до 127 символов (trim после усечения), fallback `news`, затем `-` и полный UUID.hex (32). Это утверждённое решение: URL длиннее, зато конкурентные одинаковые заголовки не требуют счётчиков/повторных insert и не ломают уникальность. UUID уже существует в Entity до сохранения. Алгоритм миграции заморожен локально, не импортирует изменяемый runtime domain.

Slug неизменяем при PATCH name/content, не редактируется через новые inputs. Старые CMS payloads сохраняются. Read DTO содержит slug. Backfill охватывает deleted/scheduled. Схема, entity и миграционные tests — BE-1; runtime generator и lookup — BE-2; DTO/API — BE-3. Окончательная ревизия миграции выбирается по актуальному Alembic head, не выдумывается на планировании. Уникальность должна обеспечиваться DB; случайное повторное использование UUID уже отклоняется PK.

Рассмотрены альтернативы: frontend synthetic slug не даёт backend lookup; изменяемый slug от name ломает ссылки; slug с числовыми коллизиями требует дополнительной конкуррентной координации. Выбран сохраняемый slug с UUID suffix как минимальный стабильный контракт. Редакторское переопределение и redirects остаются вне scope.

### API и access matrix

Новый `GET /api/news/by-slug/{slug}` (раздельный сегмент исключает конфликт с UUID path), существующий UUID detail получает full-content DTO. Public list остаётся компактным, добавляет slug. CMS list/create/update output добавляет slug. Точный нормативный контракт и строки A1–A9: `specs/news-public-slugs/spec.md` → «Access matrix news»; ниже приведена та же матрица для implementation context. Public content не содержит is_deleted/deleted_at/служебные timestamps; фото используют существующую tenant-safe сборку URL. Public lookup ограничен tenant, временем и soft delete на repository/service boundary. Protected Write роли и старые missing-resource 400 сохраняются.

| ID | method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|---|
| A1 | GET | `/api/news` | Public Read | любые | valid selector: 200 | valid selector: 200, тот же public DTO |
| A2 | GET | `/api/news/by-slug/{slug}` | Public Read | любые | valid selector: 200 либо 404 | valid selector: 200 либо 404, без privileged bypass |
| A3 | GET | `/api/news/{news_id}` | Public Read | любые | valid selector: 200 либо 404 | valid selector: 200 либо 404, без privileged bypass |
| A4 | GET | все A1–A3, selector отсутствует | Public Read | любые | 401 | 401 |
| A5 | GET | все A1–A3, selector невалиден | Public Read | любые | 401 | 401 |
| A6 | GET | `/api/news-cms` | Protected Read, исключение | admin scopes | 401 | 200 свой tenant; 403 без scope |
| A7 | POST | `/api/news` | Protected Write | admin scopes | 401 | 201 свой tenant; 403 без scope; 400 бизнес-валидация |
| A8 | PATCH | `/api/news/{news_id}` | Protected Write | admin scopes | 401 | 200 свой ресурс; 403 без scope; 400 отсутствующий/чужой ресурс согласно текущему контракту |
| A9 | DELETE | `/api/news/{news_id}` | Protected Write | admin scopes | 401 | 204 свой ресурс; 403 без scope; 400 отсутствующий/чужой ресурс согласно текущему контракту |

Missing/invalid protected tenant context для A6–A9 → `401`; структурные ошибки DTO сохраняют `422`. Защищённый GET A6 — исключение для служебной CMS проекции. Anonymous/authenticated tests A1–A9: UT-BE-08..12 и SM-01..04.

### Данные и SSR

Существующий API client обеспечивает selector и удаление CMS credentials. News wrappers принадлежат Site Consumer. Request-time SSR (`force-dynamic`, news fetch `no-store`) исключает выдачу удалённой/чужой записи из shared cache. React request memoization допустима для согласования metadata/detail. Settings используют текущий безопасный loader; без новых межtenant кешей. Независимые home/about запросы параллельны и возвращают discriminated success/empty/error; timeout bounded существующим client. HTML контент ожидается до завершения серверного рендера; skeleton допустим только как временный streaming fallback, не как конечный индексируемый блок.

Home: settings `home.hero_*`, `home.program_benefits`, `home.club_benefits`; локальная фотография hero, четыре квадратные service cards; без prices fetch/блока стоимости; news page 1 limit 1; shared contacts. About: `about.intro/setting/features/gallery_photo_ids`, `team.people`, `reviews.summary`, общие контакты; без payment/privacy. Безопасные current settings parsers переиспользуются; если отсутствуют — page-local parsers. Команда включается только при явном editorial approval по существующему shape settings; неизвестное/отсутствующее approval означает скрыть. Галерея — не более 24 публичных фото; заданный список IDs пересекается с fetched фото, отсутствующие IDs не выдумываются; без списка используется документированный общий fallback. Ссылки на удалённый /about#privacy убираются; существующий настроенный действительный policy URL сохраняется, согласие callback не отключается.

News pagination: URL `?page=N`, API использует page/limit (не выдумывать offset interface), limit=12 фиксирован, page 1 canonical без query, N>1 с query. Невалидный page → redirect на `/novosti`; превышение total при N>1 → 404. API list sorting дополняется UUID tie-breaker. Нет load-more client state, поскольку нужны полноценные доступные без JS страницы. Настройка `news.load_more_label` может использоваться для следующей ссылки; добавление size/filter/search UI не требуется.

Sanitizer на сервере допускает p/br/strong/em/ul/ol/li/blockquote/h2/h3/a и безопасные http(s)/relative ссылки, удаляет script/style/iframe, on* и javascript/data URLs; изображения берутся из photos DTO через существующие media компоненты, raw HTML img не нужен. Metadata строится из plain text. Callback/modal и gallery остаются островами интерактивности; контент SSR.

### Переход 069

`inlove-placeholder-pages` отсутствует в main specs на момент планирования, поэтому delta 070 использует ADDED с полным итоговым текстом двух требований. Source baseline — `openspec/changes/inlove-site-header-footer/specs/inlove-placeholder-pages/spec.md`; оригинал не редактируется сейчас. DOC-1 зафиксировал разрешённый Router read-only snapshot ниже и обновил scheme/components; handoff владельца 069 не предоставлен. Не требуется безусловное завершение всего 069 до SC-1, но одновременное изменение общих paths запрещено.

Перед SYNC-1: если 069 уже синхронизирован, Planner меняет операцию этого delta на MODIFIED по точным именам двух требований и применяет полный итоговый текст; если отсутствует — ADDED создаёт capability. Router обязан исключить позднее применение старого 069 placeholder delta поверх 070: либо 069 sync раньше 070, либо отдельный порученный Planner unit согласует оставшийся 069 delta с актуальным итогом перед его sync. Нельзя считать 069 полностью approved без его QG. Если ни один порядок пока нельзя обеспечить, блокируется только sync/archive 070, а не независимая реализация. QG-CONTRACTS проверяет recorded baseline и порядок.

## Risks / Trade-offs

- [Дополнительный backend scope] → пользователь подтвердил Apply, включая миграцию/slug/API.
- [Небезопасный seeded HTML] → server allowlist sanitizer и malicious fixtures.
- [Слабый/пустой CMS контент] → независимые fallback, никаких выдуманных отзывов/людей.
- [Общие paths 069] → path-scoped handoff и последовательное ownership.
- [Live окружение меняется] → повторный inspect в QG-LIVE; не объявлять SM успешными по mocks.

## Migration Plan

После approval: DOC-1 и BE-1 независимы; BE storage/domain/API затем site data/pages. DB expand/backfill/constraint выполняется в миграционной транзакции; downtime/lock на news согласуется на фактическом объёме в BE-1 handoff. Проверить upgrade/downgrade на тестовой реальной PostgreSQL с fixtures. Сначала совместимый backend, затем site; автоматический production deployment не входит. При откате сайта backend/slug можно оставить, чтобы сохранить ссылки; destructive downgrade удаляет только новое поле/индекс после отката backend, не удаляет новости. QG APPROVED → sync → strict validation → archive.

## Deliverables

- **A / Backend:** news model/entity/migration/domain/protocol/repository/DTO/API и профильные tests; `news-public-slugs` как контракт реализации.
- **B / Site Consumer:** три страницы, news detail, page-local services/components, news API/types, scoped shared compatibility; зависимости пакета sanitizer. Общие paths всех B units остаются у одного профиля; units SC-2..5 имеют непересекающиеся page directories и не правят shared UI.
- **C / Quality Gate:** read-only lanes; только QG-SYNTH пишет один `docs/reports/070_inlove_static_pages.md`.
- **D / Planner:** scheme/components согласование, OpenSpec delta/main sync и archive. Runtime код не меняет.

## Execution units

В таблице paths относительно repo, сокращённые `src` в contextFiles — соответствующего сервиса; spec/design — текущего change; scheme/components — `docs/sites/inlove`. Каждый исполнитель получает только свои contextFiles плюс handoff зависимостей. `proposal.md` прочитан PLAN-1/2, повторно не назначается. Профильные инструкции: ядро по протоколу, только секции своего slice. Для каждого SC unit обязательно `agents/howto/site-ksk-inlove-design.md`, design specification раздел 0, 101.4–101.7, master prompt 100 и относящийся к композиции раздел, выбранный по оглавлению; это точечный design context, не весь документ.

Backend verification — одна сервисная группа `make format`, `make test`, `make lint` в backend согласно профильному контракту; форматирование не должно менять чужие paths. Site targeted Vitest использует конкретные tests unit, полный site pipeline у QG-FE. Каждый unit заканчивается task checkbox фактически выполненного и коротким handoff; при превышении бюджета partial + split, без продолжения целого deliverable.

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

Принятый split SC-2: SC-2a — готовая серверная главная и tests; SC-2b после SC-6 — только замена latest article на SSR-safe NewsSection в HomeContent.tsx с корректировкой HomeContent.test.tsx/home.module.css, закрытие SC-2.1 и targeted home Vitest. Shared adapter принадлежит SC-6; SC-7 ожидает SC-2b.

DAG:

```text
approval → DOC-1 ─────────────────┐
approval → BE-1 → BE-2 → BE-3a → BE-3b → BE-3c ──┴→ SC-1 → {SC-2a, SC-3, SC-4, SC-5} → SC-6 → SC-2b → SC-7a → SC-7b.1 → SC-7b.2
все implementation units → {QG-BE, QG-FE, QG-CONTRACTS} → QG-LIVE.1 → {QG-LIVE-DB, QG-LIVE-API}
{QG-LIVE-API, новые SC-N units} → QG-LIVE-SSR
{QG-LIVE-DB, QG-LIVE-API, QG-LIVE-SSR} → QG-LIVE.2/V → QG-SYNTH
QG-SYNTH APPROVED → SYNC-1 → ARCHIVE-1
```

Принятый split QG-LIVE: discovery завершён; DB и API независимы только при отдельной временной DB для миграций. DB не откатывает пользовательскую базу; API меняет только свои fixtures. SSR начинается после API и новых SC-N units из note070. Родительские QG-LIVE.2/V закрываются только после evidence всех трёх units и cleanup; отдельные lane reports не создаются.

Lanes все применимы: Python diff, site diff, contracts всегда, runtime API для LIVE, SYNTH всегда. NATS внутри LIVE неприменим: news endpoints не производят событий и NATS diff нет. Общий вердикт только у SYNTH. Rework назначается новым unit владельца, проверяются затронутые lanes и SYNTH.

## Test matrix

| ID | Ось и сценарий | Трассировка | Где |
|---|---|---|---|
| UT-BE-01 | Backfill существующих, scheduled/deleted, same name, Unicode/пустая ASCII основа | news-public-slugs: Backfill и изоляция | BE-1 |
| UT-BE-02 | Unique tenant constraint и сохранность UUID/content при upgrade/downgrade | news-public-slugs: Стабильный сохраняемый slug | BE-1 |
| UT-BE-03 | Длина ≤160, формат, одинаковый алгоритм frozen/runtime fixture | news-public-slugs: Создание и переименование | BE-1/BE-2 |
| UT-BE-04 | Create old DTO и разные UUID при одинаковом name | news-public-slugs: Создание и переименование | BE-2 |
| UT-BE-05 | PATCH name/content и delete не меняют slug | news-public-slugs: Создание и переименование | BE-2 |
| UT-BE-06 | Lookup tenant + deleted/future/notfound; published boundary | news-public-slugs: Скрытая или чужая новость | BE-2 |
| UT-BE-07 | List stable order при одинаковом published_at; DB error не превращается в empty/404 | news-public-slugs: Публичный lookup | BE-2 |
| UT-BE-08 | Anonymous/authenticated public list/slugs/UUID DTO, content только detail | A1–A3 | BE-3 |
| UT-BE-09 | Missing/invalid selector с auth/без auth и разные tenant | A4–A5 | BE-3 |
| UT-BE-10 | Auth не открывает будущие/deleted/foreign через public detail | A2–A3 | BE-3 |
| UT-BE-11 | Anonymous 401, no scope 403, allowed scope 200/201/204; missing/foreign 400 без mutation | A6–A9 | BE-3 |
| UT-BE-12 | UUID route regression; business 400/structural 422; unchanged CMS payload | A3, A7–A8 | BE-3 |
| UT-SC-01 | API boundary selector, no auth/cookie, exact page/limit и slug URL | news pages: оба requirement | SC-1 |
| UT-SC-02 | success/empty/error/401/404/timeout/invalid DTO loaders | news pages: Ошибка данных/Сбой backend | SC-1 |
| UT-SC-03 | Request memoization согласует metadata/content без shared tenant cache | news detail | SC-1 |
| UT-SC-04 | Sanitizer script/on*/unsafe URL, безопасный текст/ссылки сохраняются | content pages: Серверная безопасность и SEO | SC-1 |
| UT-SC-05 | Home SSR полный/пустой/частичный сбой, четыре service cards, latest link; отсутствие price block и price fetch | content pages: главная | SC-2 / SC-N1 |
| UT-SC-06 | About malformed settings/approval/gallery; отсутствие payment/privacy и мёртвой ссылки `/about#privacy` в HTML без JS | content pages: О клубе | SC-3 / SC-N3 |
| UT-SC-07 | Initial page1/12, page2/12, last/invalid/out-of-range; no duplicates | news pages: Пагинация без JavaScript | SC-4 |
| UT-SC-08 | Список data/loading fallback/empty/error/link interaction, 3/2/1 | news pages: Архив | SC-4 |
| UT-SC-09 | SSR detail direct entry, h1/metadata/canonical/safe content | news pages: Прямой вход | SC-5 |
| UT-SC-10 | Upstream 404 vs 401/5xx/timeout, noindex errors | news pages: Удаление/Сбой backend | SC-5 |
| UT-SC-11 | 3 content routes + 4 placeholders + slug detail + unknown404, chrome/callback | placeholder capability | SC-6 |
| UI-01 | Viewports 375/768/1440 всех четырёх видов страниц, длинные тексты/без фото | content pages: Адаптивная доступность | SC-7 |
| UI-02 | JS off: весь требуемый контент и metadata, news pagination/detail; home без price block/price fetch, about без payment/privacy и `/about#privacy` | news/content SSR | SC-7 / SC-N1 / SC-N3 |
| UI-03 | Keyboard/focus, callback, gallery, reduced motion, AA contrast | content pages: Адаптивная доступность | SC-7 |
| UI-04 | Real browser: пустые/ошибочные блоки, 404, no horizontal overflow | все page scenarios | SC-7 |
| SM-01 | GET list anonymous/auth, опубликованная новость со slug; UUID и slug detail совпадают | A1–A3 | QG-LIVE |
| SM-02 | Public reads missing/invalid selector при auth и без | A4–A5 | QG-LIVE |
| SM-03 | Future/deleted/foreign/notfound обе детали →404; list их исключает | A1–A3 | QG-LIVE |
| SM-04 | CMS GET/create/update/delete: anonymous/no-scope/admin и чужой ресурс | A6–A9 | QG-LIVE |
| SM-05 | Реальная PostgreSQL migration/backfill/unique и два одинаковых name concurrent create | slug storage | QG-LIVE |
| SM-06 | Rename не меняет slug, full content отражает PATCH, soft delete закрывает public routes | slug stability, A2–A3/A8–A9 | QG-LIVE |
| SM-07 | Live SSR archive → detail без CMS auth, 404 скрытой новости | news pages | QG-LIVE |

Site UI page-size/filter/search controls отсутствуют: их reset-сценарии неприменимы, фиксированный limit проверяется UT-SC-07. CMS frontend diff отсутствует, scope-sensitive UI/mutations не добавляются; callback regression остаётся в UT-SC-11, его API не меняется. Tests API boundary используют mocks, live API только в SM. Миграционная реальная проверка не подменяется static test файла миграции. Отдельных tests/smoke pytest нет.

## PostgreSQL для smoke-тестов

Discovery 2026-09-09: основной label `project=eqsitecms, service=db` ничего не дал; fallback по имени нашёл `7c720ddc783d /eqsitecms-db`. `docker inspect` подтвердил `postgres:16`, compose project `eqsitecms-core`, service `db`, aliases `eqsitecms-db, db`, network `eqsitecms_network`, DB/user `eqsitecms`, host `5433` → container `5432`. Пароль присутствует в `Config.Env`, намеренно не выведен/не записан; QG-LIVE читает его напрямую inspect в memory/env. Это evidence discovery, не постоянные credentials в тестах. QG-LIVE повторяет inspect и получает BASE_URL/TENANT_A/TENANT_B/ADMIN_TOKEN/NO_SCOPE_TOKEN, IDs и slug собственных fixtures через skill; запрещено использовать произвольные пользовательские записи для delete. При недоступном API/DB lane blocked, не APPROVED. NATS проверка неприменима по отсутствию событий.

## Manual QA steps

UI-01: открыть home/about/archive/detail в 375/768/1440, проверить порядок и отсутствие overflow с длинным заголовком/пустой фотографией.
UI-02: отключить JS, загрузить напрямую каждую страницу, перейти пагинацией и slug-ссылкой, проверить серверный source/metadata; на home подтвердить отсутствие блока стоимости и browser price fetch, на about — отсутствие payment/privacy и ссылки на мёртвый `/about#privacy`.
UI-03: пройти links/CTA/gallery клавиатурой, focus/escape callback, reduced motion и контраст.
UI-04: подать empty/error fixtures, затем published/missing slug; проверить локальность сбоя и настоящие HTTP статусы. Сохранить короткие browser evidence в handoff SC-7; только QG-SYNTH создаёт общий report.

## Open Questions

Пользователь явно подтвердил Apply (Router → DOC-1, 2026-09-09), включая backend migration/API и решения specs/design. Открытых продуктовых вопросов нет. Baseline ниже является snapshot, а не handoff владельца 069.

## DOC-1 baseline и порядок sync (2026-09-09)

Router сообщил: активных агентов 069 в текущем thread нет, handoff владельца отсутствует; разрешён read-only snapshot. Это не подтверждение завершения или QA 069. Root HEAD `f24fd327dbe6a1521f0b40329e75cb7163def629`; site HEAD `3fc0a0ad53b5df8b86be1e10c195a97906a75f9a`. Site working tree dirty: modified package manifests, API client/test, app globals/layout, siteSettings provider/context/index/loader, types/callBackRequest; untracked app page/about/loshadi/novosti/uslugi, callback components, placeholderPages, siteChrome, loader test и ui. Hashes ниже фиксируют фактическое содержимое, включая untracked shared paths. DOC-1 site-файлы не менял.

Перед SC mutation сравнить hashes назначенных shared paths и передать этот baseline следующему исполнителю. Изменившиеся paths согласовать с Router/владельцем последовательно; это не блокирует независимые paths. Оставшиеся QA 069 используют этот snapshot для отделения своей работы от 070; их вердикт не подменяется.

Порядок по умолчанию: после QG 070 SYNC-1 применяет актуальный delta 070 (ADDED, если capability ещё отсутствует; MODIFIED, если 069 уже создал её). Старый placeholder delta 069 после этого **не применяется**: до любого последующего sync/archive 069 Router поручает отдельный Planner unit согласовать его с итоговой main capability и повторить contracts validation; archive 069 не должен повторно синхронизировать старый текст. Альтернатива — подтверждённый QG/sync 069 раньше SYNC-1 070. Если порядок не обеспечен, останавливаются только sync/archive, не реализация 070. Исходный delta 069 в DOC-1 не изменялся.

| Site path (от services/site-ksk-inlove) | SHA-256 snapshot |
|---|---|
| `package-lock.json` | `858926f88a412d3842841493f0eb57179a209597dfa276b477935c2777dd7b9f` |
| `package.json` | `43bc7306b2f796dc56012789baf3038a62bcf2556bb8886cd542448436962dad` |
| `src/api/callBackRequest.test.ts` | `244be680462eef7eb57b07e759faf4c035370bd4847f46a23cd55b2079367af6` |
| `src/api/callBackRequest.ts` | `415928a7a4a40577e33ac2041d58bbb182ff1681f7e3d9171b69f35b77da9a6e` |
| `src/api/client.test.ts` | `fd3c0bd1b8efd223e6e14861a4e50567555ebfb0da48a5bae2562aa399b2abd9` |
| `src/api/client.ts` | `fb88d867547672b9bf70c7eb2518c23d2d28603a2ea8122089a79ed13204a799` |
| `src/api/horse.ts` | `eff79720152885f7f648549415977a6c8ae5cde82d718ae48f5ebbce81ea5623` |
| `src/api/horseBreeds.ts` | `5713a817e519069f663f5539287ff7e34546238c55f1e2375dfea89c0f078f6b` |
| `src/api/horseCoatColor.ts` | `ec392a69cdd9ac1fb2d10985e4843c5d1e9a30f361b2fb4cb23b349cf8eaa55c` |
| `src/api/horseOwners.ts` | `6cd623aed2f3f24841ec3f5bb91d59c015668f37ed8c654e5722a2042534486b` |
| `src/api/horseServices.ts` | `b67fec84fd8f54aff3e7c0ce44ba6021db25b8672755fe45f82d5a54f3010f60` |
| `src/api/price.ts` | `8178807d78485411b2959c8549d28452482d46ced5775d7bfa87641fed23b629` |
| `src/api/priceGroups.ts` | `51a81f3a6728d828e00313b1762500395960f7bc85d1758c4fd2f892325f6a89` |
| `src/api/publicReadWrappers.test.ts` | `deacf14bc737219c5c48938fca176c0b05389070589135ca61a78a59229a2362` |
| `src/api/siteSettings.ts` | `d2b5377021e074cef5f1ef82d040f7d5a2176adc82b3b1d07e0efcdbe7267122` |
| `src/app/about/page.tsx` | `9ad0859454cb1d3abdb1b5b0b0866746580119deba5ceb9cee05bd39fc2a46c6` |
| `src/app/global-error.tsx` | `b82930b6f2848b57fa03a0f685d327008345ffa08d337e71051419d3191e41ad` |
| `src/app/globals.css` | `a92f53856ef820d9b3c7f4a08c3a2bb7b7437e40a829f6a71f3203768ab7676c` |
| `src/app/layout.tsx` | `c2b734660d252163a1e4328d0d07ca07c650ba37e102f30f3c0967df277c4573` |
| `src/app/loshadi/page.tsx` | `227c64766f56414fa125dd6e48ffeca90c8f2f117571872898d4df0adac1639e` |
| `src/app/novosti/page.tsx` | `fe6639452f9175948338435e1c686dd9d1f65bbabd2b3d5686a8f4425fc5e70b` |
| `src/app/page.tsx` | `748c51d55f338270ec66869cf33dd7be3323464a8f868be671e0f39cfb36f4c8` |
| `src/app/uslugi/postoy/page.tsx` | `e2c441e7ed3ef0569f0343dd20cb39cceda46635f484db47b293fba14352f80d` |
| `src/app/uslugi/progulki/page.tsx` | `4f1af3df595579d15ea5af8e54d87accb837748e343752e3670beacc8dadcace` |
| `src/app/uslugi/zanyatiya/page.tsx` | `89995deaab536688ed95e4e653beddc05e7ecae98fdc3257b9154127319f2e62` |
| `src/features/placeholderPages/UnderConstructionPage.tsx` | `491cdc9fed1ae01492e6bfecd7c17c4016d7050250d9bdd212441540118e0d19` |
| `src/features/placeholderPages/index.ts` | `1a0eb51e586fe5e7be0b9f6df83a2466fc717d1eaca459b58212f5e614e92586` |
| `src/features/placeholderPages/metadata.ts` | `c1d8d78eb674b630463675e1939e41de7fddf81bd2501fcd489edd4bb0120735` |
| `src/features/placeholderPages/placeholderPages.module.css` | `375d8cde20ccb7c923cce26ff015dcf32aaac715414337323ad21d5b3e7e0ac4` |
| `src/features/placeholderPages/placeholderPages.test.tsx` | `25e84d9116bf259a0e76bd19c4ee9d1482c600140b318c04976bc0abefdfc1cf` |
| `src/features/placeholderPages/routeTree.test.ts` | `9f714872618fc470d6df78165abce70b2b6cd8cee8bf455d175c556028c59c98` |
| `src/features/siteChrome/SiteChrome.tsx` | `48c352fd98c09f0974ef2dc13bde9cbc8b366124b3ac220fbb29f1789b8a4554` |
| `src/features/siteChrome/index.ts` | `a696b3f496b1e7c5438bcf239028e1060b6cdc635f9e528ae66665c2788ae35e` |
| `src/features/siteSettings/SiteSettingsProvider.test.tsx` | `956550e5fb6768e8a6496205619354862b9a787d06edad29fd92c469e2d5ae10` |
| `src/features/siteSettings/context/SiteSettingsContext.tsx` | `eb560e67499cc0d4a87faede44563497d46facac8ea8e556781e8f3839067cd0` |
| `src/features/siteSettings/index.ts` | `a93fd8b9a4ed41fe6dfdfa4eef0eec884b6289471c20527acad8c43939a255d8` |
| `src/features/siteSettings/providers/SiteSettingsProvider.tsx` | `786f19aea47642d39fc3eaa4a0c77982082490a9ca69ce939b3b85d57f4b285a` |
| `src/features/siteSettings/services/getSiteSettings.test.ts` | `aa84ffef9cdea813d84ed974e62610125eeb009c532873d3ce17f82cb5a7a0de` |
| `src/features/siteSettings/services/getSiteSettings.ts` | `2b807464623a2721bdcf9401ecee6910aefbcb3e0efa75befd239f61c336e409` |
| `src/ui/cards/cards.module.css` | `f34952201df81b11299a1492d7e654d00407208f2ab13f864f1c28178ade8b0c` |
| `src/ui/cards/cards.test.tsx` | `47c5413a8896e1ceb344daa99ec653c06f6fb88eccbeaa112c304ddf12c7c659` |
| `src/ui/cards/index.tsx` | `34cd6b40e7ade542cc95e412b32de9eb192756782bba01b451446c64d327f9b6` |
| `src/ui/sections/index.tsx` | `2c500a98b2a5da220f049e731d5e7668fe35d8fffe34396e6a6c756b7430fcad` |
| `src/ui/sections/sections.module.css` | `0aab932df4e00eeef0f0a227ab26c512f2f64f007a5802915eec5cee612f7e8d` |
| `src/ui/sections/sections.test.tsx` | `9307c0ab5cf15955cedfcbb339308d021c4707bf5ea2634a9c6aefdd0557baff` |

Принятый split SC-7: SC-7a — baseline на текущих CMS данных (home/about/empty archive, responsive/no-JS/callback); SC-7b — изолированный временный fixture API без изменения CMS, published detail/pagination/long/no-photo/gallery/error/404, оставшиеся keyboard/focus/reduced-motion/AA и metadata сценарии UI-01..04. SC-7b получает handoff SC-7a; QG начинается после SC-7b. Общие SC-7.1/SC-7.V закрываются только после всей матрицы.

Принятый Router split SC-7b: SC-7b.1 — изолированный fixture runtime, опубликованная длинная detail без фото (375/768/1440), missing/error и HTTP outcomes; SC-7b.2 — archive pagination/no-JS navigation, gallery, keyboard/focus trap/reduced motion/AA, оставшиеся home/about long-data и metadata. Setup потребовал отдельной атомарной части; QG после SC-7b.2. Runtime код и реальные CMS записи не изменяются.

Принятый Router split SC-7b.2: SC-7b.2a — archive responsive/no-JS pagination/direct slug, callback focus trap и reduced motion (done); SC-7b.2b — расширение temporary fixtures для gallery и длинных home/about, keyboard gallery, metadata и оставшийся AA. Ownership verification-only, runtime repo/CMS не изменять. SC-7b.2b получает handoff SC-7b.2a, contextFiles: manual QA steps, targeted gallery/settings contracts. QG после SC-7b.2b.

## Промежуточная заметка 070

Авторизовано новым «изучи её и продолжай работу». Этот раздел и актуальный content spec заменяют прежние требования семи блоков/стоимости/payment/privacy и старые UI-ожидания этих блоков. Задача — завершить без нового backend scope: сохраняем PASS QG-BE (1398 tests/lint), повторяем backend проверки только при новых изменениях или конкретных findings. QG-FE и QG-CONTRACTS требуют актуализации по итоговому UI/spec diff; это не отменяет собранное evidence. LIVE DB/API идут независимо от UI; LIVE SSR — после новых UI units и seed.

### Уточнения результата

- Hero получает красивое фото из `docs/parsings/ksk.inlove/`, скопированное в локальный public asset с происхождением; price API перестаёт быть источником hero. Четыре квадратные карточки адаптируются на 375/768/1440; иконки создаются как локальные SVG в существующем визуальном стиле. Растровая генерация для простых иконок не нужна.
- Три контакта трактуются как существующие каналы телефона и соцсетей из settings, а не три произвольно выбранных конфликтующих номера из parsing. Проверить фактические данные при DATA-N1; не выдумывать недостающие контакты. «Все ссылки» относится к явно указанному блоку контактов, включая карту и телефон; основную навигацию не менять.
- DATA-N1 создаёт ровно три идентифицируемые mock новости в tenant INLOVE, повторный запуск не дублирует их и не удаляет существующие. Текст нейтральный редакционный, без вымышленных дат событий, достижений и фактических обещаний. Тексты about генерируются в `about.intro/setting/features` по имеющимся материалам, сохраняются в реальных site-settings, SSR берёт их оттуда. Снимок прежних затронутых settings и IDs seed записей обеспечивает обратимость. Используется существующий authenticated API или точечная транзакция с tenant scope; массовый повтор старого seed.sql запрещён.
- Карта повторяет самостоятельную реализацию widget из site-ad, без cross-site импорта. Настройки `contacts.coordinates` и `contacts.maps_url` сохраняются: координаты задают iframe, maps_url — внешнюю ссылку.
- Удаление privacy блока не создаёт новый маршрут и не придумывает legal текст. Убрать только ссылки с мёртвым `/about#privacy` (footer/callback и fallback); если есть существующий другой действительный policy URL, сохранить его. Сам checkbox согласия, валидация и callback mutation остаются.

### Дополнительные execution units и context packs

Все units Site Consumer относятся к deliverable B; DATA-N1 — Backend deliverable A (только seed/data), DOC-N1 и DOC-N1-FIX — Planner D. Общий минимальный context: этот раздел, content spec только соответствующее требование, handoff непосредственного предшественника. Каждый unit выполняет только свой slice и одну группу verification; таблица задаёт точные дополнительные contextFiles. Shared paths назначены последовательно одному профилю.

| Unit | Результат и ownership | Зависимости | Дополнительный context pack | Verification |
|---|---|---|---|---|
| DATA-N1 | Три mock новости + about settings; `docs/sites/inlove/070_content_seed.*`, реальные записи только tenant INLOVE | NOTE-1; готовый live backend/schema | `docs/tasks/070_inlove_static_pages.md`: заметка; `docs/sites/inlove/seed.sql`: tenant/settings; news API create DTO; LIVE discovery handoff | targeted live readback settings/list/detail и повтор seed без дублей |
| SC-N1 | Hero/photo, 4 cards/icons, убрать цены/fetch; `features/contentPages/home/**`, `features/contentPages/services/{loaders.ts,loaders.test.ts}`, `public/images/070-*`, `public/icons/070-*` | NOTE-1 | content spec: Главная; `docs/parsings/ksk.inlove/` индекс медиа; текущие home/loaders | targeted home/loaders tests |
| SC-N2 | Shared contacts/map: `ui/{sections,media}/**`, `features/contentPages/home/InteractiveSections.tsx`, `features/contentPages/home/HomeContent.tsx`, `features/contentPages/about/{AboutContent.tsx,Contact.tsx}`, их contact assertions | SC-N1; DATA-N1 handoff по контактам | content spec: Общий блок контактов; site-ad `src/ui/media/MapEmbed.tsx`; текущие settings mapping | targeted contact/map tests |
| SC-N3 | About/payment/privacy убрать, settings text; убрать dangling policy ссылки: `features/contentPages/about/**`, только policy mapping/footer/callback references и их tests в site consumer | SC-N2, DATA-N1 | content spec: О клубе; settings about.*; `rg /about#privacy` по src; handoff SC-N2 | targeted about/policy/callback tests |
| SC-N4 | QG-FE typography/AA: `app/globals.css`, `ui/foundations/**`, CSS hero/cards/news sections по фактическим findings | SC-N3 | QG-FE handoff: font vars invalid→hero16px; dates AA4.276; hero fallback contrast | targeted browser computed typography и AA на 375/768/1440 |
| SC-N5 | QG-FE mobile gallery swipe: `ui/media/**` и gallery tests | SC-N4 | QG-FE gallery finding; текущий Gallery; content spec: адаптивность | targeted gallery interaction tests + touch check одной gallery группы |
| DOC-N1 | Согласовать final composition в `docs/sites/inlove/{scheme,components}.md` | SC-N3 | только Главная/О клубе/ContactSection/privacy sections + note spec | targeted contract consistency |
| DOC-N1-FIX | Устранить найденные QG противоречия только в `tasks.md`/`design.md`, сохранив исторические checkbox и смысл specs | QG-NCONTRACTS.1 finding | content spec: Главная/О клубе; note070; точные finding rows | strict validation + focused contradiction review |
| QG-NCONTRACTS-RERUN | Повторная read-only проверка contracts после документального исправления | DOC-N1-FIX | content spec; исправленные строки tasks/design; handoff DOC-N1-FIX | strict validation + diff/spec consistency |

DAG: `NOTE-1 → SC-N1 → SC-N2 → SC-N3 → SC-N4 → SC-N5`; `NOTE-1 → DATA-N1 → SC-N2/SC-N3`; `SC-N3 → DOC-N1`. `LIVE-DB/API` независимо, без трогания DATA-N1 records. После `SC-N5 + DOC-N1`: адресные `QG-FE` и `QG-NCONTRACTS.1`; blocking finding contracts проходит `QG-NCONTRACTS.1 → DOC-N1-FIX → QG-NCONTRACTS-RERUN`. После успешного rerun идёт актуальный `QG-LIVE-SSR`, затем один `QG-SYNTH → SYNC-1 → ARCHIVE-1`. Остальные уже завершённые QG evidence переиспользуются; QG-LIVE принимает существующий отдельно записанный DB/API/SSR split.

### Note test matrix и manual QA

| ID | Поведение | Unit / итоговый lane |
|---|---|---|
| NOTE-01 | SSR home: реальное локальное hero фото, 4 квадратные cards/icons, отсутствие цен и price dependency | SC-N1 / QG-FE |
| NOTE-02 | Главная/about: 3 строки контактов, VK, callback label/context, target/rel, iframe widget из settings; карта реально отображается | SC-N2 / QG-FE |
| NOTE-03 | About text из обновлённых CMS settings в исходном HTML; payment/privacy отсутствуют, нет мёртвого fragment; callback consent работает | SC-N3 / QG-FE |
| NOTE-04 | Фактический computed hero typography; AA ≥4.5 для обычного и ≥3 для крупного текста; фото и fallback hero читаемы | SC-N4 / QG-FE |
| NOTE-05 | Mobile native/touch swipe выбирает следующее фото, keyboard/focus и SSR thumbnails сохранены | SC-N5 / QG-FE |
| NOTE-06 | Три seed news читаются в tenant list/detail, stable slug, published; повтор без дублей; about settings readback | DATA-N1 / QG-LIVE-SSR |

Реальный browser на 375/768/1440: открыть `/` и `/about`, проверить NOTE-01..04 и отсутствие overflow; пройти три contact links (новые вкладки), убедиться в видимой карте, вызвать и закрыть callback с обеих страниц. На mobile выполнить touch swipe галереи и keyboard navigation на desktop. Без JS проверить home/about текст, ссылки из `/novosti` на каждую из трёх seed news и полный detail HTML. Не повторять backend suite без нового runtime diff. Последний QG-SYNTH фиксирует новые evidence и применимость ранее пройденных lanes.
