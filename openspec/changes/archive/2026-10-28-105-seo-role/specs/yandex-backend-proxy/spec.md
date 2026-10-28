# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Доступ только для существующей роли ADMIN`
- TO: `### Requirement: Доступ только для роли SEO`

## MODIFIED Requirements

### Requirement: Доступ только для роли SEO

Все маршруты `/api/yandex/**` MUST требовать authenticated пользователя с существующей ролью `SEO`. Backend MUST использовать новую роль SEO из общего справочника scopes. Локальный permission guard допустим. Anonymous MUST получать `401`; любая роль без `SEO` (включая `SUPERUSER`, `DEVELOPER`, `USER_MANAGER`) и отсутствие ролей — `403` до downstream. Повышенные роли MUST NOT обходить проверку SEO.

#### Scenario: Anonymous
- **WHEN** любой маршрут вызывается без cookie сессии
- **THEN** backend возвращает `401`, peer не вызывается

#### Scenario: Не ADMIN по всем маршрутам
- **WHEN** каждый из восьми маршрутов вызывает authenticated пользователь с ролью `SUPERUSER`, `DEVELOPER`, `USER_MANAGER`, иной ролью либо без ролей, но без `SEO`
- **THEN** backend возвращает `403`, peer не вызывается

#### Scenario: ADMIN по всем маршрутам
- **WHEN** каждый из восьми маршрутов вызывает SEO при валидных данных своей конюшни и успешном peer
- **THEN** статусы и payload соответствуют access matrix, роль SEO обязательна

### Requirement: Ссылка авторизации Яндекса

`GET /api/yandex/auth/link` MUST возвращать `200` с `{auth_link}`, полученным от peer для конюшни из сессии. `state` ссылки равен `equestrian_id` конюшни (наблюдаемое поведение peer); backend MUST NOT добавлять client secret или иные секреты.

#### Scenario: Получение ссылки
- **WHEN** пользователь с ролью SEO запрашивает ссылку
- **THEN** backend возвращает `200` с `auth_link`, сформированной peer для его конюшни

### Requirement: Обмен кода авторизации

`POST /api/yandex/auth/code` с телом `{code, state}` MUST передавать peer `code` и `equestrian_id` из сессии и возвращать `200` с DTO аккаунта. Пустой/отсутствующий `code` или `state`, malformed JSON MUST давать `400` без downstream-вызова.

#### Scenario: Успешный обмен
- **WHEN** пользователь с ролью SEO отправляет валидный `code` и `state`, равный его `equestrian_id`
- **THEN** backend возвращает `200` с аккаунтом (шесть полей whitelist); повторная авторизация того же аккаунта возвращает ту же запись по `id`

#### Scenario: Невалидное тело
- **WHEN** `code` или `state` отсутствует, пустой, либо тело не JSON
- **THEN** backend возвращает `400` (не `422`) и не вызывает peer

### Requirement: Отвязка аккаунта Яндекса

`DELETE /api/yandex/accounts/{account_id}` MUST удалять аккаунт своей конюшни и возвращать `204` без тела. Malformed UUID MUST давать `400`. Удаление аккаунта каскадно удаляет привязку счётчика, сделанную через этот аккаунт (поведение storage peer).

#### Scenario: Успешная отвязка
- **WHEN** пользователь с ролью SEO удаляет аккаунт своей конюшни
- **THEN** backend возвращает `204`, а последующий список аккаунтов его не содержит

#### Scenario: Повторная отвязка
- **WHEN** тот же `account_id` удаляется повторно
- **THEN** backend возвращает `404`, поскольку аккаунта в конюшне больше нет

#### Scenario: Malformed UUID
- **WHEN** `account_id` не является UUID
- **THEN** backend возвращает `400` (не `422`) без downstream-вызова

### Requirement: Установка привязки счётчика

`POST /api/yandex/metrica/connection` с телом `{yandex_account_id, counter_id}` MUST создавать или заменять привязку конюшни из сессии и возвращать `200` с DTO привязки. `counter_id` — строка из 1..31 цифр (число допускается и приводится к строке); иное MUST давать `400`. Backend MUST NOT проверять доступность `counter_id` аккаунту дополнительным запросом счётчиков; ownership аккаунта остаётся обязательным.

