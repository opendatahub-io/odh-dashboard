#!/usr/bin/env bash
# Setup script for Kind cluster
# Idempotent — safe to re-run.

set -euo pipefail

CLUSTER_NAME="rhaii-tilt"
REGISTRY_NAME="kind-registry"
REGISTRY_PORT="5001"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEVELOPING_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
KIND_CONFIG="${DEVELOPING_DIR}/kind-cluster.yaml"
KIND_READY_TIMEOUT="${KIND_READY_TIMEOUT:-120}"

if [[ ! "${KIND_READY_TIMEOUT}" =~ ^[0-9]+$ ]]; then
  echo "ERROR: KIND_READY_TIMEOUT must be a non-negative number of seconds."
  exit 1
fi

# Check prerequisites
if ! command -v kind >/dev/null 2>&1; then
  echo "ERROR: kind is not installed. Please install kind first:"
  echo "  brew install kind  # macOS"
  echo "  or visit: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl is not installed. Install instructions: https://kubernetes.io/docs/tasks/tools/"
  exit 1
fi

# Let Kind select its provider, including any explicit user override.
clusters="$(kind get clusters)"
if ! grep -Fxq "${CLUSTER_NAME}" <<< "${clusters}"; then
  echo "Creating Kind cluster '${CLUSTER_NAME}' with config from ${KIND_CONFIG}..."
  kind create cluster --name "${CLUSTER_NAME}" --config "${KIND_CONFIG}" --wait 60s
  echo "Kind cluster created successfully"
else
  echo "Kind cluster '${CLUSTER_NAME}' already exists"
fi

nodes="$(kind get nodes --name "${CLUSTER_NAME}")"
if [[ -z "${nodes}" ]]; then
  echo "ERROR: No node containers found for Kind cluster '${CLUSTER_NAME}'."
  exit 1
fi

# Find the CLI that owns these nodes' containers without overriding Kind's
# detection — for freshly created clusters too, so the registry below lands
# in the same runtime that owns the Kind nodes. Docker-compatible wrappers
# may resolve to the same containers as Podman.
node_names=()
while IFS= read -r node; do
  node_names+=("${node}")
done <<< "${nodes}"

providers=("${KIND_EXPERIMENTAL_PROVIDER:-}")
if [[ -z "${providers[0]}" ]]; then
  providers=(docker nerdctl podman finch)
fi

CONTAINER_PROVIDER=""
node_ids=""
for provider in "${providers[@]}"; do
  if ! command -v "${provider}" >/dev/null 2>&1; then
    continue
  fi
  if ! candidate_ids="$("${provider}" inspect --type container --format '{{.Id}}' "${node_names[@]}" 2>/dev/null)"; then
    continue
  fi
  if [[ -n "${CONTAINER_PROVIDER}" && "${candidate_ids}" != "${node_ids}" ]]; then
    echo "ERROR: Multiple container runtimes contain nodes for '${CLUSTER_NAME}'. Set KIND_EXPERIMENTAL_PROVIDER explicitly."
    exit 1
  fi
  CONTAINER_PROVIDER="${provider}"
  node_ids="${candidate_ids}"
done

if [[ -z "${CONTAINER_PROVIDER}" ]]; then
  echo "ERROR: Could not find a container runtime for the nodes of Kind cluster '${CLUSTER_NAME}'."
  exit 1
fi

while IFS= read -r node; do
  running="$("${CONTAINER_PROVIDER}" inspect --format '{{.State.Running}}' "${node}")"
  if [[ "${running}" != "true" ]]; then
    echo "Starting stopped Kind node '${node}'..."
    "${CONTAINER_PROVIDER}" start "${node}"
  fi
done <<< "${nodes}"

# Ensure kubectl context is set
kubectl config use-context "kind-${CLUSTER_NAME}" || {
  echo "ERROR: Failed to set kubectl context to kind-${CLUSTER_NAME}"
  exit 1
}

