#!/bin/bash

# Shared shell helper functions for contract testing scripts
# Source this file in your package's run-with-mock-bff.sh script

# Enable strict mode
set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "ℹ️  $1"
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

# Create timestamped results directory
create_test_results_dir() {
    local TIMESTAMP
    local CONTRACT_TEST_RESULTS_BASE
    local TEST_RUN_DIR
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    CONTRACT_TEST_RESULTS_BASE="contract-tests/contract-test-results"
    TEST_RUN_DIR="$CONTRACT_TEST_RESULTS_BASE/$TIMESTAMP"
    
    mkdir -p "$TEST_RUN_DIR"
    
    # Convert to absolute path
    if command -v realpath >/dev/null 2>&1; then
        TEST_RUN_DIR=$(realpath "$TEST_RUN_DIR")
    else
        TEST_RUN_DIR="$(cd "$TEST_RUN_DIR" && pwd)"
    fi
    
    export CONTRACT_TEST_RESULTS_DIR="$TEST_RUN_DIR"
    echo "$TEST_RUN_DIR"
}

# Check if Go is available
check_go_available() {
    if ! command -v go &> /dev/null; then
        log_error "Go is not installed or not in PATH"
        exit 1
    fi

    local GO_VERSION
    GO_VERSION=$(go version)
    log_success "Go found: $GO_VERSION"
}

# Build BFF server
build_bff_server() {
    local BFF_DIR="$1"
    local TEST_RUN_DIR="$2"
    
    log_info "Building Mock BFF server..."
    (
        cd "$BFF_DIR" || return 1
        make build 2>&1 | tee "$TEST_RUN_DIR/bff-build.log"
    )
    local build_status=$?
    if [ $build_status -ne 0 ]; then
        log_error "Failed to build BFF server. Check log: $TEST_RUN_DIR/bff-build.log"
        return $build_status
    fi
    log_success "BFF server built successfully"
}

# Kill process on port if exists
kill_process_on_port() {
    local PORT="$1"
    
    if lsof -ti:"$PORT" >/dev/null 2>&1; then
        log_warning "Port $PORT is in use, attempting to kill existing process..."
        lsof -ti:"$PORT" | xargs kill -9 || true
        sleep 2
    fi
}

# Start BFF server in background
start_bff_server() {
    local BFF_BINARY_NAME="$1"
    local BFF_PORT="$2"
    local BFF_MOCK_FLAGS="$3"
    local TEST_RUN_DIR="$4"
    local BFF_PID
    
    log_info "Starting Mock BFF server on port $BFF_PORT..."
    
    # Create test run directory if it doesn't exist
    mkdir -p "$TEST_RUN_DIR"
    
    # Kill any existing process on the port
    kill_process_on_port "$BFF_PORT"

    # Start BFF in background, redirecting output to log
    ./$BFF_BINARY_NAME --port "$BFF_PORT" $BFF_MOCK_FLAGS > "$TEST_RUN_DIR/bff-mock.log" 2>&1 &
    BFF_PID=$!

    # Store PID for cleanup
    echo "$BFF_PID" > "$TEST_RUN_DIR/bff.pid"

    log_info "Mock BFF started (PID: $BFF_PID)"
    log_info "BFF logs: $TEST_RUN_DIR/bff-mock.log"
    
    echo "$BFF_PID"
}

# Wait for BFF to be ready
wait_for_bff_ready() {
    local BFF_PORT="$1"
    local MAX_ATTEMPTS="${2:-30}"
    local TEST_RUN_DIR="$3"
    local attempt=0
    
    log_info "Waiting for Mock BFF to be ready..."

    while [ $attempt -lt $MAX_ATTEMPTS ]; do
        if curl -s -f "http://localhost:$BFF_PORT/healthcheck" > /dev/null 2>&1; then
            log_success "Mock BFF is ready!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -eq $MAX_ATTEMPTS ]; then
            log_error "Mock BFF failed to start after $MAX_ATTEMPTS attempts"
            log_error "Check BFF logs: $TEST_RUN_DIR/bff-mock.log"
            return 1
        fi
        
        sleep 2
    done
}

# Cleanup BFF server
cleanup_bff() {
    local BFF_PID="$1"
    
    if [ -n "$BFF_PID" ]; then
        log_info "Stopping Mock BFF server (PID: $BFF_PID)"
        kill "$BFF_PID" 2>/dev/null || true
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if kill -0 "$BFF_PID" 2>/dev/null; then
            log_warning "Force killing BFF server..."
            kill -9 "$BFF_PID" 2>/dev/null || true
        fi
    fi
}

# Run contract tests
run_contract_tests() {
    local TEST_RUN_DIR="$1"
    
    log_info "Running contract tests against Mock BFF..."
    log_info "Test output: $TEST_RUN_DIR/contract-test-output.log"

    # Set environment variables for Jest
    export CONTRACT_TEST_RESULTS_DIR="$TEST_RUN_DIR"

    # Run tests and capture output
    if npm run test:contract > "$TEST_RUN_DIR/contract-test-output.log" 2>&1; then
        log_success "Contract tests completed successfully!"
        return 0
    else
        log_warning "Contract tests completed with issues"
        return 1
    fi
}

# Display test results summary
display_test_summary() {
    local TEST_RUN_DIR="$1"
    
    log_info "Test Results Summary:"
    log_info "📂 Test Results Directory: $TEST_RUN_DIR"

    # Create artifacts directory
    mkdir -p "$TEST_RUN_DIR/artifacts"

    # Copy test artifacts
    cp -f "$TEST_RUN_DIR/contract-test-report.html" "$TEST_RUN_DIR/artifacts/" 2>/dev/null || true
    cp -f "$TEST_RUN_DIR/junit.xml" "$TEST_RUN_DIR/artifacts/" 2>/dev/null || true
    cp -f "$TEST_RUN_DIR/bff-mock.log" "$TEST_RUN_DIR/artifacts/" 2>/dev/null || true

    # Show test artifacts
    if [ -d "$TEST_RUN_DIR/artifacts" ] && [ "$(ls -A "$TEST_RUN_DIR/artifacts")" ]; then
        log_info "📋 Generated test artifacts:"
        ls -la "$TEST_RUN_DIR/artifacts"
    fi

    # Show available logs
    log_info "📋 Available logs:"
    ls -la "$TEST_RUN_DIR"

    # Parse test results if available
    if grep -q "Test Suites:" "$TEST_RUN_DIR/contract-test-output.log" 2>/dev/null; then
        log_info "📊 Test Summary:"
        grep "Test Suites:" "$TEST_RUN_DIR/contract-test-output.log" | tail -1
        grep "Tests:" "$TEST_RUN_DIR/contract-test-output.log" | tail -1
    fi
}

# Open HTML report in browser
open_html_report() {
    local TEST_RUN_DIR="$1"
    local JEST_HTML_REPORT="${JEST_HTML_REPORT:-$TEST_RUN_DIR/contract-test-report.html}"
    
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
}

# Complete test summary
complete_test_summary() {
    local PACKAGE_NAME="$1"
    local TEST_RUN_DIR="$2"
    
    log_success "🎉 $PACKAGE_NAME Mock BFF integration test completed!"
    log_info "💡 View detailed results: ls -la $TEST_RUN_DIR"
    log_info "📊 HTML Report: $TEST_RUN_DIR/contract-test-report.html"
}