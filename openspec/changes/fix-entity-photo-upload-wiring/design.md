# Design

Тикет: `docs/tasks/081_photos_selector_improve.md` + обращение о 400 при upload услуги. Дата: 2026-11-17. Сервис: `services/backend`.

## Context

Мотивация — `proposal.md#why`. Повторная git-проверка после сообщения «Блокер устранён»: корень и все 10 клонов manifest на main, origin соответствует manifest (SSH/HTTPS для того же GitHub repo эквивалентны), незавершённых операций и dirty diff нет. Ветки не переключались.

### Диагноз по актуальному коду

| Наблюдение | Подтверждение |
|---|---|
| PhotoService существует и корректно собирается отдельно | `src/depends/services.py:309–325` |
| Все entity factories забывают передать PhotoService | `src/depends/services.py:348–401`: get_price_service, get_horse_service, get_news_service |
| Optional constructor оставляет None; upload выбрасывает ClientError | `src/core/services/prices.py:286–298,703–704`; `horse.py:90–108,901–906`; `news.py:43–53,287–288` |
| У horses дополнительно не передан PhotoUrlBuilder | `src/depends/services.py:366–387`; после первого fix сработает `horse.py:903–904` |
| Price upload не проверяет admin, в отличие от horses/news | `src/api/prices.py:317–329`: user отбрасывается; `src/core/services/prices.py:691–715`; сравнить `horse.py:899`, `news.py:285` |
| Foreign и missing сейчас дают ClientError → 400, а не обещанные 403/404 | tenant-scoped lookup в трёх upload methods; `src/main.py:153–166`; тесты wrong_tenant ловят ClientError, не HTTP status |
| Сброс main при upload | все три upload methods передают main_photo_id=None при замене всего списка; `src/repositories/price_repository.py:309–327` удаляет связи и вставляет is_main=False. То же подтверждено в `src/repositories/horse_repository.py:950–979` и `news_repository.py:193–226`; исправление — передача прежнего main из entity services, не изменение общих repositories |
| Тесты обходят production wiring | `tests/unit/api/test_{prices,horses,news}_photo_upload.py` создают entity services вручную с mock_photo_service; `tests/unit/depends/test_service_dependencies.py` не покрывает эти фабрики |

Полный найденный inventory entity upload: `src/api/prices.py:309`, `src/api/horses.py:257`, `src/api/news.py:232`. Поиск `photos/upload` по src/api не обнаружил других entity endpoints; отдельный gallery upload не является entity upload и не меняется.

История: архив `openspec/changes/archive/2026-10-07-photos-selector-improve/` (proposal, design, tasks, COMPLETION_SUMMARY, QA_CHECKLIST) содержит намерения и заявления о завершённости, но `docs/reports/photos-selector-improve-archival-report.md` признаёт отсутствие QG-BE/CONTRACTS/LIVE. Это не доказательство текущей работоспособности. Specs `photo-batch-upload-attach` и `photo-upload-ui` прочитаны; frontend caller `services/frontend/src/api/photos.ts:96–179` использует `files`, не буквальный `files[]`.

## Goals / Non-Goals

**Цель:** минимально восстановить production wiring и закрыть непосредственно проявляющиеся дефекты этого же upload потока с регрессией трёх сущностей.

**Не входит:** новый upload API, frontend diff, редизайн selector, изменение repository API, storage, схемы БД, миграции, NATS, новые режимы strict transaction, concurrency/idempotency, рефакторинг, исправление исторического архива или окружения. Общие transactional/storage риски не объявляются исправленными этим change.

## Decisions

