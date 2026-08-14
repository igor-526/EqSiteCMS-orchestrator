# Quality Gate Report: Email Service

**Date:** 2026-08-14
**Service:** `services/email-service`
**Status:** 🔴 REWORK

---

## 1. Findings

### CRITICAL

#### F-C1: Schema mismatch между notification-service и email-service
- **Severity:** CRITICAL
- **Files:** 
  - `services/notification-service/src/core/schemas/messaging/notification_command_send_email.py`
  - `services/email-service/src/core/schemas/messaging/notification_command_send_email.py`
- **Description:** Два сервиса используют одинаковое имя класса `NotificationCommandSendEmailData`, но схемы кардинально различаются:
  - **notification-service:** `email: str | None`, `text: str | None` (2 опциональных поля)
  - **email-service:** `event_uuid: UUID` (required), `to: list[str]` (required, min_length=1), `subject: str` (required, max_length=500), `body: str` (required) + опциональные `cc`, `bcc`, `reply_to`, `from_name`, `from_email`
- **Impact:** notification-service публикует в NATS JSON `{"occurred_at": "...", "email": "...", "text": "..."}`, а email-service ожидает `{"event_uuid": "...", "to": [...], "subject": "...", "body": "..."}`. Валидация **всегда проваливается**. Письма **никогда не отправляются**.
- **Evidence:** В `notification-service/src/core/services/callback_request.py` создаётся `NotificationCommandSendEmailData(email="iigorrr526@gmail.com", text="Test email")`, что даже не соответствует его собственной схеме (поля опциональны, но email и text — явно не event_uuid/to/subject/body).
- **Handler поведение:** При ошибке валидации handler в email-service логирует `"Validation failed for incoming NATS message"` и делает `return` → NATS-сообщение **ack'ается** и теряется навсегда.
- **Fix:** 
  1. Привести схему notification-service к единому контракту с email-service (или создать shared schema в библиотеке).
  2. В notification-service `CallbackRequestService.process()` правильно заполнить все required поля: `event_uuid`, `to`, `subject`, `body`.
  3. Заменить хардкод `"iigorrr526@gmail.com"` и `"Test email"` на реальные данные из `CallbackRequestedData`.

---

#### F-C2: Валидационные ошибки теряются без nak — сообщение ack'ается
- **Severity:** CRITICAL  
- **File:** `services/email-service/src/clients/nats/handlers/notification_commands_send_email.py` (handler)
- **Description:** При ошибке валидации схемы handler делает `return` без `raise`. Consumer в `_process_message` после успешного вызова handler делает `message.ack()`. Сообщение ack'ается и **безвозвратно теряется**.
- **Fix:** При ошибке валидации нужно делать `message.nak()` или `raise`, чтобы сообщение было переобработано (с учётом max_deliver) или попало в dead-letter.

---

### MAJOR

#### F-M1: Нарушение DI — core-сервис импортирует конкретные реализации
- **Severity:** MAJOR
- **File:** `services/email-service/src/core/services/email_processing.py`, метод `complete_sending()`
- **Description:** Метод `complete_sending()` содержит прямые импорты:
  ```python
  from sqlalchemy import select
  from models.email_log import email_logs
  from utils.database import SessionFactory
  from repositories.email_log import SQLAlchemyEmailLogRepository
  ```
  Это нарушает архитектурное правило: `core/` не должен зависеть от `models/`, `repositories/`, `utils/database`. Бизнес-логика создаёт собственные сессии и конкретные репозитории.
- **Fix:** Вынести управление сессиями и создание репозитория наружу (в DI-контейнер / task layer). `complete_sending()` должен принимать repository через Protocol.

#### F-M2: repository=None в Celery task — DI нарушен
- **Severity:** MAJOR
- **File:** `services/email-service/src/workers/tasks/email.py`
- **Description:** Celery task создаёт `EmailProcessingService(repository=None, ...)` с `# type: ignore[arg-type]`. Метод `process_incoming_event()` требует repository и упадёт с `AttributeError`, если будет вызван. Метод `complete_sending()` обходит проблему собственными импортами (F-M1), но это костыль.
- **Fix:** В Celery task создать полноценную сессию и репозиторий, передать их в сервис.

