## 1. Backend: Permission checks для horse services

- [x] 1.1 В `services/backend/src/core/services/horse_service.py` добавить `_ADMIN_SCOPE_NAMES: frozenset[str] = frozenset({"SUPERUSER", "DEVELOPER"})` аналогично `PriceGroupService`
- [x] 1.2 В `services/backend/src/core/services/horse_service.py` добавить метод `_check_admin_permission(self, *, user: UserOutDto)` который проверяет наличие `SUPERUSER` или `DEVELOPER` scope
- [x] 1.3 В `services/backend/src/core/services/horse_service.py` добавить параметр `user: UserOutDto` в методы `create`, `update`, `delete`
- [x] 1.4 В методах `create`, `update`, `delete` вызвать `await self._check_admin_permission(user=user)` перед выполнением операции
- [x] 1.5 В `services/backend/src/api/horse_service.py` добавить зависимость `get_current_user` в эндпоинты `POST`, `PATCH`, `DELETE`
- [x] 1.6 В `services/backend/src/api/horse_service.py` передать `user` параметр в вызовы методов сервиса для `POST`, `PATCH`, `DELETE`
- [x] 1.7 Запустить существующие unit tests для horse services и убедиться, что они проходят

## 2. Backend: Фильтрация лошадей по наименованиям услуг

- [x] 2.1 В `services/backend/src/core/services/horse.py` (или аналогичном сервисе лошадей) добавить параметр `service_names: list[str] | None = None` в метод `get_filtered`
- [x] 2.2 В `services/backend/src/core/services/horse.py` добавить логику фильтрации: если `service_names` не пустой, фильтровать лошадей по наличию хотя бы одной услуги с указанным наименованием
- [x] 2.3 В `services/backend/src/api/horses.py` (или аналогичном API файле) добавить query parameter `service_names: list[str] | None = Query(None, description="Фильтр по наименованиям услуг")`
- [x] 2.4 Передать `service_names` в вызов метода `get_filtered` сервиса
- [x] 2.5 Проверить, что фильтрация работает корректно: по одному наименованию, по нескольким, с несуществующим наименованием, с пустым списком

## 3. Backend: Unit tests для permission checks

- [x] 3.1 Создать unit test: создание услуги пользователем с `DEVELOPER` scope успешно
- [x] 3.2 Создать unit test: создание услуги пользователем с `SUPERUSER` scope успешно
- [x] 3.3 Создать unit test: создание услуги пользователем с `ADMIN` scope возвращает `403`
- [x] 3.4 Создать unit test: обновление услуги пользователем с `DEVELOPER` scope успешно
- [x] 3.5 Создать unit test: обновление описания услуги пользователем с `ADMIN` scope возвращает `200`
- [x] 3.5.1 Создать unit test: обновление наименования услуги пользователем с `ADMIN` scope возвращает `403`
- [x] 3.5.2 Создать unit test: обновление услуги пользователем с `ADMIN` scope с тем же наименованием успешно
- [x] 3.6 Создать unit test: удаление услуги пользователем с `DEVELOPER` scope успешно
- [x] 3.7 Создать unit test: удаление услуги пользователем с `ADMIN` scope возвращает `403`
- [x] 3.8 Создать unit test: чтение услуги пользователем с `ADMIN` scope успешно (без проверки прав)
- [x] 3.9 Запустить все unit tests и убедиться, что они проходят

## 4. Backend: Unit tests для фильтрации по наименованиям услуг

- [x] 4.1 Создать unit test: фильтрация лошадей по одному наименованию услуги
- [x] 4.2 Создать unit test: фильтрация лошадей по нескольким наименованиям услуг
- [x] 4.3 Создать unit test: фильтрация с несуществующим наименованием услуги возвращает пустой список
- [x] 4.4 Создать unit test: фильтрация с пустым списком наименований возвращает все лошади
- [x] 4.5 Создать unit test: комбинирование фильтра по услугам с другими фильтрами
- [x] 4.6 Создать unit test: фильтрация по полному наименованию (не подстрока) - "продажа" не включает "продажа и аренда"
- [x] 4.7 Создать unit test: регистронезависимая фильтрация - "РАЗВЕДЕНИЕ" включает "разведение"
- [x] 4.8 Запустить все unit tests и убедиться, что они проходят

## 5. Frontend: Scope restrictions для horse services

