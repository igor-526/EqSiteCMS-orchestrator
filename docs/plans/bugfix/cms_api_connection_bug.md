# Bugfix: cms_api_connection_bug

**Тикет:** cms_api_connection_bug  
**Дата:** 2026-05-22  
**Затронутые сервисы:** `services/site-ad`  
**Статус:** реализация начата после согласования пользователя; добавлен срочный follow-up фикс портов

---

## Контекст

После добавления обязательного заголовка `X-Equestrian-Service-Key` в запросы consumer'а (`services/site-ad`) продовый сайт перестал загружать данные с backend API.

Актуальное уточнение пользователя от 2026-05-22:

- `EQUESTRIAN_SERVICE_KEY` нужно сохранить;
- объединять нужно не `EQUESTRIAN_SERVICE_KEY` и `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`, а публичные переменные `NEXT_PUBLIC_API_BASE_URL` и `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`;
- для `site-ad` не должно быть рассинхрона между `NEXT_PUBLIC_API_BASE_URL` и `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`;
- вероятная причина исходного инцидента может быть ошибкой в GitHub secret.

---

## Диагностика

Ранее зафиксированная диагностика показала:

- В pod окружение содержало только `NODE_ENV=production`, `PORT=5201`; `EQUESTRIAN_SERVICE_KEY`, `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`, `NEXT_PUBLIC_API_BASE_URL` в runtime env отсутствовали.
- В собранном bundle был найден API URL `https://api.eqcms/api` вместо ожидаемого `https://api.eqcms.ru/api`.
- В `services/site-ad/Dockerfile` был объявлен только `ARG NEXT_PUBLIC_API_BASE_URL`; build-args для service key передавались workflow, но не объявлялись в Dockerfile и поэтому игнорировались.
- В Helm `containerPort: 3000`, а Dockerfile выставлял `PORT=5201` и `EXPOSE 5201`; nginx слушал 5201, а k8s направлял трафик на 3000.

После первой реализации появился новый продовый симптом:

```text
Failed to start server
Error: listen EADDRINUSE: address already in use :::3000
```

Причина follow-up инцидента: после выравнивания Dockerfile на `PORT=3000` nginx и Next.js оказались настроены на один и тот же порт внутри контейнера:

- nginx слушал `${PORT:-3000}`;
- `next start` запускался с `-p 3000`;
- supervisor поднимал оба процесса, после чего Next.js получал `EADDRINUSE`.

Отдельный симптом:

```text
400 Bad Request
Request Header Or Cookie Too Large
nginx
```

Такой ответ возвращается nginx до попадания запроса в приложение, если клиент отправляет слишком большой `Cookie`/headers. В `services/site-ad` нет cookie-setting кода или redirect middleware, который мог бы генерировать cookie loop. Если после фикса портов 400 сохраняется только у отдельных пользователей, нужно очистить cookies для домена и/или настраивать лимиты ingress-nginx вне этого сервиса.

---

## Корневые причины

### Дефект 1 - неверное или устаревшее публичное значение в build-time конфигурации

Bundle содержал `https://api.eqcms/api`, хотя ожидается `https://api.eqcms.ru/api`.

Наиболее вероятные причины:

- в GitHub secret `NEXT_PUBLIC_API_BASE_URL` было неверное значение;
- значение было исправлено после сборки проблемного образа;
- Docker image был собран с устаревшим или некорректным secret.

### Дефект 2 - публичные `NEXT_PUBLIC_*` переменные велись как независимые

Пара `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` не должна управляться двумя независимыми GitHub secrets или build-args.

### Дефект 3 - `EQUESTRIAN_SERVICE_KEY` нельзя удалять

`EQUESTRIAN_SERVICE_KEY` сохраняется как отдельная переменная для service key. `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` не должен быть отдельным источником истины.

### Дефект 4 - port mismatch и port conflict

Исправленная модель:

- nginx остается входной точкой контейнера и слушает `PORT=3000`;
- Next.js слушает отдельный внутренний `NEXTJS_PORT=3001`;
- nginx проксирует на `127.0.0.1:3001`;
- Helm `containerPort: 3000` остается корректным, потому что Kubernetes должен ходить в nginx, а не напрямую в Next.js;
- `docker-compose.yaml` публикует host port на container port `3000`, не меняя внутренний порт контейнера.

---

## Access policy

Изменение не меняет API access policy EqSiteCMS:

