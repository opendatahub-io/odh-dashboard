#!/bin/bash

# Generic script template for running contract tests with Mock BFF
# Copy this to your package's pact/scripts/ directory and customize the configuration section

set -euo pipefail

# ========================================
# CONFIGURATION - CUSTOMIZE FOR YOUR PACKAGE
# ========================================
PACKAGE_NAME="your-package-name"           # e.g., "llama-stack", "kserve", "model-registry"
BFF_BINARY_NAME="your-bff-binary"          # e.g., "bff-mock", "llama-bff", "kserve-bff"
BFF_PORT=${BFF_PORT:-8080}                 # Default port, can be overridden
BFF_MOCK_FLAGS="--mock-k8s-client --dev-mode"  # BFF startup flags for mock mode
BFF_DIR="upstream/bff"                     # Path to your BFF directory

# Calculate package root (two levels up from pact/scripts)
PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ========================================
# LOAD SHARED UTILITIES
# ========================================
# Source shared shell helper functions from pact-testing package
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPERS_FILE="$SCRIPT_DIR/../../../pact-testing/src/helpers/shell-helpers.sh"

if [[ -f "$HELPERS_FILE" ]]; then
    source "$HELPERS_FILE"
else
    echo "❌ Could not find shared shell helpers at $HELPERS_FILE"
    echo "💡 Make sure @odh-dashboard/pact-testing package is installed"
    exit 1
fi

# ========================================
# MAIN EXECUTION
# ========================================

log_info "🚀 Starting $PACKAGE_NAME Pact tests with Mock BFF"

# Create test results directory
TEST_RUN_DIR=$(create_test_results_dir)

# Check Go installation
check_go_available

# Build BFF server
build_bff_server "$BFF_DIR" "$TEST_RUN_DIR"

# Start BFF server
BFF_PID=$(start_bff_server "$BFF_BINARY_NAME" "$BFF_PORT" "$BFF_MOCK_FLAGS" "$TEST_RUN_DIR")

# Set up cleanup on exit
cleanup_bff_on_exit() {
    cleanup_bff "$BFF_PID"
}
trap cleanup_bff_on_exit EXIT

# Wait for BFF to be ready
if ! wait_for_bff_ready "$BFF_PORT" 30 "$TEST_RUN_DIR"; then
    exit 1
fi

# Run contract tests from the package root
# package root is two levels up from pact/scripts
cd "$PACKAGE_ROOT"
TEST_EXIT_CODE=0
if ! run_contract_tests "$TEST_RUN_DIR"; then
    TEST_EXIT_CODE=1
fi

# Display results
display_test_summary "$TEST_RUN_DIR"

# Only open HTML report in browser if not in CI environment
if [[ -z "${CI:-}" ]]; then
    open_html_report "$TEST_RUN_DIR"
fi

complete_test_summary "$PACKAGE_NAME" "$TEST_RUN_DIR"

exit $TEST_EXIT_CODE