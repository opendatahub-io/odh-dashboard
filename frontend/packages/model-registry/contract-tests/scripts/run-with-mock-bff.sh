#!/bin/bash

# Model Registry contract tests with Mock BFF
# This script builds and runs the Model Registry BFF server in mock mode,
# then executes contract tests against it to validate API contracts.

set -euo pipefail

# Load shared shell helpers from contract-testing package
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKSPACE_ROOT="$(cd "$PACKAGE_ROOT/../../.." && pwd)"
HELPERS_FILE="$WORKSPACE_ROOT/packages/contract-tests/src/helpers/shell-helpers.sh"

# Try to source helpers from src first, then dist if src fails
if ! source "$HELPERS_FILE" 2>/dev/null; then
    HELPERS_FILE="$WORKSPACE_ROOT/packages/contract-tests/dist/helpers/shell-helpers.sh"
    if ! source "$HELPERS_FILE"; then
        echo "❌ Could not find shared shell helpers at $HELPERS_FILE"
        echo "💡 Make sure @odh-dashboard/contract-testing package is installed"
        exit 1
    fi
fi

# Configuration
CONTRACT_DIR="$PACKAGE_ROOT/contract-tests"
BFF_DIR="$PACKAGE_ROOT/upstream/bff"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_RUN_DIR="$CONTRACT_DIR/contract-test-results/$TIMESTAMP"
BFF_PID_FILE="$TEST_RUN_DIR/bff.pid"
BFF_PID=""

# Create test results directory
mkdir -p "$TEST_RUN_DIR"

# Ensure TEST_RUN_DIR is absolute
TEST_RUN_DIR="$(cd "$TEST_RUN_DIR" && pwd)"

cd "$PACKAGE_ROOT" || exit 1

# Set package name for Jest HTML reporter
export PACKAGE_NAME="model-registry"

# Set Jest HTML reporter environment variables
export PACT_TEST_RESULTS_DIR="$TEST_RUN_DIR"
export JEST_HTML_REPORT="$TEST_RUN_DIR/contract-test-report.html"
export JEST_HTML_REPORTERS_PUBLIC_PATH="$TEST_RUN_DIR"
export JEST_HTML_REPORTERS_FILENAME="contract-test-report.html"
export JEST_HTML_REPORTERS_EXPAND=true
export JEST_HTML_REPORTERS_HIDE_ICON=false
export JEST_HTML_REPORTERS_INCLUDE_FAILURE_MSG=true
export JEST_HTML_REPORTERS_INCLUDE_SUITE_FAILURE=true
export JEST_HTML_REPORTERS_INCLUDE_CONSOLE_LOG=true
export JEST_HTML_REPORTERS_INCLUDE_OBSOLETE_SNAPSHOTS=false
export JEST_HTML_REPORTERS_INCLUDE_COVERAGE_REPORT=false
export JEST_HTML_REPORTERS_INLINE_SOURCE=true
export JEST_HTML_REPORTERS_DARK_THEME=false
export JEST_HTML_REPORTERS_OPEN_REPORT=false
export JEST_HTML_REPORTERS_ATTACH_PATH="$TEST_RUN_DIR"
export JEST_HTML_REPORTERS_ATTACH_FILENAME="contract-test-report.html"
export JEST_HTML_REPORTERS_ATTACH_ABSOLUTE_PATH=true
export JEST_HTML_REPORTERS_ATTACH_INLINE_ASSETS=true
export JEST_HTML_REPORTERS_ATTACH_INLINE_ASSETS_PATHS=true
export JEST_HTML_REPORTERS_ATTACH_INLINE_ASSETS_ABSOLUTE_PATHS=true
export JEST_HTML_REPORTERS_ATTACH_INLINE_ASSETS_PATHS_ABSOLUTE=true

