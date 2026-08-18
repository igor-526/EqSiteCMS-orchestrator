## Why

Четыре core-сервиса EqSiteCMS сейчас не имеют единого Makefile-контракта для CI: у backend и frontend отсутствуют сервисные Makefile, существующие Python Makefile различаются с корневым orchestration gate, а корневые `test`, `lint` и `format` не делегируют одноимённые команды всем сервисам. Для подготовки однородного GitHub Actions workflow нужен воспроизводимый интерфейс, работающий без поднятой инфраструктуры.

## What Changes

- Ввести обязательные цели `test`, `lint` и `format` в `services/backend`, `services/frontend`, `services/notification-service` и `services/email-service`.
- Зафиксировать, что `test` выполняет автономные unit/component тесты без PostgreSQL, NATS, Redis, внешних API и иных runtime-зависимостей; infrastructure-тесты не входят в этот CI target.
- Сделать `lint` полной non-mutating проверкой кода сервиса, а `format` — mutating форматированием всего поддерживаемого исходного и тестового кода сервиса.
- Переписать корневые `test`, `lint` и `format` как явную последовательность вызовов одноимённых целей каждого из четырёх core-сервисов, без shell-цикла и без consumer sites.
- Добавить в профильные инструкции Backend, Frontend и Quality Gate обязательную проверку сервисных и корневых Makefile-команд.
- Добавить статические contract-проверки структуры Makefile и выполнить применимые команды как evidence будущего общего Quality Gate.
- API endpoint, схема БД, NATS-контракты и runtime-поведение не изменяются.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `repository-process-tooling`: уточняется обязательный CI-контракт Makefile для четырёх core-сервисов, явная корневая агрегация и агентный контроль этих команд.

## Impact

- Затронуты `Makefile`, Makefile четырёх core-сервисов и инструкции `agents/backend.md`, `agents/frontend.md`, `agents/quality_gate.md`.
- Consumer-проекты `services/site-*`, runtime compose/release targets, API, БД и messaging не затрагиваются.
- В CI должны быть заранее установлены зависимости конкретного сервиса (`uv`/Python dependencies либо Node/npm dependencies); запуск инфраструктуры не требуется.
- Изменение `format` является намеренно mutating, тогда как `test` и `lint` не должны изменять tracked files.
