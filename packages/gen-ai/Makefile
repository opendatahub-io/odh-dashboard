# Makefile for gen-ai development
DEFAULT_ENV_FILE := .env
ifneq ("$(wildcard $(DEFAULT_ENV_FILE))","")
include ${DEFAULT_ENV_FILE}
export $(shell sed 's/=.*//' ${DEFAULT_ENV_FILE})
endif

DEV_ENV_FILE := .env.development
ifneq ("$(wildcard $(DEV_ENV_FILE))","")
include ${DEV_ENV_FILE}
export $(shell sed 's/=.*//' ${DEV_ENV_FILE})
endif

ENV_FILE := .env.local
ifneq ("$(wildcard $(ENV_FILE))","")
include ${ENV_FILE}
export $(shell sed 's/=.*//' ${ENV_FILE})
endif

.PHONY: help dev-install-dependencies dev-frontend dev-bff dev-start dev-start-no-portforward dev-portforward clean clean-all

help: ## Display this help message
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: dev-install-dependencies
dev-install-dependencies: ## Install dependencies for frontend
	cd frontend && npm install

.PHONY: dev-bff-mock
dev-bff-mock: ## Run BFF with all mocks enabled (K8s, LlamaStack, MaaS, MCP, MLflow, BFF clients)
	cd bff && make run LOG_LEVEL=debug MOCK_LS_CLIENT=true MOCK_K8S_CLIENT=true MOCK_MAAS_CLIENT=true MOCK_MCP_CLIENT=true MOCK_MLFLOW_CLIENT=true MOCK_BFF_CLIENTS=true AUTH_METHOD=disabled LLAMA_STACK_URL="" MAAS_URL="" DISTRIBUTION_NAME="mock-dev"

.PHONY: dev-bff
dev-bff: ## Run BFF (requires env vars: MAAS_URL, LLAMA_STACK_URL, or use dev-bff-mock for mock mode)
ifndef MAAS_URL
	$(error MAAS_URL is not set. Use 'make dev-bff-mock' for mock mode or set MAAS_URL environment variable)
endif
ifndef LLAMA_STACK_URL
	$(error LLAMA_STACK_URL is not set. Use 'make dev-bff-mock' for mock mode or set LLAMA_STACK_URL environment variable)
endif
	cd bff && make run LOG_LEVEL=debug STATIC_ASSETS_DIR=../frontend/dist MAAS_URL=$(MAAS_URL) LLAMA_STACK_URL=$(LLAMA_STACK_URL) DISTRIBUTION_NAME=$(DISTRIBUTION_NAME)

.PHONY: dev-bff-inter-bff
dev-bff-inter-bff: ## Run BFF with MaaS BFF dev URL for inter-BFF testing (mock K8s, real HTTP to MaaS BFF on port 4000)
	cd bff && make run LOG_LEVEL=debug MOCK_LS_CLIENT=true MOCK_K8S_CLIENT=true MOCK_MCP_CLIENT=true MOCK_MLFLOW_CLIENT=true AUTH_METHOD=disabled LLAMA_STACK_URL="" MAAS_URL="" DISTRIBUTION_NAME="mock-dev" BFF_MAAS_DEV_URL=http://localhost:4000/api/v1

.PHONY: dev-bff-debug
dev-bff-debug: ## Run BFF with Delve debugger (VSCode can attach - requires Delve installation, see readme)
ifndef MAAS_URL
	$(error MAAS_URL is not set. Use 'make dev-bff-mock-debug' for mock mode or set MAAS_URL environment variable)
endif
ifndef LLAMA_STACK_URL
	$(error LLAMA_STACK_URL is not set. Use 'make dev-bff-mock-debug' for mock mode or set LLAMA_STACK_URL environment variable)
endif
	cd bff && make debug LOG_LEVEL=debug STATIC_ASSETS_DIR=../frontend/dist MAAS_URL=$(MAAS_URL) LLAMA_STACK_URL=$(LLAMA_STACK_URL) DISTRIBUTION_NAME=$(DISTRIBUTION_NAME)

.PHONY: dev-frontend
dev-frontend: ## Run only the frontend in development mode
	cd frontend && npm run start:dev

.PHONY: dev-mlflow-up
dev-mlflow-up: ## Start local MLflow tracking server for development
	cd bff && make mlflow-up

.PHONY: dev-bff-mock-debug
dev-bff-mock-debug: ## Run BFF with all mocks and Delve debugger on port 2345
	cd bff && make debug LOG_LEVEL=debug MOCK_LS_CLIENT=true MOCK_K8S_CLIENT=true MOCK_MAAS_CLIENT=true MOCK_MCP_CLIENT=true MOCK_MLFLOW_CLIENT=true MOCK_BFF_CLIENTS=true AUTH_METHOD=disabled LLAMA_STACK_URL="" MAAS_URL="" DISTRIBUTION_NAME="mock-dev"

.PHONY: dev-start-mock
dev-start-mock: ## Run frontend and bff (all mocks) in development mode
	make -j 2 dev-bff-mock dev-frontend

.PHONY: dev-start-mock-debug
dev-start-mock-debug: ## Run frontend and bff (all mocks) with Delve debugger (VSCode: F5 → "Attach to BFF")
	make -j 2 dev-bff-mock-debug dev-frontend

.PHONY: dev-portforward
dev-portforward: ## Start port-forwarding in separate terminals
	@echo "Starting port-forward for maas-api..."
	@oc port-forward -n ${MAAS_NAMESPACE} svc/maas-api 8081:8080 &
	@sleep 1
	@echo "Starting port-forward for lsd-genai-playground-service..."
	@oc port-forward -n ${PLAYGROUND_NAMESPACE} svc/lsd-genai-playground-service 8321:8321 &
	@echo "Port-forwarding started in background!"

.PHONY: dev-start
dev-start: dev-portforward ## Start frontend, bff, and port-forwarding
	@sleep 2
	make -j 2 dev-bff dev-frontend

.PHONY: dev-start-debug
dev-start-debug: dev-portforward ## Start frontend, bff with debugger, and port-forwarding (VSCode can attach on port 2345)
	@sleep 2
	@echo ""
	@echo "🐛 Starting in DEBUG mode..."
	@echo "📍 Delve debugger will listen on port 2345"
	@echo "📍 In VSCode: Press F5 and select 'Attach to Delve (make dev-start-debug)'"
	@echo ""
	make -j 2 dev-bff-debug dev-frontend

.PHONY: dev-start-no-portforward
dev-start-no-portforward: ## Start frontend and bff without port-forwarding
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