1. **DI, не создание PhotoService внутри core.** Добавить `Annotated[PhotoService, Depends(get_photo_service)]` и именованный constructor kwarg в три фабрики; horses получает также существующий get_photo_url_builder. Использовать прежние cached зависимости get_session/get_photo_repository: PhotoService и entity service работают в одной request session. Не превращать optional kwargs в обязательные во всех старых callers.
2. **Price access closure.** Передать current_user из upload route в upload method и проверить ADMIN/SUPERUSER/DEVELOPER до entity lookup и любых writes. Локальная проверка по принятому в horse/news набору scopes, без нового общего authorization framework. Обновить только непосредственно зависимые price upload callers/tests; остальные price операции не менять.
3. **Tenant fail-closed.** Сохранить tenant-scoped lookup и возвращать NotFoundError для None во всех трёх upload methods. 404 для чужой и отсутствующей entity — намеренная корректировка исторического 403; запрещён global lookup ради отличения foreign от missing. Если defensive fake возвращает чужую entity, проверить equestrian_id перед записью и также отказать. Роль не даёт cross-tenant override.
4. **Main и прежние связи.** До цикла сохранить прежний main id из отношений prices/news и из full-info photos horses; передавать его во все set_*_photos. Не назначать новый main, если старого нет. Не менять repository сигнатуры. Подтвердить реальной PostgreSQL, не только fake, поскольку fake может сохранять main при None иначе production.
5. **Multipart без FE изменений.** Реальный контракт — повторяемые ключи files/names/descriptions; квадратные скобки в старом тексте описывали массив, не wire spelling. Количество 1..20; существующий global validation handler даёт 400. Delta уточняет это, глобальный handler не меняется. Ответ 200 photos/errors и partial success остаются прежними.
6. **Регрессия проверяет реальные factories.** HTTP TestClient/ASGI через production routers и app exception handlers. Разрешено override только листовых repositories/auth lookup/media adapters, не get_*_service. Дополнительно проверить identity factory kwargs и общий request session. Временные dependency_overrides очищаются fixture finalizer, без глобального состояния между тестами.

## Access matrix

Каноническая таблица — delta `specs/photo-batch-upload-attach/spec.md`, Requirement «Access control матрица»; ниже та же область исполнения.

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| POST | `/api/prices/{slug_or_id}/photos/upload` | Protected Write | ADMIN/SUPERUSER/DEVELOPER | 401 + WWW-Authenticate | своя entity 200; без scope 403; foreign/missing 404 |
| POST | `/api/horses/{horse_id}/photos/upload` | Protected Write | ADMIN/SUPERUSER/DEVELOPER | 401 + WWW-Authenticate | своя entity 200; без scope 403; foreign/missing 404 |
| POST | `/api/news/{news_id}/photos/upload` | Protected Write | ADMIN/SUPERUSER/DEVELOPER | 401 + WWW-Authenticate | своя entity 200; без scope 403; foreign/missing 404 |

Исключений из Protected Write нет. Сессия задаёт tenant; клиентский selector не может его переопределить и для этого authenticated потока не обязателен. Missing/invalid session → 401, пустые scopes/SEO-only → 403 до lookup/writes. Foreign 404 выбран для нераскрытия существования; права не ослабляются. GET не меняются, anonymous read после upload проверяется по действующему public tenant selector-контракту соответствующего endpoint, без cookie.

## Deliverables и ownership

- **A / Backend:** `services/backend/src/depends/services.py`, upload часть `src/api/prices.py`, upload методы/необходимые импорты `src/core/services/{prices,horse,news}.py`; `tests/unit/depends/test_entity_photo_upload_wiring.py` (новый), `tests/unit/api/test_entity_photo_upload_http.py` (новый), `tests/unit/api/test_{prices,horses,news}_photo_upload.py`, `tests/unit/conftest.py` (только прямо зависимые fixtures при необходимости). `src/core/services/photos.py`, repositories и остальные API — read-only. Расширение ownership согласуется с Router, не молчаливое включение.
- **B / Backend live verification:** только `.qa/fix-entity-photo-upload-wiring/{LIVE-1,LIVE-2}/` и разрешённые тестовые ресурсы, без tracked runtime кода. Один профиль владеет baseline и after; запускать последовательно.
- **C / Quality Gate:** `.qa/fix-entity-photo-upload-wiring/QG/`, единственный будущий отчёт `docs/reports/fix-entity-photo-upload-wiring.md`. Код не правит.
- OpenSpec checkbox каждого unit отмечает его исполнитель; specs/design остаются Planner-owned до approval. Sync/archive — Router после QG и отдельной финализации, не исполнитель runtime.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| LIVE-1 | Backend | B | `.qa/.../LIVE-1/`, разрешённые fixtures | approval + отдельный live permit | одна baseline smoke группа, 5 действий |
| BE-1 | Backend | A | DI + новый wiring test | LIVE-1 | targeted wiring tests, 5 связанных действий |
| BE-2 | Backend | A | три upload methods + price route + HTTP/service tests/fixture closure | BE-1 | final-service backend gate, 8 связанных действий |
| LIVE-2 | Backend | B | `.qa/.../LIVE-2/`, те же разрешённые fixtures | BE-2 | одна after smoke группа с real PG, 5 действий |
| QG | Quality Gate | C | QG evidence и итоговый отчёт | LIVE-2 | QG-LITE, независимый backend suite и live группа |

