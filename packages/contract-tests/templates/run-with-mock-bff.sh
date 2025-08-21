#!/bin/bash

# Generic script template for running contract tests with Mock BFF
# Copy this to your package's contract-test/scripts/ directory and customize the configuration section

set -euo pipefail

# ========================================
# CONFIGURATION - CUSTOMIZE FOR YOUR PACKAGE
# ========================================
PACKAGE_NAME="your-package-name"           # e.g., "llama-stack", "kserve", "model-registry"
BFF_BINARY_NAME="your-bff-binary"          # e.g., "bff-mock", "llama-bff", "kserve-bff"
BFF_PORT=${BFF_PORT:-8080}                 # Default port, can be overridden
BFF_MOCK_FLAGS="--mock-k8s-client --dev-mode"  # BFF startup flags for mock mode

# Calculate package root (two levels up from pact/scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Set BFF_DIR relative to PACKAGE_ROOT
BFF_DIR="$PACKAGE_ROOT/upstream/bff"

# ========================================
# LOAD SHARED UTILITIES
# ========================================
# Try to find contract-testing helpers by searching upward
find_helpers() {
    local current_dir="$1"
    local max_depth=5
    local depth=0
    
    while [[ $depth -lt $max_depth && -n "$current_dir" && "$current_dir" != "/" ]]; do
        # Try dist first, then src
        local dist_helper="$current_dir/packages/contract-testing/dist/helpers/shell-helpers.sh"
        local src_helper="$current_dir/packages/contract-testing/src/helpers/shell-helpers.sh"
        
        if [[ -f "$dist_helper" ]]; then
            echo "$dist_helper"
            return 0
        elif [[ -f "$src_helper" ]]; then
            echo "$src_helper"
            return 0
        fi
        
        current_dir="$(dirname "$current_dir")"
        ((depth++))
    done
    
    return 1
}

# Find and source helpers
HELPERS_FILE=$(find_helpers "$SCRIPT_DIR")
if [[ -n "$HELPERS_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$HELPERS_FILE"
else
    echo "❌ Could not find contract-testing helpers in parent directories"
    echo "💡 Make sure @odh-dashboard/contract-testing package is installed"
    exit 1
fi

# ========================================
# MAIN EXECUTION
# ========================================

log_info "🚀 Starting $PACKAGE_NAME contract tests with Mock BFF"

# Create test results directory
TEST_RUN_DIR=$(create_test_results_dir)

# Check Go installation
check_go_available

# Resolve BFF_DIR to absolute path
if command -v realpath >/dev/null 2>&1; then
    BFF_DIR=$(realpath "$BFF_DIR")
else
    BFF_DIR="$(cd "$BFF_DIR" && pwd)"
fi

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
cd "$PACKAGE_ROOT" || exit 1
TEST_EXIT_CODE=0
if ! run_contract_tests "$TEST_RUN_DIR"; then
    TEST_EXIT_CODE=1
fi

# Display results
display_test_summary "$TEST_RUN_DIR"

# Only open HTML report in browser if not in CI environment
if [[ "${CI:-}" != "true" ]]; then
    if ! open_html_report "$TEST_RUN_DIR" 2>/dev/null; then
        log_warning "Could not open HTML report in browser"
    fi
fi

complete_test_summary "$PACKAGE_NAME" "$TEST_RUN_DIR"

exit $TEST_EXIT_CODE