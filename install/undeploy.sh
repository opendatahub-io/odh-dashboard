#!/usr/bin/env bash
printf "\n\n######## undeploy ########\n"

KUSTOMIZE_MANIFEST_DIR_OVERLAY_DEV="${KUSTOMIZE_MANIFEST_DIR}/overlays/dev"

oc project ${OC_PROJECT} 2> /dev/null
oc label namespace ${OC_PROJECT} openshift.io/cluster-monitoring-
oc project

pushd ${KUSTOMIZE_MANIFEST_DIR_OVERLAY_DEV}
kustomize edit set namespace ${OC_PROJECT}
popd

# Use kustomize to build the yaml objects so we get full support for all the kustomize standards
kustomize build ${KUSTOMIZE_MANIFEST_DIR_OVERLAY_DEV} | oc delete -f -
