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

- `make check` — нормативный core gate четырёх сервисов; его фактическая готовность здесь не подтверждена (R-G2 в [каталоге](<SERVICES.md#отложенные-gaps-яндекса>)), PASS не обещается.
- `make fix` — отдельный mutating autofix/format gate.
- `make build` / `make build-nc` — сборка только backend, notification, email и CMS frontend; сервисы Яндекса не включены.
- `make compose-check` / `make secret-scan` — статические release-проверки.
- `make update` — алиас для `make sync`, обновляет код во всех репозиториях (`git pull`).
- `make test` / `make lint` — делегируют одноимённые service targets расширенному набору по [Make:239–258](<Makefile#L239-L258>), включая оба сервиса Яндекса; это не алиасы `check` и не свидетельство PASS сервисных проверок.
- `make format` — делегирует service format targets, **изменяет файлы**. QG-FORMAT запускает format/lint/test только в затронутых сервисах (`make -C services/<svc> …`) в текущем рабочем дереве, см. [`agents/quality_gate.md`](agents/quality_gate.md).
- `make ship-test` — unit-тесты инструментов финализации (`scripts/shipctl`).

### Индивидуальные команды сервисов Яндекса

Роли, ресурсы и безопасный env inventory — в [каталоге сервисов](<SERVICES.md#8-yandex-service-и-9-ya-metrica-service>).

```bash
make yandex                 # Service Compose up -d
make yandex-attach          # Service Compose up с выводом в терминал
make yandex-build           # Индивидуальная сборка
make yandex-build-nc        # Сборка без cache
make ya-metrica              # Service Compose up -d
make ya-metrica-attach       # Service Compose up с выводом в терминал
make ya-metrica-build        # Индивидуальная сборка
make ya-metrica-build-nc     # Сборка без cache
```

Это наличие recipes, не гарантия готовности `check`/`ready`/release. До up нужны отдельные DB/dependencies и external network `eqsitecms_network`; service Compose их не поднимает и не гарантирует завершения миграций до app-start. `make infra` поднимает весь infra-набор, не только две DB. **App и DB host-порты публикуются без явного loopback bind** — dev Compose не разрешает публичное/production использование и не закрывает auth/token gaps.

На проверенном immutable baseline HEAD `4be101744e20299690773060a84c362184a2d5cc` в stackctl есть профиль `yandex` и alias `yandex-service`, но нет его DB; Metrica profile/alias и обе DB отсутствуют в явных registry только на этом HEAD, не обязательно в текущем дереве. Чужой local dirty overlay отличается от baseline, находится вне проверенного docs-only scope и не доказывает поддержку `ready`/`migrate`/release; R-G3 остаётся deferred. Обнаружение обоих репозиториев через manifest в shipctl plan не подтверждает release/ci/deployment поддержку. Подробная [матрица пределов и deferred gaps](<SERVICES.md#команды-и-пределы-поддержки-яндекса>) — в каталоге.

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

**Для перечисленного выше контура (не для сервисов Яндекса):**

1. `.env` (обязательный, базовые настройки)
2. `.env.local` (опциональный, специфичен для фронтенда)
3. `.env.prod` (опциональный, переопределяет всё вышеперечисленное)

Если файл `.env.prod` существует, Docker Compose применит его значения поверх базовых.

Для сервисов Яндекса этот приоритет **не действует**: service Compose подключает только обязательный `services/<service>/.env`, он же передаётся Make через `--env-file`. Infra использует независимый `.docker-compose/.env`; значения DB согласовываются оператором между контурами. Имена переменных, безопасные placeholders, volume defaults и предел полноты app settings приведены в [root env inventory](<SERVICES.md#безопасный-root-env-inventory-яндекса>). Реальные env не публиковать; полнота service `.env.example` здесь не подтверждается.

## Структура проекта

- `.docker-compose/` — файлы конфигурации Docker Compose.
- `services/` — исходный код; authoritative список ведётся в `SERVICES.md` и `services.manifest`.
- `scripts/` — вспомогательные скрипты.
