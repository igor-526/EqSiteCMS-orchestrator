# Callback requests 055 — live API/PostgreSQL/NATS smoke

Date: 2026-08-24 (Europe/Moscow)  
Change: `callback-requests-management-055`  
Method: skill `smoke`, real Docker runtime only; no pytest smoke files, mocks, SQLite or in-memory substitutes.

## Runtime and discovery

- Backend: `http://localhost:8001`, container `eqsitecms-app`, healthy.
- PostgreSQL: container found by fallback name `eqsitecms-db`; compose service label is `db` (project label is `eqsitecms-core`), host port obtained with `docker inspect`: `5433`.
- NATS: `eqsitecms-nats`; real JetStream streams `SITE_EVENTS` and `NOTIFICATION_COMMANDS` inspected through `nats-py` inside the notification container.
- Notification service: `eqsitecms-notification-service`, healthy; durable `notification-service-callback-requested` reached stream/ack floor 40 with zero pending/ack-pending.
- Credentials were loaded from `.claude/skills/api-smoke-test/credentials.json`; secrets and selector values were not printed. Tested roles: ADMIN, SUPERUSER, developer (forbidden role), anonymous; service and tenant selector keys were read from runtime/DB without disclosure.

Commands used included `docker inspect`, `docker exec ... psql`, `docker exec eqsitecms-app ... alembic`, container restart/health polling, live HTTP requests with cookie sessions, and JetStream stream/message/consumer inspection via `nats-py`.

## Result summary

42/42 scenarios passed after the backend fixes and a focused live rerun. The temporary notification recipient fixtures used for tasks 1.90–1.92 were removed after evidence collection.

