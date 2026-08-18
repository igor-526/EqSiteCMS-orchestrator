## Чеклист

### Backend

- [x] 1.1 Прочитать `proposal.md`, `design.md`, delta spec, `docs/tasks/011_horse_pedigree_management.md` и назначить одному Backend-владельцу production/test paths; продолжать до завершённого deliverable без ожидания инструкций при отсутствии блокера
- [x] 1.2 В `services/backend/src/repositories/horse_repository.py` удалить breed-kind lookup и `kind`/`breed_id_is_null` filters только из `get_available_sires`
- [x] 1.3 В `services/backend/src/repositories/horse_repository.py` удалить breed-kind lookup и `kind`/`breed_id_is_null` filters только из `get_available_dams`
- [x] 1.4 В `services/backend/src/repositories/horse_repository.py` удалить breed-kind lookup и `kind`/`breed_id_is_null` filters только из `get_available_children`
- [x] 1.5 Удалить pedigree-only repository helper `_get_breed_kind_for_horse`, подтвердив `rg`, что глобальные horse list kind filter/sort не затронуты
- [x] 1.6 В `services/backend/src/core/services/horse.py` удалить загрузку `breed_kinds` из `set_horse_pedigree`
- [x] 1.7 Удалить параметры/comparisons kind из `_validate_parent_candidate`, сохранив self, relation, sex и date/death checks
- [x] 1.8 Удалить параметры/comparisons kind из `_validate_child_candidate`, сохранив self, relation, duplicate и date/death checks
- [x] 1.9 Удалить service helpers breed-kind только если `rg` подтверждает отсутствие непedigree usages; не менять обычные horse/breed flows и DTO
- [x] 1.10 Проверить Access matrix: GET Public Read; POST Protected Write для `SUPERUSER`, `ADMIN`, `DEVELOPER`; исключений нет
- [x] 1.11 Найти PostgreSQL container по labels, fallback `eqsitecms-db`/postgres, и получить env/host port повторным `docker inspect` без хардкода
- [x] 1.12 Unit: GET sire не передаёт `kind` при совпадающих kind (U-01)
- [x] 1.13 Unit: GET sire допускает кандидата другого `breed.kind` (U-02)
- [x] 1.14 Unit: GET sire допускает target без породы и candidate с породой (U-03)
- [x] 1.15 Unit: GET sire допускает target с породой и candidate без породы (U-04)
- [x] 1.16 Unit: GET dam допускает другой `breed.kind` (U-05)
- [x] 1.17 Unit: GET dam допускает разные конкретные породы одинакового kind (U-06)
- [x] 1.18 Unit: GET children допускает другой `breed.kind` (U-07)
- [x] 1.19 Unit: GET children допускает mixed nullable/non-null breed (U-08)
- [x] 1.20 Unit: GET sire сохраняет male filter (U-09)
- [x] 1.21 Unit: GET dam сохраняет female и date/death filters (U-10)
- [x] 1.22 Unit: GET children сохраняет birth/death filters (U-11)
- [x] 1.23 Unit: GET children сохраняет occupied-parent-slot exclusion (U-12)
- [x] 1.24 Unit: GET сохраняет self/current immediate relations exclusions (U-13)
- [x] 1.25 Unit: GET сохраняет search, sort, limit/offset (U-14)
- [x] 1.26 Unit: GET repository не выполняет отдельный breed-kind query (U-15)
- [x] 1.27 Unit: POST sire другого kind принимается (U-16)
- [x] 1.28 Unit: POST dam другого kind принимается (U-17)
- [x] 1.29 Unit: POST child другого kind принимается (U-18)
- [x] 1.30 Unit: POST target без breed и parent с breed принимается (U-19)
- [x] 1.31 Unit: POST target с breed и child без breed принимается (U-20)
- [x] 1.32 Unit: POST не обращается к breed repository (U-21)
- [x] 1.33 Unit: POST father wrong sex отклоняется (U-22)
- [x] 1.34 Unit: POST mother wrong sex отклоняется (U-23)
- [x] 1.35 Unit: POST parent с невалидной датой отклоняется (U-24)
- [x] 1.36 Unit: POST child с невалидной датой отклоняется (U-25)
- [x] 1.37 Unit: POST maternal death constraint сохраняется (U-26)
- [x] 1.38 Unit: POST self-link отклоняется (U-27)
- [x] 1.39 Unit: POST parent/foal immediate conflict отклоняется (U-28)
- [x] 1.40 Unit: POST duplicate foals и partial clear semantics проверены (U-29)
- [x] 1.41 Unit: POST anonymous/без scope отклоняется до write, валидный scope успешен (U-30)
- [x] 1.42 Smoke: на реальной PostgreSQL anonymous GET sire с selector → 200 (SM-01)
- [x] 1.43 Smoke: на реальной PostgreSQL anonymous GET dam с selector → 200 (SM-02)
- [x] 1.44 Smoke: на реальной PostgreSQL anonymous GET children с selector → 200 (SM-03)
- [x] 1.45 Smoke: на реальной PostgreSQL GET без selector → 401 (SM-04)
- [x] 1.46 Smoke: на реальной PostgreSQL GET invalid selector → 401 (SM-05)
- [x] 1.47 Smoke: на реальной PostgreSQL authenticated GET → 200 (SM-06)
- [x] 1.48 Smoke: на реальной PostgreSQL GET sire содержит male другого kind (SM-07)
- [x] 1.49 Smoke: на реальной PostgreSQL GET sire содержит другую конкретную породу (SM-08)
- [x] 1.50 Smoke: на реальной PostgreSQL GET sire содержит подходящего male без breed (SM-09)
- [x] 1.51 Smoke: на реальной PostgreSQL GET dam содержит female другого kind (SM-10)
- [x] 1.52 Smoke: на реальной PostgreSQL GET dam содержит подходящую female без breed (SM-11)
- [x] 1.53 Smoke: на реальной PostgreSQL GET children содержит horse другого kind (SM-12)
- [x] 1.54 Smoke: на реальной PostgreSQL GET children содержит horse без breed (SM-13)
- [x] 1.55 Smoke: на реальной PostgreSQL GET исключает target/self (SM-14)
- [x] 1.56 Smoke: на реальной PostgreSQL GET исключает current immediate relations (SM-15)
- [x] 1.57 Smoke: на реальной PostgreSQL GET сохраняет sex/date/death restrictions (SM-16)
- [x] 1.58 Smoke: на реальной PostgreSQL GET search находит cross-breed candidate (SM-17)
- [x] 1.59 Smoke: на реальной PostgreSQL GET limit/offset/total стабильны (SM-18)
- [x] 1.60 Smoke: на реальной PostgreSQL anonymous POST → 401 без mutation (SM-19)
- [x] 1.61 Smoke: на реальной PostgreSQL POST без scope → 403 без mutation (SM-20)
- [x] 1.62 Smoke: на реальной PostgreSQL POST sire другого kind → 204 и persisted relation (SM-21)
- [x] 1.63 Smoke: на реальной PostgreSQL POST dam другого kind → 204 и persisted relation (SM-22)
- [x] 1.64 Smoke: на реальной PostgreSQL POST child другого kind → 204 и persisted relation (SM-23)
- [x] 1.65 Smoke: на реальной PostgreSQL POST parent с/без breed при противоположном target state → 204 (SM-24)
- [x] 1.66 Smoke: на реальной PostgreSQL POST child с/без breed при противоположном target state → 204 (SM-25)
- [x] 1.67 Smoke: на реальной PostgreSQL wrong-sex parent отклонён без partial write (SM-26)
- [x] 1.68 Smoke: на реальной PostgreSQL invalid dates отклонены без partial write (SM-27)
- [x] 1.69 Smoke: на реальной PostgreSQL self/immediate conflict отклонён (SM-28)
- [x] 1.70 Smoke: на реальной PostgreSQL null/empty clear → 204 и relations удалены (SM-29)
- [x] 1.71 Smoke: на реальной PostgreSQL foreign tenant не связывается/не раскрывается; cleanup удаляет test rows (SM-30)
- [x] 1.72 Запустить targeted unit/repository/API tests и полный применимый backend test suite; приложить команды и результаты
- [x] 1.73 Выполнить `rg` regression: breed/kind отсутствуют в pedigree validation/query path, но остаются в обычной horse filtering/classification

