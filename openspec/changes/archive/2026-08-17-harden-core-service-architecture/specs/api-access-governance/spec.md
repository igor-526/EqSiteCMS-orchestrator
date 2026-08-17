## MODIFIED Requirements

### Requirement: Access matrix в планировании
Proposal/specs для изменения endpoint SHALL содержать матрицу `method | path | access class | roles | tenant selector | owner rule | expected without auth | expected with auth | foreign resource | validation status | tests` и SHALL отличать user authentication от несекретного tenant selector. Endpoint-specific validation status MUST иметь приоритет над общим framework default только там, где это явно зафиксировано.

#### Scenario: Planner описывает API change
- **WHEN** change добавляет или изменяет endpoint
- **THEN** его OpenSpec-артефакты явно фиксируют access class, роли, selector, ownership, anonymous/authenticated/foreign outcomes, validation status и связанные тесты

#### Scenario: Planner описывает email proxy
- **WHEN** change затрагивает backend email proxy
- **THEN** matrix фиксирует owner-only без privileged override, `401`, foreign `403` до lookup, owner `404`, invalid `400`, same-email `201`, different-email `409` и публичные confirmation exceptions

## ADDED Requirements

### Requirement: Tenant selector не является аутентификацией
Governance SHALL описывать `X-Equestrian-Service-Key` как публичный несекретный tenant selector соответствующих Public Read GET; его наличие MUST NOT считаться user или peer-service authentication.

#### Scenario: Public Read требует tenant selector
- **WHEN** anonymous caller вызывает tenant-aware Public Read GET без selector или с неизвестным selector
- **THEN** endpoint возвращает `401`; с валидным selector он читает только выбранный tenant без user cookie