- [x] 5.1 В `services/frontend/src/features/horses/hooks/useHorseScopes.ts` добавить enum `HORSE_SERVICE_SCOPES_ACTIONS` с действиями: `CREATE_HORSE_SERVICE`, `UPDATE_HORSE_SERVICE_NAME`, `UPDATE_HORSE_SERVICE_DESCRIPTION`, `UPDATE_HORSE_SERVICE`, `DELETE_HORSE_SERVICE`, `RETRIEVE_HORSE_SERVICE`
- [x] 5.2 В `services/frontend/src/features/horses/hooks/useHorseScopes.ts` добавить `horseServicePageScopesRegistry` где `DEVELOPER` и `SUPERUSER` имеют полный доступ, `ADMIN` — `RETRIEVE_HORSE_SERVICE`, `UPDATE_HORSE_SERVICE`, `UPDATE_HORSE_SERVICE_DESCRIPTION` (но не `CREATE_HORSE_SERVICE`, `DELETE_HORSE_SERVICE`, `UPDATE_HORSE_SERVICE_NAME`)
- [x] 5.3 В `services/frontend/src/features/horses/hooks/useHorseScopes.ts` добавить hook `useHorseServicePageActionScopes` аналогично `usePricePageActionScopes`
- [x] 5.4 В компонентах horse services использовать `useHorseServicePageActionScopes` для скрытия/блокировки кнопок создания, удаления и изменения наименования услуг для `ADMIN`
- [x] 5.5 Проверить, что кнопка «Создать услугу» скрыта для `ADMIN` и доступна для `DEVELOPER`
- [x] 5.6 Проверить, что кнопка «Изменить» доступна для `ADMIN` (может менять описание, URL, цену)
- [x] 5.7 Проверить, что поле «Наименование» заблокировано для `ADMIN` и доступно для `DEVELOPER`

## 6. Frontend: Component tests для scope restrictions

- [x] 6.1 Создать component test: кнопка «Создать услугу» скрыта для `ADMIN`
- [x] 6.2 Создать component test: кнопка «Создать услугу» доступна для `DEVELOPER`
- [x] 6.3 Создать component test: кнопки удаления услуг скрыты для `ADMIN`
- [x] 6.4 Создать component test: кнопки удаления услуг доступны для `DEVELOPER`
- [x] 6.5 Создать component test: поле «Наименование» заблокировано для `ADMIN`
- [x] 6.6 Создать component test: поле «Наименование» доступно для `DEVELOPER`
- [x] 6.7 Запустить все frontend tests и убедиться, что они проходят

## 7. Smoke tests для access matrix

- [x] 7.1 Smoke: `POST /horses/services` с `DEVELOPER` scope возвращает `200`
- [x] 7.2 Smoke: `POST /horses/services` с `SUPERUSER` scope возвращает `200`
- [x] 7.3 Smoke: `POST /horses/services` с `ADMIN` scope возвращает `403`
- [x] 7.4 Smoke: `POST /horses/services` без авторизации возвращает `401`/`403`
- [x] 7.5 Smoke: `PATCH /horses/services/{slug_or_id}` с `DEVELOPER` scope возвращает `200`
- [x] 7.6 Smoke: `PATCH /horses/services/{slug_or_id}` с `ADMIN` scope (обновление описания/URL/цены) возвращает `200`
- [x] 7.6.1 Smoke: `PATCH /horses/services/{slug_or_id}` с `ADMIN` scope (обновление наименования) возвращает `403`
- [x] 7.6.2 Smoke: `PATCH /horses/services/{slug_or_id}` с `ADMIN` scope (с тем же наименованием) возвращает `200`
- [x] 7.7 Smoke: `DELETE /horses/services/{slug_or_id}` с `DEVELOPER` scope возвращает `204`
- [x] 7.8 Smoke: `DELETE /horses/services/{slug_or_id}` с `ADMIN` scope возвращает `403`
- [x] 7.9 Smoke: `GET /horses/services` с `ADMIN` scope возвращает `200`
- [x] 7.10 Smoke: `GET /horses/services/{slug_or_id}` с `ADMIN` scope возвращает `200`
- [x] 7.11 Smoke: `GET /horses?service_names=Разведение` возвращает отфильтрованный список лошадей (регистронезависимое полное совпадение)
- [x] 7.12 Smoke: `GET /horses?service_names=НесуществующаяУслуга` возвращает пустой список
- [x] 7.13 Smoke: `GET /horses?service_names=продажа` возвращает только лошадей с услугой "продажа", но не "продажа и аренда"
- [x] 7.14 Smoke: `GET /horses?service_names=РАЗВЕДЕНИЕ` возвращает лошадей с услугой "разведение" (регистронезависимо)
- [x] 7.15 Smoke: cleanup удаляет созданные записи из реальной PostgreSQL через API

## 8. Quality Gate

- [x] 8.1 Провести один общий review совокупного backend/frontend diff на соответствие proposal/design/specs, Clean Architecture и path ownership
- [x] 8.2 Проверить access matrix: anonymous/authenticated/scopes/foreign tenant и наличие нового исключения для horse services endpoints
- [x] 8.3 Подтвердить наличие и качество минимум 9 backend unit tests для permission checks и 5 unit tests для фильтрации по наименованиям услуг
- [x] 8.4 Проверить frontend tests относительно behavior diff: scopes, hidden/disabled buttons, readonly fields
- [x] 8.5 Из `services/frontend` повторно выполнить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`
- [x] 8.6 Проверить backend unit suite и smoke report, DB evidence из свежего `docker inspect`, отсутствие миграций/NATS/site-ad diff
- [x] 8.7 Сохранить единый Quality Gate report в `docs/reports`; findings вернуть владельцам, дождаться исправлений и повторить общий review
- [x] 8.8 После успешного Quality Gate синхронизировать delta specs в main specs, повторить strict validation и архивировать change
