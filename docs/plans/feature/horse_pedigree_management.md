# План: Управление родословной лошади

**Тикет:** horse_pedigree_management
**Дата:** 2026-05-16
**Затронутые сервисы:** services/backend, services/frontend; services/site-ad только self-check без изменений
**Ветка:** feature/horse-pedigree-management

---

## Контекст

В `docs/plans/feature/horses_management.md` уже реализован раздел CMS «Лошади» и `HorsePedigreeModal` как заглушка. Backend уже содержит:

- `POST /api/horses/{horse_id}/pedigree` в `services/backend/src/api/horses.py`;
- `GET /api/horses/{horse_id}/pedigree/{mode}` в `services/backend/src/api/horses.py`;
- use cases `HorseService.get_available_pedigree()` и `HorseService.set_horse_pedigree()`;
- `SetPedigreeEntities` в `services/backend/src/core/schemas/horses.py`;
- repository helpers `get_available_sires/dams/children()` и `HorseChildrenRepository`.

Текущее поведение близко к нужному, но требует выравнивания с задачей `docs/tasks/horse_pedigree_management.md`:

- выбор отца/матери должен требовать `bdate < currentHorse.bdate`, а сейчас равная дата проходит через `bdate_lte_or_none` и service check `>`, не `>=`;
- выбор потомка должен требовать `bdate > currentHorse.bdate`, а сейчас равная дата проходит через `bdate_gte_or_none` и service check `<`, не `<=`;
- GET кандидатов должен исключать уже выбранного второго родителя и существующих потомков, но сейчас repository helper исключает только `currentHorse.id` и часть «уже есть родитель того же пола»;
- POST validation должен проверять тот же набор правил, что и GET, включая `sire != dam`, `sire/dam not in foals`, `foals not current`, `foals not existing foals` для добавления/замены;
- явное удаление связи через `sire_id: null`/`dam_id: null` сейчас неотличимо от отсутствующего поля без учета `HorseSetPedigreeInDto.model_fields_set`;
- CMS frontend должен заменить заглушку модальным окном управления ближайшей родословной и вторичным модальным окном выбора существующей лошади.

`services/site-ad` уже читает public `GET /api/horses` и `GET /api/horses/{slug}` с `pedigree` для публичного дерева. Новые CMS write-сценарии ему не нужны.

## Цель

1. Backend: привести `GET /api/horses/{horse_id}/pedigree/{mode}` и `POST /api/horses/{horse_id}/pedigree` к единому validation contract из задачи.
2. Backend: сохранить `GET` как Public Read, `POST` как Protected Write с текущей role policy `SUPERUSER | ADMIN | DEVELOPER`.
3. Frontend CMS: заменить `HorsePedigreeModal` на полноценное модальное окно просмотра/редактирования ближайшей родословной, добавить вторичное окно выбора кандидата и API boundary для pedigree.
4. Frontend CMS: все изменения связи применяются сразу, без общей кнопки «Сохранить» в основном модальном окне.
5. Consumer: не менять `services/site-ad`; только подтвердить, что public read-контракт не сломан.

---

## Детали реализации

### Backend

#### Изменяемые файлы

| Что | Путь | Описание |
|---|---|---|
| API router | `services/backend/src/api/horses.py` | Оставить `GET` без auth, `POST` с `get_current_user` + protected equestrian context; проверить OpenAPI enum `sire/dam/children` |
| Service | `services/backend/src/core/services/horse.py` | Вынести единый validation helper для available/set; учитывать explicit null через `model_fields_set`; нормализовать payload для clear/replace |
| Schemas | `services/backend/src/core/schemas/horses.py` | Уточнить `HorseSetPedigreeInDto`; доработать `SetPedigreeEntities` или перенести часть правил в service helper, чтобы GET и POST не расходились |
| Repository protocol | `services/backend/src/core/protocols/repositories/horse_repository.py` | При необходимости расширить методы available фильтрами `exclude_ids`, strict date flags без привязки к SQLAlchemy |
| Repository | `services/backend/src/repositories/horse_repository.py` | Сделать candidate filters strict: parent `< target.bdate`, child `> target.bdate`; исключать current sire/dam/foals |
| Unit tests | `services/backend/tests/unit/core/services/test_horse_service.py` | Добавить/обновить unit coverage по 30 сценариям ниже |
| Route tests | `services/backend/tests/unit/api/test_route_order.py` | Сохранить route order и enum contract |

#### API контракт

```http
GET /api/horses/{horse_id}/pedigree/{mode}?search=<text>&limit=25&offset=0

mode: sire | dam | children
Response 200: {
  "total": 1,
  "items": [HorseOutDto]
}
```

GET возвращает только кандидатов, подходящих под те же правила, которые затем проверит POST.

```http
POST /api/horses/{horse_id}/pedigree
Authorization: Cookie/session
Body examples:
{ "sire_id": "<uuid>" }
{ "dam_id": "<uuid>" }
{ "foals": ["<uuid>", "<uuid>"] }
{ "sire_id": null }
{ "dam_id": null }
{ "foals": [] }

Response 204: empty
```

Contract для clear:

- поле отсутствует -> соответствующая связь не меняется;
- `sire_id: null` -> удалить отца;
- `dam_id: null` -> удалить мать;
- `foals: []` -> удалить все связи потомства текущей лошади;
- `foals: [ids...]` -> заменить список потомства на переданный список после validation.

#### Единые правила validation

| Mode | Candidate rules |
|---|---|
| `sire` | `sex == male`; `id != currentHorse.id`; `id != current pedigree.dam.id`; `id not in current pedigree.foals[].id`; `bdate < currentHorse.bdate`, если обе даты известны; `kind == currentHorse.kind` |
| `dam` | `sex == female`; `id != currentHorse.id`; `id != current pedigree.sire.id`; `id not in current pedigree.foals[].id`; `bdate < currentHorse.bdate`, если обе даты известны; `kind == currentHorse.kind`; если `ddate` известна, она не раньше `currentHorse.bdate` |
| `children` | `id != currentHorse.id`; `id != current pedigree.sire.id`; `id != current pedigree.dam.id`; `id not in current pedigree.foals[].id` для добавления нового потомка; `bdate > currentHorse.bdate`, если обе даты известны; `kind == currentHorse.kind`; для female target `child.bdate <= target.ddate`, если обе даты известны |

Для POST при полной замене `foals` разрешить ids уже существующих потомков, если они остаются в списке, но запретить дубликаты и пересечение с `sire_id`/`dam_id`.

#### Access matrix

| Method | Path | Access class | Roles | Expected without auth | Expected with auth |
|---|---|---|---|---|---|
| GET | `/api/horses/{horse_id}/pedigree/{mode}` | Public Read | none | `200 OK` для existing horse; `400` для not found/invalid business case; `422` для invalid UUID/mode | `200 OK`, auth не требуется |
| POST | `/api/horses/{horse_id}/pedigree` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | текущий module contract: `400 ClientError` через `_check_admin_permission` или `401/403`, если auth dependency будет приведена к global policy | `204 No Content` при валидных правах; `400` для validation/not found; `422` для structural body errors |

Исключений из дефолтной policy нет: `GET` остается Public Read, `POST` остается Protected Write. Примечание для Quality Gate: в текущем `HorseService` write-denial historically мапится в `ClientError`/HTTP `400`; если Backend Agent меняет это на `401/403`, он должен синхронно обновить tests и docs.

#### Схема БД

Миграции не нужны. Используется существующая таблица `horse_children`.

Рекомендация Backend Agent: проверить наличие уникального ограничения на пару `(horse_id, child_id)`. Если его нет, не добавлять миграцию в рамках этой задачи без согласования, но покрыть duplicate validation на service level.

### Frontend

#### Новые и изменяемые файлы

