## 1. Backend deliverable — модель, API и tests

### Backend

- [ ] 1.1 Backend owner: прочитать все `contextFiles` из `openspec instructions apply --change breeds-group-048 --json`, зафиксировать ownership всех `services/backend` путей и не менять frontend/specs
- [ ] 1.2 Повторить поиск PostgreSQL по labels/fallback и получить актуальные DB env/host port только через `docker inspect`
- [ ] 1.3 Создать Alembic migration: `breed_groups`, tenant unique constraints/indexes, nullable indexed `breeds.breed_group_id` с `ON DELETE SET NULL`, reversible downgrade
- [ ] 1.4 Создать SQLAlchemy table `src/models/breed_groups.py` и подключить metadata; расширить `src/models/breeds.py` FK
- [ ] 1.5 Создать `BreedGroup` entity и расширить `Breed` nullable group identity без инфраструктурных импортов
- [ ] 1.6 Создать group create/update/out/page-data DTO и расширить breed DTO/input полями `group`/`breed_group_id` с сохранением explicit null
- [ ] 1.7 Создать `BreedGroupRepositoryProtocol` и расширить `BreedRepositoryProtocol` filters/sorts/group lookup contracts
- [ ] 1.8 Реализовать tenant-scoped `BreedGroupRepository` с text filters, stable default/specified sorting и pagination/total
- [ ] 1.9 Расширить `BreedRepository` outer join, nested group mapping, `breed_group_ids`, `group_name`, NULL ordering и deterministic tie-breaker
- [ ] 1.10 Реализовать `BreedGroupService`: validation, safe page_data, slug/name uniqueness, permissions, CRUD/list/detail
- [ ] 1.11 Расширить `BreedService`: tenant-valid assign/clear group, group DTO read, default `created_at desc`, filter/sort contract
- [ ] 1.12 Зарегистрировать repository/service DI в `src/depends` с общей request session
- [ ] 1.13 Создать router `/horses/breed-groups`, зарегистрировать в API/main; GET без auth dependency, writes current user/protected context
- [ ] 1.14 Расширить breeds router query/body/response и заполнить все строки access matrix без исключений из policy
- [ ] 1.15 Проверить migration upgrade/downgrade/upgrade на disposable реальной PostgreSQL и сохранить команды/evidence

- [ ] 1.16 Unit: UT-01 entity группы принимает обязательные поля, timestamps и tenant UUID
- [ ] 1.17 Unit: UT-02 create нормализует пробелы name и генерирует slug
- [ ] 1.18 Unit: UT-03 create применяет `<div></div>` как default page_data
- [ ] 1.19 Unit: UT-04 пустой name возвращает ClientError без repository create
- [ ] 1.20 Unit: UT-05 name длиннее DB limit отклоняется
- [ ] 1.21 Unit: UT-06 unsafe JavaScript в page_data отклоняется
- [ ] 1.22 Unit: UT-07 duplicate tenant name возвращает business conflict/error
- [ ] 1.23 Unit: UT-08 duplicate slug получает детерминированный суффикс внутри tenant
- [ ] 1.24 Unit: UT-09 одинаковые name/slug в другом tenant разрешены
- [ ] 1.25 Unit: UT-10 write user без admin/developer/superuser scope получает ForbiddenError
- [ ] 1.26 Unit: UT-11 разрешённый scope выполняет create
- [ ] 1.27 Unit: UT-12 group detail ищет UUID и slug только текущего tenant
- [ ] 1.28 Unit: UT-13 отсутствующая/чужая group detail мапится в ClientError без disclosure
- [ ] 1.29 Unit: UT-14 group list передаёт text filters в repository
- [ ] 1.30 Unit: UT-15 group list без sort применяет `created_at desc,id desc`
- [ ] 1.31 Unit: UT-16 group list поддерживает asc/desc name/slug/created_at/updated_at
- [ ] 1.32 Unit: UT-17 group pagination передаёт limit/offset и сохраняет total
- [ ] 1.33 Unit: UT-18 partial update не стирает отсутствующие поля
- [ ] 1.34 Unit: UT-19 empty PATCH отклоняется без repository update
- [ ] 1.35 Unit: UT-20 rename проверяет tenant uniqueness и пересчитывает slug по контракту
- [ ] 1.36 Unit: UT-21 page_data update повторно применяет HTML security
- [ ] 1.37 Unit: UT-22 delete вызывает tenant-scoped repository delete
- [ ] 1.38 Unit: UT-23 group DTO без query flag не сериализует page_data
- [ ] 1.39 Unit: UT-24 group detail с flag сериализует page_data
- [ ] 1.40 Unit: UT-25 breed create с group UUID валидирует группу текущего tenant
- [ ] 1.41 Unit: UT-26 breed create с foreign/unknown group отклоняется до create
- [ ] 1.42 Unit: UT-27 breed update назначает новую валидную группу
- [ ] 1.43 Unit: UT-28 breed update explicit `breed_group_id:null` очищает связь
- [ ] 1.44 Unit: UT-29 breed update без group field сохраняет прежнюю связь
- [ ] 1.45 Unit: UT-30 breed out DTO возвращает nested `{id,name,slug}` либо null
- [ ] 1.46 Unit: UT-31 repository breed list фильтрует по одному group UUID
- [ ] 1.47 Unit: UT-32 repository breed list фильтрует OR/IN по нескольким UUID и корректно считает total
- [ ] 1.48 Unit: UT-33 repository breed list сортирует `group_name/-group_name` и фиксирует NULL ordering
- [ ] 1.49 Unit: UT-34 repository outer join не теряет породы без группы
- [ ] 1.50 Unit: UT-35 default breed sort стабилен при одинаковом created_at
- [ ] 1.51 Unit: UT-36 repository/constraint failure не оставляет частично изменённую domain state
- [ ] 1.52 Запустить весь backend unit suite/линтер/type checks применимыми командами проекта и немедленно отметить только фактически пройденные пункты

