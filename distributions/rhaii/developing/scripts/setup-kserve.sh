#!/usr/bin/env bash
set -euo pipefail

# Pinned versions — update these together when upgrading KServe
CERT_MANAGER_VERSION="v1.17.0"
KSERVE_VERSION="v0.19.0"

# Pinned manifest URLs
CERT_MANAGER_URL="https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.yaml"
KSERVE_URL="https://github.com/kserve/kserve/releases/download/${KSERVE_VERSION}/kserve.yaml"

EXPECTED_CONTEXT="kind-rhaii-tilt"
WAIT_TIMEOUT="120s"

info()  { echo "==> $*"; }
error() { echo "ERROR: $*" >&2; exit 1; }

# --- Prerequisites -----------------------------------------------------------

command -v kubectl >/dev/null 2>&1 || error "kubectl not found in PATH"

CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || true)
if [[ "$CURRENT_CONTEXT" != "$EXPECTED_CONTEXT" ]]; then
  error "kubectl context is '${CURRENT_CONTEXT}', expected '${EXPECTED_CONTEXT}'. Run 'make setup-kind' first."
fi

kubectl cluster-info >/dev/null 2>&1 || error "Cluster not reachable. Is the Kind cluster running?"

# --- cert-manager -------------------------------------------------------------

if kubectl get namespace cert-manager >/dev/null 2>&1; then
  info "cert-manager namespace already exists — skipping install"
else
  info "Installing cert-manager ${CERT_MANAGER_VERSION}..."
  kubectl apply -f "$CERT_MANAGER_URL"
fi

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

if kubectl get deployment kserve-controller-manager -n kserve >/dev/null 2>&1; then
  info "KServe controller already installed — skipping core install"
else
  info "Ensuring kserve namespace exists..."
  kubectl create namespace kserve --dry-run=client -o yaml | kubectl apply -f -

  info "Installing KServe ${KSERVE_VERSION} (pass 1: CRDs + core resources)..."
  kubectl apply --server-side --force-conflicts -f "$KSERVE_URL" 2>&1 || true

  info "Waiting for KServe CRDs to be established..."
  kubectl wait crd inferenceservices.serving.kserve.io --for=condition=Established --timeout=60s
  kubectl wait crd servingruntimes.serving.kserve.io --for=condition=Established --timeout=60s

  info "Installing KServe ${KSERVE_VERSION} (pass 2: remaining resources)..."
  kubectl apply --server-side --force-conflicts -f "$KSERVE_URL"
fi

info "Waiting for kserve-controller-manager to be ready..."
kubectl wait deployment kserve-controller-manager \
  -n kserve \
  --for=condition=Available \
  --timeout="$WAIT_TIMEOUT"

# --- Configure RawDeployment mode ---------------------------------------------
# KServe defaults to serverless (Knative) mode. We run without Knative/Istio,
# so switch to RawDeployment mode and disable ingress creation.

info "Configuring KServe for RawDeployment mode..."
kubectl patch configmap inferenceservice-config \
  -n kserve \
  --type merge \
  -p '{
    "data": {
      "deploy": "{\"defaultDeploymentMode\": \"RawDeployment\"}",
      "ingress": "{\"disableIngressCreation\": true}"
    }
  }'

# --- Summary ------------------------------------------------------------------

info "KServe dev environment ready!"
echo "  cert-manager: ${CERT_MANAGER_VERSION}"
echo "  KServe:       ${KSERVE_VERSION}"
echo "  LLMIsvc CRDs: included"
echo "  Deploy mode:  RawDeployment"
echo ""
echo "CRDs installed:"
kubectl get crd -o name | grep kserve | sed 's|^|  |'
