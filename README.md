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
# Запуск всей инфраструктуры (NATS, Redis) и основных сервисов (DB, Backend, Frontend)
make up
```

### Документация (user stories, MD)

```bash
make docs   # http://localhost:3333 — Docsify, каталог docs/, без сборки
```

Или по частям:

```bash
make infra         # PostgreSQL
make be            # Main Backend
make fe            # Frontend (Next.js)
```

## Дополнительные Make команды

- `make build` — сборка всех docker-compose сервисов.
- `make update` — алиас для `make sync`, обновляет код во всех репозиториях (`git pull`).
- `make run` — алиас для `make up`.
- `make test` / `make lint` — зарезервированы для запуска проверок (пока выводят информационное сообщение).

## Разработка

### Frontend (Next.js)

Фронтенд по умолчанию запускается в режиме разработки (**development target**) с использованием Turbopack.

- **Порт:** `http://localhost:3000`
- **Hot Reload:** Включен (код монтируется из `services/fe` в контейнер).
- **Env:** Используются `.env`, `.env.local`, `.env.prod` (по приоритету).

### Переменные окружения (.env)

Каждый сервис (be, fe и др.) хранит свои настройки в папке `services/<service-name>/`.

**Приоритет загрузки для Docker Compose:**

1. `.env` (обязательный, базовые настройки)
2. `.env.local` (опциональный, специфичен для фронтенда)
3. `.env.prod` (опциональный, переопределяет всё вышеперечисленное)

Если файл `.env.prod` существует, Docker Compose применит его значения поверх базовых.

## Структура проекта

- `.docker-compose/` — файлы конфигурации Docker Compose.
- `services/` — исходный код сервисов (be, fe, vectorizing, structure-service, graphics-engine-service, statistics-service и др.).
- `scripts/` — вспомогательные скрипты.

