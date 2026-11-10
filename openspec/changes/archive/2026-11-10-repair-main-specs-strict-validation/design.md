# Design — исправление общей strict-валидации

Задание: prompt Router / PLAN-1, docs-only, OpenSpec 1.14.3. Источник не оформлен отдельным `docs/tasks`; новый legacy-план не создаётся.

## Context

См. proposal — Why. Baseline выполнен до любых изменений main specs. Его результат: 116 items, 51 PASS / 65 FAIL, exit 1. Всего **171 сообщение: 7 ERROR и 164 WARNING**. Распределение: 143 предупреждения длины, 15 Purpose, 6 ERROR + 6 WARNING для одних и тех же отсутствующих сценариев, 1 ERROR дублирования. Диагностики после устранения duplicate могут раскрыть дополнительные предупреждения: уже найдено длинное описание `Таблица email_logs`, скрытое ранним отказом парсинга файла.

Evidence: `.qa/repair-main-specs-strict-validation/{baseline-status.txt,baseline.diff,baseline-index.diff,baseline-untracked.txt,baseline-strict.txt,baseline-strict.exit,diagnostics-by-name.json,spec-fingerprints.json}`. Это локальное игнорируемое evidence, не tracked deliverables. Для untracked specs сохранены SHA-256 в fingerprints; они не добавляются в ownership. Baseline diff содержит весь отслеживаемый foreign diff; не использовать его для массового отката/применения.

**Планирование завершено в PLAN-TOOLS-3:** 25/25 Planner slices done; 65/65 capabilities покрыты (54 с нормативными deltas, 9 Purpose-only, 2 layout-only). Подготовлены 15 точных Purpose, две точные Yandex H2 вставки и полная shipping delta из 9 MODIFIED. Пользовательское адресное согласие снимает planning ownership blocker, но не является общим approval: main specs и все 148 реализационных checkbox неизменны. Все артефакты готовы к общему пользовательскому review/approval; до явного approval apply запрещён.

## Goals / Non-Goals

Цель — 0 errors / 0 warnings точного общего validator после завершения change, при сохранении нормативного смысла всех затронутых блоков. Не цель — исправлять реализацию по несовпадениям с историческими spec, обновлять CLI, suppress warnings, ослаблять strict или удалять нормы ради зелёного gate.

API, schema БД и runtime неизменны. Access matrix: неприменимо — нет новых/изменённых endpoint или access exceptions. Anonymous/authenticated outcomes, включая tenant/owner ограничения, сохраняются дословно при переносе в сценарии; новые runtime-тесты не требуются. PostgreSQL, NATS, UI/manual QA, сборки и сервисные suites неприменимы: только документационные статические проверки.

## Decisions

1. **Идентичность по имени и тексту, не индексу.** В inventory ниже приведены реальные parser names. Перед unit повторить scoped validation и сверить SHA-256 назначенных файлов с handoff; drift означает сверку владельцем/Router, не overwrite. Индексы текущего лога — диагностические, не ключ операции.
2. **Короткая норма + полный сценарный контракт.** Сохранять существующее имя, SHALL/MUST, все ранее существовавшие сценарии, условия, поля, статусы, отрицания, роли и ограничения доказательства. Длинные перечисления переносить в именованные сценарии со связкой WHEN/THEN/AND. Никаких общих заглушек вместо конкретного поведения. Новое Requirement допустимо только при действительном разделении независимых уже существующих норм и с явной трассировкой. Полный исходный текст → новый блок/сценарий фиксируется в локальном ledger исполнителя. Существующий баг/неподтверждённое поведение отмечается gap, не исправляется кодом.
3. **Purpose — прямые main-only правки после approval.** Объём — назначение capability по действующим требованиям и существующим anchors, не TODO, не название change и не обещание будущего поведения. Минимум 50 символов, предметное русскоязычное описание. Требования заранее описываются deltas; Purpose существующего spec нельзя передать delta-заголовком.
4. **Email duplicate — controlled normalization.** Сохранить имя `Alembic миграция`, объединить оба существующих блока в один с обеими миграциями и четырьмя различимыми сценариями из подготовленной delta. Нельзя автоматическое MODIFIED поверх ambiguous source: штатный sync справедливо отклоняет duplicate. В DOC-BE-4 один раз непосредственно нормализовать только эти два main-блока, сохранив остальной файл, затем delta становится однозначной и идемпотентной. Исправление длинного `Таблица email_logs` также адресно переносится из одобренной delta в main в этом unit. Сравнение проводится с обоими исходными блоками, не с одним выбранным по имени.
5. **Yandex: сначала классификация, не придумывание сценариев.** Прочитан parser 1.14.3 (`core/parsers/markdown-parser.js:parseRequirements`): каждый непосредственный дочерний заголовок Requirements считается требованием, даже без `Requirement:`. Все шесть ошибок относятся к ретроспективному контексту после десяти реальных требований в каждом spec. Правильное минимальное исправление — вынести весь хвост под новый `##` раздел после Requirements, сохранив текст, gaps, таблицы, anchors и существующие 20 сценариев каждого файла. Не повышать произвольные внутренние заголовки до `#### Scenario:`. Normative deltas для вымышленных требований REMOVED/ADDED не создавать. При обнаружении настоящей нормы в контексте — остановить unit, точечно проверить source и согласовать корректный Planner split, без нового поведения. Относительные ссылки исправлять только там, где перенос действительно меняет их разрешение; не перерабатывать исторические отчёты или всё дерево ссылок.
6. **Исправления main один раз, без временного sync ради QG.** После approval назначенные DOC units адресно вносят одобренные редакторские изменения в main specs: Purpose, контекст, duplicate и сокращение требований с переносом деталей в сценарии. Это реализация docs-only задачи, не изменение runtime. Normative deltas заранее описывают тот же конечный контракт. Main не перезаписывается целиком сгенерированным output и не восстанавливается после временного sync. QG проверяет реальные main specs до sync; изолированная проекция дополнительно доказывает идемпотентность будущего sync, без потери нормализованного контекста и foreign overlay.

## Deliverables и ownership

A–M в таблице — непересекающиеся файловые зоны. Файл main spec и его delta принадлежат одному профилю; два units одного профиля в одном файле выполняются последовательно. Иные units не получают blanket-доступ к чужим specs или сервисам. `tasks.md` — только отметка собственных IDs после факта. Корректировка shared proposal/design остаётся Planner; профильный исполнитель не меняет общий scope.

J: planning ownership blocker снят адресным пользовательским согласием. Пользователь ответил дословно: «Да, разрешаю адресные исправления» на вопрос: «Разрешаете подготовить, а после общего approval — применить адресные исправления strict-диагностик в уже изменённом openspec/specs/task-shipping-tooling/spec.md, сохранив все существующие чужие правки? Файл не будет коммититься или присваиваться этой задаче целиком без отдельного согласования.»