| Что | Путь | Описание |
|---|---|---|
| DTO/API types | `services/frontend/src/types/api/horses.ts` | Расширить `HorsePedigreeDto` до полного `HorseOutDto`-подобного shape для sire/dam/foals; добавить `HorsePedigreeMode`, `HorseSetPedigreeInDto` |
| API boundary | `services/frontend/src/api/horses.ts` | Добавить `horseAvailablePedigree()` и `horseSetPedigree()` |
| Feature service | `services/frontend/src/features/horses/services/horseService.ts` | Добавить `fetchAvailablePedigree()` и `fetchSetHorsePedigree()` |
| Feature hook | `services/frontend/src/features/horses/hooks/useHorsePedigree.ts` | State основного modal, candidate search, pagination/lazy load, mutations, detail reload after mutation, background table invalidation |
| Scope registry | `services/frontend/src/features/horses/hooks/useHorseScopes.ts` | Добавить action `UPDATE_HORSE_PEDIGREE` с теми же scopes, что `UPDATE_HORSE` |
| Main modal | `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` | Заменить заглушку основным modal: шапка, родители, текущая лошадь, потомство, menus |
| Candidate modal | `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` | Вторичное окно выбора кандидата поверх основного modal |
| Card helper | `services/frontend/src/features/horses/ui/Horses/HorsePedigreeCard.tsx` | Переиспользуемая карточка лошади для parent/current/foal/result rows |
| Page integration | `services/frontend/src/app/(protected)/horses/page.tsx` | Сохранять `selectedHorse` при клике pedigree, передавать в modal, обновлять list/indicators после mutation без browser refresh |
| Tests | `services/frontend/src/features/horses/**` | Обновить тесты заглушки и добавить component/hook/API-boundary tests |

#### UX/UI: основное модальное окно управления родословной

Назначение: просмотр и редактирование ближайшей родословной выбранной лошади. Окно показывает только один уровень родителей (`sire`, `dam`) и один уровень потомков (`foals`); полное дерево поколений здесь не отображается.

Layout сверху вниз:

```text
[ Header: Родословная — {name} {sex icon}                         X ]

[ Родители ]
          Отец                             Выбранная                            Мать
  [ sire card / empty slot ]  ----  [ selected horse card ]  ----  [ dam card / empty slot ]

[ Потомство                                           + Добавить потомка ]
  [ foal card ] [ foal card ] [ foal card ]
  или centered empty state

[ Footer                                                        Закрыть ]
```

Основные зоны:

- Header: title `Родословная — {name} ({sex marker})`, кнопка закрытия справа. Для `male` marker — мужской знак, для `female` — женский знак, для `geld` — мужской знак + буква `м`; если пол неизвестен, скобки с marker не показывать.
- Parents section: заголовок `Родители`, три карточки в одну линию на desktop.
- Foals section: заголовок `Потомство`, справа единственная кнопка `+ Добавить потомка`.
- Footer: только кнопка `Закрыть`; общей кнопки `Сохранить` нет.

#### UX/UI: mapping данных

Основной объект для modal: выбранный `HorseWithPedigreeOutDto` из таблицы лошадей или обновленный DTO после reload.

| UI zone | Источник |
|---|---|
| Current horse card | `id`, `slug`, `name`, `sex`, `kind`, `bdate`, `bdate_formatted`, `bdate_mode`, `coat_color`, `breed`, `photos` |
| Sire card | `pedigree.sire` |
| Dam card | `pedigree.dam` |
| Foal cards | `pedigree.foals[]` |
| Candidate picker rows | response `items[]` из `GET /api/horses/{horse_id}/pedigree/{mode}` |

Card display rules:

- Name: `horse.name`.
- Sex icon/marker: `male` -> male icon, `female` -> female icon, `geld` -> male icon + `м`; unknown/missing -> no icon. В заголовке modal marker всегда в круглых скобках: `Родословная — {name} (♂м)` для мерина.
- Sex text: `male` -> `Жеребец`, `female` -> `Кобыла`, `geld` -> `Мерин`.
- Birth date: prefer `bdate_formatted`; fallback by `bdate_mode`: `y` -> year, `ym` -> month + year, `ymd` -> full date, `hide` -> omit date.
- Coat color: `coat_color.short_name ?? coat_color.name`; absent -> dash.
- Breed: `breed.short_name ?? breed.name`; absent -> dash. Breed is mandatory in picker rows and optional in compact relation cards if space is limited.
- Photo: use `photos.find(photo.is_main && photo.url)`, else first `photos[]` with `url`, else a stable placeholder. Missing `photos`, empty array, or photos without `url` must not change card structure.

#### UX/UI: карточки родителей и выбранной лошади

Selected horse card:

- Located in the center of parent row.
- Label above card: `Выбранная`.
- Label `Выбранная` is centered relative to selected horse card; labels `Отец` and `Мать` are also centered relative to their cards.
- Shows photo/placeholder, name, sex icon, sex + birth date, coat color.
- Has a slightly thicker border than sire/dam/foal cards, to visually emphasize the selected horse.
- Has no menu and no mutation controls.

Sire card:

- Label above card: `Отец`.
- Filled state shows `pedigree.sire` card data and action menu.
- Missing state when `pedigree.sire == null`: slot card with text `Не указан` and placeholder visual.
- Missing sire menu contains only `Заменить связь` / add-sire scenario; no `Удалить связь`, no `Перейти`.

Dam card:

- Label above card: `Мать`.
- Filled state shows `pedigree.dam` card data and action menu.
- Missing state when `pedigree.dam == null`: slot card with text `Не указана` and placeholder visual.
- Missing dam menu contains only `Заменить связь` / add-dam scenario; no `Удалить связь`, no `Перейти`.

Connection lines:

- Show visual connection `Отец -- Выбранная -- Мать`.
- Lines stay visible even when sire/dam slot is empty, so the user understands where the parent slot belongs.
- Lines must not overlap text or controls at desktop or mobile widths.

#### UX/UI: потомство

Foals section:

- Header left: `Потомство`.
- Header right: `+ Добавить потомка`.
- Do not render an extra "add foal" card inside the list.
- Foals are relation data, not a manually sortable editable list.

Foal card:

- Shows photo/placeholder, name, sex icon, sex + birth date, coat color.
- Shows second parent label if derivable from current horse sex/current relation: for child of current sire show mother if known; for child of current dam show father if known. If second parent is not available in DTO, show `Второй родитель: —` or omit the row by local design choice, but keep card height stable.
- Has action menu.

Foals empty state:

```text
Потомство отсутствует
У этой лошади пока нет зарегистрированных потомков.
```

Empty state is centered inside the foals block. The block remains visible; the `+ Добавить потомка` button remains in the section header.

#### UX/UI: action menu и protected write behavior

Action menu exists on:

- filled sire card;
- filled dam card;
- every foal card;
- missing sire/dam slot only for add/replace action.

Menu items for existing relation:

- `Редактировать`;
- `Перейти`;
- `Заменить связь`;
- `Удалить связь`.

Menu behavior:

- `Удалить связь` applies immediately through `POST /api/horses/{horse_id}/pedigree`.
- Sire remove body: `{ "sire_id": null }`.
- Dam remove body: `{ "dam_id": null }`.
- Foal remove body: `{ "foals": remainingFoalIds }`; if none remain, send `{ "foals": [] }`.
- `Заменить связь` opens the secondary candidate picker with mode `sire`, `dam`, or `children`.
- `Редактировать` uses `slug ?? id` detail fallback when the record is outside the current table list, then opens the existing CMS edit/card modal.
- `Перейти` uses `slug ?? id` detail fallback when needed and switches the open pedigree modal to the related horse pedigree instead of opening edit/card modal.

Protected Write UX:

