# Единая verification policy

Канонический контракт для Planner, исполнителей и Quality Gate. Профильные инструкции ссылаются сюда; policy не меняет Makefile и API Access Policy. Команда в плане — не доказательство её выполнения.

## Границы verification

| stage | Обязательная проверка | Не запускать автоматически |
|---|---|---|
| unit | Targeted tests изменённых модулей и зависимых fixtures; scoped non-mutating lint/typecheck/format-check | Полный suite/build сервиса, root aggregate |
| final-service | В последнем unit сервиса полный `make test`, `make lint`, canonical format/check; CMS FE также `npm run build` | Эквивалентные npm aliases и отдельный tsc, уже включённый в lint |
| owner-self-check | До первого QG: FE scoped browser selection по diff; BE paired wire/transaction/topology checks по риску | Весь browser gate; self-check вместо независимого QG |
| fix | Exact reproducer FAIL→PASS, затем impacted regression | Full suite без причины; substitute mock вместо исходной среды |
| QG | Независимое исполнение обязательных тестов затронутых зон; один full suite сервиса на актуальной revision | Дубликат соседней lane или повтор alias той же команды |
| docs-only | Static policy/links/OpenSpec checks | Product runtime suites/build |

Планировщик назначает финальную границу явно. Если scoped цель отсутствует, используй прямой нативный вызов инструмента на принадлежащих unit paths. Full fallback допустим с ledger reason `scoped-command-unavailable`, не как дефолт каждого unit. Full suite после fix допускается при общем коде, неизвестном blast radius или сломанном gate с отдельной причиной.

### Aliases и canonical formatter

Перед запуском сверь Makefile и конфигурацию сервиса: `make test` и `npm test` могут быть одним suite, `make lint` может включать ESLint и tsc. Выполни каждую эффективную команду один раз на границе; aliases запиши в ledger, но не создавай второй run. Финальные цели core-сервисов `make format`, `make test`, `make lint` сохраняются: mutating format — подготовка владельца перед evidence, non-mutating canonical check — проверка результата. QG не форматирует чужие пути.

Один canonical formatter определяется Makefile/конфигурацией данного сервиса. Второй formatter поверх него без доказанной совместимости запрещён; не переключать Black↔Ruff циклически. Whitespace/import ordering без смены смысла при зелёном canonical gate — minor, без отдельного fix/recheck. Если canonical gate падает от drift — один scoped repair владельцу с воспроизводимой причиной; semantic diff не подпадает под исключение.

## Evidence, invalidation и dedup

Evidence key: `scenarioId + codeFingerprint/revision + environmentFingerprint + options`. Изменение diff после прогона инвалидирует затронутые evidence по dependency/blast radius, но не независимые сервисы. Учитывай также fixture/config/tool version changes. Неизвестный blast radius требует нового gate с причиной; старый PASS не переносится молча.

Минимальные ledger fields: `runId, stage, unit, scenarioId, evidenceOwner, command, aliases, revision, codeFingerprint, environmentFingerprint, options, startedAt, finishedAt, status, evidencePath, reason, previousRunId`. Повтор требует `reason` и `previousRunId`; первый run имеет null previousRunId. Environment identity безопасная, без DSN/credentials. Ledger/evidence хранятся в `.qa/<change>/<unit>/`; реализацию collect/append CLI даёт USAGE unit, policy не выдумывает его flags.

Статусы acceptance: `planned`, `passed`, `failed`, `blocked`, `not-applicable`, `unchecked`; для последних трёх причина обязательна. Команда без выполнения, collection-only, 0 scenarios или skip критической проверки — не passed. Реестр QG имеет конечные scenario IDs, один evidence owner на пересекающееся свойство; другие lanes ссылаются на evidence и проверяют свою границу. Owner PASS не заменяет независимый QG run. После не более двух infrastructure repair attempts и одного targeted QG recheck — stop при сохраняющемся finding/ключевом blocker/исчерпанном бюджете, решение пользователю.

## Ownership closure и prerequisites

Ownership законченного slice заранее включает непосредственно зависимые tests, fixtures/conftest, wiring/DI, migration/head fixtures, DTO snapshots, inventories/generators и их outputs. Один файл — один владелец; пересечение исполняется последовательно. Неназначенный необходимый путь — blocker для корректировки ownership Router, не разрешение менять его. Несвязанный pre-existing diff не включается автоматически.

