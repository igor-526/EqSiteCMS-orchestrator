# Design — inlove-equestrian-site-init

**Тикет:** `docs/tasks/066_inlove_equestrian_site_init.md`

**Дата:** 2026-09-08

**Сервисы:** новый `services/site-ksk-inlove`; документационно `SERVICES.md`
**Профиль реализации:** Site Consumer; затем Quality Gate по lane-модели

## Context

`services/site-ad` — отдельный Next.js 15/React 19 public consumer, хотя исходный запрос употребляет формулировку «Vite проект». В tracked-составе есть Public Read API client, DTO, site-settings context/hook, Sentry-обвязка, страницы и брендовые feature-data, обширный UI-kit/Storybook, статические изображения, Next.js runtime-конфигурация, Docker, Helm и GitHub Actions. В исходнике также присутствуют домены «Александровой дачи», fallback-метаданные и счётчик Яндекс Метрики `105850153`.

Новый каталог должен быть чистой точкой старта: сохранить интеграционный слой CMS, но не переносить презентационный продукт клиента. Источник `services/site-ad` не изменяется. `.git`, `.next`, `node_modules`, `.env` и прочие ignored/untracked artifacts не входят в копирование. Git для нового каталога пользователь создаёт отдельно.

Backend API и его endpoint'ы не меняются. Tenant selector является non-secret identity hint: новый consumer передаёт `X-Equestrian-Service-Key`; отсутствие или невалидное значение ожидаемо даёт `401` согласно общей policy. CMS cookie/access token на public consumer не используются.

## Goals / Non-Goals

**Goals:**

- создать запускаемый нейтральный `services/site-ksk-inlove` из актуального tracked baseline `site-ad`;
- сохранить API client/wrappers, DTO, переиспользуемые data services без брендового content assembly, site-settings context/provider/hook и observability plumbing;
- удалить custom routes/pages, feature UI, общий UI-kit, stories, брендовый контент и медиа;
- обеспечить отсутствие строк, доменов, URL, analytics IDs и ассетов «Александровой дачи» во всех файлах, кроме двух специально неизменяемых деревьев `.helm/**` и `.github/**`;
- сохранить `.helm/**` и `.github/**` побайтово и явно запретить их использование для deploy до отдельной адаптации;
- сохранить Public Read security boundary и тесты retained logic;
- зарегистрировать роль нового сервиса в `SERVICES.md` без фиктивного remote в `services.manifest`.

**Non-Goals:**

- разработка дизайна, страниц, SEO-контента или навигации InLove;
- backend, БД, migrations, NATS, CMS frontend и новые API endpoints;
- инициализация Git, создание remote и запись в `services.manifest`;
- адаптация Helm/GitHub Actions, production domain, ingress, secrets или deploy;
- реальная настройка Яндекс Метрики, Вебмастера, Sentry DSN или tenant key;
- сохранение UI-компонентов «на всякий случай».



## Decisions



### D1. Источник копирования — только tracked baseline

Исполнитель получает список через `git -C services/site-ad ls-files` и переносит только tracked-файлы, после чего формирует целевой allowlist. Это исключает `.git`, `.env`, `.next`, `node_modules`, coverage и локальные caches. Альтернатива `cp -R` отвергнута как риск утечки локального состояния и нарушения просьбы пользователя самостоятельно инициировать Git.

### D2. Сохраняется Next.js с patch-обновлением

Пользователь подтвердил, что упоминание Vite было ошибкой: сохраняется Next.js/App Router архитектура. В исходнике указан Next.js `^15.5.6`; в новом lockfile Next.js MUST быть обновлён до `15.5.25` — последнего доступного patch-релиза ветки 15 на дату уточнения — без major-миграции и без обновления React 19 вне необходимости совместимости.

### D3. Целевой allowlist вместо списка отдельных удалений

После bootstrap остаются только:

- toolchain/runtime: `package*.json`, `tsconfig.json`, Next/TypeScript/PostCSS/ESLint/Vitest config, `Dockerfile`, `docker-compose.yaml`, `.gitignore`, `.env.example`;
- API/contracts: `src/api/**`, `src/types/**`, `openapi.json`;
- data integration: `src/features/siteSettings/{context,providers,services,index.ts}` и `src/features/callBackRequest/services/**`;
- observability: `src/lib/observability/**`, Sentry/instrumentation entrypoints и относящиеся тесты;
- обязательный технический App Router shell: нейтральные `src/app/layout.tsx`, `src/app/globals.css`, `src/app/global-error.tsx` без custom content route; стандартный Next 404 на `/` обязателен;
- неизменяемые deploy-заготовки: `.helm/**`, `.github/**`.

