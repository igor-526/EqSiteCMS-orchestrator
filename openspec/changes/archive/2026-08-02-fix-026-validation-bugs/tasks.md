## 1. Реализация и проверки

### Backend

- [x] 1.1 В `services/backend/src/core/services/breeds.py` нормализовать пустой/whitespace `slug` как отсутствующий и пустой/whitespace `description` как `None`, сохранив update/rename semantics.
- [x] 1.2 В `services/backend/src/core/services/coat_color.py` реализовать симметричную нормализацию и уникальность slug.
- [x] 1.3 Сверить фактические auth dependencies четырёх endpoint с access matrix; исключения не добавлять.
- [x] 1.4 Перед live smoke найти PostgreSQL по compose labels/fallback и повторно получить env, host port, image, labels и aliases через `docker inspect`.
- [x] 1.5 Unit: breed — create без ключа slug генерирует slug из имени.
- [x] 1.6 Unit: breed — create с `slug=null` генерирует slug.
- [x] 1.7 Unit: breed — create с `slug=""` генерирует slug.
- [x] 1.8 Unit: breed — create с whitespace slug генерирует slug.
- [x] 1.9 Unit: breed — кириллическое имя транслитерируется в slug.
- [x] 1.10 Unit: breed — collision generated slug получает уникальный suffix.
- [x] 1.11 Unit: breed — отсутствующее description сохраняется как `None`.
- [x] 1.12 Unit: breed — `description=null` сохраняется как `None`.
- [x] 1.13 Unit: breed — пустое description нормализуется в `None`.
- [x] 1.14 Unit: breed — whitespace description нормализуется в `None`.
- [x] 1.15 Unit: breed — description длиной 511 принимается.
- [x] 1.16 Unit: breed — description длиной 512 отклоняется.
- [x] 1.17 Unit: breed — пустое имя отклоняется без repository write.
- [x] 1.18 Unit: breed — PATCH с пустым slug и неизменным именем сохраняет текущий slug.
- [x] 1.19 Unit: breed — PATCH rename с пустым slug генерирует уникальный slug из нового имени.
- [x] 1.20 Unit: breed — чужой tenant не может изменить запись.
- [x] 1.21 Unit: coat color — create без ключа slug генерирует slug из имени.
- [x] 1.22 Unit: coat color — create с `slug=null` генерирует slug.
- [x] 1.23 Unit: coat color — create с `slug=""` генерирует slug.
- [x] 1.24 Unit: coat color — create с whitespace slug генерирует slug.
- [x] 1.25 Unit: coat color — кириллическое имя транслитерируется в slug.
- [x] 1.26 Unit: coat color — collision generated slug получает уникальный suffix.
- [x] 1.27 Unit: coat color — отсутствующее description сохраняется как `None`.
- [x] 1.28 Unit: coat color — `description=null` сохраняется как `None`.
- [x] 1.29 Unit: coat color — пустое description нормализуется в `None`.
- [x] 1.30 Unit: coat color — whitespace description нормализуется в `None`.
- [x] 1.31 Unit: coat color — description длиной 511 принимается.
- [x] 1.32 Unit: coat color — description длиной 512 отклоняется.
- [x] 1.33 Unit: coat color — пустое имя отклоняется без repository write.
- [x] 1.34 Unit: coat color — PATCH с пустым slug и неизменным именем сохраняет текущий slug.
- [x] 1.35 Unit: coat color — PATCH rename с пустым slug генерирует уникальный slug из нового имени.
- [x] 1.36 Unit: coat color — чужой tenant/отсутствующее право не изменяет запись.
- [x] 1.37 Запустить профильные backend unit tests, затем полный применимый unit suite и сохранить команды/результаты.
- [x] 1.38 Smoke: breed — live POST без slug на реальной PostgreSQL создаёт generated slug.
- [x] 1.39 Smoke: breed — live POST с `slug=null` создаёт generated slug.
- [x] 1.40 Smoke: breed — live POST с пустым slug создаёт generated slug.
- [x] 1.41 Smoke: breed — live POST с whitespace slug создаёт generated slug.
- [x] 1.42 Smoke: breed — live POST без description возвращает `null`.
- [x] 1.43 Smoke: breed — live POST с `description=null` возвращает `null`.
- [x] 1.44 Smoke: breed — live POST с пустым description возвращает `null`.
- [x] 1.45 Smoke: breed — live POST с whitespace description возвращает `null`.
- [x] 1.46 Smoke: breed — live collision generated slug получает suffix.
- [x] 1.47 Smoke: breed — live PATCH с пустыми slug/description успешен и сохраняет slug.
- [x] 1.48 Smoke: breed — live PATCH rename с пустым slug генерирует новый slug.
- [x] 1.49 Smoke: breed — anonymous POST возвращает `401/403` без DB write.
- [x] 1.50 Smoke: breed — anonymous PATCH возвращает `401/403` без DB write.
- [x] 1.51 Smoke: breed — authenticated пользователь без scope/чужого tenant получает отказ.
- [x] 1.52 Smoke: breed — cleanup удаляет созданные записи из реальной PostgreSQL через API.
- [x] 1.53 Smoke: coat color — live POST без slug на реальной PostgreSQL создаёт generated slug.
- [x] 1.54 Smoke: coat color — live POST с `slug=null` создаёт generated slug.
- [x] 1.55 Smoke: coat color — live POST с пустым slug создаёт generated slug.
- [x] 1.56 Smoke: coat color — live POST с whitespace slug создаёт generated slug.
- [x] 1.57 Smoke: coat color — live POST без description возвращает `null`.
- [x] 1.58 Smoke: coat color — live POST с `description=null` возвращает `null`.
- [x] 1.59 Smoke: coat color — live POST с пустым description возвращает `null`.
- [x] 1.60 Smoke: coat color — live POST с whitespace description возвращает `null`.
- [x] 1.61 Smoke: coat color — live collision generated slug получает suffix.
- [x] 1.62 Smoke: coat color — live PATCH с пустыми slug/description успешен и сохраняет slug.
- [x] 1.63 Smoke: coat color — live PATCH rename с пустым slug генерирует новый slug.
- [x] 1.64 Smoke: coat color — anonymous POST возвращает `401/403` без DB write.
- [x] 1.65 Smoke: coat color — anonymous PATCH возвращает `401/403` без DB write.
- [x] 1.66 Smoke: coat color — authenticated пользователь без права/чужого tenant получает отказ.
- [x] 1.67 Smoke: coat color — cleanup удаляет созданные записи из реальной PostgreSQL через API.