- All mutation actions require `UPDATE_HORSE_PEDIGREE`.
- If scope is missing, mutation menu items are hidden or disabled consistently; direct hook submit must still guard and return a forbidden state.
- While any mutation is in progress, the affected menu item/card and picker save button are disabled to prevent duplicate POST.
- Backend `401` should trigger existing auth/session handling and show a local operation failure if the user remains on the modal.
- Backend `403`/current module permission denial should be surfaced near the modal action area with a concise forbidden message.
- Backend validation `400` should keep the modal open, show the backend `detail`, and must not mutate the local modal snapshot.
- Generic/network errors should keep the modal open and allow retry.

Mutation refresh contract:

- After successful add/replace/remove relation, the secondary picker closes if it was open.
- The opened main pedigree modal refreshes the selected horse detail after any successful mutation and shows актуальные relation cards/empty states without browser page refresh.
- If the post-mutation detail reload fails, keep the modal open, surface the backend/detail error, and keep the picker open for add/replace actions.
- The horses table/list behind the modal is invalidated/refetched in the background after each successful mutation, so pedigree indicators and tooltips update without browser/page refresh.
- When the user closes and reopens the pedigree modal from the table, it must use the updated horse DTO from the refreshed list.

#### UX/UI: secondary candidate picker modal

Назначение: выбор существующей лошади для добавления или замены связи. Открывается поверх основного pedigree modal; parent modal remains visible underneath but interaction with it is blocked.

Scenarios:

- add sire;
- replace sire;
- add dam;
- replace dam;
- add foal;
- replace foal.

Layout:

```text
[ Header: Выберите лошадь / Добавить отца|Заменить отца|...       X ]
[ Search input: Поиск                                                 ]
[ Найдено: {total} лошадей                                            ]
[ Result row ][ Result row ][ Result row ]  (scrollable list)
[ Footer                                           Отмена  Сохранить ]
```

Header text:

- Sire add: `Выберите лошадь` + subtitle `Добавить отца`.
- Sire replace: `Выберите лошадь` + subtitle `Заменить отца`.
- Dam add: `Выберите лошадь` + subtitle `Добавить мать`.
- Dam replace: `Выберите лошадь` + subtitle `Заменить мать`.
- Foal add: `Выберите лошадь` + subtitle `Добавить потомка`.
- Foal replace: `Выберите лошадь` + subtitle `Заменить потомка`.

Search and results:

- Search input placeholder: `Поиск`.
- Search calls `GET /api/horses/{horse_id}/pedigree/{mode}` with `search`, `limit`, `offset`.
- Changing search resets `offset` to `0`.
- Results count displays `Найдено: {total} лошадей`.
- List is vertically scrollable; search and footer remain fixed.
- Large result sets use lazy load or pagination through `limit/offset`; virtualize only if needed by actual performance.

Result row card:

```text
[ Photo/placeholder ] [ name + sex icon
                        sex label · birth date
                        coat color · breed
                        optional "В этой конюшне" ] [ radio ]
```

Selection behavior:

- One selected candidate at a time.
- Clicking any area of the row selects it and activates the radio.
- Clicking an already selected row does not clear selection.
- If only one result is returned, it is not auto-selected.
- Search updates must not reset selected candidate if the selected candidate is still present in the new result set.
- `Сохранить` is disabled until a candidate is selected and while mutation is in progress.
- `Отмена` closes only the picker and does not mutate pedigree.
- After successful save and detail reload, picker closes and parent modal remains open with актуальные relation cards/list from the refreshed detail DTO.

Picker empty/loading/error states:

- Loading: block list interactions and show a loading state in the result area.
- Empty: show `Ничего не найдено. Попробуйте изменить поисковый запрос`.
- `401/403`: show access error; disable save.
- Validation `400`: show backend detail; keep picker open.
- Network/generic error: show retryable error state.

#### UX/UI: responsive behavior

- Desktop/tablet: parent cards remain in one row with connection lines.
- Narrow mobile: parent cards can stack vertically or use a horizontally scrollable row, but reading order must remain `Отец`, `Выбранная`, `Мать`; connection lines must degrade cleanly without crossing text.
- Foal cards may wrap or become horizontal scroll; card dimensions stay stable.
- Picker result rows stay full-width; photo, info and radio must not overlap.
- Modal body should scroll when content exceeds viewport; header/footer actions remain reachable.
- Text in buttons, cards, menus and empty states must not overflow containers.

#### UX/UI: frontend test notes

- Unit/component/API-boundary tests use MSW/mocks only; no live backend calls.
- Component tests must assert the specified layout zones, missing states, action menu item visibility, loading/empty/error states and protected-write behavior.

### Frontend Consumer

Изменений в `services/site-ad` не требуется. Обязательный self-check:

- `services/site-ad` продолжает использовать public `GET /api/horses` и `GET /api/horses/{slug}` с query `pedigree`;
- не добавлять imports из `services/frontend`;
- не использовать `POST /api/horses/{horse_id}/pedigree` в consumer.

---

## Порядок выполнения

1. Backend: зафиксировать единый validation helper и explicit-null contract.
2. Backend: доработать repository candidate filters и service validation.
3. Backend: добавить/обновить unit tests и route tests.
4. Frontend: расширить DTO/API/service boundary.
5. Frontend: добавить `useHorsePedigree`, scopes и modal components.
6. Frontend: интегрировать modal в `/horses`, обновить tests.
7. Quality Gate: проверить access matrix, backend unit/smoke планы, frontend test matrix, no `site-*` mixing.

---

## PostgreSQL для smoke-тестов

