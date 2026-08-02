## 1. Профильная проверка

- [x] 1.1 Backend reviewer сверяет каждое доменное, persistence, media и DTO-требование с назначенными code/tests/reports задач 002, 004, 006, 007, 009, 010, 011, 013, 014 и 019
- [x] 1.2 Access reviewer сверяет все строки access matrix, включая tenant key, anonymous/authenticated/no-scope, foreign-resource поведение, исключение `GET /api/news-cms` и gaps отсутствующего live evidence
- [x] 1.3 Владелец spec устраняет все blocking findings, не изменяя runtime и чужие capability-пакеты

## 2. Синхронизация пакета

- [x] 2.1 Backend/tooling выполняет strict validation проверенного change
- [x] 2.2 Backend/tooling синхронизирует delta spec в main specs и подтверждает идемпотентность повторной sync
- [x] 2.3 Backend/tooling повторно валидирует main specs и архивирует change только после успешных reviews
