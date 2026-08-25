# Review: callback-requests-management-055

**Статус: ✅ APPROVED**  
**Дата:** 2026-08-25  
**OpenSpec:** `openspec/changes/callback-requests-management-055/` (proposal, design, 5 delta specs, tasks; user approval получен до apply)  
**Исходная задача:** `docs/tasks/055_callback_backend_and_ui.md`

## Итог

Общий Quality Gate повторён по совокупному diff `services/backend`, `services/notification-service`, `services/frontend`, `services/site-ad` и live smoke evidence после runtime refinements. Все blocking findings закрыты, автоматические gates зелёные, access/messaging contracts подтверждены, real Chrome Manual QA завершён. Implementation diff допущен к sync/archive workflow Router.

## Новое blocking finding

## Закрытые findings

### QG-055-06 — Frontend/runtime — High — double-click отправлял две status mutations

Owner: CMS Frontend. Runtime: image `sha256:5b10…`, `http://localhost:3001/callback-requests`. Synthetic row: `cd563235-b400-4062-810e-9ea53e3efb6e`.

Исходный finding воспроизводил два одинаковых status PATCH. Закрыт на runtime image `sha256:00c176…`: независимый real Chrome rerun на synthetic row `cd563235-b400-4062-810e-9ea53e3efb6e` подтвердил ровно один `PATCH .../status` с `{"status":2}` при `dblclick` и ровно один `PATCH .../spam` с `{"is_spam":true}` при `dblclick`. После spam=true строка показала `Обработана/Да`; cleanup через authenticated API восстановил `status=1`, `is_spam=false`. Regression suite теперь содержит 503 frontend tests.

### QG-055-05 — Site Consumer/runtime — High — локальная callback-форма не создаёт заявку

Owner: Site Consumer/runtime. Связанные файлы: `services/site-ad/.env:1`, `services/site-ad/src/api/callBackRequest.ts:8-18`, локальный runtime `http://localhost:3002/`.

Chrome evidence после явного подтверждения пользователя:

1. Через header entry point открыта callback modal.
2. Введены только разрешённые synthetic values: `Callback QA 055`, `+7 900 055-00-55`, `Manual QA 055`; policy принята.
3. Выполнен double-click по «Отправить заявку».
4. Вместо success/reset UI показал `Не удалось отправить заявку. Попробуйте ещё раз позже.`; modal, имя, комментарий и policy state сохранены.
5. Runtime owner перезапустил site-ad с `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api` и подтвердил browser-like POST через CLI как `201`, но повтор в новой реальной Chrome-вкладке дал ту же UI error. Следовательно, CLI request не закрывает браузерный acceptance; остаётся browser-only runtime boundary (в частности, CORS/network handling).

Закрыт: site-ad запущен с opt-in `SITE_API_PROXY_TARGET`, а `NEXT_PUBLIC_API_BASE_URL=/api` направляет browser request через same-origin rewrite. Реальный Chrome double-click отправил ровно один `POST http://localhost:3002/api/callback_requests` с разрешёнными synthetic contact fields, получил success modal, закрыл/очистил форму и создал строку `cd563235-b400-4062-810e-9ea53e3efb6e`. Rewrite production-safe: при отсутствии server-only env `SITE_API_PROXY_TARGET` список rewrites пуст; CMS credentials и CMS-only routes не добавлены.

### QG-055-04 — Frontend — Medium — активный column filter не подсвечивался в production runtime

Owner: CMS Frontend. Файл: `services/frontend/src/features/callbackRequests/ui/CallbackRequestsTable.tsx:14-22`.

Chrome evidence на image `sha256:0f1c21d9e552fc0ece0f0b19a2015085563f5ce818f50a6d86ba96fa28fef61d`, `http://localhost:3001/callback-requests`:

1. Открыт фильтр колонки «Имя», введено `ИВАН`.
2. Таблица корректно сократилась до двух case-insensitive matching rows, то есть query active.
3. После закрытия dropdown `Фильтр: Имя` остался с computed color `rgba(0, 0, 0, 0.41)`; inline `style` отсутствует и trigger не имеет active marker/class.

Закрыт на актуальном runtime image `sha256:5b10…`: при применённом `ИВАН` trigger имеет class `active`, icon — `data-filter-active="true"`, inline и computed color `rgb(22, 119, 255)`; после общего reset class/marker/style исчезают, computed color возвращается к серому, таблица восстанавливает все строки. Ровно шесть фильтров остаются внутри соответствующих column headers, labels не содержат `(regex)`, responsive layout на 1280/768/375 не регрессировал.

### QG-055-01 — Backend — Medium — diff hygiene/format gate

`git -C services/backend diff --check` завершается ошибкой из-за trailing whitespace в изменённых файлах:

- `src/core/exceptions/base.py:13-18`
- `src/models/__init__.py:14`
- `src/utils/seeding/init_registry.py:12,104`
- `src/utils/seeding/seeders/__init__.py:2`

Закрыт: повторный `git -C services/backend diff --check` — PASS; backend format/lint/type/tests — PASS.

### QG-055-02 — Notification — High — canonical real JetStream acceptance не воспроизводится

`make -C services/notification-service test-infra` вернул exit 2: `test_real_backend_notification_email_adapter_compatibility` упал в `tests/integration/test_real_jetstream.py:191` с `KeyError: EMAIL_TEST_DATABASE_DSN`. Итог: 1 passed, 1 failed.

