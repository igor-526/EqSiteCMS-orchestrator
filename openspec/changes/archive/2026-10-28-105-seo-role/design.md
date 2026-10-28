# Design — 105-seo-role

Тикет: `docs/tasks/105_seo_role.md`. Дата: 2026-10-27. Контуры: основной backend и CMS; SEO backend — неизменяемый peer.

## Context

Мотивация — proposal → Why. Источник задачи — 105; задачи 098/099/100/102/103/104 описывают намерения, не доказательство реализации.

| Основание | Что подтверждено | Отличие/ограничение |
|---|---|---|
| `services/backend/src/core/seeds/user_scopes.json`, `user_scopes.py`; `utils/seeding/seeders/{user_scopes_seeder,simple_seeder,base_seeder}.py` | четыре scope, seed сравнивает по ID, выполняет flush в внешней транзакции | SEO отсутствует; UUID должен быть постоянным после однократной генерации |
| `services/backend/src/models/users.py` | users, user_scopes, user_scopes_relations; username и scope_name уникальны | новая таблица/миграция не нужна; связь назначения не имеет отдельной уникальности user+scope, нужна идемпотентная подготовка |
| `services/backend/src/api/{seo,yandex}.py`, `maintain/route_inventory.py` | 11 SEO и 8 Yandex операций проверяют строго ADMIN | менять только эти правила, не глобальную семантику ADMIN/SUPERUSER |
| `services/frontend/src/features/seo/hooks/useSeoScopes.ts`, `src/types/api/user.ts`, `src/ui/NavigationMenu/NavigationMenu.tsx`, `src/app/(protected)/seo/page.tsx` | единый action registry; только ADMIN; protected layout блокирует anonymous | SEO нужно внести в enum, весь registry и проверки отзыва роли |
| `src/app/(open)/callbacks/oauth/yandex/page.tsx`, `features/seo/hooks/useYandexOAuthCallback.ts` | callback вне основного layout, отправляет защищённый POST | нельзя считать URL callback публичным правом обмена кода |
| `docs/reports/{add-yandex-seo-integration,seo-service-queries-pages,seo-frontend,seo-pages-metrics,seo-queries-metrics}.md` | прошлые проверки ADMIN-only и peer без credentials | исторические отчёты не переписываются под SEO |
| `openspec/changes/104-metrica-scheduling` и текущий код | parse-jobs и кнопка уже реализованы, 129/135 tasks | 104 ещё активен; main specs не содержат двух capability; sync 104 — предусловие apply 105 |
| `.agents/skills/api-smoke-test` и `.claude/skills/api-smoke-test` | SKILL.md одинаковы, credentials различаются; роли superuser/su/admin/developer | `.claude/.../credentials.json` tracked; нельзя добавлять новый литерал пароля или копировать один файл поверх другого |

## Goals / Non-Goals

Цель: одинаковая точная проверка наличия SEO в backend и UI, без расширения других полномочий. Сохранить DTO, статусы бизнес-ошибок, tenant isolation, SQL/метрики, пагинацию и double-submit guards.

Не цели: новый auth-протокол peer API, роль «SEO administrator», глобальный RBAC-рефакторинг, автоматическое назначение SEO всем администраторам, новые endpoints/миграции, изменения NATS/scheduler/Яндекса/Метрики, изменение публичных сайтов и mobile/tablet CMS.

## Decisions

### D1. Строгая роль, без административного override

Проверка — `any(scope.scope_name == "SEO")`. SEO-only и SEO+ADMIN разрешены; ADMIN-only, SUPERUSER-only, DEVELOPER-only, USER_MANAGER и отсутствие ролей запрещены. Наличие SEO не выдаёт административных прав на другие разделы. Альтернатива SEO OR ADMIN отвергнута: противоречит «только пользователям с ролью SEO». Существующим операторам SEO назначается явно отдельным согласованным действием, не массовым backfill.

### D2. Явная внешняя граница «всех SEO endpoints»

Scope — 11 операций `/api/seo/**` и все 8 `/api/yandex/**`, которыми пользуется SEO-раздел, включая OAuth exchange. Иначе SEO-only пользователь попадёт в раздел, но не сможет пользоваться вкладкой Метрики. Эти восемь операций включены явно, а не как неоговорённый побочный эффект.

`services/seo-service` не проверяет пользовательские scopes и не получает cookie. Его resolve/list/normalization/parse-jobs остаются Internal Trusted Network API; health — Public Read. `yandex-service`, `ya-metrica-service` и их peer endpoints тоже не меняются. Selector `X-Equestrian-Id` — non-secret identity hint: отсутствующий/невалидный →401 независимо от cookie/Authorization, с валидным selector credentials не требуются и игнорируются. Backend передаёт только actor tenant. Прямая доступность peer извне остаётся отдельным production release blocker, не исправляется имитацией авторизации по selector. Полная неизменяемая peer matrix — `openspec/specs/seo-peer-http-contract/spec.md` и `104-metrica-scheduling/specs/seo-parse-trigger-api/spec.md`; delta peer обновляет лишь название роли внешнего gateway.

