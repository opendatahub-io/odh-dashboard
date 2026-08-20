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
all: frontend-build-federated

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

############ Dev Environment ############

.PHONY: dev-install-dependencies
dev-install-dependencies: ## Install frontend dependencies
	cd frontend && npm install

.PHONY: dev-frontend-federated
dev-frontend-federated: ## Run the federated Module Federation dev server
	cd frontend && AUTH_METHOD=user_token DEPLOYMENT_MODE=federated STYLE_THEME=patternfly PORT=9109 PROXY_PORT=4000 npm run start:dev

.PHONY: dev-start-federated
dev-start-federated: ## Start the standalone federated dev server (proxies /api to host backend)
	@trap 'exit 0' INT; \
	$(MAKE) dev-frontend-federated

############ Build ############

.PHONY: frontend-build-federated
frontend-build-federated: ## Build the federated remote bundle
	cd frontend && DEPLOYMENT_MODE=federated npm run build:prod

.PHONY: build
build: frontend-build-federated
