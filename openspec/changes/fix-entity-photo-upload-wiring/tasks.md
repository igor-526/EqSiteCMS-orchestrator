# Tasks — fix-entity-photo-upload-wiring

Ownership deliverables A/B/C, DAG, access matrix и test matrix — в `design.md`; каждый исполнитель немедленно отмечает только фактически выполненные checkbox и возвращает handoff. До пользовательского approval реализация запрещена; live требует отдельного permit.

## Execution units

Пути ниже относительно `services/backend`, кроме явно указанных root paths. `delta` означает `openspec/changes/fix-entity-photo-upload-wiring/specs/photo-batch-upload-attach/spec.md`.

| Unit | Профиль | Deliverable / ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|
| LIVE-1 | Backend | B: root `.qa/fix-entity-photo-upload-wiring/LIVE-1/`, разрешённые fixture resources | approval + live permit | baseline smoke группа SM-UP-01 | `design.md` → PostgreSQL/SMOKE и acceptance registry; delta → UP-01; task 081; отдельный permit оператора |
| BE-1 | Backend | A: `src/depends/services.py`, новый `tests/unit/depends/test_entity_photo_upload_wiring.py` | LIVE-1 | UT-UP-01, targeted tests + scoped static | `design.md` → Диагноз/Decisions 1,6; `src/depends/services.py:309–401`; три constructor signatures; `tests/unit/depends/test_service_dependencies.py` как образец; handoff LIVE-1 |
| BE-2 | Backend | A: upload methods `src/core/services/{prices,horse,news}.py`, price upload `src/api/prices.py`, `tests/unit/api/test_entity_photo_upload_http.py`, три `test_*_photo_upload.py`, при необходимости upload fixtures `tests/unit/conftest.py` | BE-1 | UT-UP-02..08 и final-service gate | `design.md` → Decisions 2..6, Access/Test matrix; delta; upload methods/routes; `tests/unit/api/test_news_access.py` как HTTP harness; `src/core/services/photos.py:109–140`; repository set_*_photos read-only; handoff BE-1 |
| LIVE-2 | Backend | B: root `.qa/fix-entity-photo-upload-wiring/LIVE-2/`, те же fixture resources | BE-2 | SM-UP-01 after, SM-UP-02..04 | `design.md` → SMOKE/acceptance registry; delta → UP-01..03 и access; handoff LIVE-1 с fixture IDs и before path; handoff BE-2 |
| QG | Quality Gate | C: root `.qa/fix-entity-photo-upload-wiring/QG/`, `docs/reports/fix-entity-photo-upload-wiring.md` | LIVE-2 | QG-LITE: независимые unit/full gates и live группа | `design.md` → Test matrix/acceptance registry/Access; delta; path-scoped backend diff; handoffs BE-1/BE-2/LIVE-1/LIVE-2; verification policy |

## 1. LIVE-1 — исходный reproducer на тестовом API (профиль: Backend)

**Specs:** photo-batch-upload-attach · **Пути:** deliverable B, LIVE-1 · **Зависит от:** approval и отдельное разрешение. Это baseline до изменения кода, не setup/teardown инфраструктуры.

- [ ] LIVE-1.1 Подтвердить pre-fix revision и безопасную identity изолированного test API, `_test` PG, storage prefix, test accounts и permit target/resources/expiry; evidence — redacted fingerprint, при отсутствии любого prerequisite вернуть blocked до mutation.
- [ ] LIVE-1.2 В разрешённом target подготовить owned fixtures двух tenant и три entity с существующим main; зафиксировать безопасные ID, исходные связи и cleanup inventory, не использовать UUID пользовательской сущности.
- [ ] LIVE-1.3 Через `.claude/skills/api-smoke-test` с явным `design.md` воспроизвести SM-UP-01 price upload с валидным PNG и исходным методом/route suffix/multipart; сохранить reproducer-before.json с actual 400 и точной ошибкой; если FAIL не получен — blocked closure.
- [ ] LIVE-1.4 В той же baseline группе подтвердить аналогичный отказ horses/news и отсутствие новых связей/storage writes; сохранить scenario evidence и fixture fingerprint для after.
- [ ] LIVE-1.V Завершить baseline smoke группу в бюджете design, записать ledger и пути evidence; передать Router fixture IDs/permit expiry/revision в handoff, отметить фактически выполненные tasks. Никаких самостоятельных deploy/setup/teardown.

## 2. BE-1 — production DI и её регрессия (профиль: Backend)

**Specs:** photo-batch-upload-attach · **Пути:** deliverable A, BE-1 · **Зависит от:** LIVE-1.

- [ ] BE-1.1 Добавить параметризованный regression test трёх production factories, подтверждающий отсутствие PhotoService в исходной сборке и обязательную идентичность переданных зависимостей; сохранить targeted before result.
- [ ] BE-1.2 Исправить get_price_service: Depends(get_photo_service) и именованный constructor kwarg; wiring test подтверждает готовность price upload без ручного создания service.
- [ ] BE-1.3 Исправить get_horse_service: передать PhotoService и PhotoUrlBuilder; wiring test исключает обе ошибки неинициализированных зависимостей.
- [ ] BE-1.4 Исправить get_news_service и закончить UT-UP-01, включая совместное использование request session/repository в production dependency graph; kwargs test и dependency graph assertion зелёные.
- [ ] BE-1.V Выполнить из backend `uv run pytest tests/unit/depends/test_entity_photo_upload_wiring.py` и scoped non-mutating Ruff/mypy owned paths, сохранить ledger/evidence и handoff. Не запускать полный suite на этой границе.