Согласие разрешает подготовить delta сейчас и последовательные адресные main-правки DOC-TOOLS-3 только после общего approval, без одновременной записи другим владельцем. Оно не присваивает чужие hunks и не разрешает whole-file commit. Если shipping tool требует целого смешанного файла — отдельное решение пользователя обязательно; до него не stage/commit этот main-файл. Перед DOC-TOOLS-3 сверить baseline; drift → stop/Router, не overwrite. Текущий baseline: `task-shipping-tooling/spec.md` SHA-256 `742f4ea1b7337764c035d770f860cdca1473cb27ce0ee5074c59b789a3e95af9`; unstaged foreign добавляет шесть требований и 12 сценариев AG-01..12 после исходных 10 требований, index diff пуст. Никаких удалений/изменений прежних блоков в overlay нет. [Foreign diff](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-3/foreign.diff), [index diff](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-3/foreign-index.diff), [fingerprints](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-3/protected-hashes.json), [точечный baseline](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-3/task-shipping-tooling-spec.before.md). Чужие шесть требований, 12 сценариев и весь хвост сохраняются дословно в проекции; main read-only в этом Planner slice.

`agent-acceptance-tooling`, `python-test-collection`, `qa-readiness-profile` — read-only, baseline PASS. Любые новые диагностики в них требуют возврата к Router и нового ownership, не auto-fix. Завершённые отчёты других changes read-only. Итоговый QG отчёт — только `docs/reports/repair-main-specs-strict-validation.md` и только в QG.

## Execution units

Каждый unit имеет 5–12 содержательных действий: точечное чтение, проверка исходных норм, редактура назначенных блоков/сценариев, сверка потерь, scoped static verification и handoff. В маленьких группах несколько связанных файлов образуют один editorial slice. При реальном превышении — atomic partial и split до следующего invocation. Числа диагностик ниже — оценка, не автоматический бюджет. Сервисный код read-only и читается только по существующим anchors при реальной неоднозначности.

Во **всех строках** ownership означает `openspec/specs/<capability>/spec.md` для прямых редакторских исправлений и `openspec/changes/repair-main-specs-strict-validation/specs/<capability>/spec.md` для нормативных deltas; не весь каталог openspec. Проверка `scoped` означает `openspec-local validate <capability> --type spec --strict` в реальном рабочем root после адресных исправлений + `git diff --check -- <назначенные пути>`. Выполняется только одна группа scoped static checks, не общий прогон на каждый unit.

| Unit | Профиль | Deliverable | Capability paths (ownership) | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| DOC-BE-1 | Backend | A | `backend-domain-capabilities`; требования: «Безопасный HTML page data», «Управление лошадьми в tenant-контексте», «Управление родословной», «Access matrix backend domain endpoints», «Access matrix коротких наименований», «Нормализация необязательных полей пород и мастей» | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-BE-2 | Backend | A | `backend-domain-capabilities`; требования: «Access contract исправления создания лошади», «Фильтрация лошадей по оказываемым услугам», «Имя фотографии безопасно укладывается в ограничение хранения», «Access matrix операций фотографий сохраняется», «Управляемый slug лошади», «Access contract управления slug лошади» | DOC-BE-1 | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-BE-3 | Backend | B | `backend-access-platform`, `service-endpoint-auth`, `service-users`, `user-management-api`, `breed-group-management`, `horse-service-relations` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-BE-4 | Backend | C | `email-database-models`, `email-backend-proxy`, `seo-backend-proxy`, `seo-peer-http-contract`, `news-public-slugs` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-FE-1 | Frontend | D | `callback-request-consumer-form`, `callback-request-lifecycle`, `callback-requests-admin-ui` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-FE-2 | Frontend | D | `cms-breed-group-management`, `cms-horse-breed-group-documentation`, `cms-horse-ui-quality`, `cms-seo-data-ui` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-SITE-1 | Site Consumer | E | `inlove-site-shell`, `inlove-site-skeleton`, `site-consumer-contracts` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-SITE-2 | Site Consumer | E | `inlove-content-pages`, `inlove-horses-pages`, `inlove-news-pages`, `inlove-placeholder-pages`, `inlove-callback-form` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-SITE-3 | Site Consumer | E | `inlove-services-pages`, `inlove-price-group-curation` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-SITE-4 | Site Consumer | E | `inlove-site-settings-curation`, `inlove-production-api-config`, `inlove-ui-components` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-INFRA-1 | Backend | F | `nats-jetstream-protocols` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-INFRA-2 | Backend | F | `celery-redis-protocols`, `database-connection-pooling`, `nats-resilience`, `redis-infrastructure`, `platform-observability` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-NOTIFY-1 | Backend | G | `notification-database-models`, `notification-repositories`, `notification-seed-data`, `notification-callback-handler` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-NOTIFY-2 | Backend | G | `notification-orchestrator`, `notification-settings-api`, `notification-settings-ui` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-PHOTO-1 | Backend | H | `photo-batch-upload-attach`, `photo-upload-ui`, `metrica-parse-queue` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-TOOLS-1 | Backend | I | `openspec-workflow` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-TOOLS-2 | Backend | I | `repository-process-tooling`, `ci-workflows` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-TOOLS-3 | Backend | J | `task-shipping-tooling` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-VK-1 | Backend | K | `vk-service-skeleton`; требования: «Сервис vk-service создаётся копированием email-service», «Email-специфичный код полностью удалён», «Запрещённые токены в тестах и документации пишутся обычными литералами», «Идентичность и зависимости сервиса приведены к VK», «Деплой-конфигурация копируется без изменений и помечается как неготовая», «Настройки очищены от email и содержат VK-конфигурацию» | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-VK-2 | Backend | K | `vk-service-skeleton`; требования: «Адрес main backend указывает на существующий контейнер», «Приложение поднимается без email-роутера и без активной NATS-топологии», «Baseline-тесты подтверждают чистоту скелета», «Документация сервиса описывает границы скелета», «Миграционная цепочка содержит VK-домен и применима», «HTTP-поверхность сервиса ограничена health и VK-домены» | DOC-VK-1 | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-VK-3 | Backend | K | `vk-service-orchestration` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-VK-4 | Backend | K | `vk-api-endpoints`, `vk-backend-proxy`, `vk-user-storage` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-VK-5 | Backend | K | `vk-bot-longpolling`, `vk-confirmation`, `vk-notification-delivery`, `vk-settings-ui` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-YA-1 | Backend | L | `yandex-client-failures`, `yandex-peer-http-contract` | — | scoped | design: Decisions + реестр только этих capabilities; соответствующие main/delta spec.md; handoff зависимости |
| DOC-YA-2 | Backend | M | `yandex-service-runtime`, `yandex-services-access-evidence` (main-only layout; delta не нужна) | — | scoped parser/layout + strict | design: Decisions 5 + «Точный layout DOC-YA-2»; два main spec.md; `.qa/repair-main-specs-strict-validation/PLAN-YA-2/traceability.json` |
| QG | Quality Gate | Q | deltas read-only; `.qa/repair-main-specs-strict-validation/QG/**`; единственный итоговый отчёт | все DOC units | независимый QG-DOCS | design: Test matrix + проекция; tasks; только diff затронутых specs и baseline fingerprints |

