# Сервисы SEO-модуля

Данный документ описывает микросервисы SEO-модуля, их роли, технологии и взаимодействие.

---

## 📋 Обзор сервисов

| Сервис | Статус | Роль | Технологии |
|--------|--------|------|-----------|
| `seo-service` | ✅ Реализован | Оркестратор расписаний и общих сущностей | Python, FastAPI, PostgreSQL, NATS, Celery |
| `yandex-service` | 🏗️ Foundation only | Хранение OAuth credentials для Яндекс.Метрика/Вебмастер | Python, FastAPI, PostgreSQL, Fernet encryption |
| `yandex-metrics-parser-service` | 🔜 Планируется | Парсинг метрик Яндекс.Метрики | Python, FastAPI, PostgreSQL, NATS |
| `yandex-auth-service` | 🔜 Планируется | Авторизация для Яндекс.Метрики | Python, FastAPI, PostgreSQL, OAuth 2.0 |

---

## ⚙️ seo-service

**Статус:** Реализован (foundation-этап)  
**Git:** `git@github.com:igor-526/EqSiteCMS-seo-service.git`  
**Путь:** `services/seo-service/`

### Назначение

Центральный оркестратор SEO-модуля. Управляет расписаниями парсингов, хранит общие SEO-сущности и ставит задачи парсерам через NATS JetStream.

### Технологический стек

- **Python 3.11+**
- **FastAPI** — веб-фреймворк для API
- **PostgreSQL** — хранение расписаний и общих сущностей (БД `seo_service`)
- **NATS JetStream** — публикация задач парсерам (stream `SEO_TASKS`)
- **Celery + Redis** — планирование периодических задач
- **Alembic** — миграции схемы БД
- **SQLAlchemy** — ORM для работы с БД

### Архитектура

Следует **Clean Architecture**:

```
services/seo-service/
├── app/
│   ├── core/          # Бизнес-логика (domain models, use cases)
│   ├── api/           # FastAPI endpoints (routers, schemas)
│   ├── repositories/  # Слой доступа к данным (PostgreSQL)
│   └── infrastructure/ # NATS, Celery, зависимости
├── migrations/        # Alembic миграции
├── tests/             # Тесты (unit, integration, smoke)
└── celeryconfig.py    # Конфигурация Celery
```

### Основные компоненты

#### 1. Хранение расписаний

**Таблица:** `parsing_schedules`

**Назначение:** Декларативное описание того, какие парсинги и как часто запускать.

**Поля (примерные, детали в миграциях):**
- `id` — идентификатор расписания
- `site_id` — ID сайта, для которого собираются метрики
- `parser_type` — тип парсера (например, `yandex_metrics`)
- `schedule_cron` — расписание в cron-формате
- `params` — JSON с параметрами парсинга
- `is_active` — флаг активности расписания

#### 2. Celery задачи

**Задача:** `schedule_parsing`

**Частота:** Например, каждые 5 минут (конфигурируется через Celery Beat)

**Логика:**
1. Читает активные расписания из `parsing_schedules`
2. Для каждого расписания проверяет, пора ли запускать задачу (по cron-расписанию)
3. Формирует NATS-message с параметрами задачи
4. Публикует message в stream `SEO_TASKS` на subject `seo.tasks.<parser_type>`

#### 3. NATS интеграция

**Stream:** `SEO_TASKS`

**Publisher:** `seo-service` публикует задачи через `nats.js.publish()`

**Формат message:** JSON (см. [protocols.md](./protocols.md))

#### 4. API endpoints (будут реализованы в отдельной задаче)

**Планируется:**
- `GET /api/v1/schedules` — список расписаний (protected)
- `POST /api/v1/schedules` — создание расписания (protected)
- `PATCH /api/v1/schedules/{id}` — обновление расписания (protected)
- `DELETE /api/v1/schedules/{id}` — удаление расписания (protected)

**Access policy:** Protected Write (требуется авторизация)

### Общие SEO-сущности (будут добавлены в отдельной задаче)

**Планируется:**
- `search_queries` — общие поисковые запросы для всех сайтов
- `site_paths` — URL-пути сайтов для отслеживания

**Назначение:** Избежать дублирования данных между парсерами, предоставить единый справочник для всех SEO-сервисов.

### Что НЕ делает seo-service

- ❌ Не выполняет парсинг метрик сам
- ❌ Не хранит результаты парсинга
- ❌ Не агрегирует данные из парсеров
- ❌ Не взаимодействует напрямую с внешними API (Яндекс.Метрика, Google Analytics и т.д.)

