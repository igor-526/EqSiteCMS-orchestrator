# =====VARIABLES=====
COMPOSE_DIR = .docker-compose
SERVICES_DIR = services
SERVICES_MANIFEST ?= services.manifest
HARNESS_HOST ?= 127.0.0.1
HARNESS_PORT ?= 3080

# Docker compose files
COMPOSE_BE = $(COMPOSE_DIR)/docker-compose.be.yml
COMPOSE_NOTIFICATION = $(COMPOSE_DIR)/docker-compose.notification.yml
COMPOSE_EMAIL = $(COMPOSE_DIR)/docker-compose.email.yml
COMPOSE_VK = $(COMPOSE_DIR)/docker-compose.vk.yml
COMPOSE_SEO = $(COMPOSE_DIR)/docker-compose.seo.yml
COMPOSE_YANDEX = $(COMPOSE_DIR)/docker-compose.yandex.yml
COMPOSE_YA_METRICA = $(COMPOSE_DIR)/docker-compose.ya_metrica.yml

COMPOSE_FE = $(COMPOSE_DIR)/docker-compose.fe.yml
COMPOSE_INFRA = $(COMPOSE_DIR)/docker-compose.infra.yml

# Docker compose commands (base, без -p — добавляется в таргетах)
DC_BE = docker compose -p eqsitecms-be -f $(COMPOSE_BE) --env-file $(SERVICES_DIR)/backend/.env
DC_NOTIFICATION = docker compose -p eqsitecms-notification -f $(COMPOSE_NOTIFICATION) --env-file $(SERVICES_DIR)/notification-service/.env
DC_EMAIL = docker compose -p eqsitecms-email -f $(COMPOSE_EMAIL) --env-file $(SERVICES_DIR)/email-service/.env
DC_VK = docker compose -p eqsitecms-vk -f $(COMPOSE_VK) --env-file $(SERVICES_DIR)/vk-service/.env
DC_SEO = docker compose -p eqsitecms-seo -f $(COMPOSE_SEO) --env-file $(SERVICES_DIR)/seo-service/.env
DC_YANDEX = docker compose -p eqsitecms-yandex -f $(COMPOSE_YANDEX) --env-file $(SERVICES_DIR)/yandex-service/.env
DC_YA_METRICA = docker compose -p eqsitecms-ya-metrica -f $(COMPOSE_YA_METRICA) --env-file $(SERVICES_DIR)/ya-metrica-service/.env

DC_FE = docker compose -p eqsitecms-fe -f $(COMPOSE_FE) --env-file $(SERVICES_DIR)/frontend/.env
DC_INFRA = docker compose -p eqsitecms-infra -f $(COMPOSE_INFRA) --env-file $(COMPOSE_DIR)/.env

.PHONY: sync update services-branches harness build build-nc test lint format check check-backend check-email \
		check-notification check-frontend fix fix-backend fix-email fix-notification fix-frontend \
		compose-check asyncapi-validate asyncapi-validate-parse asyncapi-validate-vk contracts-check secret-scan migrate-core recreate-core health-core status-core logs-core \
		be-build be-build-nc be be-attach be-makemigrations be-migrate \
		notification-build notification-build-nc notification notification-attach \
		fe-build fe-build-nc fe fe-attach \
		vk-build vk-build-nc vk vk-attach vk-bot-logs vk-bot-restart check-vk fix-vk \
		infra \
		e2e-install e2e e2e-ui e2e-headed e2e-frontend e2e-report \
		ship-test

# =====MONOREPO COMMANDS=====

sync:
	@echo "Syncing all services..."
	@bash scripts/sync.sh $(SYNC_FLAGS)

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
		printf "%-28s %-36s %s\n" "monorepo root" "$$br" "$$wt"; \
	else \
		printf "%-28s %-36s %s\n" "monorepo root" "(not a git repo)" "-"; \
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

