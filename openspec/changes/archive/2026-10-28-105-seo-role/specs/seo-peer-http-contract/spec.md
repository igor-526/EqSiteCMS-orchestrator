# Spec Delta

## MODIFIED Requirements

### Requirement: Доверенная внутренняя сеть без credentials
seo-service SHALL обслуживать `/api/*` без проверки credentials: сервисные ключи, cookie и Authorization MUST NOT требоваться и MUST NOT давать дополнительных прав. Проверка роли `SEO` выполняется только в backend. Перед production deployment SHALL быть подтверждено, что seo-service недоступен внешним callers; иначе выпуск блокируется.

#### Scenario: Запрос без credentials
- **WHEN** внутренний caller вызывает `GET /api/pages` с валидным `X-Equestrian-Id` без каких-либо credentials
- **THEN** ответ `200` со списком страниц этой конюшни

#### Scenario: Посторонние credentials не меняют результат
- **WHEN** тот же запрос содержит произвольные cookie или `Authorization`
- **THEN** ответ идентичен запросу без них

### Requirement: Access matrix списка запросов с метриками
`GET /api/search-queries` SHALL сохранять Internal Trusted Network Read exception по матрице ниже. Причина исключения из Public Read — приватная аналитика конюшни, доступная CMS только через SEO backend. Selector MUST оставаться несекретным UUID; cookie/Authorization его не заменяют. Production MUST блокироваться без подтверждения внешней недоступности peer и БД.

#### Scenario: Anonymous и посторонние credentials
- **WHEN** caller без credentials, затем с cookie и Bearer вызывает список запросов с валидным X-Equestrian-Id и параметрами метрик
- **THEN** оба ответа 200 с одинаковыми items/total/metrics_table

#### Scenario: Selector отсутствует или невалиден
- **WHEN** caller без credentials либо с ними не передал X-Equestrian-Id или передал пустой/не-UUID selector
- **THEN** 401 до БД и Метрики; пользовательская авторизация не помогает

#### Scenario: Невалидный query
- **WHEN** selector валиден, но mode/metric/даты/ordering невалидны либо limit/offset нечисловые
- **THEN** 400 до вызова Метрики

#### Scenario: Ошибка downstream
- **WHEN** M5 или M6 недоступен либо нарушает контракт
- **THEN** 502 с безопасным detail без URL/тела peer, транзакция чтения завершается откатом

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | SEO `/api/search-queries` с валидным selector | Internal Trusted Network Read exception | доверенный backend | `200` с items/total/metrics_table; mode/metric/даты/ordering или нечисловые limit/offset невалидны — `400`; Метрика недоступна/невалидна — `502`; непредвиденная внутренняя ошибка — безопасный `500` | то же; cookie/Authorization игнорируются |
| GET | SEO `/api/search-queries` без/с невалидным selector | Internal selector exception | любой внутренний caller | `401` до данных и peer | `401`; credentials не заменяют selector |
