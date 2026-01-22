#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Setup script for llm-d (Distributed Inference) on OpenShift ROSA
# 
# This script:
# 1. Installs Red Hat Connectivity Link (RHCL) operator (if not installed)
# 2. Installs LeaderWorkerSet operator (if not installed)
# 3. Creates GatewayClass and Gateway for OpenShift AI inference
#
# Prerequisites:
# - oc CLI logged into your ROSA cluster with cluster-admin privileges
# - openssl for certificate generation (or provide your own certs)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
GATEWAY_NAME="${GATEWAY_NAME:-openshift-ai-inference}"
GATEWAY_NAMESPACE="${GATEWAY_NAMESPACE:-openshift-ingress}"
GATEWAY_CLASS_NAME="${GATEWAY_CLASS_NAME:-openshift-default}"
SECRET_NAME="${SECRET_NAME:-gwapi-wildcard}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for required tools
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v oc &> /dev/null; then
        log_error "oc CLI is required but not installed. Aborting."
        exit 1
    fi
    
    if ! oc whoami &> /dev/null; then
        log_error "Not logged into OpenShift cluster. Please run 'oc login' first."
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        log_warn "openssl not found. You'll need to provide your own certificates."
    fi
    
    log_info "Prerequisites check passed."
}

# Install Red Hat Connectivity Link (RHCL) operator
install_rhcl_operator() {
    log_info "Checking Red Hat Connectivity Link (RHCL) operator..."
    
    if oc get subscription -n openshift-operators rhcl-operator &> /dev/null; then
        log_info "RHCL operator already installed."
        return 0
    fi
    
    log_info "Installing RHCL operator..."
    
    cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: rhcl-operator
  namespace: openshift-operators
spec:
  channel: stable
  installPlanApproval: Automatic
  name: rhcl-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
EOF
    
    log_info "Waiting for RHCL operator to be ready..."
    sleep 10
    
    # Wait for the CSV to be installed
    local max_attempts=30
    local attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        local csv_status
        csv_status=$(oc get csv -n openshift-operators -l operators.coreos.com/rhcl-operator.openshift-operators -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "")
        if [[ "$csv_status" == "Succeeded" ]]; then
            log_info "RHCL operator installed successfully."
            return 0
        fi
        log_info "Waiting for operator installation... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_warn "RHCL operator installation may still be in progress. Continuing..."
}

# Install LeaderWorkerSet operator
install_leaderworkerset_operator() {
    log_info "Checking LeaderWorkerSet operator..."
    
    if oc get subscription -n openshift-lws-operator leader-worker-set &> /dev/null; then
        log_info "LeaderWorkerSet operator already installed."
        return 0
    fi
    
    log_info "Installing LeaderWorkerSet operator..."
    
    cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: leader-worker-set
  namespace: openshift-lws-operator
spec:
  channel: stable
  installPlanApproval: Automatic
  name: leader-worker-set
  source: redhat-operators
  sourceNamespace: openshift-marketplace
EOF
    
    log_info "Waiting for LeaderWorkerSet operator to be ready..."
    sleep 10
    
    # Wait for the CSV to be installed
    local max_attempts=30
    local attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        local csv_status
        csv_status=$(oc get csv -n openshift-operators -l operators.coreos.com/leader-worker-set.openshift-operators -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "")
        if [[ "$csv_status" == "Succeeded" ]]; then
            log_info "LeaderWorkerSet operator installed successfully."
            return 0
        fi
        log_info "Waiting for operator installation... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_warn "LeaderWorkerSet operator installation may still be in progress. Continuing..."
}

