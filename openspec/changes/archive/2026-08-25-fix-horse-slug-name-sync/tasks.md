## 1. Чеклист

### Backend

- [x] 1.1 Подтвердить по diff, что `services/backend`, endpoint contract, DTO, миграции PostgreSQL и NATS/AsyncAPI не изменены; существующая семантика PATCH `slug=""` используется без backend-правок.

### Frontend

- [x] 1.2 В `services/frontend/src/features/horses/ui/Horses/HorseCreateUpdateModal.tsx` добавить session-local признак ручного редактирования slug и сбрасывать его при открытии/смене выбранной лошади.
- [x] 1.3 В `HorseCreateUpdateModal.tsx` при изменении клички очищать prefilled slug только до первого ручного изменения slug в текущей сессии.
- [x] 1.4 В `HorseCreateUpdateModal.tsx` считать любое пользовательское изменение slug, включая очистку, ручным приоритетом и не перезаписывать его последующим изменением клички.
- [x] 1.5 Сохранить typed create/update payload, field-level `validationErrors.slug`, scope/mutation guards и double-submit guard без прямых API calls из компонента.
- [x] 1.6 Regression test: edit modal сохраняет prefilled slug, если кличка и slug не менялись.
- [x] 1.7 Regression test: изменение клички до ручного slug action очищает поле и submit передаёт `slug=""` вместе с новым `name`.
- [x] 1.8 Regression test: последовательность `name → ручной slug` отправляет ручной slug.
- [x] 1.9 Regression test: последовательность `ручной slug → name` сохраняет и отправляет ручной slug.
- [x] 1.10 Regression test: явная ручная очистка slug переживает последующее изменение name и запрашивает backend-регенерацию.
- [x] 1.11 Regression test: закрытие/reopen или смена `selectedHorse` сбрасывает session-local manual flag и корректно заполняет новую запись.
- [x] 1.12 Component test: backend slug validation error сохраняет итоговые name/slug и показывает field error без закрытия modal.
- [x] 1.13 Permission tests: scope present разрешает submit, scope missing скрывает/блокирует update и mutation не вызывается.
- [x] 1.14 Error/access tests: существующий flow корректно отображает backend `401/403`, не выполняя live backend calls в unit/component suite.
- [x] 1.15 Double-submit test: pending name/slug update отправляет ровно один PATCH callback.
- [x] 1.16 Запустить из `services/frontend` `make format`, затем проверить, что изменены только назначенные frontend paths и test-файл.
- [x] 1.17 Запустить из `services/frontend` `npm test` (включая целевой `HorseCreateUpdateModal` suite) без live backend calls.
- [x] 1.18 Запустить из `services/frontend` `npm run lint` и `npx tsc --noEmit`.
- [x] 1.19 Запустить из `services/frontend` `npm run build`.
- [x] 1.20 Выполнить self-check `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'` и подтвердить отсутствие нового direct API call вне разрешённого boundary.
- [x] 1.21 Выполнить self-check `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'` и подтвердить цепочку `feature -> service -> api`.
- [x] 1.22 Выполнить self-check `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'`; подтвердить отсутствие изменения pagination contract.
- [x] 1.23 Выполнить self-check `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'` и `find services/frontend/src -maxdepth 2 -type d \\( -name shared -o -name widgets -o -name entities \\)`; подтвердить no `site-*` mixing и отсутствие запрещённых слоёв.

### Quality Gate

- [x] 1.24 Проверить соответствие diff proposal/design/delta spec и ownership: frontend-only runtime, без backend/API/DB/NATS/`site-ad` изменений.
- [x] 1.25 Проверить качество regression tests для untouched prefill, name-triggered regeneration, обоих порядков manual precedence, explicit clear и lifecycle reset; убедиться, что тест падает на прежнем поведении.
- [x] 1.26 Проверить Protected Admin/access scenarios: anonymous route block, authenticated render, scope present/missing, mutation guard, `401/403` handling и отсутствие случайной приватизации Public Read GET.
- [x] 1.27 Проверить MSW/mocks/no live backend calls в unit/component tests, field `400`/generic error state preservation и double-submit behavior.
- [x] 1.28 Проверить отсутствие pagination `limit/offset` регрессии, direct API imports/calls, DTO вне `src/types`, `site-*` mixing и запрещённых FSD-директорий применимыми `rg`/`find` командами.
- [x] 1.29 Из `services/frontend` запустить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; зафиксировать версии и результаты в `docs/reports`.
- [x] 1.30 Выполнить Manual QA steps из `design.md` в настроенном браузере для desktop/tablet/mobile, anonymous/authenticated/scope-missing, name→auto, name→manual, manual→name, explicit clear, `400/401/403`, double-submit и success refresh.
- [x] 1.31 В Manual QA подтвердить реальный PATCH payload/status, Public Read нового slug с valid tenant selector, недоступность старого slug и очистить QA-данные; для failures приложить screenshots/network evidence.
- [x] 1.32 Провести один общий Quality Gate; blocking findings вернуть Frontend owner, дождаться исправлений и повторить общий review до APPROVED.
- [x] 1.33 После APPROVED синхронизировать delta `cms-horse-ui-quality` в main specs и выполнить `openspec validate --all --strict`.
- [x] 1.34 После успешной синхронизации и strict validation архивировать `fix-horse-slug-name-sync` и сохранить итоговый evidence в `docs/reports`.
