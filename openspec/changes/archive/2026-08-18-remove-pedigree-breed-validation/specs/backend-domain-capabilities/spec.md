## MODIFIED Requirements

### Requirement: Управление родословной
Backend SHALL позволять читать кандидатов sire/dam/children публично в tenant context и SHALL позволять устанавливать, заменять и очищать pedigree relations только через Protected Write. Ни поиск кандидатов, ни установка связей MUST NOT фильтровать, загружать для проверки или отклонять участников по `breed_id`, наличию/отсутствию породы, конкретной породе либо `breed.kind`. Backend SHALL сохранять tenant isolation, запрет self-link и конфликтующих immediate relations, требования к полу родителей, правила дат рождения/смерти, занятость соответствующего родительского слота ребёнка, partial-update semantics, поиск, сортировку и пагинацию. Требование трассируется к задачам `011`, `014` и change `remove-pedigree-breed-validation`.

#### Scenario: Чтение кандидатов родословной независимо от породы
- **WHEN** consumer с валидным tenant selector вызывает `GET /api/horses/{id}/pedigree/{mode}` для `sire`, `dam` или `children`, а подходящие по не-breed правилам кандидаты имеют другую породу, другой `breed.kind` либо не имеют породы
- **THEN** backend возвращает `200` и включает этих кандидатов без breed-based фильтрации

#### Scenario: Не-breed фильтры кандидатов сохраняются
- **WHEN** consumer запрашивает кандидатов, среди которых есть target, текущие immediate relations, parent неверного пола либо участник с недопустимой датой
- **THEN** backend исключает недопустимые записи по прежним pedigree-правилам, независимо от их породы

#### Scenario: Изменение родословной независимо от породы
- **WHEN** пользователь с одним из scopes `SUPERUSER`, `ADMIN`, `DEVELOPER` вызывает `POST /api/horses/{id}/pedigree` с parent/child другой породы, другого `breed.kind` либо без породы и все остальные pedigree-инварианты выполнены
- **THEN** backend устанавливает соответствующие связи и возвращает `204` без breed lookup/validation

#### Scenario: Остальные инварианты POST сохраняются
- **WHEN** разрешённый пользователь пытается установить self-link, конфликтующую immediate relation, parent неверного пола или участника с недопустимой датой рождения/смерти
- **THEN** backend отклоняет запрос по соответствующему не-breed правилу и не считает породу основанием результата

#### Scenario: Очистка и частичное изменение родословной
- **WHEN** разрешённый пользователь явно передаёт `null` для parent, пустой список foals либо omits другие pedigree-поля
- **THEN** backend очищает только явно заданные связи и сохраняет отсутствующие поля по действующему partial-update contract

#### Scenario: Пользователь без pedigree scope
- **WHEN** authenticated пользователь без scopes `SUPERUSER`, `ADMIN`, `DEVELOPER` вызывает `POST /api/horses/{id}/pedigree`
- **THEN** backend возвращает `403` и не изменяет связи

#### Scenario: Access matrix управления родословной
- **WHEN** клиент обращается к pedigree endpoints
- **THEN** backend соблюдает следующую матрицу без исключений из default Public Read / Protected Write policy

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses/{horse_id}/pedigree/{mode}` | Public Read | anonymous с валидным tenant selector; CMS user | `200` с валидным selector; `401` missing/invalid selector | `200`; candidates не зависят от breed | U-01..U-15, SM-01..SM-18 |
| `POST` | `/api/horses/{horse_id}/pedigree` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`, без mutation | `204` с scope; `403` без scope | U-16..U-30, SM-19..SM-30 |

#### Scenario: Anonymous GET с tenant selector разрешён
- **WHEN** anonymous consumer вызывает GET candidates с валидным tenant selector
- **THEN** backend возвращает `200` с tenant-scoped результатом

#### Scenario: GET без валидного tenant selector отклонён
- **WHEN** anonymous consumer вызывает GET candidates без selector либо с invalid selector
- **THEN** backend возвращает `401`

#### Scenario: Anonymous POST отклонён
- **WHEN** anonymous client вызывает POST pedigree
- **THEN** backend возвращает `401` и не изменяет связи