# Create GatewayClass
create_gateway_class() {
    log_info "Checking GatewayClass..."
    
    if oc get gatewayclass "${GATEWAY_CLASS_NAME}" &> /dev/null; then
        log_info "GatewayClass '${GATEWAY_CLASS_NAME}' already exists."
        return 0
    fi
    
    log_info "Creating GatewayClass '${GATEWAY_CLASS_NAME}'..."
    
    cat <<EOF | oc apply -f -
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: ${GATEWAY_CLASS_NAME}
spec:
  controllerName: openshift.io/gateway-controller/v1
EOF
    
    log_info "Waiting for GatewayClass to be accepted..."
    sleep 5
    
    # Wait for istiod deployment
    log_info "Waiting for istiod-openshift-gateway deployment..."
    local max_attempts=30
    local attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        if oc get deployment -n openshift-ingress istiod-openshift-gateway &> /dev/null; then
            oc wait --for=condition=available -n openshift-ingress deployment/istiod-openshift-gateway --timeout=60s || true
            log_info "istiod-openshift-gateway is ready."
            return 0
        fi
        log_info "Waiting for istiod deployment... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_warn "istiod deployment not yet ready. You may need to wait longer."
}

# Generate self-signed certificate for the gateway
generate_certificate() {
    local domain="$1"
    local cert_dir="${SCRIPT_DIR}/.certs"
    
    mkdir -p "${cert_dir}"
    
    if [[ -f "${cert_dir}/wildcard.crt" ]] && [[ -f "${cert_dir}/wildcard.key" ]]; then
        log_info "Using existing certificates from ${cert_dir}"
        return 0
    fi
    
    log_info "Generating self-signed wildcard certificate for *.${domain}..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${cert_dir}/wildcard.key" \
        -out "${cert_dir}/wildcard.crt" \
        -subj "/CN=*.${domain}" \
        -addext "subjectAltName=DNS:*.${domain},DNS:${domain}"
    
    log_info "Certificate generated at ${cert_dir}"
}

# Create TLS secret for the gateway
create_tls_secret() {
    local cert_dir="${SCRIPT_DIR}/.certs"
    
    log_info "Checking TLS secret..."
    
    if oc get secret -n "${GATEWAY_NAMESPACE}" "${SECRET_NAME}" &> /dev/null; then
        log_info "TLS secret '${SECRET_NAME}' already exists in namespace '${GATEWAY_NAMESPACE}'."
        return 0
    fi
    
    if [[ ! -f "${cert_dir}/wildcard.crt" ]] || [[ ! -f "${cert_dir}/wildcard.key" ]]; then
        log_error "Certificate files not found. Please generate or provide certificates."
        log_error "Expected files: ${cert_dir}/wildcard.crt and ${cert_dir}/wildcard.key"
        exit 1
    fi
    
    log_info "Creating TLS secret '${SECRET_NAME}' in namespace '${GATEWAY_NAMESPACE}'..."
    
    oc -n "${GATEWAY_NAMESPACE}" create secret tls "${SECRET_NAME}" \
        --cert="${cert_dir}/wildcard.crt" \
        --key="${cert_dir}/wildcard.key"
    
    log_info "TLS secret created successfully."
}

# Clean up certificate files after they've been uploaded to the cluster
cleanup_certificates() {
    local cert_dir="${SCRIPT_DIR}/.certs"
    
    if [[ -d "${cert_dir}" ]]; then
        log_info "Cleaning up local certificate files..."
        rm -rf "${cert_dir}"
        log_info "Certificate files removed."
    fi
}

