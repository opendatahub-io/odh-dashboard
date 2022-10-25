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

CONTAINER_BUILDER=podman
CONTAINER_DOCKERFILE=Dockerfile

##################################

# DEV Convenience

reinstall: build push undeploy deploy

##################################

# BUILD - build image locally using s2i

.PHONY: build
build:
	echo "Building ${IMAGE_REPOSITORY} from ${CONTAINER_DOCKERFILE}"
	${CONTAINER_BUILDER} build -f ${CONTAINER_DOCKERFILE} -t ${IMAGE_REPOSITORY} .

##################################

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
	oc login ${OC_URL} -u ${OC_USER} -p ${OC_PASSWORD} --insecure-skip-tls-verify=true
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
