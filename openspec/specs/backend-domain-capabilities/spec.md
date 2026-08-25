## Purpose
Зафиксировать подтверждённые доменные возможности backend для цен, HTML-данных страниц, новостей, медиахранилища, профиля пользователя и связанных конных сущностей. Спецификация описывает наблюдаемое API-поведение, права доступа и границы имеющегося evidence, сохраняя открытые пробелы для отдельных последующих changes.
## Requirements
### Requirement: Упорядочивание цен внутри групп
Backend SHALL хранить nullable `display_order` связи цены с группой, возвращать стабильный порядок и выполнять переупорядочивание группы двухфазным обновлением, исключающим конфликт уникальности. Требование трассируется к задаче `004`.

#### Scenario: Авторизованное переупорядочивание
- **WHEN** пользователь с требуемым scope отправляет полный порядок в `POST /api/prices/groups/{id}/reorder`
- **THEN** backend атомарно назначает позиции и возвращает `204`

#### Scenario: Чтение упорядоченных цен
- **WHEN** consumer с tenant service key читает `GET /api/prices` или `GET /api/prices/groups*`
- **THEN** backend возвращает Public Read представление с подтверждённым порядком элементов

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

### Requirement: Публикация и CMS-управление новостями
Backend SHALL хранить статус публикации и soft-delete новости, SHALL отдавать через публичные endpoints только опубликованные, не удалённые и уже наступившие публикации, и SHALL предоставлять полный CMS-набор только через защищённую поверхность. Требование трассируется к задаче `007`.

#### Scenario: Публичный список новостей
- **WHEN** consumer с tenant service key вызывает `GET /api/news` без CMS cookie
- **THEN** backend возвращает `200` и не включает future/deleted записи и служебные поля

#### Scenario: Защищённый CMS GET
- **WHEN** anonymous клиент вызывает `GET /api/news-cms`
- **THEN** backend возвращает `401`, поскольку endpoint раскрывает future/deleted записи

#### Scenario: CMS GET без scope
- **WHEN** authenticated пользователь без news scope вызывает `GET /api/news-cms`
- **THEN** backend возвращает `403`

#### Scenario: Soft delete новости
- **WHEN** admin удаляет новость через `DELETE /api/news/{news_id}`
- **THEN** backend возвращает `204`, скрывает запись из Public Read и сохраняет её для CMS deleted-фильтра

### Requirement: S3 media storage и согласованные фотооперации
Backend SHALL подключать S3-compatible media storage через Protocol/DI, SHALL строить публичные URL объектов и SHALL выполнять компенсирующий cleanup/restore между S3-объектом и записью photo repository при ошибках create, update или delete. Полная замена horse photo relations SHALL сначала проверять существование всех tenant-scoped photo ID и только затем заменять связи. Требование трассируется к задачам `009` и `013`.

#### Scenario: Получение S3 URL лошади
- **WHEN** consumer читает Public Read DTO лошади с фотографиями
- **THEN** backend возвращает URL фотографий из настроенного S3 media storage

#### Scenario: Ошибка между media storage и photo repository
- **WHEN** create, update или delete фотографии завершается ошибкой после изменения одной из границ S3/repository
- **THEN** backend выполняет подтверждённую тестами компенсирующую операцию и пробрасывает исходную ошибку

#### Scenario: Полная замена фотографий лошади
- **WHEN** авторизованный пользователь с требуемым scope вызывает `POST /api/horses/{id}/photos`
- **THEN** backend проверяет все photo ID в tenant, заменяет список связей, возвращает обновлённый horse DTO и не предоставляет неподдерживаемое действие main-photo

