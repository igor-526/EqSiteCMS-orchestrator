# Design — необязательное описание цены

Задача: [116](../../../docs/tasks/116_price_optional_description.md) · Дата: 2026-11-17 · Сервис реализации: `services/backend`.

## Context

Мотивация — [proposal.md](proposal.md). Код проверен статически, runtime в PLAN-1 не запускался.

- `PriceCreateDto` / `PriceUpdateDto` в `src/core/schemas/prices.py` принимают `description: str | None = None`. Entity и PostgreSQL `prices.description VARCHAR(511) NULL` уже поддерживают пустую строку и null.
- Ошибка возникает в `PriceService._validate_optional_text`: после `strip()` пустая строка приводит к `ClientError`. Этот же helper используется для `page_data`; у `PriceGroupService` есть отдельный одноимённый helper. Нельзя ослаблять их все.
- И create, и update используют `model_dump(exclude_none=True)`. Поэтому create без description / с null оставляет entity default None; update с null игнорирует поле, а null-only/пустой PATCH даёт «Нет данных для обновления». Пропуск description с другим изменением сохраняет значение.
- `src/api/prices.py` использует `get_current_user` и `get_protected_equestrian_context`, без отдельного price scope gate. Tenant берётся из пользователя; чужая цена не находится и update возвращает текущий `400`.
- Точечная проверка CMS: `features/prices/validators/prices.ts` допускает `""`; `PriceEditModal.tsx` хранит description строкой и передаёт её в create/update payload; feature-service не заменяет строку на null. Поэтому frontend diff не нужен.
- Main spec `backend-domain-capabilities` описывает пустое описание horse service, но не явный контракт price. Добавляем отдельное требование в существующую capability, не переписываем horse-service сценарии. Исторические evidence gaps main spec не объявляются закрытыми.

## Goals / Non-Goals

**Цель:** локально исправить валидацию price description и защитить create/update от повторной регрессии.

**Не цели:** новые права и scopes, nullable-PATCH redesign, изменение slug/page_data/групп/horse services, миграции, общий аудит API, переработка формы, инфраструктуры или чужого change `fix-entity-photo-upload-wiring`.

## Decisions

### 1. Разрешить пустоту только для price description

В `PriceService` добавить явный opt-in пустой строки в `_validate_optional_text` (по умолчанию прежний запрет) и включить его только для description в `_validate_price_data`. Это сохраняет trim и предел 511, не ослабляет page_data и не затрагивает отдельный `PriceGroupService`.

Альтернативы: убрать проверку пустоты во всём helper — отклонено из-за page_data; править только DTO — не устраняет domain-ошибку; скрывать пустоту во frontend — не исправляет API.

### 2. Не менять null и PATCH presence semantics

| Вход description | POST при остальных валидных полях | PATCH существующей цены |
|---|---|---|
| `""` | `200`, сохранено `""` | `200`, описание очищено до `""` |
| `"  \\t "` | `200`, сохранено `""` | `200`, сохранено `""` |
| `" Текст "` | `200`, сохранено `"Текст"` | `200`, сохранено `"Текст"` |
| отсутствует | `200`, `null` | другое допустимое изменение: `200`, прежнее описание; `{}`: `400` |
| `null` | `200`, `null` | игнорируется; с другим изменением `200` и прежнее описание, null-only: `400` без записи |
| 512 символов после trim | `400`, без создания | `400`, без изменения |

Пустоту сохраняем именно как `""`, а не null: это минимальный opt-in текущего строкового нормализатора, не требующий изменения dump/persistence. Нормализация пустоты в null и переход на `exclude_unset=True` отклонены: они расширяют контракт PATCH других nullable-полей. Наличие `description=""` должно оставаться изменением, даже если после trim значение ложно в boolean-контексте.

### 3. Регрессия на service и HTTP boundary

Использовать существующие fakes `tests/unit/core/services/test_price_service.py`; новый `tests/unit/api/test_prices_description_contract.py` проверяет реальный router и `PriceService` с fake repositories, а не только mock возвращаемого DTO. Authenticated вариант получает test-user через DI; anonymous вариант НЕ override-ит auth успешным пользователем. Сбрасывать overrides в `finally`/локальной fixture; общие fixtures менять не требуется.

HTTP unit не доказывает PostgreSQL persistence и не подменяет live reproducer. Отдельный короткий smoke на реальном API закрывает read-after-write и исходный `400`→`200`.

## Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/api/prices` | Protected Write | любой authenticated tenant user; без дополнительного scope | `401`, даже с tenant selector | `200` valid/empty description; `400` business validation |
| PATCH | `/api/prices/{slug_or_id}` | Protected Write | любой authenticated tenant user, свой tenant | `401`, даже с tenant selector | `200` valid/empty; `400` foreign/not-found, null-only, business validation |
| GET | `/api/prices`, `/api/prices/{slug_or_id}` | Public Read | anonymous с selector; authenticated tenant user | valid selector `200`; missing/invalid `401`; missing detail `404` | `200` в tenant пользователя; missing detail `404` |

Исключений нет. `X-Equestrian-Service-Key` — non-secret identity hint, не разрешение записи. Без специальных scopes authenticated write по текущему backend разрешён: не переносить более узкие UI scopes в API. Права и auth/tenant dependencies не меняются.

## Deliverables и ownership

| Deliverable | Владелец | Непересекающиеся пути и closure |
|---|---|---|
| A — исправление price description | Backend | `services/backend/src/core/services/prices.py` (только PriceService); `services/backend/tests/unit/core/services/test_price_service.py`; новый `services/backend/tests/unit/api/test_prices_description_contract.py`, включая локальные fixtures/fakes; evidence `.qa/fix-price-optional-description/BE-PD-1/` |
| B — независимая приёмка | Quality Gate | только `.qa/fix-price-optional-description/QG/` и будущий `docs/reports/fix-price-optional-description.md`; код только читает |

Specs/артефакты — Planner; `tasks.md` исполнители последовательно отмечают только свои фактически выполненные IDs. Общий `conftest.py`, DI/runtime wiring, DTO/schema/model/repository и route inventories не требуют изменений; если возникнет необходимая closure за перечисленными путями — остановка и согласование Router. Не включать чужой pre-existing diff в ownership.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| BE-PD-1 | Backend | A | три пути A, локальные fixtures и свой evidence | approval пользователя; live permit до записи | одна группа price regression + final-service gate + bounded smoke |
| QG | Quality Gate | B | свой evidence и итоговый отчёт B | BE-PD-1 | один `QG-LITE`: независимые BE/API/access/runtime проверки, итоговый вердикт |

Бюджет BE-PD-1: один price-validation slice, примерно 6 существенных действий (reproducer, локальный fix, service regression, HTTP/access regression, smoke, final-service verification/handoff). Это не весь price service. QG — один профильный gate, а не checkpoint; работа включает review архитектуры, контрактов, доступа, независимые тесты, runtime и синтез.

DAG:

```text
approval → BE-PD-1 → QG → approval финализации → Router: sync → strict validate → archive
```

Параллельных units нет. Финальная граница backend — BE-PD-1: `make -C services/backend test` и `make -C services/backend lint` по одному разу. `lint` уже включает mypy, Ruff check/format-check и flake8. Canonical formatter — Ruff из Makefile, не Black/isort; mutating format только на своих путях при необходимости до evidence. Targeted price pytest запускается как рабочая проверка; полный suite отдельно только на финальной границе. QG выполняет независимый full suite и lint один раз на актуальной revision.

### contextFiles по units

- **BE-PD-1:** `design.md`, delta `specs/backend-domain-capabilities/spec.md`; `services/backend/src/core/services/prices.py` (PriceService); `src/core/schemas/prices.py` (Price DTO); `src/api/prices.py` (price CRUD); `src/depends/services.py` (auth/tenant); `tests/unit/core/services/test_price_service.py`; `tests/unit/api/test_news_detail_api.py` (паттерн DI cleanup); `Makefile`; `agents/howto/verification-policy.md`. Перед live — `.claude/skills/api-smoke-test/SKILL.md` и stack-control по инструкции роли, без чтения secrets в вывод.
- **QG:** `design.md#test-matrix`, delta spec, handoff BE-PD-1, итоговый diff трёх путей A, `services/backend/Makefile`, `agents/howto/verification-policy.md`, smoke skill перед live. Frontend только два read-only пути из Context, без обязательного browser gate.

## Test matrix

Каждый ID ниже соответствует одноимённому поведению delta spec; все проверки пока **planned**, ни одного runtime PASS Planner не заявляет.

