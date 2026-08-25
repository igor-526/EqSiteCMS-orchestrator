# Live SMOKE: public callback request CORS

Дата: 2026-08-25  
Change: `public-callback-request-cors`  
Результат: **36/36 PASS**

## Среда и методика

- Проверялся реальный API `http://localhost:8001`, не pytest smoke-файлы.
- Авторизация SUPERUSER выполнена cookie-механизмом из smoke skill; credentials и cookies не записаны в отчёт.
- PostgreSQL найден свежим Docker discovery: container `eqsitecms-db`, image `postgres:16`, compose service `db`, host port `5433`. Значения пароля и selector скрыты.
- Backend runtime использует bind mount актуального `services/backend/src`; health endpoint вернул `200`.
- Consumer origin: `https://site-ad-smoke.example`; foreign origin: `https://foreign-smoke.example`; разрешённый CMS origin: `http://localhost:3001`.
- Для изменяющих сценариев проверялись PostgreSQL row counts и сохранённые значения до/после запроса.

## Результаты

| Tasks | Проверка | Результат | Evidence |
|---|---|---:|---|
| B38–B44 | Public callback preflight | PASS | `200`; ACAO `*`; methods `POST, OPTIONS`; allow headers `Content-Type, X-Equestrian-Service-Key`; credentials отсутствует |
| B45 | Unknown requested header | PASS | `400`; ACAO отсутствует |
| B46–B48 | PATCH/DELETE/PUT exact callback preflight | PASS | каждый `400`; ACAO отсутствует |
| B49–B51 | trailing slash, похожий prefix, service PATCH | PASS | каждый `400`; public exception не применён |
| B52 | Valid anonymous POST | PASS | `201`; ACAO `*`; credentials отсутствует; PostgreSQL delta `+1` |
| B53–B54 | Missing/invalid selector | PASS | `401`; ACAO `*`; PostgreSQL delta `0` |
| B55 | Malformed JSON | PASS | `422`; ACAO `*`; PostgreSQL delta `0` |
| B56 | Missing optional `name` | PASS | `201`; ACAO `*`; credentials отсутствует; PostgreSQL delta `+1`; сохранено `name IS NULL` |
| B57 | Empty invalid phone | PASS | `422`; ACAO `*`; PostgreSQL delta `0` |
| B58 | Extra field | PASS | `201`; ACAO `*`; credentials отсутствует; unknown field отсутствует в response и PostgreSQL |
| B59 | Unicode name/comment | PASS | `201`; ACAO `*`; PostgreSQL delta `+1`; Unicode сохранён точно |
| B60 | Empty optional comment | PASS | `201`; PostgreSQL delta `+1`; `length(comment)=0` |
| B61 | Two sequential valid POST | PASS | два ответа `201`; PostgreSQL delta `+2`; два distinct UUID |
| B62 | Actual POST без Origin | PASS | `201`; CORS headers отсутствуют |
| B63 | CMS-origin anonymous POST | PASS | `201`; reflected ACAO; credentials `true`; `Vary: Origin` |
| B64 | CMS-origin preflight | PASS | `200`; reflected ACAO; credentials `true`; `Vary: Origin` |
| B65 | Foreign-origin auth POST | PASS | `401`; ACAO отсутствует |
| B66–B67 | Foreign callback status/spam PATCH | PASS | `401`; ACAO отсутствует; PostgreSQL state не изменён |
| B68 | Foreign service delivery PATCH | PASS | `401`; ACAO отсутствует; PostgreSQL state не изменён |
| B69 | Anonymous protected callback list | PASS | `401`; ACAO `*`; response содержит только generic auth detail, PII отсутствует |
| B70 | Public callback statuses GET | PASS | `200`; ACAO `*`; статусы `1` и `2` |
| B71 | Другой Public GET | PASS | `GET /api/horses/breeds?limit=1` вернул `200`; ACAO `*` |
| B72 | Разрешённый CMS protected write | PASS | authenticated PATCH `200`; reflected ACAO; credentials `true`; `Vary: Origin`; исходный status восстановлен |
| B73 | Cleanup | PASS | удалено 9 синтетических rows; marker rows `0`; missing-name row `0`; baseline восстановлен |

## Уточнение B56/B58

После уточнения approved artifacts Planner зафиксировал существующий create DTO contract без runtime-изменений: `name` optional, а неизвестные extra fields игнорируются. Изолированный повторный live-прогон подтвердил оба сценария:

- B56: `201`, ACAO `*`, credentials header отсутствует; создана ровно одна строка с `name IS NULL` и точным phone.
- B58: `201`, ACAO `*`, credentials header отсутствует; unknown field отсутствует в response, колонка для него отсутствует в PostgreSQL и значение не попало в сохраняемые поля.

Открытых smoke findings нет.

## Cleanup и validation

- Все синтетические callback rows удалены напрямую из реальной PostgreSQL после восстановления изменённого статуса. Повторный B56/B58 прогон создал и затем удалил ещё 2 строки.
- Контроль после cleanup: marker rows `0`, synthetic null-name rows `0`, исходный baseline восстановлен.
- Cookie и response evidence находились только во временном каталоге; секреты не выводились.
- `openspec validate public-callback-request-cors --strict`: PASS (`Change 'public-callback-request-cors' is valid`).