## 3. BE-2 — безопасный upload поток и HTTP регрессия (профиль: Backend)

**Specs:** photo-batch-upload-attach · **Пути:** deliverable A, BE-2 · **Зависит от:** BE-1. Финальная граница backend.

- [ ] BE-2.1 Добавить HTTP harness с реальными routers/handlers/services/PhotoService, override только листовых auth/repository/media dependencies; проверить выполнение POST потока всех трёх endpoints и очистку dependency_overrides finalizer.
- [ ] BE-2.2 Передать current_user из price upload route и добавить в upload method административную проверку принятого ADMIN/SUPERUSER/DEVELOPER набора до lookup/writes; UT-UP-03 подтверждает 403 для empty/SEO-only scopes.
- [ ] BE-2.3 В трёх upload methods заменить missing ClientError на NotFoundError, сохранить tenant-scoped lookup и защиту от entity с чужим equestrian_id; UT-UP-04..05 подтверждают одинаковый 404 foreign/missing и отсутствие side effects.
- [ ] BE-2.4 В трёх upload methods сохранить прежний main id и передавать его при каждом обновлении связей; UT-UP-07 проверяет сохранение main/старых id, а также отсутствие auto-main при исходном None.
- [ ] BE-2.5 Реализовать и прогнать HTTP UT-UP-02..06 по `design.md` (response, cookie/roles, tenant/selector, multipart границы), без override service factories и без изменения глобальных handlers.
- [ ] BE-2.6 Обновить service upload тесты и необходимые fixture/caller сигнатуры; сгруппированно закрыть UT-UP-07..08 (main, partial success, all-invalid, storage/validator failure), существующий PhotoService rollback regression остаётся зелёным.
- [ ] BE-2.7 Проверить конечный diff против inventory трёх entity и delta spec; canonical Ruff preparation только owned paths, отсутствие repository/schema/frontend/NATS diff подтверждено path-scoped git diff.
- [ ] BE-2.V Выполнить final-service `make -C services/backend test` и `make -C services/backend lint` (включает canonical Ruff format check), без повторных aliases; сохранить результаты/ledger и handoff с runtime revision для тестового deployment оператором.

## 4. LIVE-2 — проверка исправления и персистентности (профиль: Backend)

**Specs:** photo-batch-upload-attach · **Пути:** deliverable B, LIVE-2 · **Зависит от:** BE-2 и предоставленный оператором fixed test API с действующим permit.

- [ ] LIVE-2.1 Сверить test identity/fixtures/permit с LIVE-1 и revision fixed API, не подменять baseline новой БД; evidence — fingerprint и ссылка на before, при несовпадении остановиться до writes.
- [ ] LIVE-2.2 Через `.claude/skills/api-smoke-test` на реальной PostgreSQL повторить SM-UP-01 теми же ключами/bytes/metadata для трёх сущностей; сохранить reproducer-after.json, сравнимый с before, ожидается 200 и сохранённые фото/связи.
- [ ] LIVE-2.3 Выполнить SM-UP-02: anonymous/invalid cookie, non-admin, privileged own, foreign/missing и selector negatives; подтвердить статусы access matrix и отсутствие side effects обоих tenant при отказах.
- [ ] LIVE-2.4 Выполнить SM-UP-03..04: main/старые связи после commit при успехе и partial success, контракт ответа/URL и anonymous public read; чтение из новой сессии/API, evidence не заменять fakes.
- [ ] LIVE-2.V Завершить единую after smoke группу в бюджете, выполнить только разрешённый owned cleanup, сохранить ledger/evidence и handoff; передать QG рецепт fixtures для независимого повторения. Missing infra/permit → blocked, не PASS.

## 5. QG — независимый общий gate (профиль: Quality Gate)

**Specs:** photo-batch-upload-attach · **Пути:** deliverable C · **Зависит от:** LIVE-2. Профиль QG-LITE; один QG evidence owner на все свойства.

- [ ] QG.1 Проверить scope/ownership, runtime/test fingerprints и сопоставимость LIVE-1 before/LIVE-2 after, finite acceptance registry; неприменимость UI/NATS/миграций зафиксировать с причиной.
- [ ] QG.2 Независимо выполнить backend tests/lint один раз на актуальной revision, проверить реальные factories в UT-UP-01..08 и отсутствие service overrides в HTTP tests; evidence — QG ledger.
- [ ] QG.3 Независимо повторить SM-UP-01 after и SM-UP-02..04 через smoke skill на разрешённом изолированном real PG/API target с собственными owned fixtures; missing permit/infra или невоспроизведённый исходный FAIL не закрывать как PASS.
- [ ] QG.4 Проверить delta access matrix, переданные роли/tenant, main и response contracts; при finding вернуть владельцу bounded fix, максимум один targeted QG recheck, затем stop при незакрытом finding.
- [ ] QG.V Выполнить `openspec status --change fix-entity-photo-upload-wiring --json` и `openspec validate fix-entity-photo-upload-wiring --type change --strict`, создать единственный итоговый `docs/reports/fix-entity-photo-upload-wiring.md` с evidence/gaps/verdict, отметить фактические tasks и вернуть Router handoff.

## Workflow follow-up

- Router после единого QG и устранения blocking findings синхронизирует delta specs, повторяет strict validation и архивирует change по отдельному approval/finalization workflow.
- Не создавать дополнительные отчёты/каталог в docs/reports; runtime evidence и временные smoke материалы остаются только в `.qa/fix-entity-photo-upload-wiring/`.
- Shipping/commit/release/setup/teardown не разрешены этим чеклистом автоматически; отдельные gates и permits остаются обязательными.
