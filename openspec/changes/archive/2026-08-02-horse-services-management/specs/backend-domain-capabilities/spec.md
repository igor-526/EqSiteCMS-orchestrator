# backend-domain-capabilities — Delta Spec

## MODIFIED Requirements

### Requirement: Безопасный HTML page data
Backend SHALL поддерживать `page_data` для breeds, coat colors, horse services и prices, SHALL возвращать поле в detail GET только при `page_data=true` и MUST отклонять HTML с `script`, event-handler или `javascript:` содержимым с `400`. Требование трассируется к задаче `006`.

Backend SHALL автоматически генерировать slug из name при создании или обновлении horse service, если slug не передан или передана пустая строка. Backend SHALL принимать пустое описание услуги (`description=null` или `description=""`) без возврата ошибки валидации.

#### Scenario: Публичное чтение page data
- **WHEN** consumer с tenant service key вызывает detail GET одной из четырёх сущностей с `page_data=true` без CMS cookie
- **THEN** backend возвращает `200` и включает сохранённый безопасный HTML

#### Scenario: Запрещённый JavaScript
- **WHEN** авторизованный пользователь передаёт JavaScript-содержащий `page_data` в PATCH одной из четырёх сущностей
- **THEN** backend отклоняет изменение с `400` и не сохраняет опасное содержимое

#### Scenario: Автогенерация slug при создании услуги
- **WHEN** авторизованный пользователь отправляет `POST /api/horses/services` с `name="Разведение"` и `slug=null` или `slug=""`
- **THEN** backend генерирует slug из name, возвращает `200` с заполненным slug

#### Scenario: Автогенерация slug при обновлении услуги
- **WHEN** авторизованный пользователь отправляет `PATCH /api/horses/services/{slug_or_id}` с `slug=""`
- **THEN** backend генерирует slug из name, возвращает `200` с заполненным slug

#### Scenario: Необязательное описание услуги при создании
- **WHEN** авторизованный пользователь отправляет `POST /api/horses/services` с `description=null` или `description=""`
- **THEN** backend создаёт услугу, возвращает `200` с `description=null`

#### Scenario: Необязательное описание услуги при обновлении
- **WHEN** авторизованный пользователь отправляет `PATCH /api/horses/services/{slug_or_id}` с `description=""`
- **THEN** backend обновляет услугу, возвращает `200` с `description=null`

### Requirement: Override-подстановка услуг в HorseOutDto
Backend SHALL подставлять override-значения из `horse_service_relations` при формировании `HorseOutDto.services`. Если `description_override` не null, использовать его вместо `description` услуги. Аналогично для `price_override` и `price_formatter_override`. Требование трассируется к задаче `027`.

#### Scenario: Лошадь с переопределёнными услугами
- **WHEN** consumer читает `GET /api/horses/{slug_or_id}` и у лошади есть связь с `price_override=600000`
- **THEN** `HorseOutDto.services[].price` возвращает `600000` (override), а не дефолтную цену услуги

#### Scenario: Лошадь без переопределений
- **WHEN** consumer читает `GET /api/horses/{slug_or_id}` и связи не имеют override
- **THEN** `HorseOutDto.services` возвращает дефолтные значения услуг

#### Scenario: Публичное чтение услуг с override
- **WHEN** anonymous consumer с tenant key читает `GET /api/horses` или `GET /api/horses/{slug_or_id}`
- **THEN** backend возвращает `200` с services, содержащими override-значения