| ID | Уровень | Риск/ось | Сценарий delta spec | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| UT-PD-01 | unit service | R-EMPTY: основной баг | Создание цены с пустым описанием; Очистка описания цены пустой строкой | create/update с `""`, пробелами и `\\t` сохраняют `""`; update отдельно по UUID и slug | существующий `test_price_service.py` |
| UT-PD-02 | unit service | R-PRESENCE: null/пропуск | PATCH без описания сохраняет значение; Null сохраняет действующий контракт | create absent/null → None; PATCH absent/null с другим изменением сохраняет прежнее; null-only/empty dict → ClientError, нет update | там же |
| UT-PD-03 | unit service | R-BOUNDS: нормализация/лимит | Нормализация и границы непустого описания | trim, 511 успех, 512 ClientError; при отказе нет create/update; entity не мутирована | там же |
| UT-PD-04 | unit service | R-BLAST: другие поля | Валидация других полей не ослаблена | name/slug/page_data blank и опасный HTML по-прежнему отклонены; описание PriceGroup не ослаблено (существующие group tests) | там же + существующий `test_price_group_service.py` read-only |
| UT-PD-05 | unit HTTP | R-ACCESS: матрица POST/PATCH | Anonymous запись запрещена; Authenticated запись без дополнительных scopes | anonymous 401; реальный service authenticated → 200 с `description=""` в PriceOutDto; без секретов/новых полей | новый `test_prices_description_contract.py` |
| UT-PD-06 | unit HTTP/service | R-TENANT: чужой ресурс | Чужая цена не изменяется | tenant-scoped lookup, foreign PATCH 400; нет записи | новый HTTP test с tenant-aware fake |
| UT-PD-07 | unit HTTP | R-READ: матрица GET | Public Read пустого описания | anonymous valid selector и authenticated 200, missing/invalid selector 401 | новый HTTP test; реальные read/auth dependencies с fake tenant repository |
| SM-PD-01 | live API + PostgreSQL | R-EMPTY: точный reproducer | Очистка описания цены пустой строкой | до fix исходный detail 400; после fix 200; повторный GET подтверждает сохранённое `""` | smoke skill, эквивалентная изолированная price fixture |
| SM-PD-02 | live API + PostgreSQL | R-STORAGE: create/read-after-write | Создание цены с пустым описанием; Public Read пустого описания | create 200, новый запрос GET 200 с `""` в anonymous и authenticated режимах | smoke skill |
| SM-PD-03 | live API + PostgreSQL | R-PRESENCE: persistence PATCH | PATCH без описания сохраняет значение; Null сохраняет действующий контракт | на fixture с текстом описание сохраняется после PATCH другого поля absent/null; null-only 400 без записи | smoke skill |
| SM-PD-04 | live API + PostgreSQL | R-ACCESS: запрет записи | Anonymous запись запрещена; Чужая цена не изменяется | POST/PATCH без cookie 401; foreign PATCH 400; состояние не изменилось; invalid read selector 401 | smoke skill, два изолированных test tenants |

Оси: happy path, границы, access, response и регрессия покрыты. Транзакционность — в пределах отсутствия записи при отказе и read-after-write; новая concurrency/retry/idempotency логика отсутствует, поэтому отдельные гонки/rollback тесты неприменимы. Внешние сервисы/NATS не затронуты — новые fault-injection сценарии неприменимы. DTO shape не меняется; PostgreSQL constraint/type зависимость проверяется SM-PD-01..03, миграции отсутствуют.

### Acceptance prerequisites и evidence registry

В таблице `UT-PD-*` означает конечный набор 01..07 выше, `SM-PD-*` — 01..04. `scenarioId` — ID строки, связывающий конкретный сценарий delta; `riskId` указан в test matrix. Единственный независимый evidence owner всех пересекающихся свойств — QG; Backend evidence является owner-self-check, не заменяет QG.

