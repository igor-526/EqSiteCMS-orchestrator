## 1. Проверка consumer evidence

- [x] 1.1 Site Consumer reviewer сверяет Public Read matrix, service-key GET без CMS credentials, отсутствие CMS-only endpoint и трассировку задач `003`, `017`, `019` (родительская task `7.2`)
- [x] 1.2 Site Consumer reviewer проверяет фактический SSR/SSG/ISR режим, metadata, sitemap/robots, horse/pedigree DTO и сохранение gap `G-017` (родительская task `7.2`)

## 2. Пакетная синхронизация

- [x] 2.1 Backend/tooling после устранения findings выполняет strict validation, sync `site-consumer-contracts` в main specs, повторную validation и archive change (родительская task `7.5`)
