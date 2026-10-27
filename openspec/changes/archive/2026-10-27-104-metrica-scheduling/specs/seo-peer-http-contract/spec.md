# Spec Delta

## MODIFIED Requirements

### Requirement: Множество HTTP-статусов и безопасные ошибки
seo-service SHALL отвечать `200`, `201`, `202`, `204` при успехе (`202` — только постановка команды парсинга); `400` при невалидном теле, query, path-параметре или нормализации; `401` только при проблемах tenant selector; `404` для отсутствующего в конюшне элемента; `409` для дубля; `502`, когда зависимый peer-сервис (ya-metrica-service, yandex-service) недоступен или нарушил контракт; `503`, когда недоступна очередь задач NATS; `500` для непредвиденной ошибки. Тело ошибки MUST содержать только `detail` без входных значений, SQL, traceback, параметров подключения и тела ответа peer-сервиса.

#### Scenario: Невалидное тело
- **WHEN** caller с валидным `X-Equestrian-Id` отправляет malformed JSON или тело неверной схемы
- **THEN** ответ `400`, `detail` не содержит введённых значений

#### Scenario: Непредвиденная ошибка
- **WHEN** обработка запроса завершается неожиданным исключением, например недоступностью БД
- **THEN** ответ `500` с безопасным `detail`, без traceback и параметров подключения; транзакция откатывается

#### Scenario: Сбой зависимого peer-сервиса
- **WHEN** при обработке `GET /api/pages` ya-metrica-service недоступна, отвечает не `200` или возвращает тело неверной схемы
- **THEN** ответ `502` с безопасным `detail`, без тела и адреса peer-сервиса

#### Scenario: Постановка парсинга и сбой очереди
- **WHEN** `POST /api/parse-jobs` принят, а брокер NATS недоступен
- **THEN** ответ `503` с безопасным `detail`, транзакция откатывается, адрес брокера не раскрывается

## ADDED Requirements

### Requirement: Access matrix постановки парсинга
Маршрут `POST /api/parse-jobs` SHALL относиться к классу Internal Trusted Network Write (исключение из Protected Write) наравне с остальными `/api/**`: credentials не требуются и не меняют результат, конюшня — только из `X-Equestrian-Id`, selector отсутствует или невалиден — `401` до разбора тела.

#### Scenario: Anonymous и посторонние credentials
- **WHEN** caller вызывает `POST /api/parse-jobs` с валидным selector без credentials, затем с произвольными cookie и `Authorization`
- **THEN** оба ответа `202` с одинаковой схемой, различается только `job_id`

#### Scenario: Нет selector
- **WHEN** caller вызывает маршрут без `X-Equestrian-Id`
- **THEN** ответ `401`, тело не разбирается, ни БД, ни NATS, ни yandex-service не вызываются

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/api/parse-jobs` | Internal Trusted Network Write (исключение) | доверенный внутренний caller (backend) | `202`; без/невалидный `X-Equestrian-Id` `401`; невалидное тело/провайдер/нет интеграции `400`; yandex-service недоступен `502`; брокер недоступен `503` | то же (cookie/Authorization игнорируются) |

Причина исключения не меняется: seo-service — приватный peer, роль `ADMIN` проверяет backend.