Удаляются `src/app/(site)/**`, feature data/UI кроме перечисленных services, `src/ui/**`, `.storybook/**`, `docs/components.md`, все брендовые `public/**`, favicon/logo, `robots.ts` и `sitemap.ts` целиком, а также CSS/metadata, относящиеся к презентации исходного сайта. Если retained файл импортирует удаляемый UI/content, связь разрывается или файл исключается из allowlist; перенос брендовых зависимостей ради сборки запрещён.

### D4. Deployment trees неизменяемы побайтово

`.helm/**` и `.github/**` копируются с сохранением relative paths и SHA-256 каждого файла. Их содержимое разрешено как единственное исключение для brand/source-name scan, потому что пользователь запретил редактирование. Новый README и `SERVICES.md` обязаны предупреждать, что эти файлы сохраняют deployment identity `site-ad` и не могут применяться к InLove до отдельного change. Альтернатива «поправить имена при копировании» нарушает прямое требование.

### D5. API boundary сохраняется без расширения

Сохраняются существующие HTTP read wrappers для horses, horse dictionaries/services, prices/groups и site settings, а также callback request wrapper как уже существующее публичное `POST`-исключение. Локальный helper `imagesFromFolder.ts` удаляется: он импортирует UI-тип и обслуживает презентационные ассеты, а не CMS API. Consumer не добавляет CMS credentials. `NEXT_PUBLIC_API_BASE_URL`/`API_BASE_URL` и `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` остаются конфигурируемыми, но example/default значения становятся нейтральными и не содержат tenant другого клиента.

### D6. Package dependencies очищаются по фактическому import graph

После удаления UI/content `package.json` и lockfile приводятся к зависимостям retained allowlist, package name меняется на `site-ksk-inlove`. Удаление Storybook/UI dependencies считается частью очистки, а не новой функциональностью. Next.js обновляется только в пределах ветки 15 с `15.5.6` до `15.5.25`; остальные версии базового runtime не обновляются без требования совместимости.

### D7. Каталог сервисов и Git lifecycle разделены

`SERVICES.md` получает отдельную строку и краткое описание `site-ksk-inlove` как public site consumer вне core release scope. Согласованный stand domain — `inlove-stand.eqcms.ru`; он документируется как deployment/configuration value и MUST NOT становиться скрытым runtime fallback. Sentry DSN/project/release пользователь заполнит самостоятельно через env. Tenant selector остаётся обязательной env-настройкой без чужого default. `services.manifest` не меняется: Git, remote и последующее добавление manifest/orchestration пользователь выполняет самостоятельно.

## API access matrix

Новых или изменённых backend endpoint нет; матрица фиксирует разрешённые вызовы retained consumer layer. «Без auth» означает отсутствие CMS cookie/`Authorization`, но наличие валидного tenant selector для tenant-bound routes.


| method | path                      | access class                                       | roles              | expected without auth                                                                                                  | expected with auth                                                                       |
| ------ | ------------------------- | -------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`  | `/api/horses`             | Public Read + tenant selector                      | anonymous consumer | `2xx` с валидным selector; `401` при missing/invalid selector                                                          | CMS auth не требуется; consumer MUST NOT отправлять его, результат определяется selector |
| `GET`  | `/api/horses/{slug}`      | Public Read + tenant selector                      | anonymous consumer | `2xx`/`404` ресурса с валидным selector; `401` при missing/invalid selector                                            | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/horses/breeds`      | Public Read + tenant selector                      | anonymous consumer | `2xx` с валидным selector; `401` при missing/invalid selector                                                          | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/horses/breeds/{id}` | Public Read + tenant selector                      | anonymous consumer | `2xx`/`404` ресурса с валидным selector; `401` при missing/invalid selector                                            | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/horses/coat_colors` | Public Read + tenant selector                      | anonymous consumer | `2xx` с валидным selector; `401` при missing/invalid selector                                                          | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/horses/coat_colors/{id}` | Public Read + tenant selector                  | anonymous consumer | `2xx`/`404` ресурса с валидным selector; `401` при missing/invalid selector                                            | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/horses/owners`      | Public Read + tenant selector                      | anonymous consumer | `2xx` с валидным selector; `401` при missing/invalid selector                                                          | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/horses/owners/{id}` | Public Read + tenant selector                      | anonymous consumer | `2xx`/`404` ресурса с валидным selector; `401` при missing/invalid selector                                            | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/horses/services`    | Public Read + tenant selector                      | anonymous consumer | `2xx` с валидным selector; `401` при missing/invalid selector                                                          | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/horses/services/{id}` | Public Read + tenant selector                    | anonymous consumer | `2xx`/`404` ресурса с валидным selector; `401` при missing/invalid selector                                            | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/prices`             | Public Read + tenant selector                      | anonymous consumer | `2xx` с валидным selector; `401` при missing/invalid selector                                                          | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/prices/{slug}`      | Public Read + tenant selector                      | anonymous consumer | `2xx`/`404` ресурса с валидным selector; `401` при missing/invalid selector                                            | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/prices/groups`      | Public Read + tenant selector                      | anonymous consumer | `2xx` с валидным selector; `401` при missing/invalid selector                                                          | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/prices/groups/{id}` | Public Read + tenant selector                      | anonymous consumer | `2xx`/`404` ресурса с валидным selector; `401` при missing/invalid selector                                            | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/site_settings`      | Public Read + tenant selector                      | anonymous consumer | `2xx` с валидным selector; `401` при missing/invalid selector                                                          | CMS auth не требуется и не отправляется                                                  |
| `GET`  | `/api/site_settings/{id}` | Public Read + tenant selector                      | anonymous consumer | `2xx`/`404` ресурса с валидным selector; `401` при missing/invalid selector                                            | CMS auth не требуется и не отправляется                                                  |
| `POST` | `/api/callback_requests`  | Public anonymous write exception + tenant selector | anonymous consumer | `2xx` по backend contract с валидным payload/selector; `400` malformed/invalid payload; `401` missing/invalid selector | CMS auth не требуется и не даёт обход selector/validation                                |