### DAG и последующее планирование

```text
25 завершённых PLAN slices + адресно согласованный foreign overlay
  → пользовательский approval всех артефактов (ожидается; apply запрещён)
  ├─ DOC-BE-1 → DOC-BE-2
  ├─ DOC-VK-1 → DOC-VK-2
  └─ остальные DOC units (непересекающиеся paths)
все DOC units → QG-DOCS → пользовательское разрешение финализации → sync → root strict → archive
```

**Конкретный circuit-breaker split PLAN-1:** текущая сессия PLAN-1a — baseline, именованный реестр, email delta и каркас декомпозиции. Затем для каждой строки DOC таблицы назначить отдельный `PLAN-<суффикс DOC>` того же ownership как ограниченный Planner invocation: подготовить полные нормативные deltas для точно перечисленных блоков, уточнить текст Purpose в design и подтвердить сохранность контрактов. Для split-файлов строго последовательный порядок, как в DOC DAG. Строка DOC-BE-4 уже имеет email delta, следующий Planner читает её, не переписывает без причины и готовит остальные четыре capabilities. PLAN-YA-2 занимается только контекстным layout и ссылками, не новыми runtime-нормами. Отдельный пустой checkpoint/synthesis invocation не нужен: последний фактический Planner slice одновременно обновляет полноту proposal, design/tasks и общий planning gate. Не делегировать реализацию незавершённой части плана. Профиль всех этих последующих PLAN units — Planner; contextFiles — только соответствующая строка таблицы, диагностические блоки и нужные anchors, не все 65 файлов.

## Проверка общей main-spec validation до sync/archive

QG сначала выполняет точную `.cache/openspec-tool/1.14.3/openspec-local validate --specs --strict` в реальном root **после DOC units, до sync/archive**. Требуется exit 0, 0 WARNING/ERROR и все main specs PASS. Исполнители уже адресно внесли одобренные редакторские исправления; временный sync и откат не нужны. Затем для проверки идемпотентности deltas независимый QG создаёт **отдельную обычную копию** полного актуального `openspec/specs` (включая foreign overlay и untracked specs) и `openspec/config.yaml` в `.qa/repair-main-specs-strict-validation/QG/projection/openspec/`. Не использовать symlink/hardlink, чтобы запись проекции не затронула исходники. До/после — fingerprints всех source specs; копирование проверяется сравнением хешей. Проекция не исключает прежние FAIL/PASS capabilities.

Временный ESM helper лежит только в `.qa/.../QG/`; использовать штатный pinned модуль `.cache/openspec-tool/1.14.3/node_modules/@fission-ai/openspec/dist/core/specs-apply.js`: `findSpecUpdates(changeRoot, projectionSpecsRoot)`, затем для каждого update `buildUpdatedSpec(update, changeId, {silent:true})`, записывать `rebuilt` **только в update.target внутри projection root**. API проверен по фактическому `.d.ts`: `rebuilt`, `counts`, `warnings`. `writeUpdatedSpec` с root target, archive, --no-validate, --skip-specs, автоматическое подавление warnings не применять. Проверять абсолютные source/target roots перед каждой записью, не удалять существующее evidence. Все адресные редакторские исправления уже внесены владельцами в main, поэтому копия их содержит. Не выводить эту проекцию обратно целиком в рабочее дерево.

Сравнить rebuilt-проекцию с уже исправленным main: нормативные блоки, сценарии, Purpose, контекст и foreign hunks должны совпадать; допустимую чисто шовную нормализацию пустых строк отметить отдельно. Это проверка **идемпотентности будущего sync**, не повторный runtime gate. При содержательном отличии — finding, не перезапись root. Если проекция идентична по содержанию, повторять тот же полный validator в копии не требуется: root PASS и fingerprint equality дают тот же результат. Если остаётся обоснованное форматное отличие, отдельно выполнить **тот же абсолютный pinned executable** с `validate --specs --strict` из cwd projection и зафиксировать причину дополнительного прогона. Требуется exit 0, все items PASS, 0 WARNING/ERROR в сборке и validation. Проекция не добавляет capabilities, поэтому ожидается 116 PASS при неизменном inventory. Drift инвентаря фиксируется явно и согласуется, не маскируется жёстко старым числом.

Из исходного root отдельно выполнить change strict. Проверить source fingerprints неизменными на протяжении QG. В отчёте различать `root baseline FAIL`, `root after DOC PASS` и `sync projection idempotent`: наличие delta само по себе не PASS. Так общий main-contract проверяется **до настоящего sync/archive**, без временного sync в рабочем дереве с последующим rollback.

После APPROVED и пользовательского gate Router выполняет sync стандартным workflow: только назначенные нормативные блоки, редакторские main-only правки и foreign content сохраняются. Сравнить resulting specs с одобренной проекцией по всем затронутым блокам и неизменным чужим файлам; выполнить точную root-команду `validate --specs --strict`, получить 0 warnings/errors, затем archive без повторного неидемпотентного применения. Проверить archive и финальный root strict. Новая правка/изменение foreign overlay/CLI после QG инвалидирует соответствующий evidence: заново построить проекцию и bounded QG recheck, не переносить старый PASS.

## Test matrix

Общий evidence owner — один независимый QG; owner checks DOC units не заменяют его. Для каждой строки prerequisites включают завершённые deltas, approval и доступный pinned tool. Изоляция — обычные файлы `.qa`, permission — только docs/read-only код; PG/NATS permit не нужен и не предоставляется. Общий бюджет — один статический QG прогон; после findings один bounded recheck, далее stop/Router.

| riskId | scenarioId | unit | testPath/command | evidenceOwner | prerequisites | isolation | permission | budget | stopCondition | status |
|---|---|---|---|---|---|---|---|---|---|---|
| R-BASE | DOC-01 | PLAN-1a | точный root `validate --specs --strict` | Planner (baseline) | pinned 1.14.3, текущий checkout | read-only | чтение specs | один baseline | tool failure | passed: 51/65, exit 1 — исходный дефект воспроизведён |
| R-LOSS | DOC-02 | все DOC / QG | оригинал → full delta: поля, outcomes, роли, исключения, прежние scenarios | QG | завершённый именованный ledger и deltas | scope diff | docs | 5–12 действий/unit | потеря нормы/неясность источника | planned |
| R-DUP | DOC-03 | DOC-BE-4 / QG | email delta: `Таблица email_logs`, `Alembic миграция`; unique names, обе миграции, 4 migration scenarios | QG | controlled merge main без потерь | файл email | docs | scoped | ambiguous duplicate или новые warnings | planned |
| R-YA | DOC-04 | DOC-YA-2 / QG | два Yandex spec: до/после parser inventory, 10 реальных требований и 20 старых scenarios в каждом; контекст сохранён вне Requirements | QG | context anchors | 2 main files | docs | scoped | потеря gap/настоящей нормы | planned |
| R-PURPOSE | DOC-05 | соответствующие DOC / QG | все 15 Purpose из реестра: назначение по существующим requirements, не placeholders | QG | source anchors | scoped main | docs | scoped | выдуманное поведение/короткий Purpose | planned |
| R-GLOBAL | DOC-06 | QG | точный root `validate --specs --strict` + read-only сборка проекции для идемпотентности sync | QG | все DOC, безопасная проекция | root read-only + полная копия в .qa | без root writes | 1 полный root прогон | любой error/warning или fingerprint drift | planned |
| R-CHANGE | DOC-07 | QG | `validate repair-main-specs-strict-validation --type change --strict`; `status --change repair-main-specs-strict-validation --json`; scoped diff-check | QG | все артефакты и tasks актуальны | read-only | docs | одна static группа | неполные deltas/задачи или warning | planned |
| R-FOREIGN | DOC-08 | DOC-TOOLS-3 / QG | baseline vs итог: foreign hunks и три read-only PASS specs сохранены | QG | адресное согласие зафиксировано; общий approval до DOC | исходное дерево read-only для QG | чужие записи запрещены | scoped | overlap без согласования | planned: planning blocker снят; DOC/QG после общего approval |
| R-SYNC | DOC-09 | Router, после QG | resulting main vs одобренная проекция; точный root strict после sync и archive | Router (финализация) | QG APPROVED, пользовательский gate | рабочий root, только scope | отдельный sync/archive gate | 1 gate на новое состояние | drift или любой warning | planned |

