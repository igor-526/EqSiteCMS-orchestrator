# yandex-backend-proxy Specification

## Purpose
Browser-facing прокси основного backend к приватному `yandex-service`: управление аккаунтами Яндекса и привязкой счётчика Яндекс.Метрики конюшни из CMS с авторизацией, tenant-изоляцией и проверкой владения, которых нет в самом peer.

## Requirements

### Requirement: ENV адреса yandex-service в backend

Backend MUST адресовать `yandex-service` через ENV `YANDEX_SERVICE_URL` с каноническим локальным значением `http://eqsitecms-yandex-service:8000`. Переменная MUST присутствовать в `services/backend/.env.example` и быть описана в `services/backend/README.md`. Backend MUST NOT обращаться к `ya-metrica-service` напрямую.

#### Scenario: Конфигурация адреса
- **WHEN** backend формирует запрос к `yandex-service`
- **THEN** базовый адрес берётся из `YANDEX_SERVICE_URL`, а в README и `.env.example` переменная присутствует с каноническим значением

#### Scenario: Нет прямого вызова Метрики
- **WHEN** reviewer ищет обращения backend к `ya-metrica-service` или `YA_METRICA*`
- **THEN** таких обращений нет; счётчики запрашиваются только через `yandex-service`

### Requirement: Ответы прокси не содержат секретов

Response-схемы прокси MUST быть whitelist-схемами: аккаунт — только `id`, `yandex_id`, `yandex_login`, `display_name`, `email`, `yandex_phone`; счётчик Метрики — `counter_id`, `site`; привязка — `id`, `counter_id`, `yandex_account`. OAuth-токены, их ciphertext/expiry, avatar и `equestrian_id` MUST NOT попадать в ответы и логи backend.

#### Scenario: Peer вернул лишние поля
- **WHEN** ответ `yandex-service` содержит дополнительные поля, в том числе с токеном
- **THEN** backend возвращает только поля whitelist, лишние отбрасываются и не логируются

#### Scenario: Логи без секретов
- **WHEN** backend логирует ошибку обмена кода или downstream-сбой
- **THEN** в лог не попадают `code`, токены, email/телефон и тело ответа peer

### Requirement: Конюшня выводится из сессии

Все маршруты `/api/yandex/**` MUST определять конюшню как `equestrian_id` authenticated пользователя. Запросы MUST NOT принимать `equestrian_id` от вызывающего: такое поле в query/body игнорируется и не передаётся downstream.

#### Scenario: Попытка подменить конюшню
- **WHEN** authenticated пользователь передаёт `equestrian_id` другой конюшни в query или body
- **THEN** downstream получает `equestrian_id` из сессии пользователя, а переданное значение игнорируется

### Requirement: Доступ только для существующей роли ADMIN

Все маршруты `/api/yandex/**` MUST требовать authenticated пользователя с существующей ролью `ADMIN`. Backend MUST NOT вводить отдельную роль SEO или новый серверный scope. Локальный permission guard допустим. Anonymous MUST получать `401`; любая роль без `ADMIN` (включая `SUPERUSER`, `DEVELOPER`, `USER_MANAGER`) и отсутствие ролей — `403` до downstream. Повышенные роли MUST NOT обходить проверку ADMIN.

#### Scenario: Anonymous
- **WHEN** любой маршрут вызывается без cookie сессии
- **THEN** backend возвращает `401`, peer не вызывается

#### Scenario: Не ADMIN по всем маршрутам
- **WHEN** каждый из восьми маршрутов вызывает authenticated пользователь с ролью `SUPERUSER`, `DEVELOPER`, `USER_MANAGER`, иной ролью либо без ролей, но без `ADMIN`
- **THEN** backend возвращает `403`, peer не вызывается

#### Scenario: ADMIN по всем маршрутам
- **WHEN** каждый из восьми маршрутов вызывает ADMIN при валидных данных своей конюшни и успешном peer
- **THEN** статусы и payload соответствуют access matrix, отдельный SEO-scope не требуется

### Requirement: Ссылка авторизации Яндекса

`GET /api/yandex/auth/link` MUST возвращать `200` с `{auth_link}`, полученным от peer для конюшни из сессии. `state` ссылки равен `equestrian_id` конюшни (наблюдаемое поведение peer); backend MUST NOT добавлять client secret или иные секреты.

