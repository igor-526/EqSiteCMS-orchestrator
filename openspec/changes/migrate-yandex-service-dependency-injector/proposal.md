## Why

В `yandex-service` сборка зависимостей распределена между `src/depends`, глобальными настройками и глобальным engine. Согласованный переход на `dependency_injector` должен собрать bootstrap в контейнеры и сохранить отдельную транзакцию для каждого запроса.

## What Changes

- Удалить пакет `depends` и использование FastAPI `Depends` полностью.
- Создавать настройки, engine/sessionmaker, OAuth client и encryption через application-контейнеры.
- Создавать изолированный RequestContainer внутри явного `async with` для каждого HTTP-запроса; сохранить commit/rollback/close.
- Предоставить `create_app(container=None)` и `app.state.container`, сохранив entrypoint `main:app`.
- Перевести Sentry и Alembic на явное получение настроек; миграции не требуют OAuth ENV.
- По прямому follow-up пользователя «Давай ещё разнесём отдельно настройки Sentry» выделить независимый SentrySettings и lazy provider; миграции не зависят от Sentry validation.
- По прямому follow-up пользователя «Давай переделаем» передать lifecycle DB engine async Resource и init_resources/shutdown_resources; разрешать async request_scope явно, сохранив транзакции request-scope.
- Сохранить HTTP/OAuth контракты, бизнес-классы и пользовательские изменения dependency/lockfile/containers.

## Capabilities

### New Capabilities

- `yandex-service-dependency-injection`: контейнерная сборка приложения, изолированные request-scopes и совместимость существующего API/bootstrap.

### Modified Capabilities

Отсутствуют: внешний контракт существующих возможностей сохраняется.

## Impact

Только `services/yandex-service`: containers, database lifecycle, settings, main/API, Sentry, Alembic, тесты и README. Зависимость `dependency-injector>=4.49.1` уже добавлена пользователем. Изменяется сборка `/health`, `GET /api/auth/link`, `POST /api/auth/code`; access matrix приведена в delta spec. Схема БД, другие сервисы и внешние контракты не меняются. План согласован пользователем с явным поручением начать реализацию; повторное approval не требуется.