### Requirement: Управление лошадьми в tenant-контексте
Backend SHALL предоставлять tenant-scoped CRUD лошадей, фильтрацию, сортировку и пагинацию; mutations MUST требовать CMS-аутентификацию и требуемый scope. Каждая лошадь SHALL поддерживать nullable `pedigree_name` длиной не более 63 символов вместо удалённого `code`; поле SHALL приниматься create/partial update и SHALL присутствовать во всех полных horse response-схемах, включая public JSON, list/detail, pedigree/foal/parent/candidate и mutation responses. Отсутствующее поле PATCH MUST сохранять прежнее значение, а явный `null` MUST очищать его. Только при Public Read через `X-Equestrian-Service-Key` backend MUST рекурсивно возвращать `name = pedigree_name`, когда поле задано, иначе исходную `name`; само поле `pedigree_name` остаётся raw nullable. При CMS cookie-аутентификации backend MUST возвращать исходную `name` и raw `pedigree_name` без подмены, включая явный JSON `null`. Alembic migration MUST удалить `code` без переноса данных и добавить nullable `pedigree_name VARCHAR(63)`.

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses` | Public Read | anonymous с tenant key; CMS user | `200` с валидным key; `401` missing/invalid | `200`, cookie projection имеет приоритет | U-13..U-20, SM-01..SM-10 |
| `GET` | `/api/horses/{slug_or_id}` | Public Read | anonymous с tenant key; CMS user | `200` с валидным key; `401` missing/invalid; `404` resource missing | `200` | U-21..U-25, SM-11..SM-16 |
| `GET` | `/api/horses/{id}/pedigree/{mode}` и responses с `pedigree` | Public Read | anonymous с tenant key; CMS user | `200` с валидным key; `401` missing/invalid | `200` | U-26..U-30, SM-17..SM-22 |
| `POST` | `/api/horses` | Protected Write | user с horse write scope | `401` | `200`; без scope `403`; invalid length `400` | U-01..U-06, SM-23..SM-26 |
| `PATCH` | `/api/horses/{horse_id}` | Protected Write | user с horse write scope | `401` | `200`; без scope `403`; foreign tenant текущий `400`; invalid length `400` | U-07..U-12, SM-27..SM-32 |
| `DELETE` | `/api/horses/{horse_id}` | Protected Write | user с horse write scope | `401` | `204`; без scope `403`; foreign tenant текущий `400` | regression, SM-33..SM-35 |

Исключений из дефолтной access policy нет. Tenant selector является identity hint: missing/invalid selector возвращает `401`.

#### Scenario: Public list использует кличку родословной
- **WHEN** consumer с валидным tenant service key без CMS cookie вызывает `GET /api/horses` для лошадей с заполненным и пустым `pedigree_name`
- **THEN** backend возвращает `200`, подставляет заполненное значение в `name`, а при `NULL` сохраняет основную `name`

#### Scenario: Public detail и вложенная родословная
- **WHEN** service-key consumer читает detail/pedigree/candidates с root, sire, dam, foals и parents
- **THEN** каждый horse node независимо получает эффективную `name = pedigree_name ?? name` без подстановки значения другой записи

#### Scenario: CMS читает необработанные значения
- **WHEN** authenticated cookie CMS user вызывает horse list/detail/pedigree, даже если также передан service key
- **THEN** backend возвращает исходную `name` и raw nullable `pedigree_name` каждого node без public fallback; незаполненное значение сериализуется именно как `pedigree_name: null`

#### Scenario: Создание и частичное изменение клички родословной
- **WHEN** пользователь с horse write scope создаёт или изменяет horse с `pedigree_name` длиной до 63 символов, omits поле либо передаёт `null`
- **THEN** backend соответственно сохраняет значение, сохраняет прежнее либо очищает SQL `NULL` и возвращает CMS projection

#### Scenario: Невалидная длина
- **WHEN** POST или PATCH получает `pedigree_name` длиной 64 символа
- **THEN** backend возвращает контрактный `400` без изменения PostgreSQL

#### Scenario: Удалённое поле code
- **WHEN** migration применена и клиент читает или изменяет horse
- **THEN** PostgreSQL и DTO не содержат `code`, старые значения не перенесены, а неизвестное поле не становится частью persisted contract

#### Scenario: Анонимные и недостаточно привилегированные writes
- **WHEN** anonymous либо authenticated без horse write scope вызывает POST/PATCH/DELETE
- **THEN** backend возвращает соответственно `401` или `403` и не изменяет `pedigree_name` либо другие данные

#### Scenario: Чужой tenant
- **WHEN** authenticated пользователь изменяет horse вне своего tenant
- **THEN** lookup остаётся tenant-scoped, backend возвращает текущий `400`, и чужая запись не изменяется
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

### Requirement: Классификация kind через breed
Backend SHALL хранить классификацию `kind` на породе вместо лошади, SHALL фильтровать и сортировать лошадей через связанную breed kind и SHALL возвращать новый контракт в horse/breed DTO. Требование трассируется к задаче `014`.

#### Scenario: Фильтрация лошадей по kind
- **WHEN** consumer вызывает Public Read список лошадей с фильтром `kind`
- **THEN** backend фильтрует записи по `kind` связанной породы

#### Scenario: Изменение без требуемого scope
- **WHEN** authenticated пользователь без требуемого scope изменяет breed или horse
- **THEN** backend возвращает `403` и не изменяет данные

### Requirement: Нерекурсивное обогащение родителей жеребёнка
Backend SHALL при `pedigree>0` включать в каждого foal нерекурсивный объект `parents` с краткими DTO sire и dam либо `null` для отсутствующего известного родителя. Требование трассируется к задаче `019`.

#### Scenario: Оба родителя доступны
- **WHEN** consumer вызывает `GET /api/horses*?pedigree=1` для данных жеребёнка с sire и dam
- **THEN** backend возвращает оба кратких parent DTO без рекурсивного pedigree

#### Scenario: Один родитель отсутствует
- **WHEN** у жеребёнка отсутствует известный dam или sire
- **THEN** backend возвращает `null` для отсутствующей стороны и корректный краткий DTO для известной стороны

### Requirement: Access matrix backend domain endpoints
Backend capability SHALL сохранять следующую evidence-based access matrix. `Tenant key` означает `X-Equestrian-Service-Key` без CMS cookie; `gap` означает отсутствие назначенного live evidence и MUST NOT трактоваться как иной access class.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/prices*` | Public Read | tenant key | `200` с tenant key; live evidence reorder-задачи отсутствует | `200` |
| POST | `/api/prices/groups/{id}/reorder` | Protected Write | `SUPERUSER`, `ADMIN` или `DEVELOPER` | `401` по auth dependency; отдельное live evidence задачи 004 отсутствует | `204` с scope, `403` без scope по code/unit evidence; live HTTP evidence gap |
| GET | `/api/horses/{breeds|coat_colors|services}/{slug}?page_data=true`, `/api/prices/{slug}?page_data=true` | Public Read | tenant key | `200` с tenant key | `200` |
| PATCH | `/api/horses/breeds/{slug}` | Protected Write | `SUPERUSER`, `ADMIN` или `DEVELOPER` | `401` | `200` со scope; `403` без scope; опасный HTML `400` после успешной permission-проверки |
| PATCH | `/api/horses/coat_colors/{slug}` | Protected Write | `SUPERUSER`, `ADMIN` или `DEVELOPER` | `401` | `200` со scope; `403` без scope; опасный HTML `400` после successful permission check |
| PATCH | `/api/horses/{services}/{slug}`, `/api/prices/{slug}` | Protected Write | любой authenticated tenant user; отдельного scope gate в текущих services нет | `401` | `200`; опасный HTML `400` |
| GET | `/api/news`, `/api/news/{id}` | Public Read | tenant key | `400` без tenant key; `200` с tenant key | `200` |
| GET | `/api/news-cms` | Protected Read — исключение: future/deleted данные | admin/news scope | `401` | `200` с scope; `403` без scope |
| POST/PATCH/DELETE | `/api/news*` mutations | Protected Write | `SUPERUSER`, `ADMIN` или `DEVELOPER`; исключение: photo-relation route проверяет только auth | `401` | `201/200/204` по операции; create/update/delete возвращают `403` без scope; для `POST /api/news/{id}/photos` отдельный scope gate отсутствует |
| GET | `/api/horses`, `/api/horses/{slug_or_id}`, `/api/horses/{id}/pedigree/{mode}` | Public Read | tenant key | `200` с tenant key | `200` |
| POST/PATCH/DELETE | horse entity routes: `/api/horses`, `/api/horses/{horse_id}`, `/api/horses/{horse_id}/photos`, `/api/horses/{horse_id}/pedigree`; breed mutations детализированы выше | Protected Write | `SUPERUSER`, `ADMIN` или `DEVELOPER` | `401` | success по операции; `403` без scope для horse/breed/photo, но pedigree POST фактически `400`; foreign-tenant mutation даёт code-evidenced `400`, live gap |
| GET | `/api/photos`, `/api/photos/{id}` | Public Read | tenant key | `200` с tenant key; без key `400`; отдельное live evidence задачи 009 — gap | `200` в tenant пользователя |
| POST/PATCH/DELETE | `/api/photos*` mutations, включая `POST /api/photos/batch-delete` | Protected Write | любой authenticated tenant user; отдельного scope gate в текущем route/service нет | `401` | success согласно операции; no-scope live evidence задачи 009 — gap |
| POST | `/api/prices/{slug_or_id}/photos` | Protected Write | любой authenticated tenant user; отдельного scope gate в текущем route/service нет | `401`; отдельное live evidence задачи 009 — gap | `204`; no-scope live evidence gap |