| Task | Result | Live evidence |
|---|---|---|
| 1.54 | PASS | Upgrade produced both real tables, PK/unique/FK/check constraints and both required callback indexes. |
| 1.55 | PASS | With callback table initially empty: `c055bacc0001 -> f3a1c7d9e245 -> c055bacc0001`; re-upgrade succeeded and schema objects were restored. |
| 1.56 | PASS | Backend restarted twice (real startup seed); registry remained exactly `1/Новая/#1677FF`, `2/Обработана/#52C41A`. |
| 1.57 | PASS | Anonymous selector POST returned 201; matching UUID row was present in PostgreSQL. |
| 1.58 | PASS | Cookie-authenticated POST without selector returned 201 and persisted in the authenticated tenant. |
| 1.59 | PASS | Missing selector returned 401; DB count changed only for successful creates. |
| 1.60 | PASS | Invalid selector returned 401; no partial row. |
| 1.61 | PASS | Focused rerun: missing and empty phone both returned 422; no row was created. |
| 1.62 | PASS | 127-char Cyrillic name, 63-char phone and 2000-char Cyrillic comment returned 201 and round-tripped UTF-8 without loss. |
| 1.63 | PASS | Focused rerun: oversized name, phone and comment each returned 422 without partial row. |
| 1.64 | PASS | DB showed status=1, spam=false, delivered=false and timestamptz values in UTC (`+00`). |
| 1.65 | PASS | Anonymous and authenticated statuses GET returned 200 and exactly the two seeded rows. |
| 1.66 | PASS | List: anonymous 401, developer 403, ADMIN 200, SUPERUSER 200. |
| 1.67 | PASS | Detail: anonymous 401, developer 403, own-tenant ADMIN/SUPERUSER 200. |
| 1.68 | PASS | Selector-created foreign-tenant UUID returned 404 for ADMIN detail and status mutation; it did not appear in ADMIN tenant list. |
| 1.69 | PASS | Default list excluded the real spam row and followed status/created_at/id order. |
| 1.70 | PASS | Multi-status returned only selected codes; status=1-only assertion passed. |
| 1.71 | PASS | true, false, combined and default spam filters were checked on real spam/non-spam data; combined count equalled the disjoint totals. |
| 1.72 | PASS | Timezone-aware from/to worked; equality at an exact stored timestamp included the boundary record. |
| 1.73 | PASS | Case-insensitive Cyrillic (`ИВАН`) and Latin (`gamma`) regex matched persisted rows. |
| 1.74 | PASS | Digits/punctuation matching passed; focused rerun confirmed invalid `[` returns 422. |
| 1.75 | PASS | Case-insensitive comment search matched `MiXeD`; nullable comment rows did not break the query. |
| 1.76 | PASS | Focused rerun confirmed both oversized regex and dangerous `(a+)+` return 422 quickly. |
| 1.77 | PASS | Initial/next/empty pages and page size were checked; adjacent pages contained no duplicate IDs. |
| 1.78 | PASS | Two newly created smoke rows were aligned to the same timestamp in PostgreSQL; consecutive limit=1 pages returned their UUIDs in deterministic ascending tie-break order. |
| 1.79 | PASS | All four valid sort combinations returned correctly ordered results; focused rerun confirmed invalid sort returns 422. |
| 1.80 | PASS | Status PATCH: anonymous 401, developer 403, ADMIN/SUPERUSER 200. |
| 1.81 | PASS | Unknown status returned controlled 400 (`Неизвестный статус`) and the source row was unchanged; spec allows contract error. |
| 1.82 | PASS | spam=true returned 200 and PostgreSQL atomically stored spam=true/status=2. |
| 1.83 | PASS | spam=false returned 200 and retained status=2. |
| 1.84 | PASS | Extra `phone` in narrow mutation returned 422 and applicant data was unchanged. |
| 1.85 | PASS | Service status: valid key 200, missing/invalid 401, missing UUID 404. |
| 1.86 | PASS | Service spam: invalid key 401/no change; valid key 200 and status invariant held. |
| 1.87 | PASS | Valid delivery confirmation was idempotent (two 200 responses, DB true); invalid key 401; false rejected with controlled 400 and did not reset true. |
| 1.88 | PASS | Concurrent real service status/spam PATCH both returned 200; DB query found zero `is_spam=true AND status<>2` rows. |
| 1.89 | PASS | New persisted events appeared in SITE_EVENTS with payload keys `callback_request_id, occurred_at, phone, name, comment`, `Nats-Msg-Id`, and no `X-Equestrian-Id`; durable consumer acked through the new sequence. |
| 1.90 | PASS | A temporary existing-SUPERUSER callback setting plus active approved `callback055-smoke@example.com` recipient produced a real command at NOTIFICATION_COMMANDS seq 38. Subject/body contained all applicant fields, contained no UUID, and transport retained `Nats-Msg-Id`. |
| 1.91 | PASS | No-recipient branch remained false. With the temporary eligible recipient, downstream command count increased 15→16 and callback DB flag became true on the second poll, without waiting for SMTP receipt. |
| 1.92 | PASS | Same transport ID was JetStream-deduplicated. Forced redelivery of the same callback payload with a new transport ID was acked through SITE_EVENTS seq 43, while NOTIFICATION_COMMANDS remained 16, callback row count remained one and delivery remained true. Temporary recipient/setting rows were then deleted. |
| 1.93 | PASS | Invalid create/mutations left row counts and values unchanged; unknown FK status rolled back without invalid FK/partial update. |
| 1.94 | PASS | Live create/list/detail response keys were exactly public DTO fields; no tenant/equestrian/service key fields appeared. |
| 1.95 | PASS | All Smoke points were executed through skill `smoke` on real API/PostgreSQL/NATS; no pytest/mocks/in-memory substitute was used. |

## Focused rerun closure

- Backend fixes closed all earlier 400/422 and dangerous-regex findings on the real API.
- Notification success/no-recipient and duplicate/redelivery branches were all exercised. The temporary callback setting and approved `example.com` email were deleted afterward; no real address or SMTP receipt was used.

No product code was changed. Smoke-created callback rows were retained as QA fixtures; no pre-existing callback rows existed before the run.
