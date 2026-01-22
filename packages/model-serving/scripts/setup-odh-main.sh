#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Setup script for updating ODH Dashboard to use the main image
#
# This script:
# 1. Sets up the PVC and CSV patch (one-time setup, skipped if already done)
# 2. Updates the deployment.yaml manifest with the desired image
# 3. Copies the manifests to the operator pod
# 4. Restarts the operator to apply the new image
#
# Prerequisites:
# - oc CLI logged into your OpenShift cluster with cluster-admin privileges
# - curl for downloading files from GitHub
#
# Usage:
#   ./setup-odh-main.sh                    # Uses main image
#   ./setup-odh-main.sh pr-5476            # Uses a specific PR image
#   ./setup-odh-main.sh v2.38.2-odh        # Uses a specific version
#   ./setup-odh-main.sh --skip-setup       # Skip PVC/CSV setup (if already done)
#   ./setup-odh-main.sh --skip-setup main  # Skip setup and use main image
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFESTS_DIR="$(cd "${SCRIPT_DIR}/../../../manifests" && pwd)"

# Configuration
DASHBOARD_IMAGE_TAG="${DASHBOARD_IMAGE_TAG:-main}"
DASHBOARD_IMAGE_REPO="${DASHBOARD_IMAGE_REPO:-quay.io/opendatahub/odh-dashboard}"
OPERATOR_NAMESPACE="${OPERATOR_NAMESPACE:-openshift-operators}"
DASHBOARD_NAMESPACE="${DASHBOARD_NAMESPACE:-opendatahub}"
SKIP_SETUP="${SKIP_SETUP:-false}"

# GitHub URLs for setup files
CSV_PATCH_URL="https://raw.githubusercontent.com/opendatahub-io/opendatahub-operator/main/hack/component-dev/csv-patch.json"
PVC_URL="https://raw.githubusercontent.com/opendatahub-io/opendatahub-operator/main/hack/component-dev/pvc.yaml"

# Temporary directory for downloaded files
TEMP_DIR="${SCRIPT_DIR}/.odh-setup-temp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-setup)
                SKIP_SETUP="true"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                # Assume it's an image tag
                DASHBOARD_IMAGE_TAG="$1"
                shift
                ;;
        esac
    done
}

show_help() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS] [IMAGE_TAG]

Update ODH Dashboard to use a specific image tag.

Options:
    --skip-setup    Skip the one-time PVC and CSV patch setup
    --help, -h      Show this help message

Arguments:
    IMAGE_TAG       The image tag to use (default: main)
                    Examples: main, pr-5476, v2.38.2-odh

Environment Variables:
    DASHBOARD_IMAGE_REPO    Image repository (default: quay.io/opendatahub/odh-dashboard)
    DASHBOARD_IMAGE_TAG     Image tag (default: main)
    OPERATOR_NAMESPACE      Operator namespace (default: openshift-operators)
    DASHBOARD_NAMESPACE     Dashboard namespace (default: opendatahub)
    SKIP_SETUP              Skip PVC/CSV setup (default: false)

Examples:
    $(basename "$0")                    # Use main image
    $(basename "$0") pr-5476            # Use PR image
    $(basename "$0") --skip-setup main  # Skip setup, use main image
EOF
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

    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed. Aborting."
        exit 1
    fi

    log_info "Prerequisites check passed."
    log_info "Logged in as: $(oc whoami)"
    log_info "Cluster: $(oc whoami --show-server)"
}

# Download setup files from GitHub
download_setup_files() {
    log_info "Downloading setup files from GitHub..."

    mkdir -p "${TEMP_DIR}"

    log_info "Downloading csv-patch.json..."
    if ! curl -sSL -o "${TEMP_DIR}/csv-patch.json" "${CSV_PATCH_URL}"; then
        log_error "Failed to download csv-patch.json"
        exit 1
    fi

    log_info "Downloading pvc.yaml..."
    if ! curl -sSL -o "${TEMP_DIR}/pvc.yaml" "${PVC_URL}"; then
        log_error "Failed to download pvc.yaml"
        exit 1
    fi

    log_info "Setup files downloaded to ${TEMP_DIR}"
}

# Apply PVC for manifest storage
apply_pvc() {
    log_info "Checking if PVC already exists..."

    if oc get pvc -n "${OPERATOR_NAMESPACE}" odh-manifests &> /dev/null; then
        log_info "PVC 'odh-manifests' already exists. Skipping PVC creation."
        return 0
    fi

    log_info "Applying PVC to ${OPERATOR_NAMESPACE} namespace..."
    oc apply -f "${TEMP_DIR}/pvc.yaml" -n "${OPERATOR_NAMESPACE}"
    log_info "PVC applied successfully."
}

