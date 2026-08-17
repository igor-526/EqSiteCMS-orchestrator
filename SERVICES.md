# Архитектура и Сервисы

В данном документе описана высокоуровневая архитектура EqSiteCMS, роли микросервисов, инфраструктурных компонентов и способы их взаимодействия.

## 🚀 Общая архитектура

Проект построен по событийно-ориентированной микросервисной (и Service-Oriented) архитектуре.
Стек четко разделяет **Сбор/Аналитику данных**, **Бизнес-логику API** и **UI/Пользовательский интерфейс**.
Тяжёлые вычисления (кластеризация, сбор сторонней статистики) вынесены в асинхронные воркеры.

### Контур доступа API

EqSiteCMS поддерживает два контура доступа к API:

- **Public Read API**: публичные `GET` endpoint'ы для внешних сайтов-потребителей (например, `site-ad`) без авторизации.
- **Protected Admin API**: `POST`/`PATCH`/`DELETE` endpoint'ы для CMS-администрирования только с авторизацией и проверкой прав.

Исключения из этого дефолта допускаются только как явно задокументированные контрактные случаи.

---

## 🏗 Инфраструктура (Databases / Brokers)

- **PostgreSQL**: Основная транзакционная БД. Хранит пользователей, проекты, балансы, настройки сущностей.
- **Redis**: Брокер сообщений и backend для Celery. Номера БД распределены по сервисам (см. `agents/redis-databases.yaml`).
  - БД 0 — зарезервирована (кэш backend)
  - БД 1 — broker для email-service
  - БД 2 — backend для email-service
- **NATS Jetstream**: Система обмена событиями между сервисами. Используется для pub/sub и command-потоков.

---

## ⚙️ Основные сервисы (Микросервисы)


| Сервис        | Путь                | Роль                                                 |
| ------------- | ------------------- | ---------------------------------------------------- |
| Backend Core  | `services/backend`  | API и бизнес-логика CMS + public read API для сайтов |
| Frontend CMS  | `services/frontend` | Админский интерфейс CMS (авторизованный контур)      |
| Email Service | `services/email-service` | Отправка email через NATS-команды и Celery-очередь |
| Notification Service | `services/notification-service` | Маршрутизация notification-команд между backend и каналами доставки |
| Site: site-ad | `services/site-ad`  | Публичный сайт-потребитель read API                  |


### 1. Backend Core (`services/backend`)

**Технологии:** Python, FastAPI, Clean Architecture (core, api, repositories), SQLAlchemy, Alembic.  
**Роль:** Основной шлюз бизнес-логики и API-контрактов проекта.  
**Функциональность:**

- Обработка API-запросов для CMS (`services/frontend`).
- Публичная выдача данных для сайтов семейства `site-`* через public `GET`.
- Защищенные admin-операции (`POST`/`PATCH`/`DELETE`) с авторизацией и проверкой прав.
- Управление пользователями и auth-потоками.

### 2. Frontend CMS (`services/frontend`)

**Технологии:** React, Next.js, Turbopack, UI-kit.  
**Роль:** Клиентская часть CMS (SSR/CSR SPA), работающая в авторизованном контуре.  
**Функциональность:**

- Админские страницы и роутинг (`src/app`).
- Функциональные модули (`src/features`) для управления контентом и сущностями.
- Работа с protected admin API backend-сервиса.
- Ограничение: тяжелая бизнес-логика остается на backend.

### 3. Email Service (`services/email-service`)

**Технологии:** Python, FastAPI, Clean Architecture, NATS Jetstream, Celery + Redis.  
**Роль:** Асинхронная отправка email-уведомлений.  
**Функциональность:**

- Получает команды по NATS (`commands.notification.email.send`).
- Очередь задач Celery (`email`) для отложенной/фоновой отправки.
- DI-контейнер с NATS consumer и Celery app.
- Параллельные независимые системы: NATS для событий, Celery для задач в очереди.

### 4. Notification Service (`services/notification-service`)

**Технологии:** Python, FastAPI, PostgreSQL, NATS JetStream.
**Роль:** принимает события backend и публикует команды каналам доставки по каноническому AsyncAPI-контракту. Входит в core release scope.

### 5. Public Site `site-ad` (`services/site-ad`)

**Технологии:** отдельный фронтенд-проект сайта.  
**Роль:** Внешний сайт-потребитель API EqSiteCMS.  
**Функциональность:**

- Использует public read API backend-сервиса (преимущественно `GET` без авторизации).
- Не использует CMS-only endpoint'ы для администрирования.
- Может иметь собственную презентационную логику и маршруты, но контент получает из backend EqSiteCMS.

---
