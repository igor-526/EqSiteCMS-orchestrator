## Context

Фактическая таблица `services/backend/src/models/photos.py` хранит `photos.name` как `String(63)`, а `Photo` и `PhotoService.create/update` не проверяют этот предел. В create media object сохраняется до repository insert; rollback удаляет его после DB exception, но клиент всё равно получает инфраструктурный `500`. CMS hook `useGallery` создаёт локальный `UploadFile.uid = temp-*`, заменяет uid на UUID только при успешном API-ответе и при remove безусловно вызывает `DELETE /api/photos/{uid}`. Backend ingress не задаёт `nginx.ingress.kubernetes.io/proxy-body-size`.

Затронуты backend, его PostgreSQL schema/migration, CMS frontend и Helm packaging одного сервиса. NATS, AsyncAPI и site-ad не затрагиваются. Источником требований является `docs/tasks/052_photos_bug.md`; legacy plans используются только как read-only evidence. Для smoke известен PostgreSQL container `7c720ddc783d`; credentials, port, image, labels и aliases всё равно MUST быть получены непосредственно через `docker inspect`, а не перенесены в план как hardcode.

## Goals / Non-Goals

**Goals:**

- Не допускать DB truncation и принимать пользовательское имя любой длины, формируя читаемое уникальное display name не длиннее 63 Unicode code points.
- Одинаково применять нормализацию и bounded дедупликацию к create и явному rename через update.
- Локально удалять временную/ошибочную frontend-запись и не формировать DELETE с `temp-*`.
- Разрешить upload 10 МБ с multipart overhead через дефолт ingress `20m`, сохранив возможность override.
- Доказать контракт unit/component/render и live smoke проверками на реальной PostgreSQL.

**Non-Goals:**

- Увеличение `VARCHAR(63)`, хранение полного исходного имени отдельным полем или content-level дедупликация/отказ создавать повторный photo resource.
- Изменение поддерживаемых MIME types, S3/MinIO limits или добавление application-level byte limit.
- Изменение access classes, scopes, tenant selector, gallery pagination или site-consumer UI.
- Создание smoke pytest-файлов; smoke выполняется только через skill `smoke` на локально поднятом API с реальной PostgreSQL.
- Production/deployed API, production authentication/tenant data и per-endpoint deployed timing coverage.
- Browser Plugin/manual browser, responsive viewport, screenshot и DevTools Network QA на Arch: capability недоступна в текущем окружении и явно waived пользователем.

## Decisions

### 1. Детерминированное bounded naming с hash и collision discriminator

Для create источником display name служит непустой `data.name`, иначе `upload.filename`. Для update алгоритм применяется только к переданному `data.name`; пустое значение сохраняет действующий fallback. Источник очищается от path components для `/` и `\\`, нормализуется Unicode NFC, управляющие символы удаляются, внешние пробелы убираются; пустой результат заменяется на `photo`. Последний безопасный suffix/extension (включая точку, максимум 10 Unicode code points, без separator/control chars) сохраняется отдельно.

Если нормализованное имя помещается в 63 символа, оно остаётся читаемым и передаётся в tenant-scoped `_generate_unique_name`. Любой collision получает suffix `-2`, `-3`, ... (первое имя остаётся без suffix), причём stem каждый раз обрезается под `63 - len(extension) - len(discriminator)`; итог никогда не превышает 63.

Следовательно, одинаковые короткие имена разных файлов различаются последовательным suffix (`photo.jpg`, `photo-2.jpg`), а не hash: content hash добавляется только когда без него пришлось бы потерять часть длинного имени. Повторная загрузка того же короткого либо длинного файла также создаёт новую photo row со следующим suffix; change не вводит content-level idempotency и не переиспользует существующий ресурс.

Если имя длиннее 63, базовый кандидат имеет точную форму `<readable-prefix>-<digest12><extension>`. Вход digest кодируется однозначно: `b"N" + len(name_utf8).to_bytes(8, "big") + name_utf8 + identity`, где `name_utf8` — полный очищенный NFC basename вместе с extension. Для create `identity = b"C" + sha256(content).digest()`; для update `identity = b"U" + photo_id.bytes`. `digest12` — первые 12 lowercase hex SHA-256 этого byte sequence. Поэтому одинаковые исходные имена разных файлов обычно получают разные имена, а одинаковый long rename разных ресурсов различается UUID. Prefix обрезается по Unicode code points до остатка бюджета; если он пуст, используется `photo` с повторным пересчётом бюджета.

Если candidate уже существует в tenant (повторная загрузка того же файла и имени либо реальная collision первых 48 hash bits), `_generate_unique_name` добавляет `-2`, `-3`, ... перед extension, каждый раз сокращая prefix. Повторная загрузка не считается идемпотентной и создаёт отдельный photo resource: `<prefix>-<digest12>-2.ext`. Поиск остаётся tenant-scoped; одинаковые имена в разных tenant не конфликтуют. Алгоритм делает не более 100 candidate attempts на операцию. Конкурентная гонка между lookup и insert использует unique constraint как arbiter и повторяет генерацию со следующим discriminator в той же use-case границе; после 100 конфликтов возвращается явный HTTP `409`, никогда raw DB `500`.

