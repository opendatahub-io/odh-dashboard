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
AUTH_METHOD ?= "user_token"
PATH_PREFIX ?= ""
DISTRIBUTION_NAME ?= "rh-dev"

# MLflow configuration
MLFLOW_VERSION ?= 3.9.0
MLFLOW_PORT ?= 5001
MLFLOW_DATA ?= $(shell pwd)/.mlflow

# Llama Stack test server configuration (used by mock/test mode only)
TEST_LLAMA_STACK_VERSION ?= 0.5.1
TEST_LLAMA_STACK_PORT ?= 18321
TEST_LLAMA_STACK_DIR ?= testdata/llamastack
TEST_LLAMA_STACK_DATA ?= $(shell pwd)/$(TEST_LLAMA_STACK_DIR)/.data
TEST_LLAMA_STACK_RECORDINGS ?= $(shell pwd)/$(TEST_LLAMA_STACK_DIR)
TEST_LLAMA_STACK_CONFIG ?= $(TEST_LLAMA_STACK_DIR)/config.yaml
TEST_LLAMA_STACK_TEST_ID ?= bff/$(TEST_LLAMA_STACK_DIR)/test.py::record

# Provider and bare model IDs (source of truth, used by config yaml)
TEST_LLAMA_STACK_PROVIDER ?= gemini
TEST_LLAMA_STACK_MODEL_ID ?= models/gemini-2.5-flash
TEST_LLAMA_STACK_EMBEDDING_MODEL_ID ?= models/gemini-embedding-001
TEST_LLAMA_STACK_EMBEDDING_DIMENSION ?= 3072
TEST_LLAMA_STACK_SHIELD_MODEL_ID ?= models/gemini-2.5-flash

# Prefixed model refs (derived from above, used by Go tests and shield)
TEST_LLAMA_STACK_MODEL ?= $(TEST_LLAMA_STACK_PROVIDER)/$(TEST_LLAMA_STACK_MODEL_ID)
TEST_LLAMA_STACK_EMBEDDING_MODEL ?= $(TEST_LLAMA_STACK_PROVIDER)/$(TEST_LLAMA_STACK_EMBEDDING_MODEL_ID)
TEST_LLAMA_STACK_SHIELD_MODEL ?= $(TEST_LLAMA_STACK_PROVIDER)/$(TEST_LLAMA_STACK_SHIELD_MODEL_ID)

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
  LLAMA_STACK_TEST_ID=$(TEST_LLAMA_STACK_TEST_ID) \
	TEST_LLAMA_STACK_PORT=$(TEST_LLAMA_STACK_PORT) TEST_LLAMA_STACK_VERSION=$(TEST_LLAMA_STACK_VERSION) \
	TEST_LLAMA_STACK_MODEL=$(TEST_LLAMA_STACK_MODEL) \
	TEST_LLAMA_STACK_EMBEDDING_MODEL=$(TEST_LLAMA_STACK_EMBEDDING_MODEL) \
	TEST_LLAMA_STACK_MODEL_ID=$(TEST_LLAMA_STACK_MODEL_ID) \
	TEST_LLAMA_STACK_EMBEDDING_MODEL_ID=$(TEST_LLAMA_STACK_EMBEDDING_MODEL_ID) \
	TEST_LLAMA_STACK_EMBEDDING_DIMENSION=$(TEST_LLAMA_STACK_EMBEDDING_DIMENSION) \
	TEST_LLAMA_STACK_SHIELD_MODEL=$(TEST_LLAMA_STACK_SHIELD_MODEL) \
	go test ./...

.PHONY: build
build: fmt vet test ## Builds the project to produce a binary executable.
	go build -o bin/bff ./cmd

.PHONY: run
run: fmt vet envtest uv ## Runs the project.
	ENVTEST_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(LOCALBIN) -p path)" \
	MLFLOW_PORT=$(MLFLOW_PORT) MLFLOW_VERSION=$(MLFLOW_VERSION) \
	TEST_LLAMA_STACK_PORT=$(TEST_LLAMA_STACK_PORT) TEST_LLAMA_STACK_VERSION=$(TEST_LLAMA_STACK_VERSION) \
	go run ./cmd --port=$(PORT) --static-assets-dir=$(STATIC_ASSETS_DIR) --log-level=$(LOG_LEVEL) --allowed-origins=$(ALLOWED_ORIGINS) --llama-stack-url=$(LLAMA_STACK_URL) --maas-url=$(MAAS_URL) --mlflow-url=$(MLFLOW_URL) --mock-ls-client=$(MOCK_LS_CLIENT) --mock-k8s-client=$(MOCK_K8S_CLIENT) --mock-mcp-client=$(MOCK_MCP_CLIENT) --mock-maas-client=$(MOCK_MAAS_CLIENT) --mock-mlflow-client=$(MOCK_MLFLOW_CLIENT) --auth-method=$(AUTH_METHOD) --path-prefix=$(PATH_PREFIX) --filtered-model-keywords=$(FILTERED_MODEL_KEYWORDS) --distribution-name=$(DISTRIBUTION_NAME)