#### Scenario: Получение ссылки
- **WHEN** пользователь с ролью ADMIN запрашивает ссылку
- **THEN** backend возвращает `200` с `auth_link`, сформированной peer для его конюшни

### Requirement: Обмен кода авторизации

`POST /api/yandex/auth/code` с телом `{code, state}` MUST передавать peer `code` и `equestrian_id` из сессии и возвращать `200` с DTO аккаунта. Пустой/отсутствующий `code` или `state`, malformed JSON MUST давать `400` без downstream-вызова.

#### Scenario: Успешный обмен
- **WHEN** пользователь с ролью ADMIN отправляет валидный `code` и `state`, равный его `equestrian_id`
- **THEN** backend возвращает `200` с аккаунтом (шесть полей whitelist); повторная авторизация того же аккаунта возвращает ту же запись по `id`

#### Scenario: Невалидное тело
- **WHEN** `code` или `state` отсутствует, пустой, либо тело не JSON
- **THEN** backend возвращает `400` (не `422`) и не вызывает peer

### Requirement: Проверка state OAuth против конюшни сессии

Backend MUST сравнивать `state` из callback с `equestrian_id` пользователя. Несовпадение (в том числе state другой конюшни или не-UUID) MUST давать `403` до обращения к peer, чтобы код не был привязан к чужой или неожиданной конюшне.

#### Scenario: State чужой конюшни
- **WHEN** authenticated пользователь отправляет `state`, равный UUID другой конюшни
- **THEN** backend возвращает `403`, peer не вызывается, аккаунт не создаётся

### Requirement: Список аккаунтов Яндекса конюшни

`GET /api/yandex/accounts` MUST возвращать `200` с `{items, total}` аккаунтов конюшни из сессии; поддерживаются `search`, `limit` (по умолчанию 20) и `offset` (по умолчанию 0). Границы нормализуются так же, как в peer: `limit` 1..100, `offset` ≥ 0. Нечисловые `limit/offset` MUST давать `400`.

#### Scenario: Пустой список
- **WHEN** у конюшни нет аккаунтов
- **THEN** backend возвращает `200` с `items: []` и `total: 0`

#### Scenario: Пагинация
- **WHEN** запрошены `limit=1&offset=1` при двух аккаунтах
- **THEN** возвращается один элемент и `total: 2`

### Requirement: Проверка принадлежности аккаунта конюшне

Перед любой операцией с `account_id` (отвязка аккаунта, список счётчиков, установка привязки) backend MUST убедиться, что аккаунт принадлежит конюшне из сессии, по tenant-scoped списку аккаунтов peer. Чужой или отсутствующий аккаунт MUST давать `404` без целевого downstream-вызова и без раскрытия существования.

#### Scenario: Чужой аккаунт
- **WHEN** пользователь передаёт `account_id`, принадлежащий другой конюшне
- **THEN** backend возвращает `404` с тем же телом, что и для отсутствующего аккаунта, и не вызывает delete/counters/set peer

#### Scenario: Много аккаунтов
- **WHEN** у конюшни больше 100 аккаунтов и искомый находится не на первой странице peer
- **THEN** проверка просматривает страницы до нахождения аккаунта или исчерпания `total`

### Requirement: Отвязка аккаунта Яндекса

`DELETE /api/yandex/accounts/{account_id}` MUST удалять аккаунт своей конюшни и возвращать `204` без тела. Malformed UUID MUST давать `400`. Удаление аккаунта каскадно удаляет привязку счётчика, сделанную через этот аккаунт (поведение storage peer).

#### Scenario: Успешная отвязка
- **WHEN** пользователь с ролью ADMIN удаляет аккаунт своей конюшни
- **THEN** backend возвращает `204`, а последующий список аккаунтов его не содержит

#### Scenario: Повторная отвязка
- **WHEN** тот же `account_id` удаляется повторно
- **THEN** backend возвращает `404`, поскольку аккаунта в конюшне больше нет

#### Scenario: Malformed UUID
- **WHEN** `account_id` не является UUID
- **THEN** backend возвращает `400` (не `422`) без downstream-вызова

