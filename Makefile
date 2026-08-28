# =====VARIABLES=====
COMPOSE_DIR = .docker-compose
SERVICES_DIR = services

# Docker compose files
COMPOSE_BE = $(COMPOSE_DIR)/docker-compose.be.yml
COMPOSE_NOTIFICATION = $(COMPOSE_DIR)/docker-compose.notification.yml
COMPOSE_EMAIL = $(COMPOSE_DIR)/docker-compose.email.yml
COMPOSE_VK = $(COMPOSE_DIR)/docker-compose.vk.yml

COMPOSE_FE = $(COMPOSE_DIR)/docker-compose.fe.yml
COMPOSE_INFRA = $(COMPOSE_DIR)/docker-compose.infra.yml

# Docker compose commands (base, без -p — добавляется в таргетах)
DC_BE = docker compose -f $(COMPOSE_BE)
DC_NOTIFICATION = docker compose -f $(COMPOSE_NOTIFICATION)
DC_EMAIL = docker compose -f $(COMPOSE_INFRA) -f $(COMPOSE_EMAIL)
DC_VK = docker compose -f $(COMPOSE_INFRA) -f $(COMPOSE_VK)
# vk-service: инфраструктурные переменные берутся из .docker-compose/.env,
# переменные приложения — из services/vk-service/.env
ENV_FILES_VK = --env-file $(COMPOSE_DIR)/.env --env-file $(SERVICES_DIR)/vk-service/.env
# Собственные сервисы проекта eqsitecms-vk
VK_SERVICES = db-vk vk-migration vk-service vk-celery-worker vk-bot
# Bots Long Poll допускает одного слушателя на группу: контейнер бота единственный
VK_BOT_CONTAINER = eqsitecms-vk-bot

DC_FE = docker compose --env-file services/frontend/.env -f $(COMPOSE_FE)
DC_INFRA = docker compose -f $(COMPOSE_INFRA)
DC_CORE = docker compose --env-file $(COMPOSE_DIR)/.env -p eqsitecms-core \
	-f $(COMPOSE_INFRA) -f $(COMPOSE_BE) -f $(COMPOSE_NOTIFICATION) \
	-f $(COMPOSE_EMAIL) -f $(COMPOSE_FE)

SERVICES_MANIFEST ?= services.manifest

.PHONY: sync update services-branches build build-nc test lint format check check-backend check-email \
		check-notification check-frontend fix fix-backend fix-email fix-notification fix-frontend \
		compose-check asyncapi-validate asyncapi-validate-vk contracts-check secret-scan migrate-core recreate-core health-core status-core logs-core \
		be-build be-build-nc be be-attach be-makemigrations be-migrate \
		notification-build notification-build-nc notification notification-attach \
		fe-build fe-build-nc fe fe-attach \
		vk-build vk-build-nc vk vk-attach vk-bot-logs vk-bot-restart check-vk fix-vk \
		infra

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

# =====BUILD COMMANDS=====

build: be-build notification-build email-build fe-build

build-nc: be-build-nc notification-build-nc email-build-nc fe-build-nc

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

email-build:
	@echo "Building email service image..."
	$(DC_EMAIL) -p eqsitecms-email build email-service email-migration celery-worker

email-build-nc:
	@echo "Building email service image without build cache..."
	$(DC_EMAIL) -p eqsitecms-email build --no-cache email-service email-migration celery-worker

fe-build:
	@echo "Building frontend image..."
	$(DC_FE) -p eqsitecms-fe build

fe-build-nc:
	@echo "Building frontend image without build cache..."
	$(DC_FE) -p eqsitecms-fe build --no-cache

vk-build:
	@echo "Building vk service images..."
	$(DC_VK) -p eqsitecms-vk $(ENV_FILES_VK) build vk-service vk-migration vk-celery-worker vk-bot

vk-build-nc:
	@echo "Building vk service images without build cache..."
	$(DC_VK) -p eqsitecms-vk $(ENV_FILES_VK) build --no-cache vk-service vk-migration vk-celery-worker vk-bot

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

# Email Service
email:
	$(DC_EMAIL) -p eqsitecms-email --env-file $(SERVICES_DIR)/email-service/.env up -d

