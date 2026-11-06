# Каскадная очистка при удалении аккаунта

## MODIFIED Requirements

### Requirement: Удаление аккаунта и storage identity
Удаление аккаунта SHALL завершаться `204` без тела для валидного UUID, включая отсутствующий аккаунт. До FK cascade сервис SHALL определить связанные привязки и атомарно сохранить по конюшне запрос очистки статистик Метрики. Удаление несвязанного аккаунта MUST NOT очищать статистики другой активной привязки. Уникальность non-null пары tenant/Yandex ID сохраняется.

#### Scenario: Y1-16 Повторное удаление
- **WHEN** запрошено удаление существующего либо уже отсутствующего UUID
- **THEN** существующий аккаунт удаляется, связанные привязки порождают устойчивые операции очистки; повтор возвращает пустой 204 без новых операций; malformed UUID даёт 400

#### Scenario: Y1-17 Конкурентное создание и cascade
- **WHEN** две записи имеют одну non-null пару tenant/Yandex ID либо удаляется запись со связанным счётчиком
- **THEN** unique constraint сохраняется, FK cascade удаляет привязку только в транзакции с сохранением её tenant-контекста и запроса очистки; конкурентный DELETE счётчика не дублирует эффект

## ADDED Requirements

### Requirement: Границы каскада и доступа
Удаление аккаунта SHALL сохранять матрицу доступа ниже. Private peer write — существующее исключение для внутреннего сервиса, не публичный CMS API; network isolation остаётся production gate. Отсутствие user auth в peer MUST NOT считаться проверкой роли или ownership.


#### Scenario: YA-01 Несвязанный аккаунт
- **WHEN** конюшня удаляет аккаунт B, а её счётчик привязан через аккаунт A
- **THEN** аккаунт B исчезает, привязка A и её статистики не меняются, очистка не создаётся

#### Scenario: YA-02 Парные access tests
- **WHEN** DELETE вызывается anonymous, с SEO-only, SEO+ADMIN, ADMIN-only, без SEO и с чужим account; прямой peer — без/с Cookie/Bearer
- **THEN** применяются outcomes matrix; gateway изолирует tenant, peer не приобретает новых permissions от Cookie

##### Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| DELETE | backend `/api/yandex/accounts/{account_id}` | Protected Write | строго SEO, свой tenant | 401 | SEO 204; без SEO 403; чужой/неизвестный account 404; malformed 400 |
| DELETE | yandex `/api/accounts/{account_id}` | Internal Trusted Network Write, exception | доверенный peer | 204, включая absent; malformed/storage failure 400 | то же, Cookie/Bearer игнорируются |