DOC-02/03 трассируются на подготовленную email delta; остальные сценарии — на редакторский контракт и именованный реестр design. Runtime anonymous/authenticated, PostgreSQL, NATS, browser lanes — not-applicable: runtime не изменяется.

## Migration Plan

Сейчас меняются только артефакты нового change и игнорируемое evidence. После завершения Planner slices — показать весь план пользователю, остановиться до approval. Далее bounded DOC units → один QG-DOCS → findings только назначенному владельцу → финализация Router. Автоматический reset/checkout/revert для rollback запрещён: сохранять foreign overlay, отменять только собственные адресные изменения после согласования. Финальный отчёт пока не создан.

## Open Questions / approval gates

1. Требуется восстановить оборванное пользовательское условие «Если диагности…»? Оно не предположено и не является скрытым acceptance criterion.
2. Адресное согласие foreign overlay получено и зафиксировано выше; planning blocker закрыт. Общий approval всех артефактов ещё не получен. Whole-file stage/commit смешанного shipping spec по-прежнему требует отдельного согласования; при необходимости — stop/Router.
3. Вход пока в prompt. Если Router хочет отдельный `docs/tasks`, это его отдельное действие: у PLAN-1 нет ownership на создание такого файла.

## Именованный реестр

Это актуальная привязка baseline, не инструкции менять старые числовые индексы. `длина` = warning >500; `Purpose` = placeholder; `нет сценария (контекст)` = пара ERROR+WARNING, а не два разных дефекта. При повторном validator после duplicate/переноса контекста учитывать вновь раскрытые диагностики без расширения scope молча. Подготовленная email delta уже покрывает latent `Таблица email_logs`.

### `backend-access-platform`

- **Access matrix backend access platform** — длина.

### `backend-domain-capabilities`

- **Безопасный HTML page data** — длина.
- **Управление лошадьми в tenant-контексте** — длина.
- **Управление родословной** — длина.
- **Access matrix backend domain endpoints** — длина.
- **Access matrix коротких наименований** — длина.
- **Нормализация необязательных полей пород и мастей** — длина.
- **Access contract исправления создания лошади** — длина.
- **Фильтрация лошадей по оказываемым услугам** — длина.
- **Имя фотографии безопасно укладывается в ограничение хранения** — длина.
- **Access matrix операций фотографий сохраняется** — длина.
- **Управляемый slug лошади** — длина.
- **Access contract управления slug лошади** — длина.

### `breed-group-management`

- **Access matrix API групп и пород** — длина.

### `callback-request-consumer-form`

- **Purpose** — Purpose.

### `callback-request-lifecycle`

- **Purpose** — Purpose.
- **Разрешённые переходы и неизменность заявки** — длина.
- **Access matrix callback API** — длина.

### `callback-requests-admin-ui`

- **Purpose** — Purpose.
- **Filters, sorting и pagination** — длина.
- **Frontend test matrix и Manual QA** — длина.

### `celery-redis-protocols`

- **Purpose** — Purpose.

### `ci-workflows`

- **Purpose** — Purpose.

### `cms-breed-group-management`

- **Frontend test matrix** — длина.

### `cms-horse-breed-group-documentation`

- **Developer-документация access contract** — длина.
- **Regression coverage документационных вкладок** — длина.

### `cms-horse-ui-quality`

- **Защищённый CMS-контур управления лошадьми** — длина.
- **Scope-aware UX для действий с лошадьми и родословной** — длина.
- **Поле slug в CMS-форме лошади** — длина.

### `cms-seo-data-ui`

- **Серверные фильтр и сортировка в заголовке** — длина.

### `database-connection-pooling`

- **Purpose** — Purpose.

### `email-backend-proxy`

- **Расширенная access matrix email proxy** — длина.
- **Access matrix email proxy** — длина.

### `email-database-models`

- **Alembic миграция** — дубликат.

### `horse-service-relations`

- **Access matrix для связей лошадь-услуга** — длина.

### `inlove-callback-form`

- **Отправка использует существующее публичное POST-исключение** — длина.

### `inlove-content-pages`

- **Серверная главная страница** — длина.
- **Серверная страница О клубе** — длина.
- **Общий блок контактов** — длина.

### `inlove-horses-pages`

- **SEO и доступ страницы лошадей** — длина.

### `inlove-news-pages`

- **Отдельная серверная деталь новости** — длина.

### `inlove-placeholder-pages`

- **Карта сайта обслуживает семь публичных маршрутов** — длина.

### `inlove-price-group-curation`

- **Недостающие price_groups создаются локально прямой SQL-записью** — длина.
- **Существующие тарифы назначаются в новые группы идемпотентно** — длина.
- **Curation обратима и является строго локальной data-операцией** — длина.
- **Существующая матрица доступа сохраняется** — длина.

### `inlove-production-api-config`

- **Все разрешённые запросы отправляют tenant selector без CMS credentials** — длина.

### `inlove-services-pages`

- **Три страницы услуг рендерят SSR-контент из профильного API** — длина.
- **SEO и доступ по карте услуг** — длина.
- **Сетка карточек тарифов плотнее на desktop и компактнее на mobile** — длина.
- **Фильтрация тарифов на всех трёх страницах услуг выполняется backend через выделенные price_groups** — длина.

### `inlove-site-settings-curation`

- **About хранится четырьмя строковыми настройками** — длина.
- **Существующая матрица доступа сохраняется** — длина.

### `inlove-site-shell`

- **Shared layout получает настройки один раз и предоставляет fallback** — длина.
- **Header предоставляет разрешённую desktop и mobile навигацию** — длина.
- **Footer предоставляет повторную навигацию и контакты** — длина.

### `inlove-site-skeleton`

