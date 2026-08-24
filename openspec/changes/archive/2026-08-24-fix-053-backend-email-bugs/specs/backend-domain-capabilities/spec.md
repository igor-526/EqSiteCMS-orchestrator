## ADDED Requirements

### Requirement: Устойчивое создание лошади при коллизии tenant-scoped slug

Backend MUST при `POST /api/horses` формировать уникальный slug внутри текущего `equestrian_id`: первый объект получает нормализованный базовый slug, последующие коллизии получают минимальный свободный суффикс `-N`. Итоговый slug MUST укладываться в ограничение поля, а коллизия уникального индекса `ix_horse_equestrian_slug` MUST NOT приводить к необработанному HTTP 500. Проверка и создание MUST сохранять tenant isolation; иные DB constraints MUST NOT маскироваться как slug-конфликт.

#### Scenario: Повторное имя в одном tenant
- **WHEN** разрешённый пользователь дважды создаёт лошадь с именем, нормализуемым в один base slug, в одном tenant
- **THEN** обе операции завершаются успешно, а slug второй лошади получает минимальный свободный суффикс

#### Scenario: Пропуск занятого суффикса
- **WHEN** в tenant уже заняты `normann`, `normann-1` и `normann-2`
- **THEN** следующая лошадь получает `normann-3`

#### Scenario: Одинаковый slug в разных tenant
- **WHEN** одинаковые имена создаются в двух разных tenant
- **THEN** оба tenant могут использовать базовый slug без взаимного раскрытия или суффикса из-за чужих данных

#### Scenario: Максимальная длина slug
- **WHEN** base slug достигает максимальной длины и требует суффикс
- **THEN** backend обрезает только базовую часть, сохраняет полный суффикс и записывает валидный уникальный slug

#### Scenario: Конкурентная коллизия
- **WHEN** две транзакции конкурентно выбирают один свободный candidate slug
- **THEN** конкретная коллизия `ix_horse_equestrian_slug` обрабатывается ограниченным retry либо явным HTTP 400, но не HTTP 500; транзакция остаётся пригодной к корректному rollback/commit

#### Scenario: Иное нарушение целостности
- **WHEN** insert нарушает constraint, не являющийся `ix_horse_equestrian_slug`
- **THEN** backend не выдаёт его за slug-конфликт и сохраняет стандартную диагностику инфраструктурной ошибки

### Requirement: Access contract исправления создания лошади

Исправление MUST сохранять существующий Protected Write контракт и не менять Public Read endpoints.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `POST` | `/api/horses` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`; missing/invalid tenant selector `401`; no write | `200` с разрешённым scope и валидным selector; `403` без scope; invalid/foreign selector `401`; business validation `400`; duplicate generated slug suffixируется без `500` |

Исключений из default API policy нет.

#### Scenario: Anonymous create
- **WHEN** anonymous клиент вызывает `POST /api/horses`
- **THEN** backend возвращает `401` и не создаёт запись

#### Scenario: Authenticated без scope
- **WHEN** authenticated пользователь без `SUPERUSER`, `ADMIN`, `DEVELOPER` вызывает `POST /api/horses`
- **THEN** backend возвращает `403` и не создаёт запись

#### Scenario: Authenticated разрешённый пользователь
- **WHEN** authenticated пользователь с разрешённым scope и валидным tenant selector создаёт лошадь с коллидирующим generated slug
- **THEN** backend возвращает `200`, создаёт запись только в этом tenant и возвращает уникальный suffixed slug

#### Scenario: Public Read не регрессирует
- **WHEN** anonymous consumer с валидным tenant selector вызывает `GET /api/horses` или `GET /api/horses/{slug_or_id}` после создания suffixed slug
- **THEN** backend возвращает `200` и позволяет прочитать обе записи по их различным slug; missing/invalid selector возвращает `401`

### Requirement: Проверки регрессии horse slug

Реализация MUST иметь не менее 30 разнообразных unit scenarios и 30 live smoke scenarios, трассируемых к access matrix и требованиям уникальности. Smoke MUST выполняться smoke skill на живом API с реальной PostgreSQL, чьи параметры повторно получены через `docker inspect`; pytest smoke scripts, SQLite и in-memory замены запрещены.

#### Scenario: Unit gate
- **WHEN** Backend owner завершает реализацию
- **THEN** unit suite покрывает нормализацию, suffix sequence/length, tenant isolation, permissions, constraint discrimination, rollback/retry и негативные границы не менее чем 30 отдельными проверками

#### Scenario: Live smoke gate
- **WHEN** Quality Gate проверяет change
- **THEN** smoke skill выполняет не менее 30 HTTP/DB сценариев на реальном `eqsitecms-db`, включая anonymous/authenticated, scope, tenant, повторные и конкурентные create, read-after-write и отсутствие HTTP 500
