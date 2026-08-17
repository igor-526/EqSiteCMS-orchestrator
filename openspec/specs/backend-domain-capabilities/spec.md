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
Backend SHALL позволять читать кандидатов sire/dam/children публично в tenant context и SHALL позволять устанавливать, заменять и очищать pedigree relations только через Protected Write. Требование трассируется к задаче `011`.

#### Scenario: Чтение кандидатов родословной
- **WHEN** consumer с tenant service key вызывает `GET /api/horses/{id}/pedigree/{mode}` для `sire`, `dam` или `children`
- **THEN** backend возвращает `200` с отфильтрованным списком кандидатов

#### Scenario: Изменение родословной
- **WHEN** пользователь с требуемым scope вызывает `POST /api/horses/{id}/pedigree`
- **THEN** backend устанавливает или очищает соответствующие связи и возвращает `204`

#### Scenario: Пользователь без pedigree scope
- **WHEN** authenticated пользователь без требуемого scope вызывает `POST /api/horses/{id}/pedigree`
- **THEN** текущий модуль возвращает фактически подтверждённый `400`, а access-review MUST зарегистрировать отклонение от общего `403` контракта

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
