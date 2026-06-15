# Export KIND_EXPERIMENTAL_PROVIDER to honor it if set in user's environment
# (e.g., KIND_EXPERIMENTAL_PROVIDER=podman for podman support)
export KIND_EXPERIMENTAL_PROVIDER

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development Environment

.PHONY: check-tilt
check-tilt:
	@if ! command -v tilt >/dev/null 2>&1; then \
		echo "ERROR: tilt is not installed. Install instructions: https://docs.tilt.dev/install.html"; \
		exit 1; \
	fi

.PHONY: setup-kind
setup-kind: ## Create Kind cluster (idempotent)
	@./scripts/setup-kind.sh

API_TOKEN_DURATION ?= 4h
TILT_PORT ?= 10351

.PHONY: tilt-up
tilt-up: check-tilt setup-kind ## Start Tilt — builds, deploys, and port-forwards automatically
	@echo "Starting Tilt..."
	@tilt up --port "$(TILT_PORT)"

.PHONY: tilt-down
tilt-down: check-tilt ## Stop Tilt
	@echo "Stopping Tilt..."
	@tilt down

.PHONY: api-token
api-token: ## Generate a bearer token for the api-tester ServiceAccount (default 4h)
	@kubectl create token api-tester -n opendatahub --duration="$(API_TOKEN_DURATION)"
