# Capability-пакеты и ownership исторического backfill

Документ является каноническим входом для tasks 5–7 change `integrate-openspec-workflow`. Источник классификации — проверенный [`historical-task-manifest.md`](historical-task-manifest.md). Пакеты ограничены сервисным контуром; каждый будущий spec-файл имеет ровно одного владельца. Упоминание одной исторической задачи в нескольких пакетах означает только трассировку разных фактических контрактов и не даёт совместного ownership файла.

## Реестр пакетов и spec-файлов

| Package ID | OpenSpec backfill change | Единственный spec и capability | Профиль-владелец | Исторические задачи / граница evidence | Task | Reviewer и access-contract scope |
|---|---|---|---|---|---|---|
| `BE-1` | `backfill-backend-access-platform` | `specs/backend-access-platform/spec.md` — `backend-access-platform` | Backend | `003`, `012`, `018`; tenant/service-key context, refresh-cookie различение и split CORS. Не включает доменные CRUD/DTO. | `5.1` | Backend reviewer (`5.3`) и access reviewer (`5.4`): все public/protected endpoint-классы, исключения `GET /api/auth/me`, auth POST и anonymous/authenticated evidence. |
| `BE-2` | `backfill-backend-domain-capabilities` | `specs/backend-domain-capabilities/spec.md` — `backend-domain-capabilities` | Backend | `002`, `004`, `006`, `007`, `009`, `010`, `011`, `013`, `014`, `019`; подтверждённые backend domain, persistence, media и DTO-контракты. UI и consumer rendering исключены. | `5.2` | Backend reviewer (`5.3`) и access reviewer (`5.4`): Public Read GET, Protected Write, protected `GET /api/news-cms`, tenant key, foreign-resource/scope и отсутствующее live evidence. |
| `FE-1` | `backfill-cms-content-commerce-ui` | `specs/cms-content-commerce-ui/spec.md` — `cms-content-commerce-ui` | Frontend | `004`, `006`, `007`, `013`, `020`; CMS prices, page editor, news, shared photo selector и mutation UX. Backend contracts только как внешняя граница. | `6.1` | Frontend reviewer (`6.3`): admin auth/scopes, Protected Write UX, `401/403`, pagination `limit/offset`, MSW/no-live-backend, no `site-*` mixing. |
| `FE-2` | `backfill-cms-horse-ui-quality` | `specs/cms-horse-ui-quality/spec.md` — `cms-horse-ui-quality` | Frontend | `003`, `008`, `010`, `011`, `014`, `015`, `016`; tenant-aware CMS horse/pedigree/breed UI и подтверждённые frontend quality boundaries. Backend и public consumer contracts исключены. | `6.2` | Frontend reviewer (`6.3`): route auth, scopes, `401/403`, filters/pagination, regression evidence, MSW/no-live-backend, no `site-*` mixing. |
| `SC-1` | `backfill-site-consumer-contracts` | `specs/site-consumer-contracts/spec.md` — `site-consumer-contracts` | Site Consumer | `003`, `017`, `019`; только `site-ad`: runtime API configuration, service-key Public Read, server-rendered horse/foal content и SEO/caching evidence. | `7.1` | Site Consumer reviewer (`7.2`): anonymous GET без CMS cookie, service key, отсутствие CMS-only endpoint и подтверждённые SSR/SSG/ISR/SEO свойства. |
| `PR-1` | `backfill-repository-process-tooling` | `specs/repository-process-tooling/spec.md` — `repository-process-tooling` | Backend/tooling | `001`, `005`, `008`, `021`, `022`, `023`; агентный workflow, quality tooling, offline import, нумерация документов и OpenSpec lifecycle. Runtime-контракты исключены. | `7.3` | Process reviewer (`7.4`): claims только по repository evidence; access N/A для process/offline tooling, runtime API assertions запрещены. |

Имена change и spec-пути зарезервированы этим реестром. Исполнитель создаёт только назначенный change/spec и не редактирует spec другого пакета. Пакетные validate/sync/archive выполняются tasks `5.5`, `6.4`, `7.5` после профильного review; общий coverage-review остаётся в task `8.1`.

## Трассировка 23 задач

| ID | Владеющий пакет фактического capability | Дополнительная трассировка без ownership | Статус manifest |
|---|---|---|---|
| `001` | `PR-1` | — | `implemented` |
| `002` | `BE-2` | `PR-1` может ссылаться только на правила Quality Gate, не на backend runtime | `partial` |
| `003` | `BE-1` | `FE-2`, `SC-1` | `implemented` |
| `004` | `BE-2` | `FE-1` | `implemented` |
| `005` | `PR-1` | — | `partial` |
| `006` | `BE-2` | `FE-1` | `implemented` |
| `007` | `BE-2` | `FE-1` | `implemented` |
| `008` | `PR-1` | `FE-2` ссылается на frontend boundary как evidence | `implemented` |
| `009` | `BE-2` | — | `implemented` |
| `010` | `BE-2` | `FE-2` | `implemented` |
| `011` | `BE-2` | `FE-2` | `implemented` |
| `012` | `BE-1` | — | `implemented` |
| `013` | `BE-2` | `FE-1` | `implemented` |
| `014` | `BE-2` | `FE-2` | `implemented` |
| `015` | `FE-2` | — | `partial` |
| `016` | `FE-2` | — | `partial` |
| `017` | `SC-1` | — | `partial` |
| `018` | `BE-1` | — | `implemented` |
| `019` | `BE-2` | `SC-1` | `implemented` |
| `020` | `FE-1` | — | `implemented` |
| `021` | `PR-1` | — | `partial` |
| `022` | `PR-1` | — | `implemented` |
| `023` | `PR-1` | — | `partial` |