#### Scenario: Проверка access matrix
- **WHEN** backend/access reviewer проверяет пакет перед sync
- **THEN** reviewer сопоставляет каждую строку с назначенным code/report evidence, отдельно проверяет anonymous, authenticated, no-scope и foreign-resource поведение и блокирует необоснованный claim

### Requirement: Явный gap полного backend-аудита
Capability MUST фиксировать `G-002`: наличие unit-наборов API, services и repositories подтверждено, но полный inventory всех сервисов/репозиториев, матрица use/edge cases и полное anonymous/authenticated покрытие API не подтверждены.

#### Scenario: Использование unit-каталогов как evidence
- **WHEN** reviewer обнаруживает unit-тесты в `services/backend/tests/unit`
- **THEN** reviewer признаёт только покрытые ими сценарии и MUST NOT объявлять полный аудит или полное access-покрытие завершённым без отдельного inventory и QG evidence

### Requirement: Поиск и сортировка справочников по короткому наименованию
Backend SHALL принимать необязательный `short_name` в Public Read list endpoint'ах пород и мастей, SHALL выполнять tenant-scoped case-insensitive substring search по соответствующей колонке и SHALL разрешать `short_name` и `-short_name` в sort allowlist. Create/update/out DTO MUST сохранять существующий контракт `short_name`, включая автогенерацию из `name` при пустом значении.

#### Scenario: Анонимное tenant-scoped чтение пород
- **WHEN** consumer без CMS cookie, но с валидным tenant key вызывает `GET /api/horses/breeds?short_name=ар&sort=short_name`
- **THEN** backend возвращает `200`, только совпавшие записи tenant и сортирует их по возрастанию `short_name`

#### Scenario: Анонимное tenant-scoped чтение мастей
- **WHEN** consumer без CMS cookie, но с валидным tenant key вызывает `GET /api/horses/coat_colors?short_name=гн&sort=-short_name`
- **THEN** backend возвращает `200`, только совпавшие записи tenant и сортирует их по убыванию `short_name`