- [ ] 1.53 Smoke: SM-01 skill `smoke` подтверждает migration и наличие table/nullable FK на реальной PostgreSQL
- [ ] 1.54 Smoke: SM-02 Public GET group list без cookie с валидным Equestrian Key возвращает 200
- [ ] 1.55 Smoke: SM-03 Public GET group detail без cookie с валидным key возвращает 200
- [ ] 1.56 Smoke: SM-04 group GET без Equestrian Key возвращает 401
- [ ] 1.57 Smoke: SM-05 group GET с invalid Equestrian Key возвращает 401
- [ ] 1.58 Smoke: SM-06 group POST без auth возвращает 401 и не создаёт row
- [ ] 1.59 Smoke: SM-07 group PATCH без auth возвращает 401 и не меняет row
- [ ] 1.60 Smoke: SM-08 group DELETE без auth возвращает 401 и не удаляет row
- [ ] 1.61 Smoke: SM-09 authenticated write без dictionary scope возвращает 403
- [ ] 1.62 Smoke: SM-10 ADMIN создаёт группу и row читается непосредственно из PostgreSQL
- [ ] 1.63 Smoke: SM-11 пустой/whitespace name возвращает 400 без row
- [ ] 1.64 Smoke: SM-12 malformed structural payload возвращает 422 без row
- [ ] 1.65 Smoke: SM-13 duplicate tenant name возвращает 400/constraint-mapped error
- [ ] 1.66 Smoke: SM-14 одинаковый name в другом tenant разрешён и изолирован
- [ ] 1.67 Smoke: SM-15 unsafe page_data возвращает 400 и не сохраняется
- [ ] 1.68 Smoke: SM-16 default page_data сохраняется как `<div></div>`
- [ ] 1.69 Smoke: SM-17 list text filter name/slug возвращает только matches и корректный total
- [ ] 1.70 Smoke: SM-18 list default order равен `created_at DESC,id DESC`
- [ ] 1.71 Smoke: SM-19 list explicit asc/desc sort работает для name и created_at
- [ ] 1.72 Smoke: SM-20 pagination first/next/empty page не дублирует и не пропускает rows
- [ ] 1.73 Smoke: SM-21 detail без page_data flag не раскрывает page_data
- [ ] 1.74 Smoke: SM-22 detail с page_data=true возвращает сохранённый HTML
- [ ] 1.75 Smoke: SM-23 PATCH name/slug обновляет row и timestamps
- [ ] 1.76 Smoke: SM-24 empty PATCH возвращает 400 без изменений
- [ ] 1.77 Smoke: SM-25 DELETE group возвращает 204 и subsequent detail not found
- [ ] 1.78 Smoke: SM-26 чужой tenant не читает/меняет/удаляет группу
- [ ] 1.79 Smoke: SM-27 breed POST с валидной group создаёт FK и nested group DTO
- [ ] 1.80 Smoke: SM-28 breed POST с foreign/unknown group возвращает 400 без breed row
- [ ] 1.81 Smoke: SM-29 breed PATCH назначает другую группу
- [ ] 1.82 Smoke: SM-30 breed PATCH с explicit null отвязывает группу
- [ ] 1.83 Smoke: SM-31 breed PATCH без group field сохраняет связь
- [ ] 1.84 Smoke: SM-32 breed GET без cookie остаётся Public Read и содержит nested group/null
- [ ] 1.85 Smoke: SM-33 breed list с несколькими breed_group_ids возвращает union и корректный total
- [ ] 1.86 Smoke: SM-34 breed list sort group_name asc/desc детерминирован с NULL rows
- [ ] 1.87 Smoke: SM-35 DELETE связанной group выполняет PostgreSQL SET NULL и не удаляет breeds
- [ ] 1.88 Smoke: SM-36 concurrent duplicate group creates оставляют одну tenant-unique row
- [ ] 1.89 Smoke: SM-37 ошибка/constraint в mutation откатывает транзакцию без partial rows
- [ ] 1.90 Smoke: SM-38 responses не содержат equestrian secret/auth/private DB fields
- [ ] 1.91 Выполнить SM-01..SM-38 только skill `smoke` на живом API/актуально discovered PostgreSQL, не создавать `tests/smoke`, вернуть method/path/status/body и DB evidence