Причина исключения `POST /api/callback_requests`: публичная форма обратной связи исходно предназначена для anonymous visitor; в этом change сохраняется только API/service слой без формы и без нового UI. Все остальные writes запрещены.

## Deliverables и ownership


| Deliverable                   | Профиль-владелец | Ownership                                                                          | Результат                                                                          |
| ----------------------------- | ---------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| A — bootstrap и конфигурация  | Site Consumer    | `services/site-ksk-inlove/*`, кроме `src/**`; `.helm/**`, `.github/**` только copy | чистый каркас, package/runtime identity, exact deploy copies                       |
| B — integration layer и shell | Site Consumer    | `services/site-ksk-inlove/src/**`                                                  | retained API/types/services/hooks/observability, нейтральный shell, без UI/content |
| C — каталог сервисов          | Site Consumer    | `SERVICES.md`                                                                      | зарегистрирован новый consumer; manifest не изменён                                |
| D — Quality Gate              | Quality Gate     | read-only diff; `docs/reports/**` только QG-SYNTH                                  | единый verdict по независимым lanes                                                |


`services/site-ad/**` — read-only source. Внутри `.helm/**` и `.github/**` запрещены любые edits после копирования.

## Execution units


| Unit           | Профиль                  | Deliverable | Ownership paths                                                       | Зависит от              | Verification                                                                |
| -------------- | ------------------------ | ----------- | --------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| `IL-SC-1`      | Site Consumer            | A           | `services/site-ksk-inlove/*`, `.helm/**`, `.github/**` (без `src/**`) | —                       | inventory + SHA-256 equality + install/config checks                        |
| `IL-SC-2a`     | Site Consumer            | B           | `src/api/**`, `src/types/**`; удаление legacy content/API helpers      | `IL-SC-1`               | targeted API tests + import/inventory checks                                |
| `IL-SC-2b`     | Site Consumer            | B           | site-settings provider/context/hook/service и callback wrapper/tests   | `IL-SC-2a`              | provider/hook + callback targeted tests                                     |
| `IL-SC-2c`     | Site Consumer            | B           | `src/lib/observability/**`, Sentry/instrumentation entrypoints/tests   | `IL-SC-2b`              | targeted observability tests + typecheck                                    |
| `IL-SC-2d`     | Site Consumer            | B           | минимальный `src/app/**` shell и neutral global styles                 | `IL-SC-2c`              | build + HTTP `404` runtime sanity                                            |
| `IL-SC-2e`     | Site Consumer            | B           | verification-only по всему `services/site-ksk-inlove/src/**`          | `IL-SC-2d`              | `UT-IL-01..06`, static scan, test/lint/typecheck/build                       |
| `IL-SC-3`      | Site Consumer            | C           | `SERVICES.md`                                                         | `IL-SC-2e`              | manifest/catalog/static brand checks                                        |
| `QG-FE`        | Quality Gate             | D           | read-only site diff                                                   | `IL-SC-3`               | tests, lint, typecheck, build, source/brand/security review                 |
| `QG-CONTRACTS` | Quality Gate             | D           | read-only specs/tasks/diff                                            | `IL-SC-3`               | strict OpenSpec + access/ownership/task conformance                         |
| `QG-SYNTH`     | Quality Gate             | D           | `docs/reports/**`                                                     | `QG-FE`, `QG-CONTRACTS` | единый `APPROVED`/`REWORK` report                                           |
| `OPS-SYNC`     | Router/OpenSpec workflow | —           | main specs                                                            | `QG-SYNTH=APPROVED`     | sync delta specs + strict validation                                        |
| `OPS-ARCHIVE`  | Router/OpenSpec workflow | —           | change archive                                                        | `OPS-SYNC`              | archive + final validation                                                  |


