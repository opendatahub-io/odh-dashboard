#!/usr/bin/env bash
printf "\n\n######## deploy ########\n"

KUSTOMIZE_MANIFEST_DIR_OVERLAY_DEV="${KUSTOMIZE_MANIFEST_DIR}/overlays/dev"

if [[ -z "${OC_PROJECT}" ]]; then
  echo "ERROR: No value defined for OC_PROJECT env var"
  exit 1
fi

if [[ ! oc get project "${OC_PROJECT}" ]]; then
  echo "ERROR: Project ${OC_PROJECT} does not exist"
  exit 1
fi

# Allow Prometheus to scrape metrics from dashboard service monitors
oc label namespace ${OC_PROJECT} openshift.io/cluster-monitoring='true'

# Configure dashboard deployment
pushd ${KUSTOMIZE_MANIFEST_DIR_OVERLAY_DEV}
kustomize edit set namespace ${OC_PROJECT}
kustomize edit set image quay.io/opendatahub/odh-dashboard=${IMAGE_REPOSITORY}
if [[ ! -z "${OAUTH_IMAGE_REPOSITORY}" ]]; then
  kustomize edit set image registry.redhat.io/openshift4/ose-oauth-proxy=${OAUTH_IMAGE_REPOSITORY}
fi
popd

# Use kustomize to build the yaml objects so we get full support for all the kustomize standards
kustomize build ${KUSTOMIZE_MANIFEST_DIR_OVERLAY_DEV} | oc apply -f -

# OAuthClient requires a redirect URI with a route host name which the platform
# assigns to the route.
dashboard_url=$(oc get route odh-dashboard -o jsonpath='{$.spec.host}' -n ${OC_PROJECT})
cat <<EOF | oc apply -f -
apiVersion: oauth.openshift.io/v1
kind: OAuthClient
metadata:
  name: odh-dashboard
grantMethod: auto
redirectURIs:
- https://${dashboard_url}
secret: zPI1OE6GuN2o_PfmjhN0itZk7VWLdmHEsh6LMRrOw1Q
EOF
