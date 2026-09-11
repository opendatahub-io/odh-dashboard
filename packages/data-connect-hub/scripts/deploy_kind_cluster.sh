#!/usr/bin/env bash

# Check for required tools
command -v docker >/dev/null 2>&1 || { echo >&2 "Docker is required but it's not installed. Aborting."; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo >&2 "kubectl is required but it's not installed. Aborting."; exit 1; }
command -v kind >/dev/null 2>&1 || { echo >&2 "kind is required but it's not installed. Aborting."; exit 1; }

echo "WARNING: You must have proper push / pull access to ${IMG_UI_STANDALONE}. If this is a new image, make sure you set it to public to avoid issues."

# Set Kubernetes context to kind
echo "Setting Kubernetes context to kind..."
if kubectl config use-context kind-kind  >/dev/null 2>&1; then
  echo "Mod Arch deployment already exists. Skipping to step 4."
else
    # Step 1: Create a kind cluster
    echo "Creating kind cluster..."
    kind create cluster

    # Verify cluster creation
    echo "Verifying cluster..."
    kubectl cluster-info

    # Step 2: Create kubeflow namespace
    echo "Creating kubeflow namespace..."
    kubectl create namespace kubeflow
fi
# Step 4: Deploy modular architecture UI
echo "Editing kustomize image..."
pushd ./manifests/base > /dev/null || { echo "Error: manifests/base directory not found"; exit 1; }
kustomize edit set image mod-arch-ui=${IMG_UI_STANDALONE}
popd > /dev/null

pushd ./manifests/overlays/standalone > /dev/null || { echo "Error: manifests/overlays/standalone directory not found"; exit 1; }

echo "Deploying Mod Arch UI..."
kustomize edit set namespace kubeflow
kubectl apply -n kubeflow -k .

# Wait for deployment to be available
echo "Waiting Mod Arch UI to be available..."
kubectl wait --for=condition=available -n kubeflow deployment/mod-arch-ui --timeout=1m
popd > /dev/null

# Step 5: Port-forward the service
echo "Port-forwarding Mod Arch UI..."
echo -e "\033[32mDashboard available in http://localhost:8080\033[0m"
kubectl port-forward svc/mod-arch-ui-service -n kubeflow 8080:8080