### Requirement: Список счётчиков Метрики аккаунта

`GET /api/yandex/metrica/counters?account_id=...` MUST возвращать `200` с `{items: [{counter_id, site}], total}` для аккаунта своей конюшни; поддерживаются `search`, `limit` (1..100, по умолчанию 20) и `offset` (≥ 0). Отсутствующий или malformed `account_id` MUST давать `400`.

#### Scenario: Счётчики аккаунта
- **WHEN** пользователь запрашивает счётчики аккаунта своей конюшни
- **THEN** backend возвращает `200` со списком и `total`, полученными через `yandex-service`

#### Scenario: Отказ Яндекса
- **WHEN** peer отвечает `400` (например, токен недействителен или Яндекс недоступен)
- **THEN** backend возвращает `400` с безопасным сообщением по правилу маппинга ошибок

### Requirement: Чтение привязки счётчика конюшни

`GET /api/yandex/metrica/connection` MUST возвращать `200` с `{counter: null}`, если счётчик не привязан, либо `{counter: {id, counter_id, yandex_account}}` для конюшни из сессии.

#### Scenario: Не привязано
- **WHEN** у конюшни нет привязанного счётчика
- **THEN** backend возвращает `200` с `counter: null`

#### Scenario: Привязано
- **WHEN** у конюшни есть привязка
- **THEN** ответ содержит `counter_id` и аккаунт (шесть полей whitelist) без токенов

### Requirement: Установка привязки счётчика

`POST /api/yandex/metrica/connection` с телом `{yandex_account_id, counter_id}` MUST создавать или заменять привязку конюшни из сессии и возвращать `200` с DTO привязки. `counter_id` — строка из 1..31 цифр (число допускается и приводится к строке); иное MUST давать `400`. Backend MUST NOT проверять доступность `counter_id` аккаунту дополнительным запросом счётчиков; ownership аккаунта остаётся обязательным.

#### Scenario: Первая привязка
- **WHEN** пользователь выбирает аккаунт своей конюшни и валидный `counter_id`
- **THEN** backend возвращает `200`, последующий `GET connection` возвращает этот счётчик

#### Scenario: Без проверки доступности счётчика
- **WHEN** ADMIN передаёт синтаксически валидный `counter_id` и аккаунт своей конюшни
- **THEN** backend передаёт установку привязки peer без вызова списка счётчиков для проверки доступности

#### Scenario: Замена привязки
- **WHEN** привязка уже есть и выбран другой счётчик или аккаунт
- **THEN** привязка конюшни заменяется, у конюшни остаётся одна привязка

#### Scenario: Невалидный counter_id
- **WHEN** `counter_id` пустой, содержит не цифры или длиннее 31 символа
- **THEN** backend возвращает `400` без downstream-вызова

### Requirement: Удаление привязки счётчика

`DELETE /api/yandex/metrica/connection` MUST удалять привязку конюшни из сессии, определяя запись привязки через peer, и возвращать `204`. Отсутствие привязки MUST давать `204` без вызова удаления peer (идемпотентность). Маршрут не принимает идентификатор, поэтому удалить чужую привязку невозможно.

#### Scenario: Удаление существующей привязки
- **WHEN** у конюшни есть привязка
- **THEN** backend удаляет её и возвращает `204`, затем `GET connection` возвращает `counter: null`

#### Scenario: Повторное удаление
- **WHEN** привязки нет
- **THEN** backend возвращает `204` и не вызывает DELETE peer

### Requirement: Маппинг ошибок yandex-service

Peer отвечает только `200/204/400`. Backend MUST транслировать peer `400` в `400` с `detail`, если это строка до 300 символов, иначе с общим сообщением. Сетевая ошибка, timeout (10 с), иной статус или невалидное тело MUST давать `502` без внутреннего адреса peer.

#### Scenario: Peer 400 со строковым detail
- **WHEN** peer возвращает `400` с `detail: "Аккаунт не найден"`
- **THEN** backend возвращает `400` с тем же `detail`

#### Scenario: Peer недоступен
- **WHEN** соединение с `yandex-service` не устанавливается, превышен timeout или пришёл `5xx`/невалидный JSON
- **THEN** backend возвращает `502` с общим сообщением, не содержащим URL/hostname peer

