# =====VARIABLES=====
# Docker compose directory
COMPOSE_DIR = .docker-compose

# Backend
COMPOSE_BE = $(COMPOSE_DIR)/docker-compose.be.yml

# Frontend
COMPOSE_FE = $(COMPOSE_DIR)/docker-compose.fe.yml

# Infrastructure
COMPOSE_INFRA = $(COMPOSE_DIR)/docker-compose.infra.yml

# Backend commands
DC_BE         := docker compose -f $(COMPOSE_BE)

# Frontend commands (--env-file подхватывает NEXT_PUBLIC_* для build args в docker-compose.fe.yml)
DC_FE := docker compose --env-file services/frontend/.env -f $(COMPOSE_FE)

# Infrastructure commands
DC_INFRA := docker compose -f $(COMPOSE_INFRA)




SERVICES_MANIFEST ?= services.manifest

.PHONY: up be fe fe-build infra setup sync build test run lint asyncapi-validate up-full 

#=====ORCHESTRATOR COMMANDS=====

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

#=====BUILD COMMANDS=====

build:
	@echo "Building all docker-compose services..."
	@docker compose -f $(COMPOSE_BE) build
	@$(DC_FE) build

be-build:
	@echo "Building backend image..."
	@docker compose -f $(COMPOSE_BE) build

# Сборка только фронта. Дефолты API: localhost:8000/api (см. docker-compose.fe.yml).
# Переопределение: положи в services/fe/.env строки NEXT_PUBLIC_API_BASE_URL=... и NEXT_PUBLIC_API_PORT=...
# или один раз: NEXT_PUBLIC_API_BASE_URL=https://api.dev.example/api make fe-build
fe-build:
	@echo "Building frontend image..."
	@$(DC_FE) build

#=====RUN COMMANDS=====
# Infrastructure

infra:
	$(DC_INFRA) -p eqsitecms --env-file services/backend/.env up -d

# Backend
be:
	$(DC_BE) -p eqsitecms --env-file services/backend/.env up -d

# Frontend
fe:
	$(DC_FE) -p eqsitecms up -d

#=====TESTING|LINTING|FORMATTING=====

test:
	@echo "Tests execution. Assuming local test running via docker-compose is not yet globally configured."
	@echo "To run tests in a specific service, navigate to services/<service_name> and run its test command."
	cd services/backend && uv run pytest

lint:
	@echo "Linting conceptually requires per-service configuration. You might want to run this inside individual service directories."
	cd services/backend && uv run mypy src

format:
	cd services/backend && uv run isort src && uv run black src && uv run isort tests && uv run black tests

#=====BACKEND MANAGEMENT=====
be-makemigrations:
	cd services/backend && docker exec eqsitecms-app sh -c "cd src && uv run alembic revision --autogenerate -m '$(msg)'"

be-migrate:
	cd services/backend && docker exec eqsitecms-app sh -c "cd src && uv run alembic upgrade head"


