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

.PHONY: all
all: build

.PHONY: fmt
fmt: ## Applies the correct code style to source files using go fmt.
	cd bff && go fmt ./...

.PHONY: vet
vet:  . ## Runs static analysis tools on source files and reports suspicious constructs that could be bugs or syntactical errors.
	cd bff && go vet ./...

##@ Dependencies

## Location to install dependencies to
LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p $(LOCALBIN)

## Tool Binaries
ENVTEST ?= $(LOCALBIN)/setup-envtest-$(ENVTEST_VERSION)
GOLANGCI_LINT ?= $(LOCALBIN)/golangci-lint-$(GOLANGCI_LINT_VERSION)

## Tool Versions
GOLANGCI_LINT_VERSION ?= v2.0.2
ENVTEST_VERSION ?= release-0.17
ENVTEST_K8S_VERSION ?= 1.29.0

.PHONY: envtest
envtest: $(ENVTEST) ## Download setup-envtest locally if necessary.
$(ENVTEST): $(LOCALBIN)
	$(call go-install-tool,$(ENVTEST),sigs.k8s.io/controller-runtime/tools/setup-envtest,$(ENVTEST_VERSION))

.PHONY: golangci-lint
golangci-lint: $(GOLANGCI_LINT) ## Download golangci-lint locally if necessary.
$(GOLANGCI_LINT): $(LOCALBIN)
	$(call go-install-tool,$(GOLANGCI_LINT),github.com/golangci/golangci-lint/v2/cmd/golangci-lint,${GOLANGCI_LINT_VERSION})


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

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)


.PHONY: test
test: fmt vet envtest
	cd bff && \
	ABS_BIN_DIR="$$(pwd)/../bin" && \
	ASSETS_PATH="$$( $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir "$$ABS_BIN_DIR" -p path )" && \
	ENVTEST_ASSETS_DIR="$$(dirname "$$(dirname "$$ASSETS_PATH")")" \
	go test ./internal/api -v

############ Dev Environment ############

.PHONY: dev-install-dependencies
dev-install-dependencies:
	cd frontend && npm install

.PHONY: dev-bff
dev-bff:
	trap 'exit 0' INT; \
	cd bff && make run PORT=4000 MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true DEV_MODE=true DEPLOYMENT_MODE=standalone

.PHONY: dev-frontend
dev-frontend:
	cd frontend && DEPLOYMENT_MODE=standalone STYLE_THEME=mui-theme npm run start:dev

.PHONY: dev-start
dev-start:
	@trap 'exit 0' INT; \
	make -j 2 dev-bff dev-frontend

########### Dev Kubeflow ############
.PHONY: dev-start-kubeflow
dev-start-kubeflow:
	@trap 'exit 0' INT; \
	make -j 2 dev-bff-kubeflow dev-frontend-kubeflow

.PHONY: dev-frontend-kubeflow
dev-frontend-kubeflow:
	cd frontend && DEPLOYMENT_MODE=kubeflow STYLE_THEME=mui-theme npm run start:dev

.PHONY: dev-bff-kubeflow
dev-bff-kubeflow:
	cd bff && make run PORT=4000 MOCK_K8S_CLIENT=false MOCK_HTTP_CLIENT=false DEV_MODE=true DEPLOYMENT_MODE=kubeflow DEV_MODE_CLIENT_PORT=8085

########### Dev Federated ###########
.PHONY: dev-start-federated
dev-start-federated:
	@trap 'exit 0' INT; \
	make -j 2 dev-bff-federated dev-frontend-federated

.PHONY: dev-frontend-federated
dev-frontend-federated:
	cd frontend && AUTH_METHOD=user_token DEPLOYMENT_MODE=federated STYLE_THEME=patternfly PORT=9104 PROXY_PORT=8081 npm run start:dev

.PHONY: dev-bff-federated
dev-bff-federated:
	cd bff && make run PORT=8081 MOCK_K8S_CLIENT=false MOCK_HTTP_CLIENT=true DEV_MODE=true DEPLOYMENT_MODE=federated DEV_MODE_CLIENT_PORT=8085 AUTH_METHOD=user_token AUTH_TOKEN_HEADER=x-forwarded-access-token AUTH_TOKEN_PREFIX="" INSECURE_SKIP_VERIFY=true

############ Build ############

.PHONY: docker-build
docker-build:
	$(CONTAINER_TOOL) build --build-arg DEPLOYMENT_MODE=kubeflow --build-arg STYLE_THEME=mui-theme -t ${IMG_UI} .

.PHONY: docker-build-standalone
docker-build-standalone:
	$(CONTAINER_TOOL) build --build-arg DEPLOYMENT_MODE=standalone --build-arg STYLE_THEME=mui-theme -t ${IMG_UI_STANDALONE} .

.PHONY: docker-build-federated
docker-build-federated:
	$(CONTAINER_TOOL) build --build-arg DEPLOYMENT_MODE=federated --build-arg STYLE_THEME=patternfly -t ${IMG_UI_FEDERATED} .

.PHONY: docker-buildx
docker-buildx:
	docker buildx build --build-arg DEPLOYMENT_MODE=kubeflow --build-arg STYLE_THEME=mui-theme --platform ${PLATFORM} -t ${IMG_UI} --push .

.PHONY: docker-buildx-standalone
docker-buildx-standalone:
	docker buildx build --build-arg DEPLOYMENT_MODE=standalone --build-arg STYLE_THEME=mui-theme --platform ${PLATFORM} -t ${IMG_UI_STANDALONE} --push .

.PHONY: docker-buildx-federated
docker-buildx-federated:
	docker buildx build --build-arg DEPLOYMENT_MODE=federated --build-arg STYLE_THEME=patternfly --platform ${PLATFORM} -t ${IMG_UI_FEDERATED} --push .

############ Push ############

.PHONY: docker-push
docker-push:
	${CONTAINER_TOOL} push ${IMG_UI}

.PHONY: docker-push-standalone
docker-push-standalone:
	${CONTAINER_TOOL} push ${IMG_UI_STANDALONE}

.PHONY: docker-push-federated
docker-push-federated:
	${CONTAINER_TOOL} push ${IMG_UI_FEDERATED}

############ Deployment ############

.PHONY: kind-deployment
kind-deployment:
	./scripts/deploy_kind_cluster.sh

.PHONY: kubeflow-deployment
kubeflow-deployment:
	./scripts/deploy_kubeflow_cluster.sh

############ Build ############
.PHONY: frontend-build
frontend-build:
	cd frontend && DEPLOYMENT_MODE=kubeflow npm run build:prod

.PHONY: frontend-build-standalone
frontend-build-standalone:
	cd frontend && DEPLOYMENT_MODE=standalone npm run build:prod

.PHONY: bff-build
bff-build:
	cd bff && make build

.PHONY: build
build: frontend-build bff-build

############ Run mocked ########
.PHONY: run-local-mocked
run-local-mocked: frontend-build-standalone bff-build
	rm -r ./bff/static-local-run && cp -r ./frontend/dist/ ./bff/static-local-run/ && cd bff && make run STATIC_ASSETS_DIR=./static-local-run MOCK_K8S_CLIENT=true DEV_MODE=true