Контейнер найден через Docker labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`:

| Параметр | Значение из `docker inspect` |
|---|---|
| Container ID | `478aa22ca9d6` |
| Name | `/eqsitecms-db` |
| Image | `postgres:17` |
| Labels | `com.docker.compose.project=eqsitecms`, `com.docker.compose.service=db` |
| Network aliases | `eqsitecms-db`, `db`, `478aa22ca9d6` |
| POSTGRES_DB | `eqsitecms` |
| POSTGRES_USER | `eqsitecms` |
| POSTGRES_PASSWORD | `eqsitecms` |
| Host port for `5432/tcp` | `5433` |

Перед smoke запуском Backend/Quality Gate обязаны повторить discovery и не полагаться на эти значения как на hardcode.

## Unit-тесты backend-фичи horse pedigree validation

Расположение: `services/backend/tests/unit/core/services/test_horse_service.py` и, для route contract, `services/backend/tests/unit/api/test_route_order.py`.

| # | Сценарий |
|---|---|
| U-01 | `get_available_pedigree(mode=sire)` нормализует `limit > 50` до `50` |
| U-02 | `get_available_pedigree(mode=sire)` нормализует `limit < 1` до `1` |
| U-03 | `get_available_pedigree(mode=dam)` нормализует `offset < 0` до `0` |
| U-04 | invalid `mode` на service level возвращает `ClientError("Некорректный режим родословной")` |
| U-05 | missing target horse в GET возвращает `ClientError("Лошадь не найдена")` |
| U-06 | available sire вызывает repository с `sex=male`, `kind=current.kind`, `exclude_ids` включая current horse |
| U-07 | available sire исключает current `pedigree.dam.id` |
| U-08 | available sire исключает все current `pedigree.foals[].id` |
| U-09 | available sire применяет strict `bdate < current.bdate`, равная дата не попадает в список |
| U-10 | available dam вызывает repository с `sex=female`, `kind=current.kind`, `exclude_ids` включая current horse |
| U-11 | available dam исключает current `pedigree.sire.id` |
| U-12 | available dam исключает все current `pedigree.foals[].id` |
| U-13 | available dam применяет strict `bdate < current.bdate`, равная дата не попадает в список |
| U-14 | available dam исключает dam с `ddate < current.bdate`, если обе даты известны |
| U-15 | available children исключает current horse |
| U-16 | available children исключает current `pedigree.sire.id` и `pedigree.dam.id` |
| U-17 | available children исключает current `pedigree.foals[].id` для сценария добавления |
| U-18 | available children применяет strict `bdate > current.bdate`, равная дата не попадает в список |
| U-19 | available children для female target применяет `child.bdate <= target.ddate`, если обе даты известны |
| U-20 | POST без user вызывает `_check_admin_permission` и возвращает documented denial |
| U-21 | POST с user без admin scopes возвращает documented denial |
| U-22 | POST с admin user и missing target возвращает `ClientError("Некоторые лошади не найдены")` |
| U-23 | POST с duplicate `foals` возвращает `ClientError("Список потомков содержит дубликаты")` и не вызывает repository write |
| U-24 | POST sire self-reference отклоняется |
| U-25 | POST sire with `sex=female` отклоняется |
| U-26 | POST sire with `bdate == target.bdate` отклоняется strict rule |
| U-27 | POST dam self-reference отклоняется |
| U-28 | POST dam with `sex=male/geld` отклоняется |
| U-29 | POST dam with `bdate == target.bdate` отклоняется strict rule |
| U-30 | POST foal self-reference отклоняется |
| U-31 | POST foal with `bdate == target.bdate` отклоняется strict rule |
| U-32 | POST `sire_id == dam_id` отклоняется |
| U-33 | POST `sire_id` присутствует в `foals` отклоняется |
| U-34 | POST `dam_id` присутствует в `foals` отклоняется |
| U-35 | POST explicit `{"sire_id": null}` вызывает clear только sire и не трогает dam/foals |
| U-36 | POST explicit `{"dam_id": null}` вызывает clear только dam и не трогает sire/foals |
| U-37 | POST `{"foals": []}` очищает все foals |
| U-38 | POST omitted field не очищает соответствующую связь |
| U-39 | Repository failure после clear мапится в текущий `ClientError` неатомарной операции |
| U-40 | OpenAPI route contract сохраняет path `/api/horses/{horse_id}/pedigree/{mode}` и enum `["sire", "dam", "children"]` |

## Smoke-тесты backend-фичи horse pedigree validation

Smoke выполняются через `.claude/skills/api-smoke-test` на живом API и реальной PostgreSQL. Не создавать pytest smoke files.

Переменные: `BASE_URL`, `ADMIN_COOKIE`, `NO_SCOPE_COOKIE`, `HORSE_CURRENT_ID`, `SIRE_ID`, `DAM_ID`, `FOAL_ID`, `BAD_SAME_DATE_ID`, `BAD_SEX_ID`, `MISSING_HORSE_ID`.

| # | Запрос | Проверка |
|---|---|---|
| SM-01 | `GET {BASE_URL}/api/horses/{HORSE_CURRENT_ID}/pedigree/sire?limit=10&offset=0` без auth | `200`, Public Read работает anonymous |
| SM-02 | `GET .../pedigree/dam?limit=10&offset=0` без auth | `200`, Public Read работает anonymous |
| SM-03 | `GET .../pedigree/children?limit=10&offset=0` без auth | `200`, Public Read работает anonymous |
| SM-04 | `GET .../pedigree/badmode` без auth | `422`, invalid mode rejected by FastAPI |
| SM-05 | `GET .../{MISSING_HORSE_ID}/pedigree/sire` без auth | `400`, target horse not found |
| SM-06 | `GET .../pedigree/sire?limit=999` | `200`, response size <= 50 |
| SM-07 | `GET .../pedigree/sire?limit=0` | `200`, service clamps to at least 1 |
| SM-08 | `GET .../pedigree/dam?offset=-10` | `200`, negative offset normalized |
| SM-09 | `GET .../pedigree/sire?search=<known sire name>` | items contain matching sire, `sex=male` |
| SM-10 | `GET .../pedigree/dam?search=<known dam name>` | items contain matching dam, `sex=female` |
| SM-11 | `GET .../pedigree/children?search=<known child name>` | items contain matching child with `bdate > current.bdate` |
| SM-12 | seed current dam, then `GET .../pedigree/sire` | current dam id is absent |
| SM-13 | seed current sire, then `GET .../pedigree/dam` | current sire id is absent |
| SM-14 | seed current foal, then `GET .../pedigree/sire` | existing foal id is absent |
| SM-15 | seed current foal, then `GET .../pedigree/dam` | existing foal id is absent |
| SM-16 | seed current parents, then `GET .../pedigree/children` | parent ids are absent |
| SM-17 | seed current foal, then `GET .../pedigree/children` | existing foal id is absent for add flow |
| SM-18 | candidate with same bdate as current in sire query | candidate is absent |
| SM-19 | candidate with same bdate as current in dam query | candidate is absent |
| SM-20 | candidate with same bdate as current in children query | candidate is absent |
| SM-21 | `POST .../pedigree` without auth body `{ "sire_id": SIRE_ID }` | documented Protected Write denial (`400` current contract or `401/403` if normalized) |
| SM-22 | `POST .../pedigree` with no-scope auth | documented permission denial |
| SM-23 | `POST .../pedigree` with admin `{ "sire_id": SIRE_ID }` | `204`, DB row `(SIRE_ID, HORSE_CURRENT_ID)` exists |
| SM-24 | `POST .../pedigree` with admin `{ "dam_id": DAM_ID }` | `204`, DB row `(DAM_ID, HORSE_CURRENT_ID)` exists |
| SM-25 | `POST .../pedigree` with admin `{ "foals": [FOAL_ID] }` | `204`, DB row `(HORSE_CURRENT_ID, FOAL_ID)` exists |
| SM-26 | `POST .../pedigree` with admin `{ "sire_id": null }` | `204`, sire row removed, dam/foals preserved |
| SM-27 | `POST .../pedigree` with admin `{ "dam_id": null }` | `204`, dam row removed, sire/foals preserved |
| SM-28 | `POST .../pedigree` with admin `{ "foals": [] }` | `204`, foal rows for current horse removed |
| SM-29 | `POST .../pedigree` with duplicate foals | `400`, no duplicate DB rows |
| SM-30 | `POST .../pedigree` with wrong-sex sire | `400`, no DB write |
| SM-31 | `POST .../pedigree` with wrong-sex dam | `400`, no DB write |
| SM-32 | `POST .../pedigree` with same-date parent | `400`, no DB write |
| SM-33 | `POST .../pedigree` with same-date foal | `400`, no DB write |
| SM-34 | `POST .../pedigree` with `sire_id == dam_id` | `400`, no DB write |
| SM-35 | `POST .../pedigree` with `sire_id` also in `foals` | `400`, no DB write |
| SM-36 | `GET /api/horses/{HORSE_CURRENT_ID}?pedigree=1` after mutations | response pedigree reflects DB relations |

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `src/api/horses.ts` | Adds available pedigree GET and set pedigree POST, serializes `search/limit/offset` and body nulls | API-boundary MSW: success, empty, validation error, `401`, `403`; no live backend calls | GET anonymous/public contract tolerated by backend; CMS call uses session; POST protected write | `npm test -- horses`, `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` |
| `services/horseService.ts` | Feature service delegates only to API boundary | Unit/service tests: success, empty, error | Authenticated CMS service path, no direct component fetch | `npm test -- horses` |
| `useHorsePedigree.ts` | Main modal state, picker state, search, pagination/lazy load, immediate mutations with opened modal detail refresh | Hook tests: open with selected horse, load candidates, search reset offset, page load, success background table invalidation, opened modal relation refresh, failed detail reload surfacing, validation error, generic error, `401/403`, double-submit guard | scope present/missing, Protected Write denial surfaced | `npm test -- useHorsePedigree` |
| `useHorseScopes.ts` | Adds `UPDATE_HORSE_PEDIGREE` | Unit tests for scope present/missing | authenticated scopes; missing scope hides/guards mutation | `npm test -- useHorseScopes` |
| `HorsePedigreeModal.tsx` | Replaces placeholder with parent/current/foals layout and menus | Component tests: render full data, missing sire/dam slots, empty foals, image placeholder, menus, close, no save button, disabled during mutation | authenticated render; missing mutation scope hides/disables actions | `npm test -- HorsePedigreeModal` |
| `HorsePedigreeModal.tsx` UX layout | Header, parent row, selected card, connection lines, foals section, footer and responsive states | Component tests/manual screenshot checks: title includes horse name and parenthesized sex marker, `geld` marker is male sign + `м`, labels `Отец`/`Выбранная`/`Мать` centered, selected card has thicker border and no menu, connection lines visible/non-overlapping, foals empty state, mobile no overlap | authenticated render; mutation controls scope-aware | `npm test -- HorsePedigreeModal`, manual responsive QA |
| `HorsePedigreeCard.tsx` | Shared photo/date/sex/coat/breed rendering for relation cards and picker rows | Component tests: main photo priority, first photo fallback, placeholder, `bdate_formatted`, `bdate_mode` fallback, sex labels/icons including `geld = male sign + м`, missing coat/breed | no access dependency | `npm test -- HorsePedigreeCard` |
| `HorsePedigreePickerModal.tsx` | Secondary candidate modal with search/results/radio/save | Component tests: loading, empty, results, radio select, no auto-select, save disabled until selected, pagination/lazy load | authenticated render; `401/403` errors shown | `npm test -- HorsePedigreePickerModal` |
| `HorsePedigreePickerModal.tsx` UX flow | Overlay over parent modal, fixed search/footer, count, full-width result cards, cancel/save semantics | Component/manual tests: parent blocked, search placeholder, count text, row click selects radio, selected row remains through search if still present, cancel no mutation, save closes picker only after success | Protected Write save requires scope and surfaces `401/403/400` | `npm test -- HorsePedigreePickerModal`, manual responsive QA |
| `src/app/(protected)/horses/page.tsx` | Pedigree button stores selected horse, invalidates/refetches list after mutation without page refresh, separates edit vs pedigree navigation | Component/page smoke or integration test: click pedigree opens selected horse modal, mutation refetches table/indicators, opened modal data refreshes, `Редактировать` opens edit flow, `Перейти` opens related pedigree with detail fallback | anonymous route redirect/block already by protected layout; authenticated user render | `npm test -- horses`, manual QA if page-level harness absent |
| Manual QA UI flow | Full browser verification of pedigree modal, picker, permissions, errors, responsive layout, table invalidation without page refresh | Execute `Manual QA steps (UI тестирование)` section and attach results/screenshots for failed steps | authenticated CMS user, missing scope, backend `401/403`, validation `400`, success table update without browser refresh | browser `http://localhost:3000`, devtools network, responsive viewports |
| `services/site-ad` self-check | No consumer changes and no CMS write usage | `rg` checks only | Public Read consumer remains GET-only | `rg -n "pedigree" services/site-ad/src`, `rg -n "POST.*/horses/.*/pedigree|horseSetPedigree" services/site-ad/src` |

