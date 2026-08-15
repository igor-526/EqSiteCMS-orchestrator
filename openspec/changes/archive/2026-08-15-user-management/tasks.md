## 1. Database Migration (Backend)

- [x] 1.1 Создать Alembic миграцию: добавить `is_deleted` (boolean, default=false, not null), `deleted_at` (datetime, nullable), `is_blocked` (boolean, default=false, not null) в таблицу `users`
- [x] 1.2 Добавить индексы на `is_deleted` и `is_blocked` в миграции
- [x] 1.3 Применить миграцию и проверить, что существующие пользователи имеют дефолтные значения

## 2. User Entity и SoftDelete (Backend)

- [x] 2.1 Обновить сущность `User` в `core/entities/user.py`: добавить наследование от `SoftDeleteMixin` или добавить поля `is_deleted`, `deleted_at` напрямую
- [x] 2.2 Добавить поле `is_blocked: bool` в сущность `User`
- [x] 2.3 Обновить SQLAlchemy модель пользователя в `db/models/user.py` (или аналогичном файле) с новыми полями

## 3. Сидирование роли USER_MANAGER (Backend)

- [x] 3.1 Добавить роль `USER_MANAGER` в `services/backend/src/core/seeds/user_scopes.json` с фиксированным UUID и описанием "Управление пользователями"
- [x] 3.2 Проверить, что сидер корректно создаёт новую роль при запуске

## 4. Dependency для проверки UM/SU (Backend)

- [x] 4.1 Создать dependency `require_user_management` в `depends/` который проверяет наличие scope `USER_MANAGER` или `SUPERUSER` у текущего пользователя
- [x] 4.2 Добавить middleware/проверку на блокировку: заблокированный пользователь получает `403 Forbidden`

## 5. Схемы для API управления пользователями (Backend)

- [x] 5.1 Создать схемы в `core/schemas/user_management.py`: `UserManagementOutDto`, `CreateUserIn`, `UpdateUserIn`, `ChangePasswordByAdminIn`, `RoleOutDto`
- [x] 5.2 Добавить фильтры: `UserManagementFilters` с полями `username`, `first_name`, `last_name`, `middle_name`, `scope_ids`, `search`, `is_blocked`
- [x] 5.3 Реализовать валидацию: пароли должны совпадать, требования к сложности пароля

## 6. Repository для управления пользователями (Backend)

- [x] 6.1 Расширить `UserRepositoryProtocol` или создать `UserManagementRepositoryProtocol` с методами: `get_users_with_filters`, `get_user_by_id`, `create_user`, `update_user`, `soft_delete_user`, `block_user`, `unblock_user`, `change_password`
- [x] 6.2 Реализовать метод `get_users_with_filters` с фильтрацией по всем полям (regex, ИЛИ для scope_ids, search по ФИО), пагинацией, сортировкой
- [x] 6.3 Реализовать стандартную сортировку: `is_blocked ASC`, затем `last_name ASC`
- [x] 6.4 Исключать удалённых пользователей (`is_deleted=false`) из всех запросов
- [x] 6.5 Реализовать метод `get_all_roles` с фильтрацией по `scope_name` (regex)

## 7. Service для управления пользователями (Backend)

- [x] 7.1 Создать `UserManagementService` в `core/services/user_management.py`
- [x] 7.2 Реализовать бизнес-логику: UM не может удалить/заблокировать самого себя, UM не может снять с себя роль UM, UM не может назначить SUPERUSER, UM не может действовать с SUPERUSER
- [x] 7.3 Реализовать логику soft-delete (установка `is_deleted=true`, `deleted_at=now()`)
- [x] 7.4 Реализовать логику блокировки/разблокировки (установка `is_blocked`)
- [x] 7.5 Реализовать смену пароля с хешированием

## 8. API Endpoints для управления пользователями (Backend)

- [x] 8.1 Создать файл `services/backend/src/api/user_management.py` с router prefix `/api/user-management`
- [x] 8.2 Реализовать `GET /api/user-management/users` — список пользователей с фильтрами, пагинацией, сортировкой
- [x] 8.3 Реализовать `GET /api/user-management/users/{id}` — получение конкретного пользователя
- [x] 8.4 Реализовать `POST /api/user-management/users` — создание пользователя
- [x] 8.5 Реализовать `PATCH /api/user-management/users/{id}` — обновление пользователя
- [x] 8.6 Реализовать `DELETE /api/user-management/users/{id}` — soft-delete
- [x] 8.7 Реализовать `PATCH /api/user-management/users/{id}/block` — блокировка
- [x] 8.8 Реализовать `PATCH /api/user-management/users/{id}/unblock` — разблокировка
- [x] 8.9 Реализовать `PATCH /api/user-management/users/{id}/password` — смена пароля
- [x] 8.10 Реализовать `GET /api/user-management/roles` — список ролей с поиском
- [x] 8.11 Зарегистрировать router в главном приложении FastAPI

## 9. Обновление сервисного endpoint (Backend)

- [x] 9.1 Обновить `GET /api/service/users` в `api/service_users.py`: добавить условие `WHERE is_deleted = false AND is_blocked = false`
- [x] 9.2 Проверить, что существующие тесты сервисного endpoint проходят с обновлённой логикой