### Requirement: Отсутствие peer-service credential

Вызовы backend к `yandex-service` MUST выполняться без peer credential (`X-Service-Key` и аналогов), в соответствии с текущим peer-контрактом без auth. Это не подтверждает production-изоляцию peer; ограничение `yandex-peer-http-contract` о защите внешней границы перед production сохраняется.

#### Scenario: Запрос без credential
- **WHEN** выполняется client-boundary тест любого метода клиента
- **THEN** запрос не содержит `X-Service-Key`, `Authorization` и cookie пользователя

### Requirement: Access matrix Yandex proxy

Backend MUST реализовать access matrix из сценария «Строки матрицы»; каждая строка покрывается anonymous и authenticated тестами. Все `GET` — Protected Sensitive Read (исключение из Public Read), все записи — Protected Write; публичных исключений нет.

#### Scenario: Строки матрицы
- **WHEN** reviewer сверяет реализацию и тесты с матрицей ниже
- **THEN** каждый маршрут даёт указанные статусы без auth и с auth, а причины исключений зафиксированы

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/yandex/auth/link` | Protected Sensitive Read (исключение) | ADMIN | `401` | `200`; без роли ADMIN `403`; peer error `400`/`502` |
| POST | `/api/yandex/auth/code` | Protected Write (не публичный callback) | ADMIN | `401` | `200`; без роли ADMIN `403`; state ≠ конюшня `403`; невалидное тело `400`; peer `400`/`502` |
| GET | `/api/yandex/accounts` | Protected Sensitive Read (исключение) | ADMIN | `401` | `200`; без роли ADMIN `403`; невалидные `limit/offset` `400` |
| DELETE | `/api/yandex/accounts/{account_id}` | Protected Write, tenant-owned resource | ADMIN | `401` | `204`; без роли ADMIN `403`; чужой/отсутствующий `404`; malformed `400` |
| GET | `/api/yandex/metrica/counters` | Protected Sensitive Read (исключение) | ADMIN | `401` | `200`; без роли ADMIN `403`; чужой/отсутствующий аккаунт `404`; missing/malformed `account_id` `400`; peer `400`/`502` |
| GET | `/api/yandex/metrica/connection` | Protected Sensitive Read (исключение) | ADMIN | `401` | `200` (`counter` или `null`); без роли ADMIN `403` |
| POST | `/api/yandex/metrica/connection` | Protected Write | ADMIN | `401` | `200`; без роли ADMIN `403`; чужой/отсутствующий аккаунт `404`; невалидное тело `400` |
| DELETE | `/api/yandex/metrica/connection` | Protected Write, tenant из сессии | ADMIN | `401` | `204` (идемпотентно); без роли ADMIN `403` |

Причины исключений: аккаунты содержат PII (email, телефон); OAuth-ссылка несёт tenant state и client ID приложения; счётчики и привязка получены по OAuth-токену конюшни. Consumer-сайтам эти данные не нужны. `POST auth/code` остаётся Protected, так как callback-страница работает на origin CMS с cookie сессии.

#### Scenario: Anonymous по всем строкам
- **WHEN** каждая строка матрицы вызывается без cookie
- **THEN** ответ `401`, downstream-вызовов нет

#### Scenario: Authenticated по всем строкам
- **WHEN** каждая строка вызывается пользователем с ролью `ADMIN` своей конюшни при успешном peer
- **THEN** статусы и payload соответствуют колонке `expected with auth`

#### Scenario: ADMIN не обходит tenant
- **WHEN** пользователь с ролью `ADMIN` передаёт `account_id` другой конюшни
- **THEN** backend возвращает `404` без вызова целевой операции peer

### Requirement: Классификация в route inventory

Все восемь маршрутов MUST быть классифицированы в `maintain/route_inventory.py`, а сгенерированный `docs/backend-route-inventory.md` MUST быть актуальным; тест инвентаря MUST учитывать новое число маршрутов.

#### Scenario: Инвентарь актуален
- **WHEN** запускается `tests/unit/api/test_route_access_inventory.py`
- **THEN** каждый новый маршрут имеет ровно одну классификацию и сгенерированный артефакт совпадает с файлом
