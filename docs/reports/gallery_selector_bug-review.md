# Review: gallery_selector_bug

**Статус: ✅ APPROVED**  
**Дата:** 2026-05-17  
**Сервис:** `services/frontend`

## Итог

Frontend bugfix соответствует плану `docs/plans/bugfix/gallery_selector_bug.md` и задаче `docs/tasks/gallery_selector_bug.md`.

Ключевые проверки:

- `PhotoSelectorModal` остаётся общей фичей и получил явный contract prop `supportsMainPhoto`.
- Для `prices/news` main-photo flow сохраняет полный payload `{ photo_ids, main }`.
- Для `horses` main-photo action скрыт, поэтому frontend не отправляет неподдерживаемый `{ main }`.
- `horsePhotosUpdate` типизирован как `HorseOutDto`, а horse modal обновляет `selectedHorse` после успешной mutation.
- Runtime-код `site-*` / Public Read consumer contour не затронут.

## Изменённые файлы

- `services/frontend/src/api/horses.ts`
- `services/frontend/src/app/(protected)/horses/page.tsx`
- `services/frontend/src/features/horses/hooks/useHorses.ts`
- `services/frontend/src/features/horses/services/horseService.ts`
- `services/frontend/src/features/photoSelector/hooks/usePhotoSelector.ts`
- `services/frontend/src/features/photoSelector/ui/PhotoElement.tsx`
- `services/frontend/src/features/photoSelector/ui/PhotoSelectorModal.tsx`
- `services/frontend/src/test/setup.ts`
- `services/frontend/src/features/horses/hooks/useHorses.test.ts`
- `services/frontend/src/features/photoSelector/ui/PhotoSelectorModal.test.tsx`

Отдельно учтено: `services/frontend/src/api/api-boundary.test.ts` уже был modified в nested frontend repo. Изменения в нём проверены как дополнительные API/auth boundary tests, но не считаются основным evidence для gallery selector bugfix.

## Рекомендуемая ветка

`bugfix/gallery-selector-bug`

## Frontend Test Gate

### Required commands

| Команда | Результат |
|---|---|
| `npm test` | ✅ 16 files passed, 157 tests passed, 0 failed. Есть повторяющиеся jsdom warnings `Window's getComputedStyle() method: with pseudo-elements`, exit code 0. |
| `npm run lint` | ✅ 0 errors, 15 warnings в существующих unrelated files. |
| `npx tsc --noEmit` | ✅ без ошибок. |
| `npm run build` | ✅ production build successful. Next build skips own lint/type validation by config, поэтому lint и type-check проверены отдельными командами выше. |
| `git -C services/frontend diff --check` | ✅ без whitespace/errors. |

### Required self-checks

| Команда | Ручная оценка |
|---|---|
| `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` | ✅ Direct `fetch` только в `src/api/client.ts`, `src/api/auth.ts` и developer documentation examples. Новых прямых runtime fetch в feature UI нет. |
| `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'` | ✅ Feature runtime imports идут через service layer. `src/app` имеет существующие auth imports в login/layout. В новом bugfix API import добавлен/оставлен только в tests/service boundary, не в UI. |
| `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'` | ✅ Horse/gallery selector diff не вводит page-based pagination. Horse tests подтверждают `limit/offset` и отсутствие `page`. Existing `news` page API не относится к этому diff. |
| `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'` | ✅ Нет смешивания с `site-*`; найден только текст в developer documentation view. |
| `find services/frontend/src -maxdepth 2 -type d \( -name shared -o -name widgets -o -name entities \)` | ✅ Legacy FSD dirs не созданы. |

### Test quality review

- ✅ `PhotoSelectorModal.test.tsx` покрывает add-photo payload с полным `photo_ids`, set-main payload `{ photo_ids, main }`, скрытие main action для unsupported entity contract и отсутствие UUID в image alt.
- ✅ `useHorses.test.ts` обновлён под реальный backend contract: `POST /horses/:id/photos` возвращает `HorseOutDto`, error path для 400 сохранён.
- ✅ Tests используют Vitest, React Testing Library, user-event, jsdom/MSW helpers из `src/test`; live backend calls не требуются.
- ✅ Для изменённого Protected Write UX по horses проверено, что unsupported main action скрыт на UI уровне, а API boundary не требует `{ main }`.

Residual risk: page-level behavior `selectedHorse` update после mutation проверен через code review, но отдельного page component test нет. Для текущего scoped bugfix это не блокер, потому что hook/API/modal contract покрыты unit/component tests, а full command gate зелёный.

## Архитектура

- ✅ Runtime UI не импортирует API boundary напрямую для новой логики; horse page использует hooks/services.
- ✅ Shared `features/photoSelector` сохранён, entity-specific backend difference вынесен в явный prop `supportsMainPhoto`.
- ✅ `services/frontend` не импортирует `site-*` consumer code.
- ✅ Backend/API contracts не изменялись.

## Access Verification Results

| Endpoint / flow | Access class | Проверка |
|---|---|---|
| `POST /api/horses/{id}/photos` | Protected Write | ✅ Frontend отправляет только supported `photo_ids`; main action для horses скрыт. MSW tests покрывают success и 400 error surface. |
| `POST /api/prices/{id}/photos`, `POST /api/news/{id}/photos` | Protected Write | ✅ Shared selector для supported entities отправляет `{ photo_ids, main }`, не ломая full-context update contract. |
| `GET /api/photos` through selector | Protected CMS read context | ✅ API вызов остаётся через `galleryService` / `usePhotoSelector`; direct feature fetch не добавлен. |
| `site-*` Public Read | Consumer contour | ✅ Не затронут; смешивания CMS frontend и public consumer scope не найдено. |

Anonymous/authenticated live checks не запускались: это frontend-only diff без backend endpoint изменений, а переданный план не содержит SMOKE-секции с конкретными сценариями и переменными.

## SMOKE-тесты

`.claude/skills/api-smoke-test/SKILL.md` прочитан. Skill доступен, но неприменим для этого Quality Gate:

- план `docs/plans/bugfix/gallery_selector_bug.md` не содержит секции `SMOKE` / `### SMOKE-тесты на реальном API`;
- runtime backend endpoints и access policy на backend не менялись;
- задача явно допускает фиксацию неприменимости smoke для frontend-only diff без backend endpoint change.

| # | Endpoint | Method | HTTP | Time | Результат |
|---|---|---|---|---|---|
| N/A | frontend-only bugfix | N/A | N/A | N/A | ✅ Не применимо; покрыто frontend command gate + MSW/API boundary tests |

## Findings

Блокирующих findings нет.

Неблокирующие замечания:

1. `npm test` выводит jsdom warnings по `getComputedStyle(..., pseudo-elements)`. Команда проходит успешно; можно отдельно замокать/подавить noise в test setup.
2. `npm run lint` сохраняет 15 существующих warnings в unrelated files. В изменённом bugfix scope ошибок lint нет.

## Финальный статус

✅ APPROVED. Diff готов к merge после обычного контроля ветки/PR.
