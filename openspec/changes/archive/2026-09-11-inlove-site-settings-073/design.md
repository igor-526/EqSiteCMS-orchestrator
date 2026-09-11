## Context

Источник требований — `docs/tasks/073_inlove_site_settings.md`. В локальной PostgreSQL уже существует tenant `inlove` и универсальный seed `site_settings`; сайт `services/site-ksk-inlove` читает многие из этих ключей напрямую. Generic CMS UI (`services/frontend/src/app/(protected)/site-settings` и `features/siteSettings/**`) оперирует произвольными строками и не задаёт продуктовый каталог ключей. API backend уже обеспечивает tenant-scoped Public Read и Protected Write, поэтому схема таблицы и endpoint-контракт не требуют изменения.

Текущий change сначала делает локальную БД и consumer согласованными. Пользователь отдельно перенесёт таблицу позднее; этот перенос, целевая среда и способ доставки данных здесь не проектируются и не выполняются.

## Goals / Non-Goals

**Goals:**

- получить точный inventory строк tenant `inlove` до изменения и привести его к allowlist из actions 2/3/4/6 без дублирующего alternative address;
- безопасно заменить удаляемые настройки статическими решениями либо профильными Public Read API;
- оставить единственный телефон и четыре простых поля about;
- сделать операцию локальной коррекции идемпотентной, tenant-scoped и обратимой по snapshot;
- подтвердить anonymous consumer behavior и отсутствие регрессий generic CMS CRUD.

**Non-Goals:**

- перенос/экспорт таблицы или подключение stand/production БД;
- Alembic-миграция, изменение схемы `site_settings`, DTO, backend routes или access policy;
- превращение CMS UI в schema-driven редактор разрешённых ключей;
- изменение бизнес-данных prices/services либо deployment-конфигурации `site-ksk-inlove`.

## Decisions

### D1. Локальная data correction — не Alembic

Исполнитель Backend сначала определяет UUID tenant по selector `inlove`, сохраняет snapshot всех его строк и применяет tenant-scoped идемпотентный SQL/data-script. Alembic не подходит: это клиентский контент одной локальной среды, а не изменение общей схемы. Альтернатива — ручные CRUD-вызовы CMS — хуже проверяется и сложнее повторяется/откатывается.

Канонический allowlist:

- actions 2: `footer.description`, `footer.copyright_name`, `social.vk_url`, `social.instagram_url`, `home.hero_title`, `home.hero_subtitle`;
- action 3: `about_1_title`, `about_1_text`, `about_2_title`, `about_2_text` (тип `string`; начальные значения — утверждённые ниже редакционные заглушки);
- action 4: `contacts.primary_phone`;
- action 6: отдельные `contacts.address`, `contacts.coordinates`, `contacts.maps_url`, `contacts.nearest_stop`, `contacts.working_hours`.

`contacts.address_alternative`, `contacts.phones`, legacy `header.contact_phone`, исходные `about.intro/about.setting/about.features`, все action 1 и action 5 удаляются после consumer-аудита. Snapshot обязан позволять восстановить точные id/key/name/value/type/timestamps строк tenant.

### D2. Удаляемые presentation settings становятся consumer contract

Тексты, подписи CTA, меню, SEO fallback и прочие action 1 не должны редактироваться администратором. Нужные значения фиксируются в `site-ksk-inlove` в узком config/service layer, а не размазываются по JSX. Site Consumer сначала строит статический grep/inventory всех ключей, затем удаляет обращения к ключам вне allowlist и добавляет тест, запрещающий их возврат.

### D3. About — ровно два плоских блока

Страница `/about` читает четыре новых string-ключа. Первый блок показывается при заполненных `about_1_title` и `about_1_text`; второй — только при заполнении обоих `about_2_*`. Старые JSON features, gallery selection, team/reviews и image-driven about composition в текущей странице не используются. Это соответствует явному упрощению задачи и исключает скрытое восстановление удалённых строк fallback'ами.

Начальные значения являются заменяемыми редакционными заглушками: `about_1_title` = `О конном клубе «ИНЛав»`, `about_1_text` = `Здесь будет основной текст о клубе. Замените эту заглушку в настройках сайта.`, `about_2_title` = `Наша атмосфера`, `about_2_text` = `Здесь будет дополнительный текст о клубе. Замените эту заглушку в настройках сайта.`.

### D4. Один телефон во всех общих местах