# Cleanup function
cleanup() {
    if [[ -f "$BFF_PID_FILE" ]]; then
        BFF_PID=$(cat "$BFF_PID_FILE")
        if [[ -n "$BFF_PID" ]]; then
            log_info "Stopping Mock BFF server (PID: $BFF_PID)"
            kill "$BFF_PID" 2>/dev/null || true
            
            # Wait a moment for graceful shutdown
            sleep 2
            
            # Force kill if still running
            if kill -0 "$BFF_PID" 2>/dev/null; then
                kill -9 "$BFF_PID" 2>/dev/null || true
            fi
        fi
        rm -f "$BFF_PID_FILE"
    fi
    
    # Kill any process using port 8080
    if lsof -ti:8080 >/dev/null 2>&1; then
        log_warning "Force killing processes on port 8080"
        lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    fi
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Check if Go is installed
check_go() {
    if ! command -v go &> /dev/null; then
        log_error "Go is not installed or not in PATH"
        exit 1
    fi
    log_success "Go found: $(go version)"
}

# Build the BFF
build_bff() {
    log_info "Building Mock BFF server..."
    cd "$BFF_DIR" || exit 1
    
    if ! go build -o bff-mock ./cmd; then
        log_error "Failed to build BFF server"
        exit 1
    fi
    
    log_success "BFF server built successfully"
}

# Start BFF in mock mode
start_mock_bff() {
    log_info "Starting Mock BFF server on port 8080..."
    cd "$BFF_DIR" || exit 1
    
    # Set up envtest path for Kubernetes testing
    if [[ -z "${KUBEBUILDER_ASSETS:-}" ]]; then
        # Fix SC2155: Declare and assign separately to avoid masking return values
        ASSETS_PATH=$(./bin/setup-envtest-release-0.17 use 1.29.0 --print path)
        if [[ $? -ne 0 ]]; then
            log_error "Failed to get kubebuilder assets path"
            exit 1
        fi
        export KUBEBUILDER_ASSETS="$ASSETS_PATH"
        log_info "Setting KUBEBUILDER_ASSETS to: $KUBEBUILDER_ASSETS"
    fi
    
    # Start BFF with mock settings
    BFF_LOG_FILE="$TEST_RUN_DIR/bff-mock.log"
    ./bff-mock --mock-k8s-client --mock-mr-client --port 8080 > "$BFF_LOG_FILE" 2>&1 &
    BFF_PID=$!
    echo "$BFF_PID" > "$BFF_PID_FILE"
    
    log_info "Mock BFF started (PID: $BFF_PID)"
    log_info "BFF logs: $BFF_LOG_FILE"
    
    # Wait for server to be ready
    log_info "Waiting for Mock BFF to be ready..."
    RETRY_COUNT=0
    MAX_RETRIES=30
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -s -f "http://localhost:8080/healthcheck" >/dev/null 2>&1; then
            log_success "Mock BFF is ready!"
            break
        fi
        
        if ! kill -0 "$BFF_PID" 2>/dev/null; then
            log_error "BFF process died. Check logs:"
            cat "$BFF_LOG_FILE"
            exit 1
        fi
        
        sleep 1
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Mock BFF failed to start within 30 seconds"
        log_error "BFF logs:"
        cat "$BFF_LOG_FILE"
        exit 1
    fi
}

# Run contract tests
run_pact_tests() {
    log_info "Running contract tests against Mock BFF..."
    cd "$PACKAGE_ROOT" || exit 1

    # Set environment for tests
    export PACT_MOCK_BFF_URL="http://localhost:8080"
    
    # Create detailed test output files
    TEST_OUTPUT_FILE="$TEST_RUN_DIR/contract-test-output.log"
    
    log_info "Test output: $TEST_OUTPUT_FILE"
    
    # Run the tests with detailed output and force exit to handle open handles
    if npm run test:contract -- --verbose --forceExit 2>&1 | tee "$TEST_OUTPUT_FILE"; then
        log_success "Contract tests completed successfully!"
    else
        log_error "Contract tests failed"
        log_error "Check detailed logs: $TEST_OUTPUT_FILE"
        exit 1
    fi
}

# Show results
show_results() {
    display_test_summary "$TEST_RUN_DIR"
    # Only try to open the report in non-CI environments
    if [[ "${CI:-}" != "true" ]]; then
        if ! open_html_report "$TEST_RUN_DIR" 2>/dev/null; then
            log_warning "Could not open HTML report in browser (this is normal in CI)"
        fi
    fi
    complete_test_summary "Model Registry" "$TEST_RUN_DIR"
}

# Main execution
main() {
    log_info "🚀 Starting Model Registry contract tests with Mock BFF"
    
    check_go
    build_bff
    start_mock_bff
    run_pact_tests
    show_results
}

# Handle command line arguments
case "${1:-}" in
    "--help"|"-h")
        cat << EOF
Model Registry contract tests with Mock BFF

This script:
1. Builds the Model Registry BFF server
2. Starts it in mock mode (--mock-k8s-client --mock-mr-client)
3. Runs contract tests against the BFF endpoints
4. Validates contracts based on actual API responses

USAGE:
    $0 [options]

OPTIONS:
    --help      Show this help message

The Mock BFF provides realistic test data without external dependencies.
Generated contracts will be based on actual BFF API responses.

EOF
        exit 0
        ;;
esac

# Run main function
main "$@"