#### Scenario: Невалидное поле сортировки
- **WHEN** клиент передаёт неизвестное значение sort в list endpoint
- **THEN** FastAPI отклоняет запрос с `422`, не выполняя неразрешённый доступ к колонке

#### Scenario: Protected Write сохраняет короткое наименование
- **WHEN** разрешённый authenticated tenant user создаёт или изменяет породу либо масть с явным `short_name`
- **THEN** backend сохраняет значение и возвращает его в DTO, anonymous write получает `401`, а breed write без требуемого scope получает `403`

### Requirement: Access matrix коротких наименований
Backend SHALL сохранять access classes существующих routes без исключений из Public Read/Protected Write.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/horses/breeds?short_name=&sort=` | Public Read | tenant key | `200` с tenant key; `400` без tenant context | `200` |
| GET | `/api/horses/coat_colors?short_name=&sort=` | Public Read | tenant key | `200` с tenant key; `400` без tenant context | `200` |
| POST/PATCH | `/api/horses/breeds*` | Protected Write | authenticated tenant user + horse/breed scope | `401` | success со scope; `403` без scope; foreign tenant не изменяется |
| POST/PATCH | `/api/horses/coat_colors*` | Protected Write | authenticated tenant user + `SUPERUSER`, `ADMIN` или `DEVELOPER` | `401` | success со scope; `403` без scope; foreign tenant не изменяется |

#### Scenario: Access review
- **WHEN** Quality Gate проверяет change
- **THEN** anonymous/authenticated tests подтверждают обе Public Read строки и Protected Write `401/403`, а review не объявляет нового access exception

### Requirement: Нормализация необязательных полей пород и мастей
Backend SHALL принимать в create/update пород и мастей отсутствующие, `null`, пустые и состоящие только из пробелов значения `slug` и `description`. Пустой `slug` MUST интерпретироваться как отсутствие пользовательского slug, а пустое описание MUST сохраняться как `null`. При create без slug backend SHALL сгенерировать уникальный slug из нормализованного имени; при update с пустым slug backend SHALL не отклонять запрос и SHALL сохранить текущий slug, если имя не изменилось, либо применить действующую генерацию из нового имени, если имя изменилось.

#### Scenario: Создание породы без slug и описания
- **WHEN** разрешённый пользователь отправляет `POST /horses/breeds` с валидным именем и пустыми либо отсутствующими `slug` и `description`
- **THEN** backend создаёт породу, генерирует уникальный slug из имени и возвращает `description: null`

#### Scenario: Изменение породы с пустыми необязательными полями
- **WHEN** разрешённый пользователь отправляет `PATCH /horses/breeds/{slug_or_id}` с пустыми `slug` и `description`
- **THEN** backend не возвращает ошибку пустого поля, сохраняет согласованный slug и устанавливает описание в `null`

### Requirement: Устойчивое создание лошади при коллизии tenant-scoped slug

Backend MUST при `POST /api/horses` формировать уникальный slug внутри текущего `equestrian_id`: первый объект получает нормализованный базовый slug, последующие коллизии получают минимальный свободный суффикс `-N`. Итоговый slug MUST укладываться в ограничение поля, а коллизия уникального индекса `ix_horse_equestrian_slug` MUST NOT приводить к необработанному HTTP 500. Проверка и создание MUST сохранять tenant isolation; иные DB constraints MUST NOT маскироваться как slug-конфликт.

#### Scenario: Повторное имя в одном tenant
- **WHEN** разрешённый пользователь дважды создаёт лошадь с именем, нормализуемым в один base slug, в одном tenant
- **THEN** обе операции завершаются успешно, а slug второй лошади получает минимальный свободный суффикс

#### Scenario: Пропуск занятого суффикса
- **WHEN** в tenant уже заняты `normann`, `normann-1` и `normann-2`
- **THEN** следующая лошадь получает `normann-3`

#### Scenario: Одинаковый slug в разных tenant
- **WHEN** одинаковые имена создаются в двух разных tenant
- **THEN** оба tenant могут использовать базовый slug без взаимного раскрытия или суффикса из-за чужих данных

#### Scenario: Максимальная длина slug
- **WHEN** base slug достигает максимальной длины и требует суффикс
- **THEN** backend обрезает только базовую часть, сохраняет полный суффикс и записывает валидный уникальный slug

#### Scenario: Конкурентная коллизия
- **WHEN** две транзакции конкурентно выбирают один свободный candidate slug
- **THEN** конкретная коллизия `ix_horse_equestrian_slug` обрабатывается ограниченным retry либо явным HTTP 400, но не HTTP 500; транзакция остаётся пригодной к корректному rollback/commit

#### Scenario: Иное нарушение целостности
- **WHEN** insert нарушает constraint, не являющийся `ix_horse_equestrian_slug`
- **THEN** backend не выдаёт его за slug-конфликт и сохраняет стандартную диагностику инфраструктурной ошибки

### Requirement: Access contract исправления создания лошади

Исправление MUST сохранять существующий Protected Write контракт и не менять Public Read endpoints.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `POST` | `/api/horses` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`; missing/invalid tenant selector `401`; no write | `200` с разрешённым scope и валидным selector; `403` без scope; invalid/foreign selector `401`; business validation `400`; duplicate generated slug suffixируется без `500` |

