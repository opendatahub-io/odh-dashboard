IMG ?= quay.io/opendatahub/odh-dashboard-operator:latest

.PHONY: all
all: build

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

.PHONY: fmt
fmt: ## Run go fmt against code.
	go fmt ./...

.PHONY: vet
vet: ## Run go vet against code.
	go vet ./...

.PHONY: lint
lint: golangci-lint ## Run golangci-lint linter.
	$(GOLANGCI_LINT) run

.PHONY: lint-fix
lint-fix: golangci-lint ## Run golangci-lint linter and perform fixes.
	$(GOLANGCI_LINT) run --fix

.PHONY: test
test: fmt vet ## Run tests.
	go test -race -coverprofile=cover.out ./...

##@ Build

SAFE_VERSION := $(shell git describe --tags --always --dirty 2>/dev/null | tr -cd '[:alnum:]_.-' || echo "unknown")

.PHONY: build
build: fmt vet ## Build manager binary.
	go build -ldflags "-X github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller.Version=$(SAFE_VERSION)" -o bin/manager ./cmd/manager

.PHONY: run
run: fmt vet ## Run the controller from your host.
	go run ./cmd/manager --namespace=$(NAMESPACE) --manifests-base-path=$(MANIFESTS_BASE_PATH)

.PHONY: clean
clean: ## Remove build artifacts.
	rm -rf bin/ cover.out

##@ Generate

.PHONY: generate
generate: controller-gen ## Generate deepcopy code.
	$(CONTROLLER_GEN) object paths="./api/..."

.PHONY: manifests
manifests: controller-gen ## Generate CRD manifests.
	$(CONTROLLER_GEN) crd paths="./api/..." output:crd:artifacts:config=config/crd/bases

##@ Helm

CHART_DIR ?= charts/dashboard
CRD_SOURCE ?= config/crd/bases/components.platform.opendatahub.io_dashboards.yaml
CRD_CHART ?= $(CHART_DIR)/crds/components.platform.opendatahub.io_dashboards.yaml
HELM ?= helm

.PHONY: sync-chart-crds
sync-chart-crds: manifests ## Copy generated CRD into the Helm chart.
	mkdir -p "$(CHART_DIR)/crds"
	cp "$(CRD_SOURCE)" "$(CRD_CHART)"

.PHONY: chart-lint
chart-lint: sync-chart-crds ## Run helm lint on the bootstrap chart.
	$(HELM) lint "$(CHART_DIR)"

.PHONY: chart-template
chart-template: sync-chart-crds ## Render the chart locally for smoke testing.
	$(HELM) template dashboard "$(CHART_DIR)" --namespace opendatahub > /dev/null

.PHONY: chart-validate
chart-validate: chart-lint chart-template ## Lint and render the Helm chart.

.PHONY: check-chart-crds ## Fail if chart CRD differs from generated CRD.
check-chart-crds:
	@diff -q "$(CRD_SOURCE)" "$(CRD_CHART)" >/dev/null || (echo "Chart CRD is out of sync with $(CRD_SOURCE). Run 'make sync-chart-crds'." && exit 1)

##@ Container

.PHONY: docker-build
docker-build: ## Build container image (run from repo root).
	docker build -t $(IMG) -f Dockerfile ..

.PHONY: docker-push
docker-push: ## Push container image.
	docker push $(IMG)

##@ Dependencies

LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p $(LOCALBIN)

GOLANGCI_LINT ?= $(LOCALBIN)/golangci-lint-$(GOLANGCI_LINT_VERSION)
CONTROLLER_GEN ?= $(LOCALBIN)/controller-gen-$(CONTROLLER_GEN_VERSION)

GOLANGCI_LINT_VERSION ?= v2.1.0
CONTROLLER_GEN_VERSION ?= v0.17.2

.PHONY: golangci-lint
golangci-lint: $(GOLANGCI_LINT)
$(GOLANGCI_LINT): $(LOCALBIN)
	$(call go-install-tool,$(GOLANGCI_LINT),github.com/golangci/golangci-lint/v2/cmd/golangci-lint,$(GOLANGCI_LINT_VERSION))

.PHONY: controller-gen
controller-gen: $(CONTROLLER_GEN)
$(CONTROLLER_GEN): $(LOCALBIN)
	$(call go-install-tool,$(CONTROLLER_GEN),sigs.k8s.io/controller-tools/cmd/controller-gen,$(CONTROLLER_GEN_VERSION))

define go-install-tool
@[ -f $(1) ] || { \
set -e; \
package=$(2)@$(3) ;\
echo "Downloading $${package}" ;\
GOBIN=$(LOCALBIN) go install $${package} ;\
mv "$$(echo "$(1)" | sed "s/-$(3)$$//")" $(1) ;\
}
endef