- **Каркас сохраняет интеграционный слой CMS и получает первый презентационный слой** — длина.
- **Runtime identity нейтральна и конфигурируема** — длина.

### `inlove-ui-components`

- **Section-примитив управляет вертикальным ритмом без суммирования отступов** — длина.
- **CTA-блоки с `tone="forest"` сохраняют читаемый заголовок и заметные кнопки** — длина.

### `metrica-parse-queue`

- **Ретраи только для временных ошибок** — длина.
- **Lease и восстановление после сбоя** — длина.

### `nats-jetstream-protocols`

- **NATS Jetstream клиент должен использовать Dependency Injection** — длина.
- **NATS Jetstream consumers должны настраиваться автоматически** — длина.
- **Резервирование VK messaging-имён без активации контракта** — длина.
- **NATS-клиент регистрирует connection-колбэки с политикой эскалации** — длина.
- **Уникальность Nats-Msg-Id в пределах stream** — длина.
- **Признак duplicate в PubAck обрабатывается явно** — длина.
- **Штатный idle timeout pull-consumers Notification и VK** — длина.

### `nats-resilience`

- **Purpose** — Purpose.

### `news-public-slugs`

- **Стабильный сохраняемый slug новости** — длина.
- **Access matrix news** — длина.

### `notification-callback-handler`

- **Purpose** — Purpose.
- **CallbackEventHandler** — длина.

### `notification-database-models`

- **Purpose** — Purpose.

### `notification-orchestrator`

- **Purpose** — Purpose.
- **NotificationOrchestratorService** — длина.
- **Canonical messaging compatibility** — длина.
- **Изолированная проверка publisher failures** — длина.

### `notification-repositories`

- **Purpose** — Purpose.

### `notification-seed-data`

- **Purpose** — Purpose.

### `notification-settings-api`

- **Access matrix notification settings** — длина.

### `notification-settings-ui`

- **Таблица событий и каналов** — длина.

### `openspec-workflow`

- **Профиль Quality Gate соразмерен diff** — длина.
- **Ожидание агентов без поллинга** — длина.
- **Стадия READY-FOR-MANUAL** — длина.
- **Approval gate «Сливать в main?»** — длина.
- **Approval gate «Релизить?»** — длина.
- **Операционные шаги финализации выполняет Router по skill task-finalize** — длина.

### `photo-batch-upload-attach`

- **Purpose** — Purpose.
- **Access control матрица** — длина.

### `photo-upload-ui`

- **Purpose** — Purpose.

### `platform-observability`

- **Защита чувствительных данных** — длина.
- **Шумоподавление транзиентной инфраструктурной телеметрии** — длина.

### `redis-infrastructure`

- **Purpose** — Purpose.
- **YAML-файл учёта БД Redis** — длина.

### `repository-process-tooling`

- **Полный non-mutating core release gate** — длина.
- **Кросс-репозиторные контрактные проверки не теряются вне монорепы** — длина.
- **stackctl покрывает публичные сайты и готовность к ручной проверке** — длина.
- **Актуальная документация пайплайна** — длина.
- **Ограниченная поддержка Яндекс-peers и их БД в stackctl** — длина.

### `seo-backend-proxy`

- **Проксирование списков** — длина.

### `seo-peer-http-contract`

- **Множество HTTP-статусов и безопасные ошибки** — длина.

### `service-endpoint-auth`

- **Access Matrix сервисных эндпоинтов** — длина.

### `service-users`

- **Callback recipient lookup MUST combine tenant and role filters** — длина.

### `site-consumer-contracts`

- **Public Read boundary для site-ksk-inlove** — длина.
- **Consumer access matrix** — длина.
- **Эффективная кличка родословной без изменения consumer** — длина.

### `task-shipping-tooling`

- **Контракт CLI shipctl** — длина.
- **Определение изменённого репозитория и пофайловый план** — длина.
- **Защита посторонних изменений** — длина.
- **Именование веток и commit convention** — длина.
- **Порядок MERGE и остановка при сбое** — длина.
- **Ручное разрешение конфликта и продолжение** — длина.
- **RELEASE fast-forward main в release** — длина.
- **Контроль CI через gh** — длина.
- **Тестирование инструментов без реальных push** — длина.

### `user-management-api`

- **Tenant isolation операций управления пользователями** — длина.
- **Access matrix CMS user-management** — длина.

### `vk-api-endpoints`

- **Access matrix приватного VK API** — длина.
- **Обработка доменных ошибок в HTTP-статусы** — длина.

### `vk-backend-proxy`

- **Client и schemas для vk-service** — длина.
- **Access matrix VK proxy** — длина.

### `vk-bot-longpolling`

- **Fail-fast при непригодной конфигурации VK** — длина.
- **Устойчивость long-poll цикла** — длина.

### `vk-confirmation`

- **Подтверждение привязки по контрольной строке** — длина.

### `vk-notification-delivery`

- **Каноническая VK notification command** — длина.
- **Изолированный local smoke harness** — длина.

### `vk-service-orchestration`

- **Compose-файл vk-service в .docker-compose** — длина.
- **Отдельная база данных db-vk в инфраструктурном compose** — длина.
- **Непересекающееся распределение портов и переменных окружения** — длина.
- **Автономные Make-цели vk-service без расширения core release scope** — длина.
- **services.manifest и скрипты оркестрации не изменяются** — длина.
- **Архитектурная документация и реестры синхронизированы** — длина.

### `vk-service-skeleton`

- **Сервис vk-service создаётся копированием email-service** — длина.
- **Email-специфичный код полностью удалён** — длина.
- **Запрещённые токены в тестах и документации пишутся обычными литералами** — длина.
- **Идентичность и зависимости сервиса приведены к VK** — длина.
- **Деплой-конфигурация копируется без изменений и помечается как неготовая** — длина.
- **Настройки очищены от email и содержат VK-конфигурацию** — длина.
- **Адрес main backend указывает на существующий контейнер** — длина.
- **Приложение поднимается без email-роутера и без активной NATS-топологии** — длина.
- **Baseline-тесты подтверждают чистоту скелета** — длина.
- **Документация сервиса описывает границы скелета** — длина.
- **Миграционная цепочка содержит VK-домен и применима** — длина.
- **HTTP-поверхность сервиса ограничена health и VK-домены** — длина.

### `vk-settings-ui`

- **Инструкция и контрольная строка** — длина.
- **Внешняя ссылка на диалог с ботом** — длина.

### `vk-user-storage`

- **Таблица user_vks** — длина.

### `yandex-client-failures`

- **Единственный тип ошибки на границе клиента** — длина.
- **Локальные исключения и безопасная диагностика** — длина.
- **Валидация ответа Метрики с сохранением частичного списка** — длина.

### `yandex-peer-http-contract`

- **Локальное множество HTTP-статусов** — длина.
- **Access matrix существующих peer endpoints** — длина.

### `yandex-service-runtime`

