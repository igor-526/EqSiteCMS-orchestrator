# Quality Gate: repair-main-specs-strict-validation

**Профиль:** QG-DOCS · **Вердикт: APPROVED** · **Дата:** 2026-11-10

## Контекст и границы

Независимая проверка после 25 DOC units: адресная редактура 65 main capabilities, 54 нормативных delta, 15 Purpose и две контекстные H2 вставки. Поведение продукта не меняется.
[Proposal](../../openspec/changes/repair-main-specs-strict-validation/proposal.md), [design/матрица](../../openspec/changes/repair-main-specs-strict-validation/design.md#test-matrix), [tasks](../../openspec/changes/repair-main-specs-strict-validation/tasks.md).
Общее approval передано Router в задании; адресное согласие для shipping зафиксировано в proposal. **Whole-file staging/commit смешанного shipping spec не разрешён.** Отдельный файл задачи и конвенция ветки не заданы.

## Результаты lanes

- QG-CONTRACTS / docs-static: **пройден**; смысл требований, сценарии, access outcomes, inventory и чужие изменения сохранены.
- QG-SYNTH: **пройден**; blocking/minor findings и waivers отсутствуют.
- ENV, BE/runtime, FORMAT(runtime), LIVE, FE-AUTO, FE-MANUAL: **неприменимо** — только документация; сервисные suites/build/browser/SMOKE не запускались. Infrastructure repair attempts: 0.

## Проверки и покрытие

Все evidence ниже находятся в [.qa/QG](../../.qa/repair-main-specs-strict-validation/QG/). Единственный evidence owner: **QG**.
Revision: `a84e18018831af956db642b9d84ae3dda534b0a5`; dirty source identity, pinned executable/module hashes, environment, options и времена — в `verification-ledger.json`; повторов acceptance suites без invalidation нет.

| Scenario | Фактическая проверка и результат |
|---|---|
| DOC-01 | Исходный сохранённый baseline: 51 PASS / 65 FAIL, exit 1; 7 ERROR / 164 WARNING. Это не итоговый PASS. |
| DOC-02 | Независимый baseline SHA-256 совпал для всех 65 исходников; штатный parser и original→main сопоставление. Все прежние сценарии дословно сохранены, кроме согласованного уточняющего email merge. Матрицы и ссылки сохранены. `semantic.json`, `parser.json`, `adjudication.json`. |
| DOC-03 | Единственное имя `Alembic миграция`, обе migration filenames, четыре различимых upgrade/downgrade сценария; полный набор полей/constraints email_logs сохранён. |
| DOC-04 | Два Yandex файла: 20 настоящих requirements / 40 прежних scenario.rawText неизменны. Шесть ложных requirements — исторический контекст. Удаление двух H2 вставок побайтно восстанавливает исходники, включая gaps/таблицы/anchors. Нормативное поведение в контекст не спрятано. |
| DOC-05 | 15/15 Purpose дословно совпали с design, 170–332 символа, описывают существующее назначение. |
| DOC-06 | Точная `.cache/openspec-tool/1.14.3/openspec-local validate --specs --strict` в реальном root: **exit 0, 116 PASS / 0 FAIL, 0 ERROR/WARNING**. `root-strict.log/.exit`. |
| DOC-06, проекция | Обычная независимая копия всех 116 specs и config; первоначальные хеши копии совпали. Пinned `findSpecUpdates/buildUpdatedSpec`: 54 updates, 0 warnings; 41 побайтно идентичен, 13 отличаются только пустыми строками. Последовательность всех непустых строк совпадает. |
| DOC-06, форматный шов | Из-за 13 шовных отличий выполнен абсолютный pinned executable с `validate --specs --strict` из cwd проекции: **exit 0, 116 PASS / 0 FAIL, 0 ERROR/WARNING**. `projection-strict.log/.exit`; это обоснованный дополнительный прогон по design, не alias root. |
| DOC-07 | Точный pinned `validate repair-main-specs-strict-validation --type change --strict`: **exit 0**, valid, без диагностик. `status --change … --json`: артефакты done, planning complete. Scoped `git diff --check`: **exit 0**; whitespace новых artifacts: 0. |
| DOC-07, ссылки | Проверено 216 локальных вхождений ссылок/числовых anchors: **0 новых поломок**; 123 сохранённых проблемных вхождения классифицированы ниже как pre-existing. |
| DOC-08 | Foreign shipping хвост: шесть requirements и AG-01..12 побайтно сохранены. Три read-only PASS specs (`agent-acceptance-tooling`, `python-test-collection`, `qa-readiness-profile`) побайтно совпали с PLAN-TOOLS-3 baseline. Drift остальных 51 capabilities: 0. |
| DOC-09 | **Не выполнялся, следующий этап Router:** настоящий sync/archive требует отдельного пользовательского gate. Это не gap текущего pre-sync QG. |

На scope штатный parser: 517→510 requirements объясняются только удалением шести ложных контекстных записей и merge одного duplicate. Проверены 1517 прежних scenarios. Кандидаты текстового анализатора отдельно рассмотрены, а не приняты за доказательство потери: матрицы разделены заголовками, email нормализован, retry/lease нормы Метрики сохранены в детальных сценариях.
Хеши всех 116 source specs совпали до/после проекции и на завершение gate (`source-before.json`, `source-after.json`, `source-final.json`). Main и deltas не записывались; symlink/hardlink не использовались. Проекция не возвращалась в root.

## Access verification results

Новых/изменённых endpoints нет. Статически сохранены исходные anonymous/authenticated сценарии и access matrix rows, tenant/owner границы, отрицания и статусы. Email create/update/delete остаются owner-only без role override; confirmation-flow public exceptions сохранены. Runtime anonymous/authenticated проверки неприменимы; существующие контрактные противоречия не переопределены этим editorial change.

## Pre-existing и ограничения

`static.json`/`links.json`: 123 вхождения (111 уникальных source/link) несуществующих локальных targets либо устаревших line ranges **дословно присутствовали в подтверждённом baseline**. Включая историческую delta-глубину ссылок Yandex; вставка H2 не меняет относительное разрешение. Это не новый дефект и не подтверждение работоспособности старых anchors.
Router рекомендуется отдельная задача `docs/tasks` на исправление исторических ссылок/ретроспективных evidence; текущий scope не расширялся. Runtime readiness, реальные credentials/OAuth, старые gaps и historical source statements этим gate не подтверждаются.
Waivers: **нет**. Findings, требующих fix-unit: **нет**.

## Пути change и следующая граница

Полный root-relative inventory main+артефактов: `scope-paths.json` в evidence. Код/runtime diff и чужие отчёты не принадлежат change.
Main scope (для адресного планирования, **не разрешение whole-file commit**):

```text
openspec/specs/backend-access-platform/spec.md
openspec/specs/backend-domain-capabilities/spec.md
openspec/specs/breed-group-management/spec.md
openspec/specs/callback-request-consumer-form/spec.md
openspec/specs/callback-request-lifecycle/spec.md
openspec/specs/callback-requests-admin-ui/spec.md
openspec/specs/celery-redis-protocols/spec.md
openspec/specs/ci-workflows/spec.md
openspec/specs/cms-breed-group-management/spec.md
openspec/specs/cms-horse-breed-group-documentation/spec.md
openspec/specs/cms-horse-ui-quality/spec.md
openspec/specs/cms-seo-data-ui/spec.md
openspec/specs/database-connection-pooling/spec.md
openspec/specs/email-backend-proxy/spec.md
openspec/specs/email-database-models/spec.md
openspec/specs/horse-service-relations/spec.md
openspec/specs/inlove-callback-form/spec.md
openspec/specs/inlove-content-pages/spec.md
openspec/specs/inlove-horses-pages/spec.md
openspec/specs/inlove-news-pages/spec.md
openspec/specs/inlove-placeholder-pages/spec.md
openspec/specs/inlove-price-group-curation/spec.md
openspec/specs/inlove-production-api-config/spec.md
openspec/specs/inlove-services-pages/spec.md
openspec/specs/inlove-site-settings-curation/spec.md
openspec/specs/inlove-site-shell/spec.md
openspec/specs/inlove-site-skeleton/spec.md
openspec/specs/inlove-ui-components/spec.md
openspec/specs/metrica-parse-queue/spec.md
openspec/specs/nats-jetstream-protocols/spec.md
openspec/specs/nats-resilience/spec.md
openspec/specs/news-public-slugs/spec.md
openspec/specs/notification-callback-handler/spec.md
openspec/specs/notification-database-models/spec.md
openspec/specs/notification-orchestrator/spec.md
openspec/specs/notification-repositories/spec.md
openspec/specs/notification-seed-data/spec.md
openspec/specs/notification-settings-api/spec.md
openspec/specs/notification-settings-ui/spec.md
openspec/specs/openspec-workflow/spec.md
openspec/specs/photo-batch-upload-attach/spec.md
openspec/specs/photo-upload-ui/spec.md
openspec/specs/platform-observability/spec.md
openspec/specs/redis-infrastructure/spec.md
openspec/specs/repository-process-tooling/spec.md
openspec/specs/seo-backend-proxy/spec.md
openspec/specs/seo-peer-http-contract/spec.md
openspec/specs/service-endpoint-auth/spec.md
openspec/specs/service-users/spec.md
openspec/specs/site-consumer-contracts/spec.md
openspec/specs/task-shipping-tooling/spec.md
openspec/specs/user-management-api/spec.md
openspec/specs/vk-api-endpoints/spec.md
openspec/specs/vk-backend-proxy/spec.md
openspec/specs/vk-bot-longpolling/spec.md
openspec/specs/vk-confirmation/spec.md
openspec/specs/vk-notification-delivery/spec.md
openspec/specs/vk-service-orchestration/spec.md
openspec/specs/vk-service-skeleton/spec.md
openspec/specs/vk-settings-ui/spec.md
openspec/specs/vk-user-storage/spec.md
openspec/specs/yandex-client-failures/spec.md
openspec/specs/yandex-peer-http-contract/spec.md
openspec/specs/yandex-service-runtime/spec.md
openspec/specs/yandex-services-access-evidence/spec.md
```

Также принадлежат change: `openspec/changes/repair-main-specs-strict-validation/{proposal,design,tasks}.md` и 54 `specs/<capability>/spec.md` из `status.json`; QG изменяет только собственные checkbox в tasks, этот отчёт и игнорируемую `.qa/…/QG/`.
После отдельного разрешения Router: адресный sync с сохранением main-only правок/foreign content, сравнение с этой проекцией, root strict, archive и финальная validation. Drift specs/delta/tool после QG инвалидирует зависимое evidence. Никаких staging/commits, настоящего sync/archive в этом unit не было.