| Endpoint class | Доступ | Изменение |
|---|---|---|
| `GET` Public Read API | public без пользовательской авторизации, с `X-Equestrian-Service-Key` для tenant context | не меняется |
| `POST`/`PATCH`/`DELETE` | protected write, авторизация и права | не меняется |

Новых endpoint-исключений план не вводит.

---

## Решение по env-переменным

Сохранить `EQUESTRIAN_SERVICE_KEY`:

```env
EQUESTRIAN_SERVICE_KEY=default-equestrian
```

Свести публичные переменные к одному управляемому источнику:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.eqcms.ru/api
```

`NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` не должен оставаться отдельной переменной, отдельным GitHub secret или отдельным build-arg со своим значением.

Каноническая модель:

| Назначение | Каноническая переменная | Комментарий |
|---|---|---|
| Public build-time config для consumer'а | `NEXT_PUBLIC_API_BASE_URL` | единый публичный источник вместо пары `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` |
| Service key | `EQUESTRIAN_SERVICE_KEY` | сохраняется, не удаляется |

---

## Файлы и изменения

### `services/site-ad/.github/workflows/check_and_deploy.yml`

В Docker build-args оставить канонические источники:

```yaml
build-args: |
  NEXT_PUBLIC_API_BASE_URL=${{ secrets.NEXT_PUBLIC_API_BASE_URL }}
  EQUESTRIAN_SERVICE_KEY=${{ secrets.EQUESTRIAN_SERVICE_KEY }}
```

Не использовать независимый `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY=${{ secrets.NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY }}`.

Перед деплоем вручную проверить GitHub secrets:

| Secret | Ожидаемое значение |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.eqcms.ru/api` |
| `EQUESTRIAN_SERVICE_KEY` | production `service_key` нужной конюшни, например `default-equestrian` |

### `services/site-ad/Dockerfile`

Builder и runner stage принимают:

```dockerfile
ARG NEXT_PUBLIC_API_BASE_URL
ARG EQUESTRIAN_SERVICE_KEY
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV EQUESTRIAN_SERVICE_KEY=$EQUESTRIAN_SERVICE_KEY
```

Port model:

```dockerfile
ENV PORT=3000
ENV NEXTJS_PORT=3001
EXPOSE 3000
```

nginx слушает `PORT`, а `proxy_pass` направляет запросы на `NEXTJS_PORT`.

### `services/site-ad/docker-compose.yaml`

Host port остается настраиваемым через локальный `PORT`, но target внутри контейнера фиксирован:

```yaml
ports:
  - "${PORT:-3000}:3000"
environment:
  - PORT=3000
  - NEXTJS_PORT=3001
```

### `services/site-ad/src/api/client.ts`

`NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` не используется как отдельный источник service key.

```ts
function resolveEquestrianServiceKey() {
  return (process.env.EQUESTRIAN_SERVICE_KEY || "default-equestrian").trim();
}
```

### `services/site-ad/.env.example`

Оставить:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api
EQUESTRIAN_SERVICE_KEY=default-equestrian
```

---

## Runtime vs build-time модель

| Переменная | Тип | Источник в проде | Где используется |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | build-time | GitHub secret -> Docker build-arg | browser bundle + SSR код Next.js |
| `EQUESTRIAN_SERVICE_KEY` | build-time или runtime, зависит от реализации | GitHub secret -> Docker build-arg или k8s env | server-side service-key context |
| `PORT` | runtime | Dockerfile/compose/k8s | nginx port inside container |
| `NEXTJS_PORT` | runtime | Dockerfile/compose | Next.js internal port inside container |

Важно: исправление GitHub secret требует новой сборки Docker image, потому что `NEXT_PUBLIC_*` значения встраиваются в Next.js bundle.

---

## Test matrix

| Area | Behavior diff | Required checks | Access scenario | Commands |
|---|---|---|---|---|
| `src/api/client.ts` - `resolveEquestrianServiceKey` | `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` не используется как отдельный источник; `EQUESTRIAN_SERVICE_KEY` сохранен | unit: env задан -> возвращается env; unit: env отсутствует -> fallback; unit: trim пробелов | Public Read GET tenant context | `npm test` |
| `src/api/client.ts` - `buildHeaders` | `X-Equestrian-Service-Key` ставится в GET без отдельного `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` secret | unit: GET содержит header; unit: POST не получает auto-header | GET Public Read / Protected Write без лишнего service-key header | `npm test` |
| `src/api/client.ts` - `resolveApiBaseUrl` | Проверить корректность `NEXT_PUBLIC_API_BASE_URL` | unit: `https://api.eqcms.ru/api` нормализуется без потери `.ru`; unit: trailing slash удаляется | Public Read API base URL | `npm test` |
| Docker build | Build не требует отдельного `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` secret | Проверить build-args без раскрытия secret value | Build-time config | `docker build ...` |
| Container startup | nginx и Next.js не конфликтуют по порту | supervisor поднимает nginx на 3000 и Next.js на 3001 | Public site | `docker run`, `curl -I` |
| Deploy | Порт Docker/Helm согласован | Pod отвечает через Service/Ingress | Public site | `kubectl get/describe` read-only, ручная проверка сайта |

