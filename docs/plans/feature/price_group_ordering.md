# План: Price Group Ordering — порядок услуг в группах

**Тикет:** price_group_ordering
**Дата:** 2026-05-07
**Затронутые сервисы:** services/backend, services/frontend
**Ветка:** feature/price-group-ordering

---

## Контекст

Модели `prices` (услуги) и `price_groups` (группы услуг) связаны через таблицу `price_groups_relations`. Сейчас в таблице связи нет поля порядка, поэтому услуги в группе отображаются в порядке `created_at` (fallback). Нужно добавить возможность явно задавать порядок услуг внутри группы. Этот порядок должен применяться как дефолтная сортировка при запросе с фильтром `groups`, что важно для `site-ad` — клиентский сайт уже делает запросы `/prices?groups=...` без явной сортировки, изменений в нём не потребуется.

## Цель

После реализации:
- В `price_groups_relations` появится колонка `display_order` (nullable Integer) с уникальным индексом `(group_id, display_order)`.
- Новый эндпоинт `POST /prices/groups/{id}/reorder` позволяет SUPERUSER/ADMIN/DEVELOPER задавать порядок услуг внутри группы.
- При создании/добавлении услуги в группу она встаёт на последнее место.
- При удалении услуги из группы оставшиеся перенумеровываются.
- При запросе `GET /prices?groups=<name>` без `sort` — дефолтная сортировка по `display_order`.
- В таблице "Группы услуг" (CMS) появляется кнопка DnD-сортировки для каждой группы.

---

## Детали реализации

### Backend

#### Изменения существующих файлов и новые

| Что | Путь | Описание |
|---|---|---|
| SQLAlchemy table | `services/backend/src/models/prices.py` | Добавить `display_order` колонку + уникальный индекс |
| Миграция | `services/backend/src/migration/versions/<rev>_add_display_order_to_price_groups_relations.py` | revises `9f0f2c5c7b11` |
| Entity | `services/backend/src/core/entities/prices.py` | Добавить `display_order: int \| None` в `PriceGroupsRelation` |
| Schema | `services/backend/src/core/schemas/prices.py` | Добавить `PriceGroupReorderItemDto` + `PriceGroupReorderDto` |
| Protocol | `services/backend/src/core/protocols/repositories/price_repository.py` | Добавить методы в `PriceRepositoryProtocol` |
| Service | `services/backend/src/core/services/prices.py` | Новый метод `reorder_prices_in_group` в `PriceGroupService` + изменение дефолтной сортировки |
| Repository | `services/backend/src/repositories/price_repository.py` | Реализации новых методов, двухфазное обновление |
| API router | `services/backend/src/api/prices.py` | Новый эндпоинт `POST /prices/groups/{id}/reorder` |
| Agent docs | `agents/backend.md` | Секция правил для display_order |

#### Схема БД — миграция

```sql
-- Добавить колонку
ALTER TABLE price_groups_relations
    ADD COLUMN display_order INTEGER NULL;

-- Создать уникальный индекс (nullable-safe: PostgreSQL не включает NULL в UNIQUE)
CREATE UNIQUE INDEX uix_price_groups_relations_group_order
    ON price_groups_relations (group_id, display_order)
    WHERE display_order IS NOT NULL;

-- Backfill: присвоить начальные значения существующим строкам через двухфазный подход
UPDATE price_groups_relations pgr
SET display_order = sub.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY id) AS rn
    FROM price_groups_relations
) sub
WHERE pgr.id = sub.id;
```

Индекс `WHERE display_order IS NOT NULL` — nullable-safe: NULL-значения не включаются в уникальный индекс, что обходит constraint при двухфазном обновлении.

#### Изменение модели SQLAlchemy

В `services/backend/src/models/prices.py` в таблице `price_groups_relations` добавить:

```python
Column("display_order", Integer, nullable=True),
Index(
    "uix_price_groups_relations_group_order",
    "group_id",
    "display_order",
    unique=True,
    postgresql_where=text("display_order IS NOT NULL"),
),
```

#### Изменение Entity

В `services/backend/src/core/entities/prices.py` в классе `PriceGroupsRelation`:

```python
display_order: int | None = Field(
    default=None,
    description="Порядок отображения услуги в группе",
)
```

#### Новые DTO

В `services/backend/src/core/schemas/prices.py`:

```python
class PriceGroupReorderItemDto(BaseSchema):
    """Элемент списка изменений порядка."""
    id: UUID = Field(..., description="UUID услуги")
    order: int = Field(..., ge=1, description="Желаемая позиция")

class PriceGroupReorderDto(BaseSchema):
    """DTO для reorder запроса."""
    changes: list[PriceGroupReorderItemDto] = Field(
        ..., description="Список изменений (не весь список, только изменённые позиции)"
    )
```

#### Новые методы Protocol

В `services/backend/src/core/protocols/repositories/price_repository.py`:

```python
async def get_group_relations_ordered(
    self, group_id: UUID, *, equestrian_id: UUID
) -> list[PriceGroupsRelation]: ...

async def set_display_orders(
    self, group_id: UUID, order_map: dict[UUID, int], *, equestrian_id: UUID
) -> None: ...

async def append_price_to_group_ordered(
    self, price_id: UUID, group_id: UUID, *, equestrian_id: UUID
) -> None: ...

async def remove_price_from_group_reindex(
    self, price_id: UUID, group_id: UUID, *, equestrian_id: UUID
) -> None: ...
```

#### Бизнес-логика reorder (алгоритм)

Алгоритм `reorder_prices_in_group` в `PriceGroupService`:

1. Получить текущий упорядоченный список связей для группы `(price_id, display_order)` — N элементов.
2. Построить `current_order: dict[UUID, int]` (price_id → display_order).
3. Для каждого изменения `(id, target_order)` из `changes` (в порядке их поступления):
   - Если `target_order < 1` → `target_order = 1`.
   - Если `target_order > N` → `target_order = N`.
   - Текущая позиция `current_pos = current_order[id]`.
   - Если `current_pos == target_order` → пропустить.
   - Если `target_order < current_pos`: все элементы с `display_order >= target_order AND display_order < current_pos` сдвинуть на `+1`.
   - Если `target_order > current_pos`: все элементы с `display_order > current_pos AND display_order <= target_order` сдвинуть на `-1`.
   - Установить `id.display_order = target_order`.
   - Пересобрать `current_order`.
4. Применить финальный `order_map` через `set_display_orders` (двухфазное обновление).
5. Проверка прав: только SUPERUSER / ADMIN / DEVELOPER (паттерн `_check_admin_permission`).

#### Двухфазное обновление в репозитории

`set_display_orders` реализует двухфазный update для обхода UNIQUE constraint:

```python
# Фаза 1: сбросить все display_order в NULL для затронутых строк
await session.execute(
    update(price_groups_relations)
    .where(price_groups_relations.c.group_id == group_id, ...)
    .values(display_order=None)
)
await session.flush()

# Фаза 2: выставить финальные значения
for price_id, order in order_map.items():
    await session.execute(
        update(price_groups_relations)
        .where(
            price_groups_relations.c.price_id == price_id,
            price_groups_relations.c.group_id == group_id,
        )
        .values(display_order=order)
    )
await session.flush()
```

#### Дефолтная сортировка в `get_filtered`

В `PriceRepository.get_filtered`, ветка сортировки:

```python
if sort:
    # явная сортировка — применяем как раньше
    ...
elif groups:
    # фильтр по группам без явной сортировки → JOIN + order by display_order
    stmt = stmt.order_by(
        price_groups_relations.c.display_order.asc().nullslast()
    )
else:
    # fallback без явного sort и без groups filter
    stmt = stmt.order_by(self.table.c.created_at.desc())
```

При активном `groups` фильтре нужно переделать подзапрос в явный JOIN с `price_groups_relations`, чтобы column `display_order` был доступен в ORDER BY.

#### Логика добавления/удаления

**При `set_price_groups`:**
- Для каждой новой связи `(price_id, group_id)` — назначить `display_order = MAX(display_order в группе) + 1`.
- Для удалённых связей — перенумеровать оставшиеся через двухфазное обновление.

**При `delete` цены:**
- В `PriceService.delete`: до удаления получить все группы цены, удалить, затем перенумеровать оставшиеся в каждой группе.

#### API контракт

```
POST /prices/groups/{id}/reorder
Authorization: cookie access_token (required)
Body: {
  "changes": [
    {"id": "UUID", "order": 3},
    {"id": "UUID2", "order": 1}
  ]
}
Response 204: No Content

Errors:
  400 - группа не найдена / UUID не принадлежит группе / пустой список changes / недостаточно прав
  401 - нет авторизации
```