Для задачи с дополнительной трассировкой каждый пакет формулирует только свой service-specific контракт. Требование нельзя копировать дословно между specs; task `8.2` устраняет смысловые дубли и расхождения.

## Реестр gaps

`superseded` и `unknown` в проверенном manifest отсутствуют. Ниже зарегистрированы все семь строк `partial`; до появления указанного evidence spec MUST описывать подтверждённую часть и отдельный gap, а не нормативно объявлять намерение реализованным.

| Gap ID | Task / пакет | Подтверждено | Не подтверждено и запрещено утверждать | Требуемое evidence / способ закрытия | Владелец / reviewer | Access evidence |
|---|---|---|---|---|---|---|
| `G-002` | `002` / `BE-2` | Наличие unit-наборов API/services/repositories. | Полный исходный аудит и матрица use/edge cases для каждого сервиса и репозитория. | Отдельный audit inventory с покрытием всех заявленных зон и успешным QG evidence. | Backend / backend reviewer (`5.3`). | Полное anonymous/authenticated покрытие API отсутствует; access reviewer (`5.4`) не должен выводить его из наличия unit-каталогов. |
| `G-005` | `005` / `PR-1` | Правила format/test/lint/live smoke, lint exceptions и отсутствие pytest smoke scripts. | Фактический live smoke задачи 004 и устранение/обоснование пяти skipped tests. | Timestamped live-smoke report с endpoint timings и явный audit skipped tests. | Backend/tooling / process reviewer (`7.4`). | Anonymous/authenticated smoke evidence отсутствует; runtime access contract в process spec не создаётся. |
| `G-015` | `015` / `FE-2` | ESLint hardening/pilot, `lint:ai`, часть extraction/rollout. | Full strict rollout на весь `src`, manual QA, self-checks и итоговый QG. | Успешные lint/test/typecheck/build, зафиксированный full-scope self-check и manual QA/QG report. | Frontend / frontend reviewer (`6.3`). | Отдельное evidence auth/scopes/Protected Write для полного rollout отсутствует; не заявлять полное покрытие. |
| `G-016` | `016` / `FE-2` | Нормализация filters, conflict disable и selection helper подтверждены кодом/tests. | Полная регрессия всех четырёх исходных пунктов и отсутствие дублей. | Явная regression matrix, релевантные component/hook tests и review report. | Frontend / frontend reviewer (`6.3`). | Отдельное anonymous/authenticated HTTP evidence отсутствует; использовать только существующую CMS boundary, не объявлять live contract проверенным. |
| `G-017` | `017` / `SC-1` | API URL/key wiring, normalization, Docker/deploy forwarding и локальные tests. | Post-deploy `ad.eqcms.ru → api.eqcms.ru` запросы и итоговый review именно для задачи `017`. | Deployment evidence задачи `017` с окружением, network results и server-render/public read проверкой. | Site Consumer / consumer reviewer (`7.2`). | Отсутствует post-deploy production evidence задачи `017`; это не означает отсутствие всех anonymous GET evidence в репозитории — такие проверки зафиксированы, в частности, отчётами задач `003` и `019`. |
| `G-021` | `021` / `PR-1` | Discovery/parser, JSON, SQL/photo manifests и import report созданы. | SQL dry-run, применение импорта к выбранной БД и итоговый QG. | Воспроизводимый dry-run/transaction report, явно выбранная БД, reconciliation и QG; без исполнения в рамках backfill. | Backend/tooling / process reviewer (`7.4`). | N/A: offline import. Нельзя создавать runtime endpoint/access требования. |
| `G-023` | `023` / `PR-1` | Workflow-инструкции и OpenSpec config/change созданы. | Capability specs, coverage 23/23, sync, единый QG и archive. | Выполнение tasks `5.1`–`9.9`, успешные validation/QG/sync/archive evidence. | Backend/tooling; итоговый Quality Gate tasks `9.1`–`9.7`. | Runtime access N/A; task `9.4` проверяет governance и gaps, а не endpoint behavior задачи 023. |

## Правила handoff для tasks 5–7

1. Исполнитель читает только строки manifest, перечисленные у пакета, и связанные evidence-файлы; дополнительную трассировку использует лишь для границы своего сервиса.
2. В каждом backfill change proposal/design/tasks и spec пишутся на русском. Нормативный spec содержит только фактически подтверждённые требования; gap-ссылки сохраняют идентификаторы `G-*`.
3. Для `BE-1` и endpoint-частей `BE-2` обязательна access matrix `method | path | access class | roles | expected without auth | expected with auth`; отсутствующие статусы помечаются gap, а не угадываются. `FE-*` и `SC-1` фиксируют соответствующую UI/consumer сторону того же контракта без переопределения backend policy.
4. `SC-1` не использует CMS-only endpoint; `FE-*` не импортируют consumer-контур. `PR-1` не содержит runtime API, БД-схему или бизнес-контракты, кроме описания evidence offline import как незавершённого gap.
5. Reviewer блокирует sync при claim без evidence, скрытом gap, конфликтующем access-классе или редактировании чужого spec. После пакетного sync task `8.1` требует для каждого ID из таблицы main spec trace либо сохранённый gap.
