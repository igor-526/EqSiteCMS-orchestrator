## Why

Backend-модели пород и мастей уже хранят `short_name`, однако CMS не показывает и не отправляет это поле. Кроме того, текущие list endpoint'ы не принимают фильтрацию и сортировку по `short_name`, поэтому требование задачи 024 нельзя выполнить только визуальной правкой frontend.

## What Changes

- Добавить `short_name` в frontend DTO пород и мастей, таблицы и модальные окна создания/изменения.
- Добавить столбец «Кор. наим.» с серверным поиском и сортировкой в обеих вкладках справочников.
- Расширить существующие backend GET list-контракты пород и мастей фильтром и сортировкой по `short_name`; CRUD paths и access classes не менять.
- Добавить frontend unit/component/API-boundary coverage и backend unit/smoke evidence для расширенного query-контракта.
- Не изменять `services/site-ad` и не смешивать CMS-код с consumer-контуром.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `cms-horse-ui-quality`: CMS получает полное управление короткими наименованиями пород и мастей, включая таблицы, поиск, сортировку и формы.
- `backend-domain-capabilities`: list API пород и мастей получает фильтрацию и сортировку по существующему полю `short_name`.

## Impact

- Сервисы: `services/backend`, `services/frontend`.
- Backend: существующие `GET /horses/breeds` и `GET /horses/coat_colors`, service/repository query flow и тесты; миграции и NATS не требуются.
- Frontend: horse breed/coat-color DTO, таблицы, модальные окна, validators/API-boundary и тесты.
- Consumer frontend: без изменений; публичность существующих GET и защита write endpoint'ов сохраняются.
