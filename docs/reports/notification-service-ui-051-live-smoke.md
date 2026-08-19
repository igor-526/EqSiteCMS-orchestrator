# Live smoke report: notification-service-ui-051

Дата: 2026-08-18  
API: `http://localhost:8001`  
Метод: smoke skill, live `curl`, cookie auth, реальные PostgreSQL/NATS; pytest smoke scripts не создавались.

## Infrastructure evidence

- PostgreSQL найдены по compose labels: `db` host port 5433, `db-notifications` 5434, `db-email` 5435. Актуальные env keys подтверждены через `docker inspect`; значения credentials не выводились и не коммитились.
- `email-service` пересоздан из актуального compose + `.env`: container healthy, startup `2026-08-18T15:31:56Z`.
- `backend`, `notification-service`, NATS и email consumer были live. Для notification-service локальный ignored `.env` исправлен с несуществующего DNS `eqsitecms-backend` на compose alias `backend`, после чего container пересоздан и стал healthy.
- В ходе smoke найдены и исправлены владельцами три runtime finding: gateway catalog filtering, единый backend NATS DI container, canonical uppercase roles и production callback-handler wiring. После каждого исправления соответствующие сценарии повторены.

## Results

| ID | Проверка | Результат |
|---|---|---|
| SM-01 | anonymous `GET /api/emails/me` | PASS: 401 |
| SM-02 | owner без email | PASS: 404 |
| SM-03 | owner create email | PASS: 201 |
| SM-04 | owner `emails/me` | PASS: 200, тот же owner/email |
| SM-05 | foreign create | PASS: 403 |
| SM-06 | owner update | PASS: 200, `approved=false` |
| SM-07 | foreign update | PASS: 403 |
| SM-08 | anonymous send-confirmation exception | PASS: 202 |
| SM-09 | invalid confirmation | PASS: 400 |
| SM-10 | immediate valid confirmation | PASS: 200, затем `approved=true`; token `****...****`, memory-only, очищен |
| SM-11 | reused confirmation | PASS: 409 |
| SM-12 | expired confirmation | PASS: 410; test row удалена |
| SM-13 | anonymous settings GET | PASS: 401 |
| SM-14 | ADMIN catalog | PASS: 200, только `callback/email` |
| SM-15 | SUPERUSER catalog | PASS: 200, только `callback/email` |
| SM-16 | DEVELOPER catalog | PASS: 200 `[]` |
| SM-17 | USER_MANAGER catalog | PASS: 200 `[]`; временная роль восстановлена |
| SM-18 | ADMIN enable + anonymous policy | PASS: authenticated 200, anonymous 401 |
| SM-19 | repeated enable | PASS: 200, DB rows=1 |
| SM-20 | ADMIN disable | PASS: 200, `enabled=false` |
| SM-21 | repeated disable | PASS: 200, DB rows=0 |
| SM-22 | ineligible PATCH | PASS: 403, DB unchanged |
| SM-23 | unknown event | PASS: 404 |
| SM-24 | unknown channel | PASS: 404 |
| SM-25 | malformed body | PASS: 400 |
| SM-26 | enabled + confirmed callback | PASS: callback 200; NATS seq 23; callback correlation `61f67bff-7db5-43bd-807e-0e342dc2ed36`; one email log `2ce491eb-b1bb-4e20-a364-2ac8b109911a`, one recipient, status sent |
| SM-27 | disabled callback | PASS: callback 200; correlation `3c3eed02-7418-48f2-8dac-d6f0cfea5b5a`; matching email logs=0 |
| SM-28 | enabled + unconfirmed | PASS: callback 200; correlation `74039665-0d5c-40d9-ac07-9e31c5c9389c`; matching email logs=0 |
| SM-29 | role revoked after enable | PASS: callback 200; correlation `280a9a3c-5a80-4824-ac14-a48344168471`; matching email logs=0 |
| SM-30 | three eligible enabled recipients | PASS: callback 200; NATS seq 27; correlation `d91234b5-d62a-49d1-aaf9-5e56ad9f8efa`; exactly one email log `b8264c86-aff0-4ef4-8459-c034d4c7d4a1` containing all three addresses; status sent |
| SM-31 | callback replay | PASS: same `Nats-Msg-Id=abf34a94-035f-4226-b8b9-7feee603b981`, JetStream `duplicate=true`, email log delta=0 |
| SM-32 | owner delete and read | PASS: DELETE 204, subsequent GET 404 without PII |

Итог: **32/32 PASS**.

## Endpoint timing evidence

Timing повторно измерен через `curl %{time_total}` на live API после исправлений Quality Gate. Для SM-26..SM-31 это повторные запросы того же callback endpoint; семантические E2E/correlation assertions сохранены из изолированного прогона выше.

