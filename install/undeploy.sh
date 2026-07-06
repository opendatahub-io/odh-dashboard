#!/usr/bin/env bash
printf "\n\n######## undeploy overlay ${KUSTOMIZE_DEFAULT_OVERLAY} ########\n"

KUSTOMIZE_MANIFEST_DIR_OVERLAY="${KUSTOMIZE_MANIFEST_DIR}${KUSTOMIZE_DEFAULT_OVERLAY}"

if [[ -z "${OC_PROJECT}" ]]; then
  echo "ERROR: No value defined for OC_PROJECT env var"
  exit 1
fi

if ! oc get project ${OC_PROJECT} 2> /dev/null; then
  echo "EROR: Project ${OC_PROJECT} does not exist"
  exit 1
fi

oc config set-context --current --namespace=${OC_PROJECT}

# Allow Prometheus metrics scraping in the namespace
oc label namespace ${OC_PROJECT} openshift.io/cluster-monitoring-

# Uninstall dashboard using kustomize
pushd ${KUSTOMIZE_MANIFEST_DIR_OVERLAY}
kustomize edit set namespace ${OC_PROJECT}
popd

# Use kustomize to build the yaml objects so we get full support for all the kustomize standards
kustomize build ${KUSTOMIZE_MANIFEST_DIR_OVERLAY} | oc delete --ignore-not-found=true -f -
