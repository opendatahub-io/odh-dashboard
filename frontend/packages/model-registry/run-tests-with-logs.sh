#!/bin/bash

# Enhanced Contract Test Runner with Detailed Logging
# This script sets up the environment and runs contract tests with comprehensive logging

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "pact" ]]; then
    log_error "Please run this script from the model-registry package directory"
    exit 1
fi

log_info "🚀 Enhanced Contract Test Runner"

# Set environment variables
export KUBEBUILDER_ASSETS="/Users/acoughli/Library/Application Support/io.kubebuilder.envtest/k8s/1.29.0-darwin-arm64"

# Check if envtest binaries exist
if [[ ! -d "$KUBEBUILDER_ASSETS" ]]; then
    log_error "KUBEBUILDER_ASSETS not found at: $KUBEBUILDER_ASSETS"
    log_info "Run: cd upstream/bff && make envtest && ./bin/setup-envtest-release-0.17 use 1.29.0"
    exit 1
fi

log_success "KUBEBUILDER_ASSETS found: $KUBEBUILDER_ASSETS"

# Create timestamp for this test run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="pact/pact-test-results/$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

log_info "📂 Test results will be saved to: $RESULTS_DIR"

# Run the tests with comprehensive logging
log_info "🧪 Running contract tests with enhanced logging..."

if npm run test:contract:with-bff 2>&1 | tee "$RESULTS_DIR/full-test-output.log"; then
    log_success "🎉 Contract tests completed successfully!"
else
    log_error "Contract tests failed"
    echo ""
    log_info "📋 Check detailed logs:"
    echo "   - Full output: $RESULTS_DIR/full-test-output.log"
    echo "   - BFF logs: $RESULTS_DIR/bff-mock.log"
    echo "   - Test results: $RESULTS_DIR/contract-test-output.log"
    if [[ -f "$RESULTS_DIR/junit.xml" ]]; then
        echo "   - JUnit XML: $RESULTS_DIR/junit.xml"
    fi
    exit 1
fi

# Show summary
log_success "📊 Test Results Summary:"
ls -la "$RESULTS_DIR"/

if [[ -f "$RESULTS_DIR/junit.xml" ]]; then
    log_info "📄 JUnit XML report generated for CI/CD integration"
fi

log_info "💡 View all results: ls -la $RESULTS_DIR"
