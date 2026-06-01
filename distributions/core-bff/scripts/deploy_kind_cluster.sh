#!/usr/bin/env bash
set -euo pipefail

# Check for required tools
command -v docker >/dev/null 2>&1 || { echo >&2 "Docker is required but it's not installed. Aborting."; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo >&2 "kubectl is required but it's not installed. Aborting."; exit 1; }
command -v kind >/dev/null 2>&1 || { echo >&2 "kind is required but it's not installed. Aborting."; exit 1; }

if [[ -z "${IMG_UI_STANDALONE:-}" ]]; then
    echo >&2 "Error: IMG_UI_STANDALONE is required but not set. Export it before running this script."
    exit 1
fi

echo "WARNING: You must have proper push / pull access to ${IMG_UI_STANDALONE}. If this is a new image, make sure you set it to public to avoid issues."

# Set Kubernetes context to kind
echo "Setting Kubernetes context to kind..."
if kubectl config use-context kind-kind >/dev/null 2>&1 && kubectl cluster-info >/dev/null 2>&1; then
  echo "Kind cluster reachable, skipping creation."
else
    # Step 1: Create a kind cluster
    echo "Creating kind cluster..."
    kind create cluster

    # Verify cluster creation
    echo "Verifying cluster..."
    kubectl cluster-info
fi

# Ensure opendatahub namespace exists (idempotent + race-safe)
kubectl create namespace opendatahub --dry-run=client -o yaml | kubectl apply -f -

# Step 4: Deploy Core BFF UI
echo "Editing kustomize image..."
pushd ./manifests/base > /dev/null || { echo "Error: manifests/base directory not found"; exit 1; }
kustomize edit set image "core-bff-ui=${IMG_UI_STANDALONE}"
popd > /dev/null || { echo "Error: popd failed"; exit 1; }

pushd ./manifests/overlays/standalone > /dev/null || { echo "Error: manifests/overlays/standalone directory not found"; exit 1; }

echo "Deploying Core BFF UI..."
kustomize edit set namespace opendatahub
kubectl apply -n opendatahub -k .

# Wait for deployment to be available
echo "Waiting Core BFF UI to be available..."
kubectl wait --for=condition=available -n opendatahub deployment/core-bff-ui --timeout=1m
popd > /dev/null || { echo "Error: popd failed"; exit 1; }

# Step 5: Port-forward the service
echo "Port-forwarding Core BFF UI..."
echo -e "\033[32mDashboard available in http://localhost:8080\033[0m"
kubectl port-forward svc/core-bff-ui-service -n opendatahub 8080:8080
