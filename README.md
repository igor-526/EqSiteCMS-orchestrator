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
- `make update` — алиас для `make sync`, обновляет код во всех репозиториях (`git pull`).
- `make test` / `make lint` — совместимые алиасы non-mutating `make check`.
- `make ship-test` — unit-тесты инструментов финализации (`scripts/shipctl`).

### Инструменты процесса

- **`scripts/stackctl`** — управление Docker-стеком (`up`, `rebuild`, `migrate`, `ready`, `status`, `logs`, `doctor`). См. `.agents/skills/stack-control/SKILL.md`.
- **`scripts/shipctl`** — детерминированная финализация задач (`status`, `plan`, `merge`, `release`, `ci`). JSON stdout, exit 0/1/2/3, `flock`. См. `.agents/skills/task-finalize/SKILL.md`.

```bash
# Синхронизация клонов manifest (строгий режим: ff-only, включая корень)
make sync SYNC_FLAGS="--strict --include-root --report .qa/ship/<c>/sync.json"

# Пересборка и health-check runtime-сервисов
scripts/stackctl ready app frontend site-ad site-ksk-inlove

# План слияния change (пофайловая классификация, имя ветки, блокеры)
scripts/shipctl plan --change <id> --summary "<text>" --paths-file paths.txt

# Merge в main (feature-ветки, commit, push; конфликт → --resume)
scripts/shipctl merge --plan .qa/ship/<c>/plan.json

# Dry-run без мутаций
scripts/shipctl merge --plan <f> --dry-run
scripts/stackctl ready <aliases> --dry-run
```

Release/recreate/migration/readiness/rollback workflow: `WORKFLOW.md`, `docs/operations/core-release.md`.

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
