REPO_ROOT := ../..

DEFAULT_ENV_FILE := .env
ifneq (,$(wildcard $(DEFAULT_ENV_FILE)))
include $(DEFAULT_ENV_FILE)
export $(shell sed 's/=.*//' $(DEFAULT_ENV_FILE))
endif

DEV_ENV_FILE := .env.development
ifneq (,$(wildcard $(DEV_ENV_FILE)))
include $(DEV_ENV_FILE)
export $(shell sed 's/=.*//' $(DEV_ENV_FILE))
endif

LOCAL_ENV_FILE := .env.local
ifneq (,$(wildcard $(LOCAL_ENV_FILE)))
include $(LOCAL_ENV_FILE)
export $(shell sed 's/=.*//' $(LOCAL_ENV_FILE))
endif

CONTAINER_TOOL ?= docker
AUTH_DISABLED ?= false
OPENSHELL_BFF_IMAGE ?= quay.io/gkrumbach07/openshell-dashboard@sha256:6b09b05323a8ff39ae7ff14567687ed6e7ec244ef59b7663a9c1a2021dcee5e8
IMG_UI ?= agent-ops-openshell:local
IMG_UI_STANDALONE ?= agent-ops-openshell-standalone:local
IMG_UI_FEDERATED ?= agent-ops-openshell-federated:local
AGENT_OPS_IMAGE ?= $(IMG_UI_FEDERATED)
BFF_CONTAINER_NAME ?= agent-ops-bff-local
BFF_PORT ?= 4021
FRONTEND_PORT ?= 9111
PROXY_PORT ?= $(BFF_PORT)

GATEWAY_TLS_ARGS = $(if $(GATEWAY_CERT_DIR),--volume "$(GATEWAY_CERT_DIR):/etc/openshell-gateway:ro" --env GATEWAY_CA_CERT=/etc/openshell-gateway/ca.crt --env GATEWAY_CLIENT_CERT=/etc/openshell-gateway/tls.crt --env GATEWAY_CLIENT_KEY=/etc/openshell-gateway/tls.key,)

.PHONY: all help
all: build

help: ## Display available Agent Ops development targets.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*##/ { printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

############ Frontend Development ############

.PHONY: dev-install-dependencies dev-frontend dev-frontend-federated dev-frontend-kubeflow
dev-install-dependencies: ## Install frontend dependencies.
	cd frontend && npm install

dev-frontend: ## Run the standalone frontend development server.
	cd frontend && DEPLOYMENT_MODE=standalone STYLE_THEME=mui-theme PORT=$(FRONTEND_PORT) PROXY_PORT=$(PROXY_PORT) npm run start:dev

dev-frontend-federated: ## Run the federated frontend development server.
	cd frontend && DEPLOYMENT_MODE=federated STYLE_THEME=patternfly PORT=$(FRONTEND_PORT) PROXY_PORT=$(PROXY_PORT) npm run start:dev

dev-frontend-kubeflow: ## Run the Kubeflow frontend development server.
	cd frontend && DEPLOYMENT_MODE=kubeflow STYLE_THEME=mui-theme PORT=$(FRONTEND_PORT) PROXY_PORT=$(PROXY_PORT) npm run start:dev

############ Image-based BFF Development ############

.PHONY: dev-bff dev-bff-federated dev-bff-kubeflow
dev-bff: ## Run the assembled upstream-BFF image against OPENSHELL_GATEWAY_URL.
	@test -n "$(OPENSHELL_GATEWAY_URL)" || (echo "OPENSHELL_GATEWAY_URL is required" >&2; exit 1)
	$(CONTAINER_TOOL) run --rm --name "$(BFF_CONTAINER_NAME)" --publish "127.0.0.1:$(BFF_PORT):8080" --env "OPENSHELL_GATEWAY_URL=$(OPENSHELL_GATEWAY_URL)" --env "AUTH_DISABLED=$(AUTH_DISABLED)" $(GATEWAY_TLS_ARGS) "$(AGENT_OPS_IMAGE)"

dev-bff-federated: dev-bff ## Compatibility alias for the federated workflow.

dev-bff-kubeflow: dev-bff ## Compatibility alias for the Kubeflow workflow.

.PHONY: dev-start dev-start-federated dev-start-kubeflow
dev-start: docker-build-federated ## Build and run the BFF with the standalone frontend.
	@trap 'exit 0' INT; $(MAKE) -j 2 dev-bff dev-frontend

dev-start-federated: docker-build-federated ## Build and run the BFF with the federated frontend.
	@trap 'exit 0' INT; $(MAKE) -j 2 dev-bff-federated dev-frontend-federated

