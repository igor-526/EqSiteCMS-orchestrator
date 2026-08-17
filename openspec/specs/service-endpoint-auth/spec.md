# Service Endpoint Authentication

## Purpose

Спецификация авторизации сервисных эндпоинтов backend через заголовок `X-Service-Key`. Описывает изоляцию сервисных endpoint'ов от пользовательских (cookie/equestrian key).

## Requirements

### Requirement: Авторизация сервисных эндпоинтов через X-Service-Key
Backend SHALL принимать заголовок `X-Service-Key` для авторизации запросов к сервисным эндпоинтам (`/api/service/*`). Значение ключа MUST совпадать с ENV `SERVICE_KEY`. Сервисные эндпоинты MUST быть недоступны по cookie (`access_token`, `refresh_token`) и по `X-Equestrian-Service-Key`.

#### Scenario: Валидный сервисный ключ
- **WHEN** запрос к `/api/service/*` содержит заголовок `X-Service-Key` с правильным значением
- **THEN** backend авторизует запрос и обрабатывает его

#### Scenario: Отсутствующий сервисный ключ
- **WHEN** запрос к `/api/service/*` не содержит заголовок `X-Service-Key`
- **THEN** backend возвращает `401 Unauthorized`

#### Scenario: Невалидный сервисный ключ
- **WHEN** запрос к `/api/service/*` содержит заголовок `X-Service-Key` с неправильным значением
- **THEN** backend возвращает `401 Unauthorized`

#### Scenario: Cookie-авторизация на сервисных эндпоинтах
- **WHEN** запрос к `/api/service/*` содержит валидный `access_token` cookie, но не содержит `X-Service-Key`
- **THEN** backend возвращает `401 Unauthorized`, не раскрывая данные

#### Scenario: Equestrian key на сервисных эндпоинтах
- **WHEN** запрос к `/api/service/*` содержит валидный `X-Equestrian-Service-Key`, но не содержит `X-Service-Key`
- **THEN** backend возвращает `401 Unauthorized`

### Requirement: Изоляция сервисных эндпоинтов от обычных
Сервисный ключ `X-Service-Key` MUST работать ТОЛЬКО на эндпоинтах `/api/service/*`. Запросы к обычным эндпоинтам (`/api/horses`, `/api/auth`, и т.д.) MUST игнорировать `X-Service-Key` и обрабатываться по стандартной cookie/equestrian key авторизации.

#### Scenario: X-Service-Key на обычном эндпоинте
- **WHEN** запрос к `/api/horses` содержит заголовок `X-Service-Key` с правильным значением
- **THEN** backend игнорирует заголовок и обрабатывает запрос по стандартной авторизации (cookie/equestrian key)

### Requirement: Префикс сервисных эндпоинтов
Все сервисные эндпоинты MUST быть зарегистрированы под префиксом `/api/service/`. Новые сервисные эндпоинты MUST добавляться как подроутеры к сервисному роутеру.

#### Scenario: Роутер сервисных эндпоинтов
- **WHEN** backend запускается
- **THEN** все эндпоинты `/api/service/*` доступны через единый APIRouter с префиксом `/api/service`

### Requirement: Access Matrix сервисных эндпоинтов
Backend MUST обеспечивать изолированный доступ к сервисным эндпоинтам только для микросервисов с валидным `X-Service-Key`. Сервисные эндпоинты MUST образовывать отдельный класс Service Read/Write, не зависящий от cookie или equestrian key авторизации.

| Метод | Путь | Access class | Роли | Без авторизации | С авторизацией |
|-------|------|-------------|------|-----------------|----------------|
| `GET` | `/api/service/users` | Service Read | Микросервисы с валидным `X-Service-Key` | `401` | `200` с пагинированным списком пользователей |

#### Scenario: Проверка access matrix
- **WHEN** Quality Gate выполняет ревью сервисных эндпоинтов
- **THEN** каждая строка matrix подтверждена кодом и тестами

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