- **Coverage: source → requirement/scenario → evidence (контекст delta)** — длина, нет сценария (контекст).
- **Actual execution — только static observation (контекст delta)** — длина, нет сценария (контекст).
- **Нормативные сопоставления и gaps для S1/F1 (контекст delta)** — длина, нет сценария (контекст).
- **Передача в синтез (контекст delta)** — нет сценария (контекст).

### `yandex-services-access-evidence`

- **Контекст передачи — локальная декомпозиция и exact F1 context pack** — длина, нет сценария (контекст).
- **Verification PLAN-S1** — длина, нет сценария (контекст).



## Точный layout DOC-YA-2

Результат PLAN-YA-2: **только две вставки заголовка, без нормативной delta**. После approval DOC-YA-2 добавляет в каждый файл ровно `## Ненормативный ретроспективный контекст` и пустую строку непосредственно перед первым указанным ниже H3. Файл остаётся на прежнем пути; исходные H3 не переименовываются, не повышаются до Scenario и не перемещаются относительно друг друга. Весь хвост становится дочерним нового H2, а `## Requirements` заканчивается перед ним. Начальный Purpose/контекст, все десять настоящих Requirement и двадцать Scenario каждого файла дословно неизменны. Удаление одной вставки из каждой проекции побайтно восстанавливает исходник.

| Main spec / исходный anchor | Точный существующий H3 | Строка после вставки | Классификация |
|---|---|---|---|
| `yandex-service-runtime/spec.md#L164` | `### Coverage: source → requirement/scenario → evidence (контекст delta)` | 166 | таблица source → норма/scenario → test-source evidence; не отдельный runtime-контракт |
| `yandex-service-runtime/spec.md#L181` | `### Actual execution — только static observation (контекст delta)` | 183 | исторические Dockerfile/Makefile observations, явно не запуск |
| `yandex-service-runtime/spec.md#L185` | `### Нормативные сопоставления и gaps для S1/F1 (контекст delta)` | 187 | GAP-Y3-*, ссылки на уже действующие нормы, unknowns и запреты ложных гарантий; не новое требование |
| `yandex-service-runtime/spec.md#L195` | `### Передача в синтез (контекст delta)` | 197 | исторический handoff F1/S1 и DAG другого change, не новый execution unit |
| `yandex-services-access-evidence/spec.md#L217` | `### Контекст передачи — локальная декомпозиция и exact F1 context pack` | 219 | прежний context pack из 10 файлов и ownership PLAN-S1/PLAN-F1, не security enforcement |
| `yandex-services-access-evidence/spec.md#L242` | `### Verification PLAN-S1` | 244 | исторические static results и ограничения NOT RUN, не Scenario/новый PASS |

