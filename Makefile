# ============================================
# KubeAtlas Makefile
# ============================================

.PHONY: all build test clean dev docker helm help

# Variables
APP_NAME := kubeatlas
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME := $(shell date -u '+%Y-%m-%d_%H:%M:%S')
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Go variables
GO := go
GOFLAGS := -ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME) -X main.GitCommit=$(GIT_COMMIT)"

# Docker variables
DOCKER_REGISTRY := ghcr.io/kubeatlas
DOCKER_IMAGE := $(DOCKER_REGISTRY)/$(APP_NAME)

# Directories
BACKEND_DIR := backend
FRONTEND_DIR := frontend
HELM_DIR := helm/kubeatlas

# Colors for output
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m

# ============================================
# Help
# ============================================

## help: Show this help message
help:
	@echo "$(BLUE)KubeAtlas Makefile$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev              Start development environment"
	@echo "  make dev-stop         Stop development environment"
	@echo "  make dev-logs         Show development logs"
	@echo "  make dev-clean        Clean development volumes"
	@echo ""
	@echo "$(GREEN)Backend:$(NC)"
	@echo "  make backend-build    Build backend binary"
	@echo "  make backend-test     Run backend tests"
	@echo "  make backend-lint     Run backend linter"
	@echo "  make backend-run      Run backend locally"
	@echo ""
	@echo "$(GREEN)Frontend:$(NC)"
	@echo "  make frontend-build   Build frontend"
	@echo "  make frontend-test    Run frontend tests"
	@echo "  make frontend-lint    Run frontend linter"
	@echo "  make frontend-dev     Run frontend dev server"
	@echo ""
	@echo "$(GREEN)Docker:$(NC)"
	@echo "  make docker-build     Build all Docker images"
	@echo "  make docker-push      Push Docker images"
	@echo "  make docker-up        Start production containers"
	@echo "  make docker-down      Stop production containers"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test             Run all tests"
	@echo "  make test-coverage    Generate test coverage report"
	@echo "  make test-e2e         Run E2E tests"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make db-migrate       Run database migrations"
	@echo "  make db-seed          Seed database"
	@echo "  make db-backup        Backup database"
	@echo "  make db-restore       Restore database"
	@echo ""
	@echo "$(GREEN)Kubernetes:$(NC)"
	@echo "  make k8s-deploy       Deploy to Kubernetes"
	@echo "  make k8s-delete       Remove from Kubernetes"
	@echo "  make helm-install     Install Helm chart"
	@echo "  make helm-upgrade     Upgrade Helm chart"
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@echo "  make clean            Clean build artifacts"
	@echo "  make fmt              Format code"
	@echo "  make security-scan    Run security scan"

# ============================================
# Development
# ============================================

## dev: Start development environment
dev:
	@echo "$(BLUE)Starting development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "  - API: http://localhost:8080"
	@echo "  - UI:  http://localhost:3000"
	@echo "  - DB:  localhost:5432"
	@echo "  - Adminer: http://localhost:8081"

## dev-stop: Stop development environment
dev-stop:
	@echo "$(YELLOW)Stopping development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml down
	@echo "$(GREEN)Development environment stopped!$(NC)"

## dev-logs: Show development logs
dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

## dev-clean: Clean development volumes
dev-clean:
	@echo "$(RED)Cleaning development environment and volumes...$(NC)"
	docker-compose -f docker-compose.dev.yml down -v
	docker volume prune -f
	@echo "$(GREEN)Development environment cleaned!$(NC)"

## dev-reset: Reset development database
dev-reset:
	@echo "$(YELLOW)Resetting development database...$(NC)"
	docker-compose -f docker-compose.dev.yml down
	docker volume rm kubeatlas_postgres_data 2>/dev/null || true
	docker-compose -f docker-compose.dev.yml up -d postgres
	@sleep 5
	docker-compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Development database reset!$(NC)"

# ============================================
# Backend
# ============================================

## backend-build: Build backend binary
backend-build:
	@echo "$(BLUE)Building backend...$(NC)"
	cd $(BACKEND_DIR) && CGO_ENABLED=0 GOOS=linux $(GO) build $(GOFLAGS) -o bin/api ./cmd/api
	@echo "$(GREEN)Backend built: backend/bin/api$(NC)"

## backend-test: Run backend tests
backend-test:
	@echo "$(BLUE)Running backend tests...$(NC)"
	cd $(BACKEND_DIR) && $(GO) test -v -race ./...

## backend-test-coverage: Run backend tests with coverage
backend-test-coverage:
	@echo "$(BLUE)Running backend tests with coverage...$(NC)"
	cd $(BACKEND_DIR) && $(GO) test -v -race -coverprofile=coverage.out ./...
	cd $(BACKEND_DIR) && $(GO) tool cover -html=coverage.out -o coverage.html
	@echo "$(GREEN)Coverage report: backend/coverage.html$(NC)"