| ID | Method | Endpoint | HTTP | Time |
|---|---|---|---:|---:|
| SM-01 | GET | `/api/emails/me` anonymous | 401 | 4.104 ms |
| SM-02 | GET | `/api/emails/me` owner missing | 404 | 59.926 ms |
| SM-03 | POST | `/api/emails` | 201 | 58.319 ms |
| SM-04 | GET | `/api/emails/me` owner existing | 200 | 113.332 ms |
| SM-05 | POST | `/api/emails` foreign owner | 403 | 131.365 ms |
| SM-06 | PATCH | `/api/emails` | 200 | 52.498 ms |
| SM-07 | PATCH | `/api/emails` foreign owner | 403 | 63.466 ms |
| SM-08 | POST | `/api/emails/send-confirmation` anonymous exception | 202 | 21.167 ms |
| SM-09 | PATCH | `/api/emails/confirm` invalid | 400 | 27.146 ms |
| SM-10 | PATCH | `/api/emails/confirm` valid memory-only token | 200 | 22.168 ms |
| SM-11 | PATCH | `/api/emails/confirm` reused | 409 | 25.105 ms |
| SM-12 | PATCH | `/api/emails/confirm` expired | 410 | 27.079 ms |
| SM-13 | GET | `/api/notification-settings` anonymous | 401 | 3.595 ms |
| SM-14 | GET | `/api/notification-settings` ADMIN | 200 | 74.834 ms |
| SM-15 | GET | `/api/notification-settings` SUPERUSER | 200 | 82.478 ms |
| SM-16 | GET | `/api/notification-settings` DEVELOPER | 200 | 45.114 ms |
| SM-17 | GET | `/api/notification-settings` USER_MANAGER | 200 | 37.188 ms |
| SM-18 | PATCH | `/api/notification-settings/callback/email` ADMIN | 200 | 142.267 ms |
| SM-18 policy | PATCH | `/api/notification-settings/callback/email` anonymous | 401 | 2.056 ms |
| SM-19 | PATCH | `/api/notification-settings/callback/email` repeated enable | 200 | 61.935 ms |
| SM-20 | PATCH | `/api/notification-settings/callback/email` disable | 200 | 56.301 ms |
| SM-21 | PATCH | `/api/notification-settings/callback/email` repeated disable | 200 | 47.681 ms |
| SM-22 | PATCH | `/api/notification-settings/callback/email` ineligible | 403 | 33.510 ms |
| SM-23 | PATCH | `/api/notification-settings/unknown/email` | 404 | 35.394 ms |
| SM-24 | PATCH | `/api/notification-settings/callback/unknown` | 404 | 31.570 ms |
| SM-25 | PATCH | `/api/notification-settings/callback/email` malformed | 400 | 32.997 ms |
| SM-26 | POST | `/api/callback_requests` | 200 | 32.918 ms |
| SM-27 | POST | `/api/callback_requests` | 200 | 28.894 ms |
| SM-28 | POST | `/api/callback_requests` | 200 | 27.066 ms |
| SM-29 | POST | `/api/callback_requests` | 200 | 77.573 ms |
| SM-30 | POST | `/api/callback_requests` | 200 | 45.814 ms |
| SM-31 | POST | `/api/callback_requests` replay source endpoint | 200 | 35.436 ms |
| SM-32 | DELETE | `/api/emails/{owner_id}` | 204 | 41.999 ms |
| SM-32 follow-up | GET | `/api/emails/me` after delete | 404 | 36.990 ms |

Timing coverage: **32/32 smoke IDs**, включая дополнительные anonymous/follow-up запросы access policy. Минимум 2.056 ms, максимум 142.267 ms. Полные response bodies проверены по контракту и не содержали неотмаскированных confirmation tokens.

## B-21 delivery evidence

Одна коррелированная команда была принята email-service для:

- `igor-526@yandex.ru`
- `iigorrr526@gmail.com`
- `devil.on.the.wheel526@gmail.com`

Цепочка: callback HTTP 200 (`event_id=abf34a94-035f-4226-b8b9-7feee603b981`) → `SITE_EVENTS` seq 27 → callback correlation `d91234b5-d62a-49d1-aaf9-5e56ad9f8efa` → notification command → email-service `email_logs.event_uuid=b8264c86-aff0-4ef4-8459-c034d4c7d4a1`, `status=sent`, `attempts=1`. Inbox не проверялся по принятому контракту.

Confirmation tokens извлекались только из test PostgreSQL в память процесса, немедленно использовались, в evidence полностью не записывались и после запроса очищались.

## Cleanup

- Временные scope changes восстановлены: `dev` снова `DEVELOPER`.
- Все три временные notification setting удалены: DB rows=0.
- Временные owner email records мягко удалены; три исходные legacy records восстановлены с исходными approved states.
- Expired confirmation setup row удалена; временных token-файлов не создавалось.
