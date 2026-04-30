#!/bin/bash
set -e

# Konflux Build Validation Script
# This script simulates Konflux build validation locally

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_MODE="${BUILD_MODE:-ODH}"
RUN_PHASE_0="${RUN_PHASE_0:-true}"
RUN_PHASE_1="${RUN_PHASE_1:-true}"
RUN_PHASE_2="${RUN_PHASE_2:-true}"
RUN_PHASE_3="${RUN_PHASE_3:-true}"
RUN_PHASE_4="${RUN_PHASE_4:-true}"
RUN_PHASE_5="${RUN_PHASE_5:-true}"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

cleanup() {
    log_info "Cleaning up..."
    docker stop odh-dashboard-test 2>/dev/null || true
    docker rm odh-dashboard-test 2>/dev/null || true
    docker rmi odh-dashboard:test 2>/dev/null || true
    kind delete cluster --name odh-test 2>/dev/null || true
}

# Phase 0: Hermetic Build Preflight
phase0_hermetic_preflight() {
    log_section "PHASE 0: Hermetic Build Preflight"

    cd "$PROJECT_ROOT"

    # Check lockfile for unsupported protocols
    log_info "Checking package-lock.json for Hermeto/Cachi2 compatibility..."
    UNSUPPORTED=$(grep -E '"resolved":\s*"(git\+|github:|file:)' package-lock.json || true)

    if [ -n "$UNSUPPORTED" ]; then
        log_error "Found unsupported dependency protocols:"
        echo "$UNSUPPORTED"
        log_error "Hermeto/Cachi2 requires HTTP/HTTPS URLs only"
        return 1
    fi

    log_success "No unsupported protocols found"

    # Verify all dependencies have resolved URLs
    log_info "Verifying all dependencies have resolved URLs..."
    if ! command -v jq &> /dev/null; then
        log_warning "jq not installed, skipping detailed lockfile validation"
    else
        MISSING_RESOLVED=$(jq -r '.. | objects | select(has("dependencies") or has("devDependencies")) | select(.resolved == null or .resolved == "")' package-lock.json || true)
        if [ -n "$MISSING_RESOLVED" ]; then
            log_error "Found dependencies without resolved URLs"
            return 1
        fi
        log_success "All dependencies have resolved URLs"
    fi

    # Test hermetic build (network disabled)
    log_info "Testing hermetic npm install (network disabled)..."
    if docker run --rm \
        --network=none \
        -v "$(pwd)":/workspace \
        -w /workspace \
        node:22 \
        npm ci --ignore-scripts > /tmp/hermetic-test.log 2>&1; then
        log_success "Hermetic install successful"
    else
        log_error "Hermetic install failed"
        cat /tmp/hermetic-test.log
        return 1
    fi

    # Validate workspace dependencies
    log_info "Checking workspace dependencies vs Dockerfile COPY..."
    WORKSPACE_SCOPE=$(jq -r '.name | split("/")[0] | select(startswith("@"))' package.json || echo "")

    if [ -z "$WORKSPACE_SCOPE" ]; then
        log_info "No scoped workspace detected, checking workspace packages"
        WORKSPACE_DIRS=$(jq -r '.workspaces[]' package.json)
    else
        log_info "Detected workspace scope: $WORKSPACE_SCOPE"
        WORKSPACE_DIRS=$(find packages -name "package.json" -exec dirname {} \;)
    fi

    for dockerfile in $(find . -name "Dockerfile*" -not -path "*/node_modules/*"); do
        log_info "Checking $dockerfile..."
        DOCKERFILE_DIR=$(dirname "$dockerfile")

        while IFS= read -r ws_dir; do
            if [ -z "$ws_dir" ]; then continue; fi
            WS_NAME=$(basename "$ws_dir")

            IMPORTS=$(grep -r "from.*$WS_NAME" "$DOCKERFILE_DIR" 2>/dev/null || true)
            if [ -n "$IMPORTS" ]; then
                COPY_FOUND=$(grep "COPY.*$ws_dir" "$dockerfile" || true)
                if [ -z "$COPY_FOUND" ]; then
                    log_warning "$dockerfile imports $WS_NAME but doesn't COPY $ws_dir"
                fi
            fi
        done <<< "$WORKSPACE_DIRS"
    done

    # FIPS compliance check
    log_info "Checking FIPS compliance requirements..."
    if ! grep -q "rm -rf.*esbuild" Dockerfile; then
        log_warning "Dockerfile should remove esbuild binaries for FIPS compliance"
    else
        log_success "Dockerfile removes esbuild binaries"
    fi

    log_success "Phase 0 completed"
}

