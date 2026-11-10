## MODIFIED Requirements

### Requirement: Access matrix для связей лошадь-услуга
Backend SHALL соблюдать следующую access matrix для endpoints связей лошадь-услуга. POST, PATCH и DELETE SHALL требовать авторизации (Protected Write). GET списка связей SHALL быть доступен без авторизации с tenant service key (Public Read). GET доступных услуг SHALL требовать авторизации (Protected Read). Исключений из дефолтной access policy нет.

#### Scenario: Anonymous POST отклонён
- **WHEN** анонимный пользователь отправляет `POST /api/horses/{horse_id}/services`
- **THEN** backend возвращает `401` и не создаёт связь

#### Scenario: Authenticated POST без scope
- **WHEN** авторизованный пользователь без horse write scope отправляет `POST /api/horses/{horse_id}/services`
- **THEN** backend возвращает `403` и не создаёт связь

#### Scenario: Authenticated POST принят
- **WHEN** авторизованный пользователь с horse write scope отправляет `POST /api/horses/{horse_id}/services` с валидными данными
- **THEN** backend возвращает `201` с созданной связью

#### Scenario: Anonymous GET принят
- **WHEN** анонимный consumer с tenant service key отправляет `GET /api/horses/{horse_id}/services`
- **THEN** backend возвращает `200` со списком связей

#### Scenario: Anonymous GET без tenant key
- **WHEN** анонимный consumer без tenant service key отправляет `GET /api/horses/{horse_id}/services`
- **THEN** backend возвращает `400` (отсутствует tenant context)

#### Scenario: Anonymous GET доступных услуг отклонён
- **WHEN** анонимный пользователь отправляет `GET /api/horses/{horse_id}/available-services`
- **THEN** backend возвращает `401`

#### Scenario: Изоляция tenant
- **WHEN** авторизованный пользователь пытается создать связь для лошади чужого tenant
- **THEN** backend возвращает `404` и не создаёт связь

#### Scenario: Неизменная access matrix и основания её применения
- **WHEN** проверяется доступ по строкам следующей матрицы
- **THEN** действует следующий исходный контракт без изменения условий и outcomes:

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|--------|------|-------------|-------|----------------------|-------------------|-----------------|
| `POST` | `/api/horses/{horse_id}/services` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `201`; без scope `403`; дубликат `409`; несуществующий horse/service `404` | HSR-01..HSR-05 |
| `PATCH` | `/api/horses/{horse_id}/services/{relation_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `200`; несуществующая связь `404`; без scope `403` | HSR-06..HSR-08 |
| `DELETE` | `/api/horses/{horse_id}/services/{relation_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | `204`; несуществующая связь `404`; без scope `403` | HSR-09..HSR-11 |
| `GET` | `/api/horses/{horse_id}/services` | Public Read | anonymous с tenant key; CMS user | `200` с tenant key; `400` без key | `200` | HSR-12..HSR-13 |
| `GET` | `/api/horses/{horse_id}/available-services?search=` | Protected Read | authenticated CMS user | `401` | `200` с отфильтрованным списком; без scope `403` | HSR-14..HSR-16 |
