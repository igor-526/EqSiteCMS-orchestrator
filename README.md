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

# Read-only диагностика адаптера
node scripts/services-autogit --help
```

### Безопасная финализация через Make

После QG → ready → sync/archive Router предлагает точные ветку и subject, затем создаёт финальный план. Примеры ниже — шаблоны для fake-root/local-only проверки, не разрешение выполнять shipping в рабочем checkout. `PLAN_TOKEN` и `RELEASE_TOKEN` заменяются значениями из показанных preview **только после** соответствующего ответа пользователя.

```bash
# ACTION=plan по умолчанию: только план, без commit/push
make services-autogit CHANGE=task-108 BRANCH=feature/seo-improve \
  MESSAGE="Улучшено SEO" PATHS_FILE=.qa/task-108/paths.txt

# Только после gate «Слить в main?» для конкретного PLAN_TOKEN
make services-autogit ACTION=merge PLAN=.qa/ship/task-108/plan.json \
  CONFIRM_PUSH='PLAN_TOKEN' RELEASE=1

# Поздний read-only preview (REPOS необязателен)
make services-autogit ACTION=release CHANGE=task-108 REPOS=backend,frontend

# Только после отдельного gate «Релизить?» с тем же REPOS
make services-autogit ACTION=release CHANGE=task-108 REPOS=backend,frontend \
  CONFIRM_RELEASE='RELEASE_TOKEN'
```

- Для plan обязательны `CHANGE`, `BRANCH`, `MESSAGE`, `PATHS_FILE`; для merge — `PLAN`, `CONFIRM_PUSH`; для release — `CHANGE`. Без `CONFIRM_RELEASE` release создаёт только preview. `ACTION=plan`, `RELEASE=0` — defaults. `RELEASE=1` лишь намерение: после полного merge возвращаются `release_pending` и read-only preview, не deploy. При `RELEASE=0` поздний отдельно подтверждённый release разрешён.
- GNU Make `-b`/`-m` не передают параметры рецепту, `--release` не поддерживается; используйте `BRANCH=`, `MESSAGE=`, `RELEASE=1`. Для буквального `$` в Make CLI нужны `$$` и одинарные shell-кавычки: `MESSAGE='Цена $$5'`. Значения окружения передаются буквально. Subject однострочный, до 72 символов; точный `MESSAGE` не получает feat/fix-префикс, trailers сохраняются. Точная занятая ветка блокируется без автосуффикса. Прямой CLI также поддерживает `shipctl plan --branch ... --message ...`.
- `PATHS_FILE`: UTF-8, один literal путь от корня монорепозитория на строку, без glob/абсолютных путей/`..`; `services/<name>/...` направляется своему repo. Директория разворачивается только в dirty descendants. Whole-file: included коммитятся целиком, partial staging included не сохраняется. Foreign не коммитятся; foreign staged блокируют. Ignored/секреты исключаются либо блокируют; scanner не заменяет review.
- База — `main` у корня и **всех** manifest-клонов. Missing/dev/detached/незавершённая Git-операция — остановка без auto-clone/switch. Gate показывает repo/origin, included/foreign/exclusions, branch, subject/trailers и whole-file scope; предупреждает: **feature и main будут отправлены в origin**, strict sync может ff-обновить clean клоны вне included.
- `CONFIRM_PUSH` связан с `PLAN_TOKEN`, `CONFIRM_RELEASE` — с `RELEASE_TOKEN`, subset/SHA/origin и merge-state. Правка ветки/сообщения/scope требует replan и нового gate; stale plan не исполняется. Push release запускает workflow и возможный deploy: это отдельное согласие, не approval change или QG. Если кнопки нет — текстовый вопрос и остановка до ответа, без auto-yes.
- Lock/global preflight, durable state и fail-stop сохраняются. При partial/conflict показать успешные/failed/untouched repo и `resumeCommand`; только явный `scripts/shipctl merge --resume --change task-108` после ручного разрешения и проверки предусловий. Никаких auto-retry/rollback/stash/reset/clean или generic checkout-main после конфликта. Release после partial merge запрещён. Успешный путь оставляет клоны на main, release без checkout release. CI контролируется отдельно через `shipctl ci --wait` фоном.
- stdout — один JSON с `adapter_exit_code`: 0 успех/preview, 1 stop, 2 окружение, 3 invalid/stale. GNU Make при ошибке рецепта возвращает свой exit 2; исходный код смотрите в JSON. Код 3 не откатывает предыдущие стадии.

Подробный протокол: [task-finalize](.agents/skills/task-finalize/SKILL.md), [финализация](WORKFLOW.md#шаг-6-финализация-skill-task-finalize).

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
