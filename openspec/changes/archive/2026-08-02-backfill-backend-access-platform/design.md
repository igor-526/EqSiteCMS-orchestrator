## Контекст

Пакет BE-1 восстанавливает фактический платформенный access-контракт из задач `003`, `012` и `018`. Код уже реализован: зависимости в `depends/services.py` выбирают tenant context, auth router управляет cookie, а `SplitCORSMiddleware` делит public и protected browser access. Этот change документирует состояние и не изменяет runtime.

## Цели / Не-цели

**Цели:**

- Описать единый capability `backend-access-platform` только по code/tests/reports evidence.
- Зафиксировать access matrix, tenant isolation, refresh-only ветку и CORS-классификацию.
- Сохранить трассировку до исторических задач и подготовить пакет к tasks `5.3`, `5.4` и `5.5` родительского change.

**Не-цели:**

- Менять backend runtime, endpoint, cookie, CORS, БД или тесты.
- Описывать доменные CRUD/DTO — ими владеет BE-2.
- Описывать frontend retry UX или site-consumer rendering.
- Объявлять неподтверждённые статусы или полное endpoint-покрытие только из legacy task/plan.

## Решения

### 1. Capability группируется вокруг платформенной границы доступа

Tenant resolution, refresh-aware чтение и CORS описываются вместе, потому что совместно определяют, как один backend обслуживает public consumer и cookie-authenticated CMS. Альтернатива — три specs по номерам задач — отклонена как дублирующая один access contract.

### 2. Access matrix использует классы маршрутов и отдельно перечисляет исключения

Доменные пути представлены подтверждёнными классами Public Read и Protected Write, а auth endpoints — отдельными строками. Это сохраняет полноту policy BE-1 без присвоения доменных требований BE-2. Успешный статус доменной операции обозначается как контрактный `2xx`, когда точный код различается по endpoint.

### 3. CORS не подменяет серверную авторизацию

Spec отдельно фиксирует browser CORS headers и HTTP auth outcome. Отсутствие `Access-Control-Allow-Origin` для чужого origin не означает, что сервер обязан отклонить сам запрос: evidence для публичного login показывает `200` без CORS-заголовка, тогда как недопустимый protected preflight возвращает `400`.

### 4. Historical evidence имеет приоритет над намерением

Нормативные требования опираются на `depends/services.py`, `api/auth.py`, `core/middleware/cors.py`, unit-тесты и reports `003`/`018`. Известное неполное smoke-покрытие отдельных mutation/photo/pedigree маршрутов сохраняется как ограничение evidence и не интерпретируется как другой access class.

## Риски / Компромиссы

- [Классовая matrix скрывает различия точных success-кодов доменных endpoint] → BE-2 обязан уточнять доменные ответы, не меняя access class.
- [CORS protected GET prefixes обновляются вручную] → Backend reviewer сверяет список с фактическими cookie-only GET перед sync.
- [Отчёт 003 не проверял отдельно все auth POST] → Для их статусов используются непосредственно router code и unit-тесты; claim о полном live smoke не делается.
- [Cross-tenant detail evidence возвращает `400`, хотя legacy plan предпочитал `403/404`] → Spec фиксирует только отсутствие раскрытия чужих данных и фактический `400`, не нормализует статус задним числом.

## План миграции

1. Backend reviewer проверяет требования по code/tests/reports evidence (task `5.3`).
2. Access reviewer сверяет matrix и anonymous/authenticated сценарии (task `5.4`).
3. После review пакет проходит strict validation, sync и archive в task `5.5`.

Rollback runtime не требуется. До sync артефакты можно исправить внутри этого change; после sync корректировка выполняется отдельным OpenSpec change.

## Открытые вопросы

Блокирующих вопросов для создания delta spec нет. Точные success-коды доменных маршрутов и расширение live smoke остаются в ownership BE-2/reviewer, а не угадываются в BE-1.
