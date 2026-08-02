## Why

Формы создания и изменения пород и мастей аварийно завершают рендер при ошибке пустого имени, а отправленные пустые `slug` и `description` backend ошибочно отклоняет, несмотря на заявленную автоматическую генерацию slug и необязательность описания. Это блокирует штатные CMS-сценарии и расходится с действующим DTO-контрактом.

## What Changes

- Исправить отображение field-level ошибок в modal пород и мастей так, чтобы отсутствие ошибки конкретного поля никогда не приводило к вызову `.join()` у `undefined`.
- Нормализовать пустой или состоящий из пробелов `slug` в отсутствие пользовательского slug: при создании генерировать его из имени, при изменении без нового slug сохранять текущий slug, кроме уже существующего контрактного сценария переименования.
- Нормализовать пустое или состоящее из пробелов описание пород и мастей в `null` и разрешить создание/изменение без описания.
- Добавить backend unit и live-API smoke regression coverage, frontend component/API-boundary coverage и ручную UI-проверку обоих справочников.
- Сохранить действующую access policy: `GET` остаются Public Read, `POST`/`PATCH` — Protected Write; новых endpoint и исключений не добавляется.

## Capabilities

### New Capabilities

Отсутствуют.

### Modified Capabilities

- `backend-domain-capabilities`: уточнить нормализацию пустых `slug` и `description` при создании и изменении пород и мастей.
- `cms-horse-ui-quality`: закрепить безопасное отображение validation errors и корректную передачу необязательных полей форм пород и мастей.

## Impact

- Backend: `services/backend/src/core/services/breeds.py`, `services/backend/src/core/services/coat_color.py` и профильные unit-тесты; схемы БД и миграции не требуются.
- Frontend: modal-компоненты пород и мастей и их component/API-boundary tests в `services/frontend/src/features/horses` и `services/frontend/src/api`.
- API: поведение существующих `POST /horses/breeds`, `PATCH /horses/breeds/{slug_or_id}`, `POST /horses/coat-colors`, `PATCH /horses/coat-colors/{slug_or_id}`; формы response и маршруты не меняются.
- NATS, `services/site-ad` и межсервисные контракты не затрагиваются.