#### Scenario: Первая привязка
- **WHEN** пользователь выбирает аккаунт своей конюшни и валидный `counter_id`
- **THEN** backend возвращает `200`, последующий `GET connection` возвращает этот счётчик

#### Scenario: Без проверки доступности счётчика
- **WHEN** SEO передаёт синтаксически валидный `counter_id` и аккаунт своей конюшни
- **THEN** backend передаёт установку привязки peer без вызова списка счётчиков для проверки доступности

#### Scenario: Замена привязки
- **WHEN** привязка уже есть и выбран другой счётчик или аккаунт
- **THEN** привязка конюшни заменяется, у конюшни остаётся одна привязка

#### Scenario: Невалидный counter_id
- **WHEN** `counter_id` пустой, содержит не цифры или длиннее 31 символа
- **THEN** backend возвращает `400` без downstream-вызова

### Requirement: Access matrix Yandex proxy

Backend MUST реализовать access matrix из сценария «Строки матрицы»; каждая строка покрывается anonymous и authenticated тестами. Все `GET` — Protected Sensitive Read (исключение из Public Read), все записи — Protected Write; публичных исключений нет.

#### Scenario: Строки матрицы
- **WHEN** reviewer сверяет реализацию и тесты с матрицей ниже
- **THEN** каждый маршрут даёт указанные статусы без auth и с auth, а причины исключений зафиксированы

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/yandex/auth/link` | Protected Sensitive Read (исключение) | SEO | `401` | `200`; без роли SEO `403`; peer error `400`/`502` |
| POST | `/api/yandex/auth/code` | Protected Write (не публичный callback) | SEO | `401` | `200`; без роли SEO `403`; state ≠ конюшня `403`; невалидное тело `400`; peer `400`/`502` |
| GET | `/api/yandex/accounts` | Protected Sensitive Read (исключение) | SEO | `401` | `200`; без роли SEO `403`; невалидные `limit/offset` `400` |
| DELETE | `/api/yandex/accounts/{account_id}` | Protected Write, tenant-owned resource | SEO | `401` | `204`; без роли SEO `403`; чужой/отсутствующий `404`; malformed `400` |
| GET | `/api/yandex/metrica/counters` | Protected Sensitive Read (исключение) | SEO | `401` | `200`; без роли SEO `403`; чужой/отсутствующий аккаунт `404`; missing/malformed `account_id` `400`; peer `400`/`502` |
| GET | `/api/yandex/metrica/connection` | Protected Sensitive Read (исключение) | SEO | `401` | `200` (`counter` или `null`); без роли SEO `403` |
| POST | `/api/yandex/metrica/connection` | Protected Write | SEO | `401` | `200`; без роли SEO `403`; чужой/отсутствующий аккаунт `404`; невалидное тело `400` |
| DELETE | `/api/yandex/metrica/connection` | Protected Write, tenant из сессии | SEO | `401` | `204` (идемпотентно); без роли SEO `403` |

Причины исключений: аккаунты содержат PII (email, телефон); OAuth-ссылка несёт tenant state и client ID приложения; счётчики и привязка получены по OAuth-токену конюшни. Consumer-сайтам эти данные не нужны. `POST auth/code` остаётся Protected, так как callback-страница работает на origin CMS с cookie сессии.

#### Scenario: Anonymous по всем строкам
- **WHEN** каждая строка матрицы вызывается без cookie
- **THEN** ответ `401`, downstream-вызовов нет

#### Scenario: Authenticated по всем строкам
- **WHEN** каждая строка вызывается пользователем с ролью `SEO` своей конюшни при успешном peer
- **THEN** статусы и payload соответствуют колонке `expected with auth`

#### Scenario: ADMIN не обходит tenant
- **WHEN** пользователь с ролью `SEO` передаёт `account_id` другой конюшни
- **THEN** backend возвращает `404` без вызова целевой операции peer

## ADDED Requirements

### Requirement: SEO не наследуется от административных ролей
Все восемь маршрутов /api/yandex/** SHALL разрешать SEO без ADMIN и SEO+ADMIN. ADMIN/SUPERUSER/DEVELOPER без SEO MUST получать 403 до downstream и проверки входных параметров.

#### Scenario: Параметризованный доступ
- **WHEN** каждая строка access matrix проверяется с SEO-only, SEO+ADMIN и ADMIN-only, включая невалидное тело
- **THEN** SEO допускается согласно матрице, ADMIN-only получает 403 без вызова peer
