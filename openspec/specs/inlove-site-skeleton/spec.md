# Purpose

Требования к безопасному, нейтральному и проверяемому каркасу публичного сайта-потребителя `site-ksk-inlove`.

## Requirements

### Requirement: Новый каталог создаётся из безопасного tracked baseline
Система SHALL содержать новый каталог `services/site-ksk-inlove`, сформированный из tracked-состава `services/site-ad`, и MUST NOT переносить `.git`, `.env`, `node_modules`, `.next`, coverage, caches или иные локальные/build artifacts. Исходный `services/site-ad` MUST оставаться неизменным.

#### Scenario: Bootstrap не переносит локальное состояние
- **WHEN** исполнитель создаёт каталог `services/site-ksk-inlove`
- **THEN** в нём отсутствуют `.git`, локальный `.env`, зависимости и build/cache artifacts
- **AND** diff исходного `services/site-ad` пуст

### Requirement: Каркас сохраняет интеграционный слой CMS и получает первый презентационный слой
`site-ksk-inlove` SHALL сохранять Next.js/App Router toolchain на Next.js `15.5.25`, API client/wrappers, DTO, data services, site-settings provider/context/hook и observability plumbing. Он SHALL дополнительно содержать брендовый UI-каталог INLOVE, общую layout-оболочку, семь placeholder routes и универсальную callback form в границах соответствующих capabilities. Он MUST NOT содержать маршруты вне утверждённой карты, CMS admin UI, CMS-only endpoint usage или brand-bound data services, дублирующие профильные API.

#### Scenario: Retained API и hook доступны разработчику
- **WHEN** проект устанавливается и проходит typecheck
- **THEN** Public Read wrappers, типы и `useSiteSettings` с provider/service доступны компонентам без CMS credentials

#### Scenario: Утверждённые страницы заменяют технический baseline
- **WHEN** production server получает `GET` одного из семи утверждённых routes
- **THEN** он возвращает пользовательскую placeholder page с общей оболочкой и metadata
- **AND** неизвестный route по-прежнему возвращает `404`

### Requirement: Наследие Александровой дачи полностью удаляется
За исключением неизменяемых `.helm/**` и `.github/**`, `site-ksk-inlove` MUST NOT содержать названия, тексты, домены, адреса, social links, tenant defaults, metadata, source-name identifiers, изображения или иные брендовые данные «Александровой дачи». Все презентационные файлы в `public/**` MUST быть удалены.

#### Scenario: Brand scan чист вне исключений
- **WHEN** Quality Gate ищет русские и латинские варианты бренда, прежние домены и известные social identifiers вне `.helm/**` и `.github/**`
- **THEN** поиск возвращает ноль совпадений

#### Scenario: Брендовые ассеты не переносятся
- **WHEN** reviewer инвентаризирует `public/**` и ссылки на локальные изображения
- **THEN** фотографии, логотипы, favicon и иконки исходного клиента отсутствуют

### Requirement: Счётчики и webmaster verification не переносятся
`site-ksk-inlove` MUST NOT содержать код Яндекс Метрики, analytics counter ID `105850153`, `mc.yandex.ru` resources, webmaster verification tokens/meta/files, `robots.ts`, `sitemap.ts` или конфигурацию старого клиента. Нейтральный map provider MAY сохраняться только внутри реально сохраняемой небрендовой логики и MUST NOT включать analytics/verification.

#### Scenario: Runtime не загружает Яндекс Метрику
- **WHEN** reviewer проверяет исходный HTML и Network пустого runtime
- **THEN** отсутствуют запросы к `mc.yandex.ru`, вызовы `ym` и counter ID

#### Scenario: Verification artifacts отсутствуют
- **WHEN** reviewer ищет webmaster verification meta, token и files
- **THEN** в новом проекте нет verification данных исходного сайта

### Requirement: Helm и GitHub Actions копируются без изменений
Целевые `.helm/**` и `.github/**` SHALL иметь тот же набор relative paths и побайтовое содержимое, что и в `services/site-ad`. Исполнитель MUST NOT редактировать эти деревья, а документация MUST обозначать их как непригодные для deployment нового сайта до отдельной адаптации.

#### Scenario: SHA-256 manifest совпадает
- **WHEN** сравниваются SHA-256 всех файлов `.helm/**` и `.github/**` источника и цели
- **THEN** набор путей и hashes полностью совпадают

#### Scenario: Deployment нового сайта запрещён
- **WHEN** разработчик читает README или каталог сервисов до отдельного deployment change
- **THEN** он видит предупреждение, что унаследованные Helm/Actions сохраняют identity `site-ad` и не должны запускаться для InLove

### Requirement: Runtime identity нейтральна и конфигурируема
Вне неизменяемых deployment trees package name, Docker service/container identity, README и env examples SHALL использовать `site-ksk-inlove` либо нейтральные placeholders. Stand domain SHALL быть документирован как `inlove-stand.eqcms.ru`, но MUST NOT использоваться как скрытый runtime fallback. Tenant selector, Sentry DSN/release и иные клиентские значения MUST поступать из окружения и MUST NOT fallback'иться на значения `site-ad`; Sentry по умолчанию MUST оставаться выключенным до пользовательской env-настройки.

#### Scenario: Локальная конфигурация не содержит чужой tenant
- **WHEN** разработчик открывает `.env.example` и runtime config
- **THEN** там нет tenant/domain/Sentry значений Александровой дачи, указан stand domain `inlove-stand.eqcms.ru` и явно описаны необходимые переменные без selector fallback

### Requirement: Каркас устанавливается, проверяется и собирается
`site-ksk-inlove` SHALL проходить clean dependency install, retained unit tests, lint, TypeScript typecheck и production build. Unit tests MUST использовать mocks и MUST NOT обращаться к live backend.

#### Scenario: Clean build успешен
- **WHEN** выполняются package install, `npm test`, lint, `npx tsc --noEmit` и production build в новом каталоге
- **THEN** все команды завершаются успешно без импортов удалённых страниц/UI/ассетов

### Requirement: Новый consumer отражён в каталоге сервисов
`SERVICES.md` SHALL описывать `services/site-ksk-inlove` как отдельный Public Read site consumer вне core release scope. `services.manifest` MUST оставаться без новой записи до появления remote URL и отдельного решения пользователя.

#### Scenario: Каталог и manifest согласованы с Git lifecycle
- **WHEN** reviewer сверяет `SERVICES.md`, `services.manifest` и новый каталог
- **THEN** сервис описан централизованно, но фиктивный remote отсутствует и Git внутри каталога не инициализирован