Альтернативы: простое усечение создаёт неразличимые имена; hash только исходного имени не различает разные файлы с одинаковым filename; полный UUID ухудшает читаемость; расширение колонки требует миграции. 12 hex/48 bits — компактный discriminator, а repository collision loop является обязательной защитой от hash collision, поэтому корректность не зависит от вероятностной уникальности hash.

### 2. PostgreSQL unique constraint и безопасная миграция существующих дублей

Модель `photos` заменяет неуникальный `Index("ix_photos_equestrian_name", "equestrian_id", "name")` на `UniqueConstraint("equestrian_id", "name", name="uq_photos_equestrian_name")`. Именно constraint является atomic arbiter concurrent create/update; advisory lock не используется.

Alembic upgrade выполняется одной PostgreSQL-транзакцией:

1. Берёт `LOCK TABLE photos IN SHARE ROW EXCLUSIVE MODE`, блокируя конкурентные writes до конца migration.
2. Выполняет preflight query `GROUP BY equestrian_id, name HAVING count(*) > 1`, фиксирует количество duplicate groups/rows в migration log/evidence и загружает rows в порядке `(equestrian_id, name, created_at NULLS LAST, id)`.
3. Для каждого tenant заранее резервирует множество всех существующих distinct names. В каждой exact-duplicate группе keeper — первая row по `created_at NULLS LAST, id`; keeper и все изначально уникальные rows не переименовываются.
4. Остальные rows группы получают первый свободный bounded candidate `<stem>-2<extension>`, `<stem>-3<extension>`, ...; stem сокращается тем же pure helper/эквивалентным migration helper до 63 code points. Candidate проверяется против полного reserved set tenant, поэтому существующий `photo-2.jpg` не перезаписывается; найденное имя сразу добавляется в reserved set. Порядок детерминирован UUID tie-breaker.
5. Обновляет только конфликтующие rows по id, повторно запускает duplicate preflight и MUST abort/rollback, если осталась хотя бы одна duplicate group или итоговое имя >63.
6. Удаляет `ix_photos_equestrian_name` и создаёт `uq_photos_equestrian_name`. Ни photo row, ни path/media object, ни horse/price/news relation не удаляются.

Upgrade не является data-loss operation, но display names конфликтующих старых rows меняются. Downgrade удаляет unique constraint и восстанавливает неуникальный индекс; автоматически возвращать прежние дубли нельзя без постоянной audit mapping, поэтому downgrade не откатывает переименования и явно документирует эту необратимость metadata.

Альтернативы: migration blocker заставил бы оператора вручную разбирать дубли и не удовлетворял автоматической дедупликации; advisory lock защищал бы только cooperating application sessions и не заменял DB invariant; unique index без pre-cleanup упал бы на существующих данных.

### 3. Frontend различает локальный item и серверный ресурс по upload status/UUID

`removeUploadedPhoto` удаляет item из `uploadPhotosList` без API-вызова, если upload не завершён успешно и uid не заменён серверным UUID. Для успешно созданного item остаётся Protected DELETE и удаление из списка только после успешного ответа. Mutation guard не полагается лишь на строковый prefix: серверное удаление допускается только для завершённого item с валидным UUID.

Альтернативы: игнорировать кнопку remove оставляет ошибочный item в модальном окне; делать backend DELETE tolerant к `temp-*` расширяет API ради чисто локального идентификатора и маскирует frontend bug.

### 4. Ingress limit — configurable value с безопасным дефолтом

В `services/backend/.helm/values.yaml` добавляется ingress body-size value с дефолтом `20m`, а ingress template рендерит `nginx.ingress.kubernetes.io/proxy-body-size`. Это превышает целевые 10 МБ и покрывает multipart overhead. Проверка выполняется `helm template`, включая default и override.

Альтернативы: фиксированный annotation `10m` может отклонить файл 10 МБ из-за overhead; глобальная настройка ingress-controller расширяет blast radius на другие сервисы.

### 5. API access policy не меняется

`POST /api/photos`, `PATCH /api/photos/{id}` и `DELETE /api/photos/{id}` остаются Protected Write для authenticated tenant user; anonymous outcome `401`, authenticated success/error согласно payload, foreign tenant не должен мутировать ресурс. `GET /api/photos*` не изменяются и остаются Public Read согласно существующему tenant-selector контракту. Новых endpoint нет.

### 6. Ownership и порядок