## 2. Frontend deliverable A — группы пород

### Frontend

- [ ] 2.1 Frontend owner A: прочитать apply context, владеть новыми `horseBreedGroups` files и назначенными orchestration files; не менять backend/specs
- [ ] 2.2 Создать `types/api/horseBreedGroups.ts`, API functions, service boundary и validator для list/detail/create/update/delete
- [ ] 2.3 Создать `useHorseBreedGroups` с list state, default paging/sort, filter normalization/reset offset, selector options, CRUD, validation/errors/invalidation
- [ ] 2.4 Создать `HorseBreedGroupsTable` с data/loading/empty/error, name/slug filters, sort, pagination и permission-guarded interaction
- [ ] 2.5 Создать `HorseBreedGroupsCreateUpdateModal` с create/update/delete, validation, double-submit и permission guards
- [ ] 2.6 Создать group Page Editor API service и интеграцию без photo controls
- [ ] 2.7 Добавить `BREED_GROUPS` tab непосредственно перед `BREEDS`, header action и orchestration в `useHorsesPage`/protected `/horses`
- [ ] 2.8 Test: group API/service MSW success, empty, validation 400, generic error, 401 и 403 без live backend calls
- [ ] 2.9 Test: group hook initial `{limit:25,offset:0}`, page change, page-size change, filters/sort normalization и reset offset
- [ ] 2.10 Test: group table data, loading, empty, error, filter/sort callback, paging и scope present/missing
- [ ] 2.11 Test: group modal open/close, valid create/update/delete, client/backend error, double-submit, 401/403 state retention и success invalidation
- [ ] 2.12 Test: tabs regression фиксирует позицию «Группы пород» перед «Породы», authenticated render и existing tabs
- [ ] 2.13 Test: protected route evidence фиксирует anonymous redirect/block и authenticated group render
- [ ] 2.14 Test: Page Editor group load/save success/error/permission, отсутствие photo UI
- [ ] 2.15 Выполнить self-check no `site-*` mixing и применимые `rg` команды из Planner contract; сохранить evidence

## 3. Frontend deliverable B — связь в породах (после deliverable A)

### Frontend

