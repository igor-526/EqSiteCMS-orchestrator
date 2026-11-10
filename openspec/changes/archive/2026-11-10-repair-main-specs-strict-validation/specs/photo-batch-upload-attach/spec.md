## MODIFIED Requirements

### Requirement: Access control матрица

Все batch upload endpoints ДОЛЖНЫ (SHALL) проверять права доступа по роли admin и принадлежности сущности tenant согласно матрице в сценарии «Матрица доступа для всех batch upload endpoints».

#### Scenario: Anonymous request к batch upload endpoint

- **WHEN** неавторизованный пользователь отправляет запрос к любому batch upload endpoint
- **THEN** система возвращает `401 Unauthorized`
- **AND** header `WWW-Authenticate` присутствует

#### Scenario: Authenticated non-admin request

- **WHEN** авторизованный пользователь без роли admin отправляет запрос
- **THEN** система возвращает `403 Forbidden`
- **AND** файлы НЕ загружаются

#### Scenario: Authenticated admin request к entity другого tenant

- **WHEN** admin tenant A отправляет запрос к entity tenant B
- **THEN** система возвращает `403 Forbidden`
- **AND** файлы НЕ загружаются

#### Scenario: Матрица доступа для всех batch upload endpoints

- **WHEN** поступает запрос к любому из перечисленных batch upload endpoints
- **THEN** применяется соответствующая строка матрицы доступа без изменения ролей и статусов

| Method | Path | Access Class | Roles | Expected без auth | Expected с auth (owner) | Expected с auth (не owner) |
|--------|------|--------------|-------|-------------------|------------------------|---------------------------|
| POST | `/prices/{id}/photos/upload` | Protected Write | admin | 401 Unauthorized | 200 OK | 403 Forbidden |
| POST | `/horses/{id}/photos/upload` | Protected Write | admin | 401 Unauthorized | 200 OK | 403 Forbidden |
| POST | `/news/{id}/photos/upload` | Protected Write | admin | 401 Unauthorized | 200 OK | 403 Forbidden |