## backend-lint: Run backend linter
backend-lint:
	@echo "$(BLUE)Running backend linter...$(NC)"
	cd $(BACKEND_DIR) && golangci-lint run --timeout=5m

## backend-fmt: Format backend code
backend-fmt:
	@echo "$(BLUE)Formatting backend code...$(NC)"
	cd $(BACKEND_DIR) && $(GO) fmt ./...

## backend-run: Run backend locally
backend-run:
	@echo "$(BLUE)Running backend locally...$(NC)"
	cd $(BACKEND_DIR) && $(GO) run ./cmd/api

## backend-mod: Tidy backend modules
backend-mod:
	@echo "$(BLUE)Tidying backend modules...$(NC)"
	cd $(BACKEND_DIR) && $(GO) mod tidy

## backend-vendor: Vendor backend dependencies
backend-vendor:
	@echo "$(BLUE)Vendoring backend dependencies...$(NC)"
	cd $(BACKEND_DIR) && $(GO) mod vendor

# ============================================
# Frontend
# ============================================

## frontend-build: Build frontend
frontend-build:
	@echo "$(BLUE)Building frontend...$(NC)"
	cd $(FRONTEND_DIR) && npm ci && npm run build
	@echo "$(GREEN)Frontend built: frontend/dist$(NC)"

## frontend-test: Run frontend tests
frontend-test:
	@echo "$(BLUE)Running frontend tests...$(NC)"
	cd $(FRONTEND_DIR) && npm run test:run

## frontend-test-coverage: Run frontend tests with coverage
frontend-test-coverage:
	@echo "$(BLUE)Running frontend tests with coverage...$(NC)"
	cd $(FRONTEND_DIR) && npm run test:coverage

## frontend-lint: Run frontend linter
frontend-lint:
	@echo "$(BLUE)Running frontend linter...$(NC)"
	cd $(FRONTEND_DIR) && npm run lint

## frontend-fmt: Format frontend code
frontend-fmt:
	@echo "$(BLUE)Formatting frontend code...$(NC)"
	cd $(FRONTEND_DIR) && npx prettier --write "src/**/*.{ts,tsx}"

## frontend-dev: Run frontend dev server
frontend-dev:
	@echo "$(BLUE)Running frontend dev server...$(NC)"
	cd $(FRONTEND_DIR) && npm run dev

## frontend-install: Install frontend dependencies
frontend-install:
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	cd $(FRONTEND_DIR) && npm ci

## frontend-update: Update frontend dependencies
frontend-update:
	@echo "$(BLUE)Updating frontend dependencies...$(NC)"
	cd $(FRONTEND_DIR) && npm update

# ============================================
# Testing
# ============================================

## test: Run all tests
test: backend-test frontend-test
	@echo "$(GREEN)All tests passed!$(NC)"

## test-coverage: Generate test coverage reports
test-coverage: backend-test-coverage frontend-test-coverage
	@echo "$(GREEN)Coverage reports generated!$(NC)"

## test-e2e: Run E2E tests (requires dev environment running)
test-e2e:
	@echo "$(BLUE)Running E2E tests...$(NC)"
	cd $(FRONTEND_DIR) && npx cypress run

## test-e2e-open: Open E2E test runner
test-e2e-open:
	cd $(FRONTEND_DIR) && npx cypress open

# ============================================
# Docker
# ============================================

## docker-build: Build all Docker images
docker-build:
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker build -t $(DOCKER_IMAGE)-backend:$(VERSION) ./backend
	docker build -t $(DOCKER_IMAGE)-frontend:$(VERSION) ./frontend
	@echo "$(GREEN)Docker images built!$(NC)"

## docker-push: Push Docker images
docker-push:
	@echo "$(BLUE)Pushing Docker images...$(NC)"
	docker push $(DOCKER_IMAGE)-backend:$(VERSION)
	docker push $(DOCKER_IMAGE)-frontend:$(VERSION)
	@echo "$(GREEN)Docker images pushed!$(NC)"

## docker-up: Start production containers
docker-up:
	@echo "$(BLUE)Starting production containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Production containers started!$(NC)"

## docker-down: Stop production containers
docker-down:
	@echo "$(YELLOW)Stopping production containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)Production containers stopped!$(NC)"

## docker-clean: Clean Docker artifacts
docker-clean:
	@echo "$(RED)Cleaning Docker artifacts...$(NC)"
	docker-compose down -v --rmi all
	docker system prune -f
	@echo "$(GREEN)Docker artifacts cleaned!$(NC)"

# ============================================
# Database
# ============================================

## db-migrate: Run database migrations
db-migrate:
	@echo "$(BLUE)Running database migrations...$(NC)"
	cd $(BACKEND_DIR) && $(GO) run ./cmd/migrate

## db-seed: Seed database
db-seed:
	@echo "$(BLUE)Seeding database...$(NC)"
	cd $(BACKEND_DIR) && $(GO) run ./cmd/seed