Неприменимые lanes:

- `QG-BE`: backend/Python diff отсутствует.
- `QG-LIVE`: runtime API diff отсутствует; этот change не меняет backend и не требует PostgreSQL/NATS smoke.



## DAG зависимостей

```text
IL-SC-1 → IL-SC-2a → IL-SC-2b → IL-SC-2c → IL-SC-2d → IL-SC-2e → IL-SC-3
                                                                  ├→ QG-FE ─────────┐
                                                                  └→ QG-CONTRACTS ──┴→ QG-SYNTH → OPS-SYNC → OPS-ARCHIVE
```

`QG-FE` и `QG-CONTRACTS` независимы и могут выполняться параллельно. Findings возвращаются владельцу как отдельные bounded execution units; затем повторяются только затронутые lanes и `QG-SYNTH`.

## Test matrix


| ID          | Уровень    | Риск/ось                     | Сценарий                                                                                          | Ожидание                                                                           | Где проверяется                            |
| ----------- | ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------ |
| `UT-IL-01`  | unit       | Public Read happy path       | Каждый retained collection/detail GET wrapper из access matrix формирует URL и query params        | стабильный path/query и успешный `ApiResult`; включая семь detail routes            | retained `src/api/*.test.ts`               |
| `UT-IL-02`  | unit       | access: anonymous GET        | GET без CMS cookie/token с валидным selector                                                      | header `X-Equestrian-Service-Key` присутствует, `Authorization` отсутствует        | `src/api/client.test.ts`                   |
| `UT-IL-03`  | unit       | selector validation boundary | selector пуст/whitespace                                                                          | header не подставляется; consumer не изобретает fallback                           | `src/api/client.test.ts`                   |
| `UT-IL-04`  | unit       | public POST exception        | callback wrapper с валидным selector                                                              | selector добавлен явно, CMS auth отсутствует, payload сериализован                 | `src/api/callBackRequest.test.ts`          |
| `UT-IL-05`  | unit       | ошибки API                   | non-2xx, invalid JSON, network error                                                              | нормализованный `ApiResult.error`, секретов в результате/логах нет                 | API client tests                           |
| `UT-IL-06`  | unit       | site settings hook           | provider передаёт данные; hook вне provider                                                       | данные доступны; вне provider — контролируемая ошибка                              | новый targeted test retained hook/provider |
| `ST-IL-01`  | static     | чистота бренда               | scan вне `.helm/**`/`.github/**` по `Александров`, `aleksandrov`, старым доменам и ID `105850153` | 0 совпадений                                                                       | `rg` в новом сервисе с exclusions          |
| `ST-IL-02`  | static     | analytics/webmaster          | scan `metrika`, `mc.yandex.ru`, `ym(`, verification tokens/meta                                   | 0 счётчиков/verification IDs вне immutable trees                                   | `rg` + review config/layout                |
| `ST-IL-03`  | static     | UI/content removal           | inventory custom pages, `src/ui`, stories, branded public media                                   | отсутствуют; есть только technical shell и retained allowlist                      | `find`/`git` inventory                     |
| `ST-IL-04`  | static     | exact copy                   | SHA-256 source/target `.helm/**` и `.github/**`                                                   | одинаковый набор relative paths и hashes                                           | `sha256sum` manifests + `diff`             |
| `ST-IL-05`  | static     | Git boundary                 | inspect target root                                                                               | `.git` отсутствует; ignored build/dependency/env artifacts не скопированы          | `find`/`test`                              |
| `ST-IL-06`  | static     | no CMS mixing                | scan cookies, bearer/auth imports, non-callback writes                                            | CMS auth и CMS-only endpoints отсутствуют; writes кроме callback отсутствуют       | `rg` + API review                          |
| `BLD-IL-01` | build      | запускаемость                | clean install, lint, typecheck, production build                                                  | команды успешны без брендовых imports/assets/routes                                | target project                             |
| `REN-IL-01` | render     | пустой baseline              | production server отвечает на `/` без custom content route                                        | стандартный технический `404`, нет бренда, analytics и пользовательского UI в HTML | local HTTP check                           |
| `REG-IL-01` | regression | source isolation             | проверить status/diff `services/site-ad`                                                          | исходный сайт не изменён                                                           | git status/diff source repo                |


