# План: Обогащение DTO `pedigree.foals` — добавление поля `parents`

**Дата:** 2026-05-23
**Ветка:** `feature/horse-management-pedigree-enrich`
**Затронутые сервисы:** `services/backend`, `services/site-ad`
**Frontend CMS:** изменений нет
**Миграций БД:** не требуется

---

## Контекст

Эндпоинты `GET /api/horses` и `GET /api/horses/{slug}` при передаче параметра `pedigree > 0` возвращают поле `pedigree.foals` — список жеребят как `HorseOutDto`. Потребителю (`services/site-ad`) необходимо знать первое поколение производителей каждого жеребёнка: только `id` и `name` отца и матери. Сейчас эта информация недоступна без дополнительных запросов. Изменений в БД не требуется: таблица `horse_children(horse_id=parent, child_id=child)` уже содержит все нужные связи.

## Цель

После реализации каждый объект в `pedigree.foals` содержит поле `parents`:

```json
{
  "pedigree": {
    "sire": { "...": "..." },
    "dam": { "...": "..." },
    "foals": [
      {
        "id": "...",
        "name": "...",
        "parents": {
          "sire": { "id": "...", "name": "..." },
          "dam": null
        }
      }
    ]
  }
}
```

`parents.sire` и `parents.dam` — `null`, если производитель неизвестен.

---

## Access policy

Изменений нет. GET-эндпоинты остаются **Public Read** без авторизации. POST-эндпоинты не затронуты.

---

## Backend

### Файл 1: `services/backend/src/core/schemas/horses.py`

**Шаг 1.1 — новые DTO `FoalParentRefDto`, `FoalParentsDto`, `HorseFoalOutDto`**

Добавить после класса `HorseOutDto` (после строки 111, перед `HorsePedigree`):

```python
class FoalParentRefDto(BaseSchema):
    """Минимальный DTO производителя жеребёнка: только id и name."""

    id: UUID = Field(..., description="Идентификатор лошади")
    name: str = Field(..., description="Кличка лошади")


class FoalParentsDto(BaseSchema):
    """Первое поколение производителей жеребёнка."""

    sire: FoalParentRefDto | None = Field(default=None, description="Отец")
    dam: FoalParentRefDto | None = Field(default=None, description="Мать")


class HorseFoalOutDto(HorseOutDto):
    """DTO жеребёнка с первым поколением производителей."""

    parents: FoalParentsDto = Field(
        default_factory=FoalParentsDto,
        description="Первое поколение производителей жеребёнка",
    )
```

**Шаг 1.2 — изменить `HorsePedigree.foals`**

Строку 124: `foals: list[HorseOutDto]` → `foals: list[HorseFoalOutDto]`:

```python
class HorsePedigree(BaseSchema):
    sire: "HorseWithPedigreeOutDto | HorseOutDto | None" = Field(...)
    dam: "HorseWithPedigreeOutDto | HorseOutDto | None" = Field(...)
    foals: list[HorseFoalOutDto] = Field(
        default_factory=list, description="Потомки лошади с их производителями"
    )
```

`HorsePedigree.model_rebuild()` (строка 133) остаётся без изменений.

---

### Файл 2: `services/backend/src/core/schemas/__init__.py`

Добавить в импорт и `__all__`:

```python
from .horses import (
    ...,
    FoalParentRefDto,
    FoalParentsDto,
    HorseFoalOutDto,
)
```

---

### Файл 3: `services/backend/src/repositories/horse_repository.py`

Все изменения — внутри ветки `if pedigree and pedigree > 0:` метода `get_horse_list_full_info` (строки 592–725).

**Шаг 3.1 — добавить импорты в заголовке файла**

В существующий блок импорта из `core.schemas` добавить:

```python
FoalParentRefDto,
FoalParentsDto,
HorseFoalOutDto,
```

**Шаг 3.2 — запрос производителей жеребят**

После цикла формирования `foals_by_horse` (после строки 637), вставить перед `pedigree_ids = ...`:

```python
# Собираем всех жеребят для поиска их производителей
all_foal_ids: set[UUID] = {
    foal_id
    for foal_list in foals_by_horse.values()
    for foal_id in foal_list
}

foal_sire_by_foal: dict[UUID, UUID] = {}
foal_dam_by_foal: dict[UUID, UUID] = {}

if all_foal_ids:
    foal_parents_stmt = (
        select(
            horse_children.c.child_id,
            horse_children.c.horse_id,
            horse.c.sex,
        )
        .join(horse, horse_children.c.horse_id == horse.c.id)
        .where(
            horse_children.c.child_id.in_(all_foal_ids),
            horse.c.equestrian_id == equestrian_id,
        )
    )
    foal_parents_result = await self.session.execute(foal_parents_stmt)
    for row in foal_parents_result.mappings().all():
        child_id = UUID(str(row["child_id"]))
        parent_id = UUID(str(row["horse_id"]))
        sex = row["sex"]
        if sex in (HorseSexEnum.MALE.value, HorseSexEnum.GELD.value):
            foal_sire_by_foal[child_id] = parent_id
        elif sex == HorseSexEnum.FEMALE.value:
            foal_dam_by_foal[child_id] = parent_id
```

**Шаг 3.3 — расширить `pedigree_ids`** (строка 639)

```python
pedigree_ids: set[UUID] = (
    set(horse_ids)
    | set(sire_by_horse.values())
    | set(dam_by_horse.values())
    | {f for fs in foals_by_horse.values() for f in fs}
    | set(foal_sire_by_foal.values())
    | set(foal_dam_by_foal.values())
)
```

**Шаг 3.4 — вспомогательная функция**

Добавить после инициализации `all_dtos` (после строки 659):

