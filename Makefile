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
	@$(DC_SEMANTIC_VECTORIZING) build
	@docker compose -f $(COMPOSE_STRUCTURE) build
	@docker compose -f $(COMPOSE_BEHAVIORAL_FACTOR) build
	@$(DC_NOTIFICATION) build

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

#=====TESTING=====

test:
	@echo "Tests execution. Assuming local test running via docker-compose is not yet globally configured."
	@echo "To run tests in a specific service, navigate to services/<service_name> and run its test command."

lint:
	@echo "Linting conceptually requires per-service configuration. You might want to run this inside individual service directories."

# Semantic: semantic stack, migrate, pytest
test-docker-semantic-service:
	@echo "=== test-docker: semantic-service ==="
	@$(DC_SEMANTIC) up -d
	@echo "Waiting for semantic-db..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		$(DC_SEMANTIC) exec -T semantic-db pg_isready -U seo -d seo 2>/dev/null && break; \
		sleep 2; \
	done
	@$(DC_SEMANTIC) exec -T semantic-app uv run alembic upgrade head
	@$(DC_SEMANTIC) exec -T semantic-app uv run pytest --cov=app --cov-report=term-missing tests/

# Behavioral-factor-service: full stack, migrate, pytest
test-docker-behavioral-factor-service:
	@echo "=== test-docker: behavioral-factor-service ==="
	@$(DC_BEHAVIORAL_FACTOR) up -d
	@echo "Waiting for behavioral-factor-db..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		$(DC_BEHAVIORAL_FACTOR) exec -T behavioral-factor-db pg_isready -U behavioral_factor_db_user -d behavioral_factor_db 2>/dev/null && break; \
		sleep 2; \
	done
	@$(DC_BEHAVIORAL_FACTOR) exec -T behavioral-factor-app uv run alembic upgrade head
	@$(DC_BEHAVIORAL_FACTOR) exec -T behavioral-factor-app uv run pytest --cov=app --cov-report=term-missing tests/

test-docker-structure-service:
	@echo "=== test-docker: structure-service ==="
	@$(DC_INFRA) up -d
	@$(DC_STRUCTURE) up -d
	@echo "Waiting for structure-db..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		$(DC_STRUCTURE) exec -T structure-db pg_isready -U structure -d structure 2>/dev/null && break; \
		sleep 2; \
	done
	@$(DC_STRUCTURE) exec -T structure-app uv run pytest tests/ -q --cov=app --cov-report=term-missing

test-docker-notification-service:
	@echo "=== test-docker: notification-service ==="
	@$(DC_INFRA) up -d
	@$(DC_NOTIFICATION) up -d
	@echo "Waiting for notification-db..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		$(DC_NOTIFICATION) exec -T notification-db pg_isready -U notification -d notification 2>/dev/null && break; \
		sleep 2; \
	done
	@$(DC_NOTIFICATION) exec -T notification-app uv run alembic upgrade head
	@$(DC_NOTIFICATION) exec -T notification-app uv run pytest --cov=app --cov-report=term-missing tests/

asyncapi-validate: ## Validate all AsyncAPI specs in services/*/docs/asyncapi.yaml
	@echo "=== Validating AsyncAPI specs ==="
	@found=0; failed=0; \
	for spec in services/*/docs/asyncapi.yaml; do \
		if [ -f "$$spec" ]; then \
			found=$$((found+1)); \
			echo ""; \
			echo "--- $$spec ---"; \
			if npx --yes @asyncapi/cli validate "$$spec" 2>&1; then \
				echo "✓ $$spec — OK"; \
			else \
				echo "✗ $$spec — FAILED"; \
				failed=$$((failed+1)); \
			fi; \
		fi; \
	done; \
	echo ""; \
	echo "=== AsyncAPI validation: $$found spec(s) checked, $$failed failed ==="; \
	exit $$failed
