# Proposal — ретроспективные контракты сервисов Яндекса

## Why

Существующие yandex-service и ya-metrica-service нуждаются в спецификациях фактических возможностей по [заданию 097](<../../../docs/tasks/097_yandex_services_retrospective_specs.md>). Этот отдельный service-backfill change не подменяет завершённую нормализацию ошибок или корневое onboarding-изменение.

## What Changes

- Документируются оба вручную реализованных сервиса: OAuth/accounts/storage, gateway/bindings, adapter/provider, configuration/DI/lifecycle и общий access baseline: пять capabilities, 100 сценариев.
- Наблюдаемые security gaps отделяются от действующих peer exceptions; новые разрешения anonymous sensitive writes не утверждаются. Полная [матрица S1](<specs/yandex-services-access-evidence/spec.md#консолидированная-access-matrix>) содержит методы/пути, роли, anonymous/header-bearing outcomes, причины исключений и будущие проверки.
- [Design](<design.md>) и [tasks](<tasks.md>) задают только документационные verification/publishing units. Подготовленные specs — результат planning, не выполненная implementation или будущий QG; apply ждёт явного пользовательского approval.
- Runtime, исходники сервисов, существующие main specs, архивы, root docs/tooling не изменяются. Нет deployment, sync, archive, commit или ремонта посторонних root tests.

## Capabilities

### New Capabilities

- [yandex-oauth-accounts](<specs/yandex-oauth-accounts/spec.md>): OAuth link/code, аккаунты, encrypted storage, транзакции и ограничения token lifecycle — 21 сценарий.
- [yandex-metrica-gateway](<specs/yandex-metrica-gateway/spec.md>): gateway счётчиков и tenant bindings, DTO/storage/conflicts — 22 сценария.
- [ya-metrica-adapter](<specs/ya-metrica-adapter/spec.md>): query/decrypt/provider/DTO, settings и lifecycle notes без DB persistence операции — 17 сценариев.
- [yandex-service-runtime](<specs/yandex-service-runtime/spec.md>): config/DI/session ownership, startup/shutdown, health, pooling/telemetry limits — 20 сценариев.
- [yandex-services-access-evidence](<specs/yandex-services-access-evidence/spec.md>): consolidated access coverage, governance, gaps и пределы доказательства — 20 сценариев.

### Modified Capabilities

Нет. Действующие [client failures](<../../specs/yandex-client-failures/spec.md>) и [peer HTTP/access](<../../specs/yandex-peer-http-contract/spec.md>) используются как зависимости, а не дублируются.

## Impact

Новые спецификации описывают существующее поведение, не добавляют endpoint, зависимость, таблицу, миграцию, NATS/UI-контракт или runtime-функцию. Исходники, сервисные README и root onboarding остаются вне scope.

Endpoint coverage: Yandex — `GET /api/auth/link`, `POST /api/auth/code`, `GET /api/accounts/`, `DELETE /api/accounts/{account_id}`, `GET /api/servicing/access-token/{account_id}`, `GET /api/metrica/counters`, `GET /api/connections/metrica/{equestrian_id}`, `POST /api/connections/metrica`, `DELETE /api/connections/metrica/{counter_id}`. Adapter — `GET /api/metrica/counters`. Оба — `GET /health`, `GET/HEAD /docs`, `/redoc`, `/openapi.json`, `/docs/oauth2-redirect`; rejection cases отдельно. Итого 28 method/path, 20 app-qualified paths по S1; HEAD — framework inference, не runtime PASS.

Конфигурация, хранение и composition охвачены capabilities выше; реальные env/secrets, deployment и целостность production boundary не исследуются. Security gaps не превращаются в remediation tasks.

### Baseline и overlay

- Root HEAD: `457be4391fa800214ce6939030d3e125962b89be`; существующий dirty overlay не является частью этого commit.
- yandex-service HEAD: `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4`, чистый service tree по handoffs.
- ya-metrica-service HEAD: `0bd7434cc97ac41f0a0aef1088e99b77ead48e1b`, чистый service tree по handoff M1.
- Main Yandex specs/архив нормализации и исходное задание читаются из рабочего overlay; не приписываются root HEAD. Чужой diff не исследован и не изменён.
- `normalize-yandex-client-failures` архивирован; независимый `reconcile-yandex-root-onboarding` не разблокируется этим change. Старые 77 tasks и история caches/install не являются контрактами сервисов.
- CLI 1.14.3 работает с nearest repo root. В planning нет Make/tests/Docker, installs, sync/archive, metadata writes или commits; наличие тестов не означает runtime PASS.

### Ownership и approval

Планировочные slices Y1/Y2/M1/Y3/S1 подготовлены; F1 завершает только общие артефакты. Будущие документационные deliverables, bounded units, DAG, context packs и обязательные lanes определены в [design](<design.md#execution-units>), единственный checklist — [tasks](<tasks.md>).

После status/strict Router показывает change пользователю на явный approval. Apply не начат; QG-CONTRACTS, QG-FORMAT и QG-SYNTH ещё не выполнены. Sync → strict → archive → task-finalize допускаются только после будущих approval/skill gates.

## Граница и источник истины

Сводная access matrix S1 уточняет исторические локальные заметки Y1/Y2: существующие private peer exceptions сохраняются по main-контракту, но anonymous sensitive writes не получают нового production approval. Valid sessions/roles и isolation не доказаны; production blocked до подтверждения защиты, docs-backfill не блокируется отдельным security change.

Приложение ниже сохраняет E1..E10 и gaps Y1 как provenance, потому что delta ссылаются на эти anchors. Это факты одного slice, не общая норма. Общие gaps и FT-01..08 находятся в [S1](<specs/yandex-services-access-evidence/spec.md#реестр-gaps-и-открытые-security-questions--не-blockers-документационного-backfill>).

## Source anchors

Ссылки на сервис относятся к чистому service HEAD `d3cf1dc5879d5ebc2f75bbdb437ca657cf1a4de4`; ссылки на main Yandex specs — к прочитанному root dirty overlay, не к root HEAD.

| ID | Источник поведения | Тестовое evidence (прочитано, не запущено) |
|---|---|---|
| E1 | [auth routes](<../../../services/yandex-service/src/api/yandex_auth.py#L12-L34>), [OAuth client](<../../../services/yandex-service/src/clients/yandex_oauth_client.py#L66-L102>) | [auth API](<../../../services/yandex-service/tests/api/test_yandex_auth.py#L18-L41>) |
| E2 | [OAuth orchestration](<../../../services/yandex-service/src/core/services/yandex_oauth_service.py#L27-L100>) | [создание/обновление/expiry](<../../../services/yandex-service/tests/unit/test_yandex_oauth_service.py#L45-L113>), [ошибки/границы](<../../../services/yandex-service/tests/unit/test_yandex_oauth_service.py#L116-L247>) |
| E3 | [account DTO](<../../../services/yandex-service/src/core/schemas/api/yandex_account.py#L8-L25>), [auth DTO](<../../../services/yandex-service/src/core/schemas/api/yandex_auth.py#L8-L18>) | [API фильтрация](<../../../services/yandex-service/tests/api/test_yandex_auth.py#L29-L41>), [validation](<../../../services/yandex-service/tests/api/test_yandex_auth.py#L93-L131>) |
| E4 | [accounts routes](<../../../services/yandex-service/src/api/yandex_accounts.py#L13-L41>), [accounts service](<../../../services/yandex-service/src/core/services/yandex_accounts_service.py#L18-L41>) | [accounts unit](<../../../services/yandex-service/tests/unit/test_yandex_accounts_service.py#L14-L138>), [accounts API](<../../../services/yandex-service/tests/api/test_yandex_accounts.py#L16-L121>) |
| E5 | [repository predicates/order](<../../../services/yandex-service/src/repositories/yandex_user_repository.py#L17-L73>), [delete/flush](<../../../services/yandex-service/src/repositories/abstract_repository.py#L43-L72>) | [SQL compilation](<../../../services/yandex-service/tests/unit/test_yandex_user_repository.py#L15-L136>), [PostgreSQL CRUD/search/rollback](<../../../services/yandex-service/tests/integration/test_repository_postgres.py#L28-L119>) |
| E6 | [entity limits](<../../../services/yandex-service/src/core/entities/yandex_user.py#L9-L36>), [model](<../../../services/yandex-service/src/models/yandex_users.py#L15-L60>), [исходная миграция](<../../../services/yandex-service/src/migration/versions/6fe0626759ae_.py#L21-L57>) | PostgreSQL constraints/migration execution в этом unit НЕ проверены; SQL/DDL inspection не равно real DB |
| E7 | [шифрование](<../../../services/yandex-service/src/core/services/encryption_service.py#L7-L22>) | [roundtrip/повреждение](<../../../services/yandex-service/tests/unit/test_encryption_service.py#L7-L31>) |
| E8 | [transaction boundary](<../../../services/yandex-service/src/utils/transactional_route.py#L10-L30>), [prefixes/error boundary](<../../../services/yandex-service/src/main.py#L75-L120>) | [commit/rollback/order](<../../../services/yandex-service/tests/api/test_transactions.py#L136-L178>), [runtime-route commit failure](<../../../services/yandex-service/tests/api/test_transactions.py#L198-L226>) — fake sessions |
| E9 | [token retrieval](<../../../services/yandex-service/src/core/services/yandex_service_authorization_service.py#L21-L33>), [token route](<../../../services/yandex-service/src/api/servicing.py#L12-L25>) | [selected/missing/corrupt token](<../../../services/yandex-service/tests/unit/test_service_authorization.py#L27-L79>) |
| E10 | [пары anonymous/header-bearing](<../../../services/yandex-service/tests/api/conftest.py#L18-L28>) | Заголовки содержат fake credentials; валидная user session/роли не доказаны |


## Gaps и вопросы для S1/F1 (не требования на реализацию в Y1)

- GAP-Y1-AUTH: auth/account/token routes не содержат auth dependency; DELETE и token retrieval не получают tenant/owner аргумент. Private exposure и gateway denial не проверялись; security desired exceptions не утверждены.
- GAP-Y1-STATE: link state — UUID, callback DTO содержит только code/tenant; проверка state/nonce/replay в изученной цепочке не найдена. Пустой code не запрещён DTO по длине. Нельзя утверждать CSRF/replay protection.
- GAP-Y1-REFRESH: expiry/refresh token сохраняются, но examined read chain не проверяет expiry и не обновляет access token. Нужен ответ, остаётся ли это документированным ограничением или отдельным будущим change.
- GAP-Y1-KEY: реализация выводит Fernet key из SHA-256 секрета, хранит ciphertext строкой; rotation/versioning и production key management не доказаны. ENV/secrets не читались.
- GAP-Y1-LOG: неожиданная decrypt ошибка в [ветке catch-all](<../../../services/yandex-service/src/core/services/yandex_service_authorization_service.py#L28-L33>) интерполирует `ex` в лог/ClientError; наличие sanitizing HTTP boundary не доказывает безопасность лога. Не легализовать утечку; согласовать с main safe-diagnostics clause в S1/F1 без изменения кода здесь.
- GAP-Y1-SEARCH: описание Query говорит «регулярное выражение», фактически ILIKE. Baseline следует E5, не строке документации API.
- GAP-Y1-DB: API fake sessions и SQL compilation не доказывают реальные migrations/constraints/isolation; Pg tests прочитаны, не запущены. Model имеет nullable tenant с default UUID, migration nullable без такого server default, entity требует UUID; nullable direct-DB поведение не подменять API гарантиями. При одинаковом created_at порядок не детерминирован; отдельные page/count запросы не обещают единый snapshot. Конкурентные первые OAuth вызовы могут конфликтовать unique index, retry не обнаружен.

## Передача Router

PLAN-F1 завершает синтез; следующий шаг — пользовательский approval, не новый audit. Актуальные bounded contextFiles и post-approval checklist находятся в [tasks](<tasks.md>). Исторические локальные handoff/WIP-формулировки внутри readonly delta относятся к моменту подготовки slices, не к текущему статусу всего change.
