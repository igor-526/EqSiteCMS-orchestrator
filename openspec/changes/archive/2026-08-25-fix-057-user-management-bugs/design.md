## Context

Исходный запрос: `docs/tasks/057_user_management_bugs.md`, регрессия после архивированного change `user-management`. Затронут только `services/frontend`: `/users` уже использует `useUserManagement`, `UsersHeader`, таблицу и `UserFormModal`, а API DTO корректно разделяют `scope_name` (подпись) и `id` (UUID значения). Текущая верхняя область не повторяет композицию `/prices`, а селектор ролей зависит от неоднозначного `label` Ant Design при `optionRender`/`tagRender`, из-за чего пользователю может показываться UUID.

CMS frontend является защищённым admin-контуром. Backend-контракт, access policy, БД и публичные `site-*` в этом change не меняются.

## Goals / Non-Goals

**Goals:**

- получить на `/users` устойчивую композицию «вкладки → фильтры и действия с пагинацией справа → отступ → таблица»;
- показывать в role selector локализованное имя роли, сохраняя UUID только как техническое значение;
- корректно поддержать create и edit, включая пустой список, loading/error и восстановление выбранных ролей;
- зафиксировать регрессию component/API-boundary тестами и browser QA на desktop/tablet/mobile.

**Non-Goals:**

- изменение endpoint'ов, DTO backend, ролей или permission-модели;
- backend-код, миграции, NATS и тесты живого API;
- изменения `site-ad` или Public Read consumer-кода;
- визуальный редизайн всей таблицы пользователей.

## Decisions

### 1. Верхняя область следует существующему паттерну prices

Внутри user-management feature создаются/расширяются собственные tabs и documentation views, а `UsersHeader` отвечает за строку управления. На первой строке идут вкладки. На второй строке фильтры/сброс/добавление и пагинатор, при этом пагинатор выравнивается вправо (`margin-left: auto`/эквивалентный flex layout). Контейнер перед таблицей получает явный вертикальный gap. Это повторяет визуальную грамматику `/prices`, но не создаёт импортов между features.

Альтернатива — импортировать `PricesTabs`/`PricesHeader` — отклонена из-за смешивания feature ownership и несвязанных типов.

### 2. Опция роли содержит явные `label` и `value`

Для каждой роли формируется option `{ value: role.id, label: getRoleLabel(role.scope_name), scopeName: role.scope_name }`. Рендер option/tag использует явное человекочитаемое поле либо lookup `value → role`, а не предполагает, что Ant Design всегда передаст строку роли в `props.label`. Controlled value остаётся массивом UUID и отправляется как `scope_ids`; edit mode инициализируется `user.scopes.map(scope => scope.id)`.

Альтернатива — хранить названия ролей в form state — отклонена: backend принимает UUID, а преобразование имён создаёт риск неоднозначности.

### 3. Ошибки загрузки ролей видимы и блокируют некорректную mutation

Hook должен различать loading, success/empty и API error списка ролей. Модальное окно показывает доступное сообщение при ошибке; submit с выбранными ролями не преобразует UUID в подписи. Повторная отправка остаётся защищённой существующим submit guard.

### 4. Access matrix фиксирует неизменяемую границу

Change не меняет endpoint'ы, однако frontend-тесты сверяются с существующим контрактом:

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| GET | `/api/user-management/roles` | Protected Read, явное исключение для чувствительного CMS-справочника | `USER_MANAGER`, `SUPERUSER` | `401` | `200` для разрешённой роли; `403` без роли |
| POST | `/api/user-management/users` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | success по контракту для разрешённой роли; `403` без роли |
| PATCH | `/api/user-management/users/{id}` | Protected Write | `USER_MANAGER`, `SUPERUSER` | `401` | success по контракту для разрешённой роли; `403` без роли/при запрещённой цели |

Причина защищённого `GET /roles`: справочник относится к permissioned CMS user-management, а не к публичному контенту. Frontend unit/component tests используют mocks/MSW и не выполняют live backend calls.

### 5. Ownership и порядок

