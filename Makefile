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

##################################

# DEV Convenience

reinstall: build push undeploy deploy

##################################

# DEV - run apps locally for development

.PHONY: dev-frontend
dev-frontend:
	./install/dev-frontend.sh

.PHONY: dev-backend
dev-backend:
	./install/dev-backend.sh

.PHONY: dev
dev:
	./install/dev.sh

##################################

# BUILD - build image in OC_PROJECT using BuildConfig, ImageStream

.PHONY: build
build:
	cd install/build && make undeploy deploy && unset OC_PROJECT IMAGE_NAME TAG_NAME && make reset

##################################

# BUILD-LOCAL - build image using s2i, also requires push

.PHONY: build-local
build-local:
	./install/build-local.sh


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
	cd install/deploy && make deploy && unset OC_PROJECT DASHBOARD_NAME ROUTE_NAMESPACE IMAGE_NAME TAG_NAME REPLICAS && make reset

##################################

.PHONY: undeploy
undeploy: login
	cd install/deploy && make undeploy && unset OC_PROJECT DASHBOARD_NAME ROUTE_NAMESPACE IMAGE_NAME TAG_NAME REPLICAS && make reset

##################################

.PHONY: defaults
defaults:
	cd install/build && unset OC_PROJECT IMAGE_NAME TAG_NAME && make reset
	cd install/deploy && unset OC_PROJECT DASHBOARD_NAME ROUTE_NAMESPACE IMAGE_NAME TAG_NAME REPLICAS && make reset

