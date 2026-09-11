# Review: 070 — INLOVE static pages

**Статус: ✅ APPROVED**  
**Дата:** 2026-09-10  
**Рекомендуемая ветка:** `070_inlove_static_pages`

## Итог

Реализация соответствует подтверждённому OpenSpec change и уточнению note070. Backend сохраняет стабильный tenant-scoped slug, Public Read news detail и прежний защищённый CMS-контракт. Site рендерит главную, `/about`, архив и detail новостей на сервере, использует актуальные settings и три seed news. Все применимые lanes завершены без открытых blocking findings.

Первичные frontend findings по typography, контрасту дат/hero и mobile gallery swipe устранены в `SC-N4/SC-N5`; повторный `QG-NFE` прошёл. Первичные contracts findings по старым критериям и seed drift repair устранены в `DOC-N1-FIX/DATA-N1-FIX`; адресный contracts rerun и strict validation прошли.

## Ссылки

- Задача: [`docs/tasks/070_inlove_static_pages.md`](../tasks/070_inlove_static_pages.md)
- OpenSpec: [`proposal.md`](../../openspec/changes/inlove-static-pages/proposal.md), [`design.md`](../../openspec/changes/inlove-static-pages/design.md), [`tasks.md`](../../openspec/changes/inlove-static-pages/tasks.md)
- Delta specs: [`news-public-slugs`](../../openspec/changes/inlove-static-pages/specs/news-public-slugs/spec.md), [`inlove-content-pages`](../../openspec/changes/inlove-static-pages/specs/inlove-content-pages/spec.md), [`inlove-news-pages`](../../openspec/changes/inlove-static-pages/specs/inlove-news-pages/spec.md), [`inlove-placeholder-pages`](../../openspec/changes/inlove-static-pages/specs/inlove-placeholder-pages/spec.md)
- Approval: явный Apply от пользователя зафиксирован в `proposal.md`; note070 также явно авторизован и не требует отдельного approval.

## Lanes

| Lane | Статус | Evidence |
|---|---|---|
| `QG-BE` | пройден | `1398 passed, 5 skipped`; `make lint` PASS; архитектура, миграция и A1–A9 без findings |
| `QG-FE` | пройден после fixes | финальный `QG-NFE`: 31 test files, 207 tests PASS; lint 0 errors; typecheck/build PASS; NOTE-01..05 и real-browser QA PASS |
| `QG-CONTRACTS` | пройден после fixes | старые criteria и seed drift исправлены; targeted rerun и OpenSpec strict validation PASS; access matrix согласована |
| `QG-LIVE` | пройден | real PostgreSQL migration PASS; real API 69/69 curl checks PASS; real SSR/API/browser SM-01..07 PASS; cleanup PASS |
| NATS / AsyncAPI | неприменимо | change не меняет messaging subjects, payloads или AsyncAPI; NATS не входит в scope |

## Покрытие test matrix

| IDs | Фактическое покрытие | Статус |
|---|---|---|
| `UT-BE-01..03` | migration/schema tests: backfill, frozen/runtime slug, tenant unique, downgrade preservation | покрыто |
| `UT-BE-04..07` | news domain/service/repository tests: create, immutable slug, visibility, ordering и DB errors | покрыто |
| `UT-BE-08..12` | API tests A1–A9: anonymous/authenticated, selector, isolation, scopes, UUID regression, 400/422 | покрыто |
| `UT-SC-01..04` | API boundary/loaders, request memoization и server sanitizer | покрыто |
| `UT-SC-05..06` | home/about SSR, partial failures, settings, gallery selection, отсутствие удалённых price/payment/privacy блоков | покрыто |
| `UT-SC-07..10` | server pagination/archive/detail, metadata/canonical, 404/upstream failures | покрыто |
| `UT-SC-11` | route tree, четыре placeholders, shared chrome и callback regression | покрыто |
| `UI-01..04` | 375/768/1440, no-JS, long/empty/error, keyboard/focus, gallery, reduced motion, AA и overflow | покрыто browser QA |
| `NOTE-01..05` | hero/cards, contacts/map, settings about, typography/contrast и touch gallery | покрыто финальным `QG-NFE` |
| `NOTE-06` | ровно три published seed news, full detail/stable slug, about readback, repeat/drift/foreign safety | покрыто DATA fixes и live SSR |
| `SM-01..04` | Public Read и CMS access matrix на real API | выполнено |
| `SM-05` | real PostgreSQL upgrade/downgrade/backfill/unique и concurrent create | выполнено |
| `SM-06` | rename/content/soft-delete stability на real API | выполнено |
| `SM-07` | real backend + site SSR archive/detail/missing route | выполнено |

Непокрытых ID нет. Page-size/filter/search reset неприменим: таких UI controls нет, фиксированный `limit=12` покрывает `UT-SC-07`. CMS frontend permission UI неприменим: change затрагивает public `site-ksk-inlove`, а не `services/frontend`.

## Unit / integration verification

| Контур | Команда | Результат |
|---|---|---|
| Backend | `make test` | 1398 passed, 5 skipped, 0 failed |
| Backend | `make lint` | PASS |
| Site | `npm test` | 31 files, 207 tests passed |
| Site | `npm run lint` | 0 errors; 2 прежних `no-img-element` warnings |
| Site | `npx tsc --noEmit` | PASS |
| Site | `npm run build` | PASS; dynamic SSR routes собраны |
| OpenSpec | `openspec validate inlove-static-pages --type change --strict` | PASS |

## Frontend test gate

