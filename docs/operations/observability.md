# Sentry и Prometheus в EqSiteCMS

Документ описывает реализацию observability для core backend, email-service,
notification-service, CMS frontend и публичного `site-ad`. Он не вводит новые
business API endpoint'ы, NATS subjects или изменения БД.

## Архитектура

| Приложение | Sentry | Prometheus |
|---|---|---|
| `services/backend` | Python SDK, FastAPI и SQLAlchemy integrations | FastAPI Instrumentator + отдельный production listener `0.0.0.0:9000` |
| `services/email-service` | Python SDK, FastAPI и SQLAlchemy integrations | FastAPI Instrumentator + отдельный production listener `0.0.0.0:9000` |
| `services/notification-service` | Python SDK, FastAPI и SQLAlchemy integrations | FastAPI Instrumentator + отдельный production listener `0.0.0.0:9000` |
| `services/frontend` | `@sentry/nextjs`, client/server/edge и global error boundary | Не применяется |
| `services/site-ad` | `@sentry/nextjs`, client/server/edge и global error boundary | Не применяется |

Python-сервисы используют локальные observability adapters, но единый контракт:
disabled Sentry является no-op, production Prometheus listener создаётся один
раз и идемпотентно закрывается при shutdown. Metrics port не публикуется через
Docker Compose на host и предназначен только для scraper во внутренней сети.

Next.js-приложения инициализируют официальный SDK отдельно для client, server и
edge runtime. Global error boundary фиксирует одну ошибку один раз и показывает
пользователю нейтральный fallback с повтором действия.

## Переменные окружения

Во всех пяти приложениях используются одинаковые имена:

| Переменная | Назначение | Безопасное значение по умолчанию |
|---|---|---|
| `SENTRY_ENABLED` | Явно включает SDK только при значении `true` без учёта регистра | `false` |
| `SENTRY_DSN` | DSN проекта Sentry; обязателен при enablement | пусто |
| `SENTRY_ENVIRONMENT` | Имя окружения (`development`, `staging`, `production`) | пусто либо `development` в backend |
| `SENTRY_TRACES_SAMPLE_RATE` | Доля tracing от `0` до `1` | `0` |
| `SENTRY_RELEASE` | Версия image/release для группировки событий | пусто |

Значение `SENTRY_TRACES_SAMPLE_RATE` вне диапазона `0..1` отклоняется. Включение
без DSN также считается ошибкой конфигурации, а не причиной незаметно отключить
monitoring.

Реальные DSN не записываются в tracked `.env.example`, отчёты или команды.
`SENTRY_AUTH_TOKEN` не поддерживается этим change и не должен попадать в `.env`,
Docker build args, image или browser bundle. Если потребуется загрузка source
maps, токен нужно передавать краткоживущим CI secret в отдельном change.

## Next.js: build-time и runtime

Browser Sentry configuration встраивается командой `next build`. Поэтому после
изменения `SENTRY_ENABLED`, DSN, environment, rate или release frontend image
нужно пересобрать. Runtime-подмена переменной в уже собранном контейнере не
обновит client bundle.

CMS image можно собрать целевым Make target из `services/frontend`:

```bash
SENTRY_ENABLED=false make build
```

Для QA/production передавайте значения из secret-aware deployment environment,
не печатая их в shell history или build logs. Корневой compose передаёт ту же
матрицу как build args из environment и применяет безопасные defaults.

`site-ad/Dockerfile` принимает пять переменных на builder и runner stages.
Собирайте image заново при любом изменении browser-конфигурации.

## Sanitization и безопасность

- `sendDefaultPii` выключен.
- Observability adapters удаляют request body/data, cookies и чувствительные
  headers/keys: authorization, service/tenant keys, passwords, secrets, tokens и
  DSN-подобные поля.
- Unit/component tests используют mocked SDK и не обращаются к live Sentry или
  backend.
- DSN является адресом приёма событий, но его всё равно нельзя печатать в
  документации и evidence.
- Prometheus listener `:9000` не является Public Read API. Не публикуйте его на
  host/public ingress без отдельного security review.

Перед production rollout дополнительно проверьте Sentry server-side project
filters, retention и scrub rules.

