# Контекст
У модели лошадей есть поле `kind`, которая отвечает за тип лошади: обычная или пони
Суть в том, что это атрибут породы, а не атрибут лошади
# Связанные файлы
- services/backend/src/models/horse.py - модель лошадей
- services/backend/src/models/breeds.py - модель породы
# Backend
У нас есть следующие эндпоинты:
## Horse Breeds
- **GET** `/api/horses/breeds`
- **POST** `/api/horses/breeds`
- **GET** `/api/horses/breeds/{slug_or_id}`
- **PATCH** `/api/horses/breeds/{slug_or_id}`
### DTO
```json
{
  "id": "84c37d90-6d7f-4356-aeaa-a781204f365f",
  "name": "Будённовская",
  "short_name": "буд.",
  "slug": "budyonnovskaya",
  "description": null
}
```
## Horses
- **GET** `/api/horses`
- **POST** `/api/horses`
- **GET** `/api/horses/{slug_or_id}`
- **PATCH** `/api/horses/{slug_or_id}`
- **POST** `/api/horses/{horse_id}/pedigree`
- **POST** `/api/horses/{horse_id}/photos`
- **GET** `/api/horses/{horse_id}/pedigree/{mode}`
### DTO
```json
{
  "id": "24a1531b-7791-4a5c-815b-a0fd96e661a0",
  "slug": "qg-foal-qg-recheck-20260516221641",
  "name": "QG Foal qg-recheck-20260516221641",
  "description": null,
  "breed": null,
  "coat_color": null,
  "kind": "horse",
  "height": null,
  "sex": "female",
  "bdate": "2020-01-01",
  "ddate": null,
  "bdate_mode": "ymd",
  "ddate_mode": "hide",
  "horse_owner": null,
  "photos": [],
  "services": [],
  "this_stable": false,
  "pedigree": {
	"sire": {
	  "id": "f413dede-b695-497e-ad64-73a51c126713",
	  "slug": "qg-current-qg-recheck-20260516221641",
	  "name": "QG Current qg-recheck-20260516221641",
	  "description": null,
	  "breed": null,
	  "coat_color": null,
	  "kind": "horse",
	  "height": null,
	  "sex": "male",
	  "bdate": "2010-01-01",
	  "ddate": null,
	  "bdate_mode": "ymd",
	  "ddate_mode": "hide",
	  "horse_owner": null,
	  "photos": [],
	  "services": [],
	  "this_stable": false,
	  "bdate_formatted": "01.01.2010",
	  "ddate_formatted": null,
	  "age": null
	},
	"dam": null,
	"foals": []
  },
  "bdate_formatted": "01.01.2020",
  "ddate_formatted": null,
  "age": null
}
```
## Цель
Нам нужно переместить атрибут `kind` из лошадей в породы
Обрати внимание на все сущности, которые присылают kind сейчас. Например, это `pedigree`
## Фильтрация
У лошадей необходимо оставить фильтр по `kind`, который будет фактиески фильтровать по атрибуту породы. В том числе нужно оставить и сортировку
У пород нужно поддержать фильтрацию и сортировку по `kind`
## Миграция
Потребуется миграция БД. Данные мигрировать не нужно - они тестовые. Поле не nullable. Автоматически при миграции заполни как лошадь. Потом после миграции рандомно выбери и SQL запросами сделай половину пород "пони"
Учти, что последний head текущей миграции по БД - `c1e4d2a3b5f7`
# Frontend (CMS)
## Раздел "Лошади", вкладка "Лошади"
Убираем столбец "Тип", который ориентировался на поле `kind`. Фильтр оставляем. По умолчанию фильтр не выбран. Обрати внимание на то, что при выбранном фильтре по типу нам в селекторе фильтра по породам нужно оставить только те породы, которые подходят к этому типу (перезапрос)
Если активен любой фильтр по породам, фильтр по типу становится в disabled состояние, не выбрано ни одно значение и, соответственно, не передаётся в запросе лошадей
### Модальное окно добавление и изменения лошади
Необходимо убрать оттуда селектор типа
## Раздел "Лошади", вкладка "Породы"
Здесь мы просто добавляем колонку "Тип", как она сейчас реализована в раздел "Лошади", вкладке "Лошади". Фильтрация прямо в колонке. Отдельно не выносим в селектор
### Модальное окно добавление и изменения породы
Необходимо добавить туда селектор типа. По умолчанию выбран "Лошади"
# Frontend (Consumers)
Изменений не потребуется, пока что не работай в этих зонах
# Задача
Напиши в docs/plans/feature/horse_kind_to_breed_migration.md план по реализации этой фичи
Не приступай к реализации до явного согласования плана
При реализации backend учти, что перед тестами и созданием mock данных я вручную применю миграцию, после чего подниму backend