Исключений из default API policy нет.

#### Scenario: Anonymous create
- **WHEN** anonymous клиент вызывает `POST /api/horses`
- **THEN** backend возвращает `401` и не создаёт запись

#### Scenario: Authenticated без scope
- **WHEN** authenticated пользователь без `SUPERUSER`, `ADMIN`, `DEVELOPER` вызывает `POST /api/horses`
- **THEN** backend возвращает `403` и не создаёт запись

#### Scenario: Authenticated разрешённый пользователь
- **WHEN** authenticated пользователь с разрешённым scope и валидным tenant selector создаёт лошадь с коллидирующим generated slug
- **THEN** backend возвращает `200`, создаёт запись только в этом tenant и возвращает уникальный suffixed slug

#### Scenario: Public Read не регрессирует
- **WHEN** anonymous consumer с валидным tenant selector вызывает `GET /api/horses` или `GET /api/horses/{slug_or_id}` после создания suffixed slug
- **THEN** backend возвращает `200` и позволяет прочитать обе записи по их различным slug; missing/invalid selector возвращает `401`

### Requirement: Проверки регрессии horse slug

Реализация MUST иметь не менее 30 разнообразных unit scenarios и 30 live smoke scenarios, трассируемых к access matrix и требованиям уникальности. Smoke MUST выполняться smoke skill на живом API с реальной PostgreSQL, чьи параметры повторно получены через `docker inspect`; pytest smoke scripts, SQLite и in-memory замены запрещены.

#### Scenario: Unit gate
- **WHEN** Backend owner завершает реализацию
- **THEN** unit suite покрывает нормализацию, suffix sequence/length, tenant isolation, permissions, constraint discrimination, rollback/retry и негативные границы не менее чем 30 отдельными проверками

#### Scenario: Live smoke gate
- **WHEN** Quality Gate проверяет change
- **THEN** smoke skill выполняет не менее 30 HTTP/DB сценариев на реальном `eqsitecms-db`, включая anonymous/authenticated, scope, tenant, повторные и конкурентные create, read-after-write и отсутствие HTTP 500

#### Scenario: Создание масти без slug и описания
- **WHEN** разрешённый пользователь отправляет `POST /horses/coat_colors` с валидным именем и пустыми либо отсутствующими `slug` и `description`
- **THEN** backend создаёт масть, генерирует уникальный slug из имени и возвращает `description: null`

#### Scenario: Изменение масти с пустыми необязательными полями
- **WHEN** разрешённый пользователь отправляет `PATCH /horses/coat_colors/{slug_or_id}` с пустыми `slug` и `description`
- **THEN** backend не возвращает ошибку пустого поля, сохраняет согласованный slug и устанавливает описание в `null`

#### Scenario: Access matrix существующих endpoint
- **WHEN** change проверяется относительно API access policy
- **THEN** применяется следующая матрица без исключений

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/horses/breeds` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`/`403` по auth middleware | `200`/`201` при валидных данных и scope; `403` без scope |
| PATCH | `/horses/breeds/{slug_or_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`/`403` по auth middleware | `200` при валидных данных и scope; `403` для чужого tenant/без scope |
| POST | `/horses/coat_colors` | Protected Write | существующие admin scopes endpoint | `401`/`403` по auth middleware | успех при валидной auth и scope; `403` без права/для чужого tenant |
| PATCH | `/horses/coat_colors/{slug_or_id}` | Protected Write | существующие admin scopes endpoint | `401`/`403` по auth middleware | `200` при валидной auth и scope; `403` без права/для чужого tenant |

#### Scenario: Анонимный Protected Write
- **WHEN** клиент без cookie вызывает любой изменяемый endpoint из access matrix
- **THEN** backend возвращает контрактный `401` или `403` и не изменяет PostgreSQL

#### Scenario: Изоляция tenant
- **WHEN** authenticated пользователь пытается изменить породу или масть чужого equestrian tenant
- **THEN** backend возвращает контрактный отказ или отсутствие ресурса и не изменяет чужую запись

### Requirement: Фильтрация лошадей по оказываемым услугам
Backend SHALL принимать в `GET /api/horses` optional повторяемый query-параметр `services: list[UUID]`. Несколько UUID SHALL иметь OR-семантику; data и count SHALL использовать одинаковый tenant-scoped predicate, не дублировать лошадей и сохранять `limit`/`offset`/sort.

| method | path | access class | roles | expected without auth | expected with auth | связанные тесты |
|---|---|---|---|---|---|---|
| `GET` | `/api/horses?services=<uuid>&services=<uuid>` | Public Read | anonymous с tenant key; authenticated CMS user | `200` с tenant key; `400` без tenant context; malformed UUID `422` | `200`; foreign-tenant service IDs дают пустую выдачу без раскрытия | UT-11..UT-23, SM-11..SM-23 |

Изменение не является исключением из default access policy: `GET` остаётся Public Read. Tenant service key задаёт read context и не является CMS-аутентификацией.

