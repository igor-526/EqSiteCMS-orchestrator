# Purpose

Закрепить сквозное управление API-доступом EqSiteCMS: Public Read для обычного чтения, Protected Write для изменений, обязательную access matrix, документированные исключения и независимую проверку anonymous/authenticated поведения на всех стадиях change.

## Requirements

### Requirement: Дефолтная классификация endpoint
Каждый API change SHALL классифицировать `GET` как Public Read без авторизации, а `POST`, `PATCH` и `DELETE` как Protected Write с авторизацией и проверкой прав, если не зафиксировано явное исключение.

#### Scenario: Публичное чтение
- **WHEN** anonymous consumer вызывает обычный `GET` endpoint без cookie
- **THEN** endpoint возвращает контрактный успешный ответ без требования CMS-аутентификации

#### Scenario: Анонимная запись
- **WHEN** anonymous клиент вызывает обычный `POST`, `PATCH` или `DELETE`
- **THEN** endpoint отклоняет запрос контрактным `401` или `403`

#### Scenario: Разрешённая запись
- **WHEN** authenticated пользователь с требуемой ролью вызывает Protected Write endpoint
- **THEN** endpoint выполняет операцию согласно контракту

### Requirement: Access matrix в планировании
Proposal/specs для изменения endpoint SHALL содержать матрицу `method | path | access class | roles | tenant selector | owner rule | expected without auth | expected with auth | foreign resource | validation status | tests` и SHALL отличать user authentication от несекретного tenant selector. Endpoint-specific validation status MUST иметь приоритет над общим framework default только там, где это явно зафиксировано.

#### Scenario: Planner описывает API change
- **WHEN** change добавляет или изменяет endpoint
- **THEN** его OpenSpec-артефакты явно фиксируют access class, роли, selector, ownership, anonymous/authenticated/foreign outcomes, validation status и связанные тесты

#### Scenario: Planner описывает email proxy
- **WHEN** change затрагивает backend email proxy
- **THEN** matrix фиксирует owner-only без privileged override, `401`, foreign `403` до lookup, owner `404`, invalid `400`, same-email `201`, different-email `409` и публичные confirmation exceptions

### Requirement: Документирование исключений
Исключение из дефолтной policy MUST содержать причину, ожидаемые HTTP-статусы без и с авторизацией и тесты; без этих данных change MUST считаться неготовым к apply.

#### Scenario: Публичный auth POST
- **WHEN** login endpoint должен принимать unauthenticated `POST`
- **THEN** spec фиксирует причину публичности, успешный и ошибочные статусы и тесты без cookie

#### Scenario: Защищённый чувствительный GET
- **WHEN** профиль или служебные данные требуют защищённого `GET`
- **THEN** spec фиксирует чувствительность данных, роли, anonymous `401`/`403`, authenticated результат и тесты

### Requirement: Сквозная проверка access policy
Planner SHALL определить access contract, профильные агенты SHALL реализовать его без незафиксированных отклонений, а Quality Gate SHALL отдельно проверить anonymous и authenticated поведение, права на чужие ресурсы и исключения.

#### Scenario: Quality Gate проверяет API diff
- **WHEN** совокупный diff содержит endpoint-изменения
- **THEN** report сопоставляет реализацию и тесты с access matrix и блокирует approval при необъяснённом отклонении

### Requirement: Неизменность runtime API в процессной миграции
Change `integrate-openspec-workflow` MUST NOT изменять runtime endpoint, auth behavior, БД или сервисный код; его access matrix SHALL быть отмечена неприменимой с сохранением policy для будущих changes.

#### Scenario: Проверка diff задачи 023
- **WHEN** Quality Gate анализирует миграцию OpenSpec workflow
- **THEN** он подтверждает отсутствие изменений в `services/backend`, `services/frontend` и `services/site-ad` и отсутствие runtime access behavior diff

### Requirement: Tenant selector не является аутентификацией
Governance SHALL описывать `X-Equestrian-Service-Key` как публичный несекретный tenant selector соответствующих Public Read GET; его наличие MUST NOT считаться user или peer-service authentication.

#### Scenario: Public Read требует tenant selector
- **WHEN** anonymous caller вызывает tenant-aware Public Read GET без selector или с неизвестным selector
- **THEN** endpoint возвращает `401`; с валидным selector он читает только выбранный tenant без user cookie
