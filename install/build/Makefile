OC_PROJECT ?= redhat-ods-applications
IMAGE_NAME ?= s2i-odh-dashboard
TAG_NAME ?= v0.0.1

all: output-vars

output-vars::
	@echo OC_PROJECT=$(OC_PROJECT) IMAGE_NAME=$(IMAGE_NAME) TAG_NAME=$(TAG_NAME)

set-namespace::
	kustomize edit set namespace $(OC_PROJECT)

set-image-tag::
	kustomize cfg set . IMAGE_NAME $(IMAGE_NAME)
	kustomize cfg set . TAG_NAME $(TAG_NAME)

deploy:: output-vars set-namespace set-image-tag
	kustomize build | kubectl apply -f -

undeploy: output-vars set-namespace set-image-tag
	kustomize build | kubectl delete -f - || exit 0

reset: output-vars set-namespace set-image-tag
