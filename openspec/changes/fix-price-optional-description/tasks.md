# Tasks — fix-price-optional-description

Реализация только после approval пользователя: deliverable A принадлежит Backend, B — Quality Gate; [design.md](design.md#execution-units) содержит DAG, test matrix, prerequisites и бюджет; checkbox отмечается сразу после фактического выполнения, не по намерению.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| BE-PD-1 | Backend | A | `services/backend/src/core/services/prices.py` (PriceService), `services/backend/tests/unit/core/services/test_price_service.py`, новый `services/backend/tests/unit/api/test_prices_description_contract.py`; локальные fixtures; `.qa/fix-price-optional-description/BE-PD-1/` | approval пользователя; отдельный permit до live mutation | price regression, final-service test/lint, bounded live | `design.md`, `specs/backend-domain-capabilities/spec.md`, PriceService/DTO/price routes/auth-tenant dependencies, существующий price service test, `test_news_detail_api.py`, backend `Makefile`, verification policy; точные пути — design → contextFiles BE-PD-1 |
| QG | Quality Gate | B | `.qa/fix-price-optional-description/QG/`, будущий `docs/reports/fix-price-optional-description.md`; код read-only | BE-PD-1 | единый QG-LITE, независимый full backend gate, live и отчёт | `design.md#test-matrix`, delta spec, handoff BE-PD-1, diff трёх путей A, backend `Makefile`, verification policy, smoke skill перед live |

## 1. BE-PD-1 — точечное исправление и регрессия цены (профиль: Backend)

**Specs:** `backend-domain-capabilities` · **Пути:** deliverable A выше · **Зависит от:** approval пользователя. Одна сессия/price slice, ориентир 6 существенных действий. При missing test target/permit или пересечении ownership — blocked/partial и handoff Router, без скрытого расширения scope.

- [x] BE-PD-1.1 До изменения кода воспроизвести SM-PD-01 через `.claude/skills/api-smoke-test/SKILL.md` на реальном API и изолированной PostgreSQL после подтверждения target/permit; сохранить `.qa/fix-price-optional-description/BE-PD-1/reproducer-before.json` с исходным `400` и detail. Проверка завершения — сопоставимый исходный FAIL; при unreproduced/нет permit остановить runtime closure и передать блокер Router.
- [x] BE-PD-1.2 В `PriceService` разрешить нормализованную пустую строку только в description, сохранив trim/511, exclude_none и валидацию page_data/name/slug; завершение подтверждается UT-PD-01 и review минимального diff без PriceGroup изменений.
- [x] BE-PD-1.3 Дополнить `test_price_service.py` параметризованной регрессией UT-PD-01..04 (create/update, UUID/slug, пробелы, omitted/null, длина и запрет записи при отказе); проверить targeted pytest вместе с существующими group tests по design.
- [x] BE-PD-1.4 Добавить `test_prices_description_contract.py` с реальным router/service и локальными tenant-aware fakes, очисткой DI overrides; проверить UT-PD-05..07: anonymous/authenticated, response description, foreign tenant, Public Read и missing/invalid selector без изменения production auth wiring.
- [x] BE-PD-1.5 Повторить SM-PD-01 и выполнить SM-PD-02..04 smoke skill на реальном API/PostgreSQL с разрешёнными owned fixtures; сохранить сопоставимый `reproducer-after.json` (`200` и read-after-write), impacted regression и безопасный ledger; без permit/infra не отмечать выполненным и не подменять mock evidence.
- [x] BE-PD-1.V На финальной границе backend выполнить один раз `make -C services/backend test` и `make -C services/backend lint` (canonical Ruff format-check уже внутри lint), проверить свой diff и evidence; отметить только выполненные IDs и вернуть Router handoff. При инфраструктурном блокере — явно partial/blocked, не PASS.

## 2. QG — единая независимая приёмка (профиль: Quality Gate)

**Specs:** `backend-domain-capabilities` · **Пути:** deliverable B выше · **Зависит от:** BE-PD-1. Профиль `QG-LITE`; FE lanes неприменимы без frontend diff. Test matrix и acceptance registry не дублируются: см. design.

- [x] QG.1 Проверить handoff, минимальность diff/ownership и отсутствие изменений DTO/БД/NATS/frontend; завершение — архитектурная и контрактная сверка с design и delta spec в evidence QG.
- [x] QG.2 Независимо проверить UT-PD-01..07 и access matrix, включая no-extra-scope authenticated writes, foreign tenant и Public Read; выполнить один full `make -C services/backend test` на актуальной revision, без повторного запуска эквивалентного targeted набора; сохранить ledger и результат покрытия.
- [x] QG.3 Проверить owner before/after исходного бага и независимо выполнить SM-PD-01..04 smoke skill на реальном API/PostgreSQL при отдельном разрешённом test target/permit; сопоставить route/input/state и read-after-write. При missing prerequisites/unreproduced оформить blocked, не PASS; один targeted recheck после fix максимум.
- [x] QG.4 Выполнить независимый `make -C services/backend lint` (без форматирования чужих файлов), scoped diff/links check и `openspec validate fix-price-optional-description --type change --strict`; сохранить результаты и классификацию findings.
- [x] QG.V Создать единственный итоговый `docs/reports/fix-price-optional-description.md` с покрытием, gaps и вердиктом QG-LITE; проверить существование отчёта/ссылок на `.qa`, отметить фактически выполненные IDs и передать Router handoff. Открытые критические проверки не объявлять пройденными.

## Workflow follow-up

- Router возвращает findings владельцу A; независимый recheck выполняет тот же QG, не более одного targeted раунда. При превышении бюджета — остановка и решение пользователя.
- После положительного QG и пользовательского approval финализации Router синхронизирует delta в main specs, повторяет strict validation, архивирует change и проверяет архив. До этого main specs не изменять; archive не включается в tracked tasks, чтобы не блокировать собственный workflow.
- Shipping/deployment и setup/teardown PostgreSQL требуют отдельных разрешений; данный план их не предоставляет.
