## 1. Реализация UI

### Frontend

- [x] 1.1 Прочитать все `contextFiles` из `openspec instructions apply --change fix-057-user-management-bugs --json`, зафиксировать ownership `services/frontend/src/app/(protected)/users/**` и `services/frontend/src/features/user-management/**`; не менять backend и `site-*`.
- [x] 1.2 Добавить в `services/frontend/src/features/user-management/ui` локальные tabs и пользовательское/техническое documentation views по паттерну prices без cross-feature imports.
- [x] 1.3 Обновить `services/frontend/src/features/user-management/ui/UsersHeader.tsx`: tabs первой строкой, controls второй строкой, filters/actions слева, pagination справа и responsive flex-wrap.
- [x] 1.4 Обновить `services/frontend/src/app/(protected)/users/page.tsx`: управлять активной вкладкой, показывать соответствующий view и обеспечить явный gap между controls и таблицей.
- [x] 1.5 Обновить `services/frontend/src/features/user-management/ui/UserFormModal.tsx`: role options/tags показывают локализованные названия через typed lookup, controlled values остаются UUID, create/edit используют `scope_ids`.
- [x] 1.6 Обновить hook/UI состояния ролей только в назначенной user-management зоне: loading, empty, generic error, `401` и `403` должны быть различимы и не очищать форму после failed mutation.
- [x] 1.7 Добавить component tests верхней области: tabs → controls → table, gap, pagination справа, responsive wrapping и переключение documentation views.
- [x] 1.8 Добавить tests pagination/search: initial `{limit, offset}`, page change, page-size change, search/reset сбрасывают `offset=0`.
- [x] 1.9 Добавить component tests role selector: create mode, edit preload, option label, selected tag label, multiple roles, loading и empty state; отдельно доказать отсутствие отображаемого UUID.
- [x] 1.10 Добавить API-boundary/mutation tests с mocks/MSW: role-list success/empty/generic error/`401`/`403`, create/update validation error, Protected Write denial, UUID `scope_ids`, success refresh/invalidation и double-submit guard; live backend calls запрещены.
- [x] 1.11 Добавить access tests: anonymous redirect/block `/users`, authenticated render для USER_MANAGER/SUPERUSER, scope missing, hidden/disabled/guarded mutation actions и отображение backend `401/403`.
- [x] 1.12 Выполнить frontend self-check отсутствия `site-*` mixing и прямых API-вызовов из page/components командами `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'`, `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'`, `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'`, `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'` и `find services/frontend/src -maxdepth 2 -type d \\( -name shared -o -name widgets -o -name entities \\)`; приложить вывод к deliverable.
- [x] 1.13 Выполнить Manual QA steps из `design.md` на desktop/tablet/mobile и вернуть passed/failed evidence, screenshots для failed responsive/error/permission cases и status/body для failed API cases.
- [x] 1.14 Из `services/frontend` выполнить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; исправить ошибки в ownership-зоне и вернуть команды/результаты Router.

## 2. Общая проверка и завершение change

### Quality Gate

- [x] 2.1 После завершения Frontend deliverable проверить совокупный diff на соответствие proposal/design/delta spec, ownership и отсутствие backend/`site-*` изменений.
- [x] 2.2 Проверить access matrix: anonymous/authenticated, USER_MANAGER/SUPERUSER, scope missing, Protected Write UX и surfaced `401/403`; убедиться, что endpoint policy не изменена.
- [x] 2.3 Оценить качество tests относительно behavior diff: MSW/mocks без live backend calls, UUID/name role mapping, success/empty/error, pagination `limit/offset`, reset offset, responsive и double-submit.
- [x] 2.4 Из `services/frontend` повторно выполнить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` и обязательные `rg`/`find` checks из задачи 1.12.
- [x] 2.5 Проверить Manual QA evidence; findings вернуть владельцу Frontend, дождаться исправлений и повторить единый общий review до успешного результата.
- [x] 2.6 Сохранить итоговый Quality Gate evidence в `docs/reports/` с командами, результатами, access/scopes выводами и оставшимися gaps.
- [x] 2.7 После успешного Quality Gate синхронизировать delta `user-management-ui` в main specs, выполнить strict validation и только затем архивировать change.