# Patch the CSV to enable manifest override
patch_csv() {
    log_info "Finding ODH operator CSV..."

    local csv
    csv=$(oc get csv -n "${OPERATOR_NAMESPACE}" -o name | grep opendatahub-operator | head -n1 | cut -d/ -f2)

    if [[ -z "$csv" ]]; then
        log_error "Could not find opendatahub-operator CSV in ${OPERATOR_NAMESPACE}"
        exit 1
    fi

    log_info "Found CSV: ${csv}"

    # Check if CSV is already patched by looking for the volume mount
    local volume_mounts
    volume_mounts=$(oc get csv "${csv}" -n "${OPERATOR_NAMESPACE}" -o jsonpath='{.spec.install.spec.deployments[0].spec.template.spec.containers[0].volumeMounts}' 2>/dev/null || echo "")

    if echo "${volume_mounts}" | grep -q "odh-manifests"; then
        log_info "CSV already patched. Skipping CSV patch."
        return 0
    fi

    log_info "Patching CSV ${csv}..."
    if ! oc patch csv "${csv}" -n "${OPERATOR_NAMESPACE}" --type json --patch-file "${TEMP_DIR}/csv-patch.json"; then
        log_warn "CSV patch may have already been applied or failed. Continuing..."
    else
        log_info "CSV patched successfully."
    fi
}

# Wait for operator pod to be ready
wait_for_operator_pod() {
    local max_attempts="${1:-60}"
    local attempt=0

    log_info "Waiting for operator pod to be ready..."

    # First, wait a bit for any pod termination to start
    sleep 10

    while [[ $attempt -lt $max_attempts ]]; do
        # Get pod count first
        local pod_count
        pod_count=$(oc get pod -n "${OPERATOR_NAMESPACE}" -l name=opendatahub-operator --no-headers 2>/dev/null | wc -l || echo "0")

        if [[ "$pod_count" -eq 0 ]]; then
            log_info "No operator pod found yet, waiting for new pod to be created... (attempt $((attempt + 1))/$max_attempts)"
            sleep 5
            attempt=$((attempt + 1))
            continue
        fi

        # Check if any pod is in Terminating state
        local terminating
        terminating=$(oc get pod -n "${OPERATOR_NAMESPACE}" -l name=opendatahub-operator -o jsonpath='{.items[*].metadata.deletionTimestamp}' 2>/dev/null || echo "")

        if [[ -n "$terminating" ]]; then
            log_info "Operator pod is terminating, waiting... (attempt $((attempt + 1))/$max_attempts)"
            sleep 5
            attempt=$((attempt + 1))
            continue
        fi

        # Get the pod status
        local pod_status
        pod_status=$(oc get pod -n "${OPERATOR_NAMESPACE}" -l name=opendatahub-operator -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "")

        if [[ "$pod_status" == "Running" ]]; then
            # Also check if pod is ready
            local ready
            ready=$(oc get pod -n "${OPERATOR_NAMESPACE}" -l name=opendatahub-operator -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "")
            if [[ "$ready" == "True" ]]; then
                log_info "Operator pod is ready."
                return 0
            else
                log_info "Pod is running but not ready yet... (attempt $((attempt + 1))/$max_attempts)"
            fi
        elif [[ "$pod_status" == "Pending" ]]; then
            log_info "Pod is pending... (attempt $((attempt + 1))/$max_attempts)"
        elif [[ "$pod_status" == "ContainerCreating" ]]; then
            log_info "Pod container is being created... (attempt $((attempt + 1))/$max_attempts)"
        else
            log_info "Pod status: ${pod_status:-unknown}... (attempt $((attempt + 1))/$max_attempts)"
        fi

        sleep 5
        attempt=$((attempt + 1))
    done

    log_warn "Operator pod did not become ready in time, but continuing anyway..."
    return 0
}

# Perform one-time setup (PVC and CSV patch)
perform_one_time_setup() {
    log_step "Performing one-time setup (PVC and CSV patch)..."

    download_setup_files
    apply_pvc
    patch_csv

    # Wait for operator pod to restart after CSV patch
    wait_for_operator_pod 60

    log_info "One-time setup complete."
}