# Create Gateway
create_gateway() {
    local domain="$1"
    
    log_info "Checking Gateway..."
    
    if oc get gateway -n "${GATEWAY_NAMESPACE}" "${GATEWAY_NAME}" &> /dev/null; then
        log_info "Gateway '${GATEWAY_NAME}' already exists in namespace '${GATEWAY_NAMESPACE}'."
        return 0
    fi
    
    log_info "Creating Gateway '${GATEWAY_NAME}' in namespace '${GATEWAY_NAMESPACE}'..."
    
    cat <<EOF | oc apply -f -
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: ${GATEWAY_NAME}
  namespace: ${GATEWAY_NAMESPACE}
spec:
  gatewayClassName: ${GATEWAY_CLASS_NAME}
  listeners:
  - name: https
    hostname: "*.gwapi.${domain}"
    port: 443
    protocol: HTTPS
    tls:
      mode: Terminate
      certificateRefs:
      - name: ${SECRET_NAME}
    allowedRoutes:
      namespaces:
        from: All
EOF
    
    log_info "Waiting for Gateway deployment..."
    sleep 5
    
    # Wait for gateway deployment
    local gateway_deployment="${GATEWAY_NAME}-${GATEWAY_CLASS_NAME}"
    local max_attempts=30
    local attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        if oc get deployment -n "${GATEWAY_NAMESPACE}" "${gateway_deployment}" &> /dev/null; then
            oc wait --for=condition=available -n "${GATEWAY_NAMESPACE}" "deployment/${gateway_deployment}" --timeout=60s || true
            log_info "Gateway deployment '${gateway_deployment}' is ready."
            break
        fi
        log_info "Waiting for gateway deployment... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    # Show gateway service info
    log_info "Gateway service information:"
    oc get service -n "${GATEWAY_NAMESPACE}" "${gateway_deployment}" 2>/dev/null || log_warn "Gateway service not yet available."
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    echo ""
    echo "=============================================="
    echo "Installation Summary"
    echo "=============================================="
    
    echo ""
    echo "Operators:"
    echo "----------"
    oc get csv -n openshift-operators | grep -E "(rhcl|leader-worker-set)" || echo "  (operators may still be installing)"
    
    echo ""
    echo "GatewayClass:"
    echo "-------------"
    oc get gatewayclass "${GATEWAY_CLASS_NAME}" 2>/dev/null || echo "  Not found"
    
    echo ""
    echo "Gateway:"
    echo "--------"
    oc get gateway -n "${GATEWAY_NAMESPACE}" "${GATEWAY_NAME}" 2>/dev/null || echo "  Not found"
    
    echo ""
    echo "Gateway Service:"
    echo "----------------"
    oc get service -n "${GATEWAY_NAMESPACE}" "${GATEWAY_NAME}-${GATEWAY_CLASS_NAME}" 2>/dev/null || echo "  Not found"
    
    echo ""
    echo "=============================================="
}

# Main function
main() {
    echo "=============================================="
    echo "llm-d Setup Script for OpenShift ROSA"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    
    # Get cluster domain
    local domain
    domain=$(oc get ingresses.config/cluster -o jsonpath='{.spec.domain}')
    log_info "Cluster domain: ${domain}"
    
    echo ""
    log_info "Step 1/5: Installing Red Hat Connectivity Link (RHCL) operator..."
    install_rhcl_operator
    
    echo ""
    log_info "Step 2/5: Installing LeaderWorkerSet operator..."
    install_leaderworkerset_operator
    
    echo ""
    log_info "Step 3/5: Creating GatewayClass..."
    create_gateway_class
    
    echo ""
    log_info "Step 4/5: Generating/checking TLS certificate..."
    generate_certificate "${domain}"
    create_tls_secret
    cleanup_certificates
    
    echo ""
    log_info "Step 5/5: Creating Gateway..."
    create_gateway "${domain}"
    
    echo ""
    verify_installation
    
    echo ""
    log_info "Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Ensure OpenShift AI is installed and model serving platform is enabled"
    echo "  2. Create an LLMInferenceService CR to deploy your model"
    echo "  3. The gateway will be available at: *.gwapi.${domain}"
    echo ""
    echo "Example LLMInferenceService:"
    echo "---"
    cat <<EOF
apiVersion: inference.llm-d.ai/v1alpha1
kind: LLMInferenceService
metadata:
  name: my-model
  namespace: <your-namespace>
spec:
  replicas: 1
  model:
    uri: "hf://<model-name>"
    name: "<model-name>"
EOF
}

# Run main function
main "$@"

