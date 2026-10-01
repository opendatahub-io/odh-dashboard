#!/usr/bin/env bash
set -euo pipefail

# Pinned version used by the controller manifests and dependency installer.
KSERVE_VERSION="v0.19.0"

# Pinned manifest URLs
LLMISVC_DEPENDENCIES_URL="https://github.com/kserve/kserve/releases/download/${KSERVE_VERSION}/llmisvc-dependency-install.sh"
KSERVE_URL="https://github.com/kserve/kserve/releases/download/${KSERVE_VERSION}/kserve.yaml"
KSERVE_RESOURCES_URL="https://github.com/kserve/kserve/releases/download/${KSERVE_VERSION}/kserve-cluster-resources.yaml"

EXPECTED_CONTEXT="kind-rhaii-tilt"
WAIT_TIMEOUT="300s"

info()  { echo "==> $*"; }
error() { echo "ERROR: $*" >&2; exit 1; }

# --- Prerequisites -----------------------------------------------------------

command -v kubectl >/dev/null 2>&1 || error "kubectl not found in PATH"
command -v curl >/dev/null 2>&1 || error "curl not found in PATH"
command -v go >/dev/null 2>&1 || error "go not found in PATH (required for Kind's external load balancer)"

CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || true)
if [[ "$CURRENT_CONTEXT" != "$EXPECTED_CONTEXT" ]]; then
  error "kubectl context is '${CURRENT_CONTEXT}', expected '${EXPECTED_CONTEXT}'. Run 'make setup-kind' first."
fi

kubectl cluster-info >/dev/null 2>&1 || error "Cluster not reachable. Is the Kind cluster running?"

if kubectl get namespace cert-manager >/dev/null 2>&1 &&
  ! kubectl get secret -n cert-manager -l owner=helm,name=cert-manager -o name | grep -q .; then
  error "The existing cert-manager installation is not managed by KServe's Helm installer. Recreate the disposable cluster with 'kind delete cluster --name rhaii-tilt', then rerun this command."
fi

# --- LLMInferenceService infrastructure dependencies -------------------------
# KServe's pinned installer is idempotent and supplies cert-manager, Gateway API
# and Inference Extension resources, Envoy Gateway, Envoy AI Gateway, and LWS.
# Download it before executing so a failed download is never piped into a shell.

DEPENDENCY_INSTALLER=$(mktemp)
trap 'rm -f "$DEPENDENCY_INSTALLER"' EXIT

info "Installing KServe ${KSERVE_VERSION} LLMInferenceService dependencies..."
curl -fsSL "$LLMISVC_DEPENDENCIES_URL" -o "$DEPENDENCY_INSTALLER"
bash "$DEPENDENCY_INSTALLER"
rm -f "$DEPENDENCY_INSTALLER"
trap - EXIT

info "Waiting for cert-manager-webhook to be ready..."
kubectl wait deployment cert-manager-webhook \
  -n cert-manager \
  --for=condition=Available \
  --timeout="$WAIT_TIMEOUT"

# --- KServe core (CRDs + controller + webhooks) ------------------------------
# The kserve.yaml manifest bundles namespace, CRDs, controller, webhooks, and
# custom resources (ClusterStorageContainer) in a single file. A plain
# `kubectl apply` fails for three reasons:
#   1. CRD annotations exceed the 262144-byte last-applied-configuration limit
#   2. Namespaced resources fail if the namespace object hasn't been created yet
#   3. ClusterStorageContainer CR is applied before its CRD is established
#
# Fix: create the namespace up front, then use server-side apply in two passes.
# Server-side apply avoids the annotation size limit, and the second pass picks
# up any resources that failed due to CRD ordering.

if kubectl get deployment kserve-controller-manager -n kserve >/dev/null 2>&1 &&
  kubectl get deployment llmisvc-controller-manager -n kserve >/dev/null 2>&1; then
  info "KServe and LLMInferenceService controllers already installed — skipping core install"
else
  info "Ensuring kserve namespace exists..."
  kubectl create namespace kserve --dry-run=client -o yaml | kubectl apply -f -

  info "Installing KServe ${KSERVE_VERSION} (pass 1: CRDs + core resources)..."
  kubectl apply --server-side --force-conflicts -f "$KSERVE_URL" 2>&1 || true

  info "Waiting for KServe CRDs to be established..."
  kubectl wait crd inferenceservices.serving.kserve.io --for=condition=Established --timeout=60s
  kubectl wait crd llminferenceservices.serving.kserve.io --for=condition=Established --timeout=60s
  kubectl wait crd llminferenceserviceconfigs.serving.kserve.io --for=condition=Established --timeout=60s
  kubectl wait crd servingruntimes.serving.kserve.io --for=condition=Established --timeout=60s

  info "Installing KServe ${KSERVE_VERSION} (pass 2: remaining resources)..."
  kubectl apply --server-side --force-conflicts -f "$KSERVE_URL"
fi

# --- KServe serving runtimes -------------------------------------------------
# The controller manifest does not include the ClusterServingRuntime
# definitions. Install them separately so model formats such as sklearn have
# a runtime available for automatic selection.

info "Installing KServe ${KSERVE_VERSION} cluster serving runtimes..."
kubectl apply --server-side --force-conflicts -f "$KSERVE_RESOURCES_URL"

# --- Configure RawDeployment mode ---------------------------------------------
# KServe defaults to serverless (Knative) mode. We run without Knative/Istio,
# so switch to RawDeployment mode and disable ingress creation. Configure this
# before waiting for the controller: on cluster restart, KServe v0.19 validates
# the persisted ingress object during startup.

info "Configuring KServe for RawDeployment mode..."
kubectl patch configmap inferenceservice-config \
  -n kserve \
  --type merge \
  -p '{
    "data": {
      "deploy": "{\"defaultDeploymentMode\": \"RawDeployment\"}",
      "ingress": "{\"enableGatewayApi\": false, \"kserveIngressGateway\": \"kserve/kserve-ingress-gateway\", \"ingressGateway\": \"knative-serving/knative-ingress-gateway\", \"localGateway\": \"knative-serving/knative-local-gateway\", \"localGatewayService\": \"knative-local-gateway.istio-system.svc.cluster.local\", \"ingressDomain\": \"example.com\", \"ingressClassName\": \"istio\", \"domainTemplate\": \"{{ .Name }}-{{ .Namespace }}.{{ .IngressDomain }}\", \"urlScheme\": \"http\", \"disableIstioVirtualHost\": false, \"disableIngressCreation\": true, \"disableHTTPRouteTimeout\": false}"
    }
  }'

info "Waiting for kserve-controller-manager to be ready..."
kubectl wait deployment kserve-controller-manager \
  -n kserve \
  --for=condition=Available \
  --timeout="$WAIT_TIMEOUT"

info "Waiting for llmisvc-controller-manager to be ready..."
kubectl wait deployment llmisvc-controller-manager \
  -n kserve \
  --for=condition=Available \
  --timeout="$WAIT_TIMEOUT"

# --- Summary ------------------------------------------------------------------

info "KServe dev environment ready!"
echo "  KServe:       ${KSERVE_VERSION}"
echo "  LLMIsvc:      controller and dependencies installed"
echo "  Deploy mode:  RawDeployment"
echo ""
echo "CRDs installed:"
kubectl get crd -o name | grep kserve | sed 's|^|  |'
