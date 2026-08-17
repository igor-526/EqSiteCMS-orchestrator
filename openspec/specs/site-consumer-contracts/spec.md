# Purpose

Контракты публичного сайта-потребителя `site-ad`: Public Read API, серверный рендеринг, SEO и DTO контента.

## Requirements

### Requirement: Server-side конфигурация Public Read API
`site-ad` SHALL выбирать API base URL из `NEXT_PUBLIC_API_BASE_URL`, затем `API_BASE_URL`, нормализовать завершающие `/` и использовать серверный `EQUESTRIAN_SERVICE_KEY` как tenant selector. Клиент SHALL добавлять `X-Equestrian-Service-Key` только к GET-запросам и MUST NOT использовать CMS cookie, access token или CMS-only endpoint как способ публичного чтения.

#### Scenario: Сервер использует production API URL
- **WHEN** `NEXT_PUBLIC_API_BASE_URL` равен `https://api.eqcms.ru/api/`
- **THEN** API client обращается к base URL `https://api.eqcms.ru/api`

#### Scenario: GET получает tenant key
- **WHEN** `site-ad` формирует GET к Public Read endpoint
- **THEN** client добавляет `X-Equestrian-Service-Key` из серверного `EQUESTRIAN_SERVICE_KEY`

#### Scenario: Write не получает tenant key
- **WHEN** тот же client формирует запрос с методом, отличным от GET
- **THEN** client не добавляет `X-Equestrian-Service-Key` автоматически

#### Scenario: Публичное чтение не использует CMS-аутентификацию
- **WHEN** server page загружает публичный контент
- **THEN** запрос использует Public Read GET с tenant key без CMS cookie, access token и CMS-only read endpoint

### Requirement: Consumer access matrix
`site-ad` SHALL сохранять следующую evidence-based consumer matrix. Она описывает вызовы публичного сайта и MUST NOT переопределять backend access contract.

