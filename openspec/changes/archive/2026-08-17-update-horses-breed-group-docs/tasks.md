## 1. Frontend deliverable — синхронизация встроенной документации

### Frontend

- [x] 1.1 Frontend owner: прочитать все `contextFiles` из `openspec instructions apply --change update-horses-breed-group-docs --json`, принять единоличный ownership `HorsesUserDocumentationView*` и `HorsesDeveloperDocumentationView*`, не менять backend/specs/`site-*`
- [x] 1.2 В `HorsesUserDocumentationView.tsx` добавить группы пород во вводный обзор и отдельный раздел перед породами; последовательно обновить нумерацию всех следующих верхнеуровневых разделов
- [x] 1.3 В пользовательском разделе групп описать назначение справочника, таблицу, поиск/сортировку/пагинацию, create/update/delete, Page Editor без фото и scope/error behavior
- [x] 1.4 В пользовательском разделе групп явно описать, что удаление группы сохраняет породы, очищает связь и приводит к отображению «—»
- [x] 1.5 В пользовательском разделе пород добавить поле/колонку «Группа», assign/clear workflow, multi-select filter и sort по имени группы
- [x] 1.6 Создать `HorsesUserDocumentationView.test.tsx`: проверить overview и порядок «Группы пород» перед «Породы»
- [x] 1.7 Test: user docs фиксирует таблицу/CRUD/Page Editor без фото, permissions/errors и pagination/filter/sort workflow групп
- [x] 1.8 Test: user docs фиксирует assign/clear группы у породы, multi-select/sort и сохранение породы с «—» после удаления группы
- [x] 1.9 В `HorsesDeveloperDocumentationView.tsx` добавить `breed_groups` в overview, отдельный раздел `/api/horses/breed-groups` перед породами и последовательно обновить нумерацию
- [x] 1.10 Документировать group list/detail endpoint-ы, slug-or-UUID lookup, `page_data=true`, pagination/text/query/sort параметры и допустимые сортировки
- [x] 1.11 Документировать group POST/PATCH/DELETE, `name`/`slug`/`page_data`, auto-slug, partial PATCH, response DTO и curl-примеры
- [x] 1.12 Документировать access contract групп: selector header, GET Public Read, missing/invalid selector `401`, Protected Write, anonymous `401`, insufficient permission `403`, разрешённые роли
- [x] 1.13 Расширить developer-раздел пород: repeatable `breed_group_ids`, `group_name/-group_name`, nullable `breed_group_id`, nested nullable `group`, omitted-vs-null PATCH и `SET NULL`
- [x] 1.14 Создать `HorsesDeveloperDocumentationView.test.tsx`: проверить overview, порядок разделов и все list/detail/create/update/delete paths групп
- [x] 1.15 Test: developer docs фиксирует query/sort/body/response tokens, `page_data`, auto-slug и partial PATCH
- [x] 1.16 Test: developer docs фиксирует selector, Public Read/Protected Write, роли и `401/403`
- [x] 1.17 Test: developer docs фиксирует `breed_group_ids`, `group_name`, `breed_group_id`, nested `group`, omitted-vs-null и `SET NULL`
- [x] 1.18 Запустить scoped documentation tests и убедиться, что component tests не выполняют live backend calls
- [x] 1.19 Выполнить frontend self-check: `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` и проверить отсутствие новых runtime calls вне API boundary
- [x] 1.20 Выполнить frontend self-check: `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'` и подтвердить отсутствие API imports в documentation views
- [x] 1.21 Выполнить no-mixing checks: `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'` и `find services/frontend/src -maxdepth 2 -type d \( -name shared -o -name widgets -o -name entities \)`

## 2. Единый review, browser QA и завершение change

### Quality Gate

- [x] 2.1 Quality Gate owner: после frontend deliverable проверить общий diff, ownership, соответствие proposal/design/spec и отсутствие backend/route/scope/API behavior changes
- [x] 2.2 Сверить пользовательский текст с фактическими group/breed UI: columns, CRUD, Page Editor без фото, filter/sort/paging, assign/clear и delete-to-«—» semantics
- [x] 2.3 Сверить developer-текст с `horseBreedGroups.ts`, `horseBreeds.ts`, API files и `breeds-group-048`: paths, query, DTO, sorts, nested group и nullable semantics
- [x] 2.4 Проверить access matrix: GET + selector, missing/invalid selector `401`, writes anonymous `401`, insufficient permission `403`, роли; подтвердить, что endpoints не менялись
- [x] 2.5 Проверить качество component tests по behavior diff, отсутствие brittle full snapshots и live backend calls
- [x] 2.6 Из `services/frontend` запустить `npm test`
- [x] 2.7 Из `services/frontend` запустить `npm run lint`
- [x] 2.8 Из `services/frontend` запустить `npx tsc --noEmit`
- [x] 2.9 Из `services/frontend` запустить `npm run build`
- [x] 2.10 Повторить `rg`/`find` architecture checks из tasks 1.19–1.21 и подтвердить no `site-*` mixing
- [ ] 2.11 Deferred by user-approved platform waiver (не passed): Browser QA anonymous `/horses` blocked/redirected; ADMIN видит «Инструкцию», но без developer scope не видит «Документацию»
- [ ] 2.12 Deferred by user-approved platform waiver (не passed): Browser QA DEVELOPER/SUPERUSER видит обе вкладки; проверить порядок, полноту user workflow и developer contract
- [ ] 2.13 Deferred by user-approved platform waiver (не passed): Browser QA отсутствие новых Network requests при чтении документации и фиксация unexpected method/path/status/body при failure
- [ ] 2.14 Deferred by user-approved platform waiver (не passed): Browser QA обеих вкладок на desktop 1440×900, tablet 768×1024, mobile 390×844 без overlap/обрезания tabs, текста, таблиц и code blocks
- [ ] 2.15 Deferred by user-approved platform waiver (не passed): browser regression остальных tabs раздела «Лошади»; отсутствие consumer-code/link mixing подтверждено automation/source review, но не browser flow
- [x] 2.16 Записать единый report `docs/reports/update-horses-breed-group-docs-review.md` с passed/failed steps, командами и evidence; screenshots приложить для failed responsive/access/content cases
- [x] 2.16a Зафиксировать platform evidence (`No browser is available`, browsers `[]`), выполненный troubleshooting, явное решение пользователя «Пока недоступно, закрывай так», deferred checks и residual accepted risk; не отмечать 2.11–2.15 выполненными
- [x] 2.16b Повторный Quality Gate: при зелёных automation/content/access/architecture/validation checks и отсутствии иных blockers выставить `APPROVED WITH ACCEPTED RISK`; сохранить рекомендацию выполнить 2.11–2.15 при появлении Browser/Computer use
- [x] 2.17 Вернуть findings Frontend owner, дождаться fixes и повторить весь затронутый общий review до clean gate
- [x] 2.18 После clean gate либо `APPROVED WITH ACCEPTED RISK` синхронизировать delta spec в main specs через `openspec-sync-specs`
- [x] 2.19 Повторить `openspec status --change update-horses-breed-group-docs --json` и strict validation после sync
- [x] 2.20 Архивировать change через `openspec-archive-change` только после успешной validation и финального Router workflow
