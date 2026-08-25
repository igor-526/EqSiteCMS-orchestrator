## Why

Публичная форма `site-ad` вызывает anonymous `POST /api/callback_requests`, однако текущий `SplitCORSMiddleware` считает любой `POST` защищённым и отклоняет browser preflight с origin сайта-потребителя. Из-за рассинхронизации access-контракта и CORS-классификации форма работает только через временный same-origin proxy, хотя endpoint уже является явным Public Write exception.

## What Changes

- Добавить узкое route-aware CORS-исключение только для точного пути `POST /api/callback_requests`, включая `OPTIONS` preflight с `Access-Control-Request-Method: POST`.
- Разрешить любому origin credentialless CORS для этого публичного endpoint: wildcard origin, метод `POST`, заголовки `Content-Type` и `X-Equestrian-Service-Key`, без `Access-Control-Allow-Credentials`.
- Сохранить существующий прикладной контракт без ужесточения create DTO: selector остаётся non-secret identity hint; valid anonymous запрос, включая отсутствие optional `name` и игнорируемое DTO extra field, возвращает `201`; missing/invalid selector — `401`; действительно schema-invalid body — `422`.
- Сохранить строгий CORS для всех остальных `POST/PATCH/DELETE/PUT`, protected GET и service endpoint; Public GET не меняется.
- Удалить из `site-ad` ставший ненужным opt-in same-origin proxy `SITE_API_PROXY_TARGET` и использовать прямой публичный API base URL.
- Расширить unit, live smoke и browser regression coverage CORS/access boundary.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `callback-request-lifecycle`: публичное write-исключение получает согласованный credentialless CORS-контракт и полную access/preflight matrix.
- `callback-request-consumer-form`: `site-ad` отправляет запрос напрямую в backend без обязательного same-origin rewrite и проверяет browser CORS boundary.

## Impact

- Backend: `services/backend/src/core/middleware/cors.py`, CORS unit-тесты и публичная route/access документация; бизнес-логика, БД, миграции и NATS-контракт не меняются.
- Site Consumer: `services/site-ad/next.config.ts`, API client/config tests и deployment environment documentation.
- API: только CORS-представление `OPTIONS /api/callback_requests` и response headers `POST /api/callback_requests`; HTTP payload/status semantics сохраняются.
- Security: исключение привязано к нормализованному точному пути и методу; глобального отключения CORS и открытия остальных writes нет.
