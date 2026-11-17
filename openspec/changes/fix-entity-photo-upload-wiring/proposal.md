# Proposal

## Why

Пользователь получил `400 {"detail":"PhotoService не инициализирован"}` при `POST /api/prices/ae1e68be-14b3-4007-a80c-d464c7f3f8da/photos/upload`. Исходная задача — `docs/tasks/081_photos_selector_improve.md`; текущий код подтверждает одинаковый пропуск DI для услуг, лошадей и новостей, несмотря на заявленную завершённость архивного change `2026-10-07-photos-selector-improve`.

## What Changes

- Передавать существующий `PhotoService` из production DI во все три entity service; для лошадей также передавать `PhotoUrlBuilder`.
- Закрыть связанные дефекты потока: отсутствие административной проверки prices и сброс главного фото при пересоздании связей с `main_photo_id=None`. Не менять общий алгоритм загрузки, storage или транзакционную модель.
- **BREAKING (только ошибочные запросы):** вместо текущего `400` возвращать `404` для отсутствующей/недоступной в tenant сущности; чужой tenant также получает `404` без раскрытия существования записи. Это явная корректировка исторического обещания `403` для foreign entity, не разрешение доступа. Prices без административных прав получает `403`.
- Закрепить реально используемые multipart-поля `files`, `names`, `descriptions` (повторяемые ключи без буквальных `[]`) и существующий `400` для ошибок количества файлов, не менять глобальный exception handler.
- Проверять production dependency graph, а не только сервисы, собранные вручную с mocks; выполнить регрессию всех трёх сущностей и независимый QG.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `photo-batch-upload-attach`: работоспособная production-сборка, сохранение существующих связей/main, уточнение tenant/access и multipart-контракта. Access matrix и anonymous/authenticated сценарии находятся в delta spec.

## Impact

Затронуты только backend и его тесты: `src/depends/services.py`, upload-методы в `src/core/services/{prices,horse,news}.py`, price upload route и зависимые tests. API: `POST /api/prices/{slug_or_id}/photos/upload`, `POST /api/horses/{horse_id}/photos/upload`, `POST /api/news/{news_id}/photos/upload` — Protected Write, без исключений. CMS frontend и сайты не меняются; прочитан caller `services/frontend/src/api/photos.ts:96–179`.

Миграций, новых зависимостей, NATS-контрактов, рефакторинга и работ с окружением нет. Live-проверки требуют отдельного разрешения на изолированные тестовые ресурсы; пользовательскую сущность из обращения не изменять. Approval этого change не разрешает setup/teardown PostgreSQL/NATS. Исторические отчёты и task 081 остаются неизменными; единственный план — этот change.
