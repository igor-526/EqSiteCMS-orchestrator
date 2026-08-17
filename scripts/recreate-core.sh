#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
compose_dir="$repo_root/.docker-compose"

compose_core=(
  docker compose --env-file "$compose_dir/.env" -p eqsitecms-core
  -f "$compose_dir/docker-compose.infra.yml"
  -f "$compose_dir/docker-compose.be.yml"
  -f "$compose_dir/docker-compose.notification.yml"
  -f "$compose_dir/docker-compose.email.yml"
  -f "$compose_dir/docker-compose.fe.yml"
)

frontend_image='eqsitecms-core-frontend:latest'
frontend_candidate_id=$(docker image inspect --format '{{.Id}}' "$frontend_image" 2>/dev/null || true)
if [[ -z "$frontend_candidate_id" ]]; then
  echo "Missing CMS candidate image $frontend_image; run make build-nc first" >&2
  exit 1
fi

# Stop only the canonical core project. Volumes and database data are retained.
"${compose_core[@]}" down --remove-orphans

canonical_containers=(
  eqsitecms-app eqsitecms-notification-service eqsitecms-email-service
  eqsitecms-email-celery-worker eqsitecms-db eqsitecms-db-notifications
  eqsitecms-db-email eqsitecms-minio eqsitecms-nats eqsitecms-redis
  eqsitecms-frontend
)
legacy_projects='^(docker-compose|eqsitecms-be|eqsitecms-notification|eqsitecms-email|eqsitecms-fe)$'

for container in "${canonical_containers[@]}"; do
  if ! docker container inspect "$container" >/dev/null 2>&1; then
    continue
  fi
  actual_project=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container")
  if [[ "$actual_project" =~ $legacy_projects ]]; then
    echo "Removing legacy canonical-name container $container (project $actual_project)"
    docker rm -f "$container" >/dev/null
  else
    echo "Refusing to remove $container owned by unexpected project '$actual_project'" >&2
    exit 1
  fi
done

docker network inspect eqsitecms_network >/dev/null 2>&1 || docker network create eqsitecms_network >/dev/null

# Datastores/brokers must be ready before migrations. No peer API port is
# published by the canonical notification/email Compose files.
"${compose_core[@]}" up -d --force-recreate db db-notifications db-email minio nats redis

"${compose_core[@]}" run --rm notification-migration
"${compose_core[@]}" run --rm email-migration
"${compose_core[@]}" run --rm backend sh -c 'cd /eqsitecms/src && uv run alembic -c alembic.ini upgrade head'

"${compose_core[@]}" up -d --force-recreate \
  backend notification-service email-service celery-worker frontend

frontend_runtime_id=$(docker inspect --format '{{.Image}}' eqsitecms-frontend)
if [[ "$frontend_runtime_id" != "$frontend_candidate_id" ]]; then
  echo "CMS runtime image mismatch: candidate=$frontend_candidate_id runtime=$frontend_runtime_id" >&2
  exit 1
fi
echo "CMS runtime image verified: $frontend_image = $frontend_runtime_id"
