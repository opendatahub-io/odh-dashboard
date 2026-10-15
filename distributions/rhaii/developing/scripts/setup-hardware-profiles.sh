#!/usr/bin/env bash
set -euo pipefail

# The CRD is generated from opendatahub-operator v3.6.0-ea.1 (commit
# 3959ea8a01a9efff6c6fa16080d08ba03bd7218f) with controller-gen v0.17.3.
EXPECTED_CONTEXT="kind-rhaii-tilt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRD_PATH="${SCRIPT_DIR}/../crds/infrastructure.opendatahub.io_hardwareprofiles.yaml"

info() { echo "==> $*"; }
error() { echo "ERROR: $*" >&2; exit 1; }

command -v kubectl >/dev/null 2>&1 || error "kubectl not found in PATH"

CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || true)
if [[ "$CURRENT_CONTEXT" != "$EXPECTED_CONTEXT" ]]; then
  error "kubectl context is '${CURRENT_CONTEXT}', expected '${EXPECTED_CONTEXT}'. Run 'make setup-kind' first."
fi

kubectl cluster-info >/dev/null 2>&1 || error "Cluster not reachable. Is the Kind cluster running?"

info "Installing the HardwareProfile v1 CRD..."
kubectl apply --server-side --force-conflicts -f "$CRD_PATH"
kubectl wait crd hardwareprofiles.infrastructure.opendatahub.io \
  --for=condition=Established \
  --timeout=60s

info "HardwareProfile API ready"