---

## Access Matrix

| Метод | Эндпоинт | Класс доступа | Роли | Без auth | С auth (без роли) | С auth (нужная роль) |
|---|---|---|---|---|---|---|
| GET | `/prices/groups` | Public Read | — | 200 | 200 | 200 |
| GET | `/prices/groups/{id}` | Public Read | — | 200 | 200 | 200 |
| POST | `/prices/groups` | Protected Write | любой авторизованный | 401 | 200 (нет role check) | 200 |
| PATCH | `/prices/groups/{id}` | Protected Write | любой авторизованный | 401 | 200 (нет role check) | 200 |
| DELETE | `/prices/groups/{id}` | Protected Write | любой авторизованный | 401 | 200 (нет role check) | 200 |
| **POST** | **`/prices/groups/{id}/reorder`** | **Protected Write + Role** | **SUPERUSER, ADMIN, DEVELOPER** | **401** | **400** | **204** |
| GET | `/prices` | Public Read | — | 200 | 200 | 200 |
| POST | `/prices` | Protected Write | любой авторизованный | 401 | 200 | 200 |
| PATCH | `/prices/{id}` | Protected Write | любой авторизованный | 401 | 200 | 200 |
| DELETE | `/prices/{id}` | Protected Write | любой авторизованный | 401 | 200 | 200 |

**Исключения из дефолта:**
- `POST /prices/groups/{id}/reorder` — Protected Write с дополнительной проверкой роли. Причина: операция изменяет публично видимый порядок контента, что является привилегированным действием.

---

### Frontend

#### Новые и изменённые компоненты

| Что | Путь | Описание |
|---|---|---|
| Новые типы | `src/types/api/priceGroups.ts` | `PriceGroupReorderItemInDto`, `PriceGroupReorderInDto` |
| API функция | `src/api/priceGroups.ts` | `priceGroupReorder(groupId, payload)` |
| Сервисная функция | `src/features/prices/services/priceGroupService.ts` | `fetchReorderPricesInGroup(groupId, changes)` |
| Action | `src/features/prices/hooks/usePriceScopes.ts` | `PRICE_GROUP_REORDER` в enum + registry |
| Хук | `src/features/prices/hooks/usePrices.ts` | `reorderPricesInGroup(groupId, changes)` |
| Новый компонент | `src/features/prices/ui/PriceGroup/PriceGroupReorderModal.tsx` | DnD Modal |
| Экспорт | `src/features/prices/ui/PriceGroup/index.ts` | Добавить `PriceGroupReorderModal` |
| Изменение | `src/features/prices/ui/PriceGroup/PricesGroupsTable.tsx` | Колонка "Действия" с кнопкой |
| Зависимости | `package.json` | `@dnd-kit/core`, `@dnd-kit/sortable` |

#### DnD — установка

```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

#### Новые типы

В `src/types/api/priceGroups.ts`:

```typescript
export type PriceGroupReorderItemInDto = {
    id: UUID;
    order: number;
};

export type PriceGroupReorderInDto = {
    changes: PriceGroupReorderItemInDto[];
};
```

#### Новый Action в usePriceScopes

```typescript
export enum PRICE_PAGE_SCOPES_ACTIONS {
    // ... existing ...
    PRICE_GROUP_REORDER = "price_group_reorder",
}

// В pricePageScopesRegistry:
[PRICE_PAGE_SCOPES_ACTIONS.PRICE_GROUP_REORDER]: [
    KNOWN_USER_SCOPES.ADMIN,
    KNOWN_USER_SCOPES.DEVELOPER,
],
```

#### Компонент PriceGroupReorderModal

`src/features/prices/ui/PriceGroup/PriceGroupReorderModal.tsx`:
- `Modal` (структура как `PriceTableModal`) — footer с "Закрыть" и "Сохранить"
- DnD список через `@dnd-kit/sortable` с `DndContext` + `SortableContext`
- Каждый item: `<span>{price.name}</span>` (как "Наименование" в `PricesTable`) + drag-handle иконка (`OrderedListOutlined` или `DragIndicator`)
- Props: `open`, `onClose`, `onSave(changes)`, `loading`, `prices: PriceOutDto[]`
- State: `localPrices` (копия для DnD), инициализируется при открытии

Алгоритм вычисления изменений (только diff, не весь список):

```typescript
const changes = localPrices
    .map((price, index) => ({ id: price.id, order: index + 1 }))
    .filter((item, index) => prices[index]?.id !== item.id);
