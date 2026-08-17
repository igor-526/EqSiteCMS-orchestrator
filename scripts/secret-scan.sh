#!/usr/bin/env bash
set -euo pipefail

scan_file=$(mktemp)
trap 'rm -f "$scan_file"' EXIT

git ls-files -- Makefile README.md SERVICES.md services.manifest scripts .docker-compose >> "$scan_file"
for service in backend email-service notification-service frontend; do
  git -C "services/$service" ls-files | sed "s#^#services/$service/#" >> "$scan_file"
done

if sort -u "$scan_file" | xargs -r grep -nE '(SECRET_KEY|SERVICE_KEY|PASSWORD|TOKEN)=[^<[:space:]][^[:space:]]{15,}' -- 2>/dev/null; then
  echo "Potential committed secret-like values found" >&2
  exit 1
fi
echo "Secret scan passed (placeholders and empty development values are allowed)."
