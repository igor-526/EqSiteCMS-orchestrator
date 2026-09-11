## ADDED Requirements

### Requirement: Zod повторяет CallbackRequestCreateDto
Callback form SHALL применять единую Zod-схему до network call: `phone` после trim обязателен и имеет длину 1–63, `name` после trim является optional/nullable-equivalent и имеет длину не более 127, `comment` после trim является optional/nullable-equivalent и имеет длину не более 2000. Пустые optional strings MUST нормализоваться в отсутствие поля либо значение, принимаемое backend как `None`, а schema MUST учитывать итоговый comment после добавления service/tariff/horse context.

#### Scenario: Backend boundaries принимаются
- **WHEN** значения находятся ровно на границах 63/127/2000 после нормализации
- **THEN** Zod принимает форму, payload содержит только `name?`, `phone`, `comment?` и backend не отклоняет его по длине

#### Scenario: Значения за границей блокируются
- **WHEN** phone пуст/длиннее 63, name длиннее 127 или итоговый comment длиннее 2000
- **THEN** network call не выполняется, inline error связан с первым invalid control

#### Scenario: Пустые optional поля совместимы
- **WHEN** name и comment состоят только из whitespace, phone валиден и consent дан
- **THEN** optional значения не создают несогласованный payload, а запрос остаётся совместимым с backend DTO

### Requirement: Callback остаётся публичным credentialless исключением
Zod-валидация SHALL предшествовать единственному anonymous `POST /api/callback_requests`; consent остаётся обязательным локальным состоянием и MUST NOT входить в payload. Selector header обязателен, Cookie/Authorization отсутствуют, pending guard предотвращает повторный POST.

#### Scenario: Валидная отправка
- **WHEN** форма валидна, consent дан и selector корректен
- **THEN** выполняется ровно один POST, backend отвечает `201`, а UI показывает success state

#### Scenario: Невалидная отправка
- **WHEN** Zod или consent validation не проходит
- **THEN** POST не выполняется и пользователь получает field-level feedback с сохранёнными значениями