### Frontend

- [x] 2.1 Подтвердить отсутствующий frontend behavior diff: API shape и UI не меняются, frontend-файлы не редактировать

### Quality Gate

- [x] 3.1 Прочитать все OpenSpec contextFiles и провести единый review полного diff после Backend deliverable; не ждать дополнительных инструкций без конкретного блокера
- [x] 3.2 Проверить Clean Architecture и ownership: только backend pedigree production/tests, без schema/migration/frontend/site/NATS изменений
- [x] 3.3 Проверить, что GET не содержит `kind`/`breed_id_is_null`/breed lookup, а глобальные horse list kind filter/sort сохранены
- [x] 3.4 Проверить, что POST не загружает/сравнивает breed, а все non-breed validators сохранены
- [x] 3.5 Проверить Access matrix и anonymous/authenticated scenarios: Public Read GET, Protected Write POST, `401`/`403`, foreign tenant
- [x] 3.6 Проверить минимум 30 разнообразных Unit scenarios U-01..U-30 и качество assertions относительно behavior diff
- [x] 3.7 Проверить минимум 30 разнообразных Smoke scenarios SM-01..SM-30 на живом API и реальной PostgreSQL, не pytest smoke files
- [x] 3.8 Повторить DB discovery/`docker inspect`; сверить использование актуальных env/host port без хардкода credentials
- [x] 3.9 Запустить targeted и полный применимый backend test suite, сохранить evidence в `docs/reports`
- [x] 3.10 Запустить smoke skill по таблице SM-01..SM-30, сохранить request/status/body и DB evidence в `docs/reports`
- [x] 3.11 Вернуть findings Backend-владельцу, дождаться fixes и повторить единый Quality Gate до отсутствия блокирующих findings
- [x] 3.12 После успешного gate синхронизировать delta spec в main specs, выполнить strict validation и только затем архивировать change
