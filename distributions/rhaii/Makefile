DEFAULT_ENV_FILE := .env
ifneq ("$(wildcard $(DEFAULT_ENV_FILE))","")
include ${DEFAULT_ENV_FILE}
export $(shell sed 's/=.*//' ${DEFAULT_ENV_FILE})
endif

ENV_FILE := .env.local
ifneq ("$(wildcard $(ENV_FILE))","")
include ${ENV_FILE}
export $(shell sed 's/=.*//' ${ENV_FILE})
endif

CONTAINER_TOOL ?= docker
IMG ?= rhaii-dashboard:latest

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

.PHONY: dev-start
dev-start: ## Start in mock mode (BFF + webpack dev server, no cluster needed)
	npm run start:dev

##@ Build

.PHONY: build-frontend
build-frontend: ## Build the RHAII frontend
	npm run build

.PHONY: docker-build
docker-build: ## Build container image
	cd ../.. && "$(CONTAINER_TOOL)" build -f distributions/rhaii/Dockerfile -t "$(IMG)" .

.PHONY: docker-push
docker-push: ## Push container image to registry
	"$(CONTAINER_TOOL)" push "$(IMG)"