#### F-M3: Три отдельных сессии в `complete_sending()` — нет транзакционной целостности
- **Severity:** MAJOR
- **File:** `services/email-service/src/core/services/email_processing.py`
- **Description:** Метод `complete_sending()` открывает 3 отдельных `SessionFactory()` сессии:
  1. Read записи
  2. Increment attempts  
  3. Update status (sent/failed)
  
  Между ними нет транзакционной гарантии. Если SMTP-отправка succeeds, но update статуса fails — письмо отправлено, но запись остаётся `pending`. Повторная обработка отправит дубликат.
- **Fix:** Обернуть в единую транзакцию или использовать outbox pattern.

#### F-M4: notification-service использует тестовые хардкод-данные
- **Severity:** MAJOR
- **File:** `services/notification-service/src/core/services/callback_request.py`
- **Description:** В `process()` захардкожены:
  ```python
  email_payload = NotificationCommandSendEmailData(
      email="iigorrr526@gmail.com",
      text="Test email"
  )
  ```
  Не используются данные из `CallbackRequestedData` (name, phone, comment) и `equestrian_id`.
- **Fix:** Формировать email_payload из реальных данных callback-заявки.

---

### MINOR

#### F-m1: Отсутствие unit-тестов для бизнес-логики
- **Severity:** MINOR
- **File:** `services/email-service/tests/`
- **Description:** Существуют только 3 тривиальных теста (health check, 404 на auth routes, CORS). Нет тестов для:
  - `EmailProcessingService.process_incoming_event()` — идемпотентность, обработка ошибок
  - `EmailProcessingService.complete_sending()` — статусы, attempts
  - `NotificationCommandSendEmailHandler` — валидация, диспатч в Celery
  - `SQLAlchemyEmailLogRepository` — CRUD операции
- **Fix:** Добавить unit-тесты с AsyncMock для repository и email_sender.

#### F-m2: mypy ошибки (4 штуки)
- **Severity:** MINOR
- **Files:** `src/workers/celery_app.py`, `src/workers/tasks/email.py`, `src/clients/nats/consumers/notification_commands_send_email.py`
- **Description:** 
  - 2 ошибки: missing library stubs для `celery` и `kombu`
  - 1 ошибка: `Incompatible types in assignment (expression has type "None", variable has type "PullSubscription")` в consumer stop()
  - 1 ошибка: missing stubs для kombu в celery_app
- **Fix:** Добавить `# type: ignore` или установить types-пакеты.

#### F-m3: Форматирование кода не соответствует ruff
- **Severity:** MINOR
- **Description:** `ruff check` нашёл 6 ошибок (auto-fixed), `ruff format` переформатировал 4 файла. Код не был предварительно отформатирован.
- **Fix:** Запускать `make format` перед коммитом.

#### F-m4: В notification-service `CallbackRequestService.process()` есть `print()` вместо `logger`
- **Severity:** MINOR
- **File:** `services/notification-service/src/core/services/callback_request.py`
- **Description:** Используются `print(payload)`, `print(equestrian_id)`, `print({"status": "ok", ...})` вместо logger.
- **Fix:** Заменить на `logger.info()` / `logger.debug()`.

#### F-m5: `_subscription` не инициализирован до `start()` — потенциальный AttributeError
- **Severity:** MINOR
- **File:** `services/email-service/src/clients/nats/consumers/notification_commands_send_email.py`
- **Description:** `self._subscription` устанавливается только в `start()`, но `stop()` может быть вызван до `start()`. `_subscription = None` в `stop()` присваивается, но чтение до `start()` вызовет `AttributeError`.
- **Fix:** Инициализировать `self._subscription = None` в `__init__`.

---

## 2. E2E Test Result

### Сценарий: Backend → callback_request → NATS → notification-service → NATS → email-service

**Результат: 🔴 FAILED — E2E flow неработоспособен**

