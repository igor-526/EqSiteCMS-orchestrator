# Core services release workflow

Core scope is limited to `backend`, `notification-service`, `email-service`, and CMS `frontend`; `site-*` is deliberately excluded.

1. Run `make check` and `make compose-check`. Both commands are non-mutating.
2. Run `make secret-scan`; inspect the result and rotate JWT, service, database, Redis, SMTP and object-storage credentials when ownership, environment or exposure changes. Record owner, system, rotation date and verification ticket outside the repository. Never commit the value.
3. Build reproducibly with `make build-nc`. The CMS build and canonical recreate both use the explicit `eqsitecms-core-frontend:latest` image identity; `recreate-core` fails if that candidate is absent or the recreated runtime container does not use its exact image ID.
   The canonical backend allows browser CORS from `http://localhost:3001`; `http://localhost:3000` remains available for the standalone CMS development server. Override `CMS_CORS_ORIGINS` explicitly for non-local deployments.
4. Apply migrations with `make migrate-core`, then use `make recreate-core` only during an approved maintenance window. Both commands use the single Compose project `eqsitecms-core`. Persistent resources have explicit stable names (the established `docker-compose_eqsitecms_*` volumes by default), so changing the Compose project does not select empty project-scoped volumes. An installation may override each name through the documented `EQSITECMS_*_VOLUME` variables after verifying ownership. `recreate-core` also reapplies all three migrations after bringing up the retained datastores, removes conflicting fixed-name containers only when their project label is on the explicit legacy allowlist, and never removes volumes.
5. Wait with `make health-core`; preserve `make status-core` and `make logs-core` output as release evidence.
6. Roll back by restoring the previous immutable image tags, running the explicitly reviewed backward migration when one exists, and repeating recreate/health/status under `eqsitecms-core`. Do not manually start the legacy `docker-compose` or split `eqsitecms-*` projects during rollback. Database restore is a separate approved operation; neither `migrate-core` nor `recreate-core` removes volumes or restores data automatically.

Production configuration fails at startup when required secrets use empty or audit-default values. Values in `.env.example` are placeholders, not production credentials.
