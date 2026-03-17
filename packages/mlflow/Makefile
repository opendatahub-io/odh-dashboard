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

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)


############ Dev Environment ############

.PHONY: dev-install-dependencies
dev-install-dependencies: ## Install dependencies for frontend
	cd frontend && npm install

.PHONY: dev-bff-mock
dev-bff-mock: ## Run BFF with all mocks enabled (K8s + MLflow via uv, falls back to static)
	cd bff && make run PORT=4000 MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true AUTH_METHOD=disabled DEV_MODE=true DEPLOYMENT_MODE=standalone LOG_LEVEL=debug

.PHONY: dev-bff-mock-static
dev-bff-mock-static: ## Run BFF with static in-memory mock data (no uv, no mlflow.db, no external server)
	cd bff && make run PORT=4000 MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true STATIC_MLFLOW_MOCK=true AUTH_METHOD=disabled DEV_MODE=true DEPLOYMENT_MODE=standalone LOG_LEVEL=debug

.PHONY: dev-bff
dev-bff: ## Run BFF connecting to a real MLflow instance (requires .env.local with MLFLOW_URL)
	cd bff && MLFLOW_URL=${MLFLOW_URL} make run PORT=4000 AUTH_METHOD=user_token AUTH_TOKEN_HEADER=Authorization AUTH_TOKEN_PREFIX="Bearer " INSECURE_SKIP_VERIFY=$(or ${INSECURE_SKIP_VERIFY},false) DEV_MODE=true DEPLOYMENT_MODE=standalone LOG_LEVEL=debug STATIC_ASSETS_DIR=../frontend/dist

.PHONY: dev-frontend
dev-frontend: ## Run only the frontend in development mode
	cd frontend && DEPLOYMENT_MODE=standalone STYLE_THEME=mui-theme npm run start:dev

.PHONY: dev-mlflow-up
dev-mlflow-up: ## Start local MLflow tracking server for development
	cd bff && make mlflow-up

.PHONY: dev-bff-mock-local
dev-bff-mock-local: ## Run BFF with mocked K8s but real local MLflow
	cd bff && make run PORT=4000 MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true AUTH_METHOD=disabled MLFLOW_URL=http://127.0.0.1:5001 DEV_MODE=true DEPLOYMENT_MODE=standalone LOG_LEVEL=debug

.PHONY: dev-start-mock
dev-start-mock: ## Run frontend and BFF (all mocks) in development mode
	@trap 'exit 0' INT; \
	make -j 2 dev-bff-mock dev-frontend

.PHONY: dev-start-mock-static
dev-start-mock-static: ## Run frontend and BFF with static in-memory mock data (no uv, no mlflow.db)
	@trap 'exit 0' INT; \
	make -j 2 dev-bff-mock-static dev-frontend

.PHONY: dev-start-mock-local
dev-start-mock-local: ## Run frontend and BFF with mocked K8s + local MLflow (started and seeded automatically by the BFF)
	@trap 'exit 0' INT; \
	make -j 2 dev-bff-mock-local dev-frontend

.PHONY: dev-start
dev-start: ## Run frontend and BFF connecting to a real MLflow instance
	@trap 'exit 0' INT; \
	AUTH_METHOD=user_token make -j 2 dev-bff dev-frontend

########### Dev Federated ###########
.PHONY: dev-start-federated
dev-start-federated:
	@trap 'exit 0' INT; \
	make -j 2 dev-bff-federated dev-frontend-federated

.PHONY: dev-frontend-federated
dev-frontend-federated:
	cd frontend && AUTH_METHOD=user_token DEPLOYMENT_MODE=federated STYLE_THEME=patternfly-theme PORT=9110 PROXY_PORT=4020 npm run start:dev

.PHONY: dev-bff-federated
dev-bff-federated:
	cd bff && make run PORT=4020 MOCK_K8S_CLIENT=false MOCK_HTTP_CLIENT=false DEV_MODE=true DEPLOYMENT_MODE=federated DEV_MODE_CLIENT_PORT=8085 AUTH_METHOD=user_token AUTH_TOKEN_HEADER=x-forwarded-access-token AUTH_TOKEN_PREFIX="" INSECURE_SKIP_VERIFY=$(or ${INSECURE_SKIP_VERIFY},false)

############ Build ############

.PHONY: docker-build
docker-build:
	$(CONTAINER_TOOL) build --build-arg DEPLOYMENT_MODE=standalone --build-arg STYLE_THEME=mui-theme -t ${IMG_UI} .

.PHONY: docker-build-standalone
docker-build-standalone:
	$(CONTAINER_TOOL) build --build-arg DEPLOYMENT_MODE=standalone --build-arg STYLE_THEME=mui-theme -t ${IMG_UI_STANDALONE} .

.PHONY: docker-build-federated
docker-build-federated:
	$(CONTAINER_TOOL) build --build-arg DEPLOYMENT_MODE=federated --build-arg STYLE_THEME=patternfly-theme -t ${IMG_UI_FEDERATED} .

.PHONY: docker-buildx
docker-buildx:
	docker buildx build --build-arg DEPLOYMENT_MODE=standalone --build-arg STYLE_THEME=mui-theme --platform ${PLATFORM} -t ${IMG_UI} --push .

.PHONY: docker-buildx-standalone
docker-buildx-standalone:
	docker buildx build --build-arg DEPLOYMENT_MODE=standalone --build-arg STYLE_THEME=mui-theme --platform ${PLATFORM} -t ${IMG_UI_STANDALONE} --push .

.PHONY: docker-buildx-federated
docker-buildx-federated:
	docker buildx build --build-arg DEPLOYMENT_MODE=federated --build-arg STYLE_THEME=patternfly-theme --platform ${PLATFORM} -t ${IMG_UI_FEDERATED} --push .

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

############ Component Build ############
.PHONY: frontend-build
frontend-build:
	cd frontend && DEPLOYMENT_MODE=standalone npm run build:prod

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
	rm -rf ./bff/static-local-run && cp -r ./frontend/dist/ ./bff/static-local-run/ && cd bff && make run STATIC_ASSETS_DIR=./static-local-run MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true AUTH_METHOD=disabled DEV_MODE=true
