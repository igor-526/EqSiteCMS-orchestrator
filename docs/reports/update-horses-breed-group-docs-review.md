# Review: update-horses-breed-group-docs

**Статус: ✅ APPROVED WITH ACCEPTED RISK**  
**Дата:** 2026-08-17

## Итог

Frontend diff локализован двумя documentation views и двумя component tests. Backend, route, scope и runtime API change отсутствуют. После REWORK описание response DTO исправлено и покрыто regression assertion; повторный автоматический frontend gate зелёный. Обновлённый approved OpenSpec формально разрешает platform-unavailable waiver-path. Пользователь явно принял выпуск без Browser QA фразой «Пока недоступно, закрывай так»; все условия waiver выполнены, иных blockers нет.

## Scope и ownership

- OpenSpec: `openspec/changes/update-horses-breed-group-docs/` (proposal, design, delta spec, tasks; пользовательский approval получен командой `apply`).
- Frontend files: `HorsesUserDocumentationView.tsx`, `HorsesDeveloperDocumentationView.tsx` и одноимённые `.test.tsx`.
- `git -C services/frontend diff --name-only` подтверждает отсутствие backend/runtime изменений; корневой worktree содержит посторонние изменения других changes, не относящиеся к этому review.
- SMOKE API: неприменимо — в scoped change отсутствует runtime API diff.

## Accepted platform exception

### Quality Gate / environment

1. **[BROWSER QA — USER-APPROVED PLATFORM WAIVER]** При повторной попытке Browser runtime после обязательной инициализации и `bootstrap-troubleshooting` сообщил `No browser is available`; `agent.browsers.list()` вернул `[]`. На текущей Arch-платформе Browser/Computer use недоступен. Пользователь явно принял ограничение и попросил закрыть работу без browser-проверки. Обновлённый approved OpenSpec разрешает `APPROVED WITH ACCEPTED RISK`, при этом browser tasks не считаются passed.

### Residual accepted risk

- Не подтверждены реальным browser-сеансом anonymous redirect и видимость вкладок для ADMIN/DEVELOPER/SUPERUSER.
- Не получено Network evidence об отсутствии запросов при чтении документации.
- Не подтверждены visual/readability/overflow на 1440×900, 768×1024 и 390×844.
- Не выполнена browser regression остальных вкладок «Лошади».
- Рекомендация: выполнить deferred Manual QA tasks 2.11–2.15 при появлении Browser/Computer use и только после этого перевести формальный QG в APPROVED.

## Исправленный finding

- ✅ `HorsesDeveloperDocumentationView.tsx` теперь разделяет базовый `BreedGroupOutDto` (list, POST, PATCH, detail по умолчанию) и `BreedGroupOutWithPageDataDto` (только detail GET с `page_data=true`), фиксирует DELETE 204 и отсутствие `page_data` в базовых responses.
- ✅ Новый component assertion проверяет оба DTO, default `page_data=false`, отсутствие поля в list/POST/PATCH и DELETE 204.

## Fact-check

- Paths, slug-or-UUID lookup, list filters/sorts, repeated `breed_group_ids`, `group_name/-group_name`, nullable `breed_group_id`, nested nullable `group`, omitted-vs-null PATCH и FK `ON DELETE SET NULL` соответствуют реализации.
- Access: GET использует `get_read_equestrian_context`, selector обязателен при anonymous read; missing/invalid selector → 401. POST/PATCH/DELETE требуют CMS auth и protected tenant context; scopes `SUPERUSER`, `ADMIN`, `DEVELOPER`, denial → 403.
- User documentation соответствует фактическому UI: справочник, колонки, CRUD, Page Editor без photos, list controls, assign/clear и отображение «—» после удаления.
- Component tests проверяют конкретные contract tokens без snapshots и без live backend calls.

## Frontend test gate

- `npm test`: ✅ 48 files, 432 passed, 0 failed; scoped documentation suite: 2 files, 8 passed, 0 failed.
- `npm run lint`: ✅ exit 0, 0 errors, 410 existing warnings.
- `npx tsc --noEmit`: ✅ exit 0.
- `npm run build`: ✅ production build completed.

## Architecture self-checks

- `rg -n "fetch\\(|axios" ...`: новые documentation views не добавляют runtime calls; совпадения в других developer examples и API boundary существующие.
- `rg -n "from ['\\\"]@/api" ...`: documentation views не импортируют API; разрешённые imports находятся в service/API boundary (есть существующие app auth imports вне scope change).
- `rg -n "site-ad|site-\\*|Public Read|public read" ...`: только документирующий текст Public Read; consumer imports/links не добавлены.
- legacy `shared/widgets/entities` dirs: не обнаружены.

## Browser QA

| Проверка | Результат |
|---|---|
| anonymous `/horses` redirect/block | ⛔ blocked: browser unavailable |
| ADMIN: «Инструкция» visible, «Документация» hidden | ⛔ blocked |
| DEVELOPER/SUPERUSER: обе вкладки | ⛔ blocked |
| Network: no requests during docs reading | ⛔ blocked |
| Desktop/tablet/mobile readability | ⛔ blocked |
| Regression остальных horse tabs | ⛔ blocked |

Screenshots отсутствуют, поскольку browser surface не создан и страница не могла быть открыта.
Проверки 2.11–2.15 имеют explicit user-approved waiver для текущего выпуска, но оставлены unchecked, поскольку фактически не выполнялись.

## OpenSpec progress

- Tasks 1.1–1.21 выполнены Frontend owner.
- QG tasks 2.1–2.10 выполнены; 2.11–2.15 заблокированы Browser.
- 2.16/2.16a/2.16b выполнены этим отчётом; finding возвращён Frontend owner, исправлен и повторно проверен (2.17).
- Tasks 2.11–2.15 остаются unchecked/deferred by waiver и не называются passed.
- Sync, post-sync validation и archive (2.18–2.20) оставлены Router; Quality Gate их не выполнял.

## Решение по waiver

Waiver принят и документирован как решение пользователя принять остаточный риск. Обновлённые proposal/design/spec/tasks формально разрешают `APPROVED WITH ACCEPTED RISK`, когда runtime недоступен, browsers list пуст, troubleshooting и explicit approval зафиксированы, automation/content/access/architecture/validation зелёные и иных blockers нет. Все условия выполнены. Deferred Browser QA следует выполнить при появлении Browser/Computer use; waiver неприменим, если доступный browser обнаружит дефект.
