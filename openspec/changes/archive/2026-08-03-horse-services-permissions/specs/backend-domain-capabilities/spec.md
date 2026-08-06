## MODIFIED Requirements

### Requirement: Permission checks для horse services
Backend SHALL реализовать permission checks для horse services endpoints аналогично паттерну `PriceGroupService`. Метод `_check_admin_permission` SHALL проверять наличие scope `SUPERUSER` или `DEVELOPER` у пользователя. Пользователи с scope `ADMIN` (без `DEVELOPER`/`SUPERUSER`) SHALL получать отказ при попытке создания, обновления или удаления услуг.

#### Scenario: Проверка прав при создании услуги
- **WHEN** авторизованный пользователь отправляет `POST /horses/services`
- **THEN** backend вызывает `_check_admin_permission` и проверяет наличие `SUPERUSER` или `DEVELOPER` scope

#### Scenario: Проверка прав при обновлении услуги
- **WHEN** авторизованный пользователь отправляет `PATCH /horses/services/{slug_or_id}`
- **THEN** backend вызывает `_check_admin_permission` и проверяет наличие `SUPERUSER` или `DEVELOPER` scope

#### Scenario: Проверка прав при удалении услуги
- **WHEN** авторизованный пользователь отправляет `DELETE /horses/services/{slug_or_id}`
- **THEN** backend вызывает `_check_admin_permission` и проверяет наличие `SUPERUSER` или `DEVELOPER` scope

#### Scenario: Отсутствие проверки прав при чтении услуг
- **WHEN** авторизованный или анонимный пользователь отправляет `GET /horses/services` или `GET /horses/services/{slug_or_id}`
- **THEN** backend НЕ вызывает `_check_admin_permission` и возвращает данные без проверки scope

### Requirement: Фильтрация лошадей по наименованиям услуг для site consumer
Backend SHALL предоставлять query parameter `service_names` (list[str]) на эндпоинте `GET /horses` для фильтрации лошадей по наименованиям услуг. Фильтрация SHALL выполняться по наименованиям услуг (не UUID) для публичного API site consumer.

#### Scenario: Фильтрация по наименованиям услуг
- **WHEN** consumer отправляет `GET /horses?service_names=Разведение&service_names=Тренировка`
- **THEN** backend возвращает лошадей, у которых есть хотя бы одна из указанных услуг

#### Scenario: Пустой список наименований
- **WHEN** consumer отправляет `GET /horses?service_names=`
- **THEN** backend возвращает все лошади без фильтрации по услугам

## MODIFIED Requirements

### Requirement: Безопасный HTML page data
Backend SHALL поддерживать `page_data` для breeds, coat colors, horse services и prices, SHALL возвращать поле в detail GET только при `page_data=true` и MUST отклонять HTML с `script`, event-handler или `javascript:` содержимым с `400`. Требование трассируется к задаче `006`.

Backend SHALL автоматически генерировать slug из name при создании или обновлении horse service, если slug не передан или передана пустая строка. Backend SHALL принимать пустое описание услуги (`description=null` или `description=""`) без возврата ошибки валидации.

Backend SHALL реализовать permission checks для horse services: только пользователи с `SUPERUSER` или `DEVELOPER` scope могут создавать и удалять услуги. Пользователи с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) могут обновлять услуги (кроме наименования) и читать их.

#### Scenario: Публичное чтение page data
- **WHEN** consumer с tenant service key вызывает detail GET одной из четырёх сущностей с `page_data=true` без CMS cookie
- **THEN** backend возвращает `200` и включает сохранённый безопасный HTML

#### Scenario: Запрещённый JavaScript
- **WHEN** авторизованный пользователь передаёт JavaScript-содержащий `page_data` в PATCH одной из четырёх сущностей
- **THEN** backend отклоняет изменение с `400` и не сохраняет опасное содержимое

#### Scenario: Автогенерация slug при создании услуги
- **WHEN** авторизованный пользователь с `DEVELOPER` или `SUPERUSER` scope отправляет `POST /api/horses/services` с `name="Разведение"` и `slug=null` или `slug=""`
- **THEN** backend генерирует slug из name, возвращает `200` с заполненным slug

#### Scenario: Автогенерация slug при обновлении услуги
- **WHEN** авторизованный пользователь с `DEVELOPER` или `SUPERUSER` scope отправляет `PATCH /api/horses/services/{slug_or_id}` с `slug=""`
- **THEN** backend генерирует slug из name, возвращает `200` с заполненным slug

#### Scenario: Необязательное описание услуги при создании
- **WHEN** авторизованный пользователь с `DEVELOPER` или `SUPERUSER` scope отправляет `POST /api/horses/services` с `description=null` или `description=""`
- **THEN** backend создаёт услугу, возвращает `200` с `description=null`

#### Scenario: Необязательное описание услуги при обновлении
- **WHEN** авторизованный пользователь с `DEVELOPER` или `SUPERUSER` scope отправляет `PATCH /api/horses/services/{slug_or_id}` с `description=""`
- **THEN** backend обновляет услугу, возвращает `200` с `description=null`

#### Scenario: Отказ в создании услуги для ADMIN без DEVELOPER scope
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `POST /api/horses/services`
- **THEN** backend возвращает `403` с сообщением «Недостаточно прав для выполнения операции»

#### Scenario: Разрешение на обновление услуги для ADMIN (кроме наименования)
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `PATCH /api/horses/services/{slug_or_id}` с обновлением описания, URL или цены
- **THEN** backend обновляет услугу и возвращает `200` с `HorseServiceOutDto`

#### Scenario: Отказ в изменении наименования услуги для ADMIN
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `PATCH /api/horses/services/{slug_or_id}` с изменением наименования
- **THEN** backend возвращает `403` с сообщением «Недостаточно прав для изменения наименования»

#### Scenario: Отказ в удалении услуги для ADMIN без DEVELOPER scope
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `DELETE /api/horses/services/{slug_or_id}`
- **THEN** backend возвращает `403` с сообщением «Недостаточно прав для выполнения операции»

#### Scenario: Чтение услуг для ADMIN без DEVELOPER scope
- **WHEN** авторизованный пользователь с `ADMIN` scope (без `DEVELOPER`/`SUPERUSER`) отправляет `GET /horses/services` или `GET /horses/services/{slug_or_id}`
- **THEN** backend возвращает `200` с данными услуг

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
