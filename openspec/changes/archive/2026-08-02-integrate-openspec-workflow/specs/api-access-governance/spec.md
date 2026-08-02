## ADDED Requirements

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
Proposal/specs для изменения endpoint SHALL содержать матрицу `method | path | access class | roles | expected without auth | expected with auth` и SHALL связывать каждый endpoint с тестовыми сценариями.

#### Scenario: Planner описывает API change
- **WHEN** change добавляет или изменяет endpoint
- **THEN** его OpenSpec-артефакты явно фиксируют access class, роли, anonymous/authenticated статусы и необходимые тесты

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