# Phase 1: Docker Build
phase1_docker_build() {
    log_section "PHASE 1: Docker Build ($BUILD_MODE mode)"

    cd "$PROJECT_ROOT"

    log_info "Building Docker image with BUILD_MODE=$BUILD_MODE..."

    if docker build \
        --build-arg BUILD_MODE="$BUILD_MODE" \
        --tag odh-dashboard:test \
        --file Dockerfile \
        . > /tmp/docker-build.log 2>&1; then
        log_success "Docker build completed"
    else
        log_error "Docker build failed"
        tail -100 /tmp/docker-build.log
        return 1
    fi
}

# Phase 2: Runtime Validation
phase2_runtime() {
    log_section "PHASE 2: Runtime Validation"

    log_info "Starting container..."
    docker run -d \
        --name odh-dashboard-test \
        -p 8080:8080 \
        -e LOG_LEVEL=debug \
        odh-dashboard:test

    log_info "Waiting 30 seconds for initialization..."
    sleep 30

    # Check if container is still running
    if ! docker ps | grep -q odh-dashboard-test; then
        log_error "Container crashed during startup"
        docker logs odh-dashboard-test
        return 1
    fi

    log_success "Container running"

    # Scan logs for crash indicators
    log_info "Scanning logs for errors..."
    LOGS=$(docker logs odh-dashboard-test 2>&1)

    if echo "$LOGS" | grep -qi "uncaught exception"; then
        log_error "Found uncaught exception in logs"
        echo "$LOGS"
        return 1
    fi

    if echo "$LOGS" | grep -qi "fastify.*error"; then
        log_error "Found Fastify error in logs"
        echo "$LOGS"
        return 1
    fi

    if echo "$LOGS" | grep -qi "SocketStream is not defined"; then
        log_error "Found WebSocket compatibility error"
        echo "$LOGS"
        return 1
    fi

    log_success "No crash indicators found"

    # Test API endpoints
    log_info "Testing critical API endpoints..."

    for i in {1..30}; do
        if curl -f http://localhost:8080/api/health 2>/dev/null; then
            log_success "Health check passed"
            break
        fi
        sleep 2
    done

    # Test PATCH with application/merge-patch+json
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X PATCH \
        -H "Content-Type: application/merge-patch+json" \
        -d '{"test": "data"}' \
        http://localhost:8080/api/test-endpoint 2>/dev/null || echo "000")

    if [ "$STATUS" = "415" ]; then
        log_error "PATCH with merge-patch+json returns 415 (Fastify v5 regression)"
        return 1
    fi

    log_success "Content-type handling OK"

    # Test WebSocket
    log_info "Testing WebSocket compatibility..."
    if command -v websocat &> /dev/null; then
        timeout 10 websocat ws://localhost:8080/api/ws &>/dev/null || true
        sleep 5

        if ! docker ps | grep -q odh-dashboard-test; then
            log_error "Container crashed after WebSocket connection"
            docker logs odh-dashboard-test
            return 1
        fi

        log_success "WebSocket connection stable"
    else
        log_warning "websocat not installed, skipping WebSocket test"
    fi

    log_success "Phase 2 completed"
}

