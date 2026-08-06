# =====VARIABLES=====
COMPOSE_DIR = .docker-compose
SERVICES_DIR = services

# Docker compose files
COMPOSE_BE = $(COMPOSE_DIR)/docker-compose.be.yml
COMPOSE_NOTIFICATION = $(COMPOSE_DIR)/docker-compose.notification.yml
COMPOSE_FE = $(COMPOSE_DIR)/docker-compose.fe.yml
COMPOSE_INFRA = $(COMPOSE_DIR)/docker-compose.infra.yml

# Docker compose commands (base, без -p — добавляется в таргетах)
DC_BE = docker compose -f $(COMPOSE_BE)
DC_NOTIFICATION = docker compose -f $(COMPOSE_NOTIFICATION)
DC_FE = docker compose --env-file services/frontend/.env -f $(COMPOSE_FE)
DC_INFRA = docker compose -f $(COMPOSE_INFRA)

SERVICES_MANIFEST ?= services.manifest

.PHONY: sync update services-branches \
        build be-build be-build-nc notification-build notification-build-nc fe-build fe-build-nc \
        be be-attach notification notification-attach fe fe-attach infra \
        test lint format be-makemigrations be-migrate

# =====ORCHESTRATOR COMMANDS=====

sync:
	@echo "Syncing all services..."
	@bash scripts/sync.sh

update: sync

services-branches:
	@echo "=== Git branches (services) ==="
	@echo ""
	@printf "%-28s %-36s %s\n" "PATH" "BRANCH" "WORKTREE"
	@printf "%-28s %-36s %s\n" "----------------------------" "------------------------------------" "----------"
	@if [ -d .git ]; then \
		br=$$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?"); \
		if [ "$$br" = "HEAD" ]; then br="detached @$$(git rev-parse --short HEAD 2>/dev/null)"; fi; \
		n=$$(git status --porcelain 2>/dev/null | wc -l | tr -d ' '); \
		[ "$$n" = "0" ] && wt=clean || wt="dirty ($$n files)"; \
		printf "%-28s %-36s %s\n" "orchestration (monorepo root)" "$$br" "$$wt"; \
	else \
		printf "%-28s %-36s %s\n" "orchestration (monorepo root)" "(not a git repo)" "-"; \
	fi
	@while IFS= read -r line || [ -n "$$line" ]; do \
		case "$$line" in ""|\#*) continue ;; esac; \
		svc=$${line%%[[:space:]]*}; \
		[ -z "$$svc" ] && continue; \
		dir="services/$$svc"; \
		if [ ! -d "$$dir" ]; then \
			printf "%-28s %-36s %s\n" "$$dir" "(directory missing)" "-"; \
			continue; \
		fi; \
		if [ ! -e "$$dir/.git" ]; then \
			printf "%-28s %-36s %s\n" "$$dir" "(not a git clone)" "-"; \
			continue; \
		fi; \
		br=$$(git -C "$$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?"); \
		if [ "$$br" = "HEAD" ]; then br="detached @$$(git -C "$$dir" rev-parse --short HEAD 2>/dev/null)"; fi; \
		n=$$(git -C "$$dir" status --porcelain 2>/dev/null | wc -l | tr -d ' '); \
		[ "$$n" = "0" ] && wt=clean || wt="dirty ($$n files)"; \
		printf "%-28s %-36s %s\n" "$$dir" "$$br" "$$wt"; \
	done < $(SERVICES_MANIFEST)
	@echo ""
	@echo "Source list: $(SERVICES_MANIFEST)"

%:
	@:

# =====BUILD COMMANDS=====

build: be-build notification-build fe-build

be-build:
	@echo "Building backend image..."
	$(DC_BE) -p eqsitecms-be build

be-build-nc:
	@echo "Building backend image without build cache..."
	$(DC_BE) -p eqsitecms-be build --no-cache

notification-build:
	@echo "Building notification service image..."
	$(DC_NOTIFICATION) -p eqsitecms-notification build

notification-build-nc:
	@echo "Building notification service image without build cache..."
	$(DC_NOTIFICATION) -p eqsitecms-notification build --no-cache

fe-build:
	@echo "Building frontend image..."
	$(DC_FE) -p eqsitecms-fe build

fe-build-nc:
	@echo "Building frontend image without build cache..."
	$(DC_FE) -p eqsitecms-fe build --no-cache

# =====RUN COMMANDS=====

# Infrastructure
infra:
	$(DC_INFRA) -p eqsitecms-infra --env-file $(COMPOSE_DIR)/.env up -d

# Backend
be:
	$(DC_BE) -p eqsitecms-be --env-file $(COMPOSE_DIR)/.env up -d

be-attach:
	$(DC_BE) -p eqsitecms-be --env-file $(COMPOSE_DIR)/.env up

# Notification Service
notification:
	$(DC_NOTIFICATION) -p eqsitecms-notification --env-file $(SERVICES_DIR)/notification-service/.env up -d

notification-attach:
	$(DC_NOTIFICATION) -p eqsitecms-notification --env-file $(SERVICES_DIR)/notification-service/.env up

# Frontend
fe:
	$(DC_FE) -p eqsitecms-fe up -d

fe-attach:
	$(DC_FE) -p eqsitecms-fe up

# =====TESTING | LINTING | FORMATTING=====

test:
	cd services/backend && uv run pytest

lint:
	cd services/backend && uv run mypy src && uv run flake8 && uv run ruff check --fix src

format:
	cd services/backend && uv run isort src && uv run black src && uv run isort tests && uv run black tests

# =====BACKEND MANAGEMENT=====

be-makemigrations:
	cd services/backend && docker exec eqsitecms-app sh -c "cd src && uv run alembic revision --autogenerate -m '$(msg)'"

be-migrate:
	cd services/backend && docker exec eqsitecms-app sh -c "cd src && uv run alembic upgrade head"
