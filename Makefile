DEFAULT_ENV_FILE := .env.default
ifneq ("$(wildcard $(DEFAULT_ENV_FILE))","")
include ${DEFAULT_ENV_FILE}
export $(shell sed 's/=.*//' ${DEFAULT_ENV_FILE})
endif

ENV_FILE := .env
ifneq ("$(wildcard $(ENV_FILE))","")
include ${ENV_FILE}
export $(shell sed 's/=.*//' ${ENV_FILE})
endif

##################################

# DEV - run apps locally for development

.PHONY: dev-frontend
dev-frontend:
	./install/dev-frontend.sh

.PHONY: dev-backend
dev-backend:
	./install/dev-backend.sh

##################################

# BUILD - build image locally using s2i

.PHONY: build
build:
	./install/build.sh

##################################

# PUSH - push image to repository

.PHONY: push
push:
	./install/push.sh

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
deploy: login
	./install/deploy.sh

##################################

.PHONY: undeploy
undeploy: login
	./install/undeploy.sh

##################################
