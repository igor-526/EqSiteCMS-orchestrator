## Чеклист

### Frontend

- [x] 1.1 **CMS Frontend owner, `services/frontend` only:** прочитать proposal/design/delta spec и референсы `src/app/(protected)/news/page.tsx`, `src/features/horses/ui/HorsesHeader.tsx`, `src/ui/MainTable.tsx`, `src/ui/TablePaginator.tsx`; не менять архив 055, backend или `site-*`.
- [x] 1.2 В `src/features/callbackRequests/ui/CallbackRequestsPage.tsx` создать responsive upper header: tabs слева, единственный paginator справа при активном табе «Заявки», с desktop same-row и безопасным wrap на tablet/mobile.
- [x] 1.3 Удалить paginator под `CallbackRequestsTable`, сохранить `pagination={false}` у таблицы и скрывать paginator на табе «Инструкция», не создавая дубликатов при переключении tabs.
- [x] 1.4 Подключить существующий `TablePaginator` через типобезопасный feature adapter либо обоснованно сохранить AntD primitive с общими page sizes; сохранить API contract только `{limit, offset}`.
- [x] 1.5 Pagination test: initial state отображает page 1 для `{limit:25, offset:0}` и корректный total.
- [x] 1.6 Pagination test: page change отправляет прежний `limit` и `offset=(page-1)*limit`, не сбрасывая выбранную страницу.
- [x] 1.7 Pagination test: page-size change отправляет новый `limit` и обязательно `offset=0` без неоднозначного двойного update.
- [x] 1.8 Pagination test: существующие filter/search/sort changes продолжают сбрасывать `offset=0`.
- [x] 1.9 Regression component test: paginator находится в DOM до таблицы и в одном верхнем header-контейнере после tabs; paginator после таблицы отсутствует.
- [x] 1.10 Regression component test: на «Инструкции» paginator отсутствует, при возврате на «Заявки» отображается ровно один control.
- [x] 1.11 Сохранить существующие tests access/error boundary: anonymous redirect/block, authenticated ADMIN/SUPERUSER render, forbidden role, scope present/missing, protected-write guards, MSW success/empty/422/500/401/403 без live backend calls.
- [x] 1.12 Выполнить no `site-*` mixing self-check: `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'`, `rg -n "from ['\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'`, `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'`, `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'`, `find services/frontend/src -maxdepth 2 -type d \\( -name shared -o -name widgets -o -name entities \\)`.
- [x] 1.13 Из `services/frontend` запустить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; вернуть path-scoped diff/evidence и сразу отметить только фактически завершённые Frontend tasks.

## Manual QA steps (UI тестирование)

- [x] 2.1 Зафиксировать предусловия: frontend/API URLs, build, ADMIN/SUPERUSER и dataset с несколькими страницами callback-заявок.
- [x] 2.2 Anonymous/permissions: проверить redirect/block без session, render для ADMIN/SUPERUSER и guarded state без callback scope; PII/paginator не должны раскрываться запрещённому пользователю.
- [x] 2.3 Desktop 1440×900: на `/callback-requests` tabs слева и единственный paginator справа в одной верхней строке перед таблицей; под/внутри таблицы paginator отсутствует.
- [x] 2.4 Pagination flow: проверить initial page, page 2/previous и page size; в network `{limit,offset}` корректны, size change даёт `offset=0`, duplicate/missing rows отсутствуют.
- [x] 2.5 Filters/search/sort: на ненулевой странице применить и очистить column filters/sort; каждый behavior сбрасывает `offset=0`, paginator и table синхронизированы.
- [x] 2.6 Tabs: на «Инструкции» paginator скрыт, после возврата на «Заявки» отображается один control с применимым сохранённым state.
- [x] 2.7 Responsive: повторить layout/navigation на tablet 768×1024 и mobile 390×844; wrap допустим, но overlap, недоступные tabs/paginator и неконтролируемый horizontal overflow отсутствуют.
- [x] 2.8 Errors/regression: проверить intercepted list `401/403/422/500`, сохранение применимого filter/page state и отсутствие регрессии status/spam scope/mutation/double-submit UX.
- [x] 2.9 Сохранить passed/failed evidence в Quality Gate report; для failed responsive/error/permission cases приложить screenshots, для API failures — method/path/status/body.

### Quality Gate

- [x] 3.1 После Frontend owner выполнить один общий path-scoped diff review: изменён только `services/frontend` и task checklist; архив 055, backend/API/access policy и `site-*` не затронуты.
- [x] 3.2 Сверить реализацию с точным паттерном «Новостей»/«Лошадей»: tabs слева, paginator в правой группе верхнего wrapping header; на desktop одна строка, на tablet/mobile без overlap.
- [x] 3.3 Проверить единственность paginator: верхний control до таблицы только на «Заявки», отсутствие нижней и встроенной table pagination, отсутствие control на «Инструкции».
- [x] 3.4 Review test quality относительно behavior diff: initial `{limit,offset}`, page change, page-size reset `offset=0`, filter/search/sort reset, DOM position, no duplicate, tab switch; без live backend calls.
- [x] 3.5 Проверить access/scopes regression и MSW coverage success/empty/422/500/401/403; CMS остаётся Protected Admin UI для ADMIN/SUPERUSER, mutations и backend denial не меняются.
- [x] 3.6 Повторить no `site-*` mixing и применимые `rg`/directory checks из task 1.12; API boundary не получает `page/pageSize/page_size` вместо `{limit,offset}`.
- [x] 3.7 Из `services/frontend` запустить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` и проверить Manual QA evidence; findings вернуть Frontend owner, дождаться исправлений и повторить единый review до PASS.
- [x] 3.8 После PASS сохранить/обновить evidence в `docs/reports`, синхронизировать delta spec в main specs, повторить strict validation и только затем архивировать change.
