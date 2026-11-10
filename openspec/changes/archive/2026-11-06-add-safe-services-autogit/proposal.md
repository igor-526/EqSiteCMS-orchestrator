# Proposal

## Why

Запрос `docs/tasks/108_git_auto_commands.md` требует безопасной финализации изменений сразу в нескольких Git-репозиториях. Значительная часть уже описана и реализована в `shipctl` и `task-finalize`; нужны удобный Make-интерфейс, явные пользовательские ветка/сообщение и устранение несовместимостей текущего сквозного пути, а не второй механизм merge/release.

## What Changes

- Добавить `make services-autogit` как тонкий адаптер существующего `shipctl`, по умолчанию создающий только план. Обязательные `BRANCH` и `MESSAGE` задаются Make-переменными; `-b`/`-m` — служебные, игнорируемые GNU Make опции, а не параметры задачи.
- Добавить точные overrides `shipctl plan --branch ... --message ...`, сохранив автоматические conventions при отсутствии overrides.
- Сохранить пофайловое включение через `PATHS_FILE`, исключение foreign, ignored и секретов; не выполнять `git add *`, `git add .` или force-add. Включать безопасные скрытые файлы, удаления и обе стороны переименований.
- Исправить непосредственно необходимые разрывы plan → merge: dirty included не является блокером само по себе; единый ключ корневого репозитория; обязательный content fingerprint и проверка перед мутацией; единый global preflight и fail-closed discovery.
- Проверять `main` у корня и всех клонов из manifest до первой мутации, но коммитить/пушить только included-репозитории. Не клонировать отсутствующие репозитории автоматически.
- Повторно использовать существующие двухфазный merge, state/resume, fast-forward `main → release`, lock и CI. Remote push и возможный deploy требуют двух отдельных подтверждений; `RELEASE=1` лишь запрашивает предложение релиза после успешного merge.
- В `task-finalize` уточнить поддержку пользовательских overrides, подтверждение конкретного плана и выполнение Make-адаптера. Кнопка использует существующий канал Router; при отсутствии кнопки — текстовый gate с остановкой. Реализация UI в DSH не нужна.
- После approval явно согласовать противоречащий раздел `SERVICES.md` о `dev` с выбранным для этой автоматизации workflow от `main`; не делать скрытой миграции веток.

## Capabilities

### New Capabilities

Нет: поведение относится к существующей capability финализации.

### Modified Capabilities

- `task-shipping-tooling`: безопасный Make-интерфейс, точные overrides, whole-inventory preflight, защита selected content и два связанных с планом approval gates. Существующие merge/release/CI требования сохраняются.

## Impact

Будущие изменения: `Makefile`, `scripts/services-autogit`, `scripts/shipctl`, непосредственно связанные `scripts/ship/**`, tooling-тесты и fixtures, README/WORKFLOW, раздел Git-workflow SERVICES и `.agents/skills/task-finalize/SKILL.md`. Основные specs обновляются только при последующем sync. `agents/router.md` Planner не читает и не меняет; Router проверяет применимость собственных правил при передаче реализации.

HTTP endpoints, сервисный runtime, БД, NATS, UI и зависимости пакетов не меняются. API access matrix и anonymous/authenticated HTTP tests — неприменимы. Реальные push/merge/release/deploy не входят ни в планирование, ни в автоматический Quality Gate; approval на apply не является разрешением на remote-операции.
