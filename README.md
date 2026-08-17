# Equestrian Site CMS

Инфраструктура и сервисы проекта Equestrian Site CMS.

## Быстрый старт

### Требования

- Docker & Docker Compose
- Make
- Git

### Настройка Монорепозитория

При первом запуске необходимо развернуть окружение и вытянуть все микросервисы:

```bash
# Создает нужные директории и копирует .env.example
make setup

# Клонирует или обновляет (pull) все репозитории сервисов из services.manifest
make sync
```

### Запуск проекта

```bash
# Запустите инфраструктуру, затем четыре core-сервиса
make infra notification email be fe
```

### Документация (user stories, MD)

```bash
make docs   # http://localhost:3333 — Docsify, каталог docs/, без сборки
```

Или по частям:

```bash
make infra         # PostgreSQL
make be            # Main Backend
make notification  # Notification Service
make email         # Email Service + Celery
make fe            # Frontend (Next.js)
```

## Дополнительные Make команды

- `make check` — non-mutating gate четырёх core-сервисов; `site-*` исключены.
- `make fix` — отдельный mutating autofix/format gate.
- `make build` / `make build-nc` — сборка backend, notification, email и CMS frontend.
- `make compose-check` / `make secret-scan` — статические release-проверки.
- Release/recreate/migration/readiness/rollback workflow: `docs/operations/core-release.md`.
- `make update` — алиас для `make sync`, обновляет код во всех репозиториях (`git pull`).
- `make test` / `make lint` — совместимые алиасы non-mutating `make check`.

## Разработка

### Frontend (Next.js)

Фронтенд по умолчанию запускается в режиме разработки (**development target**) с использованием Turbopack.

- **Порт:** `http://localhost:3000`
- **Hot Reload:** Включен (код монтируется из `services/frontend` в контейнер).
- **Env:** Используются `.env`, `.env.local`, `.env.prod` (по приоритету).

### Переменные окружения (.env)

Каждый сервис (`backend`, `frontend`, `notification-service`, `email-service`) хранит настройки в `services/<service-name>/`.

**Приоритет загрузки для Docker Compose:**

1. `.env` (обязательный, базовые настройки)
2. `.env.local` (опциональный, специфичен для фронтенда)
3. `.env.prod` (опциональный, переопределяет всё вышеперечисленное)

Если файл `.env.prod` существует, Docker Compose применит его значения поверх базовых.

## Структура проекта

- `.docker-compose/` — файлы конфигурации Docker Compose.
- `services/` — исходный код; authoritative список ведётся в `SERVICES.md` и `services.manifest`.
- `scripts/` — вспомогательные скрипты.