### Frontend

- [x] 1.68 Исправить `HorseBreedsCreateUpdateModal.tsx`: description error проверяет/читает только `description`, безопасно обрабатывает отсутствующий массив и сохраняет empty optional payload.
- [x] 1.69 Исправить `HorseCoatColorsCreateUpdateModal.tsx` симметрично, не расширяя ownership за пределы двух modal.
- [x] 1.70 Дополнить breed modal component tests: name-only error без crash, description error, empty slug/description submit, validation/generic error state, double submit.
- [x] 1.71 Дополнить coat-color modal component tests той же regression matrix.
- [x] 1.72 Дополнить API-boundary/hook MSW tests для success, empty payload, validation, generic, `401`, `403`; live backend calls запрещены.
- [x] 1.73 Проверить anonymous redirect/block `/horses`, authenticated render, scope present/missing, hidden/disabled/guarded Protected Write actions и backend denial surfaced.
- [x] 1.74 Проверить отсутствие регрессии pagination: initial `limit/offset`, page change, page-size change и reset offset на filter/search/sort.
- [x] 1.75 Выполнить Manual QA из design на desktop/tablet/mobile и оформить evidence с screenshots/network status для failures.
- [x] 1.76 Выполнить no `site-*` mixing self-check: `rg -n "fetch\\(|axios" services/frontend/src -g '*.{ts,tsx}'`, `rg -n "from ['\\\"]@/api" services/frontend/src/app services/frontend/src/features -g '*.{ts,tsx}'`, `rg -n "\\bpage\\b|pageSize|page_size" services/frontend/src/features services/frontend/src/api services/frontend/src/types -g '*.{ts,tsx}'`, `rg -n "site-ad|site-\\*|Public Read|public read" services/frontend/src -g '*.{ts,tsx}'`, `find services/frontend/src -maxdepth 2 -type d \\( -name shared -o -name widgets -o -name entities \\)`.
- [x] 1.77 Из `services/frontend` выполнить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` и сохранить результаты.

### Quality Gate

- [x] 1.78 Провести один общий review совокупного backend/frontend diff на соответствие proposal/design/specs, Clean Architecture и path ownership.
- [x] 1.79 Проверить access matrix: anonymous/authenticated/scopes/foreign tenant и отсутствие новых Public Read/Protected Write исключений.
- [x] 1.80 Подтвердить наличие и качество минимум 30 разнообразных backend unit и 30 live smoke сценариев на реальной PostgreSQL; запретить smoke pytest-файлы.
- [x] 1.81 Проверить frontend tests относительно behavior diff: MSW/no live calls, safe errors, state retention, scopes, `401/403`, double submit и pagination `limit/offset`.
- [x] 1.82 Из `services/frontend` повторно выполнить `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; проверить no `site-*` mixing rg/find evidence.
- [x] 1.83 Проверить backend unit suite и smoke report, DB evidence из свежего `docker inspect`, отсутствие миграций/NATS/site-ad diff.
- [x] 1.84 Сохранить единый Quality Gate report в `docs/reports`; findings вернуть владельцам, дождаться исправлений и повторить общий review.
- [x] 1.85 После успешного Quality Gate синхронизировать обе delta specs в main specs, повторить strict validation и архивировать change.