Gate выполнен в `services/site-ksk-inlove`, поскольку runtime UI diff относится к public Site Consumer. Тесты проверяют data boundary, SSR states, sanitizer, pagination/detail, metadata, callback, gallery, contacts/map и responsive/a11y behavior. Real-browser прогон подтвердил home/about/news на 375/768/1440, отсутствие horizontal overflow, работу без JavaScript, карту, callback и три seed detail.

Прежние findings закрыты:

- computed hero typography исправлена;
- контраст дат и hero соответствует AA;
- fallback hero остаётся читаемым;
- touch swipe галереи, keyboard navigation и reduced motion работают.

## SMOKE-тесты

### Real API — SM-01..06

`69/69` HTTP checks прошли на backend `:8001`; cleanup fixture tenant/users/news подтвердил остаток `0`.

| Endpoint group | Ожидаемые статусы | Curl min–max |
|---|---|---:|
| `GET /api/news` | 200/401 | 1.85–21.02 ms |
| `GET /api/news/{uuid}` | 200/401/404 | 1.58–25.94 ms |
| `GET /api/news/by-slug/{slug}` | 200/401/404 | 1.49–38.84 ms |
| `GET /api/news-cms` | 200/401/403 | 3.32–24.58 ms |
| `POST /api/news` | 201/400/401/403/422 | 2.08–45.54 ms |
| `PATCH /api/news/{uuid}` | 200/400/401/403/422 | 2.72–40.85 ms |
| `DELETE /api/news/{uuid}` | 204/400/401/403 | 1.71–30.67 ms |

Concurrent same-title create вернул два `201` с разными slug. Rename сохранил slug; PATCH обновил full content; soft delete закрыл UUID и slug routes.

### Real PostgreSQL — SM-05

В отдельной временной PostgreSQL 16 DB выполнены upgrade/backfill/constraints/downgrade/re-upgrade:

- upgrade до parent: 0.638 s;
- target upgrade: 0.065 s;
- downgrade: 0.028 s;
- 7/7 fixtures сохранили UUID/content и получили стабильный ASCII slug длиной не более 160;
- `NOT NULL` и same-tenant unique отклоняют нарушения, cross-tenant одинаковый slug допустим;
- повторный upgrade дал те же 7/7 slug;
- временная DB удалена и её отсутствие подтверждено.

### Real SSR — SM-07 / NOTE-06

| Route | HTTP | Time | Результат |
|---|---:|---:|---|
| `/` | 200 | 5.646 s | SSR home и note070 PASS |
| `/about` | 200 | 1.080 s | settings content, contacts/map, удалённые блоки отсутствуют |
| `/novosti` | 200 | 0.942 s | три seed news и slug links |
| `/novosti/inlove-070-mock-znakomstvo` | 200 | 1.156 s | full detail SSR |
| `/novosti/inlove-070-mock-pered-vizitom` | 200 | 0.214 s | full detail SSR |
| `/novosti/inlove-070-mock-mir-loshadey` | 200 | 0.158 s | full detail SSR |
| `/novosti/qg-nssr-definitely-missing-070` | 404 | 0.171 s | real missing semantics |

Runtime `:3117` остановлен после проверки; browser state очищен. Три DATA-N1 news и editorial settings сохранены как требуемые данные, временные QG fixtures очищены.

## Access verification results

| Матрица | Anonymous | Authenticated |
|---|---|---|
| A1 list | valid selector → 200 | 200, тот же public DTO |
| A2/A3 slug и UUID detail | 200/404 | 200/404 без privileged bypass |
| A4/A5 missing/invalid selector | 401 | 401 |
| A6 protected CMS GET | 401 | admin 200; no-scope 403 |
| A7 create | 401 | admin 201; no-scope 403; business 400; structural 422 |
| A8 update | 401 | own 200; no-scope 403; missing/foreign 400 |
| A9 delete | 401 | own 204; no-scope 403; missing/foreign 400 |

Public list не раскрывает full content или служебные поля; detail возвращает санитизируемый full content. Future/deleted/foreign/missing записи скрыты с 404 для anonymous и authenticated. A6 остаётся документированным исключением Protected Read.

## Изменённые зоны

| Зона | Изменения |
|---|---|
| `services/backend/src/**news**`, migration, access handler | slug storage/domain/API, public detail и access behavior |
| `services/backend/tests/unit/{api,core/services,migration}/**news**` | UT-BE-01..12 и access regression |
| `services/site-ksk-inlove/src/api`, `types`, `lib/content` | news boundary, loaders и sanitizer |
| `services/site-ksk-inlove/src/app`, `features/contentPages`, `ui` | SSR pages, archive/detail, contacts/map, gallery, responsive/a11y fixes |
| `services/site-ksk-inlove/public` | локальный hero и четыре статические service icons |
| `docs/sites/inlove` | итоговые scheme/components и обратимый seed package |
| `openspec/changes/inlove-static-pages` | approved proposal/design/specs/tasks и note070 reconciliation |

## Замечания и риски

- Два прежних lint warning `@next/next/no-img-element` остаются неблокирующими: ошибок нет, warnings не внесены этим change.
- В текущих live данных `about` нет публичных фото, поэтому live gallery неприменима; fixture/browser tests отдельно подтвердили touch swipe, keyboard/focus, SSR thumbnails и reduced motion.
- Пересечение с change 069 должно быть согласовано Planner в `SYNC-1`: актуальный 070 placeholder contract нельзя перезаписать старым delta 069. Это lifecycle dependency после APPROVED, а не finding реализации.

Blocking findings отсутствуют. Change готов к `SYNC-1`, повторной strict validation и архивированию по OpenSpec workflow.
