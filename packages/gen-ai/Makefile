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

MLFLOW_BFF_MOCK_PORT ?= 4020
MLFLOW_MOCK_BFF_ARGS := MOCK_MLFLOW_CLIENT=true MLFLOW_URL=http://localhost:5001 BFF_MLFLOW_DEV_URL="http://localhost:$(MLFLOW_BFF_MOCK_PORT)/api/v1"
ifeq ($(MOCK_MLFLOW_CLIENT),true)
DEV_BFF_MLFLOW_ARGS := $(MLFLOW_MOCK_BFF_ARGS)
else
DEV_BFF_MLFLOW_ARGS := MLFLOW_URL="$(MLFLOW_URL)"
endif

# Resolve the cluster configuration required by an in-cluster OGXServer to call the Gen AI BFF.
# User-supplied values always take precedence over discovery from the active oc context.
RHOAI_SUBSCRIPTION_PACKAGE ?= rhods-operator

define with_cluster_configuration
gateway_domain="$(GATEWAY_DOMAIN)"; \
if [ -z "$$gateway_domain" ]; then \
	gateway_domain="$$(oc get gatewayconfigs.services.platform.opendatahub.io default-gateway -o jsonpath='{.status.domain}' 2>/dev/null)"; \
fi; \
if [ -z "$$gateway_domain" ]; then \
	gateway_domain="$$(oc get gateway.gateway.networking.k8s.io data-science-gateway -n openshift-ingress -o jsonpath='{.spec.listeners[0].hostname}' 2>/dev/null)"; \
fi; \
if [ -z "$$gateway_domain" ]; then \
	echo "Unable to discover GATEWAY_DOMAIN from the current oc context. Set GATEWAY_DOMAIN to the public Data Science Gateway hostname and retry." >&2; \
	exit 1; \
fi; \
ogx_core_image="$(RELATED_IMAGE_ODH_OGX_CORE_IMAGE)"; \
postgresql_16_image="$(RELATED_IMAGE_POSTGRESQL_16_IMAGE)"; \
if [ -z "$$ogx_core_image" ] || [ -z "$$postgresql_16_image" ]; then \
	rhoai_subscription_namespace="$(RHOAI_SUBSCRIPTION_NAMESPACE)"; \
	if [ -z "$$rhoai_subscription_namespace" ]; then \
		rhoai_subscription_namespace="$(RHOAI_OPERATOR_NAMESPACE)"; \
	fi; \
	if [ -z "$$rhoai_subscription_namespace" ]; then \
		rhoai_subscription_namespace="$$(oc get subscription -A -o jsonpath='{range .items[?(@.spec.name=="$(RHOAI_SUBSCRIPTION_PACKAGE)")]}{.metadata.namespace}{"\n"}{end}' 2>/dev/null | head -n 1)"; \
	fi; \
	if [ -z "$$rhoai_subscription_namespace" ]; then \
		echo "Unable to discover the RHOAI Subscription namespace. Set RHOAI_SUBSCRIPTION_NAMESPACE (or RHOAI_OPERATOR_NAMESPACE) and retry." >&2; \
		exit 1; \
	fi; \
	rhoai_subscription_name="$$(oc get subscription -n "$$rhoai_subscription_namespace" -o jsonpath='{range .items[?(@.spec.name=="$(RHOAI_SUBSCRIPTION_PACKAGE)")]}{.metadata.name}{"\n"}{end}' 2>/dev/null | head -n 1)"; \
	if [ -z "$$rhoai_subscription_name" ]; then \
		echo "Unable to discover the RHOAI Subscription name. Set RHOAI_SUBSCRIPTION_NAMESPACE and RHOAI_SUBSCRIPTION_PACKAGE and retry." >&2; \
		exit 1; \
	fi; \
	rhoai_csv="$$(oc get subscription "$$rhoai_subscription_name" -n "$$rhoai_subscription_namespace" -o jsonpath='{.status.installedCSV}' 2>/dev/null)"; \
	if [ -z "$$rhoai_csv" ]; then \
		echo "Unable to discover the installed RHOAI CSV. Set RHOAI_SUBSCRIPTION_NAMESPACE and RHOAI_SUBSCRIPTION_PACKAGE, or set related-image variables explicitly and retry." >&2; \
		exit 1; \
	fi; \
	if [ -z "$$ogx_core_image" ]; then \
		ogx_core_image="$$(oc get csv "$$rhoai_csv" -n "$$rhoai_subscription_namespace" -o jsonpath='{.spec.relatedImages[?(@.name=="odh_ogx_core_image")].image}' 2>/dev/null)"; \
	fi; \
	if [ -z "$$postgresql_16_image" ]; then \
		postgresql_16_image="$$(oc get csv "$$rhoai_csv" -n "$$rhoai_subscription_namespace" -o jsonpath='{.spec.relatedImages[?(@.name=="postgresql_16_image")].image}' 2>/dev/null)"; \
	fi; \