```

#### Колонка "Действия" в PricesGroupsTable

```typescript
{
    title: 'Действия',
    key: 'actions',
    render: (_: unknown, record: PriceGroupOutDto) =>
        hasPermission(PRICE_PAGE_SCOPES_ACTIONS.PRICE_GROUP_REORDER) ? (
            <Button
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenReorderModal(record.id as UUID);
                }}>
                <OrderedListOutlined />
            </Button>
        ) : null,
},
```

Иконка `OrderedListOutlined` — из `@ant-design/icons`, наилучшим образом отражает смысл "задать порядок элементов списка".

---

## Порядок выполнения

1. **Backend:** модель → миграция → entity → schema → protocol → repository → service → router → тесты
2. **Frontend:** пакеты → типы → API → сервис → scopes → хук → компонент → таблица
3. **Quality Gate:** lint, mypy, unit tests, smoke tests, frontend build

---

## PostgreSQL для smoke-тестов

Контейнер найден командой:
```bash
docker ps --filter "label=com.docker.compose.project=eqsitecms" --filter "label=com.docker.compose.service=db"
```

Параметры из `docker inspect eqsitecms-db`:
- **Container:** `eqsitecms-db` (`478aa22ca9d6`)
- **Image:** `postgres:17`
- **POSTGRES_DB:** `eqsitecms`
- **POSTGRES_USER:** `eqsitecms`
- **POSTGRES_PASSWORD:** `eqsitecms`
- **Host port:** `5433` (mapped from container `5432/tcp`)
- **Network alias:** `db`

Перед запуском smoke-тестов всегда верифицировать параметры через свежий `docker inspect eqsitecms-db`.

---

## Чеклист

> Этот раздел используется агентами для отслеживания прогресса. Агент обязан менять `[ ]` → `[x]` после выполнения каждого пункта.

### Backend

- [ ] Изменить `services/backend/src/models/prices.py`: добавить `Column("display_order", Integer, nullable=True)` и partial unique index `(group_id, display_order) WHERE display_order IS NOT NULL` в таблицу `price_groups_relations`
- [ ] Создать миграцию `services/backend/src/migration/versions/<rev>_add_display_order_to_price_groups_relations.py` с `down_revision = "9f0f2c5c7b11"`: добавить колонку, создать index, backfill существующих строк через двухфазный UPDATE
- [ ] Добавить `display_order: int | None = None` в Entity `PriceGroupsRelation` (`services/backend/src/core/entities/prices.py`)
- [ ] Добавить `PriceGroupReorderItemDto` и `PriceGroupReorderDto` в `services/backend/src/core/schemas/prices.py`
- [ ] Расширить `PriceRepositoryProtocol` (`services/backend/src/core/protocols/repositories/price_repository.py`): методы `get_group_relations_ordered`, `set_display_orders`, `append_price_to_group_ordered`, `remove_price_from_group_reindex`
- [ ] Реализовать новые методы в `PriceRepository` (`services/backend/src/repositories/price_repository.py`): `get_group_relations_ordered` (ORDER BY display_order NULLS LAST), `set_display_orders` (двухфазное: сброс в null → финальные значения), `append_price_to_group_ordered` (MAX+1), `remove_price_from_group_reindex` (удаление + перенумерация)
- [ ] Обновить `PriceRepository.set_price_groups`: при добавлении новой связи назначать `display_order = MAX + 1`; при удалении связи — перенумеровать оставшиеся
- [ ] Обновить `PriceRepository.get_filtered`: при активном `groups` фильтре и отсутствующем `sort` — применять сортировку по `display_order ASC NULLS LAST` через явный JOIN с `price_groups_relations`; при отсутствии и `groups` и `sort` — fallback `created_at DESC`
- [ ] Добавить `_ADMIN_SCOPE_NAMES` и `_check_admin_permission` в `PriceGroupService` по паттерну `HorseService`
- [ ] Добавить метод `reorder_prices_in_group` в `PriceGroupService` (`services/backend/src/core/services/prices.py`): проверка прав, алгоритм смещения, вызов `set_display_orders`
- [ ] В `PriceService.delete`: перед удалением собрать список групп цены, после удаления перенумеровать оставшиеся в каждой группе
- [ ] Добавить эндпоинт `POST /prices/groups/{id}/reorder` в `services/backend/src/api/prices.py`: принимает `PriceGroupReorderDto`, вызывает `price_group_service.reorder_prices_in_group`, возвращает 204
- [ ] Заполнить Access matrix для нового endpoint: метод, путь, класс доступа, роли, expected без auth, expected с auth
- [ ] Найти PostgreSQL контейнер: `docker ps --filter "label=com.docker.compose.project=eqsitecms" --filter "label=com.docker.compose.service=db"`, получить параметры через `docker inspect eqsitecms-db`
- [ ] Unit: reorder — элемент перемещается вперёд, остальные сдвигаются на -1
- [ ] Unit: reorder — элемент перемещается назад, остальные сдвигаются на +1
- [ ] Unit: reorder — элемент уже на нужной позиции — shifts не происходят
- [ ] Unit: reorder — перемещение на позицию 1
- [ ] Unit: reorder — перемещение на позицию N
- [ ] Unit: reorder — два последовательных изменения применяются корректно
- [ ] Unit: reorder — order > N клипируется до N
- [ ] Unit: reorder — order < 1 клипируется до 1
- [ ] Unit: reorder — пустой список changes → ClientError
- [ ] Unit: reorder — UUID не принадлежит группе → ClientError
- [ ] Unit: reorder — группа не найдена → ClientError
- [ ] Unit: reorder — после reorder все позиции в диапазоне 1..N
- [ ] Unit: reorder — нет дублирующихся позиций после reorder
- [ ] Unit: role check — SUPERUSER разрешён
- [ ] Unit: role check — ADMIN разрешён
- [ ] Unit: role check — DEVELOPER разрешён
- [ ] Unit: role check — пользователь без роли → ClientError
- [ ] Unit: role check — user=None → ClientError
- [ ] Unit: новая цена в группе → display_order = MAX+1
- [ ] Unit: первая цена в группе → display_order = 1
- [ ] Unit: удаление цены из группы → оставшиеся перенумерованы 1..N
- [ ] Unit: удаление первого элемента → 2→1, 3→2
- [ ] Unit: удаление последнего элемента → остальные не меняются
- [ ] Unit: set_display_orders вызывается с ожидаемым order_map
- [ ] Unit: если display_order NULL (legacy данные) — reorder инициализирует перед применением
- [ ] Unit: set_price_groups при создании связей назначает display_order
- [ ] Unit: reorder идемпотентен — тот же порядок → нет изменений
- [ ] Unit: обмен двух соседних элементов
- [ ] Unit: средний элемент → начало списка
- [ ] Unit: список из 10 элементов, граничные значения (1 и 10)
- [ ] Smoke: колонка `display_order` существует в `price_groups_relations` на реальной PostgreSQL
- [ ] Smoke: индекс `uix_price_groups_relations_group_order` существует
- [ ] Smoke: POST /prices с groups → первая цена в группе получает display_order = 1
- [ ] Smoke: вторая цена в группе → display_order = 2
- [ ] Smoke: POST /prices/groups/{id}/reorder без auth → 401
- [ ] Smoke: POST /prices/groups/{id}/reorder с auth без роли → 400
- [ ] Smoke: POST /prices/groups/{id}/reorder с ADMIN auth → 204
- [ ] Smoke: POST /prices/groups/{id}/reorder с DEVELOPER auth → 204
- [ ] Smoke: reorder перемещает элемент вперёд — остальные сдвигаются
- [ ] Smoke: reorder перемещает элемент назад
- [ ] Smoke: reorder с пустым changes → 400
- [ ] Smoke: reorder с UUID не из группы → 400
- [ ] Smoke: reorder с несуществующей группой → 400
- [ ] Smoke: order > N клипируется без ошибки
- [ ] Smoke: order < 1 клипируется без ошибки
- [ ] Smoke: нет UniqueViolation при двухфазном обновлении
- [ ] Smoke: GET /prices?groups=X без sort → порядок соответствует display_order
- [ ] Smoke: GET /prices без groups и sort → сортировка по created_at DESC
- [ ] Smoke: DELETE /prices/{id} → оставшиеся в группе перенумерованы
- [ ] Smoke: PATCH /prices/{id} с удалением группы → перенумерация в группе
- [ ] Smoke: PATCH /prices/{id} с добавлением группы → последнее место в группе
- [ ] Smoke: ответ GET /prices не содержит поля display_order
- [ ] Smoke: ответ GET /prices/groups не содержит display_order
- [ ] Smoke: reorder с тем же порядком идемпотентен — 204 оба раза
- [ ] Smoke: два последовательных reorder без задержки — нет 500
- [ ] Smoke: строка с NULL display_order (legacy) обрабатывается корректно
- [ ] Smoke: пустая группа (без услуг) — reorder возвращает 400
- [ ] Smoke: цена в 2 группах → в каждой группе отдельный display_order
- [ ] Smoke: после reorder повторный GET /prices?groups=X подтверждает новый порядок
- [ ] Обновить `agents/backend.md`: добавить раздел правил display_order (7 правил + двухфазное обновление)

### Frontend

- [ ] Установить `@dnd-kit/core` и `@dnd-kit/sortable` (`npm install @dnd-kit/core @dnd-kit/sortable` в `services/frontend`)
- [ ] Добавить типы `PriceGroupReorderItemInDto`, `PriceGroupReorderInDto` в `services/frontend/src/types/api/priceGroups.ts`
- [ ] Добавить функцию `priceGroupReorder(groupId, payload)` в `services/frontend/src/api/priceGroups.ts`
- [ ] Добавить функцию `fetchReorderPricesInGroup` в `services/frontend/src/features/prices/services/priceGroupService.ts`
- [ ] Добавить `PRICE_GROUP_REORDER` в `PRICE_PAGE_SCOPES_ACTIONS` enum и `pricePageScopesRegistry` в `usePriceScopes.ts` для `[KNOWN_USER_SCOPES.ADMIN, KNOWN_USER_SCOPES.DEVELOPER]`
- [ ] Добавить `reorderPricesInGroup` callback в `usePrices` (`services/frontend/src/features/prices/hooks/usePrices.ts`)
- [ ] Создать `PriceGroupReorderModal` в `services/frontend/src/features/prices/ui/PriceGroup/PriceGroupReorderModal.tsx`: Modal + DnD список (@dnd-kit/sortable) + footer Close/Save; items отображают `<span>{price.name}</span>` с drag-handle иконкой; вычисляет только diff изменений при сохранении
- [ ] Экспортировать `PriceGroupReorderModal` из `services/frontend/src/features/prices/ui/PriceGroup/index.ts`
- [ ] Добавить колонку "Действия" с кнопкой `OrderedListOutlined` в `PricesGroupsTable`; кнопка видна только при `hasPermission(PRICE_GROUP_REORDER)`; добавить prop `onOpenReorderModal` в `PricesGroupsTableProps`
- [ ] Подключить `PriceGroupReorderModal` на странице `services/frontend/src/app/(protected)/prices/page.tsx`: состояние `priceGroupReorderModalOpen` + `selectedGroupForReorder`, загрузка услуг группы при открытии, вызов `reorderPricesInGroup` при сохранении

### Quality Gate

- [ ] `PYTHONPATH=src uv run pytest -s -vv tests/unit` из `services/backend` — все тесты зелёные
- [ ] Запустить smoke-тесты: `docker inspect eqsitecms-db`, затем передать параметры в env и запустить `uv run pytest tests/smoke`
- [ ] `uv run mypy src` — чистый, нет новых ошибок
- [ ] `uv run isort src && uv run black src` — форматирование применено
- [ ] Убедиться что `display_order` отсутствует в `PriceGroupOutDto` / `PriceOutDto` (не утекает в ответ)
- [ ] Проверить `POST /prices/groups/{id}/reorder` без авторизации → 401
- [ ] Проверить `POST /prices/groups/{id}/reorder` с auth без роли → 400
- [ ] Проверить `GET /prices?groups=<name>` без `sort` → порядок соответствует display_order
- [ ] Убедиться что каждая backend-фича имеет минимум 30 Unit checklist-пунктов с разными сценариями
- [ ] Убедиться что каждая backend-фича имеет минимум 30 Smoke checklist-пунктов на реальной PostgreSQL
- [ ] `npm run build` в `services/frontend` — нет ошибок TypeScript
- [ ] Убедиться что при создании новой услуги с группой она встаёт на последнее место
- [ ] Убедиться что при удалении услуги из группы оставшиеся перенумеровываются
