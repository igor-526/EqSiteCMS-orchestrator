# Quality Gate: callback requests header vertical scroll

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-25

## Scope и diff

- Проверены только `services/frontend/src/features/callbackRequests/ui/CallbackRequestsPage.tsx` и `CallbackRequestsPage.test.tsx`.
- Правка заменяет `overflow-x: auto` на явную пару `overflow-x-auto overflow-y-hidden`; тест фиксирует оба класса.
- OpenSpec, backend и `site-*` этой правкой не изменялись. Посторонние изменения корневого worktree (changes 054/056/057) не относятся к этому review и не модифицировались.

## Frontend test gate

- `npm test -- --run`: 61 files, **507 passed**, 0 failed.
- Focused `CallbackRequestsPage.test.tsx`: **8 passed**, 0 failed.
- `npm run lint`: 0 errors, 432 существующих warnings; в затронутом diff новых lint findings нет.
- `npx tsc --noEmit`: успешно после завершения build (первый параллельный запуск конфликтовал с обновлением `.next/types`).
- `npm run build`: успешно, `/callback-requests` собран.
- Self-checks: API boundary сохранён; callback API импортируется через feature service; pagination остаётся `limit/offset`; `site-*` mixing и новые legacy FSD directories отсутствуют.
- Access/API/SMOKE: неприменимо — route guards, permissions, API contracts и runtime API не менялись.

## Chrome QA

Пересобран и recreated только контейнер `frontend`; остальные runtime-сервисы не затрагивались.

На 1440×900, 768×1024 и 390×844:

- actions DOM содержит `overflow-x-auto overflow-y-hidden`;
- computed style: `overflow-x: auto`, `overflow-y: hidden`;
- вертикальной полосы прокрутки нет; `scrollTop=0`, document horizontal overflow отсутствует;
- tabs/actions сохраняют desktop/tablet layout, на mobile header корректно переносится на две строки;
- pagination и красная кнопка «Сбросить» полностью видимы и не перекрываются;
- page-size dropdown открыт и полностью отображается через portal, без clipping;
- «Сбросить» срабатывает; Chrome console errors отсутствуют;
- live dataset содержит одну страницу, поэтому page-2 interaction неприменим; mapping pagination покрыт unit-тестом.

## Итог

Blocking findings отсутствуют. Точечная правка устраняет вертикальный scrollbar, сохраняет горизонтальный overflow как fallback и не расширяет scope.
