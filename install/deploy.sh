#!/usr/bin/env bash
printf "\n\n######## deploy ########\n"

KUSTOMIZE_MANIFEST_DIR_OVERLAY_DEV="${KUSTOMIZE_MANIFEST_DIR}/overlays/dev"

if [[ -z "${OC_PROJECT}" ]]; then
  echo "ERROR: No value defined for OC_PROJECT env var"
  exit 1
fi

oc project ${OC_PROJECT} 2> /dev/null || oc new-project ${PROJECT}
oc project

pushd ${KUSTOMIZE_MANIFEST_DIR_OVERLAY_DEV}
kustomize edit set namespace ${OC_PROJECT}
kustomize edit set image quay.io/opendatahub/odh-dashboard=${IMAGE_REPOSITORY}
if [[ ! -z "${OAUTH_IMAGE_REPOSITORY}" ]]; then
  kustomize edit set image registry.redhat.io/openshift4/ose-oauth-proxy=${OAUTH_IMAGE_REPOSITORY}
fi
popd

# Use kustomize to build the yaml objects so we get full support for all the kustomize standards
kustomize build ${KUSTOMIZE_MANIFEST_DIR_OVERLAY_DEV} | oc apply -f -