Публичные consumers не используют эти приватные данные. Их GET не переводятся в Protected Read. Альтернатива «защитить каждый peer endpoint ролью SEO» требует отдельного доверенного auth-контракта и миграции парсеров/scheduler; она исключена из данного change и требует перепланирования при выборе пользователем.

### D3. Seed и безопасная локальная подготовка

Добавить один элемент SEO в `src/core/seeds/user_scopes.json`; при реализации выполнить `python -c 'import uuid; print(uuid.uuid4())'` один раз и сохранить результат. Не генерировать ID на каждом старте, не придумывать шаблон. Использовать существующий `UserScopesSeeder` через штатный startup `init_registry`; схема и механизм seed не меняются.

Создать узкую повторяемую dev-команду `services/backend/maintain/provision_seo_smoke_user.py`, не startup seed всех окружений. Перед выполнением проверить локальную БД и явно переданный существующий equestrian_id. Пароль читать без echo из существующего локального smoke-источника, сверив, что выбран согласованный общий тестовый пароль; не передавать его аргументом shell и не логировать DSN/хеш. Хешировать через штатный `Security.hash_password`, использовать штатные модели/репозитории и транзакционный контекст. Пользователь `seo` активен, не удалён и имеет только SEO. ID пользователя/связи генерируются при создании, не на планировании.

Транзакция создаёт пользователя и связь атомарно. Для повторов сверить username, tenant, единственный SEO scope и статус; совместимая запись — no-op, несовместимая — безопасный отказ без исправления чужого аккаунта и пароля. Конкурирующие запуски сериализовать транзакционной блокировкой по этому provisioning key, не вводя глобальную миграцию; уникальность username остаётся страховкой. При конфликте роли SEO с другим ID seed не заменяет данные автоматически: оператору выдаётся безопасный blocker.

### D4. SMOKE без нового tracked секрета

В каждой копии credentials добавить только `roles.seo.login = "seo"` и `roles.seo.password_ref = "admin"`; пароль не дублировать. В обоих SKILL.md описать разрешение `password_ref` в рамках того же файла, ошибку отсутствующего/циклического ref и выбор seo. Существующие credentials и aliases не менять; base_url и cookie_jar не синхронизировать между копиями. Для сценариев change использовать явный путь к этому design, отдельные cookie jars в `.qa/105-seo-role/` с ограниченными правами; сырые cookie/секреты не публиковать. Если локальные test passwords расходятся, остановить подготовку до решения оператора, а не выбирать новый пароль самостоятельно.

### D5. Разделение backend/UI

В backend заменить/переименовать локальные dependencies `require_seo_admin` и `require_yandex_admin` на понятные SEO guards, не изменяя общий get_current_user. Допустим общий узкий dependency в `depends/` при отсутствии циклических импортов; SQL в routes не добавлять. В route inventory сохранить access classes, заменить только роли для этих 19 операций и перегенерировать документ.

В CMS `KNOWN_USER_SCOPES.SEO` и все `SEO_ACTIONS` используют одну роль. Меню и SeoPage используют общий adapter, не копируют собственный ADMIN OR SEO. Hook перед каждым read/mutation повторно проверяет актуальные permissions, при отзыве SEO скрывает данные и игнорирует поздние ответы. Обновить тексты ошибок, называющие ADMIN. OAuth callback без SEO не отправляет POST; anonymous получает безопасный login/auth-required UX, code/state не выводятся, прежние origin/source/StrictMode guards сохраняются. Ошибки API 401/403 не становятся success; POST auth/code не становится public exception.

## Access matrix

Каждая строка — самостоятельный anonymous/authenticated тест. Для всех строк без валидной сессии →401; с сессией без SEO, включая ADMIN →403 до peer/мутаций и валидации невалидного тела; с SEO-only/SEO+ADMIN — результат колонки. Успешные статусы предполагают валидный ввод и доступные зависимости. GET-исключения нужны для приватной аналитики, настроек и PII/OAuth; публичным сайтам данные не нужны. Записи — Protected Write, а auth/code не публичный OAuth endpoint.