Frontend verification commands from `services/frontend`:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'
rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'
rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'
rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'
find services/frontend/src -maxdepth 2 -type d \( -name shared -o -name widgets -o -name entities \)
```

---

## Manual QA steps (UI тестирование)

Пользователь выполняет шаги в браузере `http://localhost:3000` и отправляет результат для проверки. Для failed step приложить короткое описание, screenshot и, если ошибка связана с API, статус/response из DevTools Network.

Предусловия:

- Backend API поднят на `http://localhost:8001/api`, frontend CMS на `http://localhost:3000`.
- В БД есть минимум одна текущая лошадь с `pedigree=1`, один валидный отец, одна валидная мать, один валидный потомок и один кандидат, нарушающий validation rule.
- Есть CMS user с `UPDATE_HORSE_PEDIGREE` и CMS user без этого scope.
- Таблица `/horses` загружает лошадей с `pedigree=1`, чтобы pedigree indicators и modal работали без ручного ввода ID.

1. + Войти в CMS пользователем с правом `UPDATE_HORSE_PEDIGREE`, открыть раздел **«Лошади»**.
2. + Найти строку лошади с заполненной родословной, навести на кнопку **«Родословная»** → tooltip показывает `Отец`, `Мать`, `Потомство`.
3. + Нажать кнопку **«Родословная»** → открывается modal с заголовком `Родословная — {name} ({sex marker})` и кнопкой закрытия справа; для мерина marker — мужской знак + `м` в круглых скобках.
4. + Закрыть modal через `X`, открыть повторно → состояние открывается заново без visual artifacts.
5. + Закрыть modal через footer кнопку **«Закрыть»** → modal закрыт, таблица остается на той же странице.
6. + Открыть modal снова → блок **«Родители»** содержит три зоны: `Отец`, `Выбранная` по центру, `Мать`.
7. + Проверить карточку выбранной лошади: фото/placeholder, кличка, sex icon, пол + дата рождения, масть; action menu отсутствует; border чуть толще, чем у остальных relation cards.
8. + Проверить, что заголовки `Отец`, `Выбранная`, `Мать` отцентрированы относительно своих карточек, а connection lines визуально соединяют `Отец -- Выбранная -- Мать` и не перекрывают текст/кнопки.
9. + Для лошади с отцом проверить sire card: данные `pedigree.sire`, фото, пол, дата, масть, menu actions.
10. + Для лошади без отца открыть modal → sire slot показывает `Не указан`, при этом подпись `Отец` остается.
11. + В missing sire slot открыть menu → доступно только **«Заменить связь»**; **«Удалить связь»** и **«Перейти»** отсутствуют.
12. + Для лошади с матерью проверить dam card: данные `pedigree.dam`, фото, пол, дата, масть, menu actions.
13. + Для лошади без матери открыть modal → dam slot показывает `Не указана`, menu содержит только **«Заменить связь»**.
14. + Проверить карточки без фото: для выбранной лошади/отца/матери/потомка отображается одинаковый placeholder, layout карточки не ломается.
15. + Проверить date fallback: если `bdate_formatted` отсутствует, дата отображается согласно `bdate_mode`; при `hide` дата не отображается.
16. + Проверить block **«Потомство»** с заполненным списком → есть header `Потомство`, одна кнопка **«+ Добавить потомка»**, карточки потомков отображаются горизонтально/с переносом.
17. + Проверить foal card: фото/placeholder, кличка, sex icon, пол + дата рождения, масть, второй родитель или стабильный fallback, menu actions.
18. + Открыть modal у лошади без потомков → empty state показывает `Потомство отсутствует` и `У этой лошади пока нет зарегистрированных потомков.`
19. + Убедиться, что в empty state кнопка **«+ Добавить потомка»** остается в header, а отдельной карточки добавления внутри списка нет.
20. + Нажать **«+ Добавить потомка»** → поверх основного modal открывается picker; основной modal виден под ним и недоступен для взаимодействия.
21. + В picker проверить header `Выберите лошадь` + subtitle `Добавить потомка`, search placeholder `Поиск`, count `Найдено: N лошадей`, footer `Отмена`/`Сохранить`.
22. + В picker проверить loading state при поиске/первичной загрузке: список заблокирован, footer остается доступным.
23. + Ввести search с результатами → список обновился без перезагрузки окна, DevTools request содержит `GET /api/horses/{horse_id}/pedigree/children?search=...&limit=...&offset=...`.
24. + Ввести search без результатов → отображается `Ничего не найдено. Попробуйте изменить поисковый запрос`.
25. + Очистить search → `offset` сброшен в `0`, список снова показывает кандидатов.
26. + Проверить result row: `[photo/placeholder] [name + sex icon, sex/date, coat color/breed, optional "В этой конюшне"] [radio]`.
27. + Кликнуть по любой области result row → radio выбран, строка получает active state.
28. + Если в picker один результат, убедиться, что он не выбран автоматически до клика.
29. + Выбрать candidate, изменить search так, чтобы candidate остался в results → selected state не сброшен.
30. + Нажать **«Отмена»** → picker закрыт, родословная не изменилась, основной modal остался открыт.
31. + Повторно открыть add foal picker, выбрать валидного потомка, нажать **«Сохранить»** → POST `/{horse_id}/pedigree` успешен, выполняется detail reload с `pedigree=1`, picker закрыт; основное modal остается открытым и показывает актуальный foals list.
32. + После успешного add foal проверить таблицу без browser refresh: list refetch/invalidation выполняется в фоне, после закрытия modal tooltip/green indicator потомства в строке уже обновлен.
33. + Для sire card выбрать **«Заменить связь»** → picker subtitle `Заменить отца`, GET mode `sire`, candidates соответствуют отцам.
34. + Выбрать валидного отца, нажать **«Сохранить»** → POST успешен, detail reload успешен, picker закрыт; sire card в открытом modal обновляется, blue indicator/tooltip в таблице обновляется без browser refresh.
35. + Для dam card выбрать **«Заменить связь»** → picker subtitle `Заменить мать`, GET mode `dam`, candidates соответствуют матерям.
36. + Выбрать валидную мать, нажать **«Сохранить»** → POST успешен, detail reload успешен, picker закрыт; dam card в открытом modal обновляется, pink indicator/tooltip в таблице обновляется без browser refresh.
37. + Для sire card выбрать **«Удалить связь»** → POST body содержит `{ "sire_id": null }`; после detail reload sire slot в открытом modal показывает missing state, остальные связи в backend сохранены.
38. + Для dam card выбрать **«Удалить связь»** → POST body содержит `{ "dam_id": null }`; после detail reload dam slot в открытом modal показывает missing state, остальные связи в backend сохранены.
39. + Для foal card выбрать **«Удалить связь»** → POST body содержит актуальный `foals` список без удаляемого id; после detail reload карточка удалена из открытого modal.
40. + Удалить последнего потомка → открытое modal не меняет foals list/empty state автоматически, но green indicator в таблице становится серым без browser refresh после background list update.
41. + Для filled sire/dam/foal выбрать **«Редактировать»** → используется текущая table record или detail GET fallback `slug`, если есть, иначе `id`; открывается существующий CMS сценарий просмотра/редактирования выбранной лошади.
42. + Для filled sire/dam/foal выбрать **«Перейти»** → используется текущая table record или detail GET fallback `slug`, если есть, иначе `id`; открытый pedigree modal переключается на родословную выбранной связанной лошади, ошибка про фильтры не показывается.
43. + При failed detail GET после **«Редактировать»**, **«Перейти»** или post-mutation reload пользователь видит ошибку из API/notification; browser page refresh не требуется.
42. + Попробовать выбрать candidate, нарушающий backend validation (например wrong sex или same bdate) через подготовленный мок/данные → backend `400`, modal/picker остается открыт, показывается `detail`, локальное состояние не считается успешным.
43. + Имитировать/получить backend `401` на POST (истекшая сессия) → existing auth/session handling срабатывает; пользователь видит отказ операции, дубль POST не отправляется.
44. + Имитировать/получить backend `403` или текущий permission-denial contract на POST → action failure отображается в modal/picker, связь не меняется.
45. + Войти пользователем без `UPDATE_HORSE_PEDIGREE`, открыть pedigree modal → read-only данные видны.
46. + Пользователь без scope: mutation menu items hidden/disabled, **«+ Добавить потомка»** hidden/disabled, direct submit невозможен.
47. + Пользователь без scope: попытка открыть mutation через прямое состояние/ручной вызов не отправляет POST; показывается forbidden state.
48. + Проверить desktop viewport `1440x900`: parent cards в один ряд, connection lines не overlap, picker rows читаемы.
49. + Проверить tablet viewport `768x1024`: modal body scroll работает, footer/header доступны, cards не перекрывают друг друга.
50. + Проверить mobile viewport `390x844`: parent cards stack или horizontal scroll, порядок `Отец`, `Выбранная`, `Мать` сохранен, текст в кнопках/карточках не вылезает.
51. + В mobile picker проверить full-width rows: фото, текст и radio не overlap; footer `Отмена`/`Сохранить` доступен.
52. + Проверить no live UI regression: вкладки «Породы», «Масти», «Владельцы», «Услуги» открываются как прежде.
53. + Проверить `services/site-ad`: публичные страницы лошадей с pedigree открываются как прежде; CMS pedigree write UI на site-ad отсутствует.
54. + Выполнить self-check commands: `rg -n "POST.*/horses/.*/pedigree|horseSetPedigree" services/site-ad/src` не находит consumer write usage.
55. + Итоговый отчет: перечислить passed/failed steps, приложить screenshots для failed responsive/error/permission cases и network status/body для failed API cases.
---

