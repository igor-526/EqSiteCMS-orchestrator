# Spec Delta

## Purpose

Peer-endpoint yandex-service со списком конюшен, у которых привязан счётчик Яндекс.Метрики. Нужен seo-service для ежедневного расписания; отдаёт только идентификаторы, без токенов и данных аккаунта.

## ADDED Requirements

### Requirement: Список привязок счётчиков
yandex-service SHALL предоставлять `GET /api/connections/metrica` с query `limit` (1..500, по умолчанию 100) и `offset` (≥0). Ответ `200`: `{"total": N, "items": [{"equestrian_id": UUID, "counter_id": str}]}`, стабильно отсортированный по `equestrian_id`. Невалидные `limit`/`offset` — `400` по контракту сервиса.

#### Scenario: Страницы списка
- **WHEN** привязано 250 конюшен и запрошены `limit=100` с `offset=0`, `100`, `200`
- **THEN** страницы содержат 100, 100 и 50 элементов без повторов, `total=250`

#### Scenario: Нет привязок
- **WHEN** ни одна конюшня не привязана
- **THEN** ответ `200` с `total=0` и пустым `items`

#### Scenario: Невалидная пагинация
- **WHEN** `limit=0`, `limit=501`, `offset=-1` либо нечисловое значение
- **THEN** ответ `400` без отражения входных значений

### Requirement: Ответ без секретов
Элементы списка MUST содержать только `equestrian_id` и `counter_id`; ciphertext токенов, идентификаторы и профили аккаунтов Яндекса MUST NOT попадать в ответ.

#### Scenario: Содержимое элемента
- **WHEN** QG сравнивает ответ с моделью БД
- **THEN** в элементе ровно два поля, `yandex_account`, `enc_*`, `email` и логины отсутствуют

### Requirement: Access matrix списка привязок
Маршрут SHALL быть Private Peer Read exception (как Y7): доверенный внутренний caller без user authentication; cookie/Authorization не меняют результат. Причина: данные — внутренний операционный реестр привязок, публичным `site-*` не нужны; механизма сервисной аутентификации peers нет, действует dev-допущение и production gate `yandex-peer-http-contract`.

#### Scenario: Anonymous и authenticated идентичны
- **WHEN** запрос выполняется без credentials, затем с произвольными cookie и `Authorization`
- **THEN** оба ответа `200` с идентичным телом

| ID | method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|---|
| Y10 | GET | yandex `/api/connections/metrica` | Private Peer Read exception | доверенный внутренний caller (seo-service scheduler) | `200` со списком и `total`; невалидные `limit`/`offset` `400` | то же; cookie/Authorization игнорируются |
