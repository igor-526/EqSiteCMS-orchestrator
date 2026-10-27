# Spec Delta: seo-peer-http-contract

## MODIFIED Requirements

### Requirement: Множество HTTP-статусов и безопасные ошибки
seo-service SHALL отвечать `200`, `201`, `204` при успехе; `400` при невалидном теле, query, path-параметре или нормализации; `401` только при проблемах tenant selector; `404` для отсутствующего в конюшне элемента; `409` для дубля; `502`, когда зависимый peer-сервис (ya-metrica-service) недоступен или нарушил контракт; `500` для непредвиденной ошибки. Тело ошибки MUST содержать только `detail` без входных значений, SQL, traceback, параметров подключения и тела ответа peer-сервиса.

#### Scenario: Невалидное тело
- **WHEN** caller с валидным `X-Equestrian-Id` отправляет malformed JSON или тело неверной схемы
- **THEN** ответ `400`, `detail` не содержит введённых значений

#### Scenario: Непредвиденная ошибка
- **WHEN** обработка запроса завершается неожиданным исключением, например недоступностью БД
- **THEN** ответ `500` с безопасным `detail`, без traceback и параметров подключения; транзакция откатывается

#### Scenario: Сбой зависимого peer-сервиса
- **WHEN** при обработке `GET /api/pages` ya-metrica-service недоступна, отвечает не `200` или возвращает тело неверной схемы
- **THEN** ответ `502` с безопасным `detail`, без тела и адреса peer-сервиса

## ADDED Requirements

### Requirement: Access matrix списка страниц с метриками
Изменённый маршрут `GET /api/pages` SHALL сохранять класс Internal Trusted Network Read (исключение из Public Read) по матрице ниже; credentials не требуются и не меняют результат, конюшня — только из `X-Equestrian-Id`.

#### Scenario: Anonymous и посторонние credentials
- **WHEN** caller вызывает `GET /api/pages` с валидным `X-Equestrian-Id` без credentials, затем с произвольными cookie и `Authorization`
- **THEN** оба ответа `200` с идентичным телом, включая `metrics_table`

#### Scenario: Нет tenant selector
- **WHEN** caller вызывает `GET /api/pages?mode=week` без `X-Equestrian-Id`
- **THEN** ответ `401`, ни БД seo-service, ни ya-metrica не вызываются

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/pages` | Internal Trusted Network Read (исключение) | доверенный внутренний caller (backend) | `200` c `items/total/metrics_table`; без/невалидный `X-Equestrian-Id` `401` до обращения к БД и ya-metrica; невалидные `mode`/`metric`/даты (одна дата без другой, обратный диапазон)/`ordering`/`limit`/`offset` `400` без вызова ya-metrica; будущие даты не отклоняются, а ограничиваются сегодняшним днём по `SEO_UTC_OFFSET_HOURS`; сбой ya-metrica `502` | то же (cookie/Authorization игнорируются) |

Причина исключения не меняется: статистика и список страниц — внутренние SEO-данные администрирования, публичным `site-*` не нужны.