fi; \
if [ -z "$$ogx_core_image" ] || [ -z "$$postgresql_16_image" ]; then \
	echo "Unable to discover required RHOAI related images from the installed CSV. Set RELATED_IMAGE_ODH_OGX_CORE_IMAGE and/or RELATED_IMAGE_POSTGRESQL_16_IMAGE explicitly and retry." >&2; \
	exit 1; \
fi; \
echo "Using Data Science Gateway: $$gateway_domain"; \
echo "Using RHOAI related images from $${rhoai_csv:-environment overrides}"; \
echo "Using ODH OGX core image: $$ogx_core_image"; \
echo "Using PostgreSQL 16 image: $$postgresql_16_image";
endef

.PHONY: help dev-install-dependencies dev-frontend dev-bff dev-start dev-start-no-portforward dev-portforward dev-start-maas dev-maas-bff dev-bff-maas dev-bff-mlflow dev-start-mlflow deploy-k8s-mcp clean clean-all

help: ## Display this help message
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: dev-install-dependencies
dev-install-dependencies: ## Install dependencies for frontend
	@echo "Dependencies are installed by pnpm install at the repository root."

.PHONY: dev-bff-mock
dev-bff-mock: ## Run BFF with all mocks enabled (K8s, LlamaStack, MCP, MLflow, BFF clients)
	cd bff && make run LOG_LEVEL=debug MOCK_LS_CLIENT=true MOCK_K8S_CLIENT=true MOCK_MCP_CLIENT=true MOCK_BFF_CLIENTS=true AUTH_METHOD=disabled LLAMA_STACK_URL="" DISTRIBUTION_NAME="mock-dev" $(MLFLOW_MOCK_BFF_ARGS)

.PHONY: dev-bff
dev-bff: ## Run BFF (requires LLAMA_STACK_URL, or use dev-bff-mock for mock mode)
ifndef LLAMA_STACK_URL
	$(error LLAMA_STACK_URL is not set. Use 'make dev-bff-mock' for mock mode or set LLAMA_STACK_URL environment variable)
endif
	@$(with_cluster_configuration) \
	cd bff && GATEWAY_DOMAIN="$$gateway_domain" RELATED_IMAGE_ODH_OGX_CORE_IMAGE="$$ogx_core_image" RELATED_IMAGE_POSTGRESQL_16_IMAGE="$$postgresql_16_image" make run LOG_LEVEL=debug STATIC_ASSETS_DIR=../frontend/dist LLAMA_STACK_URL=$(LLAMA_STACK_URL) ASR_MODEL_URL=$(ASR_MODEL_URL) DISTRIBUTION_NAME=$(DISTRIBUTION_NAME) AUTH_TOKEN=user_token AUTH_TOKEN_HEADER=Authorization AUTH_TOKEN_PREFIX="Bearer " $(DEV_BFF_MLFLOW_ARGS)

.PHONY: dev-bff-inter-bff
dev-bff-inter-bff: ## Run MLflow BFF + gen-ai BFF for MaaS inter-BFF testing (full MLflow stack, real HTTP to MaaS BFF on port 8081)
	$(MLFLOW_MOCK_BFF_ARGS) make -j 2 dev-mlflow-bff-mock dev-bff-inter-bff-run

.PHONY: dev-bff-inter-bff-run
dev-bff-inter-bff-run:
	cd bff && make run LOG_LEVEL=debug MOCK_LS_CLIENT=true MOCK_K8S_CLIENT=true MOCK_MCP_CLIENT=true AUTH_METHOD=user_token LLAMA_STACK_URL="" DISTRIBUTION_NAME="mock-dev" BFF_MAAS_DEV_URL=http://localhost:$${MAAS_LOCAL_PORT:-8081}/api/v1 $(MLFLOW_MOCK_BFF_ARGS)