## 10. API клиент и хуки (Frontend)

- [x] 10.1 Создать `src/shared/api/user-management.ts` с функциями для всех endpoint'ов управления пользователями
- [x] 10.2 Создать хук `useUserManagement.ts` для получения списка пользователей с фильтрами
- [x] 10.3 Создать хук `useUserRoles.ts` для получения списка ролей
- [x] 10.4 Создать хуки для CRUD операций: `useCreateUser`, `useUpdateUser`, `useDeleteUser`, `useBlockUser`, `useChangePassword`

## 11. Страница управления пользователями (Frontend)

- [x] 11.1 Создать страницу `services/frontend/src/app/(protected)/users/page.tsx`
- [x] 11.2 Реализовать layout страницы с header (пагинация, поиск, кнопка добавления)

## 12. Таблица пользователей (Frontend)

- [x] 12.1 Создать компонент `UserManagementTable` в `src/features/user-management/`
- [x] 12.2 Реализовать колонки: Username, Фамилия, Имя, Отчество, Роль, Забл., Действия
- [x] 12.3 Реализовать фильтры в каждой колонке (кроме Действий)
- [x] 12.4 Реализовать сортировку по колонкам
- [x] 12.5 Реализовать отображение ролей в виде разноцветных тегов (спектр от красного до зелёного, fallback серый)
- [x] 12.6 Реализовать отображение статуса блокировки (красный/зелёный тег)

## 13. Кнопки действий (Frontend)

- [x] 13.1 Создать компонент `UserActionsCell` с кнопками: Сменить пароль, Заблокировать/Разблокировать, Удалить
- [x] 13.2 Подобрать иконки для каждой кнопки
- [x] 13.3 Реализовать условную видимость кнопок в зависимости от роли текущего пользователя и целевого пользователя

## 14. Модальные окна (Frontend)

- [x] 14.1 Создать модальное окно `ChangePasswordModal` с полями "Новый пароль" и "Подтвердить пароль"
- [x] 14.2 Создать модальное окно `ConfirmBlockModal` для подтверждения блокировки/разблокировки
- [x] 14.3 Создать модальное окно `ConfirmDeleteModal` с предупреждением о необратимости
- [x] 14.4 Создать модальное окно `UserFormModal` для создания/редактирования пользователя (единое окно)
- [x] 14.5 Реализовать валидацию в модальных окнах (совпадение паролей, сложность, уникальность username)

## 15. Sidebar кнопка (Frontend)

- [x] 15.1 Добавить кнопку "Пользователи" в `src/widgets/sidebar/` после всех остальных кнопок
- [x] 15.2 Подобрать иконку для кнопки (например, иконка пользователей)
- [x] 15.3 Реализовать условную видимость кнопки только для USER_MANAGER и SUPERUSER

## 16. Unit тесты (Backend)

- [x] 16.1 Написать тесты для `UserManagementService`: проверка бизнес-правил (UM не может удалить себя, UM не может заблокировать SU, и т.д.)
- [x] 16.2 Написать тесты для `UserManagementRepository`: фильтрация, пагинация, сортировка
- [x] 16.3 Написать тесты для API endpoints: валидация, статус-коды, access control
- [x] 16.4 Написать тесты для обновлённого `service_users`: исключение удалённых/заблокированных

## 17. SMOKE тесты (Backend)

- [x] 17.1 SMOKE: `GET /api/user-management/users` — unauthorized request возвращает 401
- [x] 17.2 SMOKE: `GET /api/user-management/users` — authorized request с USER_MANAGER возвращает 200
- [x] 17.3 SMOKE: `POST /api/user-management/users` — создание пользователя
- [x] 17.4 SMOKE: `PATCH /api/user-management/users/{id}` — обновление пользователя
- [x] 17.5 SMOKE: `DELETE /api/user-management/users/{id}` — soft-delete
- [x] 17.6 SMOKE: `PATCH /api/user-management/users/{id}/block` — блокировка
- [x] 17.7 SMOKE: `PATCH /api/user-management/users/{id}/unblock` — разблокировка
- [x] 17.8 SMOKE: `PATCH /api/user-management/users/{id}/password` — смена пароля
- [x] 17.9 SMOKE: `GET /api/user-management/roles` — получение ролей
- [x] 17.10 SMOKE: `GET /api/service/users` — проверка исключения заблокированных/удалённых

## 18. Quality Gate

- [x] 18.1 Запустить линтинг кода backend и frontend
- [x] 18.2 Запустить форматтинг кода backend и frontend
- [x] 18.3 Запустить все unit тесты backend
- [x] 18.4 Запустить SMOKE тесты на реальном API
- [x] 18.5 Проверить Clean Architecture (backend)
- [x] 18.6 Проверить FSD структуру (frontend)
- [x] 18.7 Проверить Access Matrix для всех endpoint'ов
- [x] 18.8 Проверить, что нет случайной приватизации публичных GET
- [x] 18.9 Проверить, что нет случайного открытия POST/PATCH/DELETE без авторизации