## Prometheus lifecycle и scrape

Listener создаётся только при `ENVIRONMENT=production`:

- адрес: `0.0.0.0` внутри контейнера;
- port: `9000`;
- path: `/metrics`;
- registry: тот же default registry, куда FastAPI Instrumentator регистрирует
  HTTP metric families;
- shutdown: `shutdown()`, `server_close()` и `thread.join()` выполняются один раз.

Scrape выполняйте из контейнера/агента той же Docker network. Пример логики
проверки (имя контейнера выбирается из effective Compose config):

```bash
docker exec <service-container> python -c \
  "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:9000/metrics').status)"
```

В development отдельный listener не открывается. Port `9000` на host может быть
занят MinIO — это не metrics port backend-контейнеров.

## Проверка перед релизом

Backend-сервисы:

```bash
cd services/backend && make lint && make test
cd services/email-service && make lint && make test
cd services/notification-service && make lint && make test
```

CMS frontend:

```bash
cd services/frontend
npm test
npm run lint
npm run typecheck
npm run build
```

Public consumer:

```bash
cd services/site-ad
npm test
npx tsc --noEmit
npm run build
```

Текущий `site-ad` script `npm run lint` вызывает удалённую из Next.js 15 команду
`next lint`; до исправления script это известный tooling gap, который нужно
явно фиксировать в Quality Gate, а не выдавать за успешную проверку.

Live backend smoke выполняется только через project skill `smoke` на поднятых
API и реальной PostgreSQL. Перед smoke параметры БД заново получают через
`docker inspect`; значения из документации не используются как credentials.

Для manual UI QA проверяют:

1. disabled build: нет envelope-запросов, CMS anonymous guard и authenticated
   render не изменены, `site-ad` остаётся anonymous Public Read;
2. enabled QA build с тестовым проектом: по одной client/server/edge ошибке,
   ровно одно sanitized событие на ошибку и работоспособный global fallback;
3. desktop `1440×900`, tablet `768×1024`, mobile `390×844`: нет горизонтального
   overflow, overlap или недоступной кнопки повтора;
4. CMS сохраняет обработку backend `401/403`, consumer не импортирует CMS-only
   boundary;
5. screenshots сохраняют только для failed responsive/error cases, network
   evidence предварительно санитизируют.

## Rollout

1. Собрать и проверить image с `SENTRY_ENABLED=false`.
2. В staging/QA включить Sentry с тестовым DSN и `SENTRY_TRACES_SAMPLE_RATE=0`.
3. Проверить client/server/edge events и sanitization, затем назначить release.
4. Пересобрать frontend images с production browser-конфигурацией.
5. Подключить Prometheus scraper только к внутренним `:9000/metrics`.
6. После оценки объёма событий постепенно увеличить tracing rate.

## Troubleshooting

| Симптом | Проверка |
|---|---|
| Sentry выключен | Сверить `SENTRY_ENABLED=true`; значение должно попасть в build stage Next.js |
| Startup падает с DSN error | Передать непустой DSN либо вернуть `SENTRY_ENABLED=false` |
| Rate validation error | Использовать число от `0` до `1` |
| Browser не отправляет события после смены env | Пересобрать frontend image; runtime restart недостаточен |
| Нет server/edge event | Проверить соответствующие Sentry config и `instrumentation.ts`, environment/release |
| Дублируются events | Проверить, что error capture проходит через одну boundary и guard повторного capture |
| `:9000/metrics` недоступен | Проверить production environment, container lifecycle и внутреннюю network; не обращаться к host MinIO port |
| Metrics есть, HTTP series нет | Сначала выполнить `/health`, затем проверить общий registry и Instrumentator wiring |
| Port занят после restart | Проверить graceful close server/thread и отсутствие второго процесса listener |

## Rollback

- Sentry: установить `SENTRY_ENABLED=false`; для Next.js обязательно пересобрать
  images, backend достаточно перезапустить с новой runtime-конфигурацией.
- Prometheus regression: вернуть предыдущий observability-only image/commit;
  business API, NATS и DB миграций у change нет.
- Не удалять Sentry project или telemetry во время rollback без отдельного
  разрешения и retention решения.