.PHONY: dev-bff-debug
dev-bff-debug: ## Run BFF with Delve debugger (VSCode can attach - requires Delve installation, see readme)
ifndef LLAMA_STACK_URL
	$(error LLAMA_STACK_URL is not set. Use 'make dev-bff-mock-debug' for mock mode or set LLAMA_STACK_URL environment variable)
endif
	@$(with_cluster_configuration) \
	cd bff && GATEWAY_DOMAIN="$$gateway_domain" RELATED_IMAGE_ODH_OGX_CORE_IMAGE="$$ogx_core_image" RELATED_IMAGE_POSTGRESQL_16_IMAGE="$$postgresql_16_image" make debug LOG_LEVEL=debug STATIC_ASSETS_DIR=../frontend/dist LLAMA_STACK_URL=$(LLAMA_STACK_URL) ASR_MODEL_URL=$(ASR_MODEL_URL) DISTRIBUTION_NAME=$(DISTRIBUTION_NAME) AUTH_TOKEN=user_token AUTH_TOKEN_HEADER=Authorization AUTH_TOKEN_PREFIX="Bearer " $(DEV_BFF_MLFLOW_ARGS)

.PHONY: dev-frontend
dev-frontend: ## Run only the frontend in development mode
	cd frontend && pnpm run start:dev

.PHONY: dev-mlflow-up
dev-mlflow-up: ## Start local MLflow tracking server for development
	cd bff && make mlflow-up

.PHONY: dev-bff-mock-debug
dev-bff-mock-debug: ## Run BFF with all mocks and Delve debugger on port 2345
	cd bff && make debug LOG_LEVEL=debug MOCK_LS_CLIENT=true MOCK_K8S_CLIENT=true MOCK_MCP_CLIENT=true MOCK_BFF_CLIENTS=true AUTH_METHOD=disabled LLAMA_STACK_URL="" DISTRIBUTION_NAME="mock-dev" $(MLFLOW_MOCK_BFF_ARGS)

export GOTMPDIR ?= /tmp/go-tmp

.PHONY: dev-mlflow-bff-mock
dev-mlflow-bff-mock: ## Run MLflow BFF in mock mode pointing at local MLflow server (started by gen-ai BFF)
	@mkdir -p "$(GOTMPDIR)"
	cd ../mlflow/bff && make run PORT="$(MLFLOW_BFF_MOCK_PORT)" MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true AUTH_METHOD=disabled MLFLOW_URL=http://127.0.0.1:5001 DEV_MODE=true DEPLOYMENT_MODE=standalone LOG_LEVEL=debug

.PHONY: dev-start-mock
dev-start-mock: ## Run frontend, gen-ai BFF (mocks), and MLflow BFF with real inter-BFF for MLflow
	$(MLFLOW_MOCK_BFF_ARGS) make -j 3 dev-mlflow-bff-mock dev-bff-mock dev-frontend

############ E2E Test Targets ############
# These targets are used by the GitHub Actions e2e workflow to start BFFs
# Port is configurable via E2E_BFF_PORT environment variable for parallel runner support

E2E_BFF_PORT ?= 8080

.PHONY: dev-bff-e2e-mock
dev-bff-e2e-mock: ## Run BFF for e2e tests (mock mode, no cluster required)
	@mkdir -p "$(GOTMPDIR)"
	cd bff && make run PORT=$(E2E_BFF_PORT) LOG_LEVEL=info MOCK_LS_CLIENT=true MOCK_K8S_CLIENT=true MOCK_MCP_CLIENT=true MOCK_MLFLOW_CLIENT=true MOCK_BFF_CLIENTS=true AUTH_TOKEN=FAKE_BEARER_TOKEN LLAMA_STACK_URL="" MLFLOW_URL="" DISTRIBUTION_NAME="rh"

