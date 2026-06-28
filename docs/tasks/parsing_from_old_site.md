# Контекст
У нас есть старый сайт на Joomla, на котором есть много информации. Проблема в том, что эта информация не структурирована, а находится только в HTML виде
Наша задача будет спарсить всю информацию в нашу БД
# Что мы парсим
На следующих страницах есть списки лошадей
- /index.php/ferma/horses
- /index.php/ferma/pony
Нам нужно найти все страницы, которые представляют собой страницу лошади
Примеры таких страниц:
- /index.php/ferma/pony/appaluza-pony/florian
# Где смотреть
- Сайт поднят на `http://localhost:8080/`
- Проект сайта находится тут: `/home/igor/projects/ad_joomla`
# Этап 1
Найди все страницы, на которых есть информация о лошади или пони (не списком, а страница для определённой единицы)
Запиши в md файл все страницы, которые будет нужно спарсить
Файл для результата: `docs/plans/parsing_from_old_site/step1.md`
# Этап 2
В результате выполнения этапа 1 у нас появился файл `docs/plans/parsing_from_old_site/step1.md` с разделом "Pages to parse"
Теперь нам необходимо привести информацию в системный вид. Я предлагаю систематизировать информацию в виде json файла. Самое сложное тут будет по разметке определить, что к чему относится
Я приведу пример:
```json
[
	{
		"path": "/index.php/ferma/horses/item/202-gospoja",
		"name": "Госпожа",
		"description": null,
		"services": [],
		"sex": "female",
		"breed": "Башкирская",
		"coat_color": "Мышастая",
		"kind": "horse",
		"bdate": "2007-05-21",
		"height": null,
		"photos": [
			"/images/home/horse/gospoja/1VNu-DKIiTyY.jpg"
		],
		"pedigree": {
			"sire": {
				"name": "Саян",
				"path": null,
				"photos": [],
				"owner": null,
				"coat_color_short": null,
				"bdate": null
			},
			"dam": {
				"name": "Газель",
				"path": null,
				"photos": [],
				"owner": null,
				"coat_color_short": null,
				"bdate": null
			},
			"children": []
		}
	},
	{
		"path": "/index.php/ferma/horses/item/200-sivilla",
		"name": "Сивилла",
		"description": null,
		"services": [],
		"sex": "female",
		"breed": "Башкирская",
		"coat_color": "Соловая",
		"kind": "horse",
		"bdate": "2006-05-26",
		"height": null,
		"photos": [
			"/images/home/horse/sivilla/0p07Kr69XcE8.jpg"
		],
		"pedigree": {
			"sire": null,
			"dam": {
				"name": "Газель",
				"path": null,
				"photos": [],
				"owner": null,
				"coat_color_short": null,
				"bdate": null
			},
			"children": []
		}
	},
	{
		"path": "/index.php/ferma/horses/gan-trk/valter",
		"name": "Вальтер",
		"description": "Рожден в хозяйстве КЗ 'Кировский'",
		"services": [
			"Предлагается к случке: 15 000 руб."
		],
		"sex": "male",
		"breed": "Тракененская",
		"coat_color": "Тёмно-гнедая",
		"kind": "horse",
		"bdate": "2000-04-05",
		"height": null,
		"photos": [
			"/images/home/horse/valter/1SNS1KsabLK8.jpg"
		],
		"pedigree": {
			"sire": {
				"name": "Эрот",
				"path": "base.ruhorses.ru/horses/pedigree.php?code_horse=995960",
				"photos": [
					"/images/home/horse/save/gan-trk/erot.jpg"
				],
				"owner": "Восход, кз",
				"coat_color_short": "гн",
				"bdate": "1974",
				"pedigree": {
					"sire": "...Второй уровень таблицы",
					"dam": "...Второй уровень таблицы"
				}
			},
			"dam": {
				"name": "Валюта",
				"path": "base.ruhorses.ru/horses/pedigree.php?code_horse=1003494",
				"photos": [
					"/images/home/horse/save/gan-trk/Valjuta-big.jpg"
				],
				"owner": "ЗАО 'Кировский конный завод'",
				"coat_color_short": "вор.",
				"bdate": "1993",
				"pedigree": {
					"sire": "...Второй уровень таблицы",
					"dam": "...Второй уровень таблицы"
				}
			},
			"children": [
				{
					"name": "Отважный",
					"path": "/index.php/ferma/horses/gan-trk/valter/item/321-otvagny",
					"photos": [
						"/images/home/horse/save/gan-trk/erot.jpg"
					],
					"sex": "male",
					"breed": "Тракененская порода",
					"bdate": "2015-02-27",
				},
				{
					"name": "Феерия Витта",
					"path": "/index.php/ferma/horses/gan-trk/valter/item/327-fieria",
					"photos": [
						"/index.php/ferma/horses/gan-trk/valter/item/327-fieria"
					],
					"sex": "female",
					"breed": "Тракененская порода",
					"bdate": "2016-02-19",
				}
			]
		}
	}
]
```
Твоя задача составить инструкцию по поиску всех атрибутов для корректного составления JSON файла. Не приступай к реализации до согласования инструкции
Оставь файл инструкции в `docs/plans/parsing_from_old_site/step2.md`
# Этап 3
Мы получили валидный json со спаршенными данными с того сайта. Теперь нам нужно поместить в БД всю эту информацию
Вся информация должна быть в этих моделях:
- `services/backend/src/models/breeds.py`
- `services/backend/src/models/coat_color.py`
- `services/backend/src/models/horse_owner.py`
- `services/backend/src/models/horse.py`
- `services/backend/src/models/photos.py`
C услугами разберёмся чуть позже
По фотографиям они мне нужны в виде файлов в одной папке: `/home/igor/projects/ad_joomla/all_photos_to_s3`
Я их самостоятельно занесу в s3. Нужны только соответствующие записи в БД
Для каждой таблицы мне нужен `.sql` файл, который заполнит данные
Найди сначала все уникальные породы, масти, владельцы, присвой им UUID и сделай соответствующие файлы для предварительного применения
Перемести все фотографии, которые будут задействованы в указанную папку
Построй `.sql` файл для занесения фотографий
Потом сделай файл на запись лошадей
## Equestrian ID
Для многих таблиц требуется указание uuid конюшни
Не привязывайся ни к чему. Сгенерируй рандомный UUID, который я потом смогу заменить на нужный
# Планирование
Сначала проанализируй полностью json файл. Потом построй план для построения `.sql` файлов. Напиши план по реализации этой задачи в `docs/plans/parsing_from_old_site/step3.md`
Не приступай к реализации до явного согласования плана. `.sql` файлы будем размещать в этой директории `docs/plans/parsing_from_old_site/scripts`