dev-start-kubeflow: docker-build-federated ## Build and run the BFF with the Kubeflow frontend.
	@trap 'exit 0' INT; $(MAKE) -j 2 dev-bff-kubeflow dev-frontend-kubeflow

############ E2E and Integration ############

E2E_BFF_PORT ?= 4021

.PHONY: dev-bff-e2e-cluster test-contract test-integration-rosa
dev-bff-e2e-cluster: ## Run the assembled BFF image on E2E_BFF_PORT.
	$(MAKE) dev-bff BFF_PORT=$(E2E_BFF_PORT)

test-contract: ## Run downstream image and module integration checks.
	npm run test:contract

test-integration-rosa: ## Run the read-only ROSA gateway smoke test.
	npm run test:integration:rosa

############ Build and Push ############

.PHONY: docker-build docker-build-standalone docker-build-federated docker-build-workspace bff-build build
docker-build: ## Build the default downstream Agent Ops image.
	$(CONTAINER_TOOL) build --build-arg OPENSHELL_BFF_IMAGE=$(OPENSHELL_BFF_IMAGE) --build-arg DEPLOYMENT_MODE=kubeflow --build-arg STYLE_THEME=mui-theme --tag "$(IMG_UI)" .

docker-build-standalone: ## Build the standalone downstream Agent Ops image.
	$(CONTAINER_TOOL) build --build-arg OPENSHELL_BFF_IMAGE=$(OPENSHELL_BFF_IMAGE) --build-arg DEPLOYMENT_MODE=standalone --build-arg STYLE_THEME=mui-theme --tag "$(IMG_UI_STANDALONE)" .

docker-build-federated: ## Build the federated downstream Agent Ops image.
	$(CONTAINER_TOOL) build --build-arg OPENSHELL_BFF_IMAGE=$(OPENSHELL_BFF_IMAGE) --build-arg DEPLOYMENT_MODE=federated --build-arg STYLE_THEME=patternfly --tag "$(IMG_UI_FEDERATED)" .

docker-build-workspace: ## Build the Konflux-style image from the repository root.
	$(CONTAINER_TOOL) build --file Dockerfile.workspace --build-arg OPENSHELL_BFF_IMAGE=$(OPENSHELL_BFF_IMAGE) --build-arg DEPLOYMENT_MODE=federated --tag "$(IMG_UI_FEDERATED)" $(REPO_ROOT)

bff-build: docker-build-federated ## Build the image containing the upstream BFF.

build: docker-build-federated ## Build the complete downstream Agent Ops image.

.PHONY: docker-buildx docker-buildx-standalone docker-buildx-federated
docker-buildx: ## Build and push the default multi-architecture image.
	docker buildx build --build-arg OPENSHELL_BFF_IMAGE=$(OPENSHELL_BFF_IMAGE) --build-arg DEPLOYMENT_MODE=kubeflow --build-arg STYLE_THEME=mui-theme --platform "$(PLATFORM)" --tag "$(IMG_UI)" --push .

docker-buildx-standalone: ## Build and push the standalone multi-architecture image.
	docker buildx build --build-arg OPENSHELL_BFF_IMAGE=$(OPENSHELL_BFF_IMAGE) --build-arg DEPLOYMENT_MODE=standalone --build-arg STYLE_THEME=mui-theme --platform "$(PLATFORM)" --tag "$(IMG_UI_STANDALONE)" --push .

docker-buildx-federated: ## Build and push the federated multi-architecture image.
	docker buildx build --build-arg OPENSHELL_BFF_IMAGE=$(OPENSHELL_BFF_IMAGE) --build-arg DEPLOYMENT_MODE=federated --build-arg STYLE_THEME=patternfly --platform "$(PLATFORM)" --tag "$(IMG_UI_FEDERATED)" --push .

.PHONY: docker-push docker-push-standalone docker-push-federated
docker-push: ## Push IMG_UI.
	$(CONTAINER_TOOL) push "$(IMG_UI)"

docker-push-standalone: ## Push IMG_UI_STANDALONE.
	$(CONTAINER_TOOL) push "$(IMG_UI_STANDALONE)"

docker-push-federated: ## Push IMG_UI_FEDERATED.
	$(CONTAINER_TOOL) push "$(IMG_UI_FEDERATED)"

############ Frontend Builds ############

.PHONY: frontend-build frontend-build-standalone
frontend-build: ## Build the Kubeflow frontend assets only.
	cd frontend && DEPLOYMENT_MODE=kubeflow npm run build:prod

frontend-build-standalone: ## Build the standalone frontend assets only.
	cd frontend && DEPLOYMENT_MODE=standalone npm run build:prod