Матрица design связывает поля: `riskId, scenarioId, unit, testPath/command, evidenceOwner, prerequisites, isolation, permission, budget, stopCondition, status`. Различай missing checkout/dependencies/tooling, provisionable test-role fixtures и внешний OAuth gap. До дорогого исполнения — подготовка назначенным unit, перенос или явный непроверенный gap с решением пользователя; synthetic OAuth не доказывает real vendor path.

Бюджет ~5–12 существенных действий — эвристика контекста, не число файлов. Slice включает свои тесты и acceptance; две связанные fixtures не основание для split. Checkpoint units запрещены: handoff/отметка tasks/короткая verification входят в рабочий unit. При реальном превышении безопасный atomic partial с причиной `scope/ownership/infrastructure/other` и bounded split; героическое завершение запрещено.

## Risk-based owner acceptance

| Риск diff | Prerequisites и evidence до QG |
|---|---|
| FE controls/modals/tables | Chromium 1366×768, конечные выбранные scenario IDs: keyboard/focus/contrast/scroll/geometry по изменённому механизму; неприменимое с причиной |
| DTO/HTTP/envelope | Production producer→consumer в отдельных service lockfile env; missing peer/deps в acceptance — failed/blocked, не skip; invalid variants отклоняются до storage |
| Recovery/rollback/lease | Изолированная real PostgreSQL `_test`, явный permit; persisted failure/recovery проверяется новой независимой session после rollback; concurrency — две sessions и bounded synchronization |
| Startup topology/replay | Изолированный NATS test broker/account, owned resources, отдельный permit; compatible/incompatible existing config, canonical headers, no silent topology repair |
| Config/time/lifecycle | Constructor kwargs/config boundary, task_expires, переход midnight внутри long batch; bounded waits и deterministic fixture cleanup по применимости |

Proposal/apply approval НЕ разрешает destructive tests или setup/teardown. До PG/NATS mutation нужны отдельное разрешение и fail-closed permit с target/resource scope/expiry, подтверждённая изоляция и bounded cleanup только owned resources. Нет permit/infra — blocked/unchecked с причиной, не PASS. Не использовать app/public fallback или canonical resources; не читать/печатать secrets в diagnostics. Helpers и точные CLI/schema передают их владельцы, не импровизировать runtime операции по этому документу.

## Exact reproducer для fix

До изменения выполнить точный исходный сценарий в эквивалентной среде и записать `.qa/<change>/<unit>/reproducer-before.json`, после — `reproducer-after.json`. Поля: `findingId, scenarioId, revision, environmentFingerprint, input, keys, route, domLocator, expected, actual, status, timestamp`; только безопасные идентификаторы и redacted input, без secrets/полных payload. Сопоставимы scenario/input/keys/route/DOM path и состояние слоёв до/после; revision и timestamps различаются ожидаемо.

Для Space → Escape во вложенном wizard повторяются именно Space → Escape и проверяются состояния обоих слоёв, focus return и pending state, а не абстрактный Escape тест. Mock browser/PG/NATS не закрывает реальный finding. Если исходный FAIL не воспроизведён (включая уже зелёный before) — `unreproduced` observation и blocked closure с причиной; не ломать код искусственно. После PASS — impacted regression и один recheck тем же QG-агентом, далее stop при открытом дефекте.

## Static verification

Из корня репозитория, без runtime продукта:

```bash
node --test scripts/tests/pipeline-policy.test.mjs
git diff --check -- AGENTS.md agents/planner.md agents/backend.md agents/frontend.md agents/howto/verification-policy.md agents/howto/context-economy-patterns.md scripts/tests/pipeline-policy.test.mjs openspec/changes/harden-agent-verification-pipeline/tasks.md
```

Связанные правила: [AGENTS](../../AGENTS.md), [Planner](../planner.md), [Backend](../backend.md), [Frontend](../frontend.md), [измерения контекста](context-economy-patterns.md). Helper commands проверяются по реальному CLI/schema после handoff соответствующего unit; этот static suite не доказывает browser/PG/NATS execution.