email-attach:
	$(DC_EMAIL) -p eqsitecms-email --env-file $(SERVICES_DIR)/email-service/.env up

# VK Service (автономный проект eqsitecms-vk, вне core release scope).
# Общая инфраструктура (redis, nats, minio) принадлежит core-стеку и здесь не
# пересоздаётся: поднимаются только собственные контейнеры сервиса и его БД.
# redis стартует в проекте eqsitecms-vk только если его контейнера ещё нет.
vk:
	@docker network inspect eqsitecms_network >/dev/null 2>&1 || docker network create eqsitecms_network
	@docker inspect eqsitecms-redis >/dev/null 2>&1 || $(DC_VK) -p eqsitecms-vk $(ENV_FILES_VK) up -d redis
	$(DC_VK) -p eqsitecms-vk $(ENV_FILES_VK) up -d --no-deps $(VK_SERVICES)

vk-attach:
	@docker network inspect eqsitecms_network >/dev/null 2>&1 || docker network create eqsitecms_network
	@docker inspect eqsitecms-redis >/dev/null 2>&1 || $(DC_VK) -p eqsitecms-vk $(ENV_FILES_VK) up -d redis
	$(DC_VK) -p eqsitecms-vk $(ENV_FILES_VK) up --no-deps $(VK_SERVICES)

# Long-poll runtime бота: логи и перезапуск только этого контейнера.
vk-bot-logs:
	docker logs -f --tail 200 $(VK_BOT_CONTAINER)

# Пересоздание, а не docker restart: переменные из env_file фиксируются при
# создании контейнера, поэтому после правки services/vk-service/.env (например
# нового VK_GROUP_TOKEN) простой restart поднимет процесс со старым окружением.
vk-bot-restart:
	$(DC_VK) -p eqsitecms-vk $(ENV_FILES_VK) up -d --no-deps --force-recreate vk-bot

# Frontend
fe:
	$(DC_FE) -p eqsitecms-fe up -d

fe-attach:
	$(DC_FE) -p eqsitecms-fe up

# =====CHECKS (NON-MUTATING) / FIXES=====

check: check-backend check-email check-notification check-frontend compose-check asyncapi-validate contracts-check secret-scan

check-backend:
	cd services/backend && uv run mypy src tests && uv run ruff check src tests && uv run ruff format --check src tests && uv run flake8 src tests && uv run pytest

check-email:
	cd services/email-service && uv run mypy src && uv run basedpyright && uv run ruff check . && uv run ruff format --check . && uv run flake8 src tests && uv run pytest -m "not infrastructure"

check-notification:
	cd services/notification-service && uv run mypy src && uv run basedpyright && uv run ruff check . && uv run ruff format --check . && uv run flake8 src tests && uv run pytest -m "not infrastructure"

check-vk:
	cd services/vk-service && uv run mypy src tests && uv run basedpyright && uv run ruff check . && uv run ruff format --check . && uv run flake8 src tests && uv run pytest -m "not infrastructure"

check-frontend:
	cd services/frontend && npm test && npm run lint && npm run typecheck && npm run build

fix: fix-backend fix-email fix-notification fix-frontend

fix-backend:
	cd services/backend && uv run ruff check --fix src tests && uv run ruff format src tests

fix-email:
	$(MAKE) -C services/email-service format

fix-notification:
	$(MAKE) -C services/notification-service format

fix-vk:
	$(MAKE) -C services/vk-service format

fix-frontend:
	cd services/frontend && npx eslint src --fix

compose-check:
	docker compose -f $(COMPOSE_INFRA) config --quiet
	docker compose -f $(COMPOSE_BE) config --quiet
	docker compose -f $(COMPOSE_NOTIFICATION) config --quiet
	docker compose -f $(COMPOSE_INFRA) -f $(COMPOSE_EMAIL) config --quiet
	docker compose -f $(COMPOSE_INFRA) -f $(COMPOSE_VK) config --quiet
	$(DC_FE) config --quiet
	$(DC_CORE) config --quiet

