## ADDED Requirements

### Requirement: Private peer HTTP boundary
Email-service и notification-service SHALL быть доступны другим core-сервисам только внутри private compose network; production/default exposure MUST NOT публиковать их HTTP API на внешнем host interface. Loopback exposure допускается только явным dev profile.

#### Scenario: Внешний caller обращается к peer API
- **WHEN** Quality Gate проверяет host network вне dev profile
- **THEN** email/notification HTTP ports недоступны извне, но доступны backend внутри compose network

#### Scenario: Dev exposure включён явно
- **WHEN** разработчик включает документированный debug profile
- **THEN** peer port привязан только к loopback и не меняет production/default boundary

### Requirement: Направленная service authentication
Peer calls между private core microservices SHALL выполняться без peer credential. Только направление microservice → main backend `/api/service/*` MUST использовать `X-Service-Key`; cookie и `X-Equestrian-Service-Key` там MUST оставаться недопустимыми.

#### Scenario: Backend вызывает private email-service
- **WHEN** backend после user authorization вызывает email-service внутри private network
- **THEN** запрос не содержит peer bearer/service credential

#### Scenario: Microservice вызывает main backend
- **WHEN** notification/email вызывает `/api/service/*`
- **THEN** запрос содержит валидный `X-Service-Key`, а отсутствие/invalid key возвращает `401`