.PHONY: dev-bff-e2e-cluster
dev-bff-e2e-cluster: ## Run BFF for e2e tests (federated mode, connected to cluster)
	@mkdir -p "$(GOTMPDIR)"
	cd bff && make run PORT=$(E2E_BFF_PORT) LOG_LEVEL=info MOCK_LS_CLIENT=false MOCK_K8S_CLIENT=false MOCK_MCP_CLIENT=false MOCK_MLFLOW_CLIENT=false AUTH_METHOD=user_token AUTH_TOKEN_HEADER=Authorization AUTH_TOKEN_PREFIX="Bearer " LLAMA_STACK_URL=$(LLAMA_STACK_URL) ASR_MODEL_URL=$(ASR_MODEL_URL) GATEWAY_DOMAIN=$(GATEWAY_DOMAIN) NEMO_GUARDRAILS_URL=$(NEMO_GUARDRAILS_URL) BFF_MAAS_DEV_URL=$(BFF_MAAS_DEV_URL) BFF_MAAS_AUTH_TOKEN_HEADER=Authorization BFF_MAAS_AUTH_TOKEN_PREFIX="Bearer " MLFLOW_URL="$(MLFLOW_URL)" DISTRIBUTION_NAME="rh"

.PHONY: dev-start-mock-debug
dev-start-mock-debug: ## Run frontend, gen-ai BFF (mocks + debugger), and MLflow BFF with real inter-BFF
	$(MLFLOW_MOCK_BFF_ARGS) make -j 3 dev-mlflow-bff-mock dev-bff-mock-debug dev-frontend

.PHONY: dev-portforward
dev-portforward: ## Start port-forwarding for cluster services (Llama Stack, optional ASR)
	@echo "Starting port-forward for lsd-genai-playground-service..."
	@oc port-forward -n ${PLAYGROUND_NAMESPACE} svc/lsd-genai-playground-service 8321:8321 &
	@if [ -n "$${ASR_SERVICE_NAME}" ]; then \
		sleep 1; \
		echo "Starting port-forward for ASR model ($${ASR_SERVICE_NAME}) on port $${ASR_LOCAL_PORT:-8790}..."; \
		oc port-forward -n ${PLAYGROUND_NAMESPACE} svc/$${ASR_SERVICE_NAME} $${ASR_LOCAL_PORT:-8790}:8080 & \
	fi
	@if echo "${NEMO_GUARDRAILS_URL}" | grep -q "localhost"; then \
		sleep 1; \
		echo "Starting port-forward for nemoguardrails on port 9443..."; \
		oc port-forward -n ${PLAYGROUND_NAMESPACE} svc/nemoguardrails 9443:443 & \
	fi
	@echo "Port-forwarding started in background!"

.PHONY: dev-start
dev-start: dev-portforward ## Start frontend, bff, and port-forwarding
	@sleep 2
ifeq ($(MOCK_MLFLOW_CLIENT),true)
	$(MLFLOW_MOCK_BFF_ARGS) make -j 3 dev-mlflow-bff-mock dev-bff dev-frontend
else
	make -j 2 dev-bff dev-frontend
endif

.PHONY: dev-start-debug
dev-start-debug: dev-portforward ## Start frontend, bff with debugger, and port-forwarding (VSCode can attach on port 2345)
	@sleep 2
	@echo ""
	@echo "🐛 Starting in DEBUG mode..."
	@echo "📍 Delve debugger will listen on port 2345"
	@echo "📍 In VSCode: Press F5 and select 'Attach to Delve (make dev-start-debug)'"
	@echo ""
ifeq ($(MOCK_MLFLOW_CLIENT),true)
	$(MLFLOW_MOCK_BFF_ARGS) make -j 3 dev-mlflow-bff-mock dev-bff-debug dev-frontend
else
	make -j 2 dev-bff-debug dev-frontend
endif

.PHONY: dev-start-no-portforward
dev-start-no-portforward: ## Start frontend and bff without port-forwarding
ifeq ($(MOCK_MLFLOW_CLIENT),true)
	$(MLFLOW_MOCK_BFF_ARGS) make -j 3 dev-mlflow-bff-mock dev-bff dev-frontend
else
	make -j 2 dev-bff dev-frontend
endif

############ MaaS Development (Inter-BFF Architecture) ############
# gen-ai BFF communicates with MaaS exclusively through the MaaS BFF.
# These targets start the MaaS BFF locally alongside gen-ai BFF + frontend.
# MAAS_URL optionally overrides the MaaS BFF's cluster URL auto-discovery.

.PHONY: dev-maas-bff
dev-maas-bff: ## Run MaaS BFF in federated mode (auto-discovers its MaaS API URL)
	cd ../maas && make dev-bff-federated MAAS_API_URL=$(MAAS_URL)