Неприменимые оси backend-матрицы: БД/транзакционность/конкурентность и внешние NATS-зависимости отсутствуют; live PostgreSQL smoke не планируется. Pagination UI отсутствует. Новых SEO-страниц и индексируемого контента нет; sitemap/robots старого клиента удаляются.

## Manual QA / runtime sanity

Это не дизайн-проверка нового сайта, а проверка отсутствия унаследованного продукта:

1. После production build запустить target локально на свободном порту без CMS cookie/token.
2. Открыть `/` в desktop, tablet и mobile viewport; ожидать нейтральный стандартный `404`, без header/footer, изображений, текста, overlay/overlap и ссылок «Александровой дачи».
3. Проверить page source и Network: нет `mc.yandex.ru`, ID `105850153`, webmaster verification, старых доменов, запросов к CMS-only endpoints или автоматических write-запросов.
4. Вызвать targeted API client tests с success/error/missing-selector mocks; unit tests не должны обращаться к live backend.
5. Зафиксировать passed/failed steps; для failure приложить screenshot и network status/body в QG evidence.



## Migration Plan

1. `IL-SC-1`: создать новый каталог из tracked baseline, не копируя Git/local artifacts; зафиксировать hashes immutable deployment trees; нейтрализовать root config/package/docs вне них.
2. `IL-SC-2`: применить source allowlist, очистить import graph, сохранить integration tests и technical shell; прогнать verification.
3. `IL-SC-3`: обновить только `SERVICES.md`, подтвердить неизменность manifest/source и полный brand/analytics scan.
4. Выполнить `QG-FE` и `QG-CONTRACTS`, затем `QG-SYNTH`.
5. После `APPROVED` синхронизировать delta specs, строго валидировать и архивировать change.

Rollback до создания отдельного Git remote: удалить только новый каталог `services/site-ksk-inlove` и откатить его строку в `SERVICES.md`; `site-ad` остаётся неизменным. После появления remote rollback определяется отдельным release change.

## Risks / Trade-offs

- [Тикет говорил Vite, источник — Next.js] → пользователь исправил формулировку: сохраняется Next.js, выполняется только ограниченное patch-обновление `15.5.6` → `15.5.25`.
- [«Оставить сервисы» может быть истолковано как brand-bound page-data services] → allowlist сохраняет интеграционные сервисы, но удаляет content assembly с текстами/asset paths.
- [Неизменённые Helm/Actions содержат identity исходника] → exception ограничен двумя trees, hashes проверяются, deploy запрещён и документирован.
- [Пустой проект возвращает 404] → это намеренная техническая точка старта без пользовательской страницы; build/runtime проверяются отдельно.
- [Pruning dependencies и patch Next.js меняют lockfile] → Next.js фиксируется на `15.5.25`, остальные runtime-версии сохраняются, lockfile генерируется штатным package manager и проверяется clean install/build.
- [Tenant selector пока не задан] → env example не маскирует его чужим default; stand domain `inlove-stand.eqcms.ru` документируется явно, Sentry остаётся отключённым до заполнения пользователем через env.



## Зафиксированные ответы пользователя

1. Runtime остаётся на Next.js; миграция на Vite не выполняется. В рамках ограниченного обновления используется Next.js `15.5.25` вместо исходного `15.5.6`.
2. Пустой baseline временно возвращает стандартный `404` на `/`; placeholder-страница не создаётся.
3. Согласованный stand domain — `inlove-stand.eqcms.ru`. Sentry пользователь настраивает самостоятельно через env; до этого `SENTRY_ENABLED=false`, DSN/release не задаются.
4. Метрика, webmaster verification, `robots.ts` и `sitemap.ts` не сохраняются; SEO-файлы будут созданы заново вместе с контентными страницами.
5. Git, remote URL и добавление в `services.manifest`/orchestration пользователь выполняет самостоятельно вне этого change.

## Open Questions

Блокирующих вопросов для apply нет. Фактическое значение `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` остаётся внешней обязательной настройкой окружения; в репозитории не должно быть placeholder, который способен выбрать чужой tenant.
