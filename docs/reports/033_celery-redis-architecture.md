# Review: celery-redis-architecture

**Статус: ✅ APPROVED**
**Дата:** 2026-08-14
**Change:** `openspec/changes/celery-redis-architecture`
**Approval:** подтверждено пользователем
**Тип ревью:** Повторный ревью после REWORK

---

## Итог

Diff содержит корректную архитектурную документацию и инфраструктурные настройки для Celery+Redis. Предыдущий Quality Gate обнаружил **2 критических finding'а** (FINDING-01: Redis-пароль не встроен в URL, FINDING-02: одинарные кавычки в `.env`). **Оба finding'а исправлены.** Diff готов к merge.

---

## SMOKE-тесты

**Статус:** неприменимо

**Обоснование:** Это documentation-only diff. Нет runtime API-изменений. Все endpoint'ы email-service (`GET /health`) остаются без изменений. Celery-задачи не вызываются через HTTP. SMOKE-тесты по протоколу `.claude/skills/api-smoke-test/SKILL.md` неприменимы.

---

## Повторный ревью: Исправление Findings

### ✅ FINDING-01: Redis-пароль встроен в URL брокера/бэкенда Celery — ИСПРАВЛЕНО

**Статус:** RESOLVED

**Проверенные файлы:**

| Файл | До | После | Результат |
|------|-----|-------|-----------|
| `services/email-service/.env.example` | `redis://redis:6379/1` | `redis://:eqsitecmsredis@redis:6379/1` | ✅ |
| `services/email-service/.env` | `'redis://redis:6379/1'` | `redis://:eqsitecmsredis@redis:6379/1` | ✅ |
| `services/email-service/src/settings.py` | default без пароля | `redis://:eqsitecmsredis@redis:6379/1` | ✅ |
| `agents/howto/celery-protocols.md` | примеры без пароля | `redis://:<password>@redis:6379/1` | ✅ |
| `agents/redis-databases.yaml` | `redis://:<password>@redis:6379/1` | `redis://:<password>@redis:6379/1` | ✅ (уже был корректен) |

**Консистентность:**
- `.env` пароль (`eqsitecmsredis`) совпадает с `.docker-compose/.env` (`eqsitecmsredis`) ✅
- URL-формат `redis://:<password>@redis:6379/<db>` единообразен во всех файлах ✅
- Протокол `celery-protocols.md` документирует формат с паролем ✅

### ✅ FINDING-02: Одинарные кавычки удалены из `.env` — ИСПРАВЛЕНО

**Статус:** RESOLVED

**Проверка `.env`:**
```env
# CELERY SETTINGS
CELERY_APP_MAIN=email-service
CELERY_APP_BROKER=redis://:eqsitecmsredis@redis:6379/1
CELERY_APP_BACKEND=redis://:eqsitecmsredis@redis:6379/2

# REDIS
REDIS_PASSWORD=eqsitecmsredis
```

- Нет одинарных кавычек на каких-либо строках ✅
- Формат идентичен `.env.example` ✅

---

## Изменённые файлы

### Новые файлы
| Файл | Статус |
|------|--------|
| `agents/howto/celery-protocols.md` | ✅ Новый |
| `agents/redis-databases.yaml` | ✅ Новый |
| `openspec/changes/celery-redis-architecture/` | ✅ Новый (proposal, design, tasks) |

### Модифицированные файлы
| Файл | Статус |
|------|--------|
| `.docker-compose/docker-compose.infra.yml` | ✅ Добавлен Redis-сервис |
| `.docker-compose/docker-compose.email.yml` | ✅ Добавлен celery-worker |
| `agents/backend.md` | ✅ Добавлена секция 15 (Celery и Redis) |
| `agents/quality_gate.md` | ✅ Добавлен чеклист Celery/Redis |
| `SERVICES.md` | ✅ Добавлена Email Service секция, Redis/NATS в инфраструктуре |
| `agents/howto/nats-jetstream-protocols.md` | ✅ Добавлена секция документирования README |

### Код email-service (не в diff, уже в main)
| Файл | Статус |
|------|--------|
| `services/email-service/src/settings.py` | ✅ CelerySettings добавлен |
| `services/email-service/src/workers/celery_app.py` | ✅ Настроен |
| `services/email-service/src/workers/tasks/email.py` | ✅ Задача создана |
| `services/email-service/src/containers/application.py` | ✅ DI добавлен |
| `services/email-service/.env.example` | ✅ Переменные добавлены (с паролем) |
| `services/email-service/.env` | ✅ Переменные добавлены (без кавычек, с паролем) |
| `services/email-service/README.md` | ✅ Секция Celery добавлена |

---

## Чеклист: Архитектура (Backend)