asyncapi-validate:
	npx --yes @asyncapi/cli@6.0.2 validate services/backend/docs/asyncapi.yaml
	npx --yes @asyncapi/cli@6.0.2 validate services/notification-service/docs/asyncapi.yaml
	npx --yes @asyncapi/cli@6.0.2 validate services/email-service/docs/asyncapi.yaml

# VK Service remains outside the core release/check scope. Validate its
# consumer contract explicitly when working on the standalone VK service.
asyncapi-validate-vk:
	npx --yes @asyncapi/cli@6.0.2 validate services/vk-service/docs/asyncapi.yaml

# Кросс-репозиторные контрактные тесты сверяют AsyncAPI соседнего сервиса.
# В CI отдельного репозитория соседа нет, и тест деградирует до skip.
# EQCMS_MONOREPO=1 превращает такой skip в падение: в монорепе документ
# обязан существовать, иначе проверка молча перестанет выполняться.
contracts-check:
	cd services/notification-service && EQCMS_MONOREPO=1 uv run pytest \
		tests/unit/messaging/test_nats_adapter_contract.py -q
	cd services/vk-service && EQCMS_MONOREPO=1 uv run pytest \
		tests/clients/nats/test_vk_contract_equality.py -q

secret-scan:
	bash scripts/secret-scan.sh

# =====CONTROLLED CORE RELEASE OPERATIONS=====

migrate-core:
	docker network inspect eqsitecms_network >/dev/null 2>&1 || docker network create eqsitecms_network
	$(DC_CORE) up -d db db-notifications db-email nats redis
	$(DC_CORE) run --rm notification-migration
	$(DC_CORE) run --rm email-migration
	$(DC_CORE) run --rm backend sh -c 'cd /eqsitecms/src && uv run alembic -c alembic.ini upgrade head'

recreate-core:
	bash scripts/recreate-core.sh

health-core:
	@for container in eqsitecms-app eqsitecms-notification-service eqsitecms-email-service eqsitecms-email-celery-worker eqsitecms-redis; do \
		echo "Waiting for $$container"; \
		for attempt in $$(seq 1 30); do \
			status=$$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$$container" 2>/dev/null || true); \
			[ "$$status" = healthy ] && break; \
			[ $$attempt -eq 30 ] && { echo "$$container is $$status" >&2; exit 1; }; \
			sleep 2; \
		done; \
	done
	@for container in eqsitecms-nats eqsitecms-frontend; do \
		status=$$(docker inspect --format '{{.State.Status}}' "$$container" 2>/dev/null || true); \
		[ "$$status" = running ] || { echo "$$container is $$status" >&2; exit 1; }; \
	done

status-core:
	docker ps --filter name=eqsitecms-app --filter name=eqsitecms-notification --filter name=eqsitecms-email --filter name=eqsitecms-redis --filter name=eqsitecms-nats --filter name=eqsitecms-frontend

logs-core:
	@mkdir -p .release-evidence
	docker logs --since 10m eqsitecms-app > .release-evidence/backend.log 2>&1
	docker logs --since 10m eqsitecms-notification-service > .release-evidence/notification.log 2>&1
	docker logs --since 10m eqsitecms-email-service > .release-evidence/email.log 2>&1
	docker logs --since 10m eqsitecms-email-celery-worker > .release-evidence/email-celery.log 2>&1

test:
	$(MAKE) -C services/backend test
	$(MAKE) -C services/notification-service test
	$(MAKE) -C services/email-service test
	$(MAKE) -C services/frontend test

lint:
	$(MAKE) -C services/backend lint
	$(MAKE) -C services/notification-service lint
	$(MAKE) -C services/email-service lint
	$(MAKE) -C services/frontend lint

format:
	$(MAKE) -C services/backend format
	$(MAKE) -C services/notification-service format
	$(MAKE) -C services/email-service format
	$(MAKE) -C services/frontend format

# =====BACKEND MANAGEMENT=====

be-makemigrations:
	cd services/backend && docker exec eqsitecms-app sh -c "cd src && uv run alembic revision --autogenerate -m '$(msg)'"

be-migrate:
	cd services/backend && docker exec eqsitecms-app sh -c "cd src && uv run alembic upgrade head"