1. Backend Agent владеет tightly-coupled naming/schema zone: `services/backend/src/core/services/photos.py`, один узкий naming helper, repository collision retry, `services/backend/src/models/photos.py`, одну новую Alembic revision и backend photo/migration tests; он реализует нормализацию, bounded naming, deterministic data cleanup и unique constraint. Эти пути не делятся между параллельными исполнителями.
2. Frontend Agent после стабилизации backend-контракта владеет `services/frontend/src/features/gallery/hooks/useGallery.ts` и gallery tests; backend/API-файлы не меняет.
3. Backend Agent отдельным непересекающимся deliverable владеет `services/backend/.helm/templates/backend-ingress.yml`, `.helm/values.yaml` и при необходимости chart test/evidence path; runtime-код не меняет в этом deliverable.
4. Один Quality Gate Agent проверяет совокупный diff, выполняет backend/frontend/Helm gates и локальные live smoke scenarios через skill `smoke` на локальном API с реальной PostgreSQL. Production/deployed API и Browser Plugin не являются gate. Findings возвращаются владельцу соответствующей зоны, затем общий gate повторяется.
5. После успешного gate Router синхронизирует delta specs, повторяет strict validation и архивирует change.

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `features/gallery/hooks/useGallery.ts` | failed/temporary item удаляется локально без DELETE | hook unit: failed, uploading, malformed uid; success item вызывает delete; `401/403` сохраняют item и показывают error | authenticated CMS; Protected Write success/401/403; mutation guard | `npm test -- useGallery`, `npm test` |
| `features/gallery/ui/AddPhotosModal.tsx` | remove callback сохраняет корректный item flow | jsdom component: render, uploading, done, error, remove callback, close/reopen state | anonymous route block проверяется тестом protected layout; authenticated render через mocks | `npm test` |
| API boundary | новый endpoint не вводится, temporary uid не достигает API | MSW spy: ни одного DELETE для local item; success/400/401/403/generic error для server item | anonymous/authenticated, Protected Write | `npm test`, без live backend calls |
| Gallery regression | upload error остаётся управляемым и повторяемым | component/hook/API-boundary tests | scope present/missing, hidden/guarded mutation | `npm run lint`, `npx tsc --noEmit`, `npm run build` |

## UI QA waiver и автоматизированная замена

По явному решению пользователя Browser Plugin/manual UI QA пропущен: plugin недоступен и не может быть доступен в текущем Arch environment. Responsive viewport, screenshots и DevTools Network evidence не требуются и MUST NOT блокировать Quality Gate.

Acceptance UI обеспечивают jsdom/component/hook/API-boundary tests с MSW/mocks: anonymous redirect/block, authenticated render, scope present/missing, temporary item без DELETE, server UUID DELETE success, `400/401/403` и generic/network errors, retry/double-submit guard, modal state, pagination `limit/offset` и no `site-*` mixing. Эти tests не обращаются к live/deployed backend.

Локальные backend smoke выполняются против локального API и реальной PostgreSQL. Production/deployed endpoint calls, production auth и deployed timing coverage не требуются. Helm lint/render и уже полученное controlled runtime ingress evidence для 10 МБ/`20m` принимаются как достаточное ingress evidence; повторный production upload не нужен.

## Risks / Trade-offs

- [Разные identity для create/update] → единый helper принимает явный identity; парные тесты фиксируют одинаковую нормализацию и различие только источника identity.
- [48-bit hash теоретически коллидирует] → correctness обеспечивает tenant-scoped repository collision loop/discriminator и bounded retry, а не уникальность hash.
- [Concurrent create проходит lookup одновременно] → новый unique constraint является atomic arbiter, application выполняет ограниченный retry; тестировать race на PostgreSQL.
- [Existing duplicate data ломает migration] → table lock, deterministic reserved-set cleanup, повторный preflight и transactional rollback до создания constraint.
- [Downgrade не восстанавливает прежние duplicate names] → явно документировать data-preserving, но name-irreversible downgrade; строки, media и relations сохраняются.
- [Unicode slicing повреждает extension/видимость] → NFC и slicing Python по code points, строгий отдельный extension budget, тесты combining marks/emoji/CJK.
- [UUID check ошибочно пропустит local item] → сочетать `status === done` и строгую UUID-проверку; regression spy на API boundary.
- [Ingress 20m увеличивает допустимый request memory/traffic] → limit ограничен backend ingress и остаётся overrideable; monitoring 413/latency после deploy.
- [Smoke environment отсутствует при планировании] → не хардкодить credentials; до smoke найти контейнер labels/fallback и получить env/port через `docker inspect`, иначе gate фиксирует blocker.

## Migration Plan

1. Применить backend naming helper, model constraint, Alembic preflight/cleanup migration, collision-safe repository flow и tests.
2. Применить frontend guard и tests.
3. Отрендерить Helm chart default/override, затем deploy ingress annotation.
4. Выполнить общий Quality Gate и live smoke на реальной PostgreSQL.
5. Rollback: откатить frontend/backend/chart release вместе; изменение БД отсутствует. При необходимости отдельно вернуть ingress value к прежнему controller default.

## Open Questions

- Полное исходное имя не сохраняется отдельным полем: оно доступно только на входе и участвует в digest. Если UI должен позднее показывать оригинал целиком, потребуется отдельное поле и DB migration вне этого change.
- PostgreSQL container для smoke идентифицирован как `7c720ddc783d`; перед использованием исполнитель обязан подтвердить его labels/image/aliases/env/host port через актуальный `docker inspect` и приложить evidence.