```text
approval + permit → LIVE-1 → BE-1 → BE-2 → LIVE-2 → QG
QG APPROVED → Router: sync specs → strict validation → archive/finalization gates
```

Units не параллельны: общий поток, baseline до fix, один backend ownership. LIVE-1 — воспроизводимый результат расследования, не checkpoint/setup unit; LIVE-2 — доказательство сохранения в БД, не повтор unit-тестов. При missing permit не запускать LIVE-1 и не имитировать baseline, Router получает blocked. Static подготовка плана уже завершена отдельно.

`contextFiles` по unit перечислены в tasks; исполнители не читают весь архив или все specs. BE-2 — финальная граница сервиса: `make -C services/backend test` и `make -C services/backend lint`. Canonical formatter Ruff; lint уже включает `ruff format --check`, повторять alias не надо. Mutating format — только на owned paths до evidence, не весь сервис. BE-1 — `uv run pytest tests/unit/depends/test_entity_photo_upload_wiring.py` из backend + scoped Ruff/mypy; BE-2 дополнительно сохраняет targeted reproducer test result в пределах своей группы до full suite.

## Test matrix

Обозначения scenarioId: UP-01..03 — новые scenarios delta; AC-* — scenarios Requirement «Access control матрица»; FORM — Requirement «Формат запроса multipart/form-data». UT paths ниже планируемые, не заявления о выполнении.

| ID | Уровень | Риск/ось | Сценарий delta | Ожидание | testPath/command |
|---|---|---|---|---|---|
| UT-UP-01 | unit DI | R-DI | UP-01 | factories всех трёх передают PhotoService, horses URL builder; общая session | `tests/unit/depends/test_entity_photo_upload_wiring.py` |
| UT-UP-02 | HTTP | R-DI | UP-01 | по одному реальному app multipart request на тип; production services и PhotoService, leaf adapters doubles; 200 photos/errors + URL | `tests/unit/api/test_entity_photo_upload_http.py` |
| UT-UP-03 | HTTP | R-ACCESS | AC-Anonymous/Authenticated non-admin | все маршруты: no/invalid cookie 401; empty/SEO-only scopes 403; ADMIN/SUPERUSER/DEVELOPER allowed в own tenant; zero writes при отказе | тот же HTTP test |
| UT-UP-04 | HTTP/service | R-TENANT | AC-foreign | foreign/missing 404, даже для privileged; no storage/relation write, все lookup scoped | HTTP test + три service upload test |
| UT-UP-05 | HTTP | R-TENANT | AC-selector | selector чужого tenant игнорируется при cookie; не заменяет сессию; anonymous selector не разрешает запись | HTTP test |
| UT-UP-06 | HTTP/DTO | R-FORM | FORM | реальный files/names/descriptions; 1 и 20 допустимы, 0/21 → 400; names fallback сохранён | HTTP test + существующий `test_photo_upload_validation.py` |
| UT-UP-07 | service | R-MAIN | UP-02, UP-03 | все сущности: список старых id и main передаются корректно при успехе/partial/all-invalid; нет auto-main при его отсутствии | три service upload test |
| UT-UP-08 | service | R-DEPENDENCY | partial success existing spec | отказ validator/storage на одном файле → indexed error и сохранённый успех другого, без секретов; существующие PhotoService rollback tests проходят | три upload test + `tests/unit/core/services/test_photo_service_s3_rollback.py` |
| SM-UP-01 | live baseline/after | R-DI | UP-01 | исходный price upload: 400 PhotoService → 200 на эквивалентной изолированной entity; horse/news аналогично; фактический photo+relation читаются новой сессией/GET | smoke skill, design → SMOKE |
| SM-UP-02 | live | R-ACCESS | AC-* | anonymous 401; non-admin 403; privileged own 200; foreign/missing 404; данные обоих tenant неизменны при отказе | smoke skill |
| SM-UP-03 | live PG | R-MAIN | UP-02, UP-03 | реальные старые связи/main сохраняются для каждого типа после commit и нового чтения, partial success проверен | smoke skill |
| SM-UP-04 | live contract | R-CONTRACT | UP-01 | PhotoOutShortDto только id/is_main/url; URL доступен; anonymous GET own public entity с валидным selector по текущему контракту, новые связи видны | smoke skill |