# Update the deployment.yaml with the new image
update_deployment_manifest() {
    local image="${DASHBOARD_IMAGE_REPO}:${DASHBOARD_IMAGE_TAG}"

    log_info "Updating deployment.yaml with image: ${image}"

    local deployment_file="${MANIFESTS_DIR}/core-bases/base/deployment.yaml"

    if [[ ! -f "${deployment_file}" ]]; then
        log_error "Deployment file not found: ${deployment_file}"
        exit 1
    fi

    # Create a temporary copy of the manifests
    local temp_manifests="${TEMP_DIR}/manifests"
    rm -rf "${temp_manifests}"
    cp -r "${MANIFESTS_DIR}" "${temp_manifests}"

    # Update the image in the temporary copy
    local temp_deployment="${temp_manifests}/core-bases/base/deployment.yaml"

    # Replace the image placeholder with the actual image
    # The deployment.yaml uses $(odh-dashboard-image) as a placeholder
    # Note: Using -i.bak with rm for cross-platform compatibility (BSD/GNU sed)
    if grep -q '$(odh-dashboard-image)' "${temp_deployment}"; then
        sed -i.bak "s|\$(odh-dashboard-image)|${image}|g" "${temp_deployment}" && rm -f "${temp_deployment}.bak"
        log_info "Replaced \$(odh-dashboard-image) with ${image}"
    elif grep -q 'image:.*quay.io/opendatahub/odh-dashboard' "${temp_deployment}"; then
        # If there's already a concrete image, replace it
        sed -i.bak "s|image:.*quay.io/opendatahub/odh-dashboard:[^[:space:]]*|image: ${image}|g" "${temp_deployment}" && rm -f "${temp_deployment}.bak"
        log_info "Updated existing dashboard image to ${image}"
    else
        log_warn "Could not find image placeholder or existing image in deployment.yaml"
        log_warn "Manual intervention may be required"
    fi

    log_info "Deployment manifest updated."
}

# Get the operator pod name
get_operator_pod() {
    local pod
    pod=$(oc get pod -n "${OPERATOR_NAMESPACE}" -l name=opendatahub-operator -o jsonpath="{.items[0].metadata.name}" 2>/dev/null || echo "")

    if [[ -z "$pod" ]]; then
        log_error "Could not find opendatahub-operator pod in ${OPERATOR_NAMESPACE}"
        exit 1
    fi

    echo "$pod"
}

# Copy manifests to the operator pod
copy_manifests_to_pod() {
    log_info "Finding operator pod..."

    local op_pod
    op_pod=$(get_operator_pod)
    log_info "Using pod: ${op_pod}"

    # Wait for pod to be ready
    log_info "Waiting for operator pod to be ready..."
    if ! oc wait pod/"${op_pod}" -n "${OPERATOR_NAMESPACE}" --for=condition=Ready --timeout=60s; then
        log_error "Operator pod did not become ready in time"
        exit 1
    fi

    # Copy manifests to the pod
    log_info "Copying manifests to pod..."
    local temp_manifests="${TEMP_DIR}/manifests"

    if ! oc cp "${temp_manifests}/." "${OPERATOR_NAMESPACE}/${op_pod}:/opt/manifests/dashboard" -c manager; then
        log_error "Failed to copy manifests to operator pod"
        exit 1
    fi

    log_info "Manifests copied successfully."
}

# Restart the operator deployment
restart_operator() {
    log_info "Restarting operator deployment..."

    oc rollout restart deploy -n "${OPERATOR_NAMESPACE}" -l name=opendatahub-operator

    log_info "Waiting for operator rollout to complete..."
    if ! oc rollout status deploy -n "${OPERATOR_NAMESPACE}" -l name=opendatahub-operator --timeout=120s; then
        log_warn "Operator rollout may still be in progress"
    fi

    log_info "Operator restarted."
}