# Phase 3: Module Federation Validation
phase3_module_federation() {
    log_section "PHASE 3: Module Federation Validation"

    # Copy dist from container
    log_info "Copying build artifacts from container..."
    rm -rf /tmp/dist-check
    docker cp odh-dashboard-test:/usr/src/app/frontend/public /tmp/dist-check

    # Check for remoteEntry.js
    if [ ! -f "/tmp/dist-check/remoteEntry.js" ]; then
        log_error "remoteEntry.js not found"
        return 1
    fi

    SIZE=$(stat -f%z /tmp/dist-check/remoteEntry.js 2>/dev/null || stat -c%s /tmp/dist-check/remoteEntry.js)
    if [ "$SIZE" -lt 100 ]; then
        log_error "remoteEntry.js is suspiciously small ($SIZE bytes)"
        return 1
    fi

    log_success "remoteEntry.js present and valid ($SIZE bytes)"

    # Check for missing webpack chunks
    log_info "Checking for webpack chunks..."
    CHUNK_REFS=$(grep -o 'chunk[0-9]\+' /tmp/dist-check/remoteEntry.js || true)
    MISSING_CHUNKS=0

    for chunk in $CHUNK_REFS; do
        if ! ls /tmp/dist-check/*.bundle.js 2>/dev/null | grep -q "$chunk"; then
            log_warning "Referenced $chunk not found in dist"
            MISSING_CHUNKS=$((MISSING_CHUNKS + 1))
        fi
    done

    if [ $MISSING_CHUNKS -gt 0 ]; then
        log_error "$MISSING_CHUNKS missing chunks (causes ChunkLoadError)"
        return 1
    fi

    log_success "All webpack chunks present"

    # Check for large chunks
    LARGE_CHUNKS=$(find /tmp/dist-check -name "*.bundle.js" -size +1M 2>/dev/null || true)
    if [ -n "$LARGE_CHUNKS" ]; then
        log_warning "Large chunks detected (may slow page load):"
        du -h $LARGE_CHUNKS
    fi

    # Report total dist size
    log_info "Dist size report:"
    du -sh /tmp/dist-check

    log_success "Phase 3 completed"
}

# Phase 4: Operator Integration
phase4_operator() {
    log_section "PHASE 4: Operator Integration (Kind)"

    if ! command -v kind &> /dev/null; then
        log_warning "kind not installed, skipping operator integration"
        return 0
    fi

    log_info "Creating Kind cluster..."
    kind create cluster --name odh-test --wait 300s

    log_info "Loading image to Kind..."
    kind load docker-image odh-dashboard:test --name odh-test

    log_info "Applying manifests..."
    kubectl apply -k manifests/overlays/odh || \
    kubectl apply -k manifests/odh || \
    log_warning "No kustomize manifests found"

    log_info "Waiting for deployment..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/odh-dashboard -n opendatahub || true

    kubectl get pods -A

    POD=$(kubectl get pods -n opendatahub -l app=odh-dashboard -o name 2>/dev/null | head -1)
    if [ -n "$POD" ]; then
        kubectl logs -n opendatahub $POD --tail=50 || true
    fi

    log_success "Phase 4 completed"
}

# Phase 5: Manifest Validation
phase5_manifests() {
    log_section "PHASE 5: Manifest Validation"

    cd "$PROJECT_ROOT"

    if ! command -v kustomize &> /dev/null; then
        log_warning "kustomize not installed, skipping manifest validation"
        return 0
    fi

    log_info "Validating kustomize builds..."

    for overlay in manifests/overlays/*; do
        if [ -d "$overlay" ]; then
            log_info "Testing $overlay..."
            kustomize build "$overlay" > /tmp/manifest.yaml

            if ! python3 -c "import yaml; yaml.safe_load(open('/tmp/manifest.yaml'))" 2>/dev/null; then
                log_error "Invalid YAML in $overlay"
                return 1
            fi

            log_success "$overlay"
        fi
    done

    for base in manifests/odh manifests/rhoai; do
        if [ -d "$base" ]; then
            log_info "Testing $base..."
            kustomize build "$base" > /tmp/manifest.yaml
            log_success "$base"
        fi
    done

    log_success "Phase 5 completed"
}

# Main execution
main() {
    log_section "Konflux Build Validation"
    log_info "Project: odh-dashboard"
    log_info "Build mode: $BUILD_MODE"
    echo ""

    # Set up cleanup trap
    trap cleanup EXIT

    FAILED_PHASES=()

    if [ "$RUN_PHASE_0" = "true" ]; then
        phase0_hermetic_preflight || FAILED_PHASES+=("Phase 0")
    fi

    if [ "$RUN_PHASE_1" = "true" ]; then
        phase1_docker_build || FAILED_PHASES+=("Phase 1")
    fi

    if [ "$RUN_PHASE_2" = "true" ]; then
        phase2_runtime || FAILED_PHASES+=("Phase 2")
    fi

    if [ "$RUN_PHASE_3" = "true" ]; then
        phase3_module_federation || FAILED_PHASES+=("Phase 3")
    fi

    if [ "$RUN_PHASE_4" = "true" ]; then
        phase4_operator || FAILED_PHASES+=("Phase 4")
    fi

    if [ "$RUN_PHASE_5" = "true" ]; then
        phase5_manifests || FAILED_PHASES+=("Phase 5")
    fi

    log_section "Validation Summary"

    if [ ${#FAILED_PHASES[@]} -eq 0 ]; then
        log_success "All phases passed! 🎉"
        exit 0
    else
        log_error "Failed phases: ${FAILED_PHASES[*]}"
        exit 1
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build-mode)
            BUILD_MODE="$2"
            shift 2
            ;;
        --skip-phase-0)
            RUN_PHASE_0=false
            shift
            ;;
        --skip-phase-1)
            RUN_PHASE_1=false
            shift
            ;;
        --skip-phase-2)
            RUN_PHASE_2=false
            shift
            ;;
        --skip-phase-3)
            RUN_PHASE_3=false
            shift
            ;;
        --skip-phase-4)
            RUN_PHASE_4=false
            shift
            ;;
        --skip-phase-5)
            RUN_PHASE_5=false
            shift
            ;;
        --help)
            echo "Usage: validate-build.sh [options]"
            echo ""
            echo "Options:"
            echo "  --build-mode MODE       Set BUILD_MODE (ODH or RHOAI, default: ODH)"
            echo "  --skip-phase-N          Skip phase N (0-5)"
            echo "  --help                  Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main