### Реестр acceptance prerequisites

Каждая строка с диапазоном разворачивается по ID матрицы с теми же условиями; evidence ведётся раздельно. Единый независимый QG evidence owner — QG для всех свойств, owner checks Backend не заменяют его.

| riskId | scenarioId | unit | testPath/command | evidenceOwner | prerequisites | isolation | permission | budget | stopCondition | status |
|---|---|---|---|---|---|---|---|---|---|---|
| R-DI | UT-UP-01..02 | BE-1/BE-2 | пути матрицы | Backend; независимо QG | checkout + установленный backend uv env | leaf doubles, никаких реальных сетевых writes | approval apply | 10 минут targeted / 20 минут full | missing deps или scope overflow → blocked/partial | planned |
| R-ACCESS/R-TENANT/R-FORM | UT-UP-03..06 | BE-2 | HTTP test из матрицы | Backend; независимо QG | тот же env, реальные app handlers | fixture cleanup dependency_overrides | approval apply | общая full группа ≤20 минут | unexpected HTTP status → fail, не менять общие handlers | planned |
| R-MAIN/R-DEPENDENCY | UT-UP-07..08 | BE-2 | service tests из матрицы | Backend; независимо QG | существующие fakes и fixtures | без external storage | approval apply | входит в тот же full gate | затронут чужой путь → Router | planned |
| R-DI | SM-UP-01 before | LIVE-1 | smoke skill | Backend; QG проверяет baseline сопоставимость | pre-fix API revision, real PG, dedicated tenant/accounts/storage | отдельная `_test` БД/роль и owned media prefix | отдельный permit target/resources/expiry | ≤15 минут группа, HTTP timeout 30с | missing permit/isolated target или unreproduced FAIL → blocked | planned |
| R-DI/R-ACCESS/R-MAIN/R-CONTRACT | SM-UP-01 after, SM-UP-02..04 | LIVE-2; затем QG | smoke skill | Backend self-check; независимый QG | тот же изолированный API после fix; real PG; fixture IDs baseline | та же `_test` БД, два owned tenant, scoped storage prefix | отдельный permit включает повтор QG и cleanup только owned ресурсов | ≤20 минут группа на unit; максимум 1 targeted QG recheck | missing identity/permission, системная ошибка, лимит времени → stop | planned |

Транзакционная модель не меняется: get_session commit/rollback (`src/depends/utils.py:23–32`) остаётся прежней; SM-UP-03 проверяет видимый committed результат новой сессией. Новые guarantees rollback после DB-error, конкурентные batch uploads и идемпотентность повторного upload — неприменимы к этому DI fix: существующий контракт не расширять, такие найденные дефекты передавать Router. NATS/topology/OAuth/миграции и UI/browser lanes неприменимы — их diff нет.

## PostgreSQL для smoke-тестов

