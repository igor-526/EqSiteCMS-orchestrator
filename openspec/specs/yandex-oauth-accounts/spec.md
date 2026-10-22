# Spec Delta — OAuth, аккаунты и хранение токенов Яндекса

## Purpose

Зафиксировать существующий OAuth-поток, аккаунты и хранение токенов yandex-service с проверяемыми источниками, отделяя функциональный baseline от нерешённых вопросов доступа и lifecycle.

Источники E1..E10, baseline и нерешённые вопросы находятся в [proposal](<../../proposal.md#source-anchors>). Это WIP ретроспективного slice; static evidence не означает runtime PASS. Общие ошибки/HTTP outcomes не переопределяются.



## Requirements

### Requirement: Инициация OAuth с tenant state

Сервис SHALL выдавать ссылку авторизации с `response_type=code`, настроенными client ID/redirect URI и строковым `equestrian_id` в `state`. Это tenant hint, не подтверждение прав или защищённая корреляция callback. Текущее построение URL фиксируется без обещания дополнительного encoding или nonce (E1,E2).

#### Scenario: Y1-01 Ссылка для конюшни
- **WHEN** передан валидный UUID `equestrian_id`
- **THEN** `GET /api/auth/link` возвращает `auth_link` с указанными параметрами и state; secret клиента в ссылку не включается

#### Scenario: Y1-02 Невалидный selector
- **WHEN** обязательный UUID отсутствует или malformed
- **THEN** применяется validation/error clause main peer contract до вызова OAuth service; unit не обещает общий backend `401`

### Requirement: Обмен кода и получение профиля

Сервис SHALL обменивать строковый code на OAuth tokens, затем получать профиль с выданным access token, и только после валидного профиля готовить запись аккаунта. Вход содержит code и UUID конюшни; отдельный state в callback DTO отсутствует. Error mapping остаётся в main client-failures contract (E1,E2,E3).

#### Scenario: Y1-03 Успешная последовательность
- **WHEN** получены code и UUID, оба upstream ответа пригодны
- **THEN** выполняется POST token с grant_type authorization_code и Basic client credentials, затем GET user info с OAuth access token; возврат аккаунта происходит после сохранения

#### Scenario: Y1-04 Отказ до записи
- **WHEN** обмен кода или запрос профиля завершается ошибкой клиента
- **THEN** применяется «Преобразование клиентской ошибки сервисом» main client-failures spec; lookup/create/update аккаунта не выполняются (E2)

### Requirement: Привязка аккаунта к конюшне и повторная авторизация

Сервис SHALL искать аккаунт по паре `(equestrian_id, yandex_id)` и создавать его при отсутствии либо заменять профиль и оба зашифрованных токена при наличии, сохраняя UUID существующей записи. Это lookup+write, не гарантия атомарного конкурентного upsert (E2,E5,E6).

#### Scenario: Y1-05 Первая авторизация
- **WHEN** для указанной пары ещё нет аккаунта
- **THEN** сохраняется новая запись с tenant, Yandex ID/login/display name, email/avatar/phone, ciphertext обоих токенов и expiry; отсутствующий phone сохраняется как null

#### Scenario: Y1-06 Повторная авторизация и другой tenant
- **WHEN** аккаунт уже найден для этой пары или тот же Yandex ID авторизуется в другой конюшне
- **THEN** в первом случае обновляются профиль, ciphertext и expiry с прежним UUID; во втором поиск отделён tenant predicate и не переиспользует чужую запись

### Requirement: Минимальный ответ аккаунта без OAuth секретов

Успешная авторизация и account list SHALL выдавать только `id`, `yandex_id`, `yandex_login`, `display_name`, `email`, `yandex_phone`. Plaintext/ciphertext access и refresh token, expiry, avatar и tenant не входят в этот account DTO. Это исключение секретов не делает PII общедоступными (E3,E4).

#### Scenario: Y1-07 Account DTO
- **WHEN** аккаунт содержит токены и все внутренние поля
- **THEN** ответ code и каждый элемент list сохраняет только перечисленные шесть полей, включая null email/phone, без внутренних полей и токенов

### Requirement: Шифрование токенов при хранении

Оба OAuth token SHALL сохраняться зашифрованными; одинаковый plaintext не требует одинакового ciphertext. Расшифровка тем же ключом восстанавливает исходный UTF-8 текст; повреждение либо другой ключ даёт контролируемую ошибку. Текущая схема не обещает key rotation, версионирования ключей или автоматической миграции ciphertext (E2,E7).

#### Scenario: Y1-08 Обратимость и случайность
- **WHEN** оба токена шифруются перед сохранением, включая одинаковый вход дважды
- **THEN** ciphertext отличается от plaintext и между вызовами, а тот же ключ восстанавливает вход; token поля не возвращаются в account DTO

#### Scenario: Y1-09 Повреждение или неверный ключ
- **WHEN** расшифровывается повреждённый либо чужим ключом зашифрованный текст
- **THEN** возникает ValueError с сохранённой причиной InvalidToken; исходный token не требуется для диагностического сообщения

### Requirement: Expiry хранится без автоматического refresh в текущей цепочке

Сервис SHALL вычислять expiry как текущее UTC время плюс `expires_in` секунд и сохранять refresh token. В изученной цепочке выдача токена только читает/расшифровывает access token, не проверяет expiry и не обновляет его через refresh. Это lifecycle limitation, а не утверждение пригодности просроченного токена (E2,E9).

#### Scenario: Y1-10 Нулевой или отрицательный срок
- **WHEN** `expires_in` равен нулю, отрицательному или положительному представимому числу
- **THEN** сохраняется соответствующий UTC timestamp без принудительного увеличения срока; нулевой/отрицательный срок сам по себе не отклоняется

#### Scenario: Y1-11 Чтение сохранённого токена
- **WHEN** внутренний вызов выдачи запрашивает существующий account ID с decryptable token, независимо от expiry
- **THEN** текущий сервис возвращает расшифрованный access token без refresh или проверки срока; отсутствие аккаунта не запускает расшифровку и даёт ClientError по main error contract

### Requirement: Непригодные данные не записываются

При невозможности подготовить профиль, ciphertext или представимый expiry сервис SHALL завершить авторизацию ошибкой до lookup/write. Ограничения полей задаются наблюдаемой сущностью и storage; проверяется длина ciphertext, а не произвольно выбранный лимит plaintext token (E2,E6).

#### Scenario: Y1-12 Границы профиля и ciphertext
- **WHEN** превышены лимиты ID/avatar 63, login/display name 127, email 320, phone 31 или ciphertext token 511 символов
- **THEN** подготовка аккаунта отклоняется до repository lookup/write, с безопасным AppError на API boundary

#### Scenario: Y1-13 Сбой подготовки
- **WHEN** срок переполняет datetime либо шифрование при подготовке даёт ValueError/TypeError
- **THEN** аккаунт не записывается, причина сохраняется в AppError chaining, внешний ответ следует main peer contract

### Requirement: Tenant-scoped account search и пагинация

Список SHALL фильтроваться по `equestrian_id`, с необязательным регистронезависимым SQL pattern search по login/display name/email; результат содержит `items` и непагинированный `total`. Default limit/offset равны 20/0, limit ограничивается 1..100, offset снизу 0. Порядок — created_at descending без обещания tie-breaker (E4,E5).

#### Scenario: Y1-14 Pattern search, не regex
- **WHEN** search задан, в том числе пустой, `%`, `_` или `Лошадь.*`
- **THEN** применяется `ILIKE` к шаблону `%search%` по трём полям с OR и tenant predicate с AND; `%`/`_` остаются SQL wildcards, regex-семантика не обещается

#### Scenario: Y1-15 Границы и пустая страница
- **WHEN** limit меньше 1 или больше 100, offset отрицателен либо выходит за конец результата
- **THEN** границы нормализуются, total считается с тем же tenant/search без limit/offset; вне страницы items пуст, total не обнуляется

### Requirement: Удаление аккаунта и storage identity

Удаление SHALL завершаться `204` без тела для валидного UUID, включая отсутствующий аккаунт, без предварительного existence lookup. Storage ограничивает уникальность пары tenant/Yandex ID для non-null tenant; физическое удаление аккаунта имеет существующий FK cascade на привязанный счётчик. Эта storage связь не специфицирует gateway/binding API (E4,E5,E6).

#### Scenario: Y1-16 Повторное удаление
- **WHEN** запрошено удаление существующего либо уже отсутствующего UUID
- **THEN** выполняется delete по ID и возвращается пустой 204; malformed UUID следует validation clause main peer contract

#### Scenario: Y1-17 Конкурентное создание и cascade
- **WHEN** две записи имеют одну non-null пару tenant/Yandex ID либо удаляется запись со связанным счётчиком
- **THEN** DDL задаёт unique index и соответственно FK ON DELETE CASCADE; успешный конкурентный upsert/retry не гарантирован, real PostgreSQL исполнение этих outcomes в Y1 не доказано

### Requirement: Транзакция завершается до успешного HTTP ответа

OAuth/accounts routes SHALL завершать request transaction до отправки успешного ответа; ошибка записи/commit не должна выглядеть успешной авторизацией или удалением. Сессия освобождается после запроса. Repository flush не равен commit; внешний HTTP error outcome остаётся в main peer contract (E5,E8).

#### Scenario: Y1-18 Успех и commit failure
- **WHEN** обработка завершается штатно или commit завершается ошибкой
- **THEN** в первом случае commit/cleanup предшествуют 200/204, во втором выполняются rollback/cleanup и безопасный 400 вместо успеха; fake-session тест не доказывает durability PostgreSQL

#### Scenario: Y1-19 Ошибки repository и целостность
- **WHEN** lookup/create/update авторизации даёт RepositoryError или list/delete завершается необработанной DB ошибкой
- **THEN** авторизация преобразует RepositoryError в AppError, list/delete не обещают такое преобразование; boundary возвращает безопасный 400 после rollback, не успех и не диагностический SQL

### Requirement: Access evidence не является security approval

Ретроспективный контракт MUST отличать отсутствие auth checks от разрешённого доступа и не считать ID либо fake headers доказательством прав. Anonymous/header-bearing проверки трассируются к матрице сценария Y1-20; валидные auth/role/owner tests и подтверждение private exposure остаются S1. Чувствительные GET и незащищённые writes MUST NOT объявляться публично разрешёнными этим backfill.

#### Scenario: Y1-20 Anonymous OAuth/accounts
- **WHEN** static review сопоставляет запросы без credentials с прочитанными auth/accounts API tests
- **THEN** фиксируются наблюдаемые 200/204 и validation/upstream 400 по матрице, одновременно регистрируются отсутствие owner/role checks и непроверенная private boundary, а не новое security exception

##### Access matrix — наблюдение, не security approval

`with auth` ниже означает только header-bearing probe из E10, НЕ валидную проверенную сессию. Статусы относятся к прямому ASGI peer при валидных данных и успешных зависимостях; сетевой/gateway доступ и production isolation неизвестны. Для валидной user auth/roles поведение не подтверждено. `equestrian_id` и `account_id` — identity hints, не proof of auth.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/auth/link` | наблюдаемый auth initiation; policy review S1 | проверки ролей не обнаружены, допустимые роли unknown | static/tests: 200; missing/invalid UUID 400 (E1,E3) | fake headers: то же; валидная session unknown |
| POST | `/api/auth/code` | наблюдаемый OAuth callback write; exception review S1 | проверки ролей не обнаружены, допустимые роли unknown | static/tests: 200; invalid body/upstream 400 (E1,E2,E3) | fake headers: то же; валидная session unknown |
| GET | `/api/accounts/` | чувствительный peer read; НЕ Public Read consumer API | проверки ролей не обнаружены, допустимые роли unknown | static/tests: 200; missing/invalid selector/числовые параметры 400 (E4) | fake headers: то же; валидная session unknown |
| DELETE | `/api/accounts/{account_id}` | наблюдаемая незащищённая запись; GAP-AUTH-01/03, НЕ одобренный Protected Write | owner/role checks не обнаружены | static/tests: 204, absent ID тоже; malformed UUID 400 (E4,E5) | fake headers: то же; валидная session unknown |
| GET | `/api/servicing/access-token/{account_id}` | чувствительная выдача plaintext token; НЕ Public Read | owner/role checks не обнаружены | static route: 200 с токеном; absent/decrypt error 400 по main contract (E9) | route не читает credentials; валидная session/парный API тест в Y1 не проверены; сверить Y5 в S1 |

Причины рассмотрения исключений: OAuth link/code обслуживают OAuth flow; accounts раскрывает email/телефон, token route — секрет, DELETE меняет данные. Отсутствие auth dependency не доказывает доверенного caller или изоляцию и не легализует эти операции. Существующая peer matrix задаёт отдельное dev-допущение; здесь оно не расширяется и не заменяет согласование S1. Security remediation не входит в этот slice.

#### Scenario: Y1-21 Header-bearing и чужой ресурс
- **WHEN** те же запросы несут fake Cookie/Authorization или UUID другой конюшни
- **THEN** прочитанные тесты фиксируют отсутствие изменения прав от заголовков и проверки ownership; это не тест валидной аутентификации, а gap для S1; token route требует отдельной сверки anonymous/authenticated Y5

