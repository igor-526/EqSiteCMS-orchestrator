## Why

Загрузка фотографии с именем длиннее ограничения `photos.name VARCHAR(63)` проходит до PostgreSQL и завершается `500`, после чего CMS пытается удалить локальную временную запись как серверный UUID и получает `422`. Дополнительно ingress backend ограничивает тело запроса примерно одним мегабайтом, поэтому изображения крупнее этого размера отклоняются nginx до приложения.

## What Changes

- Сделать контракт имени фотографии согласованным с ограничением хранения: `POST /api/photos` и `PATCH /api/photos/{id}` принимают имя любой длины, нормализуют basename и безопасно сокращают итоговое display name до 63 символов с устойчивым hash/discriminator, не требуя от пользователя переименовывать файл.
- Устранить коллизии tenant-scoped имён: разные файлы с одинаковым исходным именем получают разные hash-компоненты, повторная загрузка того же файла создаёт отдельную фотографию с последовательным discriminator, а редкая hash-коллизия разрешается тем же bounded suffix без выхода за `VARCHAR(63)`.
- Закрепить дедупликацию на уровне PostgreSQL через `UNIQUE (equestrian_id, name)` и Alembic migration: существующие точные дубли предварительно и детерминированно переименовываются bounded suffix, затем неуникальный индекс заменяется уникальным constraint.
- Исправить CMS-flow добавления фотографий: не отправлять `DELETE /api/photos/{id}` для upload-item, который не получил серверный UUID; локально удалять failed/temporary item и сохранять серверное удаление только для успешно созданных фотографий.
- Настроить backend Helm ingress на управляемый через values лимит тела запроса с дефолтом `20m`, чтобы поддержать фотографии размером 10 МБ и небольшой multipart overhead.
- Добавить backend unit/live smoke, frontend unit/component/API-boundary и Helm render-проверки, фиксирующие регрессии.
- Сохранить существующую access policy endpoint'ов фотографий; полная матрица доступа включается в delta spec.
- Acceptance выполняется локально/в controlled runtime: production/deployed API проверки исключены явным решением пользователя; Browser Plugin/manual responsive/network QA waived, потому что Browser Plugin недоступен на Arch. Уже полученное runtime ingress evidence допускается как дополнительное доказательство, но production auth не требуется.

## Capabilities

### New Capabilities

- Нет.

### Modified Capabilities

- `backend-domain-capabilities`: нормализация, bounded naming и tenant-scoped дедупликация имён для `POST/PATCH /api/photos`.
- `cms-content-commerce-ui`: корректная локальная очистка временных и ошибочных upload-item без невалидного DELETE.
- `core-service-release-hardening`: конфигурируемый ingress body-size backend-чарта и проверка рендера.

## Impact

- Backend: `services/backend/src/core/services/photos.py`, узкий naming helper/repository retry, `src/models/photos.py`, новая Alembic migration и backend unit/migration tests.
- PostgreSQL: добавляется `uq_photos_equestrian_name (equestrian_id, name)`; migration выполняет transactional preflight и deterministic cleanup существующих дублей без удаления photo rows/media relations.
- CMS frontend: `services/frontend/src/features/gallery/hooks/useGallery.ts` и новые/существующие тесты gallery upload-flow; API-контракт `src/api/photos.ts` не меняется.
- Deployment: `services/backend/.helm/templates/backend-ingress.yml`, `services/backend/.helm/values.yaml` и Helm render evidence.
- API: длинное `name` у `POST /api/photos` и `PATCH /api/photos/{id}` теперь успешно преобразуется в уникальное имя длиной не более 63 символов вместо `500`; response возвращает фактически сохранённое имя. Классы доступа endpoint'ов не меняются.
- NATS/AsyncAPI, site-consumer и main specs на этапе proposal не изменяются.