Shared settings adapter читает только `contacts.primary_phone`; одинаковое нормализованное значение передаётся в header, footer и ContactSection. `header.contact_phone` и `contacts.phones` не имеют fallback/alias. Пустой primary phone скрывает телефон во всех трёх местах.

### D5. Страницы услуг опираются на неизменяемое имя группы API

Для каждой страницы задаётся статическое отображение route → точное имя группы услуг. Loader получает группу/услуги/цены из существующего Public Read API, а описание и карточки строятся из API DTO. Site settings `services.*`, `services.notice`, service SEO и общие benefit keys больше не являются источником данных страниц услуг. Дополнительные дизайнерские блоки допускаются как статическая consumer-композиция и не возвращаются в CMS.

Read-only inventory локальной PostgreSQL от 2026-09-11 обнаружил tenant UUID `685c6079-3922-4dbb-95b6-533bc9060547` (`Конный клуб «ИНЛав»`) и `0` строк `horse_service`. Поэтому DB-1a до SC-2 идемпотентно создаёт отсутствующие группы с точными именами `Занятия`, `Прогулки`, `Постой`; SC-2 фиксирует их как exact-match fixtures. Изменение администратором имени группы считается несовместимым изменением бизнес-идентификатора.

### D6. Контакты остаются атомарными настройками без дубликата адреса

Адрес, координаты, map URL, ближайшая остановка и часы работы сохраняются отдельными ключами. `contacts.address_alternative` удаляется как дублирующий и не имеет alias/fallback в consumer. Координаты остаются typed object текущего формата; ссылки проходят существующую URL-нормализацию; отсутствие отдельного поля скрывает только соответствующий элемент.

### D7. Access matrix не меняется

| Method | Path | Access class | Roles | Без auth/selector | С auth/валидным selector | Проверка |
|---|---|---|---|---|---|---|
| `GET` | `/api/site_settings`, `/api/site_settings/{id}` | Public Read + tenant selector | нет | `401` при missing/invalid selector | anonymous valid selector: `2xx/404`; CMS session: tenant-scoped `2xx/404` | anonymous smoke + существующие access tests |
| `GET` | используемые `/api/horse_services*`, `/api/prices*` | Public Read + tenant selector | нет | `401` при missing/invalid selector | anonymous valid selector: `2xx/404` | consumer contract/unit + live smoke |
| `POST` | `/api/site_settings` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | allowed role: success; прочая роль `403` | существующие access tests |
| `PATCH`, `DELETE` | `/api/site_settings/{id}` | Protected Write | `SUPERUSER`, `ADMIN`, `DEVELOPER` | `401` | allowed role: success; прочая роль `403`; foreign tenant недоступен | существующие access tests |

Коррекция данных выполняется напрямую в локальной БД, а не вводит исключение из этой матрицы.

### D8. Ownership и порядок

- Deliverable A / Site Consumer: `services/site-ksk-inlove/**` и точечное обновление `docs/sites/inlove/{scheme.md,components.md}`; последовательные units SC-1 (inventory/config/shared/about) → SC-2 (услуги/API) → SC-3 (регрессии и документация).
- Deliverable B / Backend: локальные data operations и snapshot/evidence, без runtime-кода и миграций; DB-1a создаёт отсутствующие группы до SC-2, DB-1b идёт после SC-3, чтобы site-settings строки не удалялись до устранения потребителей.
- Quality Gate: `QG-FE` и `QG-CONTRACTS` параллельно после DB-1; `QG-BE` неприменим при отсутствии backend diff, `QG-LIVE` после статических lanes, `QG-SYNTH` последним. Findings возвращаются владельцам отдельными bounded units.
- После APPROVED: sync delta specs, strict validation, archive.

## Risks / Trade-offs

- [Удаление строки ломает скрытого consumer] → до DB-1 обязательны статический inventory, запретный тест и завершённые SC units.
- [Неверный tenant при прямом SQL] → selector сначала резолвится read-only, каждый statement фильтруется exact UUID, before/after counts и чужие tenant counts сверяются.
- [Неизменяемое имя группы окажется неточным] → получить exact значения из локального API/БД и остановить SC-2 при неоднозначности, не применять fuzzy matching.
- [Локальный snapshot содержит данные, которые не следует коммитить] → хранить snapshot во временном локальном файле вне Git; в отчёте сохранять только keys/types/counts и hash, путь и rollback-команду.
- [Будущий перенос не воспроизводит ручную коррекцию] → итоговый inventory и data-script становятся входом отдельной задачи переноса, но сам перенос здесь запрещён.