### Зависимости

**Runtime:**
- PostgreSQL (БД `seo_service`)
- NATS JetStream (stream `SEO_TASKS`)
- Redis (Celery broker/backend)

**Development:**
- `fastapi-template` — базовая структура сервиса (использовался как отправная точка)

### Документация

- [Архитектура SEO-модуля](./architecture.md)
- [Протоколы NATS и Celery](./protocols.md)
- [README сервиса](../../services/seo-service/README.md)

---

## 🏗️ yandex-service

**Статус:** Foundation only (v0.1)  
**Git:** `git@github.com:igor-526/EqSiteCMS-yandex-service.git`  
**Путь:** `services/yandex-service/`

### Назначение

Централизованное хранение OAuth credentials для интеграций с Яндекс.Метрика и Яндекс.Вебмастер. Предоставляет безопасное хранение токенов с шифрованием и управление доступом к ним для парсеров.

### Текущее состояние (Foundation only)

**Реализовано (BE-2 — BE-9):**
- ✅ Infrastructure foundation (PostgreSQL БД `yandex_service`, Docker, Alembic migrations)
- ✅ Encryption utilities (Fernet для шифрования access/refresh токенов)
- ✅ Database schema (`yandex_accounts` с зашифрованными токенами)
- ✅ Health check endpoint (`GET /health`)
- ✅ Unit tests (encryption utilities, 10 tests)
- ✅ Integration tests (health check, 4 tests)
- ✅ Documentation (README, SEO docs)

**Ещё не реализовано (future work):**
- ⏳ OAuth 2.0 authorization flow (получение access/refresh токенов от Яндекса)
- ⏳ Token refresh mechanism (автоматическое обновление истёкших токенов)
- ⏳ Accounts API (CRUD операции для OAuth аккаунтов)
- ⏳ Яндекс.Метрика counters management (управление счётчиками)
- ⏳ Яндекс.Вебмастер hosts management (управление хостами)
- ⏳ Internal credentials API для парсеров (аутентифицированный доступ к токенам)
- ⏳ NATS integration для обработки событий удаления аккаунтов (`accounts.deleted`)

### Технологический стек

- **Python 3.13+**
- **FastAPI** — веб-фреймворк для API
- **PostgreSQL 16+** — хранение зашифрованных токенов (БД `yandex_service`)
- **Cryptography (Fernet)** — AES-128 CBC + HMAC-SHA256 шифрование для токенов
- **Alembic** — миграции схемы БД
- **SQLAlchemy Core** — низкоуровневый доступ к БД
- **Docker** — контейнеризация сервиса

### Архитектура

Следует **Clean Architecture**:

```
services/yandex-service/
├── src/
│   ├── core/            # Бизнес-логика (entities, protocols, schemas, services)
│   │   ├── encryption/  # Fernet encryption utilities
│   │   ├── entities/    # Pydantic domain models
│   │   ├── protocols/   # Repository interfaces
│   │   ├── schemas/     # DTO для API
│   │   └── services/    # Use cases (пока не используется)
│   ├── models/          # SQLAlchemy Core tables
│   ├── repositories/    # Реализации репозиториев (пока не используется)
│   ├── api/             # FastAPI routers
│   ├── depends/         # DI factories
│   └── utils/           # Инфраструктурные утилиты
├── migrations/          # Alembic миграции
├── tests/               # Тесты (unit, integration)
└── pyproject.toml       # uv project config
```

### Database Schema

#### Таблица: `yandex_accounts`

Хранит OAuth credentials для Яндекс аккаунтов (токены зашифрованы).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Связь с пользователем CMS (`backend-service`) |
| `encrypted_access_token` | TEXT | Зашифрованный access token |
| `encrypted_refresh_token` | TEXT | Зашифрованный refresh token |
| `expires_at` | TIMESTAMP | Время истечения access token |
| `requires_reauth` | BOOLEAN | Флаг: требуется повторная авторизация (истёк refresh token) |
| `deleted_at` | TIMESTAMP | Soft delete (для обработки событий удаления) |
| `created_at` | TIMESTAMP | Время создания записи |

**Индексы:**
- `idx_yandex_accounts_user_id` — быстрый поиск по `user_id`
- `idx_yandex_accounts_deleted_at` — для фильтрации активных аккаунтов

### API Endpoints

#### Current (Foundation)

**GET /health**

Проверка состояния сервиса и доступности БД.

**Access:** Public (anonymous и authenticated доступ разрешён)

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "error": "Database connection failed",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Future (Not Implemented)

