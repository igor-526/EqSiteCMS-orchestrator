## Context

Источник запроса — `docs/tasks/056_horse_slug_bug.md`. Сейчас `HorseOutDto` и таблица CMS содержат `slug`, но `HorseCreateInDto`, `HorseUpdateInDto`, frontend input DTO и `HorseCreateUpdateModal` его не принимают. Backend создаёт slug из `name` через `SlugMixin` и tenant-scoped `_get_available_slug`, однако update-flow не имеет контракта ручной смены slug. Поле БД уже ограничено 63 символами и уникально в `(equestrian_id, slug)`.

Затронуты два владельца: Backend (`services/backend`) и Frontend (`services/frontend`). Публичный `site-ad`, NATS и схема БД не затрагиваются.

## Goals / Non-Goals

**Goals:**

- разрешить явный slug при создании и обновлении лошади;
- сохранить автогенерацию при отсутствующем, `null` или пустом slug;
- нормализовать ручное значение тем же доменным алгоритмом, что и автогенерацию;
- не допускать tenant-scoped дубликаты и не отдавать необработанный `500`;
- дать CMS-пользователю редактируемое поле с понятной подсказкой и field-level ошибкой;
- доказать access, permissions, ошибки, конкурентные коллизии и UI-регрессию тестами.

**Non-Goals:**

- изменение URL endpoint'ов или lookup по slug/UUID;
- redirect/history старого slug после переименования;
- миграция существующих slug или изменение индекса БД;
- изменение доступа Public Read GET, Protected Write или ролей;
- изменение `site-ad`, SEO, NATS/AsyncAPI и других slug-форм CMS.

## Decisions

### 1. Slug входит в DTO, а нормализация остаётся доменной

`HorseCreateInDto.slug` и `HorseUpdateInDto.slug` становятся `str | None` с лимитом 63 на структурной границе. Сервис создаёт/проверяет `Horse`, чтобы `SlugMixin` применял единую транслитерацию и очистку. Нормативная бизнес-ошибка пустого результата возвращается как `ClientError`/HTTP `400`, а не реализуется в роутере.

Альтернатива — нормализовать в UI — отклонена: это расходится между API-клиентами и не защищает backend.

### 2. Семантика отсутствующего и пустого slug

На create отсутствующий, `null` и `""` означают генерацию из `name`. На update отсутствующее поле сохраняет slug; переданный `null` или `""` означает повторную генерацию из итогового имени. Явное непустое значение заменяет slug после нормализации.

Это соответствует существующим CMS-формам новостей/услуг и сохраняет partial PATCH. Альтернатива «пустое значит сохранить» отклонена как неочевидная для поля с подсказкой об автогенерации.

### 3. Коллизии обрабатываются отдельно для ручного и автоматического значения

Автогенерация продолжает выбирать минимальный свободный суффикс `-N`. Явный ручной slug не переименовывается молча: если он занят другой лошадью того же tenant, backend возвращает `400` с field-compatible ошибкой. Текущая лошадь исключается из self-conflict при update; одинаковый slug разрешён в разных tenant. Repository constraint остаётся последней защитой от race condition и мапится без `500`.

Альтернатива автоматически suffix-ить ручной slug отклонена: итоговый публичный URL отличался бы от явно введённого администратором.

### 4. Frontend повторяет устоявшийся slug UX

`HorseCreateUpdateModal` хранит slug в локальном state, показывает «Путь URL (генерируется автоматически)», заполняет его текущим значением в edit-режиме и передаёт `slug` в create/update payload. Ошибка `validationErrors.slug` показывается у поля. Имеющиеся scope guards и double-submit guard сохраняются; новый endpoint или live backend call в component tests не добавляется.

### 5. Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| `POST` | `/api/horses` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`; missing/invalid tenant selector `401`; запись отсутствует | `200` с разрешённым scope; `403` без scope; `400` для невалидного/занятого slug |
| `PATCH` | `/api/horses/{horse_id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401`; запись не меняется | `200` для своей tenant-записи и scope; `403` без scope/чужой tenant; `400` для невалидного/занятого slug; `404` по действующему контракту, если resource не найден после tenant gate |
| `GET` | `/api/horses` | Public Read с tenant selector | anonymous consumer; CMS user | `200` с валидным selector; `401` missing/invalid | `200`; контракт не меняется |
| `GET` | `/api/horses/{slug_or_id}` | Public Read с tenant selector | anonymous consumer; CMS user | `200` с валидным selector; `401` missing/invalid; `404` resource missing | `200`; контракт не меняется |

Исключений из дефолтной policy нет. GET-строки включены как регрессионная граница публичной читаемости после смены slug.

### 6. Ownership и порядок

