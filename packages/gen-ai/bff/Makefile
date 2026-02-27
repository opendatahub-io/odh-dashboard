PORT ?= 8080
#frontend static assets root directory
STATIC_ASSETS_DIR ?= ./static
# ENVTEST_K8S_VERSION refers to the version of kubebuilder assets to be downloaded by envtest binary.
ENVTEST_K8S_VERSION = 1.29.3
LOG_LEVEL ?= debug
ALLOWED_ORIGINS ?= ""
LLAMA_STACK_URL ?= ""
MAAS_URL ?= ""
MLFLOW_URL ?= ""
MOCK_LS_CLIENT ?= false
MOCK_K8S_CLIENT ?= false
MOCK_MCP_CLIENT ?= false
MOCK_MAAS_CLIENT ?= false
MOCK_MLFLOW_CLIENT ?= false
MOCK_BFF_CLIENTS ?= false
AUTH_METHOD ?= "user_token"
PATH_PREFIX ?= ""
DISTRIBUTION_NAME ?= "rh-dev"

# Inter-BFF Communication configuration
BFF_MAAS_SERVICE_NAME ?= "odh-dashboard"
BFF_MAAS_SERVICE_PORT ?= 8243
BFF_MAAS_TLS_ENABLED ?= false
BFF_MAAS_DEV_URL ?= ""
# MaaS BFF auth configuration: 'user_token' (default for ODH) or 'internal' (Kubeflow only)
BFF_MAAS_AUTH_METHOD ?= "user_token"
BFF_MAAS_AUTH_TOKEN_HEADER ?= "x-forwarded-access-token"
BFF_MAAS_AUTH_TOKEN_PREFIX ?= ""

# MLflow configuration
MLFLOW_VERSION ?= 3.9.0
MLFLOW_PORT ?= 5001
MLFLOW_DATA ?= $(shell pwd)/.mlflow

.PHONY: all
all: build

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: fmt
fmt: ## Applies the correct code style to source files using go fmt.
	go fmt ./...

.PHONY: clean ## Deletes previously built binaries.
clean:
	rm -Rf ./bin

.PHONY: lint
lint: golangci-lint ## Run golangci-lint to automatically check source code for programmatic and stylistic errors.
	$(GOLANGCI_LINT) run

.PHONY: lint-fix
lint-fix: golangci-lint ## Run golangci-lint to automatically check source code for programmatic and stylistic errors and, additionally perform fixes where possible.
	$(GOLANGCI_LINT) run --fix

.PHONY: vet
vet:  . ## Runs static analysis tools on source files and reports suspicious constructs that could be bugs or syntactical errors.
	go vet ./...

.PHONY: test
test: fmt vet envtest uv ## Runs the full test suite.
	ENVTEST_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(LOCALBIN) -p path)" \
	MLFLOW_PORT=$(MLFLOW_PORT) MLFLOW_VERSION=$(MLFLOW_VERSION) \
	go test ./...

.PHONY: build
build: fmt vet test ## Builds the project to produce a binary executable.
	go build -o bin/bff ./cmd

.PHONY: run
run: fmt vet envtest uv ## Runs the project.
	ENVTEST_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(LOCALBIN) -p path)" \
	MLFLOW_PORT=$(MLFLOW_PORT) MLFLOW_VERSION=$(MLFLOW_VERSION) \
	go run ./cmd --port=$(PORT) --static-assets-dir=$(STATIC_ASSETS_DIR) --log-level=$(LOG_LEVEL) --allowed-origins=$(ALLOWED_ORIGINS) --llama-stack-url=$(LLAMA_STACK_URL) --maas-url=$(MAAS_URL) --mlflow-url=$(MLFLOW_URL) --mock-ls-client=$(MOCK_LS_CLIENT) --mock-k8s-client=$(MOCK_K8S_CLIENT) --mock-mcp-client=$(MOCK_MCP_CLIENT) --mock-maas-client=$(MOCK_MAAS_CLIENT) --mock-mlflow-client=$(MOCK_MLFLOW_CLIENT) --mock-bff-clients=$(MOCK_BFF_CLIENTS) --auth-method=$(AUTH_METHOD) --path-prefix=$(PATH_PREFIX) --filtered-model-keywords=$(FILTERED_MODEL_KEYWORDS) --distribution-name=$(DISTRIBUTION_NAME) --bff-maas-service-name=$(BFF_MAAS_SERVICE_NAME) --bff-maas-service-port=$(BFF_MAAS_SERVICE_PORT) --bff-maas-tls-enabled=$(BFF_MAAS_TLS_ENABLED) --bff-maas-dev-url=$(BFF_MAAS_DEV_URL) --bff-maas-auth-method=$(BFF_MAAS_AUTH_METHOD) --bff-maas-auth-token-header=$(BFF_MAAS_AUTH_TOKEN_HEADER) --bff-maas-auth-token-prefix=$(BFF_MAAS_AUTH_TOKEN_PREFIX)

