## 1. Реализация

### Backend

- [x] 1.1 Повторить поиск PostgreSQL container по labels/fallback и получить актуальные DB env/host port через `docker inspect` перед smoke
- [x] 1.2 Создать Alembic revision: удалить `horse.code`, добавить nullable `horse.pedigree_name VARCHAR(63)`, документировать lossy downgrade
- [x] 1.3 Заменить `code` на `pedigree_name` в `src/models/horse.py` и `src/core/entities/horse.py`
- [x] 1.4 Заменить поле во всех create/update/out/pedigree horse DTO `src/core/schemas/horses.py`
- [x] 1.5 Обновить horse repository SQL mapping/selects для `pedigree_name`, не добавляя auth-логику в persistence
- [x] 1.6 Обновить `HorseService` create/update mapping и реализовать единый рекурсивный public effective-name projection по `EquestrianContext.source`
- [x] 1.7 Проверить list/detail/pedigree/candidate/photo/mutation response paths и удалить runtime-ссылки horse `code`
- [x] 1.8 Проверить access matrix: GET Public Read с tenant selector, writes Protected Write, cookie имеет приоритет над service key
- [x] 1.9 Unit: entity принимает `pedigree_name=None`
- [x] 1.10 Unit: entity сохраняет unicode/пробелы допустимой pedigree name по контракту
- [x] 1.11 Unit: entity/DTO принимает ровно 63 символа
- [x] 1.12 Unit: create DTO отклоняет 64 символа контрактным validation path
- [x] 1.13 Unit: update DTO отличает omitted `pedigree_name` от explicit null
- [x] 1.14 Unit: out DTO сериализует `pedigree_name` и не сериализует `code`
- [x] 1.15 Unit: SQL table содержит nullable VARCHAR(63) `pedigree_name` и не содержит `code`
- [x] 1.16 Unit: repository row mapping читает точное `pedigree_name`
- [x] 1.17 Unit: repository insert пишет `pedigree_name`
- [x] 1.18 Unit: repository update пишет explicit SQL NULL
- [x] 1.19 Unit: repository partial update без поля сохраняет прежнее значение
- [x] 1.20 Unit: service create передаёт pedigree name repository и возвращает CMS raw projection
- [x] 1.21 Unit: service update заменяет pedigree name
- [x] 1.22 Unit: service update очищает pedigree name
- [x] 1.23 Unit: service update другого поля сохраняет pedigree name
- [x] 1.24 Unit: public root с pedigree name заменяет `name` и сохраняет raw `pedigree_name` в JSON
- [x] 1.25 Unit: public root с null pedigree name оставляет основную `name` и сериализует `pedigree_name: null`
- [x] 1.26 Unit: authenticated root не заменяет `name` и отдаёт raw `pedigree_name`, включая явный JSON null без fallback
- [x] 1.27 Unit: одновременно cookie и service key выбирают authenticated projection
- [x] 1.28 Unit: public sire получает собственную effective name
- [x] 1.29 Unit: public dam с null получает собственную основную name
- [x] 1.30 Unit: public foal получает собственную effective name
- [x] 1.31 Unit: public foal parent DTO получает независимую effective name
- [x] 1.32 Unit: public candidate list преобразует каждый node независимо
- [x] 1.33 Unit: рекурсивная pedigree depth не мутирует repository entity/shared DTO
- [x] 1.34 Unit: пустая строка pedigree name обрабатывается согласно согласованному nullable/string контракту
- [x] 1.35 Unit: anonymous POST возвращает 401 до mutation
- [x] 1.36 Unit: anonymous PATCH возвращает 401 до lookup/mutation
- [x] 1.37 Unit: пользователь без scope получает 403 без mutation
- [x] 1.38 Unit: foreign tenant PATCH возвращает текущий 400 и не меняет запись
- [x] 1.39 Unit: missing tenant selector GET возвращает 401
- [x] 1.40 Unit: invalid tenant selector GET возвращает 401
- [x] 1.41 Unit: list pagination/filter/sort сохраняются после projection
- [x] 1.42 Unit: migration upgrade содержит drop code/add pedigree_name без data copy, downgrade явно структурный
- [x] 1.43 Smoke: migrations upgrade применяются на обнаруженной реальной PostgreSQL
- [x] 1.44 Smoke: schema реальной PostgreSQL содержит pedigree_name и не содержит code
- [x] 1.45 Smoke: migration не переносит прежнее значение code
- [x] 1.46 Smoke: POST с auth создаёт запись с pedigree name в PostgreSQL
- [x] 1.47 Smoke: POST без pedigree name сохраняет NULL
- [x] 1.48 Smoke: POST с 63 символами успешен
- [x] 1.49 Smoke: POST с 64 символами даёт 400 без записи
- [x] 1.50 Smoke: PATCH заменяет pedigree name в PostgreSQL
- [x] 1.51 Smoke: PATCH explicit null очищает колонку
- [x] 1.52 Smoke: PATCH omitted сохраняет колонку
- [x] 1.53 Smoke: anonymous POST возвращает 401 и не создаёт row
- [x] 1.54 Smoke: anonymous PATCH возвращает 401 и не меняет row
- [x] 1.55 Smoke: authenticated без scope POST/PATCH возвращает 403
- [x] 1.56 Smoke: foreign tenant PATCH возвращает текущий 400 и не меняет foreign row
- [x] 1.57 Smoke: public GET list с service key подставляет pedigree name в name и сохраняет поле pedigree_name в public JSON
- [x] 1.58 Smoke: public GET list fallback при NULL возвращает основную name и `pedigree_name: null`
- [x] 1.59 Smoke: public GET detail подставляет pedigree name
- [x] 1.60 Smoke: public GET detail fallback при NULL
- [x] 1.61 Smoke: public pedigree root преобразован независимо
- [x] 1.62 Smoke: public pedigree sire преобразован независимо
- [x] 1.63 Smoke: public pedigree dam fallback независим
- [x] 1.64 Smoke: public pedigree foal преобразован независимо
- [x] 1.65 Smoke: public foal parents преобразованы без рекурсивного расширения
- [x] 1.66 Smoke: public candidate endpoint преобразует каждую запись
- [x] 1.67 Smoke: cookie CMS list возвращает raw name и `pedigree_name: null` без fallback для незаполненного значения
- [x] 1.68 Smoke: cookie CMS detail возвращает raw name и `pedigree_name: null` без fallback для незаполненного значения
- [x] 1.69 Smoke: cookie CMS pedigree возвращает raw nullable значения каждого node, включая явные JSON null
- [x] 1.70 Smoke: cookie плюс spoofed service key сохраняет CMS projection
- [x] 1.71 Smoke: GET без tenant selector возвращает 401
- [x] 1.72 Smoke: GET с invalid tenant selector возвращает 401
- [x] 1.73 Smoke: GET неизвестного horse возвращает 404 без утечки tenant data
- [x] 1.74 Smoke: list limit/offset не меняются из-за projection
- [x] 1.75 Smoke: filter/sort результат и total сохраняются после projection
- [x] 1.76 Smoke: response JSON всех полных DTO не содержит horse code
- [x] 1.77 Smoke: DELETE остаётся Protected Write: anonymous 401, valid scope 204
- [x] 1.78 Smoke: rollback/upgrade цикл возвращает ожидаемую структуру с документированной потерей данных

