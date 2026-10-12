## Why

`make be-build-nc` завершается при проверке Docker build context: клиент не может читать вложенный `src/api/__pycache__/yandex.cpython-313.pyc`. Python bytecode не является исходным материалом образа и должен быть исключён независимо от прав существующих caches; предупреждение об отсутствии buildx не является указанной fatal ошибкой.

Исходный запрос: [задача 092](<../../../docs/tasks/092_backend_build_context_bytecode.md>).

## What Changes

- В [backend .dockerignore](<../../../services/backend/.dockerignore>) исключить `__pycache__` на любой глубине и Python bytecode, сохранив текущие независимые исключения.
- В [backend Dockerfile](<../../../services/backend/Dockerfile>) задать `ENV PYTHONDONTWRITEBYTECODE=1` до установки зависимостей и копирования исходников, чтобы обычные Python-процессы образа не создавали новые caches, включая writable bind mount.
- Не менять права, владельцев, Makefile, compose, пользователя контейнера, build engine или код API; существующие caches оставлять нетронутыми.

## Capabilities

### New Capabilities

- `backend-build-context-hygiene`: рекурсивное исключение Python caches из контекста backend и отключение автоматической записи bytecode в образе.

### Modified Capabilities

Нет. Прочитанный при диагностике `build-system` описывал инфраструктуру SEO, а не данный контракт backend; к концу unit файл оказался удалён параллельной чужой работой. Новый backend-контракт от него не зависит.

## Impact

Два будущих implementation-файла отдельного backend-репозитория: [`.dockerignore`](<../../../services/backend/.dockerignore>) и [Dockerfile](<../../../services/backend/Dockerfile>). Context остаётся `services/backend`; команды `be-build` / `be-build-nc` неизменны. API, БД, NATS, frontend и зависимости не меняются. Access matrix, anonymous/authenticated tests: **N/A**, endpoint changes отсутствуют.

Статус планирования: после strict validation — apply-ready по артефактам; apply допускается только после явного пользовательского approval. Полная сборка и проверки образа запланированы после approval, в текущем unit не выполняются.
