# Spec Delta

## MODIFIED Requirements

### Requirement: Route inventory
Backend SHALL классифицировать все 11 маршрутов `/api/seo/*` в route inventory с access class, ролью только `ADMIN`, конюшней из сессии и ссылкой на тесты; сгенерированный `docs/backend-route-inventory.md` MUST соответствовать приложению.

#### Scenario: Инвентарь актуален
- **WHEN** выполняется тест route inventory
- **THEN** все `/api/seo/*` маршруты классифицированы, GET — как protected GET exception, запись (включая `POST /api/seo/parse-jobs`) — как protected write

## ADDED Requirements

### Requirement: Проксирование постановки парсинга
Backend SHALL предоставлять `POST /api/seo/parse-jobs` и проксировать его в `POST /api/parse-jobs` seo-service с `X-Equestrian-Id` конюшни сессии; access class, роли и статусы определяет capability `seo-parse-trigger-api`. Остальные 10 маршрутов `/api/seo/**` не меняются.

#### Scenario: Прокси вызывает только seo-service
- **WHEN** ADMIN вызывает `POST /api/seo/parse-jobs`
- **THEN** backend обращается только к seo-service, без cookie и клиентских заголовков, и не обращается к ya-metrica-service
