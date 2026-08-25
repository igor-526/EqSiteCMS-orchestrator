# callback-request-lifecycle Specification

## Purpose
TBD - synchronized from change callback-requests-management-055.

## Requirements
### Requirement: Журнал и реестр статусов callback-заявок
Backend SHALL хранить callback-заявки в PostgreSQL с tenant/equestrian ownership, `name`, `phone`, `comment`, числовым `status`, `is_spam`, `notifications_delivered`, `created_at` и `updated_at`; полный seed-реестр SHALL содержать ровно два уникальных кода `1` «Новая» и `2` «Обработана» с валидным HEX-цветом каждого тега.

#### Scenario: Создание журналируемой заявки
- **WHEN** валидная публичная заявка принята
- **THEN** запись создаётся со статусом `1`, `is_spam=false`, `notifications_delivered=false` и server-generated timestamps

#### Scenario: Реестр сидируется повторно
- **WHEN** seed-механизм запускается несколько раз
- **THEN** два статуса существуют ровно по одному разу и их коды/названия/цвета согласованы

### Requirement: Разрешённые переходы и неизменность заявки
Платформа MUST позволять CMS менять только `status` и `is_spam`, а service caller — только `status`, `is_spam` либо подтверждать `notifications_delivered=true` соответствующим узким endpoint; изменение контактных данных, tenant, timestamps и удаление заявки MUST быть невозможно. Delivery confirmation SHALL означать успешную публикацию notification-service downstream email command и MUST NOT зависеть от SMTP acknowledgement. Установка `is_spam=true` SHALL атомарно присваивать статус `2` («Обработана»); снятие spam SHALL менять только `is_spam`, сохраняя текущий статус.

#### Scenario: Администратор меняет статус
- **WHEN** ADMIN или SUPERUSER присваивает существующий seeded status
- **THEN** меняется только status и updated_at

#### Scenario: Spam переводит заявку в обработанное состояние
- **WHEN** пользователь или service caller устанавливает `is_spam=true`
- **THEN** одна транзакция сохраняет `is_spam=true` и `status=2` («Обработана»)

#### Scenario: Снятие spam сохраняет статус
- **WHEN** пользователь снимает spam у обработанной spam-заявки
- **THEN** `is_spam=false`, а status остаётся `2` («Обработана»)

#### Scenario: Произвольное редактирование запрещено
- **WHEN** caller передаёт name, phone, comment либо неизвестное поле в mutation
- **THEN** API возвращает `422` и не изменяет запись

#### Scenario: Service подтверждает downstream publication
- **WHEN** caller с valid service key подтверждает успешную публикацию email command
- **THEN** backend идемпотентно устанавливает `notifications_delivered=true` без ожидания SMTP receipt

#### Scenario: Delivery-флаг нельзя сбросить или выставить пользователем
- **WHEN** CMS caller пытается изменить delivery-флаг либо service caller передаёт `false`
- **THEN** API возвращает `403` или `422` согласно access/validation boundary и не изменяет значение

### Requirement: Список, деталь, сортировка, фильтры и пагинация
CMS list SHALL поддерживать `limit/offset`, стабильную сортировку по `created_at` и `status`, фильтры `created_at_from/to`, множественные `status`, множественные `is_spam`, а также безопасный регистронезависимый regex для `name`, `phone`, `comment`. Default SHALL быть `is_spam=false`, `status ASC, created_at DESC, id ASC`; detail SHALL возвращать полную заявку без внутренних tenant/service данных.

#### Scenario: Список без параметров
- **WHEN** разрешённый пользователь запрашивает список без query parameters
- **THEN** ответ исключает spam и отсортирован по status ASC, created_at DESC, id ASC

#### Scenario: Комбинированные фильтры
- **WHEN** заданы даты, несколько статусов/spam-значений и regex-поля
- **THEN** backend применяет их совместно, возвращает total и страницу `items`

#### Scenario: Небезопасное regex-выражение
- **WHEN** regex невалиден либо превышает лимиты сложности/длины
- **THEN** API возвращает `422` без выполнения неограниченного database expression

#### Scenario: Деталь заявки
- **WHEN** разрешённый пользователь запрашивает существующую заявку
- **THEN** он получает полные name/phone/comment/status/spam/delivery/timestamps без UUID всадника

### Requirement: Access matrix callback API
Backend MUST реализовать следующую матрицу доступа и проверять tenant selector до доступа к tenant data. `POST /callback_requests` является публичным write-исключением, потому что его вызывает anonymous consumer form; три service PATCH являются защищёнными машинными командами по `X-Service-Key`; GET списка/детали являются защищёнными исключениями из Public Read из-за персональных данных.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/callback_requests` | Public Write exception + tenant selector | anonymous/authenticated | `201`; missing/invalid selector `401` | `201`; missing/invalid selector `401` |
| GET | `/callback_requests/statuses` | Public Read | all | `200` | `200` |
| GET | `/callback_requests` | Protected Read exception (PII) | ADMIN, SUPERUSER | `401` | `200`; other role `403` |
| GET | `/callback_requests/{id}` | Protected Read exception (PII) | ADMIN, SUPERUSER | `401` | `200`; other role `403`; missing `404` |
| PATCH | `/callback_requests/{id}/status` | Protected Write | ADMIN, SUPERUSER | `401` | `200`; other role `403`; missing `404` |
| PATCH | `/callback_requests/{id}/spam` | Protected Write | ADMIN, SUPERUSER | `401` | `200`; other role `403`; missing `404` |
| PATCH | `/service/callback_requests/{id}/status` | Protected Service Write | valid service key | `401` | `200`; invalid key `401`; missing `404` |
| PATCH | `/service/callback_requests/{id}/spam` | Protected Service Write | valid service key | `401` | `200`; invalid key `401`; missing `404` |
| PATCH | `/service/callback_requests/{id}/notifications-delivered` | Protected Service Write | valid service key | `401` | `200`; invalid key `401`; missing `404` |

#### Scenario: Anonymous и authenticated access
- **WHEN** матрица проверяется без cookie, с ADMIN/SUPERUSER, с иной ролью и с valid/invalid service key
- **THEN** каждый endpoint возвращает указанный статус и не раскрывает чужие tenant-записи

#### Scenario: Чужая tenant-заявка
- **WHEN** разрешённый CMS user обращается к id другого tenant
- **THEN** backend возвращает `404` без раскрытия существования ресурса

### Requirement: Документация публичного создания
Developer consumer documentation SHALL описывать только `POST /callback_requests`, selector, request/response и ошибки; CMS/service операции MUST оставаться только во внутреннем OpenAPI/contract inventory.

#### Scenario: Проверка developer documentation
- **WHEN** разработчик читает public consumer documentation
- **THEN** он находит создание заявки и не находит list/detail/status/spam/delivery endpoints