| method | path | access class | roles | expected without auth | expected with auth | связанные evidence/tests |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses`, `/api/horses/{slug}`, `/api/horses/breeds*`, `/api/horses/coat_colors*`, `/api/horses/owners*`, `/api/horses/services*` | Public Read с tenant key | anonymous consumer с service key | `200/2xx` с валидным key; report `003` фиксирует `400` без key и `404` с неизвестным | `site-ad` не отправляет CMS auth; report `003` подтверждает, что authenticated backend GET использует tenant CMS-пользователя и игнорирует service-key header | `src/api/client.ts`, `src/api/horse*.ts`, `client.test.ts`, reports `003`/`019` |
| `GET` | `/api/prices*`, `/api/prices/groups*`, `/api/site_settings*` | Public Read с tenant key | anonymous consumer с service key | контрактный `2xx` с валидным key; `400` без key и `404` с неизвестным по report `003` | CMS auth не требуется и не используется `site-ad`; authenticated backend-вариант не является consumer-сценарием | `src/api/client.ts`, `src/api/price.ts`, `src/api/priceGroups.ts`, `src/api/siteSettings.ts`, report `003` |

#### Scenario: Anonymous horse list
- **WHEN** public consumer вызывает `GET /api/horses?pedigree=1` с валидным tenant key и без CMS cookie
- **THEN** backend возвращает `200`, как подтверждено reports `003` и `019`

#### Scenario: Anonymous horse detail с родословной
- **WHEN** public consumer вызывает `GET /api/horses/{slug}?pedigree=1` с валидным tenant key и без CMS cookie
- **THEN** backend возвращает `200` и horse/pedigree DTO, как подтверждено report `019`

#### Scenario: Horse page запрашивает подтверждённую глубину родословной
- **WHEN** `/horses/[slug]` загружает данные через `fetchHorseDetail`
- **THEN** `site-ad` вызывает Public Read `GET /api/horses/{slug}?pedigree=3` с tenant key и без CMS cookie

#### Scenario: CMS-only endpoint отсутствует в consumer matrix
- **WHEN** reviewer проверяет read API modules `site-ad`
- **THEN** matrix и read API modules не содержат `/api/auth/me`, `/api/news-cms`, `/api/users*` или иной CMS-only endpoint; публичный callback `POST /api/call_back_requests` не является read-контрактом этого capability и остаётся вне его scope

### Requirement: SSR horse detail и серверная metadata
Динамический route `/horses/[slug]` SHALL загружать horse detail в async server page до передачи данных UI и SHALL использовать request-time SSR через `dynamic = "force-dynamic"`. Route SHALL формировать title и description серверной функцией `generateMetadata` из horse данных либо fallback.

#### Scenario: Успешный server render horse detail
- **WHEN** server page получает успешный Public Read ответ для slug
- **THEN** horse DTO передаётся `OneHorsePage` при серверном рендере без client-side API fetch как обязательного источника основного контента

#### Scenario: Сервер формирует metadata
- **WHEN** `generateMetadata` получает horse с name и description
- **THEN** сервер возвращает metadata title/description на основе этих полей и site settings

#### Scenario: Horse не найден
- **WHEN** Public Read detail возвращает ошибку или пустые данные
- **THEN** server page выводит fallback-заголовок, а `generateMetadata` возвращает fallback title/description

### Requirement: Индексационная инфраструктура
`site-ad` SHALL публиковать `robots.txt` и `sitemap.xml` через Next.js metadata routes. Robots SHALL разрешать публичный сайт, запрещать `/api/`, `/_next/` и `/archive/`, а sitemap SHALL включать уникальные неархивные navigation routes и доступные публичные service detail routes.

#### Scenario: Robots исключает служебные пути
- **WHEN** crawler получает robots metadata route
- **THEN** правила разрешают `/`, запрещают `/api/`, `/_next/`, `/archive/` и указывают sitemap URL

#### Scenario: Sitemap исключает архив
- **WHEN** sitemap собирает статические routes из navigation
- **THEN** дубликаты удаляются и routes с префиксом `/archive` не включаются

#### Scenario: Sitemap добавляет публичные услуги
- **WHEN** Public Read price list успешно возвращает items
- **THEN** sitemap добавляет `/uslugi/{slug}` для каждого item

### Requirement: Нерекурсивный контракт родителей жеребёнка
Consumer horse DTO SHALL представлять `pedigree.foals[*].parents` объектом с nullable `sire` и `dam`; каждая ссылка родителя SHALL содержать только `id` и `name`, не разворачивая рекурсивную родословную.

#### Scenario: У жеребёнка известны оба родителя
- **WHEN** Public Read horse detail содержит foal с известными sire и dam
- **THEN** consumer принимает обе ссылки `{id, name}` в `foal.parents`

#### Scenario: Один родитель неизвестен
- **WHEN** backend возвращает `null` для неизвестного sire или dam
- **THEN** consumer DTO сохраняет `null` и не требует вложенного horse object

### Requirement: Ограничение evidence и gap G-017
Backfill MUST трассировать задачи `003`, `017`, `019` и SHALL отличать локально подтверждённый contract от отсутствующего deployment evidence. До закрытия `G-017` spec MUST NOT утверждать успешные post-deploy запросы `ad.eqcms.ru → api.eqcms.ru`, production anonymous HTTP smoke, ISR/revalidation или полный production HTML/SEO audit.

#### Scenario: Локальная конфигурация подтверждена
- **WHEN** reviewer проверяет `client.test.ts`, Dockerfile, compose и deploy workflow
- **THEN** он подтверждает URL/key wiring и forwarding переменных, но не считает это post-deploy network evidence

#### Scenario: Gap остаётся открытым
- **WHEN** отсутствует timestamped deployment report с network и server-render checks
- **THEN** `G-017` остаётся зарегистрированным и пакет не создаёт нормативный production success claim

#### Scenario: Reviewer проверяет границу рендера
- **WHEN** пакет проходит task `7.2`
- **THEN** reviewer отдельно проверяет anonymous GET без CMS cookie, отсутствие CMS-only endpoint, серверную загрузку основного контента, metadata и фактическую caching strategy

### Requirement: Эффективная кличка родословной без изменения consumer
Public horse read contract SHALL возвращать для каждого horse node в поле `name` значение `pedigree_name`, если оно задано, иначе основную кличку. Nullable `pedigree_name` MUST оставаться отдельным raw-полем public JSON. `site-ad` MUST продолжить использовать существующие endpoints и поле `name` без runtime-изменений.

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses`, `/api/horses/{slug}` | Public Read с tenant key | anonymous consumer | `200` с валидным key; `401` missing/invalid | CMS cookie возвращает raw admin projection | backend SM-01..SM-16; site regression |
| `GET` | `/api/horses/{id}/pedigree/{mode}` и `?pedigree=N` | Public Read с tenant key | anonymous consumer | `200` с валидным key; `401` missing/invalid | CMS cookie возвращает raw admin projection | backend SM-17..SM-22; site regression |

Исключений из дефолтной Public Read policy нет; service key остаётся обязательным tenant selector, не секретом пользователя.

#### Scenario: Consumer получает pedigree name
- **WHEN** `site-ad` читает horse list/detail с валидным service key и horse имеет `pedigree_name`
- **THEN** существующий consumer-код получает это значение в `name` без новой логики отображения

#### Scenario: Consumer получает fallback
- **WHEN** `pedigree_name` равен `NULL`
- **THEN** public DTO содержит основную кличку в `name`

#### Scenario: Вложенные nodes
- **WHEN** public response содержит sire, dam, foals, parents или candidates
- **THEN** effective name вычисляется независимо для каждого node

#### Scenario: Site consumer не изменяется
- **WHEN** reviewer проверяет diff и regression публичных horse pages
- **THEN** `services/site-ad` не содержит изменений для задачи 046, а страницы продолжают читать `name`