#### Scenario: Одна услуга
- **WHEN** consumer вызывает `GET /api/horses?services=<service-a>` в tenant A
- **THEN** backend возвращает только лошадей tenant A, связанных с service-a

#### Scenario: Несколько услуг используют OR
- **WHEN** consumer повторяет параметр `services` для service-a и service-b
- **THEN** backend возвращает уникальное объединение лошадей, связанных хотя бы с одной услугой

#### Scenario: Пустой фильтр
- **WHEN** `services` отсутствует или нормализован в пустой список
- **THEN** backend не добавляет service predicate и сохраняет прежнюю выдачу

#### Scenario: Count и pagination
- **WHEN** service filter применяется вместе с `limit`, `offset` и sort
- **THEN** `count` отражает полный уникальный filtered set, а items соответствуют запрошенной странице

#### Scenario: Anonymous Public Read
- **WHEN** anonymous consumer с валидным tenant key применяет services filter
- **THEN** backend возвращает `200` без CMS cookie

#### Scenario: Отсутствующий tenant context
- **WHEN** anonymous consumer без tenant key вызывает endpoint
- **THEN** backend возвращает действующий контрактный `400`

#### Scenario: Authenticated CMS read
- **WHEN** authenticated CMS user применяет services filter
- **THEN** backend возвращает `200` только в tenant пользователя

#### Scenario: Чужая услуга
- **WHEN** tenant A передаёт UUID услуги tenant B
- **THEN** backend возвращает пустой результат для этого UUID и не раскрывает существование чужой услуги

#### Scenario: Невалидный UUID
- **WHEN** `services` содержит malformed UUID
- **THEN** FastAPI возвращает `422`, не выполняя repository query

### Requirement: NATS Jetstream инфраструктура

Backend SHALL использовать NATS Jetstream для асинхронного взаимодействия между сервисами с использованием Dependency Injection.

#### Scenario: NATS клиент через DI контейнер
- **WHEN** backend запускается
- **THEN** NATS Jetstream клиент создается через Dependency Injector контейнер
- **AND** клиент доступен через DI, а не через `app.state`

#### Scenario: Публикация событий в NATS
- **WHEN** backend получает запрос на создание callback заявки через `POST /api/callback_requests`
- **THEN** backend публикует событие в stream "SITE_EVENTS"
- **AND** событие содержит информацию о заявке

#### Scenario: Настройки NATS в отдельном классе
- **WHEN** backend загружает конфигурацию
- **THEN** все настройки NATS Jetstream находятся в отдельном классе `NatsSettings`
- **AND** все переменные окружения NATS начинаются с префикса `NATS_`

### Requirement: Имя фотографии безопасно укладывается в ограничение хранения
Backend SHALL принимать имя фотографии любой длины и MUST до repository insert/update преобразовать его в tenant-scoped уникальное display name длиной не более 63 Unicode code points. Алгоритм SHALL нормализовать basename в NFC, удалить path/control components, сохранить безопасное extension и для длинного имени сформировать `<readable-prefix>-<digest12><extension>`, где `digest12` получен из SHA-256 полного нормализованного исходного имени и identity ресурса/содержимого. DB `StringDataRightTruncationError` и HTTP `500` не являются допустимым outcome длины имени.

#### Scenario: Граничное имя создаётся
- **WHEN** authenticated tenant user отправляет `POST /api/photos` с валидным файлом и именем ровно 63 символа
- **THEN** backend сохраняет media object и photo row и возвращает успешный create response

#### Scenario: Длинное имя сокращается без участия пользователя
- **WHEN** authenticated tenant user отправляет `POST /api/photos` с именем 64 или более символов
- **THEN** backend создаёт фотографию, возвращает фактически сохранённое имя длиной ≤63 с читаемым prefix, `digest12` и сохранённым extension и не возвращает `500`

#### Scenario: Длинное имя при update сокращается стабильно
- **WHEN** authenticated owner отправляет `PATCH /api/photos/{id}` с именем 64 или более символов с новым файлом или без него
- **THEN** backend использует UUID этой фотографии как identity, сохраняет bounded name ≤63 и возвращает успешный updated DTO

#### Scenario: Имя из filename проходит тот же инвариант
- **WHEN** create использует filename как fallback для пустого name и полученное имя превышает 63 символа
- **THEN** backend нормализует и сокращает fallback тем же алгоритмом и успешно создаёт фотографию

#### Scenario: Одинаковое имя у разных файлов различается hash
- **WHEN** в одном tenant загружаются разные файлы с одинаковым длинным исходным именем
- **THEN** content identity формирует разные `digest12`, обе фотографии создаются и оба имени укладываются в 63 символа

#### Scenario: Повторная загрузка того же файла создаёт отдельный ресурс
- **WHEN** в одном tenant повторно загружается тот же content с тем же исходным именем
- **THEN** первый bounded candidate совпадает, repository collision loop добавляет `-2` (далее `-3`, ...) перед extension и создаёт отдельную photo row

#### Scenario: Одинаковое короткое имя сохраняет читаемость
- **WHEN** в одном tenant загружаются разные или одинаковые файлы с одинаковым именем, которое помещается в 63 символа
- **THEN** первая row получает исходное нормализованное имя, следующие получают `-2`, `-3`, ... перед extension без обязательного hash

