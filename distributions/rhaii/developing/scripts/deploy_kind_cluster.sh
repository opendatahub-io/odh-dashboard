#!/usr/bin/env bash
set -euo pipefail

# Deploy the RHAII dashboard to a local kind cluster.
#
# Usage:
#   ./deploy_kind_cluster.sh              # Build locally, load into kind, deploy
#   ./deploy_kind_cluster.sh --registry   # Deploy from a pre-pushed registry image
#
# Required env vars (registry mode):
#   IMG  — full image reference (e.g. quay.io/opendatahub/rhaii-dashboard:latest)
#
# Optional env vars:
#   IMG            — image name (default: rhaii-dashboard:latest for local mode)
#   CONTAINER_TOOL — docker or podman (default: docker)
#   NAMESPACE      — target namespace (default: opendatahub)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEVELOPING_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="$(cd "${DEVELOPING_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${DIST_DIR}/../.." && pwd)"

CONTAINER_TOOL="${CONTAINER_TOOL:-docker}"
NAMESPACE="${NAMESPACE:-opendatahub}"
REGISTRY_MODE=false

if [[ "${1:-}" == "--registry" ]]; then
  REGISTRY_MODE=true
fi

# ── Prerequisites ─────────────────────────────────────────────────────────────

command -v "${CONTAINER_TOOL}" >/dev/null 2>&1 || { echo >&2 "${CONTAINER_TOOL} is required but not installed."; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo >&2 "kubectl is required but not installed."; exit 1; }
command -v kind >/dev/null 2>&1 || { echo >&2 "kind is required but not installed."; exit 1; }
command -v kustomize >/dev/null 2>&1 || { echo >&2 "kustomize is required but not installed."; exit 1; }

# ── Kind cluster ──────────────────────────────────────────────────────────────

echo "Setting Kubernetes context to kind..."
if kubectl config use-context kind-rhaii-tilt >/dev/null 2>&1 && kubectl cluster-info >/dev/null 2>&1; then
  echo "Kind cluster reachable, skipping creation."
else
  echo "Creating kind cluster..."
  kind create cluster
  kubectl cluster-info
fi

# ── Image ─────────────────────────────────────────────────────────────────────

if [[ "${REGISTRY_MODE}" == "true" ]]; then
  if [[ -z "${IMG:-}" ]]; then
    echo >&2 "Error: IMG is required in registry mode. Export it before running this script."
    exit 1
  fi
  echo "Using registry image: ${IMG}"
else
  IMG="${IMG:-rhaii-dashboard:latest}"
  echo "Building image: ${IMG}"
  cd "${REPO_ROOT}"
  ${CONTAINER_TOOL} build -f distributions/rhaii/Dockerfile -t "${IMG}" .

  echo "Loading image into kind..."
  kind load docker-image "${IMG}"
fi

# ── Deploy ────────────────────────────────────────────────────────────────────

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

cd "${DEVELOPING_DIR}/manifests"
kustomize edit set namespace "${NAMESPACE}"
kustomize edit set image "rhaii-dashboard=${IMG}"

echo "Deploying RHAII dashboard..."
kubectl apply -n "${NAMESPACE}" -k .

echo "Waiting for deployment to be available..."
kubectl wait --for=condition=available -n "${NAMESPACE}" deployment/rhaii-dashboard --timeout=2m

# ── Port-forward ──────────────────────────────────────────────────────────────

echo -e "\033[32m✓ RHAII dashboard available at http://localhost:4000\033[0m"
kubectl port-forward svc/rhaii-dashboard -n "${NAMESPACE}" 4000:4000