# Wait for dashboard deployment to be ready
wait_for_dashboard() {
    log_info "Waiting for dashboard deployment to update..."

    local max_attempts=60
    local attempt=0
    local expected_image="${DASHBOARD_IMAGE_REPO}:${DASHBOARD_IMAGE_TAG}"

    while [[ $attempt -lt $max_attempts ]]; do
        # Check if dashboard deployment exists
        if ! oc get deploy odh-dashboard -n "${DASHBOARD_NAMESPACE}" &> /dev/null; then
            log_info "Dashboard deployment not found yet... (attempt $((attempt + 1))/$max_attempts)"
            sleep 5
            attempt=$((attempt + 1))
            continue
        fi

        # Get current image
        local current_image
        current_image=$(oc get deploy odh-dashboard -n "${DASHBOARD_NAMESPACE}" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")

        if [[ "$current_image" == "$expected_image" ]]; then
            log_info "Dashboard image updated to: ${current_image}"

            # Wait for deployment to be available
            log_info "Waiting for dashboard pods to be ready..."
            if oc rollout status deploy/odh-dashboard -n "${DASHBOARD_NAMESPACE}" --timeout=300s; then
                log_info "Dashboard deployment is ready."
                return 0
            fi
        fi

        log_info "Current image: ${current_image:-not set}"
        log_info "Expected image: ${expected_image}"
        log_info "Waiting for image update... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        attempt=$((attempt + 1))
    done

    log_warn "Dashboard may still be updating. Check status manually."
    return 0
}

# Verify the installation
verify_installation() {
    log_info "Verifying installation..."

    echo ""
    echo "=============================================="
    echo "Installation Summary"
    echo "=============================================="

    echo ""
    echo "Dashboard Deployment:"
    echo "---------------------"
    if oc get deploy odh-dashboard -n "${DASHBOARD_NAMESPACE}" &> /dev/null; then
        local current_image
        current_image=$(oc get deploy odh-dashboard -n "${DASHBOARD_NAMESPACE}" -o jsonpath='{.spec.template.spec.containers[0].image}')
        echo "  Image: ${current_image}"

        local replicas
        replicas=$(oc get deploy odh-dashboard -n "${DASHBOARD_NAMESPACE}" -o jsonpath='{.status.readyReplicas}')
        echo "  Ready Replicas: ${replicas:-0}"
    else
        echo "  Dashboard deployment not found"
    fi

    echo ""
    echo "Dashboard Status:"
    echo "-----------------"
    if oc get dashboard default-dashboard -n "${DASHBOARD_NAMESPACE}" &> /dev/null; then
        oc get dashboard default-dashboard -n "${DASHBOARD_NAMESPACE}" -o yaml | grep -A6 "message:" || echo "  No status message found"
    else
        echo "  Dashboard CR not found"
    fi

    echo ""
    echo "=============================================="
}

# Cleanup temporary files
cleanup() {
    if [[ -d "${TEMP_DIR}" ]]; then
        log_info "Cleaning up temporary files..."
        rm -rf "${TEMP_DIR}"
    fi
}

# Main function
main() {
    parse_args "$@"

    echo "=============================================="
    echo "ODH Dashboard Image Update Script"
    echo "=============================================="
    echo ""
    echo "Configuration:"
    echo "  Image: ${DASHBOARD_IMAGE_REPO}:${DASHBOARD_IMAGE_TAG}"
    echo "  Skip Setup: ${SKIP_SETUP}"
    echo "  Manifests Dir: ${MANIFESTS_DIR}"
    echo ""

    check_prerequisites

    # Create temp directory
    mkdir -p "${TEMP_DIR}"

    # Trap to cleanup on exit
    trap cleanup EXIT

    if [[ "${SKIP_SETUP}" != "true" ]]; then
        echo ""
        log_step "Step 1/4: Performing one-time setup..."
        perform_one_time_setup
    else
        log_info "Skipping one-time setup (--skip-setup flag provided)"
    fi

    echo ""
    log_step "Step 2/4: Updating deployment manifest..."
    update_deployment_manifest

    echo ""
    log_step "Step 3/4: Copying manifests to operator pod..."
    copy_manifests_to_pod

    echo ""
    log_step "Step 4/4: Restarting operator..."
    restart_operator

    echo ""
    log_info "Waiting for dashboard to update..."
    wait_for_dashboard

    echo ""
    verify_installation

    echo ""
    log_info "Done!"
    echo ""
    echo "The dashboard image has been updated to: ${DASHBOARD_IMAGE_REPO}:${DASHBOARD_IMAGE_TAG}"
    echo ""
    echo "You can verify the running image with:"
    echo "  oc get deploy odh-dashboard -n ${DASHBOARD_NAMESPACE} -o=jsonpath='{.spec.template.spec.containers[0].image}'"
    echo ""
    echo "To use a different image in the future, run:"
    echo "  $(basename "$0") --skip-setup <image-tag>"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0") --skip-setup main      # Latest main branch"
    echo "  $(basename "$0") --skip-setup pr-5476   # Specific PR"
    echo ""
}

# Run main function
main "$@"

