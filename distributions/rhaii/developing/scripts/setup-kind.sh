#!/usr/bin/env bash
# Setup script for Kind cluster
# Idempotent — safe to re-run.

set -euo pipefail

CLUSTER_NAME="rhaii-tilt"
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
  nodes="$(kind get nodes --name "${CLUSTER_NAME}")"
  if [[ -z "${nodes}" ]]; then
    echo "ERROR: No node containers found for Kind cluster '${CLUSTER_NAME}'."
    exit 1
  fi

  # Find a CLI that owns these containers without overriding Kind's detection.
  # Docker-compatible wrappers may resolve to the same containers as Podman.
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
fi

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

echo "Kind cluster setup complete"
