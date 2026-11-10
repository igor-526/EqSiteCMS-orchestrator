# Tasks — repair-main-specs-strict-validation

**Планирование завершено в PLAN-TOOLS-3:** 25/25 Planner slices done; 65/65 capabilities покрыты (54 с нормативными deltas, 9 Purpose-only, 2 layout-only). Подготовлены 15 точных Purpose, две точные Yandex H2 вставки и полная shipping delta из 9 MODIFIED. Пользовательское адресное согласие снимает planning ownership blocker, но не является общим approval: main specs и все 148 реализационных checkbox неизменны. Все артефакты готовы к общему пользовательскому review/approval; до явного approval apply запрещён.

Эти checkbox относятся исключительно к будущей реализации, ни один не выполнен. Ownership, DAG, Test matrix, точные 15 Purpose, layout DOC-YA-2 и статусы всех 25 Planner slices — в `design.md`. Для 9 Purpose-only и 2 layout-only capabilities нормативная delta намеренно отсутствует; использовать точные соответствующие разделы design. Для остальных требуются полные одобренные deltas. Реализационный статус не выводится из done Planner.

## Execution units

Точные main paths: `openspec/specs/<capability>/spec.md`; соответствующие delta paths: `openspec/changes/repair-main-specs-strict-validation/specs/<capability>/spec.md`. Файл принадлежит одному профилю; units в одном файле строго последовательны. Scoped verification — точный pinned `validate <capability> --type spec --strict` и scoped `git diff --check`, без полного глобального прогона на каждый unit. Для первой половины split-файла допустимы только заранее известные оставшиеся диагностики второй половины; PASS всего файла обязателен у второго unit.

