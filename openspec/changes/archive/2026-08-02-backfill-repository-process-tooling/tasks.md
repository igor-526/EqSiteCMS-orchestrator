## 1. Проверка evidence — Process reviewer

- [x] 1.1 Сверить требования `repository-process-tooling` с repository evidence задач `001`, `005`, `008`, `021`, `022`, `023` и подтвердить отсутствие claims, основанных только на task/legacy plan
- [x] 1.2 Подтвердить явное сохранение gaps `G-005`, `G-021`, `G-023` и отсутствие утверждений об их закрытии
- [x] 1.3 Подтвердить, что access matrix и HTTP anonymous/authenticated проверки имеют значение `N/A`, а runtime API, auth, БД и сервисные контракты не заявлены

## 2. Пакетная проверка — Backend/tooling

- [x] 2.1 Устранить blocking findings Process reviewer только в пределах change `backfill-repository-process-tooling`
- [x] 2.2 Выполнить strict validation change и проверить path-scoped diff без runtime-файлов

## 3. Синхронизация и завершение — Backend/tooling

- [x] 3.1 После успешного review синхронизировать delta spec `repository-process-tooling` в main specs и повторить strict validation
- [x] 3.2 Архивировать change только после успешных review, sync и validation, сохранив gaps открытыми до отдельного evidence
