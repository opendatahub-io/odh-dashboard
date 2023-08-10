#!/usr/bin/env bash
printf "\n\n######## deploy overlay ${KUSTOMIZE_DEFAULT_OVERLAY} ########\n"

KUSTOMIZE_MANIFEST_DIR_OVERLAY="${KUSTOMIZE_MANIFEST_DIR}${KUSTOMIZE_DEFAULT_OVERLAY}"

if [[ -z "${OC_PROJECT}" ]]; then
  echo "ERROR: No value defined for OC_PROJECT env var"
  exit 1
fi

if ! oc get project ${OC_PROJECT} 2> /dev/null; then
  echo "INFO: Project ${OC_PROJECT} does not exist, creating it..."
  oc new-project ${OC_PROJECT} --skip-config-write=true
fi

oc config set-context --current --namespace=${OC_PROJECT}

# Allow Prometheus metrics scraping in the namespace
oc label namespace ${OC_PROJECT} openshift.io/cluster-monitoring='true' --overwrite

# Deploy dashboard manifests using kustomize
pushd ${KUSTOMIZE_MANIFEST_DIR_OVERLAY}
kustomize edit set namespace ${OC_PROJECT}
kustomize edit set image quay.io/opendatahub/odh-dashboard=${IMAGE_REPOSITORY}
if [[ ! -z "${OAUTH_IMAGE_REPOSITORY}" ]]; then
  kustomize edit set image registry.redhat.io/openshift4/ose-oauth-proxy=${OAUTH_IMAGE_REPOSITORY}
fi
popd

# Use kustomize to build the yaml objects so we get full support for all the kustomize standards
kustomize build ${KUSTOMIZE_MANIFEST_DIR_OVERLAY} | oc apply -f -