| Unit | Профиль | Deliverable | Ownership capability paths | Зависит от | Verification | contextFiles |
|---|---|---|---|---|---|---|
| DOC-BE-1 | Backend | A | `backend-domain-capabilities` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/backend-domain-capabilities/spec.md` + его одобренная delta; handoff зависимости |
| DOC-BE-2 | Backend | A | `backend-domain-capabilities` | DOC-BE-1 | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/backend-domain-capabilities/spec.md` + его одобренная delta; handoff зависимости |
| DOC-BE-3 | Backend | B | `backend-access-platform`, `service-endpoint-auth`, `service-users`, `user-management-api`, `breed-group-management`, `horse-service-relations` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/backend-access-platform/spec.md` + его одобренная delta; `openspec/specs/service-endpoint-auth/spec.md` + его одобренная delta; `openspec/specs/service-users/spec.md` + его одобренная delta; `openspec/specs/user-management-api/spec.md` + его одобренная delta; `openspec/specs/breed-group-management/spec.md` + его одобренная delta; `openspec/specs/horse-service-relations/spec.md` + его одобренная delta; handoff зависимости |
| DOC-BE-4 | Backend | C | `email-database-models`, `email-backend-proxy`, `seo-backend-proxy`, `seo-peer-http-contract`, `news-public-slugs` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/email-database-models/spec.md` + его одобренная delta; `openspec/specs/email-backend-proxy/spec.md` + его одобренная delta; `openspec/specs/seo-backend-proxy/spec.md` + его одобренная delta; `openspec/specs/seo-peer-http-contract/spec.md` + его одобренная delta; `openspec/specs/news-public-slugs/spec.md` + его одобренная delta; handoff зависимости |
| DOC-FE-1 | Frontend | D | `callback-request-consumer-form`, `callback-request-lifecycle`, `callback-requests-admin-ui` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/callback-request-consumer-form/spec.md` + его одобренная delta; `openspec/specs/callback-request-lifecycle/spec.md` + его одобренная delta; `openspec/specs/callback-requests-admin-ui/spec.md` + его одобренная delta; handoff зависимости |
| DOC-FE-2 | Frontend | D | `cms-breed-group-management`, `cms-horse-breed-group-documentation`, `cms-horse-ui-quality`, `cms-seo-data-ui` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/cms-breed-group-management/spec.md` + его одобренная delta; `openspec/specs/cms-horse-breed-group-documentation/spec.md` + его одобренная delta; `openspec/specs/cms-horse-ui-quality/spec.md` + его одобренная delta; `openspec/specs/cms-seo-data-ui/spec.md` + его одобренная delta; handoff зависимости |
| DOC-SITE-1 | Site Consumer | E | `inlove-site-shell`, `inlove-site-skeleton`, `site-consumer-contracts` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/inlove-site-shell/spec.md` + его одобренная delta; `openspec/specs/inlove-site-skeleton/spec.md` + его одобренная delta; `openspec/specs/site-consumer-contracts/spec.md` + его одобренная delta; handoff зависимости |
| DOC-SITE-2 | Site Consumer | E | `inlove-content-pages`, `inlove-horses-pages`, `inlove-news-pages`, `inlove-placeholder-pages`, `inlove-callback-form` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/inlove-content-pages/spec.md` + его одобренная delta; `openspec/specs/inlove-horses-pages/spec.md` + его одобренная delta; `openspec/specs/inlove-news-pages/spec.md` + его одобренная delta; `openspec/specs/inlove-placeholder-pages/spec.md` + его одобренная delta; `openspec/specs/inlove-callback-form/spec.md` + его одобренная delta; handoff зависимости |
| DOC-SITE-3 | Site Consumer | E | `inlove-services-pages`, `inlove-price-group-curation` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/inlove-services-pages/spec.md` + его одобренная delta; `openspec/specs/inlove-price-group-curation/spec.md` + его одобренная delta; handoff зависимости |
| DOC-SITE-4 | Site Consumer | E | `inlove-site-settings-curation`, `inlove-production-api-config`, `inlove-ui-components` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/inlove-site-settings-curation/spec.md` + его одобренная delta; `openspec/specs/inlove-production-api-config/spec.md` + его одобренная delta; `openspec/specs/inlove-ui-components/spec.md` + его одобренная delta; handoff зависимости |
| DOC-INFRA-1 | Backend | F | `nats-jetstream-protocols` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/nats-jetstream-protocols/spec.md` + его одобренная delta; handoff зависимости |
| DOC-INFRA-2 | Backend | F | `celery-redis-protocols`, `database-connection-pooling`, `nats-resilience`, `redis-infrastructure`, `platform-observability` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/celery-redis-protocols/spec.md` + его одобренная delta; `openspec/specs/database-connection-pooling/spec.md` + его одобренная delta; `openspec/specs/nats-resilience/spec.md` + его одобренная delta; `openspec/specs/redis-infrastructure/spec.md` + его одобренная delta; `openspec/specs/platform-observability/spec.md` + его одобренная delta; handoff зависимости |
| DOC-NOTIFY-1 | Backend | G | `notification-database-models`, `notification-repositories`, `notification-seed-data`, `notification-callback-handler` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/notification-database-models/spec.md` + его одобренная delta; `openspec/specs/notification-repositories/spec.md` + его одобренная delta; `openspec/specs/notification-seed-data/spec.md` + его одобренная delta; `openspec/specs/notification-callback-handler/spec.md` + его одобренная delta; handoff зависимости |
| DOC-NOTIFY-2 | Backend | G | `notification-orchestrator`, `notification-settings-api`, `notification-settings-ui` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/notification-orchestrator/spec.md` + его одобренная delta; `openspec/specs/notification-settings-api/spec.md` + его одобренная delta; `openspec/specs/notification-settings-ui/spec.md` + его одобренная delta; handoff зависимости |
| DOC-PHOTO-1 | Backend | H | `photo-batch-upload-attach`, `photo-upload-ui`, `metrica-parse-queue` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/photo-batch-upload-attach/spec.md` + его одобренная delta; `openspec/specs/photo-upload-ui/spec.md` + его одобренная delta; `openspec/specs/metrica-parse-queue/spec.md` + его одобренная delta; handoff зависимости |
| DOC-TOOLS-1 | Backend | I | `openspec-workflow` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/openspec-workflow/spec.md` + его одобренная delta; handoff зависимости |
| DOC-TOOLS-2 | Backend | I | `repository-process-tooling`, `ci-workflows` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/repository-process-tooling/spec.md` + его одобренная delta; `openspec/specs/ci-workflows/spec.md` + его одобренная delta; handoff зависимости |
| DOC-TOOLS-3 | Backend | J | `task-shipping-tooling` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/task-shipping-tooling/spec.md` + его одобренная delta; handoff зависимости |
| DOC-VK-1 | Backend | K | `vk-service-skeleton` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/vk-service-skeleton/spec.md` + его одобренная delta; handoff зависимости |
| DOC-VK-2 | Backend | K | `vk-service-skeleton` | DOC-VK-1 | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/vk-service-skeleton/spec.md` + его одобренная delta; handoff зависимости |
| DOC-VK-3 | Backend | K | `vk-service-orchestration` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/vk-service-orchestration/spec.md` + его одобренная delta; handoff зависимости |
| DOC-VK-4 | Backend | K | `vk-api-endpoints`, `vk-backend-proxy`, `vk-user-storage` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/vk-api-endpoints/spec.md` + его одобренная delta; `openspec/specs/vk-backend-proxy/spec.md` + его одобренная delta; `openspec/specs/vk-user-storage/spec.md` + его одобренная delta; handoff зависимости |
| DOC-VK-5 | Backend | K | `vk-bot-longpolling`, `vk-confirmation`, `vk-notification-delivery`, `vk-settings-ui` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/vk-bot-longpolling/spec.md` + его одобренная delta; `openspec/specs/vk-confirmation/spec.md` + его одобренная delta; `openspec/specs/vk-notification-delivery/spec.md` + его одобренная delta; `openspec/specs/vk-settings-ui/spec.md` + его одобренная delta; handoff зависимости |
| DOC-YA-1 | Backend | L | `yandex-client-failures`, `yandex-peer-http-contract` | — | scoped | design Decisions и только именованные строки этих capabilities; `openspec/specs/yandex-client-failures/spec.md` + его одобренная delta; `openspec/specs/yandex-peer-http-contract/spec.md` + его одобренная delta; handoff зависимости |
| DOC-YA-2 | Backend | M | `yandex-service-runtime`, `yandex-services-access-evidence` (main-only layout) | — | scoped parser/layout + strict | design: Decisions 5 + «Точный layout DOC-YA-2»; два main spec.md; `.qa/repair-main-specs-strict-validation/PLAN-YA-2/traceability.json`; нормативная delta не нужна |
| QG | Quality Gate | Q | только `.qa/repair-main-specs-strict-validation/QG/**` и `docs/reports/repair-main-specs-strict-validation.md` | все DOC units | независимый QG-DOCS | design Test matrix и проекция; tasks; scoped spec diff; baseline и owner ledgers |

## 1. DOC-BE-1 — домен backend, первая половина (профиль: Backend)

**Deliverable:** A · **Specs/пути:** `backend-domain-capabilities` по шаблонам выше · **Зависит от:** —.

Назначенные требования: «Безопасный HTML page data», «Управление лошадьми в tenant-контексте», «Управление родословной», «Access matrix backend domain endpoints», «Access matrix коротких наименований», «Нормализация необязательных полей пород и мастей». Остальные требования этого файла read-only для unit.

- [x] DOC-BE-1.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-BE-1.2 В `backend-domain-capabilities` адресно исправить все назначенные диагностики только для назначенных выше имён по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-1.3 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-BE-1.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-BE-1/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 2. DOC-BE-2 — домен backend, вторая половина (профиль: Backend)

**Deliverable:** A · **Specs/пути:** `backend-domain-capabilities` по шаблонам выше · **Зависит от:** DOC-BE-1.

Назначенные требования: «Access contract исправления создания лошади», «Фильтрация лошадей по оказываемым услугам», «Имя фотографии безопасно укладывается в ограничение хранения», «Access matrix операций фотографий сохраняется», «Управляемый slug лошади», «Access contract управления slug лошади». Остальные требования этого файла read-only для unit.

- [x] DOC-BE-2.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-BE-2.2 В `backend-domain-capabilities` адресно исправить все назначенные диагностики только для назначенных выше имён по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-2.3 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-BE-2.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-BE-2/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 3. DOC-BE-3 — доступ и пользователи (профиль: Backend)

**Deliverable:** B · **Specs/пути:** `backend-access-platform`, `service-endpoint-auth`, `service-users`, `user-management-api`, `breed-group-management`, `horse-service-relations` по шаблонам выше · **Зависит от:** —.

- [x] DOC-BE-3.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-BE-3.2 В `backend-access-platform` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-3.3 В `service-endpoint-auth` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-3.4 В `service-users` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-3.5 В `user-management-api` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-3.6 В `breed-group-management` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-3.7 В `horse-service-relations` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-3.8 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-BE-3.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-BE-3/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 4. DOC-BE-4 — email, SEO и публичные slugs (профиль: Backend)

**Deliverable:** C · **Specs/пути:** `email-database-models`, `email-backend-proxy`, `seo-backend-proxy`, `seo-peer-http-contract`, `news-public-slugs` по шаблонам выше · **Зависит от:** —.

- [x] DOC-BE-4.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-BE-4.2 Объединить адресно оба блока `Alembic миграция` по одобренной delta и перенести полный состав полей `Таблица email_logs` в сценарий; проверить обе миграции, четыре migration scenarios и неизменность остальных блоков; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-4.3 В `email-backend-proxy` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-4.4 В `seo-backend-proxy` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-4.5 В `seo-peer-http-contract` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-4.6 В `news-public-slugs` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-BE-4.7 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-BE-4.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-BE-4/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 5. DOC-FE-1 — обратная связь в CMS (профиль: Frontend)

**Deliverable:** D · **Specs/пути:** `callback-request-consumer-form`, `callback-request-lifecycle`, `callback-requests-admin-ui` по шаблонам выше · **Зависит от:** —.

- [x] DOC-FE-1.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-FE-1.2 В `callback-request-consumer-form` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-FE-1.3 В `callback-request-lifecycle` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-FE-1.4 В `callback-requests-admin-ui` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-FE-1.5 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-FE-1.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-FE-1/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 6. DOC-FE-2 — лошади и SEO в CMS (профиль: Frontend)

**Deliverable:** D · **Specs/пути:** `cms-breed-group-management`, `cms-horse-breed-group-documentation`, `cms-horse-ui-quality`, `cms-seo-data-ui` по шаблонам выше · **Зависит от:** —.

- [x] DOC-FE-2.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-FE-2.2 В `cms-breed-group-management` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-FE-2.3 В `cms-horse-breed-group-documentation` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-FE-2.4 В `cms-horse-ui-quality` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-FE-2.5 В `cms-seo-data-ui` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-FE-2.6 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-FE-2.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-FE-2/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 7. DOC-SITE-1 — каркас и общие контракты сайта (профиль: Site Consumer)

**Deliverable:** E · **Specs/пути:** `inlove-site-shell`, `inlove-site-skeleton`, `site-consumer-contracts` по шаблонам выше · **Зависит от:** —.

- [x] DOC-SITE-1.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-SITE-1.2 В `inlove-site-shell` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-1.3 В `inlove-site-skeleton` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-1.4 В `site-consumer-contracts` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-1.5 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-SITE-1.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-SITE-1/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 8. DOC-SITE-2 — контентные страницы сайта (профиль: Site Consumer)

**Deliverable:** E · **Specs/пути:** `inlove-content-pages`, `inlove-horses-pages`, `inlove-news-pages`, `inlove-placeholder-pages`, `inlove-callback-form` по шаблонам выше · **Зависит от:** —.

- [x] DOC-SITE-2.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-SITE-2.2 В `inlove-content-pages` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-2.3 В `inlove-horses-pages` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-2.4 В `inlove-news-pages` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-2.5 В `inlove-placeholder-pages` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-2.6 В `inlove-callback-form` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-2.7 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-SITE-2.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-SITE-2/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 9. DOC-SITE-3 — услуги и цены сайта (профиль: Site Consumer)

**Deliverable:** E · **Specs/пути:** `inlove-services-pages`, `inlove-price-group-curation` по шаблонам выше · **Зависит от:** —.

- [x] DOC-SITE-3.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-SITE-3.2 В `inlove-services-pages` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-3.3 В `inlove-price-group-curation` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-3.4 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-SITE-3.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-SITE-3/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 10. DOC-SITE-4 — настройки и компоненты сайта (профиль: Site Consumer)

**Deliverable:** E · **Specs/пути:** `inlove-site-settings-curation`, `inlove-production-api-config`, `inlove-ui-components` по шаблонам выше · **Зависит от:** —.

- [x] DOC-SITE-4.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-SITE-4.2 В `inlove-site-settings-curation` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-4.3 В `inlove-production-api-config` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-4.4 В `inlove-ui-components` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-SITE-4.5 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-SITE-4.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-SITE-4/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 11. DOC-INFRA-1 — протокол NATS (профиль: Backend)

**Deliverable:** F · **Specs/пути:** `nats-jetstream-protocols` по шаблонам выше · **Зависит от:** —.

- [x] DOC-INFRA-1.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-INFRA-1.2 В `nats-jetstream-protocols` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-INFRA-1.3 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-INFRA-1.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-INFRA-1/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 12. DOC-INFRA-2 — эксплуатационный контекст (профиль: Backend)

**Deliverable:** F · **Specs/пути:** `celery-redis-protocols`, `database-connection-pooling`, `nats-resilience`, `redis-infrastructure`, `platform-observability` по шаблонам выше · **Зависит от:** —.

- [x] DOC-INFRA-2.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-INFRA-2.2 В `celery-redis-protocols` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-INFRA-2.3 В `database-connection-pooling` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-INFRA-2.4 В `nats-resilience` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-INFRA-2.5 В `redis-infrastructure` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-INFRA-2.6 В `platform-observability` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-INFRA-2.7 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-INFRA-2.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-INFRA-2/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 13. DOC-NOTIFY-1 — модели и контекст notification (профиль: Backend)

**Deliverable:** G · **Specs/пути:** `notification-database-models`, `notification-repositories`, `notification-seed-data`, `notification-callback-handler` по шаблонам выше · **Зависит от:** —.

- [x] DOC-NOTIFY-1.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-NOTIFY-1.2 В `notification-database-models` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-NOTIFY-1.3 В `notification-repositories` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-NOTIFY-1.4 В `notification-seed-data` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-NOTIFY-1.5 В `notification-callback-handler` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-NOTIFY-1.6 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-NOTIFY-1.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-NOTIFY-1/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 14. DOC-NOTIFY-2 — оркестрация и настройки notification (профиль: Backend)

**Deliverable:** G · **Specs/пути:** `notification-orchestrator`, `notification-settings-api`, `notification-settings-ui` по шаблонам выше · **Зависит от:** —.

- [x] DOC-NOTIFY-2.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-NOTIFY-2.2 В `notification-orchestrator` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-NOTIFY-2.3 В `notification-settings-api` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-NOTIFY-2.4 В `notification-settings-ui` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-NOTIFY-2.5 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-NOTIFY-2.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-NOTIFY-2/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 15. DOC-PHOTO-1 — фотографии и очередь Метрики (профиль: Backend)

**Deliverable:** H · **Specs/пути:** `photo-batch-upload-attach`, `photo-upload-ui`, `metrica-parse-queue` по шаблонам выше · **Зависит от:** —.

- [x] DOC-PHOTO-1.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-PHOTO-1.2 В `photo-batch-upload-attach` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-PHOTO-1.3 В `photo-upload-ui` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-PHOTO-1.4 В `metrica-parse-queue` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-PHOTO-1.5 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-PHOTO-1.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-PHOTO-1/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 16. DOC-TOOLS-1 — workflow OpenSpec (профиль: Backend)

**Deliverable:** I · **Specs/пути:** `openspec-workflow` по шаблонам выше · **Зависит от:** —.

- [x] DOC-TOOLS-1.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-TOOLS-1.2 В `openspec-workflow` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-TOOLS-1.3 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-TOOLS-1.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-TOOLS-1/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 17. DOC-TOOLS-2 — процесс репозитория и CI (профиль: Backend)

**Deliverable:** I · **Specs/пути:** `repository-process-tooling`, `ci-workflows` по шаблонам выше · **Зависит от:** —.

- [x] DOC-TOOLS-2.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-TOOLS-2.2 В `repository-process-tooling` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-TOOLS-2.3 В `ci-workflows` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-TOOLS-2.4 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-TOOLS-2.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-TOOLS-2/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 18. DOC-TOOLS-3 — shipping с foreign overlay (профиль: Backend)

**Deliverable:** J · **Specs/пути:** `task-shipping-tooling` по шаблонам выше · **Зависит от:** —.

**Prerequisites до старта:** адресное согласие «Да, разрешаю адресные исправления» уже зафиксировано в design; требуется общий approval всех артефактов. Сверить foreign baseline PLAN-TOOLS-3, исключить одновременную запись; drift — stop/Router. Назначены ровно 9 требований реестра по полной delta; шесть foreign требований/AG-01..12 и «Строгий режим make sync» read-only. Чужие hunks не присваивать и не коммитить; whole-file stage/commit смешанного файла требует отдельного согласования.

- [x] DOC-TOOLS-3.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-TOOLS-3.2 В `task-shipping-tooling` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-TOOLS-3.3 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-TOOLS-3.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-TOOLS-3/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 19. DOC-VK-1 — каркас VK, первая половина (профиль: Backend)

**Deliverable:** K · **Specs/пути:** `vk-service-skeleton` по шаблонам выше · **Зависит от:** —.

Назначенные требования: «Сервис vk-service создаётся копированием email-service», «Email-специфичный код полностью удалён», «Запрещённые токены в тестах и документации пишутся обычными литералами», «Идентичность и зависимости сервиса приведены к VK», «Деплой-конфигурация копируется без изменений и помечается как неготовая», «Настройки очищены от email и содержат VK-конфигурацию». Остальные требования этого файла read-only для unit.

- [x] DOC-VK-1.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-VK-1.2 В `vk-service-skeleton` адресно исправить все назначенные диагностики только для назначенных выше имён по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-1.3 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-VK-1.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-VK-1/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 20. DOC-VK-2 — каркас VK, вторая половина (профиль: Backend)

**Deliverable:** K · **Specs/пути:** `vk-service-skeleton` по шаблонам выше · **Зависит от:** DOC-VK-1.

Назначенные требования: «Адрес main backend указывает на существующий контейнер», «Приложение поднимается без email-роутера и без активной NATS-топологии», «Baseline-тесты подтверждают чистоту скелета», «Документация сервиса описывает границы скелета», «Миграционная цепочка содержит VK-домен и применима», «HTTP-поверхность сервиса ограничена health и VK-домены». Остальные требования этого файла read-only для unit.

- [x] DOC-VK-2.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-VK-2.2 В `vk-service-skeleton` адресно исправить все назначенные диагностики только для назначенных выше имён по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-2.3 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-VK-2.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-VK-2/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 21. DOC-VK-3 — оркестрация VK (профиль: Backend)

**Deliverable:** K · **Specs/пути:** `vk-service-orchestration` по шаблонам выше · **Зависит от:** —.

- [x] DOC-VK-3.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-VK-3.2 В `vk-service-orchestration` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-3.3 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-VK-3.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-VK-3/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 22. DOC-VK-4 — API и proxy VK (профиль: Backend)

**Deliverable:** K · **Specs/пути:** `vk-api-endpoints`, `vk-backend-proxy`, `vk-user-storage` по шаблонам выше · **Зависит от:** —.

- [x] DOC-VK-4.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-VK-4.2 В `vk-api-endpoints` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-4.3 В `vk-backend-proxy` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-4.4 В `vk-user-storage` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-4.5 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-VK-4.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-VK-4/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 23. DOC-VK-5 — бот, подтверждение и доставка VK (профиль: Backend)

**Deliverable:** K · **Specs/пути:** `vk-bot-longpolling`, `vk-confirmation`, `vk-notification-delivery`, `vk-settings-ui` по шаблонам выше · **Зависит от:** —.

- [x] DOC-VK-5.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-VK-5.2 В `vk-bot-longpolling` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-5.3 В `vk-confirmation` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-5.4 В `vk-notification-delivery` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-5.5 В `vk-settings-ui` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-VK-5.6 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-VK-5.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-VK-5/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 24. DOC-YA-1 — HTTP и ошибки Yandex (профиль: Backend)

**Deliverable:** L · **Specs/пути:** `yandex-client-failures`, `yandex-peer-http-contract` по шаблонам выше · **Зависит от:** —.

- [x] DOC-YA-1.1 Сверить назначенный baseline, текущий scoped reproducer и полные одобренные deltas; несовпадение scope/ownership или неготовая delta блокирует unit; evidence — локальный ledger по именам требований.
- [x] DOC-YA-1.2 В `yandex-client-failures` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-YA-1.3 В `yandex-peer-http-contract` адресно исправить все назначенные диагностики по одобренной delta/design: описание ≤500, Purpose по фактическому назначению при наличии проблемы; проверить сохранность всех старых условий и scenarios; evidence — исходная норма → итоговый main-блок/сценарий в локальном ledger.
- [x] DOC-YA-1.4 Сверить main с одобренными deltas и DOC-02..05 применимо; не менять API outcomes, отрицания, security gaps или foreign hunks; подтверждение — scoped semantic diff.
- [x] DOC-YA-1.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-YA-1/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 25. DOC-YA-2 — ненормативные приложения Yandex (профиль: Backend)

**Deliverable:** M · **Specs/пути:** `yandex-service-runtime`, `yandex-services-access-evidence` по шаблонам выше · **Зависит от:** —.

- [x] DOC-YA-2.1 Сверить назначенный baseline, scoped parser inventory и точный одобренный layout design (две вставки H2); нормативные deltas здесь не нужны. Drift шести контекстных anchors или настоящих норм блокирует адресное применение до сверки с Router; evidence — SHA-256 и локальный ledger по именам.
- [x] DOC-YA-2.2 В `yandex-service-runtime` перед первым H3 хвоста вставить `## Ненормативный ретроспективный контекст` и пустую строку по точному layout design, не меняя остальной текст; проверить прежние 10 настоящих требований, 20 сценариев и наличие всех gaps/таблиц/anchors.
- [x] DOC-YA-2.3 В `yandex-services-access-evidence` перед первым H3 хвоста вставить `## Ненормативный ретроспективный контекст` и пустую строку по точному layout design, не меняя остальной текст; проверить прежние 10 настоящих требований, 20 сценариев и наличие всех gaps/таблиц/anchors.
- [x] DOC-YA-2.4 Сверить все шесть ложных требований по именам реестра с layout после исправления; evidence — parser inventory до/после, ни одного придуманного runtime-сценария.
- [x] DOC-YA-2.V Выполнить одну scoped static группу для назначенных specs и diff-check; сохранить результаты в `.qa/repair-main-specs-strict-validation/DOC-YA-2/`, отметить только выполненные IDs, вернуть Router handoff; любые новые скрытые diagnostics/превышение бюджета — atomic partial с конкретным split.

## 26. QG — независимый документационный gate (профиль: Quality Gate)

**Deliverable:** Q · **Ownership:** `.qa/repair-main-specs-strict-validation/QG/**`, `docs/reports/repair-main-specs-strict-validation.md` · **Зависит от:** все DOC units. Main specs, deltas и foreign diff read-only; чужие ошибки возвращаются владельцам, QG их не форматирует.

- [x] QG.1 Независимо проверить полноту нормативных deltas, актуальный именованный реестр, ownership и DOC-02..05/DOC-08; evidence — сверка контрактов и сохранность foreign overlay, никакого вывода о runtime PASS.
- [x] QG.2 Выполнить DOC-06: точный общий pinned `validate --specs --strict` в реальном root ДО sync/archive; при любой ошибке/предупреждении — finding; evidence — exit 0 и все items PASS, без suppressions.
- [x] QG.3 Собрать изолированную обычную проекцию через штатный pinned buildUpdatedSpec, проверить идемпотентность sync и неизменность root fingerprints по design; различие содержимого — finding, не повод перезаписывать main.
- [x] QG.4 Выполнить DOC-07: change strict, status JSON, scoped diff-check и проверку применимых ссылок; evidence — команды/результаты и ledger с revision/tool fingerprint в `.qa/.../QG/`.
- [x] QG.5 Создать единственный итоговый отчёт `docs/reports/repair-main-specs-strict-validation.md` с выполненными сценариями, findings/gaps и решением; полные логи только в `.qa`, не создавать каталог отчётов change.
- [x] QG.V Завершить один QG-DOCS, отметить только выполненные IDs и вернуть Router handoff; один bounded recheck после исправлений, далее stop при blocker, без sync/archive в QG.

## Workflow follow-up

- После завершения Planner slices и проверок — пользовательский approval всего плана; до него apply и main-правки запрещены.
- После QG APPROVED/согласованного waiver Router получает требуемое разрешение финализации, выполняет sync без присвоения foreign hunks, сверяет с одобренной проекцией, выполняет точный root strict с нулём errors/warnings, затем archive и финальную validation. Эти действия не checkbox будущего apply и не отдельный checkpoint unit.
- Если новое условие из оборванной фразы будет предоставлено — Router уточняет scope до approval, не предполагая его содержание.
