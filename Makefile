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

CONTAINER_BUILDER?=podman
CONTAINER_DOCKERFILE?=Dockerfile

##################################

# DEV Convenience

reinstall: build push undeploy deploy

.PHONY:dev-setup
dev-setup:
	echo "Running dev-setup..."
	./scripts/dev/dev-setup.sh

##################################

# BUILD - build image locally using s2i

.PHONY: build
build:
	echo "Building ${IMAGE_REPOSITORY} from ${CONTAINER_DOCKERFILE}"
	${CONTAINER_BUILDER} build -f ${CONTAINER_DOCKERFILE} -t ${IMAGE_REPOSITORY} .

##################################

# Build multi-arch image

PLATFORMS ?= linux/s390x,linux/amd64,linux/ppc64le
.PHONY: docker-buildx
docker-buildx: ## Build and push docker image for the manager for cross-platform support
	# copy existing Dockerfile and insert --platform=${BUILDPLATFORM} into Dockerfile.cross, and preserve the original Dockerfile
	sed -e '1 s/\(^FROM\)/FROM --platform=\$$\{BUILDPLATFORM\}/; t' -e ' 1,// s//FROM --platform=\$$\{BUILDPLATFORM\}/' Dockerfile > Dockerfile.cross
	- docker buildx create --name project-v3-builder
	docker buildx use project-v3-builder
	- docker buildx build --push --platform=$(PLATFORMS) --tag ${IMAGE_REPOSITORY} -f Dockerfile.cross .
	- docker buildx rm project-v3-builder
	rm Dockerfile.cross

####################################

# PUSH - push image to repository

.PHONY: push
push:
	echo "Pushing ${IMAGE_REPOSITORY}"
	${CONTAINER_BUILDER} push ${IMAGE_REPOSITORY}

##################################

.PHONY: login
login:
ifdef OC_TOKEN
	$(info **** Using OC_TOKEN for login ****)
	oc login ${OC_URL} --token=${OC_TOKEN}
else
	$(info **** Using OC_USER and OC_PASSWORD for login ****)
	oc login ${OC_URL} -u ${OC_USER} -p "${OC_PASSWORD}" --insecure-skip-tls-verify=true
endif

##################################

.PHONY: deploy
deploy:
	./install/deploy.sh

##################################

.PHONY: undeploy
undeploy:
	./install/undeploy.sh

##################################

.PHONY: port-forward
port-forward:
ifdef NAMESPACE
	parallel -j0 --lb ::: \
	'oc port-forward -n ${NAMESPACE} svc/ds-pipeline-md-${DSPA_NAME} ${METADATA_ENVOY_SERVICE_PORT}:8443' \
	'oc port-forward -n ${NAMESPACE} svc/ds-pipeline-${DSPA_NAME} ${DS_PIPELINE_DSPA_SERVICE_PORT}:8443' \
	'oc port-forward -n ${NAMESPACE} svc/${TRUSTYAI_NAME}-tls ${TRUSTYAI_TAIS_SERVICE_PORT}:443' \
	'oc port-forward -n ${MODEL_REGISTRY_NAMESPACE} svc/${MODEL_REGISTRY_NAME} ${MODEL_REGISTRY_SERVICE_PORT}:8080'
else
	$(error Missing NAMESPACE variable)
endif

##################################