# Первый вызов запускает DSH в foreground; повторный безопасно использует
# подтверждённый работающий DSH и не пытается занять его порт второй раз.
harness:
	@status=$$(curl -sS -o /dev/null -w '%{http_code}' --max-time 2 \
		"http://$(HARNESS_HOST):$(HARNESS_PORT)/" 2>/dev/null || true); \
	if [ "$$status" = "000" ]; then \
		exec npm --prefix dsh run web -- --host "$(HARNESS_HOST)" --port "$(HARNESS_PORT)"; \
	fi; \
	body=$$(curl -sS --max-time 2 "http://$(HARNESS_HOST):$(HARNESS_PORT)/" 2>/dev/null || true); \
	if [ "$$status" = "401" ] && [ "$$body" = "dsh web authentication required; reopen the URL printed by dsh web." ]; then \
		echo "DeepSeek Harness is already running at http://$(HARNESS_HOST):$(HARNESS_PORT); using the existing attached process."; \
		exit 0; \
	fi; \
	echo "Error: $(HARNESS_HOST):$(HARNESS_PORT) is occupied by a service that was not identified as DeepSeek Harness (HTTP $$status)." >&2; \
	exit 1

# =====BUILD COMMANDS=====
build: be-build notification-build email-build fe-build

build-nc: be-build-nc notification-build-nc email-build-nc fe-build-nc

# =====INFRASTRUCTURE=====
infra:
	$(DC_INFRA) up -d

# =====MAIN BACKEND=====
be:
	$(DC_BE) up -d

be-attach:
	$(DC_BE) up

be-build:
	@echo "Building backend image..."
	$(DC_BE) build

be-build-nc:
	@echo "Building backend image without build cache..."
	$(DC_BE) build --no-cache

be-makemigrations:
	cd services/backend && docker exec eqsitecms-app sh -c "cd src && uv run alembic revision --autogenerate -m '$(msg)'"

be-migrate:
	cd services/backend && docker exec eqsitecms-app sh -c "cd src && uv run alembic upgrade head"

# =====MAIN FRONTEND=====
fe:
	$(DC_FE) up -d

fe-attach:
	$(DC_FE) up

fe-build:
	@echo "Building frontend image..."
	$(DC_FE) build

fe-build-nc:
	@echo "Building frontend image without build cache..."
	$(DC_FE) build --no-cache

# =====NOTIFICATION SERVICE=====
notification:
	$(DC_NOTIFICATION) up -d

notification-attach:
	$(DC_NOTIFICATION) up

notification-build:
	@echo "Building notification service image..."
	$(DC_NOTIFICATION) build

notification-build-nc:
	@echo "Building notification service image without build cache..."
	$(DC_NOTIFICATION) build --no-cache

# =====EMAIL SERVICE=====
email:
	$(DC_EMAIL) up -d

email-attach:
	$(DC_EMAIL) up

email-build:
	@echo "Building email service image..."
	$(DC_EMAIL) build

email-build-nc:
	@echo "Building email service image without build cache..."
	$(DC_EMAIL) build --no-cache

# =====VK SERVICE=====
vk:
	$(DC_VK) up -d

vk-attach:
	$(DC_VK) up

vk-build:
	@echo "Building vk service images..."
	$(DC_VK) build

vk-build-nc:
	@echo "Building vk service images without build cache..."
	$(DC_VK) build --no-cache

# =====SEO SERVICE=====
seo:
	$(DC_SEO) up -d

seo-attach:
	$(DC_SEO) up

seo-build:
	@echo "Building seo service images..."
	$(DC_SEO) build

seo-build-nc:
	@echo "Building seo service images without build cache..."
	$(DC_SEO) build --no-cache

# =====YANDEX SERVICE=====
yandex:
	$(DC_YANDEX) up -d

yandex-attach:
	$(DC_YANDEX) up

yandex-build:
	@echo "Building yandex service images..."
	$(DC_YANDEX) build

yandex-build-nc:
	@echo "Building yandex service images without build cache..."
	$(DC_YANDEX) build --no-cache

# =====YANDEX METRICA SERVICE=====
ya-metrica:
	$(DC_YA_METRICA) up -d

ya-metrica-attach:
	$(DC_YA_METRICA) up

