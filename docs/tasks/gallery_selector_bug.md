# Контекст
В плане `docs/plans/feature/horses_management.md` мы реализовывали управление лошадьми
В рамках этой реализации была задача по управлению фотографиями лошадей
Суть в том, что ни одно действие в модальном окне не работает. Модальное окно работы с фотографиями лошадей работает некорректно
# Наблюдения
## Удаление фотографии
### Запрос.
POST `http://localhost:8001/api/horses/38855fb2-3649-460d-8f6c-8299e20afe7b/photos`
Body:
```json
{
    "photo_ids": []
}
```
Response:
```json
{
    "id": "38855fb2-3649-460d-8f6c-8299e20afe7b",
    "slug": "legacy-38855fb23649460d8f6c8299e20afe7b",
    "name": "Граняв",
    "description": "Подходит для начинающих всадников",
    "breed": {
        "id": "7736648c-e90a-412f-af69-72b1dd89f7f1",
        "name": "Морган",
        "short_name": "морг.",
        "slug": "morgan",
        "description": null
    },
    "coat_color": {
        "id": "54fa95db-c4c9-453b-840b-0428ac13d262",
        "name": "Вороно-чалая",
        "short_name": "вор.-чал.",
        "slug": "vorono-chalaya",
        "description": null
    },
    "kind": "pony",
    "height": 171,
    "sex": "geld",
    "bdate": "1960-02-17",
    "ddate": "1977-02-12",
    "bdate_mode": "ymd",
    "ddate_mode": "ymd",
    "horse_owner": {
        "id": "d5adf7a8-b889-4fe3-8e50-bf7080c602e9",
        "name": "Иванов26 Иван Иванович",
        "description": "Частный владелец лошадей",
        "type": "person",
        "address": "г. Город26, ул. Лесная, д. 26, кв. 53",
        "phone_numbers": [
            "+7 (962) 812-71-57"
        ]
    },
    "photos": [],
    "services": [],
    "this_stable": true,
    "bdate_formatted": "17.02.1960",
    "ddate_formatted": "12.02.1977",
    "age": 16
}
```
### Поведение UI
В модальном окне сразу же не были подхвачены обновления. Выбранная фотография осталась на месте
## Добавление 1-й фотографии
### Запрос
POST `http://localhost:8001/api/horses/38855fb2-3649-460d-8f6c-8299e20afe7b/photos`
Body:
```json
{
    "photo_ids": [
        "168085a1-674f-40c9-9879-0a78fa85cbce"
    ]
}
```
Response:
```json
{
    "id": "38855fb2-3649-460d-8f6c-8299e20afe7b",
    "slug": "legacy-38855fb23649460d8f6c8299e20afe7b",
    "name": "Граняв",
    "description": "Подходит для начинающих всадников",
    "breed": {
        "id": "7736648c-e90a-412f-af69-72b1dd89f7f1",
        "name": "Морган",
        "short_name": "морг.",
        "slug": "morgan",
        "description": null
    },
    "coat_color": {
        "id": "54fa95db-c4c9-453b-840b-0428ac13d262",
        "name": "Вороно-чалая",
        "short_name": "вор.-чал.",
        "slug": "vorono-chalaya",
        "description": null
    },
    "kind": "pony",
    "height": 171,
    "sex": "geld",
    "bdate": "1960-02-17",
    "ddate": "1977-02-12",
    "bdate_mode": "ymd",
    "ddate_mode": "ymd",
    "horse_owner": {
        "id": "d5adf7a8-b889-4fe3-8e50-bf7080c602e9",
        "name": "Иванов26 Иван Иванович",
        "description": "Частный владелец лошадей",
        "type": "person",
        "address": "г. Город26, ул. Лесная, д. 26, кв. 53",
        "phone_numbers": [
            "+7 (962) 812-71-57"
        ]
    },
    "photos": [
        {
            "id": "168085a1-674f-40c9-9879-0a78fa85cbce",
            "is_main": false,
            "url": "http://localhost:8001/media/5c4f806a-aa64-44f4-8ac4-705100b753af.jpg"
        }
    ],
    "services": [],
    "this_stable": true,
    "bdate_formatted": "17.02.1960",
    "ddate_formatted": "12.02.1977",
    "age": 16
}
```
### Поведение UI
В модальном окне сразу же не были подхвачены обновления. Добавленная фотография не появилась
## Добавление 2-й фотографии
Тест был произведён после перезахода в модальное окно
Добавленная фотография появилась в выбранных, но вместо фотографии отображён alt `168085a1-674f-40c9-9879-0a78fa85cbce`
### Запрос
POST `http://localhost:8001/api/horses/38855fb2-3649-460d-8f6c-8299e20afe7b/photos`
Body:
```json
{
    "photo_ids": [
        "168085a1-674f-40c9-9879-0a78fa85cbce",
        "038b8207-4a27-4444-96cb-7bece3ca99ed"
    ]
}
```
Response:
```json
{
    "id": "38855fb2-3649-460d-8f6c-8299e20afe7b",
    "slug": "legacy-38855fb23649460d8f6c8299e20afe7b",
    "name": "Граняв",
    "description": "Подходит для начинающих всадников",
    "breed": {
        "id": "7736648c-e90a-412f-af69-72b1dd89f7f1",
        "name": "Морган",
        "short_name": "морг.",
        "slug": "morgan",
        "description": null
    },
    "coat_color": {
        "id": "54fa95db-c4c9-453b-840b-0428ac13d262",
        "name": "Вороно-чалая",
        "short_name": "вор.-чал.",
        "slug": "vorono-chalaya",
        "description": null
    },
    "kind": "pony",
    "height": 171,
    "sex": "geld",
    "bdate": "1960-02-17",
    "ddate": "1977-02-12",
    "bdate_mode": "ymd",
    "ddate_mode": "ymd",
    "horse_owner": {
        "id": "d5adf7a8-b889-4fe3-8e50-bf7080c602e9",
        "name": "Иванов26 Иван Иванович",
        "description": "Частный владелец лошадей",
        "type": "person",
        "address": "г. Город26, ул. Лесная, д. 26, кв. 53",
        "phone_numbers": [
            "+7 (962) 812-71-57"
        ]
    },
    "photos": [
        {
            "id": "038b8207-4a27-4444-96cb-7bece3ca99ed",
            "is_main": false,
            "url": "http://localhost:8001/media/be220b57-85c2-4a56-84e3-fdd6eed5f3b4.jpg"
        },
        {
            "id": "168085a1-674f-40c9-9879-0a78fa85cbce",
            "is_main": false,
            "url": "http://localhost:8001/media/5c4f806a-aa64-44f4-8ac4-705100b753af.jpg"
        }
    ],
    "services": [],
    "this_stable": true,
    "bdate_formatted": "17.02.1960",
    "ddate_formatted": "12.02.1977",
    "age": 16
}
```
### Поведение UI
В модальном окне сразу же не были подхвачены обновления. Добавленная фотография не появилась
## Сделать фотографию главной
### Запрос:
POST `http://localhost:8001/api/horses/38855fb2-3649-460d-8f6c-8299e20afe7b/photos`
Body:
```json
{
    "main": "168085a1-674f-40c9-9879-0a78fa85cbce"
}
```
Response (400):
```json
{"detail":"body -> photo_ids: Field required"}
```
### Поведение UI
Отобразилась ошибка "body -> photo_ids: Field required"
# Задача
Селекторы фотографий на многих сущностях работают одинаково как в плане API, так и в плане UI отображения селектора
Есть вероятность, что на фронте это не переиспользуемая фича. Нужно проанализировать, так ли это и сделать переиспользуемой одну логику

В docs/plans/bugfix/gallery_selector_bug.md напиши план по исправлению этого бага и отчёт по реализации на frontend