```python
def make_foal_parent_ref(parent_id: UUID | None) -> FoalParentRefDto | None:
    if parent_id is None:
        return None
    dto = all_dtos.get(parent_id)
    if dto is None:
        return None
    return FoalParentRefDto(id=dto.id, name=dto.name)
```

**Шаг 3.5 — изменить построение `foals_dtos` в `build_pedigree_dto`** (строки 682–685)

```python
foals_dtos = (
    [
        HorseFoalOutDto(
            **all_dtos[f].model_dump(),
            parents=FoalParentsDto(
                sire=make_foal_parent_ref(foal_sire_by_foal.get(f)),
                dam=make_foal_parent_ref(foal_dam_by_foal.get(f)),
            ),
        )
        for f in foals_by_horse.get(h_id, [])
        if f in all_dtos
    ]
    if h_id in top_level_ids
    else []
)
```

**Шаг 3.6 — fallback-ветка `elif built is not None`** (строки 702–713)

Аналогично шагу 3.5 заменить `all_dtos[f]` на `HorseFoalOutDto(..., parents=...)`.

Ветка `else` (строки 717–723) — пустой `foals=[]`, изменений не требует.

---

## site-ad (TypeScript)

### Файл: `services/site-ad/src/types/horse.ts`

**Шаг 4.1 — новые типы** (добавить перед `HorsePedigreeOutDto`):

```typescript
export type FoalParentRefDto = {
  id: UUID    // UUID производителя
  name: string // кличка производителя
}

export type FoalParentsDto = {
  sire: FoalParentRefDto | null // отец жеребёнка
  dam: FoalParentRefDto | null  // мать жеребёнка
}

export type HorseFoalOutDto = HorseOutDto & {
  parents: FoalParentsDto // первое поколение производителей
}
```

**Шаг 4.2 — изменить `HorsePedigreeOutDto`** (строка 43)

```typescript
export type HorsePedigreeOutDto = {
  sire: HorseOutDto | null
  dam: HorseOutDto | null
  foals: HorseFoalOutDto[]   // было: HorseOutDto[]
}
```

Изменение обратно совместимо: `HorseFoalOutDto` расширяет `HorseOutDto`.

---

## Тесты

### `services/backend/tests/unit/core/services/test_horse_service.py`

**Что обновить:**

1. `FakeHorseRepository`: в методе, возвращающем `foals`, заменить `HorseOutDto` → `HorseFoalOutDto(parents=FoalParentsDto())`.

2. Тест `test_horse_kind_to_breed_pedigree_nested_dtos_do_not_expose_kind`: заменить конструирование foals:

```python
from core.schemas.horses import FoalParentsDto, HorseFoalOutDto

foals=[
    HorseFoalOutDto(
        **make_horse_out_dto(name="Foal").model_dump(),
        parents=FoalParentsDto(sire=None, dam=None),
    )
]
```

Добавить проверку: `assert "parents" in dumped["pedigree"]["foals"][0]`

---

## Порядок выполнения

1. Backend — схемы (`horses.py`, `__init__.py`)
2. Backend — репозиторий (`horse_repository.py`)
3. Backend — тесты (`test_horse_service.py`)
4. site-ad — типы (`horse.ts`)
5. Верификация: `pytest tests/unit/` + `npx tsc --noEmit`

---

## Чеклист реализации

### Backend — схемы

- [ ] Добавить `FoalParentRefDto` с полями `id: UUID` и `name: str`
- [ ] Добавить `FoalParentsDto` с полями `sire: FoalParentRefDto | None` и `dam: FoalParentRefDto | None`
- [ ] Добавить `HorseFoalOutDto(HorseOutDto)` с полем `parents: FoalParentsDto`
- [ ] Изменить `HorsePedigree.foals: list[HorseFoalOutDto]`
- [ ] Добавить экспорт `FoalParentRefDto`, `FoalParentsDto`, `HorseFoalOutDto` в `__init__.py`

### Backend — репозиторий

- [ ] Добавить импорты новых DTO
- [ ] Добавить сбор `all_foal_ids` из `foals_by_horse`
- [ ] Добавить SQL-запрос `foal_parents_stmt` (только при непустом `all_foal_ids`)
- [ ] Построить `foal_sire_by_foal` и `foal_dam_by_foal`
- [ ] Расширить `pedigree_ids` значениями из `foal_sire_by_foal` и `foal_dam_by_foal`
- [ ] Добавить локальную функцию `make_foal_parent_ref`
- [ ] Заменить `all_dtos[f]` на `HorseFoalOutDto` с `parents` в `build_pedigree_dto`
- [ ] Применить то же изменение в fallback-ветке `elif built is not None`

### Backend — тесты

- [ ] Обновить `FakeHorseRepository`: foals → `list[HorseFoalOutDto]`
- [ ] Обновить тест `test_horse_kind_to_breed_pedigree_nested_dtos_do_not_expose_kind`
- [ ] Добавить проверку `assert "parents" in dumped["pedigree"]["foals"][0]`
- [ ] `pytest tests/unit/` — все тесты проходят

### site-ad

- [ ] Добавить `FoalParentRefDto`
- [ ] Добавить `FoalParentsDto`
- [ ] Добавить `HorseFoalOutDto = HorseOutDto & { parents: FoalParentsDto }`
- [ ] Изменить `HorsePedigreeOutDto.foals: HorseFoalOutDto[]`
- [ ] `npx tsc --noEmit` — ошибок нет

### Quality Gate

- [ ] `services/frontend` (CMS) не изменён
- [ ] Миграций не создано
- [ ] Access policy не изменена (GET Public Read)
- [ ] Новый SQL-запрос не выполняется при `pedigree=0` или пустом `all_foal_ids`
- [ ] Нет рекурсии: `HorseFoalOutDto` не ссылается на `HorsePedigree`
