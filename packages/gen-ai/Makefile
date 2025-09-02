# Makefile for gen-ai development

.PHONY: help dev-install-dependencies dev-frontend dev-bff dev-start clean clean-all

help: ## Display this help message
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: dev-install-dependencies
dev-install-dependencies: ## Install dependencies for frontend
	cd frontend && npm install

.PHONY: dev-bff
dev-bff: ## Run only the bff in development mode
	cd bff && make run MOCK_LS_CLIENT=true PATH_PREFIX="/gen-ai"

.PHONY: dev-frontend
dev-frontend: ## Run only the frontend in development mode
	cd frontend && URL_PREFIX='/gen-ai' PORT=9002 npm run start:dev

.PHONY: dev-start
dev-start: ## Run both frontend and bff in development mode
	make -j 2 dev-bff dev-frontend

clean: ## Clean build artifacts and node_modules
	@echo "Cleaning root dist..."
	npm run clean 2>/dev/null || true
	@echo "Cleaning frontend dist..."
	cd frontend && npm run clean 2>/dev/null || true
	@echo "Cleaning bff..."
	cd bff && make clean 2>/dev/null || true
	@echo "Clean complete!"

clean-all: clean ## Clean everything including node_modules
	@echo "Cleaning node_modules..."
	rm -rf node_modules 2>/dev/null || true
	cd frontend && rm -rf node_modules 2>/dev/null || true
	@echo "Full clean complete!"

.DEFAULT_GOAL := help