### Frontend

- [x] 1.79 Заменить horse `code` на nullable `pedigree_name` в `src/types/api/horses.ts`
- [x] 1.80 Обновить horse create/update validators, лимит 63 и omitted/null semantics
- [x] 1.81 Обновить horse API hooks/mocks: success, null, omitted, validation/generic/401/403 без live backend calls
- [x] 1.82 Заменить колонку «Код» на «Кличка в родословной» с data/loading/empty/error tests
- [x] 1.83 Заменить поле create/edit modal и покрыть open/close, submit, validation, error, double-submit, invalidation
- [x] 1.84 Покрыть permission: scope present/missing, hidden/disabled action, mutation guard, backend 401/403
- [x] 1.85 Сохранить pagination tests: initial limit/offset, page, page size и reset offset на filter/search/sort
- [x] 1.86 Обновить CMS horse developer/user documentation и удалить устаревшее описание code
- [x] 1.87 Выполнить no `site-*` mixing self-check и подтвердить отсутствие diff `services/site-ad`
- [ ] 1.88 Выполнить Manual QA steps из design на desktop/tablet/mobile и оформить evidence

## 2. Общая проверка и завершение

### Quality Gate

- [x] 2.1 Проверить общий diff на соответствие proposal/design/specs и отсутствие незаявленных изменений
- [x] 2.2 Проверить Clean Architecture: projection в service/application boundary, repository без auth presentation logic
- [x] 2.3 Проверить access matrix и anonymous/authenticated/cookie+key/foreign-tenant outcomes
- [x] 2.4 Проверить не менее 30 разнообразных Unit и 30 Smoke сценариев backend-фичи, без однотипного наполнения
- [x] 2.5 Проверить, что smoke выполнен skill `api-smoke-test` на live API/реальной PostgreSQL с параметрами из повторного `docker inspect`, не pytest smoke files
- [x] 2.6 Запустить применимые backend unit/integration tests, lint/typecheck и Alembic upgrade/downgrade evidence
- [x] 2.7 Из `services/frontend` запустить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`
- [ ] 2.8 Проверить frontend MSW/no live calls, scopes, 401/403, pagination и Manual QA evidence
- [x] 2.9 Выполнить `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` и API-boundary review
- [x] 2.10 Выполнить `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'`
- [x] 2.11 Выполнить `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'`
- [x] 2.12 Выполнить `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'` и directory boundary check
- [x] 2.13 Проверить `rg` отсутствия runtime horse `code` в backend/frontend и отсутствие изменений `services/site-ad`
- [ ] 2.14 Вернуть findings владельцам, дождаться исправлений и повторить один общий Quality Gate до успеха
- [ ] 2.15 После успешного gate синхронизировать delta specs в main specs и выполнить strict validation
- [ ] 2.16 Только после sync/validation архивировать change и сохранить Quality Gate evidence в `docs/reports`
