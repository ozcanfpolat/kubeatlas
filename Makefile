# ============================================
# KubeAtlas Makefile
# ============================================

.PHONY: all build test clean dev docker helm

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

# ============================================
# Development
# ============================================

## dev: Start development environment
dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development environment started!"
	@echo "  - API: http://localhost:8080"
	@echo "  - UI:  http://localhost:3000"
	@echo "  - DB:  localhost:5432"

## dev-stop: Stop development environment
dev-stop:
	docker-compose -f docker-compose.dev.yml down

## dev-logs: Show development logs
dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# ============================================
# Backend
# ============================================

## build-backend: Build backend binary
build-backend:
	@echo "Building backend..."
	cd $(BACKEND_DIR) && $(GO) build $(GOFLAGS) -o ../bin/$(APP_NAME)-api ./cmd/api

## test-backend: Run backend tests
test-backend:
	@echo "Running backend tests..."
	cd $(BACKEND_DIR) && $(GO) test -v -race -cover ./...

## lint-backend: Lint backend code
lint-backend:
	@echo "Linting backend..."
	cd $(BACKEND_DIR) && golangci-lint run

## generate-backend: Generate code (mocks, etc.)
generate-backend:
	cd $(BACKEND_DIR) && $(GO) generate ./...

# ============================================
# Frontend
# ============================================

## install-frontend: Install frontend dependencies
install-frontend:
	@echo "Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && npm install

## build-frontend: Build frontend
build-frontend:
	@echo "Building frontend..."
	cd $(FRONTEND_DIR) && npm run build

## test-frontend: Run frontend tests
test-frontend:
	@echo "Running frontend tests..."
	cd $(FRONTEND_DIR) && npm test

## lint-frontend: Lint frontend code
lint-frontend:
	@echo "Linting frontend..."
	cd $(FRONTEND_DIR) && npm run lint

# ============================================
# Docker
# ============================================

## docker-build: Build Docker images
docker-build:
	@echo "Building Docker images..."
	docker build -t $(DOCKER_IMAGE)-api:$(VERSION) -f docker/Dockerfile.api .
	docker build -t $(DOCKER_IMAGE)-ui:$(VERSION) -f docker/Dockerfile.ui .

## docker-push: Push Docker images
docker-push:
	@echo "Pushing Docker images..."
	docker push $(DOCKER_IMAGE)-api:$(VERSION)
	docker push $(DOCKER_IMAGE)-ui:$(VERSION)

## docker-build-all: Build all Docker images with latest tag
docker-build-all: docker-build
	docker tag $(DOCKER_IMAGE)-api:$(VERSION) $(DOCKER_IMAGE)-api:latest
	docker tag $(DOCKER_IMAGE)-ui:$(VERSION) $(DOCKER_IMAGE)-ui:latest

# ============================================
# Helm
# ============================================

## helm-lint: Lint Helm chart
helm-lint:
	@echo "Linting Helm chart..."
	helm lint $(HELM_DIR)

## helm-template: Render Helm templates
helm-template:
	@echo "Rendering Helm templates..."
	helm template $(APP_NAME) $(HELM_DIR) --debug

## helm-package: Package Helm chart
helm-package:
	@echo "Packaging Helm chart..."
	helm package $(HELM_DIR) -d dist/

## helm-install: Install Helm chart locally
helm-install:
	@echo "Installing Helm chart..."
	helm upgrade --install $(APP_NAME) $(HELM_DIR) \
		--namespace $(APP_NAME) \
		--create-namespace \
		--wait

## helm-uninstall: Uninstall Helm chart
helm-uninstall:
	helm uninstall $(APP_NAME) -n $(APP_NAME)

# ============================================
# Database
# ============================================

## db-migrate: Apply schema to local postgres container
db-migrate:
	@echo "Applying schema.sql to local postgres container..."
	docker compose -f docker-compose.dev.yml exec -T postgres psql -U kubeatlas -d kubeatlas < database/schema.sql

## db-seed: Seed local postgres container
db-seed:
	@echo "Applying seed.sql to local postgres container..."
	docker compose -f docker-compose.dev.yml exec -T postgres psql -U kubeatlas -d kubeatlas < database/seed.sql

# ============================================
# Build & Release
# ============================================

## build: Build all components
build: build-backend build-frontend
	@echo "Build complete!"

## test: Run all tests
test: test-backend test-frontend
	@echo "All tests passed!"

## lint: Run all linters
lint: lint-backend lint-frontend
	@echo "Linting complete!"

## clean: Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -rf dist/
	rm -rf $(FRONTEND_DIR)/build/
	rm -rf $(FRONTEND_DIR)/node_modules/

## release: Create a release
release: lint test build docker-build-all helm-package
	@echo "Release $(VERSION) ready!"

# ============================================
# Documentation
# ============================================

## docs: Generate documentation
docs:
	@echo "Generating documentation..."
	cd $(BACKEND_DIR) && swag init -g cmd/api/main.go -o ../docs/api

## docs-serve: Serve documentation locally
docs-serve:
	@echo "Serving documentation..."
	cd docs && mkdocs serve

# ============================================
# Utilities
# ============================================

## version: Show version
version:
	@echo "Version: $(VERSION)"
	@echo "Commit:  $(GIT_COMMIT)"
	@echo "Built:   $(BUILD_TIME)"

## help: Show this help
help:
	@echo "KubeAtlas - Kubernetes Inventory & Asset Management"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'

.DEFAULT_GOAL := help