- [x] `api/` не содержит бизнес-логики — ✅
- [x] `core/services/` зависит от Protocol-контрактов — ✅
- [x] `core/entities/` не импортирует `api/`, `depends/` — ✅
- [x] SQLAlchemy tables не импортированы в `core/` — ✅
- [x] Depends-сборка соблюдена — ✅
- [x] Бизнес-ошибки мапятся через `ClientError` — ✅
- [x] Бизнес-валидация не спрятана в `InDto` — ✅
- [x] `.env.example` содержит все переменные Celery/Redis — ✅ (FIXED: FINDING-01)
- [x] Протокол `celery-protocols.md` содержит все обязательные секции — ✅
- [x] Задачи определены в `src/workers/tasks/` с `@shared_task` и `autoretry_for` — ✅
- [x] Celery app зарегистрирован в DI-контейнере как `providers.Singleton` — ✅
- [x] docker-compose корректно запускает celery-worker с depends_on redis — ✅
- [x] Dockerfile включает `workers/` в сборку — ✅ (`COPY src ./src`)

---

## Чеклист: Access Policy (Backend/API)

Не применимо — нет endpoint'ов в этом diff. Celery-задачи не имеют HTTP-контракта.

---

## Чеклист: Код-стиль

- [x] PEP 8 — ✅ (pre-existing W292 в `core/protocols/`, не связан с этим diff)
- [x] Типизация — ✅ все публичные функции имеют аннотации типов
- [x] Нет `dict[str, Any]` как аргументов сервисов — ✅
- [x] Нет глобальных синглтонов — ✅ celery_app передаётся через DI
- [x] Конвенции именования — ✅ snake_case для переменных, CamelCase для классов

---

## Чеклист: Документация

- [x] `celery-protocols.md` содержит все секции — ✅ (Обзор, Архитектура, Конфигурация, Переменные, Celery App, DI, Задачи, Структура файлов, Docker-compose, Best practices)
- [x] `redis-databases.yaml` корректно структурирован — ✅
- [x] `README.md` email-service содержит секцию Celery — ✅
- [x] `SERVICES.md` обновлён с Redis и Email Service — ✅
- [x] `agents/backend.md` секция 15 добавлена — ✅
- [x] `agents/quality_gate.md` чеклист Celery добавлен — ✅

---

## Чеклист: Docker-compose

- [x] Redis запускается с паролем (`--requirepass`) — ✅
- [x] Redis имеет volume (`eqsitecms_redis_data`) — ✅
- [x] Redis в сети `eqsitecms_network` — ✅
- [x] Redis образ `redis:7-alpine` — ✅
- [x] celery-worker depends_on redis — ✅
- [x] celery-worker команда `celery -A workers.celery_app worker -Q email -l info` — ✅
- [x] celery-worker использует ту же сборку (Dockerfile) — ✅
- [x] celery-worker подключается к Redis с паролём — ✅ (FIXED: FINDING-01)

---

## Чеклист: Соответствие БД Redis

| Источник | БД 0 | БД 1 | БД 2 |
|----------|------|------|------|
| `agents/redis-databases.yaml` | reserved (кэш) | email-service broker | email-service backend |
| `settings.py` CelerySettings default | — | `redis://:...@redis:6379/1` | `redis://:...@redis:6379/2` |
| `.env.example` | — | `redis://:...@redis:6379/1` | `redis://:...@redis:6379/2` |
| `.env` | — | `redis://:...@redis:6379/1` | `redis://:...@redis:6379/2` |
| `celery_app.py` | — | через `celery_settings` | через `celery_settings` |

**Результат:** ✅ Полное соответствие

---

## Чеклист: Тесты

- `make test`: ✅ 3 passed, 0 failed
- `make lint`: ⚠️ 4 mypy errors (pre-existing, не введены этим diff)
  - 3 celery/kombu `import-untyped` — celery не предоставляет type stubs
  - 1 NATS `Incompatible types in assignment` — pre-existing bug в `notification_commands_send_email.py`

---

## Рекомендуемая ветка

`main` (все изменения в working tree, не в feature-ветке)

---

## Non-blocking observations (не блокируют merge)

1. **Hardcoded password в `CelerySettings` default**: `settings.py` содержит `default="redis://:eqsitecmsredis@redis:6379/1"`. В production это значение будет переопределено через `.env`, но default-значение содержит реальный пароль dev-окружения. Рекомендация: рассмотреть использование placeholder `redis://:<password>@redis:6379/1` как default с явной инструкцией в `.env.example`.
2. **mypy import-untyped для celery/kombu**: Celery не предоставляет type stubs. Рекомендация: добавить `ignore_missing_imports` для `celery` и `kombu` в `pyproject.toml` mypy config (опционально, отдельная задача).

---

## Quality Gate: Финальная вердикт

| Проверка | Результат |
|----------|-----------|
| OpenSpec proposal/design/tasks | ✅ Подтверждены пользователем |
| Architecture checklist | ✅ Пройден |
| Code style | ✅ Пройден |
| Documentation | ✅ Пройдена |
| Docker-compose | ✅ Пройден |
| Redis DB consistency | ✅ Полное соответствие |
| .env.example completeness | ✅ Все переменные present |
| FINDING-01 (Redis password in URL) | ✅ FIXED |
| FINDING-02 (Single quotes in .env) | ✅ FIXED |
| Unit-тесты | ✅ 3/3 passed |
| SMOKE-тесты | ⬜ неприменимо (documentation-only) |

**Статус: ✅ APPROVED — готово к merge.**
