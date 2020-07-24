#!/usr/bin/env bash
printf "\n\n######## deploy ########\n"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

oc project ${PROJECT} 2> /dev/null || oc new-project ${PROJECT}

oc apply -k "${DIR}/istio-system/base"

envsubst < "${DIR}/odh/overlays/default/kustomization_template.yaml" > "${DIR}/odh/overlays/default/kustomization.yaml"
envsubst < "${DIR}/odh/overlays/default/role_binding_patch_template.yaml" > "${DIR}/odh/overlays/default/role_binding_patch.yaml"
oc apply -k "${DIR}/odh/overlays/default"
