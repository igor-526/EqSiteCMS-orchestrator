## ADDED Requirements

### Requirement: Пять gateway маршрутов отсутствуют

Backend SHALL исключить пять перечисленных операций из реального route registry, OpenAPI и генерируемого inventory. Это retirement, а не новый Public Read/Protected Write endpoint и не обработчик-заглушка `410`. Для обычного запроса без CORS rejection действуют следующие исходы независимо от роли:

| method | path | access class | roles | expected without auth | expected with auth | tests |
|---|---|---|---|---|---|---|
| GET | `/api/yandex/auth-link` | Removed, отсутствие registry | любые/нет | 404 | 404 | UT-RET-01..04, SM-RET-01 |
| GET | `/api/yandex/account` | Removed, отсутствие registry | любые/нет | 404 | 404 | UT-RET-01..04, SM-RET-01 |
| GET | `/api/yandex/account/{account_id}` | Removed, отсутствие registry | любые/нет | 404 | 404 | UT-RET-01..04, SM-RET-01 |
| POST | `/api/yandex/account` | Removed, отсутствие registry | любые/нет | 404 | 404 | UT-RET-01..04, SM-RET-01 |
| DELETE | `/api/yandex/account/{account_id}` | Removed, отсутствие registry | любые/нет | 404 | 404 | UT-RET-01..04, SM-RET-01 |

Исторически GET были protected exceptions из-за private account/OAuth данных; anonymous получал `401`, без `SEO`/tenant — `403`, ADMIN/SUPERUSER не обходили SEO. Этот старый контракт не сохраняется для отсутствующих маршрутов. Shared CORS middleware SHALL сохранить своё поведение: preflight OPTIONS может возвращать `200`/`400`, поэтому retirement MUST NOT утверждать all-method `404` и MUST NOT менять CORS всех других endpoints.

#### Scenario: Anonymous обращается к каждому старому маршруту
- **WHEN** anonymous вызывает любой method/path из matrix, включая malformed account ID, query/body и missing/invalid selector, без запрещённого CORS Origin
- **THEN** ответ равен `404`, auth dependency и downstream Yandex не вызываются

#### Scenario: Authenticated обращается к каждому старому маршруту
- **WHEN** CMS пользователь с SEO, без SEO, ADMIN или SUPERUSER вызывает любой method/path из matrix, в том числе с expired/legacy OAuth cookie и чужим account ID
- **THEN** ответ равен `404` без auth/tenant/role validation, записи данных и upstream вызовов

#### Scenario: Registry и preflight согласованы
- **WHEN** reviewer проверяет registry, OpenAPI, inventory и OPTIONS разрешённого/запрещённого Origin
- **THEN** пять операций отсутствуют, а OPTIONS соответствует shared CORS `200`/`400` и не считается живым Yandex endpoint

### Requirement: CMS UI и OAuth consumers удалены

CMS SHALL удалить `/seo`, SEO menu/title/action registry, account modal/settings UI, все вызовы пяти gateway путей, popup/postMessage callback workflow и `/callbacks/oauth/yandex`. Оба старых UI URL SHALL отвечать `404` anonymous и authenticated; query `code/state/error` MUST NOT пересылаться в login/dashboard, обрабатываться как OAuth, отправляться upstream или попадать в application logs/telemetry. Удаление middleware SHALL ограничиваться exclusively callback-specific файлом при повторном подтверждении отсутствия других обязанностей.

#### Scenario: Старые UI адреса без и с сессией
- **WHEN** anonymous или authenticated открывает `/seo` или `/callbacks/oauth/yandex?code=sentinel&state=sentinel`
- **THEN** показывает not-found с HTTP `404`, без OAuth popup/postMessage/network mutation или redirect с секретными query

#### Scenario: Меню и surviving CMS flows
- **WHEN** CMS пользователь с SEO или без SEO открывает dashboard/sidebar, профиль, настройки сайта и управление пользователями
- **THEN** пункт SEO отсутствует для всех, а остальные auth/scopes/навигационные flows сохраняются

### Requirement: Узкий cleanup без потери независимых функций

Исполнитель SHALL удалять только approved exact file lists из design, с сохранением текущих dirty baseline изменений, в том числе untracked пользовательских файлов до отдельного approval. Уже отсутствующие файлы MUST NOT восстанавливаться. Shared login/refresh/logout и access/refresh cookies, auth guards, generic OAuth утилиты с surviving consumers, public site SEO metadata/canonical/sitemap/robots, карты и используемая site-ad Метрика MUST оставаться неизменными. Generated inventory SHALL содержать ровно текущие реально зарегистрированные операции без жёсткого предположения `117→112`.

#### Scenario: Review отделяет retirement от обычного SEO
- **WHEN** reviewer сопоставляет approved список с diff и reference scan
- **THEN** отсутствуют unrelated site/auth/package/config изменения и потеря surviving auth tests; численность inventory вычислена из актуального registry

### Requirement: Persistent роль имеет отдельный gate

Базовый retirement SHALL обходиться без data migration и удаления grants. Dynamic roles endpoint может продолжать возвращать persisted `SEO`; frontend enum MUST NOT считаться механизмом удаления роли из БД. Только при отдельном явном approval включения migration в diff Backend SHALL подготовить новую forward data migration удаления строк с exact `scope_name = 'SEO'` и их grants в одной транзакции, сохраняя всех пользователей, остальные роли и grants. Выполнение на live DB SHALL требовать отдельного operational approval и backup. Существующие применённые миграции MUST NOT переписываться/удаляться, и отсутствующая историческая revision MUST NOT выдумываться или копироваться из удалённых артефактов.

#### Scenario: Роль отложена
- **WHEN** пользователь подтверждает базовый diff без role retirement
- **THEN** новая migration и data changes отсутствуют, enum SEO сохраняется до отдельного решения, возможная видимость роли в users UI явно сообщается

#### Scenario: Подготовка optional migration согласована
- **WHEN** пользователь отдельно разрешает включить forward migration в diff
- **THEN** migration привязывается к повторно проверенному статическому head, удаляет только SEO/grants; downgrade явно необратим для grants без backup и не реконструирует фиктивные назначения

#### Scenario: Устаревший scope UUID и race
- **WHEN** после отдельно approved migration приходит write с старым SEO UUID или одновременное назначение роли
- **THEN** тест на реальной PostgreSQL проверяет отсутствие orphan grants и неизменность прочих ролей; действующий service/error mapping документируется, а его изменение требует отдельного решения, не скрытой auth переработки
