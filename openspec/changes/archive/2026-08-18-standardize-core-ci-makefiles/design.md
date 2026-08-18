## Context

Исходный запрос: `docs/tasks/049_Makefiles.md`. Scope ограничен orchestration root и четырьмя core-сервисами из `services.manifest`: `backend`, `frontend`, `notification-service`, `email-service`. Consumer `site-ad` явно исключён.

Текущее состояние неоднородно:

- `services/backend` и `services/frontend` не имеют Makefile;
- notification/email имеют `test`, `lint`, `format`, но `lint` не полностью совпадает с уже принятым core gate, а `test` корректно исключает marker `infrastructure`;
- корневые `test` и `lint` являются алиасами расширенного `check`, который включает build/compose/AsyncAPI/secret проверки, а `format` форматирует только backend;
- инструкции агентов частично требуют корневые команды, но не фиксируют единый сервисный Makefile-контракт.

GitHub Actions worker не поднимает инфраструктуру, поэтому CI-facing `test` обязан выбирать автономные suites. Установка зависимостей остаётся обязанностью CI job до вызова Makefile.

## Goals / Non-Goals

**Goals:**

- дать каждому core-сервису одинаковый внешний интерфейс `make test`, `make lint`, `make format`;
- сделать корневые цели явным агрегатором четырёх одноимённых сервисных целей;
- сохранить `test` и `lint` пригодными для worker без runtime infrastructure;
- сохранить `format` явно mutating, а `test`/`lint` — non-mutating;
- закрепить контракт в инструкциях профильных исполнителей и Quality Gate;
- обеспечить проверяемость структуры через `make -n`/статический audit и фактические прогоны применимых команд.

**Non-Goals:**

- изменение API endpoint, access policy, БД, миграций, NATS/AsyncAPI, compose или release workflow;
- изменение runtime-кода и тестовой логики сервисов;
- добавление Makefile или иных изменений в `services/site-ad`/`site-*`;
- установка зависимостей внутри `make test|lint|format`;
- включение инфраструктурных/e2e/live API тестов в CI-facing `test`.

## Decisions

### 1. Сервисный интерфейс одинаков, внутренние команды нативны стеку

Каждый сервис получает `.PHONY: test lint format`, но реализация использует существующий toolchain:

- backend: `pytest tests/unit`, типизация/линтеры для `src tests`, Ruff fix+format для `src tests`;
- notification/email: `pytest -m "not infrastructure"`, полный объявленный Python lint/typecheck gate и Ruff fix+format;
- frontend: `npm test`, `npm run lint` плюс typecheck для полного lint gate, `npx eslint src --fix` для доступного formatter/autofix.

Так сохраняется один внешний контракт без искусственного выравнивания Python и Node инструментов. Альтернатива — добавить новый formatter (например, Prettier) — отклонена, потому что это расширяет dependency/config scope и меняет стиль вне задачи.

### 2. `test` не обращается к инфраструктуре

Backend запускает только `tests/unit`; email/notification исключают marker `infrastructure`; frontend Vitest использует существующие mocks/jsdom. E2E, live API smoke и infrastructure marker остаются отдельными gates. Альтернатива — запуск всего pytest с условными skip — отклонена: поведение зависит от окружения worker и хуже доказывает автономность.

### 3. Корень явно делегирует каждому сервису

Корневые рецепты содержат четыре отдельные строки `$(MAKE) -C services/<service> <target>` в порядке backend → notification-service → email-service → frontend. Shell-цикл и вычисление списка из manifest не используются, чтобы CI log и scope были очевидными, а `site-*` не мог попасть в gate автоматически.

Существующие расширенные `check`/`fix`/release targets сохраняются. `test`, `lint`, `format` становятся точными агрегаторами одноимённых сервисных целей, как требует задача.

### 4. Agent policy закрепляет обе точки входа

Backend контролирует Makefile для назначенных Python-сервисов, Frontend — `services/frontend/Makefile`, Quality Gate — сервисные контракты и корневую явную агрегацию. Документационные правки выполняются одним владельцем после runtime-tooling deliverables, чтобы избежать пересечений в `agents/*.md`.

### 5. Access matrix неприменима

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | N/A |

Обоснование: change изменяет только repository tooling и agent governance; новых или изменённых HTTP endpoint нет. Anonymous/authenticated API-тесты не требуются, а существующий Public Read / Protected Write контракт не меняется.

## Ownership и порядок выполнения

1. **Backend / Python tooling owner:** `services/backend/Makefile`, `services/notification-service/Makefile`, `services/email-service/Makefile`.
2. **Frontend owner:** `services/frontend/Makefile`.
3. **Backend / orchestration-documentation owner (после 1–2):** корневой `Makefile`, `agents/backend.md`, `agents/frontend.md`, `agents/quality_gate.md`. Этот этап последовательный и не меняет сервисные Makefile.
4. **Quality Gate:** один общий review совокупного diff, статический contract audit, dry-run и фактические прогоны; report в `docs/reports/`.
5. После APPROVED Router синхронизирует delta spec, повторяет strict validation и архивирует change.

## Risks / Trade-offs

- [Frontend `format` ограничен ESLint auto-fix и не является универсальным formatter] → Явно зафиксировать используемый существующий toolchain; отдельное внедрение Prettier требует нового change.
- [Полный Python lint может выявить уже существующий debt] → Не ослаблять команды; findings вернуть владельцу, а отклонение/rollout согласовать до изменения контракта.
- [Mutating `format` меняет tracked files] → Quality Gate запускает его только на clean/path-accounted worktree и требует отсутствие diff после форматирования.
- [Зависимости отсутствуют на CI worker] → CI обязан выполнить lockfile-based install до Makefile; цели не запускают сеть и не устанавливают пакеты.
- [Backend unit suite может содержать случайный внешний вызов] → Quality Gate запускает цель в окружении без инфраструктуры и считает любой такой вызов дефектом тестовой изоляции.

## Migration Plan

1. Добавить/нормализовать сервисные Makefile, проверить `make -n` и автономные `test`.
2. Добавить корневую явную агрегацию и проверить, что `site-*` не упоминается в рецептах.
3. Обновить agent policy одним последовательным documentation deliverable.
4. Выполнить единый Quality Gate и сохранить evidence.
5. Rollback: откатить только Makefile/agent-policy diff; изменения данных и runtime rollback отсутствуют.

## Open Questions

Открытых продуктовых или архитектурных вопросов нет. Принято рабочее допущение: frontend `format` использует существующий `eslint --fix`, поскольку formatter-зависимость в проекте не объявлена.
