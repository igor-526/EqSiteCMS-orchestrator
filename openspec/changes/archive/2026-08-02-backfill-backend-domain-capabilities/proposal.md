## Почему

Исторические backend-задачи 002, 004, 006, 007, 009, 010, 011, 013, 014 и 019 реализовали связанные доменные, persistence, media и DTO-контракты, но эти контракты не представлены в main OpenSpec specs. Нужен evidence-based backfill, который отделяет подтверждённое runtime-поведение от незакрытого аудита `G-002` и отсутствующих live access-проверок.

## Что изменяется

- Добавляется единая capability `backend-domain-capabilities` для подтверждённых backend-контрактов цен, HTML page data, новостей, S3-медиа, лошадей, родословной, пород и обогащённых DTO родителей жеребят.
- Для endpoint-поверхности фиксируется access matrix: Public Read `GET`, Protected Write mutations и доказанное исключение Protected GET `/api/news-cms`.
- Отсутствующие anonymous/authenticated результаты не угадываются: они фиксируются как gaps, включая `G-002` и live-evidence gaps задач 004 и 009.
- UI и rendering сайтов-потребителей не включаются; runtime-код, API и БД не изменяются.

## Возможности

### Новые возможности

- `backend-domain-capabilities`: Evidence-based контракт backend-домена, persistence, media, DTO и связанной access policy для исторических задач пакета BE-2.

### Изменяемые возможности

Отсутствуют.

## Влияние

Change добавляет только OpenSpec-артефакты в `openspec/changes/backfill-backend-domain-capabilities/`. Источниками evidence служат назначенные backend code/tests/reports пакета BE-2; `services/backend`, frontend, site consumer и main specs не изменяются до отдельной проверенной sync-задачи.