### Основной backend → SEO

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/pages` | Protected GET exception | только `SEO` | `401`, seo-service не вызывается | `200` с `items/total/metrics_table`; без SEO (включая SUPERUSER/DEVELOPER) `403` до downstream; невалидные `mode`/`metric`/даты, нечисловые `limit`/`offset` — `400` без вызова peer; неизвестный `ordering` — `400` от seo-service; seo-service `5xx`/`502` (в т.ч. сбой ya-metrica), транспорт, невалидный payload — `502` |

Причина GET-исключения не меняется: SEO-данные и статистика — внутренние данные администрирования конюшни, публичным `site-*` не нужны.

### Requirement: Access matrix списка запросов с метриками
`GET /api/seo/search-queries` SHALL соответствовать матрице ниже. Причина исключения Public Read — приватная административная аналитика; требуется строго SEO, без role override. Tenant MUST браться только из сессии, а не из клиентского selector. Backend MUST проверять синтаксис параметров метрик и ordering до downstream, но не вычислять период или форматирование.

#### Scenario: Anonymous и недостаточная роль
- **WHEN** список запросов вызван без сессии либо только с SUPERUSER/DEVELOPER без SEO
- **THEN** соответственно 401 и 403 до вызова SEO

#### Scenario: SEO и чужой selector
- **WHEN** SEO конюшни A передаёт X-Equestrian-Id или query equestrian_id конюшни B
- **THEN** SEO получает только selector A, credentials клиента не пересылаются, ответ 200 содержит только данные A

#### Scenario: Ошибки и ранняя валидация
- **WHEN** SEO передал невалидный mode/metric/ordering, одиночную/обратную/некорректную дату либо нечисловой limit/offset
- **THEN** 400 без SEO; корректная metric-дата вне периода передаётся SEO, который применяет default

#### Scenario: Невалидный ответ или downstream отказ
- **WHEN** SEO вернул 5xx, неожиданный статус, невалидный DTO, либо произошёл timeout/transport error
- **THEN** 502 без деталей peer; безопасный 400 от SEO передаётся как 400

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | backend `/api/seo/search-queries` | Protected GET exception | только SEO | `401`, SEO не вызывается | SEO `200` с items/total/metrics_table; без SEO `403` до downstream; невалидный query `400`; downstream/DTO error `502`; tenant только из сессии |

### Requirement: Route inventory
Backend SHALL классифицировать все 11 маршрутов `/api/seo/*` в route inventory с access class, ролью только `SEO`, конюшней из сессии и ссылкой на тесты; сгенерированный `docs/backend-route-inventory.md` MUST соответствовать приложению.

#### Scenario: Инвентарь актуален
- **WHEN** выполняется тест route inventory
- **THEN** все `/api/seo/*` маршруты классифицированы, GET — как protected GET exception, запись (включая `POST /api/seo/parse-jobs`) — как protected write

### Requirement: Проксирование постановки парсинга
Backend SHALL предоставлять `POST /api/seo/parse-jobs` и проксировать его в `POST /api/parse-jobs` seo-service с `X-Equestrian-Id` конюшни сессии; access class, роли и статусы определяет capability `seo-parse-trigger-api`. Остальные 10 маршрутов `/api/seo/**` не меняются.

#### Scenario: Прокси вызывает только seo-service
- **WHEN** SEO вызывает `POST /api/seo/parse-jobs`
- **THEN** backend обращается только к seo-service, без cookie и клиентских заголовков, и не обращается к ya-metrica-service

## ADDED Requirements

### Requirement: Полная матрица SEO-only gateway
Все 11 операций SHALL соответствовать матрице ниже. Причина исключений GET из Public Read — приватная SEO-аналитика и настройки. Наличие ADMIN/SUPERUSER/DEVELOPER без SEO MUST давать 403 до peer; SEO без ADMIN и SEO+ADMIN MUST допускаться. Tenant SHALL определяться только сессией.

#### Scenario: Все строки anonymous
- **WHEN** каждая операция матрицы вызывается без действующей сессии
- **THEN** 401 до peer и изменения данных, включая невалидное тело

#### Scenario: Все строки authenticated
- **WHEN** каждую операцию вызывают SEO, SEO+ADMIN, ADMIN без SEO, SUPERUSER/DEVELOPER без SEO и пользователь без ролей
- **THEN** первые два получают статусы матрицы; остальные 403 до peer, даже при невалидном вводе

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/seo/search-queries` | Protected GET exception | только `SEO` | `401` | `200`; без SEO `403` до downstream; `400` нечисловые limit/offset или неизвестный ordering; `502` peer недоступен |
| GET | `/api/seo/pages` | Protected GET exception | только `SEO` | `401`, seo-service не вызывается | `200` с `items/total/metrics_table`; без SEO (включая SUPERUSER/DEVELOPER) `403` до downstream; невалидные `mode`/`metric`/даты, нечисловые `limit`/`offset` — `400` без вызова peer; неизвестный `ordering` — `400` от seo-service; seo-service `5xx`/`502` (в т.ч. сбой ya-metrica), транспорт, невалидный payload — `502` |
| GET | `/api/seo/page-normalization/blacklisted-query-params` | Protected GET exception | только `SEO` | `401` | `200`; без SEO `403`; `502` |
| POST | `/api/seo/page-normalization/blacklisted-query-params` | Protected write | только `SEO` | `401` | `201`; без SEO `403`; `400` невалидное тело/значение; `409` дубль; `502` |
| PATCH | `/api/seo/page-normalization/blacklisted-query-params/{item_id}` | Protected write | только `SEO` | `401` | `200`; без SEO `403`; `400` malformed `item_id`/тело; `404` чужой/отсутствующий; `409`; `502` |
| DELETE | `/api/seo/page-normalization/blacklisted-query-params/{item_id}` | Protected write | только `SEO` | `401` | `204`; без SEO `403`; `400` malformed `item_id`; `404` чужой/отсутствующий; `502` |
| GET | `/api/seo/page-normalization/blacklisted-hashes` | Protected GET exception | только `SEO` | `401` | `200`; без SEO `403`; `502` |
| POST | `/api/seo/page-normalization/blacklisted-hashes` | Protected write | только `SEO` | `401` | `201`; без SEO `403`; `400`; `409`; `502` |
| PATCH | `/api/seo/page-normalization/blacklisted-hashes/{item_id}` | Protected write | только `SEO` | `401` | `200`; без SEO `403`; `400`; `404`; `409`; `502` |
| DELETE | `/api/seo/page-normalization/blacklisted-hashes/{item_id}` | Protected write | только `SEO` | `401` | `204`; без SEO `403`; `400`; `404`; `502` |
| POST | `/api/seo/parse-jobs` | Protected Write | только SEO | `401` | `202`; без SEO `403` до downstream; тело/провайдер/нет интеграции `400`; downstream `502`; очередь `503` |

### Основной backend → Yandex

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/yandex/auth/link` | Protected Sensitive Read (исключение) | SEO | `401` | `200`; без роли SEO `403`; peer error `400`/`502` |
| POST | `/api/yandex/auth/code` | Protected Write (не публичный callback) | SEO | `401` | `200`; без роли SEO `403`; state ≠ конюшня `403`; невалидное тело `400`; peer `400`/`502` |
| GET | `/api/yandex/accounts` | Protected Sensitive Read (исключение) | SEO | `401` | `200`; без роли SEO `403`; невалидные `limit/offset` `400` |
| DELETE | `/api/yandex/accounts/{account_id}` | Protected Write, tenant-owned resource | SEO | `401` | `204`; без роли SEO `403`; чужой/отсутствующий `404`; malformed `400` |
| GET | `/api/yandex/metrica/counters` | Protected Sensitive Read (исключение) | SEO | `401` | `200`; без роли SEO `403`; чужой/отсутствующий аккаунт `404`; missing/malformed `account_id` `400`; peer `400`/`502` |
| GET | `/api/yandex/metrica/connection` | Protected Sensitive Read (исключение) | SEO | `401` | `200` (`counter` или `null`); без роли SEO `403` |
| POST | `/api/yandex/metrica/connection` | Protected Write | SEO | `401` | `200`; без роли SEO `403`; чужой/отсутствующий аккаунт `404`; невалидное тело `400` |
| DELETE | `/api/yandex/metrica/connection` | Protected Write, tenant из сессии | SEO | `401` | `204` (идемпотентно); без роли SEO `403` |

Тесты матрицы: `UT-ACCESS-01..05`, `SM-01..06`; CMS mocks — `FE-A01..06`, `FE-Y01..03`, `FE-D01..04`. Невалидная/истёкшая cookie эквивалентна anonymous. Проверка чужого tenant не допускает 403 как замену предусмотренному 404 для чужого ресурса при наличии SEO.

## Deliverables (ownership)

| Deliverable | Владелец | Непересекающиеся пути | Units |
|---|---|---|---|
| A — основная авторизация и provisioning | Backend | `services/backend/src/core/seeds/user_scopes.json`; локальные SEO/Yandex guards в `src/api/{seo,yandex}.py` и при необходимости `src/depends/seo_access.py`; `maintain/{provision_seo_smoke_user,route_inventory}.py`; относящиеся `tests/unit/{api,utils,maintain}/`; `services/backend/docs/backend-route-inventory.md`; `services/backend/README.md` | BE-1, BE-2 последовательно |
| B — интерфейс SEO | Frontend | `services/frontend/src/types/api/user.ts`; `src/features/seo/**`; `src/ui/NavigationMenu/NavigationMenu{,.test}.tsx`; при необходимости только SEO route shells `src/app/(protected)/seo/page.tsx`, `src/app/(open)/callbacks/oauth/yandex/page.tsx`; относящиеся `src/api/*seo*.test.ts`, `src/api/*yandex*.test.ts` | FE-1, FE-2, FE-3 последовательно |
| C — локальные профили и каталог | Backend (тот же профиль A) | `.agents/skills/api-smoke-test/{SKILL.md,credentials.json}`, `.claude/skills/api-smoke-test/{SKILL.md,credentials.json}`; только SEO/Yandex access-описания `SERVICES.md` | BE-1 (skill), BE-2 (каталог) |
| D — независимая приёмка | Quality Gate | evidence `.qa/105-seo-role/**`; единственный будущий `docs/reports/105-seo-role.md` | QG, затем QG-FE-MANUAL с последовательной передачей отчёта |

Delta specs принадлежат Planner до approval; после реализации синхронизирует Router. Каждый исполнитель может отмечать только свои фактически выполненные checkbox в общем tasks.md; одновременные записи Router сериализует. Все units делают checkpoint/handoff внутри своей сессии; отдельных units для коммитов/установки зависимостей нет.

## Execution units

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| BE-1 | Backend | A+C | seed; новый provisioning helper и его unit tests; обе копии SMOKE skill | approval, sync 104 | targeted seed/provisioning unit tests |
| BE-2 | Backend | A+C | api/SEO guards; SEO/Yandex API tests; route inventory+generated doc; SERVICES.md, backend README | BE-1 | `make -C services/backend test` + `make -C services/backend lint` |
| FE-1 | Frontend | B | enum, registry+tests, NavigationMenu+tests, SeoPage+tests, callback hook/UI tests | approval, sync 104 | targeted access/navigation/callback Vitest + tsc |
| FE-2 | Frontend | B | Yandex popup/accounts/counters/connection/wizard hooks/UI и их tests, локальные тексты ошибок | FE-1 | targeted Yandex Vitest |
| FE-3 | Frontend | B | hooks/UI/tests таблиц, normalization и parse refresh; API-boundary tests; финальная регрессия фичи | FE-2 | `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` |
| QG | Quality Gate | D | без продуктовых изменений; `.qa/105-seo-role/`, итоговый отчёт | BE-2, FE-3 | QG-LITE: ENV → BE → FE-AUTO → CONTRACTS → LIVE; scoped проверки |
| QG-FE-MANUAL | Quality Gate | D | `.qa/105-seo-role/browser/`, последовательное дополнение того же отчёта | QG | scripted browser 1366×768, M01..M08, итоговый verdict |

Точечные contextFiles перечислены в tasks.md. Оценка BE-1/BE-2/FE-1/FE-2/FE-3 — примерно 8–12 существенных действий на один unit, по одному проверяемому slice. FE-2/FE-3 группируют тесно связанные коррекции тестовых ролей, не переписывают всю feature. Если обнаружен новый auth-механизм или существенно больше файлов, исполнитель возвращает partial со split, не расширяет unit.

```text
approval + завершение/sync 104 ─┬→ BE-1 → BE-2 ──────┐
                              └→ FE-1 → FE-2 → FE-3 ┴→ QG → QG-FE-MANUAL
```

BE и FE ветки допускают параллельное выполнение, но runtime verification только после обеих. Новых NATS, AsyncAPI, миграций и третьего сервиса с кодом нет: профиль будущей реализации **QG-LITE + QG-FE-MANUAL**, не QG-FULL. Для текущего чисто планировочного diff применима только validation OpenSpec; runtime не запускается.

## Test matrix

### Backend и provisioning

| ID | Уровень | Риск/ось | Сценарий | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| UT-SEED-01 | unit | стабильность seed | первое/повторное сидирование SEO | один UUID, прежние роли/назначения не меняются | backend tests/unit/utils, spec «Стабильная роль SEO» |
| UT-SEED-02 | unit | атомарность/повторы | provisioning create/no-op/conflict/исключение | только SEO; rollback; несовместимая запись без изменений | backend tests/unit/maintain, spec «Локальный тестовый SEO-пользователь» |
| UT-SEED-03 | unit | секреты/конкурентность | штатный hash, сериализация двух запусков, секрет в аргументах/логе отсутствует | один user и одна связь, открытый пароль не сохраняется | там же; SM-01 подтверждает PostgreSQL |
| UT-ACCESS-01 | unit/API | anonymous | все 19 строк без/с истёкшей cookie, включая плохое тело | 401, ноль downstream | test_seo_proxy_api.py, test_yandex_proxy_api.py; полная матрица |
| UT-ACCESS-02 | unit/API | deny | все строки: ADMIN, SUPERUSER, DEVELOPER, USER_MANAGER, пустые scopes без SEO, в т.ч. невалидный ввод | 403 до peer, нет изменений | те же tests; «Параметризованный доступ» |
| UT-ACCESS-03 | unit/API | happy path/смешанные роли | все строки: SEO-only и SEO+ADMIN | прежние success статусы/DTO, включая 202 | те же tests; матрица |
| UT-ACCESS-04 | unit/API | tenant/ownership | spoof selector/body, foreign blacklist/account UUID, чужой OAuth state | tenant A; foreign 404; OAuth state mismatch 403 | те же tests + client boundary; сценарии «Чужой tenant» |
| UT-ACCESS-05 | unit/API | validation/downstream/contract | SEO: 400/409/502/503, safe DTO, credential stripping; инвентарь | бизнес-контракт не меняется, 19 правил SEO | existing boundary tests и test_route_access_inventory.py |
| SM-01 | live PostgreSQL | seed/транзакция | два seed и два provisioning запуска, конкурентная пара в изолированной fixture, штатный login+auth/me | одна роль/учётка/связь, SEO-only, без plaintext; провоцируемая ошибка назначения откатывает создание | SMOKE skill + inspect/безопасные SQL-counts; обе provisioning requirements |
| SM-02 | live API | deny matrix | все 19 операций без cookie и ADMIN без SEO | 401/403; нет изменений/peer effects | матрица; skill, не pytest |
| SM-03 | live API | allow matrix | все 19 операций с SEO-only и SEO+ADMIN | success матрицы, тестовые значения/аккаунты, изолированные fixtures | матрица; skill |
| SM-04 | live API | tenant | чужие blacklist/account UUID и selector, OAuth state чужой конюшни | 404/403 по матрице, чужие записи сохранены | tenant scenarios |
| SM-05 | live peer | граница без изменений | health; списки/resolve/parse-jobs и representative normalization с selector без credentials и с произвольными credentials; missing/invalid selector | health 200; одинаковые outcomes с selector; без selector 401 | peer spec и manual trigger matrix; skill |
| SM-06 | live regression | public consumer/безопасность | representative существующий public GET backend и проверка redacted evidence | public GET остаётся anonymous 200, секреты отсутствуют | `site-consumer-contracts` без изменения его реализации |

Конкурентность и реальные constraints относятся только к локальному provisioning; доменные записи нормализации/аккаунтов не перерабатываются. Внешняя деградация покрывается существующими mocked unit cases под SEO: не нужно искусственно останавливать NATS/peer в live smoke. Производительность/N+1 неприменимы: SQL/DTO и число peer вызовов не меняются. Регрессия ADMIN-only→deny и SEO-only→allow — отдельные параметризованные группы, не квота тестов.

### CMS frontend

Все тесты — Vitest/MSW/mocks без live backend. Новые фичи таблиц/фильтров не добавляются; сохраняется существующее покрытие, меняются разрешённая и запрещённая роли.

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| FE-A01 registry/enum | SEO вместо ADMIN для всех actions | unit: SEO-only, SEO+ADMIN, ADMIN-only, empty, SUPERUSER/DEVELOPER, rerender/revoke | present/missing, актуальные permissions | targeted Vitest useSeoScopes |
| FE-A02 navigation/page | меню и прямой /seo | component: SEO render всех вкладок, ADMIN forbidden/no calls, anonymous login/layout | anonymous/authenticated, отсутствие вспышки приватных данных | targeted NavigationMenu/SeoPage |
| FE-A03 callback | обмен кода только SEO | hook/component: SEO success, без SEO no POST, anonymous, 401/403, StrictMode once, плохие параметры | локальный deny + backend reject, без утечки code/state | targeted callback tests |
| FE-A04 revoke/race | удаление приватных данных | component/hook: отозвать SEO при открытой странице и при in-flight запросе | без новых вызовов и без восстановления данных поздним ответом | targeted SeoPage/hooks |
| FE-A05 mixed-role regression | admin не имеет implicit SEO | отдельно ADMIN-only deny и SEO-only allow; SEO+ADMIN allow | никакого SUPERUSER override | targeted navigation/registry |
| FE-A06 API boundary | контракт всех 19 операций | mocks: success/empty, 400/409, network/502/503, 401 auth flow и видимый 403 | cookies include, нет selector/peer URL, no live API | targeted src/api tests |
| FE-Y01 Yandex read | данные доступны SEO | component: accounts/counters/connection data/loading/empty/error/interaction | SEO scope, missing guard, 401/403 | targeted Yandex tests |
| FE-Y02 mutations | SEO-only bind/unlink/popup | component/hooks: guard, hidden/disabled, revoke, double-submit, cancellation | 200/204 success invalidation; 400/403/502 сохраняют шаг/input | targeted wizard/popup tests |
| FE-Y03 error text | роль SEO в отказах | regression: сообщение не требует ADMIN; не раскрывает OAuth code | backend deny surfaced, не success | targeted Yandex tests |
| FE-D01 data reads | страницы/запросы SEO-only | hooks/components: scope present/missing, loading/empty/error/data, race | без SEO no calls, 401/403 | targeted table/panel tests |
| FE-D02 normalization | создание/удаление SEO-only | existing component/hook tests: validation/400/409/502, guard, double-submit, success refresh, revoke | backend 403 видим, input/list не теряются | targeted normalization tests |
| FE-D03 parse refresh | запуск SEO-only | existing confirm/hook tests: cancel, один POST, 202, 400/401/403/502/503 | missing scope no request, stale closure guard | targeted parse refresh tests |
| FE-D04 pagination/filter regression | без изменения поведения | initial limit/offset, page change, page size change, filter/search/sort reset offset; defaults/empty/error сохраняются | только SEO выполняет чтение | existing pages/queries/accounts/counters tests |

Финальные FE-команды из `services/frontend`: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Self-check: поиск fetch/axios вне API boundary, imports @/api из app, `page/pageSize/page_size` в API, `site-ad/site-*/Public Read` в CMS; FSD shared/widgets/entities не создавать. Использовать `rg` при наличии, иначе эквивалентный `grep`; отсутствие rg не blocker. Review тестов сверяет behavior diff, no live backend calls и отсутствие массового ослабления assertions.

## PostgreSQL для smoke-тестов

На планировании выполнены read-only discovery и `docker inspect`. Поиск labels project=eqsitecms/service=db ничего не вернул; fallback по имени нашёл `eqsitecms-db`. Из inspect: image `postgres:16`, project `eqsitecms-infra`, service `db`, aliases `eqsitecms-db`, `db` в `eqsitecms_network`, POSTGRES_DB=`eqsitecms`, POSTGRES_USER=`eqsitecms`, host port `5433` для `5432/tcp` (IPv4/IPv6). Пароль получен inspect и намеренно скрыт; не копировать в артефакты. Это снимок, не хардкод команды подключения.

Первый live executor повторяет discovery/inspect и получает секрет только в памяти. Подключение — к реальной PostgreSQL, не SQLite/mocks. Чужие пользовательские данные не менять. SEO/Yandex fixture storage также только реальные локальные PostgreSQL peer сервисов; их параметры заново обнаруживает исполнитель через inspect, не берёт пароли из SERVICES.md.

### SMOKE-тесты на реальном API

Переменные: `BASE_URL` и `AUTH_ENDPOINT` — из выбранной локальной копии credentials; `SEO_COOKIE`, `ADMIN_COOKIE`, `SEO_ADMIN_COOKIE` — изолированные локальные jars; `TENANT_A`, `TENANT_B`, `BLACKLIST_A_ID`, `BLACKLIST_B_ID`, `YANDEX_ACCOUNT_A_ID`, `YANDEX_ACCOUNT_B_ID` — согласованные test fixtures; `PUBLIC_READ_PATH` — существующий consumer GET из backend route inventory. Не использовать реальные production аккаунты или менять существующую привязку пользователя.

| ID | Запрос/действие | Проверка |
|---|---|---|
| SM-01 | подготовка seed/user, POST AUTH_ENDPOINT, GET /api/auth/me и безопасные counts | PostgreSQL, идемпотентность и SEO-only |
| SM-02 | каждая из 19 строк access matrix без cookie, затем с ADMIN_COOKIE | 401, затем 403; те же проверки с плохим телом |
| SM-03 | каждая из 19 строк с SEO_COOKIE и SEO_ADMIN_COOKIE | статусы матрицы; OAuth только со свежим согласованным code; при его отсутствии ключевая live-проверка помечается blocked-env, не fake success |
| SM-04 | DELETE чужого blacklist/account ID, GET counters чужого account_id, POST auth/code с чужим state | 404/403 без чужой мутации |
| SM-05 | внутренние peer операции из разрешённой локальной сети | selector outcomes неизменны; запросы resolve и parse-jobs используют только fixtures |
| SM-06 | GET PUBLIC_READ_PATH без cookie; redaction review результатов | Public Read не нарушен; секреты не опубликованы |

SMOKE только через `.claude/skills/api-smoke-test` / `.agents/skills/api-smoke-test`, не `tests/smoke` и не pytest. Операции DELETE и OAuth выполняются только на disposable согласованных fixtures; если нет изолированного аккаунта/свежего OAuth code, gate фиксирует ограничение, не удаляет реальную привязку.

## Manual QA steps (UI тестирование)

Предусловия: подняты согласованные backend/CMS/SEO/Yandex зависимости, seed применён; SEO-only пользователь подготовлен; есть ADMIN без SEO и временный SEO+ADMIN; fixtures и cookie изолированы. Весь прогон — только desktop **1366×768**, URL origin из реального runtime. Scripted Playwright evidence + визуальная инспекция по browser QA protocol; не заменять unit tests live backend calls.

| Шаг | Действия | Ожидаемый результат |
|---|---|---|
| M01 | anonymous открыть `/seo`; отдельно `/callbacks/oauth/yandex` без сессии | /seo ведёт на /login, приватный UI не показывается; callback требует входа, не отправляет обмен кода и не выводит code/state |
| M02 | войти ADMIN без SEO; проверить меню, прямой `/seo` и callback с тестовыми параметрами | пункта нет; forbidden доступен с клавиатуры; ноль /api/seo и /api/yandex calls; нет mutation/success |
| M03 | войти SEO-only, затем SEO+ADMIN; открыть `/seo`, переключить все четыре вкладки | пункт активен, вкладки и доступные действия работают; Webmaster — заглушка без вызовов; другие admin-разделы не получили новых прав |
| M04 | на страницах/запросах перейти страницу, изменить размер, поиск/сортировку/сброс; прокрутить 100 строк/31 колонку; открыть нормализацию | limit/offset и reset прежние; sticky панели, кнопки и модалки не перекрываются, нет page overflow/overlap на 1366×768 |
| M05 | SEO: добавить/удалить disposable normalization rule; invalid input, 409 и injected 403/502; двойной submit; затем подтвердить/отменить parse refresh | валидация и backend ошибки видимы, input/list/dialog сохранены; одна mutation; success refresh; 202 означает очередь, не готовые данные |
| M06 | SEO: открыть wizard Метрики, выбрать disposable account/counter, подтвердить/отменить unlink; открыть popup/callback | bind/unlink guarded, keyboard/focus и pending без регрессий; callback один POST только SEO; origin/source guards сохранены, секреты не в screenshots |
| M07 | во время запроса/открытой модалки отозвать SEO через согласованную test fixture; затем injected 401/403 | действия и приватные данные исчезают, новые вызовы не уходят, late responses не восстанавливают данные; 401 штатный auth flow, 403 видимый отказ |
| M08 | проверить console/network/axe и визуально layout всех вкладок/диалогов; anonymous consumer GET | нет новых serious/critical a11y, overlap и секретов; consumers не изменены; evidence содержит passed/failed steps, sanitized network status/body, скриншоты permission/error/layout |

## Risks / Trade-offs

- [ADMIN теряет SEO] → явное approval breaking change и согласованное назначение SEO нужным людям до переключения; автоматического backfill нет.
- [«Все endpoints» могут пониматься как peer тоже] → scope D2 вынесен на approval; при выборе peer-auth — остановка и новое проектирование, не расширение backend unit.
- [104 не синхронизирован] → apply заблокирован до завершения/sync 104; затем повторная strict validation. MODIFIED для parse capability рассчитаны на результат 104, не на отсутствующий main spec.
- [Два источника credentials и tracked файл] → password_ref без нового секрета; независимые конфиги, проверка secret diff.
- [Изменения тестов скроют дефект] → отдельные негативные ADMIN-only tests, позитивные SEO-only; не менять общие auth fixtures всего проекта.
- [Peer доступны по локальным портам] → не обещать production security, существующий isolation release gate обязателен.

## Migration Plan

1. После пользовательского approval и sync 104 выполнить BE/FE units. Применить seed штатным механизмом; тестового пользователя создавать только явной локальной dev-командой.
2. Оператор согласованно назначает SEO нужным действующим операторам через существующий механизм управления scopes. Не менять роли остальных пользователей автоматически.
3. Разворачивать backend и CMS согласованно, проверить auth/me и матрицу; не включать переходный SEO OR ADMIN. Активные сессии проверяются через текущий get_current_user; роли не кешировать в новом токене/клиентском флаге.
4. Общий QG-LITE, затем отдельный QG-FE-MANUAL с одним итоговым отчётом. Findings исправляет владелец, перепроверяются затронутые сценарии.
5. Только Router после итогового APPROVED и пользовательских gates выполняет sync specs → strict validate → archive/штатную финализацию. PLAN-105 на этом не начинает apply.

Откат: согласованно вернуть backend и CMS к предыдущему релизу. Seed SEO можно оставить как неиспользуемую роль; не удалять реальные назначения/пользователей автоматически. Созданную локальную тестовую fixture удалять только по её сохранённым идентификаторам и согласованию оператора, не по одному имени.

Имена исторических scenarios с ADMIN сохранены для корректного delta merge; нормативные шаги внутри них уже требуют SEO. Это не исключение из новой access policy.

## Approval gate

Критических неразрешённых технических решений внутри предложенного варианта нет. Router должен получить явное подтверждение его границ **до apply**: (1) ADMIN без SEO запрещён, (2) восемь `/api/yandex/**` переводятся на SEO вместе с разделом, (3) internal peer API остаётся без пользовательских ролей. Если пункт 2 или 3 не принят, это изменение scope и требуется правка design/specs/tasks, а не свободный выбор исполнителя. Предусловие sync 104 отдельно не считается выполненным данным планированием.
