# Планирование merge при добавлении правила

## MODIFIED Requirements

### Requirement: Изменение настроек не трогает сохранённые страницы
PATCH и DELETE элементов SHALL сохранять прежнее отсутствие ретроактивного изменения страниц. Успешный POST нового элемента SHALL атомарно сохранять ревизию и намерение фонового scan/merge; ответ не ждёт сканирования всех страниц. Дубль, validation error или rollback MUST NOT создавать ревизию или команду. Удаление исходных страниц SHALL происходить только после безопасного результата Метрики.

#### Scenario: Удаление параметра из черного списка
- **WHEN** удаляется параметр `utm_source`, а ранее сохранена страница `"/a"`
- **THEN** страница `"/a"` и её UUID не меняются

#### Scenario: NS-01 Успешный POST и ошибка
- **WHEN** добавляется новое правило либо запрос отклонён как duplicate/invalid
- **THEN** успешный 201 сохраняет правило вместе с durable намерением; 409/400 не оставляет задания, брокерный outage после commit не теряет намерение

## ADDED Requirements

### Requirement: Доступ к запуску ретроактивной нормализации
POST правил SHALL сохранять matrix ниже. Чувствительные административные данные CMS не являются Public Read. Peer write — явное исключение для gateway внутри доверенной сети; `X-Equestrian-Id` не доказывает права, production isolation требуется отдельно.


#### Scenario: NS-02 Anonymous и authenticated POST
- **WHEN** каждая строка вызывается anonymous, с SEO-only, SEO+ADMIN, ADMIN-only и без SEO, а peer также без/с Cookie/Bearer
- **THEN** outcomes совпадают с matrix, gateway получает tenant из actor и не принимает подмену клиентским selector; задание всегда относится к tenant правила

#### Scenario: NS-03 Регрессия PATCH и DELETE
- **WHEN** SEO меняет либо удаляет собственный/чужой item через существующий gateway
- **THEN** действующие 200/204, foreign 404, validation 400, duplicate 409 и anonymous 401/без SEO 403 сохраняются; ретроактивное разъединение или новый merge не запускаются

##### Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | backend `/api/seo/page-normalization/blacklisted-query-params` | Protected Write | строго SEO, свой tenant | 401 | SEO 201; без SEO 403; invalid 400; duplicate 409 |
| POST | backend `/api/seo/page-normalization/blacklisted-hashes` | Protected Write | строго SEO, свой tenant | 401 | SEO 201; без SEO 403; invalid 400; duplicate 409 |
| POST | seo `/api/page-normalization/blacklisted-query-params` | Internal Trusted Network Write, exception | доверенный peer | 201; selector missing/invalid 401; invalid 400; duplicate 409 | то же, Cookie/Bearer игнорируются |
| POST | seo `/api/page-normalization/blacklisted-hashes` | Internal Trusted Network Write, exception | доверенный peer | 201; selector missing/invalid 401; invalid 400; duplicate 409 | то же, Cookie/Bearer игнорируются |
