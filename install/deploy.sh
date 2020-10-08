#!/usr/bin/env bash
printf "\n\n######## deploy ########\n"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

oc project ${OC_PROJECT} 2> /dev/null || oc new-project ${PROJECT}
oc project

envsubst < "${DIR}/odh/overlays/dev/kustomization_template.yaml" > "${DIR}/odh/overlays/dev/kustomization.yaml"
envsubst < "${DIR}/odh/overlays/dev/deployment_patch_template.yaml" > "${DIR}/odh/overlays/dev/deployment_patch.yaml"
oc apply -k "${DIR}/odh/overlays/dev"