## Чеклист

### Backend

- [x] Проверить и при необходимости обновить Access matrix для `GET /api/horses/{horse_id}/pedigree/{mode}` и `POST /api/horses/{horse_id}/pedigree`
- [x] Убедиться, что `GET /api/horses/{horse_id}/pedigree/{mode}` остается Public Read без auth dependency
- [x] Убедиться, что `POST /api/horses/{horse_id}/pedigree` остается Protected Write с auth/scopes
- [x] Rework: invalid path `mode` для `GET /api/horses/{horse_id}/pedigree/{mode}` возвращает structural `422`, а не `400`
- [x] Найти PostgreSQL контейнер по labels `com.docker.compose.project=eqsitecms` + `com.docker.compose.service=db`, fallback `eqsitecms-db`/`postgres`, и получить DB env/host port через `docker inspect`
- [x] В `services/backend/src/core/schemas/horses.py` уточнить `HorseSetPedigreeInDto` contract для omitted vs explicit null
- [x] В `services/backend/src/core/services/horse.py` добавить единый helper validation candidate для sire/dam/children
- [x] В `services/backend/src/core/services/horse.py` учитывать `model_fields_set` для `sire_id: null`, `dam_id: null`, omitted fields
- [x] В `services/backend/src/core/services/horse.py` запретить `sire_id == dam_id`
- [x] В `services/backend/src/core/services/horse.py` запретить пересечение `sire_id/dam_id` с `foals`
- [x] В `services/backend/src/repositories/horse_repository.py` сделать strict date filter для available sire/dam `< current.bdate`
- [x] В `services/backend/src/repositories/horse_repository.py` сделать strict date filter для available children `> current.bdate`
- [x] В `services/backend/src/repositories/horse_repository.py` исключать current second parent и current foals из candidate GET
- [x] Unit: horse pedigree validation — `get_available_pedigree(mode=sire)` нормализует `limit > 50` до `50`
- [x] Unit: horse pedigree validation — `get_available_pedigree(mode=sire)` нормализует `limit < 1` до `1`
- [x] Unit: horse pedigree validation — `get_available_pedigree(mode=dam)` нормализует `offset < 0` до `0`
- [x] Unit: horse pedigree validation — invalid `mode` на service level возвращает `ClientError("Некорректный режим родословной")`
- [x] Unit: horse pedigree validation — missing target horse в GET возвращает `ClientError("Лошадь не найдена")`
- [x] Unit: horse pedigree validation — available sire вызывает repository с `sex=male`, `kind=current.kind`, `exclude_ids` включая current horse
- [x] Unit: horse pedigree validation — available sire исключает current `pedigree.dam.id`
- [x] Unit: horse pedigree validation — available sire исключает все current `pedigree.foals[].id`
- [x] Unit: horse pedigree validation — available sire применяет strict `bdate < current.bdate`, равная дата не попадает в список
- [x] Unit: horse pedigree validation — available dam вызывает repository с `sex=female`, `kind=current.kind`, `exclude_ids` включая current horse
- [x] Unit: horse pedigree validation — available dam исключает current `pedigree.sire.id`
- [x] Unit: horse pedigree validation — available dam исключает все current `pedigree.foals[].id`
- [x] Unit: horse pedigree validation — available dam применяет strict `bdate < current.bdate`, равная дата не попадает в список
- [x] Unit: horse pedigree validation — available dam исключает dam с `ddate < current.bdate`, если обе даты известны
- [x] Unit: horse pedigree validation — available children исключает current horse
- [x] Unit: horse pedigree validation — available children исключает current `pedigree.sire.id` и `pedigree.dam.id`
- [x] Unit: horse pedigree validation — available children исключает current `pedigree.foals[].id` для сценария добавления
- [x] Unit: horse pedigree validation — available children применяет strict `bdate > current.bdate`, равная дата не попадает в список
- [x] Unit: horse pedigree validation — available children для female target применяет `child.bdate <= target.ddate`, если обе даты известны
- [x] Unit: horse pedigree validation — POST без user вызывает `_check_admin_permission` и возвращает documented denial
- [x] Unit: horse pedigree validation — POST с user без admin scopes возвращает documented denial
- [x] Unit: horse pedigree validation — POST с admin user и missing target возвращает `ClientError("Некоторые лошади не найдены")`
- [x] Unit: horse pedigree validation — POST с duplicate `foals` возвращает `ClientError("Список потомков содержит дубликаты")` и не вызывает repository write
- [x] Unit: horse pedigree validation — POST sire self-reference отклоняется
- [x] Unit: horse pedigree validation — POST sire with `sex=female` отклоняется
- [x] Unit: horse pedigree validation — POST sire with `bdate == target.bdate` отклоняется strict rule
- [x] Unit: horse pedigree validation — POST dam self-reference отклоняется
- [x] Unit: horse pedigree validation — POST dam with `sex=male/geld` отклоняется
- [x] Unit: horse pedigree validation — POST dam with `bdate == target.bdate` отклоняется strict rule
- [x] Unit: horse pedigree validation — POST foal self-reference отклоняется
- [x] Unit: horse pedigree validation — POST foal with `bdate == target.bdate` отклоняется strict rule
- [x] Unit: horse pedigree validation — POST `sire_id == dam_id` отклоняется
- [x] Unit: horse pedigree validation — POST `sire_id` присутствует в `foals` отклоняется
- [x] Unit: horse pedigree validation — POST `dam_id` присутствует в `foals` отклоняется
- [x] Unit: horse pedigree validation — POST explicit `{"sire_id": null}` вызывает clear только sire и не трогает dam/foals
- [x] Unit: horse pedigree validation — POST explicit `{"dam_id": null}` вызывает clear только dam и не трогает sire/foals
- [x] Unit: horse pedigree validation — POST `{"foals": []}` очищает все foals
- [x] Unit: horse pedigree validation — POST omitted field не очищает соответствующую связь
- [x] Unit: horse pedigree validation — Repository failure после clear мапится в текущий `ClientError` неатомарной операции
- [x] Unit: horse pedigree validation — OpenAPI route contract сохраняет path `/api/horses/{horse_id}/pedigree/{mode}` и enum `["sire", "dam", "children"]`
- [ ] Smoke: horse pedigree validation — `GET /api/horses/{HORSE_CURRENT_ID}/pedigree/sire` без auth возвращает `200` на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — `GET /api/horses/{HORSE_CURRENT_ID}/pedigree/dam` без auth возвращает `200` на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — `GET /api/horses/{HORSE_CURRENT_ID}/pedigree/children` без auth возвращает `200` на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — invalid mode возвращает `422` на реальной PostgreSQL/API
- [ ] Smoke: horse pedigree validation — missing horse возвращает `400` на реальной PostgreSQL/API
- [ ] Smoke: horse pedigree validation — GET sire `limit=999` clamp до `<=50` items на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET sire `limit=0` нормализуется на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET dam `offset=-10` нормализуется на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET sire search возвращает matching `sex=male` candidate на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET dam search возвращает matching `sex=female` candidate на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET children search возвращает candidate с `bdate > current.bdate` на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET sire исключает current dam id на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET dam исключает current sire id на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET sire исключает existing foal id на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET dam исключает existing foal id на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET children исключает current sire/dam ids на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — GET children исключает existing foal id на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — same-bdate sire candidate absent на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — same-bdate dam candidate absent на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — same-bdate child candidate absent на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — POST without auth получает documented Protected Write denial на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — POST no-scope auth получает permission denial на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — POST admin `sire_id` создает DB row `(sire, current)` на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — POST admin `dam_id` создает DB row `(dam, current)` на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — POST admin `foals` создает DB row `(current, foal)` на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — POST `sire_id: null` удаляет sire row и сохраняет остальные связи на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — POST `dam_id: null` удаляет dam row и сохраняет остальные связи на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — POST `foals: []` удаляет foal rows текущей лошади на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — duplicate foals возвращает `400` без duplicate DB rows на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — wrong-sex sire возвращает `400` без DB write на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — wrong-sex dam возвращает `400` без DB write на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — same-date parent возвращает `400` без DB write на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — same-date foal возвращает `400` без DB write на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — `sire_id == dam_id` возвращает `400` без DB write на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — `sire_id` also in `foals` возвращает `400` без DB write на реальной PostgreSQL
- [ ] Smoke: horse pedigree validation — `GET /api/horses/{HORSE_CURRENT_ID}?pedigree=1` отражает итоговые связи на реальной PostgreSQL

