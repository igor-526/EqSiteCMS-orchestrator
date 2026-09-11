# Tasks — inlove-site-settings-073

## 1. Execution map и ownership

- [x] 1.1 `SC-1` — Site Consumer, shared settings + about. Ownership: `services/site-ksk-inlove/src/features/siteSettings/**`, `src/features/siteChrome/**`, `src/features/contentPages/about/**`, связанные navigation/contact tests. Context: `design.md` D2–D4/D6; specs `inlove-site-shell`, `inlove-content-pages`. Dependency: approval. Verification: targeted Vitest одной группы.
- [x] 1.2 `DB-1a` — Backend, только локальное создание отсутствующих service groups. Ownership: локальная PostgreSQL tenant `inlove`, data-script/evidence paths, без runtime backend и Alembic. Context: `design.md` D5 + Migration Plan; spec `inlove-site-settings-curation`. Dependency: approval. Verification: before/after exact-name inventory + повторный idempotency run + Public Read GET.
- [x] 1.3 `SC-2` — Site Consumer, страницы услуг и профильные API. Ownership: `services/site-ksk-inlove/src/features/contentPages/services/**`, `lessons/**`, `rides/**`, `boarding/**`, точечные API/types. Context: `design.md` D5; spec `inlove-services-pages`; handoff `SC-1` и `DB-1a`. Dependency: `SC-1`, `DB-1a`. Verification: targeted service-page/loader Vitest.
- [x] 1.4 `SC-3` — Site Consumer, общие регрессии и документация. Ownership: оставшиеся test/config paths `services/site-ksk-inlove/**`, `docs/sites/inlove/scheme.md`, `docs/sites/inlove/components.md`. Context: relevant sections specs всех четырёх capabilities; handoff `SC-2`. Dependency: `SC-2`. Verification: `npm test && npm run lint && npx tsc --noEmit && npm run build`.
- [x] 1.5 `DB-1b` — Backend, только локальная site-settings correction. Ownership: локальная PostgreSQL tenant `inlove`, data-script/snapshot/evidence paths, без runtime backend и Alembic. Context: `design.md` D1/D6 + Migration Plan; spec `inlove-site-settings-curation`; handoff `SC-3`. Dependency: `SC-3`. Verification: транзакционный before/after inventory + повторный dry/idempotency run.
- [x] 1.6 Зафиксировать DAG: `(SC-1 || DB-1a) → SC-2 → SC-3 → DB-1b → (QG-FE || QG-CONTRACTS) → QG-LIVE → QG-SYNTH → OPS-SYNC → OPS-ARCHIVE`; `QG-BE` пометить неприменимым, если backend runtime diff отсутствует.

## 2. SC-1 — shared settings, контакты и about

- [x] 2.1 Построить статический inventory всех читаемых `site_settings` keys в `services/site-ksk-inlove` и generic CMS Frontend; подтвердить отсутствие key-specific логики CMS, либо остановиться с конкретным finding.
- [x] 2.2 Ввести единый typed consumer config для удаляемых action 1 presentation values и тестом запретить чтение ключей вне allowlist actions 2/3/4/6.
- [x] 2.3 Обновить shared adapter: читать только разрешённые footer/contact/social keys, использовать `contacts.primary_phone` одновременно в header/footer/ContactSection и полностью удалить aliases `header.contact_phone`, `contacts.phones`.
- [x] 2.4 Обновить `/about` на `about_1_title/about_1_text/about_2_title/about_2_text`, удалить потребление legacy about/gallery/team/reviews и скрывать каждую неполную пару целиком.
- [x] 2.5 Обновить home/about ContactSection для атомарных address/coordinates/maps/nearest-stop/hours/primary-phone значений, удалить чтение `contacts.address_alternative` без alias/fallback и сохранить независимое скрытие отсутствующих полей.
- [x] 2.6 Добавить targeted regression tests на единый телефон, игнорирование legacy keys, две/одну/неполную about-пару и безопасные contact links; запустить targeted Vitest и отметить только фактически завершённые пункты.

## 3. SC-2 — услуги из Public Read API

