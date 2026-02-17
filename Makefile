# Makefile for common development tasks
# These commands mirror what CI/CD runs

.PHONY: help dev test lint build clean install

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Start development server with hot reload
	npm run dev

test: ## Run all tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage report
	npm run test:coverage

lint: ## Run linting and formatting checks
	npm run lint
	npm run format:check

lint-fix: ## Fix linting and formatting issues
	npm run lint:fix
	npm run format

type-check: ## Run TypeScript type checking
	npm run type-check

build: ## Build for production
	npm run build

clean: ## Clean build artifacts
	rm -rf dist coverage node_modules

docker-build: ## Build Docker image
	docker build -t typhoon:latest .

docker-run: ## Run Docker container locally
	docker run -p 3000:3000 --env-file .env typhoon:latest

db-up: ## Start local PostgreSQL database
	docker compose up -d postgres

db-down: ## Stop local PostgreSQL database
	docker compose down

db-logs: ## View database logs
	docker compose logs -f postgres

ci: lint type-check test build ## Run all CI checks locally

# Infrastructure management (AWS App Runner)
infra-status: ## Check AWS infrastructure status
	@bash scripts/infra-status.sh

infra-start: ## Start/resume AWS App Runner (starts billing)
	@bash scripts/infra-start.sh

infra-stop: ## Stop/pause AWS App Runner (stops billing)
	@bash scripts/infra-stop.sh

.PHONY: install dev test test-watch test-coverage lint lint-fix type-check build clean docker-build docker-run db-up db-down db-logs ci infra-status infra-start infra-stop
