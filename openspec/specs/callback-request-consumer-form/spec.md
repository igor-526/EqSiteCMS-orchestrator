# callback-request-consumer-form Specification

## Purpose
TBD - synchronized from change callback-requests-management-055.

## Requirements
### Requirement: Публичная форма отправляет совместимый request
`site-ad` callback form SHALL отправлять anonymous `POST /callback_requests` с selector-механизмом API client и полями `name`, `phone`, `comment`; она MUST NOT использовать CMS credentials или CMS-only endpoint.

#### Scenario: Успешная отправка
- **WHEN** посетитель вводит валидные данные, принимает policy и отправляет форму
- **THEN** выполняется один совместимый POST, форма закрывается, очищается и показывается success modal

#### Scenario: Ошибка отправки
- **WHEN** backend возвращает validation, `401` selector error либо generic error
- **THEN** форма остаётся открытой с сохранёнными данными и понятной ошибкой

### Requirement: Валидация и защита от повторной отправки
Форма MUST валидировать обязательные phone/name/policy согласно backend limits, вызывать submit через form semantics и блокировать повторную отправку до завершения request.

#### Scenario: Невалидная форма
- **WHEN** обязательные поля пусты или policy не принята
- **THEN** request не отправляется и field errors показаны

#### Scenario: Double submit
- **WHEN** пользователь повторно нажимает submit во время pending request
- **THEN** создаётся не более одного POST

### Requirement: Проверки consumer integration
Реализация SHALL иметь API-boundary/component tests и проверки lint/typecheck/build применимыми командами `site-ad`.

#### Scenario: Contract regression test
- **WHEN** test перехватывает request
- **THEN** path равен `/callback_requests`, body содержит `comment` вместо `notes`, и CMS auth отсутствует