## Migration Plan

1. Идемпотентно создать для tenant `inlove` отсутствующие `horse_service` с exact names `Занятия`, `Прогулки`, `Постой`, затем проверить их через Public Read GET.
2. Аудировать потребителей и реализовать/проверить Site Consumer без удаления локальных site-settings строк.
3. Снять read-only snapshot tenant `inlove`, exact inventory и контрольные counts/hash.
4. В транзакции upsert четырёх about placeholders и разрешённых contact keys, затем удалить `contacts.address_alternative` и явно перечисленные legacy/action 1/action 5 keys; проверить allowlist и отсутствие изменений других tenants.
5. Запустить anonymous Public Read и browser smoke на локальном runtime.
6. При проблеме откатить только tenant `inlove` из snapshot в транзакции и повторно сверить counts/hash.
7. Не выполнять следующий, пользовательский перенос таблицы в рамках этого change.

## Test matrix

Матрица трассирует acceptance scenarios четырёх delta specs на существующие тесты и live-проверки. `UT-*` выполняются без live backend; `SM-*` означают проверку локального runtime/PostgreSQL. Статус `выполнено` ниже используется только там, где в change уже есть фактическое evidence; остальные smoke остаются обязанностью `QG-LIVE`.

| ID | Уровень | Риск/ось | Scenario / access row | Ожидание | Где проверяется | Evidence / статус |
|---|---|---|---|---|---|---|
| `UT-073-01` | unit | curated allowlist, legacy regression | `inlove-site-shell`: shared SSR settings, legacy phone; `inlove-content-pages`: legacy content ignored | Запрашиваются только разрешённые shared/about keys; `header.contact_phone`, `contacts.phones`, action 1/5 и legacy keys не читаются | `services/site-ksk-inlove/src/features/siteSettings/services/getSiteSettings.test.ts`, `services/site-ksk-inlove/src/features/contentPages/services/loaders.test.ts` | Реальные Vitest tests; выполнены в SC-1/SC-3 (`tasks.md` 2.6, 4.2–4.3) |
| `UT-073-02` | unit/component | один телефон и локальная деградация | `inlove-site-shell`: shared settings/error/legacy phone; footer sync | Header, footer и ContactSection используют только `contacts.primary_phone`; отсутствие/ошибка скрывает optional элементы без разрушения shell | `services/site-ksk-inlove/src/features/siteSettings/services/getSiteSettings.test.ts`, `services/site-ksk-inlove/src/features/siteSettings/SiteSettingsProvider.test.tsx` | Реальные Vitest tests; выполнены в SC-1 (`tasks.md` 2.3, 2.6) |
| `UT-073-03` | unit/component | about pairs и атомарные контакты | `inlove-content-pages`: два/один/неполный about-блок; контакты и отсутствующее поле | Полная пара рендерится, неполная скрывается целиком; legacy about/address не влияет; ссылки безопасны | `services/site-ksk-inlove/src/features/contentPages/about/AboutContent.test.tsx`, `services/site-ksk-inlove/src/app/about/page.test.tsx` | Реальные Vitest tests; выполнены в SC-1 (`tasks.md` 2.4–2.6) |
| `UT-073-04` | unit | exact group identity | `inlove-services-pages`: exact group, renamed/missing group; `inlove-site-settings-curation`: три exact names | Route использует только точное имя; fuzzy match и дубликат дают empty/error outcome | `services/site-ksk-inlove/src/features/contentPages/services/serviceGroups.test.ts` | Реальные Vitest tests; выполнены в SC-2 (`tasks.md` 3.1–3.2, 3.5) |
| `UT-073-05` | unit/component | service API, error/empty, SSR и metadata | Все scenarios `inlove-services-pages` | Профильные Public Read DTO формируют list/detail/metadata; `401/5xx`, empty и `404` различаются; удалённые settings не запрашиваются | `services/site-ksk-inlove/src/features/contentPages/services/{loaders,lessonsLoaders,ridesLoaders,servicePages}.test.ts*` и content tests `lessons/**`, `rides/**`, `boarding/**` | Реальные Vitest tests; выполнены в SC-2 (`tasks.md` 3.2–3.5) |
| `UT-073-06` | unit | selected-key query boundary | `inlove-site-shell`: один shared request; regression запрета legacy consumers | Home/about используют curated key selection; home/horses/news не возвращаются к unbounded `limit=1000` settings query | `services/site-ksk-inlove/src/features/contentPages/services/loaders.test.ts` (`home/about request only...`, `home/horses/news request exactly...`) | Реальные Vitest tests; выполнены в SC-3 (`tasks.md` 4.2–4.3) |
| `UT-073-07` | unit | anonymous Public Read client | Строки D7 для GET; missing selector boundary | Валидный selector добавляется к anonymous GET без cookie/auth; отсутствующая конфигурация selector прекращает fetch безопасно | `services/site-ksk-inlove/src/api/client.test.ts`, `services/site-ksk-inlove/src/api/publicReadWrappers.test.ts` | Реальные Vitest tests; выполнены полным SC-3 прогоном (`tasks.md` 4.3) |
| `UT-073-08` | unit/API | Protected Write denial | `inlove-site-settings-curation`: запись без разрешения не меняет данные; D7 `POST` row | Пользователь без scope получает `403`, service mutation не вызывается | `services/backend/tests/unit/api/test_site_settings_access.py` | Существующий реальный backend test; runtime backend в change не менялся |
| `SM-073-01` | smoke / PostgreSQL | создание групп и идемпотентность | `inlove-site-settings-curation`: все группы отсутствуют; повторный запуск | После двух запусков существуют ровно три exact-name строки, другие tenants неизменны | `services/backend/maintain/ensure_inlove_horse_service_groups.sql`; `openspec/changes/inlove-site-settings-073/db-1a-evidence.md` | Выполнено в DB-1a (`tasks.md` 5.1–5.2): evidence фиксирует два повторных запуска без вставок, неизменный fingerprint трёх строк `inlove` и неизменность других tenants |
| `SM-073-02` | smoke / Public Read | exact groups через API | `inlove-site-settings-curation`: все три группы отсутствуют; D7 profile GET row | Anonymous GET с selector `inlove` возвращает `200` и по одной группе `Занятия`, `Прогулки`, `Постой`; missing/invalid selector возвращает `401` | `openspec/changes/inlove-site-settings-073/db-1a-evidence.md` | Выполнено в DB-1a (`tasks.md` 5.2): valid selector → `200`, missing/invalid selector → `401`; повторяется в `QG-LIVE` 6.4 |
| `SM-073-03` | smoke / PostgreSQL | curated inventory, повторяемость, rollback | `inlove-site-settings-curation`: повторная коррекция, allowlist, about, evidence, внешний scope | Два запуска дают одинаковые 16 key/type rows; другие tenants неизменны; snapshot rollback воспроизводит before hash | `services/backend/maintain/curate_inlove_site_settings.sql`, `openspec/changes/inlove-site-settings-073/db-1b-evidence.md` | Выполнено в DB-1b: second run 0 inserts/deletes, rollback rehearsal и hashes зафиксированы |
| `SM-073-04` | smoke / Public Read | valid/missing/invalid selector | D7 GET `/api/site_settings`; access scenario anonymous catalog | Valid `inlove` → `200` и 16 tenant-scoped keys; missing/invalid selector → `401` | `openspec/changes/inlove-site-settings-073/db-1b-evidence.md` | Выполнено в DB-1b; повторяется в `QG-LIVE` 6.4 |
| `SM-073-05` | smoke / browser + API | end-to-end SSR и service/profile GET | `inlove-site-shell`, `inlove-content-pages`, `inlove-services-pages` SSR/error/access scenarios | `/`, `/about` и три service routes показывают итоговый контент без CMS credentials; profile GET сохраняют selector и tenant scope | `.claude/skills/api-smoke-test` + browser steps, execution unit `QG-LIVE` | Не выполнено на момент PLAN-FIX-1; обязательная проверка `tasks.md` 6.4 |

Неприменимые оси: транзакционность/конкурентность пользовательских HTTP writes не проверяются заново, потому что change не меняет runtime API и не выполняет write через endpoint; внешний dependency outage применим только к consumer loaders и покрыт `UT-073-02/05`. Отсутствие секретов в payload и подключений к внешней БД проверяется committed evidence `SM-073-03` и затем контрактным/live lanes.

## Open Questions

Нет. Пользователь утвердил редакционные заглушки, создание трёх отсутствующих групп после read-only проверки и удаление `contacts.address_alternative` как дубликата.