| riskId | scenarioId | unit | testPath/command | evidenceOwner | prerequisites | isolation | permission | budget | stopCondition | status |
|---|---|---|---|---|---|---|---|---|---|---|
| R-EMPTY/PRESENCE/BOUNDS/BLAST/ACCESS/TENANT/READ | UT-PD-01..07 | BE-PD-1 → QG | из `services/backend`: `PYTHONPATH=src uv run pytest tests/unit/core/services/test_price_service.py tests/unit/core/services/test_price_group_service.py tests/unit/api/test_prices_description_contract.py` | QG, отдельный независимый run | backend checkout, uv deps, unit fixtures | fake repositories, локальные DI overrides с cleanup, без PG/NATS mutation | approval apply для кода; non-mutating tests без отдельного infra permit | 120 с targeted, full test/lint по 300 с | missing deps/0 tests/критический skip → blocked; превышение бюджета → stop | planned |
| R-EMPTY | SM-PD-01 | BE-PD-1 → QG | smoke skill: authenticated PATCH `/api/prices/{fixture_uuid}` с `{"description":""}`, затем GET | QG, свои before/after относительно исправления из owner evidence + независимый after | реальный API/PG, подтверждённые auth/test target и исходный payload/state | выделенная `_test` БД/роль, тестовая услуга с непустым описанием | отдельный permit target/resources/expiry до setup/cleanup; не production UUID из запроса | 120 с сценарий, максимум 2 infra repair | нет среды/permit/исходного FAIL → blocked closure, не synthetic PASS | planned |
| R-STORAGE/PRESENCE/ACCESS | SM-PD-02..04 | BE-PD-1 → QG | smoke skill по таблице выше | QG | реальный API/PG, test-user без специальных scopes и второй test tenant | owned test fixtures; независимый GET после commit | отдельный permit с ограниченным cleanup своих ресурсов | 300 с набор, максимум 2 infra repair | нет prerequisites → blocked; не более одного targeted QG recheck | planned |

Evidence только `.qa/fix-price-optional-description/<unit>/`: безопасный ledger по verification policy, before/after JSON для SM-PD-01 (`findingId=PRICE-EMPTY-DESCRIPTION`, один scenario/input/fixture key/route, версия и environment fingerprint). Исходный production UUID не мутировать. В эквивалентной test среде повторить именно PATCH с пустой строкой для существующей услуги, не подменять service-only тестом. Полный исходный payload неизвестен: минимальный `{"description":""}` — локализованный reproducer; если он не даёт исходный FAIL, остановить закрытие бага и запросить redacted payload/состояние у Router. После PASS выполнить impacted regression. Evidence invalidation — при изменении fingerprint кода, среды или fixtures; один targeted QG recheck, затем stop.

## PostgreSQL для smoke-тестов

Planner выполнил только безопасный `docker ps --format '{{.Names}}\\t{{.Image}}\\t{{.Ports}}' --filter ancestor=postgres:17`: совпадений нет. Изолированный test target не подтверждён; `docker inspect` не выполнялся, поскольку подходящий контейнер не найден. Параметры PG не выдуманы, app env/credentials не читались.

Перед live Router/исполнитель обязаны подтвердить разрешённый test container и безопасно получить из `docker inspect` только image/name/ports/network (без Env/secrets); имя БД/роль `_test`, изоляцию, auth target, permit и expiry задаёт оператор. Наличие обычного контейнера приложения недостаточно. Setup/teardown не входит в автоматическое разрешение approval change. При недоступности — статус blocked/unchecked с причиной, не PASS; расширение ownership инфраструктуры отдельно согласует Router.

## Risks / Trade-offs

- Общий optional helper может ослабить page_data → разрешение только opt-in description плюс UT-PD-04.
- Пустую строку можно ошибочно отфильтровать по truthiness → UT-PD-01 проверяет фактическую запись и ответ.
- Клиент может ожидать очистку по null → явно сохраняем нынешний ignore-null; очистка выполняется `""`, без нового nullable-PATCH контракта.
- Unit fake не доказывает commit → SM-PD-01..03 на реальной PostgreSQL; без permit live acceptance блокируется.
- Чужой change может затронуть тот же `prices.py` → весь файл принадлежит одному владельцу за раз; Router сериализует задания, чужой diff не менять и не включать в сдачу.

## Migration Plan

Схема/данные не мигрируются. После пользовательского approval: BE-PD-1 → единый `QG-LITE` (ENV при live, BE, CONTRACTS, LIVE, финальные проверки и отчёт). FE-AUTO/FE-MANUAL неприменимы: frontend diff отсутствует. Исправления findings — тот же владелец и один ограниченный recheck. Далее Router после финального approval выполняет sync main specs, strict validation и archive; Planner этого не делает. Deployment и shipping не разрешены этим планом. Rollback — возврат только кода fix; nullable колонка и сохранённые пустые строки остаются совместимыми.

## Открытые вопросы

Продуктовых вопросов нет. До live остаются операционные prerequisites: test API/PG, permit и сопоставимый reproducer payload/state. Они не меняют контракт или декомпозицию; их отсутствие блокирует runtime acceptance, но не готовность артефактов к apply после approval.