### Frontend

- [x] В `services/frontend/src/types/api/horses.ts` расширить pedigree DTO до полного horse card shape
- [x] В `services/frontend/src/types/api/horses.ts` добавить `HorsePedigreeMode` и `HorseSetPedigreeInDto`
- [x] В `services/frontend/src/api/horses.ts` добавить `horseAvailablePedigree()` без прямого `fetch` вне API boundary
- [x] В `services/frontend/src/api/horses.ts` добавить `horseSetPedigree()` с сохранением explicit null в JSON body
- [x] В `services/frontend/src/features/horses/services/horseService.ts` добавить `fetchAvailablePedigree()`
- [x] В `services/frontend/src/features/horses/services/horseService.ts` добавить `fetchSetHorsePedigree()`
- [x] В `services/frontend/src/features/horses/hooks/useHorseScopes.ts` добавить `UPDATE_HORSE_PEDIGREE`
- [x] В `services/frontend/src/features/horses/hooks/useHorsePedigree.ts` реализовать open/close основного modal и selected horse state
- [x] В `services/frontend/src/features/horses/hooks/useHorsePedigree.ts` реализовать candidate search с reset `offset=0`
- [x] В `services/frontend/src/features/horses/hooks/useHorsePedigree.ts` реализовать pagination/lazy load через `limit/offset`, без `page` API contract
- [x] В `services/frontend/src/features/horses/hooks/useHorsePedigree.ts` реализовать add/replace/delete sire immediate mutation
- [x] В `services/frontend/src/features/horses/hooks/useHorsePedigree.ts` реализовать add/replace/delete dam immediate mutation
- [x] В `services/frontend/src/features/horses/hooks/useHorsePedigree.ts` реализовать add/replace/delete foal immediate mutation через актуальный `foals` список
- [x] В `services/frontend/src/features/horses/hooks/useHorsePedigree.ts` добавить double-submit guard для mutation loading
- [x] В `services/frontend/src/features/horses/hooks/useHorsePedigree.ts` surfacing `401/403`, validation error и generic error
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeCard.tsx` создать переиспользуемую карточку с фото/placeholder, sex icon, date, coat color
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeCard.tsx` реализовать выбор фото: `is_main && url`, затем первое фото с `url`, затем placeholder
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeCard.tsx` реализовать отображение даты: `bdate_formatted`, затем fallback по `bdate_mode`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeCard.tsx` реализовать sex labels/icons для `male`, `female`, `geld`, unknown
- [x] Frontend rework: для `geld` использовать мужской знак + букву `м`; в заголовке modal отображать marker в круглых скобках
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeCard.tsx` реализовать fallback для `coat_color.short_name/name` и `breed.short_name/name`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` заменить заглушку layout: шапка, родители, выбранная лошадь, потомство, footer close
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` реализовать header `Родословная — {name} ({sex marker})` и кнопку закрытия справа
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` реализовать блок `Родители`: `Отец -- Выбранная -- Мать`
- [x] Frontend rework: переименовать label center card `Текущая лошадь` -> `Выбранная`
- [x] Frontend rework: отцентрировать labels `Отец`, `Выбранная`, `Мать` относительно соответствующих карточек
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` реализовать connection lines между родителями и выбранной лошадью без overlap
- [x] Frontend rework: сделать border выбранной лошади чуть толще, чем у остальных relation cards
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` убедиться, что selected horse card находится в центре и не имеет action menu
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` добавить parent slots «Не указан/Не указана» и menus
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` для missing sire/dam показывать только action `Заменить связь`, без `Удалить связь` и `Перейти`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` для filled sire/dam/foal показывать menu `Редактировать`, `Перейти`, `Заменить связь`, `Удалить связь`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` добавить empty state потомства и единственную кнопку `Добавить потомка`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` показать empty state `Потомство отсутствует` + `У этой лошади пока нет зарегистрированных потомков.`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` не добавлять отдельную карточку `Добавить потомка` внутри списка
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` убрать общую кнопку save, оставить только `Закрыть`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` реализовать protected write UX: hide/disable mutation actions без `UPDATE_HORSE_PEDIGREE`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` отображать `401/403`, validation `400` и generic errors без закрытия modal
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` создать вторичный modal с search, count, result rows, radio и save/cancel
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` реализовать заголовки add/replace для sire/dam/foal scenarios
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` реализовать search placeholder `Поиск` и счетчик `Найдено: {total} лошадей`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` сделать search/footer фиксированными, а список вертикально scrollable
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` реализовать result row `[photo][info][radio]` на всю ширину
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` выбирать candidate кликом по всей строке и не auto-select единственный результат
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` не сбрасывать selected candidate при поиске, если он остался в results
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` disable `Сохранить` без selected candidate и во время mutation
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` покрыть loading/empty/error/result states
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` показать empty state `Ничего не найдено. Попробуйте изменить поисковый запрос`
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreePickerModal.tsx` surfacing `401/403`, validation `400` и generic errors
- [x] В `services/frontend/src/features/horses/ui/Horses/HorsePedigreeModal.tsx` и picker проверить responsive behavior desktop/tablet/mobile без overlap
- [x] В `services/frontend/src/app/(protected)/horses/page.tsx` передавать selected horse в `HorsePedigreeModal`
- [x] В `services/frontend/src/app/(protected)/horses/page.tsx` обновлять список horses после успешной mutation
- [x] Frontend rework: после любой pedigree mutation обновлять relation cards/foals list внутри уже открытого main modal через detail reload
- [x] Frontend rework: после любой pedigree mutation делать background invalidation/refetch списка `/horses` с `pedigree=1`, чтобы table indicators/tooltips обновлялись без browser refresh
- [x] Frontend rework: при повторном открытии pedigree modal брать обновленный DTO из refetched table list
- [x] Frontend test: API boundary success/empty/error/401/403 для available pedigree и set pedigree через MSW
- [x] Frontend test: hook search reset `offset`, pagination `limit/offset`, no `page/pageSize` API contract
- [x] Frontend test: scope present показывает actions, scope missing скрывает/disabled mutation actions
- [x] Frontend test: protected write mutation guard блокирует submit без `UPDATE_HORSE_PEDIGREE`
- [x] Frontend test: `HorsePedigreeModal` full data render, missing parent slots, empty foals, image placeholder, close
- [x] Frontend test: `HorsePedigreeModal` header, parent labels, selected card without menu, connection lines, no global save button
- [ ] Frontend test: `HorsePedigreeModal` `geld` header marker, centered labels, selected card thicker border
- [x] Frontend test: `HorsePedigreeCard` photo priority, placeholder, date fallback, sex icon/label, coat/breed fallback
- [ ] Frontend test: `HorsePedigreeCard` `geld` renders male sign + `м`
- [x] Frontend test: successful mutation closes picker and refreshes opened modal relation data
- [x] Frontend test: successful mutation triggers table/list invalidation and updates pedigree indicators/tooltips without browser refresh
- [x] Frontend test: `HorsePedigreePickerModal` result select by card click, no auto-select, save disabled until selected
- [x] Frontend test: `HorsePedigreePickerModal` search placeholder, count, fixed footer/search behavior by DOM structure, empty state text
- [x] Frontend test: `401/403` backend denial surfaced in modal/picker
- [ ] Frontend manual QA: выполнить шаги 1-19 — open/close, current horse, sire/dam present/missing, foals empty/list
- [ ] Frontend manual QA: выполнить шаги 20-31 — picker search/selection/loading/empty/add foal
- [ ] Frontend manual QA: выполнить шаги 32-43 — table update without browser refresh, opened modal data refresh, replace sire/dam, remove links, edit/go-to actions
- [ ] Frontend manual QA: выполнить шаги 42-47 — validation errors, backend `401/403`, missing permission/scope
- [ ] Frontend manual QA: выполнить шаги 48-51 — responsive desktop/tablet/mobile modal and picker
- [ ] Frontend manual QA: выполнить шаги 52-55 — regression/no site-ad changes/final report
- [ ] Frontend manual QA: responsive desktop/tablet/mobile modal and picker without text/control overlap
- [x] Frontend check: no live backend calls in unit/component/API-boundary tests
- [x] Frontend check: no `site-*` mixing imports or consumer code usage
- [x] Frontend check: run `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'`
- [x] Frontend check: run `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'`
- [x] Frontend check: run `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'`
- [x] Frontend check: run `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'`
- [x] Frontend check: run `find services/frontend/src -maxdepth 2 -type d \( -name shared -o -name widgets -o -name entities \)`