Закрыт: DSN теперь обнаруживается через Docker labels/inspect; повторный `make -C services/notification-service test-infra` — `2 passed`.

### QG-055-03 — Frontend/runtime — High — Manual QA precondition отсутствует

Закрыт как runtime finding: контейнер `eqsitecms-frontend` пересобран в актуальном `eqsitecms-core`, порт `3001` поднят, production build содержит `/callback-requests`.

## Browser connection closure

Повторный Manual QA не удалось начать через обе предусмотренные capabilities:

- Browser/default: `No browser is available`; после обязательной диагностики список browser backends пуст (`[]`).
- Chrome: `Browser is not available: chrome`; повтор после паузы дал тот же результат.
- Chrome diagnostics: Google Chrome установлен, но **не запущен**; ChatGPT extension установлено и enabled в профиле `Default`; native-host manifest существует и корректен.

Chrome profile `Default` подключён. Read-only Manual QA выполнен без shell/Playwright substitution.

## Automated verification

- `openspec status --change callback-requests-management-055 --json`: planning artifacts complete.
- `openspec validate callback-requests-management-055 --strict`: PASS.
- Backend pytest: `1181 passed, 5 skipped`.
- Backend mypy/ruff/format-check/flake8 и `git diff --check`: PASS.
- Notification default tests: `56 passed, 2 deselected`.
- Notification mypy/basedpyright/ruff/format-check/flake8: PASS.
- Notification real infrastructure: `2 passed`.
- Frontend Vitest после последнего runtime refinement: `61 files, 503 tests passed`.
- Frontend `npm run lint`, `npx tsc --noEmit`, `npm run build`: exit 0; lint содержит существующие и новые warnings, включая callback inline-handler/style warnings.
- Site consumer Vitest: `7 files, 28 tests passed`.
- Site consumer `npm run lint`: exit 0 с warnings; `npx tsc --noEmit`: PASS; `npm run build`: PASS. Отдельного `typecheck` script нет, поэтому применена прямая команда TypeScript.
- `make asyncapi-validate`: PASS для backend, notification и email (governance warnings, 0 errors).

`make format` намеренно не запускался на dirty multi-owner worktree: это mutating target. Его non-mutating эквиваленты `ruff format --check` и raw `git diff --check` прошли.

## Frontend test gate

Mandatory команды CMS прошли. Self-check/review подтвердил API boundary в `src/api/callbackRequests.ts`, query `limit/offset`, отсутствие импорта `site-ad` и отсутствие live backend calls в Vitest/MSW. Тесты покрывают базовые query/mutation/API error cases, permissions и double-submit. Полное acceptance UI невозможно подтвердить без актуального runtime; задачи Manual QA оставлены unchecked.

## Access verification results

Live smoke report `docs/reports/055_callback_live_api_smoke_2026-08-24.md` содержит 42/42 PASS и endpoint evidence для public create/status GET, protected PII list/detail, ADMIN/SUPERUSER, forbidden role, service-key mutations и foreign-tenant non-disclosure. Он также подтверждает `401/403/404/422`, spam invariant status=2 и отсутствие tenant/service fields в responses. UI-level access verification не завершена из-за QG-055-03.

## Messaging and delivery

Обе AsyncAPI валидны; callback payload сохраняет внутренний `callback_request_id`, не содержит `X-Equestrian-Id`/UUID всадника, email body не рендерит UUID. Live smoke подтверждает commit-before-publish, no-recipient false, downstream-publish true без SMTP receipt, duplicate/redelivery idempotency и concurrency invariant. Canonical repository infrastructure command остаётся красным по QG-055-02.

## Scenario quality

OpenSpec содержит 39 разнообразных `Unit:` и 43 `Smoke:` сценария, связанные с behavior/access/migration/NATS/UI контрактами. Live smoke evidence: 42/42 PASS на реальных API/PostgreSQL/NATS, параметры DB получены через `docker inspect`, без SQLite/mocks/pytest substitution.

## Manual QA

Статус: PASS. Anonymous direct route перенаправляет на login без menu/PII; SUPERUSER видит menu/page; forbidden developer role не видит menu, direct route показывает 403; ADMIN доступ восстановлен после logout/relogin. Подтверждены navigation/tabs/instruction, table/tel/detail modal, шесть filter buttons в соответствующих column headers, labels без `(regex)`, filters/active/reset/offset и responsive layout на 1280/768/375. Site-ad success/reset, error preservation и one-POST double-click подтверждены. Pagination page size 10: page 1 содержала 10 строк, page 2 — одну, пересечений не было, previous вернул тот же набор; filter со второй страницы вернул page 1. Status и spam double-click дают по одному PATCH; test state восстановлен.

## Changed areas reviewed

- Backend: callback domain/schema/service/repository/model/migration/seed/API/docs/NATS/tests.
- Notification: callback handler/orchestration/backend client/NATS publisher/AsyncAPI/tests.
- CMS frontend: callback API/types/hooks/UI/route/navigation/tests.
- Site consumer: callback API boundary/form/types/tests.
- OpenSpec artifacts and live smoke report.

## Remaining OpenSpec work

Quality Gate PASS. Tasks 2.20–2.24 и 3.9 отмечены по Chrome и CLI evidence. Task 3.11 целиком не отмечен: sync, повторная strict validation после sync и archive принадлежат Router.

Рекомендуемая ветка после исправлений: текущая feature branch change `callback-requests-management-055`; коммиты Quality Gate не создавались.
