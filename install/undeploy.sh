#!/usr/bin/env bash
printf "\n\n######## undeploy ########\n"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

oc project ${OC_PROJECT} 2> /dev/null
oc project

envsubst < "${DIR}/odh/overlays/dev/kustomization_template.yaml" > "${DIR}/odh/overlays/dev/kustomization.yaml"
envsubst < "${DIR}/odh/overlays/dev/deployment_patch_template.yaml" > "${DIR}/odh/overlays/dev/deployment_patch.yaml"
oc delete -k "${DIR}/odh/overlays/dev"