1. Backend agent единолично владеет backend DTO/service и backend unit-тестами; фиксирует только свои tasks.
2. Frontend agent после стабилизации DTO-контракта единолично владеет frontend types/modal/tests; backend-файлы не меняет.
3. Один Quality Gate проверяет совокупный diff, выполняет unit/frontend gates и live smoke через skill на реальном API/PostgreSQL; findings возвращаются соответствующему владельцу.
4. После успешного повторного gate Router синхронизирует delta specs в main specs, запускает strict validation и архивирует change.

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `types/api/horses.ts` | create/update DTO принимают optional slug | typecheck/API-boundary payload | authenticated CMS; backend остаётся Protected Write | `npx tsc --noEmit`, `npm test` |
| `HorseCreateUpdateModal` | slug вводится, prefill/reset и отправляется | component: create/edit/empty/error/double-submit | scope present/missing; `401/403` surfaced существующим flow | `npm test -- HorseCreateUpdateModal`, `npm run lint` |
| horse mutation flow | backend field error сохраняет modal state | mocked success/400/401/403; без live backend | anonymous route block; authenticated render; permission guard | `npm test`, `npm run build` |

## Manual QA steps (UI тестирование)

Предусловия: подняты backend/frontend и реальная PostgreSQL; есть CMS-пользователь со scope `ADMIN` и пользователь без horse write scope; известен tenant selector.

1. Anonymous: открыть `/horses`; ожидать redirect/block на `/login`, modal недоступна.
2. Authenticated со scope: открыть `/horses` на desktop 1440×900, создать лошадь с пустым «Путь URL»; ожидать успешное создание, закрытие modal, refresh таблицы и сгенерированный slug в колонке.
3. Создать лошадь с ручным `my-horse-url`; ожидать ровно нормализованный slug в таблице и доступность Public Read detail по новому URL.
4. Открыть созданную запись; ожидать prefill slug. Изменить его, сохранить одинарным и быстрым двойным кликом; ожидать одну mutation, обновлённую строку и недоступность старого slug.
5. Очистить slug при edit и сохранить; ожидать регенерацию из итоговой клички без пустого URL.
6. Ввести slug другой лошади; ожидать field/backend error без закрытия modal и без потери введённых полей.
7. Проверить backend validation и generic error через доступный dev/mock сценарий: modal и значения сохраняются; `401` ведёт через auth flow, `403` показывается как denial.
8. Пользователь без scope: action create/edit скрыта или disabled; modal нельзя открыть обходом UI, mutation guard не вызывает API.
9. Повторить визуальную проверку на tablet 768×1024 и mobile 390×844: label/input/error/footer не перекрываются, body modal прокручивается, кнопки доступны.
10. Проверить существующие поиск/фильтры/sort/pagination таблицы: slug-изменение не меняет `{limit, offset}`, смена фильтра по-прежнему сбрасывает `offset=0`.
11. Проверить отсутствие импортов/кода `site-*` и отсутствие регрессии Public Read GET без CMS cookie.
12. В QA-отчёте зафиксировать passed/failed; для failed responsive/error/permission приложить screenshot, для API failure — method/path/status/body.

## PostgreSQL для smoke-тестов

Поиск по запрошенным labels `com.docker.compose.project=eqsitecms` + `service=db` не вернул контейнер, поэтому использован обязательный fallback `eqsitecms-db`. `docker inspect eqsitecms-db` обнаружил контейнер `eqsitecms-db` (ID/alias на момент планирования: `7c720ddc783d`), image PostgreSQL 16, compose project `eqsitecms-core`, service `db`, aliases `eqsitecms-db`/`db`, `POSTGRES_DB=eqsitecms`, `POSTGRES_USER=eqsitecms`, `POSTGRES_PASSWORD=eqsitecms`, host port `5433`. Перед smoke исполнитель MUST повторить discovery/inspect и использовать актуальные значения, а не копировать их как хардкод.

## Risks / Trade-offs

- [Старые внешние ссылки перестанут работать после ручной смены slug] → явно вне scope; UI не обещает redirect/history.
- [Race между проверкой и записью] → unique index и узкий mapping `HorseSlugConflictError`, smoke с конкурентными PATCH/POST.
- [Пустое ручное значение после нормализации] → доменный `400`, modal сохраняет input и показывает ошибку.
- [Frontend и backend разойдутся по max length] → единый контракт 63 и type/component/API tests.
- [Публичный GET случайно приватизируется] → access scenarios и live anonymous smoke с tenant selector.

## Migration Plan

1. Внести и проверить backend DTO/service/tests без миграции БД.
2. Внести frontend DTO/modal/tests после стабилизации контракта.
3. Пройти общий Quality Gate и live smoke на актуальном контейнере PostgreSQL.
4. Rollback — откатить runtime-коммиты; данные остаются совместимыми, так как схема не менялась. Уже изменённые slug при rollback не восстанавливаются автоматически.

## Open Questions

Нет блокирующих вопросов. Принята семантика: пустой slug в PATCH означает регенерацию из итогового `name`, а занятый ручной slug возвращает `400` без автоматического suffix.