- [x] 3.1 Зафиксировать route mapping `zanyatiya → Занятия`, `progulki → Прогулки`, `postoy → Постой` и проверить через Public Read API результат DB-1a; при отсутствии/дубликате вернуть blocked handoff, не применять fuzzy matching.
- [x] 3.2 Ввести статическое route → exact group name отображение и loaders существующих Public Read `horse_services/prices` API с tenant selector, сохранив tenant/error/empty semantics.
- [x] 3.3 Перевести descriptions, media, cards и prices трёх list/detail families на профильные API DTO; удалить чтение `services.*`, `services.notice`, service SEO и общих legacy benefit/about keys.
- [x] 3.4 Сохранить нужные дополнительные presentation-блоки как статическую consumer-композицию без CMS control; metadata строить из consumer config/API и canonical route.
- [x] 3.5 Добавить targeted tests exact match, отсутствие/переименование группы, tenant/API failures, SSR content/metadata и запрет legacy settings; запустить targeted Vitest.

## 4. SC-3 — интеграционные регрессии consumer и документы

- [x] 4.1 Обновить `docs/sites/inlove/scheme.md` и `components.md`: allowlist, источники API/config, четыре about keys, один телефон и неизменяемые названия групп; не менять legacy `docs/plans`.
- [x] 4.2 Добавить/обновить общий contract test, который перечисляет фактические запрашиваемые keys и доказывает отсутствие action 1/action 5/legacy consumers.
- [x] 4.3 Прогнать полный `npm test`, lint, `tsc --noEmit` и production build в `services/site-ksk-inlove`; устранить только regressions в ownership и вернуть handoff.

## 5. DB-1a/DB-1b — локальные data operations PostgreSQL

- [x] 5.1 `DB-1a`: повторить read-only inventory `horse_service` tenant `inlove`; идемпотентно создать отсутствующие exact names `Занятия`, `Прогулки`, `Постой` с безопасными placeholder descriptions/slugs и без изменения существующих exact-match строк.
- [x] 5.2 `DB-1a`: повторить operation, доказать отсутствие дубликатов/изменений других tenants и проверить три exact names через существующий Public Read GET; вернуть handoff для SC-2.
- [x] 5.3 `DB-1b`: разрешить selector `inlove` в exact tenant UUID, снять read-only snapshot всех его `site_settings`, before inventory/count/hash и контрольные counts других tenants; секреты/полные значения не коммитить.
- [x] 5.4 `DB-1b`: подготовить tenant-scoped транзакционный идемпотентный data-script, который upsert-ит четыре утверждённые about placeholders и остальные разрешённые keys, а затем удаляет `contacts.address_alternative` и explicit legacy/action 1/action 5 list; без Alembic и внешних подключений.
- [x] 5.5 `DB-1b`: применить script только к локальной БД, повторить для idempotency, сверить allowlist и неизменность других tenants; проверить tenant-scoped rollback на временной/транзакционной копии snapshot и сохранить безопасное evidence.

## 6. Quality Gate

- [x] 6.1 `QG-FE`: read-only review Site Consumer diff, `npm test`, lint, `tsc --noEmit`, build и browser QA desktop/mobile для `/`, `/about` и трёх страниц услуг; вернуть lane findings/evidence без общего вердикта.
- [x] 6.2 `QG-CONTRACTS`: сверить diff с четырьмя delta specs, allowlist, ownership, access matrix, exact-group contract, DB scope и отмеченными tasks; вернуть lane findings/evidence без общего вердикта.
- [x] 6.3 `QG-BE`: если runtime/backend diff отсутствует, зафиксировать `неприменимо` с обоснованием; при обнаруженном backend diff выделить отдельный lane unit до synthesis.
- [x] 6.4 `QG-LIVE`: после статических lanes проверить локальный anonymous `GET /api/site_settings` с valid/missing/invalid selector, итоговый exact inventory, используемые service/price GET и SSR/browser outcome; не подключаться к внешней БД.
- [x] 6.5 Если lane вернул findings, создать отдельные bounded rework execution units владельцам и повторить только затронутые lanes.
- [x] 6.6 `QG-SYNTH`: свести результаты lanes в один отчёт `docs/reports/073_inlove_site_settings.md` и поставить единственный verdict `APPROVED` либо `REWORK`.

## 7. Завершение OpenSpec

- [x] 7.1 После `APPROVED` синхронизировать delta specs в `openspec/specs/` через `openspec-sync-specs`.
- [x] 7.2 Повторно выполнить strict validation change и main specs; сохранить результат в отчёте.
- [x] 7.3 Архивировать change через `openspec-archive-change`; будущий перенос таблицы оформить отдельным запросом/change.
