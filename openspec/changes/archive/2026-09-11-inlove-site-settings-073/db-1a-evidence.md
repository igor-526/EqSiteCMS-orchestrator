# DB-1a evidence — local horse-service groups

Date: 2026-09-11  
Scope: local PostgreSQL only; tenant selector `inlove`  
Reproducible artifact: `services/backend/maintain/ensure_inlove_horse_service_groups.sql`

The SQL resolves `inlove` and aborts unless it maps to the approved tenant UUID
recorded in `design.md`. It inserts only missing exact-name rows, does not update
an existing exact-name row, and verifies all three required name/slug pairs before
commit. A conflicting slug or an unexpected tenant mapping aborts the transaction.

The original DB-1a inventory recorded in `design.md` contained zero rows for this
tenant. The completed operation created these sanitized values:

```text
name       | slug       | description                         | price | formatter
Занятия    | zanyatiya  | Описание будет добавлено позднее.   | 0     | discuss
Прогулки   | progulki   | Описание будет добавлено позднее.   | 0     | discuss
Постой     | postoy     | Описание будет добавлено позднее.   | 0     | discuss
```

## Rework verification

Before the reproducibility check, the local tenant already contained the three
rows created by DB-1a. A fingerprint over the non-temporal business columns was:

```text
inlove | rows=3 | md5=8b8ec1eba400bb7395df399642559894
```

The committed script was then executed twice with `psql` and
`ON_ERROR_STOP`. Both runs completed with `INSERT 0 0`, proving the established
state is a no-op. The resulting fingerprint remained:

```text
inlove | rows=3 | md5=8b8ec1eba400bb7395df399642559894
```

Before and after both runs, all other tenants had the same count and fingerprint
over tenant UUID, row UUID, and all non-temporal business columns:

```text
other tenants | rows=3 | md5=e157883e2f0f880ceeb17a9975fa96fb
```

Anonymous Public Read verification used
`GET /api/horses/services?limit=100` with
`X-Equestrian-Service-Key: inlove`. It returned HTTP 200, `total=3`, and exactly
the three name/slug pairs above. The same request with a missing selector and an
invalid selector returned HTTP 401 in both cases.

No connection string, credential, full tenant dataset, or data from another
tenant is stored in this evidence.