- [ ] 3.1 Frontend owner B: принять ownership существующих breed types/API/hook/table/modal/tests и orchestration только после завершения owner A
- [ ] 3.2 Расширить breed types/API/service/hook полями `group`, `breed_group_id`, `breed_group_ids`, `group_name` sorts и selector options
- [ ] 3.3 Добавить колонку «Группа» и зафиксировать полный порядок семи колонок, human name/«—», multi-filter и sort
- [ ] 3.4 Добавить clearable single-select группы в create/update modal и explicit null payload при unlink
- [ ] 3.5 Интегрировать group options/loading/error и refresh group/breed state после mutations/deletion
- [ ] 3.6 Test: breed API-boundary сериализует repeated group IDs, sorts, assign/null и обрабатывает 400/401/403/generic через MSW
- [ ] 3.7 Test: breed hook group filter/sort apply+clear и reset offset; selector success/empty/error
- [ ] 3.8 Test: breed table отображает group/«—», точный порядок колонок, filter/sort callbacks и permission interaction
- [ ] 3.9 Test: breed modal выбирает группу, очищает до `breed_group_id:null`, guard без scope, double-submit, error retention и invalidation
- [ ] 3.10 Test: regression после удаления group показывает «—» и не удаляет breed
- [ ] 3.11 Выполнить Manual QA steps из design на desktop/tablet/mobile и вернуть passed/failed, screenshots failures и Network evidence

## 4. Единый review, fixes и завершение change

### Quality Gate

- [ ] 4.1 Quality Gate owner: после обоих сервисных deliverables проверить общий diff, ownership violations и соответствие proposal/design/specs/access matrix
- [ ] 4.2 Проверить Clean Architecture backend: API→depends→services→protocols, одна session, отсутствие SQL/business logic в router
- [ ] 4.3 Проверить migration upgrade/downgrade, tenant constraints/indexes, nullable FK и реальный `ON DELETE SET NULL`
- [ ] 4.4 Проверить все GET как Public Read и отсутствие случайной auth dependency; selector missing/invalid `401`
- [ ] 4.5 Проверить все POST/PATCH/DELETE как Protected Write: anonymous `401`, insufficient scope `403`, чужой tenant без disclosure
- [ ] 4.6 Проверить минимум 36 разнообразных Unit checklist/test scenarios и качество edge/negative/permissions/paging/sort/null/transaction coverage
- [ ] 4.7 Проверить минимум 38 разнообразных Smoke scenarios через skill `smoke` на live API/реальной PostgreSQL и отсутствие pytest smoke files
- [ ] 4.8 Проверить, что smoke заново получил `POSTGRES_*` и host port через `docker inspect`, без hardcode
- [ ] 4.9 Запустить применимые backend tests/lint/type checks и migration checks; приложить точные команды/results
- [ ] 4.10 Из `services/frontend` запустить `npm test`
- [ ] 4.11 Из `services/frontend` запустить `npm run lint`
- [ ] 4.12 Из `services/frontend` запустить `npx tsc --noEmit`
- [ ] 4.13 Из `services/frontend` запустить `npm run build`
- [ ] 4.14 Проверить frontend tests против behavior diff: MSW/no live calls, anonymous/authenticated, scopes, guarded writes, 401/403, validation/generic error
- [ ] 4.15 Проверить pagination initial/page/page-size/reset offset, group filter/sort/nullable selector и column order
- [ ] 4.16 Выполнить `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` и review API boundary
- [ ] 4.17 Выполнить `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'`
- [ ] 4.18 Выполнить `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'`
- [ ] 4.19 Выполнить `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'` и `find ... shared/widgets/entities`; подтвердить no mixing/FSD
- [ ] 4.20 Проверить Manual QA evidence для desktop/tablet/mobile, permissions/errors/page refresh и отсутствие overlap
- [ ] 4.21 Записать единый Quality Gate report в `docs/reports` с findings/severity/commands/evidence
- [ ] 4.22 Вернуть findings владельцам, дождаться fixes и повторить весь затронутый общий review до clean gate
- [ ] 4.23 После clean gate синхронизировать обе delta specs в main specs через `openspec-sync-specs`
- [ ] 4.24 Повторить `openspec status --change breeds-group-048 --json` и strict validation после sync
- [ ] 4.25 Архивировать change через `openspec-archive-change` только после успешной validation и финального пользовательского/Router workflow