Первая вставка — перед строкой 164 [runtime main](../../specs/yandex-service-runtime/spec.md#L164), вторая — перед строкой 217 [access evidence main](../../specs/yandex-services-access-evidence/spec.md#L217). Новый H2 располагается на исходной строке вставки; исходный H3 смещается на +2. Это полная инструкция heading edits; остальные строки не редактировать.

**Доказательство по parser 1.14.3.** [parseSections/getContentUntilNextHeader](../../../.cache/openspec-tool/1.14.3/node_modules/@fission-ai/openspec/dist/core/parsers/markdown-parser.js#L60-L103) строит дерево по уровню заголовков; [parseRequirements](../../../.cache/openspec-tool/1.14.3/node_modules/@fission-ai/openspec/dist/core/parsers/markdown-parser.js#L117-L146) берёт каждого непосредственного ребёнка Requirements, не проверяя префикс `Requirement:`. Поэтому исходные хвостовые H3 становятся 4 и 2 ложными требованиями без scenarios; после нового H2 они вообще не входят в Requirements. Parser inventory меняется `14 → 10` и `12 → 10`, но все настоящие нормы и `Y3-01..20`/`S1-01..20` сохраняются, новые runtime-сценарии отсутствуют. Краткие описания десяти настоящих требований обоих файлов уже проходят scoped strict; здесь нечего сокращать.

**Source inspection и предел классификации.** Context coverage runtime main 164–179 указывает на settings/database/main, а не задаёт новую операцию. Прочитаны текущие [settings](../../../services/yandex-service/src/settings.py#L10-L59), [database lifecycle](../../../services/yandex-service/src/utils/database.py#L8-L50), [Y main lifecycle](../../../services/yandex-service/src/main.py#L33-L59), [Y routes/health](../../../services/yandex-service/src/main.py#L96-L111), [M lifecycle](../../../services/ya-metrica-service/src/main.py#L62-L82), [M routes/health](../../../services/ya-metrica-service/src/main.py#L131-L145). В сочетании с явными static-only/NOT RUN пометками это подтверждает ретроспективную, а не новую нормативную функцию шести секций. Упоминания действующих SHALL/production gate в gaps остаются ссылками и ограничениями доказательства, не удаляются и не превращаются в пожелания runtime-реализации.

**Сохранность ссылок и gaps.** Пути файлов и тексты всех исходных ссылок остаются побайтно прежними; относительное разрешение ни одной ссылки от вставки H2 не меняется. Existing H3 heading anchors также сохраняются. Числовые line anchors на хвосты теперь исторические (+2 строки), но массовое изменение входящих ссылок чужих capabilities/отчётов в ownership не входит. Нет необходимости чинить relative paths из-за relocation: физического перемещения файла/текста в другой файл нет. Сохраняются GAP-Y3-READINESS/SHUTDOWN/CONFIG/POOL/TELEMETRY/PEER-ENV/ACCESS, G-S1-AUTH/OWNER/TOKEN/STATE/LIFECYCLE/LOG/EXPOSURE/TEST и FT-01..08. Anonymous/fake headers не объявляются valid auth; source tests не объявляются runtime PASS.

**Выявленные исходные gaps, не расширение scope.** Исторические ссылки имеют глубину delta-пути даже в main; их работоспособность не доказана и вставка её не исправляет. Исторический HEAD в контексте не равен текущему service checkout: Y lifespan теперь запускает NATS maintenance, M содержит дополнительные routes; старые line anchors main.py/описание полноты 20 paths не подтверждают актуальный runtime. Это сохранённый исторический baseline, не новое подтверждение current topology или production readiness. Не переписывать десять настоящих норм либо historical verification в этом editorial change; возможное обновление retrospective baseline требует отдельного решения Router. Реальные ENV/credentials, приложения и тесты не запускались.

**Evidence и повторяемость.** [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-YA-2/traceability.json) содержит шесть false names, их длины/нулевые сценарии, полный inventory настоящих норм/Scenario names, SHA-256 и line mapping; [check.mjs](../../../.qa/repair-main-specs-strict-validation/PLAN-YA-2/check.mjs) проверяет parser и две изолированные проекции, полное совпадение объектов настоящих requirements/scenario rawText, всех links/gap IDs и восстановление исходника удалением вставки. [scoped-check.json](../../../.qa/repair-main-specs-strict-validation/PLAN-YA-2/scoped-check.json): две полные проекции strict PASS без issues; исходники не записывались. Независимый DOC/QG повтор обязателен, owner evidence его не заменяет.

## Точные Purpose для main-only редакторских правок

Все 15 текстов ниже дословно перенесены из purpose-proposals завершённых slices; каждый заменяет только placeholder тела `## Purpose` соответствующего main после approval. Обоснования и исходная traceability остаются у владельцев по ссылкам; это описание существующего назначения, не новый SHALL и не нормативная delta. Остальные Purpose не менять.

### Purpose `callback-request-consumer-form`

Публичная форма обратного звонка `site-ad` обеспечивает прямую анонимную отправку контактных данных посетителя в backend через публичный API с tenant selector и credentialless CORS, валидацией полей, защитой от повторной отправки и сохранением введённых данных при ошибке.

Источник/обоснование: [PLAN-FE-1](../../../.qa/repair-main-specs-strict-validation/PLAN-FE-1/purpose-proposals.md).

### Purpose `callback-request-lifecycle`

Жизненный цикл заявок на обратный звонок охватывает их хранение с tenant ownership, реестр статусов, публичное создание, защищённый просмотр персональных данных и ограниченные изменения статуса, spam и подтверждения публикации уведомления с разграничением CMS и service-доступа.

Источник/обоснование: [PLAN-FE-1](../../../.qa/repair-main-specs-strict-validation/PLAN-FE-1/purpose-proposals.md).

### Purpose `callback-requests-admin-ui`

CMS-раздел заявок на обратный звонок предоставляет пользователям ADMIN и SUPERUSER защищённые таблицу и детальный просмотр заявок, фильтрацию, сортировку, пагинацию, изменение статуса и spam, а также инструкцию по работе и явные состояния загрузки, отсутствия данных и ошибок доступа.

Источник/обоснование: [PLAN-FE-1](../../../.qa/repair-main-specs-strict-validation/PLAN-FE-1/purpose-proposals.md).

### Purpose `celery-redis-protocols`

Определить единый протокол применения Celery в микросервисах EqSiteCMS: настройки и DI-интеграцию, размещение и именование задач, изоляцию очередей и БД Redis, обработку повторов и ошибок, адресную проверку готовности воркеров и отдельный интеграционный контроль доставки, идемпотентности и конкурентного жизненного цикла сессий БД.

Источник/обоснование: [PLAN-INFRA-2](../../../.qa/repair-main-specs-strict-validation/PLAN-INFRA-2/purpose-proposals.md).

### Purpose `database-connection-pooling`

Зафиксировать конфигурацию пула соединений SQLAlchemy AsyncEngine основного backend-сервиса, её настройку через переменные окружения и поведение при конкурентных запросах, устаревших и долгоживущих соединениях PostgreSQL.

Источник/обоснование: [PLAN-INFRA-2](../../../.qa/repair-main-specs-strict-validation/PLAN-INFRA-2/purpose-proposals.md).

### Purpose `nats-resilience`

Определить устойчивость подключения VK-сервиса к NATS: ограниченные повторные подключения с заданным интервалом, успешное восстановление связи и запуск в деградированном режиме при недоступности брокера без блокировки независимых от NATS HTTP-запросов.

Источник/обоснование: [PLAN-INFRA-2](../../../.qa/repair-main-specs-strict-validation/PLAN-INFRA-2/purpose-proposals.md).

### Purpose `redis-infrastructure`

Зафиксировать инфраструктурное размещение Redis в Docker Compose с парольным доступом и сохранением данных, необходимые переменные окружения и единый справочник распределения БД между сервисами, включая резервирование номеров и проверку отсутствия конфликтов агентами Backend и Quality Gate.

Источник/обоснование: [PLAN-INFRA-2](../../../.qa/repair-main-specs-strict-validation/PLAN-INFRA-2/purpose-proposals.md).

### Purpose `notification-database-models`

Модели каналов, событий и пользовательских настроек уведомлений обеспечивают хранение метаданных, связей и уникальных записей, а также начальных каналов и события обратного звонка.

Источник/обоснование: [PLAN-NOTIFY-1](../../../.qa/repair-main-specs-strict-validation/PLAN-NOTIFY-1/purpose-proposals.md).

### Purpose `notification-repositories`

Репозитории уведомлений обеспечивают базовые операции с сущностями, постраничное чтение, выбор каналов и событий по коду и получение пользовательских подписок на события.

Источник/обоснование: [PLAN-NOTIFY-1](../../../.qa/repair-main-specs-strict-validation/PLAN-NOTIFY-1/purpose-proposals.md).

### Purpose `notification-seed-data`

Инициализация данных уведомлений обеспечивает последовательный запуск сидеров без дублирования существующих записей, создание каналов и события обратного звонка и применение миграций с повторными попытками.

Источник/обоснование: [PLAN-NOTIFY-1](../../../.qa/repair-main-specs-strict-validation/PLAN-NOTIFY-1/purpose-proposals.md).

### Purpose `notification-callback-handler`

Обработка событий обратного звонка формирует уведомления email и VK для разрешённых получателей конюшни, исключает внутренние идентификаторы из текста и отмечает доставку после публикации команды, не ожидая результата провайдера.

Источник/обоснование: [PLAN-NOTIFY-1](../../../.qa/repair-main-specs-strict-validation/PLAN-NOTIFY-1/purpose-proposals.md).

### Purpose `notification-orchestrator`

Оркестрация событий уведомлений с отбором допустимых получателей, независимой публикацией команд email и VK, идемпотентным подтверждением брокера и изолированной локальной проверкой сбоев каналов.

Источник/обоснование: [PLAN-NOTIFY-2](../../../.qa/repair-main-specs-strict-validation/PLAN-NOTIFY-2/purpose-proposals.md).

### Purpose `photo-batch-upload-attach`

Пакетная загрузка фотографий с присоединением к услугам, лошадям и новостям: формат multipart-запросов, метаданные, частичный успех, транзакционность и проверка административных прав и принадлежности сущности tenant.

Источник/обоснование: [PLAN-PHOTO-1](../../../.qa/repair-main-specs-strict-validation/PLAN-PHOTO-1/purpose-proposals.md).

### Purpose `photo-upload-ui`

Интерфейс выбора и загрузки фотографий в CMS: сетка по четыре фотографии в ряд, загрузка через выбор файлов и drag-and-drop с присоединением к текущей сущности, обработка результатов и сохранение существующих возможностей галереи.

Источник/обоснование: [PLAN-PHOTO-1](../../../.qa/repair-main-specs-strict-validation/PLAN-PHOTO-1/purpose-proposals.md).

### Purpose `ci-workflows`

Настройка пользовательского кеша uv в GitHub Actions workflow backend для установки зависимостей без ошибок доступа и повторного использования кешированных зависимостей между запусками CI.

Источник/обоснование: [PLAN-TOOLS-2](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-2/purpose-proposals.md).

## Planning coverage на завершение PLAN-TOOLS-3

Снимок по заданию Router, handoff PLAN-YA-2 и coverage предыдущих slices; общая baseline validation и повторное чтение всех deltas не выполнялись. **25/25 slices done; 65/65 capabilities планово покрыты**: 54 capabilities с нормативной delta, 9 Purpose-only без фиктивных deltas, 2 Yandex layout-only. 15 точных Purpose включают 6 capabilities с deltas и 9 Purpose-only. PLAN-TOOLS-3 добавляет 9 MODIFIED для shipping, сохраняя дословно исходные детали в 9 новых сценариях и все 26 прежних сценариев изменяемых блоков; остальные 7 требований (включая 6 foreign) остаются неизменны. PLAN-YA-1 принят по явному handoff, см. [полученное сообщение](../../../.qa/repair-main-specs-strict-validation/PLAN-YA-2/ya-1-handoff.md); остальные deltas не перечитывались. Это полнота планирования, не PASS реальных main и не выполнение DOC tasks.

| Planner → будущий DOC | Статус планирования | Traceability / evidence |
|---|---|---|
| PLAN-BE-1 → DOC-BE-1 | done | `PLAN-BE-1`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-BE-1/traceability.json); [preservation-check.json](../../../.qa/repair-main-specs-strict-validation/PLAN-BE-1/preservation-check.json) |
| PLAN-BE-2 → DOC-BE-2 | done | `PLAN-BE-2`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-BE-2/traceability.json) |
| PLAN-BE-3 → DOC-BE-3 | done | `PLAN-BE-3`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-BE-3/traceability.json) |
| PLAN-BE-4 → DOC-BE-4 | done | `PLAN-BE-4`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-BE-4/traceability.json) |
| PLAN-FE-1 → DOC-FE-1 | done | `PLAN-FE-1`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-FE-1/traceability.json) |
| PLAN-FE-2 → DOC-FE-2 | done | `PLAN-FE-2`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-FE-2/traceability.json) |
| PLAN-SITE-1 → DOC-SITE-1 | done | `PLAN-SITE-1`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-SITE-1/traceability.json) |
| PLAN-SITE-2 → DOC-SITE-2 | done | `PLAN-SITE-2`: [summary.md](../../../.qa/repair-main-specs-strict-validation/PLAN-SITE-2/summary.md); [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-SITE-2/traceability.json); [traceability.md](../../../.qa/repair-main-specs-strict-validation/PLAN-SITE-2/traceability.md) |
| PLAN-SITE-3 → DOC-SITE-3 | done | `PLAN-SITE-3`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-SITE-3/traceability.json) |
| PLAN-SITE-4 → DOC-SITE-4 | done | `PLAN-SITE-4`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-SITE-4/traceability.json) |
| PLAN-INFRA-1 → DOC-INFRA-1 | done | `PLAN-INFRA-1`: [summary.md](../../../.qa/repair-main-specs-strict-validation/PLAN-INFRA-1/summary.md); [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-INFRA-1/traceability.json); [traceability.md](../../../.qa/repair-main-specs-strict-validation/PLAN-INFRA-1/traceability.md) |
| PLAN-INFRA-2 → DOC-INFRA-2 | done | `PLAN-INFRA-2`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-INFRA-2/handoff.md); [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-INFRA-2/traceability.json) |
| PLAN-NOTIFY-1 → DOC-NOTIFY-1 | done | `PLAN-NOTIFY-1`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-NOTIFY-1/traceability.json); [traceability.md](../../../.qa/repair-main-specs-strict-validation/PLAN-NOTIFY-1/traceability.md) |
| PLAN-NOTIFY-2 → DOC-NOTIFY-2 | done | `PLAN-NOTIFY-2`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-NOTIFY-2/handoff.md); [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-NOTIFY-2/traceability.json) |
| PLAN-PHOTO-1 → DOC-PHOTO-1 | done | `PLAN-PHOTO-1`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-PHOTO-1/handoff.md); [traceability.md](../../../.qa/repair-main-specs-strict-validation/PLAN-PHOTO-1/traceability.md) |
| PLAN-TOOLS-1 → DOC-TOOLS-1 | done | `PLAN-TOOLS-1`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-1/handoff.md); [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-1/traceability.json) |
| PLAN-TOOLS-2 → DOC-TOOLS-2 | done | `PLAN-TOOLS-2`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-2/handoff.md); [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-2/traceability.json) |
| PLAN-TOOLS-3 → DOC-TOOLS-3 | done — адресное согласие зафиксировано | [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-3/traceability.json); [scoped-check.json](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-3/scoped-check.json); [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-TOOLS-3/handoff.md) |
| PLAN-VK-1 → DOC-VK-1 | done | `PLAN-VK-1`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-1/handoff.md); [traceability.md](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-1/traceability.md) |
| PLAN-VK-2 → DOC-VK-2 | done | `PLAN-VK-2`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-2/handoff.md); [traceability.md](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-2/traceability.md) |
| PLAN-VK-3 → DOC-VK-3 | done | `PLAN-VK-3`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-3/handoff.md); [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-3/traceability.json) |
| PLAN-VK-4 → DOC-VK-4 | done | `PLAN-VK-4`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-4/handoff.md); [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-4/traceability.json); [traceability.md](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-4/traceability.md) |
| PLAN-VK-5 → DOC-VK-5 | done | `PLAN-VK-5`: [handoff.md](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-5/handoff.md); [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-VK-5/traceability.json) |
| PLAN-YA-1 → DOC-YA-1 | done — получен handoff | [handoff](../../../.qa/repair-main-specs-strict-validation/PLAN-YA-2/ya-1-handoff.md); [traceability](../../../.qa/repair-main-specs-strict-validation/PLAN-YA-1/traceability.md) |
| PLAN-YA-2 → DOC-YA-2 | done — layout, без delta | `PLAN-YA-2`: [traceability.json](../../../.qa/repair-main-specs-strict-validation/PLAN-YA-2/traceability.json) |