**OAuth Flow:**
- `POST /api/v1/auth/authorize` — начать OAuth 2.0 flow (protected)
- `GET /api/v1/auth/callback` — обработка OAuth callback от Яндекса (public)

**Accounts Management:**
- `GET /api/v1/accounts` — список OAuth аккаунтов пользователя (protected)
- `GET /api/v1/accounts/{id}` — детали аккаунта (protected)
- `DELETE /api/v1/accounts/{id}` — удалить аккаунт (protected)

**Credentials API (для парсеров):**
- `GET /api/v1/credentials/{user_id}` — получить access token для парсера (protected, service-to-service)

**Counters/Hosts Management:**
- `GET /api/v1/counters` — список счётчиков Яндекс.Метрики (protected)
- `GET /api/v1/hosts` — список хостов Яндекс.Вебмастер (protected)

### Encryption

**Algorithm:** Fernet (AES-128 CBC + HMAC-SHA256)

**Key Generation:**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Usage Example:**
```python
from src.core.encryption import FernetEncryption
from src.settings import yandex_settings

encryptor = FernetEncryption(yandex_settings.encryption_key)

# Encrypt
encrypted = encryptor.encrypt("ya29.a0AfH6SMC...")

# Decrypt
plaintext = encryptor.decrypt(encrypted)
```

**Security:**
- ⚠️ Ключ должен быть **32 байта** в формате base64 (44 символа)
- ⚠️ Сохрани ключ в безопасном месте! Утрата ключа = утрата всех токенов
- ⚠️ В production используй secrets manager (Vault, AWS Secrets Manager)

### Testing

**Unit Tests (10 tests):**
- Encryption/decryption базового текста
- Encryption/decryption пустой строки
- Deterministic encryption (каждый раз новый ciphertext)
- Decryption с неверным ключом
- Decryption повреждённого ciphertext

**Integration Tests (4 tests):**
- Health check: БД доступна → 200 OK
- Health check: БД недоступна → 503 Service Unavailable
- Health check: структура JSON-ответа
- Health check: timestamp format ISO 8601

**Run Tests:**
```bash
# В корне монорепозитория
make test

# Или локально
cd services/yandex-service
uv run pytest
```

### Что НЕ делает yandex-service

- ❌ Не выполняет парсинг метрик сам (это делают парсеры)
- ❌ Не хранит результаты парсинга (хранятся в БД парсеров)
- ❌ Не управляет расписаниями парсингов (это делает `seo-service`)
- ❌ Не предоставляет публичный API для получения credentials (только service-to-service)

### Зависимости

**Runtime:**
- PostgreSQL 16+ (БД `yandex_service`, порт `5438`)
- Environment variable: `YANDEX_ENCRYPTION_KEY`

**Future (not yet implemented):**
- NATS JetStream (для обработки событий `accounts.deleted`)
- `backend-service` (для валидации `user_id` при создании аккаунтов)

### Взаимодействие с другими сервисами (future)

```
backend-service → NATS accounts.deleted → yandex-service
                                            ↓
                                   CASCADE DELETE:
                                   - yandex_accounts
                                   - counters
                                   - hosts

yandex-metrics-parser-service → yandex-service (GET /api/v1/credentials/{user_id})
                                        ↓
                                Decrypted access token
```

### Setup

**Quick Start:**
```bash
# 1. Запустить PostgreSQL
make infra

# 2. Сгенерировать encryption key (см. README)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 3. Применить миграции
make yandex-migrate

# 4. Запустить сервис
make yandex
```

Сервис доступен на `http://localhost:8006`

### Документация

- [README сервиса](../../services/yandex-service/README.md)
- [Alembic migrations](../../services/yandex-service/migrations/versions/)
- [Архитектура SEO-модуля](./architecture.md) (общий контекст)
- [NATS JetStream протоколы](../../agents/howto/nats-jetstream-protocols.md) (для future NATS integration)

---

## 🔜 yandex-metrics-parser-service

**Статус:** Планируется (не реализован)  
**Назначение:** Сбор метрик из Яндекс.Метрики для зарегистрированных сайтов.

### Планируемые возможности

- Подписка на NATS subject `seo.tasks.yandex_metrics`
- Получение задач от `seo-service` с параметрами парсинга (site_id, date_from, date_to, metrics)
- Аутентификация в Яндекс.Метрика API (OAuth 2.0 через `yandex-auth-service`)
- Загрузка метрик (просмотры, посещения, источники трафика и т.д.)
- Сохранение метрик в собственной БД `yandex_metrics_parser`

