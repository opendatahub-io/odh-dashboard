#!/usr/bin/env bash
set -euo pipefail

# Pinned versions used by the controller manifests and dependency installer.
KSERVE_VERSION="v0.19.0"
CLOUD_PROVIDER_KIND_VERSION="v0.10.0"
LLMISVC_DEPENDENCIES_SHA256="4e523d52936c1582e35bc5b52ad7a6be8df05536f5de79dd6299cf607f98f2ce"

# Pinned manifest URLs
LLMISVC_DEPENDENCIES_URL="https://github.com/kserve/kserve/releases/download/${KSERVE_VERSION}/llmisvc-dependency-install.sh"
KSERVE_URL="https://github.com/kserve/kserve/releases/download/${KSERVE_VERSION}/kserve.yaml"
KSERVE_RESOURCES_URL="https://github.com/kserve/kserve/releases/download/${KSERVE_VERSION}/kserve-cluster-resources.yaml"

EXPECTED_CONTEXT="kind-rhaii-tilt"
WAIT_TIMEOUT="300s"
GATEWAY_NAME="kserve-ingress-gateway"
GATEWAY_NAMESPACE="kserve"
CLOUD_PROVIDER_KIND_LOG="${TMPDIR:-/tmp}/rhaii-cloud-provider-kind.log"

info()  { echo "==> $*"; }
error() { echo "ERROR: $*" >&2; exit 1; }

cloud_provider_kind_is_running() {
  local escaped_binary
  escaped_binary=$(printf '%s\n' "${GO_BIN_DIR}/cloud-provider-kind" | sed 's/[][\\.^$*+?(){}|]/\\&/g')
  pgrep -f "^${escaped_binary}([[:space:]]|$)" >/dev/null 2>&1
}

verify_sha256() {
  local file="$1"
  local expected="$2"
  local actual

  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$file") || error "Unable to calculate SHA-256 for ${file}"
  elif command -v shasum >/dev/null 2>&1; then
    actual=$(shasum -a 256 "$file") || error "Unable to calculate SHA-256 for ${file}"
  else
    error "sha256sum or shasum is required to verify downloaded files"
  fi
  actual=${actual%% *}

  [[ "$actual" == "$expected" ]] || error "Checksum mismatch for ${LLMISVC_DEPENDENCIES_URL}"
}

print_cloud_provider_kind_recovery_command() {
  printf '  '
  printf '%q ' sudo env "$@"
  printf '%q\n' "${GO_BIN_DIR}/cloud-provider-kind"
}

start_cloud_provider_kind() {
  if cloud_provider_kind_is_running; then
    info "cloud-provider-kind is already running"
    return
  fi

  info "Starting cloud-provider-kind (log: ${CLOUD_PROVIDER_KIND_LOG})..."
  : >"$CLOUD_PROVIDER_KIND_LOG" || error "Unable to write cloud-provider-kind log: ${CLOUD_PROVIDER_KIND_LOG}"

  if [[ "$(uname -s)" == "Darwin" ]]; then
    info "cloud-provider-kind requires administrator privileges on macOS"
    local sudo_env=("PATH=${PATH}" "HOME=${HOME}")
    if [[ -n "${KIND_EXPERIMENTAL_PROVIDER:-}" ]]; then
      sudo_env+=("KIND_EXPERIMENTAL_PROVIDER=${KIND_EXPERIMENTAL_PROVIDER}")
    fi
    if [[ -n "${DOCKER_HOST:-}" ]]; then
      sudo_env+=("DOCKER_HOST=${DOCKER_HOST}")
    fi
    if [[ -n "${DOCKER_CONTEXT:-}" ]]; then
      sudo_env+=("DOCKER_CONTEXT=${DOCKER_CONTEXT}")
    fi
    if [[ -n "${CONTAINER_HOST:-}" ]]; then
      sudo_env+=("CONTAINER_HOST=${CONTAINER_HOST}")
    fi
    if ! sudo -v; then
      echo "Start it in another terminal, then rerun this command:" >&2
      print_cloud_provider_kind_recovery_command "${sudo_env[@]}" >&2
      error "Unable to obtain administrator privileges for cloud-provider-kind"
    fi
    sudo env "${sudo_env[@]}" \
      nohup "${GO_BIN_DIR}/cloud-provider-kind" >"$CLOUD_PROVIDER_KIND_LOG" 2>&1 &
  else
    nohup "${GO_BIN_DIR}/cloud-provider-kind" >"$CLOUD_PROVIDER_KIND_LOG" 2>&1 &
  fi

  sleep 2
  if ! cloud_provider_kind_is_running; then
    if [[ -s "$CLOUD_PROVIDER_KIND_LOG" ]]; then
      echo "cloud-provider-kind startup log (${CLOUD_PROVIDER_KIND_LOG}):" >&2
      tail -n 50 "$CLOUD_PROVIDER_KIND_LOG" >&2
    fi
    if [[ "$(uname -s)" == "Darwin" ]]; then
      echo "Start it in another terminal, then rerun this command:" >&2
      print_cloud_provider_kind_recovery_command "${sudo_env[@]}" >&2
    fi
    error "Failed to start cloud-provider-kind; see ${CLOUD_PROVIDER_KIND_LOG}"
  fi
  info "cloud-provider-kind started successfully"
}

