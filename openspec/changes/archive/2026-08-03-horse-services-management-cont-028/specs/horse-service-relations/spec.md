## MODIFIED Requirements

### Requirement: Получение списка связей лошади
Backend SHALL предоставлять эндпоинт `GET /api/horses/{horse_id}/services` для получения списка связанных услуг лошади с учётом override. Эндпоинт SHALL быть Public Read с tenant context. Каждая связь SHALL иметь `created_at`; список SHALL по умолчанию сортироваться по `created_at DESC, id DESC`.

#### Scenario: Получение списка связей с авторизацией
- **WHEN** авторизованный пользователь отправляет `GET /api/horses/{horse_id}/services`
- **THEN** backend возвращает `200` с `PaginatedEntities[HorseServiceRelationOutDto]` в порядке newest-first

#### Scenario: Получение списка связей без авторизации
- **WHEN** анонимный consumer с tenant service key отправляет `GET /api/horses/{horse_id}/services`
- **THEN** backend возвращает `200` с tenant-scoped списком в порядке newest-first

#### Scenario: Стабильный порядок одинаковых timestamps
- **WHEN** две связи имеют одинаковый `created_at`
- **THEN** backend применяет `id DESC` и возвращает стабильный порядок между повторными чтениями

## ADDED Requirements

### Requirement: Безопасная миграция времени создания связи
Backend SHALL добавить `created_at` в `horse_service_relations`, MUST сохранить все существующие строки, заполнить отсутствующие значения на PostgreSQL и обеспечить непустое server-generated значение новым строкам.

#### Scenario: Upgrade заполненной базы
- **WHEN** migration применяется к таблице с существующими связями
- **THEN** число строк не меняется и каждая строка получает непустой `created_at`

#### Scenario: Новая связь после migration
- **WHEN** backend создаёт новую связь без явного `created_at`
- **THEN** PostgreSQL сохраняет непустое время создания и связь становится первой с учётом stable order

#### Scenario: Downgrade
- **WHEN** migration откатывается
- **THEN** удаляется только `created_at`, а строки связей и override-поля сохраняются