---

## Чеклист

### Planner

- [x] Исправить ошибочное предыдущее решение, где `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` становился канонической заменой `EQUESTRIAN_SERVICE_KEY`
- [x] Зафиксировать сохранение `EQUESTRIAN_SERVICE_KEY`
- [x] Зафиксировать объединение публичной пары `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`
- [x] Зафиксировать, что `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` не должен быть отдельным GitHub secret
- [x] Зафиксировать, что access policy API не меняется
- [x] Зафиксировать follow-up дефект с `EADDRINUSE`

### Frontend / Site Consumer

- [ ] Проверить GitHub secret `NEXT_PUBLIC_API_BASE_URL`: значение должно быть `https://api.eqcms.ru/api`
- [ ] Проверить GitHub secret `EQUESTRIAN_SERVICE_KEY`: значение должно совпадать с production `service_key` конюшни
- [x] `services/site-ad/.github/workflows/check_and_deploy.yml`: удалить независимый `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` из Docker `build-args`
- [x] `services/site-ad/.github/workflows/check_and_deploy.yml`: сохранить `EQUESTRIAN_SERVICE_KEY` в Docker `build-args`
- [x] `services/site-ad/Dockerfile`: добавить/проверить `ARG EQUESTRIAN_SERVICE_KEY` в builder stage
- [x] `services/site-ad/Dockerfile`: добавить/проверить `ENV EQUESTRIAN_SERVICE_KEY=$EQUESTRIAN_SERVICE_KEY` в builder stage
- [x] `services/site-ad/Dockerfile`: `PORT=3000`, `EXPOSE 3000`
- [x] `services/site-ad/Dockerfile`: разделить nginx port и Next.js port через `NEXTJS_PORT=3001`
- [x] `services/site-ad/Dockerfile`: обновить nginx `proxy_pass` на `127.0.0.1:3001`
- [x] `services/site-ad/docker-compose.yaml`: мапить host port на container port `3000`
- [x] `services/site-ad/src/api/client.ts`: убрать чтение `process.env.NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` как отдельного источника
- [x] `services/site-ad/.env.example`: удалить `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY=default-equestrian`
- [x] `services/site-ad/.env.example`: сохранить `EQUESTRIAN_SERVICE_KEY=default-equestrian`
- [x] Не создавать отдельный secret/env-контур для `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` в рамках этого bugfix

### Quality Gate

- [x] `npm test` проходит из `services/site-ad`
- [x] `npm run lint` проходит из `services/site-ad` с существующими warnings
- [x] `npx tsc --noEmit` проходит из `services/site-ad`
- [x] `npm run build` проходит из `services/site-ad`
- [x] `docker build ...` проходит
- [x] `docker run ...` стартует без `EADDRINUSE`
- [x] `curl -I http://127.0.0.1:3080/` через nginx возвращает `200 OK`
- [x] Проверить, что generated nginx config слушает `3000` и проксирует на `3001`
- [x] Проверить, что в CI нет отдельного `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY` secret/build-arg со своим значением
- [x] Проверить, что `.env.example` содержит `NEXT_PUBLIC_API_BASE_URL` и `EQUESTRIAN_SERVICE_KEY`
- [x] Проверить, что `.env.example` не содержит `NEXT_PUBLIC_EQUESTRIAN_SERVICE_KEY`
- [x] Проверить, что Dockerfile содержит `ARG/ENV EQUESTRIAN_SERVICE_KEY`
- [x] Проверить, что Dockerfile и Helm используют согласованный внешний container port `3000`
- [ ] После деплоя: вручную открыть `https://ad.eqcms.ru` и убедиться, что данные загружаются
- [ ] После деплоя: проверить, что запросы идут к `https://api.eqcms.ru/api`, а не к `https://api.eqcms/api`
- [ ] Если nginx 400 остается у конкретного клиента: очистить cookies для `ad.eqcms.ru`/родительского домена или увеличить header limits в ingress-nginx вне этого сервиса
