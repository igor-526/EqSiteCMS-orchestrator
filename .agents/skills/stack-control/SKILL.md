---
name: stack-control
description: Управление Docker-стеком EqSiteCMS через stackctl
whenToUse: Когда Quality Gate или другой агент должен проверить, диагностировать, перезапустить или пересобрать сервисы перед тестированием
---

# Stack Control

Используй только `scripts/stackctl` для управления контейнерами EqSiteCMS. CLI ограничен контейнерами `eqsitecms-*`, не выполняет `down`, удаление контейнеров или volumes.

## Контракт вывода

- stdout содержит только JSON; прогресс и человекочитаемая таблица идут в stderr.
- `status --json` возвращает JSON-массив объектов с полями `name`, `status`, `health`, `ports`, `project`.
- Остальные команды возвращают объект `{ "ok": true|false, ... }`.
- Exit `0` — успех; `1` — операция/валидация не прошла; `2` — Docker или advisory lock недоступны.
- Не разбирай JSON через `grep`. Используй `jq`, Node/Python JSON parser либо прочитай JSON как structured evidence.

## Read-only диагностика

```bash
scripts/stackctl status --json
scripts/stackctl logs app --since 5m
scripts/stackctl doctor app
```

`status`, `logs`, `doctor` не занимают lock и могут выполняться параллельно.

## Mutating-команды

```bash
scripts/stackctl up core
scripts/stackctl rebuild app
scripts/stackctl rebuild frontend
scripts/stackctl restart notification-service
scripts/stackctl migrate core
scripts/stackctl exec app <non-interactive-command...>
scripts/stackctl psql db -c "SELECT 1"
```

Они защищены системным `flock`: одновременно выполняется только одна mutating-операция. `exec` не добавляет `-it`; `psql` поддерживает только `-c`, чтобы агент не зависал на TTY.

Alias `app` соответствует Compose service key `backend`. CLI сам использует проект уже существующего контейнера, поэтому rebuild не переносит контейнер между `eqsitecms-be` и `eqsitecms-core`.

## Seed datasets

Команда принимает имена `qa`, `demo`, `clean`, но возвращает честный `ok:false`, пока в репозитории нет безопасной явной команды для такого датасета. Автоматические startup seeders статических справочников не считаются QA dataset. Не обходи отказ прямой правкой БД.

## QG-ENV

1. Собери runtime aliases из handoff execution units change (по D4: `backend→app`, `frontend→frontend`, `vk-service→vk-service,vk-celery-worker,vk-bot`, `site-ad→site-ad`, `site-ksk-inlove→site-ksk-inlove`).
2. Выполни `scripts/stackctl ready <aliases>` (пересборка, миграции, health).
3. При `ok:false` проверь `doctor` и `logs` причин сбоя.
4. Допускается максимум **две** repair-попытки. После второй одинаковой ошибки остановись и верни infrastructure finding; startup crash из кода сразу возвращай владельцу кода.
5. Сайты (`site-*`) пересобираются через те же `rebuild` механизмы; без healthcheck используется HTTP-проба.

## QG-LIVE / browser QA

Перед smoke или Playwright:

1. Убедись по parsed `status --json`, что backend/frontend имеют `status=running`; для контейнера с healthcheck требуется `health=healthy`.
2. Если контейнер unhealthy, собери `doctor` и `logs`.
3. Не запускай dev server с `&`: используй уже работающие Docker URL (`backend :8001`, frontend `:3001`) или `up`/`rebuild`.
4. Не выполняй бесконечные restart/rebuild циклы — максимум две repair-попытки.

## Alias сервисов

- `app` — backend (`backend` в Compose, `eqsitecms-app` в Docker)
- `frontend`
- `notification-service`
- `email-service`, `email-celery-worker`
- `vk-service`, `vk-celery-worker`, `vk-bot`
- `db`, `db-notifications`, `db-email`, `db-vk`
- `redis`, `nats`, `minio`
- `site-ad` — публичный сайт объявлений (контейнер `ad-site`, порт 5100)
- `site-ksk-inlove` — публичный сайт КСК INLOVE (контейнер `site-ksk-inlove`, порт 3000 по умолчанию)

## Профили

- `core` — infra + backend + notification + email + frontend, проект `eqsitecms-core`
- `be` — backend, проект `eqsitecms-be`
- `fe` — frontend, проект `eqsitecms-fe`
- `notification` — notification, проект `eqsitecms-notification`
- `email` — infra + email, проект `eqsitecms-email`
- `vk` — infra + VK, проект `eqsitecms-vk`
- `site-ad` — сайт объявлений, проект `eqsitecms-site-ad`
- `site-ksk-inlove` — сайт КСК INLOVE, проект `eqsitecms-site-ksk-inlove`

`up` откажется создавать конфликт, если детерминированное имя контейнера уже принадлежит другому Compose project. Для обслуживания такого контейнера используй service-команды (`rebuild`, `restart`) — они читают текущую project label.

## Команда ready

```bash
scripts/stackctl ready <alias...> [--dry-run] [--no-migrate]
```

Подготовка runtime к ручной проверке или live verification:

1. Preflight: проверка наличия `.env` файлов и свободных портов (для сайтов).
2. Rebuild каждого alias (пересборка из текущего кода).
3. Migrate профилей с миграциями (`be`, `notification`, `email`, `vk`) если не указан `--no-migrate`.
4. Health-проверка: для контейнеров с healthcheck — `healthy`, для сайтов без healthcheck — HTTP-проба `<500` за 60 секунд.
5. Сбор URLs: опубликованные порты → `http://localhost:<port>`, без портов → `internal service`.

**Пустой список aliases** → `ok:true`, сообщение «No runtime changes».

**Preflight failures:**
- `env_missing` — отсутствует `.env` файл сайта
- `port_busy` — порт занят другим процессом

**Использование в READY-FOR-MANUAL:**
- Router собирает runtime aliases из handoff execution units (по D4 из design.md).
- `stackctl ready <aliases>` — пересборка изменённых сервисов и сайтов.
- Ожидаемый результат для tooling change без runtime diff: «No runtime changes».
- Инфраструктурный сбой — максимум **две** repair-попытки (`doctor`, `logs`), затем infrastructure finding.

**--dry-run:** план операций (rebuild, migrate) без мутаций и без lock.