### Quality Gate

- [x] Проверить, что plan implementation не меняет `services/site-ad`, кроме отчета self-check
- [x] Проверить Access matrix: GET pedigree Public Read anonymous `200`, POST pedigree Protected Write denial without auth/no scope
- [x] Проверить, что исключения из default API policy не добавлены
- [x] Проверить Clean Architecture: API router без business validation, logic в service/schema, SQL только repository
- [x] Проверить, что Backend unit-тестов для horse pedigree validation не меньше 30 и они не однотипные
- [x] Проверить, что Backend smoke-сценариев для horse pedigree validation не меньше 30 и они рассчитаны на реальную PostgreSQL
- [x] Проверить, что smoke не добавлен как pytest files и выполняется через `.claude/skills/api-smoke-test`
- [x] Проверить DB discovery через `docker inspect` перед smoke-тестами
- [x] Запустить backend unit tests: `cd services/backend && pytest tests/unit/core/services/test_horse_service.py tests/unit/api/test_route_order.py`
- [x] Провести backend smoke по таблице SM-01..SM-36 на живом API и реальной PostgreSQL
- [x] Проверить frontend architecture: `page.tsx -> feature ui/hook -> service -> src/api`
- [x] Проверить frontend tests относительно behavior diff, access/scopes scenarios и Protected Write UX
- [x] Проверить MSW/no live backend calls в frontend tests
- [x] Проверить pagination `limit/offset` и отсутствие нового API contract `page/pageSize`
- [x] Проверить no `site-*` mixing self-check
- [x] Запустить из `services/frontend`: `npm test`
- [x] Запустить из `services/frontend`: `npm run lint`
- [x] Запустить из `services/frontend`: `npx tsc --noEmit`
- [x] Запустить из `services/frontend`: `npm run build`
- [ ] Проверить Manual QA steps 1-55: authenticated CMS user, missing scope, backend `401/403`, validation errors, table update without browser refresh, opened modal data refresh, responsive viewports, no site-ad write usage
