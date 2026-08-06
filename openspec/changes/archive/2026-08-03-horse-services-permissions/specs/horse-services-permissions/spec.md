# horse-services-permissions Specification

## Purpose
Зафиксировать требования к разграничению прав доступа для horse services: пользователи с группой dev/su получают полный CRUD доступ, пользователи с группой admin — только чтение (GET). Включить backend permission checks и frontend scope restrictions.

## MODIFIED Requirements

### Requirement: Разграничение прав доступа для horse services
Backend SHALL разграничивать права доступа для horse services endpoints: пользователи с группой `SUPERUSER` или `DEVELOPER` получают полный CRUD доступ, пользователи с группой `ADMIN` — могут обновлять услуги (кроме наименования) и читать их, но не могут создавать или удалять.

#### Scenario: Создание услуги пользователем с DEVELOPER scope
- **WHEN** авторизованный пользователь с `DEVELOPER` scope отправляет `POST /horses/services` с валидными данными
- **THEN** backend создаёт услугу и возвращает `200` с `HorseServiceOutDto`

#### Scenario: Создание услуги пользователем с SUPERUSER scope
- **WHEN** авторизованный пользователь с `SUPERUSER` scope отправляет `POST /horses/services` с валидными данными
- **THEN** backend создаёт услугу и возвращает `200` с `HorseServiceOutDto`

#### Scenario: Отказ в создании услуги пользователю с ADMIN scope
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `POST /horses/services`
- **THEN** backend возвращает `403` с сообщением «Недостаточно прав для выполнения операции»

#### Scenario: Обновление услуги пользователем с DEVELOPER scope
- **WHEN** авторизованный пользователь с `DEVELOPER` scope отправляет `PATCH /horses/services/{slug_or_id}` с валидными данными
- **THEN** backend обновляет услугу и возвращает `200` с `HorseServiceOutDto`

#### Scenario: Разрешение на обновление услуги для ADMIN (кроме наименования)
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `PATCH /horses/services/{slug_or_id}` с обновлением описания, URL или цены
- **THEN** backend обновляет услугу и возвращает `200` с `HorseServiceOutDto`

#### Scenario: Отказ в изменении наименования услуги для ADMIN
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `PATCH /horses/services/{slug_or_id}` с изменением наименования
- **THEN** backend возвращает `403` с сообщением «Недостаточно прав для изменения наименования»

#### Scenario: Удаление услуги пользователем с DEVELOPER scope
- **WHEN** авторизованный пользователь с `DEVELOPER` scope отправляет `DELETE /horses/services/{slug_or_id}`
- **THEN** backend удаляет услугу и возвращает `204`

#### Scenario: Отказ в удалении услуги пользователю с ADMIN scope
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `DELETE /horses/services/{slug_or_id}`
- **THEN** backend возвращает `403` с сообщением «Недостаточно прав для выполнения операции»

#### Scenario: Чтение списка услуг пользователем с ADMIN scope
- **WHEN** авторизованный пользователь с `ADMIN` scope отправляет `GET /horses/services`
- **THEN** backend возвращает `200` с `PaginatedEntities[HorseServiceOutDto]`

#### Scenario: Чтение услуги по slug/id пользователем с ADMIN scope
- **WHEN** авторизованный пользователь с `ADMIN` scope отправляет `GET /horses/services/{slug_or_id}`
- **THEN** backend возвращает `200` с `HorseServiceOutDto`

#### Scenario: Анонимный запрос на создание услуги
- **WHEN** анонимный пользователь отправляет `POST /horses/services`
- **THEN** backend возвращает `401` или `403` без создания записи

### Requirement: Фильтрация лошадей по наименованиям услуг
Backend SHALL предоставлять дополнительный query parameter `service_names` (list[str]) на эндпоинте `GET /horses` для фильтрации лошадей по наименованиям услуг. Фильтрация SHALL выполняться по наименованиям услуг (не UUID) для публичного API site consumer.

#### Scenario: Фильтрация лошадей по одному наименованию услуги (регистронезависимое полное совпадение)
- **WHEN** consumer отправляет `GET /horses?service_names=Разведение`
- **THEN** backend возвращает только лошадей, у которых есть услуга с наименованием «Разведение»

#### Scenario: Фильтрация лошадей по нескольким наименованиям услуг (регистронезависимое полное совпадение)
- **WHEN** consumer отправляет `GET /horses?service_names=Разведение&service_names=Тренировка`
- **THEN** backend возвращает лошадей, у которых есть хотя бы одна из указанных услуг

#### Scenario: Фильтрация с несуществующим наименованием услуги
- **WHEN** consumer отправляет `GET /horses?service_names=НесуществующаяУслуга`
- **THEN** backend возвращает пустой список лошадей

#### Scenario: Фильтрация с пустым списком наименований
- **WHEN** consumer отправляет `GET /horses?service_names=`
- **THEN** backend возвращает все лошади без фильтрации по услугам

#### Scenario: Комбинирование фильтра по услугам с другими фильтрами
- **WHEN** consumer отправляет `GET /horses?service_names=Разведение&breed=Орловский_рысак`
- **THEN** backend возвращает лошадей, соответствующих обоим условиям

#### Scenario: Фильтрация по полному наименованию (не подстрока)
- **WHEN** consumer отправляет `GET /horses?service_names=продажа`
- **THEN** backend возвращает только лошадей с услугой «продажа», но НЕ лошадей с услугой «продажа и аренда»

#### Scenario: Регистронезависимая фильтрация
- **WHEN** consumer отправляет `GET /horses?service_names=РАЗВЕДЕНИЕ`
- **THEN** backend возвращает лошадей с услугой «разведение» (регистр не важен)

#### Scenario: Отказ в изменении наименования услуги для ADMIN (при фактическом изменении)
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `PATCH /horses/services/{slug_or_id}` с новым наименованием, отличным от текущего
- **THEN** backend возвращает `403` с сообщением «Недостаточно прав для изменения наименования»

#### Scenario: Разрешение на обновление услуги для ADMIN с тем же наименованием
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `PATCH /horses/services/{slug_or_id}` с тем же наименованием и другими полями
- **THEN** backend обновляет услугу и возвращает `200` с `HorseServiceOutDto`