#### Scenario: Hash collision разрешается без потери данных
- **WHEN** разные inputs дают одинаковые первые 12 hex SHA-256 либо candidate уже занят
- **THEN** backend не полагается на вероятность hash, а находит свободное bounded имя последовательным discriminator и не возвращает `500`

#### Scenario: Unicode и очень длинное имя остаются корректными
- **WHEN** исходное имя содержит decomposed Unicode, emoji/CJK, path components или тысячи code points
- **THEN** backend применяет basename + NFC + safe extension, не разрезает кодировку и сохраняет итог длиной ≤63

#### Scenario: Параллельная коллизия сериализуется ограничением БД
- **WHEN** два concurrent create вычисляют одинаковый свободный candidate
- **THEN** unique constraint определяет победителя, а проигравший выполняет до 100 attempts с новым discriminator, после чего возвращает явный `409` без internal `500`

### Requirement: Tenant-scoped уникальность имён гарантируется схемой PostgreSQL
Таблица `photos` SHALL иметь именованный `UniqueConstraint(equestrian_id, name)` `uq_photos_equestrian_name`. Alembic upgrade MUST до создания constraint транзакционно обнаружить и детерминированно переименовать существующие exact duplicates без удаления rows, media paths или relations; после cleanup повторная preflight-проверка MUST доказать отсутствие дублей. Неуникальный `ix_photos_equestrian_name` SHALL быть заменён constraint-backed unique index.

#### Scenario: Чистая БД получает constraint без изменений данных
- **WHEN** migration запускается на PostgreSQL без tenant-scoped duplicate names
- **THEN** ни одна photo row не переименовывается, старый индекс удаляется и `uq_photos_equestrian_name` создаётся

#### Scenario: Existing duplicates разрешаются детерминированно
- **WHEN** tenant содержит несколько rows с одинаковым name
- **THEN** keeper выбирается по `created_at NULLS LAST, id`, остальные получают первые свободные bounded suffix names с учётом всех уже существующих names tenant

#### Scenario: Existing suffix не перезаписывается
- **WHEN** tenant содержит duplicates `photo.jpg` и отдельную row `photo-2.jpg`
- **THEN** cleanup резервирует `photo-2.jpg` и переименовывает duplicate в следующий свободный candidate, например `photo-3.jpg`

#### Scenario: Migration сохраняет связи и media identity
- **WHEN** cleanup переименовывает конфликтующую photo row
- **THEN** её `id`, `path`, timestamps и horse/price/news relations сохраняются, меняется только `name`

#### Scenario: Failed post-check откатывает upgrade
- **WHEN** после cleanup остаётся duplicate либо имя превышает 63 code points
- **THEN** migration aborts и PostgreSQL transaction откатывает updates/drop/create operations

#### Scenario: Downgrade сохраняет данные без ложного восстановления имён
- **WHEN** выполняется downgrade
- **THEN** unique constraint удаляется и неуникальный индекс восстанавливается, но детерминированные rename не обращаются автоматически и это явно отражено в migration metadata

### Requirement: Access matrix операций фотографий сохраняется
Изменение SHALL сохранять существующие access classes и tenant isolation. Новых endpoint или исключений из default policy нет.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `GET` | `/api/photos`, `/api/photos/{id}` | Public Read с tenant selector | anonymous consumer с валидным tenant key или authenticated tenant user | валидный key: `200/404`; missing/invalid selector: действующий `400/404`, refresh-only: `401` | `200/404` в tenant пользователя |
| `POST` | `/api/photos` | Protected Write | authenticated tenant user | `401` | валидный файл с name любой длины: success и bounded unique name; чужой tenant context не создаёт ресурс |
| `PATCH` | `/api/photos/{id}` | Protected Write | authenticated tenant user, только свой tenant resource | `401` | owner: `200` с bounded unique name; foreign resource: действующий non-success contract без mutation |
| `DELETE` | `/api/photos/{id}` | Protected Write | authenticated tenant user, только свой tenant resource | `401` | owner: `204`; foreign/not-found: действующий non-success contract без mutation |

#### Scenario: Anonymous write запрещён
- **WHEN** запрос `POST`, `PATCH` или `DELETE` фотографии выполняется без valid authentication
- **THEN** backend возвращает `401` и не изменяет PostgreSQL/media storage

#### Scenario: Authenticated validation не меняет access outcome
- **WHEN** authenticated tenant user создаёт или переименовывает собственную фотографию
- **THEN** backend применяет bounded naming после authentication/tenant resolution и возвращает success независимо от длины валидного исходного имени

#### Scenario: Чужой ресурс не мутируется
- **WHEN** authenticated user пытается PATCH или DELETE фотографии другого tenant
- **THEN** backend возвращает действующий контрактный non-success status и не меняет чужую строку или media object

#### Scenario: Public read не приватизируется
- **WHEN** anonymous consumer выполняет GET фотографии с валидным tenant selector
- **THEN** backend сохраняет существующий Public Read outcome без требования CMS cookie