Один Frontend Agent владеет `services/frontend/src/app/(protected)/users/**`, `services/frontend/src/features/user-management/**` и относящиеся к change frontend-тесты. После выполнения Router передаёт совокупный diff одному Quality Gate Agent. После успешного gate Router синхронизирует delta spec в main specs, повторяет strict validation и архивирует change.

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `/users` page/header/tabs | порядок tabs → controls → table, gap и pagination справа | component tests + responsive manual QA | anonymous redirect; allowed render | `npm test`, browser QA |
| `UserFormModal` | подписи ролей вместо UUID, create/edit selection | component: create, edit preload, option/tag label, empty, loading, error | scope present/missing; `401/403` surfaced | `npm test` |
| `useUserManagement` / service boundary | роли загружаются и UUID отправляются в `scope_ids` | mocked API-boundary: success, empty, validation, generic, `401`, `403` | authenticated allowed/denied | `npm test` |
| pagination/search | сохраняется `limit/offset`, поиск сбрасывает offset | initial, page change, page size, search/reset offset | authenticated CMS | `npm test` |
| architecture | нет live calls и `site-*` mixing | `rg` checks + review | CMS-only | `npm run lint`, `npx tsc --noEmit`, `npm run build` |

## Manual QA steps (UI тестирование)

Предусловия: запущен CMS frontend и backend; имеются USER_MANAGER/SUPERUSER, пользователь без нужной роли, минимум две роли и несколько пользователей для пагинации.

1. Anonymous: открыть `/users` без сессии; ожидать redirect/block, без краткого отображения данных.
2. Auth: войти как USER_MANAGER, открыть `/users`; ожидать вкладки первой строкой, фильтры/действия второй, пагинацию справа и заметный gap перед таблицей.
3. Переключить пользовательскую и техническую вкладки; ожидать соответствующее содержимое без mutation и потери состояния списка.
4. Проверить поиск, reset, следующую страницу и смену page size; ожидать корректные `limit/offset`, а поиск/reset — возврат `offset=0`.
5. Нажать «Добавить»: selector ролей присутствует, каждая option показывает название, не UUID; выбрать несколько ролей и создать пользователя; в network payload ожидать UUID в `scope_ids`, один запрос при double-click и обновлённую таблицу.
6. Открыть существующего пользователя: выбранные роли показаны названиями; изменить набор, сохранить и убедиться в обновлении строки.
7. Смоделировать empty/loading, backend validation, generic error, `401` и `403` списка ролей/mutation; ожидать понятное состояние, сохранение формы после ошибки и закрытие/redirect только по принятому auth flow.
8. Войти без USER_MANAGER/SUPERUSER; ожидать отсутствие/guard действий и redirect/block страницы.
9. Повторить layout-проверку на desktop 1440×900, tablet 768×1024 и mobile 390×844: tabs, controls, paginator, кнопки, table и modal не перекрываются; допустим перенос строки без потери порядка и доступности.
10. Проверить, что публичный `site-ad` не изменился и CMS feature не импортирует consumer-код.

QA-отчёт должен содержать passed/failed для каждого шага; для failed responsive/error/permission cases — screenshot, для failed API cases — HTTP status и response body.

## Risks / Trade-offs

- [Ant Design меняет форму аргументов render callbacks] → использовать собственный typed lookup по option value и покрыть option/tag component tests.
- [Responsive выравнивание pagination конфликтует с переносом] → задать предсказуемый flex-wrap и проверить три viewport.
- [Список ролей пуст или недоступен] → отдельные empty/error состояния, submit не должен подменять UUID строками.
- [Вкладки раздувают scope простого bugfix] → переиспользовать только локальные UI-примитивы и короткие документационные views, без shared refactor.

## Migration Plan

Изменения не требуют миграции данных. Выпустить frontend после автоматических проверок и Manual QA. Rollback — возврат frontend diff; backend-контракт и данные остаются совместимыми.

## Open Questions

Нет блокирующих вопросов. Текст вкладок и документации следует существующей терминологии `/prices`; точные spacing tokens выбираются из уже применяемых CMS utility-классов.
