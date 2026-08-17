## MODIFIED Requirements

### Requirement: Tenant context для чтения и записи
Backend SHALL разрешать Public Read tenant context по непустому заголовку `X-Equestrian-Service-Key`, Protected Write context по аутентифицированному пользователю и dual-mode GET context по cookie пользователя либо selector. `X-Equestrian-Service-Key` MUST быть несекретным tenant selector, а не user auth. Данные другого tenant MUST NOT раскрываться.

#### Scenario: Публичное чтение с валидным selector
- **WHEN** анонимный клиент вызывает tenant-aware Public Read GET с известным `X-Equestrian-Service-Key`
- **THEN** backend выбирает связанный tenant и возвращает контрактный успешный ответ без user authentication

#### Scenario: Публичное чтение без selector
- **WHEN** полностью анонимный клиент вызывает tenant-aware Public Read GET без `X-Equestrian-Service-Key`
- **THEN** backend возвращает `401`

#### Scenario: Публичное чтение с неизвестным selector
- **WHEN** анонимный клиент вызывает tenant-aware Public Read GET с неизвестным `X-Equestrian-Service-Key`
- **THEN** backend возвращает `401` и не раскрывает существование tenant

#### Scenario: Аутентифицированный dual-mode GET
- **WHEN** пользователь с валидным access cookie вызывает dual-mode GET
- **THEN** backend использует `equestrian_id` пользователя и не требует selector

#### Scenario: Чужой tenant detail
- **WHEN** выбранный tenant запрашивает detail-ресурс другого tenant
- **THEN** backend не раскрывает ресурс и возвращает доменный контрактный denial/not-found status

### Requirement: Refresh-aware различение CMS и anonymous read
Dual-mode GET SHALL отличать Public Read с tenant selector от CMS-запроса с непустым refresh cookie без валидного access cookie. Refresh-only запрос MUST возвращать `401`; anonymous запрос без валидного selector MUST также возвращать `401`, но эти outcomes относятся к разным механизмам.

#### Scenario: Истёк access cookie при наличии refresh cookie
- **WHEN** dual-mode GET получает непустой refresh cookie без access cookie
- **THEN** backend возвращает `401`, позволяя CMS запустить refresh flow

#### Scenario: Полностью анонимный запрос без selector
- **WHEN** dual-mode GET не получает auth cookies или `X-Equestrian-Service-Key`
- **THEN** backend возвращает `401` отсутствующего tenant selector

#### Scenario: Refresh cookie вместе с валидным selector
- **WHEN** dual-mode GET получает refresh cookie без access cookie и валидный selector
- **THEN** backend обслуживает запрос как Public Read выбранного tenant

## ADDED Requirements

### Requirement: Полная inventory matrix backend routes
Backend SHALL генерировать и поддерживать reviewable inventory всех routes с колонками `method`, `path`, `access class`, `roles`, `tenant selector`, `owner rule`, `without auth`, `with auth`, `foreign resource`, `validation status`, `tests`. Inventory MUST включать email routes и все существующие public/protected/service исключения.

#### Scenario: Quality Gate проверяет route inventory
- **WHEN** выполняется единый Quality Gate
- **THEN** каждая зарегистрированная backend route сопоставлена ровно одной строке inventory и подтверждена anonymous/authenticated/foreign/selector tests по применимости
