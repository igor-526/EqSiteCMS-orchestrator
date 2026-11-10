# Spec Delta

## ADDED Requirements

### Requirement: Gateway истории Метрики
`GET /api/seo/metrica/tasks` SHALL обращаться непосредственно к `GET /api/metrica/tasks` ya-metrica-service по `YA_METRICA_SERVICE_URL`, передавая только actor.equestrian_id в `X-Equestrian-Id` и limit/offset. Backend MUST проверять ответ по контракту `metrica-task-list`, возвращая `{items,total}` без собственной агрегации. Cookie, Bearer и selector браузера MUST NOT пересылаться.

#### Scenario: GW-01 Прямой peer и чужой selector
- **WHEN** SEO A передаёт в query/header selector B и limit=20, offset=20
- **THEN** вызывается только ya-metrica с selector A и теми же limit/offset; ответ содержит только A, seo-service не вызывается

### Requirement: Отказы gateway истории
Gateway SHALL проверять сессию/SEO до query/downstream; limit/offset SHALL соответствовать `metrica-task-list`, invalid — 400 без peer. Timeout, transport, неожиданный статус (включая peer 401/5xx), невалидный JSON/DTO SHALL давать безопасный 502 без тела peer. Вызов SHALL иметь timeout 4 секунды и не повторяться автоматически.

#### Scenario: GW-02 Валидация и деградация
- **WHEN** SEO передал неверный limit/offset либо peer недоступен/вернул повреждённый DTO
- **THEN** соответственно 400 без peer либо 502 без приватных деталей; повторный запрос автоматически не отправляется

### Requirement: Access matrix истории Метрики
Gateway SHALL быть Protected GET exception, только SEO без наследования ADMIN/SUPERUSER/DEVELOPER. Причина исключения Public Read — приватная история фоновых операций конюшни, не нужная сайтам-потребителям. Списковый endpoint SHALL изолировать данные по actor, без item lookup и без нового endpoint чужого ресурса.

#### Scenario: GW-03 Anonymous
- **WHEN** запрос без сессии содержит в том числе неверный query
- **THEN** 401 до query/downstream

#### Scenario: GW-04 Authenticated
- **WHEN** запрос выполняют SEO-only, SEO+ADMIN, ADMIN-only, SUPERUSER/DEVELOPER без SEO и пользователь без ролей
- **THEN** первые два получают 200 или ошибки матрицы, остальные 403 до downstream даже с неверным query

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/metrica/tasks` | Protected GET exception | только SEO | 401 до peer/query | 200; без SEO 403; invalid query 400; peer/DTO error 502 |

## MODIFIED Requirements

### Requirement: Route inventory
Backend SHALL классифицировать все 12 маршрутов `/api/seo/*` в route inventory с access class, ролью только `SEO`, конюшней из сессии и ссылкой на тесты; сгенерированный `docs/backend-route-inventory.md` MUST соответствовать приложению.

#### Scenario: Инвентарь актуален
- **WHEN** выполняется тест route inventory
- **THEN** все `/api/seo/*` маршруты классифицированы, включая новый `GET /api/seo/metrica/tasks` как protected GET exception; запись, включая `POST /api/seo/parse-jobs`, остаётся protected write