**Применение без фиктивных deltas:** Purpose-only — `callback-request-consumer-form`, `celery-redis-protocols`, `database-connection-pooling`, `nats-resilience`, `notification-database-models`, `notification-repositories`, `notification-seed-data`, `photo-upload-ui`, `ci-workflows`; layout-only — две capabilities DOC-YA-2. Для них отсутствие delta намеренное, основание применения — точный design, а не вымышленный MODIFIED неизменного требования. Во всех других завершённых случаях использовать назначенную существующую delta и handoff владельца. Split main-файлов BE-1→BE-2 и VK-1→VK-2 остаётся последовательным.

**Готовность к общему approval:** все содержательные Planner slices завершены; planning ownership blocker закрыт. Нормативная shipping delta, точные 15 Purpose и две Yandex H2 вставки полностью заданы. Ожидается явный пользовательский approval всех артефактов. Оборванное «Если диагности…» не интерпретировано и не стало требованием. Отдельный пустой synthesis/checkpoint unit не нужен. После общего approval остаются все DOC units и независимый QG-DOCS; ни один реализационный checkbox сейчас не отмечается. Реальный root strict zero-warning и идемпотентность общего sync доказывает будущий QG, не текущий scoped PASS. Whole-file commit смешанного shipping spec — отдельный gate, адресное согласие его не покрывает.
