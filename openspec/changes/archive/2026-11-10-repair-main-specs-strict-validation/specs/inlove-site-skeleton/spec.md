## MODIFIED Requirements

### Requirement: Каркас сохраняет интеграционный слой CMS и получает первый презентационный слой
`site-ksk-inlove` SHALL сохранять существующий интеграционный слой CMS и toolchain, дополняя их первым презентационным слоем INLOVE в границах утверждённых capabilities, без лишних маршрутов, CMS admin UI и дублирования профильных API.

#### Scenario: Каркас ограничивает состав интеграционного и презентационного слоёв
- **WHEN** reviewer сверяет состав каркаса с утверждёнными capabilities
- **THEN** `site-ksk-inlove` SHALL сохранять Next.js/App Router toolchain на Next.js `15.5.25`, API client/wrappers, DTO, data services, site-settings provider/context/hook и observability plumbing. Он SHALL дополнительно содержать брендовый UI-каталог INLOVE, общую layout-оболочку, семь placeholder routes и универсальную callback form в границах соответствующих capabilities. Он MUST NOT содержать маршруты вне утверждённой карты, CMS admin UI, CMS-only endpoint usage или brand-bound data services, дублирующие профильные API.

#### Scenario: Retained API и hook доступны разработчику
- **WHEN** проект устанавливается и проходит typecheck
- **THEN** Public Read wrappers, типы и `useSiteSettings` с provider/service доступны компонентам без CMS credentials

#### Scenario: Утверждённые страницы заменяют технический baseline
- **WHEN** production server получает `GET` одного из семи утверждённых routes
- **THEN** он возвращает пользовательскую placeholder page с общей оболочкой и metadata
- **AND** неизвестный route по-прежнему возвращает `404`

### Requirement: Runtime identity нейтральна и конфигурируема
Вне неизменяемых deployment trees runtime identity `site-ksk-inlove` SHALL быть собственной либо нейтральной; клиентские параметры SHALL поступать из окружения без fallback на `site-ad`, а Sentry SHALL оставаться выключенным до пользовательской env-настройки.

#### Scenario: Runtime использует собственную identity и явную конфигурацию
- **WHEN** reviewer сверяет identity, документацию stand domain и источники runtime-параметров
- **THEN** Вне неизменяемых deployment trees package name, Docker service/container identity, README и env examples SHALL использовать `site-ksk-inlove` либо нейтральные placeholders. Stand domain SHALL быть документирован как `inlove-stand.eqcms.ru`, но MUST NOT использоваться как скрытый runtime fallback. Tenant selector, Sentry DSN/release и иные клиентские значения MUST поступать из окружения и MUST NOT fallback'иться на значения `site-ad`; Sentry по умолчанию MUST оставаться выключенным до пользовательской env-настройки.

#### Scenario: Локальная конфигурация не содержит чужой tenant
- **WHEN** разработчик открывает `.env.example` и runtime config
- **THEN** там нет tenant/domain/Sentry значений Александровой дачи, указан stand domain `inlove-stand.eqcms.ru` и явно описаны необходимые переменные без selector fallback