### Технологический стек (предварительно)

- Python 3.11+
- FastAPI
- PostgreSQL (БД `yandex_metrics_parser`)
- NATS JetStream (consumer для `SEO_TASKS`)
- Requests / HTTPX для взаимодействия с Яндекс.Метрика API

### Схема взаимодействия

```
seo-service → NATS SEO_TASKS → yandex-metrics-parser-service
                                          ↓
                                   Яндекс.Метрика API
                                          ↓
                                  БД yandex_metrics_parser
```

### Хранимые данные

**Таблицы (примерные):**
- `parsing_tasks` — лог выполненных задач парсинга
- `site_metrics` — метрики по сайтам (просмотры, посещения, bounce rate и т.д.)
- `traffic_sources` — источники трафика (органика, реферальный, прямой и т.д.)
- `top_pages` — самые популярные страницы

**Важно:** Результаты остаются в этом сервисе. `seo-service` не забирает их обратно.

### Что будет в отдельной задаче

- Реализация сервиса на основе `fastapi-template`
- Подписка на NATS
- Интеграция с `yandex-auth-service` для получения access token
- API для запроса метрик (например, `GET /api/v1/metrics/{site_id}`)

---

## 🔜 yandex-auth-service

**Статус:** Планируется (не реализован)  
**Назначение:** Централизованная авторизация для доступа к Яндекс.Метрика API.

### Планируемые возможности

- OAuth 2.0 flow для получения access token от Яндекс.Метрики
- Хранение refresh token для автоматического обновления доступа
- Предоставление API для получения access token парсерами
- Управление правами доступа к счётчикам Яндекс.Метрики

### Технологический стек (предварительно)

- Python 3.11+
- FastAPI
- PostgreSQL (БД `yandex_auth`)
- OAuth 2.0 клиент (например, Authlib)

### Схема взаимодействия

```
yandex-metrics-parser-service → yandex-auth-service
                                          ↓
                                   Яндекс OAuth API
                                          ↓
                                  БД yandex_auth (refresh tokens)
```

### Хранимые данные

**Таблицы (примерные):**
- `oauth_tokens` — access и refresh токены для Яндекс.Метрики
- `counter_permissions` — права доступа к конкретным счётчикам

### API endpoints (предварительно)

- `GET /api/v1/auth/token` — получить access token (protected, для парсеров)
- `POST /api/v1/auth/authorize` — начать OAuth flow (protected)
- `GET /api/v1/auth/callback` — обработка OAuth callback от Яндекс

### Что будет в отдельной задаче

- Реализация OAuth 2.0 flow
- Хранение и обновление токенов
- API для парсеров

---

## 🔄 Взаимодействие сервисов

### Основной flow парсинга Яндекс.Метрики (будущий)

1. **seo-service** публикует задачу в NATS `seo.tasks.yandex_metrics`
2. **yandex-metrics-parser-service** получает задачу
3. **yandex-metrics-parser-service** запрашивает access token у **yandex-auth-service**
4. **yandex-auth-service** возвращает действующий access token (обновляет, если истёк)
5. **yandex-metrics-parser-service** делает запрос к Яндекс.Метрика API
6. Яндекс.Метрика API возвращает метрики
7. **yandex-metrics-parser-service** сохраняет метрики в свою БД

### Независимость сервисов

- Каждый парсер может быть запущен/остановлен независимо
- Если парсер недоступен, задачи накапливаются в NATS (at-least-once delivery)
- Если `yandex-auth-service` недоступен, парсер ждёт или откладывает задачу (retry)

---

## 📚 Дополнительные материалы

- [Архитектура SEO-модуля](./architecture.md) — общая схема взаимодействия
- [Протоколы NATS и Celery](./protocols.md) — формат сообщений и задач
- [NATS JetStream протоколы](../agents/howto/nats-jetstream-protocols.md) — общие правила EqSiteCMS

---

## 🔮 Будущие расширения

### Google Analytics Parser

**Назначение:** Сбор метрик из Google Analytics 4

**Аналогично yandex-metrics-parser-service:**
- Подписка на `seo.tasks.google_analytics`
- OAuth через Google
- Хранение метрик в своей БД

### SEO Aggregator Service (опционально)

**Назначение:** Агрегация метрик из разных источников для построения сводных отчётов

**Концепция:**
- Читает данные из парсеров по запросу (REST API)
- Строит сводные дашборды
- Не дублирует метрики, только агрегирует

**Статус:** Не в приоритете, рассматривается после реализации базовых парсеров