## db-backup: Backup database
db-backup:
	@echo "$(BLUE)Backing up database...$(NC)"
	@mkdir -p backups
	@timestamp=$$(date +%Y%m%d_%H%M%S); \
	docker exec kubeatlas-postgres pg_dump -U kubeatlas kubeatlas > backups/backup_$$timestamp.sql
	@echo "$(GREEN)Database backup created: backups/backup_*.sql$(NC)"

## db-restore: Restore database from backup (usage: make db-restore FILE=backups/backup_xxx.sql)
db-restore:
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: Please specify backup file with FILE=path/to/backup.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Restoring database from $(FILE)...$(NC)"
	docker exec -i kubeatlas-postgres psql -U kubeatlas kubeatlas < $(FILE)
	@echo "$(GREEN)Database restored!$(NC)"

## db-reset: Reset database (DROP ALL DATA!)
db-reset:
	@echo "$(RED)WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " confirm && [ $$confirm = y ] || exit 1
	docker exec kubeatlas-postgres psql -U kubeatlas -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "$(GREEN)Database reset!$(NC)"

# ============================================
# Kubernetes / Helm
# ============================================

## k8s-deploy: Deploy to Kubernetes
k8s-deploy:
	@echo "$(BLUE)Deploying to Kubernetes...$(NC)"
	kubectl apply -f deploy/
	@echo "$(GREEN)Deployed to Kubernetes!$(NC)"

## k8s-delete: Remove from Kubernetes
k8s-delete:
	@echo "$(YELLOW)Removing from Kubernetes...$(NC)"
	kubectl delete -f deploy/
	@echo "$(GREEN)Removed from Kubernetes!$(NC)"

## helm-install: Install Helm chart
helm-install:
	@echo "$(BLUE)Installing Helm chart...$(NC)"
	helm install $(APP_NAME) $(HELM_DIR) -n $(APP_NAME) --create-namespace
	@echo "$(GREEN)Helm chart installed!$(NC)"

## helm-upgrade: Upgrade Helm chart
helm-upgrade:
	@echo "$(BLUE)Upgrading Helm chart...$(NC)"
	helm upgrade $(APP_NAME) $(HELM_DIR) -n $(APP_NAME)
	@echo "$(GREEN)Helm chart upgraded!$(NC)"

## helm-delete: Delete Helm release
helm-delete:
	@echo "$(YELLOW)Deleting Helm release...$(NC)"
	helm delete $(APP_NAME) -n $(APP_NAME)
	@echo "$(GREEN)Helm release deleted!$(NC)"

## helm-template: Render Helm templates
helm-template:
	helm template $(APP_NAME) $(HELM_DIR) --debug

## helm-lint: Lint Helm chart
helm-lint:
	helm lint $(HELM_DIR)

# ============================================
# Maintenance
# ============================================

## clean: Clean build artifacts
clean:
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf $(BACKEND_DIR)/bin
	rm -rf $(BACKEND_DIR)/vendor
	rm -f $(BACKEND_DIR)/coverage.out
	rm -f $(BACKEND_DIR)/coverage.html
	rm -rf $(FRONTEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules
	rm -f $(FRONTEND_DIR)/coverage
	@echo "$(GREEN)Build artifacts cleaned!$(NC)"

## fmt: Format all code
fmt: backend-fmt frontend-fmt
	@echo "$(GREEN)All code formatted!$(NC)"

## lint: Lint all code
lint: backend-lint frontend-lint
	@echo "$(GREEN)All code linted!$(NC)"

## security-scan: Run security scan
security-scan:
	@echo "$(BLUE)Running security scan...$(NC)"
	@which trivy > /dev/null || (echo "$(YELLOW)Installing Trivy...$(NC)" && curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin)
	trivy fs --scanners vuln,secret,misconfig .
	@echo "$(GREEN)Security scan complete!$(NC)"

## deps: Update all dependencies
deps: backend-mod frontend-update
	@echo "$(GREEN)All dependencies updated!$(NC)"

## generate: Generate all generated code
generate:
	@echo "$(BLUE)Generating code...$(NC)"
	cd $(BACKEND_DIR) && $(GO) generate ./...
	@echo "$(GREEN)Code generation complete!$(NC)"

## verify: Run all verification steps
verify: fmt lint test security-scan
	@echo "$(GREEN)All verification steps passed!$(NC)"

# ============================================
# Release
# ============================================

## release: Create a new release
release:
	@if [ -z "$(VERSION)" ]; then \
		echo "$(RED)Error: Please specify version with VERSION=x.x.x$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Creating release $(VERSION)...$(NC)"
	git tag -a v$(VERSION) -m "Release v$(VERSION)"
	git push origin v$(VERSION)
	@echo "$(GREEN)Release v$(VERSION) created!$(NC)"