# A running node container does not mean the Kubernetes API is ready yet.
echo "Waiting up to ${KIND_READY_TIMEOUT}s for the Kubernetes API..."
deadline=$((SECONDS + 10#${KIND_READY_TIMEOUT}))
until kubectl --context "kind-${CLUSTER_NAME}" --request-timeout=5s get --raw=/readyz >/dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    echo "ERROR: Kubernetes API for 'kind-${CLUSTER_NAME}' did not become ready within ${KIND_READY_TIMEOUT}s."
    kubectl --context "kind-${CLUSTER_NAME}" --request-timeout=5s get --raw=/readyz || true
    exit 1
  fi
  sleep 2
done

# Ensure the target namespace exists
kubectl create namespace opendatahub --dry-run=client -o yaml | kubectl apply -f -

# Local container registry: lets Tilt push images instead of using `kind load`,
# which fails on the podman provider (kind#3945). Follows kind's documented
# local-registry setup (https://kind.sigs.k8s.io/docs/user/local-registry/);
# Tilt detects the registry via the local-registry-hosting ConfigMap.
# CONTAINER_PROVIDER was determined above from the runtime that owns the
# Kind nodes, so the registry is created in that same runtime.

registry_state="$("${CONTAINER_PROVIDER}" inspect --format '{{.State.Running}}' "${REGISTRY_NAME}" 2>/dev/null || true)"
if [[ "${registry_state}" == "true" ]]; then
  # Reusing a running registry: it must publish the port we advertise in the
  # local-registry-hosting ConfigMap below, or pushes will fail.
  port_bindings="$("${CONTAINER_PROVIDER}" inspect --format '{{json .HostConfig.PortBindings}}' "${REGISTRY_NAME}")"
  if ! grep -Eq '"HostIp"[[:space:]]*:[[:space:]]*"127\.0\.0\.1"' <<< "${port_bindings}" \
     || ! grep -Eq "\"HostPort\"[[:space:]]*:[[:space:]]*\"${REGISTRY_PORT}\"" <<< "${port_bindings}"; then
    echo "ERROR: Existing '${REGISTRY_NAME}' does not publish 127.0.0.1:${REGISTRY_PORT}. Remove it or re-create it with the expected port binding."
    exit 1
  fi
elif [[ -n "${registry_state}" ]]; then
  # The container exists but is stopped: start it so previously pushed images
  # in its writable layer are preserved (recreating would lose them).
  echo "Starting stopped local registry '${REGISTRY_NAME}'..."
  "${CONTAINER_PROVIDER}" start "${REGISTRY_NAME}"
else
  echo "Creating local registry '${REGISTRY_NAME}' on 127.0.0.1:${REGISTRY_PORT}..."
  # Fully qualified so short-name resolution (e.g. Podman aliases) cannot
  # redirect the pull to a different registry.
  "${CONTAINER_PROVIDER}" run -d --restart=always -p "127.0.0.1:${REGISTRY_PORT}:5000" \
    --network bridge --name "${REGISTRY_NAME}" docker.io/library/registry:3
fi

# Attach the registry to the kind network so the nodes can reach it as
# kind-registry:5000 (network-alias is set below for name resolution).
KIND_NETWORK="kind"
if ! "${CONTAINER_PROVIDER}" network inspect "${KIND_NETWORK}" >/dev/null 2>&1; then
  echo "ERROR: Kind network '${KIND_NETWORK}' not found."
  exit 1
fi
if [[ "$("${CONTAINER_PROVIDER}" inspect --format '{{json .NetworkSettings.Networks.kind}}' "${REGISTRY_NAME}")" == "null" ]]; then
  "${CONTAINER_PROVIDER}" network connect --alias "${REGISTRY_NAME}" "${KIND_NETWORK}" "${REGISTRY_NAME}"
fi

# Alias localhost:${REGISTRY_PORT} to the registry inside each node's
# containerd, so image refs like localhost:5001/rhaii-dashboard:tag resolve
# to the registry container over the kind network (kind nodes from v0.27.0+
# already enable the certs.d config dir; no containerd config patch needed).
REGISTRY_DIR="/etc/containerd/certs.d/localhost:${REGISTRY_PORT}"
for node in "${node_names[@]}"; do
  "${CONTAINER_PROVIDER}" exec "${node}" mkdir -p "${REGISTRY_DIR}"
  cat <<EOF | "${CONTAINER_PROVIDER}" exec -i "${node}" cp /dev/stdin "${REGISTRY_DIR}/hosts.toml"
[host."http://${REGISTRY_NAME}:5000"]
EOF
done

# Advertise the registry to Tilt (and other tooling) per kind's docs.
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:${REGISTRY_PORT}"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF

echo "Kind cluster setup complete"
