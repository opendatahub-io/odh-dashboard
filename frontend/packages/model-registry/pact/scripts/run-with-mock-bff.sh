#!/bin/bash

# Model Registry Contract Tests with Mock BFF
# This script starts the BFF in mock mode and runs contract tests against it

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
BFF_DIR="$PACKAGE_DIR/upstream/bff"
PACT_DIR="$PACKAGE_DIR/pact"
RESULTS_DIR="$PACT_DIR/pact-test-results"

# Ensure results directory exists
mkdir -p "$RESULTS_DIR"

# Add timestamp for this test run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_RUN_DIR="$RESULTS_DIR/$TIMESTAMP"
mkdir -p "$TEST_RUN_DIR"

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

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# PID file for cleanup
BFF_PID_FILE="$RESULTS_DIR/bff-mock.pid"

# Cleanup function
cleanup() {
    if [ -f "$BFF_PID_FILE" ]; then
        BFF_PID=$(cat "$BFF_PID_FILE")
        if kill -0 "$BFF_PID" 2>/dev/null; then
            log_info "Stopping Mock BFF server (PID: $BFF_PID)"
            kill "$BFF_PID" 2>/dev/null || true
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
    cd "$BFF_DIR"
    
    if ! go build -o bff-mock ./cmd; then
        log_error "Failed to build BFF server"
        exit 1
    fi
    
    log_success "BFF server built successfully"
}

# Start BFF in mock mode
start_mock_bff() {
    log_info "Starting Mock BFF server on port 8080..."
    cd "$BFF_DIR"
    
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

# Run Pact tests
run_pact_tests() {
    log_info "Running Pact consumer tests against Mock BFF..."
    cd "$PACKAGE_DIR"
    
    # Set environment for tests
    export PACT_MOCK_BFF_URL="http://localhost:8080"
    export PACT_TEST_RESULTS_DIR="$TEST_RUN_DIR"
    
    # Create detailed test output files
    TEST_OUTPUT_FILE="$TEST_RUN_DIR/contract-test-output.log"
    
    log_info "Test output: $TEST_OUTPUT_FILE"
    
    # Run the tests with detailed output
    if npm run test:contract -- --verbose 2>&1 | tee "$TEST_OUTPUT_FILE"; then
        log_success "Pact tests completed successfully!"
    else
        log_error "Pact tests failed"
        log_error "Check detailed logs: $TEST_OUTPUT_FILE"
        exit 1
    fi
}

# Show results
show_results() {
    log_info "Test Results Summary:"
    log_info "📂 Test Results Directory: $TEST_RUN_DIR"
    
    if [ -d "$PACT_DIR/pacts" ] && [ "$(ls -A "$PACT_DIR/pacts" 2>/dev/null)" ]; then
        log_success "Contract files generated:"
        ls -la "$PACT_DIR/pacts/"
    else
        log_warning "No contract files found"
    fi
    
    log_info "📋 Available logs:"
    ls -la "$TEST_RUN_DIR"/
    
    # Show test summary from log file
    if grep -q "Test Suites:" "$TEST_OUTPUT_FILE" 2>/dev/null; then
        log_info "📊 Test Summary:"
        grep "Test Suites:" "$TEST_OUTPUT_FILE" || true
        grep "Tests:" "$TEST_OUTPUT_FILE" || true
    fi
    
    # Open Jest HTML report
    JEST_HTML_REPORT="$TEST_RUN_DIR/contract-test-report.html"
    if [[ -f "$JEST_HTML_REPORT" ]]; then
        log_info "📊 Opening Jest HTML report..."
        if command -v open >/dev/null 2>&1; then
            log_info "🌐 Opening report in browser..."
            open "file://$JEST_HTML_REPORT"
        elif command -v xdg-open >/dev/null 2>&1; then
            log_info "🌐 Opening report in browser..."
            xdg-open "file://$JEST_HTML_REPORT"
        else
            log_info "🌐 Open in browser: file://$JEST_HTML_REPORT"
        fi
    else
        log_warning "Jest HTML report not found at $JEST_HTML_REPORT"
    fi
    
    log_success "🎉 Mock BFF integration test completed!"
    log_info "💡 View detailed results: ls -la $TEST_RUN_DIR"
    log_info "📊 HTML Report: $TEST_RUN_DIR/contract-test-report.html"
}

# Main execution
main() {
    log_info "🚀 Starting Model Registry Pact tests with Mock BFF"
    
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
Model Registry Pact Tests with Mock BFF

This script:
1. Builds the Model Registry BFF server
2. Starts it in mock mode (--mock-k8s-client --mock-mr-client)
3. Runs Pact consumer tests against the real BFF endpoints
4. Generates Pact contracts based on actual API responses

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