.PHONY: dev-bff-maas
dev-bff-maas: ## Run gen-ai BFF connected to local MaaS BFF (inter-BFF mode)
ifndef LLAMA_STACK_URL
	$(error LLAMA_STACK_URL is not set. Set it in .env.local)
endif
	@$(with_cluster_configuration) \
	cd bff && GATEWAY_DOMAIN="$$gateway_domain" RELATED_IMAGE_ODH_OGX_CORE_IMAGE="$$ogx_core_image" RELATED_IMAGE_POSTGRESQL_16_IMAGE="$$postgresql_16_image" make run LOG_LEVEL=debug STATIC_ASSETS_DIR=../frontend/dist \
		LLAMA_STACK_URL=$(LLAMA_STACK_URL) \
		ASR_MODEL_URL=$(ASR_MODEL_URL) \
		MLFLOW_URL=$(MLFLOW_URL) \
		DISTRIBUTION_NAME=$(DISTRIBUTION_NAME) \
		AUTH_TOKEN=user_token AUTH_TOKEN_HEADER=Authorization AUTH_TOKEN_PREFIX="Bearer " \
		BFF_MAAS_DEV_URL=http://localhost:8081/api/v1

.PHONY: dev-bff-mlflow
dev-bff-mlflow: ## Run gen-ai BFF connected to local MLflow BFF (real cluster + MCP registry; auto-starts local MLflow on :5001)
ifndef LLAMA_STACK_URL
	$(error LLAMA_STACK_URL is not set. Set it in .env.local)
endif
	@$(with_cluster_configuration) \
	cd bff && GATEWAY_DOMAIN="$$gateway_domain" RELATED_IMAGE_ODH_OGX_CORE_IMAGE="$$ogx_core_image" RELATED_IMAGE_POSTGRESQL_16_IMAGE="$$postgresql_16_image" make run LOG_LEVEL=debug STATIC_ASSETS_DIR=../frontend/dist \
		LLAMA_STACK_URL=$(LLAMA_STACK_URL) \
		ASR_MODEL_URL=$(ASR_MODEL_URL) \
		DISTRIBUTION_NAME=$(DISTRIBUTION_NAME) \
		AUTH_TOKEN=user_token AUTH_TOKEN_HEADER=Authorization AUTH_TOKEN_PREFIX="Bearer " \
		$(MLFLOW_MOCK_BFF_ARGS)

.PHONY: dev-start-maas
dev-start-maas: dev-portforward ## Start MaaS BFF + gen-ai BFF + frontend + port-forwards (full MaaS dev)
	@sleep 2
	make -j 3 dev-maas-bff dev-bff-maas dev-frontend

.PHONY: dev-start-mlflow
dev-start-mlflow: dev-portforward ## Start MLflow BFF + gen-ai BFF + frontend (real cluster + MCP registry)
	@sleep 2
	make -j 3 dev-mlflow-bff-mock dev-bff-mlflow dev-frontend

.PHONY: deploy-k8s-mcp
deploy-k8s-mcp: ## Deploy Kubernetes MCP server to mcp-servers namespace
	@oc apply -f bff/testdata/kubernetes-mcp-server.yaml
	@echo ""
	@route_host=$$(oc get route kubernetes-mcp-server -n mcp-servers -o jsonpath='{.spec.host}' 2>/dev/null); \
	if [ -z "$$route_host" ]; then \
		echo "Route not found. Inspect: oc get route -n mcp-servers"; \
		exit 0; \
	fi; \
	echo ""; \
	echo "Add to .env.local:"; \
	echo "KUBERNETES_MCP_SERVER_URL=https://$$route_host/mcp"; \
	echo "# For HTTPS Routes, configure a trusted cluster or Route CA (e.g. BUNDLE_PATHS)"

clean: ## Clean build artifacts and node_modules
	@echo "Cleaning root dist..."
	pnpm run clean 2>/dev/null || true
	@echo "Cleaning frontend dist..."
	cd frontend && pnpm run clean 2>/dev/null || true
	@echo "Cleaning bff..."
	cd bff && make clean 2>/dev/null || true
	@echo "Clean complete!"

clean-all: clean ## Clean everything including node_modules
	@echo "Cleaning node_modules..."
	rm -rf node_modules 2>/dev/null || true
	cd frontend && rm -rf node_modules 2>/dev/null || true
	@echo "Full clean complete!"

.DEFAULT_GOAL := help