ya-metrica-build:
	@echo "Building ya-metrica service images..."
	$(DC_YA_METRICA) build

ya-metrica-build-nc:
	@echo "Building ya-metrica service images without build cache..."
	$(DC_YA_METRICA) build --no-cache

# =====CONTROLLED CORE RELEASE OPERATIONS=====
test:
	$(MAKE) -C $(SERVICES_DIR)/backend test
	$(MAKE) -C $(SERVICES_DIR)/frontend test
	$(MAKE) -C $(SERVICES_DIR)/notification-service test
	$(MAKE) -C $(SERVICES_DIR)/email-service test
	$(MAKE) -C $(SERVICES_DIR)/vk-service test
	$(MAKE) -C $(SERVICES_DIR)/seo-service test
	$(MAKE) -C $(SERVICES_DIR)/yandex-service test
	$(MAKE) -C $(SERVICES_DIR)/ya-metrica-service test


lint:
	$(MAKE) -C $(SERVICES_DIR)/backend lint
	$(MAKE) -C $(SERVICES_DIR)/frontend lint
	$(MAKE) -C $(SERVICES_DIR)/notification-service lint
	$(MAKE) -C $(SERVICES_DIR)/email-service lint
	$(MAKE) -C $(SERVICES_DIR)/vk-service lint
	$(MAKE) -C $(SERVICES_DIR)/seo-service lint
	$(MAKE) -C $(SERVICES_DIR)/yandex-service lint
	$(MAKE) -C $(SERVICES_DIR)/ya-metrica-service lint


format:
	$(MAKE) -C $(SERVICES_DIR)/backend format
	$(MAKE) -C $(SERVICES_DIR)/frontend format
	$(MAKE) -C $(SERVICES_DIR)/notification-service format
	$(MAKE) -C $(SERVICES_DIR)/email-service format
	$(MAKE) -C $(SERVICES_DIR)/vk-service format
	$(MAKE) -C $(SERVICES_DIR)/seo-service format
	$(MAKE) -C $(SERVICES_DIR)/yandex-service format
	$(MAKE) -C $(SERVICES_DIR)/ya-metrica-service format

full-check: format lint test


asyncapi-validate:
	npx --yes @asyncapi/cli@6.0.2 validate services/backend/docs/asyncapi.yaml
	npx --yes @asyncapi/cli@6.0.2 validate services/notification-service/docs/asyncapi.yaml
	npx --yes @asyncapi/cli@6.0.2 validate services/email-service/docs/asyncapi.yaml

# VK Service remains outside the core release/check scope. Validate its
# consumer contract explicitly when working on the standalone VK service.
asyncapi-validate-vk:
	npx --yes @asyncapi/cli@6.0.2 validate services/vk-service/docs/asyncapi.yaml

# Контракты отдельного контура парсинга; core validator не расширяется.
# CLI 6.0.2 требует tslib, отсутствующий в его standalone npx dependency graph.
asyncapi-validate-parse:
	npx --yes --package @asyncapi/cli@6.0.2 --package tslib@2.8.1 asyncapi validate services/seo-service/docs/asyncapi.yaml
	npx --yes --package @asyncapi/cli@6.0.2 --package tslib@2.8.1 asyncapi validate services/ya-metrica-service/docs/asyncapi.yaml

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

# =====E2E TESTS (PLAYWRIGHT)=====

e2e-install:
	@echo "Installing Playwright..."
	npm install
	npm run playwright:install

e2e:
	@echo "Running E2E tests (headless)..."
	npm run e2e

e2e-ui:
	@echo "Running E2E tests (UI mode)..."
	npm run e2e:ui

e2e-headed:
	@echo "Running E2E tests (headed mode)..."
	npm run e2e:headed

e2e-frontend:
	@echo "Running frontend E2E tests only..."
	npm run e2e -- --project=frontend

e2e-report:
	@echo "Showing E2E test report..."
	npm run e2e:report

# =====SHIP TESTS=====

ship-test: | Makefile
	@echo "Running ship tooling tests..."
	node --test scripts/tests/**/*.test.mjs
