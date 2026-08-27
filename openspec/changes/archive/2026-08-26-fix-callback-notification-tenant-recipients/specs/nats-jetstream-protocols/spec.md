## ADDED Requirements

### Requirement: Callback event MUST carry tenant identity
Backend Core producer и Notification Service consumer MUST использовать согласованный payload `events.site.callback.requested` с обязательным `equestrian_id` формата UUID. Значение MUST происходить из уже проверенного `EquestrianContext.id` создания заявки и MUST оставаться неизменным на пути до recipient selection.

#### Scenario: Producer publishes tenant UUID
- **WHEN** callback-заявка создана для валидного tenant context
- **THEN** опубликованный payload содержит `equestrian_id`, равный tenant UUID сохранённой заявки

#### Scenario: Producer and consumer contracts match
- **WHEN** Quality Gate сравнивает Backend Core и Notification Service AsyncAPI/DTO
- **THEN** обязательные поля, UUID format и `additionalProperties: false` для callback payload совпадают

#### Scenario: Old payload is rejected safely
- **WHEN** consumer получает ранее допустимый payload без `equestrian_id`
- **THEN** payload не приводит к глобальному recipient lookup или публикации email command и обрабатывается по действующей retry/DLQ политике

