## ADDED Requirements

### Requirement: stackctl покрывает публичные сайты и готовность к ручной проверке
`scripts/stackctl` SHALL поддерживать aliases `site-ad` и `site-ksk-inlove` через их собственные `services/<site>/docker-compose.yaml` и `services/<site>/.env` в выделенных Compose-проектах `eqsitecms-site-ad` и `eqsitecms-site-ksk-inlove`; существующие имена контейнеров (`ad-site`, `site-ksk-inlove`) SHALL добавляться в явный allowlist, не расширяя управление на произвольные контейнеры. `stackctl` SHALL предоставлять mutating-команду `ready <alias...> [--dry-run] [--no-migrate]` под тем же `flock`: rebuild и recreate каждого alias, миграции профилей с миграциями, ожидание health (для сайтов без healthcheck — HTTP-проба опубликованного порта с ответом `<500`) и JSON-итог `{ ok, services: [{ alias, rebuilt, migrated, status, health, urls }] }`. Пустой список aliases SHALL возвращать `ok:true` с пометкой об отсутствии runtime-изменений. Отсутствие `.env` сайта или занятый порт MUST давать `ok:false` с причиной без автоисправления.

#### Scenario: Сайт пересобран для ручной проверки
- **WHEN** выполняется `scripts/stackctl ready site-ad`
- **THEN** контейнер пересобран из текущего кода, HTTP-проба успешна и JSON содержит URL `http://localhost:<опубликованный порт>`

#### Scenario: Dry-run готовности
- **WHEN** выполняется `scripts/stackctl ready --dry-run app frontend site-ad`
- **THEN** выводится план compose-операций и миграций без изменения контейнеров и без захвата lock

#### Scenario: Нет .env сайта
- **WHEN** у сайта отсутствует `services/<site>/.env`
- **THEN** `ready` возвращает `ok:false` с причиной `env_missing` для этого alias и exit `1`

### Requirement: Актуальная документация пайплайна
`WORKFLOW.md` SHALL описывать действующий Router-first OpenSpec-пайплайн от `docs/tasks` до релиза (propose → approval → execution units → Quality Gate lanes → `READY-FOR-MANUAL` → sync/archive → «Сливать в main?» → `MERGE` → «Релизить?» → `RELEASE` + CI) со ссылками на `AGENTS.md` и skill `.agents/skills/task-finalize` и MUST NOT предписывать создание планов в `docs/plans` или `gh pr create`. README SHALL перечислять `make sync SYNC_FLAGS=…`, `make ship-test`, `scripts/shipctl` и `scripts/stackctl ready`.

#### Scenario: Reviewer сверяет документацию
- **WHEN** reviewer сопоставляет `WORKFLOW.md`, `AGENTS.md`, README и Makefile
- **THEN** стадии, команды и конвенции веток/коммитов согласованы, а упоминания `docs/plans` встречаются только как legacy/read-only контекст