# --- Prerequisites -----------------------------------------------------------

command -v kubectl >/dev/null 2>&1 || error "kubectl not found in PATH"
command -v curl >/dev/null 2>&1 || error "curl not found in PATH"
command -v go >/dev/null 2>&1 || error "go not found in PATH (required for Kind's external load balancer)"

GO_BIN_DIR=$(go env GOBIN 2>/dev/null) || error "Unable to determine GOBIN"
if [[ -z "$GO_BIN_DIR" ]]; then
  GO_PATH=$(go env GOPATH 2>/dev/null) || error "Unable to determine GOPATH"
  GO_PATH=${GO_PATH%%:*}
  [[ -n "$GO_PATH" ]] || error "GOPATH is empty; configure GOBIN or GOPATH before continuing"
  GO_BIN_DIR="${GO_PATH}/bin"
fi
mkdir -p "$GO_BIN_DIR" || error "Unable to create Go binary directory: ${GO_BIN_DIR}"

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
# Run from an owned temporary workspace so the upstream Helm/yq downloads are
# removed even though its BIN_DIR cleanup flag is not set in KServe v0.19.0.

DEPENDENCY_WORK_DIR=$(mktemp -d)
DEPENDENCY_INSTALLER="${DEPENDENCY_WORK_DIR}/llmisvc-dependency-install.sh"
trap 'rm -rf "$DEPENDENCY_WORK_DIR"' EXIT

info "Installing KServe ${KSERVE_VERSION} LLMInferenceService dependencies..."
curl -fsSL "$LLMISVC_DEPENDENCIES_URL" -o "$DEPENDENCY_INSTALLER"
verify_sha256 "$DEPENDENCY_INSTALLER" "$LLMISVC_DEPENDENCIES_SHA256"

# The upstream installer otherwise installs cloud-provider-kind@latest. Install
# the version aligned with its Kind v0.30.0 dependency first so it finds the
# pinned executable on PATH and skips the unpinned installation.
info "Installing cloud-provider-kind ${CLOUD_PROVIDER_KIND_VERSION}..."
GOBIN="$GO_BIN_DIR" go install "sigs.k8s.io/cloud-provider-kind@${CLOUD_PROVIDER_KIND_VERSION}"
start_cloud_provider_kind

(
  cd "$DEPENDENCY_WORK_DIR"
  PLATFORM=kind \
    GOBIN="$GO_BIN_DIR" \
    PATH="${GO_BIN_DIR}:${PATH}" \
    TMPDIR="$DEPENDENCY_WORK_DIR" \
    bash "$DEPENDENCY_INSTALLER"
)

rm -rf "$DEPENDENCY_WORK_DIR"
trap - EXIT

cloud_provider_kind_is_running || error "cloud-provider-kind is not running"

info "Waiting for the KServe gateway to be programmed..."
kubectl wait gateway "$GATEWAY_NAME" \
  -n "$GATEWAY_NAMESPACE" \
  --for=condition=Programmed \
  --timeout="$WAIT_TIMEOUT"

info "Waiting for the KServe gateway to receive an external address..."
GATEWAY_ADDRESS=""
GATEWAY_ADDRESS_DEADLINE=$((SECONDS + ${WAIT_TIMEOUT%s}))
while ((SECONDS < GATEWAY_ADDRESS_DEADLINE)); do
  GATEWAY_ADDRESS=$(kubectl get gateway "$GATEWAY_NAME" \
    -n "$GATEWAY_NAMESPACE" \
    -o jsonpath='{.status.addresses[0].value}' 2>/dev/null || true)
  if [[ -n "$GATEWAY_ADDRESS" ]]; then
    break
  fi
  sleep 2
done

if [[ -z "$GATEWAY_ADDRESS" ]]; then
  kubectl get gateway "$GATEWAY_NAME" -n "$GATEWAY_NAMESPACE" -o wide >&2 || true
  kubectl get service --all-namespaces -o wide >&2 || true
  error "KServe gateway did not receive an external address within ${WAIT_TIMEOUT}"
fi
info "KServe gateway external address: ${GATEWAY_ADDRESS}"

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
echo "  Gateway:      ${GATEWAY_ADDRESS}"
echo "  Deploy mode:  RawDeployment"
echo ""
echo "CRDs installed:"
kubectl get crd -o name | grep kserve | sed 's|^|  |'