.PHONY: debug
debug: fmt vet envtest uv ## Runs the project with Delve debugger (VSCode can attach on port 2345).
	@echo "Starting BFF with Delve debugger on port 2345..."
	@echo "In VSCode: Press F5 and select 'Attach to Delve (make dev-start-debug)'"
	ENVTEST_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(LOCALBIN) -p path)" \
	MLFLOW_PORT=$(MLFLOW_PORT) MLFLOW_VERSION=$(MLFLOW_VERSION) \
	dlv debug ./cmd --headless --listen=:2345 --api-version=2 --accept-multiclient --continue -- \
		--port=$(PORT) --static-assets-dir=$(STATIC_ASSETS_DIR) --log-level=$(LOG_LEVEL) --allowed-origins=$(ALLOWED_ORIGINS) --llama-stack-url=$(LLAMA_STACK_URL) --maas-url=$(MAAS_URL) --mlflow-url=$(MLFLOW_URL) --mock-ls-client=$(MOCK_LS_CLIENT) --mock-k8s-client=$(MOCK_K8S_CLIENT) --mock-mcp-client=$(MOCK_MCP_CLIENT) --mock-maas-client=$(MOCK_MAAS_CLIENT) --mock-mlflow-client=$(MOCK_MLFLOW_CLIENT) --auth-method=$(AUTH_METHOD) --path-prefix=$(PATH_PREFIX) --filtered-model-keywords=$(FILTERED_MODEL_KEYWORDS) --distribution-name=$(DISTRIBUTION_NAME)

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

##@ Llama Stack

.PHONY: llamastack-up
llamastack-up: uv ## Start local Llama Stack server in replay mode (Ctrl+C to stop).
	@rm -rf $(TEST_LLAMA_STACK_DATA)
	@mkdir -p $(TEST_LLAMA_STACK_DATA)
	@echo "Starting Llama Stack in REPLAY mode on port $(TEST_LLAMA_STACK_PORT)..."
	SQLITE_STORE_DIR=$(TEST_LLAMA_STACK_DATA) \
	GEMINI_API_KEY=dummy-key-for-replay \
	LLAMA_STACK_TEST_INFERENCE_MODE=replay \
	LLAMA_STACK_TEST_RECORDING_DIR=$(TEST_LLAMA_STACK_RECORDINGS) \
	LLAMA_STACK_TEST_STACK_CONFIG_TYPE=server \
	LLAMA_STACK_TEST_ID=$(TEST_LLAMA_STACK_TEST_ID) \
	TEST_LLAMA_STACK_MODEL_ID=$(TEST_LLAMA_STACK_MODEL_ID) \
	TEST_LLAMA_STACK_EMBEDDING_MODEL_ID=$(TEST_LLAMA_STACK_EMBEDDING_MODEL_ID) \
	TEST_LLAMA_STACK_EMBEDDING_DIMENSION=$(TEST_LLAMA_STACK_EMBEDDING_DIMENSION) \
	TEST_LLAMA_STACK_SHIELD_MODEL=$(TEST_LLAMA_STACK_SHIELD_MODEL) \
	$(UV) run --with llama-stack==$(TEST_LLAMA_STACK_VERSION) --with milvus-lite --with pymilvus --with chardet --with ollama \
		llama stack run $(TEST_LLAMA_STACK_CONFIG) --port $(TEST_LLAMA_STACK_PORT)

.PHONY: llamastack-down
llamastack-down: ## Stop local Llama Stack server and remove ephemeral data.
	@-lsof -t -i :$(TEST_LLAMA_STACK_PORT) | xargs kill 2>/dev/null || true
	@sleep 2
	@-lsof -t -i :$(TEST_LLAMA_STACK_PORT) | xargs kill -9 2>/dev/null || true
	@rm -rf $(TEST_LLAMA_STACK_DATA)
	@echo "Llama Stack server stopped (runtime data cleaned)"

.PHONY: llamastack-record
llamastack-record: ## Record Llama Stack fixtures by running Go tests against real Gemini (needs GEMINI_API_KEY).
	@if [ -z "$${GEMINI_API_KEY:-}" ]; then \
		echo "ERROR: GEMINI_API_KEY must be set for recording."; \
		echo "Usage: GEMINI_API_KEY=<key> make llamastack-record"; \
		exit 1; \
	fi
	@rm -rf $(TEST_LLAMA_STACK_RECORDINGS)/recordings
	@echo "Cleared previous recordings"
	LLAMA_STACK_TEST_INFERENCE_MODE=record $(MAKE) test
	@COUNT=$$(find $(TEST_LLAMA_STACK_RECORDINGS)/recordings -name "*.json" 2>/dev/null | wc -l | tr -d ' '); \
	echo "  Recording complete! $${COUNT} JSON files";

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