#### Цепочка:
1. **Backend** `POST /callback_requests` → создаёт `CallbackRequestedData(callback_request_id, name, comment, phone)` → публикует в NATS subject `commands.notification.callback_requested` ✅
2. **Notification-service** → consume `CallbackRequestedData` → `CallbackRequestService.process()` → создаёт `NotificationCommandSendEmailData(email="iigorrr526@gmail.com", text="Test email")` → публикует в NATS subject `commands.notification.email.send` ✅ (публикация проходит)
3. **Email-service** → consume → `NotificationCommandSendEmailData.model_validate_json(payload)` → ❌ **VALIDATION FAILS** (отсутствуют required поля: `event_uuid`, `to`, `subject`, `body`)
4. Handler логирует ошибку, `return` → NATS message ack'ается → **сообщение потеряно**

#### Верификация схемы:
```python
# notification-service публикует:
{"occurred_at": "2026-08-14T...", "email": "iigorrr526@gmail.com", "text": "Test email"}

# email-service ожидает (required поля):
{"occurred_at": "...", "event_uuid": "UUID", "to": ["email@domain.com"], "subject": "Subject", "body": "<html>...</html>"}
```

#### Проверка идемпотентности:
- Идемпотентность в репозитории **реализована корректно** (`pg_insert` с `on_conflict_do_nothing`).
- **Но не может быть протестирована e2e**, т.к. запись никогда не создаётся из-за несовпадения схем.
- В ручном тесте через прямой вызов `process_incoming_event()` с корректным payload идемпотентность работает: второй вызов с тем же `event_uuid` возвращает `None` и не создаёт дубликат.

---

## 3. Миграция Check

**Статус: ✅ CORRECT**

Миграция `20260710_0002_add_email_logs.py` проверена:

| Проверка | Статус |
|----------|--------|
| Таблица `email_logs` создана | ✅ |
| PK: `id UUID` с `gen_random_uuid()` | ✅ |
| `event_uuid UUID` с `unique=True, nullable=False` | ✅ |
| Unique constraint через `create_index(ix_email_logs_event_uuid, unique=True)` | ✅ |
| Индекс `ix_email_logs_status` на `status` | ✅ |
| Индекс `ix_email_logs_created_at` на `created_at` | ✅ |
| Все поля из модели присутствуют | ✅ |
| `server_default` для `status='pending'`, `attempts=0`, `created_at`, `updated_at` | ✅ |
| `down_revision = "20260710_0001"` — корректная цепочка | ✅ |
| `downgrade()` корректно удаляет индексы и таблицу | ✅ |

**Примечание:** Миграция создаёт unique index, а не unique constraint напрямую через `UniqueConstraint`. Функционально эквивалентно, но `UniqueConstraint` был бы семантичнее для constraint'а.

---

## 4. Architecture Checklist

| Проверка | Статус | Комментарий |
|----------|--------|-------------|
| Бизнес-логика в `core/services/` | ⚠️ | Да, но `complete_sending()` нарушает правило |
| Зависимости через Protocol | ❌ | `complete_sending()` импортирует конкретные классы |
| Нет бизнес-логики в handlers | ✅ | Handler только валидирует и диспатчит |
| Идемпотентность по event_uuid | ✅ | `INSERT ON CONFLICT DO NOTHING` |
| Логирование всех полей email | ✅ | В SMTP sender и repository |
| Статусы: pending → sent / failed | ✅ | |
| Учёт attempts | ✅ | `increment_attempts()` |
| Обработка ошибок валидации | ⚠️ | Логируется, но сообщение ack'ается и теряется |
| SOLID: DI через container | ⚠️ | Container работает, но Celery task обходит DI |

---

## 5. Test Results

| Команда | Статус | Детали |
|---------|--------|--------|
| `make test` | ✅ 3/3 passed | Только health check тесты |
| `make lint` | ❌ 4 mypy errors | Missing stubs + assignment issue |
| `ruff check` | ⚠️ 6 errors (auto-fixed) | Код не отформатирован |
| `ruff format` | ⚠️ 4 files changed | Форматирование не применено |
| e2e flow | ❌ FAILED | Schema mismatch |

---

## 6. Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| MAJOR | 4 |
| MINOR | 5 |

### Blocking Issues (must fix before approve):
1. **F-C1:** Schema mismatch — email-отправка полностью неработоспособна
2. **F-C2:** Валидационные ошибки → ack → потеря сообщений
3. **F-M1:** Нарушение DI в `complete_sending()`
4. **F-M2:** `repository=None` в Celery task
5. **F-M3:** Отсутствие транзакционной целостности