Read-only discovery: `docker ps` обнаружил `eqsitecms-db`; безопасный `docker inspect eqsitecms-db --format '{{.Name}} image={{.Config.Image}} state={{.State.Status}} ports={{json .NetworkSettings.Ports}}'` дал `/eqsitecms-db image=postgres:16 state=running`, published 5433 → 5432. Это app-контейнер, **не разрешённая test identity**; env, DSN, passwords и содержимое БД не читались.

Наличие выделенной `_test` БД/роли/API и storage prefix не подтверждено. До live Router должен получить отдельное разрешение с target, resource scope, expiry и безопасным cleanup. Если отдельный target не предоставлен — live blocked, никакого app/public fallback, самостоятельного provisioning или setup/teardown PG/NATS. Approval proposal недостаточно. Развёртывание pre-fix/fixed тестового API выполняет Router/оператор отдельно; этот change не чинит stackctl и не создаёт окружение.

### SMOKE-тесты на реальном API

Использовать `.claude/skills/api-smoke-test` с явным путём этого design, не legacy docs/plans. Указанные в skill credentials не применять автоматически к app DB: только отдельная одобренная test identity, cookies разных ролей в отдельных файлах с mode 600, без логирования secrets.

LIVE-1 до изменения кода: подтвердить test target и разрешение, подготовить три disposable entity в tenant A (с уже выбранным и главным фото) и tenant B для отрицательных checks, записать безопасные IDs/fixtures fingerprint; воспроизвести точный метод/route suffix/multipart price upload и эквиваленты horses/news. UUID из пользовательского обращения **никогда не использовать для writes**; заменить только entity ID на тестовый, остальные значимые входы сохранить. Ожидаемый исходный FAIL — 400 с указанной ошибкой; если файл пользователя недоступен, валидный PNG, явно отметить эквивалентность/ограничение, не заявлять тождественный исходный payload. Если before уже зелёный — unreproduced и blocked closure, не ломать код ради FAIL.

LIVE-2 после fix на той же test identity: повторить SM-UP-01 с теми же bytes/metadata/entity keys, затем SM-UP-02..04 и bounded cleanup только созданных ресурсов. После каждого 200 читать состояние после commit через новую сессию/API. Отдельно сравнить main и старые id у каждого типа. Full storage/DB fault injection в live не требуется: внешняя деградация проверяется UT-UP-08.

Evidence: `.qa/fix-entity-photo-upload-wiring/<unit>/reproducer-before.json`, `reproducer-after.json` (after ссылается на baseline path), scenario results и ledger по verification-policy: scenarioId, revision/codeFingerprint, environmentFingerprint без credentials, redacted input/keys/route, expected/actual/status/time. Не более двух infra repair attempts, причём только разрешённые read-only diagnostics; никаких самостоятельных PG/NATS repairs. QG допускает один targeted recheck, затем stop.

## Risks / Trade-offs

- [Нет live permit] → код не начинать до baseline либо Router явно перепланирует с непроверенным gap; PASS не подменять mocks.
- [Исправление DI открывает прежде недостижимые ошибки] → production graph HTTP tests, admin prices, main regression, реальная PostgreSQL.
- [Меняются error statuses] → явно отмечено BREAKING в proposal; approval включает 404 вместо foreign 403 и документирование существующих multipart 400. UI payload/200 не меняются.
- [Partial success не гарантирует recovery от произвольного DB-error] → не расширять fix до transaction redesign; новая находка — отдельное решение Router.

## Migration Plan

Миграций нет. После approval и baseline: DI, flow/access fix, финальный backend gate, тестовый deployment оператором, live, единый QG-LITE. Затем Router sync specs, повторяет strict validation и проводит archive/finalization по отдельным gates. Rollback — вернуть только included backend изменения через штатный shipping процесс; никакого удаления пользовательских фото/миграций. В этой сессии только планирование.

## Open Questions

Неблокирующих продуктовых вопросов нет. Операционный prerequisite остаётся открытым: кто предоставляет изолированный test API/PG/media target, разрешение и тестовые учётные записи до LIVE-1. До этого план apply-ready, но live и начало runtime fix заблокированы по acceptance policy.