.PHONY: debug
debug: fmt vet envtest uv ## Runs the project with Delve debugger (VSCode can attach on port 2345).
	@echo "Starting BFF with Delve debugger on port 2345..."
	@echo "In VSCode: Press F5 and select 'Attach to Delve (make dev-start-debug)'"
	ENVTEST_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(LOCALBIN) -p path)" \
	MLFLOW_PORT=$(MLFLOW_PORT) MLFLOW_VERSION=$(MLFLOW_VERSION) \
	dlv debug ./cmd --headless --listen=:2345 --api-version=2 --accept-multiclient --continue -- \
		--port=$(PORT) --static-assets-dir=$(STATIC_ASSETS_DIR) --log-level=$(LOG_LEVEL) --allowed-origins=$(ALLOWED_ORIGINS) --llama-stack-url=$(LLAMA_STACK_URL) --maas-url=$(MAAS_URL) --mlflow-url=$(MLFLOW_URL) --mock-ls-client=$(MOCK_LS_CLIENT) --mock-k8s-client=$(MOCK_K8S_CLIENT) --mock-mcp-client=$(MOCK_MCP_CLIENT) --mock-maas-client=$(MOCK_MAAS_CLIENT) --mock-mlflow-client=$(MOCK_MLFLOW_CLIENT) --mock-bff-clients=$(MOCK_BFF_CLIENTS) --auth-method=$(AUTH_METHOD) --path-prefix=$(PATH_PREFIX) --filtered-model-keywords=$(FILTERED_MODEL_KEYWORDS) --distribution-name=$(DISTRIBUTION_NAME) --bff-maas-service-name=$(BFF_MAAS_SERVICE_NAME) --bff-maas-service-port=$(BFF_MAAS_SERVICE_PORT) --bff-maas-tls-enabled=$(BFF_MAAS_TLS_ENABLED) --bff-maas-dev-url=$(BFF_MAAS_DEV_URL)

##@ MLflow

.PHONY: mlflow-up
mlflow-up: uv ## Start local MLflow tracking server via uv.
	@mkdir -p $(MLFLOW_DATA)
	@echo "Starting MLflow server on port $(MLFLOW_PORT)... (Ctrl+C to stop)"
	$(UV) run --with mlflow==$(MLFLOW_VERSION) mlflow server \
		--host 127.0.0.1 \
		--port $(MLFLOW_PORT) \
		--backend-store-uri sqlite:///$(MLFLOW_DATA)/mlflow.db \
		--default-artifact-root $(MLFLOW_DATA)/artifacts

.PHONY: mlflow-down
mlflow-down: ## Stop local MLflow tracking server.
	@-lsof -t -i :$(MLFLOW_PORT) | xargs kill 2>/dev/null || true
	@echo "MLflow server stopped"

.PHONY: mlflow-clean
mlflow-clean: mlflow-down ## Remove local MLflow data.
	rm -rf $(MLFLOW_DATA) $(MLFLOW_DATA)-test
	@echo "MLflow data cleaned"

##@ Dependencies

## Location to install dependencies to
LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p $(LOCALBIN)

## Tool Binaries
ENVTEST ?= $(LOCALBIN)/setup-envtest-$(ENVTEST_VERSION)
GOLANGCI_LINT ?= $(LOCALBIN)/golangci-lint-$(GOLANGCI_LINT_VERSION)
UV ?= $(LOCALBIN)/uv

## Tool Versions
GOLANGCI_LINT_VERSION ?= v2.1.0
ENVTEST_VERSION ?= release-0.19

.PHONY: envtest
envtest: $(ENVTEST) ## Download setup-envtest locally if necessary.
$(ENVTEST): $(LOCALBIN)
	$(call go-install-tool,$(ENVTEST),sigs.k8s.io/controller-runtime/tools/setup-envtest,$(ENVTEST_VERSION))

.PHONY: golangci-lint
golangci-lint: $(GOLANGCI_LINT) ## Download golangci-lint locally if necessary.
$(GOLANGCI_LINT): $(LOCALBIN)
	$(call go-install-tool,$(GOLANGCI_LINT),github.com/golangci/golangci-lint/v2/cmd/golangci-lint,${GOLANGCI_LINT_VERSION})

.PHONY: uv
uv: $(UV) ## Download uv locally if necessary.
$(UV): $(LOCALBIN)
	@[ -f $(UV) ] || { \
	echo "Installing uv..." ; \
	curl -LsSf https://astral.sh/uv/install.sh | CARGO_HOME=$(LOCALBIN)/.cargo UV_INSTALL_DIR=$(LOCALBIN) sh ; \
	test -f $(UV) || (echo "uv installation failed" && exit 1) ; \
	}

# go-install-tool will 'go install' any package with custom target and name of binary, if it doesn't exist
# $1 - target path with name of binary (ideally with version)
# $2 - package url which can be installed
# $3 - specific version of package
define go-install-tool
@[ -f $(1) ] || { \
set -e; \
package=$(2)@$(3) ;\
echo "Downloading $${package}" ;\
GOBIN=$(LOCALBIN) go install $${package} ;\
mv "$$(echo "$(1)" | sed "s/-$(3)$$//")" $(1) ;\
}
endef