### Requirement: Управляемый slug лошади

Backend SHALL принимать необязательный `slug` в `POST /api/horses` и `PATCH /api/horses/{horse_id}`, нормализовать его доменным slug-алгоритмом и обеспечивать уникальность внутри текущего tenant. При create отсутствующий, `null` или пустой slug MUST генерироваться из `name`; при PATCH отсутствующее поле MUST сохранять текущий slug, а `null` или пустая строка MUST регенерировать его из итогового имени. Явная tenant-scoped коллизия или значение, нормализуемое в пустую строку, MUST возвращать управляемый `400`, а не `500`.

#### Scenario: Создание с ручным slug
- **WHEN** разрешённый пользователь создаёт лошадь с `slug=" My Horse URL "`
- **THEN** backend сохраняет нормализованный `my-horse-url` и возвращает его в `HorseOutDto`

#### Scenario: Автогенерация при пустом create slug
- **WHEN** разрешённый пользователь создаёт лошадь без `slug`, с `slug=null` или `slug=""`
- **THEN** backend генерирует slug из `name` и при tenant-scoped коллизии выбирает минимальный свободный суффикс `-N`

#### Scenario: Partial PATCH сохраняет slug
- **WHEN** разрешённый пользователь обновляет другие поля лошади без поля `slug`
- **THEN** backend сохраняет текущий slug без изменений

#### Scenario: PATCH меняет slug
- **WHEN** разрешённый пользователь отправляет непустой свободный `slug` для собственной tenant-записи
- **THEN** backend нормализует и сохраняет новый slug, новый Public Read lookup находит лошадь, а старый slug её больше не находит

#### Scenario: PATCH регенерирует slug
- **WHEN** разрешённый пользователь передаёт `slug=null` или `slug=""` вместе с текущим либо новым `name`
- **THEN** backend генерирует slug из итогового имени и обеспечивает tenant-scoped уникальность

#### Scenario: Self-conflict отсутствует
- **WHEN** разрешённый пользователь PATCH-ит лошадь её текущим slug после нормализации
- **THEN** backend возвращает успех и не считает саму запись конфликтом

#### Scenario: Ручной slug занят
- **WHEN** разрешённый пользователь задаёт slug, уже принадлежащий другой лошади того же tenant
- **THEN** backend возвращает управляемый `400`, не изменяет запись и не маскирует конфликт автоматическим suffix

#### Scenario: Одинаковый slug в разных tenant
- **WHEN** два разрешённых пользователя разных tenant задают одинаковый нормализованный slug
- **THEN** обе записи сохраняются независимо и Public Read lookup соблюдает tenant isolation

#### Scenario: Нормализация даёт пустой slug
- **WHEN** ручное значение после доменной нормализации не содержит допустимых символов и имя не используется для явного значения
- **THEN** backend возвращает `400` и не пишет частичное состояние

#### Scenario: Race condition ограничена constraint mapping
- **WHEN** конкурентные операции проходят предварительную проверку одного slug в одном tenant
- **THEN** unique constraint оставляет не более одной конфликтующей записи, а проигравший запрос получает управляемую клиентскую ошибку без `500`

### Requirement: Access contract управления slug лошади

Изменение slug SHALL сохранять стандартный Protected Write контракт, а чтение лошади по новому slug SHALL сохранять Public Read контракт с tenant selector. Исключений из дефолтной access policy нет.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `POST` | `/api/horses` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`; no write; missing/invalid selector `401` | `200` со scope; `403` без scope; `400` invalid/conflict slug |
| `PATCH` | `/api/horses/{horse_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`; no mutation | `200` для своего tenant и scope; `403` без scope/foreign tenant; `400` invalid/conflict slug |
| `GET` | `/api/horses` | Public Read с tenant selector | anonymous consumer; CMS user | `200` valid selector; `401` missing/invalid | `200` |
| `GET` | `/api/horses/{slug_or_id}` | Public Read с tenant selector | anonymous consumer; CMS user | `200` valid selector; `401` missing/invalid; `404` missing | `200` |

#### Scenario: Anonymous write запрещён
- **WHEN** anonymous client вызывает POST или PATCH с полем `slug`
- **THEN** backend возвращает `401` и PostgreSQL запись не создаётся и не меняется

#### Scenario: Authenticated write разрешён по scope
- **WHEN** authenticated пользователь с разрешённым scope и валидным tenant selector создаёт или меняет slug своей лошади
- **THEN** backend применяет mutation и возвращает `200`

#### Scenario: Недостаточный scope или чужой tenant
- **WHEN** authenticated пользователь без horse write scope либо из другого tenant пытается изменить slug
- **THEN** backend возвращает `403` по контракту и не раскрывает/не меняет чужую запись

#### Scenario: Anonymous Public Read нового slug
- **WHEN** anonymous consumer с валидным tenant selector читает `/api/horses/{new_slug}` без CMS cookie
- **THEN** backend возвращает `200` и лошадь своего tenant

#### Scenario: Missing или invalid tenant selector
- **WHEN** anonymous consumer читает horse GET без selector либо с invalid selector
- **THEN** backend возвращает `401`
